import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initSdkSession, listSdkSessions, attachSdkSession, closeSdkSession,
  sendUserMessage, getSessionId, stopSession,
  setSdkLaunchConfig, launchSdkSession, getInitialPrompt, getSdkWorkingDirectory,
  resumeSdkSession,
} from '../lib/sdk-manager.js';

async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-registry-'));
  const codexPath = join(root, 'fake-codex.mjs');
  writeFileSync(codexPath, `#!/usr/bin/env node
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const cwd = process.env.CXV_PROJECT_DIR;
if (process.argv[process.argv.indexOf('--cd') + 1] !== cwd) process.exit(4);
appendFileSync(join(cwd, 'calls'), JSON.stringify({ input, argv: process.argv, instanceKey: process.env.CXV_INSTANCE_KEY, base: process.env.OPENAI_BASE_URL }) + '\\n');
if (input.includes('hold')) {
  writeFileSync(join(cwd, 'ready'), 'ready');
  while (!existsSync(join(cwd, 'release'))) await new Promise(resolve => setTimeout(resolve, 10));
}
const resumeIndex = process.argv.indexOf('resume');
for (const event of [
  { type: 'thread.started', thread_id: resumeIndex >= 0 ? process.argv[resumeIndex + 1] : 'thread_' + Buffer.from(cwd).toString('hex') },
  { type: 'turn.started' },
  { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: input } },
  { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } },
]) process.stdout.write(JSON.stringify(event) + '\\n');
`);
  chmodSync(codexPath, 0o755);
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = root;
  const a = join(root, 'one', 'same name');
  const b = join(root, 'two', 'same name');
  mkdirSync(a, { recursive: true });
  mkdirSync(b, { recursive: true });
  const entriesA = [], entriesB = [], statusesA = [], statusesB = [];
  const options = (entries, statuses) => ({ codexPath, onEntry: entry => entries.push(entry), onStreamingStatus: status => statuses.push(status) });
  try {
    await run({ root, a, b, entriesA, entriesB, statusesA, statusesB, options });
  } finally {
    stopSession();
    setSdkLaunchConfig(null);
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    rmSync(root, { recursive: true, force: true });
  }
}

async function ready(cwd) {
  const deadline = Date.now() + 5000;
  while (!existsSync(join(cwd, 'ready'))) {
    assert.ok(Date.now() < deadline, 'fake SDK child must start');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
const calls = cwd => readFileSync(join(cwd, 'calls'), 'utf8').trim().split('\n').map(JSON.parse);

test('SDK shares resume selector parsing and keeps literal prompt arguments after --', async () => fixture(async f => {
  for (const codexArgs of [
    ['resume', '-m', 'kept-model', '-C', 'one/same name', 'thread-config', 'next task'],
    ['-C', 'one/same name', 'resume', '--last', '-c', 'model="kept-model"', 'next task'],
    ['-C', 'one/same name', 'resume', '-m', 'kept-model'],
  ]) {
    assert.equal(getSdkWorkingDirectory(f.root, codexArgs), f.a);
    initSdkSession(f.root, 'same name', { ...f.options(f.entriesA, f.statusesA), codexArgs });
    assert.equal(getSessionId(), codexArgs.includes('thread-config') ? 'thread-config' : null);
    assert.equal(getInitialPrompt(), codexArgs.includes('next task') ? 'next task' : null);
  }
  initSdkSession(f.a, 'same name', { ...f.options(f.entriesA, f.statusesA),
    codexArgs: ['resume', 'thread-literal', '--', '--last', 'resume', '-C', '/literal'] });
  assert.equal(getSessionId(), 'thread-literal');
  assert.equal(getInitialPrompt(), '--last resume -C /literal');
  assert.equal(getSdkWorkingDirectory(f.a, ['--', '-C', '/literal']), f.a);
}));

test('SDK resume retains configuration and history and targets only the selected resident session', async () => fixture(async f => {
  const a = initSdkSession(f.a, 'same name', { ...f.options(f.entriesA, f.statusesA), codexArgs: ['-m', 'kept-model', '-s', 'read-only'] });
  initSdkSession(f.b, 'same name', f.options(f.entriesB, f.statusesB));
  await sendUserMessage('before A', { cwd: f.a });
  await sendUserMessage('before B', { cwd: f.b });
  const siblingId = getSessionId({ cwd: f.b });
  const messages = [{ role: 'user', content: 'historic question' },
    { role: 'assistant', content: [{ type: 'text', text: 'historic answer' }] }];
  const restored = await resumeSdkSession({ instanceKey: a.instanceKey }, async view => {
    assert.equal(view.cwd, f.a);
    return { threadId: 'archived-native-thread', messages };
  });
  assert.equal(restored.sessionId, 'archived-native-thread');
  assert.equal(calls(f.a).length, 1, 'switching does not execute a model turn');
  messages.push({ role: 'user', content: 'later mutation must not enter the session' });
  await sendUserMessage('continue A', { cwd: f.a });
  const call = calls(f.a).at(-1);
  assert.ok(call.argv.includes('resume')); assert.ok(call.argv.includes('archived-native-thread'));
  assert.ok(call.argv.includes('kept-model')); assert.ok(call.argv.includes('read-only'));
  assert.deepEqual(f.entriesA.at(-1).body.input.map(item => item.role), ['user', 'assistant', 'user']);
  assert.equal(f.entriesA.at(-1).body.input.at(-1).content, 'continue A');
  assert.equal(getSessionId({ cwd: f.b }), siblingId);
  assert.equal(calls(f.b).length, 1);
}));

test('busy SDK resume refuses before reading history and retains the existing turn and queue', async () => fixture(async f => {
  initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
  const running = sendUserMessage('hold A', { cwd: f.a });
  try {
    await ready(f.a);
    await sendUserMessage('queued A', { cwd: f.a });
    await assert.rejects(resumeSdkSession({ cwd: f.a }, async () => { assert.fail('busy workspace must not load history'); }), { code: 'SDK_SESSION_BUSY' });
    writeFileSync(join(f.a, 'release'), 'go'); await running;
    assert.deepEqual(calls(f.a).map(call => call.input), ['hold A', 'queued A']);
  } finally { stopSession(); await running; }
}));

test('asynchronous resume cannot overwrite a reset, close/reopen or intervening completed turn', async () => fixture(async f => {
  for (const change of ['reset', 'close-reopen', 'turn']) {
    const info = initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
    let release;
    const pending = resumeSdkSession({ instanceKey: info.instanceKey }, () => new Promise(resolve => { release = resolve; }));
    if (change === 'close-reopen') closeSdkSession({ instanceKey: info.instanceKey });
    if (change === 'turn') await sendUserMessage('intervening turn', { cwd: f.a });
    else initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
    const current = getSessionId({ cwd: f.a });
    release({ threadId: 'obsolete-thread', messages: [{ role: 'user', content: 'old' }] });
    await assert.rejects(pending, { code: 'SDK_RESUME_STALE' });
    assert.equal(getSessionId({ cwd: f.a }), current);
  }
}));

test('resume rejects option-shaped, synthetic and malformed thread IDs before replacing the live session', async () => fixture(async f => {
  initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
  await sendUserMessage('existing conversation', { cwd: f.a });
  const original = getSessionId({ cwd: f.a });
  for (const threadId of ['--last', '-c', 'synthetic:sdk:unknown', 'bad\nid', '../other', '']) {
    await assert.rejects(resumeSdkSession({ cwd: f.a }, async () => ({ threadId,
      messages: [{ role: 'user', content: 'old' }] })), { code: 'SDK_RESUME_UNAVAILABLE' });
    assert.equal(getSessionId({ cwd: f.a }), original);
  }
  assert.equal(calls(f.a).length, 1);
}));

test('workspace launches inherit configuration and callbacks without replaying boot cwd, resume or prompt', async () => fixture(async f => {
  const args = ['-m', 'boot-model', '-s', 'read-only', '-a', 'on-request', '-C', f.a,
    '-c', 'model_reasoning_summary="detailed"', 'resume', 'boot-thread', 'boot-only-prompt'];
  setSdkLaunchConfig({ ...f.options(f.entriesA, f.statusesA), codexArgs: args });
  args[1] = 'mutated-after-configuration';
  const info = launchSdkSession(f.b, 'same name');
  assert.equal(info.cwd, f.b);
  assert.equal(info.reused, false);
  assert.equal(getInitialPrompt({ cwd: f.b }), null);
  await sendUserMessage('new B', { cwd: f.b });
  const call = calls(f.b)[0];
  assert.ok(call.argv.includes('boot-model'));
  assert.ok(call.argv.includes('read-only'));
  assert.ok(call.argv.some(arg => arg.includes('on-request')));
  assert.ok(call.argv.some(arg => arg.includes('model_reasoning_summary')));
  assert.ok(!call.argv.includes('boot-thread'));
  assert.ok(!call.argv.includes('boot-only-prompt'));
  assert.ok(!call.argv.includes('mutated-after-configuration'));
  assert.equal(f.entriesA.length, 1, 'new workspace uses the configured entry callback');
  assert.equal(f.entriesA[0].body.metadata.cwd, f.b);
  const other = launchSdkSession(f.a, 'same name', ['-m', 'workspace-model', 'explicit fresh prompt']);
  assert.equal(other.cwd, f.a);
  assert.equal(getInitialPrompt({ cwd: f.a }), 'explicit fresh prompt');
  await sendUserMessage('new A', { cwd: f.a });
  assert.ok(calls(f.a)[0].argv.includes('workspace-model'));
  assert.ok(calls(f.a)[0].argv.includes('read-only'));
}));

test('relaunching an existing cwd preserves its running turn, queue, identity and history', { timeout: 15000 }, async () => fixture(async f => {
  setSdkLaunchConfig(f.options(f.entriesA, f.statusesA));
  const first = launchSdkSession(f.a, 'same name');
  const running = sendUserMessage('hold A', { cwd: f.a });
  try {
    await ready(f.a);
    await sendUserMessage('queued A', { cwd: f.a });
    const reused = launchSdkSession(join(f.a, '.'), 'same name');
    assert.equal(reused.reused, true);
    assert.equal(reused.instanceKey, first.instanceKey);
    assert.equal(listSdkSessions().length, 1);
    writeFileSync(join(f.a, 'release'), 'go');
    await running;
    assert.equal(calls(f.a).length, 2);
    assert.equal(f.entriesA.length, 2);
    assert.equal(f.entriesA[1].body.input.filter(item => item.role === 'user').length, 2);
    stopSession();
    assert.equal(launchSdkSession(f.a, 'same name').reused, false, 'stop-all retains the template for a later workspace launch');
  } finally {
    stopSession();
    await running;
  }
}));

test('workspace launch rejects missing config, invalid arguments and conflicting cwd before registration', async () => fixture(async f => {
  setSdkLaunchConfig(null);
  assert.throws(() => launchSdkSession(f.a, 'same name'), error => error.status === 503);
  setSdkLaunchConfig(f.options(f.entriesA, f.statusesA));
  for (const args of [{}, ['--cd', f.b], ['-c', '__proto__.polluted=true'], ['-c', 'constructor.prototype.polluted=true'], [123]]) {
    assert.throws(() => launchSdkSession(f.a, 'same name', args), error => error.status === 400);
  }
  assert.equal({}.polluted, undefined);
  assert.equal(listSdkSessions().length, 0);
}));

test('same-name workspaces run concurrently with independent queues, history, callbacks and capture ports', { timeout: 15000 }, async () => fixture(async f => {
  const first = initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
  const runningA = sendUserMessage('hold A', { instanceKey: first.instanceKey });
  let runningB;
  try {
    await ready(f.a);
    await sendUserMessage('queued A', { cwd: f.a });
    const second = initSdkSession(f.b, 'same name', f.options(f.entriesB, f.statusesB));
    runningB = sendUserMessage('hold B', { instanceKey: second.instanceKey });
    await ready(f.b);
    await sendUserMessage('queued B', { cwd: f.b });
    assert.equal(listSdkSessions().length, 2);
    assert.notEqual(first.instanceKey, second.instanceKey);
    assert.notEqual(calls(f.a)[0].base, calls(f.b)[0].base);
    attachSdkSession({ cwd: f.a });
    writeFileSync(join(f.b, 'release'), 'go');
    await runningB;
    assert.equal(f.entriesA.length, 0, 'A remains held while background B completes');
    assert.equal(f.entriesB.length, 2);
    assert.equal(getSessionId(), null);
    writeFileSync(join(f.a, 'release'), 'go');
    await runningA;
    assert.equal(f.entriesA.length, 2);
    for (const [cwd, entries, statuses, info] of [
      [f.a, f.entriesA, f.statusesA, first], [f.b, f.entriesB, f.statusesB, second],
    ]) {
      assert.equal(calls(cwd).length, 2);
      assert.ok(calls(cwd).every(call => call.instanceKey === info.instanceKey));
      assert.ok(entries.every(entry => entry.body.metadata.cwd === cwd));
      assert.ok(entries.every(entry => entry.body.metadata.instance_key === info.instanceKey));
      assert.ok(statuses.every(status => status.cwd === cwd && status.instanceKey === info.instanceKey));
      assert.equal(entries[1].body.input.filter(item => item.role === 'user').length, 2);
    }
    const before = getSessionId();
    attachSdkSession({ cwd: join(f.a, '..', 'same name', '.') });
    assert.equal(getSessionId(), before);
    assert.equal(listSdkSessions().length, 2);
  } finally {
    stopSession();
    await Promise.allSettled([runningA, runningB]);
  }
}));

test('closing a running workspace cancels only its turn and queue; its sibling keeps running', { timeout: 15000 }, async () => fixture(async f => {
  const a = initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
  const runningA = sendUserMessage('hold A', { cwd: f.a });
  let runningB;
  try {
    await ready(f.a);
    await sendUserMessage('discard queued A', { cwd: f.a });
    const b = initSdkSession(f.b, 'same name', f.options(f.entriesB, f.statusesB));
    runningB = sendUserMessage('hold B', { cwd: f.b });
    await ready(f.b);
    await sendUserMessage('keep queued B', { cwd: f.b });
    const result = closeSdkSession({ instanceKey: a.instanceKey });
    assert.equal(result.ok, true);
    assert.equal(result.reattachedTo, b.instanceKey);
    await runningA;
    assert.deepEqual(f.entriesA, []);
    assert.equal(calls(f.a).length, 1);
    assert.deepEqual(f.entriesB, []);
    writeFileSync(join(f.b, 'release'), 'go');
    await runningB;
    assert.equal(f.entriesB.length, 2);
    assert.equal(calls(f.b).length, 2);
    const relaunched = initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
    assert.equal(relaunched.instanceKey, a.instanceKey, 'cwd identity remains stable after close/relaunch');
    await sendUserMessage('fresh A', { cwd: f.a });
    assert.equal(f.entriesA.length, 1);
    assert.equal(f.entriesA[0].body.input.length, 1, 'new resident has fresh history');
  } finally {
    stopSession();
    await Promise.allSettled([runningA, runningB]);
  }
}));

test('ambiguous names, stale instances and conflicting anchors never fall back to the active sibling', async () => fixture(async f => {
  const a = initSdkSession(f.a, 'same name', f.options(f.entriesA, f.statusesA));
  initSdkSession(f.b, 'same name', f.options(f.entriesB, f.statusesB));
  await assert.rejects(sendUserMessage('wrong', { project: 'same_name' }), error => error.status === 409 && error.candidates.length === 2);
  assert.throws(() => closeSdkSession({ project: 'same name' }), { code: 'SDK_SESSION_AMBIGUOUS' });
  closeSdkSession({ instanceKey: a.instanceKey });
  for (const anchor of [{ instanceKey: a.instanceKey, project: 'same name' }, { cwd: f.a }, { instanceKey: 'stale', cwd: f.b }]) {
    await assert.rejects(sendUserMessage('wrong', anchor), { code: 'SDK_SESSION_NOT_FOUND' });
    assert.throws(() => closeSdkSession(anchor), { code: 'SDK_SESSION_NOT_FOUND' });
  }
  for (const anchor of [{}, [], { instanceKey: '', project: 'same name' }, { cwd: 123 }]) {
    await assert.rejects(sendUserMessage('wrong', anchor), { code: 'SDK_SESSION_INVALID_ANCHOR' });
  }
  assert.equal(listSdkSessions().length, 1);
  await sendUserMessage('right', { cwd: f.b });
  assert.equal(f.entriesB.length, 1);
  assert.equal(calls(f.b).length, 1);
  assert.equal(existsSync(join(f.a, 'calls')), false);
}));

test('SDK --cd is resolved before registry identity and agrees with execution and log cwd', async () => fixture(async f => {
  assert.equal(getSdkWorkingDirectory(f.root, ['--cd', 'one/same name']), resolve(f.a));
  const info = initSdkSession(f.root, 'same name', { ...f.options(f.entriesA, f.statusesA), codexArgs: ['--cd', 'one/same name'] });
  assert.equal(info.cwd, resolve(f.a));
  await sendUserMessage('cd A', { cwd: f.a });
  assert.equal(f.entriesA[0].body.metadata.cwd, f.a);
  assert.equal(calls(f.a).length, 1);
}));
