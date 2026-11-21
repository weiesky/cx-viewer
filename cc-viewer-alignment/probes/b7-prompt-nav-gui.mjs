import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
import { buildLocalUltraplan, parseUltraplanPrompt } from '../../packages/app/src/utils/ultraplanTemplates.js';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-sdk-ui-fixture.json'));
const out = new URL('../B7-prompt-nav/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
  const shots = [], shot = async name => { const file = `${engine}-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  try {
    await fetch(`http://127.0.0.1:${f.port}/api/preferences?instance=${engine === 'chromium' ? f.a.instanceKey : f.b.instanceKey}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: 'en' }) });
    await page.goto(engine === 'chromium' ? f.a.url : f.b.url);
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    await ta.fill('B7 navigation plain prompt'); await ta.press('Enter');
    await page.locator('[data-ccv-role="assistant"] .chat-md h1').last().waitFor(); await page.getByTitle('Send', { exact: true }).waitFor();
    await ta.fill('ask fixture'); await ta.press('Enter');
    const modal = page.getByRole('dialog'); await modal.waitFor();
    await modal.getByRole('button', { name: 'Minimise (keep pending)', exact: true }).click();
    const inline = page.locator('[data-ccv-role="assistant"] [data-ccv-quotable="ask-question"]'); await inline.waitFor();
    await inline.locator('..').getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByTitle('Send', { exact: true }).waitFor();
    const ultra = buildLocalUltraplan('B7 Ultra navigation fixture'); assert.ok(parseUltraplanPrompt(ultra));
    const previous = await page.locator('[data-ccv-role="assistant"] .chat-md h1').count();
    await ta.fill(ultra); await ta.press('Enter');
    await page.waitForFunction(n => document.querySelectorAll('[data-ccv-role="assistant"] .chat-md h1').length > n, previous);
    await page.getByTitle('Send', { exact: true }).waitFor();
    const avatar = page.locator('img[class*="navAvatarImg_"]').locator('..'); await avatar.hover();
    const list = page.locator('[class*="userPromptNavList_"]').filter({ visible: true }); await list.waitFor();
    const badges = async kind => page.locator(`span[class*="userPromptNavBadge${kind}_"]`).filter({ visible: true });
    assert.ok(await (await badges('Plan')).count()); assert.ok(await (await badges('Ask')).count()); assert.ok(await (await badges('Ultraplan')).count());
    assert.match(await list.innerText(), /B7 navigation plain prompt/); assert.match(await list.innerText(), /B7 Ultra navigation fixture/);
    await shot('english');
    const ask = await badges('Ask'); await ask.first().locator('..').click();
    const target = await ta.evaluate(el => { let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))];
      while (fiber && !(fiber.stateNode?.setState && Object.hasOwn(fiber.stateNode.state || {}, 'inputSuggestion'))) fiber = fiber.return;
      const owner = fiber?.stateNode, idx = owner?.state.highlightVisibleIdx, props = owner?._currentVisible?.[idx]?.props;
      return { index: idx, timestamp: owner?.state.highlightTs, producer: props?.displayTs || props?.timestamp,
        containsAsk: props?.content?.some(block => block.type === 'tool_use' && block.name === 'request_user_input') };
    });
    assert.ok(target.containsAsk); assert.equal(target.timestamp, target.producer); await shot('ask-target');
    await page.locator('[class*="logoWrap_"]').first().hover();
    await page.getByRole('menuitem').filter({ hasText: 'Preferences' }).click();
    const drawer = page.locator('.ant-drawer-open'); await drawer.waitFor();
    await drawer.getByText('Language', { exact: true }).locator('..').locator('.ant-select').click();
    const languageInput = drawer.getByText('Language', { exact: true }).locator('..').getByRole('combobox');
    await languageInput.focus(); await page.waitForTimeout(100);
    let foundChinese = false;
    for (let step = 0; step < 20; step++) {
      const activeId = await languageInput.getAttribute('aria-activedescendant');
      const active = await page.evaluate(id => { const el = id && document.getElementById(id); return el?.getAttribute('aria-label') || el?.textContent || ''; }, activeId);
      if (active === 'zh' || active === '简体中文') { foundChinese = true; break; }
      await languageInput.press('ArrowDown'); await page.waitForTimeout(50);
    }
    assert.equal(foundChinese, true); await languageInput.press('Enter');
    await drawer.getByText('语言设置', { exact: true }).waitFor();
    await drawer.locator('.ant-drawer-close').click(); await drawer.waitFor({ state: 'hidden' });
    await avatar.hover(); await list.waitFor();
    assert.equal(await (await badges('Plan')).first().innerText(), '计划');
    assert.equal(await (await badges('Ask')).first().innerText(), '提问'); await shot('chinese');
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), nativeProtocolFixture: true,
      planAskUltraBadges: true, askScrollProducer: target, languageCacheRefresh: true, screenshots: shots, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-failure.png`) }); console.error(engine, (await page.locator('body').innerText()).slice(-3000)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
