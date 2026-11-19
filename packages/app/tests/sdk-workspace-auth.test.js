import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-auth-'));
const a = join(root, 'one'), b = join(root, 'two');
mkdirSync(a); mkdirSync(b);
Object.assign(process.env, {
  CXV_LOG_DIR: root, CXV_PROJECT_DIR: a, CXV_SDK_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1',
  CXV_START_PORT: '20020', CXV_MAX_PORT: '20029',
});
let server, auth, sdk, port;

function call(path, { body, cookie, remote = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path,
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(remote ? { Host: `viewer.example:${port}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

function canOpenWs(cookie) {
  return new Promise(resolve => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal`, {
      headers: { Host: `viewer.example:${port}`, Cookie: cookie },
    });
    const done = value => { ws.close(); resolve(value); };
    ws.once('open', () => done(true));
    ws.once('error', () => resolve(false));
    ws.once('unexpected-response', (_req, res) => { res.resume(); done(false); });
  });
}

before(async () => {
  auth = await import('../lib/auth.js');
  auth.saveAuthConfig({ enabled: true, password: 'GLOBAL1' }, { scope: 'global' });
  auth.saveAuthConfig({ enabled: true, password: 'BOOT1' }, { scope: 'project', projectDir: a });
  auth.saveAuthConfig({ enabled: true, password: 'OTHER2' }, { scope: 'project', projectDir: b });
  server = await import('../server.js');
  sdk = await import('../lib/sdk-manager.js');
  sdk.initSdkSession(a, 'one');
  await server.startViewer();
  port = server.getPort();
});

after(async () => {
  sdk?.stopSession();
  await server?.stopViewer();
  rmSync(root, { recursive: true, force: true });
});

test('SDK workspace selection preserves the boot Viewer login for HTTP and WebSocket', async () => {
  const login = await call('/api/auth/login', { body: { password: 'BOOT1' } });
  assert.equal(login.status, 200);
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  process.env.CXV_PROJECT_DIR = b;
  const local = await call('/api/auth/state');
  assert.equal(local.data.projectDir, a);
  assert.equal(local.data.password, 'BOOT1');
  assert.equal((await call('/api/auth/state', { cookie, remote: true })).status, 200);
  assert.equal(await canOpenWs(cookie), true);
  assert.equal((await call('/api/auth/login', { body: { password: 'OTHER2' } })).status, 401);
  assert.equal((await call('/api/auth/login', { body: { password: 'GLOBAL1' } })).status, 401);
  auth.saveAuthConfig({ enabled: true, password: 'OTHER3' }, { scope: 'project', projectDir: b });
  assert.equal((await call('/api/auth/state', { cookie, remote: true })).status, 200);
  assert.equal(await canOpenWs(cookie), true);
  const updated = await call('/api/auth/config', { body: { scope: 'project', password: 'BOOT2' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.projectDir, a);
  assert.equal(auth.loadAuthConfig(b).password, 'OTHER3');
  assert.equal(auth.loadAuthConfig(a).password, 'BOOT2');
  assert.equal((await call('/api/auth/state', { cookie, remote: true })).status, 403);
  assert.equal(await canOpenWs(cookie), false);
  const next = await call('/api/auth/login', { body: { password: 'BOOT2' } });
  const nextCookie = next.headers['set-cookie'][0].split(';')[0];
  auth.saveAuthConfig({ enabled: true, password: 'BOOT3' }, { scope: 'project', projectDir: a });
  assert.equal((await call('/api/auth/state', { cookie: nextCookie, remote: true })).status, 403);
  assert.equal(await canOpenWs(nextCookie), false);
});
