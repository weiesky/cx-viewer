import test from 'node:test';
import assert from 'node:assert/strict';
import { contextUsageForView, computeContextPercent, formatContextUsage, sumUsageContextTokens } from '@cxv/core/context-rules';
import { contextSeverityColor } from '../src/utils/formatters.js';
import { normalizeConversationEntry } from '../src/utils/conversationEntryNormalize.js';
import { sdkToJSONLEntry } from '../../../packages/app/lib/sdk-adapter.js';

test('normalized SDK chat rows render measured context and preserve unknown rather than cumulative consumption', () => {
  for (const measured of [true, false]) {
    const raw = sdkToJSONLEntry({ message: { content: [{ type: 'text', text: 'answer' }],
      usage: { input_tokens: 4120123, output_tokens: 20243 },
      context_usage: measured ? { input_tokens: 170176, output_tokens: 853, total_tokens: 171029 } : null,
      ...(measured ? { context_window: 475000 } : {}) } }, [], 'fixture', 'project',
    { threadId: 'owned-thread', cwd: '/project', metadata: { transport: 'exec', instance_key: 'a' } });
    const entry = normalizeConversationEntry(JSON.parse(JSON.stringify(raw)));
    const percent = computeContextPercent({ lastMainAgent: entry });
    const total = sumUsageContextTokens(contextUsageForView({ lastMainAgent: entry }));
    assert.equal(formatContextUsage(total, percent), measured ? '171.0K (34%)' : '—');
    assert.equal(contextSeverityColor(percent), measured ? 'var(--color-success)' : 'var(--color-text-secondary)');
  }
});
