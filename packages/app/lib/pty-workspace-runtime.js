import { resolve } from 'node:path';
import { createProxy } from '../proxy.js';
import { APPROVALS_REVIEWER_DEFAULT, isSupportedApprovalsReviewer, normalizeApprovalsReviewer } from './approval-reviewer.js';
import { createAppServerBridge } from './appserver-bridge.js';
import { inspectCodexSystemPromptSupport } from './codex-appserver-capabilities.js';
import { appendCxvFinalConfigArgs, getReasoningSummaryConfigArgs, getDefaultModeRequestUserInputConfigArgs, hasBypassPermissions, parseCodexInvocation } from './cli-args.js';
import { appendOtelTraceExporterConfigArgsOnce, getOtelTraceExporterConfigArgs, OTEL_TRACE_HEADERS_ENV, withOtelTraceAuthHeader } from './otel-config.js';

// The caller supplies already-selected launch args. This function never decides
// permission inheritance and never changes process.env or the boot TUI runtime.
export async function startPtyWorkspaceRuntime({ cwd, instanceKey, projectId, pty, args = [],
  codexPath, isNpmVersion = false, rawDir, logDir, serverPort, serverProtocol = 'http',
  otelToken, approvalsReviewer = null, env = process.env, signal = null,
  callbacks = {}, requireAppServerBridge = false, systemPromptCapability = null }) {
  if (typeof cwd !== 'string' || !cwd || !/^cxv-[a-f0-9]{36}$/.test(instanceKey || '')
      || typeof projectId !== 'string' || !projectId || typeof codexPath !== 'string' || !codexPath
      || !Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535
      || !['http', 'https'].includes(serverProtocol) || !Array.isArray(args)
      || args.some(arg => typeof arg !== 'string' || arg.includes('\0'))
      || !pty || typeof pty.killPty !== 'function' || typeof pty.spawnCodexRequest !== 'function'
      || !env || typeof env !== 'object' || Array.isArray(env)
      || typeof callbacks.onEntry !== 'function'
      || [rawDir, logDir, otelToken].some(value => typeof value !== 'string' || !value || value.includes('\0'))
      || (approvalsReviewer !== null && !isSupportedApprovalsReviewer(approvalsReviewer))) {
    throw new TypeError('Invalid PTY workspace runtime configuration');
  }
  signal?.throwIfAborted();
  const scope = Object.freeze({ cwd: resolve(cwd), instanceKey, projectId });
  const proxy = createProxy(), owner = createAppServerBridge();
  const childEnv = { ...env, CXV_PROJECT_DIR: scope.cwd, CXV_INSTANCE_KEY: instanceKey, CXVIEWER_PORT: String(serverPort) };
  if (hasBypassPermissions(args)) childEnv.CXV_BYPASS_PERMISSIONS = '1';
  else delete childEnv.CXV_BYPASS_PERMISSIONS;
  const loopback = '127.0.0.1,localhost,::1';
  childEnv.NO_PROXY = childEnv.no_proxy = [childEnv.NO_PROXY || childEnv.no_proxy, loopback].filter(Boolean).join(',');
  childEnv[OTEL_TRACE_HEADERS_ENV] = withOtelTraceAuthHeader(childEnv[OTEL_TRACE_HEADERS_ENV], otelToken);
  const otelArgs = getOtelTraceExporterConfigArgs(`${serverProtocol}://127.0.0.1:${serverPort}`);
  const uiPrefix = `${instanceKey}:`;
  const scopedAsk = request => ({ ...request, ...scope, uiId: uiPrefix + request.uiId });
  const ownUiId = id => typeof id === 'string' && id.startsWith(uiPrefix) ? id.slice(uiPrefix.length) : null;
  let bridge = null, stopped = false, stopping = null;
  let activeReviewer = approvalsReviewer ? normalizeApprovalsReviewer(approvalsReviewer) : APPROVALS_REVIEWER_DEFAULT;
  function stop() {
    if (stopping) return stopping;
    stopped = true;
    signal?.removeEventListener('abort', onAbort);
    const ptyStop = pty.killPty();
    const nativeStop = bridge?.stop();
    proxy.stop();
    stopping = Promise.all([ptyStop, nativeStop]);
    stopping.catch(() => { stopping = null; });
    return stopping;
  }
  const check = () => {
    signal?.throwIfAborted();
    if (stopped) throw new DOMException('PTY workspace startup cancelled', 'AbortError');
  };
  const onAbort = () => { void stop().catch(error => callbacks.onWarning?.(error)); };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const proxyPort = await proxy.start({ captureContext: scope, resolveNativeRole: owner.getNativeProxyRole });
    check();
    const baseArgs = [...getReasoningSummaryConfigArgs(), ...getDefaultModeRequestUserInputConfigArgs(), '-c', `openai_base_url="http://127.0.0.1:${proxyPort}/v1"`];
    const capability = systemPromptCapability || inspectCodexSystemPromptSupport(codexPath);
    owner.setAppServerTurnTerminalListener(callbacks.onTurnTerminal || null);
    owner.setAppServerAgentMessageDeltaListener(callbacks.onAgentMessageDelta || null);
    try {
      bridge = await owner.startAppServerBridge({ cwd: scope.cwd, codexPath, rawDir, env: childEnv, signal,
        extraConfigArgs: appendOtelTraceExporterConfigArgsOnce(baseArgs, otelArgs),
        systemPromptCapability: capability, systemPromptLogDir: logDir,
        resolveSystemPromptModel: callbacks.resolveSystemPromptModel,
        onApprovalsReviewerActive: value => { activeReviewer = normalizeApprovalsReviewer(value); callbacks.onApprovalsReviewerActive?.(value, scope); },
        onRequestUserInput: request => callbacks.onRequestUserInput?.(scopedAsk(request)) === true,
        onRequestUserInputCleared: request => callbacks.onRequestUserInputCleared?.(scopedAsk(request)),
        onAgentLoopStart: data => callbacks.onAgentLoopStart?.({ ...data, ...scope }),
        onAgentLoopEnd: data => callbacks.onAgentLoopEnd?.({ ...data, ...scope }),
        onTaskSnapshot: data => callbacks.onTaskSnapshot?.({ ...data, ...scope }),
        writeLogEntry: (entry, context) => callbacks.onEntry?.({ ...entry, _instanceKey: instanceKey }, { ...context, ...scope }),
      });
    } catch (error) {
      check();
      if (requireAppServerBridge) throw error;
      callbacks.onWarning?.(error);
    }
    check();
    const reviewerArgs = approvalsReviewer ? ['-c', `approvals_reviewer="${normalizeApprovalsReviewer(approvalsReviewer)}"`] : [];
    if (!bridge && approvalsReviewer) callbacks.onApprovalsReviewerActive?.(approvalsReviewer, scope);
    const tuiArgs = appendOtelTraceExporterConfigArgsOnce(appendCxvFinalConfigArgs([
      ...baseArgs, ...(bridge ? ['--remote', `ws://127.0.0.1:${bridge.proxyPort}`] : []),
      ...reviewerArgs, ...args,
    ], { proxyPort }), otelArgs);
    await pty.spawnCodexRequest({ cwd: scope.cwd, args: tuiArgs, env: childEnv,
      codexPath, isNpmVersion, serverPort, invocation: parseCodexInvocation(tuiArgs) });
    check();
    return {
      nativeProxyRoles: !!bridge,
      proxyPort, appServerPort: bridge?.appServerPort || null, stop,
      getContext: owner.getAppServerRuntimeContext,
      getInputState: owner.getAppServerInputState,
      getAgentLoopSnapshot: owner.getAppServerAgentLoopSnapshot,
      getTaskState: owner.getAppServerTaskState,
      systemPromptCapability: bridge?.systemPromptCapability || { verified: false, append: false, override: false },
      getApprovalsReviewerState() { return { approvalsReviewer: activeReviewer, nativeAvailable: true, appliedToRuntime: !!bridge }; },
      setApprovalsReviewer(value) {
        if (!isSupportedApprovalsReviewer(value)) throw new TypeError('Unsupported approvals reviewer');
        if (bridge) { bridge.setApprovalsReviewer(value); activeReviewer = normalizeApprovalsReviewer(value); }
        return { appliedToRuntime: !!bridge, appliesOnNextTurn: !!bridge };
      },
      resolveRequestUserInput(id, answers) { const nativeId = ownUiId(id); return nativeId !== null && !!bridge?.resolveRequestUserInput(nativeId, answers); },
      cancelRequestUserInput(id) { const nativeId = ownUiId(id); return nativeId !== null && !!bridge?.cancelRequestUserInput(nativeId); },
      releaseRequestUserInputToTui(id) { const nativeId = ownUiId(id); return nativeId !== null && !!bridge?.releaseRequestUserInputToTui(nativeId); },
    };
  } catch (error) {
    await stop();
    if (signal?.aborted) signal.throwIfAborted();
    throw error;
  }
}
