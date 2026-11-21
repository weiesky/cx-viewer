import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const boot = (await (await fetch(f.url + 'api/workspaces')).json()).sessions.find(s => s.active);
const before = process.env.B7_SPLIT_BEFORE === '1';
const out = before ? new URL('file:///tmp/cxv-b7-e32-before/') : new URL('../B7-narrow-split/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = [], shots = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('cx-viewer-terminal-width', '624'));
  await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
  const shot = async name => { const file = `${engine}-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  try {
    await page.goto(f.url + '?instance=' + boot.instanceKey); const split = page.locator('[class*="splitContainer_"]').last(), chat = page.locator('[class*="chatSection_"]').last(), terminal = page.locator('[class*="terminalPanelWrap_"]').last();
    await terminal.waitFor(); await page.waitForTimeout(300);
    const measure = () => split.evaluate(el => { const chat = el.querySelector('[class*="chatSection_"]'), terminal = el.querySelector('[class*="terminalPanelWrap_"]'); const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; }; return { split: box(el), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft, overflowX: getComputedStyle(el).overflowX, chat: box(chat), chatMinWidth: getComputedStyle(chat).minWidth, terminal: box(terminal) }; });
    const wide = await measure(); assert.ok(wide.chat.width >= 280); assert.equal(wide.scrollWidth, wide.clientWidth); assert.equal(Math.round(wide.terminal.width), 624); await shot('wide');
    await page.setViewportSize({ width: 900, height: 1000 }); await page.waitForTimeout(300); const narrow = await measure(); await shot('narrow-chat');
    if (before) { assert.ok(narrow.chat.width < 280); results.push({ engine, version: browser.version(), before: true, wide, narrow, screenshots: shots }); continue; }
    assert.equal(narrow.chatMinWidth, '280px'); assert.ok(narrow.chat.width >= 280); assert.equal(narrow.overflowX, 'auto'); assert.ok(narrow.scrollWidth > narrow.clientWidth);
    await split.evaluate(el => { el.scrollLeft = el.scrollWidth; }); const scrolled = await measure(); assert.ok(scrolled.scrollLeft > 0); assert.ok(scrolled.terminal.right <= scrolled.split.right + 1); await shot('narrow-terminal');
    await page.getByText('Terminal', { exact: true }).click(); const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor(); await ta.fill('B7 narrow split unsent draft');
    assert.ok((await chat.boundingBox()).width >= 280); await page.getByText('Terminal', { exact: true }).click(); await terminal.waitFor(); assert.ok((await chat.boundingBox()).width >= 280);
    await page.getByText('Terminal', { exact: true }).click(); await ta.waitFor(); assert.equal(await ta.inputValue(), 'B7 narrow split unsent draft'); await shot('hidden-terminal');
    await page.getByText('Terminal', { exact: true }).click(); await page.setViewportSize({ width: 1440, height: 1000 }); await page.waitForTimeout(300); const restored = await measure(); assert.equal(restored.scrollWidth, restored.clientWidth); assert.ok(restored.chat.width >= 280);
    assert.equal((await (await fetch(f.url + 'api/workspaces')).json()).sessions.find(s => s.instanceKey === boot.instanceKey).sessionId, boot.sessionId);
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), realNativePty: true, wide, narrow, scrolled, restored, toggleRetainsDraftAndRoot: true, screenshots: shots, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, engine + '-failure.png') }); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
