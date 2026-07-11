import { isAskToolName, isPlanToolName } from '../../utils/toolNameAliases.js';

/**
 * Interaction-state helpers for ask/plan approval cards.
 *
 * The helpers keep ChatView's message-side pending scan and incremental-cache
 * healing consistent, so exactly one normal message bubble owns a pending
 * request_user_input / update_plan interaction.
 *
 * Pure functions over plain data — no React/antd/i18n imports, statically
 * loadable under node:test. React element cache write-backs stay in ChatView.
 *
 * Deliberate asymmetry callers must respect: the messages-side scan and
 * ask-heal use MERGED maps (JSONL + local optimistic answers), while plan-heal
 * uses the RAW session planApprovalMap. Parameter names keep them apart.
 */

export function isNonInteractivePlanTool(block) {
  return !!(block?.input?.codexTurnPlan || block?.input?.nonInteractive);
}

export function getPlanApprovalForToolUse(block, planApprovalMap) {
  if (isPlanToolName(block?.name) && isNonInteractivePlanTool(block)) {
    const plan = typeof block.input?.plan === 'string' ? block.input.plan : '';
    return { status: 'approved', planContent: plan };
  }
  return (planApprovalMap || {})[block?.id] || { status: 'pending' };
}

/**
 * Messages-side pending scan. Only tools in the LAST non-empty assistant
 * message can be pending: once a later assistant message exists, any earlier
 * plan/ask must already have been handled (Codex cannot continue the turn
 * otherwise) — treating older ones as pending made every historical plan
 * re-open its modal forever (non-interactive plan cards have no tool_result, so their
 * planApprovalMap entry stays undefined).
 *
 * ownerIdx values are RAW message indices (the render loop compares them
 * against its own `mi`), locking the pending id to exactly one bubble even
 * when streaming repeats the same toolId across incrementally-pushed messages.
 *
 * @param planApprovalMap MERGED plan-approval map
 * @param askAnswerMap    MERGED ask-answer map (JSONL + local optimistic)
 */
export function computeMessagesPending({ messages, planApprovalMap, askAnswerMap }) {
  let lastPendingAskId = null;
  let lastPendingPlanId = null;
  let askOwnerIdx = -1;
  let planOwnerIdx = -1;
  let lastAssistantIdx = -1;
  const msgs = messages || [];
  for (let mi = msgs.length - 1; mi >= 0; mi--) {
    const m = msgs[mi];
    if (m && m.role === 'assistant' && Array.isArray(m.content) && m.content.length > 0) {
      lastAssistantIdx = mi;
      break;
    }
  }
  if (lastAssistantIdx >= 0) {
    for (const block of msgs[lastAssistantIdx].content) {
      if (block.type === 'tool_use' && isPlanToolName(block.name)) {
        if (isNonInteractivePlanTool(block)) continue;
        const approval = (planApprovalMap || {})[block.id];
        if (!approval || approval.status === 'pending') {
          lastPendingPlanId = block.id;
          planOwnerIdx = lastAssistantIdx;
        }
      }
      if (block.type === 'tool_use' && isAskToolName(block.name)) {
        const answers = (askAnswerMap || {})[block.id];
        if (!answers || Object.keys(answers).length === 0) {
          lastPendingAskId = block.id;
          askOwnerIdx = lastAssistantIdx;
        }
      }
    }
  }
  return { lastPendingAskId, lastPendingPlanId, askOwnerIdx, planOwnerIdx };
}

/**
 * Incremental session-cache heal: the new segment produced no pending ids, but
 * the cached ones may still be unresolved — keep them, or the approval modal
 * flickers closed and re-opens between streaming increments. A cached id whose
 * approval/answer has since landed is dropped.
 *
 * Asymmetry (see module header): plan checks the RAW sessionPlanApprovalMap,
 * ask checks the MERGED answer map.
 */
export function healStalePendingIds({ resultAskId, resultPlanId, prevAskId, prevPlanId, sessionPlanApprovalMap, mergedAskAnswerMap }) {
  let lastPendingAskId = resultAskId;
  let lastPendingPlanId = resultPlanId;
  if (!lastPendingPlanId && prevPlanId) {
    const prevPlanApproval = (sessionPlanApprovalMap || {})[prevPlanId];
    if (!prevPlanApproval || prevPlanApproval.status === 'pending') {
      lastPendingPlanId = prevPlanId;
    }
  }
  if (!lastPendingAskId && prevAskId) {
    const prevAns = (mergedAskAnswerMap || {})[prevAskId];
    if (!prevAns || Object.keys(prevAns).length === 0) {
      lastPendingAskId = prevAskId;
    }
  }
  return { lastPendingAskId, lastPendingPlanId };
}
