import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, mkdtempSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getEventListeners } from 'node:events';

// tmp storage includes threadId: a worker must use the parent's exact path policy.
process.env.CXV_LOG_DIR = 'tmp';
const { LOG_DIR, setLogDir } = await import('../findcx.js');
const initial = LOG_DIR;
const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
const { searchCode } = await import('../lib/code-search.js');
const marker = 'WORKER_POLICY_NEEDLE';
const switched = join('/tmp', `cxv-worker-switch-${process.pid}`);
const publicRoot = mkdtempSync(join(tmpdir(), 'cxv-worker-public-'));
after(() => {
  rmSync(initial, { recursive: true, force: true });
  rmSync(switched, { recursive: true, force: true });
  rmSync(publicRoot, { recursive: true, force: true });
});

test('worker inherits frozen parent credentials plus original and switched config paths', async () => {
  mkdirSync(CREDENTIAL_PATHS.root, { recursive: true });
  mkdirSync(CREDENTIAL_PATHS.backupRoot, { recursive: true });
  for (const path of [CREDENTIAL_PATHS.keyPath, CREDENTIAL_PATHS.file,
    join(CREDENTIAL_PATHS.backupRoot, 'old.json'), join(initial, 'preferences.json')]) writeFileSync(path, marker);
  writeFileSync(join(initial, 'public.txt'), marker);
  mkdirSync(join(switched, 'im/dingtalk'), { recursive: true });
  setLogDir(switched);
  writeFileSync(join(switched, 'preferences.json'), marker);
  writeFileSync(join(switched, 'im/dingtalk/config.json'), marker);
  writeFileSync(join(switched, 'ordinary.txt'), marker);
  // Viewer owners are now private as a whole. Scan a public workspace and its
  // aliases instead: a worker using its own threadId owner would miss these.
  linkSync(join(initial, 'public.txt'), join(publicRoot, 'old-viewer-alias.txt'));
  linkSync(join(switched, 'ordinary.txt'), join(publicRoot, 'new-viewer-alias.txt'));
  linkSync(CREDENTIAL_PATHS.keyPath, join(publicRoot, 'credential-alias.txt'));
  writeFileSync(join(publicRoot, 'public.txt'), marker);
  const result = await searchCode({ root: publicRoot, query: marker, engine: 'node' });
  assert.deepEqual(result.results.map(row => row.file), ['public.txt']);
  assert.deepEqual((await searchCode({ root: initial, query: marker, engine: 'node' })).results, []);
  const current = await searchCode({ root: switched, query: marker, engine: 'node' });
  assert.deepEqual(current.results, []);
});

test('completed and cancelled workers remove the parent abort subscription', async () => {
  const ac = new AbortController();
  await searchCode({ root: publicRoot, query: marker, engine: 'node', signal: ac.signal });
  assert.equal(getEventListeners(ac.signal, 'abort').length, 0);
  const pending = searchCode({ root: publicRoot, query: marker, engine: 'node', signal: ac.signal });
  ac.abort();
  assert.equal((await pending).truncated, true);
  assert.equal(getEventListeners(ac.signal, 'abort').length, 0);
});


test('cancelling during Git enumeration releases the owned subprocess', { skip: process.platform === 'win32' }, async () => {
  const bin = join(initial, 'fake-bin');
  const pidFile = join(initial, 'git-pid');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'git'), `#!${process.execPath}\nimport {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(()=>{},1000);`, { mode: 0o700 });
  const previousPath = process.env.PATH;
  let pid;
  const ac = new AbortController();
  try {
    process.env.PATH = bin;
    const pending = searchCode({ root: publicRoot, query: marker, engine: 'node', signal: ac.signal });
    for (let i = 0; i < 100 && !existsSync(pidFile); i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(existsSync(pidFile), 'fake Git must be in flight before cancellation');
    pid = Number(readFileSync(pidFile, 'utf8'));
    ac.abort();
    assert.equal((await pending).truncated, true);
    let alive = true;
    for (let i = 0; i < 100 && alive; i++) {
      try { process.kill(pid, 0); await new Promise(resolve => setTimeout(resolve, 10)); }
      catch (error) { if (error.code !== 'ESRCH') throw error; alive = false; }
    }
    assert.equal(alive, false, 'cancel must not orphan Git when the worker is retired');
  } finally {
    ac.abort();
    process.env.PATH = previousPath;
    if (pid) { try { process.kill(pid, 'SIGKILL'); } catch {} }
  }
});
