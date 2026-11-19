// Component-level acceptance with React and the actual component classes.
// CSS is omitted; this does not verify browser layout, touch or xterm rendering.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const web = join(repo, 'apps/web');
const require = createRequire(join(web, 'package.json'));
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const cache = join(web, 'node_modules/.cache');
mkdirSync(cache, { recursive: true });
const output = join(cache, `cxv-scratch-probe-${process.pid}.cjs`);
await build({ stdin: { contents: `export { default as Panel } from './src/components/terminal/TerminalPanel.jsx';
export { default as Scratch } from './src/components/terminal/ScratchTerminal.jsx';
export { default as Mobile } from './src/Mobile.jsx';`,
  resolveDir: web, sourcefile: 'scratch-probe.js' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external',
  outfile: output, loader: { '.css': 'empty', '.svg': 'text', '.png': 'dataurl', '.gif': 'dataurl' }, logLevel: 'error',
});
require.extensions['.css'] = () => {};
globalThis.self = globalThis;
globalThis.WebSocket = { OPEN: 1 };
globalThis.document = { documentElement: { style: {}, getAttribute() { return 'dark'; }, classList: { add() {} } }, body: { style: {} }, createElement() { return { style: {} }; } };
globalThis.MutationObserver = class { observe() {} disconnect() {} };

try {
  for (const mode of ['desktop', 'phone', 'iphone', 'pad']) {
    const phone = mode === 'phone' || mode === 'iphone';
    const values = new Map([
      ['cx-viewer-scratch-tabs', '[{"id":"legacy"}]'],
      ['cx-viewer-scratch-tabs:instance:a', '[{"id":"a1"},{"id":"a2"}]'],
      ['cx-viewer-scratch-active-tab:instance:a', 'a2'],
    ]);
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    Object.defineProperty(globalThis, 'navigator', { configurable: true,
      value: { userAgent: mode === 'iphone' ? 'iPhone' : phone ? 'Android Mobile' : 'Desktop', platform: mode === 'iphone' ? 'iPhone' : 'Linux', maxTouchPoints: 1 } });
    const location = new URL(`http://fixture/?instance=a${phone ? '&mobile=1' : mode === 'pad' ? '&ipad=1' : ''}`);
    globalThis.window = { location, innerWidth: 1200, removeEventListener() {} };
    const load = () => { delete require.cache[output]; return require(output); };
    const { Panel, Scratch, Mobile } = load();
    const mobile = new Mobile({});
    assert.equal(mobile.state.mobileTerminalVisible, false);
    mobile.state.mobileTerminalVisible = true;
    const closed = mobile._closeAllMobileOverlays();
    assert.equal(closed.mobileTerminalVisible, false);
    assert.ok(Object.values(closed).every(value => value === false));
    assert.equal(values.has('cxv_sdkScratchOpen'), false);

    const panel = new Panel({ scratchOnly: true, scratchOpen: true });
    panel.setState = (change, callback) => {
      Object.assign(panel.state, typeof change === 'function' ? change(panel.state) : change);
      callback?.();
    };
    panel.initTerminal = () => { throw new Error('scratch-only cannot initialize the main PTY'); };
    panel.componentDidMount();
    assert.deepEqual(panel.state.scratchTabs, [{ id: 'a1' }, { id: 'a2' }]);
    assert.equal(panel.state.activeScratchTabId, 'a2');
    const { renderToStaticMarkup } = require('react-dom/server');
    const markup = renderToStaticMarkup(panel.render());
    assert.ok(markup.includes('role="tablist"'));
    assert.ok(markup.includes(`aria-orientation="${phone ? 'horizontal' : 'vertical'}"`));
    assert.ok(markup.includes('aria-controls="scratch-pane-a2"'));
    const writes = [];
    panel._scratchRefs.set('a1', { current: { sendVirtualKey: value => writes.push(['a1', value]), refit() {} } });
    panel._scratchRefs.set('a2', { current: { sendVirtualKey: value => writes.push(['a2', value]), refit() {} } });
    panel.handleVirtualKey('\r');
    assert.deepEqual(writes, [['a2', '\r']]);
    if (phone) {
      panel.render().props.children[1].props.children[0].props.onClick({ detail: 0 });
      assert.deepEqual(writes.at(-1), ['a2', '\x1b[A']);
    }
    let focused = false, prevented = false;
    const target = { parentElement: { querySelector: () => ({ focus() { focused = true; } }) } };
    panel.handleScratchTabKey('a2', { key: 'ArrowRight', target, currentTarget: target,
      preventDefault() { prevented = true; } });
    assert.equal(panel.state.activeScratchTabId, 'a1');
    assert.equal(focused && prevented, true);
    assert.equal(values.get('cx-viewer-scratch-active-tab:instance:a'), 'a1');
    const savedA = values.get('cx-viewer-scratch-tabs:instance:a');
    window.location.search = '?instance=b';
    const B = load().Panel;
    const other = new B({ scratchOnly: true, scratchOpen: true });
    other.componentDidMount();
    assert.ok(other.state.scratchTabs.every(tab => !['a1', 'a2', 'legacy'].includes(tab.id)));
    assert.equal(values.get('cx-viewer-scratch-tabs:instance:a'), savedA);
    assert.equal(values.get('cx-viewer-scratch-tabs'), '[{"id":"legacy"}]');
    // Exercise the actual main/scratch call sites and the main stream bootstrap,
    // using measured host dimensions and a deterministic browser scheduler.
    const frames = new Map(), observers = [], viewportListeners = new Map();
    const touchHost = () => {
      const listeners = new Map();
      const screen = { addEventListener: (type, fn) => listeners.set(type, fn),
        removeEventListener: type => listeners.delete(type) };
      return { clientWidth: 360, clientHeight: 480, offsetWidth: 360, offsetHeight: 480,
        querySelector: () => screen, listeners };
    };
    let frameId = 0;
    globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
    globalThis.cancelAnimationFrame = id => frames.delete(id);
    globalThis.ResizeObserver = class {
      constructor(fn) { this.callback = fn; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    };
    window.visualViewport = {
      addEventListener: (key, fn) => viewportListeners.set(fn, key),
      removeEventListener: (key, fn) => viewportListeners.delete(fn),
    };
    const flushFrames = () => {
      for (let n = 0; frames.size && n < 8; n++) {
        const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn());
      }
      assert.equal(frames.size, 0);
    };
    const scrolls = [];
    const fakeTerminal = () => {
      const cell = { width: 6, height: 12 };
      let fontSize = 10;
      return { cols: 80, rows: 24,
        options: { get fontSize() { return fontSize; },
          set fontSize(value) { fontSize = value; cell.width = value * 0.6; cell.height = value * 1.2; } },
        _core: { _renderService: { dimensions: { css: { cell } } } },
        resize(cols, rows) { this.cols = cols; this.rows = rows; }, scrollLines(lines) { scrolls.push(lines); }, dispose() {},
      };
    };
    if (phone) {
      const main = new Panel({});
      const host = touchHost();
      main.containerRef.current = host;
      main.terminal = fakeTerminal();
      const events = [];
      main._bootstrapTerminalStream = reason => events.push(['bootstrap', reason]);
      main.sendResize = () => events.push(['resize', main.terminal.cols, main.terminal.rows]);
      main._setupMobileTouchScroll();
      assert.equal(host.listeners.size, 4);
      main._mobileFixedResize(); flushFrames();
      assert.equal(main._initialGeometryReady, true);
      assert.deepEqual(events, [['bootstrap', 'initial-fit']]);
      host.clientHeight = 240;
      for (const fn of viewportListeners.keys()) fn();
      flushFrames();
      assert.deepEqual(events.at(-1), ['resize', 60, 20]);
      assert.equal(events.filter(([type]) => type === 'bootstrap').length, 1);
      main.componentWillUnmount();
      assert.equal(host.listeners.size, 0);
      assert.equal(viewportListeners.size, 0);
    }
    const sizedScratch = new Scratch({ id: 'sized' });
    const scratchHost = touchHost();
    scratchHost.clientHeight = scratchHost.offsetHeight = 240;
    sizedScratch.containerRef.current = scratchHost;
    sizedScratch.terminal = fakeTerminal();
    let fits = 0;
    sizedScratch.fitAddon = { fit() { fits++; } };
    const resizeMessages = [];
    sizedScratch.ws = { readyState: 1, send: value => resizeMessages.push(JSON.parse(value)), close() {} };
    sizedScratch.initTerminal = () => {};
    sizedScratch.connectWebSocket = () => {};
    sizedScratch.componentDidMount();
    assert.equal(scratchHost.listeners.size, mode === 'desktop' ? 0 : 4);
    if (mode !== 'desktop') {
      scratchHost.listeners.get('touchstart')({ touches: [{ identifier: 1, clientY: 100 }] });
      scratchHost.listeners.get('touchmove')({ touches: [{ identifier: 1, clientY: 76 }] });
    }
    sizedScratch.refit(); flushFrames();
    if (phone) {
      assert.equal(fits, 0);
      assert.deepEqual(resizeMessages, [{ type: 'resize', cols: 60, rows: 20 }]);
    } else assert.equal(fits, 1);
    if (mode !== 'desktop') assert.deepEqual(scrolls, [2]);
    sizedScratch.componentWillUnmount();
    assert.equal(scratchHost.listeners.size, 0);
    assert.equal(viewportListeners.size, 0);
    assert.equal(frames.size, 0);
    // Feed real queue bursts: phones trim earlier and request the existing
    // server replay; desktop/pad retain their existing larger budget.
    const queued = new Scratch({ id: 'budget' });
    const resync = [];
    queued.ws = { readyState: 1, send: value => resync.push(JSON.parse(value)), close() {} };
    for (let n = 0; n < 4; n++) queued._throttledWrite('x'.repeat(300 * 1024));
    assert.deepEqual(resync, phone ? [{ type: 'resync-request' }] : []);
    queued.componentWillUnmount();
    assert.equal(frames.size, 0);
    const socketWrites = [];
    const terminal = new Scratch({ id: 'a2' });
    terminal.ws = { readyState: 1, send: value => socketWrites.push(JSON.parse(value)) };
    terminal.sendVirtualKey('\t');
    assert.deepEqual(socketWrites, [{ type: 'input', data: '\t' }]);
    panel.props = { scratchOnly: true, scratchOpen: false };
    assert.equal(panel.render(), null);
    panel.componentWillUnmount(); other.componentWillUnmount();
    console.log(JSON.stringify({ mode, scoped_state: 'passed', main_pty_skipped: 'passed',
      scratch_render: 'passed', layout_call_sites: 'passed', touch_call_sites: 'passed', phone_queue_budget: 'passed', keyboard_active_tab: 'passed', closed_panel: 'passed', browser_gui: 'not verified' }));
  }
} finally { rmSync(output, { force: true }); }
