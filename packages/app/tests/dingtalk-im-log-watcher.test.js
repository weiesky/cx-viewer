import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createDingTalkImLogWatcher } from '../lib/dingtalk-im-log-watcher.js';
import { projectArchiveDirectoryName } from '../lib/log-v2/identity.js';

async function until(predicate) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail('IM log watcher did not invalidate');
    await delay(20);
  }
}

test('real native IM watcher follows first archive, nested shards and new sessions without watching unrelated data', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-im-watch-'));
  const changes = [];
  const watcher = createDingTalkImLogWatcher({ getLogDir: () => root, getWorkerDir: () => join(root, 'IM_dingtalk'), onChange: id => changes.push(id), debounceMs: 20 });
  try {
    watcher.ensure(); watcher.ensure();
    writeFileSync(join(root, 'credentials.json'), '{}');
    await delay(80); assert.equal(changes.length, 0);
    const project = join(root, projectArchiveDirectoryName('IM_dingtalk'));
    const session = join(project, '20261123_worker.cxvsession');
    mkdirSync(session, { recursive: true });
    writeFileSync(join(session, 'timeline.jsonl'), '{}\n');
    await until(() => changes.length > 0);
    await delay(60); const previous = changes.length;
    const part = join(session, 'parts', '1'); mkdirSync(part, { recursive: true });
    writeFileSync(join(part, 'timeline.jsonl'), '{}\n');
    await until(() => changes.length > previous);
    await delay(60); const beforeNew = changes.length;
    const next = join(project, '20261123_next.cxvsession'); mkdirSync(next);
    writeFileSync(join(next, 'manifest.json'), '{}\n');
    await until(() => changes.length > beforeNew);
    await delay(60); watcher.dispose(); const stopped = changes.length;
    writeFileSync(join(next, 'timeline.jsonl'), '{}\n');
    await delay(100); assert.equal(changes.length, stopped);
    assert.ok(changes.every(id => id === 'dingtalk'));
  } finally { watcher.dispose(); rmSync(root, { recursive: true, force: true }); }
});
