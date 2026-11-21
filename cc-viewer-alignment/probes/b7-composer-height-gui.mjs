import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const sessions = await (await fetch(f.url + 'api/workspaces')).json();
const boot = sessions.sessions.find(view => view.active);
const out = new URL('../B7-composer-height/', import.meta.url); mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) for (const mode of ['desktop', 'pad', 'phone']) {
  const viewport = mode === 'desktop' ? { width: 1800, height: 1000 } : mode === 'pad' ? { width: 1024, height: 768 } : { width: 430, height: 932 };
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport, locale: 'en-US' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
  try {
    await page.goto(f.url + '?instance=' + boot.instanceKey + (mode === 'desktop' ? '' : mode === 'pad' ? '&ipad=1' : '&mobile=1'));
    if (mode === 'desktop') await page.getByText('Terminal', { exact: true }).click();
    const ta = page.locator('textarea').filter({ visible: true }).first(); await ta.waitFor();
    await ta.fill(''); await ta.focus(); await page.waitForTimeout(300);
    const short = await ta.evaluate(el => ({ height: el.getBoundingClientRect().height, min: getComputedStyle(el).minHeight, line: getComputedStyle(el).lineHeight }));
    if (mode !== 'phone') assert.equal(short.height, 58);
    await ta.fill(Array.from({ length: 16 }, (_, i) => `Line ${i + 1}: B7 draft`).join('\n'));
    await page.waitForTimeout(300);
    const long = await ta.evaluate(el => ({ height: el.getBoundingClientRect().height, cssHeight: parseFloat(getComputedStyle(el).height), scroll: el.scrollHeight, max: getComputedStyle(el).maxHeight,
      width: el.closest('[class*="chatInputWrapper_"]').getBoundingClientRect().width, value: el.value }));
    assert.equal(mode === 'phone' ? long.cssHeight : long.height, mode === 'phone' ? 160 : 268); assert.ok(long.scroll > long.cssHeight); assert.equal(long.value.split('\n').length, 16);
    if (mode === 'desktop') assert.ok(long.width <= 1002 && long.width >= 990);
    const screenshot = `${engine}-${mode}-12lines.png`; await page.screenshot({ path: join(out.pathname, screenshot) });
    await ta.fill(''); await ta.press('Tab'); await page.waitForTimeout(300);
    const resting = await ta.evaluate(el => el.getBoundingClientRect().height);
    if (mode !== 'phone') assert.equal(resting, 37);
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), mode, emulated: mode !== 'desktop', viewport, short, long: { ...long, value: undefined }, resting, screenshot, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-failure.png`) }); console.error(engine, mode, (await page.locator('body').innerText()).slice(-1500)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
