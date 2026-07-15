import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMainAgentDeltaCompactor } from '../lib/main-agent-delta.js';
import { readLocalLog } from '../lib/log-management.js';
import { createModelCatalogLogCompactor } from '../lib/model-catalog-log.js';
import { resolveAppServerThreadIdentity, threadStoreToken } from '../lib/log-v2/identity.js';
import { auditLogV2Readiness, auditV2SessionParity } from '../lib/log-v2/parity.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

function entry(timestamp, input, output, extra = {}) {
  return {
    timestamp,
    url: 'https://chatgpt.com/backend-api/codex/responses',
    method: 'POST',
    headers: { Authorization: 'Bearer private', Accept: 'application/json' },
    body: { metadata: { turn_id: `turn-${timestamp}` }, input },
    response: {
      status: 200,
      headers: { 'set-cookie': 'private', 'content-type': 'application/json' },
      body: { content: [{ type: 'text', text: output }] },
    },
    mainAgent: true,
    ...extra,
  };
}

function createSession(root, {
  sessionId = 'session-1',
  createdAt = '2026-07-01T00:00:00.000Z',
  v1Name = `${sessionId}.jsonl`,
} = {}) {
  mkdirSync(join(root, 'project'), { recursive: true });
  const writer = LogV2Writer.open({
    rootDir: root,
    projectId: 'project',
    canonicalCwd: '/workspace/project',
    sessionId,
    rootThreadId: sessionId,
    createdAt,
  });
  return {
    writer,
    identity: resolveAppServerThreadIdentity({ id: sessionId, sessionId }),
    v1File: join(root, 'project', v1Name),
    v1Relative: `project/${v1Name}`,
  };
}

function appendDualFixture(fixture, original, stored = original) {
  const line = `${JSON.stringify(stored)}\n---\n`;
  let offset = 0;
  try { offset = readFileSync(fixture.v1File).length; } catch {}
  appendFileSync(fixture.v1File, line);
  fixture.writer.append(original, fixture.identity, {
    legacyRef: { logFile: fixture.v1Relative, offset, length: Buffer.byteLength(line) },
    committedAt: original.timestamp,
  });
}

test('offline parity audit reconstructs real V1 delta records before comparing V2', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-delta-'));
  try {
    const fixture = createSession(root);
    const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'audit-test' });
    const inputs = [];
    for (let index = 0; index < 3; index++) {
      inputs.push({ type: 'message', text: `message-${index}` });
      const original = entry(`2026-07-01T00:0${index + 1}:00.000Z`, [...inputs], `output-${index}`);
      appendDualFixture(fixture, original, compactor.process(original));
      compactor.commit(original);
    }
    const report = auditV2SessionParity(root, fixture.writer.sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.status, 'passed');
    assert.equal(report.committedEvents, 3);
    assert.equal(report.v1Events, 3);
    assert.equal(report.v2Events, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('observation epoch retains pre-epoch V1 delta context but counts only observed commits', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-delta-epoch-'));
  try {
    const fixture = createSession(root);
    const compactor = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'audit-epoch' });
    const first = entry('2026-07-01T00:01:00.000Z', [{ type: 'message', text: 'base' }], 'first');
    appendDualFixture(fixture, first, compactor.process(first));
    compactor.commit(first);
    const second = entry('2026-07-01T00:03:00.000Z', [
      { type: 'message', text: 'base' },
      { type: 'message', text: 'observed' },
    ], 'second');
    appendDualFixture(fixture, second, compactor.process(second));
    compactor.commit(second);

    const report = auditV2SessionParity(root, fixture.writer.sessionDir, {
      since: '2026-07-01T00:02:00.000Z',
    });
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.committedEvents, 1);
    assert.equal(report.locatedEvents, 1);
    assert.equal(report.v1Events, 1);
    assert.equal(report.v2Events, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a restarted writer moves a repeated checkpoint to its latest commit position', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-restart-order-'));
  try {
    const fixture = createSession(root);
    const oldWriter = createMainAgentDeltaCompactor({ checkpointInterval: 2, epoch: 'old-process' });
    const repeatedTimestamp = '2026-07-01T00:01:00.000Z';
    const oldRepeated = entry(repeatedTimestamp, [
      { type: 'message', text: 'old base' },
    ], 'old repeated');
    appendDualFixture(fixture, oldRepeated, oldWriter.process(oldRepeated));
    oldWriter.commit(oldRepeated);

    // The second old-process record is an independent checkpoint. It remains
    // between the first occurrence and the restarted process in physical file
    // order, reproducing the interleaving seen during startup hydration.
    const oldCheckpoint = entry('2026-07-01T00:02:00.000Z', [
      { type: 'message', text: 'old base' },
      { type: 'message', text: 'old checkpoint' },
    ], 'old checkpoint');
    appendDualFixture(fixture, oldCheckpoint, oldWriter.process(oldCheckpoint));
    oldWriter.commit(oldCheckpoint);

    const restarted = createMainAgentDeltaCompactor({ checkpointInterval: 10, epoch: 'new-process' });
    const hydrated = entry(repeatedTimestamp, [
      { type: 'message', text: 'new base' },
    ], 'hydrated replacement');
    appendDualFixture(fixture, hydrated, restarted.process(hydrated));
    restarted.commit(hydrated);

    const current = entry('2026-07-01T00:03:00.000Z', [
      { type: 'message', text: 'new base' },
      { type: 'message', text: 'current turn' },
    ], 'current');
    appendDualFixture(fixture, current, restarted.process(current));
    restarted.commit(current);

    const v1 = readLocalLog(root, fixture.v1Relative);
    assert.deepEqual(v1.map((value) => value.timestamp), [
      '2026-07-01T00:02:00.000Z',
      repeatedTimestamp,
      '2026-07-01T00:03:00.000Z',
    ]);
    assert.deepEqual(v1.at(-1).body.input, current.body.input);

    const report = auditV2SessionParity(root, fixture.writer.sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.status, 'passed');
    assert.equal(report.v1Events, 3);
    assert.equal(report.v2Events, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('observation epoch ignores an old missing locator when observed data is independently reconstructable', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-old-missing-locator-'));
  try {
    const fixture = createSession(root);
    fixture.writer.append(
      entry('2026-07-01T00:01:00.000Z', [], 'old missing', { mainAgent: false }),
      fixture.identity,
      { committedAt: '2026-07-01T00:01:00.000Z' },
    );
    appendDualFixture(
      fixture,
      entry('2026-07-01T00:03:00.000Z', [], 'observed full', { mainAgent: false }),
    );

    const report = auditV2SessionParity(root, fixture.writer.sessionDir, {
      since: '2026-07-01T00:02:00.000Z',
    });
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.committedEvents, 1);
    assert.equal(report.locatedEvents, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('offline parity audit follows locators across multiple V1 files', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-rotate-'));
  try {
    const fixture = createSession(root, { v1Name: 'first.jsonl' });
    appendDualFixture(fixture, entry('2026-07-01T00:01:00.000Z', [], 'first', { mainAgent: false }));
    fixture.v1File = join(root, 'project', 'second.jsonl');
    fixture.v1Relative = 'project/second.jsonl';
    appendDualFixture(fixture, entry('2026-07-01T00:02:00.000Z', [], 'second', { mainAgent: false }));
    const report = auditV2SessionParity(root, fixture.writer.sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.locatedEvents, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parity uses the model-catalog compactor semantic surface for repeat markers', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-model-repeat-'));
  try {
    const fixture = createSession(root);
    const compactor = createModelCatalogLogCompactor();
    const modelPoll = (timestamp, trace, duration) => ({
      timestamp,
      project: 'project',
      url: 'https://chatgpt.com/backend-api/codex/models?client_version=0.144.3',
      method: 'GET',
      headers: { traceparent: trace },
      body: null,
      response: {
        status: 200,
        headers: { date: timestamp, 'x-oai-request-id': trace },
        body: { models: [{ slug: 'gpt-5.6' }] },
      },
      duration,
      mainAgent: false,
      subAgent: false,
    });
    const first = modelPoll('2026-07-01T00:01:00.000Z', 'trace-one', 100);
    const repeated = modelPoll('2026-07-01T00:04:00.000Z', 'trace-two', 250);
    appendDualFixture(fixture, first, compactor.process(first));
    appendDualFixture(fixture, repeated, compactor.process(repeated));

    const report = auditV2SessionParity(root, fixture.writer.sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.v1Events, 2);
    assert.equal(report.v2Events, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parity audit reports mismatch paths and hashes without returning payload values', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-mismatch-'));
  try {
    const fixture = createSession(root);
    const original = entry('2026-07-01T00:01:00.000Z', [{ type: 'message', text: 'secret prompt' }], 'v2 answer');
    const v1 = structuredClone(original);
    v1.response.body.content[0].text = 'different private answer';
    appendDualFixture(fixture, original, v1);
    const report = auditV2SessionParity(root, fixture.writer.sessionDir);
    assert.equal(report.ok, false);
    assert.equal(report.status, 'mismatch');
    assert.deepEqual(report.mismatches[0].paths, ['$.response.body.content[0].text']);
    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes('secret prompt'), false);
    assert.equal(serialized.includes('different private answer'), false);
    assert.match(report.mismatches[0].v1Hash, /^[a-f0-9]{64}$/);
    assert.match(report.mismatches[0].v2Hash, /^[a-f0-9]{64}$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parity audit distinguishes missing locators and committed V2 corruption', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-invalid-'));
  try {
    const missing = createSession(root, { sessionId: 'session-missing' });
    missing.writer.append(entry('2026-07-01T00:01:00.000Z', [], 'missing'), missing.identity);
    const missingReport = auditV2SessionParity(root, missing.writer.sessionDir);
    assert.equal(missingReport.status, 'missing-locator');
    assert.deepEqual(missingReport.missingLocatorSequences, [1]);

    const corrupt = createSession(root, { sessionId: 'session-corrupt' });
    appendDualFixture(corrupt, entry('2026-07-01T00:02:00.000Z', [{ type: 'message', text: 'one' }], 'done'));
    const token = threadStoreToken('session-corrupt');
    const inputRecord = JSON.parse(readFileSync(join(corrupt.writer.sessionDir, 'threads', token, 'input.jsonl'), 'utf8').trim());
    writeFileSync(join(corrupt.writer.sessionDir, inputRecord.append[0].path), '{"tampered":true}\n');
    const corruptReport = auditV2SessionParity(root, corrupt.writer.sessionDir);
    assert.equal(corruptReport.status, 'corrupt-v2');
    assert.equal(corruptReport.ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('project readiness gate enforces parity, volume, and observation thresholds', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-gate-'));
  try {
    for (const [index, createdAt] of ['2026-07-01T00:00:00.000Z', '2026-07-02T00:00:00.000Z'].entries()) {
      const fixture = createSession(root, { sessionId: `session-${index}`, createdAt });
      appendDualFixture(fixture, entry(`2026-07-0${index + 1}T00:01:00.000Z`, [], `done-${index}`, { mainAgent: false }));
    }
    const passed = auditLogV2Readiness(root, {
      projectId: 'project',
      minSessions: 2,
      minEvents: 2,
      minObservationHours: 48,
      now: '2026-07-04T00:00:00.000Z',
    });
    assert.equal(passed.ok, true, JSON.stringify(passed));
    assert.equal(passed.summary.passedSessions, 2);
    assert.equal(passed.summary.committedEvents, 2);
    assert.equal(passed.summary.observationHours, 72);

    const parityCli = fileURLToPath(new URL('../lib/log-v2/parity.js', import.meta.url));
    const gateFile = join(root, 'generated-c1-gate.json');
    const cli = spawnSync(process.execPath, [
      parityCli,
      root,
      '--project=project',
      '--min-sessions=2',
      '--min-events=2',
      '--min-hours=48',
      `--write-gate=${gateFile}`,
      '--gate-hours=24',
    ], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr || cli.stdout);
    assert.equal(JSON.parse(cli.stdout).ok, true);
    assert.equal(existsSync(gateFile), true);

    const blocked = auditLogV2Readiness(root, {
      projectId: 'project',
      minSessions: 3,
      minEvents: 10,
      minObservationHours: 100,
      now: '2026-07-04T00:00:00.000Z',
    });
    assert.equal(blocked.ok, false);
    assert.deepEqual(blocked.reasons, [
      'insufficient-sessions',
      'insufficient-events',
      'observation-window-too-short',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('project readiness rejects a V1-only record between successful V2 locators', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-coverage-gap-'));
  try {
    const fixture = createSession(root, { createdAt: '2026-07-01T00:00:00.000Z' });
    appendDualFixture(fixture, entry('2026-07-01T00:01:00.000Z', [], 'first', { mainAgent: false }));
    const missing = entry('2026-07-01T00:02:00.000Z', [], 'private missing payload', { mainAgent: false });
    appendFileSync(fixture.v1File, `${JSON.stringify(missing)}\n---\n`);
    appendDualFixture(fixture, entry('2026-07-01T00:03:00.000Z', [], 'third', { mainAgent: false }));

    const report = auditLogV2Readiness(root, {
      projectId: 'project',
      minSessions: 1,
      minEvents: 2,
      minObservationHours: 0,
      now: '2026-07-01T01:00:00.000Z',
    });
    assert.equal(report.ok, false);
    assert.deepEqual(report.reasons, ['v1-coverage-gaps']);
    assert.equal(report.summary.v1CoverageRecords, 3);
    assert.equal(report.summary.v1LocatedRecords, 2);
    assert.equal(report.summary.v1MissingRecords, 1);
    assert.equal(report.coverage.files[0].missing.length, 1);
    assert.deepEqual(Object.keys(report.coverage.files[0].missing[0]).sort(), ['length', 'offset']);
    assert.equal(JSON.stringify(report.coverage).includes('private missing payload'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V1 coverage starts at the first V2 locator and catches an uncovered active tail', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-coverage-tail-'));
  try {
    const fixture = createSession(root, { createdAt: '2026-07-01T00:00:00.000Z' });
    const beforeObservation = entry('2026-07-01T00:00:30.000Z', [], 'before', { mainAgent: false });
    appendFileSync(fixture.v1File, `${JSON.stringify(beforeObservation)}\n---\n`);
    appendDualFixture(fixture, entry('2026-07-01T00:01:00.000Z', [], 'located', { mainAgent: false }));
    const missingTail = entry('2026-07-01T00:02:00.000Z', [], 'tail', { mainAgent: false });
    appendFileSync(fixture.v1File, `${JSON.stringify(missingTail)}\n---\n`);

    const report = auditLogV2Readiness(root, {
      projectId: 'project',
      minSessions: 1,
      minEvents: 1,
      minObservationHours: 0,
      now: '2026-07-01T01:00:00.000Z',
    });
    assert.equal(report.ok, false);
    assert.deepEqual(report.reasons, ['v1-coverage-gaps']);
    assert.equal(report.summary.v1CoverageRecords, 2);
    assert.equal(report.summary.v1LocatedRecords, 1);
    assert.equal(report.summary.v1MissingRecords, 1);
    assert.equal(report.coverage.files[0].startOffset > 0, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a new observation epoch excludes repaired historical gaps and resets all thresholds', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-observe-epoch-'));
  try {
    const fixture = createSession(root, { createdAt: '2026-07-01T00:00:00.000Z' });
    appendDualFixture(fixture, entry('2026-07-01T00:01:00.000Z', [], 'before', { mainAgent: false }));
    const oldGap = entry('2026-07-01T00:02:00.000Z', [], 'old gap', { mainAgent: false });
    appendFileSync(fixture.v1File, `${JSON.stringify(oldGap)}\n---\n`);
    appendDualFixture(fixture, entry('2026-07-01T00:03:00.000Z', [], 'after', { mainAgent: false }));

    const report = auditLogV2Readiness(root, {
      projectId: 'project',
      since: '2026-07-01T00:02:30.000Z',
      minSessions: 1,
      minEvents: 1,
      minObservationHours: 1,
      now: '2026-07-01T01:02:30.000Z',
    });
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.observationStartedAt, '2026-07-01T00:02:30.000Z');
    assert.equal(report.summary.sessions, 1);
    assert.equal(report.summary.committedEvents, 1);
    assert.equal(report.summary.observationHours, 1);
    assert.equal(report.summary.v1CoverageRecords, 1);
    assert.equal(report.summary.v1MissingRecords, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
