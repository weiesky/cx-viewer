// Regression for shared-CAS input contamination: repeated turns without reloading.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const { chromium, webkit } = await import(process.env.CXV_PLAYWRIGHT_MODULE);
const fixture = JSON.parse(readFileSync(process.argv[2] || '/tmp/cxv-b6-gui-fixture.json'));
assert.ok(fixture.root.includes('/cxv-b6-preview-gui-'));
const results = [];
for (const engine of ['chromium', 'webkit']) {
  const browser = await ({ chromium, webkit })[engine].launch({ headless: true });
  try {
    const page = await browser.newPage({ locale: 'en-US', viewport: { width: 1440, height: 1000 } });
    await page.route(/https?:\/\/(ipwho\.is|ipapi\.co|ipinfo\.io)\//, route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"success":true,"country_code":"US","country":"US"}' }));
 page.setDefaultTimeout(12000);
    await page.goto(fixture.a.url);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const cycles = [];
    for (let i = 0; i < 5; i++) {
      await page.getByTitle('Send', { exact: true }).waitFor();
      const count = await page.locator('[data-ccv-role="assistant"] .chat-md h1').count();
      await page.locator('textarea').fill(`warm ${engine} ${i}`);
      await page.locator('textarea').press('Enter');
      await page.waitForFunction(n => document.querySelectorAll('[data-ccv-role="assistant"] .chat-md h1').length > n, count);
      await page.getByTitle('Send', { exact: true }).waitFor();
      await page.locator('textarea').fill('ask fixture');
      await page.locator('textarea').press('Enter');
      const modal = page.getByRole('dialog'); await modal.waitFor();
      await modal.getByRole('button', { name: 'Minimise (keep pending)', exact: true }).click();
      const inline = page.locator('[data-ccv-role="assistant"] [data-ccv-quotable="ask-question"]');
      await inline.waitFor();
      await page.waitForTimeout(500);
      assert.equal(await inline.count(), 1, 'a completed old response must not displace the pending form');
      await inline.locator('..').getByRole('button', { name: 'Cancel', exact: true }).click();
      await inline.waitFor({ state: 'detached' });
      cycles.push({ index: i, inlinePendingForm: true });
    }
    assert.deepEqual(errors, []);
    results.push({ engine, version: browser.version(), reloadsDuringCycles: 0, cycles, errors });
  } finally { await browser.close(); }
}
const path = new URL('../evidence/B6-preview-2026-11-21/warm-result.json', import.meta.url);
writeFileSync(path, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results));
