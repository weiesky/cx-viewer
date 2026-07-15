import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  SESSION_SUMMARY_KIND,
  createProjectManifest,
  createSessionManifest,
  createTimelineRecord,
  validateImportReceipt,
  validateProjectManifest,
  validateSessionManifest,
  validateSessionSummary,
  validateTimelineRecord,
} from '../lib/log-v2/schema.js';
import { assembleEntryParts, splitEntryParts } from '../lib/log-v2/entry-codec.js';
import { writeContentObjectSync } from '../lib/log-v2/storage.js';

const now = '2026-07-14T08:00:00.000Z';

test('creates valid constant-size project discovery metadata', () => {
  const manifest = createProjectManifest({
    projectId: 'project-1',
    canonicalCwd: '/workspace/project',
    createdAt: now,
  });
  assert.equal(manifest.nextSessionSeq, 1);
  assert.equal(manifest.latestSessionId, null);
  assert.equal(validateProjectManifest(manifest).ok, true);
  assert.equal(Object.hasOwn(manifest, 'sessions'), false);
});

test('creates a session archive manifest with explicit lineage', () => {
  const manifest = createSessionManifest({
    projectId: 'project-1',
    sessionId: 'session-2',
    sessionSeq: 2,
    previousSessionId: 'session-1',
    replacesSessionId: 'session-1',
    startReason: 'clear',
    source: 'app-server',
    createdAt: now,
    state: 'active',
  });
  assert.equal(manifest.rootThreadId, 'session-2');
  assert.equal(manifest.previousSessionId, 'session-1');
  assert.equal(validateSessionManifest(manifest).ok, true);
});

test('timeline record joins entry and input revisions in session order', () => {
  const record = createTimelineRecord({
    seq: 7,
    eventId: 'event-7',
    txnId: 'txn-7',
    timestamp: now,
    committedAt: now,
    threadId: 'child-1',
    parentThreadId: 'root-1',
    agentRole: 'subagent',
    turnId: 'turn-3',
    entryKey: 'entry-3',
    entryRevision: 2,
    entryRef: { thread: 't_abc', offset: 120, length: 80, checksum: 'sha256:abc' },
    inputRevision: 4,
    phase: 'inProgress',
    legacyRef: { logFile: 'project/log.jsonl', offset: 40, length: 80 },
  });
  assert.equal(validateTimelineRecord(record).ok, true);
  assert.equal(record.committedAt, now);
  assert.equal(record.legacyRef.offset, 40);
});

test('schema validation reports structural corruption', () => {
  const project = validateProjectManifest({});
  assert.equal(project.ok, false);
  assert.ok(project.errors.some((error) => error.includes('projectId')));

  const session = validateSessionManifest({ state: 'unknown' });
  assert.equal(session.ok, false);
  assert.ok(session.errors.some((error) => error.includes('state')));

  const timeline = validateTimelineRecord({ entryRef: { offset: -1 } });
  assert.equal(timeline.ok, false);
  assert.ok(timeline.errors.some((error) => error.includes('entryRef.offset')));

  const unsafeLegacy = validateTimelineRecord({
    ...createTimelineRecord({
      seq: 1,
      eventId: 'e',
      txnId: 't',
      timestamp: now,
      threadId: 'thread',
      agentRole: 'main',
      entryKey: 'entry',
      entryRevision: 1,
      entryRef: { thread: 'token', offset: 0, length: 1, checksum: 'sum' },
      inputRevision: 0,
      phase: 'completed',
    }),
    legacyRef: { logFile: '../escape.jsonl', offset: 0, length: 1 },
  });
  assert.equal(unsafeLegacy.ok, false);
  assert.ok(unsafeLegacy.errors.some((error) => error.includes('legacyRef.logFile')));
});

test('legacy import receipt schema pins source, identity, digest, and durability evidence', () => {
  const receipt = {
    kind: 'cx-viewer.v1-import',
    version: 1,
    sourceFile: 'project/log.jsonl',
    sourceBytes: 123,
    sourceDigest: `sha256:${'a'.repeat(64)}`,
    projectId: 'project',
    canonicalCwd: '/workspace/project',
    sessionId: 'legacy-import:session',
    importedAt: now,
    entryCount: 2,
    entriesDigest: `sha256:${'b'.repeat(64)}`,
    durability: 'batched-fsync',
    syncedFiles: 8,
  };
  assert.equal(validateImportReceipt(receipt).ok, true);
  assert.equal(validateImportReceipt({ ...receipt, sourceFile: '../escape.jsonl' }).ok, false);
  assert.equal(validateImportReceipt({ ...receipt, sourceDigest: 'sha256:short' }).ok, false);
  assert.equal(validateImportReceipt({ ...receipt, entryCount: 0 }).ok, false);
  assert.equal(validateImportReceipt({ ...receipt, durability: 'buffered' }).ok, false);
});

test('session summary schema validates derived prompt and archive metadata without a session item cap', () => {
  const summary = {
    kind: SESSION_SUMMARY_KIND,
    version: 1,
    sessionId: 'session-2',
    rootThreadId: 'session-2',
    lastRootTurnId: null,
    throughSeq: 8,
    rootInputRevision: 3,
    committedEvents: 8,
    turns: 2,
    archiveBytes: 4096,
    summaryBytes: 1024,
    indexedTimelineBytes: 2048,
    turnIds: [`sha256:${'a'.repeat(64)}`, `sha256:${'b'.repeat(64)}`],
    activeRootInput: [
      { hash: 'c'.repeat(64), promptOccurrenceId: 'prompt-1' },
      { hash: 'd'.repeat(64), promptOccurrenceId: null },
    ],
    userPrompts: [
      {
        occurrenceId: 'prompt-1',
        fingerprint: `sha256:${'e'.repeat(64)}`,
        text: 'first prompt',
        truncated: false,
      },
      {
        occurrenceId: 'prompt-2',
        fingerprint: `sha256:${'f'.repeat(64)}`,
        text: '',
        truncated: true,
      },
    ],
  };
  assert.equal(validateSessionSummary(summary).ok, true);

  const manyPrompts = Array.from({ length: 600 }, (_, index) => ({
    occurrenceId: `prompt-${index}`,
    fingerprint: `sha256:${index.toString(16).padStart(64, '0')}`,
    text: `prompt ${index}`,
    truncated: false,
  }));
  assert.equal(validateSessionSummary({ ...summary, userPrompts: manyPrompts }).ok, true);
});

test('session summary schema rejects malformed nested records and unsafe integer fields', () => {
  const invalid = validateSessionSummary({
    kind: SESSION_SUMMARY_KIND,
    version: 1,
    sessionId: 'session',
    rootThreadId: 'root',
    throughSeq: -1,
    rootInputRevision: 0,
    committedEvents: 0,
    turns: 0,
    archiveBytes: 0,
    summaryBytes: 0,
    indexedTimelineBytes: 0,
    turnIds: ['not-a-digest'],
    activeRootInput: [{ hash: 'short', promptOccurrenceId: '' }],
    userPrompts: [{ occurrenceId: '', fingerprint: 'short', text: 42, truncated: 'no' }],
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((error) => error.includes('throughSeq')));
  assert.ok(invalid.errors.some((error) => error.includes('turnIds[0]')));
  assert.ok(invalid.errors.some((error) => error.includes('activeRootInput[0].hash')));
  assert.ok(invalid.errors.some((error) => error.includes('promptOccurrenceId')));
  assert.ok(invalid.errors.some((error) => error.includes('userPrompts[0].fingerprint')));
  assert.ok(invalid.errors.some((error) => error.includes('userPrompts[0].truncated')));
});

test('content object creation callback reports actual bytes once without changing the ref shape', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-object-create-'));
  try {
    const created = [];
    const value = { message: '你好' };
    const first = writeContentObjectSync(root, value, {
      durable: false,
      onCreate(info) { created.push(info); },
    });
    const second = writeContentObjectSync(root, value, {
      durable: false,
      onCreate(info) { created.push(info); },
    });

    assert.deepEqual(second, first);
    assert.deepEqual(Object.keys(first).sort(), ['algorithm', 'bytes', 'hash', 'path']);
    assert.equal(created.length, 1);
    assert.equal(created[0].path, first.path);
    assert.equal(created[0].bytes, statSync(join(root, first.path)).size);
    assert.equal(created[0].bytes, first.bytes + 1);
    assert.throws(
      () => writeContentObjectSync(root, { another: true }, { onCreate: true }),
      /onCreate must be a function/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('entry codec preserves null and non-object request/response containers', () => {
  for (const entry of [
    { timestamp: now, url: 'codex://pending', response: null },
    { timestamp: now, url: 'codex://array', request: ['legacy'], response: 'failed' },
  ]) {
    const split = splitEntryParts(entry);
    assert.deepEqual(assembleEntryParts(new Map(Object.entries(split.parts))), entry);
  }
});
