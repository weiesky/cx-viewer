import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

import { deleteLogFiles, listRawSidecarsForLog, readRawSidecarFramePage, validateImLogPath } from '../lib/log-management.js';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { rawProjectDirectoryToken } from '../lib/log-v2/project-id.js';

function createArchive(root, ref) {
  const writer = LogV2Writer.open({
    rootDir: root,
    projectId: 'project',
    canonicalCwd: '/workspace/project',
    sessionId: 'session-root',
    rootThreadId: 'session-root',
  });
  writer.append({
    timestamp: '2026-07-20T00:00:00.000Z',
    url: 'codex://turn',
    method: 'POST',
    mainAgent: true,
    body: { input: [{ role: 'user', content: 'hello' }] },
    _codexRaw: ref,
  }, resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }));
  return relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/');
}

test('V2 raw diagnostics expose only ranges referenced by the selected archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-raw-'));
  const ref = { version: 1, streamId: 'stream-a', threadId: 'thread-a', sidecar: 'thread-a.jsonl', fromSeq: 2, toSeq: 3 };
  try {
    const file = createArchive(root, ref);
    const rawDir = join(root, 'v2-raw', rawProjectDirectoryToken('project'));
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(join(rawDir, ref.sidecar), [1, 2, 3].map(seq => JSON.stringify({ stream_id: ref.streamId, seq })).join('\n') + '\n');

    assert.equal(listRawSidecarsForLog(root, file).length, 1);
    const page = readRawSidecarFramePage(root, file, ref, { limit: 1 });
    assert.deepEqual(page.frames.map(frame => frame.seq), [3]);
    assert.deepEqual({ truncated: page.truncated, matched: page.matched }, { truncated: true, matched: 2 });
    assert.throws(
      () => readRawSidecarFramePage(root, file, { ...ref, streamId: 'other' }),
      error => error.code === 'ACCESS_DENIED',
    );

    assert.deepEqual(deleteLogFiles(root, [file], { protectedFiles: [file] }), [{ file, error: 'Active log cannot be deleted' }]);
    assert.equal(existsSync(join(root, file)), true);
    assert.deepEqual(deleteLogFiles(root, [file]), [{ file, ok: true }]);
    assert.equal(existsSync(join(root, file)), false);
    assert.equal(existsSync(join(rawDir, ref.sidecar)), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('IM logs are limited to the selected platform top-level directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-im-log-path-'));
  try {
    mkdirSync(join(root, 'dingtalk'));
    writeFileSync(join(root, 'dingtalk', 'worker.jsonl'), '{}');
    assert.equal(validateImLogPath(root, 'dingtalk', 'dingtalk/worker.jsonl'), realpathSync(join(root, 'dingtalk', 'worker.jsonl')));
    assert.throws(() => validateImLogPath(root, 'dingtalk', 'v2-raw/private.jsonl'), error => error.code === 'ACCESS_DENIED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('raw diagnostics reject non-V2 log paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-raw-reject-'));
  try {
    assert.throws(
      () => listRawSidecarsForLog(root, 'project/session.jsonl'),
      error => error.code === 'ACCESS_DENIED',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
