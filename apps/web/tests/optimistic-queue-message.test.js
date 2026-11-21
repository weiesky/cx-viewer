import test from 'node:test';
import assert from 'node:assert/strict';
import { captureOptimisticQueueTextCounts, reconcileOptimisticQueueMessages } from '../src/components/chat/optimisticQueueMessage.js';
const scope = { project: 'same', instanceKey: 'a', attachedSid: null };
const pending = (extra = {}) => ({ id: 'queued', text: 'repeat', baselineTextCount: 1, ...scope, ...extra });
const sessions = (text, count) => Array.from({ length: count }, () => ({ messages: [{ role: 'user', content: [{ type: 'text', text }] }] }));
test('SDK placeholders count native user text across sessions without inferring users from system/developer or tools', () => {
  assert.deepEqual(captureOptimisticQueueTextCounts([...sessions('repeat', 2), { messages: [{ role: 'system', content: 'private system' }, { role: 'assistant', content: 'repeat' }, { role: 'developer', content: 'private developer' }] }]), { repeat: 2 });
});
test('old identical input cannot acknowledge a new explicit Send now, while a new echo in another session can', () => {
  const row = pending(); assert.deepEqual(reconcileOptimisticQueueMessages([row], sessions('repeat', 1), [], scope), [row]);
  assert.deepEqual(reconcileOptimisticQueueMessages([row], sessions('repeat', 2), [], scope), []);
  assert.equal(reconcileOptimisticQueueMessages([row, pending({ id: 'second' })], sessions('repeat', 2), [], scope).length, 1);
});
test('a stale queued snapshot preserves the click, then dispatch removal or rollback drops its placeholder', () => {
  const row = pending(), queued = { id: row.id, status: 'queued' };
  assert.deepEqual(reconcileOptimisticQueueMessages([row], [], [queued], scope), [row]);
  const dispatched = { ...row, dispatchingSeen: true };
  assert.deepEqual(reconcileOptimisticQueueMessages([dispatched], [], [{ ...queued, status: 'dispatching' }], scope), [dispatched]);
  assert.deepEqual(reconcileOptimisticQueueMessages([dispatched], [], [], scope), []);
  assert.deepEqual(reconcileOptimisticQueueMessages([dispatched], [], [queued], scope), []);
});
test('workspace and native resume boundaries discard foreign placeholders and a historical slice cannot text-ack', () => {
  assert.deepEqual(reconcileOptimisticQueueMessages([pending()], [], [], { ...scope, instanceKey: 'b' }), []);
  assert.deepEqual(reconcileOptimisticQueueMessages([pending()], [], [], { ...scope, attachedSid: 'new-resume' }), []);
  assert.deepEqual(reconcileOptimisticQueueMessages([pending()], sessions('repeat', 2), [], scope, { allowTextAck: false }), [pending()]);
});
