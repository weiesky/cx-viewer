import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Switch, Input, Button, Select, Tag, Tooltip, Dropdown, message } from 'antd';
import { DownOutlined, RightOutlined, QuestionCircleOutlined, PlusOutlined, SettingOutlined, FolderOpenOutlined, FileZipOutlined, FileMarkdownOutlined } from '@ant-design/icons';
import { apiUrl } from '../../utils/apiUrl';
import { imTr as _tr } from '../../utils/imTr';
import ImAppendSystemModal from './ImAppendSystemModal';
import ImSkillsModal from './ImSkillsModal';
import styles from './ImPlatformSettings.module.css';

const SUPPORTS_DIRECTORY_UPLOAD = typeof document !== 'undefined'
  && 'webkitdirectory' in document.createElement('input');

function defaultValue(field) {
  if (field.type === 'tags') return [];
  if (field.type === 'switch') return false;
  if (field.type === 'select') return field.default ?? (field.options?.[0]?.value ?? '');
  return '';
}

// 启动校验：轮询 status 直到 worker 真就绪（state==='ready'）或超时。
const START_POLL_TIMEOUT_MS = 30000;
const START_POLL_INTERVAL_MS = 500;

/**
 * Generic, descriptor-driven IM bridge settings form (see imPlatforms.js). Self-contained:
 * fetches the platform's status on mount and polls every 5s while open so the live connection
 * badge stays fresh. Secret (password) fields are never returned by the server (only hasSecret) —
 * an empty secret field on save means "keep the stored one".
 *
 * 交互模型（用户确认）：配置随输入失焦/变更**自动保存**（仅存盘、不驱动进程），故无「保存」按钮、
 * 无顶部「启用」开关；底部用「启动 / 停止」显式控制 worker 进程。启动后前端轮询 status 直到 worker
 * 真就绪才算成功——状态以「实际进程启动成功」为准（含展示真实服务端口）。
 */
export default function ImPlatformSettings({ descriptor }) {
  const initialValues = useMemo(() => {
    const v = {};
    for (const f of descriptor.fields) v[f.key] = defaultValue(f);
    return v;
  }, [descriptor]);

  const [enabled, setEnabled] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [hasSecret, setHasSecret] = useState(false);
  const [connection, setConnection] = useState(null);
  const [proc, setProc] = useState(null); // { state, port, pid, ... } 仅本机 admin 有；远端为 null
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false); // 「模型性格定义」(worker AGENTS.md) 编辑弹窗
  const [skillsModalOpen, setSkillsModalOpen] = useState(false); // 「SKILL 管理」弹窗
  const [skillsReloadKey, setSkillsReloadKey] = useState(0);     // 新增 skill 成功后 bump，触发管理弹窗重新拉取
  const skillFileInputRef = useRef(null);
  const skillFolderInputRef = useRef(null);

  const label = (() => { try { return _tr(descriptor.labelKey, null, descriptor.fallback); } catch { return descriptor.fallback; } })();

  // skill 上传到该 IM 的 .codex/skills/（dropdown 三入口共用）。文件夹入口先校验根目录有 SKILL.md，再 JSZip 打包走 zip 通道。
  const postSkillImport = async (file) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const resp = await fetch(apiUrl(`/api/im/${encodeURIComponent(descriptor.id)}/skills/import`), { method: 'POST', body: form });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        let reason = data.error || resp.statusText;
        if (data.code === 'INVALID_TYPE') reason = _tr('ui.skills.invalidType', null, 'Only .zip or SKILL.md');
        else if (data.code === 'MISSING_SKILL_MD') reason = _tr('ui.skills.zipMissingSkillMd', null, 'SKILL.md not found in the zip');
        message.error(_tr('ui.skills.uploadFailed', { reason }, `Failed to add skill: ${reason}`));
        return;
      }
      message.success(_tr('ui.im.skillsRestartHint', null, 'Updated — takes effect after you restart this IM'));
      setSkillsReloadKey((k) => k + 1); // 管理弹窗若开着则刷新
    } catch (err) {
      message.error(_tr('ui.skills.uploadFailed', { reason: err?.message || 'network' }, 'Failed to add skill'));
    }
  };

  const handleSkillFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.md')) { message.error(_tr('ui.skills.invalidType', null, 'Only .zip or SKILL.md')); return; }
    await postSkillImport(file);
  };

  const handleSkillFolderSelected = async (e) => {
    const fileList = e.target.files;
    e.target.value = '';
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const hasRootSkillMd = files.some((f) => {
      const parts = (f.webkitRelativePath || '').split('/');
      return parts.length === 2 && parts[1].toLowerCase() === 'skill.md';
    });
    if (!hasRootSkillMd) { message.error(_tr('ui.skills.folderMissingSkillMd', null, 'SKILL.md not found at the folder root')); return; }
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
      await postSkillImport(new File([blob], `${rootName}.zip`, { type: 'application/zip' }));
    } catch (err) {
      message.error(_tr('ui.skills.uploadFailed', { reason: err?.message || 'pack failed' }, 'Failed to add skill'));
    }
  };

  const skillAddMenu = {
    items: [
      ...(SUPPORTS_DIRECTORY_UPLOAD ? [{ key: 'folder', icon: <FolderOpenOutlined />, label: _tr('ui.skills.addFolder', null, 'Select folder'), onClick: () => skillFolderInputRef.current?.click() }] : []),
      // 两个菜单项共用同一个隐藏 input，点击前按类型设好 accept，避免「上传 SKILL.md」也能选 zip（反之亦然）。
      { key: 'zip', icon: <FileZipOutlined />, label: _tr('ui.skills.addZip', null, 'Upload .zip'), onClick: () => { if (skillFileInputRef.current) { skillFileInputRef.current.accept = '.zip'; skillFileInputRef.current.click(); } } },
      { key: 'md', icon: <FileMarkdownOutlined />, label: _tr('ui.skills.addMd', null, 'Upload SKILL.md'), onClick: () => { if (skillFileInputRef.current) { skillFileInputRef.current.accept = '.md'; skillFileInputRef.current.click(); } } },
    ],
  };

  // 用 ref 持有最新值，供失焦/变更时的自动保存读取（避免闭包拿到过期 state）。
  const valuesRef = useRef(initialValues);
  const enabledRef = useRef(false);
  const lastSavedSigRef = useRef(null); // 上次已持久化的字段签名，做脏检查避免无谓请求
  const mountedRef = useRef(true);      // 防止启动轮询期间组件卸载后 setState
  const busyRef = useRef(false);        // 启动/停止进行中：暂停 5s 后台轮询，避免与启动轮询竞态
  const configMutationRef = useRef(Promise.resolve()); // 串行化 blur 自动保存与启动/停止，避免旧请求后写覆盖

  const writeValues = (next) => { valuesRef.current = next; setValues(next); };
  const setField = (key, val) => writeValues({ ...valuesRef.current, [key]: val });

  // 字段签名（不含 applyProcess，仅业务字段 + enabled）：empty secret 视为「保留」故不计入。
  const fieldSig = useCallback((vals, en) => {
    const o = { enabled: en };
    for (const f of descriptor.fields) {
      if (f.type === 'password') { if (vals[f.key]) o[f.key] = vals[f.key]; }
      else o[f.key] = vals[f.key];
    }
    return JSON.stringify(o);
  }, [descriptor]);

  // 组装 POST body。applyProcess:false=仅存盘(自动保存)；true=保存并驱动进程(启动/停止)。
  const buildBody = (vals, en, applyProcess) => {
    const body = { enabled: en, applyProcess };
    for (const f of descriptor.fields) {
      if (f.type === 'password') { if (vals[f.key]) body[f.key] = vals[f.key]; } // 空 → 服务端保留旧 secret
      else body[f.key] = vals[f.key];
    }
    return body;
  };

  // 统一的 config POST：返回 { ok, detail }，集中错误解析（body 可能非 JSON）。
  const postConfig = useCallback(async (body) => {
    const operation = configMutationRef.current.catch(() => {}).then(async () => {
      try {
        const r = await fetch(apiUrl(descriptor.endpoints.config), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!r.ok) {
          let detail = '';
          let code = '';
          try { const e = await r.json(); detail = e.detail || e.error || ''; code = e.code || ''; } catch { detail = `HTTP ${r.status}`; }
          return { ok: false, detail, code };
        }
        return { ok: true };
      } catch {
        return { ok: false, detail: '' };
      }
    });
    configMutationRef.current = operation;
    return operation;
  }, [descriptor]);

  // 拉取一次 status；返回解析后的对象（失败返回 null）。full=true 时同步表单字段。
  const fetchStatus = useCallback(async (full) => {
    let d = null;
    let ok = false;
    try {
      const r = await fetch(apiUrl(descriptor.endpoints.status));
      if (r.ok) { d = await r.json(); ok = true; }
    } catch { /* 网络/解析失败 → 下面复位为断连态 */ }
    if (!mountedRef.current) return d;
    if (!ok) {
      // 失败：复位为断连态，绝不保留旧的「已连接」（状态以真实为准）。
      setConnection({ running: false, connected: false });
      setProc(null);
      return null;
    }
    setConnection(d.connection || null);
    setProc(d.process || null);
    setEnabled(!!d.enabled);
    enabledRef.current = !!d.enabled;
    if (full) {
      setHasSecret(!!d.hasSecret);
      const v = {};
      for (const f of descriptor.fields) {
        const incoming = d[f.key];
        if (f.type === 'tags') v[f.key] = Array.isArray(incoming) ? incoming : [];
        else if (f.type === 'switch') v[f.key] = !!incoming;
        else v[f.key] = incoming ?? defaultValue(f);
      }
      writeValues(v);
      lastSavedSigRef.current = fieldSig(v, !!d.enabled);
    }
    return d;
  }, [descriptor, fieldSig]);

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus(true);
    const id = setInterval(() => { if (!busyRef.current) fetchStatus(false); }, 5000);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [fetchStatus]);

  // 自动保存（失焦/变更触发）：仅当业务字段较上次持久化有变化才发；applyProcess:false 不驱动进程。
  const commit = useCallback(async () => {
    const sig = fieldSig(valuesRef.current, enabledRef.current);
    if (sig === lastSavedSigRef.current) return;
    const { ok, detail } = await postConfig(buildBody(valuesRef.current, enabledRef.current, false));
    if (!ok) { message.error(_tr('ui.im.saveFailed', null, 'Save failed') + (detail ? `: ${detail}` : '')); return; }
    lastSavedSigRef.current = sig;
    setHasSecret((prev) => prev || descriptor.fields.some((f) => f.type === 'password' && valuesRef.current[f.key]));
  }, [descriptor, fieldSig, postConfig]);

  // 变更即保存（select / tags / switch 这类无可靠 blur 的控件）：先写值再提交。
  const setFieldAndCommit = (key, val) => { setField(key, val); commit(); };

  const procState = proc?.state;
  // 单按钮的两态：运行中(enabled)显示「停止」，否则显示「启动」；启动/停止过渡期间显示对应态的 loading。
  // starting 期间 enabled 已被乐观置 true，故 starting 优先级高于 enabled，避免过渡时按钮提前翻成「停止」。
  const showStop = stopping || (!starting && (proc?.running === true || connection?.running === true));

  const start = async () => {
    setStarting(true);
    busyRef.current = true;
    try {
      // 保存并驱动进程（applyProcess:true）：服务端 restartProcess → spawn 新 worker。
      const { ok, detail, code } = await postConfig(buildBody(valuesRef.current, true, true));
      if (!ok) {
        if (code === 'DINGTALK_WORKER_READY_TIMEOUT') message.error(_tr('ui.im.startTimeout', null, 'Start timed out: the worker or DingTalk connection did not become ready'), 6);
        else message.error(_tr('ui.im.startFailed', null, 'Start failed') + (detail ? `: ${detail}` : ''));
        return;
      }
      setEnabled(true); enabledRef.current = true;
      lastSavedSigRef.current = fieldSig(valuesRef.current, true);
      // worker 可访问且平台长连接已建立才算启动成功；明确连接错误立即结束轮询。
      const deadline = Date.now() + START_POLL_TIMEOUT_MS;
      let ready = false;
      let connectionError = '';
      while (Date.now() < deadline) {
        await new Promise((res) => setTimeout(res, START_POLL_INTERVAL_MS));
        if (!mountedRef.current) return;
        const d = await fetchStatus(false);
        if (d?.connection?.lastError) { connectionError = d.connection.lastError; break; }
        if (d?.process?.lastError) { connectionError = d.process.lastError; break; }
        if (d?.process?.state === 'ready' && d?.connection?.connected) { ready = true; break; }
      }
      if (!mountedRef.current) return;
      if (ready) message.success(_tr('ui.im.statusConnected', null, 'Connected'));
      else if (connectionError) message.error(`${_tr('ui.im.connectionFailed', null, 'Connection failed')}: ${connectionError}`, 6);
      else message.error(_tr('ui.im.startTimeout', null, 'Start timed out: the worker or DingTalk connection did not become ready'), 6);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) { setStarting(false); fetchStatus(false); }
    }
  };

  const stop = async () => {
    setStopping(true);
    busyRef.current = true;
    try {
      const { ok, detail } = await postConfig(buildBody(valuesRef.current, false, true));
      if (!ok) { message.error(_tr('ui.im.saveFailed', null, 'Save failed') + (detail ? `: ${detail}` : '')); return; }
      setEnabled(false); enabledRef.current = false;
      lastSavedSigRef.current = fieldSig(valuesRef.current, false);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) { setStopping(false); fetchStatus(false); }
    }
  };

  const testConn = async () => {
    setTesting(true);
    try {
      const r = await fetch(apiUrl(descriptor.endpoints.test), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildBody(valuesRef.current, enabledRef.current, false)),
      });
      const d = await r.json();
      if (d.ok) message.success(_tr('ui.im.testOk', null, 'Connection OK'));
      else message.error(_tr('ui.im.testFail', null, 'Connection failed') + (d.detail ? `: ${d.detail}` : ''));
    } catch {
      message.error(_tr('ui.im.testFail', null, 'Connection failed'));
    } finally {
      setTesting(false);
    }
  };

  // 状态徽标：以真实进程状态为准（含服务端口）。远端无 process → 回落 connection。
  const renderBadge = () => {
    if (connection?.lastError) return <Tag color="error">{_tr('ui.im.statusError', null, 'Error')}: {connection.lastError}</Tag>;
    const portSuffix = proc?.port ? ` :${proc.port}` : '';
    if (procState) {
      if (procState === 'ready') {
        return connection?.connected
          ? <Tag color="success">{_tr('ui.im.statusConnected', null, 'Connected')}{portSuffix}</Tag>
          : <Tag color="processing">{_tr('ui.im.statusRunning', null, 'Running, connecting…')}{portSuffix}</Tag>;
      }
      if (procState === 'booting') return <Tag color="processing">{_tr('ui.im.statusBooting', null, 'Starting…')}</Tag>;
      if (procState === 'hung') return <Tag color="warning">{_tr('ui.im.statusHung', null, 'Not responding')}</Tag>;
      return <Tag>{_tr('ui.im.statusDisconnected', null, 'Disconnected')}</Tag>; // dead
    }
    // 远端回落（无 process 字段）
    if (!connection) return null;
    if (connection.connected) return <Tag color="success">{_tr('ui.im.statusConnected', null, 'Connected')}</Tag>;
    if (connection.running) return <Tag color="processing">{_tr('ui.im.statusRunning', null, 'Running, connecting…')}</Tag>;
    return <Tag>{_tr('ui.im.statusDisconnected', null, 'Disconnected')}</Tag>;
  };

  const renderField = (f) => {
    if (f.type === 'switch') {
      // 标签精简 + 解释收进 (?) hover 提示（不再整段铺在面板里，由用户按需查看）。
      return (
        <div className={styles.row} key={f.key}>
          <span className={styles.label}>
            {_tr(f.labelKey, null, f.fallback)}
            {f.helpKey && (
              <Tooltip title={_tr(f.helpKey, null, f.helpFallback)}>
                <QuestionCircleOutlined className={styles.helpIcon} />
              </Tooltip>
            )}
          </span>
          <span className={styles.control}><Switch checked={!!values[f.key]} onChange={(v) => setFieldAndCommit(f.key, v)} /></span>
        </div>
      );
    }
    return (
      <div className={styles.field} key={f.key}>
        <label className={styles.fieldLabel}>
          {_tr(f.labelKey, null, f.fallback)}
          {f.required && <span className={styles.required}>*</span>}
          {/* 有 helpKey 时用 (?) 提示替代「选填」徽标：hover 解释字段作用而非只标可选。 */}
          {f.helpKey ? (
            <Tooltip title={_tr(f.helpKey, null, f.helpFallback)}>
              <QuestionCircleOutlined className={styles.helpIcon} />
            </Tooltip>
          ) : f.optional ? (
            <span className={styles.optional}>{_tr('ui.im.optional', null, 'Optional')}</span>
          ) : null}
        </label>
        {f.type === 'text' && (
          <Input value={values[f.key]} onChange={(e) => setField(f.key, e.target.value)} onBlur={commit} placeholder={_tr(f.labelKey, null, f.fallback)} autoComplete="off" />
        )}
        {f.type === 'password' && (
          <Input.Password
            value={values[f.key]}
            onChange={(e) => setField(f.key, e.target.value)}
            onBlur={commit}
            placeholder={hasSecret ? `••••••  ${_tr('ui.im.secretSaved', null, 'Saved (leave blank to keep)')}` : _tr(f.labelKey, null, f.fallback)}
            autoComplete="new-password"
          />
        )}
        {f.type === 'select' && (
          <Select
            value={values[f.key]}
            onChange={(v) => setFieldAndCommit(f.key, v)}
            style={{ width: '100%' }}
            options={f.options.map((o) => ({ value: o.value, label: _tr(o.labelKey, null, o.fallback) }))}
          />
        )}
        {f.type === 'tags' && (
          <Select
            mode="tags"
            value={values[f.key]}
            onChange={(v) => setFieldAndCommit(f.key, v)}
            tokenSeparators={[',', ' ']}
            placeholder={_tr(f.placeholderKey, null, f.placeholderFallback)}
            style={{ width: '100%' }}
            open={false}
          />
        )}
      </div>
    );
  };

  const mainFields = descriptor.fields.filter((f) => f.section !== 'more');
  const moreFields = descriptor.fields.filter((f) => f.section === 'more');

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>{_tr(descriptor.enable.key, null, descriptor.enable.fallback)}</span>
        <span className={styles.control}>{renderBadge()}</span>
      </div>

      {mainFields.map(renderField)}

      {(moreFields.length > 0 || descriptor.notes?.length > 0) && (
        <button type="button" className={styles.detailsToggle} onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? <DownOutlined /> : <RightOutlined />}
          <span>{_tr('ui.im.moreSettings', null, 'More settings')}</span>
        </button>
      )}
      {showDetails && (
        <div className={styles.details}>
          {moreFields.map(renderField)}
          {/* 模型性格定义：编辑该 IM worker 专属工作目录下的 AGENTS.md。 */}
          <div className={styles.row}>
            <span className={styles.label}>
              {_tr('ui.im.persona', null, 'Model personality')}
              <Tooltip title={_tr('ui.im.personaAgentsHelp', null, "Define the bot's behavior in the DingTalk worker's AGENTS.md. Codex loads it from that dedicated workspace after the worker restarts.")}>
                <QuestionCircleOutlined className={styles.helpIcon} />
              </Tooltip>
            </span>
            <span className={styles.control}>
              <Button size="small" onClick={() => setPersonaOpen(true)}>{_tr('ui.im.edit', null, 'Edit')}</Button>
            </span>
          </div>
          {/* ${IM} SKILL 管理：管理该 IM 工作目录下的 .codex/skills（[+添加] 上传 / [管理] 启停）。 */}
          <div className={styles.row}>
            <span className={styles.label}>{label} {_tr('ui.im.skillsRow', null, 'SKILL management')}</span>
            <span className={styles.control} style={{ display: 'inline-flex', gap: 8 }}>
              <Dropdown trigger={['click']} menu={skillAddMenu}>
                <Button size="small" icon={<PlusOutlined />}>{_tr('ui.skills.add', null, 'Add')}</Button>
              </Dropdown>
              <Button size="small" icon={<SettingOutlined />} onClick={() => setSkillsModalOpen(true)}>{_tr('ui.skillManage', null, 'Manage')}</Button>
            </span>
          </div>
          {(descriptor.notes || []).map((n, i) => (
            <div key={i} className={n.kind === 'warn' ? styles.warn : styles.hint}>{_tr(n.key, null, n.fallback)}</div>
          ))}
        </div>
      )}

      <ImAppendSystemModal open={personaOpen} platform={descriptor.id} onClose={() => setPersonaOpen(false)} />
      <ImSkillsModal open={skillsModalOpen} platform={descriptor.id} reloadKey={skillsReloadKey} onClose={() => setSkillsModalOpen(false)} />
      {/* 隐藏文件输入：放在任何 Space/flex 行之外，避免成为 flex item 撑出额外间距。 */}
      <input type="file" ref={skillFileInputRef} style={{ display: 'none' }} accept=".zip,.md" onChange={handleSkillFileSelected} />
      {SUPPORTS_DIRECTORY_UPLOAD && (
        <input type="file" ref={skillFolderInputRef} style={{ display: 'none' }} webkitdirectory="" directory="" onChange={handleSkillFolderSelected} />
      )}

      <div className={styles.actions}>
        <Button className={styles.testBtn} onClick={testConn} loading={testing}>{_tr('ui.im.test', null, 'Test connection')}</Button>
        <Button
          type={showStop ? 'default' : 'primary'}
          danger={showStop}
          loading={starting || stopping}
          onClick={showStop ? stop : start}
        >
          {showStop ? _tr('ui.im.stop', null, 'Stop') : _tr('ui.im.start', null, 'Start')}
        </Button>
      </div>
    </div>
  );
}
