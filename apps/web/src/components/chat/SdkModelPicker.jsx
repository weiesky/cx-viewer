import React from 'react';
import { Alert, Button, Popover, Select, Slider, Spin, Tag } from 'antd';
import { t } from '../../i18n';
import { requestSdkModels } from '../../utils/sdkModelChip';
import styles from './ProxyChip.module.css';

const effortLabel = value => {
  const key = `ui.sdkModels.effort.${value}`, label = t(key);
  return label === key ? value : label;
};

export default class SdkModelPicker extends React.Component {
  state = { open: false, loading: false, saving: false, data: null, error: null, draftEffort: null };
  _mounted = false;
  _request = null;
  componentDidMount() { this._mounted = true; }
  componentWillUnmount() { this._mounted = false; this._request?.abort(); }
  componentDidUpdate(previous) {
    if (this.state.data && (previous.sdkModel !== this.props.sdkModel || previous.reasoningEffort !== this.props.reasoningEffort)) {
      this.setState(({ data }) => ({ data: { ...data, model: this.props.sdkModel,
        reasoningEffort: this.props.reasoningEffort } }));
    }
    if (this.state.open && ((previous.busy && !this.props.busy)
      || previous.sdkModel !== this.props.sdkModel || previous.reasoningEffort !== this.props.reasoningEffort)) {
      if (!this.state.saving) this.load();
    }
  }
  load = async (selection) => {
    this._request?.abort();
    const controller = new AbortController(), view = window.location.search;
    this._request = controller;
    this.setState({ loading: !selection, saving: !!selection, error: null });
    try {
      const data = await requestSdkModels({ instanceKey: this.state.data?.instanceKey,
        selection, signal: controller.signal });
      if (this._mounted && !controller.signal.aborted && view === window.location.search) {
        this.setState({ data, draftEffort: null });
      }
    } catch (error) {
      if (this._mounted && !controller.signal.aborted && view === window.location.search) {
        this.setState({ error: error.message, draftEffort: null });
      }
    } finally {
      if (this._mounted && this._request === controller && view === window.location.search) {
        this.setState({ loading: false, saving: false });
      }
    }
  };
  setOpen = open => {
    this.setState({ open });
    if (open) this.load();
    else this._request?.abort();
  };
  select = (model, reasoningEffort) => {
    if (this.props.busy || this.state.loading || this.state.saving || !this.state.data) return;
    this.load({ model, ...(reasoningEffort != null ? { reasoningEffort } : {}), revision: this.state.data.revision });
  };
  render() {
    const { data, open, loading, saving, error, draftEffort } = this.state;
    const disabled = !!this.props.busy || loading || saving || !!data?.busy;
    const current = data?.models.find(m => m.model === data.model);
    const efforts = current?.supportedReasoningEfforts || [];
    const effort = draftEffort ?? data?.reasoningEffort;
    const index = efforts.findIndex(e => e.reasoningEffort === effort);
    const displayedModel = data?.model || this.props.sdkModel;
    const displayedEffort = data?.reasoningEffort || this.props.reasoningEffort;
    const content = <div className={styles.modelPicker} role="dialog" aria-label={t('ui.sdkModels.select')}
      aria-busy={loading || saving} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); this.setOpen(false); } }}>
      {loading && !data ? <Spin size="small" /> : <>
        <Select aria-label={t('ui.sdkModels.select')} className={styles.modelSelect}
          showSearch optionFilterProp="label" value={data?.model} disabled={disabled}
          loading={loading || saving} onChange={model => this.select(model)}
          options={(data?.models || []).map(m => ({ value: m.model, label: m.displayName,
            title: m.description }))} />
        {efforts.length > 0 && <div className={styles.effortControl}>
          <div>{t('ui.sdkModels.effort')}: {effortLabel(effort)}</div>
          <Slider min={0} max={Math.max(1, efforts.length - 1)} step={1} value={Math.max(0, index)}
            disabled={disabled || efforts.length === 1} ariaLabelForHandle={t('ui.sdkModels.effort')}
            tooltip={{ formatter: i => effortLabel(efforts[i]?.reasoningEffort) }}
            marks={Object.fromEntries(efforts.map((e, i) => [i, { label: <span title={e.description}>•</span> }]))}
            onChange={i => this.setState({ draftEffort: efforts[i]?.reasoningEffort })}
            onChangeComplete={i => this.select(data.model, efforts[i]?.reasoningEffort)} />
        </div>}
      </>}
      {(this.props.busy || data?.busy) && <div className={styles.modelHint}>{t('ui.sdkModels.busy')}</div>}
      {error && <Alert type="error" role="alert" message={error}
        action={<Button size="small" onClick={() => this.load()}>{t('ui.sdkModels.retry')}</Button>} />}
    </div>;
    return <Popover trigger="click" placement="topRight" open={open} onOpenChange={this.setOpen}
      content={content} destroyOnHidden>
      <Tag className={`${styles.sdkChip} ${styles.sdkChipInteractive}`} role="button" tabIndex={0}
        aria-label={t('ui.sdkModels.select')} aria-expanded={open} aria-haspopup="dialog"
        title={t('ui.sdkModels.select')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.setOpen(!open); }
          if (e.key === 'Escape') this.setOpen(false);
        }}>
        {displayedModel || t('ui.sdkModels.select')}{displayedEffort ? ` · ${effortLabel(displayedEffort)}` : ''}
      </Tag>
    </Popover>;
  }
}
