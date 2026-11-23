import test from 'node:test';
import assert from 'node:assert/strict';
import { linkSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = mkdtempSync(join(tmpdir(), 'cxv-im-senders-'));
process.env.CXV_LOG_DIR = root;
process.env.CXV_TEST = '1';
const { rememberDingTalkImSender: remember, readDingTalkImSenders: read, MAX_DINGTALK_SENDERS } = await import('../lib/dingtalk-im-senders.js');
const { atomicWritePrivateFile, getDingTalkImWorkerDir } = await import('../lib/dingtalk-im-config.js');
const { handleDingTalkImRoute } = await import('../lib/dingtalk-im-routes.js');
const file = join(getDingTalkImWorkerDir(), 'im-senders.json');
const nonce = 'abcdefghijklmnopqrstuvwx';
test.after(() => rmSync(root, { recursive: true, force: true }));
test.afterEach(() => rmSync(file, { force: true }));

test('native sender profiles persist against the exact nonce and are exposed only locally', async () => {
  assert.deepEqual(read(), {});
  assert.equal(remember(nonce, ' Alice\nTest '), true);
  assert.deepEqual(read()[nonce], { name: 'Alice Test', avatar: null, ts: read()[nonce].ts });
  if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
  const before = readFileSync(file);
  assert.equal(remember('__proto__', 'Mallory'), false); assert.equal(remember(nonce, '\ud800'), false);
  assert.deepEqual(readFileSync(file), before);
  for (const [isLocal, expected] of [[true, 200], [false, 403]]) {
    let status, value;
    const res = { writeHead(s) { status = s; }, end(body) { value = JSON.parse(body); } };
    await handleDingTalkImRoute({ method: 'GET', headers: {} }, res, new URL('http://localhost/api/im/dingtalk/senders'), { isLocal });
    assert.equal(status, expected);
    if (isLocal) assert.equal(value.senders[nonce].name, 'Alice Test');
  }
});

test('sender cache retains only the newest 500 profiles', () => {
  const map = Object.fromEntries(Array.from({ length: MAX_DINGTALK_SENDERS }, (_, i) => [`nonce-${String(i).padStart(20, '0')}`, { name: `Sender ${i}`, ts: i, avatar: null }]));
  atomicWritePrivateFile(file, JSON.stringify(map));
  assert.equal(remember(nonce, 'Newest'), true);
  const stored = read(); assert.equal(Object.keys(stored).length, MAX_DINGTALK_SENDERS);
  assert.equal(stored[nonce].name, 'Newest'); assert.equal(stored['nonce-' + '0'.repeat(20)], undefined);
});

test('sender reads and writes reject linked files without exposing or modifying their target', () => {
  const outside = join(root, 'outside.json'); const bytes = JSON.stringify({ [nonce]: { name: 'private', ts: 1 } });
  writeFileSync(outside, bytes);
  for (const link of [symlinkSync, linkSync]) {
    link(outside, file);
    assert.deepEqual(read(), {}); assert.equal(remember(nonce, 'overwrite'), false);
    assert.equal(readFileSync(outside, 'utf8'), bytes); rmSync(file);
  }
});

test('an occupied optional sender-cache lock never stalls message delivery', () => {
  assert.equal(remember(nonce, 'Original'), true);
  const before = readFileSync(file);
  const lock = `${file}.lock`;
  writeFileSync(lock, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
  try {
    const entry = new URL('../lib/dingtalk-im-senders.js', import.meta.url).href;
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e',
      `const {rememberDingTalkImSender}=await import(${JSON.stringify(entry)});console.log(rememberDingTalkImSender(${JSON.stringify(nonce)},'New'));`],
      { encoding: 'utf8', timeout: 2500, env: { ...process.env, CXV_LOG_DIR: root } });
    assert.equal(stdout.trim(), 'false');
    assert.deepEqual(readFileSync(file), before);
    assert.equal(JSON.parse(readFileSync(lock)).pid, process.pid);
  } finally { rmSync(lock, { force: true }); }
});
