import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  _parseAppServerServerMessageForTests,
  _parseAppServerClientMessageForTests,
  _resetAppServerBridgeForTests,
  _writeAppServerEntryForTests,
} from '../lib/appserver-bridge.js';
import { dispatchLogWrite, LogV2WriteCoordinator } from '../lib/log-v2/dual-write.js';
import { projectArchiveDirectoryName } from '../lib/log-v2/identity.js';
import { inspectSessionArchive } from '../lib/log-v2/inspect.js';
import { findActiveV2SessionFile, findLatestV2SessionFile, listV2LocalLogs, materializeSessionArchive, resolveV2SessionFile } from '../lib/log-v2/materializer.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

function entry(timestamp = '2026-07-14T08:00:00.000Z') {
  return {
    timestamp,
    url: 'https://chatgpt.com/backend-api/codex/responses',
    body: { input: [{ type: 'message', text: 'hello' }] },
    response: { status: 200, headers: {}, body: { content: [] } },
  };
}

test('dual dispatcher completes authoritative V1 before V2 and isolates shadow failure', () => {
  const order = [];
  const success = dispatchLogWrite({
    mode: 'dual',
    writeV1() {
      order.push('v1');
      return { written: true, logFile: '/logs/v1.jsonl', offset: 10, bytes: 20 };
    },
    writeV2(v1) {
      order.push(`v2:${v1.offset}`);
      return { written: true, seq: 1 };
    },
  });
  assert.deepEqual(order, ['v1', 'v2:10']);
  assert.equal(success.written, true);
  assert.equal(success.shadowV2.seq, 1);

  let attemptedV2 = false;
  const skipped = dispatchLogWrite({
    mode: 'dual',
    writeV1: () => ({ written: false }),
    writeV2: () => { attemptedV2 = true; },
  });
  assert.equal(skipped.written, false);
  assert.equal(attemptedV2, false);

  const isolated = dispatchLogWrite({
    mode: 'dual',
    writeV1: () => ({ written: true, bytes: 12 }),
    writeV2: () => { throw new Error('shadow unavailable'); },
  });
  assert.equal(isolated.written, true);
  assert.equal(isolated.shadowV2.written, false);
  assert.match(isolated.shadowV2.error.message, /shadow unavailable/);
});

test('V2 coordinator advances the durable latest-session pointer when activity returns to an older session', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-active-session-'));
  try {
    const coordinator = new LogV2WriteCoordinator({ rootDir: root, minFreeBytes: 0, minFreePercent: 0 });
    const context = (sessionId) => ({
      source: 'app-server',
      cwd: '/workspace/project',
      projectId: 'project',
      thread: { id: sessionId, sessionId },
    });
    const first = coordinator.writeAppServerEntry(entry('2026-07-14T08:00:00.000Z'), context('session-one'));
    coordinator.writeAppServerEntry(entry('2026-07-14T09:00:00.000Z'), context('session-two'));
    coordinator.writeAppServerEntry(entry('2026-07-14T10:00:00.000Z'), context('session-one'));
    coordinator.writeAppServerEntry({
      ...entry('2026-07-14T11:00:00.000Z'),
      url: 'codex://warning/deprecationNotice',
      mainAgent: false,
    }, {
      source: 'app-server',
      cwd: '/workspace/project',
      projectId: 'project',
      thread: {},
    });
    coordinator.writeEntry({
      ...entry('2026-07-14T12:00:00.000Z'),
      mainAgent: true,
    }, {
      source: 'proxy',
      cwd: '/workspace/project',
      projectId: 'project',
      sessionId: 'proxy-mirror',
      threadId: 'proxy-mirror',
    });

    assert.equal(
      findLatestV2SessionFile(root, { projectId: 'project', canonicalCwd: '/workspace/project' }),
      relative(root, join(first.sessionDir, 'timeline.jsonl')).split(sep).join('/'),
    );
    assert.equal(coordinator.snapshot().lastConversationLocator.sessionId, 'session-one');
    assert.equal(coordinator.snapshot().lastLocator.sessionId, 'proxy-mirror');
    assert.equal(coordinator.snapshot().lastConversationLocator.source, 'app-server');
    const projectManifest = JSON.parse(readFileSync(join(
      root,
      projectArchiveDirectoryName('project'),
      'project.json',
    ), 'utf8'));
    assert.equal(projectManifest.latestSessionId, 'session-one');
    assert.equal(findActiveV2SessionFile(root, {
      runtime: { config: { writeMode: 'v2' }, writer: coordinator.snapshot() },
      projectId: 'project',
      canonicalCwd: '/workspace/project',
    }), relative(root, join(first.sessionDir, 'timeline.jsonl')).split(sep).join('/'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 project pointer remains authoritative across independent coordinators', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-multi-runtime-latest-'));
  try {
    const firstRuntime = new LogV2WriteCoordinator({ rootDir: root, minFreeBytes: 0, minFreePercent: 0 });
    const secondRuntime = new LogV2WriteCoordinator({ rootDir: root, minFreeBytes: 0, minFreePercent: 0 });
    const appContext = (sessionId) => ({
      source: 'app-server', cwd: '/workspace/project', projectId: 'project',
      thread: { id: sessionId, sessionId },
    });
    const projectManifestPath = join(
      root, projectArchiveDirectoryName('project'), 'project.json',
    );
    const latest = () => JSON.parse(readFileSync(projectManifestPath, 'utf8')).latestSessionId;

    firstRuntime.writeAppServerEntry(entry('2026-07-14T08:00:00.000Z'), appContext('session-one'));
    secondRuntime.writeEntry({ ...entry('2026-07-14T09:00:00.000Z'), mainAgent: true }, {
      source: 'proxy', cwd: '/workspace/project', projectId: 'project',
      sessionId: 'proxy-mirror', threadId: 'proxy-mirror',
    });
    assert.equal(latest(), 'session-one');

    secondRuntime.writeAppServerEntry(entry('2026-07-14T10:00:00.000Z'), appContext('session-two'));
    assert.equal(latest(), 'session-two');
    // firstRuntime still remembers session-one locally; the locked disk check
    // must nevertheless advance the pointer when that session becomes active.
    firstRuntime.writeAppServerEntry(entry('2026-07-14T11:00:00.000Z'), appContext('session-one'));
    assert.equal(latest(), 'session-one');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 coordinator routes root and child entries by authoritative Thread.sessionId', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-dual-'));
  try {
    const coordinator = new LogV2WriteCoordinator({ rootDir: root });
    const rootContext = {
      source: 'app-server',
      cwd: '/workspace/project',
      projectId: 'project',
      thread: { id: 'session-1', sessionId: 'session-1' },
    };
    const childContext = {
      ...rootContext,
      thread: { id: 'child-1', sessionId: 'session-1', parentThreadId: 'session-1' },
    };
    const first = coordinator.writeAppServerEntry(entry(), rootContext, {
      written: true,
      logFile: join(root, 'project', 'legacy.jsonl'),
      offset: 40,
      bytes: 80,
    });
    const second = coordinator.writeAppServerEntry(entry('2026-07-14T08:01:00.000Z'), childContext, {
      written: true,
      logFile: join(root, 'project', 'legacy.jsonl'),
      offset: 120,
      bytes: 90,
    });
    assert.equal(first.sessionDir, second.sessionDir);
    const report = inspectSessionArchive(first.sessionDir);
    assert.equal(report.ok, true);
    assert.equal(report.committedEvents, 2);
    assert.equal(report.threadCount, 2);
    const timeline = readFileSync(join(first.sessionDir, 'timeline.jsonl'), 'utf8')
      .trim().split('\n').map(JSON.parse);
    assert.deepEqual(timeline.map((record) => record.legacyRef.offset), [40, 120]);
    assert.deepEqual(timeline.map((record) => record.legacyRef.logFile), [
      'project/legacy.jsonl',
      'project/legacy.jsonl',
    ]);
    assert.equal(coordinator.snapshot().failed, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 coordinator refuses missing session identity without affecting its caller contract', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-missing-session-'));
  try {
    const coordinator = new LogV2WriteCoordinator({ rootDir: root });
    assert.throws(() => coordinator.writeAppServerEntry(entry(), {
      source: 'app-server',
      cwd: '/workspace/project',
      thread: { id: 'thread-only' },
    }), /thread\.sessionId/);
    const failed = coordinator.snapshot();
    assert.equal(failed.failed, 1);
    assert.equal(failed.lastError, 'thread.sessionId is required');
    assert.equal(failed.lastFailure.at.length > 0, true);
    assert.equal(failed.lastFailure.attempt, 1);
    assert.equal(failed.lastFailure.code, null);
    assert.equal(failed.lastFailure.message, 'thread.sessionId is required');
    assert.equal(failed.lastFailure.source, 'app-server');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('sessionless App Server global events use a scoped synthetic auxiliary session', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-app-server-global-'));
  try {
    const coordinator = new LogV2WriteCoordinator({
      rootDir: root,
      runtimeId: 'runtime-global',
      minFreeBytes: 0,
      minFreePercent: 0,
    });
    const result = coordinator.writeAppServerEntry({
      ...entry(),
      url: 'codex://warning/deprecationNotice',
      method: 'EVENT',
      _appServerSource: true,
      // Codex may attach a non-authoritative startup placeholder even though
      // no native Thread metadata exists yet.
      _agentThreadId: 'root',
      mainAgent: false,
    }, {
      source: 'app-server',
      cwd: '/workspace/project',
      projectId: 'project',
      thread: {},
    });
    const manifest = JSON.parse(readFileSync(join(result.sessionDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.source, 'app-server-global');
    assert.equal(manifest.sessionId.startsWith('synthetic:app-server-global:runtime-global:'), true);
    assert.deepEqual(coordinator.snapshot().sources, { 'app-server-global': 1 });
    assert.equal(inspectSessionArchive(result.sessionDir).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('thread-scoped App Server subagent warnings stay in the parent session', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-app-server-subagent-warning-'));
  try {
    const coordinator = new LogV2WriteCoordinator({
      rootDir: root,
      runtimeId: 'runtime-subagent-warning',
      minFreeBytes: 0,
      minFreePercent: 0,
    });
    const result = coordinator.writeAppServerEntry({
      ...entry(),
      url: 'codex://warning/warning',
      method: 'EVENT',
      _appServerSource: true,
      _agentThreadId: 'child-thread',
      _parentThreadId: 'root-session',
      mainAgent: false,
      subAgent: true,
    }, {
      source: 'app-server',
      cwd: '/workspace/project',
      projectId: 'project',
      thread: {
        id: 'child-thread',
        sessionId: 'root-session',
        parentThreadId: 'root-session',
      },
    });
    const manifest = JSON.parse(readFileSync(join(result.sessionDir, 'manifest.json'), 'utf8'));
    const timeline = readFileSync(join(result.sessionDir, 'timeline.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    assert.equal(manifest.source, 'app-server');
    assert.equal(manifest.sessionId, 'root-session');
    assert.equal(manifest.rootThreadId, 'root-session');
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0].threadId, 'child-thread');
    assert.equal(timeline[0].parentThreadId, 'root-session');
    assert.equal(timeline[0].agentRole, 'subagent');
    assert.deepEqual(coordinator.snapshot().sources, { 'app-server': 1 });
    assert.equal(inspectSessionArchive(result.sessionDir).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 coordinator retains the last failure diagnostic after a later write recovers', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-recovered-failure-'));
  try {
    let fail = true;
    const coordinator = new LogV2WriteCoordinator({
      rootDir: root,
      minFreeBytes: 0,
      minFreePercent: 0,
      writerFactory(options) {
        if (fail) {
          fail = false;
          const error = new Error('transient writer failure');
          error.code = 'CXV_TEST_TRANSIENT';
          throw error;
        }
        return LogV2Writer.open(options);
      },
    });
    const context = {
      source: 'app-server',
      cwd: '/workspace/project',
      projectId: 'project',
      thread: { id: 'session-1', sessionId: 'session-1' },
    };
    assert.throws(() => coordinator.writeAppServerEntry(entry(), context), /transient writer failure/);
    coordinator.writeAppServerEntry(entry('2026-07-14T08:01:00.000Z'), context);

    const recovered = coordinator.snapshot();
    assert.equal(recovered.attempted, 2);
    assert.equal(recovered.written, 1);
    assert.equal(recovered.failed, 1);
    assert.equal(recovered.lastError, null);
    assert.deepEqual({
      attempt: recovered.lastFailure.attempt,
      code: recovered.lastFailure.code,
      message: recovered.lastFailure.message,
      source: recovered.lastFailure.source,
    }, {
      attempt: 1,
      code: 'CXV_TEST_TRANSIENT',
      message: 'transient writer failure',
      source: 'app-server',
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 coordinator gives SDK, OTel, and Proxy explicit scoped session boundaries', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-r3-sources-'));
  try {
    const coordinator = new LogV2WriteCoordinator({
      rootDir: root,
      runtimeId: 'runtime-test',
      minFreeBytes: 0,
      minFreePercent: 0,
    });
    const base = { cwd: '/workspace/project', projectId: 'project' };
    coordinator.writeEntry(entry('2026-07-14T08:00:00.000Z'), {
      ...base, source: 'sdk', sessionId: 'sdk-thread', threadId: 'sdk-thread',
    });
    coordinator.writeEntry({ ...entry('2026-07-14T08:01:00.000Z'), _otelSessionId: 'otel-process', _otelTraceId: 'trace-1' }, {
      ...base, source: 'otel',
    });
    coordinator.writeEntry({ ...entry('2026-07-14T08:02:00.000Z'), _otelSessionId: 'otel-process', _otelTraceId: 'trace-2' }, {
      ...base, source: 'otel',
    });
    coordinator.writeEntry(entry('2026-07-14T08:03:00.000Z'), { ...base, source: 'proxy' });
    coordinator.writeEntry(entry('2026-07-14T08:04:00.000Z'), { ...base, source: 'proxy' });

    const logs = listV2LocalLogs(root).project;
    assert.equal(logs.length, 3);
    const archives = logs.map((log) => {
      const { sessionDir } = resolveV2SessionFile(root, log.file);
      return materializeSessionArchive(sessionDir);
    });
    const sdk = archives.find((archive) => archive.manifest.source === 'sdk');
    const otel = archives.find((archive) => archive.manifest.source === 'otel');
    const proxy = archives.find((archive) => archive.manifest.source === 'proxy');
    assert.equal(sdk.manifest.sessionId, 'sdk-thread');
    assert.equal(sdk.committedEvents, 1);
    assert.equal(otel.manifest.sessionId, 'otel-process');
    assert.equal(otel.committedEvents, 2);
    assert.deepEqual(otel.records.map((record) => record.threadId), ['trace-1', 'trace-2']);
    assert.match(proxy.manifest.sessionId, /^synthetic:proxy:runtime-test:[a-f0-9]{24}$/);
    assert.equal(proxy.committedEvents, 2);
    assert.deepEqual(coordinator.snapshot().sources, { sdk: 1, otel: 2, proxy: 2 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Codex proxy subagent Responses share the authoritative App Server session archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-proxy-subagent-session-'));
  try {
    const coordinator = new LogV2WriteCoordinator({
      rootDir: root,
      runtimeId: 'runtime-proxy-subagent',
      minFreeBytes: 0,
      minFreePercent: 0,
    });
    const appResult = coordinator.writeAppServerEntry(entry(), {
      source: 'app-server',
      cwd: '/workspace/project',
      projectId: 'project',
      thread: { id: 'root-session', sessionId: 'root-session' },
    });
    const proxyResult = coordinator.writeEntry({
      ...entry('2026-07-14T08:01:00.000Z'),
      subAgent: true,
      body: {
        ...entry().body,
        client_metadata: {
          session_id: 'root-session',
          thread_id: 'child-thread',
          'x-codex-parent-thread-id': 'root-session',
        },
      },
    }, {
      source: 'proxy',
      cwd: '/workspace/project',
      projectId: 'project',
    });
    assert.equal(proxyResult.sessionDir, appResult.sessionDir);
    const materialized = materializeSessionArchive(appResult.sessionDir);
    assert.equal(materialized.manifest.sessionId, 'root-session');
    assert.deepEqual(materialized.records.map(record => record.threadId), [
      'root-session',
      'child-thread',
    ]);
    assert.equal(materialized.records[1].parentThreadId, 'root-session');
    assert.equal(materialized.records[1].agentRole, 'subagent');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('App Server bridge forwards the native Thread object as non-persisted write context', () => {
  let captured = null;
  _resetAppServerBridgeForTests({
    logFile: '/tmp/cxv-v2-context.jsonl',
    cwd: '/workspace/project',
    project: 'project',
    writeLogEntry(_entry, context) {
      captured = context;
      return { written: true };
    },
  });
  _parseAppServerServerMessageForTests({
    method: 'thread/started',
    params: { thread: { id: 'thread-1', sessionId: 'session-1', cwd: '/workspace/project' } },
  });
  _writeAppServerEntryForTests({
    timestamp: '2026-07-14T08:00:00.000Z',
    url: 'codex://event/test',
    _agentThreadId: 'thread-1',
  });
  assert.equal(captured.source, 'app-server');
  assert.equal(captured.thread.id, 'thread-1');
  assert.equal(captured.thread.sessionId, 'session-1');
  assert.equal(captured.cwd, '/workspace/project');
});

test('App Server collaboration activity supplies child Session context before a full Thread notification', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-bridge-subagent-context-'));
  try {
    const coordinator = new LogV2WriteCoordinator({
      rootDir: root,
      runtimeId: 'runtime-bridge-subagent',
      minFreeBytes: 0,
      minFreePercent: 0,
    });
    _resetAppServerBridgeForTests({
      logFile: join(root, 'projection.jsonl'),
      cwd: '/workspace/project',
      project: 'project',
      writeLogEntry(entryValue, context) {
        return coordinator.writeAppServerEntry(entryValue, context);
      },
    });
    _parseAppServerServerMessageForTests({
      method: 'thread/started',
      params: {
        thread: {
          id: 'root-session',
          sessionId: 'root-session',
          cwd: '/workspace/project',
        },
      },
    });
    _parseAppServerServerMessageForTests({
      method: 'item/completed',
      params: {
        threadId: 'root-session',
        turnId: 'root-turn',
        item: {
          id: 'spawn-child',
          type: 'subAgentActivity',
          kind: 'started',
          agentThreadId: 'child-thread',
          agentPath: '/root/log-probe',
        },
      },
    });
    _parseAppServerServerMessageForTests({
      method: 'warning',
      params: {
        threadId: 'child-thread',
        message: 'child warning',
      },
    });

    const projectLogs = listV2LocalLogs(root).project;
    assert.equal(projectLogs.length, 1);
    const { sessionDir } = resolveV2SessionFile(root, projectLogs[0].file);
    const materialized = materializeSessionArchive(sessionDir);
    assert.equal(materialized.manifest.source, 'app-server');
    assert.equal(materialized.manifest.sessionId, 'root-session');
    const childIndex = materialized.records.findIndex(record => record.threadId === 'child-thread');
    const childRecord = materialized.records[childIndex];
    assert.equal(childRecord?.parentThreadId, 'root-session');
    assert.equal(childRecord?.agentRole, 'subagent');
    assert.equal(materialized.entries[childIndex]?.url, 'codex://warning/warning');
    assert.equal(materialized.entries[childIndex]?.subAgent, false);
    assert.equal(materialized.entries[childIndex]?.subAgentName, undefined);
    assert.deepEqual(coordinator.snapshot().sources, { 'app-server': 2 });
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(root, { recursive: true, force: true });
  }
});

test('App Server bridge carries thread/start clear lifecycle into later write context', () => {
  let captured = null;
  _resetAppServerBridgeForTests({
    logFile: '/tmp/cxv-v2-clear-context.jsonl',
    cwd: '/workspace/project',
    project: 'project',
    writeLogEntry(_entry, context) {
      captured = context;
      return { written: true };
    },
  });
  _parseAppServerServerMessageForTests({
    method: 'thread/started',
    params: { thread: { id: 'session-1', sessionId: 'session-1' } },
  });
  _parseAppServerClientMessageForTests({
    id: 91,
    method: 'thread/start',
    params: { cwd: '/workspace/project', sessionStartSource: 'clear' },
  });
  _parseAppServerServerMessageForTests({
    id: 91,
    result: { thread: { id: 'session-2', sessionId: 'session-2' } },
  });
  // A later bare notification must not erase the request-derived lifecycle.
  _parseAppServerServerMessageForTests({
    method: 'thread/started',
    params: { thread: { id: 'session-2', sessionId: 'session-2' } },
  });
  _writeAppServerEntryForTests({
    timestamp: '2026-07-14T09:00:00.000Z',
    url: 'codex://event/after-clear',
    _agentThreadId: 'session-2',
  });
  assert.equal(captured.thread.sessionStartSource, 'clear');
  assert.equal(captured.thread.previousSessionId, 'session-1');
});

test('disk watermark and consecutive failures open a restart-scoped V2 fuse', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-fuse-'));
  try {
    let created = 0;
    const lowDisk = new LogV2WriteCoordinator({
      rootDir: root,
      capacityProbe: () => ({ freeBytes: 10, totalBytes: 100, freePercent: 10 }),
      minFreeBytes: 20,
      minFreePercent: 5,
      writerFactory: () => { created++; },
      onDegraded: () => {},
    });
    const context = {
      cwd: '/workspace/project',
      projectId: 'project',
      thread: { id: 'session-1', sessionId: 'session-1' },
    };
    assert.throws(() => lowDisk.writeAppServerEntry(entry(), context), /disk watermark/);
    assert.throws(() => lowDisk.writeAppServerEntry(entry(), context), /circuit is open/);
    assert.equal(created, 0);
    assert.equal(lowDisk.snapshot().circuitOpen, true);
    assert.equal(lowDisk.snapshot().skipped, 1);

    const failing = new LogV2WriteCoordinator({
      rootDir: root,
      capacityProbe: () => ({ freeBytes: 100, totalBytes: 100, freePercent: 100 }),
      minFreeBytes: 0,
      minFreePercent: 0,
      failureLimit: 2,
      writerFactory: () => { throw new Error('writer broken'); },
      onDegraded: () => {},
    });
    assert.throws(() => failing.writeAppServerEntry(entry(), context), /writer broken/);
    assert.throws(() => failing.writeAppServerEntry(entry(), context), /writer broken/);
    assert.throws(() => failing.writeAppServerEntry(entry(), context), /circuit is open/);
    assert.equal(failing.snapshot().failed, 2);
    assert.equal(failing.snapshot().skipped, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('interceptor dual mode writes V1 first and a linked V2 shadow in a fresh process', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-interceptor-'));
  const project = join(root, 'project');
  const logs = join(root, 'logs');
  try {
    mkdirSync(project, { recursive: true });
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;
    const source = `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      await mod._initPromise;
      const entry = {
        timestamp: '2026-07-14T08:00:00.000Z',
        url: 'https://chatgpt.com/backend-api/codex/responses',
        method: 'POST',
        headers: {},
        body: { input: [{ type: 'message', text: 'integration' }] },
        response: { status: 200, headers: {}, body: { content: [] } },
        mainAgent: true,
      };
      const result = mod.appendLogEntry(entry, {
        source: 'app-server',
        cwd: ${JSON.stringify(project)},
        projectId: 'project',
        thread: { id: 'session-integration', sessionId: 'session-integration' },
      });
      console.log(JSON.stringify({
        written: result.written,
        v1File: result.logFile,
        v1Offset: result.offset,
        v2Written: result.shadowV2?.written,
        sessionDir: result.shadowV2?.sessionDir,
        seq: result.shadowV2?.seq,
      }));
      process.exit(0);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: project,
      env: {
        ...process.env,
        CXV_LOG_DIR: logs,
        CXV_LOG_WRITE_MODE: 'dual',
        CXV_LOG_READ_MODE: 'v1',
        CXV_LOG_V2_MIN_FREE_BYTES: '0',
        CXV_LOG_V2_MIN_FREE_PERCENT: '0',
        CXV_WORKSPACE_MODE: '0',
      },
      encoding: 'utf8',
      timeout: 15_000,
    });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.equal(output.written, true, JSON.stringify(output));
    assert.equal(output.v2Written, true);
    assert.equal(output.v1Offset, 0);
    assert.equal(output.seq, 1);
    assert.equal(existsSync(output.v1File), true);
    assert.equal(existsSync(join(output.sessionDir, 'timeline.jsonl')), true);
    assert.equal(inspectSessionArchive(output.sessionDir).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('R3 sources dual-write parity-linked sessions through the interceptor', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-r3-interceptor-'));
  const project = join(root, 'project');
  const logs = join(root, 'logs');
  try {
    mkdirSync(project, { recursive: true });
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;
    const parityUrl = pathToFileURL(fileURLToPath(new URL('../lib/log-v2/parity.js', import.meta.url))).href;
    const source = `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      const { auditLogV2Readiness } = await import(${JSON.stringify(parityUrl)});
      await mod._initPromise;
      const make = (timestamp, suffix) => ({
        timestamp,
        project: 'project',
        url: 'codex://r3/' + suffix,
        method: 'POST',
        headers: {},
        body: { value: suffix },
        response: { status: 200, headers: {}, body: { content: suffix } },
        mainAgent: false,
      });
      const proxy = mod.appendLogEntry(make('2026-07-14T08:00:00.000Z', 'proxy'), {
        source: 'proxy', cwd: ${JSON.stringify(project)}, projectId: 'project',
      });
      const sdkEntry = make('2026-07-14T08:01:00.000Z', 'sdk');
      sdkEntry._sdkSource = true;
      sdkEntry.body.metadata = { thread_id: 'sdk-thread', cwd: ${JSON.stringify(project)}, sdk: 'openai-codex-sdk' };
      const sdk = mod.appendLogEntry(sdkEntry, {
        source: 'sdk', cwd: ${JSON.stringify(project)}, projectId: 'project', sessionId: 'sdk-thread', threadId: 'sdk-thread',
      });
      const otelEntry = make('2026-07-14T08:02:00.000Z', 'otel');
      otelEntry._otelSource = true;
      otelEntry._otelSessionId = 'otel-process';
      otelEntry._otelTraceId = 'trace-1';
      const otel = mod.appendLogEntry(otelEntry, {
        source: 'otel', cwd: ${JSON.stringify(project)}, projectId: 'project', sessionId: 'otel-process', threadId: 'trace-1',
      });
      const report = auditLogV2Readiness(${JSON.stringify(logs)}, {
        projectId: 'project', minSessions: 3, minEvents: 3, minObservationHours: 0,
        now: '2026-07-14T09:00:00.000Z',
      });
      console.log(JSON.stringify({
        writes: [proxy.shadowV2?.written, sdk.shadowV2?.written, otel.shadowV2?.written],
        report,
        runtime: mod.getLogV2RuntimeStatus(),
      }));
      process.exit(0);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: project,
      env: {
        ...process.env,
        CXV_TEST: '1',
        CXV_LOG_DIR: logs,
        CXV_LOG_WRITE_MODE: 'dual',
        CXV_LOG_READ_MODE: 'v1',
        CXV_LOG_V2_MIN_FREE_BYTES: '0',
        CXV_LOG_V2_MIN_FREE_PERCENT: '0',
        CXV_WORKSPACE_MODE: '0',
      },
      encoding: 'utf8',
      timeout: 20_000,
    });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.deepEqual(output.writes, [true, true, true]);
    assert.equal(output.report.ok, true, JSON.stringify(output.report));
    assert.deepEqual(output.runtime.writer.sources, { proxy: 1, sdk: 1, otel: 1 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
