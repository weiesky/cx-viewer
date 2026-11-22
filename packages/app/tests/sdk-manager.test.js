import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  getSessionId,
  initSdkSession,
  isSdkAvailable,
  interruptTurn,
  getSdkStreamingState,
  sendUserMessage,
  getSdkQueueState,
  removeSdkQueuedMessage,
  stopSession,
} from '../lib/sdk-manager.js';

function createFakeCodexScript(dir) {
  const script = join(dir, 'fake-codex.js');
  writeFileSync(script, `#!/usr/bin/env node
const { writeFileSync: markSpawn } = await import('node:fs');
markSpawn(new URL('./spawned', import.meta.url), 'spawned');
if (!process.argv.includes('features.default_mode_request_user_input=false')) {
  console.error('SDK must disable unserviceable Default-mode request_user_input');
  process.exit(3);
}
if (process.env.OPENAI_BASE_URL && !process.argv.includes('openai_base_url=' + JSON.stringify(process.env.OPENAI_BASE_URL))) {
  console.error('SDK must explicitly route native exec through the owned capture endpoint');
  process.exit(3);
}
const input = await new Promise((resolve) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => data += chunk);
  process.stdin.on('end', () => resolve(data));
});
if (input.includes('hold old turn')) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(new URL('./ready', import.meta.url), 'ready');
  await new Promise(resolve => setTimeout(resolve, 30000));
}
if (!input.includes('hello sdk')) {
  console.error('unexpected prompt: ' + input);
  process.exit(2);
}
const events = [
  { type: 'thread.started', thread_id: 'thread_fake_sdk' },
  { type: 'turn.started' },
  { type: 'item.completed', item: { id: 'reason_1', type: 'reasoning', text: 'checking workspace' } },
  { type: 'item.completed', item: { id: 'cmd_1', type: 'command_execution', command: 'pwd', aggregated_output: '/tmp\\\\n', exit_code: 0, status: 'completed' } },
  { type: 'item.completed', item: { id: 'msg_1', type: 'agent_message', text: 'hello from fake codex' } },
  { type: 'turn.completed', usage: { input_tokens: 11, output_tokens: 7, reasoning_output_tokens: 2 } },
];
for (const event of events) {
  process.stdout.write(JSON.stringify(event) + '\\n');
}
`, 'utf8');
  chmodSync(script, 0o755);
  return script;
}

test('sdk-manager consumes Codex SDK events and emits viewer entries', async () => {
  if (!isSdkAvailable()) {
    assert.fail('expected @openai/codex-sdk to be installed for SDK manager tests');
  }

  const tmp = mkdtempSync(join(tmpdir(), 'cxv-sdk-manager-'));
  const fakeCodex = createFakeCodexScript(tmp);
  const entries = [];
  const streamProgress = [];
  const streamingStatus = [];
  const previousCodexHome = process.env.CODEX_HOME;

  try {
    process.env.CODEX_HOME = tmp;
    writeFileSync(join(tmp, 'config.toml'), 'model = "gpt-config-sdk"\n', 'utf8');
    initSdkSession(tmp, 'sdk-test-project', {
      codexPath: fakeCodex,
      codexArgs: [],
      onEntry: entry => entries.push(entry),
      onStreamProgress: data => streamProgress.push(data),
      onStreamingStatus: data => streamingStatus.push(data),
      broadcastWs: () => {},
    });

    await sendUserMessage('hello sdk');

    assert.equal(getSessionId(), 'thread_fake_sdk');
    assert.equal(streamingStatus[0]?.active, true);
    assert.equal(streamingStatus.at(-1)?.active, false);
    assert.ok(streamProgress.length >= 1);
    assert.equal(streamProgress.at(-1)?.model, 'gpt-config-sdk');

    const toolEntry = entries.find(entry => entry.method === 'TOOL');
    assert.equal(toolEntry?.mainAgent, false);
    assert.equal(toolEntry?.subAgent, false);
    assert.equal(toolEntry?.body?.tool_name, 'shell_command');
    assert.equal(toolEntry?.body?.tool_input?.command, 'pwd');
    assert.equal(toolEntry?.response?.body?.output?.exit_code, 0);

    const mainEntry = entries.find(entry => entry.mainAgent === true);
    assert.equal(mainEntry?.subAgent, false);
    assert.equal(mainEntry?.project, 'sdk-test-project');
    assert.equal(mainEntry?.body?.model, 'gpt-config-sdk');
    assert.equal(mainEntry?.body?.metadata?.thread_id, 'thread_fake_sdk');
    assert.equal(mainEntry?.response?.body?.content?.[0]?.text, 'hello from fake codex');
    assert.deepEqual(mainEntry?.response?.body?.usage, {
      input_tokens: 11,
      output_tokens: 7,
      reasoning_output_tokens: 2,
      total_tokens: 18,
    });
    assert.equal(mainEntry?.body?.input?.[0]?.role, 'user');
    assert.equal(mainEntry?.body?.input?.[1]?.content?.[0]?.type, 'thinking');
    assert.equal(mainEntry?.body?.input?.[1]?.content?.[1]?.name, 'shell_command');
    assert.equal(mainEntry?.body?.input?.[2]?.content?.[0]?.type, 'tool_result');
  } finally {
    stopSession();
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('interrupt during proxy startup cancels the prompt and parks accepted queue before a Codex child can run', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-sdk-interrupt-startup-'));
  const fakeCodex = createFakeCodexScript(tmp);
  const entries = [], statuses = [], frames = [], loops = [];
  const previousCodexHome = process.env.CODEX_HOME;
  try {
    process.env.CODEX_HOME = tmp;
    const info = initSdkSession(tmp, 'startup-cancel', {
      codexPath: fakeCodex, onEntry: entry => entries.push(entry),
      onStreamingStatus: status => statuses.push(status),
      onAgentLoopStart: data => loops.push(data), onAgentLoopEnd: data => loops.push(data),
      broadcastWs: frame => frames.push(frame),
    });
    const running = sendUserMessage('hello sdk should never run', { instanceKey: info.instanceKey });
    await sendUserMessage('hello sdk queued should never run', { instanceKey: info.instanceKey });
    // No event-loop turn has occurred: the proxy's listen callback is still pending.
    const interrupted = interruptTurn({ instanceKey: info.instanceKey });
    await running;
    assert.equal(interrupted, true);
    assert.deepEqual(loops, [], "undelivered startup cancellation has no accepted loop");
    assert.equal(getSessionId({ instanceKey: info.instanceKey }), null, 'cancelled prompt must not start a native thread');
    assert.equal(existsSync(join(tmp, 'spawned')), false);
    assert.equal(getSdkStreamingState({ instanceKey: info.instanceKey }).active, false);
    assert.deepEqual(statuses.map(status => status.active), [true, false]);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].response.body.content[0].text, 'Error: Turn interrupted');
    assert.equal(frames.some(frame => frame.type === 'sdk-error'), false, 'intentional Stop does not alert as a failed query');
    const parked = getSdkQueueState({ instanceKey: info.instanceKey });
    assert.equal(parked.paused, true);
    assert.equal(parked.items.length, 1);
    removeSdkQueuedMessage(parked.items[0].id, { instanceKey: info.instanceKey });
    // The same resident session and its proxy remain usable for a later prompt.
    await sendUserMessage('hello sdk after cancellation', { instanceKey: info.instanceKey });
    assert.equal(getSessionId({ instanceKey: info.instanceKey }), 'thread_fake_sdk');
    assert.equal(entries.filter(entry => entry.mainAgent && entry.response.status === 200).length, 1);
  } finally {
    stopSession();
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('reinitializing SDK during proxy startup cannot deliver the obsolete prompt into the new session', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-sdk-reinit-startup-'));
  const fakeCodex = createFakeCodexScript(tmp);
  const entries = [];
  const statuses = [];
  const previousCodexHome = process.env.CODEX_HOME;
  try {
    process.env.CODEX_HOME = tmp;
    initSdkSession(tmp, 'old-project', { codexPath: fakeCodex });
    const obsolete = sendUserMessage('hello sdk obsolete');
    await sendUserMessage('hello sdk queued obsolete');
    initSdkSession(tmp, 'new-project', {
      codexPath: fakeCodex, onEntry: entry => entries.push(entry),
      onStreamingStatus: status => statuses.push(status),
    });
    await obsolete;
    assert.deepEqual(entries, []);
    assert.deepEqual(statuses, []);
    assert.equal(getSessionId(), null);
    await sendUserMessage('hello sdk current');
    assert.equal(entries.filter(entry => entry.mainAgent).length, 1);
    assert.equal(entries.find(entry => entry.mainAgent).project, 'new-project');
    assert.equal(getSessionId(), 'thread_fake_sdk');
  } finally {
    stopSession();
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('an aborted old SDK turn cannot emit errors or idle status into a reinitialized session', { timeout: 10000 }, async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-sdk-reinit-running-'));
  const fakeCodex = createFakeCodexScript(tmp);
  const entries = [];
  const statuses = [];
  const previousCodexHome = process.env.CODEX_HOME;
  let obsolete;
  try {
    process.env.CODEX_HOME = tmp;
    initSdkSession(tmp, 'old-project', { codexPath: fakeCodex });
    obsolete = sendUserMessage('hello sdk hold old turn');
    const deadline = Date.now() + 5000;
    while (!existsSync(join(tmp, 'ready'))) {
      assert.ok(Date.now() < deadline, 'old SDK child must start before reinitialization');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    initSdkSession(tmp, 'new-project', {
      codexPath: fakeCodex, onEntry: entry => entries.push(entry),
      onStreamingStatus: status => statuses.push(status),
    });
    await obsolete;
    assert.deepEqual(entries, []);
    assert.deepEqual(statuses, []);
    assert.equal(getSessionId(), null);
    await sendUserMessage('hello sdk current');
    assert.equal(entries.filter(entry => entry.mainAgent).length, 1);
    assert.equal(entries.find(entry => entry.mainAgent).project, 'new-project');
  } finally {
    stopSession();
    await obsolete;
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('stopping SDK during proxy startup prevents later entries and session resurrection', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-sdk-stop-startup-'));
  const entries = [];
  const statuses = [];
  const previousCodexHome = process.env.CODEX_HOME;
  try {
    process.env.CODEX_HOME = tmp;
    initSdkSession(tmp, 'stopped-project', {
      codexPath: createFakeCodexScript(tmp), onEntry: entry => entries.push(entry),
      onStreamingStatus: status => statuses.push(status),
    });
    const obsolete = sendUserMessage('hello sdk obsolete');
    stopSession();
    await obsolete;
    assert.deepEqual(entries, []);
    assert.deepEqual(statuses.map(status => status.active), [true], 'no late status may publish after teardown');
    assert.equal(getSessionId(), null);
  } finally {
    stopSession();
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('stream error notices cannot suppress a later successful turn, and final failures still persist once', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-stream-errors-'));
  const executable = join(root, 'fake-codex.mjs'), previous = process.env.CODEX_HOME;
  writeFileSync(executable, String.raw`#!/usr/bin/env node
let mode='';for await(const chunk of process.stdin)mode+=chunk;
const emit=value=>process.stdout.write(JSON.stringify(value)+'\n');
if(mode==='silent-eof')process.exit(0);
emit({type:'thread.started',thread_id:'stream-errors-thread'});emit({type:'turn.started'});
if(mode==='partial-eof'){
 emit({type:'item.updated',item:{id:'partial',type:'agent_message',text:'partial answer before exit'}});
 process.exit(0);
}
emit({type:'error',message:'Reconnecting... 1/5 (local temporary failure)'});
if(mode==='recover'){
 emit({type:'item.completed',item:{id:'answer',type:'agent_message',text:'recovered answer'}});
 emit({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}});
}else if(mode==='fail')emit({type:'turn.failed',error:{message:'final failure'}});
else if(mode==='exit')process.exitCode=7;
`);
  chmodSync(executable, 0o755);
  try {
    process.env.CODEX_HOME = root;
    for (const [mode, status, content] of [
      ['recover', 200, 'recovered answer'], ['fail', 500, 'final failure'],
      ['error-only', 500, 'Reconnecting...'], ['exit', 500, 'Reconnecting...'],
      ['silent-eof', 500, 'session ended before the turn completed'],
      ['partial-eof', 500, 'session ended before the turn completed'],
    ]) {
      const entries = [], statuses = [], frames = [];
      const view = initSdkSession(root, 'stream-errors', { codexPath: executable,
        onEntry: entry => entries.push(entry), onStreamingStatus: state => statuses.push(state),
        broadcastWs: frame => frames.push(frame) });
      await sendUserMessage(mode);
      const rows = entries.filter(entry => entry.mainAgent);
      assert.equal(rows.length, 1, mode);
      assert.equal(rows[0].response.status, status, mode);
      assert.ok(rows[0].response.body.content.some(block => block.text?.includes(content)), mode);
      assert.equal(statuses[0].active, true); assert.equal(statuses.at(-1).active, false);
      const errors = frames.filter(frame => frame.type === 'sdk-error');
      assert.equal(errors.length, status === 500 ? 1 : 0, 'only the terminal failure alerts, once');
      if (errors.length) {
        assert.equal(errors[0].cwd, root); assert.equal(errors[0].instanceKey, view.instanceKey);
        assert.equal(errors[0].sessionId, mode === 'silent-eof' ? null : 'stream-errors-thread');
        assert.ok(errors[0].message.includes(content));
      }
      if (mode === 'recover') assert.ok(!JSON.stringify(rows[0].response).includes('Reconnecting'));
      if (mode === 'partial-eof') {
        const partial = rows[0].body.input.find(message => message.role === 'assistant'
          && message.content.some(block => block.text === 'partial answer before exit'));
        assert.ok(partial, 'partial output must remain in the canonical failed transcript');
      }
      if (mode === 'fail') {
        await sendUserMessage('recover');
        assert.equal(entries.length, 2);
        assert.deepEqual(entries[1].body.input.slice(0, -1), [
          ...rows[0].body.input, { role: 'assistant', content: rows[0].response.body.content,
            _sdkTimestamp: rows[0].timestamp, _sdkFeedback: true },
        ], 'continuation retains the exact rendered prefix after failure');
      }
    }
  } finally {
    stopSession();
    if (previous === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
