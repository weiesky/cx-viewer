import { flushSync } from 'react-dom';
import React, { useEffect, useState } from 'react';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { sdkWorkspaceScope } from '../../utils/sdkWorkspaceNavigation';

// The SDK scopes HTTP/SSE/WS and config reads to the URL at initialization.
// Reuse their existing mount/unmount boundary when the viewed instance changes;
// server-owned sessions and scratch processes remain alive independently.
export default function WorkspaceRoot({ children }) {
  const [scope, setScope] = useState(() => sdkWorkspaceScope(window.location.href));
  useEffect(() => {
    const changed = () => flushSync(() => setScope(sdkWorkspaceScope(window.location.href)));
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
  return <SettingsProvider key={scope}>{children}</SettingsProvider>;
}
