import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';

import { setLogDir } from '../findcx.js';
import {
  atomicWritePrivateFile, clearDingTalkImSecret, getDingTalkImConfigPath, loadDingTalkImConfig,
  loadDingTalkImState, saveDingTalkImConfig, validateDingTalkImConfig,
} from '../lib/dingtalk-im-config.js';

const root = mkdtempSync('/tmp/cxv-dingtalk-config-');
setLogDir(root);
test.after(() => rmSync(root, { recursive: true, force: true }));

test('DingTalk config is private, normalized, preserves blank secret and masks state', () => {
  const saved = saveDingTalkImConfig({
    enabled: true, appKey: ' key ', appSecret: ' secret ',
    allowStaffIds: [' user-1 ', 'user-1', '', 4], maxChunkChars: 99999,
    ackCard: true, cardTemplateId: ' card ', aiCardTemplateId: ' ai ', aiCardStreamKey: ' answer ',
  });
  assert.deepEqual(saved.allowStaffIds, ['user-1']);
  assert.equal(saved.maxChunkChars, 5000);
  assert.equal(saved.cardTemplateId, 'card');
  assert.equal(saved.aiCardTemplateId, 'ai');
  assert.equal(saved.aiCardStreamKey, 'answer');
  assert.equal(saved.ackCard, true);
  assert.equal(statSync(getDingTalkImConfigPath()).mode & 0o777, 0o600);
  assert.equal(statSync(dirname(getDingTalkImConfigPath())).mode & 0o777, 0o700);
  assert.equal(loadDingTalkImState().hasSecret, true);
  assert.equal('appSecret' in loadDingTalkImState(), false);

  saveDingTalkImConfig({ enabled: true, appKey: 'changed', appSecret: '', allowStaffIds: ['user-2'] });
  assert.equal(loadDingTalkImConfig().appSecret, 'secret');
  clearDingTalkImSecret();
  assert.equal(loadDingTalkImConfig().appSecret, '');
  assert.equal(loadDingTalkImConfig().enabled, false);
});

test('enabled config requires credentials but allows an empty sender allowlist', () => {
  assert.deepEqual(validateDingTalkImConfig({ enabled: true, appKey: 'k', appSecret: 's' }).allowStaffIds, []);
  assert.throws(() => validateDingTalkImConfig({ enabled: true, appSecret: 's', allowStaffIds: ['u'] }), {
    code: 'DINGTALK_APP_KEY_REQUIRED',
  });
});

test('config writer refuses a symlink target', () => {
  const isolated = mkdtempSync('/tmp/cxv-dingtalk-config-link-');
  setLogDir(isolated);
  const path = getDingTalkImConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  const victim = join(isolated, 'victim');
  symlinkSync(victim, path);
  assert.throws(() => saveDingTalkImConfig({ appKey: 'x' }), { code: 'UNSAFE_IM_PATH' });
  assert.equal(readFileSync(victim, { encoding: 'utf8', flag: 'a+' }), '');
  rmSync(isolated, { recursive: true, force: true });
  setLogDir(root);
});

test('config writer refuses a symlinked intermediate directory', () => {
  const isolated = mkdtempSync('/tmp/cxv-dingtalk-config-parent-link-');
  const outside = mkdtempSync('/tmp/cxv-dingtalk-config-outside-');
  setLogDir(isolated);
  symlinkSync(outside, join(isolated, 'im'));
  assert.throws(() => saveDingTalkImConfig({ appKey: 'x' }), { code: 'UNSAFE_IM_PATH' });
  rmSync(isolated, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
  setLogDir(root);
});

test('private write permission failures happen before the source commit and preserve the original file', () => {
  const path = join(dirname(getDingTalkImConfigPath()), 'atomic-fixture');
  writeFileSync(path, 'original', { mode: 0o600 });
  const chmod = fs.chmodSync;
  const fchmod = fs.fchmodSync;
  fs.chmodSync = (target, ...args) => {
    if (target === path) throw Object.assign(new Error('test permission failure'), { code: 'EIO' });
    return chmod(target, ...args);
  };
  fs.fchmodSync = () => { throw Object.assign(new Error('test permission failure'), { code: 'EIO' }); };
  syncBuiltinESMExports();
  try {
    assert.throws(() => atomicWritePrivateFile(path, 'next'), { code: 'EIO' });
    assert.equal(readFileSync(path, 'utf8'), 'original');
    assert.ok(!readdirSync(dirname(path)).some(name => name.includes('.tmp-')));
  } finally {
    fs.chmodSync = chmod;
    fs.fchmodSync = fchmod;
    syncBuiltinESMExports();
    rmSync(path, { force: true });
  }
});

test('a colliding private temporary file is preserved when exclusive creation fails', () => {
  const path = join(dirname(getDingTalkImConfigPath()), 'atomic-collision');
  writeFileSync(path, 'original', { mode: 0o600 });
  const open = fs.openSync;
  let collision;
  try {
    fs.openSync = (target, ...args) => {
      if (String(target).includes('.atomic-collision.tmp-')) {
        collision = target;
        const fd = open(target, 'wx', 0o600);
        try { writeFileSync(fd, 'another writer'); } finally { fs.closeSync(fd); }
      }
      return open(target, ...args);
    };
    syncBuiltinESMExports();
    assert.throws(() => atomicWritePrivateFile(path, 'next'), { code: 'EEXIST' });
    assert.equal(readFileSync(path, 'utf8'), 'original');
    assert.equal(readFileSync(collision, 'utf8'), 'another writer');
  } finally {
    fs.openSync = open;
    syncBuiltinESMExports();
    rmSync(path, { force: true });
    if (collision) rmSync(collision, { force: true });
  }
});

test('unreadable DingTalk configurations cannot be overwritten or cleared with normalized defaults', () => {
  const path = getDingTalkImConfigPath();
  const original = readFileSync(path);
  try {
    for (const bytes of [Buffer.from('{"appSecret":"synthetic-truncated'), Buffer.from('null'), Buffer.from('[]'),
      Buffer.from('{"version":2}'), Buffer.from('{"appSecret":123}'), Buffer.from([0xff])]) {
      writeFileSync(path, bytes);
      for (const action of [() => loadDingTalkImConfig(), () => saveDingTalkImConfig({ appKey: 'new' }), () => clearDingTalkImSecret()]) {
        assert.throws(action, error => error.code === 'DINGTALK_CONFIG_UNREADABLE' && error.status === 409 && !error.message.includes('synthetic-truncated'));
        assert.deepEqual(readFileSync(path), bytes);
      }
      assert.ok(!readdirSync(dirname(path)).some(name => name.includes('.tmp-') || name.endsWith('.lock')));
    }
  } finally { writeFileSync(path, original); }
});

test('two processes preserve independent DingTalk fields while merging configuration updates', async () => {
  saveDingTalkImConfig({ enabled: true, appKey: 'key', appSecret: 'synthetic-secret' });
  const run = promisify(execFile);
  await Promise.all(['cardTemplateId', 'aiCardTemplateId'].map(field => run(process.execPath, ['--input-type=module', '-e', `
    const { saveDingTalkImConfig } = await import('./lib/dingtalk-im-config.js');
    for (let i = 0; i < 20; i++) saveDingTalkImConfig({ ${field}: '${field}-' + i });
  `], { env: { ...process.env, CXV_LOG_DIR: root } })));
  const config = loadDingTalkImConfig();
  assert.equal(config.cardTemplateId, 'cardTemplateId-19');
  assert.equal(config.aiCardTemplateId, 'aiCardTemplateId-19');
  assert.equal(config.appSecret, 'synthetic-secret');
});
