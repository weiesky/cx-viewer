// Synthetic browser drop events; actual scoped HTTP multipart uploads and filesystem bytes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyFileImport(page, fixture) {
  await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
  if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
  const folder = page.locator('[data-file-explorer]').getByText('search-fixture', { exact: true }).locator('..'); await folder.waitFor();
  const uploads = []; page.on('request', req => { if (new URL(req.url()).pathname.endsWith('/api/import-file')) uploads.push(req); });
  await folder.evaluate(el => {
    const file = new File(['original A bytes 中文'], 'delayed.txt', { type: 'text/plain' });
    const entry = { name: file.name, fullPath: '/nested/delayed.txt', isFile: true, file(resolve) { window.__b5ReleaseImport = () => resolve(file); } };
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files: [file], items: [{ kind: 'file', webkitGetAsEntry: () => entry }] } });
    el.dispatchEvent(event);
  });
  await page.waitForFunction(() => typeof window.__b5ReleaseImport === 'function'); assert.equal(uploads.length, 0);
  await page.evaluate(url => { history.pushState(null, '', url); dispatchEvent(new PopStateEvent('popstate')); }, fixture.b.url);
  const [response] = await Promise.all([
    page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/import-file')),
    page.evaluate(() => { window.__b5ReleaseImport(); delete window.__b5ReleaseImport; }),
  ]);
  assert.equal(response.ok(), true); const result = await response.json();
  assert.equal(result.relPath, 'search-fixture/nested/delayed.txt');
  assert.equal(new URL(uploads[0].url()).searchParams.get('instance'), new URL(fixture.a.url).searchParams.get('instance'));
  assert.equal(readFileSync(join(fixture.a.cwd, result.relPath), 'utf8'), 'original A bytes 中文');
  assert.equal(existsSync(join(fixture.b.cwd, result.relPath)), false);
  assert.equal(uploads.length, 1);
  console.log(JSON.stringify({ engine: page.context().browser().browserType().name(), mode: 'imports',
    browserVersion: page.context().browser().version(), syntheticDrop: true, actualMultipartEndpoint: true,
    scanHeldBeforeUpload: true, samePageAtoBSwitch: true, resumedUploadStillTargetsA: true, nestedBytesExact: true, siblingHasNoNewFile: true }));
}
