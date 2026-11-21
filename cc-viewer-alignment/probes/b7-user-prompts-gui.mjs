import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-sdk-ui-fixture.json'));
const out = new URL('../B7-user-prompts/', import.meta.url); mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', acceptDownloads: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
  const scope = engine === 'chromium' ? f.a : f.b;
  const shots = [], shot = async name => { const file = `${engine}-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  try {
    await fetch(`http://127.0.0.1:${f.port}/api/preferences?instance=${scope.instanceKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: 'en' }) });
    await page.goto(scope.url);
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    const unique = `B7 ${engine} export literal <img src=x onerror=alert(1)>`;
    const previous = await page.locator('[data-ccv-role="assistant"] .chat-md h1').count();
    await ta.fill(unique + '\n<b7_context>Fixture context only</b7_context>'); await ta.press('Enter');
    await page.waitForFunction(n => document.querySelectorAll('[data-ccv-role="assistant"] .chat-md h1').length > n, previous);
    await page.getByTitle('Send', { exact: true }).waitFor();
    await ta.fill('Unsent draft preserved'); await page.waitForTimeout(300);
    await page.locator('img[class*="navAvatarImg_"]').locator('..').hover();
    await page.locator('[class*="userPromptNavList_"]').filter({ visible: true }).waitFor();
    await page.locator('button[class*="userPromptNavMore_"]').filter({ visible: true }).click();
    const modal = page.getByRole('dialog'); await modal.waitFor();
    await page.mouse.move(1400, 900); await page.waitForTimeout(400);
    const original = await modal.innerText(); assert.ok(!original.includes('ui.promptCountUnit')); assert.ok(original.includes(unique)); assert.ok(!original.includes('You are Codex'));
    assert.equal(await modal.locator('img').count(), 0); await shot('original');
    await modal.getByRole('tab', { name: 'Context', exact: true }).click();
    const collapses = modal.locator('.ant-collapse-header'); assert.ok(await collapses.count());
    await collapses.first().click(); await modal.locator('.ant-collapse-content-active').first().waitFor(); await page.waitForTimeout(300); await shot('context');
    await modal.getByRole('tab', { name: 'Text', exact: true }).click();
    const text = await modal.locator('textarea').inputValue(); assert.ok(text.includes(unique));
    assert.ok(!text.includes('Fixture context only')); assert.ok(!text.includes('<user_instructions>')); assert.ok(!text.includes('You are Codex'));
    assert.equal(await modal.locator('textarea').getAttribute('readonly'), ''); await page.waitForTimeout(300); await shot('text');
    const waiting = page.waitForEvent('download'); await modal.getByRole('button', { name: /Export to local \.txt/ }).click();
    const download = await waiting; const file = `/tmp/cxv-b7-e19-${engine}.txt`; await download.saveAs(file);
    const exported = readFileSync(file, 'utf8'); assert.ok(exported.includes(unique)); assert.ok(!exported.includes('Fixture context only')); assert.ok(!exported.includes('<user_instructions>')); assert.ok(!exported.includes('You are Codex'));
    await modal.getByRole('button', { name: 'Close', exact: true }).click(); await modal.waitFor({ state: 'hidden' });
    assert.equal(await ta.inputValue(), 'Unsent draft preserved'); assert.deepEqual(errors, []);
    results.push({ engine, version: browser.version(), nativeProtocolFixture: true, threeModes: true, inertMarkup: true, exportTextOnly: true, draftPreserved: true, screenshots: shots, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-failure.png`) }); console.error((await page.locator('body').innerText()).slice(-3500)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
