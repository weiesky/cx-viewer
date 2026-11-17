import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = mkdtempSync(join(tmpdir(), 'cxv-key-repair-'));
process.env.CXV_LOG_DIR = root;
const { inspectCredentialKeyRepair, repairCredentialKey } = await import('../lib/credential-key-repair.js');
const auth = await import('../lib/auth.js');
const im = await import('../lib/dingtalk-im-config.js');
const { createProxyProfileCredentials } = await import('../lib/proxy-profile-credentials.js');
const { migrateProxyCredentials } = await import('../lib/proxy-credential-migration.js');
const { createCredentialStore } = await import('../lib/credential-store.js');
const { createCredentialBackup, readCredentialBackup, readCredentialDamageEvidence } = await import('../lib/credential-backup.js');
const { encryptSecret } = await import('../lib/credential-vault.js');
const store = createCredentialStore(join(root, 'private-credentials-v1'));
const sources = ['preferences.json', 'profile.json', 'profile.json.bak', 'im/dingtalk/config.json'];
const command = fileURLToPath(new URL('../scripts/repair-credential-key.mjs', import.meta.url));
const run = promisify(execFile);
beforeEach(() => { rmSync(root, { recursive: true, force: true }); mkdirSync(root, { mode: 0o700 }); });
after(() => rmSync(root, { recursive: true, force: true }));
const snapshotCount = () => readdirSync(join(root, 'credential-backups-v1')).length;
function patchFs(method, replacement, callback) {
  const original = fs[method];
  try { fs[method] = replacement(original); syncBuiltinESMExports(); return callback(); }
  finally { fs[method] = original; syncBuiltinESMExports(); }
}
function seed() {
  writeFileSync(join(root, sources[0]), JSON.stringify({ theme: 'current',
    auth: { enabled: true, password: Buffer.from('old-auth').toString('base64'), revision: 1 } }));
  auth.migrateAuthCredentials({ confirmStopped: true });
  const profilePath = join(root, 'profile.json');
  const document = { version: 3, active: 'third', profiles: [{ id: 'max', name: 'Default' },
    { id: 'third', name: 'Provider', baseURL: 'https://provider.example/v1', apiKey: 'old-profile', wireApi: 'responses' }] };
  writeFileSync(profilePath, JSON.stringify(document));
  writeFileSync(`${profilePath}.bak`, JSON.stringify(document));
  migrateProxyCredentials(profilePath, { confirmStopped: true });
  im.saveDingTalkImConfig({ enabled: false, appKey: 'old-app', appSecret: 'old-im' });
  im.migrateDingTalkCredentials({ confirmStopped: true });
  const backupPath = createCredentialBackup(root, sources);
  // These later updates and an entirely new owner are absent from the backup.
  auth.saveAuthConfig({ enabled: true, password: 'new-auth' });
  im.saveDingTalkImConfig({ enabled: false, appKey: 'new-app', appSecret: 'new-im' });
  const proxy = createProxyProfileCredentials(profilePath);
  const current = proxy.read(), backup = proxy.readBackup();
  const next = { ...current.data, profiles: current.data.profiles.map(profile =>
    profile.id === 'max' ? profile : { ...profile, apiKey: 'new-profile' }) };
  proxy.save(next, current.document, backup.document, stored => {
    writeFileSync(`${profilePath}.bak`, current.raw, { mode: 0o600 });
    writeFileSync(profilePath, JSON.stringify(stored), { mode: 0o600 });
  });
  const otherPath = join(root, 'other-profile.json');
  document.profiles[1].apiKey = 'new-owner-secret';
  writeFileSync(otherPath, JSON.stringify(document));
  migrateProxyCredentials(otherPath, { confirmStopped: true });
  const other = createProxyProfileCredentials(otherPath);
  const options = { ownerDirectory: root, backupPath, sources };
  return { options, key: readFileSync(store.keyPath), bytes: readFileSync(store.file), proxy, other,
    sourceBytes: [...sources, 'other-profile.json'].map(name => [name, readFileSync(join(root, name))]),
    apply: () => repairCredentialKey({ ...options, confirmStopped: true }) };
}
function assertCurrent(fixture) {
  assert.equal(auth.loadAuthConfig().password, 'new-auth');
  assert.equal(im.loadDingTalkImConfig().appSecret, 'new-im');
  assert.equal(fixture.proxy.read().data.profiles[1].apiKey, 'new-profile');
  assert.equal(fixture.other.read().data.profiles[1].apiKey, 'new-owner-secret');
  assert.deepEqual(readFileSync(store.file), fixture.bytes);
  for (const [name, bytes] of fixture.sourceBytes) assert.deepEqual(readFileSync(join(root, name)), bytes);
}

test('missing, malformed and wrong keys are repaired without rolling back any later current credential or source', () => {
  const fixture = seed();
  const records = Object.keys(JSON.parse(fixture.bytes).creds).length;
  for (const broken of [null, Buffer.from('bad-key'), Buffer.alloc(32)]) {
    rmSync(store.keyPath);
    if (broken !== null) writeFileSync(store.keyPath, broken, { mode: 0o600 });
    assert.equal(auth.loadAuthConfig().passwordUnreadable, true);
    const count = snapshotCount();
    assert.deepEqual(inspectCredentialKeyRepair(fixture.options), { status: 'repairable', scope: 'key-only', records });
    assert.equal(snapshotCount(), count);
    assert.equal(existsSync(store.keyPath), broken !== null);
    assert.throws(() => repairCredentialKey(fixture.options), { code: 'CREDENTIAL_KEY_REPAIR_REQUIRES_STOPPED' });
    const result = fixture.apply();
    assert.equal(result.status, 'repaired');
    const evidence = readCredentialDamageEvidence(result.evidencePath, { ownerDirectory: root, sources });
    assert.deepEqual(evidence.get('private-credentials-v1/master.key'), broken);
    assert.deepEqual(evidence.get('private-credentials-v1/credentials.json'), fixture.bytes);
    assert.throws(() => readCredentialBackup(result.evidencePath, { ownerDirectory: root, sources }), { code: 'CREDENTIAL_BACKUP_UNREADABLE' });
    assert.deepEqual(readFileSync(store.keyPath), fixture.key);
    assertCurrent(fixture);
    const after = snapshotCount();
    assert.deepEqual(fixture.apply(), { status: 'healthy', scope: 'key-only', records, evidencePath: null });
    assert.equal(snapshotCount(), after);
  }
});

test('a candidate key from before a real key change cannot overwrite a later store', () => {
  const fixture = seed();
  rmSync(store.root, { recursive: true, force: true });
  store.set('im-secret', 'new-key-owner', 'new-key-secret');
  const current = readFileSync(store.file);
  rmSync(store.keyPath);
  const count = snapshotCount();
  assert.throws(() => inspectCredentialKeyRepair(fixture.options), { code: 'CREDENTIAL_KEY_REPAIR_UNREADABLE' });
  assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_UNREADABLE' });
  assert.equal(snapshotCount(), count);
  assert.equal(existsSync(store.keyPath), false);
  assert.deepEqual(readFileSync(store.file), current);
});

test('proof fails if even one current record outside the backup is damaged', () => {
  const fixture = seed();
  const corrupted = JSON.parse(fixture.bytes);
  const ids = Object.keys(corrupted.creds);
  [corrupted.creds[ids[0]], corrupted.creds[ids.at(-1)]] = [corrupted.creds[ids.at(-1)], corrupted.creds[ids[0]]];
  const bytes = Buffer.from(JSON.stringify(corrupted));
  writeFileSync(store.file, bytes, { mode: 0o600 });
  rmSync(store.keyPath);
  const count = snapshotCount();
  assert.throws(fixture.apply, error => error.code === 'CREDENTIAL_KEY_REPAIR_UNREADABLE' && !error.message.includes('new-owner-secret'));
  assert.equal(snapshotCount(), count);
  assert.deepEqual(readFileSync(store.file), bytes);
  assert.equal(existsSync(store.keyPath), false);
});

test('missing or empty stores cannot supply a key proof, while an unchanged healthy empty store needs no repair', () => {
  const fixture = seed();
  writeFileSync(store.file, '{"version":1,"creds":{}}', { mode: 0o600 });
  const count = snapshotCount();
  assert.equal(fixture.apply().status, 'healthy');
  assert.equal(snapshotCount(), count);
  rmSync(store.keyPath);
  assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_UNREADABLE' });
  assert.equal(existsSync(store.keyPath), false);
  rmSync(store.file);
  assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_UNREADABLE' });
  assert.equal(existsSync(store.file), false);
});

test('unsafe key aliases and damage-evidence failures leave the original bytes untouched', () => {
  const fixture = seed();
  const alias = join(root, 'key-alias');
  fs.linkSync(store.keyPath, alias);
  assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_UNREADABLE' });
  assert.deepEqual(readFileSync(alias), fixture.key);
  rmSync(alias);
  rmSync(store.keyPath);
  fs.symlinkSync(join(root, 'absent-key'), store.keyPath);
  assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_UNREADABLE' });
  assert.equal(fs.lstatSync(store.keyPath).isSymbolicLink(), true);
  rmSync(store.keyPath);
  const count = snapshotCount();
  patchFs('mkdtempSync', create => (prefix, ...args) => {
    if (prefix.startsWith(join(root, 'credential-backups-v1', 'snapshot-'))) throw new Error('injected evidence failure');
    return create(prefix, ...args);
  }, () => assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_UNREADABLE' }));
  assert.equal(snapshotCount(), count);
  assert.equal(existsSync(store.keyPath), false);
  assert.deepEqual(readFileSync(store.file), fixture.bytes);
});

test('a key rename failure preserves the broken key and retains verified private damage evidence', () => {
  const fixture = seed();
  writeFileSync(store.keyPath, 'bad-key', { mode: 0o600 });
  let failure;
  patchFs('renameSync', rename => (from, to) => {
    if (to === store.keyPath) throw new Error('injected key rename failure');
    return rename(from, to);
  }, () => assert.throws(fixture.apply, error => { failure = error; return error.code === 'CREDENTIAL_KEY_REPAIR_INCOMPLETE'; }));
  assert.equal(readFileSync(store.keyPath, 'utf8'), 'bad-key');
  assert.deepEqual(readCredentialDamageEvidence(failure.evidencePath, { ownerDirectory: root, sources })
    .get('private-credentials-v1/credentials.json'), fixture.bytes);
  assert.ok(!readdirSync(store.root).some(name => name.endsWith('.tmp')));
  assert.equal(fixture.apply().status, 'repaired');
  assertCurrent(fixture);
});

test('post-rename directory fsync failure retains the good key and a healthy retry completes durability', () => {
  const fixture = seed();
  rmSync(store.keyPath);
  let committed = false;
  let failure;
  patchFs('renameSync', rename => (from, to) => {
    const value = rename(from, to);
    if (to === store.keyPath) committed = true;
    return value;
  }, () => patchFs('fsyncSync', fsync => fd => {
    if (committed && fs.fstatSync(fd).isDirectory()) throw new Error('injected key directory fsync failure');
    return fsync(fd);
  }, () => assert.throws(fixture.apply, error => { failure = error; return error.code === 'CREDENTIAL_KEY_REPAIR_INCOMPLETE'; })));
  assert.ok(failure.evidencePath);
  assertCurrent(fixture);
  const count = snapshotCount();
  let directoriesSynced = 0;
  patchFs('fsyncSync', fsync => fd => {
    if (fs.fstatSync(fd).isDirectory()) directoriesSynced++;
    return fsync(fd);
  }, () => assert.equal(fixture.apply().status, 'healthy'));
  assert.ok(directoriesSynced > 0);
  assert.equal(snapshotCount(), count);
});

test('a store changed between evidence capture and the final lock is preserved and requires a retry', () => {
  const fixture = seed();
  rmSync(store.keyPath);
  const changed = JSON.parse(fixture.bytes);
  const identity = { kind: 'im-secret', ref: 'outside-writer' };
  changed.creds[JSON.stringify([identity.kind, identity.ref])] = encryptSecret(fixture.key, 'outside-secret', identity);
  const changedBytes = Buffer.from(JSON.stringify(changed));
  const lockPath = join(store.root, 'credentials.lock');
  let locks = 0;
  patchFs('openSync', open => (path, flags, ...args) => {
    const fd = open(path, flags, ...args);
    if (path === lockPath && flags === 'wx' && ++locks === 2) writeFileSync(store.file, changedBytes);
    return fd;
  }, () => assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_INCOMPLETE' }));
  assert.deepEqual(readFileSync(store.file), changedBytes);
  assert.equal(existsSync(store.keyPath), false);
  assert.equal(fixture.apply().status, 'repaired');
  assert.equal(store.get(identity.kind, identity.ref), 'outside-secret');
  assert.deepEqual(readFileSync(store.file), changedBytes);
});

test('a selected source changed outside the lock is preserved and prevents the key switch', () => {
  const fixture = seed();
  rmSync(store.keyPath);
  const lockPath = join(store.root, 'credentials.lock');
  const path = join(root, sources[0]);
  let locks = 0;
  patchFs('openSync', open => (target, flags, ...args) => {
    const fd = open(target, flags, ...args);
    if (target === lockPath && flags === 'wx' && ++locks === 2) writeFileSync(path, 'outside-source');
    return fd;
  }, () => assert.throws(fixture.apply, { code: 'CREDENTIAL_KEY_REPAIR_INCOMPLETE' }));
  assert.equal(readFileSync(path, 'utf8'), 'outside-source');
  assert.equal(existsSync(store.keyPath), false);
  assert.deepEqual(readFileSync(store.file), fixture.bytes);
});

test('CLI requires explicit scope and confirmation, inspects without writes and serializes concurrent repairs', async () => {
  const fixture = seed();
  rmSync(store.keyPath);
  const args = ['--root', root, '--backup', fixture.options.backupPath, ...sources.flatMap(source => ['--source', source])];
  const count = snapshotCount();
  const preview = await run(process.execPath, [command, ...args]);
  assert.equal(JSON.parse(preview.stdout).status, 'repairable');
  assert.equal(snapshotCount(), count);
  assert.equal(existsSync(store.keyPath), false);
  for (const invalid of [[], [...args, '--apply'], [...args, '--confirm-stopped'], [...args, '--source', '../private']]) {
    await assert.rejects(run(process.execPath, [command, ...invalid]), error => error.code === 1 && !error.stderr.includes('new-auth'));
  }
  const results = await Promise.all([1, 2].map(() => run(process.execPath, [command, ...args, '--apply', '--confirm-stopped'])));
  assert.ok(results.every(result => ['healthy', 'repaired'].includes(JSON.parse(result.stdout).status)));
  assertCurrent(fixture);
  const restart = await run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { loadAuthConfig } = await import(${JSON.stringify(new URL('../lib/auth.js', import.meta.url).href)});
    const { loadDingTalkImConfig } = await import(${JSON.stringify(new URL('../lib/dingtalk-im-config.js', import.meta.url).href)});
    assert.equal(loadAuthConfig().password,'new-auth');
    assert.equal(loadDingTalkImConfig().appSecret,'new-im');
  `], { env: { ...process.env, CXV_LOG_DIR: root } });
  assert.equal(restart.stderr, '');
});

test('a hard exit after key rename leaves current credentials readable and can finish after stale lock recovery', async () => {
  const fixture = seed();
  rmSync(store.keyPath);
  await assert.rejects(run(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const rename=fs.renameSync;
    fs.renameSync=(from,to)=>{const result=rename(from,to);if(to===process.env.KEY_PATH)process.exit(88);return result;};
    syncBuiltinESMExports();
    const { repairCredentialKey }=await import(${JSON.stringify(new URL('../lib/credential-key-repair.js', import.meta.url).href)});
    repairCredentialKey({...JSON.parse(process.env.REPAIR_OPTIONS),confirmStopped:true});
  `], { env: { ...process.env, KEY_PATH: store.keyPath, REPAIR_OPTIONS: JSON.stringify(fixture.options) } }), error => error.code === 88);
  assertCurrent(fixture);
  assert.equal(inspectCredentialKeyRepair(fixture.options).status, 'healthy');
  const old = new Date(Date.now() - 61_000);
  fs.utimesSync(join(store.root, 'credentials.lock'), old, old);
  assert.equal(fixture.apply().status, 'healthy');
  assertCurrent(fixture);
});
