import test from 'node:test';
import assert from 'node:assert/strict';
import { attachMobileTouchScroll } from '../src/utils/mobileTouchScroll.js';

function fixture(t) {
  const frames = new Map(), listeners = new Map(), lines = [];
  let id = 0, now = 0;
  const globals = {
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    performance: { now: () => now },
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (old) Object.defineProperty(globalThis, key, old); else delete globalThis[key]; });
  }
  const screen = {
    addEventListener(type, fn, options) { assert.equal(options.passive, true); listeners.set(type, fn); },
    removeEventListener(type, fn) { assert.equal(listeners.get(type), fn); listeners.delete(type); },
  };
  const terminal = {
    _core: { _renderService: { dimensions: { css: { cell: { height: 10 } } } } },
    scrollLines(value) { lines.push(value); },
  };
  const dispose = attachMobileTouchScroll(terminal, { querySelector: selector => selector === '.xterm-screen' ? screen : null });
  const touch = (y, identifier = 1) => ({ clientY: y, identifier });
  const event = (type, touches, elapsed = 16) => { now += elapsed; listeners.get(type)?.({ touches }); };
  const frame = () => { const callbacks = [...frames.values()]; frames.clear(); now += 16; callbacks.forEach(fn => fn()); };
  const total = () => lines.reduce((sum, value) => sum + value, 0);
  return { terminal, frames, listeners, lines, dispose, touch, event, frame, total };
}

test('missing screen/terminal needs no touch handlers', () => {
  assert.equal(attachMobileTouchScroll({}, null), null);
  assert.equal(attachMobileTouchScroll(null, { querySelector: () => ({}) }), null);
});

test('touch movement batches per frame and retains fractional lines in both directions', t => {
  const f = fixture(t);
  f.event('touchstart', [f.touch(100)]);
  f.event('touchmove', [f.touch(96)]); f.frame();
  assert.equal(f.total(), 0);
  f.event('touchmove', [f.touch(92)]);
  f.event('touchmove', [f.touch(85)]);
  assert.equal(f.frames.size, 1);
  f.frame(); assert.equal(f.total(), 1);
  f.event('touchmove', [f.touch(105)]); f.frame();
  assert.equal(f.total(), 0);
  f.dispose();
});

test('touchend flushes queued movement and starts bounded inertia, interrupted by the next gesture', t => {
  const f = fixture(t);
  f.event('touchstart', [f.touch(100)]);
  f.event('touchmove', [f.touch(80)]);
  f.event('touchmove', [f.touch(60)]);
  f.event('touchend', []);
  assert.equal(f.total(), 4);
  assert.equal(f.frames.size, 1);
  f.frame(); assert.ok(f.total() > 4);
  f.event('touchstart', [f.touch(300)]);
  assert.equal(f.frames.size, 0);
  f.event('touchmove', [f.touch(290)]); f.frame();
  assert.equal(f.lines.at(-1), 1);
  f.dispose();
});

test('momentum decays to a stop and a held finger does not reuse stale velocity', t => {
  const f = fixture(t);
  const gesture = () => {
    f.event('touchstart', [f.touch(100)]);
    f.event('touchmove', [f.touch(80)]); f.event('touchmove', [f.touch(60)]);
  };
  gesture(); f.event('touchend', []);
  let count = 0;
  while (f.frames.size) { assert.ok(++count < 200); f.frame(); }
  assert.ok(f.total() > 4);
  gesture(); f.event('touchend', [], 200);
  assert.equal(f.frames.size, 0);
  f.dispose();
});

test('touchcancel flushes once with no inertia and removes pending animation', t => {
  const f = fixture(t);
  f.event('touchstart', [f.touch(100)]);
  f.event('touchmove', [f.touch(80)]); f.event('touchmove', [f.touch(60)]);
  f.event('touchcancel', []);
  assert.equal(f.total(), 4);
  assert.equal(f.frames.size, 0);
  f.event('touchend', []);
  assert.equal(f.frames.size, 0);
  f.dispose();
});

test('multi-finger transitions reset anchors and velocity, including a different remaining finger', t => {
  const f = fixture(t);
  f.event('touchstart', [f.touch(100)]);
  f.event('touchmove', [f.touch(80)]); f.event('touchmove', [f.touch(60)]); f.frame();
  const before = f.total();
  f.event('touchstart', [f.touch(60), f.touch(500, 2)]);
  f.event('touchmove', [f.touch(400), f.touch(700, 2)]);
  f.event('touchend', [f.touch(700, 2)]);
  assert.equal(f.frames.size, 0);
  f.event('touchmove', [f.touch(690, 2)]); f.frame();
  assert.equal(f.total() - before, 1);
  f.event('touchend', []);
  assert.equal(f.frames.size, 0);
  f.dispose();
});

test('a changed primary touch without an intervening end event cannot jump', t => {
  const f = fixture(t);
  f.event('touchstart', [f.touch(100)]);
  f.event('touchmove', [f.touch(900, 2)]); f.frame();
  assert.equal(f.total(), 0);
  f.event('touchmove', [f.touch(890, 2)]); f.frame();
  assert.equal(f.total(), 1);
  f.dispose();
});

test('unmount removes listeners, cancels inertia and makes captured callbacks safe after terminal disposal', t => {
  const f = fixture(t);
  f.event('touchstart', [f.touch(100)]);
  f.event('touchmove', [f.touch(80)]); f.event('touchmove', [f.touch(60)]);
  f.event('touchend', []);
  const staleFrames = [...f.frames.values()], staleEvents = [...f.listeners.values()];
  f.dispose();
  assert.equal(f.frames.size + f.listeners.size, 0);
  Object.defineProperty(f.terminal._core._renderService, 'dimensions', { get() { throw new Error('disposed'); } });
  f.terminal.scrollLines = () => { throw new Error('disposed'); };
  const before = f.total();
  assert.doesNotThrow(() => {
    staleFrames.forEach(fn => fn());
    staleEvents.forEach(fn => fn({ touches: [f.touch(10)] }));
  });
  assert.equal(f.total(), before);
});
