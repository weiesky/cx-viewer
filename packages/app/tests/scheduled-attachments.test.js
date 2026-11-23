import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
const root = mkdtempSync(join(tmpdir(), 'cxv-schedule-attachments-'));
const a = join(root, 'a/same'), b = join(root, 'b/same');
for (const path of [a, b]) mkdirSync(path, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20990', CXV_MAX_PORT: '20999' });
const sdk = await import('../lib/sdk-manager.js'), server = await import('../server.js');

test('durable uploads retain exact same-name workspace ownership and survive temporary cleanup', async () => {
  const first = sdk.initSdkSession(a, 'same'), second = sdk.initSdkSession(b, 'same');
  const uploads = [];
  try {
    await server.startViewer();
    const base = `http://127.0.0.1:${server.getPort()}`;
    const upload = async (instance, text) => {
      const body = new FormData(); body.append('file', new Blob([text]), 'same.txt');
      const res = await fetch(base + '/api/upload?instance=' + instance, { method: 'POST', headers: { Origin: base }, body });
      assert.equal(res.status, 200); const value = await res.json(); uploads.push(value); return value;
    };
    const [one, two] = await Promise.all([upload(first.instanceKey, 'first private attachment'), upload(second.instanceKey, 'second private attachment')]);
    assert.notEqual(dirname(one.path), dirname(two.path));
    assert.notEqual(dirname(one.persistPath), dirname(two.persistPath));
    assert.equal(readFileSync(one.persistPath, 'utf8'), 'first private attachment');
    assert.equal(readFileSync(two.persistPath, 'utf8'), 'second private attachment');
    assert.equal(statSync(one.persistPath).mode & 0o777, 0o600);
    const raw = (instance, path) => fetch(base + '/api/file-raw?instance=' + instance + '&path=' + encodeURIComponent(path));
    assert.equal((await raw(first.instanceKey, two.persistPath)).status, 403);
    assert.equal((await raw(first.instanceKey, two.path)).status, 403);
    rmSync(one.path); rmSync(two.path);
    assert.equal(await (await raw(first.instanceKey, one.path)).text(), 'first private attachment');
    assert.equal(await (await raw(second.instanceKey, two.persistPath)).text(), 'second private attachment');
  } finally {
    await sdk.stopSession(); await server.stopViewer();
    for (const upload of uploads) rmSync(dirname(upload.path), { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
