export function sdkWorkspacePageUrl(href, instanceKey, { preserveLogfile = false } = {}) {
  const target = new URL(href);
  target.searchParams.delete('resume');
  if (!preserveLogfile) target.searchParams.delete('logfile');
  if (instanceKey) {
    target.searchParams.set('instance', instanceKey);
    target.searchParams.delete('workspaces');
  } else {
    target.searchParams.delete('instance');
    target.searchParams.set('workspaces', '1');
  }
  return target.href;
}

export function sdkWorkspaceAfterClose(currentInstanceKey, closedInstanceKey, survivorInstanceKey) {
  return currentInstanceKey === closedInstanceKey ? (survivorInstanceKey || null) : undefined;
}

export function sdkWorkspaceScope(href) {
  const params = new URL(href).searchParams;
  return JSON.stringify([params.get('instance'), params.get('workspaces'), params.get('logfile')]);
}

export function navigateSdkWorkspace(instanceKey) {
  const target = sdkWorkspacePageUrl(window.location.href, instanceKey);
  if (target === window.location.href) return;
  window.history.pushState(null, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
