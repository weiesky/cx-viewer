import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';

import {
  createPendingInputRecord,
  getPendingInputDisplayText,
  reconcilePendingInputs,
  removePendingInputsById,
} from '../src/utils/pendingInputEcho.js';

function row(key, text, timestamp, requestIndex, role = 'user') {
  return React.createElement('chat-message', { key, role, text, timestamp, requestIndex });
}

function pending(id, text, renderedItems = [], requestCursor = 1) {
  return createPendingInputRecord({
    id,
    wireText: text,
    createdAt: '2026-07-13T06:00:00.000Z',
    requestCursor,
    renderedItems,
  });
}

test('a newly persisted server row consumes one optimistic send', () => {
  const record = pending('p1', 'new prompt');
  const before = [row('old', 'older prompt', '2026-07-13T05:59:00.000Z', 0)];
  assert.equal(reconcilePendingInputs([record], before).length, 1);
  assert.equal(reconcilePendingInputs([
    record,
  ], [...before, row('new', 'new prompt', '2026-07-13T06:00:01.000Z', 1)]).length, 0);
});

test('two identical in-flight sends require two distinct persisted echoes', () => {
  const first = pending('p1', 'repeat me');
  const second = pending('p2', 'repeat me');
  const firstEcho = [row('echo-1', 'repeat me', '2026-07-13T06:00:01.000Z', 1)];

  const afterFirst = reconcilePendingInputs([first, second], firstEcho);
  assert.equal(afterFirst.length, 1);
  assert.equal(afterFirst[0].id, 'p2');
  assert.equal(reconcilePendingInputs(afterFirst, firstEcho), afterFirst);

  const secondEcho = [...firstEcho, row('echo-2', 'repeat me', '2026-07-13T06:00:02.000Z', 2)];
  assert.equal(reconcilePendingInputs(afterFirst, secondEcho).length, 0);
});

test('history reindexing before the request cursor cannot acknowledge a send', () => {
  const old = row('old-key', 'same', '2026-07-13T05:00:00.000Z', 0);
  const record = pending('p1', 'same', [old], 4);
  const reindexed = row('new-presentation-key', 'same', '2026-07-13T05:00:00.000Z', 99);
  assert.equal(reconcilePendingInputs([record], [reindexed]).length, 1);
});

test('wire and display text are both accepted for transformed prompts', () => {
  const record = createPendingInputRecord({
    id: 'ultraplan',
    wireText: '<scaffold>goal</scaffold>',
    displayText: 'goal',
    createdAt: '2026-07-13T06:00:00.000Z',
    requestCursor: 2,
  });
  assert.equal(getPendingInputDisplayText(record), 'goal');
  const echoed = [row('goal', 'goal', '2026-07-13T06:00:01.000Z', 2)];
  assert.equal(reconcilePendingInputs([record], echoed).length, 0);
});

test('line endings and surrounding whitespace are normalized', () => {
  const record = pending('p1', 'hello\r\nworld');
  const echoed = [row('new', '  hello\nworld  ', '2026-07-13T06:00:01.000Z', 1)];
  assert.equal(reconcilePendingInputs([record], echoed).length, 0);
});

test('cancelled queued sends remove only their own optimistic rows', () => {
  const first = pending('p1', 'first');
  const second = pending('p2', 'second');
  const third = pending('p3', 'third');
  const records = [first, second, third];
  const remaining = removePendingInputsById(records, new Set(['p1', 'p3']));
  assert.deepEqual(remaining.map(record => record.id), ['p2']);
  assert.equal(removePendingInputsById(records, []), records);
});
