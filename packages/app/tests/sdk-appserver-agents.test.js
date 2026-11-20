import test from 'node:test';
import assert from 'node:assert/strict';
import { createSdkAppServerAgents } from '../lib/sdk-appserver-agents.js';

function fixture({ readThread, ownsThread } = {}) {
  const frames = [];
  const tracker = createSdkAppServerAgents({ scope: { cwd: '/same', instanceKey: 'a' }, rootThreadId: 'root',
    ownsThread: ownsThread || (async id => ['child', 'nested'].includes(id)),
    readThread: readThread || (async id => ({ id, source: { subAgent: { thread_spawn: {
      parent_thread_id: id === 'nested' ? 'child' : 'root', agent_nickname: id === 'child' ? 'Native Name' : 'Nested Name',
    } } } })), broadcast: f => frames.push(f) });
  const send = (method, params) => tracker.handle({ method, params });
  const turn = (method, threadId = 'child', id = 'turn', extra = {}) => send(method, { threadId, turn: { id, startedAt: 123, ...extra } });
  return { tracker, frames, send, turn };
}

test('only owned native child lifecycle controls the active snapshot, independent of root settlement and idle notices', async () => {
  const f = fixture();
  await f.send('item/completed', { threadId: 'root', item: { type: 'collabAgentToolCall', tool: 'spawnAgent',
    receiverThreadIds: ['child'], agentsStates: { child: { status: 'pendingInit' } } } });
  assert.equal(f.tracker.snapshot().agents[0].status, 'pending');
  assert.equal(f.tracker.snapshot().agents[0].createdAt, null);
  await f.turn('turn/started');
  await f.turn('turn/completed', 'root', 'root-turn', { status: 'completed' });
  await f.send('thread/status/changed', { threadId: 'child', status: { type: 'idle' } });
  const agent = f.tracker.snapshot().agents[0];
  assert.equal(agent.status, 'in_progress'); assert.equal(agent.name, 'Native Name');
  assert.equal(agent.createdAt, 123000); assert.equal(agent.lastToolName, null);
  await f.send('item/started', { threadId: 'child', turnId: 'turn', item: { id: 'shell', type: 'commandExecution', command: 'synthetic' } });
  assert.equal(f.tracker.snapshot().agents[0].lastToolName, 'shell_command');
  agent.title = 'mutated'; assert.equal(f.tracker.snapshot().agents[0].title, 'Native Name');
  await f.turn('turn/completed', 'child', 'turn', { status: 'completed' });
  assert.deepEqual(f.tracker.snapshot().agents, []);
  assert.equal(f.frames.at(-1).instanceKey, 'a');
});

test('late spawn receipts, wait results and old turn events cannot resurrect a settled child or settle its new turn', async () => {
  const f = fixture();
  await f.turn('turn/started'); await f.turn('turn/completed', 'child', 'turn', { status: 'completed' });
  await f.send('item/completed', { threadId: 'root', item: { type: 'collabAgentToolCall', tool: 'spawnAgent',
    receiverThreadIds: ['child'], agentsStates: { child: { status: 'pendingInit' } } } });
  await f.turn('turn/started'); assert.deepEqual(f.tracker.snapshot().agents, []);
  await f.turn('turn/started', 'child', 'new', { startedAt: 456 });
  await f.turn('turn/completed', 'child', 'turn', { status: 'failed' });
  assert.equal(f.tracker.snapshot().agents[0].turnId, 'new'); assert.equal(f.tracker.snapshot().agents[0].createdAt, 456000);
  await f.send('item/started', { threadId: 'child', turnId: 'turn', item: { id: 'old', type: 'webSearch' } });
  assert.equal(f.tracker.snapshot().agents[0].lastToolName, null);
  await f.turn('turn/completed', 'child', 'new', { status: 'interrupted' });
  await f.send('item/completed', { threadId: 'root', item: { type: 'collabAgentToolCall', tool: 'wait',
    receiverThreadIds: ['nested'], agentsStates: { nested: { status: 'completed' } } } });
  assert.deepEqual(f.tracker.snapshot().agents, []);
});

test('nested agents use proved native identity and same-name unrelated roots never enter the table', async () => {
  const f = fixture();
  await f.turn('turn/started', 'unrelated'); assert.deepEqual(f.frames, []);
  await f.turn('turn/started');
  await f.send('item/started', { threadId: 'child', turnId: 'turn', item: { id: 'spawn', type: 'collabAgentToolCall', tool: 'spawnAgent' } });
  await f.turn('turn/started', 'nested', 'nested-turn');
  assert.deepEqual(f.tracker.snapshot().agents.map(a => a.name), ['Native Name', 'Nested Name']);
  assert.equal(f.tracker.snapshot().agents[0].lastToolName, 'spawn_agent');
  await f.turn('turn/completed'); assert.equal(f.tracker.snapshot().agents.length, 1);
  f.tracker.close(); assert.deepEqual(f.frames.at(-1).agents, []);
  await f.turn('turn/started', 'nested', 'after-close'); assert.deepEqual(f.tracker.snapshot().agents, []);
});

test('ownership checks preserve notification order, and closing during metadata lookup cannot publish a retired child', async () => {
  let release;
  const f = fixture({ readThread: id => new Promise(resolve => { release = () => resolve({ id,
    source: { subAgent: { thread_spawn: { parent_thread_id: 'root', agent_nickname: 'Late' } } } }); }) });
  const started = f.turn('turn/started'), ended = f.turn('turn/completed', 'child', 'turn', { status: 'completed' });
  await new Promise(resolve => setImmediate(resolve)); release(); await Promise.all([started, ended]);
  assert.deepEqual(f.frames.map(frame => frame.agents.length), [1, 0]);
  let finish;
  const retired = fixture({ ownsThread: () => new Promise(resolve => { finish = resolve; }) });
  const pending = retired.turn('turn/started'); await Promise.resolve(); retired.tracker.close(); finish(false); await pending;
  assert.deepEqual(retired.tracker.snapshot().agents, []);
});

test('owned forks without native subagent identity are excluded and a bounded ownership backlog fails visibly closed', async () => {
  const fork = fixture({ ownsThread: async () => true, readThread: async id => ({ id, parentThreadId: 'root', source: 'cli' }) });
  await fork.turn('turn/started'); assert.deepEqual(fork.tracker.snapshot().agents, []);
  let release;
  const f = fixture({ ownsThread: () => new Promise(resolve => { release = resolve; }) });
  const work = [];
  for (let i = 0; i < 1025; i++) work.push(f.turn('turn/started'));
  assert.equal(f.tracker.snapshot().available, false); assert.deepEqual(f.frames.at(-1).agents, []);
  await Promise.all(work); // overflow happened before the first lookup starts
  assert.equal(release, undefined);
});
