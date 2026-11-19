import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWireCursor,
  LOG_V2_WIRE_PROTOCOL,
  LOG_V2_WIRE_VERSION,
  validateWireCheckpoint,
  validateWireInputLocator,
  validateWireCursor,
  wireObjectRef,
} from '../lib/log-v2/wire-schema.js';

test('wire cursor is scoped to an exact archive generation and sequence watermark', () => {
  const archive = { projectId: 'project', sessionId: 'session', generation: 'generation' };
  const cursor = createWireCursor(archive, 7, 1024);
  assert.equal(validateWireCursor(cursor).ok, true);
  assert.deepEqual(cursor, { archive, throughSeq: 7, timelineBytes: 1024 });
  assert.equal(LOG_V2_WIRE_PROTOCOL, 'cx-viewer.log-v2-wire');
  assert.equal(LOG_V2_WIRE_VERSION, 2);
});

test('wire/2 input locators and checkpoints reject cumulative input payloads', () => {
  const input = { threadId: 'thread', path: 'root.body.input', revision: 1, length: 2 };
  assert.equal(validateWireInputLocator(input).ok, true);
  assert.equal(validateWireInputLocator({ ...input, refs: [] }).ok, false);
  assert.equal(validateWireCheckpoint({
    kind: 'cx-viewer.log-v2-wire.checkpoint', version: LOG_V2_WIRE_VERSION,
    archive: { projectId: 'p', sessionId: 's', generation: 'g' },
    throughSeq: 0, timelineBytes: 0, entries: [], threads: [], winners: [],
  }).ok, true);
});

test('wire refs deliberately omit storage paths and offsets', () => {
  const ref = wireObjectRef({
    algorithm: 'sha256',
    hash: 'a'.repeat(64),
    bytes: 12,
    path: 'objects/aa/aa/private.json',
    offset: 99,
  });
  assert.deepEqual(ref, { hash: 'a'.repeat(64), bytes: 12 });
  assert.equal('path' in ref, false);
  assert.equal('offset' in ref, false);
});
