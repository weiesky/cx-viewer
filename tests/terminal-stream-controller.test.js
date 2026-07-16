import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sendTerminalSocketMessage,
  TerminalStreamController,
  terminalUtf8ByteLength,
} from '../src/utils/terminalStreamController.js';

function snapshot(overrides = {}) {
  return {
    type: 'data-resync',
    streamId: 1,
    throughSeq: 0,
    resizeGeneration: 1,
    cols: 80,
    rows: 24,
    data: 'SNAPSHOT',
    ...overrides,
  };
}

function geometry(overrides = {}) {
  return {
    type: 'geometry',
    streamId: 1,
    resizeGeneration: 1,
    cols: 80,
    rows: 24,
    ...overrides,
  };
}

function createHarness(options = {}) {
  const events = [];
  const controller = new TerminalStreamController({
    ...options,
    onData: (message) => { events.push(['data', message]); return true; },
    onGeometry: (message) => { events.push(['geometry', message]); return true; },
    onSnapshot: (message) => { events.push(['snapshot', message]); return true; },
    onResync: (message) => { events.push(['resync', message]); return true; },
  });
  return { controller, events };
}

test('socket message send preserves adapter failure and native success semantics', () => {
  const sent = [];
  const nativeSocket = {
    readyState: 1,
    send(payload) { sent.push(JSON.parse(payload)); },
  };
  assert.equal(sendTerminalSocketMessage(nativeSocket, { type: 'resync-request' }), true);
  assert.deepEqual(sent, [{ type: 'resync-request' }]);

  assert.equal(sendTerminalSocketMessage({ readyState: 1, send: () => false }, { type: 'resize' }), false);
  assert.equal(sendTerminalSocketMessage({ readyState: 0, send: () => true }, { type: 'resize' }), false);
  assert.equal(sendTerminalSocketMessage({ readyState: 1, send: () => { throw new Error('closed'); } }, { type: 'resize' }), false);
});

test('new stream data is held until snapshot and only its contiguous suffix is applied', () => {
  const { controller, events } = createHarness();

  assert.equal(controller.acceptData({ type: 'data', streamId: 1, seq: 1, data: 'old' }), 'held');
  assert.equal(controller.acceptData({ type: 'data', streamId: 1, seq: 2, data: 'live-2' }), 'held');
  assert.equal(events.filter(([type]) => type === 'data').length, 0);
  assert.equal(events.filter(([type]) => type === 'resync').length, 1);

  assert.equal(controller.acceptSnapshot(snapshot({ throughSeq: 1 })), 'applied');
  assert.deepEqual(events.map(([type]) => type), ['resync', 'geometry', 'snapshot', 'data']);
  assert.equal(events.at(-1)[1].seq, 2);
  assert.equal(events.at(-1)[1].data, 'live-2');
  assert.deepEqual(controller.getState(), {
    streamId: 1,
    throughSeq: 2,
    resizeGeneration: 1,
    cols: 80,
    rows: 24,
    phase: 'live',
    heldMessages: 0,
    heldBytes: 0,
    discardedThroughSeq: 0,
    resyncRequested: false,
  });
});

test('duplicates are dropped and a forward gap sends one resync then pauses', () => {
  const { controller, events } = createHarness();
  controller.acceptSnapshot(snapshot());
  events.length = 0;

  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: 'one' }), 'applied');
  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: 'one-again' }), 'duplicate');
  assert.equal(controller.acceptData({ streamId: 1, seq: 3, data: 'three' }), 'gap');
  assert.equal(controller.acceptData({ streamId: 1, seq: 4, data: 'four' }), 'held');
  assert.equal(controller.acceptData({ streamId: 1, seq: 2, data: 'two' }), 'held');

  assert.deepEqual(events.map(([type]) => type), ['data', 'resync']);
  assert.equal(controller.getState().phase, 'paused');
  assert.equal(controller.getState().heldMessages, 3);

  assert.equal(controller.acceptSnapshot(snapshot({ throughSeq: 1, data: 'AT-ONE' })), 'applied');
  assert.deepEqual(
    events.filter(([type]) => type === 'data').map(([, message]) => message.seq),
    [1, 2, 3, 4],
  );
  assert.equal(events.filter(([type]) => type === 'resync').length, 1);
  assert.equal(controller.getState().phase, 'live');
});

test('higher stream replaces the awaiting state while every older stream message is dropped', () => {
  const { controller, events } = createHarness();
  controller.acceptSnapshot(snapshot({ streamId: 2, data: 'TWO' }));
  events.length = 0;

  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: 'stale' }), 'stale');
  assert.equal(controller.acceptData({ streamId: 3, seq: 1, data: 'three-1' }), 'held');
  assert.equal(controller.acceptSnapshot(snapshot({ streamId: 2, throughSeq: 99 })), 'stale');
  assert.equal(controller.acceptSnapshot(snapshot({
    streamId: 3,
    throughSeq: 0,
    resizeGeneration: 0,
    data: 'THREE',
  })), 'applied');

  assert.deepEqual(events.map(([type]) => type), ['resync', 'geometry', 'snapshot', 'data']);
  assert.equal(events.at(-1)[1].streamId, 3);
  assert.equal(events.at(-1)[1].seq, 1);
});

test('hold byte overflow clears the whole suffix and never replays a partial tail', () => {
  const { controller, events } = createHarness({ maxHeldBytes: 5, maxHeldMessages: 20 });

  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: 'abc' }), 'held');
  assert.equal(controller.acceptData({ streamId: 1, seq: 2, data: 'def' }), 'overflow');
  assert.equal(controller.acceptData({ streamId: 1, seq: 3, data: 'tail' }), 'discarded');
  assert.equal(controller.getState().heldMessages, 0);
  assert.equal(controller.getState().discardedThroughSeq, 3);
  assert.equal(events.filter(([type]) => type === 'resync').length, 1);

  assert.equal(controller.acceptSnapshot(snapshot({ throughSeq: 2 })), 'snapshot-behind');
  assert.equal(events.filter(([type]) => type === 'data').length, 0);
  assert.equal(events.filter(([type]) => type === 'resync').length, 2);
  assert.equal(controller.getState().phase, 'paused');

  assert.equal(controller.acceptSnapshot(snapshot({ throughSeq: 3, data: 'COVERS-ALL' })), 'applied');
  assert.equal(controller.getState().phase, 'live');
  assert.equal(controller.getState().throughSeq, 3);
  assert.equal(events.filter(([type]) => type === 'data').length, 0);
});

test('hold message cap protects sorting even when frames have no payload bytes', () => {
  const { controller } = createHarness({ maxHeldBytes: 100, maxHeldMessages: 2 });
  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: '' }), 'held');
  assert.equal(controller.acceptData({ streamId: 1, seq: 2, data: '' }), 'held');
  assert.equal(controller.acceptData({ streamId: 1, seq: 3, data: '' }), 'overflow');
  assert.equal(controller.getState().heldMessages, 0);
  assert.equal(controller.getState().discardedThroughSeq, 3);
});

test('geometry generation resizes immediately and rejects snapshots from an older grid', () => {
  const { controller, events } = createHarness();

  assert.equal(controller.acceptGeometry(geometry()), 'applied');
  assert.equal(controller.acceptSnapshot(snapshot({ resizeGeneration: 0 })), 'stale');
  assert.equal(events.filter(([type]) => type === 'snapshot').length, 0);
  assert.equal(controller.acceptSnapshot(snapshot()), 'applied');
  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: 'one' }), 'applied');

  assert.equal(controller.acceptGeometry(geometry({ resizeGeneration: 2, cols: 100, rows: 30 })), 'applied');
  assert.equal(controller.acceptData({ streamId: 1, seq: 2, data: 'two' }), 'held');
  assert.equal(controller.acceptGeometry(geometry()), 'stale');
  assert.equal(controller.acceptSnapshot(snapshot({ throughSeq: 1 })), 'stale');
  assert.equal(controller.getState().phase, 'awaiting-snapshot');

  assert.equal(controller.acceptSnapshot(snapshot({
    throughSeq: 1,
    resizeGeneration: 2,
    cols: 100,
    rows: 30,
    data: 'GEN-TWO',
  })), 'applied');
  assert.equal(events.at(-1)[0], 'data');
  assert.equal(events.at(-1)[1].seq, 2);
  assert.equal(controller.getState().throughSeq, 2);
  assert.equal(events.filter(([type]) => type === 'resync').length, 2);
});

test('snapshot advancing generation applies geometry before replay', () => {
  const { controller, events } = createHarness();
  controller.acceptSnapshot(snapshot());
  events.length = 0;

  assert.equal(controller.acceptSnapshot(snapshot({
    resizeGeneration: 2,
    cols: 120,
    rows: 40,
    data: 'NEW-GRID',
  })), 'applied');
  assert.deepEqual(events.map(([type]) => type), ['geometry', 'snapshot']);
  assert.deepEqual(events[0][1], {
    streamId: 1, resizeGeneration: 2, cols: 120, rows: 40,
  });
});

test('provider-owned parse recovery pauses without sending a duplicate resync', () => {
  const { controller, events } = createHarness();
  controller.acceptSnapshot(snapshot());
  events.length = 0;

  controller.expectSnapshot();
  assert.equal(controller.getState().phase, 'paused');
  assert.equal(controller.getState().resyncRequested, true);
  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: 'held' }), 'held');
  assert.equal(events.filter(([type]) => type === 'resync').length, 0);

  assert.equal(controller.acceptSnapshot(snapshot({ throughSeq: 0, data: 'RECOVERED' })), 'applied');
  assert.equal(events.at(-1)[0], 'data');
  assert.equal(events.at(-1)[1].data, 'held');
});

test('an invalid or stale-watermark snapshot is a consumed response and immediately retries', () => {
  const { controller, events } = createHarness();
  controller.acceptSnapshot(snapshot({ throughSeq: 2 }));
  events.length = 0;

  controller.requestSnapshot('manual');
  assert.equal(controller.acceptSnapshot(snapshot({ data: null, throughSeq: 2 })), 'invalid');
  assert.equal(events.filter(([type]) => type === 'resync').length, 2);
  assert.equal(events.at(-1)[1].reason, 'invalid-snapshot-envelope');

  assert.equal(controller.acceptSnapshot(snapshot({ throughSeq: 1 })), 'stale');
  assert.equal(events.filter(([type]) => type === 'resync').length, 3);
  assert.equal(events.at(-1)[1].reason, 'stale-snapshot-watermark');
  assert.equal(controller.getState().phase, 'paused');
});

test('a failed resync send is retried while the triggering frame is safely held', () => {
  const requests = [];
  let attempts = 0;
  const controller = new TerminalStreamController({
    onResync(request) {
      requests.push(request);
      attempts++;
      return attempts > 1;
    },
  });

  assert.equal(controller.acceptData({ streamId: 1, seq: 1, data: 'one' }), 'held');
  // new-stream request fails, then the same frame's awaiting-snapshot fallback retries.
  assert.equal(requests.length, 2);
  assert.equal(controller.getState().resyncRequested, true);
  assert.equal(controller.acceptData({ streamId: 1, seq: 2, data: 'two' }), 'held');
  assert.equal(requests.length, 2);
});

test('UTF-8 hold accounting handles ASCII, BMP, emoji and lone surrogates', () => {
  assert.equal(terminalUtf8ByteLength('aé中😀'), 1 + 2 + 3 + 4);
  assert.equal(terminalUtf8ByteLength('\ud83d'), 3);
  assert.equal(terminalUtf8ByteLength('\udc00'), 3);
});
