/**
 * Tab Worker — child process for each Electron tab.
 * Launched via fork() from electron/main.js.
 * Each worker runs an isolated proxy + server + Codex PTY.
 *
 * Uses workspace mode (CXV_WORKSPACE_MODE=1) so interceptor.js skips auto-init.
 * Then manually: startViewer() → initForWorkspace() → spawnCodex().
 * This mirrors the workspace-launch flow behind /api/workspaces/launch (cf. cli.js runCliMode).
 */
import { dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { electronRuntimePath, resolveElectronRuntimeRoot } from './runtime-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const runtimeRoot = resolveElectronRuntimeRoot({ electronDir: __dirname });
const runtimeFile = (...segments) => electronRuntimePath(runtimeRoot, ...segments);
// Windows 下 import(绝对路径) 会被拒 (ERR_UNSUPPORTED_ESM_URL_SCHEME)；统一走 pathToFileURL。
// POSIX 下等价 —— pathToFileURL('/abs/foo.js').href === 'file:///abs/foo.js'，Node ESM 对两种形式行为等价。
const importAbs = (p) => import(pathToFileURL(p).href);

// Set env BEFORE any imports of server.js / interceptor.js
if (process.platform === 'win32' && !process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = '16';
}
process.env.CXV_CLI_MODE = '1';
process.env.CXV_WORKSPACE_MODE = '1';
process.env.CXV_START_PORT = process.env.CXV_START_PORT || '7048';
process.env.CXV_MAX_PORT = process.env.CXV_MAX_PORT || '7099';

// Receive launch command from parent
process.on('message', async (msg) => {
  if (msg.type === 'launch') {
    try {
      await launch(msg);
    } catch (err) {
      try { process.send({ type: 'error', message: err.message }); } catch {}
      process.exit(1);
    }
  }
  if (msg.type === 'shutdown') {
    await shutdown();
  }
});

// Safety net: parent died
process.on('disconnect', async () => {
  await shutdown();
});

let serverMod = null;
let killPtyFn = null;

async function launch({ path: projectPath, extraArgs = [], codexPath, isNpmVersion }) {
  console.log('[worker] launch:', projectPath, 'codex:', codexPath, 'npm:', isNpmVersion);
  const { normalizeCodexArgs } = await importAbs(runtimeFile('lib', 'cli-args.js'));
  const normalized = normalizeCodexArgs(Array.isArray(extraArgs) ? extraArgs : []);
  const codexArgs = normalized.codexArgs;

  // 1. Register hooks (idempotent)
  const { ensureHooks } = await importAbs(runtimeFile('lib', 'ensure-hooks.js'));
  ensureHooks();

  // 2. Start proxy
  const { startProxy } = await importAbs(runtimeFile('proxy.js'));
  const proxyPort = await startProxy();
  process.env.CXV_PROXY_PORT = String(proxyPort);
  process.env.CXV_PROJECT_DIR = projectPath;

  // 3. Import server.js (workspace mode → skips auto-start)
  serverMod = await importAbs(runtimeFile('server.js'));

  // 4. Manually start server
  await serverMod.startViewer();

  // 5. Get port
  const port = serverMod.getPort();
  if (!port) throw new Error('Server failed to bind port');

  // 6. Store Codex path/args for potential later use by server APIs
  if (codexPath) {
    serverMod.setWorkspaceCodexArgs(codexArgs);
    serverMod.setWorkspaceCodexPath(codexPath, isNpmVersion);
  }

  // 7. Initialize workspace log directory (sets LOG_FILE, _projectName, _logDir)
  //    forceNew: false — 复用最近的日志文件以保留历史数据
  const { initForWorkspace } = await importAbs(runtimeFile('interceptor.js'));
  const result = initForWorkspace(projectPath, { forceNew: false });

  // 7b. Mark workspace as launched so React app shows chat view instead of workspace selector
  serverMod.setWorkspaceLaunched(true);

  // 7c. Start log watcher, stats worker, streaming status (mirrors /api/workspaces/launch logic)
  serverMod.initPostLaunch();

  // 8. Spawn Codex PTY before reporting the tab ready. spawnCodexRequest resolves
  // once the process and its listeners exist; terminal readiness is then driven
  // by the canonical headless-terminal snapshot flow instead of raw PTY bytes. In
  // particular, resume history may intentionally be suppressed, so waiting for
  // its first byte would delay the whole desktop tab without making it usable.
  const { spawnCodexRequest, killPty, onPtyExit } = await importAbs(runtimeFile('pty-manager.js'));
  killPtyFn = killPty;

  onPtyExit((code) => {
    try { process.send({ type: 'pty-exit', code }); } catch {}
  });

  if (codexPath) {
    try {
      console.log('[worker] spawnCodex proxyPort:', proxyPort, 'serverPort:', port, 'path:', projectPath);
      await spawnCodexRequest({
        proxyPort, cwd: projectPath, args: codexArgs, codexPath, isNpmVersion,
        serverPort: port, invocation: normalized.invocation,
      });
    } catch (err) {
      try { process.send({ type: 'pty-error', message: err.message }); } catch {}
      // spawnCodex 失败时不再 send 'ready'：让 main.js 30s timeout 自动标 tab error，
      // 避免前端激活一个无 PTY 的 tab 出现"看似可用但黑屏"的体验。
      return;
    }
  }

  // 9. Notify parent immediately after a successful spawn. The web terminal can
  // connect while resume history is being parsed and receive its safe snapshot.
  const token = serverMod.getAccessToken();
  console.log('[worker] sending ready:', port, result.projectName);
  process.send({
    type: 'ready',
    port,
    token,
    projectName: result.projectName,
  });
}

async function shutdown() {
  try {
    if (killPtyFn) killPtyFn();
    if (serverMod) await serverMod.stopViewer().catch(() => {});
  } catch {}
  process.exit(0);
}
