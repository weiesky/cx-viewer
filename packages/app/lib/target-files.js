// Frozen 566ade13 / 7a75e1be target listing. The server owns authentication,
// the frozen request cwd and the native AGENTS discovery entries.
import { readdirSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getAllowedRoots, isReadAllowed, reasonToStatus, isNativeFilePathPublic } from './file-access-policy.js';
import { isPublicFilePath } from './credential-file-policy.js';
import { isPathContained } from './file-api.js';
import { reportSwallowed } from '../server/lib/error-report.js';
import { targetError, errnoToStatus, realDirectory, insidePath, targetRelPath, resolveTargetRoot } from './target-scope.js';

// Native skill roots include ~/.agents/skills, without authorizing all of
// ~/.agents. Show only the server-resolved target's directory ancestry so the
// original tree/breadcrumb can reach it. Content and mutation policies remain
// unchanged, and private owners never receive this metadata-only exception.
function isNavigationAncestor(real, verdict, options) {
  return verdict.reason === 'outside-allowlist' && real !== options.targetReal
    && insidePath(options.targetReal, real) && isPublicFilePath(real) && isNativeFilePathPublic(real);
}

function listTargetDirectory(rootReal, segments, deps, options, requireReadable = true) {
  const dirReal = realDirectory(segments.length ? join(rootReal, ...segments) : rootReal, 'Directory');
  if (!isPathContained(dirReal, rootReal)) throw targetError(403, 'Path outside target');
  if (requireReadable) {
    const policy = isReadAllowed(dirReal, options);
    if (!policy.ok && !isNavigationAncestor(dirReal, policy, options)) {
      throw targetError(reasonToStatus(policy.reason), 'Directory not readable');
    }
  }
  const ignored = deps?.IGNORED_PATTERNS || new Set();
  const entries = [];
  let dirents;
  try {
    dirents = readdirSync(dirReal, { withFileTypes: true });
  } catch (err) {
    // EACCES → 403 (permission), ENOENT/ENOTDIR → 404 (race with rename/delete),
    // anything else falls back to 404 so we don't leak internal state via 500.
    throw targetError(errnoToStatus(err), 'Directory not readable');
  }
  // Hard cap on returned entries: this is a synchronous loop with realpath +
  // stat + isReadAllowed per entry, and the endpoint fans out via `ancestors`,
  // so an unbounded listing of a huge dir (e.g. ~/.claude/projects/<hash>/)
  // would block the event loop and return a giant JSON payload. 5000 is well
  // past any realistic skill/CLAUDE.md folder.
  const MAX_ENTRIES = 5000;
  for (const entry of dirents) {
    if (entries.length >= MAX_ENTRIES) break;
    if (ignored.has(entry.name)) continue;
    const fullPath = join(dirReal, entry.name);
    let real;
    try { real = realpathSync(fullPath); } catch (err) { reportSwallowed('targetFiles.entry.realpath', err); continue; }
    if (!insidePath(real, rootReal)) continue;
    const policy = isReadAllowed(real, options);
    if (!policy.ok && !isNavigationAncestor(real, policy, options)) continue;
    let st;
    try { st = statSync(policy.real || real); } catch (err) { reportSwallowed('targetFiles.entry.stat', err); continue; }
    if (!st.isDirectory() && !st.isFile()) continue;
    if (!policy.ok && !st.isDirectory()) continue;
    entries.push({ name: entry.name, type: st.isDirectory() ? 'directory' : 'file', absPath: policy.real || real });
  }
  entries.sort((a, b) => a.type !== b.type
    ? (a.type === 'directory' ? -1 : 1)
    : a.name.localeCompare(b.name));
  return entries;
}

export function readTargetFiles(parsedUrl, cwd, { codexMdEntries, ignored } = {}) {
  const deps = { IGNORED_PATTERNS: ignored };
  const options = { cwd, roots: getAllowedRoots(cwd) };
  const scope = resolveTargetRoot(parsedUrl, cwd, { codexMdEntries });
  options.targetReal = realDirectory(join(scope.rootReal, scope.targetPath), 'Target');
  const rawPath = parsedUrl.searchParams.get('path');
  const requestedSegments = targetRelPath(rawPath);
  const segments = requestedSegments === null ? scope.targetPath.split('/').filter(Boolean) : requestedSegments;
  const entries = listTargetDirectory(scope.rootReal, segments, deps, options, segments.length > 0 || scope.rootKind !== 'home');
  const rootEntries = requestedSegments === null && segments.length > 0
    ? listTargetDirectory(scope.rootReal, [], deps, options, scope.rootKind === 'project')
    : entries;
  const targetEntries = requestedSegments === null
    ? entries.filter(entry => insidePath(entry.absPath, join(scope.rootReal, ...segments)))
    : entries;
  const targetSegments = scope.targetPath ? scope.targetPath.split('/') : [];
  const ancestors = [];
  // Ancestors are the chain from the navigation root down to the directory
  // being listed. When the caller passed no `path` that's the chain leading
  // to the target itself; when they passed `path`, the chain is the requested
  // segments. We deliberately DO NOT use path.relative(targetPath, rawPath)
  // here — that helper happily produces "../.." for sibling branches, which
  // would pollute the cache with pseudo-paths and re-list directories the
  // user never navigated into.
  const chainSegments = requestedSegments === null ? targetSegments : segments;
  // Request-scoped memo: targetFiles lists the same directory multiple times
  // (entries + ancestors chain often share prefixes), so we cache by dir key
  // to avoid duplicate readdirSync storms on large directories.
  const listMemo = new Map();
  const listOnce = (segs, requireReadable) => {
    const key = segs.join('/') + (requireReadable ? '|r' : '|n');
    if (!listMemo.has(key)) listMemo.set(key, listTargetDirectory(scope.rootReal, segs, deps, options, requireReadable));
    return listMemo.get(key);
  };
  const ancestorCount = Math.max(0, chainSegments.length - (requestedSegments === null ? 0 : 1));
  for (let i = 0; i <= ancestorCount; i++) {
    const path = chainSegments.slice(0, i).join('/');
    ancestors.push({ path, entries: listOnce(path ? path.split('/') : [], false) });
  }
  const { rootReal, ...response } = scope;
  return { ...response, targetPath: segments.join('/'), entries: rootEntries, targetEntries, ancestors };
}
