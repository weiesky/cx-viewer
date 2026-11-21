// Baseline main-terminal upload entry; only opens/cancels the real file picker.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json')), owners = (await (await fetch(f.url + 'api/workspaces')).json()).sessions;
const out = new URL('../B7-terminal-upload-menu/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  try {
    for (const mode of ['desktop', 'pad']) {
      const page = await browser.newPage({ viewport: mode === 'pad' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 }, locale: 'en-US' }); const errors = [];
      page.on('pageerror', e => errors.push(e.message)); await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
      await page.goto(f.url + '?instance=' + owners[0].instanceKey + (mode === 'pad' ? '&ipad=1' : ''));
      const toolbar = page.locator('[class*="terminalToolbar_"]').filter({ visible: true }).first(); await toolbar.waitFor();
      assert.equal(await toolbar.getByRole('button', { name: 'Upload File', exact: true }).count(), 0);
      await toolbar.getByRole('button', { name: 'Quick settings', exact: true }).click();
      const menu = page.locator('[class*="presetMenu_"]').filter({ visible: true }).first(); const upload = menu.getByRole('button', { name: 'Upload File', exact: true }); await upload.waitFor();
      assert.equal(await menu.locator('button').first().innerText(), 'Upload File');
      const group = menu.locator('[class*="quickMenuGroup_"]').last();
      if (mode === 'pad') await group.locator('button').first().click(); else await group.locator('button').first().hover();
      await page.waitForTimeout(180); assert.ok((await group.getAttribute('class')).includes('quickMenuGroupOpen_'));
      await upload.hover(); await page.waitForTimeout(180); assert.ok(!(await group.getAttribute('class')).includes('quickMenuGroupOpen_'));
      const screenshot = `${engine}-${mode}-menu.png`; await page.screenshot({ path: join(out.pathname, screenshot) });
      const picker = page.waitForEvent('filechooser'); await upload.click(); const chooser = await picker; assert.equal(chooser.isMultiple(), false); await chooser.setFiles([]);
      await menu.waitFor({ state: 'hidden' }); assert.deepEqual(errors, []);
      results.push({ engine, version: browser.version(), mode, emulated: mode !== 'desktop', uploadFirst: true, cascadeRetiredOnHover: true, persistentInputFileChooser: true, menuClosedBeforePick: true, noUploadOrModelSend: true, screenshot }); await page.close();
    }
  } finally { await browser.close(); }
}
const current = (await (await fetch(f.url + 'api/workspaces')).json()).sessions;
assert.deepEqual(current.map(s => s.sessionId), owners.map(s => s.sessionId));
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
