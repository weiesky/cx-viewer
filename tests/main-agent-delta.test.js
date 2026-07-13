import test from 'node:test';
import assert from 'node:assert/strict';

import { createMainAgentDeltaCompactor } from '../lib/main-agent-delta.js';
import { reconstructEntries } from '../server/lib/delta-reconstructor.js';

function entry(input, extra = {}) {
  return {
    mainAgent: true,
    body: {
      input,
      instructions: extra.instructions || 'original instructions',
      tools: extra.tools || [{ name: 'shell_command' }],
      metadata: { thread_id: extra.threadId || 'thread-a' },
    },
    ...extra.entry,
  };
}

test('compacts cumulative MainAgent input without mutating independent request fields', () => {
  const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'test' });
  const first = entry([{ type: 'additional_tools', tools: [{ name: 'exec' }] }, { role: 'user', content: 'one' }]);
  const second = entry([...first.body.input, { role: 'assistant', content: 'two' }], {
    instructions: 'changed instructions',
    tools: [{ name: 'changed-tool' }],
  });

  const storedFirst = compactor.process(first);
  compactor.commit(first);
  const storedSecond = compactor.process(second);
  compactor.commit(second);

  assert.equal(storedFirst._isCheckpoint, true);
  assert.equal(storedSecond._isCheckpoint, false);
  assert.equal(storedSecond._baseMessageCount, 2);
  assert.equal(storedSecond._baseInputDigest, storedFirst._inputDigest);
  assert.deepEqual(storedSecond.body.input, [{ role: 'assistant', content: 'two' }]);
  assert.equal(storedSecond.body.instructions, 'changed instructions');
  assert.deepEqual(storedSecond.body.tools, [{ name: 'changed-tool' }]);
  assert.equal(second.body.input.length, 3);

  reconstructEntries([storedFirst, storedSecond]);
  assert.deepEqual(storedSecond.body.input, second.body.input);
});

test('forces a checkpoint when any prior input item changes or config items disappear', () => {
  const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'test' });
  const first = entry([
    { type: 'additional_tools', tools: [{ name: 'exec' }] },
    { role: 'user', content: 'draft' },
  ]);
  compactor.process(first);
  compactor.commit(first);

  const rewritten = entry([
    { role: 'user', content: 'final' },
    { role: 'assistant', content: 'done' },
  ]);
  const stored = compactor.process(rewritten);
  assert.equal(stored._isCheckpoint, true);
  assert.deepEqual(stored.body.input, rewritten.body.input);
});

test('keeps conversation lanes isolated and excludes teammate records', () => {
  const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'test' });
  const laneA = entry([{ role: 'user', content: 'a' }], { threadId: 'thread-a' });
  compactor.process(laneA);
  compactor.commit(laneA);

  const laneB = entry([{ role: 'user', content: 'b' }], { threadId: 'thread-b' });
  assert.equal(compactor.process(laneB)._isCheckpoint, true);

  const teammate = entry([{ role: 'user', content: 'worker' }], {
    entry: { teammate: 'worker-1' },
  });
  assert.equal(compactor.process(teammate), teammate);
});

test('in-progress and completed writes share one plan but only completed writes advance the baseline', () => {
  const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'test' });
  const request = entry([{ role: 'user', content: 'one' }], { entry: { inProgress: true } });
  const pending = compactor.process(request);
  compactor.commit(request);

  delete request.inProgress;
  const completed = compactor.process(request);
  compactor.commit(request);
  assert.equal(pending._seq, completed._seq);
  assert.equal(completed._isCheckpoint, true);

  const next = entry([...request.body.input, { role: 'assistant', content: 'two' }]);
  assert.equal(compactor.process(next)._isCheckpoint, false);
});

test('reset makes the next record a full checkpoint for a new log segment', () => {
  const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'test' });
  const first = entry([{ role: 'user', content: 'one' }]);
  compactor.process(first);
  compactor.commit(first);
  compactor.reset();

  const second = entry([...first.body.input, { role: 'assistant', content: 'two' }]);
  assert.equal(compactor.process(second)._isCheckpoint, true);
});

test('completion reordering keeps the newest committed baseline and reconstructs the next delta', () => {
  const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'reorder' });
  const slow = entry([{ role: 'user', content: 'slow' }]);
  const fast = entry([
    { role: 'user', content: 'slow' },
    { role: 'assistant', content: 'fast completion' },
  ]);
  const storedSlow = compactor.process(slow);
  const storedFast = compactor.process(fast);

  compactor.commit(fast);
  compactor.commit(slow);
  const next = entry([...fast.body.input, { role: 'user', content: 'next' }]);
  const storedNext = compactor.process(next);
  compactor.commit(next);

  const onDiskCompletionOrder = [storedFast, storedSlow, storedNext];
  reconstructEntries(onDiskCompletionOrder);
  assert.equal(storedSlow._staleReorder, true);
  assert.deepEqual(storedNext.body.input, next.body.input);
  assert.equal(storedNext._baseInputDigest, storedFast._inputDigest);
});

test('disabled compaction preserves the original entry without protocol metadata', () => {
  const compactor = createMainAgentDeltaCompactor({ enabled: false, epoch: 'disabled' });
  const original = entry([{ role: 'user', content: 'full' }]);
  assert.equal(compactor.process(original), original);
  assert.equal(original._deltaFormat, undefined);
  assert.equal(original._inputDigest, undefined);
});

test('a restarted writer appends a checkpoint before producing deltas beside legacy full records', () => {
  const legacy = entry([{ role: 'user', content: 'legacy' }]);
  const restarted = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'restart' });
  const checkpointSource = entry([...legacy.body.input, { role: 'assistant', content: 'after restart' }]);
  const checkpoint = restarted.process(checkpointSource);
  restarted.commit(checkpointSource);
  const deltaSource = entry([...checkpointSource.body.input, { role: 'user', content: 'continue' }]);
  const delta = restarted.process(deltaSource);

  assert.equal(checkpoint._isCheckpoint, true);
  assert.equal(delta._isCheckpoint, false);
  reconstructEntries([legacy, checkpoint, delta]);
  assert.deepEqual(delta.body.input, deltaSource.body.input);
});
