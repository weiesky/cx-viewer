import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import fs, { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, linkSync, realpathSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'cxv-target-http-'));
const a = join(root, 'one/same'), b = join(root, 'two/same'), config = join(root, '.codex');
for (const dir of [a, b, config]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: config, CXV_PROJECT_DIR: a,
  CXV_LOG_DIR: join(root, 'viewer-state'), CXV_PROXY_PROFILE_PATH: join(root, 'profile.json'),
  CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1',
  CXV_CLI_MODE: '1', CXV_START_PORT: '20500', CXV_MAX_PORT: '20509' });
for (const [dir, label] of [[a, 'A'], [b, 'B']]) {
  writeFileSync(join(dir, 'AGENTS.md'), label);
  writeFileSync(join(dir, label + '.txt'), label);
  mkdirSync(join(dir, 'nested'));
}
writeFileSync(join(config, 'AGENTS.md'), 'global guidance');
writeFileSync(join(config, 'auth.json'), 'synthetic credential');
mkdirSync(join(config, 'sessions')); writeFileSync(join(config, 'sessions/rollout.jsonl'), 'synthetic history');
linkSync(join(config, 'sessions/rollout.jsonl'), join(config, 'history-alias.txt'));
symlinkSync(join(root, 'outside'), join(a, 'escape'));
const { MAX_POST_BODY } = await import('../lib/constants.js');
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
let port, infoA, infoB;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(a);
  sdk.setSdkLaunchConfig({ codexPath: process.execPath });
  infoA = sdk.initSdkSession(a, 'same', { codexPath: process.execPath });
  infoB = sdk.launchSdkSession(b, 'same');
  process.env.CXV_ALLOWED_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]', 'remote.example.test', ...server.getAllLocalIps()].join(',');
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
const id = file => Buffer.from(realpathSync(file)).toString('base64url');
const target = (file, instance = infoA.instanceKey, extra = {}) => '/api/target-files?' + new URLSearchParams({ kind: 'codex-md', id: id(file), instance, ...extra });
function call(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, json: () => JSON.parse(text), text }));
    }); req.on('error', reject); req.end(body);
  });
}
const remote = { Host: 'remote.example.test' };
const jsonPost = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('native guidance identities select exact same-named workspace, without exposing the navigation root', async () => {
  for (const [dir, info, name] of [[a, infoA, 'A.txt'], [b, infoB, 'B.txt']]) {
    const res = await call(target(join(dir, 'AGENTS.md'), info.instanceKey)); assert.equal(res.status, 200, res.text);
    const data = res.json(); assert.equal(data.rootKind, 'project'); assert.ok(!Object.hasOwn(data, 'rootReal'));
    assert.ok(data.targetEntries.some(entry => entry.name === name));
    assert.deepEqual(data.ancestors.map(entry => entry.path), ['']);
  }
  assert.equal((await call(target(join(a, 'AGENTS.md'), infoB.instanceKey))).status, 404);
  assert.equal((await call(target(join(a, 'AGENTS.md'), 'stale'))).status, 404);
});

test('home navigation filters native credentials/history/aliases and enforces relative path guards', async () => {
  const path = target(join(config, 'AGENTS.md'));
  const res = await call(path); assert.equal(res.status, 200, res.text);
  const data = res.json(); assert.equal(data.rootKind, 'home'); assert.equal(data.targetPath, '.codex');
  for (const denied of ['auth.json', 'sessions', 'history-alias.txt']) assert.ok(!data.targetEntries.some(entry => entry.name === denied));
  for (const raw of ['../one', '/etc', 'nested//bad', 'a\\b', 'a/./b', Array(34).fill('a').join('/')]) {
    assert.equal((await call(path + '&path=' + encodeURIComponent(raw))).status, 400, raw);
  }
  assert.equal((await call(path + '&path=.codex/sessions')).status, 403);
  assert.equal((await call('/api/target-files?kind=codex-md&id=invalid!')).status, 400);
});

test('native .agents skill ancestors support navigation without granting sibling content or parent writes', async () => {
  const user = join(root, '.agents/skills/ancestor-skill'); mkdirSync(user, { recursive: true });
  writeFileSync(join(user, 'SKILL.md'), '---\nname: ancestor-skill\n---\n');
  writeFileSync(join(user, 'note.txt'), 'user bytes');
  writeFileSync(join(root, '.agents/private-sibling.txt'), 'sibling canary');
  const params = new URLSearchParams({ kind: 'skill', source: 'user', targetPath: user, instance: infoA.instanceKey });
  const base = '/api/target-files?' + params;
  const initial = await call(base); assert.equal(initial.status, 200, initial.text);
  assert.equal(initial.json().entries.find(entry => entry.name === '.agents')?.type, 'directory');
  const parent = await call(base + '&path=.agents'); assert.equal(parent.status, 200, parent.text);
  assert.ok(parent.json().entries.some(entry => entry.name === 'skills'));
  assert.ok(!parent.json().entries.some(entry => entry.name === 'private-sibling.txt'));
  assert.equal((await call(base + '&path=.agents/unregistered')).status, 404);
  const content = path => '/api/file-content?' + params + '&path=' + encodeURIComponent(path);
  assert.equal((await call(content('.agents/private-sibling.txt'))).status, 403);
  assert.equal((await call(content('.agents/skills/ancestor-skill/note.txt'))).json().content, 'user bytes');
  assert.equal((await call('/api/target-create-file?' + params, jsonPost({ dirPath: '.agents', name: 'denied.txt' }))).status, 403);
  assert.equal(existsSync(join(root, '.agents/denied.txt')), false);
  assert.equal(readFileSync(join(root, '.agents/private-sibling.txt'), 'utf8'), 'sibling canary');
});

test('effective URL token grants target access without remote authentication settings rights', async () => {
  const path = target(join(config, 'AGENTS.md'));
  assert.equal((await call(path, { headers: remote })).status, 403);
  const tokenPath = path + '&token=' + encodeURIComponent(server.getAccessToken());
  assert.equal((await call(tokenPath, { headers: remote })).status, 200);
  assert.equal((await call(path + '&token=invalid', { headers: remote })).status, 403);
  const state = await call('/api/auth/state?token=' + encodeURIComponent(server.getAccessToken()), { headers: remote });
  assert.equal(state.json().isAdmin, false); assert.equal(state.json().password, null);
  assert.equal((await call('/api/auth/config?token=' + encodeURIComponent(server.getAccessToken()), {
    ...jsonPost({ enabled: false }), headers: { ...remote, 'Content-Type': 'application/json' },
  })).status, 403);
});

test('target administrator gate rejects hostile Origin and Origin-less cross-site even with valid credentials', async () => {
  const path = target(join(config, 'AGENTS.md')) + '&token=' + encodeURIComponent(server.getAccessToken());
  assert.equal((await call(path, { headers: { ...remote, Origin: 'https://hostile.example' } })).status, 403);
  assert.equal((await call(path, { headers: { ...remote, 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await call(path, { headers: { ...remote, Origin: 'http://remote.example.test', 'Sec-Fetch-Site': 'same-origin' } })).status, 200);
});

test('valid login session works for target files; forged/revoked sessions and passwordless allow never become administrators', async () => {
  const path = target(join(config, 'AGENTS.md'));
  assert.equal((await call('/api/auth/config', jsonPost({ enabled: true, password: 'AB1234' }))).status, 200);
  const login = await call('/api/auth/login', jsonPost({ password: 'AB1234' })); assert.equal(login.status, 200);
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  assert.equal((await call(path, { headers: { ...remote, Cookie: cookie } })).status, 200);
  assert.notEqual((await call(path, { headers: { ...remote, Cookie: 'cxv_auth=forged' } })).status, 200);
  assert.equal((await call('/api/auth/logout', { method: 'POST', headers: { ...remote, Cookie: cookie } })).status, 200);
  assert.notEqual((await call(path, { headers: { ...remote, Cookie: cookie } })).status, 200);
  assert.equal((await call('/api/auth/config', jsonPost({ enabled: true, password: '' }))).status, 200);
  assert.equal((await call('/api/cli-mode', { headers: remote })).status, 200);
  assert.equal((await call(path, { headers: remote })).status, 403);
});

const fileUrl = (endpoint, file, { guidance = join(config, 'AGENTS.md'), instance = infoA.instanceKey, ...extra } = {}) =>
  '/api/' + endpoint + '?' + new URLSearchParams({ kind: 'codex-md', id: id(guidance), instance, path: file, ...extra });

test('target content/raw/download read and HEAD retain exact bytes, rooted paths and remote authorization', async () => {
  writeFileSync(join(config, 'public.txt'), 'target bytes 中文');
  const token = server.getAccessToken();
  for (const endpoint of ['file-content', 'file-raw', 'download-file']) {
    const url = fileUrl(endpoint, join(config, 'public.txt'));
    assert.equal((await call(url, { headers: remote })).status, 403);
    const res = await call(url + '&token=' + token, { headers: remote }); assert.equal(res.status, 200, res.text);
    assert.equal(endpoint === 'file-content' ? res.json().content : res.text, 'target bytes 中文');
    assert.equal((await call(url, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    for (const denied of ['auth.json', 'sessions/rollout.jsonl', 'history-alias.txt']) {
      const deniedRes = await call(fileUrl(endpoint, join(config, denied))); assert.equal(deniedRes.status, 403, deniedRes.text);
      assert.ok(!deniedRes.text.includes('synthetic history'));
    }
    if (endpoint !== 'file-content') {
      const head = await call(url, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.text, '');
    }
  }
});

test('external editor claims are administrator/allowlist bounded and target identity cannot be overridden', async () => {
  const path = join(config, 'public.txt');
  writeFileSync(join(root, 'unlisted.txt'), 'outside');
  for (const endpoint of ['file-content', 'file-raw']) {
    const plain = '/api/' + endpoint + '?' + new URLSearchParams({ path, editorSession: 'true' });
    assert.equal((await call(plain, { headers: remote })).status, 403);
    assert.equal((await call(plain)).status, 200);
    assert.equal((await call('/api/' + endpoint + '?' + new URLSearchParams({ path: join(root, 'unlisted.txt'), editorSession: 'true' }))).status, 403);
    assert.equal((await call(fileUrl(endpoint, path, { guidance: join(a, 'AGENTS.md'), editorSession: 'true' }))).status, 403);
  }
});

test('target save creates missing nested files, preserves binary/UTF16 bytes and rejects private or out-of-root writes', async () => {
  const url = fileUrl('file-content', 'unused');
  const relative = '.codex/new/nested/created.txt';
  assert.equal((await call(url, jsonPost({ path: relative, content: 'new target bytes' }))).status, 200);
  assert.equal(readFileSync(join(root, relative), 'utf8'), 'new target bytes');
  for (const [name, bytes] of [['binary.txt', Buffer.from([0, 255, 1])], ['utf16.txt', Buffer.concat([Buffer.from([255, 254]), Buffer.from('原文', 'utf16le')])]]) {
    const path = join(config, name); writeFileSync(path, bytes);
    assert.equal((await call(url, jsonPost({ path, content: 'replace' }))).status, 415);
    assert.deepEqual(readFileSync(path), bytes);
  }
  for (const name of ['auth.json', 'auth.json.new', 'config.toml.new', 'sessions/new.jsonl', 'state_99.sqlite-wal']) {
    const path = join(config, name), existed = existsSync(path), before = existed && readFileSync(path);
    assert.equal((await call(url, jsonPost({ path, content: 'replace', editorSession: true }))).status, 403, name);
    if (existed) assert.deepEqual(readFileSync(path), before); else assert.equal(existsSync(path), false);
  }
  const outside = join(config, 'must-not-exist.txt');
  assert.equal((await call(fileUrl('file-content', '', { guidance: join(a, 'AGENTS.md') }), jsonPost({ path: outside, content: 'replace', editorSession: true }))).status, 403);
  assert.equal(existsSync(outside), false);
  assert.equal((await call(url, { ...jsonPost({ path: join(config, 'public.txt'), content: 'replace' }), headers: { ...remote, 'Content-Type': 'application/json' } })).status, 403);
});

test('descriptor substitution is rejected before target reads or truncation, including native history', async () => {
  const publicPath = realpathSync(join(config, 'public.txt')), history = join(config, 'sessions/rollout.jsonl');
  const original = fs.openSync;
  fs.openSync = (path, ...args) => original(path === publicPath ? history : path, ...args); syncBuiltinESMExports();
  try {
    for (const endpoint of ['file-content', 'file-raw', 'download-file']) assert.equal((await call(fileUrl(endpoint, publicPath))).status, 403);
    assert.equal((await call(fileUrl('file-content', ''), jsonPost({ path: publicPath, content: 'truncate' }))).status, 403);
    assert.equal(readFileSync(history, 'utf8'), 'synthetic history');
  } finally { fs.openSync = original; syncBuiltinESMExports(); }
});

test('a delayed target save keeps its query-owned A workspace while B is active and the body claims B', async () => {
  let pending;
  const finished = new Promise((resolve, reject) => {
    pending = request({ hostname: '127.0.0.1', port,
      path: fileUrl('file-content', '', { guidance: join(a, 'AGENTS.md') }),
      method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let text = ''; res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, text }));
    }); pending.on('error', reject);
    pending.write('{"path":"late.txt","content":"A delayed save",');
  });
  try {
    const other = await call(fileUrl('file-content', 'B.txt', { guidance: join(b, 'AGENTS.md'), instance: infoB.instanceKey }));
    assert.equal(other.status, 200); assert.equal(other.json().content, 'B');
    pending.end('"instance":' + JSON.stringify(infoB.instanceKey) + ',"project":"same"}');
    const result = await finished; assert.equal(result.status, 200, result.text);
    assert.equal(readFileSync(join(a, 'late.txt'), 'utf8'), 'A delayed save');
    assert.equal(existsSync(join(b, 'late.txt')), false);
  } finally { pending.destroy(); }
});

const mutation = (name, body, options = {}) => call(fileUrl('target-' + name, '', options), jsonPost(body));

test('target context mutations operate across the original navigation root with server-owned identity', async () => {
  assert.equal((await mutation('create-dir', { dirPath: '.codex', name: 'menu-fixture' })).status, 200);
  const rel = '.codex/menu-fixture';
  assert.equal((await mutation('create-file', { dirPath: rel, name: 'created.txt' })).status, 200);
  writeFileSync(join(root, rel, 'created.txt'), 'menu bytes');
  assert.equal((await mutation('create-file', { dirPath: rel, name: 'created.txt' })).status, 409);
  const rename = await mutation('rename-file', { oldPath: rel + '/created.txt', newName: 'renamed.txt' });
  assert.equal(rename.status, 200, rename.text); assert.equal(rename.json().newPath, rel + '/renamed.txt');
  assert.equal(readFileSync(join(root, rel, 'renamed.txt'), 'utf8'), 'menu bytes');
  assert.equal((await mutation('create-file', { dirPath: '.codex', name: 'sibling.txt' })).status, 200, 'navigation root, not just a selected child');
  const resolved = await mutation('resolve-path', { path: rel + '/renamed.txt' });
  assert.equal(resolved.status, 200); assert.equal(resolved.json().fullPath, join(realpathSync(root), rel, 'renamed.txt'));
  assert.equal((await mutation('delete-file', { path: rel })).status, 200); assert.equal(existsSync(join(root, rel)), false);
});

test('mutations reject native owners, protected descendants, symlinks, root operations and invalid names without data loss', async () => {
  for (const name of ['delete-file', 'rename-file']) {
    for (const path of ['', '.codex', '.codex/auth.json', '.codex/sessions', '.codex/history-alias.txt']) {
      const res = await mutation(name, { path, oldPath: path, newName: 'escaped' });
      assert.ok(res.status === 400 || res.status === 403, res.text);
    }
  }
  mkdirSync(join(config, 'protected-children')); writeFileSync(join(config, 'protected-children/.env'), 'sensitive child');
  for (const name of ['delete-file', 'rename-file']) {
    const res = await mutation(name, { path: '.codex/protected-children', oldPath: '.codex/protected-children', newName: 'exposed' });
    assert.equal(res.status, 403); assert.equal(readFileSync(join(config, 'protected-children/.env'), 'utf8'), 'sensitive child');
  }
  symlinkSync(join(config, 'public.txt'), join(config, 'link.txt'));
  symlinkSync(join(root, 'missing-canary'), join(config, 'dangling.txt'));
  for (const path of ['link.txt', 'dangling.txt']) {
    assert.notEqual((await mutation('rename-file', { oldPath: '.codex/' + path, newName: 'renamed-link' })).status, 200);
    assert.notEqual((await mutation('delete-file', { path: '.codex/' + path })).status, 200);
  }
  assert.equal((await mutation('create-file', { dirPath: '.codex', name: 'dangling.txt' })).status, 403);
  assert.equal(existsSync(join(root, 'missing-canary')), false);
  for (const name of [null, 12, {}, '..', '.git', '../bad', 'bad\\name', 'bad\0name']) {
    assert.equal((await mutation('create-file', { dirPath: '.codex', name })).status, 400);
  }
  assert.equal(readFileSync(join(config, 'auth.json'), 'utf8'), 'synthetic credential');
  assert.equal(readFileSync(join(config, 'sessions/rollout.jsonl'), 'utf8'), 'synthetic history');
});

test('target subtree inspection fails closed when unreadable, and remote/cross-site rejection precedes body parsing', async () => {
  const dir = join(config, 'unreadable-fixture'); mkdirSync(dir);
  const original = fs.readdirSync;
  fs.readdirSync = (path, ...args) => path === realpathSync(dir) ? (() => { throw Object.assign(new Error('fixture'), { code: 'EACCES' }); })() : original(path, ...args);
  syncBuiltinESMExports();
  try { assert.equal((await mutation('delete-file', { path: '.codex/unreadable-fixture' })).status, 403); assert.equal(existsSync(dir), true); }
  finally { fs.readdirSync = original; syncBuiltinESMExports(); }
  const url = fileUrl('target-create-file', '');
  for (const headers of [remote, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await call(url, { method: 'POST', headers, body: '{malformed' })).status, 403);
  }
  assert.equal((await call(url, { method: 'POST', body: '{malformed' })).status, 400);
  assert.equal((await call(url, { method: 'POST', body: 'x'.repeat(MAX_POST_BODY + 1) })).status, 413);
  const tokenUrl = url + '&token=' + encodeURIComponent(server.getAccessToken());
  const res = await call(tokenUrl, { ...jsonPost({ dirPath: '.codex', name: 'remote-created.txt' }), headers: { ...remote, 'Content-Type': 'application/json' } });
  assert.equal(res.status, 200); assert.equal(existsSync(join(config, 'remote-created.txt')), true);
});

test('OS target actions use the validated navigation path and argv spawning, without opening real applications', async () => {
  const previousExec = childProcess.execFile, previousSpawn = childProcess.spawn, calls = [];
  childProcess.execFile = (cmd, args, callback) => { calls.push({ cmd, args }); callback?.(); };
  childProcess.spawn = (cmd, args, options) => { calls.push({ cmd, args, options }); const child = new EventEmitter(); child.unref = () => {}; return child; };
  syncBuiltinESMExports();
  try {
    assert.equal((await mutation('reveal-file', { path: '.codex/public.txt' })).status, 200);
    assert.equal((await mutation('open-terminal', { path: '.codex/public.txt' })).status, 200);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].args.some(arg => arg.includes('public.txt')) || process.platform === 'linux');
    assert.ok(calls[1].args.includes(realpathSync(config)) || calls[1].options?.cwd === realpathSync(config) || process.platform === 'linux');
    assert.ok(calls.every(call => call.options?.shell !== true));
  } finally { childProcess.execFile = previousExec; childProcess.spawn = previousSpawn; syncBuiltinESMExports(); }
});

test('target HTML path scope survives relative resource resolution and rejects conflicting identities', async () => {
  const dir = join(config, 'report'); mkdirSync(dir);
  writeFileSync(join(dir, 'index.html'), '<link rel="stylesheet" href="style.css">'); writeFileSync(join(dir, 'style.css'), 'body{color:teal}');
  const identity = encodeURIComponent(JSON.stringify({ kind: 'codex-md', id: id(join(config, 'AGENTS.md')) }));
  const raw = `/api/file-raw/target/${identity}/same/${encodeURIComponent(infoA.instanceKey)}/` + join(realpathSync(config), 'report/index.html').split('/').map(encodeURIComponent).join('/');
  const page = await call(raw); assert.equal(page.status, 200, page.text); assert.match(page.headers['content-security-policy'], /sandbox allow-scripts/);
  const style = new URL('style.css', 'http://fixture' + raw); assert.equal((await call(style.pathname)).text, 'body{color:teal}');
  assert.equal((await call(raw + '&id=forged')).status, 404);
  assert.equal((await call(raw + '?id=forged')).status, 400);
  assert.equal((await call(raw, { headers: remote })).status, 403);
});

test('sandbox resource proof is raw-read-only, bound to target/view and invalidated with its granting login session', async () => {
  assert.equal((await call('/api/auth/config', jsonPost({ enabled: true, password: 'AB1234' }))).status, 200);
  const login = await call('/api/auth/login', jsonPost({ password: 'AB1234' }));
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  const listing = await call(target(join(config, 'AGENTS.md')), { headers: { ...remote, Cookie: cookie } });
  assert.equal(listing.status, 200);
  const { previewToken, previewSession } = listing.json(); assert.ok(previewToken); assert.ok(previewSession);
  assert.ok(!JSON.stringify(listing.json()).includes(cookie.split('=')[1]), 'never return the granting login cookie');
  const descriptor = { kind: 'codex-md', id: id(join(config, 'AGENTS.md')), previewToken, previewSession };
  const raw = `/api/file-raw/target/${encodeURIComponent(JSON.stringify(descriptor))}/same/${encodeURIComponent(infoA.instanceKey)}/`
    + join(realpathSync(config), 'report/style.css').split('/').map(encodeURIComponent).join('/');
  const headers = { ...remote, Origin: 'null', 'Sec-Fetch-Site': 'cross-site' };
  const resource = await call(raw, { headers }); assert.equal(resource.status, 200, resource.text);
  assert.equal(resource.headers['access-control-allow-origin'], 'null'); assert.equal(resource.text, 'body{color:teal}');
  assert.equal((await call(raw, { headers: { ...headers, Origin: 'https://hostile.example' } })).status, 403);
  assert.equal((await call(raw.replace(encodeURIComponent(infoA.instanceKey), encodeURIComponent(infoB.instanceKey)), { headers })).status, 403);
  assert.equal((await call(raw.replace(previewToken, 'forged'), { headers })).status, 403);
  assert.equal((await call(raw, { method: 'POST', headers })).status, 403);
  assert.notEqual((await call(fileUrl('file-content', '.codex/public.txt', { token: previewToken }), { headers: remote })).status, 200);
  assert.equal((await call('/api/auth/logout', { method: 'POST', headers: { ...remote, Cookie: cookie } })).status, 200);
  assert.equal((await call(raw, { headers })).status, 403);
});
