// Actual class methods with browser/time fixtures; no DOM or real browser claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcilePendingInputs } from '../src/utils/pendingInputEcho.js';
const web = dirname(dirname(fileURLToPath(import.meta.url))), require = createRequire(join(web, 'package.json'));
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
mkdirSync(join(web, 'node_modules/.cache'), { recursive: true });
const directory = mkdtempSync(join(web, 'node_modules/.cache/ws-liveness-')), output = join(directory, 'components.cjs');
const css = require.extensions['.css']; require.extensions['.css'] = () => {};
await build({ stdin: { contents: `export { TerminalWsProvider as Provider } from './src/components/terminal/TerminalWsContext.jsx';
export { default as Chat } from './src/components/chat/ChatView.jsx';
export { default as TaskHud } from './src/components/chat/TaskProgressHud.jsx';
export { default as AgentHud } from './src/components/chat/ActiveAgentsBar.jsx';`, resolveDir: web },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: output,
  loader: { '.css': 'empty', '.svg': 'text', '.png': 'dataurl', '.gif': 'dataurl' }, logLevel: 'error' });
test.after(() => { rmSync(directory, { recursive: true, force: true });
  if (css) require.extensions['.css'] = css; else delete require.extensions['.css']; });

function fixture(t) {
  const restores = [], timeouts = new Map(), intervals = new Map(), events = new Map(), sockets = [], states = [];
  let clock = 0, id = 0, cleanup = () => {};
  t.after(() => { cleanup(); restores.reverse().forEach(fn => fn()); });
  const globals = {
    self: globalThis, performance: { now: () => clock },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: { userAgent: 'Desktop', platform: 'Linux', maxTouchPoints: 1 },
    MutationObserver: class { observe() {} disconnect() {} },
    window: { location: new URL('http://fixture/?instance=a&token=synthetic'), innerWidth: 1200 },
    document: { visibilityState: 'visible', activeElement: null, body: { style: {} },
      documentElement: { style: {}, classList: { add() {} }, getAttribute() { return 'dark'; } },
      createElement() { return { style: {} }; },
      addEventListener: (type, fn) => events.set(type, fn), removeEventListener: type => events.delete(type) },
    setTimeout: (fn, delay) => { timeouts.set(++id, { fn, delay }); return id; }, clearTimeout: key => timeouts.delete(key),
    setInterval: (fn, delay) => { intervals.set(++id, { fn, delay }); return id; }, clearInterval: key => intervals.delete(key),
    WebSocket: class {
      static OPEN = 1; static CONNECTING = 0; static CLOSED = 3;
      constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closes = 0; sockets.push(this); }
      send(value) { if (this.fail) throw new Error('wire failed'); this.sent.push(JSON.parse(value)); }
      close() { this.closes++; this.readyState = 3; /* Deliberately never emits onclose. */ }
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restores.push(() => { if (old) Object.defineProperty(globalThis, key, old); else delete globalThis[key]; });
  }
  const { Provider, Chat, TaskHud, AgentHud } = require(output);
  const provider = new Provider({ open: true }); provider.addStateListener(state => states.push(state));
  provider.componentDidMount(); cleanup = () => provider.componentWillUnmount();
  const open = (socket = sockets.at(-1)) => { socket.readyState = 1; socket.onopen(); return socket; };
  const frame = (socket, value) => socket.onmessage({ data: JSON.stringify(value) });
  const timeout = delay => {
    const entry = [...timeouts].find(([, value]) => value.delay === delay);
    assert.ok(entry, `expected timeout ${delay}`); timeouts.delete(entry[0]); entry[1].fn();
  };
  return { provider, Chat, TaskHud, AgentHud, states, sockets, open, frame, timeout, timeouts, intervals, events,
    set clock(value) { clock = value; } };
}

test('a ping-proven silent socket reconnects without depending on its onclose, and stale events cannot affect the replacement', t => {
  const f = fixture(t), old = f.open();
  assert.ok(old.url.includes('instance=a') && old.url.includes('token=synthetic'));
  f.frame(old, { type: 'ping' }); f.clock = 46_000;
  const oldClose = old.onclose, oldOpen = old.onopen, oldMessage = old.onmessage;
  [...f.intervals.values()][0].fn();
  assert.equal(old.closes, 1); assert.equal(f.provider.ws, null);
  assert.deepEqual(f.states, ['open', 'close']);
  f.timeout(2000);
  const next = f.sockets.at(-1), dial = f.provider.dialTimer;
  oldOpen(); oldClose(); oldMessage({ data: '{"type":"ping"}' });
  assert.equal(f.provider.dialTimer, dial);
  assert.equal(f.provider.pingSeen, false);
  f.open(next); f.clock = 100_000;
  [...f.intervals.values()][0].fn();
  assert.equal(next.closes, 0, 'a legacy server without observed ping cannot reconnect-loop');
});

test('a blackholed dial has a deadline and unmount cancels every listener and retry timer', t => {
  const f = fixture(t), first = f.sockets[0];
  f.timeout(10_000);
  assert.equal(first.closes, 1);
  assert.deepEqual(f.states, ['close']);
  f.provider.componentWillUnmount();
  assert.equal(f.timeouts.size + f.intervals.size + f.events.size, 0);
});

test('inbound traffic and foreground grace reset the monotonic clock, and a stale send fails without sending bytes', t => {
  const f = fixture(t), socket = f.open();
  f.frame(socket, { type: 'ping' }); f.clock = 40_000;
  f.frame(socket, { type: 'state' }); f.clock = 80_000;
  [...f.intervals.values()][0].fn(); assert.equal(socket.closes, 0);
  f.clock = 100_000; f.events.get('visibilitychange')();
  [...f.intervals.values()][0].fn(); assert.equal(socket.closes, 0);
  f.clock = 146_000;
  assert.equal(f.provider.send({ type: 'sdk-user-message', text: 'must remain unsent' }), false);
  assert.deepEqual(socket.sent, []); assert.equal(socket.closes, 1);
});

test('failed composer and typed-interrupt sends retain drafts, attachments and original text without automatic replay', t => {
  const f = fixture(t), { message } = require('antd'), errors = [], oldError = message.error;
  message.error = text => errors.push(text); t.after(() => { message.error = oldError; });
  let unlocked = 0;
  const chat = new f.Chat({ sdkMode: true, onUserMessageSent: () => unlocked++ });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  chat.context = { isOpen: () => true, send: () => false };
  const textarea = { value: 'new draft', style: {}, scrollHeight: 40 };
  chat._inputRef.current = textarea;
  const images = [{ path: '/synthetic/attachment.png' }]; chat.state.pendingImages = images;
  assert.equal(chat._sendUserMessageImmediate('new draft', textarea), false);
  assert.equal(textarea.value, 'new draft'); assert.equal(chat.state.pendingImages, images);
  assert.equal(unlocked, 0);
  chat.state.pendingInputs = [{ id: 'pending-cancel', wireText: 'original unsent' }];
  chat._sendUserMessageImmediate('original unsent', null, true, 'pending-cancel');
  assert.equal(textarea.value, 'original unsent\n\nnew draft');
  assert.deepEqual(chat.state.pendingInputs, []);
  chat._restoreUnsentInput('obsolete prompt', 'removed-by-resume');
  assert.equal(textarea.value, 'original unsent\n\nnew draft');
  assert.equal(errors.length, 2);
});

test('shard prepend retains attachments only while the cached canonical tail survives', t => {
  const f = fixture(t), chat = new f.Chat({ mainAgentSessions: [], requests: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  chat.startRender = () => {};
  chat.buildAllItems = () => [];
  chat._applyMobileSlice = items => items;
  chat._updateSuggestion = () => {};
  chat._toolFileMonitor.check = () => {};
  const update = (sessions, count) => {
    const previous = chat.props, state = { ...chat.state };
    chat.props = { ...previous, mainAgentSessions: sessions, shardPrependCount: count };
    chat.componentDidUpdate(previous, state);
  };
  const tail = { sessionKey: 'canonical', entryTimestamp: '2026-11-20T00:00:02Z', _lastV2Seq: 2,
    messages: [{ role: 'user', _timestamp: 'newer-prompt' }] };
  update([tail], 0);
  const images = [{ path: '/synthetic/draft.png' }];
  chat.state.pendingImages = images;
  update([{ ...tail, messages: [{ role: 'user', _timestamp: 'older-prompt' }, ...tail.messages] }], 1);
  assert.equal(chat.state.pendingImages, images, 'backwards expansion changes the first message without changing the canonical tail');
  const current = chat.props.mainAgentSessions[0];
  current.entryTimestamp = '2026-11-20T00:00:03Z'; current._lastV2Seq = 3;
  update([current], 2);
  assert.deepEqual(chat.state.pendingImages, [], 'in-place live append cannot hide behind a simultaneous prepend');
});

test('late-mounted queue consumers receive the current snapshot, and a replacement socket clears the cache', t => {
  const f = fixture(t), socket = f.open();
  const snapshot = { type: 'queue-state', instanceKey: 'a', items: [{ id: 'q1', text: 'queued', ts: 1, status: 'queued' }] };
  f.frame(socket, snapshot);
  const first = []; f.provider.addMessageHandler(value => first.push(value));
  assert.deepEqual(first, [snapshot]);
  socket.onclose(); f.timeout(2000); f.open();
  const replacement = []; f.provider.addMessageHandler(value => replacement.push(value));
  assert.deepEqual(replacement, [], 'an old queue snapshot cannot leak across connections');
});

test('SDK queue receipts replace only the matching optimistic row, preserve identical prompts and restore rejected text', t => {
  const f = fixture(t), { message } = require('antd'), oldError = message.error;
  message.error = () => {}; t.after(() => { message.error = oldError; });
  const sent = [], chat = new f.Chat({ sdkMode: true, lang: 'en', requests: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  chat.scrollToBottom = () => {};
  chat.context = { isOpen: () => true, send: value => { sent.push(value); return true; } };
  const textarea = { value: 'same text', style: {}, scrollHeight: 40 }; chat._inputRef.current = textarea;
  chat._sendUserMessageImmediate('same text', textarea);
  chat._sendUserMessageImmediate('same text', textarea);
  assert.equal(chat.state.pendingInputs.length, 2);
  assert.notEqual(sent[0].requestId, sent[1].requestId);
  chat._onTerminalWsMessage({ type: 'sdk-message-accepted', instanceKey: 'a', requestId: sent[1].requestId, queueId: 'q2', queued: true });
  const q2 = { id: 'q2', text: 'same text', ts: Date.now(), status: 'queued' };
  chat._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'a', items: [q2, { ...q2, id: 'other-client' }] });
  assert.equal(chat.state.pendingInputs.length, 1);
  assert.equal(chat.state.pendingInputs[0].id, sent[0].requestId);
  assert.equal(chat._renderSdkQueueBubbles().length, 2);
  assert.equal(chat._renderSdkQueueBubbles()[0].props['aria-busy'], false);
  chat._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'b', items: [] });
  assert.equal(chat.state.sdkQueuedInputs.length, 2);
  textarea.value = 'a newer draft';
  chat._onTerminalWsMessage({ type: 'sdk-error', instanceKey: 'a', requestId: sent[0].requestId, code: 'SDK_QUEUE_FULL' });
  assert.equal(textarea.value, 'same text\n\na newer draft');
  assert.equal(chat.state.pendingInputs.length, 0);
  chat._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'a', items: [{ ...q2, status: 'dispatching' }] });
  assert.equal(chat._renderSdkQueueBubbles().length, 1);
  chat._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'a', items: [] });
  assert.deepEqual(chat._renderSdkQueueBubbles(), []);
  assert.equal(sent.length, 2, 'receipt, rejection and queue updates never replay a prompt');
});

test('a reconnect snapshot acknowledges a queued send even when its original receipt was lost', t => {
  const f = fixture(t), sent = [], chat = new f.Chat({ sdkMode: true, requests: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  chat.scrollToBottom = () => {};
  chat.context = { isOpen: () => true, send: value => { sent.push(value); return true; } };
  chat._sendUserMessageImmediate('queued before disconnect');
  const snapshot = { type: 'queue-state', instanceKey: 'a', items: [
    { id: 'server-id', requestId: sent[0].requestId, text: 'queued before disconnect', ts: Date.now(), status: 'queued' },
  ] };
  chat._onTerminalWsMessage(snapshot);
  assert.deepEqual(chat.state.pendingInputs, []);
  assert.equal(chat._renderSdkQueueBubbles().length, 1);
  const other = new f.Chat({ sdkMode: true, requests: [] });
  assert.notEqual(chat._createPendingInputRecord('x').id, other._createPendingInputRecord('x').id);
  assert.equal(sent.length, 1);
});

test('half-open reconnect retains accepted and unacknowledged queued text, drafts and attachments without replay', t => {
  const f = fixture(t), old = f.open(), chat = new f.Chat({ sdkMode: true, requests: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  chat.scrollToBottom = () => {};
  chat.context = f.provider._ctxValue;
  f.provider.addMessageHandler(chat._onTerminalWsMessage);
  f.provider.addStateListener(chat._onTerminalWsState);
  chat._sendUserMessageImmediate('accepted queue');
  const first = { id: 'first', requestId: old.sent[0].requestId, text: 'accepted queue', ts: Date.now(), status: 'queued' };
  f.frame(old, { type: 'queue-state', instanceKey: 'a', items: [first] });
  chat._sendUserMessageImmediate('receipt lost');
  const second = { id: 'second', requestId: old.sent[1].requestId, text: 'receipt lost', ts: Date.now(), status: 'queued' };
  const images = chat.state.pendingImages = [{ path: '/synthetic/draft.png' }];
  const textarea = chat._inputRef.current = { value: 'new unsent draft', style: {} };
  f.frame(old, { type: 'ping' }); f.clock = 46_000;
  [...f.intervals.values()][0].fn();
  assert.equal(chat.state.sdkQueuedInputs[0].id, 'first');
  assert.equal(chat.state.pendingInputs.length, 1);
  f.timeout(2000); const next = f.open();
  assert.equal(textarea.value, 'new unsent draft');
  assert.equal(chat.state.pendingImages, images);
  assert.deepEqual(next.sent, [], 'reconnect must not retransmit an accepted or uncertain input');
  const snapshot = { type: 'queue-state', instanceKey: 'a', items: [first, second] };
  f.frame(next, snapshot); f.frame(next, snapshot);
  assert.deepEqual(chat.state.pendingInputs, []);
  assert.deepEqual(chat.state.sdkQueuedInputs.map(item => item.id), ['first', 'second']);
  assert.equal(textarea.value, 'new unsent draft');
  assert.equal(chat.state.pendingImages, images);
  assert.equal(old.sent.length, 2);
  assert.deepEqual(next.sent, []);
});

test('queue removal uses the exact id and waits for authoritative state without interrupting the turn', t => {
  const f = fixture(t), sent = [], chat = new f.Chat({ sdkMode: true, lang: 'en' });
  chat.context = { isOpen: () => true, send: value => { sent.push(value); return true; } };
  chat.state.sdkQueuedInputs = [{ id: 'one-id', text: 'same', ts: 1, status: 'queued' },
    { id: 'two-id', text: 'same', ts: 1, status: 'dispatching' }];
  const rows = chat._renderSdkQueueBubbles();
  const remove = rows[0].props.children[1];
  assert.equal(typeof remove.props.onClick, 'function'); remove.props.onClick();
  assert.deepEqual(sent, [{ type: 'sdk-queue-remove', id: 'one-id' }]);
  assert.equal(chat.state.sdkQueuedInputs.length, 2, 'a failed/late removal must not hide a queued message');
  assert.equal(rows[1].props.children[1].props.disabled, true, 'an accepted dispatch cannot be removed');
});

test('queued text always uses the baseline queue row and keeps actions outside compact-summary parsing', t => {
  const f = fixture(t), chat = new f.Chat({ sdkMode: true, lang: 'en' });
  const text = 'This session is being continued from a previous conversation that ran out of context';
  chat.state.sdkQueuedInputs = [{ id: 'compact-queue', text, ts: 1, status: 'queued' }];
  const row = chat._renderSdkQueueBubbles()[0];
  assert.equal(row.type, 'div'); assert.equal(row.props.title, text);
  assert.equal(row.props.children[0].props.children, text);
  assert.equal(row.props.children[1].type, 'button');
  assert.equal(row.props.children[2].type, 'button');
});

test('paused queues expose send-now and keep every action disabled during an accepted dispatch', t => {
  const f = fixture(t), sent = [], chat = new f.Chat({ sdkMode: true, lang: 'en' });
  chat.context = { isOpen: () => true, send: value => { sent.push(value); return true; } };
  chat.state.sdkQueuePaused = true;
  chat.state.sdkQueuedInputs = [{ id: 'parked', text: 'queued prompt', ts: 1, status: 'queued' }];
  let action = chat._renderSdkQueueBubbles()[0].props.children[2];
  assert.equal(action.props.disabled, false); assert.equal(typeof action.props.title, 'string');
  action.props.onClick();
  assert.deepEqual(sent, [{ type: 'sdk-queue-send-now', id: 'parked' }]);
  assert.equal(chat.state.sdkQueuedInputs.length, 1);
  chat.state.sdkQueuedInputs.push({ id: 'dispatch', text: 'in flight', ts: 1, status: 'dispatching' });
  action = chat._renderSdkQueueBubbles()[0].props.children[2];
  assert.equal(action.props.disabled, true);
});

test('active SDK prompts replay after refresh and persist until their exact transcript echo or a new incarnation', t => {
  const f = fixture(t), socket = f.open(), chat = new f.Chat({ sdkMode: true, requests: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  const active = { id: 'turn-A', text: 'same prompt', timestamp: '2026-11-19T00:00:00.123Z', requestId: 'local-send' };
  const snapshot = { type: 'queue-state', instanceKey: 'a', epoch: 'incarnation-A', items: [], activeInput: active };
  f.frame(socket, snapshot);
  chat.state.pendingInputs = [{ id: 'local-send', wireText: 'same prompt' }];
  f.provider.addMessageHandler(chat._onTerminalWsMessage);
  assert.equal(chat.state.pendingInputs.length, 1, 'the original sender also gets exactly one prompt');
  const record = chat.state.pendingInputs[0];
  assert.equal(record.sdkActiveId, active.id); assert.equal(record.wireText, active.text);
  f.frame(socket, { ...snapshot, activeInput: null });
  assert.equal(chat.state.pendingInputs.length, 1, 'cross-channel persistence delay cannot make the prompt vanish');
  const React = require('react');
  const echo = React.createElement('chat-message', { role: 'user', text: active.text, timestamp: active.timestamp, requestIndex: 7 });
  assert.deepEqual(reconcilePendingInputs(chat.state.pendingInputs, [echo]), []);
  const local = chat._createPendingInputRecord('another unacknowledged send');
  chat.state.pendingInputs.push(local);
  f.frame(socket, { ...snapshot, epoch: 'new-process-same-cwd', activeInput: null });
  assert.deepEqual(chat.state.pendingInputs, [local], 'a new server incarnation clears only its obsolete authoritative prompt');
  f.frame(socket, { ...snapshot, instanceKey: 'b' });
  assert.equal(chat.state.sdkQueueEpoch, 'new-process-same-cwd');
});

test('a queue arriving before SDK mode discovery survives cold loading', t => {
  const f = fixture(t), chat = new f.Chat({ sdkMode: false, cliMode: false });
  chat.setState = patch => Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch);
  chat._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'a', epoch: 'early', paused: true,
    items: [{ id: 'parked', text: 'must survive refresh', ts: 1, status: 'queued' }], activeInput: null });
  assert.equal(chat.state.sdkQueuedInputs.length, 1);
  assert.equal(chat.state.sdkQueuePaused, true);
  assert.deepEqual(chat._renderSdkQueueBubbles(), []);
  assert.equal(chat.shouldComponentUpdate({ ...chat.props, sdkMode: true }, chat.state), true);
  chat.props = { ...chat.props, sdkMode: true };
  assert.equal(chat._renderSdkQueueBubbles().length, 1);
});

test('conversation role filtering cannot hide the live queue controls above the composer', t => {
  const f = fixture(t), React = require('react');
  const chat = new f.Chat({ sdkMode: true, cliMode: true, mainAgentSessions: [], requests: [] });
  chat.state.allItems = [React.createElement('message', { key: 'u', role: 'user' }),
    React.createElement('message', { key: 'a', role: 'assistant' })];
  chat.state.roleFilterSelected = new Set(['assistant']);
  chat.state.sdkQueuedInputs = [{ id: 'q', text: 'queued draft', ts: 1, status: 'queued' }];
  const contains = node => !!node?.props && (node.props.title === 'queued draft'
    || React.Children.toArray(node.props.children).some(contains));
  assert.equal(contains(chat.render()), true);
  chat.props = { ...chat.props, sdkMode: false };
  assert.equal(contains(chat.render()), false, 'a native/read-only view must not expose an SDK queue');
});

test('late-mounted task consumers receive the authoritative list and disconnect discards its replay', t => {
  const f = fixture(t), socket = f.open();
  const snapshot = { type: 'sdk-task-snapshot', instanceKey: 'a', sessionId: 's',
    tasks: [{ taskId: '1', subject: 'Verify', status: 'pending' }] };
  f.frame(socket, snapshot);
  const chat = new f.Chat({ sdkMode: false });
  chat.setState = change => Object.assign(chat.state, change);
  f.provider.addMessageHandler(chat._onTerminalWsMessage);
  f.provider.addStateListener(chat._onTerminalWsState);
  assert.deepEqual(chat.state.sdkTaskSnapshot.tasks, snapshot.tasks, 'mode discovery must not discard early replay');
  chat._onTerminalWsMessage({ ...snapshot, instanceKey: 'b', tasks: [] });
  assert.equal(chat.state.sdkTaskSnapshot.tasks.length, 1);
  chat._onTerminalWsMessage({ ...snapshot, tasks: [{ taskId: 'bad', subject: 'No', status: 'unknown' }] });
  assert.deepEqual(chat.state.sdkTaskSnapshot.tasks, [], 'unknown states cannot turn into a pending task');
  f.frame(socket, snapshot);
  socket.onclose();
  assert.deepEqual(chat.state.sdkTaskSnapshot.tasks, []);
  f.timeout(2000); f.open();
  const replay = []; f.provider.addMessageHandler(value => replay.push(value));
  assert.deepEqual(replay, []);
  chat._unmounted = true;
  chat._onTerminalWsMessage(snapshot);
  assert.deepEqual(chat.state.sdkTaskSnapshot.tasks, [], 'retired view callbacks cannot resurrect tasks');
});

test('the baseline task strip expands in creation order and hides after every task settles', t => {
  const f = fixture(t), React = require('react');
  const dispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
  let expanded = false;
  const draw = snapshot => {
    const previous = dispatcher.current, effects = [];
    dispatcher.current = {
      useState() { return [expanded, value => { expanded = typeof value === 'function' ? value(expanded) : value; }]; },
      useEffect(fn) { effects.push(fn); },
    };
    try { const tree = f.TaskHud({ snapshot }); effects.forEach(fn => fn()); return tree; }
    finally { dispatcher.current = previous; }
  };
  const tasks = [{ taskId: '1', subject: 'Read', status: 'completed' },
    { taskId: '2', subject: 'Verify', status: 'pending' }];
  const collapsed = draw({ tasks });
  const summary = collapsed.props.children.props.children[0];
  assert.equal(summary.props.role, 'status');
  assert.match(summary.props.children[0].props.children, /^✓ 1\/2 (tasks|任务)$/);
  assert.equal(summary.props.children[1].props.children.props.children, 'Verify');
  const button = summary.props.children.at(-1).props.children;
  assert.equal(button.props['aria-expanded'], false);
  button.props.onClick();
  const open = draw({ tasks });
  const rows = open.props.children.props.children[1];
  assert.equal(rows.props.id, button.props['aria-controls']);
  assert.deepEqual(rows.props.children.map(row => row.props.task.taskId), ['1', '2']);
  assert.equal(draw({ tasks: tasks.map(task => ({ ...task, status: 'failed' })) }), null);
  assert.equal(expanded, false);
  assert.equal(draw({ tasks: [] }), null);
});

test('live task HUD is independent of role filtering and hidden in pinned or local history', t => {
  const f = fixture(t), React = require('react');
  const chat = new f.Chat({ sdkMode: true, cliMode: true, mainAgentSessions: [], requests: [] });
  chat.state.allItems = [React.createElement('message', { key: 'u', role: 'user' }),
    React.createElement('message', { key: 'a', role: 'assistant' })];
  chat.state.roleFilterSelected = new Set(['assistant']);
  const contains = node => !!node?.props && (node.type === f.TaskHud
    || React.Children.toArray(node.props.children).some(contains));
  assert.equal(contains(chat.render()), true);
  for (const change of [{ isLocalLog: true }, { sessionUpperBoundTs: 'old' }, { sdkMode: false }]) {
    const before = chat.props; chat.props = { ...before, ...change };
    assert.equal(contains(chat.render()), false); chat.props = before;
  }
});

test('native pending requests replay to late consumers once, reject foreign views, and clear on resolution or disconnect', t => {
  const f = fixture(t), socket = f.open();
  const pending = { type: 'sdk-ask-pending', id: 'native_fixture', itemId: 'card', instanceKey: 'a',
    questions: [{ id: 'choice', question: 'Choose', options: [{ label: 'A' }] }] };
  f.frame(socket, pending);
  const chat = new f.Chat({ sdkMode: true });
  chat.setState = change => Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change);
  f.provider.addMessageHandler(chat._onTerminalWsMessage);
  assert.equal(chat.state.pendingAsk.id, pending.id);
  f.frame(socket, pending); assert.equal(chat.state.askQueue.length, 0);
  chat._onTerminalWsMessage({ ...pending, id: 'native_foreign', instanceKey: 'b' });
  assert.equal(chat.state.askQueue.length, 0);
  f.frame(socket, { type: 'sdk-ask-resolved', id: pending.id, itemId: 'card', questions: pending.questions,
    instanceKey: 'a', codexAnswers: { choice: { answers: ['A'] } } });
  assert.equal(chat.state.pendingAsk, null);
  assert.deepEqual(chat.state.localAskAnswers.card, { Choose: 'A' });
  let replay = []; f.provider.addMessageHandler(frame => replay.push(frame)); assert.deepEqual(replay, []);
  f.frame(socket, pending); socket.onclose(); f.timeout(2000); f.open();
  replay = []; f.provider.addMessageHandler(frame => replay.push(frame)); assert.deepEqual(replay, []);
});

test('agent snapshots survive late SDK discovery, reject another instance and replay their original timestamp after reconnect', t => {
  const f = fixture(t), socket = f.open();
  const frame = { type: 'sdk-agent-snapshot', instanceKey: 'a', sessionId: 'native-root', available: true,
    agents: [{ taskId: 'native-child', title: 'Native Name', status: 'in_progress', createdAt: 123000, lastToolName: 'fixture.image' }] };
  f.frame(socket, frame);
  const chat = new f.Chat({ sdkMode: false });
  chat.setState = change => Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change);
  f.provider.addMessageHandler(chat._onTerminalWsMessage); f.provider.addStateListener(chat._onTerminalWsState);
  assert.deepEqual(chat.state.sdkAgentSnapshot.agents, frame.agents);
  chat._onTerminalWsMessage({ ...frame, instanceKey: 'b', agents: [] });
  assert.equal(chat.state.sdkAgentSnapshot.agents.length, 1);
  socket.onclose(); assert.deepEqual(chat.state.sdkAgentSnapshot.agents, []);
  assert.equal(chat.state.activeAgentsBarVisible, false);
  f.timeout(2000); const next = f.open();
  f.frame(next, frame);
  assert.equal(chat.state.sdkAgentSnapshot.agents[0].createdAt, 123000);
  f.frame(next, { ...frame, available: false }); assert.deepEqual(chat.state.sdkAgentSnapshot.agents, []);
  chat._unmounted = true; f.frame(next, frame); assert.deepEqual(chat.state.sdkAgentSnapshot.agents, []);
});

test('the baseline agent card keeps creation order, pending/tool/time semantics and only its header is interactive', t => {
  const f = fixture(t), React = require('react');
  f.open();
  const dispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
  let collapsed = false, cleanups = [];
  const visible = [];
  const onVisibleChange = value => visible.push(value);
  const draw = snapshot => {
    cleanups.forEach(fn => fn()); cleanups = [];
    let index = 0; const effects = [], old = dispatcher.current;
    dispatcher.current = { useMemo: fn => fn(), useEffect: fn => effects.push(fn),
      useState: () => index++ === 0 ? [collapsed, update => { collapsed = typeof update === 'function' ? update(collapsed) : update; }] : [0, () => {}] };
    try {
      const tree = f.AgentHud({ snapshot, onVisibleChange });
      cleanups = effects.map(fn => fn()).filter(fn => typeof fn === 'function'); return tree;
    } finally { dispatcher.current = old; }
  };
  t.after(() => cleanups.forEach(fn => fn()));
  const agents = [{ taskId: 'one', title: 'One', status: 'pending', createdAt: 1, lastToolName: 'must remain hidden' },
    { taskId: 'two', title: 'Two', status: 'in_progress', createdAt: Date.now() - 10000, lastToolName: 'fixture.image' }];
  const tree = draw({ agents });
  const header = tree.props.children[0], rows = tree.props.children[1];
  assert.equal(header.type, 'button'); assert.equal(header.props['aria-expanded'], true);
  assert.deepEqual(rows.props.children.map(row => row.props.row.taskId), ['one', 'two']);
  const first = rows.props.children[0], firstRow = first.type(first.props);
  assert.equal(firstRow.props.children[1].props.children[1], '');
  assert.equal(firstRow.props.children[2].props.children, '');
  const second = rows.props.children[1], secondRow = second.type(second.props);
  assert.equal(secondRow.props.children[1].props.children[1].props.title, 'fixture.image');
  assert.match(secondRow.props.children[2].props.children, /10s/);
  assert.equal(secondRow.props.onClick, undefined, 'the removed avatar/focus interaction must not return');
  assert.equal(f.intervals.size, 2, 'one Provider watchdog and one visible-card clock');
  header.props.onClick(); const folded = draw({ agents });
  assert.equal(folded.props.children[0].props['aria-expanded'], false); assert.equal(folded.props.children[1], false);
  assert.equal(f.intervals.size, 1, 'collapse releases the card clock');
  assert.equal(draw({ agents: [] }), null); assert.equal(visible.at(-1), false);
});

test('agent card stays in both message branches and hides with role filter, historical pin or local history', t => {
  const f = fixture(t), React = require('react');
  const chat = new f.Chat({ sdkMode: true, cliMode: true, mainAgentSessions: [], requests: [] });
  const contains = node => !!node?.props && (node.type === f.AgentHud || React.Children.toArray(node.props.children).some(contains));
  assert.equal(contains(chat.render()), true);
  chat.state.allItems = [React.createElement('message', { key: 'u', role: 'user' })];
  assert.equal(contains(chat.render()), true);
  chat.state.roleFilterOpen = true; assert.equal(contains(chat.render()), false); chat.state.roleFilterOpen = false;
  for (const patch of [{ sessionUpperBoundTs: 1 }, { attachedSid: 'history' }, { sdkMode: false }]) {
    const old = chat.props; chat.props = { ...old, ...patch }; assert.equal(contains(chat.render()), false); chat.props = old;
  }
  chat._getIsHistoryLog = () => true; assert.equal(contains(chat.render()), false);
});

test('owned SDK errors remain at the tail, merge recurrences and announce only the latest failure', t => {
  const f = fixture(t), React = require('react'), { message } = require('antd'), alerts = [], old = message.error;
  message.error = text => alerts.push(text); t.after(() => { message.error = old; });
  const chat = new f.Chat({ sdkMode: true, cliMode: true, mainAgentSessions: [], requests: [] });
  chat.setState = change => Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change);
  const error = (text, instanceKey = 'a') => chat._onTerminalWsMessage({ type: 'sdk-error', message: text, instanceKey });
  error('other workspace', 'b'); assert.deepEqual(chat.state.sdkErrors, []); assert.deepEqual(alerts, []);
  for (const text of ['first', 'second', 'third', 'fourth', 'second']) error(text);
  assert.deepEqual(chat.state.sdkErrors.map(row => [row.message, row.count]), [['third', 1], ['fourth', 1], ['second', 2]]);
  const stack = chat._renderSdkErrors(), rows = React.Children.toArray(stack.props.children);
  assert.equal(rows.length, 3); assert.equal(rows.at(-1).props.title, 'second');
  assert.equal(rows.at(-1).props['aria-label'], 'second');
  assert.equal(React.Children.toArray(rows.at(-1).props.children)[1].props.children.join(''), '×2');
  assert.equal(chat._renderSdkErrorAnnouncer().props.role, 'status');
  assert.ok(chat._renderSdkErrorAnnouncer().props.children.includes('second'));
  const contains = node => !!node?.props && ((node.props['aria-label'] === 'second')
    || React.Children.toArray(node.props.children).some(contains));
  assert.equal(contains(chat.render()), true, 'empty view still contains its terminal failure');
  chat.state.allItems = [React.createElement('message', { key: 'u', role: 'user' })]; chat.state.visibleCount = 1;
  assert.equal(contains(chat.render()), true, 'the populated desktop tail also contains its failure');
  const visible = chat.renderSessionMessages([
    { role: 'user', content: 'task' },
    { role: 'assistant', content: [{ type: 'text', text: 'Error: genuine model answer' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'Error: Viewer failure' }], _sdkFeedback: true },
    { role: 'user', content: '[cc-viewer:retry] internal continuation', _sdkRetryOf: 'failed-turn' },
  ], 's0', () => null, {}).items;
  assert.equal(visible.length, 2, 'Viewer feedback is not a duplicate assistant bubble');
  assert.equal(visible[1].props.content[0].text, 'Error: genuine model answer');
  chat._unmounted = true; error('late frame'); assert.equal(chat.state.sdkErrors.at(-1).message, 'second');
});

test('native retry instructions stay out of active-input bubbles even for late-mount queue replay', t => {
  const f = fixture(t), chat = new f.Chat({ sdkMode: true, requests: [] });
  chat.setState = change => Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change);
  const active = { id: 'retry-input', text: '[cc-viewer:retry] hidden continuation',
    timestamp: '2026-11-20T00:00:00.000Z', retryOf: 'failed-turn' };
  chat._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'a', epoch: 'process', items: [], activeInput: active });
  assert.deepEqual(chat.state.pendingInputs, []);
  chat._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'a', epoch: 'process', items: [],
    activeInput: { ...active, id: 'user-input', retryOf: undefined } });
  assert.equal(chat.state.pendingInputs.length, 1, 'ordinary user text is not hidden by a sentinel prefix');
});

test('failed sends retain the terminal explanation, accepted sends and history resume clear it', t => {
  const f = fixture(t), { message } = require('antd'), old = message.error;
  message.error = () => {}; t.after(() => { message.error = old; });
  const chat = new f.Chat({ sdkMode: true, cliMode: true, mainAgentSessions: [], requests: [] });
  chat.setState = (change, cb) => { Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change); cb?.(); };
  chat.scrollToBottom = () => {};
  chat.state.sdkErrors = [{ message: 'retained failure', count: 1, ts: Date.now() }];
  chat.context = { isOpen: () => true, send: () => false };
  chat._sendUserMessageImmediate('unsent'); assert.equal(chat.state.sdkErrors.length, 1);
  chat.context = { isOpen: () => true, send: () => true };
  chat._sendUserMessageImmediate('accepted'); assert.deepEqual(chat.state.sdkErrors, []);
  chat.state.sdkErrors = [{ message: 'old session', count: 1, ts: Date.now() }];
  const previousProps = chat.props, previousState = { ...chat.state };
  chat.props = { ...chat.props, sdkResumeId: 'new-session' }; chat.componentDidUpdate(previousProps, previousState);
  assert.deepEqual(chat.state.sdkErrors, []);
  assert.equal(chat._renderSdkErrorAnnouncer().props.children, '', 'live region remains mounted after clear');
});


test('native retry notices preserve raw text and exact-turn settlement without clearing unrelated error rows', t => {
  const f = fixture(t), React = require('react'), chat = new f.Chat({ sdkMode: true });
  chat.setState = change => Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change);
  const frame = body => chat._onTerminalWsMessage({ type: 'sdk-retry-state', instanceKey: 'a', turnId: 't1', ...body });
  chat.state.sdkErrors = [{ message: 'older failure', turnId: 'old', retryable: true, ts: Date.now() }];
  frame({ phase: 'retrying', instanceKey: 'b', error: 'foreign' }); assert.equal(chat.state.sdkRetry, null);
  frame({ phase: 'retrying', error: { message: 'invalid' } }); assert.equal(chat.state.sdkRetry, null);
  const raw = 'Reconnecting... 1/1 (native wording, unknown maximum)';
  frame({ phase: 'retrying', error: raw });
  assert.equal(React.Children.toArray(chat._renderSdkErrors().props.children)[0].props.children, raw);
  assert.equal(Object.hasOwn(chat.state.sdkRetry, 'maxRetries'), false);
  frame({ phase: 'recovered', turnId: 'other' }); assert.equal(chat.state.sdkRetry.error, raw);
  frame({ phase: 'recovered' }); assert.equal(chat.state.sdkRetry, null); assert.equal(chat.state.sdkErrors.length, 1);
  frame({ phase: 'retrying', error: raw }); f.timeout(15000); assert.equal(chat.state.sdkRetry, null);
  chat._unmounted = true; frame({ phase: 'retrying', error: raw }); assert.equal(chat.state.sdkRetry, null);
});

test('manual retry uses original recovery row, hides the whole failure, and clears only its lineage on success', t => {
  const f = fixture(t), React = require('react'), { message } = require('antd'), oldError = message.error, oldWarning = message.warning;
  message.error = message.warning = () => {}; t.after(() => { message.error = oldError; message.warning = oldWarning; });
  const chat = new f.Chat({ sdkMode: true, viewInstance: 'a' }), sent = [];
  chat.setState = change => Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change);
  chat.context = { isOpen: () => true, send: body => { sent.push(body); return true; } };
  const fail = turnId => chat._onTerminalWsMessage({ type: 'sdk-error', instanceKey: 'a', message: 'native exhausted', turnId, retryable: true, apiStatus: 503 });
  fail('failed');
  const row = chat.state.sdkErrors[0];
  const rows = () => React.Children.toArray(chat._renderSdkErrors()?.props.children);
  const button = React.Children.toArray(rows()[0].props.children).find(node => node.type === 'button');
  button.props.onClick();
  assert.deepEqual(sent, [{ type: 'sdk-retry-turn', instanceKey: 'a', turnId: 'failed' }]);
  assert.equal(rows().length, 1); assert.equal(rows()[0].props.role, 'status');
  assert.equal(chat.state.sdkErrors[0].recovering, true);
  chat._onTerminalWsMessage({ type: 'sdk-retry-state', instanceKey: 'a', phase: 'recovering', retryOf: 'failed', turnId: 'continuation' });
  fail('failed-again'); assert.equal(chat.state.sdkRetry, null); assert.equal(chat.state.sdkErrors[0].count, 2);
  assert.equal(chat.state.sdkErrors[0].recovering, undefined); assert.ok(React.Children.toArray(rows()[0].props.children).some(node => node.type === 'button'));
  chat._handleSdkRetry(chat.state.sdkErrors[0]);
  chat.state.sdkErrors.push({ ...row, message: 'unrelated', turnId: 'different' });
  chat._onTerminalWsMessage({ type: 'sdk-retry-state', instanceKey: 'a', phase: 'recovered', retryOf: 'failed-again', turnId: 'continued' });
  assert.equal(chat.state.sdkRetry, null); assert.deepEqual(chat.state.sdkErrors.map(row => row.turnId), ['different']);
  assert.equal(chat._sdkRetryResetTimer, null);
});

test('retry send failures roll back only their row, rejection and the fallback restore the button, explicit clear cancels its timer', t => {
  const f = fixture(t), { message } = require('antd'), old = message.warning;
  message.warning = () => {}; t.after(() => { message.warning = old; });
  const chat = new f.Chat({ sdkMode: true });
  chat.setState = change => Object.assign(chat.state, typeof change === 'function' ? change(chat.state) : change);
  const row = { message: 'failed', turnId: 'failed', retryable: true, ts: Date.now() }, other = { ...row, turnId: 'other', recovering: true };
  chat.state.sdkErrors = [row, other];
  for (const send of [() => false, () => { throw new Error('closed'); }]) {
    chat.context = { isOpen: () => true, send }; chat._handleSdkRetry(row);
    assert.equal(chat.state.sdkRetry, null); assert.equal(chat.state.sdkErrors[0].recovering, false);
    assert.equal(chat.state.sdkErrors[1].recovering, true);
  }
  chat.context = { isOpen: () => true, send: () => true }; chat._handleSdkRetry(row);
  chat._onTerminalWsMessage({ type: 'sdk-retry-state', instanceKey: 'a', phase: 'rejected', turnId: 'failed', reason: 'stale' });
  assert.equal(chat.state.sdkErrors[0].recovering, false); assert.equal(chat._sdkRetryResetTimer, null);
  chat._handleSdkRetry(row); f.timeout(15000); assert.equal(chat.state.sdkErrors[0].recovering, false);
  chat._handleSdkRetry(row); const timer = chat._sdkRetryResetTimer; chat._clearSdkErrors();
  assert.equal(f.timeouts.has(timer), false); assert.deepEqual(chat.state.sdkErrors, []); assert.equal(chat.state.sdkRetry, null);
});

test('slow upstream toasts preserve concurrent request waits, tick elapsed time, and clear on disconnect, view switch and Stop', t => {
  const f = fixture(t), { message } = require('antd'), opened = [], destroyed = [], oldOpen = message.open, oldDestroy = message.destroy;
  message.open = options => opened.push(options); message.destroy = key => destroyed.push(key);
  t.after(() => { message.open = oldOpen; message.destroy = oldDestroy; });
  const sent = [], chat = new f.Chat({ sdkMode: true, cliMode: true, mainAgentSessions: [], requests: [], viewInstance: 'a' });
  chat.setState = (patch, cb) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); cb?.(); };
  chat.startRender = () => {}; chat._toolFileMonitor.check = () => {}; chat._updateSuggestion = () => {}; chat.scrollToBottom = () => {};
  chat.context = { isOpen: () => true, send: body => { sent.push(body); return true; } };
  const slow = (requestId, instanceKey = 'a') => chat._onTerminalWsMessage({ type: 'sdk-slow-upstream', instanceKey, requestId, waitingMs: 30000 });
  slow('foreign', 'b'); assert.equal(opened.length, 0);
  slow('one'); slow('two'); assert.equal(chat._slowUpstreamPending.size, 2);
  assert.equal(opened.at(-1).duration, 90); assert.ok(opened.at(-1).content.includes('30'));
  chat._slowUpstreamPending.get('one').startedAt -= 10000;
  f.intervals.get(chat._slowUpstreamTickTimer).fn(); assert.ok(opened.at(-1).content.includes('40'));
  chat._onTerminalWsMessage({ type: 'sdk-slow-upstream-resolved', instanceKey: 'a', requestId: 'one' });
  assert.deepEqual([...chat._slowUpstreamPending.keys()], ['two']);
  chat._sendUserMessageImmediate('follow-up'); assert.equal(chat._slowUpstreamPending.size, 1);
  chat._onTerminalWsState('close'); assert.equal(chat._slowUpstreamPending.size, 0); assert.equal(chat._slowUpstreamTickTimer, null);
  slow('replayed'); chat._onTerminalWsState('open'); assert.equal(chat._slowUpstreamPending.size, 0);
  slow('current'); const previous = chat.props, state = { ...chat.state };
  chat.props = { ...previous, viewInstance: 'b' }; chat.componentDidUpdate(previous, state);
  assert.equal(chat._slowUpstreamPending.size, 0); assert.equal(chat._slowUpstreamTickTimer, null);
  slow('stopped'); chat.handleInputStop(); assert.equal(chat._slowUpstreamPending.size, 0);
  assert.equal(sent.at(-1).type, 'sdk-interrupt'); assert.ok(destroyed.includes('sdk-slow-upstream'));
  chat._unmounted = true; slow('late'); assert.equal(chat._slowUpstreamPending.size, 0);
});

test('a late-mounted slow request consumer sees only outstanding requests and socket replacement drops the cache', t => {
  const f = fixture(t), socket = f.open();
  const slow = { type: 'sdk-slow-upstream', requestId: 'pending', instanceKey: 'a', waitingMs: 30000, startedAt: Date.now() - 30000 };
  f.frame(socket, slow); f.frame(socket, { ...slow, requestId: 'settled' });
  f.frame(socket, { type: 'sdk-slow-upstream-resolved', instanceKey: 'a', requestId: 'settled' });
  const messages = []; f.provider.addMessageHandler(frame => messages.push(frame));
  assert.equal(messages.length, 1); assert.equal(messages[0].requestId, 'pending'); assert.ok(messages[0].waitingMs >= 30000);
  socket.onclose(); assert.equal(f.provider.slowUpstreams.size, 0);
  f.timeout(2000); f.open(); const later = []; f.provider.addMessageHandler(frame => later.push(frame));
  assert.deepEqual(later, []);
});


test('cold SDK identity hydration preserves the wait replayed before the mode and project HTTP responses', t => {
  const f = fixture(t), { message } = require('antd'), oldOpen = message.open, oldDestroy = message.destroy;
  message.open = message.destroy = () => {}; t.after(() => { message.open = oldOpen; message.destroy = oldDestroy; });
  const chat = new f.Chat({ sdkMode: false, projectName: '', mainAgentSessions: [], requests: [] });
  chat.setState = patch => Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch);
  chat.startRender = () => {}; chat._toolFileMonitor.check = () => {}; chat._updateSuggestion = () => {};
  chat._onTerminalWsMessage({ type: 'sdk-slow-upstream', instanceKey: 'a', requestId: 'cold', waitingMs: 30000 });
  const previous = chat.props, state = { ...chat.state };
  chat.props = { ...previous, sdkMode: true, projectName: 'same', viewProject: 'same', viewInstance: 'a', attachedSid: 'thread' };
  chat.componentDidUpdate(previous, state);
  assert.deepEqual([...chat._slowUpstreamPending.keys()], ['cold']);
  chat._clearSlowUpstreamToast();
});

test('quote-only SDK sends exact blockquote, failed sends retain chips, slash retains them', t => {
  const f = fixture(t), socket = f.open(), chat = new f.Chat({ sdkMode: true, mainAgentSessions: [], requests: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  chat.context = f.provider;
  chat._inputRef.current = { value: '', style: {}, scrollHeight: 40 };
  chat._addPendingQuote('line one\nline two'); chat._addPendingQuote('line one\nline two');
  assert.equal(chat.state.pendingQuotes.length, 1);
  chat.handleInputSend();
  assert.equal(socket.sent.at(-1).text, '> line one\n> line two\n\n');
  assert.deepEqual(chat.state.pendingQuotes, []);
  chat._addPendingQuote('retained'); chat._inputRef.current.value = '/model fast'; chat.handleInputSend();
  assert.equal(socket.sent.at(-1).text, '/model fast'); assert.equal(chat.state.pendingQuotes[0].text, 'retained');
  const { message } = require('antd'), oldError = message.error; message.error = () => {}; t.after(() => { message.error = oldError; });
  chat._inputRef.current.value = 'unsent'; socket.fail = true; chat.handleInputSend();
  assert.equal(chat._inputRef.current.value, 'unsent'); assert.equal(chat.state.pendingQuotes[0].text, 'retained');
});

test('multiline PTY quote uses correlated sanitized paste and restores complete text on failed ack', t => {
  const f = fixture(t), socket = f.open(), chat = new f.Chat({ sdkMode: false, mainAgentSessions: [], requests: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  chat.context = f.provider;
  chat._inputRef.current = { value: 'follow up', style: {}, scrollHeight: 40 };
  chat._addPendingQuote('selected\x1b[201~\ntext'); chat.handleInputSend();
  const frame = socket.sent.at(-1);
  assert.equal(frame.type, 'input-sequential'); assert.ok(frame.seq);
  assert.deepEqual(frame.chunks, ['\x1b[200~> selected\n> text\n\nfollow up\x1b[201~', '\r']);
  assert.deepEqual(chat.state.pendingQuotes, []); assert.equal(chat.state.pendingInputs.length, 1);
  const { message } = require('antd'), oldError = message.error; message.error = () => {}; t.after(() => { message.error = oldError; });
  chat._settleBracketPasteSequential(frame.seq, false);
  assert.equal(chat._inputRef.current.value, '> selected\x1b[201~\n> text\n\nfollow up');
  assert.deepEqual(chat.state.pendingInputs, []); assert.equal(chat._pendingSequentialInputs.size, 0);
});

test('quote drafts survive same-thread live rebuilds and clear on explicit native resume', t => {
  const f=fixture(t), tail={conversationId:'thread:a', sessionId:'s', messages:[{role:'user',_timestamp:'first'}]};
  const chat=new f.Chat({sdkMode:true,sdkResumeId:'a',mainAgentSessions:[tail],requests:[]});
  chat.setState=(patch,callback)=>{Object.assign(chat.state,typeof patch==='function'?patch(chat.state):patch);callback?.();};
  chat.startRender=()=>{};chat._toolFileMonitor.check=()=>{};chat._updateSuggestion=()=>{};
  chat._addPendingQuote('keep me'); const prior=chat.props, state={...chat.state};
  chat.props={...prior,mainAgentSessions:[{...tail,messages:[...tail.messages,{role:'assistant',_timestamp:'second'}]}]};
  chat.componentDidUpdate(prior,state);assert.equal(chat.state.pendingQuotes[0].text,'keep me');
  const next=chat.props; chat.props={...next,sdkResumeId:'b'};chat.componentDidUpdate(next,{...chat.state});
  assert.deepEqual(chat.state.pendingQuotes,[]);
});
