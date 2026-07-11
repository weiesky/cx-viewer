import React, { useMemo } from 'react';
import { formatTokenCount, computeTokenStats, computeToolUsageStats, computeSkillUsageStats } from '../../utils/helpers';
import { classifyRequest } from '../../utils/requestType';
import ConceptHelp from '../common/ConceptHelp';
import ToolsHelp from '../common/ToolsHelp';
import { t } from '../../i18n';
import headerStyles from '../common/sharedChrome.module.css';
import styles from './MobileStats.module.css';

export default function MobileStats({ requests = [], visible, onClose }) {
  const { byModel, models, toolStats, skillStats, subAgentEntries, hasSubAgentStats, teammateEntries, hasTeammateStats, isEmpty } = useMemo(() => {
    const byModel = computeTokenStats(requests);
    const models = Object.keys(byModel);
    const toolStats = computeToolUsageStats(requests);
    const skillStats = computeSkillUsageStats(requests);

    const subAgentCounts = {};
    const teammateCounts = {};
    for (let i = 0; i < requests.length; i++) {
      const cls = classifyRequest(requests[i], requests[i + 1]);
      if (cls.type === 'SubAgent') {
        const label = cls.subType || 'Other';
        subAgentCounts[label] = (subAgentCounts[label] || 0) + 1;
      } else if (cls.type === 'Teammate') {
        const label = cls.subType || 'Teammate';
        teammateCounts[label] = (teammateCounts[label] || 0) + 1;
      }
    }
    const subAgentEntries = Object.entries(subAgentCounts).sort((a, b) => b[1] - a[1]);
    const hasSubAgentStats = subAgentEntries.length > 0;
    const teammateEntries = Object.entries(teammateCounts).sort((a, b) => b[1] - a[1]);
    const hasTeammateStats = teammateEntries.length > 0;

    const isEmpty = models.length === 0 && toolStats.length === 0 && !hasSubAgentStats && !hasTeammateStats && skillStats.length === 0;

    return { byModel, models, toolStats, skillStats, subAgentEntries, hasSubAgentStats, teammateEntries, hasTeammateStats, isEmpty };
  }, [requests]);

  if (!visible) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>{t('ui.tokenStats')}</span>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className={styles.content}>
        {isEmpty ? (
          <div className={styles.empty}>—</div>
        ) : (
          <>
            {/* 1. Skill Usage Stats */}
            {skillStats.length > 0 && (
              <div className={headerStyles.modelCard}>
                <div className={headerStyles.modelName}>{t('ui.skillUsageStats')}</div>
                <table className={headerStyles.statsTable}>
                  <thead>
                    <tr>
                      <td className={`${headerStyles.th} ${styles.thLeft}`}>{t('ui.stats.skill')}</td>
                      <td className={headerStyles.th}>{t('ui.stats.count')}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {skillStats.map(([name, count]) => (
                      <tr key={name} className={headerStyles.rowBorder}>
                        <td className={headerStyles.label}>{name}</td>
                        <td className={headerStyles.td}>{count}</td>
                      </tr>
                    ))}
                    {skillStats.length > 1 && (
                      <tr className={headerStyles.rebuildTotalRow}>
                        <td className={headerStyles.label}>{t('ui.stats.total')}</td>
                        <td className={headerStyles.td}>{skillStats.reduce((s, e) => s + e[1], 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. SubAgent Stats */}
            {hasSubAgentStats && (
              <div className={headerStyles.modelCard}>
                <div className={headerStyles.modelName}>{t('ui.subAgentStats')}</div>
                <table className={headerStyles.statsTable}>
                  <thead>
                    <tr>
                      <td className={`${headerStyles.th} ${styles.thLeft}`}>{t('ui.stats.subAgent')}</td>
                      <td className={headerStyles.th}>{t('ui.stats.count')}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {subAgentEntries.map(([name, count]) => (
                      <tr key={name} className={headerStyles.rowBorder}>
                        <td className={headerStyles.label}>{name} <ConceptHelp doc={`SubAgent-${name}`} /></td>
                        <td className={headerStyles.td}>{count}</td>
                      </tr>
                    ))}
                    {subAgentEntries.length > 1 && (
                      <tr className={headerStyles.rebuildTotalRow}>
                        <td className={headerStyles.label}>{t('ui.stats.total')}</td>
                        <td className={headerStyles.td}>{subAgentEntries.reduce((s, e) => s + e[1], 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2.5 Teammate Stats */}
            {hasTeammateStats && (
              <div className={headerStyles.modelCard}>
                <div className={headerStyles.modelName}>{t('ui.teammateStats.title')}</div>
                <table className={headerStyles.statsTable}>
                  <thead>
                    <tr>
                      <td className={`${headerStyles.th} ${styles.thLeft}`}>{t('ui.teammateStats.name')}</td>
                      <td className={headerStyles.th}>{t('ui.stats.count')}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {teammateEntries.map(([name, count]) => (
                      <tr key={name} className={headerStyles.rowBorder}>
                        <td className={headerStyles.label}>{name}</td>
                        <td className={headerStyles.td}>{count}</td>
                      </tr>
                    ))}
                    {teammateEntries.length > 1 && (
                      <tr className={headerStyles.rebuildTotalRow}>
                        <td className={headerStyles.label}>{t('ui.stats.total')}</td>
                        <td className={headerStyles.td}>{teammateEntries.reduce((s, e) => s + e[1], 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Tool Usage Stats */}
            {toolStats.length > 0 && (
              <div className={headerStyles.modelCard}>
                <div className={headerStyles.modelName}>{t('ui.toolUsageStats')} <ToolsHelp /></div>
                <table className={headerStyles.statsTable}>
                  <thead>
                    <tr>
                      <td className={`${headerStyles.th} ${styles.thLeft}`}>{t('ui.stats.tool')}</td>
                      <td className={headerStyles.th}>{t('ui.stats.count')}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {toolStats.map(([name, count]) => (
                      <tr key={name} className={headerStyles.rowBorder}>
                        <td className={headerStyles.label}>{name} <ConceptHelp doc={`Tool-${name}`} /></td>
                        <td className={headerStyles.td}>{count}</td>
                      </tr>
                    ))}
                    {toolStats.length > 1 && (
                      <tr className={headerStyles.rebuildTotalRow}>
                        <td className={headerStyles.label}>{t('ui.stats.total')}</td>
                        <td className={headerStyles.td}>{toolStats.reduce((s, e) => s + e[1], 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Token Stats per Model */}
            {models.map((model) => {
              const s = byModel[model];
              return (
                <div key={model} className={headerStyles.modelCard}>
                  <div className={headerStyles.modelName}>{model}</div>
                  <table className={headerStyles.statsTable}>
                    <tbody>
                      <tr>
                        <td className={headerStyles.label}>{t('ui.stats.token')}</td>
                        <td className={headerStyles.th}>{t('ui.stats.input')}</td>
                        <td className={headerStyles.th}>{t('ui.stats.output')}</td>
                      </tr>
                      <tr className={headerStyles.rowBorder}>
                        <td className={headerStyles.label}></td>
                        <td className={headerStyles.td}>{formatTokenCount(s.input)}</td>
                        <td className={headerStyles.td}>{formatTokenCount(s.output)}</td>
                      </tr>
                      <tr>
                        <td className={headerStyles.label}>{t('ui.stats.cache')}</td>
                        <td className={headerStyles.th}>{t('ui.stats.cacheRead')}</td>
                        <td className={headerStyles.th}>{t('ui.stats.cacheWrite')}</td>
                      </tr>
                      <tr className={headerStyles.rowBorder}>
                        <td className={headerStyles.label}></td>
                        <td className={headerStyles.td}>{formatTokenCount(s.cacheRead)}</td>
                        <td className={headerStyles.td}>{formatTokenCount(s.cacheWrite)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
