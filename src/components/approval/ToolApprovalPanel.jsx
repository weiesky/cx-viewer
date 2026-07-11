import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { t } from '../../i18n';
import { isPlanToolName } from '../../utils/toolNameAliases.js';
import styles from './ToolApprovalPanel.module.css';

function ToolApprovalPanel({ toolName, toolInput, requestId, onAllow, onAllowSession, onDeny, visible, global: isGlobal, source, queueDepth = 0 }) {
  const panelRef = useRef(null);
  const allowRef = useRef(null);
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      setExiting(false);
      requestAnimationFrame(() => allowRef.current?.focus());
    } else if (show) {
      setExiting(true);
      const timer = setTimeout(() => { setShow(false); setExiting(false); }, 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDeny = useCallback((id) => {
    onDeny(id);
  }, [onDeny]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      handleDeny(requestId);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const buttons = panelRef.current?.querySelectorAll('button');
      if (!buttons?.length) return;
      const arr = Array.from(buttons);
      const idx = arr.indexOf(document.activeElement);
      const next = e.shiftKey
        ? (idx <= 0 ? arr.length - 1 : idx - 1)
        : (idx >= arr.length - 1 ? 0 : idx + 1);
      arr[next].focus();
    }
  }, [handleDeny, requestId]);

  const displayText = useMemo(() => {
    if (!toolInput) return '';
    if (isPlanToolName(toolName)) {
      // Plan approval inputs may carry the full markdown plan directly.
      // 优先展示 plan 正文（multi-agent-room 等场景下 plan 仅来自 input，避免 default 分支把 27k JSON 截到 500 字）
      const txt = (typeof toolInput.plan === 'string' && toolInput.plan.trim()) ? toolInput.plan : '';
      return txt || (toolInput.planFilePath ? `(plan @ ${toolInput.planFilePath})` : (toolInput.description || ''));
    }
    switch (toolName) {
      case 'shell_command':
        return toolInput.command || toolInput.description || '';
      case 'apply_patch':
        return toolInput.patch || toolInput.description || JSON.stringify(toolInput, null, 2).slice(0, 500);
      case 'web_search':
        return toolInput.query || toolInput.q || toolInput.description || '';
      case 'image_generation':
        return toolInput.prompt || toolInput.description || '';
      default:
        if (toolInput.description) return toolInput.description;
        return JSON.stringify(toolInput, null, 2).slice(0, 500);
    }
  }, [toolName, toolInput]);

  const detailText = useMemo(() => {
    if (!toolInput) return null;
    if (toolName === 'shell_command' && toolInput.description) return toolInput.description;
    return null;
  }, [toolName, toolInput]);

  if (!show) return null;

  return (
    <div ref={panelRef} className={`${isGlobal ? styles.panelGlobal : styles.panel}${exiting ? ` ${styles.exiting}` : ''}`} onKeyDown={handleKeyDown}>
      <svg className={`${styles.borderSvg} ${styles.borderSvgInset}`} preserveAspectRatio="none">
        <rect x="0" y="0" width="100%" height="100%" rx="12" ry="12"
          fill="none" stroke="var(--color-approval-border)" strokeWidth="1" strokeDasharray="6 4"
          className={styles.borderRect} />
      </svg>
      <div className={styles.header}>
        <span className={styles.toolName}>{toolName}</span>
        {source === 'pty' && <span className={styles.subAgentBadge}>{t('ui.subAgentApproval')}</span>}
        {queueDepth > 0 && <span className={styles.subAgentBadge}>{t('ui.permission.queued', { n: queueDepth })}</span>}
        <span className={styles.label}>{t('ui.permission.approvalRequired')}</span>
      </div>
      <div className={styles.body}>
        <pre className={styles.command}>{displayText}</pre>
        {detailText && <div className={styles.detail}>{detailText}</div>}
      </div>
      <div className={styles.actions}>
        <button className={styles.denyBtn} onClick={() => handleDeny(requestId)}>
          {t('ui.permission.deny')}
        </button>
        {onAllowSession && (
          <button className={styles.allowSessionBtn} onClick={() => onAllowSession(requestId)}>
            {t('ui.permission.allowSession')}
          </button>
        )}
        <button ref={allowRef} className={styles.allowBtn} onClick={() => onAllow(requestId)}>
          {t('ui.permission.allow')}
        </button>
      </div>
    </div>
  );
}

export default ToolApprovalPanel;
