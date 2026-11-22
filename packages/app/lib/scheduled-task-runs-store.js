// Scheduled-task run-history store — a single JSON file per cc-viewer data root.
//
// Run history is deliberately split from the task registry (which lives in
// preferences.json `scheduledTasks`): history is expendable, append-mostly, and grows
// unboundedly per task, while the registry carries secrets (prompts) and scheduling
// state that must survive strict writes. Keeping them apart lets the registry stay
// strictCorrupt while history self-heals, and keeps prefs rewrites small.
//
// File shape: { version: 1, byTask: { [taskId]: Run[] } } — oldest → newest, capped at
// MAX_RUNS per task. Each run carries `claimRunId` so the registry's claim/finalize can
// dedupe an interrupted marker against an already-recorded terminal run.
//
// Lock: its own `${file}.lock` via the shared preferences lock — NEVER nested inside the prefs lock
// (lock order is registry-then-runs for claim/update/sweep, runs-then-registry for
// finalize; see scheduled-task-store.js). Tolerant reads/writes: a corrupt file is backed up privately, then
// reseeded on the next append (history loss is acceptable; a stuck claim is not).
//
// Boundary: L1-lib. Imports only node builtins + local preferences IO. Must NOT import L2.

import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { readPreferences, writePreferences, withPreferencesLock } from './preferences.js';

// Reuse the local strict/private atomic IO and the SAME per-file lock convention.
// Only expendable history may self-heal; retain its exact corrupt bytes first.
async function mutateRuns(file, mutator) {
  return withPreferencesLock(() => {
    let data;
    try { data = readPreferences({ file, strict: true }); }
    catch (error) {
      const stat = lstatSync(file, { throwIfNoEntry: false });
      if (!stat?.isFile() || stat.nlink !== 1) throw error;
      writeFileSync(`${file}.corrupt-${Date.now()}-${randomBytes(4).toString('hex')}`,
        readFileSync(file), { mode: 0o600, flag: 'wx' });
      data = {};
    }
    const reg = _normalize(data);
    const result = mutator(reg);
    writePreferences(reg, { file, durable: true });
    return result;
  }, { file });
}

const FILE_NAME = 'scheduled-task-runs.json';
const VERSION = 1;
export const MAX_RUNS = 20;

export function runsFilePath(root) { return join(root, FILE_NAME); }

function _newRunId() { return `run_${randomBytes(8).toString('hex')}`; }

function _normalize(data) {
  const reg = (data && typeof data === 'object' && !Array.isArray(data) && data.byTask && typeof data.byTask === 'object' && !Array.isArray(data.byTask))
    ? data
    : { version: VERSION, byTask: {} };
  reg.version = VERSION;
  return reg;
}

/**
 * Read one task's run history (oldest → newest, last MAX_RUNS). Never throws; missing /
 * corrupt / unknown task → [].
 */
export function readScheduledTaskRuns(root, taskId) {
  const data = readPreferences({ file: runsFilePath(root) });
  const reg = _normalize(data);
  const runs = Object.hasOwn(reg.byTask, taskId) ? reg.byTask[taskId] : null;
  if (!Array.isArray(runs)) return [];
  return runs.filter(r => r && typeof r === 'object').slice(-MAX_RUNS);
}

/**
 * Append a batch of runs in ONE locked write. entries = [{ taskId, run }].
 * A run with an existing id OR an existing claimRunId (when provided) is skipped, so
 * finalize/reclaim retries are idempotent. Never throws to the caller beyond a hard
 * lock/IO error from mutateJson — history is best-effort by design.
 */
export function appendRuns(root, entries) {
  const list = Array.isArray(entries) ? entries.filter(e => e && typeof e.taskId === 'string' && e.run && typeof e.run === 'object') : [];
  if (list.length === 0) return Promise.resolve();
  return mutateRuns(runsFilePath(root), (data) => {
    const reg = _normalize(data);
    for (const { taskId, run } of list) {
      if (!Object.hasOwn(reg.byTask, taskId)) Object.defineProperty(reg.byTask, taskId, { value: [], enumerable: true, writable: true, configurable: true });
      const arr = Array.isArray(reg.byTask[taskId]) ? reg.byTask[taskId] : (reg.byTask[taskId] = []);
      // Idempotency: skip when the same run id OR the same claimRunId already exists.
      const dup = (run.id && arr.some(r => r && r.id === run.id))
        || (run.claimRunId && arr.some(r => r && r.claimRunId && r.claimRunId === run.claimRunId && r.status !== 'running'));
      if (dup) continue;
      arr.push({ id: run.id || _newRunId(), ...run });
      if (arr.length > MAX_RUNS) arr.splice(0, arr.length - MAX_RUNS);
    }
    return reg;
  });
}

/** Append a single run. Convenience wrapper over appendRuns. */
export function appendRun(root, taskId, run) {
  return appendRuns(root, [{ taskId, run }]);
}

/** Remove a task's history (called when the task itself is deleted). */
export function deleteRunsForTask(root, taskId) {
  return mutateRuns(runsFilePath(root), (data) => {
    const reg = _normalize(data);
    if (Object.prototype.hasOwnProperty.call(reg.byTask, taskId)) delete reg.byTask[taskId];
    return reg;
  });
}

/**
 * Look up whether a terminal run (completed/dispatched/error/failed) already exists for a
 * claimRunId — used by reclaim to restore a once-task's terminal state instead of blindly
 * appending a misleading 'interrupted' marker after a finalize crash.
 */
export function findRunByClaimId(root, taskId, claimRunId) {
  if (!claimRunId) return null;
  const runs = readScheduledTaskRuns(root, taskId);
  return runs.find(r => r.claimRunId === claimRunId && r.status && r.status !== 'running') || null;
}
