import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const isolatedHome = mkdtempSync(join(tmpdir(), 'cxv-sdk-live-home-'));
process.env.CXV_TEST = '1';
process.env.CODEX_HOME = isolatedHome;
process.env.CXV_LOG_DIR = join(isolatedHome, 'logs');
process.env.CXV_PROXY_PROFILE_PATH = join(isolatedHome, 'profiles.json');
const { initSdkSession, sendUserMessage, stopSession, getSdkStreamProgress } = await import('../lib/sdk-manager.js');
test.after(async () => {
  await stopSession();
  const interceptor = await import('../interceptor.js');
  interceptor._stopProxyProfileWatchForTests();
  await interceptor.closeLogV2Writes();
  rmSync(isolatedHome, { recursive: true, force: true });
});

async function waitFor(check) {
  const deadline = Date.now() + 5000;
  while (!check()) {
    assert.ok(Date.now() < deadline, 'SDK live-tool checkpoint timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('continuous shell calls publish running output and settled steps before a MainAgent final', { timeout: 15000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-live-tools-'));
  const script = join(root, 'codex.mjs');
  writeFileSync(script, `import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const send = frame => process.stdout.write(JSON.stringify(frame) + '\\n');
const wait = async name => { while (!existsSync(join(${JSON.stringify(root)}, name))) await new Promise(r => setTimeout(r, 10)); };
for await (const chunk of process.stdin) {}
send({ type: 'thread.started', thread_id: 'live-tools-thread' });
send({ type: 'turn.started' });
for (let i = 1; i <= 3; i++) {
 const item = { id: 'command-' + i, type: 'command_execution', command: 'printf step-' + i, status: 'in_progress', aggregated_output: '' };
 send({ type: 'item.started', item });
 await wait('output-' + i);
 send({ type: 'item.updated', item: { ...item, aggregated_output: 'partial-' + i } });
 await wait('complete-' + i);
 send({ type: 'item.completed', item: { ...item, status: i === 2 ? 'failed' : 'completed', aggregated_output: 'result-' + i, exit_code: i === 2 ? 1 : 0 } });
}
writeFileSync(join(${JSON.stringify(root)}, 'awaiting-final'), '1');
await wait('final');
send({ type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: 'final answer' } });
send({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } });
`);
  const entries = [], progress = [];
  const oldHome = process.env.CODEX_HOME;
  let running;
  try {
    process.env.CODEX_HOME = root;
    const view = initSdkSession(root, 'live-tools', { codexPath: script,
      onEntry: value => entries.push(value), onStreamProgress: value => progress.push(value) });
    running = sendUserMessage('three shell steps', view);
    for (let i = 1; i <= 3; i++) {
      await waitFor(() => progress.some(p => p.content?.some(b => b.id === 'command-' + i)));
      assert.equal(entries.some(entry => entry.mainAgent), false, 'no fabricated MainAgent snapshot before the final');
      let latest = progress.at(-1);
      const step = latest.toolProgress?.find(step => step.id === 'command-' + i);
      assert.equal(step?.status, 'in_progress', 'the current shell call must be visible while it runs');
      writeFileSync(join(root, 'output-' + i), '1');
      await waitFor(() => progress.at(-1)?.toolProgress?.some(step => step.id === 'command-' + i && step.output === 'partial-' + i));
      writeFileSync(join(root, 'complete-' + i), '1');
      await waitFor(() => progress.at(-1)?.toolProgress?.some(step => step.id === 'command-' + i && step.status === (i === 2 ? 'failed' : 'completed')));
      latest = progress.at(-1);
      assert.equal(latest.toolProgress.filter(step => ['completed', 'failed'].includes(step.status)).length, i);
      assert.equal(latest.instanceKey, view.instanceKey);
    }
    await waitFor(() => existsSync(join(root, 'awaiting-final')));
    assert.equal(entries.filter(entry => entry.method === 'TOOL').length, 3);
    assert.equal(entries.some(entry => entry.mainAgent), false);
    writeFileSync(join(root, 'final'), '1'); await running;
    assert.equal(getSdkStreamProgress(view), null, 'a finalized turn is never replayed as live');
    const final = entries.filter(entry => entry.mainAgent);
    assert.equal(final.length, 1);
    const messages = final[0].body.input;
    const uses = messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_use');
    assert.deepEqual(uses.map(block => block.id), ['command-1', 'command-2', 'command-3']);
    assert.equal(JSON.stringify(final).includes('toolProgress'), false, 'transient status never enters the canonical request');
  } finally {
    for (const name of ['final', ...[1, 2, 3].flatMap(i => ['output-' + i, 'complete-' + i])]) writeFileSync(join(root, name), 'cleanup');
    await running?.catch(() => {}); await stopSession();
    if (oldHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = oldHome;
    rmSync(root, { recursive: true, force: true });
  }
});

test('native command output deltas are bounded, scoped and replayable only during their owning turn', { timeout: 15000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-native-live-tools-'));
  const script = join(root, 'codex.mjs');
  writeFileSync(script, `import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const send = frame => process.stdout.write(JSON.stringify(frame) + '\\n');
const wait = async name => { while (!existsSync(join(${JSON.stringify(root)}, name))) await new Promise(r => setTimeout(r, 10)); };
const threadId = 'native-live-root', turnId = 'native-live-turn';
for await (const line of createInterface({ input: process.stdin })) {
 const f = JSON.parse(line);
 if (f.method === 'initialize') send({ id: f.id, result: {} });
 else if (f.method === 'thread/start') send({ id: f.id, result: { thread: { id: threadId } } });
 else if (f.method === 'turn/start') {
  send({ id: f.id, result: { turn: { id: turnId } } });
  send({ method: 'turn/started', params: { threadId, turn: { id: turnId, status: 'inProgress' } } });
  const item = { id: 'native-command', type: 'commandExecution', command: 'printf native', status: 'inProgress', aggregatedOutput: '' };
  send({ method: 'item/started', params: { threadId, turnId, item } });
  send({ method: 'item/commandExecution/outputDelta', params: { threadId: 'foreign', turnId, itemId: item.id, delta: 'foreign output' } });
  send({ method: 'item/commandExecution/outputDelta', params: { threadId, turnId, itemId: item.id, delta: 'x'.repeat(17000) + 'owned-tail' } });
  await wait('complete');
  send({ method: 'item/completed', params: { threadId, turnId, item: { ...item, status: 'completed', exitCode: 0, aggregatedOutput: 'native result' } } });
  await wait('final');
  send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer', type: 'agentMessage', text: 'native final' } } });
  send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } });
 } else if (f.id != null) send({ id: f.id, result: {} });
}
`);
  const progress = [], entries = [];
  let running;
  try {
    const view = initSdkSession(root, 'native-live', { transport: 'appserver', codexPath: script,
      onEntry: entry => entries.push(entry), onStreamProgress: data => progress.push(data) });
    running = sendUserMessage('native live output', view);
    await waitFor(() => progress.some(data => data.toolProgress?.[0]?.output?.endsWith('owned-tail')));
    const replay = getSdkStreamProgress(view);
    assert.equal(replay.sessionId, 'native-live-root'); assert.equal(replay.instanceKey, view.instanceKey);
    assert.equal(replay.toolProgress[0].status, 'in_progress');
    assert.equal(replay.toolProgress[0].output.length, 16 * 1024);
    assert.equal(replay.toolProgress[0].outputTruncated, true);
    assert.equal(JSON.stringify(replay).includes('foreign output'), false);
    assert.equal(entries.some(entry => entry.mainAgent), false);
    replay.toolProgress[0].output = 'mutated copy';
    assert.ok(getSdkStreamProgress(view).toolProgress[0].output.endsWith('owned-tail'));
    assert.throws(() => getSdkStreamProgress({ instanceKey: 'missing-instance' }), { code: 'SDK_SESSION_NOT_FOUND' });
    writeFileSync(join(root, 'complete'), '1');
    await waitFor(() => progress.at(-1)?.toolProgress?.[0]?.status === 'completed');
    assert.equal(getSdkStreamProgress(view).toolProgress[0].output, 'native result');
    writeFileSync(join(root, 'final'), '1'); await running;
    assert.equal(getSdkStreamProgress(view), null);
    assert.equal(entries.filter(entry => entry.mainAgent).length, 1);
  } finally {
    for (const name of ['complete', 'final']) writeFileSync(join(root, name), 'cleanup');
    await running?.catch(() => {}); await stopSession();
    rmSync(root, { recursive: true, force: true });
  }
});
