import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync, truncateSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = mkdtempSync(join(tmpdir(), 'cxv-archive-preview-'));
const a = join(root, 'a'), b = join(root, 'b');
for (const dir of [a, b]) mkdirSync(dir);
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'state'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_SDK_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20420', CXV_MAX_PORT: '20429' });
const { readFileContent, writeFileContent } = await import('../lib/file-api.js');
const { getUtf16Encoding } = await import('../lib/binary-sniff.js');
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
let port, infoA, infoB;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(a);
  sdk.setSdkLaunchConfig({ codexPath: process.execPath });
  infoA = sdk.initSdkSession(a, 'a', { codexPath: process.execPath }); infoB = sdk.launchSdkSession(b, 'b');
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true }); });
const endpoint = (path, instance = infoA.instanceKey) => `http://127.0.0.1:${port}/api/archive-raw?` + new URLSearchParams({ path, instance });

test('archive raw GET and HEAD use exact instance, 32 MiB cap and original bytes', async () => {
  const bytes = Buffer.from([0x50, 0x4b, 3, 4, 0, 255]);
  writeFileSync(join(a, 'same.zip'), bytes); writeFileSync(join(b, 'same.zip'), 'B');
  const response = await fetch(endpoint('same.zip'));
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'application/octet-stream');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const head = await fetch(endpoint('same.zip'), { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(bytes.length));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal(await (await fetch(endpoint('same.zip', infoB.instanceKey))).text(), 'B');
  assert.equal((await fetch(endpoint('same.zip', 'unknown'))).status, 404);
  writeFileSync(join(a, 'large.tar'), ''); truncateSync(join(a, 'large.tar'), 32 * 1024 * 1024);
  assert.equal((await fetch(endpoint('large.tar'), { method: 'HEAD' })).status, 200);
  truncateSync(join(a, 'large.tar'), 32 * 1024 * 1024 + 1);
  const huge = await fetch(endpoint('large.tar')); assert.equal(huge.status, 413);
  assert.deepEqual(await huge.json(), { error: 'File too large', maxBytes: 33554432, size: 33554433 });
});

test('archive raw rejects traversal, cross-workspace symlinks, native secrets and unsupported paths', async () => {
  symlinkSync(join(b, 'same.zip'), join(a, 'escape.zip'));
  mkdirSync(join(root, 'codex'), { recursive: true }); writeFileSync(join(root, 'codex', 'auth.json'), 'SECRET');
  symlinkSync(join(root, 'codex', 'auth.json'), join(a, 'secret.zip'));
  for (const path of ['../b/same.zip', 'escape.zip', 'secret.zip']) {
    const response = await fetch(endpoint(path)); assert.equal(response.status, 400, path);
    assert.ok(!(await response.text()).includes('SECRET'));
  }
  for (const path of ['', 'file.txt', 'file.rar']) assert.equal((await fetch(endpoint(path))).status, 400);
  assert.equal((await fetch(endpoint('missing.zip'))).status, 404);
  mkdirSync(join(a, 'directory.zip')); assert.equal((await fetch(endpoint('directory.zip'))).status, 400);
  assert.equal((await fetch(endpoint('same.zip'), { headers: { origin: 'https://evil.invalid' } })).status, 403);
});

test('extended image formats retain original raw bytes and correct MIME', async () => {
  for (const [ext,mime] of [['apng','image/apng'],['jfif','image/jpeg'],['tif','image/tiff'],['tiff','image/tiff'],['heic','image/heic'],['heif','image/heif']]) {
    const bytes=Buffer.from([1,2,3,255]); writeFileSync(join(a,`image.${ext}`),bytes);
    const res=await fetch(`http://127.0.0.1:${port}/api/file-raw?`+new URLSearchParams({path:`image.${ext}`,instance:infoA.instanceKey}));
    assert.equal(res.status,200); assert.equal(res.headers.get('content-type'),mime); assert.deepEqual(Buffer.from(await res.arrayBuffer()),bytes);
  }
});
