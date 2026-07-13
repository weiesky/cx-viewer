import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTEXT_COMPACTION_SUMMARY_LIMIT,
  extractCurrentContextCompaction,
  loadExcludedContextCompactionEpoch,
  saveExcludedContextCompactionEpoch,
} from '../src/utils/contextCompaction.js';

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

  assert.deepEqual(result, { present: true, count: 1, summary: null, truncated: false });
  assert.equal(JSON.stringify(result).includes('TOP_SECRET'), false);
});

test('only reads an own explicit summary and never touches forbidden fields', () => {
  const item = { type: 'compaction' };
  for (const name of ['encrypted_content', 'content', 'text', 'message', 'replacement_history']) {
    Object.defineProperty(item, name, {
      enumerable: true,
      get() { throw new Error(`${name} must not be read`); },
    });
  }

  assert.deepEqual(extractCurrentContextCompaction([main([item])]), {
    present: true, count: 1, summary: null, truncated: false,
  });

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
  assert.deepEqual(result, { present: true, count: 2, summary: null, truncated: false });
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

  assert.deepEqual(extractCurrentContextCompaction([old, latest, subAgent]), {
    present: true, count: 1, summary: 'old', truncated: false,
  });
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
    present: true, count: 1, summary: 'preserved', truncated: false,
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
