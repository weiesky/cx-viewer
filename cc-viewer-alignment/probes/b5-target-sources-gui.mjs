import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyTargetSources(page, fixture, repo, engine, drainFetches) {
  const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-target-sources-2026-11-21');
  mkdirSync(evidence, { recursive: true });
  const browser = () => page.locator('.ant-modal').filter({ has: page.locator('[class*="gridPane_"]') });
  const cell = name => browser().locator('[class*="grid_"]').getByTitle(name, { exact: true });
  let stage = 'manage';
  try {
    await page.waitForSelector('textarea');
    await page.getByRole('button', { name: '上下文管理', exact: true }).hover();
    await page.getByText('管理', { exact: true }).click();
    const skills = page.locator('.ant-modal').filter({ hasText: 'Skill 管理' });
    const userCard = skills.locator('[class*="skillCard_"]').filter({ hasText: 'target-user-skill' });
    await userCard.waitFor(); await page.waitForTimeout(350);
    await page.screenshot({ path: join(evidence, `${engine}-skill-manager.png`) });
    await userCard.getByTitle('打开文件夹', { exact: true }).press('Enter');
    await cell('user-note.txt').waitFor();
    stage = 'user-tree';
    assert.equal(await browser().locator('aside [class*="treeName_"]').getByText('.agents', { exact: true }).count(), 1);
    await browser().locator('[class*="crumb_"]').getByText('.agents', { exact: true }).click();
    await cell('skills').waitFor();
    assert.equal(await cell('private-sibling.txt').count(), 0);
    await cell('skills').press('Enter'); await cell('target-user-skill').press('Enter');
    await cell('user-note.txt').press('Enter');
    assert.match(await browser().locator('.cm-content').innerText(), /USER_SKILL_BYTES/);
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(evidence, `${engine}-user-skill.png`) });
    await browser().locator('button.ant-modal-close').click(); await browser().waitFor({ state: 'hidden' });
    stage = 'plugin';
    const plugin = skills.locator('[class*="skillFolderChip_"]').filter({ hasText: 'target-plugin-skill' });
    await plugin.getByTitle('打开文件夹', { exact: true }).press('Space');
    await cell('plugin-note.txt').waitFor(); await cell('plugin-note.txt').press('Enter');
    assert.match(await browser().locator('.cm-content').innerText(), /PLUGIN_SKILL_BYTES/);
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(evidence, `${engine}-plugin-skill.png`) });
    await drainFetches();
    console.log(JSON.stringify({ engine, mode: 'target-sources', userKeyboardFolder: true, userAncestorTree: true,
      userAncestorNavigation: true, privateSiblingFiltered: true, userBytes: true, pluginKeyboardFolder: true,
      pluginBytes: true, actualBrowser: page.context().browser().version() }));
  } catch (error) {
    await page.screenshot({ path: `/tmp/cxv-b5-target-sources-${engine}-failure.png` }).catch(() => {});
    console.error('target sources stage', stage); throw error;
  }
}
