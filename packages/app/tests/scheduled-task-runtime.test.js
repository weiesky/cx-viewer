import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
const root = mkdtempSync(join(tmpdir(), 'cxv-task-runtime-'));
const a = join(root, 'a/same'), b = join(root, 'b/same'), logs = join(root, 'logs');
for (const dir of [a, b, logs]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_PROJECT_DIR: a, CXV_LOG_DIR: logs,
  CXV_TEST: '1', CXV_CLI_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_SDK_MODE: '1', CXV_START_PORT: '20950', CXV_MAX_PORT: '20959' });
const sdk = await import('../lib/sdk-manager.js'), server = await import('../server.js');
const store = await import('../lib/scheduled-task-store.js');
const scheduler = await import('../lib/scheduled-task-scheduler.js');
const { writePreferences } = await import('../lib/preferences.js');
async function until(fn) { const end = Date.now() + 5000; while (!fn()) { if (Date.now() > end) throw new Error('runtime fixture timeout'); await new Promise(r => setTimeout(r, 10)); } }

test('server scheduling lifecycle performs native inject/spawn, scopes SSE, replays approvals and stops only owned execution', async () => {
  const script = join(root, 'native.mjs');
  writeFileSync(script, readFileSync(new URL('./fixtures/scheduled-native.txt', import.meta.url)));
  const frames = [], entries = [];
  const config = { codexPath: script, transport: 'appserver', onEntry: entry => entries.push(entry),
    broadcastWs: frame => { frames.push(frame); server.broadcastWsMessage(frame); } };
  sdk.setSdkLaunchConfig(config);
  const first = sdk.initSdkSession(a, 'same', config), second = sdk.initSdkSession(b, 'same', config);
  let ws;
  const streams = [];
  const readStream = async instance => {
    const controller = new AbortController(); streams.push(controller);
    const response = await fetch(base + '/events?instance=' + instance, { signal: controller.signal });
    const state = { text: '' }, reader = response.body.getReader();
    const pending = (async () => { try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; state.text += new TextDecoder().decode(chunk.value); } } catch {} })();
    streams.push({ abort: () => {}, pending }); return state;
  };
  let base;
  try {
    await server.startViewer(); base = `http://127.0.0.1:${server.getPort()}`;
    assert.equal(scheduler.isSchedulerRunning(), true);
    // Management mode starts the timer but cannot consume work before launch.
    const now = Date.now();
    const once = (await store.createTask(logs, { project: 'same', cwd: a, instanceKey: first.instanceKey, engine: 'sdk', transport: 'appserver',
      mode: 'inject', prompt: 'automatic', schedule: { kind: 'once', at: now - 1000 } }, now - 120000)).task;
    await scheduler.__tickForTests(now);
    assert.equal(store.getTask(logs, once.id).claim, null);
    assert.equal(store.getTask(logs, once.id).completedAt, null);
    const ownStream = await readStream(first.instanceKey), siblingStream = await readStream(second.instanceKey);
    server.setWorkspaceLaunched(true);
    await scheduler.__tickForTests(now);
    await until(() => store.getTask(logs, once.id).lastResult === 'dispatched');
    await until(() => entries.some(entry => entry.mainAgent));
    await until(() => ownStream.text.includes('event: scheduled_tasks'));
    assert.equal(siblingStream.text.includes('event: scheduled_tasks'), false);
    const before = sdk.getSdkSessionInfo(first);
    const post = async (path, body) => {
      const response = await fetch(base + path + '?instance=' + first.instanceKey, { method: 'POST',
        headers: { 'content-type': 'application/json', Origin: base }, body: JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };
    const create = prompt => post('/api/scheduled-tasks', { project: 'same', instance: first.instanceKey,
      mode: 'spawn', prompt, schedule: { kind: 'daily', time: '09:00' } });
    const fresh = (await create('fresh')).data.task;
    assert.equal((await post('/api/scheduled-tasks/run', { id: fresh.id })).status, 202);
    await until(() => store.getTask(logs, fresh.id).lastResult === 'completed');
    assert.deepEqual(sdk.getSdkSessionInfo(first), before);
    const approval = (await create('approval')).data.task;
    await post('/api/scheduled-tasks/run', { id: approval.id });
    await until(() => sdk.getSdkPendingApprovals(first).some(frame => frame.origin === 'scheduled-task'));
    ws = new WebSocket(base.replace('http', 'ws') + '/ws/terminal?instance=' + first.instanceKey, { headers: { Origin: base } });
    const messages = []; ws.on('message', bytes => { messages.push(JSON.parse(bytes)); });
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    await until(() => messages.some(frame => frame.type === 'perm-hook-pending' && frame.origin === 'scheduled-task'));
    const pending = messages.find(frame => frame.type === 'perm-hook-pending');
    ws.send(JSON.stringify({ type: 'perm-hook-answer', id: pending.id, decision: 'allow', instanceKey: first.instanceKey }));
    await until(() => store.getTask(logs, approval.id).lastResult === 'completed');
    assert.equal(sdk.getSdkPendingApprovals(first).length, 0);
    writePreferences({ approvalModal: { askAutoAnswerMinutes: 10 } });
    const hostedAsk = (await create('ask')).data.task;
    await post('/api/scheduled-tasks/run', { id: hostedAsk.id });
    await until(() => messages.some(frame => frame.type === 'sdk-ask-pending'));
    const askPending = messages.find(frame => frame.type === 'sdk-ask-pending');
    assert.equal(askPending.instanceKey, first.instanceKey);
    assert.ok(askPending.autoAnswerAt > Date.now());
    ws.send(JSON.stringify({ type: 'ask-auto-cancel', id: askPending.id, instanceKey: first.instanceKey }));
    await until(() => messages.some(frame => frame.type === 'ask-auto-cancel' && frame.id === askPending.id));
    const replay = sdk.getSdkPendingApprovals(first).find(frame => frame.id === askPending.id);
    assert.equal(replay.autoCancelled, true); assert.equal(replay.autoAnswerAt, null);
    assert.ok(store.getTask(logs, hostedAsk.id).claim, 'cancel hosting keeps the task waiting for a manual answer');
    ws.send(JSON.stringify({ type: 'sdk-ask-answer', id: askPending.id,
      answers: { choice: { answers: ['First'] } }, instanceKey: first.instanceKey }));
    await until(() => store.getTask(logs, hostedAsk.id).lastResult === 'completed');
    writePreferences({});
    const holding = (await create('hold')).data.task;
    await post('/api/scheduled-tasks/run', { id: holding.id });
    await until(() => store.getTask(logs, holding.id).claim);
    ws.close();
    for (const stream of streams) stream.abort();
    await server.stopViewer();
    assert.equal(scheduler.isSchedulerRunning(), false);
    assert.equal(store.getTask(logs, holding.id).lastResult, 'error');
    assert.deepEqual(sdk.getSdkSessionInfo(first), before, 'server task shutdown does not reset the resident session');
    assert.equal(sdk.getSdkSessionInfo(second).sessionId, null);
  } finally {
    ws?.terminate(); for (const stream of streams) stream.abort();
    await sdk.stopSession(); sdk.setSdkLaunchConfig(null); await server.stopViewer();
    await Promise.all(streams.map(stream => stream.pending));
    rmSync(root, { recursive: true, force: true });
  }
});
