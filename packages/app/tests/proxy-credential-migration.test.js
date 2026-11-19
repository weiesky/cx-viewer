import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, linkSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { inspectProxyCredentialMigration, migrateProxyCredentials } from '../lib/proxy-credential-migration.js';
import { createProxyProfileCredentials, PROXY_CREDENTIAL_VERSION_FIELD, withProxyProfilesLock } from '../lib/proxy-profile-credentials.js';
import { readCredentialBackup } from '../lib/credential-backup.js';
import { isConfigurationMigrated } from '../lib/credential-migration-state.js';

const command = fileURLToPath(new URL('../scripts/migrate-proxy-credentials.mjs', import.meta.url));
const run = promisify(execFile);
function fixture(t, { backup = true, version = 3 } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-proxy-migration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'profile.json');
  const credentials = createProxyProfileCredentials(path);
  const plain = { version, active: 'third', extra: { keep: [1, false, null] },
    ...JSON.parse('{"__proto__":{"keep":true}}'),
    profiles: [{ id: 'max', name: 'Default' }, { id: 'third', name: 'Provider',
      baseURL: 'https://api.deepseek.com/v1', apiKey: ' synthetic-current-key ', effort: version === 1 ? 'max' : 'high',
      OPENAI_MODEL: 'legacy-model', ...(version === 3 ? { wireApi: 'responses' } : {}), extra: 'preserved' }] };
  writeFileSync(path, JSON.stringify(plain));
  if (backup) {
    const previous = structuredClone(plain);
    previous.profiles[1].apiKey = 'synthetic-backup-key';
    writeFileSync(`${path}.bak`, JSON.stringify(previous));
  }
  return { root, path, credentials, plain,
    apply: () => migrateProxyCredentials(path, { confirmStopped: true }),
    inspect: () => inspectProxyCredentialMigration(path) };
}
function patchFs(method, replacement, callback) {
  const original = fs[method];
  try { fs[method] = replacement(original); syncBuiltinESMExports(); return callback(); }
  finally { fs[method] = original; syncBuiltinESMExports(); }
}

test('explicit migration preserves independent current/backup keys, metadata and a verified exact snapshot', t => {
  const { root, path, credentials, plain, inspect, apply } = fixture(t);
  const originals = [path, `${path}.bak`].map(file => readFileSync(file));
  const expected = [credentials.read().data, credentials.readBackup().data];
  assert.deepEqual(inspect(), { status: 'legacy', profiles: 1, backupProfiles: 1 });
  assert.equal(existsSync(credentials.store.root), false);
  assert.throws(() => migrateProxyCredentials(path), { code: 'CREDENTIAL_MIGRATION_REQUIRES_STOPPED' });
  const result = apply();
  assert.equal(result.status, 'migrated');
  const snapshot = readCredentialBackup(result.backupPath, { ownerDirectory: root, sources: ['profile.json', 'profile.json.bak'] });
  assert.deepEqual(snapshot.get('profile.json'), originals[0]);
  assert.deepEqual(snapshot.get('profile.json.bak'), originals[1]);
  assert.equal(snapshot.get('private-credentials-v1/credentials.json'), null);
  assert.deepEqual([credentials.read().data, credentials.readBackup().data], expected);
  const stored = JSON.parse(readFileSync(path));
  assert.deepEqual(stored.extra, plain.extra);
  assert.deepEqual(stored.__proto__, { keep: true });
  assert.equal(stored.profiles[1].extra, 'preserved');
  assert.equal(stored[PROXY_CREDENTIAL_VERSION_FIELD], 1);
  for (const file of [path, `${path}.bak`, credentials.store.file]) {
    const content = readFileSync(file, 'utf8');
    assert.ok(!content.includes('synthetic-current-key'));
    assert.ok(!content.includes('synthetic-backup-key'));
    if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
  }
  const after = [path, `${path}.bak`, credentials.store.file].map(file => readFileSync(file));
  assert.deepEqual(apply(), { status: 'migrated', profiles: 1, backupProfiles: 1, backupPath: null });
  assert.deepEqual([path, `${path}.bak`, credentials.store.file].map(file => readFileSync(file)), after);
  assert.equal(readdirSync(join(root, 'credential-backups-v1')).length, 1);
});

test('v1 defaults retain their ignored effort and inferred wire API through migration', t => {
  const { path, credentials, apply } = fixture(t, { version: 1 });
  const expected = credentials.read().data;
  assert.equal(expected.profiles[1].effort, '');
  assert.equal(expected.profiles[1].wireApi, 'chat-completions');
  apply();
  assert.deepEqual(credentials.read().data, expected);
  assert.equal(JSON.parse(readFileSync(path)).version, 1);
});

test('optional missing backup and absent sources are never manufactured', t => {
  const { root, path, credentials, apply } = fixture(t, { backup: false });
  const result = apply();
  assert.equal(result.backupProfiles, 0);
  assert.equal(existsSync(`${path}.bak`), false);
  assert.equal(readCredentialBackup(result.backupPath, { ownerDirectory: root, sources: ['profile.json', 'profile.json.bak'] }).get('profile.json.bak'), null);
  const other = join(root, 'missing.json');
  const vault = readFileSync(credentials.store.file);
  assert.deepEqual(migrateProxyCredentials(other, { confirmStopped: true }), { status: 'absent', profiles: 0, backupProfiles: 0, backupPath: null });
  assert.equal(existsSync(other), false);
  assert.deepEqual(readFileSync(credentials.store.file), vault);
});

test('corrupt, unknown, orphaned and unsafe sources fail before any backup or vault write', t => {
  const { root, path, credentials, plain, apply } = fixture(t);
  const original = readFileSync(path);
  for (const corrupt of ['{"apiKey":"synthetic-secret"', '[]', JSON.stringify({ ...plain, [PROXY_CREDENTIAL_VERSION_FIELD]: 2 }),
    Buffer.from([0xff])]) {
    writeFileSync(`${path}.bak`, corrupt);
    assert.throws(apply, error => error.code === 'CREDENTIALS_UNREADABLE' && !error.message.includes('synthetic-secret'));
    assert.deepEqual(readFileSync(path), original);
    assert.equal(existsSync(credentials.store.root), false);
    assert.equal(existsSync(join(root, 'credential-backups-v1')), false);
  }
  rmSync(`${path}.bak`);
  for (const link of [linkSync, symlinkSync]) {
    link(path, `${path}.bak`);
    assert.throws(apply, { code: 'CREDENTIALS_UNREADABLE' });
    rmSync(`${path}.bak`);
  }
  writeFileSync(`${path}.bak`, original);
  rmSync(path);
  assert.throws(apply, { code: 'CREDENTIALS_UNREADABLE' });
  assert.equal(existsSync(path), false);
});

test('backup failure and a held runtime source lock leave sources and vault unchanged', t => {
  const { root, path, credentials, apply } = fixture(t);
  const original = readFileSync(path);
  withProxyProfilesLock(path, () => assert.throws(apply, { code: 'CXV_LOG_V2_LOCK_TIMEOUT' }));
  writeFileSync(join(root, 'credential-backups-v1'), 'blocked');
  assert.throws(apply, { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  assert.deepEqual(readFileSync(path), original);
  assert.equal(existsSync(credentials.store.root), false);
  assert.equal(existsSync(`${path}.lock`), false);
});

test('failure before either source commit removes inactive staged keys and keeps its recovery snapshot', t => {
  const { root, path, credentials, apply } = fixture(t);
  const originals = [path, `${path}.bak`].map(file => readFileSync(file));
  let failure;
  patchFs('renameSync', rename => (from, to) => {
    if (to === `${path}.bak`) throw new Error('injected rename failure');
    return rename(from, to);
  }, () => assert.throws(apply, error => { failure = error; return error.code === 'CREDENTIAL_MIGRATION_INCOMPLETE'; }));
  assert.deepEqual([path, `${path}.bak`].map(file => readFileSync(file)), originals);
  assert.equal(Object.keys(JSON.parse(readFileSync(credentials.store.file)).creds).length, 0);
  assert.ok(readCredentialBackup(failure.backupPath, { ownerDirectory: root, sources: ['profile.json', 'profile.json.bak'] }));
  assert.equal(isConfigurationMigrated(credentials.store, 'proxy', 'profile.json'), false);
  assert.equal(readdirSync(root).some(name => name.endsWith('.tmp')), false);
  assert.equal(apply().status, 'migrated');
});

test('a current source failure leaves the encrypted backup readable and resumes without replacing its key', t => {
  const { path, credentials, apply, inspect } = fixture(t);
  const current = readFileSync(path);
  patchFs('renameSync', rename => (from, to) => {
    if (to === path) throw new Error('injected current rename failure');
    return rename(from, to);
  }, () => assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' }));
  assert.deepEqual(readFileSync(path), current);
  assert.equal(credentials.readBackup().data.profiles[1].apiKey, 'synthetic-backup-key');
  const backup = JSON.parse(readFileSync(`${path}.bak`));
  assert.equal(inspect().status, 'partial');
  assert.equal(isConfigurationMigrated(credentials.store, 'proxy', 'profile.json'), false);
  assert.equal(apply().status, 'migrated');
  assert.deepEqual(JSON.parse(readFileSync(`${path}.bak`)), backup);
  assert.equal(credentials.read().data.profiles[1].apiKey, 'synthetic-current-key');
});

test('a receipt failure retains both encrypted sources and retry preserves their references', t => {
  const { path, credentials, apply, inspect } = fixture(t);
  let committed = false;
  patchFs('renameSync', rename => (from, to) => {
    if (committed && to === credentials.store.file) throw new Error('injected receipt failure');
    const value = rename(from, to);
    if (to === path) committed = true;
    return value;
  }, () => assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' }));
  assert.equal(inspect().status, 'pending-receipt');
  const documents = [path, `${path}.bak`].map(file => JSON.parse(readFileSync(file)));
  assert.equal(apply().status, 'migrated');
  assert.deepEqual([path, `${path}.bak`].map(file => JSON.parse(readFileSync(file))), documents);
});

test('a post-rename directory fsync failure never retires the backup key that is already active', t => {
  const { path, credentials, apply, inspect } = fixture(t);
  let committed = false;
  patchFs('renameSync', rename => (from, to) => {
    const value = rename(from, to);
    if (to === `${path}.bak`) committed = true;
    return value;
  }, () => patchFs('fsyncSync', fsync => fd => {
    if (committed && fs.fstatSync(fd).isDirectory()) throw new Error('injected directory fsync failure');
    return fsync(fd);
  }, () => assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' })));
  assert.equal(credentials.readBackup().data.profiles[1].apiKey, 'synthetic-backup-key');
  assert.equal(inspect().status, 'partial');
  assert.equal(apply().status, 'migrated');
});

test('missing keys and downgraded backups fail closed without rewriting encrypted sources', t => {
  const { path, credentials, plain, apply } = fixture(t);
  apply();
  const current = readFileSync(path);
  const key = readFileSync(credentials.store.keyPath);
  rmSync(credentials.store.keyPath);
  assert.throws(apply, { code: 'CREDENTIALS_UNREADABLE' });
  assert.deepEqual(readFileSync(path), current);
  assert.equal(existsSync(credentials.store.keyPath), false);
  writeFileSync(credentials.store.keyPath, key, { mode: 0o600 });
  writeFileSync(`${path}.bak`, JSON.stringify(plain));
  assert.throws(apply, { code: 'CREDENTIALS_UNREADABLE' });
  assert.deepEqual(readFileSync(path), current);
});

test('migration preserves other configurations in the same vault and snapshots their matching key', t => {
  const { root, path, credentials, plain, apply } = fixture(t);
  const otherPath = join(root, 'other-profile.json');
  writeFileSync(otherPath, JSON.stringify(plain));
  migrateProxyCredentials(otherPath, { confirmStopped: true });
  const other = createProxyProfileCredentials(otherPath);
  const source = readFileSync(otherPath);
  const key = readFileSync(credentials.store.keyPath);
  credentials.store.set('im-secret', 'synthetic-other-owner', 'independent shared secret');
  const result = apply();
  const backup = readCredentialBackup(result.backupPath, { ownerDirectory: root, sources: ['profile.json', 'profile.json.bak'] });
  assert.deepEqual(backup.get('private-credentials-v1/master.key'), key);
  assert.deepEqual(readFileSync(otherPath), source);
  assert.deepEqual(readFileSync(credentials.store.keyPath), key);
  assert.equal(other.read().data.profiles[1].apiKey, 'synthetic-current-key');
  assert.equal(credentials.store.get('im-secret', 'synthetic-other-owner'), 'independent shared secret');
  assert.throws(() => other.decode(JSON.parse(readFileSync(path))), { code: 'CREDENTIALS_UNREADABLE' });
});

test('a source changed outside the lock is detected before replacement and preserved', t => {
  const { path, credentials, plain, apply } = fixture(t);
  const changed = structuredClone(plain);
  changed.profiles[1].apiKey = 'concurrently changed key';
  const content = JSON.stringify(changed);
  let injected = false;
  patchFs('renameSync', rename => (from, to) => {
    const value = rename(from, to);
    if (!injected && to === credentials.store.file) {
      injected = true;
      writeFileSync(path, content);
    }
    return value;
  }, () => assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' }));
  assert.equal(readFileSync(path, 'utf8'), content);
  assert.equal(isConfigurationMigrated(credentials.store, 'proxy', 'profile.json'), false);
  assert.equal(Object.keys(JSON.parse(readFileSync(credentials.store.file)).creds).length, 0);
  assert.equal(apply().status, 'migrated');
  assert.equal(credentials.read().data.profiles[1].apiKey, 'concurrently changed key');
});

test('CLI is explicitly targeted and read-only by default, with concurrent apply and a fresh-process decoder', async t => {
  const { root, path, credentials } = fixture(t);
  const original = readFileSync(path);
  const inspected = await run(process.execPath, [command, '--profile', path]);
  assert.equal(JSON.parse(inspected.stdout).status, 'legacy');
  assert.deepEqual(readFileSync(path), original);
  assert.equal(existsSync(credentials.store.root), false);
  assert.equal(readdirSync(root).length, 2);
  for (const args of [[], ['--profile', path, '--apply'], ['--profile', path, '--confirm-stopped']]) {
    await assert.rejects(run(process.execPath, [command, ...args]), error => error.code === 1);
  }
  // Runtime lock is nonblocking: concurrent callers either complete or receive
  // a busy error and can explicitly retry, never bypass the shared source lock.
  const results = await Promise.allSettled([1, 2].map(() => run(process.execPath,
    [command, '--profile', path, '--apply', '--confirm-stopped'])));
  assert.ok(results.some(result => result.status === 'fulfilled'));
  for (const result of results) {
    if (result.status === 'rejected') assert.equal(JSON.parse(result.reason.stderr).code, 'CXV_LOG_V2_LOCK_TIMEOUT');
  }
  await run(process.execPath, [command, '--profile', path, '--apply', '--confirm-stopped']);
  const restart = await run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createProxyProfileCredentials } from ${JSON.stringify(new URL('../lib/proxy-profile-credentials.js', import.meta.url).href)};
    const credentials = createProxyProfileCredentials(process.env.MIGRATION_SOURCE);
    assert.equal(credentials.read().data.profiles[1].apiKey, 'synthetic-current-key');
    assert.equal(credentials.readBackup().data.profiles[1].apiKey, 'synthetic-backup-key');
  `], { env: { ...process.env, MIGRATION_SOURCE: path } });
  assert.equal(restart.stderr, '');
});

test('hard process exit between source commits resumes under the existing stale lock protocol', async t => {
  const { path, credentials, apply, inspect } = fixture(t);
  await assert.rejects(run(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      const value = rename(from, to);
      if (to === process.env.MIGRATION_SOURCE + '.bak') process.exit(88);
      return value;
    };
    syncBuiltinESMExports();
    const { migrateProxyCredentials } = await import(${JSON.stringify(new URL('../lib/proxy-credential-migration.js', import.meta.url).href)});
    migrateProxyCredentials(process.env.MIGRATION_SOURCE, { confirmStopped: true });
  `], { env: { ...process.env, MIGRATION_SOURCE: path } }), error => error.code === 88);
  assert.equal(inspect().status, 'partial');
  assert.equal(credentials.readBackup().data.profiles[1].apiKey, 'synthetic-backup-key');
  const previous = JSON.parse(readFileSync(`${path}.bak`));
  // Reuse the 60-second age + dead-owner recovery rule; no sleeping required.
  const old = new Date(Date.now() - 61_000);
  fs.utimesSync(`${path}.lock`, old, old);
  assert.equal(apply().status, 'migrated');
  assert.deepEqual(JSON.parse(readFileSync(`${path}.bak`)), previous);
});
