import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getSdkStreamingState, initSdkSession, interruptTurn, sendUserMessage, stopSession } from '../lib/sdk-manager.js';

async function until(check, label) {
  const deadline = Date.now() + 12000;
  while (!check()) {
    assert.ok(Date.now() < deadline, label);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

test('cancellation escalates only its owned stubborn child and a sibling stays alive',
  { timeout: 25000, skip: process.platform === 'win32' }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-owned-')), oldHome = process.env.CODEX_HOME;
  const a = join(root, 'a'), b = join(root, 'b'), executable = join(root, 'codex.mjs');
  mkdirSync(a); mkdirSync(b);
  writeFileSync(executable, String.raw`#!/usr/bin/env node
import {writeFileSync} from 'node:fs';import {join} from 'node:path';
let input='';for await(const chunk of process.stdin)input+=chunk;
const cwd=process.env.CXV_PROJECT_DIR;
const emit=value=>process.stdout.write(JSON.stringify(value)+'\n');
emit({type:'thread.started',thread_id:'owned-'+cwd});emit({type:'turn.started'});
if(input!=='fresh'){
 process.on('SIGTERM',()=>{writeFileSync(join(cwd,'signalled'),'yes');if(input!=='stubborn')process.exit(130)});
 writeFileSync(join(cwd,'pid'),String(process.pid));
 setInterval(()=>{},1000);
}else{emit({type:'item.completed',item:{id:'reply',type:'agent_message',text:'fresh works'}});emit({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}});}
`);
  chmodSync(executable, 0o755);
  const pending = [], entries = [];
  try {
    process.env.CODEX_HOME = root;
    const infoA = initSdkSession(a, 'same', { codexPath: executable, onEntry: entry => entries.push(entry) });
    const infoB = initSdkSession(b, 'same', { codexPath: executable });
    const runningA = sendUserMessage('stubborn', { instanceKey: infoA.instanceKey }); pending.push(runningA);
    const runningB = sendUserMessage('sibling', { instanceKey: infoB.instanceKey }); pending.push(runningB);
    await until(() => existsSync(join(a, 'pid')) && existsSync(join(b, 'pid')), 'both owned children must start');
    const pidA = Number(readFileSync(join(a, 'pid'))), pidB = Number(readFileSync(join(b, 'pid')));
    assert.equal(interruptTurn({ instanceKey: infoA.instanceKey }), true);
    await until(() => existsSync(join(a, 'signalled')), 'ordinary interrupt must be forwarded');
    assert.equal(getSdkStreamingState({ instanceKey: infoA.instanceKey }).active, true, 'busy is truthful during the grace period');
    assert.equal(existsSync(join(b, 'signalled')), false);
    await runningA;
    assert.throws(() => process.kill(pidA, 0), { code: 'ESRCH' });
    assert.doesNotThrow(() => process.kill(pidB, 0));
    assert.equal(getSdkStreamingState({ instanceKey: infoA.instanceKey }).active, false);
    assert.equal(getSdkStreamingState({ instanceKey: infoB.instanceKey }).active, true);
    assert.equal(entries.length, 1);
    assert.match(entries[0].response.body.content[0].text, /Turn interrupted/);
    await sendUserMessage('fresh', { instanceKey: infoA.instanceKey });
    assert.equal(entries.at(-1).response.status, 200);
  } finally {
    stopSession(); await Promise.allSettled(pending);
    if (oldHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = oldHome;
    rmSync(root, { recursive: true, force: true });
  }
});
