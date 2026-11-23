// Isolated real-browser behavior and layout; native-protocol fixture, no external model.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f = JSON.parse(readFileSync('/tmp/cxv-b9-ui-fixture.json'));
const out = new URL('../B9-gui/', import.meta.url); mkdirSync(out, { recursive: true });
const checks = [];
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/, route => route.fulfill({ json: { country_code: 'SG' } }));
  const errors = [], shots = []; page.on('pageerror', error => errors.push(error.message));
  const shot = async name => { await page.waitForTimeout(300); const file = engine + '-' + name + '.png'; await page.screenshot({ path: join(out.pathname, file) }); shots.push(file); };
  const tasks = async owner => (await (await page.request.get(`http://127.0.0.1:${f.port}/api/scheduled-tasks?instance=${owner.instanceKey}`)).json()).tasks;
  const open = async () => {
    await page.getByRole('button', { name: 'Quick settings', exact: true }).click();
    await page.getByText('Scheduled tasks', { exact: true }).click();
    await page.getByRole('dialog').filter({ hasText: 'Scheduled tasks' }).waitFor();
  };
  const modal = () => page.getByRole('dialog').filter({ hasText: 'Scheduled tasks' });
  const kind = async label => { await modal().locator('[class*="kindSelect_"]').click(); await page.locator('.ant-select-item-option-content').getByText(label, { exact: true }).click(); };
  try {
    await page.goto(f.a.url); await page.getByRole('button', { name: 'Quick settings', exact: true }).waitFor();
    // Remove only this fixture's tasks from a previous probe; both scopes are private to this run.
    for (const owner of [f.a, f.b]) for (const task of await tasks(owner)) await page.request.post(`http://127.0.0.1:${f.port}/api/scheduled-tasks/delete?instance=${owner.instanceKey}`, { data: { id: task.id } });
    await open(); await shot('empty');
    assert.equal(await modal().getByRole('button', { name: 'New task', exact: true }).count(), 0);
    await modal().locator('textarea').fill('B9 GUI ' + engine);
    const chooserWait = page.waitForEvent('filechooser');
    await modal().getByRole('button', { name: 'Add Attachment', exact: true }).click();
    await (await chooserWait).setFiles({ name: 'b9-attachment.txt', mimeType: 'text/plain', buffer: Buffer.from('B9 persistent attachment') });
    await modal().getByText('b9-attachment.txt', { exact: true }).waitFor();
    await kind('One-time');
    const quick = modal().locator('button[class*="onceQuickBtn_"]'); assert.equal(await quick.count(), 5);
    await quick.first().click();
    await page.waitForFunction(() => !!document.querySelector('[class*=scheduleRow_] .ant-picker-input input')?.value);
    assert.ok(await modal().locator('.ant-picker-input input').inputValue());
    await modal().getByRole('radio', { name: 'New isolated session', exact: true }).check();
    await shot('once');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await modal().getByRole('button', { name: 'New task', exact: true }).waitFor();
    const stored = (await tasks(f.a)).find(task => task.prompt === 'B9 GUI ' + engine);
    assert.ok(stored); assert.equal(stored.template, 'none'); assert.equal(stored.schedule.kind, 'once');
    assert.equal(stored.attachments.length, 1); assert.ok(stored.attachments[0].path.includes('/images/'));
    assert.equal(stored.instanceKey, f.a.instanceKey); assert.equal((await tasks(f.b)).length, 0);
    const layout = await modal().locator('[class*="layout_"]').evaluate(el => ({ flex: getComputedStyle(el).flexDirection,
      listWidth: getComputedStyle(el.children[0]).width, gap: getComputedStyle(el).gap }));
    assert.deepEqual(layout, { flex: 'row', listWidth: '260px', gap: '16px' });
    await modal().getByRole('button', { name: 'Run now', exact: true }).click();
    await modal().getByRole('button', { name: 'Open session', exact: true }).waitFor();
    await shot('history');
    await modal().getByRole('switch').click(); await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForFunction(async ({ port, instance, id }) => {
      const data = await (await fetch(`http://127.0.0.1:${port}/api/scheduled-tasks?instance=${instance}`)).json();
      return data.tasks.find(task => task.id === id)?.enabled === false;
    }, { port: f.port, instance: f.a.instanceKey, id: stored.id });
    // Original dirty-draft confirmation, then reopen without changing the saved task.
    await modal().locator('textarea').fill('unsaved'); await modal().getByRole('button', { name: 'Close', exact: true }).click();
    const discard = page.getByRole('dialog').filter({ hasText: 'Discard unsaved changes?' }); await discard.waitFor();
    await discard.getByRole('button', { name: 'OK', exact: true }).click(); await modal().waitFor({ state: 'hidden' });
    assert.equal((await tasks(f.a))[0].prompt, stored.prompt);
    // Same basename, second exact workspace gets an empty manager.
    await page.goto(f.b.url); await page.getByRole('button', { name: 'Quick settings', exact: true }).waitFor(); await open();
    assert.equal(await modal().locator('[class*="listPane_"]').count(), 0); await shot('sibling-empty');
    await modal().getByRole('button', { name: 'Close', exact: true }).click();
    await page.goto(f.a.url); await page.getByRole('button', { name: 'Quick settings', exact: true }).waitFor();
    // Enable only the optional Ask tier via the original third cascade row.
    await page.getByRole('button', { name: 'Quick settings', exact: true }).click();
    await page.getByRole('button', { name: /Question auto-answer/ }).focus();
    await page.getByRole('button', { name: /Question auto-answer/ }).press('Enter');
    await page.getByRole('button', { name: '10 min', exact: true }).click();
    await page.locator('[class*=plusOverlay_]').click({ position: { x: 1, y: 1 } });
    const input = page.locator('textarea:not(.xterm-helper-textarea)').filter({ visible: true }).first();
    await input.fill('ask'); await input.press('Enter');
    await page.getByRole('button', { name: 'Cancel auto-answer', exact: true }).waitFor();
    assert.match(await page.getByRole('timer').filter({ hasText: 'Auto-answering' }).innerText(), /(?:9:5\d|10:00)/);
    await shot('ask-hosted');
    await page.getByRole('button', { name: 'Cancel auto-answer', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel auto-answer', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('radio', { name: 'First', exact: true }).count(), 1);
    await page.getByRole('radio', { name: 'First', exact: true }).click();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    // Mobile uses the original flat (+) row and stacks the original list above the form.
    await page.setViewportSize({ width: 430, height: 932 }); await page.goto(f.a.url + '&mobile=1');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByText('Scheduled tasks', { exact: true }).click(); await modal().waitFor();
    const mobile = await modal().locator('[class*="layout_"]').evaluate(el => ({ flex: getComputedStyle(el).flexDirection,
      horizontalOverflow: el.scrollWidth > el.clientWidth + 1 }));
    assert.equal(mobile.flex, 'column'); assert.equal(mobile.horizontalOverflow, false); await shot('phone');
    await modal().getByRole('button', { name: 'Close', exact: true }).click();
    assert.deepEqual(errors, []); checks.push({ engine, version: browser.version(), layout, mobile, screenshots: shots,
      createSaveRunPauseDiscard: true, exactSiblingScope: true, nativeAskCancelThenManual: true, pageErrors: errors });
  } catch (error) { await shot('failure'); console.error(engine, (await page.locator('body').innerText()).slice(-4000)); throw error; }
  finally { await browser.close(); }
}
writeFileSync(new URL('../B9-gui.json', import.meta.url), JSON.stringify({ isolatedProtocolFixture: true, actualModel: false, checks }, null, 2) + '\n');
console.log(JSON.stringify(checks));
