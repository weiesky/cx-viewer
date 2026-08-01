import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { materializeSessionArchive } from '../lib/log-v2/materializer.js';
import { getMainAgentSessionKey } from '../src/utils/clearCheckpoint.js';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise(resolve => server.close(resolve));
}

function persistedCommits(captured, predicate) {
  const selected = captured.filter(({ entry }) => predicate(entry));
  if (selected.length === 0) return [];
  const sessionDirs = new Set(selected.map(({ result }) => result.sessionDir));
  assert.equal(sessionDirs.size, 1);
  const materialized = materializeSessionArchive(selected[0].result.sessionDir);
  const bySeq = new Map(materialized.records.map((record, index) => [
    record.seq,
    { record, entry: materialized.entries[index] },
  ]));
  return selected.map(({ result }) => ({ ...bySeq.get(result.seq), result }));
}

test('active Chat profile hot-switches OAuth traffic and Default restores native routing', async () => {
  const requests = [];
  const upstream = createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      requests.push({
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      });
      if (requests.at(-1).body.includes('redirect me')) {
        res.writeHead(307, { location: `http://127.0.0.1:${upstream.address().port}/redirect-target` });
        res.end();
        return;
      }
      if (requests.at(-1).body.includes('stream lifecycle')) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end([
          'data: {"id":"chat-stream","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"reasoning_content":"thinking"}}]}',
          'data: {"id":"chat-stream","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"streamed"},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":2,"total_tokens":4}}',
          'data: [DONE]',
          '',
        ].join('\n\n'));
        return;
      }
      res.setHeader('content-type', 'application/json');
      if (req.url === '/v1/chat/completions') {
        res.end(JSON.stringify({
          id: 'chat-hot-switch',
          model: 'deepseek-v4-flash',
          choices: [{ index: 0, finish_reason: 'stop', message: { content: 'third-party', reasoning_content: '' } }],
          usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
        }));
      } else {
        res.end(JSON.stringify({
          id: 'native',
          object: 'response',
          status: 'completed',
          model: 'official',
          output: [],
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        }));
      }
    });
  });
  const port = await listen(upstream);
  const originalFetch = globalThis.fetch;
  const originalMarker = globalThis._cxViewerInterceptorInstalled;
  let interceptor = null;
  const commits = [];
  const testRoot = mkdtempSync(join(tmpdir(), 'cxv-proxy-interceptor-'));
  process.env.CXV_TEST = '1';
  process.env.CXV_CAPTURE_ONLY = '1';
  process.env.CXV_PROXY_PROFILE_PATH = join(testRoot, 'profile.json');
  process.env.CXV_LOG_DIR = join(testRoot, 'logs');

  try {
    interceptor = await import(`../interceptor.js?proxy-test=${Date.now()}`);
    interceptor._stopProxyProfileWatchForTests();
    interceptor._setProxyProfileRuntimeForTests({
      id: 'deepseek',
      name: 'DeepSeek',
      baseURL: `http://127.0.0.1:${port}`,
      apiKey: 'third-party-secret',
      activeModel: 'deepseek-v4-flash',
      effort: 'max',
      wireApi: 'chat-completions',
    });
    interceptor.setupInterceptor();
    interceptor.setLogV2CommitListener((entry, result) => commits.push({ entry, result }));

    const oauthHeaders = {
      'content-type': 'application/json',
      authorization: 'Bearer official-oauth-secret',
      'chatgpt-account-id': 'acct-secret',
      cookie: 'session=secret',
      'x-cx-viewer-trace': 'true',
      'x-cx-viewer-auth-mode': 'oauth',
    };
    const response = await fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({
        model: 'official',
        input: [
          { type: 'compaction', id: 'compact-hot-switch', encrypted_content: 'OPENAI_ONLY_CIPHERTEXT' },
          { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hello' }] },
        ],
        stream: false,
      }),
    });
    const transformed = await response.json();
    assert.equal(transformed.object, 'response');
    assert.equal(transformed.output[0].content[0].text, 'third-party');
    assert.equal(requests[0].url, '/v1/chat/completions');
    assert.equal(requests[0].headers.authorization, 'Bearer third-party-secret');
    assert.equal(requests[0].headers['chatgpt-account-id'], undefined);
    assert.equal(requests[0].headers.cookie, undefined);
    assert.doesNotMatch(requests[0].body, /OPENAI_ONLY_CIPHERTEXT|compact-hot-switch/);

    const turnMetadata = {
      session_id: 'session-route-binding',
      thread_id: 'thread-route-binding',
      turn_id: 'turn-route-binding',
    };
    const boundFirst = await fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', metadata: turnMetadata, input: 'first tool round', stream: false }),
    });
    assert.equal((await boundFirst.json()).model, 'deepseek-v4-flash');

    const boundRevisions = persistedCommits(commits, entry => (
      entry.body?.metadata?.turn_id === turnMetadata.turn_id
      && entry.body?.input === 'first tool round'
    ));
    assert.equal(boundRevisions.length, 2);
    const [boundPending, boundCompleted] = boundRevisions;
    assert.equal(boundPending.entry.inProgress, true);
    assert.equal(boundCompleted.entry.inProgress, undefined);
    assert.equal(boundPending.result.entryKey, boundCompleted.result.entryKey);
    assert.equal(boundCompleted.result.entryRevision, boundPending.result.entryRevision + 1);
    assert.equal(boundPending.result.inputRevision, boundCompleted.result.inputRevision);
    for (const { entry, record } of boundRevisions) {
      assert.equal(record.turnId, turnMetadata.turn_id);
      assert.equal(entry.body.model, 'deepseek-v4-flash');
      assert.equal(entry.proxyProfile, 'DeepSeek');
      assert.equal(entry.proxyWireApi, 'chat-completions');
      assert.equal(entry.proxyUrl, `http://127.0.0.1:${port}/v1/chat/completions`);
      assert.doesNotMatch(JSON.stringify(entry), /official-oauth-secret|third-party-secret|session=secret|acct-secret/);
    }
    assert.equal(getMainAgentSessionKey(boundPending.entry), getMainAgentSessionKey(boundCompleted.entry));

    interceptor._setProxyProfileRuntimeForTests(null);
    const boundSecond = await fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', metadata: turnMetadata, input: 'second tool round', stream: false }),
    });
    assert.equal((await boundSecond.json()).model, 'deepseek-v4-flash');
    assert.equal(requests[2].url, '/v1/chat/completions');

    const native = await fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({
        model: 'official',
        metadata: { ...turnMetadata, turn_id: 'next-turn' },
        input: 'hello',
        stream: false,
      }),
    });
    assert.equal((await native.json()).id, 'native');
    assert.equal(requests[3].url, '/backend-api/codex/responses');
    assert.equal(requests[3].headers.authorization, 'Bearer official-oauth-secret');

    interceptor._setProxyProfileRuntimeForTests({
      id: 'deepseek',
      name: 'DeepSeek',
      baseURL: `http://127.0.0.1:${port}`,
      apiKey: 'third-party-secret',
      activeModel: 'deepseek-v4-flash',
      effort: 'max',
      wireApi: 'chat-completions',
    });
    const urlObjectResponse = await fetch(new URL(`http://127.0.0.1:${port}/backend-api/codex/responses`), {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', metadata: { ...turnMetadata, turn_id: 'url-object-turn' }, input: 'URL object', stream: false }),
    });
    assert.equal((await urlObjectResponse.json()).model, 'deepseek-v4-flash');
    assert.equal(requests.at(-1).url, '/v1/chat/completions');

    const requestTurnMetadata = {
      session_id: 'request-session',
      thread_id: 'request-thread',
    };
    const firstRequestObject = new Request(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({
        model: 'official',
        client_metadata: requestTurnMetadata,
        metadata: { turn_id: 'request-turn' },
        input: 'Request first tool round',
        stream: false,
      }),
    });
    assert.equal((await (await fetch(firstRequestObject)).json()).model, 'deepseek-v4-flash');
    assert.equal(requests.at(-1).url, '/v1/chat/completions');

    interceptor._setProxyProfileRuntimeForTests(null);
    const secondRequestObject = new Request(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({
        model: 'official',
        client_metadata: requestTurnMetadata,
        metadata: { turn_id: 'request-turn' },
        input: 'Request second tool round',
        stream: false,
      }),
    });
    assert.equal((await (await fetch(secondRequestObject)).json()).model, 'deepseek-v4-flash');
    assert.equal(requests.at(-1).url, '/v1/chat/completions');

    const nextRequestObject = new Request(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({
        model: 'official',
        client_metadata: requestTurnMetadata,
        metadata: { turn_id: 'request-next-turn' },
        input: 'Request next turn',
        stream: false,
      }),
    });
    assert.equal((await (await fetch(nextRequestObject)).json()).id, 'native');
    assert.equal(requests.at(-1).url, '/backend-api/codex/responses');

    interceptor._setProxyProfileRuntimeForTests({
      id: 'deepseek',
      name: 'DeepSeek',
      baseURL: `http://127.0.0.1:${port}`,
      apiKey: 'third-party-secret',
      activeModel: 'deepseek-v4-flash',
      effort: 'max',
      wireApi: 'chat-completions',
    });
    const streamTurn = { ...turnMetadata, turn_id: 'stream-lifecycle-turn' };
    const streamResponse = await fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', metadata: streamTurn, input: 'stream lifecycle', stream: true }),
    });
    assert.equal(interceptor.streamingState.active, true);
    assert.equal(interceptor.streamingState.model, 'deepseek-v4-flash');
    assert.match(await streamResponse.text(), /response\.completed/);
    assert.equal(interceptor.streamingState.active, false);
    const streamRevisions = persistedCommits(commits, entry => entry.body?.metadata?.turn_id === streamTurn.turn_id);
    assert.equal(streamRevisions.length, 2);
    assert.equal(streamRevisions[0].entry.inProgress, true);
    assert.equal(streamRevisions[1].entry.inProgress, undefined);
    assert.equal(streamRevisions[0].result.entryKey, streamRevisions[1].result.entryKey);
    assert.equal(getMainAgentSessionKey(streamRevisions[0].entry), getMainAgentSessionKey(streamRevisions[1].entry));

    const abortController = new AbortController();
    const hangingBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"model":"official","input":"partial'));
      },
    });
    const hangingRequest = new Request(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: hangingBody,
      duplex: 'half',
      signal: abortController.signal,
    });
    const hangingFetch = fetch(hangingRequest);
    const commitsBeforeMaterializeAbort = commits.length;
    abortController.abort();
    await assert.rejects(hangingFetch, error => error?.name === 'AbortError');
    assert.equal(requests.length, 9);
    assert.equal(commits.length, commitsBeforeMaterializeAbort);

    await assert.rejects(fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', input: 'redirect me', stream: false }),
    }), /redirect is not allowed/);
    assert.equal(requests.length, 10);
    assert.equal(requests[9].url, '/v1/chat/completions');
    const redirectRevisions = persistedCommits(commits, entry => entry.body?.input === 'redirect me');
    assert.equal(redirectRevisions.length, 2);
    assert.equal(redirectRevisions[0].result.entryKey, redirectRevisions[1].result.entryKey);

    globalThis.__cxViewerCaptureProxyPort = port;
    await assert.rejects(fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', input: 'must not recurse', stream: false }),
    }), /cannot target the active CX Viewer capture proxy/);
    assert.equal(requests.length, 10);
    const selfForward = persistedCommits(commits, entry => entry.body?.input === 'must not recurse');
    assert.equal(selfForward.length, 1);
    assert.equal(selfForward[0].entry.inProgress, undefined);
    assert.equal(selfForward[0].entry.response.status, 0);
    globalThis.__cxViewerCaptureProxyPort = null;

    interceptor._setProxyProfileRuntimeForTests(null, 'broken profile');
    await assert.rejects(
      fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
        method: 'POST',
        headers: oauthHeaders,
        body: JSON.stringify({ model: 'official', input: 'must not fall back', stream: false }),
      }),
      /Proxy profile is invalid/,
    );
    assert.equal(requests.length, 10);
    const invalidProfile = persistedCommits(commits, entry => entry.body?.input === 'must not fall back');
    assert.equal(invalidProfile.length, 1);
    assert.equal(invalidProfile[0].entry.inProgress, undefined);
    assert.equal(invalidProfile[0].entry.response.status, 0);
    // 从未成功启用过第三方时，损坏配置只告警并回落 Default，不阻断官方流量
    interceptor._setProxyProfileRuntimeForTests(null);
    interceptor._setProxyProfileRuntimeForTests(null, 'broken profile');
    const fallbackAfterBroken = await fetch(`http://127.0.0.1:${port}/backend-api/codex/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', metadata: { ...turnMetadata, turn_id: 'fallback-after-broken' }, input: 'fallback after broken', stream: false }),
    });
    assert.equal((await fallbackAfterBroken.json()).id, 'native');
    assert.equal(requests.at(-1).url, '/backend-api/codex/responses');
    assert.equal(interceptor._proxyProfileLoadError, 'broken profile');
  } finally {
    globalThis.__cxViewerCaptureProxyPort = null;
    interceptor?._stopProxyProfileWatchForTests();
    interceptor?._clearProxyTurnRoutesForTests();
    interceptor?.setLogV2CommitListener(null);
    globalThis.fetch = originalFetch;
    if (originalMarker === undefined) delete globalThis._cxViewerInterceptorInstalled;
    else globalThis._cxViewerInterceptorInstalled = originalMarker;
    await close(upstream);
  }
});

test('remote compaction flows through the Chat profile and returns a compaction item', async () => {
  const requests = [];
  const upstream = createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      requests.push({ url: req.url, headers: req.headers, body });
      if (req.url !== '/v1/chat/completions') {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end('{"error":"not found"}');
        return;
      }
      let parsed = null;
      try { parsed = JSON.parse(body); } catch { }
      if (parsed?.stream === true) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end([
          'data: {"id":"chat-compact-stream","model":"deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"Streamed summary."},"finish_reason":"stop"}]}',
          'data: [DONE]',
          '',
        ].join('\n\n'));
        return;
      }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        id: 'chat-compact',
        model: 'deepseek-v4-flash',
        choices: [{ index: 0, finish_reason: 'stop', message: { content: 'Summary: issue 42 remains open.' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      }));
    });
  });
  const port = await listen(upstream);
  const originalFetch = globalThis.fetch;
  const originalMarker = globalThis._cxViewerInterceptorInstalled;
  let interceptor = null;
  const testRoot = mkdtempSync(join(tmpdir(), 'cxv-proxy-compaction-'));
  process.env.CXV_TEST = '1';
  process.env.CXV_CAPTURE_ONLY = '1';
  process.env.CXV_PROXY_PROFILE_PATH = join(testRoot, 'profile.json');
  process.env.CXV_LOG_DIR = join(testRoot, 'logs');

  try {
    interceptor = await import(`../interceptor.js?compaction-test=${Date.now()}`);
    interceptor._stopProxyProfileWatchForTests();
    interceptor._setProxyProfileRuntimeForTests({
      id: 'deepseek',
      name: 'DeepSeek',
      baseURL: `http://127.0.0.1:${port}`,
      apiKey: 'third-party-secret',
      activeModel: 'deepseek-v4-flash',
      effort: 'max',
      wireApi: 'chat-completions',
    });
    interceptor.setupInterceptor();

    const oauthHeaders = {
      'content-type': 'application/json',
      authorization: 'Bearer official-oauth-secret',
      'chatgpt-account-id': 'acct-secret',
      cookie: 'session=secret',
      'x-cx-viewer-trace': 'true',
      'x-cx-viewer-auth-mode': 'oauth',
    };
    const transcript = [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Keep issue 42 open' }] },
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Acknowledged, tracking it.' }] },
      { type: 'compaction_trigger' },
    ];

    const jsonResponse = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({ model: 'official', input: transcript, stream: false }),
    });
    assert.equal(jsonResponse.status, 200);
    const transformed = await jsonResponse.json();
    assert.equal(transformed.object, 'response');
    assert.equal(transformed.status, 'completed');
    assert.equal(transformed.output.length, 1);
    assert.equal(transformed.output[0].type, 'compaction');
    assert.doesNotMatch(transformed.output[0].encrypted_content, /issue 42|Acknowledged/);
    assert.equal(requests[0].url, '/v1/chat/completions');
    assert.equal(requests[0].headers.authorization, 'Bearer third-party-secret');
    assert.doesNotMatch(requests[0].body, /compaction_trigger|official-oauth-secret|session=secret|acct-secret/);
    assert.match(requests[0].body, /Acknowledged, tracking it\./);

    const secondResponse = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({
        model: 'official',
        input: [
          transformed.output[0],
          { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Continue' }] },
          { type: 'compaction_trigger' },
        ],
        stream: false,
      }),
    });
    assert.equal((await secondResponse.json()).output[0].type, 'compaction');
    assert.match(requests[1].body, /Compacted conversation state:/);

    const streamResponse = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: 'POST',
      headers: oauthHeaders,
      body: JSON.stringify({
        model: 'official',
        input: [
          { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'stream compact' }] },
          { type: 'compaction_trigger' },
        ],
        stream: true,
      }),
    });
    const streamText = await streamResponse.text();
    assert.match(streamText, /event: response\.completed/);
    assert.match(streamText, /"type":"compaction"/);
    assert.doesNotMatch(streamText, /"type":"message"/);
    const doneEvents = streamText.split('\n\n').filter(block => block.includes('event: response.output_item.done'));
    assert.equal(doneEvents.length, 1);
    assert.equal(requests[2].url, '/v1/chat/completions');
    assert.match(requests[2].body, /stream compact/);
    assert.doesNotMatch(requests[2].body, /compaction_trigger/);
  } finally {
    interceptor?._stopProxyProfileWatchForTests();
    interceptor?._clearProxyTurnRoutesForTests();
    interceptor?.setLogV2CommitListener(null);
    globalThis.fetch = originalFetch;
    if (originalMarker === undefined) delete globalThis._cxViewerInterceptorInstalled;
    else globalThis._cxViewerInterceptorInstalled = originalMarker;
    await close(upstream);
  }
});
