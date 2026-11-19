import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeSdkSession, getSdkQueueState, initSdkSession, interruptTurn, removeSdkQueuedMessage, resumeSdkSession, sendSdkQueuedNow, sendUserMessage, stopSession } from '../lib/sdk-manager.js';

async function fixture(run) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-sdk-queue-')));
  const a = join(root, 'a', 'same'), b = join(root, 'b', 'same');
  for (const cwd of [a, b]) mkdirSync(cwd, { recursive: true });
  const executable = join(root, 'fake-codex.mjs');
  writeFileSync(executable, String.raw`#!/usr/bin/env node
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
let input=''; for await (const chunk of process.stdin) input+=chunk;
const cwd=process.env.CXV_PROJECT_DIR;
appendFileSync(join(cwd,'calls'),JSON.stringify(input)+'\n');
for(const event of [{type:'thread.started',thread_id:'queue-native-thread'},{type:'turn.started'}])process.stdout.write(JSON.stringify(event)+'\n');
if(input.startsWith('hold')) {writeFileSync(join(cwd,'ready'),'ready');while(!existsSync(join(cwd,'release')))await new Promise(r=>setTimeout(r,10));}
for(const event of [{type:'item.completed',item:{id:'reply',type:'agent_message',text:input}},{type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}])process.stdout.write(JSON.stringify(event)+'\n');
`);
  chmodSync(executable, 0o755);
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = root;
  const framesA = [], framesB = [], pending = [];
  const options = frames => ({ codexPath: executable, broadcastWs: frame => frames.push(frame) });
  const infoA = initSdkSession(a, 'same', options(framesA)), infoB = initSdkSession(b, 'same', options(framesB));
  const start = (text, info) => {
    const promise = sendUserMessage(text, { instanceKey: info.instanceKey });
    pending.push(promise); return promise;
  };
  try { await run({ root, a, b, infoA, infoB, framesA, framesB, options, start }); }
  finally {
    stopSession(); await Promise.allSettled(pending);
    if (previous === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previous;
    rmSync(root, { recursive: true, force: true });
  }
}

async function ready(cwd) {
  const deadline = Date.now() + 5000;
  while (!existsSync(join(cwd, 'ready'))) {
    assert.ok(Date.now() < deadline, 'fake child readiness');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
const queue = info => getSdkQueueState({ instanceKey: info.instanceKey });
const calls = cwd => readFileSync(join(cwd, 'calls'), 'utf8').trim().split('\n').map(JSON.parse);

test('queue snapshots have stable per-instance ids, fresh copies and explicit dispatch/acceptance transitions', async () => fixture(async f => {
  const running = f.start('hold A', f.infoA); await ready(f.a);
  const first = await f.start('identical prompt', f.infoA), second = await f.start('identical prompt', f.infoA);
  assert.notEqual(first.id, second.id);
  assert.equal(first.queued, true);
  const snapshot = queue(f.infoA);
  assert.equal(snapshot.activeInput.text, 'hold A');
  snapshot.activeInput.text = 'caller mutation';
  assert.equal(queue(f.infoA).activeInput.text, 'hold A');
  assert.deepEqual(snapshot.items.map(item => item.id), [first.id, second.id]);
  assert.ok(snapshot.items.every(item => item.status === 'queued' && Number.isFinite(item.ts)));
  snapshot.items[0].text = 'caller mutation'; snapshot.items.pop();
  assert.equal(queue(f.infoA).items[0].text, 'identical prompt');
  assert.equal(queue(f.infoA).items.length, 2);
  assert.deepEqual(queue(f.infoB).items, []);
  assert.ok(f.framesA.every(frame => frame.instanceKey === f.infoA.instanceKey && frame.cwd === f.a));
  writeFileSync(join(f.a, 'release'), 'go'); await running;
  assert.deepEqual(calls(f.a), ['hold A', 'identical prompt', 'identical prompt']);
  const frames = f.framesA.filter(frame => frame.type === 'queue-state');
  for (const item of [first, second]) {
    const dispatch = frames.findIndex(frame => frame.items.some(row => row.id === item.id && row.status === 'dispatching'));
    assert.ok(dispatch >= 0);
    assert.ok(frames.slice(dispatch + 1).some(frame => !frame.items.some(row => row.id === item.id)));
  }
  assert.deepEqual(queue(f.infoA).items, []);
  assert.equal(queue(f.infoA).activeInput, null);
}));

test('the 50-item limit explicitly rejects overflow without changing the accepted queue or another workspace', async () => fixture(async f => {
  const running = f.start('hold A', f.infoA); await ready(f.a);
  for (let index = 0; index < 50; index++) await f.start(`queued ${index}`, f.infoA);
  const before = queue(f.infoA);
  await assert.rejects(sendUserMessage('overflow', { instanceKey: f.infoA.instanceKey }), { code: 'SDK_QUEUE_FULL' });
  assert.deepEqual(queue(f.infoA), before);
  assert.deepEqual(queue(f.infoB).items, []);
  assert.equal(interruptTurn({ instanceKey: f.infoA.instanceKey }), true);
  await running;
  assert.equal(queue(f.infoA).items.length, 50);
  assert.equal(queue(f.infoA).paused, true);
  assert.deepEqual(calls(f.a), ['hold A']);
}));

test('reset and close do not replay a stale queue into a reused cwd identity', async () => fixture(async f => {
  const old = f.start('hold old', f.infoA); await ready(f.a);
  const queued = await f.start('never execute after reset', f.infoA);
  const previousEpoch = queue(f.infoA).epoch;
  initSdkSession(f.a, 'same', f.options(f.framesA)); await old;
  assert.notEqual(queue(f.infoA).epoch, previousEpoch);
  assert.equal(queue(f.infoA).activeInput, null);
  assert.deepEqual(queue(f.infoA).items, []);
  closeSdkSession({ instanceKey: f.infoA.instanceKey });
  assert.throws(() => queue(f.infoA), { code: 'SDK_SESSION_NOT_FOUND' });
  initSdkSession(f.a, 'same', f.options(f.framesA));
  const next = f.start('fresh', f.infoA); await next;
  assert.deepEqual(calls(f.a), ['hold old', 'fresh']);
  assert.ok(!queue(f.infoA).items.some(item => item.id === queued.id));
}));

test('removing one queued id leaves identical prompts, the current turn and sibling workspaces intact', async () => fixture(async f => {
  const dispatchErrors = [];
  initSdkSession(f.a, 'same', { ...f.options(f.framesA), broadcastWs(frame) {
    f.framesA.push(frame);
    const dispatch = frame.items?.find(item => item.status === 'dispatching');
    if (dispatch) {
      try { removeSdkQueuedMessage(dispatch.id, { instanceKey: f.infoA.instanceKey }); }
      catch (error) { dispatchErrors.push(error.code); }
    }
  } });
  const running = f.start('hold A', f.infoA); await ready(f.a);
  const first = await f.start('identical', f.infoA), second = await f.start('identical', f.infoA);
  const before = queue(f.infoA);
  assert.throws(() => removeSdkQueuedMessage(first.id, { instanceKey: f.infoB.instanceKey }), { code: 'SDK_QUEUE_NOT_FOUND' });
  for (const value of [null, '', [], 'x'.repeat(129)]) {
    assert.throws(() => removeSdkQueuedMessage(value, { instanceKey: f.infoA.instanceKey }), { code: 'SDK_QUEUE_INVALID_ID' });
  }
  assert.deepEqual(queue(f.infoA), before);
  assert.equal(removeSdkQueuedMessage(first.id, { instanceKey: f.infoA.instanceKey }), true);
  assert.deepEqual(queue(f.infoA).items.map(item => item.id), [second.id]);
  assert.throws(() => removeSdkQueuedMessage(first.id, { instanceKey: f.infoA.instanceKey }), { code: 'SDK_QUEUE_NOT_FOUND' });
  assert.deepEqual(calls(f.a), ['hold A']);
  writeFileSync(join(f.a, 'release'), 'go'); await running;
  assert.deepEqual(calls(f.a), ['hold A', 'identical']);
  assert.ok(dispatchErrors.length > 0);
  assert.ok(dispatchErrors.every(code => code === 'SDK_QUEUE_DISPATCHING'));
}));

test('Stop parks accepted messages, blocks history replacement, and a fresh prompt resumes the backlog', async () => fixture(async f => {
  const running = f.start('hold A', f.infoA); await ready(f.a);
  const first = await f.start('queued first', f.infoA), second = await f.start('queued second', f.infoA);
  interruptTurn({ instanceKey: f.infoA.instanceKey }); await running;
  assert.equal(queue(f.infoA).paused, true);
  assert.deepEqual(queue(f.infoA).items.map(item => item.id), [first.id, second.id]);
  assert.deepEqual(calls(f.a), ['hold A']);
  let read = false;
  await assert.rejects(resumeSdkSession({ instanceKey: f.infoA.instanceKey }, () => { read = true; }), { code: 'SDK_SESSION_BUSY' });
  assert.equal(read, false, 'history replacement must not silently discard a parked backlog');
  await f.start('fresh explicit prompt', f.infoA);
  assert.equal(queue(f.infoA).paused, false);
  assert.deepEqual(calls(f.a), ['hold A', 'fresh explicit prompt', 'queued first', 'queued second']);
}));

test('send-now preempts once, keeps the backlog and cannot act on a sibling or invalid id', async () => fixture(async f => {
  const running = f.start('hold A', f.infoA); await ready(f.a);
  const first = await f.start('first queued', f.infoA), selected = await f.start('selected queued', f.infoA);
  const before = queue(f.infoA);
  await assert.rejects(sendSdkQueuedNow(selected.id, { instanceKey: f.infoB.instanceKey }), { code: 'SDK_QUEUE_NOT_FOUND' });
  await assert.rejects(sendSdkQueuedNow('', { instanceKey: f.infoA.instanceKey }), { code: 'SDK_QUEUE_INVALID_ID' });
  assert.deepEqual(queue(f.infoA), before);
  const sending = sendSdkQueuedNow(selected.id, { instanceKey: f.infoA.instanceKey });
  const duplicate = sendSdkQueuedNow(selected.id, { instanceKey: f.infoA.instanceKey });
  const competing = sendSdkQueuedNow(first.id, { instanceKey: f.infoA.instanceKey });
  assert.equal(queue(f.infoA).items[0].status, 'dispatching');
  await assert.rejects(duplicate, { code: 'SDK_QUEUE_DISPATCHING' });
  await assert.rejects(competing, { code: 'SDK_QUEUE_DISPATCHING' });
  await sending; await running;
  assert.deepEqual(calls(f.a), ['hold A', 'selected queued', 'first queued']);
  assert.deepEqual(queue(f.infoA).items, []);
}));

test('Stop in the send-now cancellation window returns the selection to the parked queue, then an idle send-now resumes it', async () => fixture(async f => {
  const running = f.start('hold A', f.infoA); await ready(f.a);
  const first = await f.start('first queued', f.infoA), selected = await f.start('selected queued', f.infoA);
  const sending = sendSdkQueuedNow(selected.id, { instanceKey: f.infoA.instanceKey });
  interruptTurn({ instanceKey: f.infoA.instanceKey });
  await sending; await running;
  assert.equal(queue(f.infoA).paused, true);
  assert.deepEqual(queue(f.infoA).items.map(item => [item.id, item.status]), [[selected.id, 'queued'], [first.id, 'queued']]);
  assert.deepEqual(calls(f.a), ['hold A']);
  await sendSdkQueuedNow(selected.id, { instanceKey: f.infoA.instanceKey });
  assert.deepEqual(calls(f.a), ['hold A', 'selected queued', 'first queued']);
  assert.deepEqual(queue(f.infoA).items, []);
}));
