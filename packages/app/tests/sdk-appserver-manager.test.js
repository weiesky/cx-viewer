import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSdkTaskState, getSdkSessionInfo, initSdkSession, sendUserMessage, stopSession,
  getSdkQueueState, interruptTurn, sendSdkQueuedNow, listSdkSessions, getInitialPrompt,
  setSdkLaunchConfig, launchSdkSession, resumeSdkSession, retryInterruptedTurn,
  getSdkPendingApprovals, resolveApproval } from '../lib/sdk-manager.js';

async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-native-manager-'));
  const a = join(root, 'a', 'same'), b = join(root, 'b', 'same');
  mkdirSync(a, { recursive: true }); mkdirSync(b, { recursive: true });
  const script = join(root, 'codex.mjs');
  writeFileSync(script, `import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
appendFileSync('native-calls.jsonl', JSON.stringify({ argv: process.argv }) + '\\n');
const send = frame => process.stdout.write(JSON.stringify(frame) + '\\n');
let threadId, turnId;
for await (const line of createInterface({ input: process.stdin })) {
 const f = JSON.parse(line), p = f.params || {};
 if (!f.method || f.method === 'initialized') continue;
 if (f.method === 'initialize') { send({ id: f.id, result: {} }); continue; }
 if (f.method === 'thread/start' || f.method === 'thread/resume') {
  appendFileSync('native-calls.jsonl', JSON.stringify({ method: f.method, params: p }) + '\\n');
  threadId = p.threadId || randomUUID(); send({ id: f.id, result: { thread: { id: threadId } } }); continue;
 }
 if (f.method === 'turn/interrupt') {
  send({ id: f.id, result: {} }); send({ method: 'turn/completed', params: { threadId, turn: { id: p.turnId, status: 'interrupted' } } }); continue;
 }
 if (f.method !== 'turn/start') { send({ id: f.id, error: { code: -32601, message: 'unsupported' } }); continue; }
 turnId = randomUUID(); const text = p.input[0].text;
 appendFileSync('native-inputs.jsonl', JSON.stringify({ threadId, turnId, text }) + '\\n');
 send({ id: f.id, result: { turn: { id: turnId } } });
 send({ method: 'turn/started', params: { threadId, turn: { id: turnId, status: 'inProgress' } } });
 send({ method: 'turn/plan/updated', params: { threadId, turnId, plan: [{ step: text, status: 'inProgress' }] } });
 if (text === 'hold approval') send({ id: 'approval', method: 'item/commandExecution/requestApproval',
  params: { threadId, turnId, itemId: 'command', command: 'echo fixture', availableDecisions: ['accept', 'decline'] } });
 if (text.includes('hold')) continue;
 if (text === 'compact native') {
  const item = { id: 'compact', type: 'contextCompaction' };
  send({ method: 'item/started', params: { threadId, turnId, item } });
  send({ method: 'item/completed', params: { threadId: 'foreign', turnId, item } });
  send({ method: 'item/completed', params: { threadId, turnId: 'foreign', item } });
  send({ method: 'item/completed', params: { threadId, turnId, item } });
  send({ method: 'item/completed', params: { threadId, turnId, item } });
 }
 if (text === 'retry-success') send({ method: 'error', params: { threadId, turnId, willRetry: true, error: { message: 'Reconnecting... native count unknown' } } });
 if (text.startsWith('fail')) {
  const status = text === 'fail:auth' ? 401 : text === 'fail:network' ? null : text === 'fail:invalid' ? '503' : 503;
  const info = text === 'fail:unknown' ? 'other' : { httpConnectionFailed: { httpStatusCode: status } };
  send({ method: 'error', params: { threadId, turnId: text === 'fail:foreign' ? 'foreign-turn' : turnId,
   willRetry: text !== 'fail:unobserved', error: { message: 'Reconnecting... 5/5, status 503', codexErrorInfo: info } } });
  send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'failed',
   error: { message: 'native final failure', codexErrorInfo: info } } } }); continue;
 }
 if (text === 'images') for (const item of [
  { id: 'mcp-image', type: 'mcpToolCall', server: 'fixture', tool: 'image', status: 'completed', result: {
   content: [{ type: 'text', text: 'MCP fixture' }, { type: 'image', mimeType: 'image/png', data: 'aGVsbG8=' }], structuredContent: { raw: true } } },
  { id: 'dynamic-image', type: 'dynamicToolCall', namespace: 'fixture', tool: 'dynamic', status: 'completed', success: true,
   arguments: { fixture: true }, contentItems: [{ type: 'inputImage', imageUrl: 'data:image/png;base64,aGVsbG8=' }] },
 ]) send({ method: 'item/completed', params: { threadId, turnId, item } });
 send({ method: 'item/completed', params: { threadId: 'unrelated-child', turnId: 'child-turn', item: { id: 'child', type: 'agentMessage', text: 'must not leak' } } });
 send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'collab', type: 'collabAgentToolCall', tool: 'spawnAgent', status: 'completed', receiverThreadIds: ['child'], agentsStates: { child: { status: 'running' } } } } });
 send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer', type: 'agentMessage', text: 'reply: ' + text } } });
 send({ method: 'thread/tokenUsage/updated', params: { threadId, turnId, tokenUsage: { last: { inputTokens: 3, outputTokens: 2 } } } });
 send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed', items: [] } } });
}
`);
  try { await run({ a, b, script }); }
  finally { stopSession(); setSdkLaunchConfig(null); rmSync(root, { recursive: true, force: true }); }
}

test('explicit native manager preserves the SDK archive contract and authentic task state without child transcript cross-talk', async () => {
  await fixture(async ({ a, b, script }) => {
    const entries = [], frames = [];
    const native = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script,
      onEntry: entry => entries.push(entry), broadcastWs: frame => frames.push(frame) });
    const original = initSdkSession(b, 'same', { codexPath: script });
    assert.equal(getSdkSessionInfo(original).transport, 'exec');
    assert.equal(getSdkSessionInfo(native).transport, 'appserver');
    const count = listSdkSessions().length;
    assert.throws(() => initSdkSession('/invalid', 'bad', { transport: 'unknown' }), /Unsupported/);
    assert.equal(listSdkSessions().length, count);
    await sendUserMessage('native plan', native);
    assert.equal(getSdkTaskState(native).tasks[0].status, 'in_progress');
    assert.deepEqual(getSdkTaskState(original).tasks, []);
    const main = entries.find(entry => entry.mainAgent);
    assert.equal(main.body.metadata.sdk, 'openai-codex-sdk');
    assert.equal(main.body.metadata.transport, 'appserver');
    assert.equal(main.body.metadata.cwd, a);
    assert.equal(main.response.body.usage.input_tokens, 3);
    assert.equal(JSON.stringify(main).includes('must not leak'), false);
    const tool = entries.find(entry => entry.method === 'TOOL');
    assert.equal(tool.body.tool_name, 'spawn_agent');
    assert.equal(tool.response.body.output.agentsStates.child.status, 'running');
    assert.ok(frames.some(frame => frame.type === 'sdk-task-snapshot' && frame.instanceKey === native.instanceKey && frame.tasks.length));
  });
});

test('native image tool results reach the existing image extractor while raw artifacts remain in the archive', async () => {
  await fixture(async ({ a, script }) => {
    const { parseSupportedToolResultImage } = await import('../lib/tool-result-image-protocol.js');
    const entries = [];
    const view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script, onEntry: entry => entries.push(entry) });
    await sendUserMessage('images', view);
    const main = entries.find(entry => entry.mainAgent);
    const results = main.body.input.flatMap(message => Array.isArray(message.content) ? message.content : [])
      .filter(block => block.type === 'tool_result' && ['mcp-image', 'dynamic-image'].includes(block.tool_use_id));
    assert.equal(results.length, 2);
    for (const result of results) assert.deepEqual(result.content.map(parseSupportedToolResultImage).find(Boolean),
      { type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' });
    const mcp = entries.find(entry => entry.method === 'TOOL' && entry.body._callId === 'mcp-image');
    assert.deepEqual(mcp.response.body.output.structuredContent, { raw: true });
    assert.equal(mcp.body.raw_item.result.content[1].mimeType, 'image/png');
    const dynamic = entries.find(entry => entry.method === 'TOOL' && entry.body._callId === 'dynamic-image');
    assert.equal(dynamic.body.raw_item.rawItem.success, true);
  });
});

test('native cancellation parks the existing queue, send-now keeps the thread, and busy transport changes reject before reset', async () => {
  await fixture(async ({ a, script }) => {
    let ready;
    const waiting = new Promise(resolve => { ready = resolve; });
    const entries = [], errors = [];
    const view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script,
      onEntry: entry => entries.push(entry), broadcastWs(frame) {
        if (frame.type === 'sdk-task-snapshot' && frame.tasks.length) ready();
        if (frame.type === 'sdk-error') errors.push(frame);
      } });
    const running = sendUserMessage('hold native', view);
    await waiting;
    const queued = await sendUserMessage('next native', view);
    assert.throws(() => initSdkSession(a, 'same', { codexPath: script }), { code: 'SDK_TRANSPORT_BUSY' });
    const threadId = getSdkSessionInfo(view).sessionId;
    interruptTurn(view); await running;
    assert.deepEqual(errors, [], 'native intentional interrupt must not surface as a failed query');
    assert.equal(getSdkQueueState(view).paused, true);
    assert.equal(getSdkQueueState(view).items[0].id, queued.id);
    await sendSdkQueuedNow(queued.id, view);
    assert.equal(getSdkSessionInfo(view).sessionId, threadId);
    assert.deepEqual(getSdkQueueState(view).items, []);
    assert.equal(entries.filter(entry => entry.mainAgent && entry.response.status === 200).length, 1);
    assert.ok(JSON.stringify(entries.at(-1).response).includes('reply: next native'));
  });
});

test('send-now cancels the preempted native approval immediately without touching a sibling approval', async () => {
  await fixture(async ({ a, b, script }) => {
    const frames = [], pending = [];
    const create = cwd => {
      let ready;
      const waiting = new Promise(resolve => { ready = resolve; });
      const view = initSdkSession(cwd, 'same', { transport: 'appserver', codexPath: script,
        broadcastWs(frame) { frames.push(frame); if (frame.type === 'perm-hook-pending') ready(frame); } });
      pending.push(sendUserMessage('hold approval', view));
      return { view, waiting };
    };
    const first = create(a), sibling = create(b);
    const [approval, other] = await Promise.all([first.waiting, sibling.waiting]);
    const queued = await sendUserMessage('next native', first.view);
    await assert.rejects(sendSdkQueuedNow('missing', first.view), { code: 'SDK_QUEUE_NOT_FOUND' });
    assert.deepEqual(getSdkPendingApprovals(first.view).map(row => row.id), [approval.id]);
    const sending = sendSdkQueuedNow(queued.id, first.view);
    try {
      assert.deepEqual(getSdkPendingApprovals(first.view), [], 'preemption must close approval before interrupt unwinds');
      assert.equal(resolveApproval(approval.id, 'allow', first.view), false);
      assert.deepEqual(getSdkPendingApprovals(sibling.view).map(row => row.id), [other.id]);
      assert.ok(frames.some(frame => frame.type === 'perm-hook-timeout' && frame.id === approval.id
        && frame.instanceKey === first.view.instanceKey));
      await sending; await pending[0];
      const inputs = readFileSync(join(a, 'native-inputs.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      assert.deepEqual(inputs.map(row => row.text), ['hold approval', 'next native']);
      assert.equal(inputs[0].threadId, inputs[1].threadId);
      assert.deepEqual(getSdkQueueState(first.view).items, []);
    } finally {
      interruptTurn(first.view); interruptTurn(sibling.view);
      await sending; await Promise.allSettled(pending);
    }
  });
});

test('native completed context compaction emits one scoped notice without invented token counts', async () => {
  await fixture(async ({ a, b, script }) => {
    const frames = [], other = [], entries = [];
    const view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script,
      onEntry: entry => entries.push(entry), broadcastWs: frame => frames.push(frame) });
    initSdkSession(b, 'same', { transport: 'appserver', codexPath: script, broadcastWs: frame => other.push(frame) });
    await sendUserMessage('compact native', view);
    const notices = frames.filter(frame => frame.type === 'sdk-compact');
    assert.equal(notices.length, 1);
    assert.equal(notices[0].instanceKey, view.instanceKey);
    assert.equal(notices[0].cwd, a);
    assert.equal(notices[0].sessionId, getSdkSessionInfo(view).sessionId);
    assert.equal(notices[0].preTokens, undefined); assert.equal(notices[0].postTokens, undefined);
    assert.equal(other.some(frame => frame.type === 'sdk-compact'), false);
    assert.equal(entries.filter(entry => entry.method === 'TOOL' && entry.body.tool_name === 'contextCompaction').length, 1);
  });
});

test('native terminal failures emit one owned error frame independently of archive callbacks', async () => {
  await fixture(async ({ a, b, script }) => {
    const frames = [];
    const view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script,
      broadcastWs: frame => frames.push(frame) });
    initSdkSession(b, 'same', { codexPath: script });
    await sendUserMessage('fail', view);
    const errors = frames.filter(frame => frame.type === 'sdk-error');
    assert.equal(errors.length, 1); assert.equal(errors[0].message, 'native final failure');
    assert.equal(errors[0].cwd, a); assert.equal(errors[0].instanceKey, view.instanceKey);
    assert.equal(errors[0].sessionId, getSdkSessionInfo(view).sessionId);
    assert.equal(errors[0].retryable, true); assert.equal(errors[0].apiStatus, 503);
    assert.equal(getSdkSessionInfo(view).busy, false);
    await sendUserMessage('next', view);
    assert.equal(frames.filter(frame => frame.type === 'sdk-error').length, 1);
  });
});

test('retry eligibility requires a retry observed on the exact native turn and a structured retryable terminal error', async () => {
  await fixture(async ({ a, script }) => {
    const frames = [], entries = [], ids = new Set();
    const view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script,
      broadcastWs: frame => frames.push(frame), onEntry: entry => entries.push(entry) });
    for (const [text, retryable, apiStatus] of [
      ['fail', true, 503], ['fail:auth', false, 401], ['fail:unobserved', false, 503],
      ['fail:unknown', false, null], ['fail:network', true, null], ['fail:invalid', false, null],
      ['fail:foreign', false, 503],
    ]) {
      await sendUserMessage(text, view);
      const failure = frames.filter(frame => frame.type === 'sdk-error').at(-1);
      assert.equal(failure.retryable, retryable, text); assert.equal(failure.apiStatus, apiStatus, text);
      assert.equal(typeof failure.turnId, 'string'); assert.equal(ids.has(failure.turnId), false); ids.add(failure.turnId);
      assert.deepEqual(entries.at(-1).response.body.error.codexErrorInfo, failure.codexErrorInfo);
    }
    assert.equal(frames.filter(frame => frame.type === 'sdk-error').length, 7, 'classification never replays a failed input');
  });
});

async function settled(view) {
  const deadline = Date.now() + 5000;
  while (getSdkSessionInfo(view).busy) {
    assert.ok(Date.now() < deadline, 'native turn must settle');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('manual retry consumes one exact owned failure and sends one hidden continue instruction on the same thread', async () => {
  await fixture(async ({ a, b, script }) => {
    const frames = [], entries = [];
    const view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script,
      broadcastWs: frame => frames.push(frame), onEntry: entry => entries.push(entry) });
    const sibling = initSdkSession(b, 'same', { transport: 'appserver', codexPath: script });
    await sendUserMessage('fail', view);
    const failed = frames.find(frame => frame.type === 'sdk-error');
    assert.deepEqual(retryInterruptedTurn(failed.turnId, sibling), { ok: false, reason: 'nothing-to-retry' });
    const inputs = () => readFileSync(join(a, 'native-inputs.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(inputs().length, 1, 'failure classification does not automatically submit anything');
    assert.deepEqual(retryInterruptedTurn('stale-turn', view), { ok: false, reason: 'stale' });
    assert.deepEqual(retryInterruptedTurn(failed.turnId, view), { ok: true });
    assert.deepEqual(retryInterruptedTurn(failed.turnId, view), { ok: false, reason: 'busy' });
    await settled(view);
    const sent = inputs(); assert.equal(sent.length, 2); assert.equal(sent[0].text, 'fail');
    assert.ok(sent[1].text.startsWith('[cc-viewer:retry] ')); assert.equal(sent[1].threadId, sent[0].threadId);
    const phases = frames.filter(frame => frame.type === 'sdk-retry-state' && frame.retryOf === failed.turnId);
    assert.deepEqual(phases.map(frame => frame.phase), ['recovering', 'recovered']);
    assert.ok(phases.every(frame => frame.instanceKey === view.instanceKey && frame.retryOf === failed.turnId));
    assert.equal(phases[0].turnId, sent[1].turnId); assert.equal(phases[1].turnId, sent[1].turnId);
    const user = entries.filter(entry => entry.mainAgent).at(-1).body.input.findLast(message =>
      message.role === 'user' && typeof message.content === 'string');
    assert.equal(user._sdkRetryOf, failed.turnId); assert.equal(user.content, sent[1].text);
    assert.ok(frames.some(frame => frame.type === 'queue-state' && frame.activeInput?.retryOf === failed.turnId));
    assert.deepEqual(retryInterruptedTurn(failed.turnId, view), { ok: false, reason: 'nothing-to-retry' });
  });
});

test('manual retries refuse non-retryable, superseded, reset and queued work without consuming it', async () => {
  await fixture(async ({ a, script }) => {
    const frames = [];
    const options = { transport: 'appserver', codexPath: script, broadcastWs: frame => frames.push(frame) };
    const view = initSdkSession(a, 'same', options);
    const fail = async text => { await sendUserMessage(text, view); return frames.filter(frame => frame.type === 'sdk-error').at(-1).turnId; };
    const auth = await fail('fail:auth');
    assert.deepEqual(retryInterruptedTurn(auth, view), { ok: false, reason: 'not-retryable' });
    const superseded = await fail('fail'); await sendUserMessage('new explicit input', view);
    assert.deepEqual(retryInterruptedTurn(superseded, view), { ok: false, reason: 'nothing-to-retry' });
    const reset = await fail('fail'); initSdkSession(a, 'same', options);
    assert.deepEqual(retryInterruptedTurn(reset, view), { ok: false, reason: 'nothing-to-retry' });
    const history = await fail('fail');
    await resumeSdkSession(view, async () => ({ threadId: getSdkSessionInfo(view).sessionId,
      messages: [{ role: 'user', content: 'history' }] }));
    assert.deepEqual(retryInterruptedTurn(history, view), { ok: false, reason: 'nothing-to-retry' });
    const running = sendUserMessage('hold queue', view);
    const queued = await sendUserMessage('queued input', view);
    assert.deepEqual(retryInterruptedTurn(history, view), { ok: false, reason: 'busy' });
    interruptTurn(view); await running;
    const before = getSdkQueueState(view);
    assert.deepEqual(retryInterruptedTurn(history, view), { ok: false, reason: 'busy' });
    assert.deepEqual(getSdkQueueState(view), before); assert.equal(before.items[0].id, queued.id);
  });
});

test('native config overrides reach Codex verbatim, explicit flags win and workspace/resume retain configuration without replaying prompts', async () => {
  await fixture(async ({ a, b, script }) => {
    const raw = 'fixture=["space path", { literal = "quote\\\" and $()" }]';
    const options = { transport: 'appserver', codexPath: script, codexArgs: [
      '-c', raw, '--enable', 'multi_agent', '--disable=goals', '-c', 'web_search="disabled"', '--search',
      '-m', 'default-model', '-C', a, 'boot-only',
    ] };
    setSdkLaunchConfig(options);
    const view = launchSdkSession(b, 'same', ['-c', 'model="native-model"', '--', '--literal']);
    assert.equal(getInitialPrompt(view), '--literal');
    await sendUserMessage('first', view);
    const seen = () => readFileSync(join(b, 'native-calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    let records = seen(), argv = records[0].argv;
    assert.ok(argv.includes(raw));
    assert.ok(argv.includes('features.multi_agent=true')); assert.ok(argv.includes('features.goals=false'));
    assert.ok(argv.indexOf('web_search="live"') > argv.indexOf('web_search="disabled"'));
    assert.equal(records[1].params.model, undefined, 'the raw config model must not be shadowed by an inherited model flag');
    assert.equal(records[1].params.cwd, b); assert.equal(records[1].params.config, undefined);
    assert.equal(argv.includes('boot-only'), false);
    const threadId = getSdkSessionInfo(view).sessionId;
    await resumeSdkSession(view, async () => ({ threadId, messages: [{ role: 'user', content: 'history' }] }));
    await sendUserMessage('second', view);
    records = seen(); assert.ok(records[2].argv.includes(raw)); assert.equal(records[3].method, 'thread/resume');
    assert.equal(records[3].params.threadId, threadId);
    const count = listSdkSessions().length;
    for (const codexArgs of [['--image', 'fixture.png'], ['--profile', 'fixture'], ['--add-dir', '/other'],
      ['--unknown'], ['--model'], ['-c', 'broken'], ['-c', '=empty'], ['--enable', 'bad name'],
      ['-s', 'unknown'], ['-a', 'on-failure']]) {
      assert.throws(() => initSdkSession(a, 'same', { transport: 'appserver', codexPath: script, codexArgs }),
        error => error.status === 400);
      assert.equal(listSdkSessions().length, count, 'invalid native options must not register a workspace');
    }
  });
});


test('only owned native retry notices produce raw progress and success settles the same turn', async () => {
  await fixture(async ({ a, script }) => {
    const frames = [], view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script, broadcastWs: frame => frames.push(frame) });
    await sendUserMessage('fail:foreign', view);
    assert.equal(frames.filter(frame => frame.type === 'sdk-retry-state').length, 0);
    await sendUserMessage('retry-success', view);
    const states = frames.filter(frame => frame.type === 'sdk-retry-state');
    assert.deepEqual(states.map(frame => frame.phase), ['retrying', 'recovered']);
    assert.equal(states[0].error, 'Reconnecting... native count unknown');
    assert.equal(states[0].turnId, states[1].turnId); assert.equal(states[1].retryOf, null);
    assert.equal(states[0].instanceKey, view.instanceKey); assert.equal(Object.hasOwn(states[0], 'attempt'), false);
    assert.equal(frames.filter(frame => frame.type === 'sdk-error').length, 1);
  });
});


test('native retry notices and children do not end the accepted root loop; failure and continuation each settle once', async () => {
  await fixture(async ({ a, script }) => {
    const loops = [];
    const view = initSdkSession(a, 'same', { transport: 'appserver', codexPath: script,
      onAgentLoopStart: data => loops.push({ phase: 'start', ...data }),
      onAgentLoopEnd: data => loops.push({ phase: 'end', ...data }) });
    await sendUserMessage('fail', view);
    assert.deepEqual(loops.map(frame => frame.phase), ['start', 'end']); assert.equal(loops[1].reason, 'error');
    assert.ok(loops[1].sessionId); assert.equal(loops[0].turnId, loops[1].turnId);
    await sendUserMessage('retry-success', view);
    assert.deepEqual(loops.map(frame => frame.phase), ['start', 'end', 'start', 'end']);
    assert.equal(loops[3].reason, 'success'); assert.notEqual(loops[0].turnId, loops[2].turnId);
  });
});
