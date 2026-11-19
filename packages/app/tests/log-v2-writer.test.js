import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveAppServerThreadIdentity, threadStoreToken } from '../lib/log-v2/identity.js';
import { inspectSessionArchive } from '../lib/log-v2/inspect.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

const rootIdentity = resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' });

function writerOptions(rootDir, extra = {}) {
  return {
    rootDir,
    projectId: 'project-1',
    canonicalCwd: '/workspace/project-1',
    sessionId: 'session-root',
    rootThreadId: 'session-root',
    createdAt: '2026-07-14T08:00:00.000Z',
    ...extra,
  };
}

function entry(input, content, extra = {}) {
  return {
    timestamp: '2026-07-14T08:01:00.000Z',
    url: 'https://chatgpt.com/backend-api/codex/responses',
    method: 'POST',
    headers: { Authorization: 'Bearer secret-token', 'content-type': 'application/json' },
    body: { model: 'gpt-5', input, instructions: 'work carefully' },
    response: {
      status: 200,
      headers: { 'set-cookie': 'private-cookie', 'content-type': 'application/json' },
      body: { content },
    },
    ...extra,
  };
}

function jsonl(filePath) {
  return readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
}

test('V2 writer commits input-centric revisions and reuses unchanged semantic parts', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-writer-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    const first = writer.append(entry(
      [{ type: 'message', text: 'one' }, { type: 'message', text: 'two' }],
      [{ type: 'text', text: 'working' }],
    ), rootIdentity, { phase: 'inProgress', turnId: 'turn-1' });
    const second = writer.append(entry(
      [
        { type: 'message', text: 'one' },
        { type: 'message', text: 'two' },
        { type: 'message', text: 'three' },
      ],
      [{ type: 'text', text: 'done' }],
    ), rootIdentity, { phase: 'completed', turnId: 'turn-1' });

    assert.equal(first.seq, 1);
    assert.equal(first.entryRevision, 1);
    assert.equal(first.inputRevision, 1);
    assert.equal(second.seq, 2);
    assert.equal(second.entryRevision, 2);
    assert.equal(second.inputRevision, 2);
    assert.equal(first.entryKey, second.entryKey);

    const token = threadStoreToken('session-root');
    const threadDir = join(writer.sessionDir, 'threads', token);
    const inputRecords = jsonl(join(threadDir, 'input.jsonl'));
    assert.equal(inputRecords.length, 2);
    assert.equal(inputRecords[0].retain, 0);
    assert.equal(inputRecords[0].append.length, 2);
    assert.equal(inputRecords[1].retain, 2);
    assert.equal(inputRecords[1].remove, 0);
    assert.equal(inputRecords[1].append.length, 1);

    const entryRecords = jsonl(join(threadDir, 'entries.jsonl'));
    assert.ok(Object.keys(entryRecords[0].set).length >= 5);
    assert.deepEqual(Object.keys(entryRecords[1].set), ['response.body']);
    assert.equal(entryRecords[1].inputBinding.revision, 2);

    const timeline = jsonl(join(writer.sessionDir, 'timeline.jsonl'));
    assert.deepEqual(timeline.map((record) => record.seq), [1, 2]);
    assert.deepEqual(timeline.map((record) => record.phase), ['inProgress', 'completed']);
    assert.equal(inspectSessionArchive(writer.sessionDir).ok, true);

    const archiveText = readdirSync(writer.sessionDir, { recursive: true })
      .filter((name) => typeof name === 'string' && name.endsWith('.json'))
      .map((name) => readFileSync(join(writer.sessionDir, name), 'utf8'))
      .join('\n');
    assert.equal(archiveText.includes('secret-token'), false);
    assert.equal(archiveText.includes('private-cookie'), false);
    assert.equal(archiveText.includes('[REDACTED]'), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an entry written before a failed timeline commit remains invisible after restart', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-fault-'));
  try {
    const crashing = LogV2Writer.open(writerOptions(root, {
      faultInjector(stage) {
        if (stage === 'entry-persisted') throw new Error('simulated process death');
      },
    }));
    assert.throws(
      () => crashing.append(entry([{ type: 'message', text: 'one' }], []), rootIdentity),
      /simulated process death/,
    );
    assert.equal(inspectSessionArchive(crashing.sessionDir).committedEvents, 0);

    const restarted = LogV2Writer.open(writerOptions(root));
    const committed = restarted.append(entry([{ type: 'message', text: 'one' }], []), rootIdentity);
    assert.equal(committed.seq, 1);
    assert.equal(committed.entryRevision, 1);
    assert.equal(committed.inputRevision, 1);
    assert.equal(inspectSessionArchive(restarted.sessionDir).committedEvents, 1);

    const token = threadStoreToken('session-root');
    assert.equal(jsonl(join(restarted.sessionDir, 'threads', token, 'entries.jsonl')).length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const faultStage of ['objects-persisted', 'input-persisted', 'entry-persisted']) {
  test(`restart discards orphaned state after fault at ${faultStage}`, () => {
    const root = mkdtempSync(join(tmpdir(), `cxv-v2-fault-${faultStage}-`));
    try {
      const crashing = LogV2Writer.open(writerOptions(root, {
        faultInjector(stage) {
          if (stage === faultStage) throw new Error(`fault:${faultStage}`);
        },
      }));
      assert.throws(() => crashing.append(entry([{ type: 'message', text: 'one' }], []), rootIdentity), new RegExp(faultStage));
      assert.equal(inspectSessionArchive(crashing.sessionDir).committedEvents, 0);
      const restarted = LogV2Writer.open(writerOptions(root));
      const result = restarted.append(entry([{ type: 'message', text: 'one' }], []), rootIdentity);
      assert.equal(result.seq, 1);
      assert.equal(result.entryRevision, 1);
      assert.equal(result.inputRevision, 1);
      assert.equal(inspectSessionArchive(restarted.sessionDir).ok, true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('a fault after timeline commit remains visible and restart continues at the next sequence', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-fault-committed-'));
  try {
    const crashing = LogV2Writer.open(writerOptions(root, {
      faultInjector(stage) {
        if (stage === 'timeline-committed') throw new Error('fault:timeline-committed');
      },
    }));
    assert.throws(() => crashing.append(entry([{ type: 'message', text: 'one' }], []), rootIdentity), /timeline-committed/);
    assert.equal(inspectSessionArchive(crashing.sessionDir).committedEvents, 1);
    const restarted = LogV2Writer.open(writerOptions(root));
    const result = restarted.append(entry([{ type: 'message', text: 'two' }], [], {
      timestamp: '2026-07-14T08:02:00.000Z',
    }), rootIdentity);
    assert.equal(result.seq, 2);
    assert.equal(inspectSessionArchive(restarted.sessionDir).committedEvents, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('restart truncates an incomplete timeline tail and resumes its logical sequence', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-tail-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    writer.append(entry([{ type: 'message', text: 'one' }], []), rootIdentity);
    const timeline = join(writer.sessionDir, 'timeline.jsonl');
    const committedBytes = statSync(timeline).size;
    appendFileSync(timeline, '{"partial":');

    const restarted = LogV2Writer.open(writerOptions(root));
    assert.equal(restarted.recovery.repairedTimeline, true);
    assert.equal(restarted.recovery.committedRecords, 1);
    assert.equal(statSync(timeline).size, committedBytes);
    const next = restarted.append(entry([{ type: 'message', text: 'one' }], ['done'], {
      timestamp: '2026-07-14T08:02:00.000Z',
    }), rootIdentity);
    assert.equal(next.seq, 2);
    assert.equal(inspectSessionArchive(restarted.sessionDir).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('separate child threads share one session timeline but keep distinct input streams', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-child-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    const child = resolveAppServerThreadIdentity({
      id: 'child-thread',
      sessionId: 'session-root',
      parentThreadId: 'session-root',
    });
    writer.append(entry([{ type: 'message', text: 'root' }], []), rootIdentity);
    writer.append(entry([{ type: 'message', text: 'child' }], [], {
      timestamp: '2026-07-14T08:02:00.000Z',
    }), child);
    const report = inspectSessionArchive(writer.sessionDir);
    assert.equal(report.committedEvents, 2);
    assert.equal(report.threadCount, 2);
    assert.equal(readdirSync(join(writer.sessionDir, 'threads')).length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a clear lifecycle creates a new session archive instead of rotating the old archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-clear-'));
  try {
    const first = LogV2Writer.open(writerOptions(root));
    first.append(entry([], []), rootIdentity);
    const secondIdentity = resolveAppServerThreadIdentity({ id: 'session-after-clear', sessionId: 'session-after-clear' });
    const second = LogV2Writer.open({
      ...writerOptions(root),
      sessionId: 'session-after-clear',
      rootThreadId: 'session-after-clear',
      createdAt: '2026-07-14T09:00:00.000Z',
      startReason: 'clear',
      previousSessionId: 'session-root',
      replacesSessionId: 'session-root',
    });
    second.append(entry([], [], { timestamp: '2026-07-14T09:01:00.000Z' }), secondIdentity);

    assert.notEqual(first.sessionDir, second.sessionDir);
    assert.equal(inspectSessionArchive(first.sessionDir).committedEvents, 1);
    assert.equal(inspectSessionArchive(second.sessionDir).committedEvents, 1);
    const manifest = JSON.parse(readFileSync(join(second.sessionDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.sessionSeq, 2);
    assert.equal(manifest.startReason, 'clear');
    assert.equal(manifest.replacesSessionId, 'session-root');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('offline inspection detects a corrupted referenced content object', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-corrupt-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    writer.append(entry([{ type: 'message', text: 'one' }], []), rootIdentity);
    const token = threadStoreToken('session-root');
    const inputRecord = jsonl(join(writer.sessionDir, 'threads', token, 'input.jsonl'))[0];
    writeFileSync(join(writer.sessionDir, inputRecord.append[0].path), '{"tampered":true}\n');
    const report = inspectSessionArchive(writer.sessionDir);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((error) => error.includes('checksum mismatch')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('two writer instances serialize session commits and refresh stale in-memory state', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-two-writers-'));
  try {
    const first = LogV2Writer.open(writerOptions(root));
    const second = LogV2Writer.open(writerOptions(root));
    assert.equal(first.append(entry([], []), rootIdentity).seq, 1);
    assert.equal(second.append(entry([], [], { timestamp: '2026-07-14T08:02:00.000Z' }), rootIdentity).seq, 2);
    assert.equal(first.append(entry([], [], { timestamp: '2026-07-14T08:03:00.000Z' }), rootIdentity).seq, 3);
    const report = inspectSessionArchive(first.sessionDir);
    assert.equal(report.ok, true);
    assert.equal(report.committedEvents, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer rechecks the migration marker after acquiring the append lock', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-marker-race-'));
  let injectMarker = false;
  try {
    const writer = LogV2Writer.open(writerOptions(root, {
      faultInjector(stage) {
        if (injectMarker && stage === 'append-lock-acquired') {
          writeFileSync(join(root, '.log-v2-layout-migration.active'), JSON.stringify({ pid: process.pid }));
        }
      },
    }));
    injectMarker = true;
    assert.throws(
      () => writer.append(entry([], []), rootIdentity),
      error => error.code === 'CXV_LOG_LAYOUT_MIGRATING',
    );
    assert.equal(inspectSessionArchive(writer.sessionDir).committedEvents, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer rechecks the migration marker after acquiring the project lock', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-project-marker-race-'));
  try {
    assert.throws(() => LogV2Writer.open(writerOptions(root, {
      faultInjector(stage) {
        if (stage === 'project-lock-acquired') {
          writeFileSync(join(root, '.log-v2-layout-migration.active'), JSON.stringify({ pid: process.pid }));
        }
      },
    })), error => error.code === 'CXV_LOG_LAYOUT_MIGRATING');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
