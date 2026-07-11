/**
 * Delta Reconstructor — 增量日志重建模块
 *
 * 将 delta 格式的日志条目重建为完整的 input 数组。
 * 仅处理 mainAgent 条目，teammate/全量条目直接跳过。
 *
 * 提供三种 API：
 * - reconstructEntries(entries): 批量重建，用于 readLogFile() 和 readLocalLog()
 * - reconstructSegment(segment, nextCheckpoint): 段级重建，用于流式分段处理
 * - createIncrementalReconstructor(): 有状态的增量重建器，用于 watcher 逐条重建
 */

/**
 * 判断一个条目是否为 checkpoint（应重置累积状态）。
 * 三种情况视为 checkpoint：
 * 1. 无 _deltaFormat 字段 → 全量条目
 * 2. _isCheckpoint === true → 显式 checkpoint
 * 3. _totalMessageCount === body.input.length → 隐式 checkpoint（delta 长度 === 总长度）
 */
export function isCheckpointEntry(entry) {
  // 无 _deltaFormat：全量条目
  if (!entry._deltaFormat) return true;
  // 显式 checkpoint
  if (entry._isCheckpoint) return true;
  // 隐式 checkpoint：delta 长度等于总长度
  const msgs = entry.body?.input;
  if (Array.isArray(msgs) && entry._totalMessageCount === msgs.length) return true;
  return false;
}

/**
 * 判断一个条目是否为需要重建的 delta 条目（mainAgent + _deltaFormat）。
 */
export function isDeltaEntry(entry) {
  return entry._deltaFormat && entry.mainAgent;
}

function getDeltaConversationId(entry) {
  return entry?._conversationId || 'mainAgent';
}

function getAccumulated(map, entry) {
  return map.get(getDeltaConversationId(entry)) || [];
}

function setAccumulated(map, entry, messages) {
  map.set(getDeltaConversationId(entry), Array.isArray(messages) ? [...messages] : []);
}

/**
 * 批量重建 — 用于 readLogFile() 和 readLocalLog()。
 * 输入已去重的条目数组，输出重建后的条目数组（原地修改 body.input）。
 * 非 mainAgent delta 条目不受影响。
 *
 * @param {Array} entries - 已去重、按时间顺序排列的条目数组
 * @returns {Array} 重建后的条目数组（同一引用，原地修改）
 */
export function reconstructEntries(entries) {
  // 第一遍：正向重建
  const accumulatedByConversation = new Map(); // conversationId → mainAgent input items
  const broken = [];    // 记录重建失败的条目索引（用于第二遍补偿）

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // 跳过 inProgress 条目：孤立的 inProgress（请求超时未完成）在 dedup 后残留，
    // 其 delta 与后续 completed 条目重复，双重累积会导致 accumulated 偏移
    // （与 createIncrementalReconstructor line 209 保持一致）
    if (entry.inProgress) continue;
    if (!isDeltaEntry(entry)) {
      // 非 delta 条目（全量 / teammate）：如果是 mainAgent 全量条目，重置累积状态
      if (entry.mainAgent && Array.isArray(entry.body?.input)) {
        setAccumulated(accumulatedByConversation, entry, entry.body.input);
      }
      continue;
    }

    // delta 条目处理
    const msgs = entry.body?.input;
    if (!Array.isArray(msgs)) continue;

    if (isCheckpointEntry(entry)) {
      // checkpoint：用当前 input 重置累积状态
      setAccumulated(accumulatedByConversation, entry, msgs);
    } else {
      // delta：拼接到累积数组
      let accumulated = getAccumulated(accumulatedByConversation, entry);
      accumulated = [...accumulated, ...msgs];
      // 挂载重建后的完整 input（checkpoint/全量条目保持不变）
      entry.body.input = accumulated;
      setAccumulated(accumulatedByConversation, entry, accumulated);
      if (entry._totalMessageCount && accumulated.length !== entry._totalMessageCount) {
        broken.push(i);
      }
    }
  }

  // 第二遍：补偿修复 — 用后续最近的 checkpoint 回填断裂的条目
  if (broken.length > 0) {
    _compensateBrokenEntries(entries, broken);
  }

  return entries;
}

/**
 * 补偿修复：对断裂的 delta 条目，从后续最近的 checkpoint 中提取完整 input 回填。
 * checkpoint 包含截至该点的完整历史，可以据此反推之前条目的 input。
 */
function _compensateBrokenEntries(entries, brokenIndices) {
  for (const brokenIdx of brokenIndices) {
    const brokenEntry = entries[brokenIdx];
    const brokenConversationId = getDeltaConversationId(brokenEntry);
    const expectedCount = brokenEntry._totalMessageCount;
    if (!expectedCount) continue;

    // 向后查找最近的 checkpoint 或全量条目
    for (let j = brokenIdx + 1; j < entries.length; j++) {
      const candidate = entries[j];
      if (!candidate.mainAgent || !Array.isArray(candidate.body?.input)) continue;
      if (getDeltaConversationId(candidate) !== brokenConversationId) continue;

      const candidateMsgs = candidate.body.input;
      const candidateTotal = candidate._totalMessageCount || candidateMsgs.length;

      // 候选条目必须是 checkpoint/全量格式且包含足够的 input
      const isFullEntry = !candidate._deltaFormat || isCheckpointEntry(candidate);
      if (isFullEntry && candidateTotal >= expectedCount) {
        // 从完整 input 中截取前 expectedCount 条作为补偿
        brokenEntry.body.input = candidateMsgs.slice(0, expectedCount);
        break;
      }
    }
  }
}

/**
 * 段级重建 — 用于流式分段处理。
 * 对一个 checkpoint 边界内的段进行正向重建，如有 broken 条目则用 nextCheckpoint 反向修复。
 * 段内条目数通常 ≤ CHECKPOINT_INTERVAL(10)，内存开销可控。
 *
 * @param {Array} segment - 段内条目数组（段首应为 checkpoint/全量条目）
 * @param {object|null} nextCheckpoint - 下一个 checkpoint 条目（用于反向修复），最后一段可为 null
 * @returns {Array} 重建后的段条目数组（原地修改）
 */
export function reconstructSegment(segment, nextCheckpoint) {
  const accumulatedByConversation = new Map();
  const broken = [];

  for (let i = 0; i < segment.length; i++) {
    const entry = segment[i];
    if (entry.inProgress) continue;
    if (!isDeltaEntry(entry)) {
      if (entry.mainAgent && Array.isArray(entry.body?.input)) {
        setAccumulated(accumulatedByConversation, entry, entry.body.input);
      }
      continue;
    }

    const msgs = entry.body?.input;
    if (!Array.isArray(msgs)) continue;

    if (isCheckpointEntry(entry)) {
      setAccumulated(accumulatedByConversation, entry, msgs);
    } else {
      let accumulated = getAccumulated(accumulatedByConversation, entry);
      accumulated = [...accumulated, ...msgs];
      entry.body.input = accumulated;
      setAccumulated(accumulatedByConversation, entry, accumulated);
      if (entry._totalMessageCount && accumulated.length !== entry._totalMessageCount) {
        broken.push(i);
      }
    }
  }

  // 补偿修复：先在段内向后查找，再用 nextCheckpoint
  if (broken.length > 0) {
    for (const brokenIdx of broken) {
      const brokenEntry = segment[brokenIdx];
      const brokenConversationId = getDeltaConversationId(brokenEntry);
      const expectedCount = brokenEntry._totalMessageCount;
      if (!expectedCount) continue;

      let repaired = false;
      // 段内向后查找
      for (let j = brokenIdx + 1; j < segment.length; j++) {
        const candidate = segment[j];
        if (!candidate.mainAgent || !Array.isArray(candidate.body?.input)) continue;
        if (getDeltaConversationId(candidate) !== brokenConversationId) continue;
        const candidateMsgs = candidate.body.input;
        const candidateTotal = candidate._totalMessageCount || candidateMsgs.length;
        const isFullEntry = !candidate._deltaFormat || isCheckpointEntry(candidate);
        if (isFullEntry && candidateTotal >= expectedCount) {
          brokenEntry.body.input = candidateMsgs.slice(0, expectedCount);
          repaired = true;
          break;
        }
      }
      // 段内未找到，用 nextCheckpoint 修复
      if (!repaired && nextCheckpoint && getDeltaConversationId(nextCheckpoint) === brokenConversationId) {
        const cpMsgs = nextCheckpoint.body?.input;
        const cpTotal = nextCheckpoint._totalMessageCount || cpMsgs?.length || 0;
        if (Array.isArray(cpMsgs) && cpTotal >= expectedCount) {
          brokenEntry.body.input = cpMsgs.slice(0, expectedCount);
        }
      }
    }
  }

  return segment;
}

/**
 * 创建有状态的增量重建器 — 用于 watcher 逐条重建。
 * 每次调用 reconstruct(entry) 处理一条新条目。
 *
 * @returns {{ reconstruct: (entry: object) => object }}
 */
export function createIncrementalReconstructor() {
  const accumulatedByConversation = new Map(); // conversationId → mainAgent input items

  return {
    /**
     * 重建单条条目。
     * - 非 delta 条目：如果是 mainAgent 全量格式，更新累积状态，原样返回
     * - checkpoint：重置累积状态，原样返回
     * - delta：拼接重建，修改 body.input 后返回
     *
     * @param {object} entry - 单条日志条目
     * @returns {object} 重建后的条目（同一引用）
     */
    reconstruct(entry) {
      // inProgress 条目：用 accumulated 副本重建 input，但不更新 accumulated 本身。
      // 这样客户端收到完整 input（避免 delta 闪烁），
      // 而后续 completed 条目仍能基于正确的 accumulated 重建。
      if (entry.inProgress) {
        if (isDeltaEntry(entry) && !isCheckpointEntry(entry)) {
          const msgs = entry.body?.input;
          if (Array.isArray(msgs)) {
            const accumulated = getAccumulated(accumulatedByConversation, entry);
            entry.body.input = [...accumulated, ...msgs];
          }
        }
        return entry;
      }

      if (!isDeltaEntry(entry)) {
        // 非 delta 条目：如果是 mainAgent 全量格式，更新累积状态
        if (entry.mainAgent && Array.isArray(entry.body?.input)) {
          setAccumulated(accumulatedByConversation, entry, entry.body.input);
        }
        return entry;
      }

      const msgs = entry.body?.input;
      if (!Array.isArray(msgs)) return entry;

      if (isCheckpointEntry(entry)) {
        // checkpoint：重置累积状态
        setAccumulated(accumulatedByConversation, entry, msgs);
      } else {
        // delta：拼接
        let accumulated = getAccumulated(accumulatedByConversation, entry);
        accumulated = [...accumulated, ...msgs];
        entry.body.input = accumulated;
        setAccumulated(accumulatedByConversation, entry, accumulated);
      }

      return entry;
    },

    /**
     * 重置累积状态（用于 full_reload 等场景）。
     */
    reset() {
      accumulatedByConversation.clear();
    }
  };
}
