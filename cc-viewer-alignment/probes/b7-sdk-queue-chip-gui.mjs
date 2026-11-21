// Controlled fake-native protocol phases, actual SDK manager/HTTP/WS/browser.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-sdk-ui-fixture.json'));
const out = new URL('../B7-sdk-queue-chip/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) for (const mode of ['desktop', 'phone']) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = [], shots = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
  const shot = async name => { const file = `${engine}-${mode}-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  try {
    const suffix = mode === 'phone' ? '&mobile=1' : ''; await page.goto(f.a.url + suffix);
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    const marker = `${engine}-${mode}-${Date.now()}`, text = 'B7 SEND SDK ' + marker;
    await ta.fill('B7 HOLD SDK ' + marker); await ta.press('Enter'); await page.getByRole('button', { name: 'Stop', exact: true }).waitFor();
    await ta.fill(text); await ta.press('Enter'); const row = page.locator('[class*="queueBubble_"]').filter({ hasText: text }); await row.waitFor();
    await row.getByRole('button', { name: 'Send now', exact: true }).click();
    const chip = page.locator('[class*="optimisticQueueStatus_"]'); await chip.waitFor(); assert.equal(await chip.innerText(), 'Sending…');
    const placement = await chip.evaluate(el => ({ fontSize: getComputedStyle(el).fontSize, marginLeft: getComputedStyle(el).marginLeft, role: el.getAttribute('role'), parentClass: el.parentElement.className }));
    assert.equal(placement.fontSize, '11px'); assert.ok(Math.abs(parseFloat(placement.marginLeft) - 6) < 0.1); assert.equal(placement.role, 'status');
    assert.equal(await page.locator('[data-ccv-role="user"]').filter({ hasText: text }).count(), 1); await shot('inline-sending');
    await chip.waitFor({ state: 'hidden' }); await row.waitFor({ state: 'hidden' });
    await page.waitForFunction(text => {
      const user = [...document.querySelectorAll('[data-ccv-role="user"]')].find(el => el.textContent.includes(text));
      return user && [...document.querySelectorAll('[data-ccv-role="assistant"]')].some(el => el.textContent.includes('B7 SDK queued reply') && (user.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
    }, text);
    assert.equal(await page.locator('[data-ccv-role="user"]').filter({ hasText: text }).count(), 1); await shot('accepted-once');
    await page.reload(); await ta.waitFor(); await page.locator('[data-ccv-role="user"]').filter({ hasText: text }).waitFor(); assert.equal(await chip.count(), 0); assert.equal(await page.locator('[data-ccv-role="user"]').filter({ hasText: text }).count(), 1);
    const calls = readFileSync(join(f.root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse); assert.equal(calls.filter(call => call.text === text).length, 1);
    await page.goto(f.b.url + suffix); await ta.waitFor(); assert.equal(await chip.count(), 0); assert.equal(await page.locator('[class*="queueBubble_"]').count(), 0);
    assert.ok(!(await page.locator('body').innerText()).includes(text)); assert.deepEqual(errors, []);
    results.push({ engine, version: browser.version(), mode, emulated: mode === 'phone', controlledFakeNative: true, actualSdkManagerAndWs: true,
      inlineSendingChip: true, dispatchAckClearsChip: true, nativePromptRemainsUnique: true, reloadNoGhost: true, siblingNoLeak: true, wireSentOnce: true, placement, screenshots: shots, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-failure.png`) }); console.error((await page.locator('body').innerText()).slice(-1800)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
