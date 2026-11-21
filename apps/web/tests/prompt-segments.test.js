import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePromptSegments } from '../src/utils/promptSegments.js';

test('original prompt segmentation separates paired context tags while retaining surrounding user text', () => {
  assert.deepEqual(parsePromptSegments('User task\n<user_instructions scope="fixture">context only</user_instructions>\nThen continue'), [
    { type: 'text', content: 'User task' }, { type: 'system', label: 'user_instructions', content: 'context only' }, { type: 'text', content: 'Then continue' },
  ]);
});
test('command wrappers stay out of context segments and unmatched markup remains inert text', () => {
  assert.deepEqual(parsePromptSegments('<command-name>/clear</command-name><command-args>x</command-args>Visible <img src=x onerror=test>'),
    [{ type: 'text', content: 'Visible <img src=x onerror=test>' }]);
});
