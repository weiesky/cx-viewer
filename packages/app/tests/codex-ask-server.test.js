import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

const temp = mkdtempSync(join(tmpdir(), 'cxv-codex-ask-server-'));
process.env.CXV_LOG_DIR = temp;
process.env.CXV_PROJECT_DIR = temp;
process.env.CXV_START_PORT = '19920';
process.env.CXV_MAX_PORT = '19929';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';

let server;
let writePreferences;
let port;
let ws;
const messages = [];
const waiters = [];
const calls = { resolve: [], cancel: [], release: [] };

function receive(type, timeoutMs = 3000) {
  const found = messages.findIndex(message => message.type === type);
  if (found >= 0) return Promise.resolve(messages.splice(found, 1)[0]);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), timeoutMs);
    waiters.push({
      type,
      resolve(message) {
        clearTimeout(timer);
        resolve(message);
      },
    });
  });
}

function pendingAsks() {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: '/api/pending-asks' }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(JSON.parse(body).pendingAsks));
    });
    req.on('error', reject);
    req.end();
  });
}

function ask(id, overrides = {}) {
  return {
    uiId: id,
    questions: [{
      id: 'choice',
      header: 'Choice',
      question: 'Proceed?',
      options: [{ label: 'Yes', description: 'Continue.' }, { label: 'No', description: 'Stop.' }],
    }],
    threadId: 'thread-1',
    turnId: 'turn-1',
    itemId: 'item-1',
    createdAt: Date.now(),
    autoResolutionMs: 60000,
    ...overrides,
  };
}

before(async () => {
  server = await import('../server.js');
  ({ writePreferences } = await import('../lib/preferences.js'));
  await server.startViewer();
  port = server.getPort();
  server.setCodexRequestUserInputBridge({
    resolve(id, answers) { calls.resolve.push({ id, answers }); return true; },
    cancel(id) { calls.cancel.push(id); return true; },
    releaseToTui(id) { calls.release.push(id); return true; },
  });
  ws = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal`, {
    headers: { Origin: `http://127.0.0.1:${port}` },
  });
  ws.on('message', raw => {
    const message = JSON.parse(raw.toString());
    const index = waiters.findIndex(waiter => waiter.type === message.type);
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
    else messages.push(message);
  });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
});

after(async () => {
  try { ws?.close(); } catch {}
  server?.setCodexRequestUserInputBridge(null);
  await server?.stopViewer();
  rmSync(temp, { recursive: true, force: true });
});

test('oversized permission hook bodies never register approvals or break subsequent HTTP requests', async () => {
  const post = (chunks, declaredLength) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: '/api/perm-hook', method: 'POST',
      headers: { 'content-type': 'application/json', ...(declaredLength ? { 'content-length': declaredLength } : {}) } }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('permission body rejection must not wait for an approval')));
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
  const prefix = '{"toolName":"shell_command","forceManual":true,"input":{"command":"';
  const suffix = '"}}';
  const ascii = Buffer.from('x'.repeat(600000));
  const unicode = Buffer.from('字'.repeat(400000));
  const cases = [
    { chunks: [prefix, ascii, ascii, suffix] },
    { chunks: [prefix, ascii, ascii, suffix], length: Buffer.byteLength(prefix + suffix) + ascii.length * 2 },
    { chunks: [prefix, unicode, suffix] },
  ];
  for (const { chunks, length } of cases) {
    const result = await post(chunks, length);
    assert.equal(result.status, 413);
    assert.equal(result.body.error, 'Request body too large');
    assert.deepEqual(await pendingAsks(), [], 'the same server remains available after rejection');
    assert.equal(messages.some(message => message.type === 'perm-hook-pending'), false);
  }
  assert.equal((await post([prefix, Buffer.from([0xff]), suffix])).status, 400);
  assert.equal((await post(['{'])).status, 400);
  assert.deepEqual(await pendingAsks(), []);
  const ordinary = post([JSON.stringify({ toolName: 'shell_command', forceManual: true, input: { command: 'fixture only' } })]);
  const pending = await receive('perm-hook-pending');
  assert.equal(pending.input.command, 'fixture only');
  ws.send(JSON.stringify({ type: 'perm-hook-answer', id: pending.id, decision: 'deny' }));
  assert.deepEqual(await ordinary, { status: 200, body: { decision: 'deny' } });
});

test('browser WebSocket answers Codex app-server asks with the structured id map', async () => {
  assert.equal(server.offerCodexRequestUserInput(ask('ask-answer')), true);
  const pending = await receive('ask-hook-pending');
  assert.equal(pending.id, 'ask-answer');
  assert.equal(pending.source, 'codex-app-server');
  assert.deepEqual((await pendingAsks()).map(item => item.id), ['ask-answer']);

  ws.send(JSON.stringify({
    type: 'ask-hook-answer',
    id: 'ask-answer',
    answers: { 'Proceed?': 'Yes' },
    codexAnswers: { choice: { answers: ['Yes'] } },
  }));
  const resolved = await receive('ask-hook-resolved');
  assert.equal(resolved.id, 'ask-answer');
  assert.equal(resolved.itemId, 'item-1');
  assert.deepEqual(resolved.answers, { 'Proceed?': 'Yes' });
  const deadline = Date.now() + 3000;
  while (calls.resolve.length === 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.deepEqual(calls.resolve, [{
    id: 'ask-answer',
    answers: { choice: { answers: ['Yes'] } },
  }]);
  assert.deepEqual(await pendingAsks(), []);
});

test('automatic timeout selects the recommended option and returns it to the card', async () => {
  const callCount = calls.resolve.length;
  assert.equal(server.offerCodexRequestUserInput(ask('ask-timeout', { autoResolutionMs: 30 })), true);
  await receive('ask-hook-pending');
  const timedOut = await receive('ask-hook-timeout');
  assert.equal(timedOut.id, 'ask-timeout');
  assert.equal(timedOut.itemId, 'item-1');
  assert.deepEqual(timedOut.answers, { 'Proceed?': 'Yes' });
  assert.deepEqual(timedOut.codexAnswers, { choice: { answers: ['Yes'] } });
  assert.deepEqual(calls.resolve[callCount], {
    id: 'ask-timeout',
    answers: { choice: { answers: ['Yes'] } },
  });
  assert.deepEqual(await pendingAsks(), []);
});

test('browser cancellation resolves the exact pending Codex request', async () => {
  assert.equal(server.offerCodexRequestUserInput(ask('ask-cancel')), true);
  await receive('ask-hook-pending');
  ws.send(JSON.stringify({ type: 'ask-cancel', id: 'ask-cancel', reason: 'User aborted' }));
  assert.equal((await receive('ask-hook-cancelled')).id, 'ask-cancel');
  assert.deepEqual(calls.cancel, ['ask-cancel']);
  assert.deepEqual(await pendingAsks(), []);
});

test('last GUI disconnect releases a claimed request back to the Codex TUI', async () => {
  assert.equal(server.offerCodexRequestUserInput(ask('ask-disconnect')), true);
  await receive('ask-hook-pending');
  const closed = new Promise(resolve => ws.once('close', resolve));
  ws.close();
  await closed;

  const deadline = Date.now() + 3000;
  while (!calls.release.includes('ask-disconnect') && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.deepEqual(calls.release, ['ask-disconnect']);
  assert.deepEqual(await pendingAsks(), []);
});

test('opt-in PTY hosting answers offline, cancellation stays manual and native fallback remains authoritative', async () => {
  const callCount = calls.resolve.length;
  assert.equal(server.offerCodexRequestUserInput(ask('offline-off')), false);
  writePreferences({ approvalModal: { askAutoAnswerMinutes: 0 } });
  const questions = [{ id: 'choice', question: 'Choose?', options: [{ label: 'First' }, { label: 'Second (Recommended)' }] }];
  assert.equal(server.offerCodexRequestUserInput(ask('offline-hosted', { autoResolutionMs: null, questions })), true);
  assert.deepEqual(calls.resolve[callCount], { id: 'offline-hosted', answers: { choice: { answers: ['Second (Recommended)'] } } });
  assert.deepEqual(await pendingAsks(), []);
  assert.equal(server.offerCodexRequestUserInput(ask('offline-free', { questions: [{ id: 'free', question: 'Enter' }] })), false);
  writePreferences({ approvalModal: { askAutoAnswerMinutes: 10 } });
  messages.length = 0;
  ws = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal`, { headers: { Origin: `http://127.0.0.1:${port}` } });
  ws.on('message', raw => {
    const message = JSON.parse(raw.toString()), index = waiters.findIndex(waiter => waiter.type === message.type);
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message); else messages.push(message);
  });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  assert.equal(server.offerCodexRequestUserInput(ask('cancel-hosting', { autoResolutionMs: null, questions })), true);
  const pending = await receive('ask-hook-pending');
  assert.equal(pending.autoAnswerSeconds, 600);
  ws.send(JSON.stringify({ type: 'ask-auto-cancel', id: pending.id }));
  assert.equal((await receive('ask-auto-cancel')).id, pending.id);
  const replay = (await pendingAsks()).find(row => row.id === pending.id);
  assert.equal(replay.autoAnswerAt, null); assert.equal(replay.autoCancelled, true);
  assert.equal(calls.resolve.length, callCount + 1, 'cancelling hosting does not answer the question');
  ws.send(JSON.stringify({ type: 'ask-hook-answer', id: pending.id, codexAnswers: { choice: { answers: ['First'] } } }));
  await receive('ask-hook-resolved');
  assert.deepEqual(calls.resolve.at(-1).answers, { choice: { answers: ['First'] } });
  assert.equal(server.offerCodexRequestUserInput(ask('native-deadline', { autoResolutionMs: 30, questions })), true);
  await receive('ask-hook-pending'); await receive('ask-hook-timeout');
  assert.deepEqual(calls.resolve.at(-1).answers, { choice: { answers: ['First'] } }, 'explicit native autoResolutionMs is preserved');
  assert.equal(server.offerCodexRequestUserInput(ask('disconnect-hosting', { autoResolutionMs: null, questions })), true);
  await receive('ask-hook-pending');
  const closed = new Promise(resolve => ws.once('close', resolve)); ws.close(); await closed;
  assert.ok((await pendingAsks()).some(row => row.id === 'disconnect-hosting'), 'hosting survives last GUI disconnect');
  assert.equal(calls.release.includes('disconnect-hosting'), false);
  server.clearCodexRequestUserInput({ uiId: 'disconnect-hosting' });
  writePreferences({});
});
