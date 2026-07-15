#!/usr/bin/env node
import crypto from 'node:crypto';
import {
  closeSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { reconstructEntries } from '../../server/lib/delta-reconstructor.js';
import { setLatestMapValue } from '../log-entry-order.js';
import { modelCatalogStableContent } from '../model-catalog-log.js';
import { expandRepeatEntries, isMetadataModelsEntry } from '../repeat-entry.js';
import { sanitizeEntryForV2 } from './entry-codec.js';
import { loadLogV2RuntimeConfigDocument } from './runtime-config.js';
import {
  discoverV2SessionArchives,
  materializeSessionArchive,
} from './materializer.js';
import { stableJsonStringify } from './storage.js';
import { writeC1GateFile } from './gate.js';

const ENTRY_DELIMITER = Buffer.from('\n---\n');
const LEGACY_SCAN_CHUNK_BYTES = 1024 * 1024;
const MAX_LEGACY_ENTRY_BYTES = 64 * 1024 * 1024;
const STORAGE_ONLY_FIELDS = Object.freeze([
  '_deltaFormat',
  '_totalMessageCount',
  '_conversationId',
  '_isCheckpoint',
  '_inputDigest',
  '_baseInputDigest',
  '_baseMessageCount',
  '_seq',
  '_seqEpoch',
  '_staleReorder',
  '_reconstructBroken',
  '_cxvRepeat',
  '_cxvRepeated',
  '_codexRaw',
]);

function contained(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizeParityEntry(entry) {
  const normalized = sanitizeEntryForV2(entry);
  for (const field of STORAGE_ONLY_FIELDS) delete normalized[field];
  if (isMetadataModelsEntry(normalized)) {
    const stable = modelCatalogStableContent(normalized);
    // V1 intentionally stores consecutive model-catalog polls as a
    // timestamp-only marker and reconstructs the other values from its base.
    // Compare only the exact semantic fields used by that compactor, plus the
    // per-poll timestamp that the marker preserves.
    return {
      timestamp: normalized.timestamp ?? null,
      url: stable.endpoint,
      method: stable.method,
      body: stable.body,
      response: {
        status: stable.status,
        body: stable.responseBody,
      },
    };
  }
  return normalized;
}

function readLegacyEntry(logDir, ref) {
  if (!ref || typeof ref.logFile !== 'string' || ref.logFile.startsWith('/')
      || ref.logFile.split('/').includes('..')) throw new TypeError('invalid legacy log path');
  if (!Number.isSafeInteger(ref.offset) || ref.offset < 0
      || !Number.isSafeInteger(ref.length) || ref.length <= ENTRY_DELIMITER.length
      || ref.length > MAX_LEGACY_ENTRY_BYTES) throw new TypeError('invalid legacy log range');
  const realRoot = realpathSync(logDir);
  const requested = resolve(logDir, ref.logFile);
  const filePath = realpathSync(requested);
  if (!contained(realRoot, filePath) || statSync(filePath).size < ref.offset + ref.length) {
    throw new Error('legacy log reference escapes or exceeds its file');
  }
  const fd = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(ref.length);
    const bytesRead = readSync(fd, buffer, 0, buffer.length, ref.offset);
    if (bytesRead !== buffer.length) throw new Error('truncated legacy log reference');
    const delimiterAt = buffer.length - ENTRY_DELIMITER.length;
    if (!buffer.subarray(delimiterAt).equals(ENTRY_DELIMITER)) {
      throw new Error('legacy log reference is not delimiter terminated');
    }
    return JSON.parse(buffer.subarray(0, delimiterAt).toString('utf8'));
  } finally {
    closeSync(fd);
  }
}

function locatorKey(ref) {
  return `${ref.offset}:${ref.length}`;
}

function observationTimestamp(record) {
  return record.committedAt || record.timestamp;
}

function collectLegacyLocators(archives, onlyFiles = null, sinceMs = null) {
  const files = new Map();
  const errors = [];
  for (const archive of archives) {
    let materialized;
    try {
      materialized = materializeSessionArchive(archive.sessionDir);
    } catch (error) {
      errors.push(Object.freeze({ sessionId: archive.manifest.sessionId, error: error.message }));
      continue;
    }
    for (const record of materialized.records) {
      if (sinceMs != null && Date.parse(observationTimestamp(record)) < sinceMs) continue;
      const ref = record.legacyRef;
      if (!ref || (onlyFiles && !onlyFiles.has(ref.logFile))) continue;
      let file = files.get(ref.logFile);
      if (!file) {
        file = { firstOffset: ref.offset, refs: new Set() };
        files.set(ref.logFile, file);
      }
      file.firstOffset = Math.min(file.firstOffset, ref.offset);
      file.refs.add(locatorKey(ref));
    }
  }
  return { files, errors };
}

function scanLegacyRecordRanges(logDir, logFile, startOffset) {
  if (typeof logFile !== 'string' || logFile.startsWith('/') || logFile.split('/').includes('..')) {
    throw new TypeError('invalid legacy log path');
  }
  const realRoot = realpathSync(logDir);
  const filePath = realpathSync(resolve(logDir, logFile));
  if (!contained(realRoot, filePath)) throw new Error('legacy log path escapes the log root');
  const snapshotBytes = statSync(filePath).size;
  if (!Number.isSafeInteger(startOffset) || startOffset < 0 || startOffset > snapshotBytes) {
    throw new Error('legacy observation start exceeds its file');
  }

  const ranges = [];
  const fd = openSync(filePath, 'r');
  const chunk = Buffer.allocUnsafe(Math.min(LEGACY_SCAN_CHUNK_BYTES, Math.max(1, snapshotBytes - startOffset)));
  let carry = Buffer.alloc(0);
  let position = startOffset;
  try {
    while (position < snapshotBytes) {
      const bytesRead = readSync(fd, chunk, 0, Math.min(chunk.length, snapshotBytes - position), position);
      if (!bytesRead) break;
      const data = carry.length
        ? Buffer.concat([carry, chunk.subarray(0, bytesRead)])
        : Buffer.from(chunk.subarray(0, bytesRead));
      const dataStart = position - carry.length;
      let start = 0;
      let delimiterAt;
      while ((delimiterAt = data.indexOf(ENTRY_DELIMITER, start)) !== -1) {
        const length = delimiterAt + ENTRY_DELIMITER.length - start;
        if (length > MAX_LEGACY_ENTRY_BYTES) throw new Error('legacy log entry exceeds parity scan limit');
        ranges.push(Object.freeze({ offset: dataStart + start, length }));
        start = delimiterAt + ENTRY_DELIMITER.length;
      }
      carry = Buffer.from(data.subarray(start));
      if (carry.length > MAX_LEGACY_ENTRY_BYTES) throw new Error('legacy log entry exceeds parity scan limit');
      position += bytesRead;
    }
  } finally {
    closeSync(fd);
  }
  return Object.freeze({
    logFile,
    startOffset,
    snapshotBytes,
    completeBytes: ranges.length ? ranges.at(-1).offset + ranges.at(-1).length : startOffset,
    incompleteTailBytes: carry.length,
    ranges: Object.freeze(ranges),
  });
}

/**
 * Proves the reverse half of dual-write parity: every complete V1 record after
 * a file's first observed V2 locator must itself have a V2 locator. Discovery
 * is repeated after the V1 snapshots are scanned so a V2 commit racing the
 * first pass is included without reading beyond the captured V1 file sizes.
 */
export function auditV1LocatorCoverage(logDir, {
  projectId = null,
  discovery = null,
  since = null,
} = {}) {
  const sinceMs = since == null ? null : Date.parse(since);
  if (since != null && !Number.isFinite(sinceMs)) throw new TypeError('since must be an ISO-compatible timestamp');
  const initialDiscovery = discovery || discoverV2SessionArchives(logDir, { projectId });
  const initialArchives = initialDiscovery.archives.filter((archive) => archive.manifest.source !== 'legacy-import');
  const initial = collectLegacyLocators(initialArchives, null, sinceMs);
  const scans = new Map();
  const errors = [...initial.errors];
  for (const [logFile, locators] of initial.files) {
    try {
      scans.set(logFile, scanLegacyRecordRanges(logDir, logFile, locators.firstOffset));
    } catch (error) {
      errors.push(Object.freeze({ logFile, error: error.message }));
    }
  }

  const refreshedDiscovery = discoverV2SessionArchives(logDir, { projectId });
  const refreshedArchives = refreshedDiscovery.archives.filter((archive) => archive.manifest.source !== 'legacy-import');
  const refreshed = collectLegacyLocators(refreshedArchives, new Set(scans.keys()), sinceMs);
  errors.push(...refreshedDiscovery.errors.map((error) => Object.freeze({
    path: error.path,
    error: error.error,
  })));
  errors.push(...refreshed.errors);
  const files = [];
  let v1Records = 0;
  let locatedRecords = 0;
  let missingRecords = 0;
  for (const [logFile, scan] of scans) {
    const refs = refreshed.files.get(logFile)?.refs || initial.files.get(logFile)?.refs || new Set();
    const missing = [];
    let located = 0;
    for (const range of scan.ranges) {
      if (refs.has(locatorKey(range))) located++;
      else missing.push(range);
    }
    v1Records += scan.ranges.length;
    locatedRecords += located;
    missingRecords += missing.length;
    files.push(Object.freeze({
      logFile,
      startOffset: scan.startOffset,
      snapshotBytes: scan.snapshotBytes,
      completeBytes: scan.completeBytes,
      incompleteTailBytes: scan.incompleteTailBytes,
      v1Records: scan.ranges.length,
      locatedRecords: located,
      missingRecords: missing.length,
      missing: Object.freeze(missing.slice(0, 100)),
      missingTruncated: missing.length > 100,
    }));
  }
  return Object.freeze({
    ok: errors.length === 0 && missingRecords === 0,
    v1Records,
    locatedRecords,
    missingRecords,
    files: Object.freeze(files),
    errors: Object.freeze(errors),
  });
}

function dedupeEntryPairs(pairs) {
  const dedup = new Map();
  let anonymous = 0;
  for (const pair of pairs) {
    const entry = pair.entry;
    const key = entry?.timestamp && entry?.url ? `${entry.timestamp}|${entry.url}` : `__nokey_${anonymous++}`;
    setLatestMapValue(dedup, key, pair);
  }
  return [...dedup.values()];
}

function normalizeLegacyEntryPairs(pairs) {
  const expanded = expandRepeatEntries(pairs.map((pair) => pair.entry));
  const deduped = dedupeEntryPairs(pairs.map((pair, index) => ({
    ...pair,
    entry: expanded[index],
  })));
  const reconstructed = reconstructEntries(deduped.map((pair) => pair.entry));
  return deduped.map((pair, index) => ({
    ...pair,
    entry: normalizeParityEntry(reconstructed[index]),
  }));
}

function observedPair(pair, sinceMs) {
  return sinceMs == null || Date.parse(observationTimestamp(pair.record)) >= sinceMs;
}

function firstDifferencePaths(left, right, path = '$', output = [], limit = 20) {
  if (output.length >= limit) return output;
  if (Object.is(left, right)) return output;
  const leftObject = left !== null && typeof left === 'object';
  const rightObject = right !== null && typeof right === 'object';
  if (!leftObject || !rightObject || Array.isArray(left) !== Array.isArray(right)) {
    output.push(path);
    return output;
  }
  if (Array.isArray(left)) {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length && output.length < limit; index++) {
      if (index >= left.length || index >= right.length) output.push(`${path}[${index}]`);
      else firstDifferencePaths(left[index], right[index], `${path}[${index}]`, output, limit);
    }
    return output;
  }
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  for (const key of keys) {
    if (output.length >= limit) break;
    const child = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
    if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) output.push(child);
    else firstDifferencePaths(left[key], right[key], child, output, limit);
  }
  return output;
}

function eventIdentity(entry) {
  return Object.freeze({
    timestamp: typeof entry?.timestamp === 'string' ? entry.timestamp : null,
    url: typeof entry?.url === 'string' ? entry.url : null,
    threadId: entry?.body?.metadata?.thread_id ?? entry?.body?._threadId ?? null,
    turnId: entry?.body?.metadata?.turn_id ?? entry?.body?._turnId ?? null,
  });
}

export function auditV2SessionParity(logDir, sessionDir, { since = null } = {}) {
  const sinceMs = since == null ? null : Date.parse(since);
  if (since != null && !Number.isFinite(sinceMs)) throw new TypeError('since must be an ISO-compatible timestamp');
  let materialized;
  try {
    materialized = materializeSessionArchive(sessionDir);
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: 'corrupt-v2',
      sessionDir,
      sessionId: null,
      projectId: null,
      committedEvents: 0,
      locatedEvents: 0,
      v1Events: 0,
      v2Events: 0,
      mismatches: Object.freeze([]),
      errors: Object.freeze([error.message]),
    });
  }
  const allPairs = materialized.records
    .map((record, index) => ({ record, entry: materialized.entries[index] }))
  const included = allPairs.filter((pair) => observedPair(pair, sinceMs));
  const records = included.map(({ record }) => record);
  const observedV2Pairs = dedupeEntryPairs(allPairs).filter((pair) => observedPair(pair, sinceMs));
  const base = {
    sessionDir,
    sessionId: materialized.manifest.sessionId,
    projectId: materialized.manifest.projectId,
    committedEvents: records.length,
  };
  if (records.length === 0) {
    return Object.freeze({ ...base, ok: false, status: 'empty', locatedEvents: 0, v1Events: 0, v2Events: 0, mismatches: Object.freeze([]), errors: Object.freeze([]) });
  }

  const missingLocators = [];
  const legacyPairs = [];
  let locatedEvents = 0;
  const legacyErrors = [];
  for (const pair of allPairs) {
    const ref = pair.record.legacyRef;
    if (!ref) {
      if (observedPair(pair, sinceMs)) missingLocators.push(pair.record.seq);
      continue;
    }
    try {
      legacyPairs.push({ record: pair.record, entry: readLegacyEntry(logDir, ref) });
      if (observedPair(pair, sinceMs)) locatedEvents++;
    } catch (error) {
      // Pre-epoch locators are reconstruction context only. If one is no
      // longer readable, a dependent observed delta will still fail parity;
      // it must not independently invalidate a deliberately reset epoch.
      if (observedPair(pair, sinceMs)) legacyErrors.push(`sequence ${pair.record.seq}: ${error.message}`);
    }
  }
  if (missingLocators.length || legacyErrors.length) {
    return Object.freeze({
      ...base,
      ok: false,
      status: missingLocators.length ? 'missing-locator' : 'invalid-legacy-ref',
      locatedEvents,
      missingLocatorSequences: Object.freeze(missingLocators),
      v1Events: 0,
      v2Events: observedV2Pairs.length,
      mismatches: Object.freeze([]),
      errors: Object.freeze(legacyErrors),
    });
  }

  let v1Entries;
  try {
    v1Entries = normalizeLegacyEntryPairs(legacyPairs)
      .filter((pair) => observedPair(pair, sinceMs))
      .map((pair) => pair.entry);
  } catch (error) {
    return Object.freeze({
      ...base,
      ok: false,
      status: 'invalid-v1',
      locatedEvents,
      v1Events: 0,
      v2Events: observedV2Pairs.length,
      mismatches: Object.freeze([]),
      errors: Object.freeze([error.message]),
    });
  }
  const v2Entries = observedV2Pairs.map((pair) => normalizeParityEntry(pair.entry));
  const mismatches = [];
  const count = Math.max(v1Entries.length, v2Entries.length);
  for (let index = 0; index < count; index++) {
    const v1 = v1Entries[index];
    const v2 = v2Entries[index];
    if (!v1 || !v2) {
      mismatches.push(Object.freeze({ index, identity: eventIdentity(v1 || v2), paths: Object.freeze(['$']), v1Hash: v1 ? sha256(stableJsonStringify(v1)) : null, v2Hash: v2 ? sha256(stableJsonStringify(v2)) : null }));
      continue;
    }
    const v1Json = stableJsonStringify(v1);
    const v2Json = stableJsonStringify(v2);
    if (v1Json === v2Json) continue;
    mismatches.push(Object.freeze({
      index,
      identity: eventIdentity(v2),
      paths: Object.freeze(firstDifferencePaths(v1, v2)),
      v1Hash: sha256(v1Json),
      v2Hash: sha256(v2Json),
    }));
  }
  return Object.freeze({
    ...base,
    ok: mismatches.length === 0,
    status: mismatches.length === 0 ? 'passed' : 'mismatch',
    locatedEvents,
    v1Events: v1Entries.length,
    v2Events: v2Entries.length,
    mismatches: Object.freeze(mismatches),
    errors: Object.freeze([]),
  });
}

function positiveInteger(value, fallback, name) {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new TypeError(`${name} must be a positive integer`);
  return parsed;
}

function nonNegativeNumber(value, fallback, name) {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new TypeError(`${name} must be a non-negative number`);
  return parsed;
}

function resolveObservationSince(logDir, configuredSince) {
  if (configuredSince != null) {
    const parsed = Date.parse(configuredSince);
    if (!Number.isFinite(parsed)) throw new TypeError('since must be an ISO-compatible timestamp');
    return new Date(parsed).toISOString();
  }
  const runtime = loadLogV2RuntimeConfigDocument(logDir);
  return runtime?.writeMode === 'dual' ? new Date(runtime.updatedAt).toISOString() : null;
}

export function auditLogV2Readiness(logDir, options = {}) {
  const thresholds = Object.freeze({
    minSessions: positiveInteger(options.minSessions, 10, 'minSessions'),
    minEvents: positiveInteger(options.minEvents, 1000, 'minEvents'),
    minObservationHours: nonNegativeNumber(options.minObservationHours, 168, 'minObservationHours'),
  });
  const nowMs = options.now == null ? Date.now() : new Date(options.now).getTime();
  if (!Number.isFinite(nowMs)) throw new TypeError('now must be an ISO-compatible timestamp');
  const observationStartedAt = resolveObservationSince(logDir, options.since);
  const observationStartedMs = observationStartedAt == null ? null : Date.parse(observationStartedAt);
  const discovery = discoverV2SessionArchives(logDir, { projectId: options.projectId || null });
  const observedArchives = discovery.archives.filter((archive) => archive.manifest.source !== 'legacy-import');
  const sessions = observedArchives.map((archive) => {
    const report = auditV2SessionParity(logDir, archive.sessionDir, { since: observationStartedAt });
    if (report.sessionId && report.projectId) return report;
    return Object.freeze({
      ...report,
      sessionId: archive.manifest.sessionId,
      projectId: archive.manifest.projectId,
    });
  }).filter((report) => report.committedEvents > 0 || report.status !== 'empty');
  const committedEvents = sessions.reduce((sum, session) => sum + session.committedEvents, 0);
  const passedSessions = sessions.filter((session) => session.ok).length;
  const earliestMs = observedArchives.reduce((min, archive) => {
    const value = Date.parse(archive.manifest.createdAt);
    return Number.isFinite(value) ? Math.min(min, value) : min;
  }, nowMs);
  const observationHours = observationStartedMs != null
    ? Math.max(0, (nowMs - observationStartedMs) / 3_600_000)
    : (observedArchives.length ? Math.max(0, (nowMs - earliestMs) / 3_600_000) : 0);
  const coverage = auditV1LocatorCoverage(logDir, {
    projectId: options.projectId || null,
    discovery,
    since: observationStartedAt,
  });
  const reasons = [];
  if (discovery.errors.length) reasons.push('discovery-errors');
  if (sessions.some((session) => !session.ok)) reasons.push('session-parity-failures');
  if (coverage.errors.length) reasons.push('v1-coverage-errors');
  if (coverage.missingRecords) reasons.push('v1-coverage-gaps');
  if (sessions.length < thresholds.minSessions) reasons.push('insufficient-sessions');
  if (committedEvents < thresholds.minEvents) reasons.push('insufficient-events');
  if (observationHours < thresholds.minObservationHours) reasons.push('observation-window-too-short');
  return Object.freeze({
    ok: reasons.length === 0,
    gate: 'c1-readiness',
    projectId: options.projectId || null,
    observationStartedAt,
    thresholds,
    summary: Object.freeze({
      sessions: sessions.length,
      passedSessions,
      failedSessions: sessions.length - passedSessions,
      committedEvents,
      observationHours,
      discoveryErrors: discovery.errors.length,
      v1CoverageRecords: coverage.v1Records,
      v1LocatedRecords: coverage.locatedRecords,
      v1MissingRecords: coverage.missingRecords,
      v1CoverageErrors: coverage.errors.length,
    }),
    reasons: Object.freeze(reasons),
    discoveryErrors: discovery.errors,
    coverage,
    sessions: Object.freeze(sessions),
    generatedAt: new Date(nowMs).toISOString(),
  });
}

function parseCli(argv) {
  const positional = [];
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) positional.push(arg);
    else {
      const [key, value] = arg.slice(2).split('=', 2);
      if (!value) throw new TypeError(`expected --${key}=VALUE`);
      if (key === 'project') options.projectId = value;
      else if (key === 'since') options.since = value;
      else if (key === 'min-sessions') options.minSessions = value;
      else if (key === 'min-events') options.minEvents = value;
      else if (key === 'min-hours') options.minObservationHours = value;
      else if (key === 'write-gate') options.writeGate = value;
      else if (key === 'gate-hours') options.gateHours = value;
      else throw new TypeError(`unknown option --${key}`);
    }
  }
  if (positional.length !== 1) throw new TypeError('Usage: node lib/log-v2/parity.js <log-dir> [--project=ID] [--since=ISO] [--min-sessions=N] [--min-events=N] [--min-hours=N] [--write-gate=PATH] [--gate-hours=N]');
  const { writeGate, gateHours, ...auditOptions } = options;
  return { logDir: resolve(positional[0]), options: auditOptions, writeGate, gateHours };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { logDir, options, writeGate, gateHours } = parseCli(process.argv.slice(2));
    const report = auditLogV2Readiness(logDir, options);
    let gate = null;
    if (writeGate && report.ok) {
      gate = writeC1GateFile(writeGate, report, {
        logDir,
        ...(gateHours ? { maxAgeHours: Number(gateHours) } : {}),
      });
    }
    console.log(JSON.stringify(gate ? { ...report, gateFile: resolve(writeGate), c1Gate: gate } : report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
