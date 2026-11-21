import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import fs, { existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import { dirname, join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { rawProjectDirectoryToken } from '../lib/log-v2/project-id.js';

const tmpDir = mkdtempSync(join(tmpdir(), 'cxv-auth-server-'));
const switchedLogDir = join('/tmp', `cxv-auth-server-switch-${process.pid}`);
const projectDir = join(tmpDir, 'project');
const logDir = join(tmpDir, 'viewer-state');
mkdirSync(projectDir);

process.env.CXV_LOG_DIR = logDir;
process.env.HOME = join(tmpDir, 'home');
process.env.CODEX_HOME = join(tmpDir, 'home', 'codex');
process.env.CXV_PROXY_PROFILE_PATH = join(tmpDir, 'profile-config', 'profile.json');
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
    const rawDir = join(logDir, 'v2-raw', rawProjectDirectoryToken('project'));
    mkdirSync(rawDir, { recursive: true });
    const ref = {
      version: 1,
      streamId: 'api-stream',
      threadId: 'thread-1',
      sidecar: 'thread-1.jsonl',
      fromSeq: 2,
      toSeq: 3,
    };
    const writer = LogV2Writer.open({
      rootDir: logDir,
      projectId: 'project',
      canonicalCwd: projectDir,
      sessionId: 'raw-api',
      rootThreadId: 'raw-api',
    });
    writer.append({
      timestamp: '2026-07-20T00:00:00.000Z',
      url: 'codex://turn',
      method: 'POST',
      mainAgent: true,
      body: { input: [{ role: 'user', content: 'raw test' }] },
      _codexRaw: ref,
    }, resolveAppServerThreadIdentity({ id: 'raw-api', sessionId: 'raw-api' }));
    const file = relative(logDir, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/');
    writeFileSync(join(rawDir, ref.sidecar), [
      JSON.stringify({ stream_id: ref.streamId, seq: 1, value: 'before' }),
      JSON.stringify({ stream_id: ref.streamId, seq: 2, value: 'visible' }),
      JSON.stringify({ stream_id: ref.streamId, seq: 3, value: 'visible-too' }),
      '',
    ].join('\n'));

    const listed = await call('127.0.0.1', port, `/api/raw-sidecars?file=${encodeURIComponent(file)}`);
    assert.equal(listed.status, 200);
    assert.equal(listed.json().sidecars.length, 1);

    const frames = await call('127.0.0.1', port, '/api/raw-sidecar/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, ref }),
    });
    assert.equal(frames.status, 200, frames.body);
    assert.deepEqual(frames.json().frames.map(frame => frame.seq), [2, 3]);

    const denied = await call('127.0.0.1', port, '/api/raw-sidecar/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, ref: { ...ref, streamId: 'other-stream' } }),
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

  it('rejects a runtime LOG_DIR change before readers and writers can split', async t => {
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
    assert.equal(switched.status, 409, switched.body);
    assert.match(switched.body, /requires a CX Viewer restart/);
    assert.equal((await call(lanIp, port, '/api/auth/state', { headers: { Cookie: cookie } })).status, 200);
  });

  it('reports corrupt preferences as a conflict without overwriting their bytes', async () => {
    const path = join(logDir, 'preferences.json');
    const original = readFileSync(path);
    const corrupt = '{"auth":{"enabled":true,"password":"truncated';
    try {
      writeFileSync(path, corrupt);
      const result = await call('127.0.0.1', port, '/api/preferences', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeColor: 'light' }),
      });
      assert.equal(result.status, 409, result.body);
      assert.equal(result.json().code, 'PREFERENCES_UNREADABLE');
      assert.equal(readFileSync(path, 'utf8'), corrupt);
    } finally { writeFileSync(path, original); }
    const recovered = await call('127.0.0.1', port, '/api/preferences', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColor: 'light' }),
    });
    assert.equal(recovered.status, 200, recovered.body);
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).themeColor, 'light');
  });

  it('fails closed for malformed stored passwords over HTTP and WS and refuses destructive saves', async () => {
    const path = join(logDir, 'preferences.json');
    const original = readFileSync(path);
    const remoteHeaders = { Host: `viewer.example:${port}` };
    try {
      const login = await call('127.0.0.1', port, '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'CD5678' }),
      });
      assert.equal(login.status, 200);
      const cookie = login.headers['set-cookie'][0].split(';')[0];
      for (const password of ['!!!', null, 42, '/w==']) {
        const prefs = JSON.parse(original);
        prefs.authByProject[projectDir].password = password;
        const bytes = JSON.stringify(prefs);
        writeFileSync(path, bytes);
        assert.equal((await call(lanIp || '127.0.0.1', port, '/api/auth/state', { headers: remoteHeaders })).status, 403);
        assert.equal((await call('127.0.0.1', port, '/api/auth/state', { headers: { ...remoteHeaders, Cookie: cookie } })).status, 403);
        assert.equal(await canOpenWs(`ws://127.0.0.1:${port}/ws/terminal`, { ...remoteHeaders, Cookie: cookie }), false);
        const state = await call('127.0.0.1', port, '/api/auth/state');
        assert.equal(state.json().passwordUnreadable, true);
        const save = await call('127.0.0.1', port, '/api/auth/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'project', enabled: true, password: 'NEW' }),
        });
        assert.equal(save.status, 409, save.body);
        assert.equal(save.json().code, 'PASSWORD_UNREADABLE');
        assert.equal(readFileSync(path, 'utf8'), bytes);
        const invalidLogin = await call('127.0.0.1', port, '/api/auth/login', {
          method: 'POST', body: JSON.stringify({ password: '' }),
        });
        assert.equal(invalidLogin.status, 409);
      }
      const prefs = JSON.parse(original);
      prefs.authByProject[projectDir].password = '';
      writeFileSync(path, JSON.stringify(prefs));
      assert.equal((await call('127.0.0.1', port, '/api/auth/state', { headers: remoteHeaders })).status, 200);
      assert.equal(await canOpenWs(`ws://127.0.0.1:${port}/ws/terminal`, remoteHeaders), false);
    } finally { writeFileSync(path, original); }
  });

  it('workspace add reports registry corruption and succeeds after explicit restoration', async () => {
    const path = join(logDir, 'workspaces.json');
    const original = existsSync(path) ? readFileSync(path) : null;
    const corrupt = '{"workspaces":[';
    const add = () => call('127.0.0.1', port, '/api/workspaces/add', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectDir }),
    });
    try {
      writeFileSync(path, corrupt);
      const rejected = await add();
      assert.equal(rejected.status, 500, rejected.body);
      assert.match(rejected.json().error, /registry is unreadable/);
      assert.equal(readFileSync(path, 'utf8'), corrupt);
      writeFileSync(path, '{"workspaces":[]}');
      const restored = await add();
      assert.equal(restored.status, 200, restored.body);
      assert.equal(restored.json().workspace.path, projectDir);
      assert.equal(JSON.parse(readFileSync(path, 'utf8')).workspaces.length, 1);
    } finally {
      if (original) writeFileSync(path, original);
      else rmSync(path, { force: true });
    }
  });

  it('file content and raw endpoints reject project-relative links to outside files', { skip: process.platform === 'win32' }, async () => {
    const outside = join(tmpDir, 'outside-fixture.txt');
    const link = join(projectDir, 'outside-link.txt');
    writeFileSync(outside, 'outside fixture');
    symlinkSync(outside, link);
    try {
      assert.equal((await call('127.0.0.1', port, '/api/file-content?path=outside-link.txt')).status, 400);
      assert.equal((await call('127.0.0.1', port, '/api/file-raw?path=outside-link.txt')).status, 400);
      const write = await call('127.0.0.1', port, '/api/file-content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'outside-link.txt', content: 'replace', editorSession: false }),
      });
      assert.equal(write.status, 400, write.body);
      assert.equal(readFileSync(outside, 'utf8'), 'outside fixture');
    } finally { rmSync(link, { force: true }); rmSync(outside, { force: true }); }
  });

  it('content and raw endpoints protect vault, key, backups and hard-link aliases even in editor mode', async () => {
    const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
    const { createCredentialStore } = await import('../lib/credential-store.js');
    const store = createCredentialStore(CREDENTIAL_PATHS.root);
    const existed = existsSync(store.root);
    const backup = join(CREDENTIAL_PATHS.backupRoot, 'fixture', 'preferences.json');
    const alias = join(projectDir, 'key-alias.bin');
    store.set('im-secret', 'file-policy-fixture', 'synthetic secret');
    const key = readFileSync(store.keyPath);
    mkdirSync(dirname(backup), { recursive: true, mode: 0o700 });
    writeFileSync(backup, '{"fixture":"private backup"}', { mode: 0o600 });
    try {
      for (const path of [store.keyPath, store.file, backup]) {
        const query = `path=${encodeURIComponent(path)}&editorSession=true`;
        for (const endpoint of ['file-content', 'file-raw']) {
          assert.equal((await call('127.0.0.1', port, `/api/${endpoint}?${query}`)).status, 403);
        }
        assert.equal((await call('127.0.0.1', port, `/api/file-raw?${query}`, { method: 'HEAD' })).status, 403);
        const write = await call('127.0.0.1', port, '/api/file-content', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, editorSession: true, content: 'replace' }),
        });
        assert.equal(write.status, 403, write.body);
      }
      if (process.platform !== 'win32') {
        linkSync(store.keyPath, alias);
        assert.equal((await call('127.0.0.1', port, '/api/file-content?path=key-alias.bin')).status, 403);
        assert.equal((await call('127.0.0.1', port, '/api/file-raw?path=key-alias.bin')).status, 403);
      }
      assert.deepEqual(readFileSync(store.keyPath), key);
    } finally {
      rmSync(alias, { force: true });
      store.remove('im-secret', 'file-policy-fixture');
      if (!existed) rmSync(store.root, { recursive: true, force: true });
      rmSync(dirname(backup), { recursive: true, force: true });
    }
  });

  it('directory browsers hide private roots and aliases and reject direct private or escaping paths', { skip: process.platform === 'win32' }, async () => {
    const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
    const privateAlias = join(projectDir, 'private-dir-alias');
    const outsideAlias = join(projectDir, 'outside-dir-alias');
    const keyAlias = join(projectDir, 'private-key-alias');
    mkdirSync(CREDENTIAL_PATHS.root, { recursive: true, mode: 0o700 });
    mkdirSync(CREDENTIAL_PATHS.backupRoot, { recursive: true, mode: 0o700 });
    const fixture = join(CREDENTIAL_PATHS.root, 'listing-fixture');
    writeFileSync(fixture, 'synthetic secret', { mode: 0o600 });
    symlinkSync(CREDENTIAL_PATHS.root, privateAlias);
    symlinkSync(tmpDir, outsideAlias);
    linkSync(fixture, keyAlias);
    mkdirSync(join(projectDir, 'ordinary-dir'));
    writeFileSync(join(projectDir, 'ordinary.txt'), 'public');
    try {
      const files = await call('127.0.0.1', port, '/api/files');
      assert.equal(files.status, 200, files.body);
      const names = files.json().map(item => item.name);
      assert.ok(names.includes('ordinary-dir'));
      assert.ok(names.includes('ordinary.txt'));
      assert.ok(!names.includes('private-dir-alias'));
      assert.ok(!names.includes('private-key-alias'));
      assert.equal((await call('127.0.0.1', port, '/api/files?path=private-dir-alias')).status, 400);
      assert.equal((await call('127.0.0.1', port, '/api/files?path=outside-dir-alias')).status, 400);
      const browse = await call('127.0.0.1', port, `/api/browse-dir?path=${encodeURIComponent(tmpDir)}`);
      assert.equal(browse.status, 200, browse.body);
      assert.ok(browse.json().dirs.some(item => item.name === 'project'));
      assert.ok(!browse.json().dirs.some(item => ['private-credentials-v1', 'credential-backups-v1'].includes(item.name)));
      for (const path of [CREDENTIAL_PATHS.root, CREDENTIAL_PATHS.backupRoot, privateAlias]) {
        assert.equal((await call('127.0.0.1', port, `/api/browse-dir?path=${encodeURIComponent(path)}`)).status, 403);
      }
      assert.equal(readFileSync(fixture, 'utf8'), 'synthetic secret');
    } finally {
      for (const path of [privateAlias, outsideAlias, keyAlias, fixture, join(projectDir, 'ordinary.txt')]) rmSync(path, { force: true });
      rmSync(join(projectDir, 'ordinary-dir'), { recursive: true, force: true });
    }
  });

  it('file mutations preserve private trees, their ancestors and link targets', { skip: process.platform === 'win32' }, async () => {
    const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
    const previousProject = process.env.CXV_PROJECT_DIR;
    process.env.CXV_PROJECT_DIR = tmpDir;
    const secret = join(CREDENTIAL_PATHS.root, 'mutation-fixture');
    const alias = join(projectDir, 'private-mutation-alias');
    const target = join(projectDir, 'public-target');
    const link = join(projectDir, 'public-link');
    mkdirSync(CREDENTIAL_PATHS.root, { recursive: true, mode: 0o700 });
    mkdirSync(CREDENTIAL_PATHS.backupRoot, { recursive: true, mode: 0o700 });
    writeFileSync(secret, 'synthetic secret', { mode: 0o600 });
    linkSync(secret, alias);
    writeFileSync(target, 'public');
    symlinkSync(target, link);
    const post = (endpoint, body) => call('127.0.0.1', port, `/api/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    try {
      for (const path of ['.', relative(tmpDir, CREDENTIAL_PATHS.root), relative(tmpDir, CREDENTIAL_PATHS.backupRoot), relative(tmpDir, secret), relative(tmpDir, alias)]) {
        assert.equal((await post('rename-file', { oldPath: path, newName: 'renamed-private' })).status, 403, path);
        assert.equal((await post('move-file', { fromPath: path, toDir: 'project' })).status, 403, path);
        assert.equal((await post('delete-file', { path })).status, 403, path);
      }
      assert.equal((await post('move-file', { fromPath: 'project/public-target', toDir: relative(tmpDir, CREDENTIAL_PATHS.root) })).status, 403);
      assert.equal(readFileSync(secret, 'utf8'), 'synthetic secret');
      assert.equal((await post('rename-file', { oldPath: 'project/public-link', newName: 'renamed-link' })).status, 200);
      assert.equal(lstatSync(join(projectDir, 'renamed-link')).isSymbolicLink(), true);
      assert.equal((await post('move-file', { fromPath: 'project/renamed-link', toDir: '.' })).status, 200);
      assert.equal(lstatSync(join(tmpDir, 'renamed-link')).isSymbolicLink(), true);
      assert.equal((await post('delete-file', { path: 'renamed-link' })).status, 400);
      assert.equal(lstatSync(join(tmpDir, 'renamed-link')).isSymbolicLink(), true);
      assert.equal(readFileSync(target, 'utf8'), 'public');

      const source = join(projectDir, 'copy-source');
      const destination = join(projectDir, 'copy-destination');
      mkdirSync(source);
      mkdirSync(destination);
      linkSync(secret, join(source, 'secret-alias'));
      const rename = fs.renameSync;
      fs.renameSync = (from, to) => {
        if (from === source) throw Object.assign(new Error('test cross-device move'), { code: 'EXDEV' });
        return rename(from, to);
      };
      syncBuiltinESMExports();
      try {
        const copied = await post('move-file', { fromPath: 'project/copy-source', toDir: 'project/copy-destination' });
        assert.equal(copied.status, 403, copied.body);
        assert.equal(readFileSync(join(source, 'secret-alias'), 'utf8'), 'synthetic secret');
        assert.equal(existsSync(join(destination, 'copy-source', 'secret-alias')), false);
      } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
    } finally {
      process.env.CXV_PROJECT_DIR = previousProject;
      for (const path of [secret, alias, target, link, join(projectDir, 'renamed-link'), join(tmpDir, 'renamed-link')]) rmSync(path, { force: true });
      for (const name of ['copy-source', 'copy-destination']) rmSync(join(projectDir, name), { recursive: true, force: true });
    }
  });

  it('directory listing survives git spawn and stdin failures and keeps serving HTTP', async () => {
    const path = join(projectDir, 'stdin-failure-fixture.txt');
    writeFileSync(path, 'public');
    const spawn = childProcess.spawn;
    let intercepted = 0;
    try {
      for (const failure of ['pipe', 'missing']) {
        childProcess.spawn = (command, args, options) => {
          if (command !== 'git' || args[0] !== 'check-ignore') return spawn(command, args, options);
          intercepted++;
          if (failure === 'missing') return spawn('cxv-nonexistent-git-fixture', args, options);
          const child = spawn(process.execPath, ['-e', 'process.exit(1)'], options);
          child.stdin.destroy(Object.assign(new Error('test closed stdin'), { code: 'EPIPE' }));
          return child;
        };
        syncBuiltinESMExports();
        const listing = await call('127.0.0.1', port, '/api/files');
        assert.equal(listing.status, 200, listing.body);
        assert.ok(listing.json().some(item => item.name === 'stdin-failure-fixture.txt'));
        assert.equal((await call('127.0.0.1', port, '/api/auth/state')).status, 200);
      }
      assert.equal(intercepted, 2);
    } finally {
      childProcess.spawn = spawn;
      syncBuiltinESMExports();
      rmSync(path, { force: true });
    }
  });

  it('create and import endpoints protect private destinations before creating or overwriting files', { skip: process.platform === 'win32' }, async () => {
    const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
    const previousProject = process.env.CXV_PROJECT_DIR;
    process.env.CXV_PROJECT_DIR = tmpDir;
    const outside = mkdtempSync(join(tmpdir(), 'cxv-import-outside-'));
    const alias = join(projectDir, 'import-outside');
    symlinkSync(outside, alias);
    const post = (endpoint, body) => call('127.0.0.1', port, `/api/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const upload = (dir, name = 'fixture.txt') => call('127.0.0.1', port, `/api/import-file?dir=${encodeURIComponent(dir)}`, {
      method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=cxv-fixture' },
      body: `--cxv-fixture\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\n\r\npublic fixture\r\n--cxv-fixture--\r\n`,
    });
    try {
      for (const path of [CREDENTIAL_PATHS.root, CREDENTIAL_PATHS.backupRoot]) {
        const dir = relative(tmpDir, path);
        assert.equal((await post('create-file', { dirPath: dir, name: 'new-fixture' })).status, 403);
        assert.equal((await post('create-dir', { dirPath: dir, name: 'new-fixture' })).status, 403);
        assert.equal((await upload(dir + '/new-fixture')).status, 403);
        assert.equal(existsSync(join(path, 'new-fixture')), false);
      }
      assert.equal((await upload('project/import-outside/uncreated')).status, 400);
      assert.equal(existsSync(join(outside, 'uncreated')), false);
      assert.equal((await post('create-dir', { dirPath: 'project', name: 'import-public' })).status, 200);
      assert.equal((await post('create-file', { dirPath: 'project/import-public', name: 'empty.txt' })).status, 200);
      assert.equal((await upload('project/import-public')).status, 200);
      const duplicate = await upload('project/import-public');
      assert.equal(duplicate.status, 200, duplicate.body);
      assert.equal(duplicate.json().name, 'fixture-1.txt');
      assert.equal(readFileSync(join(projectDir, 'import-public/fixture.txt'), 'utf8'), 'public fixture');
      const racedPath = join(realpathSync(projectDir), 'import-public/raced.txt');
      const write = fs.writeFileSync;
      fs.writeFileSync = (path, ...args) => {
        if (path === racedPath) write(path, 'concurrent file', { flag: 'wx' });
        return write(path, ...args);
      };
      syncBuiltinESMExports();
      try {
        assert.equal((await upload('project/import-public', 'raced.txt')).status, 409);
        assert.equal(readFileSync(racedPath, 'utf8'), 'concurrent file');
      } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
    } finally {
      process.env.CXV_PROJECT_DIR = previousProject;
      rmSync(alias, { force: true });
      rmSync(outside, { recursive: true, force: true });
      rmSync(join(projectDir, 'import-public'), { recursive: true, force: true });
    }
  });

  it('legacy credential configurations and known profile backups are private through HTTP file tools', async () => {
    const { getPreferencesPath, getDingTalkImConfigPath } = await import('../lib/config-paths.js');
    const paths = [getPreferencesPath(), getDingTalkImConfigPath(), process.env.CXV_PROXY_PROFILE_PATH, `${process.env.CXV_PROXY_PROFILE_PATH}.bak`];
    const originals = paths.map(path => existsSync(path) ? readFileSync(path) : null);
    try {
      for (const path of paths) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, '{"fixture":"synthetic legacy secret"}');
        const query = `path=${encodeURIComponent(path)}&editorSession=true`;
        for (const endpoint of ['file-content', 'file-raw']) {
          const response = await call('127.0.0.1', port, `/api/${endpoint}?${query}`);
          assert.equal(response.status, 403, response.body);
          assert.ok(!response.body.includes('synthetic legacy secret'));
        }
        const write = await call('127.0.0.1', port, '/api/file-content', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, editorSession: true, content: 'replace' }),
        });
        assert.equal(write.status, 403, write.body);
        assert.equal(readFileSync(path, 'utf8'), '{"fixture":"synthetic legacy secret"}');
      }
      assert.equal((await call('127.0.0.1', port, '/api/preferences')).status, 200);
      assert.equal((await call('127.0.0.1', port, '/api/auth/state')).status, 200);
    } finally {
      paths.forEach((path, index) => originals[index] ? writeFileSync(path, originals[index]) : rmSync(path, { force: true }));
    }
  });

  it('static assets, plugin sources and Markdown endpoints cannot expose private aliases', { skip: process.platform === 'win32' }, async () => {
    const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
    const { getPluginsDir } = await import('../lib/plugin-loader.js');
    const secret = join(CREDENTIAL_PATHS.root, 'asset-fixture');
    const name = `cxv-private-boundary-${process.pid}`;
    const staticPath = join(process.cwd(), 'dist', `${name}.txt`);
    const publicPath = join(process.cwd(), 'dist', `${name}-public.txt`);
    const conceptPath = join(process.cwd(), 'concepts', 'en', `${name}.md`);
    const pluginPath = join(getPluginsDir(), `${name}.mjs`);
    const agentsPath = join(projectDir, 'AGENTS.md');
    const aliases = [staticPath, conceptPath, pluginPath, agentsPath];
    for (const path of aliases) assert.equal(existsSync(path), false, path);
    mkdirSync(CREDENTIAL_PATHS.root, { recursive: true, mode: 0o700 });
    writeFileSync(secret, 'synthetic asset secret', { mode: 0o600 });
    for (const path of aliases) mkdirSync(dirname(path), { recursive: true });
    symlinkSync(secret, staticPath);
    linkSync(secret, conceptPath);
    linkSync(secret, pluginPath);
    symlinkSync(secret, agentsPath);
    writeFileSync(publicPath, 'ordinary static file');
    try {
      for (const endpoint of [`/${name}.txt`, `/api/concept?lang=en&doc=${name}`, `/api/plugins/module?file=${name}.mjs`]) {
        const response = await call('127.0.0.1', port, endpoint);
        assert.equal(response.status, 403, `${endpoint}: ${response.body}`);
        assert.ok(!response.body.includes('synthetic asset secret'));
      }
      const entries = await call('127.0.0.1', port, '/api/codex-md');
      assert.equal(entries.status, 200, entries.body);
      assert.ok(!entries.json().entries.some(item => item.tail.endsWith('asset-fixture')));
      const ordinary = await call('127.0.0.1', port, `/${name}-public.txt`);
      assert.equal(ordinary.status, 200);
      assert.equal(ordinary.body, 'ordinary static file');
      assert.equal(readFileSync(secret, 'utf8'), 'synthetic asset secret');
    } finally {
      for (const path of [...aliases, publicPath, secret]) rmSync(path, { force: true });
    }
  });

  it('aggregate project stats omit cache files that alias private data', { skip: process.platform === 'win32' }, async () => {
    const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
    const secret = join(CREDENTIAL_PATHS.root, 'stats-fixture');
    const cacheDir = join(logDir, 'v2-stats');
    const alias = join(cacheDir, 'private-fixture.json');
    const ordinary = join(cacheDir, 'ordinary-fixture.json');
    mkdirSync(CREDENTIAL_PATHS.root, { recursive: true, mode: 0o700 });
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(secret, '{"credential":"synthetic stats secret"}', { mode: 0o600 });
    writeFileSync(ordinary, '{"count":1}');
    linkSync(secret, alias);
    try {
      const response = await call('127.0.0.1', port, '/api/all-project-stats');
      assert.equal(response.status, 200, response.body);
      assert.deepEqual(response.json()['ordinary-fixture'], { count: 1 });
      assert.equal(response.json()['private-fixture'], undefined);
      assert.ok(!response.body.includes('synthetic stats secret'));
    } finally { for (const path of [alias, ordinary, secret]) rmSync(path, { force: true }); }
  });

  it('encrypted auth works through HTTP and rejects remote access when its master key is lost', async () => {
    const auth = await import('../lib/auth.js');
    const { CREDENTIAL_PATHS } = await import('../lib/credential-paths.js');
    const { createCredentialStore } = await import('../lib/credential-store.js');
    const store = createCredentialStore(CREDENTIAL_PATHS.root);
    const paths = [auth.getAuthPrefsPath(), store.file, store.keyPath];
    const originals = paths.map(path => existsSync(path) ? readFileSync(path) : null);
    try {
      writeFileSync(paths[0], JSON.stringify({ auth: { enabled: true, password: Buffer.from('AB1234').toString('base64'), revision: 1 } }));
      const migration = auth.migrateAuthCredentials({ confirmStopped: true });
      assert.equal(migration.status, 'migrated');
      const passwordRef = JSON.parse(readFileSync(paths[0], 'utf8')).auth.passwordRef;
      const state = await call('127.0.0.1', port, '/api/auth/state');
      assert.equal(state.status, 200, state.body);
      assert.equal(state.json().password, 'AB1234');
      assert.ok(!state.body.includes(passwordRef));
      const changed = await call('127.0.0.1', port, '/api/auth/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'global', enabled: true, password: 'CD5678' }),
      });
      assert.equal(changed.status, 200, changed.body);
      const stored = JSON.parse(readFileSync(paths[0], 'utf8'));
      assert.equal(Object.hasOwn(stored.auth, 'password'), false);
      assert.equal(auth.loadAuthConfig().password, 'CD5678');
      const login = await call('127.0.0.1', port, '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'CD5678' }),
      });
      assert.equal(login.status, 200, login.body);
      const cookie = login.headers['set-cookie'][0].split(';')[0];
      const migrated = readFileSync(paths[0]);
      for (const replacement of [JSON.stringify({ auth: { enabled: true, password: '' } }), null]) {
        if (replacement === null) rmSync(paths[0]);
        else writeFileSync(paths[0], replacement);
        assert.equal((await call('127.0.0.1', port, '/api/auth/state')).json().passwordUnreadable, true);
        assert.equal((await call('127.0.0.1', port, '/api/auth/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'global', enabled: true, password: 'REPLACE' }),
        })).status, 409);
        if (lanIp) {
          assert.equal((await call(lanIp, port, '/api/auth/state', { headers: { Cookie: cookie } })).status, 403);
          assert.equal(await canOpenWs(`ws://${lanIp}:${port}/ws/terminal`, { Origin: `http://${lanIp}:${port}`, Cookie: cookie }), false);
        }
        if (replacement === null) assert.equal(existsSync(paths[0]), false);
        else assert.equal(readFileSync(paths[0], 'utf8'), replacement);
      }
      writeFileSync(paths[0], migrated);
      rmSync(store.keyPath);
      const local = await call('127.0.0.1', port, '/api/auth/state');
      assert.equal(local.json().passwordUnreadable, true);
      assert.equal((await call('127.0.0.1', port, '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'CD5678' }),
      })).status, 409);
      if (lanIp) {
        assert.equal((await call(lanIp, port, '/api/auth/state', { headers: { Cookie: cookie } })).status, 403);
        assert.equal(await canOpenWs(`ws://${lanIp}:${port}/ws/terminal`, { Origin: `http://${lanIp}:${port}`, Cookie: cookie }), false);
      }
      assert.equal(existsSync(store.keyPath), false);
    } finally {
      paths.forEach((path, index) => originals[index] ? writeFileSync(path, originals[index], { mode: 0o600 }) : rmSync(path, { force: true }));
    }
  });

  it('IM HTTP status and saves report unreadable configuration without leaking or overwriting it', async () => {
    const { getDingTalkImConfigPath } = await import('../lib/config-paths.js');
    const path = getDingTalkImConfigPath();
    const original = existsSync(path) ? readFileSync(path) : null;
    const corrupt = '{"appSecret":"synthetic-im-private-fragment';
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    try {
      writeFileSync(path, corrupt, { mode: 0o600 });
      const state = await call('127.0.0.1', port, '/api/im/dingtalk/status');
      assert.equal(state.status, 409, state.body);
      assert.ok(!state.body.includes('synthetic-im-private-fragment'));
      const saved = await call('127.0.0.1', port, '/api/im/dingtalk/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey: 'replacement', applyProcess: false }),
      });
      assert.equal(saved.status, 409, saved.body);
      assert.equal(readFileSync(path, 'utf8'), corrupt);
      assert.equal(existsSync(`${path}.lock`), false);
    } finally { if (original) writeFileSync(path, original); else rmSync(path, { force: true }); }
    assert.equal((await call('127.0.0.1', port, '/api/im/dingtalk/status')).status, 200);
  });

  it('encrypted IM configuration stays masked over HTTP and refuses saves after key loss', async () => {
    const im = await import('../lib/dingtalk-im-config.js');
    const { CREDENTIAL_PATHS } = await import('../lib/credential-paths.js');
    const { createCredentialStore } = await import('../lib/credential-store.js');
    const store = createCredentialStore(CREDENTIAL_PATHS.root);
    const path = im.getDingTalkImConfigPath();
    const files = [path, store.file, store.keyPath];
    const originals = files.map(file => existsSync(file) ? readFileSync(file) : null);
    try {
      im.atomicWritePrivateFile(path, JSON.stringify({ version: 1, enabled: false, appKey: 'synthetic-app',
        appSecret: 'synthetic-im-secret' }));
      im.migrateDingTalkCredentials({ confirmStopped: true });
      const state = await call('127.0.0.1', port, '/api/im/dingtalk/status');
      assert.equal(state.status, 200, state.body);
      assert.equal(state.json().hasSecret, true);
      assert.ok(!state.body.includes('synthetic-im-secret'));
      assert.equal(Object.hasOwn(state.json(), 'appSecretRef'), false);
      const save = () => call('127.0.0.1', port, '/api/im/dingtalk/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appSecret: 'next-im-secret', applyProcess: false }),
      });
      const saved = await save();
      assert.equal(saved.status, 200, saved.body);
      assert.ok(!saved.body.includes('next-im-secret'));
      assert.equal(im.loadDingTalkImConfig().appSecret, 'next-im-secret');
      assert.equal(Object.hasOwn(JSON.parse(readFileSync(path, 'utf8')), 'appSecret'), false);
      const migrated = readFileSync(path);
      for (const replacement of [JSON.stringify({ version: 1, enabled: false, appSecret: 'legacy-secret' }), null]) {
        if (replacement === null) rmSync(path);
        else writeFileSync(path, replacement);
        const status = await call('127.0.0.1', port, '/api/im/dingtalk/status');
        assert.equal(status.status, 409);
        assert.ok(!status.body.includes('legacy-secret'));
        assert.equal((await save()).status, 409);
        if (replacement === null) assert.equal(existsSync(path), false);
        else assert.equal(readFileSync(path, 'utf8'), replacement);
      }
      writeFileSync(path, migrated);
      rmSync(store.keyPath);
      const bytes = readFileSync(path);
      assert.equal((await call('127.0.0.1', port, '/api/im/dingtalk/status')).status, 409);
      assert.equal((await save()).status, 409);
      assert.deepEqual(readFileSync(path), bytes);
      assert.equal(existsSync(store.keyPath), false);
    } finally {
      files.forEach((file, index) => originals[index] ? writeFileSync(file, originals[index], { mode: 0o600 }) : rmSync(file, { force: true }));
    }
  });
});
