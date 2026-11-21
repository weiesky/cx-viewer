import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
export async function verifyGitScope(page, fixture, drainFetches) {
  await page.getByText('GUI fixture A replied: B5 GUI seed', { exact: true }).waitFor();
  await drainFetches();
  let stage = 'hold-list'; const requests = [], restores = [];
  const a = new URL(fixture.a.url).searchParams.get('instance');
  page.on('request', req => {
    const url = new URL(req.url()); if (url.pathname.startsWith('/api/git-')) requests.push({ path: url.pathname, instance: url.searchParams.get('instance') });
    if (req.method() === 'POST' && url.pathname === '/api/git-restore') restores.push({ instance: url.searchParams.get('instance'), body: req.postDataJSON() });
  });
  await page.evaluate(a => {
    const originalFetch = window.fetch; let first = true; window.__b5GitTrace = [];
    window.__b5UnwrapGitListing = () => { window.fetch = originalFetch; };
    window.fetch = async (input, options) => {
      const url = new URL(String(input), window.location.href); if (url.pathname.startsWith('/api/git-')) window.__b5GitTrace.push({ path: url.pathname, instance: url.searchParams.get('instance') }); const response = await originalFetch(input, options);
      if (first && url.pathname === '/api/git-repos' && url.searchParams.get('instance') === a) {
        first = false; const json = response.json.bind(response);
        response.json = async () => {
          const data = await json(); window.__b5GitListingCount = data.repos.length;
          await new Promise(resolve => { window.__b5ReleaseGitListing = resolve; }); window.__b5ListingResumed = true; return data;
        };
      }
      return response;
    };
  }, a);
  const go = async scope => { await page.evaluate(url => { history.pushState(null, '', url); dispatchEvent(new PopStateEvent('popstate')); }, scope.url); };
  const panel = page.locator('[class*=gitChanges_]');
  const ready = async label => {
    await page.waitForTimeout(100);
    if (!await panel.count()) await page.getByTitle('Git 变更', { exact: true }).click();
    await panel.getByTitle('B5 ' + label + ' local', { exact: true }).waitFor();
    await panel.getByText('child.txt', { exact: true }).waitFor();
  };
  try {
    await page.getByTitle('Git 变更', { exact: true }).waitFor(); await page.getByTitle('Git 变更', { exact: true }).click();
    await page.waitForFunction(() => typeof window.__b5ReleaseGitListing === 'function');
    assert.equal(await page.evaluate(() => window.__b5GitListingCount), 2);
    stage = 'switch-B-before-A-list'; await go(fixture.b); await ready('B'); const start = requests.length;
    await page.evaluate(() => { window.__b5ReleaseGitListing(); delete window.__b5ReleaseGitListing; });
    for (let n = 0; n < 300 && requests.length < start + 4; n++) await page.waitForTimeout(10);
    const late = requests.slice(start); assert.equal(late.length, 4); assert.ok(late.every(row => row.instance === a));
    await page.waitForTimeout(100); assert.equal(await panel.getByTitle('B5 A local', { exact: true }).count(), 0);
    stage = 'A-restore-open'; await go(fixture.a); await ready('A');
    const child = panel.getByText('child.txt', { exact: true }).locator('..'); await child.hover(); await child.getByTitle('撤销变更', { exact: true }).click();
    const dialog = page.locator('.ant-modal-confirm'); await dialog.waitFor(); assert.match(await dialog.innerText(), /child\.txt/);
    stage = 'switch-B-before-confirm'; await go(fixture.b);
    await page.getByText('GUI fixture B replied: B5 GUI seed', { exact: true }).waitFor(); await drainFetches();
    const before = requests.length;
    const [response] = await Promise.all([page.waitForResponse(res => new URL(res.url()).pathname === '/api/git-restore'), dialog.getByRole('button', { name: '撤销变更', exact: true }).click()]);
    assert.equal(response.ok(), true); await dialog.waitFor({ state: 'hidden' }); await page.waitForTimeout(100);
    assert.deepEqual(restores, [{ instance: a, body: { path: 'dir/child.txt', repo: 'sub' } }]);
    assert.equal(readFileSync(join(fixture.a.cwd, 'sub/dir/child.txt'), 'utf8'), 'nested base\n');
    assert.equal(readFileSync(join(fixture.b.cwd, 'sub/dir/child.txt'), 'utf8'), 'nested changed\n');
    assert.deepEqual(requests.slice(before), [{ path: '/api/git-restore', instance: a }], 'old confirmation never refreshes B');
    await ready('B');
    assert.equal(await panel.getByTitle('B5 A local', { exact: true }).count(), 0);
    console.log(JSON.stringify({ engine: page.context().browser().browserType().name(), mode: 'git-scope', browserVersion: page.context().browser().version(),
      heldActualAListingJsonAcrossHistorySwitch: true, late4RepoRequestsRemainA: true, BHasNoAResult: true,
      staticRestoreAcrossSecondSwitchStillA: true, actualBytesARevertedBPreserved: true, noOldSubtreeRefreshOfB: true }));
  } catch (error) { console.error('Git scope GUI stage:', stage, JSON.stringify({ requests, trace: await page.evaluate(() => ({ requests: window.__b5GitTrace, resumed: window.__b5ListingResumed })) })); throw error; }
  finally { await page.evaluate(() => { window.__b5ReleaseGitListing?.(); window.__b5UnwrapGitListing?.(); delete window.__b5ReleaseGitListing; delete window.__b5UnwrapGitListing; delete window.__b5GitListingCount; delete window.__b5GitTrace; delete window.__b5ListingResumed; }).catch(() => {}); }
}
