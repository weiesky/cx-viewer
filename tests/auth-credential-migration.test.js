import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = mkdtempSync(join(tmpdir(), 'cxv-auth-migration-'));
process.env.CXV_LOG_DIR = root;
const auth = await import('../lib/auth.js');
const { createCredentialStore } = await import('../lib/credential-store.js');
const { isConfigurationMigrated } = await import('../lib/credential-migration-state.js');
const { readCredentialBackup } = await import('../lib/credential-backup.js');
const store = createCredentialStore(join(root, 'private-credentials-v1'));
const path = join(root, 'preferences.json');
const command = fileURLToPath(new URL('../scripts/migrate-auth-credentials.mjs', import.meta.url));
const run = promisify(execFile);
const apply = () => auth.migrateAuthCredentials({ confirmStopped: true });
beforeEach(() => { rmSync(root, { recursive: true, force: true }); mkdirSync(root, { mode: 0o700 }); });
after(() => rmSync(root, { recursive: true, force: true }));
function seed() {
  const config = (password, revision, enabled = true) => ({ password: Buffer.from(password).toString('base64'), revision, enabled });
  const prefs = { theme: 'dark', extra: { keep: [1, false, null] }, auth: config('\ufeff空 格 secret', 9),
    authByProject: { '/z/project': config('project-Z', 7), '/a/project': config('', 3),
      ...JSON.parse('{"__proto__":{"enabled":false,"password":"","revision":2}}') } };
  writeFileSync(path, `${JSON.stringify(prefs, null, 2)}\n`);
  return prefs;
}

test('explicit migration preserves global/project semantics, revisions and unrelated fields with a verified pre-migration backup', () => {
  const prefs = seed();
  const original = readFileSync(path);
  assert.deepEqual(auth.inspectAuthCredentialMigration(), { status: 'legacy', scopes: 4 });
  assert.equal(existsSync(store.root), false);
  assert.throws(() => auth.migrateAuthCredentials(), { code: 'CREDENTIAL_MIGRATION_REQUIRES_STOPPED' });
  const result = apply();
  assert.equal(result.status, 'migrated');
  assert.equal(result.scopes, 4);
  assert.deepEqual(readCredentialBackup(result.backupPath, { ownerDirectory: root, sources: ['preferences.json'] }).get('preferences.json'), original);
  const stored = JSON.parse(readFileSync(path));
  assert.equal(stored[auth.AUTH_CREDENTIAL_VERSION_FIELD], 1);
  assert.deepEqual(stored.extra, prefs.extra);
  assert.equal(stored.theme, 'dark');
  assert.equal(stored.auth.revision, 9);
  assert.equal(auth.loadAuthConfig().password, '\ufeff空 格 secret');
  assert.equal(auth.loadAuthConfig('/z/project').password, 'project-Z');
  assert.equal(auth.loadAuthConfig('/a/project').password, '');
  assert.equal(auth.loadAuthConfig('__proto__').enabled, false);
  for (const item of [stored.auth, ...Object.values(stored.authByProject)]) assert.equal(Object.hasOwn(item, 'password'), false);
  for (const file of [path, store.file]) {
    for (const secret of ['project-Z', '\ufeff空 格 secret', prefs.auth.password]) assert.ok(!readFileSync(file, 'utf8').includes(secret));
  }
  assert.equal(isConfigurationMigrated(store, 'auth', 'preferences.json'), true);
  const after = readFileSync(path);
  const vault = readFileSync(store.file);
  assert.deepEqual(apply(), { status: 'migrated', scopes: 4, backupPath: null });
  assert.deepEqual(readFileSync(path), after);
  assert.deepEqual(readFileSync(store.file), vault);
  assert.equal(readdirSync(join(root, 'credential-backups-v1')).length, 1);
});

test('absent credentials remain absent and invalid legacy configurations are never overwritten or marked migrated', () => {
  writeFileSync(path, '{"theme":"dark"}');
  assert.deepEqual(apply(), { status: 'absent', scopes: 0, backupPath: null });
  assert.equal(readFileSync(path, 'utf8'), '{"theme":"dark"}');
  assert.equal(existsSync(store.root), false);
  for (const corrupt of ['{broken', '{"authByProject":[]}', '{"auth":{"enabled":true,"password":"%%%"}}',
    '{"auth":{"passwordRef":"stray"}}', '{"_cxvAuthCredentialVersion":2}', '[]']) {
    writeFileSync(path, corrupt);
    assert.throws(apply, { code: 'PASSWORD_UNREADABLE' });
    assert.equal(readFileSync(path, 'utf8'), corrupt);
    assert.equal(existsSync(store.root), false);
    assert.equal(existsSync(join(root, 'credential-backups-v1')), false);
  }
});

test('a failed source rename keeps legacy bytes readable and retires staged passwords while retaining its recovery backup', () => {
  seed();
  const original = readFileSync(path);
  const rename = fs.renameSync;
  let error;
  try {
    fs.renameSync = (from, to) => {
      if (to === path) throw Object.assign(new Error('injected source commit failure'), { code: 'EIO' });
      return rename(from, to);
    };
    syncBuiltinESMExports();
    assert.throws(apply, value => { error = value; return value.code === 'CREDENTIAL_MIGRATION_INCOMPLETE'; });
  } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
  assert.deepEqual(readFileSync(path), original);
  assert.equal(auth.loadAuthConfig().password, '\ufeff空 格 secret');
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file)).creds).length, 0);
  assert.ok(readCredentialBackup(error.backupPath, { ownerDirectory: root, sources: ['preferences.json'] }));
  assert.equal(existsSync(`${path}.lock`), false);
  assert.equal(readdirSync(root).some(name => name.includes('.tmp-')), false);
  assert.equal(apply().status, 'migrated');
});

test('a receipt write failure keeps the committed encrypted source usable and a retry completes without replacing passwords', () => {
  seed();
  const rename = fs.renameSync;
  let sourceCommitted = false;
  try {
    fs.renameSync = (from, to) => {
      if (sourceCommitted && to === store.file) throw Object.assign(new Error('injected receipt failure'), { code: 'EIO' });
      const result = rename(from, to);
      if (to === path) sourceCommitted = true;
      return result;
    };
    syncBuiltinESMExports();
    assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' });
  } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
  assert.equal(auth.loadAuthConfig().password, '\ufeff空 格 secret');
  assert.deepEqual(auth.inspectAuthCredentialMigration(), { status: 'pending-receipt', scopes: 4 });
  const refs = JSON.parse(readFileSync(path));
  assert.equal(apply().status, 'migrated');
  assert.deepEqual(JSON.parse(readFileSync(path)), refs);
  assert.equal(auth.inspectAuthCredentialMigration().status, 'migrated');
});

test('a directory fsync failure after source commit retains its referenced secrets for recovery', () => {
  seed();
  const rename = fs.renameSync;
  const fsync = fs.fsyncSync;
  let committed = false;
  try {
    fs.renameSync = (from, to) => {
      const result = rename(from, to);
      if (to === path) committed = true;
      return result;
    };
    fs.fsyncSync = fd => {
      if (committed && fs.fstatSync(fd).isDirectory()) throw new Error('injected directory fsync failure');
      return fsync(fd);
    };
    syncBuiltinESMExports();
    assert.throws(apply, { code: 'CREDENTIAL_MIGRATION_INCOMPLETE' });
  } finally { fs.renameSync = rename; fs.fsyncSync = fsync; syncBuiltinESMExports(); }
  assert.equal(auth.loadAuthConfig().password, '\ufeff空 格 secret');
  assert.equal(auth.inspectAuthCredentialMigration().status, 'pending-receipt');
  assert.equal(apply().status, 'migrated');
});

test('CLI inspection is read-only and two explicit migration processes serialize then survive restart', async () => {
  seed();
  const original = readFileSync(path);
  const inspected = await run(process.execPath, [command, '--root', root]);
  assert.deepEqual(JSON.parse(inspected.stdout), { mode: 'inspect', status: 'legacy', scopes: 4 });
  assert.deepEqual(readFileSync(path), original);
  assert.equal(existsSync(store.root), false);
  assert.equal(existsSync(`${path}.lock`), false);
  const results = await Promise.all([1, 2].map(() => run(process.execPath, [command, '--root', root, '--apply', '--confirm-stopped'])));
  const reports = results.map(result => JSON.parse(result.stdout));
  assert.ok(reports.every(result => result.status === 'migrated'));
  assert.equal(reports.filter(result => result.backupPath !== null).length, 1);
  assert.equal(Object.keys(JSON.parse(readFileSync(store.file)).creds).length, 5);
  const restart = await run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { loadAuthConfig } from ${JSON.stringify(new URL('../lib/auth.js', import.meta.url).href)};
    assert.equal(loadAuthConfig().password, '\\ufeff空 格 secret');
    assert.equal(loadAuthConfig('/z/project').password, 'project-Z');
  `], { env: { ...process.env, CXV_LOG_DIR: root } });
  assert.equal(restart.stderr, '');
  assert.ok(!results.some(result => result.stdout.includes('secret') || result.stderr.includes('secret')));
});

test('missing confirmation or an explicit root is rejected by the CLI before opening configuration', async () => {
  seed();
  const original = readFileSync(path);
  for (const args of [[], ['--root', root, '--apply'], ['--root', root, '--confirm-stopped']]) {
    await assert.rejects(run(process.execPath, [command, ...args]), error => error.code === 1);
  }
  assert.deepEqual(readFileSync(path), original);
  assert.equal(existsSync(store.root), false);
});

test('a process terminated after the source rename leaves decryptable passwords and can complete the receipt after restart', async () => {
  seed();
  await assert.rejects(run(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => {
      const result = rename(from, to);
      if (to === process.env.MIGRATION_SOURCE) process.exit(88);
      return result;
    };
    syncBuiltinESMExports();
    const { migrateAuthCredentials } = await import(${JSON.stringify(new URL('../lib/auth.js', import.meta.url).href)});
    migrateAuthCredentials({ confirmStopped: true });
  `], { env: { ...process.env, CXV_LOG_DIR: root, MIGRATION_SOURCE: path } }), error => error.code === 88);
  const committed = JSON.parse(readFileSync(path));
  assert.equal(auth.loadAuthConfig().password, '\ufeff空 格 secret');
  assert.equal(auth.inspectAuthCredentialMigration().status, 'pending-receipt');
  // The existing preferences lock is age-based; model its documented expiry.
  const old = new Date(Date.now() - 11_000);
  fs.utimesSync(`${path}.lock`, old, old);
  const restarted = await run(process.execPath, [command, '--root', root, '--apply', '--confirm-stopped']);
  assert.equal(JSON.parse(restarted.stdout).status, 'migrated');
  assert.deepEqual(JSON.parse(readFileSync(path)), committed);
  assert.equal(auth.loadAuthConfig('/a/project').password, '');
});

test('backup failure, lost keys and downgraded sources cannot trigger migration writes', () => {
  seed();
  const original = readFileSync(path);
  writeFileSync(join(root, 'credential-backups-v1'), 'blocked backup directory');
  assert.throws(apply, { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
  assert.deepEqual(readFileSync(path), original);
  assert.equal(existsSync(store.root), false);
  rmSync(join(root, 'credential-backups-v1'));
  apply();
  const migrated = readFileSync(path);
  const key = readFileSync(store.keyPath);
  rmSync(store.keyPath);
  assert.throws(apply, { code: 'PASSWORD_UNREADABLE' });
  assert.deepEqual(readFileSync(path), migrated);
  assert.equal(existsSync(store.keyPath), false);
  writeFileSync(store.keyPath, key, { mode: 0o600 });
  writeFileSync(path, original);
  assert.throws(apply, { code: 'PASSWORD_UNREADABLE' });
  assert.deepEqual(readFileSync(path), original);
});
