import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { pathToFileURL } from 'node:url';

export const LOGGER_INJECT_START = '// >>> CX Viewer Logger Bootstrap >>>';
export const LOGGER_INJECT_END = '// <<< CX Viewer Logger Bootstrap <<<';

export function buildLoggerInjectBlock(bootstrapPath) {
  const url = pathToFileURL(bootstrapPath).href;
  return `${LOGGER_INJECT_START}
try {
  await import(${JSON.stringify(url)});
} catch (error) {
  if (process.env.CXV_DEBUG) console.error("[CX Viewer Logger] bootstrap import failed:", error?.message || error);
}
${LOGGER_INJECT_END}`;
}

export function resolveJavascriptLauncher(candidate) {
  if (!candidate || !existsSync(candidate)) return null;
  let resolved;
  try {
    resolved = realpathSync(candidate);
  } catch {
    return null;
  }
  let head = '';
  try {
    head = readFileSync(resolved, 'utf8').slice(0, 256);
  } catch {
    return null;
  }
  return /^#!.*\bnode\b/.test(head) || /\.m?js$/i.test(resolved) ? resolved : null;
}

export function injectLoggerBootstrapAt(candidate, bootstrapPath) {
  const launcher = resolveJavascriptLauncher(candidate);
  if (!launcher) return { path: candidate, status: 'not_javascript' };
  const content = readFileSync(launcher, 'utf8');
  const block = buildLoggerInjectBlock(bootstrapPath);
  const pattern = new RegExp(
    `${escapeRegExp(LOGGER_INJECT_START)}[\\s\\S]*?${escapeRegExp(LOGGER_INJECT_END)}`,
  );
  if (pattern.test(content)) {
    if (content.match(pattern)?.[0] === block) return { path: launcher, status: 'exists' };
    atomicWriteFile(launcher, content.replace(pattern, block));
    return { path: launcher, status: 'updated' };
  }
  const newline = content.indexOf('\n');
  const offset = content.startsWith('#!') && newline >= 0 ? newline + 1 : 0;
  atomicWriteFile(launcher, content.slice(0, offset) + block + '\n' + content.slice(offset));
  return { path: launcher, status: 'injected' };
}

export function removeLoggerBootstrapAt(candidate) {
  const launcher = resolveJavascriptLauncher(candidate);
  if (!launcher) return { path: candidate, status: 'not_found' };
  const content = readFileSync(launcher, 'utf8');
  const pattern = new RegExp(
    `(?:\\r?\\n)?${escapeRegExp(LOGGER_INJECT_START)}[\\s\\S]*?${escapeRegExp(LOGGER_INJECT_END)}(?:\\r?\\n)?`,
  );
  if (!pattern.test(content)) return { path: launcher, status: 'clean' };
  atomicWriteFile(launcher, content.replace(pattern, '\n'));
  return { path: launcher, status: 'removed' };
}

function atomicWriteFile(path, content) {
  const mode = statSync(path).mode;
  const temp = `${path}.cxv-${process.pid}-${Date.now()}.tmp`;
  let fd;
  try {
    fd = openSync(temp, 'wx', mode);
    writeFileSync(fd, content);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temp, path);
  } catch (error) {
    if (fd !== undefined) {
      try { closeSync(fd); } catch {}
    }
    try { unlinkSync(temp); } catch {}
    throw error;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
