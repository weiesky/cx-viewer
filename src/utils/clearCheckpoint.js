/**
 * 检测一个 mainAgent entry 是否是 /clear 之后的首个 checkpoint。
 *
 * 单独抽成无依赖的模块（不引 contentFilter，避免 node --test 走 bare import 失败）。
 *
 * 必要条件三选三：
 *   1. entry._isCheckpoint === true（delta 重建器认为这是一个完整快照）
 *   2. body.messages.length 比 prevMessageCount 小（真正"缩短"，排除增量再快照）
 *   3. msg[0] 是 user 消息且含 `<command-name>/clear</command-name>` 标记
 *
 * 用于 _processEntries / sessionMerge 区分真实 /clear 起点 vs 普通 /compact 缩短。
 * /compact 的 msg[0] 是 summary，没有 /clear 标记，自然返回 false。
 *
 * @param {object} entry
 * @param {number} [prevMessageCount=0]
 * @returns {boolean}
 */
export function isPostClearCheckpoint(entry, prevMessageCount = 0) {
  if (!entry || entry._isCheckpoint !== true) return false;
  const msgs = entry.body && entry.body.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return false;
  if (prevMessageCount > 0 && msgs.length >= prevMessageCount) return false;
  const m0 = msgs[0];
  if (!m0 || m0.role !== 'user' || !Array.isArray(m0.content)) return false;
  for (let i = 0; i < m0.content.length; i++) {
    const block = m0.content[i];
    if (block && block.type === 'text' && typeof block.text === 'string' &&
        block.text.indexOf('<command-name>/clear</command-name>') !== -1) {
      return true;
    }
  }
  return false;
}

// /compact 摘要续写检测：CLI 在 /compact（手动或自动 auto-compact）后，把整段历史压成一条
// summary 作为新 msg[0] 重新起流。其 msg[0] 是 CLI 合成的 summary/continuation prompt，
// 匹配下面两种固定开头之一（与 contentFilter.js 的 Compact 合成 prompt 判据同源，此处内联
// 一份纯正则以保持本模块零依赖，可被 node --test 直接 bare import）。
//
// 用途：区分「大幅缩短的 mainAgent checkpoint」到底是——
//   (a) /compact 续写：msg[0] 命中本判据 → 属【同一会话延续】，不应触发新会话切换；
//   (b) 全新终端会话：msg[0] 是用户真实首个输入 → 不命中 → 属【新会话起点】。
// 在同机器多终端场景下 user_id（device_id+account_uuid）完全相同，无法据此区分会话，
// 故本判据是「大幅缩短」信号下把 /compact 和真·新会话拆开的唯一可靠依据。
const COMPACT_SUMMARY_RE = /^(Your task is to create a detailed summary of the conversation|This session is being continued from a previous conversation)/i;
export function isCompactContinuation(entry) {
  const msgs = entry && entry.body && entry.body.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return false;
  const m0 = msgs[0];
  if (!m0 || m0.role !== 'user') return false;
  let text = '';
  if (typeof m0.content === 'string') {
    text = m0.content;
  } else if (Array.isArray(m0.content)) {
    for (let i = 0; i < m0.content.length; i++) {
      const block = m0.content[i];
      if (block && block.type === 'text' && typeof block.text === 'string') {
        text += block.text;
      }
    }
  }
  return COMPACT_SUMMARY_RE.test(text.trimStart());
}

/**
 * Shared session-boundary predicate — the single source of truth for "does this
 * mainAgent entry start a NEW logical session?", used by BOTH the batch path
 * (applyBatchEntryTimestamps → _processOneEntry) and the live SSE path
 * (_flushPendingEntries). Keeping the two paths on one predicate guarantees the
 * session segmentation (and thus each session's stable id = messages[0]._timestamp)
 * is identical live and after a reload, which the "only show current session"
 * pin depends on.
 *
 * Rules:
 *   1. Post-/clear checkpoint → always a boundary (bypasses everything else).
 *   2. Big message-count drop (count < 50% of prev AND drop > 4) → boundary,
 *      UNLESS the entry is a /compact continuation. Slimmed entries have
 *      body.messages emptied, so isCompactContinuation() can no longer see the
 *      summary — the slimmer stamps `entry._compactContinuation` beforehand
 *      (entry-slim.js) and we trust that flag here.
 *   3. user_id change with an established previous session (prevCount > 0) →
 *      boundary (different device/account writing into the same log).
 *
 * KEEP IN SYNC: the bigDrop formula (rule 2, minus the compact exclusion) is
 * mirrored in entry-slim.js's three slimmer predicates (process/finalize/
 * incremental), which stay intentionally divergent for restore-guard reasons —
 * tune the 0.5 ratio or the >4 drop threshold in all four places together.
 *
 * @param {object} entry - mainAgent entry (may be _slimmed)
 * @param {object} ctx
 * @param {number} ctx.prevCount - message count accumulated before this entry
 * @param {number} ctx.count - this entry's message count
 * @param {string|null} ctx.prevUserId - user_id of the previous entry/session
 * @param {string|null} ctx.userId - this entry's user_id
 * @returns {boolean}
 */
export function isSessionBoundary(entry, { prevCount, count, prevUserId, userId }) {
  if (isPostClearCheckpoint(entry, prevCount)) return true;
  const bigDrop = prevCount > 0 && count < prevCount * 0.5 && (prevCount - count) > 4;
  const compactLike = (entry && entry._compactContinuation === true) || isCompactContinuation(entry);
  if (bigDrop && !compactLike) return true;
  if (prevCount > 0 && prevUserId && userId && userId !== prevUserId) return true;
  return false;
}
