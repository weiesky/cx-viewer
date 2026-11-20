import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodexAppServerClient } from '../lib/codex-appserver-client.js';

async function fixture(run, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-appserver-client-'));
  const script = join(root, 'codex.mjs');
  writeFileSync(script, `import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
const send = frame => process.stdout.write(JSON.stringify(frame) + '\\n');
let lastServerResponse = null;
for await (const line of createInterface({ input: process.stdin })) {
 const f = JSON.parse(line);
 if (!f.method) { lastServerResponse = f; send({ method: 'reply-seen', params: f }); continue; }
 if (f.method === 'last-server-response') { send({ id: f.id, result: lastServerResponse }); continue; }
 if (f.method === 'exit') process.exit(3);
 if (f.method === 'invalid') { process.stdout.write('not-json\\n'); continue; }
 if (f.method === 'oversized') { process.stdout.write('x'.repeat(4096)); continue; }
 if (f.method === 'spawn-descendant') {
  const child = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)"], { stdio: ['ignore', 'pipe', 'ignore'] });
  child.stdout.once('data', () => send({ id: f.id, result: { pid: child.pid } })); continue;
 }
 if (f.method === 'delay') { setTimeout(() => send({ id: f.id, result: f.params }), 100); continue; }
 if (f.method === 'server-request') {
  send({ id: f.id, method: 'item/commandExecution/requestApproval', params: { command: 'fixture-only' } });
 }
 if (f.id !== undefined) send({ id: f.id, result: { ...f.params, pid: process.pid } });
}
`);
  const clients = [];
  const create = config => { const c = createCodexAppServerClient({ codexPath: script, cwd: root,
    requestTimeoutMs: 1000, ...options, ...config }); clients.push(c); return c; };
  try { await run(create, root); }
  finally { await Promise.all(clients.map(c => c.stop())); rmSync(root, { recursive: true, force: true }); }
}

test('stdio clients own separate processes and correlate RPCs independent of server request IDs', async () => {
  await fixture(async create => {
    const a = create(), b = create(), frames = [];
    a.subscribe(frame => {
      frames.push(frame);
      if (frame.id !== undefined) a.respond(frame.id, { decision: 'decline' });
    });
    const [ra, rb] = await Promise.all([a.request('server-request', { marker: 'A' }), b.request('echo', { marker: 'B' })]);
    assert.equal(ra.marker, 'A'); assert.equal(rb.marker, 'B'); assert.notEqual(ra.pid, rb.pid);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(frames.find(frame => frame.method === 'reply-seen').params.result.decision, 'decline');
    await a.stop();
    assert.equal((await b.request('echo', { marker: 'still B' })).marker, 'still B');
    await assert.rejects(a.request('echo', {}));
  });
});

test('aborted and timed out RPCs cannot consume a later response or replay a turn', async () => {
  await fixture(async create => {
    const c = create(), controller = new AbortController();
    const aborted = c.request('delay', { marker: 'old' }, { signal: controller.signal });
    controller.abort(); await assert.rejects(aborted, { name: 'AbortError' });
    await assert.rejects(c.request('delay', { marker: 'timed-out' }, { timeoutMs: 10 }), { code: 'CODEX_RPC_TIMEOUT' });
    const current = await c.request('echo', { marker: 'current' });
    assert.equal(current.marker, 'current');
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal((await c.request('echo', { marker: 'next' })).marker, 'next');
  });
});

test('malformed or oversized frames and early process death reject pending work and close ownership', async () => {
  for (const method of ['invalid', 'oversized', 'exit']) {
    await fixture(async create => {
      const c = create();
      await assert.rejects(c.request(method, {}));
      await c.closed;
      await assert.rejects(c.request('echo', {}));
    }, { maxFrameBytes: 1024 });
  }
});

test('unsupported server requests fail closed and missing executables reject without a dangling timeout', async () => {
  await fixture(async create => {
    const c = create();
    await c.request('server-request', {});
    // stdin order guarantees the automatic denial is handled before this RPC.
    // No subscriber is installed: this must exercise the default rejection.
    const response = await c.request('last-server-response');
    assert.equal(response.error.code, -32601);
    const missing = create({ codexPath: '/does-not-exist/codex' });
    await assert.rejects(missing.request('initialize', {}), { code: 'ENOENT' }); await missing.closed;
  });
});

test('stopping one POSIX client reaps its signal-resistant descendant and leaves another client alive',
  { skip: process.platform === 'win32' }, async () => {
    await fixture(async create => {
      const a = create(), b = create();
      const { pid } = await a.request('spawn-descendant', {});
      await a.stop();
      const deadline = Date.now() + 2000;
      let alive = true;
      while (alive && Date.now() < deadline) {
        try { process.kill(pid, 0); await new Promise(resolve => setTimeout(resolve, 10)); }
        catch (error) { if (error.code !== 'ESRCH') throw error; alive = false; }
      }
      assert.equal(alive, false, 'the owned grandchild must not outlive stop');
      assert.equal((await b.request('echo', { marker: 'B alive' })).marker, 'B alive');
    });
  });
