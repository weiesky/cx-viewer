import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import chrome from './sharedChrome.module.css';
import { ShieldCheckIcon, PlanClipboardIcon, AskAnswerIcon } from './quickMenuIcons';
import { PLAN_AUTO_APPROVE_OPTIONS, autoApproveValueLabel, ASK_AUTO_ANSWER_OPTIONS, askAutoAnswerValueLabel, askAutoAnswerUiValue } from '../../utils/autoApproveOptions';
import { APPROVALS_REVIEWER_OPTIONS, approvalReviewerValueLabel, normalizeApprovalsReviewer } from '../../utils/approvalReviewerOptions';

// 四芒星快捷菜单的「权限审批代理 / Plan 自动审批」两行级联。
// 级联子菜单由 expandedKey 驱动显隐而非 CSS :hover —— 选完档位要立即收起，
// 此时鼠标仍悬停在 group 上，纯 :hover 收不掉。hover-intent 由宿主经
// onHoverEnter/onHoverLeave 注入（见 utils/quickMenuHoverIntent）。
function QuickAutoApproveRows({ approvalsReviewer, planAutoApproveSeconds, askAutoAnswerMinutes, onAskAutoAnswerChange, onApprovalsReviewerChange, onPlanAutoApproveChange, expandedKey, onToggle, onHoverEnter, onHoverLeave, middle }) {
  const rows = [
    {
      key: 'perm',
      icon: <ShieldCheckIcon />,
      label: t('ui.permission.reviewer.setting'),
      value: normalizeApprovalsReviewer(approvalsReviewer),
      options: APPROVALS_REVIEWER_OPTIONS,
      onChange: onApprovalsReviewerChange,
      valueLabel: approvalReviewerValueLabel,
    },
    {
      key: 'plan',
      icon: <PlanClipboardIcon />,
      label: t('ui.approval.settings.planAutoApprove'),
      value: planAutoApproveSeconds,
      options: PLAN_AUTO_APPROVE_OPTIONS,
      onChange: onPlanAutoApproveChange,
      valueLabel: autoApproveValueLabel,
    },
    {
      key: 'ask', icon: <AskAnswerIcon />, label: t('ui.askAutoAnswer.setting'),
      value: askAutoAnswerUiValue(askAutoAnswerMinutes), options: ASK_AUTO_ANSWER_OPTIONS,
      onChange: onAskAutoAnswerChange, valueLabel: askAutoAnswerValueLabel, help: t('ui.askAutoAnswer.help'),
    },
  ];
  return rows.map((row, index) => {
    const expanded = expandedKey === row.key;
    return (
      <React.Fragment key={row.key}>
      <div
        key={row.key}
        className={`${chrome.quickMenuGroup} ${expanded ? chrome.quickMenuGroupOpen : ''}`}
        onMouseEnter={() => onHoverEnter(row.key)}
        onMouseLeave={() => onHoverLeave(row.key)}
      >
        <button className={chrome.quickMenuRow} onClick={() => onToggle(expanded ? null : row.key)}>
          <span className={chrome.quickMenuRowIcon}>{row.icon}</span>
          <span className={chrome.quickMenuLabel}>{row.label}
            {row.help && (
              <Tooltip title={row.help} trigger="click" overlayStyle={{ maxWidth: 320 }} overlayInnerStyle={{ whiteSpace: 'pre-line' }}>
                <span className={chrome.helpIconBtn} role="button" tabIndex={0} aria-label={row.help}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>
                  <QuestionCircleOutlined />
                </span>
              </Tooltip>
            )}
          </span>
          <span className={chrome.quickMenuValue}>[{row.valueLabel(row.value, t)}]</span>
          <span className={chrome.quickMenuCaret}>▸</span>
        </button>
        <div className={chrome.quickMenuSubWrap}>
          <div className={chrome.quickMenuSub}>
            {row.options.map(v => (
              <button
                key={v}
                className={`${chrome.quickMenuOption} ${row.value === v ? chrome.quickMenuOptionActive : ''}`}
                onClick={() => { row.onChange?.(v); onToggle(null); }}
              >
                {row.valueLabel(v, t)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {index === rows.length - 1 ? middle : null}
      </React.Fragment>
    );
  });
}

export default QuickAutoApproveRows;
