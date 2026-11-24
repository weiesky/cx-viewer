import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS_TOKEN_ENV, isValidAccessToken, takeInheritedAccessToken } from '../lib/access-token.js';

const VALID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('internal access-token handoff', () => {
  it('accepts the exact server token shape once without altering other env values', () => {
    const env = { [ACCESS_TOKEN_ENV]: VALID, OTHER: 'keep' };
    assert.equal(takeInheritedAccessToken(env), VALID);
    assert.deepEqual(env, { OTHER: 'keep' });
    assert.equal(takeInheritedAccessToken(env), null);
  });
  it('strips malformed handoffs before the caller falls back to randomness', () => {
    for (const value of [VALID.toUpperCase(), VALID.slice(1), VALID + 'f', VALID + '\n',
      VALID + '\r', ' ' + VALID, VALID.replace('a', 'g'), '', 123, null, undefined]) {
      const env = { [ACCESS_TOKEN_ENV]: value };
      assert.equal(isValidAccessToken(value), false);
      assert.equal(takeInheritedAccessToken(env), null);
      assert.equal(ACCESS_TOKEN_ENV in env, false);
    }
    assert.equal(takeInheritedAccessToken(null), null);
    assert.equal(takeInheritedAccessToken({}), null);
  });
});
