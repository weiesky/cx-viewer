import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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
import { LogV2WriteCoordinator } from '../lib/log-v2/coordinator.js';
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
      runtime: { writer: coordinator.snapshot() },
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
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-routing-'));
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
    const first = coordinator.writeAppServerEntry(entry(), rootContext);
    const second = coordinator.writeAppServerEntry(entry('2026-07-14T08:01:00.000Z'), childContext);
    assert.equal(first.sessionDir, second.sessionDir);
    const report = inspectSessionArchive(first.sessionDir);
    assert.equal(report.ok, true);
    assert.equal(report.committedEvents, 2);
    assert.equal(report.threadCount, 2);
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

test('interceptor writes only V2 in a fresh process', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-interceptor-'));
  const project = join(root, 'project');
  const logs = join(root, 'logs');
  try {
    mkdirSync(project, { recursive: true });
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;
    const source = `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      const result = mod.appendLogEntry({
        timestamp: '2026-07-14T08:00:00.000Z', project: 'project', url: 'codex://v2-only',
        body: { input: [] }, response: { status: 200, headers: {}, body: { content: [] } }, mainAgent: true,
      }, { source: 'app-server', cwd: ${JSON.stringify(project)}, projectId: 'project', thread: { id: 'session', sessionId: 'session' } });
      console.log(JSON.stringify(result));
      process.exit(0);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], { cwd: project, env: { ...process.env, CXV_TEST: '1', CXV_LOG_DIR: logs, CXV_LOG_V2_MIN_FREE_BYTES: '0', CXV_LOG_V2_MIN_FREE_PERCENT: '0' }, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.equal(output.written, true);
    assert.equal(existsSync(join(output.sessionDir, 'timeline.jsonl')), true);
    assert.deepEqual(readdirSync(logs).filter(name => name.endsWith('.jsonl')), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('interceptor skips startup-only background entries before creating a V2 archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-background-only-'));
  const project = join(root, 'project');
  const logs = join(root, 'logs');
  try {
    mkdirSync(project, { recursive: true });
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;
    const source = `
      const { existsSync, readdirSync } = await import('node:fs');
      const mod = await import(${JSON.stringify(interceptorUrl)});
      let commits = 0;
      mod.setLogV2CommitListener(() => { commits++; });
      const base = {
        timestamp: '2026-07-20T13:46:20.000Z', project: 'project', method: 'GET',
        body: null, response: null, mainAgent: false, subAgent: false,
      };
      const skipped = [
        mod.appendLogEntry({ ...base, url: 'https://chatgpt.com/backend-api/codex/models?client_version=0.144.6', inProgress: true }),
        mod.appendLogEntry({ ...base, url: 'http://127.0.0.1:7008/v1/models?client_version=0.144.6', proxyUrl: 'https://chatgpt.com/backend-api/codex/models?client_version=0.144.6', response: { status: 200 } }),
        mod.appendLogEntry({ ...base, method: 'EVENT', url: 'codex://warning/deprecationNotice' }, {
          source: 'app-server', cwd: ${JSON.stringify(project)}, projectId: 'project', thread: {},
        }),
      ];
      const before = existsSync(${JSON.stringify(logs)})
        ? readdirSync(${JSON.stringify(logs)}, { recursive: true }).map(String)
        : [];
      const retained = [
        mod.appendLogEntry({ ...base, method: 'EVENT', url: 'codex://warning/warning' }, {
          source: 'app-server', cwd: ${JSON.stringify(project)}, projectId: 'project',
          thread: { thread_id: 'threaded', session_id: 'threaded' },
        }),
        mod.appendLogEntry({ ...base, method: 'POST', url: 'https://api.openai.com/v1/models' }, {
          source: 'proxy', cwd: ${JSON.stringify(project)}, projectId: 'project',
        }),
        mod.appendLogEntry({ ...base, url: 'https://api.openai.com/v1/projects/models' }, {
          source: 'proxy', cwd: ${JSON.stringify(project)}, projectId: 'project',
        }),
        mod.appendLogEntry({ ...base, url: 'https://api.openai.com/v1/models', _sdkSource: true }, {
          source: 'sdk', cwd: ${JSON.stringify(project)}, projectId: 'project',
          sessionId: 'sdk-session', threadId: 'sdk-session',
        }),
      ];
      console.log(JSON.stringify({ skipped, retained, before, commits }));
      process.exit(0);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: project,
      env: { ...process.env, CXV_TEST: '1', CXV_LOG_DIR: logs, CXV_LOG_V2_MIN_FREE_BYTES: '0', CXV_LOG_V2_MIN_FREE_PERCENT: '0' },
      encoding: 'utf8',
    });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.equal(output.before.some(name => name.includes('.cxvsession')), false);
    assert.deepEqual(output.skipped.map(result => ({
      written: result.written,
      accepted: result.accepted,
      durable: result.durable,
      skipped: result.skipped,
    })), Array(3).fill({ written: false, accepted: true, durable: true, skipped: true }));
    assert.equal(output.retained.every(result => result.written === true), true, JSON.stringify(output.retained));
    assert.equal(output.commits, output.retained.length);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('queued commit listeners receive the immutable committed entry', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-listener-'));
  const project = join(root, 'project');
  const logs = join(root, 'logs');
  try {
    mkdirSync(project, { recursive: true });
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;
    const source = `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      let observed = null;
      mod.setLogV2CommitListener(entry => { observed = entry; });
      const entry = {
        timestamp: '2026-07-14T08:00:00.000Z', project: 'project', url: 'codex://v2-listener',
        body: { input: [] }, response: { status: 200, body: { usage: { input_tokens: 7 } } }, mainAgent: true,
      };
      const result = mod.appendLogEntry(entry, {
        source: 'app-server', cwd: ${JSON.stringify(project)}, projectId: 'project',
        thread: { id: 'session', sessionId: 'session' },
      });
      entry.response = null;
      await result.completion;
      await mod.closeLogV2Writes();
      console.log(JSON.stringify({ usage: observed?.response?.body?.usage?.input_tokens }));
      process.exit(0);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: project,
      env: { ...process.env, CXV_TEST: '0', CXV_LOG_DIR: logs, CXV_LOG_V2_MIN_FREE_BYTES: '0', CXV_LOG_V2_MIN_FREE_PERCENT: '0' },
      encoding: 'utf8',
    });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout.trim().split('\n').at(-1)), { usage: 7 });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
