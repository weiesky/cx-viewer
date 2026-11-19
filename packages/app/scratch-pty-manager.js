import { createRequire } from 'node:module';
import { chmodSync, statSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { basename } from 'node:path';
import { dirname, join } from 'node:path';

const MAX_REPLAY_CHARS = 50 * 1024;
const IDLE_SESSION_MS = 30 * 60 * 1000;
const SCRATCH_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const sessions = new Map();
const pendingSessions = new Map();
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
  const pty = await ptyLoader();
  if (pending.cancelled) return null;
  fixSpawnHelperPermissions();
  const shell = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/sh');
  const proc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd || process.cwd(),
    env: { ...process.env },
  });
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
      if (this.exited) return;
      try { this.proc.kill(); } catch {}
      this.exited = true;
      const key = sessionKey(id, instanceKey);
      if (sessions.get(key) === this) sessions.delete(key);
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = null;
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
  pending.promise = createSession(id, pending).then(session => {
    if (!session) return null;
    if (pending.cancelled || session.exited) { session.kill(); return null; }
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
  for (const [key, pending] of pendingSessions) {
    if (instanceKey !== undefined && pending.instanceKey !== instanceKey) continue;
    pending.cancelled = true;
    pendingSessions.delete(key);
  }
  for (const session of [...sessions.values()]) {
    if (instanceKey === undefined || session.instanceKey === instanceKey) session.kill();
  }
}

export function _setScratchPtyLoaderForTests(loader) {
  ptyLoader = loader;
}

export function _resetScratchPtysForTests() {
  shutdownScratchPtys();
  pendingSessions.clear();
}
