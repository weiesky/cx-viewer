import test from 'node:test';
import assert from 'node:assert/strict';

import { sdkUsageToViewerUsage } from '../lib/sdk-adapter.js';

test('sdk adapter normalizes snake_case and camelCase token usage', () => {
  assert.deepEqual(sdkUsageToViewerUsage({
    input_tokens: 10,
    output_tokens: 6,
    reasoning_output_tokens: 2,
    cached_input_tokens: 8,
    cache_write_input_tokens: 3,
  }), {
    input_tokens: 10,
    output_tokens: 6,
    reasoning_output_tokens: 2,
    total_tokens: 16,
    input_tokens_details: { cached_tokens: 8, cache_write_tokens: 3 },
  });

  assert.deepEqual(sdkUsageToViewerUsage({
    inputTokens: 11,
    outputTokens: 7,
    reasoningOutputTokens: 3,
    inputTokensDetails: { cachedTokens: 9, cacheWriteTokens: 4 },
    totalTokens: 20,
  }), {
    input_tokens: 11,
    output_tokens: 7,
    reasoning_output_tokens: 3,
    total_tokens: 20,
    input_tokens_details: { cached_tokens: 9, cache_write_tokens: 4 },
  });
});
