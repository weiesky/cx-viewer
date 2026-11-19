import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachTerminalWsPing, TERMINAL_WS_PING_MS } from '../lib/terminal-ws-ping.js';

test('terminal heartbeat starts immediately, repeats only while open, and cleans its timer/listener on close', () => {
  const ws = new EventEmitter(), frames = [];
  ws.readyState = 1; ws.send = value => frames.push(JSON.parse(value));
  let tick, cleared = false, unref = false;
  const timer = { unref() { unref = true; } };
  attachTerminalWsPing(ws, {
    setI(fn, delay) { assert.equal(delay, TERMINAL_WS_PING_MS); tick = fn; return timer; },
    clearI(value) { assert.equal(value, timer); cleared = true; },
  });
  assert.deepEqual(frames, [{ type: 'ping' }]);
  assert.equal(unref, true);
  tick(); assert.equal(frames.length, 2);
  ws.readyState = 3; tick(); assert.equal(frames.length, 2);
  ws.emit('close');
  assert.equal(cleared, true);
  assert.equal(ws.listenerCount('close'), 0);
});
