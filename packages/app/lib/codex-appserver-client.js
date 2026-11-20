import { spawn } from 'node:child_process';

const MAX_FRAME_BYTES = 16 * 1024 * 1024;
const MAX_PENDING = 128;

// One owned stdio process per client. No listener port, global thread registry,
// retries, or implicit replay: callers must decide whether a turn was accepted.
export function createCodexAppServerClient({ codexPath, cwd, env = process.env, args = [],
  requestTimeoutMs = 15000, maxFrameBytes = MAX_FRAME_BYTES } = {}) {
  if (typeof codexPath !== 'string' || !codexPath) throw new TypeError('Codex executable is required');
  const scripted = /\.m?js$/i.test(codexPath);
  const child = spawn(scripted ? process.execPath : codexPath,
    [...(scripted ? [codexPath] : []), ...args, 'app-server', '--stdio'], {
      cwd, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32',
    });
  const pending = new Map(), serverRequests = new Set(), subscribers = new Set();
  let seq = 0, buffer = Buffer.alloc(0), failure = null, stopping = false, killTimer = null;
  let resolveClosed;
  const closed = new Promise(resolve => { resolveClosed = resolve; });

  function signalOwned(signal) {
    if (!child.pid) return;
    try {
      if (process.platform !== 'win32') process.kill(-child.pid, signal);
      else if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    } catch (error) { if (error.code !== 'ESRCH') child.kill(signal); }
  }

  function settlePending(error) {
    for (const item of pending.values()) { item.cleanup(); item.reject(error); }
    pending.clear(); serverRequests.clear();
  }

  function stop(error = new Error('App Server client stopped')) {
    if (!stopping) {
      stopping = true; failure ||= error; settlePending(failure);
      child.stdin.destroy(); signalOwned('SIGTERM');
      killTimer = setTimeout(() => signalOwned('SIGKILL'), 5000);
      killTimer.unref?.();
    }
    return closed;
  }

  function send(frame) {
    if (failure || stopping || child.stdin.destroyed) throw failure || new Error('App Server is unavailable');
    const data = JSON.stringify(frame) + '\n';
    const bytes = Buffer.byteLength(data);
    if (bytes > maxFrameBytes || child.stdin.writableLength + bytes > maxFrameBytes) {
      const error = new Error('App Server outbound frame/backlog exceeds limit');
      void stop(error); throw error;
    }
    child.stdin.write(data, error => { if (error) void stop(error); });
  }

  function respond(id, result, error) {
    if (!serverRequests.delete(id)) return false;
    send(error ? { id, error } : { id, result });
    return true;
  }

  function dispatch(line) {
    if (!line.toString('utf8').trim()) return;
    let frame;
    try { frame = JSON.parse(line.toString('utf8')); }
    catch { void stop(new Error('App Server sent invalid JSON')); return; }
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
      void stop(new Error('App Server sent an invalid RPC frame')); return;
    }
    if (typeof frame.method === 'string') {
      if (frame.method === 'serverRequest/resolved') serverRequests.delete(frame.params?.requestId);
      if (frame.id !== undefined) {
        if (!['string', 'number'].includes(typeof frame.id) || serverRequests.has(frame.id)
            || serverRequests.size >= MAX_PENDING) {
          void stop(new Error('App Server sent an invalid/duplicate request id')); return;
        }
        serverRequests.add(frame.id);
      }
      for (const subscriber of subscribers) {
        try { subscriber(frame); }
        catch (error) { void stop(error); return; }
      }
      // With no consumer, server requests must fail closed instead of hanging.
      if (frame.id !== undefined && !subscribers.size) {
        respond(frame.id, null, { code: -32601, message: 'Unsupported server request' });
      }
      return;
    }
    const request = pending.get(frame.id);
    if (!request) return; // expired/aborted response; never bind it to another RPC
    pending.delete(frame.id); request.cleanup();
    if (frame.error) request.reject(Object.assign(new Error(frame.error.message || 'App Server RPC failed'),
      { code: frame.error.code, data: frame.error.data }));
    else if (Object.hasOwn(frame, 'result')) request.resolve(frame.result);
    else request.reject(new Error('App Server response has no result or error'));
  }

  child.stdout.on('data', chunk => {
    if (stopping) return;
    buffer = Buffer.concat([buffer, chunk]);
    let newline;
    while ((newline = buffer.indexOf(10)) >= 0) {
      if (newline > maxFrameBytes) { void stop(new Error('App Server inbound frame exceeds limit')); return; }
      const line = buffer.subarray(0, newline); buffer = buffer.subarray(newline + 1);
      dispatch(line);
      if (stopping) return;
    }
    if (buffer.length > maxFrameBytes) void stop(new Error('App Server inbound frame exceeds limit'));
  });
  child.stdout.on('end', () => { if (!stopping && buffer.length) { dispatch(buffer); buffer = Buffer.alloc(0); } });
  // Drain stderr without retaining credentials, prompts, or unbounded output.
  child.stderr.resume();
  child.stdin.on('error', error => { void stop(error); });
  child.once('error', error => { failure ||= error; settlePending(failure); });
  child.once('close', (code, signal) => {
    failure ||= new Error(`App Server exited (${code ?? signal ?? 'unknown'})`);
    stopping = true; clearTimeout(killTimer);
    signalOwned('SIGKILL'); // also reap owned descendants that outlive the parent
    settlePending(failure); subscribers.clear(); buffer = Buffer.alloc(0); resolveClosed();
  });

  return {
    closed,
    get pid() { return child.pid || null; },
    request(method, params, { signal, timeoutMs = requestTimeoutMs } = {}) {
      if (signal?.aborted) return Promise.reject(signal.reason);
      if (failure || stopping) return Promise.reject(failure || new Error('App Server is unavailable'));
      if (pending.size >= MAX_PENDING) return Promise.reject(new Error('Too many App Server requests'));
      return new Promise((resolve, reject) => {
        const id = ++seq;
        const finish = error => { const item = pending.get(id); if (!item) return;
          pending.delete(id); item.cleanup(); reject(error); };
        const onAbort = () => finish(signal.reason);
        const timer = setTimeout(() => finish(Object.assign(new Error(`App Server ${method} timed out`),
          { code: 'CODEX_RPC_TIMEOUT' })), timeoutMs);
        const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); };
        pending.set(id, { resolve, reject, cleanup });
        signal?.addEventListener('abort', onAbort, { once: true });
        try { send({ id, method, params }); } catch (error) { finish(error); }
      });
    },
    notify(method, params = {}) { send({ method, params }); },
    respond,
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    stop,
  };
}
