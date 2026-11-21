import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createHash } from 'node:crypto';
import fs, { fstatSync, linkSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'cxv-download-'));
const a = join(root, 'one/same'), b = join(root, 'two/same');
for (const dir of [a, b]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(a, 'state'),
  CXV_PROXY_PROFILE_PATH: join(a, 'profile.json'), CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_SDK_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20400', CXV_MAX_PORT: '20409' });
const filename = "空格 'quoted'\nfile.bin", content = Buffer.alloc(12 * 1024 * 1024, 0x5a);
writeFileSync(join(a, filename), content); writeFileSync(join(b, filename), 'workspace B');
const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
mkdirSync(CREDENTIAL_PATHS.root, { recursive: true }); writeFileSync(CREDENTIAL_PATHS.keyPath, 'synthetic private key');
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
let port, infoA, infoB;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(a);
  sdk.setSdkLaunchConfig({ codexPath: process.execPath });
  infoA = sdk.initSdkSession(a, 'same', { codexPath: process.execPath }); infoB = sdk.launchSdkSession(b, 'same');
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true }); });
const pathFor = (path, instance = infoA.instanceKey, extra = '') => '/api/download-file?' + new URLSearchParams({ path, instance }) + extra;
function get(path, { method = 'GET', headers } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }); req.on('error', reject); req.end();
  });
}
async function closed(fd) {
  for (let i = 0; i < 100; i++) {
    try { fstatSync(fd); } catch (error) { if (error.code === 'EBADF') return; throw error; }
    await new Promise(resolve => setTimeout(resolve, 10));
  } assert.fail('download descriptor remained open');
}

test('streams beyond the preview cap with exact bytes and Unicode/quote/newline filename; HEAD has no body', async () => {
  const result = await get(pathFor(filename)); assert.equal(result.status, 200);
  assert.equal(result.headers['content-type'], 'application/octet-stream'); assert.equal(Number(result.headers['content-length']), content.length);
  assert.equal(decodeURIComponent(result.headers['content-disposition'].split("UTF-8''")[1]), filename);
  const hash = data => createHash('sha256').update(data).digest('hex'); assert.equal(hash(result.body), hash(content));
  const head = await get(pathFor(filename), { method: 'HEAD' }); assert.equal(head.status, 200);
  assert.equal(Number(head.headers['content-length']), content.length); assert.equal(head.body.length, 0);
});

test('exact viewed instance isolates same-named workspaces and rejects stale identities and absolute sibling paths', async () => {
  assert.equal((await get(pathFor(filename, infoB.instanceKey))).body.toString(), 'workspace B');
  assert.equal((await get(pathFor(filename, 'unknown-instance'))).status, 404);
  assert.equal((await get(pathFor(filename))).body.length, content.length);
  assert.equal((await get(pathFor(join(b, filename)))).status, 400);
});

test('rejects missing/traversal/directory paths, hostile origins and editorSession as a scope bypass', async () => {
  for (const [path, status] of [['', 400], ['../two/same/' + filename, 400], ['missing', 404], ['.', 400]]) assert.equal((await get(pathFor(path))).status, status, path);
  assert.equal((await get(pathFor(join(b, filename), infoA.instanceKey, '&editorSession=true'))).status, 400);
  assert.equal((await get(pathFor(filename), { headers: { Origin: 'https://hostile.example' } })).status, 403);
});

test('rejects symbolic escapes and private credential hardlinks', { skip: process.platform === 'win32' }, async () => {
  symlinkSync(join(b, filename), join(a, 'escape')); symlinkSync(CREDENTIAL_PATHS.keyPath, join(a, 'private-link'));
  linkSync(CREDENTIAL_PATHS.keyPath, join(a, 'private-alias'));
  assert.equal((await get(pathFor('escape'))).status, 400);
  for (const path of ['private-link', 'private-alias', 'state/private-credentials-v1/master.key']) {
    const result = await get(pathFor(path)); assert.equal(result.status, 403); assert.ok(!result.body.includes('synthetic private key'));
  }
});

test('validates the opened descriptor before streaming and closes a substituted private inode', async () => {
  const target = realpathSync(join(a, filename)), original = fs.openSync; let fd;
  fs.openSync = (path, ...args) => path === target ? (fd = original(CREDENTIAL_PATHS.keyPath, ...args)) : original(path, ...args);
  syncBuiltinESMExports();
  try { const result = await get(pathFor(filename)); assert.equal(result.status, 403); assert.ok(!result.body.includes('synthetic private key')); assert.ok(Number.isInteger(fd)); await closed(fd); }
  finally { fs.openSync = original; syncBuiltinESMExports(); }
});

test('client disconnect releases the stream descriptor while the server keeps serving', async () => {
  const file = join(a, 'large.bin'); writeFileSync(file, ''); truncateSync(file, 64 * 1024 * 1024);
  const target = realpathSync(file), original = fs.openSync; let fd;
  fs.openSync = (path, ...args) => { const opened = original(path, ...args); if (path === target) fd = opened; return opened; }; syncBuiltinESMExports();
  try {
    await new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path: pathFor('large.bin') }, res => {
        res.once('data', () => { res.destroy(); req.destroy(); resolve(); }); res.on('error', () => {});
      }); req.on('error', reject); req.end();
    }); assert.ok(Number.isInteger(fd)); await closed(fd);
    assert.equal((await get(pathFor(filename), { method: 'HEAD' })).status, 200);
  } finally { fs.openSync = original; syncBuiltinESMExports(); }
});

test('stream read failure aborts the attachment and closes its descriptor instead of reporting an empty success', async () => {
  const target = realpathSync(join(a, filename)), original = fs.createReadStream; let fd;
  fs.createReadStream = (path, options) => {
    const stream = original(path, options);
    if (path === target) { fd = options.fd; queueMicrotask(() => stream.destroy(new Error('synthetic read failure'))); }
    return stream;
  }; syncBuiltinESMExports();
  try { await assert.rejects(get(pathFor(filename))); assert.ok(Number.isInteger(fd)); await closed(fd); }
  finally { fs.createReadStream = original; syncBuiltinESMExports(); }
  assert.equal((await get(pathFor(filename), { method: 'HEAD' })).status, 200);
});
