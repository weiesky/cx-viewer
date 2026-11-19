import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = mkdtempSync(join(tmpdir(), 'cxv-im-migration-'));
process.env.CXV_LOG_DIR = root;
const im = await import('../lib/dingtalk-im-config.js');
const { createCredentialStore } = await import('../lib/credential-store.js');
const { readCredentialBackup } = await import('../lib/credential-backup.js');
const { isConfigurationMigrated } = await import('../lib/credential-migration-state.js');
const store = createCredentialStore(join(root, 'private-credentials-v1'));
const path = im.getDingTalkImConfigPath();
const source = 'im/dingtalk/config.json';
const command = fileURLToPath(new URL('../scripts/migrate-im-credentials.mjs', import.meta.url));
const run = promisify(execFile);
const apply = () => im.migrateDingTalkCredentials({ confirmStopped: true });
beforeEach(() => { rmSync(root, { recursive: true, force: true }); mkdirSync(root, { mode: 0o700 }); });
after(() => rmSync(root, { recursive: true, force: true }));
function seed(overrides = {}) {
  const config = { version: 1, enabled: true, appKey: ' synthetic-app ', appSecret: ' synthetic-IM-secret ',
    allowStaffIds: [' staff-1 ', 'staff-1', 'staff-2'], maxChunkChars: 9999,
    cardTemplateId: ' template ', extra: { keep: [false, null, 7] },
    ...JSON.parse('{"__proto__":{"keep":true}}'), ...overrides };
  im.atomicWritePrivateFile(path, JSON.stringify(config));
  return config;
}
function patchFs(method, replacement, callback) {
  const original = fs[method];
  try { fs[method] = replacement(original); syncBuiltinESMExports(); return callback(); }
  finally { fs[method] = original; syncBuiltinESMExports(); }
}

test('explicit IM migration preserves runtime semantics and metadata with a verified exact backup', () => {
  const config = seed();
  const original = readFileSync(path);
  const expected = im.loadDingTalkImConfig();
  assert.deepEqual(im.inspectDingTalkCredentialMigration(), { status: 'legacy', enabled: true, hasSecret: true });
  assert.equal(existsSync(store.root), false);
  assert.throws(() => im.migrateDingTalkCredentials(), { code: 'CREDENTIAL_MIGRATION_REQUIRES_STOPPED' });
  const result = apply();
  assert.deepEqual({ ...result, backupPath: null }, { status: 'migrated', enabled: true, hasSecret: true, backupPath: null });
  assert.deepEqual(readCredentialBackup(result.backupPath, { ownerDirectory: root, sources: [source] }).get(source), original);
  const stored = JSON.parse(readFileSync(path));
  assert.deepEqual(stored.extra, config.extra);
  assert.deepEqual(stored.__proto__, { keep: true });
  assert.equal(stored[im.IM_CREDENTIAL_VERSION_FIELD], 1);
  assert.equal(Object.hasOwn(stored, 'appSecret'), false);
  assert.equal(typeof stored.appSecretRef, 'string');
  assert.deepEqual(im.loadDingTalkImConfig(), expected);
  for (const file of [path, store.file]) assert.ok(!readFileSync(file, 'utf8').includes('synthetic-IM-secret'));
  const after = [path, store.file].map(file => readFileSync(file));
  assert.deepEqual(apply(), { status: 'migrated', enabled: true, hasSecret: true, backupPath: null });
  assert.deepEqual([path, store.file].map(file => readFileSync(file)), after);
  assert.equal(readdirSync(join(root, 'credential-backups-v1')).length, 1);
  im.saveDingTalkImConfig({ appSecret: '', allowStaffIds: ['staff-3'] });
  assert.equal(im.loadDingTalkImConfig().appSecret, 'synthetic-IM-secret');
});

test('absent IM remains absent and disabled empty secrets migrate to the explicit null reference', () => {
  assert.deepEqual(im.inspectDingTalkCredentialMigration(), { status: 'absent', enabled: false, hasSecret: false });
  assert.deepEqual(apply(), { status: 'absent', enabled: false, hasSecret: false, backupPath: null });
  assert.deepEqual(readdirSync(root), []);
  seed({ enabled: false, appSecret: '', appKey: '' });
  assert.equal(apply().hasSecret, false);
  assert.equal(JSON.parse(readFileSync(path)).appSecretRef, null);
  assert.equal(isConfigurationMigrated(store, 'im', im.DINGTALK_SECRET_OWNER), true);
  assert.equal(im.loadDingTalkImConfig().appSecret, '');
  assert.throws(() => im.saveDingTalkImConfig({ enabled: true }), { code: 'DINGTALK_APP_KEY_REQUIRED' });
  im.clearDingTalkImSecret();
  assert.equal(im.inspectDingTalkCredentialMigration().status, 'migrated');
});

test('invalid or unsafe IM sources never create a backup, key or replacement configuration', () => {
  seed();
  for (const bad of ['{"appSecret":"synthetic-truncated', '[]', '{"version":2}', '{"appSecret":7}',
    '{"_cxvImCredentialVersion":2}', '{"appSecretRef":"unmarked"}', '{"enabled":true,"appKey":"k"}', Buffer.from([0xff])]) {
    writeFileSync(path, bad);
    assert.throws(apply, error => error.status === 409 || error.code === 'DINGTALK_APP_SECRET_REQUIRED');
    assert.deepEqual(readFileSync(path), Buffer.from(bad));
    assert.equal(existsSync(store.root), false);
    assert.equal(existsSync(join(root, 'credential-backups-v1')), false);
  }
  seed();
  const alias = join(root, 'alias');
  linkSync(path, alias);
  assert.throws(apply, { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  rmSync(alias);
  const original = readFileSync(path);
  rmSync(path);
  fs.symlinkSync(join(root, 'missing'), path);
  assert.throws(apply, { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  assert.equal(fs.lstatSync(path).isSymbolicLink(), true);
  rmSync(path);
  writeFileSync(path, original);
});

test('IM migration preserves unrelated auth/profile owners in the shared vault and snapshots its matching key', async () => {
  seed();
  const { migrateAuthCredentials, loadAuthConfig } = await import('../lib/auth.js');
  const prefs = join(root, 'preferences.json');
  writeFileSync(prefs, JSON.stringify({ auth: { enabled: true, password: Buffer.from('other-auth-secret').toString('base64'), revision: 3 } }));
  migrateAuthCredentials({ confirmStopped: true });
  store.set('profile-apiKey', 'synthetic-profile-owner', 'independent-profile-secret');
  const original = readFileSync(prefs);
  const key = readFileSync(store.keyPath);
  const result = apply();
  const snapshot = readCredentialBackup(result.backupPath, { ownerDirectory: root, sources: [source] });
  assert.deepEqual(snapshot.get('private-credentials-v1/master.key'), key);
  assert.deepEqual(readFileSync(prefs), original);
  assert.deepEqual(readFileSync(store.keyPath), key);
  assert.equal(loadAuthConfig().password, 'other-auth-secret');
  assert.equal(store.get('profile-apiKey', 'synthetic-profile-owner'), 'independent-profile-secret');
});

test('source rename failure preserves legacy bytes, cleans the unused staged secret and retains its backup', () => {
  seed();
  const original = readFileSync(path);
  let failure;
  patchFs('renameSync', rename => (from, to) => {
    if (to === path) throw new Error('injected source rename failure');
    return rename(from, to);
  }, () => assert.throws(apply, error => { failure = error; return error.code === 'CREDENTIAL_MIGRATION_INCOMPLETE'; }));
  assert.deepEqual(readFileSync(path), original);
  assert.equal(im.loadDingTalkImConfig().appSecret, 'synthetic-IM-secret');
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file)).creds).length, 0);
  assert.deepEqual(readCredentialBackup(failure.backupPath, { ownerDirectory: root, sources: [source] }).get(source), original);
  assert.equal(existsSync(`${path}.lock`), false);
  assert.equal(readdirSync(dirname(path)).some(name => name.includes('.tmp-')), false);
  assert.equal(apply().status, 'migrated');
});

test('post-rename directory fsync failure retains the referenced secret for retry', () => {
  seed();
  let committed = false;
  patchFs('renameSync', rename => (from, to) => {
    const value = rename(from, to);
    if (to === path) committed = true;
    return value;
  }, () => patchFs('fsyncSync', fsync => fd => {
    if (committed && fs.fstatSync(fd).isDirectory()) throw new Error('injected directory fsync failure');
    return fsync(fd);
  }, () => assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' })));
  assert.equal(im.inspectDingTalkCredentialMigration().status, 'pending-receipt');
  assert.equal(im.loadDingTalkImConfig().appSecret, 'synthetic-IM-secret');
  const stored = JSON.parse(readFileSync(path));
  assert.equal(apply().status, 'migrated');
  assert.deepEqual(JSON.parse(readFileSync(path)), stored);
});

test('receipt failure is resumable without changing the encrypted source reference', () => {
  seed();
  let committed = false;
  patchFs('renameSync', rename => (from, to) => {
    if (committed && to === store.file) throw new Error('injected receipt failure');
    const value = rename(from, to);
    if (to === path) committed = true;
    return value;
  }, () => assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' }));
  const original = JSON.parse(readFileSync(path));
  assert.equal(im.inspectDingTalkCredentialMigration().status, 'pending-receipt');
  assert.equal(apply().status, 'migrated');
  assert.deepEqual(JSON.parse(readFileSync(path)), original);
});

test('source changes and snapshot failure cannot be overwritten by migration', () => {
  seed();
  const original = readFileSync(path);
  writeFileSync(join(root, 'credential-backups-v1'), 'blocked');
  assert.throws(apply, { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  assert.deepEqual(readFileSync(path), original);
  assert.equal(existsSync(store.root), false);
  rmSync(join(root, 'credential-backups-v1'));
  const changed = JSON.stringify({ version: 1, enabled: false, appSecret: 'changed-by-other-writer' });
  let injected = false;
  patchFs('renameSync', rename => (from, to) => {
    const value = rename(from, to);
    if (!injected && to === store.file) { injected = true; writeFileSync(path, changed); }
    return value;
  }, () => assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' }));
  assert.equal(readFileSync(path, 'utf8'), changed);
  assert.equal(isConfigurationMigrated(store, 'im', im.DINGTALK_SECRET_OWNER), false);
  assert.equal(im.loadDingTalkImConfig().appSecret, 'changed-by-other-writer');
});

test('lost keys, deleted sources and legacy replacement cannot trigger migration rewrites', () => {
  seed();
  apply();
  const encrypted = readFileSync(path);
  const key = readFileSync(store.keyPath);
  rmSync(store.keyPath);
  assert.throws(apply, { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.deepEqual(readFileSync(path), encrypted);
  assert.equal(existsSync(store.keyPath), false);
  writeFileSync(store.keyPath, key, { mode: 0o600 });
  const legacy = JSON.stringify({ version: 1, enabled: false, appSecret: 'legacy' });
  writeFileSync(path, legacy);
  assert.throws(apply, { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.equal(readFileSync(path, 'utf8'), legacy);
  rmSync(path);
  assert.throws(apply, { code: 'DINGTALK_SECRET_UNREADABLE' });
  assert.equal(existsSync(path), false);
});

test('CLI requires an explicit target and confirmation, inspects without writes and serializes concurrent applies', async () => {
  seed();
  const original = readFileSync(path);
  const inspected = await run(process.execPath, [command, '--root', root]);
  assert.equal(JSON.parse(inspected.stdout).status, 'legacy');
  assert.deepEqual(readFileSync(path), original);
  assert.equal(existsSync(store.root), false);
  assert.equal(existsSync(join(root, 'credential-backups-v1')), false);
  for (const args of [[], ['--root', root, '--apply'], ['--root', root, '--confirm-stopped']]) {
    await assert.rejects(run(process.execPath, [command, ...args]), error => error.code === 1);
  }
  const results = await Promise.all([1, 2].map(() => run(process.execPath,
    [command, '--root', root, '--apply', '--confirm-stopped'])));
  assert.ok(results.every(result => JSON.parse(result.stdout).status === 'migrated'));
  assert.ok(!results.some(result => result.stdout.includes('synthetic-IM-secret') || result.stderr.includes('synthetic-IM-secret')));
  const restart = await run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { loadDingTalkImConfig } = await import(${JSON.stringify(new URL('../lib/dingtalk-im-config.js', import.meta.url).href)});
    assert.equal(loadDingTalkImConfig().appSecret, 'synthetic-IM-secret');
  `], { env: { ...process.env, CXV_LOG_DIR: root } });
  assert.equal(restart.stderr, '');
});

test('hard process exit after source rename leaves decryptable credentials and resumes after stale owner recovery', async () => {
  seed();
  await assert.rejects(run(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      const value = rename(from, to);
      if (to === process.env.MIGRATION_SOURCE) process.exit(88);
      return value;
    };
    syncBuiltinESMExports();
    const { migrateDingTalkCredentials } = await import(${JSON.stringify(new URL('../lib/dingtalk-im-config.js', import.meta.url).href)});
    migrateDingTalkCredentials({ confirmStopped: true });
  `], { env: { ...process.env, CXV_LOG_DIR: root, MIGRATION_SOURCE: path } }), error => error.code === 88);
  assert.equal(im.loadDingTalkImConfig().appSecret, 'synthetic-IM-secret');
  assert.equal(im.inspectDingTalkCredentialMigration().status, 'pending-receipt');
  const stored = JSON.parse(readFileSync(path));
  const old = new Date(Date.now() - 61_000);
  fs.utimesSync(`${path}.lock`, old, old);
  assert.equal(apply().status, 'migrated');
  assert.deepEqual(JSON.parse(readFileSync(path)), stored);
});
