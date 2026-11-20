import React from 'react';
import { Tag } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { shouldRenderSdkModelChip } from '../../utils/sdkModelChip';
import { profileDisplayModel } from '../settings/ProxyModal';
import styles from './ProxyChip.module.css';

/**
 * Proxy hot-switch chip, rendered in the chat input bar (right of the Enter hint).
 *
 * Migrated verbatim from AppHeader._renderProxyChip so the same chip shows on PC and iPad
 * (Mobile tree never renders AppHeader). Purely presentational: the click is delegated to
 * `onOpenProxyModal` so the owning ChatView can mount the ProxyModal next to the input bar.
 *
 * Visibility follows the existing Codex instance-wide profile selection; in SDK mode
 * only, a read-only launch-model chip fills the slot (shouldRenderSdkModelChip). Returns
 * null when neither applies (official Default, or non-SDK PTY with no profile).
 */
export default function ProxyChip({
  proxyProfiles,
  activeProxyId,
  sdkMode,
  sdkModel,
  onOpenProxyModal,
}) {
  const profiles = proxyProfiles || [];
  const activeId = activeProxyId;
  const p = profiles.find(x => x.id === activeId);
  // Codex currently routes one profile for the whole instance; no per-role
  // assignment or official-endpoint flag exists in this control contract.
  const proxyChipVisible = !!activeId && activeId !== 'max' && !!p;

  if (!proxyChipVisible) {
    // SDK launch-model chip only fills this slot when the proxy chip renders nothing
    // (official Default / dormant). Read-only — unrelated to the proxy editor.
    if (!shouldRenderSdkModelChip({ sdkMode, sdkModel, proxyChipVisible })) return null;
    return (
      <Tag className={styles.sdkChip} title={t('ui.sdkModel', { model: sdkModel })}>
        {sdkModel}
      </Tag>
    );
  }

  const mainLabel = p ? `${p.name}${profileDisplayModel(p) ? ` · ${profileDisplayModel(p)}` : ''}` : 'Default';
  return (
    <Tag
      className={styles.proxyChip}
      title={mainLabel}
      onClick={onOpenProxyModal}
      role="button"
      tabIndex={0}
      aria-label={`${t('ui.proxySwitch')}: ${mainLabel}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenProxyModal?.(); } }}
    >
      <SwapOutlined className={styles.swapIcon} />
      {mainLabel}
    </Tag>
  );
}
