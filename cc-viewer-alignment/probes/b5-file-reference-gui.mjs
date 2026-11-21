import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export async function verifyFileReferences(page, fixture, repo, engine) {
  let stage = 'open';
  try {
    await page.waitForFunction(() => document.querySelector('[data-file-explorer]') || document.querySelector('button[title="文件浏览器"]'));
    if (!await page.locator('[data-file-explorer]').count()) await page.getByTitle('文件浏览器', { exact: true }).click();
    const explorer = page.locator('[data-file-explorer]'); await explorer.getByText('search-fixture', { exact: true }).waitFor();
    await page.getByText('GUI fixture A replied: B5 GUI seed', { exact: true }).waitFor();
    const posts = [], inputs = [], sockets = []; let scratchReady = false;
    page.on('request', req => { if (req.method() === 'POST') posts.push(new URL(req.url()).pathname); });
    page.on('websocket', ws => {
      sockets.push(ws.url()); ws.on('framereceived', frame => { try { const data = JSON.parse(frame.payload); if (new URL(ws.url()).pathname.endsWith('/ws/terminal-scratch') && data.type === 'state' && data.running) scratchReady = true; } catch {} }); ws.on('framesent', frame => { try { const data = JSON.parse(frame.payload); if (data.type === 'input') inputs.push({ url: ws.url(), data: data.data }); } catch {} });
    });
    const composer = page.locator('[class*=chatInputWrapper_]'); const chips = composer.locator('[class*=filePreviewChip_]');
    const note = explorer.getByText('note.txt', { exact: true }).locator('..');
    const folder = explorer.getByText('search-fixture', { exact: true }).locator('..');
    stage = 'native-composer-drop';
    await note.dragTo(composer); await chips.filter({ hasText: 'note.txt' }).waitFor();
    await folder.dragTo(composer); await chips.filter({ hasText: 'search-fixture' }).waitFor();
    await note.dragTo(composer); assert.equal(await chips.count(), 2, 'duplicate reference is not appended');
    assert.equal(await chips.filter({ hasText: 'search-fixture' }).getAttribute('title'), 'search-fixture');
    assert.equal(posts.length, 0); assert.equal(inputs.length, 0); assert.ok(existsSync(join(fixture.a.cwd, 'note.txt')));
    stage = 'unsafe-reference';
    await composer.evaluate(el => {
      const dt = new DataTransfer(); dt.setData('text/x-internal-move', '1'); dt.setData('text/x-ccv-file', '1'); dt.setData('text/plain', 'bad\x1b[201~\rpath');
      const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }); el.dispatchEvent(event);
    });
    assert.equal(await chips.count(), 2);
    const evidence = join(repo, 'cc-viewer-alignment/evidence/B5-references-2026-11-21'); mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: join(evidence, `${engine}-composer.png`), animations: 'disabled' });
    stage = 'send-through-native-sdk';
    const input = composer.locator('textarea'); await input.fill('B5 reference submit'); await input.press('Enter');
    await page.waitForFunction(() => document.body.textContent.includes('replied: "note.txt" "search-fixture" B5 reference submit'));
    const calls = readFileSync(join(fixture.root, 'calls.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(calls.filter(call => call.input === '"note.txt" "search-fixture" B5 reference submit').length, 1);
    assert.equal(calls.find(call => call.input.includes('B5 reference submit')).cwd, fixture.a.cwd);
    await chips.first().waitFor({ state: 'hidden' });
    stage = 'scratch-open'; await page.getByTitle('展开终端', { exact: true }).click();
    const scratch = page.locator('[class*=scratchPaneActive_] [class*=scratchInner_]'); await scratch.waitFor();
    await scratch.locator('.xterm').waitFor();
    for (let i = 0; i < 100 && !scratchReady; i++) await page.waitForTimeout(50);
    assert.equal(scratchReady, true, 'actual scratch state is running');
    stage = 'scratch-file-drop';
    await note.dragTo(scratch); await page.waitForTimeout(100);
    assert.equal(inputs.length, 1); assert.equal(inputs[0].data.replace(/\x1b\[20[01]~/g, ''), "'note.txt' ");
    assert.equal(new URL(inputs[0].url).pathname, '/ws/terminal-scratch');
    assert.equal(new URL(inputs[0].url).searchParams.get('instance'), new URL(fixture.a.url).searchParams.get('instance'));
    await folder.dragTo(scratch); await page.waitForTimeout(100); assert.equal(inputs.length, 2);
    assert.equal(inputs[1].data.replace(/\x1b\[20[01]~/g, ''), "'search-fixture' ");
    assert.ok(inputs.every(row => !/[\r\n]/.test(row.data)), 'drops never press Enter');
    assert.deepEqual(posts.filter(path => !['/api/preferences', '/api/log-v2/objects'].includes(path)), [], 'only existing preference persistence / V2 object reads may POST'); assert.equal(readFileSync(join(fixture.a.cwd, 'note.txt'), 'utf8'), fixture.a.cwd);
    assert.equal(readFileSync(join(fixture.b.cwd, 'note.txt'), 'utf8'), fixture.b.cwd);
    await page.screenshot({ path: join(evidence, `${engine}-scratch.png`), animations: 'disabled' });
    assert.equal(readFileSync(join(fixture.root, 'calls.jsonl'), 'utf8').trim().split('\n').length, calls.length, 'scratch drops never invoke model');
    console.log(JSON.stringify({ engine, browserVersion: page.context().browser().version(), mode: 'references', nativeHtmlDrag: true,
      fileAndFolderComposer: true, dedup: true, unsafeRejected: true, noUploadsOrMoves: true, originalFolderChip: true,
      actualSdkSendExactlyOnce: true, scratchTwoQuotedInputsWithoutEnter: true, nativeExactInstance: true,
      siblingBytesPreserved: true, scratchDidNotInvokeModel: true, incidentalPosts: posts }));
  } catch (error) { console.error('Reference GUI stage:', stage); throw error; }
}
