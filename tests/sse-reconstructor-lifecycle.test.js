import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/AppBase.jsx', import.meta.url), 'utf8');

test('live V2 winner reindex keeps the SSE reconstructor alive within a batch', () => {
  const winnerBranch = source.match(
    /if \(entry\._v2RowHandle\) \{[\s\S]*?\} else \{/
  )?.[0];

  assert.ok(winnerBranch, 'expected the live V2 winner replacement branch');
  assert.match(
    winnerBranch,
    /_rebuildRequestIndex\(requests, \{ resetIncremental: false \}\)/
  );
  assert.doesNotMatch(winnerBranch, /_sseReconstructor\s*=\s*null/);
});

test('full request-index rebuilds reset incremental stream processors by default', () => {
  const rebuildMethod = source.match(
    /_rebuildRequestIndex\(entries, \{ resetIncremental = true \} = \{\}\) \{[\s\S]*?\n  \}/
  )?.[0];

  assert.ok(rebuildMethod, 'expected the request-index rebuild method');
  assert.match(rebuildMethod, /if \(resetIncremental\)/);
  assert.match(rebuildMethod, /this\._sseSlimmer\s*=\s*null/);
  assert.match(rebuildMethod, /this\._sseReconstructor\s*=\s*null/);
});

test('cold ingest wires MainAgent classification into the conversation baseline commit', () => {
  const processOneEntry = source.match(
    /_processOneEntry\(entry, i, st\) \{[\s\S]*?\n  \}/
  )?.[0];

  assert.ok(processOneEntry, 'expected the shared cold-ingest entry processor');
  assert.match(
    processOneEntry,
    /const commitsConversationBaseline = !mergeBlocked && isMainAgent\(entry\)/
  );
  assert.match(
    processOneEntry,
    /st\.conversationNormalizer\(entry, \{ commit: commitsConversationBaseline \}\)/
  );
});

test('live ingest wires MainAgent classification into the conversation baseline commit', () => {
  const liveMergeBlock = source.match(
    /const mergeBlocked = isMergeBlockedEntry\(entry\);[\s\S]*?if \(!conversationExcluded && isMainAgent\(conversationEntry\)/
  )?.[0];

  assert.ok(liveMergeBlock, 'expected the live conversation merge block');
  assert.match(
    liveMergeBlock,
    /const commitsConversationBaseline = !mergeBlocked && isMainAgent\(entry\)/
  );
  assert.match(
    liveMergeBlock,
    /this\._liveConversationNormalizer\(entry, \{ commit: commitsConversationBaseline \}\)/
  );
});
