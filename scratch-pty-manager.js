import { chmodSync, statSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { basename } from 'node:path';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      __dirname,
      'node_modules',
      'node-pty',
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

async function createSession(id, { cwd } = {}) {
  const pty = await ptyLoader();
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
      sessions.delete(this.id);
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
    sessions.delete(id);
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
  const existing = sessions.get(id);
  if (existing && !existing.exited) return existing;
  if (pendingSessions.has(id)) return pendingSessions.get(id);
  const pending = createSession(id, options).then(session => {
    sessions.set(id, session);
    return session;
  }).finally(() => pendingSessions.delete(id));
  pendingSessions.set(id, pending);
  return pending;
}

export function killScratchPty(id) {
  const session = sessions.get(id);
  if (!session) return false;
  session.kill();
  return true;
}

export function shutdownScratchPtys() {
  for (const session of [...sessions.values()]) session.kill();
  sessions.clear();
}

export function _setScratchPtyLoaderForTests(loader) {
  ptyLoader = loader;
}

export function _resetScratchPtysForTests() {
  shutdownScratchPtys();
  pendingSessions.clear();
}
