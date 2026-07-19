import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeLogStorageSegment,
  encodeLogStorageSegment,
  hashStorageId,
  projectArchiveDirectoryName,
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

test('legacy direct OpenAI Responses entries do not retain a main archive role', () => {
  const identity = resolveIngestionSourceIdentity({
    url: 'https://api.openai.com/v1/responses',
    mainAgent: true,
    body: { metadata: { session_id: 'api-session' } },
  }, { source: 'proxy' }, { fallbackSessionId: 'synthetic' });
  assert.equal(identity.agentRole, 'auxiliary');
});

test('Master identity overrides conflicting legacy subagent and teammate flags', () => {
  for (const flags of [
    { mainAgent: true, subAgent: true },
    { mainAgent: true, teammate: 'reviewer' },
    { mainAgent: true, subAgent: true, teammate: 'reviewer' },
  ]) {
    const identity = resolveIngestionSourceIdentity({
      url: 'https://api.openai.com/v1/responses',
      ...flags,
      body: { metadata: { session_id: 'api-session' } },
    }, { source: 'proxy' }, { fallbackSessionId: 'synthetic' });
    assert.equal(identity.agentRole, 'auxiliary');
  }
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

test('archive paths reversibly encode external ids and use a deterministic UTC date boundary', () => {
  const unsafeId = '../../A/user visible/会话';
  const relative = sessionArchiveRelativePath({
    sessionId: unsafeId,
    createdAt: '2026-07-14T23:30:00-08:00',
  });
  assert.match(relative, /^20260715_[a-z0-9._~-]+\.cxvsession$/);
  assert.equal(relative.includes(unsafeId), false);
  assert.equal(relative.includes('/'), false);
  const encodedSessionId = relative.slice('20260715_'.length, -'.cxvsession'.length);
  assert.equal(decodeLogStorageSegment(encodedSessionId, 'sessionId'), unsafeId);
  assert.match(threadStoreToken(unsafeId), /^t_[a-f0-9]{64}$/);
  assert.equal(hashStorageId('same'), hashStorageId('same'));
});

test('project and session storage names preserve identity without hash aliases', () => {
  const projectId = 'My Project/上海';
  const encodedProject = projectArchiveDirectoryName(projectId);
  assert.equal(decodeLogStorageSegment(encodedProject, 'projectId'), projectId);
  assert.equal(encodedProject.includes('/'), false);
  assert.equal(encodedProject.startsWith('p_'), false);
  assert.equal(sessionArchiveRelativePath({
    sessionId: 'session-123',
    createdAt: '2026-07-15T00:00:00.000Z',
  }), '20260715_session-123.cxvsession');
});

test('storage segment encoding handles traversal, reserved names, and canonical round trips', () => {
  for (const value of ['../escape', 'a/b\\c', 'CON', 'con', 'trailing.', 'emoji-🚀']) {
    const encoded = encodeLogStorageSegment(value);
    assert.equal(encoded.includes('/'), false);
    assert.equal(encoded.includes('\\'), false);
    assert.equal(decodeLogStorageSegment(encoded), value);
  }
  assert.throws(() => decodeLogStorageSegment('~2F'), /invalid storage identity storage segment/);
  assert.throws(() => decodeLogStorageSegment('~61'), /non-canonical storage identity storage segment/);
});

test('storage names reject identities that exceed the portable segment limit', () => {
  assert.throws(
    () => projectArchiveDirectoryName('x'.repeat(231)),
    /exceeds the 230-byte storage name limit/,
  );
  assert.doesNotThrow(
    () => sessionArchiveRelativePath({ sessionId: '会'.repeat(25), createdAt: '2026-07-15T00:00:00Z' }),
  );
  assert.throws(
    () => sessionArchiveRelativePath({ sessionId: '会'.repeat(26), createdAt: '2026-07-15T00:00:00Z' }),
    /exceeds the 230-byte storage name limit/,
  );
});

test('project storage names reject layout-control namespaces without changing normal names', () => {
  assert.equal(projectArchiveDirectoryName('normal-project'), 'normal-project');
  for (const projectId of [
    'v2',
    'runtime',
    'plugins',
    '.log-v2-layout-migration.active',
    '.log-v2-layout-migration.staging',
    '.log-v2-layout-migration.receipt.json',
    '.log-v2-layout-migration.future',
    'projects.layout-v1-backup-20260716T000000Z-deadbeef',
  ]) {
    assert.throws(() => projectArchiveDirectoryName(projectId), /reserved log layout name/);
  }
});
