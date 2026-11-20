import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { LogV2Writer } from '../packages/app/lib/log-v2/writer.js';
import { resolveAppServerThreadIdentity } from '../packages/app/lib/log-v2/identity.js';
import { readV2WirePage, readV2WireSnapshot } from '../packages/app/lib/log-v2/transport.js';
import { registerV2ObjectHandle, resolveV2ObjectBatch } from '../packages/app/server/lib/log-v2-routes.js';
import { LOG_V2_WIRE_KINDS, LOG_V2_WIRE_VERSION } from '../packages/app/lib/log-v2/wire-schema.js';
import { LogV2Archive } from '../apps/web/src/utils/logV2Archive.js';
import { createConversationEntryNormalizer } from '../apps/web/src/utils/conversationEntryNormalize.js';
import { mergeMainAgentSessions } from '../apps/web/src/utils/sessionMerge.js';
import { isColdIngestMergeBlockedEntry } from '../apps/web/src/utils/sessionMerge.js';

test('shard cold projection omits frozen objects, exact detail remains full, and older parts rebuild one transcript', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-shard-client-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const writer = LogV2Writer.open({ rootDir: root, projectId: 'p', canonicalCwd: '/fixture', sessionId: 's',
    durability: 'buffered', shardPrompts: 2 });
  const identity = resolveAppServerThreadIdentity({ id: 's', sessionId: 's' });
  const input = [];
  for (let index = 1; index <= 5; index++) {
    input.push({ type: 'message', role: 'user', content: `prompt-${index}` });
    writer.append({ timestamp: `2026-11-20T00:00:0${index}Z`, url: 'codex://test', mainAgent: true,
      body: { metadata: { thread_id: 's' }, input: structuredClone(input) },
      response: { body: { content: [{ type: 'text', text: `answer-${index}` }] } } }, identity);
    input.push({ type: 'message', role: 'assistant', content: `answer-${index}` });
  }
  const file = relative(root, join(writer.sessionDir, 'timeline.jsonl'));
  const frozen = readV2WireSnapshot(root, file);
  const allWinners = Array.from({ length: 3 }, (_, part) => readV2WireSnapshot(root, file, { part }).checkpoint.winners).flat();
  // This local projection fixture authorizes the complete same-session ref set;
  // real HTTP tests separately verify page-by-page whitelist extension.
  const grant = { ...frozen, checkpoint: { ...frozen.checkpoint, winners: allWinners } };
  const snapshot = { ...frozen, start: { ...frozen.start, objectHandle: registerV2ObjectHandle(file, grant) } };
  const requested = new Set();
  const archive = new LogV2Archive(snapshot, { fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    body.hashes.forEach(hash => requested.add(hash));
    const values = resolveV2ObjectBatch(root, body);
    return new Response(values.map(value => JSON.stringify({ kind: LOG_V2_WIRE_KINDS.object,
      version: LOG_V2_WIRE_VERSION, hash: value.hash, bytes: value.bytes, value: JSON.parse(value.raw) })).join('\n') + '\n');
  } });
  const latest = await archive.projectConversation(archive.rows[0]._v2RowHandle);
  assert.deepEqual(latest.body.input.filter(item => item.role === 'user').map(item => item.content), ['prompt-5']);
  const oldInputHash = snapshot.checkpoint.threads[0].nodes[0].append[0].hash;
  assert.equal(requested.has(oldInputHash), false, 'cold chat cannot hydrate the frozen prompt prefix');
  const exact = await archive.hydrate(archive.rows[0]._v2RowHandle);
  assert.equal(exact.body.input.filter(item => item.role === 'user').length, 5, 'network detail preserves the original request');
  let beforeSeq = 5;
  for (const expectedPrompts of [3, 5]) {
    const page = readV2WirePage(root, file, { cursor: snapshot.end.cursor, beforeSeq, limit: 100 });
    archive.prependPage(page);
    const normalize = createConversationEntryNormalizer();
    let sessions = [];
    for (const row of archive.rows) {
      const projected = await archive.projectConversation(row._v2RowHandle);
      sessions = mergeMainAgentSessions(sessions, normalize(projected));
    }
    const users = sessions.flatMap(session => session.messages).filter(item => item.role === 'user');
    assert.equal(users.length, expectedPrompts);
    assert.equal(new Set(users.map(item => JSON.stringify(item.content))).size, expectedPrompts);
    beforeSeq = page.start.nextBeforeSeq;
  }
  assert.equal(archive.hasMore, false);
});

test('canonical crash orphans retain their input slice without inventing a completed response', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-orphan-client-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const options = { rootDir: root, projectId: 'p', canonicalCwd: '/fixture', sessionId: 's', durability: 'buffered' };
  const identity = resolveAppServerThreadIdentity({ id: 's', sessionId: 's' });
  let writer = LogV2Writer.open(options);
  const user = content => ({ type: 'message', role: 'user', content });
  const entry = (number, input, inProgress = false) => ({ timestamp: `2026-11-20T00:01:0${number}Z`,
    url: 'codex://orphan', mainAgent: true, inProgress,
    body: { metadata: { thread_id: 's' }, input },
    response: inProgress ? null : { body: { content: [{ type: 'text', text: `answer-${number}` }] } } });
  writer.append(entry(1, [user('prompt-1')]), identity);
  const prefix = [user('prompt-1'), { type: 'message', role: 'assistant', content: 'answer-1' }, user('prompt-2')];
  writer.append(entry(2, prefix, true), identity);
  writer = LogV2Writer.open({ ...options, faultInjector(stage) { if (stage === 'entry-persisted') throw new Error('interrupted before commit'); } });
  assert.throws(() => writer.append(entry(3, [...prefix, user('uncommitted')]), identity), /interrupted before commit/);
  writer = LogV2Writer.open(options);
  writer.append(entry(3, [...prefix, user('prompt-3')]), identity);
  const file = relative(root, join(writer.sessionDir, 'timeline.jsonl'));
  const frozen = readV2WireSnapshot(root, file);
  const handle = registerV2ObjectHandle(file, frozen);
  const archive = new LogV2Archive({ ...frozen, start: { ...frozen.start, objectHandle: handle } }, {
    fetchImpl: async (_url, options) => new Response(resolveV2ObjectBatch(root, JSON.parse(options.body)).map(value =>
      JSON.stringify({ kind: LOG_V2_WIRE_KINDS.object, version: LOG_V2_WIRE_VERSION,
        hash: value.hash, bytes: value.bytes, value: JSON.parse(value.raw) })).join('\n') + '\n'),
  });
  const normalize = createConversationEntryNormalizer();
  let sessions = [];
  for (const row of archive.rows) {
    const projected = await archive.projectConversation(row._v2RowHandle);
    if (row._v2Descriptor.seq === 2) { assert.equal(projected.inProgress, true); assert.equal(projected.response, null); }
    const blocked = isColdIngestMergeBlockedEntry(projected);
    const normalized = normalize(projected, { commit: !blocked });
    if (!blocked) sessions = mergeMainAgentSessions(sessions, normalized);
  }
  const messages = sessions.flatMap(session => session.messages);
  assert.equal(messages.filter(message => message.role === 'user').length, 3);
  assert.ok(JSON.stringify(messages).includes('prompt-2'));
  assert.ok(!JSON.stringify(messages).includes('uncommitted'));
  assert.ok(!JSON.stringify(messages).includes('answer-2'));
});
