import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_TOOL_NAMES } from '../src/utils/toolCatalog.js';

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
  for (const lang of ['en', 'zh']) {
    for (const doc of expectedDocs) {
      assert.equal(existsSync(join(conceptsDir, lang, doc)), true, `${lang}/${doc} exists`);
    }
  }

  const actualDocs = walkToolDocs(conceptsDir).map((file) => file.replace(`${conceptsDir}/`, ''));
  const unexpected = actualDocs.filter((rel) => {
    const [lang, doc] = rel.split('/');
    return !['en', 'zh'].includes(lang) || !expectedDocs.has(doc);
  });

  assert.deepEqual(unexpected, []);
});
