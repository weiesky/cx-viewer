import { getProxyChipView } from '../../utils/proxyProfileDisplay';
import React from 'react';
import { Tag } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { shouldRenderSdkModelChip } from '../../utils/sdkModelChip';
import styles from './ProxyChip.module.css';
import SdkModelPicker from './SdkModelPicker';

/**
 * Proxy hot-switch chip, rendered in the chat input bar (right of the Enter hint).
 *
 * Migrated verbatim from AppHeader._renderProxyChip so the same chip shows on PC and iPad
 * (Mobile tree never renders AppHeader). Purely presentational: the click is delegated to
 * `onOpenProxyModal` so the owning ChatView can mount the ProxyModal next to the input bar.
 *
 * Visibility follows the upstream main/role assignment rules; in SDK mode
 * only, the native model picker fills the slot (shouldRenderSdkModelChip). Returns
 * null when neither applies (official Default, or non-SDK PTY with no profile).
 */
export default function ProxyChip({
  proxyProfiles,
  activeProxyId,
  proxyRoles,
  proxyOfficialDefault,
  proxyRoleRouting,
  sdkMode,
  sdkModel,
  sdkReasoningEffort,
  sdkBusy,
  onOpenProxyModal,
}) {
  const { visible: proxyChipVisible, mainLabel, title } = getProxyChipView({
    proxyProfiles, activeProxyId, proxyRoles, proxyOfficialDefault, proxyRoleRouting,
  });

  if (!proxyChipVisible) {
    // Explicit proxy rewrites retain their editor; native selection fills Default.
    if (!shouldRenderSdkModelChip({ sdkMode, sdkModel, proxyChipVisible })) return null;
    return (
      <SdkModelPicker sdkModel={sdkModel} reasoningEffort={sdkReasoningEffort} busy={sdkBusy} />
    );
  }

  return (
    <Tag
      className={styles.proxyChip}
      title={title}
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
