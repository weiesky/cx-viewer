import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-target-scope-'))),home=join(root,'home'),cwd=join(home,'project'),config=join(root,'custom-codex'),log=join(root,'logs');
for(const dir of [home,cwd,config,log])mkdirSync(dir,{recursive:true});
Object.assign(process.env,{HOME:home,CODEX_HOME:config,CXV_PROJECT_DIR:cwd,CXV_LOG_DIR:log});
const {resolveTargetRoot,resolveTargetWriteScope,targetRelPath,requiredTargetRelPath}=await import('../lib/target-scope.js');
const {isWriteAllowed}=await import('../lib/file-access-policy.js');
const put=(file,content='synthetic')=>{mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,content);return file;};
const skill=dir=>put(join(dir,'SKILL.md'),'---\nname: '+dir.split('/').at(-1)+'\ndescription: Synthetic fixture\n---\n');
const url=params=>new URL('http://fixture/api/target-files?'+new URLSearchParams(params));
const md=(file)=>({id:Buffer.from(file).toString('base64url'),path:file});
const target=(file,base=cwd)=>{const entry=md(file);return resolveTargetRoot(url({kind:'codex-md',id:entry.id}),base,{codexMdEntries:[entry]});};
after(()=>rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}));

test('native AGENTS opaque identity reuses server discovery and never accepts client roots or decoded arbitrary paths',()=>{
  const file=put(join(cwd,'AGENTS.md')),entry=md(file);
  const scope=resolveTargetRoot(url({kind:'codex-md',id:entry.id,root:home,path:'..'}),cwd,{codexMdEntries:[entry]});
  assert.equal(scope.rootReal,cwd);assert.equal(scope.rootKind,'project');assert.equal(scope.targetPath,'');assert.equal(scope.targetKind,'codex-md');
  assert.throws(()=>resolveTargetRoot(url({kind:'codex-md',id:entry.id}),cwd),{status:404});
  assert.throws(()=>resolveTargetRoot(url({kind:'codex-md',id:'../other'}),cwd,{codexMdEntries:[entry]}),{status:400});
  assert.throws(()=>resolveTargetRoot(url({kind:'claude-md',id:entry.id}),cwd,{codexMdEntries:[entry]}),{status:400});
});

test('global native targets retain original home/config navigation without authorizing all of HOME',()=>{
  const global=put(join(home,'.codex/AGENTS.md')),custom=put(join(config,'AGENTS.md'));
  const globalScope=target(global);assert.equal(globalScope.rootReal,home);assert.equal(globalScope.rootKind,'home');assert.equal(globalScope.targetPath,'.codex');
  const configScope=target(custom);assert.equal(configScope.rootReal,root);assert.equal(configScope.rootKind,'config');assert.equal(configScope.targetPath,'custom-codex');
  assert.equal(isWriteAllowed(join(home,'unregistered.txt'),{cwd}).ok,false);
  assert.throws(()=>target(put(join(home,'AGENTS.md'))),{status:403},'native ancestor detail identity does not grant folder allowlist access');
});

test('actual user/project/.agents skill discovery determines targets and writable scope remains whole navigation root',()=>{
  for(const [source,path,rootKind,rootReal] of [
    ['project',join(cwd,'.codex/skills/project-demo'),'project',cwd],
    ['user',join(home,'.codex/skills/user-demo'),'home',home],
    ['user',join(home,'.agents/skills/agents-demo'),'home',home],
  ]) {
    skill(path);const params=url({kind:'skill',source,targetPath:path});const scope=resolveTargetRoot(params,cwd);
    assert.equal(scope.rootKind,rootKind);assert.equal(scope.rootReal,rootReal);
    assert.deepEqual(resolveTargetWriteScope(params,cwd),scope,'do not silently tighten writes to target subtree');
  }
  assert.throws(()=>resolveTargetRoot(url({kind:'skill',source:'builtin',targetPath:cwd}),cwd),{status:400});
  assert.throws(()=>resolveTargetRoot(url({kind:'skill',source:'user',targetPath:cwd}),cwd),{status:404});
});

test('native plugin target uses actual default plugin owner under custom CODEX_HOME and rejects manifest escapes',()=>{
  const plugin=join(home,'.codex/plugins/cache/store/plugin/1.0.0'),path=join(plugin,'skills/plugin-demo');
  const manifest=join(plugin,'.codex-plugin/plugin.json');put(manifest,JSON.stringify({name:'synthetic',skills:'./skills'}));skill(path);
  const scope=resolveTargetRoot(url({kind:'skill',source:'plugin',targetPath:path}),cwd);assert.equal(scope.rootKind,'home');
  put(manifest,JSON.stringify({name:'synthetic',skills:join(cwd,'.codex/skills')}));
  assert.throws(()=>resolveTargetRoot(url({kind:'skill',source:'plugin',targetPath:join(cwd,'.codex/skills/project-demo')}),cwd),{status:403});
});

test('registered ancestor outside HOME/config uses original target-only fallback and exact viewed cwd',()=>{
  const registered=join(root,'registered'),view=join(registered,'nested');mkdirSync(view,{recursive:true});const file=put(join(registered,'AGENTS.md'));
  put(join(log,'workspaces.json'),JSON.stringify({workspaces:[{path:registered}]}));const scope=target(file,view);
  assert.equal(scope.rootKind,'target');assert.equal(scope.rootReal,registered);assert.equal(scope.targetPath,'');
});

test('target navigation rejects traversal, drive/absolute paths, NUL, ambiguity and excessive depth',()=>{
  assert.equal(targetRelPath(null),null);assert.deepEqual(targetRelPath(''),[]);assert.deepEqual(targetRelPath('a/b'),['a','b']);
  for(const path of ['..','a/../b','a//b','./a','/a','C:/a','a\\b','a\0b','a/'.repeat(33)+'b','x'.repeat(2049)])assert.throws(()=>targetRelPath(path),{status:400});
  assert.throws(()=>requiredTargetRelPath(null),{status:400});assert.deepEqual(requiredTargetRelPath(''),[]);
});
