import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCacheWriteTokens,
  getCachedInputTokens,
  getInputCacheUsage,
} from '../src/utils/tokenUsage.js';

test('reads Codex cached input tokens from the Responses usage details object', () => {
  const usage = {
    input_tokens: 311405,
    input_tokens_details: {
      cache_write_tokens: 0,
      cached_tokens: 310016,
    },
  };
  assert.deepEqual(getInputCacheUsage(usage), {
    read: 310016,
    write: 0,
    hasCacheDetails: true,
  });
  assert.equal(getCachedInputTokens(usage), 310016);
  assert.equal(getCacheWriteTokens(usage), 0);
});

test('reads non-zero cache writes and keeps legacy cache aliases compatible', () => {
  assert.deepEqual(getInputCacheUsage({
    inputTokensDetails: { cachedTokens: 274176, cacheWriteTokens: 128 },
  }), { read: 274176, write: 128, hasCacheDetails: true });
  assert.deepEqual(getInputCacheUsage({
    cache_read_input_tokens: 42,
    cache_creation_input_tokens: 7,
  }), { read: 42, write: 7, hasCacheDetails: true });
  assert.deepEqual(getInputCacheUsage(null), { read: 0, write: 0, hasCacheDetails: false });
});
