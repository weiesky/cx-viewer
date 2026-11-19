export const SDK_WORKSPACE_ORDER_KEY = 'cxv.sdkWorkspaceOrder.v1';
export const SDK_WORKSPACE_ORDER_DRAG = 'text/x-cxv-workspace-order';

export function readSdkWorkspaceOrder(storage) {
  try {
    const saved = JSON.parse((storage || globalThis.localStorage)?.getItem(SDK_WORKSPACE_ORDER_KEY) || 'null');
    return saved?.v === 1 && Array.isArray(saved.ids)
      ? [...new Set(saved.ids.filter(id => typeof id === 'string' && id))] : [];
  } catch { return []; }
}

export function saveSdkWorkspaceOrder(ids, storage) {
  try { (storage || globalThis.localStorage)?.setItem(SDK_WORKSPACE_ORDER_KEY, JSON.stringify({ v: 1, ids })); }
  catch { /* Panel order remains usable when browser storage is blocked. */ }
}

// Use live rows, never cached status/cwd. New arrivals retain their poll order.
export function orderedSdkWorkspaces(sessions, savedIds) {
  const live = new Map(sessions.map(session => [session.instanceKey, session]));
  const keys = new Set([...savedIds, ...live.keys()]);
  return [...keys].filter(key => live.has(key)).map(key => live.get(key));
}

export function moveSdkWorkspace(sessions, fromKey, toKey) {
  const ids = sessions.map(session => session.instanceKey);
  const from = ids.indexOf(fromKey), to = ids.indexOf(toKey);
  if (from < 0 || to < 0 || from === to) return null;
  ids.splice(from, 1);
  ids.splice(to, 0, fromKey);
  return ids;
}

// Fixed upstream resumeSessions.applySameNameIndex, adapted to SDK row fields.
export function sdkWorkspaceLabels(sessions) {
  const groups = new Map(), labels = new Map();
  for (const session of sessions) {
    const group = groups.get(session.projectName) || [];
    group.push(session); groups.set(session.projectName, group);
  }
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => {
      const ca = String(a.cwd || ''), cb = String(b.cwd || '');
      return ca !== cb ? (ca < cb ? -1 : 1) : a.instanceKey.localeCompare(b.instanceKey);
    });
    ordered.forEach((session, index) => labels.set(session.instanceKey,
      group.length === 1 ? session.projectName : `${session.projectName} [${index + 1}]`));
  }
  return labels;
}
