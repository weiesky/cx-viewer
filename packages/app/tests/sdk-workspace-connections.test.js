import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { appendFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-connections-'));
const a = join(root, 'a', 'same'), b = join(root, 'b', 'same');
mkdirSync(a, { recursive: true }); mkdirSync(b, { recursive: true });
Object.assign(process.env, {
  HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROJECT_DIR: a, CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1',
  CXV_START_PORT: '20030', CXV_MAX_PORT: '20039',
});
let server, sdk, scratch, port, infoA, infoB;
const clients = [];
const scratchSpawns = [];

function scratchPty() {
  return { spawn(shell, args, options) {
    const proc = { cwd: options.cwd, killed: false, writes: [],
      onData(fn) { this.data = fn; }, onExit(fn) { this.exit = fn; },
      write(value) { this.writes.push(value); }, resize() {}, kill() { this.killed = true; },
    };
    scratchSpawns.push(proc); return proc;
  } };
}

async function http(path, body) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' } }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', chunk => text += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text,
        json: () => JSON.parse(text), frames: () => text.trim().split('\n').map(JSON.parse) }));
    });
    req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

function inbox() {
  const messages = [], waiters = [];
  return { messages,
    push(message) {
      const index = waiters.findIndex(waiter => waiter.type === message.type);
      if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
      else messages.push(message);
    },
    receive(type) {
      const index = messages.findIndex(message => message.type === type);
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { type, resolve(message) { clearTimeout(timer); resolve(message); } };
        const timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`timed out waiting for ${type}`));
        }, 5000);
        waiters.push(waiter);
      });
    },
  };
}

async function openWs(instance, scratchId) {
  const box = inbox();
  const query = new URLSearchParams();
  if (instance !== undefined) query.set('instance', instance);
  if (scratchId) query.set('id', scratchId);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal${scratchId ? '-scratch' : ''}?${query}`, {
    headers: { Origin: `http://127.0.0.1:${port}` },
  });
  ws.on('message', raw => box.push(JSON.parse(raw)));
  ws.on('error', () => {});
  clients.push({ close: () => ws.terminate() });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  return { ...box, ws, send: message => ws.send(JSON.stringify(message)) };
}

function startSse(path) {
  const box = inbox();
  let buffer = '';
  const req = request({ hostname: '127.0.0.1', port, path });
  const response = new Promise((resolve, reject) => {
    req.on('response', res => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`SSE status ${res.statusCode}`)); return; }
      res.setEncoding('utf8');
      res.on('data', chunk => {
        buffer += chunk;
        let index;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
          const type = frame.match(/^event: (.+)$/m)?.[1];
          const data = frame.match(/^data: (.+)$/m)?.[1];
          if (type && data) box.push({ type, data: JSON.parse(data) });
        }
      });
      resolve();
    });
    req.on('error', reject);
  });
  clients.push({ close: () => req.destroy() });
  req.end();
  return { ...box, ready: response, close: () => req.destroy() };
}

async function openSse(instance) {
  const client = startSse(`/events?instance=${encodeURIComponent(instance)}`);
  await client.ready;
  return client;
}

async function ready(cwd) {
  const deadline = Date.now() + 5000;
  while (!existsSync(join(cwd, 'ready'))) {
    assert.ok(Date.now() < deadline, 'SDK child must start');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

before(async () => {
  const codexPath = join(root, 'fake-codex.mjs');
  writeFileSync(codexPath, `#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
let input = ''; for await (const chunk of process.stdin) input += chunk;
const cwd = process.env.CXV_PROJECT_DIR;
writeFileSync(join(cwd, 'ready'), input);
while (!existsSync(join(cwd, 'release'))) await new Promise(resolve => setTimeout(resolve, 10));
const resumeIndex = process.argv.indexOf('resume');
const threadId = resumeIndex >= 0 ? process.argv[resumeIndex + 1]
  : existsSync(join(cwd, 'next-thread')) ? readFileSync(join(cwd, 'next-thread'), 'utf8')
  : 'thread_' + Buffer.from(cwd).toString('hex');
for (const event of [
 { type: 'thread.started', thread_id: threadId },
 { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: input } },
 { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } },
]) process.stdout.write(JSON.stringify(event) + '\\n');
`);
  chmodSync(codexPath, 0o755);
  server = await import('../server.js');
  sdk = await import('../lib/sdk-manager.js');
  scratch = await import('../scratch-pty-manager.js');
  scratch._setScratchPtyLoaderForTests(async () => scratchPty());
  (await import('../interceptor.js')).initForWorkspace(a);
  const options = { codexPath, onEntry: server.pushSdkEntry,
    onStreamingStatus: server.setSdkStreamingState, onStreamProgress: server.sendSdkStreamProgress,
    broadcastWs: server.broadcastWsMessage };
  sdk.setSdkLaunchConfig(options);
  infoA = sdk.initSdkSession(a, 'same', options);
  process.env.CXV_PROJECT_DIR = b;
  await server.startViewer(); port = server.getPort();
  const launched = await http('/api/workspaces/launch', { path: b });
  assert.equal(launched.status, 200, launched.text);
  infoB = launched.json();
});

after(async () => {
  for (const client of clients) client.close();
  sdk?.stopSession();
  sdk?.setSdkLaunchConfig(null);
  await server?.stopViewer();
  scratch?._resetScratchPtysForTests();
  rmSync(root, { recursive: true, force: true });
});

test('SDK WebSocket controls and SSE replay stay bound to each browser workspace', { timeout: 20000 }, async () => {
  const wa = await openWs(infoA.instanceKey), wb = await openWs(infoB.instanceKey), legacy = await openWs();
  assert.equal((await wa.receive('sdk-workspace')).instanceKey, infoA.instanceKey);
  assert.equal((await wb.receive('sdk-workspace')).instanceKey, infoB.instanceKey);
  assert.equal((await legacy.receive('sdk-workspace')).instanceKey, infoA.instanceKey);
  assert.equal((await http('/api/workspaces')).json().currentInstanceKey, infoA.instanceKey);
  assert.equal((await http(`/api/workspaces?instance=${infoB.instanceKey}`)).json().currentInstanceKey, infoB.instanceKey);
  assert.equal((await http('/api/project-name')).json().instanceKey, infoA.instanceKey);
  const sa = await openSse(infoA.instanceKey), sb = await openSse(infoB.instanceKey);
  await sa.receive('sdk_workspace'); await sb.receive('sdk_workspace');
  assert.equal((await sa.receive('streaming_status')).data.active, false);
  assert.equal((await sb.receive('streaming_status')).data.active, false);
  wa.send({ type: 'sdk-user-message', text: 'wrong', instanceKey: infoB.instanceKey });
  assert.equal((await wa.receive('sdk-error')).code, 'SDK_SCOPE_MISMATCH');
  assert.equal(existsSync(join(a, 'ready')), false);
  assert.equal(existsSync(join(b, 'ready')), false);
  wa.send({ type: 'sdk-user-message', text: 'hold A', requestId: 'first-A' });
  assert.deepEqual(await wa.receive('sdk-message-accepted'), {
    type: 'sdk-message-accepted', requestId: 'first-A', queued: false, queueId: null,
    instanceKey: infoA.instanceKey, cwd: a,
  });
  wb.send({ type: 'sdk-user-message', text: 'hold B' });
  await Promise.all([ready(a), ready(b)]);
  assert.ok((await http('/api/workspaces')).json().sessions.every(session => session.busy));
  assert.equal((await sa.receive('streaming_status')).data.instanceKey, infoA.instanceKey);
  assert.equal((await sb.receive('streaming_status')).data.instanceKey, infoB.instanceKey);
  const replay = await openSse(infoA.instanceKey);
  await replay.receive('sdk_workspace');
  const snapshot = (await replay.receive('streaming_status')).data;
  assert.equal(snapshot.instanceKey, infoA.instanceKey);
  assert.equal(snapshot.active, true);
  wa.send({ type: 'sdk-user-message', text: 'queued only A', requestId: 'queued-A' });
  const accepted = await wa.receive('sdk-message-accepted');
  assert.equal(accepted.requestId, 'queued-A'); assert.equal(accepted.queued, true);
  let queuedA;
  do { queuedA = await wa.receive('queue-state'); } while (!queuedA.items.length);
  assert.equal(queuedA.instanceKey, infoA.instanceKey);
  assert.equal(queuedA.items[0].text, 'queued only A');
  assert.equal(queuedA.items[0].id, accepted.queueId);
  assert.equal(queuedA.items[0].requestId, 'queued-A');
  const reconnected = await openWs(infoA.instanceKey);
  const replayedQueue = await reconnected.receive('queue-state');
  assert.deepEqual(replayedQueue.items, queuedA.items);
  assert.equal(replayedQueue.activeInput.text, 'hold A');
  assert.equal(replayedQueue.activeInput.requestId, 'first-A');
  assert.equal(replayedQueue.epoch, queuedA.epoch);
  assert.ok(!wb.messages.some(message => message.type === 'queue-state' && message.activeInput?.text === 'hold A'));
  assert.ok(!wb.messages.some(message => message.type === 'queue-state' && message.items.length));
  assert.ok(!legacy.messages.some(message => message.type === 'sdk-message-accepted'), 'receipts only reach the sender');
  wb.send({ type: 'sdk-queue-remove', id: accepted.queueId });
  assert.equal((await wb.receive('sdk-error')).code, 'SDK_QUEUE_NOT_FOUND');
  assert.equal(sdk.getSdkQueueState({ cwd: a }).items.length, 1);
  wa.send({ type: 'sdk-queue-remove', id: accepted.queueId });
  assert.deepEqual((await reconnected.receive('queue-state')).items, []);
  for (let index = 0; index < 50; index++) await sdk.sendUserMessage(`fill ${index}`, { cwd: a });
  wa.send({ type: 'sdk-user-message', text: 'must restore this draft', requestId: 'overflow-A' });
  const rejected = await wa.receive('sdk-error');
  assert.equal(rejected.code, 'SDK_QUEUE_FULL'); assert.equal(rejected.requestId, 'overflow-A');
  assert.equal(sdk.getSdkQueueState({ cwd: a }).items.length, 50);
  wa.send({ type: 'sdk-user-message', text: 'invalid id', requestId: [] });
  const invalid = await wa.receive('sdk-error');
  assert.equal(invalid.code, 'SDK_INVALID_REQUEST_ID'); assert.equal(invalid.requestId, undefined);
  server.sendSdkStreamProgress({ instanceKey: infoB.instanceKey, cwd: a, content: 'conflicting identity' });
  server.sendSdkStreamProgress({ instanceKey: infoA.instanceKey, cwd: a, content: 'only A' });
  server.sendSdkStreamProgress({ instanceKey: infoB.instanceKey, cwd: b, content: 'only B' });
  assert.equal((await sa.receive('stream-progress')).data.content, 'only A');
  assert.equal((await sb.receive('stream-progress')).data.content, 'only B');
  server.broadcastWsMessage({ type: 'sdk-notice', instanceKey: infoA.instanceKey, marker: 'A' });
  server.broadcastWsMessage({ type: 'sdk-notice', instanceKey: infoB.instanceKey, marker: 'B' });
  assert.equal((await wa.receive('sdk-notice')).marker, 'A');
  assert.equal((await legacy.receive('sdk-notice')).marker, 'A');
  assert.equal((await wb.receive('sdk-notice')).marker, 'B');
  wa.send({ type: 'image-upload-notify', path: '/tmp/cx-viewer-uploads/scoped.png' });
  assert.equal((await legacy.receive('image-upload-notify')).instanceKey, infoA.instanceKey);
  wa.send({ type: 'image-remove-notify', path: '/tmp/cx-viewer-uploads/scoped.png' });
  assert.equal((await legacy.receive('image-remove-notify')).instanceKey, infoA.instanceKey);
  server.broadcastWsMessage({ type: 'sdk-notice', instanceKey: infoB.instanceKey, marker: 'after images' });
  await wb.receive('sdk-notice');
  assert.ok(!wb.messages.some(message => message.type.startsWith('image-')));
  wa.send({ type: 'image-upload-notify', path: '/tmp/cx-viewer-uploads/scoped.png', instanceKey: infoB.instanceKey });
  assert.equal((await wa.receive('sdk-error')).code, 'SDK_SCOPE_MISMATCH');
  sdk.attachSdkSession({ cwd: b });
  legacy.send({ type: 'sdk-interrupt' });
  const idleA = (await sa.receive('streaming_status')).data;
  assert.equal(idleA.instanceKey, infoA.instanceKey);
  assert.equal(idleA.active, false);
  assert.equal(sdk.getSdkStreamingState({ cwd: b }).active, true, 'A interruption cannot abort B');
  const closed = new Promise(resolve => wa.ws.once('close', resolve));
  assert.equal((await http('/api/workspaces/close', { instanceKey: infoA.instanceKey })).status, 200);
  const stopped = (await sa.receive('workspace_stopped')).data;
  assert.equal(stopped.instanceKey, infoA.instanceKey);
  assert.equal(stopped.reattachedTo, infoB.instanceKey);
  assert.equal((await wa.receive('sdk-workspace-closed')).reattachedTo, infoB.instanceKey);
  await closed;
  await assert.rejects(sdk.sendUserMessage('after close', { instanceKey: infoA.instanceKey }), { code: 'SDK_SESSION_NOT_FOUND' });
  writeFileSync(join(b, 'release'), 'go');
  assert.equal((await sb.receive('streaming_status')).data.active, false);
  for (const channel of [sa, replay]) {
    assert.ok(channel.messages.filter(message => message.data?.instanceKey).every(message => message.data.instanceKey === infoA.instanceKey));
  }
  assert.ok(sb.messages.filter(message => message.data?.instanceKey).every(message => message.data.instanceKey === infoB.instanceKey));
  assert.ok(!wa.messages.some(message => message.marker === 'B'));
  assert.ok(!wb.messages.some(message => message.marker === 'A'));
});

test('unknown, empty and closed default SDK connection anchors cannot fall back to another workspace', async () => {
  for (const instance of ['stale-instance', '', undefined]) {
    await assert.rejects(openWs(instance));
    await assert.rejects(openWs(instance, 'shared'));
  }
  const status = await new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: '/events?instance=stale-instance' }, res => {
      res.resume(); resolve(res.statusCode);
    });
    req.on('error', reject); req.end();
  });
  assert.equal(status, 404);
  const mode = await http(`/api/cli-mode?instance=${infoA.instanceKey}`);
  assert.equal(mode.status, 200);
  assert.equal(mode.json().sdkMode, true);
  assert.equal(mode.json().workspaceMode, true);
  assert.equal((await http('/api/workspaces?instance=stale')).json().currentInstanceKey, null);
  assert.equal(sdk.listSdkSessions().length, 1);
});

test('HTTP launches reuse SDK sessions and scope file, search, Git, snapshot and log operations by instance', { timeout: 15000 }, async () => {
  const relaunched = await http('/api/workspaces/launch', { path: a });
  assert.equal(relaunched.status, 200, relaunched.text);
  const reopenedA = relaunched.json();
  assert.equal(reopenedA.reused, false);
  assert.equal(reopenedA.instanceKey, infoA.instanceKey);
  const reused = await http('/api/workspaces/launch', { path: b });
  assert.equal(reused.json().reused, true);
  assert.equal(reused.json().instanceKey, infoB.instanceKey);
  assert.equal((await http('/api/workspaces/launch', { path: a, extraArgs: ['--cd', b] })).status, 400);
  assert.equal((await http('/api/workspaces/launch', { path: a, extraArgs: [123] })).status, 400);
  assert.equal(sdk.listSdkSessions().length, 2);
  const scope = (path, info) => `${path}${path.includes('?') ? '&' : '?'}instance=${info.instanceKey}`;
  writeFileSync(join(a, 'note.txt'), 'alpha-workspace');
  writeFileSync(join(b, 'note.txt'), 'beta-workspace');
  mkdirSync(join(a, '.git'));
  for (const [info, cwd, text] of [[infoA, a, 'alpha-workspace'], [infoB, b, 'beta-workspace']]) {
    assert.equal((await http(scope('/api/project-dir', info))).json().dir, cwd);
    assert.equal((await http(scope('/api/project-name', info))).json().instanceKey, info.instanceKey);
    assert.equal((await http(scope('/api/file-content?path=note.txt', info))).json().content, text);
    const found = await http(scope('/api/search', info), { query: text, engine: 'node' });
    assert.equal(found.status, 200, found.text);
    assert.ok(found.json().results.length > 0);
  }
  assert.equal((await http('/api/project-dir')).json().dir, a, 'legacy requests remain bound to the boot cwd');
  const changed = await http(scope('/api/file-content', infoA), { path: 'note.txt', content: 'changed alpha' });
  assert.equal(changed.status, 200, changed.text);
  assert.equal(readFileSync(join(a, 'note.txt'), 'utf8'), 'changed alpha');
  assert.equal(readFileSync(join(b, 'note.txt'), 'utf8'), 'beta-workspace');
  assert.equal((await http('/api/file-content?path=note.txt&instance=stale')).status, 404);
  const gitA = (await http(scope('/api/git-repos', infoA))).json();
  const gitB = (await http(scope('/api/git-repos', infoB))).json();
  assert.ok(JSON.stringify(gitA).includes('"isRoot":true'));
  assert.ok(!JSON.stringify(gitB).includes('"isRoot":true'));
  const logs = (await http(scope('/api/local-logs', infoB))).json();
  const projectB = logs._currentProject;
  const projectA = (await http(scope('/api/local-logs', infoA))).json()._currentProject;
  assert.notEqual(projectB, projectA);
  assert.ok([projectA, projectB].some(id => /^same--[a-f0-9]{16}$/.test(id)));
  const snapshot = await http(scope('/api/log-v2/snapshot', infoB));
  assert.equal(snapshot.status, 200, snapshot.text);
  assert.equal(snapshot.frames()[0].archive.projectId, projectB);
  const fileB = logs[projectB][0].file;
  const deletion = await http(scope('/api/delete-logs', infoA), { files: [fileB] });
  assert.equal(deletion.json().results[0].error, 'Active log cannot be deleted');
  assert.ok(existsSync(join(root, 'logs', fileB)));
  assert.equal((await http('/api/workspaces/close', { project: 'same' })).status, 400);
  assert.equal((await http('/api/workspaces/close', { instanceKey: 'stale' })).status, 404);
  assert.equal(sdk.listSdkSessions().length, 2);
  const c = join(root, 'c', 'same'); mkdirSync(c, { recursive: true });
  const { resolveProjectIdForCwd } = await import('../lib/log-v2/project-id.js');
  const { projectArchiveDirectoryName } = await import('../lib/log-v2/identity.js');
  const badProject = join(root, 'logs', projectArchiveDirectoryName(resolveProjectIdForCwd(join(root, 'logs'), c)));
  mkdirSync(badProject);
  writeFileSync(join(badProject, 'project.json'), '{broken');
  assert.equal((await http('/api/workspaces/launch', { path: c })).status, 500);
  assert.equal(sdk.listSdkSessions().length, 2, 'failed storage initialization cannot leave a resident workspace');
  assert.equal(readFileSync(join(badProject, 'project.json'), 'utf8'), '{broken');
  assert.ok(!(await http('/api/workspaces')).json().workspaces.some(workspace => workspace.path === c));
});

test('a V2 live subscription keeps its workspace while another session becomes active', { timeout: 15000 }, async () => {
  const snapshot = await http(`/api/log-v2/snapshot?instance=${infoB.instanceKey}`);
  assert.equal(snapshot.status, 200, snapshot.text);
  const frames = snapshot.frames(), start = frames[0], cursor = frames.at(-1).cursor;
  const query = new URLSearchParams({ instance: infoB.instanceKey, generation: start.archive.generation,
    handle: start.objectHandle, afterSeq: String(cursor.throughSeq) });
  const box = inbox();
  let buffer = '';
  const req = request({ hostname: '127.0.0.1', port, path: `/api/log-v2/live?${query}` }, res => {
    box.push({ type: 'http-status', status: res.statusCode });
    res.setEncoding('utf8');
    res.on('data', chunk => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        const type = frame.match(/^event: (.+)$/m)?.[1], data = frame.match(/^data: (.+)$/m)?.[1];
        if (type && data) box.push({ type, data: JSON.parse(data) });
      }
    });
  });
  req.on('error', () => {}); req.end();
  clients.push({ close: () => req.destroy() });
  try {
    sdk.attachSdkSession({ cwd: a });
    writeFileSync(join(a, 'release'), 'go');
    await sdk.sendUserMessage('active A', { cwd: a });
    // Cover the real one-second active-file poll while B remains subscribed.
    await new Promise(resolve => setTimeout(resolve, 1200));
    await sdk.sendUserMessage('live B', { cwd: b });
    assert.equal((await box.receive('http-status')).status, 200);
    const commit = (await box.receive('v2_commit')).data;
    assert.equal(commit.frame.archive.projectId, start.archive.projectId);
    assert.equal(commit.frame.archive.sessionId, start.archive.sessionId);
    assert.ok(!box.messages.some(message => message.type === 'v2_reset'));
  } finally { req.destroy(); }
});

test('SDK HTTP resume selects exact history before the next turn and keeps same-name siblings isolated', { timeout: 20000 }, async () => {
  const scope = path => `${path}?instance=${infoA.instanceKey}`;
  const initial = (await http(scope('/api/resume-sessions'))).json();
  assert.equal(initial.instanceKey, infoA.instanceKey);
  assert.equal(initial.items.length, 1);
  const oldFile = initial.items[0].file, oldId = initial.items[0].sessionId;
  const siblingId = sdk.getSessionId({ cwd: b });
  const siblingFile = (await http(`/api/resume-sessions?instance=${infoB.instanceKey}`)).json().items[0].file;
  assert.equal((await http('/api/workspaces/close', { instanceKey: infoA.instanceKey })).status, 200);
  assert.equal((await http('/api/workspaces/launch', { path: a })).status, 200);
  writeFileSync(join(a, 'next-thread'), 'new-a-thread');
  await sdk.sendUserMessage('fresh A conversation', { cwd: a });
  const listed = (await http(scope('/api/resume-sessions'))).json();
  assert.equal(listed.items.length, 2);
  assert.equal(listed.currentSessionId, 'new-a-thread');
  assert.ok(listed.items.every(item => item.file !== siblingFile));
  assert.equal((await http(scope('/api/resume-session'), { file: siblingFile })).status, 403);
  assert.equal((await http(scope('/api/resume-session'), { file: oldFile, instanceKey: infoB.instanceKey })).status, 409);
  for (const body of [{}, null, [], 'invalid', { file: 123 }]) {
    assert.equal((await http(scope('/api/resume-session'), body)).status, 400);
  }
  assert.equal((await http('/api/resume-session?instance=stale', { file: oldFile })).status, 404);
  assert.equal(sdk.getSessionId({ cwd: a }), 'new-a-thread');

  rmSync(join(a, 'release')); rmSync(join(a, 'ready'));
  const running = sdk.sendUserMessage('hold before resume', { cwd: a });
  try {
    await ready(a);
    await sdk.sendUserMessage('queued before resume', { cwd: a });
    const busy = await http(scope('/api/resume-session'), { file: oldFile });
    assert.equal(busy.status, 409, busy.text);
    assert.equal(busy.json().code, 'SDK_SESSION_BUSY');
    writeFileSync(join(a, 'release'), 'go'); await running;
  } finally { writeFileSync(join(a, 'release'), 'go'); await running; }
  const frames = (await http(scope('/api/log-v2/snapshot'))).frames();
  const liveQuery = new URLSearchParams({ instance: infoA.instanceKey, generation: frames[0].archive.generation,
    handle: frames[0].objectHandle, afterSeq: String(frames.at(-1).cursor.throughSeq) });
  const live = startSse(`/api/log-v2/live?${liveQuery}`);
  await sdk.sendUserMessage('live before resume', { cwd: a });
  await live.ready;
  await live.receive('v2_commit');
  const resumedEvents = await openSse(infoA.instanceKey), siblingEvents = await openSse(infoB.instanceKey);
  await resumedEvents.receive('sdk_workspace'); await siblingEvents.receive('sdk_workspace');
  const resumed = await http(scope('/api/resume-session'), { file: oldFile });
  assert.equal(resumed.status, 200, resumed.text);
  assert.equal(resumed.json().sessionId, oldId);
  assert.match(resumed.json().resumeId, /^[a-f0-9]{32}$/);
  assert.equal((await resumedEvents.receive('sdk_session_resumed')).data.resumeId, resumed.json().resumeId);
  server.sendSdkStreamProgress({ instanceKey: infoB.instanceKey, cwd: b, content: 'resume event barrier' });
  await siblingEvents.receive('stream-progress');
  assert.ok(!siblingEvents.messages.some(message => message.type === 'sdk_session_resumed'));
  assert.equal((await live.receive('v2_reset')).data.code, 'CXV_LOG_V2_ARCHIVE_CHANGED');
  live.close();
  assert.equal((await http(scope('/api/log-v2/snapshot'))).frames()[0].archive.sessionId, oldId,
    'snapshot must select restored history before any model turn writes a new pointer');
  assert.equal((await http(`/api/log-v2/snapshot?instance=${infoB.instanceKey}`)).frames()[0].archive.sessionId, siblingId);
  await sdk.sendUserMessage('continue restored A', { cwd: a });
  const { readV2LogEntries, resolveV2SessionFile } = await import('../lib/log-v2/materializer.js');
  const history = readV2LogEntries(join(root, 'logs'), oldFile).filter(entry => entry.mainAgent);
  const input = history.at(-1).body.input;
  assert.ok(input.some(item => item.content === 'active A'));
  assert.equal(input.at(-1).content, 'continue restored A');
  assert.ok(!input.some(item => item.content === 'fresh A conversation'));
  assert.equal(sdk.getSessionId({ cwd: b }), siblingId);
  assert.equal(sdk.getSessionId({ cwd: a }), oldId);

  const { LogV2Writer } = await import('../lib/log-v2/writer.js');
  const project = resolveV2SessionFile(join(root, 'logs'), oldFile).project;
  const broken = LogV2Writer.open({ rootDir: join(root, 'logs'), canonicalCwd: a,
    projectId: project.projectId, source: 'sdk', sessionId: 'broken-resume', rootThreadId: 'broken-resume' });
  const timeline = join(broken.sessionDir, 'timeline.jsonl');
  appendFileSync(timeline, '{"partial":');
  const file = `${project.projectId}/${broken.sessionDir.split('/').at(-1)}/timeline.jsonl`;
  const bytes = readFileSync(timeline);
  const rejected = await http(scope('/api/resume-session'), { file });
  assert.equal(rejected.status, 409, rejected.text);
  assert.equal(rejected.json().code, 'CXV_LOG_V2_INCOMPLETE');
  assert.equal(sdk.getSessionId({ cwd: a }), oldId);
  assert.deepEqual(readFileSync(timeline), bytes);
});

test('scratch shells bind the handshake instance and close only with their own workspace', async () => {
  const wa = await openWs(infoA.instanceKey, 'shared'), wb = await openWs(infoB.instanceKey, 'shared');
  const legacy = await openWs(undefined, 'shared');
  for (const client of [wa, wb, legacy]) { await client.receive('state'); await client.receive('data-replay'); }
  const [pa, pb] = scratchSpawns;
  assert.equal(pa.cwd, a); assert.equal(pb.cwd, b); assert.equal(scratchSpawns.length, 2);
  sdk.attachSdkSession({ cwd: b });
  pa.data('only A'); pb.data('only B');
  assert.equal((await wa.receive('data')).data, 'only A');
  assert.equal((await legacy.receive('data')).data, 'only A');
  assert.equal((await wb.receive('data')).data, 'only B');
  wa.send({ type: 'kill' }); wa.send({ type: 'resync-request' }); await wa.receive('data-replay');
  assert.equal(pa.killed, true); assert.equal(pb.killed, false);
  const next = await openWs(infoA.instanceKey, 'shared');
  await next.receive('state'); await next.receive('data-replay');
  const replacement = scratchSpawns.at(-1);
  wa.send({ type: 'kill' }); wa.send({ type: 'resync-request' }); await wa.receive('data-replay');
  assert.equal(replacement.killed, false, 'old socket cannot kill a replacement shell');
  const closed = Promise.all([wa, legacy, next].map(client => new Promise(resolve => client.ws.once('close', resolve))));
  assert.equal((await http('/api/workspaces/close', { instanceKey: infoA.instanceKey })).status, 200);
  await closed;
  assert.equal(replacement.killed, true); assert.equal(pb.killed, false);
  pb.data('B survives'); assert.equal((await wb.receive('data')).data, 'B survives');

  // Closing after WS upgrade but before the dynamic PTY import finishes must
  // cancel the pending shell as well as close its browser connection.
  const relaunched = await http('/api/workspaces/launch', { path: a });
  assert.equal(relaunched.status, 200);
  let release, started;
  const loading = new Promise(resolve => { started = resolve; });
  scratch._setScratchPtyLoaderForTests(() => new Promise(resolve => { release = resolve; started(); }));
  const pending = await openWs(infoA.instanceKey, 'pending');
  await loading;
  const pendingClosed = new Promise(resolve => pending.ws.once('close', resolve));
  assert.equal((await http('/api/workspaces/close', { instanceKey: infoA.instanceKey })).status, 200);
  await pendingClosed;
  const spawnCount = scratchSpawns.length;
  release(scratchPty());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scratchSpawns.length, spawnCount, 'closed workspace cannot spawn a late shell');
  scratch._setScratchPtyLoaderForTests(async () => scratchPty());
});

test('SDK stop-all closes every resident session and scratch shell while preserving launch configuration', async () => {
  const wb = await openWs(infoB.instanceKey, 'shared');
  await wb.receive('state');
  const closed = new Promise(resolve => wb.ws.once('close', resolve));
  assert.equal((await http('/api/workspaces/stop', {})).status, 200);
  await closed;
  assert.ok(scratchSpawns.every(proc => proc.killed));
  assert.deepEqual(sdk.listSdkSessions(), []);
  const launched = await http('/api/workspaces/launch', { path: b });
  assert.equal(launched.status, 200, launched.text);
  assert.equal(launched.json().reused, false);
  assert.equal(launched.json().instanceKey, infoB.instanceKey);
});
