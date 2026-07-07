import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Drawer, Button, Spin, Empty, Tooltip, Tag, message } from 'antd';
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import ChatMessage from '../chat/ChatMessage';
import { cachedBuildToolResultMap } from '../../utils/toolResultBuilder';
import { classifyUserContent, isSystemText, isMainAgent, extractDisplayText } from '../../utils/contentFilter';
import { mergeMainAgentSessions } from '../../utils/sessionMerge';
import { reconstructEntries } from '../../../server/lib/delta-reconstructor.js';
import { apiUrl } from '../../utils/apiUrl';
import { IM_PLATFORMS } from './imPlatforms';
import { t } from '../../i18n';
import styles from './ImConversationModal.module.css';

// 把一份独立 IM worker 的 .jsonl 重建出的 entries 折叠成 mainAgentSessions。
// 复用纯函数 isMainAgent + mergeMainAgentSessions（后者自带 _timestamp 赋值），不碰 AppBase._processEntries
// 那条 mainAgent-doubling 热路径。
function buildSessionsFromEntries(entries) {
  let sessions = [];
  for (const entry of entries) {
    if (isMainAgent(entry) && entry.body && Array.isArray(entry.body.messages) && !entry._slimmed) {
      sessions = mergeMainAgentSessions(sessions, entry);
    }
  }
  return sessions;
}

// 只读渲染：复用 ChatMessage（isHistoryLog，省略所有交互 on*/active*/lastPending* props → 自动降级）。
// senderMap：senderId → {name, avatar}，透传给 ChatMessage 以按发送者覆盖姓名/头像（IM 来源消息）。
// imAgent：{name, Icon, color}，让助手（MainAgent）一侧的头像/名字用所属 IM 平台的 logo + 名称呈现。
function renderSessions(sessions, senderMap, imAgent) {
  const out = [];
  sessions.forEach((session, si) => {
    const messages = Array.isArray(session.messages) ? session.messages : [];
    if (messages.length === 0) return;
    const maps = cachedBuildToolResultMap(messages);
    const kp = `s${si}`;
    messages.forEach((msg, mi) => {
      if (!msg) return;
      const ts = msg._timestamp || null;
      const content = msg.content;

      if (msg.role === 'user') {
        if (Array.isArray(content)) {
          const { commands, textBlocks, skillBlocks } = classifyUserContent(content);
          commands.forEach((cmd, ci) => out.push(
            <ChatMessage key={`${kp}-cmd-${mi}-${ci}`} role="user" text={cmd} timestamp={ts} isHistoryLog imSenderMap={senderMap} />
          ));
          skillBlocks.forEach((sb, ski) => {
            const m = (sb.text || '').match(/^#\s+(.+)$/m);
            out.push(<ChatMessage key={`${kp}-skill-${mi}-${ski}`} role="skill-loaded" text={sb.text} skillName={m ? m[1] : 'Skill'} timestamp={ts} isHistoryLog />);
          });
          textBlocks.forEach((tb, ti) => {
            const isPlan = /Implement the following plan:/i.test(tb.text || '');
            out.push(<ChatMessage key={`${kp}-user-${mi}-${ti}`} role={isPlan ? 'plan-prompt' : 'user'} text={tb.text} timestamp={ts} isHistoryLog imSenderMap={senderMap} />);
          });
          // 纯 tool_result 的 user 消息不单独渲染（其结果挂在对应 assistant 的 tool_use 上）。
        } else if (typeof content === 'string') {
          const dispText = extractDisplayText(content);
          if (dispText) {
            const isPlan = /Implement the following plan:/i.test(dispText);
            out.push(<ChatMessage key={`${kp}-user-${mi}`} role={isPlan ? 'plan-prompt' : 'user'} text={dispText} timestamp={ts} isHistoryLog imSenderMap={senderMap} />);
          }
        }
      } else if (msg.role === 'assistant') {
        let blocks = null;
        if (Array.isArray(content)) {
          blocks = content.filter((b) => b.type !== 'text' || !isSystemText(b.text));
        } else if (typeof content === 'string') {
          const dispText = extractDisplayText(content);
          if (dispText) blocks = [{ type: 'text', text: dispText }];
        }
        if (blocks && blocks.length > 0) {
          out.push(
            <ChatMessage
              key={`${kp}-asst-${mi}`}
              role="assistant"
              content={blocks}
              toolResultMap={maps.toolResultMap}
              readContentMap={maps.readContentMap}
              editSnapshotMap={maps.editSnapshotMap}
              askAnswerMap={maps.askAnswerMap}
              planApprovalMap={maps.planApprovalMap}
              latestPlanContent={maps.latestPlanContent}
              timestamp={ts}
              displayTs={msg._generatedTs}
              collapseToolResults
              isHistoryLog
              imAgent={imAgent}
            />
          );
        }
      }
    });
  });
  return out;
}

/**
 * IM 对话记录弹窗：点击 header 的 IM logo 打开，展示该 IM 独立 worker 的 Codex 会话。
 * 数据：GET /api/im/:platform/logs → 最新 .jsonl → /api/local-log SSE → reconstructEntries → 渲染。
 * 非实时；右上角刷新按钮重新拉取。
 */
export default function ImConversationModal({ open, onClose, platform, onOpenConfig }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // 上一次 effect 的 {open, platform}：用于区分「纯刷新」（仅 reloadKey 变）与「切平台/重新打开」。
  // 本组件在 AppHeader 里常驻挂载（destroyOnClose 只销毁 Modal 内层，不卸载本组件），故 ref 跨开关存活；
  // HMR remount 时 useRef 会重建为初始值，行为退化为「清空」，安全。
  const prevRef = useRef({ open: false, platform: null });
  // 镜像当前 sessions，供 effect 内异步错误回调判断「是否已有内容」（决定报错走 toast 还是 Empty）。
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  // 滚动位置记忆：组件常驻挂载 → ref 跨开关存活。按 platform 记 {top, atBottom}。
  // 打开时：无记录 / 上次停在底部 → 拉到最底；否则恢复上次拉到的位置。
  const bodyRef = useRef(null);
  const scrollMemRef = useRef({});       // platform -> { top, atBottom }
  const positionedRef = useRef(false);   // 本次打开是否已定位（每次 open/切平台重置）

  const handleScroll = (e) => {
    if (!open || !platform) return;
    const el = e.currentTarget;
    const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) <= 24;
    scrollMemRef.current[platform] = { top: el.scrollTop, atBottom };
  };

  // 每次打开 / 切平台 → 需重新定位。
  useEffect(() => { positionedRef.current = false; }, [open, platform]);

  // 内容就绪（loading 落定）后定位一次：恢复记忆位置，或默认拉到底。用 layout effect 避免可见跳动。
  useLayoutEffect(() => {
    if (!open || loading || positionedRef.current) return;
    const el = bodyRef.current;
    if (!el) return;
    const mem = scrollMemRef.current[platform];
    el.scrollTop = (!mem || mem.atBottom) ? el.scrollHeight : Math.min(mem.top, el.scrollHeight);
    positionedRef.current = true;
  }, [open, platform, loading, sessions]);

  const descriptor = IM_PLATFORMS.find((p) => p.id === platform) || null;
  const label = descriptor ? (() => { try { return t(descriptor.labelKey); } catch { return descriptor.fallback; } })() : '';

  // 发送者身份映射（senderId → {name, avatar}）：打开/切平台/刷新时拉取，按发送者覆盖 user 气泡的姓名+头像。
  const [senderMap, setSenderMap] = useState({});
  useEffect(() => {
    if (!open || !platform) return undefined;
    let cancelled = false;
    fetch(apiUrl(`/api/im/${encodeURIComponent(platform)}/senders`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setSenderMap((d && d.senders) || {}); })
      .catch(() => { if (!cancelled) setSenderMap({}); });
    return () => { cancelled = true; };
  }, [open, platform, reloadKey]);

  // 连接状态（与设置弹窗同源 /status）：打开时拉一次并每 5s 轮询，让用户在对话记录里也能确认桥接已连通。
  const [imConn, setImConn] = useState(null);
  const [imProc, setImProc] = useState(null);
  useEffect(() => {
    if (!open || !platform) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(apiUrl(`/api/im/${encodeURIComponent(platform)}/status`));
        if (!r.ok) { if (!cancelled) { setImConn({ running: false, connected: false }); setImProc(null); } return; }
        const d = await r.json();
        if (!cancelled) { setImConn(d.connection || null); setImProc(d.process || null); }
      } catch { if (!cancelled) { setImConn({ running: false, connected: false }); setImProc(null); } }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(id); };
    // reloadKey: 手动刷新时一并重拉连接状态（与下方对话/发送者 effect 对齐，否则刷新只更新内容不更新状态徽标）。
  }, [open, platform, reloadKey]);

  // 状态徽标：以真实进程状态为准（含服务端口）。远端无 process → 回落 connection。与 ImPlatformSettings 一致。
  const renderStatus = () => {
    if (imConn?.lastError) return <Tag color="error">{t('ui.im.statusError')}: {imConn.lastError}</Tag>;
    const portSuffix = imProc?.port ? ` :${imProc.port}` : '';
    const st = imProc?.state;
    if (st) {
      if (st === 'ready') {
        return imConn?.connected
          ? <Tag color="success">{t('ui.im.statusConnected')}{portSuffix}</Tag>
          : <Tag color="processing">{t('ui.im.statusRunning')}{portSuffix}</Tag>;
      }
      if (st === 'booting') return <Tag color="processing">{t('ui.im.statusBooting')}</Tag>;
      if (st === 'hung') return <Tag color="warning">{t('ui.im.statusHung')}</Tag>;
      return <Tag>{t('ui.im.statusDisconnected')}</Tag>;
    }
    if (!imConn) return null;
    if (imConn.connected) return <Tag color="success">{t('ui.im.statusConnected')}</Tag>;
    if (imConn.running) return <Tag color="processing">{t('ui.im.statusRunning')}</Tag>;
    return <Tag>{t('ui.im.statusDisconnected')}</Tag>;
  };

  useEffect(() => {
    if (!open || !platform) { prevRef.current = { open, platform }; return undefined; }
    // 纯刷新（仅 reloadKey 变：open 已是 true 且 platform 未变）保留旧内容，避免高度从内容→Spin→内容闪烁；
    // 切平台 / 重新打开则清空，先显示首屏 Spin。
    const isPureRefresh = prevRef.current.open === true && prevRef.current.platform === platform;
    prevRef.current = { open, platform };
    let es = null;
    let cancelled = false;
    setLoading(true); setError(null);
    if (!isPureRefresh) setSessions([]);
    // 刷新失败但已有内容时只弹 toast（不替换正文，避免抖动）；首屏无内容时走 Empty 报错态。
    const reportError = (e) => {
      setError(String(e?.message || e) || 'load_failed');
      if (sessionsRef.current.length > 0) message.error(t('ui.imRecord.loadFailed'));
    };

    (async () => {
      try {
        const r = await fetch(apiUrl(`/api/im/${encodeURIComponent(platform)}/logs`));
        if (!r.ok) throw new Error(`logs ${r.status}`);
        const { latest } = await r.json();
        if (cancelled) return;
        if (!latest) { setSessions([]); setLoading(false); return; }

        const entries = [];
        es = new EventSource(apiUrl(`/api/local-log?file=${encodeURIComponent(latest)}`));
        es.addEventListener('load_chunk', (ev) => {
          try { const chunk = JSON.parse(ev.data); if (Array.isArray(chunk)) for (const e of chunk) entries.push(e); } catch { /* skip bad chunk */ }
        });
        es.addEventListener('load_end', () => {
          es.close();
          if (cancelled) return;
          try {
            const reconstructed = reconstructEntries(entries);
            setSessions(buildSessionsFromEntries(reconstructed));
          } catch (e) { reportError(e); }
          setLoading(false);
        });
        es.onerror = () => { try { es.close(); } catch { /* noop */ } if (!cancelled) { reportError('load_failed'); setLoading(false); } };
      } catch (e) {
        if (!cancelled) { reportError(e); setLoading(false); }
      }
    })();

    return () => { cancelled = true; if (es) try { es.close(); } catch { /* noop */ } };
  }, [open, platform, reloadKey]);

  // 助手回复零滞后自动刷新：主服务 fs.watch 到本平台 IM 日志写入 → im_log_update SSE → AppBase 转 window 事件。
  // 弹窗打开时监听，命中当前 platform 即 bump reloadKey，复用上方「纯刷新」路径（保留滚动/吸底，不闪烁）。
  useEffect(() => {
    if (!open || !platform) return undefined;
    const onUpdate = (e) => {
      if (e?.detail?.platform === platform) setReloadKey((k) => k + 1);
    };
    window.addEventListener('cxv:im-log-update', onUpdate);
    return () => window.removeEventListener('cxv:im-log-update', onUpdate);
    // reloadKey 不入依赖：setReloadKey 用函数式更新，不读闭包内 reloadKey，无需重订阅（重订阅反而多余）。
  }, [open, platform]);

  // 助手（MainAgent）一侧的身份：用所属 IM 平台的 logo + 名称呈现。memo 在 [platform] 上稳定，避免每次重渲都
  // 生成新对象而打穿 ChatMessage 的 shouldComponentUpdate（imAgent !== 恒为真）。
  const imAgent = useMemo(
    () => (descriptor ? { name: label, Icon: descriptor.icon, color: descriptor.color } : null),
    [platform, label], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 始终基于当前 sessions 渲染（不再 loading?[]:...），刷新时旧内容仍在，高度稳定。
  // renderSessions 是纯函数（内部 cachedBuildToolResultMap 按 messages 引用记忆），重渲廉价。
  const items = renderSessions(sessions, senderMap, imAgent);

  const title = (
    <div className={styles.headerBar}>
      <span>{t('ui.imRecord.title')}</span>
      {onOpenConfig ? (
        <Tooltip title={t('ui.imRecord.config')}>
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            className={styles.refreshBtn}
            onClick={() => onOpenConfig(platform)}
          />
        </Tooltip>
      ) : null}
      <Tooltip title={t('ui.imRecord.refresh')}>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={loading} />}
          className={styles.refreshBtn}
          disabled={loading}
          onClick={() => setReloadKey((k) => k + 1)}
        />
      </Tooltip>
      <span className={styles.statusTag}>{renderStatus()}</span>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="left"
      width="min(760px, 92vw)"
      rootClassName="cxvSideDrawer"
      destroyOnHidden
      title={title}
      // header 高度由 global.css 的 `.cxvSideDrawer .ant-drawer-header` 统一压到 40px(对齐主窗口顶栏)。
      styles={{ body: { padding: 0, overflow: 'hidden', background: 'var(--bg-elevated)' }, header: { background: 'var(--bg-elevated)' } }}
    >
      <div className={styles.scrollBody} ref={bodyRef} onScroll={handleScroll}>
        {items.length > 0 ? (
          // 有内容优先渲染（刷新期间也是），保证高度稳定、不塌缩成 Spin
          items
        ) : loading ? (
          // 仅首屏加载（尚无内容）显示整页 Spin；刷新进度改由标题刷新图标的 spin 呈现
          <div className={styles.center}><Spin /><span className={styles.hint}>{t('ui.imRecord.loading')}</span></div>
        ) : error ? (
          <div className={styles.center}>
            <Empty description={t('ui.imRecord.loadFailed')} />
            <Button size="small" onClick={() => setReloadKey((k) => k + 1)}>{t('ui.imRecord.refresh')}</Button>
          </div>
        ) : (
          <Empty description={t('ui.imRecord.empty')} />
        )}
      </div>
    </Drawer>
  );
}
