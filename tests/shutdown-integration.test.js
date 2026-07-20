import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';

import { terminateWithEscalation } from '../lib/shutdown.js';
import { createProcessAdapter, killVerifiedTree, sameProcessIdentity } from '../lib/cxv-processes.js';

function waitForMessage(child, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 5000);
    child.on('message', message => {
      if (message?.type !== type) return;
      clearTimeout(timer);
      resolve(message);
    });
  });
}

function waitForGone(pid) {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => {
      clearInterval(check);
      reject(new Error(`PID ${pid} survived cleanup`));
    }, 2000);
    const check = setInterval(() => {
      try { process.kill(pid, 0); } catch (error) {
        if (error?.code !== 'ESRCH') return;
        clearTimeout(deadline);
        clearInterval(check);
        resolve();
      }
    }, 20);
  });
}

test('a real child that closes its port then hangs is escalated by stable identity', { timeout: 10_000 }, async t => {
  const child = fork(new URL('./fixtures/shutdown-child.mjs', import.meta.url), [], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  t.after(() => {
    try { process.kill(child.pid, 'SIGKILL'); } catch {}
  });
  await waitForMessage(child, 'ready');
  const adapter = createProcessAdapter();
  const identity = await adapter.inspect(child.pid);
  assert.ok(identity);
  const portClosed = waitForMessage(child, 'port-closed');
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));

  const termination = terminateWithEscalation(child.pid, {
    graceMs: 100,
    stillTarget: async () => sameProcessIdentity(identity, await adapter.inspect(child.pid)),
  });
  await portClosed;
  assert.equal((await termination.completion).status, 'forced');
  assert.deepEqual(await exited, { code: null, signal: 'SIGKILL' });
});

test('a parent that exits on SIGTERM still has its captured child tree cleaned', { timeout: 10_000 }, async t => {
  const parent = fork(new URL('./fixtures/shutdown-child.mjs', import.meta.url), ['tree-parent'], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let childPid = null;
  t.after(() => {
    try { process.kill(parent.pid, 'SIGKILL'); } catch {}
    if (childPid) try { process.kill(childPid, 'SIGKILL'); } catch {}
  });
  const ready = await waitForMessage(parent, 'ready');
  childPid = ready.childPid;
  const adapter = createProcessAdapter();
  const root = await adapter.inspect(parent.pid);
  const descendants = await adapter.descendants(root);
  assert.ok(descendants.some(item => item.pid === childPid));

  const termination = terminateWithEscalation(parent.pid, {
    graceMs: 100,
    kill: (_pid, signal) => adapter.signal(root, signal),
    stillTarget: async () => sameProcessIdentity(root, await adapter.inspect(root.pid)),
    forceKill: () => killVerifiedTree(adapter, root, descendants),
  });
  assert.equal((await termination.completion).status, 'exited');
  await waitForGone(childPid);
});
