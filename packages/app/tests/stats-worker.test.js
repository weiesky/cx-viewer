import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

import { scan } from '../lib/stats-worker.js';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { deleteLogFiles } from '../lib/log-management.js';

test('project stats are derived exclusively from V2 archives', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-stats-'));
  try {
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
      body: { model: 'gpt-test', input: [{ role: 'user', content: 'hello' }] },
      response: { status: 200, body: { usage: {
        input_tokens: 10,
        output_tokens: 4,
        input_tokens_details: { cached_tokens: 6, cache_write_tokens: 2 },
      } } },
    }, resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }));

    const other = LogV2Writer.open({
      rootDir: root, projectId: 'other', canonicalCwd: '/workspace/other',
      sessionId: 'other-session', rootThreadId: 'other-session',
    });
    other.append({
      timestamp: '2026-07-20T00:00:01.000Z', url: 'codex://turn', method: 'POST',
      mainAgent: true, body: { input: [{ role: 'user', content: 'other' }] },
    }, resolveAppServerThreadIdentity({ id: 'other-session', sessionId: 'other-session' }));

    assert.deepEqual(scan(root, 'project'), ['project']);
    assert.equal(existsSync(join(root, 'v2-stats', 'other.json')), false);
    const stats = JSON.parse(readFileSync(join(root, 'v2-stats', 'project.json'), 'utf8'));
    assert.equal(stats._v, 2);
    assert.equal(stats.summary.requestCount, 1);
    assert.equal(stats.summary.sessionCount, 1);
    assert.equal(stats.summary.input_tokens, 10);
    assert.equal(stats.summary.output_tokens, 4);
    assert.equal(stats.summary.cache_read_tokens, 6);
    assert.equal(stats.summary.cache_write_tokens, 2);
    assert.deepEqual(stats.models, { 'gpt-test': 1 });
    const file = Object.values(stats.files)[0];
    assert.equal(file.summary.requestCount, 1);
    assert.deepEqual(file.models['gpt-test'], {
      count: 1,
      input_tokens: 10,
      output_tokens: 4,
      cache_read_tokens: 6,
      cache_write_tokens: 2,
    });
    const locator = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/');
    assert.deepEqual(deleteLogFiles(root, [locator]), [{ file: locator, ok: true }]);
    scan(root, 'project');
    assert.equal(existsSync(join(root, 'v2-stats', 'project.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
