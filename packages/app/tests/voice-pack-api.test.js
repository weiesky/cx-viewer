import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, linkSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'cxv-voice-api-'));
const logs = join(root, 'logs'), project = join(root, 'project');
mkdirSync(project); mkdirSync(logs);
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: logs,
  CXV_PROJECT_DIR: project, CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1',
  CXV_START_PORT: '20630', CXV_MAX_PORT: '20639', CXV_TEST: '1' });
process.env.CXV_TURN_END_DEBOUNCE_MS = '100';
let server, manager, port;
const wav = Buffer.alloc(44); wav.write('RIFF'); wav.write('WAVE', 8);
function call(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const bytes = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, bytes, json: () => JSON.parse(bytes) }); });
    });
    req.on('error', reject); req.end(body);
  });
}
function upload(data = wav, extra = {}, query = '') {
  const body = Buffer.concat([Buffer.from('--voice\r\nContent-Disposition: form-data; name="file"; filename="sample.wav"\r\nContent-Type: audio/wav\r\n\r\n'), data, Buffer.from('\r\n--voice--\r\n')]);
  return call('/api/voice-pack/upload' + query, { method: 'POST', body,
    headers: { 'content-type': 'multipart/form-data; boundary="voice"', 'content-length': body.length, ...extra } });
}
function prefs(value) {
  return call('/api/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
}
before(async () => {
  const plugins = join(logs, 'plugins'); mkdirSync(plugins);
  writeFileSync(join(plugins, 'pty-loop.mjs'), `import { appendFileSync } from 'node:fs';
const record = (phase, data) => appendFileSync(${JSON.stringify(join(root, 'loop-hooks.jsonl'))}, JSON.stringify({ phase, ...data }) + '\\n');
export default { name: 'isolated PTY loop observer', hooks: {
 onAgentLoopStart(data) { record('start', data); }, onAgentLoopEnd(data) { record('end', data); }
} };`);
  manager = await import('../server/lib/voice-pack-manager.js');
  server = await import('../server.js'); await server.startViewer(); port = server.getPort();
});

async function events() {
  const frames = [], waiters = []; let buffer = '';
  const req = request({ hostname: '127.0.0.1', port, path: '/events?controlOnly=1' });
  const ready = new Promise((resolve, reject) => {
    req.on('error', reject);
    req.on('response', res => {
      assert.equal(res.statusCode, 200); res.setEncoding('utf8');
      res.on('data', chunk => {
        buffer += chunk; let index;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const raw = buffer.slice(0, index); buffer = buffer.slice(index + 2);
          const type = raw.match(/^event: (.+)$/m)?.[1], data = raw.match(/^data: (.+)$/m)?.[1];
          if (!type || !data) continue;
          const frame = { type, data: JSON.parse(data), receivedAt: Date.now() }; frames.push(frame);
          for (const waiter of [...waiters]) if (waiter.type === type && waiter.matches(frame.data)) waiter.resolve(frame);
        }
      }); resolve();
    }); req.end();
  });
  await ready;
  const next = (type, matches = () => true) => {
    const found = frames.find(frame => frame.type === type && matches(frame.data));
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const waiter = { type, matches, resolve(frame) { clearTimeout(timer); waiters.splice(waiters.indexOf(waiter), 1); resolve(frame); } };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('missing SSE ' + type)); }, 3000);
      waiters.push(waiter);
    });
  };
  return { frames, next, close: () => req.destroy() };
}

async function ptyLoopFixture(t) {
  const bridge = await import('../lib/appserver-bridge.js');
  bridge._resetAppServerBridgeForTests({ cwd: project, writeLogEntry() {},
    onAgentLoopStart: server.broadcastPtyAgentLoopStart, onAgentLoopEnd: server.broadcastPtyAgentLoopEnd });
  const clients = [];
  t.after(() => { clients.forEach(client => client.close()); bridge._resetAppServerBridgeForTests(); });
  const connect = async () => { const client = await events(); clients.push(client); return client; };
  let id = 100;
  const start = turnId => {
    bridge._parseAppServerClientMessageForTests({ id: ++id, method: 'turn/start', params: { threadId: 'owned-root', input: [] } });
    bridge._parseAppServerServerMessageForTests({ id, result: { turn: { id: turnId } } });
    bridge._parseAppServerServerMessageForTests({ method: 'turn/started', params: { threadId: 'owned-root', turn: { id: turnId } } });
  };
  const end = (turnId, status = 'completed') => bridge._parseAppServerServerMessageForTests({ method: 'turn/completed',
    params: { threadId: 'owned-root', turn: { id: turnId, status } } });
  return { bridge, connect, start, end };
}

test('ordinary TUI boundaries reach original SSE/plugin hooks; loading is immediate and voice remains debounced', async t => {
  const f = await ptyLoopFixture(t), client = await f.connect();
  assert.equal((await client.next('server_config')).data.turnEndDebounceMs, 100);
  f.start('ordinary-one');
  const begin = await client.next('agent_loop_start'); assert.equal(begin.data.mode, 'pty'); assert.equal(begin.data.turnId, 'ordinary-one');
  assert.equal((await client.next('turn_active', data => data.active)).data.active, true);
  const replay = await f.connect(); assert.equal((await replay.next('turn_active')).data.active, true);
  assert.equal(replay.frames.some(frame => frame.type === 'agent_loop_start'), false, 'attach restores state without ringing a past start');
  const endedAt = Date.now(); f.end('ordinary-one');
  await client.next('turn_active', data => data.active === false && data.turnId === 'ordinary-one');
  const end = await client.next('agent_loop_end'); assert.ok(end.receivedAt - endedAt >= 90);
  const legacy = await client.next('turn_end'); assert.equal(legacy.data.ts, end.data.ts);
  assert.equal(end.data.reason, 'stop-hook');
  const hooks = readFileSync(join(root, 'loop-hooks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
    .filter(frame => frame.turnId === 'ordinary-one');
  assert.deepEqual(hooks.map(frame => frame.phase), ['start', 'end']); assert.ok(hooks.every(frame => frame.mode === 'pty'));
});

test('new TUI input cancels the prior tail cue; interrupted boundary is immediate and foreign cwd is rejected', async t => {
  const f = await ptyLoopFixture(t), client = await f.connect();
  server.broadcastPtyAgentLoopStart({ cwd: root, sessionId: 'foreign', turnId: 'foreign' });
  f.start('ordinary-old'); f.end('ordinary-old'); f.start('ordinary-next'); f.end('ordinary-next', 'interrupted');
  await client.next('agent_loop_end', data => data.turnId === 'ordinary-next');
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal(client.frames.some(frame => frame.type === 'agent_loop_start' && frame.data.turnId === 'foreign'), false);
  assert.equal(client.frames.some(frame => frame.type === 'agent_loop_end' && frame.data.turnId === 'ordinary-old'), false);
  assert.equal(client.frames.some(frame => frame.type === 'turn_end'), false);
});

test('in-process server restart silently restores an active bridge turn and can emit its later end', async t => {
  const f = await ptyLoopFixture(t), client = await f.connect(); f.start('ordinary-restart');
  await client.next('agent_loop_start'); client.close(); await server.stopViewer(); await server.startViewer(); port = server.getPort();
  const after = await f.connect(); assert.equal((await after.next('turn_active')).data.active, true);
  assert.equal(after.frames.some(frame => frame.type === 'agent_loop_start'), false);
  f.end('ordinary-restart'); assert.equal((await after.next('agent_loop_end')).data.turnId, 'ordinary-restart');
});
after(async () => { await server?.stopViewer(); rmSync(root, { recursive: true, force: true }); });

test('existing bundled manifest names resolve to exact bytes with Range and cache validation', async () => {
  const listed = await call('/api/voice-pack/list'); assert.equal(listed.status, 200);
  const data = listed.json(); assert.equal(data.maxBytes, 2 * 1024 * 1024);
  assert.deepEqual(data.bundledPacks.map(pack => pack.id), ['default', 'sanguo']);
  for (const pack of data.bundledPacks) for (const { eventKey } of pack.events) {
    const path = `/api/voice-pack/audio/${pack.id}/${eventKey}`;
    const full = await call(path); assert.equal(full.status, 200);
    assert.deepEqual(full.bytes, readFileSync(manager.getBundledPackPath(pack.id, eventKey).path));
    assert.equal(full.headers['accept-ranges'], 'bytes');
    const range = await call(path, { headers: { range: 'bytes=2-7' } });
    assert.equal(range.status, 206); assert.deepEqual(range.bytes, full.bytes.subarray(2, 8));
    const cached = await call(path, { headers: { 'if-none-match': full.headers.etag } });
    assert.equal(cached.status, 304); assert.equal(cached.bytes.length, 0);
    assert.equal((await call(path, { headers: { range: `bytes=${full.bytes.length}-` } })).status, 416);
  }
});

test('real multipart upload lists, plays, binds, deep-merges and reconciles after deletion', async () => {
  const saved = await upload(); assert.equal(saved.status, 200); const { id } = saved.json();
  assert.equal((await call('/api/voice-pack/list')).json().userAudio[0].id, id);
  assert.deepEqual((await call(`/api/voice-pack/audio/${id}`)).bytes, wav);
  assert.equal((await prefs({ approvalModal: { modalEnabled: false, voicePack: { enabled: true, volume: 0.4,
    events: { askQuestion: id, planApproval: 'sanguo' } } } })).status, 200);
  await prefs({ approvalModal: { voicePack: { events: { turnEnd: 'default', constructor: 'bad', unexpected: id } } } });
  const before = (await call('/api/preferences')).json().approvalModal;
  assert.equal(before.modalEnabled, false); assert.equal(before.voicePack.volume, 0.4);
  assert.deepEqual(before.voicePack.events, { planApproval: 'sanguo', askQuestion: id, turnEnd: 'default' });
  assert.equal((await call(`/api/voice-pack/delete/${id}`, { method: 'DELETE' })).status, 200);
  const raw = readFileSync(join(logs, 'preferences.json'), 'utf8');
  assert.equal((await call('/api/preferences')).json().approvalModal.voicePack.events.askQuestion, null);
  assert.equal(readFileSync(join(logs, 'preferences.json'), 'utf8'), raw, 'GET reconcile must remain read-only');
  assert.equal((await call(`/api/voice-pack/audio/${id}`)).status, 404);
  await prefs({ approvalModal: { soundEnabled: true, voicePack: { volume: 0.6 } } });
  const after = JSON.parse(readFileSync(join(logs, 'preferences.json'))).approvalModal;
  assert.equal(after.voicePack.events.askQuestion, null); assert.equal(after.voicePack.events.planApproval, 'sanguo');
  assert.equal(after.voicePack.enabled, true); assert.equal(after.modalEnabled, false);
});

test('rejects forged audio, oversized bodies, missing multipart boundaries and unknown path keys', async () => {
  assert.equal((await upload(Buffer.from('not an audio payload'))).status, 415);
  assert.equal((await upload(Buffer.alloc(manager.MAX_AUDIO_BYTES + 1))).status, 413);
  assert.equal((await call('/api/voice-pack/upload', { method: 'POST', body: wav })).status, 400);
  for (const path of ['default/constructor', 'default/..%2Fsecret', 'unknown/askQuestion', 'bad-id']) {
    assert.equal((await call(`/api/voice-pack/audio/${path}`)).status, 404);
  }
  assert.equal((await call('/api/voice-pack/delete/bad-id', { method: 'DELETE' })).status, 400);
});

test('same-origin gate and loopback mutation gate apply to every voice endpoint', async () => {
  assert.equal((await upload(wav, { origin: 'http://evil.example' })).status, 403);
  const token = server.getAccessToken();
  const host = 'shared.invalid';
  assert.equal((await call(`/api/voice-pack/list?token=${token}`, { headers: { host } })).status, 200);
  assert.equal((await upload(wav, { host }, `?token=${token}`)).status, 403);
  assert.equal((await call(`/api/voice-pack/delete/12345678?token=${token}`, { method: 'DELETE', headers: { host } })).status, 403);
});

test('user audio symlinks, private hard links, directories and symlinked upload roots cannot expose files', async () => {
  const dir = join(logs, 'voice-packs');
  const outside = join(root, 'outside.wav'); writeFileSync(outside, wav);
  symlinkSync(outside, join(dir, '11111111.wav'));
  linkSync(join(logs, 'preferences.json'), join(dir, '22222222.wav'));
  mkdirSync(join(dir, '33333333.wav'));
  for (const id of ['11111111', '22222222', '33333333']) {
    assert.equal((await call(`/api/voice-pack/audio/${id}`)).status, 404);
  }
  assert.equal((await call('/api/voice-pack/list')).json().userAudio.length, 0);
  renameSync(dir, `${dir}.held`); symlinkSync(root, dir);
  try {
    assert.equal((await call('/api/voice-pack/audio/11111111')).status, 500);
    assert.equal((await upload()).status, 400);
  } finally { rmSync(dir); renameSync(`${dir}.held`, dir); }
  assert.deepEqual(readFileSync(outside), wav);
});
