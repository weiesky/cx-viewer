/**
 * tool_result entry 的纯 JS 核心,无 i18n / SVG 依赖。
 * 拆出独立模块是为了让 node --test 可直接 import(避开 helpers.js → SVG 的 vite-only 链)。
 * 生产路径仍在 toolResultBuilder.js 通过 buildSingleToolResult 包装,补 i18n label。
 */

import { internToolResult } from './readResultPool.js';
import { classifyToolResultError } from './toolResultClassifier.js';

export function extractToolResultText(toolResult) {
  if (!toolResult.content) return String(toolResult.content ?? '');
  if (typeof toolResult.content === 'string') return toolResult.content;
  if (Array.isArray(toolResult.content)) {
    return toolResult.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');
  }
  return JSON.stringify(toolResult.content);
}

// 白名单防恶意 JSONL 拼任意 MIME(svg+xml 在某些浏览器可嵌入脚本;text/html 应被
// <img> 拒绝但日志污染仍可避免)。
const SAFE_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

// base64 字符串长度上限(2MB ≈ 1.5MB 原图)。超限不渲染 <img>,降级为文字提示,
// 避免每次 Popover 重渲染都构造几 MB src 字符串导致 React diff / 浏览器解码卡顿。
const MAX_IMAGE_BASE64_LEN = 2 * 1024 * 1024;

/**
 * 提取 tool_result 内嵌的 image 块为可直接渲染的 src 列表(或大图占位)。
 * Anthropic API 协议:Read 图片文件 / 截图等返回 `{type:'image', source: {type:'base64', media_type, data}}`,
 * 也可能是 `{type:'url', url}`。
 *
 * 安全/性能:
 *   - media_type 必须在白名单内,否则跳过
 *   - base64 超过 MAX_IMAGE_BASE64_LEN 时,返回 { oversized: true, sizeBytes } 让 UI 降级显示
 */
export function extractToolResultImages(toolResult) {
  if (!toolResult || !Array.isArray(toolResult.content)) return [];
  const out = [];
  for (const b of toolResult.content) {
    if (!b || b.type !== 'image' || !b.source) continue;
    const s = b.source;
    if (s.type === 'base64' && typeof s.data === 'string' && s.data.length > 0 && typeof s.media_type === 'string') {
      if (!SAFE_IMAGE_MIME.has(s.media_type)) continue;
      if (s.data.length > MAX_IMAGE_BASE64_LEN) {
        out.push({ oversized: true, mediaType: s.media_type, sizeBytes: Math.floor(s.data.length * 0.75) });
        continue;
      }
      out.push({ src: `data:${s.media_type};base64,${s.data}`, mediaType: s.media_type });
    } else if (s.type === 'url' && typeof s.url === 'string' && /^https?:\/\//.test(s.url)) {
      out.push({ src: s.url, mediaType: 'image/url' });
    }
  }
  return out;
}

// Workflow tool_result 文本固定以此句开头（后台启动即时返回，完成走单独的 task-notification）。
const WF_LAUNCH_MARKER = 'Workflow launched in background';
const WF_TASK_ID_RE = /Task ID:\s*([A-Za-z0-9_-]+)/;
const WF_RUN_ID_RE = /Run ID:\s*(wf_[A-Za-z0-9_-]+)/;
// Transcript dir / Script file 路径段：…/projects/<cwd 编码>/<sessionId(UUID)>/…
const WF_SESSION_RE = /\/projects\/[^/\s]+\/([0-9a-fA-F-]{36})\//;

/**
 * 从 Workflow tool_result 原始文本解析定位线索。命中返回 { runId, taskId, sessionId }，
 * 否则返回 null。sessionId 为全局唯一 UUID，足以让服务端 /api/workflow-journal 定位 journal
 * 目录，无需 project hint。
 *
 * @param {string} txt - tool_result resultText 原文
 * @returns {{ runId: string|null, taskId: string|null, sessionId: string|null } | null}
 */
export function parseWorkflowFromText(txt) {
  if (typeof txt !== 'string' || txt.indexOf(WF_LAUNCH_MARKER) === -1) return null;
  const taskId = (txt.match(WF_TASK_ID_RE) || [])[1] || null;
  const runId = (txt.match(WF_RUN_ID_RE) || [])[1] || null;
  const sessionId = (txt.match(WF_SESSION_RE) || [])[1] || null;
  if (!runId && !taskId) return null;
  return { runId, taskId, sessionId };
}

export function buildSingleToolResultCore(block, matchedTool) {
  let toolName = null;
  let toolInput = null;
  if (matchedTool) {
    toolName = matchedTool.name;
    toolInput = matchedTool.input;
  }
  let resultText = extractToolResultText(block);
  resultText = internToolResult(resultText);
  const isError = !!block.is_error;
  const { isPermissionDenied, isInputValidationError, isUltraplan } = classifyToolResultError(resultText, isError);
  const images = extractToolResultImages(block);
  // Workflow 工具：直接从原始 tool_result 文本解析 { runId, taskId, sessionId } 线索定位
  // 并拉取 workflow run journal 渲染面板。线索原生存在于 wire 文本（"Workflow launched in
  // background. Task ID: … / Run ID: wf_… / Transcript dir: …/projects/<cwd>/<sessionId>/…"），
  // 不依赖服务端注入——历史日志（含未经 enrich 的旧日志）同样可识别。
  // 回退：兼容旧路径已注入的 block._cxvWorkflow（服务端 enrich-workflow，仍用于 live）。
  // 文本解析命中时补回 _cxvWorkflow 携带的 project（解析线索里没有），用于 journal 定位的精确消歧。
  const parsedWf = parseWorkflowFromText(resultText);
  const cxvWf = (block._cxvWorkflow && typeof block._cxvWorkflow === 'object') ? block._cxvWorkflow : null;
  const workflow = parsedWf
    ? { ...parsedWf, project: cxvWf?.project || null }
    : cxvWf;
  return { toolName, toolInput, resultText, isError, isPermissionDenied, isInputValidationError, isUltraplan, images, workflow };
}

const ANSI_ESCAPE = /\x1b\[[0-9;]*[A-Za-z]/g;
const READ_LINE_PREFIX = /^\s*\d+[→\t](.*)$/;

/**
 * 紧凑模式 Popover 浮窗的 tool_result 预览:从 toolResultMap entry 生成截断文本。
 *
 * 返回 null 的场景(由 caller skip 渲染预览块):
 *   - entry 不存在 / resultText 为空
 *   - isPermissionDenied / isInputValidationError(外部已有红 badge,避免双显示)
 *
 * 工具特定清洗:
 *   - Read:strip 行号前缀(`   123→content` → `content`)
 *   - Bash:strip ANSI 转义(`\x1b[31mERROR\x1b[0m` → `ERROR`)
 *
 * 截断策略:行数上限 maxLines(默认 50,留够内容让 CSS max-height + overflow:auto 触发
 * 滚动),每行字符上限 maxChars(默认 500,防止超长单行撑爆 popover)。
 */
export function compactResultPreview(entry, opts = {}) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.isPermissionDenied || entry.isInputValidationError) return null;

  // 图片优先:Read 图片文件 / 截图等场景,images 数组非空则返回图片预览(text 可同时存在,作为辅助文本)
  const images = Array.isArray(entry.images) ? entry.images : null;
  const hasImages = images && images.length > 0;

  const raw = entry.resultText;
  const hasText = typeof raw === 'string' && raw.length > 0;
  if (!hasImages && !hasText) return null;

  const maxLines = opts.maxLines || 50;
  const maxChars = opts.maxChars || 500;

  let text = null;
  if (hasText) {
    let cleaned = raw;
    if (entry.toolName === 'Bash') {
      cleaned = cleaned.replace(ANSI_ESCAPE, '');
    }
    const lines = cleaned.split('\n');
    const totalLines = lines.length;
    const slice = lines.slice(0, maxLines);
    const out = [];
    for (let i = 0; i < slice.length; i++) {
      let line = slice[i];
      if (entry.toolName === 'Read') {
        const m = line.match(READ_LINE_PREFIX);
        if (m) line = m[1];
      }
      if (line.length > maxChars) line = line.slice(0, maxChars) + '…';
      out.push(line);
    }
    text = out.join('\n');
    if (totalLines > maxLines) text = text + '\n…';
    if (text.trim().length === 0) text = null;
  }

  if (!hasImages && !text) return null;
  return { text, images: hasImages ? images : null };
}
