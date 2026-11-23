import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
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
      const index = waiters.findIndex(waiter => waiter.type === message.type && waiter.matches(message));
      if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
      else messages.push(message);
    },
    receive(type, matches = () => true) {
      const index = messages.findIndex(message => message.type === type && matches(message));
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { type, matches, resolve(message) { clearTimeout(timer); resolve(message); } };
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
  clients.push({ ws, close: () => ws.terminate() });
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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
if(process.argv.includes('app-server')) {
 for await(const line of createInterface({input:process.stdin})) {
  const f=JSON.parse(line); if(f.id==null)continue;
  const result=f.method==='thread/read'?{thread:{id:f.params.threadId,cwd:process.cwd(),path:join(process.env.CODEX_HOME,'sessions',f.params.threadId+'.jsonl')}}:{};
  process.stdout.write(JSON.stringify({id:f.id,result})+'\\n');
 }
 process.exit(0);
}
let input = ''; for await (const chunk of process.stdin) input += chunk;
const cwd = process.env.CXV_PROJECT_DIR;
process.stdout.write(JSON.stringify({ type: 'item.updated', item: {
 id: 'plan', type: 'todo_list', items: [{ text: input, completed: false }],
} }) + '\\n');
writeFileSync(join(cwd, 'ready'), input);
while (!existsSync(join(cwd, 'release'))) await new Promise(resolve => setTimeout(resolve, 10));
const resumeIndex = process.argv.indexOf('resume');
const threadId = resumeIndex >= 0 ? process.argv[resumeIndex + 1]
  : existsSync(join(cwd, 'next-thread')) ? readFileSync(join(cwd, 'next-thread'), 'utf8')
  : 'thread_' + Buffer.from(cwd).toString('hex');
const timestamp=new Date().toISOString(), total=cwd.includes('context-d')?171029:54985;
mkdirSync(join(process.env.CODEX_HOME,'sessions'),{recursive:true});
writeFileSync(join(process.env.CODEX_HOME,'sessions',threadId+'.jsonl'),[
 {type:'session_meta',payload:{id:threadId,cwd,source:'exec'}},
 {timestamp,type:'event_msg',payload:{type:'task_started',turn_id:'native-'+threadId}},
 {timestamp,type:'event_msg',payload:{type:'token_count',info:{last_token_usage:{input_tokens:total-100,output_tokens:100,total_tokens:total},total_token_usage:{total_tokens:4140366},model_context_window:475000}}}
].map(JSON.stringify).join('\\n')+'\\n');
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
    onContextUsage: server.setSdkContextUsage,
    onAgentLoopStart: server.broadcastAgentLoopStart, onAgentLoopEnd: server.broadcastAgentLoopEnd,
    broadcastWs: server.broadcastWsMessage };
  sdk.setSdkLaunchConfig(options);
  infoA = sdk.initSdkSession(a, 'same', options);
  process.env.CXV_PROJECT_DIR = b;
  const pluginDir = join(root, 'logs', 'plugins'); mkdirSync(pluginDir, { recursive: true });
  writeFileSync(join(pluginDir, 'loop-observer.mjs'), `import { appendFileSync } from 'node:fs';
const record = (phase, data) => appendFileSync(${JSON.stringify(join(root, 'loop-hooks.jsonl'))}, JSON.stringify({ phase, ...data }) + '\\n');
export default { name: 'isolated loop observer', hooks: {
 onAgentLoopStart(data) { record('start', data); throw new Error('fixture isolated plugin failure'); },
 onAgentLoopEnd(data) { record('end', data); }
} };`);
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

test('SDK main WebSocket ignores PTY input, sequential input, resize and resync without spawning a hidden shell', async t => {
  const pty = await import('../pty-manager.js');
  const spawns = [];
  pty._setPtyImportForTests(async () => ({ spawn(...args) {
    spawns.push(args);
    return { onData() {}, onExit() {}, write() {}, resize() {}, kill() {} };
  } }));
  const ws = await openWs(infoA.instanceKey);
  t.after(() => { ws.ws.terminate(); pty.killPty(); pty._setPtyImportForTests(null); });
  await ws.receive('sdk-workspace');
  for (const frame of [
    { type: 'input', data: 'synthetic-raw-input' },
    { type: 'input-sequential', seq: 'synthetic-seq', chunks: ['synthetic-paste', '\r'], settleMs: 0 },
    { type: 'resize', cols: 75, rows: 25 },
    { type: 'resync-request', reason: 'requested' },
  ]) ws.send(frame);
  ws.send({ type: 'sdk-user-message', text: 'scope barrier', instanceKey: infoB.instanceKey });
  assert.equal((await ws.receive('sdk-error')).code, 'SDK_SCOPE_MISMATCH');
  assert.equal(spawns.length, 0, 'SDK control channel must never reach main-PTY spawn');
  assert.equal(pty.getPtyState().running, false);
  assert.equal(ws.messages.some(frame => frame.type === 'input-sequential-done'), false);
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
  const loopA = await sa.receive('agent_loop_start'), loopB = await sb.receive('agent_loop_start');
  assert.equal(loopA.data.instanceKey, infoA.instanceKey); assert.equal(loopB.data.instanceKey, infoB.instanceKey);
  assert.notEqual(loopA.data.turnId, loopB.data.turnId);
  await Promise.all([ready(a), ready(b)]);
  let tasksA, tasksB;
  do { tasksA = await wa.receive('sdk-task-snapshot'); } while (!tasksA.tasks.length);
  do { tasksB = await wb.receive('sdk-task-snapshot'); } while (!tasksB.tasks.length);
  assert.equal(tasksA.tasks[0].subject, 'hold A');
  assert.equal(tasksB.tasks[0].subject, 'hold B');
  assert.equal(tasksA.instanceKey, infoA.instanceKey);
  assert.equal(tasksB.instanceKey, infoB.instanceKey);
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
  assert.deepEqual((await reconnected.receive('sdk-task-snapshot')).tasks, tasksA.tasks);
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
  assert.equal((await sa.receive('stream-progress', frame => frame.data.content === 'only A')).data.content, 'only A');
  assert.equal((await sb.receive('stream-progress', frame => frame.data.content === 'only B')).data.content, 'only B');
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
  const endedA = (await sa.receive('agent_loop_end')).data;
  assert.equal(endedA.turnId, loopA.data.turnId); assert.equal(endedA.reason, 'interrupted');
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
  const endedB = (await sb.receive('agent_loop_end')).data;
  assert.equal(endedB.turnId, loopB.data.turnId); assert.equal(endedB.reason, 'success');
  const hooks = readFileSync(join(root, 'loop-hooks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(hooks.filter(frame => frame.instanceKey === infoA.instanceKey).map(frame => [frame.phase, frame.turnId]),
    [['start', loopA.data.turnId], ['end', loopA.data.turnId]]);
  assert.deepEqual(hooks.filter(frame => frame.instanceKey === infoB.instanceKey).map(frame => [frame.phase, frame.turnId]),
    [['start', loopB.data.turnId], ['end', loopB.data.turnId]]);
  for (const channel of [sa, replay]) {
    assert.ok(channel.messages.filter(message => message.data?.instanceKey).every(message => message.data.instanceKey === infoA.instanceKey));
  }
  assert.ok(sb.messages.filter(message => message.data?.instanceKey).every(message => message.data.instanceKey === infoB.instanceKey));
  assert.ok(!wa.messages.some(message => message.marker === 'B'));
  assert.ok(!wb.messages.some(message => message.marker === 'A'));
  assert.ok(!wb.messages.some(message => message.type === 'sdk-task-snapshot' && message.instanceKey === infoA.instanceKey));
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
  const restoredFrames = (await http(scope('/api/log-v2/snapshot'))).frames();
  assert.equal(restoredFrames[0].archive.sessionId, oldId,
    'snapshot must select restored history before any model turn writes a new pointer');
  assert.equal((await http(`/api/log-v2/snapshot?instance=${infoB.instanceKey}`)).frames()[0].archive.sessionId, siblingId);
  const restoredCursor = restoredFrames.at(-1).cursor;
  const restoredLiveQuery = new URLSearchParams({ instance: infoA.instanceKey,
    generation: restoredFrames[0].archive.generation, handle: restoredFrames[0].objectHandle,
    afterSeq: String(restoredCursor.throughSeq) });
  // Complete the first resumed turn before attaching the live reader. It must
  // replay from the frozen cursor without treating these new bytes as history.
  await sdk.sendUserMessage('continue restored A', { cwd: a });
  const restoredLive = startSse(`/api/log-v2/live?${restoredLiveQuery}`);
  try {
    await restoredLive.ready;
    const resumedCommit = (await restoredLive.receive('v2_commit')).data;
    assert.equal(resumedCommit.frame.archive.sessionId, oldId);
    assert.ok(resumedCommit.frame.timeline.seq > restoredCursor.throughSeq);
    assert.equal(restoredLive.messages.some(frame => frame.type === 'v2_reset'), false);
  } finally { restoredLive.close(); }
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

test('query failures reach only their owning same-name WebSocket, including failures before thread creation', { timeout: 15000 }, async () => {
  const cwd = join(root, 'failures', 'same'); mkdirSync(cwd, { recursive: true });
  const script = join(root, 'failed-codex.mjs');
  writeFileSync(script, `#!/usr/bin/env node
let input = ''; for await (const chunk of process.stdin) input += chunk;
if (input === 'before-thread') { process.stderr.write('fixture startup failed'); process.exit(7); }
for (const frame of [
 { type: 'thread.started', thread_id: 'failure-thread' },
 { type: 'turn.failed', error: { message: 'fixture terminal failure' } },
 { type: 'error', message: 'must not duplicate terminal failure' },
]) process.stdout.write(JSON.stringify(frame) + '\\n');
`);
  chmodSync(script, 0o755);
  const view = sdk.initSdkSession(cwd, 'same', { codexPath: script, broadcastWs: server.broadcastWsMessage });
  const own = await openWs(view.instanceKey), other = await openWs(infoB.instanceKey);
  await own.receive('sdk-workspace'); await other.receive('sdk-workspace');
  for (const text of ['before-thread', 'failed-turn']) {
    await sdk.sendUserMessage(text, view);
    const failure = await own.receive('sdk-error');
    assert.equal(failure.instanceKey, view.instanceKey); assert.equal(failure.cwd, cwd);
    assert.equal(failure.sessionId, text === 'before-thread' ? null : 'failure-thread');
    assert.match(failure.message, text === 'before-thread' ? /fixture startup failed/ : /^fixture terminal failure$/);
    // A same-socket barrier proves the other client has consumed everything before it.
    server.broadcastWsMessage({ type: 'failure-barrier', cwd: infoB.cwd, instanceKey: infoB.instanceKey });
    await other.receive('failure-barrier');
    assert.equal(other.messages.some(frame => frame.type === 'sdk-error'), false);
  }
  server.broadcastWsMessage({ type: 'failure-barrier', cwd, instanceKey: view.instanceKey });
  await own.receive('failure-barrier');
  assert.equal(own.messages.some(frame => frame.type === 'sdk-error'), false, 'each terminal failure broadcasts exactly once');
});

test('native retry WebSocket requests are scoped, reject stale failures and deliver one continuation', { timeout: 15000 }, async () => {
  const cwd = join(root, 'retry', 'same'); mkdirSync(cwd, { recursive: true });
  const script = join(root, 'retry-codex.mjs');
  writeFileSync(script, String.raw`import { createInterface } from 'node:readline';
import { appendFileSync } from 'node:fs';
const send = f => process.stdout.write(JSON.stringify(f) + '\n');
let turn = 0;
for await (const line of createInterface({ input: process.stdin })) {
 const f = JSON.parse(line), p = f.params || {};
 if (f.method === 'initialized') continue;
 if (f.method === 'initialize') { send({ id: f.id, result: {} }); continue; }
 if (f.method === 'thread/start') { send({ id: f.id, result: { thread: { id: 'retry-thread' } } }); continue; }
 if (f.method !== 'turn/start') { send({ id: f.id, error: { code: -32601, message: 'unsupported' } }); continue; }
 const turnId = 'retry-turn-' + ++turn, text = p.input[0].text;
 appendFileSync('inputs.jsonl', JSON.stringify({ text }) + '\n');
 send({ id: f.id, result: { turn: { id: turnId } } });
 send({ method: 'turn/started', params: { threadId: 'retry-thread', turn: { id: turnId } } });
 if (text === 'fail') {
  const error = { message: 'fixture retryable failure', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 503 } } };
  send({ method: 'error', params: { threadId: 'retry-thread', turnId, error, willRetry: true } });
  send({ method: 'turn/completed', params: { threadId: 'retry-thread', turn: { id: turnId, status: 'failed', error } } });
 } else send({ method: 'turn/completed', params: { threadId: 'retry-thread', turn: { id: turnId, status: 'completed' } } });
}
`);
  const view = sdk.initSdkSession(cwd, 'same', { transport: 'appserver', codexPath: script, broadcastWs: server.broadcastWsMessage });
  const own = await openWs(view.instanceKey), other = await openWs(infoB.instanceKey);
  await own.receive('sdk-workspace'); await other.receive('sdk-workspace');
  await sdk.sendUserMessage('fail', view); const failed = await own.receive('sdk-error');
  own.send({ type: 'sdk-retry-turn', turnId: 'old-turn' });
  assert.equal((await own.receive('sdk-retry-state', frame => frame.phase === 'rejected')).reason, 'stale');
  other.send({ type: 'sdk-retry-turn', turnId: failed.turnId, instanceKey: view.instanceKey });
  assert.equal((await other.receive('sdk-error')).code, 'SDK_SCOPE_MISMATCH');
  own.send({ type: 'sdk-retry-turn', turnId: failed.turnId });
  const recovering = await own.receive('sdk-retry-state', frame => frame.phase === 'recovering');
  const recovered = await own.receive('sdk-retry-state', frame => frame.phase === 'recovered');
  assert.equal(recovering.retryOf, failed.turnId); assert.equal(recovered.retryOf, failed.turnId);
  assert.equal(recovered.instanceKey, view.instanceKey);
  const inputs = readFileSync(join(cwd, 'inputs.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(inputs.length, 2); assert.equal(inputs[0].text, 'fail'); assert.ok(inputs[1].text.startsWith('[cc-viewer:retry] '));
  server.broadcastWsMessage({ type: 'retry-barrier', cwd: infoB.cwd, instanceKey: infoB.instanceKey });
  await other.receive('retry-barrier');
  assert.equal(other.messages.some(frame => frame.type === 'sdk-retry-state'), false);
});

test('native approvals replay across real WebSocket reconnects and answers stay bound to the owning instance', { timeout: 15000 }, async () => {
  const cwd = join(root, 'native', 'same'); mkdirSync(cwd, { recursive: true });
  const script = join(root, 'native-codex.mjs');
  writeFileSync(script, `import { createInterface } from 'node:readline';
const send = f => process.stdout.write(JSON.stringify(f) + '\\n');
let threadId = 'native-thread', turnId, sequence = 0;
for await (const line of createInterface({ input: process.stdin })) {
 const f = JSON.parse(line), p = f.params || {};
 if (!f.method) {
  send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer', type: 'agentMessage', text: JSON.stringify(f) } } });
  send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } }); continue;
 }
 if (f.method === 'initialized') continue;
 if (f.method === 'initialize') { send({ id: f.id, result: {} }); continue; }
 if (f.method === 'thread/start') { send({ id: f.id, result: { thread: { id: threadId } } }); continue; }
 if (f.method === 'skills/list') {
  send({ id: f.id, result: { data: [{ cwd: p.cwds[0], errors: [], skills: [{ name: 'owned-native-skill', description: 'native catalog',
   path: p.cwds[0] + '/.agents/skills/owned/SKILL.md', scope: 'repo', enabled: true }] }] } }); continue;
 }
 if (f.method === 'mcpServerStatus/list') {
  send({ id: f.id, result: { data: [{ name: 'fixture-mcp', runtimeStatus: 'connected', authStatus: 'unsupported',
   tools: { read: { name: 'read' } }, resources: [], resourceTemplates: [], serverInfo: { name: 'fixture', version: '1' } }], nextCursor: null } }); continue;
 }
 if (f.method === 'thread/read') { send({ id: f.id, result: { thread: { id: p.threadId,
  source: { subAgent: { thread_spawn: { parent_thread_id: threadId, agent_nickname: 'Native Child' } } } } } }); continue; }
 if (f.method === 'turn/start') {
  turnId = 'turn-' + ++sequence;
  send({ id: f.id, result: { turn: { id: turnId } } });
  const kind = p.input[0].text;
  if (kind === 'agents' || kind === 'finish agents') {
   send({ method: kind === 'agents' ? 'turn/started' : 'turn/completed', params: { threadId: 'agent-child',
    turn: { id: 'child-turn', status: kind === 'agents' ? 'inProgress' : 'completed', startedAt: 123 } } });
   send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } }); continue;
  }
  const method = kind === 'ask' ? 'item/tool/requestUserInput' : 'item/' + kind + '/requestApproval';
  send({ id: 7, method, params: { threadId, turnId, itemId: 'question-' + sequence, command: 'synthetic', cwd: ${JSON.stringify(cwd)},
    permissions: { network: { enabled: true } }, questions: [{ id: 'choice', question: 'Choose', options: [{ label: 'A' }, { label: 'B' }] }] } }); continue;
 }
 send({ id: f.id, result: {} });
}
`);
  const entries = [];
  const view = sdk.initSdkSession(cwd, 'same', { transport: 'appserver', codexPath: script,
    onEntry(entry) { entries.push(entry); server.pushSdkEntry(entry); }, broadcastWs: server.broadcastWsMessage });
  const other = await openWs(infoB.instanceKey);
  let client = await openWs(view.instanceKey);
  assert.equal((await http(`/api/sdk-mcp-server-status?instance=${view.instanceKey}`)).json().reason, 'session-inactive');
  assert.equal((await http(`/api/sdk-mcp-server-status?instance=${infoB.instanceKey}`)).json().reason, 'unsupported');
  assert.equal((await http(`/api/skill-commands?instance=${view.instanceKey}`)).json().reason, 'session-inactive');
  assert.equal((await http(`/api/skill-commands?instance=${infoB.instanceKey}`)).json().reason, 'unsupported');
  let previousId;
  for (const [kind, value, expected] of [
    ['commandExecution', { decision: 'allow' }, { decision: 'accept' }],
    ['fileChange', { decision: 'deny' }, { decision: 'decline' }],
    ['permissions', { decision: 'allow', allowSession: true }, { permissions: { network: { enabled: true } }, scope: 'session' }],
    ['ask', { answers: { choice: { answers: ['B'] } } }, { answers: { choice: { answers: ['B'] } } }],
    ['ask', { answers: {} }, { answers: {} }],
  ]) {
    const running = sdk.sendUserMessage(kind, view);
    const type = kind === 'ask' ? 'sdk-ask' : 'perm-hook';
    const pending = await client.receive(type + '-pending');
    const skills = (await http(`/api/skill-commands?instance=${view.instanceKey}`)).json();
    assert.equal(skills.ok, true); assert.equal(skills.instanceKey, view.instanceKey);
    assert.deepEqual(skills.skills.map(skill => [skill.name, skill.path]), [['owned-native-skill', cwd + '/.agents/skills/owned/SKILL.md']]);
    const mcp = (await http(`/api/sdk-mcp-server-status?instance=${view.instanceKey}`)).json();
    assert.equal(mcp.ok, true);
    assert.equal(mcp.snapshot.instanceKey, view.instanceKey);
    assert.equal(mcp.snapshot.cwd, cwd);
    assert.deepEqual(mcp.snapshot.servers.map(server => [server.name, server.status, server.tools.length]), [['fixture-mcp', 'connected', 1]]);
    assert.equal((await client.receive('sdk-mcp-status')).servers[0].name, 'fixture-mcp');
    const copy = sdk.getMcpStatusSnapshot(view); copy.servers[0].name = 'modified copy';
    assert.equal(sdk.getMcpStatusSnapshot(view).servers[0].name, 'fixture-mcp');
    assert.notEqual(pending.id, previousId, 'native numeric ID reuse must receive a new browser nonce');
    other.send({ type: type === 'sdk-ask' ? 'sdk-ask-answer' : 'perm-hook-answer', id: pending.id, ...value });
    assert.equal((await other.receive('sdk-error')).code, 'SDK_APPROVAL_NOT_PENDING');
    const closed = new Promise(resolve => client.ws.once('close', resolve)); client.ws.close(); await closed;
    client = await openWs(view.instanceKey);
    assert.equal((await client.receive('sdk-mcp-status')).servers[0].name, 'fixture-mcp');
    assert.equal((await client.receive(type + '-pending')).id, pending.id);
    client.send({ type: type === 'sdk-ask' ? 'sdk-ask-answer' : 'perm-hook-answer', id: pending.id, ...value });
    const resolved = await client.receive(type + '-resolved');
    if (kind === 'ask') assert.equal(resolved.itemId, pending.itemId);
    await running;
    const final = entries.filter(entry => entry.mainAgent && !entry.inProgress).at(-1);
    assert.equal(client.messages.some(frame => frame.type === 'sdk-error'), false, 'an accepted native reply must not also report rejection');
    const reply = JSON.parse(final.response.body.content.find(block => block.type === 'text').text);
    assert.deepEqual(reply, { id: 7, result: expected });
    assert.deepEqual(sdk.getSdkPendingApprovals(view), []);
    assert.equal(other.messages.some(frame => frame.id === pending.id
      && [type + '-pending', type + '-resolved', type + '-timeout'].includes(frame.type)), false,
    'pending payloads and terminal answers remain on their owning immutable connection scope');
    assert.equal(other.messages.some(frame => frame.type === 'sdk-mcp-status'), false);
    previousId = pending.id;
  }
  await sdk.sendUserMessage('agents', view);
  let active;
  do { active = await client.receive('sdk-agent-snapshot'); } while (!active.agents.length);
  assert.equal(active.agents[0].name, 'Native Child'); assert.equal(active.agents[0].createdAt, 123000);
  assert.equal(sdk.getSdkStreamingState(view).active, false);
  const closed = new Promise(resolve => client.ws.once('close', resolve)); client.ws.close(); await closed;
  const resumed = await openWs(view.instanceKey);
  assert.deepEqual((await resumed.receive('sdk-agent-snapshot')).agents, active.agents);
  assert.equal((await resumed.receive('sdk-mcp-status')).servers[0].name, 'fixture-mcp');
  assert.equal(other.messages.some(frame => frame.type === 'sdk-agent-snapshot' && frame.agents.length), false);
  await sdk.sendUserMessage('finish agents', view);
  assert.deepEqual((await resumed.receive('sdk-agent-snapshot')).agents, []);
  sdk.stopSession(view);
  assert.equal((await resumed.receive('sdk-mcp-status')).servers, null);
  assert.throws(() => sdk.getMcpStatusSnapshot(view), { code: 'SDK_SESSION_NOT_FOUND' });
  assert.equal((await http(`/api/sdk-mcp-server-status?instance=${view.instanceKey}`)).status, 404);
  assert.equal((await http(`/api/skill-commands?instance=${view.instanceKey}`)).status, 404);
});

test('owned slow model requests replay on reconnect and settle by request id without reaching a same-name sibling', { timeout: 45000 }, async () => {
  // Prior cases deliberately retain sockets. Retire these fixture clients before
  // this reconnect case so the real per-IP connection cap remains enforced.
  await Promise.all(clients.map(client => client.ws && client.ws.readyState !== WebSocket.CLOSED
    ? new Promise(resolve => { client.ws.once('close', resolve); client.close(); })
    : Promise.resolve(client.close())));
  const previous = process.env.CXV_ORIGINAL_BASE_URL;
  let response;
  const upstream = createServer((req, res) => { req.resume(); response = res; res.writeHead(200, { 'content-type': 'text/event-stream' }); res.flushHeaders(); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  process.env.CXV_ORIGINAL_BASE_URL = `http://127.0.0.1:${upstream.address().port}/v1`;
  const cwd = join(root, 'slow', 'same'); mkdirSync(cwd, { recursive: true });
  const script = join(root, 'slow-codex.mjs');
  writeFileSync(script, String.raw`let input = ''; for await (const part of process.stdin) input += part;
const send = frame => process.stdout.write(JSON.stringify(frame) + '\n');
send({ type: 'thread.started', thread_id: 'slow-owned-thread' }); send({ type: 'turn.started' });
const response = await fetch(process.env.OPENAI_BASE_URL + '/responses', { method: 'POST',
 headers: { 'content-type': 'application/json', 'x-cx-viewer-instance': 'forged' }, body: JSON.stringify({ model: 'slow-fixture', input }) });
await response.text();
send({ type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: 'slow request finished' } });
send({ type: 'turn.completed', usage: {} });
`);
  const view = sdk.initSdkSession(cwd, 'same', { codexPath: script, broadcastWs: server.broadcastWsMessage });
  const sibling = sdk.initSdkSession(b, 'same', {});
  let pending;
  try {
    const own = await openWs(view.instanceKey), other = await openWs(sibling.instanceKey);
    await own.receive('sdk-workspace'); await other.receive('sdk-workspace');
    pending = sdk.sendUserMessage('owned slow HTTP fixture', view);
    // Production threshold remains 30 seconds; unlike proxy unit tests this uses
    // the actual manager, child transport, forwarding proxy and WebSocket stack.
    const deadline = Date.now() + 35000;
    while (!sdk.getSdkSlowUpstreams(view).length) {
      assert.ok(Date.now() < deadline, 'production slow threshold must emit');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    const slow = await own.receive('sdk-slow-upstream');
    assert.equal(slow.instanceKey, view.instanceKey); assert.equal(slow.cwd, cwd); assert.equal(slow.model, 'slow-fixture');
    assert.ok(slow.waitingMs >= 29000); assert.equal(sdk.getSdkSlowUpstreams(sibling).length, 0);
    own.ws.terminate(); const reconnected = await openWs(view.instanceKey);
    const replay = await reconnected.receive('sdk-slow-upstream');
    assert.equal(replay.requestId, slow.requestId); assert.ok(replay.waitingMs >= slow.waitingMs);
    response.end('data: local first byte\n\n');
    const resolved = await reconnected.receive('sdk-slow-upstream-resolved');
    assert.equal(resolved.requestId, slow.requestId); await pending;
    assert.deepEqual(sdk.getSdkSlowUpstreams(view), []);
    const after = await openWs(view.instanceKey); await after.receive('sdk-workspace');
    server.broadcastWsMessage({ type: 'slow-barrier', cwd, instanceKey: view.instanceKey }); await after.receive('slow-barrier');
    assert.equal(after.messages.some(frame => frame.type === 'sdk-slow-upstream'), false);
    server.broadcastWsMessage({ type: 'slow-barrier', cwd: sibling.cwd, instanceKey: sibling.instanceKey }); await other.receive('slow-barrier');
    assert.equal(other.messages.some(frame => frame.type.startsWith('sdk-slow-upstream')), false);
  } finally {
    response?.end(); sdk.closeSdkSession(view); await pending?.catch(() => {});
    upstream.closeAllConnections(); await new Promise(resolve => upstream.close(resolve));
    if (previous === undefined) delete process.env.CXV_ORIGINAL_BASE_URL; else process.env.CXV_ORIGINAL_BASE_URL = previous;
  }
});

test('owned SDK context reaches only its SSE view, replays on reconnect and survives canonical cold loading', async () => {
  const { LogV2Writer } = await import('../lib/log-v2/writer.js');
  const { resolveIngestionSourceIdentity } = await import('../lib/log-v2/identity.js');
  const { readV2LogEntries } = await import('../lib/log-v2/materializer.js');
  const { computeContextPercent, contextUsageForView, sumUsageContextTokens } = await import('@cxv/core/context-rules');
  const views = [], channels = [], captured = [];
  try {
    for (const name of ['context-c', 'context-d']) {
      const cwd = join(root, name); mkdirSync(cwd); writeFileSync(join(cwd, 'release'), 'yes');
      const options = { codexPath: join(root, 'fake-codex.mjs'),
        onEntry: entry => { captured.push(entry); server.pushSdkEntry(entry); },
        onContextUsage: server.setSdkContextUsage };
      views.push(sdk.initSdkSession(cwd, name, options));
      channels.push(await openSse(views.at(-1).instanceKey));
    }
    await Promise.all(views.map(view => sdk.sendUserMessage('context fixture', view)));
    for (let index = 0; index < views.length; index++) {
      const view = views[index], total = index ? 171029 : 54985, percent = index ? 34 : 9;
      const live = (await channels[index].receive('context_window', frame => frame.data.source === 'codex-rollout')).data;
      assert.equal(live.instanceKey, view.instanceKey); assert.equal(live.current_usage.total_tokens, total);
      const reconnected = await openSse(view.instanceKey);
      const replay = (await reconnected.receive('context_window')).data;
      assert.equal(replay.current_usage.total_tokens, total); assert.equal(replay.used_percentage, percent);
      assert.equal(channels[index].messages.some(frame => frame.type === 'context_window'
        && frame.data.instanceKey !== view.instanceKey), false);
      const entry = captured.find(row => row.body.metadata.instance_key === view.instanceKey);
      assert.equal(entry.response.body.usage.total_tokens, 2, 'accounting is not overwritten by context');
      const logDir = join(root, 'context-cold-' + index);
      const writer = LogV2Writer.open({ rootDir: logDir, canonicalCwd: view.cwd, projectId: 'context',
        sessionId: entry.body.metadata.thread_id, rootThreadId: entry.body.metadata.thread_id, source: 'sdk', durability: 'buffered' });
      writer.append(entry, resolveIngestionSourceIdentity(entry, { source: 'sdk' }));
      const file = (await import('node:path')).relative(logDir, join(writer.sessionDir, 'timeline.jsonl'));
      const cold = readV2LogEntries(logDir, file).find(row => row.mainAgent);
      assert.equal(computeContextPercent({ lastMainAgent: cold }), percent);
      assert.equal(sumUsageContextTokens(contextUsageForView({ lastMainAgent: cold })), total);
    }
  } finally {
    for (const channel of channels) channel.close();
    for (const view of views) sdk.closeSdkSession(view);
  }
});
