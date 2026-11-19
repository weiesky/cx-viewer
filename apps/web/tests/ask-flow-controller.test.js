import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AskFlowController,
  buildResolvedAskAnswerMap,
  buildStructuredAskAnswers,
} from '../src/components/chat/controllers/askFlowController.js';

test('structured ask answers use Codex question ids and preserve multi-select values', () => {
  const questions = [
    {
      id: 'deploy',
      question: 'Deploy now?',
      options: [{ label: 'Yes' }, { label: 'No' }],
    },
    {
      id: 'targets',
      question: 'Targets?',
      options: [{ label: 'Web' }, { label: 'API' }, { label: 'Worker' }],
    },
    { id: 'note', question: 'Anything else?', options: [] },
  ];

  assert.deepEqual(buildStructuredAskAnswers([
    { questionIndex: 0, type: 'single', optionIndex: 0 },
    { questionIndex: 1, type: 'multi', selectedIndices: [0, 2] },
    { questionIndex: 2, type: 'other', text: 'Ship carefully' },
  ], questions), {
    hookAnswers: {
      'Deploy now?': 'Yes',
      'Targets?': 'Web, Worker',
      'Anything else?': 'Ship carefully',
    },
    codexAnswers: {
      deploy: { answers: ['Yes'] },
      targets: { answers: ['Web', 'Worker'] },
      note: { answers: ['Ship carefully'] },
    },
  });
});

test('structured ask answers tolerate stale indexes without inventing Codex ids', () => {
  assert.deepEqual(buildStructuredAskAnswers([
    { questionIndex: 0, type: 'single', optionIndex: 4 },
    { questionIndex: 3, type: 'other', text: 'ignored' },
  ], [{ question: 'Legacy question', options: [{ label: 'Only' }] }]), {
    hookAnswers: { 'Legacy question': '' },
    codexAnswers: {},
  });
});

test('resolved answer payloads project back to question text', () => {
  const questions = [{ id: 'choice', question: 'Proceed?', options: [{ label: 'Yes' }] }];
  assert.deepEqual(buildResolvedAskAnswerMap(questions, {}, {
    choice: { answers: ['Yes'] },
  }), { 'Proceed?': 'Yes' });
});

function controllerHost(initialState) {
  let state = initialState;
  return {
    getState: () => state,
    setState(update) {
      const patch = typeof update === 'function' ? update(state) : update;
      if (patch) state = { ...state, ...patch };
    },
    state: () => state,
  };
}

test('resolved and timeout events fill the transcript item card before clearing pending', () => {
  const questions = [{ id: 'choice', question: 'Proceed?', options: [{ label: 'Yes' }] }];
  for (const event of [
    { type: 'ask-hook-resolved', answers: { 'Proceed?': 'Yes' } },
    { type: 'ask-hook-timeout', codexAnswers: { choice: { answers: ['Yes'] } } },
  ]) {
    const host = controllerHost({
      pendingAsk: { id: 'transport-id', itemId: 'tool-item-id', questions },
      askQueue: [],
      askMetaMap: {
        'transport-id': { startedAt: 1, timeoutMs: 2 },
        'tool-item-id': { startedAt: 1, timeoutMs: 2 },
      },
      localAskAnswers: {},
    });
    const controller = new AskFlowController(host);
    assert.equal(controller.handleWsMessage({
      ...event,
      id: 'transport-id',
      itemId: 'tool-item-id',
      questions,
    }), true);
    assert.deepEqual(host.state().localAskAnswers, {
      'tool-item-id': { 'Proceed?': 'Yes' },
    });
    assert.equal(host.state().pendingAsk, null);
    assert.deepEqual(host.state().askMetaMap, {});
  }
});

test('submitting without a global WebSocket indexes the answer by every app-server alias', () => {
  const questions = [{
    id: 'choice',
    question: 'Proceed?',
    options: [{ label: 'Yes' }, { label: 'No' }],
  }];
  const sent = [];
  const host = controllerHost({
    pendingAsk: { id: 'transport-id', itemId: 'app-server-item-id', questions },
    askQueue: [],
    askMetaMap: {},
    localAskAnswers: {},
    ptyPromptHistory: [],
  });
  Object.assign(host, {
    getProps: () => ({ sdkMode: false }),
    ws: () => ({
      readyState: 1,
      send(payload) { sent.push(JSON.parse(payload)); },
    }),
    setCurrentPtyPrompt() {},
    clearPtyDebounce() {},
  });

  const originalWebSocket = globalThis.WebSocket;
  try {
    delete globalThis.WebSocket;
    const controller = new AskFlowController(host);
    controller.handleAskQuestionSubmit(
      [{ questionIndex: 0, type: 'single', optionIndex: 0 }],
      'rendered-tool-card-id',
      questions,
    );
  } finally {
    if (originalWebSocket === undefined) delete globalThis.WebSocket;
    else globalThis.WebSocket = originalWebSocket;
  }

  const expected = { 'Proceed?': 'Yes' };
  assert.deepEqual(host.state().localAskAnswers, {
    'rendered-tool-card-id': expected,
    'app-server-item-id': expected,
    'transport-id': expected,
  });
  assert.deepEqual(sent, [{
    type: 'ask-hook-answer',
    id: 'transport-id',
    answers: { 'Proceed?': 'Yes' },
    codexAnswers: { choice: { answers: ['Yes'] } },
  }]);
});

function sequentialHarness() {
  const basePrompt = {
    question: 'Proceed?',
    options: [
      { number: 1, selected: true },
      { number: 2, selected: false },
    ],
  };
  let state = {
    ptyPrompt: basePrompt,
    ptyPromptHistory: [{ ...basePrompt, status: 'active' }],
    pendingAsk: null,
    localAskAnswers: {},
  };
  let currentPrompt = basePrompt;
  let unmounted = false;
  const sent = [];
  const handlers = new Set();
  const timers = [];
  const warnings = [];

  const host = {
    getState: () => state,
    setState(update) {
      const patch = typeof update === 'function' ? update(state) : update;
      if (patch) state = { ...state, ...patch };
    },
    ctxIsOpen: () => true,
    ctxSend(message) {
      sent.push(message);
      return true;
    },
    addMessageHandler(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    getCurrentPtyPrompt: () => currentPrompt,
    setCurrentPtyPrompt: (value) => { currentPrompt = value; },
    clearPtyDebounce() {},
    isUnmounted: () => unmounted,
    warnSubmitRetry: (reason) => warnings.push(reason),
    setTimeout(callback, ms) {
      const timer = { callback, ms, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      timer.cleared = true;
    },
  };

  const controller = new AskFlowController(host);
  const prepareOptimisticSubmit = (id) => {
    const prompt = {
      ...basePrompt,
      question: `Proceed ${id}?`,
      options: basePrompt.options.map(option => ({ ...option })),
    };
    currentPrompt = prompt;
    state = {
      ...state,
      ptyPrompt: prompt,
      ptyPromptHistory: [...state.ptyPromptHistory, { ...prompt, status: 'active' }],
      pendingAsk: null,
      localAskAnswers: {
        ...state.localAskAnswers,
        [id]: { [prompt.question]: 'Yes' },
      },
    };
    controller._askSubmitting = true;
    controller._askAnswerQueue = [];
    controller._lastClearedPendingAsk = { id: `pending-${id}` };
    controller._lastAskSubmitIds = [id];
    controller._submitViaSequentialQueueInternal({
      type: 'single', optionIndex: 0, isLast: true,
    }, {}, 1);
    return controller._sequentialOperation;
  };

  return {
    controller,
    host,
    sent,
    handlers,
    timers,
    warnings,
    state: () => state,
    setUnmounted: value => { unmounted = value; },
    prepareOptimisticSubmit,
    deliver(message) {
      for (const handler of [...handlers]) handler(message);
    },
  };
}

test('sequential ACK is correlated and only ok=true completes the current answer', () => {
  const harness = sequentialHarness();
  const operation = harness.prepareOptimisticSubmit('card-failed');
  assert.ok(operation);
  assert.equal(harness.sent.at(-1).seq, operation.seq);
  assert.equal(harness.handlers.size, 1);

  harness.deliver({
    type: 'input-sequential-done',
    seq: `${operation.seq}-stale`,
    ok: true,
  });
  assert.equal(harness.controller._sequentialOperation, operation);

  harness.deliver({ type: 'input-sequential-done', seq: operation.seq, ok: false });
  assert.equal(harness.controller._sequentialOperation, null);
  assert.equal(operation.timeout, null);
  assert.equal(operation.unsub, null);
  assert.equal(harness.handlers.size, 0);
  assert.equal(harness.controller._askSubmitting, false);
  assert.deepEqual(harness.state().pendingAsk, { id: 'pending-card-failed' });
  assert.equal(harness.state().localAskAnswers['card-failed'], undefined);
  assert.equal(harness.state().ptyPromptHistory.at(-1).status, 'active');
  assert.deepEqual(harness.warnings, ['input-sequential-failed']);

  // A duplicate failure ACK has no subscriber and cannot roll back twice.
  harness.deliver({ type: 'input-sequential-done', seq: operation.seq, ok: false });
  assert.deepEqual(harness.warnings, ['input-sequential-failed']);
});

test('a cleared watchdog from an older operation cannot complete a later submit', () => {
  const harness = sequentialHarness();
  const first = harness.prepareOptimisticSubmit('card-first');
  const staleWatchdog = harness.timers.at(-1);

  harness.deliver({ type: 'input-sequential-done', seq: first.seq, ok: true });
  assert.equal(staleWatchdog.cleared, true);
  assert.equal(harness.state().ptyPromptHistory.at(-1).status, 'answered');

  const second = harness.prepareOptimisticSubmit('card-second');
  assert.notEqual(second.seq, first.seq);
  const secondHistoryLength = harness.state().ptyPromptHistory.length;

  // Simulate a hostile/faulty scheduler invoking an already-cleared timer.
  staleWatchdog.callback();
  assert.equal(harness.controller._sequentialOperation, second);
  assert.equal(harness.controller._askSubmitting, true);
  assert.equal(harness.state().ptyPromptHistory.length, secondHistoryLength);
  assert.equal(harness.state().ptyPromptHistory.at(-1).status, 'active');

  harness.deliver({ type: 'input-sequential-done', seq: second.seq, ok: true });
  assert.equal(harness.controller._sequentialOperation, null);
  assert.equal(harness.state().ptyPromptHistory.at(-1).status, 'answered');
  assert.deepEqual(harness.warnings, []);
});

test('the between-answer timer is owned by the ask flow and cannot survive close', () => {
  const harness = sequentialHarness();
  const first = harness.prepareOptimisticSubmit('card-multi');
  harness.controller._askAnswerQueue = [{
    type: 'single', optionIndex: 1, isLast: true,
  }];

  harness.deliver({ type: 'input-sequential-done', seq: first.seq, ok: true });
  const nextAnswerTimer = harness.timers.at(-1);
  assert.equal(nextAnswerTimer.ms, 500);
  assert.equal(harness.controller._sequentialOperation, null);

  harness.controller.resetAskFlagsOnClose();
  assert.equal(nextAnswerTimer.cleared, true);
  assert.equal(harness.controller._nextSequentialTimer, null);
  assert.equal(harness.controller._askSubmitting, false);
  assert.deepEqual(harness.state().pendingAsk, { id: 'pending-card-multi' });

  // Even a scheduler that invokes a cancelled callback cannot start answer 2.
  const sentBefore = harness.sent.length;
  nextAnswerTimer.callback();
  assert.equal(harness.sent.length, sentBefore);
  assert.equal(harness.controller._sequentialOperation, null);
});

test('sequential timeout rolls back once and releases its subscription', () => {
  const harness = sequentialHarness();
  const operation = harness.prepareOptimisticSubmit('card-timeout');
  const watchdog = harness.timers.at(-1);
  assert.equal(watchdog.ms, 15000);

  watchdog.callback();
  assert.equal(harness.controller._sequentialOperation, null);
  assert.equal(harness.handlers.size, 0);
  assert.deepEqual(harness.state().pendingAsk, { id: 'pending-card-timeout' });
  assert.equal(harness.state().localAskAnswers['card-timeout'], undefined);
  assert.deepEqual(harness.warnings, ['input-sequential-timeout']);

  watchdog.callback();
  assert.deepEqual(harness.warnings, ['input-sequential-timeout']);
  assert.equal(operation.timeout, null);
});

test('WebSocket close and dispose idempotently clean and roll back sequential operations', () => {
  const harness = sequentialHarness();
  const closing = harness.prepareOptimisticSubmit('card-close');
  const closingTimer = harness.timers.at(-1);

  harness.controller.resetAskFlagsOnClose();
  harness.controller.resetAskFlagsOnClose();
  assert.equal(harness.controller._sequentialOperation, null);
  assert.equal(closingTimer.cleared, true);
  assert.equal(harness.handlers.size, 0);
  assert.deepEqual(harness.state().pendingAsk, { id: 'pending-card-close' });
  assert.equal(harness.state().localAskAnswers['card-close'], undefined);
  assert.deepEqual(harness.warnings, []);

  const disposing = harness.prepareOptimisticSubmit('card-dispose');
  const disposingTimer = harness.timers.at(-1);
  harness.setUnmounted(true);
  harness.controller.dispose();
  harness.controller.dispose();
  assert.equal(harness.controller._sequentialOperation, null);
  assert.equal(disposingTimer.cleared, true);
  assert.equal(harness.handlers.size, 0);
  assert.deepEqual(harness.state().pendingAsk, { id: 'pending-card-dispose' });
  assert.equal(harness.state().localAskAnswers['card-dispose'], undefined);
  assert.equal(disposing.timeout, null);
  assert.deepEqual(harness.warnings, []);
  assert.notEqual(disposing.seq, closing.seq);
});
