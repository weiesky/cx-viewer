import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const f=JSON.parse(readFileSync('/tmp/cxv-b7-pty-fixture.json'));
const owners=(await(await fetch(f.url+'api/workspaces')).json()).sessions; const owner=owners.find(s=>s.cwd===f.a); assert(owner);
const original=await (await fetch(f.url+'api/preferences')).json();
const patch=async value=>{const r=await fetch(f.url+'api/preferences',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pinnedMenuKeys:value})});assert(r.ok);};
const out=new URL('../B7-pinned-preferences/',import.meta.url).pathname;mkdirSync(out,{recursive:true});const cases=[];
try{
for(const[engine,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});const errors=[];
 try{
  await patch(null);
  const first=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US'});
  await first.addInitScript(()=>{if(!sessionStorage.getItem('b7-seeded')){localStorage.setItem('cxv_pinnedMenuKeys','["project-stats"]');sessionStorage.setItem('b7-seeded','1');}});
  async function open(context){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route(/https:\/\/(ipinfo\.io|ipwho\.is|ipapi\.co)/,r=>r.fulfill({headers:{'access-control-allow-origin':'*'},json:{country:'SG',country_code:'SG'}}));await p.goto(f.url+'?instance='+owner.instanceKey);return p;}
  const a=await open(first),pins=a.locator('[class*="pinnedShortcut_"]');await pins.waitFor();
  assert.deepEqual((await(await fetch(f.url+'api/preferences')).json()).pinnedMenuKeys,['project-stats']);
  assert.equal(await a.evaluate(()=>localStorage.getItem('cxv_pinnedMenuKeys')),null);
  const migrated=engine+'-migrated.png';await a.screenshot({path:join(out,migrated)});
  const second=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US'});const b=await open(second);await b.locator('[class*="pinnedShortcut_"]').waitFor();
  assert.equal(await b.evaluate(()=>localStorage.getItem('cxv_pinnedMenuKeys')),null);
  await a.locator('[class*="logoWrap_"]').first().hover();const menu=a.getByRole('menuitem').filter({hasText:await pins.getAttribute('aria-label')});await menu.hover();await menu.locator('[data-pin-trigger]').click();
  await a.waitForFunction(()=>!document.querySelector('[class*="pinnedShortcut_"]'));
  await b.reload();await b.locator('[class*="logoWrap_"]').first().waitFor();
  await b.waitForTimeout(500);assert.equal(await b.locator('[class*="pinnedShortcut_"]').count(),0);
  assert.deepEqual((await(await fetch(f.url+'api/preferences')).json()).pinnedMenuKeys,[]);
  const cleared=engine+'-cross-browser-cleared.png';await b.screenshot({path:join(out,cleared)});
  assert.deepEqual(errors,[]);cases.push({engine,version:browser.version(),legacyMigratedAndCleared:true,separateBrowserContextHydratesServer:true,realMenuUnpinPersisted:true,authoritativeEmptyAfterReload:true,pageerrors:errors,screenshots:[migrated,cleared]});
 }finally{await browser.close();}
}
}finally{await patch(original.pinnedMenuKeys??null);}
writeFileSync(join(out,'result.json'),JSON.stringify({cases},null,2)+'\n');console.log(JSON.stringify(cases));
