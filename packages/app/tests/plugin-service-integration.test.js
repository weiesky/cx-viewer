import { describe, it, before, after } from 'node:test';
import { waitForProcessExit } from './helpers/process-exit.js';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request } from 'node:http';

// End-to-end: spawn a real service child and exercise the main-port HTTP/WS proxy, panel
// static serving, hot reload, crash auto-restart, and disable/unload. Port window 19800-19809.
const tmpDir = mkdtempSync(join(tmpdir(), 'ccv-psint-'));
mkdirSync(join(tmpDir, 'plugins', 'hello-service', 'panel'), { recursive: true });
process.env.CXV_LOG_DIR = tmpDir;
process.env.HOME = join(tmpDir, 'home');
process.env.CODEX_HOME = join(tmpDir, 'codex');
process.env.CXV_CLI_MODE = '1';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_SDK_MODE = '0';
process.env.CXV_START_PORT = '21010';
process.env.CXV_MAX_PORT = '21019';
process.env.CXV_TEST_ALLOW_PLUGIN_SPAWN = '1';
process.env.NODE_ENV = 'test';
delete process.env.CXV_IM_WORKER;
delete process.env.CXV_BASE_PATH;
delete process.env.CXV_BASE_URL;

const BASE_PATH = process.env.CXV_PLUGIN_TEST_PREFIX || '';
if (BASE_PATH) process.env.CXV_BASE_URL = BASE_PATH;
const PLUGIN_DIR = join(tmpDir, 'plugins', 'hello-service');

function writeServicePlugin(responseText = 'hello-v1') {
  writeFileSync(join(PLUGIN_DIR, 'plugin.json'), JSON.stringify({
    name: 'hello-service',
    version: '1.0.0',
    main: 'main.mjs',
    service: { entry: 'service.mjs' },
    panel: { entry: 'panel/index.js', title: { en: 'Hello', zh: '你好' } },
  }));
  writeFileSync(join(PLUGIN_DIR, 'main.mjs'), `
    export default {
      hooks: { async beforeRequest({url,res}) {
        if (url !== '/api/plugin-fixture') return;
        res.writeHead(200, {'Content-Type':'application/json'});res.end(JSON.stringify({hook:'ok'}));
        return {handled:true};
      } },
      async activate(ctx) {
        globalThis.__activated = (globalThis.__activated || 0) + 1;
      },
      async deactivate(reason) {
        globalThis.__deactivated = (globalThis.__deactivated || 0) + 1;
        globalThis.__lastReason = reason;
      },
    };
  `);
  writeFileSync(join(PLUGIN_DIR, 'service.mjs'), `
    const { startPluginService, WebSocketServer, callParent } = await import(process.env.CCV_PLUGIN_HOST);
    await startPluginService({
      async onRequest(req, res) {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname === '/parent-check') {
          const parent = await callParent('/api/cli-mode');
          res.writeHead(parent.status, { 'Content-Type': 'application/json' }); res.end(await parent.text()); return;
        }
        if (url.pathname === '/hello') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'plugin_sample=1; Path=/' });
          res.end(JSON.stringify({ text: ${JSON.stringify(responseText)}, query: url.search, forwardedPrefix: req.headers['x-forwarded-prefix'] }));
          return;
        }
        if (url.pathname === '/echo' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(body);
          });
          return;
        }
        if (url.pathname === '/sse') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.write('data: a\\n\\n');
          setTimeout(() => { res.write('data: b\\n\\n'); res.end(); }, 150);
          return;
        }
        if (url.pathname === '/crash') {
          res.writeHead(200);
          res.end('bye');
          setTimeout(() => process.exit(1), 50);
          return;
        }
        res.writeHead(404);
        res.end('not found');
      },
      onUpgrade(req, socket, head) {
        const wss = new WebSocketServer({ noServer: true });
        wss.on('connection', (ws) => {
          ws.on('message', (m) => ws.send('echo:' + m));
        });
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
      },
    });
  `);
  writeFileSync(join(PLUGIN_DIR, 'panel', 'index.js'), `window.CCV.registerPanel('hello-service', function Panel(){ return null; });`);
  writeFileSync(join(PLUGIN_DIR, 'panel', 'index.css'), '.hello-panel-root { color: red; }');
}

let mod;
let port;
let ACCESS_TOKEN;

function httpReq(path, { method = 'GET', body = null, token = null, headers: extraHeaders = {} } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { ...extraHeaders };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const url = BASE_PATH + (token ? `${path}${path.includes('?') ? '&' : '?'}token=${token}` : path);
    const req = request({ host: '127.0.0.1', port, path: url, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function waitForServiceStatus(state, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await httpReq('/api/plugins', { token: ACCESS_TOKEN });
    const plugins = JSON.parse(r.body).plugins;
    const p = plugins.find(p => p.name === 'hello-service');
    if (p && p.serviceStatus && p.serviceStatus.state === state) return p.serviceStatus;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`service did not reach state "${state}" in time`);
}

async function waitForNewPid(oldPid, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await httpReq('/api/plugins', { token: ACCESS_TOKEN });
    const p = JSON.parse(r.body).plugins.find(p => p.name === 'hello-service');
    const st = p && p.serviceStatus;
    if (st && st.state === 'ready' && st.pid && st.pid !== oldPid) return st;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`service did not restart with a new pid within ${timeoutMs}ms`);
}

function runtimeFiles() {
  const runtimeDir = join(tmpDir, 'plugins-runtime', 'hello-service');
  return readdirSync(runtimeDir);
}

describe('service plugin end-to-end (real child process)', { concurrency: false }, () => {
  before(async () => {
    writeServicePlugin();
    mod = await import('../server.js');
    const [srv, duplicate] = await Promise.all([mod.startViewer(), mod.startViewer()]);
    assert.equal(srv, duplicate);
    assert.equal(globalThis.__activated, 1);
    assert.ok(srv, 'server should start');
    port = mod.getPort();
    // ACCESS_TOKEN is random per process and not exposed via deps - loopback requests skip auth
    ACCESS_TOKEN = null;
    await waitForServiceStatus('ready');
  });

  after(async () => {
    await mod.stopViewer();
    // After stop the child must be dead and locks cleared
    const runtimeDir = join(tmpDir, 'plugins-runtime', 'hello-service');
    if (existsSync(runtimeDir)) {
      const locks = readdirSync(runtimeDir).filter(f => f.endsWith('.lock'));
      assert.deepEqual(locks, [], 'lock files cleaned after stopViewer');
    }
    rmSync(tmpDir, { recursive: true, force: true });
    // node:http's globalAgent keep-alive sockets hold the event loop open - destroy them explicitly.
    // Long-running production processes are unaffected; this mirrors server.closeAllConnections()
    // not covering idle agent free sockets.
    const { globalAgent } = await import('node:http');
    globalAgent.destroy();
  });

  it('dispatches main-process hooks through the real authenticated request flow', async () => {
    const result = await httpReq('/api/plugin-fixture');
    assert.equal(result.status, 200);
    assert.equal(JSON.parse(result.body).hook, 'ok');
  });

  it('serves panel manifest via /api/plugin-panels', async () => {
    const r = await httpReq('/api/plugin-panels');
    assert.equal(r.status, 200);
    const { panels } = JSON.parse(r.body);
    const p = panels.find(p => p.name === 'hello-service');
    assert.ok(p, 'panel listed');
    assert.match(p.entryUrl, /^\/plugin-panels\/hello-service\/index\.js\?v=/);
    assert.equal(p.panelStatus, 'ready');
    assert.equal(p.serviceStatus, 'ready');
    assert.equal(r.headers['cache-control'], 'no-store');
  });

  it('proxies HTTP GET with prefix strip and query', async () => {
    const r = await httpReq('/plugins/hello-service/hello?x=1&y=2');
    assert.equal(r.status, 200);
    const body = JSON.parse(r.body);
    assert.equal(body.text, 'hello-v1');
    assert.equal(body.query, '?x=1&y=2');
    assert.equal(body.forwardedPrefix, `${BASE_PATH}/plugins/hello-service`);
    assert.ok(r.headers['set-cookie'][0].includes(`Path=${new URL('http://fixture'+BASE_PATH+'/plugins/hello-service/').pathname}`));
  });

  it('host SDK calls the parent API through exactly one base prefix', async () => {
    const response = await httpReq('/plugins/hello-service/parent-check');
    assert.equal(response.status, 200, response.body);
    assert.equal(JSON.parse(response.body).cliMode, true);
  });

  it('redirects /plugins/<name> to trailing slash', async () => {
    const r = await httpReq('/plugins/hello-service');
    assert.equal(r.status, 308);
    assert.match(r.headers.location, /\/plugins\/hello-service\/$/);
  });

  it('rejects cross-site plugin proxy requests and allows same-origin ones', async () => {
    const evil = await httpReq('/plugins/hello-service/hello', { headers: { Origin: 'https://evil.example' } });
    assert.equal(evil.status, 403, 'cross-site browser requests must not reach plugin services');
    assert.match(evil.body, /cross-site|cross-origin/);

    const sameOrigin = await httpReq('/plugins/hello-service/hello', { headers: { Origin: `http://127.0.0.1:${port}` } });
    assert.equal(sameOrigin.status, 200, 'same-origin browser requests pass');

    // No Origin (CLI/native) was already covered by the plain GET above.
  });

  it('rejects cross-site WebSocket upgrades and allows same-origin ones', async () => {
    const { WebSocket } = await import('ws');
    const evil = new WebSocket(`ws://127.0.0.1:${port}${BASE_PATH}/plugins/hello-service/ws`, { origin: 'https://evil.example' });
    const evilErr = await new Promise((resolve) => {
      evil.on('error', (err) => resolve(err));
      evil.on('open', () => resolve(null));
      setTimeout(() => resolve(new Error('ws timeout')), 3000);
    });
    assert.ok(evilErr, 'cross-site WS upgrade must be rejected');

    const ok = new WebSocket(`ws://127.0.0.1:${port}${BASE_PATH}/plugins/hello-service/ws`, { origin: `http://127.0.0.1:${port}` });
    const reply = await new Promise((resolve, reject) => {
      ok.on('open', () => ok.send('ping'));
      ok.on('message', (m) => resolve(m.toString()));
      ok.on('error', reject);
      setTimeout(() => reject(new Error('ws timeout')), 3000);
    });
    assert.equal(reply, 'echo:ping');
    ok.close();
  });

  it('proxies POST body end-to-end', async () => {
    const body = 'payload-' + 'x'.repeat(1000);
    const r = await httpReq('/plugins/hello-service/echo', { method: 'POST', body });
    assert.equal(r.status, 200);
    assert.equal(r.body, body);
  });

  it('streams SSE chunks through the proxy', async () => {
    const chunks = [];
    await new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path: `${BASE_PATH}/plugins/hello-service/sse` }, (res) => {
        res.on('data', (c) => chunks.push(c.toString()));
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.end();
    });
    assert.deepEqual(chunks, ['data: a\n\n', 'data: b\n\n']);
  });

  it('serves panel bundle statically with correct MIME; source files 404', async () => {
    const r1 = await httpReq('/plugin-panels/hello-service/index.js');
    assert.equal(r1.status, 200);
    assert.match(r1.headers['content-type'], /text\/javascript/);
    assert.match(r1.body, /registerPanel/);
    const r2 = await httpReq('/plugin-panels/hello-service/index.css');
    assert.match(r2.headers['content-type'], /text\/css/);
    // Source files and escapes are 404/4xx, never served
    for (const p of ['/plugin-panels/hello-service/../main.mjs', '/plugin-panels/hello-service/%2e%2e/service.mjs', '/plugin-panels/hello-service/data.json']) {
      const r = await httpReq(p);
      assert.ok(r.status >= 400, `${p} → ${r.status}`);
    }
  });

  it('tunnels WebSocket through the proxy', async () => {
    const { WebSocket } = await import('ws');
    const ws = new WebSocket(`ws://127.0.0.1:${port}${BASE_PATH}/plugins/hello-service/ws?token=${mod.getAccessToken()}`);
    const reply = await new Promise((resolve, reject) => {
      ws.on('open', () => ws.send('ping'));
      ws.on('message', (m) => resolve(m.toString()));
      ws.on('error', reject);
      setTimeout(() => reject(new Error('ws timeout')), 5000);
    });
    assert.equal(reply, 'echo:ping');
    ws.close();
  });

  it('hot reload picks up service.mjs changes and re-runs lifecycle', async () => {
    const activatedBefore = await mod.__activatedCount?.() ?? null;
    writeServicePlugin('hello-v2');
    const r = await httpReq('/api/plugins/reload', { method: 'POST' });
    assert.equal(r.status, 200);
    await waitForServiceStatus('ready');
    const r2 = await httpReq('/plugins/hello-service/hello');
    assert.equal(JSON.parse(r2.body).text, 'hello-v2', '改 service.mjs 后 reload 生效');
  });

  it('auto-restarts crashed service with backoff and cleans the crashed generation', async () => {
    const before = await waitForServiceStatus('ready');
    const runtimeDir = join(tmpDir, 'plugins-runtime', 'hello-service');
    const lockName = runtimeFiles().find(f => f.startsWith('service-') && f.endsWith('.lock'));
    const oldLock = JSON.parse(readFileSync(join(runtimeDir, lockName), 'utf-8'));
    const oldConfigNames = runtimeFiles().filter(f => f.startsWith('config-') && f.endsWith('.json'));
    const oldSecrets = oldConfigNames.map(f => JSON.parse(readFileSync(join(runtimeDir, f), 'utf-8')).secret);
    assert.equal(oldLock.pid, before.pid);
    assert.ok(oldSecrets.length > 0 && oldSecrets[0], '0600 config holds the secret');

    await httpReq('/plugins/hello-service/crash');
    // Pass through restarting/crashed intermediate states, then back to ready with a new child
    const after = await waitForNewPid(before.pid);
    assert.notEqual(after.pid, before.pid, 'restart must use a new child pid');
    assert.ok(after.restarts >= before.restarts + 1, 'restart counter increased');

    const files = runtimeFiles();
    assert.deepEqual(files.filter(f => f.includes('.tmp-')), [], 'no atomic-write temp residue');
    const newLock = JSON.parse(readFileSync(join(runtimeDir, lockName), 'utf-8'));
    assert.equal(newLock.pid, after.pid, 'lock now points at the new child');
    const secretsNow = files
      .filter(f => f.startsWith('config-') && f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(join(runtimeDir, f), 'utf-8')).secret);
    assert.ok(secretsNow.every(s => !oldSecrets.includes(s)), 'crashed generation config/secret no longer on disk');

    const r = await httpReq('/plugins/hello-service/hello');
    assert.equal(r.status, 200, 'API recovers after crash restart');
  });

  it('disable via preferences unloads service (404/503) and reload re-enables', async () => {
    const prefsPath = join(tmpDir, 'preferences.json');
    writeFileSync(prefsPath, JSON.stringify({ disabledPlugins: ['hello-service'] }));
    const r = await httpReq('/api/plugins/reload', { method: 'POST' });
    assert.equal(r.status, 200);
    await new Promise(r => setTimeout(r, 500));
    const r2 = await httpReq('/plugins/hello-service/hello');
    assert.ok([404, 503].includes(r2.status), `disabled → ${r2.status}`);
    writeFileSync(prefsPath, JSON.stringify({ disabledPlugins: [] }));
    await httpReq('/api/plugins/reload', { method: 'POST' });
    await waitForServiceStatus('ready');
    const r3 = await httpReq('/plugins/hello-service/hello');
    assert.equal(r3.status, 200);
  });
  it('protects management/proxy/local URL and rejects rebinding on panel assets', async () => {
    for (const [path, method] of [['/api/plugins/reload', 'POST'], ['/api/plugins/restart?name=hello-service', 'POST'], ['/api/plugins?dir=hello-service', 'DELETE'], ['/plugins/hello-service/hello', 'GET'], ['/api/local-url', 'GET']]) {
      assert.equal((await httpReq(path, { method, headers: { 'sec-fetch-site': 'cross-site' } })).status, 403, path);
    }
    assert.equal((await httpReq('/plugin-panels/hello-service/index.js', { token: mod.getAccessToken(), headers: { Host: 'evil.example' } })).status, 403);
    assert.equal((await httpReq('/api/plugins', { headers: { Host: '[' } })).status, 400);
  });

  it('keeps service secrets private through general file APIs and hardlink aliases', async () => {
    const { isPublicFilePath } = await import('../lib/credential-file-policy.js');
    const { linkSync } = await import('node:fs');
    const runtime = join(tmpDir, 'plugins-runtime', 'hello-service');
    const config = readdirSync(runtime).find(name => name.endsWith('.json'));
    assert.ok(config);
    const path = join(runtime, config);
    assert.equal(isPublicFilePath(path), false);
    const alias = join(tmpDir, 'runtime-alias.json');
    linkSync(path, alias);
    assert.equal(isPublicFilePath(alias), false);
  });

  it('stops the service before directory deletion', async () => {
    const before = await waitForServiceStatus('ready');
    const response = await httpReq('/api/plugins?dir=hello-service', { method: 'DELETE' });
    assert.equal(response.status, 200, response.body);
    assert.equal(existsSync(PLUGIN_DIR), false);
    await waitForProcessExit(before.pid);
    assert.equal((await httpReq('/plugins/hello-service/hello')).status, 404);
    assert.deepEqual(JSON.parse((await httpReq('/api/plugin-panels')).body).panels, []);
  });

});
