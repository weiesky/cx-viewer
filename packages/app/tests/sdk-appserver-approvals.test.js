import test from 'node:test';
import assert from 'node:assert/strict';
import { createSdkAppServerApprovals } from '../lib/sdk-appserver-approvals.js';

const request = (id = 1, method = 'item/commandExecution/requestApproval', extra = {}) => ({
  id, method, params: { threadId: 'root', turnId: 'turn', command: 'fixture command', cwd: '/a', ...extra },
});
function fixture(ownsThread = async id => id === 'root') {
  const frames = [], replies = [], timers = new Map(); let seq = 0;
  const bridge = createSdkAppServerApprovals({ scope: { cwd: '/a', instanceKey: 'a' }, ownsThread,
    broadcast: frame => frames.push(frame),
    setTimer(fn) { const id = ++seq; timers.set(id, fn); return id; }, clearTimer(id) { timers.delete(id); } });
  const offer = frame => bridge.handle(frame, (result, error) => { replies.push({ id: frame.id, result, error }); return true; });
  return { bridge, offer, frames, replies, timers };
}

test('approval responses map one-time/session/deny decisions without changing request IDs or offered capabilities', async () => {
  const f = fixture();
  await f.offer(request('native-id', undefined, { availableDecisions: ['accept', 'decline'] }));
  const id = f.frames[0].id;
  assert.equal(f.frames[0].toolName, 'shell_command');
  assert.equal(f.frames[0].instanceKey, 'a');
  assert.equal(f.bridge.resolve(id, { decision: 'allow', allowSession: true }), false);
  assert.equal(f.replies.length, 0);
  assert.equal(f.bridge.resolve(id, 'allow'), true);
  assert.deepEqual(f.replies[0], { id: 'native-id', result: { decision: 'accept' }, error: undefined });
  assert.equal(f.bridge.resolve(id, 'allow'), false);
  await f.offer(request(2, 'item/fileChange/requestApproval'));
  f.bridge.resolve(f.bridge.replay()[0].id, { decision: 'allow', allowSession: true });
  assert.equal(f.replies.at(-1).result.decision, 'acceptForSession');
  await f.offer(request(3)); f.bridge.resolve(f.bridge.replay()[0].id, 'deny');
  assert.equal(f.replies.at(-1).result.decision, 'decline');
  assert.equal(f.timers.size, 0);
});

test('permission grants retain exactly the requested profile and timeout grants nothing', async () => {
  const f = fixture(), permissions = { network: { enabled: true } };
  await f.offer(request(1, 'item/permissions/requestApproval', { permissions }));
  f.bridge.resolve(f.bridge.replay()[0].id, 'allow');
  assert.deepEqual(f.replies[0].result, { permissions, scope: 'turn' });
  await f.offer(request(2, 'item/permissions/requestApproval', { permissions }));
  [...f.timers.values()][0]();
  assert.deepEqual(f.replies.at(-1).result, { permissions: {}, scope: 'turn' });
  assert.equal(f.frames.at(-1).type, 'perm-hook-timeout');
});

test('native questions reuse the existing answer normalization and close resolves with no fabricated answer', async () => {
  const f = fixture(), questions = [{ id: 'choice', question: 'Choose', options: [{ label: 'A' }] }];
  await f.offer(request(1, 'item/tool/requestUserInput', { questions }));
  assert.equal(f.frames[0].type, 'sdk-ask-pending');
  f.bridge.resolve(f.frames[0].id, { Choose: 'A' });
  assert.deepEqual(f.replies[0].result, { answers: { choice: { answers: ['A'] } } });
  await f.offer(request(2, 'item/tool/requestUserInput', { questions }));
  f.bridge.close(); assert.deepEqual(f.replies.at(-1).result, { answers: {} });
  assert.equal(f.bridge.replay().length, 0); assert.equal(f.timers.size, 0);
});

test('unowned and malformed requests never reach the UI, and resolution while ownership is pending cannot revive them', async () => {
  const denied = fixture();
  await denied.offer({ ...request(1), params: { ...request(1).params, threadId: 'other' } });
  await denied.offer(request(2, 'item/tool/requestUserInput', { questions: [{ id: 'x', question: {} }] }));
  assert.equal(denied.frames.length, 0); assert.equal(denied.replies.length, 2);
  let prove;
  const f = fixture(() => new Promise(resolve => { prove = resolve; }));
  const pending = f.offer(request(7));
  assert.equal(f.bridge.resolvedNative(7), true);
  prove(true); await pending;
  assert.equal(f.frames.length, 0); assert.equal(f.bridge.replay().length, 0);
});

test('replayed approvals are immutable and restarted native ID reuse cannot accept an old UI reply', async () => {
  const f = fixture(); await f.offer(request(1));
  const old = f.bridge.replay()[0];
  old.input.command = 'mutated';
  assert.equal(f.bridge.replay()[0].input.command, 'fixture command');
  f.bridge.resolvedNative(1); await f.offer(request(1));
  const fresh = f.bridge.replay()[0]; assert.notEqual(fresh.id, old.id);
  assert.equal(f.bridge.resolve(old.id, 'allow'), false);
  f.bridge.clearTurn('other', 'turn'); assert.equal(f.bridge.replay().length, 1);
  f.bridge.clearTurn('root', 'turn'); assert.equal(f.bridge.replay().length, 0);
  assert.equal(f.replies.at(-1).result.decision, 'decline');
});

test('failed UI delivery releases a native question with no grant or invented answer', async () => {
  const replies = [], projected = [], timers = new Map();
  const bridge = createSdkAppServerApprovals({ scope: { instanceKey: 'a' }, ownsThread: async () => true,
    broadcast() { throw new Error('fixture offline'); },
    onPending: (frame, message) => projected.push(message.itemId),
    onResolved: (frame, result) => projected.push(result),
    setTimer(fn) { timers.set(1, fn); return 1; }, clearTimer(id) { timers.delete(id); } });
  assert.equal(await bridge.handle(request(1, 'item/tool/requestUserInput', {
    itemId: 'card', questions: [{ id: 'choice', question: 'Choose' }],
  }), result => replies.push(result)), false);
  assert.deepEqual(replies, [{ answers: {} }]);
  assert.deepEqual(projected, ['card', { answers: {} }]);
  assert.deepEqual(bridge.replay(), []); assert.equal(timers.size, 0);
});
