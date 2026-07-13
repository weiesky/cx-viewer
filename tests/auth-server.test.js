import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

const tmpDir = mkdtempSync(join(tmpdir(), 'cxv-auth-server-'));
const switchedLogDir = join('/tmp', `cxv-auth-server-switch-${process.pid}`);
const projectDir = join(tmpDir, 'project');
mkdirSync(projectDir);

process.env.CXV_LOG_DIR = tmpDir;
process.env.CXV_PROJECT_DIR = projectDir;
process.env.CXV_START_PORT = '19860';
process.env.CXV_MAX_PORT = '19869';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';

function call(hostname, port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname, port, path, method, headers }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data,
        json() { return JSON.parse(data); },
      }));
    });
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}

describe('single-port remote password access', { concurrency: false }, () => {
  let mod;
  let port;
  let lanIp;

  before(async () => {
    mod = await import('../server.js');
    await mod.startViewer();
    port = mod.getPort();
    lanIp = mod.getAllLocalIps()[0];
  });

  after(async () => {
    await mod.stopViewer();
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(switchedLogDir, { recursive: true, force: true });
  });

  const canOpenWs = (url, headers = {}) => new Promise(resolve => {
    const ws = new WebSocket(url, { headers });
    const done = value => { try { ws.close(); } catch {} resolve(value); };
    ws.once('open', () => done(true));
    ws.once('error', () => done(false));
    ws.once('unexpected-response', (_req, res) => { res.resume(); done(false); });
  });

  it('keeps one HTTP port but refuses remote password login without TLS', async t => {
    assert.equal(port, 19860);
    assert.equal(mod.getProtocol(), 'http');
    await assert.rejects(call('127.0.0.1', port + 1, '/'));

    const hostileConfig = await call('127.0.0.1', port, '/api/auth/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(hostileConfig.status, 403);

    if (!lanIp) return t.skip('no LAN address available');

    const configured = await call('127.0.0.1', port, '/api/auth/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'project', enabled: true, password: 'AB1234' }),
    });
    assert.equal(configured.status, 200);
    assert.equal(configured.json().enabled, true);

    assert.equal(configured.json().remotePasswordLoginAvailable, false);
    assert.equal(configured.json().secureTransport, false);

    const challenge = await call(lanIp, port, '/', { headers: { Accept: 'text/html', 'Accept-Language': 'zh-CN' } });
    assert.equal(challenge.status, 403);
    assert.match(challenge.body, /secure_transport_required/);

    const login = await call(lanIp, port, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'ab1234' }),
    });
    assert.equal(login.status, 403);
    assert.match(login.body, /secure-transport-required/);

    const localUrl = await call('127.0.0.1', port, '/api/local-url');
    const shared = new URL(localUrl.json().url);
    const token = shared.searchParams.get('token');
    assert.ok(token);

    const state = await call(lanIp, port, `/api/auth/state?token=${encodeURIComponent(token)}`);
    assert.equal(state.status, 200);
    assert.equal(state.json().isAdmin, false);
    assert.equal(state.json().password, null);

    const prefs = await call(lanIp, port, `/api/preferences?token=${encodeURIComponent(token)}`);
    assert.equal(prefs.status, 200);
    assert.equal(Object.hasOwn(prefs.json(), 'auth'), false);
    assert.equal(Object.hasOwn(prefs.json(), 'authByProject'), false);
  });

  it('requires same-origin or an explicit credential for loopback WebSocket', async () => {
    const base = `ws://127.0.0.1:${port}/ws/terminal`;
    assert.equal(await canOpenWs(base, { Origin: 'http://evil.example' }), false);
    assert.equal(await canOpenWs(base), false);
    assert.equal(await canOpenWs(base, { Origin: `http://127.0.0.1:${port}` }), true);
    assert.equal(await canOpenWs(`${base}?token=${encodeURIComponent(mod.getAccessToken())}`), true);

    const login = await call('127.0.0.1', port, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AB1234' }),
    });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const otherPortOrigin = `http://127.0.0.1:${port + 1}`;
    assert.equal(await canOpenWs(base, { Origin: otherPortOrigin, Cookie: cookie }), false);
    assert.equal((await call('127.0.0.1', port, '/api/auth/state', {
      headers: { Origin: otherPortOrigin, Cookie: cookie },
    })).status, 403);
  });

  it('exposes only raw frames referenced by the selected business log', async () => {
    const rawDir = join(tmpDir, 'project', 'raw');
    mkdirSync(rawDir, { recursive: true });
    const ref = {
      version: 1,
      streamId: 'api-stream',
      threadId: 'thread-1',
      sidecar: 'thread-1.jsonl',
      fromSeq: 2,
      toSeq: 3,
    };
    writeFileSync(join(tmpDir, 'project', 'raw-api.jsonl'), `${JSON.stringify({ timestamp: 1, _codexRaw: ref })}\n---\n`);
    writeFileSync(join(rawDir, ref.sidecar), [
      JSON.stringify({ stream_id: ref.streamId, seq: 1, value: 'before' }),
      JSON.stringify({ stream_id: ref.streamId, seq: 2, value: 'visible' }),
      JSON.stringify({ stream_id: ref.streamId, seq: 3, value: 'visible-too' }),
      '',
    ].join('\n'));

    const listed = await call('127.0.0.1', port, '/api/raw-sidecars?file=project%2Fraw-api.jsonl');
    assert.equal(listed.status, 200);
    assert.equal(listed.json().sidecars.length, 1);

    const frames = await call('127.0.0.1', port, '/api/raw-sidecar/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'project/raw-api.jsonl', ref }),
    });
    assert.equal(frames.status, 200, frames.body);
    assert.deepEqual(frames.json().frames.map(frame => frame.seq), [2, 3]);

    const denied = await call('127.0.0.1', port, '/api/raw-sidecar/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'project/raw-api.jsonl', ref: { ...ref, streamId: 'other-stream' } }),
    });
    assert.equal(denied.status, 403);
  });

  it('revokes the server-side session on logout', async () => {
    const login = await call('127.0.0.1', port, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AB1234' }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const remoteHeaders = { Host: `viewer.example:${port}`, Cookie: cookie };
    assert.equal((await call('127.0.0.1', port, '/api/auth/state', { headers: remoteHeaders })).status, 200);

    const logout = await call('127.0.0.1', port, '/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    assert.equal(logout.status, 200);
    assert.notEqual((await call('127.0.0.1', port, '/api/auth/state', { headers: remoteHeaders })).status, 200);
  });

  it('invalidates an issued session after password configuration changes', async t => {
    if (!lanIp) return t.skip('no LAN address available');
    const login = await call('127.0.0.1', port, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AB1234' }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    assert.equal((await call(lanIp, port, '/api/auth/state', { headers: { Cookie: cookie } })).status, 200);

    const changed = await call('127.0.0.1', port, '/api/auth/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'project', password: 'CD5678' }),
    });
    assert.equal(changed.status, 200);
    assert.equal((await call(lanIp, port, '/api/auth/state', { headers: { Cookie: cookie } })).status, 403);
  });

  it('refreshes auth config and invalidates sessions when LOG_DIR changes', async t => {
    if (!lanIp) return t.skip('no LAN address available');
    const login = await call('127.0.0.1', port, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'CD5678' }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    mkdirSync(switchedLogDir, { recursive: true });
    const switched = await call('127.0.0.1', port, '/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logDir: switchedLogDir }),
    });
    assert.equal(switched.status, 200, switched.body);
    const localState = await call('127.0.0.1', port, '/api/auth/state');
    assert.equal(localState.json().enabled, false);
    assert.equal((await call(lanIp, port, '/api/auth/state', { headers: { Cookie: cookie } })).status, 403);
  });
});
