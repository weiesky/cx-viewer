// Real server/native busy turn + exact-owner WS fill; a full queue must restore the GUI draft.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const require = createRequire(new URL('../../packages/app/package.json', import.meta.url)); const WebSocket = require('ws');
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const boot = (await (await fetch(f.url + 'api/workspaces')).json()).sessions.find(s => s.active);
const control = action => fetch(`http://127.0.0.1:${f.modelPort}/control/${action}`).then(r => r.json());
const wait = async fn => { const end = Date.now() + 12000; while (!await fn()) { assert.ok(Date.now() < end); await new Promise(r => setTimeout(r, 20)); } };
const singleLine = process.env.B7_QUEUE_REJECTION_SINGLELINE === '1';
const out = new URL(singleLine ? '../B7-native-singleline-rejection/' : '../B7-pty-queue-rejection/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = [], frames = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country_code: 'SG', country: 'SG' } }));
  const ws = new WebSocket(f.url.replace('http:', 'ws:') + 'ws/terminal?instance=' + boot.instanceKey, { headers: { Origin: f.url.replace(/\/$/, '') } });
  ws.on('message', data => { try { frames.push(JSON.parse(data)); } catch {} });
  try {
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    await control('release'); ws.send(JSON.stringify({ type: 'queue-clear' }));
    await page.goto(f.url + '?instance=' + boot.instanceKey); await page.getByText('Terminal', { exact: true }).click();
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    const marker = engine + '-' + Date.now(); await control('hold'); await ta.fill('B7 rejection HOLD ' + marker + (singleLine ? '' : '\nLocal response only')); await ta.press('Enter');
    await page.getByRole('button', { name: 'Stop', exact: true }).waitFor(); await wait(async () => (await control('hold')).waiting > 0);
    for (let i = 0; i < 50; i++) ws.send(JSON.stringify({ type: 'queue-message', requestId: `fill_${marker}_${i}`, text: `B7 NEVER SEND ${marker} ${i}` }));
    await wait(() => frames.filter(f => f.type === 'queue-message-accepted').length === 50);
    await page.waitForFunction(() => document.querySelectorAll('[class*="queueBubble_"]').length === 50);
    const text = 'B7 RESTORE FULL ' + marker + (singleLine ? '' : '\nUnsent final line'); await ta.fill(text); await ta.press('Enter');
    await wait(async () => (await ta.inputValue()) === text);
    assert.equal(await page.locator('[class*="queueBubble_"]').count(), 50);
    assert.equal(await page.locator('[data-ccv-role="user"]').filter({ hasText: text }).count(), 0);
    assert.equal(JSON.parse(readFileSync(join(f.root, 'model-calls.json'))).some(call => call.body.includes('B7 NEVER SEND ' + marker)), false);
    const screenshot = `${engine}-restored-full-queue.png`; await page.screenshot({ path: join(out.pathname, screenshot) });
    await page.getByRole('button', { name: 'Stop', exact: true }).click(); ws.send(JSON.stringify({ type: 'queue-clear' })); await control('release');
    await page.locator('[class*="queueBubble_"]').first().waitFor({ state: 'hidden' }); assert.equal(await ta.inputValue(), text);
    await page.waitForTimeout(300);
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), realNativeBusyTurn: true, serverCapacity: 50,
      fullRejectionRestoresExactDraft: true, singleLine, noPhantomUserBubble: true, fillNeverSentToModel: true, stopClearPreservesDraft: true, screenshot, errors });
  } catch (error) { await page.screenshot({ path: join(out.pathname, engine + '-failure.png') }); throw error; }
  finally { if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'queue-suppress' })); ws.send(JSON.stringify({ type: 'queue-clear' })); } ws.close(); await control('release'); await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
