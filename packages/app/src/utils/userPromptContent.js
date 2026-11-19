import { IMAGE_EXTS } from './userImageRefs.js';
import { extractDisplayText } from './contentFilter.js';

const RASTER_DATA_URL_RE = /^data:(image\/(?:png|jpeg|gif|webp|avif|bmp));base64,/i;
export const MAX_INLINE_PROMPT_IMAGE_CHARS = 14 * 1024 * 1024;
export const MAX_PROJECTED_PROMPTS = 512;
export const MAX_PROJECTED_SEGMENTS = 2048;
export const MAX_PROJECTED_TEXT_CHARS = 1024 * 1024;
export const MAX_PROJECTED_TEXT_SEGMENT_CHARS = 256 * 1024;
export const MAX_PROJECTED_SOURCE_CHARS = MAX_INLINE_PROMPT_IMAGE_CHARS;
export const MAX_PROJECTED_RECORD_BYTES = MAX_PROJECTED_SOURCE_CHARS + MAX_PROJECTED_TEXT_CHARS;
const USER_MESSAGE_TYPES = new Set(['', 'message']);
const TEXT_BLOCK_TYPES = new Set(['', 'text', 'input_text']);
const IMAGE_BLOCK_TYPES = new Set(['input_image', 'image_url', 'image']);

function createProjectionBudget() {
  return { segments: 0, textChars: 0, sourceChars: 0, bytes: 0, truncations: 0 };
}

function noteTruncation(budget) {
  if (budget) budget.truncations++;
}

function projectionBudgetExhausted(budget) {
  return !!budget && (
    budget.segments >= MAX_PROJECTED_SEGMENTS
    || budget.textChars >= MAX_PROJECTED_TEXT_CHARS
    || budget.sourceChars >= MAX_PROJECTED_SOURCE_CHARS
    || budget.bytes >= MAX_PROJECTED_RECORD_BYTES
  );
}

function unavailableImage(reason, budget) {
  noteTruncation(budget);
  return {
    type: 'image', sourceType: 'unavailable', source: '', alt: null,
    truncated: true, unavailableReason: reason,
  };
}

function utf8CodePointBytes(codePoint) {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function utf8ByteLength(value) {
  if (/^[\x00-\x7f]*$/.test(value)) return value.length;
  let bytes = 0;
  for (const character of value) bytes += utf8CodePointBytes(character.codePointAt(0));
  return bytes;
}

function reserveSource(source, budget) {
  if (!budget) return true;
  const bytes = utf8ByteLength(source);
  if (budget.sourceChars + source.length > MAX_PROJECTED_SOURCE_CHARS
      || budget.bytes + bytes > MAX_PROJECTED_RECORD_BYTES) return false;
  budget.sourceChars += source.length;
  budget.bytes += bytes;
  return true;
}

function ownValue(object, key) {
  if (!object || typeof object !== 'object') return undefined;
  try {
    if (!Object.hasOwn(object, key)) return undefined;
    return object[key];
  } catch {
    return undefined;
  }
}

export function normalizeCodexUserText(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^<environment_context>[\s\S]*<\/environment_context>$/.test(trimmed)) return '';
  if (/^<codex_internal_context\b[\s\S]*<\/codex_internal_context>$/.test(trimmed)) {
    const objective = trimmed.match(/<objective>([\s\S]*?)<\/objective>/);
    return objective ? objective[1].trim() : '';
  }
  return value;
}

function imageAltFromSource(source) {
  if (typeof source !== 'string' || !source) return 'user image';
  try {
    const pathname = /^https?:\/\//i.test(source) ? new URL(source).pathname : source;
    const name = pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : 'user image';
  } catch {
    return 'user image';
  }
}

function normalizeStringImageSource(source, budget = null) {
  if (typeof source !== 'string' || !source) return null;
  if (RASTER_DATA_URL_RE.test(source)) {
    if (source.length > MAX_INLINE_PROMPT_IMAGE_CHARS) {
      return unavailableImage('inline_image_too_large', budget);
    }
    if (!reserveSource(source, budget)) return unavailableImage('record_source_budget', budget);
    return { type: 'image', sourceType: 'data', source, alt: 'user image' };
  }
  if (/^https?:\/\//i.test(source)) {
    try {
      const url = new URL(source);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      if (!reserveSource(url.href, budget)) return unavailableImage('record_source_budget', budget);
      return { type: 'image', sourceType: 'remote', source: url.href, alt: imageAltFromSource(url.href) };
    } catch {
      return null;
    }
  }
  let filePath = source;
  if (/^file:\/\//i.test(source)) {
    try { filePath = decodeURIComponent(new URL(source).pathname); } catch { return null; }
  }
  if (filePath.startsWith('/') && IMAGE_EXTS.test(filePath)) {
    if (!reserveSource(filePath, budget)) return unavailableImage('record_source_budget', budget);
    return { type: 'image', sourceType: 'file', source: filePath, alt: imageAltFromSource(filePath) };
  }
  return null;
}

function normalizeImageBlock(block, budget = null) {
  const rawSource = ownValue(block, 'image_url') ?? ownValue(block, 'url') ?? ownValue(block, 'source');
  if (typeof rawSource === 'string') return normalizeStringImageSource(rawSource, budget);
  if (!rawSource || typeof rawSource !== 'object') return null;

  const sourceType = ownValue(rawSource, 'type');
  if (sourceType === 'base64') {
    const mediaType = ownValue(rawSource, 'media_type');
    const data = ownValue(rawSource, 'data');
    if (typeof mediaType !== 'string' || typeof data !== 'string') return null;
    if (!/^image\/(?:png|jpeg|gif|webp|avif|bmp)$/i.test(mediaType)) return null;
    const prefix = `data:${mediaType};base64,`;
    // Check before concatenation so an oversized nested base64 value does not
    // cause an equally large temporary allocation just to be rejected.
    if (prefix.length + data.length > MAX_INLINE_PROMPT_IMAGE_CHARS) {
      return unavailableImage('inline_image_too_large', budget);
    }
    return normalizeStringImageSource(prefix + data, budget);
  }
  const nestedUrl = ownValue(rawSource, 'url');
  if (typeof nestedUrl === 'string') return normalizeStringImageSource(nestedUrl, budget);
  return null;
}

function appendSegment(segments, segment, budget) {
  if (budget && budget.segments >= MAX_PROJECTED_SEGMENTS) {
    noteTruncation(budget);
    return false;
  }
  if (budget) budget.segments++;
  segments.push(segment);
  return true;
}

function appendTextSegment(segments, value, budget = null) {
  const normalized = normalizeCodexUserText(value);
  const displayText = extractDisplayText(normalized);
  if (!displayText) return;
  const totalRemaining = budget ? MAX_PROJECTED_TEXT_CHARS - budget.textChars : displayText.length;
  const charLimit = Math.max(0, Math.min(
    displayText.length,
    MAX_PROJECTED_TEXT_SEGMENT_CHARS,
    totalRemaining,
  ));
  const byteLimit = budget ? Math.max(0, MAX_PROJECTED_RECORD_BYTES - budget.bytes) : Infinity;
  let allowed = 0;
  let bytes = 0;
  for (const character of displayText) {
    const nextChars = character.length;
    const nextBytes = utf8CodePointBytes(character.codePointAt(0));
    if (allowed + nextChars > charLimit || bytes + nextBytes > byteLimit) break;
    allowed += nextChars;
    bytes += nextBytes;
  }
  if (allowed === 0) {
    noteTruncation(budget);
    return;
  }
  const truncated = allowed < displayText.length;
  if (budget) {
    budget.textChars += allowed;
    budget.bytes += bytes;
  }
  appendSegment(segments, {
    type: 'text',
    text: displayText.slice(0, allowed),
    ...(truncated ? { truncated: true, unavailableReason: 'record_text_budget' } : {}),
  }, budget);
  if (truncated) noteTruncation(budget);
}

function projectContent(content, budget = null) {
  const segments = [];
  if (typeof content === 'string') {
    appendTextSegment(segments, content, budget);
    return segments;
  }
  const blocks = Array.isArray(content) ? content : [content];
  for (const block of blocks) {
    if (projectionBudgetExhausted(budget)) {
      noteTruncation(budget);
      break;
    }
    if (typeof block === 'string') {
      appendTextSegment(segments, block, budget);
      continue;
    }
    if (!block || typeof block !== 'object') continue;
    const blockTypeValue = ownValue(block, 'type');
    const blockType = typeof blockTypeValue === 'string' ? blockTypeValue : '';
    if (TEXT_BLOCK_TYPES.has(blockType)) {
      const text = ownValue(block, 'text') ?? ownValue(block, 'input_text');
      appendTextSegment(segments, text, budget);
      continue;
    }
    if (IMAGE_BLOCK_TYPES.has(blockType)) {
      const image = normalizeImageBlock(block, budget);
      if (image) appendSegment(segments, image, budget);
    }
  }
  return segments;
}

/** Project one Responses input item into plain user-authored text/image segments. */
function projectUserPromptItemWithBudget(item, budget) {
  if (!item || typeof item !== 'object' || ownValue(item, 'role') !== 'user') return null;
  const itemTypeValue = ownValue(item, 'type');
  const itemType = typeof itemTypeValue === 'string' ? itemTypeValue : '';
  if (!USER_MESSAGE_TYPES.has(itemType)) return null;

  let content = ownValue(item, 'content');
  if (content == null) {
    const text = ownValue(item, 'text') ?? ownValue(item, 'input_text');
    if (typeof text === 'string') content = text;
  }
  const truncationsBefore = budget?.truncations || 0;
  const segments = projectContent(content, budget);
  if (segments.length === 0) return null;
  const rawId = ownValue(item, 'id');
  return {
    ...(typeof rawId === 'string' && rawId ? { id: rawId } : {}),
    segments,
    ...((budget?.truncations || 0) > truncationsBefore
      ? { truncated: true, unavailableReason: 'record_budget' }
      : {}),
  };
}

export function projectUserPromptItem(item) {
  return projectUserPromptItemWithBudget(item, createProjectionBudget());
}

function streamingStringFingerprint(value) {
  if (typeof value !== 'string') return '0:0';
  // Hash the complete string without slicing or serializing it. Two independent
  // 32-bit accumulators keep overlap detection inexpensive even for large data
  // URLs while avoiding deterministic collisions when only the middle differs.
  let fnv = 0x811c9dc5;
  let mix = 0x9e3779b9;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    fnv ^= code;
    fnv = Math.imul(fnv, 0x01000193);
    mix ^= code + 0x9e3779b9 + (mix << 6) + (mix >>> 2);
  }
  return `${value.length}:${(fnv >>> 0).toString(36)}:${(mix >>> 0).toString(36)}`;
}

/** Stable, bounded identity for merge overlap detection; never embeds content. */
export function projectedPromptFingerprint(prompt) {
  if (typeof prompt?.id === 'string' && prompt.id) return `id:${prompt.id}`;
  const segments = Array.isArray(prompt?.segments) ? prompt.segments : [];
  return segments.map(segment => {
    if (segment?.type === 'text') return `t:${streamingStringFingerprint(segment.text)}`;
    if (segment?.type === 'image') {
      return `i:${segment.sourceType || ''}:${streamingStringFingerprint(segment.source)}`;
    }
    return 'unknown';
  }).join('|');
}

function markPromptRecordTruncated(prompts, budget) {
  if (!budget || budget.truncations === 0) return prompts;
  if (prompts.length < MAX_PROJECTED_PROMPTS && !projectionBudgetExhausted(budget)) {
    budget.segments++;
    prompts.push({
      truncated: true,
      unavailableReason: 'record_budget',
      segments: [{ type: 'text', text: '…', truncated: true, unavailableReason: 'record_budget' }],
    });
  } else if (prompts.length > 0) {
    const last = prompts[prompts.length - 1];
    prompts[prompts.length - 1] = { ...last, truncated: true, unavailableReason: 'record_budget' };
  }
  return prompts;
}

/** Keep ordering and duplicates; only user-authored message items are projected. */
export function projectUserPrompts(input, endExclusive = input?.length ?? 0) {
  if (!Array.isArray(input)) return [];
  const end = Math.max(0, Math.min(input.length, Number.isFinite(endExclusive) ? endExclusive : input.length));
  const prompts = [];
  const budget = createProjectionBudget();
  for (let i = 0; i < end; i++) {
    if (prompts.length >= MAX_PROJECTED_PROMPTS - 1 || projectionBudgetExhausted(budget)) {
      noteTruncation(budget);
      break;
    }
    const prompt = projectUserPromptItemWithBudget(input[i], budget);
    if (prompt) prompts.push(prompt);
  }
  return markPromptRecordTruncated(prompts, budget);
}

/** Re-validate persisted metadata without retaining arbitrary raw objects/getters. */
export function sanitizeProjectedUserPrompts(value) {
  if (!Array.isArray(value)) return [];
  const prompts = [];
  const budget = createProjectionBudget();
  for (const record of value) {
    if (prompts.length >= MAX_PROJECTED_PROMPTS - 1 || projectionBudgetExhausted(budget)) {
      noteTruncation(budget);
      break;
    }
    if (!record || typeof record !== 'object') continue;
    const rawSegments = ownValue(record, 'segments');
    if (!Array.isArray(rawSegments)) continue;
    const segments = [];
    const truncationsBefore = budget.truncations;
    for (const segment of rawSegments) {
      if (projectionBudgetExhausted(budget)) {
        noteTruncation(budget);
        break;
      }
      if (!segment || typeof segment !== 'object') continue;
      const type = ownValue(segment, 'type');
      if (type === 'text') {
        appendTextSegment(segments, ownValue(segment, 'text'), budget);
      } else if (type === 'image') {
        const sourceType = ownValue(segment, 'sourceType');
        const source = ownValue(segment, 'source');
        if (sourceType === 'unavailable') {
          appendSegment(segments, {
            type: 'image', sourceType: 'unavailable', source: '', alt: null,
            truncated: true,
            unavailableReason: typeof ownValue(segment, 'unavailableReason') === 'string'
              ? ownValue(segment, 'unavailableReason')
              : 'unavailable_source',
          }, budget);
          continue;
        }
        const image = normalizeStringImageSource(source, budget);
        if (image && (image.sourceType === sourceType || image.sourceType === 'unavailable')) {
          appendSegment(segments, image, budget);
        }
      }
    }
    if (segments.length === 0) continue;
    const rawId = ownValue(record, 'id');
    prompts.push({
      ...(typeof rawId === 'string' && rawId ? { id: rawId } : {}),
      segments,
      ...((budget.truncations > truncationsBefore || ownValue(record, 'truncated') === true)
        ? {
          truncated: true,
          unavailableReason: typeof ownValue(record, 'unavailableReason') === 'string'
            ? ownValue(record, 'unavailableReason')
            : 'record_budget',
        }
        : {}),
    });
  }
  return markPromptRecordTruncated(prompts, budget);
}
