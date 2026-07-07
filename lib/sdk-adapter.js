/**
 * sdk-adapter.js - Convert Codex SDK thread events to cx-viewer JSONL shape.
 *
 * The TypeScript SDK streams Codex CLI JSON events. The viewer already renders
 * intercepted API logs as request/response entries, so this adapter keeps SDK
 * mode on the same data contract instead of adding a second frontend protocol.
 */

export const DEFAULT_CODEX_TOOLS = [
  { name: 'Bash' },
  { name: 'Read' },
  { name: 'Edit' },
  { name: 'Write' },
  { name: 'apply_patch' },
  { name: 'web_search' },
  { name: 'mcp_tool_call' },
];

function cloneJson(value) {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function stringifyValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value : '';
}

export function sdkUsageToViewerUsage(usage) {
  if (!usage) return null;
  const input = usage.input_tokens ?? usage.inputTokens ?? 0;
  const cached = usage.cached_input_tokens ?? usage.cachedInputTokens ?? 0;
  const output = usage.output_tokens ?? usage.outputTokens ?? 0;
  const reasoning = usage.reasoning_output_tokens ?? usage.reasoningOutputTokens ?? 0;
  const total = usage.total_tokens ?? usage.totalTokens ?? (input + output);
  return {
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: cached,
    reasoning_output_tokens: reasoning,
    total_tokens: total,
  };
}

export function buildStreamingStatus(active, meta = {}) {
  if (active) {
    return {
      active: true,
      model: meta.model || null,
      startTime: meta.startTime || Date.now(),
      bytesReceived: 0,
      chunksReceived: meta.chunksReceived || 0,
    };
  }
  return { active: false };
}

export function isSdkToolItem(item) {
  return [
    'command_execution',
    'commandExecution',
    'file_change',
    'fileChange',
    'mcp_tool_call',
    'mcpToolCall',
    'web_search',
    'webSearch',
  ].includes(item?.type);
}

export function sdkItemToAssistantBlock(item) {
  if (!item || typeof item !== 'object') return null;

  if (item.type === 'agent_message' || item.type === 'agentMessage') {
    const text = nonEmptyString(item.text);
    return text ? { type: 'text', text } : null;
  }

  if (item.type === 'reasoning') {
    const thinking = nonEmptyString(item.text);
    return thinking ? { type: 'thinking', thinking } : null;
  }

  if (item.type === 'todo_list' || item.type === 'todoList') {
    if (!Array.isArray(item.items) || item.items.length === 0) return null;
    const text = item.items
      .map(todo => `${todo.completed ? '[x]' : '[ ]'} ${todo.text || ''}`.trim())
      .filter(Boolean)
      .join('\n');
    return text ? { type: 'text', text } : null;
  }

  if (item.type === 'error') {
    const text = nonEmptyString(item.message);
    return text ? { type: 'text', text: `Error: ${text}` } : null;
  }

  if (isSdkToolItem(item)) {
    return sdkItemToToolUseBlock(item);
  }

  return null;
}

export function sdkItemToToolUseBlock(item) {
  if (!item || typeof item !== 'object') return null;
  const id = item.id || `${item.type || 'tool'}_${Date.now()}`;

  if (item.type === 'command_execution' || item.type === 'commandExecution') {
    return {
      type: 'tool_use',
      id,
      name: 'Bash',
      input: {
        command: item.command || '',
      },
    };
  }

  if (item.type === 'file_change' || item.type === 'fileChange') {
    return {
      type: 'tool_use',
      id,
      name: 'apply_patch',
      input: {
        changes: cloneJson(item.changes || []),
      },
    };
  }

  if (item.type === 'mcp_tool_call' || item.type === 'mcpToolCall') {
    return {
      type: 'tool_use',
      id,
      name: item.server ? `${item.server}.${item.tool || 'tool'}` : (item.tool || 'mcp_tool_call'),
      input: cloneJson(item.arguments ?? {}),
    };
  }

  if (item.type === 'web_search' || item.type === 'webSearch') {
    return {
      type: 'tool_use',
      id,
      name: 'web_search',
      input: {
        query: item.query || '',
      },
    };
  }

  return null;
}

export function sdkToolOutput(item) {
  if (!item || typeof item !== 'object') return '';

  if (item.type === 'command_execution' || item.type === 'commandExecution') {
    const output = item.aggregated_output ?? item.aggregatedOutput ?? '';
    const exit = item.exit_code ?? item.exitCode;
    return {
      output,
      status: item.status,
      ...(exit !== undefined ? { exit_code: exit } : {}),
    };
  }

  if (item.type === 'file_change' || item.type === 'fileChange') {
    return {
      status: item.status,
      changes: cloneJson(item.changes || []),
    };
  }

  if (item.type === 'mcp_tool_call' || item.type === 'mcpToolCall') {
    if (item.error) return item.error;
    return item.result ?? item.status ?? '';
  }

  if (item.type === 'web_search' || item.type === 'webSearch') {
    return {
      query: item.query || '',
      status: item.status || 'completed',
    };
  }

  return item.result ?? item.output ?? item.status ?? stringifyValue(item);
}

export function sdkToolName(item) {
  const block = sdkItemToToolUseBlock(item);
  return block?.name || item?.type || 'tool';
}

export function sdkToJSONLEntry(assistantMsg, messages, model, projectName, opts = {}) {
  const respBody = assistantMsg?.message || {};
  const content = Array.isArray(respBody.content) ? respBody.content : [];
  const usage = sdkUsageToViewerUsage(respBody.usage);
  const timestamp = opts.timestamp || new Date().toISOString();
  const url = opts.url || `codex://sdk/${encodeURIComponent(opts.threadId || model || 'thread')}`;

  const entry = {
    timestamp,
    project: projectName || 'sdk',
    url,
    method: 'POST',
    headers: {},
    body: {
      model: model || respBody.model || null,
      system: [{ type: 'text', text: opts.systemPrompt || 'You are Codex' }],
      tools: opts.tools || DEFAULT_CODEX_TOOLS,
      messages: cloneJson(messages || []),
      metadata: {
        thread_id: opts.threadId || null,
        cwd: opts.cwd || null,
        sdk: 'openai-codex-sdk',
        ...(opts.metadata || {}),
      },
    },
    response: opts.inProgress ? null : {
      status: opts.status || 200,
      statusText: opts.statusText || 'OK',
      headers: {},
      body: {
        content,
        model: model || respBody.model || null,
        stop_reason: opts.stopReason || 'end_turn',
        ...(usage ? { usage } : {}),
        ...(respBody.turn ? { turn: respBody.turn } : {}),
        ...(respBody.error ? { error: respBody.error } : {}),
      },
    },
    duration: opts.duration || 0,
    isStream: true,
    mainAgent: true,
    subAgent: false,
    _sdkSource: true,
  };

  if (opts.inProgress) {
    entry.inProgress = true;
    entry.requestId = opts.requestId || `sdk_${Date.now()}`;
  }

  return entry;
}
