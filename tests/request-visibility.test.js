import assert from 'node:assert/strict';
import test from 'node:test';

import { filterAppServerTransportMirrors, projectVisibleRequests } from '../lib/request-visibility.js';

function proxyEntry({
  threadId = 'thread-1',
  turnId = 'turn-1',
  status = 200,
  inProgress = false,
  requestModel = 'deepseek-request',
  responseModel = 'deepseek-response',
  proxyUrl = 'https://api.deepseek.com/chat/completions',
  proxyProfile = 'DeepSeek',
  proxyWireApi = 'chat-completions',
  error = null,
} = {}) {
  return {
    url: 'https://chatgpt.com/backend-api/codex/responses',
    proxyUrl,
    proxyProfile,
    proxyWireApi,
    mainAgent: true,
    inProgress,
    body: { model: requestModel, client_metadata: { thread_id: threadId, turn_id: turnId } },
    response: { status, ...(responseModel ? { body: { model: responseModel } } : {}), ...(error ? { error } : {}) },
  };
}

function mirrorEntry({ threadId = 'thread-1', turnId = 'turn-1', role = 'main' } = {}) {
  return {
    url: 'https://api.openai.com/v1/responses',
    _appServerSource: true,
    mainAgent: role === 'main',
    subAgent: role === 'subagent',
    agentRole: role,
    body: { metadata: { thread_id: threadId, turn_id: turnId } },
    response: { status: 200 },
  };
}

function errorEntry({ threadId = 'thread-1', turnId = 'turn-1', role = 'main', legacy = false, retry = false } = {}) {
  return {
    url: 'codex://error',
    ...(legacy ? { _codexRaw: { streamId: 'stream', fromSeq: 1, toSeq: 2 } } : { _appServerSource: true }),
    mainAgent: role === 'main',
    subAgent: role === 'subagent',
    agentRole: role,
    body: { model: 'gpt-5.6-sol', metadata: { thread_id: threadId, turn_id: turnId } },
    response: {
      status: 500,
      body: retry
        ? { error: 'Reconnecting... 1/5', willRetry: true }
        : { error: 'stream disconnected before completion' },
    },
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

test('hides an App Server Master mirror while preserving every real proxy tool round', () => {
  const first = proxyEntry();
  const second = proxyEntry();
  const mirror = mirrorEntry();
  assert.deepEqual(filterAppServerTransportMirrors([first, mirror, second]), [first, second]);
  assert.deepEqual(filterAppServerTransportMirrors([mirror, first, second]), [first, second]);
});

test('keeps App Server-only and uncorrelated entries', () => {
  const mirror = mirrorEntry();
  const otherTurn = proxyEntry({ turnId: 'turn-2' });
  const otherThread = proxyEntry({ threadId: 'thread-2' });
  const missingIdentity = { ...mirror, body: {} };
  const input = [mirror, otherTurn, otherThread, missingIdentity];
  assert.deepEqual(filterAppServerTransportMirrors(input), input);
});

test('does not let an in-progress or status-zero proxy hide the completed mirror', () => {
  const mirror = mirrorEntry();
  for (const proxy of [proxyEntry({ inProgress: true }), proxyEntry({ status: 0 })]) {
    assert.deepEqual(filterAppServerTransportMirrors([proxy, mirror]), [proxy, mirror]);
  }
  assert.deepEqual(filterAppServerTransportMirrors([proxyEntry({ status: 502 }), mirror]), [proxyEntry({ status: 502 })]);
});

test('keeps non-Master App Server events and does not mutate the input', () => {
  const proxy = proxyEntry();
  const event = { ...mirrorEntry(), url: 'codex://event/turn-completed' };
  const input = Object.freeze([proxy, event]);
  const output = filterAppServerTransportMirrors(input);
  assert.deepEqual(output, [proxy, event]);
  assert.deepEqual(input, [proxy, event]);
});

test('requires the same agent role and supports V2 descriptor identity', () => {
  const proxy = {
    ...proxyEntry(),
    body: {},
    _v2Descriptor: { threadId: 'thread-1', turnId: 'turn-1', agentRole: 'main' },
  };
  const subagentMirror = mirrorEntry({ role: 'subagent' });
  const mainMirror = { ...mirrorEntry(), body: {}, _v2Descriptor: { threadId: 'thread-1', turnId: 'turn-1', agentRole: 'auxiliary' } };
  assert.deepEqual(filterAppServerTransportMirrors([proxy, subagentMirror, mainMirror]), [proxy, subagentMirror]);
});

test('uses the raw sidecar reference as the explicit legacy App Server source', () => {
  const proxy = proxyEntry();
  const legacyMirror = { ...mirrorEntry(), _appServerSource: undefined, _codexRaw: { streamId: 'stream', fromSeq: 1, toSeq: 2 } };
  assert.deepEqual(filterAppServerTransportMirrors([proxy, legacyMirror]), [proxy]);
});

test('removes transport mirrors in both normal and show-all projections', () => {
  const proxy = proxyEntry();
  const mirror = mirrorEntry();
  const irrelevant = { url: 'codex://metadata', response: { status: 200 } };
  const isRelevant = entry => entry !== irrelevant;
  assert.deepEqual(projectVisibleRequests([proxy, mirror, irrelevant], false, isRelevant), [proxy]);
  assert.deepEqual(projectVisibleRequests([proxy, mirror, irrelevant], true, isRelevant), [proxy, irrelevant]);
});

test('projects the preceding proxy route onto a correlated App Server error without mutating logs', () => {
  const proxy = deepFreeze(proxyEntry());
  const error = deepFreeze(errorEntry());
  const input = deepFreeze([proxy, error]);
  const output = filterAppServerTransportMirrors(input);

  assert.equal(output.length, 2);
  assert.equal(output[0], proxy);
  assert.notEqual(output[1], error);
  assert.equal(output[1].proxyUrl, proxy.proxyUrl);
  assert.equal(output[1].proxyProfile, proxy.proxyProfile);
  assert.equal(output[1].proxyWireApi, proxy.proxyWireApi);
  assert.equal(output[1].body.model, 'deepseek-response');
  assert.equal(output[1].response.body.model, 'deepseek-response');
  assert.equal(output[1].response.body.error, 'stream disconnected before completion');
  assert.equal(error.body.model, 'gpt-5.6-sol');
  assert.deepEqual(error.response.body, { error: 'stream disconnected before completion' });
});

test('hides App Server retry notifications because they are not HTTP requests', () => {
  const explicit = errorEntry({ retry: true });
  const historical = {
    ...errorEntry(),
    response: { status: 500, body: { error: { message: 'Reconnecting... 2/5' } } },
  };
  assert.deepEqual(filterAppServerTransportMirrors([proxyEntry(), explicit, historical]), [proxyEntry()]);
});

test('uses request model fallback and supports legacy App Server source markers', () => {
  const proxy = proxyEntry({ responseModel: null });
  const error = errorEntry({ legacy: true });
  const output = filterAppServerTransportMirrors([proxy, error]);
  assert.equal(output[1].body.model, 'deepseek-request');
  assert.equal(output[1].response.body.model, 'deepseek-request');
});

test('does not let a later proxy request retroactively relabel an earlier error', () => {
  const error = errorEntry();
  const proxy = proxyEntry();
  const output = filterAppServerTransportMirrors([error, proxy]);
  assert.equal(output[0], error);
  assert.equal(output[1], proxy);
});

test('projects consistent proxy rounds but preserves errors when a prior route conflicts', () => {
  const first = proxyEntry();
  const second = proxyEntry();
  const consistentError = errorEntry();
  const consistent = filterAppServerTransportMirrors([first, second, consistentError]);
  assert.equal(consistent[2].body.model, 'deepseek-response');

  const conflicting = proxyEntry({
    responseModel: 'other-model',
    proxyUrl: 'https://other.example/v1/responses',
    proxyProfile: 'Other',
    proxyWireApi: 'responses',
  });
  const ambiguousError = errorEntry();
  const ambiguous = filterAppServerTransportMirrors([first, conflicting, ambiguousError]);
  assert.equal(ambiguous[2], ambiguousError);
});

test('treats operation URL changes as one route and uses the latest preceding URL', () => {
  const route = { proxyProfile: 'Responses Proxy', proxyWireApi: 'responses' };
  const compact = proxyEntry({ ...route, proxyUrl: 'https://proxy.example/tenant/v1/responses/compact?attempt=1' });
  const responses = proxyEntry({ ...route, proxyUrl: 'https://proxy.example/tenant/v1/responses?attempt=2' });
  const error = errorEntry();
  const output = filterAppServerTransportMirrors([compact, responses, error]);
  assert.equal(output[2].proxyUrl, responses.proxyUrl);
  assert.equal(output[2].body.model, 'deepseek-response');
});

test('keeps same-origin routes with different base paths ambiguous', () => {
  const route = { proxyProfile: 'Shared Name', proxyWireApi: 'responses' };
  const first = proxyEntry({ ...route, proxyUrl: 'https://proxy.example/tenant-a/v1/responses' });
  const second = proxyEntry({ ...route, proxyUrl: 'https://proxy.example/tenant-b/v1/responses' });
  const error = errorEntry();
  const output = filterAppServerTransportMirrors([first, second, error]);
  assert.equal(output[2], error);
});

test('uses an explicit status-zero proxy failure as route evidence', () => {
  const failedProxy = proxyEntry({ status: 0, error: 'network failed' });
  const error = errorEntry();
  const output = filterAppServerTransportMirrors([failedProxy, error]);
  assert.equal(output[1].proxyProfile, 'DeepSeek');
  assert.equal(output[1].body.model, 'deepseek-response');
  assert.equal(failedProxy.response.error, 'network failed');
});

test('requires a completed proxy with the same thread, turn, and agent role', () => {
  const error = errorEntry();
  const candidates = [
    proxyEntry({ inProgress: true }),
    proxyEntry({ status: 0 }),
    proxyEntry({ threadId: 'thread-2' }),
    proxyEntry({ turnId: 'turn-2' }),
    { ...proxyEntry(), mainAgent: false, subAgent: true, agentRole: 'subagent' },
  ];
  for (const proxy of candidates) {
    const output = filterAppServerTransportMirrors([proxy, error]);
    assert.equal(output[1], error);
  }

  const missingIdentity = { ...error, body: { model: 'gpt-5.6-sol' } };
  assert.equal(filterAppServerTransportMirrors([proxyEntry(), missingIdentity])[1], missingIdentity);
  const missingModel = proxyEntry({ requestModel: null, responseModel: null });
  assert.equal(filterAppServerTransportMirrors([missingModel, error])[1], error);
});

test('keeps mirror filtering and error projection compatible in one pass', () => {
  const proxy = proxyEntry();
  const mirror = mirrorEntry();
  const error = errorEntry();
  const output = filterAppServerTransportMirrors([mirror, proxy, error, proxyEntry()]);
  assert.equal(output.length, 3);
  assert.equal(output[0], proxy);
  assert.equal(output[1].body.model, 'deepseek-response');
  assert.equal(output[2].proxyProfile, 'DeepSeek');
});
