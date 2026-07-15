import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, unlinkSync, realpathSync, renameSync, openSync, readSync, closeSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { reconstructEntries } from '../server/lib/delta-reconstructor.js';
import { expandRepeatEntries } from './repeat-entry.js';
import { setLatestMapValue } from './log-entry-order.js';
import { deleteV2SessionFile, isV2SessionFile } from './log-v2/materializer.js';

function isContainedPath(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith(sep));
}

/**
 * Validate that a resolved file path is contained within logDir.
 * Throws on invalid path (not found or path traversal).
 * @param {string} logDir - base log directory
 * @param {string} file - relative file path (e.g. "project/file.jsonl")
 * @returns {string} the real (resolved) path
 */
export function validateLogPath(logDir, file) {
  const filePath = join(logDir, file);
  if (!existsSync(filePath)) {
    const err = new Error('File not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const realPath = realpathSync(filePath);
  const realLogDir = realpathSync(logDir);
  if (!isContainedPath(realLogDir, realPath)) {
    const err = new Error('Access denied');
    err.code = 'ACCESS_DENIED';
    throw err;
  }
  return realPath;
}

const LOG_ENTRY_DELIMITER = Buffer.from('\n---\n');
const RAW_REF_SCAN_CHUNK_BYTES = 1024 * 1024;
const RAW_REF_MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const RAW_REF_TAIL_BYTES = 64 * 1024;
const RAW_FRAME_RESPONSE_BYTES = 8 * 1024 * 1024;

function rawRefsFromLogFile(filePath, stopWhen = null) {
  const refs = [];
  let stopped = false;
  const acceptRef = (ref) => {
    if (ref?.version !== 1 || typeof ref.streamId !== 'string'
        || typeof ref.sidecar !== 'string' || !/^[A-Za-z0-9._-]{1,220}\.jsonl$/.test(ref.sidecar)
        || !Number.isSafeInteger(ref.fromSeq) || !Number.isSafeInteger(ref.toSeq)) return;
    refs.push(ref);
    if (stopWhen?.(ref)) stopped = true;
  };
  const consume = (raw) => {
    if (stopped || !raw.includes('"_codexRaw"')) return;
    try {
      acceptRef(JSON.parse(raw.toString('utf8'))._codexRaw);
    } catch {}
  };
  const consumeTail = (raw) => {
    if (stopped) return;
    const text = raw.subarray(Math.max(0, raw.length - RAW_REF_TAIL_BYTES)).toString('utf8');
    const markerAt = text.lastIndexOf('"_codexRaw"');
    if (markerAt < 0) return;
    const objectStart = text.indexOf('{', markerAt + 11);
    if (objectStart < 0) return;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let i = objectStart; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') quoted = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        try { acceptRef(JSON.parse(text.slice(objectStart, i + 1))); } catch {}
        return;
      }
    }
  };

  let fd;
  try {
    fd = openSync(filePath, 'r');
    const chunk = Buffer.allocUnsafe(RAW_REF_SCAN_CHUNK_BYTES);
    let carry = Buffer.alloc(0);
    let skippingOversizedEntry = false;
    while (!stopped) {
      const bytesRead = readSync(fd, chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      const data = carry.length
        ? Buffer.concat([carry, chunk.subarray(0, bytesRead)])
        : Buffer.from(chunk.subarray(0, bytesRead));
      let start = 0;
      let delimiterAt;
      while ((delimiterAt = data.indexOf(LOG_ENTRY_DELIMITER, start)) !== -1) {
        if (skippingOversizedEntry) consumeTail(data.subarray(start, delimiterAt));
        else consume(data.subarray(start, delimiterAt));
        if (stopped) break;
        skippingOversizedEntry = false;
        start = delimiterAt + LOG_ENTRY_DELIMITER.length;
      }
      if (stopped) break;
      const tail = data.subarray(start);
      if (!skippingOversizedEntry && tail.length <= RAW_REF_MAX_ENTRY_BYTES) {
        carry = Buffer.from(tail);
      } else {
        skippingOversizedEntry = true;
        const overlap = Math.min(tail.length, RAW_REF_TAIL_BYTES);
        carry = Buffer.from(tail.subarray(tail.length - overlap));
      }
    }
    if (!stopped && carry.length) {
      if (skippingOversizedEntry) consumeTail(carry);
      else consume(carry);
    }
  } catch {
    return refs;
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch {}
  }
  return refs;
}

function rawSegmentFiles(projectDir, sidecar) {
  const rawDir = join(projectDir, 'raw');
  if (!existsSync(rawDir)) return [];
  let realRawDir;
  try {
    const realProjectDir = realpathSync(projectDir);
    realRawDir = realpathSync(rawDir);
    if (!isContainedPath(realProjectDir, realRawDir)) return [];
  } catch { return []; }
  const stem = basename(sidecar, '.jsonl');
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`^${escaped}(?:\\.part-(\\d{4}))?\\.jsonl$`);
  return readdirSync(rawDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && matcher.test(entry.name))
    .map(entry => {
      const match = entry.name.match(matcher);
      const path = realpathSync(join(realRawDir, entry.name));
      if (!isContainedPath(realRawDir, path)) return null;
      const stats = statSync(path);
      return { path, name: entry.name, index: match?.[1] ? Number(match[1]) : 0, size: stats.size, mtimeMs: stats.mtimeMs };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

/** List only raw sidecars referenced by the selected business log. */
export function listRawSidecarsForLog(logDir, file) {
  const filePath = validateLogPath(logDir, file);
  const projectDir = dirname(filePath);
  const refs = rawRefsFromLogFile(filePath);
  const seen = new Set();
  const sidecars = [];
  const segmentsBySidecar = new Map();
  for (const ref of refs) {
    let segments = segmentsBySidecar.get(ref.sidecar);
    if (!segments) {
      segments = rawSegmentFiles(projectDir, ref.sidecar);
      segmentsBySidecar.set(ref.sidecar, segments);
    }
    for (const segment of segments) {
      const key = `${ref.streamId}|${segment.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sidecars.push({
        file: relative(realpathSync(logDir), segment.path).split(sep).join('/'),
        sidecar: ref.sidecar,
        streamId: ref.streamId,
        threadId: ref.threadId ?? null,
        size: segment.size,
        segment: segment.index,
      });
    }
  }
  return sidecars;
}

/** Read bounded frames for a reference that is actually present in a business log. */
export function readRawSidecarFrames(logDir, file, requestedRef, { limit = 1000 } = {}) {
  return readRawSidecarFramePage(logDir, file, requestedRef, { limit }).frames;
}

/** Read the newest bounded frame page and report whether older matching frames were omitted. */
export function readRawSidecarFramePage(logDir, file, requestedRef, { limit = 1000 } = {}) {
  const filePath = validateLogPath(logDir, file);
  const matchesRequestedRef = candidate => candidate.streamId === requestedRef?.streamId
    && candidate.sidecar === requestedRef?.sidecar
    && candidate.fromSeq <= requestedRef.toSeq
    && candidate.toSeq >= requestedRef.fromSeq;
  const refs = rawRefsFromLogFile(filePath, matchesRequestedRef);
  const ref = refs.find(matchesRequestedRef);
  if (!ref) {
    const error = new Error('Raw sidecar reference is not associated with this log');
    error.code = 'ACCESS_DENIED';
    throw error;
  }
  const fromSeq = Math.max(ref.fromSeq, Number.isSafeInteger(requestedRef.fromSeq) ? requestedRef.fromSeq : ref.fromSeq);
  const toSeq = Math.min(ref.toSeq, Number.isSafeInteger(requestedRef.toSeq) ? requestedRef.toSeq : ref.toSeq);
  const boundedLimit = Math.max(1, Math.min(5000, Number(limit) || 1000));
  let kept = [];
  let keptHead = 0;
  let keptBytes = 0;
  let matched = 0;
  for (const segment of rawSegmentFiles(dirname(filePath), ref.sidecar)) {
    const lines = readFileSync(segment.path, 'utf8').split('\n');
    for (const line of lines) {
      if (!line) continue;
      try {
        const frame = JSON.parse(line);
        if (frame.stream_id !== ref.streamId || frame.seq < fromSeq || frame.seq > toSeq) continue;
        matched++;
        const bytes = Buffer.byteLength(line);
        kept.push({ frame, bytes });
        keptBytes += bytes;
        while (kept.length - keptHead > boundedLimit || keptBytes > RAW_FRAME_RESPONSE_BYTES) {
          keptBytes -= kept[keptHead++].bytes;
        }
        if (keptHead > 1024 && keptHead * 2 > kept.length) {
          kept = kept.slice(keptHead);
          keptHead = 0;
        }
      } catch {}
    }
  }
  const frames = kept.slice(keptHead).map(item => item.frame);
  return { frames, truncated: matched > frames.length, matched };
}

function addRawRange(map, streamId, fromSeq, toSeq) {
  if (typeof streamId !== 'string' || !streamId) return;
  const ranges = map.get(streamId) || [];
  ranges.push([fromSeq, toSeq]);
  map.set(streamId, ranges);
}

function rawRangeContains(map, streamId, seq) {
  return map.get(streamId)?.some(([fromSeq, toSeq]) => seq >= fromSeq && seq <= toSeq) || false;
}

function pruneUnreferencedRawRanges(projectDir, candidateRefs, ignoredBusinessPath = null) {
  if (!candidateRefs?.length) return { removedFrames: 0, removedStreams: new Set() };
  const candidateRanges = new Map();
  for (const ref of candidateRefs) addRawRange(candidateRanges, ref.streamId, ref.fromSeq, ref.toSeq);
  const stillReferenced = new Map();
  for (const name of readdirSync(projectDir)) {
    if (!name.endsWith('.jsonl')) continue;
    const businessPath = join(projectDir, name);
    if (ignoredBusinessPath && businessPath === ignoredBusinessPath) continue;
    for (const ref of rawRefsFromLogFile(businessPath)) {
      if (candidateRanges.has(ref.streamId)) addRawRange(stillReferenced, ref.streamId, ref.fromSeq, ref.toSeq);
    }
  }
  const rawDir = join(projectDir, 'raw');
  if (!existsSync(rawDir)) return { removedFrames: 0, removedStreams: new Set() };
  let realRawDir;
  try {
    const realProjectDir = realpathSync(projectDir);
    realRawDir = realpathSync(rawDir);
    if (!isContainedPath(realProjectDir, realRawDir)) return { removedFrames: 0, removedStreams: new Set() };
  } catch { return { removedFrames: 0, removedStreams: new Set() }; }
  let removedFrames = 0;
  const removedStreams = new Set();
  for (const entry of readdirSync(realRawDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const path = realpathSync(join(realRawDir, entry.name));
    if (!isContainedPath(realRawDir, path)) continue;
    const kept = [];
    let changed = false;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line) continue;
      try {
        const frame = JSON.parse(line);
        if (Number.isSafeInteger(frame.seq)
            && rawRangeContains(candidateRanges, frame.stream_id, frame.seq)
            && !rawRangeContains(stillReferenced, frame.stream_id, frame.seq)) {
          changed = true;
          removedFrames++;
          removedStreams.add(frame.stream_id);
          continue;
        }
      } catch {}
      kept.push(line);
    }
    if (!changed) continue;
    if (kept.length === 0) unlinkSync(path);
    else {
      const tmp = `${path}.prune-${process.pid}`;
      writeFileSync(tmp, `${kept.join('\n')}\n`);
      renameSync(tmp, path);
    }
  }
  return { removedFrames, removedStreams };
}

/** Explicitly clear raw frames associated with one log while preserving its business entries. */
export function clearRawSidecarsForLog(logDir, file, { additionalStreamIds = [] } = {}) {
  const filePath = validateLogPath(logDir, file);
  const refs = rawRefsFromLogFile(filePath);
  for (const streamId of additionalStreamIds) {
    if (typeof streamId === 'string' && streamId) refs.push({ streamId, fromSeq: -Infinity, toSeq: Infinity });
  }
  const result = pruneUnreferencedRawRanges(dirname(filePath), refs, filePath);
  return { clearedStreams: result.removedStreams.size, clearedFrames: result.removedFrames };
}

/**
 * List local log files grouped by project.
 * @param {string} logDir - base log directory
 * @param {string} currentProjectName - current project name (may be empty)
 * @returns {{ [project: string]: Array, _currentProject: string }}
 */
export function listLocalLogs(logDir, currentProjectName) {
  const grouped = {};
  if (existsSync(logDir)) {
    const entries = readdirSync(logDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const project = entry.name;
      const projectDir = join(logDir, project);
      const files = readdirSync(projectDir)
        .filter(f => f.endsWith('.jsonl'))
        .sort()
        .reverse();
      // 从项目统计缓存中读取 per-file 数据，避免逐文件扫描
      let statsFiles = null;
      try {
        const statsFile = join(projectDir, `${project}.json`);
        if (existsSync(statsFile)) {
          statsFiles = JSON.parse(readFileSync(statsFile, 'utf-8')).files;
        }
      } catch { }
      for (const f of files) {
        // Include active temp sessions so a first-run conversation is visible
        // before it gets finalized to a permanent .jsonl file.
        const match = f.match(/^(.+?)_(\d{8}_\d{6})(?:_temp)?\.jsonl$/);
        if (!match) continue;
        const ts = match[2];
        const filePath = join(projectDir, f);
        const size = statSync(filePath).size;
        if (size === 0) continue; // 跳过空文件
        const turns = statsFiles?.[f]?.summary?.sessionCount || 0;
        if (!grouped[project]) grouped[project] = [];
        grouped[project].push({ file: `${project}/${f}`, timestamp: ts, size, turns, preview: statsFiles?.[f]?.preview || [] });
      }
    }
  }
  return { ...grouped, _currentProject: currentProjectName || '' };
}

/**
 * Read and parse a local log file.
 * @param {string} logDir - base log directory
 * @param {string} file - relative file path (e.g. "project/file.jsonl")
 * @returns {Array<Object>} parsed entries
 */
export function readLocalLog(logDir, file) {
  validateLogPath(logDir, file);
  const filePath = join(logDir, file);
  const content = readFileSync(filePath, 'utf-8');
  const parsed = expandRepeatEntries(content.split('\n---\n').filter(line => line.trim()).map(entry => {
    try { return JSON.parse(entry); } catch { return null; }
  }).filter(Boolean));
  // Delta storage: 先去重（timestamp|url），再重建 delta 条目
  const map = new Map();
  for (const entry of parsed) {
    const key = `${entry.timestamp}|${entry.url}`;
    setLatestMapValue(map, key, entry);
  }
  return reconstructEntries(Array.from(map.values()));
}

/**
 * Delete log files. Returns per-file results.
 * @param {string} logDir - base log directory
 * @param {string[]} files - array of relative file paths
 * @returns {Array<{ file: string, ok?: boolean, error?: string }>}
 */
export function deleteLogFiles(logDir, files) {
  const results = [];
  for (const file of files) {
    const v2File = isV2SessionFile(file);
    if (!file || (!v2File && file.includes('..')) || !file.endsWith('.jsonl')) {
      results.push({ file, error: 'Invalid file name' });
      continue;
    }
    const filePath = join(logDir, file);
    try {
      if (v2File) {
        deleteV2SessionFile(logDir, file);
        results.push({ file, ok: true });
        continue;
      }
      if (!existsSync(filePath)) {
        results.push({ file, error: 'Not found' });
        continue;
      }
      const realPath = realpathSync(filePath);
      const realLogDir = realpathSync(logDir);
      if (!isContainedPath(realLogDir, realPath)) {
        results.push({ file, error: 'Access denied' });
        continue;
      }
      const rawRefs = rawRefsFromLogFile(realPath);
      const projectDir = dirname(realPath);
      unlinkSync(realPath);
      pruneUnreferencedRawRanges(projectDir, rawRefs);
      results.push({ file, ok: true });
    } catch (err) {
      results.push({ file, error: err.message });
    }
  }
  return results;
}
