import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTEXT_COMPACTION_SUMMARY_LIMIT,
  extractCurrentContextCompaction,
  extractCurrentContextCompactionRecord,
  loadExcludedContextCompactionEpoch,
  saveExcludedContextCompactionEpoch,
} from '../src/utils/contextCompaction.js';
import { MAX_PROJECTED_TEXT_CHARS } from '../src/utils/userPromptContent.js';

function main(input, threadId = 'thread-current', extra = {}) {
  return {
    mainAgent: true,
    subAgent: false,
    body: {
      input,
      client_metadata: threadId ? { thread_id: threadId } : {},
    },
    ...extra,
  };
}

test('reports an encrypted-only compaction without exposing its payload', () => {
  const result = extractCurrentContextCompaction([
    main([{ type: 'message', role: 'user', content: 'hello' }, {
      type: 'compaction',
      encrypted_content: 'TOP_SECRET_CIPHERTEXT',
    }]),
  ]);

  assert.equal(result.present, true);
  assert.equal(result.count, 1);
  assert.equal(result.summary, null);
  assert.equal(result.truncated, false);
  assert.match(result.sourceKey, /^thread:thread-current:encrypted:t:21:/);
  assert.equal(JSON.stringify(result).includes('TOP_SECRET'), false);
});

test('projects every user prompt before the latest compaction and preserves images', () => {
  const result = extractCurrentContextCompactionRecord([main([
    { type: 'additional_tools', tools: [{ name: 'exec' }] },
    { type: 'message', role: 'system', content: 'system' },
    { type: 'message', role: 'user', id: 'u1', content: 'same' },
    { type: 'message', role: 'user', id: 'u2', content: 'same' },
    { type: 'compaction', id: 'compact-old', encrypted_content: 'old' },
    { type: 'message', role: 'user', id: 'u3', content: [
      { type: 'input_text', text: 'with image' },
      { type: 'input_image', image_url: '/tmp/cx-viewer-uploads/work.png' },
    ] },
    { type: 'compaction', id: 'compact-new', encrypted_content: 'new' },
    { type: 'message', role: 'user', content: 'after compaction' },
  ])]);

  assert.equal(result.sourceKey.endsWith(':id:compact-new'), true);
  assert.deepEqual(result.prompts.map(prompt => prompt.id), ['u1', 'u2', 'u3']);
  assert.deepEqual(result.prompts[2].segments[1], {
    type: 'image', sourceType: 'file', source: '/tmp/cx-viewer-uploads/work.png', alt: 'work.png',
  });
  assert.equal(JSON.stringify(result).includes('encrypted_content'), false);
  assert.equal(JSON.stringify(result).includes('after compaction'), false);
});

test('borrows one previous full snapshot only from the same conversation lane', () => {
  const previous = main([
    { type: 'message', role: 'user', content: 'first task' },
    { type: 'message', role: 'assistant', content: 'done' },
    { type: 'message', role: 'user', content: 'second task' },
  ], 'thread-a');
  const compacted = main([{ type: 'compaction', id: 'compact-a' }], 'thread-a');
  assert.deepEqual(
    extractCurrentContextCompactionRecord([previous, compacted]).prompts
      .map(prompt => prompt.segments[0].text),
    ['first task', 'second task'],
  );

  const otherThread = main([{ type: 'compaction', id: 'compact-b' }], 'thread-b');
  assert.deepEqual(extractCurrentContextCompactionRecord([previous, otherThread]).prompts, []);
});

test('merges a sparse direct prompt tail after the previous full snapshot', () => {
  const previous = main([
    { type: 'message', role: 'user', id: 'old-1', content: 'old one' },
    { type: 'message', role: 'user', id: 'old-2', content: 'old two' },
  ], 'thread-a');
  const compacted = main([
    { type: 'message', role: 'user', id: 'new-3', content: 'new three' },
    { type: 'compaction', id: 'compact-a' },
  ], 'thread-a');
  assert.deepEqual(
    extractCurrentContextCompactionRecord([previous, compacted]).prompts.map(prompt => prompt.id),
    ['old-1', 'old-2', 'new-3'],
  );
});

test('keeps a longer preserved projection when finalized direct input is its prefix', () => {
  const entry = main([
    { type: 'message', role: 'user', id: 'u1', content: 'one' },
    { type: 'message', role: 'user', id: 'u2', content: 'two' },
    { type: 'compaction', id: 'compact-prefix' },
  ], 'thread-a', {
    _contextCompaction: {
      present: true,
      count: 1,
      summary: null,
      truncated: false,
      sourceKey: 'thread-a:id:compact-prefix',
      prompts: [
        { id: 'u1', segments: [{ type: 'text', text: 'one' }] },
        { id: 'u2', segments: [{ type: 'text', text: 'two' }] },
        { id: 'u3', segments: [{ type: 'text', text: 'three' }] },
      ],
    },
  });
  assert.deepEqual(extractCurrentContextCompactionRecord([entry]).prompts.map(prompt => prompt.id), ['u1', 'u2', 'u3']);
});

test('reads a preserved prompt projection after the compaction input is slimmed', () => {
  const entry = main([], 'thread-a', {
    _slimmed: true,
    _contextCompaction: {
      present: true,
      count: 1,
      summary: null,
      truncated: false,
      sourceKey: 'thread-a:id:compact-a',
      prompts: [{ id: 'u1', segments: [{ type: 'text', text: 'preserved task' }] }],
    },
  });
  assert.equal(extractCurrentContextCompactionRecord([entry]).prompts[0].segments[0].text, 'preserved task');
});

test('rolls a preserved prompt projection into a later repeated direct marker', () => {
  const preserved = main([], 'thread-a', {
    _slimmed: true,
    _contextCompaction: {
      present: true,
      count: 1,
      summary: null,
      truncated: false,
      sourceKey: 'thread-a:id:compact-a',
      prompts: [{ segments: [{ type: 'text', text: 'rolled task' }] }],
    },
  });
  const repeated = main([{ type: 'compaction', id: 'compact-a' }], 'thread-a');
  assert.equal(
    extractCurrentContextCompactionRecord([preserved, repeated]).prompts[0].segments[0].text,
    'rolled task',
  );
});

test('does not attach a marker-less gap to an already repeated compaction', () => {
  const preserved = main([], 'thread-a', {
    _slimmed: true,
    _contextCompaction: {
      present: true,
      count: 1,
      summary: null,
      truncated: false,
      sourceKey: 'thread-a:id:compact-a',
      prompts: [{ id: 'old', segments: [{ type: 'text', text: 'old task' }] }],
    },
  });
  const gap = main([{ type: 'message', role: 'user', id: 'gap', content: 'gap task' }], 'thread-a');
  const repeated = main([{ type: 'compaction', id: 'compact-a' }], 'thread-a');
  assert.deepEqual(
    extractCurrentContextCompactionRecord([preserved, gap, repeated]).prompts.map(prompt => prompt.id),
    ['old'],
  );
});

test('small descriptor extraction does not inspect prompt content while collapsed', () => {
  const user = { type: 'message', role: 'user' };
  let reads = 0;
  Object.defineProperty(user, 'content', { get() { reads++; return 'must stay lazy'; } });
  assert.doesNotThrow(() => extractCurrentContextCompaction([main([
    user,
    { type: 'compaction' },
  ])]));
  assert.equal(reads, 0);
});

test('collapsed descriptor does not inspect checkpoint prompt payloads', () => {
  const block = { type: 'text' };
  let reads = 0;
  Object.defineProperty(block, 'text', {
    get() { reads++; return '<command-name>/clear</command-name>'; },
  });
  const checkpoint = main([
    { type: 'message', role: 'user', content: [block] },
    { type: 'compaction' },
  ], 'thread-a', { _isCheckpoint: true });
  assert.doesNotThrow(() => extractCurrentContextCompaction([checkpoint]));
  assert.equal(reads, 0);

  const user = { type: 'message', role: 'user' };
  Object.defineProperty(user, 'content', {
    get() { reads++; return [block]; },
  });
  const accessorCheckpoint = main([
    user,
    { type: 'compaction' },
  ], 'thread-a', { _isCheckpoint: true });
  assert.doesNotThrow(() => extractCurrentContextCompaction([accessorCheckpoint]));
  assert.equal(reads, 0);
});

test('does not borrow a post-clear checkpoint as compaction prompt history', () => {
  const clear = main([{
    type: 'message',
    role: 'user',
    content: [{ type: 'text', text: '<command-name>/clear</command-name>' }],
  }], 'thread-a', { _isCheckpoint: true });
  const compacted = main([{ type: 'compaction', id: 'compact-after-clear' }], 'thread-a');
  assert.deepEqual(extractCurrentContextCompactionRecord([clear, compacted]).prompts, []);
});

test('does not resurrect a preserved compaction attached to the clear checkpoint itself', () => {
  const beforeClear = main([{ type: 'compaction', id: 'compact-before-clear' }], 'thread-a');
  const clear = main([{
    type: 'message',
    role: 'user',
    content: [{ type: 'text', text: '<command-name>/clear</command-name>' }],
  }], 'thread-a', {
    _isCheckpoint: true,
    _contextCompaction: {
      present: true,
      count: 1,
      summary: 'stale',
      truncated: false,
      sourceKey: 'thread-a:id:compact-before-clear',
      prompts: [{ id: 'old', segments: [{ type: 'text', text: 'old task' }] }],
    },
  });
  const afterClear = main([{ type: 'message', role: 'user', content: 'fresh task' }], 'thread-a');

  assert.equal(extractCurrentContextCompaction([beforeClear, clear, afterClear]).present, false);
  assert.deepEqual(extractCurrentContextCompactionRecord([beforeClear, clear, afterClear]).prompts, []);
});

test('a repeated marker never borrows user prompts that occur after that marker', () => {
  const previous = main([
    { type: 'message', role: 'user', id: 'before', content: 'included work' },
    { type: 'compaction', id: 'compact-repeat' },
    { type: 'message', role: 'user', id: 'after', content: 'not in compacted work' },
  ], 'thread-a');
  const repeated = main([{ type: 'compaction', id: 'compact-repeat' }], 'thread-a');
  assert.deepEqual(
    extractCurrentContextCompactionRecord([previous, repeated]).prompts.map(prompt => prompt.id),
    ['before'],
  );
});

test('prompt history crosses mixed session-id and thread-only frames in the same lane', () => {
  const threadOnly = main([
    { type: 'message', role: 'user', id: 'mixed', content: 'same conversation' },
  ], 'thread-a');
  const sessionFrame = main([{ type: 'compaction', id: 'compact-mixed' }], 'thread-a');
  sessionFrame.body.metadata = { session_id: 'session-a' };
  assert.deepEqual(
    extractCurrentContextCompactionRecord([threadOnly, sessionFrame]).prompts.map(prompt => prompt.id),
    ['mixed'],
  );
});

test('user-id changes are hard prompt-history boundaries even within one thread', () => {
  const firstUser = main([
    { type: 'message', role: 'user', id: 'private-a', content: 'account A work' },
  ], 'thread-shared');
  firstUser.body.metadata = { user_id: 'account-a' };
  const secondUser = main([{ type: 'compaction', id: 'compact-account-b' }], 'thread-shared');
  secondUser.body.metadata = { user_id: 'account-b' };
  assert.deepEqual(extractCurrentContextCompactionRecord([firstUser, secondUser]).prompts, []);
});

test('source identity ignores internal splits but isolates authoritative sessions on one thread', () => {
  const first = main([{ type: 'compaction' }], 'thread-shared', { _sessionId: 'internal-a' });
  first._contextCompaction = extractCurrentContextCompactionRecord([first]);
  const split = main([{ type: 'compaction' }], 'thread-shared', { _sessionId: 'internal-b' });
  assert.equal(
    first._contextCompaction.sourceKey,
    extractCurrentContextCompactionRecord([first, split]).sourceKey,
  );

  const sessionA = main([{ type: 'compaction' }], 'thread-shared');
  sessionA.body.metadata = { session_id: 'session-a', thread_id: 'thread-shared' };
  const sessionB = main([{ type: 'compaction' }], 'thread-shared');
  sessionB.body.metadata = { session_id: 'session-b', thread_id: 'thread-shared' };
  assert.notEqual(
    extractCurrentContextCompactionRecord([sessionA]).sourceKey,
    extractCurrentContextCompactionRecord([sessionB]).sourceKey,
  );
});

test('OTel usage mirrors never replace the real compaction anchor', () => {
  const marker = main([{ type: 'compaction', id: 'compact-real' }], 'thread-a');
  const otelTail = {
    mainAgent: true,
    _otelSource: true,
    url: 'codex://api/request',
    body: { model: 'gpt-test' },
  };
  assert.equal(extractCurrentContextCompaction([marker, otelTail]).present, true);
  assert.match(extractCurrentContextCompaction([marker, otelTail]).sourceKey, /compact-real/);

  const laterFrame = main([], 'thread-a');
  const afterLaterFrame = extractCurrentContextCompaction([marker, otelTail, laterFrame]);
  assert.equal(afterLaterFrame.present, true);
  assert.match(afterLaterFrame.sourceKey, /compact-real/);
});

test('distinct id-less compactions get distinct disclosure generations', () => {
  const first = main([
    { type: 'message', role: 'user', content: 'first task' },
    { type: 'compaction' },
  ], 'thread-a');
  const second = main([
    { type: 'message', role: 'user', content: 'second task' },
    { type: 'compaction' },
  ], 'thread-a');
  assert.notEqual(
    extractCurrentContextCompaction([first]).sourceKey,
    extractCurrentContextCompaction([first, second]).sourceKey,
  );
});

test('id-less compaction repeats inherit a captured generation but restart after a real gap', () => {
  const first = main([
    { type: 'message', role: 'user', id: 'old', content: 'same task' },
    { type: 'compaction' },
  ], 'thread-a', { timestamp: '2026-01-01T00:00:00.000Z' });
  first._contextCompaction = extractCurrentContextCompactionRecord([first]);

  const repeated = main([
    { type: 'message', role: 'user', content: 'same task' },
    { type: 'compaction' },
  ], 'thread-a', { timestamp: '2026-01-01T00:00:01.000Z' });
  assert.equal(
    extractCurrentContextCompaction([first, repeated]).sourceKey,
    first._contextCompaction.sourceKey,
  );

  const sharedTimestamp = '2026-01-01T00:00:00.000Z';
  const gap = main([{
    type: 'message', role: 'user', id: 'gap', content: 'later work',
  }], 'thread-a', { timestamp: sharedTimestamp });
  const next = main([
    { type: 'message', role: 'user', id: 'new', content: 'same task' },
    { type: 'compaction' },
  ], 'thread-a', { timestamp: sharedTimestamp });
  assert.notEqual(
    extractCurrentContextCompaction([first, gap, next]).sourceKey,
    first._contextCompaction.sourceKey,
  );
  assert.deepEqual(
    extractCurrentContextCompactionRecord([first, gap, next]).prompts.map(prompt => prompt.id),
    ['old', 'gap', 'new'],
  );
});

test('middle-only differences in long prompt snapshots are never merged away', () => {
  const head = 'a'.repeat(1024);
  const tail = 'b'.repeat(1024);
  const previous = main([{
    type: 'message', role: 'user', content: `${head}X${tail}`,
  }], 'thread-a');
  const compacted = main([
    { type: 'message', role: 'user', content: `${head}Y${tail}` },
    { type: 'compaction', id: 'compact-long-middle' },
  ], 'thread-a');
  assert.equal(extractCurrentContextCompactionRecord([previous, compacted]).prompts.length, 2);
});

test('merged fallback snapshots keep one global prompt text budget', () => {
  const snapshots = Array.from({ length: 6 }, (_, index) => main([{
    type: 'message',
    role: 'user',
    id: `large-${index}`,
    content: String(index).repeat(250_000),
  }], 'thread-budget'));
  const marker = main([{ type: 'compaction', id: 'compact-budget' }], 'thread-budget');
  const record = extractCurrentContextCompactionRecord([...snapshots, marker]);
  const totalText = record.prompts.flatMap(prompt => prompt.segments)
    .filter(segment => segment.type === 'text')
    .reduce((sum, segment) => sum + segment.text.length, 0);
  assert.ok(totalText <= MAX_PROJECTED_TEXT_CHARS);
  assert.equal(record.prompts.some(prompt => prompt.truncated), true);
});

test('only reads an own explicit summary and never touches forbidden fields', () => {
  const item = { type: 'compaction' };
  for (const name of ['encrypted_content', 'content', 'text', 'message', 'replacement_history']) {
    Object.defineProperty(item, name, {
      enumerable: true,
      get() { throw new Error(`${name} must not be read`); },
    });
  }

  const descriptor = extractCurrentContextCompaction([main([item])]);
  assert.equal(descriptor.present, true);
  assert.equal(descriptor.count, 1);
  assert.equal(descriptor.summary, null);
  assert.equal(descriptor.truncated, false);
  assert.match(descriptor.sourceKey, /^thread:thread-current:generation:.*:ordinal:1:0$/);

  const inherited = Object.create({ summary: 'inherited secret' });
  inherited.type = 'compaction';
  assert.equal(extractCurrentContextCompaction([main([inherited])]).summary, null);
});

test('accepts only string and summary_text block summaries as plaintext', () => {
  const plain = extractCurrentContextCompaction([main([{
    type: 'compaction',
    summary: '  <img src=x onerror=alert(1)>  ',
  }])]);
  assert.equal(plain.summary, '<img src=x onerror=alert(1)>');

  const blocks = extractCurrentContextCompaction([main([{
    type: 'compaction',
    summary: [
      { type: 'summary_text', text: 'first' },
      { type: 'text', text: 'ignored' },
      { type: 'summary_text', text: 'second\u0000' },
      'ignored',
    ],
  }])]);
  assert.equal(blocks.summary, 'first\nsecond');

  const unknown = extractCurrentContextCompaction([main([{
    type: 'compaction', content: 'secret', text: 'secret', summary_text: 'secret',
  }])]);
  assert.equal(unknown.summary, null);
});

test('uses the last direct compaction and does not borrow an older summary', () => {
  const result = extractCurrentContextCompaction([main([
    { type: 'compaction', summary: 'stale summary' },
    { type: 'compaction', encrypted_content: 'opaque' },
  ])]);
  assert.equal(result.present, true);
  assert.equal(result.count, 2);
  assert.equal(result.summary, null);
  assert.equal(result.truncated, false);
  assert.match(result.sourceKey, /^thread:thread-current:encrypted:t:6:/);
});

test('truncates summaries by Unicode code point at the display limit', () => {
  const exact = '😀'.repeat(CONTEXT_COMPACTION_SUMMARY_LIMIT);
  const atLimit = extractCurrentContextCompaction([main([{ type: 'compaction', summary: exact }])]);
  assert.equal(Array.from(atLimit.summary).length, CONTEXT_COMPACTION_SUMMARY_LIMIT);
  assert.equal(atLimit.truncated, false);

  const overLimit = extractCurrentContextCompaction([main([{
    type: 'compaction', summary: `${exact}😀`,
  }])]);
  assert.equal(Array.from(overLimit.summary).length, CONTEXT_COMPACTION_SUMMARY_LIMIT);
  assert.equal(overLimit.truncated, true);
});

test('shares the summary budget across blocks and strips bidi controls', () => {
  const result = extractCurrentContextCompaction([main([{
    type: 'compaction',
    summary: [
      { type: 'summary_text', text: `safe\u202E${'a'.repeat(CONTEXT_COMPACTION_SUMMARY_LIMIT - 5)}` },
      { type: 'summary_text', text: 'overflow' },
    ],
  }])]);
  assert.equal(result.summary.includes('\u202E'), false);
  assert.equal(Array.from(result.summary).length, CONTEXT_COMPACTION_SUMMARY_LIMIT - 1);
  assert.equal(result.truncated, true);
});

test('keeps the latest compaction attached to its MainAgent conversation and ignores lookalikes', () => {
  const old = main([{ type: 'compaction', summary: 'old' }], 'thread-current');
  const latest = main([
    { type: 'message', role: 'user', content: '{"type":"compaction"}' },
    { type: 'message', content: [{ type: 'compaction', summary: 'nested' }] },
    { type: 'Compaction', summary: 'wrong case' },
  ], 'thread-current');
  const subAgent = {
    mainAgent: false,
    subAgent: true,
    body: { input: [{ type: 'compaction', summary: 'subagent' }] },
  };

  const current = extractCurrentContextCompaction([old, latest, subAgent]);
  assert.equal(current.present, true);
  assert.equal(current.count, 1);
  assert.equal(current.summary, 'old');
  assert.equal(current.truncated, false);
  assert.match(current.sourceKey, /^thread:thread-current:generation:.*:ordinal:1:0$/);
});

test('survives internal snapshot splits but stops at thread and clear boundaries', () => {
  const compacted = main(
    [{ type: 'compaction', summary: 'current' }],
    'thread-a',
    { _sessionId: 'internal-a' },
  );
  const laterSnapshot = main(
    [{ type: 'message', role: 'user', content: 'later' }],
    'thread-a',
    { _sessionId: 'internal-b' },
  );
  assert.equal(extractCurrentContextCompaction([compacted, laterSnapshot]).summary, 'current');

  const otherThread = main(
    [{ type: 'message', role: 'user', content: 'other' }],
    'thread-b',
    { _sessionId: 'internal-c' },
  );
  assert.equal(extractCurrentContextCompaction([compacted, otherThread]).present, false);

  const clearCheckpoint = main([{
    type: 'message',
    role: 'user',
    content: [{ type: 'text', text: '<command-name>/clear</command-name>' }],
  }], 'thread-a', { _sessionId: 'internal-clear', _isCheckpoint: true });
  const afterClear = main(
    [{ type: 'message', role: 'user', content: 'fresh' }],
    'thread-a',
    { _sessionId: 'internal-clear' },
  );
  assert.equal(extractCurrentContextCompaction([compacted, clearCheckpoint, afterClear]).present, false);
});

test('reads the safe marker preserved before a compaction entry is slimmed', () => {
  const slimmedCompaction = main([], 'thread-a', {
    _sessionId: 'internal-a',
    _slimmed: true,
    _contextCompaction: { present: true, count: 1, summary: 'preserved', truncated: false },
  });
  const latest = main(
    [{ type: 'message', role: 'user', content: 'later' }],
    'thread-a',
    { _sessionId: 'internal-b' },
  );
  assert.deepEqual(extractCurrentContextCompaction([slimmedCompaction, latest]), {
    present: true,
    count: 1,
    summary: 'preserved',
    truncated: false,
    sourceKey: null,
  });
});

test('falls back from an empty delta only within the same explicit session', () => {
  const snapshot = main([{ type: 'compaction', summary: 'current' }], 'thread-a');
  const sameSessionDelta = main([], 'thread-a', { _slimmed: true });
  assert.equal(extractCurrentContextCompaction([snapshot, sameSessionDelta]).summary, 'current');

  const otherSessionDelta = main([], 'thread-b', { _slimmed: true });
  assert.equal(extractCurrentContextCompaction([snapshot, otherSessionDelta]).present, false);

  const keylessSnapshot = main([{ type: 'compaction' }], null);
  const keylessDelta = main([], null, { _slimmed: true });
  assert.equal(extractCurrentContextCompaction([keylessSnapshot, keylessDelta]).present, false);
});

test('a persisted clear epoch blocks old anchors without comparing wall clocks', () => {
  const beforeClear = main(
    [{ type: 'compaction', summary: 'old epoch' }],
    'thread-a',
    { _sessionId: 'epoch-old', timestamp: '2099-07-12T10:00:00.000Z' },
  );
  const emptyAfterClear = main([], 'thread-a', {
    _sessionId: 'epoch-old', timestamp: '1999-07-12T10:00:02.000Z',
    _slimmed: true,
  });

  assert.equal(extractCurrentContextCompaction([beforeClear], { excludedEpoch: 'epoch-old' }).present, false);
  assert.equal(extractCurrentContextCompaction(
    [beforeClear, emptyAfterClear], { excludedEpoch: 'epoch-old' },
  ).present, false);

  const current = main(
    [{ type: 'compaction', summary: 'new epoch' }],
    'thread-a',
    { _sessionId: 'epoch-new', timestamp: '1999-07-12T10:00:03.000Z' },
  );
  assert.equal(extractCurrentContextCompaction(
    [beforeClear, emptyAfterClear, current], { excludedEpoch: 'epoch-old' },
  ).summary, 'new epoch');
});

test('clear epoch survives reload, is scoped per project, and tolerates unavailable storage', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  saveExcludedContextCompactionEpoch('epoch-a', 'project-a', storage);
  saveExcludedContextCompactionEpoch('epoch-b', 'project-b', storage);
  assert.equal(loadExcludedContextCompactionEpoch('project-a', storage), 'epoch-a');
  assert.equal(loadExcludedContextCompactionEpoch('project-b', storage), 'epoch-b');
  saveExcludedContextCompactionEpoch(null, 'project-a', storage);
  assert.equal(loadExcludedContextCompactionEpoch('project-a', storage), null);
  assert.equal(loadExcludedContextCompactionEpoch('project-b', storage), 'epoch-b');

  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(loadExcludedContextCompactionEpoch('project', denied), null);
  assert.doesNotThrow(() => saveExcludedContextCompactionEpoch('epoch', 'project', denied));
});

test('suppression and malformed input safely return absent', () => {
  const marker = main([{ type: 'compaction' }]);
  assert.equal(extractCurrentContextCompaction([marker], { suppressed: true }).present, false);
  assert.equal(extractCurrentContextCompaction().present, false);
  assert.equal(extractCurrentContextCompaction([]).present, false);
  assert.equal(extractCurrentContextCompaction([main('plain input')]).present, false);
  assert.equal(extractCurrentContextCompaction([main([null, 1, 'compaction'])]).present, false);
});

test('explicit display epoch anchors compaction to a pinned session instead of the global tail', () => {
  const pinned = main([{ type: 'compaction', summary: 'pinned summary' }], 'thread-pinned');
  pinned._sessionId = 'epoch-pinned';
  const live = main([], 'thread-live');
  live._sessionId = 'epoch-live';
  assert.equal(extractCurrentContextCompaction([pinned, live], {
    anchorEpoch: 'epoch-pinned',
  }).summary, 'pinned summary');
});

test('storage access errors are caught even when global localStorage getter throws', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('blocked', 'SecurityError'); },
    });
    assert.equal(loadExcludedContextCompactionEpoch('blocked'), null);
    assert.doesNotThrow(() => saveExcludedContextCompactionEpoch('epoch', 'blocked'));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
