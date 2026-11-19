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
