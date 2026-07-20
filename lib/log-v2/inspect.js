#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateSessionManifest, validateTimelineRecord } from './schema.js';
import { readContentObjectSync, readJsonReferenceSync, scanJsonlSync } from './storage.js';

const THREAD_TOKEN_PATTERN = /^t_[a-f0-9]{64}$/;

function readThreadRecord(sessionDir, ref, fileName) {
  if (!THREAD_TOKEN_PATTERN.test(ref?.thread || '')) throw new TypeError('invalid thread reference');
  return readJsonReferenceSync(join(sessionDir, 'threads', ref.thread, fileName), ref, { rootDir: sessionDir });
}

export function inspectSessionArchive(sessionDir) {
  const manifestPath = resolve(sessionDir, 'manifest.json');
  const timelinePath = resolve(sessionDir, 'timeline.jsonl');
  const errors = [];
  let manifest = null;
  if (!existsSync(manifestPath)) errors.push('manifest.json is missing');
  else {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const validation = validateSessionManifest(manifest);
      if (!validation.ok) errors.push(...validation.errors.map((error) => `manifest: ${error}`));
    } catch (error) {
      errors.push(`manifest: ${error.message}`);
    }
  }

  let previousSeq = 0;
  const threads = new Set();
  const objects = new Set();
  const phases = {};
  const timeline = scanJsonlSync(timelinePath, ({ value }) => {
    const validation = validateTimelineRecord(value);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    if (value.seq !== previousSeq + 1) throw new Error(`timeline sequence gap after ${previousSeq}`);

    const entry = readThreadRecord(sessionDir, value.entryRef, 'entries.jsonl');
    if (entry.kind !== 'cx-viewer.entry-revision'
        || entry.txnId !== value.txnId
        || entry.entryKey !== value.entryKey
        || entry.revision !== value.entryRevision) {
      throw new Error(`entry reference mismatch at sequence ${value.seq}`);
    }
    for (const ref of Object.values(entry.set || {})) {
      readContentObjectSync(sessionDir, ref);
      objects.add(ref.hash);
    }
    if (entry.inputBinding?.ref) {
      const input = readThreadRecord(sessionDir, entry.inputBinding.ref, 'input.jsonl');
      if (input.kind !== 'cx-viewer.input-revision'
          || input.txnId !== value.txnId
          || input.revision !== entry.inputBinding.revision) {
        throw new Error(`input reference mismatch at sequence ${value.seq}`);
      }
      for (const ref of input.append || []) {
        readContentObjectSync(sessionDir, ref);
        objects.add(ref.hash);
      }
    }
    previousSeq = value.seq;
    threads.add(value.threadId);
    phases[value.phase] = (phases[value.phase] || 0) + 1;
  });
  if (timeline.error) errors.push(`timeline at byte ${timeline.error.offset}: ${timeline.error.cause.message}`);

  return Object.freeze({
    ok: errors.length === 0,
    sessionId: manifest?.sessionId ?? null,
    sessionSeq: manifest?.sessionSeq ?? null,
    state: manifest?.state ?? null,
    committedEvents: previousSeq,
    threadCount: threads.size,
    referencedObjectCount: objects.size,
    phases,
    timelineBytes: timeline.fileSize,
    validTimelineBytes: timeline.validBytes,
    errors,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node lib/log-v2/inspect.js <session-archive-directory>');
    process.exitCode = 2;
  } else {
    const report = inspectSessionArchive(resolve(target));
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}
