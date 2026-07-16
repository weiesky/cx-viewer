import test from 'node:test';
import assert from 'node:assert/strict';

import { PtyPromptController, PTY_BUFFER_MAX } from '../src/components/chat/controllers/ptyPromptController.js';

function createController(initialState = {}) {
  let state = { ptyPrompt: null, pendingPermission: null, pendingPtyPlan: null, permissionQueue: [], ...initialState };
  const controller = new PtyPromptController({
    getState: () => state,
    setState: (update) => {
      state = typeof update === 'function' ? { ...state, ...update(state) } : { ...state, ...update };
    },
    isAskSubmitting: () => false,
    scrollToBottom: () => {},
    now: () => 1,
  });
  return { controller, getState: () => state };
}

test('terminal recovery snapshot replaces prompt-detector history instead of appending it', () => {
  const { controller } = createController();
  controller.appendData('stale prompt bytes');
  controller.replaceSnapshot('x'.repeat(PTY_BUFFER_MAX * 2) + 'CURRENT');

  assert.equal(controller.getBuffer().includes('stale prompt bytes'), false);
  assert.equal(controller.getBuffer().endsWith('CURRENT'), true);
  assert.ok(controller.getBuffer().length <= PTY_BUFFER_MAX);
  controller.dispose();
});

test('new PTY stream clears prompt detector state', () => {
  const { controller, getState } = createController({
    pendingPermission: { id: 'old-pty', source: 'pty' },
    pendingPtyPlan: { id: 'old-plan' },
    ptyPromptHistory: [{ id: 'old-active', status: 'active' }, { id: 'done', status: 'resolved' }],
  });
  controller.appendData('old stream');
  controller.setCurrent({ question: 'old', options: ['yes'] });
  controller.resetStream();

  assert.equal(controller.getBuffer(), '');
  assert.equal(controller.getCurrent(), null);
  assert.equal(getState().ptyPrompt, null);
  assert.equal(getState().pendingPermission, null);
  assert.equal(getState().pendingPtyPlan, null);
  assert.deepEqual(getState().ptyPromptHistory.map(item => item.status), ['dismissed', 'resolved']);
  controller.dispose();
});
