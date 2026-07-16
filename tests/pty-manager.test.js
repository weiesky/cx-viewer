import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  _resetPtyManagerForTests,
  _setPtyImportForTests,
  _setResumeGateTimingsForTests,
  _setTerminalStateFactoryForTests,
  getOutputSnapshot,
  getPtyState,
  getReconnectSnapshot,
  killPty,
  onPtyData,
  onPtyExit,
  onPtyGeometry,
  onPtyRawData,
  onPtyState,
  requestPtySnapshot,
  resizePty,
  spawnCodex,
  spawnShell,
  writeToPty,
  writeToPtySequential,
} from '../pty-manager.js';

function tick() {
  return new Promise(resolve => setImmediate(resolve));
}

async function waitFor(predicate, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('condition timed out');
    await new Promise(resolve => setTimeout(resolve, 2));
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class FakeTerminalStateModel {
  constructor(options, controller) {
    this.options = options;
    this.controller = controller;
    this.generation = options.generation;
    this.cols = options.cols;
    this.rows = options.rows;
    this.seq = 0;
    this.writes = [];
    this.resizeCalls = [];
    this.snapshotCalls = [];
    this.disposed = false;
    this.ready = Promise.resolve();
    controller.models.push(this);
  }

  enqueue(data) {
    if (this.controller.enqueueError) throw this.controller.enqueueError;
    this.seq++;
    this.writes.push(data);
    return this.seq;
  }

  resize(cols, rows) {
    this.seq++;
    this.cols = cols;
    this.rows = rows;
    this.resizeCalls.push({ cols, rows });
    return this.seq;
  }

  requestSnapshot() {
    const call = {
      seq: this.seq,
      writes: [...this.writes],
      cols: this.cols,
      rows: this.rows,
    };
    this.snapshotCalls.push(call);
    if (this.controller.snapshotHandler) {
      return Promise.resolve(this.controller.snapshotHandler(call, this)).then(snapshot => ({
        generation: this.options.generation,
        seq: call.seq,
        cols: call.cols,
        rows: call.rows,
        ...snapshot,
      }));
    }
    return Promise.resolve({
      generation: this.options.generation,
      seq: call.seq,
      cols: call.cols,
      rows: call.rows,
      safe: true,
      data: `CANONICAL(${call.writes.join('')})`,
      history: { snapshotLimit: 0 },
    });
  }

  async dispose() {
    this.disposed = true;
  }
}

function createFakeModelController() {
  const controller = {
    models: [],
    snapshotHandler: null,
    enqueueError: null,
  };
  controller.factory = options => new FakeTerminalStateModel(options, controller);
  return controller;
}

function createFakePty() {
  const calls = [];
  const fakePty = {
    spawnErrorAt: null,
    spawn(command, args, opts) {
      if (this.spawnErrorAt === calls.length + 1) throw new Error('fake spawn failed');
      const proc = {
        pid: 4242,
        writes: [],
        resizeCalls: [],
        killed: false,
        _onData: null,
        _onExit: null,
        onData(cb) { this._onData = cb; },
        onExit(cb) { this._onExit = cb; },
        write(data) { this.writes.push(data); },
        resize(cols, rows) { this.resizeCalls.push({ cols, rows }); },
        kill() { this.killed = true; },
        emitData(data) { this._onData?.(data); },
        emitExit(exitCode) { this._onExit?.({ exitCode }); },
      };
      calls.push({ command, args, opts, proc });
      return proc;
    },
  };
  return { fakePty, calls };
}

function setupFakes() {
  _resetPtyManagerForTests();
  process.env.HTTPS_PROXY = 'http://proxy.invalid';
  const pty = createFakePty();
  const model = createFakeModelController();
  _setPtyImportForTests(() => pty.fakePty);
  _setTerminalStateFactoryForTests(model.factory);
  return { ...pty, model };
}

test('fresh output is batched into contiguous sequenced frames and canonicalized without PTY resize', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-fresh-'));
  try {
    const { calls, model } = setupFakes();
    const proc = await spawnCodex(null, tmp, [], '/bin/codex-fake', false, 7008);
    const events = [];
    const raw = [];
    const removeData = onPtyData((data, meta) => events.push({ data, meta }));
    const removeRaw = onPtyRawData(event => raw.push(event));

    const output = 'A'.repeat(70_000) + '🙂TAIL';
    proc.emitData(output);
    await tick();

    assert.equal(raw.length, 1);
    assert.equal(events.length, 2, '64KiB transport frames receive independent seq values');
    assert.deepEqual(events.map(event => event.meta.seq), [1, 2]);
    assert.equal(events.map(event => event.data).join(''), output);
    assert.equal(events.every(event => event.meta.streamId === 1), true);

    assert.equal(await requestPtySnapshot(), true);
    const snapshot = getOutputSnapshot();
    assert.equal(snapshot.authoritative, true);
    assert.equal(snapshot.throughSeq, 2);
    assert.equal(snapshot.resizeGeneration, 0);
    assert.equal(snapshot.cols, 120);
    assert.equal(snapshot.rows, 30);
    assert.match(snapshot.data, /^CANONICAL\(/);
    assert.deepEqual(proc.resizeCalls, [], 'canonical snapshot must never resize the PTY');
    assert.equal(model.models[0].options.snapshotScrollback, 0);
    assert.deepEqual(getPtyState(), {
      running: true,
      exitCode: null,
      streamId: 1,
      recovering: false,
      resizeGeneration: 0,
      cols: 120,
      rows: 30,
    });
    removeData();
    removeRaw();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('snapshot serialization absorbs an exact concurrent raw suffix and advances throughSeq', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-suffix-'));
  try {
    const { model } = setupFakes();
    const pending = deferred();
    model.snapshotHandler = call => pending.promise.then(() => ({
      safe: true,
      data: `BASE(${call.writes.join('')})`,
      history: { snapshotLimit: 0 },
    }));
    const proc = await spawnCodex(null, tmp, [], '/bin/codex-fake');

    proc.emitData('PREFIX');
    await tick();
    const refresh = requestPtySnapshot();
    await waitFor(() => model.models[0].snapshotCalls.length === 1);
    proc.emitData('SUFFIX-1');
    proc.emitData('SUFFIX-2');
    pending.resolve();

    assert.equal(await refresh, true);
    const snapshot = getOutputSnapshot();
    assert.equal(snapshot.throughSeq, 2);
    assert.equal(snapshot.data, 'BASE(PREFIX)SUFFIX-1SUFFIX-2');
    assert.equal(snapshot.authoritative, true);
    assert.deepEqual(proc.resizeCalls, []);
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resume feeds history to Worker, suppresses renderer fanout, and input never waits or resizes', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-resume-'));
  try {
    const { model } = setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 5, absoluteTimeoutMs: 100 });
    const pending = deferred();
    model.snapshotHandler = call => pending.promise.then(() => ({
      safe: true,
      data: 'VISIBLE-SCREEN',
      history: { snapshotLimit: 0 },
    }));
    const proc = await spawnCodex(null, tmp, ['resume', '--last'], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));

    proc.emitData('OLD-HISTORY'.repeat(10_000));
    await waitFor(() => model.models[0].snapshotCalls.length === 1);
    assert.deepEqual(events, []);

    assert.equal(writeToPty('USER-INPUT'), true);
    assert.deepEqual(proc.writes, ['USER-INPUT'], 'input is synchronous while snapshot is pending');
    assert.deepEqual(proc.resizeCalls, [], 'input/recovery never issue an internal resize');
    proc.emitData('RESPONSE-SUFFIX');
    pending.resolve();
    await waitFor(() => events.length === 1);

    assert.equal(events[0].meta.snapshot, true);
    assert.equal(events[0].meta.throughSeq, 3);
    assert.equal(events[0].data, 'VISIBLE-SCREENRESPONSE-SUFFIX');
    await waitFor(() => getPtyState().recovering === false);
    assert.equal(getPtyState().recovering, false);
    assert.deepEqual(proc.resizeCalls, []);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resume releases after one quiet canonical boundary and keeps later output incremental', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-resume-bursts-'));
  try {
    setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 3, absoluteTimeoutMs: 15 });
    const proc = await spawnCodex(null, tmp, ['resume', '--last'], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));

    proc.emitData('PRIVATE-HISTORY-ONE');
    await waitFor(() => events.length === 1);
    assert.equal(events[0].meta.snapshot, true);
    assert.equal(getPtyState().recovering, false);

    await new Promise(resolve => setTimeout(resolve, 20));
    proc.emitData('LIVE-STREAM-TWO');
    await waitFor(() => events.length === 2);
    assert.equal(events[1].meta.snapshot, false);
    assert.equal(events[1].data, 'LIVE-STREAM-TWO');

    writeToPty('USER-INPUT');
    proc.emitData('POST-INPUT-OUTPUT');
    await waitFor(() => events.length === 3);
    assert.equal(events[2].meta.snapshot, false);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resume uses one canonical input boundary then restores low-latency deltas', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-resume-input-progress-'));
  try {
    setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 80, absoluteTimeoutMs: 1000 });
    const proc = await spawnCodex(null, tmp, ['resume', '--last'], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));

    proc.emitData('RESTORED-SCREEN');
    assert.equal(getPtyState().recovering, true);

    writeToPty('a');
    proc.emitData('ECHO-a');
    await waitFor(() => events.length === 1);
    assert.equal(events[0].meta.snapshot, true);
    assert.equal(events[0].meta.reason, 'resume-input-progress');
    assert.match(events[0].data, /ECHO-a/);
    assert.equal(getPtyState().recovering, false,
      'explicit input releases recovery after one canonical boundary');
    assert.equal(events.some(event => event.meta.snapshot === false), false);

    proc.emitData('ECHO-b');
    await waitFor(() => events.length === 2);
    assert.equal(events[1].meta.snapshot, false,
      'subsequent keyboard echo must use the ordinary incremental path');
    assert.equal(events[1].data, 'ECHO-b');
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resize after the recovery boundary can build a current reconnect baseline', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-resume-silent-resize-'));
  try {
    setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 3, absoluteTimeoutMs: 500 });
    const proc = await spawnCodex(null, tmp, ['resume', '--last'], '/bin/codex-fake');

    proc.emitData('APPROVED-SCREEN');
    await waitFor(() => getReconnectSnapshot().reconnectSafe === true);
    const approved = getReconnectSnapshot();
    assert.equal(getPtyState().recovering, false);

    assert.equal(resizePty(137, 43), true);
    assert.equal(await requestPtySnapshot(), true);
    const resized = getReconnectSnapshot();
    assert.equal(resized.recovering, false);
    assert.equal(resized.cols, 137);
    assert.equal(resized.rows, 43);
    assert.match(resized.data, /APPROVED-SCREEN/);
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resume reconnect snapshot becomes ordinary current state after the first boundary', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-resume-reconnect-safe-'));
  try {
    setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 3, absoluteTimeoutMs: 500 });
    const proc = await spawnCodex(null, tmp, ['resume', '--last'], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));

    proc.emitData('APPROVED-HISTORY');
    await waitFor(() => events.length === 1);
    const approved = getReconnectSnapshot();
    assert.equal(approved.recovering, false);
    assert.equal(approved.reconnectSafe, true);
    assert.equal(approved.authoritative, true);
    assert.match(approved.data, /APPROVED-HISTORY/);

    proc.emitData('LATER-LIVE-OUTPUT');
    await tick();
    assert.equal(await requestPtySnapshot(), true);
    const current = getReconnectSnapshot();
    assert.equal(current.reconnectSafe, true);
    assert.ok(current.throughSeq > approved.throughSeq);
    assert.match(current.data, /LATER-LIVE-OUTPUT/);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('fork loads history through the same privacy gate without resume fallback semantics', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-fork-gate-'));
  try {
    const { calls } = setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 2, absoluteTimeoutMs: 20 });
    const proc = await spawnCodex(null, tmp, ['fork', '--last'], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));
    proc.emitData('FORK-HISTORY');
    await waitFor(() => events.length === 1);
    assert.equal(events[0].meta.snapshot, true);
    assert.equal(getPtyState().recovering, false);
    proc.emitData('No conversation found\n');
    proc.emitExit(1);
    await tick();
    assert.equal(calls.length, 1, 'fork failure must not auto-create a fresh session');
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('unsafe parser snapshot is non-authoritative and retries only after new output', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-unsafe-'));
  try {
    const { model } = setupFakes();
    let safe = false;
    model.snapshotHandler = call => Promise.resolve(safe
      ? { safe: true, data: `SAFE(${call.writes.join('')})` }
      : { safe: false, data: null, reasons: ['parser-not-ground'] });
    const proc = await spawnCodex(null, tmp, [], '/bin/codex-fake');
    proc.emitData('\x1b[');
    await tick();

    assert.equal(await requestPtySnapshot(), false);
    assert.equal(getOutputSnapshot().authoritative, false);
    assert.equal(model.models[0].snapshotCalls.length, 1);
    await new Promise(resolve => setTimeout(resolve, 15));
    assert.equal(model.models[0].snapshotCalls.length, 1, 'unsafe state does not timer-poll');

    safe = true;
    proc.emitData('31mREADY');
    await tick();
    assert.equal(await requestPtySnapshot(), true);
    assert.equal(getOutputSnapshot().authoritative, true);
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('successful client resize is one ordered geometry event and invalidates the old snapshot', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-resize-'));
  try {
    const { model } = setupFakes();
    const proc = await spawnCodex(null, tmp, [], '/bin/codex-fake');
    const events = [];
    const geometries = [];
    const removeData = onPtyData((data, meta) => events.push({ data, meta }));
    const removeGeometry = onPtyGeometry(geometry => geometries.push(geometry));

    proc.emitData('BEFORE');
    assert.equal(resizePty(100, 40), true);
    proc.emitData('AFTER');
    await tick();
    assert.deepEqual(events.map(event => [event.meta.seq, event.data]), [
      [1, 'BEFORE'],
      [2, 'AFTER'],
    ]);
    assert.deepEqual(proc.resizeCalls, [{ cols: 100, rows: 40 }]);
    assert.deepEqual(model.models[0].resizeCalls, [{ cols: 100, rows: 40 }]);
    assert.deepEqual(geometries, [{
      streamId: 1,
      resizeGeneration: 1,
      cols: 100,
      rows: 40,
    }]);

    assert.equal(await requestPtySnapshot(), true);
    assert.equal(getOutputSnapshot().resizeGeneration, 1);
    assert.equal(getOutputSnapshot().throughSeq, 2);
    assert.deepEqual(proc.resizeCalls, [{ cols: 100, rows: 40 }],
      'resync adds zero resize calls');
    removeData();
    removeGeometry();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('large valid geometry accepts a canonical snapshot above the old fixed 256 KiB cap', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-large-snapshot-'));
  try {
    const { model } = setupFakes();
    model.snapshotHandler = () => Promise.resolve({
      safe: true,
      data: 'S'.repeat(300_236),
      history: { snapshotLimit: 0 },
    });
    await spawnCodex(null, tmp, [], '/bin/codex-fake');
    assert.equal(resizePty(500, 300), true);
    assert.equal(await requestPtySnapshot(), true);
    assert.equal(getOutputSnapshot().authoritative, true);
    assert.equal(getOutputSnapshot().bytes, 300_236);
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('model failure keeps live output flowing but can never claim an authoritative baseline', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-failure-'));
  try {
    const { model } = setupFakes();
    const proc = await spawnCodex(null, tmp, [], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));
    model.enqueueError = new Error('worker backlog overflow');

    proc.emitData('LIVE-DESPITE-MODEL-FAILURE');
    await tick();
    assert.equal(events.length, 1);
    assert.equal(events[0].data, 'LIVE-DESPITE-MODEL-FAILURE');
    assert.equal(await requestPtySnapshot(), false);
    assert.equal(getOutputSnapshot().authoritative, false);
    assert.equal(getOutputSnapshot().fallback, true);
    assert.match(getOutputSnapshot().data, /terminal recovery unavailable/);
    assert.equal(getOutputSnapshot().modelHealthy, false);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resume Worker failure publishes only a fixed degraded baseline and keeps history gated', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-resume-worker-failure-'));
  try {
    const { model } = setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 2, absoluteTimeoutMs: 50 });
    model.enqueueError = new Error('worker backlog overflow');
    const proc = await spawnCodex(null, tmp, ['resume'], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));

    proc.emitData('HISTORY-AT-FAILURE');
    await waitFor(() => events.length === 1);
    assert.equal(events[0].meta.snapshot, true);
    assert.equal(events[0].meta.fallback, true);
    assert.equal(events[0].meta.authoritative, false);
    assert.match(events[0].data, /terminal recovery unavailable/);
    assert.doesNotMatch(events[0].data, /HISTORY-AT-FAILURE/);
    assert.equal(getPtyState().recovering, true);
    const approvedFallback = getReconnectSnapshot();
    assert.equal(approvedFallback.reconnectSafe, true);
    assert.equal(approvedFallback.fallback, true);
    assert.equal(approvedFallback.data, events[0].data);

    proc.emitData('LIVE-AFTER-FAILURE');
    await tick();
    assert.equal(events.length, 1, 'unknown output remains private after model failure');
    assert.equal(getReconnectSnapshot().data, approvedFallback.data);
    assert.doesNotMatch(getReconnectSnapshot().data, /LIVE-AFTER-FAILURE/);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('zero-output resume releases after the absolute canonical boundary', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-resume-deadline-'));
  try {
    setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 50, absoluteTimeoutMs: 10 });
    await spawnCodex(null, tmp, ['resume'], '/bin/codex-fake');
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));

    await waitFor(() => events.length === 1);
    assert.equal(events[0].meta.snapshot, true);
    assert.equal(events[0].meta.reason, 'resume-absolute');
    assert.equal(events[0].meta.throughSeq, 0);
    assert.equal(getPtyState().recovering, false);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('fast resume failure publishes a fixed exit diagnostic without raw output', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-diagnostic-'));
  try {
    const { model } = setupFakes();
    model.snapshotHandler = () => Promise.resolve({
      safe: false,
      data: null,
      reasons: ['parser-not-ground'],
    });
    const proc = await spawnCodex(null, tmp, ['resume'], '/bin/codex-fake');
    const order = [];
    const removeData = onPtyData((data, meta) => order.push({ type: 'data', data, meta }));
    const removeExit = onPtyExit(exitCode => order.push({ type: 'exit', exitCode }));

    proc.emitData('FATAL: invalid resume target');
    proc.emitExit(2);
    await waitFor(() => order.some(event => event.type === 'exit'));
    assert.equal(order[0].type, 'data');
    assert.equal(order[0].meta.snapshot, true);
    assert.equal(order[0].meta.authoritative, false);
    assert.doesNotMatch(order[0].data, /FATAL: invalid resume target/);
    assert.match(order[0].data, /process exited with code 2/);
    assert.deepEqual(order.at(-1), { type: 'exit', exitCode: 2 });
    assert.deepEqual(proc.resizeCalls, []);
    removeData();
    removeExit();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resume exit is delivered when quiet settle and exit share one snapshot promise', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-exit-race-'));
  try {
    const { model } = setupFakes();
    _setResumeGateTimingsForTests({ quietMs: 2, absoluteTimeoutMs: 100 });
    const pending = deferred();
    model.snapshotHandler = call => pending.promise.then(() => ({
      safe: true,
      data: `FINAL(${call.writes.join('')})`,
    }));
    const proc = await spawnCodex(null, tmp, ['resume'], '/bin/codex-fake');
    const order = [];
    const removeData = onPtyData((data, meta) => order.push({ type: 'data', data, meta }));
    const removeExit = onPtyExit(exitCode => order.push({ type: 'exit', exitCode }));

    proc.emitData('FINAL-OUTPUT');
    await waitFor(() => model.models[0].snapshotCalls.length === 1);
    proc.emitExit(0);
    pending.resolve();
    await waitFor(() => order.some(event => event.type === 'exit'));

    assert.equal(order.filter(event => event.type === 'data').length, 1);
    assert.equal(order.filter(event => event.type === 'exit').length, 1);
    assert.deepEqual(order.at(-1), { type: 'exit', exitCode: 0 });
    removeData();
    removeExit();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('No conversation resume fallback starts a fresh stream without leaking old output', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-fallback-'));
  try {
    const { calls, model } = setupFakes();
    const events = [];
    const remove = onPtyData((data, meta) => events.push({ data, meta }));
    const first = await spawnCodex(
      null,
      tmp,
      ['resume', '--last', '--model', 'gpt-test'],
      '/bin/codex-fake',
    );
    first.emitData('No conversation found');
    first.emitExit(1);
    await waitFor(() => calls.length === 2);

    assert.deepEqual(calls[1].args, ['--model', 'gpt-test']);
    assert.equal(model.models.length, 2);
    assert.equal(model.models[0].disposed, true);
    assert.deepEqual(events, []);
    calls[1].proc.emitData('FRESH');
    await tick();
    assert.equal(events.at(-1).data, 'FRESH');
    assert.equal(events.at(-1).meta.streamId, 2);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('resume fallback requires an exact diagnostic line', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-resume-false-positive-'));
  try {
    const { calls } = setupFakes();
    const exits = [];
    const remove = onPtyExit(code => exits.push(code));
    const proc = await spawnCodex(null, tmp, ['resume', '--last'], '/bin/codex-fake');
    proc.emitData('tool output says: No conversation found in cache\n');
    proc.emitExit(7);
    await waitFor(() => exits.length === 1);
    assert.equal(calls.length, 1);
    assert.deepEqual(exits, [7]);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('failed fresh fallback finalizes state and exit exactly once', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-resume-fallback-failure-'));
  try {
    const { fakePty } = setupFakes();
    const states = [];
    const exits = [];
    const removeState = onPtyState(state => states.push(state));
    const removeExit = onPtyExit((code, meta) => exits.push({ code, meta }));
    const proc = await spawnCodex(null, tmp, ['resume', '--last'], '/bin/codex-fake');
    fakePty.spawnErrorAt = 2;
    proc.emitData('No conversation found\n');
    proc.emitExit(1);
    await waitFor(() => exits.length === 1);
    assert.equal(getPtyState().running, false);
    assert.equal(states.at(-1).reason, 'resume-fallback-failed');
    assert.equal(exits[0].code, 1);
    assert.equal(exits[0].meta.reason, 'resume-fallback-failed');
    removeState();
    removeExit();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('sequential input jobs share one FIFO and shell respawn creates an isolated stream', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-sequential-'));
  try {
    const { calls } = setupFakes();
    const proc = await spawnCodex(null, tmp, [], '/bin/codex-fake');
    const completed = [];
    writeToPtySequential(['A', 'B', '\r'], ok => completed.push(['first', ok]), { settleMs: 1 });
    writeToPtySequential(['C', 'D', '\r'], ok => completed.push(['second', ok]), { settleMs: 1 });
    await waitFor(() => completed.length === 2);
    assert.deepEqual(completed, [['first', true], ['second', true]]);
    assert.deepEqual(proc.writes, ['A', 'B', '\r', 'C', 'D', '\r'],
      'programmatic jobs must not interleave across clients');

    proc.emitExit(0);
    assert.equal(await spawnShell(), true);
    assert.equal(calls.length, 2);
    assert.equal(getPtyState().streamId, 2);
    assert.equal(writeToPty('SHELL'), true);
    assert.deepEqual(calls[1].proc.writes, ['SHELL']);
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('kill disposes the model, terminates the process, and ignores late callbacks', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-canonical-kill-'));
  try {
    const { model } = setupFakes();
    const proc = await spawnCodex(null, tmp, [], '/bin/codex-fake');
    const exits = [];
    const remove = onPtyExit((code, meta) => exits.push({ code, meta }));
    killPty({ reason: 'test-kill' });
    assert.equal(proc.killed, true);
    assert.equal(model.models[0].disposed, true);
    assert.equal(getPtyState().running, false);
    assert.equal(exits.length, 1);
    proc.emitData('LATE');
    proc.emitExit(9);
    await tick();
    assert.equal(exits.length, 1);
    remove();
  } finally {
    _resetPtyManagerForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});
