import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';

const temp = mkdtempSync(join(tmpdir(), 'cxv-terminal-ws-'));
process.env.CXV_LOG_DIR = temp;
process.env.CXV_PROJECT_DIR = temp;
process.env.CXV_START_PORT = '19940';
process.env.CXV_MAX_PORT = '19949';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';
process.env.HTTPS_PROXY = 'http://proxy.invalid';
process.env.HOME = temp;

let server;
let ptyManager;
let scratchManager;
let fakeProc;
let scratchProc;
let port;

function fakeProcess() {
  return {
    writes: [], resizeCalls: [],
    onData(cb) { this.dataCb = cb; }, onExit(cb) { this.exitCb = cb; },
    write(data) { this.writes.push(data); }, resize(cols, rows) { this.resizeCalls.push({ cols, rows }); },
    kill() { this.killed = true; }, emitData(data) { this.dataCb?.(data); },
    emitExit(exitCode) { this.exitCb?.({ exitCode }); },
  };
}

async function openClient(path = '/ws/terminal') {
  const messages = [];
  const waiters = [];
  const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, {
    headers: { Origin: `http://127.0.0.1:${port}` },
  });
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());
    const index = waiters.findIndex(waiter => waiter.type === message.type);
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
    else messages.push(message);
  });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  const receive = (type, timeoutMs = 2000) => {
    const found = messages.findIndex(message => message.type === type);
    if (found >= 0) return Promise.resolve(messages.splice(found, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { type, resolve: message => { clearTimeout(timer); resolve(message); } };
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), timeoutMs);
      waiters.push(waiter);
    });
  };
  return { socket, receive, async close() {
    if (socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise(resolve => socket.once('close', resolve));
    socket.close(); await closed;
  } };
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject); req.end();
  });
}

function postUpload(filename, content) {
  const boundary = `cxv-test-${Date.now()}`;
  const body = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n`
    + 'Content-Type: image/png\r\n\r\n'
    + content
    + `\r\n--${boundary}--\r\n`,
  );
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1', port, path: '/api/upload', method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, res => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(responseBody) }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

before(async () => {
  ptyManager = await import('../pty-manager.js');
  scratchManager = await import('../scratch-pty-manager.js');
  ptyManager._resetPtyManagerForTests();
  ptyManager._setPtyImportForTests(() => ({ spawn() { fakeProc = fakeProcess(); return fakeProc; } }));
  scratchManager._setScratchPtyLoaderForTests(async () => ({ spawn() { scratchProc = fakeProcess(); return scratchProc; } }));
  await ptyManager.spawnCodex(null, temp, [], '/bin/codex-fake', false, 7008);
  fakeProc.emitData('\x1b[2J\x1b[HINITIAL');
  server = await import('../server.js');
  await server.startViewer();
  port = server.getPort();
});

after(async () => {
  await server?.stopViewer();
  scratchManager?._resetScratchPtysForTests();
  ptyManager?._resetPtyManagerForTests();
  rmSync(temp, { recursive: true, force: true });
});

test('connection starts at the current cursor and receives only new PTY bytes', async () => {
  const client = await openClient();
  const state = await client.receive('state');
  assert.ok(state.throughSeq >= 1);
  fakeProc.emitData('LIVE');
  const live = await client.receive('data');
  assert.equal(live.data, 'LIVE');
  assert.equal(live.seq, state.throughSeq + 1);
  await client.close();
});

test('resync returns a rendered current screen instead of raw history', async () => {
  const client = await openClient();
  await client.receive('state');
  client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'requested' }));
  const sync = await client.receive('screen-snapshot');
  assert.equal(typeof sync.throughSeq, 'number');
  assert.equal(typeof sync.data, 'string');
  assert.match(sync.data, /LIVE/);
  await client.close();
});

test('resync stays bounded to the rendered screen after large historical output', async () => {
  const client = await openClient();
  try {
    await client.receive('state');
    fakeProc.emitData('R'.repeat(2 * 1024 * 1024 + 4096));
    await client.receive('data');
    client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'requested' }));
    const sync = await client.receive('screen-snapshot', 5000);
    assert.equal(typeof sync.data, 'string');
    assert.ok(Buffer.byteLength(sync.data) < 256 * 1024);
  } finally {
    await client.close();
  }
});

test('partial VT state is never published as a screen and recovers after completion', async () => {
  const client = await openClient();
  try {
    await client.receive('state');
    fakeProc.emitData('\x1b[');
    await client.receive('data');
    client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'requested' }));
    assert.equal((await client.receive('screen-unavailable')).reason, 'unsafe-parser-state');
    fakeProc.emitData('2J\x1b[HSAFE');
    const screen = await client.receive('screen-snapshot', 3000);
    assert.equal(screen.safe, true);
    assert.match(screen.data, /SAFE/);
  } finally {
    await client.close();
  }
});

test('terminal recovery endpoint exposes cursor metadata without PTY history', async () => {
  const response = await getJson('/api/terminal-recovery');
  assert.equal(response.status, 200);
  assert.equal(response.body.available, true);
  assert.equal(typeof response.body.throughSeq, 'number');
  assert.equal('data' in response.body, false);
});

test('large terminal rendering does not block file-list HTTP handling', async () => {
  fakeProc.emitData('\x1b[2J\x1b[H' + 'W'.repeat(8 * 1024 * 1024));
  const started = Date.now();
  const response = await Promise.race([
    getJson('/api/files?path='),
    new Promise((_, reject) => setTimeout(() => reject(new Error('file-list request blocked by terminal rendering')), 1500)),
  ]);
  assert.equal(response.status, 200);
  assert.ok(Date.now() - started < 1500);
});

test('large terminal rendering does not block image upload handling', async () => {
  fakeProc.emitData('\x1b[2J\x1b[H' + 'U'.repeat(8 * 1024 * 1024));
  const response = await Promise.race([
    postUpload('worker-check.png', 'small-image'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('image upload blocked by terminal rendering')), 1500)),
  ]);
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  rmSync(response.body.path, { force: true });
});

test('scratch terminal uses the same data-replay protocol', async () => {
  const client = await openClient('/ws/terminal-scratch?id=one');
  await client.receive('state');
  const initial = await client.receive('data-replay');
  assert.equal(initial.data, '');
  scratchProc.emitData('SCRATCH');
  assert.equal((await client.receive('data')).data, 'SCRATCH');
  client.socket.send(JSON.stringify({ type: 'resync-request' }));
  assert.match((await client.receive('data-replay')).data, /SCRATCH/);
  await client.close();
});
