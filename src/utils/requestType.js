/**
 * 请求类型分类工具
 * classifyRequest(req, nextReq?) 返回 { type, subType }
 * type: 'MainAgent' | 'SubAgent' | 'Teammate' | 'Tool' | 'Responses' | 'Count' | 'Preflight' | 'Plan' | 'Synthetic' | 'Metadata'
 *
 * Synthetic: Codex CLI 在主会话里合成的内部工具查询
 * （idle 返回 recap / 会话标题生成 / 压缩摘要等），HTTP 层 role=user 但并非用户手输。
 * subType: 'Recap' | 'Title' | 'Compact' | 'Topic' | 'Summary'
 */
// SYNTHETIC_PROMPTS 已抬到 contentFilter.js，让 isSystemText 也能共用（ChatView 字符串分支过滤）。
// requestType.js 继续维护 getSyntheticSubType —— 走的是"last user message + isMainAgent 门槛"的更强
// 形式判断（用于 RequestList 打 Synthetic tag）；isSystemText 走的是"纯文本起首匹配"（用于对话流隐藏）。
import { getInputItemText, getResponseConversationItems, getResponseInputItems, getResponseInstructions, getResponseTools } from '../../lib/openai-body.js';
import { isMainAgent, isTeammate, getInstructionsText, getEntryUpstreamLane, extractTeammateName, SYNTHETIC_PROMPTS } from './contentFilter.js';
import { isMetadataModelsEntry } from '../../lib/repeat-entry.js';

function getMessageText(msg) {
  return getInputItemText(msg);
}

function getSubAgentSubType(req) {
  if (req?.subAgentName) return req.subAgentName;
  const body = req.body || {};
  const instructionsText = getInstructionsText(body);

  if (/Extract any file paths/i.test(instructionsText)) return 'Shell';
  if (/process shell commands/i.test(instructionsText)) return 'Shell';
  if (/command execution specialist/i.test(instructionsText)) return 'Shell';
  if (/file search specialist/i.test(instructionsText)) return 'Search';
  if (/planning specialist/i.test(instructionsText)) return 'Plan';
  if (/general-purpose agent/i.test(instructionsText)) return 'General';
  if (/security monitor/i.test(instructionsText)) return 'Advisor';
  if (/performing a web search/i.test(instructionsText)) return 'web_search';

  const input = getResponseInputItems(body);
  for (let i = input.length - 1; i >= 0; i--) {
    if (input[i].role !== 'user') continue;
    const text = getMessageText(input[i]);
    if (/^Command:/m.test(text)) return 'Shell';
    break;
  }

  return null;
}

function getResponsesLaneSubType(req) {
  const lane = getEntryUpstreamLane(req);
  if (!lane || !lane.startsWith('responses:')) return null;
  return getSubAgentSubType(req) || 'OpenAI Responses';
}

/**
 * 判断请求是否为 Codex 内部合成的工具查询。
 * 必须同时满足：(1) 来自主会话（isMainAgent 通过），(2) 最后一条 user input item 的起首
 * 命中 SYNTHETIC_PROMPTS 白名单。返回匹配的 subType 或 null。
 *
 * 为什么不用"input 项短"作为启发式：拦截日志里 teammate 消息 / tool_result
 * 也常出现 input.length <= 3，会把它们误判为 Synthetic。白名单精确度更高，
 * 代价是 Codex 新增合成类型需要手工加 pattern。
 */
function getSyntheticSubType(req) {
  if (!isMainAgent(req)) return null;
  const input = getResponseInputItems(req.body);
  if (!input.length) return null;
  const last = input[input.length - 1];
  if (!last || last.role !== 'user') return null;
  const text = getMessageText(last).trim();
  if (!text) return null;
  for (const { subType, pattern } of SYNTHETIC_PROMPTS) {
    if (pattern.test(text)) return subType;
  }
  return null;
}

function isCountRequest(req) {
  const input = getResponseConversationItems(req.body);
  if (input.length !== 1) return false;
  const msg = input[0];
  return msg.role === 'user' && msg.content === 'count';
}

function isQuotaCheck(req) {
  const body = req.body || {};
  if (body.max_tokens !== 1) return false;
  if (getResponseInstructions(body)) return false;
  if (getResponseTools(body).length > 0) return false;
  const input = getResponseConversationItems(body);
  if (input.length !== 1) return false;
  return input[0].role === 'user' && input[0].content === 'quota';
}

function isCodexToolEvent(req) {
  if (!req || req.mainAgent !== false || req.subAgent !== false) return false;
  if (['TOOL', 'TOOL_RESULT', 'SUBAGENT', 'EVENT'].includes(req.method)) return true;
  return typeof req.url === 'string' && req.url.startsWith('codex://');
}

export function isToolRequest(req) {
  if (!req || req.mainAgent !== false || req.subAgent !== false) return false;
  if (['TOOL', 'TOOL_RESULT'].includes(req.method)) return true;
  const url = typeof req.url === 'string' ? req.url : '';
  return /^codex:\/\/(?:tool|tool_result|mcp_tool|dynamic_tool|collab)\b/.test(url);
}

function getToolSubType(req) {
  const body = req?.body || {};
  const name = body.tool_name || body.event_name;
  if (name) return String(name);
  const url = typeof req?.url === 'string' ? req.url : '';
  const m = url.match(/^codex:\/\/(?:tool|tool_result|mcp_tool|dynamic_tool|collab)\/([^?#]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]) || null;
  } catch {
    return m[1] || null;
  }
}

export function isModelCatalogRequest(req) {
  return isMetadataModelsEntry(req);
}

/**
 * Preflight 判断：
 * 1. tools 为空或不存在
 * 2. input 仅一条 user item
 * 3. instructions 包含 Codex 特征
 * 4. 下一条请求的 input 中包含本条 item 的文本（前80字符匹配）
 */
function isPreflightRequest(req, nextReq) {
  const body = req.body || {};
  const tools = getResponseTools(body);
  const input = getResponseConversationItems(body);

  // 条件1: tools 为空
  if (Array.isArray(tools) && tools.length > 0) return false;

  // 条件2: 仅一条 user input item
  if (input.length !== 1 || input[0].role !== 'user') return false;

  const text = getMessageText(input[0]);
  if (!text) return false;

  // 排除 count 请求
  if (text.trim() === 'count') return false;

  // 排除工具类请求（shell 命令、安全策略检查、系统通知等）
  const trimmed = text.trim();
  if (/^Command:/m.test(text) || /^<policy_spec>/i.test(trimmed) || /^<task-notification>/i.test(trimmed)) return false;

  // 条件3: instructions 包含 Codex 特征，但排除 shell 处理器
  const instructionsText = getInstructionsText(body);
  if (!instructionsText.includes('Codex')) return false;
  if (/process shell commands/i.test(instructionsText)) return false;
  if (/Extract any file paths/i.test(instructionsText)) return false;

  // 条件4: 下一条请求的 input 中包含本条文本
  if (nextReq) {
    const nextInput = getResponseConversationItems(nextReq.body);
    const sig = text.slice(0, 80);
    const found = nextInput.some(m => getMessageText(m).includes(sig));
    if (found) return true;
  }

  return false;
}

/**
 * 分类请求
 * @param {object} req - 当前请求
 * @param {object} [nextReq] - 下一条请求（用于 Preflight 判断）
 */
export function classifyRequest(req, nextReq) {
  // Teammate 子进程的请求优先识别（收敛于 contentFilter.isTeammate）
  if (isTeammate(req)) {
    if (req.teammate) return { type: 'Teammate', subType: req.teammate };
    if (req._cachedTeammateName === undefined) {
      req._cachedTeammateName = extractTeammateName(req.body) || null;
    }
    return { type: 'Teammate', subType: req._cachedTeammateName };
  }

  // Synthetic 检查要在 MainAgent 之前——这类请求 mainAgent=true，
  // 不拦截就会被当作普通主会话轮次，用户看不出是 Codex 合成的。
  const syntheticSub = getSyntheticSubType(req);
  if (syntheticSub) {
    return { type: 'Synthetic', subType: syntheticSub };
  }

  if (isMainAgent(req)) {
    return { type: 'MainAgent', subType: null };
  }

  if (req.isCountTokens || isCountRequest(req)) {
    return { type: 'Count', subType: null };
  }

  if (isQuotaCheck(req)) {
    return { type: 'Count', subType: 'Quota' };
  }

  if (isCodexToolEvent(req)) {
    if (isToolRequest(req)) {
      return { type: 'Tool', subType: getToolSubType(req) };
    }
    return { type: 'Synthetic', subType: req.method || 'Tool' };
  }

  if (isModelCatalogRequest(req)) {
    return { type: 'Metadata', subType: 'Models' };
  }

  const responsesLaneSubType = getResponsesLaneSubType(req);
  if (responsesLaneSubType) {
    // Slimming removes the body fields used by MainAgent heuristics. Historical
    // transport entries can therefore reach this fallback with stale capture
    // flags (`subAgent: true`, `subAgentName: OpenAI Responses`). They are
    // Responses traffic, not delegated agents. Preserve genuine named
    // subagents while giving transport records their own neutral category.
    const isTransportLabel = /^(?:OpenAI Responses|Responses(?:\s|$))/i.test(responsesLaneSubType);
    if (req.subAgent && !isTransportLabel) {
      return { type: 'SubAgent', subType: responsesLaneSubType };
    }
    return { type: 'Responses', subType: responsesLaneSubType };
  }

  if (req.subAgent) {
    return { type: 'SubAgent', subType: getSubAgentSubType(req) };
  }

  if (isPreflightRequest(req, nextReq)) {
    // Preflight 内容以 "Implement the following plan:" 开头 → Plan:Prompt
    const text = getMessageText(getResponseConversationItems(req.body)[0]);
    if (/Implement the following plan:/i.test(text.trim())) {
      return { type: 'Plan', subType: 'Prompt' };
    }
    return { type: 'Preflight', subType: null };
  }

  const subType = getSubAgentSubType(req);
  if (subType) return { type: 'SubAgent', subType };
  return { type: 'Metadata', subType: null };
}

// Tag 显示文本
export function formatRequestTag(type, subType) {
  if (type === 'Teammate' && subType) return `Teammate:${subType}`;
  if (type === 'Plan' && subType) return `Plan:${subType}`;
  if (type === 'SubAgent' && subType) return `SubAgent:${subType}`;
  if (type === 'Responses' && subType) return subType;
  if (type === 'Tool' && subType) return `Tool:${subType}`;
  if (type === 'Synthetic' && subType) return `Synthetic:${subType}`;
  if (type === 'Count' && subType) return `Count:${subType}`;
  if (type === 'Metadata' && subType) return `Metadata:${subType}`;
  return type;
}

// Teammate label: "Teammate: name(model-short)" or "Teammate: name"
export function formatTeammateLabel(name, model) {
  const displayName = name || 'X';
  if (!model) return `Teammate: ${displayName}`;
  const short = model.replace(/^codex-/i, '').replace(/-\d{8}$/, '');
  return `Teammate: ${displayName}(${short})`;
}
