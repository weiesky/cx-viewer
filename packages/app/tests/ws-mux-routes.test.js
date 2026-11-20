import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import WebSocket from 'ws';
import { getV2TimelineWatcherStats, closeIdleV2TimelinePublishers } from '../lib/log-v2/timeline-watcher.js';

const root = mkdtempSync(join(tmpdir(), 'cxv-mux-routes-'));
const a = join(root, 'one', 'same'), b = join(root, 'two', 'same');
for (const cwd of [a, b]) mkdirSync(cwd, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROJECT_DIR: a, CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1',
  CXV_START_PORT: '21060', CXV_MAX_PORT: '21069' });
let server, sdk, interceptor, infoA, infoB, port, origin;
const sockets = [];
function append(info, index) {
  const entry = { timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    url: 'codex://mux/turn', mainAgent: true, _sdkSource: true,
    body: { model: 'fixture', metadata: { cwd: info.cwd, thread_id: info.instanceKey },
      input: [{ type: 'message', role: 'user', content: `prompt-${index}` }] },
    response: { status: 200, body: { content: [{ type: 'text', text: `answer-${index}` }] } } };
  const result = interceptor.appendLogEntry(entry, { source: 'sdk', cwd: info.cwd,
    sessionId: info.instanceKey, threadId: info.instanceKey });
  assert.equal(result.accepted, true, result.error?.message);
}

before(async () => {
  server = await import('../server.js'); sdk = await import('../lib/sdk-manager.js');
  interceptor = await import('../interceptor.js');
  interceptor.initForWorkspace(a);
  sdk.setSdkLaunchConfig({});
  infoA = sdk.initSdkSession(a, 'same', {}); infoB = sdk.launchSdkSession(b, 'same');
  append(infoA, 1); append(infoB, 1);
  await server.startViewer(); port = server.getPort(); origin = `http://127.0.0.1:${port}`;
});
after(async () => {
  for (const ws of sockets) ws.terminate();
  sdk?.stopSession(); sdk?.setSdkLaunchConfig(null); await server?.stopViewer();
  closeIdleV2TimelinePublishers(); rmSync(root, { recursive: true, force: true });
});

async function openMux({ headers = { Origin: origin }, query = '' } = {}) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/mux${query}`, { headers });
  sockets.push(ws);
  const frames = [], waiters = [];
  ws.on('message', raw => {
    const frame = JSON.parse(raw);
    const index = waiters.findIndex(waiter => waiter.match(frame));
    if (index < 0) frames.push(frame);
    else { const waiter = waiters.splice(index, 1)[0]; clearTimeout(waiter.timer); waiter.resolve(frame); }
  });
  ws.on('error', () => {});
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  return { ws, frames, send: frame => ws.send(JSON.stringify(frame)),
    receive(match) {
      const index = frames.findIndex(match);
      if (index >= 0) return Promise.resolve(frames.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { match, resolve, timer: setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('mux frame timed out'));
        }, 4000) };
        waiters.push(waiter);
      });
    } };
}
const named = (streamId, name) => frame => frame.type === 'frame' && frame.streamId === streamId && frame.name === name;
const ack = streamId => frame => frame.type === 'open-ack' && frame.streamId === streamId;
test('local log HTTP pages keep active/viewed projects separate and legacy grouping compatible', async () => {
  const grouped = await (await fetch(`${origin}/api/local-logs?instance=${infoA.instanceKey}`)).json();
  const active = grouped._currentProject;
  const other = Object.keys(grouped).find(key => !key.startsWith('_') && key !== active);
  assert.ok(other);
  const response = await fetch(`${origin}/api/local-logs?instance=${infoA.instanceKey}&page=0&pageSize=9999&project=${encodeURIComponent(other)}`);
  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 200);
  assert.equal(page._currentProject, active);
  assert.equal(page._viewedProject, other);
  assert.deepEqual(page.items, grouped[other]);
  for (const project of ['..', 'a/b', 'a\\b', '\0']) {
    assert.equal((await fetch(`${origin}/api/local-logs?instance=${infoA.instanceKey}&page=1&project=${encodeURIComponent(project)}`)).status, 400);
  }
  const missing = await (await fetch(`${origin}/api/local-logs?instance=${infoA.instanceKey}&page=1&project=missing&pageSize=abc`)).json();
  assert.equal(missing.pageSize, 50);
  assert.equal(missing.total, 0);
  assert.deepEqual(missing.items, []);
});
async function snapshot(info) {
  const response = await fetch(`${origin}/api/log-v2/snapshot?instance=${info.instanceKey}&limit=400`);
  assert.equal(response.status, 200);
  const frames = (await response.text()).trim().split('\n').map(JSON.parse);
  return { start: frames[0], cursor: frames.at(-1).cursor };
}

function sseProgress(info) {
  let req, res, carry = '';
  const ready = new Promise((resolve, reject) => {
    req = request(`${origin}/events?instance=${info.instanceKey}`, response => {
      res = response; response.setEncoding('utf8'); resolve();
    }); req.on('error', reject); req.end();
  });
  return { ready, async next() {
    await ready;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('SSE progress timed out')); }, 4000);
      const cleanup = () => { clearTimeout(timer); res.off('data', onData); };
      const onData = chunk => {
        carry += chunk;
        const match = carry.match(/event: stream-progress\ndata: ([^\n]+)\n\n/);
        if (match) { cleanup(); resolve(match[1]); }
      };
      res.on('data', onData);
    });
  }, close() { res?.destroy(); req?.destroy(); } };
}

test('real mux control and canonical live preserve scopes, SSE bytes, cursors and cleanup', { timeout: 15000 }, async () => {
  const mux = await openMux();
  for (const [streamId, info] of [['control-a', infoA], ['control-b', infoB]]) {
    mux.send({ type: 'open', streamId, qs: `controlOnly=1&instance=${info.instanceKey}` });
    await mux.receive(ack(streamId));
    const workspace = await mux.receive(named(streamId, 'sdk_workspace'));
    assert.equal(JSON.parse(workspace.data).instanceKey, info.instanceKey);
  }
  const frozen = await snapshot(infoA);
  const qs = new URLSearchParams({ instance: infoA.instanceKey, generation: frozen.start.archive.generation,
    handle: frozen.start.objectHandle, afterSeq: String(frozen.cursor.throughSeq) }).toString();
  mux.send({ type: 'open', streamId: 'live-a', path: '/api/log-v2/live', qs });
  await mux.receive(ack('live-a'));
  append(infoA, 2); // snapshot/subscribe race must replay from the original cursor.
  const live = JSON.parse((await mux.receive(named('live-a', 'v2_commit'))).data);
  assert.equal(live.frame.archive.projectId, frozen.start.archive.projectId);
  assert.equal(live.frame.timeline.seq, frozen.cursor.throughSeq + 1);

  const sse = sseProgress(infoA); await sse.ready;
  try {
    const plain = sse.next();
    server.sendSdkStreamProgress({ instanceKey: infoA.instanceKey, cwd: a, content: 'only-A' });
    const overMux = await mux.receive(named('control-a', 'stream-progress'));
    assert.equal(overMux.data, await plain, 'shared broadcaster emits byte-identical payloads');
    server.sendSdkStreamProgress({ instanceKey: infoB.instanceKey, cwd: b, content: 'only-B' });
    assert.equal(JSON.parse((await mux.receive(named('control-b', 'stream-progress'))).data).content, 'only-B');
    assert.ok(!mux.frames.some(frame => named('control-b', 'stream-progress')(frame) && JSON.parse(frame.data).content === 'only-A'));
  } finally { sse.close(); }

  mux.send({ type: 'open', streamId: 'forbidden-path', path: '/api/file-content', qs: 'path=secret' });
  assert.equal((await mux.receive(frame => frame.type === 'error' && frame.streamId === 'forbidden-path')).code, 4400);
  mux.send({ type: 'open', streamId: 'unknown-scope', qs: 'instance=stale-instance' });
  assert.equal((await mux.receive(frame => frame.type === 'error' && frame.streamId === 'unknown-scope')).code, 4503);
  mux.send({ type: 'open', streamId: 'wrong-scope', path: '/api/log-v2/live', qs: qs.replace(infoA.instanceKey, infoB.instanceKey) });
  assert.equal((await mux.receive(frame => frame.type === 'error' && frame.streamId === 'wrong-scope')).code, 4503);
  assert.equal(getV2TimelineWatcherStats().subscribers, 1, 'rejected scope cannot retain a live subscription');

  mux.send({ type: 'close', streamId: 'live-a' });
  mux.send({ type: 'close', streamId: 'control-a' });
  server.sendSdkStreamProgress({ instanceKey: infoB.instanceKey, cwd: b, content: 'sibling-survives' });
  assert.equal(JSON.parse((await mux.receive(named('control-b', 'stream-progress'))).data).content, 'sibling-survives');
  const deadline = Date.now() + 3000;
  while (getV2TimelineWatcherStats().subscribers) {
    assert.ok(Date.now() < deadline, 'closed stream must release its watcher');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  mux.ws.terminate();
});

test('mux upgrade retains browser Origin and native-token authorization boundaries', { timeout: 5000 }, async () => {
  await assert.rejects(openMux({ headers: {} }));
  await assert.rejects(openMux({ headers: { Origin: 'https://foreign.example' }, query: `?token=${server.getAccessToken()}` }));
  const native = await openMux({ headers: {}, query: `?token=${server.getAccessToken()}` });
  native.ws.terminate();
});

test('real shard cut resets live, pages and exports all parts, and scoped deletion preserves active streams', { timeout: 20000 }, async () => {
  const [{ LogV2Writer }, { resolveV2SessionFile }, { resolveAppServerThreadIdentity }, { parseV2SessionZip }] = await Promise.all([
    import('../lib/log-v2/writer.js'), import('../lib/log-v2/materializer.js'),
    import('../lib/log-v2/identity.js'), import('../lib/log-v2/archive-zip.js'),
  ]);
  const grouped = await (await fetch(`${origin}/api/local-logs?instance=${infoA.instanceKey}`)).json();
  const file = grouped[grouped._currentProject][0].file;
  const resolved = resolveV2SessionFile(join(root, 'logs'), file);
  const writerOptions = { rootDir: join(root, 'logs'), projectId: resolved.project.projectId,
    canonicalCwd: resolved.project.canonicalCwd, sessionId: infoA.instanceKey,
    rootThreadId: infoA.instanceKey, durability: 'buffered', shardPrompts: 2 };
  const writer = LogV2Writer.open(writerOptions);
  const identity = resolveAppServerThreadIdentity({ id: infoA.instanceKey, sessionId: infoA.instanceKey });
  const put = (target, owner, index) => target.append({ timestamp: `2026-01-01T00:01:0${index}Z`,
    url: 'codex://mux/shard', mainAgent: true, _sdkSource: true,
    body: { input: [{ type: 'message', role: 'user', content: `shard-prompt-${index}` }] },
    response: { status: 200, body: { content: [{ type: 'text', text: `shard-answer-${index}` }] } } }, owner);
  const mux = await openMux();
  const openLive = async (streamId, frozen) => {
    mux.send({ type: 'open', streamId, path: '/api/log-v2/live', qs: new URLSearchParams({
      instance: infoA.instanceKey, generation: frozen.start.archive.generation,
      handle: frozen.start.objectHandle, afterSeq: String(frozen.cursor.throughSeq),
    }).toString() });
    await mux.receive(ack(streamId));
  };
  const old = await snapshot(infoA);
  await openLive('before-cut', old);
  put(writer, identity, 3);
  await mux.receive(named('before-cut', 'v2_reset'));
  const fresh = await snapshot(infoA);
  assert.equal(fresh.cursor.throughSeq, 3);
  assert.equal(fresh.start.shard.part, 1);
  assert.equal(fresh.start.hasMore, true);
  await openLive('after-cut', fresh);
  const post = (path, body) => fetch(`${origin}${path}?instance=${infoA.instanceKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const pageBody = { handle: fresh.start.objectHandle, archive: fresh.start.archive, limit: 1 };
  const page = async body => {
    const response = await post('/api/log-v2/page', body);
    assert.equal(response.status, 200, await response.clone().text());
    return (await response.text()).trim().split('\n').map(JSON.parse);
  };
  const first = await page(pageBody);
  assert.ok(first.every(frame => !Object.hasOwn(frame, 'pageIndex')), 'server file locators stay off the wire');
  const repeat = await page(pageBody);
  assert.equal(first[0].pageToken, repeat[0].pageToken, 'unacknowledged older part is stable');
  const winner = first.find(frame => frame.kind.endsWith('.checkpoint')).winners[0];
  assert.equal(winner.descriptor.seq, 2);
  const hash = Object.values(winner.descriptor.parts)[0].hash;
  assert.equal((await post('/api/log-v2/objects', { ...pageBody, hashes: [hash] })).status, 200);
  const second = await page({ ...pageBody, ackPageToken: first[0].pageToken });
  assert.equal(second.find(frame => frame.kind.endsWith('.checkpoint')).winners[0].descriptor.seq, 1);
  assert.equal(second[0].hasMore, false);
  const zipResponse = await fetch(`${origin}/api/download-log?instance=${infoA.instanceKey}&file=${encodeURIComponent(file)}`);
  assert.equal(zipResponse.status, 200);
  assert.equal((await parseV2SessionZip(Buffer.from(await zipResponse.arrayBuffer()))).entries.length, 3);
  const historical = LogV2Writer.open({ ...writerOptions, sessionId: 'archived', rootThreadId: 'archived', shardPrompts: 1 });
  const archivedIdentity = resolveAppServerThreadIdentity({ id: 'archived', sessionId: 'archived' });
  put(historical, archivedIdentity, 1); put(historical, archivedIdentity, 2);
  assert.equal(existsSync(join(historical.sessionDir, 'parts/1')), true);
  const historicalFile = relative(join(root, 'logs'), join(historical.sessionDir, 'timeline.jsonl'));
  const deletion = await (await post('/api/delete-logs', { files: [file, historicalFile] })).json();
  assert.equal(deletion.results.find(row => row.file === file).ok, undefined, 'active session remains protected');
  assert.equal(deletion.results.find(row => row.file === historicalFile).ok, true);
  assert.equal(existsSync(historical.sessionDir), false, 'all frozen and active parts are deleted together');
  put(writer, identity, 4);
  assert.equal(JSON.parse((await mux.receive(named('after-cut', 'v2_commit'))).data).frame.timeline.seq, 4);
  mux.ws.terminate();
});
