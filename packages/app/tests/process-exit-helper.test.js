import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { waitForProcessExit } from './helpers/process-exit.js';

test('process exit assertion rejects a running owned fixture and accepts its actual exit', async t => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  const exited = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null) child.kill('SIGKILL'); await exited; });
  await once(child, 'spawn');
  await assert.rejects(waitForProcessExit(child.pid, { timeoutMs: 50 }), /still running/);
  child.kill('SIGKILL');
  await exited;
  await waitForProcessExit(child.pid);
});
