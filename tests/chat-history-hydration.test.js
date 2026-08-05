import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/chat/ChatView.jsx', import.meta.url), 'utf8');

test('completed history hydration schedules a settled conversation rebuild', () => {
  assert.match(source, /didFinishConversationHydration\([\s\S]*?prevProps\.fileLoading,[\s\S]*?this\.props\.fileLoading,[\s\S]*?this\.props\.mainAgentSessions/);
  assert.match(source, /_historyHydrationRafId\s*=\s*requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?this\.startRender\(\)/);
});

test('pending hydration rebuild is cancelled on unmount', () => {
  assert.match(source, /cancelAnimationFrame\(this\._historyHydrationRafId\)/);
});

test('read-only logfile conversations keep the bounded client render window', () => {
  assert.match(source, /_applyMobileSlice\(allItems\)[\s\S]*?const limit = ITEM_LIMIT \+ this\._mobileExtraItems;[\s\S]*?const offset = allItems\.length - limit;/);
  assert.doesNotMatch(source, /if \(this\.props\.isLocalLog\)[\s\S]*?return allItems;/);
});
