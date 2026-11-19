export const LOG_V2_WIRE_PROTOCOL = 'cx-viewer.log-v2-wire';
export const LOG_V2_WIRE_VERSION = 2;

export const LOG_V2_WIRE_KINDS = Object.freeze({
  start: `${LOG_V2_WIRE_PROTOCOL}.start`,
  checkpoint: `${LOG_V2_WIRE_PROTOCOL}.checkpoint`,
  commit: `${LOG_V2_WIRE_PROTOCOL}.commit`,
  object: `${LOG_V2_WIRE_PROTOCOL}.object`,
  summaries: `${LOG_V2_WIRE_PROTOCOL}.summaries`,
  fragmentStart: `${LOG_V2_WIRE_PROTOCOL}.fragment-start`,
  fragmentPart: `${LOG_V2_WIRE_PROTOCOL}.fragment-part`,
  fragmentEnd: `${LOG_V2_WIRE_PROTOCOL}.fragment-end`,
  end: `${LOG_V2_WIRE_PROTOCOL}.end`,
  reset: `${LOG_V2_WIRE_PROTOCOL}.reset`,
  error: `${LOG_V2_WIRE_PROTOCOL}.error`,
});

export const LOG_V2_WIRE_LIMITS = Object.freeze({
  maxObjectBatch: 64,
  maxObjectBatchBytes: 16 * 1024 * 1024,
  maxSingleObjectBytes: 64 * 1024 * 1024,
  maxControlFrameBytes: 1024 * 1024,
  maxFragmentedControlBytes: 128 * 1024 * 1024,
});

const HASH = /^[a-f0-9]{64}$/;

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function validateWireArchive(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return Object.freeze({ ok: false, errors: Object.freeze(['archive must be an object']) });
  }
  for (const field of ['projectId', 'sessionId', 'generation']) {
    if (!nonEmptyString(value[field])) errors.push(`archive.${field} is required`);
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateWireObjectRef(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return Object.freeze({ ok: false, errors: Object.freeze(['object ref must be an object']) });
  }
  if (!HASH.test(value.hash || '')) errors.push('object ref hash must be sha256 hex');
  if (!Number.isSafeInteger(value.bytes) || value.bytes < 0) errors.push('object ref bytes must be non-negative');
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateWireInputLocator(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return Object.freeze({ ok: false, errors: Object.freeze(['input locator must be an object']) });
  }
  if (!nonEmptyString(value.threadId)) errors.push('input.threadId is required');
  if (!nonEmptyString(value.path)) errors.push('input.path is required');
  if (!Number.isSafeInteger(value.revision) || value.revision <= 0) {
    errors.push('input.revision must be a positive safe integer');
  }
  if (!Number.isSafeInteger(value.length) || value.length < 0) {
    errors.push('input.length must be a non-negative safe integer');
  }
  if (Object.hasOwn(value, 'refs')) errors.push('input locator must not embed cumulative refs');
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateWireCheckpoint(value) {
  const errors = [];
  if (value?.kind !== LOG_V2_WIRE_KINDS.checkpoint) errors.push('checkpoint.kind is invalid');
  if (value?.version !== LOG_V2_WIRE_VERSION) errors.push('checkpoint.version is unsupported');
  const archive = validateWireArchive(value?.archive);
  if (!archive.ok) errors.push(...archive.errors);
  if (!Number.isSafeInteger(value?.throughSeq) || value.throughSeq < 0) {
    errors.push('checkpoint.throughSeq must be a non-negative safe integer');
  }
  if (!Number.isSafeInteger(value?.timelineBytes) || value.timelineBytes < 0) {
    errors.push('checkpoint.timelineBytes must be a non-negative safe integer');
  }
  for (const field of ['entries', 'threads', 'winners']) {
    if (!Array.isArray(value?.[field])) errors.push(`checkpoint.${field} must be an array`);
  }
  for (const winner of value?.winners || []) {
    if (!nonEmptyString(winner?.entryKey) || winner.entryKey !== winner?.descriptor?.entryKey) {
      errors.push('checkpoint winner identity is invalid');
    }
    if (winner?.descriptor?.input) {
      const input = validateWireInputLocator(winner.descriptor.input);
      if (!input.ok) errors.push(...input.errors);
    }
    for (const ref of Object.values(winner?.descriptor?.parts || {})) {
      const objectRef = validateWireObjectRef(ref);
      if (!objectRef.ok) errors.push(...objectRef.errors);
    }
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function wireObjectRef(storageRef) {
  const ref = Object.freeze({ hash: storageRef?.hash, bytes: storageRef?.bytes });
  const result = validateWireObjectRef(ref);
  if (!result.ok) throw new TypeError(result.errors.join('; '));
  return ref;
}

export function validateWireCursor(value) {
  const errors = [];
  const archive = validateWireArchive(value?.archive);
  if (!archive.ok) errors.push(...archive.errors);
  if (!Number.isSafeInteger(value?.throughSeq) || value.throughSeq < 0) {
    errors.push('cursor.throughSeq must be a non-negative safe integer');
  }
  if (!Number.isSafeInteger(value?.timelineBytes) || value.timelineBytes < 0) {
    errors.push('cursor.timelineBytes must be a non-negative safe integer');
  }
  const hasIdentity = value?.fileId !== undefined || value?.tailHash !== undefined || value?.fileVersion !== undefined;
  if (hasIdentity) {
    if (!nonEmptyString(value?.fileId)) errors.push('cursor.fileId is required when cursor identity is present');
    if (!HASH.test(value?.tailHash || '')) errors.push('cursor.tailHash must be sha256 hex');
    if (!nonEmptyString(value?.fileVersion)) errors.push('cursor.fileVersion is required when cursor identity is present');
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function createWireCursor(archive, throughSeq, timelineBytes, identity = null) {
  const cursor = Object.freeze({
    archive: Object.freeze({ ...archive }),
    throughSeq,
    timelineBytes,
    ...(identity ? {
      fileId: identity.fileId,
      tailHash: identity.tailHash,
      fileVersion: identity.fileVersion,
    } : {}),
  });
  const result = validateWireCursor(cursor);
  if (!result.ok) throw new TypeError(result.errors.join('; '));
  return cursor;
}

export function createWireEnvelope(kind, archive, payload = {}) {
  if (!Object.values(LOG_V2_WIRE_KINDS).includes(kind)) throw new TypeError('unsupported V2 wire kind');
  const archiveResult = validateWireArchive(archive);
  if (!archiveResult.ok) throw new TypeError(archiveResult.errors.join('; '));
  return Object.freeze({
    kind,
    version: LOG_V2_WIRE_VERSION,
    archive: Object.freeze({ ...archive }),
    ...payload,
  });
}

export function sameWireArchive(left, right) {
  return !!left && !!right
    && left.projectId === right.projectId
    && left.sessionId === right.sessionId
    && left.generation === right.generation;
}
