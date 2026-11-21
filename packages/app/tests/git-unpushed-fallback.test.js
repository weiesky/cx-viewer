import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getUnpushedCommits, getGitDiffs } from '../lib/git-diff.js';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-unpushed-'));
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } }).trim();
  git(['init', '-q', '-b', 'main']); git(['config', 'user.name', 'Synthetic']); git(['config', 'user.email', 'synthetic@example.test']);
  git(['config', 'commit.gpgsign', 'false']); git(['config', 'core.autocrlf', 'false']);
  const commit = name => { writeFileSync(join(root, name + '.txt'), name + '\n'); git(['add', '.']); git(['commit', '-qm', name]); return git(['rev-parse', 'HEAD']); };
  return { root, git, commit };
}
test('no remote fallback displays all local commits with correct truncation and decoded paths', async t => {
  const f = fixture(t); f.commit('base'); f.commit('中文 file'); const newest = f.commit('newest');
  const result = await getUnpushedCommits(f.root, { maxCommits: 2 });
  assert.equal(result.hasUpstream, false); assert.equal(result.branch, 'main'); assert.equal(result.upstream, null);
  assert.deepEqual(result.commits.map(c => c.subject), ['newest', '中文 file']); assert.equal(result.commits[0].hash, newest);
  assert.equal(result.commits[1].files[0].file, '中文 file.txt'); assert.equal(result.truncated, true); assert.equal(result.totalCount, 3);
  assert.equal((await getUnpushedCommits(f.root)).truncated, false);
});
test('no upstream excludes remote-reachable commits, detached HEAD and deleted upstream use the same fallback', async t => {
  const f = fixture(t), base = f.commit('base');
  f.git(['update-ref', 'refs/remotes/origin/main', base]); const local = f.commit('local');
  let result = await getUnpushedCommits(f.root); assert.equal(result.hasUpstream, false); assert.deepEqual(result.commits.map(c => c.hash), [local]);
  f.git(['checkout', '-q', '--detach']); result = await getUnpushedCommits(f.root);
  assert.equal(result.branch, null); assert.deepEqual(result.commits.map(c => c.hash), [local]);
  f.git(['checkout', '-q', 'main']); f.git(['config', 'remote.origin.url', join(f.root, 'unused-local-remote')]);
  f.git(['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*']); f.git(['branch', '--set-upstream-to=origin/main']);
  result = await getUnpushedCommits(f.root); assert.equal(result.hasUpstream, true); assert.equal(result.upstream, 'origin/main');
  f.git(['update-ref', '-d', 'refs/remotes/origin/main']); result = await getUnpushedCommits(f.root);
  assert.equal(result.hasUpstream, false); assert.equal(result.commits.length, 2);
});
test('unborn HEAD and non-repository return empty; tracked remote equality has no hidden commits', async t => {
  const f = fixture(t); assert.deepEqual((await getUnpushedCommits(f.root)).commits, []);
  assert.deepEqual((await getUnpushedCommits(join(f.root, 'missing'))).commits, []);
  const base = f.commit('base'); f.git(['update-ref', 'refs/remotes/origin/main', base]);
  assert.deepEqual((await getUnpushedCommits(f.root)).commits, []);
});


test('commit line stats preserve real statuses, decoded paths and both rename sides', async t => {
  const f = fixture(t); writeFileSync(join(f.root, '中文.txt'), 'one\ntwo\n'); f.git(['add', '.']); f.git(['commit', '-qm', 'base']);
  writeFileSync(join(f.root, '中文.txt'), 'one\nthree\nfour\n'); f.git(['add', '.']); f.git(['commit', '-qm', 'edit']);
  let c = (await getUnpushedCommits(f.root)).commits[0];
  assert.equal(c.insertions, 2); assert.equal(c.deletions, 1); assert.deepEqual(c.files, [{ status: 'M', file: '中文.txt' }]);
  f.git(['mv', '中文.txt', 'new.txt']); f.git(['commit', '-qm', 'rename']); c = (await getUnpushedCommits(f.root)).commits[0];
  assert.equal(c.insertions, 3); assert.equal(c.deletions, 3);
  assert.deepEqual(c.files.map(row => row.status).sort(), ['A', 'D']); assert.ok(c.files.some(row => row.file === '中文.txt'));
  const diffs = await getGitDiffs(f.root, ['中文.txt', 'new.txt'], c.hash);
  assert.equal(diffs.length, 2); assert.equal(diffs[0].status, 'D'); assert.equal(diffs[0].old_content, 'one\nthree\nfour\n'); assert.equal(diffs[0].new_content, '');
  assert.equal(diffs[1].old_content, 'one\nthree\nfour\n'); assert.equal(diffs[1].new_content, 'one\nthree\nfour\n');
});

test('binary and mode-only commits carry zero line stats and real files; empty commits have no fallback count', async t => {
  const f = fixture(t); f.commit('base');
  writeFileSync(join(f.root, 'binary.bin'), Buffer.from([0, 1, 2, 255])); f.git(['add', '.']); f.git(['commit', '-qm', 'binary']);
  let c = (await getUnpushedCommits(f.root)).commits[0]; assert.equal(c.insertions, 0); assert.equal(c.deletions, 0); assert.deepEqual(c.files, [{ status: 'A', file: 'binary.bin' }]);
  f.git(['update-index', '--chmod=+x', 'base.txt']); f.git(['commit', '-qm', 'mode']); c = (await getUnpushedCommits(f.root)).commits[0];
  assert.equal(c.insertions, 0); assert.equal(c.deletions, 0); assert.deepEqual(c.files, [{ status: 'M', file: 'base.txt' }]);
  f.git(['commit', '-qm', 'empty', '--allow-empty']); c = (await getUnpushedCommits(f.root)).commits[0];
  assert.equal(c.insertions, 0); assert.equal(c.deletions, 0); assert.deepEqual(c.files, []);
});
