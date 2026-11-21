// Invoked by b5-search-gui.mjs [browser] menus, using its isolated server/temporary browser.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyFileMenus(page, fixture, repo, engine, drainFetches) {
  const tree = page.locator('[data-file-explorer] [class*="treeContainer_"]');
  await page.locator('[data-file-explorer] [class*="treeItem_"]').first().waitFor();
  const heights = await page.locator('[data-file-explorer] [class*="treeItem_"]').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().height));
  assert.ok(heights.length >= 82); assert.ok(heights.every(height => Math.abs(height - 26) < 0.1));
  assert.equal(await tree.evaluate(el => el.scrollHeight > el.clientHeight), true);
  let menu = page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu');
  const note = tree.getByText('note.txt', { exact: true });
  await note.click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
  assert.equal(await menu.getByText('下载到本地', { exact: true }).count(), 0);
  await page.mouse.click(800, 200); await menu.waitFor({ state: 'hidden' });
  const blank = tree.locator('[class*="treeBlankArea_"]');
  await tree.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await blank.click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
  await menu.getByText('新建文件', { exact: true }).click(); await menu.waitFor({ state: 'hidden' });
  const dialog = page.locator('.ant-modal-confirm'); await dialog.waitFor();
  await dialog.locator('input').fill('menu-created.txt'); await dialog.locator('.ant-btn-primary').click();
  await tree.getByText('menu-created.txt', { exact: true }).waitFor(); await page.waitForTimeout(300);
  assert.equal(existsSync(join(fixture.a.cwd, 'menu-created.txt')), true);
  assert.equal(existsSync(join(fixture.b.cwd, 'menu-created.txt')), false);
  await tree.getByText('menu-created.txt', { exact: true }).click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
  await menu.getByText('重命名', { exact: true }).click(); await menu.waitFor({ state: 'hidden' });
  const inline = tree.locator('[class*="fileNameInput_"]'); await inline.fill('menu-renamed.txt'); await inline.press('Enter');
  await tree.getByText('menu-renamed.txt', { exact: true }).waitFor(); await page.waitForTimeout(300);
  assert.equal(existsSync(join(fixture.a.cwd, 'menu-created.txt')), false);
  assert.equal(existsSync(join(fixture.a.cwd, 'menu-renamed.txt')), true);
  await tree.getByText('menu-renamed.txt', { exact: true }).click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
  await menu.getByText('删除', { exact: true }).click(); await menu.waitFor({ state: 'hidden' }); await dialog.waitFor();
  await dialog.locator('.ant-modal-confirm-btns button').first().click();
  assert.equal(existsSync(join(fixture.a.cwd, 'menu-renamed.txt')), true);
  // Static confirmations outlive a scoped subtree; actual same-page navigation must not retarget the write.
  writeFileSync(join(fixture.b.cwd, 'menu-renamed.txt'), 'B canary');
  await tree.getByText('menu-renamed.txt', { exact: true }).click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
  await menu.getByText('删除', { exact: true }).click(); await menu.waitFor({ state: 'hidden' }); await dialog.waitFor();
  await page.evaluate(url => { history.pushState(null, '', url); dispatchEvent(new PopStateEvent('popstate')); }, fixture.b.url);
  await dialog.locator('.ant-modal-confirm-btns button').last().click();
  await page.waitForFunction(() => !document.querySelector('.ant-modal-confirm'));
  assert.equal(existsSync(join(fixture.a.cwd, 'menu-renamed.txt')), false);
  assert.equal(readFileSync(join(fixture.b.cwd, 'menu-renamed.txt'), 'utf8'), 'B canary');
  // Simulate only the server's remote-affordance bit. All filesystem/download requests use the real scoped server.
  await drainFetches();
  page = await page.context().newPage();
  await page.route('**/api/preferences*', async route => {
    const response = await route.fetch(); const json = await response.json();
    await route.fulfill({ response, json: { ...json, _isLocal: false } });
  });
  await page.goto(fixture.a.url);
  const remoteNote = page.locator('[data-file-explorer]').getByText('note.txt', { exact: true });
  menu = page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu');
  await remoteNote.waitFor();
  await remoteNote.click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
  const pending = page.waitForEvent('download'); await menu.getByText('下载到本地', { exact: true }).click(); await menu.waitFor({ state: 'hidden' });
  const download = await pending; assert.equal(download.suggestedFilename(), 'note.txt');
  assert.deepEqual(readFileSync(await download.path()), readFileSync(join(fixture.a.cwd, 'note.txt')));
  await remoteNote.click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
  const dir = join(repo, 'cc-viewer-alignment/evidence/B5-menus-2026-11-21'); mkdirSync(dir, { recursive: true });
  const screenshot = join(dir, `${engine}-shared-menus-download.png`); await page.screenshot({ path: screenshot, animations: 'disabled' });
  console.log(JSON.stringify({ engine, mode: 'menus', isolatedRoot: fixture.root, rowCount: heights.length,
    rowHeightPx: 26, actualOverflowScroll: true, localDownloadHidden: true, blankAreaCreatesFile: true,
    inlineRename: true, deleteCancelKeepsBytes: true, confirmationAfterViewSwitchStillTargetsA: true,
    siblingCanaryPreserved: true, remotePreferencesSimulated: true, realDownloadBytesExact: true, screenshot }));
}
