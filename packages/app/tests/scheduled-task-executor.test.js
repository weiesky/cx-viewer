// Tests for packages/app/server/lib/scheduled-task-executor.js — the L1 glue between a
// claimed task and the SDK/PTY execution paths. All SDK/PTY accessors are fakes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeScheduledTask } from '../lib/scheduled-task-executor.js';

const TASK = { instanceKey: 'ccv-abc', id: 'st_1', project: 'proj', cwd: '/tmp/proj', prompt: 'do it', mode: 'inject', schedule: { kind: 'daily', time: '09:00' } };
const samePath = (a, b) => a === b;

function sdkFake(over = {}) {
  return {
    isSdkAvailable: () => true,
    listSdkSessions: () => [{ key: '/tmp/proj', cwd: '/tmp/proj', active: true, instanceKey: 'ccv-abc' }],
    // Real contract: getQueueSnapshot returns an ARRAY (sdk-manager _getQueueSnapshot).
    getQueueSnapshot: () => [],
    sendUserMessage: async () => {},
    spawnEphemeralSession: async () => ({ ok: true, sessionId: 'sid-1', subtype: 'success' }),
    ...over,
  };
}
function ptyFake(over = {}) {
  return {
    listLivePtys: () => [{ ptyKind: 'codex', cwd: '/tmp/proj', isActive: true, instanceKey: 'ccv-abc' }],
    getPtyKindFor: () => 'codex',
    ...over,
  };
}
const chatQueueOk = { enqueue: (text, anchor) => ({ id: 'q1', anchor }) };

// ─── inject / SDK ───

test('inject (SDK): dispatched when the resident session accepts', async () => {
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: true, sdk: sdkFake(), pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'dispatched');
});

test('inject (SDK): sdk unavailable → failed/sdk_unavailable', async () => {
  const sdk = sdkFake({ isSdkAvailable: () => false });
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'sdk_unavailable']);
});

test('inject (SDK): no resident session for cwd → failed/no_live_session', async () => {
  const sdk = sdkFake({ listSdkSessions: () => [{ key: '/other', cwd: '/other', instanceKey: 'ccv-x' }] });
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'no_live_session']);
});

test('inject (SDK): full queue → failed/queue_rejected (P1-4, no false dispatched)', async () => {
  // 50-item ARRAY (the real getQueueSnapshot shape) → rejected, not falsely dispatched.
  const sdk = sdkFake({ getQueueSnapshot: () => new Array(50).fill({}) });
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'queue_rejected']);
});

test('inject (SDK): exact instance is authoritative even for a legacy mismatched project stamp', async () => {
  let seen;
  const sdk = sdkFake({ sendUserMessage: async (text, anchor) => { seen = { text, anchor }; } });
  const r = await executeScheduledTask({ ...TASK, project: 'legacy-mismatch' }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'dispatched');
  assert.deepEqual(seen, { text: TASK.prompt, anchor: { instanceKey: 'ccv-abc' } });
});

// ─── inject / PTY ───

test('inject (PTY): dispatched with strictAnchor passed to enqueue', async () => {
  let seenAnchor;
  const cq = { enqueue: (text, anchor) => { seenAnchor = anchor; return { id: 'q1', anchor }; } };
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: false, sdk: sdkFake(), pty: ptyFake(), chatQueue: cq, samePath });
  assert.equal(r.status, 'dispatched');
  assert.equal(seenAnchor.strictAnchor, true, 'strictAnchor is set (P0-2)');
  assert.equal(seenAnchor.instanceKey, 'ccv-abc');
});

test('inject (PTY): strict precheck uses instanceKey ONLY (P0-2)', async () => {
  let precheckArg;
  const pty = ptyFake({ getPtyKindFor: (a) => { precheckArg = a; return 'codex'; } });
  await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: false, sdk: sdkFake(), pty, chatQueue: chatQueueOk, samePath });
  assert.deepEqual(Object.keys(precheckArg), ['instanceKey'], 'no project/cwd → _resolveKey cannot fall back');
});

test('inject (PTY): dead instance (strict precheck null) → failed/no_live_session', async () => {
  const pty = ptyFake({ getPtyKindFor: () => null });
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: false, sdk: sdkFake(), pty, chatQueue: chatQueueOk, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'no_live_session']);
});

test('inject (PTY): no live claude PTY for cwd → failed/no_live_session', async () => {
  const pty = ptyFake({ listLivePtys: () => [{ ptyKind: 'codex', cwd: '/other', instanceKey: 'ccv-x' }] });
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: false, sdk: sdkFake(), pty, chatQueue: chatQueueOk, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'no_live_session']);
});

test('inject (PTY): enqueue rejection → failed/queue_rejected', async () => {
  const r = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: false, sdk: sdkFake(), pty: ptyFake(), chatQueue: { enqueue: () => null }, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'queue_rejected']);
});

// ─── spawn ───

test('spawn: completed + sessionId on success', async () => {
  const r = await executeScheduledTask({ ...TASK, mode: 'spawn' }, {}, { validateFiles: () => null, isSdkMode: true, sdk: sdkFake(), pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'completed');
  assert.equal(r.sessionId, 'sid-1');
});

test('spawn: non-SDK mode → failed/spawn_unavailable', async () => {
  const r = await executeScheduledTask({ ...TASK, mode: 'spawn' }, {}, { validateFiles: () => null, isSdkMode: false, sdk: sdkFake(), pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'spawn_unavailable']);
});

test('spawn: SDK error → error with reason', async () => {
  const sdk = sdkFake({ spawnEphemeralSession: async () => ({ ok: false, reason: 'turn-error', error: 'boom', sessionId: 'sid-1' }) });
  const r = await executeScheduledTask({ ...TASK, mode: 'spawn' }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'error');
  assert.equal(r.reason, 'turn-error');
  assert.equal(r.error, 'boom');
});

test('spawn: executor throw → error/internal (contained)', async () => {
  const sdk = sdkFake({ spawnEphemeralSession: async () => { throw new Error('crash'); } });
  const r = await executeScheduledTask({ ...TASK, mode: 'spawn' }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'error');
  assert.equal(r.reason, 'internal');
});

// ─── UltraPlan assembly (assembleScheduledPrompt at fire time) ───

test('assembly: attachments are prefixed as quoted paths ahead of the raw prompt', async () => {
  let seen;
  const sdk = sdkFake({ sendUserMessage: async (text) => { seen = text; } });
  const task = { ...TASK, attachments: [{ name: 'a.png', path: '/home/u/.claude/cc-viewer/proj/images/a.png' }, { name: 'b.txt', path: '/home/u/.claude/cc-viewer/proj/images/b.txt' }] };
  const r = await executeScheduledTask(task, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'dispatched');
  assert.equal(seen, '"/home/u/.claude/cc-viewer/proj/images/a.png" "/home/u/.claude/cc-viewer/proj/images/b.txt" do it');
});

test('assembly: attachments-only task dispatches (no text required)', async () => {
  let seen;
  const sdk = sdkFake({ sendUserMessage: async (text) => { seen = text; } });
  const r = await executeScheduledTask({ ...TASK, prompt: '', attachments: [{ name: 'a.png', path: '/p/a.png' }] }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'dispatched');
  assert.equal(seen, '"/p/a.png"');
});

test('assembly: empty prompt and no attachments → failed/invalid_prompt (never dispatched)', async () => {
  let called = false;
  const sdk = sdkFake({ sendUserMessage: async () => { called = true; } });
  const r = await executeScheduledTask({ ...TASK, prompt: '   ' }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.deepEqual([r.status, r.reason], ['failed', 'invalid_prompt']);
  assert.equal(called, false);
});

test('assembly: template=none (or absent) sends the raw text verbatim', async () => {
  let seen;
  const sdk = sdkFake({ sendUserMessage: async (text) => { seen = text; } });
  await executeScheduledTask({ ...TASK, template: 'none' }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(seen, 'do it');
});

test('assembly: builtin template wraps with the <user_instructions> scoped instruction', async () => {
  let seen;
  const sdk = sdkFake({ sendUserMessage: async (text) => { seen = text; } });
  await executeScheduledTask({ ...TASK, template: 'codeExpert' }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.ok(seen.startsWith('<user_instructions>'), 'wrapper missing');
  assert.ok(seen.includes('[SCOPED INSTRUCTION]'), 'preamble missing');
  assert.ok(seen.endsWith('do it'), 'user text should come last');
});

test('assembly: custom template uses the stored snapshot (templateContent), not live prefs', async () => {
  let seen;
  const sdk = sdkFake({ sendUserMessage: async (text) => { seen = text; } });
  const task = { ...TASK, template: 'custom:cue-1', templateContent: 'You are an auditor.' };
  await executeScheduledTask(task, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.ok(seen.includes('You are an auditor.'), 'snapshot body missing');
  assert.ok(seen.endsWith('do it'));
});

test('assembly: custom template with a missing/empty snapshot degrades to the raw input', async () => {
  let seen;
  const sdk = sdkFake({ sendUserMessage: async (text) => { seen = text; } });
  const r = await executeScheduledTask({ ...TASK, template: 'custom:cue-gone' }, {}, { validateFiles: () => null, isSdkMode: true, sdk, pty: ptyFake(), chatQueue: chatQueueOk, samePath });
  assert.equal(r.status, 'dispatched', 'task must not be silently dropped');
  assert.equal(seen, 'do it');
});

test('exact resident identity never falls back to an active cwd sibling or missing key', async () => {
  let sent = 0;
  for (const isSdkMode of [true, false]) for (const instanceKey of ['dead', undefined]) {
    const result = await executeScheduledTask({ ...TASK, instanceKey }, {}, { validateFiles: () => null,
      isSdkMode, samePath, sdk: sdkFake({ sendUserMessage: async () => { sent++; } }),
      pty: ptyFake(), chatQueue: { enqueue: () => { sent++; } } });
    assert.equal(result.reason, 'no_live_session');
  }
  assert.equal(sent, 0);
});

test('SDK dispatch records native acceptance without waiting for the full turn', async () => {
  let finish;
  const sdk = sdkFake({ sendUserMessage: (_text, anchor, options) => {
    assert.deepEqual(anchor, { instanceKey: TASK.instanceKey });
    options.onAccepted({ queued: false });
    return new Promise(resolve => { finish = resolve; });
  } });
  const result = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: true, sdk, samePath });
  assert.equal(result.status, 'dispatched');
  finish();
});

test('a queue that fills after precheck fails without a false dispatch', async () => {
  const sdk = sdkFake({ sendUserMessage: async () => { throw Object.assign(new Error('full'), { code: 'SDK_QUEUE_FULL' }); } });
  const result = await executeScheduledTask(TASK, {}, { validateFiles: () => null, isSdkMode: true, sdk, samePath });
  assert.equal(result.reason, 'queue_rejected');
});

test('real deleted cwd and attachments fail before any native send', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'cxv-task-files-'));
  const attachment = join(root, 'upload.txt');
  let sent = 0;
  const io = { isSdkMode: true, samePath, sdk: sdkFake({ sendUserMessage: async () => { sent++; } }) };
  try {
    writeFileSync(attachment, 'fixture');
    const task = { ...TASK, cwd: root, attachments: [{ name: 'upload.txt', path: attachment }] };
    rmSync(attachment);
    assert.equal((await executeScheduledTask(task, {}, io)).reason, 'attachment_missing');
    rmSync(root, { recursive: true });
    assert.equal((await executeScheduledTask(task, {}, io)).reason, 'cwd_missing');
    assert.equal(sent, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
