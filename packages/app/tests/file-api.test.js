import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';
const policyLogDir = mkdtempSync(join(tmpdir(), 'cxv-file-policy-root-'));
process.env.CXV_LOG_DIR = policyLogDir;
const { readFileContent, resolveFilePath, writeFileContent } = await import('../lib/file-api.js');
const { readPublicFileSync } = await import('../lib/public-file-read.js');
const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
after(() => rmSync(policyLogDir, { recursive: true, force: true }));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cxv-file-boundary-'));
  const project = join(root, 'project');
  mkdirSync(project);
  return { root, project, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('ordinary reads, new files and explicit editor paths remain supported', () => {
  const { root, project, cleanup } = fixture();
  try {
    writeFileContent(project, 'new.txt', 'inside', false);
    assert.equal(readFileContent(project, 'new.txt', false).content, 'inside');
    assert.equal(readPublicFileSync(join(project, 'new.txt'), 'utf8'), 'inside');
    assert.deepEqual(readPublicFileSync(join(project, 'new.txt')), Buffer.from('inside'));
    assert.equal(readFileContent(project, join(project, 'new.txt'), false).path, 'new.txt');
    assert.equal(resolveFilePath(parse(project).root, join(project, 'new.txt'), false), realpathSync(join(project, 'new.txt')));
    assert.throws(() => writeFileContent(project, join(project, 'new.txt'), 'no', false), { code: 'INVALID_PATH' });
    const outside = join(root, 'outside.txt');
    writeFileContent(project, outside, 'editor', true);
    assert.equal(readFileContent(project, outside, true).content, 'editor');
    assert.throws(() => readFileContent(project, outside, false), { code: 'INVALID_PATH' });
    assert.throws(() => resolveFilePath(project, 42, false), { code: 'INVALID_PATH' });
    assert.throws(() => writeFileContent(project, outside, 'no', 'false'), { code: 'INVALID_PATH' });
  } finally { cleanup(); }
});

test('relative file and directory links cannot escape the project for reads or writes', { skip: process.platform === 'win32' }, () => {
  const { root, project, cleanup } = fixture();
  try {
    const outside = join(root, 'outside.txt');
    writeFileSync(outside, 'keep');
    symlinkSync(outside, join(project, 'link.txt'));
    symlinkSync(root, join(project, 'escape'));
    symlinkSync(join(root, 'missing.txt'), join(project, 'dangling.txt'));
    for (const path of ['link.txt', 'escape/outside.txt', 'dangling.txt']) {
      assert.throws(() => readFileContent(project, path, false), { code: 'INVALID_PATH' });
      assert.throws(() => writeFileContent(project, path, 'replace', false), { code: 'INVALID_PATH' });
      assert.throws(() => resolveFilePath(project, path, false), { code: 'INVALID_PATH' });
    }
    assert.throws(() => writeFileContent(project, 'escape/new.txt', 'new', false), { code: 'INVALID_PATH' });
    assert.equal(readFileSync(outside, 'utf8'), 'keep');
    assert.equal(existsSync(join(root, 'new.txt')), false);
    assert.equal(existsSync(join(root, 'missing.txt')), false);
  } finally { cleanup(); }
});

test('links contained within the project resolve to their canonical target', { skip: process.platform === 'win32' }, () => {
  const { project, cleanup } = fixture();
  try {
    mkdirSync(join(project, 'actual'));
    writeFileSync(join(project, 'actual', 'file.txt'), 'inside');
    symlinkSync(join(project, 'actual'), join(project, 'alias'));
    assert.equal(resolveFilePath(project, 'alias/file.txt', false), realpathSync(join(project, 'actual', 'file.txt')));
    assert.equal(readFileContent(project, 'alias/file.txt', false).content, 'inside');
    writeFileContent(project, 'alias/new.txt', 'new', false);
    assert.equal(readFileSync(join(project, 'actual', 'new.txt'), 'utf8'), 'new');
  } finally { cleanup(); }
});

test('file reads and writes reject a private inode substituted after path validation', () => {
  const { project, cleanup } = fixture();
  mkdirSync(CREDENTIAL_PATHS.root, { recursive: true, mode: 0o700 });
  const key = Buffer.alloc(32, 7);
  writeFileSync(CREDENTIAL_PATHS.keyPath, key, { mode: 0o600 });
  const ordinary = join(project, 'ordinary.txt');
  writeFileSync(ordinary, 'keep');
  const open = fs.openSync;
  fs.openSync = (path, ...args) => open(path === realpathSync(ordinary) ? CREDENTIAL_PATHS.keyPath : path, ...args);
  syncBuiltinESMExports();
  try {
    assert.throws(() => readFileContent(project, 'ordinary.txt', false), { code: 'ACCESS_DENIED' });
    assert.throws(() => readPublicFileSync(ordinary), { code: 'ACCESS_DENIED' });
    assert.throws(() => writeFileContent(project, 'ordinary.txt', 'replace', false), { code: 'ACCESS_DENIED' });
    assert.deepEqual(readFileSync(CREDENTIAL_PATHS.keyPath), key);
    assert.equal(readFileSync(ordinary, 'utf8'), 'keep');
  } finally { fs.openSync = open; syncBuiltinESMExports(); cleanup(); }
});
