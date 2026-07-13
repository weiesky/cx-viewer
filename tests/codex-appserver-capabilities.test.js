import test from 'node:test';
import assert from 'node:assert/strict';

import { extractRequestUserInputMethods } from '../lib/codex-appserver-capabilities.js';

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
