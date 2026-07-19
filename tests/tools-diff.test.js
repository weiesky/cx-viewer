import test from 'node:test';
import assert from 'node:assert/strict';

import { computeToolsDiff } from '../src/utils/toolsDiff.js';

test('tools diff does not report changes without a MainAgent baseline', () => {
  const diff = computeToolsDiff(null, [
    { name: 'shell_command' },
    { name: 'apply_patch' },
    { name: 'tool_search' },
  ]);

  assert.equal(diff.hasPrev, false);
  assert.equal(diff.changed, false);
  assert.equal(diff.addedCount, 0);
  assert.equal(diff.removedCount, 0);
  assert.equal(diff.isAdded('shell_command'), false);
});

test('tools diff still reports MainAgent additions and removals with a baseline', () => {
  const diff = computeToolsDiff(
    [{ name: 'shell_command' }, { name: 'view_image' }],
    [{ name: 'shell_command' }, { name: 'apply_patch' }],
  );

  assert.deepEqual(diff.addedNames, ['apply_patch']);
  assert.deepEqual(diff.removedNames, ['view_image']);
});
