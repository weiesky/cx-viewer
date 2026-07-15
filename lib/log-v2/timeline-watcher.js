import { watchFile, unwatchFile } from 'node:fs';
import { dirname } from 'node:path';

import { applyWireCommit, createWireArchiveState, restoreWireArchiveState } from './reducer.js';
import {
  assertV2WireCursorFile,
  readV2WireCommitsFromCursor,
  readV2WireSnapshot,
  rebuildRequestSummary,
} from './transport.js';

const MAX_REPLAY_COMMITS = 512;
const MAX_REPLAY_BYTES = 16 * 1024 * 1024;
const MAX_SUBSCRIBER_QUEUE_COMMITS = 256;
const MAX_SUBSCRIBER_QUEUE_BYTES = 16 * 1024 * 1024;
const IDLE_PUBLISHER_TTL_MS = 30_000;
const publishers = new Map();
const commitSizeCache = new WeakMap();

function commitBytes(commit) {
  let bytes = commitSizeCache.get(commit);
  if (bytes === undefined) {
    bytes = Buffer.byteLength(JSON.stringify(commit));
    commitSizeCache.set(commit, bytes);
  }
  return bytes;
}

function publisherKey(timelinePath, generation) {
  return `${timelinePath}\u0000${generation}`;
}

function closePublisher(source) {
  if (source.closed) return;
  source.closed = true;
  if (source.timer) clearTimeout(source.timer);
  if (source.closeTimer) clearTimeout(source.closeTimer);
  unwatchFile(source.timelinePath, source.listener);
  publishers.delete(source.key);
}

function closeSubscriber(source, subscriber) {
  if (subscriber.closed) return;
  subscriber.closed = true;
  source.subscribers.delete(subscriber);
  if (!source.closed && source.subscribers.size === 0 && !source.closeTimer) {
    source.closeTimer = setTimeout(() => {
      source.closeTimer = null;
      if (source.subscribers.size === 0) closePublisher(source);
    }, IDLE_PUBLISHER_TTL_MS);
  }
}

function enqueue(source, subscriber, commits) {
  if (subscriber.closed || commits.length === 0) return;
  const bytes = commits.reduce((sum, commit) => sum + commitBytes(commit), 0);
  if (subscriber.pendingCommits + commits.length > MAX_SUBSCRIBER_QUEUE_COMMITS
      || subscriber.pendingBytes + bytes > MAX_SUBSCRIBER_QUEUE_BYTES) {
    Promise.resolve(subscriber.onError(Object.assign(new Error('V2 live subscriber queue overflow'), {
      code: 'CXV_LOG_V2_WIRE_RESET_REQUIRED',
    }))).finally(() => closeSubscriber(source, subscriber));
    return;
  }
  subscriber.pendingCommits += commits.length;
  subscriber.pendingBytes += bytes;
  subscriber.chain = subscriber.chain.then(async () => {
    if (!subscriber.closed) await subscriber.onCommits(commits);
  }).catch(async (error) => {
    if (!subscriber.closed) await subscriber.onError(error);
    closeSubscriber(source, subscriber);
  }).finally(() => {
    subscriber.pendingCommits -= commits.length;
    subscriber.pendingBytes -= bytes;
  });
}

function replayFor(source, cursor) {
  if (cursor.throughSeq === source.cursor.throughSeq) return [];
  if (cursor.throughSeq > source.cursor.throughSeq) return null;
  const replay = source.ring.filter(commit => commit.frame.timeline.seq > cursor.throughSeq);
  if (replay.length === 0 || replay[0].frame.timeline.seq !== cursor.throughSeq + 1
      || replay[replay.length - 1].frame.timeline.seq !== source.cursor.throughSeq) return null;
  return replay;
}

function schedulePump(source) {
  if (source.closed || source.timer) return;
  source.timer = setTimeout(() => {
    source.timer = null;
    pump(source);
  }, 25);
}

function pump(source) {
  if (source.closed) return;
  if (source.running) { source.pending = true; return; }
  source.running = true;
  try {
    const result = readV2WireCommitsFromCursor(source.logDir, source.file, { cursor: source.cursor });
    if (result.commits.length > 0) {
      const commits = result.commits.map((commit) => {
        const descriptor = applyWireCommit(source.state, commit.frame);
        return Object.freeze({
          ...commit,
          summary: commit.summary || rebuildRequestSummary(dirname(source.timelinePath), descriptor),
          frame: Object.freeze({
            ...commit.frame,
            entry: Object.freeze({
              ...commit.frame.entry,
              upsert: true,
              baseRevision: 0,
              set: Object.freeze(Object.fromEntries(descriptor.parts)),
              delete: Object.freeze([]),
            }),
          }),
        });
      });
      for (const commit of commits) {
        source.ring.push(commit);
        source.ringBytes += commitBytes(commit);
      }
      while (source.ring.length > MAX_REPLAY_COMMITS || source.ringBytes > MAX_REPLAY_BYTES) {
        source.ringBytes -= commitBytes(source.ring.shift());
      }
      source.cursor = result.cursor;
      for (const subscriber of source.subscribers) enqueue(source, subscriber, commits);
    } else {
      source.cursor = result.cursor;
    }
  } catch (error) {
    for (const subscriber of [...source.subscribers]) {
      Promise.resolve(subscriber.onError(error)).finally(() => closeSubscriber(source, subscriber));
    }
    // Reducer validation may have failed after partially applying a suffix.
    // Retire this publisher so no reconnect can observe mixed cursor/state.
    closePublisher(source);
  } finally {
    source.running = false;
    if (source.pending) { source.pending = false; queueMicrotask(() => pump(source)); }
  }
}

function createPublisher({ logDir, file, timelinePath, cursor, seedCheckpoint = null }) {
  const key = publisherKey(timelinePath, cursor.archive.generation);
  let state;
  if (cursor.throughSeq > 0 || cursor.timelineBytes > 0) assertV2WireCursorFile(logDir, file, cursor);
  if (cursor.throughSeq === 0 && cursor.timelineBytes === 0) {
    state = createWireArchiveState(cursor.archive);
  } else if (seedCheckpoint
      && seedCheckpoint.throughSeq === cursor.throughSeq
      && seedCheckpoint.timelineBytes === cursor.timelineBytes) {
    state = restoreWireArchiveState(seedCheckpoint);
  } else {
    const seed = readV2WireSnapshot(logDir, file, {
      throughSeq: cursor.throughSeq,
      includeRevisionState: true,
    });
    if (seed.end.cursor.timelineBytes !== cursor.timelineBytes) {
      const error = new Error('V2 live publisher cursor no longer matches the archive');
      error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
      throw error;
    }
    state = restoreWireArchiveState(seed.checkpoint);
  }
  const source = {
    key, logDir, file, timelinePath, cursor, state,
    ring: [], ringBytes: 0, subscribers: new Set(),
    running: false, pending: false, closed: false, timer: null, closeTimer: null,
    listener: null,
  };
  source.listener = () => schedulePump(source);
  watchFile(timelinePath, { interval: 250 }, source.listener);
  publishers.set(key, source);
  // Close the snapshot/subscribe registration race.
  queueMicrotask(() => pump(source));
  return source;
}

/** Subscribes to one process-wide canonical timeline publisher. */
export function watchV2Timeline({ logDir, file, timelinePath, cursor, seedCheckpoint = null, onCommits, onError }) {
  const key = publisherKey(timelinePath, cursor.archive.generation);
  const source = publishers.get(key) || createPublisher({ logDir, file, timelinePath, cursor, seedCheckpoint });
  if (source.closeTimer) { clearTimeout(source.closeTimer); source.closeTimer = null; }
  // A worker snapshot can observe commits slightly ahead of an already-open
  // publisher. Catch the shared source up before deciding the cursor is invalid.
  if (source.cursor.throughSeq < cursor.throughSeq) pump(source);
  const subscriber = {
    onCommits, onError, chain: Promise.resolve(), pendingCommits: 0, pendingBytes: 0, closed: false,
  };
  source.subscribers.add(subscriber);
  const replay = replayFor(source, cursor);
  if (replay === null) {
    Promise.resolve(onError(Object.assign(new Error('V2 live replay cursor is no longer available'), {
      code: 'CXV_LOG_V2_WIRE_RESET_REQUIRED',
    }))).finally(() => closeSubscriber(source, subscriber));
  } else {
    enqueue(source, subscriber, replay);
  }
  return () => closeSubscriber(source, subscriber);
}

export function getV2TimelineWatcherStats() {
  return Object.freeze({
    publishers: publishers.size,
    subscribers: [...publishers.values()].reduce((sum, source) => sum + source.subscribers.size, 0),
  });
}

export function closeIdleV2TimelinePublishers() {
  for (const source of [...publishers.values()]) {
    if (source.subscribers.size === 0) closePublisher(source);
  }
}
