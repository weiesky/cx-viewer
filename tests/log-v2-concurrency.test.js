import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { inspectSessionArchive } from '../lib/log-v2/inspect.js';
import { materializeSessionArchive } from '../lib/log-v2/materializer.js';

function runWriter(source, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`writer exited ${code}: ${stderr || stdout}`));
    });
  });
}

test('multiple processes serialize concurrent threads into one gap-free session timeline', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-process-stress-'));
  try {
    const writerUrl = pathToFileURL(fileURLToPath(new URL('../lib/log-v2/writer.js', import.meta.url))).href;
    const identityUrl = pathToFileURL(fileURLToPath(new URL('../lib/log-v2/identity.js', import.meta.url))).href;
    const workers = 4;
    const eventsPerWorker = 12;
    const jobs = [];
    for (let worker = 0; worker < workers; worker++) {
      jobs.push(runWriter(`
        const { LogV2Writer } = await import(${JSON.stringify(writerUrl)});
        const { resolveAppServerThreadIdentity } = await import(${JSON.stringify(identityUrl)});
        const worker = ${worker};
        const writer = LogV2Writer.open({
          rootDir: ${JSON.stringify(root)}, projectId: 'project', canonicalCwd: '/workspace/project',
          sessionId: 'stress-session', rootThreadId: 'stress-session',
          createdAt: '2026-07-14T00:00:00.000Z', durability: 'buffered',
        });
        const threadId = worker === 0 ? 'stress-session' : 'child-' + worker;
        const identity = resolveAppServerThreadIdentity({
          id: threadId, sessionId: 'stress-session',
          ...(worker === 0 ? {} : { parentThreadId: 'stress-session' }),
        });
        for (let index = 0; index < ${eventsPerWorker}; index++) {
          writer.append({
            timestamp: new Date(Date.UTC(2026, 6, 14, worker, 0, index)).toISOString(),
            url: 'codex://stress/' + worker + '/' + index,
            body: { input: [{ type: 'message', text: worker + ':' + index }] },
            response: { status: 200, headers: {}, body: { worker, index } },
          }, identity);
        }
      `, root));
    }
    await Promise.all(jobs);
    // Discover through the deterministic project/session structure created by the writers.
    const { discoverV2SessionArchives } = await import('../lib/log-v2/materializer.js');
    const discovery = discoverV2SessionArchives(root, { projectId: 'project' });
    assert.equal(discovery.errors.length, 0);
    assert.equal(discovery.archives.length, 1);
    const sessionDir = discovery.archives[0].sessionDir;
    const report = inspectSessionArchive(sessionDir);
    assert.equal(report.ok, true, JSON.stringify(report));
    assert.equal(report.committedEvents, workers * eventsPerWorker);
    assert.equal(report.threadCount, workers);
    const materialized = materializeSessionArchive(sessionDir);
    assert.deepEqual(materialized.records.map((record) => record.seq),
      Array.from({ length: workers * eventsPerWorker }, (_, index) => index + 1));
    assert.equal(new Set(materialized.entries.map((entry) => entry.url)).size, workers * eventsPerWorker);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
