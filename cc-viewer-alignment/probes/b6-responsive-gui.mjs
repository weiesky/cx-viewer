// Phone/pad emulation only; does not claim physical touch, keyboard or audio devices.
import assert from 'node:assert/strict';import{readFileSync,mkdirSync,writeFileSync}from'node:fs';import{join}from'node:path';
const{chromium,webkit}=await import(process.env.CXV_PLAYWRIGHT_MODULE),f=JSON.parse(readFileSync(process.argv[2]||'/tmp/cxv-b6-gui-fixture.json'));
assert.ok(f.root.includes('/cxv-b6-preview-gui-'));
const out=new URL('../evidence/B6-preview-2026-11-21/',import.meta.url);mkdirSync(out,{recursive:true});const results=[];
for(const engine of ['chromium','webkit'])for(const mode of ['phone','pad']){
 const browser=await({chromium,webkit})[engine].launch({headless:true});const page=await browser.newPage({locale:'en-US',viewport:mode==='phone'?{width:390,height:844}:{width:1024,height:768},hasTouch:true,isMobile:true,userAgent:mode==='phone'?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 await page.route(/https?:\/\/(ipwho\.is|ipapi\.co|ipinfo\.io)\//, route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"success":true,"country_code":"US","country":"US"}' }));
 page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const screenshots=[];let stage='start';
 const shot=async name=>{const path=join(out.pathname,`${engine}-${mode}-${name}.png`);await page.screenshot({path});screenshots.push(path);};
 try{
  await page.goto(f.b.url+(mode==='pad'?'&ipad=1':'&mobile=1'));await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:/Project Folder/i}).click();
  assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('pad-mode')),mode==='pad');
  const file=name=>page.getByText(name,{exact:true}).filter({visible:true}).last();
  stage='archive';await file('sample.zip').click();await page.getByRole('button',{name:'docs/hello.txt',exact:true}).filter({visible:true}).click();
  const archive=page.locator('[class*="detailBody_"] pre').filter({visible:true});await archive.waitFor();assert.match(await archive.innerText(),/ARCHIVE_B/);
  const body=page.locator('[class*="viewer_"]').filter({has:page.locator('[class*="detailBody_"]')}).filter({visible:true});
  const layout=await body.locator('[class*="body_"]').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns,rows:getComputedStyle(el).gridTemplateRows,width:el.getBoundingClientRect().width,viewport:innerWidth,clientWidth:document.documentElement.clientWidth}));
  console.log({engine,mode,layout});assert.ok(layout.width<=page.viewportSize().width+1);await shot('archive');
  stage='subtitle';await file('caption.srt').click();await page.getByRole('tab',{name:'Raw',exact:true}).filter({visible:true}).click();await page.locator('pre').filter({hasText:'SUBTITLE_B',visible:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.B6_XSS),undefined);await shot('subtitle');
  stage='audio';await file('voice.wav').click();await page.locator('audio').filter({visible:true}).waitFor();assert.equal(await page.locator('audio').filter({visible:true}).getAttribute('preload'),'none');await shot('audio');
  assert.deepEqual(errors,[]);results.push({engine,version:browser.version(),mode,viewport:page.viewportSize(),emulated:true,archiveLayout:layout,subtitleSafeRaw:true,audioControls:true,screenshots,errors});
 }catch(error){await page.screenshot({path:join(out.pathname,`${engine}-${mode}-failure.png`)});console.error(stage,(await page.locator('body').innerText()).slice(-2500));throw error;}finally{await browser.close();}
}
writeFileSync(join(out.pathname,'responsive-result.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
