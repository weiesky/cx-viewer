import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { sdkToJSONLEntry } from '../../../packages/app/lib/sdk-adapter.js';
import { normalizeConversationEntry } from '../src/utils/conversationEntryNormalize.js';
import { assignMessageTimestamps, applyBatchEntryTimestamps } from '../src/utils/sessionManager.js';
import { mergeMainAgentSessions } from '../src/utils/sessionMerge.js';
import { createPendingInputRecord, reconcilePendingInputs } from '../src/utils/pendingInputEcho.js';

const stamps = ['2026-11-19T00:00:00.000Z', '2026-11-19T00:00:10.100Z', '2026-11-19T00:00:10.200Z'];
const user = (content, index) => ({ role: 'user', content, _sdkTimestamp: stamps[index] });
const assistant = (text, index, feedback = false) => ({ role: 'assistant', content: [{ type: 'text', text }],
  _sdkTimestamp: stamps[index], ...(feedback ? { _sdkFeedback: true } : {}) });
function entries() {
  const history = [user('interrupted', 0), assistant('Error: interrupted', 0, true),
    user('selected', 1), assistant('selected reply', 1), user('backlog', 2)];
  return [[history.slice(0, 1), 'Error: interrupted', 500], [history.slice(0, 3), 'selected reply', 200],
    [history, 'backlog reply', 200]].map(([input, text, status], index) =>
    sdkToJSONLEntry({ message: { content: [{ type: 'text', text }] } }, input, 'fixture', 'same', {
      timestamp: stamps[index], threadId: 'thread-sdk-time', cwd: '/fixture/same', status,
    }));
}
for (const mode of ['live', 'cold']) test(`SDK turn timestamps remain authoritative through ${mode} error/queue history projection`, () => {
  let sessions = [], previousTs = null;
  const state = { timestamps: [], generatedTimestamps: [], prevMainAgentTs: null,
    prevUserId: null, prevSessionKey: null, prevConversationId: null, currentSessionId: null, sessions: [] };
  for (const raw of entries()) {
    const entry = normalizeConversationEntry(raw);
    if (mode === 'cold') {
      state.sessions = sessions;
      applyBatchEntryTimestamps(state, entry);
      entry._sessionId = state.currentSessionId;
    } else {
      const previous = sessions.at(-1)?.messages || [];
      assignMessageTimestamps(entry.body.input, previous, false, previous.length, entry.timestamp, previousTs);
    }
    sessions = mergeMainAgentSessions(sessions, entry);
    previousTs = entry.timestamp;
  }
  const messages = sessions.flatMap(session => session.messages);
  assert.deepEqual(messages.map(message => message._timestamp), [stamps[0], stamps[0], stamps[1], stamps[1], stamps[2], stamps[2]]);
  assert.deepEqual(messages.filter(message => message.role === 'assistant').map(message => message._generatedTs), stamps);
  const record = { ...createPendingInputRecord({ id: 'pending-selected', wireText: 'selected', createdAt: stamps[1] }), serverTimestamp: stamps[1] };
  const rows = messages.filter(message => message.role === 'user').map((message, index) =>
    React.createElement('chat-message', { key: index, role: 'user', text: message.content, timestamp: message._timestamp }));
  assert.deepEqual(reconcilePendingInputs([record], rows), []);
});

test('SDK terminal feedback retains the canonical history prefix without impersonating model output', () => {
  const content = [{ type: 'text', text: 'Error: terminal failure' }];
  const input = [user('task', 0), { role: 'assistant', content }];
  const raw = sdkToJSONLEntry({ message: { content, error: { message: 'terminal failure' } } }, input, 'fixture', 'same', {
    timestamp: stamps[0], threadId: 'thread', status: 500, stopReason: 'error',
  });
  const before = JSON.stringify(raw), entry = normalizeConversationEntry(raw);
  assert.equal(JSON.stringify(raw), before, 'raw archive/detail data must remain intact');
  assert.equal(entry.body.input.length, 3, 'identical genuine assistant text cannot be relabeled as Viewer feedback');
  assert.equal(entry.body.input[1]._sdkFeedback, undefined);
  assert.equal(entry.body.input[2]._sdkFeedback, true);
  assert.deepEqual(entry.body.input[2].content, content);
  const ordinary = sdkToJSONLEntry({ message: { content } }, [user('task', 0)], 'fixture', 'same');
  assert.equal(normalizeConversationEntry(ordinary).body.input.at(-1)._sdkFeedback, undefined,
    'an Error-prefixed model answer is still ordinary assistant output');
});
