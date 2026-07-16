import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  _parseAppServerClientMessageForTests,
  _parseAppServerServerMessageForTests,
  _resetAppServerBridgeForTests,
  _injectApprovalsReviewerForTests,
  _flushAppServerRawSidecarsForTests,
  _getAppServerRawStateForTests,
  _writeAppServerEntryForTests,
  resetRawCaptureBoundary,
} from '../lib/appserver-bridge.js';

test('app-server bridge delegates log writes to the shared rotating writer', () => {
  const seen = [];
  _resetAppServerBridgeForTests({
    logFile: '/tmp/cxv-shared-writer-test.jsonl',
    writeLogEntry: (entry) => seen.push(entry),
  });
  const entry = { timestamp: '2026-07-10T00:00:00.000Z', mainAgent: true };
  _writeAppServerEntryForTests(entry);
  assert.deepEqual(seen, [entry]);
  _resetAppServerBridgeForTests();
});

test('app-server bridge stores raw JSON-RPC frames in thread sidecars instead of business entries', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-sidecar-'));
  const logFile = join(tmp, 'bridge.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    _parseAppServerClientMessageForTests({
      id: 1,
      method: 'thread/start',
      params: { cwd: tmp, developerInstructions: 'You are Codex' },
    });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'root prompt' }],
      clientUserMessageId: 'raw-sidecar-user',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: { id: 'root-message', type: 'agentMessage', text: 'root answer' },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: { id: 'root-turn', threadId: 'root-thread', status: 'completed' },
    });
    _flushAppServerRawSidecarsForTests();

    const entries = readEntries(logFile);
    assert.equal(entries.length, 1);
    assert.equal(entries[0]._codexRawRequest, undefined);
    assert.equal(typeof entries[0]._codexRaw?.streamId, 'string');
    assert.deepEqual({ ...entries[0]._codexRaw, streamId: '<stream>' }, {
      version: 1,
      streamId: '<stream>',
      threadId: 'root-thread',
      sidecar: 'root-thread.jsonl',
      fromSeq: 2,
      toSeq: 5,
    });

    const rawDir = join(tmp, 'raw');
    const protocolFile = join(rawDir, '_app-server.jsonl');
    const rootFile = join(rawDir, 'root-thread.jsonl');
    assert.equal(existsSync(protocolFile), true);
    assert.equal(existsSync(rootFile), true);

    const protocolFrames = readFileSync(protocolFile, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(protocolFrames.length, 1);
    assert.equal(protocolFrames[0].method, 'thread/start');
    assert.equal(protocolFrames[0].thread_id, null);
    assert.equal(protocolFrames[0].direction, 'client');

    const rootFrames = readFileSync(rootFile, 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(rootFrames.map(frame => frame.method), [
      'thread/started',
      'turn/start',
      'item/completed',
      'turn/completed',
    ]);
    assert.equal(rootFrames.every(frame => frame.thread_id === 'root-thread'), true);
    assert.equal(rootFrames.every(frame => typeof frame.stream_id === 'string' && frame.stream_id), true);
    assert.deepEqual(rootFrames.map(frame => frame.seq), [...rootFrames.map(frame => frame.seq)].sort((a, b) => a - b));
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('each business entry references only raw frames captured since the previous entry', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-range-'));
  const seen = [];
  try {
    _resetAppServerBridgeForTests({
      logFile: join(tmp, 'bridge.jsonl'),
      writeLogEntry: entry => { seen.push(entry); return { written: true }; },
    });
    server('raw/first', { threadId: 'thread-range', value: 1 });
    _writeAppServerEntryForTests({ body: { metadata: { thread_id: 'thread-range' } } });
    server('raw/second', { threadId: 'thread-range', value: 2 });
    _writeAppServerEntryForTests({ body: { metadata: { thread_id: 'thread-range' } } });

    assert.equal(seen.length, 2);
    assert.deepEqual(
      seen.map(entry => [entry._codexRaw.fromSeq, entry._codexRaw.toSeq]),
      [[1, 1], [2, 2]],
    );
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('accepted async writes release raw ranges only after durable completion', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-durable-'));
  const seen = [];
  let resolveCompletion;
  const completion = new Promise(resolve => { resolveCompletion = resolve; });
  try {
    _resetAppServerBridgeForTests({
      logFile: join(tmp, 'bridge.jsonl'),
      writeLogEntry: entry => {
        seen.push(entry);
        if (seen.length === 1) {
          return { written: false, accepted: true, durable: false, completion };
        }
        return { written: true, accepted: true, durable: true };
      },
    });
    server('raw/first', { threadId: 'thread-durable', value: 1 });
    const admitted = _writeAppServerEntryForTests({ body: { metadata: { thread_id: 'thread-durable' } } });
    assert.equal(admitted.written, false);
    assert.equal(admitted.accepted, true);
    assert.equal(admitted.durable, false);

    resolveCompletion({ written: true, accepted: true, durable: true });
    assert.equal((await admitted.completion).durable, true);
    await new Promise(resolve => setImmediate(resolve));

    server('raw/second', { threadId: 'thread-durable', value: 2 });
    _writeAppServerEntryForTests({ body: { metadata: { thread_id: 'thread-durable' } } });
    assert.deepEqual(
      seen.map(entry => [entry._codexRaw.fromSeq, entry._codexRaw.toSeq]),
      [[1, 1], [2, 2]],
    );
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('failed async writes preserve raw ranges for the next durable entry', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-failed-'));
  const seen = [];
  try {
    _resetAppServerBridgeForTests({
      logFile: join(tmp, 'bridge.jsonl'),
      writeLogEntry: entry => {
        seen.push(entry);
        if (seen.length === 1) {
          return {
            written: false,
            accepted: true,
            durable: false,
            completion: Promise.reject(Object.assign(new Error('disk failed'), { code: 'ENOSPC' })),
          };
        }
        return { written: true, accepted: true, durable: true };
      },
    });
    server('raw/first', { threadId: 'thread-failed', value: 1 });
    _writeAppServerEntryForTests({ body: { metadata: { thread_id: 'thread-failed' } } });
    await new Promise(resolve => setImmediate(resolve));

    server('raw/second', { threadId: 'thread-failed', value: 2 });
    _writeAppServerEntryForTests({ body: { metadata: { thread_id: 'thread-failed' } } });
    assert.deepEqual(
      seen.map(entry => [entry._codexRaw.fromSeq, entry._codexRaw.toSeq]),
      [[1, 1], [1, 2]],
    );
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('raw capture boundary discards pending frames and starts a new stream', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-boundary-'));
  const seen = [];
  try {
    _resetAppServerBridgeForTests({
      logFile: join(tmp, 'bridge.jsonl'),
      writeLogEntry: entry => { seen.push(entry); return { written: true }; },
    });
    server('raw/before-clear', { threadId: 'thread-clear' });
    const boundary = resetRawCaptureBoundary();
    server('raw/after-clear', { threadId: 'thread-clear' });
    _writeAppServerEntryForTests({ body: { metadata: { thread_id: 'thread-clear' } } });
    _flushAppServerRawSidecarsForTests();

    assert.notEqual(boundary.previousStreamId, boundary.streamId);
    assert.equal(seen[0]._codexRaw.streamId, boundary.streamId);
    assert.deepEqual([seen[0]._codexRaw.fromSeq, seen[0]._codexRaw.toSeq], [1, 1]);
    const frames = readFileSync(join(tmp, 'raw', 'thread-clear.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(frames.map(frame => frame.method), ['raw/after-clear']);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('raw sidecars rotate into bounded segments and enforce per-thread retention', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-rotation-'));
  const logFile = join(tmp, 'bridge.jsonl');
  try {
    _resetAppServerBridgeForTests({
      logFile,
      rawStorageOptions: {
        segmentBytes: 700,
        threadQuotaBytes: 1600,
        globalQuotaBytes: 4000,
        bufferBytes: 64 * 1024,
      },
    });
    for (let i = 0; i < 30; i++) {
      server('raw/test', { threadId: 'thread-rotate', index: i, payload: 'x'.repeat(90) });
    }
    _flushAppServerRawSidecarsForTests();
    const rawDir = join(tmp, 'raw');
    const files = readdirSync(rawDir).filter(name => name.startsWith('thread-rotate') && name.endsWith('.jsonl'));
    const total = files.reduce((sum, name) => sum + statSync(join(rawDir, name)).size, 0);
    assert.equal(files.some(name => /\.part-\d{4}\.jsonl$/.test(name)), true);
    assert.equal(total <= 2300, true, `retained ${total} bytes`);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('raw sidecar global quota also evicts one-segment active threads', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-global-quota-'));
  try {
    _resetAppServerBridgeForTests({
      logFile: join(tmp, 'bridge.jsonl'),
      rawStorageOptions: {
        segmentBytes: 4096,
        threadQuotaBytes: 4096,
        globalQuotaBytes: 1500,
        bufferBytes: 64 * 1024,
      },
    });
    for (let i = 0; i < 3; i++) server('raw/test', { threadId: `thread-global-${i}`, payload: 'x'.repeat(700) });
    _flushAppServerRawSidecarsForTests();
    const rawDir = join(tmp, 'raw');
    const total = readdirSync(rawDir).reduce((sum, name) => sum + statSync(join(rawDir, name)).size, 0);
    assert.equal(total <= 1500, true, `retained ${total} bytes`);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('raw sidecar write failures retain only a bounded chunk buffer', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-failure-'));
  try {
    _resetAppServerBridgeForTests({
      logFile: join(tmp, 'bridge.jsonl'),
      rawStorageOptions: {
        bufferBytes: 1200,
        append: () => { throw new Error('disk unavailable'); },
      },
    });
    for (let i = 0; i < 40; i++) {
      server('raw/test', { threadId: 'thread-fail', index: i, payload: 'x'.repeat(120) });
    }
    _flushAppServerRawSidecarsForTests();
    const state = _getAppServerRawStateForTests();
    assert.equal(state.bufferedBytes <= 1200, true);
    assert.equal(state.droppedFrames > 0, true);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('raw routing maps are bounded and terminal notifications release turn/item routes', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-raw-routes-'));
  try {
    _resetAppServerBridgeForTests({
      logFile: join(tmp, 'bridge.jsonl'),
      rawStorageOptions: { routeMapMax: 3 },
    });
    for (let i = 0; i < 10; i++) {
      _parseAppServerClientMessageForTests({ id: i, method: 'turn/start', params: { threadId: `thread-${i}`, turnId: `turn-${i}`, input: [] } });
    }
    assert.equal(_getAppServerRawStateForTests().rpcRoutes <= 3, true);
    server('item/started', { threadId: 'thread-final', item: { id: 'item-final', turnId: 'turn-final' } });
    let state = _getAppServerRawStateForTests();
    assert.equal(state.itemRoutes > 0, true);
    server('item/completed', { threadId: 'thread-final', item: { id: 'item-final', turnId: 'turn-final' } });
    server('turn/completed', { threadId: 'thread-final', turn: { id: 'turn-final', threadId: 'thread-final', status: 'completed' } });
    state = _getAppServerRawStateForTests();
    assert.equal(state.itemRoutes, 0);
    assert.equal(state.turnRoutes < 3, true);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge injects Codex approval reviewer into stable lifecycle requests', () => {
  for (const method of ['thread/start', 'thread/resume', 'thread/fork', 'turn/start']) {
    const original = { id: 1, method, params: { cwd: '/tmp/project', approvalsReviewer: 'user' } };
    const injected = _injectApprovalsReviewerForTests(original, 'auto_review');
    assert.equal(injected.params.approvalsReviewer, 'auto_review', method);
    assert.equal(injected.params.cwd, '/tmp/project', method);
    assert.equal(original.params.approvalsReviewer, 'user', `${method} input remains immutable`);
  }
});

test('app-server bridge leaves unrelated requests untouched', () => {
  const original = { id: 1, method: 'turn/steer', params: { input: [] } };
  assert.equal(_injectApprovalsReviewerForTests(original, 'auto_review'), original);
});

test('app-server bridge does not override a native reviewer before an explicit CX Viewer selection', () => {
  const original = { id: 1, method: 'turn/start', params: { approvalsReviewer: 'auto_review', input: [] } };
  assert.equal(_injectApprovalsReviewerForTests(original), original);
});

function readEntries(logFile) {
  const raw = readFileSync(logFile, 'utf8');
  return raw
    .split('\n---\n')
    .filter(part => part.trim())
    .map(part => JSON.parse(part));
}

function server(method, params = {}) {
  _parseAppServerServerMessageForTests({ method, params });
}

function serverRequest(id, method, params = {}) {
  _parseAppServerServerMessageForTests({ id, method, params });
}

function serverResponse(id, result, error = null) {
  _parseAppServerServerMessageForTests(error ? { id, error } : { id, result });
}

function client(method, params = {}) {
  _parseAppServerClientMessageForTests({ id: Math.floor(Math.random() * 100000), method, params });
}

function clientResponse(id, result, error = null) {
  _parseAppServerClientMessageForTests(error ? { id, error } : { id, result });
}

test('app-server bridge marks root and spawned subagent turns correctly', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-bridge-'));
  const logFile = join(tmp, 'bridge.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', {
      cwd: tmp,
      developerInstructions: 'You are Codex',
    });
    server('thread/started', {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        preview: 'root',
      },
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'root prompt' }],
      clientUserMessageId: 'u-root',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'root-msg',
        type: 'agent_message',
        text: 'root answer',
      },
    });
    server('thread/tokenUsage/updated', {
      threadId: 'root-thread',
      tokenUsage: {
        last: {
          inputTokens: 12,
          cachedInputTokens: 9,
          outputTokens: 6,
          reasoningOutputTokens: 2,
          totalTokens: 18,
        },
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-root',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 25,
      },
    });

    server('thread/started', {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
              agent_role: 'general',
            },
          },
        },
      },
    });
    server('turn/started', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub',
        status: 'inProgress',
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-user',
        type: 'userMessage',
        content: [{ type: 'text', text: 'sub prompt' }],
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-msg',
        type: 'agent_message',
        text: 'sub answer',
      },
    });
    server('thread/tokenUsage/updated', {
      threadId: 'sub-thread',
      tokenUsage: {
        last: {
          input_tokens: 13,
          cached_input_tokens: 10,
          output_tokens: 7,
          reasoning_output_tokens: 3,
          total_tokens: 20,
        },
      },
    });
    server('turn/completed', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub',
        threadId: 'sub-thread',
        status: 'completed',
        durationMs: 31,
      },
    });

    const entries = readEntries(logFile);
    const mainEntries = entries.filter(entry => entry.method === 'POST');
    assert.equal(mainEntries.length, 2);

    const root = mainEntries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(root?.mainAgent, true);
    assert.equal(root?.subAgent, false);
    assert.equal(root?.response?.body?.content?.[0]?.text, 'root answer');
    assert.deepEqual(root?.response?.body?.usage, {
      input_tokens: 12,
      output_tokens: 6,
      reasoning_output_tokens: 2,
      total_tokens: 18,
      input_tokens_details: { cached_tokens: 9, cache_write_tokens: 0 },
    });
    assert.equal(root?.body?.input?.[0]?.content, 'root prompt');

    const sub = mainEntries.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(sub?.mainAgent, false);
    assert.equal(sub?.subAgent, true);
    assert.equal(sub?.subAgentName, 'researcher');
    assert.equal(sub?.teamName, 'root-thread');
    assert.equal(sub?._parentThreadId, 'root-thread');
    assert.equal(sub?.response?.body?.content?.[0]?.text, 'sub answer');
    assert.deepEqual(sub?.response?.body?.usage, {
      input_tokens: 13,
      output_tokens: 7,
      reasoning_output_tokens: 3,
      total_tokens: 20,
      input_tokens_details: { cached_tokens: 10, cache_write_tokens: 0 },
    });
    assert.equal(sub?.body?.instructions, 'You are Codex subagent (researcher), a general-purpose agent.');
    assert.equal(sub?.body?.input?.[0]?.content, 'sub prompt');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge remembers root and subagent thread metadata from JSON-RPC responses', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-thread-response-'));
  const logFile = join(tmp, 'bridge-thread-response.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    serverResponse(1, {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        preview: 'root from response',
        source: 'appServer',
      },
      model: 'gpt-test',
      cwd: tmp,
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'root prompt' }],
      clientUserMessageId: 'u-root-response',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-root-response', status: 'inProgress' },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: { id: 'root-msg-response', type: 'agent_message', text: 'root response answer' },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: { id: 'turn-root-response', threadId: 'root-thread', status: 'completed' },
    });

    serverResponse(2, {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
              agent_role: 'general',
              depth: 1,
            },
          },
        },
      },
      model: 'gpt-test',
      cwd: tmp,
    });
    server('turn/started', {
      threadId: 'sub-thread',
      turn: { id: 'turn-sub-response', status: 'inProgress' },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: { id: 'sub-msg-response', type: 'agent_message', text: 'sub response answer' },
    });
    server('turn/completed', {
      threadId: 'sub-thread',
      turn: { id: 'turn-sub-response', threadId: 'sub-thread', status: 'completed' },
    });

    const entries = readEntries(logFile).filter(entry => entry.method === 'POST');
    assert.equal(entries.length, 2);

    const root = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(root?.mainAgent, true);
    assert.equal(root?.subAgent, false);
    assert.equal(root?.response?.body?.content?.[0]?.text, 'root response answer');

    const sub = entries.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(sub?.mainAgent, false);
    assert.equal(sub?.subAgent, true);
    assert.equal(sub?.subAgentName, 'researcher');
    assert.equal(sub?.teamName, 'root-thread');
    assert.equal(sub?.response?.body?.content?.[0]?.text, 'sub response answer');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge hydrates completed thread turns from JSON-RPC responses', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-history-response-'));
  const logFile = join(tmp, 'bridge-history-response.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    serverResponse(11, {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        preview: 'history root',
        source: 'appServer',
        turns: [{
          id: 'turn-history-root',
          status: 'completed',
          startedAt: 1783350000,
          completedAt: 1783350002,
          durationMs: 2000,
          items: [
            {
              id: 'hist-user',
              type: 'userMessage',
              clientId: 'u-history',
              content: [{ type: 'text', text: 'inspect history' }],
            },
            {
              id: 'hist-plan',
              type: 'plan',
              text: '- Read bridge\n- Add test',
            },
            {
              id: 'hist-msg',
              type: 'agentMessage',
              text: 'history answer',
            },
          ],
        }],
      },
      model: 'gpt-test',
      cwd: tmp,
    });

    serverResponse(12, {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
              agent_role: 'general',
              depth: 1,
            },
          },
        },
        turns: [{
          id: 'turn-history-sub',
          status: 'completed',
          startedAt: 1783350010,
          completedAt: 1783350011,
          durationMs: 1000,
          items: [
            {
              id: 'hist-sub-user',
              type: 'userMessage',
              clientId: 'u-history-sub',
              content: [{ type: 'text', text: 'sub inspect' }],
            },
            {
              id: 'hist-sub-msg',
              type: 'agentMessage',
              text: 'sub history answer',
            },
          ],
        }],
      },
      model: 'gpt-test',
      cwd: tmp,
    });

    // A repeated response with the same turn id must not duplicate history entries.
    serverResponse(13, {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        source: 'appServer',
        turns: [{
          id: 'turn-history-root',
          status: 'completed',
          items: [{ id: 'hist-msg-dup', type: 'agentMessage', text: 'duplicate' }],
        }],
      },
      model: 'gpt-test',
      cwd: tmp,
    });

    const entries = readEntries(logFile);
    const turns = entries.filter(entry => entry.method === 'POST');
    assert.equal(turns.length, 2);

    const root = turns.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(root?._codexHistorySource, true);
    assert.equal(root?.isStream, false);
    assert.equal(root?.mainAgent, true);
    assert.equal(root?.body?.input?.[0]?.content, 'inspect history');
    const rootPlan = root?.response?.body?.content?.find(block => block.type === 'tool_use' && block.name === 'update_plan');
    assert.equal(rootPlan?.input?.nonInteractive, true);
    assert.equal(rootPlan?.input?.plan, '- Read bridge\n- Add test');
    const rootText = root?.response?.body?.content?.find(block => block.type === 'text');
    assert.equal(rootText?.text, 'history answer');

    const sub = turns.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(sub?._codexHistorySource, true);
    assert.equal(sub?.mainAgent, false);
    assert.equal(sub?.subAgent, true);
    assert.equal(sub?.subAgentName, 'researcher');
    assert.equal(sub?.teamName, 'root-thread');
    assert.equal(sub?.response?.body?.content?.[0]?.text, 'sub history answer');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records tool-like items with root and subagent identity', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-tools-'));
  const logFile = join(tmp, 'bridge-tools.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', {
      thread: {
        id: 'root-thread',
        cwd: tmp,
      },
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'run pwd' }],
      clientUserMessageId: 'u-root-tool',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-root',
        type: 'commandExecution',
        command: 'pwd',
        aggregatedOutput: `${tmp}\n`,
        exitCode: 0,
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'root-msg',
        type: 'agentMessage',
        text: 'root command done',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-root-tool',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 40,
      },
    });

    server('thread/started', {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
            },
          },
        },
      },
    });
    server('turn/started', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub-tool',
        status: 'inProgress',
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-user',
        type: 'userMessage',
        content: [{ type: 'text', text: 'query mcp' }],
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'mcp-sub',
        type: 'mcpToolCall',
        server: 'docs',
        tool: 'search',
        arguments: { q: 'Codex' },
        result: {
          content: [{ type: 'text', text: 'found' }],
          structured_content: { count: 1 },
        },
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-msg',
        type: 'agentMessage',
        text: 'sub mcp done',
      },
    });
    server('turn/completed', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub-tool',
        threadId: 'sub-thread',
        status: 'completed',
        durationMs: 45,
      },
    });

    const entries = readEntries(logFile);
    const rootTool = entries.find(entry => entry.body?.tool_name === 'shell_command');
    assert.equal(rootTool?.method, 'TOOL');
    assert.equal(rootTool?.mainAgent, false);
    assert.equal(rootTool?.subAgent, false);
    assert.equal(rootTool?.body?.tool_input?.command, 'pwd');
    assert.equal(rootTool?.response?.body?.output?.exitCode, 0);

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.mainAgent, true);
    assert.equal(rootTurn?.body?.input?.[1]?.content?.[0]?.name, 'shell_command');
    assert.equal(rootTurn?.body?.input?.[2]?.content?.[0]?.type, 'tool_result');
    assert.equal(rootTurn?.response?.body?.content?.[0]?.text, 'root command done');

    const subTool = entries.find(entry => entry.body?.tool_name === 'docs.search');
    assert.equal(subTool?.method, 'TOOL');
    assert.equal(subTool?.mainAgent, false);
    assert.equal(subTool?.subAgent, true);
    assert.equal(subTool?.subAgentName, 'researcher');
    assert.equal(subTool?.teamName, 'root-thread');
    assert.deepEqual(subTool?.body?.tool_input, { q: 'Codex' });

    const subTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(subTurn?.mainAgent, false);
    assert.equal(subTurn?.subAgent, true);
    assert.equal(subTurn?.body?.input?.[1]?.content?.[0]?.name, 'docs.search');
    assert.equal(subTurn?.body?.input?.[2]?.content?.[0]?.type, 'tool_result');
    assert.equal(subTurn?.response?.body?.content?.[0]?.text, 'sub mcp done');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge folds v2 streaming deltas into completed tool entries', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-deltas-'));
  const logFile = join(tmp, 'bridge-deltas.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', {
      thread: {
        id: 'root-thread',
        cwd: tmp,
      },
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'edit and query' }],
      clientUserMessageId: 'u-deltas',
    });

    server('item/commandExecution/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'cmd-1',
      delta: 'line one\n',
    });
    server('item/commandExecution/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'cmd-1',
      delta: 'line two\n',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-1',
        type: 'commandExecution',
        command: 'printf lines',
        cwd: tmp,
        commandActions: [],
        aggregatedOutput: null,
        exitCode: 0,
        status: 'completed',
      },
    });
    server('command/exec/outputDelta', {
      processId: 'proc-1',
      stream: 'stdout',
      deltaBase64: Buffer.from('pty output\n', 'utf8').toString('base64'),
      capReached: false,
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-2',
        type: 'commandExecution',
        command: 'pty command',
        cwd: tmp,
        commandActions: [],
        processId: 'proc-1',
        aggregatedOutput: null,
        exitCode: 0,
        status: 'completed',
      },
    });

    const patchChanges = [{
      path: join(tmp, 'file.txt'),
      kind: { type: 'update', move_path: null },
      diff: '@@ -1 +1 @@\n-old\n+new\n',
    }];
    server('item/fileChange/patchUpdated', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'patch-1',
      changes: patchChanges,
    });
    server('item/fileChange/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'patch-1',
      delta: 'applied patch',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'patch-1',
        type: 'fileChange',
        changes: [],
        status: 'completed',
      },
    });

    server('item/mcpToolCall/progress', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'mcp-1',
      message: 'connecting',
    });
    server('item/mcpToolCall/progress', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'mcp-1',
      message: 'running query',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'mcp-1',
        type: 'mcpToolCall',
        server: 'docs',
        tool: 'lookup',
        arguments: { topic: 'Codex' },
        result: { content: [{ type: 'text', text: 'ok' }] },
        status: 'completed',
      },
    });
    server('turn/plan/updated', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      explanation: 'Implementation plan',
      plan: [
        { step: 'Patch bridge', status: 'completed' },
        { step: 'Run tests', status: 'inProgress' },
      ],
    });
    server('turn/diff/updated', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      diff: 'diff --git a/file.txt b/file.txt\n',
    });

    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'root-msg',
        type: 'agentMessage',
        text: 'done',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-deltas',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 50,
      },
    });

    const entries = readEntries(logFile);

    const command = entries.find(entry => entry.body?.tool_name === 'shell_command' && entry.body?.tool_input?.command === 'printf lines');
    assert.equal(command?.response?.body?.output?.output, 'line one\nline two\n');

    const ptyCommand = entries.find(entry => entry.body?.tool_name === 'shell_command' && entry.body?.tool_input?.command === 'pty command');
    assert.equal(ptyCommand?.response?.body?.output?.output, 'pty output\n');

    const patch = entries.find(entry => entry.body?.tool_name === 'apply_patch');
    assert.deepEqual(patch?.body?.tool_input?.changes, patchChanges);
    assert.deepEqual(patch?.response?.body?.output?.changes, patchChanges);
    assert.equal(patch?.response?.body?.output?.output, 'applied patch');

    const mcp = entries.find(entry => entry.body?.tool_name === 'docs.lookup');
    assert.deepEqual(mcp?.response?.body?.output?.progress, ['connecting', 'running query']);
    assert.deepEqual(mcp?.response?.body?.output?.result, { content: [{ type: 'text', text: 'ok' }] });

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.mainAgent, true);
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'done');
    const planTool = rootTurn?.response?.body?.content?.find(block => block.type === 'tool_use' && block.name === 'update_plan');
    assert.equal(planTool?.input?.codexTurnPlan, true);
    assert.match(planTool?.input?.plan, /Implementation plan/);
    assert.deepEqual(rootTurn?.response?.body?.turn_plan, {
      explanation: 'Implementation plan',
      plan: [
        { step: 'Patch bridge', status: 'completed' },
        { step: 'Run tests', status: 'inProgress' },
      ],
    });
    assert.equal(rootTurn?.response?.body?.turn_diff, 'diff --git a/file.txt b/file.txt\n');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge accepts Codex canonical snake_case item payloads', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-snake-items-'));
  const logFile = join(tmp, 'bridge-snake-items.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'exercise canonical sdk items' }],
      clientUserMessageId: 'u-snake-items',
    });

    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-snake',
        type: 'command_execution',
        command: 'printf hi',
        aggregated_output: 'hi\n',
        exit_code: 0,
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'patch-snake',
        type: 'file_change',
        changes: [{ path: 'src/file.js', kind: 'update' }],
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'mcp-snake',
        type: 'mcp_tool_call',
        server: 'docs',
        tool: 'lookup',
        arguments: { topic: 'Codex SDK' },
        result: {
          content: [{ type: 'text', text: 'ok' }],
          structured_content: { ok: true },
        },
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'web-snake',
        type: 'web_search',
        query: 'Codex SDK events',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'todo-snake',
        type: 'todo_list',
        items: [
          { text: 'Inspect canonical events', completed: true },
          { text: 'Patch bridge aliases', completed: false },
        ],
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'err-snake',
        type: 'error',
        message: 'non-fatal warning',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'msg-snake',
        type: 'agent_message',
        text: 'done with canonical items',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-snake',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 45,
      },
    });

    const entries = readEntries(logFile);
    const command = entries.find(entry => entry.body?.tool_name === 'shell_command' && entry.body?.tool_input?.command === 'printf hi');
    assert.equal(command?.response?.body?.output?.output, 'hi\n');
    assert.equal(command?.response?.body?.output?.exitCode, 0);

    const patch = entries.find(entry => entry.body?.tool_name === 'apply_patch');
    assert.deepEqual(patch?.body?.tool_input?.changes, [{ path: 'src/file.js', kind: 'update' }]);

    const mcp = entries.find(entry => entry.body?.tool_name === 'docs.lookup');
    assert.deepEqual(mcp?.body?.tool_input, { topic: 'Codex SDK' });
    assert.deepEqual(mcp?.response?.body?.output?.structured_content, { ok: true });

    const webSearch = entries.find(entry => entry.body?.tool_name === 'web_search');
    assert.deepEqual(webSearch?.body?.tool_input, { query: 'Codex SDK events' });

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    const text = rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text || '';
    assert.match(text, /\[x\] Inspect canonical events/);
    assert.match(text, /\[ \] Patch bridge aliases/);
    assert.match(text, /Error: non-fatal warning/);
    assert.match(text, /done with canonical items/);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge uses item/updated snapshots to complete sparse Codex items', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-item-updates-'));
  const logFile = join(tmp, 'bridge-item-updates.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'exercise item updates' }],
      clientUserMessageId: 'u-item-updates',
    });

    server('item/updated', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-updated',
        type: 'command_execution',
        command: 'printf updated',
        aggregated_output: 'updated\n',
        status: 'in_progress',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-updated',
        type: 'command_execution',
        status: 'completed',
        exit_code: 0,
      },
    });
    server('item/updated', {
      threadId: 'root-thread',
      item: {
        id: 'msg-updated-only',
        type: 'agent_message',
        text: 'answer from updated-only message',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-item-updates',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 35,
      },
    });

    const entries = readEntries(logFile);
    const command = entries.find(entry => entry.body?.tool_name === 'shell_command' && entry.body?.tool_input?.command === 'printf updated');
    assert.equal(command?.response?.body?.output?.output, 'updated\n');
    assert.equal(command?.response?.body?.output?.exitCode, 0);

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'answer from updated-only message');
    assert.equal(rootTurn?.body?.input?.some(msg =>
      msg.role === 'assistant'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_use' && block.name === 'shell_command' && block.id === 'cmd-updated')
    ), true);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge emits plan-only turns from v2 turn plan updates', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-plan-only-'));
  const logFile = join(tmp, 'bridge-plan-only.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'make a plan' }],
      clientUserMessageId: 'u-plan-only',
    });
    server('turn/plan/updated', {
      threadId: 'root-thread',
      turnId: 'turn-plan-only',
      explanation: null,
      plan: [
        { step: 'Inspect code', status: 'completed' },
        { step: 'Patch parser', status: 'pending' },
      ],
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-plan-only',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 20,
      },
    });

    const entries = readEntries(logFile);
    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.mainAgent, true);
    const planTool = rootTurn?.response?.body?.content?.find(block => block.type === 'tool_use' && block.name === 'update_plan');
    assert.equal(planTool?.input?.codexTurnPlan, true);
    assert.equal(planTool?.input?.nonInteractive, true);
    assert.match(planTool?.input?.plan, /Inspect code/);
    assert.deepEqual(rootTurn?.response?.body?.turn_plan?.plan, [
      { step: 'Inspect code', status: 'completed' },
      { step: 'Patch parser', status: 'pending' },
    ]);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge does not duplicate server userMessage mirror of turn/start input', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-user-dedupe-'));
  const logFile = join(tmp, 'bridge-user-dedupe.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'hi', text_elements: [] }],
      clientUserMessageId: null,
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-hi', status: 'inProgress' },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'server-user-hi',
        type: 'userMessage',
        clientId: null,
        content: [{ type: 'text', text: 'hi', text_elements: [] }],
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'answer',
        type: 'agentMessage',
        text: 'hello',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-hi',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 10,
      },
    });

    const entries = readEntries(logFile);
    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.deepEqual(rootTurn?.body?.input?.map(msg => ({ role: msg.role, content: msg.content })), [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
    ]);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge keeps Codex request_user_input transcript name', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-ask-'));
  const logFile = join(tmp, 'bridge-ask.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'ask me before continuing' }],
      clientUserMessageId: 'u-ask',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-ask', status: 'inProgress' },
    });

    serverRequest('ask-jsonrpc-1', 'item/tool/requestUserInput', {
      threadId: 'root-thread',
      turnId: 'turn-ask',
      itemId: 'ask-item-1',
      autoResolutionMs: 60000,
      questions: [{
        id: 'choice',
        header: 'Choice',
        question: 'Proceed?',
        options: [
          { label: 'Yes', description: 'Continue now.' },
          { label: 'No', description: 'Stop here.' },
        ],
      }],
    });
    clientResponse('ask-jsonrpc-1', {
      answers: {
        choice: { answers: ['Yes'] },
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'answer',
        type: 'agentMessage',
        text: 'continuing',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-ask',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 30,
      },
    });

    const entries = readEntries(logFile);
    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    const askMessage = rootTurn?.body?.input?.find(msg =>
      msg.role === 'assistant'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_use' && block.name === 'request_user_input')
    );
    const askTool = askMessage?.content?.find(block => block.type === 'tool_use' && block.name === 'request_user_input');
    assert.equal(askTool?.id, 'ask-item-1');
    assert.equal(askTool?.input?.codexRequestUserInput, true);
    assert.equal(askTool?.input?.questions?.[0]?.question, 'Proceed?');
    assert.equal(askTool?.input?.questions?.[0]?.options?.[0]?.label, 'Yes');

    const askResultMessage = rootTurn?.body?.input?.find(msg =>
      msg.role === 'user'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_result' && block.tool_use_id === 'ask-item-1')
    );
    const askResult = askResultMessage?.content?.find(block => block.type === 'tool_result');
    assert.equal(askResult?.content, '"Proceed?"="Yes"');
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'continuing');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge maps MCP elicitation requests to request_user_input transcript', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-mcp-ask-'));
  const logFile = join(tmp, 'bridge-mcp-ask.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'ask mcp server' }],
      clientUserMessageId: 'u-mcp-ask',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-mcp-ask', status: 'inProgress' },
    });

    serverRequest('mcp-ask-jsonrpc-1', 'mcpServer/elicitation/request', {
      threadId: 'root-thread',
      turnId: 'turn-mcp-ask',
      serverName: 'deploy',
      mode: 'form',
      message: 'Choose deployment options',
      requestedSchema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            title: 'Environment',
            description: 'Target environment',
            oneOf: [
              { const: 'staging', title: 'Staging' },
              { const: 'production', title: 'Production' },
            ],
          },
          features: {
            type: 'array',
            title: 'Features',
            items: {
              anyOf: [
                { const: 'logs', title: 'Logs' },
                { const: 'metrics', title: 'Metrics' },
              ],
            },
          },
        },
        required: ['environment'],
      },
      _meta: null,
    });
    clientResponse('mcp-ask-jsonrpc-1', {
      action: 'accept',
      content: {
        environment: 'staging',
        features: ['logs', 'metrics'],
      },
      _meta: null,
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'mcp-answer',
        type: 'agentMessage',
        text: 'mcp continuing',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-mcp-ask',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 40,
      },
    });

    const entries = readEntries(logFile);
    const requestEntry = entries.find(entry => entry.method === 'SERVER_REQUEST'
      && entry.body?.server_request_method === 'mcpServer/elicitation/request');
    assert.equal(requestEntry?.body?.server_request_kind, 'elicitation');
    const responseEntry = entries.find(entry => entry.method === 'SERVER_RESPONSE'
      && entry.body?.server_request_method === 'mcpServer/elicitation/request');
    assert.equal(responseEntry?.response?.body?.action, 'accept');

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    const askMessage = rootTurn?.body?.input?.find(msg =>
      msg.role === 'assistant'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_use' && block.name === 'request_user_input')
    );
    const askTool = askMessage?.content?.find(block => block.type === 'tool_use' && block.name === 'request_user_input');
    assert.equal(askTool?.id, 'mcp-elicitation-mcp-ask-jsonrpc-1');
    assert.equal(askTool?.input?.codexMcpElicitation, true);
    assert.equal(askTool?.input?.questions?.[0]?.header, 'deploy MCP');
    assert.equal(askTool?.input?.questions?.[0]?.options?.[0]?.label, 'Staging');
    assert.equal(askTool?.input?.questions?.[1]?.multiSelect, true);
    assert.equal(askTool?.input?.questions?.[1]?.options?.[1]?.label, 'Metrics');

    const askResultMessage = rootTurn?.body?.input?.find(msg =>
      msg.role === 'user'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_result' && block.tool_use_id === 'mcp-elicitation-mcp-ask-jsonrpc-1')
    );
    const askResult = askResultMessage?.content?.find(block => block.type === 'tool_result');
    assert.ok(askResult?.content?.includes('Environment\nTarget environment"="Staging"'));
    assert.ok(askResult?.content?.includes('Features"="Logs, Metrics"'));
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'mcp continuing');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records turn/steer input inside the active Codex turn', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-turn-steer-'));
  const logFile = join(tmp, 'bridge-turn-steer.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'initial prompt' }],
      clientUserMessageId: 'u-steer-start',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-steer', status: 'inProgress' },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'partial-answer',
        type: 'agent_message',
        text: 'partial before steer',
      },
    });
    client('turn/steer', {
      threadId: 'root-thread',
      expectedTurnId: 'turn-steer',
      input: [{ type: 'text', text: 'extra steer context' }],
      clientUserMessageId: 'u-steer-extra',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'final-answer',
        type: 'agent_message',
        text: 'final after steer',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-steer',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 40,
      },
    });

    const entries = readEntries(logFile);
    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.body?.metadata?.turn_id, 'turn-steer');
    assert.equal(rootTurn?.body?.input?.[0]?.role, 'user');
    assert.equal(rootTurn?.body?.input?.[0]?.content, 'initial prompt');
    assert.equal(rootTurn?.body?.input?.[1]?.role, 'assistant');
    assert.equal(rootTurn?.body?.input?.[1]?.content?.[0]?.text, 'partial before steer');
    assert.equal(rootTurn?.body?.input?.[2]?.role, 'user');
    assert.equal(rootTurn?.body?.input?.[2]?.content, 'extra steer context');
    assert.equal(rootTurn?.response?.body?.content?.[0]?.text, 'final after steer');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records Codex approval server requests and responses', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-approval-request-'));
  const logFile = join(tmp, 'bridge-approval-request.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'run command that needs approval' }],
      clientUserMessageId: 'u-approval',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-approval', status: 'inProgress' },
    });

    serverRequest('approval-jsonrpc-1', 'item/commandExecution/requestApproval', {
      threadId: 'root-thread',
      turnId: 'turn-approval',
      itemId: 'cmd-approval',
      startedAtMs: 123456,
      environmentId: 'env-1',
      approvalId: null,
      command: 'npm test',
      cwd: tmp,
      reason: 'Command needs approval.',
      commandActions: [{ action: 'run', command: 'npm test' }],
    });
    clientResponse('approval-jsonrpc-1', { decision: 'approved' });
    server('serverRequest/resolved', {
      threadId: 'root-thread',
      requestId: 'approval-jsonrpc-1',
    });
    server('hook/started', {
      threadId: 'root-thread',
      turnId: 'turn-approval',
      run: {
        id: 'hook-1',
        eventName: 'permissionRequest',
        handlerType: 'command',
        executionMode: 'foreground',
        scope: 'user',
        sourcePath: join(tmp, 'hook.sh'),
        source: { type: 'config' },
        displayOrder: 0,
        status: 'running',
        statusMessage: null,
        startedAt: 123456,
        completedAt: null,
        durationMs: null,
        entries: [],
      },
    });
    server('hook/completed', {
      threadId: 'root-thread',
      turnId: 'turn-approval',
      run: {
        id: 'hook-1',
        eventName: 'permissionRequest',
        handlerType: 'command',
        executionMode: 'foreground',
        scope: 'user',
        sourcePath: join(tmp, 'hook.sh'),
        source: { type: 'config' },
        displayOrder: 0,
        status: 'completed',
        statusMessage: null,
        startedAt: 123456,
        completedAt: 123500,
        durationMs: 44,
        entries: [{ stream: 'stdout', text: 'ok' }],
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'answer',
        type: 'agent_message',
        text: 'approval handled',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-approval',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 30,
      },
    });

    const entries = readEntries(logFile);
    const approvalRequest = entries.find(entry => entry.method === 'APPROVAL_REQUEST');
    assert.equal(approvalRequest?.body?.server_request_method, 'item/commandExecution/requestApproval');
    assert.equal(approvalRequest?.body?.server_request_id, 'approval-jsonrpc-1');
    assert.equal(approvalRequest?.body?.server_request_kind, 'approval');
    assert.equal(approvalRequest?.body?.tool_name, 'shell_command');
    assert.equal(approvalRequest?.body?.tool_input?.command, 'npm test');
    assert.equal(approvalRequest?.body?._threadId, 'root-thread');
    assert.equal(approvalRequest?.body?._turnId, 'turn-approval');
    assert.equal(approvalRequest?.response, null);

    const approvalResponse = entries.find(entry => entry.method === 'SERVER_RESPONSE');
    assert.equal(approvalResponse?.body?.server_request_method, 'item/commandExecution/requestApproval');
    assert.equal(approvalResponse?.body?.server_request_id, 'approval-jsonrpc-1');
    assert.equal(approvalResponse?.body?.tool_name, 'shell_command');
    assert.deepEqual(approvalResponse?.response?.body, { decision: 'approved' });

    const resolved = entries.find(entry => entry.body?.event_name === 'serverRequest.resolved');
    assert.equal(resolved?.response?.body?.requestId, 'approval-jsonrpc-1');
    assert.equal(resolved?.response?.body?.pendingMethod, 'item/commandExecution/requestApproval');
    assert.equal(resolved?.response?.body?.pendingName, 'shell_command');

    // hook/started and hook/completed are intentionally suppressed from the log
    const hookCompleted = entries.find(entry => entry.body?.event_name === 'hook.completed');
    assert.equal(hookCompleted, undefined);

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.response?.body?.content?.[0]?.text, 'approval handled');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records v2 process, model, safety, and warning events', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-events-'));
  const logFile = join(tmp, 'bridge-events.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-original',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-original',
      cwd: tmp,
      input: [{ type: 'text', text: 'run a process and answer' }],
      clientUserMessageId: 'u-events',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-events', status: 'inProgress' },
    });

    server('process/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      processHandle: 'proc-a',
      stream: 'stdout',
      deltaBase64: Buffer.from('hello stdout\n', 'utf8').toString('base64'),
      capReached: false,
    });
    server('process/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      processHandle: 'proc-a',
      stream: 'stderr',
      deltaBase64: Buffer.from('warn stderr\n', 'utf8').toString('base64'),
      capReached: true,
    });
    server('process/exited', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      processHandle: 'proc-a',
      exitCode: 0,
      stdout: '',
      stderr: '',
      stdoutCapReached: false,
      stderrCapReached: false,
    });
    server('model/rerouted', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      fromModel: 'gpt-original',
      toModel: 'gpt-rerouted',
      reason: 'highRiskCyberActivity',
    });
    server('turn/moderationMetadata', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      metadata: { categories: ['test-category'] },
    });
    server('model/verification', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      verifications: ['trustedAccessForCyber'],
    });
    server('model/safetyBuffering/updated', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      model: 'gpt-rerouted',
      fasterModel: null,
      showBufferingUi: true,
      reasons: ['policy-check'],
      useCases: ['code'],
    });
    server('warning', {
      threadId: 'root-thread',
      message: 'Careful with this action',
    });
    server('item/autoApprovalReview/started', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      reviewId: 'review-1',
      targetItemId: 'cmd-1',
      startedAtMs: 1000,
      action: { type: 'command' },
      review: { status: 'reviewing' },
    });
    server('item/autoApprovalReview/completed', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      reviewId: 'review-1',
      targetItemId: 'cmd-1',
      startedAtMs: 1000,
      completedAtMs: 1100,
      decisionSource: 'agent',
      action: { type: 'command' },
      review: { status: 'approved' },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'answer',
        type: 'agentMessage',
        text: 'eventful answer',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-events',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 60,
      },
    });

    const entries = readEntries(logFile);

    const processEntry = entries.find(entry => entry.method === 'PROCESS');
    assert.equal(processEntry?.url, 'codex://process/proc-a');
    assert.equal(processEntry?.response?.body?.stdout, 'hello stdout\n');
    assert.equal(processEntry?.response?.body?.stderr, 'warn stderr\n');
    assert.equal(processEntry?.response?.body?.stderrCapReached, true);

    const rerouteEntry = entries.find(entry => entry.body?.event_name === 'model.rerouted');
    assert.equal(rerouteEntry?.response?.body?.toModel, 'gpt-rerouted');

    const warningEntry = entries.find(entry => entry.body?.event_name === 'warning');
    assert.equal(warningEntry?.response?.status, 299);
    assert.equal(warningEntry?.response?.body?.message, 'Careful with this action');

    const approvalEntry = entries.find(entry => entry.body?.event_name === 'item.autoApprovalReview.completed');
    assert.equal(approvalEntry?.response?.body?.decisionSource, 'agent');

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.response?.body?.model, 'gpt-rerouted');
    assert.deepEqual(rootTurn?.response?.body?.moderation_metadata, { categories: ['test-category'] });
    assert.equal(rootTurn?.response?.body?.model_reroutes?.[0]?.reason, 'highRiskCyberActivity');
    assert.deepEqual(rootTurn?.response?.body?.model_verifications?.[0]?.verifications, ['trustedAccessForCyber']);
    assert.equal(rootTurn?.response?.body?.safety_buffering?.showBufferingUi, true);
    assert.equal(rootTurn?.response?.body?.warnings?.[0]?.message, 'Careful with this action');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});
