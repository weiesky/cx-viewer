import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CODEX_TOOLS, sdkItemToAssistantBlock, sdkUsageToViewerUsage } from '../lib/sdk-adapter.js';

test('non-fatal SDK error items are labeled as warnings', () => {
  assert.deepEqual(sdkItemToAssistantBlock({ type: 'error', message: 'old configuration' }),
    { type: 'text', text: 'Warning: old configuration' });
  assert.equal(sdkItemToAssistantBlock({ type: 'error', message: '' }), null);
});

test('SDK mode does not advertise an unserviceable request_user_input tool', () => {
  assert.equal(DEFAULT_CODEX_TOOLS.some(tool => tool.name === 'request_user_input'), false);
});

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

test('SDK tool results retain validated native images and all text while ordinary or unsafe results stay JSON', async () => {
  const { sdkToolResultContent } = await import('../lib/sdk-adapter.js');
  const { extractToolResultImages, extractToolResultText } = await import('../../../apps/web/src/utils/toolResultCore.js');
  const original = { content: [{ type: 'text', text: 'fixture preview' },
    { type: 'image', mimeType: 'image/png', data: 'aGVsbG8=' }], structuredContent: { retained: 'raw TOOL output' } };
  const result = sdkToolResultContent(original);
  assert.equal(extractToolResultText({ content: result }), 'fixture preview');
  assert.equal(extractToolResultImages({ content: result })[0].src, 'data:image/png;base64,aGVsbG8=');
  assert.equal(original.content[1].source, undefined, 'normalization cannot mutate the native artifact');
  const dynamic = sdkToolResultContent([{ type: 'inputText', text: 'dynamic' },
    { type: 'inputImage', imageUrl: 'https://fixture.invalid/preview.png' }]);
  assert.equal(extractToolResultImages({ content: dynamic })[0].src, 'https://fixture.invalid/preview.png');
  assert.equal(extractToolResultText({ content: dynamic }), 'dynamic');
  for (const unsafe of [
    [{ type: 'image', mimeType: 'image/svg+xml', data: 'aGVsbG8=' }],
    [{ type: 'image', mimeType: 'image/png', data: 'bad' }],
    [{ type: 'inputImage', imageUrl: 'file:///private/fixture.png' }],
    [{ type: 'inputImage', imageUrl: 'javascript:fixture' }],
    [{ type: 'text', text: 'ordinary' }], { output: 'plain' },
  ]) assert.equal(sdkToolResultContent(unsafe), JSON.stringify(unsafe, null, 2));
});
