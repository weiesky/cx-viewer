// Actual React component callbacks with deterministic browser/hook fixtures.
// This verifies state and wiring, not mounted DOM, browser drag or CSS layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SDK_WORKSPACE_ORDER_KEY, SDK_WORKSPACE_ORDER_DRAG } from '../src/utils/sdkWorkspaceOrder.js';

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
export { getLang } from './src/i18n.js';
export { ResumeSessionsList } from './src/components/chat/ResumeSessionsPopover.jsx';
export { default as QuickAutoApproveRows } from './src/components/common/QuickAutoApproveRows.jsx';
export { default as WorkspaceList } from './src/components/dashboard/WorkspaceList.jsx';
export { default as NewProjectModal } from './src/components/dashboard/NewProjectModal.jsx';
export { default as AppBase } from './src/AppBase.jsx';`, resolveDir: web },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: output,
  loader: { '.css': 'empty', '.svg': 'text', '.png': 'dataurl', '.gif': 'dataurl' }, logLevel: 'error' });
test.after(() => rmSync(directory, { recursive: true, force: true }));

const session = (instanceKey, busy = false) => ({ instanceKey, cwd: `/${instanceKey}/same`, projectName: 'same', busy });
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
    document: { hidden: false, documentElement: { style: {}, getAttribute() { return 'dark'; }, classList: { add() {} } },
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
  return { draw, reload, tick, event, cleanup, AppBase, values, windowEvents, documentEvents, timers, requests, focused, navigations,
    get tree() { return tree; }, set live(rows) { live = rows; }, set listed(rows) { listed = rows; }, set history(data) { history = data; } };
}

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
