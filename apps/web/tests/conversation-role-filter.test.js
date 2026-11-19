import test from 'node:test';
import assert from 'node:assert/strict';

import { isConversationItemVisibleForRoles } from '../src/utils/conversationRoleFilter.js';

test('context compaction boundaries remain visible for every role selection', () => {
  for (const selected of [
    new Set(['user']),
    new Set(['assistant']),
    new Set(['sub:reviewer']),
  ]) {
    assert.equal(isConversationItemVisibleForRoles('context-compaction', null, selected), true);
  }
});

test('speaker rows still follow their selected role', () => {
  const selected = new Set(['user', 'sub:reviewer']);
  assert.equal(isConversationItemVisibleForRoles('user', null, selected), true);
  assert.equal(isConversationItemVisibleForRoles('plan-prompt', null, selected), true);
  assert.equal(isConversationItemVisibleForRoles('assistant', null, selected), false);
  assert.equal(isConversationItemVisibleForRoles('sub-agent-chat', 'reviewer', selected), true);
  assert.equal(isConversationItemVisibleForRoles('sub-agent-chat', 'other', selected), false);
});
