// Wire format 协议详见 docs/WIRE_FORMAT.md（服务端 entry 形态 / 关键字段 / 已知特殊窗口）
import { conversationIdsConflict, getEntryUserId, getMainAgentConversationId, isCompactContinuation, isPostClearCheckpoint, getMainAgentSessionKey } from './clearCheckpoint.js';
import { getEffectiveModelName } from './modelIdentity.js';

/**
 * 计算消息的轻量内容指纹，用于「反向锚点」对齐：以 `newMessages[0]` 的 fp 为锚，
 * 从 `curMsgs` 末尾向头部反向扫，配合多块连续等价校验决定 append / no-op / rebuild。
 *
 * 关键点：
 *  - tool_use / tool_result 用 API 强保证唯一的 id 作主键，永不碰撞。
 *  - text / thinking 用 `length + first32 + last32` 三元组——比单纯 `slice(0, 64)`
 *    抗碰撞强得多（同前缀 `<user_instructions>...` / `<command-name>/...` 不会再误命中），
 *    但仍只触一次字符串切片，比哈希便宜。
 *  - 保持纯函数 / 同步 / 无副作用——`mergeMainAgentSessions` 在流式热路径每条 SSE 都会调用。
 */
export function messageFingerprint(msg) {
  // 异常隔离：用户提供的 msg.content 可能含恶意 getter（`{ get text() { throw } }`），
  // 整段 try-catch 让单条 entry 异常不级联污染整个流式合并路径。返回空串作"匿名 fp"，
  // 调用方 findReverseAnchor 看到 !fp0 || endsWith('|empty') 会拒当锚点，安全 fallback。
  try {
    if (!msg || !msg.role) return '';
    const c = msg.content;
    if (typeof c === 'string') return `${msg.role}|s|${c.length}|${c.slice(0, 32)}|${c.slice(-32)}`;
    if (!Array.isArray(c) || c.length === 0) return `${msg.role}|empty`;
    const blocks = c.map((b) => {
      if (!b || typeof b !== 'object') return 'unknown';
      if (b.type === 'tool_use') return `tu:${b.id || ''}:${b.name || ''}:${valueFingerprint(b.input)}`;
      if (b.type === 'tool_result') return `tr:${b.tool_use_id || ''}:${b.is_error ? 1 : 0}:${valueFingerprint(b.content)}`;
      if (b.type === 'text') {
        const t = b.text || '';
        return `t:${t.length}:${t.slice(0, 32)}:${t.slice(-32)}`;
      }
      if (b.type === 'thinking') {
        const t = b.thinking || '';
        return `th:${t.length}:${t.slice(0, 32)}:${t.slice(-32)}`;
      }
      return `${b.type || 'unknown'}:${valueFingerprint(b)}`;
    });
    return `${msg.role}|${blocks.join(';')}`;
  } catch {
    return '';
  }
}

function valueFingerprint(value) {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (!text) return '';
    return `${text.length}:${text.slice(0, 32)}:${text.slice(-32)}`;
  } catch {
    return '';
  }
}

/**
 * 反向锚点搜索：在 `curMsgs` 中从末尾向头部找一个位置 p，使得
 * `newMessages[0..L]` 的 fp 与 `curMsgs[p..p+L]` 的 fp **逐条**等价，
 * 其中 L = min(newLen, curLen - p)。返回最右（即最贴近末尾）的命中。
 *
 * 设计选择：
 *  - 反向扫起点为 `curLen - 1`，因为流式 / Plan Mode 窗口的真锚点几乎都贴近末尾，
 *    反向首个 fp0 命中即真锚点的概率最高，避免命中靠前的 fp 碰撞误锚点。
 *  - 多块连续等价校验：fp 加固后单条碰撞已罕见，多块连续碰撞概率近 0。
 *  - 复杂度：单候选 O(L)，最坏 O(curLen·newLen)，典型 K<200。
 *  - **fp 双向缓存**：newFps + curFpsCache 都缓存，让反向扫多候选场景下同一 curMsgs[p]
 *    只算一次 fp（perf-security review P2，长 session 5000+/s SSE 路径节省 ~50% fp 调用）。
 *
 * @param {Array} newMsgs - 新消息数组
 * @param {Array} curMsgs - 累积消息数组
 * @param {Array<string>} [newFps] - 预计算的 newMsgs fp 数组缓存
 * @param {Array<string>} [sharedCurFpsCache] - 调用方共享的 curMsgs fp 懒缓存（anchor miss 后
 *   等长分支的对位比较可复用，避免对同一 curMsgs 重算 fp）
 * @returns {{anchorIdx: number, overlapLen: number} | null}
 */
function findReverseAnchor(newMsgs, curMsgs, newFps, sharedCurFpsCache) {
  const newLen = newMsgs.length;
  const curLen = curMsgs ? curMsgs.length : 0;
  if (newLen === 0 || curLen === 0) return null;
  const fp0 = newFps ? newFps[0] : messageFingerprint(newMsgs[0]);
  // 空内容 fp 不当锚点：role|empty 在 curMsgs 多处可能命中（连续多条空 content 消息），
  // 反向扫到第一个 role|empty 会误锚到错误位置，导致 overlapLen 计算偏差。
  // 若 newMsgs[0..N-1] 是"newMsgs[0] 空 + 后续有效"的混合序列：放弃以 newMsgs[0] 为锚点，
  // 由调用方 fallback 路径（newLen<curLen → rebuild / newLen===curLen → 等长内容感知 /
  // newLen>curLen → push tail）兜底；这条防线保的是"全 empty 新序列误复用旧 curMsgs 末尾"。
  if (!fp0 || fp0.endsWith('|empty')) return null;
  // curMsgs fp 懒缓存：sparse Array 仅记录被访问过的位置，避免上来就 map 整段长 session
  // （curLen 可能 > 5000，但实际访问命中的 p 通常 < 50 个）。
  const curFpsCache = sharedCurFpsCache || new Array(curLen);
  const curFpAt = (idx) => {
    let v = curFpsCache[idx];
    if (v === undefined) {
      v = messageFingerprint(curMsgs[idx]);
      curFpsCache[idx] = v;
    }
    return v;
  };
  for (let p = curLen - 1; p >= 0; p--) {
    if (curFpAt(p) !== fp0) continue;
    const overlapLen = Math.min(newLen, curLen - p);
    let ok = true;
    for (let i = 1; i < overlapLen; i++) {
      // 边界安全：i < overlapLen ≤ newLen ≤ newFps.length，必不越界（newFps 在调用处
      // 用 newMessages.map 整体生成）。这里 newFps 仅作命中加速缓存，传入与否语义等价。
      const newFpI = newFps ? newFps[i] : messageFingerprint(newMsgs[i]);
      if (newFpI !== curFpAt(p + i)) {
        ok = false; break;
      }
    }
    if (ok) return { anchorIdx: p, overlapLen };
    // 验证失败（fp 加固后罕见）→ 继续向左找下一候选；curFpsCache 让重叠候选区域复用 fp。
  }
  return null;
}

/**
 * merge 入口守卫（KEEP IN SYNC: server/lib/delta-reconstructor.js 标记写入点）：
 * 重建层标记的脏条目不得进入 mainAgentSessions 合并——
 *  - `_staleReorder`：完成序倒置的乱序条目（内容已被更新条目取代）；
 *  - `_reconstructBroken`：重建结果与 _totalMessageCount 不符且无法修复（拼接会翻倍/错位）；
 *  - 旧版批量路径额外跳过 `inProgress`：孤立占位条目的 body.input 是裸 delta 切片
 *    （批量 reconstructEntries 不为 inProgress 重建全量），merge 会触发 rebuild 截断。
 *    V2 冷启动投影是例外：descriptor 的 input revision 已由 reducer 完整解析，进行中
 *    winner 里已经持久化的工具调用/结果必须立即进入对话，不能等下一 completed commit。
 *    SSE 实时路径不拦 inProgress——watcher 增量重建器已为其拼出全量 input，
 *    无 live-port 配置下"提问气泡请求时即显示"依赖这一行为。
 * AppBase 的 SSE 与批量两个 merge 入口、以及单测共用此谓词，防三处逻辑漂移。
 *
 * @param {object} entry
 * @param {object} [options]
 * @param {boolean} [options.batch=false] - 批量（强刷/历史加载）路径
 * @param {boolean} [options.allowMaterializedInProgress=false] - 允许已完整物化的 V2 进行中快照
 * @returns {boolean} true = 该条目不应参与 session 合并
 */
export function isMergeBlockedEntry(entry, options = {}) {
  if (!entry) return true;
  if (entry._staleReorder || entry._reconstructBroken) return true;
  if (options.batch && entry.inProgress && !options.allowMaterializedInProgress) return true;
  return false;
}

/**
 * Cold-ingest guard shared by AppBase and tests.  `_v2Descriptor` is attached
 * only after the V2 reducer has resolved the complete input revision; legacy
 * V1 in-progress delta slices therefore remain blocked.
 */
export function isColdIngestMergeBlockedEntry(entry) {
  return isMergeBlockedEntry(entry, {
    batch: true,
    allowMaterializedInProgress: !!entry?._v2Descriptor,
  });
}

/**
 * 增量合并 mainAgent sessions。
 *
 * 核心算法：反向锚点对齐。以 `newMessages[0]` 为锚点，从 `lastSession.messages` 末尾
 * 反向扫；命中后多块连续 fp 等价校验。三种结果：
 *  - 命中且 overlapLen === newLen：流式 no-op / suffix subset，messages 引用稳定（保 WeakMap 缓存）。
 *  - 命中且 overlapLen <  newLen：push `newMessages[overlapLen..]`，引用稳定。
 *  - 未命中：newLen<curLen → rebuild（/compact summary）；newLen===curLen → 整段 append（Plan Mode 全新片段）；
 *           newLen>curLen → 严格前缀扩展语义（push tail），fp 加固后真正存在重叠的窗口必被 anchor 命中。
 *
 * 顶部守卫（isPostClearCheckpoint / userId / transient filter）维持 1.6.245 行为不变。
 *
 * @param {Array} prevSessions
 * @param {object} entry
 * @param {object} [options]
 * @param {boolean} [options.skipTransientFilter=false] - SSE 实时追加路径设为 true。
 * @returns {Array}
 */
export function mergeMainAgentSessions(prevSessions, entry, options = {}) {
  const newMessages = entry.body.input;
  const newResponse = entry.response;
  const userId = getEntryUserId(entry);
  const sessionKey = getMainAgentSessionKey(entry);
  const sessionId = entry._sessionId || null;
  const conversationId = getMainAgentConversationId(entry);
  const modelName = getEffectiveModelName(entry);
  const v2Seq = Number.isSafeInteger(entry?._v2Descriptor?.seq)
    ? entry._v2Descriptor.seq
    : null;

  const entryTimestamp = entry.timestamp || null;

  if (prevSessions.length === 0) {
    return [{ userId, sessionKey, sessionId, conversationId, modelName, messages: newMessages, response: newResponse, entryTimestamp, _lastV2Seq: v2Seq }];
  }

  const lastSession = prevSessions[prevSessions.length - 1];
  const differentSessionKey = !!(sessionKey && lastSession.sessionKey && sessionKey !== lastSession.sessionKey);
  const differentSessionId = !!(sessionId && lastSession.sessionId && sessionId !== lastSession.sessionId);
  const differentConversationId = conversationIdsConflict(lastSession.conversationId, conversationId);
  const differentUser = !!(userId && lastSession.userId && userId !== lastSession.userId);

  const prevMsgCount = lastSession.messages ? lastSession.messages.length : 0;
  // Stateful Codex normalization deliberately projects a small overlap window
  // instead of the complete cumulative transcript. Treating that physical
  // window length as the conversation length makes a long, user-id-less
  // session look like a new short session; partial -> final revisions then get
  // appended as authoritative duplicates until the next request rebuilds it.
  // Boundary inference must use the logical count, while the merge algorithm
  // below must keep using the physical window length for anchor/tail offsets.
  const stampedConversationCount = entry._conversationMessageCount;
  const logicalNewLen = Number.isInteger(stampedConversationCount) && stampedConversationCount >= 0
    ? stampedConversationCount
    : newMessages.length;
  const compactLike = entry._compactContinuation === true || isCompactContinuation(entry);
  const isNewConversation = !compactLike
    && prevMsgCount > 0
    && logicalNewLen < prevMsgCount * 0.5
    && (prevMsgCount - logicalNewLen) > 4;
  const sameUser = userId !== null && userId === lastSession.userId;
  const canMergeByUser = sameUser || (userId === lastSession.userId && !isNewConversation);

  // /clear 后的首个 checkpoint：始终是新会话起点。
  // 同 device 下 sameUser 永远 true，否则会被下面的 same-session 分支吞掉；
  // 也不能被 transient 过滤掉（即便 newMessages.length === 1）。
  if (isPostClearCheckpoint(entry, prevMsgCount)) {
    for (let i = 0; i < newMessages.length; i++) {
      if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
    }
    return [...prevSessions, { userId, sessionKey, sessionId, conversationId, modelName, messages: newMessages, response: newResponse, entryTimestamp, _lastV2Seq: v2Seq }];
  }

  // User identity is an authorization boundary, not a transient-history hint.
  // Establish the new lane before the short-history filter can discard the
  // first frame from another account on a reused thread id.
  if (differentUser || differentConversationId || differentSessionId || differentSessionKey) {
    for (let i = 0; i < newMessages.length; i++) {
      if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
    }
    return [...prevSessions, { userId, sessionKey, sessionId, conversationId, modelName, messages: newMessages, response: newResponse, entryTimestamp, _lastV2Seq: v2Seq }];
  }

  // A native Responses `compaction` is an authoritative transcript rewrite.
  // Its raw protocol input may remain a cumulative prefix, so size/drop
  // heuristics cannot reliably distinguish it from an ordinary delta. Consume
  // the normalizer's explicit signal before transient filtering and anchoring.
  // User identity remains a hard boundary: a marker cannot replace another
  // account's visible session merely because transport ids are incomplete.
  if (entry._authoritativeConversationReplace === true) {
    for (let i = 0; i < newMessages.length; i++) {
      if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
    }
    lastSession.messages = newMessages;
    lastSession.response = newResponse;
    lastSession.entryTimestamp = entryTimestamp;
    if (v2Seq !== null) lastSession._lastV2Seq = v2Seq;
    if (modelName) lastSession.modelName = modelName;
    if (sessionKey && !lastSession.sessionKey) lastSession.sessionKey = sessionKey;
    if (sessionId && !lastSession.sessionId) lastSession.sessionId = sessionId;
    if (conversationId && !lastSession.conversationId) lastSession.conversationId = conversationId;
    return [...prevSessions];
  }

  // A stateful projection carries an explicit logical splice position. Consume
  // that protocol before the generic length/anchor heuristics: a two-message
  // physical window can represent the tail of a 200-message conversation, not
  // a compact or a new Plan window. Replacing exactly that suffix makes
  // partial/final revisions idempotent even if an asynchronous side lane made
  // the optional `_inPlaceReplaceDetected` hint unavailable.
  const conversationWindowStart = entry._conversationWindowStart;
  const trustedProjectionWindow = entry._codexConversationProjection === true
    && entry._codexConversationDelta === true;
  const hasCompleteProjectionWindow = trustedProjectionWindow
    && Number.isInteger(conversationWindowStart)
    && conversationWindowStart > 0
    && conversationWindowStart <= prevMsgCount
    && logicalNewLen === conversationWindowStart + newMessages.length
    && canMergeByUser;
  if (hasCompleteProjectionWindow) {
    // A completed newer turn owns the longer logical transcript. A delayed
    // older tail revision must not splice it away (P2 committed before a late
    // P1-final is a normal completion-order race under parallel agents).
    if (logicalNewLen < prevMsgCount) return prevSessions;
    const lastV2Seq = Number.isSafeInteger(lastSession._lastV2Seq)
      ? lastSession._lastV2Seq
      : null;
    const incomingTime = Date.parse(entryTimestamp);
    const currentTime = Date.parse(lastSession.entryTimestamp);
    const isOlderSameLengthRevision = logicalNewLen === prevMsgCount && (
      (v2Seq !== null && lastV2Seq !== null && v2Seq <= lastV2Seq)
      || (Number.isFinite(incomingTime) && Number.isFinite(currentTime) && incomingTime < currentTime)
    );
    if (isOlderSameLengthRevision) return prevSessions;
    for (let i = 0; i < newMessages.length; i++) {
      if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
    }
    lastSession.messages = [
      ...lastSession.messages.slice(0, conversationWindowStart),
      ...newMessages,
    ];
    lastSession.response = newResponse;
    lastSession.entryTimestamp = entryTimestamp;
    if (v2Seq !== null) lastSession._lastV2Seq = v2Seq;
    if (modelName) lastSession.modelName = modelName;
    if (sessionKey && !lastSession.sessionKey) lastSession.sessionKey = sessionKey;
    if (sessionId && !lastSession.sessionId) lastSession.sessionId = sessionId;
    if (conversationId && !lastSession.conversationId) lastSession.conversationId = conversationId;
    return [...prevSessions];
  }

  if (!options.skipTransientFilter && isNewConversation && newMessages.length <= 4 && prevMsgCount > 4) {
    return prevSessions;
  }

  if (canMergeByUser) {
    const curLen = prevMsgCount;
    const newLen = newMessages.length;
    if (!lastSession.messages) lastSession.messages = [];

    // Stateful Codex projection detected an equal-length streaming update of
    // the final assistant message (commonly partial → finalized tool args).
    // Batch reload does not run AppBase's live in-place helper, so consume the
    // signal here as well instead of treating the changed fingerprint as a new
    // Plan-style window and appending a duplicate transcript.
    if (entry._inPlaceReplaceDetected === true && newLen === curLen && newLen >= 2) {
      const replacement = newMessages[newLen - 1];
      if (!replacement._timestamp) replacement._timestamp = entryTimestamp;
      lastSession.messages = [...lastSession.messages.slice(0, -1), replacement];
      lastSession.response = newResponse;
      lastSession.entryTimestamp = entryTimestamp;
      if (v2Seq !== null) lastSession._lastV2Seq = v2Seq;
      if (modelName) lastSession.modelName = modelName;
      if (sessionKey && !lastSession.sessionKey) lastSession.sessionKey = sessionKey;
      if (sessionId && !lastSession.sessionId) lastSession.sessionId = sessionId;
      if (conversationId && !lastSession.conversationId) lastSession.conversationId = conversationId;
      return [...prevSessions];
    }

    // fp 缓存：预算 newMessages 的 fp 数组一次，传给 findReverseAnchor 避免多块连续校验
    // 时反复调用 messageFingerprint（流式 5000+ 次/秒 SSE 路径节省 25-100ms 累计延迟）。
    // curFpsCache 与 findReverseAnchor 共享：anchor miss 时等长分支的对位比较直接复用
    // 反向扫已经算过的 curMsgs fp，零重复计算。
    const newFps = newLen > 0 ? newMessages.map(messageFingerprint) : null;
    const curFpsCache = new Array(curLen);
    const anchor = findReverseAnchor(newMessages, lastSession.messages, newFps, curFpsCache);

    if (anchor) {
      const tailStart = anchor.overlapLen;
      // tailStart === newLen：流式 no-op / suffix subset，messages 引用不动。
      if (tailStart < newLen) {
        for (let i = tailStart; i < newLen; i++) {
          if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
          lastSession.messages.push(newMessages[i]);
        }
      }
    } else if (newLen < curLen) {
      // /compact summary 等真重建：替换 messages 引用。
      for (let i = 0; i < newLen; i++) {
        if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
      }
      lastSession.messages = newMessages;
    } else if (newLen === curLen) {
      // 等长且 anchor 未命中：两种形态必须区分（docs/WIRE_FORMAT.md §3.1 / §3.7）——
      // (a) Plan Mode 全新短窗口：内容与累积历史无关，整段 append 保留历史；
      // (b) 同会话近似拷贝：末位原地替换 / 中段编辑，但服务端信号缺失（完成序倒置让无信号
      //     的 stale checkpoint 后落盘、或旧日志无信号）。此形态整段 append 会让对话翻倍
      //     （mainAgent 整段重复 bug 的翻倍终点），必须替换。
      let aligned = 0;
      // 严格多数（非简单 plurality）：对位 fp 相等数 ≥ floor(N/2)+1 才判近似拷贝→替换。
      // 近似拷贝逐位几乎全等；Plan Mode 新窗口对位相等 ≈ 0。取严格多数是替换误判的
      // 安全边界——N=2→需 2 条全等、N=3→2、N=4→3；宁可对"一半相同"的模糊形态保守
      // append（残余形态：末位短暂陈旧），也不冒错杀新窗口历史的风险。调阈值前先想清
      // 反例：近拷贝带 1 条中段编辑（N=2 时 1/2 不足多数 → append → 翻倍回归）。
      const STRICT_MAJORITY = Math.floor(newLen / 2) + 1;
      for (let i = 0; i < newLen && aligned < STRICT_MAJORITY; i++) {
        let cfp = curFpsCache[i];
        if (cfp === undefined) {
          cfp = messageFingerprint(lastSession.messages[i]);
          curFpsCache[i] = cfp;
        }
        if (newFps[i] === cfp) aligned++;
      }
      if (aligned >= STRICT_MAJORITY) {
        // 近似拷贝 → 整段替换（等价于无信号版 in-place replace）。
        // 引用更换会使 ChatView WeakMap 渲染缓存失效一次性重渲染，预期内。
        for (let i = 0; i < newLen; i++) {
          if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
        }
        lastSession.messages = newMessages;
      } else {
        // Plan Mode 2-msg 全替换窗口，整段 append。
        for (let i = 0; i < newLen; i++) {
          if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
          lastSession.messages.push(newMessages[i]);
        }
      }
    } else {
      // newLen > curLen 且 anchor (单点 newMsgs[0]) 未命中：保守回退至"严格前缀扩展"语义——
      // 只 push newMessages[curLen..]。fp 加固后真正存在重叠的窗口必被 anchor 命中走上面分支；
      // 这里 anchor 未命中意味着确实无重叠（罕见，仅艺测/再快照场景），保留旧推 tail 行为防回归。
      for (let i = curLen; i < newLen; i++) {
        if (!newMessages[i]._timestamp) newMessages[i]._timestamp = entryTimestamp;
        lastSession.messages.push(newMessages[i]);
      }
    }

    lastSession.response = newResponse;
    lastSession.entryTimestamp = entryTimestamp;
    if (v2Seq !== null) lastSession._lastV2Seq = v2Seq;
    // Model-less transport/checkpoint frames must not erase the last
    // authoritative identity known for this logical session.
    if (modelName) lastSession.modelName = modelName;
    if (sessionKey && !lastSession.sessionKey) lastSession.sessionKey = sessionKey;
    if (sessionId && !lastSession.sessionId) lastSession.sessionId = sessionId;
    if (conversationId && !lastSession.conversationId) lastSession.conversationId = conversationId;
    return [...prevSessions];
  } else {
    return [...prevSessions, { userId, sessionKey, sessionId, conversationId, modelName, messages: newMessages, response: newResponse, entryTimestamp, _lastV2Seq: v2Seq }];
  }
}
