import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { openScratchPty, killScratchPty, shutdownScratchPtys,
  _setScratchPtyLoaderForTests, _resetScratchPtysForTests } from '../scratch-pty-manager.js';

function fakePty(spawns) {
  return { spawn(shell, args, options) {
    const proc = { options: { ...options }, killed: false, writes: [],
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


test('scratch inherits ordinary shell env while removing viewer bypass, instance, ports, proxy and only its private trace header', async t => {
  const values = { CXV_BYPASS_PERMISSIONS: '1', CXV_INSTANCE_KEY: 'boot', CXV_EDITOR_PORT: '7008', CXVIEWER_PORT: '7008',
    CXV_FUTURE_COORDINATION: 'private', OPENAI_BASE_URL: 'http://127.0.0.1:1',
    OTEL_EXPORTER_OTLP_TRACES_HEADERS: 'tenant=keep,x%2Dcxv%2Dotel%2Dtoken=synthetic-private', B7_SCRATCH_ENV: 'ordinary' };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]])); Object.assign(process.env, values);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const spawns = []; _setScratchPtyLoaderForTests(async () => fakePty(spawns));
  const a = await openScratchPty('env', { cwd: '/a', instanceKey: 'a' });
  const env = spawns[0].options.env;
  for (const key of Object.keys(values).filter(key => key.startsWith('CXV_') || key.startsWith('CXVIEWER_'))) assert.equal(env[key], undefined);
  assert.equal(env.OPENAI_BASE_URL, undefined); assert.equal(env.OTEL_EXPORTER_OTLP_TRACES_HEADERS, 'tenant=keep');
  assert.equal(env.B7_SCRATCH_ENV, 'ordinary'); assert.equal(process.env.CXV_BYPASS_PERMISSIONS, '1');
  assert.equal(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS, values.OTEL_EXPORTER_OTLP_TRACES_HEADERS);
  assert.ok(a);
});
