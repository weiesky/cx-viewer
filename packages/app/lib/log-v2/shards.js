// Canonical CAS adaptation of b23c137372 / 4391792212. Parts partition commit
// timelines; immutable CAS objects and thread offsets stay session-relative.
// The manifest is the single publication point. No existing log is rewritten.
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWriteJsonSync, fsyncDirectorySync, readJsonReferenceSync, scanJsonlSync, sha256 } from './storage.js';
import { restoreWireArchiveState } from './reducer.js';
import { SHARDED_SESSION_FORMAT_VERSION } from './schema.js';

export const SHARD_PROMPT_THRESHOLD = 2000;

function fail(message) {
  throw Object.assign(new Error(message), { code: 'CXV_LOG_V2_CORRUPT' });
}

function safePath(sessionDir, ...segments) {
  let path = sessionDir;
  for (const segment of ['', ...segments]) {
    if (segment) path = join(path, segment);
    try { if (lstatSync(path).isSymbolicLink()) fail('Unsafe V2 shard symbolic link'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return path;
}

export function readShardLayout(sessionDir, manifest = null) {
  manifest ||= JSON.parse(readFileSync(safePath(sessionDir, 'manifest.json'), 'utf8'));
  const layout = manifest.shards;
  if (layout === undefined) return { manifest, cuts: [], activePart: 0 };
  if (layout?.version !== 1 || !Array.isArray(layout.cuts) || layout.cuts.length === 0) fail('Invalid V2 shard layout');
  let previousSeq = 0, previousPrompts = 0;
  for (const cut of layout.cuts) {
    if (!Number.isSafeInteger(cut?.throughSeq) || cut.throughSeq <= previousSeq
        || !Number.isSafeInteger(cut.promptCount) || cut.promptCount < previousPrompts
        || cut.baselineRef?.offset !== 0 || !Number.isSafeInteger(cut.baselineRef.length) || cut.baselineRef.length <= 0
        || !/^sha256:[a-f0-9]{64}$/.test(cut.baselineRef.checksum || '')) fail('Invalid V2 shard cut');
    previousSeq = cut.throughSeq; previousPrompts = cut.promptCount;
  }
  return { manifest, cuts: layout.cuts, activePart: layout.cuts.length };
}

export function timelinePartDir(sessionDir, part) {
  if (!Number.isSafeInteger(part) || part < 0) fail('Invalid V2 shard index');
  return part === 0 ? sessionDir : safePath(sessionDir, 'parts', String(part));
}

export function activeTimelinePath(sessionDir, manifest = null) {
  return timelinePartPath(sessionDir, readShardLayout(sessionDir, manifest).activePart);
}

export function timelinePartPath(sessionDir, part) {
  const path = safePath(timelinePartDir(sessionDir, part), 'timeline.jsonl');
  if (part > 0 && (!existsSync(path) || !lstatSync(path).isFile())) fail('Published V2 shard timeline is missing or unsafe');
  return path;
}

export function partForSequence(cuts, seq) {
  let low = 0, high = cuts.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (seq <= cuts[middle].throughSeq) high = middle;
    else low = middle + 1;
  }
  return low;
}

export function readShardBaseline(sessionDir, part, layout = readShardLayout(sessionDir)) {
  if (part === 0) return null;
  if (part > layout.activePart) fail('V2 shard is not published');
  const cut = layout.cuts[part - 1];
  const value = readJsonReferenceSync(safePath(timelinePartDir(sessionDir, part), 'baseline.json'), cut.baselineRef, { rootDir: sessionDir });
  if (value?.kind !== 'cx-viewer.shard-baseline' || value.version !== 1 || value.part !== part
      || value.checkpoint?.archive?.projectId !== layout.manifest.projectId
      || value.checkpoint?.archive?.sessionId !== layout.manifest.sessionId
      || value.checkpoint.throughSeq !== cut.throughSeq || value.checkpoint.timelineBytes !== 0
      || value.checkpoint.winners?.length !== 0) fail('V2 shard baseline identity mismatch');
  restoreWireArchiveState(value.checkpoint); // Validate revision chains and every reference shape.
  for (const [token, sizes] of Object.entries(value.threadBounds || {})) {
    if (!/^t_[a-f0-9]{64}$/.test(token)
        || ['entries.jsonl', 'input.jsonl'].some(name => !Number.isSafeInteger(sizes[name]) || sizes[name] < 0)) fail('Invalid V2 shard thread watermark');
  }
  return value;
}

/** Whole-history consumers (export/inspection/summary repair), never cold UI. */
export function scanSessionTimelineSync(sessionDir, onRecord = () => {}) {
  const layout = readShardLayout(sessionDir);
  let records = 0;
  for (let part = 0; part <= layout.activePart; part++) {
    let lastSeq = 0;
    const scan = scanJsonlSync(safePath(timelinePartDir(sessionDir, part), 'timeline.jsonl'), record => {
      onRecord(record); lastSeq = record.value.seq;
    });
    records += scan.records;
    if (part < layout.activePart && scan.error) fail(`Invalid frozen V2 shard: ${scan.error.cause.message}`);
    if (scan.error || part === layout.activePart) return { ...scan, records };
    if (lastSeq !== layout.cuts[part].throughSeq) fail('Frozen V2 shard cut mismatch');
  }
}

/** Caller holds .append.lock and has proved there are no committed in-flight rows. */
export function publishTimelineShard(sessionDir, checkpoint, promptCount, { durable = true, faultInjector = null } = {}) {
  const layout = readShardLayout(sessionDir);
  const part = layout.activePart + 1;
  if (!Number.isSafeInteger(promptCount) || promptCount < (layout.cuts.at(-1)?.promptCount || 0)
      || checkpoint.throughSeq <= (layout.cuts.at(-1)?.throughSeq || 0)
      || checkpoint.archive?.projectId !== layout.manifest.projectId
      || checkpoint.archive?.sessionId !== layout.manifest.sessionId) fail('Invalid V2 shard publication watermark');
  const nextCheckpoint = { ...checkpoint, timelineBytes: 0, winners: [] };
  restoreWireArchiveState(nextCheckpoint);
  const partsDir = safePath(sessionDir, 'parts');
  mkdirSync(partsDir, { recursive: true });
  const partDir = timelinePartDir(sessionDir, part);
  if (existsSync(partDir)) {
    // A process may have died before the manifest publish. Retain its bytes;
    // never overwrite an existing candidate or mistake it for committed data.
    if (!lstatSync(partDir).isDirectory()) fail('V2 shard candidate is not a directory');
    const names = readdirSync(partDir);
    if (names.length && !names.includes('prepare.json')) fail('Unrecognized unpublished V2 shard');
    if (names.length) {
      const prepared = JSON.parse(readFileSync(safePath(partDir, 'prepare.json'), 'utf8'));
      if (prepared.sessionId !== layout.manifest.sessionId || prepared.part !== part) fail('Unpublished V2 shard identity mismatch');
    }
    renameSync(partDir, join(partsDir, `.unpublished-${part}-${randomUUID()}`));
  }
  mkdirSync(partDir); // Exclusive claim; no frozen shard can be clobbered.
  atomicWriteJsonSync(join(partDir, 'prepare.json'), { sessionId: layout.manifest.sessionId, part }, { durable });
  faultInjector?.('shard-directory-created');
  const threadBounds = {};
  const threadsDir = safePath(sessionDir, 'threads');
  if (existsSync(threadsDir)) for (const entry of readdirSync(threadsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^t_[a-f0-9]{64}$/.test(entry.name)) continue;
    threadBounds[entry.name] = Object.fromEntries(['entries.jsonl', 'input.jsonl'].map(name => {
      const file = safePath(threadsDir, entry.name, name);
      return [name, existsSync(file) ? statSync(file).size : 0];
    }));
  }
  atomicWriteJsonSync(join(partDir, 'baseline.json'), {
    kind: 'cx-viewer.shard-baseline', version: 1, part, checkpoint: nextCheckpoint, threadBounds,
  }, { durable });
  const raw = readFileSync(join(partDir, 'baseline.json'));
  const fd = openSync(join(partDir, 'timeline.jsonl'), 'wx', 0o600);
  try { if (durable) fsyncSync(fd); } finally { closeSync(fd); }
  if (durable) { fsyncDirectorySync(partDir); fsyncDirectorySync(partsDir); }
  faultInjector?.('shard-baseline-persisted');
  const cut = { throughSeq: checkpoint.throughSeq, promptCount,
    baselineRef: { offset: 0, length: raw.length, checksum: `sha256:${sha256(raw)}` } };
  // Older writers reject this session manifest version rather than silently
  // appending to its now-frozen root timeline after an application downgrade.
  const manifest = { ...layout.manifest, version: SHARDED_SESSION_FORMAT_VERSION, shards: { version: 1, cuts: [...layout.cuts, cut] } };
  atomicWriteJsonSync(join(sessionDir, 'manifest.json'), manifest, { durable });
  faultInjector?.('shard-manifest-published');
  return { manifest, activePart: part, timelinePath: join(partDir, 'timeline.jsonl') };
}
