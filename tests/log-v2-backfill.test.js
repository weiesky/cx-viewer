import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  backfillSessionSummaries,
  parseBackfillArgs,
} from '../lib/log-v2/backfill-session-summaries.js';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import { discoverV2SessionArchives } from '../lib/log-v2/materializer.js';
import {
  inspectSessionSummary,
  rebuildSessionSummary,
  SESSION_SUMMARY_FILE,
} from '../lib/log-v2/session-summary.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

test('summary backfill CLI defaults to dry-run and validates its arguments', () => {
  const parsed = parseBackfillArgs(['/tmp/logs', '--project=project-a']);
  assert.equal(parsed.logDir, '/tmp/logs');
  assert.equal(parsed.projectId, 'project-a');
  assert.equal(parsed.write, false);

  assert.equal(parseBackfillArgs(['/tmp/logs', '--write']).write, true);
  assert.throws(() => parseBackfillArgs([]), /Usage:/);
  assert.throws(() => parseBackfillArgs(['/tmp/a', '/tmp/b']), /Usage:/);
  assert.throws(() => parseBackfillArgs(['/tmp/logs', '--unknown']), /unknown option/);
  assert.throws(() => parseBackfillArgs(['/tmp/logs', '--project=']), /non-empty/);
  assert.throws(
    () => parseBackfillArgs(['/tmp/logs', '--dry-run', '--write']),
    /conflicting or duplicate/,
  );
});

test('dry-run inspects every valid archive without invoking the write API', async () => {
  const inspected = [];
  let rebuilds = 0;
  const report = await backfillSessionSummaries({
    logDir: '/tmp/log-root',
    projectId: 'project-a',
    write: false,
    discover(logDir, options) {
      assert.equal(logDir, '/tmp/log-root');
      assert.deepEqual(options, { projectId: 'project-a' });
      return {
        archives: [
          { sessionDir: '/tmp/log-root/project/20260715_current.cxvsession' },
          { sessionDir: '/tmp/log-root/project/20260715_stale.cxvsession' },
        ],
        errors: [],
      };
    },
    inspect(sessionDir) {
      inspected.push(sessionDir);
      return { current: sessionDir.endsWith('current.cxvsession') };
    },
    rebuild() {
      rebuilds++;
    },
  });

  assert.equal(rebuilds, 0);
  assert.equal(inspected.length, 2);
  assert.deepEqual(report, { scanned: 2, updated: 1, unchanged: 1, errors: [] });
});

test('write mode rebuilds stale summaries under the core lock and continues after errors', async () => {
  const calls = [];
  const progress = [];
  const report = await backfillSessionSummaries({
    logDir: '/tmp/log-root',
    write: true,
    discover() {
      return {
        archives: [
          { sessionDir: '/tmp/log-root/project/20260715_one.cxvsession' },
          { sessionDir: '/tmp/log-root/project/20260715_two.cxvsession' },
          { sessionDir: '/tmp/log-root/project/20260715_three.cxvsession' },
        ],
        errors: [{ path: 'bad/20260715_session.cxvsession', error: 'prompt must not escape' }],
      };
    },
    inspect() {
      return { needsRebuild: true };
    },
    rebuild(sessionDir, options) {
      calls.push({ sessionDir, options });
      if (sessionDir.endsWith('two.cxvsession')) {
        const error = new Error('private user prompt');
        error.code = 'CXV_LOG_V2_SUMMARY_WRITE';
        throw error;
      }
      return { updated: !sessionDir.endsWith('three.cxvsession') };
    },
    onProgress(value) {
      progress.push(value);
    },
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].options, { durable: true, lock: true });
  assert.deepEqual(report, {
    scanned: 3,
    updated: 1,
    unchanged: 1,
    errors: [
      { path: 'bad/20260715_session.cxvsession', error: 'archive discovery failed' },
      {
        path: 'project/20260715_two.cxvsession',
        error: 'summary rebuild failed (CXV_LOG_V2_SUMMARY_WRITE)',
      },
    ],
  });
  assert.equal(JSON.stringify(report).includes('private user prompt'), false);
  assert.deepEqual(progress.map((item) => item.status), ['updated', 'error', 'unchanged']);
});

test('a top-level discovery failure is reported without throwing or leaking its message', async () => {
  const report = await backfillSessionSummaries({
    logDir: '/tmp/log-root',
    discover() {
      throw new Error('secret prompt text');
    },
    inspect() {},
    rebuild() {},
  });
  assert.deepEqual(report, {
    scanned: 0,
    updated: 0,
    unchanged: 0,
    errors: [{ path: '.', error: 'archive discovery failed' }],
  });
});

test('dry-run and write modes integrate with a real V2 archive and remain idempotent', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-backfill-'));
  try {
    const writer = LogV2Writer.open({
      rootDir: root,
      projectId: 'backfill-project',
      canonicalCwd: '/workspace/backfill-project',
      sessionId: 'backfill-session',
      rootThreadId: 'backfill-session',
      createdAt: '2026-07-15T08:00:00.000Z',
      durability: 'buffered',
    });
    writer.append({
      timestamp: '2026-07-15T08:01:00.000Z',
      url: 'https://chatgpt.com/backend-api/codex/responses',
      method: 'POST',
      body: { input: [{ type: 'message', role: 'user', content: 'backfill me' }] },
      response: { status: 200, body: { content: [] } },
    }, resolveAppServerThreadIdentity({ id: 'backfill-session', sessionId: 'backfill-session' }));

    const summaryPath = join(writer.sessionDir, SESSION_SUMMARY_FILE);
    if (existsSync(summaryPath)) unlinkSync(summaryPath);
    const dependencies = {
      discover: discoverV2SessionArchives,
      inspect: inspectSessionSummary,
      rebuild: rebuildSessionSummary,
    };

    const dryRun = await backfillSessionSummaries({
      logDir: root,
      write: false,
      ...dependencies,
    });
    assert.deepEqual(dryRun, { scanned: 1, updated: 1, unchanged: 0, errors: [] });
    assert.equal(existsSync(summaryPath), false);

    const written = await backfillSessionSummaries({
      logDir: root,
      write: true,
      ...dependencies,
    });
    assert.deepEqual(written, { scanned: 1, updated: 1, unchanged: 0, errors: [] });
    assert.equal(existsSync(summaryPath), true);

    const repeated = await backfillSessionSummaries({
      logDir: root,
      write: true,
      ...dependencies,
    });
    assert.deepEqual(repeated, { scanned: 1, updated: 0, unchanged: 1, errors: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
