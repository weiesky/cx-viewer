import { classifyRequest } from '../../src/utils/requestType.js';

export const REQUEST_SUMMARY_KIND = 'cx-viewer.request-summary';
export const REQUEST_SUMMARY_VERSION = 2;

const ROOT_FIELDS = Object.freeze([
  'timestamp', 'url', 'proxyUrl', 'method', 'duration', 'mainAgent', 'subAgent',
  'subAgentName', 'teammate', 'teammateName', 'parentThreadId', 'threadId',
  'project', 'inProgress', 'isCountTokens', '_sdkSource', '_otelSource',
  '_conversationId', '_sessionKey', '_userId', '_codexRaw',
]);

function pick(source, fields) {
  const output = {};
  for (const field of fields) {
    if (source?.[field] !== undefined) output[field] = source[field];
  }
  return output;
}

function bodyHints(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? pick(body.metadata, ['thread_id', 'turn_id', 'session_id', 'conversation_id', 'user_id', 'parent_thread_id', 'agent_role'])
    : null;
  return {
    ...pick(body, ['model', 'tool_name', 'event_name', 'item_type', 'status', 'max_tokens']),
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

export function buildRequestSummary(entry, timeline = {}) {
  const response = entry?.response;
  const usage = response?.body?.usage;
  const classification = classifyRequest({ ...entry }, null);
  return Object.freeze({
    kind: REQUEST_SUMMARY_KIND,
    version: REQUEST_SUMMARY_VERSION,
    seq: timeline.seq ?? null,
    eventId: timeline.eventId ?? null,
    entryKey: timeline.entryKey ?? null,
    entryRevision: timeline.entryRevision ?? null,
    threadId: timeline.threadId ?? entry?.threadId ?? null,
    parentThreadId: timeline.parentThreadId ?? entry?.parentThreadId ?? null,
    agentRole: timeline.agentRole ?? null,
    turnId: timeline.turnId ?? null,
    phase: timeline.phase ?? null,
    classification: Object.freeze({ ...classification }),
    root: Object.freeze(pick(entry, ROOT_FIELDS)),
    request: entry?.request && typeof entry.request === 'object' && !Array.isArray(entry.request)
      ? Object.freeze(pick(entry.request, ['method', 'url', 'status', 'duration']))
      : entry?.request ?? null,
    response: response && typeof response === 'object' && !Array.isArray(response)
      ? Object.freeze({
          ...pick(response, ['status', 'statusText', 'duration']),
          ...(usage && typeof usage === 'object' ? { usage } : {}),
        })
      : response ?? null,
    body: Object.freeze(bodyHints(entry?.body) || {}),
  });
}

export function validateRequestSummary(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['summary must be an object'] };
  if (value.kind !== REQUEST_SUMMARY_KIND) errors.push(`kind must be ${REQUEST_SUMMARY_KIND}`);
  if (value.version !== REQUEST_SUMMARY_VERSION) errors.push(`version must be ${REQUEST_SUMMARY_VERSION}`);
  if (!Number.isSafeInteger(value.seq) || value.seq <= 0) errors.push('seq must be positive');
  if (typeof value.eventId !== 'string' || !value.eventId) errors.push('eventId is required');
  if (typeof value.entryKey !== 'string' || !value.entryKey) errors.push('entryKey is required');
  if (!value.classification || typeof value.classification !== 'object'
      || typeof value.classification.type !== 'string'
      || (value.classification.subType !== null && typeof value.classification.subType !== 'string')) {
    errors.push('classification must contain type and nullable subType');
  }
  return { ok: errors.length === 0, errors };
}
