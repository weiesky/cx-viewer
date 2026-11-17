#!/usr/bin/env node
/**
 * Guard: reject raw C0 control bytes (except TAB / LF / CR) and DEL in tracked text source.
 *
 * Why this exists: a single stray control byte — most notably NUL (0x00) — makes the ENTIRE file
 * be classified as "binary" by grep/ripgrep (so `grep -I` / `rg` silently skip it), by editor
 * global-search, and by code-review diff tools. A file can then become invisible to search while
 * looking completely normal when opened. We hit exactly this: a NUL used as a delimiter in
 * `ChatView.jsx` hid the whole file from grep for an entire debugging session.
 *
 * The fix is free: write control characters as escapes in the source (e.g. `\x00`, `\x01`, `\x1b`).
 * The JS parser turns the escape into the same byte at runtime, so behaviour is byte-identical,
 * but the source file stays pure text and remains searchable by every tool.
 *
 * Scans git-tracked files with a code/text extension; skips build output and binary assets.
 * If git is unavailable or this is not a git work tree (extracted tarball, clean-room CI), the
 * check skips gracefully (exit 0) rather than breaking `npm test`.
 * Exit 0 = clean (or skipped), exit 1 = violations (printed as path:line:col (offset) + byte).
 *
 * Invoked as a pretest hook via package.json "pretest" to ensure the codebase stays
 * grep-friendly.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Only scan real source / docs / config. Binary assets (mp3, png, icns, fonts, …) are excluded by
// simply not being on this list, so we never false-positive on legitimately-binary files.
export const TEXT_EXT = new Set([
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx',
  'css', 'scss', 'less',
  'json', 'jsonc', 'html', 'htm',
  'md', 'markdown', 'txt',
  'sh', 'bash', 'zsh',
  'yml', 'yaml', 'vue',
]);

// Build output / generated dirs are not source — don't scan them.
export const SKIP_PREFIX = ['dist/', 'build/', 'node_modules/'];

// Allowed control bytes: TAB (0x09), LF (0x0a), CR (0x0d). Forbidden: every other C0 byte + DEL.
export const isForbidden = (b) =>
  b <= 0x08 || b === 0x0b || b === 0x0c || (b >= 0x0e && b <= 0x1f) || b === 0x7f;

export const extOf = (f) => {
  const m = f.toLowerCase().match(/\.([^./]+)$/);
  return m ? m[1] : '';
};

/**
 * @returns {string[]|null} source text files to scan (tracked + untracked-but-not-ignored),
 *   or null if not a git work tree / git missing.
 */
export function listScannableTextFiles() {
  let tracked, untracked;
  try {
    tracked = execSync('git ls-files', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    // Also scan untracked-but-not-ignored files: a stray control byte is almost always introduced
    // in a NEW or freshly-edited file, and `git ls-files` (tracked only) would skip it until the
    // file is `git add`-ed — exactly the case this guard most needs to catch.
    untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // git unavailable or not inside a git work tree
  }
  const all = (tracked + '\n' + untracked).split('\n').filter(Boolean);
  return [...new Set(all)]
    .filter((f) => !SKIP_PREFIX.some((p) => f.startsWith(p)))
    .filter((f) => TEXT_EXT.has(extOf(f)));
}

/**
 * @returns {{line:number, col:number, offset:number, byte:number}[]} forbidden-byte hits in a file.
 */
export function scanFile(path) {
  let buf;
  try {
    buf = readFileSync(path);
  } catch {
    return [];
  }
  const hits = [];
  let line = 1;
  let col = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0x0a) {
      line++;
      col = 0;
      continue;
    }
    col++;
    if (isForbidden(b)) hits.push({ line, col, offset: i, byte: b });
  }
  return hits;
}

function main() {
  const files = listScannableTextFiles();
  if (files === null) {
    console.warn('⚠ check-no-control-bytes: not a git work tree / git unavailable — skipping.');
    process.exit(0);
  }

  const violations = [];
  for (const f of files) {
    for (const h of scanFile(f)) {
      const hex = h.byte.toString(16).padStart(2, '0').toUpperCase();
      violations.push(`${f}:${h.line}:${h.col} (offset ${h.offset}) raw byte 0x${hex}`);
    }
  }

  if (violations.length > 0) {
    console.error('✗ raw control byte(s) found in tracked source:');
    for (const v of violations) console.error('  ' + v);
    console.error(
      `\n${violations.length} violation(s). A NUL/control byte makes the file be treated as binary ` +
        `(grep -I / ripgrep / editor search will silently skip it).\n` +
        `Write the character as an escape instead — e.g. \\x00, \\x01, \\x1b — same runtime value, searchable source.`,
    );
    process.exit(1);
  }

  console.log(`✓ no raw control bytes in ${files.length} tracked text files`);
}

// Run the check only when invoked directly (e.g. `node scripts/check-no-control-bytes.js`),
// so unit tests can import the helpers above without triggering the scan / process.exit.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}
