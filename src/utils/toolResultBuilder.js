/**
 * Incremental tool result state builder.
 * Processes assistant tool_use and user tool_result blocks into lookup maps.
 *
 * NOTE: The primary wire input is the viewer's Codex projection. Historical
 * server_tool_use/web_search_tool_result blocks remain a read-only compatibility
 * path and are rendered directly by ChatMessage.
 */

import { t } from '../i18n.js';
import { parseAskAnswerText } from './askAnswerParser.js';
import { buildSingleToolResultCore } from './toolResultCore.js';
import { isAskToolName, isPlanToolName } from './toolNameAliases.js';

// Preserve the existing utility export for callers outside this module while
// keeping its pure implementation independently testable in Node.
export { parseAskAnswerText };

// --- WeakMap cache for tool result state ---

const _toolResultCache = new WeakMap();

// 稳定引用,避免 `req.body?.input || []` 每次构造新 `[]` 字面量打穿 WeakMap 缓存
// (subAgentEntries 扫描在每次 requests-change 时跑,缓存命中是热路径性能假设)。
const EMPTY_MESSAGES = Object.freeze([]);

export function getToolResultCache(messages) {
  return _toolResultCache.get(messages) || null;
}

export function setToolResultCache(messages, state) {
  _toolResultCache.set(messages, state);
}


// --- State builder ---

export function createEmptyToolState() {
  return {
    toolUseMap: {},
    toolResultMap: {},
    readContentMap: {},
    editSnapshotMap: {},
    askAnswerMap: {},
    planApprovalMap: {},
    latestPlanContent: null,
    latestPlanFilePath: null,
    _fileState: {},
    _editOrder: [],
    _imageEntryIds: [],
    _imageCharsById: {},
    _retainedImageBase64Chars: 0,
  };
}

/**
 * i18n 包装:在 toolResultCore 的 buildSingleToolResultCore 基础上附加本地化 label。
 * 生产路径调用此函数;test 直接调 core 以避开 i18n 依赖。
 */
export function buildSingleToolResult(block, matchedTool) {
  const core = buildSingleToolResultCore(block, matchedTool);
  let label = t('ui.toolReturn');
  if (matchedTool) {
    if (matchedTool.name === 'spawn_agent' && matchedTool.input) {
      const task = matchedTool.input.task_name || matchedTool.input.name || 'agent';
      label = `SubAgent: ${task}`;
    } else if (matchedTool.name === 'Task' && matchedTool.input) {
      // Read-only compatibility for pre-Codex cx-viewer logs.
      const st = matchedTool.input.subagent_type || '';
      const desc = matchedTool.input.description || '';
      label = `SubAgent: ${st}${desc ? ' — ' + desc : ''}`;
    } else {
      label = t('ui.toolReturnNamed', { name: matchedTool.name });
    }
  }
  return { label, ...core };
}

/**
 * 全局聚合所有 requests 的 tool_result 块,按 tool_use_id 索引。
 *
 * 设计动机:并行 SubAgent / Teammate 的请求在日志中互相穿插,K+1 不一定是同一 agent
 * 的下一个 turn。两遍扫描建立"id → result"全局索引,渲染时 O(1) 查询,免去运行时配对。
 *
 * Pass 1: 全量构建 toolUseMap(供 label / toolName / toolInput 解析)
 *   - body.input 里 role=assistant 的 tool_use 块
 *   - response.body.content 里的 tool_use 块(末轮)
 * Pass 2: 提取所有 tool_result 块写入索引(role=user 消息的 content[])
 *
 * Codex call_id is the authoritative correlation key.
 */
export function buildGlobalToolResultIndex(requests) {
  const state = createEmptyGlobalIndexState();
  appendToGlobalToolResultIndex(state, requests, 0);
  return state.index;
}

// Limit derived preview data URLs by their retained base64 character count.
// Raw request history may still own the original payload; this budget prevents
// the local/global result indexes and mounted previews from multiplying it.
export const MAX_RETAINED_TOOL_IMAGE_BASE64_CHARS = 24 * 1024 * 1024;

/**
 * 增量索引 state:供 ChatView / TeamModal 在 requests 增量到达时复用,避免每次全量扫描。
 *   index           : { [tool_use_id]: entry } (出参,共享给调用方)
 *   _useMap         : 已扫到的 tool_use 块 (Pass 1 累积,Pass 2 查 label)
 *   _imageEntryIds  : FIFO 队列,跟踪持有 base64 image 的 entry id,超总字符预算时驱逐最早
 */
export function createEmptyGlobalIndexState() {
  return {
    index: {},
    _useMap: {},
    _imageEntryIds: [],
    _imageCharsById: {},
    _retainedImageBase64Chars: 0,
  };
}

function retainedBase64Chars(entry) {
  if (!Array.isArray(entry?.images)) return 0;
  return entry.images.reduce((total, image) => {
    if (!image?.src || image.sourceType === 'remote') return total;
    if (Number.isFinite(image.base64Chars)) return total + image.base64Chars;
    const comma = image.src.indexOf(',');
    return total + (comma >= 0 ? image.src.length - comma - 1 : 0);
  }, 0);
}

function evictPreviewImages(entry) {
  if (!Array.isArray(entry?.images)) return;
  entry.images = entry.images.map(image => (
    image?.src && image.sourceType !== 'remote'
      ? {
        oversized: true,
        unavailableReason: 'session_budget',
        sourceType: 'data',
        mediaType: image.mediaType,
        base64Chars: image.base64Chars,
        sizeBytes: image.sizeBytes,
      }
      : image
  ));
}

/** Apply the same FIFO character budget to local and global result indexes. */
export function retainToolResultImagesWithinBudget(state, entries, id, entry) {
  if (!state || !entries || !id || !entry) return;
  const previousChars = state._imageCharsById[id] || 0;
  if (previousChars) {
    state._retainedImageBase64Chars -= previousChars;
    delete state._imageCharsById[id];
    const previousIndex = state._imageEntryIds.indexOf(id);
    if (previousIndex >= 0) state._imageEntryIds.splice(previousIndex, 1);
  }

  const chars = retainedBase64Chars(entry);
  if (chars > 0) {
    state._imageCharsById[id] = chars;
    state._imageEntryIds.push(id);
    state._retainedImageBase64Chars += chars;
  }

  while (state._retainedImageBase64Chars > MAX_RETAINED_TOOL_IMAGE_BASE64_CHARS) {
    const evictId = state._imageEntryIds.shift();
    if (!evictId) break;
    const evictChars = state._imageCharsById[evictId] || 0;
    delete state._imageCharsById[evictId];
    state._retainedImageBase64Chars = Math.max(0, state._retainedImageBase64Chars - evictChars);
    const entry = entries[evictId];
    if (!entry || !Array.isArray(entry.images)) continue;
    evictPreviewImages(entry);
  }
}

/**
 * 增量追加:扫描 requests[startIndex..] 并把新发现的 tool_use / tool_result 累积到 state。
 * 仅写入新出现的 id(`!(id in index)`),原条目幂等,可重复调用同一切片不会引入副作用。
 */
export function appendToGlobalToolResultIndex(state, requests, startIndex) {
  if (!Array.isArray(requests)) return;
  const { index, _useMap } = state;
  for (let i = startIndex; i < requests.length; i++) {
    const r = requests[i];
    if (!r) continue;
    const msgs = r.body?.input;
    if (Array.isArray(msgs)) {
      for (const m of msgs) {
        if (m?.role === 'assistant' && Array.isArray(m.content)) {
          for (const b of m.content) {
            if (b?.type === 'tool_use' && b.id) _useMap[b.id] = b;
          }
        }
      }
    }
    const respContent = r.response?.body?.content;
    if (Array.isArray(respContent)) {
      for (const b of respContent) {
        if (b?.type === 'tool_use' && b.id) _useMap[b.id] = b;
      }
    }
  }
  for (let i = startIndex; i < requests.length; i++) {
    const r = requests[i];
    const msgs = r?.body?.input;
    if (!Array.isArray(msgs)) continue;
    for (const m of msgs) {
      if (m?.role !== 'user' || !Array.isArray(m.content)) continue;
      for (const b of m.content) {
        if (b?.type === 'tool_result' && b.tool_use_id && !(b.tool_use_id in index)) {
          const entry = buildSingleToolResult(b, _useMap[b.tool_use_id]);
          index[b.tool_use_id] = entry;
          retainToolResultImagesWithinBudget(state, index, b.tool_use_id, entry);
        }
      }
    }
  }
}

/**
 * SubAgent / Teammate 渲染入口:组合本地 cachedBuildToolResultMap 与全局索引。
 * globalIndex 由调用方一次性构建(buildGlobalToolResultIndex),所有 entry 共享,
 * 渲染查询 O(1)。
 *
 * 补偿仅覆盖 toolResultMap;readContentMap / editSnapshotMap / latestPlanContent
 * 等辅助 map 不在补偿范围内 —— SubAgent 卡片只渲染 response.content 块，文件快照
 * 等高级展开由 mainAgent 路径消费,与 SubAgent 解耦。
 */
export function buildSubAgentResultMap(req, globalIndex) {
  const localState = cachedBuildToolResultMap(req?.body?.input || EMPTY_MESSAGES);
  const respContent = req?.response?.body?.content;
  if (!Array.isArray(respContent) || !globalIndex) {
    return localState.toolResultMap;
  }
  // filled lazy-alloc 为 null sentinel:无补偿时返回原引用,避免下游 ChatMessage memo 抖动。
  let filled = null;
  for (const b of respContent) {
    if (b?.type === 'tool_use' && b.id && !localState.toolResultMap[b.id] && globalIndex[b.id]) {
      if (!filled) filled = {};
      filled[b.id] = globalIndex[b.id];
    }
  }
  if (!filled) return localState.toolResultMap;
  return { ...localState.toolResultMap, ...filled };
}

export function appendToolResultMap(state, messages, startIndex) {
  const { toolUseMap, toolResultMap, askAnswerMap, planApprovalMap } = state;
  for (let i = startIndex; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_use') {
          let parsed = block;
          if (typeof block.input === 'string') {
            try {
              const cleaned = block.input.replace(/^\[object Object\]/, '');
              parsed = { ...block, input: JSON.parse(cleaned) };
            } catch {}
          }
          toolUseMap[parsed.id] = parsed;
          // Plan tools can carry plan + planFilePath directly.
          // 不依赖前置文件编辑，是 multi-agent-room 等无前置场景的核心数据源
          if (isPlanToolName(parsed.name) && parsed.input && typeof parsed.input === 'object') {
            if (typeof parsed.input.plan === 'string' && parsed.input.plan.trim()) {
              state.latestPlanContent = parsed.input.plan;
              state._planDirty = (state._planDirty || 0) + 1;
            }
            if (typeof parsed.input.planFilePath === 'string' && parsed.input.planFilePath) {
              state.latestPlanFilePath = parsed.input.planFilePath;
            }
          }
        }
      }
    } else if (msg.role === 'user' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          const matchedTool = toolUseMap[block.tool_use_id];
          const entry = buildSingleToolResult(block, matchedTool);
          const { resultText, isPermissionDenied, isUltraplan } = entry;
          toolResultMap[block.tool_use_id] = entry;
          retainToolResultImagesWithinBudget(state, toolResultMap, block.tool_use_id, entry);
          if (matchedTool && isAskToolName(matchedTool.name)) {
            // Codex native function_call_output keys answers by the stable
            // question id. Resolve that id through the matching tool input for
            // the question-text map consumed by ChatMessage. Raw messages stay
            // untouched; only this derived lookup map is enriched.
            const parsed = parseAskAnswerText(resultText, matchedTool.input?.questions);
            // 被拒绝的 request_user_input：分 cancelled / rejected 两类——
            //   - cancelled：cx-viewer 主动取消（Cancel 按钮 / 输入框打字打断）。
            //     structured app-server bridge / sdk-manager.js 注入 reason 时统一加 [cx-viewer:cancel] 前缀
            //     作为协议级 sentinel，前缀匹配比模糊文案匹配稳定（SDK 升级换文案不影响）。
            //   - rejected：schema 校验失败 / hook deny 等"未触达"语义。
            //   ChatMessage 用这两个 sentinel 区分渲染（cancelled 显式带 __cancelReason__ 灰态）。
            if (Object.keys(parsed).length === 0 && isPermissionDenied) {
              const looksCancelled = /\[cx-viewer:cancel\]/.test(resultText);
              if (looksCancelled) {
                // 截掉 [cx-viewer:cancel] 前缀只显示用户可读 reason，再 slice 200 防超长
                const cleanedReason = resultText.replace(/^\s*\[cx-viewer:cancel\]\s*/, '').slice(0, 200);
                askAnswerMap[block.tool_use_id] = { __cancelled__: true, __cancelReason__: cleanedReason };
              } else {
                askAnswerMap[block.tool_use_id] = { __rejected__: true };
              }
            } else {
              askAnswerMap[block.tool_use_id] = parsed;
            }
            state._askDirty = (state._askDirty || 0) + 1;
          }
          if (matchedTool && isPlanToolName(matchedTool.name)) {
            if (isPermissionDenied) {
              const userSaid = resultText.match(/the user said:\s*([\s\S]*)/i);
              planApprovalMap[block.tool_use_id] = {
                status: isUltraplan ? 'ultraplan' : 'rejected',
                feedback: userSaid ? userSaid[1].trim() : '',
              };
            } else {
              planApprovalMap[block.tool_use_id] = parsePlanApproval(resultText);
            }
            state._planDirty = (state._planDirty || 0) + 1;
            // Plan 审批完成（approved/rejected）后无条件重置 latestPlanContent / latestPlanFilePath，
            // 防止下一个 plan 周期显示旧内容。已审批卡片的 V2 plan 渲染由 ChatMessage 的
            // approval.planContent || inp.plan || planFileContents 兜底链承担，不依赖 latestPlanContent。
            state.latestPlanContent = null;
            state.latestPlanFilePath = null;
          }
        }
      }
    }
  }
}

export function buildToolResultMap(messages) {
  const state = createEmptyToolState();
  appendToolResultMap(state, messages, 0);
  return state;
}

export function cachedBuildToolResultMap(messages) {
  let cached = _toolResultCache.get(messages);
  if (!cached) {
    cached = buildToolResultMap(messages);
    _toolResultCache.set(messages, cached);
  }
  return cached;
}

/** 从 plan tool_result 文本中解析审批状态和计划内容 */
export function parsePlanApproval(text) {
  if (!text) return { status: 'pending' };
  if (/User has approved/i.test(text)) {
    const planMatch = text.match(/##\s*Approved Plan:\s*\n([\s\S]*)/i);
    return { status: 'approved', planContent: planMatch ? planMatch[1].trim() : '' };
  }
  if (/User rejected/i.test(text)) {
    const feedbackMatch = text.match(/feedback:\s*(.+)/i) || text.match(/User rejected[^:]*:\s*(.+)/i);
    return { status: 'rejected', feedback: feedbackMatch ? feedbackMatch[1].trim() : '' };
  }
  return { status: 'pending' };
}
