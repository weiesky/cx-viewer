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
export { default as CachePopoverContent } from './src/components/dashboard/CachePopoverContent.jsx';
export { default as UserPromptsModal } from './src/components/chat/UserPromptsModal.jsx';
export { default as GitChanges } from './src/components/git/GitChanges.jsx';
export { default as ScheduleTaskModal } from './src/components/common/ScheduleTaskModal.jsx';
export { default as UltraplanPanel } from './src/components/terminal/UltraplanPanel.jsx';
export { default as ChatInputBar } from './src/components/chat/ChatInputBar.jsx';
export { default as ScratchTerminal } from './src/components/terminal/ScratchTerminal.jsx';
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
export { fetchAllRepos } from './src/utils/gitApi.js';
export { checkPathsExist, peekPathExists, _resetForTests as resetMdProbe } from './src/utils/mdCodePathVerify.js';
export { apiUrl, withViewParams } from './src/utils/apiUrl.js';
export { default as OpenFolderIcon } from './src/components/common/OpenFolderIcon.jsx';
export { moveFile, canDropMoveOn } from './src/components/files/fileMove.js';
export { importFiles, expandEntries } from './src/components/files/importFiles.js';
export { createFileMenuHandler } from './src/components/files/fileContextMenuActions.jsx';
export { buildFileContextMenuItems } from './src/components/files/fileContextMenu.js';
export { default as AppHeader } from './src/components/dashboard/AppHeader.jsx';
export { default as AppBase } from './src/AppBase.jsx';
export { subscribeScheduledTasks } from './src/utils/scheduledTaskEvents.js';
export { default as ChatView } from './src/components/chat/ChatView.jsx';
export { default as ChatMessage } from './src/components/chat/ChatMessage.jsx';
export { default as AskAutoHostCountdown } from './src/components/chat/AskAutoHostCountdown.jsx';
export { default as AskQuestionForm } from './src/components/chat/AskQuestionForm.jsx';
export { default as PreferencesForm } from './src/components/settings/PreferencesForm.jsx';
export { default as DetailPanel } from './src/components/dashboard/DetailPanel.jsx';
export { default as ContextTab } from './src/components/dashboard/ContextTab.jsx';
export { default as ProxyChip } from './src/components/chat/ProxyChip.jsx';
export { default as ProxyModal } from './src/components/settings/ProxyModal.jsx';
export { default as PluginPanelModal } from './src/components/plugins/PluginPanelModal.jsx';
export { default as PanelHost } from './src/components/plugins/PanelHost.jsx';
export { IM_PLATFORMS } from './src/components/settings/imPlatforms.js';
export { default as ImConversationModal } from './src/components/settings/ImConversationModal.jsx';
export { default as ImPlatformSettings } from './src/components/settings/ImPlatformSettings.jsx';
export { default as ImStatusChip } from './src/components/settings/ImStatusChip.jsx';
export { default as UpdateModal } from './src/components/update/UpdateModal.jsx';
export { installPanelRuntime } from './src/components/plugins/panelRuntime.js';`, resolveDir: web },
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
    removeItem: key => values.delete(key),
    setItem: (key, value) => { if (blocked) throw new Error('blocked'); values.set(key, value); },
  };
  const globals = {
    self: globalThis, localStorage: storage,
    WebSocket: { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 },
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
      useContext(context) { cursor++; return context._currentValue; },
      useMemo(fn) { cursor++; return fn(); },
      useId() { return `fixture-id-${cursor++}`; },
      useCallback(fn) { cursor++; return fn; },
      useRef(initial) { const index = cursor++; return (hooks[index] ||= { current: initial }); },
      useLayoutEffect(fn, deps) { return this.useEffect(fn, deps); },
      useEffect(fn, deps) {
        const index = cursor++, old = hooks[index];
        if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
          pending.push(() => { old?.cleanup?.(); hooks[index] = { deps, cleanup: fn() }; });
        }
      },
    };
    try { tree = (typeof component === 'function' ? component : components[component])({ onResumed() {}, ...props }); }
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
  return { draw, reload, tick, event, cleanup, moveFile: components.moveFile, canDropMoveOn: components.canDropMoveOn, importFiles: components.importFiles, expandEntries: components.expandEntries, fileMenu: components.createFileMenuHandler, menuItems: components.buildFileContextMenuItems, AppBase, ChatView: components.ChatView, DetailPanel: components.DetailPanel, ProxyChip: components.ProxyChip, values, windowEvents, documentEvents, timers, requests, focused, navigations,
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
  app._armSSETimeout = app._resetSSETimeout = () => {};
  app._streamTransport = { open() {
    const handlers = new Map(), source = { close() {}, addEventListener(name, fn) { handlers.set(name, fn); },
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

test('scheduled task outcomes use the current exact SSE scope and deduplicate terminal notices', t => {
  const f = voiceFixture(t), notices = [], published = [];
  const toast = require('antd').message;
  for (const name of ['success', 'error', 'warning']) {
    const original = toast[name]; toast[name] = text => notices.push([name, text]);
    t.after(() => { toast[name] = original; });
  }
  const unsubscribe = f.exports.subscribeScheduledTasks({ project: 'same', instance: 'a' }, data => published.push(data));
  t.after(unsubscribe);
  const frame = { type: 'task_run', status: 'completed', runId: 'r1', summary: 'scheduled result' };
  f.emit('scheduled_tasks', { ...frame, instanceKey: 'b' });
  f.emit('scheduled_tasks', { ...frame, project: 'other' });
  assert.equal(notices.length, 0);
  f.emit('scheduled_tasks', frame); f.emit('scheduled_tasks', frame);
  assert.equal(notices.length, 1);
  f.emit('scheduled_tasks', { ...frame, runId: 'r2', status: 'running' });
  f.emit('scheduled_tasks', { ...frame, runId: 'r3', status: 'dispatched' });
  assert.equal(notices.length, 1);
  f.app._initControlSSE();
  f.emit('scheduled_tasks', { ...frame, runId: 'old' }, 0);
  assert.equal(notices.length, 1, 'a replaced stream cannot toast');
  f.emit('scheduled_tasks', { ...frame, runId: 'r4', status: 'failed', reason: 'no_live_session' });
  assert.equal(notices.at(-1)[0], 'error');
  assert.equal(published.length, 0, 'refresh remains debounced');
});

test('original chat and terminal schedule entries open the shared modal with the exact native instance', t => {
  const f = fixture(t), exports = require(output);
  const chat = new f.ChatView({ cliMode: true, sdkMode: true, projectName: 'same', resumeInstanceKey: 'a', requests: [], mainAgentSessions: [] });
  chat.setState = patch => Object.assign(chat.state, patch);
  const nodes = (tree, name) => descendants(tree, node => node.type?.name === name);
  let input = nodes(chat.render(), 'ChatInputBar')[0];
  input.props.onOpenScheduleModal();
  let modal = nodes(chat.render(), 'ScheduleTaskModal')[0];
  assert.equal(modal.props.open, true); assert.equal(modal.props.instance, 'a'); assert.equal(modal.props.project, 'same');
  modal.props.onClose(); assert.equal(chat.state.scheduleModalVisible, false);
  chat.props = { ...chat.props, isLocalLog: true };
  assert.equal(nodes(chat.render(), 'ChatInputBar')[0].props.onOpenScheduleModal, null);
  const terminal = new exports.TerminalPanel({ projectName: 'same', resumeInstanceKey: 'b' });
  terminal.setState = patch => Object.assign(terminal.state, patch);
  exports.setLang('en');
  const menu = descendants(terminal.render(), node => node.props?.content && node.props.open === false)[0];
  const row = descendants(menu.props.content, node => node.type === 'button'
    && descendants(node, child => child.props?.children === exports.translate('ui.schedule.menuItem')).length)[0];
  assert.ok(row); row.props.onClick();
  modal = nodes(terminal.render(), 'ScheduleTaskModal')[0];
  assert.equal(modal.props.open, true); assert.equal(modal.props.instance, 'b');
  assert.equal(terminal.state.quickSettingsOpen, false);
});

test('original Ask hosting settings default off and persist explicit null independently of native reviewer', t => {
  const changes = [], toggles = [];
  const f = fixture(t, { component: 'QuickAutoApproveRows', props: { approvalsReviewer: 'user',
    planAutoApproveSeconds: 0, askAutoAnswerMinutes: null, expandedKey: 'ask',
    onToggle: key => toggles.push(key), onHoverEnter() {}, onHoverLeave() {},
    onAskAutoAnswerChange: value => changes.push(value) } });
  const exports = require(output); exports.setLang('en'); f.draw();
  const options = descendants(f.tree.at(-1), node => node.type === 'button' && node.props.children === exports.translate('ui.askAutoAnswer.off'));
  assert.equal(options.length, 1); options[0].props.onClick();
  assert.deepEqual(changes, [-1]); assert.deepEqual(toggles, [null]);
  const app = new f.AppBase({});
  assert.equal(app.state.approvalPrefs.askAutoAnswerMinutes, null);
  app.handleApprovalPrefsChange = patch => changes.push(patch);
  app.handleAskAutoAnswerChange(0); app.handleAskAutoAnswerChange(-1);
  assert.deepEqual(changes.slice(-2), [{ askAutoAnswerMinutes: 0 }, { askAutoAnswerMinutes: null }]);
  // PreferencesForm is a function; inspect its returned original Select callbacks.
  const tree = exports.PreferencesForm({ values: { approvalModal: { askAutoAnswerMinutes: 10 } }, onPatch: patch => changes.push(patch) });
  const select = descendants(tree, node => node.props?.options?.some(option => option.label === exports.translate('ui.askAutoAnswer.instant')))[0];
  assert.equal(select.props.value, 10); select.props.onChange(-1);
  assert.deepEqual(changes.at(-1), { approvalModal: { askAutoAnswerMinutes: null } });
});

test('Ask hosting countdown catches up by wall clock and only emits the explicit cancel callback', t => {
  let now = 1000, cancelled = 0;
  t.mock.method(Date, 'now', () => now);
  const props = { autoAnswerAt: 601000, autoCancelled: false, onCancelHosting: () => cancelled++ };
  const f = fixture(t, { component: 'AskAutoHostCountdown', props });
  require(output).setLang('en'); f.draw(); f.draw();
  assert.equal(f.tree.props['aria-live'], 'off');
  assert.match(f.tree.props.children[0].props.children, /10:00/);
  now = 301000; document.visibilityState = 'visible'; f.documentEvents.get('visibilitychange')(); f.draw();
  assert.match(f.tree.props.children[0].props.children, /5:00/);
  f.tree.props.children[1].props.onClick(); assert.equal(cancelled, 1);
  props.autoCancelled = true; f.draw(); assert.equal(f.tree, null); assert.equal(f.timers.size, 0);
  props.autoCancelled = false; props.autoAnswerAt = 1000; f.draw();
  assert.equal(f.tree, null); assert.deepEqual(f.requests, []);
});

test('native inline Ask form cancels its own request instead of the queue head', t => {
  fixture(t); const exports = require(output), cancelled = [];
  const card = new exports.ChatMessage({ pendingAsk: { id: 'native_head' },
    askMetaMap: { queued_card: { requestId: 'native_queued', autoAnswerAt: 601000, autoCancelled: false } },
    onAskQuestionAutoCancel: (...args) => cancelled.push(args) });
  const consumer = card.renderAskQuestionInteractive('queued_card', [{ id: 'q', question: 'Pick' }], 'native_queued');
  const form = consumer.props.children(null);
  assert.equal(form.props.autoAnswerAt, 601000); form.props.onCancelAutoHosting();
  assert.deepEqual(cancelled, [['queued_card', 'native_queued']]);
});

test('original Other answer input carries password-manager opt-out without changing its text callback', t => {
  fixture(t); const { AskQuestionForm } = require(output);
  const form = new AskQuestionForm({ questions: [{ id: 'q', question: 'Pick', options: [{ label: 'A' }] }] });
  form.state.otherActive = { 0: true };
  form.setState = patch => Object.assign(form.state, typeof patch === 'function' ? patch(form.state) : patch);
  const input = descendants(form.render(), node => node.props?.autoFocus)[0];
  assert.equal(input.props.autoComplete, 'off'); assert.equal(input.props['data-1p-ignore'], true);
  assert.equal(input.props['data-lpignore'], 'true'); assert.equal(input.props['data-form-type'], 'other');
  input.props.onChange({ target: { value: 'native free text' } });
  assert.equal(form.state.otherText[0], 'native free text');
});

test('cached native Ask cards refresh hosting metadata on full and incremental cache hits', t => {
  const f = fixture(t), questions = [{ id: 'q', question: 'Pick', options: [{ label: 'A' }] }];
  const messages = [{ role: 'assistant', content: [{ type: 'tool_use', id: 'card', name: 'request_user_input', input: { questions } }], _timestamp: '2026-01-01T00:00:01Z' }];
  const session = { sessionId: 'native-root', messages };
  const chat = new f.ChatView({ cliMode: true, sdkMode: true, requests: [], mainAgentSessions: [session] });
  chat.state.pendingAsk = { id: 'native_request', itemId: 'card', questions };
  const card = () => chat.buildAllItems().find(item => item.props?.content?.some?.(block => block.id === 'card'));
  const first = card(); assert.ok(first);
  chat.state.askMetaMap = { card: { requestId: 'native_request', autoAnswerAt: 601000, autoCancelled: false } };
  const second = card(); assert.notEqual(second, first); assert.equal(second.props.askMetaMap, chat.state.askMetaMap);
  chat.state.askMetaMap = { card: { ...chat.state.askMetaMap.card, autoCancelled: true } };
  messages.push({ role: 'assistant', content: [{ type: 'text', text: 'additional stream' }], _timestamp: '2026-01-01T00:00:02Z' });
  const third = card(); assert.equal(third.props.askMetaMap.card.autoCancelled, true);
  assert.equal(third.props.pendingAsk.id, 'native_request');
});

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
  app._streamTransport = { open: () => ({ close() {}, addEventListener: (name, fn) => handlers.set(name, fn) }) };
  app._armSSETimeout = app._resetSSETimeout = () => {};
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

test('embedded search restores desktop state and closes through the original explorer controls', t => {
  const f = fixture(t);
  f.values.set('cxv_searchOpen', 'true');
  const props = { cliMode: true, sdkMode: true, projectName: 'alpha', mainAgentSessions: [], requests: [] };
  const chat = new f.ChatView(props);
  chat.setState = (patch, done) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); done?.(); };
  assert.equal(chat.state.searchOpen, true);
  const panel = () => descendants(chat.render(), node => node.type?.name === 'FileExplorer')[0];
  assert.ok(panel());
  assert.equal(descendants(chat.render(), node => node.type?.name === 'SearchPanel').length, 0);
  panel().props.onToggleSearch();
  assert.equal(chat.state.searchOpen, false);
  assert.equal(f.values.get('cxv_searchOpen'), 'false');
  panel().props.onToggleSearch();
  panel().props.onClose();
  assert.equal(chat.state.searchOpen, false);
  assert.equal(chat.state.fileExplorerOpen, false);
  assert.equal(f.values.get('cxv_searchOpen'), 'false');
});

test('opening embedded results releases editor state, reveals ancestors and refreshes the clean viewer after replace', t => {
  const f = fixture(t), values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
  } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'sessionStorage', previous) : delete globalThis.sessionStorage);
  const chat = new f.ChatView({ cliMode: true, sdkMode: true, projectName: 'alpha', mainAgentSessions: [], requests: [] });
  let callback;
  chat.setState = (patch, done) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback = done; };
  chat.state.editorSessionId = 'editor-fixture'; chat.state.editorFilePath = 'old.txt';
  const panel = descendants(chat.render(), node => node.type?.name === 'FileExplorer')[0];
  panel.props.onOpenSearchResult('src/deep/note.txt', 7, { start: 1, end: 4 });
  assert.equal(chat.state.currentFile, 'src/deep/note.txt');
  assert.equal(chat.state.scrollToLine, 7);
  assert.deepEqual(chat.state.scrollToMatch, { start: 1, end: 4 });
  assert.equal(chat.state.editorSessionId, null); assert.equal(chat.state.editorFilePath, null);
  assert.ok(chat.state.fileExplorerExpandedPaths.has('src/deep'));
  assert.ok(f.requests.some(req => String(req.url).includes('/api/editor-done') && JSON.parse(req.options.body).sessionId === 'editor-fixture'));
  chat.props = { ...chat.props, projectName: 'later-project' };
  callback();
  assert.deepEqual(JSON.parse(values.get('cxv_fileExpandedPaths:alpha')), ['src', 'src/deep']);
  assert.equal(values.has('cxv_fileExpandedPaths:later-project'), false);
  const refresh = chat.state.fileExplorerRefresh;
  panel.props.onSearchReplaceApplied(['src/deep/note.txt']);
  assert.equal(chat.state.fileExplorerRefresh, refresh + 1);
  assert.equal(chat.state.fileVersion, 1);
});


test('static file confirmations retain the original exact-instance URL after a workspace switch', async t => {
  const f = fixture(t), { Modal } = require('antd'), previous = Modal.confirm, dialogs = [];
  Modal.confirm = config => dialogs.push(config); t.after(() => { Modal.confirm = previous; });
  for (const initial of ['?instance=a', '']) {
    window.location.search = initial;
    const menu = f.fileMenu({ path: 'note.txt', name: 'note.txt', isDir: false });
    menu({ key: 'delete' });
    assert.equal(f.requests.length, initial ? 0 : 1, 'no mutation before confirmation');
    window.location.search = '?instance=b';
    await dialogs.at(-1).onOk();
    const url = new URL(f.requests.at(-1).url, window.location.href);
    assert.equal(url.searchParams.get('instance'), initial ? 'a' : null);
    assert.equal(url.pathname.endsWith('/api/delete-file'), true);
  }
});

test('shared menus retain server-returned paths and keep a failed write open for retry', async t => {
  const f = fixture(t), { Modal, message } = require('antd'), previous = Modal.confirm, oldError = message.error;
  let dialog, renamed = [], errors = [];
  Modal.confirm = config => { dialog = config; }; message.error = error => errors.push(error);
  t.after(() => { Modal.confirm = previous; message.error = oldError; });
  document.getElementById = () => ({ value: 'new.txt' });
  const handler = f.fileMenu({ path: 'src', name: 'src', isDir: true, onFileRenamed: (...args) => renamed.push(args) });
  const originalFetch = globalThis.fetch; t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: 'Fixture denied' }) });
  handler({ key: 'newFile' }); await assert.rejects(dialog.onOk(), /Fixture denied/);
  assert.deepEqual(renamed, []); assert.equal(errors.length, 1);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ path: 'server-normalized/new.txt' }) });
  await dialog.onOk(); assert.deepEqual(renamed, [[null, 'server-normalized/new.txt']]);
});

test('container menus omit destructive root actions and remote downloads stay file-only', t => {
  const f = fixture(t);
  const keys = options => f.menuItems(options).map(item => item.key).filter(Boolean);
  assert.equal(keys({ isDir: true, scope: 'container' }).includes('delete'), false);
  assert.equal(keys({ isDir: true, scope: 'container' }).includes('rename'), false);
  assert.equal(keys({ isDir: true, isRemote: true }).includes('download'), false);
  assert.equal(keys({ isDir: false, isRemote: false }).includes('download'), false);
  assert.equal(keys({ isDir: false, isRemote: true }).includes('download'), true);
  let inline = 0;
  f.fileMenu({ path: 'note.txt', name: 'note.txt', isDir: false, renameMode: 'inline', startEditing: () => inline++ })({ key: 'rename' });
  assert.equal(inline, 1); assert.deepEqual(f.requests, []);
});


function importFixture(t) {
  const f = fixture(t), { Modal, message } = require('antd'), notices = [], previous = {}, dialogs = [];
  for (const name of ['loading', 'success', 'warning', 'error', 'info']) {
    previous[name] = message[name]; message[name] = text => { notices.push([name, text]); return () => {}; };
  }
  const confirm = Modal.confirm; Modal.confirm = config => dialogs.push(config);
  const fetch = globalThis.fetch;
  t.after(() => { Object.assign(message, previous); Modal.confirm = confirm; globalThis.fetch = fetch; });
  return { ...f, notices, dialogs };
}

for (const initial of ['?instance=a', '']) test('shared import freezes view before delayed scan: ' + (initial || 'boot view'), async t => {
  const f = importFixture(t), uploads = [], refreshed = []; let release;
  globalThis.fetch = async (url, options) => { uploads.push({ url, file: options.body.get('file') }); return { ok: true, json: async () => ({ relPath: 'dest/dir/file.txt' }) }; };
  const entry = { name: 'file.txt', fullPath: '/dir/file.txt', isFile: true, file(resolve) { release = resolve; } };
  window.location.search = initial;
  const pending = f.importFiles({ topEntries: [entry], flatFiles: [] }, 'dest', { onFileRenamed: (...args) => refreshed.push(args) });
  assert.equal(uploads.length, 0); window.location.search = '?instance=b';
  release(new File(['bytes'], 'file.txt')); await pending;
  const url = new URL(uploads[0].url, window.location.href);
  assert.equal(url.searchParams.get('instance'), initial ? 'a' : null); assert.equal(url.searchParams.get('dir'), 'dest/dir');
  assert.equal(await uploads[0].file.text(), 'bytes'); assert.deepEqual(refreshed, [[null, 'dest/dir/file.txt']]);
});

test('large import confirmation preserves original view and concurrency three; cancellation never uploads', async t => {
  const f = importFixture(t), file = new File(['x'], 'batch.txt'), rows = Array(1001).fill(file), urls = [];
  let active = 0, peak = 0;
  globalThis.fetch = async url => { urls.push(url); peak = Math.max(peak, ++active); await f.tick(); active--; return { ok: true, json: async () => ({ relPath: 'batch.txt' }) }; };
  let pending = f.importFiles(rows, ''); assert.equal(urls.length, 0); f.dialogs[0].onCancel(); await pending; assert.equal(urls.length, 0);
  pending = f.importFiles(rows, ''); window.location.search = '?instance=b'; f.dialogs[1].onOk(); await pending;
  assert.equal(urls.length, 1001); assert.equal(peak, 3);
  assert.ok(urls.every(url => new URL(url, window.location.href).searchParams.get('instance') === 'a'));
});

test('shared import retains partial failures and only refreshes after actual success', async t => {
  const f = importFixture(t), refreshed = [];
  globalThis.fetch = async (url, options) => {
    const name = options.body.get('file').name;
    if (name === 'network.txt') throw new Error('synthetic network failure');
    return { ok: name === 'ok.txt', json: async () => name === 'ok.txt' ? { relPath: 'normalized/ok.txt' } : { error: 'Denied' } };
  };
  await f.importFiles(['ok.txt', 'network.txt', 'denied.txt'].map(name => new File(['x'], name)), '', { onFileRenamed: (...args) => refreshed.push(args) });
  assert.deepEqual(refreshed, [[null, 'normalized/ok.txt']]); assert.equal(f.notices.filter(([kind]) => kind === 'warning').length, 1);
  await f.importFiles([new File(['x'], 'denied.txt')], '', { onFileRenamed: (...args) => refreshed.push(args) });
  assert.equal(refreshed.length, 1); assert.equal(f.notices.filter(([kind]) => kind === 'error').length, 1);
});

test('shared folder scan drains batches, retains nested paths and skips OS entries/depth overflow', async t => {
  const f = importFixture(t), file = name => ({ name, fullPath: '/folder/' + name, isFile: true, file: resolve => resolve(new File(['x'], name)) });
  const batches = [Array.from({ length: 100 }, (_, n) => file(n + '.txt')), [file('last.txt'), file('.DS_Store')], []];
  const dir = { name: 'folder', isDirectory: true, createReader: () => ({ readEntries: resolve => resolve(batches.shift()) }) };
  const entries = await f.expandEntries([dir], 0); assert.equal(entries.length, 101); assert.equal(batches.length, 0);
  assert.equal(entries.at(-1).relPath, 'folder/last.txt'); assert.deepEqual(await f.expandEntries([dir], 33), []);
});


test('shared move guards reject self/descendant/same-dir and keep root a valid destination', async t => {
  const f = importFixture(t), refreshed = [];
  for (const [source, dest] of [['', 'dest'], ['dir', 'dir'], ['dir', 'dir/sub'], ['dir/file.txt', 'dir'], ['file.txt', '']]) assert.equal(f.canDropMoveOn(source, dest), false);
  assert.equal(f.canDropMoveOn('dir/file.txt', ''), true);
  globalThis.fetch = async (url, options) => { f.requests.push({ url, options }); return { ok: true, json: async () => ({ newPath: 'file.txt' }) }; };
  await f.moveFile('dir/file.txt', '', { onFileRenamed: (...args) => refreshed.push(args) });
  assert.deepEqual(JSON.parse(f.requests[0].options.body), { fromPath: 'dir/file.txt', toDir: '' });
  assert.equal(new URL(f.requests[0].url, window.location.href).searchParams.get('instance'), 'a');
  assert.deepEqual(refreshed, [['dir/file.txt', 'file.txt']]);
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'Conflict' }) });
  await f.moveFile('dir/file.txt', '', { onFileRenamed: (...args) => refreshed.push(args) });
  assert.equal(refreshed.length, 1); assert.equal(f.notices.at(-1)[0], 'error');
});


test('portal drag handling cannot upload into the background application', t => {
  const f = fixture(t), app = new f.AppBase({});
  app.state.isDragging = true; app.setState = update => Object.assign(app.state, typeof update === 'function' ? update(app.state) : update);
  app._captureDropContext = () => { throw new Error('portal drop reached upload context'); };
  const event = { ...f.event(), target: { closest: () => ({}) }, dataTransfer: { types: ['Files'], files: [new File(['x'], 'portal.txt')] } };
  app._onDragOver(event); assert.equal(app.state.isDragging, false); app._onDrop(event);
  assert.deepEqual(f.requests, []);
});

test('original folder icon override handles pointer/keyboard without an OS request', t => {
  let opened = 0; const f = fixture(t, { component: 'OpenFolderIcon', props: { onClick: () => opened++, apiEndpoint: '/api/open-project-dir' } });
  f.draw(); f.tree.props.onClick(f.event());
  f.tree.props.onKeyDown({ ...f.event(), key: 'Enter' });
  f.tree.props.onKeyDown({ ...f.event(), key: ' ' });
  assert.equal(opened, 3); assert.deepEqual(f.requests, []);
});

test('reusable browser URLs retain explicit native instance over the current view', t => {
  fixture(t); const { apiUrl, withViewParams } = require(output);
  window.location.search = '?instance=b';
  const pinned = new URL(apiUrl(withViewParams('/api/files?path=sub', { project: 'same', instance: 'a' })), window.location.href);
  assert.equal(pinned.searchParams.get('instance'), 'a'); assert.equal(pinned.searchParams.getAll('instance').length, 1);
  assert.equal(pinned.searchParams.has('project'), false);
  assert.equal(new URL(apiUrl(withViewParams('/api/files')), window.location.href).searchParams.get('instance'), 'b');
});

for (const region of ['chat', 'outside', 'explorer', 'portal']) test('external drop zone handles ' + region + ' without changing the upload pipeline', async t => {
  const f = fixture(t), app = new f.AppBase({}); let captures = 0, dispatched;
  app.setState = update => Object.assign(app.state, typeof update === 'function' ? update(app.state) : update);
  app._captureDropContext = () => { captures++; return 'drop-time'; };
  app._dispatchUploadedFiles = (files, context) => { dispatched = { files, context }; };
  globalThis.fetch = async (url, options) => { f.requests.push({ url, options }); return { ok: true, json: async () => ({ ok: true, path: '/uploads/file.txt' }) }; };
  const event = { ...f.event(), target: { closest: selector =>
    (region === 'chat' && selector === '[data-drop-zone="chat"]') ||
    (region === 'explorer' && selector === '[data-file-explorer]') ||
    (region === 'portal' && selector.includes('.ant-modal-root')) ? {} : null },
    dataTransfer: { types: ['Files'], files: [new File(['fixture bytes'], 'file.txt')] } };
  app._onDragOver(event); assert.equal(app.state.dragZone, region === 'chat' ? 'chat' : null);
  assert.equal(app.state.isDragging, false); assert.equal(event.prevented, true);
  app._onDrop(event); await f.tick();
  assert.equal(captures, region === 'chat' ? 1 : 0);
  assert.equal(f.requests.length, region === 'chat' ? 1 : 0);
  assert.equal(app.state.dragZone, null); assert.deepEqual(app.state.uploadingDrop || [], []);
  if (region === 'chat') { assert.equal(dispatched.context, 'drop-time'); assert.equal(dispatched.files[0].path, '/uploads/file.txt'); assert.equal(await f.requests[0].options.body.get('file').text(), 'fixture bytes'); }
});

test('internal project references leave acceptance to consumers and drag cancellation clears feedback', t => {
  const f = fixture(t), app = new f.AppBase({});
  app.setState = update => Object.assign(app.state, update);
  app.state.dragZone = 'chat'; app.state.isDragging = true;
  const event = { ...f.event(), dataTransfer: { types: ['text/x-internal-move'], files: [new File(['x'], 'must-not-upload')] } };
  app._onDragOver(event); assert.equal(event.prevented, false);
  assert.equal(app.state.dragZone, null); assert.equal(app.state.isDragging, false);
  app._onDrop(event); assert.deepEqual(f.requests, []);
  app.state.dragZone = 'chat'; app._resetDragFeedback(); assert.equal(app.state.dragZone, null);
  app.state.dragZone = 'chat'; app._layoutRef.current = { contains: () => false };
  app._onDragLeave({ relatedTarget: null }); assert.equal(app.state.dragZone, null);
});

function referenceDrag(f, path, directory = false) {
  return { ...f.event(), dataTransfer: { types: ['text/x-internal-move', directory ? 'text/x-ccv-folder' : 'text/x-ccv-file'],
    getData: type => type === 'text/plain' ? path : '', dropEffect: 'none' } };
}

test('composer consumes references without upload, preserves folder chips and resets on cancellation', t => {
  let focused = 0; const attached = [];
  const f = fixture(t, { component: 'ChatInputBar', props: { sdkMode: true, inputRef: { current: { focus: () => focused++ } },
    onAttachPath: (...args) => attached.push(args), onUploadPath: () => assert.fail('reference uploaded'),
    pendingImages: [{ path: 'src/components/chat', isDir: true }] } });
  const wrapper = () => descendants(f.tree, node => node.props?.onDrop)[0];
  f.draw(); const folder = referenceDrag(f, 'src/components/chat', true);
  wrapper().props.onDragOver(folder); f.draw(); assert.equal(folder.prevented, true); assert.equal(folder.dataTransfer.dropEffect, 'copy');
  assert.deepEqual(f.requests, []); f.documentEvents.get('dragend')(); f.draw();
  wrapper().props.onDrop(folder); f.draw(); assert.deepEqual(attached, [['src/components/chat', true]]);
  wrapper().props.onDrop(referenceDrag(f, 'a\x1b[201~\rb')); assert.equal(attached.length, 1);
  assert.equal(focused, 2); assert.ok(descendants(f.tree, node => node.type === 'span' && node.props?.children === 'src/…/chat').length);
  assert.deepEqual(f.requests, []);
});

test('reference attachments retain dedup/cap and reject controls before joining the native send flow', t => {
  const f = fixture(t), chat = new f.ChatView({ sdkMode: true });
  chat.setState = update => { const patch = typeof update === 'function' ? update(chat.state) : update; if (patch) Object.assign(chat.state, patch); };
  for (const bad of [null, '', 'a\nb', 'a\u0085b', 'a\x1bb']) chat._addPendingImage(bad, 'explorer', true);
  assert.deepEqual(chat.state.pendingImages, []);
  chat._addPendingImage('src/images.png', 'explorer', true); chat._addPendingImage('src/images.png', 'explorer', true);
  assert.deepEqual(chat.state.pendingImages, [{ path: 'src/images.png', source: 'explorer', isDir: true }]);
  for (let n = 0; n < 30; n++) chat._addPendingImage('file' + n, 'explorer');
  assert.equal(chat.state.pendingImages.length, 20); assert.deepEqual(f.requests, []);
});

for (const name of ['ScratchTerminal', 'TerminalPanel']) test(name + ' reference drops respect closed sockets, alternate screens and paste framing', t => {
  const f = fixture(t), C = require(output)[name], component = new C({}); const sent = []; let focused = 0, open = true;
  component.setState = patch => Object.assign(component.state, patch);
  const ws = { readyState: WebSocket.OPEN, send: frame => sent.push(JSON.parse(frame)) };
  if (name === 'ScratchTerminal') component.ws = ws;
  else component.context = { isOpen: () => open, send: frame => sent.push(frame) };
  component.terminal = { buffer: { active: { type: 'alternate' } }, modes: { bracketedPasteMode: false }, focus: () => focused++ };
  let e = referenceDrag(f, "src/你's.txt"); component._handleFileDragOver(e); assert.equal(e.prevented, false); component._handleFileDrop(e); assert.deepEqual(sent, []);
  component.terminal.modes.bracketedPasteMode = true; e = referenceDrag(f, "src/你's.txt");
  component._handleFileDragOver(e); assert.equal(e.prevented, true); assert.equal(component.state.fileDragOver, true);
  component._handleFileDrop(e); assert.equal(component.state.fileDragOver, false); assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'input'); assert.equal(sent[0].data, "\x1b[200~'src/你'\\''s.txt' \x1b[201~"); assert.equal(focused, 1);
  component._handleFileDrop(referenceDrag(f, 'bad\rpath')); assert.equal(sent.length, 1);
  if (name === 'ScratchTerminal') ws.readyState = WebSocket.CLOSED; else open = false;
  e = referenceDrag(f, 'safe.txt'); component._handleFileDragOver(e); assert.equal(e.prevented, false); component._handleFileDrop(e); assert.equal(sent.length, 1);
});

test('SDK scratch-only wrapper never consults the main PTY transport for a reference drop', t => {
  const f = fixture(t), panel = new (require(output).TerminalPanel)({ scratchOnly: true, scratchOpen: true });
  Object.defineProperty(panel, 'ws', { get: () => assert.fail('SDK reference accessed main PTY') });
  panel._handleFileDragOver(referenceDrag(f, 'safe.txt')); panel._handleFileDrop(referenceDrag(f, 'safe.txt'));
  assert.deepEqual(f.requests, []);
});

test('Git drag sources preserve workspace paths, menu alternatives, rename guards and commit hashes', async t => {
  const attached = [], inserted = [], props = { projectName: 'same', onAttachToChat: path => attached.push(path), onInsertPathToChat: path => inserted.push(path) };
  const f = fixture(t, { component: 'GitChanges', props });
  const commit = { hash: 'a'.repeat(40), shortHash: 'aaaaaaa', subject: 'Synthetic commit', files: [{ file: 'src/file.txt', status: 'M' }] };
  globalThis.fetch = async url => ({ ok: true, json: async () => String(url).includes('/api/git-repos') ? { repos: [{ path: 'sub', name: 'sub' }] }
    : String(url).includes('/api/git-status') ? { changes: [{ file: 'src/file.txt', status: 'M' }] } : { commits: [commit] } });
  f.draw(); await f.tick(); f.draw();
  const root = descendants(f.tree, node => node.props?.node && node.props?.repoPath === 'sub')[0];
  const commitNode = descendants(f.tree, node => node.props?.commit?.hash === commit.hash)[0];
  assert.equal(root.props.onAttachToChat, props.onAttachToChat); assert.equal(commitNode.props.onInsertPathToChat, props.onInsertPathToChat);
  await t.test('directory/file payload and no-drag menu share full workspace path; rename/copy disabled', sub => {
    const g = fixture(sub, { component: root.type, props: { ...root.props, name: 'src', node: { dirs: {}, files: [
      { name: 'file.txt', fullPath: 'src/file.txt', status: 'M' }, { name: 'rename', fullPath: 'old -> new', status: 'RM' }, { name: 'copy', fullPath: 'copied', status: 'C' }] } } });
    g.draw(); const events = [];
    const drag = () => ({ ...g.event(), dataTransfer: { setData: (type, value) => events.push([type, value]) } });
    const directory = descendants(g.tree, node => node.props?.onDragStart && node.props?.role === 'button')[0];
    directory.props.onDragStart(drag()); assert.deepEqual(events.slice(0, 3), [['text/plain', 'sub/src'], ['text/x-internal-move', '1'], ['text/x-ccv-folder', '1']]);
    const rows = descendants(g.tree, node => node.props?.draggable !== undefined && node.props?.onClick && node.props?.role !== 'button');
    const enabled = rows.find(row => row.props.draggable === true); enabled.props.onDragStart(drag());
    assert.deepEqual(events.slice(3, 6), [['text/plain', 'sub/src/file.txt'], ['text/x-internal-move', '1'], ['text/x-ccv-file', '1']]);
    assert.equal(rows.filter(row => row.props.draggable === false).length, 2);
    const menu = descendants(g.tree, node => node.props?.menu?.items?.some(item => item.key === 'attachToChat') && node.props.children?.props?.draggable === true)[0].props.menu;
    menu.onClick({ key: 'attachToChat' }); menu.onClick({ key: 'insertPathToChat' });
    assert.deepEqual(attached, ['sub/src/file.txt']); assert.deepEqual(inserted, ['sub/src/file.txt']); assert.deepEqual(g.requests, []);
  });
  await t.test('pseudo-directory refuses to start a drag', sub => {
    const g = fixture(sub, { component: root.type, props: { ...root.props, name: 'old -> dir', node: { dirs: {}, files: [] } } });
    g.draw(); const event = { ...g.event(), dataTransfer: { setData: () => assert.fail('pseudo path escaped') } };
    descendants(g.tree, node => node.props?.onDragStart)[0].props.onDragStart(event); assert.equal(event.prevented, true);
  });
  await t.test('commit sends full hash without toggling or using subject', sub => {
    const g = fixture(sub, { component: commitNode.type, props: { ...commitNode.props, onToggle: () => assert.fail('drag expanded commit') } });
    g.draw(); const events = [], event = { ...g.event(), dataTransfer: { setData: (type, value) => events.push([type, value]) } };
    descendants(g.tree, node => node.props?.onDragStart)[0].props.onDragStart(event);
    assert.deepEqual(events, [['text/plain', commit.hash], ['text/x-internal-move', '1'], ['text/x-ccv-file', '1']]); assert.equal(event.dataTransfer.effectAllowed, 'copyMove');
  });
});

for (const initial of ['?instance=a', '']) test('delayed Git repo listing pins all per-repo requests before switching: ' + (initial || 'boot'), async t => {
  const f = fixture(t); window.location.search = initial; window.__CXV_BASE_PATH__ = '/original-base'; let release;
  globalThis.fetch = async url => {
    f.requests.push({ url });
    if (String(url).includes('/api/git-repos')) return { ok: true, json: () => new Promise(resolve => { release = () => resolve({ repos: [{ path: '.' }, { path: 'sub with space' }] }); }) };
    return { ok: true, json: async () => String(url).includes('/api/git-log-unpushed') ? { commits: [{ hash: 'a'.repeat(40) }], hasUpstream: false } : { changes: [] } };
  };
  const pending = require(output).fetchAllRepos(); await f.tick(); assert.equal(f.requests.length, 1);
  window.location.search = '?instance=b'; window.__CXV_BASE_PATH__ = '/changed-base'; release(); const result = await pending;
  assert.equal(result.length, 2); assert.equal(f.requests.length, 5);
  for (const { url } of f.requests) { const parsed = new URL(url, window.location.href); assert.ok(parsed.pathname.startsWith('/original-base/api/')); assert.equal(parsed.searchParams.get('instance'), initial ? 'a' : null); assert.equal(parsed.searchParams.get('token'), 'synthetic'); }
  assert.ok(f.requests.some(({ url }) => new URL(url, window.location.href).searchParams.get('repo') === 'sub with space'));
});

test('legacy Git endpoint fallback retains the starting URL after a delayed listing failure', async t => {
  const f = fixture(t); let reject;
  globalThis.fetch = url => { f.requests.push({ url }); return f.requests.length === 1 ? new Promise((resolve, fail) => { reject = fail; }) : Promise.resolve({ ok: true, json: async () => ({ changes: [{ file: 'A.txt' }] }) }); };
  const pending = require(output).fetchAllRepos(); window.location.search = '?instance=b'; reject(new Error('no list endpoint'));
  const rows = await pending; assert.equal(rows[0].changes[0].file, 'A.txt');
  assert.equal(new URL(f.requests[1].url, window.location.href).searchParams.get('instance'), 'a');
});

for (const initial of ['?instance=a', '']) test('static Git restore retains original view after unmount and permits denied retry: ' + (initial || 'boot'), async t => {
  const f = fixture(t, { component: 'GitChanges', props: { projectName: 'same' } });
  const { Modal, message } = require('antd'), previous = Modal.confirm, oldError = message.error; let dialog, denied = true;
  Modal.confirm = config => { dialog = config; }; message.error = () => {};
  t.after(() => { Modal.confirm = previous; message.error = oldError; });
  window.location.search = initial;
  globalThis.fetch = async (url, options) => {
    f.requests.push({ url, options });
    return { ok: options?.method !== 'POST' || !denied, status: 403, json: async () => options?.method === 'POST' ? { error: 'Synthetic denied' }
      : String(url).includes('/api/git-repos') ? { repos: [{ path: 'sub' }] } : { changes: [{ file: 'dir/file.txt', status: 'M' }], commits: [] } };
  };
  f.draw(); await f.tick(); f.draw();
  const root = descendants(f.tree, node => node.props?.node && node.props?.onRestore)[0];
  root.props.onRestore('sub', 'dir/file.txt', 'file.txt'); f.cleanup(); window.location.search = '?instance=b';
  await assert.rejects(dialog.onOk(), /Synthetic denied/); denied = false; const before = f.requests.length; await dialog.onOk();
  assert.equal(f.requests.length, before + 1, 'old unmounted subtree does not refresh the new view');
  const posts = f.requests.filter(row => row.options?.method === 'POST'); assert.equal(posts.length, 2);
  for (const row of posts) { assert.equal(new URL(row.url, window.location.href).searchParams.get('instance'), initial ? 'a' : null); assert.deepEqual(JSON.parse(row.options.body), { repo: 'sub', path: 'dir/file.txt' }); }
});

for (const initial of ['?instance=a', '']) test('Markdown path probe pins all batches to starting native scope: ' + (initial || 'boot'), async t => {
  const f = fixture(t), m = require(output); m.resetMdProbe(); window.location.search = initial; window.__CXV_BASE_PATH__ = '/pinned'; let release;
  globalThis.fetch = async (url, options) => {
    f.requests.push({url, options}); const paths = JSON.parse(options.body).paths;
    if (f.requests.length === 1) await new Promise(resolve => { release = resolve; });
    return { ok: true, json: async () => ({ results: paths.map(path => ({path, exists: true})) }) };
  };
  const paths = Array.from({length: 101}, (_, i) => `dir/file-${i}.txt`);
  const pending = m.checkPathsExist(paths, { projectKey: 'initial' }); await f.tick();
  window.location.search = '?instance=b'; window.__CXV_BASE_PATH__ = '/other'; release(); const values = await pending;
  assert.equal(f.requests.length,3); assert.equal(values.size,101);
  for(const {url, options} of f.requests) {
    const parsed = new URL(url, window.location.href); assert.equal(parsed.pathname,'/pinned/api/files-exists'); assert.equal(parsed.searchParams.get('instance'),initial ? 'a' : null);
    assert.deepEqual(Object.keys(JSON.parse(options.body)),['paths']); assert.ok(JSON.parse(options.body).paths.length <= 50);
  }
});

test('Markdown probe deduplicates inflight paths, expires negatives and isolates same-name instances', async t => {
  const f = fixture(t), m = require(output); m.resetMdProbe(); let release, calls=0, exists=false, now=1000;
  t.mock.method(Date,'now',()=>now);
  const fetchImpl=async()=>{ calls++; if(calls===1) await new Promise(resolve=>{release=resolve;}); return {ok:true,json:async()=>({results:[{path:'same.txt',exists}]})}; };
  const first=m.checkPathsExist(['same.txt','same.txt'],{projectKey:'a',fetchImpl}), second=m.checkPathsExist(['same.txt'],{projectKey:'a',fetchImpl});
  release(); await Promise.all([first,second]); assert.equal(calls,1); assert.equal(m.peekPathExists('same.txt','a'),false);
  exists=true; await m.checkPathsExist(['same.txt'],{projectKey:'b',fetchImpl}); assert.equal(calls,2); assert.equal(m.peekPathExists('same.txt','b'),true);
  now+=30001; await m.checkPathsExist(['same.txt'],{projectKey:'a',fetchImpl}); assert.equal(calls,3); assert.equal(m.peekPathExists('same.txt','a'),true);
  await m.checkPathsExist(['failed.txt'],{projectKey:'a',fetchImpl:async()=>({ok:false})}); assert.equal(m.peekPathExists('failed.txt','a'),undefined);
});

function mdCandidate(path) { const attrs = new Map([['data-md-path-candidate',path]]); return {attrs,getAttribute:key=>attrs.get(key),setAttribute:(key,value)=>attrs.set(key,value)}; }
test('actual Markdown DOM upgrade drains beyond 200 negative candidates without spinning and preserves keyboard/image/link priority', async t => {
  const f=fixture(t), m=require(output); m.resetMdProbe(); const chat=new f.ChatView({projectName:'same',sdkMode:true});
  const nodes=Array.from({length:205},(_,i)=>mdCandidate(`file-${i}.txt`)), wrap={querySelectorAll:()=>nodes.filter(node=>!node.attrs.has('data-md-file-verified'))};
  chat._mdProbeObservedEl=wrap; let schedules=0; chat._scheduleMdCodeVerify=()=>schedules++;
  globalThis.fetch=async(url,options)=>({ok:true,json:async()=>({results:JSON.parse(options.body).paths.map(path=>({path,exists:path==='file-204.txt'}))})});
  await chat._verifyMdCodePaths(); assert.equal(schedules,1); await chat._verifyMdCodePaths(); assert.equal(schedules,1);
  assert.equal(nodes[204].attrs.get('tabindex'),'0'); assert.equal(nodes[204].attrs.get('title'),'file-204.txt'); assert.equal(nodes[0].attrs.has('data-md-file-verified'),false);
  const opened=[]; chat.handleOpenToolFilePath=(...args)=>opened.push(args);
  const code={getAttribute:key=>({'data-md-path-candidate':'file-204.txt','data-md-file-line':'12'}[key]),closest:()=>null};
  const event={...f.event(),key:'Enter',target:{closest:selector=>selector.includes('code[')?code:null}};
  chat.handleChatMdKeydown(event); assert.deepEqual(opened,[['file-204.txt',12]]); assert.equal(event.prevented,true);
  chat.handleChatMdKeydown({...event,repeat:true}); assert.equal(opened.length,1);
  const link={getAttribute:()=> 'target.txt'}; chat.handleChatMdClick({...f.event(),button:0,target:{closest:selector=>selector.includes('a[')?link:selector.includes('code[')?code:null}});
  assert.deepEqual(opened.at(-1),['target.txt']);
  chat.setState=patch=>Object.assign(chat.state,patch); chat.handleChatMdClick({...f.event(),button:0,target:{closest:selector=>selector.includes(' img')?{src:'https://fixture/image'}:link}});
  assert.equal(chat.state.mdLightboxSrc,'https://fixture/image'); assert.equal(opened.length,2);
});

test('late Markdown existence verdicts cannot upgrade DOM after same-name instance switch', async t => {
  const f=fixture(t), m=require(output); m.resetMdProbe(); const chat=new f.ChatView({projectName:'same',sdkMode:true});
  const node=mdCandidate('same.txt'); chat._mdProbeObservedEl={querySelectorAll:()=>[node]}; let release;
  globalThis.fetch=async()=>{await new Promise(resolve=>{release=resolve;});return {ok:true,json:async()=>({results:[{path:'same.txt',exists:true}]})};};
  const pending=chat._verifyMdCodePaths(); await f.tick(); window.location.search='?instance=b'; release(); await pending;
  assert.equal(node.attrs.has('data-md-file-verified'),false);
});

test('Git visibility restores original mutual exclusion, active intent and pending refresh while passive file opens preserve intent', async t => {
  const f=fixture(t), props={projectName:'same',sdkMode:true};
  let chat=new f.ChatView(props); assert.equal(chat.state.gitChangesOpen,false);
  f.values.set('cxv_gitChangesOpen','true'); f.values.set('cxv_fileExplorerOpen','false');
  chat=new f.ChatView(props); assert.equal(chat.state.gitChangesOpen,true); assert.equal(chat.state.fileExplorerOpen,false);
  chat.setState=(patch,done)=>{Object.assign(chat.state,typeof patch==='function'?patch(chat.state):patch);done?.();};
  chat._pendingGitRefresh=true; const before=chat.state.gitChangesRefresh; chat._setGitChangesOpen(true);
  assert.equal(chat._pendingGitRefresh,false); assert.equal(chat.state.gitChangesRefresh,before+1); chat._setGitChangesOpen(true); assert.equal(chat.state.gitChangesRefresh,before+1);
  chat._setGitChangesOpen(false); assert.equal(f.values.get('cxv_gitChangesOpen'),'false'); assert.equal(new f.ChatView(props).state.gitChangesOpen,false);
  chat._setGitChangesOpen(true); await chat.handleOpenToolFilePath('file.txt'); assert.equal(chat.state.gitChangesOpen,false); assert.equal(f.values.get('cxv_gitChangesOpen'),'true');
  const restored=new f.ChatView(props); assert.equal(restored.state.fileExplorerOpen,true); assert.equal(restored.state.gitChangesOpen,false,'original tree priority prevents two panels restoring together');
});

test('Git intent setter remains usable when browser storage writes fail',t=>{
  const f=fixture(t,{blocked:true}),chat=new f.ChatView({projectName:'same'}); chat.setState=patch=>Object.assign(chat.state,typeof patch==='function'?patch(chat.state):patch);
  chat._pendingGitRefresh=true; chat._setGitChangesOpen(true); assert.equal(chat.state.gitChangesOpen,true); assert.equal(chat.state.gitChangesRefresh,1);
  chat._setGitChangesOpen(false); assert.equal(chat.state.gitChangesOpen,false);
});

test('static target confirmations pin native identity, instance and body-relative path across a later view switch', async t => {
  const f = fixture(t), { Modal } = require('antd'), oldConfirm = Modal.confirm, dialogs = [];
  Modal.confirm = config => dialogs.push(config); t.after(() => { Modal.confirm = oldConfirm; });
  for (const target of [{ kind: 'codex-md', id: 'opaque_native' }, { kind: 'skill', source: 'user', path: '/native/skill' }]) {
    window.location.search = '?instance=a';
    const handler = f.fileMenu({ path: '.codex/note.txt', name: 'note.txt', renameMode: 'modal', target, instance: 'a' });
    handler({ key: 'delete' }); window.location.search = '?instance=b'; await dialogs.at(-1).onOk();
    const request = f.requests.at(-1), url = new URL(request.url, window.location.href);
    assert.equal(url.pathname, '/api/target-delete-file'); assert.equal(url.searchParams.get('instance'), 'a');
    assert.equal(url.searchParams.get('kind'), target.kind);
    assert.equal(url.searchParams.get(target.id ? 'id' : 'targetPath'), target.id || target.path);
    assert.deepEqual(JSON.parse(request.options.body), { path: '.codex/note.txt' });
  }
});

test('target menus omit chat-only actions and root reveal uses the target endpoint with an explicit empty path', async t => {
  const f = fixture(t), target = { kind: 'codex-md', id: 'opaque_native' };
  const keys = f.menuItems({ isDir: false, isRemote: true, isTarget: true }).map(item => item.key);
  assert.equal(keys.includes('attachToChat'), false); assert.equal(keys.includes('insertPathToChat'), false);
  assert.equal(keys.includes('download'), true); assert.equal(keys.includes('rename'), true);
  f.fileMenu({ path: '', isDir: true, target, instance: 'a' })({ key: 'reveal' }); await f.tick();
  const request = f.requests.at(-1), url = new URL(request.url, window.location.href);
  assert.equal(url.pathname, '/api/target-reveal-file'); assert.equal(url.searchParams.get('id'), target.id);
  assert.deepEqual(JSON.parse(request.options.body), { path: '' });
});

test('ordinary PTY reuses project tabs and plus while keeping SDK history and transport disabled', async t => {
  const f = fixture(t, { props: { sdkMode: false, onNewProject() {} } }); f.draw(); await f.tick(); f.draw();
  assert.ok(descendants(f.tree, node => node.type === 'button' && node.props['aria-label'] === require(output).translate('ui.resume.newProject'))[0]);
  assert.equal(descendants(f.tree, node => node.type?.name === 'SdkResumeModal')[0], undefined);
  const app = new f.AppBase({}); app.state.ptyMode = true; app.state.sdkMode = false;
  assert.equal(app.renderWorkspaces().props.sdkMode, false);
  app.handleWorkspaceLaunch({ ptyMode: true, instanceKey: 'ordinary-native', projectName: 'same' });
  assert.match(f.navigations.at(-1), /instance=ordinary-native/);
  assert.equal(app.state.sdkMode, false);
  app.handleReturnToWorkspaces();
  assert.match(f.navigations.at(-1), /workspaces=1/);
  assert.equal(f.requests.some(request => String(request.url).includes('/api/workspaces/stop')), false);
});

test('native navigation caches stable content but refreshes badges on language changes and preserves card targets', t => {
  const f = fixture(t), React = require('react'), exports = require(output), previous = exports.getLang();
  t.after(() => exports.setLang(previous)); exports.setLang('en');
  const sessions = [{ conversationId: 'thread:one', messages: [{ _timestamp: 'producer' }, { _timestamp: 'carrier' }] }];
  const view = new f.ChatView({ cliMode: true, sdkMode: false, terminalVisible: false, lang: 'en', mainAgentSessions: sessions, requests: [] });
  view.state.allItems = [React.createElement('span', { key: 'tools', role: 'assistant', timestamp: 'carrier', displayTs: 'producer',
    content: [{ type: 'tool_use', name: 'update_plan', input: {} }, { type: 'tool_use', name: 'request_user_input', input: {} }] })];
  view.state.visibleCount = 20;
  const targets = []; view._scrollToPromptNavItem = (...args) => targets.push(args);
  view.render(); const first = view._buildUserPromptNav(), firstKey = view._navCacheKey;
  view.render(); assert.equal(view._buildUserPromptNav(), first);
  const cards = descendants(first, node => node.type === 'div' && typeof node.props.onClick === 'function');
  assert.equal(cards.length, 2); cards.forEach(card => card.props.onClick());
  assert.deepEqual(targets, [[0, 'producer'], [0, 'producer']]);
  const fragments = first.props.children[1].props.children;
  assert.notEqual(fragments[0].key, fragments[1].key);
  exports.setLang('zh'); view.props = { ...view.props, lang: 'zh' }; view.render();
  assert.notEqual(view._navCacheKey, firstKey); const translated = view._buildUserPromptNav();
  assert.notEqual(translated, first);
  assert.ok(descendants(translated, node => node.type === 'span' && node.props.children === exports.translate('ui.navBadgeAsk')).length);
});

test('user prompt summary reuses native projection without revealing developer or covered compaction payloads', t => {
  const req = Object.freeze({ mainAgent: true, _sdkSource: true, url: 'codex://sdk/turn', timestamp: '2026-11-21T12:00:00Z', body: Object.freeze({ instructions: 'PRIVATE SYSTEM', input: [
    { type: 'message', role: 'developer', content: [{ type: 'input_text', text: 'PRIVATE DEVELOPER' }] },
    { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'PRIVATE COVERED' }] },
    { type: 'compaction', encrypted_content: 'PRIVATE ENCRYPTED' },
    { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<user_instructions>CONTEXT ONLY</user_instructions>' }, { type: 'input_text', text: 'After compact task' }] },
  ] }) });
  const input = req.body.input;
  const props = { open: true, requests: [null, 'not an entry', req, { ...req, mainAgent: false, subAgent: true }, { mainAgent: true, method: 'POST', url: 'https://api.openai.com/v1/responses', body: { instructions: 'PRIVATE RAW SYSTEM', input: [{ role: 'user', content: 'PRIVATE RAW USER' }] } }], onClose() {} };
  const f = fixture(t, { component: 'UserPromptsModal', props }); f.draw();
  const exports = require(output), tabs = descendants(f.tree, node => Array.isArray(node.props?.items) && node.props.items.some(item => item.key === 'text'))[0];
  tabs.props.onChange('text'); f.draw();
  const text = descendants(f.tree, node => node.type === 'textarea')[0].props.value;
  assert.equal(text, 'After compact task');
  for (const hidden of ['PRIVATE SYSTEM', 'PRIVATE DEVELOPER', 'PRIVATE COVERED', 'PRIVATE ENCRYPTED', 'CONTEXT ONLY']) assert.ok(!text.includes(hidden));
  assert.equal(req.body.input, input); assert.equal(req.body.messages, undefined);
  tabs.props.onChange('context'); f.draw();
  const collapses = descendants(f.tree, node => Array.isArray(node.props?.items) && node.props.items[0]?.key === 'sys-0');
  assert.equal(collapses.length, 1); assert.equal(collapses[0].props.items[0].children.props.children, 'CONTEXT ONLY');
  assert.ok(!JSON.stringify(f.tree).includes('PRIVATE COVERED'));
  const title = f.tree.props.title; assert.ok(title.includes('(1')); assert.ok(!title.includes('ui.promptCountUnit'));
  props.open = false; props.requests = [{ get body() { throw new Error('closed modal must not scan'); } }]; f.draw();
  assert.ok(f.tree.props.title.includes('(0'));
});

test('user prompt modal deduplicates repeated native history, ignores tool results and escapes literal markup', t => {
  const input = [{ role: 'user', content: [{ type: 'text', text: 'Native user <img src=x onerror=test>' }, null, { type: 'text', text: 42 }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool', content: 'PRIVATE TOOL RESULT' }] }];
  const f = fixture(t, { component: 'UserPromptsModal', props: { open: true, requests: [
    { mainAgent: true, body: { input } }, { mainAgent: true, body: { input } },
  ], onClose() {} } }); f.draw();
  const pre = descendants(f.tree, node => node.type === 'pre');
  assert.equal(pre.length, 1); assert.equal(pre[0].props.children, 'Native user <img src=x onerror=test>');
  assert.equal(descendants(f.tree, node => node.props?.dangerouslySetInnerHTML).length, 0);
});

test('composer navigation shares native targets, closes on more or selection and resets on layout changes', t => {
  const f = fixture(t), React = require('react');
  const view = new f.ChatView({ cliMode: true, sdkMode: true, terminalVisible: true, requests: [], mainAgentSessions: [] });
  view.setState = update => Object.assign(view.state, typeof update === 'function' ? update(view.state) : update);
  view.state.allItems = [React.createElement('span', { key: 'prompt', role: 'user', text: 'Native target', timestamp: 'producer' })];
  view.state.visibleCount = 20;
  let tree = view.render();
  const composer = descendants(tree, node => node.type?.name === 'ChatInputBar')[0];
  assert.ok(composer.props.promptNavPopover);
  assert.equal(descendants(view._renderNavSidebar(false), node => node.type === 'img' && node.props.alt === 'User').length, 0);
  composer.props.promptNavPopover.onOpenChange(true); assert.equal(view.state.promptNavOpen, true);
  const more = descendants(view._buildUserPromptNav(), node => node.type === 'button')[0]; more.props.onClick();
  assert.equal(view.state.userPromptsModalOpen, true); assert.equal(view.state.promptNavOpen, false);
  view.state.promptNavOpen = true; view._doScrollToVisibleIdx = () => {}; view._scrollHighlight.bind = () => {};
  view._scrollToPromptNavItem(0, 'producer'); assert.equal(view.state.promptNavOpen, false); assert.equal(view.state.highlightTs, 'producer');
  view.state.promptNavOpen = true; view.props = { ...view.props, sdkMode: false };
  view._attachMdCodeProbe = view._bindInputStackRO = view._bindChatScrollbarRO = () => {};
  view.componentDidUpdate(view.props, view.state); assert.equal(view.state.promptNavOpen, false);
  assert.equal(view._useComposerPromptNav(), false);
  assert.equal(descendants(view._renderNavSidebar(false), node => node.type === 'img' && node.props.alt === 'User').length, 1);
  view.props = { ...view.props, terminalVisible: false }; assert.equal(view._useComposerPromptNav(), true);
  view.props = { ...view.props, cliMode: false }; assert.equal(view._useComposerPromptNav(), false);
});


test('active skills preserve authoritative scoped rows and exclude disabled or builtin entries', t => {
  const f = fixture(t, { component: 'CachePopoverContent', props: { requests: [], memory: null, codexMd: null, fsSkills: [
    { name: 'global-fixture', source: 'user', enabled: true },
    { name: 'project-fixture', source: 'project', enabled: true },
    { name: 'plugin-fixture', source: 'plugin', pluginName: 'fixture@bundled', enabled: true },
    { name: 'disabled-fixture', source: 'user', enabled: false },
    { name: 'builtin-fixture', source: 'builtin', enabled: true },
  ] } }); f.draw();
  const React = require('react'), exports = require(output);
  const labels = descendants(f.tree, node => node.type === 'span').map(node => React.Children.toArray(node.props.children).join(''));
  for (const scope of ['global', 'project', 'plugin']) assert.ok(labels.includes(exports.translate('ui.skillScopeRow.' + scope) + ':'));
  for (const name of ['global-fixture', 'project-fixture', 'fixture:plugin-fixture']) assert.ok(labels.includes(name));
  assert.ok(!labels.includes('disabled-fixture')); assert.ok(!labels.includes('builtin-fixture'));
});

test('slash menu keyboard selection fills native dollar invocation without sending, and IME or hidden layouts fall through', t => {
  const f = fixture(t), view = new f.ChatView({ cliMode: true, sdkMode: true, terminalVisible: true });
  view.setState = (update, callback) => { Object.assign(view.state, typeof update === 'function' ? update(view.state) : update); callback?.(); };
  const ta = { value: '/', style: {}, scrollHeight: 37, selectionStart: 1, focus() {}, setSelectionRange() {} };
  view._inputRef.current = ta; let sent = 0, prevented = 0; view.handleInputSend = () => sent++;
  view.state.sdkSkillsReady = true; view.state.sdkSkillCommands = [{ name: 'real', group: 'personal' }, { name: 'second', group: 'personal' }];
  view.state.slashMenu = { open: true, query: '', activeIndex: 0 };
  const key = (key, extra = {}) => view.handleInputKeyDown({ key, preventDefault() { prevented++; }, ...extra });
  key('ArrowDown'); assert.equal(view.state.slashMenu.activeIndex, 1);
  key('Enter'); assert.equal(ta.value, '$second '); assert.equal(sent, 0); assert.equal(view.state.slashMenu.open, false);
  view.state.slashMenu = { open: true, query: '', activeIndex: 0 }; key('Enter', { isComposing: true, keyCode: 229 });
  assert.equal(view.state.slashMenu.open, true); assert.equal(sent, 0);
  key('Escape'); assert.equal(view.state.slashMenu.open, false);
  view.state.slashMenu = { open: true, query: '', activeIndex: 0 }; view.props = { ...view.props, sdkMode: false };
  key('Enter'); assert.equal(sent, 1, 'main PTY shown cannot consume hidden menu keyboard input');
  assert.ok(prevented > 0);
});

test('slash metadata is scoped, native empty is authoritative, and late view results or failed cooldown cannot revive an old menu', async t => {
  const f = fixture(t), view = new f.ChatView({ cliMode: true, sdkMode: true });
  view.setState = (update, callback) => { Object.assign(view.state, typeof update === 'function' ? update(view.state) : update); callback?.(); };
  let finish, calls = [];
  globalThis.fetch = async url => { calls.push(String(url)); return new Promise(resolve => { finish = resolve; }); };
  view._ensureSlashSkillsLoaded(); view._ensureSlashSkillsLoaded(); assert.equal(calls.length, 1); assert.match(calls[0], /instance=a/);
  view._resetSlashMenuSurface(); finish({ ok: true, json: async () => ({ ok: true, skills: [{ name: 'old' }] }) }); await f.tick();
  assert.equal(view.state.sdkSkillsReady, false); assert.deepEqual(view.state.sdkSkillCommands, []);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, skills: [] }) });
  view._ensureSlashSkillsLoaded(); await f.tick(); assert.equal(view.state.sdkSkillsReady, true); assert.deepEqual(view._buildSlashMenuModel().flatItems, []);
  view._resetSlashMenuSurface(); calls = [];
  globalThis.fetch = async url => { calls.push(String(url)); throw new Error('offline'); };
  view._ensureSlashSkillsLoaded(); await f.tick(); assert.equal(view.state.slashMenuFsSkills, false);
  view._ensureSlashSkillsLoaded(true); assert.equal(calls.length, 1);
  view._slashSkillsFailedAt = Date.now() - 6000;
  globalThis.fetch = async url => ({ ok: true, json: async () => String(url).includes('skill-commands') ? { ok: false } : { skills: [{ name: 'fallback', enabled: true, source: 'project', path: '/fallback/SKILL.md' }] } });
  view._retrySlashSkillsIfFailed(); await f.tick(); assert.equal(view.state.sdkSkillsReady, false); assert.equal(view._buildSlashMenuModel().flatItems[0].name, 'fallback');
});

test('ordinary busy send uses the correlated server queue, rejects back into the draft and replays without a second optimistic bubble', t => {
  const f = fixture(t), originalWarning = require('antd').message.warning;
  const warnings = []; require('antd').message.warning = text => warnings.push(text); t.after(() => { require('antd').message.warning = originalWarning; });
  const view = new f.ChatView({ cliMode: true, sdkMode: false, ptyQueueAvailable: true, isStreaming: true, requests: [], mainAgentSessions: [] });
  view.setState = (update, callback) => { const patch = typeof update === 'function' ? update(view.state) : update; if (patch) Object.assign(view.state, patch); callback?.(); };
  const ta = { value: 'Native queued draft', style: {}, scrollHeight: 37, focus() {} }; view._inputRef.current = ta;
  const frames = []; view.context = { isOpen: () => true, send(value) { frames.push(value); return true; } };
  view.handleInputSend(); const request = frames[0];
  assert.equal(request.type, 'queue-message'); assert.equal(request.text, 'Native queued draft'); assert.equal(ta.value, '');
  assert.equal(view.state.pendingInputs[0].queuePending, true);
  let tree = view.render(); assert.equal(descendants(tree, node => node.type?.name === 'ChatMessage' && node.props.text === request.text).length, 0);
  view._onTerminalWsMessage({ type: 'queue-rejected', instanceKey: 'a', reason: 'full', requestId: request.requestId });
  assert.equal(ta.value, 'Native queued draft'); assert.equal(view.state.pendingInputs.length, 0);
  view.handleInputSend(); const second = frames.at(-1);
  const item = { id: 'q_native', text: second.text, ts: Date.now(), status: 'queued', requestId: second.requestId };
  view._onTerminalWsMessage({ type: 'queue-state', transport: 'pty', instanceKey: 'a', items: [item] });
  assert.equal(view.state.pendingInputs.length, 0); assert.equal(view.state.ptyQueuedInputs[0].text, second.text); assert.deepEqual(view.state.sdkQueuedInputs, []);
  view._onTerminalWsMessage({ type: 'queue-state', transport: 'pty', instanceKey: 'b', items: [] }); assert.equal(view.state.ptyQueuedInputs.length, 1);
  const bubble = view._renderQueueBubbles()[0], buttons = descendants(bubble, node => node.type === 'button');
  buttons.at(-1).props.onClick(); assert.equal(frames.at(-1).type, 'queue-send-now'); assert.equal(frames.at(-1).id, item.id);
  view._onTerminalWsMessage({ type: 'queue-state', transport: 'pty', instanceKey: 'a', items: [{ ...item, status: 'dispatching' }] });
  assert.ok(descendants(view._renderQueueBubbles()[0], node => node.type === 'button').every(node => node.props.disabled));
  view._onTerminalWsMessage({ type: 'queue-state', transport: 'pty', instanceKey: 'a', items: [] });
  view._onTerminalWsMessage({ type: 'queue-rejected', instanceKey: 'a', reason: 'target-gone', id: item.id, requestId: item.requestId, text: item.text });
  assert.equal(ta.value, 'Native queued draft'); assert.equal(view.state.ptyQueuedInputs.length, 0);
  frames.length = 0; view.handleInputStop(); assert.equal(frames[0].type, 'queue-suppress');
  clearTimeout(view._stopOptimisticTimer); assert.equal(warnings.length, 2);
});

test('ordinary rejection resolves a batched enqueue record and disconnect retains uncertain text until exact replay ack', t => {
  const f = fixture(t), originalWarning = require('antd').message.warning;
  const warnings = []; require('antd').message.warning = text => warnings.push(text); t.after(() => { require('antd').message.warning = originalWarning; });
  const view = new f.ChatView({ cliMode: true, ptyQueueAvailable: true, isStreaming: true });
  const updates = []; view.setState = (update, callback) => updates.push([update, callback]);
  const flush = () => { while (updates.length) { const batch = updates.splice(0); for (const [update] of batch) { const patch = typeof update === 'function' ? update(view.state) : update; if (patch) Object.assign(view.state, patch); } for (const [, callback] of batch) callback?.(); } };
  const ta = { value: 'Batched queued text', style: {}, scrollHeight: 37 }; view._inputRef.current = ta;
  let request; view.context = { isOpen: () => true, send(value) { request = value; return true; } };
  view.handleInputSend(); view._onTerminalWsMessage({ type: 'queue-rejected', reason: 'unavailable', instanceKey: 'a', requestId: request.requestId }); flush();
  assert.equal(ta.value, 'Batched queued text'); assert.equal(view.state.pendingInputs.length, 0);
  view.handleInputSend(); flush(); const pending = view.state.pendingInputs[0]; assert.equal(pending.queuePending, true);
  view._onTerminalWsState('close'); flush(); assert.equal(view.state.pendingInputs[0].wireText, 'Batched queued text'); assert.equal(view.state.pendingInputs[0].queuePending, false);
  view._onTerminalWsMessage({ type: 'queue-state', transport: 'pty', instanceKey: 'a', items: [{ id: 'replayed', requestId: pending.id, text: pending.wireText, ts: Date.now(), status: 'queued' }] }); flush();
  assert.equal(view.state.pendingInputs.length, 0); assert.equal(view.state.ptyQueuedInputs.length, 1); assert.equal(warnings.length, 1);
});

test('SDK Send now displays the original inline sending status until authoritative dispatch, then keeps only one accepted native prompt', t => {
  const f = fixture(t), view = new f.ChatView({ cliMode: true, sdkMode: true, projectName: 'same', requests: [], mainAgentSessions: [] });
  view.setState = (update, callback) => { const patch = typeof update === 'function' ? update(view.state) : update; if (patch) Object.assign(view.state, patch); callback?.(); };
  view.scrollToBottom = () => {}; t.after(() => view._clearOptimisticQueueSweepTimer());
  const frames = []; view.context = { isOpen: () => true, send(frame) { frames.push(frame); return true; } };
  const item = { id: 'sdk-queued', text: 'Native SDK follow-up', ts: Date.now(), status: 'queued' };
  const snapshot = extra => view._onTerminalWsMessage({ type: 'queue-state', instanceKey: 'a', epoch: 'epoch', items: [item], activeInput: null, ...extra });
  snapshot(); view._sendSdkQueuedNow(item.id); assert.equal(frames[0].type, 'sdk-queue-send-now');
  let tree = view.render(), bubble = descendants(tree, node => node.type?.name === 'ChatMessage' && node.props.text === item.text);
  assert.equal(bubble.length, 1); assert.equal(bubble[0].props.labelSuffix.props.role, 'status');
  const active = { id: item.id, text: item.text, timestamp: new Date().toISOString() };
  snapshot({ items: [{ ...item, status: 'dispatching' }], activeInput: active }); assert.equal(view.state.optimisticQueueMessages[0].dispatchingSeen, true);
  tree = view.render(); bubble = descendants(tree, node => node.type?.name === 'ChatMessage' && node.props.text === item.text); assert.equal(bubble.length, 1);
  snapshot({ items: [], activeInput: active }); assert.equal(view.state.optimisticQueueMessages.length, 0); assert.equal(view._optimisticQueueSweepTimer, null);
  tree = view.render(); bubble = descendants(tree, node => node.type?.name === 'ChatMessage' && node.props.text === item.text);
  assert.equal(bubble.length, 1); assert.equal(bubble[0].props.labelSuffix, undefined);
  snapshot({ items: [], activeInput: null });
  assert.equal(view.state.pendingInputs.length, 0, 'a completed native activeInput cannot leave an orphan if its transcript is outside the rendered slice');
});

test('SDK explicit placeholders expire at the original 30 seconds, clear on disconnect and cannot render in a historical slice', t => {
  const f = fixture(t), view = new f.ChatView({ cliMode: true, sdkMode: true, projectName: 'same', requests: [], mainAgentSessions: [] });
  view.setState = (update, callback) => { const patch = typeof update === 'function' ? update(view.state) : update; if (patch) Object.assign(view.state, patch); callback?.(); };
  view.scrollToBottom = () => {}; t.after(() => view._clearOptimisticQueueSweepTimer());
  view.context = { isOpen: () => true, send() { return true; } };
  const item = { id: 'sdk-timer', text: 'Unacknowledged click', ts: Date.now(), status: 'queued' };
  view.state.sdkQueuedInputs = [item]; view._sendSdkQueuedNow(item.id);
  const sentAt = view.state.optimisticQueueMessages[0].sentAt;
  view._sweepExpiredOptimisticQueueMessages(sentAt + 29999); assert.equal(view.state.optimisticQueueMessages.length, 1);
  view._sweepExpiredOptimisticQueueMessages(sentAt + 30000); assert.equal(view.state.optimisticQueueMessages.length, 0);
  view._sendSdkQueuedNow(item.id); view.props = { ...view.props, sessionUpperBoundTs: 'history' };
  assert.equal(descendants(view.render(), node => node.type?.name === 'ChatMessage' && node.props.labelSuffix).length, 0);
  view._onTerminalWsState('close'); assert.equal(view.state.optimisticQueueMessages.length, 0); assert.equal(view._optimisticQueueSweepTimer, null);
});

test('historical slice changes clear only SDK click placeholders and retain the authoritative ordinary queue mirror', t => {
  const f = fixture(t), view = new f.ChatView({ cliMode: true, projectName: 'same', requests: [], mainAgentSessions: [], sessionUpperBoundTs: null });
  view.setState = (update, callback) => { const patch = typeof update === 'function' ? update(view.state) : update; if (patch) Object.assign(view.state, patch); callback?.(); };
  view._attachMdCodeProbe = view._bindInputStackRO = view._bindChatScrollbarRO = () => {};
  const queued = [{ id: 'native-parked', text: 'Still server-owned', ts: Date.now(), status: 'queued' }];
  view.state.ptyQueuedInputs = queued; view.state.optimisticQueueMessages = [{ id: 'sdk-old', text: 'temporary' }];
  const previous = view.props; view.props = { ...previous, sessionUpperBoundTs: 'history' }; view.componentDidUpdate(previous, view.state);
  assert.equal(view.state.ptyQueuedInputs, queued); assert.deepEqual(view.state.optimisticQueueMessages, []);
});

test('editor replay cannot remount an unsaved editor and foreign instance events are ignored', t => {
  const f = fixture(t), view = new f.ChatView({});
  view.setState = update => { const patch = typeof update === 'function' ? update(view.state) : update; if (patch) Object.assign(view.state, patch); };
  view._handleEditorOpen('editor-a', '/fixture/draft.md'); const version = view.state.fileVersion;
  view._handleEditorOpen('editor-a', '/fixture/draft.md'); assert.equal(view.state.fileVersion, version);
  const events = [], Panel = require(output).TerminalPanel, panel = new Panel({ onEditorOpen: (...event) => events.push(event) });
  panel._onTerminalWsMessage({ type: 'editor-open', instanceKey: 'b', sessionId: 'foreign', filePath: '/b' }); assert.deepEqual(events, []);
  panel._onTerminalWsMessage({ type: 'editor-open', instanceKey: 'a', sessionId: 'own', filePath: '/a' }); assert.deepEqual(events, [['own', '/a']]);
  window.location.search = ''; panel._onTerminalWsMessage({ type: 'editor-open', sessionId: 'legacy', filePath: '/legacy' });
  assert.deepEqual(events.at(-1), ['legacy', '/legacy']);
});


test('the desktop conversation window keeps its newest 800 rows and expands earlier by 300 without losing navigation offsets', t => {
  const f = fixture(t), chat = new f.ChatView({ requests: [], mainAgentSessions: [] });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  const rows = Array.from({ length: 1200 }, (_, index) => ({ key: 'row-' + index }));
  chat._tsItemMap = { earlier: 100, visible: 500, latest: 1199 }; chat._scrollTargetIdx = 700;
  const current = chat._applyMobileSlice(rows); assert.equal(current.length, 800); assert.equal(current[0].key, 'row-400');
  assert.equal(chat._mobileSliceOffset, 400); assert.equal(chat._totalItemCount, 1200);
  assert.deepEqual(chat._tsItemMap, { visible: 100, latest: 799 }); assert.equal(chat._scrollTargetIdx, 300);
  chat.state.allItems = current;
  chat.buildAllItems = () => { chat._tsItemMap = { earlier: 100, visible: 500, latest: 1199 }; chat._scrollTargetIdx = 700; return rows; };
  chat.handleLoadMore(); assert.equal(chat.state.allItems.length, 1100); assert.equal(chat.state.allItems[0].key, 'row-100');
  assert.equal(chat._mobileSliceOffset, 100); assert.deepEqual(chat._tsItemMap, { earlier: 0, visible: 400, latest: 1099 });
  assert.equal(chat._scrollTargetIdx, 600); chat.handleLoadMore(); assert.equal(chat.state.allItems.length, 1200);
  assert.equal(chat._mobileSliceOffset, 0); assert.equal(chat._scrollTargetIdx, 700);
});


test('desktop composer upload opens from the original top quick-menu row and collapses a hovered cascade', t => {
  const f = fixture(t, { component: 'ChatInputBar', props: { sdkMode: true, inputRef: { current: null } } });
  let picked = 0; const elements = []; const original = document.createElement;
  document.createElement = tag => { const element = { tag, style: {}, click: () => picked++ }; elements.push(element); return element; };
  t.after(() => { document.createElement = original; });
  f.draw(); const quick = () => descendants(f.tree, node => node.type === 'button' && node.props?.title === 'Quick settings')[0];
  assert.equal(descendants(f.tree, node => node.type === 'button' && node.props?.title === 'Upload File').length, 0);
  quick().props.onClick(); f.draw();
  const upload = () => descendants(f.tree, node => node.type === 'button' && descendants(node, child => child.type?.name === 'UploadIcon').length)[0];
  assert.ok(upload()); const team = descendants(f.tree, node => node.type === 'div' && node.props?.onMouseEnter && node.props?.onMouseLeave).at(-1);
  const settings = () => descendants(f.tree, node => node.type?.name === 'QuickAutoApproveRows')[0];
  team.props.onMouseEnter(); f.draw(); assert.equal(settings().props.expandedKey, 'agentteam');
  upload().props.onMouseEnter(); f.draw(); assert.equal(settings().props.expandedKey, null);
  upload().props.onClick(); f.draw(); assert.equal(picked, 1); assert.equal(elements.at(-1).tag, 'input'); assert.equal(elements.at(-1).type, 'file');
  assert.equal(upload(), undefined); assert.deepEqual(f.requests, []);
});


test('main terminal upload uses the baseline quick-menu row, closes the popover before file pick and retires hover intent', t => {
  const f = fixture(t), Terminal = require(output).TerminalPanel, panel = new Terminal({});
  panel.setState = (patch, callback) => { Object.assign(panel.state, typeof patch === 'function' ? patch(panel.state) : patch); callback?.(); };
  const picked = []; panel.fileInputRef.current = { click: () => picked.push([panel.state.quickSettingsOpen, panel.state.quickSettingsExpanded]) };
  panel.state.quickSettingsOpen = true; panel.state.quickSettingsExpanded = 'agentteam';
  const tree = panel.render();
  assert.equal(descendants(tree, node => node.type === 'button' && node.props?.title === 'Upload File').length, 0);
  const popover = descendants(tree, node => node.props?.content?.type === 'div' && descendants(node.props.content, child => child.type?.name === 'QuickAutoApproveRows').length)[0];
  const upload = require('react').Children.toArray(popover.props.content.props.children)[0]; assert.equal(upload.type, 'button');
  panel._qmHover.leave('agentteam'); upload.props.onMouseEnter(); assert.equal(panel.state.quickSettingsExpanded, null);
  panel.state.quickSettingsExpanded = 'history'; upload.props.onClick(); assert.deepEqual(picked, [[false, null]]);
  const input = descendants(tree, node => node.type === 'input' && node.props?.type === 'file')[0];
  assert.equal(input.props.onChange, panel.handleFileUpload); assert.deepEqual(f.requests, []);
});


test('read-only conversation progressively reveals loaded rows per animation frame and live views retain manual loading', t => {
  const f = fixture(t), frames = new Map(); let seq = 0;
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: callback => { frames.set(++seq, callback); return seq; } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'requestAnimationFrame', previous); else delete globalThis.requestAnimationFrame; });
  const chat = new f.ChatView({ requests: [], mainAgentSessions: [], isLocalLog: true });
  chat.setState = (patch, callback) => { Object.assign(chat.state, typeof patch === 'function' ? patch(chat.state) : patch); callback?.(); };
  const rows = Array.from({ length: 1500 }, (_, key) => ({ key })); chat.buildAllItems = () => rows;
  chat.state.allItems = chat._applyMobileSlice(rows); assert.equal(chat.state.allItems.length, 800);
  const advance = () => { chat._maybeScheduleLocalLogAutoFill(); chat._maybeScheduleLocalLogAutoFill(); assert.equal(frames.size, 1); const [id, fn] = [...frames][0]; frames.delete(id); fn(); };
  advance(); assert.equal(chat.state.allItems.length, 1100); advance(); assert.equal(chat.state.allItems.length, 1400);
  advance(); assert.equal(chat.state.allItems.length, 1500); chat._maybeScheduleLocalLogAutoFill(); assert.equal(frames.size, 0);
  chat._mobileSliceOffset = 700; chat.props = { ...chat.props, isLocalLog: false }; chat._maybeScheduleLocalLogAutoFill(); assert.equal(frames.size, 0);
  chat.props = { ...chat.props, isLocalLog: true }; chat._maybeScheduleLocalLogAutoFill(); assert.equal(frames.size, 1);
  chat._unmounted = true; [...frames.values()][0](); assert.equal(chat.state.allItems.length, 1500);
});


test('minimal native runs preserve timestamp navigation, split on text or full cards, and return to raw rows when disabled', t => {
  const f = fixture(t), messages = [
    { role: 'user', content: [{ type: 'text', text: 'native prompt' }], _timestamp: '2026-01-01T00:00:00Z' },
    { role: 'assistant', content: [{ type: 'tool_use', id: 'a', name: 'exec_command', input: { cmd: 'pwd' } }], _timestamp: '2026-01-01T00:00:01Z' },
    { role: 'assistant', content: [{ type: 'tool_use', id: 'b', name: 'exec_command', input: { cmd: 'ls' } }], _timestamp: '2026-01-01T00:00:02Z' },
    { role: 'assistant', content: [{ type: 'text', text: 'native response' }], _timestamp: '2026-01-01T00:00:03Z' },
  ];
  const chat = new f.ChatView({ requests: [], mainAgentSessions: [{ sessionId: 'native-root', messages }], minimalChat: true, showFullToolContent: false, scrollToTimestamp: messages[1]._timestamp });
  let items = chat.buildAllItems(), run = items.find(item => item.props?.runMembers);
  assert.equal(run.props.runMembers.length, 2); assert.equal(run.props.timestamp, messages[2]._timestamp);
  assert.equal(chat._scrollTargetIdx, items.indexOf(run)); assert.equal(chat._tsItemMap[messages[1]._timestamp], chat._tsItemMap[messages[2]._timestamp]);
  chat.props = { ...chat.props, minimalChat: false }; items = chat.buildAllItems(); assert.ok(items.every(item => !item.props?.runMembers)); assert.equal(chat._toolRunCache.size, 0);
  chat.props = { ...chat.props, minimalChat: true, showFullToolContent: true }; items = chat.buildAllItems(); assert.ok(items.every(item => !item.props?.runMembers));
  const app = new f.AppBase({}); assert.equal(app._prefValues().minimalChat, true); const patches = []; app.context = { preferences: { minimalChat: false }, updatePreferences: patch => patches.push(patch) };
  assert.equal(app._prefValues().minimalChat, false); app.handleMinimalChatChange(true); assert.deepEqual(patches, [{ minimalChat: true }]);
});


test('project preference form uses the original default-on minimal toggle only in pill mode', t => {
  const patches = [], props = { values: {}, onPatch: patch => patches.push(patch) };
  const f = fixture(t, { component: 'PreferencesForm', props }); f.draw();
  const row = () => descendants(f.tree, node => node.props?.label === 'Minimal conversation')[0];
  assert.equal(row().props.children.props.checked, true); row().props.children.props.onChange(false); assert.deepEqual(patches, [{ minimalChat: false }]);
  props.values = { minimalChat: false }; f.draw(); assert.equal(row().props.children.props.checked, false);
  props.values = { showFullToolContent: true }; f.draw(); assert.equal(row(), undefined);
});

test('assistant render paths omit zero-segment text while preserving real text and legal system-tag cards', t => {
  fixture(t);
  const { ChatMessage } = require(output);
  const message = new ChatMessage({ role: 'sub-agent-chat', label: 'native child' });
  for (const render of [content => message._renderAssistantContentLegacy(content, {}),
    content => message._renderAssistantContentInOrder(content, {}, [], new Set())]) {
    for (const text of ['   ', '\n\n', ' \n ', '\t \t']) assert.deepEqual(render([{ type: 'text', text }]), [], JSON.stringify(text));
    const visible = render([{ type: 'text', text: 'native answer' }]);
    assert.equal(visible.length, 1); assert.equal(visible[0].props.className, 'chat-boxer');
    const system = render([{ type: 'text', text: '<task-notification></task-notification>' }]);
    assert.equal(system.length, 1, 'a legal empty system-tag still has a renderable segment');
  }
});

test('menu pins hydrate and migrate from a server-confirmed base, persist serially and follow external preferences', async t => {
  const f = fixture(t), { AppHeader } = require(output);
  const make = (preferences = {}) => {
    const header = new AppHeader({ preferences }, { preferences });
    header.context = { preferences, updatePreferences: async patch => patch, refreshPreferences() {} };
    header.setState = (update, callback) => { header.state = { ...header.state, ...(typeof update === 'function' ? update(header.state) : update) }; callback?.(); };
    return header;
  };
  f.values.set('cxv_pinnedMenuKeys', '["project-stats"]');
  const a = make(); assert.deepEqual(a.state.pinnedKeys, [], 'stale browser values never seed optimistic writes');
  a._hydratePinnedKeys({ logDir: '/fixture', pinnedMenuKeys: [] });
  assert.deepEqual(a.state.pinnedKeys, []); assert.equal(f.values.has('cxv_pinnedMenuKeys'), false);
  f.values.set('cxv_pinnedMenuKeys', '["project-stats"]');
  const b = make(); let resolveMigration; const posted = [];
  b.context.updatePreferences = patch => { posted.push(patch); return new Promise(resolve => { resolveMigration = resolve; }); };
  b._hydratePinnedKeys({}); assert.equal(posted.length, 0); assert.equal(f.values.has('cxv_pinnedMenuKeys'), true);
  b._hydratePinnedKeys({ logDir: '/fixture' }); await f.tick();
  assert.deepEqual(b.state.pinnedKeys, ['project-stats']); assert.equal(f.values.has('cxv_pinnedMenuKeys'), true);
  resolveMigration({}); await b._persistQueue; await f.tick(); assert.equal(f.values.has('cxv_pinnedMenuKeys'), false);
  const c = make({ pinnedMenuKeys: ['project-stats'] }), writes = [], releases = [];
  c.context.updatePreferences = patch => { writes.push(patch); return new Promise(resolve => releases.push(resolve)); };
  c.togglePin('import-local'); c.togglePin('display-settings'); await f.tick();
  assert.equal(writes.length, 1); assert.deepEqual(writes[0].pinnedMenuKeys, ['project-stats', 'import-local']);
  c._hydratePinnedKeys({ logDir: '/fixture', pinnedMenuKeys: ['old'] });
  assert.deepEqual(c.state.pinnedKeys, ['project-stats', 'import-local', 'display-settings']);
  releases.shift()({}); await f.tick(); assert.equal(writes.length, 2); releases.shift()({}); await c._persistQueue; await f.tick();
  c.props = { ...c.props, preferences: { pinnedMenuKeys: ['proxy-switch'] } }; c.context.preferences = c.props.preferences;
  c.componentDidUpdate({ ...c.props, preferences: {} }); assert.deepEqual(c.state.pinnedKeys, ['proxy-switch']);
  const d = make(); let refreshed = 0; d.context.updatePreferences = async () => null; d.context.refreshPreferences = () => refreshed++;
  d.togglePin('project-stats'); await d._persistQueue; await f.tick(); assert.equal(refreshed, 1);
});

test('native role controls keep source rows, change one role key and disable unsupported transports', async t => {
  const React = require('react'), Select = require('antd').Select;
  const props = { open: true, proxyProfiles: [{ id: 'max', name: 'Default' }, { id: 'main', name: 'Main source' }, { id: 'child', name: 'Child source' }],
    activeProxyId: 'main', proxyRoles: { subagent: 'follow' }, proxyOfficialDefault: true, proxyRoleRouting: { supported: true } };
  const changes = []; props.onProxyProfileChange = async patch => { changes.push(patch); return false; };
  const f = fixture(t, { component: 'ProxyModal', props }); require(output).setLang('en');
  const all = (node, predicate, found = []) => { if (!node || typeof node !== 'object') return found;
    if (predicate(node)) found.push(node); for (const child of React.Children.toArray(node.props?.children)) all(child, predicate, found); return found; };
  const selects = () => all(f.tree, node => node.type === Select && node.props['aria-label']);
  f.draw(); let rows = selects(); assert.equal(rows.length, 2);
  assert.equal(rows[0].props['aria-label'], 'Main Agent'); assert.equal(rows[1].props['aria-label'], 'Sub-Agent');
  await rows[1].props.onChange('child'); f.draw();
  assert.deepEqual(changes[0].roles, { subagent: 'child' }); assert.equal(changes[0].active, 'main');
  assert.equal(selects()[1].props.value, 'follow', 'a failed save never changes the controlled selection');
  props.proxyRoleRouting = { supported: false }; f.draw(); assert.equal(selects()[1].props.disabled, true);
  assert.match(all(f.tree, node => node.props?.role === 'status')[0].props.children, /cannot verify/);
  await selects()[1].props.onChange('max'); assert.equal(changes.length, 1);
  assert.equal(selects()[0].props.disabled, false, 'main source stays available');
  props.activeProxyId = 'max'; f.draw(); assert.equal(selects().length, 0, 'official Default keeps the original dormant layout');
});

test('role-aware compact chips show only the main label and never claim unsupported or deleted child sources', t => {
  const f = fixture(t); require(output).setLang('en');
  const props = { activeProxyId: 'main', proxyProfiles: [{ id: 'max', name: 'Default' }, { id: 'main', name: 'Main source' }, { id: 'child', name: 'Child source' }],
    proxyRoles: { subagent: 'child' }, proxyRoleRouting: { supported: true } };
  let chip = f.ProxyChip(props); assert.match(chip.props.title, /Sub: Child source/);
  assert.doesNotMatch(chip.props.title, /Team/); assert.equal(require('react').Children.toArray(chip.props.children).at(-1), 'Main source');
  assert.doesNotMatch(f.ProxyChip({ ...props, proxyRoles: { subagent: 'deleted' } }).props.title, /deleted/);
  chip = f.ProxyChip({ ...props, proxyRoleRouting: { supported: false } }); assert.doesNotMatch(chip.props.title, /Sub: Child source/);
  assert.equal(f.ProxyChip({ ...props, activeProxyId: 'max', proxyOfficialDefault: true }), null);
  assert.ok(f.ProxyChip({ ...props, activeProxyId: 'max', proxyOfficialDefault: false }));
  assert.equal(f.ProxyChip({ ...props, activeProxyId: 'max', proxyOfficialDefault: false, proxyRoleRouting: { supported: false } }), null);
});

test('profile refreshes reject late reads, preserve explicit Default and send both CAS revisions on role writes', async t => {
  const f = fixture(t), app = new f.AppBase({}); app.setState = patch => Object.assign(app.state, typeof patch === 'function' ? patch(app.state) : patch);
  const original = globalThis.fetch, pending = [], posted = [];
  globalThis.fetch = async (url, options) => {
    if (options?.method === 'POST') { posted.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ ok: true, ...snapshot('saved') }) }; }
    return new Promise(resolve => pending.push(data => resolve({ ok: true, json: async () => data })));
  };
  const snapshot = revision => ({ profiles: [{ id: 'max', name: 'Default' }, { id: 'main', name: 'Matching', baseURL: 'https://fixture.invalid', activeModel: 'model' }],
    active: 'max', workspaceAssigned: true, defaultConfig: { origin: 'https://fixture.invalid', model: 'model' }, roles: { subagent: revision }, revision: 'catalog-' + revision,
    workspaceRevision: 'workspace-' + revision, officialDefault: true, roleRouting: { supported: true } });
  try {
    const first = app.refreshProxyProfiles({ autoMatch: true }), second = app.refreshProxyProfiles();
    pending[1](snapshot('new')); await second; pending[0](snapshot('old')); await first;
    assert.equal(app.state.proxyRoles.subagent, 'new'); assert.equal(app.state.activeProxyId, 'max'); assert.equal(posted.length, 0);
    const explicit = app.refreshProxyProfiles({ autoMatch: true }); pending[2](snapshot('explicit')); await explicit;
    assert.equal(app.state.activeProxyId, 'max'); assert.equal(posted.length, 0, 'explicit Default never auto-matches the source');
    const late = app.refreshProxyProfiles();
    assert.equal(await app.handleProxyProfileChange({ active: 'max', profiles: app.state.proxyProfiles, roles: { subagent: 'follow' } }), true);
    assert.equal(posted[0].revision, 'catalog-explicit'); assert.equal(posted[0].workspaceRevision, 'workspace-explicit');
    pending[3](snapshot('late')); await late; assert.equal(app.state.proxyWorkspaceRevision, 'workspace-saved'); assert.equal(app.state.proxyRoles.subagent, 'saved');
  } finally { globalThis.fetch = original; }
});

test('control stream keeps healing after ten failed reconnects, restores its budget and never replays a draft', async t => {
  const f = fixture(t), app = new f.AppBase({}), timers = new Map(), sources = [], notices = [];
  const oldSet = globalThis.setTimeout, oldClear = globalThis.clearTimeout, { message } = require('antd'), oldWarning = message.warning;
  let seq = 0;
  globalThis.setTimeout = (fn, ms) => { const id = ++seq; timers.set(id, { fn, ms }); return id; };
  globalThis.clearTimeout = id => timers.delete(id); message.warning = value => notices.push(value);
  t.after(() => { globalThis.setTimeout = oldSet; globalThis.clearTimeout = oldClear; message.warning = oldWarning; });
  app.setState = patch => Object.assign(app.state, typeof patch === 'function' ? patch(app.state) : patch);
  app._v2InitAttempted = true;
  app._streamTransport = { open(url) { const source = { url, closed: false, close() { this.closed = true; }, addEventListener() {} }; sources.push(source); return source; }, closeAll() { sources.forEach(source => source.close()); } };
  app.state.inputText = 'keep my unsent draft';
  const fire = ms => { const next = [...timers].find(([, timer]) => timer.ms === ms); assert.ok(next, `pending ${ms}ms`); timers.delete(next[0]); next[1].fn(); };
  app.initSSE();
  for (let i = 0; i < 10; i++) { fire(45000); fire(Math.min(2000 * 2 ** i, 32000)); }
  fire(45000);
  assert.equal(notices.length, 1);
  assert.equal([...timers.values()].filter(timer => timer.ms === 30000).length, 1);
  app._reconnectSSE();
  assert.equal(notices.length, 1); assert.equal(timers.size, 1);
  fire(30000); assert.equal(sources.length, 12); assert.ok(sources.slice(0, -1).every(source => source.closed));
  assert.ok(sources.every(source => source.url.includes('/events?controlOnly=1') && source.url.includes('instance=a')));
  fire(45000); assert.equal(notices.length, 1);
  sources.at(-1).onopen();
  assert.equal([...timers.values()].some(timer => timer.ms === 30000), false);
  assert.equal(app._sseReconnectCount, 0);
  fire(45000); fire(2000);
  assert.equal(app.state.inputText, 'keep my unsent draft'); assert.equal(f.requests.length, 0);
  app.componentWillUnmount(); assert.equal(timers.size, 0); assert.ok(sources.every(source => source.closed));
  app._reconnectSSE(); app.initSSE(); assert.equal(timers.size, 0); assert.equal(sources.length, 13);
});

test('embedded expert panel retains optional host behavior, file cap and composition-safe shortcut', t => {
  const picked = [], sent = [];
  const props = { embedded: true, hideHeader: true, hideSend: true, variant: 'none', prompt: 'task', files: [],
    templates: [{ key: 'none', kind: 'none' }, { key: 'codeExpert', kind: 'builtin' }],
    customExperts: [], expertOrder: [], expertHidden: [], maxFiles: 1,
    onVariantChange: key => picked.push(key), onPromptChange() {}, onSend: () => sent.push('send'), onUpload() {}, onPaste() {} };
  const f = fixture(t, { component: 'UltraplanPanel', props }); f.draw();
  const buttons = () => descendants(f.tree, node => node.type === 'button');
  assert.equal(descendants(f.tree, node => node.props?.role === 'separator').length, 0);
  const text = () => descendants(f.tree, node => node.type === 'textarea')[0];
  assert.equal(text().props.autoFocus, false);
  buttons()[0].props.onClick(); assert.deepEqual(picked, []);
  buttons()[1].props.onClick(); assert.deepEqual(picked, ['codeExpert']);
  const event = { key: 'Enter', ctrlKey: true, isComposing: true, preventDefault() {} };
  text().props.onKeyDown(event); assert.deepEqual(sent, []);
  text().props.onKeyDown({ ...event, isComposing: false }); assert.deepEqual(sent, ['send']);
  props.files = [{ name: 'a.txt', path: '/tmp/a.txt' }]; f.draw();
  assert.equal(text().props.onPaste, undefined);
  assert.equal(buttons().at(-1).props.disabled, true);
  props.onSend = undefined; f.draw();
  assert.doesNotThrow(() => text().props.onKeyDown({ ...event, isComposing: false }));
  props.embedded = props.hideHeader = props.hideSend = false; f.draw();
  assert.equal(text().props.autoFocus, true);
  assert.equal(descendants(f.tree, node => node.props?.role === 'separator').length, 1);
});

test('original schedule form fills once times and coalesces duplicate saves with an exact native scope', async t => {
  const props = { open: true, project: 'same', instance: 'a', onClose() {} };
  const f = fixture(t, { component: 'ScheduleTaskModal', props }), exports = require(output);
  const toast = require('antd').message;
  const success = toast.success, error = toast.error;
  toast.success = toast.error = () => {};
  t.after(() => { toast.success = success; toast.error = error; });
  exports.setLang('en');
  const calls = []; let resolveSave;
  globalThis.fetch = async (url, options) => {
    const body = options?.body && JSON.parse(options.body); calls.push({ url, body });
    if (url.includes('/preview')) return { ok: true, status: 200, json: async () => ({ next: [], timezone: 'Asia/Shanghai' }) };
    if (options?.method === 'POST') return new Promise(resolve => { resolveSave = () => resolve({ ok: true, status: 200, json: async () => ({ ok: true, task: { id: 'st_saved' } }) }); });
    return { ok: true, status: 200, json: async () => ({ tasks: [], timezone: 'Asia/Shanghai', spawnAvailable: true }) };
  };
  f.draw(); await f.tick(); f.draw(); f.draw();
  const nodes = predicate => descendants(f.tree, predicate);
  const kind = nodes(node => node.props?.options?.some(option => option.value === 'hourly'))[0];
  kind.props.onChange('once'); f.draw();
  const quick = nodes(node => node.type === 'button' && node.props.children === exports.translate('ui.schedule.quick.5m'))[0];
  assert.ok(quick); quick.props.onClick(); f.draw();
  const date = nodes(node => node.props?.showTime && node.props.onChange)[0];
  assert.ok(date.props.value.valueOf() > Date.now() + 3 * 60000);
  const panel = nodes(node => node.type?.name === 'UltraplanPanel')[0];
  assert.equal(panel.props.variant, 'none');
  assert.equal(panel.props.hideHeader, true); assert.equal(panel.props.hideSend, true);
  panel.props.onPromptChange('raw scheduled text'); f.draw();
  const save = nodes(node => node.props?.onClick && node.props.children === exports.translate('ui.schedule.save'))[0];
  const pending = save.props.onClick(); save.props.onClick();
  assert.equal(calls.filter(call => call.body?.prompt).length, 1);
  const written = calls.find(call => call.body?.prompt);
  assert.equal(new URL(written.url, window.location.href).searchParams.get('instance'), 'a');
  assert.equal(written.body.prompt, 'raw scheduled text'); assert.equal(written.body.template, 'none');
  assert.equal(written.body.schedule.kind, 'once');
  resolveSave(); await pending; await f.tick();
});

test('same-name native modal switch discards a stale project list response', async t => {
  const props = { open: true, project: 'same', instance: 'a', onClose() {} };
  const f = fixture(t, { component: 'ScheduleTaskModal', props });
  const pending = [];
  globalThis.fetch = (url) => new Promise(resolve => pending.push({ url, resolve }));
  f.draw(); props.instance = 'b'; f.draw();
  const foreign = pending.find(call => call.url.includes('/api/scheduled-tasks') && call.url.includes('instance=a'));
  foreign.resolve({ ok: true, json: async () => ({ tasks: [{ id: 'foreign', prompt: 'private a', schedule: { kind: 'daily', time: '09:00' } }] }) });
  await f.tick(); f.draw();
  assert.equal(descendants(f.tree, node => node.props?.title === 'private a').length, 0);
});

test('schedule history opens the exact native archive through the existing resume callback', async t => {
  const resumed = [], closed = [], calls = [];
  const props = { open: true, project: 'same', instance: 'a', onClose: () => closed.push(true), onResumeSession: row => resumed.push(row) };
  const f = fixture(t, { component: 'ScheduleTaskModal', props }), exports = require(output); exports.setLang('en');
  const task = { id: 'st_old', prompt: 'original task', mode: 'spawn', schedule: { kind: 'daily', time: '09:00' }, enabled: true };
  globalThis.fetch = async url => {
    calls.push(url);
    const data = url.includes('/api/resume-sessions') ? { instanceKey: 'a', items: [{ file: 'exact/timeline.jsonl', sessionId: 'native-old' }] }
      : url.includes('/scheduled-tasks/runs') ? { runs: [{ id: 'run_old', sessionId: 'native-old', status: 'completed', at: 1 }] }
      : { tasks: [task], spawnAvailable: true };
    return { ok: true, status: 200, json: async () => data };
  };
  for (let i = 0; i < 5; i++) { f.draw(); await f.tick(); }
  const button = descendants(f.tree, node => node.props?.onClick && node.props.children === exports.translate('ui.schedule.openSession'))[0];
  assert.ok(button); await button.props.onClick();
  assert.deepEqual(closed, [true]);
  assert.deepEqual(resumed, [{ file: 'exact/timeline.jsonl', sessionId: 'native-old', sessionUuid: 'native-old', instanceKey: 'a' }]);
  const query = new URL(calls.find(url => url.includes('/api/resume-sessions')), window.location.href);
  assert.equal(query.searchParams.get('sessionId'), 'native-old'); assert.equal(query.searchParams.get('limit'), '1');
});


test('plugin menu opens the selected original panel, keeps its pin key and resets retries on reopen', t => {
  fixture(t);
  const { AppHeader } = require(output);
  const header = new AppHeader({ preferences: {}, viewMode: 'chat' }, { preferences: {} });
  header.setState = (patch, callback) => { Object.assign(header.state, typeof patch === 'function' ? patch(header.state) : patch); callback?.(); };
  const a = { name: 'service-a', entryUrl: '/plugin-panels/service-a/index.js', title: 'Service A' };
  header.state.pluginPanels = [a, { name: 'missing', entryUrl: null }];
  let menu = header._getMenuDescriptors();
  const index = menu.findIndex(item => item.key === 'plugin-management');
  assert.equal(menu[index + 1].key, 'plugin-panel:service-a');
  assert.equal(menu.some(item => item.key === 'plugin-panel:missing'), false);
  menu[index + 1].onClick();
  assert.equal(header.state.activePluginPanel, a);
  header._handlePluginPanelRetry();
  assert.equal(header.state.pluginPanelAttempt, 1);
  header._handlePluginPanelClose();
  assert.equal(header.state.activePluginPanel, null);
  menu[index + 1].onClick();
  assert.equal(header.state.pluginPanelAttempt, 0);
  header.togglePin(menu[index + 1].key);
  assert.deepEqual(header.state.pinnedKeys, ['plugin-panel:service-a']);
  header.context = { updatePreferences: async patch => patch };
});

test('original panel modal clamps width and unmounts the panel host on close', t => {
  const props = { panel: { name: 'demo', title: 'Demo', width: 1600, serviceStatus: 'ready' }, open: true,
    onClose() {}, project: 'same', instance: 'a', theme: 'dark', lang: 'en' };
  const f = fixture(t, { component: 'PluginPanelModal', props });
  f.draw();
  assert.equal(f.tree.props.width, 1168);
  const children = require('react').Children.toArray(f.tree.props.children);
  assert.equal(children.length, 1);
  assert.equal(children[0].props.instance, 'a');
  assert.equal(children[0].props.project, 'same');
  assert.equal(children[0].props.theme, 'dark');
  props.open = false; f.draw();
  assert.equal(require('react').Children.toArray(f.tree.props.children).length, 0);
});

test('guided update modal gates channels, byte progress and explicit restart confirmation', () => {
  const { UpdateModal } = require(output);
  const original = require('antd').Modal.confirm; let confirmed; let restarted = 0;
  require('antd').Modal.confirm = options => { confirmed = options; };
  const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
  try {
    const props = { open: true, currentVersion: '1.1.20', method: 'npm', canRestart: true, onRestart: () => restarted++ };
    const ready = walk(UpdateModal({ ...props, state: { status: 'restart_required', version: '1.1.21' } }));
    const restart = ready.find(n => n.props?.danger && n.props?.onClick);
    restart.props.onClick(); assert.equal(restarted, 0); assert.equal(typeof confirmed.content, 'string');
    confirmed.onOk(); assert.equal(restarted, 1);
    const manual = walk(UpdateModal({ ...props, canRestart: false, state: { status: 'available', version: '1.1.21' } }));
    assert.equal(manual.some(n => n.props?.onClick === props.onRestart), false);
    assert.ok(manual.some(n => n.type === 'code' && n.props.children.includes('cx-viewer@latest')));
    const progress = walk(UpdateModal({ ...props, state: { status: 'downloading', downloaded: 50, total: 200 } }));
    assert.ok(progress.some(n => n.props?.percent === 25));
    for (const [method, command] of [['brew','brew upgrade'],['pnpm','pnpm add -g']]) {
      const nodes = walk(UpdateModal({ ...props, method, state: { status: 'idle' } }));
      assert.ok(nodes.some(n => n.type === 'code' && n.props.children.includes(command)));
    }
  } finally { require('antd').Modal.confirm = original; }
});

test('IM chip keeps reconnecting distinct and re-arms after configuration changes',async t=>{
 const states=[];const f=fixture(t,{component:'ImStatusChip',props:{descriptor:{id:'dingtalk',labelKey:'ui.im.dingtalk',fallback:'DingTalk',icon:()=>null,color:'blue',endpoints:{status:'/api/im/dingtalk/status'}},onStatus:(_id,state)=>states.push(state)}});
 let payload={enabled:false,hasSecret:false,connection:{running:false,connected:false}};
 globalThis.fetch=async()=>({ok:true,json:async()=>payload});
 f.draw();await f.tick();assert.equal(f.timers.size,0);
 payload={enabled:true,hasSecret:true,connection:{running:true,connected:true,connectionState:'reconnecting',lastError:'temporary disconnect'}};
 f.windowEvents.get('cxv:im-config-changed')({detail:{id:'dingtalk'}});await f.tick();f.draw();await f.tick();
 assert.equal(states.at(-1).state,'reconnecting');assert.equal(states.at(-1).connected,false);assert.match(f.tree.props.title,/Reconnecting/);
 assert.equal(f.timers.size,1);f.cleanup();await f.tick();assert.equal(f.timers.size,0);assert.equal(f.windowEvents.has('cxv:im-config-changed'),false);
});

test('IM explicit Save persists edited fields without starting or stopping the worker',async t=>{
 const descriptor=require(output).IM_PLATFORMS.find(p=>p.id==='dingtalk');
 const f=fixture(t,{component:'ImPlatformSettings',props:{descriptor}}),posts=[];
 require(output).setLang('en');
 const message=require('antd').message;const originalSuccess=message.success;message.success=()=>{};t.after(()=>{message.success=originalSuccess;});
 globalThis.fetch=async(url,options)=>{if(options?.method==='POST'){posts.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true})};}return {ok:true,json:async()=>({enabled:false,hasSecret:true,appKey:'fixture-key',allowStaffIds:['fixture-staff'],process:{state:'dead'},connection:{running:false,connected:false}})};};
 const walk=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children,node.props?.title].flat(Infinity).flatMap(walk)];
 f.draw();await f.tick();f.draw();
 const input=walk(f.tree).find(n=>n.props?.value==='fixture-key'&&n.props.onChange);assert.ok(input);
 input.props.onChange({target:{value:'edited-key'}});
 const save=walk(f.tree).find(n=>n.props?.children==='Save'&&n.props.onClick);assert.ok(save);await save.props.onClick();
 assert.equal(posts.length,1);assert.match(posts[0].url,/\/config/);assert.equal(posts[0].body.appKey,'edited-key');assert.equal(posts[0].body.enabled,false);assert.equal(posts[0].body.applyProcess,false);
});

test('IM conversation Stop requires confirmation and sends only the preserving enabled patch',async t=>{
 const f=fixture(t,{component:'ImConversationModal',props:{open:true,platform:'dingtalk'}}),posts=[];
 require(output).setLang('en');
 globalThis.fetch=async(url,options)=>{if(options?.method==='POST'){posts.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true})};}return {ok:true,json:async()=>String(url).includes('/status')?{enabled:true,hasSecret:true,process:{state:'ready',port:7140},connection:{running:true,connected:true}}:String(url).includes('/senders')?{senders:{}}:{latest:null}};};
 const walk=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children,node.props?.title].flat(Infinity).flatMap(walk)];
 f.draw();await f.tick();f.draw();
 const confirm=walk(f.tree).find(n=>typeof n.props?.onConfirm==='function');assert.ok(confirm);assert.equal(posts.length,0);
 await confirm.props.onConfirm();assert.equal(posts.length,1);assert.match(posts[0].url,/dingtalk\/config/);assert.deepEqual(posts[0].body,{enabled:false,applyProcess:true});
 f.draw();assert.ok(walk(f.tree).some(n=>n.props?.children==='Start'&&n.props.onClick));
});

test('native and web IM header actions preserve the original conversation/config split',t=>{
 fixture(t);const {AppHeader}=require(output);const header=new AppHeader({preferences:{},viewMode:'chat'},{preferences:{}});
 header.setState=patch=>Object.assign(header.state,typeof patch==='function'?patch(header.state):patch);
 header._handleHeaderAction({type:'im',id:'dingtalk'});assert.equal(header.state.imRecordVisible,true);assert.equal(header.state.imRecordPlatform,'dingtalk');assert.equal(header.state.messagingModalVisible,false);
 header._getMenuDescriptors().find(d=>d.key==='messaging').onClick();assert.equal(header.state.messagingModalVisible,true);assert.equal(header.state.messagingInitialTool,null);
});

test('IM settings uses the original reconnecting badge even with stale connected and error fields', async t => {
 const descriptor=require(output).IM_PLATFORMS.find(p=>p.id==='dingtalk');
 const f=fixture(t,{component:'ImPlatformSettings',props:{descriptor}});require(output).setLang('en');
 globalThis.fetch=async()=>({ok:true,json:async()=>({enabled:true,hasSecret:true,process:{state:'ready',port:7151},connection:{running:true,connected:true,connectionState:'reconnecting',lastError:'temporary disconnect'}})});
 const walk=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(walk)];
 f.draw();await f.tick();f.draw();
 const badge=walk(f.tree).find(n=>n.props?.color==='warning');assert.ok(badge);
 assert.match([badge.props.children].flat(Infinity).join(''),/Reconnecting.*7151/);
 assert.doesNotMatch([badge.props.children].flat(Infinity).join(''),/temporary disconnect|Connected/);
});
