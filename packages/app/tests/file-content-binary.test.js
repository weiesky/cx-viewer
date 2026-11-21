import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = mkdtempSync(join(tmpdir(), 'cxv-binary-editor-'));
const a = join(root, 'a'), b = join(root, 'b');
for (const dir of [a, b]) mkdirSync(dir);
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'state'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_SDK_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20410', CXV_MAX_PORT: '20419' });
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
const utf16 = (text, be = false) => Buffer.concat([Buffer.from(be ? [0xfe, 0xff] : [0xff, 0xfe]), be ? Buffer.from(text, 'utf16le').swap16() : Buffer.from(text, 'utf16le')]);
const endpoint = (path, instance = infoA.instanceKey) => `http://127.0.0.1:${port}/api/file-content?` + new URLSearchParams({ path, instance });

test('valid UTF-16 LE/BE is decoded faithfully and direct writes preserve its original bytes', () => {
  for (const [name, raw, encoding, text] of [['le.txt', utf16('中文\nhello 😀'), 'utf16le', '中文\nhello 😀'], ['be.md', utf16('# 原文 😀', true), 'utf16be', '# 原文 😀']]) {
    writeFileSync(join(a, name), raw);
    const data = readFileContent(a, name, false);
    assert.equal(data.content, text); assert.equal(data.encoding, encoding); assert.equal(data.readOnly, true); assert.equal(data.size, raw.length);
    for (const editor of [false, true]) {
      assert.throws(() => writeFileContent(a, name, 'replacement', editor), { code: 'READ_ONLY_ENCODING' });
      assert.deepEqual(readFileSync(join(a, name)), raw);
    }
  }
});

test('binary/invalid encodings anywhere in the bounded file cannot become editable or be overwritten', () => {
  const inputs = [Buffer.from('abc\0def'), Buffer.from([0xc3, 0x28]), Buffer.concat([Buffer.alloc(8192, 65), Buffer.from([0xff])]),
    Buffer.from([0xff, 0xfe, 0, 0, 0x41, 0, 0, 0]), Buffer.from([0xff, 0xfe, 0x41]),
    Buffer.from([0xff, 0xfe, 0, 0xd8]), Buffer.from([0xfe, 0xff, 0xdc, 0])];
  for (const [i, raw] of inputs.entries()) {
    const name = `binary-${i}.txt`; writeFileSync(join(a, name), raw);
    assert.throws(() => readFileContent(a, name, false), { code: 'BINARY', reason: 'binary', size: raw.length });
    assert.throws(() => writeFileContent(a, name, 'replacement', true), { code: 'BINARY' });
    assert.deepEqual(readFileSync(join(a, name)), raw); assert.equal(getUtf16Encoding(raw), null);
  }
});

test('ordinary UTF-8, empty and ANSI text retain editing including shorter/longer overwrite and creation', () => {
  for (const [i, text] of ['', '中文 😀\n', '\x1b[31merror\x1b[0m\n50%\b\b\b100%'].entries()) {
    const name = `text-${i}.txt`; writeFileContent(a, name, text, false);
    assert.equal(readFileContent(a, name, false).content, text); assert.equal(readFileContent(a, name, false).readOnly, undefined);
    for (const next of ['x', 'longer text 中文 😀']) {
      writeFileContent(a, name, next, false); assert.deepEqual(readFileSync(join(a, name)), Buffer.from(next));
    }
  }
  const huge = join(a, 'huge.txt'); writeFileSync(huge, Buffer.alloc(5 * 1024 * 1024 + 1, 65));
  assert.throws(() => readFileContent(a, 'huge.txt', false), { code: 'TOO_LARGE' });
  assert.throws(() => writeFileContent(a, 'huge.txt', 'x', false), { code: 'TOO_LARGE' });
  assert.equal(readFileSync(huge).length, 5 * 1024 * 1024 + 1);
});

test('actual scoped HTTP exposes binary 415 and UTF-16 metadata, denies stale writes and preserves download bytes', async () => {
  const raw = Buffer.from([1, 0, 255, 2]); writeFileSync(join(a, 'same.txt'), raw); writeFileSync(join(b, 'same.txt'), 'B UTF-8');
  const binary = await fetch(endpoint('same.txt')); assert.equal(binary.status, 415);
  assert.deepEqual(await binary.json(), { error: 'Binary file', reason: 'binary', size: raw.length });
  const other = await fetch(endpoint('same.txt', infoB.instanceKey)); assert.equal((await other.json()).content, 'B UTF-8');
  assert.equal((await fetch(endpoint('same.txt', 'unknown'))).status, 404);
  for (const name of ['same.txt', 'le.txt', 'be.md']) {
    const original = readFileSync(join(a, name));
    const write = await fetch(endpoint(name), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: name, content: 'replacement', editorSession: true }) });
    assert.equal(write.status, 415); assert.deepEqual(readFileSync(join(a, name)), original);
    const download = await fetch(`http://127.0.0.1:${port}/api/download-file?` + new URLSearchParams({ path: name, instance: infoA.instanceKey }));
    assert.equal(download.status, 200); assert.deepEqual(Buffer.from(await download.arrayBuffer()), original);
  }
  const read = await fetch(endpoint('be.md')); assert.equal(read.status, 200); assert.equal((await read.json()).encoding, 'utf16be');
});
