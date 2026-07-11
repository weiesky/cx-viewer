export const APPROVALS_REVIEWER_USER = 'user';
export const APPROVALS_REVIEWER_AUTO = 'auto_review';

export const APPROVALS_REVIEWER_OPTIONS = [
  APPROVALS_REVIEWER_USER,
  APPROVALS_REVIEWER_AUTO,
];

export function normalizeApprovalsReviewer(value) {
  // Codex still parses guardian_subagent for compatibility, but it is not the
  // same public contract as auto_review. Fail closed when reading that legacy
  // value instead of silently broadening it to a different reviewer.
  if (value === 'guardian_subagent') return APPROVALS_REVIEWER_USER;
  return APPROVALS_REVIEWER_OPTIONS.includes(value) ? value : APPROVALS_REVIEWER_USER;
}

export function isSupportedApprovalsReviewer(value) {
  return APPROVALS_REVIEWER_OPTIONS.includes(value) || value === 'guardian_subagent';
}

export function shouldDeferPermissionHookToCodex(value) {
  return normalizeApprovalsReviewer(value) === APPROVALS_REVIEWER_AUTO;
}
