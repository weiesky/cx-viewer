import { timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';

import dingtalkAdapter from './adapters/dingtalk-adapter.js';
import {
  loadDingTalkImConfig,
  loadDingTalkImState,
  getDingTalkImWorkerDir,
  assertDingTalkWorkerPathSafe,
  normalizeDingTalkImConfig,
  saveDingTalkImConfig,
  validateDingTalkImConfig,
} from './dingtalk-im-config.js';
import { readDingTalkImLock } from './dingtalk-im-lock.js';
import {
  getDingTalkImProcessStatus,
  spawnDingTalkImProcess,
  stopDingTalkImProcess,
  waitForDingTalkImReady,
} from './dingtalk-im-process-manager.js';
import {
  MAX_DINGTALK_PERSONA_BYTES,
  DEFAULT_DINGTALK_IM_PERSONA,
  readDingTalkImPersona,
  writeDingTalkImPersona,
} from './dingtalk-im-persona.js';
import {
  deleteSkill,
  importSkillUpload,
  listSkills,
  toggleSkill,
} from './skills-api.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const JSON_BODY_LIMIT = 96 * 1024;
const ROUTE_RE = /^\/api\/im\/([^/]+)\/(status|config|test|process|append-system|skills|skills\/toggle|skills\/delete|skills\/import|worker-status)$/;

function sendJson(res, status, value) {
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(value));
}

function apiError(error, fallback = 'Request failed') {
  const clientCodes = new Set([
    'DINGTALK_APP_KEY_REQUIRED', 'DINGTALK_APP_SECRET_REQUIRED',
    'INVALID_DINGTALK_PERSONA', 'DINGTALK_PERSONA_TOO_LARGE',
  ]);
  const status = Number.isInteger(error?.status) ? error.status
    : (error?.code === 'DINGTALK_WORKER_READY_TIMEOUT' ? 504
      : (error?.code === 'DINGTALK_WORKER_EXITED' ? 502 : (clientCodes.has(error?.code) ? 400 : 500)));
  return {
    status,
    body: {
      ok: false,
      error: error?.message || fallback,
      ...(error?.code ? { code: error.code } : {}),
    },
  };
}

function readJsonBody(req, maxBytes = JSON_BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let settled = false;
    let overflow = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on('data', (chunk) => {
      if (overflow) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buf.length;
      if (bytes > maxBytes) {
        overflow = true;
        chunks.length = 0;
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      if (settled) return;
      if (overflow) {
        fail(Object.assign(new Error('Request body too large'), { status: 413, code: 'BODY_TOO_LARGE' }));
        return;
      }
      settled = true;
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400, code: 'INVALID_JSON' }));
      }
    });
    req.on('error', fail);
  });
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function connectionFromProcess(processInfo) {
  return {
    running: processInfo?.running === true,
    connected: processInfo?.connected === true,
    connectionState: processInfo?.connectionState || 'disconnected',
    lastError: processInfo?.lastError ?? null,
  };
}

function publicConnection(connection) {
  return {
    running: connection?.running === true,
    connected: connection?.connected === true,
    connectionState: connection?.connectionState || 'disconnected',
  };
}

function workerConnection(bridge) {
  const status = bridge?.getStatus?.() || {};
  const connectionState = status.connectionState || (status.running ? 'connecting' : 'disconnected');
  return {
    running: status.running === true,
    connected: status.running === true && connectionState === 'connected',
    connectionState,
    lastError: status.lastError ?? null,
  };
}

function localOnly(res, isLocal) {
  if (isLocal) return true;
  sendJson(res, 403, { ok: false, error: 'Loopback only', code: 'LOOPBACK_ONLY' });
  return false;
}

function redactError(error, config) {
  let message = String(error?.message || error || 'Request failed');
  for (const secret of [config?.appSecret]) {
    if (typeof secret === 'string' && secret) message = message.split(secret).join('[redacted]');
  }
  const copy = Object.assign(new Error(message), {
    status: error?.status,
    code: error?.code,
  });
  return copy;
}

function candidateConfig(incoming, stored) {
  const value = { ...stored, ...(incoming && typeof incoming === 'object' ? incoming : {}) };
  if (typeof incoming?.appSecret !== 'string' || incoming.appSecret.trim() === '') value.appSecret = stored.appSecret;
  return normalizeDingTalkImConfig(value);
}

function workerIdentityResponse(deps) {
  const lock = deps.readLock();
  const supplied = deps.requestToken;
  if (!deps.isWorker || !lock || lock.pid !== process.pid || !safeEqual(supplied, lock.token)) return null;
  const connection = workerConnection(deps.bridge);
  return {
    platform: 'dingtalk',
    pid: process.pid,
    bootId: lock.bootId,
    ready: deps.workerReady !== false,
    connected: connection.connected,
    connectionState: connection.connectionState,
    lastError: connection.lastError,
  };
}

async function stopAndStart(deps, config) {
  const stopped = await deps.stopProcess();
  if (stopped?.stopped === false) {
    throw Object.assign(new Error('Unable to verify the existing DingTalk worker identity'), {
      status: 409, code: 'DINGTALK_WORKER_IDENTITY_UNVERIFIED',
    });
  }
  const spawned = deps.spawnProcess({ config });
  if (spawned?.blockedByTestGuard || (spawned && Object.hasOwn(spawned, 'pid') && !Number.isInteger(spawned.pid))) {
    throw Object.assign(new Error('DingTalk worker did not start'), { code: 'DINGTALK_WORKER_EXITED' });
  }
  try {
    await deps.waitReady();
  } catch (error) {
    await deps.stopProcess();
    throw error;
  }
  return spawned;
}

function defaultDependencies(options = {}) {
  const workerSkillRoots = () => [{
    source: 'project',
    store: 'im:dingtalk',
    enabledDir: join(getDingTalkImWorkerDir(), '.codex', 'skills'),
    disabledDir: join(getDingTalkImWorkerDir(), '.codex', 'skills-skip'),
  }];
  return {
    isWorker: options.isWorker ?? process.env.CXV_IM_WORKER === '1',
    workerReady: options.workerReady,
    bridge: options.bridge || null,
    requestToken: options.requestToken || '',
    loadConfig: options.loadConfig || loadDingTalkImConfig,
    loadState: options.loadState || loadDingTalkImState,
    saveConfig: options.saveConfig || saveDingTalkImConfig,
    processStatus: options.processStatus || getDingTalkImProcessStatus,
    spawnProcess: options.spawnProcess || spawnDingTalkImProcess,
    stopProcess: options.stopProcess || stopDingTalkImProcess,
    waitReady: options.waitReady || waitForDingTalkImReady,
    testConnection: options.testConnection || ((config) => dingtalkAdapter.testConnection(config)),
    readLock: options.readLock || readDingTalkImLock,
    readPersona: options.readPersona || readDingTalkImPersona,
    writePersona: options.writePersona || writeDingTalkImPersona,
    readJson: options.readJson || readJsonBody,
    readUpload: options.readUpload,
    listSkills: options.listSkills || listSkills,
    toggleSkill: options.toggleSkill || toggleSkill,
    deleteSkill: options.deleteSkill || deleteSkill,
    importSkill: options.importSkill || importSkillUpload,
    skillRoots: options.skillRoots || workerSkillRoots,
    skillImportRoot: options.skillImportRoot || (() => join(getDingTalkImWorkerDir(), '.codex', 'skills')),
    assertSkillPathSafe: options.assertSkillPathSafe || assertDingTalkWorkerPathSafe,
  };
}

/**
 * Handle the DingTalk-only IM API. Returns false when the URL is not an IM route owned here.
 * `isLocal` must come from server.js's already authenticated loopback decision, never a header.
 * For skills/import, pass server.js's bounded `readMultipartUpload` as `options.readUpload`.
 */
export async function handleDingTalkImRoute(req, res, parsedUrl, { isLocal = false, ...options } = {}) {
  const pathname = parsedUrl?.pathname || String(parsedUrl || '').split('?')[0];
  const match = ROUTE_RE.exec(pathname);
  if (!match) return false;
  const [, platform, action] = match;
  if (platform !== 'dingtalk') {
    sendJson(res, 404, { ok: false, error: 'Unknown IM platform', code: 'UNKNOWN_IM_PLATFORM' });
    return true;
  }
  const deps = defaultDependencies({ ...options, requestToken: req.headers?.['x-cxv-im-token'] });
  const method = String(req.method || 'GET').toUpperCase();

  try {
    if (action === 'worker-status') {
      if (method !== 'GET') {
        sendJson(res, 405, { ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
        return true;
      }
      const identity = workerIdentityResponse(deps);
      if (!identity) {
        sendJson(res, 403, { ok: false, error: 'Forbidden', code: 'INVALID_WORKER_IDENTITY' });
        return true;
      }
      sendJson(res, 200, identity);
      return true;
    }

    // The detached worker exposes only its capability-authenticated probe. Configuration,
    // persona and skill management always stay on the main CX Viewer process.
    if (deps.isWorker) {
      sendJson(res, 404, { ok: false, error: 'Not found', code: 'NOT_FOUND' });
      return true;
    }

    if (action === 'status' && method === 'GET') {
      const state = deps.loadState();
      const processInfo = deps.isWorker ? null : await deps.processStatus();
      const connection = deps.isWorker ? workerConnection(deps.bridge) : connectionFromProcess(processInfo);
      if (!isLocal) {
        sendJson(res, 200, { enabled: state.enabled === true, hasSecret: state.hasSecret === true, connection: publicConnection(connection) });
      } else {
        sendJson(res, 200, {
          ...state,
          connection,
          process: processInfo,
        });
      }
      return true;
    }

    if (action === 'config' && method === 'POST') {
      if (!localOnly(res, isLocal)) return true;
      if (deps.isWorker) throw Object.assign(new Error('Worker configuration is read-only'), { status: 409, code: 'WORKER_READ_ONLY' });
      const incoming = await deps.readJson(req, JSON_BODY_LIMIT);
      const saved = deps.saveConfig(incoming);
      if (incoming.applyProcess !== false) {
        if (saved.enabled) await stopAndStart(deps, saved);
        else await deps.stopProcess();
      }
      const processInfo = await deps.processStatus();
      sendJson(res, 200, {
        ok: true,
        ...deps.loadState(),
        connection: connectionFromProcess(processInfo),
        process: processInfo,
      });
      return true;
    }

    if (action === 'test' && method === 'POST') {
      if (!localOnly(res, isLocal)) return true;
      const incoming = await deps.readJson(req, JSON_BODY_LIMIT);
      const config = candidateConfig(incoming, deps.loadConfig());
      if (!config.appKey) throw Object.assign(new Error('DingTalk appKey is required'), { status: 400, code: 'DINGTALK_APP_KEY_REQUIRED' });
      if (!config.appSecret) throw Object.assign(new Error('DingTalk appSecret is required'), { status: 400, code: 'DINGTALK_APP_SECRET_REQUIRED' });
      const result = await deps.testConnection(config);
      const detail = redactError(result?.detail || result?.error || 'DingTalk connection failed', config).message;
      sendJson(res, 200, result?.ok
        ? { ok: true }
        : { ok: false, detail });
      return true;
    }

    if (action === 'process' && method === 'POST') {
      if (!localOnly(res, isLocal)) return true;
      if (deps.isWorker) throw Object.assign(new Error('Process control is only available in the main process'), { status: 409, code: 'WORKER_PROCESS_CONTROL' });
      const incoming = await deps.readJson(req, JSON_BODY_LIMIT);
      const processAction = incoming?.action;
      let config = deps.loadConfig();
      if (processAction === 'stop') {
        config = deps.saveConfig({ enabled: false });
        await deps.stopProcess();
      } else if (processAction === 'start' || processAction === 'restart') {
        config = validateDingTalkImConfig({ ...config, enabled: true }, { requireEnabled: true });
        config = deps.saveConfig(config);
        if (processAction === 'restart') await deps.stopProcess();
        else {
          const status = await deps.processStatus();
          if (status.running) throw Object.assign(new Error('DingTalk IM worker is already running'), { status: 409, code: 'DINGTALK_WORKER_RUNNING' });
        }
        const spawned = deps.spawnProcess({ config });
        if (spawned?.blockedByTestGuard || (spawned && Object.hasOwn(spawned, 'pid') && !Number.isInteger(spawned.pid))) {
          throw Object.assign(new Error('DingTalk worker did not start'), { code: 'DINGTALK_WORKER_EXITED' });
        }
        try { await deps.waitReady(); }
        catch (error) { await deps.stopProcess(); throw error; }
      } else {
        throw Object.assign(new Error('action must be start|stop|restart'), { status: 400, code: 'INVALID_PROCESS_ACTION' });
      }
      sendJson(res, 200, { ok: true, process: await deps.processStatus() });
      return true;
    }

    if (action === 'append-system' && method === 'GET') {
      if (!localOnly(res, isLocal)) return true;
      const useDefault = ['1', 'true'].includes(parsedUrl?.searchParams?.get('default'));
      sendJson(res, 200, { platform: 'dingtalk', content: useDefault ? DEFAULT_DINGTALK_IM_PERSONA : deps.readPersona() });
      return true;
    }

    if (action === 'append-system' && method === 'POST') {
      if (!localOnly(res, isLocal)) return true;
      const incoming = await deps.readJson(req, MAX_DINGTALK_PERSONA_BYTES + 4096);
      if (typeof incoming?.content !== 'string') throw Object.assign(new Error('content must be a string'), { status: 400, code: 'INVALID_DINGTALK_PERSONA' });
      deps.writePersona(incoming.content);
      sendJson(res, 200, { ok: true, platform: 'dingtalk' });
      return true;
    }

    if (action.startsWith('skills')) {
      if (!localOnly(res, isLocal)) return true;
      const roots = deps.skillRoots('dingtalk');
      for (const root of roots) {
        deps.assertSkillPathSafe(root.enabledDir);
        deps.assertSkillPathSafe(root.disabledDir);
      }
      if (action === 'skills' && method === 'GET') {
        sendJson(res, 200, { ok: true, platform: 'dingtalk', skills: deps.listSkills({ roots, includeReadonly: false }) });
        return true;
      }
      if (action === 'skills/toggle' && method === 'POST') {
        const incoming = await deps.readJson(req, JSON_BODY_LIMIT);
        sendJson(res, 200, deps.toggleSkill(incoming, { roots }));
        return true;
      }
      if (action === 'skills/delete' && method === 'POST') {
        const incoming = await deps.readJson(req, JSON_BODY_LIMIT);
        sendJson(res, 200, deps.deleteSkill(incoming, { roots }));
        return true;
      }
      if (action === 'skills/import' && method === 'POST') {
        if (typeof deps.readUpload !== 'function') throw Object.assign(new Error('Skill upload parser is unavailable'), { status: 501, code: 'UPLOAD_UNAVAILABLE' });
        const upload = await deps.readUpload(req);
        const targetRoot = deps.skillImportRoot('dingtalk');
        deps.assertSkillPathSafe(targetRoot);
        sendJson(res, 200, await deps.importSkill({ ...upload, targetRoot }));
        return true;
      }
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return true;
  } catch (error) {
    const safe = redactError(error, (() => { try { return deps.loadConfig(); } catch { return null; } })());
    const { status, body } = apiError(safe);
    sendJson(res, status, body);
    return true;
  }
}
