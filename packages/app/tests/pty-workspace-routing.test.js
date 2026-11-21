import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

const temp = mkdtempSync(join(tmpdir(), 'cxv-pty-routing-'));
Object.assign(process.env, { HOME: temp, CODEX_HOME: join(temp, 'codex'), CXV_TEST: '1',
  CXV_LOG_DIR: join(temp, 'state'), CXV_PROJECT_DIR: join(temp, 'a', 'same'),
  CXV_START_PORT: '20570', CXV_MAX_PORT: '20579', CXV_CLI_MODE: '1',
  CXV_TURN_END_DEBOUNCE_MS: '100', CXV_PROXY_PROFILE_PATH: join(temp, 'profile.json') });
delete process.env.CXV_SDK_MODE;
process.env.CXV_WORKSPACE_MODE = '1';
let server, registry, port, boot, scratch;
const scratchSpawns = [];
const sessions = [], procs = [], views = [], clients = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const url = (path, key) => `http://127.0.0.1:${port}${path}${key ? `${path.includes('?') ? '&' : '?'}instance=${key}` : ''}`;
async function json(path, key, body) {
  const response = await fetch(url(path, key), body ? { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  return { status: response.status, body: await response.json() };
}
async function open(key, suffix = '') {
  const frames = [];
  const ws = new WebSocket(url(`/ws/terminal${suffix}`, key).replace('http:', 'ws:'),
    { headers: { Origin: `http://127.0.0.1:${port}` } });
  ws.on('message', raw => frames.push(JSON.parse(raw)));
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  clients.push(ws);
  const deadline = Date.now() + 2000;
  while (!frames.some(frame => frame.type === 'state')) {
    assert.ok(ws.readyState === WebSocket.OPEN && Date.now() < deadline, 'PTY state handshake failed'); await delay(5);
  }
  return { ws, frames, send: body => ws.send(JSON.stringify(body)) };
}
function fakeProcess() {
  return { writes: [], sizes: [], onData(cb) { this.data = cb; }, onExit(cb) { this.exit = cb; },
    write(data) { this.writes.push(data); }, resize(cols, rows) { this.sizes.push({ cols, rows }); },
    kill() { this.killed = true; this.exit?.({ exitCode: 0 }); } };
}
before(async () => {
  const { createPtySession } = await import('../pty-manager.js');
  const { createPtyWorkspaceRegistry } = await import('../lib/pty-workspaces.js');
  registry = createPtyWorkspaceRegistry();
  for (const name of ['a', 'b']) {
    const cwd = join(temp, name, 'same'); mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, 'owner.txt'), name);
    const pty = createPtySession(), proc = fakeProcess();
    pty._setPtyImportForTests(() => ({ spawn: () => proc }));
    await pty.spawnCodexRequest({ cwd, args: [], codexPath: '/bin/fake', serverPort: 20570 });
    sessions.push(pty); procs.push(proc);
    views.push(registry.adopt({ cwd, pty, runtime: { getContext: () => ({ sessionId: `${name}-session` }) } }));
  }
  scratch = await import('../scratch-pty-manager.js');
  scratch._setScratchPtyLoaderForTests(async () => ({ spawn(_shell, _args, options) {
    const proc = fakeProcess(); scratchSpawns.push({ options, proc }); return proc;
  } }));
  server = await import('../server.js');
  registry = server.configurePtyWorkspaces({ boot: { cwd: views[0].cwd, pty: sessions[0],
    runtime: { getContext: () => ({ sessionId: 'a-session' }) } },
    launch: async () => { throw new Error('not enabled'); } });
  // Adopt B through the trusted bootstrap registry rather than an HTTP-supplied runtime.
  boot = registry.info();
  views[0] = boot;
  views[1] = registry.adopt({ cwd: views[1].cwd, pty: sessions[1],
    runtime: { getContext: () => ({ sessionId: 'b-session' }) } });
  await server.startViewer(); port = server.getPort();
});
after(async () => {
  for (const ws of clients) ws.terminate();
  await server?.stopViewer();
  const interceptor = await import('../interceptor.js');
  interceptor._stopProxyProfileWatchForTests();
  await interceptor.closeLogV2Writes();
  scratch?._resetScratchPtysForTests();
  for (const session of sessions) session._resetPtyManagerForTests();
  rmSync(temp, { recursive: true, force: true });
});

test('ordinary HTTP exact instances retain cwd, terminal identity and empty archive without changing boot', async () => {
  for (let i = 0; i < 2; i++) {
    const key = views[i].instanceKey;
    assert.equal((await json('/api/project-dir', key)).body.dir, views[i].cwd);
    assert.equal((await json('/api/file-content?path=owner.txt', key)).body.content, i ? 'b' : 'a');
    assert.equal((await json('/api/project-name', key)).body.instanceKey, key);
    assert.equal((await json('/api/terminal-recovery', key)).body.streamId, sessions[i].getPtyState().streamId);
    const snapshot = await json('/api/log-v2/snapshot', key);
    assert.equal(snapshot.status, 404);
    assert.ok(!JSON.stringify(snapshot.body).includes("b-session"));
  }
  assert.equal((await json('/api/project-dir')).body.dir, views[0].cwd);
  for (const key of ['same', 'cxv-' + '0'.repeat(36)]) {
    assert.ok((await json('/api/project-dir', key)).status >= 400);
    await assert.rejects(open(key));
  }
});

test('two ordinary terminal sockets own data, screen, input, sequence and mobile dimensions', async () => {
  const a = await open(views[0].instanceKey), b = await open(views[1].instanceKey), unscoped = await open();
  procs[0].data('A-ONLY'); procs[1].data('B-ONLY'); await delay(30);
  assert.ok(a.frames.some(frame => frame.data === 'A-ONLY'));
  assert.ok(unscoped.frames.some(frame => frame.data === 'A-ONLY'));
  assert.ok(b.frames.some(frame => frame.data === 'B-ONLY'));
  assert.ok(!a.frames.some(frame => frame.data === 'B-ONLY'));
  a.send({ type: 'input', data: 'A-input' }); b.send({ type: 'input', data: 'B-input' });
  a.send({ type: 'input', data: 'FORGED', instanceKey: views[1].instanceKey });
  a.send({ type: 'resize', cols: 40, rows: 12, mobile: true });
  b.send({ type: 'resize', cols: 110, rows: 33 }); await delay(30);
  assert.deepEqual(procs[0].writes, ['A-input']); assert.deepEqual(procs[1].writes, ['B-input']);
  assert.deepEqual(procs[0].sizes.at(-1), { cols: 40, rows: 12 });
  assert.deepEqual(procs[1].sizes.at(-1), { cols: 110, rows: 33 });
  a.send({ type: 'resync-request' }); b.send({ type: 'resync-request' }); await delay(60);
  assert.match(a.frames.find(frame => frame.type === 'screen-snapshot').data, /A-ONLY/);
  assert.doesNotMatch(a.frames.find(frame => frame.type === 'screen-snapshot').data, /B-ONLY/);
  await new Promise(resolve => { a.ws.once('close', resolve); a.ws.close(); });
  b.send({ type: 'input', data: 'B-alive' }); await delay(20);
  assert.equal(procs[1].writes.at(-1), 'B-alive');
});

test('same scratch id in two ordinary workspaces opens independent cwd and processes', async () => {
  const a = await open(views[0].instanceKey, '-scratch?id=same');
  const b = await open(views[1].instanceKey, '-scratch?id=same');
  assert.equal(scratchSpawns.length, 2);
  assert.equal(scratchSpawns[0].options.cwd, views[0].cwd);
  assert.equal(scratchSpawns[1].options.cwd, views[1].cwd);
  a.send({ type: 'input', data: 'scratch-a' }); b.send({ type: 'input', data: 'scratch-b' }); await delay(20);
  assert.deepEqual(scratchSpawns[0].proc.writes, ['scratch-a']);
  assert.deepEqual(scratchSpawns[1].proc.writes, ['scratch-b']);
});

test('native asks claim, replay, answers, cancellation and disconnect handoff stay with their owner', async () => {
  const calls = [[], []];
  for (let i = 0; i < 2; i++) registry.setRuntime(views[i].instanceKey, {
    getContext: () => ({ sessionId: `${i}-session` }),
    resolveRequestUserInput(id, answers) { calls[i].push(['answer', id, answers]); return true; },
    cancelRequestUserInput(id) { calls[i].push(['cancel', id]); return true; },
    releaseRequestUserInputToTui(id) { calls[i].push(['release', id]); return true; },
  });
  const a = await open(views[0].instanceKey), b = await open(views[1].instanceKey);
  const ids = views.map(view => `${view.instanceKey}:77`);
  for (let i = 0; i < 2; i++) assert.equal(server.offerCodexRequestUserInput({
    ...views[i], uiId: ids[i], questions: [{ id: 'q', question: 'pick', options: [] }],
  }), true);
  await delay(15);
  assert.equal(a.frames.filter(f => f.type === 'ask-hook-pending').length, 1);
  assert.equal(b.frames.filter(f => f.type === 'ask-hook-pending').length, 1);
  assert.deepEqual((await json('/api/pending-asks', views[0].instanceKey)).body.pendingAsks.map(ask => ask.id), [ids[0]]);
  b.send({ type: 'ask-hook-answer', id: ids[0], answers: { q: 'forged' } });
  b.send({ type: 'ask-cancel', id: ids[0] }); await delay(20);
  assert.equal(calls[0].length, 0);
  a.send({ type: 'ask-hook-answer', id: ids[0], answers: { q: 'own' } }); await delay(20);
  assert.deepEqual(calls[0][0], ['answer', ids[0], { q: 'own' }]);
  assert.ok(!b.frames.some(f => f.type === 'ask-hook-resolved' && f.id === ids[0]));
  // Other workspaces' GUI connections must not keep B's native question claimed.
  const bSockets = clients.filter(ws => ws.url.includes(views[1].instanceKey));
  await Promise.all(bSockets.map(ws => ws.readyState === WebSocket.CLOSED ? null : new Promise(resolve => {
    ws.once('close', resolve); ws.close();
  })));
  await delay(20);
  assert.deepEqual(calls[1], [['release', ids[1]]]);
  assert.equal((await json('/api/pending-asks', views[1].instanceKey)).body.pendingAsks.length, 0);
  assert.equal(server.offerCodexRequestUserInput({ ...views[1], uiId: ids[1], questions: [{ id: 'q' }] }), false);
});

test('loop events, debounce and terminal notifications do not cross native owners with equal turn ids', async () => {
  async function sse(key) {
    const controller = new AbortController();
    const response = await fetch(url('/events', key), { signal: controller.signal });
    const reader = response.body.getReader(); let text = '';
    const pump = (async () => {
      try { for (;;) { const { done, value } = await reader.read(); if (done) break; text += Buffer.from(value); } }
      catch (error) { if (error.name !== 'AbortError') throw error; }
    })();
    return { get text() { return text; }, async close() { controller.abort(); await pump; } };
  }
  const a = await sse(views[0].instanceKey), b = await sse(views[1].instanceKey);
  const wa = await open(views[0].instanceKey), wb = await open(views[1].instanceKey);
  try {
    const dataA = { ...views[0], sessionId: 'same-session', turnId: 'same-turn', turnStartedAt: Date.now() };
    const dataB = { ...views[1], sessionId: 'same-session', turnId: 'same-turn', turnStartedAt: Date.now() };
    server.broadcastPtyAgentLoopStart(dataA); server.broadcastPtyAgentLoopEnd(dataA);
    server.broadcastPtyAgentLoopStart(dataB);
    server.broadcastWsMessage({ type: 'owner-message', ...views[0] });
    server.broadcastWsMessage({ type: 'invalid-owner', instanceKey: 'cxv-' + '0'.repeat(36) });
    await delay(200);
    assert.match(a.text, /event: agent_loop_start/); assert.match(a.text, /event: turn_end/);
    assert.doesNotMatch(a.text, new RegExp(views[1].instanceKey));
    assert.match(b.text, /event: agent_loop_start/); assert.doesNotMatch(b.text, /event: turn_end/);
    assert.doesNotMatch(b.text, new RegExp(views[0].instanceKey));
    assert.ok(wa.frames.some(f => f.type === 'owner-message'));
    assert.ok(!wb.frames.some(f => f.type === 'owner-message'));
    assert.ok(!wa.frames.some(f => f.type === 'invalid-owner'));
    server.broadcastPtyAgentLoopEnd({ ...dataB, reason: 'interrupted' }); await delay(20);
    assert.match(b.text, /event: agent_loop_end/);
  } finally { await Promise.all([a.close(), b.close()]); }
});

test('scoped permission hooks are visible and answerable only by their native owner', async () => {
  const a = await open(views[0].instanceKey), b = await open(views[1].instanceKey);
  const pending = json('/api/perm-hook', views[1].instanceKey, {
    toolName: 'shell_command', input: { command: 'fixture command' }, forceManual: true,
  });
  const deadline = Date.now() + 2000;
  while (!b.frames.some(f => f.type === 'perm-hook-pending')) {
    assert.ok(Date.now() < deadline); await delay(5);
  }
  const question = b.frames.find(f => f.type === 'perm-hook-pending');
  assert.ok(!a.frames.some(f => f.type === 'perm-hook-pending'));
  a.send({ type: 'perm-hook-answer', id: question.id, decision: 'allow' }); await delay(20);
  assert.ok(!b.frames.some(f => f.type === 'perm-hook-resolved'));
  b.send({ type: 'perm-hook-answer', id: question.id, decision: 'deny' });
  const result = await pending; assert.equal(result.status, 200); assert.equal(result.body.decision, 'deny');
});

test('ordinary task HUD snapshots broadcast and reconnect only to their exact PTY owner', async () => {
  await Promise.all(clients.map(ws => ws.readyState === WebSocket.CLOSED ? null : new Promise(resolve => { ws.once('close', resolve); ws.close(); })));
  const tasks = views.map((view, i) => ({ type: 'sdk-task-snapshot', sessionId: view.sessionId,
    tasks: [{ taskId: 'task-' + i, subject: 'PRIVATE TASK ' + i, status: 'in_progress' }] }));
  for (let i = 0; i < 2; i++) registry.setRuntime(views[i].instanceKey, { ...registry.runtime(views[i].instanceKey), getTaskState: () => tasks[i] });
  const a = await open(views[0].instanceKey), b = await open(views[1].instanceKey);
  await delay(20);
  assert.ok(a.frames.some(f => f.type === 'sdk-task-snapshot' && f.tasks[0]?.subject === 'PRIVATE TASK 0'));
  assert.ok(b.frames.some(f => f.type === 'sdk-task-snapshot' && f.tasks[0]?.subject === 'PRIVATE TASK 1'));
  const aCount = a.frames.filter(f => f.type === 'sdk-task-snapshot').length;
  server.broadcastPtyTaskSnapshot({ ...tasks[1], ...views[1], tasks: [] });
  server.broadcastPtyTaskSnapshot({ ...tasks[1], instanceKey: views[0].instanceKey, cwd: views[1].cwd });
  await delay(20);
  assert.equal(a.frames.filter(f => f.type === 'sdk-task-snapshot').length, aCount);
  assert.deepEqual(b.frames.filter(f => f.type === 'sdk-task-snapshot').at(-1).tasks, []);
  server.broadcastPtyTaskSnapshot({ ...tasks[0], cwd: views[0].cwd }); await delay(20);
  assert.equal(a.frames.filter(f => f.type === 'sdk-task-snapshot').at(-1).instanceKey, views[0].instanceKey);
  const again = await open(views[1].instanceKey); await delay(20);
  assert.ok(again.frames.some(f => f.type === 'sdk-task-snapshot' && f.tasks[0]?.subject === 'PRIVATE TASK 1'));
  assert.ok(!again.frames.some(f => JSON.stringify(f).includes('PRIVATE TASK 0')));
});

test('editor open/status/done and reconnect replay are bound to the exact ordinary owner', async () => {
  await Promise.all(clients.map(ws => ws.readyState === WebSocket.CLOSED ? null : new Promise(resolve => { ws.once('close', resolve); ws.close(); })));
  const a = await open(views[0].instanceKey), b = await open(views[1].instanceKey);
  const id = 'same-editor-id', fileA = join(views[0].cwd, 'owner.txt'), fileB = join(views[1].cwd, 'owner.txt');
  assert.equal((await json('/api/editor-open', views[1].instanceKey, { sessionId: id, filePath: fileB, instanceKey: views[0].instanceKey, cwd: views[0].cwd })).status, 200);
  await delay(20); const event = b.frames.find(f => f.type === 'editor-open'); assert.equal(event.instanceKey, views[1].instanceKey); assert.equal(event.filePath, realpathSync(fileB));
  assert.ok(!a.frames.some(f => f.type === 'editor-open'));
  assert.equal((await json('/api/editor-status?id=' + id, views[0].instanceKey)).status, 404);
  assert.equal((await json('/api/editor-done', views[0].instanceKey, { sessionId: id })).status, 404);
  assert.equal((await json('/api/editor-status?id=' + id, views[1].instanceKey)).body.done, false);
  assert.equal((await json('/api/editor-open', views[1].instanceKey, { sessionId: id, filePath: fileB })).status, 409);
  assert.equal((await json('/api/editor-open', views[0].instanceKey, { sessionId: id, filePath: fileA })).status, 200);
  assert.equal((await json('/api/editor-done', views[0].instanceKey, { sessionId: id })).status, 200);
  assert.equal((await json('/api/editor-status?id=' + id, views[1].instanceKey)).body.done, false);
  const replay = await open(views[1].instanceKey); assert.ok(replay.frames.some(f => f.type === 'editor-open' && f.sessionId === id && f.filePath === realpathSync(fileB)));
  const n = replay.frames.filter(f => f.type === 'editor-open').length;
  replay.send({ type: 'resync-request', reason: 'requested' }); await delay(30);
  assert.ok(replay.frames.filter(f => f.type === 'editor-open').length > n);
  assert.equal((await json('/api/editor-done', views[1].instanceKey, { sessionId: id })).status, 200);
  const done = await open(views[1].instanceKey); assert.ok(!done.frames.some(f => f.type === 'editor-open'));
  for (const body of [{ sessionId: [], filePath: fileB }, { sessionId: 'bad-path', filePath: 'owner.txt' }, { sessionId: 'bad-dir', filePath: views[1].cwd }, { sessionId: 'null-path', filePath: fileB + '\0' }]) assert.equal((await json('/api/editor-open', views[1].instanceKey, body)).status, 400);
  mkdirSync(join(temp, 'codex'), { recursive: true }); writeFileSync(join(temp, 'codex', 'auth.json'), '{"OPENAI_API_KEY":"fixture-only"}');
  assert.equal((await json('/api/editor-open', views[1].instanceKey, { sessionId: 'private', filePath: join(temp, 'codex', 'auth.json') })).status, 403);
  const denied = await fetch(url('/api/editor-open', views[1].instanceKey), { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }, body: JSON.stringify({ sessionId: 'cross', filePath: fileB }) }); assert.equal(denied.status, 403);
});

test('ordinary busy queues replay per owner, park on Stop, wait for native approvals and never dispatch to a sibling or stale session', async () => {
  await Promise.all(clients.map(ws => ws.readyState === WebSocket.CLOSED ? null : new Promise(resolve => { ws.once('close', resolve); ws.close(); })));
  const native = views.map(() => ({ connected: true, active: true, pendingRequests: 0 }));
  for (let i = 0; i < 2; i++) registry.setRuntime(views[i].instanceKey, {
    getContext: () => ({ sessionId: `queue-session-${i}` }), getInputState: () => ({ ...native[i] }),
  });
  const wait = async predicate => { const end = Date.now() + 3000; while (!predicate()) { assert.ok(Date.now() < end, 'queue frame deadline'); await delay(10); } };
  const a = await open(views[0].instanceKey), b = await open(views[1].instanceKey);
  const baseline = procs.map(proc => proc.writes.length);
  const loop = (i, turnId) => ({ ...views[i], sessionId: `queue-session-${i}`, turnId, turnStartedAt: Date.now() });
  const first = [loop(0, 'queue-a'), loop(1, 'queue-b')]; first.forEach(data => server.broadcastPtyAgentLoopStart(data));
  a.send({ type: 'queue-message', requestId: 'request-a', text: 'queue-A' });
  b.send({ type: 'queue-message', requestId: 'request-b', text: 'queue-B' });
  await wait(() => a.frames.some(f => f.type === 'queue-message-accepted') && b.frames.some(f => f.type === 'queue-message-accepted'));
  assert.ok(a.frames.some(f => f.type === 'queue-state' && f.items.some(item => item.text === 'queue-A' && item.requestId === 'request-a')));
  assert.ok(!a.frames.some(f => f.type === 'queue-state' && f.items.some(item => item.text === 'queue-B')));
  assert.ok(!b.frames.some(f => f.type === 'queue-state' && f.items.some(item => item.text === 'queue-A')));
  const idB = b.frames.find(f => f.type === 'queue-message-accepted').id;
  b.send({ type: 'queue-suppress' }); native[1].active = false; server.broadcastPtyAgentLoopEnd(first[1]); await delay(220);
  assert.equal(procs[1].writes.length, baseline[1], 'Stop parks without clearing or auto-draining');
  b.send({ type: 'queue-send-now', id: idB }); await wait(() => procs[1].writes.length === baseline[1] + 2);
  assert.deepEqual(procs[1].writes.slice(baseline[1]), ['\x1b[200~queue-B\x1b[201~', '\r']);
  native[0].active = false; native[0].pendingRequests = 1; server.broadcastPtyAgentLoopEnd(first[0]); await delay(220);
  assert.equal(procs[0].writes.length, baseline[0], 'unclaimed native approval blocks injection');
  native[0].pendingRequests = 0; await wait(() => procs[0].writes.length === baseline[0] + 2);
  assert.deepEqual(procs[0].writes.slice(baseline[0]), ['\x1b[200~queue-A\x1b[201~', '\r']);
  native.forEach(state => { state.active = true; }); const second = [loop(0, 'second-a'), loop(1, 'second-b')]; second.forEach(data => server.broadcastPtyAgentLoopStart(data));
  a.send({ type: 'queue-message', requestId: 'second-a', text: 'A parked' }); b.send({ type: 'queue-message', requestId: 'second-b', text: 'B parked' });
  await wait(() => a.frames.some(f => f.requestId === 'second-a' && f.type === 'queue-message-accepted'));
  const idA = a.frames.find(f => f.requestId === 'second-a' && f.type === 'queue-message-accepted').id;
  b.send({ type: 'queue-send-now', id: idA }); b.send({ type: 'queue-send-now', id: idA, instanceKey: views[0].instanceKey });
  const reconnect = await open(views[0].instanceKey);
  await wait(() => reconnect.frames.some(f => f.type === 'queue-state' && f.items.some(item => item.id === idA)));
  assert.equal(reconnect.frames.find(f => f.type === 'queue-state' && f.items.some(item => item.id === idA)).items.find(item => item.id === idA).requestId, 'second-a');
  a.send({ type: 'queue-message', requestId: 'stale', text: 'wrong conversation', sessionId: 'stale-session' });
  await wait(() => a.frames.some(f => f.type === 'queue-rejected' && f.requestId === 'stale'));
  assert.equal(procs[0].writes.length, baseline[0] + 2);
  a.send({ type: 'queue-clear' }); await wait(() => a.frames.filter(f => f.type === 'queue-state').at(-1).items.length === 0);
  assert.ok(b.frames.filter(f => f.type === 'queue-state').at(-1).items.some(item => item.text === 'B parked'));
  b.send({ type: 'queue-clear' }); native.forEach(state => { state.active = false; }); second.forEach(data => server.broadcastPtyAgentLoopEnd(data));
  native[0].connected = false; a.send({ type: 'queue-message', requestId: 'disconnected', text: 'keep unsent' });
  await wait(() => a.frames.some(f => f.type === 'queue-rejected' && f.requestId === 'disconnected' && f.reason === 'unavailable'));
});

test('reviewer changes and automatic deferral use the selected runtime rather than boot state', async () => {
  await Promise.all(clients.map(ws => ws.readyState === WebSocket.CLOSED ? null : new Promise(resolve => {
    ws.once('close', resolve); ws.close();
  })));
  const bootUpdates = [], updates = []; let reviewer = 'auto_review';
  server.setActiveCodexApprovalsReviewer('auto_review', true);
  server.setCodexApprovalsReviewerUpdater(value => bootUpdates.push(value));
  registry.setRuntime(views[1].instanceKey, {
    getContext: () => ({ sessionId: 'b-session' }),
    getApprovalsReviewerState: () => ({ approvalsReviewer: reviewer, nativeAvailable: true, appliedToRuntime: true }),
    setApprovalsReviewer(value) { reviewer = value; updates.push(value); return { appliedToRuntime: true }; },
  });
  const a = await open(views[0].instanceKey), b = await open(views[1].instanceKey);
  const changed = await json('/api/approval-reviewer', views[1].instanceKey, { approvalsReviewer: 'user' });
  assert.equal(changed.body.appliedToRuntime, true); assert.deepEqual(updates, ['user']);
  assert.equal(bootUpdates.length, 1);
  assert.equal((await json('/api/approval-reviewer', views[0].instanceKey)).body.approvalsReviewer, 'auto_review');
  assert.equal((await json('/api/approval-reviewer', views[1].instanceKey)).body.approvalsReviewer, 'user');
  const pending = json('/api/perm-hook', views[1].instanceKey, { toolName: 'shell_command', input: { command: 'fixture' } });
  const deadline = Date.now() + 2000;
  while (!b.frames.some(f => f.type === 'perm-hook-pending')) { assert.ok(Date.now() < deadline); await delay(5); }
  assert.ok(!a.frames.some(f => f.type === 'approval-reviewer-changed' || f.type === 'perm-hook-pending'));
  b.send({ type: 'perm-hook-answer', id: b.frames.find(f => f.type === 'perm-hook-pending').id, decision: 'deny' });
  assert.equal((await pending).body.decision, 'deny');
  assert.equal((await json('/api/perm-hook', views[0].instanceKey, { toolName: 'shell_command', input: { command: 'fixture' } })).body.deferToCodex, true);
});

test('native launch API coalesces a cwd and close targets only that PTY, keeping boot and sibling alive', async () => {
  const spawned = []; const cwd = join(temp, 'new', 'same'); mkdirSync(cwd, { recursive: true });
  registry.setLauncher(async request => {
    spawned.push(request); const proc = fakeProcess(); request.proc = proc;
    request.pty._setPtyImportForTests(() => ({ spawn: () => proc }));
    await delay(20);
    await request.pty.spawnCodexRequest({ cwd: request.cwd, args: request.args,
      codexPath: '/bin/fake', serverPort: port });
    return { getContext: () => ({ sessionId: 'new-session' }), stop() { request.stopped = true; } };
  });
  const [first, second] = await Promise.all([json('/api/workspaces/launch', null, { path: cwd }),
    json('/api/workspaces/launch', null, { path: cwd })]);
  assert.equal(first.status, 200); assert.equal(first.body.ptyMode, true);
  assert.equal(first.body.instanceKey, second.body.instanceKey); assert.equal(spawned.length, 1);
  assert.equal(procs[0].killed, undefined); assert.equal(procs[1].killed, undefined);
  assert.equal(process.env.CXV_PROJECT_DIR, views[0].cwd);
  const listed = (await json('/api/workspaces', first.body.instanceKey)).body;
  assert.equal(listed.currentInstanceKey, first.body.instanceKey); assert.equal(listed.sessions.length, 3);
  const mode = (await json('/api/cli-mode', first.body.instanceKey)).body;
  assert.equal(mode.ptyMode, true); assert.equal(mode.sdkMode, false);
  const ws = await open(first.body.instanceKey); ws.send({ type: 'input', data: 'new-input' }); await delay(15);
  assert.equal(spawned[0].proc.writes.at(-1), 'new-input');
  assert.equal((await json('/api/workspaces/close', null, {})).status, 400);
  const close = new Promise(resolve => ws.ws.once('close', resolve));
  assert.equal((await json('/api/workspaces/close', null, { instanceKey: first.body.instanceKey })).status, 200);
  await close;
  assert.equal(spawned[0].stopped, true); assert.equal(spawned[0].proc.killed, true);
  assert.equal(procs[0].killed, undefined); assert.equal(procs[1].killed, undefined);
  assert.equal((await json('/api/project-dir')).body.dir, views[0].cwd);
  assert.equal((await json('/api/project-dir', first.body.instanceKey)).status, 404);
});

test('closing boot never retargets unanchored actions and stop-all retains launch configuration', async () => {
  assert.equal((await json('/api/workspaces/close', null, { instanceKey: boot.instanceKey })).status, 200);
  assert.equal((await json('/api/project-dir')).status, 404);
  assert.equal((await json('/api/project-dir', views[1].instanceKey)).body.dir, views[1].cwd);
  assert.equal(procs[1].killed, undefined);
  assert.equal((await json('/api/workspaces/stop', null, {})).status, 200);
  assert.equal(registry.list().length, 0); assert.equal(procs[1].killed, true);
  const cwd = join(temp, 'after-stop'); mkdirSync(cwd);
  const relaunched = await json('/api/workspaces/launch', null, { path: cwd });
  assert.equal(relaunched.status, 200); assert.equal(relaunched.body.ptyMode, true);
  assert.equal((await json('/api/project-dir', relaunched.body.instanceKey)).body.dir, cwd);
  assert.equal((await json('/api/project-dir')).status, 404);
});
