import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import vm from'node:vm';import assert from'node:assert/strict';
import{chromium,webkit}from'/tmp/cxv-b4-browser.4dNjIw/node_modules/playwright/index.mjs';
const helpers=readFileSync(new URL('../../apps/web/src/utils/helpers.js',import.meta.url),'utf8');
const start=helpers.indexOf('const MODEL_PROVIDERS = ['),end=helpers.indexOf('// 自动审批三态',start);
assert.ok(start>=0&&end>start);const context={modelCodexAnimatedSvg:''};vm.createContext(context);vm.runInContext(helpers.slice(start,end).replaceAll('export function','function')+'\nthis.getModelInfo = getModelInfo;',context);
const aliases=['k3','K3','k3.1-pro','k3.1-pro-highspeed','k3-pro','k3[1m]','k4','K4','k4.1-pro','k4.1-pro-highspeed','kimi-k2.7-code','moonshot-v1'];
for(const model of aliases){const info=context.getModelInfo(model);assert.equal(info.provider,'Kimi',model);assert.match(info.svg,/fill="#1783FF"/);assert.match(info.svg,/fill="currentColor"/);}
for(const model of ['k30','k3pro','k40','k4pro'])assert.equal(context.getModelInfo(model).svg,null,model);
const svg=context.getModelInfo('k3').svg,css=readFileSync(new URL('../../apps/web/src/global.css',import.meta.url),'utf8'),out=new URL('../B8-model-logo-gui/',import.meta.url);mkdirSync(out,{recursive:true});const results=[];
for(const[name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});try{const page=await browser.newPage({viewport:{width:800,height:440}});
 await page.setContent('<style>'+css+'\nbody{margin:0;display:flex}.sample{width:400px;height:440px;display:grid;place-items:center;font:14px system-ui}.dark{background:#141414;color:#fff}.light{background:#fff;color:#000}.row{display:flex;gap:20px;align-items:center}.icon{display:flex;align-items:center;justify-content:center;color:inherit}.icon svg{width:100%;height:100%}</style>'+['dark','light'].map(theme=>'<div class="sample '+theme+'"><div>Kimi · '+theme+'</div><div class="row">'+[16,20,32,128].map(size=>'<div class="icon" style="width:'+size+'px;height:'+size+'px">'+svg+'</div>').join('')+'</div></div>').join(''));
 const fills=await page.locator('.sample').evaluateAll(xs=>xs.map(x=>[...x.querySelectorAll('.icon')][0]).map(x=>[...x.querySelectorAll('path')].map(p=>getComputedStyle(p).fill)));assert.deepEqual(fills,[['rgb(23, 131, 255)','rgb(255, 255, 255)'],['rgb(23, 131, 255)','rgb(0, 0, 0)']]);await page.screenshot({path:new URL(name+'.png',out).pathname});results.push({engine:name,version:browser.version(),fills});
 }finally{await browser.close()}
}
const result={scope:'Actual helper output and source SVG at avatar sizes; asset preview, not full product GUI',aliases,lookalikesExcluded:true,results};writeFileSync(new URL('result.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
