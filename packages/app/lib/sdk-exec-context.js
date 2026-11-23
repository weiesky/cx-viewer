import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { getCodexConfigDir } from './codex-config.js';
import { createCodexAppServerClient } from './codex-appserver-client.js';

const MAX_LINE_BYTES = 4 * 1024 * 1024;
const MAX_READ_BYTES = 8 * 1024 * 1024;
const inside = (root, path) => {
  const rel = relative(root, path);
  return rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`);
};

// Exec JSON omits the native last-usage/window pair. Resolve only this SDK
// thread's durable path with a read-only RPC; never resume it or start a turn.
export function createSdkExecContextReader({ threadId, cwd, codexPath, env = process.env,
  startedAt, signal, clientFactory = createCodexAppServerClient }) {
  let path, client, closed = false, unavailable = false, unavailableReason = null;
  const cwdAliases = new Set([resolve(cwd)]);
  let offset = 0, identity = null, inode = null, turnId = null, activeTurnId = null, snapshot = null;
  let tail = Buffer.alloc(0), skipping = false;

  async function locate() {
    const home = getCodexConfigDir(env);
    const roots = [];
    for (const name of ['sessions', 'archived_sessions']) {
      try { roots.push(await realpath(join(home, name))); } catch { /* no local history */ }
    }
    if (!roots.length) { unavailableReason = 'native-history-unavailable'; return null; }
    client = clientFactory({ codexPath, cwd, env, requestTimeoutMs: 1500 });
    try {
      await client.request('initialize', { clientInfo: { name: 'cxv_sdk_context', version: '1.0.0' },
        capabilities: { experimentalApi: true } }, { signal });
      client.notify('initialized');
      const { thread } = await client.request('thread/read', { threadId, includeTurns: false }, { signal });
      if (thread?.id !== threadId || typeof thread.cwd !== 'string'
          || await realpath(thread.cwd) !== await realpath(cwd)
          || typeof thread.path !== 'string' || !isAbsolute(thread.path)) {
        unavailableReason = 'native-thread-identity'; return null;
      }
      cwdAliases.add(resolve(thread.cwd)); cwdAliases.add(await realpath(cwd));
      const canonical = await realpath(thread.path);
      if (!roots.some(root => inside(root, canonical)) || !(await stat(canonical)).isFile()) {
        unavailableReason = 'unsupported-native-history-path'; return null;
      }
      return canonical;
    } finally {
      await client.stop(); client = null;
    }
  }

  function consume(line) {
    if (!line.length) return;
    const row = JSON.parse(line.toString('utf8'));
    const payload = row.payload;
    if (!identity) {
      if (row.type !== 'session_meta' || payload?.id !== threadId
          || typeof payload.cwd !== 'string' || !cwdAliases.has(resolve(payload.cwd))) {
        throw new Error('Native SDK history identity mismatch');
      }
      identity = payload;
    }
    if (row.type !== 'event_msg') return;
    if (payload?.type === 'task_started') {
      activeTurnId = payload.turn_id;
      if (!turnId && Date.parse(row.timestamp) >= startedAt) turnId = payload.turn_id;
      // Another turn in the same file cannot overwrite this run's snapshot.
      if (payload.turn_id !== turnId) snapshot = null;
      return;
    }
    if (!turnId || activeTurnId !== turnId || payload?.type !== 'token_count' || !payload.info) return;
    const usage = payload.info.last_token_usage;
    if (!usage || !['input_tokens', 'output_tokens', 'total_tokens'].every(key =>
      Number.isSafeInteger(usage[key]) && usage[key] >= 0)) return;
    const window = payload.info.model_context_window;
    snapshot = { thread_id: threadId, turn_id: turnId, timestamp: row.timestamp,
      usage: Object.fromEntries(Object.entries(usage).filter(([key, value]) =>
        /^(input_tokens|output_tokens|total_tokens|cached_input_tokens|cache_write_input_tokens|reasoning_output_tokens)$/.test(key)
        && Number.isSafeInteger(value) && value >= 0)),
      context_window: Number.isSafeInteger(window) && window > 0 ? window : null };
  }

  return {
    get unavailableReason() { return unavailableReason; },
    async read({ complete = false } = {}) {
      if (closed || unavailable || signal?.aborted) return null;
      let file;
      try {
        if (!path) path = await locate();
        if (!path) { unavailable = true; return null; }
        if (closed || signal?.aborted) return null;
        file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
        const info = await file.stat();
        if (!info.isFile() || info.nlink !== 1) throw new Error('Unsafe SDK history file');
        const key = `${info.dev}:${info.ino}`;
        if (inode && (key !== inode || info.size < offset)) {
          offset = 0; identity = null; turnId = null; activeTurnId = null; snapshot = null;
          tail = Buffer.alloc(0); skipping = false;
        }
        inode = key;
        const end = complete ? info.size : Math.min(info.size, offset + MAX_READ_BYTES);
        while (offset < end && !closed && !signal?.aborted) {
          const chunk = Buffer.alloc(Math.min(64 * 1024, end - offset));
          const { bytesRead } = await file.read(chunk, 0, chunk.length, offset);
          if (!bytesRead) break;
          offset += bytesRead;
          let data = Buffer.concat([tail, chunk.subarray(0, bytesRead)]);
          tail = Buffer.alloc(0);
          let newline;
          while ((newline = data.indexOf(10)) !== -1) {
            if (!skipping && newline <= MAX_LINE_BYTES) consume(data.subarray(0, newline));
            skipping = false;
            data = data.subarray(newline + 1);
          }
          if (data.length > MAX_LINE_BYTES) skipping = true;
          if (!skipping) tail = Buffer.from(data);
        }
        // Do not expose an old measurement while catching up to a large file.
        return !closed && !signal?.aborted && offset === info.size ? snapshot : null;
      } catch (error) {
        unavailableReason = error.message;
        unavailable = true;
        return null; // missing, corrupt or unsupported history is unknown, not a failed SDK turn
      } finally { await file?.close(); }
    },
    async close() { closed = true; await client?.stop(); },
  };
}
