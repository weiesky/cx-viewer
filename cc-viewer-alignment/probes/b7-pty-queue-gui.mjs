// Actual native Codex + task-owned local model response service; no app state injection.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const out = new URL('../B7-pty-queue/', import.meta.url); mkdirSync(out, { recursive: true });
const get = async path => (await fetch(f.url + path)).json();
const control = action => fetch(`http://127.0.0.1:${f.modelPort}/control/${action}`).then(r => r.json());
const wait = async predicate => { const end = Date.now() + 15000; while (!await predicate()) { assert.ok(Date.now() < end, 'local model deadline'); await new Promise(r => setTimeout(r, 50)); } };
const boot = (await get('api/workspaces')).sessions.find(s => s.active);
assert.equal((await get('api/cli-mode')).ptyQueueAvailable, true);
let sibling = (await get('api/workspaces')).sessions.find(s => s.cwd === f.b);
if (!sibling) { const r = await fetch(f.url + 'api/workspaces/launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: f.b }) }); assert.equal(r.status, 200); sibling = await r.json(); }
await wait(async () => { sibling = (await get('api/workspaces')).sessions.find(s => s.instanceKey === sibling.instanceKey); return !!sibling.sessionId; });
assert.notEqual(boot.sessionId, sibling.sessionId);
const selectedEngine = process.env.B7_GUI_ENGINE;
const results = selectedEngine ? JSON.parse(readFileSync(join(out.pathname, 'partial.json'))).filter(row => row.engine !== selectedEngine) : [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]].filter(([name]) => !selectedEngine || name === selectedEngine)) for (const mode of ['desktop', 'pad', 'phone']) {
  const browser = await type.launch({ headless: true });
  const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 430, height: 932 } : mode === 'pad' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = [], frames = [], shots = []; page.on('pageerror', e => errors.push(e.message));
  page.on('websocket', ws => { if (ws.url().includes('/ws/terminal')) ws.on('framereceived', data => { try { const frame = JSON.parse(data.payload); if (frame.type.startsWith('queue-')) frames.push(frame); } catch {} }); });
  await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country_code: 'SG', country: 'SG' } }));
  const url = f.url + '?instance=' + boot.instanceKey + (mode === 'phone' ? '&mobile=1' : mode === 'pad' ? '&ipad=1' : '');
  const shot = async name => { const file = `${engine}-${mode}-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  const textarea = () => page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first();
  const enterChat = async () => { await page.goto(url); if (mode === 'desktop') { await page.getByText('Terminal', { exact: true }).click(); } await textarea().waitFor(); };
  const rows = () => page.locator('[class*="queueBubble_"]');
  const send = async text => { await textarea().fill(text); await textarea().press('Enter'); };
  const seenByModel = text => JSON.parse(readFileSync(join(f.root, 'model-calls.json'))).some(call => call.body.includes(text));
  try {
    console.log(engine, mode, 'start'); await control('release'); await enterChat();
    const marker = `${engine}-${mode}-${Date.now()}`, queued = 'B7 QUEUED ' + marker + '\nOriginal second line', removed = 'B7 REMOVE ' + marker;
    await control('hold'); await send('B7 HOLD ' + marker); await page.getByRole('button', { name: 'Stop', exact: true }).waitFor();
    await wait(async () => (await control('hold')).waiting > 0);
    await send(queued); await rows().filter({ hasText: queued }).waitFor();
    assert.equal(await page.locator('[data-ccv-role="user"]').filter({ hasText: queued }).count(), 0);
    assert.equal(seenByModel(queued.split('\n')[0]), false);
    await send(removed); await rows().filter({ hasText: removed }).waitFor(); assert.equal(await rows().count(), 2);
    await rows().filter({ hasText: removed }).getByRole('button', { name: 'Remove', exact: true }).click(); await rows().filter({ hasText: removed }).waitFor({ state: 'hidden' });
    const css = await rows().first().evaluate(el => { const style = getComputedStyle(el), box = el.getBoundingClientRect(); return { radius: style.borderRadius, clamp: getComputedStyle(el.firstElementChild).webkitLineClamp, width: box.width, height: box.height, right: box.right, viewport: innerWidth }; });
    assert.equal(css.clamp, '2'); assert.equal(css.radius, mode === 'phone' ? '21px' : '16px'); assert.ok(css.right <= css.viewport + 1); await shot('queued');
    await enterChat(); await rows().filter({ hasText: queued }).waitFor(); assert.equal(await rows().count(), 1);
    const siblingPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
    const siblingFrames = []; siblingPage.on('websocket', ws => { if (ws.url().includes('/ws/terminal')) ws.on('framereceived', data => { try { siblingFrames.push(JSON.parse(data.payload)); } catch {} }); });
    await siblingPage.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country_code: 'SG', country: 'SG' } }));
    await siblingPage.goto(f.url + '?instance=' + sibling.instanceKey); await siblingPage.locator(`[data-sdk-workspace="${sibling.instanceKey}"]`).waitFor();
    await wait(() => siblingFrames.some(frame => frame.type === 'queue-state' && frame.instanceKey === sibling.instanceKey && frame.transport === 'pty'));
    assert.equal(siblingFrames.find(frame => frame.type === 'queue-state' && frame.transport === 'pty').items.length, 0);
    assert.equal(await siblingPage.locator('[class*="queueBubble_"]').count(), 0); await siblingPage.close();
    await page.getByRole('button', { name: 'Stop', exact: true }).click(); await control('release'); await page.waitForTimeout(800);
    assert.equal(await rows().count(), 1); assert.equal(seenByModel(queued.split('\n')[0]), false); await shot('stopped-parked');
    await rows().first().getByRole('button', { name: 'Send now', exact: true }).click(); await rows().waitFor({ state: 'hidden', timeout: 12000 });
    await page.locator('[data-ccv-role="user"]').filter({ hasText: queued }).waitFor({ timeout: 15000 });
    await wait(() => seenByModel(queued.split('\n')[0])); assert.equal(await page.locator('[data-ccv-role="user"]').filter({ hasText: queued }).count(), 1);
    assert.equal(seenByModel(removed), false);
    await page.getByRole('button', { name: 'Send', exact: true }).waitFor();
    await control('hold'); await send('B7 AUTO HOLD ' + marker); await page.getByRole('button', { name: 'Stop', exact: true }).waitFor();
    await wait(async () => (await control('hold')).waiting > 0);
    const automatic = 'B7 AUTO QUEUED ' + marker; await send(automatic); await rows().filter({ hasText: automatic }).waitFor(); await control('release');
    await rows().waitFor({ state: 'hidden', timeout: 12000 }); await page.locator('[data-ccv-role="user"]').filter({ hasText: automatic }).waitFor({ timeout: 15000 });
    await wait(() => seenByModel(automatic)); await page.getByRole('button', { name: 'Send', exact: true }).waitFor();
    assert.equal(await page.locator('[data-ccv-role="user"]').filter({ hasText: automatic }).count(), 1); await shot('native-dispatched');
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), mode, emulated: mode !== 'desktop', nativeCodex: '0.169.0', localCannedModel: true,
      distinctNativeSessionIds: true, busyEnqueue: true, noPrematureUserBubble: true, reloadReplay: true, siblingIsolation: true, remove: true, stopParks: true, sendNow: true, automaticDrain: true, uniqueNativeUserEcho: true, queueFrames: frames.length, css, screenshots: shots, errors });
    writeFileSync(join(out.pathname, 'partial.json'), JSON.stringify(results, null, 2) + '\n');
  } catch (error) { await page.screenshot({ path: join(out.pathname, `${engine}-${mode}-failure.png`) }); console.error((await page.locator('body').innerText()).slice(-2200)); throw error; }
  finally { await control('release'); await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
