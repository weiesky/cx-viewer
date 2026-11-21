// Shared resolution of a "target" (AGENTS.md / skill folder) into the
// navigation root the file browser walks, plus the path validation both the
// read route (/api/target-files in routes/files-content.js) and the write
// routes (/api/target-* in routes/target-files-fs.js) rely on.
//
// Frozen 7a75e1be shared read/write resolver, with native identity/policy owners.
// Never trust a client-supplied absolute root: re-derive it from the target
// identity. Callers own authentication/response shaping; this lib never imports
// server.js. Routes and UI are not enabled by this prerequisite alone.
import { realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { homedir } from 'node:os';
import { isReadAllowed, reasonToStatus } from './file-access-policy.js';
import { listSkills } from './skills-api.js';
import { getCodexConfigDir } from './codex-config.js';

export function targetError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Map fs errno to a sensible HTTP status: missing → 404, permission → 403,
// symlink loop → 400 (treat as malformed), anything else → 404 (don't leak).
export function errnoToStatus(err) {
  const code = err?.code;
  if (code === 'EACCES' || code === 'EPERM') return 403;
  if (code === 'ELOOP') return 400;
  return 404;
}

export function realDirectory(path, label) {
  let real;
  try { real = realpathSync(path); } catch (err) { throw targetError(errnoToStatus(err), `${label} not found`); }
  let st;
  try { st = statSync(real); } catch (err) { throw targetError(errnoToStatus(err), `${label} not found`); }
  if (!st.isDirectory()) throw targetError(400, `${label} is not a directory`);
  return real;
}

export function checkedDirectory(path, label, cwd) {
  const real = realDirectory(path, label);
  const policy = isReadAllowed(real, { cwd });
  if (!policy.ok) throw targetError(reasonToStatus(policy.reason), `${label} not readable`);
  return policy.real;
}

export function insidePath(path, root) {
  return path === root || path.startsWith(root + sep);
}

export function targetNavigation(targetReal, cwd) {
  const projectReal = realDirectory(cwd, 'Project');
  if (insidePath(targetReal, projectReal)) return { rootReal: projectReal, rootKind: 'project' };
  // $HOME becomes the navigation root for home-resident targets (user skills,
  // plugins, the global AGENTS.md). Entries outside the allowlist (e.g. ~/.ssh,
  // ~/.aws) are filtered per-entry by isReadAllowed, and sensitive paths inside
  // ~/.codex are covered by file-access-policy's denylist. The /api/target-files
  // handler additionally gates this endpoint behind isAdminReq + same-origin so
  // a cross-site page cannot enumerate the user's home tree.
  const homeReal = realDirectory(homedir(), 'Home');
  if (insidePath(targetReal, homeReal)) {
    checkedDirectory(targetReal, 'Directory', cwd);
    return { rootReal: homeReal, rootKind: 'home' };
  }
  const configReal = realDirectory(getCodexConfigDir(), 'Codex config');
  if (insidePath(targetReal, configReal)) {
    checkedDirectory(targetReal, 'Directory', cwd);
    return { rootReal: realDirectory(dirname(configReal), 'Config root'), rootKind: 'config' };
  }
  // Allowlist fallback: targets that live inside another allowlisted root
  // (registered workspaces, /tmp/cx-viewer-uploads, etc.) remain reachable.
  // Native guidance detail discovery can also list ancestor AGENTS files;
  // that identity does not grant their folder an allowlist exemption. Use the target's own directory as the navigation root —
  // no parent browsing, but at least the entry the user clicked actually opens.
  const policy = isReadAllowed(targetReal, { cwd });
  if (!policy.ok) throw targetError(reasonToStatus(policy.reason), 'Target not readable');
  return { rootReal: realDirectory(targetReal, 'Target'), rootKind: 'target' };
}

export function targetScope(targetReal, cwd) {
  const navigation = targetNavigation(targetReal, cwd);
  return { ...navigation, targetPath: relative(navigation.rootReal, targetReal).split(sep).join('/') };
}

export function targetRelPath(raw) {
  if (raw == null) return null;
  if (raw === '') return [];
  if (typeof raw !== 'string' || raw.length > 2048 || raw.includes('\0') || raw.includes('\\')
    || raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) {
    throw targetError(400, 'Invalid path');
  }
  const segments = raw.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw targetError(400, 'Invalid path');
  }
  // Hard cap on navigation depth: each segment triggers at least one
  // synchronous readdir + per-entry realpath/stat in `ancestors`, and a 2KB
  // free-form path could otherwise fan out into hundreds of syscalls per
  // request. 32 is far deeper than any realistic skill / AGENTS.md location.
  if (segments.length > 32) throw targetError(400, 'Path too deep');
  return segments;
}

// codexMdEntries is the server-owned discovery result for the frozen request
// cwd, never a client body/root. Reuse native opaque IDs, not a second identity.
export function resolveTargetRoot(parsedUrl, cwd, { codexMdEntries = [] } = {}) {
  const kind = parsedUrl.searchParams.get('kind');
  if (kind === 'codex-md') {
    const id = parsedUrl.searchParams.get('id') || '';
    if (!/^[A-Za-z0-9_-]{1,8192}$/.test(id)) throw targetError(400, 'Invalid id');
    const candidate = codexMdEntries.find(entry => entry.id === id);
    if (!candidate || basename(candidate.path) !== 'AGENTS.md') throw targetError(404, 'Target not found');
    return { ...targetScope(realDirectory(dirname(candidate.path), 'Directory'), cwd), targetKind: 'codex-md' };
  }
  if (kind !== 'skill') throw targetError(400, 'Invalid target kind');
  const source = parsedUrl.searchParams.get('source');
  const targetPath = parsedUrl.searchParams.get('targetPath');
  if (!['user', 'project', 'plugin'].includes(source)) throw targetError(400, 'Invalid skill source');
  if (typeof targetPath !== 'string' || !targetPath || targetPath.length > 4096 || targetPath.includes('\0')) {
    throw targetError(400, 'Invalid skill path');
  }
  const skill = listSkills({ cwd })
    .find(entry => entry.source === source && entry.path === targetPath);
  if (!skill) throw targetError(404, 'Target not found');
  const rootReal = realDirectory(skill.path, 'Directory');
  const scope = targetScope(rootReal, cwd);
  const anchor = source === 'project'
    ? scope.rootReal
    : dirname(dirname(skill.path));
  const anchorReal = realDirectory(anchor, 'Skill root');
  if (!insidePath(rootReal, anchorReal)) throw targetError(403, 'Target outside skill root');
  // Native scanPluginSkills owns ~/.codex/plugins/cache, not custom CODEX_HOME.
  // Keep its actual plugin containment boundary; membership alone is insufficient.
  if (source === 'plugin' && !insidePath(rootReal, realDirectory(join(homedir(), '.codex', 'plugins'), 'Plugin root'))) {
    throw targetError(403, 'Target outside plugin root');
  }
  return { ...scope, targetKind: 'skill' };
}

// ===========================================================================
// Write-side scope resolution (used only by the /api/target-* write routes).
// ===========================================================================

// SECURITY / INTENTIONAL DESIGN (do NOT tighten in review without product sign-off):
// the writable area for a target browser is the WHOLE navigation root returned by
// targetNavigation (project / home / config / target), NOT just the target's own
// subtree. This is a deliberate product decision — the user navigates the browser
// up to ancestors (e.g. from a skill folder to ~ or ~/.codex) and expects the
// context menu to keep working there. The sensitive-file / sensitive-directory
// backstop for that wider surface is isWriteAllowed (lib/file-access-policy.js),
// which every mutation runs through; containment in the navigation root plus
// isWriteAllowed is the boundary, not the target subtree.
export function resolveTargetWriteScope(parsedUrl, cwd, options) {
  // Re-derive the target identity server-side (never trust a client-sent root).
  // The writable surface is the WHOLE navigation root (scope.rootReal) — the
  // target's own directory is NOT separately resolved here because the product
  // decision is to allow writes anywhere in the navigation root, with the
  // sensitive-file backstop living in isWriteAllowed (see file-access-policy.js).
  return resolveTargetRoot(parsedUrl, cwd, options);
}

// targetRelPath treats null as "caller omitted path" (the read route uses that
// to default to the target's own directory). The write routes always need an
// explicit path, so this is the required variant: omitted → 400.
export function requiredTargetRelPath(raw) {
  const segs = targetRelPath(raw);
  if (segs === null) throw targetError(400, 'Missing path');
  return segs;
}
