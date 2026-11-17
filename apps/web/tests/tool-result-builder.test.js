import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RETAINED_TOOL_IMAGE_BASE64_CHARS,
  createEmptyGlobalIndexState,
  createEmptyToolState,
  retainToolResultImagesWithinBudget,
} from '../src/utils/toolResultBuilder.js';

function preview(chars) {
  return {
    images: [{
      src: 'data:image/png;base64,aA==',
      sourceType: 'data',
      mediaType: 'image/png',
      base64Chars: chars,
      sizeBytes: Math.floor(chars * 3 / 4),
    }],
  };
}

for (const [name, makeState, mapKey] of [
  ['local', createEmptyToolState, 'toolResultMap'],
  ['global', createEmptyGlobalIndexState, 'index'],
]) {
  test(`${name} result index evicts oldest derived previews by total base64 characters`, () => {
    const state = makeState();
    const entries = state[mapKey];
    const perEntry = Math.floor(MAX_RETAINED_TOOL_IMAGE_BASE64_CHARS / 2);
    for (const id of ['a', 'b', 'c']) {
      entries[id] = preview(perEntry);
      retainToolResultImagesWithinBudget(state, entries, id, entries[id]);
    }
    assert.equal(entries.a.images[0].unavailableReason, 'session_budget');
    assert.equal(entries.a.images[0].src, undefined);
    assert.equal(!!entries.b.images[0].src, true);
    assert.equal(!!entries.c.images[0].src, true);
    assert.equal(state._retainedImageBase64Chars <= MAX_RETAINED_TOOL_IMAGE_BASE64_CHARS, true);
  });
}

test('replacing the same id updates accounting without duplicate queue entries', () => {
  const state = createEmptyToolState();
  const entries = state.toolResultMap;
  entries.same = preview(1024);
  retainToolResultImagesWithinBudget(state, entries, 'same', entries.same);
  entries.same = preview(2048);
  retainToolResultImagesWithinBudget(state, entries, 'same', entries.same);
  assert.deepEqual(state._imageEntryIds, ['same']);
  assert.equal(state._retainedImageBase64Chars, 2048);
});
