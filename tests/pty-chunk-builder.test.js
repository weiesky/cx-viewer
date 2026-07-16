import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMultiSelectOtherChunks,
  buildOtherChunks,
} from '../src/utils/ptyChunkBuilder.js';

test('500-character Other text stays one PTY write instead of creating per-character timers', () => {
  const text = '长'.repeat(500);
  const prompt = {
    options: [{ number: 1, selected: true }, { number: 2, selected: false }],
  };

  const chunks = buildOtherChunks({ optionIndex: 0, text }, prompt, false);
  assert.deepEqual(chunks, [text, '\r']);
  assert.equal(chunks.length, 2);
});

test('multi-select Other keeps long text atomic and only separates semantic keys', () => {
  const text = 'x'.repeat(500);
  const prompt = {
    options: [{ number: 1, selected: true }],
  };

  const chunks = buildMultiSelectOtherChunks({
    optionIndex: 0,
    text,
    isLast: true,
  }, prompt, true);

  assert.deepEqual(chunks, [
    text,
    'x', // sacrifice character consumed while leaving the text field
    '\x1b[C',
    '\x1b[A',
    '\x1b[C',
    '\r',
  ]);
  assert.equal(chunks.length, 6);
});
