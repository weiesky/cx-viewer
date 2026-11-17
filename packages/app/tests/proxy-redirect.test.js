import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';

import { resolveUpstream, isOAuthRequest, _setProxyOwnPortForTests, startProxy, stopProxy } from '../proxy.js';

const OAUTH_HEADERS = { 'chatgpt-account-id': 'acct-123', authorization: 'Bearer oauth-token' };
const APIKEY_HEADERS = { authorization: 'Bearer sk-test' };
test.beforeEach(() => {
  process.env.CXV_ORIGINAL_BASE_URL = 'https://api.openai.com/v1';
  process.env.CXV_ORIGINAL_CHATGPT_BASE_URL = 'https://chatgpt.com/backend-api/codex';
  process.env.CXV_TEST = '1';  // skip auth.json fallback for deterministic routing
  _setProxyOwnPortForTests(null);
});

test('auth detection keys off ChatGPT-Account-Id header', () => {
  assert.equal(isOAuthRequest(OAUTH_HEADERS), true);
  assert.equal(isOAuthRequest(APIKEY_HEADERS), false);
  assert.equal(isOAuthRequest({}), false);
});

test('API-key request keeps /v1/responses and routes to openai upstream', () => {
  const { fullUrl, authMode } = resolveUpstream('/v1/responses', APIKEY_HEADERS);
  assert.equal(authMode, 'API Key');
  assert.equal(fullUrl, 'https://api.openai.com/v1/responses');
});

test('OAuth request strips /v1 and routes to chatgpt backend', () => {
  const { fullUrl, authMode } = resolveUpstream('/v1/responses', OAUTH_HEADERS);
  assert.equal(authMode, 'OAuth');
  assert.equal(fullUrl, 'https://chatgpt.com/backend-api/codex/responses');
});

test('query string is preserved through routing', () => {
  const { fullUrl } = resolveUpstream('/v1/responses?x=1', OAUTH_HEADERS);
  assert.equal(fullUrl, 'https://chatgpt.com/backend-api/codex/responses?x=1');
});

test('custom gateway origin+path is honored', () => {
  process.env.CXV_ORIGINAL_BASE_URL = 'https://gw.example.com/openai/v1';
  const { fullUrl } = resolveUpstream('/v1/responses', APIKEY_HEADERS);
  assert.equal(fullUrl, 'https://gw.example.com/openai/v1/responses');
});

test('unmatched path falls through verbatim', () => {
  const { fullUrl } = resolveUpstream('/healthz', APIKEY_HEADERS);
  assert.equal(fullUrl, 'https://api.openai.com/v1/healthz');
});

test('self-forward to own port is rejected, falling back to public default', () => {
  _setProxyOwnPortForTests(41234);
  process.env.CXV_ORIGINAL_BASE_URL = 'http://127.0.0.1:41234/v1';
  const { fullUrl } = resolveUpstream('/v1/responses', APIKEY_HEADERS);
  assert.equal(fullUrl, 'https://api.openai.com/v1/responses');
});

test('proxy forwards to the correct upstream host/path and preserves auth headers', async () => {
  // Mock upstream that records what it received.
  let seen = null;
  const upstream = createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      seen = { url: req.url, headers: req.headers, body: Buffer.concat(chunks) };
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end('data: {"type":"response.created","response":{"model":"gpt-observed"}}\n\ndata: [DONE]\n\n');
    });
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const upstreamPort = upstream.address().port;

  process.env.CXV_ORIGINAL_CHATGPT_BASE_URL = `http://127.0.0.1:${upstreamPort}/backend-api/codex`;
  let resolveObserved;
  const observedModel = new Promise(resolve => { resolveObserved = resolve; });
  const proxyPort = await startProxy({ onResponseModel: resolveObserved });
  const compressedBody = gzipSync('{"model":"gpt-test","counter":9007199254740993}');
  try {
    const res = await fetch(`http://127.0.0.1:${proxyPort}/v1/responses`, {
      method: 'POST',
      headers: { ...OAUTH_HEADERS, 'content-type': 'application/json', 'content-encoding': 'gzip' },
      body: compressedBody,
    });
    assert.equal(res.status, 200);
    await res.text();
    assert.equal(await observedModel, 'gpt-observed');
    assert.ok(seen, 'upstream received a request');
    assert.equal(seen.url, '/backend-api/codex/responses');
    assert.equal(seen.headers['chatgpt-account-id'], 'acct-123');
    assert.equal(seen.headers['authorization'], 'Bearer oauth-token');
    assert.equal(seen.headers['content-encoding'], 'gzip');
    // Accept-Encoding is forced to identity so the SSE stream comes back plain.
    assert.equal(seen.headers['accept-encoding'], 'identity');
    assert.deepEqual(seen.body, compressedBody, 'proxy must forward request bytes verbatim');
  } finally {
    stopProxy();
    upstream.close();
    await once(upstream, 'close');
  }
});

test('response model observation keeps watching through reroute completion and multiline JSON', async () => {
  const observed = [];
  const encoder = new TextEncoder();
  const sse = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"response.created","response":{"model":"model-a"}}\n\n'));
      controller.enqueue(encoder.encode('data: {"type":"response.completed","response":{"model":"model-b"}}\n\n'));
      controller.close();
    },
  });
  const { observeResponseModelStream } = await import('../proxy.js');
  assert.equal(await observeResponseModelStream(sse, model => observed.push(model)), 'model-b');
  assert.deepEqual(observed, ['model-a', 'model-b']);

  const jsonObserved = [];
  const json = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{\n  "response": {\n'));
      controller.enqueue(encoder.encode('    "model": "pretty-model"\n  }\n}'));
      controller.close();
    },
  });
  assert.equal(await observeResponseModelStream(json, model => jsonObserved.push(model)), 'pretty-model');
  assert.deepEqual(jsonObserved, ['pretty-model']);
});

test('absolute-form request target (via upstream HTTP proxy) is normalized to path', async () => {
  // A proxy-routed request arrives with an absolute request target, e.g.
  // `POST http://127.0.0.1:PORT/v1/responses`. The proxy must reduce it to the
  // path before routing, not concatenate the whole URL onto the upstream base.
  let seen = null;
  const upstream = createServer((req, res) => {
    seen = { url: req.url };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const upstreamPort = upstream.address().port;
  process.env.CXV_ORIGINAL_CHATGPT_BASE_URL = `http://127.0.0.1:${upstreamPort}/backend-api/codex`;
  const proxyPort = await startProxy();
  try {
    const done = new Promise((resolve) => {
      const preq = httpRequest({
        host: '127.0.0.1',
        port: proxyPort,
        method: 'POST',
        // absolute-form request target, as an HTTP proxy would forward
        path: `http://127.0.0.1:${proxyPort}/v1/responses`,
        headers: { ...OAUTH_HEADERS, 'content-type': 'application/json' },
      });
      preq.on('response', (r) => { r.resume(); r.on('end', () => resolve(r.statusCode)); });
      preq.on('error', () => resolve('error'));
      preq.end('{"model":"gpt"}');
    });
    const status = await done;
    assert.equal(status, 200);
    assert.equal(seen.url, '/backend-api/codex/responses');
  } finally {
    stopProxy();
    upstream.close();
    await once(upstream, 'close');
  }
});

test('client disconnect while upstream is pending cancels quietly', async () => {
  let markUpstreamStarted;
  const upstreamStarted = new Promise(resolve => { markUpstreamStarted = resolve; });
  let markUpstreamClosed;
  const upstreamClosed = new Promise(resolve => { markUpstreamClosed = resolve; });
  const upstream = createServer((req, res) => {
    markUpstreamStarted();
    res.once('close', markUpstreamClosed);
    // Intentionally leave the response pending. The proxy should cancel this
    // connection as soon as its downstream client goes away.
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const upstreamPort = upstream.address().port;

  process.env.CXV_ORIGINAL_CHATGPT_BASE_URL = `http://127.0.0.1:${upstreamPort}/backend-api/codex`;
  const proxyPort = await startProxy();
  const errors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => { errors.push(args.map(String).join(' ')); };
  try {
    const clientReq = httpRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/v1/models?client_version=test',
      headers: OAUTH_HEADERS,
    });
    clientReq.on('error', () => {});
    clientReq.end();
    await upstreamStarted;
    clientReq.destroy();
    await upstreamClosed;
    assert.equal(
      errors.some(line => line.includes('[CX-Viewer Proxy] Forward to')),
      false,
      'a downstream cancellation must not be reported as an upstream failure',
    );
  } finally {
    console.error = originalConsoleError;
    stopProxy();
    upstream.close();
    await once(upstream, 'close');
  }
});

test('WebSocket upgrade is refused (426, no 101) to force HTTP/SSE fallback', async () => {
  const proxyPort = await startProxy();
  try {
    const req = httpRequest({
      host: '127.0.0.1',
      port: proxyPort,
      path: '/v1/responses',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      },
    });
    req.end();
    const outcome = await new Promise((resolve) => {
      // 'upgrade' fires only on a 101 switch; 'response' fires for our 426 refusal.
      req.on('upgrade', () => resolve({ upgraded: true }));
      req.on('response', (res) => { res.resume(); resolve({ status: res.statusCode }); });
      req.on('error', (e) => resolve({ error: e.message }));
    });
    assert.equal(outcome.upgraded, undefined, 'server must not switch protocols');
    assert.equal(outcome.status, 426);
  } finally {
    stopProxy();
  }
});
