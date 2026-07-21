import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_DINGTALK_INPUT_BYTES,
  buildDingTalkPasteChunks,
  createDingTalkImBridge,
  extractDingTalkFinalText,
  sanitizeDingTalkInput,
  validateDingTalkBridgeConfig,
} from '../lib/dingtalk-im-bridge.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

function makeHarness(overrides = {}) {
  let inbound;
  const calls = { ack: [], sent: [], writes: [], disconnected: 0 };
  const adapter = {
    async connect(_config, hooks) {
      inbound = hooks.onInbound;
      return { connected: true };
    },
    ack(raw) { calls.ack.push(raw.headers.messageId); },
    async disconnect() { calls.disconnected++; },
    connectionState() { return 'connected'; },
    async sendText(_config, target, text) { calls.sent.push({ target, text }); },
    async testConnection() { return { ok: true }; },
  };
  const config = {
    enabled: true,
    appKey: 'app-key',
    appSecret: 'app-secret',
    allowStaffIds: ['staff-1'],
    maxChunkChars: 1000,
  };
  let writeResult = true;
  const bridge = createDingTalkImBridge({
    adapter,
    getConfig: () => config,
    getPtyState: () => ({ running: true, recovering: false }),
    getActiveContext: () => ({ projectId: 'project-1', threadId: 'thread-1', sessionId: 'session-1' }),
    writeToPtySequential(chunks, callback, options) {
      calls.writes.push({ chunks, options });
      callback(writeResult);
      return writeResult ? () => {} : null;
    },
    turnTimeoutMs: 10_000,
    ...overrides,
  });
  return {
    adapter, bridge, calls, config,
    setWriteResult(value) { writeResult = value; },
    receive({
      messageId = `message-${Math.random()}`,
      text = 'hello',
      senderStaffId = 'staff-1',
      conversationId = 'conversation-1',
    } = {}) {
      const raw = { headers: { messageId } };
      inbound?.({
        messageId, text, senderStaffId, conversationId, conversationType: '1',
        target: { conversationId, conversationType: '1', robotCode: 'robot-1', senderStaffId },
      }, raw);
    },
  };
}

function injectedText(write) {
  return write.chunks[0].slice('\x1b[200~'.length, -'\x1b[201~'.length);
}

function completedEntry(prompt, {
  projectId = 'project-1', threadId = 'thread-1', turnId = 'turn-1', text = 'final answer',
} = {}) {
  return {
    timestamp: '2026-07-21T00:00:00.000Z',
    url: 'https://chatgpt.com/backend-api/codex/responses',
    method: 'POST',
    mainAgent: true,
    project: projectId,
    body: {
      instructions: 'You are Codex',
      tools: [{ name: 'shell_command' }],
      metadata: { thread_id: threadId, turn_id: turnId },
      input: [{ role: 'user', content: prompt }],
    },
    response: {
      status: 200,
      body: {
        content: [
          { type: 'reasoning', text: 'private reasoning' },
          { type: 'text', text },
          { type: 'tool_use', text: 'private tool' },
        ],
        turn: { id: turnId, status: 'completed' },
      },
    },
  };
}

test('configuration accepts an optional DingTalk allowlist', () => {
  assert.deepEqual(
    validateDingTalkBridgeConfig({ appKey: 'key', appSecret: 'secret', allowStaffIds: [] }).allowStaffIds,
    [],
  );
  const normalized = validateDingTalkBridgeConfig({
    appKey: ' key ', appSecret: ' secret ', allowStaffIds: [' staff-1 ', 'staff-1'],
  });
  assert.deepEqual(normalized.allowStaffIds, ['staff-1']);
});

test('an empty allowlist accepts any sender', async () => {
  const harness = makeHarness();
  harness.config.allowStaffIds = [];
  await harness.bridge.start();
  harness.receive({ messageId: 'open', senderStaffId: 'any-staff' });
  assert.equal(harness.calls.writes.length, 1);
});

test('input sanitizer removes terminal controls and bracket-paste escape attempts', () => {
  assert.equal(sanitizeDingTalkInput(' hello\r\x1b[201~\x00world\t! '), 'hello[201~world !');
  const chunks = buildDingTalkPasteChunks('hello', 'abcdefghijklmnop');
  assert.equal(chunks.length, 2);
  assert.match(chunks[0], /^\x1b\[200~⟦im:dingtalk:abcdefghijklmnop⟧ hello/);
  assert.equal(chunks[1], '\r');
});

test('authorized messages ACK, deduplicate and inject one bracket-paste job', async () => {
  const harness = makeHarness();
  assert.equal(await harness.bridge.start(), true);
  harness.receive({ messageId: 'same' });
  harness.receive({ messageId: 'same' });
  assert.deepEqual(harness.calls.ack, ['same', 'same']);
  assert.equal(harness.calls.writes.length, 1);
  assert.equal(harness.calls.writes[0].options.settleMs, 250);
  assert.match(injectedText(harness.calls.writes[0]), /^⟦im:dingtalk:[A-Za-z0-9_-]+⟧ hello$/);
});

test('unauthorized, empty and oversized messages never reach the PTY', async () => {
  const harness = makeHarness();
  await harness.bridge.start();
  harness.receive({ messageId: 'unauthorized', senderStaffId: 'intruder' });
  harness.receive({ messageId: 'empty', text: '\x1b\r' });
  harness.receive({ messageId: 'large', text: '界'.repeat(Math.ceil(MAX_DINGTALK_INPUT_BYTES / 3) + 1) });
  await tick();
  assert.equal(harness.calls.writes.length, 0);
  assert.equal(harness.calls.sent.length, 1);
  assert.match(harness.calls.sent[0].text, /过长/);
});

test('single-flight queues a second message and drains it after the exact V2 final commit', async () => {
  const harness = makeHarness();
  await harness.bridge.start();
  harness.receive({ messageId: 'first', text: 'one' });
  harness.receive({ messageId: 'second', text: 'two' });
  assert.equal(harness.calls.writes.length, 1);
  assert.equal(harness.bridge.getStatus().queued, 1);

  const prompt = injectedText(harness.calls.writes[0]);
  const consumed = await harness.bridge.notifyLogV2Commit(
    completedEntry(prompt), {},
    { projectId: 'project-1', thread: { id: 'thread-1', sessionId: 'session-1' } },
  );
  assert.equal(consumed, true);
  assert.deepEqual(harness.calls.sent.map((item) => item.text), ['final answer']);
  await tick();
  assert.equal(harness.calls.writes.length, 2);
  assert.match(injectedText(harness.calls.writes[1]), /two$/);
});

test('commit correlation rejects another project, thread, previous turn and last user prompt', async () => {
  const harness = makeHarness({
    getActiveContext: () => ({
      projectId: 'project-1', threadId: 'thread-1', sessionId: 'session-1', turnId: 'turn-expected',
    }),
  });
  await harness.bridge.start();
  harness.receive({ messageId: 'first' });
  const prompt = injectedText(harness.calls.writes[0]);
  assert.equal(await harness.bridge.notifyLogV2Commit(
    completedEntry(prompt, { projectId: 'other', turnId: 'turn-new' }), {},
    { projectId: 'other', thread: { id: 'thread-1', sessionId: 'session-1' } },
  ), false);
  assert.equal(await harness.bridge.notifyLogV2Commit(
    completedEntry(prompt, { threadId: 'other', turnId: 'turn-new' }), {},
    { projectId: 'project-1', thread: { id: 'other', sessionId: 'session-1' } },
  ), false);
  assert.equal(await harness.bridge.notifyLogV2Commit(
    completedEntry(prompt, { turnId: 'turn-expected' }), {},
    { projectId: 'project-1', thread: { id: 'thread-1', sessionId: 'session-1' } },
  ), false);
  assert.equal(await harness.bridge.notifyLogV2Commit(
    completedEntry('local prompt', { turnId: 'turn-new' }), {},
    { projectId: 'project-1', thread: { id: 'thread-1', sessionId: 'session-1' } },
  ), false);
  assert.equal(harness.bridge.getStatus().pending, true);
  assert.equal(harness.calls.sent.length, 0);

  assert.equal(await harness.bridge.notifyLogV2Commit(
    completedEntry(prompt, { turnId: 'turn-new' }), {},
    { projectId: 'project-1', thread: { id: 'thread-1', sessionId: 'session-1' } },
  ), true);
  assert.deepEqual(harness.calls.sent.map((item) => item.text), ['final answer']);
});

test('failed PTY injection releases single-flight so the following message can proceed', async () => {
  const callbacks = [];
  const harness = makeHarness({
    writeToPtySequential(chunks, callback, options) {
      harness.calls.writes.push({ chunks, options });
      callbacks.push(callback);
      return () => {};
    },
  });
  await harness.bridge.start();
  harness.receive({ messageId: 'first', text: 'one' });
  harness.receive({ messageId: 'second', text: 'two' });
  callbacks[0](false);
  await tick();
  assert.match(harness.calls.sent[0].text, /无法提交/);
  assert.equal(harness.calls.writes.length, 2);
});

test('only final assistant text is returned; reasoning and tool text are excluded', () => {
  const entry = completedEntry('prompt', { text: 'safe answer' });
  assert.equal(extractDingTalkFinalText(entry), 'safe answer');
  assert.doesNotMatch(extractDingTalkFinalText(entry), /private/);
});

test('stop disconnects and invalidates callbacks from the old client generation', async () => {
  const harness = makeHarness();
  await harness.bridge.start();
  await harness.bridge.stop();
  harness.receive({ messageId: 'late' });
  assert.equal(harness.calls.disconnected, 1);
  assert.equal(harness.calls.writes.length, 0);
  assert.equal(harness.bridge.getStatus().running, false);
});
