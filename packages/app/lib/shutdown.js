export const SHUTDOWN_DEADLINE_MS = 10_000;
export const FORCE_KILL_GRACE_MS = 12_000;

export function signalExitCode(signal) {
  if (signal === 'SIGINT') return 130;
  if (signal === 'SIGTERM') return 143;
  return 1;
}

export function waitWithTimeout(task, timeoutMs = SHUTDOWN_DEADLINE_MS, label = 'shutdown task') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} timed out after ${timeoutMs}ms`);
      error.code = 'CXV_SHUTDOWN_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });
  const work = typeof task === 'function' ? Promise.resolve().then(task) : Promise.resolve(task);
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** Register one SIGINT/SIGTERM coordinator with a whole-cleanup deadline. */
export function registerSignalShutdown(cleanup, {
  proc = process,
  onError = console.error,
  timeoutMs = SHUTDOWN_DEADLINE_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  let started = false;
  let exited = false;
  let deadlineTimer = null;
  let firstSignal = null;
  const exit = (signal) => {
    if (exited) return;
    exited = true;
    if (deadlineTimer) clearTimer(deadlineTimer);
    deadlineTimer = null;
    proc.exit(signalExitCode(signal));
  };
  const handler = (signal) => {
    const receivedSignal = signal || firstSignal || 'SIGTERM';
    if (started) {
      exit(receivedSignal);
      return;
    }
    started = true;
    firstSignal = receivedSignal;
    const deadlineAt = Date.now() + timeoutMs;
    deadlineTimer = setTimer(() => {
      try { onError(`[CX Viewer] Shutdown timed out after ${timeoutMs}ms`); } catch {}
      exit(firstSignal);
    }, timeoutMs);
    Promise.resolve()
      .then(() => cleanup({ signal: firstSignal, deadlineAt }))
      .catch((error) => {
        try { onError(`[CX Viewer] Shutdown failed: ${error?.message || error}`); } catch {}
      })
      .finally(() => exit(firstSignal));
  };
  const onSigint = () => handler('SIGINT');
  const onSigterm = () => handler('SIGTERM');
  proc.on('SIGINT', onSigint);
  proc.on('SIGTERM', onSigterm);
  return () => {
    proc.off('SIGINT', onSigint);
    proc.off('SIGTERM', onSigterm);
  };
}

/**
 * Ask another process to stop, then escalate from outside that process if its
 * JavaScript event loop is too busy to run its signal handlers.
 */
export function terminateWithEscalation(pid, {
  graceMs = FORCE_KILL_GRACE_MS,
  kill = process.kill,
  stillTarget = async () => true,
  forceKill = async () => {
    try { kill(pid, 'SIGKILL'); } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  },
  setTimer = setTimeout,
  onError = () => {},
} = {}) {
  let settle;
  const completion = new Promise(resolve => { settle = resolve; });
  try {
    kill(pid, 'SIGTERM');
  } catch (error) {
    if (error?.code === 'ESRCH') {
      Promise.resolve(forceKill(pid))
        .then(() => settle({ status: 'exited' }))
        .catch(forceError => {
          onError(forceError);
          settle({ status: 'failed', error: forceError });
        });
    } else {
      onError(error);
      settle({ status: 'failed', error });
    }
    return { timer: null, completion };
  }
  const timer = setTimer(async () => {
    try {
      kill(pid, 0);
    } catch (error) {
      if (error?.code !== 'ESRCH') onError(error);
      if (error?.code === 'ESRCH') {
        try {
          await forceKill(pid);
          settle({ status: 'exited' });
        } catch (forceError) {
          onError(forceError);
          settle({ status: 'failed', error: forceError });
        }
      } else {
        settle({ status: 'failed', error });
      }
      return;
    }
    try {
      if (!await stillTarget(pid)) {
        settle({ status: 'replaced' });
        return;
      }
      await forceKill(pid);
      settle({ status: 'forced' });
    } catch (error) {
      if (error?.code !== 'ESRCH') onError(error);
      settle(error?.code === 'ESRCH' ? { status: 'exited' } : { status: 'failed', error });
    }
  }, graceMs);
  return { timer, completion };
}
