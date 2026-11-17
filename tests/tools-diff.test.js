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

test('tools diff compares namespace members by namespace and avoids counting whole groups twice', () => {
  const ns = (name, ...members) => ({ type: 'namespace', name, tools: members.map(name => ({ name })) });
  const diff = computeToolsDiff(
    [ns('a', 'same', 'old'), ns('b', 'same'), ns('gone', 'child')],
    [ns('a', 'same', 'new'), ns('b', 'same', 'old'), ns('new-group', 'child')],
  );
  assert.deepEqual(diff.addedNames, ['new-group']);
  assert.deepEqual(diff.removedNames, ['gone']);
  assert.deepEqual(diff.addedChildren, [{ namespace: 'a', name: 'new' }, { namespace: 'b', name: 'old' }]);
  assert.deepEqual(diff.removedChildren, [{ namespace: 'a', name: 'old' }]);
  assert.equal(diff.addedCount, 3);
  assert.equal(diff.removedCount, 2);
});

test('tools diff detects an explicit empty list and deduplicates namespace members', () => {
  const group = { type: 'namespace', name: 'group', tools: [{ name: 'one' }, { name: 'one' }, {}] };
  assert.deepEqual(computeToolsDiff([group], []).removedNames, ['group']);
  const diff = computeToolsDiff([group], [{ ...group, tools: [{ name: 'two' }, { name: 'two' }] }]);
  assert.deepEqual(diff.addedChildren, [{ namespace: 'group', name: 'two' }]);
  assert.deepEqual(diff.removedChildren, [{ namespace: 'group', name: 'one' }]);
});

test('missing namespace member declarations are not interpreted as removals', () => {
  const previous = [{ type: 'namespace', name: 'group', tools: [{ name: 'one' }] }];
  assert.equal(computeToolsDiff(previous, [{ type: 'namespace', name: 'group' }]).changed, false);
  assert.equal(computeToolsDiff([{ type: 'namespace', name: 'group' }], previous).changed, false);
});

test('exec text declarations are compared only with parseable baselines', () => {
  const exec = (...names) => ({ type: 'custom', name: 'exec', description: names.map(name => `### \`${name}\``).join('\n') });
  const diff = computeToolsDiff([exec('one', 'shared')], [exec('two', 'shared')]);
  assert.deepEqual(diff.addedChildren, [{ namespace: 'exec', name: 'two' }]);
  assert.deepEqual(diff.removedChildren, [{ namespace: 'exec', name: 'one' }]);
  assert.equal(computeToolsDiff([exec('one')], [exec()]).changed, false);
  assert.doesNotThrow(() => computeToolsDiff([], {}));
});
