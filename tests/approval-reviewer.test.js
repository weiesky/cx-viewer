import test from 'node:test';
import assert from 'node:assert/strict';

import {
  APPROVALS_REVIEWER_AUTO,
  APPROVALS_REVIEWER_OPTIONS,
  APPROVALS_REVIEWER_USER,
  isSupportedApprovalsReviewer,
  normalizeApprovalsReviewer,
  shouldDeferPermissionHookToCodex,
} from '../lib/approval-reviewer.js';

test('approval reviewer exposes only current Codex UI values', () => {
  assert.deepEqual(APPROVALS_REVIEWER_OPTIONS, ['user', 'auto_review']);
  assert.equal(APPROVALS_REVIEWER_USER, 'user');
  assert.equal(APPROVALS_REVIEWER_AUTO, 'auto_review');
});

test('approval reviewer safely normalizes unknown and legacy values', () => {
  assert.equal(normalizeApprovalsReviewer('auto_review'), 'auto_review');
  assert.equal(normalizeApprovalsReviewer('guardian_subagent'), 'user');
  assert.equal(normalizeApprovalsReviewer('unexpected'), 'user');
  assert.equal(normalizeApprovalsReviewer(undefined), 'user');
  assert.equal(isSupportedApprovalsReviewer('guardian_subagent'), true);
  assert.equal(isSupportedApprovalsReviewer('unexpected'), false);
});

test('permission hooks defer only to the Codex auto reviewer', () => {
  assert.equal(shouldDeferPermissionHookToCodex('auto_review'), true);
  assert.equal(shouldDeferPermissionHookToCodex('guardian_subagent'), false);
  assert.equal(shouldDeferPermissionHookToCodex('user'), false);
});
