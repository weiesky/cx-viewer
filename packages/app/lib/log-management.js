import { readFileSync, existsSync, statSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { deleteV2SessionFile, isV2SessionFile, readV2LogEntries, resolveV2SessionFile } from './log-v2/materializer.js';
import { rawProjectDirectoryToken } from './log-v2/project-id.js';

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

const IM_PLATFORMS = new Set(['dingtalk', 'feishu', 'wecom', 'discord']);

export function validateImLogPath(logDir, platform, file) {
  const parts = typeof file === 'string' ? file.split('/') : [];
  if (!IM_PLATFORMS.has(platform) || parts.length !== 2 || parts[0] !== platform
      || !/^[A-Za-z0-9._-]+\.jsonl$/.test(parts[1])) {
    const error = new Error('Access denied');
    error.code = 'ACCESS_DENIED';
    throw error;
  }
  return validateLogPath(logDir, file);
}

const RAW_FRAME_RESPONSE_BYTES = 8 * 1024 * 1024;

function rawSegmentFiles(rawDir, sidecar) {
  if (!existsSync(rawDir)) return [];
  let realRawDir;
  try {
    const realProjectDir = realpathSync(dirname(rawDir));
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

function rawContextForV2(logDir, file) {
  if (!isV2SessionFile(file)) {
    const error = new Error('Raw diagnostics require a V2 session');
    error.code = 'ACCESS_DENIED';
    throw error;
  }
  const { sessionDir } = resolveV2SessionFile(logDir, file);
  const manifest = JSON.parse(readFileSync(join(sessionDir, 'manifest.json'), 'utf8'));
  const project = manifest.projectId ? rawProjectDirectoryToken(manifest.projectId) : '';
  if (!project) throw new Error('V2 session has no project identity');
  const refs = readV2LogEntries(logDir, file, { dedupe: false })
    .map(entry => entry?._codexRaw)
    .filter(ref => ref?.version === 1 && typeof ref.streamId === 'string'
      && typeof ref.sidecar === 'string' && /^[A-Za-z0-9._-]{1,220}\.jsonl$/.test(ref.sidecar)
      && Number.isSafeInteger(ref.fromSeq) && Number.isSafeInteger(ref.toSeq));
  return { refs, rawDir: join(logDir, 'v2-raw', project) };
}

/** List only raw sidecars referenced by the selected business log. */
export function listRawSidecarsForLog(logDir, file) {
  const { refs, rawDir } = rawContextForV2(logDir, file);
  const seen = new Set();
  const sidecars = [];
  const segmentsBySidecar = new Map();
  for (const ref of refs) {
    let segments = segmentsBySidecar.get(ref.sidecar);
    if (!segments) {
      segments = rawSegmentFiles(rawDir, ref.sidecar);
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
  const { refs, rawDir } = rawContextForV2(logDir, file);
  const matchesRequestedRef = candidate => candidate.streamId === requestedRef?.streamId
    && candidate.sidecar === requestedRef?.sidecar
    && candidate.fromSeq <= requestedRef.toSeq
    && candidate.toSeq >= requestedRef.fromSeq;
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
  for (const segment of rawSegmentFiles(rawDir, ref.sidecar)) {
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

/**
 * Delete log files. Returns per-file results.
 * @param {string} logDir - base log directory
 * @param {string[]} files - array of relative file paths
 * @returns {Array<{ file: string, ok?: boolean, error?: string }>}
 */
export function deleteLogFiles(logDir, files, { protectedFiles = [] } = {}) {
  const results = [];
  const protectedSet = new Set(protectedFiles.filter(Boolean));
  for (const file of files) {
    if (!isV2SessionFile(file)) {
      results.push({ file, error: 'Invalid file name' });
      continue;
    }
    if (protectedSet.has(file)) {
      results.push({ file, error: 'Active log cannot be deleted' });
      continue;
    }
    try {
      deleteV2SessionFile(logDir, file);
      results.push({ file, ok: true });
    } catch (err) {
      results.push({ file, error: err.message });
    }
  }
  return results;
}
