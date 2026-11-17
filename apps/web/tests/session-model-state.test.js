import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeMainAgentSessions } from '../src/utils/sessionMerge.js';
import { applyInPlaceLastMsgReplace, buildSessionIndex, splitHotCold } from '../src/utils/sessionManager.js';

function message(role, text) {
  return { role, content: [{ type: 'text', text }] };
}

function entry({
  timestamp,
  threadId = 'thread-a',
  internalSessionId = 'epoch-a',
  input,
  requestModel,
  responseModel,
  response = true,
  extra = {},
}) {
  return {
    timestamp,
    url: 'https://api.openai.com/v1/responses',
    mainAgent: true,
    _sessionId: internalSessionId,
    body: {
      metadata: { thread_id: threadId, user_id: 'user-a' },
      input,
      ...(requestModel === undefined ? {} : { model: requestModel }),
    },
    ...(response ? {
      response: {
        status: 200,
        body: responseModel === undefined ? {} : { model: responseModel },
      },
    } : {}),
    ...extra,
  };
}

test('session model is captured immediately and completed response overrides request model', () => {
  const inProgress = entry({
    timestamp: '2026-01-01T00:00:00.000Z',
    input: [message('user', 'hello')],
    requestModel: 'request-model',
    response: false,
    extra: { inProgress: true },
  });
  let sessions = mergeMainAgentSessions([], inProgress);
  assert.equal(sessions[0].modelName, 'request-model');

  const completed = entry({
    timestamp: '2026-01-01T00:00:01.000Z',
    input: [message('user', 'hello'), message('assistant', 'hi')],
    requestModel: 'request-model',
    responseModel: 'response-model',
  });
  sessions = mergeMainAgentSessions(sessions, completed, { skipTransientFilter: true });
  assert.equal(sessions[0].modelName, 'response-model');
});

test('post-clear constructor owns the new logical session model', () => {
  let sessions = mergeMainAgentSessions([], entry({
    timestamp: '2026-01-01T00:00:00.000Z',
    input: [message('user', 'before'), message('assistant', 'old')],
    requestModel: 'model-a',
  }));
  sessions = mergeMainAgentSessions(sessions, entry({
    timestamp: '2026-01-01T00:00:01.000Z',
    internalSessionId: 'epoch-clear',
    input: [message('user', '<command-name>/clear</command-name> after')],
    requestModel: 'model-b',
    extra: { _postClearCheckpoint: true, _isCheckpoint: true },
  }), { skipTransientFilter: true });

  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].modelName, 'model-a');
  assert.equal(sessions[1].modelName, 'model-b');
});

test('model-less frames preserve the session model and a new identity owns its own model', () => {
  let sessions = mergeMainAgentSessions([], entry({
    timestamp: '2026-01-01T00:00:00.000Z',
    input: [message('user', 'one')],
    requestModel: 'model-a',
  }));
  sessions = mergeMainAgentSessions(sessions, entry({
    timestamp: '2026-01-01T00:00:01.000Z',
    input: [message('user', 'one'), message('assistant', 'two')],
  }), { skipTransientFilter: true });
  assert.equal(sessions[0].modelName, 'model-a');

  sessions = mergeMainAgentSessions(sessions, entry({
    timestamp: '2026-01-01T00:00:02.000Z',
    threadId: 'thread-b',
    internalSessionId: 'epoch-b',
    input: [message('user', 'new thread')],
    requestModel: 'model-b',
  }), { skipTransientFilter: true });
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].modelName, 'model-a');
  assert.equal(sessions[1].modelName, 'model-b');
});

test('signal-driven in-place replacement updates or preserves model identity', () => {
  const previous = [{
    userId: 'user-a',
    sessionId: 'epoch-a',
    conversationId: 'thread:thread-a',
    modelName: 'model-a',
    messages: [message('user', 'one'), message('assistant', 'partial')],
    response: { status: 200 },
    entryTimestamp: '2026-01-01T00:00:00.000Z',
  }];
  const replacement = entry({
    timestamp: '2026-01-01T00:00:01.000Z',
    input: [message('user', 'one'), message('assistant', 'final')],
    requestModel: 'request-model',
    responseModel: 'model-b',
    extra: { _inPlaceReplaceDetected: true, _isCheckpoint: true },
  });
  const updated = applyInPlaceLastMsgReplace(previous, replacement, replacement.timestamp, false);
  assert.equal(updated.applied, true);
  assert.equal(updated.sessions[0].modelName, 'model-b');

  const noModelReplacement = entry({
    timestamp: '2026-01-01T00:00:02.000Z',
    input: [message('user', 'one'), message('assistant', 'final again')],
    extra: { _inPlaceReplaceDetected: true, _isCheckpoint: true },
  });
  const preserved = applyInPlaceLastMsgReplace(updated.sessions, noModelReplacement, noModelReplacement.timestamp, false);
  assert.equal(preserved.applied, true);
  assert.equal(preserved.sessions[0].modelName, 'model-b');
});

test('session index and cold placeholders preserve model identity with old-data compatibility', () => {
  const entries = [
    { _sessionId: 'epoch-a', timestamp: '2026-01-01T00:00:00.000Z' },
    { _sessionId: 'epoch-b', timestamp: '2026-01-01T00:01:00.000Z' },
  ];
  const sessions = [
    {
      sessionId: 'epoch-a', conversationId: 'thread:a', modelName: 'model-a',
      userId: 'user-a', messages: [message('user', 'old')],
      entryTimestamp: '2026-01-01T00:00:00.000Z',
    },
    {
      sessionId: 'epoch-b', conversationId: 'thread:b',
      userId: 'user-a', messages: [message('user', 'new')],
      entryTimestamp: '2026-01-01T00:01:00.000Z',
    },
  ];
  const index = buildSessionIndex(entries, sessions);
  assert.equal(index[0].modelName, 'model-a');
  assert.equal(index[1].modelName, null);

  const { allSessions } = splitHotCold(entries, sessions, index, 1);
  assert.equal(allSessions[0]._cold, true);
  assert.equal(allSessions[0].modelName, 'model-a');
  assert.equal(allSessions[1].modelName, undefined);
});
