import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { readLocalLog } from '../lib/log-management.js';
import { readPagedEntries, streamRawEntriesAsync } from '../lib/log-stream.js';
import { readLogFile } from '../lib/log-watcher.js';
import { dedupeMaterializedEntries } from '../lib/log-v2/materializer.js';

function entry(timestamp, output) {
  return {
    timestamp,
    url: 'codex://event/order',
    method: 'POST',
    body: { input: [] },
    response: { status: 200, body: { output } },
    mainAgent: false,
  };
}

test('all history readers place a replacement at its latest commit position', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-log-order-'));
  try {
    const file = join(root, 'history.jsonl');
    const first = entry('2026-07-01T00:01:00.000Z', 'first');
    const between = entry('2026-07-01T00:02:00.000Z', 'between');
    const replacement = entry(first.timestamp, 'replacement');
    const last = entry('2026-07-01T00:03:00.000Z', 'last');
    const physical = [first, between, replacement, last];
    writeFileSync(file, physical.map((value) => `${JSON.stringify(value)}\n---\n`).join(''));

    const expected = ['between', 'replacement', 'last'];
    assert.deepEqual(readLogFile(file).map((value) => value.response.body.output), expected);
    assert.deepEqual(readLocalLog(root, basename(file)).map((value) => value.response.body.output), expected);
    assert.deepEqual(
      dedupeMaterializedEntries(physical).map((value) => value.response.body.output),
      expected,
    );

    const streamed = [];
    const streamResult = await streamRawEntriesAsync(file, (raw) => streamed.push(JSON.parse(raw)));
    assert.equal(streamResult.totalCount, 3);
    assert.deepEqual(streamed.map((value) => value.response.body.output), expected);

    const paged = readPagedEntries(file, {
      before: '2026-07-01T00:04:00.000Z',
      limit: 10,
    });
    assert.deepEqual(
      paged.entries.map((raw) => JSON.parse(raw).response.body.output),
      expected,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
