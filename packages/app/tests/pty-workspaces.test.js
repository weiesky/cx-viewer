import assert from 'node:assert/strict';
import test from 'node:test';
import { createPtyWorkspaceRegistry } from '../lib/pty-workspaces.js';

function session() {
  return { running: false, writes: [], kills: 0,
    getPtyState() { return { running: this.running }; },
    writeToPty(text) { this.writes.push(text); },
    killPty() { this.running = false; this.kills++; } };
}
function fixture() {
  const launches = [];
  const registry = createPtyWorkspaceRegistry({ createSession: session,
    async launch(owner) { launches.push(owner); owner.pty.running = true;
      return { getContext: () => ({ sessionId: owner.instanceKey + '-native' }), stop() { owner.pty.running = false; } }; } });
  return { registry, launches };
}

test('exact per-spawn identities isolate same-name projects; boot scope never follows another browser', async () => {
  const { registry, launches } = fixture(); const boot = session(); boot.running = true;
  const a = registry.adopt({ cwd: '/one/same', pty: boot, boot: true });
  try {
    const b = await registry.ensure('/two/same');
    assert.notEqual(a.instanceKey, b.instanceKey); assert.equal(b.transport, 'pty');
    assert.equal(a.projectName, b.projectName); assert.equal(registry.info().cwd, '/one/same');
    registry.session(b.instanceKey).writeToPty('only-b');
    assert.deepEqual(boot.writes, []); assert.deepEqual(launches[0].pty.writes, ['only-b']);
    assert.throws(() => registry.info('cxv-' + '0'.repeat(36)), { status: 404 });
    for (const key of ['', null, {}, { cwd: '/one/same' }, 'same']) assert.throws(() => registry.info(key), { status: 400 });
    await registry.close(a.instanceKey);
    assert.throws(() => registry.info(), { status: 404 }, 'closed boot cannot fall back to B');
    assert.equal(registry.info(b.instanceKey).running, true);
    await assert.rejects(registry.close(), { status: 400 });
  } finally { await registry.closeAll(); }
});

test('concurrent reopen of one cwd launches once and reuses the live exact instance', async () => {
  let release; let starts = 0;
  const registry = createPtyWorkspaceRegistry({ createSession: session,
    async launch({ pty }) { starts++; await new Promise(resolve => { release = resolve; }); pty.running = true; return {}; } });
  try {
    const first = registry.ensure('/one/same');
    const second = registry.ensure('/one/./same');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(starts, 1); assert.deepEqual(registry.list(), []);
    release(); const [a, b] = await Promise.all([first, second]);
    assert.equal(a.instanceKey, b.instanceKey); assert.equal(a.reused, false); assert.equal(b.reused, true);
    assert.equal((await registry.ensure('/one/same')).instanceKey, a.instanceKey); assert.equal(starts, 1);
  } finally { await registry.closeAll(); }
});

test('a failed parallel launch leaves boot alive and releases only its own resources', async () => {
  const boot = session(); boot.running = true; let failed;
  const registry = createPtyWorkspaceRegistry({ createSession: () => failed = session(),
    async launch() { throw new Error('fixture boot failure'); } });
  registry.adopt({ cwd: '/boot', pty: boot, boot: true });
  try {
    await assert.rejects(registry.ensure('/other'), /fixture boot failure/);
    assert.equal(failed.kills, 1); assert.equal(boot.kills, 0); assert.equal(registry.list().length, 1);
    assert.equal(registry.info().running, true);
  } finally { await registry.closeAll(); }
});

test('closing an in-flight workspace aborts its launch and disposes a late runtime without resurrection', async () => {
  let owner, release, stops = 0;
  const registry = createPtyWorkspaceRegistry({ createSession: session,
    async launch(value) { owner = value; await new Promise(resolve => { release = resolve; });
      value.pty.running = true; return { stop() { stops++; value.pty.running = false; } }; } });
  const start = registry.ensure('/pending');
  const rejected = assert.rejects(start, { code: 'PTY_WORKSPACE_CLOSED' });
  await new Promise(resolve => setImmediate(resolve));
  await registry.close(owner.instanceKey); assert.equal(owner.signal.aborted, true);
  release(); await rejected;
  assert.equal(stops, 1); assert.equal(owner.pty.running, false); assert.deepEqual(registry.list(), []);
});

test('cleanup failures remain retryable by the same exact instance', async () => {
  const registry = createPtyWorkspaceRegistry(); const pty = session(); pty.running = true; let fail = true;
  const entry = registry.adopt({ cwd: '/one', pty, boot: true,
    runtime: { stop() { if (fail) throw new Error('fixture stop failure'); } } });
  await assert.rejects(registry.close(entry.instanceKey), /fixture stop failure/);
  assert.throws(() => registry.info(entry.instanceKey), { status: 404 });
  assert.equal(pty.running, false); fail = false;
  assert.equal((await registry.close(entry.instanceKey)).ok, true); await registry.closeAll();
});

test('bad arguments and an unconfigured launcher cannot create a phantom workspace', async () => {
  const registry = createPtyWorkspaceRegistry();
  for (const cwd of ['', null, '/bad\0path']) await assert.rejects(registry.ensure(cwd), { status: 400 });
  for (const args of [null, ['\0'], [3]]) await assert.rejects(registry.ensure('/one', args), { status: 400 });
  await assert.rejects(registry.ensure('/one'), { status: 503 }); assert.deepEqual(registry.list(), []);
});
