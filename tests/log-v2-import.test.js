import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMainAgentDeltaCompactor } from '../lib/main-agent-delta.js';
import { importV1LogFile, verifyImportedV1Log } from '../lib/log-v2/import-v1.js';
import { inspectSessionArchive } from '../lib/log-v2/inspect.js';
import {
  discoverV2SessionArchives,
  listV2LocalLogs,
  materializeSessionArchive,
  readV2LogEntries,
} from '../lib/log-v2/materializer.js';
import { auditLogV2Readiness } from '../lib/log-v2/parity.js';
import { directoryLogicalBytes, readSessionSummary } from '../lib/log-v2/session-summary.js';

function entry(timestamp, input, output) {
  return {
    timestamp,
    project: 'project',
    url: 'https://chatgpt.com/backend-api/codex/responses',
    method: 'POST',
    headers: { Authorization: 'Bearer private' },
    body: { input, metadata: { turn_id: timestamp } },
    response: {
      status: 200,
      headers: { 'set-cookie': 'private' },
      body: { content: [{ type: 'text', text: output }] },
    },
    mainAgent: true,
  };
}

function fixture(root, name = 'project_20260701_000000.jsonl') {
  const projectDir = join(root, 'project');
  mkdirSync(projectDir, { recursive: true });
  return { file: `project/${name}`, path: join(projectDir, name) };
}

function writeDeltaV1(path, entries) {
  const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'import-test' });
  for (const original of entries) {
    const stored = compactor.process(original);
    appendFileSync(path, `${JSON.stringify(stored)}\n---\n`);
    compactor.commit(original);
  }
}

test('V1 importer durably reconstructs delta logs and is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-'));
  try {
    const source = fixture(root);
    const inputs = [{ type: 'message', role: 'user', text: 'one' }];
    const entries = [
      entry('2026-07-01T00:01:00.000Z', [...inputs], 'first'),
      entry('2026-07-01T00:02:00.000Z', [...inputs, { type: 'message', role: 'user', text: 'two' }], 'second'),
    ];
    writeDeltaV1(source.path, entries);
    const first = importV1LogFile({
      logDir: root,
      file: source.file,
      projectId: 'project',
      canonicalCwd: '/workspace/project',
      now: '2026-07-14T00:00:00.000Z',
    });
    assert.equal(first.ok, true);
    assert.equal(first.imported, true);
    assert.equal(first.entryCount, 2);
    const firstReceipt = JSON.parse(readFileSync(join(first.sessionDir, 'import.json'), 'utf8'));
    assert.equal(firstReceipt.durability, 'batched-fsync');
    assert.ok(firstReceipt.syncedFiles > 0);
    const archive = materializeSessionArchive(first.sessionDir);
    assert.equal(archive.manifest.source, 'legacy-import');
    assert.equal(archive.manifest.startReason, 'legacy');
    assert.equal(archive.entries[1].body.input.length, 2);
    assert.equal(archive.entries[0].headers.Authorization, '[REDACTED]');
    const summary = readSessionSummary(first.sessionDir);
    assert.deepEqual(summary.userPrompts.map(prompt => prompt.text), ['one', 'two']);
    assert.equal(summary.archiveBytes, directoryLogicalBytes(first.sessionDir));
    assert.deepEqual(listV2LocalLogs(root).project[0].preview, ['one', 'two']);

    const second = importV1LogFile({
      logDir: root,
      file: source.file,
      projectId: 'project',
      canonicalCwd: '/workspace/project',
    });
    assert.equal(second.imported, false);
    assert.equal(materializeSessionArchive(second.sessionDir).committedEvents, 2);
    assert.equal(verifyImportedV1Log({ logDir: root, file: source.file, sessionDir: second.sessionDir }).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V1 importer rebuilds an archive that has commits but no durable receipt', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-resume-'));
  try {
    const source = fixture(root);
    writeDeltaV1(source.path, [entry('2026-07-01T00:01:00.000Z', [], 'one')]);
    const first = importV1LogFile({
      logDir: root, file: source.file, projectId: 'project', canonicalCwd: '/workspace/project',
    });
    unlinkSync(join(first.sessionDir, 'import.json'));
    const interruptedDiscovery = discoverV2SessionArchives(root, { projectId: 'project' });
    assert.equal(interruptedDiscovery.archives.length, 0);
    assert.equal(interruptedDiscovery.errors.length, 1);
    assert.match(interruptedDiscovery.errors[0].error, /import\.json is missing/);
    assert.equal(listV2LocalLogs(root).project, undefined);
    assert.throws(() => materializeSessionArchive(first.sessionDir), /import\.json is missing/);
    assert.equal(inspectSessionArchive(first.sessionDir).ok, false);
    assert.match(inspectSessionArchive(first.sessionDir).errors[0], /import\.json is missing/);
    const timelineFile = interruptedDiscovery.errors[0].path.replace(/\\/g, '/');
    assert.throws(() => readV2LogEntries(root, `${timelineFile}/timeline.jsonl`), /import\.json is missing/);
    const rebuilt = importV1LogFile({
      logDir: root, file: source.file, projectId: 'project', canonicalCwd: '/workspace/project',
    });
    assert.equal(rebuilt.imported, true);
    assert.equal(rebuilt.entryCount, 1);
    assert.equal(verifyImportedV1Log({ logDir: root, file: source.file, sessionDir: rebuilt.sessionDir }).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('legacy import discovery rejects a receipt whose identity does not match its manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-receipt-'));
  try {
    const source = fixture(root);
    writeDeltaV1(source.path, [entry('2026-07-01T00:01:00.000Z', [], 'one')]);
    const imported = importV1LogFile({
      logDir: root, file: source.file, projectId: 'project', canonicalCwd: '/workspace/project',
    });
    const receiptPath = join(imported.sessionDir, 'import.json');
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    writeFileSync(receiptPath, JSON.stringify({ ...receipt, sessionId: 'legacy-import:wrong' }));
    const discovery = discoverV2SessionArchives(root, { projectId: 'project' });
    assert.equal(discovery.archives.length, 0);
    assert.match(discovery.errors[0].error, /identity does not match/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('legacy import reads reject a receipt count that no longer matches its timeline', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-count-'));
  try {
    const source = fixture(root);
    writeDeltaV1(source.path, [entry('2026-07-01T00:01:00.000Z', [], 'one')]);
    const imported = importV1LogFile({
      logDir: root, file: source.file, projectId: 'project', canonicalCwd: '/workspace/project',
    });
    const receiptPath = join(imported.sessionDir, 'import.json');
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    writeFileSync(receiptPath, JSON.stringify({ ...receipt, entryCount: receipt.entryCount + 1 }));
    assert.throws(() => materializeSessionArchive(imported.sessionDir), /entry count mismatch/);
    assert.equal(listV2LocalLogs(root).project, undefined);
    const inspection = inspectSessionArchive(imported.sessionDir);
    assert.equal(inspection.ok, false);
    assert.match(inspection.errors.at(-1), /entry count mismatch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V1 importer rebuilds rather than appends when a previously imported source grows', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-change-'));
  try {
    const source = fixture(root);
    appendFileSync(source.path, `${JSON.stringify(entry('2026-07-01T00:01:00.000Z', [], 'first'))}\n---\n`);
    const imported = importV1LogFile({
      logDir: root, file: source.file, projectId: 'project', canonicalCwd: '/workspace/project',
    });
    appendFileSync(source.path, `${JSON.stringify(entry('2026-07-01T00:02:00.000Z', [], 'later'))}\n---\n`);
    const rebuilt = importV1LogFile({
      logDir: root, file: source.file, projectId: 'project', canonicalCwd: '/workspace/project',
    });
    assert.equal(rebuilt.sessionDir, imported.sessionDir);
    assert.equal(rebuilt.imported, true);
    assert.equal(rebuilt.entryCount, 2);
    assert.equal(materializeSessionArchive(rebuilt.sessionDir).committedEvents, 2);
    assert.equal(verifyImportedV1Log({ logDir: root, file: source.file, sessionDir: rebuilt.sessionDir }).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V1 importer rejects a recently modified source before creating an archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-active-'));
  try {
    const source = fixture(root);
    writeFileSync(source.path, `${JSON.stringify(entry('2026-07-01T00:01:00.000Z', [], 'active'))}\n---\n`);
    assert.throws(() => importV1LogFile({
      logDir: root,
      file: source.file,
      projectId: 'project',
      canonicalCwd: '/workspace/project',
      minStableMs: 60_000,
    }), (error) => error.code === 'CXV_LOG_V1_IMPORT_UNSTABLE');
    assert.equal(readFileSync(source.path, 'utf8').includes('active'), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('legacy imports are verified separately and do not poison the C1 dual-write observation gate', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-gate-'));
  try {
    const source = fixture(root);
    writeFileSync(source.path, `${JSON.stringify(entry('2026-07-01T00:01:00.000Z', [], 'only'))}\n---\n`);
    importV1LogFile({ logDir: root, file: source.file, projectId: 'project', canonicalCwd: '/workspace/project' });
    const readiness = auditLogV2Readiness(root, {
      projectId: 'project', minSessions: 1, minEvents: 1, minObservationHours: 0,
      now: '2026-07-14T00:00:00.000Z',
    });
    assert.equal(readiness.ok, false);
    assert.equal(readiness.summary.sessions, 0);
    assert.equal(readiness.reasons.includes('session-parity-failures'), false);
    assert.equal(readiness.reasons.includes('insufficient-sessions'), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V1 import CLI writes and verifies an archive', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-cli-'));
  try {
    const source = fixture(root, 'project_20260702_000000.jsonl');
    writeFileSync(source.path, `${JSON.stringify(entry('2026-07-02T00:01:00.000Z', [], 'cli'))}\n---\n`);
    const cliPath = fileURLToPath(new URL('../lib/log-v2/import-v1.js', import.meta.url));
    const child = spawnSync(process.execPath, [
      cliPath,
      root,
      source.file,
      '--cwd=/workspace/project',
      '--project=project',
    ], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.results[0].verified, true);
    assert.equal(JSON.parse(readFileSync(join(output.results[0].sessionDir, 'import.json'), 'utf8')).sourceFile, source.file);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V1 import CLI discovers a project directory and skips active logs', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v1-import-project-'));
  try {
    const stable = fixture(root, 'stable.jsonl');
    const active = fixture(root, 'active.jsonl');
    writeFileSync(stable.path, `${JSON.stringify(entry('2026-07-02T00:01:00.000Z', [], 'stable'))}\n---\n`);
    writeFileSync(active.path, `${JSON.stringify(entry('2026-07-02T00:02:00.000Z', [], 'active'))}\n---\n`);
    const old = new Date(Date.now() - 120_000);
    utimesSync(stable.path, old, old);
    const cliPath = fileURLToPath(new URL('../lib/log-v2/import-v1.js', import.meta.url));
    const child = spawnSync(process.execPath, [
      cliPath,
      root,
      '--cwd=/workspace/project',
      '--project=project',
      '--project-dir=project',
      '--stable-seconds=60',
      '--skip-unstable=1',
    ], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    assert.equal(output.results.length, 1);
    assert.equal(output.results[0].sourceFile, stable.file);
    assert.equal(output.skipped.length, 1);
    assert.equal(output.skipped[0].file, active.file);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
