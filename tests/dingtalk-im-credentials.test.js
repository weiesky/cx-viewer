import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'cxv-im-credentials-'));
process.env.CXV_LOG_DIR = root;
const im = await import('../lib/dingtalk-im-config.js');
const { CREDENTIAL_PATHS } = await import('../lib/credential-paths.js');
const { createCredentialStore } = await import('../lib/credential-store.js');
const { stageSecretReference } = await import('../lib/credential-reference.js');
const { markConfigurationMigrated } = await import('../lib/credential-migration-state.js');
const store = createCredentialStore(CREDENTIAL_PATHS.root);
const path = im.getDingTalkImConfigPath();
const run = promisify(execFile);
beforeEach(() => { rmSync(root, { recursive: true, force: true }); mkdirSync(root, { mode: 0o700 }); });
after(() => rmSync(root, { recursive: true, force: true }));

function writeStored(stored) { im.atomicWritePrivateFile(path, JSON.stringify(stored)); }
function seed() {
  const appSecretRef = stageSecretReference(store, 'im-secret', im.DINGTALK_SECRET_OWNER, 'synthetic-secret');
  const stored = { version: 1, enabled: true, appKey: 'synthetic-app',
    [im.IM_CREDENTIAL_VERSION_FIELD]: 1, appSecretRef };
  writeStored(stored);
  return stored;
}

test('IM legacy saves remain unchanged until explicitly migrated and blank updates preserve the encrypted secret', async () => {
  im.saveDingTalkImConfig({ enabled: false, appKey: 'legacy-app', appSecret: 'legacy-secret' });
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).appSecret, 'legacy-secret');
  assert.equal(existsSync(store.root), false);
  const initial = seed();
  const original = readFileSync(store.file);
  assert.equal(im.loadDingTalkImConfig().appSecret, 'synthetic-secret');
  const state = im.loadDingTalkImState();
  assert.equal(state.hasSecret, true);
  assert.equal(Object.hasOwn(state, 'appSecret'), false);
  assert.equal(Object.hasOwn(state, 'appSecretRef'), false);
  im.saveDingTalkImConfig({ appSecret: '', allowStaffIds: ['staff-1'] });
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).appSecretRef, initial.appSecretRef);
  assert.deepEqual(readFileSync(store.file), original);
  await run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { loadDingTalkImConfig } = await import('./lib/dingtalk-im-config.js');
    assert.equal(loadDingTalkImConfig().appSecret, 'synthetic-secret');
  `], { env: process.env });
});

test('IM secret changes stage new refs, clear to an explicit disabled state and retire inactive ciphertext', () => {
  seed();
  im.saveDingTalkImConfig({ appSecret: 'next-secret' });
  assert.equal(im.loadDingTalkImConfig().appSecret, 'next-secret');
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(path, 'utf8')), 'appSecret'), false);
  assert.ok(!readFileSync(path, 'utf8').includes('next-secret'));
  assert.ok(!readFileSync(store.file, 'utf8').includes('next-secret'));
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file, 'utf8')).creds).length, 1);
  im.clearDingTalkImSecret();
  const cleared = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(cleared.appSecretRef, null);
  assert.equal(cleared.enabled, false);
  assert.equal(im.loadDingTalkImState().hasSecret, false);
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file, 'utf8')).creds).length, 0);
});

test('a migrated disabled configuration with no secret does not create a vault for metadata updates', () => {
  writeStored({ version: 1, enabled: false, [im.IM_CREDENTIAL_VERSION_FIELD]: 1, appSecretRef: null });
  im.saveDingTalkImConfig({ appKey: 'metadata-only' });
  assert.equal(im.loadDingTalkImConfig().appSecret, '');
  assert.equal(existsSync(store.root), false);
  assert.throws(() => im.saveDingTalkImConfig({ enabled: true }), { code: 'DINGTALK_APP_SECRET_REQUIRED' });
  assert.equal(existsSync(store.root), false);
});

test('missing keys, invalid references, unknown formats and legacy fields cannot be treated as an empty IM secret', () => {
  const initial = seed();
  for (const stored of [
    { ...initial, appSecretRef: null },
    { ...initial, appSecretRef: 'invalid' },
    { ...initial, appSecret: '' },
    { ...initial, [im.IM_CREDENTIAL_VERSION_FIELD]: 2 },
    { ...initial, [im.IM_CREDENTIAL_VERSION_FIELD]: undefined },
  ]) {
    writeStored(stored);
    const bytes = readFileSync(path);
    for (const action of [im.loadDingTalkImConfig, () => im.saveDingTalkImConfig({ appSecret: 'replacement' }), im.clearDingTalkImSecret]) {
      assert.throws(action, { code: 'DINGTALK_SECRET_UNREADABLE', status: 409 });
      assert.deepEqual(readFileSync(path), bytes);
    }
  }
  writeStored(initial);
  unlinkSync(store.keyPath);
  assert.throws(im.loadDingTalkImConfig, { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.throws(() => im.saveDingTalkImConfig({ appSecret: 'replacement' }), { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.equal(existsSync(store.keyPath), false);
});

test('an IM source commit failure preserves its active secret and cleans staged ciphertext', () => {
  seed();
  const before = readFileSync(path);
  const records = readFileSync(store.file);
  const rename = fs.renameSync;
  fs.renameSync = (from, to) => {
    if (to === path) throw Object.assign(new Error('test IM source failure'), { code: 'EIO' });
    return rename(from, to);
  };
  syncBuiltinESMExports();
  try {
    assert.throws(() => im.saveDingTalkImConfig({ appSecret: 'next' }), { code: 'EIO' });
    assert.deepEqual(readFileSync(path), before);
    assert.deepEqual(readFileSync(store.file), records);
    assert.equal(im.loadDingTalkImConfig().appSecret, 'synthetic-secret');
  } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
});

test('two processes can change encrypted IM secrets without leaving multiple active versions', async () => {
  seed();
  await Promise.all(['A', 'B'].map(prefix => run(process.execPath, ['--input-type=module', '-e', `
    const { saveDingTalkImConfig } = await import('./lib/dingtalk-im-config.js');
    for (let i = 0; i < 10; i++) saveDingTalkImConfig({ appSecret: '${prefix}' + i });
  `], { env: process.env })));
  assert.match(im.loadDingTalkImConfig().appSecret, /^[AB]9$/);
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file, 'utf8')).creds).length, 1);
});

test('activated IM rejects whole-file legacy replacement and a missing source instead of defaulting to unconfigured', () => {
  seed();
  markConfigurationMigrated(store, 'im', im.DINGTALK_SECRET_OWNER);
  assert.equal(im.loadDingTalkImConfig().appSecret, 'synthetic-secret');
  writeStored({ version: 1, enabled: false, appSecret: 'legacy-secret' });
  const original = readFileSync(path);
  assert.throws(im.loadDingTalkImConfig, { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.throws(() => im.saveDingTalkImConfig({ appSecret: 'REPLACE' }), { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.deepEqual(readFileSync(path), original);
  unlinkSync(path);
  assert.throws(im.loadDingTalkImConfig, { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.throws(() => im.saveDingTalkImConfig({ appSecret: 'REPLACE' }), { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.equal(existsSync(path), false);
});
