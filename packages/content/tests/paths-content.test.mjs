import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

for (const scenario of ['workspace', 'installed', 'unrelated-sibling']) {
  test(`actual runtime content paths: ${scenario}`, async (t) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-content-paths-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const app = join(root, 'app');
    const content = join(root, 'content');
    mkdirSync(join(app, 'server'), { recursive: true });
    writeFileSync(join(app, 'package.json'), '{"type":"module"}');
    cpSync(new URL('../../app/server/_paths.js', import.meta.url), join(app, 'server/_paths.js'));
    if (scenario !== 'installed') {
      mkdirSync(content);
      writeFileSync(join(content, 'package.json'), JSON.stringify({ name: scenario === 'workspace' ? '@cxv/content' : 'some-other-content', private: true }));
    }
    for (const [dir, sentinel] of [['concepts', 'en'], ['ultraAgents', 'code-expert.json'], ['imSkills', 'scripts']]) {
      mkdirSync(join(app, dir), { recursive: true });
      if (scenario !== 'installed') mkdirSync(join(content, dir, sentinel), { recursive: true });
    }
    const paths = await import(pathToFileURL(join(app, 'server/_paths.js')));
    const expected = scenario === 'workspace' ? content : app;
    assert.equal(paths.PACKAGE_ROOT, app);
    assert.equal(paths.CONCEPTS_DIR, join(expected, 'concepts'));
    assert.equal(paths.ULTRA_AGENTS_DIR, join(expected, 'ultraAgents'));
    assert.equal(paths.IM_SKILLS_DIR, join(expected, 'imSkills'));
  });
}
