import test from 'node:test';
import assert from 'node:assert/strict';

import { isLoopbackBaseUrl } from '../lib/codex-config.js';

test('isLoopbackBaseUrl flags loopback hosts regardless of path', () => {
  assert.equal(isLoopbackBaseUrl('http://127.0.0.1:7008/v1'), true);
  assert.equal(isLoopbackBaseUrl('http://localhost:7008'), true);
  assert.equal(isLoopbackBaseUrl('http://[::1]:7008/v1/responses'), true);
  assert.equal(isLoopbackBaseUrl('https://api.openai.com/v1'), false);
  assert.equal(isLoopbackBaseUrl('https://gw.example.com/openai'), false);
  assert.equal(isLoopbackBaseUrl('not a url'), false);
  assert.equal(isLoopbackBaseUrl(null), false);
});
