import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const disclosure = readFileSync(new URL('../src/components/dashboard/ContextCompactionDisclosure.jsx', import.meta.url), 'utf8');
const cachePopover = readFileSync(new URL('../src/components/dashboard/CachePopoverContent.jsx', import.meta.url), 'utf8');
const chatView = readFileSync(new URL('../src/components/chat/ChatView.jsx', import.meta.url), 'utf8');
const normalize = readFileSync(new URL('../src/utils/conversationEntryNormalize.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/components/dashboard/CachePopoverContent.module.css', import.meta.url), 'utf8');

test('cache popover and conversation reuse one compaction disclosure component', () => {
  assert.match(disclosure, /CompactionPromptHistory/);
  assert.match(cachePopover, /<ContextCompactionDisclosure/);
  assert.match(chatView, /<ContextCompactionDisclosure/);
  assert.match(chatView, /msg\.role === 'context-compaction'/);
  assert.match(disclosure, /aria-expanded=\{expanded\}/);
  assert.match(disclosure, /aria-controls=\{promptRegionId\}/);
  assert.match(disclosure, /resolveRecord\?\.\(\)/);
});

test('compaction identifiers and fallback summaries are not copied into DOM data attributes', () => {
  assert.doesNotMatch(disclosure, /data-context-compaction-key|data-timestamp/);
});

test('same-length authoritative message replacement invalidates ChatView element cache', () => {
  assert.match(chatView, /sc\.messagesRef === session\.messages/);
  assert.match(chatView, /messagesRef: session\.messages/);
});

test('conversation keeps compaction prompts out of normalization and resolves them for display', () => {
  assert.match(chatView, /resolveContextCompactionRecordBySourceKey\(this\.props\.requests, compactionKey\)/);
  assert.match(chatView, /record=\{conversationRecord\}/);
  assert.match(disclosure, /defaultExpanded:\s*inConversation/);
  assert.match(normalize, /extractEntryContextCompaction\(entry\)/);
  assert.doesNotMatch(normalize, /extractEntryContextCompactionRecord\(entry\)/);
});

test('old last-prompt compaction projection contract and comments are removed', () => {
  assert.doesNotMatch(normalize, /latestPromptBeforeCompaction|compactHistoryCutoff|Retain that prompt/);
  assert.match(normalize, /dedicated disclosure row/);
});

test('compaction disclosure accents use success green without changing private warnings', () => {
  const start = css.indexOf('.compactionSection');
  const end = css.indexOf('.skillCountBreakdown');
  const compactionCss = css.slice(start, end);
  assert.match(compactionCss, /--color-success-light/);
  assert.match(compactionCss, /--color-success-bg-light/);
  assert.match(compactionCss, /--color-success-text/);
  assert.doesNotMatch(compactionCss, /--color-primary/);
  assert.match(compactionCss, /\.compactionPromptPrivateWarning[\s\S]*--color-warning/);
  assert.match(compactionCss, /margin-inline-start:\s*auto/);
  assert.match(compactionCss, /text-align:\s*end/);
  assert.match(compactionCss, /\.compactionSectionInDrawer[\s\S]*\.compactionRow/);
});
