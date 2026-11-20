import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getSdkTaskState, initSdkSession, interruptTurn, resumeSdkSession,
  sendUserMessage, stopSession } from '../lib/sdk-manager.js';

const todo = (id, items) => ({ id, type: 'todo_list', items });

async function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-sdk-tasks-'));
  const script = join(dir, 'codex.mjs');
  writeFileSync(script, `#!/usr/bin/env node
let input = ''; for await (const chunk of process.stdin) input += chunk;
const events = JSON.parse(input);
for (const event of events) {
  if (event.wait) await new Promise(resolve => setTimeout(resolve, event.wait));
  else process.stdout.write(JSON.stringify(event) + '\\n');
}
`);
  chmodSync(script, 0o755);
  try { await run(dir, script); }
  finally { stopSession(); rmSync(dir, { recursive: true, force: true }); }
}

const start = { type: 'thread.started', thread_id: 'tasks-thread' };
const end = { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } };

test('SDK task snapshots replace lists in event order and never infer a running step', async () => {
  await fixture(async (dir, script) => {
    const frames = [];
    const view = initSdkSession(dir, 'tasks', { codexPath: script, broadcastWs: frame => frames.push(frame) });
    await sendUserMessage(JSON.stringify([start,
      { type: 'item.started', item: todo('first', [{ text: 'Read', completed: false }]) },
      { type: 'item.updated', item: todo('second', [{ text: 'Other', completed: false }]) },
      { type: 'item.updated', item: todo('first', [
        { text: 'Read', completed: true }, { text: 'Verify', completed: false },
        { text: 'Invalid', completed: 'false' }, null,
      ]) }, end,
    ]), view);
    const state = getSdkTaskState(view);
    assert.equal(state.sessionId, 'tasks-thread');
    assert.equal(state.cwd, dir);
    assert.equal(state.instanceKey, view.instanceKey);
    assert.deepEqual(state.tasks, [
      { taskId: 'first:0', subject: 'Read', status: 'completed' },
      { taskId: 'first:1', subject: 'Verify', status: 'pending' },
    ]);
    assert.ok(frames.some(frame => frame.type === 'sdk-task-snapshot' && frame.tasks.length === 2));
    state.tasks[0].subject = 'mutated';
    assert.equal(getSdkTaskState(view).tasks[0].subject, 'Read', 'snapshots cannot mutate SDK items');
    await sendUserMessage(JSON.stringify([start, end]), view);
    assert.deepEqual(getSdkTaskState(view).tasks, [], 'new prompt resets the prior batch without needing another plan');
  });
});

test('SDK task failure and interrupt settle incomplete tasks without losing completed steps', async () => {
  await fixture(async (dir, script) => {
    const view = initSdkSession(dir, 'tasks', { codexPath: script, onEntry() {} });
    const items = [{ text: 'Read', completed: true }, { text: 'Verify', completed: false }];
    await sendUserMessage(JSON.stringify([start,
      { type: 'item.started', item: todo('todo', items) },
      { type: 'turn.failed', error: { message: 'failure' } },
    ]), view);
    assert.deepEqual(getSdkTaskState(view).tasks.map(task => task.status), ['completed', 'failed']);
    let observed;
    const ready = new Promise(resolve => { observed = resolve; });
    initSdkSession(dir, 'tasks', { codexPath: script, onEntry() {}, broadcastWs(frame) {
      if (frame.type === 'sdk-task-snapshot' && frame.tasks.length) observed();
    } });
    const running = sendUserMessage(JSON.stringify([start,
      { type: 'item.started', item: todo('todo', items) }, { wait: 30000 }, end,
    ]), view);
    await ready;
    interruptTurn(view);
    await running;
    assert.deepEqual(getSdkTaskState(view).tasks.map(task => task.status), ['completed', 'failed']);
  });
});

test('SDK task snapshots stay with the exact instance and reset on history resume', async () => {
  await fixture(async (dir, script) => {
    const a = initSdkSession(dir, 'same', { codexPath: script });
    const b = initSdkSession(join(dir, 'other'), 'same', { codexPath: script });
    await sendUserMessage(JSON.stringify([start,
      { type: 'item.updated', item: todo('todo', [{ text: 'A only', completed: false }]) }, end,
    ]), a);
    assert.equal(getSdkTaskState(a).tasks[0].subject, 'A only');
    assert.deepEqual(getSdkTaskState(b).tasks, []);
    await resumeSdkSession(a, async () => ({ threadId: 'resumed-thread', messages: [{ role: 'user', content: 'history' }] }));
    assert.equal(getSdkTaskState(a).sessionId, 'resumed-thread');
    assert.deepEqual(getSdkTaskState(a).tasks, []);
  });
});

test('SDK generation guard drops task events from a replaced stream', async () => {
  await fixture(async (dir, script) => {
    let started;
    const ready = new Promise(resolve => { started = resolve; });
    const view = initSdkSession(dir, 'old', { codexPath: script, broadcastWs(frame) {
      if (frame.type === 'sdk-task-snapshot' && frame.tasks.length) started();
    } });
    const running = sendUserMessage(JSON.stringify([start,
      { type: 'item.updated', item: todo('old', [{ text: 'Old', completed: false }]) },
      { wait: 30000 }, end,
    ]), view);
    await ready;
    const frames = [];
    initSdkSession(dir, 'new', { codexPath: script, broadcastWs: frame => frames.push(frame) });
    await running;
    assert.deepEqual(getSdkTaskState(view).tasks, []);
    assert.equal(frames.filter(frame => frame.type === 'sdk-task-snapshot').every(frame => !frame.tasks.length), true);
  });
});
