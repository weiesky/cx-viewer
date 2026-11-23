import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// kill(pid, 0) also succeeds for a dead Linux process awaiting its parent's
// waitpid. Verify actual exit without requiring the test to control PID 1.
export async function waitForProcessExit(pid, { timeoutMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let state = 'present';
  for (;;) {
    try { process.kill(pid, 0); }
    catch (error) {
      if (error.code === 'ESRCH') return;
      throw error;
    }
    if (process.platform === 'linux') {
      try {
        const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
        state = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0];
        if (state === 'Z') return;
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ESRCH') return;
        throw error;
      }
    }
    assert.ok(Date.now() < deadline, `PID ${pid} is still running (state ${state})`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
