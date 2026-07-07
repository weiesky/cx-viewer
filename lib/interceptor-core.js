import { appendFileSync, existsSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SUBAGENT_SYSTEM_RE = /(?:command execution|file search|planning) specialist|general-purpose agent|subagent|sub-agent/i;
const CODEX_TOOL_NAMES = new Set([
  'apply_patch',
  'local_shell',
  'shell',
  'view_image',
  'update_plan',
  'web_search',
  'spawnAgent',
  'sendInput',
  'resumeAgent',
  'wait',
  'closeAgent',
]);

function safeJsonParse(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function textFromContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(part => {
    if (!part) return '';
    if (typeof part === 'string') return part;
    if (typeof part.text === 'string') return part.text;
    if (typeof part.input_text === 'string') return part.input_text;
    if (typeof part.output_text === 'string') return part.output_text;
    if (typeof part.refusal === 'string') return part.refusal;
    return '';
  }).join('');
}

function getToolName(tool) {
  if (!tool || typeof tool !== 'object') return '';
  return tool.name || tool.tool || tool.type || tool.function?.name || '';
}

export function getSystemText(body) {
  const system = body?.system;
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) {
    return system.map(s => (s && s.text) || '').join('');
  }
  if (typeof body?.instructions === 'string') return body.instructions;
  return '';
}

function hasCodexTool(body) {
  if (!Array.isArray(body?.tools)) return false;
  return body.tools.some(tool => CODEX_TOOL_NAMES.has(getToolName(tool)));
}

function hasCodexInput(body) {
  const input = body?.input || body?.messages;
  if (!Array.isArray(input)) return false;
  return input.some(item => {
    if (!item || typeof item !== 'object') return false;
    const type = item.type || '';
    if (type === 'local_shell_call' || type === 'function_call' || type === 'custom_tool_call') return true;
    const text = textFromContent(item.content);
    return /Codex|AGENTS\.md|sandbox|approval|workspace/i.test(text);
  });
}

export function isCodexResponsesRequest(body) {
  if (!body || typeof body !== 'object') return false;
  if (!Array.isArray(body.input)) return false;
  if (!body.model || body.stream !== true) return false;
  const sysText = getSystemText(body);
  return /Codex/i.test(sysText) || hasCodexTool(body) || hasCodexInput(body);
}

export function isSubAgentRequest(body) {
  if (!body || typeof body !== 'object') return false;
  const sysText = getSystemText(body);
  if (SUBAGENT_SYSTEM_RE.test(sysText)) return true;
  const metadata = body.client_metadata || body.metadata || {};
  const metadataText = Object.entries(metadata).map(([k, v]) => `${k}:${v}`).join('\n');
  return /parent_thread_id|subagent|sub_agent|thread_spawn|guardian|compact|review/i.test(metadataText);
}

export function isMainAgentRequest(body) {
  if (isCodexResponsesRequest(body)) {
    return !isSubAgentRequest(body);
  }

  if (!body?.system || !Array.isArray(body?.tools)) return false;

  const sysText = getSystemText(body);
  if (!sysText.includes('You are Codex')) return false;
  if (SUBAGENT_SYSTEM_RE.test(sysText)) return false;

  const isSystemArray = Array.isArray(body.system);
  const hasToolSearch = body.tools.some(t => t.name === 'ToolSearch');

  if (isSystemArray && hasToolSearch) {
    const messages = body.messages || [];
    const firstMsgContent = messages.length > 0 ?
      (typeof messages[0].content === 'string' ? messages[0].content :
        Array.isArray(messages[0].content) ? messages[0].content.map(c => c.text || '').join('') : '') : '';
    if (firstMsgContent.includes('<available-deferred-tools>')) {
      return true;
    }
  }

  // v2.1.81+: 轻量 MainAgent 初始请求工具数可能 < 10，降低阈值兼容
  if (body.tools.length > 5) {
    const hasEdit = body.tools.some(t => t.name === 'Edit');
    const hasBash = body.tools.some(t => t.name === 'Bash');
    const hasTaskOrAgent = body.tools.some(t => t.name === 'Task' || t.name === 'Agent');
    if (hasEdit && hasBash && hasTaskOrAgent) {
      return true;
    }
  }

  return false;
}

export function isPreflightEntry(entry) {
  if (entry.mainAgent || entry.isHeartbeat || entry.isCountTokens) return false;
  const body = entry.body || {};
  if (Array.isArray(body.tools) && body.tools.length > 0) return false;
  const msgs = body.messages || [];
  if (msgs.length !== 1 || msgs[0].role !== 'user') return false;
  const sysText = typeof body.system === 'string' ? body.system :
    Array.isArray(body.system) ? body.system.map(s => s?.text || '').join('') : '';
  return sysText.includes('Codex');
}

export function isOpenAiApiPath(urlStr) {
  try {
    const pathname = new URL(urlStr).pathname;
    return /^\/v1\/responses(\/.*)?$/.test(pathname)
      || /^\/v1\/messages(\/count_tokens)?$/.test(pathname)
      || /^\/v1\/chat\/completions$/.test(pathname)
      || /^\/v1\/completions$/.test(pathname)
      || /^\/v1\/embeddings$/.test(pathname)
      || /^\/v1\/batches(\/.*)?$/.test(pathname);
  } catch {
    return /\/v1\/responses/.test(urlStr) || /\/v1\/messages/.test(urlStr) || /\/v1\/chat\/completions/.test(urlStr);
  }
}

function normalizeResponseItem(item, fallbackText = '') {
  if (!item || typeof item !== 'object') return null;
  const type = item.type;

  if (type === 'message' || type === 'agent_message') {
    const text = item.text || textFromContent(item.content) || fallbackText;
    return text ? { type: 'text', text } : null;
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

function normalizeOpenAiUsage(usage) {
  if (!usage || typeof usage !== 'object') return usage || null;
  const rawInput = usage.input_tokens ?? usage.inputTokens ?? 0;
  const output = usage.output_tokens ?? usage.outputTokens ?? 0;
  const cached = usage.cache_read_input_tokens
    ?? usage.cached_input_tokens
    ?? usage.cachedInputTokens
    ?? usage.input_tokens_details?.cached_tokens
    ?? 0;
  const reasoning = usage.reasoning_output_tokens
    ?? usage.reasoningOutputTokens
    ?? usage.output_tokens_details?.reasoning_tokens
    ?? 0;
  const total = usage.total_tokens ?? usage.totalTokens ?? (rawInput + output);
  return {
    ...usage,
    input_tokens: Math.max(0, rawInput - cached),
    output_tokens: output,
    cache_read_input_tokens: cached,
    reasoning_output_tokens: reasoning,
    total_tokens: total,
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
  const content = [];
  const items = new Map();
  let response = null;
  let currentMessageText = '';
  let currentReasoningText = '';

  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const type = event.type || event.event;

    if (type === 'response.created' && event.response) {
      response = { ...response, ...event.response };
      continue;
    }

    if ((type === 'response.output_item.added' || type === 'response.output_item.done') && event.item) {
      const key = event.item.id || event.item.call_id || `${event.item.type}:${items.size}`;
      items.set(key, event.item);
      if (type === 'response.output_item.done') {
        const block = normalizeResponseItem(event.item);
        mergeContentBlock(content, block);
      }
      continue;
    }

    if (type === 'response.content_part.added' && event.part) {
      if (event.part.type === 'output_text' || event.part.type === 'text') {
        currentMessageText += event.part.text || '';
      }
      continue;
    }

    if (type === 'response.output_text.delta') {
      currentMessageText += event.delta || '';
      continue;
    }

    if (type === 'response.output_text.done' || type === 'response.content_part.done') {
      const text = event.text || currentMessageText;
      if (text) mergeContentBlock(content, { type: 'text', text });
      currentMessageText = '';
      continue;
    }

    if (type === 'response.reasoning_summary_text.delta' || type === 'response.reasoning_text.delta') {
      currentReasoningText += event.delta || '';
      continue;
    }

    if (type === 'response.reasoning_summary_text.done' || type === 'response.reasoning_text.done') {
      const thinking = event.text || currentReasoningText;
      if (thinking) mergeContentBlock(content, { type: 'thinking', thinking });
      currentReasoningText = '';
      continue;
    }

    if (type === 'response.function_call_arguments.delta' || type === 'response.custom_tool_call_input.delta') {
      const key = event.item_id || event.call_id || `tool:${items.size}`;
      const existing = items.get(key) || { type: 'function_call', id: key, call_id: event.call_id || key, name: 'tool', arguments: '' };
      existing.arguments = (existing.arguments || existing.input || '') + (event.delta || '');
      items.set(key, existing);
      continue;
    }

    if (type === 'response.function_call_arguments.done' || type === 'response.custom_tool_call_input.done') {
      const key = event.item_id || event.call_id || `tool:${items.size}`;
      const existing = items.get(key) || { type: 'function_call', id: key, call_id: event.call_id || key, name: 'tool' };
      existing.arguments = event.arguments || event.input || existing.arguments || '';
      items.set(key, existing);
      mergeContentBlock(content, normalizeResponseItem(existing));
      continue;
    }

    if (type === 'response.completed' && event.response) {
      response = { ...response, ...event.response };
    }
  }

  if (currentReasoningText) mergeContentBlock(content, { type: 'thinking', thinking: currentReasoningText });
  if (currentMessageText) mergeContentBlock(content, { type: 'text', text: currentMessageText });

  if (response?.output && Array.isArray(response.output)) {
    const responseContent = [];
    for (const item of response.output) mergeContentBlock(responseContent, normalizeResponseItem(item));
    if (responseContent.length > 0) {
      content.length = 0;
      content.push(...responseContent);
    }
  }

  if (content.length === 0) {
    for (const item of items.values()) mergeContentBlock(content, normalizeResponseItem(item));
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

export function findRecentLog(dir, projectName) {
  try {
    const files = readdirSync(dir)
      .filter(f => f.startsWith(projectName + '_') && f.endsWith('.jsonl'))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    return join(dir, files[0]);
  } catch (err) {
    if (process.env.CXV_DEBUG) console.warn('[CX-Viewer] findRecentLog error:', err.message);
  }
  return null;
}

export function cleanupTempFiles(dir, projectName) {
  try {
    const tempFiles = readdirSync(dir)
      .filter(f => f.startsWith(projectName + '_') && f.endsWith('_temp.jsonl'));
    for (const f of tempFiles) {
      try {
        const tempPath = join(dir, f);
        const newPath = tempPath.replace('_temp.jsonl', '.jsonl');
        if (existsSync(newPath)) {
          const tempContent = readFileSync(tempPath, 'utf-8');
          if (tempContent.trim()) {
            appendFileSync(newPath, tempContent);
          }
          unlinkSync(tempPath);
        } else {
          // 只有非空 temp 文件才 rename，空文件直接删除
          const sz = statSync(tempPath).size;
          if (sz > 0) {
            renameSync(tempPath, newPath);
          } else {
            unlinkSync(tempPath);
          }
        }
      } catch { }
    }
  } catch { }
}

export function migrateConversationContext(oldFile, newFile) {
  try {
    const content = readFileSync(oldFile, 'utf-8');
    if (!content.trim()) return;

    const parts = content.split('\n---\n').filter(p => p.trim());
    if (parts.length === 0) return;

    let originIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!/"mainAgent"\s*:\s*true/.test(parts[i])) continue;
      try {
        const entry = JSON.parse(parts[i]);
        if (entry.mainAgent) {
          const msgs = entry.body?.messages;
          // Delta storage: 使用 _totalMessageCount（delta 条目）或 msgs.length（旧格式）
          const msgCount = entry._totalMessageCount || (Array.isArray(msgs) ? msgs.length : 0);
          if (msgCount === 1) {
            originIndex = i;
            break;
          }
        }
      } catch { }
    }

    if (originIndex < 0) return;

    let migrationStart = originIndex;
    if (originIndex > 0) {
      try {
        const prevContent = parts[originIndex - 1];
        if (prevContent.trim().startsWith('{')) {
          const prev = JSON.parse(prevContent);
          if (isPreflightEntry(prev)) {
            migrationStart = originIndex - 1;
          }
        }
      } catch { }
    }

    const migratedParts = parts.slice(migrationStart);
    writeFileSync(newFile, migratedParts.join('\n---\n') + '\n---\n');

    const remainingParts = parts.slice(0, migrationStart);
    if (remainingParts.length > 0) {
      writeFileSync(oldFile, remainingParts.join('\n---\n') + '\n---\n');
    } else {
      // 所有内容已迁移到新文件，清空旧文件（不能删除，watcher 需要检测 truncation 来触发轮转）
      writeFileSync(oldFile, '');
    }
  } catch { }
}

/**
 * Rotate log file when it exceeds maxSize.
 * Creates an empty new file (no content migration) and appends '\n' to old file
 * to trigger fs.watchFile callback for watcher migration.
 *
 * @param {string} currentFile - current log file path
 * @param {string} newFile - new log file path to rotate to
 * @param {number} maxSize - max file size in bytes
 * @returns {{ rotated: boolean, oldFile?: string, newFile?: string }}
 */
export function rotateLogFile(currentFile, newFile, maxSize) {
  try {
    if (!existsSync(currentFile)) return { rotated: false };
    const size = statSync(currentFile).size;
    if (size < maxSize) return { rotated: false };
    // 不迁移旧内容，创建空新文件（立即创建，避免 watcher 时序窗口）
    try { writeFileSync(newFile, ''); } catch { }
    // 触发旧文件 watcher 回调，使其检测到文件变更并切换到新文件
    try { appendFileSync(currentFile, '\n'); } catch { }
    return { rotated: true, oldFile: currentFile, newFile };
  } catch { }
  return { rotated: false };
}
