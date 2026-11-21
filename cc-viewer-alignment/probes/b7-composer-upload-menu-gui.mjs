// Baseline upload entry/hover and real file-picker dispatch; no upload or model send.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const native = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json')), sdk = JSON.parse(readFileSync('/tmp/cxv-b7-sdk-ui-fixture.json'));
const a = (await (await fetch(native.url + 'api/workspaces')).json()).sessions.find(s => s.active);
const out = new URL('../B7-composer-upload-menu/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  try {
    for (const mode of ['ordinary-desktop', 'sdk-desktop', 'sdk-pad', 'sdk-phone']) {
      const phone = mode.endsWith('phone'), pad = mode.endsWith('pad'), ordinary = mode.startsWith('ordinary');
      const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : pad ? { width: 1024, height: 768 } : { width: 1440, height: 1000 }, locale: 'en-US' }); const errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() === 'POST') requests.push(r.url()); });
      await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
      await page.goto((ordinary ? native.url + '?instance=' + a.instanceKey : sdk.a.url) + (phone ? '&mobile=1' : pad ? '&ipad=1' : ''));
      if (ordinary) { await page.locator('.xterm-helper-textarea').waitFor({ state: 'attached' }); await page.getByText('Terminal', { exact: true }).click(); }
      const bar = page.locator('[class*="chatInputBar_"]').filter({ visible: true }).first(); await bar.waitFor();
      assert.equal(await bar.locator('button[title="Upload File"]').count(), 0, 'the old standalone desktop upload button is absent');
      const quick = bar.getByRole('button', { name: phone || pad ? 'More' : 'Quick settings', exact: true }); await quick.click();
      const menu = bar.locator('[class*="plusMenu_"]').filter({ visible: true }).first(); const upload = menu.getByRole('button', { name: 'Upload File', exact: true }); await upload.waitFor();
      if (!phone && !pad) {
        assert.equal(await menu.locator('button').first().innerText(), 'Upload File');
        const group = menu.locator('[class*="quickMenuGroup_"]').last();
        await group.locator('button').first().hover(); await page.waitForTimeout(180);
        assert.ok((await group.getAttribute('class')).includes('quickMenuGroupOpen_'));
        await upload.hover(); await page.waitForTimeout(180);
        assert.ok(!(await group.getAttribute('class')).includes('quickMenuGroupOpen_'), 'upload hover retires the expanded cascade');
        const css = await upload.evaluate(el => { const s = getComputedStyle(el); return { font: s.fontSize, display: s.display, height: el.getBoundingClientRect().height }; });
        const menuShot = `${engine}-${mode}-menu.png`; await page.screenshot({ path: join(out.pathname, menuShot) });
        const picker = page.waitForEvent('filechooser'); await upload.click(); const chooser = await picker; assert.equal(chooser.isMultiple(), false); await chooser.setFiles([]);
        await menu.waitFor({ state: 'hidden' });
        results.push({ engine, version: browser.version(), mode, uploadFirst: true, cascadeRetiredOnHover: true, realFileChooser: true, menuClosedBeforePick: true, css, screenshots: [menuShot] });
      } else {
        const screenshot = `${engine}-${mode}-flat-menu.png`; await page.screenshot({ path: join(out.pathname, screenshot) });
        results.push({ engine, version: browser.version(), mode, emulated: true, originalFlatUploadEntryPreserved: true, screenshots: [screenshot] });
      }
      assert.deepEqual(errors, []); assert.ok(!requests.some(url => /api\/(upload|sdk-user-message)/.test(url)));
      await page.close();
    }
  } finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify({ noFileUploadOrModelSend: true, cases: results }, null, 2) + '\n'); console.log(JSON.stringify(results));
