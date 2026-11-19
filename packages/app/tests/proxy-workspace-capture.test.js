import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Actual HTTP -> proxy -> intercepted fetch -> canonical V2 writes. Bodies and
// headers deliberately lie about cwd; only the owner is authoritative.
test('concurrent SDK capture proxies persist every revision in their own workspace', { timeout: 15000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-proxy-cwd-'));
  const previousEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const previousMarker = globalThis._cxViewerInterceptorInstalled;
  let interceptor, a, b;
  const pending = [];
  const seen = [];
  const upstream = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      seen.push({ body, headers: req.headers });
      pending.push(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ model: 'fake-model', output: [] }));
      });
    });
  });
  const commits = [];
  const waitFor = async predicate => {
    const deadline = Date.now() + 8000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, 'HTTP capture must settle: upstream=' + pending.length + ' commits=' + commits.length);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };
  try {
    Object.assign(process.env, {
      CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_LOG_DIR: join(root, 'logs'),
      CXV_PROXY_PROFILE_PATH: join(root, 'profile.json'),
    });
    const cwdA = join(root, 'a', 'same');
    const cwdB = join(root, 'b', 'same');
    mkdirSync(cwdA, { recursive: true });
    mkdirSync(cwdB, { recursive: true });
    upstream.listen(0, '127.0.0.1');
    await once(upstream, 'listening');
    process.env.CXV_ORIGINAL_BASE_URL = `http://127.0.0.1:${upstream.address().port}/v1`;
    const { createProxy } = await import('../proxy.js');
    interceptor = await import('../interceptor.js');
    interceptor._stopProxyProfileWatchForTests();
    interceptor._setProxyProfileRuntimeForTests(null);
    interceptor.setupInterceptor();
    interceptor.setLogV2CommitListener((entry, result, context) => commits.push({ entry, result, context }));
    a = createProxy();
    b = createProxy();
    const portA = await a.start({ captureContext: { cwd: cwdA, instanceKey: 'instance-a' } });
    const portB = await b.start({ captureContext: { cwd: cwdB, instanceKey: 'instance-b' } });
    const body = JSON.stringify({ model: 'fake-model', input: 'test', metadata: { cwd: '/forged-body' } });
    const send = port => originalFetch(`http://127.0.0.1:${port}/v1/responses`, {
      method: 'POST', body, headers: { 'content-type': 'application/json', 'x-cx-viewer-project-dir': '/forged-header' },
    }).then(response => response.json());
    const requests = [send(portA), send(portB)];
    await waitFor(() => pending.length === 2);
    process.env.CXV_PROJECT_DIR = '/unrelated-selected-workspace';
    for (const finish of pending.reverse()) finish();
    await Promise.all(requests);
    await waitFor(() => commits.length >= 4);
    for (const [cwd, instanceKey] of [[cwdA, 'instance-a'], [cwdB, 'instance-b']]) {
      const own = commits.filter(commit => commit.entry._captureContext?.instanceKey === instanceKey);
      assert.equal(own.length, 2);
      assert.ok(own.every(commit => commit.context.cwd === cwd));
      assert.equal(own[0].result.sessionDir, own[1].result.sessionDir);
      assert.ok(own.some(commit => commit.entry.response?.status === 200));
    }
    assert.equal(new Set(commits.map(commit => commit.result.sessionDir)).size, 2);
    assert.equal(new Set(commits.map(commit => commit.context.projectId)).size, 2);
    const { registerWorkspace, getWorkspaces } = await import('../workspace-registry.js');
    registerWorkspace(cwdA);
    registerWorkspace(cwdB);
    const workspaces = getWorkspaces();
    assert.equal(workspaces.length, 2);
    assert.ok(workspaces.every(workspace => workspace.projectName === 'same' && workspace.logCount === 1));
    assert.ok(seen.every(request => request.body === body));
    assert.ok(seen.every(request => !Object.keys(request.headers).some(name => name.startsWith('x-cx-viewer-'))));
  } finally {
    for (const finish of pending) { try { finish(); } catch {} }
    a?.stop();
    b?.stop();
    upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
    await interceptor?.closeLogV2Writes();
    interceptor?.setLogV2CommitListener(null);
    interceptor?._stopProxyProfileWatchForTests();
    globalThis.fetch = originalFetch;
    if (previousMarker === undefined) delete globalThis._cxViewerInterceptorInstalled;
    else globalThis._cxViewerInterceptorInstalled = previousMarker;
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
    rmSync(root, { recursive: true, force: true });
  }
});
