import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { rotateLogFile } from '../lib/interceptor-core.js';

test('log rotation happens before the next record crosses the size limit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-log-rotation-'));
  const current = join(dir, 'current.jsonl');
  const next = join(dir, 'next.jsonl');
  try {
    writeFileSync(current, 'x'.repeat(80));
    const result = rotateLogFile(current, next, 100, 25);
    assert.equal(result.rotated, true);
    assert.equal(result.newFile, next);
    assert.equal(existsSync(next), true);
    assert.equal(statSync(next).size, 0);
    assert.equal(readFileSync(current, 'utf8'), `${'x'.repeat(80)}\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('log rotation stays on the current file below the projected limit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-log-no-rotation-'));
  const current = join(dir, 'current.jsonl');
  const next = join(dir, 'next.jsonl');
  try {
    writeFileSync(current, 'x'.repeat(80));
    assert.deepEqual(rotateLogFile(current, next, 100, 19), { rotated: false });
    assert.equal(existsSync(next), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a single oversized record is kept intact in an empty log', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-log-oversized-record-'));
  const current = join(dir, 'current.jsonl');
  const next = join(dir, 'next.jsonl');
  try {
    writeFileSync(current, '');
    assert.deepEqual(rotateLogFile(current, next, 100, 150), { rotated: false });
    assert.equal(existsSync(next), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
