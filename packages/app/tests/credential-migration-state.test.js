import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCredentialStore } from '../lib/credential-store.js';
import { assertConfigurationFormat, isConfigurationMigrated, markConfigurationMigrated } from '../lib/credential-migration-state.js';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-migration-state-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return createCredentialStore(join(root, 'private'));
}

test('activation is explicit and scoped even when unrelated ciphertext exists', t => {
  const store = fixture(t);
  assert.equal(isConfigurationMigrated(store, 'auth', 'preferences.json'), false);
  assert.equal(existsSync(store.root), false);
  store.set('im-secret', 'fixture', 'synthetic secret');
  assert.equal(isConfigurationMigrated(store, 'auth', 'preferences.json'), false);
  assert.equal(markConfigurationMigrated(store, 'auth', 'preferences.json'), true);
  assert.equal(markConfigurationMigrated(store, 'auth', 'preferences.json'), false);
  assert.equal(isConfigurationMigrated(createCredentialStore(store.root), 'auth', 'preferences.json'), true);
  assert.equal(isConfigurationMigrated(store, 'proxy', 'preferences.json'), false);
  assert.equal(isConfigurationMigrated(store, 'auth', 'other.json'), false);
  assert.doesNotThrow(() => assertConfigurationFormat(store, 'auth', 'preferences.json', 1));
  for (const version of [undefined, null, 0, 2]) {
    assert.throws(() => assertConfigurationFormat(store, 'auth', 'preferences.json', version), { code: 'CREDENTIALS_UNREADABLE' });
  }
});

test('unknown or unreadable activation state cannot be overwritten or treated as never migrated', t => {
  const store = fixture(t);
  const identity = JSON.stringify(['proxy', 'profile.json']);
  store.set('configuration-state', identity, 'migrated-v2');
  const original = readFileSync(store.file);
  assert.throws(() => isConfigurationMigrated(store, 'proxy', 'profile.json'), { code: 'CREDENTIALS_UNREADABLE' });
  assert.throws(() => markConfigurationMigrated(store, 'proxy', 'profile.json'), { code: 'CREDENTIALS_UNREADABLE' });
  assert.deepEqual(readFileSync(store.file), original);
  unlinkSync(store.keyPath);
  assert.throws(() => isConfigurationMigrated(store, 'proxy', 'profile.json'), { code: 'CREDENTIALS_UNREADABLE' });
  assert.equal(existsSync(store.keyPath), false);
});
