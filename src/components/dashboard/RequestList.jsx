import React from 'react';
import { List, Tag, Empty } from 'antd';
import { t } from '../../i18n';
import { formatTokenCount, getModelShort } from '../../utils/helpers';
import { getInputCacheUsage } from '../../utils/tokenUsage';
import { classifyRequest, formatCodexInternalRequestTag, formatRequestTag } from '../../utils/requestType';
import styles from './RequestList.module.css';

class RequestList extends React.Component {
  constructor(props) {
    super(props);
    this.activeItemRef = React.createRef();
  }

  componentDidMount() {
    this.scrollToSelected(true);
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.requests !== this.props.requests ||
      nextProps.selectedIndex !== this.props.selectedIndex ||
      nextProps.scrollCenter !== this.props.scrollCenter
    );
  }

  componentDidUpdate(prevProps) {
    if (this.props.scrollCenter && prevProps.selectedIndex !== this.props.selectedIndex) {
      this.scrollToSelected(true);
    } else if (prevProps.selectedIndex !== this.props.selectedIndex) {
      // User selected a different item — scroll to it and focus
      this.scrollToSelected(false);
      if (this.activeItemRef.current) this.activeItemRef.current.focus({ preventScroll: true });
    }
    // When requests update but selectedIndex hasn't changed,
    // don't scroll — preserve user's current scroll position
  }

  scrollToSelected(center) {
    if (this.activeItemRef.current) {
      this.activeItemRef.current.scrollIntoView({ block: center ? 'center' : 'nearest', behavior: 'instant' });
      if (center && this.props.onScrollDone) this.props.onScrollDone();
    }
  }

  handleKeyDown = (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const { requests, selectedIndex, onSelect } = this.props;
    if (!requests.length) return;

    e.preventDefault();
    const current = selectedIndex ?? 0;
    const next = e.key === 'ArrowUp' ? Math.max(0, current - 1) : Math.min(requests.length - 1, current + 1);
    if (next !== current) onSelect(next);
  };

  render() {
    const { requests, selectedIndex, onSelect } = this.props;

    if (requests.length === 0) {
      return (
        <div className={styles.centerEmpty}>
          <Empty description={t('ui.waitingRequests')} />
        </div>
      );
    }

    return (
      <div className={styles.scrollContainer} onKeyDown={this.handleKeyDown}>
        <List
          dataSource={requests}
          size="small"
          split={false}
          renderItem={(req, index) => {
            const time = new Date(req.timestamp).toLocaleTimeString('zh-CN');
            const isActive = index === selectedIndex;
            const statusOk = req.response && req.response.status < 400;
            const statusErr = req.response && req.response.status >= 400;

            const model = getModelShort(req.body?.model);
            const nextReq = index + 1 < requests.length ? requests[index + 1] : null;
            const { type: reqType, subType } = req._classification || classifyRequest(req, nextReq);
            // URL identity wins over stale persisted agent classification for
            // concrete Codex tool-use rows in the network list.
            const codexInternalTag = req.mainAgent === true
              ? null
              : formatCodexInternalRequestTag(req);
            const usage = req.response?.body?.usage;
            const inputTokens = usage ? (usage.input_tokens || 0) : null;
            const outputTokens = usage?.output_tokens || null;
            const cacheUsage = getInputCacheUsage(usage);

            // 热切换开启时 proxyUrl 是 interceptor 改写后的真实去向（如 foxcode），
            // req.url 仍是 pre-rewrite 值（原 origin 或 cxv proxy 端口），UI 优先展示去向。
            const displayUrl = req.proxyUrl || req.url;
            let urlShort = displayUrl;
            try {
              const u = new URL(displayUrl);
              urlShort = u.host + u.pathname;
            } catch {}

            return (
              <List.Item
                ref={isActive ? this.activeItemRef : undefined}
                tabIndex={0}
                onClick={() => onSelect(index)}
                className={`${styles.listItem} ${isActive ? styles.listItemActive : ''}`}
              >
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    {codexInternalTag
                      ? <Tag className={styles.tagNoMargin}>{codexInternalTag}</Tag>
                      : reqType === 'MainAgent'
                      ? <Tag className={`${styles.tagNoMargin} ${styles.tagMainAgent}`}>MainAgent</Tag>
                      : reqType === 'Plan'
                        ? <Tag className={`${styles.tagNoMargin} ${styles.tagPlan}`}>{formatRequestTag(reqType, subType)}</Tag>
                        : reqType === 'Count' || reqType === 'Preflight' || reqType === 'Metadata' || reqType === 'Responses'
                          ? <Tag className={`${styles.tagNoMargin} ${styles.tagMuted}`}>{formatRequestTag(reqType, subType)}</Tag>
                          : reqType === 'Synthetic'
                            ? <Tag className={`${styles.tagNoMargin} ${styles.tagMuted}`}>{formatRequestTag(reqType, subType)}</Tag>
                            : <Tag className={styles.tagNoMargin}>{formatRequestTag(reqType, subType)}</Tag>
                    }
                    {model && <span className={`${styles.modelName} ${reqType === 'MainAgent' ? styles.modelNameMain : ''}`}>{model}</span>}
                    <span className={styles.time}>{time}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.urlText} title={displayUrl}>{urlShort}</span>
                    {req.duration && <span className={styles.duration}>{req.duration}ms</span>}
                    {req.response && (
                      <span className={statusOk ? styles.statusOk : statusErr ? styles.statusErr : styles.statusDefault}>
                        {req.response.status}
                      </span>
                    )}
                  </div>
                  {usage && (
                    <div className={styles.usageBox}>
                      <div>token: output:{formatTokenCount(outputTokens) || 0}, input: {formatTokenCount(inputTokens) || 0}</div>
                      {cacheUsage.hasCacheDetails && (
                        <div>cache: read:{formatTokenCount(cacheUsage.read)}, write:{formatTokenCount(cacheUsage.write)}</div>
                      )}
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
      </div>
    );
  }
}

export default RequestList;
