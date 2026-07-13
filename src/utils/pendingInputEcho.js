function normalizePromptText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim();
}

function persistedUserRows(items) {
  if (!Array.isArray(items)) return [];
  const rows = [];
  items.forEach((item, index) => {
    const props = item?.props;
    if (!props || (props.role !== 'user' && props.role !== 'plan-prompt')) return;
    const text = normalizePromptText(props.text);
    if (!text) return;
    const timestamp = typeof props.timestamp === 'string' ? props.timestamp : '';
    const requestIndex = Number.isInteger(props.requestIndex) ? props.requestIndex : null;
    // Raw request timestamp is stable across pagination/reindexing. requestIndex
    // disambiguates the rare same-timestamp collision but is never used alone
    // when a timestamp is available.
    const identity = timestamp
      ? `ts:${timestamp}|req:${requestIndex ?? ''}|text:${text}`
      : `key:${item.key == null ? index : String(item.key)}|text:${text}`;
    rows.push({ identity, text, timestamp, requestIndex });
  });
  return rows;
}

function recordTexts(record) {
  const texts = new Set();
  for (const value of [record?.displayText, record?.wireText]) {
    const normalized = normalizePromptText(value);
    if (normalized) texts.add(normalized);
  }
  return texts;
}

function rowCanAcknowledge(row, record) {
  if (!recordTexts(record).has(row.text)) return false;
  if (record.baselineIds?.includes(row.identity)) return false;
  const rowTime = Date.parse(row.timestamp);
  const createdTime = Date.parse(record.createdAt);
  if (row.requestIndex !== null && Number.isInteger(record.requestCursor)) {
    if (row.requestIndex < record.requestCursor) return false;
    // Pagination can prepend old requests and increase their presentation
    // index beyond the cursor. When timestamps exist, require both signals.
    if (Number.isFinite(rowTime) && Number.isFinite(createdTime)) {
      return rowTime >= createdTime - 1000;
    }
    return true;
  }
  return Number.isFinite(rowTime) && Number.isFinite(createdTime)
    ? rowTime >= createdTime - 1000
    : false;
}

export function createPendingInputRecord({
  id,
  wireText,
  displayText = wireText,
  createdAt = new Date().toISOString(),
  requestCursor = 0,
  renderedItems = [],
} = {}) {
  return {
    id: String(id || `pending-${createdAt}`),
    wireText: typeof wireText === 'string' ? wireText : '',
    displayText: typeof displayText === 'string' ? displayText : '',
    createdAt,
    requestCursor: Number.isInteger(requestCursor) && requestCursor >= 0 ? requestCursor : 0,
    baselineIds: persistedUserRows(renderedItems).map(row => row.identity),
  };
}

/**
 * Consume at most one persisted row per pending send. Consumed row identities
 * are copied into later records so two identical in-flight prompts require two
 * distinct server echoes instead of the first echo clearing both.
 */
export function reconcilePendingInputs(records, renderedItems) {
  if (!Array.isArray(records) || records.length === 0) return records || [];
  const rows = persistedUserRows(renderedItems);
  const consumed = new Set();
  const remaining = [];
  let changed = false;

  for (const record of records) {
    const match = rows.find(row => !consumed.has(row.identity) && rowCanAcknowledge(row, record));
    if (match) {
      consumed.add(match.identity);
      changed = true;
      continue;
    }
    if (consumed.size > 0) {
      const baseline = new Set(record.baselineIds || []);
      for (const identity of consumed) baseline.add(identity);
      remaining.push({ ...record, baselineIds: [...baseline] });
      changed = true;
    } else {
      remaining.push(record);
    }
  }
  return changed ? remaining : records;
}

export function getPendingInputDisplayText(record) {
  return normalizePromptText(record?.displayText || record?.wireText);
}

/** Remove optimistic rows whose queued sends were explicitly cancelled. */
export function removePendingInputsById(records, ids) {
  if (!Array.isArray(records) || records.length === 0) return records || [];
  const cancelled = ids instanceof Set ? ids : new Set(Array.isArray(ids) ? ids : []);
  if (cancelled.size === 0) return records;
  const remaining = records.filter(record => !cancelled.has(record?.id));
  return remaining.length === records.length ? records : remaining;
}
