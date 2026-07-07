import test from 'node:test';
import assert from 'node:assert/strict';

import { isStaleLocalCodexBaseUrl } from '../lib/codex-config.js';

test('codex config detects only local proxy base URLs as stale', () => {
  assert.equal(isStaleLocalCodexBaseUrl('http://127.0.0.1:7008'), true);
  assert.equal(isStaleLocalCodexBaseUrl('http://localhost:7008/'), true);
  assert.equal(isStaleLocalCodexBaseUrl('http://[::1]:7008'), true);

  assert.equal(isStaleLocalCodexBaseUrl('https://api.openai.com/v1'), false);
  assert.equal(isStaleLocalCodexBaseUrl('https://proxy.example.com/openai'), false);
  assert.equal(isStaleLocalCodexBaseUrl('not a url'), false);
});
