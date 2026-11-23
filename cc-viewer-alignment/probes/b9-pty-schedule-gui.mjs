// Original ordinary PTY toolbar and composer entries against an owned native-protocol fixture.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b9-pty-ui-fixture.json')), first = f.owners[0], sibling = f.owners[1];
const out = new URL('../B9-gui/', import.meta.url), results = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG' } }));
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const modal = () => page.getByRole('dialog').filter({ hasText: 'Scheduled tasks' });
  const shots = [], shot = async name => { await page.waitForTimeout(300); const file = `${engine}-pty-${name}.png`; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  try {
    await page.goto(f.url + '?instance=' + first.instanceKey);
    await page.getByText('Terminal', { exact: true }).waitFor();
    if (!(await page.locator('.xterm').isVisible())) await page.getByText('Terminal', { exact: true }).click();
    await page.locator('button[class*=quickSettingsBtn_]').click();
    await page.getByText('Scheduled tasks', { exact: true }).click(); await modal().waitFor();
    assert.equal(await modal().getByRole('radio', { name: 'New isolated session', exact: true }).count(), 0);
    await modal().locator('textarea').fill('B9 PTY ' + engine); await shot('toolbar');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await modal().getByRole('button', { name: 'New task', exact: true }).waitFor();
    await modal().getByRole('button', { name: 'Run now', exact: true }).click();
    await modal().locator('[class*=history_]').waitFor(); await shot('history');
    const tasks = (await (await page.request.get(f.url + 'api/scheduled-tasks?instance=' + first.instanceKey)).json()).tasks;
    const own = tasks.find(task => task.prompt === 'B9 PTY ' + engine); assert.ok(own); assert.equal(own.instanceKey, first.instanceKey);
    const history = await (await page.request.get(f.url + `api/scheduled-tasks/runs?instance=${first.instanceKey}&id=${own.id}`)).json();
    assert.equal(history.runs.at(-1).status, 'dispatched');
    const foreign = await (await page.request.get(f.url + 'api/scheduled-tasks?instance=' + sibling.instanceKey)).json(); assert.equal(foreign.tasks.length, 0);
    await modal().getByRole('button', { name: 'Close', exact: true }).click(); await modal().waitFor({ state: 'hidden' });
    await page.getByText('Terminal', { exact: true }).click();
    await page.getByRole('button', { name: 'Quick settings', exact: true }).click();
    await page.getByText('Scheduled tasks', { exact: true }).click(); await modal().waitFor();
    assert.equal(await modal().locator('textarea').inputValue(), 'B9 PTY ' + engine);
    await modal().getByRole('button', { name: 'Close', exact: true }).click();
    assert.deepEqual(errors, []); results.push({ engine, version: browser.version(), toolbarAndComposer: true, spawnHidden: true,
      actualPtyQueueAccepted: true, sameNameSiblingEmpty: true, screenshots: shots, pageErrors: errors });
  } catch (error) { await shot('failure'); console.error((await page.locator('body').innerText()).slice(-3000)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(new URL('../B9-pty-gui.json', import.meta.url), JSON.stringify({ controlledNativeProtocol: true, actualPtyRuntime: true, results }, null, 2) + '\n');
console.log(JSON.stringify(results));
