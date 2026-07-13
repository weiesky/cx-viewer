import React, { useEffect, useMemo, useState, useRef, useId } from 'react';
import { Popover, Button, Alert, Modal, Tooltip, Dropdown, Space, message } from 'antd';
import { ReloadOutlined, PlusOutlined, FolderOpenOutlined, FileZipOutlined, FileMarkdownOutlined, SettingOutlined } from '@ant-design/icons';
import { parseToolXmlList, extractLoadedSkills } from '../../utils/helpers';
import { extractLoadedTools } from '../../utils/requestTools';
import { contextSeverityColor } from '../../utils/formatters';
import { BUILTIN_SKILL_NAMES, countSkillWarningCandidates, mergeActiveSkills } from '../../utils/skillsParser';
import { t } from '../../i18n';
import { apiUrl } from '../../utils/apiUrl';
import { renderMemoryMarkdown } from '../../utils/markdown';
import { isMobile } from '../../env';
import ConceptHelp from '../common/ConceptHelp';
import ToolsHelp from '../common/ToolsHelp';
import OpenFolderIcon from '../common/OpenFolderIcon';
import { parseMemoryLink } from '../../utils/memoryLinkParser';
import { extractCurrentContextCompaction, extractCurrentContextCompactionRecord } from '../../utils/contextCompaction';
import CompactionPromptHistory from './CompactionPromptHistory';
import styles from './CachePopoverContent.module.css';
import sharedChrome from '../common/sharedChrome.module.css';

// 移动端（含 iPad）：chip 描述用 click → 全屏 Modal 而非 hover Popover。
// 手机抽屉有 zoom: 0.6 缩放，antd Popover 的 getBoundingClientRect 在 zoom 容器内会错位；
// Modal portal 到 document.body 逃出 zoom 容器，定位恢复正确。iPad 抽屉 zoom: 1
// 不受 Popover 影响，但为保持移动端交互一致同样走 click → Modal 路径。

// webkitdirectory 仅 Chromium 系（Chrome/Edge）+ 桌面版 Firefox/Safari 部分支持； 
// iOS Safari / 某些移动浏览器不支持，提前 detect 隐藏"添加文件夹"项避免静默失败。
// SSR 安全：window 不存在时为 false（fallback 到不显示文件夹入口）。
const SUPPORTS_DIRECTORY_UPLOAD = typeof document !== 'undefined'
  && 'webkitdirectory' in document.createElement('input');

// 头部 token 血条 hover/click 弹层的纯展示组件。父级负责：
// (a) 用 isOpen 条件挂载（父级把 popover/抽屉的 open 状态映射到是否渲染本组件 vs 占位 div），
//     以保留 commit 0914cc5 的"hover 才解析 200 条 system-reminder"性能修复；
// (b) 提供 fsSkills / memory 数据 props（父级 fetch + state 三态契约 null/false/数据）；
// (c) 透传 onOpenMemoryDetail（父级 mount 一份 MemoryDetailModal 处理）和 onOpenSkillsModal；
// 解析结果（lastToolsRef/lastParsedTools/lastSkillsRef/lastChosenForSkills）通过 useRef 保留在组件实例内，与 AppHeader 旧版同语义。
export default function CachePopoverContent({
  requests = [],
  toolRequests = null,
  contextCompactionRequests = null,
  contextCompactionAnchorEpoch = null,
  contextPercent = 0,
  contextTokens = 0,
  fsSkills,
  memory,
  codexMd,
  onOpenMemoryDetail,
  onOpenCodexMd,
  onOpenSkillsModal,
  onRefreshMemory,
  onSkillImported,
  onToolsCatalogOpenChange,
  memoryRefreshing = false,
  inDrawer = false,
  contextCompactionSuppressed = false,
  contextCompactionExcludedEpoch = null,
}) {
  const skillFileInputRef = useRef(null);
  const skillFolderInputRef = useRef(null);

  // skill 上传：dropdown 三入口（文件夹 / .zip / SKILL.md）共用 postSkillImport。
  // 文件夹入口先在前端校验根目录有 SKILL.md（忽略大小写），再用 JSZip 打成 zip 复用 zip 通道。
  const postSkillImport = async (file) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const resp = await fetch(apiUrl('/api/skills/import'), { method: 'POST', body: form });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        let reason = data.error || resp.statusText;
        if (data.code === 'INVALID_TYPE') reason = t('ui.skills.invalidType');
        else if (data.code === 'MISSING_SKILL_MD') reason = t('ui.skills.zipMissingSkillMd');
        message.error(t('ui.skills.uploadFailed', { reason }));
        return;
      }
      message.success(t('ui.skills.uploadSuccess'));
      onSkillImported?.();
    } catch (err) {
      message.error(t('ui.skills.uploadFailed', { reason: err?.message || 'network' }));
    }
  };

  const handleSkillFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.md')) {
      message.error(t('ui.skills.invalidType'));
      return;
    }
    await postSkillImport(file);
  };

  const handleSkillFolderSelected = async (e) => {
    const fileList = e.target.files;
    e.target.value = '';
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const hasRootSkillMd = files.some(f => {
      const parts = (f.webkitRelativePath || '').split('/');
      return parts.length === 2 && parts[1].toLowerCase() === 'skill.md';
    });
    if (!hasRootSkillMd) {
      message.error(t('ui.skills.folderMissingSkillMd'));
      return;
    }
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const f of files) {
        const rel = f.webkitRelativePath || f.name;
        if (!rel || rel.includes('..')) continue;
        zip.file(rel, f);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const rootName = (files[0].webkitRelativePath || '').split('/')[0] || 'skill';
      const zipFile = new File([blob], `${rootName}.zip`, { type: 'application/zip' });
      await postSkillImport(zipFile);
    } catch (err) {
      message.error(t('ui.skills.uploadFailed', { reason: err?.message || 'pack failed' }));
    }
  };
  // 手机端 chip 描述 Modal 的当前条目；null = 关。{ title, description } 形态由 chip render 函数填入。
  const [chipModal, setChipModal] = useState(null);
  const [expandedCompactionKey, setExpandedCompactionKey] = useState(null);
  const compactionPromptRegionId = useId();

  const lastToolsRef = useRef(null);
  const lastParsedTools = useRef(null);
  const lastSkillsRef = useRef(null);
  const lastChosenForSkills = useRef(null);

  // Tool identity follows the raw request stream, including the current
  // in-progress MainAgent frame. `requests` is the visible list and excludes
  // that frame, which previously made the section fall back or disappear.
  const loadedTools = useMemo(
    () => extractLoadedTools(toolRequests || requests),
    [toolRequests, requests],
  );
  const contextCompaction = useMemo(
    () => extractCurrentContextCompaction(contextCompactionRequests || requests, {
      suppressed: contextCompactionSuppressed,
      excludedEpoch: contextCompactionExcludedEpoch,
      anchorEpoch: contextCompactionAnchorEpoch,
    }),
    [contextCompactionRequests, requests, contextCompactionSuppressed, contextCompactionExcludedEpoch, contextCompactionAnchorEpoch],
  );
  const compactionDescriptorKey = contextCompaction.sourceKey
    || `${contextCompactionAnchorEpoch || 'current'}:${contextCompaction.count}`;
  const compactionResolutionRequested = contextCompaction.present && expandedCompactionKey !== null;
  const contextCompactionRecord = useMemo(
    () => (compactionResolutionRequested
      ? extractCurrentContextCompactionRecord(contextCompactionRequests || requests, {
        suppressed: contextCompactionSuppressed,
        excludedEpoch: contextCompactionExcludedEpoch,
        anchorEpoch: contextCompactionAnchorEpoch,
      })
      : null),
    [compactionResolutionRequested, contextCompactionRequests, requests, contextCompactionSuppressed, contextCompactionExcludedEpoch, contextCompactionAnchorEpoch],
  );
  const resolvedCompactionDisclosureKey = contextCompactionRecord?.sourceKey || compactionDescriptorKey;
  const compactionPromptsExpanded = contextCompaction.present
    && expandedCompactionKey === resolvedCompactionDisclosureKey;
  useEffect(() => {
    if (expandedCompactionKey !== null && contextCompactionRecord?.sourceKey
        && expandedCompactionKey !== resolvedCompactionDisclosureKey) {
      setExpandedCompactionKey(null);
    }
  }, [expandedCompactionKey, contextCompactionRecord?.sourceKey, resolvedCompactionDisclosureKey]);

  // 血条弹层展示当前 MainAgent 会话已载入的工具；缺失声明的 delta 使用滚动快照。
  const toolsArr = loadedTools.length > 0
    ? loadedTools
    : null;
  let parsed;
  if (toolsArr === lastToolsRef.current && lastParsedTools.current) {
    parsed = lastParsedTools.current;
  } else {
    parsed = parseToolXmlList(toolsArr);
    lastToolsRef.current = toolsArr;
    lastParsedTools.current = parsed;
  }
  const { builtin, mcpByServer } = parsed;
  const hasBuiltin = builtin.length > 0;
  const hasMcp = mcpByServer.size > 0;

  // skills 缓存：以「被选中的 MainAgent 请求引用」为 key，live-tail 追加时不重扫
  const chosenForSkills = (() => {
    if (!Array.isArray(requests) || requests.length === 0) return null;
    if (requests.length === 1) return requests[0];
    for (let i = requests.length - 1; i >= 0; i--) {
      const r = requests[i];
      if (r && r.type !== 'teammate' && r.type !== 'subAgent') return r;
    }
    return null;
  })();
  if (chosenForSkills !== lastChosenForSkills.current) {
    lastSkillsRef.current = extractLoadedSkills(requests);
    lastChosenForSkills.current = chosenForSkills;
  }
  const historicalSkills = (lastSkillsRef.current || []).filter(s => !BUILTIN_SKILL_NAMES.has(s.name));
  const mergedSkills = mergeActiveSkills(fsSkills, lastSkillsRef.current || []);
  const skills = mergedSkills !== null ? mergedSkills : historicalSkills;
  const hasSkills = skills.length > 0;
  const skillCountIsAuthoritative = Array.isArray(fsSkills);
  const warningSkillCount = countSkillWarningCandidates(fsSkills, historicalSkills);

  const renderBuiltinChip = ({ name, description }) => {
    const title = [name, description].filter(Boolean).join('\n\n');
    const chip = <span className={sharedChrome.cacheToolChip} title={title}>{name}</span>;
    return <ConceptHelp key={name} doc={`Tool-${name}`}>{chip}</ConceptHelp>;
  };
  const renderChipPopoverContent = (description) => (
    description
      ? <div className={styles.chipDetailBody}>{description}</div>
      : <div className={`${styles.chipDetailBody} ${styles.chipDetailEmpty}`}>{t('ui.noDescription')}</div>
  );
  // PC：hover 触发 antd Popover；移动端（含 iPad）：click 触发全屏 Modal。
  const renderMcpChip = ({ name, fullName, description }) => {
    if (isMobile) {
      return (
        <span
          key={fullName}
          className={sharedChrome.cacheToolChip}
          role="button"
          tabIndex={0}
          onClick={() => setChipModal({ title: fullName, description })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChipModal({ title: fullName, description }); } }}
        >
          {name}
        </span>
      );
    }
    return (
      <Popover
        key={fullName}
        title={fullName}
        content={renderChipPopoverContent(description)}
        overlayStyle={{ maxWidth: 480 }}
        mouseEnterDelay={0.2}
      >
        <span className={sharedChrome.cacheToolChip}>{name}</span>
      </Popover>
    );
  };
  const renderSkillChip = ({ name, description }) => {
    if (isMobile) {
      return (
        <span
          key={name}
          className={sharedChrome.cacheToolChip}
          role="button"
          tabIndex={0}
          onClick={() => setChipModal({ title: name, description })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChipModal({ title: name, description }); } }}
        >
          {name}
        </span>
      );
    }
    return (
      <Popover
        key={name}
        title={name}
        content={renderChipPopoverContent(description)}
        overlayStyle={{ maxWidth: 480 }}
        mouseEnterDelay={0.2}
      >
        <span className={sharedChrome.cacheToolChip}>{name}</span>
      </Popover>
    );
  };

  // 拦截记忆区块内的 <a> 点击：仅对 memories root 内的生成 Markdown 触发明细 Modal。
  const handleMemoryLinkClick = (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const hrefRaw = a.getAttribute('href') || '';
    const r = parseMemoryLink(hrefRaw, memory?.file || 'MEMORY.md');
    if (r.allow) return;
    e.preventDefault();
    if (r.open) onOpenMemoryDetail?.(r.open);
  };

  const builtinBody = (
    <div className={sharedChrome.toolChipGrid}>{builtin.map(renderBuiltinChip)}</div>
  );
  const mcpBody = (
    <div className={styles.toolChipGridVertical}>
      {Array.from(mcpByServer.entries()).map(([server, tools]) => (
        <div key={server} className={styles.mcpServerGroup}>
          <div className={styles.mcpServerName}>{server} ({tools.length})</div>
          <div className={sharedChrome.toolChipGrid}>{tools.map(renderMcpChip)}</div>
        </div>
      ))}
    </div>
  );
  const skillsBody = (
    <div className={sharedChrome.toolChipGrid}>{skills.map(renderSkillChip)}</div>
  );

  const skillsAction = (onOpenSkillsModal || onSkillImported) ? (
    <>
      <Space size={6}>
        {onSkillImported && (
          // 移动端（含 iPad）抽屉里去掉 Dropdown，直接 Button onClick → 文件选择器（仅 .zip/.md）。
          // 文件夹入口在移动端浏览器普遍不支持 webkitdirectory，已被 SUPPORTS_DIRECTORY_UPLOAD 兜底。
          isMobile ? (
            <Button size="small" icon={<PlusOutlined />} onClick={() => skillFileInputRef.current?.click()}>
              {t('ui.skills.add')}
            </Button>
          ) : (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  ...(SUPPORTS_DIRECTORY_UPLOAD ? [{ key: 'folder', icon: <FolderOpenOutlined />, label: t('ui.skills.addFolder'), onClick: () => skillFolderInputRef.current?.click() }] : []),
                  { key: 'zip', icon: <FileZipOutlined />, label: t('ui.skills.addZip'), onClick: () => skillFileInputRef.current?.click() },
                  { key: 'md', icon: <FileMarkdownOutlined />, label: t('ui.skills.addMd'), onClick: () => skillFileInputRef.current?.click() },
                ],
              }}
            >
              <Button size="small" icon={<PlusOutlined />}>{t('ui.skills.add')}</Button>
            </Dropdown>
          )
        )}
        {onOpenSkillsModal && (
          <Button size="small" icon={<SettingOutlined />} onClick={() => onOpenSkillsModal()}>
            {t('ui.skillManage')}
          </Button>
        )}
      </Space>
      {/* 隐藏文件输入放在 Space 外：否则它们会作为 flex item 在两个按钮间额外撑出 gap。 */}
      {onSkillImported && (
        <>
          <input
            type="file"
            ref={skillFileInputRef}
            style={{ display: 'none' }}
            accept=".zip,.md"
            onChange={handleSkillFileSelected}
          />
          {SUPPORTS_DIRECTORY_UPLOAD && !isMobile && (
            <input
              type="file"
              ref={skillFolderInputRef}
              style={{ display: 'none' }}
              webkitdirectory=""
              directory=""
              onChange={handleSkillFolderSelected}
            />
          )}
        </>
      )}
    </>
  ) : null;

  // AGENTS.md 三态：null=loading / false=error / [] 隐藏整段 / [...] 渲染 chip 列表。
  // 与 memory 不同：空列表（项目+全局都没有 AGENTS.md）直接隐藏整个 section 减少视觉噪声。
  const codexMdVisible = codexMd === null || codexMd === false
    || (Array.isArray(codexMd) && codexMd.length > 0);

  const codexMdBody = (() => {
    if (codexMd === null) return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryLoading')}</div>;
    if (codexMd === false) return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryLoadError')}</div>;
    if (!Array.isArray(codexMd) || codexMd.length === 0) return null;
    return (
      <div className={sharedChrome.toolChipGrid}>
        {codexMd.map((entry) => {
          const scopeLabel = entry.scope === 'global'
            ? t('ui.codexMdScopeGlobal')
            : t('ui.codexMdScopeProject');
          const badgeClass = entry.scope === 'global'
            ? `${styles.cacheChipBadge} ${styles.cacheChipBadgeGlobal}`
            : `${styles.cacheChipBadge} ${styles.cacheChipBadgeProject}`;
          return (
            <button
              key={entry.id}
              type="button"
              className={styles.codexMdChip}
              title={entry.tail}
              onClick={() => onOpenCodexMd?.(entry.id, entry.tail, entry.scope)}
            >
              <span className={badgeClass}>{scopeLabel}</span>
              <span>{entry.tail}</span>
            </button>
          );
        })}
      </div>
    );
  })();

  const memoryBody = (() => {
    if (memory === null) return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryLoading')}</div>;
    if (memory === false) return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryLoadError')}</div>;
    if (memory.status === 'disabled') return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryDisabled')}</div>;
    if (memory.status === 'unsupported') return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryUnsupported')}</div>;
    if (memory.status === 'missing') return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryNotFound')}</div>;
    if (memory.status === 'error') return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryLoadError')}</div>;
    if (!memory.content || !memory.content.trim()) {
      return <div className={`${sharedChrome.cachePopoverEmpty} ${styles.memoryStatus}`}>{t('ui.memoryEmpty')}</div>;
    }
    return (
      <>
        {memory.enabled === false && <Alert type="warning" showIcon banner message={t('ui.memoryDisabledWithData')} />}
        <div
          className={sharedChrome.memoryMarkdown}
          onClick={handleMemoryLinkClick}
          dangerouslySetInnerHTML={{ __html: renderMemoryMarkdown(memory.content) }}
        />
      </>
    );
  })();

  // Shared thresholds (75/55) — this chip previously used 80/60 and could
  // disagree in color with the header bar feeding it the same percentage.
  const ctxColor = contextSeverityColor(contextPercent);
  const cacheUsageText = contextTokens > 0
    ? `${(contextTokens / 1000).toFixed(1)}K (${contextPercent}%)`
    : `${contextPercent}%`;
  return (
    <div className={styles.cachePopover}>
      <div className={styles.cachePopoverHeader}>
        <div className={styles.cachePopoverTitle}>
          <span className={styles.cacheUsageLabel}>{t('ui.contextUsage')}</span>
          <span className={styles.cachePercent} style={{ color: ctxColor }}>{cacheUsageText}</span>
        </div>
      </div>
      <div className={inDrawer ? styles.cacheScrollAreaInDrawer : styles.cacheScrollArea}>
        {contextCompaction.present && (
          <div className={`${styles.cacheSection} ${styles.cacheSectionBordered} ${styles.compactionSection}`}>
            <div className={styles.compactionRow}>
              <div className={`${styles.cacheSectionLabel} ${styles.compactionLabel}`}>
                {t('ui.contextCompaction')}
              </div>
              {contextCompaction.summary && (
                <Tooltip
                  title={<div className={styles.compactionSummaryTooltip} dir="auto">{contextCompaction.summary}</div>}
                  trigger={['hover', 'focus', 'click']}
                  placement="bottom"
                  styles={{ root: { maxWidth: 560 } }}
                >
                  <button type="button" className={styles.compactionSummaryButton} dir="auto">
                    <span className={styles.compactionSummaryText}>{contextCompaction.summary}</span>
                  </button>
                </Tooltip>
              )}
              {contextCompaction.truncated && (
                <span className={styles.compactionTruncated} title={t('ui.contextCompactionSummaryTruncated')}>
                  {t('ui.contextCompactionSummaryTruncated')}
                </span>
              )}
              <button
                type="button"
                className={styles.compactionPromptToggle}
                aria-expanded={compactionPromptsExpanded}
                aria-controls={compactionPromptRegionId}
                onClick={() => {
                  if (compactionPromptsExpanded) {
                    setExpandedCompactionKey(null);
                    return;
                  }
                  const record = contextCompactionRecord || extractCurrentContextCompactionRecord(
                    contextCompactionRequests || requests,
                    {
                      suppressed: contextCompactionSuppressed,
                      excludedEpoch: contextCompactionExcludedEpoch,
                      anchorEpoch: contextCompactionAnchorEpoch,
                    },
                  );
                  setExpandedCompactionKey(record?.sourceKey || compactionDescriptorKey);
                }}
              >
                [{t(compactionPromptsExpanded ? 'ui.contextCompactionHidePrompts' : 'ui.contextCompactionShowPrompts')}]
              </button>
            </div>
            {compactionPromptsExpanded && (
              <CompactionPromptHistory
                id={compactionPromptRegionId}
                prompts={contextCompactionRecord?.prompts}
                recordKey={contextCompactionRecord?.sourceKey || resolvedCompactionDisclosureKey}
                inDrawer={inDrawer}
              />
            )}
          </div>
        )}
        {hasBuiltin && (
          <div className={`${styles.cacheSection} ${styles.cacheSectionBordered}`}>
            {/* 点标题也可打开「所有工具」目录(zIndex 抬到 1100 盖住血条 Popover;不改文案颜色) */}
            <ToolsHelp zIndex={1100} onOpenChange={onToolsCatalogOpenChange}>
              <div className={styles.cacheSectionLabel} role="button" tabIndex={0} title={t('ui.toolCatalog.help')}>
                {t('ui.builtinTools')} ({builtin.length})
              </div>
            </ToolsHelp>
            {builtinBody}
          </div>
        )}
        {hasMcp && (() => {
          // MCP 过载告警：编组 >4 且子工具 >50 时，在标题位提示初始上下文占用 + 污染风险
          const mcpToolCount = Array.from(mcpByServer.values()).reduce((n, arr) => n + arr.length, 0);
          const mcpOverloaded = mcpByServer.size > 4 && mcpToolCount > 50;
          return (
            <div className={`${styles.cacheSection} ${styles.cacheSectionBordered}`}>
              <div className={styles.cacheSectionHeader}>
                <div className={styles.cacheSectionLabel}>
                  {t('ui.mcpTools')} ({mcpToolCount})
                </div>
                {mcpOverloaded && (
                  <Alert
                    type="warning"
                    showIcon
                    banner
                    message={t('ui.mcpWarnOverload')}
                    style={{ marginRight: 'auto', padding: '2px 8px', fontSize: 11 }}
                  />
                )}
              </div>
              {mcpBody}
            </div>
          );
        })()}
        {hasSkills && (
          <div className={`${styles.cacheSection} ${styles.cacheSectionBordered}`}>
            <div className={styles.cacheSectionHeader}>
              <div className={styles.cacheSectionLabel}>
                {t('ui.loadedSkills')} ({skills.length})
                {skillCountIsAuthoritative && (
                  <span className={styles.skillCountBreakdown}>
                    {' · '}{t('ui.skillSource.user')}/{t('ui.skillSource.project')}: {warningSkillCount}
                  </span>
                )}
              </div>
              {warningSkillCount > 20 ? (
                <Alert
                  type="error"
                  showIcon
                  banner
                  message={t('ui.skillsWarnPollution')}
                  style={{ marginRight: 'auto', padding: '2px 8px', fontSize: 11 }}
                />
              ) : warningSkillCount > 10 ? (
                <Alert
                  type="warning"
                  showIcon
                  banner
                  message={t('ui.skillsWarnOveruse')}
                  style={{ marginRight: 'auto', padding: '2px 8px', fontSize: 11 }}
                />
              ) : null}
              {skillsAction}
            </div>
            {skillsBody}
          </div>
        )}
        {codexMdVisible && (
          <div className={`${styles.cacheSection} ${styles.cacheSectionBordered}`}>
            <div className={styles.cacheSectionHeader}>
              <div className={styles.cacheSectionLabel}>
                {t('ui.codexMdSection')}{Array.isArray(codexMd) ? ` (${codexMd.length})` : ''}
              </div>
            </div>
            {codexMdBody}
          </div>
        )}
        <div className={`${styles.cacheSection} ${styles.cacheSectionBordered}`}>
          <div className={styles.cacheSectionHeader}>
            <div className={`${styles.cacheSectionLabel} ${styles.memoryLabelWithIcon}`}>
              {memory && memory !== false && memory.directoryExists && (
                <OpenFolderIcon apiEndpoint={apiUrl('/api/open-codex-memories-dir')} title={t('ui.memoryOpenDir')} size={14} />
              )}
              {t('ui.persistentMemory')}
            </div>
            {onRefreshMemory && (() => {
              // 三态契约 → 刷新按钮的 disable / tooltip 决策：
              //   null  = lazy-load 进行中     → disabled + 提示"加载中"
              //   false = lazy-load 失败       → enabled（允许重试）
              //   disabled/unsupported/missing → enabled（配置或后台生成后可主动重查）
              //   ready                        → enabled（正常重读磁盘）
              const isLoading = memory === null;
              const isMissingFile = memory && memory.status === 'missing';
              const refreshDisabled = isLoading;
              const tooltipTitle = isLoading ? t('ui.memoryLoading')
                : isMissingFile ? t('ui.memoryNotFound')
                : '';
              const btn = (
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={memoryRefreshing}
                  disabled={refreshDisabled}
                  onClick={onRefreshMemory}
                >
                  {t('ui.memoryRefresh')}
                </Button>
              );
              // antd v5 disabled Button 不响应 mouse events，Tooltip 需 span 包裹才能触发；
              // enabled 时无需 span 包裹，避免拦截 button click。
              if (!tooltipTitle) return btn;
              return (
                <Tooltip title={tooltipTitle}>
                  {refreshDisabled ? <span>{btn}</span> : btn}
                </Tooltip>
              );
            })()}
          </div>
          {memoryBody}
        </div>
      </div>
      {/* 手机 chip 描述 Modal：portal 到 document.body 逃出 mobileCachePanelInner zoom: 0.6 容器。
          zIndex 1101 比 MemoryDetailModal (1100) 高 1，避免两者同时打开时视觉层级未定义。 */}
      {chipModal && (
        <Modal
          open={true}
          title={chipModal.title}
          onCancel={() => setChipModal(null)}
          footer={null}
          width="92vw"
          zIndex={1101}
          destroyOnClose
        >
          {chipModal.description
            ? <div className={styles.chipDetailBody}>{chipModal.description}</div>
            : <div className={`${styles.chipDetailBody} ${styles.chipDetailEmpty}`}>{t('ui.noDescription')}</div>}
        </Modal>
      )}
    </div>
  );
}
