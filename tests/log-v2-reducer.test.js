import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyWireCommit,
  checkpointWireArchiveState,
  createWireArchiveState,
  materializeWireDescriptor,
  resolveWireInputRefs,
  restoreWireArchiveState,
} from '../lib/log-v2/reducer.js';
import { LOG_V2_WIRE_KINDS, LOG_V2_WIRE_VERSION } from '../lib/log-v2/wire-schema.js';

const archive = Object.freeze({ projectId: 'project', sessionId: 'session', generation: 'generation-1' });
const ref = (hash, bytes = 1) => ({ hash: hash.repeat(64).slice(0, 64), bytes });

function commit({ seq, eventId = `event-${seq}`, revision = 1, baseRevision = 0, set = {}, deleted = [], input = null, unchangedInput = null }) {
  const inputBinding = input
    ? { revision: input.revision, path: input.path, changed: true }
    : unchangedInput
      ? { revision: unchangedInput.revision, path: unchangedInput.path, changed: false }
      : null;
  return {
    kind: LOG_V2_WIRE_KINDS.commit,
    version: LOG_V2_WIRE_VERSION,
    archive,
    timeline: {
      seq,
      eventId,
      txnId: `txn-${seq}`,
      timestamp: `2026-07-15T00:00:0${seq}.000Z`,
      threadId: 'thread',
      entryKey: 'entry',
      entryRevision: revision,
      inputRevision: inputBinding?.revision || 0,
      phase: 'completed',
    },
    entry: {
      entryKey: 'entry', revision, baseRevision, set, delete: deleted,
      inputBinding,
    },
    input,
    timelineBytes: seq * 100,
  };
}

test('wire reducer applies revisions, materializes exact entries and moves winners to latest order', () => {
  const state = createWireArchiveState(archive);
  const meta = ref('a');
  const body = ref('b');
  const item = ref('c');
  const objects = new Map([
    [meta.hash, { timestamp: 't', url: 'codex://one' }],
    [body.hash, { model: 'gpt', input: 'kept-in-body-object' }],
    [item.hash, { role: 'user', content: 'hello' }],
  ]);

  applyWireCommit(state, commit({
    seq: 1,
    set: { 'root.meta': meta, 'root.body': body },
    input: { revision: 1, baseRevision: 0, path: 'root.body.input', retain: 0, remove: 0, append: [item] },
  }));
  const unchangedInput = { revision: 1, path: 'root.body.input' };
  const descriptor = applyWireCommit(state, commit({ seq: 2, revision: 2, baseRevision: 1, unchangedInput }));
  const duplicate = applyWireCommit(state, commit({ seq: 2, revision: 2, baseRevision: 1, unchangedInput }));

  assert.strictEqual(duplicate, descriptor);
  assert.deepEqual(materializeWireDescriptor(descriptor, objectRef => objects.get(objectRef.hash), {
    state,
  }), {
    timestamp: 't',
    url: 'codex://one',
    body: { model: 'gpt', input: [{ role: 'user', content: 'hello' }] },
  });
  assert.deepEqual([...state.winners.values()].map(value => value.seq), [2]);
  assert.equal(Object.hasOwn(descriptor.input, 'refs'), false);
  assert.deepEqual(resolveWireInputRefs(state, descriptor.input), [item]);
});

test('checkpoint restores revision state and tail replay matches uninterrupted replay', () => {
  const meta = ref('d');
  const first = createWireArchiveState(archive);
  applyWireCommit(first, commit({ seq: 1, set: { 'root.meta': meta } }));
  const checkpoint = checkpointWireArchiveState(first);
  const restored = restoreWireArchiveState(checkpoint);

  applyWireCommit(first, commit({ seq: 2, revision: 2, baseRevision: 1 }));
  applyWireCommit(restored, commit({ seq: 2, revision: 2, baseRevision: 1 }));

  assert.equal(restored.throughSeq, first.throughSeq);
  assert.deepEqual([...restored.entries].map(([key, value]) => [key, value.revision, Object.fromEntries(value.parts)]),
    [...first.entries].map(([key, value]) => [key, value.revision, Object.fromEntries(value.parts)]));
});

test('wire reducer rejects gaps, conflicts and archive generation changes without advancing state', () => {
  const state = createWireArchiveState(archive);
  assert.throws(() => applyWireCommit(state, commit({ seq: 2 })), error => error.code === 'CXV_LOG_V2_WIRE_GAP');
  assert.equal(state.throughSeq, 0);
  applyWireCommit(state, commit({ seq: 1 }));
  assert.throws(() => applyWireCommit(state, commit({ seq: 1, eventId: 'different' })), error => error.code === 'CXV_LOG_V2_WIRE_CONFLICT');
  assert.equal(state.throughSeq, 1);
  const other = { ...commit({ seq: 2, revision: 2, baseRevision: 1 }), archive: { ...archive, generation: 'other' } };
  assert.throws(() => applyWireCommit(state, other), error => error.code === 'CXV_LOG_V2_WIRE_RESET_REQUIRED');
  assert.equal(state.throughSeq, 1);
});

test('a rejected commit cannot mutate an existing input revision chain', () => {
  const state = createWireArchiveState(archive);
  applyWireCommit(state, commit({
    seq: 1,
    input: { revision: 1, baseRevision: 0, path: 'root.body.input', retain: 0, remove: 0, append: [ref('9')] },
  }));
  const before = state.threads.get('thread');
  const invalid = commit({
    seq: 2, revision: 2, baseRevision: 1,
    input: { revision: 2, baseRevision: 1, path: '', retain: 1, remove: 0, append: [ref('8')] },
  });
  assert.throws(() => applyWireCommit(state, invalid), /input\.path is required/);
  const after = state.threads.get('thread');
  assert.equal(state.throughSeq, 1);
  assert.equal(after.revision, before.revision);
  assert.equal(after.nodes.size, 1);
  assert.equal(after.nodes.has(2), false);
});

test('self-contained upserts may seed unknown entries but cannot roll back known revisions', () => {
  const state = createWireArchiveState(archive);
  const first = commit({ seq: 1, revision: 5, baseRevision: 0, set: { 'root.meta': ref('7') } });
  first.entry.upsert = true;
  applyWireCommit(state, first);
  const rollback = commit({ seq: 2, revision: 3, baseRevision: 0, set: { 'root.meta': ref('6') } });
  rollback.entry.upsert = true;
  assert.throws(() => applyWireCommit(state, rollback), error => error.code === 'CXV_LOG_V2_WIRE_GAP');
  assert.equal(state.throughSeq, 1);
  assert.equal(state.entries.values().next().value.revision, 5);
});

test('checkpoint stores each input delta once instead of copying cumulative refs into winners', () => {
  const state = createWireArchiveState(archive);
  for (let index = 1; index <= 100; index++) {
    const item = ref(index.toString(16).padStart(2, '0'));
    const frame = commit({
      seq: index,
      input: {
        revision: index,
        baseRevision: index - 1,
        path: 'root.body.input',
        retain: index - 1,
        remove: 0,
        append: [item],
      },
    });
    frame.timeline.entryKey = `entry-${index}`;
    frame.timeline.entryRevision = 1;
    frame.entry.entryKey = `entry-${index}`;
    frame.entry.revision = 1;
    frame.entry.baseRevision = 0;
    applyWireCommit(state, frame);
  }
  const checkpoint = checkpointWireArchiveState(state);
  assert.equal(checkpoint.threads[0].nodes.length, 100);
  assert.equal(checkpoint.winners.length, 100);
  assert.equal(checkpoint.winners.some(value => Object.hasOwn(value.descriptor.input, 'refs')), false);
  assert.ok(Buffer.byteLength(JSON.stringify(checkpoint)) < 200_000);
});

test('linear input chain preserves retain/remove, path changes, and unchanged bindings', () => {
  const state = createWireArchiveState(archive);
  const a = ref('a');
  const b = ref('b');
  const c = ref('c');
  applyWireCommit(state, commit({
    seq: 1,
    input: { revision: 1, baseRevision: 0, path: 'root.body.input', retain: 0, remove: 0, append: [a, b] },
  }));
  applyWireCommit(state, commit({
    seq: 2, revision: 2, baseRevision: 1,
    input: { revision: 2, baseRevision: 1, path: 'root.body.input', retain: 1, remove: 1, append: [c] },
  }));
  const changedPath = applyWireCommit(state, commit({
    seq: 3, revision: 3, baseRevision: 2,
    input: { revision: 3, baseRevision: 2, path: 'request.body.input', retain: 2, remove: 0, append: [] },
  }));
  const unchanged = applyWireCommit(state, commit({
    seq: 4, revision: 4, baseRevision: 3,
    unchangedInput: { revision: 3, path: 'request.body.input' },
  }));
  assert.deepEqual(resolveWireInputRefs(state, changedPath.input), [a, c]);
  assert.deepEqual(resolveWireInputRefs(state, unchanged.input), [a, c]);
  assert.equal(unchanged.input.path, 'request.body.input');
  assert.equal(state.threads.get('thread').nodes.size, 3);
});
