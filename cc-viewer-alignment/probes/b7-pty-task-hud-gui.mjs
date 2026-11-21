// Controlled native JSON-RPC -> actual per-owner bridge -> server/WS -> original HUD.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b7-pty-task-fixture.json'));
const control = async (index, mode) => { const res = await fetch(`http://127.0.0.1:${f.owners[index].controlPort}/fixture/control`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) }); assert.equal(res.status, 200); };
const out = new URL('../B7-pty-task-hud/', import.meta.url); mkdirSync(out, { recursive: true }); const results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  try {
    for (const mode of ['desktop', 'pad', 'phone']) {
      console.log(engine, mode);
      await control(0, 'new'); await control(1, 'new'); const pages = [], errors = [];
      try {
        for (const owner of f.owners) {
          const page = await browser.newPage({ viewport: mode === 'phone' ? { width: 390, height: 844 } : mode === 'pad' ? { width: 1024, height: 768 } : { width: 1440, height: 1000 }, locale: 'en-US' }); pages.push(page); page.on('pageerror', e => errors.push(e.message));
          await page.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/, r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { country: 'SG', country_code: 'SG' } }));
          await page.goto(f.url + '?instance=' + owner.instanceKey + (mode === 'phone' ? '&mobile=1' : mode === 'pad' ? '&ipad=1' : ''));
          if (mode === 'desktop') { await page.locator('.xterm-helper-textarea').waitFor({ state: 'attached' }); await page.getByText('Terminal', { exact: true }).click(); }
          await page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first().waitFor();
        }
        const [a, b] = pages, hud = page => page.getByRole('status', { name: 'Tasks', exact: true });
        await control(0, 'start'); await hud(a).waitFor(); assert.equal(await hud(b).count(), 0); assert.ok((await hud(a).innerText()).includes('1/3 tasks'));
        assert.equal(await hud(a).locator('svg').count(), 3); await hud(a).getByRole('button').click(); await a.locator('#task-progress-hud-list').waitFor();
        assert.equal(await a.locator('#task-progress-hud-list').getByText('B7 TASK one running', { exact: true }).count(), 1);
        const expanded = `${engine}-${mode}-expanded.png`; await a.screenshot({ path: join(out.pathname, expanded) });
        await control(0, 'child'); assert.ok(!(await hud(a).innerText()).includes('PRIVATE CHILD TASK')); assert.ok((await hud(a).innerText()).includes('1/3 tasks'));
        await a.reload(); await hud(a).waitFor(); assert.ok((await hud(a).innerText()).includes('B7 TASK one running'), 'refresh replays its own authoritative plan'); assert.equal(await hud(b).count(), 0);
        await control(1, 'start'); await hud(b).waitFor(); assert.ok((await hud(b).innerText()).includes('B7 TASK two running'));
        await control(0, 'complete'); await hud(a).waitFor({ state: 'hidden' }); assert.ok((await hud(b).innerText()).includes('B7 TASK two running'));
        const sibling = `${engine}-${mode}-sibling-retained.png`; await b.screenshot({ path: join(out.pathname, sibling) });
        await control(0, 'start'); await hud(a).waitFor(); await control(0, 'fail'); await hud(a).waitFor({ state: 'hidden' });
        await control(1, 'new'); await hud(b).waitFor({ state: 'hidden' }); assert.deepEqual(errors, []);
        results.push({ engine, version: browser.version(), mode, emulated: mode !== 'desktop', controlledNativeProtocol: true,
          actualPtyRuntimeAndBridge: true, originalHudAndDots: true, refreshReplaysExactOwner: true, childDoesNotReplaceRoot: true,
          completeAndInterruptedHideOwnHud: true, siblingRetained: true, nextPromptResets: true, screenshots: [expanded, sibling] });
      } finally { for (const page of pages) await page.close(); }
    }
  } finally { await browser.close(); }
}
writeFileSync(join(out.pathname, 'result.json'), JSON.stringify({ externalModelOrInstalledNativePlanToolNotClaimed: true, cases: results }, null, 2) + '\n'); console.log(JSON.stringify(results));
