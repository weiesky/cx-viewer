import { flushSync } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { sdkWorkspaceScope } from '../../utils/sdkWorkspaceNavigation';

// The SDK scopes HTTP/SSE/WS and config reads to the URL at initialization.
// Reuse their existing mount/unmount boundary when the viewed instance changes;
// server-owned sessions and scratch processes remain alive independently.
export default function WorkspaceRoot({ children }) {
  const [scope, setScope] = useState(() => sdkWorkspaceScope(window.location.href));
  const approvalDismissals = useRef(new Map()).current;
  useEffect(() => {
    const changed = () => flushSync(() => setScope(sdkWorkspaceScope(window.location.href)));
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
  const [instance, , logfile] = JSON.parse(scope);
  const liveSdkView = !!instance && !logfile;
  const rememberDismissals = ids => {
    if (!liveSdkView) return;
    const copy = new Set([...ids].filter(id => typeof id === 'string' && /^(ask|ptyPlan):/.test(id)).slice(0, 256));
    approvalDismissals.delete(scope);
    if (copy.size) approvalDismissals.set(scope, copy);
    if (approvalDismissals.size > 64) approvalDismissals.delete(approvalDismissals.keys().next().value);
  };
  // Preserve only UI IDs across the existing keyed teardown. Pending approval
  // data and action closures must always come from the new instance's replay.
  const view = React.isValidElement(children) ? React.cloneElement(children, {
    initialApprovalDismissedIds: liveSdkView ? approvalDismissals.get(scope) : undefined,
    onApprovalDismissedIdsChange: rememberDismissals,
    onForgetApprovalDismissals: () => approvalDismissals.delete(scope),
  }) : children;
  return <SettingsProvider key={scope}>{view}</SettingsProvider>;
}
