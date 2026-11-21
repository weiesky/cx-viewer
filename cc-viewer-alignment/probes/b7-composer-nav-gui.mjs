import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const sdk = JSON.parse(readFileSync('/tmp/cxv-b7-sdk-ui-fixture.json'));
const pty = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const boot = (await (await fetch(pty.url + 'api/workspaces')).json()).sessions.find(session => session.active);
const out = new URL('../B7-composer-nav/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) for (const mode of ['sdk', 'pty', 'pad', 'phone']) {
  const browser = await type.launch({ headless: true });
  const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 430, height: 932 } : mode === 'pad' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 }, locale: 'en-US' });
  // Layout-only SpeechRecognition shim: no microphone permission or audio service.
  await page.addInitScript(() => { window.SpeechRecognition = class { start() {} stop() { this.onend?.(); } abort() { this.onend?.(); } }; });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
  const errors = []; page.on('pageerror', error => errors.push(error.message)); const shots = [];
  const shot = async name => { const file = `${engine}-${mode}-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  try {
    await page.goto(mode === 'pty' ? pty.url + '?instance=' + boot.instanceKey : sdk.a.url + (mode === 'pad' ? '&ipad=1' : mode === 'phone' ? '&mobile=1' : ''));
    if (mode === 'pty') {
      await page.locator('img[class*="navAvatarImg_"]').waitFor();
      assert.equal(await page.locator('img[class*="plusBtnAvatar_"]').count(), 0);
      await page.getByText('Terminal', { exact: true }).click();
    }
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    const avatar = page.locator('img[class*="plusBtnAvatar_"]');
    const mic = page.getByRole('button', { name: 'Start voice input', exact: true }); await mic.waitFor();
    const micSide = await mic.evaluate(el => el.parentElement.className);
    if (mode === 'pad' || mode === 'phone') {
      assert.equal(await avatar.count(), 0); assert.match(micSide, /chatInputBottomLeft_/); await shot('legacy');
    } else {
      await avatar.waitFor(); assert.equal(await page.locator('img[class*="navAvatarImg_"]').count(), 0);
      assert.match(micSide, /chatInputBottomRight_/);
      const dimensions = await avatar.evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, radius: getComputedStyle(el).borderRadius }));
      assert.deepEqual(dimensions, { width: 16, height: 16, radius: '50%' });
      if (mode === 'sdk') {
        await page.locator('[data-ccv-role="assistant"] .chat-md h1').last().waitFor(); await page.waitForTimeout(300);
        await avatar.locator('..').click(); const list = page.locator('[class*="userPromptNavList_"]').filter({ visible: true }); await list.waitFor(); await shot('popover');
        await list.locator('[class*="userPromptNavItem_"]').first().click(); await list.waitFor({ state: 'hidden' });
        await avatar.locator('..').click(); await list.waitFor(); await page.locator('button[class*="userPromptNavMore_"]').filter({ visible: true }).click();
        const modal = page.getByRole('dialog'); await modal.waitFor(); await list.waitFor({ state: 'hidden' }); await shot('more');
        await modal.getByRole('button', { name: 'Close', exact: true }).click(); await modal.waitFor({ state: 'hidden' });
        await page.getByText('Terminal', { exact: true }).click(); await page.locator('.xterm').waitFor(); await avatar.waitFor(); await shot('scratch');
        await page.getByText('Terminal', { exact: true }).click();
      } else {
        await ta.fill('B7 original unmount boundary\nUnsent second line');
        await ta.evaluate(el => el.setSelectionRange(3, 12, 'backward'));
        await page.getByText('Terminal', { exact: true }).click(); await page.locator('img[class*="navAvatarImg_"]').waitFor();
        assert.equal(await avatar.count(), 0); await shot('terminal-shown');
        await page.getByText('Terminal', { exact: true }).click(); await avatar.waitFor();
        assert.equal(await ta.inputValue(), 'B7 original unmount boundary\nUnsent second line');
        assert.deepEqual(await ta.evaluate(el => [el.selectionStart, el.selectionEnd, el.selectionDirection]), [3, 12, 'backward']);
        await shot('terminal-hidden');
      }
    }
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), mode, emulated: mode === 'phone' || mode === 'pad', micSide, syntheticSpeechOnly: true, screenshots: shots, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-failure.png`) }); console.error(engine, mode, (await page.locator('body').innerText()).slice(-2000)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
