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
export { default as Chat } from './src/components/chat/ChatView.jsx';`, resolveDir: web },
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
  const { Provider, Chat } = require(output);
  const provider = new Provider({ open: true }); provider.addStateListener(state => states.push(state));
  provider.componentDidMount(); cleanup = () => provider.componentWillUnmount();
  const open = (socket = sockets.at(-1)) => { socket.readyState = 1; socket.onopen(); return socket; };
  const frame = (socket, value) => socket.onmessage({ data: JSON.stringify(value) });
  const timeout = delay => {
    const entry = [...timeouts].find(([, value]) => value.delay === delay);
    assert.ok(entry, `expected timeout ${delay}`); timeouts.delete(entry[0]); entry[1].fn();
  };
  return { provider, Chat, states, sockets, open, frame, timeout, timeouts, intervals, events,
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
