import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {buildNpmRootCommand,parseNpmRootOutput,globalNodeModulesCandidates,inferGlobalNodeModulesDir} from '../findcx.js';

test('Windows npm discovery uses a real executable and fixed literal argv', () => {
 const c=buildNpmRootCommand('win32',{COMSPEC:'D:\\Windows\\cmd.exe',NPM_CONFIG_PREFIX:'x & calc.exe'});
 assert.deepEqual(c,{cmd:'D:\\Windows\\cmd.exe',args:['/d','/s','/c','npm root -g'],windowsVerbatimArguments:true});
 assert.deepEqual(buildNpmRootCommand('linux',{}),{cmd:'npm',args:['root','-g'],windowsVerbatimArguments:false});
});
test('npm notices/CRLF and empty output use the original parser',()=>{
 assert.equal(parseNpmRootOutput('npm warn example\r\nC:\\prefix\\node_modules\r\n'),'C:\\prefix\\node_modules');
 for(const s of ['',null,undefined,'\n \n'])assert.equal(parseNpmRootOutput(s),null);
});
test('platform fallback candidates honor the explicit prefix and Windows separators',()=>{
 const paths=globalNodeModulesCandidates('win32',{NPM_CONFIG_PREFIX:'D:\\node',APPDATA:'C:\\Roaming'},'C:\\home');
 assert.equal(paths[0],'D:\\node\\node_modules');assert.ok(paths.includes('C:\\Roaming\\npm\\node_modules'));
 assert.ok(globalNodeModulesCandidates('linux',{},'/owned').includes('/owned/.npm-global/lib/node_modules'));
});
test('test context never probes real machine fallback directories',()=>assert.equal(inferGlobalNodeModulesDir(),null));
test('real discovery process tolerates warning output, missing npm and private prefix fallback',{skip:process.platform==='win32'},()=>{
 const root=mkdtempSync(join(tmpdir(),'cxv-npm-root-'));const bin=join(root,'bin'),prefix=join(root,'prefix');mkdirSync(bin);mkdirSync(join(prefix,'node_modules'),{recursive:true});
 const entry=pathToFileURL(new URL('../findcx.js',import.meta.url).pathname).href;
 const env={...process.env,HOME:root,PATH:bin,NPM_CONFIG_PREFIX:prefix};delete env.NODE_TEST_CONTEXT;delete env.CXV_TEST;
 const run=()=>execFileSync(process.execPath,['--input-type=module','-e',`import {getGlobalNodeModulesDir} from ${JSON.stringify(entry)};console.log(getGlobalNodeModulesDir())`],{env,encoding:'utf8'}).trim();
 try{
  writeFileSync(join(bin,'npm'),'#!/bin/sh\nprintf "npm warn example\\n/owned/node_modules\\n"\n',{mode:0o700});assert.equal(run(),'/owned/node_modules');
  writeFileSync(join(bin,'npm'),'#!/bin/sh\nexit 1\n',{mode:0o700});assert.equal(run(),join(prefix,'node_modules'));
  rmSync(join(bin,'npm'));assert.equal(run(),join(prefix,'node_modules'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
