import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { resolveIngestionSourceIdentity } from '../lib/log-v2/identity.js';
import { ensureProjectIdForCwd } from '../lib/log-v2/project-id.js';
import { sdkToJSONLEntry } from '../lib/sdk-adapter.js';

const cli = fileURLToPath(new URL('../cli.js', import.meta.url));
const pause = () => new Promise(resolve => setTimeout(resolve, 25));

async function fixture(run) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-sdk-cli-resume-')));
  const bin = join(root, 'bin'), home = join(root, 'home'), logs = join(root, 'logs');
  const cwd = join(root, 'a', 'same'), sibling = join(root, 'b', 'same');
  for (const dir of [bin, home, cwd, sibling]) mkdirSync(dir, { recursive: true });
  symlinkSync(process.execPath, join(bin, 'node'));
  for (const name of ['open', 'xdg-open']) {
    writeFileSync(join(bin, name), '#!/bin/sh\nprintf "%s" "$1" > "$HOME/opened"\n');
    chmodSync(join(bin, name), 0o755);
  }
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\nprintf "%s" "$HOME/empty-global"\n');
  chmodSync(join(bin, 'npm'), 0o755);
  writeFileSync(join(bin, 'codex.mjs'), `#!${process.execPath}
const { appendFileSync } = await import('node:fs');
let input = ''; for await (const chunk of process.stdin) input += chunk;
appendFileSync(process.env.HOME + '/calls', JSON.stringify({ argv: process.argv, input, cwd: process.cwd() }) + '\\n');
const index = process.argv.indexOf('resume');
for (const event of [
  { type: 'thread.started', thread_id: index >= 0 ? process.argv[index + 1] : 'unexpected-new-thread' },
  { type: 'turn.started' },
  { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: 'continued answer' } },
  { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } },
]) process.stdout.write(JSON.stringify(event) + '\\n');
`);
  chmodSync(join(bin, 'codex.mjs'), 0o755);
  symlinkSync(join(bin, 'codex.mjs'), join(bin, 'codex'));
  const seed = (threadId, { directory = cwd, source = 'sdk', createdAt = '2026-11-18T00:00:00.000Z' } = {}) => {
    const projectId = ensureProjectIdForCwd(logs, directory);
    const writer = LogV2Writer.open({ rootDir: logs, canonicalCwd: directory, projectId,
      sessionId: threadId, rootThreadId: threadId, source, createdAt });
    const entry = sdkToJSONLEntry({ message: { content: [{ type: 'text', text: 'historic answer' }] } },
      [{ role: 'user', content: 'historic ' + threadId }], 'seed-model', basename(directory),
      { timestamp: createdAt, threadId, cwd: directory, status: 200 });
    writer.append(entry, resolveIngestionSourceIdentity(entry, { source, threadId, sessionId: threadId }));
    const timeline = join(writer.sessionDir, 'timeline.jsonl');
    return { timeline, file: relative(logs, timeline).split(sep).join('/') };
  };
  const processes = [];
  const start = async args => {
    const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
    const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
    const child = spawn(process.execPath, [cli, '--sdk', ...args], {
      cwd: join(root, 'a'), env: { ...process.env, HOME: home, CODEX_HOME: join(home, 'codex'),
        PATH: bin + ':/usr/bin:/bin', SHELL: '/bin/bash', CXV_LOG_DIR: logs, CXV_TEST: '1',
        CXV_CAPTURE_ONLY: '1', CXV_START_PORT: String(port), CXV_MAX_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const state = { child, exited: once(child, 'exit'), output: '', port };
    child.stdout.on('data', chunk => state.output += chunk);
    child.stderr.on('data', chunk => state.output += chunk);
    processes.push(state);
    state.wait = async predicate => {
      const deadline = Date.now() + 15000;
      while (!await predicate()) {
        assert.equal(child.exitCode, null, state.output);
        assert.ok(Date.now() < deadline, 'CLI readiness timeout: ' + state.output);
        await pause();
      }
    };
    state.http = async path => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(response.status, 200, await response.clone().text());
      return response;
    };
    state.ready = () => state.wait(() => existsSync(join(home, 'opened')));
    return state;
  };
  try { await run({ root, home, logs, cwd, sibling, seed, start }); }
  finally {
    for (const state of processes) {
      if (state.child.exitCode == null) state.child.kill('SIGTERM');
      const timer = setTimeout(() => state.child.kill('SIGKILL'), 5000);
      await state.exited; clearTimeout(timer);
    }
    rmSync(root, { recursive: true, force: true });
  }
}

test('SDK CLI restores the exact workspace archive before serving without executing a turn', { timeout: 30000 }, async () => fixture(async f => {
  f.seed('wanted-thread');
  f.seed('other-thread', { createdAt: '2026-11-18T00:01:00.000Z' });
  f.seed('wanted-thread', { directory: f.sibling, createdAt: '2026-11-18T00:02:00.000Z' });
  const state = await f.start(['resume', '-C', 'same', '-m', 'kept-model', '-s', 'read-only', 'wanted-thread']);
  await state.ready();
  const sessions = (await (await state.http('/api/workspaces')).json()).sessions;
  assert.equal(sessions[0].cwd, f.cwd);
  assert.equal(sessions[0].sessionId, 'wanted-thread');
  assert.equal(existsSync(join(f.home, 'calls')), false, 'restoring must not execute a model turn');
  const frames = (await (await state.http('/api/log-v2/snapshot')).text()).trim().split('\n').map(JSON.parse);
  assert.equal(frames[0].archive.sessionId, 'wanted-thread', 'selected old archive is pinned before the first new turn');
  const response = await fetch(`http://127.0.0.1:${state.port}/api/resume-session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: 'missing' }),
  });
  assert.equal(response.status, 400);
}));

test('SDK CLI --last/legacy continue retain config and execute only the new prompt on the selected thread', { timeout: 30000 }, async () => fixture(async f => {
  f.seed('older-thread');
  f.seed('latest-thread', { createdAt: '2026-11-18T00:01:00.000Z' });
  f.seed('foreign-thread', { directory: f.sibling, createdAt: '2026-11-18T00:02:00.000Z' });
  const state = await f.start(['-C', 'same', 'continue', '-m', 'kept-model', '-s', 'read-only', '--', 'next task']);
  await state.ready();
  await state.wait(() => existsSync(join(f.home, 'calls')));
  await state.wait(async () => !(await (await state.http('/api/workspaces')).json()).sessions[0].busy);
  const calls = readFileSync(join(f.home, 'calls'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, 'next task');
  assert.equal(calls[0].argv[calls[0].argv.indexOf('resume') + 1], 'latest-thread');
  assert.ok(calls[0].argv.includes('kept-model'));
  assert.ok(calls[0].argv.includes('read-only'));
  const snapshot = await (await state.http('/api/log-v2/snapshot')).text();
  assert.ok(snapshot.includes('latest-thread'));
  // The full history remains in canonical storage, not just the native ID.
  const { readSdkResumeHistory } = await import('../lib/sdk-resume-history.js');
  const { resolveProjectIdForCwd } = await import('../lib/log-v2/project-id.js');
  const { findV2SessionFileBySessionId } = await import('../lib/log-v2/materializer.js');
  const projectId = resolveProjectIdForCwd(f.logs, f.cwd);
  const file = findV2SessionFileBySessionId(f.logs, 'latest-thread', { projectId, canonicalCwd: f.cwd });
  const history = await readSdkResumeHistory(f.logs, file, { cwd: f.cwd, projectId });
  assert.deepEqual(history.messages[0], { role: 'user', content: 'historic latest-thread' });
  assert.ok(history.messages.some(item => item.role === 'user' && item.content === 'next task'));
  assert.ok(!JSON.stringify(history).includes('foreign-thread'));
}));

test('bare SDK resume opens the browser history picker without a model turn', { timeout: 30000 }, async () => fixture(async f => {
  f.seed('picker-thread');
  const state = await f.start(['-C', 'same', 'resume', '--profile', 'picker-profile']); await state.ready();
  assert.equal(new URL(readFileSync(join(f.home, 'opened'), 'utf8')).searchParams.get('resume'), '1');
  const sessions = (await (await state.http('/api/workspaces')).json()).sessions;
  assert.equal(sessions[0].sessionId, null);
  assert.equal(existsSync(join(f.home, 'calls')), false);
  const history = await (await state.http('/api/resume-sessions')).json();
  assert.equal(history.items[0].sessionId, 'picker-thread');
}));

test('SDK CLI missing, foreign and unsupported resume targets fail before registering or opening a browser', { timeout: 45000 }, async () => fixture(async f => {
  f.seed('foreign-thread', { directory: f.sibling });
  f.seed('proxy-thread', { source: 'proxy' });
  for (const args of [['resume', 'missing-thread'], ['resume', 'foreign-thread'], ['resume', '--last'],
    ['resume', '--all'], ['resume', '--include-non-interactive'], ['resume', '--', '--bad-id']]) {
    const state = await f.start(['-C', 'same', ...args]);
    const [code] = await state.exited;
    assert.equal(code, 1, state.output);
    assert.equal(existsSync(join(f.home, 'opened')), false);
    assert.equal(existsSync(join(f.home, 'calls')), false);
    assert.equal(existsSync(join(f.logs, 'workspaces.json')), false, 'failure must precede workspace registration');
  }
}));

test('SDK CLI --last refuses a damaged selected archive without falling back or altering its bytes', { timeout: 30000 }, async () => fixture(async f => {
  f.seed('healthy-thread');
  const damaged = f.seed('damaged-thread', { createdAt: '2026-11-18T00:01:00.000Z' });
  appendFileSync(damaged.timeline, '{"partial":');
  const before = readFileSync(damaged.timeline);
  const state = await f.start(['-C', 'same', 'resume', '--last']);
  assert.equal((await state.exited)[0], 1, state.output);
  assert.deepEqual(readFileSync(damaged.timeline), before);
  assert.equal(existsSync(join(f.home, 'opened')), false);
  assert.equal(existsSync(join(f.home, 'calls')), false);
  writeFileSync(damaged.timeline, before.subarray(0, before.length - Buffer.byteLength('{"partial":')));
  const manifest = join(damaged.timeline, '..', 'manifest.json');
  writeFileSync(manifest, '{"damaged":');
  const metadataBefore = readFileSync(manifest);
  const again = await f.start(['-C', 'same', 'resume', '--last']);
  assert.equal((await again.exited)[0], 1, again.output);
  assert.deepEqual(readFileSync(manifest), metadataBefore);
  assert.equal(existsSync(join(f.home, 'opened')), false);
  assert.equal(existsSync(join(f.logs, 'workspaces.json')), false);
}));
