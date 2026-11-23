import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,basename} from 'node:path';
import {EventEmitter} from 'node:events';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../electron/main.js',import.meta.url),'utf8');
// Execute the actual complete functions; no mirrored implementation or source-needle assertions.
const resolver=source.slice(source.indexOf('function resolveNodeExecPath()'),source.indexOf('const _resolvedNode'));
const create=source.slice(source.indexOf('function createTab('),source.indexOf('\nfunction switchTab('));
test('actual Electron resolver handles Windows .exe results and missing external Node',()=>{
 const resolve=(platform,out,exists=true,electron='35')=>runInNewContext(resolver+'\nresolveNodeExecPath()',{
  process:{platform,execPath:'/owned/Electron',versions:{electron}},execSync:()=>{if(out instanceof Error)throw out;return out;},existsSync:()=>exists,
 });
 assert.equal(resolve('win32','C:\\node.cmd\r\nC:\\node.exe\r\n'),'C:\\node.exe');
 assert.equal(resolve('win32','C:\\node.cmd'),null);
 assert.equal(resolve('darwin',new Error('ENOENT')),null);
 assert.equal(resolve('darwin','/missing/node',false),null);
 assert.equal(resolve('darwin','',true,null),'/owned/Electron');
});
test('actual createTab forks with the Electron fallback and immediately settles failed IPC',()=>{
 for(const fallback of [true,false]){
  const child=new EventEmitter(),tabs=new Map(),diagnostics=[],cleared=[],forks=[];
  child.send=()=>{throw Object.assign(new Error('closed'),{code:'EPIPE'});};
  const context={tabs,nextTabId:1,activeTabId:null,basename,join,realpathSync:p=>p,devLog(){},broadcastTabs(){},hideWorkspaceSelector(){},
   process:{env:{ELECTRON_RUN_AS_NODE:'stale',CXV_WORKSPACE_MODE:'1'}},_forkUnderElectron:fallback,_nodePath:'/owned/Node',runtimeRoot:'/owned/runtime',
   isStaleLocalCodexBaseUrl:()=>false,runtimeFile:(...p)=>join('/owned/runtime',...p),fork:(...p)=>{forks.push(p);return child;},
   _isDev:false,home:'/owned/home',setTimeout:()=>42,clearTimeout:id=>cleared.push(id),appendDiag:(...p)=>diagnostics.push(p),
   codexPath:'/owned/codex',isNpmVersion:false,clearPendingForTab(){},
  };
  runInNewContext(create+'\ncreateTab("/owned/project")',context);
  assert.equal(forks[0][2].env.ELECTRON_RUN_AS_NODE,fallback?'1':undefined);
  assert.equal(forks[0][2].env.CXV_WORKSPACE_MODE,undefined);assert.equal(forks[0][2].env.CXV_ELECTRON_TAB,'1');
  assert.ok(diagnostics.some(p=>p[0]==='tab:child-send-failed'));
  child.emit('error',new Error('spawn ENOENT'));
  assert.equal(tabs.get(1).status,'error');assert.deepEqual(cleared,[42]);
 }
});
