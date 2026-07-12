import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMemoryLink } from '../src/utils/memoryLinkParser.js';

test('memory links resolve generated nested Markdown from the current document', () => {
  assert.deepEqual(parseMemoryLink('rollout_summaries/task.md'), { open: 'rollout_summaries/task.md' });
  assert.deepEqual(parseMemoryLink('./references/a.md', 'skills/demo/SKILL.md'), { open: 'skills/demo/references/a.md' });
  assert.deepEqual(parseMemoryLink('../shared.md', 'skills/demo/SKILL.md'), { open: 'skills/shared.md' });
  assert.deepEqual(parseMemoryLink('task%20one.md?x=1#part', 'rollout_summaries/index.md'), { open: 'rollout_summaries/task one.md' });
  assert.deepEqual(parseMemoryLink('#heading'), { allow: true });
});

test('memory links reject schemes, root escapes, internal files, and malformed paths', () => {
  for (const href of [
    'https://example.com/a.md', 'javascript:alert(1)', 'file:///tmp/a.md', '//host/a.md',
    '../outside.md', '/absolute.md', 'C:\\secret.md', 'rollout_summaries//a.md',
    'raw_memories.md', 'unknown/a.md', 'extensions/private.md', '.hidden.md', 'rollout_summaries/a.txt',
    '%68ttp:evil.md', '%2e%2e/outside.md',
  ]) assert.deepEqual(parseMemoryLink(href), { reject: true }, href);
});

test('memory links may navigate upward only while remaining in an allowed generated tree', () => {
  assert.deepEqual(parseMemoryLink('../../../MEMORY.md', 'skills/demo/references/a.md'), { open: 'MEMORY.md' });
  assert.deepEqual(parseMemoryLink('../../../../outside.md', 'skills/demo/references/a.md'), { reject: true });
});
