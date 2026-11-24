import { fileURLToPath } from 'node:url';
import { createSdkExecContextReader } from './sdk-exec-context.js';

const SDK_EXEC_LAUNCHER = fileURLToPath(new URL('./sdk-exec-launcher.sh', import.meta.url));
const SDK_EXEC_RUNNER = fileURLToPath(new URL('./sdk-exec-runner.mjs', import.meta.url));

// The manager owns queueing, proxy startup and cancellation. This transport owns
// only the official SDK client/thread; preserve the existing supervised child.
export function createSdkExecTransport({ Codex, cwd, instanceKey, codexPath, codexOptions, threadOptions, proxyPort,
  contextReaderFactory = createSdkExecContextReader }) {
  const options = {
    ...codexOptions,
    // The official SDK serializes baseUrl as openai_base_url. Environment
    // alone can leave native exec using a different provider endpoint.
    ...(proxyPort ? { baseUrl: `http://127.0.0.1:${proxyPort}` } : {}),
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
    setModel(model, reasoningEffort) {
      threadOptions = { ...threadOptions, model, modelReasoningEffort: reasoningEffort };
      // The public SDK captures options on Thread construction. Resume the same
      // native thread with fresh options; never replay its accumulated messages.
      if (thread) thread = thread.id ? codex.resumeThread(thread.id, threadOptions) : null;
    },
    async runStreamed(text, { signal, threadId }) {
      if (!thread) thread = threadId
        ? codex.resumeThread(threadId, threadOptions)
        : codex.startThread(threadOptions);
      const startedAt = Date.now();
      const streamed = await thread.runStreamed(text, { signal });
      return { events: (async function* () {
        let reader, context, revision;
        try {
          for await (const event of streamed.events) {
            if (event.type === 'thread.started' && !reader) reader = contextReaderFactory({
              threadId: event.thread_id, cwd, codexPath: executable, env: options.env, startedAt, signal });
            // Publish thread ownership before the first context update.
            if (event.type === 'thread.started') { yield event; continue; }
            context = await reader?.read({ complete: event.type === 'turn.completed' });
            const next = context && JSON.stringify(context);
            if (next && next !== revision) { revision = next; yield { type: 'context.updated', ...context }; }
            yield event.type === 'turn.completed'
              ? { ...event, context_usage: context?.usage || null, context_window: context?.context_window ?? null }
              : event;
          }
        } finally { await reader?.close(); }
      })() };
    },
  };
}
