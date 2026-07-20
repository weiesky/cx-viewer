import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { streamImLogEntries } from '../lib/im-log-stream.js';

test('IM log streaming preserves UTF-8 split across the 1 MiB read boundary', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-im-stream-'));
  try {
    const file = join(root, 'log.jsonl');
    const first = `${'a'.repeat(1024 * 1024 - 1)}中`;
    writeFileSync(file, `${first}\n---\n{}`);
    const entries = [];
    await streamImLogEntries(file, value => entries.push(value));
    assert.equal(entries[0], first);
    assert.equal(entries[0].includes('�'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
