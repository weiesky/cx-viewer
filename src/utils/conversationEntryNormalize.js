/**
 * Build the transcript consumed by ChatView without changing the request shown
 * in DetailPanel. Codex sends OpenAI Responses items (`message`, `reasoning`,
 * `custom_tool_call`, `*_output`), while the historical renderer consumes
 * role messages containing text/thinking/tool_use/tool_result blocks.
 */
import { getEntryUserId, getMainAgentSessionKey } from './clearCheckpoint.js';
import { messageFingerprint } from './sessionMerge.js';
import { normalizeCodexUserText, projectUserPromptItem } from './userPromptContent.js';

const CODEX_RESPONSE_ITEM_TYPES = new Set([
  'compaction',
  'reasoning',
  'function_call',
  'function_call_output',
  'custom_tool_call',
  'custom_tool_call_output',
  'local_shell_call',
  'local_shell_call_output',
  'tool_search_call',
  'tool_search_output',
  'web_search_call',
  'computer_call',
  'computer_call_output',
]);

/** Keep OpenAI Responses transport entries inspectable, but out of chat projection. */
export function shouldExcludeFromConversation(entry) {
  return [entry?.proxyUrl, entry?.url].some(value => {
    if (typeof value !== 'string' || !value) return false;
    try {
      const url = new URL(value);
      return url.hostname === 'api.openai.com'
        && /^\/v1\/responses(?:\/|$)/.test(url.pathname);
    } catch {
      return false;
    }
  });
}

function cloneJson(value) {
  if (value == null) return value;
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

function normalizeToolResultContent(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const mapped = [];
    let hasImage = false;
    for (const part of value) {
      if (!part) continue;
      if (typeof part === 'string') {
        mapped.push({ type: 'text', text: part });
        continue;
      }
      const text = part.text || part.input_text || part.output_text;
      if (typeof text === 'string' && text) {
        mapped.push({ type: 'text', text });
        continue;
      }
      const imageUrl = part.image_url || part.url;
      if ((part.type === 'input_image' || part.type === 'image_url') && typeof imageUrl === 'string') {
        const data = imageUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
        if (data) {
          hasImage = true;
          mapped.push({ type: 'image', source: { type: 'base64', media_type: data[1], data: data[2] } });
        } else if (/^https?:\/\//.test(imageUrl)) {
          hasImage = true;
          mapped.push({ type: 'image', source: { type: 'url', url: imageUrl } });
        }
        continue;
      }
      if (part.type === 'image' && part.source) {
        hasImage = true;
        mapped.push(cloneJson(part));
      }
    }
    if (hasImage) return mapped;
    const text = mapped.filter(part => part.type === 'text').map(part => part.text).join('\n');
    if (text) return text;
  }
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function textFromContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content?.text || content?.input_text || content?.output_text || '';
  return content.map(part => {
    if (typeof part === 'string') return part;
    return part?.text || part?.input_text || part?.output_text || '';
  }).filter(Boolean).join('');
}

function readableReasoning(item) {
  const summary = textFromContent(item?.summary);
  const content = textFromContent(item?.content);
  return summary || content || item?.text || '';
}

function normalizeMessageContent(item) {
  const content = item?.content;
  if (typeof content === 'string') {
    return item.role === 'user' ? normalizeCodexUserText(content) : content;
  }
  if (!Array.isArray(content)) {
    const text = textFromContent(content);
    return text ? [{ type: 'text', text }] : [];
  }
  const blocks = [];
  for (const part of content) {
    if (!part) continue;
    if (typeof part === 'string') {
      blocks.push({ type: 'text', text: part });
      continue;
    }
    const rawText = part.text || part.input_text || part.output_text;
    const text = item.role === 'user' ? normalizeCodexUserText(rawText) : rawText;
    if (typeof text === 'string' && text) {
      blocks.push({
        type: 'text',
        text,
        ...(item.phase ? { phase: item.phase } : {}),
        ...(item.id ? { _codexItemId: item.id } : {}),
      });
      continue;
    }
    // Preserve image/file parts for renderers that understand them. Unknown
    // protocol-only parts stay out of the visible transcript.
    if (/image|file/.test(part.type || '')) blocks.push(cloneJson(part));
  }
  return blocks;
}

function toolCallName(item) {
  if (item.type === 'web_search_call') return 'web_search';
  if (item.type === 'tool_search_call') return 'tool_search';
  if (item.type === 'local_shell_call') return 'local_shell';
  if (item.type === 'computer_call') return 'computer';
  return item.name || item.tool || item.type || 'tool';
}

function toolCallInput(item) {
  const raw = item.arguments ?? item.input ?? item.action ?? {};
  if (typeof raw !== 'string') return cloneJson(raw);
  try { return JSON.parse(raw); } catch { return raw; }
}

function toolCallId(item) {
  return item.call_id || item.callId || item.id || `${toolCallName(item)}:unknown`;
}

function collapseExactRepeatedText(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length % 2 !== 0) return value;
  const half = value.length / 2;
  return value.slice(0, half) === value.slice(half) ? value.slice(0, half) : value;
}

function normalizeResponseBlocks(content, repairLegacySseDuplicates) {
  const blocks = [];
  const indexById = new Map();
  for (const original of content || []) {
    if (!original || typeof original !== 'object') continue;
    const block = cloneJson(original);
    if (repairLegacySseDuplicates && block.type === 'text') {
      block.text = collapseExactRepeatedText(block.text);
    } else if (repairLegacySseDuplicates && block.type === 'thinking') {
      block.thinking = collapseExactRepeatedText(block.thinking);
    }
    const id = block._codexItemId || (block.type === 'tool_use' ? block.id : null);
    if (!id) {
      blocks.push(block);
      continue;
    }
    const existingIndex = indexById.get(id);
    if (existingIndex === undefined) {
      indexById.set(id, blocks.length);
      blocks.push(block);
    } else {
      blocks[existingIndex] = block;
    }
  }
  return blocks;
}

function isToolCall(item) {
  return /(?:^|_)(?:function|tool|shell|search|computer)_call$/.test(item?.type || '')
    || item?.type === 'custom_tool_call'
    || item?.type === 'local_shell_call'
    || item?.type === 'web_search_call';
}

function isToolOutput(item) {
  return /_output$/.test(item?.type || '') && !!(item.call_id || item.callId || item.id);
}

export function isCodexResponsesInput(input) {
  if (!Array.isArray(input)) return false;
  return input.some(item => {
    if (!item || typeof item !== 'object') return false;
    if (CODEX_RESPONSE_ITEM_TYPES.has(item.type)) return true;
    return item.type === 'message' && Array.isArray(item.content)
      && item.content.some(part => /^(?:input|output)_(?:text|image|file)$/.test(part?.type || ''));
  });
}

export function codexItemsToViewerMessages(input, responseContent = null) {
  const messages = [];
  let assistantBlocks = [];
  let latestCompactionIndex = -1;
  for (let i = 0; i < (input || []).length; i++) {
    if (input[i]?.type === 'compaction') latestCompactionIndex = i;
  }
  let latestPromptBeforeCompaction = -1;
  if (latestCompactionIndex >= 0) {
    for (let i = latestCompactionIndex - 1; i >= 0; i--) {
      if (projectUserPromptItem(input[i])) {
        latestPromptBeforeCompaction = i;
        break;
      }
    }
  }
  const compactHistoryCutoff = latestCompactionIndex < 0
    ? -1
    : (latestPromptBeforeCompaction >= 0 ? latestPromptBeforeCompaction : latestCompactionIndex);

  const flushAssistant = () => {
    if (assistantBlocks.length === 0) return;
    messages.push({ role: 'assistant', content: assistantBlocks });
    assistantBlocks = [];
  };

  const appendUserBlocks = (blocks) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return;
    const prev = messages[messages.length - 1];
    if (prev?.role === 'user' && Array.isArray(prev.content)
        && prev.content.every(block => block?.type === 'tool_result')
        && blocks.every(block => block?.type === 'tool_result')) {
      prev.content.push(...blocks);
    } else {
      messages.push({ role: 'user', content: blocks });
    }
  };

  for (let itemIndex = 0; itemIndex < (input || []).length; itemIndex++) {
    const item = input[itemIndex];
    if (!item || typeof item !== 'object') continue;

    // A native compaction replaces the transcript before its latest prompt.
    // Retain that prompt and every causal item from it to the marker (assistant
    // reasoning/tool calls/results), but do not leave earlier assistant/tool
    // messages orphaned after their user prompt has been removed.
    if (compactHistoryCutoff >= 0 && itemIndex < compactHistoryCutoff) continue;

    if (item.type === 'message' || (!item.type && item.role)) {
      if (item.role === 'developer' || item.role === 'system') continue;
      const content = normalizeMessageContent(item);
      if (content.length === 0 && typeof item.content !== 'string') continue;
      if (item.role === 'assistant') {
        assistantBlocks.push(...(Array.isArray(content) ? content : [{ type: 'text', text: content }]));
      } else if (item.role === 'user') {
        flushAssistant();
        if (typeof content === 'string') messages.push({ role: 'user', content });
        else appendUserBlocks(content);
      }
      continue;
    }

    if (item.type === 'reasoning') {
      const thinking = readableReasoning(item);
      if (thinking) assistantBlocks.push({
        type: 'thinking',
        thinking,
        ...(item.summary ? { summary: cloneJson(item.summary) } : {}),
        ...(item.id ? { _codexItemId: item.id } : {}),
      });
      continue;
    }

    if (isToolCall(item)) {
      assistantBlocks.push({
        type: 'tool_use',
        id: toolCallId(item),
        name: toolCallName(item),
        input: toolCallInput(item),
        _codexItemType: item.type,
        ...(item.id ? { _codexItemId: item.id } : {}),
      });
      continue;
    }

    if (isToolOutput(item)) {
      flushAssistant();
      appendUserBlocks([{
        type: 'tool_result',
        tool_use_id: item.call_id || item.callId || item.id,
        content: normalizeToolResultContent(item.output ?? item.result),
        ...(item.status === 'failed' || item.error ? { is_error: true } : {}),
        _codexItemType: item.type,
      }]);
    }
  }

  flushAssistant();

  if (Array.isArray(responseContent) && responseContent.length > 0) {
    const blocks = responseContent.filter(Boolean).map(cloneJson);
    const prev = messages[messages.length - 1];
    if (prev?.role === 'assistant') {
      prev.content.push(...blocks);
      prev._codexCurrentResponse = true;
    } else {
      messages.push({ role: 'assistant', content: blocks, _codexCurrentResponse: true });
    }
  }

  return messages;
}

function contentEquals(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; }
}

function appendViewerResponse(messages, responseContent) {
  if (!Array.isArray(responseContent) || responseContent.length === 0) return messages;
  const blocks = responseContent.filter(Boolean).map(cloneJson);
  const last = messages[messages.length - 1];
  if (last?.role === 'assistant' && contentEquals(last.content, blocks)) return messages;
  return [...messages, { role: 'assistant', content: blocks, _codexCurrentResponse: true }];
}

/**
 * Older interceptor builds normalized Responses usage before copying
 * input_tokens_details.  The untouched upstream response is still stored in
 * raw_response, so repair only the missing details while loading those logs.
 */
function repairLegacyResponseUsage(entry) {
  const responseBody = entry?.response?.body;
  const usage = responseBody?.usage;
  const rawUsage = responseBody?.raw_response?.usage;
  if (!usage || !rawUsage || usage.input_tokens_details != null
      || rawUsage.input_tokens_details == null) {
    return entry;
  }
  return {
    ...entry,
    response: {
      ...entry.response,
      body: {
        ...responseBody,
        usage: {
          ...usage,
          input_tokens_details: cloneJson(rawUsage.input_tokens_details),
        },
      },
    },
  };
}

/**
 * Return an entry whose body.input is suitable for the conversation pipeline.
 * Codex entries are shallow-cloned so DetailPanel continues to show the exact
 * Responses request body. Legacy app-server logs keep their historical in-place
 * aliases for backwards compatibility.
 */
export function normalizeConversationEntry(entry) {
  entry = repairLegacyResponseUsage(entry);
  const body = entry?.body;
  if (!body || typeof body !== 'object') return entry;

  if (isCodexResponsesInput(body.input)) {
    const responseBody = entry.response?.body;
    const repairLegacySseDuplicates = Array.isArray(responseBody?.raw_response?.output)
      && responseBody.raw_response.output.length === 0;
    const responseContent = entry.inProgress || !Array.isArray(responseBody?.content)
      ? null
      : normalizeResponseBlocks(responseBody.content, repairLegacySseDuplicates);
    return {
      ...entry,
      _codexConversationProjection: true,
      body: {
        ...body,
        input: codexItemsToViewerMessages(body.input, responseContent),
      },
    };
  }

  if ((entry._sdkSource || entry._appServerSource) && Array.isArray(body.input)) {
    const responseContent = entry.inProgress ? null : entry.response?.body?.content;
    const input = appendViewerResponse(body.input, responseContent);
    if (input !== body.input) {
      return {
        ...entry,
        _codexConversationProjection: true,
        body: { ...body, input },
      };
    }
  }

  if (!Array.isArray(body.input) && Array.isArray(body.messages)) {
    body.input = body.messages;
  }
  if (body.instructions == null && body.system != null) {
    body.instructions = body.system;
  }
  return entry;
}

/** Preserve the viewer-message count before a slimmer clears cumulative input. */
export function stampConversationMessageCount(entry) {
  const projected = normalizeConversationEntry(entry);
  if (projected !== entry && projected?._codexConversationProjection) {
    entry._codexResponsesEntry = true;
    entry._conversationMessageCount = projected.body.input.length;
  }
  return entry;
}

function rawItemIdentity(item, index) {
  if (!item || typeof item !== 'object') return `${index}:${String(item)}`;
  const id = item.id || item.call_id || item.callId;
  if (id) return `${item.type || item.role || 'item'}:${id}`;
  try { return `${item.type || item.role || 'item'}:${JSON.stringify(item)}`; }
  catch { return `${item.type || item.role || 'item'}:${index}`; }
}

function isPrefix(previous, current) {
  if (!Array.isArray(previous) || !Array.isArray(current) || previous.length > current.length) return false;
  for (let i = 0; i < previous.length; i++) {
    if (previous[i] !== current[i]) return false;
  }
  return true;
}

function conversationProjectionKey(entry) {
  const sessionKey = getMainAgentSessionKey(entry);
  if (sessionKey) return sessionKey;
  const user = getEntryUserId(entry) || 'anonymous';
  return `${user}|${entry?.url || 'codex-responses'}`;
}

/**
 * Stateful projection for ingestion pipelines. A Responses request carries the
 * complete pre-compact input on every turn. Projecting that full array for each
 * network entry makes the renderer repeatedly ingest the same transcript.
 *
 * The normalizer remembers each thread's raw item prefix and full projected
 * message fingerprints. When the next request is a strict cumulative extension,
 * it emits a one-message overlap window plus the new tail. The overlap is the
 * anchor expected by mergeMainAgentSessions; `_conversationWindowStart` keeps
 * positional timestamps aligned to the original full transcript. A compact or
 * any non-prefix rewrite resets the epoch and emits a full snapshot.
 */
export function createConversationEntryNormalizer() {
  const states = new Map();

  return (entry, options = {}) => {
    const projected = normalizeConversationEntry(entry);
    const rawInput = entry?.body?.input;
    if (!projected?._codexConversationProjection || !isCodexResponsesInput(rawInput)
        || !Array.isArray(projected.body?.input)) {
      return projected;
    }

    // Only MainAgent entries may advance the cumulative projection baseline.
    // SubAgent/Teammate requests can share the same user + URL fallback key when
    // their thread metadata is absent. Letting them commit here overwrites the
    // MainAgent prefix even though they never enter mainAgentSessions; the next
    // MainAgent partial -> final revision then loses its in-place signal and the
    // session merger can append the whole transcript. AppBase also passes an
    // explicit commit=false for entries rejected by its stronger classifier;
    // the field guard below is only a fallback for direct callers with persisted
    // role markers, not a replacement for that classifier.
    const ownsMainAgentBaselineByFields = entry?.mainAgent !== false
      && entry?.subAgent !== true
      && !entry?.teammate;
    // Stale/broken/in-progress batch entries are visible as raw requests but do
    // not enter the conversation merge. They must not advance the prefix base,
    // otherwise the next valid checkpoint would emit only a tail against data
    // the renderer never received.
    // A caller such as AppBase has the stronger isMainAgent classifier and its
    // explicit decision is authoritative. The field-only fallback exists for
    // direct callers that omit the option; it must not veto legacy MainAgent
    // rows whose persisted boolean is weaker than their upstream identity.
    const shouldCommit = Object.hasOwn(options, 'commit')
      ? options.commit === true
      : ownsMainAgentBaselineByFields;
    if (!shouldCommit) return projected;

    const key = conversationProjectionKey(entry);
    const rawIds = rawInput.map(rawItemIdentity);
    const hasNativeCompaction = rawInput.some(item => item?.type === 'compaction');
    const fullMessages = projected.body.input;
    const fullFingerprints = fullMessages.map(messageFingerprint);
    const previous = states.get(key);
    const cumulativePrefix = previous ? isPrefix(previous.rawIds, rawIds) : false;
    let windowStart = 0;

    if (previous && cumulativePrefix) {
      let common = 0;
      const max = Math.min(previous.messageFingerprints.length, fullFingerprints.length);
      while (common < max && previous.messageFingerprints[common] === fullFingerprints[common]) common++;

      if (common === previous.messageFingerprints.length && fullFingerprints.length >= common) {
        windowStart = Math.max(0, common - 1);
      } else if (fullFingerprints.length === previous.messageFingerprints.length
          && common === Math.max(0, fullFingerprints.length - 1)) {
        // Same turn, final assistant block evolved from streaming to complete.
        // Keep the full list so the existing in-place replace path can update it.
        projected._inPlaceReplaceDetected = true;
      }
    } else if (previous && getMainAgentSessionKey(entry)) {
      // A rewrite inside the same explicit Codex thread is a compact/rollback
      // epoch, not a brand-new terminal session. Modern Codex compaction does
      // not necessarily carry the legacy English summary preamble, so preserve
      // the protocol identity signal for boundary and timestamp logic.
      projected._compactContinuation = true;
    }

    if (hasNativeCompaction) {
      // The wire array can still be a cumulative prefix extension even though
      // `compaction` semantically replaces its projected conversation history.
      // Give both live and batch merge paths an explicit authoritative signal.
      projected._compactContinuation = true;
      projected._authoritativeConversationReplace = true;
      windowStart = 0;
    }

    states.set(key, { rawIds, messageFingerprints: fullFingerprints });
    projected._conversationMessageCount = fullMessages.length;
    projected._conversationWindowStart = windowStart;
    if (windowStart > 0) {
      projected._codexConversationDelta = true;
      projected.body = { ...projected.body, input: fullMessages.slice(windowStart) };
    }
    return projected;
  };
}
