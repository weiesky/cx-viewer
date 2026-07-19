import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Typography, Empty, Switch, Button, message } from 'antd';
import { RightOutlined, DownOutlined, CopyOutlined } from '@ant-design/icons';
import { renderMarkdown } from '../../utils/markdown';
import { t } from '../../i18n';
import { getContextSidebarArrowNavigation } from '../../utils/contextSidebarNavigation';
import { buildContextItemRawText } from '../../utils/contextRaw';
import { computeToolsDiff } from '../../utils/toolsDiff';
import JsonViewer from '../viewers/JsonViewer';
import ConceptHelp from '../common/ConceptHelp';
import { getResponseInstructions, getResponseTools, isResponseConfigInputItem } from '../../../lib/openai-body.js';

import styles from './ContextTab.module.css';

const { Text } = Typography;

// ── Block parsers ─────────────────────────────────────────────────────────────

function parseContentBlocks(content) {
  if (content == null) return [];

  if (typeof content === 'string') {
    const trimmed = content.trim();
    return trimmed ? [{ type: 'markdown', text: trimmed }] : [];
  }

  if (Array.isArray(content)) {
    const blocks = [];
    for (const block of content) {
      if (!block) continue;
      if (block.type === 'text' || block.type === 'input_text' || block.type === 'output_text') {
        const text = block.text ?? block.input_text ?? block.output_text ?? '';
        const trimmed = typeof text === 'string' ? text.trim() : '';
        if (trimmed) blocks.push({ type: 'markdown', text: trimmed, label: block.type });
      } else if (block.type === 'tool_use') {
        blocks.push({
          type: 'tool_use',
          name: block.name || 'unknown',
          id: block.id || '',
          input: block.input ?? {},
        });
      } else if (block.type === 'tool_result') {
        const inner = parseResultContent(block.content);
        blocks.push({
          type: 'tool_result',
          tool_use_id: block.tool_use_id || '',
          is_error: block.is_error,
          content: inner,
        });
      } else if (block.type === 'thinking') {
        const text = block.thinking || '';
        if (text.trim()) blocks.push({ type: 'thinking', text });
      } else if (block.type === 'image') {
        blocks.push({ type: 'json', label: 'image', data: block });
      } else {
        blocks.push({ type: 'json', label: block.type || 'block', data: block });
      }
    }
    return blocks;
  }

  return [{ type: 'json', label: 'content', data: content }];
}

function parseResultContent(content) {
  if (content == null) return [];
  if (typeof content === 'string') {
    const trimmed = content.trim();
    return trimmed ? [{ type: 'markdown', text: trimmed }] : [];
  }
  if (Array.isArray(content)) {
    return content.flatMap((c) => {
      if (!c) return [];
      if (c.type === 'text' || c.type === 'input_text' || c.type === 'output_text') {
        const text = c.text ?? c.input_text ?? c.output_text ?? '';
        const trimmed = typeof text === 'string' ? text.trim() : '';
        return trimmed ? [{ type: 'markdown', text: trimmed, label: c.type }] : [];
      }
      return [{ type: 'json', label: c.type || 'block', data: c }];
    });
  }
  return [{ type: 'json', label: 'content', data: content }];
}

function parseInstructionsBlocks(instructions) {
  if (!instructions) return null;
  if (typeof instructions === 'string') {
    return [{ type: 'markdown', text: instructions }];
  }
  if (Array.isArray(instructions)) {
    const blocks = [];
    instructions.forEach((item, i) => {
      if (i > 0) blocks.push({ type: 'separator' });
      if (!item) return;
      if (typeof item === 'string') {
        blocks.push({ type: 'markdown', text: item });
      } else if (item.type === 'text' || item.type === 'input_text' || item.type === 'output_text') {
        const text = item.text ?? item.input_text ?? item.output_text ?? '';
        blocks.push({ type: 'markdown', text, label: item.type });
      } else {
        blocks.push({ type: 'json', label: item.type || 'item', data: item });
      }
    });
    return blocks;
  }
  return [{ type: 'json', label: 'instructions', data: instructions }];
}

function parseToolBlocks(tool) {
  const blocks = [];
  const name = tool?.name || 'unknown';
  const desc = tool?.description || '';
  let md = `### ${name}\n\n`;
  if (desc) md += `${desc}\n\n`;
  blocks.push({ type: 'markdown', text: md });
  const schema = tool?.input_schema || tool?.parameters || null;
  if (schema) {
    blocks.push({ type: 'json', label: 'Parameters', data: schema });
  }
  return blocks;
}

/**
 * Codex embeds exec's child tool declarations in exec.description as Markdown
 * H3 sections. Unlike protocol namespaces this grouping is descriptive rather
 * than a `tools[]` field, but the declared tools still belong under exec.
 */
function parseExecDeclaredTools(tool, toolIndex) {
  if (tool?.type !== 'custom' || tool?.name !== 'exec' || typeof tool.description !== 'string') return [];
  const description = tool.description;
  const headingRe = /^###\s+`([^`]+)`\s*$/gm;
  const matches = Array.from(description.matchAll(headingRe));

  return matches.map((match, childIndex) => {
    const sectionStart = match.index + match[0].length;
    const remaining = description.slice(sectionStart);
    const nextHeading = remaining.search(/^#{2,3}\s+/m);
    const section = (nextHeading >= 0 ? remaining.slice(0, nextHeading) : remaining).trim();
    const declared = {
      type: 'exec_declared_tool',
      name: match[1],
      description: section,
    };
    return {
      id: `tool__${toolIndex}__child__${childIndex}`,
      label: declared.name,
      sublabel: declared.description.split('\n').find((line) => line.trim())?.trim() || undefined,
      blocks: parseToolBlocks(declared),
      raw: declared,
    };
  });
}

// ── Input item parsing ────────────────────────────────────────────────────────

function extractPreviewText(content) {
  if (typeof content === 'string') return content.slice(0, 60).replace(/\n/g, ' ');
  if (Array.isArray(content)) {
    for (const block of content) {
      const text = block?.text ?? block?.input_text ?? block?.output_text;
      if (
        (block?.type === 'text' || block?.type === 'input_text' || block?.type === 'output_text') &&
        typeof text === 'string' &&
        text.trim()
      ) {
        return text.trim().slice(0, 60).replace(/\n/g, ' ');
      }
    }
  }
  return '';
}

function getInputItemType(item) {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return item.type || (item.role ? 'message' : 'input');
  }
  if (Array.isArray(item)) return 'array';
  return typeof item;
}

function parseMaybeJsonString(value) {
  if (typeof value !== 'string') return value ?? {};
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseInputItemBlocks(item) {
  if (item == null) return [];
  if (typeof item === 'string') return parseContentBlocks(item);
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return [{ type: 'json', label: getInputItemType(item), data: item }];
  }

  if (item.type === 'function_call' || item.type === 'tool_use') {
    return [{
      type: 'tool_use',
      name: item.name || 'unknown',
      id: item.call_id || item.id || '',
      input: item.input ?? parseMaybeJsonString(item.arguments),
    }];
  }

  if (item.type === 'function_call_output' || item.type === 'tool_result') {
    return [{
      type: 'tool_result',
      tool_use_id: item.call_id || item.tool_use_id || '',
      is_error: item.is_error,
      content: parseResultContent(item.output ?? item.content),
    }];
  }

  if (Object.prototype.hasOwnProperty.call(item, 'content')) {
    const blocks = parseContentBlocks(item.content);
    if (blocks.length > 0) return blocks;
  }

  if (Object.prototype.hasOwnProperty.call(item, 'output')) {
    const blocks = parseResultContent(item.output);
    if (blocks.length > 0) return blocks;
  }

  return [{ type: 'json', label: getInputItemType(item), data: item }];
}

function extractInputPreview(item) {
  if (item == null) return '';
  if (typeof item === 'string') return extractPreviewText(item);
  if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
  const fromContent = extractPreviewText(item.content);
  if (fromContent) return fromContent;
  if (typeof item.output === 'string') return item.output.slice(0, 60).replace(/\n/g, ' ');
  if (typeof item.arguments === 'string') return item.arguments.slice(0, 60).replace(/\n/g, ' ');
  return item.name || item.type || '';
}

function buildInputItems(input) {
  return input.flatMap((item, index) => {
    if (isResponseConfigInputItem(item)) return [];
    const timestamp = item && typeof item === 'object' ? (item._timestamp || item.timestamp || null) : null;
    return [{
      id: `input__${index}`,
      isInputItem: true,
      inputIndex: index,
      role: item && typeof item === 'object' && !Array.isArray(item) ? item.role : null,
      type: getInputItemType(item),
      timestamp,
      blocks: parseInputItemBlocks(item),
      raw: item,
      preview: extractInputPreview(item),
    }];
  });
}

function formatTurnTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return null;
  }
}

// ── Block renderers ───────────────────────────────────────────────────────────

function TranslatableMarkdown({ text, label = 'text', compact }) {
  const displayHtml = renderMarkdown(text);

  if (compact) {
    return (
      <div className={styles.textBlockCompact}>
        <div className={`chat-md ${styles.markdownBody}`} dangerouslySetInnerHTML={{ __html: displayHtml }} />
      </div>
    );
  }

  return (
    <div className={styles.textBlock}>
      <div className={styles.textBlockBar}>
        <span className={`${styles.blockTag} ${styles.blockTagText}`}>{label}</span>
      </div>
      <div className={`chat-md ${styles.textBlockBody}`} dangerouslySetInnerHTML={{ __html: displayHtml }} />
    </div>
  );
}

function ThinkingBlock({ block }) {
  const [expanded, setExpanded] = useState(true);
  const preview = block.text.length > 60 ? block.text.slice(0, 60).replace(/\n/g, ' ') + '…' : block.text.replace(/\n/g, ' ');
  return (
    <div className={styles.thinkingBlock}>
      <div className={styles.thinkingHeader} onClick={() => setExpanded((v) => !v)}>
        {expanded ? <DownOutlined className={styles.arrow} /> : <RightOutlined className={styles.arrow} />}
        <span className={`${styles.blockTag} ${styles.blockTagThinking}`}>thinking</span>
        {!expanded && <span className={styles.thinkingPreview}>{preview}</span>}
      </div>
      {expanded && (
        <div className={styles.thinkingBody}>
          <div
            className={`chat-md ${styles.markdownBody}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }}
          />
        </div>
      )}
    </div>
  );
}

function RenderBlocks({ blocks, compact }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, i) => (
        <RenderBlock key={i} block={block} compact={compact} />
      ))}
    </>
  );
}

function RenderBlock({ block, compact }) {
  if (block.type === 'separator') {
    return <hr className={styles.blockSeparator} />;
  }

  if (block.type === 'markdown') {
    if (!block.text?.trim()) return null;
    return <TranslatableMarkdown text={block.text} label={block.label} compact={compact} />;
  }

  if (block.type === 'thinking') {
    return <ThinkingBlock block={block} />;
  }

  if (block.type === 'tool_use') {
    return (
      <div className={styles.toolBlock}>
        <div className={styles.toolBlockHeader}>
          <span className={styles.blockTag}>tool_use</span>
          <span className={styles.toolName}>{block.name}</span>
          {block.id && <span className={styles.toolId}>{block.id}</span>}
        </div>
        <div className={styles.toolBlockBody}>
          <JsonViewer data={block.input} defaultExpand="root" />
        </div>
      </div>
    );
  }

  if (block.type === 'tool_result') {
    return (
      <div className={`${styles.toolBlock} ${block.is_error ? styles.toolBlockError : styles.toolBlockResult}`}>
        <div className={styles.toolBlockHeader}>
          <span className={`${styles.blockTag} ${block.is_error ? styles.blockTagError : styles.blockTagResult}`}>
            tool_result
          </span>
          {block.tool_use_id && <span className={styles.toolId}>{block.tool_use_id}</span>}
          {block.is_error && <span className={styles.errorLabel}>error</span>}
        </div>
        <div className={styles.toolBlockBody}>
          <RenderBlocks blocks={block.content} compact />
        </div>
      </div>
    );
  }

  if (block.type === 'json') {
    return (
      <div className={styles.jsonBlock}>
        {block.label && <div className={styles.jsonBlockLabel}>{block.label}</div>}
        <JsonViewer data={block.data} defaultExpand="root" />
      </div>
    );
  }

  return null;
}

// ── Input content renderer ────────────────────────────────────────────────────

function InputItemContent({ item }) {
  const timeStr = item.timestamp ? formatTurnTime(item.timestamp) : null;
  const badgeClass = item.role
    ? (styles[`role_${item.role}`] || styles.role_input)
    : styles.role_input;
  const badgeText = item.role || item.type || 'input';
  return (
    <div>
      <div className={styles.roleHeader}>
        <span className={`${styles.roleBadge} ${badgeClass}`}>{badgeText}</span>
        <span className={styles.roleLabel}>{`input[${item.inputIndex}]`}</span>
        {timeStr && <span className={styles.contentTime}>{timeStr}</span>}
      </div>
      <RenderBlocks blocks={item.blocks} />
    </div>
  );
}

// ── Accordion ─────────────────────────────────────────────────────────────────

function AccordionSection({ sectionKey, title, items, historyItems = [], onSelect, onSelectById, selectedId, sidebarRef, countOverride }) {
  const [open, setOpen] = useState(sectionKey !== 'tools');
  const [historyOpen, setHistoryOpen] = useState(false);
  // Groups come from protocol namespaces (`tools[]`) or exec's explicitly
  // declared description sections. Ungrouped function/custom tools remain
  // ordinary first-level leaves.
  const [expandedItemIds, setExpandedItemIds] = useState(() => new Set());
  // countOverride 存在时（如 tools 区：移除项是 diff 占位、不计入实际数量）按其统计，
  // 否则用列表项总数。
  const totalCount = countOverride != null ? countOverride : items.length + historyItems.length;
  const historyToggleId = `${sectionKey}__history_toggle`;

  function focusControl(controlId) {
    const el = sidebarRef.current?.querySelector(`[data-context-sidebar-control="${controlId}"]`);
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: 'nearest' });
  }

  function handleControlKeyDown(event, controlId) {
    const visibleIds = Array.from(
      sidebarRef.current?.querySelectorAll('[data-context-sidebar-control]') || []
    ).map((el) => el.dataset.contextSidebarControl).filter(Boolean);
    const nextId = getContextSidebarArrowNavigation({
      currentId: controlId,
      visibleIds,
      key: event.key,
    });
    if (!nextId) return;

    event.preventDefault();
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        focusControl(nextId);
        const nextEl = sidebarRef.current?.querySelector(`[data-context-sidebar-control="${nextId}"]`);
        if (nextEl?.dataset.controlType === 'item') {
          onSelectById(nextId);
        }
      });
    }
  }

  function renderItem(item, depth = 0) {
    const active = selectedId === item.id;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const childrenOpen = hasChildren && expandedItemIds.has(item.id);
    return (
      <React.Fragment key={item.id}>
        <button
          type="button"
          className={`${styles.item} ${depth > 0 ? styles.itemNested : ''} ${hasChildren ? styles.itemGroup : ''} ${!active && item.isCompactionHistory ? styles.itemCompaction : ''} ${active ? styles.itemActive : ''}`}
          onClick={() => {
            onSelect(item);
            if (hasChildren) {
              setExpandedItemIds((prev) => {
                const next = new Set(prev);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              });
            }
          }}
          onKeyDown={(event) => handleControlKeyDown(event, item.id)}
          aria-current={active ? 'true' : undefined}
          aria-expanded={hasChildren ? childrenOpen : undefined}
          data-context-sidebar-control={item.id}
          data-control-type="item"
        >
          <span className={styles.itemLead} aria-hidden="true">
            {hasChildren
              ? (childrenOpen
                ? <DownOutlined className={styles.itemGroupArrow} />
                : <RightOutlined className={styles.itemGroupArrow} />)
              : <span className={styles.itemLeafMarker}>•</span>}
          </span>
          <div className={styles.itemContent}>
            <span className={styles.itemLabel}>{item.label}</span>
            {item.sublabel && !active && (
              <div className={styles.itemSublabel}>{item.sublabel}</div>
            )}
          </div>
          {hasChildren && <span className={styles.itemChildCount}>{item.children.length}</span>}
          {item.time && <span className={styles.itemTime}>{item.time}</span>}
        </button>
        {childrenOpen && item.children.map((child) => renderItem(child, depth + 1))}
      </React.Fragment>
    );
  }

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <DownOutlined className={styles.arrow} /> : <RightOutlined className={styles.arrow} />}
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionCount}>{totalCount}</span>
      </button>
      {open && (
        <div className={styles.sectionBody}>
          {historyItems.length > 0 && (
            <>
              <button
                type="button"
                className={styles.historyToggle}
                onClick={() => setHistoryOpen((v) => !v)}
                onKeyDown={(event) => handleControlKeyDown(event, historyToggleId)}
                aria-expanded={historyOpen}
                data-context-sidebar-control={historyToggleId}
                data-control-type="toggle"
              >
                {historyOpen ? <DownOutlined className={styles.arrow} /> : <RightOutlined className={styles.arrow} />}
                <span className={styles.historyToggleLabel}>
                  {t('ui.context.history')} ({historyItems.length})
                </span>
              </button>
              {historyOpen && historyItems.map((item) => renderItem(item, 0))}
            </>
          )}
          {items.map((item) => renderItem(item, 0))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ContextTab({ body, prevTools }) {
  const [selectedItem, setSelectedItem] = useState(null);
  // 「原文」模式：右侧面板显示选中节点的原始 JSON 纯文本；切换节点时保持
  const [rawMode, setRawMode] = useState(false);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);

  const inputItems = useMemo(() => {
    if (!Array.isArray(body?.input)) return [];
    return buildInputItems(body.input);
  }, [body]);

  // Auto-select last input item whenever body changes.
  useEffect(() => {
    if (inputItems.length > 0) {
      setSelectedItem(inputItems[inputItems.length - 1]);
    } else {
      setSelectedItem(null);
    }
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve selected input against live input array after body refreshes.
  // 提前到 early return 之前：rawText 的 useMemo 依赖它（hooks 顺序约束）。
  const currentSelectedItem = selectedItem?.isInputItem
    ? (inputItems.find((item) => item.id === selectedItem.id) ?? null)
    : selectedItem;

  const rawText = useMemo(() => buildContextItemRawText(currentSelectedItem), [currentSelectedItem]);

  if (!body || typeof body !== 'object') {
    return (
      <div className={styles.emptyWrap}>
        <Empty description={t('ui.context.noData')} />
      </div>
    );
  }

  const accordionSections = [];
  const tools = getResponseTools(body);
  const instructions = getResponseInstructions(body);

  // Tools (collapsed by default, shown first to match API request order)
  if (tools.length > 0) {
    // 相对上一条 MainAgent 请求的 tools diff：tools_search 等场景下 tools 列表逐请求变化，
    // 这里高亮新增/移除，让"变化时机/内容"可见。prevTools 为空（无上一条/非 MainAgent）时不显示 diff。
    const diff = computeToolsDiff(prevTools, tools);

    const toolItems = tools.map((tool, i) => {
      const name = tool?.name || `Tool ${i}`;
      const isAdded = diff.isAdded(tool?.name);
      const namespaceChildren = tool?.type === 'namespace' && Array.isArray(tool.tools)
        ? tool.tools.map((child, childIndex) => ({
          id: `tool__${i}__child__${childIndex}`,
          label: child?.name || `Tool ${childIndex}`,
          sublabel: child?.description || undefined,
          blocks: parseToolBlocks(child),
          raw: child,
        }))
        : null;
      const execChildren = parseExecDeclaredTools(tool, i);
      return {
        id: `tool__${i}`,
        label: isAdded
          ? <span className={styles.toolAdded}>{name}<span className={styles.toolDiffTag}>{t('ui.context.toolAdded')}</span></span>
          : name,
        blocks: parseToolBlocks(tool),
        raw: tool,
        children: namespaceChildren || (execChildren.length > 0 ? execChildren : null),
      };
    });

    // 移除的 tool 在当前请求里已不存在，追加为只读条目展示。id 用 name 派生（稳定，
    // 数据刷新/重排时不会让选中态漂移到别的项）。
    diff.removedNames.forEach((name) => {
      toolItems.push({
        id: `tool_removed__${name}`,
        label: <span className={styles.toolRemoved}>{name}<span className={styles.toolDiffTag}>{t('ui.context.toolRemoved')}</span></span>,
        blocks: [{ type: 'markdown', text: t('ui.context.toolRemovedNote') }],
        raw: { name, _removed: true },
      });
    });

    accordionSections.push({
      key: 'tools',
      // 数量徽标只算当前请求实际携带的 tools（少了工具就按少了之后算）；
      // 移除项是相对上一条的 diff 占位，不计入数量。
      countOverride: tools.length,
      title: (
        <>
          {t('ui.context.tools')} <ConceptHelp doc="ToolsFirst" />
          {diff.changed && (
            <span className={styles.toolDiffSummary}>
              {diff.addedCount > 0 && <span className={styles.toolDiffSummaryAdd}>+{diff.addedCount}</span>}
              {diff.removedCount > 0 && <span className={styles.toolDiffSummaryRemove}>-{diff.removedCount}</span>}
            </span>
          )}
        </>
      ),
      items: toolItems,
    });
  }

  // Instructions
  const instructionsBlocks = parseInstructionsBlocks(instructions);
  if (instructionsBlocks != null) {
    accordionSections.push({
      key: 'instructions',
      title: t('ui.context.systemPrompt'),
      items: [{ id: 'instructions__0', label: t('ui.context.systemPrompt'), blocks: instructionsBlocks, raw: instructions }],
    });
  }

  // Input is shown in the same order as request body.input; history collapsed, current always visible.
  if (inputItems.length > 0) {
    const toHistoryItem = (item) => ({
      ...item,
      label: t('ui.context.historyTurnNoTime', { n: item.inputIndex + 1 }),
      time: item.timestamp ? formatTurnTime(item.timestamp) : null,
      sublabel: item.preview || item.type || undefined,
      isCompactionHistory: item.type === 'compaction',
    });
    const toCurrentItem = (item) => ({
      ...item,
      label: t('ui.context.currentTurn'),
      sublabel: item.preview || item.type || undefined,
    });
    const historyInputs = inputItems.slice(0, -1).map(toHistoryItem);
    const currentInput = toCurrentItem(inputItems[inputItems.length - 1]);
    accordionSections.push({
      key: 'input',
      title: t('ui.context.messages'),
      historyItems: historyInputs.length > 0 ? historyInputs : undefined,
      items: [currentInput],
    });
  }

  if (accordionSections.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <Empty description={t('ui.context.noFields')} />
      </div>
    );
  }

  const itemMap = new Map();
  accordionSections.forEach((section) => {
    (section.historyItems || []).forEach((item) => itemMap.set(item.id, item));
    section.items.forEach((item) => {
      itemMap.set(item.id, item);
      (item.children || []).forEach((child) => itemMap.set(child.id, child));
    });
  });

  return (
    <div className={styles.root}>
      <div ref={sidebarRef} className={styles.sidebar}>
        {accordionSections.map((sec) => (
          <AccordionSection
            key={sec.key}
            sectionKey={sec.key}
            title={sec.title}
            items={sec.items}
            historyItems={sec.historyItems}
            countOverride={sec.countOverride}
            selectedId={currentSelectedItem?.id}
            onSelect={(item) => setSelectedItem(item)}
            onSelectById={(itemId) => {
              const nextItem = itemMap.get(itemId);
              if (nextItem) setSelectedItem(nextItem);
            }}
            sidebarRef={sidebarRef}
          />
        ))}
      </div>

      <div className={styles.contentWrap}>
        {/* 工具条独占一行（滚动区之外），不悬浮、不遮挡内容 */}
        {currentSelectedItem != null && (
          <div className={styles.contentToolbar}>
            {rawMode && (
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  // navigator.clipboard 在非安全上下文（局域网明文 HTTP）为 undefined，先判存在
                  if (!navigator.clipboard) return;
                  navigator.clipboard.writeText(rawText).then(() => message.success(t('ui.copySuccess'))).catch(() => {});
                }}
              >
                {t('ui.copy')}
              </Button>
            )}
            <span className={styles.contentToolbarLabel}>{t('ui.context.viewRaw')}</span>
            <Switch
              size="small"
              checked={rawMode}
              aria-label={t('ui.context.viewRaw')}
              onChange={(v) => {
                setRawMode(v);
                // 长解析视图切短原文时不留滚出内容的空白滚动位
                if (contentRef.current) contentRef.current.scrollTop = 0;
              }}
            />
          </div>
        )}
        <div className={styles.content} ref={contentRef}>
          {currentSelectedItem == null ? (
            <div className={styles.contentEmpty}>
              <Text type="secondary">{t('ui.context.selectPrompt')}</Text>
            </div>
          ) : (
            <div key={currentSelectedItem.id} className={styles.contentInner}>
              {rawMode ? (
                <pre className={styles.rawPre}>{rawText}</pre>
              ) : currentSelectedItem.isInputItem ? (
                <InputItemContent item={currentSelectedItem} />
              ) : (
                <>
                  {currentSelectedItem.role && (
                    <div className={styles.roleHeader}>
                      <span className={`${styles.roleBadge} ${styles[`role_${currentSelectedItem.role}`] || ''}`}>
                        {currentSelectedItem.role}
                      </span>
                      <span className={styles.roleLabel}>{currentSelectedItem.label}</span>
                    </div>
                  )}
                  <RenderBlocks blocks={currentSelectedItem.blocks} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
