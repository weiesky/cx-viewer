import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_TOOL_RESULT_IMAGE_BASE64_CHARS,
  buildSingleToolResultCore,
  extractToolResultImages,
  extractToolResultText,
  hasInlineToolResultImage,
} from '../src/utils/toolResultCore.js';

const dataBlock = (mime, chars) => ({
  type: 'input_image',
  image_url: `data:${mime};base64,${'a'.repeat(chars)}`,
});

test('extracts the real image-generation payload scale and preserves mixed output order semantics', () => {
  const chars = 2_360_628;
  const content = [
    { type: 'input_text', text: 'before' },
    dataBlock('image/png', chars),
    { type: 'output_text', text: 'after' },
  ];
  const result = buildSingleToolResultCore({ type: 'tool_result', content }, { name: 'wait', input: {} });
  assert.equal(result.resultText, 'before\nafter');
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0].base64Chars, chars);
  assert.equal(result.images[0].sourceType, 'data');
  assert.match(result.images[0].src, /^data:image\/png;base64,/);
  assert.equal(hasInlineToolResultImage(result), true);
});

test('accepts raster MIME types and rejects active or malformed image payloads', () => {
  for (const mime of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
    assert.equal(extractToolResultImages({ content: [dataBlock(mime, 4)] }).length, 1);
  }
  const unsupported = dataBlock('image/svg+xml', 4);
  const unsafeUrl = { type: 'input_image', image_url: 'javascript:alert(1)' };
  const malformed = { type: 'input_image', image_url: 'data:image/png;base64,abc' };
  assert.equal(extractToolResultImages({ content: [unsupported] }).length, 0);
  assert.equal(extractToolResultImages({ content: [unsafeUrl] }).length, 0);
  assert.equal(extractToolResultImages({ content: [malformed] }).length, 0);
  assert.equal(extractToolResultText({ content: [unsupported] }), JSON.stringify(unsupported));
  assert.equal(extractToolResultText({ content: [unsafeUrl] }), JSON.stringify(unsafeUrl));
  assert.equal(extractToolResultText({ content: [malformed] }), JSON.stringify(malformed));
});

test('preserves legitimate empty text parts without serializing their wrapper', () => {
  assert.equal(extractToolResultText({ content: [{ type: 'text', text: '' }] }), '');
  assert.equal(extractToolResultText({ content: [{ type: 'input_text', input_text: '' }] }), '');
});

test('uses an inclusive single-image boundary and degrades larger payloads', () => {
  const atLimit = extractToolResultImages({
    content: [dataBlock('image/png', MAX_TOOL_RESULT_IMAGE_BASE64_CHARS)],
  })[0];
  const overLimit = extractToolResultImages({
    content: [dataBlock('image/png', MAX_TOOL_RESULT_IMAGE_BASE64_CHARS + 4)],
  })[0];
  assert.equal(!!atLimit.src, true);
  assert.equal(atLimit.oversized, undefined);
  assert.equal(overLimit.oversized, true);
  assert.equal(overLimit.src, undefined);
  assert.equal(hasInlineToolResultImage({ images: [overLimit] }), true);
});

test('supports normalized image blocks, nested URL shapes, and does not auto-classify remote images as inline', () => {
  const normalized = extractToolResultImages({ content: [{
    type: 'image',
    source: { type: 'base64', media_type: 'image/png', data: 'aA==' },
  }] });
  const remote = extractToolResultImages({ content: [{
    type: 'image_url',
    image_url: { url: 'https://example.com/result.png' },
  }] });
  assert.equal(normalized[0].sizeBytes, 1);
  assert.equal(remote[0].sourceType, 'remote');
  assert.equal(hasInlineToolResultImage({ images: remote }), false);
  assert.equal(extractToolResultText({ content: [{ type: 'text', text: 'x' }, { type: 'input_text', text: 'y' }] }), 'x\ny');
});
