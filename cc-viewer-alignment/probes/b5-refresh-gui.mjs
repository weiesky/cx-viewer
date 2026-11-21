import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
export async function verifyRefresh(page, fixture, repo, engine) {
  let stage = 'open'; const pending = new Map(); let armed = new Set(), failRoot = false;
  const release = key => { pending.get(key)?.(); pending.delete(key); };
  const hold = async (route, key) => { await new Promise(resolve => pending.set(key, resolve)); await route.continue(); };
  const waitHeld = async key => { for (let i = 0; i < 200 && !pending.has(key); i++) await page.waitForTimeout(10); assert.ok(pending.has(key), 'request held: ' + key); };
  let baselineSize;
  try {
    // Render the exact upstream Button/CSS/theme with the SAME installed Antd.
    // Its icon-only selector has greater specificity than .refreshBtn.
    const upstream = '/tmp/cxv-cc-viewer-research/apps/web/src';
    const source = readFileSync(join(upstream, 'components/files/FileExplorer.jsx'), 'utf8');
    const start = source.indexOf('              <Button\n', source.indexOf('{onManualRefresh && ('));
    const button = source.slice(start, source.indexOf('\n            )}', start));
    const themeSource = readFileSync(join(upstream, 'AppBase.jsx'), 'utf8');
    const themeStart = themeSource.indexOf('const LIGHT_THEME_CONFIG');
    const themes = themeSource.slice(themeStart, themeSource.indexOf('/**', themeStart));
    const cssSource = readFileSync(join(upstream, 'components/files/FileExplorer.module.css'), 'utf8');
    const cssStart = cssSource.indexOf('/* 头部刷新按钮：');
    const css = cssSource.slice(cssStart, cssSource.indexOf('\n}', cssSource.indexOf('.refreshBtn:hover', cssStart)) + 2);
    const require = createRequire(join(repo, 'apps/web/package.json'));
    const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
    const output = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import{Button,ConfigProvider,theme}from'antd';import{ReloadOutlined}from'@ant-design/icons';${themes}const styles={refreshBtn:'refreshBtn'},refreshing=false,handleManualRefresh=()=>{},t=()=> 'refresh';createRoot(document.getElementById('root')).render(<ConfigProvider theme={LIGHT_THEME_CONFIG}>${button}</ConfigProvider>);`, loader: 'jsx', resolveDir: join(repo, 'apps/web') }, bundle: true, write: false, platform: 'browser', format: 'iife', logLevel: 'silent' });
    const baseline = await page.context().newPage();
    try {
      await baseline.route('**/__b5-baseline-refresh*', route => route.fulfill({ contentType: route.request().url().endsWith('.js') ? 'application/javascript' : 'text/html', body: route.request().url().endsWith('.js') ? output.outputFiles[0].text : '<div id="root"></div><style>' + css + '</style><script src="/__b5-baseline-refresh.js"></script>' }));
      await baseline.goto(new URL('/__b5-baseline-refresh', fixture.a.url).href);
      await baseline.getByRole('button', { name: 'refresh', exact: true }).waitFor();
      const box = await baseline.getByRole('button', { name: 'refresh', exact: true }).boundingBox(); baselineSize = [box.width, box.height];
      assert.deepEqual(baselineSize, [24, 16]);
    } finally { await baseline.close(); }
    await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
    if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
    const tree = page.locator('[data-file-explorer]'); await tree.getByText('note.txt', { exact: true }).waitFor();
    await page.route(/\/api\/files(?:\?|$)/, async route => {
      const url = new URL(route.request().url()); if ((url.searchParams.get('path') || '') !== '') return route.continue();
      if (failRoot) { failRoot = false; return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"B5_REFRESH_DENIED"}' }); }
      if (armed.delete('root')) return hold(route, 'root'); return route.continue();
    });
    for (const key of ['status', 'log-unpushed']) await page.route(new RegExp('/api/git-' + key + '(?:\\?|$)'), async route => {
      if (armed.delete(key)) return hold(route, key); return route.continue();
    });
    const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-refresh-2026-11-21'); mkdirSync(evidence, { recursive: true });
    const busy = async button => { assert.equal(await button.isDisabled(), true); assert.match(await button.getAttribute('class'), /ant-btn-loading/); assert.ok(await button.locator('.anticon-spin').count()); };
    const size = async button => { const box = await button.boundingBox(); assert.deepEqual([box.width, box.height], baselineSize); };
    const treeButton = tree.getByRole('button', { name: '刷新', exact: true }); await size(treeButton);
    stage = 'tree-manual'; writeFileSync(join(fixture.a.cwd, 'refreshed.txt'), 'new A bytes'); armed.add('root');
    await treeButton.click(); await waitHeld('root'); await busy(treeButton);
    await page.screenshot({ path: join(evidence, `${engine}-tree-loading.png`), animations: 'disabled' });
    release('root'); await tree.getByText('refreshed.txt', { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-file-explorer] button[aria-label="刷新"]').disabled);
    assert.equal(existsSync(join(fixture.b.cwd, 'refreshed.txt')), false);
    stage = 'tree-error-retry'; failRoot = true; await treeButton.click(); await tree.getByText('加载失败：B5_REFRESH_DENIED', { exact: true }).waitFor();
    assert.equal(await treeButton.isDisabled(), false); await treeButton.click();
    await tree.getByText('加载失败：B5_REFRESH_DENIED', { exact: true }).waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('[data-file-explorer] button[aria-label="刷新"]').disabled);
    stage = 'automatic-no-spin'; armed.add('root'); await page.waitForTimeout(510); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await waitHeld('root');
    assert.equal(await treeButton.isDisabled(), false); assert.doesNotMatch(await treeButton.getAttribute('class'), /ant-btn-loading/); release('root');
    stage = 'git-manual'; await page.getByTitle('Git 变更', { exact: true }).click(); const git = page.locator('[class*=gitChanges_]');
    await git.getByTitle('B5 A local', { exact: true }).waitFor(); const gitButton = git.getByRole('button', { name: '刷新', exact: true }); await size(gitButton);
    armed.add('status'); armed.add('log-unpushed'); await gitButton.click(); await waitHeld('status'); await waitHeld('log-unpushed'); await busy(gitButton);
    release('status'); await page.waitForTimeout(100); await busy(gitButton);
    await page.screenshot({ path: join(evidence, `${engine}-git-loading.png`), animations: 'disabled' });
    release('log-unpushed'); await page.waitForFunction(() => !document.querySelector('[class*=gitChanges_] button[aria-label="刷新"]').disabled);
    assert.doesNotMatch(await gitButton.getAttribute('class'), /ant-btn-loading/);
    console.log(JSON.stringify({ engine, mode: 'refresh', browserVersion: page.context().browser().version(), originalCssDeclaredSize: [16, 16], actualSizeMatchesExactOriginal: baselineSize,
      manualLoadingUntilActualRootResponse: true, errorReasonAndRetry: true, automaticRefreshDoesNotSpin: true,
      gitWaitsForStatusAndCommitRequests: true, exactInstanceNewFileOnlyA: true, heldRequestsReleased: true }));
  } catch (error) { console.error('Refresh GUI stage:', stage); throw error; }
  finally { for (const key of [...pending.keys()]) release(key); }
}
