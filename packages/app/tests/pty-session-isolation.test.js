import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPtySession } from '../pty-manager.js';

function fakePty() {
  const calls = [];
  return { calls, spawn(command, args, options) {
    const proc = {
      writes: [], killed: false,
      onData(fn) { this.data = fn; }, onExit(fn) { this.exit = fn; },
      write(value) { this.writes.push(value); }, resize() {}, kill() { this.killed = true; },
    };
    calls.push({ command, args, options, proc });
    return proc;
  } };
}
const request = cwd => ({ cwd, codexPath: '/bin/fixture-codex' });

test('parallel PTYs keep processes, listeners, screen state and pending writes independently', async () => {
  const a = createPtySession(), b = createPtySession(), driver = fakePty();
  a._setPtyImportForTests(() => driver); b._setPtyImportForTests(() => driver);
  const eventsA = [], eventsB = [];
  a.onPtyData(data => eventsA.push(data)); b.onPtyData(data => eventsB.push(data));
  try {
    const first = await a.spawnCodexRequest(request('/fixture/one/same'));
    const second = await b.spawnCodexRequest(request('/fixture/two/same'));
    assert.equal(first.killed, false);
    first.data('ONLY_A'); second.data('ONLY_B');
    assert.deepEqual(eventsA, ['ONLY_A']); assert.deepEqual(eventsB, ['ONLY_B']);
    assert.match((await a.getTerminalScreen()).data, /ONLY_A/);
    assert.doesNotMatch((await a.getTerminalScreen()).data, /ONLY_B/);
    assert.match((await b.getTerminalScreen()).data, /ONLY_B/);
    a.resizePty(77, 23); b.resizePty(99, 31);
    assert.equal(a.getPtyState().cols, 77); assert.equal(b.getPtyState().cols, 99);
    const writeA = new Promise(resolve => a.writeToPtySequential(['a1', 'a2'], resolve, { settleMs: 100 }));
    const writeB = new Promise(resolve => b.writeToPtySequential(['b1', 'b2'], resolve, { settleMs: 0 }));
    a.killPty();
    assert.equal(await writeA, false); assert.equal(await writeB, true);
    assert.deepEqual(second.writes, ['b1', 'b2']); assert.equal(second.killed, false);
    first.data('STALE_A'); assert.deepEqual(eventsA, ['ONLY_A']);
    assert.equal(b.getCurrentWorkspace().cwd, '/fixture/two/same');
  } finally { a.killPty(); b.killPty(); }
});

test('cancelling an awaiting spawn never invalidates another workspace generation', async () => {
  const a = createPtySession(), b = createPtySession(), driver = fakePty();
  let releaseA;
  a._setPtyImportForTests(() => new Promise(resolve => { releaseA = resolve; }));
  b._setPtyImportForTests(() => driver);
  try {
    const pendingA = a.spawnCodexRequest(request('/fixture/a'));
    await new Promise(resolve => setImmediate(resolve));
    const procB = await b.spawnCodexRequest(request('/fixture/b'));
    a.killPty(); releaseA(driver);
    assert.equal(await pendingA, null); assert.equal(driver.calls.length, 1);
    assert.equal(procB.killed, false); assert.equal(b.writeToPty('still-b'), true);
    assert.deepEqual(procB.writes, ['still-b']);
  } finally { a.killPty(); b.killPty(); }
});

function outputContaining(session, expected) {
  return new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => { off(); reject(new Error(`missing PTY output: ${expected}`)); }, 4000);
    const off = session.onPtyData(chunk => {
      text += chunk;
      if (text.includes(expected)) { clearTimeout(timer); off(); resolve(text); }
    });
  });
}

test('two actual local shell PTYs retain their cwd and accept input after the sibling closes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-pty-session-'));
  const dirs = [join(root, 'one/same'), join(root, 'two/same')];
  dirs.forEach(dir => mkdirSync(dir, { recursive: true }));
  const a = createPtySession(), b = createPtySession();
  try {
    const readyA = outputContaining(a, 'READY_A'), readyB = outputContaining(b, 'READY_B');
    const script = label => `printf 'READY_${label}\\n'; while IFS= read -r line; do printf '${label}:%s:%s\\n' "$PWD" "$line"; done`;
    await a.spawnCodexRequest({ cwd: dirs[0], codexPath: '/bin/sh', args: ['-c', script('A')] });
    await b.spawnCodexRequest({ cwd: dirs[1], codexPath: '/bin/sh', args: ['-c', script('B')] });
    await Promise.all([readyA, readyB]);
    const responseA = outputContaining(a, ':hello-a'), responseB = outputContaining(b, ':hello-b');
    a.writeToPty('hello-a\r'); b.writeToPty('hello-b\r');
    const [textA, textB] = await Promise.all([responseA, responseB]);
    assert.ok(textA.includes('/one/same:hello-a')); assert.ok(textB.includes('/two/same:hello-b'));
    a.killPty(); const aliveB = outputContaining(b, ':after-a-close');
    assert.equal(b.writeToPty('after-a-close\r'), true); await aliveB;
    assert.equal(b.getPtyState().running, true);
  } finally { a.killPty(); b.killPty(); rmSync(root, { recursive: true, force: true }); }
});


test('workspace environments remain private through native resume fallback and shell fallback', async () => {
  const a = createPtySession(), b = createPtySession(), driver = fakePty();
  a._setPtyImportForTests(() => driver); b._setPtyImportForTests(() => driver);
  const envA = { PATH: process.env.PATH, HTTPS_PROXY: 'http://fixture.invalid', OWNER: 'only-a' };
  const envB = { PATH: process.env.PATH, HTTPS_PROXY: 'http://fixture.invalid', OWNER: 'only-b' };
  try {
    const first = await a.spawnCodexRequest({ ...request('/fixture/a'), args: ['resume', 'missing'], env: envA, serverPort: 12345 });
    await b.spawnCodexRequest({ ...request('/fixture/b'), env: envB });
    assert.equal(driver.calls[0].options.env.OWNER, 'only-a');
    assert.equal(driver.calls[1].options.env.OWNER, 'only-b');
    assert.equal(envA.CXV_EDITOR_PORT, undefined, 'instrumentation cannot mutate a trusted input environment');
    assert.notEqual(process.env.OWNER, 'only-a');
    first.data('No conversation found\n'); first.exit({ exitCode: 1 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(driver.calls[2].options.env.OWNER, 'only-a');
    assert.deepEqual(driver.calls[2].args, []);
    a.killPty(); await a.spawnShell();
    assert.equal(driver.calls[3].options.env.OWNER, 'only-a');
    assert.equal(driver.calls[3].options.env.CXV_EDITOR_PORT, undefined);
    assert.notEqual(driver.calls[3].options.env.EDITOR, driver.calls[0].options.env.EDITOR);
    await assert.rejects(b.spawnCodexRequest({ ...request('/fixture/b'), env: null }), /server-owned object/);
    assert.equal(driver.calls[1].proc.killed, false, 'bad environment cannot replace a live process');
  } finally { a.killPty(); b.killPty(); }
});

test('closing a real PTY reaps its tool tree when terminal processes ignore hangup and terminate', { timeout: 10000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-pty-tree-')), file = join(root, 'pids.json');
  const pty = createPtySession(); let pids = [];
  try {
    await pty.spawnCodexRequest({ cwd: root, codexPath: process.execPath, args: ['-e', `
process.on('SIGHUP',()=>{});process.on('SIGTERM',()=>{});
const child=require('node:child_process').spawn(process.execPath,['-e',"process.on('SIGHUP',()=>{});process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});
require('node:fs').writeFileSync(${JSON.stringify(file + '.tmp')},JSON.stringify([process.pid,child.pid]));require('node:fs').renameSync(${JSON.stringify(file + '.tmp')},${JSON.stringify(file)});setInterval(()=>{},1000);
`], env: { ...process.env, HTTPS_PROXY: 'http://fixture.invalid' } });
    const deadline = Date.now() + 4000;
    while (!existsSync(file)) { assert.ok(Date.now() < deadline); await new Promise(r => setTimeout(r, 10)); }
    pids = JSON.parse(readFileSync(file)); await new Promise(r => setTimeout(r, 100));
    await pty.killPty();
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally {
    for (const pid of pids.reverse()) try { process.kill(pid, 'SIGKILL'); } catch {}
    await pty.killPty(); rmSync(root, { recursive: true, force: true });
  }
});

test('a naturally exited PTY still reaps the tool child left in its owned group', { timeout: 10000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-b7-pty-exit-tree-')), file = join(root, 'pids.json');
  const pty = createPtySession(); let pids = [];
  try {
    await pty.spawnCodexRequest({ cwd: root, codexPath: process.execPath, args: ['-e', `
const child=require('node:child_process').spawn(process.execPath,['-e',"process.on('SIGHUP',()=>{});process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});
require('node:fs').writeFileSync(${JSON.stringify(file + '.tmp')},JSON.stringify([process.pid,child.pid]));require('node:fs').renameSync(${JSON.stringify(file + '.tmp')},${JSON.stringify(file)});process.stdin.on('data',()=>process.exit(0));process.stdin.resume();
`], env: { ...process.env, HTTPS_PROXY: 'http://fixture.invalid' } });
    const deadline = Date.now() + 4000;
    while (!existsSync(file)) { assert.ok(Date.now() < deadline); await new Promise(r => setTimeout(r, 10)); }
    pids = JSON.parse(readFileSync(file)); await new Promise(r => setTimeout(r, 100));
    const exited = new Promise(resolve => { const off = pty.onPtyExit(() => { off(); resolve(); }); });
    pty.writeToPty('finish\r'); await exited; await pty.killPty();
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally {
    for (const pid of pids.reverse()) try { process.kill(pid, 'SIGKILL'); } catch {}
    await pty.killPty(); rmSync(root, { recursive: true, force: true });
  }
});
