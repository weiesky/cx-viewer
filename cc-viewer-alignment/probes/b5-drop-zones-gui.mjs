// Synthetic external browser events; actual upload HTTP and resulting bytes.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export async function verifyDropZones(page, fixture, repo, engine, mobile) {
  await page.waitForFunction(() => document.querySelector('[data-drop-zone="chat"]') || document.querySelector('button[title="文件浏览器"]'));
  if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
  await page.locator('[data-file-explorer]').getByText('search-fixture', { exact: true }).waitFor();
  const posts = []; page.on('request', req => { if (new URL(req.url()).pathname.endsWith('/api/upload')) posts.push(req); });
  const fire = async (locator, type, internal = false) => locator.evaluate((el, { type, internal }) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    const dt = new DataTransfer(); dt.items.add(new File(['B5 external zone bytes 中文'], 'zone.txt', { type: 'text/plain' }));
    if (internal) dt.setData('text/x-internal-move', 'search-fixture/file-00.txt');
    Object.defineProperty(e, 'dataTransfer', { value: dt }); el.dispatchEvent(e); return e.defaultPrevented;
  }, { type, internal });
  const mask = page.locator('[class*=dropZoneMask_]');
  const chat = page.locator('[data-drop-zone="chat"]').first();
  const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-drop-zones-2026-11-21'); mkdirSync(evidence, { recursive: true });
  await chat.waitFor(); await fire(chat, 'dragover'); await mask.first().waitFor({ state: 'visible' });
  assert.equal(await mask.first().evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  await page.screenshot({ path: join(evidence, `${engine}-chat-mask.png`), animations: 'disabled' });
  await page.evaluate(() => document.dispatchEvent(new Event('dragend'))); await mask.first().waitFor({ state: 'hidden' });
  const header = page.locator('header').first(); await fire(header, 'dragover'); await fire(header, 'drop');
  await page.waitForTimeout(80); assert.equal(posts.length, 0);
  assert.equal(await fire(chat, 'dragover', true), false); await fire(chat, 'drop', true);
  assert.equal(posts.length, 0);
  if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
  const explorer = page.locator('[data-file-explorer]'); await fire(explorer, 'dragover');
  await mask.first().waitFor({ state: 'hidden' });
  assert.equal(await explorer.evaluate(el => getComputedStyle(el).outlineStyle), 'dashed');
  await page.screenshot({ path: join(evidence, `${engine}-sidebar-mask.png`), animations: 'disabled' });
  await page.evaluate(() => document.dispatchEvent(new Event('dragend')));
  await page.getByTitle('浏览项目文件', { exact: true }).click();
  const toolbar = page.locator('.ant-modal [class*=toolbar_]'); await toolbar.waitFor();
  await fire(toolbar, 'dragover'); await fire(toolbar, 'drop'); await page.waitForTimeout(80); assert.equal(posts.length, 0);
  await page.locator('.ant-modal-close').click();
  await page.locator('.ant-modal').waitFor({ state: 'hidden' });
  await fire(chat, 'dragover'); await mask.first().waitFor({ state: 'visible' });
  const [response] = await Promise.all([page.waitForResponse(res => new URL(res.url()).pathname.endsWith('/api/upload')), fire(chat, 'drop')]);
  const result = await response.json(); assert.equal(result.ok, true); assert.equal(posts.length, 1);
  assert.equal(readFileSync(result.path, 'utf8'), 'B5 external zone bytes 中文');
  assert.equal(new URL(posts[0].url()).searchParams.get('instance'), new URL(fixture.a.url).searchParams.get('instance'));
  await mask.first().waitFor({ state: 'hidden' });
  console.log(JSON.stringify({ engine, browserVersion: page.context().browser().version(), mode: 'zones',
    syntheticExternalEvents: true, chatMask: true, abortClearsMask: true, sidebarOwnOutline: true,
    headerAndPortalNoUploads: true, internalMoveNotAcceptedByGlobalHandler: true, actualUploadBytesExact: true, uploads: 1 }));
}
