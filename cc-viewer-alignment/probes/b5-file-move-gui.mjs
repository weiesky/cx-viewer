// Native browser HTML drag gestures with real HTTP move requests and exact bytes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyFileMove(page, fixture) {
  await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
  if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
  const tree = page.locator('[data-file-explorer]'), blank = tree.locator('[class*="treeBlankArea_"]');
  await tree.getByText('search-fixture', { exact: true }).click();
  const item = () => tree.getByText('movable.txt', { exact: true }).locator('..'); await item().waitFor();
  const moves = []; page.on('request', req => { if (new URL(req.url()).pathname.endsWith('/api/move-file')) moves.push(req.postDataJSON()); });
  const [rootResponse] = await Promise.all([
    page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/move-file'), { timeout: 10000 }),
    item().dragTo(blank),
  ]);
  assert.equal(rootResponse.ok(), true); assert.equal((await rootResponse.json()).newPath, 'movable.txt');
  assert.equal(readFileSync(join(fixture.a.cwd, 'movable.txt'), 'utf8'), 'A move bytes 中文');
  assert.equal(existsSync(join(fixture.a.cwd, 'search-fixture/movable.txt')), false);
  await page.waitForTimeout(300);
  const [folderResponse] = await Promise.all([
    page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/move-file'), { timeout: 10000 }),
    item().dragTo(tree.getByText('move-target', { exact: true }).locator('..')),
  ]);
  assert.equal(folderResponse.ok(), true); assert.equal((await folderResponse.json()).newPath, 'move-target/movable.txt');
  assert.equal(readFileSync(join(fixture.a.cwd, 'move-target/movable.txt'), 'utf8'), 'A move bytes 中文');
  assert.equal(existsSync(join(fixture.a.cwd, 'movable.txt')), false);
  assert.equal(readFileSync(join(fixture.b.cwd, 'search-fixture/movable.txt'), 'utf8'), 'B canary');
  assert.deepEqual(moves, [{ fromPath: 'search-fixture/movable.txt', toDir: '' }, { fromPath: 'movable.txt', toDir: 'move-target' }]);
  console.log(JSON.stringify({ engine: page.context().browser().browserType().name(), mode: 'moves', browserVersion: page.context().browser().version(),
    nativeHtmlDragGestures: true, actualMoveEndpoint: true, blankAreaMovesToRoot: true, folderDropWorks: true,
    relativeReturnedPaths: true, exactBytesAndSiblingCanaryPreserved: true, moves }));
}
