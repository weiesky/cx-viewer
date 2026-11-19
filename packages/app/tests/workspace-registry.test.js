import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const moduleUrl = pathToFileURL(join(process.cwd(), 'workspace-registry.js')).href;
const child = (dir, source) => run(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  import { registerWorkspace, removeWorkspace, loadWorkspaces } from ${JSON.stringify(moduleUrl)};
  ${source}
`], { env: { ...process.env, CXV_LOG_DIR: dir } });

test('registry mutation preserves malformed contents and releases its lock', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-registry-corrupt-'));
  const path = join(dir, 'workspaces.json');
  try {
    const invalidUtf8 = Buffer.concat([Buffer.from('{"workspaces":[],"note":"'), Buffer.from([0xff]), Buffer.from('"}')]);
    for (const bytes of ['{broken', 'null', '[]', '{}', '{"workspaces":null}', '{"workspaces":{}}', invalidUtf8]) {
      writeFileSync(path, bytes);
      await child(dir, `
        assert.deepEqual(loadWorkspaces(), []);
        assert.throws(() => registerWorkspace('/fixture/new'), { code: 'WORKSPACES_UNREADABLE' });
        assert.throws(() => removeWorkspace('old'), { code: 'WORKSPACES_UNREADABLE' });
      `);
      assert.deepEqual(readFileSync(path), Buffer.from(bytes));
      assert.equal(existsSync(join(dir, 'workspaces.lock')), false);
    }
    rmSync(path);
    await child(dir, `
      const first = registerWorkspace('/fixture/new');
      assert.equal(registerWorkspace('/fixture/new').id, first.id);
      assert.equal(removeWorkspace(first.id), true);
      assert.equal(loadWorkspaces().length, 0);
    `);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('registry writes propagate disk failures without reporting a successful registration', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-registry-write-'));
  const original = '{"workspaces":[]}';
  writeFileSync(join(dir, 'workspaces.json'), original);
  try {
    await child(dir, `
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      const rename = fs.renameSync;
      fs.renameSync = () => { throw Object.assign(new Error('injected disk failure'), { code: 'EIO' }); };
      syncBuiltinESMExports();
      try { assert.throws(() => registerWorkspace('/fixture/new'), { code: 'EIO' }); }
      finally { fs.renameSync = rename; syncBuiltinESMExports(); }
    `);
    assert.equal(readFileSync(join(dir, 'workspaces.json'), 'utf8'), original);
    assert.deepEqual(readdirSync(dir), ['workspaces.json']);
    await child(dir, `registerWorkspace('/fixture/recovered');`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('concurrent registry processes retain every independent registration', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-registry-concurrent-'));
  try {
    await Promise.all(['one', 'two'].map(prefix => child(dir, `
      for (let i = 0; i < 20; i++) registerWorkspace('/fixture/${prefix}-' + i);
    `)));
    const list = JSON.parse(readFileSync(join(dir, 'workspaces.json'), 'utf8')).workspaces;
    assert.equal(list.length, 40);
    assert.equal(new Set(list.map(w => w.path)).size, 40);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('registry lock release does not unlink a replacement lock', { skip: process.platform === 'win32' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-registry-owner-'));
  try {
    await child(dir, `
      import fs from 'node:fs';
      import { join } from 'node:path';
      import { syncBuiltinESMExports } from 'node:module';
      const rename = fs.renameSync;
      const lock = join(process.env.CXV_LOG_DIR, 'workspaces.lock');
      fs.renameSync = (src, dst) => {
        const result = rename(src, dst);
        fs.unlinkSync(lock);
        fs.writeFileSync(lock, 'replacement owner');
        return result;
      };
      syncBuiltinESMExports();
      try { registerWorkspace('/fixture/one'); }
      finally { fs.renameSync = rename; syncBuiltinESMExports(); }
      assert.equal(fs.readFileSync(lock, 'utf8'), 'replacement owner');
    `);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
