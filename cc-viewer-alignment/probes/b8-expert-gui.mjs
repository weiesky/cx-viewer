// Run with PLAYWRIGHT_BROWSERS_PATH set; uses an isolated native-protocol fixture, never a model.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {chromium, webkit} from '/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const fixture=JSON.parse(readFileSync(process.env.CXV_B8_FIXTURE || '/tmp/cxv-b8-expert-ui-fixture.json'));
const expert=JSON.parse(readFileSync(new URL('../../packages/app/ultraAgents/test-analysis-expert.json',import.meta.url)));
const out=new URL('../B8-expert-gui/',import.meta.url);mkdirSync(out,{recursive:true});const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true}); const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'en-US'});const errors=[],shots=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/https:\/\/(ipwho\.is|ipapi\.co)/,r=>r.fulfill({json:{country_code:'SG',country:'Singapore'}}));
 const shot=async name=>{const file=engine+'-'+name+'.png';await page.screenshot({path:join(out.pathname,file)});shots.push(file)};
 const open=async()=>{await page.getByRole('button',{name:'UltraPlan',exact:true}).click();await page.getByRole('button',{name:'Custom Expert',exact:true}).click();};
 try{
  await page.goto(fixture.a.url);await page.locator('textarea:not(.xterm-helper-textarea)').first().waitFor();await open();
  const editor=page.getByRole('dialog',{name:'New Custom Expert',exact:true});await editor.getByRole('button',{name:'Load template',exact:true}).click();
  const picker=page.getByRole('dialog').filter({has:page.locator('textarea[readonly]')});await picker.getByText('Test Analysis Expert',{exact:true}).click();
  assert.equal(await picker.locator('textarea').inputValue(),expert.content);assert.ok((await picker.innerText()).includes('generation only'));
  await page.waitForTimeout(350);await shot('preview');
  await picker.getByRole('button',{name:'Load',exact:true}).click();await picker.waitFor({state:'hidden'});
  assert.equal(await editor.locator('input').inputValue(),'Test Analysis Expert');assert.equal(await editor.locator('textarea').inputValue(),expert.content);
  const title='B8 '+engine+' '+Date.now().toString().slice(-6);await editor.locator('input').fill(title);
  // Loading again must require confirmation, and cancelling preserves this draft.
  await editor.getByRole('button',{name:'Load template',exact:true}).click();await picker.getByText('Code Expert',{exact:true}).click();await picker.getByRole('button',{name:'Load',exact:true}).click();
  const confirm=page.locator('.ant-modal-confirm');await confirm.waitFor();await confirm.getByRole('button',{name:'Cancel',exact:true}).click();await confirm.waitFor({state:'hidden'});
  await picker.getByRole('button',{name:'Cancel',exact:true}).click();await picker.waitFor({state:'hidden'});
  assert.equal(await editor.locator('input').inputValue(),title);assert.equal(await editor.locator('textarea').inputValue(),expert.content);await shot('loaded');
  await editor.getByRole('button',{name:'Add custom expert',exact:true}).click();await editor.waitFor({state:'hidden'});
  await page.reload();await page.locator('textarea:not(.xterm-helper-textarea)').first().waitFor();await page.getByRole('button',{name:'UltraPlan',exact:true}).click();
  const custom=page.getByRole('button',{name:title,exact:true});await custom.waitFor();await custom.locator('..').getByTitle('Edit Custom Expert',{exact:true}).click();
  const edit=page.getByRole('dialog',{name:'Edit Custom Expert',exact:true});await edit.waitFor();assert.equal(await edit.locator('textarea').inputValue(),expert.content);await shot('persisted');
  assert.deepEqual(errors,[]);results.push({engine,version:browser.version(),title,previewExact:true,loadedExact:true,overwriteCancelPreserved:true,refreshExact:true,modelExecuted:false,screenshots:shots,errors});
 }catch(error){await page.screenshot({path:join(out.pathname,engine+'-failed.png')});console.error((await page.locator('body').innerText()).slice(-1800));throw error}finally{await browser.close()}
}
writeFileSync(join(out.pathname,'result.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
