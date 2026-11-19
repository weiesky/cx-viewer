import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyUserContent } from '../packages/app/src/utils/contentFilter.js';

test('command metadata is classified without throwing or hiding the accompanying user text', () => {
  const user = { type: 'text', text: 'Please inspect the changed files.' };
  const result = classifyUserContent([
    { type: 'text', text: '<command-message>review</command-message>\n<command-name>review</command-name>' },
    user,
  ]);
  assert.deepEqual(result.commands, ['/review']);
  assert.deepEqual(result.textBlocks, [user]);
});
