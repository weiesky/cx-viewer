import test from 'node:test';
import assert from 'node:assert/strict';

import { sdkUsageToViewerUsage } from '../lib/sdk-adapter.js';

test('sdk adapter normalizes snake_case and camelCase token usage', () => {
  assert.deepEqual(sdkUsageToViewerUsage({
    input_tokens: 10,
    cached_input_tokens: 4,
    output_tokens: 6,
    reasoning_output_tokens: 2,
  }), {
    input_tokens: 10,
    output_tokens: 6,
    cache_read_input_tokens: 4,
    reasoning_output_tokens: 2,
    total_tokens: 16,
  });

  assert.deepEqual(sdkUsageToViewerUsage({
    inputTokens: 11,
    cachedInputTokens: 5,
    outputTokens: 7,
    reasoningOutputTokens: 3,
    totalTokens: 20,
  }), {
    input_tokens: 11,
    output_tokens: 7,
    cache_read_input_tokens: 5,
    reasoning_output_tokens: 3,
    total_tokens: 20,
  });
});
