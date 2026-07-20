const SECRET_HEADER = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key)$/i;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function redactHeaders(headers) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return headers;
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [
    key,
    SECRET_HEADER.test(key) ? '[REDACTED]' : value,
  ]));
}

export function sanitizeEntryForV2(entry) {
  const safe = cloneJson(entry);
  if (safe.headers) safe.headers = redactHeaders(safe.headers);
  if (safe.request?.headers) safe.request.headers = redactHeaders(safe.request.headers);
  if (safe.response?.headers) safe.response.headers = redactHeaders(safe.response.headers);
  return safe;
}

function takeObjectParts(container, prefix, parts, inputCandidates, extractInput) {
  if (!container || typeof container !== 'object' || Array.isArray(container)) return;
  const meta = {};
  for (const [key, value] of Object.entries(container)) {
    if (key === 'headers') parts[`${prefix}.headers`] = value;
    else if (key === 'body') {
      if (extractInput && value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.input)) {
        const body = { ...value };
        delete body.input;
        parts[`${prefix}.body`] = body;
        inputCandidates.push({ path: `${prefix}.body.input`, items: value.input });
      } else {
        parts[`${prefix}.body`] = value;
      }
    } else if (extractInput && key === 'input' && Array.isArray(value)) {
      inputCandidates.push({ path: `${prefix}.input`, items: value });
    } else {
      meta[key] = value;
    }
  }
  if (Object.keys(meta).length > 0) parts[`${prefix}.meta`] = meta;
}

/** Splits the wire-compatible entry into independently deduplicated semantic parts. */
export function splitEntryParts(entry) {
  const safe = sanitizeEntryForV2(entry);
  const parts = {};
  const inputCandidates = [];
  const root = {};
  for (const [key, value] of Object.entries(safe)) {
    if (key === 'headers') parts['root.headers'] = value;
    else if (key === 'body') {
      if (value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.input)) {
        const body = { ...value };
        delete body.input;
        parts['root.body'] = body;
        inputCandidates.push({ path: 'root.body.input', items: value.input });
      } else parts['root.body'] = value;
    } else if (key === 'input' && Array.isArray(value)) {
      inputCandidates.push({ path: 'root.input', items: value });
    } else if (key === 'request' || key === 'response') {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        takeObjectParts(value, key, parts, inputCandidates, key === 'request');
      } else {
        // Preserve non-object containers verbatim during semantic splitting.
        root[key] = value;
      }
    } else {
      root[key] = value;
    }
  }
  if (Object.keys(root).length > 0) parts['root.meta'] = root;
  if (inputCandidates.length > 1) {
    throw new TypeError('entry contains multiple independently addressable input arrays');
  }
  return Object.freeze({ parts, input: inputCandidates[0] ?? null });
}

export function deriveEntryKey(entry) {
  const timestamp = typeof entry?.timestamp === 'string' ? entry.timestamp : '';
  const url = typeof entry?.url === 'string' ? entry.url : '';
  if (!timestamp && !url) throw new TypeError('entryKey is required when entry has no timestamp or url');
  return `${timestamp}\u0000${url}`;
}

export function deriveTimelinePhase(entry, explicitPhase) {
  if (explicitPhase) return explicitPhase;
  const status = entry?.response?.body?.turn?.status ?? entry?.turn?.status ?? entry?.status;
  if (status === 'failed') return 'failed';
  if (status === 'interrupted' || status === 'cancelled') return 'interrupted';
  if (status === 'inProgress' || status === 'in_progress' || status === 'running') return 'inProgress';
  return 'completed';
}

export function deriveTurnId(entry) {
  return entry?.body?.metadata?.turn_id
    ?? entry?.body?._turnId
    ?? entry?.request?.body?.metadata?.turn_id
    ?? entry?.response?.body?.turn?.id
    ?? null;
}

export function applyInputOperations(previous, record) {
  if (!Array.isArray(previous)) throw new TypeError('previous input sequence must be an array');
  if (!Number.isSafeInteger(record?.retain) || record.retain < 0 || record.retain > previous.length) {
    throw new TypeError('invalid input retain count');
  }
  if (!Number.isSafeInteger(record.remove) || record.remove < 0 || record.retain + record.remove !== previous.length) {
    throw new TypeError('invalid input remove count');
  }
  if (!Array.isArray(record.append)) throw new TypeError('input append must be an array');
  return [...previous.slice(0, record.retain), ...record.append];
}

export function diffInputReferences(previous, next) {
  let retain = 0;
  while (retain < previous.length && retain < next.length && previous[retain].hash === next[retain].hash) retain++;
  return Object.freeze({ retain, remove: previous.length - retain, append: next.slice(retain) });
}

function clonePart(value) {
  return JSON.parse(JSON.stringify(value));
}

function assignContainerPart(entry, containerName, suffix, value, cloneValues) {
  const assigned = cloneValues ? clonePart(value) : value;
  if (containerName === 'root') {
    if (suffix === 'meta') Object.assign(entry, assigned);
    else entry[suffix] = assigned;
    return;
  }
  if (!entry[containerName] || typeof entry[containerName] !== 'object' || Array.isArray(entry[containerName])) {
    entry[containerName] = {};
  }
  if (suffix === 'meta') Object.assign(entry[containerName], assigned);
  else entry[containerName][suffix] = assigned;
}

function attachInput(entry, path, items, cloneValues) {
  const input = cloneValues ? items.map(clonePart) : [...items];
  if (path === 'root.input') entry.input = input;
  else if (path === 'root.body.input') {
    if (!entry.body || typeof entry.body !== 'object' || Array.isArray(entry.body)) entry.body = {};
    entry.body.input = input;
  } else if (path === 'request.input') {
    if (!entry.request || typeof entry.request !== 'object' || Array.isArray(entry.request)) entry.request = {};
    entry.request.input = input;
  } else if (path === 'request.body.input') {
    if (!entry.request || typeof entry.request !== 'object' || Array.isArray(entry.request)) entry.request = {};
    if (!entry.request.body || typeof entry.request.body !== 'object' || Array.isArray(entry.request.body)) {
      entry.request.body = {};
    }
    entry.request.body.input = input;
  } else {
    throw new TypeError(`unsupported V2 input path: ${path}`);
  }
}

/** Reassembles semantic entry parts and an optional input sequence into the safe wire view. */
export function assembleEntryParts(parts, input = null, { cloneValues = true } = {}) {
  const entry = {};
  const ordered = ['root.meta', 'root.headers', 'root.body', 'request.meta', 'request.headers', 'request.body', 'response.meta', 'response.headers', 'response.body'];
  for (const key of ordered) {
    if (!parts.has(key)) continue;
    const [containerName, suffix] = key.split('.');
    assignContainerPart(entry, containerName, suffix, parts.get(key), cloneValues);
  }
  for (const key of parts.keys()) {
    if (!ordered.includes(key)) throw new TypeError(`unsupported V2 entry part: ${key}`);
  }
  if (input) attachInput(entry, input.path, input.items, cloneValues);
  return entry;
}
