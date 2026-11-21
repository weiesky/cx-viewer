import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = mkdtempSync(join(tmpdir(), 'cxv-file-move-')), a = join(root, 'one/same'), b = join(root, 'two/same');
for (const dir of [a, b]) mkdirSync(join(dir, 'sub'), { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'state'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_SDK_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20430', CXV_MAX_PORT: '20439' });
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
const { CREDENTIAL_PATHS } = await import('../lib/credential-file-policy.js');
let port, infoA, infoB;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(a); sdk.setSdkLaunchConfig({ codexPath: process.execPath });
  infoA = sdk.initSdkSession(a, 'same', { codexPath: process.execPath }); infoB = sdk.launchSdkSession(b, 'same');
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true }); });
async function move(body, instance = infoA.instanceKey) {
  const res = await fetch(`http://127.0.0.1:${port}/api/move-file?` + new URLSearchParams({ instance }), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}
async function rename(body, instance = infoA.instanceKey) {
  const res = await fetch(`http://127.0.0.1:${port}/api/rename-file?` + new URLSearchParams({ instance }), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}
async function remove(path, instance = infoA.instanceKey) {
  const res = await fetch(`http://127.0.0.1:${port}/api/delete-file?` + new URLSearchParams({ instance }), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path }) });
  return { status: res.status, data: await res.json() };
}

test('directory aliases are expandable while private/dangling aliases and outside traversal stay blocked', async () => {
  mkdirSync(join(a, 'browse-dir')); writeFileSync(join(a, 'browse-dir/note.txt'), 'aliased bytes');
  symlinkSync(join(a, 'browse-dir'), join(a, 'browse-alias'));
  symlinkSync(join(a, 'browse-dir/note.txt'), join(a, 'browse-file-alias'));
  symlinkSync(join(a, 'missing-browse-target'), join(a, 'browse-broken'));
  symlinkSync(b, join(a, 'browse-outside'));
  mkdirSync(CREDENTIAL_PATHS.root, { recursive: true }); writeFileSync(CREDENTIAL_PATHS.keyPath, 'private');
  symlinkSync(CREDENTIAL_PATHS.keyPath, join(a, 'browse-private'));
  const list = async path => {
    const response = await fetch(`http://127.0.0.1:${port}/api/files?` + new URLSearchParams({ instance: infoA.instanceKey, path }));
    return { status: response.status, data: await response.json() };
  };
  const root = await list('.'); assert.equal(root.status, 200);
  assert.equal(root.data.find(entry => entry.name === 'browse-alias').type, 'directory');
  assert.equal(root.data.find(entry => entry.name === 'browse-file-alias').type, 'file');
  for (const name of ['browse-private', 'browse-broken']) assert.ok(!root.data.some(entry => entry.name === name));
  assert.equal((await list('browse-alias')).data.find(entry => entry.name === 'note.txt').type, 'file');
  assert.equal((await list('browse-outside')).status, 400);
});

test('delete refuses symlink targets and protected directory casing/separators', async () => {
  mkdirSync(join(a, 'delete-target')); writeFileSync(join(a, 'delete-target/keep.txt'), 'target bytes');
  symlinkSync(join(a, 'delete-target'), join(a, 'delete-link'));
  assert.equal((await remove('delete-link')).status, 400);
  assert.ok(fs.lstatSync(join(a, 'delete-link')).isSymbolicLink());
  assert.equal(readFileSync(join(a, 'delete-target/keep.txt'), 'utf8'), 'target bytes');
  for (const path of ['.GIT', 'NODE_MODULES/child', 'literal\\.SVN\\child']) {
    mkdirSync(join(a, path), { recursive: true }); writeFileSync(join(a, path, 'keep.txt'), 'protected bytes');
    assert.equal((await remove(path)).status, 400, path);
    assert.equal(readFileSync(join(a, path, 'keep.txt'), 'utf8'), 'protected bytes');
  }
});

test('delete revalidates a directory swapped after lstat and preserves outside bytes', async () => {
  const path = join(a, 'delete-race'), held = join(a, 'delete-held'), outside = join(b, 'delete-outside');
  mkdirSync(path); mkdirSync(outside); writeFileSync(join(path, 'keep.txt'), 'held bytes');
  writeFileSync(join(outside, 'keep.txt'), 'outside bytes');
  const lstat = fs.lstatSync; let swapped = false;
  fs.lstatSync = (target, ...args) => {
    const result = lstat(target, ...args);
    // Policy checks pass options; the actual delete lstat does not. Swap at
    // that final validation window, after returning a directory stat.
    if (!swapped && target === path && args.length === 0) {
      swapped = true; fs.renameSync(path, held); symlinkSync(outside, path);
    }
    return result;
  }; syncBuiltinESMExports();
  try { assert.equal((await remove('delete-race')).status, 400); assert.equal(swapped, true); }
  finally { fs.lstatSync = lstat; syncBuiltinESMExports(); }
  assert.equal(readFileSync(join(held, 'keep.txt'), 'utf8'), 'held bytes');
  assert.equal(readFileSync(join(outside, 'keep.txt'), 'utf8'), 'outside bytes');
  assert.ok(fs.lstatSync(path).isSymbolicLink());
});

test('ordinary file/directory delete remains scoped to the requested instance', async () => {
  for (const dir of [a, b]) { mkdirSync(join(dir, 'delete-owned')); writeFileSync(join(dir, 'delete-owned/note.txt'), dir === a ? 'A bytes' : 'B canary'); }
  assert.equal((await remove('delete-owned/note.txt')).status, 200);
  assert.equal((await remove('delete-owned')).status, 200);
  assert.equal(existsSync(join(a, 'delete-owned')), false);
  assert.equal(readFileSync(join(b, 'delete-owned/note.txt'), 'utf8'), 'B canary');
});

test('case-only file and directory renames preserve bytes and exact instance ownership', async () => {
  writeFileSync(join(a, 'Case.txt'), 'A case bytes'); writeFileSync(join(b, 'Case.txt'), 'B canary');
  assert.deepEqual(await rename({ oldPath: 'Case.txt', newName: 'case.txt', instance: infoB.instanceKey }),
    { status: 200, data: { ok: true, newPath: 'case.txt' } });
  assert.ok(readdirSync(a).includes('case.txt')); assert.ok(!readdirSync(a).includes('Case.txt'));
  assert.equal(readFileSync(join(a, 'case.txt'), 'utf8'), 'A case bytes');
  assert.equal(readFileSync(join(b, 'Case.txt'), 'utf8'), 'B canary');
  mkdirSync(join(a, 'sub/CaseDir')); writeFileSync(join(a, 'sub/CaseDir/keep.txt'), 'nested case bytes');
  assert.equal((await rename({ oldPath: 'sub/CaseDir', newName: 'casedir' })).data.newPath, 'sub/casedir');
  assert.ok(readdirSync(join(a, 'sub')).includes('casedir'));
  assert.equal(readFileSync(join(a, 'sub/casedir/keep.txt'), 'utf8'), 'nested case bytes');
});

test('rename retries transient locks, and a failed second case hop restores the original bytes', async () => {
  writeFileSync(join(a, 'Rollback.txt'), 'rollback bytes');
  const caseInsensitive = existsSync(join(a, 'rollback.txt'));
  const original = fs.renameSync; let calls = 0;
  fs.renameSync = (src, dst) => {
    if (dst === join(a, 'retry.txt') && calls++ === 0) throw Object.assign(new Error('transient fixture lock'), { code: 'EBUSY' });
    return original(src, dst);
  }; syncBuiltinESMExports();
  try {
    writeFileSync(join(a, 'retry-source.txt'), 'retry bytes');
    assert.equal((await rename({ oldPath: 'retry-source.txt', newName: 'retry.txt' })).status, 200);
    assert.equal(calls, 2); assert.equal(readFileSync(join(a, 'retry.txt'), 'utf8'), 'retry bytes');
  } finally { fs.renameSync = original; syncBuiltinESMExports(); }
  // Use the host's actual case behavior; emulate only canonical equality on a
  // case-sensitive host so the failure/rollback branch still runs there.
  const native = fs.realpathSync.native;
  if (!caseInsensitive) fs.realpathSync.native = path => path === join(a, 'rollback.txt') ? native(join(a, 'Rollback.txt')) : native(path);
  fs.renameSync = (src, dst) => {
    if (src.includes('.cxv-rename-') && dst === join(a, 'rollback.txt')) throw Object.assign(new Error('second hop fixture failure'), { code: 'EIO' });
    return original(src, dst);
  }; syncBuiltinESMExports();
  try {
    assert.equal((await rename({ oldPath: 'Rollback.txt', newName: 'rollback.txt' })).status, 500);
    assert.ok(readdirSync(a).includes('Rollback.txt'));
    assert.equal(readFileSync(join(a, 'Rollback.txt'), 'utf8'), 'rollback bytes');
    assert.ok(!readdirSync(a).some(name => name.startsWith('.cxv-rename-')));
  } finally { fs.renameSync = original; fs.realpathSync.native = native; syncBuiltinESMExports(); }
});

test('rename collisions, stale instances and protected aliases keep both original files', async () => {
  writeFileSync(join(a, 'rename-source.txt'), 'rename source'); writeFileSync(join(a, 'rename-dest.txt'), 'rename destination');
  assert.equal((await rename({ oldPath: 'rename-source.txt', newName: 'rename-dest.txt' })).status, 409);
  assert.equal((await rename({ oldPath: 'rename-source.txt', newName: 'renamed.txt' }, 'stale')).status, 404);
  mkdirSync(CREDENTIAL_PATHS.root, { recursive: true }); writeFileSync(CREDENTIAL_PATHS.keyPath, 'private');
  linkSync(CREDENTIAL_PATHS.keyPath, join(a, 'rename-alias'));
  assert.equal((await rename({ oldPath: 'rename-alias', newName: 'RENAME-ALIAS' })).status, 403);
  assert.equal(readFileSync(join(a, 'rename-source.txt'), 'utf8'), 'rename source');
  assert.equal(readFileSync(join(a, 'rename-dest.txt'), 'utf8'), 'rename destination');
  assert.equal(readFileSync(CREDENTIAL_PATHS.keyPath, 'utf8'), 'private');
});

test('empty destination moves file/directory to exact project root and returns a relative POSIX path', async () => {
  writeFileSync(join(a, 'sub/note.txt'), 'A bytes'); writeFileSync(join(b, 'sub/note.txt'), 'B canary');
  assert.deepEqual(await move({ fromPath: 'sub/note.txt', toDir: '' }), { status: 200, data: { ok: true, newPath: 'note.txt' } });
  assert.equal(readFileSync(join(a, 'note.txt'), 'utf8'), 'A bytes'); assert.equal(existsSync(join(a, 'sub/note.txt')), false);
  assert.equal(readFileSync(join(b, 'sub/note.txt'), 'utf8'), 'B canary');
  mkdirSync(join(a, 'sub/nested')); writeFileSync(join(a, 'sub/nested/keep.txt'), 'keep');
  assert.equal((await move({ fromPath: 'sub/nested', toDir: '' })).data.newPath, 'nested');
  assert.equal(readFileSync(join(a, 'nested/keep.txt'), 'utf8'), 'keep');
  assert.equal((await move({ fromPath: 'note.txt', toDir: 'nested/' })).data.newPath, 'nested/note.txt');
});

test('EXDEV fallback refuses symbolic targets and preserves ordinary copies and nested link identity', async () => {
  mkdirSync(join(a, 'cross-dest')); mkdirSync(join(a, 'cross-dir'));
  writeFileSync(join(a, 'cross-file.txt'), 'cross file bytes');
  writeFileSync(join(a, 'cross-dir/note.txt'), 'cross dir bytes');
  writeFileSync(join(a, 'cross-target.txt'), 'link target bytes');
  symlinkSync(join(a, 'cross-target.txt'), join(a, 'cross-link'));
  symlinkSync(join(a, 'cross-target.txt'), join(a, 'cross-dir/nested-link'));
  const rename = fs.renameSync;
  fs.renameSync = (src, dst) => {
    if (['cross-link', 'cross-file.txt', 'cross-dir'].some(name => src === join(a, name))) throw Object.assign(new Error('fixture EXDEV'), { code: 'EXDEV' });
    return rename(src, dst);
  }; syncBuiltinESMExports();
  try {
    assert.equal((await move({ fromPath: 'cross-link', toDir: 'cross-dest' })).status, 400);
    assert.ok(fs.lstatSync(join(a, 'cross-link')).isSymbolicLink());
    assert.equal(existsSync(join(a, 'cross-dest/cross-link')), false);
    assert.equal((await move({ fromPath: 'cross-file.txt', toDir: 'cross-dest' })).status, 200);
    assert.equal(readFileSync(join(a, 'cross-dest/cross-file.txt'), 'utf8'), 'cross file bytes');
    assert.equal(existsSync(join(a, 'cross-file.txt')), false);
    assert.equal((await move({ fromPath: 'cross-dir', toDir: 'cross-dest' })).status, 200);
    assert.equal(readFileSync(join(a, 'cross-dest/cross-dir/note.txt'), 'utf8'), 'cross dir bytes');
    assert.ok(fs.lstatSync(join(a, 'cross-dest/cross-dir/nested-link')).isSymbolicLink());
    assert.equal(existsSync(join(a, 'cross-dir')), false);
    assert.equal(readFileSync(join(a, 'cross-target.txt'), 'utf8'), 'link target bytes');
  } finally { fs.renameSync = rename; syncBuiltinESMExports(); }
});

test('missing/non-string paths remain bad requests while root empty string is accepted', async () => {
  for (const body of [{}, { fromPath: 'note.txt' }, { fromPath: null, toDir: '' }, { fromPath: 1, toDir: '' },
    { fromPath: [], toDir: '' }, { fromPath: '', toDir: '' }, { fromPath: 'note.txt', toDir: null }, { fromPath: 'note.txt', toDir: 42 }]) assert.equal((await move(body)).status, 400);
  assert.equal((await move({ fromPath: 'missing.txt', toDir: '' })).status, 404);
});

test('name conflicts, self and descendants preserve every original byte', async () => {
  writeFileSync(join(a, 'sub/collision.txt'), 'source'); writeFileSync(join(a, 'collision.txt'), 'destination');
  assert.equal((await move({ fromPath: 'sub/collision.txt', toDir: '' })).status, 409);
  for (const dir of ['sub', 'sub/child']) {
    mkdirSync(join(a, dir), { recursive: true }); assert.equal((await move({ fromPath: 'sub', toDir: dir })).status, 400);
  }
  assert.equal(readFileSync(join(a, 'sub/collision.txt'), 'utf8'), 'source'); assert.equal(readFileSync(join(a, 'collision.txt'), 'utf8'), 'destination');
});

test('root support cannot bypass traversal, symbolic escapes or private hardlink mutation policy', async () => {
  writeFileSync(join(b, 'outside.txt'), 'outside'); symlinkSync(b, join(a, 'escape'));
  mkdirSync(CREDENTIAL_PATHS.root, { recursive: true }); writeFileSync(CREDENTIAL_PATHS.keyPath, 'private'); linkSync(CREDENTIAL_PATHS.keyPath, join(a, 'alias'));
  for (const [fromPath, toDir] of [['../two/same/outside.txt', ''], ['escape/outside.txt', ''], [join(b, 'outside.txt'), ''], ['collision.txt', 'escape']]) assert.equal((await move({ fromPath, toDir, editorSession: true })).status, 400);
  assert.equal((await move({ fromPath: 'alias', toDir: 'sub' })).status, 403);
  assert.equal(readFileSync(join(b, 'outside.txt'), 'utf8'), 'outside'); assert.equal(readFileSync(CREDENTIAL_PATHS.keyPath, 'utf8'), 'private');
});

test('exact instance overrides same-name/body hints and stale instance cannot mutate', async () => {
  writeFileSync(join(b, 'sub/owned.txt'), 'B owned'); writeFileSync(join(a, 'sub/owned.txt'), 'A canary');
  assert.equal((await move({ fromPath: 'sub/owned.txt', toDir: '', project: 'same', instance: infoA.instanceKey }, infoB.instanceKey)).status, 200);
  assert.equal(readFileSync(join(b, 'owned.txt'), 'utf8'), 'B owned'); assert.equal(readFileSync(join(a, 'sub/owned.txt'), 'utf8'), 'A canary');
  assert.equal((await move({ fromPath: 'sub/owned.txt', toDir: '' }, 'stale')).status, 404);
  assert.equal(existsSync(join(a, 'owned.txt')), false);
});
