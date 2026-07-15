export const LOG_V2_FORMAT_VERSION = 2;
export const PROJECT_MANIFEST_KIND = 'cx-viewer.project-archive';
export const SESSION_MANIFEST_KIND = 'cx-viewer.session-archive';
export const SESSION_SUMMARY_KIND = 'cx-viewer.session-summary';
export const TIMELINE_RECORD_KIND = 'cx-viewer.timeline-record';
export const IMPORT_RECEIPT_KIND = 'cx-viewer.v1-import';

export const SESSION_STATES = Object.freeze(['creating', 'active', 'inactive', 'archived', 'degraded']);
export const SESSION_START_REASONS = Object.freeze(['startup', 'clear', 'fork', 'resume', 'legacy']);
export const TIMELINE_PHASES = Object.freeze(['inProgress', 'completed', 'failed', 'interrupted']);
export const IMPORT_DURABILITY_MODES = Object.freeze(['batched-fsync', 'per-entry-fsync']);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isoTimestamp(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function nullableString(value) {
  return value == null || nonEmptyString(value);
}

function sha256Digest(value) {
  return /^sha256:[a-f0-9]{64}$/.test(value || '');
}

function sha256Hex(value) {
  return /^[a-f0-9]{64}$/.test(value || '');
}

function validationResult(errors) {
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function createProjectManifest({
  projectId,
  canonicalCwd,
  createdAt = new Date().toISOString(),
  nextSessionSeq = 1,
  latestSessionId = null,
}) {
  const manifest = {
    kind: PROJECT_MANIFEST_KIND,
    version: LOG_V2_FORMAT_VERSION,
    projectId,
    canonicalCwd,
    createdAt,
    updatedAt: createdAt,
    nextSessionSeq,
    latestSessionId,
  };
  const result = validateProjectManifest(manifest);
  if (!result.ok) throw new TypeError(result.errors.join('; '));
  return manifest;
}

export function validateProjectManifest(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return validationResult(['project manifest must be an object']);
  if (value.kind !== PROJECT_MANIFEST_KIND) errors.push(`kind must be ${PROJECT_MANIFEST_KIND}`);
  if (value.version !== LOG_V2_FORMAT_VERSION) errors.push(`version must be ${LOG_V2_FORMAT_VERSION}`);
  if (!nonEmptyString(value.projectId)) errors.push('projectId is required');
  if (!nonEmptyString(value.canonicalCwd)) errors.push('canonicalCwd is required');
  if (!isoTimestamp(value.createdAt)) errors.push('createdAt must be an ISO-compatible timestamp');
  if (!isoTimestamp(value.updatedAt)) errors.push('updatedAt must be an ISO-compatible timestamp');
  if (!positiveInteger(value.nextSessionSeq)) errors.push('nextSessionSeq must be a positive safe integer');
  if (!nullableString(value.latestSessionId)) errors.push('latestSessionId must be null or a non-empty string');
  return validationResult(errors);
}

export function createSessionManifest({
  projectId,
  sessionId,
  sessionSeq,
  rootThreadId = sessionId,
  previousSessionId = null,
  replacesSessionId = null,
  forkedFromSessionId = null,
  startReason,
  source,
  createdAt = new Date().toISOString(),
  state = 'creating',
}) {
  const manifest = {
    kind: SESSION_MANIFEST_KIND,
    version: LOG_V2_FORMAT_VERSION,
    projectId,
    sessionId,
    sessionSeq,
    rootThreadId,
    previousSessionId,
    replacesSessionId,
    forkedFromSessionId,
    startReason,
    source,
    createdAt,
    updatedAt: createdAt,
    state,
    timelineVersion: 1,
    entryVersion: 1,
    inputVersion: 1,
    objectVersion: 1,
  };
  const result = validateSessionManifest(manifest);
  if (!result.ok) throw new TypeError(result.errors.join('; '));
  return manifest;
}

export function validateSessionManifest(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return validationResult(['session manifest must be an object']);
  if (value.kind !== SESSION_MANIFEST_KIND) errors.push(`kind must be ${SESSION_MANIFEST_KIND}`);
  if (value.version !== LOG_V2_FORMAT_VERSION) errors.push(`version must be ${LOG_V2_FORMAT_VERSION}`);
  if (!nonEmptyString(value.projectId)) errors.push('projectId is required');
  if (!nonEmptyString(value.sessionId)) errors.push('sessionId is required');
  if (!positiveInteger(value.sessionSeq)) errors.push('sessionSeq must be a positive safe integer');
  if (!nonEmptyString(value.rootThreadId)) errors.push('rootThreadId is required');
  for (const field of ['previousSessionId', 'replacesSessionId', 'forkedFromSessionId']) {
    if (!nullableString(value[field])) errors.push(`${field} must be null or a non-empty string`);
  }
  if (!SESSION_START_REASONS.includes(value.startReason)) errors.push(`startReason must be one of ${SESSION_START_REASONS.join(', ')}`);
  if (!nonEmptyString(value.source)) errors.push('source is required');
  if (!isoTimestamp(value.createdAt)) errors.push('createdAt must be an ISO-compatible timestamp');
  if (!isoTimestamp(value.updatedAt)) errors.push('updatedAt must be an ISO-compatible timestamp');
  if (!SESSION_STATES.includes(value.state)) errors.push(`state must be one of ${SESSION_STATES.join(', ')}`);
  for (const field of ['timelineVersion', 'entryVersion', 'inputVersion', 'objectVersion']) {
    if (!positiveInteger(value[field])) errors.push(`${field} must be a positive safe integer`);
  }
  return validationResult(errors);
}

export function validateSessionSummary(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return validationResult(['session summary must be an object']);
  }
  if (value.kind !== SESSION_SUMMARY_KIND) errors.push(`kind must be ${SESSION_SUMMARY_KIND}`);
  if (value.version !== 1) errors.push('version must be 1');
  for (const field of ['sessionId', 'rootThreadId']) {
    if (!nonEmptyString(value[field])) errors.push(`${field} is required`);
  }
  if (value.lastRootTurnId !== null && !sha256Digest(value.lastRootTurnId)) {
    errors.push('lastRootTurnId must be null or a SHA-256 digest');
  }
  for (const field of [
    'throughSeq',
    'rootInputRevision',
    'committedEvents',
    'turns',
    'archiveBytes',
    'summaryBytes',
    'indexedTimelineBytes',
  ]) {
    if (!nonNegativeInteger(value[field])) errors.push(`${field} must be a non-negative safe integer`);
  }

  if (!Array.isArray(value.turnIds)) {
    errors.push('turnIds must be an array');
  } else {
    value.turnIds.forEach((turnId, index) => {
      if (!sha256Digest(turnId)) errors.push(`turnIds[${index}] must be a SHA-256 digest`);
    });
  }
  if (Array.isArray(value.turnIds)) {
    if (new Set(value.turnIds).size !== value.turnIds.length) errors.push('turnIds must be unique');
    if (value.turns !== value.turnIds.length) errors.push('turns must equal turnIds.length');
  }

  if (!Array.isArray(value.activeRootInput)) {
    errors.push('activeRootInput must be an array');
  } else {
    value.activeRootInput.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`activeRootInput[${index}] must be an object`);
        return;
      }
      if (!sha256Hex(item.hash)) errors.push(`activeRootInput[${index}].hash must be a SHA-256 hex digest`);
      if (!nullableString(item.promptOccurrenceId)) {
        errors.push(`activeRootInput[${index}].promptOccurrenceId must be null or a non-empty string`);
      }
    });
  }

  if (!Array.isArray(value.userPrompts)) {
    errors.push('userPrompts must be an array');
  } else {
    value.userPrompts.forEach((prompt, index) => {
      if (!prompt || typeof prompt !== 'object' || Array.isArray(prompt)) {
        errors.push(`userPrompts[${index}] must be an object`);
        return;
      }
      if (!nonEmptyString(prompt.occurrenceId)) errors.push(`userPrompts[${index}].occurrenceId is required`);
      if (!sha256Digest(prompt.fingerprint)) {
        errors.push(`userPrompts[${index}].fingerprint must be a SHA-256 digest`);
      }
      if (typeof prompt.text !== 'string') errors.push(`userPrompts[${index}].text must be a string`);
      if (typeof prompt.truncated !== 'boolean') errors.push(`userPrompts[${index}].truncated must be a boolean`);
    });
  }
  if (value.throughSeq !== value.committedEvents) errors.push('throughSeq must equal committedEvents');
  if (value.archiveBytes < value.summaryBytes) errors.push('archiveBytes must be at least summaryBytes');
  if (Array.isArray(value.userPrompts)) {
    const occurrenceIds = value.userPrompts.map(prompt => prompt?.occurrenceId).filter(nonEmptyString);
    if (new Set(occurrenceIds).size !== occurrenceIds.length) errors.push('user prompt occurrenceIds must be unique');
    const occurrences = new Set(occurrenceIds);
    if (Array.isArray(value.activeRootInput)) {
      value.activeRootInput.forEach((item, index) => {
        if (item?.promptOccurrenceId && !occurrences.has(item.promptOccurrenceId)) {
          errors.push(`activeRootInput[${index}].promptOccurrenceId must reference userPrompts`);
        }
      });
    }
  }
  return validationResult(errors);
}

export function createTimelineRecord({
  seq,
  eventId,
  txnId,
  timestamp = new Date().toISOString(),
  committedAt = null,
  threadId,
  parentThreadId = null,
  agentRole,
  turnId = null,
  entryKey,
  entryRevision,
  entryRef,
  inputRevision,
  phase,
  legacyRef = null,
}) {
  const record = {
    kind: TIMELINE_RECORD_KIND,
    version: 1,
    seq,
    eventId,
    txnId,
    timestamp,
    ...(committedAt ? { committedAt } : {}),
    threadId,
    parentThreadId,
    agentRole,
    turnId,
    entryKey,
    entryRevision,
    entryRef,
    inputRevision,
    phase,
    legacyRef,
  };
  const result = validateTimelineRecord(record);
  if (!result.ok) throw new TypeError(result.errors.join('; '));
  return record;
}

export function validateTimelineRecord(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return validationResult(['timeline record must be an object']);
  if (value.kind !== TIMELINE_RECORD_KIND) errors.push(`kind must be ${TIMELINE_RECORD_KIND}`);
  if (value.version !== 1) errors.push('version must be 1');
  if (!positiveInteger(value.seq)) errors.push('seq must be a positive safe integer');
  for (const field of ['eventId', 'txnId', 'threadId', 'agentRole', 'entryKey']) {
    if (!nonEmptyString(value[field])) errors.push(`${field} is required`);
  }
  if (!isoTimestamp(value.timestamp)) errors.push('timestamp must be an ISO-compatible timestamp');
  if (value.committedAt != null && !isoTimestamp(value.committedAt)) {
    errors.push('committedAt must be an ISO-compatible timestamp when present');
  }
  if (!nullableString(value.parentThreadId)) errors.push('parentThreadId must be null or a non-empty string');
  if (!nullableString(value.turnId)) errors.push('turnId must be null or a non-empty string');
  if (!positiveInteger(value.entryRevision)) errors.push('entryRevision must be a positive safe integer');
  if (!nonNegativeInteger(value.inputRevision)) errors.push('inputRevision must be a non-negative safe integer');
  if (!TIMELINE_PHASES.includes(value.phase)) errors.push(`phase must be one of ${TIMELINE_PHASES.join(', ')}`);
  if (value.legacyRef != null) {
    const legacy = value.legacyRef;
    if (!legacy || typeof legacy !== 'object') errors.push('legacyRef must be null or an object');
    else {
      if (!nonEmptyString(legacy.logFile) || legacy.logFile.startsWith('/') || legacy.logFile.split('/').includes('..')) {
        errors.push('legacyRef.logFile must be a safe relative path');
      }
      if (!nonNegativeInteger(legacy.offset)) errors.push('legacyRef.offset must be a non-negative safe integer');
      if (!positiveInteger(legacy.length)) errors.push('legacyRef.length must be a positive safe integer');
    }
  }

  const ref = value.entryRef;
  if (!ref || typeof ref !== 'object') {
    errors.push('entryRef must be an object');
  } else {
    if (!nonEmptyString(ref.thread)) errors.push('entryRef.thread is required');
    if (!nonNegativeInteger(ref.offset)) errors.push('entryRef.offset must be a non-negative safe integer');
    if (!positiveInteger(ref.length)) errors.push('entryRef.length must be a positive safe integer');
    if (!nonEmptyString(ref.checksum)) errors.push('entryRef.checksum is required');
  }
  return validationResult(errors);
}

export function validateImportReceipt(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return validationResult(['import receipt must be an object']);
  if (value.kind !== IMPORT_RECEIPT_KIND) errors.push(`kind must be ${IMPORT_RECEIPT_KIND}`);
  if (value.version !== 1) errors.push('version must be 1');
  if (!nonEmptyString(value.sourceFile) || value.sourceFile.startsWith('/')
      || value.sourceFile.split('/').includes('..') || !value.sourceFile.endsWith('.jsonl')) {
    errors.push('sourceFile must be a safe relative .jsonl path');
  }
  if (!nonNegativeInteger(value.sourceBytes)) errors.push('sourceBytes must be a non-negative safe integer');
  if (!/^sha256:[a-f0-9]{64}$/.test(value.sourceDigest || '')) errors.push('sourceDigest must be a SHA-256 digest');
  for (const field of ['projectId', 'canonicalCwd', 'sessionId']) {
    if (!nonEmptyString(value[field])) errors.push(`${field} is required`);
  }
  if (!isoTimestamp(value.importedAt)) errors.push('importedAt must be an ISO-compatible timestamp');
  if (!positiveInteger(value.entryCount)) errors.push('entryCount must be a positive safe integer');
  if (!/^sha256:[a-f0-9]{64}$/.test(value.entriesDigest || '')) errors.push('entriesDigest must be a SHA-256 digest');
  if (!IMPORT_DURABILITY_MODES.includes(value.durability)) {
    errors.push(`durability must be one of ${IMPORT_DURABILITY_MODES.join(', ')}`);
  }
  if (value.syncedFiles != null && !nonNegativeInteger(value.syncedFiles)) {
    errors.push('syncedFiles must be null or a non-negative safe integer');
  }
  return validationResult(errors);
}
