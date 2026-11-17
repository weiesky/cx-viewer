import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, linkSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deleteLegacyTerminalHistory, inventoryLegacyTerminalHistory } from '../lib/legacy-terminal-history.js';

test('legacy terminal history cleanup is exact, dry-run by default, and revalidates a staged entry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-legacy-terminal-'));
  try {
    const target = join(dir, 'terminal-history-1.log');
    const similar = join(dir, 'terminal-history-x.log');
    const linked = join(dir, 'terminal-history-2.log');
    const symlink = join(dir, 'terminal-history-3.log');
    writeFileSync(target, 'sensitive');
    writeFileSync(similar, 'keep');
    linkSync(target, linked);
    let symlinkCreated = false;
    try {
      symlinkSync(similar, symlink);
      symlinkCreated = true;
    } catch (error) {
      if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error?.code)) throw error;
    }

    let plan = inventoryLegacyTerminalHistory({ dir });
    assert.equal(plan.files.length, 0, 'hard-linked and symlinked candidates are rejected');
    if (symlinkCreated) {
      assert.equal(plan.skipped.some(item => item.path === symlink), true);
    }

    rmSync(linked);
    plan = inventoryLegacyTerminalHistory({ dir });
    assert.deepEqual(plan.files.map(file => file.path), [target]);
    assert.equal(deleteLegacyTerminalHistory(plan).dryRun, true);
    assert.equal(existsSync(target), true);

    writeFileSync(target, 'changed-size');
    const refused = deleteLegacyTerminalHistory(plan, { confirm: true });
    assert.equal(refused.deleted.length, 0);
    assert.equal(existsSync(target), true);

    plan = inventoryLegacyTerminalHistory({ dir });
    writeFileSync(target, 'same-size!!!');
    const sameSizeRefused = deleteLegacyTerminalHistory(plan, { confirm: true });
    assert.equal(sameSizeRefused.deleted.length, 0, 'same-size rewrites are still detected');
    assert.equal(existsSync(target), true);

    plan = inventoryLegacyTerminalHistory({ dir });
    const stagedSwapRefused = deleteLegacyTerminalHistory(plan, {
      confirm: true,
      beforeStagedDelete({ stagedPath }) {
        writeFileSync(stagedPath, 'replacement-with-different-metadata');
      },
    });
    assert.equal(stagedSwapRefused.deleted.length, 0);
    assert.equal(existsSync(target), true);

    plan = inventoryLegacyTerminalHistory({ dir });
    const removed = deleteLegacyTerminalHistory(plan, { confirm: true });
    assert.deepEqual(removed.deleted, [target]);
    assert.equal(existsSync(similar), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
