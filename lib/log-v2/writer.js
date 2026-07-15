import crypto from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  truncateSync,
} from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

import {
  createProjectManifest,
  createSessionManifest,
  createTimelineRecord,
  validateProjectManifest,
  validateSessionManifest,
  validateTimelineRecord,
} from './schema.js';
import {
  hashStorageId,
  projectArchiveDirectoryName,
  sessionArchiveDirectoryName,
  sessionArchiveRelativePath,
  threadStoreToken,
} from './identity.js';
import { assertLogLayoutWritable } from './layout.js';
import {
  applyInputOperations,
  deriveEntryKey,
  deriveTimelinePhase,
  deriveTurnId,
  diffInputReferences,
  splitEntryParts,
} from './entry-codec.js';
import {
  appendJsonLineSync,
  atomicWriteJsonSync,
  fsyncDirectorySync,
  readJsonReferenceSync,
  repairJsonlTailSync,
  scanJsonlSync,
  withFileLockSync,
  writeContentObjectSync,
} from './storage.js';
import {
  applyRootInputSnapshot,
  appendRepeatedRootPrompt,
  hashTurnId,
  invalidateSessionSummary,
  readSessionSummary,
  rebuildSessionSummary,
  summaryBaseBytes,
  writeSessionSummary,
} from './session-summary.js';
import { buildRequestSummary } from './request-summary.js';

const PROJECT_MANIFEST_FILE = 'project.json';
const SESSION_MANIFEST_FILE = 'manifest.json';
const TIMELINE_FILE = 'timeline.jsonl';
const REQUEST_SUMMARY_FILE = 'request-summaries.jsonl';
const THREAD_TOKEN_PATTERN = /^t_[a-f0-9]{64}$/;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function invokeFault(injector, stage, context) {
  if (typeof injector === 'function') injector(stage, context);
}

function listDirectories(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => join(root, entry.name));
}

function findSessionArchive(projectDir, sessionId) {
  let found = null;
  for (const candidate of listDirectories(projectDir)) {
    if (!basename(candidate).endsWith('.cxvsession')) continue;
    try {
      const manifest = readJson(join(candidate, SESSION_MANIFEST_FILE));
      const result = validateSessionManifest(manifest);
      if (!result.ok || manifest.sessionId !== sessionId) continue;
      if (basename(candidate) !== sessionArchiveDirectoryName({
        sessionId: manifest.sessionId,
        createdAt: manifest.createdAt,
      })) throw new Error('V2 session directory name does not match manifest identity');
      if (found) throw new Error(`duplicate V2 session archive for ${sessionId}`);
      found = candidate;
    } catch (error) {
      if (error.message.startsWith('duplicate V2 session archive')
          || error.message.includes('does not match manifest identity')) throw error;
    }
  }
  return found;
}

function contained(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

function ensureProjectDirectory(rootDir, projectDir, { durable = true } = {}) {
  mkdirSync(rootDir, { recursive: true });
  const realRoot = realpathSync(rootDir);
  let created = false;
  if (!existsSync(projectDir)) {
    try {
      mkdirSync(projectDir);
      created = true;
    }
    catch (error) {
      // Another writer may have created the same readable project directory
      // after our existence check. Validate that winner below.
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  const stat = lstatSync(projectDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('V2 project path is not a safe directory');
  if (!contained(realRoot, realpathSync(projectDir))) throw new Error('V2 project directory escapes the log root');
  if (created && durable) fsyncDirectorySync(realRoot);
}

function refWithThread(threadToken, ref) {
  return Object.freeze({ thread: threadToken, ...ref });
}

function threadFiles(sessionDir, threadToken) {
  if (!THREAD_TOKEN_PATTERN.test(threadToken)) throw new TypeError('invalid thread storage token');
  const dir = join(sessionDir, 'threads', threadToken);
  return {
    dir,
    entries: join(dir, 'entries.jsonl'),
    input: join(dir, 'input.jsonl'),
  };
}

function resolveReferencedRecord(sessionDir, ref, kind) {
  const files = threadFiles(sessionDir, ref?.thread);
  return readJsonReferenceSync(kind === 'input' ? files.input : files.entries, ref, { rootDir: sessionDir });
}

function applyPartRevision(previous, record) {
  const next = new Map(previous);
  for (const part of record.delete || []) next.delete(part);
  for (const [part, ref] of Object.entries(record.set || {})) next.set(part, ref);
  return next;
}

function recoverSessionState(sessionDir) {
  const threadStates = new Map();
  const entryStates = new Map();
  let repairedThreadFiles = 0;
  let discardedThreadBytes = 0;
  const threadsRoot = join(sessionDir, 'threads');
  for (const dir of listDirectories(threadsRoot)) {
    const token = dir.split('/').pop();
    if (!THREAD_TOKEN_PATTERN.test(token)) continue;
    for (const name of ['entries.jsonl', 'input.jsonl']) {
      const file = join(dir, name);
      if (existsSync(file)) {
        const repaired = repairJsonlTailSync(file);
        if (repaired.repaired) {
          repairedThreadFiles++;
          discardedThreadBytes += repaired.fileSize - repaired.validBytes;
        }
      }
    }
  }

  let expectedSeq = 1;
  const timeline = join(sessionDir, TIMELINE_FILE);
  const scan = scanJsonlSync(timeline, ({ value: timelineRecord }) => {
    const validation = validateTimelineRecord(timelineRecord);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    if (timelineRecord.seq !== expectedSeq) throw new Error(`timeline sequence gap at ${expectedSeq}`);

    const entryRecord = resolveReferencedRecord(sessionDir, timelineRecord.entryRef, 'entry');
    if (entryRecord.kind !== 'cx-viewer.entry-revision'
        || entryRecord.txnId !== timelineRecord.txnId
        || entryRecord.entryKey !== timelineRecord.entryKey
        || entryRecord.revision !== timelineRecord.entryRevision) {
      throw new Error(`entry revision mismatch at timeline sequence ${expectedSeq}`);
    }

    const threadToken = timelineRecord.entryRef.thread;
    const entryStateKey = `${threadToken}\u0000${entryRecord.entryKey}`;
    const previousEntry = entryStates.get(entryStateKey) || { revision: 0, parts: new Map() };
    if (entryRecord.baseRevision !== previousEntry.revision || entryRecord.revision !== previousEntry.revision + 1) {
      throw new Error(`entry revision chain mismatch at timeline sequence ${expectedSeq}`);
    }
    const nextEntry = {
      revision: entryRecord.revision,
      parts: applyPartRevision(previousEntry.parts, entryRecord),
    };

    const previousThread = threadStates.get(threadToken) || {
      inputRevision: 0,
      inputRefs: [],
      inputPath: null,
    };
    let nextThread = previousThread;
    const binding = entryRecord.inputBinding;
    if (binding?.ref) {
      const inputRecord = resolveReferencedRecord(sessionDir, binding.ref, 'input');
      if (inputRecord.kind !== 'cx-viewer.input-revision'
          || inputRecord.txnId !== timelineRecord.txnId
          || inputRecord.baseRevision !== previousThread.inputRevision
          || inputRecord.revision !== previousThread.inputRevision + 1
          || binding.revision !== inputRecord.revision) {
        throw new Error(`input revision chain mismatch at timeline sequence ${expectedSeq}`);
      }
      nextThread = {
        inputRevision: inputRecord.revision,
        inputRefs: applyInputOperations(previousThread.inputRefs, inputRecord),
        inputPath: inputRecord.path,
      };
    } else if (binding && binding.revision !== previousThread.inputRevision) {
      throw new Error(`input binding mismatch at timeline sequence ${expectedSeq}`);
    }
    if ((binding?.revision ?? 0) !== timelineRecord.inputRevision) {
      throw new Error(`timeline input revision mismatch at sequence ${expectedSeq}`);
    }

    entryStates.set(entryStateKey, nextEntry);
    threadStates.set(threadToken, nextThread);
    expectedSeq++;
  });

  if (scan.validBytes < scan.fileSize) truncateSync(timeline, scan.validBytes);
  return {
    nextSeq: expectedSeq,
    threadStates,
    entryStates,
    timelineBytes: scan.validBytes,
    recovery: Object.freeze({
      committedRecords: expectedSeq - 1,
      repairedTimeline: scan.validBytes < scan.fileSize,
      discardedTimelineBytes: scan.fileSize - scan.validBytes,
      repairedThreadFiles,
      discardedThreadBytes,
      error: scan.error?.cause?.message ?? null,
    }),
  };
}

export class LogV2Writer {
  static open(options) {
    return new LogV2Writer(options);
  }

  constructor({
    rootDir,
    projectId,
    canonicalCwd,
    sessionId,
    rootThreadId = sessionId,
    createdAt = new Date().toISOString(),
    startReason = 'startup',
    source = 'app-server',
    previousSessionId = null,
    replacesSessionId = null,
    forkedFromSessionId = null,
    faultInjector = null,
    durability = 'durable',
    summaryMode = 'live',
  }) {
    for (const [name, value] of Object.entries({ rootDir, projectId, canonicalCwd, sessionId, rootThreadId })) {
      if (typeof value !== 'string' || !value) throw new TypeError(`${name} is required`);
    }
    this.rootDir = rootDir;
    this.projectId = projectId;
    this.canonicalCwd = canonicalCwd;
    this.sessionId = sessionId;
    this.rootThreadId = rootThreadId;
    this.faultInjector = faultInjector;
    if (!['durable', 'buffered'].includes(durability)) throw new TypeError('durability must be durable or buffered');
    this.durable = durability === 'durable';
    if (!['live', 'deferred'].includes(summaryMode)) throw new TypeError('summaryMode must be live or deferred');
    this.summaryMode = summaryMode;
    assertLogLayoutWritable(rootDir);
    this.projectStorageName = projectArchiveDirectoryName(projectId);
    this.projectDir = join(rootDir, this.projectStorageName);
    this.projectManifestPath = join(this.projectDir, PROJECT_MANIFEST_FILE);
    ensureProjectDirectory(rootDir, this.projectDir, { durable: this.durable });

    withFileLockSync(join(this.projectDir, '.project.lock'), () => {
      invokeFault(this.faultInjector, 'project-lock-acquired', { projectId, canonicalCwd });
      assertLogLayoutWritable(rootDir);
      let projectManifest;
      if (existsSync(this.projectManifestPath)) {
        projectManifest = readJson(this.projectManifestPath);
        const result = validateProjectManifest(projectManifest);
        if (!result.ok) throw new Error(`invalid V2 project manifest: ${result.errors.join('; ')}`);
        if (projectManifest.projectId !== projectId || projectManifest.canonicalCwd !== canonicalCwd) {
          const error = new Error(
            `V2 project id collision: "${projectId}" is already bound to ${projectManifest.canonicalCwd}`,
          );
          error.code = 'CXV_LOG_PROJECT_ID_COLLISION';
          throw error;
        }
      } else {
        projectManifest = createProjectManifest({ projectId, canonicalCwd, createdAt });
        atomicWriteJsonSync(this.projectManifestPath, projectManifest, { durable: this.durable });
      }

      this.sessionDir = findSessionArchive(this.projectDir, sessionId);
      if (!this.sessionDir) {
        this.sessionDir = join(this.projectDir, sessionArchiveRelativePath({ sessionId, createdAt }));
        if (existsSync(this.sessionDir)) {
          throw new Error('V2 session directory already exists with a different identity');
        }
        mkdirSync(this.sessionDir, { recursive: true });
        if (this.durable) fsyncDirectorySync(this.projectDir);
        const sessionManifest = createSessionManifest({
          projectId,
          sessionId,
          sessionSeq: projectManifest.nextSessionSeq,
          rootThreadId,
          previousSessionId,
          replacesSessionId,
          forkedFromSessionId,
          startReason,
          source,
          createdAt,
          state: 'active',
        });
        atomicWriteJsonSync(join(this.sessionDir, SESSION_MANIFEST_FILE), sessionManifest, { durable: this.durable });
        projectManifest = {
          ...projectManifest,
          updatedAt: createdAt,
          nextSessionSeq: projectManifest.nextSessionSeq + 1,
        };
        atomicWriteJsonSync(this.projectManifestPath, projectManifest, { durable: this.durable });
      } else {
        const sessionManifest = readJson(join(this.sessionDir, SESSION_MANIFEST_FILE));
        const result = validateSessionManifest(sessionManifest);
        if (!result.ok) throw new Error(`invalid V2 session manifest: ${result.errors.join('; ')}`);
        if (sessionManifest.sessionId !== sessionId || sessionManifest.rootThreadId !== rootThreadId) {
          throw new Error('V2 session manifest identity mismatch');
        }
      }
    });

    this.sessionLockPath = join(this.sessionDir, '.append.lock');
    const recovered = withFileLockSync(this.sessionLockPath, () => {
      invokeFault(this.faultInjector, 'session-recovery-lock-acquired', { sessionId });
      assertLogLayoutWritable(this.rootDir);
      const value = recoverSessionState(this.sessionDir);
      if (this.summaryMode === 'live'
          && (value.recovery.repairedTimeline || value.recovery.repairedThreadFiles > 0)) {
        invalidateSessionSummary(this.sessionDir);
      }
      return value;
    });
    this.nextSeq = recovered.nextSeq;
    this.threadStates = recovered.threadStates;
    this.entryStates = recovered.entryStates;
    this.recovery = recovered.recovery;
    // This byte cursor must come from the same locked recovery snapshot as the
    // sequence/revision state. A stat after releasing the lock can observe a
    // competing commit without its state and suppress the next refresh.
    this.timelineBytes = recovered.timelineBytes;
    this.summary = null;
    this.summaryBaseBytes = null;
    if (this.summaryMode === 'live') {
      withFileLockSync(this.sessionLockPath, () => {
        assertLogLayoutWritable(this.rootDir);
        return this.loadOrRebuildSummaryLocked();
      });
    }
  }

  loadOrRebuildSummaryLocked() {
    const manifest = readJson(join(this.sessionDir, SESSION_MANIFEST_FILE));
    let summary = null;
    try {
      summary = readSessionSummary(this.sessionDir, { manifest, timelineBytes: this.timelineBytes });
    } catch {}
    if (!summary) {
      summary = rebuildSessionSummary(this.sessionDir, {
        durable: this.durable,
        lock: false,
      });
    }
    this.summary = summary;
    this.summaryBaseBytes = summaryBaseBytes(summary);
    return summary;
  }

  /** Persist the session selected by the latest successful project write. */
  markProjectLatest({ source = null, updatedAt = new Date().toISOString() } = {}) {
    assertLogLayoutWritable(this.rootDir);
    return withFileLockSync(join(this.projectDir, '.project.lock'), () => {
      assertLogLayoutWritable(this.rootDir);
      const projectManifest = readJson(this.projectManifestPath);
      const result = validateProjectManifest(projectManifest);
      if (!result.ok) throw new Error(`invalid V2 project manifest: ${result.errors.join('; ')}`);
      if (projectManifest.projectId !== this.projectId
          || projectManifest.canonicalCwd !== this.canonicalCwd) {
        throw new Error('V2 project manifest identity mismatch');
      }
      if (projectManifest.latestSessionId === this.sessionId) {
        return Object.freeze({ changed: false, selected: true });
      }
      if (projectManifest.latestSessionId && source !== 'app-server') {
        const currentSessionDir = findSessionArchive(this.projectDir, projectManifest.latestSessionId);
        if (currentSessionDir) {
          try {
            const currentSession = readJson(join(currentSessionDir, SESSION_MANIFEST_FILE));
            if (validateSessionManifest(currentSession).ok && currentSession.source === 'app-server') {
              return Object.freeze({ changed: false, selected: false });
            }
          } catch {}
        }
      }
      const date = new Date(updatedAt);
      const nextUpdatedAt = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      atomicWriteJsonSync(this.projectManifestPath, {
        ...projectManifest,
        updatedAt: nextUpdatedAt,
        latestSessionId: this.sessionId,
      }, { durable: this.durable });
      return Object.freeze({ changed: true, selected: true });
    });
  }

  append(entry, identity, options = {}) {
    assertLogLayoutWritable(this.rootDir);
    if (!identity || identity.sessionId !== this.sessionId) {
      throw new TypeError('entry identity does not belong to this V2 session archive');
    }
    const threadId = identity.threadId;
    if (typeof threadId !== 'string' || !threadId) throw new TypeError('identity.threadId is required');
    return withFileLockSync(this.sessionLockPath, () => {
      invokeFault(this.faultInjector, 'append-lock-acquired', { sessionId: this.sessionId });
      assertLogLayoutWritable(this.rootDir);
      const timelinePath = join(this.sessionDir, TIMELINE_FILE);
      const actualTimelineBytes = existsSync(timelinePath) ? statSync(timelinePath).size : 0;
      if (actualTimelineBytes !== this.timelineBytes) {
        const recovered = recoverSessionState(this.sessionDir);
        this.nextSeq = recovered.nextSeq;
        this.threadStates = recovered.threadStates;
        this.entryStates = recovered.entryStates;
        this.recovery = recovered.recovery;
        this.timelineBytes = recovered.timelineBytes;
        if (this.recovery.repairedTimeline || this.recovery.repairedThreadFiles > 0) {
          invalidateSessionSummary(this.sessionDir);
        }
        if (this.summaryMode === 'live') this.loadOrRebuildSummaryLocked();
      }
      if (this.summaryMode === 'live' && !this.summary) this.loadOrRebuildSummaryLocked();
      try {
        return this.appendLocked(entry, identity, options);
      } catch (error) {
        if (this.summaryMode === 'live') {
          invalidateSessionSummary(this.sessionDir);
          this.summary = null;
          this.summaryBaseBytes = null;
        }
        throw error;
      }
    });
  }

  appendLocked(entry, identity, options) {
    const threadId = identity.threadId;
    const threadToken = threadStoreToken(threadId);
    const files = threadFiles(this.sessionDir, threadToken);
    if (!existsSync(files.dir)) {
      mkdirSync(files.dir, { recursive: true });
      if (this.durable) {
        fsyncDirectorySync(join(this.sessionDir, 'threads'));
        fsyncDirectorySync(this.sessionDir);
      }
    }

    const txnId = options.txnId || crypto.randomUUID();
    const eventId = options.eventId || crypto.randomUUID();
    const externalEntryKey = options.entryKey || deriveEntryKey(entry);
    const entryKey = hashStorageId(externalEntryKey, 'e_');
    const entryStateKey = `${threadToken}\u0000${entryKey}`;
    const previousEntry = this.entryStates.get(entryStateKey) || { revision: 0, parts: new Map() };
    const previousThread = this.threadStates.get(threadToken) || {
      inputRevision: 0,
      inputRefs: [],
      inputPath: null,
    };
    const split = splitEntryParts(entry);

    // summary.json describes the entire stable folder, including orphaned
    // pre-commit files. Remove it before the first archive mutation so a real
    // process death (where no catch/finally runs) cannot leave a seemingly
    // fresh timeline watermark paired with an undersized folder total.
    if (this.summaryMode === 'live') invalidateSessionSummary(this.sessionDir);

    let addedArchiveBytes = 0;
    const onObjectCreate = ({ bytes }) => { addedArchiveBytes += bytes; };
    const nextParts = new Map();
    for (const [part, value] of Object.entries(split.parts)) {
      nextParts.set(part, writeContentObjectSync(this.sessionDir, value, {
        durable: this.durable,
        onCreate: onObjectCreate,
      }));
    }
    const set = {};
    for (const [part, ref] of nextParts) {
      if (previousEntry.parts.get(part)?.hash !== ref.hash) set[part] = ref;
    }
    const deleted = [...previousEntry.parts.keys()].filter((part) => !nextParts.has(part));
    invokeFault(this.faultInjector, 'objects-persisted', { txnId, threadId, entryKey });

    let inputBinding = null;
    let nextThread = previousThread;
    if (split.input) {
      const nextInputRefs = split.input.items.map((item) => writeContentObjectSync(
        this.sessionDir,
        item,
        { durable: this.durable, onCreate: onObjectCreate },
      ));
      const inputChanged = split.input.path !== previousThread.inputPath
        || nextInputRefs.length !== previousThread.inputRefs.length
        || nextInputRefs.some((ref, index) => ref.hash !== previousThread.inputRefs[index]?.hash);
      if (inputChanged) {
        const revision = previousThread.inputRevision + 1;
        const operations = diffInputReferences(previousThread.inputRefs, nextInputRefs);
        const inputRecord = {
          kind: 'cx-viewer.input-revision',
          version: 1,
          txnId,
          revision,
          baseRevision: previousThread.inputRevision,
          path: split.input.path,
          ...operations,
        };
        const ref = refWithThread(threadToken, appendJsonLineSync(files.input, inputRecord, { durable: this.durable }));
        addedArchiveBytes += ref.length;
        inputBinding = { revision, path: split.input.path, ref };
        nextThread = { inputRevision: revision, inputRefs: nextInputRefs, inputPath: split.input.path };
      } else {
        inputBinding = { revision: previousThread.inputRevision, path: split.input.path, ref: null };
      }
    }
    invokeFault(this.faultInjector, 'input-persisted', { txnId, threadId, entryKey, inputBinding });

    const entryRevision = previousEntry.revision + 1;
    const entryRecord = {
      kind: 'cx-viewer.entry-revision',
      version: 1,
      txnId,
      entryKey,
      revision: entryRevision,
      baseRevision: previousEntry.revision,
      set,
      delete: deleted,
      inputBinding,
    };
    const entryRef = refWithThread(threadToken, appendJsonLineSync(files.entries, entryRecord, { durable: this.durable }));
    addedArchiveBytes += entryRef.length;
    invokeFault(this.faultInjector, 'entry-persisted', { txnId, threadId, entryKey, entryRef });

    const timelineRecord = createTimelineRecord({
      seq: this.nextSeq,
      eventId,
      txnId,
      timestamp: options.timestamp || entry.timestamp || new Date().toISOString(),
      committedAt: options.committedAt || new Date().toISOString(),
      threadId,
      parentThreadId: identity.parentThreadId ?? null,
      agentRole: identity.agentRole || (threadId === this.rootThreadId ? 'main' : 'subagent'),
      turnId: options.turnId ?? deriveTurnId(entry),
      entryKey,
      entryRevision,
      entryRef,
      inputRevision: inputBinding?.revision ?? 0,
      phase: deriveTimelinePhase(entry, options.phase),
      legacyRef: options.legacyRef ?? null,
    });
    // Write the disposable projection before the canonical commit marker so a
    // live tailer never observes a committed seq whose summary is merely late.
    // A crash here can leave an orphan summary; readers bind all identity
    // fields to the winning descriptor and safely ignore it.
    let requestSummary = null;
    let requestSummaryError = null;
    try {
      requestSummary = buildRequestSummary(entry, timelineRecord);
      const requestSummaryRef = appendJsonLineSync(
        join(this.sessionDir, REQUEST_SUMMARY_FILE),
        requestSummary,
        { durable: this.durable },
      );
      addedArchiveBytes += requestSummaryRef.length;
    } catch (error) {
      requestSummaryError = error;
    }
    const timelineRef = appendJsonLineSync(
      join(this.sessionDir, TIMELINE_FILE),
      timelineRecord,
      { durable: this.durable },
    );
    addedArchiveBytes += timelineRef.length;

    this.entryStates.set(entryStateKey, { revision: entryRevision, parts: nextParts });
    if (split.input) this.threadStates.set(threadToken, nextThread);
    this.nextSeq++;
    this.timelineBytes = timelineRef.offset + timelineRef.length;
    invokeFault(this.faultInjector, 'timeline-committed', { txnId, timelineRecord, timelineRef });

    let summaryError = null;
    if (this.summaryMode === 'live') {
      try {
        const summary = this.summary || this.loadOrRebuildSummaryLocked();
        summary.throughSeq = timelineRecord.seq;
        summary.indexedTimelineBytes = this.timelineBytes;
        summary.committedEvents = timelineRecord.seq;
        if (timelineRecord.turnId) {
          const turnHash = hashTurnId(timelineRecord.turnId);
          if (!summary.turnIds.includes(turnHash)) {
            summary.turnIds.push(turnHash);
            summary.turnIds.sort();
            summary.turns = summary.turnIds.length;
          }
        }
        if (threadId === this.rootThreadId && split.input) {
          const turnHash = timelineRecord.turnId ? hashTurnId(timelineRecord.turnId) : null;
          const promptCountBefore = summary.userPrompts.length;
          if (inputBinding?.revision > summary.rootInputRevision) {
            applyRootInputSnapshot(summary, split.input.items, inputBinding.revision);
          }
          if (turnHash && turnHash !== summary.lastRootTurnId
              && summary.userPrompts.length === promptCountBefore) {
            appendRepeatedRootPrompt(summary, split.input.items);
          }
          if (turnHash) summary.lastRootTurnId = turnHash;
        }
        this.summaryBaseBytes += addedArchiveBytes;
        this.summary = writeSessionSummary(this.sessionDir, summary, {
          durable: this.durable,
          baseBytes: this.summaryBaseBytes,
        });
      } catch (error) {
        summaryError = error;
        invalidateSessionSummary(this.sessionDir);
        this.summary = null;
        this.summaryBaseBytes = null;
      }
    }

    return Object.freeze({
      written: true,
      sessionDir: this.sessionDir,
      txnId,
      eventId,
      seq: timelineRecord.seq,
      entryKey,
      entryRevision,
      inputRevision: timelineRecord.inputRevision,
      timelineRef,
      summaryDegraded: !!summaryError,
      summaryError: summaryError?.message ?? null,
      requestSummary,
      requestSummaryDegraded: !!requestSummaryError,
      requestSummaryError: requestSummaryError?.message ?? null,
    });
  }
}

export { findSessionArchive, recoverSessionState };
