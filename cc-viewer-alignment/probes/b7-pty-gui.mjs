import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const out = new URL('../B7-pty-gui/', import.meta.url); mkdirSync(out, { recursive: true });
const get = async path => (await fetch(f.url + path)).json();
const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = [], shots = []; page.on('pageerror', error => { errors.push(error.message); console.log(engine, 'PAGEERROR', error.name, error.stack); });
  const shot = async name => { const file = `${engine}-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  try {
    console.log(engine, 'boot');
    const bootView = (await get('api/workspaces')).sessions.find(view => view.active);
    await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG', country: 'Singapore' } }));
    await page.goto(f.url + '?instance=' + bootView.instanceKey);
    await page.waitForURL(url => url.searchParams.has('instance'));
    const plus = page.getByRole('button', { name: 'New workspace', exact: true }); await plus.waitFor();
    const before = await get('api/workspaces'), boot = before.sessions.find(view => view.active);
    assert.equal(boot.transport, 'pty');
    const stream = await get('api/terminal-recovery');
    await page.waitForTimeout(250);
    await plus.waitFor({ state: 'visible' });
    const plusStyle = await plus.evaluate(el => { const style = getComputedStyle(el), rect = el.getBoundingClientRect(); return { width: rect.width, height: rect.height, borderStyle: style.borderStyle }; });
    assert.deepEqual(plusStyle, { width: 16, height: 16, borderStyle: 'dashed' });
    await plus.click(); const modal = page.getByRole('dialog', { name: 'New workspace', exact: true }); await modal.waitFor(); await shot('picker');
    await modal.getByRole('button', { name: 'Close', exact: true }).click(); await modal.waitFor({ state: 'hidden' });
    assert.equal(new URL(page.url()).searchParams.get('instance') || boot.instanceKey, boot.instanceKey); assert.equal((await get('api/terminal-recovery')).streamId, stream.streamId);
    assert.equal((await get('api/workspaces')).sessions.find(view => view.instanceKey === boot.instanceKey).running, true);
    console.log(engine, 'launch picker');
    await plus.click(); await page.getByRole('button', { name: /Browse Directory/ }).click();
    const directory = page.locator('[role=dialog]').filter({ has: page.getByRole('textbox') }); await directory.waitFor();
    await page.waitForFunction(root => [...document.querySelectorAll('input')].some(el => el.value === root), f.root);
    await directory.getByRole('textbox').fill(f.b); await directory.getByRole('textbox').press('Enter');
    await directory.getByRole('button', { name: /same/ }).last().waitFor();
    await directory.getByRole('button', { name: /same/ }).last().click();
    console.log(engine, 'launched');
    await page.waitForURL(url => url.searchParams.has('instance') && url.searchParams.get('instance') !== boot.instanceKey); await page.getByRole('button', { name: 'New workspace', exact: true }).waitFor();
    const key = new URL(page.url()).searchParams.get('instance');
    const listed = await get('api/workspaces?instance=' + key); const native = listed.sessions.find(view => view.instanceKey === key);
    assert.equal(native.cwd, f.b); assert.equal(native.transport, 'pty'); assert.equal(native.running, true);
    assert.equal(listed.sessions.find(view => view.instanceKey === boot.instanceKey).running, true);
    assert.equal((await get('api/cli-mode?instance=' + key)).sdkMode, false);
    const tabs = page.locator('[data-sdk-workspace]'); await tabs.first().waitFor(); assert.equal(await tabs.count(), 2);
    const bContent = await (await fetch(f.url + 'api/file-content?path=owner.txt&instance=' + key)).json(); assert.equal(bContent.content, 'B');
    await shot('parallel');
    await page.locator(`[data-sdk-workspace="${boot.instanceKey}"]`).click(); await page.waitForURL(url => url.searchParams.get('instance') === boot.instanceKey);
    assert.equal((await get('api/terminal-recovery?instance=' + boot.instanceKey)).streamId, stream.streamId);
    await shot('returned-boot');
    // Keep the server for the second engine and later composer verification.
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), plusStyle,
      nativeCli: true, cancelPreservesBoot: true, launchPreservesBoot: true, exactOwner: true,
      sdkMode: false, switchedBackSameStream: true, screenshots: shots, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-failure.png`) }); console.error((await page.locator('body').innerText()).slice(-2200)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
