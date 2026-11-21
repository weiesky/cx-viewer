import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// File-level isolation (see server.test.js): env MUST be set before server.js is imported.
const tmpDir = mkdtempSync(join(tmpdir(), 'cxv-search-ep-'));
const projectDir = join(tmpDir, 'project');
mkdirSync(join(projectDir, 'src'), { recursive: true });
writeFileSync(join(projectDir, 'a.js'), 'const alpha = 1;\nbeta\n');
writeFileSync(join(projectDir, 'src', 'b.js'), 'let x = alpha + 2;\n');

process.env.CXV_LOG_DIR = join(tmpDir, 'viewer-state');
process.env.HOME = join(tmpDir, 'home');
process.env.CODEX_HOME = join(tmpDir, 'home', 'codex');
process.env.CXV_PROJECT_DIR = projectDir;
process.env.CXV_START_PORT = '19780';
process.env.CXV_MAX_PORT = '19789';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_CLI_MODE = '0';

let requestImpl = httpRequest;

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const req = requestImpl({ hostname: '127.0.0.1', port, path, method: 'POST', rejectUnauthorized: false, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data, json() { return JSON.parse(data); } }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

describe('POST /api/search', { concurrency: false }, () => {
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
    await new Promise((resolve) => {
      stopViewer();
      setTimeout(() => { rmSync(tmpDir, { recursive: true, force: true }); resolve(); }, 200);
    });
  });

  it('returns matches grouped by file (node engine)', async () => {
    const res = await post(port, '/api/search', { query: 'alpha', engine: 'node' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/json');
    const data = res.json();
    const files = data.results.map((x) => x.file).sort();
    assert.deepEqual(files, ['a.js', 'src/b.js']);
    assert.equal(data.engine, 'node');
    const a = data.results.find((x) => x.file === 'a.js');
    assert.ok(a.matches[0].submatches.length > 0);
  });

  it('all returned paths stay inside the project root', async () => {
    const res = await post(port, '/api/search', { query: 'alpha', engine: 'node' });
    const data = res.json();
    for (const r of data.results) {
      assert.ok(!r.file.startsWith('/'), 'no absolute path');
      assert.ok(!r.file.includes('..'), 'no traversal');
    }
  });

  it('empty query returns empty results', async () => {
    const res = await post(port, '/api/search', { query: '', engine: 'node' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json().results, []);
  });

  it('invalid regex returns 400', async () => {
    const res = await post(port, '/api/search', { query: '(', regex: true, engine: 'node' });
    assert.equal(res.status, 400);
    assert.equal(res.json().error, 'invalid_regex');
  });

  it('respects include globs', async () => {
    const res = await post(port, '/api/search', { query: 'alpha', engine: 'node', includeGlobs: ['src/**'] });
    const files = res.json().results.map((x) => x.file);
    assert.deepEqual(files, ['src/b.js']);
  });

  it('keeps HTTP responsive while a node regex is busy and cancels on disconnect', async () => {
    const path = join(projectDir, 'busy.txt');
    writeFileSync(path, 'a'.repeat(3000) + '!');
    const req = requestImpl({ hostname: '127.0.0.1', port, path: '/api/search', method: 'POST', rejectUnauthorized: false,
      headers: { 'Content-Type': 'application/json' } }, res => res.resume());
    req.on('error', () => {}); // expected when this test disconnects the client
    const deadline = setTimeout(() => req.destroy(), 3000);
    try {
      // Alternation is intentionally outside the conservative nested-quantifier guard.
      req.end(JSON.stringify({ query: '(a|aa)+$', regex: true, engine: 'node', includeGlobs: ['busy.txt'] }));
      await new Promise(resolve => setTimeout(resolve, 200));
      const started = Date.now();
      const health = await post(port, '/api/search', { query: 'alpha', engine: 'node', includeGlobs: ['*.js'] });
      assert.equal(health.status, 200);
      assert.ok(Date.now() - started < 2000, 'other HTTP searches must keep serving');
      req.destroy();
      await new Promise(resolve => setTimeout(resolve, 50));
      const next = await post(port, '/api/search', { query: 'alpha', engine: 'node' });
      assert.equal(next.status, 200);
      assert.equal(next.json().results.length, 2);
    } finally { clearTimeout(deadline); req.destroy(); rmSync(path, { force: true }); }
  });

  // ── POST /api/search-replace ──
  it('replaces across files on disk', async () => {
    writeFileSync(join(projectDir, 'r1.js'), 'gamma delta gamma\n');
    const res = await post(port, '/api/search-replace', { query: 'gamma', replacement: 'zeta', scope: 'all', caseSensitive: true });
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(data.total >= 2);
    assert.equal(readFileSync(join(projectDir, 'r1.js'), 'utf8'), 'zeta delta zeta\n');
  });

  it('dryRun reports counts without writing', async () => {
    writeFileSync(join(projectDir, 'r2.js'), 'omega omega\n');
    const res = await post(port, '/api/search-replace', { query: 'omega', replacement: 'q', scope: 'file', file: 'r2.js', dryRun: true });
    assert.equal(res.status, 200);
    assert.equal(res.json().total, 2);
    assert.equal(readFileSync(join(projectDir, 'r2.js'), 'utf8'), 'omega omega\n'); // unchanged
  });

  it('invalid regex → 400', async () => {
    const res = await post(port, '/api/search-replace', { query: '(', replacement: 'x', scope: 'all', regex: true });
    assert.equal(res.status, 400);
    assert.equal(res.json().error, 'invalid_regex');
  });

  it('bad request (missing scope/replacement) → 400', async () => {
    const res = await post(port, '/api/search-replace', { query: 'x' });
    assert.equal(res.status, 400);
  });

  it('refuses a traversal path (../../etc/...) — nothing written', async () => {
    const res = await post(port, '/api/search-replace', { query: 'root', replacement: 'x', scope: 'file', file: '../../etc/hosts' });
    assert.equal(res.status, 200);
    const data = res.json();
    assert.equal(data.changed.length, 0);
    assert.equal(data.skipped[0]?.reason, 'forbidden');
  });

  it('respects skipPaths', async () => {
    writeFileSync(join(projectDir, 'r3.js'), 'kappa\n');
    const res = await post(port, '/api/search-replace', { query: 'kappa', replacement: 'x', scope: 'all', caseSensitive: true, skipPaths: ['r3.js'] });
    assert.ok(res.json().skipped.some((s) => s.file === 'r3.js' && s.reason === 'dirty'));
    assert.equal(readFileSync(join(projectDir, 'r3.js'), 'utf8'), 'kappa\n');
  });
});
