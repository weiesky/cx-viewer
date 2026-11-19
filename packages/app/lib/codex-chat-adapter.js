import { createHash, randomUUID } from 'node:crypto';
import {
  buildThirdPartyHeaders,
  decodeProxyJsonBody,
} from './proxy-profile.js';

const MAX_ACCUMULATED_FIELD_BYTES = 8 * 1024 * 1024;
const MAX_CHAT_JSON_RESPONSE_BYTES = 8 * 1024 * 1024;
const TEXT_CONTENT_TYPES = new Set(['input_text', 'output_text', 'text']);
const TOOL_OUTPUT_PART_TYPES = new Set(['function_call_output', 'custom_tool_call_output', 'tool_call_output']);
const NON_PORTABLE_PART_MARKER = '[non-text part omitted]';
const CHAT_COMPACTION_PREFIX = 'cxv-chat-compaction-v1:';
const UNSUPPORTED_TOOL_TYPES = new Set([
  'computer',
  'file_search',
  'image_generation',
  'local_shell',
  'mcp',
  'web_search',
  'web_search_preview',
]);

function adapterError(message, code = 'unsupported_request') {
  const error = new TypeError(message);
  error.code = code;
  return error;
}

function portablePartText(part) {
  // Multi-agent orchestration carries the actual task text inside content
  // parts whose field is named encrypted_content (observed in live traffic).
  for (const key of ['text', 'input_text', 'output_text', 'refusal', 'encrypted_content']) {
    if (typeof part[key] === 'string') return part[key];
  }
  return null;
}

function textFromContent(content, field, { strict = true } = {}) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) throw adapterError(`${field} must contain text`);
  const chunks = [];
  for (const part of content) {
    if (typeof part === 'string') {
      chunks.push(part);
      continue;
    }
    if (!part || typeof part !== 'object') throw adapterError(`${field} must contain text`);
    if (TEXT_CONTENT_TYPES.has(part.type)) {
      chunks.push(String(part.text ?? ''));
      continue;
    }
    if (part.type === 'refusal') {
      chunks.push(String(part.refusal ?? ''));
      continue;
    }
    // Tool results can arrive inside content arrays (multi-agent orchestration).
    // Project their portable text instead of failing the whole request.
    if (TOOL_OUTPUT_PART_TYPES.has(part.type)) {
      const output = part.output ?? part.content ?? part.result ?? '';
      chunks.push(textFromContent(output, `${field}.output`, { strict: false }));
      continue;
    }
    if (part.type === 'function_call' || part.type === 'custom_tool_call') {
      chunks.push(JSON.stringify({
        name: part.name ?? '',
        ...(part.arguments !== undefined ? { arguments: part.arguments } : { input: part.input ?? '' }),
      }));
      continue;
    }
    // Real multi-agent traffic carries text-bearing parts without a portable
    // type marker (e.g. { text } or nested content). Project them instead of
    // dropping the message.
    const portable = portablePartText(part);
    if (portable !== null) {
      chunks.push(portable);
      continue;
    }
    if (typeof part.content === 'string' || Array.isArray(part.content)) {
      chunks.push(textFromContent(part.content, `${field}.content`, { strict }));
      continue;
    }
    // Non-portable parts (input_image, input_audio, file, encrypted, ...) fail
    // explicitly for real model input, but are degraded to a visible marker in
    // orchestration history and tool outputs so multi-agent traffic survives.
    if (strict) throw adapterError(`${field} contains an unsupported non-text part`);
    chunks.push(NON_PORTABLE_PART_MARKER);
  }
  return chunks.join('');
}

function reasoningText(item) {
  const parts = [];
  for (const key of ['summary', 'content']) {
    const value = item?.[key];
    if (!Array.isArray(value)) continue;
    for (const part of value) {
      if (typeof part === 'string') parts.push(part);
      else if (part && typeof part === 'object' && typeof part.text === 'string') parts.push(part.text);
    }
  }
  return parts.join('\n');
}

function normalizeCustomTool(tool) {
  const name = String(tool.name || '').trim();
  if (!name) throw adapterError('custom tool name is required');
  return {
    type: 'function',
    function: {
      name,
      description: String(tool.description || ''),
      parameters: {
        type: 'object',
        properties: { input: { type: 'string' } },
        required: ['input'],
        additionalProperties: false,
      },
    },
  };
}

function boundedToolName(name, namespace = '') {
  const original = namespace ? `${namespace}__${name}` : name;
  const safe = original.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!namespace && safe === original && safe.length <= 64) return safe;
  const suffix = createHash('sha256').update(original).digest('hex').slice(0, 10);
  return `${safe.slice(0, 53)}_${suffix}`;
}

function flattenTools(tools, parentNamespace = '') {
  const flattened = [];
  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') {
      flattened.push(tool);
      continue;
    }
    if (tool.type !== 'namespace') {
      flattened.push(parentNamespace && !tool.namespace ? { ...tool, namespace: parentNamespace } : tool);
      continue;
    }
    const name = String(tool.name || '').trim();
    if (!name) throw adapterError('tool namespace name is required');
    if (!Array.isArray(tool.tools)) throw adapterError(`tool namespace ${name} must contain tools`);
    const namespace = parentNamespace ? `${parentNamespace}.${name}` : name;
    flattened.push(...flattenTools(tool.tools, namespace));
  }
  return flattened;
}

function collectTools(body) {
  const tools = [...(Array.isArray(body.tools) ? body.tools : []), ...(Array.isArray(body.additional_tools) ? body.additional_tools : [])];
  for (const item of Array.isArray(body.input) ? body.input : []) {
    if (item?.type === 'additional_tools' || item?.type === 'tool_search_output') {
      if (Array.isArray(item.tools)) tools.push(...item.tools);
    }
  }
  return flattenTools(tools);
}

function normalizeTools(body) {
  const tools = collectTools(body);
  const customToolNames = new Set();
  const toolMetadata = new Map();
  const chatNameByIdentity = new Map();
  const chatTools = [];
  const register = (chatName, metadata, chatTool) => {
    const identity = `${metadata.type}\0${metadata.namespace || ''}\0${metadata.name}`;
    const existing = toolMetadata.get(chatName);
    if (existing) {
      const existingIdentity = `${existing.type}\0${existing.namespace || ''}\0${existing.name}`;
      if (existingIdentity !== identity) {
        throw adapterError(`Tool name collision after Chat normalization: ${chatName}`);
      }
      return;
    }
    toolMetadata.set(chatName, metadata);
    chatNameByIdentity.set(identity, chatName);
    chatTools.push(chatTool);
  };
  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') throw adapterError('tool must be an object');
    if (tool.type === 'function') {
      const source = tool.function && typeof tool.function === 'object' ? tool.function : tool;
      const name = String(source.name || '').trim();
      if (!name) throw adapterError('function tool name is required');
      const namespace = String(source.namespace || tool.namespace || '').trim();
      const chatName = boundedToolName(name, namespace);
      register(chatName, { type: 'function', name, ...(namespace ? { namespace } : {}) }, {
        type: 'function',
        function: {
          name: chatName,
          description: String(source.description || ''),
          parameters: source.parameters && typeof source.parameters === 'object'
            ? source.parameters
            : { type: 'object', properties: {} },
          ...(source.strict === true ? { strict: true } : {}),
        },
      });
      continue;
    }
    if (tool.type === 'custom') {
      const name = String(tool.name || '').trim();
      const namespace = String(tool.namespace || '').trim();
      const chatName = boundedToolName(name, namespace);
      customToolNames.add(chatName);
      register(chatName, { type: 'custom', name, ...(namespace ? { namespace } : {}) },
        normalizeCustomTool({ ...tool, name: chatName }));
      continue;
    }
    if (tool.type === 'tool_search') {
      const chatName = boundedToolName('tool_search');
      register(chatName, { type: 'tool_search', name: 'tool_search', execution: tool.execution || 'client' }, {
        type: 'function',
        function: {
          name: chatName,
          description: String(tool.description || 'Search for additional tools available to this Codex session'),
          parameters: tool.parameters || {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'integer', minimum: 1 },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
      });
      continue;
    }
    if (UNSUPPORTED_TOOL_TYPES.has(tool.type) || tool.type) {
      throw adapterError(`Unsupported Responses tool type: ${tool.type || 'unknown'}`);
    }
    throw adapterError('Unsupported Responses tool');
  }
  return { chatTools, customToolNames, toolMetadata, chatNameByIdentity };
}

function customArguments(input) {
  return JSON.stringify({ input: String(input ?? '') });
}

function encodeChatCompaction(text) {
  return `${CHAT_COMPACTION_PREFIX}${Buffer.from(text, 'utf8').toString('base64url')}`;
}

function decodeChatCompaction(value) {
  if (typeof value !== 'string' || !value.startsWith(CHAT_COMPACTION_PREFIX)) return null;
  const encoded = value.slice(CHAT_COMPACTION_PREFIX.length);
  if (!encoded || !/^[a-zA-Z0-9_-]+$/.test(encoded)) {
    throw adapterError('Invalid CX Viewer Chat compaction payload');
  }
  const decoded = Buffer.from(encoded, 'base64url');
  if (decoded.toString('base64url') !== encoded) {
    throw adapterError('Invalid CX Viewer Chat compaction payload');
  }
  return decoded.toString('utf8');
}

function chatCompactionItem(text) {
  return {
    id: `cmp_${randomUUID()}`,
    type: 'compaction',
    encrypted_content: encodeChatCompaction(text),
  };
}

function responsesInputToMessages(body, customToolNames, chatNameByIdentity) {
  const messages = [];
  if (body.instructions != null) {
    messages.push({ role: 'system', content: textFromContent(body.instructions, 'instructions') });
  }
  const instructionMessageCount = messages.length;
  if (typeof body.input === 'string') {
    messages.push({ role: 'user', content: body.input });
    return messages;
  }
  if (!Array.isArray(body.input)) throw adapterError('Responses input must be text or an item array');

  let assistant = null;
  let sawCompaction = false;
  const visibleCallIds = new Set();
  const ensureAssistant = () => {
    if (!assistant) assistant = { role: 'assistant', content: '', tool_calls: [] };
    return assistant;
  };
  const flushAssistant = () => {
    if (!assistant) return;
    if (assistant.tool_calls.length === 0) delete assistant.tool_calls;
    messages.push(assistant);
    assistant = null;
  };

  for (const item of body.input) {
    if (!item || typeof item !== 'object') throw adapterError('Responses input item must be an object');
    if (item.type === 'reasoning') {
      ensureAssistant().reasoning_content = `${ensureAssistant().reasoning_content || ''}${reasoningText(item)}`;
      continue;
    }
    // Codex compaction payloads replace preceding history. OpenAI-owned opaque
    // content cannot be projected to a third-party provider; compactions made
    // by this adapter carry a tagged summary that can be restored safely.
    if (item.type === 'compaction') {
      const compactedText = decodeChatCompaction(item.encrypted_content);
      messages.length = instructionMessageCount;
      assistant = null;
      visibleCallIds.clear();
      sawCompaction = true;
      if (compactedText) {
        messages.push({ role: 'user', content: `Compacted conversation state:\n${compactedText}` });
      }
      continue;
    }
    // v2 compaction transcripts carry an opaque context boundary with the
    // same semantics as compaction: it replaces the preceding history.
    if (item.type === 'context_compaction') {
      messages.length = instructionMessageCount;
      assistant = null;
      visibleCallIds.clear();
      sawCompaction = true;
      continue;
    }
    // Remote compaction v2 sends the transcript plus this control item through
    // POST /responses. The Chat prompt is already carried by instructions, so
    // the marker itself has no portable message content.
    if (item.type === 'compaction_trigger') continue;
    // Opaque catch-all items carry no portable text; they are safe to skip.
    if (item.type === 'other') continue;
    if (item.type === 'additional_tools') continue;
    if (item.type === 'agent_message' || item.type === 'agentMessage') {
      const content = typeof item.text === 'string'
        ? item.text
        : textFromContent(item.content, `${item.type}.content`, { strict: false });
      ensureAssistant().content += content;
      continue;
    }
    if (item.type === 'message') {
      const role = item.role || 'user';
      const content = textFromContent(item.content, `message(${role}).content`);
      if (role === 'assistant') {
        ensureAssistant().content += content;
      } else if (['system', 'developer', 'user'].includes(role)) {
        flushAssistant();
        messages.push({ role: role === 'developer' ? 'system' : role, content });
      } else {
        throw adapterError(`Unsupported Responses message role: ${role}`);
      }
      continue;
    }
    if (item.type === 'function_call' || item.type === 'custom_tool_call') {
      const name = String(item.name || '').trim();
      if (!name) throw adapterError(`${item.type} name is required`);
      const namespace = String(item.namespace || '').trim();
      const kind = item.type === 'custom_tool_call' ? 'custom' : 'function';
      const chatName = chatNameByIdentity.get(`${kind}\0${namespace}\0${name}`) || boundedToolName(name, namespace);
      if (item.type === 'custom_tool_call') customToolNames.add(chatName);
      const callId = String(item.call_id || item.id || `call_${randomUUID()}`);
      if (visibleCallIds.has(callId)) throw adapterError(`Duplicate Responses tool call id: ${callId}`);
      visibleCallIds.add(callId);
      ensureAssistant().tool_calls.push({
        id: callId,
        type: 'function',
        function: {
          name: chatName,
          arguments: item.type === 'custom_tool_call'
            ? customArguments(item.input)
            : String(item.arguments ?? ''),
        },
      });
      continue;
    }
    if (item.type === 'tool_search_call') {
      const callId = String(item.call_id || item.id || `call_${randomUUID()}`);
      if (visibleCallIds.has(callId)) throw adapterError(`Duplicate Responses tool call id: ${callId}`);
      visibleCallIds.add(callId);
      ensureAssistant().tool_calls.push({
        id: callId,
        type: 'function',
        function: {
          name: chatNameByIdentity.get('tool_search\0\0tool_search') || boundedToolName('tool_search'),
          arguments: JSON.stringify(item.arguments || {}),
        },
      });
      continue;
    }
    // Codex v2 tool items without a Chat-compatible type still mark an
    // assistant tool call in the transcript. Project the call id and the
    // user-visible action so later outputs remain matched and the summarizer
    // can see that the tool ran.
    if (item.type === 'web_search_call' || item.type === 'image_generation_call' || item.type === 'local_shell_call') {
      const callId = String(item.call_id || item.id || `call_${randomUUID()}`);
      if (visibleCallIds.has(callId)) throw adapterError(`Duplicate Responses tool call id: ${callId}`);
      visibleCallIds.add(callId);
      ensureAssistant().tool_calls.push({
        id: callId,
        type: 'function',
        function: {
          name: item.type === 'local_shell_call' ? 'local_shell' : item.type.replace(/_call$/, ''),
          arguments: JSON.stringify(portableToolAction(item)),
        },
      });
      continue;
    }
    if (item.type === 'function_call_output' || item.type === 'custom_tool_call_output') {
      const callId = String(item.call_id || '');
      if (!callId || !visibleCallIds.delete(callId)) {
        throw adapterError(`${item.type} has no matching tool call after the latest compaction`);
      }
      flushAssistant();
      messages.push({
        role: 'tool',
        tool_call_id: callId,
        content: textFromContent(item.output ?? item.content ?? '', `${item.type}.output`, { strict: false }),
      });
      continue;
    }
    if (item.type === 'tool_search_output') {
      const callId = String(item.call_id || '');
      if (!callId || !visibleCallIds.delete(callId)) {
        throw adapterError('tool_search_output has no matching tool call after the latest compaction');
      }
      flushAssistant();
      messages.push({
        role: 'tool',
        tool_call_id: callId,
        content: JSON.stringify({ status: item.status, tools: item.tools || [] }),
      });
      continue;
    }
    throw adapterError(`Unsupported Responses input item: ${item.type || 'unknown'}`);
  }
  flushAssistant();
  if (sawCompaction && messages.length === instructionMessageCount) {
    throw adapterError('Compaction left no portable conversation messages for the Chat provider');
  }
  return messages;
}

function portableToolAction(item) {
  const action = item.action && typeof item.action === 'object' ? item.action : {};
  if (item.type === 'web_search_call') {
    return { queries: Array.isArray(action.queries) ? action.queries : [] };
  }
  if (item.type === 'image_generation_call') {
    return { prompt: typeof action.prompt === 'string' ? action.prompt : '' };
  }
  return action;
}

function deepSeekEffort(value, model) {
  if (value === 'low') return 'low';
  if (value === 'max') return 'max';
  if (value === 'xhigh') return /(?:^|[-_])pro(?:[-_]|$)/i.test(String(model)) ? 'max' : 'high';
  // medium 与未知值统一按 DeepSeek 默认 high 处理；留空由调用方决定是否注入
  return 'high';
}

function chatToolChoice(choice, chatNameByIdentity) {
  if (choice == null || choice === 'auto') return undefined;
  if (choice === 'none' || choice === 'required') return choice;
  if (!choice || typeof choice !== 'object') throw adapterError('Unsupported Responses tool_choice');
  const type = choice.type === 'custom' ? 'custom' : 'function';
  const name = String(choice.name || choice.function?.name || '').trim();
  const namespace = String(choice.namespace || choice.function?.namespace || '').trim();
  if (!name) throw adapterError('Named tool_choice requires a tool name');
  const chatName = chatNameByIdentity.get(`${type}\0${namespace}\0${name}`)
    || boundedToolName(name, namespace);
  return { type: 'function', function: { name: chatName } };
}

function chatCompletionsUrl(baseURL) {
  const url = new URL(baseURL);
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.slice(-2).join('/') !== 'chat/completions') {
    if (segments.at(-1) !== 'v1' && url.hostname !== 'api.deepseek.com') segments.push('v1');
    segments.push('chat', 'completions');
  }
  url.pathname = `/${segments.join('/')}`;
  url.hash = '';
  return url.toString();
}

export function prepareChatCompletionsRequest(requestUrl, options, profile) {
  const body = decodeProxyJsonBody(options?.body, options?.headers);
  if (body.previous_response_id || body.conversation) {
    throw adapterError('Server-side Responses conversation state is not supported by Chat providers');
  }
  const { chatTools, customToolNames, toolMetadata, chatNameByIdentity } = normalizeTools(body);
  const compactionRequest = Array.isArray(body.input)
    && body.input.some(item => item?.type === 'compaction_trigger');
  const messages = responsesInputToMessages(body, customToolNames, chatNameByIdentity);
  const requestedEffort = profile.effort || body.reasoning?.effort;
  const model = profile.activeModel || body.model;
  const toolChoice = chatToolChoice(body.tool_choice, chatNameByIdentity);
  const chatBody = {
    model,
    messages,
    stream: body.stream === true,
    // 仅当调用方显式请求 effort 时才注入 thinking/effort：UI 约定“provider
    // 不支持时留空”，留空注入会对非 DeepSeek 的 Chat 端点造成意外 400/计费。
    ...(requestedEffort ? {
      thinking: { type: 'enabled' },
      reasoning_effort: deepSeekEffort(requestedEffort, model),
    } : {}),
    ...(chatTools.length ? { tools: chatTools } : {}),
    ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
    ...(body.parallel_tool_calls === false ? { parallel_tool_calls: false } : {}),
  };
  if (body.max_output_tokens != null) chatBody.max_tokens = body.max_output_tokens;
  if (body.stream === true) chatBody.stream_options = { include_usage: true };
  return {
    url: chatCompletionsUrl(profile.baseURL),
    options: {
      ...options,
      headers: buildThirdPartyHeaders(options?.headers, profile.apiKey, { jsonBody: true }),
      body: JSON.stringify(chatBody),
      redirect: 'manual',
    },
    responsesBody: {
      ...body,
      model: chatBody.model,
      reasoning: { ...(body.reasoning || {}), effort: requestedEffort || 'high' },
    },
    context: {
      customToolNames,
      toolMetadata,
      model: chatBody.model,
      stream: chatBody.stream,
      requestUrl: String(requestUrl),
      compactionRequest,
    },
  };
}

function usageToResponses(usage) {
  if (!usage || typeof usage !== 'object') return null;
  return {
    input_tokens: Number(usage.prompt_tokens || 0),
    input_tokens_details: { cached_tokens: Number(usage.prompt_cache_hit_tokens || 0) },
    output_tokens: Number(usage.completion_tokens || 0),
    output_tokens_details: {
      reasoning_tokens: Number(usage.completion_tokens_details?.reasoning_tokens || 0),
    },
    total_tokens: Number(usage.total_tokens || 0),
  };
}

function parseCustomInput(argumentsText) {
  try {
    const parsed = JSON.parse(argumentsText || '{}');
    if (parsed && typeof parsed.input === 'string') return parsed.input;
  } catch { }
  throw adapterError('Chat provider returned invalid custom tool arguments', 'adapter_response_error');
}

function responseToolMetadata(chatName, context) {
  if (!chatName) {
    throw adapterError('Chat provider returned a tool call without a name', 'adapter_response_error');
  }
  const metadata = context.toolMetadata.get(chatName);
  // Codex can defer tool definitions behind tool_search. Chat models sometimes
  // call a known Codex tool directly instead of calling tool_search first. CC
  // Switch preserves such non-empty names as ordinary function_call items and
  // lets Codex's own tool registry decide whether they are executable.
  return metadata || { type: 'function', name: chatName };
}

function chatToolCallToResponseItem(call, context) {
  const chatName = String(call?.function?.name || '');
  const metadata = responseToolMetadata(chatName, context);
  const callId = String(call?.id || `call_${randomUUID()}`);
  const args = String(call?.function?.arguments || '');
  if (metadata.type === 'tool_search') {
    let argumentsValue;
    try { argumentsValue = JSON.parse(args || '{}'); }
    catch { throw adapterError('Chat provider returned invalid tool_search arguments', 'adapter_response_error'); }
    return {
      id: `tsc_${randomUUID()}`,
      type: 'tool_search_call',
      call_id: callId,
      status: 'completed',
      execution: metadata.execution || 'client',
      arguments: argumentsValue,
    };
  }
  if (metadata.type === 'custom') {
    return {
      id: `ctc_${randomUUID()}`,
      type: 'custom_tool_call',
      call_id: callId,
      name: metadata.name,
      ...(metadata.namespace ? { namespace: metadata.namespace } : {}),
      input: parseCustomInput(args),
    };
  }
  return {
    id: `fc_${randomUUID()}`,
    type: 'function_call',
    call_id: callId,
    name: metadata.name,
    ...(metadata.namespace ? { namespace: metadata.namespace } : {}),
    arguments: args,
  };
}

function completedResponse({ id, model, output, usage, status = 'completed', incompleteReason = null }) {
  return {
    id,
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status,
    model,
    output,
    usage: usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    ...(incompleteReason ? { incomplete_details: { reason: incompleteReason } } : {}),
  };
}

export async function adaptChatJsonResponse(response, context) {
  if (!response.ok) return response;
  if (!response.body) throw adapterError('Chat provider returned an empty response', 'adapter_response_error');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_CHAT_JSON_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw adapterError('Chat JSON response exceeds adapter limit', 'adapter_response_error');
    }
    chunks.push(Buffer.from(value));
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks, total).toString('utf8'));
  } catch {
    throw adapterError('Chat provider returned invalid JSON', 'adapter_response_error');
  }
  const choice = payload?.choices?.[0];
  if (!choice || payload.choices.length !== 1) throw adapterError('Chat provider must return exactly one choice', 'adapter_response_error');
  const message = choice.message || {};
  const finish = choice.finish_reason;
  if (context.compactionRequest) {
    const text = message.content == null ? '' : String(message.content);
    if (finish !== 'stop' || !text || message.tool_calls?.length) {
      throw adapterError('Chat provider returned an invalid compaction response', 'adapter_response_error');
    }
    const body = completedResponse({
      id: String(payload.id || `resp_${randomUUID()}`),
      model: String(payload.model || context.model),
      output: [chatCompactionItem(text)],
      usage: usageToResponses(payload.usage),
    });
    return new Response(JSON.stringify(body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  }
  const output = [];
  if (message.reasoning_content) {
    output.push({
      id: `rs_${randomUUID()}`,
      type: 'reasoning',
      summary: [{ type: 'summary_text', text: String(message.reasoning_content) }],
    });
  }
  if (message.content != null && String(message.content) !== '') {
    output.push({
      id: `msg_${randomUUID()}`,
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: String(message.content), annotations: [] }],
    });
  }
  for (const call of message.tool_calls || []) output.push(chatToolCallToResponseItem(call, context));
  const status = finish === 'length' ? 'incomplete' : ['stop', 'tool_calls'].includes(finish) ? 'completed' : 'failed';
  const body = completedResponse({
    id: String(payload.id || `resp_${randomUUID()}`),
    model: String(payload.model || context.model),
    output,
    usage: usageToResponses(payload.usage),
    status,
    incompleteReason: finish === 'length' ? 'max_output_tokens' : null,
  });
  return new Response(JSON.stringify(body), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}

function encodeEvent(type, payload) {
  return new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify({ type, ...payload })}\n\n`);
}

function streamFailed(responseId, message) {
  const response = completedResponse({
    id: responseId,
    model: '',
    output: [],
    usage: null,
    status: 'failed',
  });
  response.error = { code: 'adapter_response_error', message };
  return encodeEvent('response.failed', {
    response,
  });
}

function createChatSseAdapter(source, context) {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  const responseId = `resp_${randomUUID()}`;
  const output = [];
  const queue = [];
  const toolStates = new Map();
  let buffer = '';
  let created = false;
  let done = false;
  let finishReason = null;
  let usage = null;
  let reasoningItem = null;
  let messageItem = null;
  let compactionText = '';
  let failed = false;

  const push = (type, payload) => queue.push(encodeEvent(type, payload));
  const ensureCreated = (model = context.model) => {
    if (created) return;
    created = true;
    push('response.created', {
      response: completedResponse({ id: responseId, model, output: [], usage: null, status: 'in_progress' }),
    });
  };
  const ensureReasoning = () => {
    if (reasoningItem) return reasoningItem;
    reasoningItem = {
      id: `rs_${randomUUID()}`,
      type: 'reasoning',
      summary: [{ type: 'summary_text', text: '' }],
    };
    output.push(reasoningItem);
    push('response.output_item.added', { output_index: output.length - 1, item: { ...reasoningItem, summary: [] } });
    return reasoningItem;
  };
  const ensureMessage = () => {
    if (messageItem) return messageItem;
    messageItem = {
      id: `msg_${randomUUID()}`,
      type: 'message',
      role: 'assistant',
      status: 'in_progress',
      content: [{ type: 'output_text', text: '', annotations: [] }],
    };
    output.push(messageItem);
    push('response.output_item.added', { output_index: output.length - 1, item: { ...messageItem, content: [] } });
    return messageItem;
  };
  const appendBounded = (current, addition, field) => {
    const next = current + addition;
    if (Buffer.byteLength(next) > MAX_ACCUMULATED_FIELD_BYTES) throw adapterError(`${field} exceeds adapter limit`, 'adapter_response_error');
    return next;
  };
  const processPayload = (payload) => {
    if (payload === '[DONE]') {
      done = true;
      return;
    }
   const chunk = JSON.parse(payload);
   ensureCreated(chunk.model || context.model);
    if (chunk.error) {
      const detail = typeof chunk.error === 'string'
        ? chunk.error
        : (chunk.error?.message || chunk.error?.code || JSON.stringify(chunk.error));
      throw adapterError(`Chat provider error: ${detail}`, 'adapter_response_error');
    }
    if (chunk.usage) usage = usageToResponses(chunk.usage);
    const choices = chunk.choices || [];
    if (choices.length > 1 || (choices[0] && Number(choices[0].index || 0) !== 0)) {
      throw adapterError('Chat streaming adapter supports only choice index 0', 'adapter_response_error');
    }
    const choice = choices[0];
    if (!choice) return;
    const delta = choice.delta || {};
    if (delta.reasoning_content && !context.compactionRequest) {
      const item = ensureReasoning();
      item.summary[0].text = appendBounded(item.summary[0].text, String(delta.reasoning_content), 'reasoning');
      push('response.reasoning_summary_text.delta', {
        item_id: item.id,
        output_index: output.indexOf(item),
        summary_index: 0,
        delta: String(delta.reasoning_content),
      });
    }
    if (delta.content) {
      if (context.compactionRequest) {
        compactionText = appendBounded(compactionText, String(delta.content), 'compaction text');
      } else {
        const item = ensureMessage();
        item.content[0].text = appendBounded(item.content[0].text, String(delta.content), 'output text');
        push('response.output_text.delta', {
          item_id: item.id,
          output_index: output.indexOf(item),
          content_index: 0,
          delta: String(delta.content),
        });
      }
    }
    for (const call of delta.tool_calls || []) {
      const index = Number(call.index || 0);
      let state = toolStates.get(index);
      if (!state) {
        state = {
          id: String(call.id || `call_${randomUUID()}`),
          name: '',
          arguments: '',
          item: null,
          outputIndex: -1,
        };
        toolStates.set(index, state);
      }
      if (call.id) state.id = String(call.id);
      if (call.function?.name) state.name = appendBounded(state.name, String(call.function.name), 'tool name');
      if (call.function?.arguments) {
        const addition = String(call.function.arguments);
        state.arguments = appendBounded(state.arguments, addition, 'tool arguments');
      }
    }
    if (choice.finish_reason != null) finishReason = choice.finish_reason;
  };
  const parseBufferedEvents = (flush = false) => {
    buffer = buffer.replace(/\r\n/g, '\n');
    while (true) {
      const boundary = buffer.indexOf('\n\n');
      if (boundary < 0) break;
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = block.split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).replace(/^ /, ''))
        .join('\n');
      if (data) processPayload(data);
    }
    if (flush && buffer.trim()) {
      const data = buffer.split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).replace(/^ /, ''))
        .join('\n');
      buffer = '';
      if (data) processPayload(data);
    }
  };
  const finalize = () => {
    ensureCreated(context.model);
    if (context.compactionRequest) {
      if (finishReason !== 'stop' || !compactionText || toolStates.size) {
        throw adapterError('Chat provider returned an invalid compaction response', 'adapter_response_error');
      }
      const item = chatCompactionItem(compactionText);
      output.push(item);
      push('response.output_item.added', { output_index: 0, item });
      push('response.output_item.done', { output_index: 0, item });
      push('response.completed', {
        response: completedResponse({
          id: responseId,
          model: context.model,
          output,
          usage,
        }),
      });
      return;
    }
    if (reasoningItem) {
      push('response.reasoning_summary_text.done', {
        item_id: reasoningItem.id,
        output_index: output.indexOf(reasoningItem),
        summary_index: 0,
        text: reasoningItem.summary[0].text,
      });
      push('response.output_item.done', { output_index: output.indexOf(reasoningItem), item: reasoningItem });
    }
    if (messageItem) {
      messageItem.status = 'completed';
      push('response.output_text.done', {
        item_id: messageItem.id,
        output_index: output.indexOf(messageItem),
        content_index: 0,
        text: messageItem.content[0].text,
      });
      push('response.output_item.done', { output_index: output.indexOf(messageItem), item: messageItem });
    }
    for (const [index, state] of [...toolStates.entries()].sort((a, b) => a[0] - b[0])) {
      if (!state.item && state.name) {
        const metadata = responseToolMetadata(state.name, context);
        if (metadata.type === 'tool_search') {
          let argumentsValue;
          try { argumentsValue = JSON.parse(state.arguments || '{}'); }
          catch { throw adapterError('Chat provider returned invalid tool_search arguments', 'adapter_response_error'); }
          state.item = {
            id: `tsc_${randomUUID()}`,
            type: 'tool_search_call',
            call_id: state.id,
            status: 'completed',
            execution: metadata.execution || 'client',
            arguments: argumentsValue,
          };
        } else if (metadata.type === 'custom') {
          state.item = {
            id: `ctc_${randomUUID()}`,
            type: 'custom_tool_call',
            call_id: state.id,
            name: metadata.name,
            ...(metadata.namespace ? { namespace: metadata.namespace } : {}),
            input: parseCustomInput(state.arguments),
          };
        } else {
          state.item = {
            id: `fc_${randomUUID()}`,
            type: 'function_call',
            call_id: state.id,
            name: metadata.name,
            ...(metadata.namespace ? { namespace: metadata.namespace } : {}),
            arguments: state.arguments,
          };
        }
        output.push(state.item);
        state.outputIndex = output.length - 1;
        push('response.output_item.added', { output_index: state.outputIndex, item: { ...state.item } });
      }
      if (!state.item) throw adapterError(`Chat tool call ${index} has no name`, 'adapter_response_error');
      const item = state.item;
      output[state.outputIndex] = item;
      if (item.type !== 'tool_search_call') {
        push(item.type === 'custom_tool_call' ? 'response.custom_tool_call_input.delta' : 'response.function_call_arguments.delta', {
          item_id: item.id,
          call_id: item.call_id,
          output_index: state.outputIndex,
          delta: item.type === 'custom_tool_call' ? item.input : item.arguments,
        });
        push(item.type === 'custom_tool_call' ? 'response.custom_tool_call_input.done' : 'response.function_call_arguments.done', {
          item_id: item.id,
          call_id: item.call_id,
          output_index: state.outputIndex,
          ...(item.type === 'custom_tool_call' ? { input: item.input } : { arguments: item.arguments }),
        });
      }
      push('response.output_item.done', { output_index: state.outputIndex, item });
    }
    const status = finishReason === 'length'
      ? 'incomplete'
      : ['stop', 'tool_calls'].includes(finishReason)
        ? 'completed'
        : 'failed';
    const response = completedResponse({
      id: responseId,
      model: context.model,
      output,
      usage,
      status,
      incompleteReason: finishReason === 'length' ? 'max_output_tokens' : null,
    });
    if (status === 'failed') {
      response.error = {
        code: 'adapter_response_error',
        message: `Unsupported or missing Chat finish reason: ${finishReason ?? 'none'}`,
      };
    }
    push(`response.${status}`, { response });
  };

  return new ReadableStream({
    async pull(controller) {
      try {
        while (queue.length === 0 && !failed) {
          if (done) {
            finalize();
            failed = true;
            break;
          }
          const next = await reader.read();
          if (next.done) {
            buffer += decoder.decode();
            parseBufferedEvents(true);
            if (!done) throw adapterError('Chat stream ended before [DONE]', 'adapter_response_error');
            continue;
          }
          buffer += decoder.decode(next.value, { stream: true });
          if (Buffer.byteLength(buffer) > MAX_ACCUMULATED_FIELD_BYTES) {
            throw adapterError('Chat SSE frame exceeds adapter limit', 'adapter_response_error');
          }
          parseBufferedEvents();
        }
        if (queue.length) controller.enqueue(queue.shift());
        else controller.close();
      } catch (error) {
        failed = true;
        try { await reader.cancel(error); } catch { }
        controller.enqueue(streamFailed(responseId, error.message || 'Malformed Chat stream'));
        controller.close();
      }
    },
    async cancel(reason) {
      failed = true;
      await reader.cancel(reason).catch(() => {});
    },
  });
}

async function readChatErrorResponse(response) {
  const fallback = `Chat provider returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
  try {
    if (!response.body) return fallback;
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_CHAT_JSON_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        break;
      }
      chunks.push(Buffer.from(value));
    }
    const text = Buffer.concat(chunks, total).toString('utf8').trim();
    if (!text) return fallback;
    try {
      const payload = JSON.parse(text);
      const detail = typeof payload?.error === 'string'
        ? payload.error
        : (payload?.error?.message || payload?.error?.code || payload?.message || '');
      return detail ? String(detail) : text.slice(0, 500);
    } catch {
      return text.slice(0, 500);
    }
  } catch {
    return fallback;
  }
}

function chatErrorResponse(message, context) {
  if (context.stream) {
    return new Response(streamFailed(`resp_${randomUUID()}`, message), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
      },
    });
  }
  const response = completedResponse({
    id: `resp_${randomUUID()}`,
    model: context.model || '',
    output: [],
    usage: null,
    status: 'failed',
  });
  response.error = { code: 'adapter_response_error', message };
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function adaptChatCompletionsResponse(response, context) {
  if (!response.ok) return chatErrorResponse(await readChatErrorResponse(response), context);
  if (!context.stream) return adaptChatJsonResponse(response, context);
  if (!response.body) throw adapterError('Chat streaming response has no body', 'adapter_response_error');
  return new Response(createChatSseAdapter(response.body, context), {
    status: response.status,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}
