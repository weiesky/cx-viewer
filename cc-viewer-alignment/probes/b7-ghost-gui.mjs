// Controlled suggestion state in the actual production ChatView, not a model inference.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const boot = (await (await fetch(f.url + 'api/workspaces')).json()).sessions.find(view => view.active);
const out = new URL('../B7-ghost/', import.meta.url); mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) for (const mode of ['desktop', 'pad', 'phone']) {
  const browser = await type.launch({ headless: true });
  const page = await browser.newPage({ viewport: mode === 'desktop' ? { width: 1440, height: 1000 } : mode === 'pad' ? { width: 1024, height: 768 } : { width: 430, height: 932 }, locale: 'en-US' });
  await page.addInitScript(() => { window.SpeechRecognition = class {
    constructor() { window.__B7Voice = this; } start() {}
    stop() { this.onend?.(); } abort() { this.onend?.(); }
  }; });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
  try {
    await page.goto(f.url + '?instance=' + boot.instanceKey + (mode === 'desktop' ? '' : mode === 'pad' ? '&ipad=1' : '&mobile=1'));
    if (mode === 'desktop') await page.getByText('Terminal', { exact: true }).click();
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    await ta.fill(''); await ta.press('Tab'); await page.waitForTimeout(250);
    await ta.evaluate(el => {
      let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))];
      while (fiber && !(fiber.stateNode?.setState && Object.hasOwn(fiber.stateNode.state || {}, 'inputSuggestion'))) fiber = fiber.return;
      if (!fiber) throw new Error('Actual ChatView suggestion owner not found');
      window.__B7GhostOwner = fiber.stateNode;
    });
    const suggestion = 'A long suggestion with selectable words and punctuation. '.repeat(40);
    await page.evaluate(text => window.__B7GhostOwner.setState({ inputSuggestion: text, inputEmpty: true }), suggestion);
    const ghost = page.locator('[class*="ghostText_"]').filter({ visible: true }); await ghost.waitFor(); await page.waitForTimeout(250);
    const measured = await ghost.evaluate(el => {
      const parent = el.parentElement, ta = parent.querySelector('textarea'), toolbar = parent.closest('[class*="chatInputWrapper_"]').querySelector('[class*="chatInputBottom_"]');
      const g = el.getBoundingClientRect(), row = toolbar.getBoundingClientRect();
      return { clamp: getComputedStyle(el).webkitLineClamp, whiteSpace: getComputedStyle(el).whiteSpace,
        overflow: getComputedStyle(parent).overflow, textareaMin: getComputedStyle(ta).minHeight,
        ghostHeight: g.height, textareaHeight: ta.getBoundingClientRect().height, toolbarGap: row.top - g.bottom };
    });
    assert.equal(measured.clamp, '2'); assert.equal(measured.whiteSpace, 'normal'); assert.equal(measured.overflow, 'hidden');
    assert.equal(measured.textareaMin, mode === 'phone' ? '92px' : '58px'); assert.ok(measured.toolbarGap >= -1);
    let remounted = false;
    if (mode === 'desktop') {
      await page.getByText('Terminal', { exact: true }).click(); await ta.waitFor({ state: 'hidden' });
      await page.getByText('Terminal', { exact: true }).click(); await ghost.waitFor(); await page.waitForTimeout(200);
      assert.equal(await ta.evaluate(el => getComputedStyle(el).minHeight), '58px'); remounted = true;
    }
    const screenshot = `${engine}-${mode}-ghost.png`; await page.screenshot({ path: join(out.pathname, screenshot) });
    await page.evaluate(() => window.__B7GhostOwner.setState({ inputSuggestion: null })); await ghost.waitFor({ state: 'hidden' }); await page.waitForTimeout(250);
    const cleared = await ta.evaluate(el => ({ height: parseFloat(getComputedStyle(el).height), min: getComputedStyle(el).minHeight }));
    if (mode !== 'phone') assert.equal(cleared.height, 37);
    await page.getByRole('button', { name: 'Start voice input', exact: true }).click();
    await page.evaluate(() => {
      const result = [{ transcript: 'Synthetic interim preview '.repeat(30) }]; result.isFinal = false;
      window.__B7Voice.onresult({ results: [result] });
    });
    const interim = page.locator('[class*="interimPreview_"]').filter({ visible: true }); await interim.waitFor();
    const voice = await interim.evaluate(el => { const box = el.parentElement.getBoundingClientRect(), rect = el.getBoundingClientRect();
      const toolbar = el.closest('[class*="chatInputWrapper_"]').querySelector('[class*="chatInputBottom_"]').getBoundingClientRect();
      return { max: getComputedStyle(el).maxHeight, height: rect.height, boxHeight: box.height, visibleHeight: Math.max(0, Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top)), clipping: getComputedStyle(el.parentElement).overflow, toolbarGap: toolbar.top - Math.min(rect.bottom, box.bottom) }; });
    assert.equal(voice.max, '100%'); assert.equal(voice.clipping, 'hidden'); assert.ok(voice.visibleHeight <= voice.boxHeight + 1); assert.ok(voice.toolbarGap >= -1);
    const voiceScreenshot = `${engine}-${mode}-voice-preview.png`; await page.screenshot({ path: join(out.pathname, voiceScreenshot) });
    await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), mode, emulated: mode !== 'desktop', controlledProductionSuggestion: true, measured, cleared, remounted, syntheticVoicePreview: voice, screenshot, voiceScreenshot, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-failure.png`) }); console.error(engine, mode, error); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
