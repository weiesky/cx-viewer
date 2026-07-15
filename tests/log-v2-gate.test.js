import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { LogV2WriteCoordinator } from '../lib/log-v2/dual-write.js';
import { createC1Gate, loadC1GateFile, writeC1GateFile } from '../lib/log-v2/gate.js';

function passingReport() {
  return {
    ok: true,
    gate: 'c1-readiness',
    projectId: 'project',
    thresholds: { minSessions: 1, minEvents: 1, minObservationHours: 0 },
    summary: { sessions: 1, passedSessions: 1, failedSessions: 0, committedEvents: 1, observationHours: 1, discoveryErrors: 0 },
    sessions: [{
      ok: true,
      status: 'passed',
      projectId: 'project',
      sessionId: 'observed-session',
      committedEvents: 1,
      v1Events: 1,
      v2Events: 1,
    }],
    generatedAt: '2026-07-14T00:00:00.000Z',
  };
}

test('C1 gate is created only from passing evidence and is root/expiry scoped', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-gate-'));
  const other = mkdtempSync(join(tmpdir(), 'cxv-v2-gate-other-'));
  try {
    const file = join(root, 'c1-gate.json');
    assert.throws(() => createC1Gate({ ...passingReport(), ok: false }, { logDir: root }), /passing/);
    const gate = writeC1GateFile(file, passingReport(), {
      logDir: root,
      now: '2026-07-14T01:00:00.000Z',
      maxAgeHours: 24,
    });
    assert.equal(existsSync(file), true);
    assert.deepEqual(gate.approvedProjects, ['project']);
    assert.match(gate.evidenceDigest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(loadC1GateFile(file, { logDir: root, now: '2026-07-15T00:59:59.000Z' }).kind, gate.kind);
    assert.throws(() => loadC1GateFile(file, { logDir: root, now: '2026-07-15T01:00:01.000Z' }), /expired/);
    assert.throws(() => loadC1GateFile(file, { logDir: other, now: '2026-07-14T02:00:00.000Z' }), /logRoot/);
    const tampered = JSON.parse(readFileSync(file, 'utf8'));
    tampered.approvedProjects.push('unobserved-project');
    writeFileSync(file, JSON.stringify(tampered));
    assert.throws(() => loadC1GateFile(file, { logDir: root, now: '2026-07-14T02:00:00.000Z' }), /gateDigest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  }
});

test('primary coordinator requests durable writers and rejects projects outside its gate', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-primary-coordinator-'));
  try {
    let opened = null;
    const coordinator = new LogV2WriteCoordinator({
      rootDir: root,
      durability: 'durable',
      allowedProjectIds: ['project'],
      authority: 'primary',
      minFreeBytes: 0,
      minFreePercent: 0,
      writerFactory(options) {
        opened = options;
        return { append: () => ({ written: true, seq: 1, entryKey: 'entry' }) };
      },
    });
    const entry = { timestamp: '2026-07-14T01:00:00.000Z', url: 'codex://primary' };
    assert.equal(coordinator.writeEntry(entry, {
      source: 'sdk', cwd: '/workspace/project', projectId: 'project', sessionId: 'sdk-1', threadId: 'sdk-1',
    }).written, true);
    assert.equal(opened.durability, 'durable');
    assert.equal(coordinator.snapshot().authority, 'primary');
    assert.throws(() => coordinator.writeEntry(entry, {
      source: 'sdk', cwd: '/workspace/other', projectId: 'other', sessionId: 'sdk-2', threadId: 'sdk-2',
    }), /not approved/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 primary startup requires a gate and writes durable V2 before rollback projection', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-primary-process-'));
  const logs = join(root, 'logs');
  const project = join(root, 'project');
  const gateFile = join(root, 'gate.json');
  try {
    // Gate root must exist and exactly match runtime CXV_LOG_DIR.
    mkdirSync(logs, { recursive: true });
    mkdirSync(project, { recursive: true });
    writeC1GateFile(gateFile, passingReport(), { logDir: logs, maxAgeHours: 24 });
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;

    const rejected = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(interceptorUrl)})`], {
      cwd: project,
      env: { ...process.env, CXV_TEST: '1', CXV_LOG_DIR: logs, CXV_LOG_WRITE_MODE: 'v2', CXV_LOG_READ_MODE: 'v2' },
      encoding: 'utf8',
      timeout: 15_000,
    });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /GATE_FILE|C1 gate/);

    const script = `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      await mod._initPromise;
      const result = mod.appendLogEntry({
        timestamp: '2026-07-14T02:00:00.000Z', project: 'project', url: 'codex://primary',
        method: 'POST', headers: {}, body: { value: 1 },
        response: { status: 200, headers: {}, body: { ok: true } }, mainAgent: false,
      }, { source: 'proxy', cwd: ${JSON.stringify(project)}, projectId: 'project' });
      console.log(JSON.stringify({
        written: result.written,
        projection: result.projectionV1?.written,
        sessionDir: result.sessionDir,
        status: mod.getLogV2RuntimeStatus(),
      }));
      process.exit(0);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: project,
      env: {
        ...process.env,
        CXV_TEST: '1',
        CXV_LOG_DIR: logs,
        CXV_LOG_WRITE_MODE: 'v2',
        CXV_LOG_READ_MODE: 'v2',
        CXV_LOG_V2_GATE_FILE: gateFile,
        CXV_LOG_V2_MIN_FREE_BYTES: '0',
        CXV_LOG_V2_MIN_FREE_PERCENT: '0',
        CXV_WORKSPACE_MODE: '0',
      },
      encoding: 'utf8',
      timeout: 20_000,
    });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.equal(output.written, true);
    assert.equal(output.projection, true);
    assert.equal(output.status.config.writeMode, 'v2');
    assert.equal(output.status.config.gateFile, '[configured]');
    assert.deepEqual(output.status.gate.approvedProjects, ['project']);
    assert.equal(output.status.writer.sources.proxy, 1);
    assert.deepEqual(output.status.projectionV1, {
      enabled: true,
      attempted: 1,
      written: 1,
      compacted: 0,
      failed: 0,
      lastError: null,
    });
    assert.equal(existsSync(join(output.sessionDir, 'timeline.jsonl')), true);
    const timeline = JSON.parse(readFileSync(join(output.sessionDir, 'timeline.jsonl'), 'utf8').trim());
    assert.equal(timeline.legacyRef, null);

    const noProjectionScript = `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      await mod._initPromise;
      const result = mod.appendLogEntry({
        timestamp: '2026-07-14T02:01:00.000Z', project: 'project', url: 'codex://primary-no-v1',
        method: 'POST', headers: {}, body: { value: 2 },
        response: { status: 200, headers: {}, body: { ok: true } }, mainAgent: false,
      }, { source: 'proxy', cwd: ${JSON.stringify(project)}, projectId: 'project' });
      console.log(JSON.stringify({ result, status: mod.getLogV2RuntimeStatus() }));
      process.exit(0);
    `;
    const noProjection = spawnSync(process.execPath, ['--input-type=module', '-e', noProjectionScript], {
      cwd: project,
      env: {
        ...process.env,
        CXV_TEST: '1',
        CXV_LOG_DIR: logs,
        CXV_LOG_WRITE_MODE: 'v2',
        CXV_LOG_READ_MODE: 'v2',
        CXV_LOG_V2_GATE_FILE: gateFile,
        CXV_LOG_V2_PROJECT_V1: '0',
        CXV_LOG_V2_MIN_FREE_BYTES: '0',
        CXV_LOG_V2_MIN_FREE_PERCENT: '0',
        CXV_WORKSPACE_MODE: '0',
      },
      encoding: 'utf8',
      timeout: 20_000,
    });
    assert.equal(noProjection.status, 0, noProjection.stderr);
    const noProjectionOutput = JSON.parse(noProjection.stdout.trim().split('\n').at(-1));
    assert.equal(noProjectionOutput.result.written, true);
    assert.equal('projectionV1' in noProjectionOutput.result, false);
    assert.deepEqual(noProjectionOutput.status.projectionV1, {
      enabled: false,
      attempted: 0,
      written: 0,
      compacted: 0,
      failed: 0,
      lastError: null,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
