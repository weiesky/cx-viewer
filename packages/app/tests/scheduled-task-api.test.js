import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = mkdtempSync(join(tmpdir(), 'cxv-task-api-'));
const a = join(root, 'a/same'), b = join(root, 'b/same'), logs = join(root, 'logs');
for (const dir of [a, b, logs]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_PROJECT_DIR: a, CXV_LOG_DIR: logs,
  CXV_TEST: '1', CXV_CLI_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_SDK_MODE: '1', CXV_START_PORT: '20930', CXV_MAX_PORT: '20939' });
const sdk = await import('../lib/sdk-manager.js');
const server = await import('../server.js');
const scheduler = await import('../lib/scheduled-task-scheduler.js');
const { getTask } = await import('../lib/scheduled-task-store.js');

test('real schedule HTTP routes bind exact instances and isolate same-name projects and mutations', async () => {
  const marker = join(root, 'unexpected-native');
  const script = join(root, 'never-run.mjs');
  writeFileSync(script, 'import{writeFileSync}from"node:fs";writeFileSync(' + JSON.stringify(marker) + ',"unexpected");process.exit(99);');
  sdk.setSdkLaunchConfig({ codexPath: script, transport: 'appserver' });
  const first = sdk.initSdkSession(a, 'same', { codexPath: script, transport: 'appserver' });
  const second = sdk.initSdkSession(b, 'same', { codexPath: script, transport: 'appserver' });
  const executions = [];
  try {
    await server.startViewer();
    scheduler.initScheduledTaskScheduler({ getRoot: () => logs, getMode: () => ({ sdk: true }),
      getSpawnConfig: () => ({ available: true }), canExecute: () => true, isReady: () => true,
      execute: async task => { executions.push(task.instanceKey); return { status: 'dispatched' }; }, broadcast: () => {} });
    scheduler.startScheduledTaskScheduler();
    const base = `http://127.0.0.1:${server.getPort()}`;
    const call = async (path, instance, body, headers = {}) => {
      const res = await fetch(base + path + '?instance=' + instance, body === undefined ? {} : {
        method: 'POST', headers: { 'content-type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body) });
      return { status: res.status, data: await res.json() };
    };
    const draft = { project: 'same', instance: first.instanceKey, prompt: 'private a', mode: 'inject',
      schedule: { kind: 'daily', time: '09:00' }, permissionMode: 'inherit', cwd: b, engine: 'foreign' };
    const created = await call('/api/scheduled-tasks', first.instanceKey, draft);
    assert.equal(created.status, 200, JSON.stringify(created));
    const id = created.data.task.id;
    assert.equal(created.data.task.cwd, a);
    assert.equal(created.data.task.instanceKey, first.instanceKey);
    assert.equal(created.data.task.engine, 'sdk');
    assert.equal(created.data.task.permissionMode, undefined, 'client cannot enable inherited bypass');
    assert.equal((await call('/api/scheduled-tasks', second.instanceKey)).data.tasks.length, 0);
    for (const action of ['update', 'delete', 'run']) {
      assert.equal((await call('/api/scheduled-tasks/' + action, second.instanceKey, { id, prompt: 'attack' })).status, 403);
    }
    const foreignRuns = await fetch(base + '/api/scheduled-tasks/runs?instance=' + second.instanceKey + '&id=' + id);
    assert.equal(foreignRuns.status, 403);
    assert.equal((await call('/api/scheduled-tasks', first.instanceKey, { ...draft, instance: second.instanceKey })).status, 409);
    assert.equal((await call('/api/scheduled-tasks', first.instanceKey, { ...draft, project: 'forged' })).status, 409);
    assert.equal((await call('/api/scheduled-tasks', first.instanceKey, draft, { Origin: 'https://hostile.invalid' })).status, 403);
    assert.equal((await call('/api/scheduled-tasks', first.instanceKey, draft, { 'sec-fetch-site': 'cross-site' })).status, 403);
    const before = readFileSync(join(logs, 'preferences.json'));
    assert.equal((await call('/api/scheduled-tasks/update', first.instanceKey, { id, prompt: '', mode: 'spawn' })).status, 400);
    assert.deepEqual(readFileSync(join(logs, 'preferences.json')), before);
    assert.equal((await call('/api/scheduled-tasks/run', first.instanceKey, { id })).status, 202);
    assert.deepEqual(executions, [first.instanceKey]);
    const end = Date.now() + 2000;
    while (getTask(logs, id).claim) { assert.ok(Date.now() < end); await new Promise(r => setTimeout(r, 10)); }
    const runs = await (await fetch(base + '/api/scheduled-tasks/runs?instance=' + first.instanceKey + '&id=' + id)).json();
    assert.equal(runs.runs.length, 1);
    assert.equal(runs.runs[0].status, 'dispatched');
    assert.equal((await call('/api/scheduled-tasks/preview', first.instanceKey, { schedule: draft.schedule })).data.next.length, 3);
    assert.equal((await call('/api/scheduled-tasks/delete', first.instanceKey, { id })).status, 200);
    assert.equal((await call('/api/scheduled-tasks', first.instanceKey)).data.tasks.length, 0);
    assert.equal(existsSync(marker), false, 'REST/storage fixture never launches the model executable');
  } finally { scheduler.__resetSchedulerForTests(); await sdk.stopSession(); sdk.setSdkLaunchConfig(null); await server.stopViewer(); rmSync(root, { recursive: true, force: true }); }
});
