// Actual React component callbacks with deterministic browser/hook fixtures.
// This verifies state and wiring, not mounted DOM, browser drag or CSS layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SDK_WORKSPACE_ORDER_KEY, SDK_WORKSPACE_ORDER_DRAG } from '../src/utils/sdkWorkspaceOrder.js';
import { sdkToJSONLEntry } from '../../../packages/app/lib/sdk-adapter.js';

const web = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(web, 'package.json'));
const originalCssLoader = require.extensions['.css'];
require.extensions['.css'] = () => {};
test.after(() => {
  if (originalCssLoader) require.extensions['.css'] = originalCssLoader;
  else delete require.extensions['.css'];
});
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
mkdirSync(join(web, 'node_modules/.cache'), { recursive: true });
const directory = mkdtempSync(join(web, 'node_modules/.cache/sdk-tabs-test-'));
const output = join(directory, 'components.cjs');
await build({ stdin: { contents: `export { default as Component } from './src/components/dashboard/SdkWorkspaceTabs.jsx';
export { default as TerminalPanel } from './src/components/terminal/TerminalPanel.jsx';
export { default as WorkspaceRoot } from './src/components/dashboard/WorkspaceRoot.jsx';
export { SettingsProvider } from './src/contexts/SettingsContext.jsx';
export { getLang, setLang, t as translate } from './src/i18n.js';
export { ResumeSessionsList } from './src/components/chat/ResumeSessionsPopover.jsx';
export { default as QuickAutoApproveRows } from './src/components/common/QuickAutoApproveRows.jsx';
export { default as WorkspaceList } from './src/components/dashboard/WorkspaceList.jsx';
export { default as NewProjectModal } from './src/components/dashboard/NewProjectModal.jsx';
export { default as VoicePackSettings } from './src/components/settings/VoicePackSettings.jsx';
export { _resetForTests as resetVoice, playEvent as playVoiceEvent } from './src/utils/voicePackPlayer.js';
export { DEFAULT_BINDINGS, getDefaultBindingsForLocale } from '../../packages/app/server/lib/voice-pack-events.js';
export { default as AppBase } from './src/AppBase.jsx';
export { default as ChatView } from './src/components/chat/ChatView.jsx';
export { default as DetailPanel } from './src/components/dashboard/DetailPanel.jsx';
export { default as ContextTab } from './src/components/dashboard/ContextTab.jsx';
export { default as ProxyChip } from './src/components/chat/ProxyChip.jsx';`, resolveDir: web },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: output,
  loader: { '.css': 'empty', '.svg': 'text', '.png': 'dataurl', '.gif': 'dataurl' }, logLevel: 'error' });
test.after(() => rmSync(directory, { recursive: true, force: true }));

const session = (instanceKey, busy = false) => ({ instanceKey, cwd: `/${instanceKey}/same`, projectName: 'same', busy });

test('SDK placeholder notice stays in the instructions section and never changes raw or captured instructions', t => {
  const walk = (node, predicate) => {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of require('react').Children.toArray(node.props?.children)) {
      const found = walk(child, predicate); if (found) return found;
    }
    return null;
  };
  const sdk = sdkToJSONLEntry({ message: { content: [] } }, [], 'fixture', 'fixture');
  const f = fixture(t, { component: 'ContextTab', props: { body: sdk.body, sdkSource: true } });
  f.draw();
  const section = walk(f.tree, node => node.props?.sectionKey === 'instructions');
  const item = section.props.items[0];
  assert.equal(item.raw, 'You are Codex');
  assert.equal(item.blocks[0].text, 'You are Codex');
  assert.equal(item.blocks[1]?.type, 'separator');
  assert.equal(item.blocks[2]?.type, 'markdown');
  assert.match(item.blocks[2].text, /Codex/);
  assert.match(item.blocks[2].text, /HTTP/);
  assert.notEqual(item.blocks[2].text, 'ui.context.sdkSystemPromptNotice');
  section.props.onSelect(item); f.draw();
  const display = walk(f.tree, node => node.props?.blocks === item.blocks);
  assert.ok(display, 'the original content pane displays the annotated blocks');
  const toggle = walk(f.tree, node => typeof node.props?.checked === 'boolean' && node.props?.onChange);
  toggle.props.onChange(true); f.draw();
  assert.equal(walk(f.tree, node => node.type === 'pre').props.children, 'You are Codex');
  assert.equal(sdk.body.instructions, 'You are Codex');
  assert.deepEqual(f.requests, [], 'viewing instructions never launches a control/model request');

  for (const request of [sdk, { ...sdk, _sdkSource: undefined }, { ...sdk, _sdkSource: 'true' },
    sdkToJSONLEntry({ message: { content: [] } }, [], 'fixture', 'fixture', { systemPrompt: 'Actual captured instructions' })]) {
    const panel = new f.DetailPanel({ request, requests: [request], allRequests: [request], selectedIndex: 0, sdkMode: true });
    const tabs = walk(panel.render(), node => Array.isArray(node.props?.items) && node.props.items.some(tab => tab.key === 'context'));
    const context = walk(tabs.props.items.find(tab => tab.key === 'context').children, node => node.type?.name === 'ContextTab');
    assert.equal(context.props.sdkSource, request._sdkSource === true);
    const c = fixture(t, { component: 'ContextTab', props: context.props }); c.draw();
    const blocks = walk(c.tree, node => node.props?.sectionKey === 'instructions').props.items[0].blocks;
    assert.equal(blocks.length, request._sdkSource === true && request.body.instructions === 'You are Codex' ? 3 : 1);
    assert.equal(blocks[0].text, request.body.instructions);
  }
});

for (const terminal of ['sdk-plan-resolved', 'perm-hook-resolved', 'perm-hook-timeout']) {
  test(`${terminal} clears same-batch pending by normalized id without affecting a different request`, t => {
    const f = fixture(t), chat = new f.ChatView({ sdkMode: true });
    const updates = [];
    chat.setState = (update, callback) => updates.push([update, callback]);
    const flush = () => {
      while (updates.length) {
        const batch = updates.splice(0);
        for (const [update] of batch) {
          const patch = typeof update === 'function' ? update(chat.state) : update;
          if (patch) Object.assign(chat.state, patch);
        }
        for (const [, callback] of batch) callback?.();
      }
    };
    const plan = terminal === 'sdk-plan-resolved';
    const pendingType = plan ? 'sdk-plan-pending' : 'perm-hook-pending';
    const stateKey = plan ? 'pendingPlanApproval' : 'pendingPermission';
    for (const id of [0, 'request']) {
      chat._onTerminalWsMessage({ type: pendingType, id, toolName: 'fixture', input: {} });
      chat._onTerminalWsMessage({ type: terminal, id: String(id) });
      flush();
      assert.equal(chat.state[stateKey], null);
    }
    chat._onTerminalWsMessage({ type: pendingType, id: 'head', toolName: 'fixture', input: {} });
    if (!plan) chat._onTerminalWsMessage({ type: pendingType, id: 'queued', toolName: 'fixture', input: {} });
    chat._onTerminalWsMessage({ type: terminal, id: 'foreign' });
    flush();
    assert.equal(chat.state[stateKey].id, 'head');
    chat._onTerminalWsMessage({ type: terminal, id: 'head' }); flush();
    assert.equal(chat.state[stateKey]?.id || null, plan ? null : 'queued');
    chat._onTerminalWsMessage({ type: terminal, id: 'head' }); flush();
    assert.equal(chat.state[stateKey]?.id || null, plan ? null : 'queued');
  });
}

test('SDK plan surfaces never derive a PTY approval or enter its keystroke sinks', t => {
  const f = fixture(t), bubbles = [];
  const chat = new f.ChatView({ sdkMode: true, cliMode: true, onPendingPtyPlan: value => bubbles.push(value) });
  chat.setState = (update, callback) => {
    const patch = typeof update === 'function' ? update(chat.state) : update;
    if (patch) Object.assign(chat.state, patch);
    callback?.();
  };
  chat._currentLastPendingPlanId = 'stale-plan';
  const previous = { ...chat.state };
  chat.componentDidUpdate(chat.props, previous);
  assert.equal(chat.state.pendingPtyPlan, null, 'SDK does not derive a keystroke modal from a stale tool id');
  assert.deepEqual(bubbles, []);
  Object.defineProperty(chat, '_inputWs', { get() { assert.fail('SDK accessed the PTY keystroke transport'); } });
  chat.handlePromptOptionClick(1);
  chat.handlePlanFeedbackSubmit(1, 'fixture feedback');
  assert.equal(chat._promptSubmitting, undefined);
});

test('the original SDK context-usage and MCP tabs follow Context and fall back on mode changes', t => {
  const f = fixture(t), request = { timestamp: '2026-11-20T00:00:00Z', url: 'codex://sdk/fixture',
    mainAgent: true, _sdkSource: true, headers: {}, body: { model: 'fixture', input: [{ role: 'user', content: 'fixture' }] },
    response: { status: 200, body: { content: [] } } };
  const panel = new f.DetailPanel({ request, requests: [request], allRequests: [request], selectedIndex: 0,
    sdkMode: true, currentTab: 'mcp-status' });
  const tabs = node => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node.props?.items) && node.props.items.some(item => item.key === 'request')) return node;
    for (const child of require('react').Children.toArray(node.props?.children)) {
      const found = tabs(child); if (found) return found;
    }
    return null;
  };
  const enabled = tabs(panel.render());
  assert.deepEqual(enabled.props.items.map(item => item.key), ['request', 'response', 'context', 'context-usage', 'mcp-status']);
  assert.equal(enabled.props.activeKey, 'mcp-status');
  const usage = enabled.props.items.find(item => item.key === 'context-usage');
  const originalLanguage = require(output).getLang();
  t.after(() => require(output).setLang(originalLanguage));
  const renderUsage = () => usage.children.props.children.type();
  for (const language of ['zh', 'en', 'zh-TW', 'ko', 'ja', 'de', 'es', 'fr', 'it', 'da', 'pl', 'ru', 'ar', 'no', 'pt-BR', 'th', 'tr', 'uk']) {
    const { setLang, translate } = require(output);
    setLang(language);
    const root = renderUsage(), empty = root.props.children;
    assert.equal(empty.type, require('antd').Empty, 'original centered Empty branch');
    assert.equal(empty.props.description.props.type, 'secondary');
    const description = empty.props.description.props.children;
    assert.match(description, /Codex/);
    assert.notEqual(description, 'ui.contextUsage.unavailable');
    assert.notEqual(translate('ui.contextUsage.tab'), 'ui.contextUsage.tab');
    assert.equal(empty.props.children, undefined, 'no fabricated composition or refresh control');
  }
  require(output).setLang('en');
  assert.match(renderUsage().props.children.props.description.props.children, /unavailable/);
  assert.deepEqual(f.requests, [], 'rendering and revisiting an unsupported detail never sends HTTP/model controls');
  panel.props = { ...panel.props, currentTab: 'context-usage' };
  assert.equal(tabs(panel.render()).props.activeKey, 'context-usage');
  const nextProps = { ...panel.props, sdkMode: false };
  assert.equal(panel.shouldComponentUpdate(nextProps, panel.state), true);
  panel.props = nextProps;
  const disabled = tabs(panel.render());
  assert.equal(disabled.props.items.some(item => item.key === 'mcp-status'), false);
  assert.equal(disabled.props.items.some(item => item.key === 'context-usage'), false);
  assert.equal(disabled.props.activeKey, 'context');
  panel.props = { ...nextProps, currentTab: 'raw' };
  assert.equal(tabs(panel.render()).props.activeKey, 'context');
  assert.equal(tabs(panel.render()).props.items.some(item => item.key === 'raw'), false);
  panel.props = { ...nextProps, currentTab: 'mcp-status', request: { ...request, url: 'codex://tool/shell_command', mainAgent: false } };
  assert.equal(tabs(panel.render()).props.activeKey, 'request');
  panel.props = { ...panel.props, currentTab: 'raw', request: { ...panel.props.request, _codexRaw: { fromSeq: 1, toSeq: 2 } } };
  assert.equal(tabs(panel.render()).props.items.some(item => item.key === 'raw'), true);
  assert.equal(tabs(panel.render()).props.activeKey, 'raw');
});

function fixture(t, { blocked = false, component = 'Component', props = {} } = {}) {
  const restoreGlobals = [];
  let cleanup = () => {};
  t.after(() => { cleanup(); restoreGlobals.reverse().forEach(restore => restore()); });
  const values = new Map(), windowEvents = new Map(), documentEvents = new Map(), timers = new Map();
  const navigations = [], requests = [], focused = [];
  let history = { instanceKey: 'a', currentSessionId: 'current', items: [] }, listed = [], live = [session('a'), session('b'), session('c')];
  const location = new URL('http://fixture/base/?instance=a&token=synthetic');
  location.assign = url => navigations.push(url);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (blocked) throw new Error('blocked'); values.set(key, value); },
  };
  const globals = {
    self: globalThis, localStorage: storage,
    PopStateEvent: class { constructor(type) { this.type = type; } },
    navigator: { userAgent: 'Desktop', platform: 'Linux', maxTouchPoints: 1 },
    document: { hidden: false, documentElement: { style: { setProperty() {}, removeProperty() {} }, getAttribute() { return 'dark'; }, classList: { add() {} } },
      body: { style: {} }, createElement() { return { style: {} }; },
      addEventListener: (type, fn) => documentEvents.set(type, fn),
      removeEventListener: type => documentEvents.delete(type) },
    window: { location, innerWidth: 1200, history: { replaceState() {},
      pushState(state, title, href) { location.href = href; navigations.push(href); } },
      dispatchEvent(event) { windowEvents.get(event.type)?.(event); },
      addEventListener: (type, fn) => windowEvents.set(type, fn), removeEventListener: type => windowEvents.delete(type) },
    fetch: async (url, options) => { requests.push({ url, options });
      if (String(url).includes('/api/resume-sessions?')) return { ok: true, json: async () => history };
      if (String(url).includes('/api/resume-session?')) return { ok: true, json: async () => ({ instanceKey: 'a', resumeId: 'restored' }) };
      if (String(url).includes('/api/workspaces/launch')) return { ok: true, json: async () => ({ sdkMode: true, instanceKey: 'launched', projectName: 'same' }) };
      if (options?.method === 'POST') {
        const key = JSON.parse(options.body).instanceKey;
        live = live.filter(row => row.instanceKey !== key);
        return { ok: true, json: async () => ({ reattachedTo: live[0]?.instanceKey || null }) };
      }
      return { ok: true, json: async () => ({ sessions: live, currentInstanceKey: 'a', workspaces: listed }) }; },
    setInterval: fn => { timers.set(1, fn); return 1; }, clearInterval: id => timers.delete(id),
    MutationObserver: class { observe() {} disconnect() {} },
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restoreGlobals.push(() => { if (original) Object.defineProperty(globalThis, key, original); else delete globalThis[key]; });
  }
  const React = require('react');
  const { DndContext } = require('@dnd-kit/core');
  const components = require(output);
  const { AppBase } = components;
  const dispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
  const hooks = [];
  let cursor = 0, pending = [], tree;
  const draw = () => {
    cursor = 0; pending = [];
    const previous = dispatcher.current;
    dispatcher.current = {
      useState(initial) {
        const index = cursor++;
        if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
        return [hooks[index].value, value => { hooks[index].value = typeof value === 'function' ? value(hooks[index].value) : value; }];
      },
      useMemo(fn) { cursor++; return fn(); },
      useCallback(fn) { cursor++; return fn; },
      useRef(initial) { const index = cursor++; return (hooks[index] ||= { current: initial }); },
      useEffect(fn, deps) {
        const index = cursor++, old = hooks[index];
        if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
          pending.push(() => { old?.cleanup?.(); hooks[index] = { deps, cleanup: fn() }; });
        }
      },
    };
    try { tree = components[component]({ onResumed() {}, ...props }); }
    finally { dispatcher.current = previous; }
    const element = React.Children.toArray(tree?.props?.children).find(child => child?.type === DndContext);
    const rows = element ? React.Children.toArray(element.props.children.props.children.props.children)
      .filter(child => child?.props?.id).map(child => child.props.children) : [];
    const tabs = { rows: new Map(rows.map(row => [row.props['data-sdk-workspace'], row])),
      ids: rows.map(row => row.props['data-sdk-workspace']),
      drag: event => element.props.onDragEnd(event) };
    rows.forEach(row => row.ref({ focus: () => focused.push(row.props['data-sdk-workspace']) }));
    pending.forEach(fn => fn());
    return tabs;
  };
  cleanup = () => hooks.forEach(hook => { hook.cleanup?.(); hook.cleanup = null; });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const event = () => ({ prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  const reload = () => { cleanup(); hooks.length = 0; return draw(); };
  return { draw, reload, tick, event, cleanup, AppBase, ChatView: components.ChatView, DetailPanel: components.DetailPanel, ProxyChip: components.ProxyChip, values, windowEvents, documentEvents, timers, requests, focused, navigations,
    get tree() { return tree; }, set live(rows) { live = rows; }, set listed(rows) { listed = rows; }, set history(data) { history = data; } };
}

function voiceFixture(t) {
  const f = fixture(t), exports = require(output), plays = [], sources = [];
  exports.resetVoice();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: class {
    listeners = new Map();
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    play() { plays.push(this.src); queueMicrotask(() => this.listeners.get('ended')?.()); return Promise.resolve(); }
    pause() {}
  } });
  t.after(() => { exports.resetVoice(); if (original) Object.defineProperty(globalThis, 'Audio', original); else delete globalThis.Audio; });
  const app = new f.AppBase({});
  app.state.projectName = 'same'; app.state.sdkMode = true;
  app._resetSSETimeout = () => {};
  app._streamTransport = { open() {
    const handlers = new Map(), source = { addEventListener(name, fn) { handlers.set(name, fn); },
      fire(name, data) { handlers.get(name)?.({ data: typeof data === 'string' ? data : JSON.stringify(data) }); } };
    sources.push(source); return source;
  } };
  app._initControlSSE();
  const emit = (name, data = {}, index = sources.length - 1) => sources[index].fire(name, {
    project: 'same', instanceKey: 'a', turnId: 't1', turnStartedAt: 100, ts: 200, sessionId: 's1', ...data,
  });
  const enable = (events = {}) => { app.state.approvalPrefs.voicePack = { enabled: true, volume: 0.3,
    events: { agentLoopStart: 'default', agentLoopEnd: 'sanguo', turnEnd: 'default', ...events } }; };
  return { ...f, app, plays, sources, emit, enable, exports };
}

test('actual approval transitions preserve minimisation on replay and only synthetic view clears', t => {
  const f = fixture(t), app = new f.AppBase({}); app.state.projectName = 'same';
  app.setState = patch => Object.assign(app.state, typeof patch === 'function' ? patch(app.state) : patch);
  for (const kind of ['ask', 'ptyPlan']) {
    const pending = { [kind]: { id: `${kind}-one` }, handlers: { submit() {} } };
    app._setApprovalKind(kind, pending); app.handleApprovalDismiss(kind, pending[kind].id);
    const dismissed = app.state.approvalDismissedIds;
    app._setApprovalKind(kind, { ...pending });
    assert.equal(app.state.approvalDismissedIds, dismissed, 'same id replay must preserve minimisation');
    app._setApprovalKind(kind, { reason: 'view-switch' });
    assert.equal(app.state.approvalGlobal[kind], null); assert.equal(app.state.approvalDismissedIds, dismissed);
    app._setApprovalKind(kind, { ...pending, reason: 'unknown-transport-detail' });
    assert.equal(app.state.approvalGlobal[kind][kind].id, pending[kind].id);
    assert.equal(app.state.approvalDismissedIds, dismissed, 'unknown reasons cannot clear a real approval');
    app._setApprovalKind(kind, { [kind]: { id: `${kind}-two` } });
    assert.equal(app.state.approvalDismissedIds.has(`${kind}:${kind}-one`), false);
    app.handleApprovalDismiss(kind, `${kind}-two`); app._setApprovalKind(kind, null);
    assert.equal(app.state.approvalDismissedIds.has(`${kind}:${kind}-two`), false, 'real clear must re-arm reused ids');
  }
});

test('original voice settings add two opt-in rows and locale seeds never enable loop cues', async t => {
  const changes = [], f = fixture(t, { component: 'VoicePackSettings', props: {
    prefs: { enabled: true, volume: 0.3, events: {} }, onChange: patch => changes.push(patch),
  } });
  const { DEFAULT_BINDINGS, getDefaultBindingsForLocale } = require(output);
  for (const bindings of [DEFAULT_BINDINGS, ...['zh', 'zh-TW', 'en'].map(getDefaultBindingsForLocale)]) {
    assert.equal(bindings.agentLoopStart, null); assert.equal(bindings.agentLoopEnd, null);
  }
  f.draw(); await f.tick(); f.draw();
  const rows = descendants(f.tree, node => node.type === 'div' && ['agentLoopStart', 'agentLoopEnd'].some(key => String(node.key).endsWith('$' + key)));
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.props.children[1].props.value, 'disabled');
    row.props.children[1].props.onChange('sanguo');
    assert.deepEqual(changes.at(-1), { events: { [row.key.endsWith('$agentLoopStart') ? 'agentLoopStart' : 'agentLoopEnd']: 'sanguo' } });
    assert.equal(row.props.children[2].props.children.props.disabled, true);
  }
});

test('accepted loop cues ring once per turnId and suppress only the same legacy end boundary', async t => {
  const f = voiceFixture(t); f.enable();
  f.emit('agent_loop_start'); f.emit('agent_loop_start');
  f.emit('agent_loop_end'); f.emit('agent_loop_end'); f.emit('turn_end');
  await f.tick();
  assert.equal(f.plays.length, 2);
  assert.ok(f.plays[0].includes('/default/agentLoopStart?'));
  assert.ok(f.plays[1].includes('/sanguo/agentLoopEnd?'));
  f.emit('turn_end', { ts: 1800 }); await f.tick();
  assert.equal(f.plays.length, 3, 'a later boundary outside 1500ms retains legacy playback');
});

test('disabled or unaccepted end cue leaves legacy turnEnd intact and next start clears suppression', async t => {
  const f = voiceFixture(t); f.enable({ agentLoopEnd: null });
  f.emit('agent_loop_end'); f.emit('turn_end'); await f.tick();
  assert.equal(f.plays.length, 1); assert.ok(f.plays[0].includes('/turnEnd?'));
  f.exports.resetVoice(); f.plays.length = 0; f.enable();
  f.emit('agent_loop_end', { turnId: 't2', turnStartedAt: 300, ts: 400 }); await f.tick();
  f.enable({ agentLoopEnd: null, agentLoopStart: null });
  f.emit('agent_loop_start', { turnId: 't3', turnStartedAt: 500, ts: 500 });
  f.emit('agent_loop_end', { turnId: 't3', turnStartedAt: 500, ts: 600 });
  f.emit('turn_end', { ts: 600 }); await f.tick();
  assert.equal(f.plays.length, 2, 'next turn rings legacy end even inside the prior suppression window');
});

test('foreign scope, older turn, old source, changed URL, history and unmounted callbacks stay silent', async t => {
  const f = voiceFixture(t); f.enable();
  f.emit('agent_loop_start', { instanceKey: 'b' });
  f.emit('agent_loop_start', { project: 'other' });
  f.emit('agent_loop_start', { turnId: 'new', turnStartedAt: 300 });
  f.emit('agent_loop_end', { turnId: 'old', turnStartedAt: 100 });
  f.emit('agent_loop_end', { turnId: 'wrong', turnStartedAt: 300 });
  await f.tick(); assert.equal(f.plays.length, 1);
  f.app._initControlSSE(); f.emit('agent_loop_end', { turnId: 'new', turnStartedAt: 300 }, 0);
  window.location.search = '?instance=b'; f.emit('agent_loop_end', { turnId: 'new', turnStartedAt: 300 });
  window.location.search = '?instance=a'; f.app._isLocalLog = true;
  f.emit('agent_loop_end', { turnId: 'new', turnStartedAt: 300 });
  f.app._isLocalLog = false; f.app._unmounted = true;
  f.emit('agent_loop_end', { turnId: 'new', turnStartedAt: 300 });
  await f.tick(); assert.equal(f.plays.length, 1);
  f.app._unmounted = false; f.emit('agent_loop_end', { turnId: 'new', turnStartedAt: 300 });
  f.emit('agent_loop_start', { turnId: 'new', turnStartedAt: 300 });
  f.sources.at(-1).fire('agent_loop_end', '{broken');
  await f.tick(); assert.equal(f.plays.length, 2);
});

test('legacy end from a different session is not suppressed by a played loop end', async t => {
  const f = voiceFixture(t); f.enable({ agentLoopStart: null });
  f.emit('agent_loop_end'); f.emit('turn_end', { sessionId: 's2' }); await f.tick();
  assert.equal(f.plays.length, 2); assert.ok(f.plays.at(-1).includes('/turnEnd?'));
});

test('ordinary TUI turn activity keeps loading through API gaps and clears immediately at its own terminal', t => {
  const f = voiceFixture(t), callbacks = [];
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  globalThis.setTimeout = fn => { callbacks.push(fn); return callbacks.length; };
  globalThis.clearTimeout = () => {};
  t.after(() => { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; });
  f.app.setState = patch => Object.assign(f.app.state, patch);
  f.app.state.sdkMode = false; f.app.state.contextBarLocked = true;
  f.emit('turn_active', { active: true });
  assert.equal(f.app.state.isStreaming, true); assert.equal(f.app.state.contextBarLocked, false);
  f.emit('streaming_status', { active: false }); callbacks.at(-1)();
  assert.equal(f.app.state.isStreaming, true, 'per-API quiet time cannot end the accepted TUI turn');
  f.emit('turn_active', { active: false, project: 'foreign' });
  assert.equal(f.app.state.isStreaming, true);
  f.emit('turn_active', { active: false }); assert.equal(f.app.state.isStreaming, false);
  f.app.state.sdkMode = true; f.emit('turn_active', { active: true });
  assert.equal(f.app.state.isStreaming, false, 'native SDK keeps its existing whole-turn source');
});

test('baseline pills reorder exact instances and preserve focus, current identity and saved order', async t => {
  const f = fixture(t);
  f.draw(); await f.tick(); let tabs = f.draw();
  assert.equal(tabs.rows.get('a').props['aria-current'], 'page');
  const key = { ...f.event(), key: 'ArrowRight', altKey: true };
  tabs.rows.get('b').props.onKeyDown(key);
  assert.equal(key.prevented && key.stopped, true);
  tabs = f.draw();
  assert.deepEqual(tabs.ids, ['a', 'c', 'b']);
  assert.equal(tabs.rows.get('a').props['aria-current'], 'page');
  assert.deepEqual(f.focused.at(-1), 'b');
  assert.ok(f.tree.props.children.find(child => child?.props?.role === 'status').props.children.includes('3'));
  assert.deepEqual(JSON.parse(f.values.get(SDK_WORKSPACE_ORDER_KEY)).ids, ['a', 'c', 'b']);
  f.live = [session('c'), session('d'), session('b', true), session('a')];
  await f.timers.get(1)(); tabs = f.draw();
  assert.deepEqual(tabs.ids, ['a', 'c', 'b', 'd']);
  const name = tabs.rows.get('b').props.children[1];
  assert.equal(name.props.title, '/b/same');
  assert.equal(tabs.rows.get('b').props.children[2].props.children, ' [2]');
  f.reload(); await f.tick(); tabs = f.draw();
  assert.deepEqual(tabs.ids, ['a', 'c', 'b', 'd']);
  assert.deepEqual(f.navigations, []);
  assert.ok(f.requests.every(request => !request.options?.method));
  f.cleanup();
  assert.equal(f.windowEvents.size + f.documentEvents.size + f.timers.size, 0);
});

test('pointer sensor drop commits only live identities; cancelled, external and closed-source drops do nothing', async t => {
  const f = fixture(t); f.draw(); await f.tick(); let tabs = f.draw();
  tabs.drag({ active: { id: 'a' }, over: { id: 'c' } });
  tabs = f.draw(); assert.deepEqual(tabs.ids, ['b', 'c', 'a']);
  const saved = f.values.get(SDK_WORKSPACE_ORDER_KEY);
  for (const event of [{}, { active: { id: 'a' }, over: null },
    { active: { id: 'external' }, over: { id: 'b' } }]) tabs.drag(event);
  assert.equal(f.values.get(SDK_WORKSPACE_ORDER_KEY), saved);
  f.live = [session('b'), session('a')]; await f.timers.get(1)(); tabs = f.draw();
  tabs.drag({ active: { id: 'c' }, over: { id: 'b' } });
  assert.equal(f.values.get(SDK_WORKSPACE_ORDER_KEY), saved);
  assert.deepEqual(f.navigations, []);
});

test('storage changes update another client while blocked storage preserves in-memory order through polls', async t => {
  const f = fixture(t, { blocked: true });
  f.draw(); await f.tick(); let tabs = f.draw();
  tabs.drag({ active: { id: 'c' }, over: { id: 'b' } }); f.draw();
  await f.timers.get(1)(); tabs = f.draw();
  assert.deepEqual(tabs.ids, ['a', 'c', 'b']);
  f.values.set(SDK_WORKSPACE_ORDER_KEY, '{"v":1,"ids":["c","a","b"]}');
  f.windowEvents.get('storage')({ key: SDK_WORKSPACE_ORDER_KEY }); tabs = f.draw();
  assert.deepEqual(tabs.ids, ['c', 'a', 'b']);
  f.values.delete(SDK_WORKSPACE_ORDER_KEY);
  f.windowEvents.get('storage')({ key: null }); tabs = f.draw();
  assert.deepEqual(tabs.ids, ['a', 'b', 'c']);
});

test('click and Enter/Space view the exact workspace; current click is inert; closing never activates the tab', async t => {
  const f = fixture(t); f.draw(); await f.tick(); const tabs = f.draw();
  tabs.rows.get('a').props.onClick(); assert.deepEqual(f.navigations, []);
  tabs.rows.get('b').props.onKeyDown({ ...f.event(), key: 'Enter' });
  assert.equal(new URL(f.navigations.pop()).searchParams.get('instance'), 'b');
  tabs.rows.get('c').props.onKeyDown({ ...f.event(), key: ' ' });
  assert.equal(new URL(f.navigations.pop()).searchParams.get('instance'), 'c');
  window.location.search = '?instance=a&token=synthetic';
  const confirm = tabs.rows.get('b').props.children[3];
  for (const name of ['onPointerDown', 'onClick', 'onKeyDown']) {
    const event = f.event(); confirm.props.children.props[name](event); assert.equal(event.stopped, true);
  }
  await confirm.props.onConfirm(); await f.tick();
  assert.deepEqual(f.draw().ids, ['a', 'c']);
  assert.deepEqual(JSON.parse(f.requests.at(-2).options.body), { instanceKey: 'b' });
  assert.deepEqual(f.navigations, []);
  await tabs.rows.get('a').props.children[3].props.onConfirm();
  const target = new URL(f.navigations.pop());
  assert.equal(target.searchParams.get('instance'), 'c');
  assert.equal(target.searchParams.get('token'), 'synthetic');
});

test('one live workspace uses the plain label and independent new-workspace button', async t => {
  const f = fixture(t); f.live = [session('a')]; f.draw(); await f.tick();
  assert.deepEqual(f.draw().ids, []);
  const group = f.tree.props.children[1];
  assert.equal(group.props.children[0].type, 'span');
  assert.equal(group.props.children[1].props.children.type, 'button');
});

test('internal tab drags cannot invoke the AppBase file-upload overlay or drop path', t => {
  const f = fixture(t), app = new f.AppBase({});
  app.setState = () => { throw new Error('internal drag changed upload state'); };
  for (const type of [SDK_WORKSPACE_ORDER_DRAG, 'text/x-preset-reorder']) {
    const event = { ...f.event(), dataTransfer: { types: [type] } };
    app._onDragOver(event); app._onDrop(event);
    assert.equal(event.prevented, true);
  }
  assert.equal(app._isInternalDrag({ dataTransfer: { types: ['Files'] } }), false);
});


function descendants(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...require('react').Children.toArray(node.props?.children)
    .flatMap(child => descendants(child, predicate))];
}

test('baseline picker launches directories directly and adapts history continuation to Codex args', async t => {
  const launched = [], f = fixture(t, { component: 'WorkspaceList', props: { embedded: true, onLaunch: data => launched.push(data) } });
  f.listed = [{ id: 'history', projectName: 'same', path: '/existing/same', logCount: 2 }];
  f.draw(); await f.tick(); f.draw();
  const { Button } = require('antd');
  const launch = descendants(f.tree, node => node.type === Button && node.props.loading === false)[0];
  launch.props.onClick(); await f.tick();
  assert.deepEqual(JSON.parse(f.requests.at(-1).options.body), { path: '/existing/same', extraArgs: ['resume', '--last'] });
  assert.equal(launched.at(-1).instanceKey, 'launched');
  const browser = f.tree.props.children.find(node => node?.type?.name === 'DirBrowser');
  browser.props.onSelect('/new/same'); await f.tick();
  assert.deepEqual(JSON.parse(f.requests.at(-1).options.body), { path: '/new/same', extraArgs: [] });
  assert.equal(f.requests.filter(request => String(request.url).includes('/api/workspaces/add')).length, 0);
  assert.equal(launched.at(-1).path, '/new/same');
});

test('new-project modal cancels without navigation and closes after the shared picker launch', t => {
  let closes = 0, launched;
  const f = fixture(t, { component: 'NewProjectModal', props: { open: true, onClose: () => closes++, onLaunch: data => { launched = data; } } });
  f.draw(); assert.equal(f.tree.props.open, true); assert.equal(f.tree.props.width, 1080);
  const picker = f.tree.props.children.props.children;
  assert.equal(picker.props.embedded, true);
  f.tree.props.onCancel(); assert.equal(closes, 1); assert.deepEqual(f.navigations, []);
  picker.props.onLaunch({ instanceKey: 'b' });
  assert.deepEqual(launched, { instanceKey: 'b' }); assert.equal(closes, 2);
});

test('history flyout lazy-loads five scoped SDK archives and current row stays inert', async t => {
  const picks = [], props = { active: false, instanceKey: 'a', project: 'same', onResumeSession: row => picks.push(row) };
  const f = fixture(t, { component: 'ResumeSessionsList', props });
  f.history = { instanceKey: 'a', currentSessionId: 'current', items: [
    { sessionId: 'current', file: 'current/file', createdAt: new Date().toISOString(), preview: ['current prompt'] },
    { sessionId: 'old', file: 'old/file', createdAt: '2026-11-18T00:00:00Z', preview: ['old prompt'] }] };
  f.draw(); assert.equal(f.requests.length, 0);
  props.active = true; f.draw(); await f.tick(); f.draw();
  const request = new URL(f.requests[0].url, window.location.href);
  assert.equal(request.searchParams.get('instance'), 'a'); assert.equal(request.searchParams.get('limit'), '5');
  const rows = descendants(f.tree, node => node.props?.role === 'button');
  assert.equal(rows.length, 2);
  rows[0].props.onClick(); assert.equal(picks.length, 0);
  rows[1].props.onKeyDown({ ...f.event(), key: 'Enter' });
  assert.equal(picks[0].file, 'old/file'); assert.equal(picks[0].instanceKey, 'a');
  assert.equal(picks[0].sessionUuid, 'old');
  f.cleanup(); assert.equal(f.requests[0].options.signal.aborted, true);
});

test('resume confirmation refuses a sibling identity and rechecks scope before sending the restore', async t => {
  const f = fixture(t), app = new f.AppBase({});
  const { Modal } = require('antd'), original = Modal.confirm;
  let confirm, restored;
  Modal.confirm = options => { confirm = options; };
  t.after(() => { Modal.confirm = original; });
  app.handleSdkSessionResumed = data => { restored = data; };
  app.handleResumeSession({ instanceKey: 'b', file: 'other/file' });
  assert.equal(confirm, undefined);
  app.handleResumeSession({ instanceKey: 'a', file: 'old/file', preview: ['old prompt'] });
  assert.ok(confirm); assert.ok(confirm.content.includes('old prompt'));
  assert.equal(confirm.content.includes('{'), false, 'upstream placeholders adapt to the local i18n format');
  assert.equal(f.requests.length, 0);
  window.location.search = '?instance=b'; await confirm.onOk(); assert.equal(f.requests.length, 0);
  window.location.search = '?instance=a'; await confirm.onOk();
  assert.deepEqual(JSON.parse(f.requests[0].options.body), { instanceKey: 'a', file: 'old/file' });
  assert.equal(restored.resumeId, 'restored');
});

test('workspace history navigation remounts the scoped provider and supports back without touching server sessions', t => {
  const f = fixture(t, { component: 'WorkspaceRoot', props: { children: 'view' } });
  f.draw(); const initial = f.tree.key;
  assert.equal(f.requests.length, 0);
  window.location.search = '?instance=b&token=synthetic';
  f.windowEvents.get('popstate')(); f.draw();
  assert.notEqual(f.tree.key, initial); assert.equal(f.tree.props.children, 'view');
  window.location.search = '?instance=a&token=synthetic';
  f.windowEvents.get('popstate')(); f.draw(); assert.equal(f.tree.key, initial);
  assert.equal(f.requests.length, 0); assert.deepEqual(f.navigations, []);
  f.cleanup(); assert.equal(f.windowEvents.has('popstate'), false);
});

test('a retired settings provider cannot overwrite global language with a late workspace response', async t => {
  const f = fixture(t, { component: 'SettingsProvider' }), { getLang } = require(output);
  const previous = getLang(); let settle;
  const result = new Promise(resolve => { settle = resolve; });
  globalThis.fetch = async () => ({ ok: true, json: () => result });
  f.draw(); f.cleanup();
  settle({ lang: previous === 'ja' ? 'de' : 'ja', codexConfigDir: '/retired/workspace' });
  await f.tick(); assert.equal(getLang(), previous);
});

test('keyed workspace remounts retain only exact-instance approval UI ids within the current page', t => {
  const React = require('react');
  const f = fixture(t, { component: 'WorkspaceRoot', props: { children: React.createElement('view') } });
  const drawApp = () => {
    f.draw();
    const app = new f.AppBase(f.tree.props.children.props); app._maintainPinState = () => {};
    app.setState = patch => {
      const prev = { ...app.state };
      Object.assign(app.state, typeof patch === 'function' ? patch(app.state) : patch);
      app.componentDidUpdate(app.props, prev);
    };
    return app;
  };
  const go = search => { window.location.search = search; f.windowEvents.get('popstate')(); return drawApp(); };
  const a = drawApp(); a._setApprovalKind('ask', { ask: { id: 'same-id' }, handlers: { submit() {} } });
  a.handleApprovalDismiss('ask', 'same-id'); a._unmounted = true;
  const b = go('?instance=b'); assert.equal(b.state.approvalDismissedIds.size, 0);
  b._setApprovalKind('ask', { ask: { id: 'same-id' } });
  assert.equal(b.state.approvalDismissedIds.has('ask:same-id'), false, 'same pending id in a sibling remains visible');
  a._setApprovalKind('ask', null); // A retired callback cannot erase the remembered choice.
  const history = go('?instance=a&logfile=history'); assert.equal(history.state.approvalDismissedIds.size, 0);
  const restored = go('?instance=a');
  assert.deepEqual([...restored.state.approvalDismissedIds], ['ask:same-id']);
  assert.equal(restored.state.approvalGlobal.ask, null, 'pending data and action handlers are never cached');
  restored._setApprovalKind('ask', { ask: { id: 'same-id' } });
  assert.equal(restored.state.approvalDismissedIds.has('ask:same-id'), true);
  restored._setApprovalKind('ask', null);
  assert.equal(go('?instance=a').state.approvalDismissedIds.size, 0, 'real resolution clears UI memory');
  const dismissAgain = go('?instance=a'); dismissAgain.handleApprovalDismiss('ask', 'closed');
  dismissAgain.props.onForgetApprovalDismissals();
  assert.equal(go('?instance=a').state.approvalDismissedIds.size, 0);
  dismissAgain.handleApprovalDismiss('ask', 'refresh'); f.reload();
  assert.equal(new f.AppBase(f.tree.props.children.props).state.approvalDismissedIds.size, 0, 'page reload discards memory');
});

test('scratch storage binds to each mounted instance rather than the first module import', async t => {
  const f = fixture(t), { TerminalPanel } = require(output);
  f.values.set('cx-viewer-scratch-tabs:instance:a', '[{"id":"tab-a"},{"id":"second-a"}]');
  f.values.set('cx-viewer-scratch-tabs:instance:b', '[{"id":"tab-b"}]');
  const a = new TerminalPanel({ scratchOnly: true });
  assert.deepEqual(a.state.scratchTabs.map(tab => tab.id), ['tab-a', 'second-a']);
  window.location.search = '?instance=b';
  const b = new TerminalPanel({ scratchOnly: true });
  assert.deepEqual(b.state.scratchTabs.map(tab => tab.id), ['tab-b']);
  a.setState = (change, done) => { Object.assign(a.state, change); done?.(); };
  a.handleScratchTabClick('second-a', false);
  assert.equal(f.values.get('cx-viewer-scratch-active-tab:instance:a'), 'second-a');
  assert.equal(f.values.has('cx-viewer-scratch-active-tab:instance:b'), false);
});

test('a viewed instance closed elsewhere repairs to a survivor, but an unknown initial URL never silently falls back', async t => {
  const f = fixture(t); f.draw(); await f.tick(); f.draw();
  f.live = [session('b')]; await f.timers.get(1)();
  assert.equal(new URL(f.navigations.pop()).searchParams.get('instance'), 'b');
  assert.equal(f.requests.some(request => request.options?.method), false);
  f.cleanup();
  window.location.search = '?instance=unknown'; f.reload(); await f.tick(); f.draw();
  assert.deepEqual(f.navigations, []);
  window.location.search = '?instance=b'; await f.timers.get(1)(); f.draw();
  f.live = []; await f.timers.get(1)();
  assert.equal(new URL(f.navigations.pop()).searchParams.get('workspaces'), '1');
});

test('scoped SDK close events repair the URL before the legacy picker unmounts the Header', t => {
  const f = fixture(t), app = new f.AppBase({});
  app.handleSdkWorkspaceClosed({ instanceKey: 'a', reattachedTo: 'b' });
  assert.equal(new URL(f.navigations.pop()).searchParams.get('instance'), 'b');
  for (const search of ['?instance=b', '?instance=a&logfile=archive']) {
    window.location.search = search;
    app.handleSdkWorkspaceClosed({ instanceKey: 'a', reattachedTo: 'c' });
    assert.deepEqual(f.navigations, []);
  }
  window.location.search = '?instance=a';
  app._unmounted = true;
  app.handleSdkWorkspaceClosed({ instanceKey: 'a', reattachedTo: 'b' });
  assert.deepEqual(f.navigations, []);
  app._unmounted = false;
  app.handleSdkWorkspaceClosed({ instanceKey: 'a', reattachedTo: null });
  const picker = new URL(f.navigations.pop());
  assert.equal(picker.searchParams.get('workspaces'), '1');
  assert.equal(picker.searchParams.has('instance'), false);
  assert.equal(f.requests.length, 0);
});

// Exercise the bundled AppBase methods; setState/rAF are deterministic hosts,
// so these cover callback ordering rather than browser layout or React mounting.
test('log picker fetches the committed project, rejects stale pages and preserves the active project', async t => {
  const { app } = coldIngestFixture(t);
  const pending = [], updates = [];
  globalThis.fetch = url => new Promise(resolve => pending.push({ url: new URL(url, 'http://fixture'), resolve }));
  app.state.currentProject = 'active';
  app.state.logViewProject = 'old';
  app.state.selectedLogs = new Set(['old-file']);
  const commit = app.setState;
  app.setState = (patch, after) => updates.push(() => commit(patch, after));
  app.handleLogProjectChange('other');
  assert.equal(pending.length, 0, 'fetch waits for React state commit');
  updates.shift()();
  assert.equal(pending[0].url.searchParams.get('project'), 'other');
  assert.equal(app.state.selectedLogs.size, 0);
  app.handleLogProjectChange('third'); updates.shift()();
  assert.equal(pending[1].url.searchParams.get('project'), 'third');
  const response = (items, total = 1) => ({ ok: true, json: async () => ({ items, total,
    _allProjects: ['active', 'other', 'third'], _currentProject: 'active' }) });
  pending[1].resolve(response([{ file: 'third-file' }], 51));
  await new Promise(resolve => setImmediate(resolve)); updates.shift()();
  pending[0].resolve(response([{ file: 'stale-file' }]));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updates.length, 0, 'late response cannot replace another project');
  assert.equal(app.state.currentProject, 'active');
  assert.deepEqual(app.state.localLogs, [{ file: 'third-file' }]);
  let pagination = app.renderLogTable(app.state.localLogs, false).props.pagination;
  assert.equal(pagination.pageSize, 50);
  assert.equal(pagination.total, 51);
  app.state.localLogsTotal = 50;
  assert.equal(app.renderLogTable([], true).props.pagination, false, 'single page has no pager');
  app.handleImportLocalLogs();
  assert.equal(pending.length, 2);
  updates.shift()();
  assert.equal(pending[2].url.searchParams.has('project'), false, 'reopen requests the active project');
  assert.equal(pending[2].url.searchParams.get('page'), '1');
  app.setState = commit;
  pending[2].resolve({ ok: false, status: 400 });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(app.state.localLogs, []);
  assert.equal(app.state.localLogsLoading, false);
});

function coldIngestFixture(t) {
  const f = fixture(t), app = new f.AppBase({});
  const raf = new Map();
  for (const [key, value] of Object.entries({
    requestAnimationFrame: callback => { const id = raf.size + 1; raf.set(id, callback); return id; },
    cancelAnimationFrame: id => raf.delete(id),
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (original) Object.defineProperty(globalThis, key, original); else delete globalThis[key]; });
  }
  app.setState = (patch, after) => {
    Object.assign(app.state, typeof patch === 'function' ? patch(app.state) : patch);
    after?.();
  };
  app._makeIngestCtl = token => ({ shouldAbort: () => token !== app._ingestToken || app._unmounted,
    yieldFn: async () => {}, batchSize: 250 });
  const row = (timestamp, text = timestamp) => ({ timestamp, url: 'codex://fixture/turn',
    mainAgent: true, body: { model: 'fixture', input: [{ role: 'user', content: text }] } });
  const ingest = rows => app._runSseColdIngest(rows, { isIncremental: false, unlockContextBar: false });
  return { app, row, ingest, raf, ChatView: f.ChatView };
}

test('a queued stream paint cannot revive an overlay after its canonical final entry commits', t => {
  const { app, row, raf } = coldIngestFixture(t), handlers = new Map();
  app._streamTransport = { open: () => ({ addEventListener: (name, fn) => handlers.set(name, fn) }) };
  app._resetSSETimeout = () => {};
  app._initControlSSE();
  handlers.get('stream-progress')({ data: JSON.stringify({ timestamp: 'settled', content: [{ type: 'text', text: 'reply' }] }) });
  const paint = raf.get(app._streamingRaf);
  app.handleEntryObject(row('settled')); app._flushPendingEntries();
  assert.equal(app.state.requests[0].timestamp, 'settled');
  paint();
  assert.equal(app.state.streamingLatest, null, 'the later rAF must observe the finalized entry, not the receipt-time state');
  handlers.get('stream-progress')({ data: JSON.stringify({ timestamp: 'next', content: [{ type: 'text', text: 'new reply' }] }) });
  raf.get(app._streamingRaf)();
  assert.equal(app.state.streamingLatest.timestamp, 'next', 'a different live turn must remain visible');
  app.handleEntryObject(row('next')); app._flushPendingEntries();
  assert.equal(app.state.streamingLatest, null, 'a committed overlay still clears atomically with its own final entry');
  handlers.get('stream-progress')({ data: JSON.stringify({ timestamp: 'transition', content: [{ type: 'text', text: 'deferred reply' }] }) });
  const commit = app.setState, deferred = [];
  app.setState = patch => deferred.push(patch);
  raf.get(app._streamingRaf)(); // The transition scheduled its state update before the final entry.
  app.setState = commit;
  app.handleEntryObject(row('transition')); app._flushPendingEntries();
  deferred.forEach(patch => commit(patch));
  assert.equal(app.state.streamingLatest, null, 'a deferred transition also rechecks the final entry when rebased');
});

test('a cold V2 baseline clears an already-painted final overlay while preserving a different running turn', async t => {
  const { app, row, ingest } = coldIngestFixture(t);
  app.state.streamingLatest = { timestamp: 'cold-final', content: [{ type: 'text', text: 'settled reply' }] };
  await ingest([row('cold-final')]);
  assert.equal(app.state.streamingLatest, null, 'bootstrap completion is also a final-entry commit');
  const live = app.state.streamingLatest = { timestamp: 'still-running', content: [{ type: 'text', text: 'partial reply' }] };
  await ingest([row('older-final')]);
  assert.equal(app.state.streamingLatest, live, 'an unrelated final baseline cannot erase a running turn');
});

function historyFixture(t) {
  const fixture = coldIngestFixture(t), { app, row } = fixture;
  const older = row('older'), current = row('current');
  for (const [entry, seq] of [[older, 1], [current, 2]]) {
    entry._v2Descriptor = { entryKey: entry.timestamp, seq };
    entry._v2RowHandle = entry.timestamp;
  }
  const identity = { projectId: 'p', sessionId: 's', generation: 'g' };
  const cursor = { archive: identity, throughSeq: 2, timelineBytes: 100 };
  const envelope = kind => ({ kind: `cx-viewer.log-v2-wire.${kind}`, version: 2, archive: identity });
  globalThis.fetch = async () => new Response([
    { ...envelope('start'), page: true, hasMore: false, pageToken: 'page-token', nextBeforeSeq: 1 },
    { ...envelope('checkpoint'), throughSeq: 2, timelineBytes: 100, entries: [], threads: [], winners: [] },
    { ...envelope('end'), cursor },
  ].map(JSON.stringify).join('\n') + '\n');
  const archive = {
    start: { archive: identity, shard: { part: 1 } }, hasMore: true, projectionPart: 1,
    objectStore: { handle: 'handle' }, rows: [current],
    state: { winners: new Map([[older.timestamp, older._v2Descriptor], [current.timestamp, current._v2Descriptor]]) },
    prependPage() { this.projectionPart = 0; this.hasMore = false; this.rows = [older, current]; return [older]; },
  };
  app._v2Archive = archive; app._v2Epoch = 1;
  app.state.requests = [current]; app.state.hasMoreHistory = true; app.state.selectedIndex = 0;
  return { ...fixture, archive, older, current };
}

test('older shard projection uses the cold gate and replays live rows only after prepend commit', async t => {
  const { app, archive, row } = historyFixture(t);
  let release;
  const projection = new Promise(resolve => { release = resolve; });
  app._projectV2Rows = async rows => { await projection; return rows; };
  const work = app._loadMoreV2History();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app._ingestRunning, true);
  const live = row('live'); live._v2Descriptor = { entryKey: 'live', seq: 3 };
  archive.state.winners.set('live', live._v2Descriptor);
  assert.equal(app.handleEntryObject(live), true);
  assert.equal(app._liveGateBuffer.length, 1);
  release(); await work;
  assert.deepEqual(app.state.requests.map(entry => entry.timestamp), ['older', 'current']);
  assert.equal(app._ingestRunning, false);
  assert.equal(app.state.loadingMore, false);
  assert.equal(app._pendingEntries[0].timestamp, 'live');
  assert.equal(archive.pageAckToken, 'page-token');
  app._flushPendingEntries();
  assert.deepEqual(app.state.requests.map(entry => entry.timestamp), ['older', 'current', 'live']);
  assert.equal(app.state.selectedIndex, 1, 'selected request survives a full shard reprojection');
});

test('late shard failure cannot reset a new archive or clear its loading flag', async t => {
  const { app } = historyFixture(t);
  let reject;
  app._projectV2Rows = () => new Promise((_resolve, fail) => { reject = fail; });
  const work = app._loadMoreV2History();
  await new Promise(resolve => setImmediate(resolve));
  const nextArchive = { name: 'next' }, nextController = new AbortController();
  app._v2Epoch++; app._ingestToken++;
  app._v2Archive = nextArchive; app._v2PageController = nextController;
  app._loadingMore = true;
  app._resetV2Communication = () => assert.fail('old page reset the new view');
  reject(Object.assign(new Error('late page error'), { code: 'CXV_LOG_V2_WIRE_RESET_REQUIRED' }));
  await work;
  assert.equal(app._v2Archive, nextArchive);
  assert.equal(app._v2PageController, nextController);
  assert.equal(app._loadingMore, true);
  assert.equal(app.state.loadingMore, true);
});

test('an empty published shard still exposes older history after a cut-time crash', async t => {
  const { app, ingest, row } = coldIngestFixture(t);
  app.state.requests = [row('old-view')];
  app._v2Archive = { hasMore: true, start: { shard: { part: 1 } } };
  assert.equal(await ingest([]), true);
  assert.deepEqual(app.state.requests, []);
  assert.equal(app.state.hasMoreHistory, true);
  assert.deepEqual(app.state.shards, { hasMore: true });
  assert.equal(app._requestIndexMap.size, 0);
  assert.equal(app._ingestRunning, false);
});

test('cold failure restores the committed index and drains live rows in order for normal dedup', async t => {
  const { app, row, ingest } = coldIngestFixture(t);
  await ingest([row('baseline')]);
  const baseline = app.state.requests, normalizer = app._liveConversationNormalizer;
  const process = app._processOneEntry;
  app._processOneEntry = function (...args) {
    process.apply(this, args);
    this.handleEntryObject(row('baseline', 'corrected'));
    this.handleEntryObject(row('live'));
    throw new Error('cold processing fixture');
  };
  app.state.fileLoading = true;
  await assert.rejects(ingest([row('uncommitted')]), /cold processing fixture/);
  assert.equal(app._ingestRunning, false);
  assert.equal(app.state.fileLoading, false);
  assert.equal(app.state.requests, baseline);
  assert.equal(app._liveConversationNormalizer, normalizer);
  assert.deepEqual([...app._requestIndexMap], [['baseline|codex://fixture/turn', 0]]);
  assert.deepEqual(app._liveGateBuffer, []);
  assert.deepEqual(app._pendingEntries.map(entry => entry.timestamp), ['baseline', 'live']);
  app._flushPendingEntries();
  assert.deepEqual(app.state.requests.map(entry => entry.timestamp), ['baseline', 'live']);
  assert.equal(app.state.requests[0].body.input[0].content, 'corrected');
  app._processOneEntry = process;
  assert.equal(await ingest([row('retry')]), true);
  assert.deepEqual(app.state.requests.map(entry => entry.timestamp), ['retry']);
});

test('failure after processing restores the previous Codex normalizer, session and slimmer', async t => {
  const { app, row, ingest } = coldIngestFixture(t);
  await ingest([row('baseline')]);
  const normalizer = app._liveConversationNormalizer, sessionId = app._currentSessionId;
  const slimmer = app._sseSlimmer = { baseline: true };
  app._commitColdIngest = async () => { throw new Error('before commit'); };
  await assert.rejects(ingest([row('new')]), /before commit/);
  assert.equal(app._liveConversationNormalizer, normalizer);
  assert.equal(app._currentSessionId, sessionId);
  assert.equal(app._sseSlimmer, slimmer);
  assert.equal(app.state.requests[0].timestamp, 'baseline');
});

test('an older cold rejection cannot open or drain a newer pipeline gate', async t => {
  const { app, ingest, row } = coldIngestFixture(t);
  const pending = [];
  app._runColdIngestCore = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
  const old = ingest([row('old')]);
  const fresh = ingest([row('fresh')]);
  const token = app._ingestToken;
  app.handleEntryObject(row('buffered'));
  pending[0].reject(new Error('stale failure'));
  await assert.rejects(old, /stale failure/);
  assert.equal(app._ingestToken, token);
  assert.equal(app._ingestRunning, true);
  assert.equal(app._liveGateBuffer.length, 1);
  assert.equal(app._pendingEntries.length, 0);
  pending[1].resolve({ empty: true });
  assert.equal(await fresh, true);
  assert.equal(app._pendingEntries[0].timestamp, 'buffered');
});

test('failure after teardown cannot repair or update an unmounted workspace', async t => {
  const { app, ingest, row } = coldIngestFixture(t);
  let reject;
  app._runColdIngestCore = () => new Promise((_, fail) => { reject = fail; });
  const pending = ingest([row('old')]);
  app._unmounted = true;
  app._abortColdIngest();
  const token = app._ingestToken;
  app.setState = () => assert.fail('unmounted state update');
  app._rebuildRequestIndex = () => assert.fail('unmounted index repair');
  reject(new Error('late rejection'));
  await assert.rejects(pending, /late rejection/);
  assert.equal(app._ingestToken, token);
  assert.equal(app._ingestRunning, false);
});

test('cold gate stays closed until the baseline setState callback runs', async t => {
  const { app, ingest, row } = coldIngestFixture(t);
  let finish;
  app.setState = (patch, after) => { finish = () => { Object.assign(app.state, patch); after?.(); }; };
  const pending = ingest([row('baseline')]);
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  app.handleEntryObject(row('live'));
  assert.equal(app._ingestRunning, true);
  assert.equal(app._pendingEntries.length, 0);
  assert.equal(app.state.requests.length, 0);
  finish();
  assert.equal(await pending, true);
  assert.equal(app._ingestRunning, false);
  assert.equal(app._pendingEntries[0].timestamp, 'live');
});

test('index repair failure still opens the gate and restores the baseline processors', async t => {
  const { app, row, ingest } = coldIngestFixture(t);
  const normalizer = app._liveConversationNormalizer;
  app._processOneEntry = () => { throw new Error('processing failure'); };
  app._rebuildRequestIndex = () => { throw new Error('repair failure'); };
  await assert.rejects(ingest([row('new')]), /processing failure/);
  assert.equal(app._ingestRunning, false);
  assert.equal(app.state.fileLoading, false);
  assert.equal(app._liveConversationNormalizer, normalizer);
});

test('null processing rows preserve dedup positions and a malformed slim batch releases its gate', async t => {
  const { app, row, ingest } = coldIngestFixture(t);
  await app._processEntriesChunked([null, row('valid')], app._makeIngestCtl(app._ingestToken));
  assert.equal(app._requestIndexMap.get('valid|codex://fixture/turn'), 1);
  app._rebuildRequestIndex([null, row('valid')]);
  assert.equal(app._requestIndexMap.get('valid|codex://fixture/turn'), 1);
  await assert.rejects(ingest([null, row('invalid-batch')]), TypeError);
  assert.equal(app._ingestRunning, false);
  assert.equal(app.state.fileLoading, false);
});

test('V2 enqueue failure does not acknowledge a live cursor and resets transient buffers for replay', async t => {
  const { app, row } = coldIngestFixture(t);
  let restarted = 0;
  app.initSSE = () => { restarted++; };
  app._v2AppliedSeq = 1;
  app._v2Archive = { applyCommit: () => row('live') };
  app._pendingEntries = { push() { throw new Error('enqueue fixture'); } };
  app._queueV2Commit({ frame: { timeline: { seq: 2 } } });
  await app._v2LiveChain;
  assert.equal(restarted, 1);
  assert.equal(app._v2AppliedSeq, 0, 'reset clears the cursor instead of acknowledging seq 2');
  assert.equal(app._v2Archive, null);
  assert.deepEqual(app._pendingEntries, []);
  assert.deepEqual(app._liveGateBuffer, []);
  assert.equal(app._ingestRunning, false);
  app._v2Archive = { applyCommit: () => row('replayed') };
  app._v2AppliedSeq = 1;
  app._queueV2Commit({ frame: { timeline: { seq: 2 } } });
  await app._v2LiveChain;
  assert.equal(app._v2AppliedSeq, 2);
  assert.equal(app._pendingEntries[0].timestamp, 'replayed');
});

test('accepted live frames acknowledge once, including while the cold gate buffers them', async t => {
  const { app, row } = coldIngestFixture(t);
  let applied = 0;
  app._v2AppliedSeq = 1;
  app._v2Archive = { applyCommit: () => { applied++; return row('accepted'); } };
  app._ingestRunning = true;
  for (let i = 0; i < 2; i++) {
    app._queueV2Commit({ frame: { timeline: { seq: 2 } } });
    await app._v2LiveChain;
  }
  assert.equal(applied, 1);
  assert.equal(app._v2AppliedSeq, 2);
  assert.equal(app._liveGateBuffer.length, 1);
  assert.equal(app._pendingEntries.length, 0);
});


test('SDK model snapshot survives idle/reconnect, rejects a sibling or retired source, and clears on resume', t => {
  const f = voiceFixture(t), app = f.app;
  app.setState = (patch, done) => { Object.assign(app.state, typeof patch === 'function' ? patch(app.state) : patch); done?.(); };
  t.after(() => clearTimeout(app._streamingOffTimer));
  assert.equal(app.state.sdkModel, null);
  f.emit('streaming_status', { active: false, model: 'fixture-A' });
  assert.equal(app.state.sdkModel, 'fixture-A');
  f.emit('streaming_status', { active: true, model: 'fixture-B', instanceKey: 'b' });
  assert.equal(app.state.sdkModel, 'fixture-A');
  app._initControlSSE();
  f.emit('streaming_status', { active: true, model: 'retired' }, 0);
  assert.equal(app.state.sdkModel, 'fixture-A');
  f.emit('streaming_status', { active: true, model: 'new-A' });
  assert.equal(app.state.sdkModel, 'new-A');
  app._teardownTransientLiveState = () => {}; app._resetV2Communication = () => {};
  app.handleSdkSessionResumed({ instanceKey: 'a', resumeId: 'resume-model' });
  assert.equal(app.state.sdkModel, null);
  f.emit('streaming_status', { active: false, model: null });
  assert.equal(app.state.sdkModel, null, 'unknown stays unknown');
  app._unmounted = true;
  f.emit('streaming_status', { active: true, model: 'unmounted' });
  assert.equal(app.state.sdkModel, null);
});

test('final input-bar chip prefers the active profile, stays read-only for SDK model, and uses existing modal callbacks', t => {
  const f = fixture(t), React = require('react');
  const chat = new f.ChatView({ cliMode: true, sdkMode: true, terminalVisible: true,
    mainAgentSessions: [], requests: [], sdkModel: 'fixture-A', activeProxyId: 'max',
    proxyProfiles: [{ id: 'fixture', name: 'Local Profile', activeModel: 'profile-model' }] });
  chat.setState = patch => Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch);
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const hit = find(child, predicate); if (hit) return hit;
    }
    return null;
  };
  const input = () => find(chat.render(), node => node.type?.name === 'ChatInputBar');
  const sdk = f.ProxyChip(input().props.proxyChip.props);
  assert.equal(sdk.props.children, 'fixture-A');
  assert.equal(sdk.props.onClick, undefined);
  assert.equal(sdk.props.role, undefined);
  const changed = { ...chat.props, activeProxyId: 'fixture' };
  assert.equal(chat.shouldComponentUpdate(changed, chat.state), true);
  chat.props = changed;
  const profile = f.ProxyChip(input().props.proxyChip.props);
  assert.equal(profile.props.role, 'button');
  assert.ok(React.Children.toArray(profile.props.children).includes('Local Profile · profile-model'));
  profile.props.onKeyDown({ key: 'Enter', preventDefault() {} });
  assert.equal(chat.state.proxyModalVisible, true);
  const modal = find(chat.render(), node => node.type?.name === 'ProxyModal');
  assert.equal(modal.props.activeProxyId, 'fixture');
  modal.props.onClose(); assert.equal(chat.state.proxyModalVisible, false);
  window.tabBridge = {};
  assert.equal(input().props.proxyChip, null, 'native Electron tabs keep their existing entry');
  delete window.tabBridge;
  chat.props = { ...chat.props, isLocalLog: true };
  assert.equal(input().props.proxyChip, null, 'history cannot expose a live model');
  assert.equal(f.ProxyChip({ sdkMode: true, sdkModel: null, activeProxyId: 'max' }), null);
});


for (const mode of ['live', 'cold']) {
  test(mode + ' AppBase ingestion retains the queued user message replacing an interrupted tail', async t => {
    const { app, ingest } = coldIngestFixture(t);
    const msg = (role, text) => ({ role, content: [{ type: 'text', text }] });
    const row = (timestamp, input) => ({ timestamp, url: 'codex://sdk/interrupt-merge', mainAgent: true,
      _sdkSource: true, body: { model: 'fixture', metadata: { thread_id: 'interrupt-merge', user_id: 'fixture-user' }, input } });
    const first = row('2026-11-21T00:00:00Z', [msg('user', 'FIRST'), msg('assistant', 'PRIOR'), msg('assistant', 'ABORTED_PARTIAL')]);
    const next = row('2026-11-21T00:00:01Z', [msg('user', 'FIRST'), msg('assistant', 'PRIOR'), msg('user', 'QUEUED_USER'), msg('assistant', 'QUEUED_REPLY')]);
    if (mode === 'cold') await ingest([first, next]);
    else for (const entry of [first, next]) { app.handleEntryObject(entry); app._flushPendingEntries(); }
    assert.equal(app.state.mainAgentSessions.length, 1);
    assert.deepEqual(app.state.mainAgentSessions[0].messages.map(m => m.content[0].text),
      ['FIRST', 'PRIOR', 'QUEUED_USER', 'QUEUED_REPLY']);
  });
}


test('cached ChatView rebuilds the rewritten prefix before appending the resumed reply', t => {
  const { app, ChatView } = coldIngestFixture(t);
  const message = (role, text) => ({ role, content: [{ type: 'text', text }] });
  const row = (timestamp, input) => ({ timestamp, url: 'codex://sdk/cached-interrupt', mainAgent: true,
    _sdkSource: true, body: { model: 'fixture', metadata: { thread_id: 'cached-interrupt', user_id: 'fixture-user' }, input } });
  const first = row('2026-11-21T00:00:00Z', [message('user', 'FIRST'), message('assistant', 'PRIOR'), message('assistant', 'ABORTED_PARTIAL')]);
  const next = row('2026-11-21T00:00:01Z', [message('user', 'FIRST'), message('assistant', 'PRIOR'), message('user', 'QUEUED_USER'), message('assistant', 'QUEUED_REPLY')]);
  app.handleEntryObject(first); app._flushPendingEntries();
  const chat = new ChatView({ cliMode: true, sdkMode: true, mainAgentSessions: app.state.mainAgentSessions, requests: app.state.requests });
  const text = items => items.flatMap(item => typeof item.props?.text === 'string' ? [item.props.text] : Array.isArray(item.props?.content)
    ? item.props.content.filter(block => block.type === 'text').map(block => block.text)
    : typeof item.props?.content === 'string' ? [item.props.content] : []);
  assert.deepEqual(text(chat.buildAllItems()), ['FIRST', 'PRIOR', 'ABORTED_PARTIAL']);
  app.handleEntryObject(next); app._flushPendingEntries();
  chat.props = { ...chat.props, mainAgentSessions: app.state.mainAgentSessions, requests: app.state.requests };
  assert.deepEqual(text(chat.buildAllItems()), ['FIRST', 'PRIOR', 'QUEUED_USER', 'QUEUED_REPLY']);
});


test('floating composer measures live height, tracks scroller replacement, and disposes its layout observers', t => {
  const f = fixture(t), chat = new f.ChatView({ cliMode: true, sdkMode: true, mainAgentSessions: [], requests: [] });
  const vars = new Map(), observers = [];
  document.documentElement.style = { setProperty: (key, value) => vars.set(key, value), removeProperty: key => vars.delete(key) };
  const previous = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(node) { this.node = node; }
    disconnect() { this.disconnected = true; }
  };
  t.after(() => { if (previous === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previous; });
  const stack = { isConnected: true, offsetHeight: 120 };
  const first = { isConnected: true, offsetWidth: 600, clientWidth: 583 };
  chat.inputStackRef.current = stack; chat.containerRef.current = first;
  chat._bindInputStackRO(); chat._bindChatScrollbarRO();
  assert.equal(vars.get('--input-stack-height'), '120px');
  assert.equal(vars.get('--chat-scrollbar-width'), '17px');
  chat._bindInputStackRO(); chat._bindChatScrollbarRO();
  assert.equal(observers.length, 2, 'unrelated updates must not accumulate observers');
  stack.offsetHeight = 248; observers[0].callback();
  assert.equal(vars.get('--input-stack-height'), '248px', 'queue/task/multiline growth must move the spacer and bottom control');
  const next = { isConnected: true, offsetWidth: 600, clientWidth: 588 };
  chat.containerRef.current = next; chat._bindChatScrollbarRO();
  assert.equal(observers[1].disconnected, true);
  assert.equal(vars.get('--chat-scrollbar-width'), '12px');
  chat.componentWillUnmount();
  assert.equal(observers[0].disconnected, true); assert.equal(observers[2].disconnected, true);
  assert.equal(vars.size, 0, 'leaving a workspace must not retain composer offsets');
});

test('floating composer preserves the overlay scrollbar bleed and space after empty or populated transcripts', t => {
  const f = fixture(t), React = require('react');
  const chat = new f.ChatView({ cliMode: true, sdkMode: true, mainAgentSessions: [], requests: [] });
  const probes = [];
  document.body.appendChild = el => probes.push(el);
  document.body.removeChild = el => probes.splice(probes.indexOf(el), 1);
  document.createElement = () => ({ style: {}, offsetWidth: 100, clientWidth: 100 });
  delete f.ChatView._cachedOverlayBleed;
  assert.equal(f.ChatView._overlayScrollbarBleed(), 12);
  assert.equal(probes.length, 0);
  const walk = node => {
    if (!node || typeof node !== 'object') return [];
    return [node, ...React.Children.toArray(node.props?.children).flatMap(walk)];
  };
  for (const loading of [true, false]) {
    chat.state.loading = loading;
    chat.state.allItems = loading ? [] : [React.createElement('fixture-row', { key: 'row' })];
    const nodes = walk(chat.render());
    const scroller = nodes.find(node => node.ref === chat.containerRef);
    assert.ok(scroller);
    const tail = React.Children.toArray(scroller.props.children).at(-1);
    assert.equal(tail.type, 'div'); assert.equal(tail.props['aria-hidden'], 'true');
    assert.ok(nodes.some(node => node.ref === chat.inputStackRef), 'composer must expose its own measuring ref');
  }
  delete f.ChatView._cachedOverlayBleed;
});


test('SDK compaction notice uses the original composer slot, keeps ten records and rejects foreign or unmounted frames', t => {
  const f = fixture(t), React = require('react');
  const chat = new f.ChatView({ cliMode: true, sdkMode: true, mainAgentSessions: [], requests: [] });
  chat.setState = patch => { if (patch) Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); };
  chat._onTerminalWsMessage({ type: 'sdk-compact', instanceKey: 'b' });
  assert.deepEqual(chat.state.sdkCompactNotices, []);
  for (let i = 0; i < 15; i++) chat._onTerminalWsMessage({ type: 'sdk-compact', instanceKey: 'a', trigger: 'native-' + i });
  assert.equal(chat.state.sdkCompactNotices.length, 10);
  assert.equal(chat.state.sdkCompactNotices.at(-1).trigger, 'native-14');
  const walk = node => !node || typeof node !== 'object' ? []
    : [node, ...React.Children.toArray(node.props?.children).flatMap(walk)];
  const notices = walk(chat.render()).filter(node => String(node.key).includes('sdkc-'));
  assert.equal(notices.length, 1);
  assert.doesNotMatch(React.Children.toArray(notices[0].props.children).join(''), /\d+k|→/, 'unknown counts must not become numbers');
  const container = walk(chat.render()).find(node => node.ref === chat.inputStackRef);
  const children = React.Children.toArray(container.props.children);
  const noticeIndex = children.findIndex(node => String(node.key).includes('sdkc-'));
  assert.ok(noticeIndex >= 0 && noticeIndex < children.findIndex(node => node.type?.name === 'ChatInputBar'));
  chat._unmounted = true;
  chat._onTerminalWsMessage({ type: 'sdk-compact', instanceKey: 'a', trigger: 'late' });
  assert.equal(chat.state.sdkCompactNotices.at(-1).trigger, 'native-14');
  chat._unmounted = false;
  const prevProps = chat.props;
  chat.props = { ...chat.props, sdkResumeId: 'resumed-thread' };
  chat.componentDidUpdate(prevProps, { ...chat.state });
  assert.deepEqual(chat.state.sdkCompactNotices, []);
});
