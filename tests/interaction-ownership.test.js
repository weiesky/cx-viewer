import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeMessagesPending,
  computeLrOwnership,
  filterLrContent,
  getPlanApprovalForToolUse,
  isNonInteractivePlanTool,
} from '../src/components/chat/interactionOwnership.js';

test('interaction ownership treats Codex turn plans as non-interactive plan cards', () => {
  const messages = [{
    role: 'assistant',
    content: [{
      type: 'tool_use',
      id: 'codex-turn-plan:1',
      name: 'ExitPlanMode',
      input: {
        plan: '- Inspect code',
        codexTurnPlan: true,
        nonInteractive: true,
      },
    }],
  }];

  const pending = computeMessagesPending({
    messages,
    planApprovalMap: {},
    askAnswerMap: {},
  });

  assert.equal(pending.lastPendingPlanId, null);
  assert.equal(pending.planOwnerIdx, -1);

  const lr = computeLrOwnership({
    isLastSession: true,
    respContent: messages[0].content,
    messages: [],
    mergedAskAnswerMap: {},
    localAskAnswers: {},
    sessionPlanApprovalMap: {},
    cliMode: true,
  });

  assert.equal(lr.respLastPendingPlanId, null);
  assert.equal(lr.lrWillOwnPlan, false);
  assert.equal(lr.hasInteractiveBlock, true);

  const lrContent = filterLrContent(messages[0].content, new Set(), new Set());
  assert.equal(lrContent.length, 1);
  assert.equal(lrContent[0].id, 'codex-turn-plan:1');

  const planBlock = messages[0].content[0];
  assert.equal(isNonInteractivePlanTool(planBlock), true);
  assert.deepEqual(
    getPlanApprovalForToolUse(planBlock, { 'codex-turn-plan:1': { status: 'pending' } }),
    { status: 'approved', planContent: '- Inspect code' }
  );
});
