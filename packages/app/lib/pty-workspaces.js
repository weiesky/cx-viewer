import { randomBytes } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { createPtySession } from '../pty-manager.js';

function failure(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}
function workspacePath(cwd) {
  if (typeof cwd !== 'string' || !cwd.trim() || cwd.includes('\0')) {
    throw failure('Invalid PTY workspace path', 400, 'PTY_WORKSPACE_INVALID');
  }
  return resolve(cwd);
}

// Server-owned identities; clients select an exact instance, never a basename.
// The boot fallback stays fixed even when a different browser launches a project.
export function createPtyWorkspaceRegistry({ launch = null, createSession = createPtySession } = {}) {
  const records = new Map();
  let bootKey = null;
  let launcher = launch;
  const info = record => Object.freeze({
    instanceKey: record.instanceKey, cwd: record.cwd, projectName: basename(record.cwd),
    sessionId: record.runtime?.getContext?.().sessionId || null,
    running: record.pty.getPtyState().running, active: record.instanceKey === bootKey,
    transport: 'pty',
  });
  function find(key = bootKey, allowClosed = false) {
    if (typeof key !== 'string' || !/^cxv-[a-f0-9]{36}$/.test(key)) {
      throw failure('Invalid PTY workspace instance', 400, 'PTY_WORKSPACE_INVALID');
    }
    const record = records.get(key);
    if (!record || (record.closed && !allowClosed)) {
      throw failure('PTY workspace is no longer available', 404, 'PTY_WORKSPACE_NOT_FOUND');
    }
    return record;
  }
  function reserve(cwd, pty, runtime = null) {
    const record = { instanceKey: `cxv-${randomBytes(18).toString('hex')}`, cwd,
      pty, runtime, controller: new AbortController(), closed: false, pending: null, closing: null };
    records.set(record.instanceKey, record);
    return record;
  }
  function adopt({ cwd, pty, runtime = null, boot = false }) {
    const path = workspacePath(cwd);
    if (!pty || typeof pty.getPtyState !== 'function' || typeof pty.killPty !== 'function') {
      throw failure('Invalid PTY session', 400, 'PTY_WORKSPACE_INVALID');
    }
    if (boot && bootKey && records.has(bootKey)) {
      throw failure('Boot PTY workspace already registered', 409, 'PTY_WORKSPACE_CONFLICT');
    }
    const record = reserve(path, pty, runtime);
    if (boot) bootKey = record.instanceKey;
    return info(record);
  }
  async function ensure(cwd, args = []) {
    const path = workspacePath(cwd);
    if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) {
      throw failure('Invalid PTY launch arguments', 400, 'PTY_WORKSPACE_INVALID');
    }
    const existing = [...records.values()].find(record => !record.closed && record.cwd === path
      && (record.pending || record.pty.getPtyState().running));
    if (existing) {
      if (existing.pending) await existing.pending;
      if (existing.closed) throw failure('PTY workspace closed during launch', 409, 'PTY_WORKSPACE_CLOSED');
      return { ...info(existing), reused: true };
    }
    if (typeof launcher !== 'function') {
      throw failure('PTY workspace launch is not configured', 503, 'PTY_WORKSPACE_UNAVAILABLE');
    }
    const record = reserve(path, createSession());
    const launchOwner = launcher;
    record.pending = Promise.resolve().then(async () => {
      try {
        record.runtime = await launchOwner({ cwd: path, instanceKey: record.instanceKey,
          pty: record.pty, args: [...args], signal: record.controller.signal });
        if (record.closed) throw failure('PTY workspace closed during launch', 409, 'PTY_WORKSPACE_CLOSED');
        if (!record.pty.getPtyState().running) {
          throw failure('PTY process did not start', 502, 'PTY_WORKSPACE_START_FAILED');
        }
      } catch (error) {
        record.closed = true;
        record.controller.abort();
        try { await Promise.all([record.pty.killPty(), record.runtime?.stop?.()]); } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], 'PTY launch and cleanup failed');
        }
        records.delete(record.instanceKey);
        throw error;
      } finally { record.pending = null; }
    });
    await record.pending;
    return { ...info(record), reused: false };
  }
  async function close(key) {
    // There is deliberately no implicit close of the boot or active project.
    if (key === undefined) throw failure('PTY close requires an instance', 400, 'PTY_WORKSPACE_INVALID');
    const record = find(key, true);
    if (record.closing) return record.closing;
    const closed = info(record);
    record.closed = true;
    record.controller.abort();
    const ptyStop = record.pty.killPty();
    record.closing = Promise.resolve().then(async () => {
      await Promise.all([ptyStop, record.runtime?.stop?.()]);
      records.delete(key);
      return { ok: true, ...closed, running: false,
        reattachedTo: [...records.values()].find(other => !other.closed)?.instanceKey || null };
    }).finally(() => { record.closing = null; });
    return record.closing;
  }
  return {
    adopt, ensure, close,
    setLauncher(fn) { launcher = fn; },
    setRuntime(key, runtime) { find(key).runtime = runtime; },
    info(key) { return info(find(key)); },
    session(key) { return find(key).pty; },
    runtime(key) { return find(key).runtime; },
    list() { return [...records.values()].filter(record => !record.closed && !record.pending).map(info); },
    async closeAll() {
      const results = await Promise.allSettled([...records.keys()].map(close));
      const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
      if (errors.length) throw new AggregateError(errors, 'PTY workspace cleanup failed');
    },
  };
}
