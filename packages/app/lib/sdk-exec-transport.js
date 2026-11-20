import { fileURLToPath } from 'node:url';

const SDK_EXEC_LAUNCHER = fileURLToPath(new URL('./sdk-exec-launcher.sh', import.meta.url));
const SDK_EXEC_RUNNER = fileURLToPath(new URL('./sdk-exec-runner.mjs', import.meta.url));

// The manager owns queueing, proxy startup and cancellation. This transport owns
// only the official SDK client/thread; preserve the existing supervised child.
export function createSdkExecTransport({ Codex, cwd, instanceKey, codexPath, codexOptions, threadOptions, proxyPort }) {
  const options = {
    ...codexOptions,
    ...(codexPath ? { codexPathOverride: codexPath } : {}),
    env: {
      ...process.env,
      CXV_SDK_MODE: '1',
      CXV_PROJECT_DIR: cwd,
      CXV_INSTANCE_KEY: instanceKey,
      ...(proxyPort ? { OPENAI_BASE_URL: `http://127.0.0.1:${proxyPort}` } : {}),
    },
  };
  let codex = new Codex(options);
  // Use the resolver of our pinned SDK rather than duplicating platform lookup.
  const executable = codexPath || codex.exec?.executablePath;
  if (process.platform !== 'win32' && typeof executable === 'string') {
    codex = new Codex({ ...options, codexPathOverride: SDK_EXEC_LAUNCHER,
      env: { ...options.env, CXV_SDK_NODE: process.execPath,
        CXV_SDK_RUNNER: SDK_EXEC_RUNNER, CXV_SDK_EXECUTABLE: executable,
        ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      },
    });
  }
  let thread = null;
  return {
    get threadId() { return thread?.id || null; },
    runStreamed(text, { signal, threadId }) {
      if (!thread) thread = threadId
        ? codex.resumeThread(threadId, threadOptions)
        : codex.startThread(threadOptions);
      return thread.runStreamed(text, { signal });
    },
  };
}
