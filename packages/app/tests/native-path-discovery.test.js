import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {pickSpawnableLookupResult} from '../findcx.js';
test('Windows lookup ignores extensionless, cmd and PowerShell shims and takes an exe',()=>{
 assert.equal(pickSpawnableLookupResult('C:\\bin\\codex\r\nC:\\bin\\codex.cmd\r\nC:\\bin\\codex.ps1\r\nC:\\native\\codex.EXE\r\n','win32'),'C:\\native\\codex.EXE');
 assert.equal(pickSpawnableLookupResult('C:\\bin\\codex.cmd','win32'),null);
 assert.equal(pickSpawnableLookupResult('/owned/codex\n/other/codex','linux'),'/owned/codex');
});
test('actual native resolver accepts package-native executables and rejects JavaScript launchers',()=>{
 const root=mkdtempSync(join(tmpdir(),'cxv-native-discovery-'));const native=join(root,'node_modules','pkg','codex.exe'),js=join(root,'node_modules','pkg','codex.js');mkdirSync(join(root,'node_modules','pkg'),{recursive:true});writeFileSync(native,'fixture, never executed');writeFileSync(js,'fixture, never executed');
 const entry=new URL('../findcx.js',import.meta.url).href;
 const run=(path,platform)=>execFileSync(process.execPath,['--input-type=module','-e',`import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';cp.execSync=()=>process.env.PROBE_PATH;syncBuiltinESMExports();Object.defineProperty(process,'platform',{value:${JSON.stringify(platform)}});const {resolveNativePath}=await import(${JSON.stringify(entry)});console.log(resolveNativePath());`],{encoding:'utf8',env:{...process.env,HOME:root,PROBE_PATH:path,CXV_TEST:'1'}}).trim();
 try{assert.equal(run('/shim/codex.cmd\r\n'+native,'win32'),native);assert.equal(run(js,'darwin'),'null');assert.equal(run(native,'darwin'),native);}finally{rmSync(root,{recursive:true,force:true});}
});
