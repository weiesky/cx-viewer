import * as zlib from 'node:zlib';
import {
  getInputItemText,
  getInstructionsText,
  getResponseConversationItems,
  getResponseTools,
  getResponseInputItems,
  hasResponseInputArray,
  textFromContent,
} from './openai-body.js';
import { isOpenAiResponsesMasterUrl } from './openai-responses-url.js';

export { getInstructionsText } from './openai-body.js';

const SUBAGENT_INSTRUCTIONS_RE = /(?:command execution|file search|planning) specialist|general-purpose agent|subagent|sub-agent/i;
const CODEX_TOOL_NAMES = new Set([
  'apply_patch',
  'local_shell',
  'shell',
  'shell_command',
  'view_image',
  'update_plan',
  'request_user_input',
  'tool_search',
  'web_search',
  'spawn_agent',
  'send_input',
  'resume_agent',
  'wait_agent',
  'close_agent',
]);

function safeJsonParse(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getHeader(headers, name) {
  if (!headers) return '';
  const target = name.toLowerCase();
  if (typeof headers.get === 'function') return headers.get(name) || headers.get(target) || '';
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return Array.isArray(value) ? value.join(', ') : String(value);
  }
  return '';
}

function bodyToBuffer(body) {
  if (body == null) return null;
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  return null;
}

function decodeCompressedRequestBody(buffer, encoding) {
  const enc = String(encoding || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  let out = buffer;
  for (let i = enc.length - 1; i >= 0; i--) {
    const e = enc[i];
    if (e === 'identity') continue;
    if (e === 'gzip' || e === 'x-gzip') {
      out = zlib.gunzipSync(out);
    } else if (e === 'br') {
      out = zlib.brotliDecompressSync(out);
    } else if (e === 'deflate') {
      try {
        out = zlib.inflateSync(out);
      } catch {
        out = zlib.inflateRawSync(out);
      }
    } else if (e === 'zstd') {
      if (typeof zlib.zstdDecompressSync !== 'function') {
        throw new Error('zstd decompression is not supported by this Node.js runtime');
      }
      out = zlib.zstdDecompressSync(out);
    } else {
      throw new Error(`unsupported content-encoding: ${e}`);
    }
  }
  return out;
}

export function parseRequestBodyForLog(rawBody, headers = {}) {
  if (rawBody == null) return null;

  const contentEncoding = getHeader(headers, 'content-encoding');
  const buffer = bodyToBuffer(rawBody);
  try {
    let text;
    if (buffer) {
      const decoded = contentEncoding
        ? decodeCompressedRequestBody(buffer, contentEncoding)
        : buffer;
      text = decoded.toString('utf8');
    } else {
      text = typeof rawBody === 'string' ? rawBody : String(rawBody);
    }
    return JSON.parse(text);
  } catch {
    if (buffer) {
      const encoded = contentEncoding ? `${contentEncoding} ` : '';
      return `[${encoded}binary request body: ${buffer.length} bytes]`;
    }
    return String(rawBody).slice(0, 500);
  }
}

function getToolName(tool) {
  if (!tool || typeof tool !== 'object') return '';
  return tool.name || tool.tool || tool.type || tool.function?.name || '';
}

function hasCodexTool(body) {
  return getResponseTools(body).some(tool => CODEX_TOOL_NAMES.has(getToolName(tool)));
}

function hasCodexInput(body) {
  const input = getResponseConversationItems(body);
  return input.some(item => {
    if (!item || typeof item !== 'object') return false;
    const type = item.type || '';
    if (type === 'local_shell_call' || type === 'function_call' || type === 'custom_tool_call') return true;
    const text = getInputItemText(item);
    return /Codex|AGENTS\.md|sandbox|approval|workspace/i.test(text);
  });
}

export function isCodexResponsesRequest(body) {
  if (!body || typeof body !== 'object') return false;
  if (!hasResponseInputArray(body)) return false;
  if (!body.model || body.stream !== true) return false;
  const instructionsText = getInstructionsText(body);
  return /Codex/i.test(instructionsText) || hasCodexTool(body) || hasCodexInput(body);
}

export function isSubAgentRequest(body) {
  if (!body || typeof body !== 'object') return false;
  const metadata = body.client_metadata || body.metadata || {};
  const turnMetadata = safeJsonParse(metadata['x-codex-turn-metadata']);
  const threadSource = turnMetadata && typeof turnMetadata === 'object'
    ? turnMetadata.thread_source
    : null;
  // Current Codex sends authoritative thread identity on every Responses call.
  // Root instructions legitimately discuss "subagents", so instruction text
  // must not override an explicit user-thread classification.
  if (threadSource === 'user') return false;
  if (threadSource === 'subagent') return true;
  const instructionsText = getInstructionsText(body);
  if (SUBAGENT_INSTRUCTIONS_RE.test(instructionsText)) return true;
  const metadataText = Object.entries(metadata).map(([k, v]) => `${k}:${v}`).join('\n');
  return /parent_thread_id|subagent|sub_agent|thread_spawn|guardian|compact|review/i.test(metadataText);
}

export function isMainAgentRequest(body) {
  if (isCodexResponsesRequest(body)) {
    return !isSubAgentRequest(body);
  }
  return false;
}

export function isChatGptCodexResponsesUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname === 'chatgpt.com'
      && /^\/backend-api\/codex\/responses(?:\/|$)/.test(url.pathname);
  } catch {
    return typeof urlStr === 'string'
      && urlStr.includes('chatgpt.com/backend-api/codex/responses');
  }
}

export function isResponsesEndpointUrl(urlStr) {
  try {
    const pathname = new URL(urlStr).pathname;
    return /^\/backend-api\/codex\/responses(?:\/|$)/.test(pathname)
      || /^\/v1\/responses(?:\/|$)/.test(pathname);
  } catch {
    return typeof urlStr === 'string' && /\/(?:backend-api\/codex\/responses|v1\/responses)(?:\/|$)/.test(urlStr);
  }
}

function inferResponsesSubAgentName(urlStr, body = {}) {
  const metadata = body?.client_metadata || body?.metadata || {};
  const explicit = metadata.subAgentName || metadata.subagent_name || metadata.subagent
    || metadata.sub_agent || metadata.thread_spawn || metadata.threadSpawn;
  if (explicit) return String(explicit);

  const instructionsText = getInstructionsText(body);
  if (/Extract any file paths/i.test(instructionsText)) return 'Shell';
  if (/process shell commands/i.test(instructionsText)) return 'Shell';
  if (/command execution specialist/i.test(instructionsText)) return 'Shell';
  if (/file search specialist/i.test(instructionsText)) return 'Search';
  if (/planning specialist/i.test(instructionsText)) return 'Plan';
  if (/general-purpose agent/i.test(instructionsText)) return 'General';
  if (/security monitor/i.test(instructionsText)) return 'Advisor';
  if (/performing a web search/i.test(instructionsText)) return 'web_search';

  try {
    const host = new URL(urlStr).hostname;
    if (host === 'api.openai.com') return 'OpenAI Responses';
    return host ? `Responses ${host}` : 'Responses';
  } catch {
    return 'Responses';
  }
}

export function classifyAgentRequest(urlStr, body) {
  if (isOpenAiResponsesMasterUrl(urlStr)) {
    return {
      mainAgent: false,
      subAgent: false,
      subAgentName: null,
    };
  }

  if (isChatGptCodexResponsesUrl(urlStr)) {
    const subAgent = isSubAgentRequest(body);
    return {
      mainAgent: !subAgent,
      subAgent,
      subAgentName: subAgent ? inferResponsesSubAgentName(urlStr, body) : null,
    };
  }

  const codexLike = isCodexResponsesRequest(body) || isSubAgentRequest(body);
  if (codexLike && isResponsesEndpointUrl(urlStr)) {
    const subAgent = isSubAgentRequest(body);
    return {
      mainAgent: isMainAgentRequest(body),
      subAgent,
      subAgentName: subAgent ? inferResponsesSubAgentName(urlStr, body) : null,
    };
  }

  const subAgent = isSubAgentRequest(body);
  return {
    mainAgent: isMainAgentRequest(body),
    subAgent,
    subAgentName: subAgent ? inferResponsesSubAgentName(urlStr, body) : null,
  };
}

export function isPreflightEntry(entry) {
  if (entry.mainAgent || entry.isHeartbeat || entry.isCountTokens) return false;
  const body = entry.body || {};
  if (getResponseTools(body).length > 0) return false;
  const input = getResponseConversationItems(body);
  if (input.length !== 1 || input[0].role !== 'user') return false;
  return getInstructionsText(body).includes('Codex');
}

export function isOpenAiApiPath(urlStr) {
  try {
    const pathname = new URL(urlStr).pathname;
    return /^\/v1\/responses(\/.*)?$/.test(pathname)
      || /^\/v1\/chat\/completions$/.test(pathname)
      || /^\/v1\/completions$/.test(pathname)
      || /^\/v1\/embeddings$/.test(pathname)
      || /^\/v1\/batches(\/.*)?$/.test(pathname);
  } catch {
    return /\/v1\/responses/.test(urlStr) || /\/v1\/chat\/completions/.test(urlStr);
  }
}

function normalizeResponseItem(item, fallbackText = '') {
  if (!item || typeof item !== 'object') return null;
  const type = item.type;

  if (type === 'message' || type === 'agent_message') {
    const text = item.text || textFromContent(item.content) || fallbackText;
    return text ? {
      type: 'text',
      text,
      ...(item.phase ? { phase: item.phase } : {}),
      ...(item.id ? { _codexItemId: item.id } : {}),
    } : null;
  }

  if (type === 'reasoning') {
    const summary = Array.isArray(item.summary) ? item.summary.map(s => typeof s === 'string' ? s : s?.text || '').join('\n\n') : '';
    const content = Array.isArray(item.content) ? item.content.map(c => c?.text || '').join('\n\n') : '';
    const thinking = summary || content || fallbackText;
    return thinking ? { type: 'thinking', thinking, summary: item.summary } : null;
  }

  if (type === 'function_call' || type === 'custom_tool_call' || type === 'local_shell_call' || type === 'tool_search_call' || type === 'web_search_call') {
    const rawInput = item.arguments ?? item.input ?? item.action ?? {};
    const name = item.name || item.tool || item.type || 'tool';
    return {
      type: 'tool_use',
      id: item.call_id || item.id || name,
      name,
      input: safeJsonParse(rawInput),
    };
  }

  return null;
}

function responseItemKey(item, fallback) {
  return item?.id || item?.call_id || item?.callId || fallback;
}

function dedupeResponseItems(items) {
  const ordered = [];
  const indexByKey = new Map();
  for (let i = 0; i < (items || []).length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') continue;
    const key = responseItemKey(item, null);
    if (!key) {
      ordered.push(item);
      continue;
    }
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, ordered.length);
      ordered.push(item);
    } else {
      // The terminal copy is authoritative. Responses streams commonly emit the
      // same item first in output_item.added and later in output_item.done.
      ordered[existingIndex] = item;
    }
  }
  return ordered;
}

function normalizeOpenAiUsage(usage) {
  if (!usage || typeof usage !== 'object') return usage || null;
  const rawInput = usage.input_tokens ?? usage.inputTokens ?? 0;
  const output = usage.output_tokens ?? usage.outputTokens ?? 0;
  const rawInputDetails = usage.input_tokens_details ?? usage.inputTokensDetails;
  const inputDetails = rawInputDetails && typeof rawInputDetails === 'object'
    ? {
        ...rawInputDetails,
        cached_tokens: rawInputDetails.cached_tokens ?? rawInputDetails.cachedTokens ?? 0,
        cache_write_tokens: rawInputDetails.cache_write_tokens ?? rawInputDetails.cacheWriteTokens ?? 0,
      }
    : null;
  const reasoning = usage.reasoning_output_tokens
    ?? usage.reasoningOutputTokens
    ?? usage.output_tokens_details?.reasoning_tokens
    ?? 0;
  const total = usage.total_tokens ?? usage.totalTokens ?? (rawInput + output);
  return {
    input_tokens: rawInput,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: total,
    ...(inputDetails ? { input_tokens_details: inputDetails } : {}),
  };
}

function mergeContentBlock(content, block) {
  if (!block) return;
  const prev = content[content.length - 1];
  if (prev && prev.type === block.type && block.type === 'text') {
    prev.text += block.text || '';
    return;
  }
  if (prev && prev.type === block.type && block.type === 'thinking') {
    prev.thinking += block.thinking || '';
    return;
  }
  content.push(block);
}

export function assembleOpenAiResponseMessage(events) {
  const items = new Map();
  const itemOrder = [];
  let response = null;
  let anonymousIndex = 0;

  const ensureItem = (key, seed, outputIndex) => {
    const stableKey = key || `anonymous:${anonymousIndex++}`;
    let record = items.get(stableKey);
    if (!record) {
      record = {
        key: stableKey,
        item: seed ? { ...seed } : {},
        outputIndex: Number.isInteger(outputIndex) ? outputIndex : null,
        insertionIndex: itemOrder.length,
        messageText: '',
        reasoningText: '',
      };
      items.set(stableKey, record);
      itemOrder.push(stableKey);
    } else if (seed) {
      record.item = { ...record.item, ...seed };
    }
    if (record.outputIndex == null && Number.isInteger(outputIndex)) record.outputIndex = outputIndex;
    return record;
  };

  const eventRecord = (event, kind) => {
    const key = event.item_id || event.itemId || event.call_id || event.callId || null;
    const synthetic = key || `${kind}:${event.output_index ?? event.outputIndex ?? anonymousIndex}`;
    return ensureItem(synthetic, {
      id: event.item_id || event.itemId || undefined,
      call_id: event.call_id || event.callId || undefined,
      type: kind,
    }, event.output_index ?? event.outputIndex);
  };

  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const type = event.type || event.event;

    if (type === 'response.created' && event.response) {
      response = { ...response, ...event.response };
      continue;
    }

    if ((type === 'response.output_item.added' || type === 'response.output_item.done') && event.item) {
      const key = event.item.id || event.item.call_id || `${event.item.type}:${items.size}`;
      ensureItem(key, event.item, event.output_index ?? event.outputIndex);
      continue;
    }

    if (type === 'response.content_part.added' && event.part) {
      if (event.part.type === 'output_text' || event.part.type === 'text') {
        const record = eventRecord(event, 'message');
        record.messageText += event.part.text || '';
      }
      continue;
    }

    if (type === 'response.output_text.delta') {
      const record = eventRecord(event, 'message');
      record.messageText += event.delta || '';
      continue;
    }

    if (type === 'response.output_text.done' || type === 'response.content_part.done') {
      const partType = event.part?.type;
      if (!partType || partType === 'output_text' || partType === 'text') {
        const record = eventRecord(event, 'message');
        record.messageText = event.text || event.part?.text || record.messageText;
      }
      continue;
    }

    if (type === 'response.reasoning_summary_text.delta' || type === 'response.reasoning_text.delta') {
      const record = eventRecord(event, 'reasoning');
      record.reasoningText += event.delta || '';
      continue;
    }

    if (type === 'response.reasoning_summary_text.done' || type === 'response.reasoning_text.done') {
      const record = eventRecord(event, 'reasoning');
      record.reasoningText = event.text || record.reasoningText;
      continue;
    }

    if (type === 'response.function_call_arguments.delta' || type === 'response.custom_tool_call_input.delta') {
      const key = event.item_id || event.call_id || `tool:${items.size}`;
      const record = ensureItem(key, {
        type: type.includes('custom_tool_call') ? 'custom_tool_call' : 'function_call',
        id: event.item_id || key,
        call_id: event.call_id || key,
        ...(event.name ? { name: event.name } : {}),
      }, event.output_index ?? event.outputIndex);
      const existing = record.item;
      const inputKey = existing.type === 'custom_tool_call' ? 'input' : 'arguments';
      existing[inputKey] = (existing[inputKey] || existing.arguments || existing.input || '') + (event.delta || '');
      continue;
    }

    if (type === 'response.function_call_arguments.done' || type === 'response.custom_tool_call_input.done') {
      const key = event.item_id || event.call_id || `tool:${items.size}`;
      const custom = type.includes('custom_tool_call');
      const record = ensureItem(key, {
        type: custom ? 'custom_tool_call' : 'function_call',
        id: event.item_id || key,
        call_id: event.call_id || key,
        ...(event.name ? { name: event.name } : {}),
      }, event.output_index ?? event.outputIndex);
      const existing = record.item;
      const inputKey = custom ? 'input' : 'arguments';
      existing[inputKey] = event.arguments || event.input || existing[inputKey] || '';
      continue;
    }

    if (type === 'response.completed' && event.response) {
      response = { ...response, ...event.response };
    }
  }

  const content = [];
  const finalOutput = Array.isArray(response?.output) && response.output.length > 0
    ? dedupeResponseItems(response.output)
    : null;

  if (finalOutput) {
    for (const item of finalOutput) mergeContentBlock(content, normalizeResponseItem(item));
  } else {
    const orderedRecords = itemOrder
      .map(key => items.get(key))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.outputIndex == null || b.outputIndex == null || a.outputIndex === b.outputIndex) {
          return a.insertionIndex - b.insertionIndex;
        }
        return a.outputIndex - b.outputIndex;
      });
    for (const record of orderedRecords) {
      const fallback = record.item.type === 'reasoning' ? record.reasoningText : record.messageText;
      mergeContentBlock(content, normalizeResponseItem(record.item, fallback));
    }
  }

  if (content.length === 0 && !response) return null;

  return {
    id: response?.id,
    type: 'message',
    role: 'assistant',
    model: response?.model,
    content,
    stop_reason: response?.status || response?.incomplete_details?.reason || null,
    usage: normalizeOpenAiUsage(response?.usage),
    raw_response: response || undefined,
  };
}


export function assembleStreamMessage(events) {
  let message = null;
  const contentBlocks = [];
  let currentBlockIndex = -1;

  for (const event of events) {
    if (!event || typeof event !== 'object' || !event.type) continue;

    switch (event.type) {
      case 'message_start':
        message = { ...event.message };
        message.content = [];
        break;

      case 'content_block_start':
        currentBlockIndex = event.index;
        contentBlocks[currentBlockIndex] = { ...event.content_block };
        if (contentBlocks[currentBlockIndex].type === 'text') {
          contentBlocks[currentBlockIndex].text = '';
        } else if (contentBlocks[currentBlockIndex].type === 'thinking') {
          contentBlocks[currentBlockIndex].thinking = '';
        }
        break;

      case 'content_block_delta':
        if (event.index >= 0 && contentBlocks[event.index] && event.delta) {
          if (event.delta.type === 'text_delta' && event.delta.text) {
            contentBlocks[event.index].text += event.delta.text;
          } else if (event.delta.type === 'input_json_delta' && event.delta.partial_json) {
            if (typeof contentBlocks[event.index]._inputJson !== 'string') {
              contentBlocks[event.index]._inputJson = '';
            }
            contentBlocks[event.index]._inputJson += event.delta.partial_json;
          } else if (event.delta.type === 'thinking_delta' && event.delta.thinking) {
            contentBlocks[event.index].thinking += event.delta.thinking;
          } else if (event.delta.type === 'signature_delta' && event.delta.signature) {
            contentBlocks[event.index].signature = event.delta.signature;
          }
        }
        break;

      case 'content_block_stop':
        if (event.index >= 0 && contentBlocks[event.index]) {
          if (contentBlocks[event.index].type === 'tool_use' && typeof contentBlocks[event.index]._inputJson === 'string') {
            try {
              contentBlocks[event.index].input = JSON.parse(contentBlocks[event.index]._inputJson);
            } catch {
              contentBlocks[event.index].input = contentBlocks[event.index]._inputJson;
            }
            delete contentBlocks[event.index]._inputJson;
          }
        }
        break;

      case 'message_delta':
        if (message && event.delta) {
          if (event.delta.stop_reason) {
            message.stop_reason = event.delta.stop_reason;
          }
          if (event.delta.stop_sequence !== undefined) {
            message.stop_sequence = event.delta.stop_sequence;
          }
        }
        if (message && event.usage) {
          message.usage = { ...message.usage, ...event.usage };
        }
        break;

      case 'message_stop':
        break;
    }
  }

  if (message) {
    message.content = contentBlocks.filter(block => block !== undefined);
  }

  return message;
}
