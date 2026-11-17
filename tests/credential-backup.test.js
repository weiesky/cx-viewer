import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs, {
  chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  renameSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { createCredentialBackup, readCredentialBackup } from '../lib/credential-backup.js';
import { createCredentialStore } from '../lib/credential-store.js';
import { markConfigurationMigrated, isConfigurationMigrated } from '../lib/credential-migration-state.js';
import { stageSecretReference, readReferencedSecret } from '../lib/credential-reference.js';

const sources = ['preferences.json', 'im/dingtalk/config.json', 'profile.json', 'profile.json.bak'];
const failure = { code: 'CREDENTIAL_BACKUP_UNREADABLE' };
function fixture(t) {
  const owner = mkdtempSync(join(tmpdir(), 'cxv-credential-backup-'));
  t.after(() => rmSync(owner, { recursive: true, force: true }));
  writeFileSync(join(owner, sources[0]), '{"auth":{"password":"synthetic legacy bytes"}}\n');
  const store = createCredentialStore(join(owner, 'private-credentials-v1'));
  const options = { ownerDirectory: owner, sources };
  return { owner, store, options, create: () => createCredentialBackup(owner, sources) };
}

test('private backups preserve exact bytes and explicit absence without creating live keys or source files', t => {
  const { owner, store, options, create } = fixture(t);
  // An established public log root can contain private backup/store subdirectories.
  chmodSync(owner, 0o755);
  const original = readFileSync(join(owner, sources[0]));
  const backup = create();
  const files = readCredentialBackup(backup, options);
  assert.deepEqual(files.get(sources[0]), original);
  for (const name of sources.slice(1)) {
    assert.equal(files.get(name), null);
    assert.equal(existsSync(join(owner, name)), false);
  }
  assert.equal(existsSync(store.root), false);
  assert.equal(files.get('private-credentials-v1/master.key'), null);
  assert.equal(readCredentialBackup(create(), options).size, 6);
  if (process.platform !== 'win32') {
    assert.equal(statSync(dirname(backup)).mode & 0o777, 0o700);
    assert.equal(statSync(backup).mode & 0o777, 0o700);
    for (const name of ['manifest.json', sources[0]]) assert.equal(statSync(join(backup, name)).mode & 0o777, 0o600);
  }
  assert.deepEqual(readFileSync(join(owner, sources[0])), original);
});

test('a saved configuration, key, ciphertext and receipt can be recovered together after live changes', t => {
  const { owner, store, options, create } = fixture(t);
  const ref = stageSecretReference(store, 'lan-password', 'fixture-owner', 'synthetic encrypted secret');
  markConfigurationMigrated(store, 'auth', 'preferences.json');
  mkdirSync(join(owner, 'im/dingtalk'), { recursive: true });
  writeFileSync(join(owner, sources[1]), Buffer.from([0, 255, 10]));
  for (const name of sources.slice(2)) writeFileSync(join(owner, name), '{"apiKey":"synthetic profile key"}');
  const backup = create();
  store.set('lan-password', ref, 'later secret');
  rmSync(join(owner, sources[1]));
  const recovered = join(owner, 'recovered');
  mkdirSync(recovered, { mode: 0o700 });
  for (const [name, bytes] of readCredentialBackup(backup, options)) {
    if (bytes === null) continue;
    const path = join(recovered, name);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, bytes, { mode: 0o600 });
    assert.deepEqual(readFileSync(path), readFileSync(join(backup, name)));
  }
  const recoveredStore = createCredentialStore(join(recovered, 'private-credentials-v1'));
  assert.equal(readReferencedSecret(recoveredStore, 'lan-password', 'fixture-owner', ref), 'synthetic encrypted secret');
  assert.equal(isConfigurationMigrated(recoveredStore, 'auth', 'preferences.json'), true);
  assert.equal(store.get('lan-password', ref), 'later secret');
  assert.deepEqual(readFileSync(join(recovered, sources[1])), Buffer.from([0, 255, 10]));
});

test('corrupt, incomplete, foreign or future backups fail with generic errors and preserve live files', t => {
  const { owner, store, options, create } = fixture(t);
  store.set('im-secret', 'fixture', 'synthetic secret');
  const backup = create();
  const manifestPath = join(backup, 'manifest.json');
  const manifest = readFileSync(manifestPath);
  const sourcePath = join(backup, sources[0]);
  const original = readFileSync(sourcePath);
  writeFileSync(sourcePath, 'private broken fragment');
  assert.throws(() => readCredentialBackup(backup, options), error => error.code === failure.code && !error.message.includes('fragment'));
  writeFileSync(sourcePath, original);
  for (const changes of [{ version: 2 }, { owner: dirname(owner) }, { sources: ['../auth.json'] }, { files: [] }]) {
    writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(manifest), ...changes }));
    assert.throws(() => readCredentialBackup(backup, options), failure);
  }
  // Even a recomputed checksum cannot make a mismatched key recoverable.
  const invalid = JSON.parse(manifest);
  const keyName = 'private-credentials-v1/master.key';
  const key = Buffer.alloc(32);
  writeFileSync(join(backup, keyName), key);
  invalid.files.find(file => file.path === keyName).sha256 = createHash('sha256').update(key).digest('hex');
  writeFileSync(manifestPath, JSON.stringify(invalid));
  assert.throws(() => readCredentialBackup(backup, options), failure);
  assert.deepEqual(readFileSync(join(owner, sources[0])), original);
  assert.equal(store.get('im-secret', 'fixture'), 'synthetic secret');
});

test('unsafe sources, backup locations and permissions are rejected without following links', { skip: process.platform === 'win32' }, t => {
  const { owner, options, create } = fixture(t);
  for (const names of [[], ['../auth.json'], ['/auth.json'], ['a\\b'], ['a', 'a'], ['private-credentials-v1/key'], ['manifest.json']]) {
    assert.throws(() => createCredentialBackup(owner, names), failure);
  }
  assert.equal(existsSync(join(owner, 'credential-backups-v1')), false);
  for (const link of [symlinkSync, linkSync]) {
    link(join(owner, sources[0]), join(owner, 'profile.json'));
    assert.throws(create, failure);
    rmSync(join(owner, 'profile.json'));
  }
  symlinkSync(owner, join(owner, 'im'));
  assert.throws(create, failure);
  rmSync(join(owner, 'im'));
  const backup = create();
  chmodSync(join(backup, sources[0]), 0o644);
  assert.throws(() => readCredentialBackup(backup, options), failure);
  chmodSync(join(backup, sources[0]), 0o600);
  chmodSync(dirname(backup), 0o755);
  assert.throws(create, failure);
  assert.throws(() => readCredentialBackup(backup, options), failure);
});

test('key loss and backup write failures leave live credentials and prior backups untouched', t => {
  const { owner, store, options, create } = fixture(t);
  store.set('im-secret', 'fixture', 'synthetic secret');
  const backup = create();
  const root = dirname(backup);
  const original = readFileSync(store.file);
  const key = readFileSync(store.keyPath);
  rmSync(store.keyPath);
  assert.throws(create, failure);
  assert.equal(existsSync(store.keyPath), false);
  writeFileSync(store.keyPath, key, { mode: 0o600 });
  const write = fs.writeFileSync;
  try {
    fs.writeFileSync = (fd, bytes, ...args) => {
      if (Buffer.isBuffer(bytes) && bytes.equals(readFileSync(join(owner, sources[0])))) throw new Error('injected backup write failure');
      return write(fd, bytes, ...args);
    };
    syncBuiltinESMExports();
    assert.throws(create, failure);
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.deepEqual(readFileSync(store.file), original);
  assert.equal(existsSync(join(store.root, 'credentials.lock')), false);
  assert.deepEqual(readdirSync(root), [backup.split('/').at(-1)]);
  assert.ok(readCredentialBackup(backup, options).get(sources[0]));
});

test('a source replaced during open is rejected before an unverified backup can be returned', t => {
  const { owner, create } = fixture(t);
  const open = fs.openSync;
  const source = join(owner, sources[0]);
  let swapped = false;
  try {
    fs.openSync = (path, ...args) => {
      if (path === source && !swapped) {
        swapped = true;
        writeFileSync(join(owner, 'replacement'), 'replacement secret');
        renameSync(join(owner, 'replacement'), source);
      }
      return open(path, ...args);
    };
    syncBuiltinESMExports();
    assert.throws(create, failure);
  } finally { fs.openSync = open; syncBuiltinESMExports(); }
  assert.equal(swapped, true);
  assert.equal(existsSync(join(owner, 'credential-backups-v1')), false);
});

test('separate processes capture authenticated snapshots while shared-store writers retain their records', async t => {
  const { owner, store, options } = fixture(t);
  store.set('im-secret', 'initial', 'initial secret');
  const run = promisify(execFile);
  const backupUrl = new URL('../lib/credential-backup.js', import.meta.url).href;
  const storeUrl = new URL('../lib/credential-store.js', import.meta.url).href;
  const [one, two] = await Promise.all([
    ...[1, 2].map(() => run(process.execPath, ['--input-type=module', '-e', `
      import { createCredentialBackup, readCredentialBackup } from ${JSON.stringify(backupUrl)};
      const options = JSON.parse(process.env.BACKUP_OPTIONS);
      const backup = createCredentialBackup(options.ownerDirectory, options.sources);
      readCredentialBackup(backup, options);
      process.stdout.write(backup);
    `], { env: { ...process.env, BACKUP_OPTIONS: JSON.stringify(options) } })),
    run(process.execPath, ['--input-type=module', '-e', `
      import { createCredentialStore } from ${JSON.stringify(storeUrl)};
      const store = createCredentialStore(process.env.BACKUP_STORE);
      for (let i = 0; i < 10; i++) store.set('im-secret', 'concurrent-' + i, 'secret-' + i);
    `], { env: { ...process.env, BACKUP_STORE: store.root } }),
  ]);
  assert.notEqual(one.stdout, two.stdout);
  for (const result of [one, two]) assert.ok(readCredentialBackup(result.stdout, options).get('private-credentials-v1/master.key'));
  for (let i = 0; i < 10; i++) assert.equal(store.get('im-secret', 'concurrent-' + i), 'secret-' + i);
  assert.deepEqual(readFileSync(join(owner, sources[0])), readCredentialBackup(one.stdout, options).get(sources[0]));
});
