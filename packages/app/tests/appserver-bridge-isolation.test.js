import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { createAppServerBridge } from '../lib/appserver-bridge.js';

const server = (bridge, method, params) => bridge._parseAppServerServerMessageForTests({ method, params }, 'same-connection');
const client = (bridge, id, method, params) => bridge._parseAppServerClientMessageForTests({ id, method, params }, 'same-connection');

test('independent native bridges keep same-numbered RPC, loop and transcript state in their workspace', () => {
  const a = createAppServerBridge(), b = createAppServerBridge();
  const entries = [[], []], loops = [[], []];
  for (const [index, bridge] of [a, b].entries()) {
    bridge._resetAppServerBridgeForTests({ cwd: `/fixture/${index}/same`, project: 'same',
      writeLogEntry: (entry, context) => { entries[index].push({ entry, context }); return { written: true }; },
      onAgentLoopStart: data => loops[index].push(data) });
    const threadId = `thread-${index}`;
    server(bridge, 'thread/started', { thread: { id: threadId, sessionId: threadId } });
    client(bridge, 1, 'turn/start', { threadId, input: [{ type: 'text', text: `input-${index}` }] });
    bridge._parseAppServerServerMessageForTests({ id: 1, result: { turn: { id: `turn-${index}`, status: 'inProgress' } } }, 'same-connection');
    server(bridge, 'item/completed', { threadId, turnId: `turn-${index}`, item: { id: 'answer', type: 'agentMessage', text: `answer-${index}` } });
    server(bridge, 'turn/completed', { threadId, turn: { id: `turn-${index}`, status: 'completed' } });
  }
  assert.equal(a.getAppServerRuntimeContext().threadId, 'thread-0');
  assert.equal(b.getAppServerRuntimeContext().threadId, 'thread-1');
  for (const [index, rows] of entries.entries()) {
    assert.ok(rows.length > 0);
    assert.ok(rows.every(row => row.context.cwd === `/fixture/${index}/same`));
    assert.ok(!JSON.stringify(rows).includes(`answer-${1 - index}`));
    assert.equal(loops[index][0].cwd, `/fixture/${index}/same`);
  }
  a._resetAppServerBridgeForTests();
  assert.equal(b.getAppServerRuntimeContext().threadId, 'thread-1');
  const packet = { id: 1, method: 'turn/start', params: {} };
  a.setApprovalsReviewer('auto_review'); b.setApprovalsReviewer('user');
  assert.equal(a._injectApprovalsReviewerForTests(packet).params.approvalsReviewer, 'auto_review');
  assert.equal(b._injectApprovalsReviewerForTests(packet).params.approvalsReviewer, 'user');
  b._resetAppServerBridgeForTests();
});

test('raw sidecars and RPC route maps are not shared between bridge owners', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-bridge-raw-'));
  const bridges = [createAppServerBridge(), createAppServerBridge()];
  try {
    for (const [i, bridge] of bridges.entries()) {
      const dir = join(root, String(i)); mkdirSync(dir);
      bridge._resetAppServerBridgeForTests({ rawDir: dir, cwd: `/fixture/${i}/same`, project: 'same' });
      client(bridge, 4, 'thread/start', { cwd: `/fixture/${i}/same`, model: `model-${i}` });
      bridge._parseAppServerServerMessageForTests({ id: 4, result: { thread: { id: `native-${i}` } } }, 'same-connection');
      bridge._flushAppServerRawSidecarsForTests();
    }
    const raw = dir => readdirSync(dir, { recursive: true }).filter(name => name.endsWith('.jsonl')).map(name => readFileSync(join(dir, name), 'utf8')).join('\n');
    assert.match(raw(join(root, '0')), /model-0/); assert.doesNotMatch(raw(join(root, '0')), /model-1|native-1/);
    assert.match(raw(join(root, '1')), /model-1/); assert.doesNotMatch(raw(join(root, '1')), /model-0|native-0/);
    bridges[0].resetRawCaptureBoundary();
    assert.equal(bridges[1].getAppServerRuntimeContext().threadId, 'native-1');
  } finally { bridges.forEach(bridge => bridge._resetAppServerBridgeForTests()); rmSync(root, { recursive: true, force: true }); }
});

function rpc(socket, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('message', receive); reject(new Error('fixture RPC timeout')); }, 4000);
    function receive(raw) { const frame = JSON.parse(raw); if (frame.id === id) { clearTimeout(timer); socket.off('message', receive); resolve(frame.result); } }
    socket.on('message', receive); socket.send(JSON.stringify({ id, method, params }));
  });
}

function nativeFixtureSource(wsPath) {
  return `const {createServer}=require('node:http'); const {WebSocketServer}=require(${JSON.stringify(wsPath)}); const {basename,dirname}=require('node:path');
const url=new URL(process.argv.find(arg=>arg.startsWith('ws://'))), label=basename(dirname(process.cwd())), started=Date.now();
if(process.env.FIXTURE_PID_FILE)require('node:fs').writeFileSync(process.env.FIXTURE_PID_FILE,String(process.pid));
const server=createServer((req,res)=>{res.writeHead(Date.now()-started<Number(process.env.FIXTURE_READY_DELAY_MS||0)?503:200);res.end('ready');});
new WebSocketServer({server}).on('connection',socket=>socket.on('message',raw=>{const f=JSON.parse(raw);let result={label};
if(f.method==='thread/start')result={thread:{id:'thread-'+label}};
if(f.method==='turn/start')result={turn:{id:'turn-'+label,status:'inProgress'}};
socket.send(JSON.stringify({id:f.id,result}));}));server.listen(Number(url.port),'127.0.0.1');`;
}

test('two real bridge proxies keep independent native children and stopping A leaves B alive', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-bridge-process-'));
  const dirs = [join(root, 'one/same'), join(root, 'two/same')]; dirs.forEach(dir => mkdirSync(dir, { recursive: true }));
  const fixture = join(root, 'native-fixture.js');
  const wsPath = createRequire(import.meta.url).resolve('ws');
  writeFileSync(fixture, nativeFixtureSource(wsPath));
  const owners = [createAppServerBridge(), createAppServerBridge()], running = [], sockets = [];
  try {
    for (const [i, owner] of owners.entries()) {
      running[i] = await owner.startAppServerBridge({ cwd: dirs[i], codexPath: fixture, rawDir: join(root, `raw-${i}`),
        env: { ...process.env, HOME: root, CODEX_HOME: join(root, 'codex'), HTTPS_PROXY: 'http://fixture.invalid' } });
      assert.equal(owner.getAppServerInputState().connected, false);
      const socket = new WebSocket(`ws://127.0.0.1:${running[i].proxyPort}`); sockets.push(socket);
      await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
      const thread = await rpc(socket, 1, 'thread/start', { cwd: dirs[i] });
      await rpc(socket, 2, 'turn/start', { threadId: thread.thread.id, input: [] });
      assert.equal(owner.getAppServerInputState().connected, true);
      assert.equal(owner.getAppServerInputState().active, true);
    }
    assert.equal(owners[0].getAppServerRuntimeContext().threadId, 'thread-one');
    assert.equal(owners[1].getAppServerRuntimeContext().threadId, 'thread-two');
    await running[0].stop();
    assert.equal(owners[0].getAppServerInputState().connected, false);
    assert.equal((await fetch(`http://127.0.0.1:${running[1].appServerPort}/readyz`)).status, 200);
    assert.deepEqual(await rpc(sockets[1], 3, 'fixture/ping'), { label: 'two' });
  } finally {
    sockets.forEach(socket => socket.terminate()); await Promise.all(running.map(runtime => runtime.stop()));
    rmSync(root, { recursive: true, force: true });
  }
});


test('cancelling native startup rejects and reaps its child before readiness', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-bridge-cancel-'));
  const path = join(root, 'native-fixture.js'), pidFile = join(root, 'pid');
  writeFileSync(path, nativeFixtureSource(createRequire(import.meta.url).resolve('ws')));
  const owner = createAppServerBridge(), controller = new AbortController(); let runtime;
  const pending = owner.startAppServerBridge({ cwd: root, codexPath: path, rawDir: join(root, 'raw'),
    signal: controller.signal, env: { ...process.env, HOME: root, CODEX_HOME: join(root, 'codex'),
      HTTPS_PROXY: 'http://fixture.invalid', FIXTURE_PID_FILE: pidFile, FIXTURE_READY_DELAY_MS: '1000' } })
    .then(value => { runtime = value; return value; });
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  try {
    const deadline = Date.now() + 4000;
    while (!existsSync(pidFile)) { assert.ok(Date.now() < deadline); await new Promise(resolve => setTimeout(resolve, 10)); }
    const pid = Number(readFileSync(pidFile, 'utf8'));
    controller.abort(); await rejection;
    while (true) {
      try { process.kill(pid, 0); } catch (error) { assert.equal(error.code, 'ESRCH'); break; }
      assert.ok(Date.now() < deadline, 'cancelled native process must be reaped');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } finally { await pending.catch(() => {}); runtime?.stop(); rmSync(root, { recursive: true, force: true }); }
});

test('a pre-aborted owner cannot start a native child or mutate bridge state', async () => {
  const owner = createAppServerBridge(), controller = new AbortController(); controller.abort();
  await assert.rejects(owner.startAppServerBridge({ signal: controller.signal,
    cwd: '/fixture/not-created', codexPath: '/fixture/not-executed' }), { name: 'AbortError' });
  assert.equal(owner.getAppServerRuntimeContext().threadId, null);
  assert.deepEqual(owner.getAppServerAgentLoopSnapshot(), []);
});

test('native executable spawn errors reject through startup cleanup instead of an unhandled child error', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-bridge-spawn-error-'));
  try {
    const owner = createAppServerBridge();
    await assert.rejects(owner.startAppServerBridge({ cwd: root, codexPath: join(root, 'missing-native'),
      env: { ...process.env, HOME: root, CODEX_HOME: join(root, 'codex'), HTTPS_PROXY: 'http://fixture.invalid' } }), { code: 'ENOENT' });
    assert.deepEqual(owner.getAppServerAgentLoopSnapshot(), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('stopping a bridge reaps its native process and tool child even when both ignore SIGTERM', { timeout: 10000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-bridge-tree-'));
  const path = join(root, 'native-fixture.js'), pidFile = join(root, 'tree.json');
  writeFileSync(path, nativeFixtureSource(createRequire(import.meta.url).resolve('ws')) + `
process.on('SIGTERM',()=>{});
const child=require('node:child_process').spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});
require('node:fs').writeFileSync(${JSON.stringify(pidFile)},JSON.stringify([process.pid,child.pid]));
`);
  const owner = createAppServerBridge(); let runtime, pids = [];
  try {
    runtime = await owner.startAppServerBridge({ cwd: root, codexPath: path, rawDir: join(root, 'raw'),
      env: { ...process.env, HOME: root, CODEX_HOME: join(root, 'codex'), HTTPS_PROXY: 'http://fixture.invalid' } });
    pids = JSON.parse(readFileSync(pidFile)); await new Promise(resolve => setTimeout(resolve, 100));
    await runtime.stop();
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally {
    for (const pid of pids.reverse()) try { process.kill(pid, 'SIGKILL'); } catch {}
    await runtime?.stop(); rmSync(root, { recursive: true, force: true });
  }
});


test('native input safety state counts unresolved TUI-only questions without exposing their payload and stays per owner', () => {
  const a = createAppServerBridge(), b = createAppServerBridge();
  for (const owner of [a, b]) owner._resetAppServerBridgeForTests();
  a._parseAppServerServerMessageForTests({ id: 77, method: 'item/tool/requestUserInput', params: { threadId: 'root', turnId: 'turn', itemId: 'ask', questions: [{ id: 'q', question: 'private question' }] } });
  assert.equal(a.getAppServerInputState().pendingRequests, 1); assert.equal(b.getAppServerInputState().pendingRequests, 0);
  assert.equal(JSON.stringify(a.getAppServerInputState()).includes('private question'), false);
  a._parseAppServerClientMessageForTests({ id: 77, result: { answers: {} } });
  assert.equal(a.getAppServerInputState().pendingRequests, 0);
});

test('proxy roles require an owned native root ancestry and reject unknown, foreign and title threads', () => {
  const a = createAppServerBridge(), b = createAppServerBridge();
  try {
    for (const [bridge, root] of [[a, 'a'], [b, 'b']]) {
      bridge._resetAppServerBridgeForTests({ cwd: '/fixture/' + root });
      server(bridge, 'thread/started', { thread: { id: root } });
      server(bridge, 'thread/started', { thread: { id: root + '-child', source: { subAgent: { thread_spawn: { parent_thread_id: root } } } } });
      server(bridge, 'thread/started', { thread: { id: root + '-nested', source: { subAgent: { thread_spawn: { parent_thread_id: root + '-child' } } } } });
      assert.equal(bridge.getNativeProxyRole(root), 'main');
      assert.equal(bridge.getNativeProxyRole(root + '-child'), 'subagent');
      assert.equal(bridge.getNativeProxyRole(root + '-nested'), 'subagent');
    }
    assert.equal(a.getNativeProxyRole('b-child'), null);
    assert.equal(a.getNativeProxyRole('made-up-subagent'), null);
    server(a, 'thread/started', { thread: { id: 'title', ephemeral: true, threadSource: 'thread_title' } });
    assert.equal(a.getNativeProxyRole('title'), null);
    server(a, 'thread/started', { thread: { id: 'foreign-parent', source: { subAgent: { thread_spawn: { parent_thread_id: 'other-owner' } } } } });
    assert.equal(a.getNativeProxyRole('foreign-parent'), null);
    a._resetAppServerBridgeForTests();
    assert.equal(a.getNativeProxyRole('a-child'), null);
    assert.equal(b.getNativeProxyRole('b-child'), 'subagent');
  } finally { a._resetAppServerBridgeForTests(); b._resetAppServerBridgeForTests(); }
});
