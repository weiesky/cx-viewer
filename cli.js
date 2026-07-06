#!/usr/bin/env node

// 阻止 server.js 自动启动（必须在任何导入之前设置）
process.env.CXV_WORKSPACE_MODE = '1';

import { readFileSync, writeFileSync, existsSync, realpathSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { t } from './i18n.js';
import { INJECT_IMPORT, resolveCliPath, resolveNativePath, resolveNpmCodexPath, buildShellCandidates } from './findcx.js';
import { normalizeCodexArgs, hasBypassPermissions } from './lib/cli-args.js';
import { ensureHooks } from './lib/ensure-hooks.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const INJECT_START = '// >>> Start CX Viewer Web Service >>>';
const INJECT_END = '// <<< Start CX Viewer Web Service <<<';
const INJECT_BLOCK = `${INJECT_START}\n${INJECT_IMPORT}\n${INJECT_END}`;


const SHELL_HOOK_START = '# >>> CX-Viewer Auto-Inject >>>';
const SHELL_HOOK_END = '# <<< CX-Viewer Auto-Inject <<<';

const cliPath = resolveCliPath();

function getShellConfigPath() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return resolve(homedir(), '.zshrc');
  if (shell.includes('bash')) {
    const bashProfile = resolve(homedir(), '.bash_profile');
    if (process.platform === 'darwin' && existsSync(bashProfile)) return bashProfile;
    return resolve(homedir(), '.bashrc');
  }
  return resolve(homedir(), '.zshrc');
}

function buildShellHook(isNative) {
  // Commands/flags that should pass through directly without cxv interception
  // These are non-interactive commands that don't involve API calls
  const passthroughCommands = [
    // Subcommands (no API calls)
    'doctor',      // health check for auto-updater
    'install',     // install native build
    'update',      // self-update
    'upgrade',     // alias for update
    'auth',        // authentication management
    'setup-token', // token setup
    'agents',      // list configured agents
    'plugin',      // plugin management
    'plugins',     // alias for plugin
    'mcp',         // MCP server configuration
  ];

  const passthroughFlags = [
    // Version/help info
    '--version', '-v', '--v',
    '--help', '-h',
  ];

  if (isNative) {
    return `${SHELL_HOOK_START}
codex() {
  # Avoid recursion if cxv invokes codex
  if [ "$1" = "--cxv-internal" ]; then
    shift
    command codex "$@"
    return
  fi
  # Pass through certain commands directly without cxv interception
  case "$1" in
    ${passthroughCommands.join('|')})
      command codex "$@"
      return
      ;;
    ${passthroughFlags.join('|')})
      command codex "$@"
      return
      ;;
  esac
  cxv run -- codex --cxv-internal "$@"
}
${SHELL_HOOK_END}`;
  }

  const candidates = buildShellCandidates();
  return `${SHELL_HOOK_START}
codex() {
  # Pass through certain commands directly without cxv interception
  case "$1" in
    ${passthroughCommands.join('|')})
      command codex "$@"
      return
      ;;
    ${passthroughFlags.join('|')})
      command codex "$@"
      return
      ;;
  esac
  local cli_js=""
  for candidate in ${candidates}; do
    if [ -f "$candidate" ]; then
      cli_js="$candidate"
      break
    fi
  done
  if [ -n "$cli_js" ] && ! grep -q "CX Viewer" "$cli_js" 2>/dev/null; then
    cxv -logger 2>/dev/null
  fi
  command codex "$@"
}
${SHELL_HOOK_END}`;
}

function installShellHook(isNative) {
  const configPath = getShellConfigPath();
  try {
    let content = existsSync(configPath) ? readFileSync(configPath, 'utf-8') : '';

    if (content.includes(SHELL_HOOK_START)) {
      const hook = buildShellHook(isNative);
      // Extract existing hook content
      const regex = new RegExp(`${SHELL_HOOK_START}[\\s\\S]*?${SHELL_HOOK_END}`);
      const existingMatch = content.match(regex);
      if (existingMatch && existingMatch[0] === hook) {
        return { path: configPath, status: 'exists' };
      }
      // Hook content differs: remove old and reinstall
      removeShellHook();
      content = existsSync(configPath) ? readFileSync(configPath, 'utf-8') : '';
    }

    const hook = buildShellHook(isNative);
    const newContent = content.endsWith('\n') ? content + '\n' + hook + '\n' : content + '\n\n' + hook + '\n';
    writeFileSync(configPath, newContent);
    return { path: configPath, status: 'installed' };
  } catch (err) {
    return { path: configPath, status: 'error', error: err.message };
  }
}

function removeShellHook() {
  // 扫描所有可能的 shell 配置文件，清理所有遗留 hook
  const configPath = getShellConfigPath();
  const allPaths = new Set([configPath]);
  const home = homedir();
  for (const f of ['.zshrc', '.zprofile', '.bashrc', '.bash_profile', '.profile']) {
    allPaths.add(resolve(home, f));
  }
  let lastResult = { path: configPath, status: 'clean' };
  for (const p of allPaths) {
    try {
      if (!existsSync(p)) continue;
      const content = readFileSync(p, 'utf-8');
      if (!content.includes(SHELL_HOOK_START)) continue;
      const regex = new RegExp(`\\n?${SHELL_HOOK_START}[\\s\\S]*?${SHELL_HOOK_END}\\n?`, 'g');
      const newContent = content.replace(regex, '\n');
      writeFileSync(p, newContent);
      lastResult = { path: p, status: 'removed' };
    } catch (err) {
      lastResult = { path: p, status: 'error', error: err.message };
    }
  }
  return lastResult;
}

function injectCliJs() {
  const content = readFileSync(cliPath, 'utf-8');
  if (content.includes(INJECT_START)) {
    return 'exists';
  }
  const lines = content.split('\n');
  lines.splice(2, 0, INJECT_BLOCK);
  writeFileSync(cliPath, lines.join('\n'));
  return 'injected';
}

function removeCliJsInjection() {
  try {
    if (!existsSync(cliPath)) return 'not_found';
    const content = readFileSync(cliPath, 'utf-8');
    if (!content.includes(INJECT_START)) return 'clean';
    const regex = new RegExp(`${INJECT_START}\\n${INJECT_IMPORT}\\n${INJECT_END}\\n?`, 'g');
    writeFileSync(cliPath, content.replace(regex, ''));
    return 'removed';
  } catch {
    return 'error';
  }
}

async function runProxyCommand(args) {
  // 直接模式：不启动 proxy，直接运行 codex
  try {
    // args = ['run', '--', 'command', 'codex', ...] or ['run', 'codex', ...]
    // Our hook uses: cxv run -- codex --cxv-internal "$@"
    // args[0] is 'run'.
    // If args[1] is '--', then command starts at args[2].

    let cmdStartIndex = 1;
    if (args[1] === '--') {
      cmdStartIndex = 2;
    }

    let cmd = args[cmdStartIndex];
    if (!cmd) {
      console.error('No command provided to run.');
      process.exit(1);
    }
    let cmdArgs = args.slice(cmdStartIndex + 1);

    // If cmd is 'codex' and next arg is '--cxv-internal', remove it
    if (cmdArgs[0] === '--cxv-internal') {
      cmdArgs.shift();
    }

    const env = { ...process.env };
    // Determine the path to the native 'codex' executable
    if (cmd === 'codex') {
      const nativePath = resolveNativePath();
      if (nativePath) {
        cmd = nativePath;
      }
    }
    env.CXV_DIRECT_MODE = '1';

    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', env });

    child.on('exit', (code) => {
      process.exit(code);
    });

    child.on('error', (err) => {
      console.error('Failed to start command:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('Run error:', err);
    process.exit(1);
  }
}

// ensureHooks() extracted to lib/ensure-hooks.js (shared with electron/tab-worker.js)

async function runCliMode(extraCodexArgs = [], cwd) {
  // 首先尝试 npm 版本（包括 nvm 安装），找不到再尝试 native 版本
  let codexPath = resolveNpmCodexPath();
  let isNpmVersion = !!codexPath;

  if (!codexPath) {
    codexPath = resolveNativePath();
  }

  if (!codexPath) {
    console.error(t('cli.cMode.notFound'));
    process.exit(1);
  }

  console.log(t('cli.cMode.starting'));

  const workingDir = cwd || process.cwd();

  // 注册工作区
  const { registerWorkspace } = await import('./workspace-registry.js');
  registerWorkspace(workingDir);

  // 确保 AskUserQuestion hook 已注册到 ~/.codex/settings.json
  ensureHooks();

  // 2. 设置 CLI 模式标记
  process.env.CXV_CLI_MODE = '1';
  process.env.CXV_PROJECT_DIR = workingDir;
  // 当 bypass 模式生效时，通知 perm-bridge 不要拦截
  if (hasBypassPermissions(extraCodexArgs)) {
    process.env.CXV_BYPASS_PERMISSIONS = '1';
  }

  // 初始化日志文件（CXV_WORKSPACE_MODE=1 下 interceptor 跳过了自动初始化）
  const { initForWorkspace } = await import('./interceptor.js');
  initForWorkspace(workingDir);

  // 启动 HTTP 服务器（工作区模式下需要手动调用 startViewer）
  const serverMod = await import('./server.js');
  await serverMod.startViewer();

  // 等待服务器启动完成
  await new Promise(resolve => {
    const check = () => {
      const port = serverMod.getPort();
      if (port) resolve(port);
      else setTimeout(check, 100);
    };
    setTimeout(check, 200);
  });

  const port = serverMod.getPort();
  const protocol = serverMod.getProtocol();

  // 标记工作区已启动（跳过前端工作区选择器）
  serverMod.setWorkspaceLaunched(true);

  // 启动日志监听和统计（startViewer 在 workspace 模式下跳过了这些）
  serverMod.initPostLaunch();

  // 注入 OTel 配置到 config.toml（补充数据源）
  const otelEndpoint = `${protocol}://127.0.0.1:${port}`;
  const codexConfigPath = resolve(homedir(), '.codex', 'config.toml');
  let _otelConfigInjected = false;
  const OTEL_MARKER = '# >>> CX-Viewer OTel >>>';
  const OTEL_MARKER_END = '# <<< CX-Viewer OTel <<<';
  try {
    let configContent = existsSync(codexConfigPath) ? readFileSync(codexConfigPath, 'utf-8') : '';
    const otelRegex = new RegExp(`\\n?${OTEL_MARKER}[\\s\\S]*?${OTEL_MARKER_END}\\n?`, 'g');
    configContent = configContent.replace(otelRegex, '\n');
    const otelBlock = `\n${OTEL_MARKER}\n[otel]\ntrace_exporter = { otlp-http = { protocol = "json", endpoint = "${otelEndpoint}" } }\n${OTEL_MARKER_END}\n`;
    configContent = configContent.trimEnd() + otelBlock;
    writeFileSync(codexConfigPath, configContent);
    _otelConfigInjected = true;
  } catch (err) {
    console.error('[CX Viewer] Failed to inject OTel config:', err.message);
  }

  // 启动 App-Server Bridge（WebSocket 中间代理，获取完整执行日志）
  const { LOG_FILE: currentLogFile } = await import('./interceptor.js');
  let _bridge = null;
  let bridgeArgs = [];
  try {
    const { startAppServerBridge } = await import('./lib/appserver-bridge.js');
    _bridge = await startAppServerBridge({
      cwd: workingDir,
      codexPath,
      logFile: currentLogFile,
      env: process.env,
    });
    // 让 codex TUI 通过 --remote 连接到代理
    bridgeArgs = ['--remote', `ws://127.0.0.1:${_bridge.proxyPort}`];
    console.log(`[CX Viewer] App-Server bridge started (proxy:${_bridge.proxyPort} → server:${_bridge.appServerPort})`);
  } catch (err) {
    console.warn('[CX Viewer] App-Server bridge failed, falling back to direct mode:', err.message);
  }

  // 启动 PTY 中的 codex TUI
  const { spawnCodex, killPty } = await import('./pty-manager.js');
  try {
    await spawnCodex(null, workingDir, [...bridgeArgs, ...extraCodexArgs], codexPath, isNpmVersion, port);
  } catch (err) {
    console.error('[CX Viewer] Failed to spawn Codex:', err.message);
    if (_bridge) _bridge.stop();
    await serverMod.stopViewer();
    process.exit(1);
  }

  // 4. 自动打开浏览器
  const url = `${protocol}://127.0.0.1:${port}`;
  try {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    const { execSync } = await import('node:child_process');
    execSync(`${cmd} ${url}`, { stdio: 'ignore', timeout: 5000 });
  } catch {}

  console.log(`CX Viewer:`);
  console.log(`  ➜ Local:   ${url}`);
  const _lanIps = serverMod.getAllLocalIps();
  const _token = serverMod.getAccessToken();
  for (const _ip of _lanIps) {
    console.log(`  ➜ Network: ${protocol}://${_ip}:${port}?token=${_token}`);
  }

  // 5. 注册退出处理
  const cleanupOtelConfig = () => {
    if (!_otelConfigInjected) return;
    try {
      let c = readFileSync(codexConfigPath, 'utf-8');
      const re = new RegExp(`\\n?${OTEL_MARKER}[\\s\\S]*?${OTEL_MARKER_END}\\n?`, 'g');
      c = c.replace(re, '\n');
      writeFileSync(codexConfigPath, c.trimEnd() + '\n');
    } catch {}
  };
  const cleanup = () => {
    killPty();
    if (_bridge) _bridge.stop();
    cleanupOtelConfig();
    serverMod.stopViewer().finally(() => process.exit());
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

async function runSdkMode(extraCodexArgs = [], cwd) {
  // 检查 SDK 是否可用
  let sdkManager;
  try {
    sdkManager = await import('./lib/sdk-manager.js');
    if (!sdkManager.isSdkAvailable()) throw new Error('query not available');
  } catch {
    console.warn('[CX Viewer] Agent SDK not available, falling back to PTY mode (-C)');
    return runCliMode(extraCodexArgs, cwd);
  }

  const workingDir = cwd || process.cwd();

  // 注册工作区
  const { registerWorkspace } = await import('./workspace-registry.js');
  registerWorkspace(workingDir);

  // 不需要 ensureHooks — SDK canUseTool 处理 AskUserQuestion + 权限
  // 不需要 proxy — SDK 直接管理 API 通信

  // 设置环境标记（必须在 import server.js 之前）
  process.env.CXV_CLI_MODE = '1';
  process.env.CXV_SDK_MODE = '1';
  process.env.CXV_PROJECT_DIR = workingDir;

  // 启动 HTTP 服务器
  const serverMod = await import('./server.js');

  await new Promise(resolve => {
    const check = () => {
      const port = serverMod.getPort();
      if (port) resolve(port);
      else setTimeout(check, 100);
    };
    setTimeout(check, 200);
  });

  const port = serverMod.getPort();
  const { basename } = await import('node:path');

  // 解析 permission mode from CLI args
  let permissionMode = 'default';
  if (hasBypassPermissions(extraCodexArgs)) {
    permissionMode = 'bypassPermissions';
  }

  // 初始化 SDK 会话
  sdkManager.initSdkSession(workingDir, basename(workingDir), {
    onEntry: (entry) => serverMod.pushSdkEntry(entry),
    onStreamingStatus: (data) => serverMod.setSdkStreamingState(data),
    broadcastWs: (msg) => serverMod.broadcastWsMessage(msg),
    permissionMode,
  });

  // 注册 SDK 回调到 server.js（WS 消息路由用）
  serverMod.setSdkResolveApproval(sdkManager.resolveApproval);
  serverMod.setSdkSendUserMessage(sdkManager.sendUserMessage);

  // 自动打开浏览器
  const protocol = serverMod.getProtocol();
  const url = `${protocol}://127.0.0.1:${port}`;
  try {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    const { execSync } = await import('node:child_process');
    execSync(`${cmd} ${url}`, { stdio: 'ignore', timeout: 5000 });
  } catch {}

  console.log(`CX Viewer (SDK mode):`);
  console.log(`  ➜ Local:   ${url}`);
  const _lanIps = serverMod.getAllLocalIps();
  const _token = serverMod.getAccessToken();
  for (const _ip of _lanIps) {
    console.log(`  ➜ Network: ${protocol}://${_ip}:${port}?token=${_token}`);
  }

  // 注册退出处理
  const cleanup = () => {
    sdkManager.stopSession();
    serverMod.stopViewer().finally(() => process.exit());
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

async function runCliModeWorkspaceSelector(extraCodexArgs = []) {
  // 首先尝试 npm 版本（包括 nvm 安装），找不到再尝试 native 版本
  let codexPath = resolveNpmCodexPath();
  let isNpmVersion = !!codexPath;

  if (!codexPath) {
    codexPath = resolveNativePath();
  }

  if (!codexPath) {
    console.error(t('cli.cMode.notFound'));
    process.exit(1);
  }

  console.log(t('cli.cMode.starting'));

  process.env.CXV_CLI_MODE = '1';

  // 启动 HTTP 服务器（工作区模式，不初始化 interceptor 日志）
  const serverMod = await import('./server.js');

  // 工作区模式下 server.js 跳过了自动启动，需要手动调用
  await serverMod.startViewer();

  const port = serverMod.getPort();

  // 保存 extraCodexArgs 和 codexPath 供后续 launch 使用
  serverMod.setWorkspaceCodexArgs(extraCodexArgs);
  serverMod.setWorkspaceCodexPath(codexPath, isNpmVersion);

  // 自动打开浏览器
  const wsProtocol = serverMod.getProtocol();
  const url = `${wsProtocol}://127.0.0.1:${port}`;
  try {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    const { execSync } = await import('node:child_process');
    execSync(`${cmd} ${url}`, { stdio: 'ignore', timeout: 5000 });
  } catch {}

  console.log(`CX Viewer (Workspace):`);
  console.log(`  ➜ Local:   ${url}`);
  const _lanIps = serverMod.getAllLocalIps();
  const _token = serverMod.getAccessToken();
  for (const _ip of _lanIps) {
    console.log(`  ➜ Network: ${wsProtocol}://${_ip}:${port}?token=${_token}`);
  }

  // 注册退出处理
  const { killPty } = await import('./pty-manager.js');
  const cleanup = () => {
    killPty();
    serverMod.stopViewer().finally(() => process.exit());
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// === 主逻辑 ===

const args = process.argv.slice(2);

// cxv 自有命令判断
const isLogger = args.includes('-logger');
const isUninstall = args.includes('--uninstall') || args.includes('-uninstall');
const isHelp = args.includes('--help') || args.includes('-h') || args[0] === 'help';
const isVersion = args.includes('--v') || args.includes('--version') || args.includes('-v');

if (isHelp) {
  console.log(t('cli.help'));
  process.exit(0);
}

if (isVersion) {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
    console.log(`cx-viewer v${pkg.version}`);
  } catch (e) {
    console.error('Failed to read version:', e.message);
  }
  process.exit(0);
}

if (isUninstall) {
  const cliResult = removeCliJsInjection();
  const shellResult = removeShellHook();

  if (cliResult === 'removed' || cliResult === 'clean') {
    console.log(t('cli.uninstall.cliCleaned'));
  } else if (cliResult === 'not_found') {
    // Silent is better for mixed mode uninstall
  } else {
    console.log(t('cli.uninstall.cliFail'));
  }

  if (shellResult.status === 'removed') {
    console.log(t('cli.uninstall.hookRemoved', { path: shellResult.path }));
  } else if (shellResult.status === 'clean' || shellResult.status === 'not_found') {
    console.log(t('cli.uninstall.hookClean', { path: shellResult.path }));
  } else {
    console.log(t('cli.uninstall.hookFail', { error: shellResult.error }));
  }

  // 清理 statusLine 配置和脚本（兼容历史版本遗留）
  try {
    const settingsPath = resolve(homedir(), '.codex', 'settings.json');
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.statusLine?.command?.includes('cxv-statusline')) {
        delete settings.statusLine;
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
        console.log('Cleaned statusLine config from settings.json');
      }
    }
    const cxvScript = resolve(homedir(), '.codex', 'cxv-statusline.sh');
    if (existsSync(cxvScript)) {
      unlinkSync(cxvScript);
      console.log('Removed cxv-statusline.sh');
    }
    // 清理 context-window.json
    const ctxFile = resolve(homedir(), '.codex', 'context-window.json');
    if (existsSync(ctxFile)) {
      unlinkSync(ctxFile);
    }
  } catch { }

  console.log(t('cli.uninstall.reloadShell'));
  console.log(t('cli.uninstall.done'));
  process.exit(0);
}

if (isLogger) {
  // 安装/修复 hook 逻辑（原来无参数 cxv 的行为）
  let mode = 'unknown';

  let prefersNative = true;
  const paths = (process.env.PATH || '').split(':');
  for (const dir of paths) {
    if (!dir) continue;
    const exePath = resolve(dir, 'codex');
    if (existsSync(exePath)) {
      try {
        const real = realpathSync(exePath);
        if (real.includes('node_modules')) {
          prefersNative = false;
        } else {
          prefersNative = true;
        }
        break;
      } catch (e) {
        // ignore
      }
    }
  }

  const nativePath = resolveNativePath();
  const hasNpm = existsSync(cliPath);

  if (prefersNative) {
    if (nativePath) {
      mode = 'native';
    } else if (hasNpm) {
      mode = 'npm';
    }
  } else {
    if (hasNpm) {
      mode = 'npm';
    } else if (nativePath) {
      mode = 'native';
    }
  }

  if (mode === 'unknown') {
    console.error(t('cli.inject.notFound', { path: cliPath }));
    console.error('Also could not find native "codex" command in PATH.');
    console.error('Please make sure @openai/codex is installed.');
    process.exit(1);
  }

  if (mode === 'npm') {
    try {
      const cliResult = injectCliJs();
      const shellResult = installShellHook(false);

      if (cliResult === 'exists' && shellResult.status === 'exists') {
        console.log(t('cli.alreadyWorking'));
      } else {
        if (cliResult === 'exists') {
          console.log(t('cli.inject.exists'));
        } else {
          console.log(t('cli.inject.success'));
        }

        if (shellResult.status === 'installed') {
          console.log('All READY!');
        } else if (shellResult.status !== 'exists') {
          console.log(t('cli.hook.fail', { error: shellResult.error }));
        }
      }
      console.log(t('cli.usage.hint'));
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(t('cli.inject.notFound', { path: cliPath }));
        console.error(t('cli.inject.notFoundHint'));
      } else {
        console.error(t('cli.inject.fail', { error: err.message }));
      }
      process.exit(1);
    }
  } else {
    // Native Mode
    try {
      console.log('Detected Codex Code Native Install.');
      const shellResult = installShellHook(true);

      if (shellResult.status === 'exists') {
        console.log(t('cli.alreadyWorking'));
      } else if (shellResult.status === 'installed') {
        console.log('Native Hook Installed! All READY!');
      } else {
        console.log(t('cli.hook.fail', { error: shellResult.error }));
      }
      console.log(t('cli.usage.hint'));
    } catch (err) {
      console.error('Failed to install native hook:', err);
      process.exit(1);
    }
  }
  process.exit(0);
}

if (args[0] === 'run') {
  runProxyCommand(args);
} else if (args.includes('-SDK') || args.includes('--sdk')) {
  // SDK 模式（显式 -SDK 切换）
  const { codexArgs } = normalizeCodexArgs(args.filter(a => a !== '-SDK' && a !== '--sdk'));

  runSdkMode(codexArgs, process.cwd()).catch(err => {
    console.error('SDK mode error:', err);
    process.exit(1);
  });
} else {
  // PTY 模式（默认）
  const { codexArgs } = normalizeCodexArgs(args);

  runCliMode(codexArgs, process.cwd()).catch(err => {
    console.error('CLI mode error:', err);
    process.exit(1);
  });
}
