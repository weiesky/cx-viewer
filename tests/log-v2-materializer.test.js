import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, copyFileSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

import { sanitizeEntryForV2 } from '../lib/log-v2/entry-codec.js';
import { resolveAppServerThreadIdentity, threadStoreToken } from '../lib/log-v2/identity.js';
import { isMainAgent } from '../src/utils/contentFilter.js';
import {
  countV2LogEntries,
  findActiveV2SessionFile,
  findActiveV2SessionFileAsync,
  findLatestV2SessionFile,
  getActiveV2SessionLookupStats,
  getActiveV2SessionSelectionStats,
  listV2LocalLogs,
  materializeSessionArchive,
  readV2LogEntries,
  readV2PagedEntries,
  readV2PagedEntriesAsync,
  streamV2LogEntries,
  summarizeV2SessionArchive,
} from '../lib/log-v2/materializer.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import {
  readSessionSummary,
  rebuildSessionSummary,
  summaryBaseBytes,
  writeSessionSummary,
} from '../lib/log-v2/session-summary.js';

function options(rootDir) {
  return {
    rootDir,
    projectId: 'project',
    canonicalCwd: '/workspace/project',
    sessionId: 'session-root',
    rootThreadId: 'session-root',
    createdAt: '2026-07-14T08:00:00.000Z',
  };
}

function entry(timestamp, input, text, extra = {}) {
  const normalizedInput = input.map((item) => (
    item?.type === 'message' && item.role == null ? { ...item, role: 'user' } : item
  ));
  return {
    timestamp,
    url: 'codex://event/turn',
    method: 'POST',
    headers: { Authorization: 'Bearer private', Accept: 'application/json' },
    body: { metadata: { turn_id: 'turn-1' }, input: normalizedInput, model: 'gpt-5' },
    response: {
      status: 200,
      headers: { 'set-cookie': 'secret', 'content-type': 'application/json' },
      body: { content: [{ type: 'text', text }] },
    },
    ...extra,
  };
}

test('V2 materializer reconstructs full safe entry revisions in commit order', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-read-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' });
    const first = entry('2026-07-14T08:01:00.000Z', [{ type: 'message', text: 'one' }], 'working');
    const second = entry('2026-07-14T08:01:00.000Z', [
      { type: 'message', text: 'one' },
      { type: 'message', text: 'two' },
    ], 'done');
    writer.append(first, identity, { phase: 'inProgress' });
    writer.append(second, identity, { phase: 'completed' });

    const result = materializeSessionArchive(writer.sessionDir);
    assert.equal(result.committedEvents, 2);
    assert.deepEqual(result.entries, [sanitizeEntryForV2(first), sanitizeEntryForV2(second)]);
    assert.equal(result.entries[1].headers.Authorization, '[REDACTED]');
    assert.equal(result.entries[1].response.headers['set-cookie'], '[REDACTED]');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 materializer keeps per-thread input revision state isolated', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-read-threads-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const rootIdentity = resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' });
    const childIdentity = resolveAppServerThreadIdentity({
      id: 'child-thread', sessionId: 'session-root', parentThreadId: 'session-root',
    });
    const rootEntry = entry('2026-07-14T08:01:00.000Z', [{ type: 'message', text: 'root' }], 'root');
    const childEntry = entry('2026-07-14T08:02:00.000Z', [{ type: 'message', text: 'child' }], 'child');
    writer.append(rootEntry, rootIdentity);
    writer.append(childEntry, childIdentity);
    assert.deepEqual(materializeSessionArchive(writer.sessionDir).entries, [
      sanitizeEntryForV2(rootEntry), sanitizeEntryForV2(childEntry),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 reader ignores an incomplete timeline tail but rejects committed-reference corruption', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-read-corrupt-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' });
    writer.append(entry('2026-07-14T08:01:00.000Z', [{ type: 'message', text: 'one' }], 'done'), identity);
    const timeline = join(writer.sessionDir, 'timeline.jsonl');
    appendFileSync(timeline, '{"partial":');
    const tail = materializeSessionArchive(writer.sessionDir);
    assert.equal(tail.committedEvents, 1);
    assert.equal(tail.ignoredTailBytes, 11);
    assert.match(tail.error, /incomplete JSONL tail/);

    writeFileSync(timeline, `${readFileSync(timeline, 'utf8').split('\n')[0]}\n`);
    const token = threadStoreToken('session-root');
    const inputRecord = JSON.parse(readFileSync(join(writer.sessionDir, 'threads', token, 'input.jsonl'), 'utf8').trim());
    writeFileSync(join(writer.sessionDir, inputRecord.append[0].path), '{"tampered":true}\n');
    assert.throws(() => materializeSessionArchive(writer.sessionDir), (error) => {
      assert.equal(error.code, 'CXV_LOG_V2_CORRUPT');
      return /checksum mismatch/.test(error.message);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 discovery and service adapters expose deduped restart-readable sessions', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-discovery-'));
  try {
    const writer = LogV2Writer.open(options(root));
    const identity = resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' });
    writer.append(entry('2026-07-14T08:01:00.000Z', [{ type: 'message', text: 'hello' }], 'working'), identity);
    writer.append(entry('2026-07-14T08:01:00.000Z', [{ type: 'message', text: 'hello' }], 'done'), identity);
    writer.append(entry('2026-07-14T08:02:00.000Z', [{ type: 'message', text: 'next' }], 'next'), identity);

    const listed = listV2LocalLogs(root, 'project');
    assert.equal(listed.project.length, 1);
    assert.equal(listed.project[0].logStore, 'v2');
    assert.deepEqual(listed.project[0].preview, ['hello', 'next']);
    assert.ok(listed.project[0].size > statSync(join(writer.sessionDir, 'timeline.jsonl')).size);
    const file = listed.project[0].file;
    assert.equal(file, relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
    assert.equal(readV2LogEntries(root, file).length, 2);

    const streamed = [];
    let ready = null;
    await streamV2LogEntries(root, file, (raw) => streamed.push(JSON.parse(raw)), {
      onReady(info) { ready = info; },
    });
    assert.equal(ready.totalCount, 2);
    assert.deepEqual(streamed.map((value) => value.response.body.content[0].text), ['done', 'next']);

    const scanned = [];
    const limited = [];
    let limitedReady = null;
    await streamV2LogEntries(root, file, (raw) => limited.push(JSON.parse(raw)), {
      limit: 1,
      onScan(raw) { scanned.push(JSON.parse(raw)); },
      onReady(info) { limitedReady = info; },
    });
    assert.equal(limitedReady.totalCount, 2);
    assert.equal(limitedReady.hasMore, true);
    assert.deepEqual(scanned.map((value) => value.response.body.content[0].text), ['done', 'next']);
    assert.deepEqual(limited.map((value) => value.response.body.content[0].text), ['next']);

    const page = readV2PagedEntries(root, file, { before: '2026-07-14T08:03:00.000Z', limit: 1 });
    assert.equal(page.count, 1);
    assert.equal(JSON.parse(page.entries[0]).response.body.content[0].text, 'next');
    assert.equal(page.hasMore, true);
    assert.deepEqual(await readV2PagedEntriesAsync(root, file, {
      before: '2026-07-14T08:03:00.000Z',
      limit: 1,
    }), page);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 log picker summarizes large sessions without materializing later content objects', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-list-summary-'));
  try {
    const writer = LogV2Writer.open({
      ...options(root),
      sessionId: 'large-list-session',
      rootThreadId: 'large-list-session',
      durability: 'buffered',
    });
    const identity = resolveAppServerThreadIdentity({
      id: 'large-list-session',
      sessionId: 'large-list-session',
    });
    for (let index = 0; index < 80; index++) {
      writer.append(entry(
        new Date(Date.parse('2026-07-14T08:00:00.000Z') + index * 1000).toISOString(),
        [{ type: 'message', text: `message-${index}` }],
        `response-${index}`,
      ), identity);
    }

    // Damage an object referenced well after the bounded preview prefix. The
    // picker must remain a metadata operation; opening the session is where
    // full committed-reference validation belongs.
    const token = threadStoreToken('large-list-session');
    const inputLines = readFileSync(join(writer.sessionDir, 'threads', token, 'input.jsonl'), 'utf8').trim().split('\n');
    const lastInput = JSON.parse(inputLines.at(-1));
    writeFileSync(join(writer.sessionDir, lastInput.append[0].path), '{"tampered":true}\n');

    const summary = summarizeV2SessionArchive(writer.sessionDir);
    assert.equal(summary.committedEvents, 80);
    assert.equal(summary.turns, 1);
    assert.deepEqual(summary.previews, Array.from({ length: 80 }, (_, index) => `message-${index}`));

    const listed = listV2LocalLogs(root, 'project');
    assert.equal(listed.project.length, 1);
    assert.equal(listed.project[0].degraded, false);
    assert.deepEqual(listed.project[0].preview, Array.from({ length: 80 }, (_, index) => `message-${index}`));
    assert.equal(countV2LogEntries(root, listed.project[0].file), 80);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 cold-start lookup restores the durable latest session before any new write', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-latest-session-'));
  try {
    const first = LogV2Writer.open({ ...options(root), sessionId: 'session-one', rootThreadId: 'session-one' });
    first.append(
      entry('2026-07-14T08:01:00.000Z', [{ type: 'message', text: 'first' }], 'first'),
      resolveAppServerThreadIdentity({ id: 'session-one', sessionId: 'session-one' }),
    );
    const second = LogV2Writer.open({
      ...options(root),
      sessionId: 'session-two',
      rootThreadId: 'session-two',
      createdAt: '2026-07-14T09:00:00.000Z',
    });
    const secondEntry = entry('2026-07-14T09:01:00.000Z', [{ type: 'message', text: 'second' }], 'second');
    secondEntry.mainAgent = true;
    secondEntry.subAgent = false;
    secondEntry.body.instructions = 'You are Codex. You may delegate work to a general-purpose subagent.';
    second.append(
      secondEntry,
      resolveAppServerThreadIdentity({ id: 'session-two', sessionId: 'session-two' }),
    );
    const corrupt = LogV2Writer.open({
      ...options(root),
      sessionId: 'session-corrupt',
      rootThreadId: 'session-corrupt',
      createdAt: '2026-07-14T11:00:00.000Z',
    });
    corrupt.append(
      entry('2026-07-14T11:01:00.000Z', [{ type: 'message', text: 'corrupt' }], 'corrupt'),
      resolveAppServerThreadIdentity({ id: 'session-corrupt', sessionId: 'session-corrupt' }),
    );
    const corruptInput = JSON.parse(readFileSync(join(
      corrupt.sessionDir,
      'threads',
      threadStoreToken('session-corrupt'),
      'input.jsonl',
    ), 'utf8').trim());
    writeFileSync(join(corrupt.sessionDir, corruptInput.append[0].path), '{"tampered":true}\n');
    const global = LogV2Writer.open({
      ...options(root),
      sessionId: 'synthetic-global',
      rootThreadId: 'synthetic-global',
      source: 'app-server-global',
      createdAt: '2026-07-14T12:00:00.000Z',
    });
    global.append(
      { ...entry('2026-07-14T12:01:00.000Z', [], 'warning'), mainAgent: false },
      { sessionId: 'synthetic-global', threadId: 'synthetic-global', isRoot: true, agentRole: 'auxiliary' },
    );
    // Simulate the bad pointer written by pre-fix builds: the newest archive
    // is a global warning lane with no renderable root conversation.
    const projectManifest = JSON.parse(readFileSync(second.projectManifestPath, 'utf8'));
    writeFileSync(second.projectManifestPath, `${JSON.stringify({
      ...projectManifest,
      latestSessionId: 'synthetic-global',
      updatedAt: '2026-07-14T12:01:00.000Z',
    })}\n`);

    const before = getActiveV2SessionSelectionStats();
    const selected = findLatestV2SessionFile(root, { projectId: 'project', canonicalCwd: '/workspace/project' });
    const after = getActiveV2SessionSelectionStats();
    assert.equal(selected, relative(root, join(second.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
    assert.equal(readV2LogEntries(root, selected).some(isMainAgent), true);
    assert.equal(after.latestPointerHits - before.latestPointerHits, 0);
    assert.equal(after.slowFallbacks - before.slowFallbacks, 1);
    assert.equal(after.rootActivityScans - before.rootActivityScans, 0,
      'native app-server manifests provide the root-lane proof');
    assert.ok(after.materializedHealthScans > before.materializedHealthScans);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('active V2 selector trusts the runtime conversation locator without scanning its timeline', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-runtime-pointer-'));
  try {
    const writer = LogV2Writer.open(options(root));
    writer.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'one' }], 'one'),
      resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
    );
    writer.markProjectLatest({ source: 'app-server' });
    const before = getActiveV2SessionSelectionStats();
    const selected = findActiveV2SessionFile(root, {
      runtime: {
        config: { writeMode: 'v2' },
        writer: { lastConversationLocator: { sessionId: 'session-root' } },
      },
      projectId: 'project',
      canonicalCwd: '/workspace/project',
    });
    const after = getActiveV2SessionSelectionStats();
    assert.equal(selected, relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
    assert.equal(after.runtimePointerHits - before.runtimePointerHits, 1);
    assert.equal(after.rootActivityScans - before.rootActivityScans, 0);
    assert.equal(after.materializedHealthScans - before.materializedHealthScans, 0);
    assert.equal(after.slowFallbacks - before.slowFallbacks, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('durable latest pointer caches its root-main proof without a full health scan', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-latest-pointer-'));
  try {
    const writer = LogV2Writer.open(options(root));
    writer.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'one' }], 'one'),
      resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
    );
    writer.markProjectLatest({ source: 'app-server' });
    const before = getActiveV2SessionSelectionStats();
    const selected = findLatestV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project',
    });
    const after = getActiveV2SessionSelectionStats();
    assert.equal(selected, relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
    assert.equal(after.latestPointerHits - before.latestPointerHits, 1);
    assert.equal(after.rootActivityScans - before.rootActivityScans, 0);
    assert.equal(after.materializedHealthScans - before.materializedHealthScans, 0);
    assert.equal(after.slowFallbacks - before.slowFallbacks, 0);
    const cachedBefore = getActiveV2SessionSelectionStats();
    assert.equal(findLatestV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project',
    }), selected);
    const cachedAfter = getActiveV2SessionSelectionStats();
    assert.equal(cachedAfter.rootActivityScans - cachedBefore.rootActivityScans, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('durable root proof cache invalidates when a derived summary is repaired', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-summary-repair-'));
  try {
    const writer = LogV2Writer.open(options(root));
    writer.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'root' }], 'root'),
      resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
    );
    writer.markProjectLatest({ source: 'app-server' });
    const summary = readSessionSummary(writer.sessionDir);
    writeSessionSummary(writer.sessionDir, {
      ...summary,
      rootMainEvents: 0,
      lastRootMainActivity: null,
    }, { baseBytes: summaryBaseBytes(summary) });
    assert.equal(findLatestV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project',
    }), null);
    rebuildSessionSummary(writer.sessionDir);
    assert.equal(findLatestV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project',
    }), relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('durable latest pointer cannot silently select an auxiliary-only non-global archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-aux-pointer-'));
  try {
    const healthy = LogV2Writer.open({
      ...options(root), sessionId: 'healthy-root', rootThreadId: 'healthy-root',
    });
    healthy.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'healthy' }], 'healthy'),
      resolveAppServerThreadIdentity({ id: 'healthy-root', sessionId: 'healthy-root' }),
    );
    const auxiliary = LogV2Writer.open({
      ...options(root), sessionId: 'aux-only', rootThreadId: 'aux-only', source: 'app-server',
      createdAt: '2026-07-14T09:00:00.000Z',
    });
    auxiliary.append(
      { ...entry('2026-07-14T09:01:00.000Z', [], 'aux'), mainAgent: false },
      { sessionId: 'aux-only', threadId: 'aux-only', isRoot: true, agentRole: 'auxiliary' },
    );
    const project = JSON.parse(readFileSync(auxiliary.projectManifestPath, 'utf8'));
    writeFileSync(auxiliary.projectManifestPath, `${JSON.stringify({
      ...project,
      latestSessionId: 'aux-only',
      updatedAt: '2026-07-14T09:01:00.000Z',
    })}\n`);
    assert.equal(findLatestV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project',
    }), relative(root, join(healthy.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('durable fallback orders sessions by the last root-main activity from summary', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-summary-activity-'));
  try {
    const resumed = LogV2Writer.open({
      ...options(root), sessionId: 'older-resumed', rootThreadId: 'older-resumed',
      createdAt: '2026-07-14T08:00:00.000Z',
    });
    resumed.append(
      entry('2026-07-14T10:00:00.000Z', [{ type: 'message', text: 'latest activity' }], 'latest'),
      resolveAppServerThreadIdentity({ id: 'older-resumed', sessionId: 'older-resumed' }),
    );
    const newer = LogV2Writer.open({
      ...options(root), sessionId: 'newer-idle', rootThreadId: 'newer-idle',
      createdAt: '2026-07-14T09:00:00.000Z',
    });
    newer.append(
      entry('2026-07-14T09:01:00.000Z', [{ type: 'message', text: 'older activity' }], 'older'),
      resolveAppServerThreadIdentity({ id: 'newer-idle', sessionId: 'newer-idle' }),
    );
    assert.equal(findLatestV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project',
    }), relative(root, join(resumed.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('strong durable proof rejects an equal-size timeline rewrite before forced recovery', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-corrupt-pointer-'));
  try {
    const healthy = LogV2Writer.open({
      ...options(root), sessionId: 'healthy-session', rootThreadId: 'healthy-session',
    });
    healthy.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'healthy' }], 'healthy'),
      resolveAppServerThreadIdentity({ id: 'healthy-session', sessionId: 'healthy-session' }),
    );
    const broken = LogV2Writer.open({
      ...options(root), sessionId: 'broken-session', rootThreadId: 'broken-session',
      createdAt: '2026-07-14T09:00:00.000Z',
    });
    const brokenIdentity = resolveAppServerThreadIdentity({ id: 'broken-session', sessionId: 'broken-session' });
    for (let index = 0; index < 3; index++) {
      broken.append(
        entry(`2026-07-14T09:0${index}:00.000Z`, [{ type: 'message', text: `broken-${index}` }], `broken-${index}`),
        brokenIdentity,
      );
    }
    broken.markProjectLatest({ source: 'app-server' });
    const healthyFile = relative(root, join(healthy.sessionDir, 'timeline.jsonl')).split(sep).join('/');
    const timelinePath = join(broken.sessionDir, 'timeline.jsonl');
    const lines = readFileSync(timelinePath, 'utf8').trimEnd().split('\n');
    lines[1] = '{"broken":true}'.padEnd(lines[1].length, ' ');
    writeFileSync(timelinePath, `${lines.join('\n')}\n`);

    assert.equal(findLatestV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project',
    }), healthyFile, 'strong summary identity must reject the rewritten timeline');
    const before = getActiveV2SessionSelectionStats();
    assert.equal(findActiveV2SessionFile(root, {
      projectId: 'project', canonicalCwd: '/workspace/project', forceHealthyScan: true,
    }), healthyFile);
    const after = getActiveV2SessionSelectionStats();
    assert.equal(after.slowFallbacks - before.slowFallbacks, 1);
    assert.ok(after.rootActivityScans > before.rootActivityScans);
    assert.ok(after.materializedHealthScans > before.materializedHealthScans);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('active V2 selector falls back to V1 instead of choosing an auxiliary legacy-linked archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-aux-only-'));
  try {
    const writer = LogV2Writer.open({
      ...options(root),
      sessionId: 'synthetic-global-only',
      rootThreadId: 'synthetic-global-only',
      source: 'app-server-global',
    });
    writer.append(
      { ...entry('2026-07-14T08:01:00.000Z', [], 'warning'), mainAgent: false },
      { sessionId: 'synthetic-global-only', threadId: 'synthetic-global-only', isRoot: true, agentRole: 'auxiliary' },
      { legacyRef: { logFile: 'project/legacy.jsonl', offset: 0, length: 100 } },
    );
    assert.equal(findActiveV2SessionFile(root, {
      runtime: {
        config: { writeMode: 'v2' },
        writer: {
          lastLocator: { sessionId: 'synthetic-global-only' },
          lastConversationLocator: { sessionId: 'synthetic-global-only' },
        },
      },
      projectId: 'project',
      canonicalCwd: '/workspace/project',
      legacyLogFile: 'project/legacy.jsonl',
    }), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('concurrent active V2 discovery shares one worker scan and caches the result', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-singleflight-'));
  try {
    const writer = LogV2Writer.open(options(root));
    writer.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'one' }], 'one'),
      resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
    );
    const lookupOptions = { projectId: 'project', canonicalCwd: '/workspace/project' };
    const before = getActiveV2SessionLookupStats();
    const values = await Promise.all(Array.from(
      { length: 12 },
      () => findActiveV2SessionFileAsync(root, lookupOptions),
    ));
    const after = getActiveV2SessionLookupStats();
    assert.equal(new Set(values).size, 1);
    assert.equal(after.started - before.started, 1);
    assert.equal(after.reused - before.reused, 11);
    assert.equal(await findActiveV2SessionFileAsync(root, lookupOptions), values[0]);
    assert.equal(getActiveV2SessionLookupStats().started, after.started);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the same readable project id fails fast when it is already bound to another cwd', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-project-identity-'));
  try {
    const writer = LogV2Writer.open({ ...options(root), canonicalCwd: '/workspace/one' });
    writer.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'one' }], 'one'),
      resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
    );
    assert.throws(() => LogV2Writer.open({ ...options(root), canonicalCwd: '/workspace/two' }), (error) => {
      assert.equal(error.code, 'CXV_LOG_PROJECT_ID_COLLISION');
      return /project id collision/.test(error.message);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 readers reject symlinked authoritative metadata', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-symlink-metadata-'));
  try {
    const writer = LogV2Writer.open(options(root));
    writer.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'one' }], 'one'),
      resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
    );
    const manifestPath = join(writer.sessionDir, 'manifest.json');
    const externalManifest = join(root, 'external-manifest.json');
    writeFileSync(externalManifest, readFileSync(manifestPath));
    rmSync(manifestPath);
    try {
      symlinkSync(externalManifest, manifestPath);
    } catch (error) {
      if (error?.code === 'EPERM' || error?.code === 'EACCES') {
        t.skip('symbolic links are unavailable in this environment');
        return;
      }
      throw error;
    }
    assert.throws(() => readV2LogEntries(
      root,
      relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/'),
    ), /Access denied|unsafe V2 JSON file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 readers reject symlinked thread records and content objects', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-symlink-content-'));
  try {
    const writer = LogV2Writer.open(options(root));
    writer.append(
      entry('2026-07-14T08:00:00.000Z', [{ type: 'message', text: 'one' }], 'one'),
      resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
    );
    const locator = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/');
    const token = threadStoreToken('session-root');
    const entriesPath = join(writer.sessionDir, 'threads', token, 'entries.jsonl');
    const entryRecord = JSON.parse(readFileSync(entriesPath, 'utf8').trim());
    const objectPath = join(writer.sessionDir, Object.values(entryRecord.set)[0].path);

    const assertSymlinkRejected = (target, label) => {
      const external = join(root, `external-${label}`);
      copyFileSync(target, external);
      rmSync(target);
      try {
        symlinkSync(external, target);
      } catch (error) {
        if (error?.code === 'EPERM' || error?.code === 'EACCES') {
          t.skip('symbolic links are unavailable in this environment');
          return false;
        }
        throw error;
      }
      assert.throws(() => readV2LogEntries(root, locator), /unsafe V2 file|ELOOP/);
      rmSync(target);
      copyFileSync(external, target);
      return true;
    };

    if (!assertSymlinkRejected(objectPath, 'object.json')) return;
    assertSymlinkRejected(entriesPath, 'entries.jsonl');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
