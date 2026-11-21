import React, { useState, useCallback, useRef, useEffect, useMemo, useContext } from 'react';
import { Dropdown, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { apiUrl } from '../../utils/apiUrl';
import { getFileIcon } from '../../utils/fileIcons';
import OpenFolderIcon from '../common/OpenFolderIcon';
import { SettingsContext } from '../../contexts/SettingsContext';
import { buildFileContextMenuItems } from './fileContextMenu';
import { createFileMenuHandler } from './fileContextMenuActions';
import { moveFile, canDropMoveOn } from './fileMove';
import { importFiles, isExternalFileDrag, getTopLevelEntries } from './importFiles';
import HtmlPreviewModal from '../common/HtmlPreviewModal';
import FileBrowserModal from './FileBrowserModal';
import { isOverModalPortal } from '../../utils/dragGuards';
import { FILE_DRAG_TYPE, FOLDER_DRAG_TYPE } from '../../utils/fileDragDrop';
import SearchPanel from '../search/SearchPanel';
import styles from './FileExplorer.module.css';

// Extract the server-provided `error` field on non-OK responses (view-root
// failures carry a specific reason like "ambiguous project name") so the error
// state shows the real cause instead of a bare "Failed to load".
async function readJsonOrThrow(res) {
  if (res.ok) return res.json();
  let reason = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string' && body.error) reason = body.error;
  } catch { /* non-JSON error body → keep HTTP status */ }
  throw new Error(reason);
}

function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpand, currentFile, onFileRenamed, refreshTrigger, onHtmlPreview, onAttachToChat, onInsertPathToChat, onImportFiles }) {
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const submittingRef = useRef(false);
  const itemRef = useRef(null);

  const { preferences } = useContext(SettingsContext);
  const isRemote = preferences?._isLocal === false;

  const childPath = path ? `${path}/${item.name}` : item.name;
  const expanded = expandedPaths.has(childPath);
  const isGitIgnored = item.gitIgnored || false;

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/files?path=${encodeURIComponent(childPath)}`));
      const data = await readJsonOrThrow(res);
      setChildren(data);
    } catch (e) {
      setError(t('ui.fileExplorer.loadFailed', { reason: e.message }));
    } finally {
      setLoading(false);
    }
  }, [childPath]);

  // expanded 变为 true 时自动加载子节点（恢复展开状态 & 从对话点击路径时级联展开）
  useEffect(() => {
    if (item.type === 'directory' && expanded && children === null && !loading) {
      fetchChildren();
    }
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // refreshTrigger 变化时，已展开的目录重新加载子节点
  useEffect(() => {
    if (refreshTrigger > 0 && item.type === 'directory' && expanded && children !== null) {
      fetchChildren();
    }
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async () => {
    if (item.type !== 'directory') {
      const ext = (childPath || '').split('.').pop().toLowerCase();
      // .html/.htm 文件在弹窗 iframe 中预览
      if (ext === 'html' || ext === 'htm') {
        if (onHtmlPreview) onHtmlPreview(childPath);
        return;
      }
      // 点击文件，触发回调（Office 文件由上层 onFileClick 回调统一拦截）
      if (onFileClick) onFileClick(childPath);
      return;
    }
    if (expanded) {
      onToggleExpand(childPath);
      return;
    }
    if (children === null) {
      await fetchChildren();
    }
    onToggleExpand(childPath);
  }, [expanded, children, childPath, item, onFileClick, onToggleExpand, fetchChildren, onHtmlPreview]);

  const isDir = item.type === 'directory';
  const isSelected = currentFile && currentFile === childPath;

  // 选中文件时自动滚动到可见区域
  useEffect(() => {
    if (isSelected && itemRef.current) {
      requestAnimationFrame(() => {
        itemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      });
    }
  }, [isSelected]);

  // 进入编辑模式
  const startEditing = useCallback(() => {
    setEditName(item.name);
    setEditing(true);
    submittingRef.current = false;
  }, [item.name]);

  // 编辑模式下自动 focus 并选中文件名（不含扩展名）
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const dotIdx = item.name.lastIndexOf('.');
      if (dotIdx > 0 && item.type !== 'directory') {
        inputRef.current.setSelectionRange(0, dotIdx);
      } else {
        inputRef.current.select();
      }
    }
  }, [editing, item.name, item.type]);

  // 提交重命名
  const submitRename = useCallback(async () => {
    if (submittingRef.current) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === item.name) {
      setEditing(false);
      return;
    }
    submittingRef.current = true;
    try {
      const res = await fetch(apiUrl('/api/rename-file'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: childPath, newName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(t('ui.renameFailed', { error: data.error || res.statusText }));
        setEditing(false);
        return;
      }
      setEditing(false);
      if (onFileRenamed) onFileRenamed(childPath, data.newPath);
    } catch (err) {
      alert(t('ui.renameFailed', { error: err.message }));
      setEditing(false);
    }
  }, [editName, item.name, childPath, onFileRenamed]);

  // 取消编辑
  const cancelEditing = useCallback(() => {
    setEditing(false);
  }, []);

  // 双击进入编辑模式
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    if (isSelected) {
      startEditing();
    }
  }, [isSelected, startEditing]);

  // 键盘事件：Enter 进入编辑模式 / F2 进入编辑模式
  const handleKeyDown = useCallback((e) => {
    if (editing) return;
    if ((e.key === 'Enter' || e.key === 'F2') && isSelected) {
      e.preventDefault();
      e.stopPropagation();
      startEditing();
    }
  }, [editing, isSelected, startEditing]);

  // 输入框键盘事件
  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
    e.stopPropagation();
  }, [submitRename, cancelEditing]);

  const handleClick = useCallback((e) => {
    if (editing) {
      e.stopPropagation();
      return;
    }
    toggle();
  }, [editing, toggle]);

  // 拖拽事件处理
  const handleDragStart = useCallback((e) => {
    if (editing) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', childPath);
    e.dataTransfer.setData('text/x-internal-move', '1');
    e.dataTransfer.setData(isDir ? FOLDER_DRAG_TYPE : FILE_DRAG_TYPE, '1');
    e.dataTransfer.effectAllowed = 'copyMove';
    setDragging(true);
  }, [childPath, editing, isDir]);

  const handleDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  const autoExpandTimer = useRef(null);
  const handleDragOver = useCallback((e) => {
    const isExternal = isExternalFileDrag(e);
    const isInternal = e.dataTransfer.types.includes('text/x-internal-move');
    // 内部移动只接受目录；外部导入接受任意节点（文件节点→导入到父目录）
    if (isInternal && !isDir) return;
    if (!isExternal && !isInternal) return;
    e.preventDefault();
    // 节点接受 drop 后阻止冒泡：否则容器级 onDragOver 会同帧 setExternalDragOver(true)
    // / 覆写 dropEffect，导致视觉闪烁与"拖到空白处=移到根"的语义被错误触发。
    e.stopPropagation();
    e.dataTransfer.dropEffect = isExternal ? 'copy' : 'move';
    setDragOver(true);
    // hover 在折叠目录上 500ms → 自动展开（外部导入和内部移动都支持）
    if (isDir && !expanded && !autoExpandTimer.current) {
      autoExpandTimer.current = setTimeout(() => {
        onToggleExpand(childPath);
        autoExpandTimer.current = null;
      }, 500);
    }
  }, [isDir, expanded, childPath, onToggleExpand]);

  const handleDragLeave = useCallback((e) => {
    // 只在真正离开此节点时才移除高亮（忽略子元素事件冒泡）
    if (itemRef.current && !itemRef.current.contains(e.relatedTarget)) {
      setDragOver(false);
      if (autoExpandTimer.current) { clearTimeout(autoExpandTimer.current); autoExpandTimer.current = null; }
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    // 任何已 preventDefault 的 drop 都视为"被节点消费"——同时 stopPropagation 防止冒泡
    // 到容器级 handleContainerDrop 再次触发"移到根"。包含所有 internal early-return 路径。
    e.stopPropagation();
    setDragOver(false);
    // External file drop — 目录节点导入到该目录，文件节点导入到其父目录
    if (isExternalFileDrag(e) && (e.dataTransfer.files.length > 0 || (e.dataTransfer.items && e.dataTransfer.items.length > 0))) {
      // 同步阶段一次性抽取 entry（异步后 items 会失效）
      const topEntries = getTopLevelEntries(e.dataTransfer.items);
      const flatFiles = Array.from(e.dataTransfer.files);
      const targetDir = isDir ? childPath : (childPath.includes('/') ? childPath.substring(0, childPath.lastIndexOf('/')) : '');
      if (onImportFiles) onImportFiles({ topEntries, flatFiles }, targetDir);
      return;
    }
    // Original shared move guards and request, also used by the browser modal.
    const fromPath = e.dataTransfer.getData('text/plain');
    if (!isDir || e.dataTransfer.dropEffect !== 'move' || !canDropMoveOn(fromPath, childPath)) return;
    moveFile(fromPath, childPath, { onFileRenamed });
  }, [childPath, isDir, onFileRenamed, onImportFiles]);

  const contextMenuItems = useMemo(
    () => buildFileContextMenuItems({ isDir, isRemote }),
    [isDir, isRemote]);
  const handleMenuClick = useMemo(
    () => createFileMenuHandler({
      path: childPath, name: item.name, isDir, renameMode: 'inline',
      startEditing, onFileRenamed, onAttachToChat, onInsertPathToChat,
    }),
    [childPath, item.name, isDir, startEditing, onFileRenamed, onAttachToChat, onInsertPathToChat]);

  const treeItemDiv = (
    <div
      ref={itemRef}
      className={`${styles.treeItem}${isSelected ? ' ' + styles.treeItemSelected : ''}${isGitIgnored ? ' ' + styles.treeItemGitIgnored : ''}${dragging ? ' ' + styles.treeItemDragging : ''}${dragOver ? ' ' + styles.treeItemDragOver : ''}`}
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      draggable={!editing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className={styles.arrow}>
        {isDir ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.arrowIcon} style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}>
            <polyline points="9 6 15 12 9 18"/>
          </svg>
        ) : ''}
      </span>
      <span className={styles.icon}>{getFileIcon(item.name, item.type)}</span>
      {editing ? (
        <input
          ref={inputRef}
          className={styles.fileNameInput}
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={submitRename}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className={styles.fileName}>{item.name}</span>
      )}
    </div>
  );

  return (
    <>
      <Dropdown menu={{ items: contextMenuItems, onClick: handleMenuClick }} trigger={['contextMenu']}>
        {treeItemDiv}
      </Dropdown>
      {expanded && loading && (
        <div className={styles.loading} style={{ paddingLeft: 24 + depth * 16 }}>...</div>
      )}
      {expanded && error && (
        <div className={styles.error} style={{ paddingLeft: 24 + depth * 16 }}>{error}</div>
      )}
      {expanded && children && children.map(child => (
        <TreeNode key={child.name} item={child} path={childPath} depth={depth + 1} onFileClick={onFileClick} expandedPaths={expandedPaths} onToggleExpand={onToggleExpand} currentFile={currentFile} onFileRenamed={onFileRenamed} refreshTrigger={refreshTrigger} onHtmlPreview={onHtmlPreview} onAttachToChat={onAttachToChat} onInsertPathToChat={onInsertPathToChat} onImportFiles={onImportFiles} />
      ))}
    </>
  );
}

export default function FileExplorer({ style, onClose, onFileClick, expandedPaths, onToggleExpand, currentFile, refreshTrigger, onManualRefresh, onFileRenamed, onAttachToChat, onInsertPathToChat, searchOpen, onToggleSearch, searchGetDirtyPath, onSearchReplaceApplied, onOpenSearchResult }) {
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [viewInstance] = useState(() => new URLSearchParams(window.location.search).get('instance'));
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [htmlPreviewPath, setHtmlPreviewPath] = useState(null);
  const [externalDragOver, setExternalDragOver] = useState(false);
  // Search/tree split ratio (embedded search only). null = 50/50 default; the
  // horizontal sash between tree and search drags this within [0.35, 0.8]
  // (the floor keeps the search chrome + a usable results slice visible).
  // Session-scoped (not persisted); resets to 50/50 when the explorer
  // unmounts (panel close), matching its pre-drag behavior.
  const [searchRatio, setSearchRatio] = useState(null);

  // 内部拖动（树内文件拖到容器空白处 = 移到项目根目录）的容器高亮状态。
  // 与 externalDragOver 同帧只可能有一个为 true（容器 dragOver handler 用 isInternal 二选一）。
  const [internalContainerDragOver, setInternalContainerDragOver] = useState(false);
  const mounted = useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  const manualRefreshRef = useRef(false);
  const containerRef = useRef(null);
  const autoRefreshCallbackRef = useRef(onManualRefresh);
  const lastAutoRefreshRef = useRef(Date.now());
  autoRefreshCallbackRef.current = onManualRefresh;

  // 重新加载根目录
  const refreshRoot = useCallback(() => {
    if (!mounted.current) return Promise.resolve();
    setError(null);
    return fetch(apiUrl('/api/files?path='))
      .then(readJsonOrThrow)
      .then(data => { if (mounted.current) setItems(data); })
      .catch(e => { if (mounted.current) setError(t('ui.fileExplorer.loadFailed', { reason: e.message })); });
  }, []);

  useEffect(() => {
    mounted.current = true;

    // 加载根目录
    setError(null);
    fetch(apiUrl('/api/files?path='))
      .then(readJsonOrThrow)
      .then(data => { if (mounted.current) setItems(data); })
      .catch(e => { if (mounted.current) setError(t('ui.fileExplorer.loadFailed', { reason: e.message })); });

    return () => {
      mounted.current = false;
    };
  }, []); // 空依赖数组，只在挂载时执行一次

  // 项目可能在页面保持打开时被 git pull、安装器或外部编辑器更新。
  // 页面重新可见时刷新整棵已展开的树，避免展示已经不存在的文件。
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastAutoRefreshRef.current < 500) return;
      lastAutoRefreshRef.current = now;
      if (autoRefreshCallbackRef.current) autoRefreshCallbackRef.current();
      else refreshRoot();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshRoot]);

  const handleManualRefresh = useCallback(() => {
    manualRefreshRef.current = true;
    setRefreshing(true);
    onManualRefresh && onManualRefresh();
  }, [onManualRefresh]);

  // 工具触发的增量刷新
  useEffect(() => {
    if (refreshTrigger > 0) {
      const isManual = manualRefreshRef.current;
      manualRefreshRef.current = false;
      Promise.resolve(refreshRoot()).finally(() => {
        if (isManual && mounted.current) setRefreshing(false);
      });
    }
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const headerMenuItems = useMemo(
    () => buildFileContextMenuItems({ isDir: true, isRemote: false, scope: 'container' }),
    []);
  const handleHeaderMenuClick = useMemo(
    () => createFileMenuHandler({ path: '', name: '', isDir: true, onFileRenamed }),
    [onFileRenamed]);

  // Original shared pipeline; each operation retains the view in which it began.
  const handleImportFiles = useCallback(
    (payload, targetDir) => importFiles(payload, targetDir, { onFileRenamed }),
    [onFileRenamed]);

  // Container-level drag events for external files
  // dragover 定时器模式：持续收到 dragover 时保持高亮，300ms 无 dragover 则认为拖拽结束
  const dragTimerRef = useRef(null);

  const resetDragState = useCallback(() => {
    if (dragTimerRef.current) { clearTimeout(dragTimerRef.current); dragTimerRef.current = null; }
    setExternalDragOver(false);
    setInternalContainerDragOver(false);
  }, []);

  // 全局 drop/dragend 兜底：确保任何情况下状态都能重置
  useEffect(() => {
    const handler = () => resetDragState();
    document.addEventListener('drop', handler);
    document.addEventListener('dragend', handler);
    return () => {
      document.removeEventListener('drop', handler);
      document.removeEventListener('dragend', handler);
    };
  }, [resetDragState]);

  const handleContainerDragOver = useCallback((e) => {
    if (isOverModalPortal(e)) return;
    const isInternal = e.dataTransfer.types.includes('text/x-internal-move');
    const isExternal = isExternalFileDrag(e);
    if (!isInternal && !isExternal) return;
    e.preventDefault();
    if (isInternal) {
      e.dataTransfer.dropEffect = 'move';
      if (!internalContainerDragOver) setInternalContainerDragOver(true);
    } else {
      e.dataTransfer.dropEffect = 'copy';
      if (!externalDragOver) setExternalDragOver(true);
    }
    // 每次 dragover 重置定时器，300ms 内无新 dragover 则清除状态
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = setTimeout(() => {
      setExternalDragOver(false);
      setInternalContainerDragOver(false);
      dragTimerRef.current = null;
    }, 300);
  }, [externalDragOver, internalContainerDragOver]);

  const handleContainerDrop = useCallback(async (e) => {
    resetDragState();
    if (isOverModalPortal(e)) return;
    // 1) External file drop：保留既有 import 行为（拖外部文件到容器空白处 = 导入到根）
    if (isExternalFileDrag(e)) {
      e.preventDefault();
      e.stopPropagation();
      // 同步阶段一次性抽取 entry（异步后 items 会失效）
      const topEntries = getTopLevelEntries(e.dataTransfer.items);
      const flatFiles = Array.from(e.dataTransfer.files);
      if ((topEntries && topEntries.length > 0) || flatFiles.length > 0) {
        handleImportFiles({ topEntries, flatFiles }, '');
      }
      return;
    }
    // 2) Internal move：拖树内文件到容器空白处 = 移到项目根目录。
    //    TreeNode 内 drop 已 stopPropagation，所以只有"目标 = 空白处"才会走到这里。
    if (!e.dataTransfer.types.includes('text/x-internal-move')) return;
    e.preventDefault();
    const fromPath = e.dataTransfer.getData('text/plain');
    if (!fromPath) {
      // Safari / Firefox 个别版本在 drop 阶段 getData('text/plain') 偶发返空，
      // 用户感知是"拖到空白处啥也没发生"；落一条 warn 便于排查这种平台 bug。
      console.warn('[FileExplorer] internal-move drop with empty fromPath; ignored');
      return;
    }
    const fromDir = fromPath.includes('/') ? fromPath.substring(0, fromPath.lastIndexOf('/')) : '';
    if (fromDir === '') return; // 已在根，no-op（拖回原位无效果，符合直觉）
    if (e.dataTransfer.dropEffect !== 'move') return;
    moveFile(fromPath, '', { onFileRenamed });
  }, [handleImportFiles, resetDragState, onFileRenamed]);

  // Horizontal sash between the tree and the embedded search panel. Mirrors
  // ChatView's splitDragController lifecycle (document move/up listeners, body
  // cursor + userSelect, teardown on mouseup AND unmount) but stays local:
  // the ratio is session state, no snap lines, no localStorage.
  const searchDragRef = useRef(null);
  const handleSearchSashDown = useCallback((e) => {
    e.preventDefault();
    const sashEl = e.currentTarget;
    // Pointer events + capture cover mouse/touch/pen uniformly (plain mouse
    // events give iPad no move stream), and capture guarantees the up/cancel
    // even when the press is released outside the browser window.
    const pid = e.pointerId;
    const move = (ev) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.height <= 0) return;
      // Ratio is the SEARCH area's share of the whole explorer (header incl.);
      // clamped so neither tree nor search can be squashed to zero. The floor
      // also keeps at least ~60px for results on realistic panel heights
      // (the fixed search chrome alone is ~97-209px depending on persisted
      // replace/details state).
      const ratio = 1 - (ev.clientY - rect.top) / rect.height;
      setSearchRatio(Math.min(0.8, Math.max(0.35, ratio)));
    };
    const up = () => {
      if (sashEl.hasPointerCapture?.(pid)) sashEl.releasePointerCapture(pid);
      sashEl.removeEventListener('pointermove', move);
      sashEl.removeEventListener('pointerup', up);
      sashEl.removeEventListener('pointercancel', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      searchDragRef.current = null;
    };
    searchDragRef.current = { move, up };
    sashEl.setPointerCapture?.(pid);
    sashEl.addEventListener('pointermove', move);
    sashEl.addEventListener('pointerup', up);
    sashEl.addEventListener('pointercancel', up);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => () => {
    // Unmount mid-drag: restore document listeners/cursor so the page never
    // gets stuck in row-resize.
    if (searchDragRef.current) searchDragRef.current.up();
  }, []);

  // The sash unmounts with the panel (it renders only while searchOpen). If the
  // panel closes mid-drag (e.g. Escape in an empty query), pointer capture is
  // released and pointerup never reaches the sash — run the teardown so body
  // cursor/userSelect don't stay stuck in row-resize.
  useEffect(() => {
    if (!searchOpen && searchDragRef.current) searchDragRef.current.up();
  }, [searchOpen]);

  return (
    <div ref={containerRef} className={`${styles.fileExplorer}${externalDragOver ? ' ' + styles.fileExplorerDragOver : ''}${internalContainerDragOver ? ' ' + styles.internalDragOverContainer : ''}`} style={style} data-file-explorer onDragOver={handleContainerDragOver} onDrop={handleContainerDrop}>
      <div className={styles.header}>
        <Dropdown menu={{ items: headerMenuItems, onClick: handleHeaderMenuClick }} trigger={['contextMenu']}>
          <span className={styles.headerTitle}>
            <OpenFolderIcon apiEndpoint={apiUrl('/api/open-project-dir')} title={t('ui.openProjectDir')} size={14} onClick={() => setFileBrowserOpen(true)} />
            {t('ui.fileExplorer')}
            {/* 手动刷新：外部 mv/cp/系统级文件变化等 tool_result 感知不到的场景下用户兜底；
                复用既有 refreshTrigger++ 链路（ChatView state.fileExplorerRefresh），TreeNode
                的 useEffect 监听到变化 → 已展开目录全部重拉一次。与「上下文消耗」刷新按钮同款
                antd text 小按钮 + ReloadOutlined，点击后无限旋转直到根目录重拉完成（仅手动时转）。 */}
            {onManualRefresh && (
              <Button
                size="small"
                type="text"
                className={styles.refreshBtn}
                icon={<ReloadOutlined />}
                onClick={handleManualRefresh}
                loading={refreshing}
                disabled={refreshing}
                aria-label={t('ui.fileExplorer.refresh')}
                title={t('ui.fileExplorer.refresh')}
              />
            )}
            {/* Search toggle: replaces the old standalone rail 🔍 entry. Opens the
                SearchPanel embedded below the tree inside this panel (active state
                turns blue); click again to close. stopPropagation keeps the click
                off the surrounding Dropdown's contextMenu area semantics. */}
            {onToggleSearch && (
              <button
                type="button"
                data-search-toggle
                className={searchOpen ? styles.searchToggleActive : styles.searchToggle}
                aria-pressed={!!searchOpen}
                title={t('ui.search')}
                onClick={(e) => { e.stopPropagation(); onToggleSearch(); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            )}
          </span>
        </Dropdown>
        <button className={styles.headerCloseBtn} onClick={onClose} title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7"/>
            <polyline points="18 17 13 12 18 7"/>
          </svg>
        </button>
      </div>
      <div className={styles.treeContainer}>
        {error && <div className={styles.error}>{error}</div>}
        {!items && !error && <div className={styles.loading}>{t('ui.loading')}</div>}
        {items && items.map(item => (
          <TreeNode key={item.name} item={item} path="" depth={0} onFileClick={onFileClick} expandedPaths={expandedPaths} onToggleExpand={onToggleExpand} currentFile={currentFile} onFileRenamed={onFileRenamed} refreshTrigger={refreshTrigger} onHtmlPreview={setHtmlPreviewPath} onAttachToChat={onAttachToChat} onInsertPathToChat={onInsertPathToChat} onImportFiles={handleImportFiles} />
        ))}
        {/* Blank area below the list: right-click = the header context menu
            (same 'container' definition). Tree rows have their own Dropdown and
            stop the event from bubbling only via antd Dropdown NOT calling
            stopPropagation — so this spacer must stopPropagation when a click
            lands on it directly; row right-clicks are handled by the row's own
            Dropdown (its rc-trigger handler runs first and preventDefaults). */}
        <Dropdown menu={{ items: headerMenuItems, onClick: handleHeaderMenuClick }} trigger={['contextMenu']}>
          <div
            className={styles.treeBlankArea}
            onContextMenu={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
      {searchOpen && onToggleSearch && (
        // The embedded search area is not a drop target: stop container-level
        // drags here so releasing a tree file (or an OS file) over the search
        // results doesn't silently move/import it into the project root.
        <>
          <div
            className={styles.searchSash}
            onPointerDown={handleSearchSashDown}
            role="separator"
            aria-orientation="horizontal"
            aria-label={t('ui.fileExplorer.resizeSearch')}
            // Not a drop target either (same guard as the search wrapper below):
            // releasing a drag on the 5px divider must not move/import to root.
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'none'; }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
          />
          <div
            className={`${styles.embeddedSearchWrap}${searchRatio != null ? ' ' + styles.dragged : ''}`}
            style={searchRatio != null ? { height: `${Math.round(searchRatio * 1000) / 10}%` } : undefined}
            onDragOver={(e) => {
              // Reject must preventDefault too: a bare stopPropagation suppresses
              // the container/AppBase handlers that cancel dragover, and an
              // uncancelled dragover makes the browser perform its default drop
              // action (navigating the tab to the dropped file) on release.
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'none';
            }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <SearchPanel
              embedded
              className={styles.embeddedSearchPanel}
              onClose={onToggleSearch}
              getDirtyPath={searchGetDirtyPath}
              onReplaceApplied={onSearchReplaceApplied}
              onOpenResult={onOpenSearchResult}
            />
          </div>
        </>
      )}
      <FileBrowserModal open={fileBrowserOpen} onClose={() => setFileBrowserOpen(false)}
        instance={viewInstance} onAttachToChat={onAttachToChat} onInsertPathToChat={onInsertPathToChat}
        onFileRenamed={onFileRenamed} refreshTrigger={refreshTrigger} />
      {htmlPreviewPath && <HtmlPreviewModal path={htmlPreviewPath} onClose={() => setHtmlPreviewPath(null)} />}
    </div>
  );
}
