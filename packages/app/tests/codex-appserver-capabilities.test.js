import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractRequestUserInputMethods,
  extractThreadInstructionSupport,
} from '../lib/codex-appserver-capabilities.js';

test('extracts request_user_input methods from a generated app-server schema', () => {
  assert.deepEqual(extractRequestUserInputMethods({
    oneOf: [
      { properties: { method: { enum: ['item/tool/requestUserInput'] } } },
      { properties: { method: { enum: ['unrelated'] } } },
    ],
  }), ['item/tool/requestUserInput']);
  assert.deepEqual(extractRequestUserInputMethods('{"enum":["tool/requestUserInput"]}'), ['tool/requestUserInput']);
  assert.deepEqual(extractRequestUserInputMethods('{}'), []);
});

test('checks instruction fields only on the v2 ThreadStartParams schema', () => {
  assert.deepEqual(extractThreadInstructionSupport({
    title: 'ThreadStartParams',
    properties: {
      developerInstructions: { type: ['string', 'null'] },
      baseInstructions: { type: ['string', 'null'] },
    },
  }), { append: true, override: true });

  assert.deepEqual(extractThreadInstructionSupport({
    title: 'ThreadResumeParams',
    properties: {
      developerInstructions: { type: ['string', 'null'] },
      baseInstructions: { type: ['string', 'null'] },
    },
  }), { append: false, override: false });

  assert.deepEqual(extractThreadInstructionSupport({
    title: 'ThreadStartParams',
    properties: {
      developerInstructions: { type: ['object', 'null'] },
      baseInstructions: { type: 'string' },
    },
  }), { append: false, override: true });
});
