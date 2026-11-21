import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyFileBrowser(page, fixture, repo, engine, mode) {
  let stage = 'open';
  try {
    await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
    if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
    const posts = []; page.on('request', req => { if (req.method() === 'POST') posts.push(new URL(req.url()).pathname); });
    await page.getByTitle('浏览项目文件', { exact: true }).click();
    const modal = page.locator('.ant-modal').filter({ has: page.locator('[class*="gridPane_"]') });
    await modal.waitFor(); const grid = () => modal.locator('[class*="grid_"]');
    const cell = name => grid().getByTitle(name, { exact: true });
    const toolbar = () => modal.locator('[class*="toolbar_"]');
    const tree = modal.locator('aside');
    await cell('browser-fixture').waitFor();
    assert.equal(posts.includes('/api/open-project-dir'), false);
    await page.waitForTimeout(350);
    const size = await modal.boundingBox(); assert.ok(size.width <= (await page.viewportSize()).width);
    assert.equal(await tree.evaluate(el => parseFloat(getComputedStyle(el).width)), 240);
    await cell('browser-fixture').press('Enter'); await cell('sub').waitFor();
    await cell('pic.svg').locator('img').waitFor();
    await cell('pic.svg').locator('img').evaluate(el => el.decode());
    assert.equal(await cell('pic.svg').locator('img').evaluate(el => el.complete && el.naturalWidth > 0), true);
    stage = 'nested-tree-open';
    await cell('sub').press('Enter'); await cell('child.txt').waitFor();
    for (const name of ['browser-fixture', 'sub']) {
      const row = tree.getByTitle(name, { exact: true }); await row.waitFor();
      if (await row.getAttribute('aria-expanded') === 'false') await row.locator('[role="button"]').click();
    }
    await tree.getByTitle('child.txt', { exact: true }).click();
    await modal.locator('.cm-content').waitFor(); assert.match(await modal.locator('.cm-content').innerText(), /NESTED_A/);
    await modal.locator('.cm-content').click(); await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(' appended'); await page.keyboard.press('ControlOrMeta+s');
    await modal.getByText('已保存', { exact: true }).waitFor();
    assert.equal(readFileSync(join(fixture.a.cwd, 'browser-fixture/sub/child.txt'), 'utf8'), 'NESTED_A appended');
    assert.equal(readFileSync(join(fixture.b.cwd, 'browser-fixture/sub/child.txt'), 'utf8'), 'NESTED_B');
    const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-browser-2026-11-21'); mkdirSync(evidence, { recursive: true });
    const previewShot = join(evidence, `${engine}-${mode}-nested-preview.png`); await page.screenshot({ path: previewShot, animations: 'disabled' });
    await modal.getByTitle('返回对话', { exact: true }).first().click();
    await toolbar().waitFor(); await toolbar().getByTitle('上一级', { exact: true }).click(); await cell('root.txt').waitFor();
    stage = 'upload';
    await modal.locator('input[type="file"]').setInputFiles({ name: 'uploaded.txt', mimeType: 'text/plain', buffer: Buffer.from('uploaded A bytes') });
    await cell('uploaded.txt').waitFor(); assert.equal(readFileSync(join(fixture.a.cwd, 'browser-fixture/uploaded.txt'), 'utf8'), 'uploaded A bytes');
    assert.equal(existsSync(join(fixture.b.cwd, 'browser-fixture/uploaded.txt')), false);
    stage = 'reject-toolbar-drop';
    const before = posts.length;
    await toolbar().evaluate(el => {
      const file = new File(['rejected'], 'rejected.txt'); const e = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'dataTransfer', { value: { types: ['Files'], files: [file], items: [] } }); el.dispatchEvent(e);
    });
    await page.waitForTimeout(150); assert.equal(posts.length, before); assert.equal(existsSync(join(fixture.a.cwd, 'rejected.txt')), false);
    stage = 'grid-move';
    const [moved] = await Promise.all([page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/move-file')), cell('root.txt').dragTo(cell('dest'))]);
    assert.equal(moved.ok(), true); await cell('dest').press('Enter'); await cell('root.txt').waitFor();
    const [toRoot] = await Promise.all([page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/move-file')), cell('root.txt').dragTo(toolbar().getByText('项目', { exact: true }))]);
    assert.equal((await toRoot.json()).newPath, 'root.txt'); assert.equal(readFileSync(join(fixture.a.cwd, 'root.txt'), 'utf8'), 'ROOT_A');
    assert.equal(readFileSync(join(fixture.b.cwd, 'browser-fixture/root.txt'), 'utf8'), 'ROOT_B');
    stage = 'empty-retry';
    await toolbar().getByText('项目', { exact: true }).click(); await cell('browser-fixture').press('Enter');
    let fail = true; await page.route('**/api/files?*', route => {
      if (new URL(route.request().url()).searchParams.get('path') === 'browser-fixture/empty' && fail) { fail = false; return route.fulfill({ status: 500, json: { error: 'Fixture failure' } }); }
      return route.continue();
    });
    await cell('empty').press('Enter'); await grid().getByText('加载目录失败', { exact: true }).click();
    await grid().getByText('此文件夹为空', { exact: true }).waitFor();
    stage = 'reopen';
    await modal.locator('button.ant-modal-close').click(); await modal.waitFor({ state: 'hidden' });
    writeFileSync(join(fixture.a.cwd, 'after-reopen.txt'), 'new snapshot');
    await page.getByTitle('浏览项目文件', { exact: true }).click(); await cell('after-reopen.txt').waitFor();
    stage = 'shared-menus';
    let menu = page.locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu');
    const box = await grid().boundingBox(); await grid().click({ button: 'right', position: { x: box.width - 8, y: box.height - 8 } });
    await menu.waitFor(); await page.waitForTimeout(300); await menu.getByText('新建文件', { exact: true }).click();
    let confirm = page.locator('.ant-modal-confirm'); await confirm.locator('input').fill('modal-created.txt'); await confirm.locator('.ant-btn-primary').click();
    await cell('modal-created.txt').waitFor(); await cell('modal-created.txt').click({ button: 'right' });
    await menu.waitFor(); await page.waitForTimeout(300); await menu.getByText('重命名', { exact: true }).click();
    await confirm.locator('input').fill('modal-renamed.txt'); await confirm.locator('.ant-btn-primary').click();
    await cell('modal-renamed.txt').waitFor(); assert.equal(existsSync(join(fixture.a.cwd, 'modal-renamed.txt')), true);
    const gridShot = join(evidence, `${engine}-${mode}-grid-menus.png`); await page.screenshot({ path: gridShot, animations: 'disabled' });
    stage = 'late-delete';
    writeFileSync(join(fixture.b.cwd, 'modal-renamed.txt'), 'B canary');
    await cell('modal-renamed.txt').click({ button: 'right' }); await menu.waitFor(); await page.waitForTimeout(300);
    await menu.getByText('删除', { exact: true }).click(); await confirm.waitFor();
    await page.evaluate(url => { history.pushState(null, '', url); dispatchEvent(new PopStateEvent('popstate')); }, fixture.b.url);
    await confirm.locator('.ant-modal-confirm-btns button').last().click();
    await confirm.waitFor({ state: 'hidden' }); assert.equal(existsSync(join(fixture.a.cwd, 'modal-renamed.txt')), false);
    assert.equal(readFileSync(join(fixture.b.cwd, 'modal-renamed.txt'), 'utf8'), 'B canary');
    console.log(JSON.stringify({ engine, mode, browserVersion: page.context().browser().version(), noOsFolderRequest: true,
      originalTreeWidth: 240, modalWidth: size.width, imageThumbnail: true, nestedTreeClickNoDuplicatePrefix: true,
      previewEditingExactScope: true, toolbarUpload: true, toolbarRejectsDrop: true, gridMoveAndRootCrumb: true, failedDirectoryRetryAndEmpty: true,
      reopenFreshRoot: true, blankCreateAndModalRename: true, staticDeleteStillTargetsAAfterSwitchB: true,
      siblingCanaryPreserved: true, screenshots: [previewShot, gridShot] }));
  } catch (error) { console.error('File browser stage:', stage); throw error; }
}
