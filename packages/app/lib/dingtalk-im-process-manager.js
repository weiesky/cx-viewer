import { spawn as nodeSpawn, execFileSync } from 'node:child_process';
import { chmodSync, closeSync, constants as fsConstants, existsSync, lstatSync, openSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ensureDingTalkPrivateDirectory, getDingTalkImWorkerDir, loadDingTalkImConfig, validateDingTalkImConfig,
} from './dingtalk-im-config.js';
import {
  clearDeadDingTalkImLock, getDingTalkImLiveness, isProcessAlive, readDingTalkImLock,
  releaseDingTalkImLock,
} from './dingtalk-im-lock.js';
import { createProcessAdapter, sameProcessIdentity } from './cxv-processes.js';

const CLI_JS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'cli.js');
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

export function resolveNodeBinary() {
  if (!process.versions.electron) return process.execPath;
  try {
    const command = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(command, ['node'], { encoding: 'utf8', windowsHide: true });
    const first = result.split(/\r?\n/).map(value => value.trim()).find(Boolean);
    if (first) return first;
  } catch {}
  return process.platform === 'win32' ? 'node.exe' : 'node';
}

export function buildDingTalkImChildEnv(base = process.env) {
  const env = {};
  const safeKeys = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'TERM', 'COLORTERM', 'NO_COLOR'];
  for (const key of safeKeys) if (typeof base[key] === 'string') env[key] = base[key];
  for (const [key, value] of Object.entries(base)) {
    if (/^LC_[A-Z_]+$/.test(key) && typeof value === 'string') env[key] = value;
  }
  const logDir = base.CXV_LOG_DIR;
  if (logDir) env.CXV_LOG_DIR = logDir;
  env.CXV_IM_PLATFORM = 'dingtalk';
  env.CXV_IM_WORKER = '1';
  env.CXV_START_PORT = '7150';
  env.CXV_MAX_PORT = '7199';
  env.CXV_HOST = '127.0.0.1';
  return env;
}

export function spawnDingTalkImProcess(opts = {}) {
  // Unit tests must never create a detached worker. Injecting spawnImpl is the only
  // normal unit-test path; explicit opt-in is reserved for isolated integration tests.
  if ((process.env.NODE_TEST_CONTEXT || process.env.CXV_TEST === '1')
    && !opts.spawnImpl && process.env.CXV_TEST_ALLOW_IM_SPAWN !== '1') {
    const dir = getDingTalkImWorkerDir();
    return { pid: undefined, dir, outLog: join(dir, 'process.out.log'), blockedByTestGuard: true };
  }
  validateDingTalkImConfig(opts.config || loadDingTalkImConfig(), { requireEnabled: true });
  const spawnImpl = opts.spawnImpl || nodeSpawn;
  const dir = getDingTalkImWorkerDir();
  ensureDingTalkPrivateDirectory(dir);
  const outLog = join(dir, 'process.out.log');
  let fd;
  try {
    if (existsSync(outLog)) {
      const stat = lstatSync(outLog);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) throw new Error('Unsafe DingTalk worker log file');
    }
    const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_APPEND | (fsConstants.O_NOFOLLOW || 0);
    fd = openSync(outLog, flags, 0o600);
    chmodSync(outLog, 0o600);
  } catch (error) {
    if (error?.message === 'Unsafe DingTalk worker log file') throw error;
  }
  try {
    const child = spawnImpl(resolveNodeBinary(), [CLI_JS, '--im', 'dingtalk', '--no-open'], {
      cwd: dir,
      env: buildDingTalkImChildEnv(opts.env || process.env),
      stdio: fd === undefined ? 'ignore' : ['ignore', fd, fd],
      detached: true,
      windowsHide: true,
    });
    child?.unref?.();
    return { pid: child?.pid, dir, outLog };
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch {}
  }
}

function defaultKill(pid, signal) {
  if (process.platform !== 'win32') {
    try { process.kill(-pid, signal); return; } catch {}
  }
  try { process.kill(pid, signal); } catch {}
}

export async function stopDingTalkImProcess(opts = {}) {
  const lock = readDingTalkImLock();
  const alive = opts.isAlive || isProcessAlive;
  if (!lock || !alive(lock.pid)) {
    clearDeadDingTalkImLock({ isAlive: alive });
    return { stopped: true, alreadyDead: true };
  }
  const live = await getDingTalkImLiveness(opts);
  const capabilityVerified = live.state === 'ready'
    || (live.state === 'booting' && Number.isInteger(lock.port));
  if (!capabilityVerified) {
    const expected = {
      pid: lock.pid,
      startId: lock.processStartId,
      commandHash: lock.commandHash,
    };
    let actual = null;
    try {
      actual = await (opts.processAdapter || createProcessAdapter()).inspect(lock.pid);
    } catch (error) {
      return { stopped: false, reason: 'identity-unavailable', error: error?.code || 'inspection-failed' };
    }
    if (!sameProcessIdentity(expected, actual)) {
      releaseDingTalkImLock(lock);
      return { stopped: true, stale: true, reason: 'identity-mismatch' };
    }
  }
  const kill = opts.killImpl || defaultKill;
  kill(lock.pid, 'SIGTERM');
  const deadline = Date.now() + (opts.timeoutMs ?? 8000);
  const pollMs = opts.pollIntervalMs ?? 100;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const current = readDingTalkImLock();
    if (!current || current.bootId !== lock.bootId || current.pid !== lock.pid) return { stopped: true };
    if (!alive(lock.pid)) {
      releaseDingTalkImLock(lock);
      return { stopped: true };
    }
  }
  const current = readDingTalkImLock();
  if (current && current.pid === lock.pid && current.bootId === lock.bootId) {
    kill(lock.pid, 'SIGKILL');
    await sleep(pollMs);
    releaseDingTalkImLock(lock);
    return { stopped: true, forced: true };
  }
  return { stopped: true };
}

export async function getDingTalkImProcessStatus(opts = {}) {
  const live = await getDingTalkImLiveness(opts);
  return {
    state: live.state,
    running: live.state !== 'dead',
    ready: live.state === 'ready',
    connected: live.state === 'ready' && live.connected === true,
    connectionState: live.connectionState || 'disconnected',
    lastError: live.lastError ?? null,
    pid: live.lock?.pid ?? null,
    port: live.lock?.port ?? null,
    bootId: live.lock?.bootId ?? null,
    startedAt: live.lock?.startedAt ?? null,
  };
}

export async function waitForDingTalkImReady(opts = {}) {
  const deadline = Date.now() + (opts.timeoutMs ?? 20_000);
  const pollMs = opts.pollIntervalMs ?? 100;
  const initialSpawnGraceMs = opts.initialSpawnGraceMs ?? 3_000;
  const startedAt = Date.now();
  let observedWorker = false;
  let status;
  do {
    status = await getDingTalkImProcessStatus(opts);
    if (status.ready && status.connected) return status;
    if (status.state !== 'dead') observedWorker = true;
    if (status.state === 'dead' && (observedWorker || Date.now() - startedAt >= initialSpawnGraceMs)) {
      throw Object.assign(new Error('DingTalk IM worker exited during startup'), { code: 'DINGTALK_WORKER_EXITED' });
    }
    await sleep(pollMs);
  } while (Date.now() < deadline);
  throw Object.assign(new Error(`DingTalk IM worker readiness timed out (${status?.state || 'unknown'})`), {
    code: 'DINGTALK_WORKER_READY_TIMEOUT', status,
  });
}

export async function reconcileDingTalkImProcess(opts = {}) {
  const config = loadDingTalkImConfig();
  const live = await getDingTalkImLiveness(opts);
  if (!config.enabled) return { action: 'none', state: live.state };
  validateDingTalkImConfig(config, { requireEnabled: true });
  if (live.state === 'hung') {
    const stopped = await stopDingTalkImProcess(opts);
    if (!stopped.stopped) return { action: 'none', state: live.state, reason: stopped.reason };
    return { action: 'restarted', ...spawnDingTalkImProcess({ ...opts, config }) };
  }
  if (live.state !== 'dead') return { action: 'none', state: live.state };
  clearDeadDingTalkImLock(opts);
  return { action: 'spawned', ...spawnDingTalkImProcess({ ...opts, config }) };
}
