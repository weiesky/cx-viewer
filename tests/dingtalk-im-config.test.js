import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { setLogDir } from '../findcx.js';
import {
  clearDingTalkImSecret, getDingTalkImConfigPath, loadDingTalkImConfig,
  loadDingTalkImState, saveDingTalkImConfig, validateDingTalkImConfig,
} from '../lib/dingtalk-im-config.js';

const root = mkdtempSync('/tmp/cxv-dingtalk-config-');
setLogDir(root);
test.after(() => rmSync(root, { recursive: true, force: true }));

test('DingTalk config is private, normalized, preserves blank secret and masks state', () => {
  const saved = saveDingTalkImConfig({
    enabled: true, appKey: ' key ', appSecret: ' secret ',
    allowStaffIds: [' user-1 ', 'user-1', '', 4], maxChunkChars: 99999,
  });
  assert.deepEqual(saved.allowStaffIds, ['user-1']);
  assert.equal(saved.maxChunkChars, 5000);
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
