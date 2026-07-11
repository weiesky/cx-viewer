// Plan 自动审批档位唯一事实源。权限审批使用 Codex 原生
// approvalsReviewer（见 approvalReviewerOptions.js），不再按时间放行。
// 三态语义(持久化于 approvalModal.planAutoApproveSeconds):
//   0   = 关闭(手动审批 Plan)
//   > 0 = 倒计时该秒数后自动批准
//   -1  = 立即批准 Plan
// 本模块不依赖 helpers.js(它带 .svg?raw 等 Vite 专属 import),保持 node --test 可直接引用。
export const AUTO_APPROVE_INSTANT = -1;

export const PLAN_AUTO_APPROVE_OPTIONS = [0, 10, 30, 60, AUTO_APPROVE_INSTANT];

// 单个档位值 -> 显示文案;t 由调用方注入,避免本模块依赖前端 i18n。
// 档位之外的历史值(如 Plan 旧 3/5)同样落在 `${v}s` 分支正常显示。
export function autoApproveValueLabel(v, t) {
  if (v === AUTO_APPROVE_INSTANT) return t('ui.permission.autoApprove.instant');
  if (!v) return t('ui.permission.autoApprove.off');
  return `${v}s`;
}

// 档位数组 -> antd Select options
export function autoApproveSelectOptions(values, t) {
  return values.map(v => ({ value: v, label: autoApproveValueLabel(v, t) }));
}
