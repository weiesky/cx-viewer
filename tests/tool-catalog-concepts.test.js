import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_TOOL_NAMES, TOOL_CATALOG } from '../src/utils/toolCatalog.js';

const root = new URL('..', import.meta.url).pathname;
const conceptsDir = join(root, 'concepts');
const expectedDocs = new Set(ALL_TOOL_NAMES.map((name) => `Tool-${name}.md`));

function walkToolDocs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkToolDocs(full, out);
    else if (/^Tool-.*\.md$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('tool catalog has authoritative English and Chinese concept docs only', () => {
  assert.equal(ALL_TOOL_NAMES.length, new Set(ALL_TOOL_NAMES).size, 'catalog tool names are unique');

  for (const lang of ['en', 'zh']) {
    for (const doc of expectedDocs) {
      const file = join(conceptsDir, lang, doc);
      assert.equal(existsSync(file), true, `${lang}/${doc} exists`);
      const name = doc.slice('Tool-'.length, -'.md'.length);
      const markdown = readFileSync(file, 'utf8');
      assert.equal(markdown.split('\n', 1)[0], `# ${name}`, `${lang}/${doc} has the canonical title`);
      const body = markdown.replace(/^# .*$/m, '').trim();
      assert.ok(body.length >= 60, `${lang}/${doc} has a useful description`);
    }
  }

  const actualDocs = walkToolDocs(conceptsDir).map((file) => file.replace(`${conceptsDir}/`, ''));
  const unexpected = actualDocs.filter((rel) => {
    const [lang, doc] = rel.split('/');
    return !['en', 'zh'].includes(lang) || !expectedDocs.has(doc);
  });

  assert.deepEqual(unexpected, []);
});

test('catalog includes the Code Mode and Multi-Agent V2 tools seen in current requests', () => {
  const byCategory = Object.fromEntries(TOOL_CATALOG.map(({ key, tools }) => [key, tools]));

  assert.deepEqual(byCategory.codeMode, ['exec', 'wait']);
  assert.deepEqual(byCategory.team, [
    'spawn_agent',
    'send_message',
    'followup_task',
    'wait_agent',
    'interrupt_agent',
    'list_agents',
  ]);
});

test('exec concept documents the orchestration suite instead of only the JS runtime', () => {
  for (const lang of ['en', 'zh']) {
    const markdown = readFileSync(join(conceptsDir, lang, 'Tool-exec.md'), 'utf8');
    for (const capability of [
      'Promise.all',
      'ALL_TOOLS',
      'yield_control()',
      'store(key, value)',
      'generatedImage(result)',
      'yield_time_ms',
      'max_output_tokens',
      'wait',
    ]) {
      assert.ok(markdown.includes(capability), `${lang}/Tool-exec.md covers ${capability}`);
    }
  }
});
