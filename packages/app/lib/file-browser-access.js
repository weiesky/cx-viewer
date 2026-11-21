// Frozen target/content permission chain (7a75e1be + 208f1348), composed
// with native exact-instance isolation and descriptor validation.
import { statSync } from 'node:fs';
import { isReadAllowed, isWriteAllowed, reasonToStatus } from './file-access-policy.js';
import { insidePath, resolveTargetRoot, targetError } from './target-scope.js';

export function fileBrowserAccess(parsedUrl, cwd, {
  isAdmin, codexMdEntries, editorSession = false, write = false,
} = {}) {
  const target = parsedUrl.searchParams.has('kind');
  if ((target || editorSession) && !isAdmin) throw targetError(403, 'forbidden');
  const scope = target ? resolveTargetRoot(parsedUrl, cwd, { codexMdEntries }) : null;
  const root = scope?.rootReal || cwd;
  const external = target || editorSession;
  return { root, external,
    assertPath(path, descriptorStat) {
      const policy = (write ? isWriteAllowed : isReadAllowed)(path, { cwd });
      if (!policy.ok) throw targetError(reasonToStatus(policy.reason), 'Path not allowed');
      // A client-claimed editorSession must not escape a target's navigation root.
      if (scope && !insidePath(policy.real, scope.rootReal)) throw targetError(403, 'Path outside navigation root');
      if (descriptorStat) {
        const current = statSync(policy.real);
        if (current.dev !== descriptorStat.dev || current.ino !== descriptorStat.ino) throw targetError(403, 'File changed during access');
      }
      return policy.real;
    },
  };
}
