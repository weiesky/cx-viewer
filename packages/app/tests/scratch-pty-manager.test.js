import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { openScratchPty, killScratchPty, shutdownScratchPtys,
  _setScratchPtyLoaderForTests, _resetScratchPtysForTests } from '../scratch-pty-manager.js';

function fakePty(spawns) {
  return { spawn(shell, args, options) {
    const proc = { options: { cwd: options.cwd }, killed: false, writes: [],
      onData(fn) { this.data = fn; }, onExit(fn) { this.exit = fn; },
      write(value) { this.writes.push(value); }, resize() {}, kill() { this.killed = true; },
    };
    spawns.push(proc);
    return proc;
  } };
}
afterEach(() => _resetScratchPtysForTests());

test('same scratch id reattaches within its instance and stays separate across workspaces', async () => {
  const spawns = [];
  _setScratchPtyLoaderForTests(async () => fakePty(spawns));
  const a = await openScratchPty('shared', { cwd: '/workspace/a', instanceKey: 'a' });
  const b = await openScratchPty('shared', { cwd: '/workspace/b', instanceKey: 'b' });
  assert.equal(await openScratchPty('shared', { cwd: '/workspace/a', instanceKey: 'a' }), a);
  assert.notEqual(a, b);
  assert.deepEqual(spawns.map(proc => proc.options.cwd), ['/workspace/a', '/workspace/b']);
  a.proc.data('only A'); b.proc.data('only B');
  assert.equal(a.replay, 'only A'); assert.equal(b.replay, 'only B');
  shutdownScratchPtys('a');
  assert.equal(a.proc.killed, true); assert.equal(b.proc.killed, false);
  b.write('still B'); assert.deepEqual(b.proc.writes, ['still B']);
  assert.equal(killScratchPty('shared'), false, 'unscoped kill cannot select a scoped shell');
  assert.equal(killScratchPty('shared', { instanceKey: 'b' }), true);
});

test('closing a workspace during PTY loading prevents late shell creation and leaves other startup live', async () => {
  const spawns = []; let release;
  _setScratchPtyLoaderForTests(() => new Promise(resolve => { release = resolve; }));
  const old = openScratchPty('shared', { instanceKey: 'a' });
  const releaseOld = release;
  const b = openScratchPty('shared', { instanceKey: 'b' });
  const releaseB = release;
  shutdownScratchPtys('a');
  const replacement = openScratchPty('shared', { instanceKey: 'a' });
  const releaseNew = release;
  releaseOld(fakePty(spawns));
  assert.equal(await old, null);
  const reconnect = openScratchPty('shared', { instanceKey: 'a' });
  assert.equal(release, releaseNew, 'old finalizer must not erase replacement startup');
  releaseNew(fakePty(spawns)); releaseB(fakePty(spawns));
  const [next, same, survivor] = await Promise.all([replacement, reconnect, b]);
  assert.equal(next, same); assert.equal(spawns.length, 2);
  assert.equal(survivor.proc.killed, false);
});

test('late exit of an old shell cannot remove its replacement', async () => {
  _setScratchPtyLoaderForTests(async () => fakePty([]));
  const old = await openScratchPty('one', { instanceKey: 'a' });
  killScratchPty('one', { instanceKey: 'a' });
  const next = await openScratchPty('one', { instanceKey: 'a' });
  old.proc.exit({ exitCode: 0 }); old.kill();
  assert.equal(await openScratchPty('one', { instanceKey: 'a' }), next);
  assert.equal(next.proc.killed, false);
});

test('shutdown cancels legacy pending shells too and loader failures can retry', async () => {
  const spawns = []; let release;
  _setScratchPtyLoaderForTests(() => new Promise(resolve => { release = resolve; }));
  const old = openScratchPty('one');
  shutdownScratchPtys(); release(fakePty(spawns));
  assert.equal(await old, null); assert.equal(spawns.length, 0);
  _setScratchPtyLoaderForTests(async () => { throw new Error('unavailable'); });
  await assert.rejects(openScratchPty('one'), /unavailable/);
  _setScratchPtyLoaderForTests(async () => fakePty(spawns));
  assert.ok(await openScratchPty('one'));
  assert.equal(await openScratchPty('../bad'), null);
});
