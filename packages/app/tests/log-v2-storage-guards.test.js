import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readJsonReferenceSync, withFileLockSync } from '../lib/log-v2/storage.js';

const DIGEST = `sha256:${'0'.repeat(64)}`;

test('JSONL references are bounded against file size before allocation', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-storage-guard-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, 'records.jsonl');
  writeFileSync(file, '{}\n');

  assert.throws(() => readJsonReferenceSync(file, {
    offset: 0,
    length: 65 * 1024 * 1024,
    checksum: DIGEST,
  }), /reference is too large/);
  assert.throws(() => readJsonReferenceSync(file, {
    offset: 100,
    length: 1,
    checksum: DIGEST,
  }), /truncated JSONL reference/);
});

test('a live lock owner is never displaced only because the lock is old', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-lock-guard-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const lock = join(root, '.append.lock');
  writeFileSync(lock, JSON.stringify({ pid: process.pid, createdAt: new Date(0).toISOString() }));
  utimesSync(lock, new Date(0), new Date(0));

  assert.throws(() => withFileLockSync(lock, () => {}, { timeoutMs: 5, staleMs: 1 }), /timed out acquiring/);
  assert.equal(existsSync(lock), true);
});

test('an old malformed lock still uses the age fallback', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-lock-fallback-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const lock = join(root, '.append.lock');
  writeFileSync(lock, 'legacy-owner');
  utimesSync(lock, new Date(0), new Date(0));

  let ran = false;
  withFileLockSync(lock, () => { ran = true; }, { timeoutMs: 20, staleMs: 1 });
  assert.equal(ran, true);
  assert.equal(existsSync(lock), false);
});

test('a stale-lock reclaim guard prevents a competing acquisition', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-lock-reclaim-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const lock = join(root, '.append.lock');
  writeFileSync(`${lock}.reclaim`, JSON.stringify({ pid: process.pid }));
  assert.throws(
    () => withFileLockSync(lock, () => {}, { timeoutMs: 5, staleMs: 1 }),
    /timed out acquiring/,
  );
  assert.equal(existsSync(`${lock}.reclaim`), true);
  assert.equal(existsSync(lock), false);
});
