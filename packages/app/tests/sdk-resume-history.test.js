import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { resolveIngestionSourceIdentity } from '../lib/log-v2/identity.js';
import { sdkToJSONLEntry } from '../lib/sdk-adapter.js';
import { readSdkResumeHistory, resolveSdkCliResume } from '../lib/sdk-resume-history.js';

async function fixture(run, { source = 'sdk', threadId = 'thread-native' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-resume-history-'));
  const view = { cwd: '/workspace/a/same', projectId: 'same' };
  const writer = LogV2Writer.open({ rootDir: root, canonicalCwd: view.cwd, projectId: view.projectId,
    sessionId: threadId, rootThreadId: threadId, source, createdAt: '2026-11-18T00:00:00.000Z' });
  const timeline = join(writer.sessionDir, 'timeline.jsonl');
  const file = relative(root, timeline).split(sep).join('/');
  let turn = 0;
  const append = (input, text, { status = 200, cwd = view.cwd } = {}) => {
    const entry = sdkToJSONLEntry({ message: { content: [{ type: 'text', text }] } }, input, 'test-model', 'same', {
      timestamp: `2026-11-18T00:00:${String(++turn).padStart(2, '0')}.000Z`, threadId, cwd, status,
    });
    writer.append(entry, resolveIngestionSourceIdentity(entry, { source, threadId, sessionId: threadId }));
  };
  try { await run({ root, view, timeline, file, append }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test('resume reconstructs cumulative input and the final assistant response without writing history', async () => fixture(async f => {
  const first = { role: 'user', content: 'first task' };
  f.append([first], 'first answer');
  const input = [first, { role: 'assistant', content: [{ type: 'text', text: 'first answer' }] },
    { role: 'user', content: 'second task' }];
  f.append(input, 'second answer');
  const bytes = readFileSync(f.timeline);
  const result = await readSdkResumeHistory(f.root, f.file, f.view);
  assert.equal(result.threadId, 'thread-native');
  assert.deepEqual(result.messages, [...input, { role: 'assistant', content: [{ type: 'text', text: 'second answer' }] }]);
  assert.deepEqual(readFileSync(f.timeline), bytes);
}));

test('synthetic error feedback never becomes a model assistant message on resume', async () => fixture(async f => {
  const input = [{ role: 'user', content: 'interrupted task' }];
  f.append(input, 'Error: interrupted', { status: 500 });
  assert.deepEqual((await readSdkResumeHistory(f.root, f.file, f.view)).messages, input);
}));

test('CLI resume selects only SDK history and refuses an unavailable latest pointer instead of an older archive', async () => fixture(async f => {
  f.append([{ role: 'user', content: 'task' }], 'answer');
  assert.equal(await resolveSdkCliResume(f.root, ['new task'], f.view), null);
  assert.deepEqual(await resolveSdkCliResume(f.root, ['resume'], f.view), { selector: 'picker' });
  assert.equal((await resolveSdkCliResume(f.root, ['resume', 'thread-native'], f.view)).file, f.file);
  assert.equal((await resolveSdkCliResume(f.root, ['resume', '--last'], f.view)).file, f.file);
  const projectFile = join(f.timeline, '..', '..', 'project.json');
  const project = JSON.parse(readFileSync(projectFile, 'utf8'));
  writeFileSync(projectFile, JSON.stringify({ ...project, latestSessionId: 'missing-thread' }));
  const before = readFileSync(projectFile);
  await assert.rejects(resolveSdkCliResume(f.root, ['resume', '--last'], f.view), { code: 'SDK_RESUME_UNAVAILABLE' });
  assert.deepEqual(readFileSync(projectFile), before);
  assert.equal((await resolveSdkCliResume(f.root, ['resume', 'thread-native'], f.view)).file, f.file,
    'explicit IDs do not depend on the latest pointer');
}));

test('same-name sibling histories and forged entry identity refuse resume', async () => fixture(async f => {
  f.append([{ role: 'user', content: 'task' }], 'answer', { cwd: '/workspace/b/same' });
  await assert.rejects(readSdkResumeHistory(f.root, f.file, { ...f.view, cwd: '/workspace/b/same' }), { code: 'SDK_RESUME_SCOPE_MISMATCH' });
  await assert.rejects(readSdkResumeHistory(f.root, f.file, { ...f.view, projectId: 'other' }), { code: 'SDK_RESUME_SCOPE_MISMATCH' });
  await assert.rejects(readSdkResumeHistory(f.root, f.file, f.view), { code: 'SDK_RESUME_IDENTITY_MISMATCH' });
}));

test('partial and corrupt timelines are refused and retained byte for byte', async () => fixture(async f => {
  f.append([{ role: 'user', content: 'task' }], 'answer');
  appendFileSync(f.timeline, '{"partial":');
  let bytes = readFileSync(f.timeline);
  await assert.rejects(readSdkResumeHistory(f.root, f.file, f.view), { code: 'CXV_LOG_V2_INCOMPLETE' });
  assert.deepEqual(readFileSync(f.timeline), bytes);
  appendFileSync(f.timeline, 'broken}\n');
  bytes = readFileSync(f.timeline);
  await assert.rejects(readSdkResumeHistory(f.root, f.file, f.view), { code: 'CXV_LOG_V2_CORRUPT' });
  assert.deepEqual(readFileSync(f.timeline), bytes);
}));

test('non-SDK archives, synthetic threads and CLI option-shaped identities cannot resume', async () => {
  for (const options of [{ source: 'proxy' }, { threadId: 'synthetic:sdk:unknown' }, { threadId: '--last' }, { threadId: 'bad\nid' }]) {
    await fixture(async f => {
      f.append([{ role: 'user', content: 'task' }], 'answer');
      await assert.rejects(readSdkResumeHistory(f.root, f.file, f.view), { code: 'SDK_RESUME_UNAVAILABLE' });
    }, options);
  }
});

test('modern SDK resume preserves Viewer-only feedback and canonical display timestamps without rewriting history', async () => fixture(async f => {
  const input = [{ role: 'user', content: 'interrupted task', _sdkTimestamp: '2026-11-18T00:00:01.000Z' }];
  f.append(input, 'Error: interrupted', { status: 500 });
  const bytes = readFileSync(f.timeline);
  const history = await readSdkResumeHistory(f.root, f.file, f.view);
  assert.deepEqual(history.messages, [...input, { role: 'assistant', content: [{ type: 'text', text: 'Error: interrupted' }],
    _sdkTimestamp: '2026-11-18T00:00:01.000Z', _sdkFeedback: true }]);
  assert.deepEqual(readFileSync(f.timeline), bytes);
}));
