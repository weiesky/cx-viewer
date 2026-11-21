import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
export async function verifyMarkdownFiles(page, fixture, repo, engine, drainFetches) {
  const probes=[], opens=[], screenshots=[]; let stage='initial';
  page.on('request', req=>{ const url=new URL(req.url()); if(url.pathname==='/api/files-exists') probes.push({instance:url.searchParams.get('instance'),paths:req.postDataJSON().paths}); if(url.pathname==='/api/file-content') opens.push({instance:url.searchParams.get('instance'),path:url.searchParams.get('path')}); });
  const evidence=join(repo,'cc-viewer-alignment/evidence/B5-markdown-files-2026-11-21'); mkdirSync(evidence,{recursive:true});
  const a=new URL(fixture.a.url).searchParams.get('instance'), b=new URL(fixture.b.url).searchParams.get('instance');
  const candidate=path=>page.locator('.chat-md code[data-md-path-candidate]').filter({hasText:path}).first();
  const code=()=>page.locator('.chat-md code[data-md-path-candidate="markdown/target.txt"]').first();
  const preview=()=>page.locator('.cm-content').first();
  const close=async()=>{await page.getByTitle('返回对话',{exact:true}).first().click(); await preview().waitFor({state:'detached'});};
  try {
    await page.waitForFunction(()=>document.querySelector('.chat-md code[data-md-path-candidate="only-a.txt"][data-md-file-verified]'));
    await page.waitForTimeout(150); await drainFetches(); probes.length=0; await page.reload();
    await code().waitFor(); await page.waitForFunction(()=>document.querySelector('.chat-md code[data-md-path-candidate="only-a.txt"][data-md-file-verified]'));
    await drainFetches(); await page.waitForTimeout(300); const count=probes.length; await page.waitForTimeout(400); assert.equal(probes.length,count,'negative candidates do not spin');
    assert.ok(probes.length>=5); assert.ok(probes.every(row=>row.instance===a && row.paths.length<=50));
    assert.equal(await page.locator('.chat-md code[data-md-path-candidate^="missing-"][data-md-file-verified]').count(),0);
    assert.equal(await page.locator('.chat-md code').filter({hasText:'npm run build'}).first().getAttribute('data-md-path-candidate'),null);
    const local=page.locator('.chat-md a').filter({hasText:'Open local'}).first(), external=page.locator('.chat-md a').filter({hasText:'External'}).first(), unsafe=page.locator('.chat-md a').filter({hasText:'Unsafe'}).first();
    assert.equal(await local.getAttribute('data-md-file'),'markdown/target.txt'); assert.equal(await external.getAttribute('target'),'_blank'); assert.match(await external.getAttribute('rel'),/noopener/); assert.equal(await unsafe.getAttribute('href'),null);
    assert.deepEqual(await code().evaluate(el=>({cursor:getComputedStyle(el).cursor,line:getComputedStyle(el).textDecorationStyle,border:getComputedStyle(el).borderTopWidth})),{cursor:'pointer',line:'dotted',border:'1px'});
    await code().scrollIntoViewIfNeeded(); const shot=join(evidence,engine+'-original-path-affordance.png'); await page.screenshot({path:shot,animations:'disabled'}); screenshots.push(shot);
    stage='local-link'; await local.click(); await preview().waitFor(); assert.match(await preview().innerText(),/MARKDOWN_A_LINE_1/); await close();
    stage='code-keyboard-line'; await code().focus(); await code().press('Enter'); await preview().waitFor();
    await page.waitForTimeout(500);
    const cold = await page.locator('.cm-scroller').first().evaluate(el=>({scrollTop:el.scrollTop,first:[...el.querySelectorAll('.cm-line')].find(line=>line.getBoundingClientRect().bottom>el.getBoundingClientRect().top)?.textContent}));
    // Independently mount the full, unchanged frozen upstream component using
    // the installed React and original lock's editor versions, then fetch the same file.
    const require=createRequire(join(repo,'apps/web/package.json'));
    const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
    const upstream='/tmp/cxv-cc-viewer-research/apps/web/src';
    const originalDeps=process.env.CXV_ORIGINAL_CODEMIRROR_ROOT || dirname(readFileSync('/tmp/cxv-b5-original-codemirror-path','utf8'));
    const originalEditorEntries={
      '@uiw/react-codemirror':join(originalDeps,'package/esm/index.js'),
      '@uiw/codemirror-extensions-basic-setup':join(originalDeps,'basic/package/esm/index.js'),
      '@codemirror/view':join(originalDeps,'view/package/dist/index.js'),
      '@codemirror/state':join(originalDeps,'state/package/dist/index.js'),
      '@codemirror/language':join(originalDeps,'language/package/dist/index.js'),
      '@codemirror/lint':join(originalDeps,'lint/package/dist/index.js'),
    };
    const built=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import FileContentView from './components/files/FileContentView.jsx';import './global.css';createRoot(document.getElementById('root')).render(<div style={{position:'fixed',inset:0}}><FileContentView filePath="markdown/target.txt" scrollToLine={123} instance={${JSON.stringify(a)}} /></div>);`,resolveDir:upstream,loader:'jsx'},bundle:true,write:false,plugins:[{name:'original-workspace-exports',setup(build){build.onResolve({filter:/^(?:@uiw\/(?:react-codemirror|codemirror-extensions-basic-setup)|@codemirror\/(?:view|state|language|lint))$/},args=>({path:originalEditorEntries[args.path]}));build.onResolve({filter:/^@ccv\/core\//},args=>({path:join('/tmp/cxv-cc-viewer-research/packages/core/src',args.path.slice('@ccv/core/'.length)+'.js')}));}}],outdir:'/tmp/cxv-baseline-line',format:'iife',platform:'browser',nodePaths:[join(repo,'apps/web/node_modules'),join(repo,'node_modules')],loader:{'.png':'dataurl','.gif':'dataurl','.svg':'dataurl','.woff':'dataurl','.woff2':'dataurl','.ttf':'dataurl'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'error'});
    const js=built.outputFiles.find(file=>file.path.endsWith('.js')).text, css=built.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';
    const baseline=await page.context().newPage(); let originalCold; const baselineErrors=[]; baseline.on('pageerror',error=>baselineErrors.push(error.message));
    try {
      await baseline.route('**/__b5-baseline-line.js',route=>route.fulfill({contentType:'application/javascript; charset=utf-8',body:js}));
      await baseline.route('**/__b5-baseline-line?*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><style>'+css+'</style><div id="root"></div><script src="/__b5-baseline-line.js"></script>'}));
      await baseline.goto(new URL('/__b5-baseline-line?instance='+encodeURIComponent(a),fixture.a.url).href); await baseline.locator('.cm-content').waitFor({timeout:8000}).catch(async error=>{console.error('Original component diagnostics',JSON.stringify({errors:baselineErrors,body:(await baseline.locator('body').innerText()).slice(0,800)}));throw error;}); await baseline.waitForTimeout(500);
      originalCold=await baseline.locator('.cm-scroller').first().evaluate(el=>({scrollTop:el.scrollTop,first:[...el.querySelectorAll('.cm-line')].find(line=>line.getBoundingClientRect().bottom>el.getBoundingClientRect().top)?.textContent}));
      assert.deepEqual(baselineErrors,[]);
    } finally {await baseline.close();}
    assert.deepEqual(cold,originalCold,'cold line-scroll behavior matches full original component');
    assert.equal(cold.scrollTop,0); assert.equal(cold.first,'MARKDOWN_A_LINE_1');
    await page.waitForTimeout(250);
    const detail=join(evidence,engine+'-original-cold-line-preview.png'); await page.screenshot({path:detail,animations:'disabled'}); screenshots.push(detail); await close();
    stage='file-uri-keyboard'; const uri=page.locator('.chat-md a').filter({hasText:'File URI'}).first(); assert.equal(await uri.getAttribute('href'),null); assert.equal(await uri.getAttribute('tabindex'),'0'); await uri.focus(); await uri.press('Enter'); await preview().waitFor(); assert.match(await preview().innerText(),/MARKDOWN_A_LINE_1/); await close();
    await drainFetches(); stage='same-name-B'; await page.evaluate(url=>{history.pushState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));},fixture.b.url);
    await code().waitFor(); await page.waitForFunction(()=>document.querySelector('.chat-md code[data-md-path-candidate="markdown/target.txt"][data-md-file-verified]')); await drainFetches(); await page.waitForTimeout(200);
    assert.equal(await candidate('only-a.txt').getAttribute('data-md-file-verified'),null); assert.ok(probes.some(row=>row.instance===b && row.paths.includes('only-a.txt')));
    await code().focus(); await code().press('Space'); await preview().waitFor(); await page.waitForTimeout(300); assert.match(await preview().innerText(),/MARKDOWN_B_LINE_1/);
    assert.equal(opens.at(-1).instance,b); assert.equal(opens.at(-1).path,'markdown/target.txt');
    assert.equal(readFileSync(join(fixture.a.cwd,'only-a.txt'),'utf8'),'A_ONLY');
    console.log(JSON.stringify({engine,mode:'markdown',browserVersion:page.context().browser().version(),actualSanitizedLinksAndCode:true,batchCap50:true,negative205CandidatesDrainWithoutSpin:true,originalDottedAndHoverCss:true,localAndFileUriOpenA:true,keyboardEnterAndSpaceOpenActualFiles:true,originalColdLineScrollDefectPreserved:true,coldLineScroll:{local:cold,original:originalCold},sameNameBDoesNotReuseAExistence:true,actualFileReadsStayExactInstance:true,screenshots}));
  } catch(error) {console.error('Markdown GUI stage:',stage);throw error;}
}
