import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-access-policy-')));
const home = join(root, 'home'), cwd = join(home, 'project'), native = join(home, 'custom-codex'), log = join(home, 'viewer');
for (const path of [cwd, native, log]) mkdirSync(path, { recursive: true });
Object.assign(process.env, { HOME: home, CODEX_HOME: native, CXV_PROJECT_DIR: cwd, CXV_LOG_DIR: log, CODEX_SQLITE_HOME: join(cwd, 'native-db') });
const { isReadAllowed, isWriteAllowed, getAllowedRoots, reasonToStatus } = await import('../lib/file-access-policy.js');
const { setLogDir } = await import('../findcx.js');
after(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
const put = (path, text = 'synthetic') => { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, text); return path; };
const verdict = (path, options) => isReadAllowed(path, { cwd, ...options });

test('project/native guidance and skills are allowed without making HOME a blanket root', () => {
  for (const path of [join(cwd, '.env'), join(cwd, 'test.key'), join(native, 'AGENTS.md'), join(native, 'skills/demo/SKILL.md'), join(home, '.agents/skills/demo/SKILL.md')]) {
    put(path); assert.equal(verdict(path).ok, true, path);
  }
  const outside = put(join(home, 'unregistered/plain.txt'));
  assert.equal(verdict(outside).reason, 'outside-allowlist');
  assert.equal(verdict(home).ok, false);
  assert.equal(isWriteAllowed(join(home, 'unregistered/new.txt'), { cwd }).ok, false);
});

test('native credentials, history, shell snapshots and cross-workspace V2 data stay denied even when inside project roots', () => {
  for (const path of [join(native, 'auth.json'), join(native, 'config.toml.bak'), join(native, 'sessions/2026/rollout.jsonl'), join(native, 'archived_sessions/old.jsonl'), join(native, 'shell_snapshots/env.sh'), join(native, 'history.jsonl'), join(native, 'session_index.jsonl'), join(native, 'state_5.sqlite-wal'), join(native, 'memories/raw_memories.md'), join(log, 'same/thread/timeline.jsonl'), join(cwd, 'native-db/state_5.sqlite')]) {
    put(path, 'SYNTHETIC_PRIVATE_BYTES');
    assert.equal(verdict(path, { cwd: home }).ok, false, path);
    assert.equal(isWriteAllowed(path, { cwd: home }).ok, false, path);
    assert.equal(readFileSync(path, 'utf8'), 'SYNTHETIC_PRIVATE_BYTES');
  }
  for (const path of [join(log, 'missing/new.txt'), join(native, 'sessions/missing.jsonl'), join(native, 'auth.json.new'), join(native, 'state_99.sqlite'), join(native, 'history.jsonl.bak')]) assert.equal(isWriteAllowed(path, { cwd: home }).ok, false, path);
});

test('registry/log-directory changes are visible in fresh snapshots and sensitive prefixes/names retain project exemption', () => {
  const shared = join(home, 'shared'); mkdirSync(shared);
  const plain = put(join(shared, 'plain.txt')), key = put(join(shared, 'private.key'));
  assert.equal(verdict(plain).ok, false);
  put(join(log, 'workspaces.json'), JSON.stringify({ workspaces: [{ path: shared }, { path: join(home, '.ssh') }] }));
  const options = { cwd, roots: getAllowedRoots(cwd) };
  assert.equal(isReadAllowed(plain, options).ok, true); assert.equal(isReadAllowed(key, options).reason, 'sensitive-filename');
  const ssh = put(join(home, '.ssh/config')); assert.equal(verdict(ssh).reason, 'sensitive-prefix');
  assert.equal(isWriteAllowed(join(home, '.ssh'), { cwd }).ok, false);
  const next = join(home, 'viewer-next'); mkdirSync(next); setLogDir(next);
  assert.equal(verdict(plain).ok, false, 'new log registry has no shared workspace');
  setLogDir(log);
});

test('realpath, hard-link aliases and missing/dangling write leaves cannot bypass policy', () => {
  const history = join(native, 'history.jsonl'), hard = join(cwd, 'history-alias.txt'); linkSync(history, hard);
  assert.equal(verdict(hard).ok, false); assert.equal(isWriteAllowed(hard, { cwd }).ok, false);
  const link = join(cwd, 'escape'); symlinkSync(join(home, 'unregistered'), link);
  assert.equal(verdict(join(link, 'plain.txt')).ok, false); assert.equal(isWriteAllowed(join(link, 'new.txt'), { cwd }).ok, false);
  const dangling = join(cwd, 'dangling'); symlinkSync(join(home, 'not-created'), dangling);
  assert.equal(isWriteAllowed(dangling, { cwd }).reason, 'symlink');
  assert.equal(isWriteAllowed(join(cwd, 'new/deep/file.txt'), { cwd }).ok, true);
  assert.equal(verdict(join(cwd, 'missing')).reason, 'realpath-failed');
  assert.equal(isWriteAllowed('a\0b', { cwd }).reason, 'null-byte');
  assert.deepEqual(['realpath-failed', 'invalid', 'null-byte', 'outside-allowlist'].map(reasonToStatus), [404,400,400,403]);
});


test('write policy preserves native owner/ancestor protection and startup archives after log relocation', () => {
  assert.equal(isWriteAllowed(native, { cwd: home }).ok, false);
  assert.equal(isWriteAllowed(join(cwd, 'native-db'), { cwd }).ok, false);
  assert.equal(isWriteAllowed(join(native, 'ordinary-notes.txt'), { cwd }).ok, true, 'creating a safe child is still allowed');
  const archive = put(join(log, 'same/thread/retained.jsonl'), 'SYNTHETIC_ARCHIVE');
  const next = join(home, 'relocated-viewer'); mkdirSync(next);
  try {
    setLogDir(next);
    assert.equal(isReadAllowed(archive, { cwd: home }).ok, false, 'changing the live owner does not expose startup V2 data');
    assert.equal(isWriteAllowed(log, { cwd: home }).ok, false);
    assert.equal(readFileSync(archive, 'utf8'), 'SYNTHETIC_ARCHIVE');
  } finally { setLogDir(log); }
});
