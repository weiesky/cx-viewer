#!/usr/bin/env node

// 阻止 server.js 自动启动（必须在任何导入之前设置）
process.env.CXV_WORKSPACE_MODE = '1';

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { t } from './i18n.js';
import { resolveBaseConfig, externalUrlFromConfig } from './lib/base-url.js';
import { INJECT_IMPORT, LOG_DIR, resolveCliPath, resolveNativePath, resolveNpmCodexPath } from './findcx.js';
import { appendCxvFinalConfigArgs, buildPtyWorkspaceLaunchArgs, getDefaultModeRequestUserInputConfigArgs, normalizeCodexArgs, hasBypassPermissions, getReasoningSummaryConfigArgs, parseCodexInvocation, extractSdkTransportOptions, insertBeforeDashDash } from "@cxv/core/cli-args";
import { ensureHooks } from './lib/ensure-hooks.js';
import { APPROVALS_REVIEWER_DEFAULT } from "@cxv/core/approval-reviewer";
import { inspectCodexSystemPromptSupport } from './lib/codex-appserver-capabilities.js';
import { appendOtelTraceExporterConfigArgsOnce, getOtelTraceExporterConfigArgs, OTEL_TRACE_HEADERS_ENV, stripLegacyOtelConfigBlock, withOtelTraceAuthHeader } from './lib/otel-config.js';
import { registerSignalShutdown } from './lib/shutdown.js';
import {
  LOGGER_INJECT_START,
  injectLoggerBootstrapAt,
  removeLoggerBootstrapAt,
  resolveJavascriptLauncher,
} from './lib/logger-install.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
let activeShutdownCleanup = async () => {};
let shutdownStarted = false;
registerSignalShutdown(async (context) => {
  shutdownStarted = true;
  await activeShutdownCleanup(context);
});

function openViewerBrowser(url) {
  if (process.env.CXV_NO_OPEN === '1') return;
  try {
    const child = process.platform === 'win32'
      ? spawn('cmd.exe', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true, windowsHide: true })
      : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true });
    child.on('error', () => {}); child.unref();
  } catch { /* Browser opening is best effort. */ }
}

function registerUpdateRestart(serverMod) {
  if (process.env.CXV_IM_WORKER === '1') return;
  serverMod.setRestartHandler(async version => {
    const { launchRestart } = await import('./lib/restart.js');
    await launchRestart({ ...cxvLaunch, version });
    // Reuse the native deadline and full PTY/SDK/plugin cleanup only after readiness.
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 100).unref();
  });
}

function setActiveShutdownCleanup(cleanup) {
  activeShutdownCleanup = typeof cleanup === 'function' ? cleanup : async () => {};
}

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
  local codex_exe=""
  codex_exe="$(whence -p codex 2>/dev/null || type -P codex 2>/dev/null || command -v codex 2>/dev/null)"
  local codex_entry="$codex_exe"
  if [ -n "$codex_entry" ]; then
    codex_entry="$(realpath "$codex_entry" 2>/dev/null || readlink -f "$codex_entry" 2>/dev/null || printf '%s' "$codex_entry")"
  fi
  if [ -z "$codex_entry" ] || ! grep -q ${JSON.stringify(LOGGER_INJECT_START)} "$codex_entry" 2>/dev/null; then
    cxv -logger --self-heal >/dev/null 2>&1
  fi
  if [ -n "$codex_entry" ] && grep -q ${JSON.stringify(LOGGER_INJECT_START)} "$codex_entry" 2>/dev/null; then
    command codex "$@"
  else
    cxv run -- codex --cxv-internal "$@"
  fi
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

    let loggerRuntime = null, managedPrompt = null;
    const closeManagedPrompt = () => {
      try { managedPrompt?.close(); }
      catch { console.warn('[CX Viewer] A private native prompt file could not be removed'); }
    };
    // Determine the path to the native 'codex' executable
    if (cmd === 'codex') {
      const nativePath = resolveNativePath();
      if (nativePath) {
        cmd = nativePath;
      }
      const { startLoggerCapture } = await import('./lib/logger-bootstrap.js');
      loggerRuntime = await startLoggerCapture();
      const loggerArgs = loggerRuntime.active ? loggerRuntime.codexArgs : [];
      cmdArgs = [...loggerArgs, ...getReasoningSummaryConfigArgs(), ...cmdArgs];
      process.env.CXV_CLI_MODE = '1';
      const { prepareHeadlessSystemPrompt } = await import('./lib/headless-system-prompts.js');
      const prepareAbort = new AbortController();
      let preparing;
      setActiveShutdownCleanup(async () => {
        prepareAbort.abort();
        await preparing?.catch(() => {});
        closeManagedPrompt();
        loggerRuntime?.close();
      });
      try {
        const interceptor = await import('./interceptor.js');
        if (prepareAbort.signal.aborted) return;
        preparing = prepareHeadlessSystemPrompt({ codexPath: cmd, args: cmdArgs, signal: prepareAbort.signal,
          cwd: process.cwd(), logDir: LOG_DIR, resolveModel: cwd => interceptor.getWorkspaceProxyProfile(cwd)?.activeModel || null });
        managedPrompt = await preparing;
        cmdArgs = insertBeforeDashDash(cmdArgs, managedPrompt.args);
        process.once('exit', closeManagedPrompt);
      } catch (error) {
        if (prepareAbort.signal.aborted) return;
        if (error.code === 'CXV_MANAGED_PROMPT_LOAD_FAILED') {
          loggerRuntime?.close();
          throw new Error('Managed system prompt preparation failed; Codex was not started');
        }
        // New/unsupported native options still reach Codex unchanged. Never
        // echo configuration, template text or parser error excerpts here.
        console.warn('[CX Viewer] Automatic system prompt skipped: native launch configuration could not be inspected');
      }
    }
    const env = { ...process.env };
    env.CXV_DIRECT_MODE = '1';

    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', env });
    setActiveShutdownCleanup(() => {
      try { child.kill('SIGTERM'); } catch {}
      closeManagedPrompt();
      loggerRuntime?.close();
    });

    child.on('exit', (code) => {
      closeManagedPrompt();
      loggerRuntime?.close();
      process.exit(code);
    });

    child.on('error', (err) => {
      closeManagedPrompt();
      loggerRuntime?.close();
      console.error('Failed to start command:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('Run error:', err);
    process.exit(1);
  }
}

// ensureHooks() extracted to lib/ensure-hooks.js (shared with electron/tab-worker.js)

async function runCliMode(extraCodexArgs = [], cwd, launchInvocation = parseCodexInvocation(extraCodexArgs), options = {}) {
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
  let serverMod = null;
  let bridge = null, bridgeStartup = null;
  const startupController = new AbortController();
  let stopProxyFn = () => {};
  let killPtyFn = () => {};
  let shutdownHookCalled = false;
  const runShutdownHook = async () => {
    if (shutdownHookCalled) return;
    shutdownHookCalled = true;
    await options.onShutdown?.();
  };
  setActiveShutdownCleanup(async ({ deadlineAt } = {}) => {
    startupController.abort();
    const ptyStop = killPtyFn();
    serverMod?.setCodexApprovalsReviewerUpdater(null);
    serverMod?.setCodexRequestUserInputBridge(null);
    serverMod?.setActiveCodexApprovalsReviewer(null, false);
    serverMod?.setSystemPromptRuntimeCapability(null);
    const nativeStop = bridge?.stop();
    try { stopProxyFn(); } catch {}
    if (serverMod) await serverMod.stopViewer({ deadlineAt });
    await Promise.all([ptyStop, nativeStop]);
    await bridgeStartup?.catch(() => {});
    await runShutdownHook();
  });

  // 注册工作区
  if (!options.skipWorkspaceRegistration) {
    const { registerWorkspace } = await import('./workspace-registry.js');
    registerWorkspace(workingDir);
  }

  // 清理旧 request_user_input hook，并确保权限审批 hook 已注册。
  if (!options.skipHooks) ensureHooks();

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
  serverMod = await import('./server.js');
  serverMod.setWorkspaceCodexArgs(extraCodexArgs);
  serverMod.setWorkspaceCodexPath(codexPath, isNpmVersion);
  await serverMod.startViewer();
  registerUpdateRestart(serverMod);
  if (shutdownStarted) { await serverMod.stopViewer(); return; }

  const port = serverMod.getPort();
  const protocol = serverMod.getProtocol();
  await options.onServerReady?.({ port, protocol });

  // 标记工作区已启动（跳过前端工作区选择器）
  serverMod.setWorkspaceLaunched(true);

  // Keep the temporary exporter process-local. Adding another [otel] table to
  // config.toml makes Codex reject an otherwise valid user configuration.
  const otelEndpoint = `${protocol}://127.0.0.1:${port}`;
  const codexConfigPath = resolve(homedir(), '.codex', 'config.toml');
  const otelConfigArgs = getOtelTraceExporterConfigArgs(otelEndpoint);
  process.env[OTEL_TRACE_HEADERS_ENV] = withOtelTraceAuthHeader(
    process.env[OTEL_TRACE_HEADERS_ENV],
    serverMod.getOtelAccessToken(),
  );
  try {
    if (existsSync(codexConfigPath)) {
      const configContent = readFileSync(codexConfigPath, 'utf-8');
      const legacy = stripLegacyOtelConfigBlock(configContent);
      if (legacy.removed) writeFileSync(codexConfigPath, legacy.content);
    }
  } catch (err) {
    console.warn('[CX Viewer] Failed to remove legacy OTel config block:', err.message);
  }

  // Start HTTP capture proxy for all auth modes (API-key and ChatGPT/OAuth).
  // proxy.js detects OAuth via the chatgpt-account-id request header and routes
  // to chatgpt.com/backend-api/codex; API-key traffic routes to api.openai.com.
  let _proxyPort = null;
  // Reasoning summaries remain a user-overridable default. Native Default-mode
  // request_user_input is appended again at each child-process boundary so CX
  // Viewer's interactive bridge always agrees with Codex's advertised tools.
  const defaultModeAskArgs = options.disableNativeAsk ? [] : getDefaultModeRequestUserInputConfigArgs();
  const baseConfigArgs = [...getReasoningSummaryConfigArgs(), ...defaultModeAskArgs];
  let proxyRedirectArgs = [];
  {
    const { readFileSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    const { startProxy, stopProxy } = await import('./proxy.js');
    stopProxyFn = stopProxy;
    const { readOriginalOpenAiBaseUrl } = await import('./lib/codex-config.js');

    let authMode = 'chatgpt';
    try {
      const authPath = join(homedir(), '.codex', 'auth.json');
      if (existsSync(authPath)) {
        const auth = JSON.parse(readFileSync(authPath, 'utf-8'));
        authMode = auth.auth_mode || 'chatgpt';
      }
    } catch { }

    {
      const loopback = '127.0.0.1,localhost,::1';
      const existing = process.env.NO_PROXY || process.env.no_proxy || '';
      const merged = existing ? `${existing},${loopback}` : loopback;
      process.env.NO_PROXY = merged;
      process.env.no_proxy = merged;
    }
    try {
      const { getNativeProxyRole } = await import('./lib/appserver-bridge.js');
      _proxyPort = await startProxy({ captureContext: { cwd: workingDir }, resolveNativeRole: getNativeProxyRole });
      if (shutdownStarted) { stopProxyFn(); return; }
      if (authMode === 'chatgpt') {
        process.env.CXV_ORIGINAL_BASE_URL = 'https://chatgpt.com/backend-api/codex';
      } else {
        process.env.CXV_ORIGINAL_BASE_URL = readOriginalOpenAiBaseUrl() || 'https://api.openai.com/v1';
      }
      if (!process.env.CXV_ORIGINAL_CHATGPT_BASE_URL) {
        process.env.CXV_ORIGINAL_CHATGPT_BASE_URL = 'https://chatgpt.com/backend-api/codex';
      }
      proxyRedirectArgs = ['-c', `openai_base_url="http://127.0.0.1:${_proxyPort}/v1"`];
      console.log(`[CX Viewer] HTTP capture proxy started on 127.0.0.1:${_proxyPort} (${authMode} mode)`);
    } catch (err) {
      console.warn('[CX Viewer] HTTP capture proxy failed to start:', err.message);
    }
  }

  // 启动 App-Server Bridge（WebSocket 中间代理，获取完整执行日志）
  const interceptorMod = await import('./interceptor.js');
  const { LOG_DIR } = await import('./findcx.js');
  const { rawProjectDirectoryToken } = await import('./lib/log-v2/project-id.js');
  // Proxy redirect args exist only after successful startup. App-server gets
  // the native ask override last; the TUI receives the same final overrides below.
  const childBaseConfigArgs = [...baseConfigArgs, ...proxyRedirectArgs];
  const appServerConfigArgs = appendOtelTraceExporterConfigArgsOnce(childBaseConfigArgs, otelConfigArgs);
  let bridgeArgs = [...childBaseConfigArgs];
  try {
    const { startAppServerBridge } = await import('./lib/appserver-bridge.js');
    const systemPromptCapability = inspectCodexSystemPromptSupport(codexPath);
    bridgeStartup = startAppServerBridge({
      cwd: workingDir,
      signal: startupController.signal,
      codexPath,
      rawDir: join(LOG_DIR, 'v2-raw', rawProjectDirectoryToken(interceptorMod.getActiveProjectContext().projectId)),
      env: process.env,
      extraConfigArgs: appServerConfigArgs,
      onApprovalsReviewerActive: (reviewer) => serverMod.setActiveCodexApprovalsReviewer(reviewer, true),
      onRequestUserInput: serverMod.offerCodexRequestUserInput,
      onRequestUserInputCleared: serverMod.clearCodexRequestUserInput,
      onAgentLoopStart: serverMod.broadcastPtyAgentLoopStart,
      onAgentLoopEnd: serverMod.broadcastPtyAgentLoopEnd,
      onTaskSnapshot: serverMod.broadcastPtyTaskSnapshot,
      writeLogEntry: interceptorMod.appendLogEntry,
      systemPromptCapability,
      systemPromptLogDir: LOG_DIR,
      resolveSystemPromptModel: () => interceptorMod.getWorkspaceProxyProfile(workingDir)?.activeModel || null,
    });
    bridge = await bridgeStartup;
    if (shutdownStarted) { await bridge.stop(); return; }
    serverMod.setCodexApprovalsReviewerUpdater(bridge.setApprovalsReviewer);
    serverMod.setCodexRequestUserInputBridge({
      resolve: bridge.resolveRequestUserInput,
      cancel: bridge.cancelRequestUserInput,
      releaseToTui: bridge.releaseRequestUserInputToTui,
    });
    serverMod.setSystemPromptRuntimeCapability({
      ...systemPromptCapability,
      transport: 'app-server-bridge',
    });
    // 让 codex TUI 通过 --remote 连接到代理
    bridgeArgs = [...childBaseConfigArgs, '--remote', `ws://127.0.0.1:${bridge.proxyPort}`];
    console.log(`[CX Viewer] App-Server bridge started (proxy:${bridge.proxyPort} → server:${bridge.appServerPort})`);
  } catch (err) {
    serverMod.setSystemPromptRuntimeCapability(null);
    if (options.requireAppServerBridge) {
      await activeShutdownCleanup();
      throw err;
    }
    console.warn('[CX Viewer] App-Server bridge failed, falling back to direct mode:', err.message);
  }

  if (shutdownStarted) return;

  // 启动 PTY 中的 codex TUI
  const { spawnCodexRequest, killPty } = await import('./pty-manager.js');
  killPtyFn = killPty;
  const savedApprovalsReviewer = serverMod.getApprovalsReviewerPreference() || APPROVALS_REVIEWER_DEFAULT;
  const reviewerArgs = savedApprovalsReviewer
    ? ['-c', `approvals_reviewer="${savedApprovalsReviewer}"`]
    : [];
  if (!bridge && savedApprovalsReviewer) {
    serverMod.setActiveCodexApprovalsReviewer(savedApprovalsReviewer, true);
  }
  try {
    let tuiArgs = appendOtelTraceExporterConfigArgsOnce(
      appendCxvFinalConfigArgs(
        [...bridgeArgs, ...reviewerArgs, ...extraCodexArgs],
        { proxyPort: _proxyPort },
      ),
      otelConfigArgs,
    );
    if (options.disableNativeAsk) tuiArgs = [...tuiArgs, '-c', 'features.default_mode_request_user_input=false'];
    await spawnCodexRequest({
      proxyPort: null,
      cwd: workingDir,
      args: tuiArgs,
      codexPath,
      isNpmVersion,
      serverPort: port,
      invocation: {
        ...launchInvocation,
        subcommandIndex: parseCodexInvocation(tuiArgs).subcommandIndex,
      },
    });
    if (shutdownStarted) { await killPtyFn(); return; }
    const ptyModule = await import('./pty-manager.js');
    const nativeModule = await import('./lib/appserver-bridge.js');
    const { startPtyWorkspaceRuntime } = await import('./lib/pty-workspace-runtime.js');
    const { ensureProjectIdForCwd } = await import('./lib/log-v2/project-id.js');
    serverMod.configurePtyWorkspaces({
      boot: { cwd: workingDir, pty: ptyModule, runtime: {
        nativeProxyRoles: !!bridge,
        getContext: nativeModule.getAppServerRuntimeContext,
        getInputState: nativeModule.getAppServerInputState,
        getAgentLoopSnapshot: nativeModule.getAppServerAgentLoopSnapshot,
        getTaskState: nativeModule.getAppServerTaskState,
        stop() { const nativeStop = bridge?.stop(); stopProxyFn(); return nativeStop; },
      } },
      launch: request => {
        const projectId = ensureProjectIdForCwd(LOG_DIR, request.cwd, basename(request.cwd));
        return startPtyWorkspaceRuntime({ ...request, projectId,
          args: buildPtyWorkspaceLaunchArgs(extraCodexArgs, request.args), codexPath, isNpmVersion,
          rawDir: join(LOG_DIR, 'v2-raw', rawProjectDirectoryToken(projectId), request.instanceKey),
          logDir: LOG_DIR, serverPort: port, serverProtocol: protocol,
          otelToken: serverMod.getOtelAccessToken(), approvalsReviewer: serverMod.getApprovalsReviewerPreference() || APPROVALS_REVIEWER_DEFAULT,
          requireAppServerBridge: options.requireAppServerBridge === true,
          callbacks: { onEntry: interceptorMod.appendLogEntry,
            resolveSystemPromptModel: () => interceptorMod.getWorkspaceProxyProfile(request.cwd)?.activeModel || null,
            onRequestUserInput: serverMod.offerCodexRequestUserInput,
            onRequestUserInputCleared: serverMod.clearCodexRequestUserInput,
            onAgentLoopStart: serverMod.broadcastPtyAgentLoopStart,
            onAgentLoopEnd: serverMod.broadcastPtyAgentLoopEnd,
            onTaskSnapshot: serverMod.broadcastPtyTaskSnapshot,
            onWarning: error => console.warn('[CX Viewer] Workspace bridge fallback:', error.message),
          },
        });
      },
    });
    // The Codex TUI is the critical path. Log watching/statistics can attach
    // after the PTY exists; the V2 writer is ready before traffic starts and the
    // regular history endpoints own older conversation loading.
    await serverMod.initPostLaunch();
  } catch (err) {
    console.error('[CX Viewer] Failed to spawn Codex:', err.message);
    if (bridge) await bridge.stop();
    await serverMod.stopViewer();
    await runShutdownHook();
    process.exit(1);
  }

  // 4. 自动打开浏览器（公开URL有host时使用同一外部入口）
  const cfg = resolveBaseConfig();
  const url = `${protocol}://127.0.0.1:${port}${cfg.basePath}`;
  const _token = serverMod.getAccessToken();
  const externalUrl = externalUrlFromConfig(cfg, { token: _token });
  if (!options.noOpen) openViewerBrowser(externalUrl || url);
  console.log(`CX Viewer:`);
  console.log(`  ➜ Local:   ${url}`);
  if (externalUrl) console.log(t('server.startedExternal', { url: externalUrl }));
  for (const _ip of serverMod.getAllLocalIps()) {
    console.log(`  ➜ Network: ${protocol}://${_ip}:${port}${cfg.basePath}?token=${_token}`);
  }

}

async function runDingTalkImMode() {
  const configMod = await import("./lib/im/dingtalk-im-config.js");
  const lockMod = await import("./lib/im/dingtalk-im-lock.js");
  const config = configMod.validateDingTalkImConfig(configMod.loadDingTalkImConfig(), { requireEnabled: true });
  configMod.ensureDingTalkPrivateDirectory(configMod.getDingTalkImWorkerDir());
  const { DEFAULT_DINGTALK_IM_PERSONA, ensureDingTalkImPersona } = await import("./lib/im/dingtalk-im-persona.js");
  ensureDingTalkImPersona(DEFAULT_DINGTALK_IM_PERSONA);
  try {
    const { ensureDingTalkImBuiltinSkill } = await import("./lib/im/dingtalk-im-skills.js");
    ensureDingTalkImBuiltinSkill();
  } catch (error) {
    console.warn('[CX Viewer] Failed to sync DingTalk built-in skill (non-fatal):', error.message);
  }
  const acquired = lockMod.acquireDingTalkImLock();
  if (!acquired.ok) throw Object.assign(new Error('DingTalk IM worker is already running'), { code: 'DINGTALK_WORKER_RUNNING' });
  try {
    const { createProcessAdapter } = await import('./lib/cxv-processes.js');
    const processIdentity = await createProcessAdapter().inspect(process.pid);
    if (!processIdentity) throw new Error('Unable to establish DingTalk worker process identity');
    lockMod.updateDingTalkImLock(acquired.lock, {
      processStartId: processIdentity.startId,
      commandHash: processIdentity.commandHash,
    });
  } catch (error) {
    lockMod.releaseDingTalkImLock(acquired.lock);
    throw error;
  }

  process.env.CXV_IM_PLATFORM = 'dingtalk';
  process.env.CXV_IM_WORKER = '1';
  process.env.CXV_HOST = '127.0.0.1';
  const fixedArgs = [
    '--sandbox', 'workspace-write',
    '--ask-for-approval', 'never',
    '-c', 'sandbox_workspace_write.network_access=false',
  ];
  const invocation = parseCodexInvocation(fixedArgs);
  try {
    await runCliMode(fixedArgs, configMod.getDingTalkImWorkerDir(), invocation, {
      noOpen: true,
      skipHooks: true,
      skipWorkspaceRegistration: true,
      disableNativeAsk: true,
      requireAppServerBridge: true,
      onServerReady: ({ port }) => lockMod.updateDingTalkImLock(acquired.lock, {
        port, ready: false, connected: false, connectionState: 'starting', lastError: null,
      }),
      onShutdown: () => lockMod.releaseDingTalkImLock(acquired.lock),
    });
  } catch (error) {
    lockMod.releaseDingTalkImLock(acquired.lock);
    throw error;
  }
}

async function runSdkMode(extraCodexArgs = [], cwd, transport = 'exec') {
  let codexPath = resolveNpmCodexPath();
  if (!codexPath) {
    codexPath = resolveNativePath();
  }

  if (!codexPath) {
    console.error(t('cli.cMode.notFound'));
    process.exit(1);
  }

  // 检查 SDK 是否可用
  let sdkManager;
  try {
    sdkManager = await import('./lib/sdk-manager.js');
    if (!sdkManager.isSdkAvailable()) throw new Error('query not available');
  } catch (err) {
    if (transport === 'appserver' || parseCodexInvocation(extraCodexArgs).kind === 'resume') throw err;
    console.warn(`[CX Viewer] Codex SDK not available (${err.message}), falling back to PTY mode`);
    return runCliMode(extraCodexArgs, cwd);
  }

  const sdkCwd = cwd || process.cwd();
  const workingDir = sdkManager.getSdkWorkingDirectory(sdkCwd, extraCodexArgs, transport);
  const { resolveSdkCliResume } = await import('./lib/sdk-resume-history.js');
  const { resolveProjectIdForCwd } = await import('./lib/log-v2/project-id.js');
  const resume = await resolveSdkCliResume(LOG_DIR, extraCodexArgs, {
    cwd: workingDir, projectId: resolveProjectIdForCwd(LOG_DIR, workingDir),
  });
  let serverMod = null;
  let sdkSessionStarted = false;
  setActiveShutdownCleanup(async ({ deadlineAt } = {}) => {
    if (sdkSessionStarted) sdkManager.stopSession();
    if (serverMod) await serverMod.stopViewer({ deadlineAt });
  });

  // 注册工作区
  const { registerWorkspace } = await import('./workspace-registry.js');
  registerWorkspace(workingDir);

  // The exec SDK retains its question guard; native stdio owns its requests.

  // 设置环境标记（必须在 import server.js 之前）
  process.env.CXV_CLI_MODE = '1';
  process.env.CXV_SDK_MODE = '1';
  process.env.CXV_PROJECT_DIR = workingDir;

  // 初始化日志文件（CXV_WORKSPACE_MODE=1 下 interceptor 跳过了自动初始化）
  const { initForWorkspace } = await import('./interceptor.js');
  initForWorkspace(workingDir);

  // 启动 HTTP 服务器
  serverMod = await import('./server.js');
  serverMod.setWorkspaceCodexArgs(extraCodexArgs);
  serverMod.setWorkspaceCodexPath(codexPath, /\.m?js$/i.test(codexPath));
  const { basename } = await import('node:path');

  // 解析 permission mode from CLI args
  let permissionMode = 'default';
  if (hasBypassPermissions(extraCodexArgs)) {
    permissionMode = 'bypassPermissions';
  }
  const savedApprovalsReviewer = serverMod.getApprovalsReviewerPreference() || APPROVALS_REVIEWER_DEFAULT;
  const sdkBaseArgs = [...getReasoningSummaryConfigArgs(), ...extraCodexArgs];
  const sdkCodexArgs = [...sdkBaseArgs];
  if (savedApprovalsReviewer) {
    const terminator = sdkCodexArgs.indexOf('--');
    sdkCodexArgs.splice(terminator < 0 ? sdkCodexArgs.length : terminator, 0,
      '-c', `approvals_reviewer="${savedApprovalsReviewer}"`);
  }

  const sdkLaunchConfig = {
    transport,
    onEntry: (entry) => serverMod.pushSdkEntry(entry),
    onStreamingStatus: (data) => serverMod.setSdkStreamingState(data),
    onContextUsage: (data) => serverMod.setSdkContextUsage(data),
    onStreamProgress: (data) => serverMod.sendSdkStreamProgress(data),
    onAgentLoopStart: (data) => serverMod.broadcastAgentLoopStart(data),
    onAgentLoopEnd: (data) => serverMod.broadcastAgentLoopEnd(data),
    broadcastWs: (msg) => serverMod.broadcastWsMessage(msg),
    permissionMode,
    codexPath,
    codexArgs: sdkCodexArgs,
  };
  sdkManager.setSdkLaunchConfig(sdkLaunchConfig);
  sdkManager.initSdkSession(sdkCwd, basename(workingDir), sdkLaunchConfig);
  sdkSessionStarted = true;
  if (shutdownStarted) { sdkManager.stopSession(); return; }
  const initialPrompt = sdkManager.getInitialPrompt();
  if (resume?.file) await serverMod.restoreSdkSessionFromHistory({ cwd: workingDir }, resume.file);
  if (shutdownStarted) { sdkManager.stopSession(); return; }

  await serverMod.startViewer();
  registerUpdateRestart(serverMod);
  if (shutdownStarted) { await activeShutdownCleanup(); return; }
  serverMod.setWorkspaceLaunched(true);
  serverMod.initPostLaunch();
  const port = serverMod.getPort();

  // 注册 SDK 回调到 server.js（WS 消息路由用）
  serverMod.setSdkResolveApproval(sdkManager.resolveApproval);
  serverMod.setSdkSendUserMessage(sdkManager.sendUserMessage);
  serverMod.setSdkInterruptTurn(sdkManager.interruptTurn);

  // 自动打开浏览器，picker query保留在实际打开的公网/本地链接上。
  const protocol = serverMod.getProtocol();
  const cfg = resolveBaseConfig();
  const picker = resume?.selector === 'picker';
  const url = `${protocol}://127.0.0.1:${port}${cfg.basePath}${picker ? '?resume=1' : ''}`;
  const _token = serverMod.getAccessToken();
  const externalUrl = externalUrlFromConfig(cfg, { token: _token });
  const openUrl = externalUrl ? `${externalUrl}${picker ? '&resume=1' : ''}` : url;
  openViewerBrowser(openUrl);
  console.log(`CX Viewer (SDK mode):`);
  console.log(`  ➜ Local:   ${url}`);
  if (externalUrl) console.log(t('server.startedExternal', { url: openUrl }));
  for (const _ip of serverMod.getAllLocalIps()) {
    console.log(`  ➜ Network: ${protocol}://${_ip}:${port}${cfg.basePath}?token=${_token}${picker ? '&resume=1' : ''}`);
  }

  if (initialPrompt && resume?.selector !== 'picker') {
    sdkManager.sendUserMessage(initialPrompt).catch(err => {
      console.error('[SDK] initial prompt error:', err.message);
    });
  }

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

  let serverMod = null;
  let killPtyFn = () => {};
  setActiveShutdownCleanup(async ({ deadlineAt } = {}) => {
    killPtyFn();
    if (serverMod) await serverMod.stopViewer({ deadlineAt });
  });

  process.env.CXV_CLI_MODE = '1';

  // 启动 HTTP 服务器（工作区模式，不初始化 interceptor 日志）
  serverMod = await import('./server.js');

  // 工作区模式下 server.js 跳过了自动启动，需要手动调用
  await serverMod.startViewer();
  registerUpdateRestart(serverMod);
  if (shutdownStarted) { await serverMod.stopViewer(); return; }

  const port = serverMod.getPort();

  // 保存 extraCodexArgs 和 codexPath 供后续 launch 使用
  serverMod.setWorkspaceCodexArgs(extraCodexArgs);
  serverMod.setWorkspaceCodexPath(codexPath, isNpmVersion);

  // 自动打开浏览器
  const wsProtocol = serverMod.getProtocol();
  const cfg = resolveBaseConfig();
  const url = `${wsProtocol}://127.0.0.1:${port}${cfg.basePath}`;
  const _token = serverMod.getAccessToken();
  const externalUrl = externalUrlFromConfig(cfg, { token: _token });
  openViewerBrowser(externalUrl || url);
  console.log(`CX Viewer (Workspace):`);
  console.log(`  ➜ Local:   ${url}`);
  if (externalUrl) console.log(t('server.startedExternal', { url: externalUrl }));
  for (const _ip of serverMod.getAllLocalIps()) {
    console.log(`  ➜ Network: ${wsProtocol}://${_ip}:${port}${cfg.basePath}?token=${_token}`);
  }

  // 注册退出处理
  const { killPty } = await import('./pty-manager.js');
  killPtyFn = killPty;
}

// === 主逻辑 ===

const args = process.argv.slice(2);
const cxvLaunch = { args: [...args], cwd: process.cwd(), cliPath: fileURLToPath(import.meta.url) };
let sdkTransportOptions;
try { sdkTransportOptions = extractSdkTransportOptions(args); }
catch (error) { console.error(error.message); process.exit(1); }

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

if (args[0] === 'cleanup-terminal-history') {
  const { inventoryLegacyTerminalHistory, deleteLegacyTerminalHistory } = await import('./lib/legacy-terminal-history.js');
  const plan = inventoryLegacyTerminalHistory();
  const mib = (plan.totalBytes / (1024 * 1024)).toFixed(1);
  console.log(`[CX Viewer] Legacy terminal transcripts: ${plan.files.length} file(s), ${mib} MiB`);
  for (const file of plan.files) console.log(`  ${file.path} (${file.size} bytes)`);
  for (const item of plan.skipped) console.warn(`  skipped: ${item.path} (${item.reason})`);
  if (!args.includes('--delete')) {
    console.log('[CX Viewer] Dry run only. Re-run with --delete to remove exactly the files listed above.');
    process.exit(0);
  }
  const result = deleteLegacyTerminalHistory(plan, { confirm: true });
  console.log(`[CX Viewer] Deleted ${result.deleted.length} file(s), ${(result.totalBytes / (1024 * 1024)).toFixed(1)} MiB.`);
  for (const item of result.skipped) console.warn(`  not deleted: ${item.path} (${item.reason})`);
  process.exit(result.skipped.length > 0 ? 1 : 0);
}

if (isUninstall) {
  let uninstallFailed = false;
  const cliResult = removeCliJsInjection();
  const npmLauncher = resolveNpmCodexPath();
  const loggerResult = npmLauncher ? removeLoggerBootstrapAt(npmLauncher) : { status: 'clean' };
  const shellResult = removeShellHook();
  let appLoggerResult = null;
  try {
    const { uninstallCodexAppLogger } = await import('./lib/codex-app-logger.js');
    appLoggerResult = await uninstallCodexAppLogger();
  } catch (error) {
    appLoggerResult = { status: 'error', error: error.message };
    uninstallFailed = true;
  }

  if (cliResult === 'removed' || cliResult === 'clean') {
    console.log(t('cli.uninstall.cliCleaned'));
  } else if (cliResult === 'not_found') {
    // Silent is better for mixed mode uninstall
  } else {
    console.log(t('cli.uninstall.cliFail'));
  }
  if (loggerResult.status === 'removed') {
    console.log(`Removed CX Viewer logger bootstrap from ${loggerResult.path}`);
  }
  if (appLoggerResult?.status === 'removed') {
    console.log('Removed ChatGPT/Codex App logger service and restored config.toml.');
  } else if (appLoggerResult?.status === 'error') {
    console.warn(`Failed to remove ChatGPT/Codex App logger: ${appLoggerResult.error}`);
  }

  if (shellResult.status === 'removed') {
    console.log(t('cli.uninstall.hookRemoved', { path: shellResult.path }));
  } else if (shellResult.status === 'clean' || shellResult.status === 'not_found') {
    console.log(t('cli.uninstall.hookClean', { path: shellResult.path }));
  } else {
    console.log(t('cli.uninstall.hookFail', { error: shellResult.error }));
  }

  // 清理 statusLine 脚本（兼容历史版本遗留）
  try {
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
  if (!uninstallFailed) console.log(t('cli.uninstall.done'));
  process.exit(uninstallFailed ? 1 : 0);
}

if (isLogger) {
  // 安装/修复 hook 逻辑（原来无参数 cxv 的行为）
  let mode = 'unknown';

  const npmCodexPath = resolveNpmCodexPath();
  const npmLauncher = resolveJavascriptLauncher(npmCodexPath);
  const nativePath = resolveNativePath();
  const hasNpm = existsSync(cliPath);
  let hasCodexApp = false;
  if (process.platform === 'darwin') {
    try {
      const { findInstalledCodexApp } = await import('./lib/codex-app-logger.js');
      hasCodexApp = Boolean(findInstalledCodexApp());
    } catch {}
  }
  if (npmLauncher) mode = 'npm-launcher';
  else if (hasNpm) mode = 'npm';
  else if (nativePath) mode = 'native';
  else if (hasCodexApp) mode = 'app-only';

  if (mode === 'unknown') {
    console.error(t('cli.inject.notFound', { path: cliPath }));
    console.error('Also could not find native "codex" command in PATH.');
    console.error('Please make sure @openai/codex is installed.');
    process.exit(1);
  }

  if (mode === 'npm-launcher') {
    try {
      const bootstrapPath = resolve(__dirname, 'lib', 'logger-bootstrap.js');
      const loggerResult = injectLoggerBootstrapAt(npmLauncher, bootstrapPath);
      const shellResult = installShellHook(false);
      if (loggerResult.status === 'exists' && shellResult.status === 'exists') {
        console.log(t('cli.alreadyWorking'));
      } else {
        console.log(`[CX Viewer] Codex launcher logger: ${loggerResult.status} (${loggerResult.path})`);
        if (shellResult.status === 'installed') console.log('All READY!');
        else if (shellResult.status !== 'exists') console.log(t('cli.hook.fail', { error: shellResult.error }));
      }
      console.log(t('cli.usage.hint'));
    } catch (err) {
      console.error(`Failed to install Codex launcher logger: ${err.message}`);
      process.exit(1);
    }
  } else if (mode === 'npm') {
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
  } else if (mode === 'native') {
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
  let appLoggerFailed = false;
  // The shell hook invokes --self-heal on ordinary CLI launches. launchd owns
  // desktop logger recovery, so avoid rewriting its state on every shell run.
  if (!args.includes('--self-heal')) {
    try {
      const { installCodexAppLogger } = await import('./lib/codex-app-logger.js');
      const result = await installCodexAppLogger();
      if (result.status === 'installed' || result.status === 'updated' || result.status === 'exists') {
        console.log(`[CX Viewer] ChatGPT/Codex App logger: ${result.status} (${result.proxyUrl})`);
        console.log('[CX Viewer] Restart ChatGPT/Codex App to apply logger mode.');
      }
    } catch (error) {
      appLoggerFailed = true;
      console.error(`Failed to install ChatGPT/Codex App logger: ${error.message}`);
      if (error.code === 'CXV_CODEX_APP_LOGGER_LOCAL_PROXY_CONFLICT') {
        console.error('Remove or change the existing local openai_base_url, then run cxv -logger again.');
      }
    }
  }
  process.exit(appLoggerFailed ? 1 : 0);
}

const imArgIndex = args.indexOf('--im');
const imPlatform = imArgIndex >= 0 ? args[imArgIndex + 1] : null;

if (imArgIndex >= 0 && !imPlatform) {
  console.error('--im requires a platform (currently: dingtalk)');
  process.exit(1);
} else if (imPlatform) {
  if (imPlatform !== 'dingtalk') {
    console.error(`Unsupported IM platform: ${imPlatform}`);
    process.exit(1);
  }
  runDingTalkImMode().catch(err => {
    console.error('DingTalk IM worker error:', err.message);
    process.exit(1);
  });
} else if (args[0] === 'run') {
  runProxyCommand(args);
} else if (sdkTransportOptions.sdkMode) {
  // SDK 模式（显式 -SDK 切换）
  const { codexArgs } = normalizeCodexArgs(sdkTransportOptions.codexArgs);

  runSdkMode(codexArgs, process.cwd(), sdkTransportOptions.transport).catch(err => {
    console.error('SDK mode error:', err);
    process.exit(1);
  });
} else {
  // PTY 模式（默认）
  const { codexArgs, invocation } = normalizeCodexArgs(args);

  runCliMode(codexArgs, process.cwd(), invocation).catch(err => {
    console.error('CLI mode error:', err);
    process.exit(1);
  });
}
