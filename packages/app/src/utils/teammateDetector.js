/**
 * Native Teammate 检测器
 *
 * 识别 Codex 同进程内通过当前 collab 工具启动的 native teammate。
 * 与外部进程 teammate（通过 --agent-name 参数启动）不同，native teammate
 * 的 API 请求没有 req.teammate 字段，需要通过 instructions 特征检测。
 *
 * 特征：instructions 中包含 "You are a Codex agent" 标记
 * （主 agent 的 instructions 是 "You are Codex"）
 *
 * 版本兼容：
 * - Codex v2.1.81+: instructions includes "You are a Codex agent".
 * - 未来版本如果特征变化，在此文件中添加新的检测规则即可
 */

import { getInputItemText, getInstructionsText, getResponseInputItems, getResponseInstructions } from '../../lib/openai-body.js';

// Native teammate 特征：instructions 包含 "You are a Codex agent"
// 注意区分 "You are Codex"（主 agent）
// 但 "You are a Codex agent" 对所有 SDK agent（含普通 subagent）都匹配，
// 单这一条判据会把普通 subagent 误判为 teammate。
// 真正区分：teammate 之间通过 send_input 通信，subagent 不会被授予该工具。
const NATIVE_TEAMMATE_RE = /You are a Codex agent/i;

// WeakMap cache 避免重复检测
const _cache = new WeakMap();

/**
 * 判断请求是否为 native teammate（同进程内的 Agent 子代理）
 * @param {object} req - 请求对象
 * @returns {boolean}
 */
export function isNativeTeammate(req) {
  if (!req) return false;
  const cached = _cache.get(req);
  if (cached !== undefined) return cached;

  // 已有 teammate 字段（外部进程 teammate）→ 不是 native teammate
  if (req.teammate) {
    _cache.set(req, false);
    return false;
  }

  const instructionsText = getInstructionsText(req.body || {});
  if (!NATIVE_TEAMMATE_RE.test(instructionsText)) {
    _cache.set(req, false);
    return false;
  }

  // send_input 是 teammate 间通信必需工具，普通 subagent 不会被授予。
  // 命中正则但没 send_input → 是普通 subagent，不是 teammate。
  const tools = req.body?.tools;
  const hasSendInput = Array.isArray(tools) && tools.some(t => t && t.name === 'send_input');
  const result = hasSendInput;
  _cache.set(req, result);
  return result;
}

/**
 * 从 native teammate 请求中提取名字
 * 优先从首条 user input item 中匹配 "You are XXX" 模式
 * @param {object} req - 请求对象
 * @returns {string|null}
 */
export function extractNativeTeammateName(req) {
  if (!req?.body) return null;

  const input = getResponseInputItems(req.body);
  if (input.length === 0) return null;

  // 搜索所有 user input items（上下文压缩后 hook 可能不在 input[0] 中）
  for (const m of input) {
    if (m.role !== 'user') continue;
    const text = getInputItemText(m);
    if (!text) continue;

    // 匹配名字模式（按优先级尝试）
    const nameMatch =
      // OMC hook: "agent oh-my-codexcode:code-reviewer started"
      text.match(/agent\s+(?:oh-my-codexcode:)?(\S+)\s+started/i)
      // 任务提示: "You are CRer2, ..."
      || text.match(/You are (\w+)[,.]/)
      // 显式名字: "name: CRer2"
      || text.match(/name[：:]\s*["']?(\w+)/i);
    if (nameMatch) return nameMatch[1];
  }

  return null;
}

/**
 * 从 instructions block 中提取版本号。
 * Codex-native entries should prefer explicit metadata when available.
 * @param {object} req - 请求对象
 * @returns {string|null} 版本号如 "2.1.90" 或 null
 */
export function extractCcVersion(req) {
  const instructions = getResponseInstructions(req?.body);
  if (!Array.isArray(instructions)) return null;
  for (const block of instructions) {
    if (!block?.text) continue;
    const m = block.text.match(/cc_version=([\d.]+[a-fA-F0-9]*)/);
    if (m) return m[1];
  }
  return null;
}
