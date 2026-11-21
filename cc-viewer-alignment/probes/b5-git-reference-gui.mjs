import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export async function verifyGitReferences(page, fixture, repo, engine) {
  let stage = 'open';
  try {
    await page.getByTitle('Git 变更', { exact: true }).waitFor(); await page.getByTitle('Git 变更', { exact: true }).click();
    const panel = page.locator('[class*=gitChanges_]'), composer = page.locator('[class*=chatInputWrapper_]');
    await panel.getByText('child.txt', { exact: true }).waitFor();
    const mutations = [], inputs = []; let scratchReady = false;
    page.on('request', req => { if (req.method() === 'POST' && !['/api/log-v2/objects', '/api/preferences'].includes(new URL(req.url()).pathname)) mutations.push(new URL(req.url()).pathname); });
    page.on('websocket', ws => {
      ws.on('framereceived', frame => { try { const data = JSON.parse(frame.payload); if (new URL(ws.url()).pathname.endsWith('/ws/terminal-scratch') && data.type === 'state' && data.running) scratchReady = true; } catch {} });
      ws.on('framesent', frame => { try { const data = JSON.parse(frame.payload); if (data.type === 'input') inputs.push({ url: ws.url(), data: data.data }); } catch {} });
    });
    const calls = () => readFileSync(join(fixture.root, 'calls.jsonl'), 'utf8').trim().split('\n').length;
    await page.getByText('GUI fixture A replied: B5 GUI seed', { exact: true }).waitFor(); const beforeCalls = calls();
    const child = () => panel.getByText('child.txt', { exact: true }).locator('..');
    const dir = () => panel.getByText('dir', { exact: true }).locator('..');
    stage = 'native-git-file-folder-commit';
    await child().dragTo(composer); await composer.locator('[title="sub/dir/child.txt"]').waitFor();
    await dir().dragTo(composer); await composer.locator('[title="sub/dir"]').waitFor();
    const url = new URL('/api/git-log-unpushed', fixture.a.url); url.search = new URL(fixture.a.url).search;
    const commit = (await (await page.request.get(url.href)).json()).commits.find(c => c.subject === 'B5 A local');
    await panel.getByTitle('B5 A local', { exact: true }).dragTo(composer); await composer.getByTitle(commit.hash, { exact: true }).waitFor();
    assert.equal(await composer.locator('[class*=filePreviewChip_]').count(), 3);
    stage = 'rename-guard';
    assert.equal(await panel.getByText('renamed.txt', { exact: true }).locator('..').getAttribute('draggable'), 'false');
    const pseudo = panel.getByText('tracked.txt -> stage', { exact: true }).locator('..');
    const canceled = await pseudo.evaluate(el => { const event = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }); el.dispatchEvent(event); return event.defaultPrevented; });
    assert.equal(canceled, true); assert.equal(await composer.locator('[class*=filePreviewChip_]').count(), 3);
    stage = 'no-drag-menu-alternatives';
    await child().click({ button: 'right' });
    await page.getByRole('menuitem').filter({ hasText: '以附件形式载入对话' }).click();
    assert.equal(await composer.locator('[class*=filePreviewChip_]').count(), 3);
    await page.waitForTimeout(250); await child().click({ button: 'right' });
    await page.getByRole('menuitem').filter({ hasText: '以路径形式载入对话' }).click();
    assert.match(await composer.locator('textarea').inputValue(), /sub\/dir\/child\.txt/);
    const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-git-references-2026-11-21'); mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: join(evidence, `${engine}-composer.png`), animations: 'disabled' });
    stage = 'scratch'; await page.getByTitle('展开终端', { exact: true }).click();
    const scratch = page.locator('[class*=scratchPaneActive_] [class*=scratchInner_]'); await scratch.waitFor(); await scratch.locator('.xterm').waitFor();
    for (let n = 0; n < 100 && !scratchReady; n++) await page.waitForTimeout(50); assert.equal(scratchReady, true);
    for (const source of [child(), dir(), panel.getByTitle('B5 A local', { exact: true })]) await source.dragTo(scratch);
    await page.waitForTimeout(100); assert.equal(inputs.length, 3);
    assert.deepEqual(inputs.map(row => row.data.replace(/\x1b\[20[01]~/g, '')), ["'sub/dir/child.txt' ", "'sub/dir' ", "'" + commit.hash + "' "]);
    assert.ok(inputs.every(row => !/[\r\n]/.test(row.data) && new URL(row.url).searchParams.get('instance') === new URL(fixture.a.url).searchParams.get('instance')));
    assert.deepEqual(mutations, []); assert.equal(calls(), beforeCalls);
    for (const scope of [fixture.a, fixture.b]) { assert.equal(readFileSync(join(scope.cwd, 'sub/dir/child.txt'), 'utf8'), 'nested changed\n'); assert.ok(existsSync(join(scope.cwd, 'stage/renamed.txt'))); }
    await page.screenshot({ path: join(evidence, `${engine}-scratch.png`), animations: 'disabled' });
    console.log(JSON.stringify({ engine, mode: 'git-drag', browserVersion: page.context().browser().version(), nativeHtmlDrag: true,
      nestedRepoFileAndFolderPaths: true, fullCommitHash: true, renameRowDisabledAndPseudoDirCanceled: true,
      menuAttachAndInsert: true, scratch3InputsWithoutEnter: true, noModelOrUploadsOrMoves: true, exactInstanceAndSiblingBytes: true }));
  } catch (error) { console.error('Git reference GUI stage:', stage); throw error; }
}
