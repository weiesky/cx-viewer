import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCodexAutoResolutionAnswers,
  codexRequestUserInputItemId,
  CodexRequestUserInputRelay,
  isCodexRequestUserInputMessage,
  normalizeCodexRequestUserInputAnswers,
  projectCodexAnswersForConversation,
} from '../lib/codex-request-user-input.js';

function request(id = 7, method = 'item/tool/requestUserInput') {
  return {
    id,
    method,
    params: {
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId: 'item-1',
      autoResolutionMs: 60000,
      questions: [
        {
          id: 'choice',
          header: 'Choice',
          question: 'Proceed?',
          options: [
            { label: 'Yes', description: 'Continue.' },
            { label: 'No', description: 'Stop.' },
          ],
        },
        {
          id: 'notes',
          header: 'Notes',
          question: 'Anything else?',
          options: null,
          isOther: true,
        },
      ],
    },
  };
}

test('recognizes both installed and documented app-server request_user_input methods', () => {
  assert.equal(isCodexRequestUserInputMessage(request()), true);
  assert.equal(isCodexRequestUserInputMessage(request('ask-2', 'tool/requestUserInput')), true);
  assert.equal(isCodexRequestUserInputMessage({ ...request(), id: null }), false);
  assert.equal(isCodexRequestUserInputMessage({ ...request(), method: 'request_user_input' }), false);
});

test('normalizes GUI answers to the generated Codex response schema', () => {
  assert.deepEqual(normalizeCodexRequestUserInputAnswers(request().params.questions, {
    choice: { answers: ['Yes'] },
    'Anything else?': 'Ship it',
  }), {
    choice: { answers: ['Yes'] },
    notes: { answers: ['Ship it'] },
  });
});

test('keeps transcript item ids stable and builds recommended timeout answers', () => {
  const withoutItemId = request(12);
  delete withoutItemId.params.itemId;
  assert.equal(codexRequestUserInputItemId(withoutItemId), 'request-user-input-12');
  assert.equal(codexRequestUserInputItemId(request(13)), 'item-1');

  const answers = buildCodexAutoResolutionAnswers(request().params.questions);
  assert.deepEqual(answers, { choice: { answers: ['Yes'] } });
  assert.deepEqual(projectCodexAnswersForConversation(request().params.questions, answers), {
    'Proceed?': 'Yes',
  });
});

test('claimed request is answered by CX Viewer with the original JSON-RPC id', () => {
  const offered = [];
  const sent = [];
  const relay = new CodexRequestUserInputRelay({
    onPending: pending => { offered.push(pending); return true; },
  });
  const claimed = relay.claim(request('rpc-ask'), message => { sent.push(message); return true; });
  assert.equal(claimed, true);
  assert.equal(offered.length, 1);
  assert.match(offered[0].uiId, /^codex-app-server:string:/);
  assert.equal(offered[0].itemId, 'item-1');
  assert.equal(relay.resolve(offered[0].uiId, {
    choice: { answers: ['Yes'] },
    notes: { answers: ['Ready'] },
  }), true);
  assert.deepEqual(sent, [{
    id: 'rpc-ask',
    result: {
      answers: {
        choice: { answers: ['Yes'] },
        notes: { answers: ['Ready'] },
      },
    },
  }]);
  assert.equal(relay.has(offered[0].uiId), false);
});

test('unclaimed or disconnected GUI requests fall through to the TUI', () => {
  const relay = new CodexRequestUserInputRelay({ onPending: () => false });
  assert.equal(relay.claim(request(), () => true), false);

  let pending;
  let forwarded = 0;
  const claimedRelay = new CodexRequestUserInputRelay({
    onPending: value => { pending = value; return true; },
  });
  assert.equal(claimedRelay.claim(request(9), () => true, () => { forwarded += 1; return true; }), true);
  assert.equal(claimedRelay.releaseToClient(pending.uiId), true);
  assert.equal(forwarded, 1);
  assert.equal(claimedRelay.has(pending.uiId), false);
});

test('empty answers safely resolve cancel and automatic timeout paths', () => {
  let pending;
  let response;
  const relay = new CodexRequestUserInputRelay({
    onPending: value => { pending = value; return true; },
  });
  relay.claim(request(11), value => { response = value; return true; });
  assert.equal(relay.cancel(pending.uiId), true);
  assert.deepEqual(response, { id: 11, result: { answers: {} } });
});
