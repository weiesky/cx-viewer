import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const logDir = mkdtempSync(join(tmpdir(), 'cxv-auth-'));
process.env.CXV_LOG_DIR = logDir;

const {
  clearProjectAuthOverride,
  decideAuth,
  enableGlobalAuthAndClearProjectOverride,
  generatePassword,
  getAuthPrefsPath,
  loadAuthConfig,
  loadAuthState,
  parseCookies,
  isLoopbackHost,
  isSameOriginRequest,
  saveAuthConfig,
} = await import('../lib/auth.js');
const { handleAuthRoute } = await import('../lib/auth-routes.js');

after(() => rmSync(logDir, { recursive: true, force: true }));

test('generated passwords use two letters followed by four digits', () => {
  assert.match(generatePassword(), /^[A-Z]{2}\d{4}$/);
});

test('password config supports global defaults and project overrides', () => {
  const project = '/tmp/cxv-auth-project';
  saveAuthConfig({ enabled: true, password: 'GLOBAL1' });
  assert.deepEqual(loadAuthConfig(project), { enabled: true, password: 'GLOBAL1', revision: 1 });

  saveAuthConfig({ enabled: true, password: 'LOCAL2' }, { scope: 'project', projectDir: project });
  assert.deepEqual(loadAuthConfig(project), { enabled: true, password: 'LOCAL2', revision: 1 });
  assert.equal(loadAuthState(project).scope, 'project');

  clearProjectAuthOverride(project);
  assert.deepEqual(loadAuthConfig(project), { enabled: true, password: 'GLOBAL1', revision: 1 });
  assert.equal(loadAuthState(project).scope, 'global');

  const stored = JSON.parse(readFileSync(getAuthPrefsPath(), 'utf8'));
  assert.notEqual(stored.auth.password, 'GLOBAL1');
  assert.equal(Buffer.from(stored.auth.password, 'base64').toString('utf8'), 'GLOBAL1');
});

test('auth decision accepts token or cookie and challenges password-protected HTML', () => {
  const base = {
    isStaticAsset: false,
    pathname: '/',
    isLocal: false,
    urlToken: null,
    cookieToken: null,
    accessToken: 'secret',
    sessionToken: 'session-secret',
    enabled: true,
    password: 'AB1234',
    wantsHtml: true,
  };
  assert.equal(decideAuth(base).action, 'login-page');
  assert.equal(decideAuth({ ...base, wantsHtml: false }).action, 'unauthorized');
  assert.equal(decideAuth({ ...base, urlToken: 'secret' }).action, 'allow');
  assert.equal(decideAuth({ ...base, cookieToken: 'session-secret' }).action, 'allow');
  assert.equal(decideAuth({ ...base, cookieToken: 'secret' }).action, 'login-page');
  assert.equal(decideAuth({ ...base, password: '' }).action, 'allow');
  assert.equal(decideAuth({ ...base, enabled: false }).action, 'forbidden');
});

test('loopback trust requires a loopback Host and same browser origin', () => {
  assert.equal(isLoopbackHost('127.0.0.1:7008'), true);
  assert.equal(isLoopbackHost('localhost:7008'), true);
  assert.equal(isLoopbackHost('attacker.example:7008'), false);
  assert.equal(isSameOriginRequest('', '127.0.0.1:7008', 'http'), true);
  assert.equal(isSameOriginRequest('http://127.0.0.1:7008', '127.0.0.1:7008', 'http'), true);
  assert.equal(isSameOriginRequest('http://evil.example', '127.0.0.1:7008', 'http'), false);
});

test('global enable-and-inherit updates both settings in one repository transaction', () => {
  const project = '/tmp/cxv-auth-atomic-project';
  saveAuthConfig({ enabled: false, password: '' }, { scope: 'project', projectDir: project });
  enableGlobalAuthAndClearProjectOverride(project);
  const state = loadAuthState(project);
  assert.equal(state.scope, 'global');
  assert.equal(state.effective.enabled, true);
  assert.equal(state.effective.password, 'GLOBAL1');
});

test('cookie parsing keeps the first credential value', () => {
  assert.deepEqual(parseCookies('a=1; cxv_auth=first; cxv_auth=second'), {
    a: '1',
    cxv_auth: 'first',
  });
});

test('auth API enables protection and exchanges a case-insensitive password for a cookie', async () => {
  let config = { enabled: false, password: '', revision: 0 };
  const deps = {
    authBodyLimit: 4096,
    getSessionToken: () => 'session-token',
    remotePasswordLogin: false,
    secureCookies: false,
    getAuthConfig: () => config,
    getAuthState: () => ({
      effective: config,
      global: config,
      scope: 'global',
      hasProjectOverride: false,
      projectDir: null,
    }),
    setAuthConfig: next => { config = next; },
    clearAuthOverride: () => {},
    enableGlobalAndInherit: () => {},
  };
  const server = createServer((req, res) => {
    handleAuthRoute(req, res, {
      pathname: new URL(req.url, 'http://localhost').pathname,
      method: req.method,
      isLocal: true,
      deps,
    }).then(handled => {
      if (!handled) { res.writeHead(404); res.end(); }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const call = (path, body) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });

  try {
    const enabled = await call('/api/auth/config', { enabled: true, password: 'AB1234' });
    assert.equal(enabled.status, 200);
    assert.equal(enabled.json.enabled, true);
    const login = await call('/api/auth/login', { password: 'ab1234' });
    assert.equal(login.status, 200);
    assert.match(login.headers['set-cookie'][0], /^cxv_auth=session-token;/);

    const logout = await call('/api/auth/logout', {});
    assert.equal(logout.status, 200);
    assert.match(logout.headers['set-cookie'][0], /Max-Age=0/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('remote HTTP password login is rejected before reading credentials', async () => {
  const deps = {
    authBodyLimit: 4096,
    remotePasswordLogin: false,
    secureCookies: false,
    getSessionToken: () => 'unused',
  };
  const server = createServer((req, res) => {
    handleAuthRoute(req, res, {
      pathname: '/api/auth/login', method: 'POST', isLocal: false, deps,
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const result = await new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST' }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end(JSON.stringify({ password: 'AB1234' }));
    });
    assert.equal(result.status, 403);
    assert.match(result.data, /secure-transport-required/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('login rejects oversized bodies up front and reserves concurrent rate slots before reading', async () => {
  const deps = {
    authBodyLimit: 4096,
    remotePasswordLogin: true,
    secureCookies: true,
    getSessionToken: () => 'session',
    getAuthConfig: () => ({ enabled: true, password: 'AB1234', revision: 1 }),
  };
  const server = createServer((req, res) => {
    handleAuthRoute(req, res, {
      pathname: '/api/auth/login', method: 'POST', isLocal: false, deps,
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const held = [];
  try {
    const oversized = await new Promise((resolve, reject) => {
      const req = request({
        hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Length': '5000' },
      }, res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(oversized, 413);

    for (let i = 0; i < 20; i++) {
      const req = request({
        hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST',
        headers: { 'Transfer-Encoding': 'chunked' },
      });
      req.on('error', () => {});
      req.write(' ');
      held.push(req);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    const limited = await new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path: '/api/auth/login', method: 'POST' }, res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end('{}');
    });
    assert.equal(limited, 429);
  } finally {
    held.forEach(req => req.destroy());
    await new Promise(resolve => setTimeout(resolve, 10));
    await new Promise(resolve => server.close(resolve));
  }
});
