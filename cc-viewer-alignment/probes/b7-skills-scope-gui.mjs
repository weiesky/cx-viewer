import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-sdk-ui-fixture.json'));
assert.match(f.root, /\/cxv-b7-sdk-ui-/);
const plugin = join(f.root, '.codex/plugins/cache/fixture/pack/1.0.0');
const entries = [
  [join(f.root, '.codex/skills/global-fixture'), 'global-fixture'],
  [join(f.a.cwd, '.codex/skills/project-fixture'), 'project-fixture'],
  [join(plugin, 'skills/plugin-fixture'), 'plugin-fixture'],
];
for (const [dir, name] of entries) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: B7 scope fixture description\n---\n\nFixture only.\n`); }
mkdirSync(join(plugin, '.codex-plugin'), { recursive: true });
writeFileSync(join(plugin, '.codex-plugin/plugin.json'), JSON.stringify({ name: 'pack', skills: './skills' }));
const api = await (await fetch(`http://127.0.0.1:${f.port}/api/skills?instance=${f.a.instanceKey}`)).json();
const list = Array.isArray(api) ? api : api.skills;
for (const source of ['user', 'project', 'plugin']) assert.ok(list.some(item => item.source === source && item.name.endsWith('-fixture')));
const out = new URL('../B7-skills-scope/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
  try {
    await page.goto(f.a.url); const trigger = page.getByRole('button', { name: 'Context Management', exact: true }); await trigger.waitFor();
    await page.locator('[data-ccv-role="assistant"] .chat-md h1').last().waitFor(); await page.waitForTimeout(300);
    await trigger.hover(); const rows = page.locator('[class*="skillScopeRow_"]'); await rows.first().waitFor();
    const text = await rows.allInnerTexts(); assert.equal(text.length, 3);
    assert.match(text[0], /Global Skills:.*global-fixture/s); assert.match(text[1], /Project Skills:.*project-fixture/s); assert.match(text[2], /Plugin Skills:.*pack:plugin-fixture/s);
    await rows.last().getByText('pack:plugin-fixture', { exact: true }).hover();
    await page.getByText('B7 scope fixture description', { exact: true }).filter({ visible: true }).waitFor();
    const screenshot = `${engine}-scopes.png`; await page.screenshot({ path: join(out.pathname, screenshot) }); assert.deepEqual(errors, []);
    results.push({ engine, version: browser.version(), realFilesystemAPI: true, rows: text, chipDescription: true, screenshot, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-failure.png`) }); console.error((await page.locator('body').innerText()).slice(-2500)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
