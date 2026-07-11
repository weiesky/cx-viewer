import {
  APPROVALS_REVIEWER_AUTO,
  APPROVALS_REVIEWER_DEFAULT,
  APPROVALS_REVIEWER_OPTIONS,
  APPROVALS_REVIEWER_USER,
  normalizeApprovalsReviewer,
} from '../../lib/approval-reviewer.js';

export {
  APPROVALS_REVIEWER_AUTO,
  APPROVALS_REVIEWER_DEFAULT,
  APPROVALS_REVIEWER_OPTIONS,
  APPROVALS_REVIEWER_USER,
  normalizeApprovalsReviewer,
};

export function approvalReviewerValueLabel(value, t) {
  const reviewer = normalizeApprovalsReviewer(value);
  return reviewer === APPROVALS_REVIEWER_AUTO
    ? t('ui.permission.reviewer.auto')
    : t('ui.permission.reviewer.user');
}

export function approvalReviewerSelectOptions(t) {
  return APPROVALS_REVIEWER_OPTIONS.map(value => ({
    value,
    label: approvalReviewerValueLabel(value, t),
  }));
}
