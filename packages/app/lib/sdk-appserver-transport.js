import { isAbsolute, resolve } from 'node:path';
import { createCodexAppServerClient } from './codex-appserver-client.js';

const COLLAB_TOOLS = { spawnAgent: 'spawn_agent', sendInput: 'send_input', resumeAgent: 'resume_agent',
  wait: 'wait_agent', closeAgent: 'close_agent', sendMessage: 'send_message', followupTask: 'followup_task',
  interruptAgent: 'interrupt_agent', listAgents: 'list_agents' };
const ACTIVITY_PROBE_IDLE_MS = 10 * 60 * 1000;
const ACTIVITY_PROBE_INTERVAL_MS = 3 * 60 * 1000;
const ACTIVITY_PROBE_MAX_FAILURES = 2;

export function normalizeAppServerSkills(result, cwd) {
  if (!Array.isArray(result?.data) || result.data.length > 128
      || Buffer.byteLength(JSON.stringify(result)) > 2 * 1024 * 1024) throw new Error('Invalid native skills catalog');
  const entries = result.data.filter(entry => typeof entry?.cwd === 'string' && resolve(entry.cwd) === resolve(cwd));
  if (entries.length !== 1 || !Array.isArray(entries[0].skills) || entries[0].skills.length > 2048) {
    throw new Error('Native skills catalog belongs to a different workspace');
  }
  return entries[0].skills.filter(skill => skill?.enabled === true
    && typeof skill.name === 'string' && /^[A-Za-z0-9._:-]+$/.test(skill.name)
    && typeof skill.path === 'string' && isAbsolute(skill.path)
    && ['user', 'repo', 'system', 'admin'].includes(skill.scope)).map(skill => ({
      name: skill.name, description: typeof skill.description === 'string' ? skill.description : '',
      path: skill.path, scope: skill.scope,
      ...(typeof skill.pluginId === 'string' && skill.pluginId ? { pluginId: skill.pluginId } : {}),
    }));
}

export function normalizeAppServerMcpStatus(server) {
  if (!server || typeof server.name !== 'string' || !server.name || !server.tools
      || typeof server.tools !== 'object' || Array.isArray(server.tools)) throw new Error('Invalid MCP server status');
  const status = { connected: 'connected', failed: 'failed', authenticationRequired: 'needs-auth',
    starting: 'pending', notStarted: 'pending', disabled: 'disabled' }[server.runtimeStatus];
  return { ...server, status: typeof status === 'string' ? status : 'unknown', tools: Object.values(server.tools),
    ...(typeof server.toolsError === 'string' ? { error: server.toolsError } : {}) };
}

export function normalizeAppServerItem(item, previous = {}) {
  const raw = { ...previous, ...item };
  switch (raw.type) {
    case 'userMessage': return null; // the manager already accepted this input
    case 'agentMessage': return { ...raw, type: 'agent_message', text: raw.text || '' };
    case 'reasoning': return { ...raw, text: (raw.summary?.length ? raw.summary : raw.content || []).join('\n') };
    case 'commandExecution': return { ...raw, type: 'command_execution',
      aggregated_output: raw.aggregatedOutput || '', exit_code: raw.exitCode };
    case 'fileChange': return { ...raw, type: 'file_change' };
    case 'mcpToolCall': return { ...raw, type: 'mcp_tool_call' };
    case 'webSearch': return { ...raw, type: 'web_search',
      query: raw.action?.query || raw.action?.queries?.join('\n') || '' };
    case 'plan': return { id: raw.id, type: 'codex_tool', toolName: 'update_plan',
      input: { plan: raw.text || '', codexTurnPlan: true, nonInteractive: true, planItem: raw }, output: raw.text || '' };
    case 'collabAgentToolCall': return { id: raw.id, type: 'codex_tool',
      toolName: COLLAB_TOOLS[raw.tool] || raw.tool, input: { prompt: raw.prompt, model: raw.model,
        reasoningEffort: raw.reasoningEffort, receiverThreadIds: raw.receiverThreadIds },
      output: raw, status: raw.status };
    case 'imageView': return { id: raw.id, type: 'codex_tool', toolName: 'view_image', input: { path: raw.path }, output: raw.path };
    case 'dynamicToolCall': return { id: raw.id, type: 'codex_tool',
      toolName: raw.namespace ? `${raw.namespace}.${raw.tool}` : raw.tool,
      input: raw.arguments, output: raw.contentItems ?? raw.success ?? raw.status, status: raw.status, rawItem: raw };
    default: return { id: raw.id, type: 'codex_tool', toolName: raw.type, input: raw, output: raw, status: raw.status };
  }
}

// Keep startup configuration separate from native thread parameters. Passing
// nested config again on thread/resume can drop the restored tool set (0.169).
export function appServerThreadParams(cwd, codexOptions = {}, threadOptions = {}) {
  const config = structuredClone(codexOptions.config || {});
  if (threadOptions.additionalDirectories?.length) {
    config.sandbox_workspace_write = { ...config.sandbox_workspace_write,
      writable_roots: [...new Set([...(config.sandbox_workspace_write?.writable_roots || []),
        ...threadOptions.additionalDirectories.map(dir => resolve(cwd, dir))])] };
  }
  if (threadOptions.networkAccessEnabled !== undefined) config.sandbox_workspace_write = {
    ...config.sandbox_workspace_write, network_access: threadOptions.networkAccessEnabled,
  };
  if (threadOptions.webSearchMode) config.web_search = threadOptions.webSearchMode;
  else if (threadOptions.webSearchEnabled !== undefined) config.web_search = threadOptions.webSearchEnabled ? 'live' : 'disabled';
  if (threadOptions.modelReasoningEffort) config.model_reasoning_effort = threadOptions.modelReasoningEffort;
  return { cwd, config, ...(threadOptions.model ? { model: threadOptions.model } : {}),
    ...(threadOptions.sandboxMode ? { sandbox: threadOptions.sandboxMode } : {}),
    ...(threadOptions.approvalPolicy ? { approvalPolicy: threadOptions.approvalPolicy } : {}) };
}

// Match the pinned SDK's config argv semantics. Its serializer is private, and
// native thread JSON overrides alone do not apply startup feature registration.
export function serializeAppServerConfig(config = {}) {
  const plain = value => value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
  const value = input => {
    if (typeof input === 'string' || typeof input === 'boolean') return JSON.stringify(input);
    if (typeof input === 'number' && Number.isFinite(input)) return String(input);
    if (Array.isArray(input)) return `[${input.map(value).join(', ')}]`;
    if (plain(input)) return `{${Object.entries(input).filter(([, v]) => v !== undefined)
      .map(([key, v]) => `${JSON.stringify(key)} = ${value(v)}`).join(', ')}}`;
    throw new TypeError('Unsupported App Server config value');
  };
  if (!plain(config)) throw new TypeError('App Server config must be an object');
  const args = [];
  const flatten = (object, prefix = '') => {
    for (const [key, child] of Object.entries(object)) {
      if (!key || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new TypeError('Invalid App Server config key');
      if (child === undefined) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (plain(child) && Object.keys(child).length) flatten(child, path);
      else args.push('-c', `${path}=${value(child)}`);
    }
  };
  flatten(config); return args;
}

export function createSdkAppServerTransport({ cwd, instanceKey, codexPath, codexOptions = {},
  configOverrides = [],
  threadOptions = {}, proxyPort, onNotification, onServerRequest, onSessionReady, onDisconnected,
  setTimer = setTimeout, clearTimer = clearTimeout,
  clientFactory = createCodexAppServerClient }) {
  let client = null, initializing = null, nativeThreadId = null, active = null, stopped = false, suspectClient = null;
  const threadMetadata = new Map(), pendingServerRequests = new Set();
  const threadParams = appServerThreadParams(cwd, codexOptions, threadOptions);
  const explicitConfig = appServerThreadParams(cwd, {}, threadOptions).config;
  let modelOverride = null;
  if (threadOptions.additionalDirectories?.length) {
    explicitConfig.sandbox_workspace_write.writable_roots = threadParams.config.sandbox_workspace_write.writable_roots;
  }

  function finish(run, error) {
    if (run.done) return;
    run.done = true; run.error = error;
    clearTimer(run.lostResultTimer); run.resultRead?.abort();
    clearTimer(run.activityTimer); run.controlRead?.abort();
    clearTimeout(run.cancelTimer); run.signal?.removeEventListener('abort', run.abort);
    run.wake?.(); run.wake = null;
  }

  function noteActivity(run) {
    run.activitySeq++; run.probeFailures = 0;
    run.controlRead?.abort();
    armActivityProbe(run);
  }

  // A quiet model/tool is legal. Only two unanswered REAL control round trips
  // can mark this owned generation suspect. No cached metadata/init promises,
  // no input replay, and no teardown until a subsequent message is submitted.
  function armActivityProbe(run) {
    clearTimer(run.activityTimer);
    if (run.done || !run.turnId || run.signal?.aborted || pendingServerRequests.size) return;
    const owned = client, seq = run.activitySeq;
    const current = () => !run.done && active === run && client === owned
      && run.activitySeq === seq && !run.signal?.aborted && !pendingServerRequests.size;
    run.activityTimer = setTimer(async () => {
      run.activityTimer = null;
      if (!current()) return;
      const controller = new AbortController(); run.controlRead = controller;
      try {
        await owned.request('thread/read', { threadId: nativeThreadId, includeTurns: false },
          { signal: controller.signal, timeoutMs: 10000 });
        if (!current()) return;
        run.probeFailures = 0;
      } catch (error) {
        if (!current()) return;
        if (error?.code === 'CODEX_RPC_TIMEOUT') {
          if (++run.probeFailures >= ACTIVITY_PROBE_MAX_FAILURES) {
            suspectClient = owned;
            push(run, { type: 'turn.failed', thread_id: nativeThreadId, turn_id: run.turnId,
              status: 'failed', recovery: 'control-unresponsive', error: { code: 'turn-stuck',
                message: 'The turn became unresponsive; the SDK session will restart on the next message.' } });
            finish(run); return;
          }
        } else if (typeof error?.code === 'number') {
          // A remote JSON-RPC error is still a reply from the child's control
          // loop. Local send/abort errors cannot prove remote responsiveness.
          run.probeFailures = 0;
        }
      } finally { if (run.controlRead === controller) run.controlRead = null; }
      if (current()) armActivityProbe(run);
    }, run.probeFailures ? ACTIVITY_PROBE_INTERVAL_MS : ACTIVITY_PROBE_IDLE_MS);
    run.activityTimer?.unref?.();
  }

  // Upstream's idle-without-result grace is five seconds. Native idle carries no
  // turn ID either, so silence/idle alone cannot settle this run. Read one full
  // recent turn (never hydrate the whole thread) and require its exact native ID
  // and terminal status before recovering the missing notification.
  function armLostResultBackstop(run) {
    clearTimer(run.lostResultTimer);
    run.resultRead?.abort(); run.resultRead = null;
    if (run.done || !run.started || !run.idle || pendingServerRequests.size) return;
    const owned = client, seq = run.activitySeq;
    const current = () => !run.done && active === run && client === owned
      && run.activitySeq === seq && run.idle && !run.signal?.aborted && !pendingServerRequests.size;
    run.lostResultTimer = setTimer(async () => {
      run.lostResultTimer = null;
      if (!current()) return;
      const controller = new AbortController(); run.resultRead = controller;
      try {
        const result = await owned.request('thread/turns/list', {
          threadId: nativeThreadId, limit: 1, sortDirection: 'desc', itemsView: 'full',
        }, { signal: controller.signal, timeoutMs: 10000 });
        if (!current()) return;
        const turn = result?.data?.find(turn => turn.id === run.turnId);
        if (!turn || !['completed', 'failed', 'interrupted'].includes(turn.status)
          || !Array.isArray(turn.items) || (turn.itemsView && turn.itemsView !== 'full')) return;
        processFrame(run, { method: 'turn/completed', params: { threadId: nativeThreadId, turn } });
      } catch { /* An unsupported/failed read is not evidence of turn completion. */ }
      finally { if (run.resultRead === controller) run.resultRead = null; }
    }, 5000);
    run.lostResultTimer?.unref?.();
  }

  function push(run, event) {
    if (run.done) return;
    const bytes = Buffer.byteLength(JSON.stringify(event));
    if (run.queue.length >= 1024 || run.bytes + bytes > 16 * 1024 * 1024) {
      const error = new Error('App Server event consumer fell behind');
      finish(run, error); void client?.stop(error); return;
    }
    run.queue.push({ event, bytes }); run.bytes += bytes; run.wake?.(); run.wake = null;
  }

  function processFrame(run, frame) {
    if (run.done) return;
    const p = frame.params || {};
    if (p.threadId !== nativeThreadId || (p.turnId && p.turnId !== run.turnId)) return;
    if ((frame.method === 'turn/started' || frame.method === 'turn/completed') && p.turn?.id !== run.turnId) return;
    noteActivity(run);
    if (frame.method === 'turn/started') {
      if (p.turn?.id === run.turnId) {
        run.started = true; run.idle = false;
        push(run, { type: 'turn.started', thread_id: nativeThreadId, turn_id: run.turnId });
      }
    } else if (frame.method === 'thread/status/changed') {
      run.idle = p.status?.type === 'idle';
      if (run.idle) armLostResultBackstop(run);
    } else if (frame.method === 'item/started' || frame.method === 'item/updated' || frame.method === 'item/completed') {
      if (typeof p.item?.id !== 'string' || typeof p.item.type !== 'string') throw new Error('Invalid App Server item');
      const raw = { ...run.items.get(p.item.id), ...p.item }; run.items.set(raw.id, raw);
      const item = normalizeAppServerItem(raw);
      if (item) push(run, { type: frame.method === 'item/completed' ? 'item.completed' : 'item.updated', item });
      if (frame.method === 'item/completed') run.completed.add(raw.id);
    } else if (frame.method === 'item/agentMessage/delta' || frame.method === 'item/commandExecution/outputDelta'
        || frame.method === 'item/reasoning/summaryTextDelta' || frame.method === 'item/reasoning/textDelta') {
      const raw = run.items.get(p.itemId);
      if (!raw) return;
      if (frame.method === 'item/agentMessage/delta') raw.text = (raw.text || '') + (p.delta || '');
      else if (frame.method === 'item/commandExecution/outputDelta') raw.aggregatedOutput = (raw.aggregatedOutput || '') + (p.delta || '');
      else { const key = frame.method.includes('summary') ? 'summary' : 'content';
        const index = p.summaryIndex ?? p.contentIndex ?? 0;
        if (!Number.isSafeInteger(index) || index < 0 || index > 1024) throw new Error('Invalid App Server reasoning index');
        raw[key] ||= []; raw[key][index] = (raw[key][index] || '') + (p.delta || ''); }
      const item = normalizeAppServerItem(raw); if (item) push(run, { type: 'item.updated', item });
    } else if (frame.method === 'turn/plan/updated') {
      run.plan = { id: `plan:${run.turnId}`, type: 'todo_list',
        _appServerPlan: true, explanation: p.explanation, items: (p.plan || []).map(step => ({ text: step.step,
          completed: step.status === 'completed', status: step.status === 'inProgress' ? 'in_progress' : step.status })) };
      push(run, { type: 'item.updated', item: run.plan });
    } else if (frame.method === 'thread/tokenUsage/updated') {
      run.usage = p.tokenUsage?.last;
      run.contextWindow = p.tokenUsage?.modelContextWindow;
    }
    else if (frame.method === 'error') {
      push(run, { type: 'error', message: p.error?.message || 'App Server error', error: p.error,
        willRetry: p.willRetry, thread_id: nativeThreadId, turn_id: run.turnId });
    } else if (frame.method === 'turn/completed' && p.turn?.id === run.turnId) {
      for (const raw of p.turn.items || []) {
        if (!run.completed.has(raw.id)) { const item = normalizeAppServerItem(raw, run.items.get(raw.id));
          if (item) push(run, { type: 'item.completed', item }); }
      }
      if (run.plan) push(run, { type: 'item.completed', item: run.plan });
      if (p.turn.status === 'completed') push(run, { type: 'turn.completed', usage: run.usage, context_window: run.contextWindow,
        thread_id: nativeThreadId, turn_id: run.turnId });
      else push(run, { type: 'turn.failed', thread_id: nativeThreadId, turn_id: run.turnId,
        status: p.turn.status, error: { ...p.turn.error, message: p.turn.status === 'interrupted'
        ? 'Turn interrupted' : p.turn.error?.message || 'Codex turn failed' } });
      finish(run);
    }
  }

  function receive(frame) {
    onNotification?.(frame);
    if (frame.method === 'serverRequest/resolved') {
      pendingServerRequests.delete(frame.params?.requestId);
      if (active) { noteActivity(active); armLostResultBackstop(active); }
      return;
    }
    if (frame.id !== undefined) {
      const owned = client;
      pendingServerRequests.add(frame.id);
      if (active) noteActivity(active);
      const reply = (result, error) => {
        if (owned !== client) return false;
        try {
          const replied = owned?.respond(frame.id, result, error) ?? false;
          if (replied !== false) {
            pendingServerRequests.delete(frame.id);
            if (active) { noteActivity(active); armLostResultBackstop(active); }
          }
          return replied;
        }
        catch (failure) { void owned?.stop(failure); return false; }
      };
      if (onServerRequest) onServerRequest(frame, reply);
      else reply(null, { code: -32601, message: 'Unsupported server request' });
      return;
    }
    const run = active;
    if (!run || run.done) return;
    if (!run.turnId) {
      run.beforeBytes += Buffer.byteLength(JSON.stringify(frame));
      if (run.beforeStart.length >= 1024 || run.beforeBytes > 16 * 1024 * 1024) {
        finish(run, new Error('Too many notifications before turn acceptance')); void client?.stop(); return; }
      run.beforeStart.push(frame);
    } else processFrame(run, frame);
  }

  async function initialize(threadId, signal) {
    if (stopped) throw new Error('App Server transport stopped');
    if (suspectClient && client === suspectClient) {
      const retiring = client; client = null; suspectClient = null;
      await retiring.stop(new Error('Replacing unresponsive App Server on next message'));
      signal?.throwIfAborted();
      if (stopped) throw new Error('App Server transport stopped');
    }
    if (client && nativeThreadId && !initializing) {
      if (threadId && threadId !== nativeThreadId) throw new Error('App Server transport belongs to a different thread');
      return;
    }
    if (initializing) return initializing;
    const owned = clientFactory({ codexPath, cwd,
      args: [...serializeAppServerConfig(codexOptions.config || {}), ...configOverrides.flatMap(value => ['-c', value]),
        ...serializeAppServerConfig(explicitConfig),
        ...(proxyPort ? ['-c', `openai_base_url=${JSON.stringify(`http://127.0.0.1:${proxyPort}`)}`] : [])], env: { ...process.env, ...codexOptions.env,
      CXV_PROJECT_DIR: cwd, CXV_INSTANCE_KEY: instanceKey, CXV_SDK_MODE: '1',
      ...(proxyPort ? { OPENAI_BASE_URL: `http://127.0.0.1:${proxyPort}` } : {}),
    } });
    client = owned; owned.subscribe(frame => { if (client === owned) receive(frame); });
    threadMetadata.clear(); pendingServerRequests.clear();
    void owned.closed.then(() => { if (client !== owned) return;
      client = null; try { onDisconnected?.(); } catch {}
      if (active) finish(active, active.signal?.aborted ? active.signal.reason : new Error('App Server disconnected')); });
    initializing = (async () => {
      await owned.request('initialize', { clientInfo: { name: 'cx_viewer', version: '1.1.20' },
        capabilities: { experimentalApi: true } }, { signal });
      owned.notify('initialized');
      const target = threadId || nativeThreadId;
      const { config: startupConfig, ...nativeParams } = threadParams;
      const result = await owned.request(target ? 'thread/resume' : 'thread/start', {
        ...nativeParams, ...(target ? { threadId: target } : {}),
      }, { signal });
      if (!result.thread?.id || (target && result.thread.id !== target)) throw new Error('App Server returned a different thread');
      nativeThreadId = result.thread.id;
      onSessionReady?.(result.thread);
    })();
    try { await initializing; }
    catch (error) { await owned.stop(error); if (client === owned) client = null; throw error; }
    finally { initializing = null; }
  }

  return {
    get threadId() { return nativeThreadId; },
    setModel(model, reasoningEffort) {
      modelOverride = { model, effort: reasoningEffort };
      threadParams.model = model;
    },
    async ownsThread(threadId) {
      const owned = client, seen = new Set();
      const prove = async id => {
        if (!owned || owned !== client || typeof id !== 'string' || !id) return false;
        if (id === nativeThreadId) return true;
        if (seen.has(id) || seen.size >= 32) return false;
        seen.add(id);
        let thread = threadMetadata.get(id);
        if (!thread) {
          const result = await owned.request('thread/read', { threadId: id, includeTurns: false });
          if (client !== owned || result.thread?.id !== id) return false;
          thread = result.thread;
          threadMetadata.set(id, thread);
          while (threadMetadata.size > 128) threadMetadata.delete(threadMetadata.keys().next().value);
        }
        const source = thread.source?.subAgent;
        const spawn = source?.thread_spawn || source?.threadSpawn;
        return prove(thread.parentThreadId || spawn?.parent_thread_id || spawn?.parentThreadId);
      };
      try { return await prove(threadId); } catch { return false; }
    },
    async readThread(threadId) {
      if (!await this.ownsThread(threadId)) throw new Error('Thread belongs to a different App Server root');
      if (threadMetadata.has(threadId)) return structuredClone(threadMetadata.get(threadId));
      const owned = client;
      const result = await owned.request('thread/read', { threadId, includeTurns: false });
      if (client !== owned || result.thread?.id !== threadId) throw new Error('App Server thread changed');
      return result.thread;
    },
    async getMcpServerStatus() {
      // A panel read must never initialize a process/thread or submit a turn.
      const owned = client, threadId = nativeThreadId;
      if (!owned || !threadId || initializing || stopped || suspectClient === owned) return null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('MCP status timeout')), 10000);
      timer.unref?.();
      try {
        const servers = [], cursors = new Set();
        let cursor, bytes = 0;
        do {
          const page = await owned.request('mcpServerStatus/list', { threadId, limit: 100,
            ...(cursor !== undefined ? { cursor } : {}) }, { signal: controller.signal, timeoutMs: 10000 });
          controller.signal.throwIfAborted();
          if (client !== owned || stopped) throw new Error('App Server changed during MCP status read');
          if (!Array.isArray(page?.data) || (page.nextCursor != null && typeof page.nextCursor !== 'string')) {
            throw new Error('Invalid MCP status page');
          }
          bytes += Buffer.byteLength(JSON.stringify(page));
          if (bytes > 16 * 1024 * 1024 || servers.length + page.data.length > 1024) throw new Error('MCP status exceeds limit');
          servers.push(...page.data.map(normalizeAppServerMcpStatus));
          cursor = page.nextCursor;
          if (cursor != null) {
            if (cursors.size >= 128 || cursors.has(cursor)) throw new Error('Repeated or excessive MCP status cursor');
            cursors.add(cursor);
          }
        } while (cursor != null);
        return servers;
      } finally { clearTimeout(timer); }
    },
    async getSkills() {
      // A menu read cannot initialize a process/thread or submit a turn.
      const owned = client;
      if (!owned || !nativeThreadId || initializing || stopped || suspectClient === owned) return null;
      const result = await owned.request('skills/list', { cwds: [cwd], forceReload: true }, { timeoutMs: 10000 });
      if (client !== owned || stopped) throw new Error('App Server changed during skills read');
      return normalizeAppServerSkills(result, cwd);
    },
    async runStreamed(text, { signal, threadId } = {}) {
      if (active) throw new Error('App Server turn already running');
      signal?.throwIfAborted(); await initialize(threadId, signal); signal?.throwIfAborted();
      const owned = client;
      const run = { queue: [], bytes: 0, beforeStart: [], beforeBytes: 0, turnId: null, items: new Map(), completed: new Set(), signal, done: false,
        activitySeq: 0, started: false, idle: false, probeFailures: 0 };
      active = run;
      const interrupt = () => {
        if (!run.turnId || run.interrupting || run.done) return;
        run.interrupting = true;
        void owned.request('turn/interrupt', { threadId: nativeThreadId, turnId: run.turnId })
          .catch(error => { finish(run, error); void owned.stop(error); });
      };
      run.abort = () => { interrupt(); if (run.done) return; run.cancelTimer = setTimeout(() => {
        finish(run, signal.reason); void owned.stop(signal.reason);
      }, 5000); };
      signal?.addEventListener('abort', run.abort, { once: true });
      push(run, { type: 'thread.started', thread_id: nativeThreadId });
      void owned.request('turn/start', { threadId: nativeThreadId, input: [{ type: 'text', text }],
        ...(modelOverride || {}) })
        .then(result => {
          if (run.done) return;
          if (!result.turn?.id) throw new Error('App Server did not return a turn id');
          run.turnId = result.turn.id;
          for (const frame of run.beforeStart) processFrame(run, frame);
          run.beforeStart = []; run.beforeBytes = 0; if (signal?.aborted) interrupt();
          armActivityProbe(run);
        }).catch(error => { finish(run, error); void owned.stop(error); });
      if (signal?.aborted) run.abort();
      return { events: (async function* () {
        try {
          while (true) {
            if (run.queue.length) { const next = run.queue.shift(); run.bytes -= next.bytes; yield next.event; continue; }
            if (run.done) { if (run.error) throw run.error; return; }
            await new Promise(resolve => { run.wake = resolve; });
          }
        } finally {
          if (!run.done) { finish(run, new Error('App Server event consumer closed')); await owned.stop(); }
          if (active === run) active = null;
        }
      })() };
    },
    async stop() { stopped = true; if (active) finish(active, new Error('App Server transport stopped')); await client?.stop(); },
  };
}
