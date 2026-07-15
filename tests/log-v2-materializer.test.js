import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

import { sanitizeEntryForV2 } from '../lib/log-v2/entry-codec.js';
import { resolveAppServerThreadIdentity, threadStoreToken } from '../lib/log-v2/identity.js';
import { isMainAgent } from '../src/utils/contentFilter.js';
import {
  countV2LogEntries,
  findActiveV2SessionFile,
  findLatestV2SessionFile,
  findV2SessionFileBySessionId,
  listV2LocalLogs,
  materializeSessionArchive,
  readV2LogEntries,
  readV2PagedEntries,
  readV2PagedEntriesAsync,
  streamV2LogEntries,
  summarizeV2SessionArchive,
} from '../lib/log-v2/materializer.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

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

    const selected = findLatestV2SessionFile(root, { projectId: 'project', canonicalCwd: '/workspace/project' });
    assert.equal(selected, relative(root, join(second.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
    assert.equal(readV2LogEntries(root, selected).some(isMainAgent), true);
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

test('runtime V2 session lookup isolates projects with the same id and session id by cwd', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-cwd-isolation-'));
  try {
    const make = (canonicalCwd, createdAt) => {
      const writer = LogV2Writer.open({ ...options(root), canonicalCwd, createdAt });
      writer.append(
        entry(createdAt, [{ type: 'message', text: canonicalCwd }], canonicalCwd),
        resolveAppServerThreadIdentity({ id: 'session-root', sessionId: 'session-root' }),
      );
      return relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/');
    };
    const first = make('/workspace/one', '2026-07-14T08:00:00.000Z');
    const second = make('/workspace/two', '2026-07-14T09:00:00.000Z');
    assert.equal(findV2SessionFileBySessionId(root, 'session-root', {
      projectId: 'project', canonicalCwd: '/workspace/one',
    }), first);
    assert.equal(findV2SessionFileBySessionId(root, 'session-root', {
      projectId: 'project', canonicalCwd: '/workspace/two',
    }), second);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
