import React, { useEffect, useId, useMemo, useReducer } from 'react';
import { Tooltip } from 'antd';
import { t } from '../../i18n';
import CompactionPromptHistory from './CompactionPromptHistory';
import styles from './CachePopoverContent.module.css';
import {
  createContextCompactionDisclosureState,
  EMPTY_COMPACTION_DISCLOSURE_STATE,
  reduceContextCompactionDisclosureState,
} from '../../utils/contextCompactionDisclosureState';

/** Shared context-compaction row used by both the cache popover and ChatView. */
export default function ContextCompactionDisclosure({
  descriptor,
  record = null,
  resolveRecord = null,
  inDrawer = false,
  inConversation = false,
}) {
  const promptRegionId = useId();
  const descriptorKey = descriptor?.sourceKey || `${descriptor?.count || 0}:${descriptor?.summary || ''}`;
  const [disclosureState, dispatchDisclosure] = useReducer(
    reduceContextCompactionDisclosureState,
    { defaultExpanded: inConversation, descriptorKey, record },
    createContextCompactionDisclosureState,
  );

  useEffect(() => {
    dispatchDisclosure(inConversation
      ? { type: 'expand', descriptorKey, record }
      : { type: 'reset' });
  }, [descriptorKey, inConversation, record]);

  const disclosureRecord = record?.present ? record : disclosureState.resolvedRecord;
  const disclosureKey = disclosureRecord?.sourceKey || descriptorKey;
  const expanded = descriptor?.present === true
    && disclosureState.expandedKey === disclosureKey;
  const rootClassName = useMemo(() => [
    styles.cacheSection,
    styles.cacheSectionBordered,
    styles.compactionSection,
    inConversation ? styles.compactionSectionInConversation : '',
    inDrawer ? styles.compactionSectionInDrawer : '',
  ].filter(Boolean).join(' '), [inConversation, inDrawer]);

  if (!descriptor?.present) return null;

  return (
    <div className={rootClassName}>
      <div className={styles.compactionRow}>
        <div className={`${styles.cacheSectionLabel} ${styles.compactionLabel}`}>
          {t('ui.contextCompaction')}
        </div>
        {descriptor.summary && (
          <Tooltip
            title={<div className={styles.compactionSummaryTooltip} dir="auto">{descriptor.summary}</div>}
            trigger={['hover', 'focus', 'click']}
            placement="bottom"
            styles={{ root: { maxWidth: 560 } }}
          >
            <button type="button" className={styles.compactionSummaryButton} dir="auto">
              <span className={styles.compactionSummaryText}>{descriptor.summary}</span>
            </button>
          </Tooltip>
        )}
        {descriptor.truncated && (
          <span className={styles.compactionTruncated} title={t('ui.contextCompactionSummaryTruncated')}>
            {t('ui.contextCompactionSummaryTruncated')}
          </span>
        )}
        <button
          type="button"
          className={styles.compactionPromptToggle}
          aria-expanded={expanded}
          aria-controls={promptRegionId}
          onClick={() => {
            if (expanded) {
              dispatchDisclosure({ type: 'collapse' });
              return;
            }
            const nextRecord = record?.present ? record : resolveRecord?.();
            dispatchDisclosure({ type: 'expand', descriptorKey, record: nextRecord });
          }}
        >
          [{t(expanded ? 'ui.contextCompactionHidePrompts' : 'ui.contextCompactionShowPrompts')}]
        </button>
      </div>
      {expanded && (
        <CompactionPromptHistory
          id={promptRegionId}
          prompts={disclosureRecord?.prompts}
          recordKey={disclosureKey}
          inDrawer={inDrawer}
        />
      )}
    </div>
  );
}
