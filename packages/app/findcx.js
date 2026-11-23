import { resolve, join, win32, posix, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { execSync, execFileSync } from 'node:child_process';
import { threadId } from 'node:worker_threads';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ============ 配置区（第三方适配只需修改此处）============

function resolveLogDir() {
  const envDir = process.env.CXV_LOG_DIR;
  if (typeof envDir === 'string' && envDir.trim()) {
    const raw = envDir.trim();
    // 允许通过 'tmp' 或 'temp' 关键字使用系统临时目录（常用于测试）
    if (raw === 'tmp' || raw === 'temp') {
      return join(tmpdir(), 'cx-viewer-test', `${process.pid}-${threadId}`);
    }
    const expanded = raw.startsWith('~/') ? join(homedir(), raw.slice(2)) : raw;
    return resolve(expanded);
  }
  return join(homedir(), '.codex', 'cx-viewer');
}

// 日志存储根目录（所有项目日志、偏好设置均存放于此）
// 使用 let 以支持运行时通过 setLogDir() 修改（ES module live binding）
export let LOG_DIR = resolveLogDir();

export function getCodexConfigDir() {
  return join(homedir(), '.codex');
}

/**
 * 运行时修改日志存储根目录。
 * 支持 ~/... 展开。所有通过 `import { LOG_DIR }` 引用的模块会自动看到新值。
 */
export function setLogDir(dir) {
  if (!dir || typeof dir !== 'string') return;
  const raw = dir.trim();
  if (!raw) return;
  const resolved = resolve(raw.startsWith('~/') ? join(homedir(), raw.slice(2)) : raw);
  // 安全：限制在 home 目录或 /tmp 下，防止写入系统目录
  const home = homedir();
  if (!resolved.startsWith(home) && !resolved.startsWith('/tmp/')) return;
  LOG_DIR = resolved;
}

// npm 包名候选列表（按优先级排列）
export const PACKAGES = ['@openai/codex'];

// npm 包内的入口文件（相对于包根目录）
export const CLI_ENTRY = 'cli.js';
export const NPM_LAUNCHER_ENTRIES = ['bin/codex.js', CLI_ENTRY];

// native 二进制候选路径（~ 会在运行时展开为 homedir()）
const NATIVE_CANDIDATES = [
  '~/.codex/local/codex',
  '/usr/local/bin/codex',
  '~/.local/bin/codex',
  '/opt/homebrew/bin/codex',
];

// 用于 which/command -v 查找的命令名
export const BINARY_NAME = 'codex';

// 注入到 cli.js 的 import 语句（相对路径，基于 cli.js 所在位置）
export const INJECT_IMPORT = "import '../../cx-viewer/interceptor.js';";

// ============ 导出函数 ============

export function buildNpmRootCommand(platform = process.platform, env = process.env) {
  if (platform === 'win32') {
    return {
      cmd: env.COMSPEC || 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm root -g'],
      // cmd.exe must receive `npm root -g` as one token; Node's default quoting
      // would wrap it in quotes that cmd then fails to parse.
      windowsVerbatimArguments: true,
    };
  }
  return { cmd: 'npm', args: ['root', '-g'], windowsVerbatimArguments: false };
}

// npm may prepend warnings (funding/update notices) to stdout; the resolved path
// is the last non-empty line. Exported for unit tests.
export function parseNpmRootOutput(raw) {
  const lines = String(raw ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : null;
}

export function getGlobalNodeModulesDir() {
  const { cmd, args, windowsVerbatimArguments } = buildNpmRootCommand();
  try {
    const out = execFileSync(cmd, args, {
      encoding: 'utf-8',
      windowsHide: true,
      // npm on Windows (cmd.exe + Defender) is routinely slower than 2s; a
      // premature timeout was itself a source of "claude not found".
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsVerbatimArguments,
    });
    const dir = parseNpmRootOutput(out);
    if (dir && existsSync(dir)) return dir;
    return dir || inferGlobalNodeModulesDir();
  } catch {
    // npm missing, not on PATH, or slower than the timeout — fall back to the
    // well-known layouts so discovery still works without ever running npm.
    return inferGlobalNodeModulesDir();
  }
}

// Ordered candidate list for the npm-free global-root fallback. Pure (no fs
// access) and parameterized so tests can assert the win32 ordering off-Windows.
export function globalNodeModulesCandidates(platform = process.platform, env = process.env, home = homedir()) {
  // Use the target platform's separator even when tests run on another host.
  const pj = platform === 'win32' ? win32.join : posix.join;
  const candidates = [];
  const prefix = env.NPM_CONFIG_PREFIX || env.npm_config_prefix;
  if (prefix) {
    // Windows installs land directly in <prefix>/node_modules; POSIX adds lib/.
    candidates.push(pj(prefix, 'node_modules'), pj(prefix, 'lib', 'node_modules'));
  }
  if (platform === 'win32') {
    // The default `npm i -g` target for the official Node installer.
    if (env.APPDATA) candidates.push(pj(env.APPDATA, 'npm', 'node_modules'));
    if (env.ProgramFiles) candidates.push(pj(env.ProgramFiles, 'nodejs', 'node_modules'));
    if (env.LOCALAPPDATA) {
      candidates.push(pj(env.LOCALAPPDATA, 'nvm', 'node_modules'));
      candidates.push(pj(env.LOCALAPPDATA, 'Volta', 'tools', 'image', 'node_modules'));
    }
  } else {
    candidates.push(
      pj(home, '.npm-global', 'lib', 'node_modules'),
      '/usr/local/lib/node_modules',
      '/opt/homebrew/lib/node_modules',
      pj(home, '.volta', 'tools', 'image', 'node_modules'),
    );
  }
  // The dir holding cc-viewer itself IS a global node_modules when ccv was
  // installed with `npm i -g` — a reliable last resort on any platform.
  const packageParent = resolve(__dirname, '..');
  if (basename(packageParent) === 'node_modules') candidates.push(packageParent);
  return candidates.filter(Boolean);
}

// npm-free fallback for the global node_modules root. `npm root -g` can fail for
// reasons that have nothing to do with whether Claude Code is installed (npm not
// on a GUI process's PATH, a corporate shim that is slow to start, EINVAL as
// above). These are the canonical global prefixes; the first one that exists wins.
// L7: these are absolute machine paths that ignore PATH/HOME isolation exactly
// like the raw NATIVE_CANDIDATES — blocked under test context, where `npm root -g`
// (real or fixture) remains the only sanctioned seam.
export function inferGlobalNodeModulesDir() {
  if (process.env.NODE_TEST_CONTEXT || process.env.CXV_TEST === '1') return null;
  for (const dir of globalNodeModulesCandidates()) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

export function resolveCliPath() {
  // 候选基础目录：__dirname 的上级（适用于常规 npm 安装）+ 全局 node_modules（适用于符号链接安装）
  const baseDirs = [resolve(__dirname, '..')];
  const globalRoot = getGlobalNodeModulesDir();
  if (globalRoot && globalRoot !== resolve(__dirname, '..')) {
    baseDirs.push(globalRoot);
  }

  for (const baseDir of baseDirs) {
    for (const packageName of PACKAGES) {
      const candidate = join(baseDir, packageName, CLI_ENTRY);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  // 兜底：返回全局目录下的默认路径，便于错误提示
  return join(globalRoot || resolve(__dirname, '..'), PACKAGES[0], CLI_ENTRY);
}

/**
 * 查找 npm 版本的 codex（包括 nvm 安装）
 * 返回 node_modules 中的 codex cli.js 路径
 */
export function resolveNpmCodexPath() {
  // 1. 尝试查找 npm 安装的 codex
  // whence -p (zsh) / type -P (bash) 可绕过 shell function，直接返回二进制路径
  // 需要用对应 shell 执行，因为 execSync shell:true 默认用 /bin/sh
  const userShell = process.env.SHELL || '';
  const bypassCmds = [];
  if (userShell.includes('zsh')) bypassCmds.push({ cmd: `whence -p ${BINARY_NAME}`, shell: userShell });
  if (existsSync('/bin/bash')) bypassCmds.push({ cmd: `type -P ${BINARY_NAME}`, shell: '/bin/bash' });
  const fallbackCmds = [`which ${BINARY_NAME}`, `command -v ${BINARY_NAME}`].map(c => ({ cmd: c, shell: true }));
  for (const { cmd, shell } of [...bypassCmds, ...fallbackCmds]) {
    try {
      const result = execSync(cmd, { encoding: 'utf-8', shell, env: process.env }).trim();
      // 排除 shell function 的输出（多行说明不是路径）
      if (result && !result.includes('\n') && existsSync(result)) {
        // 只接受 npm 安装的符号链接（解析后指向 node_modules）
        try {
          const real = realpathSync(result);
          if (real.includes('node_modules')) {
            // 找到 npm 版本，优先返回 cli.js，否则返回实际二进制路径
            const match = real.match(/(.*node_modules\/@[^/]+\/[^/]+)\//);
            if (match) {
              const packageDir = match[1];
              for (const entry of NPM_LAUNCHER_ENTRIES) {
                const entryPath = join(packageDir, entry);
                if (existsSync(entryPath)) {
                  return entryPath;
                }
              }
            }
            // cli.js 不存在（新版 codex），直接返回二进制路径
            return result;
          }
        } catch { }
      }
    } catch {
      // ignore
    }
  }

  // 2. 尝试从全局 node_modules 查找
  const globalRoot = getGlobalNodeModulesDir();
  if (globalRoot) {
    for (const packageName of PACKAGES) {
      for (const entry of NPM_LAUNCHER_ENTRIES) {
        const entryPath = join(globalRoot, packageName, entry);
        if (existsSync(entryPath)) {
          return entryPath;
        }
      }
    }
  }

  return null;
}

export function pickSpawnableLookupResult(rawOut, platform = process.platform) {
  const lines = String(rawOut || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (platform === 'win32') return lines.find((l) => l.toLowerCase().endsWith('.exe')) || null;
  return lines[0] || null;
}

export function resolveNativePath() {
  // 1. 尝试查找 native codex（继承当前 process.env PATH）
  // whence -p (zsh) / type -P (bash) 可绕过 shell function，直接返回二进制路径
  const nativeUserShell = process.env.SHELL || '';
  const nativeBypassCmds = [];
  if (nativeUserShell.includes('zsh')) nativeBypassCmds.push({ cmd: `whence -p ${BINARY_NAME}`, shell: nativeUserShell });
  if (existsSync('/bin/bash')) nativeBypassCmds.push({ cmd: `type -P ${BINARY_NAME}`, shell: '/bin/bash' });
  const nativeFallbackCmds = (process.platform === 'win32' ? [`where ${BINARY_NAME}`] : [`which ${BINARY_NAME}`, `command -v ${BINARY_NAME}`]).map(c => ({ cmd: c, shell: true }));
  for (const { cmd, shell } of (process.platform === 'win32' ? nativeFallbackCmds : [...nativeBypassCmds, ...nativeFallbackCmds])) {
    try {
      const raw = execSync(cmd, { encoding: 'utf-8', shell, env: process.env, windowsHide: true });
      const result = process.platform === 'win32' ? pickSpawnableLookupResult(raw) : raw.trim();
      if (result && !result.includes('\n') && existsSync(result)) {
        // JavaScript launchers need Node; native binaries can live in node_modules.
        try {
          const real = realpathSync(result);
          if (real.includes('node_modules') && /\.(?:js|cjs|mjs)$/i.test(real)) continue;
        } catch { }
        return result;
      }
    } catch {
      // ignore
    }
  }

  // 2. 检查常见 native 安装路径
  const home = homedir();
  const nativeCandidates = process.env.NODE_TEST_CONTEXT || process.env.CXV_TEST === '1'
    ? NATIVE_CANDIDATES.filter(p => p.startsWith('~/.codex/')) : NATIVE_CANDIDATES;
  const candidates = nativeCandidates.map(p =>
    p.startsWith('~') ? join(home, p.slice(2)) : p
  );
  for (const p of candidates) {
    if (process.platform === 'win32') {
      if (existsSync(p + '.exe')) return p + '.exe';
    } else if (existsSync(p)) return p;
  }

  return null;
}

export function buildShellCandidates() {
  const globalRoot = getGlobalNodeModulesDir();
  // 使用 $HOME 而非硬编码绝对路径，保证 shell 可移植性
  const dirs = [];
  if (globalRoot) {
    // 将绝对路径中的 homedir 替换为 $HOME
    const home = homedir();
    const shellRoot = globalRoot.startsWith(home)
      ? '$HOME' + globalRoot.slice(home.length)
      : globalRoot;
    for (const pkg of PACKAGES) {
      dirs.push(`"${shellRoot}/${pkg}/${CLI_ENTRY}"`);
    }
  }
  return dirs.join(' ');
}
