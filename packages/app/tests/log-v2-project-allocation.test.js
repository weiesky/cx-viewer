import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureProjectIdForCwd, resolveProjectIdForCwd } from '../lib/log-v2/project-id.js';
import { projectArchiveDirectoryName } from '../lib/log-v2/identity.js';

const exec = promisify(execFile);
const moduleUrl = new URL('../lib/log-v2/project-id.js', import.meta.url).href;
const directory = (root, id) => join(root, projectArchiveDirectoryName(id));
const manifest = (root, id) => join(directory(root, id), 'project.json');

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-project-allocation-'));
  try { return run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('only colliding paths get a suffix, allocation preserves existing manifests and lookup is read-only', () => fixture(root => {
  const a = '/fixture/one/same', b = '/fixture/two/same';
  assert.equal(resolveProjectIdForCwd(root, a), 'same');
  assert.deepEqual(readdirSync(root), []);
  const first = ensureProjectIdForCwd(root, a);
  assert.equal(first, 'same');
  const original = readFileSync(manifest(root, first));
  const second = ensureProjectIdForCwd(root, b);
  assert.match(second, /^same--[0-9a-f]{16}$/);
  assert.deepEqual(readFileSync(manifest(root, first)), original);
  assert.equal(ensureProjectIdForCwd(root, b), second);
  assert.equal(resolveProjectIdForCwd(root, a), first);
  assert.equal(resolveProjectIdForCwd(root, b), second);
  rmSync(directory(root, first), { recursive: true });
  assert.equal(resolveProjectIdForCwd(root, b), second, 'deleting the sibling cannot move surviving history');
  assert.equal(ensureProjectIdForCwd(root, b), second);
}));

test('collision suffixes fit the encoded storage limit for long uppercase project names', () => fixture(root => {
  const name = 'A'.repeat(72);
  assert.equal(ensureProjectIdForCwd(root, `/fixture/one/${name}`), name);
  const second = ensureProjectIdForCwd(root, `/fixture/two/${name}`);
  assert.notEqual(second, name);
  assert.ok(projectArchiveDirectoryName(second).length <= 230);
  assert.equal(readdirSync(root).length, 2);
  assert.equal(resolveProjectIdForCwd(root, `/fixture/two/${name}`), second);
}));

test('damaged manifests and unsafe aliases refuse allocation without creating a fallback', () => fixture(root => {
  mkdirSync(directory(root, 'same'));
  const path = manifest(root, 'same');
  writeFileSync(path, '{broken');
  const bytes = readFileSync(path);
  assert.throws(() => ensureProjectIdForCwd(root, '/fixture/one/same'));
  assert.deepEqual(readFileSync(path), bytes);
  assert.equal(readdirSync(root).length, 1);
  rmSync(path);
  const archive = join(directory(root, 'same'), '20261118_existing.cxvsession');
  mkdirSync(archive);
  assert.throws(() => ensureProjectIdForCwd(root, '/fixture/one/same'), /manifest is missing/);
  assert.deepEqual(readdirSync(directory(root, 'same')), ['20261118_existing.cxvsession']);
  rmSync(archive, { recursive: true });
  const target = join(root, 'external');
  writeFileSync(target, '{}');
  symlinkSync(target, path);
  assert.throws(() => ensureProjectIdForCwd(root, '/fixture/one/same'), /safe file/);
  assert.equal(readFileSync(target, 'utf8'), '{}');
  rmSync(directory(root, 'same'), { recursive: true });
  symlinkSync(root, directory(root, 'same'));
  assert.throws(() => ensureProjectIdForCwd(root, '/fixture/one/same'), /safe directory/);
}));

test('a populated suffix keeps its binding; a forged digest binding cannot be overwritten', () => fixture(root => {
  const a = '/fixture/one/same', b = '/fixture/two/same';
  ensureProjectIdForCwd(root, a);
  const second = ensureProjectIdForCwd(root, b);
  const path = manifest(root, second);
  const changed = { ...JSON.parse(readFileSync(path)), canonicalCwd: '/forged/other' };
  writeFileSync(path, JSON.stringify(changed));
  const bytes = readFileSync(path);
  assert.throws(() => ensureProjectIdForCwd(root, b), /digest collision/);
  assert.deepEqual(readFileSync(path), bytes);
}));

test('competing processes elect one readable-name owner and keep stable bindings after restart', { timeout: 15000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-project-processes-'));
  const script = `import { ensureProjectIdForCwd } from ${JSON.stringify(moduleUrl)};
    process.stdout.write(ensureProjectIdForCwd(process.argv[1], process.argv[2]));`;
  const a = '/fixture/one/same', b = '/fixture/two/same';
  try {
    const paths = [a, b, a, b, a, b];
    const outputs = await Promise.all(paths.map(cwd => exec(process.execPath, ['--input-type=module', '-e', script, root, cwd])));
    const ids = new Map(paths.map((cwd, index) => [cwd, outputs[index].stdout]));
    assert.equal(ids.size, 2);
    assert.notEqual(ids.get(a), ids.get(b));
    assert.ok([...ids.values()].includes('same'));
    for (let index = 0; index < paths.length; index++) assert.equal(outputs[index].stdout, ids.get(paths[index]));
    for (const cwd of [b, a]) {
      const after = await exec(process.execPath, ['--input-type=module', '-e', script, root, cwd]);
      assert.equal(after.stdout, ids.get(cwd));
      assert.equal(JSON.parse(readFileSync(manifest(root, after.stdout))).canonicalCwd, cwd);
    }
    assert.equal(readdirSync(root).length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
