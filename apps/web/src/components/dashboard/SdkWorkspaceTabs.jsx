import React, { useEffect, useRef, useState } from 'react';
import { Alert, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import SdkResumeModal from './SdkResumeModal';
import ProjectAliasEditor from '../settings/ProjectAliasEditor';
import { useProjectAlias } from '../../hooks/useProjectAlias';
import { apiUrl } from '../../utils/apiUrl';
import { sdkWorkspaceAfterClose, navigateSdkWorkspace } from '../../utils/sdkWorkspaceNavigation';
import { SDK_WORKSPACE_ORDER_KEY, readSdkWorkspaceOrder, saveSdkWorkspaceOrder,
  orderedSdkWorkspaces, moveSdkWorkspace, sdkWorkspaceLabels } from '../../utils/sdkWorkspaceOrder';
import { t } from '../../i18n';
import styles from './SdkWorkspaceTabs.module.css';

// Ported from fixed upstream AppHeader.SortableProjectTab (PR #145).
function SortableProjectTab({ id, children }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id, attributes: { role: 'presentation', roleDescription: undefined, tabIndex: -1 },
  });
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition,
    zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.85 : undefined,
    cursor: isDragging ? 'grabbing' : undefined, display: 'inline-flex' }} {...listeners}>{children}</div>;
}

function ProjectName({ session }) {
  const alias = useProjectAlias(session?.projectName);
  return <>{session?.projectName}{alias ? ` (${alias})` : ''}</>;
}

// Shared original Header presentation; PTY and SDK keep their own transports.
export default function SdkWorkspaceTabs({ onResumed, onNewProject, onResumeSession, sdkMode = true }) {
  const [sessions, setSessions] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(() => sdkMode && new URLSearchParams(window.location.search).get('resume') === '1');
  const [order, setOrder] = useState(readSdkWorkspaceOrder);
  const [announcement, setAnnouncement] = useState('');
  const [switching, setSwitching] = useState(null);
  const tabRefs = useRef(new Map());
  const focusAfterMove = useRef(null);
  const mounted = useRef(false);
  const seenInstance = useRef(null);
  const refresh = useRef(() => {});
  const ordered = orderedSdkWorkspaces(sessions, order);
  const labels = sdkWorkspaceLabels(sessions);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  useEffect(() => {
    const sync = event => {
      if (event.key === SDK_WORKSPACE_ORDER_KEY || event.key === null) setOrder(readSdkWorkspaceOrder());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    tabRefs.current.get(focusAfterMove.current)?.focus();
    focusAfterMove.current = null;
  }, [order]);
  useEffect(() => {
    mounted.current = true;
    let controller = null;
    const load = async () => {
      if (controller || document.hidden) return;
      controller = new AbortController();
      try {
        const response = await fetch(apiUrl('/api/workspaces'), { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t('ui.sdkWorkspaces.failed'));
        if (!mounted.current) return;
        const params = new URLSearchParams(window.location.search);
        const requested = params.get('instance');
        if (requested && (data.sessions || []).some(session => session.instanceKey === requested)) {
          seenInstance.current = requested;
        } else if (requested && seenInstance.current === requested && !params.has('logfile')) {
          // Upstream handleLiveProjectsChange: a once-live viewed instance closed
          // elsewhere must detach to a survivor. Unknown URLs still fail closed.
          navigateSdkWorkspace(data.sessions?.[0]?.instanceKey || null);
          return;
        }
        setSessions(data.sessions || []);
        setCurrent(new URLSearchParams(window.location.search).get('workspaces') === '1'
          ? null : (data.currentInstanceKey || null));
        setError(null);
      } catch (failure) {
        if (mounted.current && failure.name !== 'AbortError') setError(failure.message);
      } finally { controller = null; }
    };
    refresh.current = load;
    void load();
    const timer = setInterval(load, 5000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      controller?.abort();
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);


  const navigate = key => {
    if (key === current) return;
    setSwitching(key);
    navigateSdkWorkspace(key);
  };
  const reorder = (from, to, focus = false) => {
    const next = moveSdkWorkspace(ordered, from, to);
    if (!next) return;
    if (focus) focusAfterMove.current = from;
    setOrder(next); saveSdkWorkspaceOrder(next);
    setAnnouncement(t('ui.sdkWorkspaces.moved', {
      project: labels.get(from), position: next.indexOf(from) + 1, total: next.length,
    }));
  };
  const closeHistory = () => {
    setHistoryOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('resume');
    window.history.replaceState(null, '', url.href);
  };
  const close = async key => {
    if (!sessions.some(session => session.instanceKey === key)) return;
    const response = await fetch(apiUrl('/api/workspaces/close'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceKey: key }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (mounted.current) { setError(result.error || t('ui.sdkWorkspaces.failed')); void refresh.current(); }
      throw new Error(result.error || t('ui.sdkWorkspaces.failed'));
    }
    const viewed = new URLSearchParams(window.location.search).get('instance') || current;
    const next = sdkWorkspaceAfterClose(viewed, key, result.reattachedTo);
    if (next !== undefined) navigateSdkWorkspace(next);
    else if (mounted.current) void refresh.current();
  };
  const newProject = <Tooltip title={t('ui.resume.newProject')} placement="bottom">
    <button type="button" className={styles.newProjectPlusBtn} aria-label={t('ui.resume.newProject')}
      onClick={() => onNewProject ? onNewProject() : navigateSdkWorkspace(null)}>
      <PlusOutlined />
    </button>
  </Tooltip>;
  const selected = sessions.find(session => session.instanceKey === current);
  return <nav className={styles.switcher} aria-label={t('ui.sdkWorkspaces.title')}>
    {error && <Alert type="warning" showIcon message={error} />}
    {ordered.length >= 2 ? <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => { if (active && over) reorder(String(active.id), String(over.id)); }}
      modifiers={[restrictToHorizontalAxis, restrictToParentElement]}>
      <SortableContext items={ordered.map(session => session.instanceKey)} strategy={horizontalListSortingStrategy}>
        <div className={styles.projectTabsStrip}>
          {switching && <span className={`${styles.projectTabRingSpin} ${styles.projectTabRingActive} ${styles.projectTabsStripSpinner}`}
            aria-hidden="true" title={t('ui.resume.switching')} />}
          {ordered.map((session, index) => {
            const key = session.instanceKey, active = key === current;
            const label = labels.get(key) || session.projectName;
            const suffix = label.slice(session.projectName.length);
            return <SortableProjectTab key={key} id={key}>
              <div className={`${styles.projectTab}${active ? ` ${styles.projectTabActive}` : ''}`}
                data-sdk-workspace={key} role="button" tabIndex={0}
                ref={node => { if (node) tabRefs.current.set(key, node); else tabRefs.current.delete(key); }}
                aria-current={active ? 'page' : undefined} aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                onClick={() => navigate(key)} onKeyDown={event => {
                  if (event.altKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                    event.preventDefault(); event.stopPropagation();
                    reorder(key, ordered[index + (event.key === 'ArrowLeft' ? -1 : 1)]?.instanceKey, true);
                  } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(key); }
                }}>
                {switching === key ? <span aria-hidden="true" className={`${styles.projectTabRingSpin} ${active ? styles.projectTabRingActive : styles.projectTabRing}`} />
                  : <span className={styles.projectTabDot} aria-hidden="true" />}
                <span className={styles.projectTabName} title={session.cwd}><ProjectName session={session} /></span>
                {suffix && <span className={styles.projectTabIdx}>{suffix}</span>}
                <Popconfirm title={t('ui.projectTabs.closeConfirm', { project: label })}
                  description={session.cwd} okText={t('ui.ok')} cancelText={t('ui.cancel')}
                  onConfirm={() => close(key)}>
                  <button type="button" className={styles.projectTabClose} title={t('ui.projectTabs.closeTip')}
                    aria-label={`${t('ui.projectTabs.closeTip')}: ${session.cwd}`} tabIndex={0}
                    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
                    onKeyDown={event => event.stopPropagation()}>{'\u00d7'}</button>
                </Popconfirm>
              </div>
            </SortableProjectTab>;
          })}
          {newProject}
        </div>
      </SortableContext>
    </DndContext> : <>
      <span className={styles.headerProjectName}>{t('ui.liveMonitoring')}{selected ? ':' : ''}<ProjectName session={selected} />
        <ProjectAliasEditor projectName={selected?.projectName} /></span>
      {newProject}
    </>}
    <span className={styles.announcement} role="status" aria-live="polite">{announcement}</span>
    {sdkMode && <SdkResumeModal key={current || 'picker'} open={historyOpen} session={selected}
      onClose={closeHistory} onResumed={onResumed} onResumeSession={onResumeSession} />}
  </nav>;
}
