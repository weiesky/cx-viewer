import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

// File-level isolation (see search-endpoint.test.js): env MUST be set before server.js is imported.
const tmpDir = mkdtempSync(join(tmpdir(), 'cxv-git-ep-'));
const projectDir = join(tmpDir, 'project');
const subDir = join(projectDir, 'sub');
const remoteDir = join(tmpDir, 'remote.git');
mkdirSync(subDir, { recursive: true });

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// Root repo: initial commit pushed to a bare remote, then one local unpushed commit.
git(projectDir, ['init']);
git(projectDir, ['config', 'user.name', 'Test User']);
git(projectDir, ['config', 'user.email', 'test@example.com']);
git(projectDir, ['config', 'commit.gpgsign', 'false']);
git(projectDir, ['config', 'core.autocrlf', 'false']);
writeFileSync(join(projectDir, 'a.txt'), 'alpha\n');
writeFileSync(join(projectDir, 'c.txt'), 'original c\n');
mkdirSync(join(projectDir, 'node..modules'), { recursive: true });
writeFileSync(join(projectDir, 'node..modules', 'index.js'), 'nn\n');
git(projectDir, ['add', 'a.txt', 'c.txt', 'node..modules/index.js']);
git(projectDir, ['commit', '-m', 'root initial']);
git(projectDir, ['branch', '-M', 'main']);
git(tmpDir, ['init', '--bare', remoteDir]);
git(projectDir, ['remote', 'add', 'origin', remoteDir]);
git(projectDir, ['push', '-u', 'origin', 'main']);
writeFileSync(join(projectDir, 'b.txt'), 'beta\n');
git(projectDir, ['add', 'b.txt']);
git(projectDir, ['commit', '-m', 'unpushed-one']);

// Sub repo: no upstream at all.
git(subDir, ['init']);
git(subDir, ['config', 'user.name', 'Sub User']);
git(subDir, ['config', 'user.email', 'sub@example.com']);
git(subDir, ['config', 'commit.gpgsign', 'false']);
git(subDir, ['config', 'core.autocrlf', 'false']);
writeFileSync(join(subDir, 's.txt'), 'sub alpha\n');
git(subDir, ['add', 's.txt']);
git(subDir, ['commit', '-m', 'sub initial']);

// Rename repo: rename commits exercise the R100 old new name-status parsing.
const renameRepoDir = join(projectDir, 'renamerepo');
mkdirSync(renameRepoDir, { recursive: true });
git(renameRepoDir, ['init']);
git(renameRepoDir, ['config', 'user.name', 'Rename User']);
git(renameRepoDir, ['config', 'user.email', 'rename@example.com']);
git(renameRepoDir, ['config', 'commit.gpgsign', 'false']);
git(renameRepoDir, ['config', 'core.autocrlf', 'false']);
writeFileSync(join(renameRepoDir, 'a.txt'), 'a\n');
git(renameRepoDir, ['add', 'a.txt']);
git(renameRepoDir, ['commit', '-m', 'rename initial']);
git(renameRepoDir, ['branch', '-M', 'main']);
const renameRemote = join(tmpDir, 'rename-remote.git');
git(tmpDir, ['init', '--bare', renameRemote]);
git(renameRepoDir, ['remote', 'add', 'origin', renameRemote]);
git(renameRepoDir, ['push', '-u', 'origin', 'main']);
git(renameRepoDir, ['mv', 'a.txt', 'b.txt']);
git(renameRepoDir, ['commit', '-m', 'rename-one']);

// Big-file repo: covers is_large in both working-tree and commit modes, plus deleted files.
const bigRepoDir = join(projectDir, 'bigrepo');
const BIG_FILE_BYTES = 5 * 1024 * 1024;
mkdirSync(bigRepoDir, { recursive: true });
git(bigRepoDir, ['init']);
git(bigRepoDir, ['config', 'user.name', 'Big User']);
git(bigRepoDir, ['config', 'user.email', 'big@example.com']);
git(bigRepoDir, ['config', 'commit.gpgsign', 'false']);
git(bigRepoDir, ['config', 'core.autocrlf', 'false']);
writeFileSync(join(bigRepoDir, 'small.txt'), 'small\n');
git(bigRepoDir, ['add', 'small.txt']);
git(bigRepoDir, ['commit', '-m', 'big initial']);
git(bigRepoDir, ['branch', '-M', 'main']);
writeFileSync(join(bigRepoDir, 'big.bin'), Buffer.alloc(BIG_FILE_BYTES + 64, 0x61));
git(bigRepoDir, ['add', 'big.bin']);
git(bigRepoDir, ['commit', '-m', 'add big file']);
git(bigRepoDir, ['rm', 'small.txt']);
git(bigRepoDir, ['commit', '-m', 'delete small']);
const bigRepoBigCommit = git(bigRepoDir, ['rev-parse', 'HEAD~1']);
const bigRepoDeleteCommit = git(bigRepoDir, ['rev-parse', 'HEAD']);

// Non-git directory: repo param pointing here must be rejected with 400.
const notAGitDir = join(projectDir, 'notagit');
mkdirSync(notAGitDir, { recursive: true });

process.env.CXV_LOG_DIR = tmpDir;
process.env.CXV_PROJECT_DIR = projectDir;
process.env.CXV_START_PORT = '19990';
process.env.CXV_MAX_PORT = '19999';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '0';

let requestImpl = httpRequest;

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = requestImpl({ hostname: '127.0.0.1', port, path, method: 'GET', rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, json() { return JSON.parse(data); } }));
    });
    req.on('error', reject);
    req.end();
  });
}

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const req = requestImpl({ hostname: '127.0.0.1', port, path, method: 'POST', rejectUnauthorized: false, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, json() { return JSON.parse(data); } }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

describe('git endpoints', { concurrency: false }, () => {
  let stopViewer, getPort, port;

  before(async () => {
    const mod = await import('../server.js');
    stopViewer = mod.stopViewer;
    getPort = mod.getPort;
    const srv = await mod.startViewer();
    assert.ok(srv, 'server should start');
    port = getPort();
    requestImpl = mod.getProtocol() === 'https' ? httpsRequest : httpRequest;
    assert.ok(port > 0);
  });

  after(async () => {
    await stopViewer();
    // 停服完成后稍等子进程/句柄释放，再删除临时目录
    await new Promise((resolve) => setTimeout(resolve, 50));
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /api/git-repos lists root and sub repos', async () => {
    const res = await get(port, '/api/git-repos');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data.repos));
    assert.equal(data.repos[0].path, '.');
    assert.equal(data.repos[0].isRoot, true);
    assert.ok(data.repos.some((r) => r.path === 'sub' && r.isRoot === false));
  });

  it('GET /api/git-status reports working tree changes', async () => {
    writeFileSync(join(projectDir, 'c.txt'), 'modified c\n');
    const res = await get(port, '/api/git-status');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data.changes));
    assert.ok(data.changes.some((c) => c.file === 'c.txt' && c.status === 'M'));
    assert.ok(typeof data.insertions === 'number');
    assert.ok(typeof data.insertions_capped === 'boolean');
  });

  it('GET /api/git-status?repo=sub resolves the sub repo', async () => {
    writeFileSync(join(subDir, 's.txt'), 'sub modified\n');
    const res = await get(port, '/api/git-status?repo=' + encodeURIComponent('sub'));
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(data.changes.some((c) => c.file === 's.txt'));
  });

  it('GET /api/git-status rejects traversal repo params with 400', async () => {
    for (const repo of ['../evil', '..%2Fevil', 'a%2Fb', '%2Fabs%2Fpath']) {
      const res = await get(port, '/api/git-status?repo=' + repo);
      assert.equal(res.status, 400, 'repo=' + repo);
    }
  });

  it('GET /api/git-log-unpushed returns the unpushed commit', async () => {
    const res = await get(port, '/api/git-log-unpushed');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.equal(data.hasUpstream, true);
    assert.equal(data.branch, 'main');
    assert.equal(data.upstream, 'origin/main');
    assert.ok(Array.isArray(data.commits) && data.commits.length >= 1);
    const c = data.commits[0];
    assert.match(c.hash, /^[0-9a-f]{40}$/);
    assert.equal(c.shortHash, c.hash.substring(0, 7));
    assert.equal(c.author, 'Test User');
    assert.match(c.date, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(c.subject, 'unpushed-one');
    assert.ok(c.files.some((f) => f.file === 'b.txt' && f.status === 'A'));
    assert.equal(typeof data.truncated, 'boolean');
    assert.equal(typeof data.totalCount, 'number');
  });

  it('GET /api/git-log-unpushed?repo=sub reports no upstream', async () => {
    const res = await get(port, '/api/git-log-unpushed?repo=' + encodeURIComponent('sub'));
    assert.equal(res.status, 200);
    const data = res.json();
    assert.equal(data.hasUpstream, false);
    assert.deepEqual(data.commits, []);
  });

  it('GET /api/git-log-unpushed rejects traversal repo with 400', async () => {
    const res = await get(port, '/api/git-log-unpushed?repo=' + encodeURIComponent('../evil'));
    assert.equal(res.status, 400);
  });

  it('GET /api/git-diff works in working-tree mode', async () => {
    const res = await get(port, '/api/git-diff?files=' + encodeURIComponent('c.txt'));
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data.diffs));
    const diff = data.diffs.find((d) => d.file === 'c.txt');
    assert.ok(diff, 'c.txt diff present');
    assert.equal(diff.new_content, 'modified c\n');
    assert.equal(diff.old_content, 'original c\n');
    assert.equal(diff.is_binary, false);
  });

  it('GET /api/git-diff works in commit mode', async () => {
    const res = await get(port, '/api/git-log-unpushed');
    const hash = res.json().commits[0].hash;
    const diffRes = await get(port, '/api/git-diff?files=' + encodeURIComponent('b.txt') + '&commit=' + hash);
    assert.equal(diffRes.status, 200);
    const data = diffRes.json();
    const diff = data.diffs.find((d) => d.file === 'b.txt');
    assert.ok(diff, 'b.txt diff present');
    assert.equal(diff.is_new, true);
    assert.equal(diff.old_content, '');
    assert.equal(diff.new_content, 'beta\n');
  });

  it('GET /api/git-diff rejects malformed commit hashes with 400', async () => {
    const res = await get(port, '/api/git-diff?files=' + encodeURIComponent('b.txt') + '&commit=' + encodeURIComponent('HEAD~1'));
    assert.equal(res.status, 400);
    assert.equal(res.json().error, 'Invalid commit parameter');
  });

  it('GET /api/git-diff rejects traversal repo with 400', async () => {
    const res = await get(port, '/api/git-diff?files=' + encodeURIComponent('a.txt') + '&repo=' + encodeURIComponent('../evil'));
    assert.equal(res.status, 400);
  });

  it('POST /api/git-restore reverts a tracked file in the root repo', async () => {
    writeFileSync(join(projectDir, 'c.txt'), 'modified again\n');
    const res = await post(port, '/api/git-restore', { path: 'c.txt' });
    assert.equal(res.status, 200);
    assert.equal(readFileSync(join(projectDir, 'c.txt'), 'utf8'), 'original c\n');
  });

  it('POST /api/git-restore reverts a file in a sub repo via repo param', async () => {
    const res = await post(port, '/api/git-restore', { path: 's.txt', repo: 'sub' });
    assert.equal(res.status, 200);
    assert.equal(readFileSync(join(subDir, 's.txt'), 'utf8'), 'sub alpha\n');
  });

  it('POST /api/git-restore rejects an invalid repo with 400', async () => {
    const res = await post(port, '/api/git-restore', { path: 's.txt', repo: '../evil' });
    assert.equal(res.status, 400);
  });
  it('GET /api/git-diff skips traversal file params silently', async () => {
    for (const files of ['../escape.txt', '..%2F..%2Fetc%2Fpasswd', 'dir%2F..%2Fx']) {
      const res = await get(port, '/api/git-diff?files=' + files);
      assert.equal(res.status, 200, 'files=' + files);
      assert.deepEqual(res.json().diffs, [], 'files=' + files);
    }
  });

  it('GET /api/git-diff accepts path segments containing .. (node..modules)', async () => {
    writeFileSync(join(projectDir, 'node..modules', 'index.js'), 'nn2\n');
    const res = await get(port, '/api/git-diff?files=' + encodeURIComponent('node..modules/index.js'));
    assert.equal(res.status, 200);
    const diff = res.json().diffs.find((d) => d.file === 'node..modules/index.js');
    assert.ok(diff, 'diff present');
    assert.equal(diff.new_content, 'nn2\n');
  });

  it('GET /api/git-log-unpushed resolves rename paths', async () => {
    const res = await get(port, '/api/git-log-unpushed?repo=' + encodeURIComponent('renamerepo'));
    assert.equal(res.status, 200);
    const data = res.json();
    assert.equal(data.hasUpstream, true);
    const c = data.commits[0];
    assert.equal(c.subject, 'rename-one');
    const f = c.files.find((x) => x.status === 'R');
    assert.ok(f, 'rename file present');
    assert.equal(f.file, 'b.txt');
    assert.ok(!f.file.includes('\t'), 'no tab in file path');
  });

  it('POST /api/git-restore removes an untracked file via git clean', async () => {
    const untrackedPath = join(projectDir, 'untracked-new.txt');
    writeFileSync(untrackedPath, 'temp\n');
    const res = await post(port, '/api/git-restore', { path: 'untracked-new.txt' });
    assert.equal(res.status, 200);
    assert.equal(existsSync(untrackedPath), false);
  });

  it('GET /api/git-diff commit mode preserves rename old content', async () => {
    const logRes = await get(port, '/api/git-log-unpushed?repo=' + encodeURIComponent('renamerepo'));
    const hash = logRes.json().commits[0].hash;
    const diffRes = await get(port, '/api/git-diff?repo=' + encodeURIComponent('renamerepo') + '&files=' + encodeURIComponent('b.txt') + '&commit=' + hash);
    assert.equal(diffRes.status, 200);
    const diffs = diffRes.json().diffs;
    assert.equal(diffs.length, 1);
    const diff = diffs[0];
    assert.equal(diff.status, 'R');
    assert.equal(diff.old_content, 'a\n');
    assert.equal(diff.new_content, 'a\n');
    assert.equal(diff.is_new, false);
    assert.equal(diff.is_deleted, false);
  });

  it('GET /api/git-diff commit mode skips files not in the commit', async () => {
    const logRes = await get(port, '/api/git-log-unpushed');
    const hash = logRes.json().commits[0].hash;
    const diffRes = await get(port, '/api/git-diff?files=' + encodeURIComponent('a.txt') + '&commit=' + hash);
    assert.equal(diffRes.status, 200);
    assert.deepEqual(diffRes.json().diffs, []);
  });

  it('GET /api/git-diff reports is_large in commit mode without emptying content', async () => {
    const diffRes = await get(port, '/api/git-diff?repo=' + encodeURIComponent('bigrepo') + '&files=' + encodeURIComponent('big.bin') + '&commit=' + bigRepoBigCommit);
    assert.equal(diffRes.status, 200);
    const diff = diffRes.json().diffs.find((d) => d.file === 'big.bin');
    assert.ok(diff, 'big.bin diff present');
    assert.equal(diff.is_large, true);
    assert.ok(diff.size > BIG_FILE_BYTES);
    assert.equal(diff.new_content, undefined);
  });

  it('GET /api/git-diff reports is_large in working-tree mode', async () => {
    writeFileSync(join(bigRepoDir, 'big.bin'), Buffer.alloc(BIG_FILE_BYTES + 128, 0x62));
    const res = await get(port, '/api/git-diff?repo=' + encodeURIComponent('bigrepo') + '&files=' + encodeURIComponent('big.bin'));
    assert.equal(res.status, 200);
    const diff = res.json().diffs.find((d) => d.file === 'big.bin');
    assert.ok(diff, 'big.bin diff present');
    assert.equal(diff.is_large, true);
    assert.ok(diff.size > BIG_FILE_BYTES);
  });

  it('GET /api/git-diff commit mode returns deleted file content', async () => {
    const diffRes = await get(port, '/api/git-diff?repo=' + encodeURIComponent('bigrepo') + '&files=' + encodeURIComponent('small.txt') + '&commit=' + bigRepoDeleteCommit);
    assert.equal(diffRes.status, 200);
    const diff = diffRes.json().diffs.find((d) => d.file === 'small.txt');
    assert.ok(diff, 'small.txt diff present');
    assert.equal(diff.status, 'D');
    assert.equal(diff.is_deleted, true);
    assert.equal(diff.old_content, 'small\n');
    assert.equal(diff.new_content, '');
  });

  it('POST /api/git-restore accepts node..modules paths', async () => {
    writeFileSync(join(projectDir, 'node..modules', 'index.js'), 'nn3\n');
    const res = await post(port, '/api/git-restore', { path: 'node..modules/index.js' });
    assert.equal(res.status, 200);
    assert.equal(readFileSync(join(projectDir, 'node..modules', 'index.js'), 'utf8'), 'nn\n');
  });

  it('POST /api/git-restore rejects traversal variants with 400', async () => {
    for (const p of ['../evil.txt', '..\\evil.txt', 'sub/../x']) {
      const res = await post(port, '/api/git-restore', { path: p });
      assert.equal(res.status, 400, 'path=' + p);
    }
  });

  it('POST /api/git-restore refuses untracked directories (git clean -fd risk)', async () => {
    const dirPath = join(projectDir, 'newdir');
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, 'file.txt'), 'x\n');
    const res = await post(port, '/api/git-restore', { path: 'newdir' });
    assert.equal(res.status, 400);
    assert.equal(existsSync(join(dirPath, 'file.txt')), true);
  });

  it('POST /api/git-restore serializes concurrent restores of the same file', async () => {
    writeFileSync(join(projectDir, 'a.txt'), 'alpha2\n');
    const results = await Promise.all(Array.from({ length: 5 }, () => post(port, '/api/git-restore', { path: 'a.txt' })));
    for (const r of results) assert.equal(r.status, 200, r.body);
    assert.equal(readFileSync(join(projectDir, 'a.txt'), 'utf8'), 'alpha\n');
    const again = await post(port, '/api/git-restore', { path: 'a.txt' });
    assert.equal(again.status, 200);
  });

  it('POST /api/git-restore serializes concurrent clean of an untracked file', async () => {
    const untrackedPath = join(projectDir, 'untracked-concurrent.txt');
    writeFileSync(untrackedPath, 'temp\n');
    const results = await Promise.all(Array.from({ length: 5 }, () => post(port, '/api/git-restore', { path: 'untracked-concurrent.txt' })));
    for (const r of results) assert.equal(r.status, 200, r.body);
    assert.equal(existsSync(untrackedPath), false);
  });

  it('GET /api/git-status rejects a non-git repo dir with 400', async () => {
    const res = await get(port, '/api/git-status?repo=' + encodeURIComponent('notagit'));
    assert.equal(res.status, 400);
  });
});
