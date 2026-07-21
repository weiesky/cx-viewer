import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  closeSync, existsSync, lstatSync, openSync, readFileSync, unlinkSync,
} from 'node:fs';
import { get as httpGet } from 'node:http';
import { join } from 'node:path';

import {
  atomicWritePrivateFile, DINGTALK_IM_ID, ensureDingTalkPrivateDirectory, getDingTalkImRoot,
} from './dingtalk-im-config.js';

export const DINGTALK_IM_BOOT_WINDOW_MS = 30_000;
export const DINGTALK_IM_STATUS_PATH = '/api/im/dingtalk/worker-status';

export function getDingTalkImLockPath() {
  return join(getDingTalkImRoot(), 'worker.lock');
}

export function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === 'EPERM'; }
}

function validLock(value) {
  return value && typeof value === 'object'
    && value.platform === DINGTALK_IM_ID
    && Number.isInteger(value.pid) && value.pid > 0
    && typeof value.bootId === 'string' && value.bootId.length >= 16
    && typeof value.token === 'string' && value.token.length >= 32
    && typeof value.startedAt === 'string';
}

export function readDingTalkImLock() {
  try {
    const path = getDingTalkImLockPath();
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) return null;
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return validLock(value) ? value : null;
  } catch { return null; }
}

function sameIdentity(a, b) {
  return !!a && !!b && a.pid === b.pid && a.bootId === b.bootId && a.token === b.token;
}

function unreadableLockIsBooting(now = Date.now) {
  try {
    const stat = lstatSync(getDingTalkImLockPath());
    return !stat.isSymbolicLink() && stat.isFile() && stat.nlink === 1
      && now() - stat.mtimeMs < DINGTALK_IM_BOOT_WINDOW_MS;
  } catch { return false; }
}

export function acquireDingTalkImLock(opts = {}) {
  const pid = opts.pid ?? process.pid;
  const alive = opts.isAlive || isProcessAlive;
  const path = getDingTalkImLockPath();
  ensureDingTalkPrivateDirectory(getDingTalkImRoot());
  for (let attempt = 0; attempt < 4; attempt++) {
    let fd;
    try {
      fd = openSync(path, 'wx', 0o600);
      closeSync(fd);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const holder = readDingTalkImLock();
      if (!holder) {
        if (existsSync(path) && unreadableLockIsBooting(opts.now || Date.now)) {
          return { ok: false, holder: null, reason: 'unreadable-lock' };
        }
        try { unlinkSync(path); } catch {}
        continue;
      }
      if (alive(holder.pid)) return { ok: false, holder, reason: 'already-running' };
      try { unlinkSync(path); } catch {}
      continue;
    }
    const lock = {
      version: 1,
      platform: DINGTALK_IM_ID,
      pid,
      processStartId: null,
      commandHash: null,
      bootId: randomBytes(16).toString('hex'),
      token: randomBytes(32).toString('hex'),
      port: null,
      ready: false,
      connected: false,
      connectionState: 'starting',
      lastError: null,
      startedAt: new Date().toISOString(),
    };
    atomicWritePrivateFile(path, `${JSON.stringify(lock)}\n`);
    return { ok: true, lock };
  }
  throw new Error('Unable to acquire DingTalk IM lock');
}

export function updateDingTalkImLock(identity, patch = {}) {
  const current = readDingTalkImLock();
  if (!sameIdentity(current, identity)) return false;
  const next = {
    ...current,
    port: Number.isInteger(patch.port) && patch.port > 0 && patch.port <= 65535 ? patch.port : current.port,
    ready: patch.ready === undefined ? current.ready : patch.ready === true,
    connected: patch.connected === undefined ? current.connected : patch.connected === true,
    connectionState: typeof patch.connectionState === 'string' ? patch.connectionState.slice(0, 64) : current.connectionState,
    lastError: patch.lastError == null ? null : String(patch.lastError).slice(0, 2048),
    processStartId: typeof patch.processStartId === 'string' ? patch.processStartId.slice(0, 512) : current.processStartId,
    commandHash: /^[a-f0-9]{64}$/.test(patch.commandHash || '') ? patch.commandHash : current.commandHash,
  };
  atomicWritePrivateFile(getDingTalkImLockPath(), `${JSON.stringify(next)}\n`);
  return true;
}

export function releaseDingTalkImLock(identity) {
  const current = readDingTalkImLock();
  if (!sameIdentity(current, identity)) return false;
  try { unlinkSync(getDingTalkImLockPath()); } catch {}
  return true;
}

export function clearDeadDingTalkImLock(opts = {}) {
  const lock = readDingTalkImLock();
  if (!lock) {
    if (unreadableLockIsBooting(opts.now || Date.now)) return false;
    try {
      const stat = lstatSync(getDingTalkImLockPath());
      if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) return false;
      unlinkSync(getDingTalkImLockPath());
      return true;
    } catch { return false; }
  }
  if ((opts.isAlive || isProcessAlive)(lock.pid)) return false;
  try { unlinkSync(getDingTalkImLockPath()); return true; } catch { return false; }
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function defaultDingTalkImProbe(lock, { timeoutMs = 500 } = {}) {
  return new Promise((resolve) => {
    if (!validLock(lock) || !Number.isInteger(lock.port)) return resolve(null);
    let settled = false;
    const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
    const req = httpGet({
      host: '127.0.0.1', port: lock.port, path: DINGTALK_IM_STATUS_PATH,
      headers: { 'x-cxv-im-token': lock.token }, timeout: timeoutMs,
    }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return finish(null); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 64 * 1024) req.destroy(); });
      res.on('end', () => {
        try {
          const value = JSON.parse(body);
          if (value?.platform !== DINGTALK_IM_ID || value?.pid !== lock.pid
            || !safeEqual(value.bootId, lock.bootId)) return finish(null);
          finish(value);
        } catch { finish(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); finish(null); });
    req.on('error', () => finish(null));
  });
}

export async function getDingTalkImLiveness(opts = {}) {
  const lock = readDingTalkImLock();
  if (!lock) {
    if (!existsSync(getDingTalkImLockPath())) return { state: 'dead', lock: null };
    return { state: unreadableLockIsBooting(opts.now || Date.now) ? 'booting' : 'dead', lock: null };
  }
  const alive = opts.isAlive || isProcessAlive;
  if (!alive(lock.pid)) return { state: 'dead', lock };
  const age = (opts.now || Date.now)() - Date.parse(lock.startedAt);
  if (!Number.isInteger(lock.port)) {
    return { state: Number.isFinite(age) && age < DINGTALK_IM_BOOT_WINDOW_MS ? 'booting' : 'hung', lock };
  }
  const status = await (opts.probe || defaultDingTalkImProbe)(lock, opts);
  if (!status) return { state: 'hung', lock };
  return {
    state: status.ready === true ? 'ready' : 'booting', lock,
    ready: status.ready === true, connected: status.connected === true,
    connectionState: status.connectionState || (status.connected ? 'connected' : 'disconnected'),
    lastError: status.lastError ?? null,
  };
}
