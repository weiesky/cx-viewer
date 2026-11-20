import React, { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { fmtDuration, stateGlyph } from '../../utils/workflowFormat';
import styles from './ActiveAgentsBar.module.css';

// Codex supplies proved native identities and timestamps in an instance-owned
// snapshot. Keep the baseline card's DOM, CSS, collapse and clock unchanged.
export default function ActiveAgentsBar({ snapshot, onVisibleChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const [, setTick] = useState(0);
  const rows = useMemo(() => (snapshot?.agents || []).filter(agent =>
    agent && ['pending', 'in_progress'].includes(agent.status)), [snapshot]);

  const visible = rows.length > 0;

  // Notify ChatView only on boolean flips so it can reserve top padding without
  // subscribing to taskStore itself.
  useEffect(() => {
    if (typeof onVisibleChange === 'function') onVisibleChange(visible);
  }, [visible, onVisibleChange]);

  // Tick the clock only while rows are actually shown.
  useEffect(() => {
    if (!visible || collapsed) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [visible, collapsed]);

  // Hooks above this line always run; the early return must stay below them.
  if (!visible) return null;

  const now = Date.now();
  return (
    <div className={`${styles.bar}${collapsed ? ` ${styles.collapsed}` : ''}`}
      role="region" aria-label={t('ui.activeAgents.title')}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        title={collapsed ? t('ui.expand') : t('ui.collapse')}
      >
        <span className={`${styles.liveDot} ${styles.statePulse}`} aria-hidden="true" />
        <span className={styles.title} title={t('ui.activeAgents.title')}>{t('ui.activeAgents.title')}</span>
        <span className={styles.stat}>{t('ui.workflow.agentsShort', { count: rows.length })}</span>
        <span className={styles.chevron} aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className={styles.rows} tabIndex={0}>
          {rows.map((row) => <Row key={row.taskId} row={row} now={now} />)}
        </div>
      )}
    </div>
  );
}

// One active task: status dot | name (+ current-tool pill) | elapsed.
// `queued` (pending) rows show neither a tool pill nor a duration — only the
// waiting state, since no tool has run and the client clock only marks arrival.
function Row({ row, now }) {
  const queued = row.status === 'pending';
  const label = row.title || row.name || t('ui.stats.subAgent');
  const doing = !queued && row.lastToolName ? row.lastToolName : '';
  const dur = !queued && row.createdAt != null
    ? fmtDuration(Math.max(0, now - row.createdAt))
    : '';
  const statusLabel = queued ? t('ui.tasks.status.pending') : t('ui.workflow.status.running');
  const state = queued ? 'queued' : 'running';
  return (
    <div className={styles.row}>
      <span
        className={`${styles.dot} ${queued ? styles.stateQueued : styles.stateRunning}${queued ? '' : ` ${styles.statePulse}`}`}
        role="img"
        aria-label={statusLabel}
      >{stateGlyph(state)}</span>
      <span className={styles.labelCell}>
        <span className={styles.label} title={label}>{label}</span>
        {doing && <span className={styles.doing} title={doing}>{doing}</span>}
      </span>
      <span className={styles.dur}>{dur}</span>
    </div>
  );
}
