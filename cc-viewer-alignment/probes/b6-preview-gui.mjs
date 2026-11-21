// Production-build browser checks. Fixture input is created by b6-preview-fixture.mjs.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const {chromium,webkit}=await import(process.env.CXV_PLAYWRIGHT_MODULE);
const fixture=JSON.parse(readFileSync(process.argv[2]||'/tmp/cxv-b6-gui-fixture.json'));
assert.ok(fixture.root.includes('/cxv-b6-preview-gui-'));
const evidence=new URL('../evidence/B6-preview-2026-11-21/',import.meta.url);mkdirSync(evidence,{recursive:true});
const result=[];
for(const engine of (process.argv[3]?[process.argv[3]]:['chromium','webkit'])){
 const browser=await ({chromium,webkit})[engine].launch({headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1440,height:1000},locale:'en-US'});const errors=[],ranges=[];
  await page.route(/https?:\/\/(ipwho\.is|ipapi\.co|ipinfo\.io)\//, route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"success":true,"country_code":"US","country":"US"}' }));
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/audio-stream'))ranges.push({status:r.status(),range:r.request().headers().range});});
  await page.goto(fixture.a.url);const tree=page.locator('[data-file-explorer]');
  const open=async name=>{await tree.getByText(name,{exact:true}).click();};
  const shot=async name=>{const path=join(evidence.pathname,`${engine}-${name}.png`);await page.screenshot({path});return path;};
  const screenshots=[];
  await open('sample.zip');await page.getByRole('button',{name:'docs/hello.txt',exact:true}).click();
  await page.locator('pre').filter({hasText:'ARCHIVE_A'}).waitFor();assert.equal(await page.evaluate(()=>window.B6_XSS),undefined);
  assert.ok((await page.locator('body').innerText()).includes('4 entries'));assert.ok(!(await page.locator('body').innerText()).includes('{4}'));
  screenshots.push(await shot('archive-text'));
  await page.getByRole('button',{name:'big.txt',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[class*="detailBody_"] pre')?.textContent.length>50000);
  assert.ok((await page.locator('[class*="detailBody_"] pre').innerText()).length<100000);assert.match(await page.locator('body').innerText(),/truncat|first|preview/i);
  await page.getByRole('button',{name:'pic.png',exact:true}).click();await page.locator('img[alt="pic.png"]').evaluate(el=>el.decode());
  screenshots.push(await shot('archive-image'));
  await open('unsupported.rar');await page.getByText(/7z|RAR|rar/).last().waitFor();assert.ok(await page.locator('a[download],a[href*="download-file"]').count());
  await open('corrupt.zip');await page.locator('[role="alert"]').waitFor();
  await open('large.zip');await page.locator('[role="alert"]').waitFor();assert.match(await page.locator('body').innerText(),/32/);
  await open('caption.srt');await page.getByRole('tab',{name:'Raw',exact:true}).waitFor();
  assert.equal(await page.locator('img[src="x"]').count(),0);assert.equal(await page.evaluate(()=>window.B6_XSS),undefined);
  await page.getByRole('tab',{name:'Raw',exact:true}).click();await page.locator('pre').filter({hasText:'SUBTITLE_A'}).waitFor();
  await page.getByRole('tab',{name:'List',exact:true}).click();screenshots.push(await shot('subtitle'));
  await open('legacy.srt');await page.getByText('你好',{exact:true}).waitFor();assert.match(await page.locator('body').innerText(),/gbk/i);
  await open('voice.wav');const audio=page.locator('audio');await audio.waitFor();assert.equal(await audio.getAttribute('preload'),'none');
  const played=await audio.evaluate(async el=>{el.muted=true;await el.play();return {duration:el.duration,canSeek:el.seekable.length};}).catch(async error=>{
   return audio.evaluate(el=>({duration:el.duration,error:el.error?.message,paused:el.paused}));
  });
  assert.ok(Number.isFinite(played.duration)&&played.duration>0,JSON.stringify(played));
  await audio.evaluate(async el=>{el.pause();await new Promise(r=>{el.addEventListener('seeked',r,{once:true});el.currentTime=0.5;});});
  assert.ok(await audio.evaluate(el=>el.currentTime>=0.49));screenshots.push(await shot('audio'));
  await open('broken.mp3');await page.locator('audio').evaluate(el=>{el.muted=true;return el.play().catch(()=>{});});await page.waitForFunction(()=>!document.querySelector('audio'));
  assert.ok(await page.locator('a[download]').count());
  await open('picture.apng');await page.locator('img').filter({visible:true}).first().waitFor();
  await open('document.pdf');await page.locator('a[download]').last().waitFor();assert.equal(await page.locator('.cm-content').count(),0);
  await page.goto(fixture.b.url);await page.locator('[data-file-explorer]').getByText('sample.zip',{exact:true}).click();await page.getByRole('button',{name:'docs/hello.txt',exact:true}).click();await page.locator('pre').filter({hasText:'ARCHIVE_B'}).waitFor();
  assert.ok(!(await page.locator('[class*="detailBody_"] pre').innerText()).includes('ARCHIVE_A'));
  await page.goto(fixture.a.url);const initialHeadings=await page.locator('[data-ccv-role="assistant"] .chat-md h1').count();await page.locator('textarea').fill('quote fixture');await page.locator('textarea').press('Enter');
  await page.waitForFunction(n=>document.querySelectorAll('[data-ccv-role="assistant"] .chat-md h1').length>n,initialHeadings);
  const heading=page.locator('[data-ccv-role="assistant"] .chat-md h1').last();await heading.waitFor();await page.getByTitle('Send',{exact:true}).waitFor();await page.waitForTimeout(600);await heading.scrollIntoViewIfNeeded();
  await heading.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
  await page.locator('[data-ccv-selection-quote-btn]').click();const chips=page.locator('[class*="quotePreviewChip_"]');await chips.first().waitFor();
  await chips.first().press('Enter');await page.getByText('Selected text',{exact:true}).waitFor();await page.keyboard.press('Escape');
  screenshots.push(await shot('quote-chip'));
  const headingsBeforeFollowup=await page.locator('[data-ccv-role="assistant"] .chat-md h1').count();await page.locator('textarea').fill('quoted follow up');await page.locator('textarea').press('Enter');await page.waitForFunction(()=>!document.querySelector('[class*="quotePreviewChip_"]'));
  let calls=readFileSync(join(fixture.root,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.ok(calls.some(c=>c.text==='> B6 assistant answer\n\nquoted follow up'));
  await page.waitForFunction(n=>document.querySelectorAll('[data-ccv-role="assistant"] .chat-md h1').length>n,headingsBeforeFollowup);
  await page.locator('[data-ccv-role="assistant"] .chat-md').filter({has:page.locator('h1')}).last().evaluate(el=>{
   const r=document.createRange();r.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
   document.addEventListener('copy',e=>{window.B6_COPY={plain:e.clipboardData.getData('text/plain'),html:e.clipboardData.getData('text/html'),prevented:e.defaultPrevented};},{once:true});
  });
  await page.keyboard.press('ControlOrMeta+c');await page.waitForFunction(()=>window.B6_COPY);
  const copy=await page.evaluate(()=>window.B6_COPY);assert.equal(copy.prevented,true);assert.match(copy.plain,/# B6 assistant answer/);assert.match(copy.plain,/\*\*bold text\*\*/);assert.ok(copy.html.includes('<h1>'));
  // Wait for the completed turn and its trailing hydration/scroll before selecting an older tool region.
  await page.getByTitle('Send',{exact:true}).waitFor();await page.waitForTimeout(600);
  // Same selected DOM gate drives diff/KV; portals remain excluded by ancestry.
  const diff=page.locator('[data-ccv-quotable="diff-code"]').last();
  await diff.waitFor();await diff.scrollIntoViewIfNeeded();
  await diff.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
  await page.locator('[data-ccv-selection-quote-btn]').click();await chips.first().waitFor();assert.ok((await chips.first().getAttribute('title')).includes('new quoted line'));
  const kv=page.locator('[data-ccv-role="assistant"] [data-ccv-quotable="tool-kv"]').last();await kv.waitFor();await kv.scrollIntoViewIfNeeded();
  await kv.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
  await page.locator('[data-ccv-selection-quote-btn]').click();assert.equal(await chips.count(),2);
  screenshots.push(await shot('quoted-tools'));
  await page.getByTitle('Send',{exact:true}).waitFor();await page.locator('textarea').fill('tool quoted followup');await page.locator('textarea').press('Enter');
  await page.waitForFunction(()=>!document.querySelector('[class*="quotePreviewChip_"]'));
  await page.locator('[data-ccv-role="assistant"] .chat-md h1').last().waitFor();
  await page.getByTitle('Send',{exact:true}).waitFor();await page.locator('textarea').fill('ask fixture');await page.locator('textarea').press('Enter');
  const modal=page.getByRole('dialog');await modal.waitFor();
  const portalQuestion=modal.locator('[data-ccv-quotable="ask-question"]');await portalQuestion.waitFor();
  await portalQuestion.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
  await page.waitForTimeout(100);assert.equal(await page.locator('[data-ccv-selection-quote-btn]').count(),0);
  await modal.getByRole('button',{name:'Minimise (keep pending)',exact:true}).click();
  const inline=page.locator('[data-ccv-role="assistant"] [data-ccv-quotable="ask-question"]');await inline.waitFor();
  const radio=inline.getByRole('radio').first();await radio.scrollIntoViewIfNeeded();
  const label=radio.locator('[class*="askOptionLabel_"]');const rect=await label.boundingBox();
  await page.mouse.move(rect.x+1,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width-1,rect.y+rect.height/2,{steps:15});await page.mouse.up();
  assert.equal(await radio.getAttribute('aria-checked'),'false');
  await page.locator('[data-ccv-selection-quote-btn]').click();await chips.first().waitFor();
  await radio.press('Enter');assert.equal(await radio.getAttribute('aria-checked'),'true');screenshots.push(await shot('question-quote'));
  await inline.locator('..').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.deepEqual(errors,[]);
  result.push({engine,version:browser.version(),mode:'desktop',archiveTextImageAndBounds:true,subtitlePlainTextAndGBK:true,audioPlaybackAndSeek:true,audioRanges:ranges,scopeAtoB:true,quoteSentExact:true,nativeKeyboardCopyEvent:copy,actualDiffRegion:true,actualToolKVRegion:true,questionMouseDragGuardAndKeyboard:true,portalSelectionExcluded:true,screenshots,errors});
  await page.close();
 }catch(error){if(page){await page.screenshot({path:join(evidence.pathname,`${engine}-failure.png`)});console.error((await page.locator('body').innerText()).slice(-5000));console.error('ASKS',await page.locator('[data-ccv-quotable="ask-question"]').evaluateAll(els=>els.map(el=>({connected:el.isConnected,assistant:!!el.closest('[data-ccv-role="assistant"]'),text:el.textContent}))));}throw error;}finally{await browser.close();}
}
writeFileSync(join(evidence.pathname,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
