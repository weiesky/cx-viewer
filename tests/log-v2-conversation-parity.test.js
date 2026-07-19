import assert from 'node:assert/strict';
import test from 'node:test';

import { applyWireCommit, checkpointWireArchiveState, createWireArchiveState } from '../lib/log-v2/reducer.js';
import { LOG_V2_WIRE_KINDS, LOG_V2_WIRE_VERSION } from '../lib/log-v2/wire-schema.js';
import { isV2ConversationCandidate, LogV2Archive } from '../src/utils/logV2Archive.js';
import { normalizeConversationEntry } from '../src/utils/conversationEntryNormalize.js';
import { extractLatestPlanUsage } from '../src/utils/rateLimitParser.js';
import { isColdIngestMergeBlockedEntry, mergeMainAgentSessions } from '../src/utils/sessionMerge.js';

const identity = { projectId: 'project', sessionId: 'session', generation: 'generation' };

test('V2 conversation projection skips network-only parts while preserving normalized transcript semantics', async () => {
  const values = [
    ['a', { timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://main', mainAgent: true }],
    ['b', { model: 'gpt-test', instructions: 'Codex', tools: [{ name: 'shell_command' }] }],
    ['c', { status: 200, headers: { authorization: 'must-not-project', 'x-codex-plan-type': 'projected' } }],
    ['d', { content: [{ type: 'text', text: 'answer' }], usage: { output_tokens: 1 } }],
    ['e', { authorization: '[REDACTED]' }],
    ['f', { role: 'user', content: 'hello' }],
    ['7', { authorization: '[REDACTED]', 'x-codex-primary-used-percent': '99' }],
  ].map(([char, value]) => ({ ref: { hash: char.repeat(64), bytes: JSON.stringify(value).length }, value }));
  const [meta, body, responseMeta, responseBody, headers, input, responseHeaders] = values;
  const state = createWireArchiveState(identity);
  applyWireCommit(state, {
    kind: LOG_V2_WIRE_KINDS.commit, version: LOG_V2_WIRE_VERSION, archive: identity, timelineBytes: 100,
    timeline: { seq: 1, eventId: 'event', txnId: 'txn', timestamp: '2026-07-15T00:00:00.000Z', threadId: 'thread', entryKey: 'entry', entryRevision: 1, inputRevision: 1, phase: 'completed' },
    entry: {
      entryKey: 'entry', revision: 1, baseRevision: 0,
      set: { 'root.meta': meta.ref, 'root.body': body.ref, 'root.headers': headers.ref, 'response.meta': responseMeta.ref, 'response.headers': responseHeaders.ref, 'response.body': responseBody.ref },
      delete: [], inputBinding: { revision: 1, path: 'root.body.input', changed: true },
    },
    input: { revision: 1, baseRevision: 0, path: 'root.body.input', retain: 0, remove: 0, append: [input.ref] },
  });
  const objectValues = new Map(values.map(item => [item.ref.hash, item.value]));
  const objectRefs = new Map(values.map(item => [item.ref.hash, item.ref]));
  const requested = [];
  const fetchImpl = async (_url, options) => {
    const hashes = JSON.parse(options.body).hashes;
    requested.push(...hashes);
    return new Response(hashes.map(hash => JSON.stringify({ kind: LOG_V2_WIRE_KINDS.object, version: LOG_V2_WIRE_VERSION, hash, bytes: objectRefs.get(hash).bytes, value: objectValues.get(hash) })).join('\n') + '\n');
  };
  const snapshot = {
    start: { kind: LOG_V2_WIRE_KINDS.start, version: LOG_V2_WIRE_VERSION, archive: identity, objectHandle: 'handle' },
    checkpoint: checkpointWireArchiveState(state),
    summaries: [{
      seq: 1,
      root: meta.value,
      body: { model: 'gpt-test' },
      response: {
        status: 200,
        usage: { output_tokens: 1 },
        headers: {
          'x-codex-plan-type': 'prolite',
          'x-codex-primary-used-percent': '19',
          'x-codex-primary-window-minutes': '10080',
          authorization: 'Bearer must-not-project',
          'content-type': 'text/event-stream',
        },
      },
      request: null,
    }],
    end: { kind: LOG_V2_WIRE_KINDS.end, version: LOG_V2_WIRE_VERSION, archive: identity },
  };
  const archive = new LogV2Archive(snapshot, { fetchImpl });
  const row = archive.rows[0];
  const projected = await archive.projectConversation(row._v2RowHandle);
  const full = {
    ...meta.value,
    headers: headers.value,
    body: { ...body.value, input: [input.value] },
    response: { ...responseMeta.value, body: responseBody.value },
  };

  assert.deepEqual(projected.response.headers, {
    'x-codex-plan-type': 'projected',
    'x-codex-primary-used-percent': '19',
    'x-codex-primary-window-minutes': '10080',
  });
  assert.equal(extractLatestPlanUsage([projected]).windows[0].utilization, 0.19);
  const projectedConversation = normalizeConversationEntry(projected);
  const fullConversation = normalizeConversationEntry(full);
  delete projectedConversation.response.headers;
  delete fullConversation.response.headers;
  delete fullConversation.headers;
  assert.deepEqual(projectedConversation, fullConversation);
  assert.equal(projected.headers, undefined);
  assert.equal(requested.includes(headers.ref.hash), false);
  assert.equal(requested.includes(responseHeaders.ref.hash), false);
  assert.deepEqual(new Set(requested), new Set([meta.ref.hash, body.ref.hash, responseMeta.ref.hash, responseBody.ref.hash, input.ref.hash]));

  const liveRow = archive.applyCommit({
    kind: LOG_V2_WIRE_KINDS.commit,
    version: LOG_V2_WIRE_VERSION,
    archive: identity,
    timelineBytes: 100,
    timeline: {
      seq: 2,
      eventId: 'event-2',
      txnId: 'txn-2',
      timestamp: '2026-07-15T00:00:01.000Z',
      threadId: 'thread',
      entryKey: 'entry',
      entryRevision: 2,
      inputRevision: null,
      phase: 'completed',
    },
    entry: {
      entryKey: 'entry',
      revision: 2,
      baseRevision: 1,
      set: { 'response.meta': responseMeta.ref },
      delete: [],
    },
  }, {
    seq: 2,
    root: meta.value,
    body: { model: 'gpt-test' },
    response: {
      status: 200,
      headers: {
        'x-codex-primary-used-percent': '41',
        'x-codex-primary-window-minutes': '10080',
      },
    },
    request: null,
  });
  const liveProjected = await archive.projectConversation(liveRow._v2RowHandle);
  assert.equal(extractLatestPlanUsage([liveProjected]).windows[0].utilization, 0.41);
  assert.equal(requested.includes(responseHeaders.ref.hash), false);
});

test('canonical agent role keeps conversation projection eligible without derived capture flags', () => {
  assert.equal(isV2ConversationCandidate({
    _classification: { type: 'Metadata', subType: null },
    _v2Descriptor: { agentRole: 'main' },
  }), true);
});

test('Master rows never become V2 conversation candidates through writer-role fallback', () => {
  assert.equal(isV2ConversationCandidate({
    _classification: { type: 'Master', subType: null },
    _v2Descriptor: { agentRole: 'main' },
  }), false);
  assert.equal(isV2ConversationCandidate({
    url: 'https://api.openai.com/v1/responses',
    _classification: { type: 'MainAgent', subType: null },
    _v2Descriptor: { agentRole: 'main' },
  }), false);
  assert.equal(isV2ConversationCandidate({
    _classification: { type: 'Metadata', subType: null },
    _v2Descriptor: { agentRole: 'main' },
  }), true);
});

test('cold ingest renders persisted V2 in-progress history without admitting legacy delta slices', () => {
  const user = {
    type: 'message', id: 'user_1', role: 'user',
    content: [{ type: 'input_text', text: 'run it' }],
  };
  const call = {
    type: 'custom_tool_call', id: 'call_item', call_id: 'call_1', name: 'exec', input: 'text(1)',
  };
  const result = {
    type: 'custom_tool_call_output', call_id: 'call_1', output: '1',
  };
  const projected = normalizeConversationEntry({
    timestamp: '2026-07-15T00:00:00.000Z',
    mainAgent: true,
    inProgress: true,
    _v2Descriptor: { entryKey: 'entry', input: { revision: 3 } },
    body: { input: [user, call, result] },
  });

  assert.equal(isColdIngestMergeBlockedEntry(projected), false);
  const sessions = mergeMainAgentSessions([], projected);
  assert.deepEqual(sessions[0].messages.map(message => ({
    role: message.role,
    types: message.content.map(block => block.type),
  })), [
    { role: 'user', types: ['text'] },
    { role: 'assistant', types: ['tool_use'] },
    { role: 'user', types: ['tool_result'] },
  ]);

  assert.equal(isColdIngestMergeBlockedEntry({
    inProgress: true,
    body: { input: [result] },
  }), true);
});
