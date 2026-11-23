import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProcessAdapter, killVerifiedTree } from '../lib/cxv-processes.js';
import { waitForProcessExit } from './helpers/process-exit.js';
const scratch = await import(process.env.B7_SCRATCH_MODULE || '../scratch-pty-manager.js');
const nativePty = await import('node-pty');
const adapter = createProcessAdapter();
async function until(predicate, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (!await predicate()) { assert.ok(Date.now() < deadline, 'owned fixture deadline'); await new Promise(resolve => setTimeout(resolve, 20)); }
}

for (const natural of [false, true]) test(`scratch ${natural ? 'natural exit' : 'workspace close'} waits for owned TERM-resistant descendants and preserves sibling`, { skip: process.platform === 'win32', timeout: 15000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-scratch-tree-')), file = join(root, 'pids.json'), script = join(root, 'parent.cjs');
  const previousShell = process.env.SHELL; process.env.SHELL = '/bin/sh';
  const previousMarker = process.env.CXV_BYPASS_PERMISSIONS; process.env.CXV_BYPASS_PERMISSIONS = '1';
  const identities = [];
  t.after(async () => {
    await scratch.shutdownScratchPtys();
    for (const identity of identities) await killVerifiedTree(adapter, identity, []);
    if (previousShell === undefined) delete process.env.SHELL; else process.env.SHELL = previousShell;
    if (previousMarker === undefined) delete process.env.CXV_BYPASS_PERMISSIONS; else process.env.CXV_BYPASS_PERMISSIONS = previousMarker;
    rmSync(root, { recursive: true, force: true });
  });
  scratch._setScratchPtyLoaderForTests(async () => nativePty.default || nativePty);
  writeFileSync(script, `const {spawn}=require('node:child_process');const {writeFileSync}=require('node:fs');
process.on('SIGTERM',()=>{});process.on('SIGHUP',()=>{});
const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});process.on('SIGHUP',()=>{});process.send('ready');setInterval(()=>{},1000)"],{stdio:['ignore','ignore','ignore','ipc']});
child.once('message',()=>{writeFileSync(${JSON.stringify(file)},JSON.stringify({parent:process.pid,child:child.pid,bypass:process.env.CXV_BYPASS_PERMISSIONS||null}));${natural ? 'process.exit(0)' : 'setInterval(()=>{},1000)'}});
`);
  const a = await scratch.openScratchPty('same', { instanceKey: 'a', cwd: root });
  const b = await scratch.openScratchPty('same', { instanceKey: 'b', cwd: root });
  for (const session of [a, b]) { const identity = await adapter.inspect(session.proc.pid); if (identity) identities.push(identity); }
  a.write(`${natural ? 'exec ' : ''}${JSON.stringify(process.execPath)} ${JSON.stringify(script)}\r`);
  await until(() => existsSync(file)); const pids = JSON.parse(readFileSync(file, 'utf8'));
  for (const pid of [pids.parent, pids.child]) { const identity = await adapter.inspect(pid); if (identity) identities.push(identity); }
  assert.equal(pids.bypass, null, 'actual shell must not inherit parent bypass');
  if (natural) { await until(() => a.exited); await a.kill(); }
  else await scratch.shutdownScratchPtys('a');
  for (const pid of [a.proc.pid, pids.parent, pids.child]) await waitForProcessExit(pid);
  assert.equal(b.exited, false); assert.ok(await adapter.inspect(b.proc.pid));
  const marker = `B7_SCRATCH_SURVIVOR_${natural ? 'N' : 'C'}`;
  b.write(`printf '${marker}\\n'\r`); await until(() => b.replay.includes(marker));
  await scratch.shutdownScratchPtys('b'); await waitForProcessExit(b.proc.pid);
});
