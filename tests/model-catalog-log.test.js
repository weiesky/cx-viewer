import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createModelCatalogLogCompactor } from '../lib/model-catalog-log.js';
import {
  createRepeatEntryExpander,
  METADATA_MODELS_REPEAT,
} from '../lib/repeat-entry.js';
import { readLogFile } from '../lib/log-watcher.js';
import { readPagedEntries, streamRawEntriesAsync } from '../lib/log-stream.js';

function modelsEntry(timestamp, { inProgress = false, version = '0.144.1', bodyVersion = 1 } = {}) {
  return {
    timestamp,
    project: 'cx-viewer',
    url: `https://chatgpt.com/backend-api/codex/models?client_version=${version}`,
    method: 'GET',
    headers: { 'x-request-id': `volatile-${timestamp}` },
    body: null,
    response: inProgress ? null : {
      status: 200,
      headers: { date: timestamp },
      body: { models: [{ slug: 'gpt-5.6-sol', revision: bodyVersion }] },
    },
    duration: inProgress ? 0 : Number(timestamp.slice(-2)) || 800,
    ...(inProgress ? { inProgress: true, requestId: `request-${timestamp}` } : {}),
    mainAgent: false,
    subAgent: false,
  };
}

function marker(timestamp) {
  return { timestamp, _cxvRepeat: METADATA_MODELS_REPEAT };
}

function writeEntries(file, entries) {
  writeFileSync(file, entries.map(entry => `${JSON.stringify(entry)}\n---\n`).join(''));
}

test('stores one full model catalog response then timestamp-only repeat markers', () => {
  const compactor = createModelCatalogLogCompactor();
  const firstPending = modelsEntry('2026-07-12T01:00:00.000Z', { inProgress: true });
  const first = modelsEntry('2026-07-12T01:00:00.000Z');
  const secondPending = modelsEntry('2026-07-12T01:03:00.000Z', { inProgress: true });
  const second = modelsEntry('2026-07-12T01:03:00.000Z');

  assert.equal(compactor.process(firstPending), null);
  assert.equal(compactor.process(first), first);
  assert.equal(compactor.process(secondPending), null);
  const compacted = compactor.process(second);
  assert.deepEqual(compacted, marker(second.timestamp));
  assert.deepEqual(Object.keys(compacted).sort(), ['_cxvRepeat', 'timestamp']);
});

test('dynamic headers and duration do not defeat content deduplication', () => {
  const compactor = createModelCatalogLogCompactor();
  const first = modelsEntry('2026-07-12T01:00:00.000Z');
  const sameContent = modelsEntry('2026-07-12T01:03:59.999Z');
  compactor.process(first);
  assert.deepEqual(compactor.process(sameContent), marker(sameContent.timestamp));
});

test('changed content, changed endpoint, and an intervening request write a new full base', () => {
  const compactor = createModelCatalogLogCompactor();
  const first = modelsEntry('2026-07-12T01:00:00.000Z');
  compactor.process(first);

  const changed = modelsEntry('2026-07-12T01:03:00.000Z', { bodyVersion: 2 });
  assert.equal(compactor.process(changed), changed);

  const nextVersion = modelsEntry('2026-07-12T01:06:00.000Z', { version: '0.145.0', bodyVersion: 2 });
  assert.equal(compactor.process(nextVersion), nextVersion);

  compactor.process({ timestamp: '2026-07-12T01:07:00.000Z', url: 'codex://tool/exec', method: 'TOOL' });
  const afterInterruption = modelsEntry('2026-07-12T01:09:00.000Z', { version: '0.145.0', bodyVersion: 2 });
  assert.equal(compactor.process(afterInterruption), afterInterruption);
});

test('reset forces the next model catalog record to be a full rotation base', () => {
  const compactor = createModelCatalogLogCompactor();
  compactor.process(modelsEntry('2026-07-12T01:00:00.000Z'));
  compactor.reset();
  const next = modelsEntry('2026-07-12T01:03:00.000Z');
  assert.equal(compactor.process(next), next);
});

test('repeat expander restores details with shared body and response references', () => {
  const expander = createRepeatEntryExpander();
  const base = modelsEntry('2026-07-12T01:00:00.000Z');
  assert.equal(expander.process(base), base);
  const expanded = expander.process(marker('2026-07-12T01:03:00.000Z'));
  assert.equal(expanded.timestamp, '2026-07-12T01:03:00.000Z');
  assert.equal(expanded.url, base.url);
  assert.equal(expanded.body, base.body);
  assert.equal(expanded.response, base.response);
  assert.equal(expanded._cxvRepeated, METADATA_MODELS_REPEAT);
});

test('historical, raw streaming, and paged readers expand timestamp markers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cxv-model-repeat-'));
  const file = join(dir, 'models.jsonl');
  const base = modelsEntry('2026-07-12T01:00:00.000Z');
  try {
    writeEntries(file, [base, marker('2026-07-12T01:03:00.000Z')]);

    const historical = readLogFile(file);
    assert.equal(historical.length, 2);
    assert.equal(historical[1].url, base.url);
    assert.deepEqual(historical[1].response.body, base.response.body);

    const streamed = [];
    await streamRawEntriesAsync(file, raw => streamed.push(JSON.parse(raw)));
    assert.equal(streamed.length, 2);
    assert.equal(streamed[1].url, base.url);
    assert.deepEqual(streamed[1].response.body, base.response.body);

    const paged = readPagedEntries(file, { before: '2026-07-12T02:00:00.000Z', limit: 10 });
    assert.equal(paged.entries.length, 2);
    assert.equal(JSON.parse(paged.entries[1]).url, base.url);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
