import React from 'react';
import { Typography, Empty } from 'antd';
import { t } from '../../i18n';
import styles from './SdkContextUsageTab.module.css';

const { Text } = Typography;

export default function SdkContextUsageTab() {
  return <div className={styles.center}><Empty description={<Text type="secondary">{t('ui.contextUsage.unavailable')}</Text>} /></div>;
}
