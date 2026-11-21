// Asynchronous Git listing stays in the parent so AbortSignal owns child cleanup.
import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';

const GIT_LS_FILES_TIMEOUT_MS = 8000;

export function gitListFiles(root, signal) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        { cwd: root, windowsHide: true, signal });
    } catch { resolve(null); return; }
    let out = '';
    const decoder = new StringDecoder('utf8');
    // Bound a hung git (index.lock contention, slow/NFS mount) so nodeSearch always resolves.
    const timer = setTimeout(() => { try { child.kill(); } catch { /* gone */ } }, GIT_LS_FILES_TIMEOUT_MS);
    child.stdout.on('data', (d) => { out += decoder.write(d); });
    child.stdout.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); resolve(null); });
    child.on('close', (code) => {
      clearTimeout(timer);
      out += decoder.end();
      if (code !== 0) { resolve(null); return; }
      resolve(out.split('\0').filter(Boolean));
    });
  });
}
