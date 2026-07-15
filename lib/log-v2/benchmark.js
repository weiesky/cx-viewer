#!/usr/bin/env node
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

import { resolveAppServerThreadIdentity } from './identity.js';
import { materializeSessionArchive } from './materializer.js';
import { LogV2Writer } from './writer.js';
import { readV2WireSnapshot } from './transport.js';
import { applyWireCommit, checkpointWireArchiveState, createWireArchiveState } from './reducer.js';
import { LOG_V2_WIRE_KINDS, LOG_V2_WIRE_VERSION } from './wire-schema.js';

function directoryBytes(root) {
  let bytes = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) bytes += directoryBytes(path);
    else if (entry.isFile()) bytes += statSync(path).size;
  }
  return bytes;
}

function countFiles(root) {
  let files = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files += countFiles(path);
    else if (entry.isFile()) files++;
  }
  return files;
}

function percentile(values, ratio) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * ratio))] ?? 0;
}

export function benchmarkLogV2Writer({ events = 40, messageBytes = 512, durability = 'buffered' } = {}) {
  if (!Number.isSafeInteger(events) || events <= 0) throw new TypeError('events must be a positive integer');
  if (!Number.isSafeInteger(messageBytes) || messageBytes <= 0) throw new TypeError('messageBytes must be a positive integer');
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-benchmark-'));
  try {
    const sessionId = 'benchmark-session';
    const identity = resolveAppServerThreadIdentity({ id: sessionId, sessionId });
    const openOptions = {
      rootDir: root,
      projectId: 'benchmark-project',
      canonicalCwd: '/benchmark/project',
      sessionId,
      createdAt: '2026-07-14T00:00:00.000Z',
      durability,
    };
    const writer = LogV2Writer.open(openOptions);
    const input = [];
    const latencies = [];
    let v1Bytes = 0;
    for (let index = 0; index < events; index++) {
      input.push({
        type: 'message',
        role: index % 2 ? 'assistant' : 'user',
        content: `${String(index).padStart(4, '0')}:${'x'.repeat(messageBytes)}`,
      });
      const entry = {
        timestamp: new Date(Date.UTC(2026, 6, 14, 0, 0, index)).toISOString(),
        url: 'https://chatgpt.com/backend-api/codex/responses',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { model: 'gpt-5', instructions: 'benchmark', input },
        response: { status: 200, headers: {}, body: { content: [{ type: 'text', text: `event-${index}` }] } },
      };
      v1Bytes += Buffer.byteLength(`${JSON.stringify(entry)}\n---\n`);
      const started = performance.now();
      writer.append(entry, identity);
      latencies.push(performance.now() - started);
    }
    const v2Bytes = directoryBytes(writer.projectDir);
    const recoveryStarted = performance.now();
    const reopened = LogV2Writer.open(openOptions);
    const recoveryTimeMs = performance.now() - recoveryStarted;
    const materializeStarted = performance.now();
    const materialized = materializeSessionArchive(reopened.sessionDir);
    const materializeTimeMs = performance.now() - materializeStarted;
    const timelineFile = relative(root, join(reopened.sessionDir, 'timeline.jsonl')).split('\\').join('/');
    const wireStarted = performance.now();
    const wireSnapshot = readV2WireSnapshot(root, timelineFile);
    const wireSnapshotTimeMs = performance.now() - wireStarted;
    const legacyFullWireBytes = materialized.entries.reduce((sum, entry) => sum + Buffer.byteLength(JSON.stringify(entry)), 0);
    const v2ControlWireBytes = Buffer.byteLength(JSON.stringify({
      start: wireSnapshot.start,
      checkpoint: wireSnapshot.checkpoint,
      summaries: wireSnapshot.summaries,
      end: wireSnapshot.end,
    }));
    const objectFiles = countFiles(join(writer.sessionDir, 'objects'));
    const inputObjectCandidates = (events * (events + 1)) / 2;
    return Object.freeze({
      events,
      messageBytes,
      durability,
      v1Bytes,
      v2Bytes,
      v2ToV1Ratio: v2Bytes / v1Bytes,
      bytesSaved: v1Bytes - v2Bytes,
      bytesPerEvent: v2Bytes / events,
      objectFiles,
      inputObjectCandidates,
      uniqueInputObjects: events,
      inputObjectDeduplicationRatio: inputObjectCandidates > 0 ? 1 - (events / inputObjectCandidates) : 0,
      recoveryTimeMs,
      materializeTimeMs,
      wireSnapshotTimeMs,
      legacyFullWireBytes,
      v2ControlWireBytes,
      v2ControlToFullWireRatio: v2ControlWireBytes / legacyFullWireBytes,
      materializedEvents: materialized.committedEvents,
      appendLatencyMs: {
        p50: percentile(latencies, 0.5),
        p95: percentile(latencies, 0.95),
        max: Math.max(...latencies),
      },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Repeatable protocol-only scale probe; avoids filesystem noise in CI. */
export function benchmarkWireCheckpointScaling({ sizes = [1000, 2000, 4000], window = 400 } = {}) {
  const archive = Object.freeze({ projectId: 'benchmark', sessionId: 'wire', generation: 'linear' });
  return Object.freeze(sizes.map((events) => {
    const state = createWireArchiveState(archive);
    const started = performance.now();
    for (let seq = 1; seq <= events; seq++) {
      const hex = seq.toString(16).padStart(64, '0').slice(-64);
      applyWireCommit(state, {
        kind: LOG_V2_WIRE_KINDS.commit,
        version: LOG_V2_WIRE_VERSION,
        archive,
        timelineBytes: seq * 100,
        timeline: {
          seq, eventId: `event-${seq}`, txnId: `txn-${seq}`,
          timestamp: `2026-07-15T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
          threadId: 'thread', entryKey: `entry-${seq}`, entryRevision: 1,
          inputRevision: seq, agentRole: 'main', phase: 'completed',
        },
        entry: {
          entryKey: `entry-${seq}`, revision: 1, baseRevision: 0,
          set: { 'root.meta': { hash: hex, bytes: 1 } }, delete: [],
          inputBinding: { revision: seq, path: 'root.body.input', changed: true },
        },
        input: {
          revision: seq, baseRevision: seq - 1, path: 'root.body.input',
          retain: seq - 1, remove: 0, append: [{ hash: hex, bytes: 1 }],
        },
      });
    }
    const winnerSeqs = new Set([...state.winners.values()].slice(-window).map(value => value.seq));
    const checkpoint = checkpointWireArchiveState(state, { winnerSeqs, includeEntries: false });
    const controlBytes = Buffer.byteLength(JSON.stringify(checkpoint));
    return Object.freeze({
      events,
      window: Math.min(window, events),
      controlBytes,
      bytesPerEvent: controlBytes / events,
      buildTimeMs: performance.now() - started,
      inputNodes: checkpoint.threads[0]?.nodes.length || 0,
      entryRevisionStates: checkpoint.entries.length,
    });
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const events = process.argv[2] ? Number(process.argv[2]) : 40;
  const messageBytes = process.argv[3] ? Number(process.argv[3]) : 512;
  const durability = process.argv[4] || 'buffered';
  console.log(JSON.stringify(benchmarkLogV2Writer({ events, messageBytes, durability }), null, 2));
}
