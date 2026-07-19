import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseJsonlFile } from '../lib/stats-worker.js';

test('project stats exclude legacy Master entries from MainAgent sessions and turns', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-stats-master-'));
  const file = join(root, 'session.jsonl');
  const entry = {
    url: 'https://api.openai.com/v1/responses',
    mainAgent: true,
    body: {
      model: 'gpt-test',
      input: [{ role: 'user', content: 'must not become a MainAgent preview' }],
    },
  };
  try {
    writeFileSync(file, JSON.stringify(entry));
    const stats = parseJsonlFile(file);
    assert.equal(stats.summary.sessionCount, 0);
    assert.equal(stats.summary.turnCount, 0);
    assert.deepEqual(stats.preview, []);
    assert.equal(stats.summary.requestCount, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
