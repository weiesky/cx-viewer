import { t } from '../i18n';

export function profileDisplayModel(p) {
  if (!p) return '';
  return p.activeModel
    || p.OPENAI_MODEL
    || p.ANTHROPIC_MODEL
    || p.ANTHROPIC_DEFAULT_OPUS_MODEL
    || p.ANTHROPIC_DEFAULT_SONNET_MODEL
    || p.ANTHROPIC_DEFAULT_HAIKU_MODEL
    || '';
}

export function getProxyChipView({ proxyProfiles = [], activeProxyId, proxyRoles = {}, proxyOfficialDefault, proxyRoleRouting }) {
  const profiles = proxyProfiles || [];
  const p = profiles.find(profile => profile.id === activeProxyId);
  const value = proxyRoles?.subagent;
  const subName = proxyRoleRouting?.supported && value && value !== 'follow'
    ? value === 'max' ? 'Default' : profiles.find(profile => profile.id === value)?.name : null;
  const visible = !!activeProxyId && (activeProxyId === 'max'
    ? proxyOfficialDefault === false && !!subName : !!p);
  const mainLabel = p ? `${p.name}${profileDisplayModel(p) ? ` · ${profileDisplayModel(p)}` : ''}` : 'Default';
  const sub = proxyRoleRouting?.supported
    ? subName || t('ui.proxy.followMainResolved', { name: p?.name || 'Default' }) : t('ui.proxy.roleUnavailable');
  return { visible, mainLabel, title: t('ui.proxy.roleSummary', { main: mainLabel, sub }) };
}

export function proxyAssignmentState(data) {
  return { proxyRoles: data.roles || { subagent: 'follow' },
    proxyOfficialDefault: data.officialDefault !== false,
    proxyRoleRouting: data.roleRouting || { supported: false },
    proxyWorkspaceRevision: typeof data.workspaceRevision === 'string' ? data.workspaceRevision : null };
}
