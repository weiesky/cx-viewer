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

test('submitting indexes the answer by the rendered card id and app-server aliases', () => {
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

  const controller = new AskFlowController(host);
  controller.handleAskQuestionSubmit(
    [{ questionIndex: 0, type: 'single', optionIndex: 0 }],
    'rendered-tool-card-id',
    questions,
  );

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
