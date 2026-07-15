#!/usr/bin/env node

import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = 'Usage: node lib/log-v2/backfill-session-summaries.js <log-dir> [--project=ID] [--dry-run|--write]';

function safeRelativePath(logDir, value) {
  if (typeof value !== 'string' || !value) return '(unknown archive)';
  const rel = relative(logDir, resolve(value));
  return (rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep)
    ? rel
    : value.split(sep).pop() || '(unknown archive)')
    .split(sep)
    .join('/');
}

function safeDiscoveryPath(logDir, value) {
  if (typeof value !== 'string' || !value) return '(unknown archive)';
  if (isAbsolute(value)) return safeRelativePath(logDir, value);
  const parts = value.split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0 || parts.includes('..')) return '(unknown archive)';
  return parts.join('/');
}

function errorCode(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{2,80}$/.test(error.code)
    ? error.code
    : null;
  return code ? ` (${code})` : '';
}

function summaryIsCurrent(inspection) {
  if (!inspection || typeof inspection !== 'object') return false;
  if (typeof inspection.current === 'boolean') return inspection.current;
  if (typeof inspection.fresh === 'boolean') return inspection.fresh && inspection.ok !== false;
  if (typeof inspection.needsRebuild === 'boolean') return !inspection.needsRebuild;
  if (typeof inspection.stale === 'boolean') return !inspection.stale && inspection.valid !== false;
  if (typeof inspection.ok === 'boolean') return inspection.ok;
  return inspection.status === 'current' || inspection.status === 'unchanged';
}

function rebuildChanged(result) {
  if (!result || typeof result !== 'object') return true;
  if (typeof result.updated === 'boolean') return result.updated;
  if (typeof result.changed === 'boolean') return result.changed;
  return result.status !== 'unchanged' && result.status !== 'current';
}

export function parseBackfillArgs(argv) {
  const positional = [];
  let projectId = null;
  let mode = null;

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    if (arg === '--dry-run' || arg === '--write') {
      const nextMode = arg === '--write' ? 'write' : 'dry-run';
      if (mode) throw new TypeError(`conflicting or duplicate mode flags: --${mode} and ${arg}`);
      mode = nextMode;
      continue;
    }
    if (arg.startsWith('--project=')) {
      if (projectId !== null) throw new TypeError('--project may be specified only once');
      projectId = arg.slice('--project='.length);
      if (!projectId) throw new TypeError('--project requires a non-empty ID');
      continue;
    }
    throw new TypeError(`unknown option: ${arg}`);
  }

  if (positional.length !== 1) throw new TypeError(USAGE);
  return Object.freeze({
    logDir: resolve(positional[0]),
    projectId,
    write: mode === 'write',
  });
}

/**
 * Backfills derived summaries without exposing prompt content in its report.
 * Dependencies are injectable so CLI behavior can be tested without mutating a
 * real log root. A dry run only calls the read-only inspector.
 */
export async function backfillSessionSummaries({
  logDir,
  projectId = null,
  write = false,
  discover,
  inspect,
  rebuild,
  onProgress = null,
}) {
  if (typeof discover !== 'function' || typeof inspect !== 'function' || typeof rebuild !== 'function') {
    throw new TypeError('discover, inspect, and rebuild functions are required');
  }

  const report = { scanned: 0, updated: 0, unchanged: 0, errors: [] };
  let discovery;
  try {
    discovery = await discover(logDir, { projectId });
  } catch (error) {
    report.errors.push({ path: '.', error: `archive discovery failed${errorCode(error)}` });
    return report;
  }

  for (const failure of discovery?.errors || []) {
    const path = safeDiscoveryPath(logDir, failure?.path);
    report.errors.push({ path, error: 'archive discovery failed' });
  }

  for (const archive of discovery?.archives || []) {
    const sessionDir = archive?.sessionDir;
    const path = safeRelativePath(logDir, sessionDir);
    report.scanned++;
    try {
      const inspection = await inspect(sessionDir);
      if (summaryIsCurrent(inspection)) {
        report.unchanged++;
        onProgress?.({ path, status: 'unchanged', write });
        continue;
      }
      if (!write) {
        // In a dry run, "updated" means the number of archives that would be
        // updated. No lock or write-capable API is invoked.
        report.updated++;
        onProgress?.({ path, status: 'would-update', write });
        continue;
      }
      const result = await rebuild(sessionDir, { durable: true, lock: true });
      if (rebuildChanged(result)) report.updated++;
      else report.unchanged++;
      onProgress?.({ path, status: rebuildChanged(result) ? 'updated' : 'unchanged', write });
    } catch (error) {
      report.errors.push({
        path,
        error: `${write ? 'summary rebuild' : 'summary inspection'} failed${errorCode(error)}`,
      });
      onProgress?.({ path, status: 'error', write });
    }
  }
  return report;
}

async function loadCoreApis() {
  const [materializer, summary] = await Promise.all([
    import('./materializer.js'),
    import('./session-summary.js'),
  ]);
  return {
    discover: materializer.discoverV2SessionArchives,
    inspect: summary.inspectSessionSummary,
    rebuild: summary.rebuildSessionSummary,
  };
}

async function main(argv) {
  const options = parseBackfillArgs(argv);
  const dependencies = await loadCoreApis();
  const report = await backfillSessionSummaries({
    ...options,
    ...dependencies,
    onProgress({ path, status }) {
      console.error(`[log-v2-summary] ${status} ${path}`);
    },
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message || String(error) }));
    process.exitCode = 1;
  });
}
