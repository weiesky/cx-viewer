import test from 'node:test';
import assert from 'node:assert/strict';
import { appServerThreadParams, createSdkAppServerTransport, normalizeAppServerItem, normalizeAppServerMcpStatus, normalizeAppServerSkills, serializeAppServerConfig } from '../lib/sdk-appserver-transport.js';

function fixture(mode = 'success', options = {}) {
  const calls = [], raw = [];
  let notify, close, replyTurn, stopped = 0;
  const closed = new Promise(resolve => { close = resolve; });
  const frame = (method, params) => notify({ method, params });
  const client = { closed, subscribe(fn) { notify = fn; }, notify(method, params) { calls.push({ method, params }); },
    deliver(frame) { notify(frame); },
    respond(id, result, error) { calls.push({ responseId: id, result, error }); },
    async stop() { stopped++; close(); },
    async request(method, params, requestOptions) {
      calls.push({ method, params, ...(requestOptions ? { options: requestOptions } : {}) });
      if (method === 'skills/list') return options.readSkills(params, requestOptions);
      if (method === 'mcpServerStatus/list') return options.readMcpStatus(params, requestOptions);
      if (method === 'thread/turns/list') return options.readTurns?.(params, requestOptions) || { data: [] };
      if (method === 'thread/read' && options.readControl) return options.readControl(params, requestOptions);
      if (method === 'initialize') return {};
      if (method === 'thread/start' || method === 'thread/resume') return { thread: { id: params.threadId || 'root' } };
      if (method === 'thread/read') return { thread: { id: params.threadId, cwd: '/fixture', source: { subAgent: { thread_spawn: {
        parent_thread_id: params.threadId === 'child' ? 'root' : params.threadId === 'nested' ? 'child' : 'unrelated',
      } } } } };
      if (method === 'turn/interrupt') {
        frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'interrupted' } }); return {};
      }
      if (method !== 'turn/start') return {};
      frame('turn/completed', { threadId: 'root', turn: { id: 'old', status: 'failed' } });
      frame('turn/started', { threadId: 'root', turn: { id: 'turn', status: 'inProgress' } });
      if (mode === 'hold-start') return new Promise(resolve => { replyTurn = () => resolve({ turn: { id: 'turn' } }); });
      if (mode === 'lost-result') return { turn: { id: 'turn' } };
      frame('item/completed', { threadId: 'child', turnId: 'child-turn', item: { id: 'child', type: 'agentMessage', text: 'child secret' } });
      frame('turn/plan/updated', { threadId: 'root', turnId: 'turn', plan: [
        { step: 'Read', status: 'completed' }, { step: 'Verify', status: 'inProgress' }, { step: 'Record', status: 'pending' },
      ] });
      frame('item/started', { threadId: 'root', turnId: 'turn', item: { id: 'message', type: 'agentMessage', text: '' } });
      frame('item/agentMessage/delta', { threadId: 'root', turnId: 'turn', itemId: 'message', delta: 'hello' });
      frame('item/completed', { threadId: 'root', turnId: 'turn', item: { id: 'message', type: 'agentMessage' } });
      frame('thread/tokenUsage/updated', { threadId: 'root', turnId: 'turn', tokenUsage: { last: { inputTokens: 3, outputTokens: 2 } } });
      frame('error', { threadId: 'root', turnId: 'old', error: { message: 'late old error' } });
      frame('error', { threadId: 'root', turnId: 'turn', error: { message: 'retrying',
        codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } }, additionalDetails: 'fixture detail' }, willRetry: true });
      frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: mode === 'failure' ? 'failed' : 'completed',
        error: mode === 'failure' ? { message: 'terminal failure', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 503 } } } : null, items: [] } });
      return { turn: { id: 'turn' } };
    },
  };
  const transport = createSdkAppServerTransport({ cwd: '/fixture', instanceKey: 'a', codexPath: '/fake',
    ...(options.timers || {}), onServerRequest: options.onServerRequest,
    clientFactory: () => client, onNotification: f => raw.push(f) });
  return { transport, calls, raw, frame, client, close, replyTurn: () => replyTurn(), get stopped() { return stopped; } };
}

function lostResultFixture(options = {}) {
  const timers = new Map(); let seq = 0;
  const f = fixture('lost-result', { ...options, timers: {
    setTimer(fn, ms) { const id = ++seq; timers.set(id, { fn, ms }); return id; },
    clearTimer(id) { timers.delete(id); },
  } });
  const idle = () => f.frame('thread/status/changed', { threadId: 'root', status: { type: 'idle' } });
  const fire = async () => {
    const pending = [...timers].filter(([, timer]) => timer.ms === 5000);
    for (const [id, { fn }] of pending) { timers.delete(id); await fn(); }
  };
  const probe = async ms => {
    const next = [...timers].find(([, timer]) => timer.ms === ms);
    assert.ok(next, `expected activity timer ${ms}`); timers.delete(next[0]); await next[1].fn();
  };
  return Object.assign(f, { timers, idle, fire, probe });
}

test('lost native terminal is recovered only from an exact full terminal turn after idle grace', async () => {
  for (const status of ['completed', 'failed', 'interrupted']) {
    const f = lostResultFixture({ readTurns: () => ({ data: [{ id: 'turn', status, itemsView: 'full',
      items: [{ id: 'recovered', type: 'agentMessage', text: 'durable reply' }], error: { message: 'durable failure' } }] }) });
    try {
      const stream = await f.transport.runStreamed('accepted'); const it = stream.events[Symbol.asyncIterator]();
      assert.equal((await it.next()).value.type, 'thread.started');
      assert.equal((await it.next()).value.type, 'turn.started');
      f.idle(); assert.equal(f.calls.some(call => call.method === 'thread/turns/list'), false);
      await f.fire();
      const recovered = []; for await (const event of it) recovered.push(event);
      assert.equal(recovered[0].item.text, 'durable reply');
      assert.equal(recovered.at(-1).type, status === 'completed' ? 'turn.completed' : 'turn.failed');
      const read = f.calls.find(call => call.method === 'thread/turns/list');
      assert.deepEqual(read.params, { threadId: 'root', limit: 1, sortDirection: 'desc', itemsView: 'full' });
      assert.equal(read.options.timeoutMs, 10000); assert.equal(f.stopped, 0);
      assert.equal(f.calls.filter(call => call.method === 'turn/start').length, 1, 'recovery must not replay input');
    } finally { await f.transport.stop(); }
  }
});

test('idle, other-turn terminal, partial items, in-progress snapshots and read rejection never invent completion', async () => {
  for (const result of [null, { data: [{ id: 'old', status: 'completed', items: [] }] },
    { data: [{ id: 'turn', status: 'inProgress', items: [] }] },
    { data: [{ id: 'turn', status: 'completed', items: [], itemsView: 'summary' }] }]) {
    const f = lostResultFixture({ readTurns: () => { if (!result) throw Object.assign(new Error('unsupported'), { code: -32601 }); return result; } });
    try {
      const stream = await f.transport.runStreamed('accepted'); const it = stream.events[Symbol.asyncIterator]();
      await it.next(); await it.next(); f.idle(); await f.fire();
      const awaiting = it.next(); let settled = false; void awaiting.then(() => { settled = true; });
      await new Promise(resolve => setImmediate(resolve)); assert.equal(settled, false); assert.equal(f.stopped, 0);
      f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
      assert.equal((await awaiting).value.type, 'turn.completed'); await it.next();
    } finally { await f.transport.stop(); }
  }
});

test('post-idle activity, live newer state and foreign thread idle disarm the missing-result read', async () => {
  const f = lostResultFixture();
  try {
    const stream = await f.transport.runStreamed('accepted'); const it = stream.events[Symbol.asyncIterator]();
    await it.next(); await it.next();
    f.frame('thread/status/changed', { threadId: 'sibling', status: { type: 'idle' } }); await f.fire();
    f.idle(); f.frame('item/started', { threadId: 'root', turnId: 'turn', item: { id: 'work', type: 'agentMessage', text: 'still working' } });
    await f.fire();
    f.idle(); f.frame('thread/status/changed', { threadId: 'root', status: { type: 'active', activeFlags: [] } });
    await f.fire(); assert.equal(f.calls.some(call => call.method === 'thread/turns/list'), false);
    f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
    for await (const _ of it) {}
  } finally { await f.transport.stop(); }
});

test('pending native approval parks recovery; last reply re-arms it and in-flight reads cannot outlive cancellation', async () => {
  let reply, resolveRead, readSignal;
  const f = lostResultFixture({ onServerRequest: (_frame, send) => { reply = send; },
    readTurns: (_params, options) => { readSignal = options.signal; return new Promise(resolve => { resolveRead = resolve; }); } });
  try {
    const controller = new AbortController(), stream = await f.transport.runStreamed('accepted', { signal: controller.signal });
    const it = stream.events[Symbol.asyncIterator](); await it.next(); await it.next();
    f.idle(); f.client.respond = () => true;
    f.frame('thread/status/changed', { threadId: 'root', status: { type: 'idle' } });
    // Deliver a real server request shape through the same subscription.
    f.client.deliver({ id: 42, method: 'item/commandExecution/requestApproval', params: { threadId: 'root', turnId: 'turn' } });
    await f.fire(); assert.equal(f.calls.some(call => call.method === 'thread/turns/list'), false);
    reply({ decision: 'decline' }); assert.ok([...f.timers.values()].some(timer => timer.ms === 5000));
    const reading = f.fire(); await Promise.resolve(); assert.ok(readSignal);
    controller.abort();
    resolveRead({ data: [{ id: 'turn', status: 'completed', items: [] }] }); await reading;
    const rest = []; for await (const event of it) rest.push(event);
    assert.equal(rest.at(-1).status, 'interrupted'); assert.equal(readSignal.aborted, true);
  } finally { await f.transport.stop(); }
});

test('silent native turns survive real control replies and remote RPC errors without early settlement', async () => {
  for (const response of ['reply', 'remote-error']) {
    const f = lostResultFixture({ readControl: () => {
      if (response === 'remote-error') throw Object.assign(new Error('unsupported RPC'), { code: -32601 });
      return { thread: { id: 'root' } };
    } });
    try {
      const stream = await f.transport.runStreamed('accepted'); const it = stream.events[Symbol.asyncIterator]();
      await it.next(); await it.next();
      await f.probe(600000); await f.probe(600000);
      const reads = f.calls.filter(call => call.method === 'thread/read'); assert.equal(reads.length, 2);
      assert.ok(reads.every(call => call.params.includeTurns === false && call.options.timeoutMs === 10000));
      assert.equal(f.stopped, 0); assert.equal(f.calls.filter(call => call.method === 'turn/start').length, 1);
      f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
      assert.equal((await it.next()).value.type, 'turn.completed'); assert.equal((await it.next()).done, true);
      assert.equal(f.timers.size, 0);
    } finally { await f.transport.stop(); }
  }
});

test('two consecutive unanswered control probes mark only that run suspect and never kill or replay at conviction', async () => {
  const f = lostResultFixture({ readControl: () => { throw Object.assign(new Error('no response'), { code: 'CODEX_RPC_TIMEOUT' }); } });
  try {
    const stream = await f.transport.runStreamed('accepted'); const it = stream.events[Symbol.asyncIterator]();
    await it.next(); await it.next(); await f.probe(600000);
    assert.equal(f.stopped, 0); await f.probe(180000);
    const terminal = (await it.next()).value;
    assert.equal(terminal.type, 'turn.failed'); assert.equal(terminal.recovery, 'control-unresponsive');
    assert.equal(terminal.turn_id, 'turn'); assert.equal(terminal.error.code, 'turn-stuck');
    assert.equal((await it.next()).done, true); assert.equal(f.stopped, 0);
    f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
    assert.equal(f.calls.filter(call => call.method === 'turn/start').length, 1);
    assert.equal(f.timers.size, 0);
  } finally { await f.transport.stop(); }
});

test('new root activity resets failures and invalidates a timed-out read from the prior quiet interval', async () => {
  let pending, signal, count = 0;
  const f = lostResultFixture({ readControl: (_params, options) => {
    if (++count === 1) throw Object.assign(new Error('silent'), { code: 'CODEX_RPC_TIMEOUT' });
    signal = options.signal; return new Promise((_resolve, reject) => { pending = reject; });
  } });
  try {
    const stream = await f.transport.runStreamed('accepted'); const it = stream.events[Symbol.asyncIterator]();
    await it.next(); await it.next(); await f.probe(600000);
    const reading = f.probe(180000); await Promise.resolve();
    f.frame('item/started', { threadId: 'root', turnId: 'turn', item: { id: 'live', type: 'agentMessage', text: 'working' } });
    assert.equal(signal.aborted, true); pending(Object.assign(new Error('old timeout'), { code: 'CODEX_RPC_TIMEOUT' })); await reading;
    assert.ok([...f.timers.values()].some(timer => timer.ms === 600000));
    assert.equal([...f.timers.values()].some(timer => timer.ms === 180000), false);
    f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
    const rest = []; for await (const event of it) rest.push(event);
    assert.equal(rest.at(-1).type, 'turn.completed'); assert.equal(f.stopped, 0);
  } finally { await f.transport.stop(); }
});

test('pending approval suppresses control probes and the last native resolution restores probing', async () => {
  const f = lostResultFixture({ onServerRequest() {} });
  try {
    const stream = await f.transport.runStreamed('accepted'); const it = stream.events[Symbol.asyncIterator]();
    await it.next(); await it.next();
    for (const id of [1, 2]) f.client.deliver({ id, method: 'item/commandExecution/requestApproval', params: { threadId: 'root', turnId: 'turn' } });
    assert.equal(f.timers.size, 0);
    f.frame('serverRequest/resolved', { requestId: 1 }); assert.equal(f.timers.size, 0);
    f.frame('serverRequest/resolved', { requestId: 2 });
    await f.probe(600000); assert.equal(f.calls.filter(call => call.method === 'thread/read').length, 1);
    f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
    for await (const _ of it) {}
  } finally { await f.transport.stop(); }
});

test('native config JSON keeps options and directories without mutating the SDK configuration', () => {
  const config = { model_provider: 'fixture', sandbox_workspace_write: { writable_roots: ['/kept'] } };
  const result = appServerThreadParams('/work', { config }, { model: 'model', sandboxMode: 'workspace-write',
    approvalPolicy: 'on-request', additionalDirectories: ['child'], networkAccessEnabled: false, webSearchMode: 'disabled' });
  assert.equal(result.config.model_provider, 'fixture');
  assert.deepEqual(result.config.sandbox_workspace_write.writable_roots, ['/kept', '/work/child']);
  assert.equal(result.config.sandbox_workspace_write.network_access, false);
  assert.equal(result.approvalPolicy, 'on-request');
  assert.deepEqual(config.sandbox_workspace_write.writable_roots, ['/kept']);
});

test('startup config preserves literal strings, arrays and inline tables and rejects unsupported values', () => {
  const args = serializeAppServerConfig({ features: { multi_agent: true }, note: 'quote"\n`$()',
    roots: ['/a b', '/c'], rows: [{ enabled: false, count: 3 }], empty: {} });
  assert.ok(args.includes('features.multi_agent=true'));
  assert.ok(args.includes('note="quote\\\"\\n`$()"'));
  assert.ok(args.includes('roots=["/a b", "/c"]'));
  assert.ok(args.includes('rows=[{"enabled" = false, "count" = 3}]'));
  assert.ok(args.includes('empty={}'));
  for (const invalid of [null, NaN, Infinity, () => {}]) assert.throws(() => serializeAppServerConfig({ invalid }));
  assert.throws(() => serializeAppServerConfig(JSON.parse('{"__proto__":{"polluted":true}}')));
});

test('a recovered terminal never consumes the next native turn result or its retry frames', async () => {
  for (const deliverLateFrames of [false, true]) {
    const f = lostResultFixture({ readTurns: () => ({ data: [{ id: 'turn', status: 'completed', itemsView: 'full', items: [] }] }) });
    try {
      const first = await f.transport.runStreamed('first');
      const firstIterator = first.events[Symbol.asyncIterator]();
      await firstIterator.next(); await firstIterator.next(); f.idle(); await f.fire();
      const recovered = []; for await (const event of firstIterator) recovered.push(event);
      assert.equal(recovered.filter(event => event.type === 'turn.completed').length, 1);

      const request = f.client.request;
      f.client.request = async (method, params, options) => {
        if (method !== 'turn/start') return request(method, params, options);
        f.calls.push({ method, params });
        f.frame('turn/started', { threadId: 'root', turn: { id: 'next', status: 'inProgress' } });
        return { turn: { id: 'next' } };
      };
      const second = await f.transport.runStreamed('explicit second');
      const iterator = second.events[Symbol.asyncIterator]();
      assert.equal((await iterator.next()).value.type, 'thread.started');
      assert.equal((await iterator.next()).value.turn_id, 'next');
      const waiting = iterator.next(); let settled = false;
      void waiting.then(() => { settled = true; });
      if (deliverLateFrames) {
        f.frame('error', { threadId: 'root', turnId: 'turn', willRetry: true, error: { message: 'old retry' } });
        f.frame('item/completed', { threadId: 'root', turnId: 'turn', item: { id: 'old', type: 'agentMessage', text: 'old reply' } });
        f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'failed', error: { message: 'old failure' } } });
      }
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(settled, false, 'an old turn cannot settle the live turn');
      f.frame('error', { threadId: 'root', turnId: 'next', willRetry: true, error: { message: 'current retry' } });
      assert.equal((await waiting).value.error.message, 'current retry');
      f.frame('turn/completed', { threadId: 'root', turn: { id: 'next', status: 'completed',
        items: [{ id: 'next-reply', type: 'agentMessage', text: 'second reply' }] } });
      const events = []; for await (const event of iterator) events.push(event);
      assert.equal(events.find(event => event.type === 'item.completed').item.text, 'second reply');
      assert.equal(events.filter(event => event.type === 'turn.completed').length, 1);
      assert.equal(events.at(-1).turn_id, 'next');
      assert.equal(f.calls.filter(call => call.method === 'turn/start').length, 2, 'only explicit inputs start turns');
      assert.equal(f.stopped, 0, 'healthy recovered child is reused');
    } finally { await f.transport.stop(); }
  }
});

test('MCP status reads only the owned active thread, follows pagination and never launches a turn', async () => {
  const f = fixture('lost-result', { readMcpStatus: params => params.cursor
    ? { data: [{ name: 'auth', runtimeStatus: 'authenticationRequired', tools: {} }], nextCursor: null }
    : { data: [{ name: 'local', runtimeStatus: 'connected', tools: { read: { name: 'read' } }, serverInfo: { version: '1' } }], nextCursor: 'page2' } });
  try {
    assert.equal(await f.transport.getMcpServerStatus(), null);
    assert.deepEqual(f.calls, [], 'inactive panel reads must not initialize a child');
    const stream = await f.transport.runStreamed('hold'); const iterator = stream.events[Symbol.asyncIterator]();
    await iterator.next(); await iterator.next();
    const servers = await f.transport.getMcpServerStatus();
    assert.deepEqual(servers.map(server => [server.name, server.status, server.tools.length]), [['local', 'connected', 1], ['auth', 'needs-auth', 0]]);
    assert.deepEqual(f.calls.filter(call => call.method === 'mcpServerStatus/list').map(call => call.params), [
      { threadId: 'root', limit: 100 }, { threadId: 'root', limit: 100, cursor: 'page2' },
    ]);
    assert.equal(f.calls.filter(call => call.method === 'turn/start').length, 1);
    f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
    for await (const _ of iterator) {}
  } finally { await f.transport.stop(); }
});

test('MCP status rejects invalid or repeated pages and results from a retired client', async () => {
  for (const page of [{ data: [], nextCursor: 'same' }, { data: null }, { data: [{ name: 'bad', tools: [] }] }]) {
    const f = fixture('lost-result', { readMcpStatus: () => page });
    try {
      const stream = await f.transport.runStreamed('hold'); const iterator = stream.events[Symbol.asyncIterator]();
      await iterator.next(); await iterator.next();
      await assert.rejects(f.transport.getMcpServerStatus(), /MCP/);
      f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
      for await (const _ of iterator) {}
    } finally { await f.transport.stop(); }
  }
  let finish;
  const f = fixture('lost-result', { readMcpStatus: () => new Promise(resolve => { finish = resolve; }) });
  const stream = await f.transport.runStreamed('hold'); const iterator = stream.events[Symbol.asyncIterator]();
  await iterator.next(); await iterator.next();
  const pending = f.transport.getMcpServerStatus();
  await f.transport.stop(); finish({ data: [] });
  await assert.rejects(pending, /changed/);
  await assert.rejects(iterator.next(), /stopped/);
});

test('MCP runtime status uses explicit connection evidence and does not infer connection from tools or auth', () => {
  for (const runtimeStatus of [null, 'cancelled', 'constructor']) {
    assert.equal(normalizeAppServerMcpStatus({ name: 'local', runtimeStatus, authStatus: 'oAuth', tools: { x: {} } }).status, 'unknown');
  }
  assert.equal(normalizeAppServerMcpStatus({ name: 'failed', runtimeStatus: 'failed', tools: {}, toolsError: 'discovery failed' }).error, 'discovery failed');
});

test('MCP inventory has one total deadline and releases the read after abort', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture('lost-result', { readMcpStatus: (_params, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  }) });
  try {
    const stream = await f.transport.runStreamed('hold'); const iterator = stream.events[Symbol.asyncIterator]();
    await iterator.next(); await iterator.next();
    const pending = f.transport.getMcpServerStatus(); t.mock.timers.tick(10000);
    await assert.rejects(pending, /MCP status timeout/);
    f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } });
    for await (const _ of iterator) {}
  } finally { await f.transport.stop(); }
});

test('App Server events arriving before turn acceptance retain deltas and exclude child/old-turn rows', async () => {
  const f = fixture();
  try {
    const stream = await f.transport.runStreamed('hello');
    const events = []; for await (const event of stream.events) events.push(event);
    assert.deepEqual(events[0], { type: 'thread.started', thread_id: 'root' });
    assert.equal(events.find(e => e.type === 'item.completed' && e.item.id === 'message').item.text, 'hello');
    assert.deepEqual(events.find(e => e.item?._appServerPlan).item.items.map(step => step.status), ['completed', 'in_progress', 'pending']);
    assert.ok(events.some(e => e.type === 'item.completed' && e.item._appServerPlan), 'last plan is durable at turn end');
    assert.equal(events.at(-1).type, 'turn.completed');
    assert.equal(events.at(-1).usage.inputTokens, 3);
    assert.deepEqual(events.find(e => e.type === 'turn.started'), { type: 'turn.started', thread_id: 'root', turn_id: 'turn' });
    const retry = events.find(e => e.type === 'error');
    assert.equal(retry.willRetry, true); assert.equal(retry.turn_id, 'turn'); assert.equal(retry.thread_id, 'root');
    assert.equal(retry.error.additionalDetails, 'fixture detail');
    assert.deepEqual(retry.error.codexErrorInfo, { responseStreamDisconnected: { httpStatusCode: 503 } });
    assert.ok(!JSON.stringify(events).includes('child secret'));
    assert.ok(!JSON.stringify(events).includes('late old error'));
    assert.ok(f.raw.some(frame => frame.params?.threadId === 'child'), 'agent observer retains the real raw scope');
  } finally { await f.transport.stop(); }
});

test('cancellation while turn/start is pending interrupts only the accepted turn and settles once', async () => {
  const f = fixture('hold-start'), controller = new AbortController();
  try {
    const stream = await f.transport.runStreamed('hold', { signal: controller.signal });
    controller.abort(); f.replyTurn();
    const events = []; for await (const event of stream.events) events.push(event);
    assert.deepEqual(f.calls.find(call => call.method === 'turn/interrupt').params, { threadId: 'root', turnId: 'turn' });
    assert.equal(events.filter(event => event.type === 'turn.failed').length, 1);
    assert.equal(events.at(-1).error.message, 'Turn interrupted');
    assert.equal(events.at(-1).status, 'interrupted');
  } finally { await f.transport.stop(); }
});

test('failed turns surface a terminal failure, and a mismatched resume cannot run into the current thread', async () => {
  const f = fixture('failure');
  try {
    const stream = await f.transport.runStreamed('fail');
    const events = []; for await (const event of stream.events) events.push(event);
    assert.equal(events.at(-1).type, 'turn.failed');
    assert.equal(events.at(-1).error.message, 'terminal failure');
    assert.equal(events.at(-1).turn_id, 'turn'); assert.equal(events.at(-1).thread_id, 'root');
    assert.deepEqual(events.at(-1).error.codexErrorInfo, { httpConnectionFailed: { httpStatusCode: 503 } });
    await assert.rejects(f.transport.runStreamed('wrong', { threadId: 'other' }), /different thread/);
  } finally { await f.transport.stop(); }
});

test('process death during an accepted-start gap rejects the stream and does not replay the input', async () => {
  const f = fixture('hold-start');
  try {
    const stream = await f.transport.runStreamed('once');
    f.close();
    await assert.rejects(async () => { for await (const event of stream.events) void event; }, /disconnected/);
    f.replyTurn(); await Promise.resolve();
    assert.equal(f.calls.filter(call => call.method === 'turn/start').length, 1);
  } finally { await f.transport.stop(); }
});

test('approval ownership follows real parent identities and rejects same-cwd unrelated roots or cycles', async () => {
  const f = fixture();
  try {
    const stream = await f.transport.runStreamed('initialize');
    for await (const event of stream.events) void event;
    assert.equal(await f.transport.ownsThread('root'), true);
    assert.equal(await f.transport.ownsThread('child'), true);
    assert.equal(await f.transport.ownsThread('nested'), true);
    assert.equal(await f.transport.ownsThread('unrelated'), false);
    assert.equal((await f.transport.readThread('child')).id, 'child');
    await assert.rejects(f.transport.readThread('unrelated'), /different/);
    await f.transport.stop();
    assert.equal(await f.transport.ownsThread('root'), false);
  } finally { await f.transport.stop(); }
});

test('native item mapping preserves tool output, collaboration identity and unknown protocol artifacts', () => {
  const command = normalizeAppServerItem({ id: 'x', type: 'commandExecution', command: 'pwd', aggregatedOutput: 'out', exitCode: 0 });
  assert.equal(command.aggregated_output, 'out'); assert.equal(command.exit_code, 0);
  const collab = normalizeAppServerItem({ id: 'spawn', type: 'collabAgentToolCall', tool: 'spawnAgent',
    receiverThreadIds: ['child'], agentsStates: { child: { status: 'running' } } });
  assert.equal(collab.toolName, 'spawn_agent'); assert.deepEqual(collab.output.receiverThreadIds, ['child']);
  assert.equal(collab.output.agentsStates.child.status, 'running');
  const unknown = { id: 'future', type: 'futureEvent', payload: 'kept' };
  assert.deepEqual(normalizeAppServerItem(unknown).output, unknown);
});


test('native skills read uses only its active cwd and never starts a process or turn for a menu', async () => {
  const skill = { name: 'real-skill', description: 'actual metadata', path: '/fixture/SKILL.md', enabled: true, scope: 'repo', pluginId: 'plugin' };
  const f = fixture('lost-result', { readSkills: () => ({ data: [{ cwd: '/fixture', skills: [skill, { ...skill, name: 'disabled', enabled: false }] }] }) });
  try {
    assert.equal(await f.transport.getSkills(), null); assert.deepEqual(f.calls, []);
    const stream = await f.transport.runStreamed('hold'); const it = stream.events[Symbol.asyncIterator](); await it.next(); await it.next();
    assert.deepEqual(await f.transport.getSkills(), [{ name: 'real-skill', description: 'actual metadata', path: '/fixture/SKILL.md', scope: 'repo', pluginId: 'plugin' }]);
    const read = f.calls.find(call => call.method === 'skills/list');
    assert.deepEqual(read.params, { cwds: ['/fixture'], forceReload: true }); assert.equal(read.options.timeoutMs, 10000);
    assert.equal(f.calls.filter(call => call.method === 'turn/start').length, 1);
    f.frame('turn/completed', { threadId: 'root', turn: { id: 'turn', status: 'completed' } }); for await (const _ of it) {}
  } finally { await f.transport.stop(); }
});

test('native skills reject foreign or duplicate cwd and drop invalid protocol tokens and paths', () => {
  const skill = { name: 'safe', path: '/fixture/SKILL.md', enabled: true, scope: 'repo' };
  for (const data of [[], [{ cwd: '/other', skills: [skill] }], [{ cwd: '/fixture', skills: [] }, { cwd: '/fixture', skills: [] }]]) {
    assert.throws(() => normalizeAppServerSkills({ data }, '/fixture'), /workspace/);
  }
  assert.deepEqual(normalizeAppServerSkills({ data: [{ cwd: '/fixture', skills: [
    { ...skill, name: 'unsafe\ninput' }, { ...skill, path: 'relative' }, { ...skill, enabled: false },
    { ...skill, scope: 'constructor' }, skill,
  ] }] }, '/fixture'), [{ name: 'safe', description: '', path: '/fixture/SKILL.md', scope: 'repo' }]);
  assert.deepEqual(normalizeAppServerSkills({ data: [{ cwd: '/fixture', skills: [] }] }, '/fixture'), []);
});

test('native skills discard reads from a retired client', async () => {
  let finish;
  const f = fixture('lost-result', { readSkills: () => new Promise(resolve => { finish = resolve; }) });
  const stream = await f.transport.runStreamed('hold'); const it = stream.events[Symbol.asyncIterator](); await it.next(); await it.next();
  const pending = f.transport.getSkills(); await f.transport.stop(); finish({ data: [{ cwd: '/fixture', skills: [] }] });
  await assert.rejects(pending, /changed/); await assert.rejects(it.next(), /stopped/);
});
