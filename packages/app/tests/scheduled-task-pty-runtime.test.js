import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = mkdtempSync(join(tmpdir(), 'cxv-task-pty-runtime-'));
const a = join(root, 'a/same'), b = join(root, 'b/same');
for (const dir of [a, b]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_PROJECT_DIR: a, CXV_LOG_DIR: join(root, 'logs'),
  CXV_TEST: '1', CXV_CLI_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_START_PORT: '20970', CXV_MAX_PORT: '20979' });
delete process.env.CXV_SDK_MODE;
const { createPtySession } = await import('../pty-manager.js');
const server = await import('../server.js');
const sessions = [], procs = [];

test('ordinary scheduled tasks reuse the exact PTY queue and never fall back after target close', async () => {
  const create = async cwd => {
    const pty = createPtySession();
    const proc = { writes: [], onData(cb) { this.data = cb; }, onExit(cb) { this.exit = cb; },
      write(text) { this.writes.push(text); }, resize() {}, kill() { this.exit?.({ exitCode: 0 }); } };
    pty._setPtyImportForTests(() => ({ spawn: () => proc }));
    await pty.spawnCodexRequest({ cwd, args: [], codexPath: '/fixture', serverPort: 20970 });
    sessions.push(pty); procs.push(proc);
    return { cwd, pty, runtime: { getContext: () => ({ sessionId: cwd === a ? 'a-session' : 'b-session' }),
      getInputState: () => ({ connected: true, active: false, pendingRequests: 0 }) } };
  };
  try {
    const registry = server.configurePtyWorkspaces({ boot: await create(a) });
    const first = registry.info(), second = registry.adopt(await create(b));
    server.setWorkspaceLaunched(true); await server.startViewer();
    const base = `http://127.0.0.1:${server.getPort()}`;
    const call = async (path, body) => {
      const res = await fetch(base + path + '?instance=' + second.instanceKey, body ? { method: 'POST',
        headers: { 'content-type': 'application/json', Origin: base }, body: JSON.stringify(body) } : {});
      return { status: res.status, data: await res.json() };
    };
    assert.equal((await call('/api/scheduled-tasks')).data.spawnAvailable, false);
    const draft = { project: 'same', instance: second.instanceKey, prompt: 'scheduled target B', mode: 'inject',
      schedule: { kind: 'daily', time: '09:00' } };
    assert.equal((await call('/api/scheduled-tasks', { ...draft, mode: 'spawn' })).status, 400);
    const task = (await call('/api/scheduled-tasks', draft)).data.task;
    assert.equal((await call('/api/scheduled-tasks/run', { id: task.id })).status, 202);
    const end = Date.now() + 5000;
    while (!procs[1].writes.includes('\r')) { assert.ok(Date.now() < end); await new Promise(r => setTimeout(r, 10)); }
    assert.deepEqual(procs[1].writes, ['\x1b[200~scheduled target B\x1b[201~', '\r']);
    assert.deepEqual(procs[0].writes, []);
    await registry.close(second.instanceKey);
    const res = await fetch(base + '/api/scheduled-tasks/run?instance=' + first.instanceKey, { method: 'POST',
      headers: { 'content-type': 'application/json', Origin: base }, body: JSON.stringify({ id: task.id }) });
    assert.equal(res.status, 403);
    assert.deepEqual(procs[0].writes, []);
  } finally { await server.stopViewer(); for (const pty of sessions) pty._resetPtyManagerForTests(); rmSync(root, { recursive: true, force: true }); }
});
