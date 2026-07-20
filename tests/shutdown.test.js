import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { FORCE_KILL_GRACE_MS, registerSignalShutdown, SHUTDOWN_DEADLINE_MS, terminateWithEscalation, waitWithTimeout } from '../lib/shutdown.js';

test('external force-kill grace exceeds the whole internal shutdown deadline', () => {
  assert.ok(FORCE_KILL_GRACE_MS > SHUTDOWN_DEADLINE_MS);
});

test('signal shutdown runs cleanup and exit only once', async () => {
  const proc = new EventEmitter();
  let cleanups = 0;
  let exits = 0;
  proc.exit = () => { exits++; };
  registerSignalShutdown(async () => { cleanups++; }, { proc, onError: assert.fail });

  proc.emit('SIGTERM');
  proc.emit('SIGINT');
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(cleanups, 1);
  assert.equal(exits, 1);
});

test('a second signal forces an immediate exit while cleanup is pending', async () => {
  const proc = new EventEmitter();
  const exits = [];
  let cleanupStarted = 0;
  proc.exit = code => { exits.push(code); };
  registerSignalShutdown(async () => {
    cleanupStarted++;
    await new Promise(() => {});
  }, { proc, timeoutMs: 60_000 });

  proc.emit('SIGTERM');
  await new Promise(resolve => setImmediate(resolve));
  proc.emit('SIGINT');

  assert.equal(cleanupStarted, 1);
  assert.deepEqual(exits, [130]);
});

test('the whole cleanup has a deadline', async () => {
  const proc = new EventEmitter();
  const exits = [];
  let deadlineCallback;
  proc.exit = code => { exits.push(code); };
  registerSignalShutdown(() => new Promise(() => {}), {
    proc,
    timeoutMs: 10,
    setTimer: callback => { deadlineCallback = callback; return 1; },
    clearTimer: () => {},
    onError: () => {},
  });

  proc.emit('SIGTERM');
  deadlineCallback();
  assert.deepEqual(exits, [143]);
});

test('shutdown wait has a bounded timeout', async () => {
  await assert.rejects(
    waitWithTimeout(new Promise(() => {}), 10, 'test drain'),
    error => error?.code === 'CXV_SHUTDOWN_TIMEOUT',
  );
});

test('termination escalates to SIGKILL when the target survives', async () => {
  const signals = [];
  const callbacks = [];
  const timer = { unref() {} };
  const termination = terminateWithEscalation(42, {
    kill: (pid, signal) => signals.push([pid, signal]),
    stillTarget: async () => true,
    setTimer: callback => { callbacks.push(callback); return timer; },
  });
  await callbacks[0]();
  assert.deepEqual(signals, [[42, 'SIGTERM'], [42, 0], [42, 'SIGKILL']]);
  assert.equal((await termination.completion).status, 'forced');
});

test('termination does not kill a reused or unrelated PID', async () => {
  const signals = [];
  let callback;
  const termination = terminateWithEscalation(42, {
    kill: (pid, signal) => signals.push([pid, signal]),
    stillTarget: async () => false,
    setTimer: fn => { callback = fn; return { unref() {} }; },
  });
  await callback();
  assert.deepEqual(signals, [[42, 'SIGTERM'], [42, 0]]);
  assert.equal((await termination.completion).status, 'replaced');
});

test('termination reports a target that already exited', async () => {
  const gone = Object.assign(new Error('gone'), { code: 'ESRCH' });
  const termination = terminateWithEscalation(42, { kill: () => { throw gone; } });
  assert.equal((await termination.completion).status, 'exited');
});
