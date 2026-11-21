// Shares the approved temporary browsers and isolated SDK fixture with b5-search-gui.mjs.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyFileEncoding(page, fixture, repo, engine) {
  await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
  if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
  const tree = page.locator('[data-file-explorer]');
  const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-encoding-2026-11-21'); mkdirSync(evidence, { recursive: true });
  const posts = []; page.on('request', req => { if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/file-content') posts.push(req.postDataJSON()); });
  const originals = new Map(['encoding-le.txt', 'encoding-be.md', 'binary.txt'].map(name => [name, readFileSync(join(fixture.a.cwd, name))]));
  for (const name of ['encoding-le.txt', 'encoding-be.md']) {
    await tree.getByText(name, { exact: true }).click();
    await page.getByText('UTF-16', { exact: true }).waitFor();
    assert.equal(await page.getByTitle('保存 (Ctrl+S)', { exact: true }).count(), 0);
    assert.equal(await page.locator('.cm-content[contenteditable="true"]').count(), 0);
    assert.equal(await page.locator('[contenteditable="true"][role="textbox"]').count(), 0, 'read-only markdown must not mount MDX editing');
    if (name.endsWith('.md')) {
      if (await page.getByTitle('Markdown', { exact: true }).count()) await page.getByTitle('Markdown', { exact: true }).click();
      await page.locator('[class*="markdownPreview_"]').waitFor();
      assert.equal(await page.locator('[contenteditable="true"][role="textbox"]').count(), 0);
      await page.getByTitle('文本编辑', { exact: true }).click();
    }
    await page.locator('.cm-content[contenteditable="false"]').waitFor();
    assert.match(await page.locator('.cm-content').innerText(), /原文 中文 😀/);
    await page.locator('.cm-content').click(); await page.keyboard.press('ControlOrMeta+s');
    assert.deepEqual(readFileSync(join(fixture.a.cwd, name)), originals.get(name));
  }
  const utf16Screenshot = join(evidence, `${engine}-utf16-read-only.png`); await page.screenshot({ path: utf16Screenshot, animations: 'disabled' });
  assert.equal(posts.length, 0);
  await tree.getByText('binary.txt', { exact: true }).click();
  const status = page.getByRole('status').filter({ has: page.getByRole('heading', { name: '此文件暂不支持预览' }) }); await status.waitFor();
  assert.equal(await page.locator('.cm-editor').count(), 0);
  const link = status.locator('a').filter({ hasText: '下载文件' });
  const [download] = await Promise.all([page.waitForEvent('download'), link.click()]); assert.equal(download.suggestedFilename(), 'binary.txt');
  assert.deepEqual(readFileSync(await download.path()), originals.get('binary.txt'));
  const binaryScreenshot = join(evidence, `${engine}-binary-download.png`); await page.screenshot({ path: binaryScreenshot, animations: 'disabled' });
  // An old in-flight binary response must never replace a newly selected text file.
  let release, started;
  const held = new Promise(resolve => { release = resolve; }); const requested = new Promise(resolve => { started = resolve; });
  await page.route('**/api/file-content?*', async route => {
    if (new URL(route.request().url()).searchParams.get('path') !== 'slow.txt') return route.continue();
    const response = await route.fetch(); started(); await held;
    await route.fulfill({ response }).catch(() => {}); // The component intentionally aborted the old request.
  });
  await tree.getByText('slow.txt', { exact: true }).click(); await requested;
  await tree.getByText('plain.txt', { exact: true }).click(); await page.locator('.cm-content[contenteditable="true"]').waitFor();
  release(); await page.waitForTimeout(300);
  assert.match(await page.locator('.cm-content').innerText(), /plain UTF-8/);
  assert.equal(await status.count(), 0);
  const editor = page.locator('.cm-content'); await editor.click(); await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type(' appended'); await page.keyboard.press('ControlOrMeta+s');
  await page.waitForFunction(() => document.body.textContent.includes('已保存'));
  assert.match(readFileSync(join(fixture.a.cwd, 'plain.txt'), 'utf8'), /appended/);
  assert.equal(readFileSync(join(fixture.b.cwd, 'plain.txt'), 'utf8'), 'B canary');
  assert.equal(posts.length, 1); assert.equal(posts[0].path, 'plain.txt');
  for (const [name, raw] of originals) assert.deepEqual(readFileSync(join(fixture.a.cwd, name)), raw);
  console.log(JSON.stringify({ engine, mode: 'encoding', utf16LEAndBEReadOnly: true, markdownReadOnlyFallback: true,
    noSavePostsFromReadOnly: true, binaryNoEditor: true, exactBinaryDownload: true, abortedOldBinaryCannotReplaceNewText: true,
    utf8StillEditsAndSaves: true, siblingPreserved: true, screenshots: [utf16Screenshot, binaryScreenshot] }));
}
