import React from 'react';
import { Tabs, Typography, Button, Tag, Empty, Space, Select, message } from 'antd';
import { CopyOutlined, FileTextOutlined, CodeOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import JsonViewer from '../viewers/JsonViewer';
import ConceptHelp from '../common/ConceptHelp';
import { t } from '../../i18n';
import { apiUrl } from '../../utils/apiUrl';
import { formatTokenCount, stripPrivateKeys, hasCodexMdReminder, isCodexMdReminder, hasSkillsReminder, isSkillsReminder } from '../../utils/helpers';
import { getResponseTools } from '../../../lib/openai-body.js';
import { getInputCacheUsage } from '../../../lib/token-usage.js';
import { classifyRequest } from '../../utils/requestType';
import { isMainAgent } from '../../utils/contentFilter';
import { restoreSlimmedEntry } from '../../utils/entry-slim.js';
import ContextTab from './ContextTab';
import styles from './DetailPanel.module.css';

const { Text, Paragraph } = Typography;

function getDisplayUrl(request) {
  return request?.proxyUrl || request?.url || '';
}

function getUrlDetails(request) {
  const displayUrl = getDisplayUrl(request);
  try {
    const url = new URL(displayUrl);
    return {
      host: url.host,
      path: url.pathname,
      query: Array.from(url.searchParams.entries()),
    };
  } catch {
    return { host: '', path: displayUrl, query: [] };
  }
}

function firstValue(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return undefined;
}

function findModelArray(body) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return null;
  for (const key of ['models', 'data', 'items']) {
    if (Array.isArray(body[key])) return body[key];
  }
  for (const [key, value] of Object.entries(body)) {
    if (/models?/i.test(key) && Array.isArray(value)) return value;
  }
  return null;
}

function normalizeModelEntry(model, idx) {
  if (typeof model === 'string') {
    return { id: model, label: '', detail: '', status: '', raw: model, key: `${model}-${idx}` };
  }
  if (!model || typeof model !== 'object') {
    return { id: String(model ?? `model-${idx + 1}`), label: '', detail: '', status: '', raw: model, key: `model-${idx}` };
  }

  const id = firstValue(model, ['id', 'slug', 'model', 'model_id', 'modelId', 'name', 'value', 'key']) || `model-${idx + 1}`;
  const label = firstValue(model, ['display_name', 'displayName', 'title', 'label', 'description']) || '';
  const context = firstValue(model, ['context_window', 'contextWindow', 'context_length', 'contextLength', 'max_context_tokens', 'maxContextTokens']);
  const status = firstValue(model, ['status', 'state']) || (
    model.enabled === false || model.available === false || model.is_available === false
      ? 'unavailable'
      : (model.enabled === true || model.available === true || model.is_available === true ? 'available' : '')
  );
  const detail = context ? `context ${formatTokenCount(context)}` : '';

  return {
    id: String(id),
    label: String(label || ''),
    detail,
    status: String(status || ''),
    raw: model,
    key: `${id}-${idx}`,
  };
}

function getToolOutput(request) {
  const responseBody = request?.response?.body;
  if (!responseBody || typeof responseBody !== 'object') return responseBody ?? null;
  if (Object.prototype.hasOwnProperty.call(responseBody, 'output')) return responseBody.output;
  return responseBody;
}

function renderMaybeJson(data, textClassName) {
  if (data == null || data === '') return <Text type="secondary">{t('ui.noBody')}</Text>;
  if (typeof data === 'string') return <pre className={textClassName}>{data}</pre>;
  return <JsonViewer data={stripPrivateKeys(data)} defaultExpand="root" />;
}

class DetailPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bodyViewMode: { request: 'json', response: 'json', diff: 'json' },
      diffExpanded: false,
      requestHeadersExpanded: false,
      responseHeadersExpanded: false,
      reminderFilters: null,
      modelCatalogExpanded: {},
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.request !== this.props.request) {
      const isMA = isMainAgent(nextProps.request);
      this.setState({ diffExpanded: isMA && !!nextProps.expandDiff, requestHeadersExpanded: false, responseHeadersExpanded: false, reminderFilters: null, modelCatalogExpanded: {} });
    }
    return (
      nextProps.request !== this.props.request ||
      nextProps.currentTab !== this.props.currentTab ||
      nextProps.onTabChange !== this.props.onTabChange ||
      nextProps.selectedIndex !== this.props.selectedIndex ||
      nextProps.expandDiff !== this.props.expandDiff ||
      nextState.bodyViewMode !== this.state.bodyViewMode ||
      nextState.diffExpanded !== this.state.diffExpanded ||
      nextState.requestHeadersExpanded !== this.state.requestHeadersExpanded ||
      nextState.responseHeadersExpanded !== this.state.responseHeadersExpanded ||
      nextState.reminderFilters !== this.state.reminderFilters ||
      nextState.modelCatalogExpanded !== this.state.modelCatalogExpanded
    );
  }

  getCurrentRequest() {
    const { request, allRequests, requests } = this.props;
    if (!request) return null;
    return request._slimmed ? restoreSlimmedEntry(request, allRequests || requests || []) : request;
  }

  toggleBodyViewMode(type) {
    this.setState(prev => ({
      bodyViewMode: {
        ...prev.bodyViewMode,
        [type]: prev.bodyViewMode[type] === 'json' ? 'text' : 'json',
      },
    }));
  }

  copyBody(type) {
    const request = this.getCurrentRequest();
    if (!request) return;
    let data;
    if (type === 'diff') {
      data = this._lastDiffResult;
    } else {
      data = type === 'request' ? request.body : request.response?.body;
    }
    if (data == null) return;
    const clean = typeof data === 'object' ? stripPrivateKeys(data) : data;
    const text = typeof clean === 'string' ? clean : JSON.stringify(clean, null, 2);
    navigator.clipboard.writeText(text).then(() => message.success(t('ui.copySuccess')));
  }

  renderHeaders(headers) {
    if (!headers || Object.keys(headers).length === 0) {
      return <Text type="secondary">{t('ui.noHeaders')}</Text>;
    }
    return (
      <div className={styles.headersContainer}>
        {Object.entries(headers).map(([key, value]) => (
          <div key={key} className={styles.headerRow}>
            <Text code className={styles.headerKey}>{key}</Text>
            {key === 'authorization' && <ConceptHelp doc="TranslateContextPollution" />}
            <Text type="secondary" className={styles.headerValue}>{String(value)}</Text>
          </div>
        ))}
      </div>
    );
  }

  getRequestExpandNode(data, type) {
    if (type !== 'request' || !data || typeof data !== 'object') return undefined;
    const { request, requests, selectedIndex } = this.props;
    if (!request) return undefined;
    const nextReq = requests && selectedIndex != null ? requests[selectedIndex + 1] : null;
    const { type: reqType } = classifyRequest(request, nextReq);

    // Build codexMd expand set if active
    let codexMdExpandSet = null;
    if (this.state.reminderFilters === 'codexMd' && Array.isArray(data.input)) {
      codexMdExpandSet = new Set();
      codexMdExpandSet.add(data.input);
      for (const msg of data.input) {
        if (!msg || typeof msg !== 'object') continue;
        const content = msg.content;
        if (typeof content === 'string') {
          if (isCodexMdReminder(content)) {
            codexMdExpandSet.add(msg);
          }
        } else if (Array.isArray(content)) {
          let hasMatch = false;
          for (const block of content) {
            if (block && block.type === 'text' && isCodexMdReminder(block.text)) {
              codexMdExpandSet.add(block);
              hasMatch = true;
            }
          }
          if (hasMatch) {
            codexMdExpandSet.add(msg);
            codexMdExpandSet.add(content);
          }
        }
      }
    }

    // Build skills expand set if active
    let skillsExpandSet = null;
    if (this.state.reminderFilters === 'skills' && Array.isArray(data.input)) {
      skillsExpandSet = new Set();
      skillsExpandSet.add(data.input);
      for (const msg of data.input) {
        if (!msg || typeof msg !== 'object') continue;
        const content = msg.content;
        if (typeof content === 'string') {
          if (isSkillsReminder(content)) {
            skillsExpandSet.add(msg);
          }
        } else if (Array.isArray(content)) {
          let hasMatch = false;
          for (const block of content) {
            if (block && block.type === 'text' && isSkillsReminder(block.text)) {
              skillsExpandSet.add(block);
              hasMatch = true;
            }
          }
          if (hasMatch) {
            skillsExpandSet.add(msg);
            skillsExpandSet.add(content);
          }
        }
      }
    }

    const filterExpandSet = codexMdExpandSet || skillsExpandSet;

    if (reqType === 'Preflight') {
      // Collect all object/array refs under input and instructions[2] that should be expanded
      const expandRefs = new Set();
      const collectAll = (obj) => {
        if (obj && typeof obj === 'object') {
          expandRefs.add(obj);
          if (Array.isArray(obj)) obj.forEach(collectAll);
          else Object.values(obj).forEach(collectAll);
        }
      };
      if (Array.isArray(data.input)) collectAll(data.input);
      if (Array.isArray(data.instructions) && data.instructions.length >= 3) collectAll(data.instructions[2]);
      return (level, value, field) => {
        if (level < 2) return true;
        if (expandRefs.has(value)) return true;
        if (filterExpandSet && filterExpandSet.has(value)) return true;
        // expand instructions itself at root level so the 3rd item is visible
        if (level === 1 && field === 'instructions') return true;
        return false;
      };
    }

    if (reqType === 'MainAgent' && Array.isArray(data.input) && data.input.length === 1) {
      const msg = data.input[0];
      const contentArr = msg && Array.isArray(msg.content) ? msg.content : null;
      const lastContent = contentArr && contentArr.length > 0 ? contentArr[contentArr.length - 1] : null;
      const expandRefs = new Set();
      const collectAll = (obj) => {
        if (obj && typeof obj === 'object') {
          expandRefs.add(obj);
          if (Array.isArray(obj)) obj.forEach(collectAll);
          else Object.values(obj).forEach(collectAll);
        }
      };
      if (lastContent) collectAll(lastContent);
      expandRefs.add(data.input);
      if (msg && typeof msg === 'object') expandRefs.add(msg);
      if (contentArr) expandRefs.add(contentArr);
      return (level, value, field) => {
        if (level < 2) return true;
        if (expandRefs.has(value)) return true;
        if (filterExpandSet && filterExpandSet.has(value)) return true;
        return false;
      };
    }

    if (filterExpandSet) {
      return (level, value, field) => {
        if (level < 2) return true;
        if (filterExpandSet.has(value)) return true;
        return false;
      };
    }

    return undefined;
  }

  renderBody(data, type) {
    const { bodyViewMode } = this.state;
    if (data == null) return <Text type="secondary">{t('ui.noBody')}</Text>;

    if (typeof data === 'string' && data.includes('Streaming Response')) {
      return (
        <div className={styles.streamingBox}>
          <Text type="secondary">{t('ui.streamingResponse')}</Text>
        </div>
      );
    }

    const clean = typeof data === 'object' ? stripPrivateKeys(data) : data;
    const isJsonMode = bodyViewMode[type] === 'json';
    const expandNode = this.getRequestExpandNode(clean, type);

    return (
      <div>
        {isJsonMode ? (
          <JsonViewer
            data={clean}
            defaultExpand={type === 'response' ? 'all' : 'root'}
            expandNode={expandNode}
          />
        ) : (
          <pre className={styles.rawTextPre}>
            {typeof clean === 'string' ? clean : JSON.stringify(clean, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  getPrevMainAgentRequest() {
    const { requests, selectedIndex } = this.props;
    if (!requests || selectedIndex == null) return null;
    for (let i = selectedIndex - 1; i >= 0; i--) {
      if (isMainAgent(requests[i])) {
        const r = requests[i];
        return r._slimmed ? restoreSlimmedEntry(r, this.props.allRequests || requests) : r;
      }
    }
    return null;
  }

  computeDiff(prev, curr) {
    if (prev == null || curr == null) return null;
    if (typeof prev !== 'object' || typeof curr !== 'object') return null;
    const result = {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    for (const key of allKeys) {
      if (key.startsWith('_')) continue;
      if (!(key in prev)) {
        result[key] = curr[key];
      } else if (!(key in curr)) {
        continue; // removed keys not shown
      } else {
        const pStr = JSON.stringify(prev[key]);
        const cStr = JSON.stringify(curr[key]);
        if (pStr !== cStr) {
          if (key === 'messages' && Array.isArray(prev[key]) && Array.isArray(curr[key]) && curr[key].length > prev[key].length) {
            result[key] = curr[key].slice(prev[key].length);
          } else {
            result[key] = curr[key];
          }
        }
      }
    }
    return Object.keys(result).length ? result : null;
  }

  renderMetadataOverview(request) {
    if (!request) return null;
    const { host, path, query } = getUrlDetails(request);
    const body = request.response?.body;
    const modelArray = findModelArray(body);
    const models = modelArray ? modelArray.map(normalizeModelEntry) : [];
    const hasExpandedModel = models.some(model => !!this.state.modelCatalogExpanded[model.key]);
    const defaultModel = firstValue(body, ['default_model', 'defaultModel', 'default_model_slug', 'defaultModelSlug', 'preferred_model', 'preferredModel']);
    const queryItems = query.length > 0 ? query : [];

    return (
      <div className={styles.metadataSection}>
        <div className={styles.metadataHeader}>
          <Text strong>Codex model catalog</Text>
          <Text type="secondary" className={styles.metadataSubtle}>{host || path}</Text>
        </div>

        <div className={styles.metadataGrid}>
          <div className={styles.metadataStat}>
            <span className={styles.metadataStatLabel}>Path</span>
            <span className={styles.metadataStatValue}>{path || '-'}</span>
          </div>
          <div className={styles.metadataStat}>
            <span className={styles.metadataStatLabel}>Models</span>
            <span className={styles.metadataStatValue}>{models.length || '-'}</span>
          </div>
          <div className={styles.metadataStat}>
            <span className={styles.metadataStatLabel}>Default</span>
            <span className={styles.metadataStatValue}>{defaultModel || '-'}</span>
          </div>
        </div>

        {queryItems.length > 0 && (
          <div className={styles.metadataKvList}>
            {queryItems.map(([key, value], idx) => (
              <div key={`${key}-${idx}`} className={styles.metadataKvRow}>
                <span className={styles.metadataKey}>{key}</span>
                <span className={styles.metadataValue}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {!request.response ? (
          <Text type="secondary">{t('ui.responseNotCaptured')}</Text>
        ) : models.length > 0 ? (
          <div className={`${styles.modelCatalogList} ${hasExpandedModel ? styles.modelCatalogListExpanded : ''}`}>
            {models.map((model) => {
              const expanded = !!this.state.modelCatalogExpanded[model.key];
              return (
                <div key={model.key} className={styles.modelCatalogItem}>
                  <button
                    type="button"
                    className={styles.modelCatalogRow}
                    aria-expanded={expanded}
                    onClick={() => this.setState(prev => ({
                      modelCatalogExpanded: {
                        ...prev.modelCatalogExpanded,
                        [model.key]: !prev.modelCatalogExpanded[model.key],
                      },
                    }))}
                  >
                    <div className={styles.modelCatalogMain}>
                      <span className={styles.modelCatalogId}>{model.id}</span>
                      {model.label && <span className={styles.modelCatalogLabel}>{model.label}</span>}
                    </div>
                    <span className={styles.modelCatalogDetail}>
                      {expanded ? <DownOutlined className={styles.modelCatalogChevron} /> : <RightOutlined className={styles.modelCatalogChevron} />}
                      {model.detail || 'details'}
                    </span>
                    {model.status && <span className={styles.modelCatalogStatus}>{model.status}</span>}
                  </button>
                  {expanded && (
                    <div className={styles.modelCatalogDetails}>
                      {typeof model.raw === 'string' ? (
                        <pre className={styles.rawTextPre}>{model.raw}</pre>
                      ) : (
                        <JsonViewer data={stripPrivateKeys(model.raw)} defaultExpand="root" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : body != null ? (
          <div className={styles.metadataRaw}>
            {typeof body === 'string' ? (
              <pre className={styles.rawTextPre}>{body}</pre>
            ) : (
              <JsonViewer data={stripPrivateKeys(body)} defaultExpand="root" />
            )}
          </div>
        ) : (
          <Text type="secondary">{t('ui.noBody')}</Text>
        )}
      </div>
    );
  }

  renderToolOverview(request) {
    if (!request) return null;
    const body = request.body || {};
    const name = body.tool_name || body.event_name || 'tool';
    const input = body.tool_input ?? body.event_input ?? {};
    const output = getToolOutput(request);
    const status = body.status || request.response?.body?.status || request.response?.statusText || '';
    const callId = body._callId || body._itemId || '';
    const threadId = body._threadId || request._agentThreadId || '';
    const turnId = body._turnId || '';
    const itemType = body._itemType || body.server_request_kind || request.method || '';

    return (
      <div className={styles.toolSection}>
        <div className={styles.metadataHeader}>
          <Text strong>Codex tool item</Text>
          <Text type="secondary" className={styles.metadataSubtle}>{request.url}</Text>
        </div>

        <div className={styles.toolSummaryGrid}>
          <div className={styles.metadataStat}>
            <span className={styles.metadataStatLabel}>Tool</span>
            <span className={styles.metadataStatValue}>{name}</span>
          </div>
          <div className={styles.metadataStat}>
            <span className={styles.metadataStatLabel}>Item type</span>
            <span className={styles.metadataStatValue}>{itemType || '-'}</span>
          </div>
          <div className={styles.metadataStat}>
            <span className={styles.metadataStatLabel}>Status</span>
            <span className={styles.metadataStatValue}>{status || '-'}</span>
          </div>
          <div className={styles.metadataStat}>
            <span className={styles.metadataStatLabel}>Call ID</span>
            <span className={styles.metadataStatValue}>{callId || '-'}</span>
          </div>
        </div>

        <div className={styles.metadataKvList}>
          <div className={styles.metadataKvRow}>
            <span className={styles.metadataKey}>Thread</span>
            <span className={styles.metadataValue}>{threadId || '-'}</span>
          </div>
          <div className={styles.metadataKvRow}>
            <span className={styles.metadataKey}>Turn</span>
            <span className={styles.metadataValue}>{turnId || '-'}</span>
          </div>
        </div>

        <div className={styles.toolPayloadGrid}>
          <div className={styles.toolPayload}>
            <div className={styles.toolPayloadHeader}>Input</div>
            <div className={styles.toolPayloadBody}>{renderMaybeJson(input, styles.rawTextPre)}</div>
          </div>
          <div className={styles.toolPayload}>
            <div className={styles.toolPayloadHeader}>Output</div>
            <div className={styles.toolPayloadBody}>
              {request.response ? renderMaybeJson(output, styles.rawTextPre) : <Text type="secondary">{t('ui.responseNotCaptured')}</Text>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    let request = this.getCurrentRequest();
    const { currentTab, onTabChange } = this.props;

    if (!request) {
      return (
        <div className={styles.emptyState}>
          <Empty description="选择一个请求查看详情" />
        </div>
      );
    }

    const time = new Date(request.timestamp).toLocaleString('zh-CN');
    const statusOk = request.response && request.response.status < 400;
    const nextReq = this.props.requests && this.props.selectedIndex != null ? this.props.requests[this.props.selectedIndex + 1] : null;
    const requestClass = classifyRequest(request, nextReq);
    const metadataOverview = requestClass.type === 'Metadata' && requestClass.subType === 'Models'
      ? this.renderMetadataOverview(request)
      : null;
    const toolOverview = requestClass.type === 'Tool'
      ? this.renderToolOverview(request)
      : null;

    // 一次 render 只解析一次上一条 MainAgent 请求——Body Diff 与 ContextTab 的 tools diff 复用同一结果，
    // 避免 getPrevMainAgentRequest()（内部可能跑 restoreSlimmedEntry 重建）被重复调用两次。
    const prevMainAgent = isMainAgent(request) ? this.getPrevMainAgentRequest() : null;

    // Diff logic for mainAgent requests
    let diffBlock = null;
    if (prevMainAgent) {
      const prevRequest = prevMainAgent;
      if (prevRequest) {
        const currSize = JSON.stringify(request.body).length;
        const prevSize = JSON.stringify(prevRequest.body).length;
        const isShrunk = currSize < prevSize;

        if (isShrunk) {
          diffBlock = (
            <div className={styles.diffSection}>
              <Text strong className={styles.diffToggle}
                onClick={() => this.setState(prev => ({ diffExpanded: !prev.diffExpanded }))}>
                Body Diff JSON <ConceptHelp doc="BodyDiffJSON" />{' '}{this.state.diffExpanded ? <DownOutlined className={styles.diffIcon} /> : <RightOutlined className={styles.diffIcon} />}
              </Text>
              {this.state.diffExpanded && (
                <Text type="secondary">{t('ui.diffSessionChanged')}</Text>
              )}
            </div>
          );
        } else {
          const diffResult = stripPrivateKeys(this.computeDiff(prevRequest.body, request.body));
          if (diffResult) {
            this._lastDiffResult = diffResult;
            diffBlock = (
              <div className={styles.diffSection}>
                <div className={styles.diffHeaderRow}>
                  <Text strong className={styles.diffToggle}
                    onClick={() => this.setState(prev => ({ diffExpanded: !prev.diffExpanded }))}>
                    Body Diff JSON <ConceptHelp doc="BodyDiffJSON" />{' '}{this.state.diffExpanded ? <DownOutlined className={styles.diffIcon} /> : <RightOutlined className={styles.diffIcon} />}
                  </Text>
                  {this.state.diffExpanded && (
                    <Space size="small" className={styles.diffSpaceRight}>
                      <Button
                        size="small"
                        icon={this.state.bodyViewMode.diff === 'json' ? <FileTextOutlined /> : <CodeOutlined />}
                        onClick={() => this.toggleBodyViewMode('diff')}
                      >
                        {this.state.bodyViewMode.diff === 'json' ? 'Text' : 'JSON'}
                      </Button>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => this.copyBody('diff')}
                      >
                        {t('ui.copy')}
                      </Button>
                    </Space>
                  )}
                </div>
              {this.state.diffExpanded && (
                <>
                  {this.state.bodyViewMode.diff === 'json' ? (
                    <JsonViewer data={diffResult} defaultExpand="all" />
                  ) : (
                    <pre className={styles.rawTextPre}>
                      {JSON.stringify(diffResult, null, 2)}
                    </pre>
                  )}
                </>
                )}
              </div>
            );
          }
        }
      }
    }

    const hasCodexMd = hasCodexMdReminder(request.body);
    const hasSkills = hasSkillsReminder(request.body);

    const tabItems = [
      {
        key: 'request',
        label: 'Request',
        children: (
          <div className={styles.tabContent}>
            <div className={styles.diffSection}>
              <Text strong className={styles.diffToggle}
                onClick={() => this.setState(prev => ({ requestHeadersExpanded: !prev.requestHeadersExpanded }))}>
                Headers {this.state.requestHeadersExpanded ? <DownOutlined className={styles.diffIcon} /> : <RightOutlined className={styles.diffIcon} />}
              </Text>
              {this.state.requestHeadersExpanded && this.renderHeaders(request.headers)}
            </div>
            {diffBlock}
            {toolOverview}
            <div>
              <div className={styles.bodyHeader}>
                <Text strong className={styles.bodyLabel}>Body<ConceptHelp doc="BodyFields" /></Text>
                <Space size="small">
                  {(hasCodexMd || hasSkills) && (
                    <span className={styles.reminderFilterWrapper}>
                      <span className={styles.reminderLabel}>system-reminder:</span>
                      <Select
                        size="small"
                        className={styles.reminderSelect}
                        placeholder={t('ui.detail.filterPlaceholder')}
                        value={this.state.reminderFilters || undefined}
                        onChange={val => this.setState({ reminderFilters: val || null })}
                        options={[
                          { label: 'AGENTS.md', value: 'codexMd', disabled: !hasCodexMd },
                          { label: 'Skills', value: 'skills', disabled: !hasSkills },
                        ]}
                        popupMatchSelectWidth={false}
                        allowClear
                      />
                    </span>
                  )}
                  <Button
                    size="small"
                    icon={this.state.bodyViewMode.request === 'json' ? <FileTextOutlined /> : <CodeOutlined />}
                    onClick={() => this.toggleBodyViewMode('request')}
                  >
                    {this.state.bodyViewMode.request === 'json' ? 'Text' : 'JSON'}
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => this.copyBody('request')}
                  >
                    {t('ui.copy')}
                  </Button>
                </Space>
              </div>
              {this.renderBody(request.body, 'request')}
            </div>
          </div>
        ),
      },
      {
        key: 'response',
        label: 'Response',
        children: (
          <div className={styles.tabContent}>
            {request.response ? (
              <>
                <div className={styles.diffSection}>
                  <Text strong className={styles.diffToggle}
                    onClick={() => this.setState(prev => ({ responseHeadersExpanded: !prev.responseHeadersExpanded }))}>
                    Headers {this.state.responseHeadersExpanded ? <DownOutlined className={styles.diffIcon} /> : <RightOutlined className={styles.diffIcon} />}
                  </Text>
                  {this.state.responseHeadersExpanded && this.renderHeaders(request.response.headers)}
                </div>
                <div>
                  <div className={styles.bodyHeader}>
                    <Text strong className={styles.bodyLabel}>Body<ConceptHelp doc="ResponseFields" /></Text>
                    <Space size="small">
                      <Button
                        size="small"
                        icon={this.state.bodyViewMode.response === 'json' ? <FileTextOutlined /> : <CodeOutlined />}
                        onClick={() => this.toggleBodyViewMode('response')}
                      >
                        {this.state.bodyViewMode.response === 'json' ? 'Text' : 'JSON'}
                      </Button>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => this.copyBody('response')}
                      >
                        {t('ui.copy')}
                      </Button>
                    </Space>
                  </div>
                  {this.renderBody(request.response.body, 'response')}
                </div>
              </>
            ) : (
              <Empty description={t('ui.responseNotCaptured')} />
            )}
          </div>
        ),
      },
      {
        key: 'context',
        label: toolOverview ? 'Tool' : metadataOverview ? 'Content' : 'Context',
        children: (
          <div className={`${styles.tabContent} ${styles.contextTabContent}`}>
            {toolOverview || metadataOverview || (
              <ContextTab
                body={request.body}
                response={request.response?.body}
                prevTools={getResponseTools(prevMainAgent?.body)}
              />
            )}
          </div>
        ),
      },
    ];

    const usage = request.response?.body?.usage;
    const tokenStats = usage ? (() => {
      const input = usage.input_tokens || 0;
      const output = usage.output_tokens || 0;
      const cache = getInputCacheUsage(usage);
      return { input, output, cacheRead: cache.read, cacheWrite: cache.write, hasCacheDetails: cache.hasCacheDetails };
    })() : null;

    return (
      <div className={styles.container}>
        <div className={styles.urlSection}>
          <div className={styles.urlLeft}>
            <Paragraph
              className={styles.urlText}
              ellipsis={{ rows: 2, expandable: true }}
            >
              {request.proxyUrl || request.url}
            </Paragraph>
            <Space size="small" wrap>
              <Tag color={request.method === 'POST' ? 'blue' : 'green'}>{request.method}</Tag>
              <Text type="secondary" className={styles.metaText}>🕐 {time}</Text>
              {request.duration && <Text type="secondary" className={styles.metaText}>⏱️ {request.duration}ms</Text>}
              {request.response && (
                <Tag color={statusOk ? 'success' : 'error'}>HTTP {request.response.status}</Tag>
              )}
            </Space>
          </div>
          {tokenStats && (
            <div className={styles.tokenStatsBox}>
              <div className={styles.tokenGrid}>
                <div className={styles.tokenRows}>
                  <div className={styles.tokenRow}>
                    <span className={styles.tokenLabel}>{t('ui.stats.token')}</span>
                    <span className={styles.tokenTd}>{t('ui.stats.input')}: {formatTokenCount(tokenStats.input)}</span>
                    <span className={styles.tokenTd}>{t('ui.stats.output')}: {formatTokenCount(tokenStats.output)}</span>
                  </div>
                  {tokenStats.hasCacheDetails && (
                    <div className={`${styles.tokenRow} ${styles.tokenRowBorder}`}>
                      <span className={styles.tokenLabel}>{t('ui.stats.cache')}</span>
                      <span className={styles.tokenTd}>{t('ui.stats.cacheRead')}: {formatTokenCount(tokenStats.cacheRead)}</span>
                      <span className={styles.tokenTd}>{t('ui.stats.cacheWrite')}: {formatTokenCount(tokenStats.cacheWrite)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Tabs
          activeKey={currentTab}
          onChange={onTabChange}
          items={tabItems}
          size="small"
        />
      </div>
    );
  }
}

export default DetailPanel;
