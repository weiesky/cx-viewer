import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAskAnswerText } from '../src/utils/askAnswerParser.js';

test('maps native Codex request_user_input answer ids back to question text', () => {
  const questions = [{
    id: 'cx_viewer_fit',
    question: '你看到的 request_user_input 交互在 cx-viewer 中表现如何？',
    options: [{ label: '完全正常 (Recommended)' }],
  }];
  const questionsBefore = structuredClone(questions);
  const rawResult = '{"answers":{"cx_viewer_fit":{"answers":["完全正常 (Recommended)"]}}}';

  assert.deepEqual(parseAskAnswerText(rawResult, questions), {
    '你看到的 request_user_input 交互在 cx-viewer 中表现如何？': '完全正常 (Recommended)',
  });
  assert.equal(rawResult, '{"answers":{"cx_viewer_fit":{"answers":["完全正常 (Recommended)"]}}}');
  assert.deepEqual(questions, questionsBefore, 'projection parsing must not mutate raw tool input');
});

test('joins native multi-select answers and keeps unknown ids visible', () => {
  const rawResult = JSON.stringify({
    answers: {
      targets: { answers: ['Web', 'Worker'] },
      unrecognized: { answers: ['fallback'] },
    },
  });

  assert.deepEqual(parseAskAnswerText(rawResult, [{ id: 'targets', question: 'Targets?' }]), {
    'Targets?': 'Web, Worker',
    unrecognized: 'fallback',
  });
});

test('keeps the historical quoted answer format compatible', () => {
  assert.deepEqual(parseAskAnswerText('"Proceed?"="Yes"\n"Notes"="Ship it"'), {
    'Proceed?': 'Yes',
    Notes: 'Ship it',
  });
});
