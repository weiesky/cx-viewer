// Run after b7-pty-fixture and its initial actual native local reply.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const get = async path => (await fetch(f.url + path)).json();
const a = (await get('api/workspaces')).sessions.find(s => s.active);
assert.ok(a.sessionId);
let b = (await get('api/workspaces')).sessions.find(s => s.cwd === f.b);
if (!b) { const res = await fetch(f.url + 'api/workspaces/launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: f.b }) }); assert.equal(res.status, 200); b = await res.json(); }
const end = Date.now() + 15000;
while (!b.sessionId) { assert.ok(Date.now() < end); await new Promise(r => setTimeout(r, 50)); b = (await get('api/workspaces')).sessions.find(s => s.instanceKey === b.instanceKey); }
assert.notEqual(a.sessionId, b.sessionId);
const snapshot = await fetch(f.url + 'api/log-v2/snapshot?instance=' + b.instanceKey); assert.equal(snapshot.status, 404);
const out = new URL('../B7-native-owner/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
  try {
    await page.goto(f.url + '?instance=' + b.instanceKey); await page.locator(`[data-sdk-workspace="${b.instanceKey}"]`).waitFor();
    await page.getByText('Terminal', { exact: true }).click();
    const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
    assert.equal(await page.locator('[data-ccv-role="user"]').count(), 0); assert.equal(await page.locator('[data-ccv-role="assistant"]').count(), 0);
    assert.ok(!(await page.locator('body').innerText()).includes('B7 native warm local reply only'));
    const screenshot = `${engine}-independent-native-root.png`; await page.screenshot({ path: join(out.pathname, screenshot) });
    const current = (await get('api/workspaces')).sessions; assert.equal(current.find(s => s.instanceKey === a.instanceKey).sessionId, a.sessionId); assert.equal(current.find(s => s.instanceKey === b.instanceKey).sessionId, b.sessionId);
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), a: { instanceKey: a.instanceKey, sessionId: a.sessionId }, b: { instanceKey: b.instanceKey, sessionId: b.sessionId }, realCodex: '0.169.0', bPassiveReadCannotClaimA: true, bArchiveEmpty: true, noBorrowedTranscript: true, screenshot, errors });
  } finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify(results));
