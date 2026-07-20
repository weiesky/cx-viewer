import test from 'node:test';
import assert from 'node:assert/strict';

import { benchmarkLogV2Writer, benchmarkWireCheckpointScaling } from '../lib/log-v2/benchmark.js';

test('repeatable V2 benchmark measures size, append, recovery, materialization, and input deduplication', () => {
  const report = benchmarkLogV2Writer({ events: 40, messageBytes: 512, durability: 'buffered' });
  assert.equal(report.events, 40);
  assert.equal(report.materializedEvents, 40);
  assert.ok(report.fullEntryBytes > 0);
  assert.ok(report.v2Bytes > 0);
  assert.ok(report.bytesPerEvent > 0);
  assert.ok(report.objectFiles > 0);
  assert.equal(report.inputObjectCandidates, 820);
  assert.equal(report.uniqueInputObjects, 40);
  assert.ok(report.inputObjectDeduplicationRatio > 0.8);
  assert.ok(report.appendLatencyMs.p50 >= 0);
  assert.ok(report.appendLatencyMs.p95 >= report.appendLatencyMs.p50);
  assert.ok(report.recoveryTimeMs >= 0);
  assert.ok(report.materializeTimeMs >= 0);
  assert.ok(report.wireSnapshotTimeMs >= 0);
  assert.ok(report.v2ControlWireBytes > 0);
  assert.ok(report.legacyFullWireBytes > report.v2ControlWireBytes);
  assert.ok(report.v2ControlToFullWireRatio < 1);
});

test('wire/2 checkpoint growth remains linear at 1k, 2k, and 4k commits', () => {
  const report = benchmarkWireCheckpointScaling();
  assert.deepEqual(report.map(value => value.events), [1000, 2000, 4000]);
  assert.deepEqual(report.map(value => value.inputNodes), [1000, 2000, 4000]);
  assert.deepEqual(report.map(value => value.entryRevisionStates), [0, 0, 0]);
  assert.ok(report[1].controlBytes / report[0].controlBytes < 2.3);
  assert.ok(report[2].controlBytes / report[1].controlBytes < 2.3);
  assert.ok(report[2].bytesPerEvent < report[0].bytesPerEvent * 1.2);
});
