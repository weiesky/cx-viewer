import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'cxv-scheduled-native-'));
const cwd = join(root, 'project'); mkdirSync(cwd);
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'), CXV_TEST: '1' });
const sdk = await import('../lib/sdk-manager.js');
const { writePreferences } = await import('../lib/preferences.js');
const script = join(root, 'native.mjs');
writeFileSync(script, readFileSync(new URL('./fixtures/scheduled-native.txt', import.meta.url)));
const calls = () => readFileSync(join(cwd, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function until(fn) { const end = Date.now() + 5000; while (!fn()) { if (Date.now() > end) throw new Error('fixture timeout'); await new Promise(r => setTimeout(r, 10)); } }

test('scheduled native sessions isolate resident state, default permissions, approvals and child cleanup', async () => {
  const entries = [], frames = [];
  const config = { transport: 'appserver', codexPath: script, permissionMode: 'bypassPermissions',
    codexArgs: ['--dangerously-bypass-approvals-and-sandbox'],
    onEntry: entry => entries.push(entry), broadcastWs: frame => frames.push(frame) };
  sdk.setSdkLaunchConfig(config);
  const owner = sdk.initSdkSession(cwd, 'project', config);
  try {
    await sdk.sendUserMessage('resident', owner);
    const before = sdk.getSdkSessionInfo(owner), queue = sdk.getSdkQueueState(owner);
    frames.length = 0;
    const spawn = (prompt, options = {}) => sdk.spawnEphemeralSession(prompt, { cwd, project: 'project', instanceKey: owner.instanceKey, ...options });
    const first = await spawn('fresh');
    assert.equal(first.ok, true, JSON.stringify(first));
    assert.notEqual(first.sessionId, before.sessionId);
    assert.deepEqual(sdk.getSdkSessionInfo(owner), before);
    assert.deepEqual(sdk.getSdkQueueState(owner), queue);
    assert.equal(sdk.listSdkSessions().length, 1);
    assert.deepEqual(frames, [], 'child lifecycle/stream/queue never replace resident UI');
    const starts = calls().filter(c => c.method === 'thread/start');
    assert.equal(starts.length, 2);
    assert.equal(starts[0].params.sandbox, 'danger-full-access');
    assert.equal(starts[1].params.sandbox, 'workspace-write');
    assert.equal(starts[1].params.approvalPolicy, 'on-request');
    assert.equal(alive(starts[1].pid), false, 'ephemeral process exits before result resolves');
    assert.equal(alive(starts[0].pid), true, 'resident process stays alive');
    assert.equal((await spawn('fail')).reason, 'turn-error');
    assert.equal((await spawn('hold', { timeoutMs: 100 })).reason, 'timeout');
    const preabort = new AbortController(); preabort.abort();
    const count = calls().length;
    assert.equal((await spawn('fresh', { signal: preabort.signal })).reason, 'aborted');
    assert.equal(calls().length, count);
    const running = spawn('approval');
    await until(() => frames.some(f => f.type === 'perm-hook-pending'));
    const pending = frames.find(f => f.type === 'perm-hook-pending');
    assert.equal(pending.origin, 'scheduled-task');
    assert.equal(pending.instanceKey, owner.instanceKey);
    assert.notEqual(pending.sessionId, before.sessionId);
    assert.notEqual(pending.executionInstanceKey, owner.instanceKey);
    assert.equal(sdk.getSdkPendingApprovals(owner).filter(f => f.origin === 'scheduled-task').length, 1);
    assert.throws(() => sdk.resolveApproval(pending.id, 'allow', { instanceKey: 'foreign' }), { code: 'SDK_SESSION_NOT_FOUND' });
    assert.equal(sdk.resolveApproval(pending.id, 'allow', owner), true);
    assert.equal((await running).ok, true);
    assert.equal(sdk.getSdkPendingApprovals(owner).length, 0);
    assert.deepEqual(sdk.getSdkSessionInfo(owner), before);
    writePreferences({ approvalModal: { askAutoAnswerMinutes: 0 } });
    const hosted = await spawn('ask');
    assert.equal(hosted.ok, true);
    const answer = calls().find(call => call.id === 'ask' && call.result);
    assert.deepEqual(answer.result.answers, { choice: { answers: ['Second (Recommended)'] } });
    assert.ok(frames.some(frame => frame.type === 'sdk-ask-pending' && frame.origin === 'scheduled-task'));
    assert.deepEqual(sdk.getSdkSessionInfo(owner), before);
    writePreferences({});
    const controller = new AbortController();
    const aborted = spawn('hold', { signal: controller.signal });
    await until(() => calls().filter(c => c.method === 'turn/start').length >= 7);
    controller.abort();
    assert.equal((await aborted).reason, 'aborted');
    const last = calls().filter(c => c.method === 'thread/start').at(-1);
    assert.equal(alive(last.pid), false);
    assert.ok(entries.filter(entry => entry.mainAgent).length >= 4);
    const execCwd = join(root, 'exec-parent'); mkdirSync(execCwd);
    const execConfig = { ...config, transport: 'exec' };
    sdk.setSdkLaunchConfig(execConfig);
    const execOwner = sdk.initSdkSession(execCwd, 'exec-parent', execConfig);
    const execRun = sdk.spawnEphemeralSession('approval', { cwd: execCwd, project: 'exec-parent',
      instanceKey: execOwner.instanceKey, transport: 'exec' });
    await until(() => sdk.getSdkPendingApprovals(execOwner).some(frame => frame.type === 'perm-hook-pending'));
    const execApproval = sdk.getSdkPendingApprovals(execOwner)[0];
    assert.equal(execApproval.origin, 'scheduled-task');
    assert.equal(sdk.resolveApproval(execApproval.id, 'deny', execOwner), true);
    assert.equal((await execRun).ok, true);
    const execStarts = readFileSync(join(execCwd, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
      .filter(call => call.method === 'thread/start');
    assert.equal(execStarts[0].params.approvalPolicy, 'on-request');
    assert.equal(execStarts[0].params.sandbox, 'workspace-write');
    assert.equal(sdk.getSdkSessionInfo(execOwner).transport, 'exec');
    assert.equal(sdk.getSessionId(execOwner), null, 'independent AppServer never starts or replaces the exec resident');
  } finally { await sdk.stopSession(); sdk.setSdkLaunchConfig(null); rmSync(root, { recursive: true, force: true }); }
});
