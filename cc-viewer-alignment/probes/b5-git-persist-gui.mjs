import assert from 'node:assert/strict';
export async function verifyGitPersistence(page, fixture, drainFetches) {
  let stage='open'; const panel=()=>page.locator('[class*=gitChanges_]'), ready=async label=>{await panel().getByTitle('B5 '+label+' local',{exact:true}).waitFor();await drainFetches();};
  const gitButton=()=>page.getByTitle('Git 变更',{exact:true});
  const stored=()=>page.evaluate(()=>({git:localStorage.getItem('cxv_gitChangesOpen'),files:localStorage.getItem('cxv_fileExplorerOpen')}));
  try {
    await gitButton().waitFor(); await gitButton().click(); await ready('A'); assert.deepEqual(await stored(),{git:'true',files:'false'});
    stage='reload-open'; await page.reload(); await ready('A'); assert.equal(await page.locator('[data-file-explorer]').count(),0);
    stage='active-close'; await panel().getByTitle('Close',{exact:true}).click(); assert.equal((await stored()).git,'false'); await drainFetches(); await page.reload(); await gitButton().waitFor(); assert.equal(await panel().count(),0);
    stage='passive-open-file'; await gitButton().click(); await ready('A'); await page.locator('.chat-md a[data-md-file="note.txt"]').first().click(); await page.locator('.cm-content').waitFor(); assert.deepEqual(await stored(),{git:'true',files:'true'});
    await drainFetches(); await page.reload(); await page.locator('[data-file-explorer]').waitFor(); assert.equal(await panel().count(),0,'tree wins if both stored open');
    stage='active-tree-exclusion'; await gitButton().click(); await ready('A'); await page.getByTitle('文件浏览器',{exact:true}).click(); assert.equal((await stored()).git,'false');
    stage='same-name-switch'; await gitButton().click(); await ready('A'); await page.evaluate(url=>{history.pushState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));},fixture.b.url); await ready('B'); assert.equal(await panel().getByTitle('B5 A local',{exact:true}).count(),0);
    // New isolated contexts exercise module-time phone/pad gates with the same
    // original visibility preferences, without mutating the desktop context.
    for(const mode of ['pad','phone']) {
      stage=mode+'-restore'; const ctx=await page.context().browser().newContext({viewport:mode==='pad'?{width:834,height:1194}:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:mode==='pad'?'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
      try {
        await ctx.addInitScript(()=>{localStorage.setItem('cxv_gitChangesOpen','true');localStorage.setItem('cxv_fileExplorerOpen','false');});
        const target=await ctx.newPage(), pending=new Set(), errors=[]; target.on('pageerror',error=>errors.push(error.message));
        target.on('request',req=>{if(req.resourceType()==='fetch'&&new URL(req.url()).pathname.startsWith('/api/'))pending.add(req);});target.on('requestfinished',req=>pending.delete(req));target.on('requestfailed',req=>pending.delete(req));
        await target.route(/^https?:\/\/(?:ipinfo\.io|ipwho\.is|ipapi\.co)\//,route=>route.fulfill({status:200,contentType:'application/json',body:'{"country":"CN","country_code":"CN","ip":"127.0.0.1"}',headers:{'access-control-allow-origin':'*'}}));
        await target.goto(fixture.a.url+(mode==='pad'?'&ipad=1':'&mobile=1'));
        if(mode==='pad') await target.locator('[class*=gitChanges_]').getByTitle('B5 A local',{exact:true}).waitFor();
        else {await target.locator('.chat-md a[data-md-file="note.txt"]').first().waitFor();assert.equal(await target.locator('[class*=gitChanges_]').count(),0);}
        await target.waitForTimeout(150); for(let n=0;n<250&&pending.size;n++)await target.waitForTimeout(20);assert.equal(pending.size,0);assert.deepEqual(errors,[]);
      } finally {await ctx.close();}
    }
    console.log(JSON.stringify({engine:page.context().browser().browserType().name(),mode:'git-persist',browserVersion:page.context().browser().version(),originalVisibilityRestore:true,activeClosePersistsFalse:true,passiveFileOpenKeepsIntent:true,treePriorityPreventsDoubleRestore:true,activeTreeClosePersists:true,sameNameScopeBOnly:true,padRestoresPhoneDoesNot:true}));
  } catch(error) {console.error('Git persistence GUI stage:',stage);throw error;}
}
