import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyTargetFiles(page, fixture, repo, engine, mode, drainFetches) {
  let stage = 'guidance';
  const resources = [];
  page.on('requestfailed', req => { if (/style\.css|app\.js/.test(req.url())) resources.push({ failed: req.failure(), headers: req.headers(), url: req.url() }); });
  page.on('response', res => { if (res.url().includes('/api/file-raw/target/') && /(?:style\.css|app\.js)$/.test(res.url())) resources.push({ name: res.url().split('/').at(-1), status: res.status(), headers: res.request().headers() }); });
  const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-target-files-2026-11-21');
  mkdirSync(evidence, { recursive: true });
  const browser = () => page.locator('.ant-modal').filter({ has: page.locator('[class*="gridPane_"]') });
  const cell = name => browser().locator('[class*="grid_"]').getByTitle(name, { exact: true });
  const openContext = async () => {
    const desktop = page.getByRole('button', { name: '上下文管理', exact: true });
    if (await desktop.count()) { await desktop.hover(); await page.locator('[class*="codexMdChip_"]').first().waitFor(); }
    else await page.locator('[class*="mobileCtxTag_"][role="button"]').click();
  };
  try {
    await page.waitForSelector('textarea');
    await openContext();
    const guidanceChip = page.locator('[class*="codexMdChip_"]').filter({ hasText: '~/.codex/AGENTS.md' });
    await guidanceChip.click();
    const detail = page.locator('.ant-modal').filter({ has: page.locator('[class*="memoryDetailTitle_"]') });
    const icon = detail.getByTitle('打开文件夹', { exact: true });
    await icon.waitFor();
    assert.equal(await detail.locator('[class*="memoryDetailTitle_"]').evaluate(el => getComputedStyle(el).gap), '8px');
    await icon.press('Enter');
    await cell('target-note.txt').waitFor();
    assert.equal(await cell('auth.json').count(), 0); assert.equal(await cell('sessions').count(), 0);
    await page.waitForTimeout(350);
    if (mode === 'target-phone') assert.equal(await browser().locator('aside').isVisible(), false);
    else assert.equal(await browser().locator('aside').evaluate(el => parseFloat(getComputedStyle(el).width)), 240);
    await page.screenshot({ path: join(evidence, `${engine}-${mode}-guidance-folder.png`) });
    if (mode === 'target') {
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      await page.screenshot({ path: join(evidence, `${engine}-${mode}-guidance-dark.png`) });
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    }
    if (mode === 'target-remote') {
      await cell('target-note.txt').click({ button: 'right' });
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('menu').filter({ visible: true }).getByText('下载到本地', { exact: true }).click(),
      ]);
      assert.equal(download.suggestedFilename(), 'target-note.txt');
      assert.equal(readFileSync(await download.path(), 'utf8'), 'Original target bytes');
    }
    stage = 'edit';
    await cell('target-note.txt').press('Enter');
    const editor = browser().locator('.cm-content'); await editor.waitFor();
    await editor.click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('Edited target bytes');
    const [saved] = await Promise.all([
      page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/file-content') && res.request().method() === 'POST'),
      page.keyboard.press('ControlOrMeta+S'),
    ]);
    assert.equal(saved.status(), 200); assert.equal(new URL(saved.url()).searchParams.get('kind'), 'codex-md');
    assert.equal(readFileSync(join(fixture.root, '.codex/target-note.txt'), 'utf8'), 'Edited target bytes');
    await browser().getByTitle('返回对话', { exact: true }).first().click();
    await cell('target-note.txt').waitFor();
    stage = 'context-create-rename';
    await cell('target-note.txt').click({ button: 'right' });
    const menu = page.getByRole('menu').filter({ visible: true });
    assert.equal(await menu.getByText('添加到对话', { exact: true }).count(), 0);
    await menu.getByText('重命名', { exact: true }).click();
    const confirm = page.locator('.ant-modal-confirm');
    await confirm.locator('input').fill('renamed-target.txt');
    await confirm.getByRole('button', { name: '重命名', exact: true }).click();
    await cell('renamed-target.txt').waitFor();
    assert.equal(readFileSync(join(fixture.root, '.codex/renamed-target.txt'), 'utf8'), 'Edited target bytes');
    assert.equal(existsSync(join(fixture.a.cwd, 'renamed-target.txt')), false);
    stage = 'image';
    await cell('target.svg').locator('img').evaluate(el => el.decode());
    await cell('target.svg').press('Enter');
    await browser().locator('svg').filter({ has: page.locator('rect[fill="teal"]') }).waitFor();
    await browser().getByTitle('返回对话', { exact: true }).first().click();
    await cell('report').waitFor();
    stage = 'html-relative';
    await cell('report').press('Enter'); await cell('index.html').press('Enter');
    const iframe = page.locator('iframe[title$="index.html"]'); await iframe.waitFor();
    const frame = await iframe.contentFrame();
    await frame.locator('h1').waitFor();
    await frame.locator('body').evaluate(() => document.readyState === 'complete' ? null : new Promise(resolve => window.addEventListener('load', resolve, { once: true })));
    await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some(el => el.src.includes('/api/file-raw/target/')));
    assert.equal(await frame.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(12, 34, 56)');
    assert.equal(await frame.locator('body').getAttribute('data-target-script'), 'ran');
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(evidence, `${engine}-${mode}-target-html.png`) });
    const htmlModal = page.locator('.ant-modal').filter({ has: iframe }); await htmlModal.locator('button.ant-modal-close').click();
    await iframe.waitFor({ state: 'detached' });
    await browser().locator('button.ant-modal-close').click(); await browser().waitFor({ state: 'hidden' });
    await detail.locator('button.ant-modal-close').click();
    stage = 'skills';
    // The original cache popover remains behind guidance details on desktop.
    if (!await page.getByText('管理', { exact: true }).isVisible()) await openContext();
    await page.getByText('管理', { exact: true }).click();
    const skills = page.locator('.ant-modal').filter({ hasText: 'Skill 管理' });
    const card = skills.locator('[class*="skillCard_"]').filter({ hasText: 'target-project-skill' });
    await card.getByTitle('打开文件夹', { exact: true }).press('Space');
    await cell('SKILL.md').waitFor(); await cell('skill-note.txt').waitFor();
    await cell('skill-note.txt').press('Enter');
    await browser().locator('.cm-content').waitFor();
    assert.match(await browser().locator('.cm-content').innerText(), /PROJECT_SKILL_A/);
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(evidence, `${engine}-${mode}-skill-preview.png`) });
    stage = 'pending-confirm-switch';
    await browser().getByTitle('返回对话', { exact: true }).first().click();
    await cell('skill-note.txt').waitFor(); await cell('skill-note.txt').click({ button: 'right' });
    await page.getByRole('menu').filter({ visible: true }).getByText('删除', { exact: true }).click();
    await page.evaluate(instance => {
      const url = new URL(location.href); url.searchParams.set('instance', instance);
      history.pushState(null, '', url); dispatchEvent(new PopStateEvent('popstate'));
    }, fixture.b.instanceKey);
    await page.getByText('GUI fixture B replied: B5 GUI seed', { exact: true }).waitFor();
    await drainFetches();
    const [deleted] = await Promise.all([
      page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/target-delete-file') && res.request().method() === 'POST'),
      page.locator('.ant-modal-confirm').getByRole('button', { name: /删\s*除/ }).click(),
    ]);
    assert.equal(deleted.status(), 200); assert.equal(new URL(deleted.url()).searchParams.get('instance'), fixture.a.instanceKey);
    assert.equal(existsSync(join(fixture.a.cwd, '.codex/skills/target-project-skill/skill-note.txt')), false);
    assert.equal(readFileSync(join(fixture.b.cwd, '.codex/skills/target-project-skill/skill-note.txt'), 'utf8'), 'PROJECT_SKILL_B');
    console.log(JSON.stringify({ engine, mode, nativeGuidanceFolder: true, keyboardFolder: true, targetEditSave: true,
      targetMenuRename: true, image: true, relativeHtml: true, projectSkillFolder: true, confirmationPinsAAfterB: true, actualBrowser: page.context().browser().version() }));
  } catch (error) {
    await page.screenshot({ path: `/tmp/cxv-b5-target-${engine}-${mode}-failure.png` }).catch(() => {});
    console.error('target stage', stage, JSON.stringify(resources), await page.locator('iframe').evaluateAll(els => els.map(el => el.src)));
    for (const frame of page.frames().slice(1)) console.error('frame', await frame.content().catch(() => 'unavailable'));  throw error;
  }
}
