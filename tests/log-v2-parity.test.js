import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { deleteLogFiles, readLocalLog } from '../lib/log-management.js';
import { sanitizeEntryForV2 } from '../lib/log-v2/entry-codec.js';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import {
  findV2SessionFileByLegacyLog,
  listV2LocalLogs,
  readV2LogEntries,
} from '../lib/log-v2/materializer.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

function wireEntry(timestamp, input, output) {
  return {
    timestamp,
    url: 'codex://event/parity',
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: { metadata: { turn_id: 'turn-parity' }, input },
    response: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { content: [{ type: 'text', text: output }] },
    },
    mainAgent: true,
  };
}

test('dual-written V1 and V2 fixtures materialize to identical safe event order and semantics', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-parity-'));
  try {
    const projectDir = join(root, 'project');
    mkdirSync(projectDir, { recursive: true });
    const v1File = join(projectDir, 'project_20260714_080000.jsonl');
    const relativeV1 = 'project/project_20260714_080000.jsonl';
    const first = wireEntry('2026-07-14T08:01:00.000Z', [{ type: 'message', text: 'hello' }], 'working');
    const completed = wireEntry('2026-07-14T08:01:00.000Z', [
      { type: 'message', text: 'hello' },
      { type: 'message', text: 'more context' },
    ], 'done');
    const next = wireEntry('2026-07-14T08:02:00.000Z', [{ type: 'message', text: 'next' }], 'next done');
    writeFileSync(v1File, [first, completed, next].map((value) => `${JSON.stringify(value)}\n---\n`).join(''));

    const writer = LogV2Writer.open({
      rootDir: root,
      projectId: 'project',
      canonicalCwd: '/workspace/project',
      sessionId: 'session-parity',
      rootThreadId: 'session-parity',
      createdAt: '2026-07-14T08:00:00.000Z',
    });
    const identity = resolveAppServerThreadIdentity({ id: 'session-parity', sessionId: 'session-parity' });
    let offset = 0;
    for (const value of [first, completed, next]) {
      const line = `${JSON.stringify(value)}\n---\n`;
      writer.append(value, identity, {
        legacyRef: { logFile: relativeV1, offset, length: Buffer.byteLength(line) },
      });
      offset += Buffer.byteLength(line);
    }

    const v2File = findV2SessionFileByLegacyLog(root, relativeV1);
    assert.ok(v2File);
    assert.deepEqual(readV2LogEntries(root, v2File), readLocalLog(root, relativeV1).map(sanitizeEntryForV2));
    assert.deepEqual(readV2LogEntries(root, v2File).map((value) => value.timestamp), [
      '2026-07-14T08:01:00.000Z',
      '2026-07-14T08:02:00.000Z',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('V2 session locators delete the validated archive rather than only its timeline', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-delete-'));
  try {
    const writer = LogV2Writer.open({
      rootDir: root,
      projectId: 'project',
      canonicalCwd: '/workspace/project',
      sessionId: 'session-delete',
      rootThreadId: 'session-delete',
      createdAt: '2026-07-14T08:00:00.000Z',
    });
    const identity = resolveAppServerThreadIdentity({ id: 'session-delete', sessionId: 'session-delete' });
    writer.append(wireEntry('2026-07-14T08:01:00.000Z', [], 'done'), identity);
    const file = listV2LocalLogs(root).project[0].file;
    assert.deepEqual(deleteLogFiles(root, [file]), [{ file, ok: true }]);
    assert.equal(existsSync(writer.sessionDir), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CXV_LOG_READ_MODE=v2 is accepted after restart and remains startup-scoped', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-restart-'));
  try {
    const interceptorUrl = pathToFileURL(fileURLToPath(new URL('../interceptor.js', import.meta.url))).href;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
      const mod = await import(${JSON.stringify(interceptorUrl)});
      console.log(JSON.stringify(mod.getLogV2RuntimeStatus().config));
      process.exit(0);
    `], {
      cwd: root,
      env: {
        ...process.env,
        CXV_TEST: '1',
        CXV_LOG_DIR: join(root, 'logs'),
        CXV_LOG_WRITE_MODE: 'v1',
        CXV_LOG_READ_MODE: 'v2',
      },
      encoding: 'utf8',
      timeout: 15_000,
    });
    assert.equal(child.status, 0, child.stderr);
    const config = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.equal(config.readMode, 'v2');
    assert.equal(config.writeMode, 'v1');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
