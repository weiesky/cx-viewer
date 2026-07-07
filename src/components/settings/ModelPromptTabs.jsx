import React, { useState } from 'react';
import { Input, Segmented, Button, Popover } from 'antd';
import { t } from '../../i18n';
import ConfirmRemoveButton from '../common/ConfirmRemoveButton';
import styles from './SystemTextModal.module.css';

// Model tab strip inside the "Edit System Prompt" modal (strictly aligned with
// UltraPlanModal's Chrome-tab strip): a Default tab + one tab per model entry
// (scope badge / unsaved dot / hover delete ×) + an "+ Add model" Popover
// (name + scope, Enter confirms). The "?" help sits next to the modal title
// (rendered by SystemTextModal).
// Pure presentational component: selection, entry list, and validation live in
// the parent (onAdd returns an error message or null).
export default function ModelPromptTabs({
  entries,          // [{ name, scope: 'global'|'workspace' }]
  activeKey,        // 'default' | `${scope}:${name}`
  dirtyKeys,        // 有未保存修改的 key 列表
  workspaceEnabled, // 是否有活动工作区(决定 Workspace 作用域可选与否)
  disabled,         // 加载中等全局禁用
  onSelect,         // (key) => void
  onAdd,            // (name, scope) => string|null 错误文案(null=成功,父组件已建tab)
  onDelete,         // (name, scope) => void
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addScope, setAddScope] = useState('global');
  const [addError, setAddError] = useState(null);

  const resetAdd = () => { setAddName(''); setAddError(null); };

  const handleAdd = () => {
    const err = onAdd(addName.trim(), addScope);
    if (err) { setAddError(err); return; }
    resetAdd();
    setAddOpen(false);
  };

  const tabKey = (e) => `${e.scope}:${e.name}`;

  const addContent = (
    <div className={styles.addPopover}>
      <Input
        size="small"
        autoFocus
        value={addName}
        onChange={(e) => { setAddName(e.target.value); setAddError(null); }}
        onPressEnter={handleAdd}
        placeholder={t('ui.expert.systemText.addModelName')}
      />
      <Segmented
        size="small"
        value={addScope}
        onChange={setAddScope}
        options={[
          { label: t('ui.expert.systemText.scopeGlobal'), value: 'global' },
          { label: t('ui.expert.systemText.scopeWorkspace'), value: 'workspace', disabled: !workspaceEnabled },
        ]}
      />
      {addError && <div className={styles.addError}>{addError}</div>}
      <Button size="small" type="primary" onClick={handleAdd} disabled={!addName.trim()}>
        {t('ui.expert.systemText.addModelConfirm')}
      </Button>
    </div>
  );

  return (
    <div className={styles.tabRow}>
      <button
        type="button"
        className={`${styles.tabBtn} ${activeKey === 'default' ? styles.tabActive : ''}`}
        onClick={() => onSelect('default')}
      >
        {t('ui.expert.systemText.tabDefault')}
        {dirtyKeys.includes('default') && <span className={styles.dirtyDot} />}
      </button>
      {entries.map((e) => {
        const key = tabKey(e);
        return (
          <span key={key} className={styles.tabWrap}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeKey === key ? styles.tabActive : ''}`}
              onClick={() => onSelect(key)}
              title={e.name}
            >
              <span className={styles.tabTitle}>{e.name}</span>
              <span className={styles.scopeBadge}>
                {t(e.scope === 'global' ? 'ui.expert.systemText.scopeGlobal' : 'ui.expert.systemText.scopeWorkspace')}
              </span>
              {dirtyKeys.includes(key) && <span className={styles.dirtyDot} />}
            </button>
            <ConfirmRemoveButton
              tag="span"
              className={styles.tabDelete}
              title={t('ui.expert.systemText.deleteTab', { name: e.name })}
              ariaLabel={t('ui.expert.systemText.deleteTab', { name: e.name })}
              onConfirm={() => onDelete(e.name, e.scope)}
              disabled={disabled}
            >
              ×
            </ConfirmRemoveButton>
          </span>
        );
      })}
      <Popover
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) resetAdd(); }}
        content={addContent}
        trigger="click"
        placement="bottom"
      >
        <button type="button" className={styles.addBtn} disabled={disabled}>
          + {t('ui.expert.systemText.addModel')}
        </button>
      </Popover>
    </div>
  );
}
