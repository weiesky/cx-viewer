// Parse Codex apply_patch payloads, including patches nested inside Code Mode's
// top-level `exec` JavaScript. This module is intentionally dependency-free so
// the parser can be covered by node:test and shared by rendering/refresh paths.

const PATCH_BEGIN = '*** Begin Patch';
const PATCH_END = '*** End Patch';
const OP_HEADER_RE = /^\*\*\* (Add|Delete|Update) File: (.+)$/;

function decodeEscapedBody(body, quote) {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    if (i + 1 >= body.length) {
      out += '\\';
      continue;
    }
    const next = body[++i];
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === 'v') out += '\v';
    else if (next === '0') out += '\0';
    else if (next === '\n') { /* JavaScript line continuation */ }
    else if (next === 'x' && /^[0-9a-fA-F]{2}$/.test(body.slice(i + 1, i + 3))) {
      out += String.fromCharCode(parseInt(body.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(body.slice(i + 1, i + 5))) {
      out += String.fromCharCode(parseInt(body.slice(i + 1, i + 5), 16));
      i += 4;
    } else if (next === quote || next === '\\' || next === '`') out += next;
    else out += next;
  }
  return out;
}

/** Extract every JavaScript string literal without executing the program. */
export function extractJavaScriptStringLiterals(source) {
  if (typeof source !== 'string' || !source) return [];
  const values = [];
  for (let i = 0; i < source.length; i++) {
    const quote = source[i];
    if (quote !== '"' && quote !== "'" && quote !== '`') continue;
    const start = i;
    let escaped = false;
    for (i = i + 1; i < source.length; i++) {
      const ch = source[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch !== quote) continue;
      const raw = source.slice(start, i + 1);
      const body = raw.slice(1, -1);
      if (quote === '"') {
        try { values.push(JSON.parse(raw)); }
        catch { values.push(decodeEscapedBody(body, quote)); }
      } else {
        values.push(decodeEscapedBody(body, quote));
      }
      break;
    }
  }
  return values;
}

function patchDocumentsInText(text) {
  if (typeof text !== 'string') return [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const documents = [];
  let current = null;
  for (const line of lines) {
    // Protocol markers must occupy the whole line. Patch content may itself add
    // source strings such as `const PATCH_END = '*** End Patch'`; substring
    // matching would truncate that multi-file patch at the source line.
    if (line === PATCH_BEGIN) {
      current = [line];
      continue;
    }
    if (current === null) continue;
    current.push(line);
    if (line === PATCH_END) {
      documents.push(current.join('\n'));
      current = null;
    }
  }
  return documents;
}

/**
 * Return complete apply_patch documents represented by a tool call.
 * Native apply_patch receives `{ patch }`; Code Mode exec receives JavaScript.
 */
export function extractApplyPatchDocuments(toolName, input) {
  if (toolName === 'apply_patch') {
    const raw = typeof input === 'string' ? input : (input?.patch || input?.description || '');
    return patchDocumentsInText(raw);
  }
  if (toolName !== 'exec') return [];
  const source = typeof input === 'string' ? input : (input?.code || input?.input || '');
  if (typeof source !== 'string' || !source.includes('tools.apply_patch')) return [];
  const found = [];
  const seen = new Set();
  for (const literal of extractJavaScriptStringLiterals(source)) {
    for (const document of patchDocumentsInText(literal)) {
      if (!seen.has(document)) {
        seen.add(document);
        found.push(document);
      }
    }
  }
  return found;
}

function buildDiffPayload(type, lines) {
  const oldLines = [];
  const newLines = [];
  let startLine = 1;
  let sawHunk = false;
  let added = 0;
  let removed = 0;

  for (const line of lines) {
    const hunk = line.match(/^@@(?:\s+-(\d+)(?:,\d+)?\s+\+\d+(?:,\d+)?)?.*$/);
    if (hunk) {
      if (!sawHunk && hunk[1]) startLine = Number(hunk[1]) || 1;
      if (sawHunk) {
        oldLines.push('…');
        newLines.push('…');
      }
      sawHunk = true;
      continue;
    }
    if (line.startsWith('+')) {
      newLines.push(line.slice(1));
      added++;
    } else if (line.startsWith('-')) {
      oldLines.push(line.slice(1));
      removed++;
    } else {
      const context = line.startsWith(' ') ? line.slice(1) : line;
      oldLines.push(context);
      newLines.push(context);
    }
  }

  if (type === 'add') return { oldString: '', newString: newLines.join('\n'), startLine: 1, added, removed: 0 };
  if (type === 'delete') return { oldString: oldLines.join('\n'), newString: '', startLine, added: 0, removed };
  return { oldString: oldLines.join('\n'), newString: newLines.join('\n'), startLine, added, removed };
}

/** Parse one apply_patch document into ordered per-file operations. */
export function parseApplyPatch(document) {
  if (typeof document !== 'string') return [];
  const normalized = document.replace(/\r\n/g, '\n');
  if (!normalized.includes(PATCH_BEGIN) || !normalized.includes(PATCH_END)) return [];
  const lines = normalized.split('\n');
  const operations = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const diff = buildDiffPayload(current.type, current.lines);
    operations.push({
      type: current.type,
      path: current.path,
      ...(current.moveTo ? { moveTo: current.moveTo } : {}),
      ...diff,
    });
    current = null;
  };

  for (const line of lines) {
    const header = line.match(OP_HEADER_RE);
    if (header) {
      flush();
      current = { type: header[1].toLowerCase(), path: header[2].trim(), moveTo: null, lines: [] };
      continue;
    }
    if (line.startsWith('*** Move to: ') && current?.type === 'update') {
      current.moveTo = line.slice('*** Move to: '.length).trim();
      continue;
    }
    if (line === PATCH_BEGIN || line === PATCH_END) continue;
    if (current) current.lines.push(line);
  }
  flush();
  return operations;
}

export function getToolPatchOperations(toolName, input) {
  return extractApplyPatchDocuments(toolName, input).flatMap(parseApplyPatch);
}
