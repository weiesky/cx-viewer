// Search worker — runs the pure-node fallback engine OFF the server's event loop.
//
// Why: the node engine does per-file sync fs (lstat/realpath/stat/read up to 1MB) plus a JS
// RegExp over every line. On the main loop that pins the whole server (in Electron each tab's
// server is a forked process, so a scan would freeze its SSE/WS/PTY traffic). Inside a
// worker the sync calls only block the worker's own loop — harmless.
//
// Protocol (one job per Worker instance; the parent terminates on completion/abort):
//   in : workerData { root, candidates, privateRoots, nativeRoots, query, caseSensitive, wholeWord, regex, includeGlobs, excludeGlobs,
//                     maxResults, maxMatchesPerFile, maxFileSize, nodeTimeBudgetMs }
//   out: parentPort.postMessage({ type: 'done', results, truncated, filesScanned })
//        parentPort.postMessage({ type: 'error', error: 'invalid_regex' | 'search_failed' })
//
// Environment note: this file is imported by node --test in the parent process for direct
// runNodeScan unit coverage, so everything executes lazily inside the `if (parentPort)` guard.
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { constants, closeSync, fstatSync, openSync, readFileSync, readdirSync, lstatSync, statSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { gitListFiles } from './search-candidates.js';
import { isPathContained } from './file-api.js';
import { createCredentialFilePolicy, assertPublicFilePath, isPublicFilePath } from './credential-file-policy.js';
import { getNativeFileRoots, assertNativeFilePath } from './file-access-policy.js';
import {
  buildQueryRegExp, looksCatastrophic, globToRegExp,
  isHidden, hasIgnoredSegment, normRel, isBinary, IGNORED_NAMES, DEFAULTS,
} from './code-search.js';

// Yield cadence: every FILE_YIELD_INTERVAL candidates AND every BYTE_YIELD_BUDGET bytes read,
// whichever comes first — a few 1MB files must not starve the worker's own loop between the
// 64-file ticks (the budget keeps postMessage/terminate latency low).
const FILE_YIELD_INTERVAL = 64;
const BYTE_YIELD_BUDGET = 4 * 1024 * 1024;

function makeGlobFilter(includeGlobs, excludeGlobs) {
  // Parity with rg: a '!'-prefixed entry in the include field is a negation (exclude),
  // mirroring rg's `-g !glob`. globToRegExp strips the leading '!'.
  const inc = [];
  const exc = [];
  for (const g of includeGlobs || []) { if (!g) continue; (g.startsWith('!') ? exc : inc).push(globToRegExp(g)); }
  for (const g of excludeGlobs || []) { if (!g) continue; exc.push(globToRegExp(g)); }
  return (relPath) => {
    if (inc.length && !inc.some((r) => r.test(relPath))) return false;
    if (exc.some((r) => r.test(relPath))) return false;
    return true;
  };
}

function createGrouper(maxResults, maxMatchesPerFile) {
  const byFile = new Map();
  let total = 0;
  let capped = false; // a per-file or global cap dropped some matches
  return {
    /** @returns {boolean} true if still under the global cap, false once maxResults is hit */
    add(file, match) {
      if (total >= maxResults) { capped = true; return false; }
      let entry = byFile.get(file);
      if (!entry) { entry = []; byFile.set(file, entry); }
      if (entry.length >= maxMatchesPerFile) { capped = true; return true; }
      entry.push(match);
      total++;
      return total < maxResults;
    },
    get total() { return total; },
    get capped() { return capped; },
    results() {
      return [...byFile.entries()].map(([file, matches]) => ({ file, matches }));
    },
  };
}

function walkDir(root, policy) {
  const out = [];
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    let entries;
    try { entries = readdirSync(rel ? join(root, rel) : root, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.') || IGNORED_NAMES.has(e.name)) continue;
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isSymbolicLink()) continue; // don't follow symlinks (parity + safety)
      if (!policy.allows(join(root, childRel))) continue;
      if (e.isDirectory()) stack.push(childRel);
      else if (e.isFile()) out.push(childRel);
    }
  }
  return out;
}

/**
 * The full node-engine scan (former nodeSearch body, semantics unchanged).
 * No AbortSignal input: cancellation is the parent terminating the worker. The cooperative
 * time-budget/cap exits are unchanged from the in-process implementation.
 * Exported for direct unit coverage (node --test runs this file with isMainThread=true).
 */
export async function runNodeScan(opts) {
  // Catastrophic-backtracking guard applies ONLY to the JS-backtracking node engine (ripgrep's
  // engine is linear and safe), so it lives here rather than gating the rg path too.
  if (opts.regex && looksCatastrophic(opts.query)) {
    return { results: [], truncated: false, filesScanned: 0, error: 'invalid_regex' };
  }
  let queryRe;
  try {
    queryRe = buildQueryRegExp(opts);
  } catch {
    return { results: [], truncated: false, filesScanned: 0, error: 'invalid_regex' };
  }
  const credentialPolicy = opts.privateRoots ? createCredentialFilePolicy(opts.privateRoots)
    : { allows: isPublicFilePath, assertPath: assertPublicFilePath };
  const nativePolicy = createCredentialFilePolicy(opts.nativeRoots || getNativeFileRoots());
  const policy = { allows: path => credentialPolicy.allows(path) && nativePolicy.allows(path), assertPath: credentialPolicy.assertPath };
  if (!policy.allows(opts.root)) return { results: [], truncated: false, filesScanned: 0 };
  const maxResults = opts.maxResults ?? DEFAULTS.maxResults;
  const maxPerFile = opts.maxMatchesPerFile ?? DEFAULTS.maxMatchesPerFile;
  const maxFileSize = opts.maxFileSize ?? DEFAULTS.maxFileSize;
  const timeBudget = opts.nodeTimeBudgetMs ?? DEFAULTS.nodeTimeBudgetMs;
  const started = Date.now();

  // Production receives the parent-owned asynchronous listing; direct scans list here.
  let candidates = opts.candidates === undefined ? await gitListFiles(opts.root) : opts.candidates;
  if (candidates == null) candidates = walkDir(opts.root, policy);
  candidates = candidates.map(normRel).filter((p) => !isHidden(p) && !hasIgnoredSegment(p));

  const passesGlob = makeGlobFilter(opts.includeGlobs, opts.excludeGlobs);
  const grouper = createGrouper(maxResults, maxPerFile);
  const scanned = new Set();
  let truncated = false;
  let processed = 0;
  let bytesSinceYield = 0;

  for (const rel of candidates) {
    if (Date.now() - started > timeBudget) { truncated = true; break; }
    // Yield to the worker's own event loop periodically so a large scan stays responsive to a
    // terminate() and a candidate list in the tens of thousands doesn't monopolize the loop.
    if ((processed++ % FILE_YIELD_INTERVAL) === 0 || bytesSinceYield >= BYTE_YIELD_BUDGET) {
      bytesSinceYield = 0;
      await new Promise((r) => setImmediate(r));
    }
    if (!passesGlob(rel)) continue;

    const full = join(opts.root, rel);
    if (!policy.allows(full)) continue;
    let lst;
    try { lst = lstatSync(full); } catch { continue; }
    if (lst.isSymbolicLink()) continue; // never follow symlinks

    let real;
    try { real = realpathSync(full); } catch { continue; }
    if (!isPathContained(real, opts.root)) continue;

    let st;
    try { st = statSync(real); } catch { continue; }
    if (!st.isFile() || st.size > maxFileSize) continue;

    let raw;
    let fd;
    try {
      fd = openSync(real, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
      const opened = fstatSync(fd);
      if (!opened.isFile() || opened.size > maxFileSize) continue;
      policy.assertPath(real, opened);
      assertNativeFilePath(real, opened, nativePolicy);
      raw = readFileSync(fd);
    } catch { continue; }
    finally { if (fd !== undefined) closeSync(fd); }
    bytesSinceYield += raw.length;
    if (isBinary(raw)) continue;

    scanned.add(rel);
    const lines = raw.toString('utf8').split(/\r?\n/);
    let stop = false;
    for (let i = 0; i < lines.length && !stop; i++) {
      const text = lines[i];
      if (!text || text.length > DEFAULTS.maxLineLength) continue; // skip empty / pathological long lines
      queryRe.lastIndex = 0;
      const submatches = [];
      let m;
      while ((m = queryRe.exec(text)) !== null) {
        const start = m.index;
        const end = m.index + m[0].length;
        if (end > start) submatches.push({ start, end });
        if (m.index === queryRe.lastIndex) queryRe.lastIndex++; // zero-width guard
        if (submatches.length >= 1000) break; // pathological single-line match count
      }
      if (submatches.length) {
        const ok = grouper.add(rel, { line: i + 1, text: text.slice(0, DEFAULTS.maxLineLength), submatches });
        if (!ok) { truncated = true; stop = true; }
      }
    }
    if (stop) break;
  }
  return { results: grouper.results(), truncated: truncated || grouper.capped, filesScanned: scanned.size };
}

// ─── worker entry (skipped under node --test in the parent process) ───
if (!isMainThread && parentPort) {
  runNodeScan(workerData || {})
    .then((r) => {
      if (r.error) parentPort.postMessage({ type: 'error', error: r.error });
      else parentPort.postMessage({ type: 'done', results: r.results, truncated: r.truncated, filesScanned: r.filesScanned });
    })
    .catch(() => parentPort.postMessage({ type: 'error', error: 'search_failed' }));
}
