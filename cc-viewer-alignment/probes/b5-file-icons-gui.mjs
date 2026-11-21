// Inspect actual shared SVGs and CSS-resolved colors in project and Git surfaces.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function verifyFileIcons(page, fixture, repo, engine, mobile) {
  if (mobile) {
    await page.locator('[class*="mobileMenuBtn_"]').click();
    await page.locator('[class*="mobileMenuDropdown_"]').getByText('项目文件夹', { exact: true }).click();
  } else {
    await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
    if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
  }
  let surface = mobile ? page.locator('[class*="mobileFileExplorerOverlay_"]') : page.locator('[data-file-explorer]');
  if (mobile && !await surface.count()) surface = page.locator('[class*="fileListSection_"]').filter({ hasText: '项目文件夹' });
  const dir = join(repo, 'cc-viewer-alignment/evidence/B5-icons-2026-11-21'); mkdirSync(dir, { recursive: true });
  const samples = ['icon-code.js', 'icon-data.json', 'icon-markup.html', 'icon-document.txt', 'icon-image.png',
    'icon-video.mp4', 'icon-audio.opus', 'icon-archive.zip', 'icon-pdf.pdf', 'icon-word.docx', 'icon-sheet.xlsx', 'icon-slides.pptx',
    'icon-font.woff', 'icon-binary.wasm', 'icon-subtitle.srt', 'icon-plain.unknown'];
  const screenshots = [], records = [];
  const inspect = async (host, kind) => {
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
      const rows = [];
      for (const name of samples) {
        const label = host.getByText(name, { exact: true }); await label.waitFor(); await label.scrollIntoViewIfNeeded();
        const svg = label.locator('..').locator('span[class*="icon_"] > svg').first();
        rows.push(await svg.evaluate(el => ({ width: el.getAttribute('width'), stroke: getComputedStyle(el).stroke,
          strokeWidth: el.getAttribute('stroke-width'), children: el.children.length })));
      }
      assert.ok(rows.every(row => row.width === '14' && row.strokeWidth === '2'));
      assert.equal(rows[0].stroke, theme === 'light' ? 'rgb(183, 160, 0)' : 'rgb(232, 212, 77)');
      assert.ok(rows.slice(0, -1).every(row => row.children > 2), 'every classified file has an embedded type glyph');
      assert.equal(rows.at(-1).children, 2, 'unknown extension retains plain document base');
      assert.equal(new Set(rows.slice(9, 12).map(row => row.stroke)).size, 3, 'Office accents differ');
      const screenshot = join(dir, `${engine}-${mobile ? 'phone' : 'desktop'}-${kind}-${theme}.png`);
      await page.screenshot({ path: screenshot, animations: 'disabled' }); screenshots.push(screenshot);
      records.push({ kind, theme, files: samples.length, codeStroke: rows[0].stroke, officeStrokes: rows.slice(9, 12).map(row => row.stroke) });
    }
  };
  await inspect(surface, 'files');
  if (mobile) {
    await page.getByText('Git Diff', { exact: true }).click();
    surface = page.locator('[class*="changesContainer_"]');
  } else {
    await page.getByTitle('Git 变更', { exact: true }).click();
    surface = page.locator('[class*="changesContainer_"]');
  }
  await inspect(surface, 'git');
  console.log(JSON.stringify({ engine, mode: mobile ? 'icons-phone' : 'icons', browserVersion: page.context().browser().version(),
    surfaces: records, sharedSvgGlyphs: true, themeChangesWithoutRemount: true, screenshots }));
}
