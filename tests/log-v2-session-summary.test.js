import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  projectArchiveDirectoryName,
  resolveAppServerThreadIdentity,
  sessionArchiveDirectoryName,
} from '../lib/log-v2/identity.js';
import {
  SESSION_SUMMARY_FILE,
  applyRootInputSnapshot,
  createSessionSummaryState,
  directoryLogicalBytes,
  projectPromptItemForSummary,
  readSessionSummary,
  rebuildSessionSummary,
} from '../lib/log-v2/session-summary.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { summarizeV2SessionArchive } from '../lib/log-v2/materializer.js';

function user(text, id = undefined) {
  return {
    type: 'message',
    role: 'user',
    ...(id ? { id } : {}),
    content: [{ type: 'input_text', text }],
  };
}

function entry(timestamp, input, turnId) {
  return {
    timestamp,
    url: 'https://chatgpt.com/backend-api/codex/responses',
    method: 'POST',
    body: { input, metadata: { turn_id: turnId } },
    response: { status: 200, headers: {}, body: { content: [] } },
  };
}

function writerOptions(rootDir) {
  return {
    rootDir,
    projectId: 'summary-project',
    canonicalCwd: '/workspace/summary-project',
    sessionId: 'summary-session',
    rootThreadId: 'summary-session',
    createdAt: '2026-07-15T08:00:00.000Z',
    durability: 'buffered',
  };
}

test('summary prompt projection keeps user text while dropping synthetic chrome and image sources', () => {
  assert.equal(projectPromptItemForSummary({ role: 'developer', content: 'developer secret' }), null);
  assert.equal(projectPromptItemForSummary({ role: 'assistant', content: 'assistant output' }), null);
  assert.equal(projectPromptItemForSummary({ role: 'user', type: 'function_call_output', content: 'tool output' }), null);
  assert.equal(projectPromptItemForSummary({
    role: 'user',
    content: '<environment_context><cwd>/private/work</cwd></environment_context>',
  }), null);

  const text = projectPromptItemForSummary(user('  visible user request  ', 'prompt-1'));
  assert.equal(text.text, 'visible user request');
  assert.equal(typeof text.fingerprint, 'string');
  assert.equal(text.fingerprint.length > 0, true);

  const remoteSource = 'https://private.example.invalid/path/secret-image-token.png';
  const image = projectPromptItemForSummary({
    role: 'user',
    type: 'message',
    content: [{ type: 'input_image', image_url: remoteSource }],
  });
  assert.ok(image, 'an image-only user prompt should retain a harmless overview placeholder');
  assert.equal(typeof image.text, 'string');
  assert.equal(image.text.length > 0, true);
  assert.equal(JSON.stringify(image).includes(remoteSource), false);
  assert.equal(JSON.stringify(image).includes('secret-image-token'), false);

  const inlineSource = 'data:image/png;base64,c2VjcmV0LWltYWdlLWJ5dGVz';
  const inline = projectPromptItemForSummary({
    role: 'user',
    type: 'message',
    content: [{ type: 'input_image', image_url: inlineSource }],
  });
  assert.ok(inline);
  assert.equal(JSON.stringify(inline).includes(inlineSource), false);
  assert.equal(JSON.stringify(inline).includes('c2VjcmV0'), false);
});

test('root input revisions preserve real duplicate sends but ignore cumulative and compaction replay', () => {
  const state = createSessionSummaryState({
    sessionId: 'summary-session',
    rootThreadId: 'summary-session',
  });
  applyRootInputSnapshot(state, [user('same')]);
  assert.deepEqual(state.userPrompts.map(prompt => prompt.text), ['same']);
  assert.equal(state.activeRootInput.length, 1);

  // An in-progress/finalized frame commonly repeats the same cumulative input.
  applyRootInputSnapshot(state, [user('same')]);
  assert.deepEqual(state.userPrompts.map(prompt => prompt.text), ['same']);

  // A second identical item in the cumulative input is a real second send.
  applyRootInputSnapshot(state, [user('same'), user('same')]);
  assert.deepEqual(state.userPrompts.map(prompt => prompt.text), ['same', 'same']);
  assert.equal(state.activeRootInput.length, 2);
  applyRootInputSnapshot(state, [user('same'), user('same')]);
  assert.deepEqual(state.userPrompts.map(prompt => prompt.text), ['same', 'same']);

  applyRootInputSnapshot(state, [user('same'), user('same'), user('two'), user('three')]);
  assert.deepEqual(state.userPrompts.map(prompt => prompt.text), ['same', 'same', 'two', 'three']);

  // Context compaction can replay a retained suffix as a shorter new snapshot.
  applyRootInputSnapshot(state, [user('two'), user('three')]);
  assert.deepEqual(state.userPrompts.map(prompt => prompt.text), ['same', 'same', 'two', 'three']);
  assert.equal(state.activeRootInput.length, 2);

  applyRootInputSnapshot(state, [user('two'), user('three'), user('four')]);
  assert.deepEqual(state.userPrompts.map(prompt => prompt.text), ['same', 'same', 'two', 'three', 'four']);
  assert.equal(state.activeRootInput.length, 3);
});

test('distinct turns preserve an identical non-cumulative user prompt', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-repeat-turn-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    const identity = resolveAppServerThreadIdentity({ id: 'summary-session', sessionId: 'summary-session' });
    writer.append(entry('2026-07-15T08:01:00.000Z', [user('repeat')], 'turn-one'), identity);
    writer.append(entry('2026-07-15T08:02:00.000Z', [user('repeat')], 'turn-two'), identity);
    assert.deepEqual(
      readSessionSummary(writer.sessionDir).userPrompts.map(prompt => prompt.text),
      ['repeat', 'repeat'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('distinct turns preserve identical prompts when only system input changes', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-repeat-system-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    const identity = resolveAppServerThreadIdentity({ id: 'summary-session', sessionId: 'summary-session' });
    writer.append(entry('2026-07-15T08:01:00.000Z', [
      { type: 'message', role: 'developer', content: 'system A' }, user('repeat'),
    ], 'turn-one'), identity);
    writer.append(entry('2026-07-15T08:02:00.000Z', [
      { type: 'message', role: 'developer', content: 'system B' }, user('repeat'),
    ], 'turn-two'), identity);
    const live = readSessionSummary(writer.sessionDir);
    assert.deepEqual(live.userPrompts.map(prompt => prompt.text), ['repeat', 'repeat']);
    const rebuilt = rebuildSessionSummary(writer.sessionDir);
    assert.deepEqual(rebuilt.userPrompts.map(prompt => prompt.text), ['repeat', 'repeat']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rebuild writes root-thread prompts and an exact fixed-point logical directory size', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-rebuild-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    const rootIdentity = resolveAppServerThreadIdentity({
      id: 'summary-session',
      sessionId: 'summary-session',
    });
    const childIdentity = resolveAppServerThreadIdentity({
      id: 'child-thread',
      sessionId: 'summary-session',
      parentThreadId: 'summary-session',
    });
    const secretImage = 'https://private.example.invalid/root/source-must-not-leak.png';
    writer.append(entry('2026-07-15T08:01:00.000Z', [
      { role: 'developer', content: 'not a user prompt' },
      { role: 'user', content: '<environment_context><cwd>/secret</cwd></environment_context>' },
      user('root request'),
      { role: 'user', type: 'message', content: [{ type: 'input_image', image_url: secretImage }] },
    ], 'turn-root'), rootIdentity);
    writer.append(entry(
      '2026-07-15T08:02:00.000Z',
      [user('child instruction')],
      'turn-child',
    ), childIdentity);

    const live = readSessionSummary(writer.sessionDir);
    assert.equal(live.throughSeq, 2);
    assert.equal(live.userPrompts.some(prompt => prompt.text === 'root request'), true);
    assert.equal(live.userPrompts.some(prompt => prompt.text === 'child instruction'), false);
    assert.equal(live.archiveBytes, directoryLogicalBytes(writer.sessionDir));

    const rebuilt = rebuildSessionSummary(writer.sessionDir);
    const persisted = readSessionSummary(writer.sessionDir);
    assert.deepEqual(persisted, rebuilt);
    assert.equal(persisted.throughSeq, 2);
    assert.equal(persisted.userPrompts.some(prompt => prompt.text === 'root request'), true);
    assert.equal(persisted.userPrompts.some(prompt => prompt.text === 'child instruction'), false);
    assert.equal(JSON.stringify(persisted).includes(secretImage), false);
    assert.equal(JSON.stringify(persisted).includes('source-must-not-leak'), false);
    assert.equal(persisted.activeRootInput.filter(item => item.promptOccurrenceId).length, 2);
    assert.equal(persisted.archiveBytes, directoryLogicalBytes(writer.sessionDir));

    // Ephemeral writer artifacts and symlinks are outside the logical archive size.
    writeFileSync(join(writer.sessionDir, '.append.lock'), 'transient lock owner');
    writeFileSync(join(writer.sessionDir, `${SESSION_SUMMARY_FILE}.tmp-123-test`), 'temporary replacement');
    const outside = join(root, 'outside.txt');
    writeFileSync(outside, 'outside bytes must never be followed');
    symlinkSync(outside, join(writer.sessionDir, 'outside-link'));
    assert.equal(directoryLogicalBytes(writer.sessionDir), persisted.archiveBytes);

    const serializedBytes = Buffer.byteLength(readFileSync(
      join(writer.sessionDir, SESSION_SUMMARY_FILE),
      'utf8',
    ));
    assert.equal(serializedBytes > 0, true);
    assert.equal(persisted.archiveBytes >= serializedBytes, true, 'summary must include its own fixed-point bytes');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('readSessionSummary distinguishes a missing cache from malformed or invalid metadata', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-invalid-'));
  try {
    const missing = join(root, 'missing.cxvsession');
    mkdirSync(missing);
    assert.equal(readSessionSummary(missing), null);

    writeFileSync(join(missing, SESSION_SUMMARY_FILE), '{not-json');
    assert.throws(() => readSessionSummary(missing));

    writeFileSync(join(missing, SESSION_SUMMARY_FILE), JSON.stringify({
      kind: 'not-a-session-summary',
      version: 1,
      throughSeq: 0,
      timelineBytes: 0,
      archiveBytes: 0,
      userPrompts: [],
      rootInputFingerprints: [],
    }));
    assert.throws(() => readSessionSummary(missing));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer invalidates derived size after a pre-commit orphan and rebuilds it on restart', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-orphan-'));
  try {
    const crashing = LogV2Writer.open({
      ...writerOptions(root),
      faultInjector(stage) {
        if (stage === 'entry-persisted') throw new Error('pre-commit fault');
      },
    });
    const identity = resolveAppServerThreadIdentity({ id: 'summary-session', sessionId: 'summary-session' });
    assert.throws(() => crashing.append(entry(
      '2026-07-15T08:01:00.000Z',
      [user('orphaned before commit')],
      'turn-orphan',
    ), identity), /pre-commit fault/);
    assert.equal(readSessionSummary(crashing.sessionDir), null);

    const restarted = LogV2Writer.open(writerOptions(root));
    const rebuilt = readSessionSummary(restarted.sessionDir);
    assert.equal(rebuilt.throughSeq, 0);
    assert.deepEqual(rebuilt.userPrompts, []);
    assert.equal(rebuilt.archiveBytes, directoryLogicalBytes(restarted.sessionDir));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a hard process death cannot leave a fresh-looking undersized summary', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-sigkill-'));
  try {
    const writerUrl = new URL('../lib/log-v2/writer.js', import.meta.url).href;
    const identityUrl = new URL('../lib/log-v2/identity.js', import.meta.url).href;
    const script = `
      import { LogV2Writer } from ${JSON.stringify(writerUrl)};
      import { resolveAppServerThreadIdentity } from ${JSON.stringify(identityUrl)};
      const writer = LogV2Writer.open({
        rootDir: ${JSON.stringify(root)}, projectId: 'summary-project',
        canonicalCwd: '/workspace/summary-project', sessionId: 'summary-session',
        rootThreadId: 'summary-session', createdAt: '2026-07-15T08:00:00.000Z',
        durability: 'buffered',
        faultInjector(stage) { if (stage === 'entry-persisted') process.kill(process.pid, 'SIGKILL'); },
      });
      writer.append({
        timestamp: '2026-07-15T08:01:00.000Z', url: 'https://chatgpt.com/backend-api/codex/responses',
        method: 'POST', body: { input: [{ type: 'message', role: 'user', content: 'killed' }] },
        response: { status: 200, headers: {}, body: { content: [] } },
      }, resolveAppServerThreadIdentity({ id: 'summary-session', sessionId: 'summary-session' }));
    `;
    const killed = spawnSync(process.execPath, ['--input-type=module', '-e', script]);
    assert.equal(killed.signal, 'SIGKILL');

    const sessionDir = join(
      root,
      projectArchiveDirectoryName('summary-project'),
      sessionArchiveDirectoryName({
        sessionId: 'summary-session',
        createdAt: '2026-07-15T08:00:00.000Z',
      }),
    );
    assert.equal(readSessionSummary(sessionDir), null);

    const restarted = LogV2Writer.open(writerOptions(root));
    const rebuilt = readSessionSummary(restarted.sessionDir);
    assert.equal(rebuilt.throughSeq, 0);
    assert.equal(rebuilt.archiveBytes, directoryLogicalBytes(restarted.sessionDir));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a fault after the timeline commit leaves a rebuildable canonical prompt', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-postcommit-'));
  try {
    const crashing = LogV2Writer.open({
      ...writerOptions(root),
      faultInjector(stage) {
        if (stage === 'timeline-committed') throw new Error('post-commit fault');
      },
    });
    const identity = resolveAppServerThreadIdentity({ id: 'summary-session', sessionId: 'summary-session' });
    assert.throws(() => crashing.append(entry(
      '2026-07-15T08:01:00.000Z',
      [user('committed prompt')],
      'turn-committed',
    ), identity), /post-commit fault/);
    assert.equal(readSessionSummary(crashing.sessionDir), null);

    const restarted = LogV2Writer.open(writerOptions(root));
    const rebuilt = readSessionSummary(restarted.sessionDir);
    assert.equal(rebuilt.throughSeq, 1);
    assert.deepEqual(rebuilt.userPrompts.map(prompt => prompt.text), ['committed prompt']);
    assert.equal(rebuilt.archiveBytes, directoryLogicalBytes(restarted.sessionDir));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('log-picker metadata repairs a malformed derived summary', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-picker-repair-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    const identity = resolveAppServerThreadIdentity({ id: 'summary-session', sessionId: 'summary-session' });
    writer.append(entry(
      '2026-07-15T08:01:00.000Z',
      [user('repair me')],
      'turn-repair',
    ), identity);
    writeFileSync(join(writer.sessionDir, SESSION_SUMMARY_FILE), '{broken');

    const listed = summarizeV2SessionArchive(writer.sessionDir);
    assert.deepEqual(listed.previews, ['repair me']);
    assert.equal(listed.archiveBytes, directoryLogicalBytes(writer.sessionDir));
    assert.equal(readSessionSummary(writer.sessionDir).throughSeq, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('log-picker folder size includes an incomplete canonical timeline tail', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-v2-summary-tail-size-'));
  try {
    const writer = LogV2Writer.open(writerOptions(root));
    const identity = resolveAppServerThreadIdentity({ id: 'summary-session', sessionId: 'summary-session' });
    writer.append(entry('2026-07-15T08:01:00.000Z', [user('tail')], 'turn-tail'), identity);
    appendFileSync(join(writer.sessionDir, 'timeline.jsonl'), '{"partial":');
    const listed = summarizeV2SessionArchive(writer.sessionDir);
    assert.equal(listed.ignoredTailBytes, 11);
    assert.equal(listed.archiveBytes, directoryLogicalBytes(writer.sessionDir));

    const restarted = LogV2Writer.open(writerOptions(root));
    assert.equal(restarted.recovery.repairedTimeline, true);
    assert.equal(readSessionSummary(restarted.sessionDir).archiveBytes, directoryLogicalBytes(restarted.sessionDir));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
