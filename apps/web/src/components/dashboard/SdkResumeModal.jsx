import React from 'react';
import { Modal } from 'antd';
import { ResumeSessionsList } from '../chat/ResumeSessionsPopover';
import { t } from '../../i18n';

// CLI --resume without an id uses the same baseline history body as mobile.
export default function SdkResumeModal({ open, session, onClose, onResumeSession }) {
  return <Modal open={open} title={t('ui.resume.recentSessions')} onCancel={onClose} footer={null} destroyOnHidden>
    <ResumeSessionsList active={open && !!session} instanceKey={session?.instanceKey}
      project={session?.projectName} isStreaming={session?.busy}
      onResumeSession={row => { onClose(); onResumeSession?.(row); }} />
  </Modal>;
}
