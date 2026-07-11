import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeMessagesPending,
  getPlanApprovalForToolUse,
  isNonInteractivePlanTool,
} from '../src/components/chat/interactionOwnership.js';

test('interaction ownership treats Codex turn plans as non-interactive update_plan cards', () => {
  const messages = [{
    role: 'assistant',
    content: [{
      type: 'tool_use',
      id: 'codex-turn-plan:1',
      name: 'update_plan',
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

  const planBlock = messages[0].content[0];
  assert.equal(isNonInteractivePlanTool(planBlock), true);
  assert.deepEqual(
    getPlanApprovalForToolUse(planBlock, { 'codex-turn-plan:1': { status: 'pending' } }),
    { status: 'approved', planContent: '- Inspect code' }
  );
});
