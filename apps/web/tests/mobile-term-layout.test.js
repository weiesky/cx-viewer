import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMobileFixedLayout, watchMobileFixedLayout } from '../src/utils/mobileTermLayout.js';

function terminal() {
  const cell = { width: 6, height: 12 };
  let fontSize = 10;
  return {
    cols: 80, rows: 24, resizes: [],
    options: {
      get fontSize() { return fontSize; },
      set fontSize(value) { fontSize = value; cell.width = value * 0.6; cell.height = value * 1.2; },
    },
    _core: { _renderService: { dimensions: { css: { cell } } } },
    resize(cols, rows) { this.cols = cols; this.rows = rows; this.resizes.push([cols, rows]); },
  };
}

function environment(t, hasViewport = true) {
  const frames = new Map(), timers = new Map(), listeners = new Map();
  let next = 0, observer;
  const viewport = {
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: (event, fn) => { assert.equal(listeners.get(event), fn); listeners.delete(event); },
  };
  const globals = {
    requestAnimationFrame: fn => { frames.set(++next, fn); return next; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, ms) => { assert.equal(ms, 50); timers.set(++next, fn); return next; },
    clearTimeout: id => timers.delete(id),
    ResizeObserver: class {
      constructor(fn) { this.callback = fn; observer = this; }
      observe(container) { this.container = container; }
      disconnect() { this.disconnected = true; }
    },
    window: hasViewport ? { visualViewport: viewport } : viewport,
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (old) Object.defineProperty(globalThis, key, old); else delete globalThis[key]; });
  }
  const tick = map => { const callbacks = [...map.values()]; map.clear(); callbacks.forEach(fn => fn()); };
  return { frames, timers, listeners, get observer() { return observer; },
    frame: () => tick(frames), timeout: () => tick(timers) };
}

test('60 columns measure the host, scale font and bound rows', () => {
  const term = terminal();
  assert.deepEqual(computeMobileFixedLayout(term, { clientWidth: 360, clientHeight: 480 }),
    { fontSize: 10, cols: 60, rows: 40 });
  assert.deepEqual(computeMobileFixedLayout(term, { clientWidth: 720, clientHeight: 480 }),
    { fontSize: 20, cols: 60, rows: 20 });
  assert.equal(computeMobileFixedLayout(term, { clientWidth: 360, clientHeight: 1 }).rows, 5);
  assert.equal(computeMobileFixedLayout(term, { clientWidth: 360, clientHeight: 9999 }).rows, 100);
  for (const invalid of [0, -1, NaN, Infinity, undefined]) {
    assert.equal(computeMobileFixedLayout(term, { clientWidth: invalid, clientHeight: 480 }), null);
    assert.equal(computeMobileFixedLayout(term, { clientWidth: 360, clientHeight: invalid }), null);
    term.options.fontSize = invalid;
    assert.equal(computeMobileFixedLayout(term, { clientWidth: 360, clientHeight: 480 }), null);
  }
});

for (const hasViewport of [true, false]) {
  test(`keyboard shrink and container changes keep 60 columns (visualViewport=${hasViewport})`, t => {
    const env = environment(t, hasViewport), term = terminal();
    const host = { clientWidth: 360, clientHeight: 480 }, reports = [];
    const layout = watchMobileFixedLayout(term, host, { onResized: changed => reports.push(changed) });
    assert.equal(env.observer.container, host);
    layout.resize(); env.frame(); env.frame();
    assert.deepEqual(term.resizes, [[60, 40]]);
    host.clientHeight = 240;
    env.listeners.get('resize')(); env.frame(); env.frame();
    assert.deepEqual(term.resizes.at(-1), [60, 20]);
    host.clientWidth = 720;
    env.observer.callback(); env.frame(); env.frame();
    assert.equal(term.options.fontSize, 20);
    assert.deepEqual(term.resizes.at(-1), [60, 10]);
    env.observer.callback(); env.frame(); env.frame();
    assert.deepEqual(reports, [true, true, true, false]);
    layout.dispose();
    assert.equal(env.observer.disconnected, true);
    assert.equal(env.listeners.size, 0);
    assert.equal(env.frames.size + env.timers.size, 0);
  });
}

test('hidden tabs stop polling and can be explicitly refitted when shown', t => {
  const env = environment(t), term = terminal(), host = { clientWidth: 0, clientHeight: 0 };
  const layout = watchMobileFixedLayout(term, host);
  layout.resize(); env.frame();
  assert.equal(env.frames.size + env.timers.size, 0);
  assert.deepEqual(term.resizes, []);
  Object.assign(host, { clientWidth: 360, clientHeight: 480 });
  layout.resize(); env.frame(); env.frame();
  assert.deepEqual(term.resizes, [[60, 40]]);
  layout.dispose();
});

test('renderer readiness retries are bounded and disposal cancels pending work', t => {
  const env = environment(t), term = terminal(), host = { clientWidth: 360, clientHeight: 480 };
  const cell = term._core._renderService.dimensions.css.cell;
  cell.width = 0;
  const layout = watchMobileFixedLayout(term, host);
  layout.resize(); env.frame();
  let attempts = 0;
  while (env.timers.size) { assert.ok(++attempts <= 40); env.timeout(); }
  assert.equal(attempts, 40);
  assert.equal(term.resizes.length, 0);
  layout.resize(); env.frame();
  const lateRetry = [...env.timers.values()][0];
  layout.dispose(); lateRetry(); layout.resize();
  assert.equal(env.frames.size + env.timers.size, 0);
  assert.equal(term.resizes.length, 0);
});

test('renderer becoming ready after several frames is measured, and stale frames cannot resize a replacement', t => {
  const env = environment(t), term = terminal(), host = { clientWidth: 360, clientHeight: 480 };
  let alive = true;
  term._core._renderService.dimensions.css.cell.width = 0;
  const layout = watchMobileFixedLayout(term, host, { isAlive: () => alive });
  layout.resize(); env.frame(); env.timeout(); env.timeout();
  term.options.fontSize = 10;
  env.timeout(); env.frame();
  assert.deepEqual(term.resizes, [[60, 40]]);
  host.clientHeight = 240;
  layout.resize(); env.frame();
  const stale = [...env.frames.values()][0];
  alive = false;
  Object.defineProperty(term._core._renderService, 'dimensions', { get() { throw new Error('disposed'); } });
  assert.doesNotThrow(() => { env.frame(); stale(); });
  assert.equal(term.resizes.length, 1);
  layout.dispose();
});

test('new resize events coalesce pending measurements and unmount cancels the deferred frame', t => {
  const env = environment(t), term = terminal(), host = { clientWidth: 360, clientHeight: 480 };
  const layout = watchMobileFixedLayout(term, host);
  layout.resize(); layout.resize(); env.observer.callback();
  assert.equal(env.frames.size, 1);
  env.frame();
  const stale = [...env.frames.values()][0];
  layout.dispose(); stale();
  assert.equal(env.frames.size + env.timers.size, 0);
  assert.deepEqual(term.resizes, []);
});
