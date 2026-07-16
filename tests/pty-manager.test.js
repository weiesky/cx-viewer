import assert from 'node:assert/strict';
import test from 'node:test';

import {
  _resetPtyManagerForTests, _setPtyImportForTests, getPtyState, getTerminalScreen, getTerminalSync,
  killPty, onPtyData, onPtyGeometry, onPtyRawData, resizePty, spawnCodex,
  writeToPty, writeToPtySequential,
} from '../pty-manager.js';
import { TerminalScreenModel } from '../lib/terminal-screen-model.js';

function fakePty() {
  const calls = [];
  return {
    calls,
    module: { spawn(command, args, opts) {
      const proc = {
        writes: [], resizeCalls: [], killed: false,
        onData(cb) { this.dataCb = cb; }, onExit(cb) { this.exitCb = cb; },
        write(data) { this.writes.push(data); }, resize(cols, rows) { this.resizeCalls.push({ cols, rows }); },
        kill() { this.killed = true; }, emitData(data) { this.dataCb?.(data); },
        emitExit(exitCode) { this.exitCb?.({ exitCode }); },
      };
      calls.push({ command, args, opts, proc });
      return proc;
    } },
  };
}

async function setup(args = []) {
  _resetPtyManagerForTests();
  process.env.HTTPS_PROXY = 'http://proxy.invalid';
  const fake = fakePty();
  _setPtyImportForTests(() => fake.module);
  const proc = await spawnCodex(null, process.cwd(), args, '/bin/codex-fake', false, 7008);
  return { ...fake, proc };
}

test('PTY bytes are published immediately without retaining terminal history', async () => {
  const { proc } = await setup();
  const live = [];
  const raw = [];
  const offLive = onPtyData((data, meta) => live.push({ data, meta }));
  const offRaw = onPtyRawData(event => raw.push(event));
  const output = 'A'.repeat(70_000) + 'TAIL';
  proc.emitData(output);
  assert.equal(live.length, 2);
  assert.deepEqual(live.map(item => item.meta.seq), [1, 2]);
  assert.equal(live.map(item => item.data).join(''), output);
  assert.equal(raw[0].data, output);
  assert.equal(getTerminalSync().throughSeq, 2);
  assert.equal('data' in getTerminalSync(), false);
  const screen = await getTerminalScreen();
  assert.match(screen.data, /TAIL/);
  assert.ok(Buffer.byteLength(screen.data) < 16 * 1024);
  offLive(); offRaw(); killPty();
});

test('resume output is rendered off-screen and released as one current-screen cut', async () => {
  const { proc } = await setup(['resume', 'thread-id']);
  const live = [];
  const off = onPtyData(data => live.push(data));
  proc.emitData('HISTORY');
  proc.emitData('LIVE');
  assert.deepEqual(live, []);
  assert.equal(getPtyState().recovering, true);
  await new Promise(resolve => setTimeout(resolve, 90));
  assert.equal(getPtyState().recovering, false);
  const screen = await getTerminalScreen();
  assert.match(screen.data, /HISTORYLIVE/);
  off(); killPty();
});

test('input is synchronous and sequential jobs do not interleave', async () => {
  const { proc } = await setup();
  assert.equal(writeToPty('now'), true);
  const done = new Promise(resolve => writeToPtySequential(['a', 'b'], resolve, { settleMs: 0 }));
  assert.equal(await done, true);
  assert.deepEqual(proc.writes, ['now', 'a', 'b']);
  killPty();
});

test('resize changes the real PTY and broadcasts geometry', async () => {
  const { proc } = await setup();
  const events = [];
  const off = onPtyGeometry(event => events.push(event));
  assert.equal(resizePty(90, 31), true);
  assert.deepEqual(proc.resizeCalls, [{ cols: 90, rows: 31 }]);
  assert.equal(events[0].resizeGeneration, 1);
  off(); killPty();
});

test('screen renderer overload is reported instead of becoming an authoritative empty screen', async () => {
  const { proc } = await setup();
  proc.emitData('X'.repeat(17 * 1024 * 1024));
  await assert.rejects(getTerminalScreen(), /backlog|failed|closed/i);
  killPty();
});

test('screen worker mutation errors fail snapshots instead of advancing an atomic cut', async () => {
  const model = new TerminalScreenModel({ cols: 80, rows: 24 });
  try {
    await model.ready;
    model.worker.postMessage({ type: 'write', data: { invalid: true }, bytes: 0, seq: 1 });
    await assert.rejects(model.snapshot());
  } finally {
    model.dispose();
  }
});
