import { createRequire } from 'node:module';
import { chmodSync, statSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { basename } from 'node:path';
import { dirname, join } from 'node:path';
import { createProcessAdapter } from './lib/cxv-processes.js';
import { stopOwnedProcessTree } from './lib/shutdown.js';
import { OTEL_TRACE_HEADERS_ENV, withoutOtelTraceAuthHeader } from './lib/otel-config.js';

const MAX_REPLAY_CHARS = 50 * 1024;
const IDLE_SESSION_MS = 30 * 60 * 1000;
const SCRATCH_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const sessions = new Map();
const pendingSessions = new Map();
const retiring = new Set();
const ownedProcesses = createProcessAdapter();
let ptyLoader = async () => {
  const mod = await import('node-pty');
  return mod.default || mod;
};

function fixSpawnHelperPermissions() {
  try {
    const helperPath = join(
      dirname(createRequire(import.meta.url).resolve('node-pty/package.json')),
      'prebuilds',
      `${platform()}-${arch()}`,
      'spawn-helper',
    );
    const stat = statSync(helperPath);
    if (!(stat.mode & 0o111)) chmodSync(helperPath, stat.mode | 0o755);
  } catch {}
}

function trimReplay(value) {
  if (value.length <= MAX_REPLAY_CHARS) return value;
  return value.slice(value.length - MAX_REPLAY_CHARS);
}

function scheduleIdleCleanup(session) {
  if (session.idleTimer) clearTimeout(session.idleTimer);
  session.idleTimer = null;
  if (session.clients > 0 || session.exited) return;
  session.idleTimer = setTimeout(() => {
    session.idleTimer = null;
    if (session.clients > 0 || session.exited) return;
    session.kill();
  }, IDLE_SESSION_MS);
  session.idleTimer.unref?.();
}

function sessionKey(id, instanceKey) {
  return instanceKey ? JSON.stringify([instanceKey, id]) : id;
}

async function createSession(id, pending) {
  const { cwd, instanceKey } = pending;
  const old = [...retiring].filter(session => sessionKey(session.id, session.instanceKey) === sessionKey(id, instanceKey));
  if (old.length) await Promise.all(old.map(session => session.kill()));
  const pty = await ptyLoader();
  if (pending.cancelled) return null;
  fixSpawnHelperPermissions();
  const shell = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/sh');
  const env = { ...process.env };
  // Match the upstream scratch boundary: inherit ordinary shell configuration,
  // not the parent Viewer's coordination, permission bypass, or model proxy.
  for (const key of Object.keys(env)) {
    if (key.startsWith('CXV_') || key.startsWith('CXVIEWER_')) delete env[key];
  }
  delete env.OPENAI_BASE_URL;
  if (env[OTEL_TRACE_HEADERS_ENV]) {
    const headers = withoutOtelTraceAuthHeader(env[OTEL_TRACE_HEADERS_ENV]);
    if (headers) env[OTEL_TRACE_HEADERS_ENV] = headers;
    else delete env[OTEL_TRACE_HEADERS_ENV];
  }
  const proc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd || process.cwd(),
    env,
  });
  const identity = proc.pid ? ownedProcesses.inspect(proc.pid).catch(() => null) : null;
  const dataListeners = new Set();
  const exitListeners = new Set();
  const session = {
    id,
    instanceKey,
    proc,
    shellBasename: basename(shell),
    replay: '',
    clients: 0,
    exited: false,
    exitCode: null,
    idleTimer: null,
    write(data) {
      if (this.exited || typeof data !== 'string') return false;
      try { this.proc.write(data); return true; } catch { return false; }
    },
    resize(cols, rows) {
      if (this.exited) return false;
      try { this.proc.resize(cols, rows); return true; } catch { return false; }
    },
    onData(listener) {
      dataListeners.add(listener);
      return () => dataListeners.delete(listener);
    },
    onExit(listener) {
      exitListeners.add(listener);
      return () => exitListeners.delete(listener);
    },
    attach() {
      this.clients++;
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = null;
    },
    detach() {
      this.clients = Math.max(0, this.clients - 1);
      scheduleIdleCleanup(this);
    },
    kill() {
      if (this.cleanup) return this.cleanup;
      this.exited = true;
      const key = sessionKey(id, instanceKey);
      if (sessions.get(key) === this) sessions.delete(key);
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = null;
      const cleanup = identity ? identity.then(value => stopOwnedProcessTree(proc, value))
        : (() => { try { proc.kill(); } catch {} return Promise.resolve(); })();
      this.cleanup = cleanup; retiring.add(this);
      cleanup.then(() => retiring.delete(this), error => {
        this.cleanup = null;
        console.warn('[CX Viewer] scratch cleanup:', error.message);
      });
      return cleanup;
    },
  };

  proc.onData(data => {
    if (session.exited) return;
    const text = String(data ?? '');
    session.replay = trimReplay(session.replay + text);
    for (const listener of dataListeners) {
      try { listener(text); } catch {}
    }
  });
  proc.onExit(({ exitCode }) => {
    if (session.exited && session.exitCode !== null) return;
    session.exited = true;
    session.exitCode = exitCode ?? null;
    const key = sessionKey(id, instanceKey);
    if (sessions.get(key) === session) sessions.delete(key);
    if (session.idleTimer) clearTimeout(session.idleTimer);
    session.idleTimer = null;
    void session.kill();
    for (const listener of exitListeners) {
      try { listener(session.exitCode); } catch {}
    }
  });
  return session;
}

export async function openScratchPty(id, options = {}) {
  if (!SCRATCH_ID_RE.test(id || '')) return null;
  const key = sessionKey(id, options.instanceKey);
  const existing = sessions.get(key);
  if (existing && !existing.exited) return existing;
  if (pendingSessions.has(key)) return pendingSessions.get(key).promise;
  const pending = { cwd: options.cwd, instanceKey: options.instanceKey, cancelled: false };
  pending.promise = createSession(id, pending).then(async session => {
    if (!session) return null;
    if (pending.cancelled || session.exited) { await session.kill(); return null; }
    sessions.set(key, session);
    return session;
  }).finally(() => {
    if (pendingSessions.get(key) === pending) pendingSessions.delete(key);
  });
  pendingSessions.set(key, pending);
  return pending.promise;
}

export function killScratchPty(id, { instanceKey } = {}) {
  const key = sessionKey(id, instanceKey);
  const pending = pendingSessions.get(key);
  if (pending) { pending.cancelled = true; pendingSessions.delete(key); }
  const session = sessions.get(key);
  session?.kill();
  return !!(pending || session);
}

export function shutdownScratchPtys(instanceKey) {
  const cleanups = [];
  for (const [key, pending] of pendingSessions) {
    if (instanceKey !== undefined && pending.instanceKey !== instanceKey) continue;
    pending.cancelled = true;
    pendingSessions.delete(key);
    // No process exists while the loader is pending; cancellation is checked
    // before spawn, so closing must not wait for an unresolvable import.
  }
  for (const session of new Set([...sessions.values(), ...retiring])) {
    if (instanceKey === undefined || session.instanceKey === instanceKey) cleanups.push(session.kill());
  }
  return Promise.all(cleanups);
}

export function _setScratchPtyLoaderForTests(loader) {
  ptyLoader = loader;
}

export async function _resetScratchPtysForTests() {
  await shutdownScratchPtys();
  pendingSessions.clear();
}
