import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  countUntrackedLines,
  getGitWorkingTreeLineStats,
  parseGitNumstat,
} from '../lib/git-change-stats.js';

test('parseGitNumstat aggregates text changes and ignores binary markers', () => {
  assert.deepEqual(parseGitNumstat('12\t3\ta.js\n-\t-\timage.png\n4\t0\told => new\n'), {
    insertions: 16,
    deletions: 3,
  });
});

test('countUntrackedLines counts text lines, skips binary files, and reports caps', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-git-untracked-stats-'));
  try {
    writeFileSync(join(root, 'text.txt'), 'one\ntwo');
    writeFileSync(join(root, 'binary.bin'), Buffer.from([1, 0, 2]));
    assert.deepEqual(countUntrackedLines(root, ['text.txt', 'binary.bin']), { insertions: 2, capped: false });
    assert.deepEqual(
      countUntrackedLines(root, ['text.txt'], { maxFileBytes: 3, maxTotalBytes: 3 }),
      { insertions: 1, capped: true },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('getGitWorkingTreeLineStats combines tracked and untracked line changes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-git-working-tree-stats-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'cxv@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'CX Viewer Test'], { cwd: root });
    writeFileSync(join(root, 'tracked.txt'), 'alpha\nbeta\n');
    execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'base'], { cwd: root });

    writeFileSync(join(root, 'tracked.txt'), 'alpha\ngamma\ndelta\n');
    writeFileSync(join(root, 'new.txt'), 'new one\nnew two\n');
    assert.deepEqual(await getGitWorkingTreeLineStats(root, ['new.txt']), {
      insertions: 4,
      deletions: 1,
      insertions_capped: false,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
