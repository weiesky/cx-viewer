import React, { useCallback, useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import { apiUrl } from '../../utils/apiUrl';
import { imTr as _tr } from '../../utils/imTr';
import styles from './ImStatusChip.module.css';

/**
 * Compact, generic IM status chip for the header (one per descriptor). Renders nothing unless the
 * platform's bridge is enabled; otherwise the connection state is conveyed by the brand icon's
 * COLOR — the platform's brand color when connected, grey otherwise (incl. error; the tooltip
 * still spells out the error). Clicking it opens the messaging panel on this platform's tab.
 * Self-contained: polls the platform's status endpoint every 5s.
 */
export default function ImStatusChip({ descriptor, onClick, onStatus }) {
  const [enabled, setEnabled] = useState(false);
  const [connection, setConnection] = useState(null);
  const Icon = descriptor.icon;

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(apiUrl(descriptor.endpoints.status));
      // 失败时复位为断连态，绝不保留上一次的「已连接」——状态须以真实为准（否则断连后徽标发霉）。
      if (!r.ok) { setConnection({ running: false, connected: false }); return; }
      const d = await r.json();
      setEnabled(!!d.enabled);
      setConnection(d.connection || null);
    } catch { setConnection({ running: false, connected: false }); }
  }, [descriptor]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // 向上汇报状态（供 Electron tab bar 渲染迁移过去的 IM 图标；web 下不传 onStatus，无副作用）。
  useEffect(() => {
    if (!onStatus) return;
    onStatus(descriptor.id, {
      enabled,
      running: !!connection?.running,
      connected: !!(connection && connection.connected && !connection.lastError),
    });
  }, [enabled, connection, onStatus, descriptor.id]);

  if (!enabled) return null;

  // 进程感知五态：每个 IM 现在跑在独立 worker 进程里，主 cxv 经 manager 汇报 {running, connected}。
  //   error      —— worker 报了 lastError（灰 + 红点）
  //   connected  —— 进程在 + 适配器已连（品牌色）
  //   running    —— 进程在但适配器未连（品牌色 + 降透明度，"运行中，连接中…"）
  //   stopped    —— 进程不在（灰）
  let state = 'stopped';
  if (connection?.lastError) state = 'error';
  else if (connection?.running && connection?.connected) state = 'connected';
  else if (connection?.running) state = 'running';

  const statusLabel = state === 'connected'
    ? _tr('ui.im.statusConnected', null, 'Connected')
    : state === 'running'
      ? _tr('ui.im.statusRunning', null, 'Running, connecting…')
      : state === 'error'
        ? `${_tr('ui.im.statusError', null, 'Error')}: ${connection.lastError}`
        : _tr('ui.im.statusStopped', null, 'Stopped');
  const label = _tr(descriptor.labelKey, null, descriptor.fallback);
  // Brand color when running/connected, grey when stopped/error — driven by the descriptor.
  const color = (state === 'connected' || state === 'running') ? descriptor.color : 'var(--text-tertiary, #999)';
  const iconClass = state === 'running' ? `${styles.logo} ${styles.connecting}` : styles.logo;

  return (
    <Tooltip title={`${label} · ${statusLabel}`}>
      <span className={styles.chip} onClick={onClick} role="button" tabIndex={0}
        aria-label={`${label} · ${statusLabel}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}>
        <Icon size={16} className={iconClass} style={{ color }} />
        {state === 'error' ? <span className={styles.dotError} aria-hidden="true" /> : null}
      </span>
    </Tooltip>
  );
}
