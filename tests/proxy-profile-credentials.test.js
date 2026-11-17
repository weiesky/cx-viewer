import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProxyProfileCredentials, PROXY_CREDENTIAL_VERSION_FIELD } from '../lib/proxy-profile-credentials.js';
import { stageSecretReference } from '../lib/credential-reference.js';
import { markConfigurationMigrated } from '../lib/credential-migration-state.js';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-profile-credentials-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const credentials = createProxyProfileCredentials(join(root, 'profile.json'));
  const plain = { version: 3, active: 'third-party', profiles: [
    { id: 'max', name: 'Default' },
    { id: 'third-party', name: 'Provider', baseURL: 'https://provider.example/v1', apiKey: 'synthetic key', wireApi: 'responses' },
  ] };
  return { root, credentials, plain };
}

function encrypted(credentials, plain) {
  return { ...plain, [PROXY_CREDENTIAL_VERSION_FIELD]: 1,
    profiles: plain.profiles.map(({ apiKey, ...profile }) => profile.id === 'max' ? profile : {
      ...profile, apiKeyRef: stageSecretReference(credentials.store, 'profile-apiKey', credentials.ownerFor(profile.id), apiKey),
    }),
  };
}

test('profile decoding preserves legacy behavior without creating a vault and hydrates only explicitly migrated references', t => {
  const { credentials, plain } = fixture(t);
  const expected = credentials.decode(plain);
  assert.equal(existsSync(credentials.store.root), false);
  const stored = encrypted(credentials, plain);
  const original = JSON.stringify(stored);
  assert.deepEqual(credentials.decode(stored), expected);
  assert.equal(JSON.stringify(stored), original);
  assert.ok(!original.includes('synthetic key'));
  assert.ok(!readFileSync(credentials.store.file, 'utf8').includes('synthetic key'));
});

test('profile refs cannot cross profile ids or configuration filenames in a shared directory', t => {
  const { root, credentials, plain } = fixture(t);
  const stored = encrypted(credentials, plain);
  const otherConfig = createProxyProfileCredentials(join(root, 'other-profile.json'));
  assert.equal(otherConfig.store.root, credentials.store.root);
  assert.throws(() => otherConfig.decode(stored), { code: 'CREDENTIALS_UNREADABLE' });
  const renamed = structuredClone(stored);
  renamed.active = renamed.profiles[1].id = 'other-id';
  assert.throws(() => credentials.decode(renamed), { code: 'CREDENTIALS_UNREADABLE' });
  assert.deepEqual(createProxyProfileCredentials(join(root, 'profile.json')).decode(stored), credentials.decode(plain));
});

test('unknown formats, missing keys, missing refs and reintroduced plaintext never fall back to an official or empty key', t => {
  const { credentials, plain } = fixture(t);
  const stored = encrypted(credentials, plain);
  const variants = [
    { ...stored, [PROXY_CREDENTIAL_VERSION_FIELD]: 2 },
    { ...stored, [PROXY_CREDENTIAL_VERSION_FIELD]: undefined },
    { ...stored, profiles: [stored.profiles[0], { ...stored.profiles[1], apiKey: 'legacy key' }] },
    { ...stored, profiles: [stored.profiles[0], { ...stored.profiles[1], apiKeyRef: 'missing' }] },
  ];
  for (const document of variants) assert.throws(() => credentials.decode(document), { code: 'CREDENTIALS_UNREADABLE' });
  unlinkSync(credentials.store.keyPath);
  assert.throws(() => credentials.decode(stored), { code: 'CREDENTIALS_UNREADABLE' });
  assert.equal(existsSync(credentials.store.keyPath), false);
});

test('profile saves retain the active and latest backup versions and retire only overwritten backup keys', t => {
  const { credentials, plain } = fixture(t);
  let current = encrypted(credentials, plain);
  const firstRef = current.profiles[1].apiKeyRef;
  let backup = null;
  const save = key => {
    const next = structuredClone(plain);
    next.profiles[1].apiKey = key;
    credentials.save(next, current, backup, stored => { backup = current; current = stored; });
  };
  save('second key');
  assert.equal(credentials.decode(current).profiles[1].apiKey, 'second key');
  assert.equal(credentials.decode(backup).profiles[1].apiKey, 'synthetic key');
  save('third key');
  assert.equal(credentials.decode(current).profiles[1].apiKey, 'third key');
  assert.equal(credentials.decode(backup).profiles[1].apiKey, 'second key');
  assert.equal(credentials.store.get('profile-apiKey', firstRef), null);
  assert.equal(Object.keys(JSON.parse(readFileSync(credentials.store.file, 'utf8')).creds).length, 2);
});

test('failed source commits retain the active key and remove newly staged ciphertext', t => {
  const { credentials, plain } = fixture(t);
  const current = encrypted(credentials, plain);
  const original = readFileSync(credentials.store.file);
  const next = structuredClone(plain);
  next.profiles[1].apiKey = 'new key';
  assert.throws(() => credentials.save(next, current, null, () => { throw new Error('test source failure'); }), /test source failure/);
  assert.deepEqual(readFileSync(credentials.store.file), original);
  assert.equal(credentials.decode(current).profiles[1].apiKey, 'synthetic key');
});

test('unchanged keys reuse their references while damaged backups cannot be silently overwritten', t => {
  const { credentials, plain } = fixture(t);
  const current = encrypted(credentials, plain);
  const original = readFileSync(credentials.store.file);
  let writes = 0;
  const saved = credentials.save(plain, current, null, () => { writes++; });
  assert.equal(saved.profiles[1].apiKeyRef, current.profiles[1].apiKeyRef);
  assert.deepEqual(readFileSync(credentials.store.file), original);
  const brokenBackup = structuredClone(current);
  brokenBackup.profiles[1].apiKeyRef = 'missing';
  assert.throws(() => credentials.save(plain, current, brokenBackup, () => { writes++; }), { code: 'CREDENTIALS_UNREADABLE' });
  assert.equal(writes, 1);
  assert.deepEqual(readFileSync(credentials.store.file), original);
});

test('saving an unmigrated profile does not activate encryption or create credential files', t => {
  const { credentials, plain } = fixture(t);
  let result;
  credentials.save(plain, plain, null, stored => { result = stored; });
  assert.equal(result.profiles[1].apiKey, 'synthetic key');
  assert.equal(Object.hasOwn(result, PROXY_CREDENTIAL_VERSION_FIELD), false);
  assert.equal(existsSync(credentials.store.root), false);
});

test('activated profiles reject missing or downgraded sources while a missing optional backup remains absent', t => {
  const { root, credentials, plain } = fixture(t);
  const stored = encrypted(credentials, plain);
  markConfigurationMigrated(credentials.store, 'proxy', 'profile.json');
  assert.throws(() => credentials.read(), { code: 'CREDENTIALS_UNREADABLE' });
  const path = join(root, 'profile.json');
  writeFileSync(path, JSON.stringify(plain));
  assert.throws(() => credentials.read(), { code: 'CREDENTIALS_UNREADABLE' });
  assert.throws(() => credentials.save(plain, plain, null, () => assert.fail('must not commit')),
    { code: 'CREDENTIALS_UNREADABLE' });
  writeFileSync(path, JSON.stringify(stored));
  assert.equal(credentials.read().data.profiles[1].apiKey, 'synthetic key');
  assert.throws(() => credentials.readBackup(), { code: 'ENOENT' });
  assert.equal(existsSync(`${path}.bak`), false);
});
