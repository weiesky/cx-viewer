import { resolve } from 'node:path';

const SKIP_ARGS = new Set([
  '--version', '-v', '--v', '--help', '-h',
  'doctor', 'install', 'update', 'upgrade', 'auth', 'setup-token',
  'agents', 'plugin', 'plugins', 'mcp',
]);

function shouldStart() {
  if (process.env.CXV_LOGGER_BOOTSTRAP_DISABLED === '1') return false;
  if (process.env.CXV_WORKSPACE_MODE === '1' || process.env.CXV_CLI_MODE === '1') return false;
  return !SKIP_ARGS.has(process.argv[2]);
}

export async function bootstrapLogger() {
  if (!shouldStart()) return { active: false };

  const runtime = await startLoggerCapture();
  if (!runtime.active) return runtime;

  // Global Codex flags go before a subcommand. The native binary therefore
  // receives the overrides regardless of whether it was launched as TUI,
  // exec, resume, or through an IDE that invokes the npm launcher directly.
  process.argv.splice(2, 0, ...runtime.codexArgs);
  return runtime;
}

export async function startLoggerCapture() {
  // These are set before importing CX Viewer modules: the capture runtime must
  // never auto-open the full viewer or enqueue writes that can be lost when the
  // npm launcher mirrors the native child's exit with process.exit().
  const bootstrapEnv = ['CXV_CAPTURE_ONLY', 'CXV_SYNC_LOG_WRITES', 'CXV_WORKSPACE_MODE', 'CXV_PROJECT_DIR'];
  const previousEnv = Object.fromEntries(bootstrapEnv.map(key => [key, process.env[key]]));
  const restoreBootstrapEnv = () => {
    for (const key of bootstrapEnv) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  };
  process.env.CXV_CAPTURE_ONLY = '1';
  process.env.CXV_SYNC_LOG_WRITES = '1';
  process.env.CXV_WORKSPACE_MODE = '1';
  process.env.CXV_PROJECT_DIR = resolve(process.cwd());

  try {
    const interceptor = await import('../interceptor.js');
    interceptor.initForWorkspace(process.env.CXV_PROJECT_DIR);

    const { readOriginalOpenAiBaseUrl } = await import('./codex-config.js');
    const originalBase = process.env.CXV_ORIGINAL_BASE_URL
      || process.env.OPENAI_BASE_URL
      || readOriginalOpenAiBaseUrl();
    process.env.CXV_ORIGINAL_BASE_URL = originalBase || 'https://api.openai.com/v1';
    process.env.CXV_ORIGINAL_CHATGPT_BASE_URL ||= 'https://chatgpt.com/backend-api/codex';

    const loopback = '127.0.0.1,localhost,::1';
    const existingNoProxy = process.env.NO_PROXY || process.env.no_proxy || '';
    process.env.NO_PROXY = process.env.no_proxy = existingNoProxy
      ? `${existingNoProxy},${loopback}`
      : loopback;

    const { startProxy, stopProxy } = await import('../proxy.js');
    const proxyPort = await startProxy();
    restoreBootstrapEnv();

    const close = () => {
      try { stopProxy(); } catch {}
    };
    process.once('exit', close);
    return {
      active: true,
      proxyPort,
      codexArgs: ['-c', `openai_base_url="http://127.0.0.1:${proxyPort}/v1"`],
      close,
    };
  } catch (error) {
    restoreBootstrapEnv();
    // Logging must never make Codex unusable. A failed bootstrap leaves the
    // original argv untouched except for no model-routing overrides.
    if (process.env.CXV_DEBUG) {
      console.error('[CX Viewer Logger] bootstrap failed:', error?.stack || error);
    }
    return { active: false, error };
  }
}

export const loggerBootstrapResult = await bootstrapLogger();
