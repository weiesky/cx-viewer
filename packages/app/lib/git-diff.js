import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Windows：从无控制台的 worker node.exe 启动 git.exe 会弹可见控制台窗口，
// 包装层统一默认 windowsHide（POSIX no-op），覆盖本文件全部 git 调用。
const _execFileAsyncRaw = promisify(execFile);
export const execFileAsync = (cmd, args, opts) => _execFileAsyncRaw(cmd, args, { windowsHide: true, ...opts });

// Original a30d8c92 per-invocation budget; keep the existing 8s log budget.
const GIT_TIMEOUT_MS = 10000;

// Reject only `..` as a path *segment* (start, between slashes, or end),
// including Windows backslash variants. Substring match
// (`'node..modules'.includes('..')`) was rejecting valid paths.
export const PATH_TRAVERSAL = /(?:^|[\/\\])\.\.(?:[\/\\]|$)/;

// 工作区/commit 模式统一的大文件阈值（字节）。
export const MAX_DIFF_FILE_BYTES = 5 * 1024 * 1024;

/**
 * 相对路径安全校验：拒绝路径穿越（含 Windows 反斜杠变体）、绝对路径与盘符。
 * git-restore 与 git-diff 共用，避免两侧安全规则分叉。
 * @param {string} file
 * @returns {boolean}
 */
export function isSafeRelativePath(file) {
  return typeof file === 'string' &&
    file.length > 0 && file.length <= 4096 &&
    !PATH_TRAVERSAL.test(file) &&
    !file.startsWith('/') &&
    !file.startsWith('\\') &&
    !/^[A-Za-z]:/.test(file) &&
    !/[*?[\]{}()!]/.test(file) &&      // reject glob wildcards and exclusion patterns
    !/[:|]/.test(file) &&              // reject pathspec magic prefixes like :(top)
    !/[\x00-\x1f\x7f]/.test(file);     // reject control characters
}

// Whitelist for git ref names returned by `git rev-parse --abbrev-ref @{u}`.
// Defense in depth: git-rev-parse output should never contain shell metacharacters,
// but we validate before passing to `git log <upstream>..HEAD`.
const SAFE_REF = /^[A-Za-z0-9_.\/-]+$/;

// Decode git's octal-quoted non-ASCII filenames from --name-status output.
// With core.quotePath=true (default), git emits paths like "\344\270\255\346\226\207.txt".
// This mirrors the decoder in server.js git-status handler.
function decodeQuotedPath(fp) {
  if (fp.startsWith('"') && fp.endsWith('"')) {
    fp = fp.slice(1, -1)
      .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\t/g, '\t').replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\').replace(/\\"/g, '"');
    return Buffer.from(fp, 'latin1').toString('utf8');
  }
  return fp;
}

// git log --name-status 对 rename/copy 输出 "R100\told\tnew"（两 tab 三列）；
// 取最后一个 tab 后的新路径，避免文件名带真实 tab 的脏数据。
function nameStatusParts(st, line, tab) {
  let file = line.substring(tab + 1);
  let oldPath = null;
  if ((st[0] === 'R' || st[0] === 'C') && file.includes('\t')) {
    const lastTab = file.lastIndexOf('\t');
    oldPath = file.substring(0, lastTab);
    file = file.substring(lastTab + 1);
  }
  // Decode octal-quoted non-ASCII paths from --name-status output.
  // With core.quotePath=true (default), git emits paths like "\344\270\255\346\226\207.txt".
  return { file: decodeQuotedPath(file), oldPath: oldPath ? decodeQuotedPath(oldPath) : null };
}

function nameStatusPath(st, line, tab) {
  return nameStatusParts(st, line, tab).file;
}

/**
 * Get local commits not yet pushed, between upstream and HEAD when an upstream
 * is configured (`<upstream>..HEAD`), otherwise every HEAD commit absent from
 * all remote-tracking refs (`git log HEAD --not --remotes`). The fallback keeps
 * commits on branches without an upstream visible instead of silently dropping
 * them. Returns an empty list when HEAD cannot be resolved (unborn branch) or
 * the log command fails.
 *
 * Each commit includes its changed files (with real A/M/D/R status) plus per-commit
 * insertions/deletions. A single `git log --numstat` would give stats but no status,
 * and rename lines would carry a pseudo-path (`src/{a.js => b.js}`), so the file list
 * still comes from one `git log --name-status` call and the stats from a second
 * `git log --numstat` call, joined by commit hash. Passing `--no-renames` to both
 * keeps rename entries as plain A + D real paths instead.
 *
 * @param {string} cwd
 * @param {object} [opts]
 * @param {number} [opts.maxCommits=100] hard cap to keep payload bounded
 * @returns {Promise<{ commits: Array, hasUpstream: boolean, branch: string|null, upstream: string|null, truncated?: boolean, totalCount?: number }>}
 */
export async function getUnpushedCommits(cwd, { maxCommits = 100 } = {}) {
  let branch = null;
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS });
    branch = stdout.trim();
  } catch {
    return { commits: [], hasUpstream: false, branch: null, upstream: null };
  }
  // Detached HEAD prints "HEAD" — treat like a branch without upstream below.
  const detached = !branch || branch === 'HEAD';

  let upstream = null;
  if (!detached) {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS });
      const name = stdout.trim();
      if (name && SAFE_REF.test(name) && !name.includes('..')) upstream = name;
    } catch { /* no upstream configured — fall through to the remote-refs fallback */ }
  }

  // With an upstream: commits ahead of it. Otherwise (no upstream, invalid
  // upstream name, detached HEAD): commits on HEAD not reachable from any
  // remote-tracking ref. Argument order matters — `--not` flips every revision
  // listed after it, including HEAD itself, so it must be
  // ['HEAD', '--not', '--remotes'], never ['--not', '--remotes', 'HEAD'].
  const rangeArgs = upstream ? [`${upstream}..HEAD`] : ['HEAD', '--not', '--remotes'];
  const hasUpstream = !!upstream;
  const resultBranch = detached ? null : branch;

  // Use unit separators between fields and a sentinel between commits to avoid
  // getting fooled by tabs/newlines inside commit subjects.
  // Format: <hash>\x1f<author>\x1f<date>\x1f<subject>\n
  // name-status pass: one `<status>\t<path>` line per file (R###\told\tnew for
  // renames). numstat pass: one `<added>\t<removed>\t<path>` line per file
  // (binary files report `-\t-\t<path>`). Commits separated by `\x1e`.
  // `--no-renames` turns renames into plain A + D entries so every path is real.
  const COMMIT_SEP = '\x1e';
  const FIELD_SEP = '\x1f';
  const prettyArg = `--pretty=format:${COMMIT_SEP}%H${FIELD_SEP}%an${FIELD_SEP}%aI${FIELD_SEP}%s`;
  const logArgs = ['log', `--max-count=${maxCommits}`, '--no-renames'];
  const execOpts = { cwd, encoding: 'utf-8', timeout: 8000, maxBuffer: 10 * 1024 * 1024 };
  let nameStatusOut = '';
  let numstatOut = '';
  try {
    const r = await execFileAsync('git', [...logArgs, prettyArg, '--name-status', ...rangeArgs], execOpts);
    nameStatusOut = r.stdout;
  } catch {
    return { commits: [], hasUpstream, branch: resultBranch, upstream, truncated: false, totalCount: 0, logError: true };
  }
  try {
    const r = await execFileAsync('git', [...logArgs, prettyArg, '--numstat', ...rangeArgs], execOpts);
    numstatOut = r.stdout;
  } catch {
    numstatOut = ''; // stats are best-effort — keep the file list even if numstat fails
  }

  // Sum per-commit line stats from the numstat pass, keyed by full hash.
  const statsByHash = new Map();
  for (const block of numstatOut.split(COMMIT_SEP)) {
    if (!block) continue;
    const lines = block.split(/\r?\n/);
    const parts = (lines[0] || '').split(FIELD_SEP);
    if (parts.length < 4) continue;
    let insertions = 0;
    let deletions = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.length < 3) continue;
      insertions += parseInt(cols[0], 10) || 0; // binary '-' → NaN → 0
      deletions += parseInt(cols[1], 10) || 0;
    }
    statsByHash.set(parts[0], { insertions, deletions });
  }

  const commits = [];
  const blocks = nameStatusOut.split(COMMIT_SEP).filter(Boolean);
  for (const block of blocks) {
    // git on Windows 在 piped 模式输出 CRLF；split('\n') 会让 fp 末尾带 \r，前端文件名乱码。
    const lines = block.split(/\r?\n/);
    const header = lines[0] || '';
    const parts = header.split(FIELD_SEP);
    if (parts.length < 4) continue;
    const [hash, author, date, subject] = parts;
    const files = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const tab = line.indexOf('\t');
      if (tab < 0) continue;
      const st = line.substring(0, tab).trim();
      // name-status rename rows carry two paths (old\tnew); with --no-renames
      // they should not appear, but keep the new path if one ever slips through.
      const fp = nameStatusPath(st, line, tab);
      if (!fp) continue;
      files.push({ status: st[0] || 'M', file: fp });
    }
    const stats = statsByHash.get(hash) || { insertions: 0, deletions: 0 };
    commits.push({
      hash,
      shortHash: hash.substring(0, 7),
      author,
      date,
      subject,
      files,
      insertions: stats.insertions,
      deletions: stats.deletions,
    });
  }

  // Detect truncation. 默认 truncated = (commits.length === maxCommits)，因为命中 cap 大概率
  // 是被截了；rev-list --count 成功才用真实数据覆盖。这样如果 rev-list 失败/超时（大 repo
  // 可能 >3s），用户至少能看到截断标记，不会被静默隐藏 200 条未推送 commit。
  let totalCount = commits.length;
  let truncated = commits.length === maxCommits;
  if (truncated) {
    try {
      const r = await execFileAsync('git', ['rev-list', '--count', ...rangeArgs], { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS });
      const parsed = parseInt(r.stdout.trim(), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        totalCount = parsed;
        truncated = totalCount > commits.length;
      }
    } catch {}
  }

  return { commits, hasUpstream, branch: resultBranch, upstream, truncated, totalCount };
}

/**
 * Validate git commit hash. Accept 7..40 hex chars only.
 * Rejects refs like "HEAD~1", branch names, anything with shell metacharacters.
 * @param {string} hash
 * @returns {boolean}
 */
export function isValidCommitHash(hash) {
  return typeof hash === 'string' && /^[0-9a-f]{7,40}$/i.test(hash);
}

/**
 * 读取 git blob 大小（字节）。读取失败返回 null，由调用方按「未知」处理。
 * @param {string} cwd
 * @param {string} ref - git cat-file -s 接受的 ref（如 <hash>:<path>）
 * @returns {Promise<number|null>}
 */
async function gitBlobSize(cwd, ref) {
  try {
    const { stdout } = await execFileAsync('git', ['cat-file', '-s', ref], { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS });
    const size = parseInt(stdout.trim(), 10);
    return Number.isFinite(size) && size >= 0 ? size : null;
  } catch {
    return null;
  }
}

/**
 * 统一读取 git blob：先 cat-file -s 预检大小，再 git show 取内容。
 * 避免 maxBuffer 把大文件内容静默吞成空串；gitBlobSize 失败时保守标记 is_large。
 * @param {string} cwd
 * @param {string} ref - git show 接受的 ref（如 <hash>:<path> / HEAD:<path>）
 * @returns {Promise<{content: string}|{is_large: true, size: number}>}
 */
async function readGitBlob(cwd, ref) {
  const size = await gitBlobSize(cwd, ref);
  if (size === null || size > MAX_DIFF_FILE_BYTES) {
    return { is_large: true, size: size || 0 };
  }
  try {
    const { stdout } = await execFileAsync('git', ['show', ref], { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS, maxBuffer: MAX_DIFF_FILE_BYTES + 1024 * 1024 });
    // 读后复核字节数（utf-8 解码可能膨胀，如无效 UTF-8 → U+FFFD）
    if (Buffer.byteLength(stdout, 'utf-8') > MAX_DIFF_FILE_BYTES) {
      return { is_large: true, size: Buffer.byteLength(stdout, 'utf-8') };
    }
    return { content: stdout };
  } catch (err) {
    // git show 失败（ref 不存在等）—— 空内容会显示为「纯新增」，必须留痕
    console.warn('[git-diff] git show failed for %s: %s', ref, err?.message || err);
    return { content: '' };
  }
}

/**
 * Get git diffs for a list of files.
 * When commitHash is provided, diffs come from `git show <hash>` (parent vs hash);
 * otherwise from working tree vs HEAD (default behavior).
 *
 * @param {string} cwd - working directory (git repo root)
 * @param {string[]} files - relative file paths
 * @param {string} [commitHash] - optional commit SHA to diff against its first parent
 * @param {boolean} [isMerge=false] - pass true for merge commits so diff-tree uses -m --first-parent
 * @returns {Promise<Array>} diffs array
 */
export async function getGitDiffs(cwd, files, commitHash, isMerge = false) {
  const useCommit = commitHash && isValidCommitHash(commitHash);
  const diffs = [];
  // 惰性构建的工作区 rename 映射（newPath → oldPath），仅在出现 'A' 状态文件时创建
  let worktreeRenameMap = null;

  // For commit-context diffs, get the per-file status table once instead of per file.
  // `-M` 让 rename 显示为 R/C 而非 D+A；否则旧内容会从「新路径的父提交版本」读取而丢失。
  let commitStatusMap = null;
  if (useCommit) {
    try {
      // -m --first-parent is a no-op on non-merge commits and allows diff-tree
      // to produce output for merge commits (otherwise empty).
      const dtArgs = ['diff-tree', '-r', '-M', '--no-commit-id', '--name-status', '--root'];
      if (isMerge) dtArgs.push('-m', '--first-parent');
      dtArgs.push(commitHash);
      const { stdout } = await execFileAsync(
        'git',
        dtArgs,
        { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS, maxBuffer: MAX_DIFF_FILE_BYTES }
      );
      commitStatusMap = new Map();
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const tab = line.indexOf('\t');
        if (tab < 0) continue;
        const st = line.substring(0, tab).trim();
        const { file: fp, oldPath } = nameStatusParts(st, line, tab);
        commitStatusMap.set(fp, { status: st[0] || 'M', oldPath });
        // The commit list uses --no-renames (A + D). Preserve the existing
        // new-path rename comparison while allowing its deleted source to open.
        if (st[0] === 'R' && oldPath) commitStatusMap.set(oldPath, { status: 'D', oldPath: null });
      }
    } catch (err) {
      // commit 已被 server 层验证存在，此处失败意味着真实异常（权限/仓库损坏）
      console.warn('[git-diff] diff-tree failed for %s: %s', commitHash, err?.message || err);
      commitStatusMap = new Map();
    }
  }

  for (const file of files) {
    // 安全检查：防止路径穿越
    if (!isSafeRelativePath(file)) continue;

    try {
      let status;
      let is_new;
      let is_deleted;
      let worktreeOldPath = null;

      if (useCommit) {
        const entry = commitStatusMap.get(file);
        // 文件不在该 commit 的变更列表中时跳过，避免产生内容为空的「幽灵 M」diff
        if (!entry) continue;
        status = entry.status;
        is_new = status === 'A';
        is_deleted = status === 'D';
      } else {
        const { stdout: statusOutput } = await execFileAsync('git', ['status', '--porcelain', '--', file], { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS });
        if (!statusOutput.trim()) continue;
        status = statusOutput.substring(0, 2).trim();
        is_new = status === 'A' || status === '??';
        is_deleted = status === 'D';

        // 工作区 rename：`git status --porcelain -- <newpath>` 会把 rename 显示成 'A'
        // （pathspec 聚焦新路径），旧路径信息丢失。用全量 `git diff -M --name-status HEAD`
        // 惰性构建 rename 映射来识别（含 staged `git mv` 与 unstaged rename）。
        if (status === 'A') {
          if (worktreeRenameMap === null) {
            worktreeRenameMap = new Map();
            try {
              const { stdout: renameOut } = await execFileAsync('git', ['diff', '-M', '--name-status', 'HEAD'], { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS, maxBuffer: MAX_DIFF_FILE_BYTES });
              for (const line of renameOut.split(/\r?\n/)) {
                if (!line.trim()) continue;
                const tab = line.indexOf('\t');
                if (tab < 0) continue;
                const st = line.substring(0, tab).trim();
                if (st[0] !== 'R') continue;
                const { file: fp, oldPath } = nameStatusParts(st, line, tab);
                if (oldPath) worktreeRenameMap.set(fp, oldPath);
              }
            } catch {}
          }
          const oldPath = worktreeRenameMap.get(file);
          if (oldPath) {
            status = 'R';
            is_new = false;
            worktreeOldPath = oldPath;
          }
        }
      }

      // 检查是否为二进制文件（已删除文件跳过）
      let is_binary = false;
      if (!is_deleted) {
        try {
          const numstatArgs = useCommit
            ? (isMerge
                ? ['diff-tree', '-r', '-m', '--first-parent', '--no-commit-id', '--numstat', '--root', commitHash, '--', file]
                : ['diff-tree', '-r', '--no-commit-id', '--numstat', '--root', commitHash, '--', file])
            : ['diff', '--numstat', 'HEAD', '--', file];
          const { stdout: diffCheck } = await execFileAsync('git', numstatArgs, { cwd, encoding: 'utf-8', timeout: GIT_TIMEOUT_MS });
          if (diffCheck.includes('-\t-\t')) {
            is_binary = true;
          }
        } catch {}
      }

      let old_content = '';
      let new_content = '';

      if (!is_binary) {
        // 获取旧内容（rename 时 HEAD/父提交中是旧路径）
        if (!is_new) {
          const oldPath = useCommit
            ? (commitStatusMap.get(file)?.oldPath || file)
            : (worktreeOldPath || file);
          const oldRef = useCommit ? `${commitHash}^:${oldPath}` : `HEAD:${oldPath}`;
          const oldResult = await readGitBlob(cwd, oldRef);
          if (oldResult.is_large) {
            diffs.push({ file, status, is_large: true, size: oldResult.size, ...(useCommit ? {} : { note: 'HEAD blob oversized or unknown' }) });
            continue;
          }
          old_content = oldResult.content;
        }

        // 获取新内容
        if (!is_deleted) {
          if (useCommit) {
            const newRef = `${commitHash}:${file}`;
            const newResult = await readGitBlob(cwd, newRef);
            if (newResult.is_large) {
              diffs.push({ file, status, is_large: true, size: newResult.size });
              continue;
            }
            new_content = newResult.content;
          } else {
            try {
              const filePath = join(cwd, file);
              if (existsSync(filePath)) {
                const stat = statSync(filePath);
                // 跳过目录和非常规文件，避免 readFileSync(EISDIR) 或幽灵 diff entry
                if (!stat.isFile()) continue;
                if (stat.size > MAX_DIFF_FILE_BYTES) {
                  // 文件过大
                  diffs.push({ file, status, is_large: true, size: stat.size });
                  continue;
                }
                new_content = readFileSync(filePath, 'utf-8');
              }
            } catch {
              new_content = '';
            }
          }
        }

        // 统一换行符，避免 Windows CRLF 与 Git LF 差异导致整文件被标记为变更
        old_content = old_content.replace(/\r\n/g, '\n');
        new_content = new_content.replace(/\r\n/g, '\n');
      }

      diffs.push({
        file,
        status,
        old_content,
        new_content,
        is_binary,
        is_new,
        is_deleted
      });
    } catch (err) {
      // 跳过无法处理的文件，但留痕便于排查（此前空内容 bug 被静默 catch 掩盖）
      console.warn('[git-diff] skipped file %s: %s', file, err?.message || err);
      continue;
    }
  }

  return diffs;
}
