import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

import { handleDingTalkImRoute } from '../lib/dingtalk-im-routes.js';

function request(method = 'GET', body = '', headers = {}) {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  req.method = method;
  req.headers = headers;
  return req;
}

function response() {
  return {
    status: null,
    headers: null,
    body: '',
    headersSent: false,
    writableEnded: false,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
      this.headersSent = true;
    },
    end(body = '') {
      this.body += body;
      this.writableEnded = true;
    },
  };
}

function url(path) {
  return new URL(path, 'http://127.0.0.1');
}

async function call(path, { method = 'GET', body = '', headers = {}, isLocal = true, ...options } = {}) {
  const req = request(method, body, headers);
  const res = response();
  const handled = await handleDingTalkImRoute(req, res, url(path), { isLocal, ...options });
  return { handled, status: res.status, json: res.body ? JSON.parse(res.body) : null };
}

const publicState = {
  version: 1,
  enabled: true,
  appKey: 'app-key',
  allowStaffIds: ['staff-1'],
  maxChunkChars: 3800,
  hasSecret: true,
};

test('DingTalk route ignores unrelated paths and rejects unsupported IM platforms', async () => {
  const unrelated = await call('/api/projects');
  assert.equal(unrelated.handled, false);

  const unknown = await call('/api/im/feishu/status');
  assert.equal(unknown.handled, true);
  assert.equal(unknown.status, 404);
  assert.equal(unknown.json.code, 'UNKNOWN_IM_PLATFORM');
});

test('status never returns appSecret and limits remote process details', async () => {
  const options = {
    loadState: () => ({ ...publicState }),
    processStatus: async () => ({
      state: 'ready', running: true, ready: true, connected: true,
      connectionState: 'connected', pid: 42, port: 7150, bootId: 'boot-secret',
    }),
  };
  const local = await call('/api/im/dingtalk/status', options);
  assert.equal(local.status, 200);
  assert.equal(local.json.appSecret, undefined);
  assert.equal(local.json.process.pid, 42);
  assert.equal(local.json.connection.connected, true);

  const remote = await call('/api/im/dingtalk/status', { ...options, isLocal: false });
  assert.equal(remote.status, 200);
  assert.deepEqual(Object.keys(remote.json).sort(), ['connection', 'enabled', 'hasSecret']);
  assert.equal(remote.json.process, undefined);
  assert.equal(remote.json.connection.lastError, undefined);
});

test('sensitive routes are loopback-only', async () => {
  for (const [path, method] of [
    ['/api/im/dingtalk/config', 'POST'],
    ['/api/im/dingtalk/test', 'POST'],
    ['/api/im/dingtalk/process', 'POST'],
    ['/api/im/dingtalk/append-system', 'GET'],
    ['/api/im/dingtalk/skills', 'GET'],
  ]) {
    const result = await call(path, { method, isLocal: false });
    assert.equal(result.status, 403, path);
    assert.equal(result.json.code, 'LOOPBACK_ONLY', path);
  }
});

test('config auto-save does not drive worker and explicit apply restarts it', async () => {
  const calls = [];
  let state = { ...publicState };
  const options = {
    readJson: async () => ({ enabled: true, appKey: 'new-key', appSecret: 'new-secret', allowStaffIds: ['staff-1'], applyProcess: false }),
    saveConfig: (value) => {
      calls.push(['save', value.applyProcess]);
      state = { ...state, ...value, hasSecret: true };
      return { ...state };
    },
    loadState: () => {
      const { appSecret: _secret, ...visible } = state;
      return visible;
    },
    loadConfig: () => ({ ...state, appSecret: 'new-secret' }),
    processStatus: async () => ({ state: 'dead', running: false, connected: false }),
    stopProcess: async () => calls.push(['stop']),
    spawnProcess: () => calls.push(['spawn']),
    waitReady: async () => calls.push(['ready']),
  };
  const saved = await call('/api/im/dingtalk/config', { method: 'POST', ...options });
  assert.equal(saved.status, 200);
  assert.deepEqual(calls, [['save', false]]);
  assert.equal(JSON.stringify(saved.json).includes('new-secret'), false);

  calls.length = 0;
  const applied = await call('/api/im/dingtalk/config', {
    method: 'POST',
    ...options,
    readJson: async () => ({ enabled: true, appKey: 'new-key', appSecret: '', allowStaffIds: ['staff-1'], applyProcess: true }),
  });
  assert.equal(applied.status, 200);
  assert.deepEqual(calls.map((entry) => entry[0]), ['save', 'stop', 'spawn', 'ready']);
});

test('connection test retains stored secret and redacts failures', async () => {
  let tested;
  const options = {
    readJson: async () => ({ appKey: 'candidate', appSecret: '' }),
    loadConfig: () => ({ enabled: false, appKey: 'stored', appSecret: 'top-secret', allowStaffIds: ['staff-1'] }),
    testConnection: async (config) => {
      tested = config;
      return { ok: false, error: `provider rejected ${config.appSecret}` };
    },
  };
  const result = await call('/api/im/dingtalk/test', { method: 'POST', ...options });
  assert.equal(tested.appSecret, 'top-secret');
  assert.equal(tested.appKey, 'candidate');
  assert.equal(result.status, 200);
  // Adapter results are treated as provider details, but credentials still must not cross the API.
  assert.equal(JSON.stringify(result.json).includes('top-secret'), false);
});

test('process start allows an empty sender allowlist', async () => {
  let spawned = false;
  const result = await call('/api/im/dingtalk/process', {
    method: 'POST',
    readJson: async () => ({ action: 'start' }),
    loadConfig: () => ({ enabled: false, appKey: 'key', appSecret: 'secret', allowStaffIds: [] }),
    spawnProcess: () => { spawned = true; },
    waitReady: async () => {},
    processStatus: async () => ({ state: 'dead', running: false }),
  });
  assert.equal(result.status, 200);
  assert.equal(spawned, true);
  assert.equal(JSON.stringify(result.json).includes('secret'), false);
});

test('process start, restart, and stop persist the matching enabled state', async () => {
  for (const action of ['start', 'restart', 'stop']) {
    const calls = [];
    const config = { enabled: false, appKey: 'key', appSecret: 'secret', allowStaffIds: ['staff-1'] };
    const result = await call('/api/im/dingtalk/process', {
      method: 'POST',
      readJson: async () => ({ action }),
      loadConfig: () => ({ ...config }),
      saveConfig: (value) => { calls.push(['save', value.enabled]); return { ...config, ...value }; },
      processStatus: async () => ({ state: 'dead', running: false, connected: false }),
      stopProcess: async () => calls.push(['stop']),
      spawnProcess: () => calls.push(['spawn']),
      waitReady: async () => calls.push(['ready']),
    });
    assert.equal(result.status, 200, action);
    assert.deepEqual(calls, action === 'start'
      ? [['save', true], ['spawn'], ['ready']]
      : action === 'restart'
        ? [['save', true], ['stop'], ['spawn'], ['ready']]
        : [['save', false], ['stop']]);
  }
});

test('worker-status requires the capability token and returns identity without token', async () => {
  const token = 'x'.repeat(64);
  const lock = { pid: process.pid, bootId: 'b'.repeat(32), token };
  const base = {
    isWorker: true,
    readLock: () => lock,
    bridge: { getStatus: () => ({ running: true, connectionState: 'connected', lastError: null }) },
  };
  const denied = await call('/api/im/dingtalk/worker-status', base);
  assert.equal(denied.status, 403);

  const allowed = await call('/api/im/dingtalk/worker-status', {
    ...base,
    headers: { 'x-cxv-im-token': token },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.json.pid, process.pid);
  assert.equal(allowed.json.bootId, lock.bootId);
  assert.equal(allowed.json.token, undefined);
  assert.equal(JSON.stringify(allowed.json).includes(token), false);
});

test('persona and skills endpoints use their dedicated stores', async () => {
  let written = '';
  const persona = await call('/api/im/dingtalk/append-system', {
    method: 'POST',
    readJson: async () => ({ content: '# Persona\n' }),
    writePersona: (content) => { written = content; },
  });
  assert.equal(persona.status, 200);
  assert.equal(written, '# Persona\n');

  const restored = await call('/api/im/dingtalk/append-system?default=1', { readPersona: () => 'disk' });
  assert.equal(restored.status, 200);
  assert.match(restored.json.content, /DingTalk assistant/);

  const roots = [{ source: 'project', enabledDir: '/enabled', disabledDir: '/disabled' }];
  const skills = await call('/api/im/dingtalk/skills', {
    assertSkillPathSafe: () => {},
    skillRoots: () => roots,
    listSkills: (options) => {
      assert.equal(options.roots, roots);
      assert.equal(options.includeReadonly, false);
      return [{ name: 'one' }];
    },
  });
  assert.deepEqual(skills.json.skills, [{ name: 'one' }]);

  let imported;
  const upload = await call('/api/im/dingtalk/skills/import', {
    assertSkillPathSafe: () => {},
    method: 'POST',
    readUpload: async () => ({ filename: 'SKILL.md', data: Buffer.from('# skill') }),
    skillRoots: () => roots,
    skillImportRoot: () => '/worker/.codex/skills',
    importSkill: async (input) => { imported = input; return { ok: true }; },
  });
  assert.equal(upload.status, 200);
  assert.equal(imported.targetRoot, '/worker/.codex/skills');
});

test('default JSON reader rejects invalid and oversized bodies structurally', async () => {
  const invalid = await call('/api/im/dingtalk/config', { method: 'POST', body: '{' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.json.code, 'INVALID_JSON');

  const huge = await call('/api/im/dingtalk/config', { method: 'POST', body: JSON.stringify({ value: 'x'.repeat(100 * 1024) }) });
  assert.equal(huge.status, 413);
  assert.equal(huge.json.code, 'BODY_TOO_LARGE');
});
