import test from 'node:test';
import assert from 'node:assert/strict';

import { sendTerminalSocketMessage, TerminalStreamController } from '../src/utils/terminalStreamController.js';

const sync = (overrides = {}) => ({
  type: 'stream-sync', streamId: 1, throughSeq: 1, resizeGeneration: 0,
  cols: 80, rows: 24, ...overrides,
});

test('socket send preserves explicit adapter failure', () => {
  const sent = [];
  assert.equal(sendTerminalSocketMessage({ readyState: 1, send: value => sent.push(value) }, { type: 'x' }), true);
  assert.equal(sendTerminalSocketMessage({ readyState: 1, send: () => false }, { type: 'x' }), false);
  assert.equal(sent.length, 1);
});

test('cursor sync establishes the sequence and contiguous live bytes follow', () => {
  const events = [];
  const controller = new TerminalStreamController({
    onSync: () => events.push(['sync']),
    onData: message => events.push(['data', message.data]),
    onGeometry: message => events.push(['geometry', message.cols]),
    onResync: message => events.push(['resync', message.reason]),
  });
  assert.equal(controller.acceptSync(sync()), 'applied');
  assert.equal(controller.acceptData({ streamId: 1, seq: 2, data: 'LIVE' }), 'applied');
  assert.deepEqual(events, [['geometry', 80], ['sync'], ['data', 'LIVE']]);
});

test('a real sequence gap asks for cursor sync and ignores the unknown suffix', () => {
  const requests = [];
  const controller = new TerminalStreamController({ onResync: request => requests.push(request) });
  controller.acceptSync(sync());
  assert.equal(controller.acceptData({ streamId: 1, seq: 3, data: 'GAP' }), 'gap');
  assert.equal(requests[0].reason, 'sequence-gap');
});

test('newer streams replace old streams and stale messages are ignored', () => {
  const controller = new TerminalStreamController();
  controller.acceptSync(sync());
  assert.equal(controller.observeStream(2), 'new');
  assert.equal(controller.acceptSync(sync({ streamId: 1 })), 'stale');
  assert.equal(controller.acceptSync(sync({ streamId: 2, throughSeq: 0 })), 'applied');
});

test('a snapshot cannot roll geometry back behind an observed resize', () => {
  const controller = new TerminalStreamController();
  controller.acceptSync(sync());
  controller.acceptGeometry({ streamId: 1, resizeGeneration: 2, cols: 100, rows: 30 });
  assert.equal(controller.acceptSync(sync({ throughSeq: 2, resizeGeneration: 1 })), 'stale');
  assert.equal(controller.getState().resizeGeneration, 2);
});
