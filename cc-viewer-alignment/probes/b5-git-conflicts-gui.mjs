import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export async function verifyGitConflicts(page, fixture, repo, engine) {
  await page.getByTitle('Git 变更', { exact: true }).waitFor(); await page.getByTitle('Git 变更', { exact: true }).click();
  const panel = page.locator('[class*=gitChanges_]'); await panel.getByText('conflict-UU.txt', { exact: true }).waitFor();
  const url = new URL('/api/git-status', fixture.a.url); url.search = new URL(fixture.a.url).search;
  const data = await (await page.request.get(url.href)).json();
  for (const code of ['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD']) {
    assert.equal(data.changes.find(row => row.file === 'conflict-' + code + '.txt').status, code);
    const row = panel.getByText('conflict-' + code + '.txt', { exact: true }).locator('..');
    const badge = row.locator('[class*=status_]'); assert.equal(await badge.innerText(), code);
    assert.equal(await badge.evaluate(el => getComputedStyle(el).color), 'rgb(241, 76, 76)');
  }
  const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-git-conflicts-2026-11-21'); mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: join(evidence, `${engine}.png`), animations: 'disabled' });
  console.log(JSON.stringify({ engine, mode: 'git-conflicts', browserVersion: page.context().browser().version(),
    actualGitUnmergedIndex: true, statuses: ['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD'], allOriginalRed: true, realScopedStatusEndpoint: true }));
}
