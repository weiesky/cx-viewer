import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export async function verifyGitCommits(page, fixture, repo, engine, mode = 'git-commits') {
  const stats = mode === 'git-stats' || mode === 'git-author'; const count = stats ? 5 : 2;
  await page.getByTitle('Git 变更', { exact: true }).waitFor(); await page.getByTitle('Git 变更', { exact: true }).click();
  const panel = page.locator('[class*=gitChanges_]');
  await panel.getByTitle('B5 A local', { exact: true }).waitFor();
  assert.equal(await panel.locator('[class*=commitItem_]').count(), count);
  assert.equal(await panel.locator('[class*=unpushedHeader_]').getAttribute('title'), '未配置上游——显示不在任何远端上的提交');
  assert.equal(await panel.getByTitle('B5 B local', { exact: true }).count(), 0);
  const url = new URL('/api/git-log-unpushed', fixture.a.url); url.search = new URL(fixture.a.url).search;
  const api = await (await page.request.get(url.href)).json(); assert.equal(api.hasUpstream, false); assert.equal(api.commits.length, count);
  if (mode === 'git-author') assert.equal(await panel.locator('[class*=commitItem_]').filter({ hasText: 'Synthetic A' }).count(), 0);
  if (stats) {
    assert.deepEqual(await panel.getByTitle('B5 A local', { exact: true }).locator('[class*=statBadge_]').allTextContents(), ['+1', '-1']);
    assert.deepEqual(await panel.getByTitle('B5 A binary', { exact: true }).locator('[class*=statBadge_]').allTextContents(), ['1']);
    assert.equal(await panel.getByTitle('B5 A empty', { exact: true }).locator('[class*=statBadge_]').count(), 0);
    const rename = api.commits.find(c => c.subject === 'B5 A rename');
    assert.deepEqual(rename.files.map(f => f.status).sort(), ['A', 'D']); assert.equal(rename.insertions, 1); assert.equal(rename.deletions, 1);
    await panel.getByTitle('B5 A rename', { exact: true }).click();
    await panel.locator('[class*=changeItem_]').getByText('renamed.txt', { exact: true }).waitFor();
    const diff = new URL('/api/git-diff', fixture.a.url); diff.search = url.search;
    diff.searchParams.set('commit', rename.hash); diff.searchParams.set('files', 'tracked.txt,renamed.txt');
    const data = await (await page.request.get(diff.href)).json(); assert.equal(data.diffs.length, 2);
    assert.equal(data.diffs.find(d => d.file === 'tracked.txt').old_content, 'local A\n');
    assert.equal(data.diffs.find(d => d.file === 'renamed.txt').new_content, 'local A\n');
  }
  await panel.getByTitle('B5 A local', { exact: true }).click();
  await panel.locator('[class*=changeItem_]').getByText('tracked.txt', { exact: true }).last().waitFor();
  const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-' + mode + '-2026-11-21'); mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: join(evidence, `${engine}-A.png`), animations: 'disabled' });
  await page.evaluate(url => { history.pushState(null, '', url); dispatchEvent(new PopStateEvent('popstate')); }, fixture.b.url);
  // The existing workspace remount may restore a closed Git panel for B.
  await page.waitForFunction(() => !document.body.textContent.includes('B5 A local'));
  if (!await panel.count()) await page.getByTitle('Git 变更', { exact: true }).click();
  await panel.getByTitle('B5 B local', { exact: true }).waitFor(); assert.equal(await panel.locator('[class*=commitItem_]').count(), count);
  assert.equal(await panel.getByTitle('B5 A local', { exact: true }).count(), 0);
  await page.screenshot({ path: join(evidence, `${engine}-B.png`), animations: 'disabled' });
  console.log(JSON.stringify({ engine, mode, browserVersion: page.context().browser().version(), actualNoRemoteRepos: true,
    originalUnpushedSectionAndTooltip: true, commitFilesExpand: true, lineStatsAndBinaryEmptyFallback: stats, authorHidden: mode === 'git-author', exactInstanceAtoB: true, noSiblingCommits: true }));
}
