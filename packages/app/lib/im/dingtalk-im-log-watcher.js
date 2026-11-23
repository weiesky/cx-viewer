// Frozen IM watcher semantics: lazy, debounced invalidation, disposed on shutdown.
// Native V2 stores sessions directly below an encoded project directory and can
// rotate timeline shards. Recursive fs.watch covers both without another reader.
import { existsSync, lstatSync, watch } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { projectArchiveDirectoryName } from "../log-v2/identity.js";
import { resolveProjectIdForCwd } from "../log-v2/project-id.js";

export function createDingTalkImLogWatcher({ getLogDir, getWorkerDir, onChange, debounceMs = 250, watchImpl = watch }) {
  let watcher = null;
  let watchedDir = null;
  let timer = null;
  let disposed = false;
  function close() {
    watcher?.close();
    watcher = null;
    watchedDir = null;
  }
  function ensure() {
    if (disposed) return;
    const root = getLogDir();
    const project = resolveProjectIdForCwd(root, getWorkerDir(), 'IM_dingtalk');
    const dir = join(root, projectArchiveDirectoryName(project));
    const base = existsSync(dir) ? dir : root;
    if (watcher && watchedDir === base) return;
    close();
    try {
      const current = watchImpl(base, { recursive: true }, (_event, filename) => {
        const file = filename ? join(base, String(filename)) : null;
        const rel = file ? relative(dir, file) : null;
        if (rel !== null) {
          if (rel === '..' || rel.startsWith(`..${sep}`)) return;
          let directory = false;
          try { directory = lstatSync(file).isDirectory(); } catch { /* Removed file. */ }
          // Directory creation may be the only event before recursive watching
          // is armed on a new archive. Invalidate and re-arm, as upstream does.
          if (!directory && !/(?:^|[/\\])(?:timeline\.jsonl|manifest\.json)$/.test(rel)) return;
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          if (!disposed) {
            try { ensure(); } catch { /* An invalidated archive is still reported. */ }
            try { onChange('dingtalk'); } catch { /* Never propagate from a watcher callback. */ }
          }
        }, debounceMs);
        timer.unref?.();
      });
      current.on('error', () => { if (watcher === current) close(); });
      watcher = current;
      watchedDir = base;
    } catch { /* A missing/removed directory is retried by the next logs request. */ }
  }
  function dispose() {
    disposed = true;
    if (timer) clearTimeout(timer);
    timer = null;
    close();
  }
  return { ensure, dispose };
}
