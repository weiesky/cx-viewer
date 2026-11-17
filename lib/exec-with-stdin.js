import { spawn } from 'node:child_process';

// git check-ignore exits 1 when nothing is ignored; retain stdout for all exits.
export function execWithStdin(cmd, args, input, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let settled = false;
    let timer;
    const settle = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(stdout);
    };
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.resume();
    child.on('error', settle);
    child.on('close', () => settle());
    // stdin errors are separate from spawn errors. An early exit may close
    // the pipe while Node still has buffered input to write.
    child.stdin.on('error', () => settle());
    if (options?.timeout) {
      timer = setTimeout(() => {
        try { child.kill(); } catch {}
        settle(new Error('timeout'));
      }, options.timeout);
    }
    try { child.stdin.end(input); } catch { settle(); }
  });
}
