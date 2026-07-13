import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_MODEL_NAME_LENGTH,
  getDisplayedSessionModelName,
  getEffectiveModelName,
  getSessionIdentityCandidates,
  normalizeModelName,
  resolveProducerModelName,
  sessionIdentityCandidatesMatch,
} from '../src/utils/modelIdentity.js';
import { getLatestSessionByActivity } from '../src/utils/sessionManager.js';

function sessionCandidates(id, conversationId = 'thread:shared') {
  return [`internal:${id}`, `conversation:${conversationId}`];
}

test('effective model prefers a valid response model and validates bounded strings', () => {
  assert.equal(getEffectiveModelName({
    body: { model: ' request-model ' },
    response: { body: { model: ' response-model ' } },
  }), 'response-model');
  assert.equal(getEffectiveModelName({
    body: { model: 'request-model' },
    response: { body: { model: '   ' } },
  }), 'request-model');
  assert.equal(getEffectiveModelName({ body: { model: 42 } }), null);
  assert.equal(normalizeModelName('x'.repeat(MAX_MODEL_NAME_LENGTH + 1)), null);
});

test('session candidates prefer internal epoch and preserve legacy protocol identities', () => {
  const entry = {
    _sessionId: 'epoch-a',
    body: { metadata: { session_id: 'upstream-a', thread_id: 'thread-a' } },
  };
  assert.deepEqual(getSessionIdentityCandidates(entry), [
    'internal:epoch-a',
    'conversation:session:upstream-a',
    'session-key:thread:thread-a',
  ]);
  assert.equal(sessionIdentityCandidatesMatch(
    ['internal:epoch-a', 'conversation:thread:shared'],
    ['internal:epoch-b', 'conversation:thread:shared'],
  ), false);
  assert.equal(sessionIdentityCandidatesMatch(
    ['conversation:thread:shared'],
    ['conversation:thread:shared'],
  ), true);
});

test('displayed session model stays inside the pinned conversation and prefers hydrated data', () => {
  assert.equal(getDisplayedSessionModelName([
    { sessionId: 'old', conversationId: 'thread:old', modelName: 'gpt-old', messages: [] },
    { _cold: true, sessionId: 'current', conversationId: 'thread:current', modelName: 'gpt-cold', messages: null },
    { sessionId: 'current', conversationId: 'thread:current', modelName: 'gpt-hot', messages: [] },
  ]), 'gpt-hot');

  assert.equal(getDisplayedSessionModelName([
    { sessionId: 'old', conversationId: 'thread:old', modelName: 'gpt-old', messages: [] },
    { _cold: true, sessionId: 'current', conversationId: 'thread:current', modelName: 'gpt-cold', messages: null },
    { sessionId: 'current', conversationId: 'thread:current', modelName: null, messages: [] },
  ]), 'gpt-cold');

  assert.equal(getDisplayedSessionModelName([
    { sessionId: 'old', conversationId: 'thread:old', modelName: 'gpt-old', messages: [] },
    { sessionId: 'current', conversationId: 'thread:current', modelName: null, messages: [] },
  ]), null);

  // `/clear` can retain the upstream thread while advancing the internal
  // logical session. The new epoch must not borrow the pre-clear model.
  assert.equal(getDisplayedSessionModelName([
    { sessionId: 'before-clear', conversationId: 'thread:same', modelName: 'gpt-old', messages: [] },
    { sessionId: 'after-clear', conversationId: 'thread:same', modelName: null, messages: [] },
  ]), null);
});

test('explicit generated timestamp resolves the actual assistant producer', () => {
  const candidates = sessionCandidates('epoch-a');
  const name = resolveProducerModelName({
    message: { role: 'assistant', _generatedTs: 't1', _timestamp: 't2' },
    tsToIndex: { t1: 0, t2: 2 },
    modelNameByReqIdx: ['gpt-producer', null, 'gpt-carrier'],
    sessionIdentityCandidatesByReqIdx: [candidates, candidates, candidates],
    mainAgentByReqIdx: [true, false, true],
    sessionIdentityCandidates: candidates,
    sessionModelName: 'gpt-session',
  });
  assert.equal(name, 'gpt-producer');
});

test('legacy assistant lookup skips interleaved requests and stays in internal session', () => {
  const epochA = sessionCandidates('epoch-a');
  const epochB = sessionCandidates('epoch-b');
  const common = {
    message: { role: 'assistant', _timestamp: 'carrier' },
    tsToIndex: { carrier: 3 },
    modelNameByReqIdx: ['gpt-old', 'sub-model', 'gpt-producer', 'gpt-carrier'],
    mainAgentByReqIdx: [true, false, true, true],
    sessionModelName: 'gpt-session',
  };

  assert.equal(resolveProducerModelName({
    ...common,
    sessionIdentityCandidatesByReqIdx: [epochA, epochB, epochB, epochB],
    sessionIdentityCandidates: epochB,
  }), 'gpt-producer');

  assert.equal(resolveProducerModelName({
    ...common,
    modelNameByReqIdx: ['gpt-old', 'sub-model', null, 'gpt-carrier'],
    sessionIdentityCandidatesByReqIdx: [epochA, epochB, epochB, epochB],
    sessionIdentityCandidates: epochB,
  }), 'gpt-session');
});

test('session fallback is used when exact producer metadata is absent or out of scope', () => {
  const epochA = sessionCandidates('epoch-a');
  const epochB = sessionCandidates('epoch-b');
  assert.equal(resolveProducerModelName({
    message: { role: 'assistant', _generatedTs: 'producer', _timestamp: 'carrier' },
    tsToIndex: { producer: 0, carrier: 1 },
    modelNameByReqIdx: ['gpt-other-session', 'gpt-carrier'],
    sessionIdentityCandidatesByReqIdx: [epochA, epochB],
    mainAgentByReqIdx: [true, true],
    sessionIdentityCandidates: epochB,
    sessionModelName: 'gpt-current-session',
  }), 'gpt-current-session');

  assert.equal(resolveProducerModelName({
    message: { role: 'assistant', _timestamp: 'missing' },
    sessionModelName: ' '.repeat(2),
  }), null);
});

test('direct non-assistant timestamp uses the model in the same session', () => {
  const candidates = sessionCandidates('epoch-a');
  assert.equal(resolveProducerModelName({
    message: { role: 'user', _timestamp: 't1' },
    tsToIndex: new Map([['t1', 1]]),
    modelNameByReqIdx: [null, 'gpt-current'],
    sessionIdentityCandidatesByReqIdx: [[], candidates],
    mainAgentByReqIdx: [false, true],
    sessionIdentityCandidates: candidates,
    sessionModelName: 'gpt-fallback',
  }), 'gpt-current');
});

test('timestamp collisions select the candidate from the rendered session', () => {
  const epochA = sessionCandidates('epoch-a');
  const epochB = sessionCandidates('epoch-b');
  assert.equal(resolveProducerModelName({
    message: { role: 'assistant', _generatedTs: 'same-ts', _timestamp: 'same-ts' },
    tsToIndex: { 'same-ts': [0, 1] },
    modelNameByReqIdx: ['gpt-a', 'gpt-b'],
    sessionIdentityCandidatesByReqIdx: [epochA, epochB],
    mainAgentByReqIdx: [true, true],
    sessionIdentityCandidates: epochA,
    sessionModelName: 'fallback-a',
  }), 'gpt-a');
});

test('display identity can anchor the latest activity instead of insertion-order tail', () => {
  const sessions = [
    { sessionId: 'a', conversationId: 'thread:a', modelName: 'gpt-a', entryTimestamp: '2026-01-01T00:03:00Z', messages: [] },
    { sessionId: 'b', conversationId: 'thread:b', modelName: 'gpt-b', entryTimestamp: '2026-01-01T00:02:00Z', messages: [] },
  ];
  const active = getLatestSessionByActivity(sessions);
  assert.equal(active, sessions[0]);
  assert.equal(getDisplayedSessionModelName(sessions, active), 'gpt-a');
});
