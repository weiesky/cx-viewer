import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hashStorageId,
  resolveAppServerThreadIdentity,
  resolveIngestionSourceIdentity,
  resolveLegacyEntryIdentity,
  sessionArchiveRelativePath,
  threadStoreToken,
} from '../lib/log-v2/identity.js';

test('root App Server thread maps to its session archive', () => {
  assert.deepEqual(resolveAppServerThreadIdentity({ id: 'root-1', sessionId: 'root-1' }), {
    source: 'app-server',
    sessionId: 'root-1',
    rootThreadId: 'root-1',
    threadId: 'root-1',
    parentThreadId: null,
    isRoot: true,
    agentRole: 'main',
  });
});

test('child App Server thread shares session and retains parent relation', () => {
  const identity = resolveAppServerThreadIdentity({
    id: 'child-1',
    session_id: 'root-1',
    parent_thread_id: 'root-1',
  });
  assert.equal(identity.sessionId, 'root-1');
  assert.equal(identity.threadId, 'child-1');
  assert.equal(identity.parentThreadId, 'root-1');
  assert.equal(identity.isRoot, false);
  assert.equal(identity.agentRole, 'subagent');
});

test('App Server identity refuses to guess a missing session', () => {
  assert.throws(() => resolveAppServerThreadIdentity({ id: 'thread-only' }), /thread\.sessionId/);
});

test('legacy identity uses explicit metadata before scoped fallback', () => {
  const explicit = resolveLegacyEntryIdentity({ metadata: { session_id: 's1', thread_id: 't1' } }, {
    fallbackSessionId: 'fallback',
  });
  assert.equal(explicit.sessionId, 's1');
  assert.equal(explicit.threadId, 't1');

  const fallback = resolveLegacyEntryIdentity({}, { fallbackSessionId: 's2' });
  assert.equal(fallback.sessionId, 's2');
  assert.equal(fallback.threadId, 's2');
});

test('SDK identity uses its authoritative thread as the session boundary', () => {
  const identity = resolveIngestionSourceIdentity({
    mainAgent: true,
    body: { metadata: { thread_id: 'sdk-thread-1' } },
  }, { source: 'sdk' }, { fallbackSessionId: 'synthetic' });
  assert.equal(identity.source, 'sdk');
  assert.equal(identity.sessionId, 'sdk-thread-1');
  assert.equal(identity.threadId, 'sdk-thread-1');
  assert.equal(identity.synthetic, false);
  assert.equal(identity.agentRole, 'main');
});

test('OTel identity uses resource session and trace-scoped thread', () => {
  const identity = resolveIngestionSourceIdentity({
    _otelSessionId: 'otel-process-1',
    _otelTraceId: 'trace-1',
    _otelSource: true,
  }, { source: 'otel' }, { fallbackSessionId: 'synthetic' });
  assert.equal(identity.sessionId, 'otel-process-1');
  assert.equal(identity.threadId, 'trace-1');
  assert.equal(identity.agentRole, 'telemetry');
  assert.equal(identity.synthetic, false);
});

test('Proxy identity uses a scoped synthetic boundary only when metadata is absent', () => {
  const synthetic = resolveIngestionSourceIdentity({}, { source: 'proxy' }, {
    fallbackSessionId: 'synthetic-proxy',
  });
  assert.equal(synthetic.sessionId, 'synthetic-proxy');
  assert.equal(synthetic.synthetic, true);

  const explicit = resolveIngestionSourceIdentity({
    body: { metadata: { session_id: 'proxy-session', thread_id: 'proxy-child' } },
  }, { source: 'proxy' }, { fallbackSessionId: 'synthetic-proxy' });
  assert.equal(explicit.sessionId, 'proxy-session');
  assert.equal(explicit.threadId, 'proxy-child');
  assert.equal(explicit.synthetic, false);
});

test('Proxy identity reads Codex Responses client metadata for subagent routing', () => {
  const identity = resolveIngestionSourceIdentity({
    subAgent: true,
    body: {
      client_metadata: {
        session_id: 'root-session',
        thread_id: 'child-thread',
        'x-codex-parent-thread-id': 'root-session',
      },
    },
  }, { source: 'proxy' }, { fallbackSessionId: 'synthetic-proxy' });
  assert.equal(identity.source, 'proxy');
  assert.equal(identity.sessionId, 'root-session');
  assert.equal(identity.threadId, 'child-thread');
  assert.equal(identity.parentThreadId, 'root-session');
  assert.equal(identity.agentRole, 'subagent');
  assert.equal(identity.synthetic, false);
});

test('auxiliary identity preserves App Server underscore thread metadata', () => {
  const identity = resolveIngestionSourceIdentity({
    subAgent: true,
    _agentThreadId: 'child-1',
    _parentThreadId: 'root-1',
  }, { source: 'app-server-global' }, {
    fallbackSessionId: 'synthetic-global',
  });
  assert.equal(identity.sessionId, 'synthetic-global');
  assert.equal(identity.threadId, 'child-1');
  assert.equal(identity.parentThreadId, 'root-1');
  assert.equal(identity.agentRole, 'subagent');
});

test('archive paths hash external ids and use a deterministic UTC date boundary', () => {
  const unsafeId = '../../a/user-visible-session';
  const relative = sessionArchiveRelativePath({
    sessionId: unsafeId,
    createdAt: '2026-07-14T23:30:00-08:00',
  });
  assert.match(relative, /^sessions\/2026\/07\/15\/s_[a-f0-9]{64}\.cxvsession$/);
  assert.equal(relative.includes(unsafeId), false);
  assert.equal(relative.includes('..'), false);
  assert.match(threadStoreToken(unsafeId), /^t_[a-f0-9]{64}$/);
  assert.equal(hashStorageId('same'), hashStorageId('same'));
});
