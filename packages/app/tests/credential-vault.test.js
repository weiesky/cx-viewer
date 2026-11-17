import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encryptSecret, decryptSecret } from '../lib/credential-vault.js';

const key = randomBytes(32);
const identity = { kind: 'lan-password', ref: 'global' };

test('vault encryption round-trips exact empty, Unicode, BOM, and large credentials', () => {
  for (const value of ['', 'AB1234', '口令🔑', '\uFEFF', '\0\r\n', 'x'.repeat(64 * 1024)]) {
    const stored = encryptSecret(key, value, identity);
    assert.equal(decryptSecret(key, stored, identity), value);
  }
  const repeated = Array.from({ length: 10 }, () => encryptSecret(key, 'same', identity));
  assert.equal(new Set(repeated).size, 10);
});

test('vault authentication rejects changed IV, tag, ciphertext, key, and credential identity', () => {
  const stored = encryptSecret(key, 'private fixture', identity);
  const bytes = Buffer.from(stored.slice(3), 'base64');
  for (const index of [0, 12, bytes.length - 1]) {
    const altered = Buffer.from(bytes);
    altered[index] ^= 1;
    assert.throws(() => decryptSecret(key, 'v1:' + altered.toString('base64'), identity));
  }
  assert.throws(() => decryptSecret(randomBytes(32), stored, identity));
  assert.throws(() => decryptSecret(key, stored, { ...identity, kind: 'profile-apiKey' }));
  assert.throws(() => decryptSecret(key, stored, { ...identity, ref: 'project' }));
  const ambiguous = encryptSecret(key, 'private fixture', { kind: 'a:b', ref: 'c' });
  assert.throws(() => decryptSecret(key, ambiguous, { kind: 'a', ref: 'b:c' }));
});

test('vault rejects malformed envelopes, unsupported versions and invalid inputs', () => {
  const stored = encryptSecret(key, 'fixture', identity);
  for (const value of [null, 42, {}, '', 'v2:' + stored.slice(3), 'v1:!!!', 'v1:AAAA', stored + '\n', stored + '!']) {
    assert.throws(() => decryptSecret(key, value, identity));
  }
  for (const invalid of [undefined, {}, { kind: '', ref: 'x' }, { kind: 'x', ref: 1 }]) {
    assert.throws(() => encryptSecret(key, 'fixture', invalid));
    assert.throws(() => decryptSecret(key, stored, invalid));
  }
  assert.throws(() => encryptSecret(key, null, identity));
  assert.throws(() => encryptSecret(key, '\ud800', identity));
  assert.throws(() => encryptSecret(Buffer.alloc(16), 'fixture', identity));
  assert.throws(() => decryptSecret(Buffer.alloc(16), stored, identity));
});
