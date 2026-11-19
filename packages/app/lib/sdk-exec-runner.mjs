// The official SDK owns this wrapper; this wrapper owns exactly one Codex child.
// Preserve its JSONL pipes and keep them open until cancellation really finishes.
import { spawn } from 'node:child_process';

const executable = process.env.CXV_SDK_EXECUTABLE;
if (!executable) throw new Error('Missing supervised Codex executable');
const env = { ...process.env };
for (const key of ['CXV_SDK_NODE', 'CXV_SDK_RUNNER', 'CXV_SDK_EXECUTABLE']) delete env[key];
const args = process.argv.slice(2);
const isScript = /\.m?js$/i.test(executable);
let child, graceTimer, stopping = false;
const signalChild = signal => {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  // A detached POSIX child is the leader of its own group. Never scan for or
  // signal another workspace's processes, or the parent Viewer's group.
  try { process.kill(-child.pid, signal); }
  catch (error) { if (error.code !== 'ESRCH') child.kill(signal); }
};
const stop = () => {
  if (stopping) return;
  stopping = true;
  signalChild('SIGTERM');
  graceTimer = setTimeout(() => signalChild('SIGKILL'), 5000);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child = spawn(isScript ? process.execPath : executable, isScript ? [executable, ...args] : args, {
  env, stdio: 'inherit', detached: true,
});
child.once('error', error => {
  clearTimeout(graceTimer);
  console.error(`[SDK] Codex process could not start: ${error.message}`);
  process.exit(1);
});
child.once('exit', (code, signal) => {
  clearTimeout(graceTimer);
  process.exit(code ?? (stopping || signal ? 130 : 1));
});
