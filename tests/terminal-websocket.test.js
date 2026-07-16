import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import WebSocket from 'ws';

const temp = mkdtempSync(join(tmpdir(), 'cxv-terminal-ws-'));
process.env.CXV_LOG_DIR = temp;
process.env.CXV_PROJECT_DIR = temp;
process.env.CXV_START_PORT = '19940';
process.env.CXV_MAX_PORT = '19949';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '1';
process.env.HTTPS_PROXY = 'http://proxy.invalid';

let server;
let ptyManager;
let fakeProc;
let terminalModel;
let port;
const spawnCalls = [];

function tick() {
  return new Promise(resolve => setImmediate(resolve));
}

async function waitFor(predicate, timeoutMs = 1500) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('condition timed out');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

function getResponse(path) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({
        body: JSON.parse(body), headers: res.headers, statusCode: res.statusCode,
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

class ControlledTerminalStateModel {
  constructor(options) {
    this.cols = options.cols;
    this.rows = options.rows;
    this.generation = options.generation;
    this.chunks = [];
    this.seq = 0;
    this.snapshotRequests = 0;
    this.heldSnapshots = [];
    this.deferNext = false;
    this.unsafeNext = false;
    this.disposed = false;
    this.ready = Promise.resolve();
  }

  enqueue(data) {
    this.seq++;
    this.chunks.push(String(data));
    return this.seq;
  }

  resize(cols, rows) {
    this.seq++;
    this.cols = cols;
    this.rows = rows;
    return this.seq;
  }

  requestSnapshot() {
    this.snapshotRequests++;
    const snapshot = {
      safe: !this.unsafeNext,
      seq: this.seq,
      cols: this.cols,
      rows: this.rows,
      data: this.chunks.join(''),
      history: { lines: 0 },
    };
    this.unsafeNext = false;
    if (!this.deferNext) return Promise.resolve(snapshot);
    this.deferNext = false;
    return new Promise((resolve) => {
      this.heldSnapshots.push({ resolve, snapshot });
    });
  }

  holdNextSnapshot() {
    this.deferNext = true;
  }

  resolveHeldSnapshot(overrides = {}) {
    const held = this.heldSnapshots.shift();
    assert.ok(held, 'expected a held terminal snapshot');
    held.resolve({ ...held.snapshot, ...overrides });
  }

  dispose() {
    this.disposed = true;
    while (this.heldSnapshots.length > 0) {
      this.resolveHeldSnapshot({ safe: false });
    }
    return Promise.resolve();
  }
}

function createFakeProcess() {
  return {
    pid: 9191,
    resizeCalls: [],
    writes: [],
    _onData: null,
    _onExit: null,
    onData(cb) { this._onData = cb; },
    onExit(cb) { this._onExit = cb; },
    write(data) { this.writes.push(data); },
    resize(cols, rows) { this.resizeCalls.push({ cols, rows }); },
    kill() {},
    emitData(data) { this._onData?.(data); },
    emitExit(exitCode) { this._onExit?.({ exitCode }); },
  };
}

async function openTerminalClient() {
  const messages = [];
  const waiters = [];
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal`, {
    headers: { Origin: `http://127.0.0.1:${port}` },
  });

  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());
    const index = waiters.findIndex(waiter => waiter.predicate(message));
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
    else messages.push(message);
  });

  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  const receiveWhere = (predicate, timeoutMs = 3000) => {
    const found = messages.findIndex(predicate);
    if (found >= 0) return Promise.resolve(messages.splice(found, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve(message) {
          clearTimeout(timer);
          resolve(message);
        },
      };
      const timer = setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new Error('timed out waiting for terminal message'));
      }, timeoutMs);
      waiters.push(waiter);
    });
  };

  return {
    socket,
    messages,
    receive: (type, timeoutMs) => receiveWhere(message => message.type === type, timeoutMs),
    receiveWhere,
    discard(type) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === type) messages.splice(i, 1);
      }
    },
    async close() {
      if (socket.readyState === WebSocket.CLOSED) return;
      const closed = new Promise(resolve => socket.once('close', resolve));
      socket.close();
      await closed;
    },
  };
}

async function consumeInitial(client) {
  const state = await client.receive('state');
  const snapshot = await client.receive('data-resync');
  assert.equal(snapshot.reason, 'initial');
  return { state, snapshot };
}

before(async () => {
  ptyManager = await import('../pty-manager.js');
  ptyManager._resetPtyManagerForTests();
  ptyManager._setTerminalStateFactoryForTests((options) => {
    terminalModel = new ControlledTerminalStateModel(options);
    return terminalModel;
  });
  ptyManager._setPtyImportForTests(() => ({
    spawn(command, args, opts) {
      fakeProc = createFakeProcess();
      spawnCalls.push({ command, args, opts, proc: fakeProc });
      return fakeProc;
    },
  }));
  await ptyManager.spawnCodex(null, temp, [], '/bin/codex-fake', false, 7008);
  fakeProc.emitData('\x1b[2J\x1b[HINITIAL-SCREEN');
  await tick();

  server = await import('../server.js');
  await server.startViewer();
  port = server.getPort();
});

after(async () => {
  await server?.stopViewer();
  ptyManager?._resetPtyManagerForTests();
  rmSync(temp, { recursive: true, force: true });
});

test('initial snapshot and live data expose the canonical sequence envelope', async () => {
  const client = await openTerminalClient();
  try {
    const { state, snapshot } = await consumeInitial(client);
    assert.deepEqual(snapshot, {
      type: 'data-resync',
      reason: 'initial',
      streamId: state.streamId,
      throughSeq: 1,
      resizeGeneration: 0,
      cols: 120,
      rows: 30,
      data: '\x1b[2J\x1b[HINITIAL-SCREEN',
    });

    fakeProc.emitData('LIVE-SEQ');
    await tick();
    const live = await client.receive('data');
    assert.deepEqual(live, {
      type: 'data', streamId: state.streamId, seq: snapshot.throughSeq + 1, data: 'LIVE-SEQ',
    });

    const recovery = await getResponse('/api/terminal-recovery');
    assert.equal(recovery.statusCode, 200);
    assert.equal(recovery.headers['cache-control'], 'private, no-store');
    assert.equal(recovery.body.authoritative, true,
      'the recovery endpoint waits for a current canonical cut');
    assert.equal(recovery.body.throughSeq, live.seq);
    assert.match(recovery.body.data, /LIVE-SEQ$/);
    assert.equal(recovery.body.resizeGeneration, 0);
    assert.equal(recovery.body.cols, 120);
    assert.equal(recovery.body.rows, 30);
  } finally {
    await client.close();
  }
});

test('large PTY commits preserve pty-manager frame boundaries and contiguous seq values', async () => {
  const client = await openTerminalClient();
  try {
    const { snapshot } = await consumeInitial(client);
    client.discard('data');
    const burst = 'b'.repeat(160_000) + 'BURST-END';
    fakeProc.emitData(burst);
    await tick();
    await waitFor(() => client.messages.filter(message => message.type === 'data')
      .reduce((sum, message) => sum + message.data.length, 0) >= burst.length);

    const frames = client.messages.filter(message => message.type === 'data');
    assert.equal(frames.map(message => message.data).join(''), burst);
    assert.ok(frames.length > 1);
    assert.ok(frames.every(message => message.data.length <= 64 * 1024));
    assert.deepEqual(
      frames.map(message => message.seq),
      frames.map((_, index) => snapshot.throughSeq + index + 1),
    );
    assert.equal(client.messages.some(message => message.type === 'data-resync'), false);
  } finally {
    await client.close();
  }
});

test('pending resync suppresses live frames and resumes exactly after a current snapshot', async () => {
  const client = await openTerminalClient();
  try {
    await consumeInitial(client);
    fakeProc.emitData('BEFORE-RESYNC');
    await tick();
    await client.receive('data');
    client.discard('data');

    terminalModel.holdNextSnapshot();
    const resizeCount = fakeProc.resizeCalls.length;
    client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'mount' }));
    await waitFor(() => terminalModel.heldSnapshots.length === 1);

    fakeProc.emitData('SUPPRESSED-A');
    await tick();
    fakeProc.emitData('SUPPRESSED-B');
    await tick();
    assert.equal(client.messages.some(message => message.type === 'data'), false);

    terminalModel.resolveHeldSnapshot();
    const snapshot = await client.receive('data-resync');
    assert.equal(snapshot.reason, 'mount');
    assert.match(snapshot.data, /BEFORE-RESYNCSUPPRESSED-ASUPPRESSED-B$/);
    assert.equal(snapshot.throughSeq, ptyManager.getOutputSnapshot().throughSeq);
    assert.equal(fakeProc.resizeCalls.length, resizeCount,
      'canonical resync must never resize the real PTY');

    fakeProc.emitData('AFTER-RESYNC');
    await tick();
    const next = await client.receive('data');
    assert.equal(next.seq, snapshot.throughSeq + 1);
    assert.equal(next.data, 'AFTER-RESYNC');
  } finally {
    await client.close();
  }
});

test('rapid resync requests are coalesced in flight but never time-dropped after completion', async () => {
  const client = await openTerminalClient();
  try {
    await consumeInitial(client);
    client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'requested' }));
    const first = await client.receive('data-resync');

    // A controller can reject a stale snapshot and request another recovery
    // in the same 500ms window. That request is protocol state, not UI noise.
    client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'requested' }));
    const second = await client.receive('data-resync');
    assert.equal(second.streamId, first.streamId);
    assert.equal(second.throughSeq, first.throughSeq);
    assert.equal(second.resizeGeneration, first.resizeGeneration);
  } finally {
    await client.close();
  }
});

test('resync request flooding is closed without affecting the shared terminal server', async () => {
  const client = await openTerminalClient();
  try {
    await consumeInitial(client);
    const closed = new Promise(resolve => client.socket.once('close', (code, reason) => (
      resolve({ code, reason: reason.toString() })
    )));
    for (let index = 0; index < 13; index++) {
      client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'requested' }));
    }
    const result = await closed;
    assert.equal(result.code, 1008);
    assert.match(result.reason, /resync rate exceeded/);

    const healthy = await getResponse('/api/terminal-recovery');
    assert.equal(healthy.statusCode, 200);
  } finally {
    await client.close();
  }
});

test('unsafe snapshots fall back once and resume at the exact live watermark', async () => {
  const client = await openTerminalClient();
  try {
    await consumeInitial(client);
    fakeProc.emitData('UNSAFE-PREFIX');
    await tick();
    await client.receive('data');
    terminalModel.unsafeNext = true;
    const requestCount = terminalModel.snapshotRequests;
    const resizeCount = fakeProc.resizeCalls.length;

    client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'requested' }));
    await waitFor(() => terminalModel.snapshotRequests === requestCount + 1);
    const fallback = await client.receive('data-resync');
    assert.equal(fallback.degraded, true);
    assert.equal(fallback.throughSeq, ptyManager.getOutputSnapshot().throughSeq);
    assert.match(fallback.data, /live output continues/);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(terminalModel.snapshotRequests, requestCount + 1,
      'unsafe parser state must not start a timer polling loop');

    fakeProc.emitData('SAFE-COMPLETION');
    await tick();
    const live = await client.receive('data');
    assert.equal(live.seq, fallback.throughSeq + 1);
    assert.equal(live.data, 'SAFE-COMPLETION');
    assert.equal(terminalModel.snapshotRequests, requestCount + 1,
      'persistent unsafe state must not retry on every output frame');
    assert.equal(fakeProc.resizeCalls.length, resizeCount);
  } finally {
    await client.close();
  }
});

test('input reaches the PTY while a canonical snapshot is still in flight', async () => {
  const client = await openTerminalClient();
  try {
    await consumeInitial(client);
    fakeProc.emitData('INVALIDATE-FOR-INPUT');
    await tick();
    await client.receive('data');
    terminalModel.holdNextSnapshot();
    const resizeCount = fakeProc.resizeCalls.length;
    client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'mount' }));
    await waitFor(() => terminalModel.heldSnapshots.length === 1);

    const started = performance.now();
    client.socket.send(JSON.stringify({ type: 'input', data: 'LATENCY-CRITICAL' }));
    await waitFor(() => fakeProc.writes.includes('LATENCY-CRITICAL'), 250);
    assert.ok(performance.now() - started < 250);
    assert.equal(terminalModel.heldSnapshots.length, 1,
      'input must not await or cancel the Worker snapshot');
    assert.equal(fakeProc.resizeCalls.length, resizeCount);

    terminalModel.resolveHeldSnapshot();
    await client.receive('data-resync');
  } finally {
    await client.close();
  }
});

test('sequential input ACKs are correlated and concurrent jobs never interleave', async () => {
  const client = await openTerminalClient();
  try {
    await consumeInitial(client);
    const writeStart = fakeProc.writes.length;
    client.socket.send(JSON.stringify({
      type: 'input-sequential', seq: 'job-a', chunks: ['A', '\r'], settleMs: 1,
    }));
    client.socket.send(JSON.stringify({
      type: 'input-sequential', seq: 'job-b', chunks: ['B', '\r'], settleMs: 1,
    }));
    const first = await client.receiveWhere(message => (
      message.type === 'input-sequential-done' && message.seq === 'job-a'
    ));
    const second = await client.receiveWhere(message => (
      message.type === 'input-sequential-done' && message.seq === 'job-b'
    ));
    assert.deepEqual(first, { type: 'input-sequential-done', seq: 'job-a', ok: true });
    assert.deepEqual(second, { type: 'input-sequential-done', seq: 'job-b', ok: true });
    assert.deepEqual(fakeProc.writes.slice(writeStart), ['A', '\r', 'B', '\r']);

    client.socket.send(JSON.stringify({
      type: 'input-sequential', seq: 'bad-job', chunks: [], settleMs: 1,
    }));
    const invalid = await client.receiveWhere(message => (
      message.type === 'input-sequential-done' && message.seq === 'bad-job'
    ));
    assert.deepEqual(invalid, {
      type: 'input-sequential-done', seq: 'bad-job', ok: false, error: 'invalid-chunks',
    });
  } finally {
    await client.close();
  }
});

test('real PTY resize broadcasts one geometry generation to every client', async () => {
  const first = await openTerminalClient();
  const second = await openTerminalClient();
  try {
    const firstInitial = await consumeInitial(first);
    const secondInitial = await consumeInitial(second);
    assert.equal(firstInitial.state.streamId, secondInitial.state.streamId);
    const resizeCount = fakeProc.resizeCalls.length;

    first.socket.send(JSON.stringify({ type: 'resize', cols: 137, rows: 41 }));
    const [firstGeometry, secondGeometry] = await Promise.all([
      first.receive('geometry'), second.receive('geometry'),
    ]);
    assert.deepEqual(firstGeometry, secondGeometry);
    assert.deepEqual(firstGeometry, {
      type: 'geometry',
      streamId: firstInitial.state.streamId,
      resizeGeneration: firstInitial.snapshot.resizeGeneration + 1,
      cols: 137,
      rows: 41,
    });
    assert.equal(fakeProc.resizeCalls.length, resizeCount + 1);
    assert.deepEqual(fakeProc.resizeCalls.at(-1), { cols: 137, rows: 41 });
  } finally {
    await first.close();
    await second.close();
  }
});

test('closing a connection terminates its pending resync intent', async () => {
  const client = await openTerminalClient();
  await consumeInitial(client);
  fakeProc.emitData('INVALIDATE-FOR-CLOSE');
  await tick();
  await client.receive('data');
  terminalModel.holdNextSnapshot();
  client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'mount' }));
  await waitFor(() => terminalModel.heldSnapshots.length === 1);
  const requestCount = terminalModel.snapshotRequests;

  await client.close();
  terminalModel.resolveHeldSnapshot();
  fakeProc.emitData('AFTER-CLOSED-INTENT');
  await tick();
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(terminalModel.snapshotRequests, requestCount,
    'closed connection must not revive its snapshot request on later output');
});

test('a zero-output replacement stream sends state then an empty canonical snapshot', async () => {
  const client = await openTerminalClient();
  try {
    const { state: oldState, snapshot: oldSnapshot } = await consumeInitial(client);
    assert.notEqual(oldSnapshot.data, '', 'the old stream must have a screen to clear');

    await ptyManager.spawnCodex(null, temp, [], '/bin/codex-fake', false, 7008);
    const nextState = await client.receiveWhere(message => (
      message.type === 'state'
      && message.running === true
      && message.streamId !== oldState.streamId
    ));
    const snapshot = await client.receiveWhere(message => (
      message.type === 'data-resync' && message.streamId === nextState.streamId
    ));

    assert.equal(nextState.reason, 'spawn');
    assert.equal(snapshot.reason, 'initial');
    assert.equal(snapshot.throughSeq, 0);
    assert.equal(snapshot.resizeGeneration, 0);
    assert.equal(snapshot.cols, nextState.cols);
    assert.equal(snapshot.rows, nextState.rows);
    assert.equal(snapshot.data, '');
    assert.equal(fakeProc.writes.length, 0);
    assert.equal(fakeProc.resizeCalls.length, 0,
      'a zero-output stream boundary must not use resize as a redraw probe');
  } finally {
    await client.close();
  }
});

test('terminal websocket rejects payloads above maxPayload without stopping the server', async () => {
  const oversized = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal`, {
    headers: { Origin: `http://127.0.0.1:${port}` },
  });
  await new Promise((resolve, reject) => {
    oversized.once('open', resolve);
    oversized.once('error', reject);
  });
  const closed = new Promise(resolve => oversized.once('close', code => resolve(code)));
  oversized.send(JSON.stringify({ type: 'input', data: 'x'.repeat(2 * 1024 * 1024 + 1) }));
  assert.equal(await closed, 1009);
  assert.equal((await getResponse('/api/terminal-recovery')).statusCode, 200);
});

test('PTY exit terminates a pending intent before its snapshot resolves', async () => {
  const client = await openTerminalClient();
  await consumeInitial(client);
  fakeProc.emitData('INVALIDATE-FOR-EXIT');
  await tick();
  await client.receive('data');
  terminalModel.holdNextSnapshot();
  client.socket.send(JSON.stringify({ type: 'resync-request', reason: 'mount' }));
  await waitFor(() => terminalModel.heldSnapshots.length === 1);

  fakeProc.emitExit(0);
  const exit = await client.receive('exit');
  assert.equal(exit.exitCode, 0);
  terminalModel.resolveHeldSnapshot();
  await assert.rejects(client.receive('data-resync', 150), /timed out/);
  await client.close();
});
