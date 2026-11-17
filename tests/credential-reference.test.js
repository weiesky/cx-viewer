import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCredentialStore } from '../lib/credential-store.js';
import { readReferencedSecret, stageSecretReference, removeSecretReference } from '../lib/credential-reference.js';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-credential-ref-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return createCredentialStore(join(root, 'private'));
}

test('staging a new secret keeps the active version intact until its source reference changes', t => {
  const store = fixture(t);
  const owner = 'auth:global';
  const oldRef = stageSecretReference(store, 'lan-password', owner, 'old password');
  const nextRef = stageSecretReference(store, 'lan-password', owner, '\ufeffnew 密码');
  assert.notEqual(oldRef, nextRef);
  assert.equal(readReferencedSecret(store, 'lan-password', owner, oldRef), 'old password');
  assert.equal(readReferencedSecret(store, 'lan-password', owner, nextRef), '\ufeffnew 密码');
  assert.equal(removeSecretReference(store, 'lan-password', owner, nextRef), true);
  assert.equal(readReferencedSecret(store, 'lan-password', owner, oldRef), 'old password');
  assert.ok(!readFileSync(store.file, 'utf8').includes('old password'));
});

test('references distinguish empty secrets from missing values and enforce ownership on read and removal', t => {
  const store = fixture(t);
  const ref = stageSecretReference(store, 'lan-password', 'auth:project', '');
  assert.equal(readReferencedSecret(store, 'lan-password', 'auth:project', ref), '');
  for (const invalid of [null, 'not json', '{}', '["auth:project","fake"]', ref + ' ']) {
    assert.throws(() => readReferencedSecret(store, 'lan-password', 'auth:project', invalid), { code: 'CREDENTIALS_UNREADABLE' });
  }
  assert.throws(() => readReferencedSecret(store, 'lan-password', 'auth:global', ref), { code: 'CREDENTIALS_UNREADABLE' });
  assert.throws(() => removeSecretReference(store, 'lan-password', 'auth:global', ref), { code: 'CREDENTIALS_UNREADABLE' });
  assert.throws(() => readReferencedSecret(store, 'im-secret', 'auth:project', ref), { code: 'CREDENTIALS_UNREADABLE' });
  assert.equal(removeSecretReference(store, 'lan-password', 'auth:project', ref), true);
  assert.throws(() => readReferencedSecret(store, 'lan-password', 'auth:project', ref), { code: 'CREDENTIALS_UNREADABLE' });
});

test('a lost master key cannot turn a referenced secret into an empty or replacement secret', t => {
  const store = fixture(t);
  const ref = stageSecretReference(store, 'im-secret', 'im:dingtalk', 'synthetic secret');
  const original = readFileSync(store.file);
  unlinkSync(store.keyPath);
  assert.throws(() => readReferencedSecret(store, 'im-secret', 'im:dingtalk', ref), { code: 'CREDENTIALS_UNREADABLE' });
  assert.throws(() => stageSecretReference(store, 'im-secret', 'im:dingtalk', 'replacement'), { code: 'CREDENTIALS_UNREADABLE' });
  assert.deepEqual(readFileSync(store.file), original);
});
