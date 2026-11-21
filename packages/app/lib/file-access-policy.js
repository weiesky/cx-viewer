// File-browser access policy. Tables and missing-leaf write validation come
// from frozen cc-viewer 74cd752d (566ade13 / 7a75e1be / 208f1348).
// Native adaptation: actual Codex state owners and existing credential guard.
import { realpathSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename, relative, sep, join } from 'node:path';
import { homedir, platform, tmpdir } from 'node:os';
import { LOG_DIR } from '../findcx.js';
import { getCodexConfigDir } from './codex-config.js';
import { loadWorkspaces } from '../workspace-registry.js';
import { assertPublicFilePath, assertPublicMutationPath, createCredentialFilePolicy } from './credential-file-policy.js';

const isWin = platform() === 'win32';
const norm = p => isWin ? p.toLowerCase() : p;
const withSep = p => p.endsWith(sep) ? p : p + sep;
const STARTUP_CWD = process.cwd();
const STARTUP_NATIVE_DIR = resolve(getCodexConfigDir());
const STARTUP_LOG_DIR = resolve(LOG_DIR);
const STARTUP_SQLITE_DIR = process.env.CODEX_SQLITE_HOME ? resolve(process.env.CODEX_SQLITE_HOME) : null;
const sqliteDirs = () => [STARTUP_SQLITE_DIR, process.env.CODEX_SQLITE_HOME].filter(Boolean);
const homeJoin = (...parts) => join(homedir(), ...parts);
const realOrResolved = path => { try { return realpathSync(path); } catch { return resolve(path); } };
const isInsideRoot = (path, root) => norm(path) === norm(root) || norm(path).startsWith(norm(withSep(root)));
const getProjectRoot = cwd => realOrResolved(cwd || process.env.CXV_PROJECT_DIR || STARTUP_CWD);

export const SENSITIVE_PATH_PREFIXES = [
  // SSH / GPG / 各家云凭据
  homeJoin('.ssh'),
  homeJoin('.aws'),
  homeJoin('.gnupg'),
  homeJoin('.docker'),
  homeJoin('.kube'),
  homeJoin('.netrc'),
  homeJoin('.pgpass'),
  homeJoin('.my.cnf'),
  homeJoin('.azure'),
  homeJoin('.terraform.d'),
  homeJoin('.wrangler'),
  homeJoin('.cargo'),
  homeJoin('.subversion', 'auth'),
  homeJoin('.config', 'gh'),
  homeJoin('.config', 'git'),
  homeJoin('.config', 'google-chrome'),
  homeJoin('.mozilla'),
  // macOS Library
  homeJoin('Library', 'Keychains'),
  homeJoin('Library', 'Cookies'),
  homeJoin('Library', 'Application Support', 'Google', 'Chrome'),
  homeJoin('Library', 'Application Support', 'Firefox'),
  homeJoin('Library', 'Application Support', 'JetBrains'),
  // 系统目录
  '/etc',
  '/proc',
  '/sys',
  '/dev',
  // macOS realpath 变体(只拦 /private/etc:/private/var 是 tmpdir() 的家,不能整个黑)
  '/private/etc',
];

/**
 * 敏感文件名 pattern —— 在 allowlist 内但项目外的路径,文件名匹配则拒绝。
 * 项目内(CCV_PROJECT_DIR 内)豁免,允许 fixtures/test cert 等合法用途。
 */
export const SENSITIVE_FILENAME_PATTERNS = [
  /^id_(rsa|ed25519|ecdsa|dsa)(?!\.pub$)(\.[^.]+)?$/i, // 私钥(放行 .pub)
  /\.(pem|key|p12|pfx|keystore|jks)$/i,                 // 证书 / 私钥
  /^\.env(\.(?!example$|sample$|template$).*)?$/i,      // .env 系列(放行 .example/.sample/.template)
  /^credentials$/i,                                     // 无扩展凭据文件
  /^secrets\..+$/i,
  /^service-account.*\.json$/i,
  /-credentials\.json$/i,
  /\.(tfstate|tfvars)$/i,                               // Terraform 明文 secret
  /^\.(bash|zsh|python)_history$/,
  /^\.lesshst$/,
];


// A fresh request snapshot avoids stale roots after native LOG_DIR changes or
// registry writes from another process; listing routes reuse it for all entries.
export function getAllowedRoots(cwd) {
  const paths = [getProjectRoot(cwd), STARTUP_CWD, getCodexConfigDir(), STARTUP_NATIVE_DIR,
    homeJoin('.codex'), homeJoin('.agents', 'skills'), homeJoin('.agents', 'skills-skip'),
    join(tmpdir(), 'cx-viewer-uploads'), '/tmp/cx-viewer-uploads', LOG_DIR];
  try { for (const workspace of loadWorkspaces()) paths.push(workspace.path); } catch {}
  const seen = new Set();
  return paths.filter(path => typeof path === 'string' && path).map(raw => ({ raw, real: realOrResolved(raw) }))
    .filter(({ real }) => { const key = norm(real); if (seen.has(key)) return false; seen.add(key); return true; });
}

function nativeStatePaths() {
  const paths = [STARTUP_LOG_DIR, LOG_DIR];
  for (const dir of new Set([STARTUP_NATIVE_DIR, resolve(getCodexConfigDir()), homeJoin('.codex')])) {
    const names = ['sessions', 'archived_sessions', 'shell_snapshots', 'log',
      'history.jsonl', 'session_index.jsonl', 'transcription-history.jsonl'];
    try { names.push(...readdirSync(dir).filter(name => /^(?:(?:state|logs|memories|goals)_\d+\.sqlite(?:$|[-.])|(?:history|session_index|transcription-history)\.jsonl(?:$|[._-]))/i.test(name))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    paths.push(...names.map(name => join(dir, name)), join(dir, 'memories', 'raw_memories.md'));
  }
  for (const dir of sqliteDirs()) {
    try { paths.push(...readdirSync(dir).filter(name => /^(?:state|logs|memories|goals)_\d+\.sqlite(?:$|[-.])/i.test(name)).map(name => join(dir, name))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return paths;
}
const nativeStatePolicy = createCredentialFilePolicy(nativeStatePaths);

// Ordinary file tools share the same native owners as target mode. Workers
// receive this parent snapshot so `CXV_LOG_DIR=tmp` never switches to threadId's
// different owner. Keep credential descriptor checks separate and unchanged.
export const getNativeFileRoots = nativeStatePaths;
export const nativeFileSearchExclusions = nativeStatePolicy.searchExclusions;
export const isNativeFilePathPublic = nativeStatePolicy.allows;
export function assertNativeFilePath(path, descriptorStat, policy = nativeStatePolicy) {
  // The path guard checks private hardlinks when nlink > 1. Verify the opened
  // inode too, without recursively walking every transcript for ordinary files.
  const real = policy.assertPath(path, descriptorStat?.nlink > 1 ? descriptorStat : null);
  if (descriptorStat) {
    const current = statSync(real);
    if (current.dev !== descriptorStat.dev || current.ino !== descriptorStat.ino) {
      throw Object.assign(new Error('File changed during access'), { code: 'ACCESS_DENIED', status: 403 });
    }
  }
  return real;
}

function evaluateResolvedPath(real, options = {}) {
  const roots = options.roots || getAllowedRoots(options.cwd);
  if (!roots.some(root => isInsideRoot(real, root.real))) {
    return { ok: false, reason: 'outside-allowlist', allowedRoots: roots.map(root => root.raw) };
  }
  try { assertPublicFilePath(real); } catch { return { ok: false, reason: 'sensitive-native-config' }; }
  // New-file writes must reject protected variants before those names exist.
  for (const dir of new Set([STARTUP_NATIVE_DIR, resolve(getCodexConfigDir()), homeJoin('.codex')])) {
    const nativeReal = realOrResolved(dir);
    if (!isInsideRoot(real, nativeReal)) continue;
    const first = relative(nativeReal, real).split(sep)[0];
    if (/^(?:auth\.json|config\.toml|\.credentials\.json)(?:$|[._-])/i.test(first)) return { ok: false, reason: 'sensitive-native-config' };
    if (/^(?:state|logs|memories|goals)_\d+\.sqlite(?:$|[-.])/i.test(first)
      || /^(?:history|session_index|transcription-history)\.jsonl(?:$|[._-])/i.test(first)) return { ok: false, reason: 'sensitive-native-history' };
  }
  for (const dir of sqliteDirs()) {
    const sqliteReal = realOrResolved(dir);
    if (isInsideRoot(real, sqliteReal) && /^(?:state|logs|memories|goals)_\d+\.sqlite(?:$|[-.])/i.test(relative(sqliteReal, real).split(sep)[0])) {
      return { ok: false, reason: 'sensitive-native-history' };
    }
  }
  // Native V2 archives and Codex state belong to scoped history/memory APIs.
  // Reuse metadata-only path/inode checks; no history or credential bytes read.
  // The existing scoped image response route retains its descriptor validation.
  try { nativeStatePolicy.assertPath(real); }
  catch { return { ok: false, reason: 'sensitive-native-history' }; }
  if (!isInsideRoot(real, getProjectRoot(options.cwd))) {
    for (const prefix of SENSITIVE_PATH_PREFIXES) {
      if (norm(real).startsWith(norm(withSep(realOrResolved(prefix))))) return { ok: false, reason: 'sensitive-prefix' };
    }
    for (const pattern of SENSITIVE_FILENAME_PATTERNS) {
      if (pattern.test(basename(real))) return { ok: false, reason: 'sensitive-filename' };
    }
  }
  return { ok: true, real };
}

export function isReadAllowed(absPath, options = {}) {
  if (typeof absPath !== 'string' || !absPath) return { ok: false, reason: 'invalid' };
  if (absPath.includes('\0')) return { ok: false, reason: 'null-byte' };
  let real;
  try { real = realpathSync(absPath); } catch { return { ok: false, reason: 'realpath-failed' }; }
  return evaluateResolvedPath(real, options);
}

export function isWriteAllowed(absPath, options = {}) {
  if (typeof absPath !== 'string' || !absPath) return { ok: false, reason: 'invalid' };
  if (absPath.indexOf('\x00') !== -1) return { ok: false, reason: 'null-byte' };

  // Existing file: realpath it and run the shared verdict directly.
  // New file: realpath the nearest existing parent, then re-evaluate the
  // candidate (parentReal + basename) so symlink/denylist checks apply to the
  // resolved location, not the spelled path.
  let real;
  let existed = true;
  try { real = realpathSync(absPath); } catch { existed = false; }
  if (!existed) {
    // Dangling-symlink guard: realpath failed but the leaf may still be a symlink
    // whose target is missing/outside the allowlist. writeFileSync would FOLLOW it
    // and create/overwrite the link's target outside the navigation root — a
    // containment bypass. lstat does not follow the link, so an isSymbolicLink()
    // hit here refuses the write. Do NOT remove (TOCTOU-class escape).
    try { if (lstatSync(absPath).isSymbolicLink()) return { ok: false, reason: 'symlink' }; } catch { /* truly absent leaf */ }
    let cursor = resolve(absPath, '..');
    const descent = [basename(absPath)];
    let parentReal = null;
    for (let depth = 0; depth < 32; depth++) {
      try { parentReal = realpathSync(cursor); break; } catch {
        const parent = resolve(cursor, '..');
        if (parent === cursor) break;
        descent.unshift(basename(cursor));
        cursor = parent;
      }
    }
    if (parentReal === null) return { ok: false, reason: 'realpath-failed' };
    // Every ancestor on the way down must be inside the allowlist / not denied;
    // evaluate the nearest existing ancestor, then rebuild the candidate.
    const ancestorVerdict = evaluateResolvedPath(parentReal, options);
    if (!ancestorVerdict.ok) return ancestorVerdict;
    real = join(parentReal, ...descent);
  }

  const verdict = evaluateResolvedPath(real, options);
  if (!verdict.ok) return verdict;
  // Preserve the native E7 ancestor boundary before any directory mutation.
  // Moving an owner/ancestor must not relocate protected files or symlinks and
  // cause a path-based guard to lose their ownership on the next request.
  try { assertPublicMutationPath(real); }
  catch { return { ok: false, reason: 'sensitive-native-config' }; }
  try { nativeStatePolicy.assertMutationPath(real); }
  catch { return { ok: false, reason: 'sensitive-native-history' }; }


  const realNorm = norm(real);

  // Write-only: deny a sensitive-PREFIX directory itself (~/.ssh, ~/.aws, …), not
  // just its contents. The read policy only matches children (startsWith withSep),
  // so renaming the directory to a benign name would expose the whole prefix's
  // contents. Renaming/deleting the dir root is refused here. (Only meaningful
  // outside the project root, matching the prefix rule's own scope.)
  const projectRoot = getProjectRoot(options.cwd);
  if (!isInsideRoot(real, projectRoot)) {
    for (const prefix of SENSITIVE_PATH_PREFIXES) {
      if (realNorm === norm(realOrResolved(prefix))) return { ok: false, reason: 'sensitive-prefix' };
    }
  }

  return { ok: true, real };
}

export function reasonToStatus(reason) {
  if (reason === 'realpath-failed') return 404;
  if (reason === 'invalid' || reason === 'null-byte') return 400;
  return 403;
}
