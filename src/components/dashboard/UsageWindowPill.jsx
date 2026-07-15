import React, { memo, useMemo } from 'react';
import { Popover } from 'antd';
import { t } from '../../i18n';
import styles from './UsageWindowPill.module.css';

// 与 LiveTagPopover 同款：静态 overlayInnerStyle 提到模块顶层,避免每次 render 新建字面量。
const POPOVER_OVERLAY_STYLE = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-hover)',
  borderRadius: 8,
  padding: '8px 8px',
};

// 0~1 占比 → 百分比文本
function fmtPct(u) {
  return u == null ? '—' : `${Math.round(u * 100)}%`;
}

function displayLimitMeta(value) {
  if (!value) return '';
  const normalized = String(value).trim().toLowerCase();
  const known = {
    prolite: 'Pro Lite',
    pro: 'Pro',
    plus: 'Plus',
    premium: 'Premium',
    business: 'Business',
    enterprise: 'Enterprise',
    team: 'Team',
  };
  if (known[normalized]) return known[normalized];
  return String(value).trim().replace(/[_-]+/g, ' ');
}

// resetAt(毫秒) → "Resets in 2h 13m" / "Resets in 45m" / "Resetting…"。无 resetAt 返回空串。
function resetText(resetAt) {
  if (resetAt == null) return '';
  const diff = resetAt - Date.now();
  if (diff <= 0) return t('ui.usage.resetting');
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? t('ui.usage.resetsInHM', { h, m }) : t('ui.usage.resetsInM', { m });
}

function windowName(w) {
  const id = typeof w === 'string' ? w : w?.id;
  if (id === '7d') return t('ui.usage.weekly');
  if (id === '5h') return t('ui.usage.fiveHour');
  return localizedWindowName(w);
}

function windowShort(w) {
  const id = typeof w === 'string' ? w : w?.id;
  if (id === '7d') return t('ui.usage.weeklyShort');
  if (id === '5h') return '5h';
  return localizedWindowName(w, true);
}

function slotInfo(w) {
  const id = typeof w === 'string' ? w : w?.id;
  const label = typeof w === 'object' && typeof w?.label === 'string' ? w.label.trim() : '';
  const labelMatch = label.match(/^(.*?)\s+(primary|secondary)$/i);
  if (labelMatch) return { name: labelMatch[1].trim(), slot: labelMatch[2].toLowerCase() };
  const idMatch = String(id || '').match(/(?:^|:)(primary|secondary)$/i);
  if (idMatch) return { name: label, slot: idMatch[1].toLowerCase() };
  return null;
}

function localizedSlot(slot, short = false) {
  if (slot === 'primary') return t(short ? 'ui.usage.primaryShort' : 'ui.usage.primary');
  if (slot === 'secondary') return t(short ? 'ui.usage.secondaryShort' : 'ui.usage.secondary');
  return slot;
}

function windowMinutesLabel(w, short = false) {
  const minutes = typeof w === 'object' ? Number(w?.windowMinutes) : NaN;
  if (!Number.isFinite(minutes)) return null;
  if (minutes === 300) return short ? '5h' : t('ui.usage.fiveHour');
  if (minutes === 10080) return short ? t('ui.usage.weeklyShort') : t('ui.usage.weekly');
  return null;
}

function localizedWindowName(w, short = false) {
  const id = typeof w === 'string' ? w : w?.id;
  const label = typeof w === 'object' && typeof w?.label === 'string' ? w.label.trim() : '';
  const minutesLabel = windowMinutesLabel(w, short);
  const slot = slotInfo(w);
  if (minutesLabel) {
    if (short || !slot?.name) return minutesLabel;
    return t('ui.usage.namedSlot', { name: slot.name, slot: minutesLabel });
  }
  if (slot) {
    const slotLabel = localizedSlot(slot.slot, short);
    if (short || !slot.name) return slotLabel;
    return t('ui.usage.namedSlot', { name: slot.name, slot: slotLabel });
  }
  if (id === 'requests' || /^requests$/i.test(label)) return t(short ? 'ui.usage.requestsShort' : 'ui.usage.requests');
  if (id === 'tokens' || /^tokens$/i.test(label)) return t(short ? 'ui.usage.tokensShort' : 'ui.usage.tokens');
  return label || String(id || '');
}

function UsageWindowPill({ planUsage, authType }) {
  const windows = Array.isArray(planUsage?.windows) ? planUsage.windows : [];
  const summaryWindow = useMemo(() => windows[0] || null, [windows]);
  const planMeta = useMemo(() => {
    const values = [displayLimitMeta(planUsage?.planType), displayLimitMeta(planUsage?.activeLimit)].filter(Boolean);
    return Array.from(new Set(values)).join(' · ');
  }, [planUsage?.activeLimit, planUsage?.planType]);

  // 状态栏只展示第一项，完整窗口列表留在 hover 详情里。
  const triggerStyle = useMemo(() => {
    const pct = summaryWindow && summaryWindow.utilization != null ? Math.round(summaryWindow.utilization * 100) : 0;
    return {
      '--usage-percent': `${Math.min(100, Math.max(0, pct))}%`,
    };
  }, [summaryWindow]);

  // 没有套餐限流数据时:OAuth(订阅)显示静默占位 pill,等待数据;其余(API Key / 未知)不渲染。
  if (!planUsage) {
    if (authType === 'OAuth') {
      return (
        <Popover
          content={<div className={styles.pop}>{t('ui.usage.waiting')}</div>}
          trigger="hover"
          placement="top"
          overlayInnerStyle={POPOVER_OVERLAY_STYLE}
        >
          <span className={`${styles.usagePill} ${styles.muted}`} role="button" tabIndex={0} aria-label={t('ui.usage.ariaLabel')}>
            <span className={styles.usageContent}>
              <span className={styles.usageText}>—</span>
            </span>
          </span>
        </Popover>
      );
    }
    return null;
  }

  const pillLabel = summaryWindow ? `${windowShort(summaryWindow)} ${fmtPct(summaryWindow.utilization)}` : '—';

  const popContent = (
    <div className={styles.pop}>
      <div className={styles.popHeading}>
        <div className={styles.popTitle}>{t('ui.usage.title')}</div>
        {planMeta && <div className={styles.popMeta}>{planMeta}</div>}
      </div>
      {/* 无边框 table 让「窗口名 / 血条 / 重置时间」三列对齐;百分比用 50px 血条 + 数字叠加展示。 */}
      <table className={styles.popTable}>
        <tbody>
          {windows.map((w) => {
            const rt = resetText(w.resetAt);
            const pct = w.utilization != null ? Math.min(100, Math.max(0, Math.round(w.utilization * 100))) : 0;
            return (
              <tr key={w.id}>
                <td className={styles.tdName}>{windowName(w)}</td>
                <td className={styles.tdBar}>
                  <span className={styles.bar}>
                    <span className={styles.barFill} style={{ width: `${pct}%` }} />
                    <span className={styles.barText}>{fmtPct(w.utilization)}</span>
                  </span>
                </td>
                <td className={styles.tdReset}>{rt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <Popover
      content={popContent}
      trigger="hover"
      placement="topRight"
      overlayInnerStyle={POPOVER_OVERLAY_STYLE}
    >
      <span className={styles.usagePill} style={triggerStyle} role="button" tabIndex={0} aria-label={t('ui.usage.ariaLabel')}>
        <span className={styles.usageFill} />
        <span className={styles.usageContent}>
          <span className={styles.usageText}>{pillLabel}</span>
        </span>
      </span>
    </Popover>
  );
}

export default memo(UsageWindowPill);
