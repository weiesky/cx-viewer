import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = mkdtempSync(join(tmpdir(), 'cxv-recovery-'));
process.env.CXV_LOG_DIR = root;
const { recoverCredentialConfiguration, inspectCredentialRecovery } = await import('../lib/credential-recovery.js');
const auth = await import('../lib/auth.js');
const im = await import('../lib/dingtalk-im-config.js');
const { createProxyProfileCredentials } = await import('../lib/proxy-profile-credentials.js');
const { migrateProxyCredentials } = await import('../lib/proxy-credential-migration.js');
const { createCredentialStore } = await import('../lib/credential-store.js');
const { createCredentialBackup, readCredentialBackup } = await import('../lib/credential-backup.js');
const { isConfigurationMigrated } = await import('../lib/credential-migration-state.js');
const store = createCredentialStore(join(root, 'private-credentials-v1'));
const prefs = join(root, 'preferences.json');
const profilePath = join(root, 'profile.json');
const proxy = createProxyProfileCredentials(profilePath);
const command = fileURLToPath(new URL('../scripts/restore-credentials.mjs', import.meta.url));
const run = promisify(execFile);
beforeEach(() => { rmSync(root, { recursive: true, force: true }); mkdirSync(root, { mode: 0o700 }); });
after(() => rmSync(root, { recursive: true, force: true }));
const options = (type, backupPath) => ({ ownerDirectory: root, type, backupPath, ...(type === 'proxy' ? { profileName: 'profile.json' } : {}) });
const restore = (type, backupPath) => recoverCredentialConfiguration({ ...options(type, backupPath), confirmStopped: true });
function seedAuth() {
  const password = value => ({ enabled: true, password: Buffer.from(value).toString('base64'), revision: 7 });
  const document = { theme: 'old', custom: { keep: [1, null, false] }, auth: password('old-auth'),
    authByProject: { '/project': password('项目 password'), ...JSON.parse('{"__proto__":{"enabled":false,"password":"","revision":2}}') },
    ...JSON.parse('{"__proto__":{"keep":true}}') };
  writeFileSync(prefs, JSON.stringify(document));
  return document;
}
function seedProxy({ backup = true } = {}) {
  const document = { version: 3, active: 'third', metadata: 'old', profiles: [
    { id: 'max', name: 'Default' }, { id: 'third', name: 'Provider', baseURL: 'https://old.example/v1',
      apiKey: 'old-profile', wireApi: 'responses' },
  ] };
  writeFileSync(profilePath, JSON.stringify(document));
  if (backup) {
    const previous = structuredClone(document);
    previous.profiles[1].apiKey = 'older-backup-profile';
    writeFileSync(`${profilePath}.bak`, JSON.stringify(previous));
  }
}
function patchFs(method, replacement, callback) {
  const original = fs[method];
  try { fs[method] = replacement(original); syncBuiltinESMExports(); return callback(); }
  finally { fs[method] = original; syncBuiltinESMExports(); }
}
function changeAuth() {
  auth.saveAuthConfig({ enabled: true, password: 'new-auth' });
  const next = JSON.parse(readFileSync(prefs));
  next.theme = 'new';
  next.newOnlySetting = true;
  writeFileSync(prefs, JSON.stringify(next));
}

test('auth recovery restores the whole preferences snapshot and preserves later IM/profile credentials in the shared vault', () => {
  const original = seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  changeAuth();
  im.saveDingTalkImConfig({ enabled: false, appKey: 'later-app', appSecret: 'later-im' });
  im.migrateDingTalkCredentials({ confirmStopped: true });
  seedProxy();
  migrateProxyCredentials(profilePath, { confirmStopped: true });
  const imBytes = readFileSync(im.getDingTalkImConfigPath());
  const profileBytes = readFileSync(profilePath);
  const key = readFileSync(store.keyPath);
  const current = readFileSync(prefs);
  const vault = readFileSync(store.file);
  const count = readdirSync(join(root, 'credential-backups-v1')).length;
  const preview = inspectCredentialRecovery(options('auth', migration.backupPath));
  assert.deepEqual(preview, { status: 'preview', type: 'auth', scope: 'whole-source',
    sources: [{ path: 'preferences.json', currentPresent: true, backupPresent: true }] });
  assert.deepEqual(readFileSync(prefs), current);
  assert.deepEqual(readFileSync(store.file), vault);
  assert.equal(readdirSync(join(root, 'credential-backups-v1')).length, count);
  assert.throws(() => recoverCredentialConfiguration(options('auth', migration.backupPath)), { code: 'CREDENTIAL_RECOVERY_REQUIRES_STOPPED' });
  const result = restore('auth', migration.backupPath);
  assert.equal(result.status, 'restored');
  assert.deepEqual(readCredentialBackup(result.backupPath, { ownerDirectory: root, sources: ['preferences.json'] }).get('preferences.json'), current);
  const restored = JSON.parse(readFileSync(prefs));
  assert.equal(restored.theme, original.theme);
  assert.deepEqual(restored.custom, original.custom);
  assert.deepEqual(restored.__proto__, { keep: true });
  assert.equal(Object.hasOwn(restored, 'newOnlySetting'), false);
  assert.equal(Object.hasOwn(restored.auth, 'password'), false);
  assert.equal(auth.loadAuthConfig().password, 'old-auth');
  assert.equal(auth.loadAuthConfig('/project').password, '项目 password');
  assert.equal(auth.loadAuthConfig('__proto__').password, '');
  assert.equal(auth.loadAuthConfig().revision, 7);
  assert.deepEqual(readFileSync(im.getDingTalkImConfigPath()), imBytes);
  assert.deepEqual(readFileSync(profilePath), profileBytes);
  assert.deepEqual(readFileSync(store.keyPath), key);
  assert.equal(im.loadDingTalkImConfig().appSecret, 'later-im');
  assert.equal(proxy.read().data.profiles[1].apiKey, 'old-profile');
  const refs = readFileSync(prefs);
  const records = readFileSync(store.file);
  restore('auth', migration.backupPath);
  assert.deepEqual(readFileSync(prefs), refs);
  assert.deepEqual(readFileSync(store.file), records);
  assert.ok(!readdirSync(join(root, 'credential-backups-v1')).some(name => name.startsWith('restore-stage-')));
});

test('an encrypted snapshot with an older key is rebound to the live key without replacing other live records', () => {
  seedAuth();
  auth.migrateAuthCredentials({ confirmStopped: true });
  const snapshot = createCredentialBackup(root, ['preferences.json']);
  const oldKey = readFileSync(store.keyPath);
  rmSync(store.root, { recursive: true, force: true });
  store.set('im-secret', 'independent-live-record', 'later-live-secret');
  const newKey = readFileSync(store.keyPath);
  assert.notDeepEqual(oldKey, newKey);
  assert.equal(auth.loadAuthConfig().passwordUnreadable, true);
  restore('auth', snapshot);
  assert.equal(auth.loadAuthConfig().password, 'old-auth');
  assert.deepEqual(readFileSync(store.keyPath), newKey);
  assert.equal(store.get('im-secret', 'independent-live-record'), 'later-live-secret');
});

test('proxy recovery restores current and backup versions independently, retaining endpoint and active settings', () => {
  seedProxy();
  const migration = migrateProxyCredentials(profilePath, { confirmStopped: true });
  const next = proxy.read().document;
  next.metadata = 'new';
  next.active = 'max';
  writeFileSync(profilePath, JSON.stringify(next));
  restore('proxy', migration.backupPath);
  assert.equal(proxy.read().data.active, 'third');
  assert.equal(proxy.read().data.profiles[1].apiKey, 'old-profile');
  assert.equal(proxy.readBackup().data.profiles[1].apiKey, 'older-backup-profile');
  assert.equal(JSON.parse(readFileSync(profilePath)).metadata, 'old');
  const refs = [profilePath, `${profilePath}.bak`].map(file => readFileSync(file));
  restore('proxy', migration.backupPath);
  assert.deepEqual([profilePath, `${profilePath}.bak`].map(file => readFileSync(file)), refs);
});

test('a missing optional proxy backup in the snapshot removes a later backup without discarding its active key', () => {
  seedProxy({ backup: false });
  const migration = migrateProxyCredentials(profilePath, { confirmStopped: true });
  writeFileSync(`${profilePath}.bak`, readFileSync(profilePath));
  restore('proxy', migration.backupPath);
  assert.equal(existsSync(`${profilePath}.bak`), false);
  assert.equal(proxy.read().data.profiles[1].apiKey, 'old-profile');
});

test('IM recovery restores the paired app identity, allowlist and disabled state with its secret', () => {
  im.saveDingTalkImConfig({ enabled: false, appKey: 'old-app', appSecret: 'old-im', allowStaffIds: ['old-staff'] });
  const migration = im.migrateDingTalkCredentials({ confirmStopped: true });
  im.saveDingTalkImConfig({ enabled: true, appKey: 'new-app', appSecret: 'new-im', allowStaffIds: ['new-staff'] });
  restore('im', migration.backupPath);
  const current = im.loadDingTalkImConfig();
  assert.equal(current.appKey, 'old-app');
  assert.equal(current.appSecret, 'old-im');
  assert.equal(current.enabled, false);
  assert.deepEqual(current.allowStaffIds, ['old-staff']);
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(im.getDingTalkImConfigPath())), 'appSecret'), false);
});

test('broken current JSON can be recovered, while an invalid snapshot cannot overwrite valid live data', () => {
  seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  writeFileSync(prefs, '{"broken current');
  restore('auth', migration.backupPath);
  assert.equal(auth.loadAuthConfig().password, 'old-auth');
  const current = readFileSync(prefs);
  writeFileSync(prefs, '{"broken snapshot');
  const invalidSnapshot = createCredentialBackup(root, ['preferences.json']);
  writeFileSync(prefs, current);
  const vault = readFileSync(store.file);
  assert.throws(() => restore('auth', invalidSnapshot), { code: 'CREDENTIAL_RECOVERY_INCOMPLETE' });
  assert.deepEqual(readFileSync(prefs), current);
  assert.deepEqual(readFileSync(store.file), vault);
});

test('a failed current proxy switch leaves both active sources decryptable and can retry the same snapshot', () => {
  seedProxy();
  const migration = migrateProxyCredentials(profilePath, { confirmStopped: true });
  const current = readFileSync(profilePath);
  let failure;
  patchFs('renameSync', rename => (from, to) => {
    if (to === profilePath) throw new Error('injected current restore failure');
    return rename(from, to);
  }, () => assert.throws(() => restore('proxy', migration.backupPath), error => {
    failure = error; return error.code === 'CREDENTIAL_RECOVERY_INCOMPLETE';
  }));
  assert.deepEqual(readFileSync(profilePath), current);
  assert.equal(proxy.read().data.profiles[1].apiKey, 'old-profile');
  assert.equal(proxy.readBackup().data.profiles[1].apiKey, 'older-backup-profile');
  assert.ok(readCredentialBackup(failure.backupPath, { ownerDirectory: root, sources: ['profile.json', 'profile.json.bak'] }));
  assert.equal(restore('proxy', migration.backupPath).status, 'restored');
});

test('a directory fsync failure after restore keeps its referenced credentials readable and retry reuses them', () => {
  seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  changeAuth();
  let committed = false;
  patchFs('renameSync', rename => (from, to) => {
    const value = rename(from, to);
    if (to === prefs) committed = true;
    return value;
  }, () => patchFs('fsyncSync', fsync => fd => {
    if (committed && fs.fstatSync(fd).isDirectory()) throw new Error('injected directory sync failure');
    return fsync(fd);
  }, () => assert.throws(() => restore('auth', migration.backupPath), { code: 'CREDENTIAL_RECOVERY_INCOMPLETE' })));
  assert.equal(auth.loadAuthConfig().password, 'old-auth');
  const reference = JSON.parse(readFileSync(prefs)).auth.passwordRef;
  restore('auth', migration.backupPath);
  assert.equal(JSON.parse(readFileSync(prefs)).auth.passwordRef, reference);
});

test('receipt failure preserves newly committed encrypted credentials and completes on explicit retry', () => {
  seedAuth();
  const snapshot = createCredentialBackup(root, ['preferences.json']);
  writeFileSync(prefs, JSON.stringify({ auth: { enabled: true, password: Buffer.from('new-auth').toString('base64') } }));
  let committed = false;
  patchFs('renameSync', rename => (from, to) => {
    if (committed && to === store.file) throw new Error('injected receipt failure');
    const value = rename(from, to);
    if (to === prefs) committed = true;
    return value;
  }, () => assert.throws(() => restore('auth', snapshot), { code: 'CREDENTIAL_RECOVERY_INCOMPLETE' }));
  assert.equal(auth.loadAuthConfig().password, 'old-auth');
  assert.equal(isConfigurationMigrated(store, 'auth', 'preferences.json'), false);
  restore('auth', snapshot);
  assert.equal(isConfigurationMigrated(store, 'auth', 'preferences.json'), true);
});

test('an outside source change is detected before replacement and a missing live key is never rebuilt', () => {
  seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  changeAuth();
  const external = JSON.stringify({ outside: 'writer', auth: { enabled: false, password: '' } });
  let injected = false;
  patchFs('renameSync', rename => (from, to) => {
    const value = rename(from, to);
    if (!injected && to === store.file) { injected = true; writeFileSync(prefs, external); }
    return value;
  }, () => assert.throws(() => restore('auth', migration.backupPath), { code: 'CREDENTIAL_RECOVERY_INCOMPLETE' }));
  assert.equal(readFileSync(prefs, 'utf8'), external);
  const count = readdirSync(join(root, 'credential-backups-v1')).length;
  const key = readFileSync(store.keyPath);
  rmSync(store.keyPath);
  assert.throws(() => restore('auth', migration.backupPath), { code: 'CREDENTIALS_UNREADABLE' });
  assert.equal(existsSync(store.keyPath), false);
  assert.equal(readdirSync(join(root, 'credential-backups-v1')).length, count);
  writeFileSync(store.keyPath, key, { mode: 0o600 });
  rmSync(store.file);
  assert.throws(() => restore('auth', migration.backupPath), { code: 'CREDENTIAL_RECOVERY_UNREADABLE' });
  assert.equal(existsSync(store.file), false);
  assert.deepEqual(readFileSync(store.keyPath), key);
});

test('snapshotted absence becomes an explicit empty new-format configuration for each type', () => {
  const authBackup = createCredentialBackup(root, ['preferences.json']);
  const imBackup = createCredentialBackup(root, ['im/dingtalk/config.json']);
  const proxyBackup = createCredentialBackup(root, ['profile.json', 'profile.json.bak']);
  seedAuth();
  seedProxy();
  im.saveDingTalkImConfig({ enabled: true, appKey: 'key', appSecret: 'secret' });
  restore('auth', authBackup);
  restore('im', imBackup);
  restore('proxy', proxyBackup);
  assert.equal(auth.loadAuthConfig().enabled, false);
  assert.equal(im.loadDingTalkImConfig().enabled, false);
  assert.equal(im.loadDingTalkImConfig().appSecret, '');
  assert.equal(proxy.read().data.active, 'max');
  assert.equal(existsSync(`${profilePath}.bak`), false);
  assert.equal(auth.inspectAuthCredentialMigration().status, 'migrated');
  assert.equal(im.inspectDingTalkCredentialMigration().status, 'migrated');
});

test('CLI preview and invalid arguments do not write, explicit apply survives a fresh-process runtime read', async () => {
  seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  changeAuth();
  const args = ['--root', root, '--type', 'auth', '--backup', migration.backupPath];
  const original = readFileSync(prefs);
  const vault = readFileSync(store.file);
  const preview = await run(process.execPath, [command, ...args]);
  assert.equal(JSON.parse(preview.stdout).scope, 'whole-source');
  assert.deepEqual(readFileSync(prefs), original);
  assert.deepEqual(readFileSync(store.file), vault);
  for (const invalid of [[], [...args, '--apply'], [...args, '--confirm-stopped'], [...args, '--type', 'proxy']]) {
    await assert.rejects(run(process.execPath, [command, ...invalid]), error => error.code === 1 && !error.stderr.includes('old-auth'));
  }
  const result = await run(process.execPath, [command, ...args, '--apply', '--confirm-stopped']);
  assert.equal(JSON.parse(result.stdout).status, 'restored');
  const restarted = await run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { loadAuthConfig } = await import(${JSON.stringify(new URL('../lib/auth.js', import.meta.url).href)});
    assert.equal(loadAuthConfig().password, 'old-auth');
  `], { env: { ...process.env, CXV_LOG_DIR: root } });
  assert.equal(restarted.stderr, '');
});

test('concurrent CLI restores share the existing source lock and preserve the same recovered state', async () => {
  seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  changeAuth();
  const args = [command, '--root', root, '--type', 'auth', '--backup', migration.backupPath, '--apply', '--confirm-stopped'];
  const results = await Promise.all([1, 2].map(() => run(process.execPath, args)));
  assert.ok(results.every(result => JSON.parse(result.stdout).status === 'restored'));
  assert.equal(auth.loadAuthConfig().password, 'old-auth');
  assert.equal(JSON.parse(readFileSync(prefs)).theme, 'old');
  assert.equal(existsSync(`${prefs}.lock`), false);
});

test('wrong snapshot ownership and unsafe live source aliases fail before creating recovery files', () => {
  seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  const original = readFileSync(prefs);
  const count = readdirSync(join(root, 'credential-backups-v1')).length;
  const alias = join(root, 'prefs-alias');
  fs.linkSync(prefs, alias);
  assert.throws(() => restore('auth', migration.backupPath), { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  assert.deepEqual(readFileSync(alias), original);
  assert.equal(readdirSync(join(root, 'credential-backups-v1')).length, count);
  assert.equal(existsSync(`${prefs}.lock`), false);
  rmSync(alias);
  assert.throws(() => recoverCredentialConfiguration({ ...options('auth', migration.backupPath),
    ownerDirectory: join(root, 'different-owner'), confirmStopped: true }), { code: 'CREDENTIAL_RECOVERY_UNREADABLE' });
  assert.throws(() => restore('proxy', migration.backupPath), { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  assert.deepEqual(readFileSync(prefs), original);
});

test('a hard exit after restore source commit retains decryptable data and restarts using the same snapshot', async () => {
  seedAuth();
  const migration = auth.migrateAuthCredentials({ confirmStopped: true });
  changeAuth();
  await assert.rejects(run(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      const value = rename(from, to);
      if (to === process.env.RECOVERY_SOURCE) process.exit(88);
      return value;
    };
    syncBuiltinESMExports();
    const { recoverCredentialConfiguration } = await import(${JSON.stringify(new URL('../lib/credential-recovery.js', import.meta.url).href)});
    recoverCredentialConfiguration({ ownerDirectory: process.env.CXV_LOG_DIR, type: 'auth',
      backupPath: process.env.RECOVERY_BACKUP, confirmStopped: true });
  `], { env: { ...process.env, CXV_LOG_DIR: root, RECOVERY_SOURCE: prefs, RECOVERY_BACKUP: migration.backupPath } }), error => error.code === 88);
  assert.equal(auth.loadAuthConfig().password, 'old-auth');
  const old = new Date(Date.now() - 11_000);
  fs.utimesSync(`${prefs}.lock`, old, old);
  assert.equal(restore('auth', migration.backupPath).status, 'restored');
  const leftovers = readdirSync(join(root, 'credential-backups-v1')).filter(name => name.startsWith('restore-stage-'));
  assert.equal(leftovers.length, 1); // Hard exit cannot run finally; private data stays protected.
  if (process.platform !== 'win32') assert.equal(fs.statSync(join(root, 'credential-backups-v1', leftovers[0])).mode & 0o777, 0o700);
});
