// Real sandboxed frame, script/style requests and exact scoped server responses.
import assert from 'node:assert/strict';

export async function verifyHtmlPreview(page, fixture) {
  await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
  await page.evaluate(url => { history.pushState(null, '', url); dispatchEvent(new PopStateEvent('popstate')); }, fixture.b.url);
  await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
  if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
  const rawRequests = [];
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api/file-raw/')) rawRequests.push({ url: response.url(), status: response.status() }); });
  const tree = page.locator('[data-file-explorer]');
  await tree.getByText('report', { exact: true }).click(); await tree.getByText('index.html', { exact: true }).click();
  const frame = page.frameLocator('iframe[title="report/index.html"]');
  await frame.locator('body[data-resource="B"][data-storage-blocked="1"][data-parent-blocked="1"][data-fetch-blocked="1"]').waitFor();
  assert.equal(await frame.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(12, 34, 56)');
  assert.equal(await page.locator('iframe[title="report/index.html"]').getAttribute('sandbox'), 'allow-scripts');
  const instance = new URL(fixture.b.url).searchParams.get('instance');
  assert.ok(rawRequests.length >= 3);
  for (const req of rawRequests) { assert.equal(req.status, 200); assert.ok(new URL(req.url).pathname.includes('/' + instance + '/')); }
  console.log(JSON.stringify({ engine: page.context().browser().browserType().name(), mode: 'html', browserVersion: page.context().browser().version(),
    viewedBResourceLoaded: true, relativeJsCssRetainScope: true, cssApplied: true, scriptsExecuteInSandbox: true,
    parentAndStorageBlocked: true, fetchBlockedByCsp: true, rawRequestCount: rawRequests.length }));
}
