import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  clearRawSidecarsForLog,
  deleteLogFiles,
  listRawSidecarsForLog,
  readRawSidecarFramePage,
  readRawSidecarFrames,
} from '../lib/log-management.js';

function rawRef(streamId, fromSeq = 1, toSeq = 2) {
  return {
    version: 1,
    streamId,
    threadId: 'thread-a',
    sidecar: 'thread-a.jsonl',
    fromSeq,
    toSeq,
  };
}

function entry(timestamp, ref, extra = {}) {
  return {
    timestamp,
    url: 'codex://turn',
    mainAgent: true,
    body: { input: [{ role: 'user', content: timestamp }] },
    _codexRaw: ref,
    ...extra,
  };
}

function writeEntries(file, entries) {
  writeFileSync(file, entries.map(value => `${JSON.stringify(value)}\n---\n`).join(''));
}

function frame(streamId, seq) {
  return JSON.stringify({ stream_id: streamId, seq, thread_id: 'thread-a', frame: { seq } });
}

test('raw sidecar helpers expose only bounded frames referenced by the selected log', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-raw-helper-'));
  const project = join(root, 'project');
  const raw = join(project, 'raw');
  try {
    mkdirSync(raw, { recursive: true });
    writeEntries(join(project, 'one.jsonl'), [entry('2026-01-01T00:00:00Z', rawRef('stream-a'))]);
    writeFileSync(join(raw, 'thread-a.jsonl'), [frame('stream-a', 1), frame('stream-b', 1), frame('stream-a', 2), ''].join('\n'));

    const listed = listRawSidecarsForLog(root, 'project/one.jsonl');
    assert.equal(listed.length, 1);
    assert.equal(listed[0].file, 'project/raw/thread-a.jsonl');
    const page = readRawSidecarFramePage(root, 'project/one.jsonl', rawRef('stream-a'), { limit: 1 });
    assert.deepEqual(page.frames.map(item => item.seq), [2]);
    assert.deepEqual({ truncated: page.truncated, matched: page.matched }, { truncated: true, matched: 2 });
    assert.deepEqual(readRawSidecarFrames(root, 'project/one.jsonl', rawRef('stream-a'), { limit: 1 }).map(item => item.seq), [2]);
    assert.throws(
      () => readRawSidecarFrames(root, 'project/one.jsonl', rawRef('stream-b')),
      error => error.code === 'ACCESS_DENIED',
    );
    assert.deepEqual(clearRawSidecarsForLog(root, 'project/one.jsonl'), { clearedStreams: 1, clearedFrames: 2 });
    assert.equal(readFileSync(join(raw, 'thread-a.jsonl'), 'utf8').includes('stream-a'), false);
    assert.equal(readFileSync(join(raw, 'thread-a.jsonl'), 'utf8').includes('stream-b'), true);
    assert.equal(existsSync(join(project, 'one.jsonl')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('clear and delete prune disjoint ranges that share one rotated stream', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-raw-shared-stream-ranges-'));
  const project = join(root, 'project');
  const raw = join(project, 'raw');
  const sidecar = join(raw, 'thread-a.jsonl');
  try {
    mkdirSync(raw, { recursive: true });
    writeEntries(join(project, 'one.jsonl'), [entry('2026-01-01T00:00:00Z', rawRef('stream-shared', 1, 2))]);
    writeEntries(join(project, 'two.jsonl'), [entry('2026-01-02T00:00:00Z', rawRef('stream-shared', 3, 4))]);
    writeFileSync(sidecar, [1, 2, 3, 4].map(seq => frame('stream-shared', seq)).join('\n') + '\n');

    assert.deepEqual(clearRawSidecarsForLog(root, 'project/one.jsonl'), { clearedStreams: 1, clearedFrames: 2 });
    assert.deepEqual(readFileSync(sidecar, 'utf8').trim().split('\n').map(line => JSON.parse(line).seq), [3, 4]);
    assert.deepEqual(deleteLogFiles(root, ['project/two.jsonl']), [{ file: 'project/two.jsonl', ok: true }]);
    assert.equal(existsSync(sidecar), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('raw reference scanning retains tail metadata for oversized business entries', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-raw-oversized-entry-'));
  const project = join(root, 'project');
  const raw = join(project, 'raw');
  try {
    mkdirSync(raw, { recursive: true });
    const ref = rawRef('stream-large', 7, 7);
    const largeEntry = { timestamp: '2026-01-01T00:00:00Z', payload: 'x'.repeat(17 * 1024 * 1024), _codexRaw: ref };
    writeEntries(join(project, 'large.jsonl'), [largeEntry]);
    writeFileSync(join(raw, ref.sidecar), `${frame('stream-large', 7)}\n`);
    assert.equal(listRawSidecarsForLog(root, 'project/large.jsonl').length, 1);
    assert.deepEqual(readRawSidecarFrames(root, 'project/large.jsonl', ref).map(item => item.seq), [7]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('deleting business logs prunes only raw streams no longer referenced by sibling logs', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-raw-delete-'));
  const project = join(root, 'project');
  const raw = join(project, 'raw');
  const sidecar = join(raw, 'thread-a.jsonl');
  try {
    mkdirSync(raw, { recursive: true });
    writeEntries(join(project, 'one.jsonl'), [entry('2026-01-01T00:00:00Z', rawRef('stream-a', 1, 1))]);
    writeEntries(join(project, 'two.jsonl'), [entry('2026-01-02T00:00:00Z', rawRef('stream-b', 1, 1))]);
    writeFileSync(sidecar, [frame('stream-a', 1), frame('stream-b', 1), ''].join('\n'));

    assert.deepEqual(deleteLogFiles(root, ['project/one.jsonl']), [{ file: 'project/one.jsonl', ok: true }]);
    assert.equal(readFileSync(sidecar, 'utf8').includes('stream-a'), false);
    assert.equal(readFileSync(sidecar, 'utf8').includes('stream-b'), true);

    assert.deepEqual(deleteLogFiles(root, ['project/two.jsonl']), [{ file: 'project/two.jsonl', ok: true }]);
    assert.equal(existsSync(sidecar), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
