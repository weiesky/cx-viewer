// Actual native input investigation; the model is the task-owned local SSE fixture.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const owners = (await (await fetch(f.url + 'api/workspaces')).json()).sessions;
assert.equal(owners.length, 2); assert.notEqual(owners[0].sessionId, owners[1].sessionId);
const calls = () => existsSync(join(f.root, 'model-calls.json')) ? JSON.parse(readFileSync(join(f.root, 'model-calls.json'))) : [];
const wait = async (fn, ms = 8000) => { const end = Date.now() + ms; while (!await fn()) { if (Date.now() > end) return false; await new Promise(r => setTimeout(r, 25)); } return true; };
const out = process.env.B7_SINGLELINE_OUT || '/tmp/cxv-b7-e35-before'; mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  try {
    for (const [ownerIndex, owner] of owners.entries()) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' }); const errors = [], wire = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('websocket', ws => ws.on('framesent', data => { try { const msg = JSON.parse(data.payload); if (['input', 'input-sequential'].includes(msg.type)) wire.push({ at: Date.now(), msg }); } catch {} }));
      await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
      await page.goto(f.url + '?instance=' + owner.instanceKey); await page.locator('.xterm-helper-textarea').waitFor({ state: 'attached' });
      await page.getByText('Terminal', { exact: true }).click();
      const ta = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first(); await ta.waitFor();
      for (let iteration = 0; iteration < 6; iteration++) {
        const marker = `B7 SINGLE ${engine} ${ownerIndex} ${iteration} ${Date.now()}`;
        const text = marker + (iteration % 3 === 1 ? ' abcdefghijklmnopqrstuvwxyz'.repeat(30) : iteration % 3 === 2 ? ' 中文单行输入' : '');
        const baseline = calls().length, wireStart = wire.length;
        await ta.fill(text); await ta.press('Enter');
        const submitted = await wait(() => calls().slice(baseline).some(c => c.body.includes(marker)), 5000);
        const expectedUser = page.locator('[data-ccv-role="user"]').filter({ hasText: marker });
        const echoed = submitted && await wait(async () => (await expectedUser.count()) === 1);
        await wait(async () => !(await page.getByRole('button', { name: 'Stop', exact: true }).count()), 5000);
        const record = { engine, version: browser.version(), ownerIndex, nativeSid: owner.sessionId, iteration, marker, length: text.length, submitted, echoed, wire: wire.slice(wireStart) };
        results.push(record); writeFileSync(join(out, 'result.json'), JSON.stringify(results, null, 2) + '\n');
        if (!submitted || !echoed) { await page.getByText('Terminal', { exact: true }).click(); await page.waitForTimeout(200); await page.screenshot({ path: join(out, `${engine}-${ownerIndex}-${iteration}-failure.png`) }); throw Error(JSON.stringify(record)); }
      }
      assert.deepEqual(errors, []); await page.screenshot({ path: join(out, `${engine}-${ownerIndex}-passed.png`) }); await page.close();
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify(results.map(({wire, ...r}) => r)));
