// Coverage: CXV_BASE_URL (public URL of a cloud reverse proxy) — stripping/injection/Host allowlisting/external-link building for the three forms.
// Isolation approach mirrors api-base-path.test.js: set a temp LOG_DIR and a private port window before importing server.js;
// the server reads process.env per request for CXV_BASE_URL, so each describe can flip env within one instance.
// Port window 18500-18509 (unique in the repo, no overlap with other test files).

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ── Must be set before any import that pulls in findcc.js ──
const tmpDir = mkdtempSync(join(tmpdir(), 'ccv-base-url-'));
mkdirSync(join(tmpDir, 'logs'), { recursive: true });
process.env.CXV_LOG_DIR = tmpDir;
process.env.HOME = join(tmpDir, 'home');
process.env.CODEX_HOME = join(tmpDir, 'codex');
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';
process.env.CXV_TEST = '1';
process.env.NODE_ENV = 'test';
delete process.env.CXV_BASE_URL;
delete process.env.CXV_BASE_PATH;
delete process.env.CXV_ALLOWED_HOSTS;
delete process.env.CXV_USE_PASSWORD;
delete process.env.CXV_PASSWORD;
// Private high-port window to avoid competing with the user's real ccv service (7008-7099) and other test files.
process.env.CXV_START_PORT = '21070';
process.env.CXV_MAX_PORT = '21079';

let token;
const HOST = 'arca-sandbox-office.alipay.com';
const PREFIX = '/arca/api/v1/session/{token}';        // literal prefix (config form)
const WIRE = '/arca/api/v1/session/%7Btoken%7D';      // wire form (after a request pathname is encoded by new URL)

/** Low-level http request. Returns {status, headers, body}. */
function raw(port, path, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const requestPath = `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || '')}`;
    const req = request({ hostname: '127.0.0.1', port, path: requestPath, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body != null) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

/** SSE probe: long connections never get 'end', so resolve on response headers and destroy; a setTimeout guards against hanging. */
function sseProbe(port, path, { headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || '')}`, headers }, (res) => {
      const r = { status: res.statusCode, contentType: res.headers['content-type'] || '' };
      req.destroy();
      resolve(r);
    });
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('SSE probe timeout')); });
    req.on('error', () => {}); // silence ECONNRESET after destroy (already resolved)
    req.end();
  });
}

describe('CXV_BASE_URL cloud reverse-proxy', { concurrency: false }, () => {
  let mod, port;

  before(async () => {
    mod = await import('../server.js');
    const srv = await mod.startViewer();
    assert.ok(srv, 'server should start');
    port = mod.getPort();
    token = mod.getAccessToken();
    assert.ok(port > 0, 'port assigned');
  });

  after(async () => {
    delete process.env.CXV_BASE_URL;
    delete process.env.CXV_BASE_PATH;
    delete process.env.CXV_ALLOWED_HOSTS;
    await mod.stopViewer();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('form 3: full URL (https://host/path)', () => {
    before(() => { process.env.CXV_BASE_URL = `https://${HOST}${PREFIX}`; });
    after(() => { delete process.env.CXV_BASE_URL; });

    it('prefixed API hits the route and returns JSON (proxy domain in Host → strip + auto-allowlist)', async () => {
      const res = await raw(port, `${PREFIX}/api/cli-mode`, { headers: { host: HOST } });
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('application/json'),
        'prefixed API must return JSON, not SPA HTML fallback');
      assert.equal(JSON.parse(res.body).cliMode, true);
    });

    it('prefixed static asset (encoded form) serves JS, not SPA HTML', async () => {
      // Asset names are hashed; take a real existing ./assets/ reference from the injected index.html
      const idx = await raw(port, `${WIRE}/`, { headers: { host: HOST } });
      const m = idx.body.match(/"\.\/(assets\/[^"]+\.js)"/);
      assert.ok(m, 'index.html should reference a hashed js asset');
      const res = await raw(port, `${WIRE}/${m[1]}`, { headers: { host: HOST } });
      assert.equal(res.status, 200);
      assert.ok(String(res.headers['content-type']).includes('javascript'),
        `asset under encoded prefix must serve JS, got ${res.headers['content-type']}`);
    });

    it('bare literal-brace prefix (curl -g / verbatim-forwarded form) → 200 HTML', async () => {
      const res = await raw(port, PREFIX, { headers: { host: HOST } });
      assert.equal(res.status, 200);
      assert.ok(String(res.headers['content-type']).includes('text/html'));
      assert.ok(res.body.includes(`<base href="${PREFIX}/">`));
    });

    it('encoded form (%7Btoken%7D) strips and matches too — real requests only arrive encoded after new URL', async () => {
      const res = await raw(port, `${WIRE}/api/cli-mode`, { headers: { host: HOST } });
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('application/json'));
    });

    it('prefixed SSE /events returns text/event-stream (SSE under a prefix is not swallowed by the SPA)', async () => {
      const r = await sseProbe(port, `${WIRE}/events`, { headers: { host: HOST } });
      assert.equal(r.status, 200);
      assert.ok(r.contentType.includes('text/event-stream'),
        `expected SSE stream, got ${r.contentType}`);
    });

    it('prefixed root path injects literal <base> + __CXV_BASE_PATH__', async () => {
      const res = await raw(port, `${WIRE}/`, { headers: { host: HOST } });
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      assert.ok(res.body.includes(`<base href="${PREFIX}/">`), 'base href keeps the literal {token} form');
      assert.ok(res.body.includes(`window.__CXV_BASE_PATH__="${PREFIX}/"`));
    });

    it('bare prefix (encoded, no trailing slash) → 200 HTML (no more 404/blank page)', async () => {
      const res = await raw(port, WIRE, { headers: { host: HOST } });
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      assert.ok(res.body.includes(`<base href="${PREFIX}/">`));
    });

    it('/api/local-url returns the public URL (explicit https + prefix + ccv own token)', async () => {
      const res = await raw(port, `${WIRE}/api/local-url`, { headers: { host: HOST } });
      assert.equal(res.status, 200);
      const { url } = JSON.parse(res.body);
      assert.ok(url.startsWith(`https://${HOST}${PREFIX}/?token=`),
        `share url must be the public URL, got ${url}`);
    });

    it('unconfigured Host is still rejected with 403 (auto-allowlist only covers the configured value)', async () => {
      const res = await raw(port, `${WIRE}/api/cli-mode`, { headers: { host: 'evil.example' } });
      assert.equal(res.status, 403);
      assert.match(res.body, /host-not-allowed|Forbidden/i);
    });
  });

  describe('form 1: host+path (no scheme)', () => {
    before(() => { process.env.CXV_BASE_URL = `${HOST}${PREFIX}`; });
    after(() => { delete process.env.CXV_BASE_URL; });

    it('strip + injection take effect', async () => {
      const api = await raw(port, `${WIRE}/api/cli-mode`, { headers: { host: HOST } });
      assert.equal(api.status, 200);
      const root = await raw(port, `${WIRE}/`, { headers: { host: HOST } });
      assert.ok(root.body.includes(`<base href="${PREFIX}/">`));
    });

    it('local-url without XFP → default https', async () => {
      const res = await raw(port, `${WIRE}/api/local-url`, { headers: { host: HOST } });
      const { url } = JSON.parse(res.body);
      assert.ok(url.startsWith(`https://${HOST}${PREFIX}/?token=`), `got ${url}`);
    });

    it('local-url with X-Forwarded-Proto: http → http (no Origin header, bypassing the same-origin gate)', async () => {
      const res = await raw(port, `${WIRE}/api/local-url`,
        { headers: { host: HOST, 'x-forwarded-proto': 'http' } });
      const { url } = JSON.parse(res.body);
      assert.ok(url.startsWith(`http://${HOST}${PREFIX}/?token=`), `got ${url}`);
    });
  });

  describe('form 2: path only (/path)', () => {
    before(() => { process.env.CXV_BASE_URL = PREFIX; });
    after(() => { delete process.env.CXV_BASE_URL; });

    it('strip + injection take effect; no Host is allowlisted', async () => {
      const api = await raw(port, `${WIRE}/api/cli-mode`);
      assert.equal(api.status, 200);
      const root = await raw(port, `${WIRE}/`);
      assert.ok(root.body.includes(`<base href="${PREFIX}/">`));
      const evil = await raw(port, `${WIRE}/api/cli-mode`, { headers: { host: 'evil.example' } });
      assert.equal(evil.status, 403);
    });

    it('local-url falls back to the internal IP form (with prefix)', async () => {
      const res = await raw(port, `${WIRE}/api/local-url`);
      const { url } = JSON.parse(res.body);
      assert.match(url, /^http:\/\/[^/]+\/arca\/api\/v1\/session\/\{token\}\/\?token=/, `got ${url}`);
    });
  });

  describe('set together with CXV_BASE_PATH: CXV_BASE_URL wins (legacy ignored)', () => {
    before(() => {
      process.env.CXV_BASE_URL = `https://${HOST}/new/base`;
      process.env.CXV_BASE_PATH = '/legacy/';
    });
    after(() => {
      delete process.env.CXV_BASE_URL;
      delete process.env.CXV_BASE_PATH;
    });

    it('new prefix matches, old prefix falls through to SPA (proves legacy no longer participates in stripping)', async () => {
      const fresh = await raw(port, '/new/base/api/cli-mode', { headers: { host: HOST } });
      assert.equal(fresh.status, 200);
      assert.ok(fresh.headers['content-type'].includes('application/json'));
      const legacy = await raw(port, '/legacy/api/cli-mode');
      assert.ok(String(legacy.headers['content-type']).includes('text/html'),
        'legacy prefix must fall through to SPA when CXV_BASE_URL wins');
    });
  });

  describe('invalid CXV_BASE_URL: falls back to legacy', () => {
    before(() => {
      process.env.CXV_BASE_URL = 'https://bad host/x';
      process.env.CXV_BASE_PATH = '/legacy/';
    });
    after(() => {
      delete process.env.CXV_BASE_URL;
      delete process.env.CXV_BASE_PATH;
    });

    it('legacy prefix strips and root injects the legacy base', async () => {
      const api = await raw(port, '/legacy/api/cli-mode');
      assert.equal(api.status, 200);
      assert.ok(api.headers['content-type'].includes('application/json'));
      const root = await raw(port, '/legacy/');
      assert.ok(root.body.includes('<base href="/legacy/">'));
    });
  });

  describe('explicit CXV_ALLOWED_HOSTS merges with the base URL host', () => {
    before(() => {
      process.env.CXV_BASE_URL = `https://${HOST}${PREFIX}`;
      process.env.CXV_ALLOWED_HOSTS = 'allowed.test';
    });
    after(() => {
      delete process.env.CXV_BASE_URL;
      delete process.env.CXV_ALLOWED_HOSTS;
    });

    it('both the configured domain and the user explicit domain are reachable (merge, not replace)', async () => {
      const byBase = await raw(port, `${WIRE}/api/cli-mode`, { headers: { host: HOST } });
      assert.equal(byBase.status, 200);
      const byExplicit = await raw(port, '/api/cli-mode', { headers: { host: 'allowed.test' } });
      assert.equal(byExplicit.status, 200);
      const evil = await raw(port, '/api/cli-mode', { headers: { host: 'evil.example' } });
      assert.equal(evil.status, 403);
    });
  });

  describe('base URL host with a port: Host matching compares hostname only', () => {
    before(() => { process.env.CXV_BASE_URL = `${HOST}:8443${PREFIX}`; });
    after(() => { delete process.env.CXV_BASE_URL; });

    it('Host: host (no port) is reachable; local-url renders with the port', async () => {
      const api = await raw(port, `${WIRE}/api/cli-mode`, { headers: { host: HOST } });
      assert.equal(api.status, 200);
      const res = await raw(port, `${WIRE}/api/local-url`, { headers: { host: HOST } });
      const { url } = JSON.parse(res.body);
      assert.ok(url.startsWith(`https://${HOST}:8443${PREFIX}/?token=`), `got ${url}`);
    });
  });
  describe('configured TLS proxy preserves native password policy', () => {
    before(() => { process.env.CXV_BASE_URL = `https://${HOST}${PREFIX}`; });
    after(() => { delete process.env.CXV_BASE_URL; });
    it('accepts the configured public browser origin for token-authorized APIs', async () => {
      const response = await raw(port, `${WIRE}/api/local-url`, { headers: { host: HOST, origin: `https://${HOST}`, 'x-forwarded-proto': 'https' } });
      assert.equal(response.status, 200, response.body);
      assert.ok(JSON.parse(response.body).url.startsWith(`https://${HOST}${PREFIX}/?token=`));
      const hostile = await raw(port, `${WIRE}/api/local-url`, { headers: { host: HOST, origin: 'https://evil.example' } });
      assert.equal(hostile.status, 403);
    });
    it('never enables password login or secure cookies from forwarded TLS headers', async () => {
      const response = await raw(port, `${WIRE}/api/auth/login`, { method: 'POST', headers: { host: HOST, origin: `https://${HOST}`, 'x-forwarded-proto': 'https', 'content-type': 'application/json' }, body: { password: 'fixture' } });
      assert.equal(response.status, 403, response.body);
      assert.equal(JSON.parse(response.body).error, 'secure-transport-required');
      assert.equal(response.headers['set-cookie'], undefined);
    });
    it('upgrades the original mux through the encoded prefix and public origin', async () => {
      const { WebSocket } = await import('ws');
      const ws = new WebSocket(`ws://127.0.0.1:${port}${WIRE}/ws/mux?token=${encodeURIComponent(token)}`, { headers: { host: HOST, origin: `https://${HOST}`, 'x-forwarded-proto': 'https' } });
      try { await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); }); }
      finally { ws.terminate(); }
    });
  });

  it('HTML and login scripts preserve literal unsafe delimiters without executing extra markup', async () => {
    const { runInNewContext } = await import('node:vm');
    const { renderLoginPage } = await import('../lib/auth.js');
    const path = '/p</script><script>fixture</script>/';
    process.env.CXV_BASE_URL = path;
    try {
      const response = await raw(port, path);
      assert.equal(response.status, 200);
      const script = response.body.match(/<script>(window\.__CXV_BASE_PATH__=.*?)<\/script>/s)?.[1];
      assert.ok(script);
      const context = { window: {} }; runInNewContext(script, context);
      assert.equal(context.window.__CXV_BASE_PATH__, path);
      const login = renderLoginPage({ basePath: path });
      const element = { style: {}, value: '', select() {} }, calls = [];
      runInNewContext(login.split('<script>')[1].split('</script>')[0], { document: { getElementById: () => element }, fetch: async url => { calls.push(url); return { ok: false }; } });
      await element.onsubmit({ preventDefault() {} });
      assert.deepEqual(calls, [path + 'api/auth/login']);
    } finally { delete process.env.CXV_BASE_URL; }
  });

});
