import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  _resetPtyManagerForTests,
  _setPtyImportForTests,
  getCurrentWorkspace,
  getOutputBuffer,
  getOutputHistoryId,
  getPtyState,
  onPtyData,
  resizePty,
  spawnCodex,
  writeToPty,
} from '../pty-manager.js';

function tick() {
  return new Promise(resolve => setImmediate(resolve));
}

function createFakePty() {
  const calls = [];
  const fakePty = {
    spawn(command, args, opts) {
      const proc = {
        pid: 4242,
        writes: [],
        killed: false,
        resizeCalls: [],
        _onData: null,
        _onExit: null,
        onData(cb) { this._onData = cb; },
        onExit(cb) { this._onExit = cb; },
        write(data) { this.writes.push(data); },
        resize(cols, rows) { this.resizeCalls.push({ cols, rows }); },
        kill() { this.killed = true; },
        emitData(data) { if (this._onData) this._onData(data); },
        emitExit(exitCode) { if (this._onExit) this._onExit({ exitCode }); },
      };
      calls.push({ command, args, opts, proc });
      return proc;
    },
  };
  return { fakePty, calls };
}

test('pty manager captures output history and exposes replay state for the web terminal', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-pty-manager-'));
  const runtimeDir = join(tmp, 'runtime');
  const prevRuntimeDir = process.env.CXV_RUNTIME_DIR;
  const prevProxy = process.env.HTTPS_PROXY;

  try {
    process.env.CXV_RUNTIME_DIR = runtimeDir;
    process.env.HTTPS_PROXY = 'http://proxy.invalid';
    _resetPtyManagerForTests();

    const { fakePty, calls } = createFakePty();
    _setPtyImportForTests(() => fakePty);

    const proc = await spawnCodex(null, tmp, ['--remote', 'ws://127.0.0.1:1234'], '/bin/codex-fake', false, 7008);
    assert.equal(proc.pid, 4242);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, '/bin/codex-fake');
    assert.deepEqual(calls[0].args, ['--remote', 'ws://127.0.0.1:1234']);
    assert.equal(calls[0].opts.cwd, tmp);
    assert.equal(calls[0].opts.env.CXV_EDITOR_PORT, '7008');
    assert.equal(calls[0].opts.env.CXVIEWER_PORT, '7008');

    let streamed = '';
    const removeListener = onPtyData(chunk => { streamed += chunk; });
    proc.emitData('hello ');
    proc.emitData('\x1b[32mterminal\x1b[0m\n');
    await tick();

    assert.equal(streamed, 'hello \x1b[32mterminal\x1b[0m\n');
    assert.equal(getOutputBuffer(), streamed);
    assert.match(getOutputHistoryId(), /^terminal-history-\d+\.log$/);
    assert.deepEqual(getPtyState(), { running: true, exitCode: null });
    assert.equal(getCurrentWorkspace().cwd, tmp);

    assert.equal(writeToPty('x'), true);
    assert.deepEqual(proc.writes, ['x']);

    resizePty(100, 40);
    assert.deepEqual(proc.resizeCalls.at(-1), { cols: 100, rows: 40 });

    proc.emitExit(7);
    assert.deepEqual(getPtyState(), { running: false, exitCode: 7 });
    assert.equal(writeToPty('after-exit'), false);

    removeListener();
  } finally {
    _resetPtyManagerForTests();
    if (prevRuntimeDir === undefined) delete process.env.CXV_RUNTIME_DIR;
    else process.env.CXV_RUNTIME_DIR = prevRuntimeDir;
    if (prevProxy === undefined) delete process.env.HTTPS_PROXY;
    else process.env.HTTPS_PROXY = prevProxy;
    rmSync(tmp, { recursive: true, force: true });
  }
});
