import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, linkSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'cxv-schedule-security-'));
const logs = join(root, 'logs');
mkdirSync(logs);
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: logs,
  CXV_PROJECT_DIR: root, CXV_TEST: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1',
  CXV_START_PORT: '20910', CXV_MAX_PORT: '20919' });
const prefs = await import('../lib/preferences.js');
const policy = await import('../lib/credential-file-policy.js');

test('schedule bodies remain private and cannot be replaced through general preferences', async () => {
  const server = await import('../server.js');
  const original = { version: 1, tasks: [{ id: 'st_fixture', prompt: 'synthetic private prompt' }] };
  prefs.updatePreferences(p => ({ ...p, scheduledTasks: original }));
  try {
    await server.startViewer();
    const base = `http://127.0.0.1:${server.getPort()}`;
    assert.equal('scheduledTasks' in await (await fetch(`${base}/api/preferences`)).json(), false);
    const res = await fetch(`${base}/api/preferences`, { method: 'POST',
      headers: { 'content-type': 'application/json', Origin: base },
      body: JSON.stringify({ scheduledTasks: { version: 1, tasks: [] }, displayScale: 110 }) });
    assert.equal(res.status, 200);
    assert.equal('scheduledTasks' in await res.json(), false);
    assert.deepEqual(prefs.readPreferences().scheduledTasks, original);
    assert.equal(prefs.readPreferences().displayScale, 110);
    for (const name of ['preferences.json', 'scheduled-task-runs.json', 'scheduled-tasks.json',
      'preferences.json.tmp-fixture', 'scheduled-task-runs.json.corrupt-fixture', 'scheduled-tasks.json.lock']) {
      const path = join(logs, name);
      if (name !== 'preferences.json') writeFileSync(path, 'synthetic private data');
      assert.equal(policy.isPublicFilePath(path), false, name);
      const alias = join(root, 'alias-' + name);
      linkSync(path, alias);
      assert.equal(policy.isPublicFilePath(alias), false, 'hardlink ' + name);
      assert.throws(() => policy.assertPublicMutationPath(logs), { code: 'ACCESS_DENIED' });
      const fixture = join(root, name);
      writeFileSync(fixture, 'public project fixture');
      assert.equal(policy.isPublicFilePath(fixture), true, 'outside owner ' + name);
    }
  } finally { await server.stopViewer(); }
});

test('explicit store files share private atomic IO and reject linked sources without data loss', () => {
  try {
    const file = join(root, 'custom.json');
    const globalBefore = readFileSync(join(logs, 'preferences.json'));
    prefs.updatePreferences(p => ({ ...p, counter: 1 }), { file, durable: true });
    assert.equal(prefs.readPreferences({ file, strict: true }).counter, 1);
    assert.deepEqual(readFileSync(join(logs, 'preferences.json')), globalBefore);
    const alias = join(root, 'custom-link.json');
    symlinkSync(file, alias);
    assert.throws(() => prefs.updatePreferences(p => p, { file: alias }), { code: 'PREFERENCES_UNREADABLE' });
    linkSync(file, join(root, 'hardlink.json'));
    const before = readFileSync(file);
    assert.throws(() => prefs.updatePreferences(p => p, { file }), { code: 'PREFERENCES_UNREADABLE' });
    assert.deepEqual(readFileSync(file), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
