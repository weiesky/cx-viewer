/**
 * Entry Slim — 流式接收剪枝模块
 *
 * 每条 MainAgent entry 包含累积的完整 input，
 * 480MB 文件 JSON.parse 后在浏览器中膨胀到 ~1.2GB → OOM。
 *
 * 核心机制：同 session 内只保留最新一条 MainAgent 的完整 input，
 * 前一条立即释放。被剪枝的 entry 记录 _fullEntryIndex 供按需还原。
 *
 * 该方案由 Claude Code 旧格式的 body.messages 迁移而来，现在只处理 body.input：
 * - body.instructions / body.tools 不裁剪、不池化；
 * - body.metadata / body.tool_choice 等其他字段也保持原样；
 * - 只对 MainAgent 生效，SubAgent / Teammate / 其他请求完全不改写。
 *
 * 导出：
 * - createEntrySlimmer(isMainAgentFn): 批量剪枝器（历史日志加载，process + finalize）
 * - createIncrementalSlimmer(isMainAgentFn): 增量剪枝器（实时 SSE,无需 finalize）
 * - restoreSlimmedEntry(entry, requests): 按需还原被剪枝的 entry
 */

// input 内 tool_result block.content 走 readResultPool 同一池化逻辑。
// 这是原 messages 方案的一部分，随累积数组迁移到 input；调用入口会先做
// MainAgent 判定，避免改写 SubAgent / Teammate 的原始报文。
// internToolResultIfPooled 的命中信号是 lazy-clone 决策的关键：JS string === 是值比较，
// 普通 internToolResult 返回的 ref 无法用于 ref-不变性判断。
import { internToolResultIfPooled } from './readResultPool.js';
import { classifySessionTransition, conversationIdsConflict, getMainAgentConversationId, isCompactContinuation, getMainAgentSessionKey, isPostClearCheckpoint } from './clearCheckpoint.js';
import { extractDirectContextCompaction } from './contextCompaction.js';
import { getResponseToolDeclaration } from '../../lib/openai-body.js';

function getEntryToolSnapshot(entry) {
  const direct = getResponseToolDeclaration(entry?.body);
  if (direct.declared) return direct;
  if (Array.isArray(entry?._loadedTools)) return { declared: true, tools: entry._loadedTools };
  return { declared: false, tools: [] };
}

// Current Responses requests may keep `additional_tools` inside body.input.
// When a later delta omits that declaration, move the latest declaration onto
// the new session anchor before the previous input is slimmed. Only the newest
// anchor keeps this internal snapshot, so stability does not multiply tool
// schemas across the whole log.
function inheritToolSnapshot(entry, previousEntry) {
  const direct = getResponseToolDeclaration(entry?.body);
  if (direct.declared) {
    if (Object.prototype.hasOwnProperty.call(entry, '_loadedTools')) delete entry._loadedTools;
    return;
  }
  const snapshot = getEntryToolSnapshot(previousEntry);
  if (snapshot.declared) entry._loadedTools = snapshot.tools;
}

/** Carry a rolling snapshot through an in-progress → final dedup replacement. */
export function inheritToolSnapshotOnDedup(previousEntry, nextEntry) {
  if (!previousEntry || !nextEntry) return nextEntry;
  const direct = getResponseToolDeclaration(nextEntry.body);
  if (direct.declared || Array.isArray(nextEntry._loadedTools)) return nextEntry;
  if (previousEntry._sessionId != null && nextEntry._sessionId != null
      && previousEntry._sessionId !== nextEntry._sessionId) return nextEntry;
  const previousConversation = getMainAgentConversationId(previousEntry);
  const nextConversation = getMainAgentConversationId(nextEntry);
  if (previousConversation && nextConversation && previousConversation !== nextConversation) return nextEntry;
  const previousKey = getMainAgentSessionKey(previousEntry);
  const nextKey = getMainAgentSessionKey(nextEntry);
  if (previousKey && nextKey && previousKey !== nextKey) return nextEntry;
  const snapshot = getEntryToolSnapshot(previousEntry);
  if (snapshot.declared) nextEntry._loadedTools = snapshot.tools;
  return nextEntry;
}

/**
 * 把 input[*].content[*] 中的 tool_result block.content 字符串替换为 readResultPool
 * 共享引用。仅处理 string 形态的 content（minority array/object 形态原样透传）。
 *
 * 设计要点：
 * - lazy clone：只在至少有一个 block 命中 pool 替换时才 clone input / content / block。
 *   未命中场景零开销，原数组直接返回。
 * - 浅 clone（{...block}）保留 _timestamp 等顶层字段；不冻结 input 数组——
 *   AppBase.jsx 会在 input item 上补 `_timestamp`。
 * - tool_result.content 字符串本身不可变（JS string primitive），多个 entry 共享 pool ref
 *   完全安全。
 *
 * @param {Array} input
 * @returns {Array} 原数组（无变化）或浅 clone 后的新数组
 */
export function internInputToolResultBlocks(input) {
  if (!Array.isArray(input) || input.length === 0) return input;

  let newInput = null;
  for (let i = 0; i < input.length; i++) {
    const msg = input[i];
    const content = msg?.content;
    if (!Array.isArray(content) || content.length === 0) continue;

    let newContent = null;
    for (let j = 0; j < content.length; j++) {
      const block = content[j];
      if (!block || block.type !== 'tool_result') continue;
      const c = block.content;
      // 仅 dedup string 形态。array 形态（含 text/image blocks）少见且结构复杂，留待后续。
      if (typeof c !== 'string') continue;
      // pooled = null 时为未命中（已注册到 pool 但调用方无需替换 ref——block 已持原始 ref，
      // 且原始 ref 也是 pool 持有的 ref，零浪费）；pooled 非 null 时是命中，原始 c 是独立分配
      // 副本，必须替换为 pool ref 才能让原副本可被 GC 回收。
      const pooled = internToolResultIfPooled(c);
      if (pooled !== null) {
        if (newContent === null) newContent = content.slice();
        newContent[j] = { ...block, content: pooled };
      }
    }

    if (newContent !== null) {
      if (newInput === null) newInput = input.slice();
      newInput[i] = { ...msg, content: newContent };
    }
  }

  return newInput || input;
}

/**
 * 对 MainAgent 的 body.input 应用 input 内部去重。
 * 在 entry 进入 state.requests 之前调用，所有路径（SSE flush / batch load /
 * IndexedDB cached restore）都应过一遍此函数。
 *
 * 返回新 entry 对象（如果 body 字段被替换）或原 entry（无变化时）。
 *
 * @param {object} entry
 * @param {Function} isMainAgentFn - (entry) => boolean
 * @returns {object}
 */
export function internMainAgentInput(entry, isMainAgentFn) {
  if (!entry?.body || typeof isMainAgentFn !== 'function' || !isMainAgentFn(entry)) return entry;
  const body = entry.body;
  if (!Array.isArray(body.input) || body.input.length === 0) return entry;
  const input = internInputToolResultBlocks(body.input);
  if (input !== body.input) return { ...entry, body: { ...body, input } };
  return entry;
}

/**
 * 仅清空 body.input，返回**新 body 对象**（不 mutate 原 body）。
 * 调用方拿到新 body 后需自行赋值给 entry，例如 `entry.body = slimBodyInput(entry.body)`
 * （批量路径）或在 clone 中嵌入（增量路径，避免 React 渲染中间态）。
 * Export 仅用于单元测试；运行时调用方应使用 createEntrySlimmer / createIncrementalSlimmer。
 *
 * @param {object} body
 * @returns {object} 新 body 对象
 */
export function slimBodyInput(body) {
  if (!body) return body;
  return { ...body, input: [] };
}

/**
 * 创建流式剪枝器。
 *
 * 在 load_chunk 中对每条 entry 调用 process()，
 * 在 load_end 中调用 finalize() 设置 _fullEntryIndex。
 *
 * @param {Function} isMainAgentFn - (entry) => boolean
 * @returns {{ process, finalize }}
 */
export function createEntrySlimmer(isMainAgentFn) {
  let prevMainIdx = -1;
  let prevMsgCount = 0;
  let prevUserId = null;
  let prevSessionKey = null;
  let prevConversationId = null;

  return {
    /**
     * 处理一条新 entry。
     * 副作用：可能剪枝 entries[prevMainIdx] 的 input。
     *
     * @param {object} entry - 新接收的 entry
     * @param {Array} entries - 已累积的 entries 数组
     * @param {number} currentIdx - 当前 entry 将存入的索引
     * @returns {object} entry（原样返回）
     */
    process(entry, entries, currentIdx) {
      if (!isMainAgentFn(entry)) return entry;
      if (!entry.body || !Array.isArray(entry.body.input) || entry.body.input.length === 0) return entry;

      const count = entry.body.input.length;
      const userId = entry.body.metadata?.user_id || null;
      const sessionKey = getMainAgentSessionKey(entry);
      const conversationId = getMainAgentConversationId(entry);

      // Preserve the /compact-continuation signal BEFORE this entry can be slimmed
      // by a later one: once body.input is emptied, isCompactContinuation() can
      // no longer see the summary input[0], and isSessionBoundary (clearCheckpoint.js)
      // would misread the big count drop as a new-terminal session on batch reload.
      entry._compactContinuation = isCompactContinuation(entry);

      // session 边界检测（同 mergeMainAgentSessions）
      // KEEP IN SYNC (semantics): isSessionBoundary in clearCheckpoint.js is the
      // shared predicate for session segmentation. This copy intentionally stays
      // divergent (no compact exclusion): if the slimmer treated a /compact
      // continuation as same-session, the pre-compact entry would be slimmed with
      // _fullEntryIndex pointing at the shorter compact entry, and
      // restoreSlimmedEntry's guard (fullEntry.input.length < _messageCount)
      // would permanently fail to restore it.
      const transition = classifySessionTransition(entry, {
        prevCount: prevMsgCount,
        count,
        prevUserId,
        userId,
        prevSessionKey,
        sessionKey,
        prevConversationId,
        conversationId,
      }, { splitCompactHistoryDrop: true });
      const isNewSession = transition.isBoundary;

      // 瞬态请求过滤（阈值与 App.jsx _flushPendingEntries 保持一致：>4）
      if (transition.isTransient) return entry;

      if (isNewSession) {
        prevMainIdx = currentIdx;
        prevMsgCount = count;
        prevUserId = userId;
        prevSessionKey = sessionKey || null;
        prevConversationId = conversationId || null;
        return entry;
      }

      inheritToolSnapshot(entry, prevMainIdx >= 0 ? entries[prevMainIdx] : null);

      // 同 session：只剪枝前一条 MainAgent 的 input
      if (prevMainIdx >= 0 && prevMainIdx < entries.length) {
        const prev = entries[prevMainIdx];
        if (prev.body?.input?.length > 0) {
          const pCount = prev.body.input.length;
          const contextCompaction = extractDirectContextCompaction(prev);
          const postClearCheckpoint = isPostClearCheckpoint(prev, Number.MAX_SAFE_INTEGER);
          prev._messageCount = pCount;
          prev._slimmed = true;
          if (contextCompaction.present) prev._contextCompaction = contextCompaction;
          if (postClearCheckpoint) prev._postClearCheckpoint = true;
          if (Object.prototype.hasOwnProperty.call(prev, '_loadedTools')) delete prev._loadedTools;
          // 批量路径：原代码就是 in-place mutate prev.body.input = []，
          // 这里同样 in-place 替换 body.input。entries 数组在 _batchSlim 阶段
          // 还未传给 React，无渲染中间态风险。
          prev.body = slimBodyInput(prev.body);
        }
      }

      prevMainIdx = currentIdx;
      prevMsgCount = count;
      prevUserId = userId;
      prevSessionKey = sessionKey || null;
      prevConversationId = conversationId || null;
      return entry;
    },

    /**
     * 流结束后调用：为所有被剪枝的 entry 设置 _fullEntryIndex。
     * @param {Array} entries
     */
    finalize(entries) {
      // 正向扫描每个 session，找到最后一条有完整 input 的 MainAgent
      let sessionSlimmed = []; // 当前 session 内被剪枝的 entry 索引
      let currentFullIdx = -1;
      let pCount = 0;
      let pUserId = null;
      let pSessionKey = null;
      let pConversationId = null;

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const isSlimmed = e._slimmed;
        const hasMsgs = e.body?.input?.length > 0;

        // 跳过非 MainAgent
        if (!isSlimmed && !hasMsgs) continue;
        if (!isSlimmed && !isMainAgentFn(e)) continue;

        const count = e._messageCount || e.body?.input?.length || 0;
        const userId = e.body?.metadata?.user_id || null;
        const sessionKey = getMainAgentSessionKey(e);
        const conversationId = getMainAgentConversationId(e);

        // KEEP IN SYNC (semantics): intentionally divergent from isSessionBoundary
        // (clearCheckpoint.js) — see the comment on the process() predicate above.
        const transition = classifySessionTransition(e, {
          prevCount: pCount,
          count,
          prevUserId: pUserId,
          userId,
          prevSessionKey: pSessionKey,
          sessionKey,
          prevConversationId: pConversationId,
          conversationId,
        }, { splitCompactHistoryDrop: true });
        const isNew = transition.isBoundary;
        if (transition.isTransient) continue;

        if (isNew) {
          // 上一个 session 结束：回填 _fullEntryIndex
          for (const idx of sessionSlimmed) {
            entries[idx]._fullEntryIndex = currentFullIdx;
          }
          sessionSlimmed = [];
          currentFullIdx = -1;
          pCount = 0;
          pSessionKey = null;
          pConversationId = null;
        }

        if (isSlimmed) {
          sessionSlimmed.push(i);
        }
        if (hasMsgs || !isSlimmed) {
          currentFullIdx = i;
        }
        pCount = count;
        pUserId = userId;
        pSessionKey = sessionKey || null;
        pConversationId = conversationId || null;
      }

      // 最后一个 session
      for (const idx of sessionSlimmed) {
        entries[idx]._fullEntryIndex = currentFullIdx;
      }
    }
  };
}

/**
 * 按需还原被剪枝的 entry 的 input（不修改原始 entry）。
 *
 * @param {object} entry - 被剪枝的 entry（_slimmed === true）
 * @param {Array} requests - state.requests 数组
 * @returns {object} 还原后的 entry（新对象）或原样返回
 */
export function restoreSlimmedEntry(entry, requests) {
  if (!entry._slimmed || !Number.isSafeInteger(entry._fullEntryIndex)) return entry;
  const entryIndex = Array.isArray(requests) ? requests.indexOf(entry) : -1;
  if (entry._fullEntryIndex < 0 || entry._fullEntryIndex >= requests.length
      || (entryIndex >= 0 && entry._fullEntryIndex <= entryIndex)) return entry;
  const fullEntry = requests[entry._fullEntryIndex];
  if (!fullEntry?.body?.input) return entry;
  if (entry.mainAgent === true && fullEntry.mainAgent === false) return entry;
  if (entry._sessionId != null && fullEntry._sessionId != null
      && entry._sessionId !== fullEntry._sessionId) return entry;
  if (conversationIdsConflict(getMainAgentConversationId(entry), getMainAgentConversationId(fullEntry))) return entry;
  const entryKey = getMainAgentSessionKey(entry);
  const fullKey = getMainAgentSessionKey(fullEntry);
  if (entryKey && fullKey && entryKey !== fullKey) return entry;
  if (fullEntry.body.input.length < entry._messageCount) return entry;
  // input 是唯一被降级的字段；entry.body 的其他字段必须保留该请求原值。
  // input 是累积量：fullEntry 的 input 前缀 slice 即本 entry 的原始 input。
  return {
    ...entry,
    _slimmed: false,
    _fullEntryIndex: undefined,
    body: {
      ...entry.body,
      input: fullEntry.body.input.slice(0, entry._messageCount),
    },
  };
}

/**
 * 创建增量剪枝器（实时 SSE 链路）。
 *
 * 与批量剪枝器的区别：无需 finalize，每条 MainAgent entry 到达时
 * 立即 slim 上一条并设置 _fullEntryIndex 指向当前 entry。
 *
 * 在 _flushPendingEntries 的 new entry 路径（requests.push）中调用 processEntry；
 * 在 dedup 路径（requests[existingIndex] = entry）中调用 onDedup。
 *
 * @param {Function} isMainAgentFn - (entry) => boolean
 * @returns {{ processEntry, onDedup }}
 */
export function createIncrementalSlimmer(isMainAgentFn) {
  let prevMainIdx = -1;
  let prevMsgCount = 0;
  let prevUserId = null;
  let prevSessionKey = null;
  let prevConversationId = null;
  const sessionSlimmedIndices = new Set();

  return {
    /**
     * 处理一条新 entry（仅在 new entry 路径调用，dedup 路径不调用）。
     * 副作用：可能剪枝 requests[prevMainIdx] 的 input，并更新所有已剪枝 entry 的 _fullEntryIndex。
     *
     * @param {object} entry - 新到达的 entry
     * @param {Array} requests - state.requests 数组（slim 前的快照）
     * @param {number} currentIdx - entry 将存入的索引（= requests.length）
     * @returns {object} entry（原样返回）
     */
    processEntry(entry, requests, currentIdx) {
      if (!isMainAgentFn(entry)) return entry;
      if (!entry.body?.input?.length) return entry;

      const count = entry.body.input.length;
      const userId = entry.body.metadata?.user_id || null;
      const sessionKey = getMainAgentSessionKey(entry);
      const conversationId = getMainAgentConversationId(entry);

      // Preserve the /compact-continuation signal before slimming — same rationale
      // as createEntrySlimmer.process(): incrementally-slimmed entries can be
      // re-ingested by the batch pipeline on a warm-cache reconnect, where
      // isSessionBoundary needs this flag because input is gone.
      entry._compactContinuation = isCompactContinuation(entry);

      // session 边界检测（与 batch slimmer / mergeMainAgentSessions 一致）
      // KEEP IN SYNC (semantics): intentionally divergent from isSessionBoundary
      // (clearCheckpoint.js) — see the comment on createEntrySlimmer.process().
      const transition = classifySessionTransition(entry, {
        prevCount: prevMsgCount,
        count,
        prevUserId,
        userId,
        prevSessionKey,
        sessionKey,
        prevConversationId,
        conversationId,
      }, { splitCompactHistoryDrop: true });
      const isNewSession = transition.isBoundary;

      // 瞬态请求过滤（阈值与 App.jsx _flushPendingEntries 保持一致：>4）
      if (transition.isTransient) return entry;

      if (isNewSession) {
        sessionSlimmedIndices.clear();
        prevMainIdx = currentIdx;
        prevMsgCount = count;
        prevUserId = userId;
        prevSessionKey = sessionKey || null;
        prevConversationId = conversationId || null;
        return entry;
      }

      inheritToolSnapshot(entry, prevMainIdx >= 0 ? requests[prevMainIdx] : null);

      // 前向 slim：剪枝上一条 MainAgent 的 input 与 body 大字段
      // 注意：必须 clone entry 再修改，不能 in-place mutate。
      // requests 数组是 [...prev.requests] 浅拷贝，元素仍与 React 上一次 state 共享引用，
      // 直接 mutate 会导致 React 渲染中途看到 input=[] 的中间态，引起对话闪烁。
      if (prevMainIdx >= 0 && prevMainIdx < requests.length) {
        const orig = requests[prevMainIdx];
        if (orig.body?.input?.length > 0) {
          const contextCompaction = extractDirectContextCompaction(orig);
          const postClearCheckpoint = isPostClearCheckpoint(orig, Number.MAX_SAFE_INTEGER);
          const { _loadedTools: _discardedToolSnapshot, ...origWithoutToolSnapshot } = orig;
          const cloned = {
            ...origWithoutToolSnapshot,
            body: slimBodyInput(orig.body),
            _messageCount: orig.body.input.length,
            _slimmed: true,
            _fullEntryIndex: currentIdx,
            ...(contextCompaction.present ? { _contextCompaction: contextCompaction } : {}),
            ...(postClearCheckpoint ? { _postClearCheckpoint: true } : {}),
          };
          requests[prevMainIdx] = cloned;
          sessionSlimmedIndices.add(prevMainIdx);
        }
      }

      // 全量回填：更新本 session 内所有已剪枝 entries 的 _fullEntryIndex
      // 同样需要 clone，避免 mutate React state 中的共享引用
      for (const idx of sessionSlimmedIndices) {
        if (requests[idx]._fullEntryIndex !== currentIdx) {
          requests[idx] = { ...requests[idx], _fullEntryIndex: currentIdx };
        }
      }

      prevMainIdx = currentIdx;
      prevMsgCount = count;
      prevUserId = userId;
      prevSessionKey = sessionKey || null;
      prevConversationId = conversationId || null;
      return entry;
    },

    /**
     * dedup 替换时调用：从 sessionSlimmedIndices 移除被替换的索引，
     * 防止全量回填时污染非 slimmed entry。
     *
     * @param {number} existingIndex - 被 dedup 替换的索引
     */
    onDedup(existingIndex) {
      sessionSlimmedIndices.delete(existingIndex);
    },
  };
}
