import test from 'node:test';import assert from 'node:assert/strict';import{mkdtempSync,mkdirSync,writeFileSync,readFileSync,statSync,symlinkSync,linkSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
import{getModelSystemPrompts,setBuiltinModelPromptDisabled,SystemPromptStoreError}from'../lib/model-system-prompts.js';
function fixture(){const root=mkdtempSync(join(tmpdir(),'cxv-builtin-state-')),cwd=join(root,'work');mkdirSync(cwd);return{root,cwd,logDir:join(root,'logs')}}
test('builtin opt-outs are scoped, private, revision-locked and survive final family renames',()=>{const ctx=fixture();try{
 let s=getModelSystemPrompts(ctx);assert.ok(s.builtin.every(e=>!e.disabled.workspace&&!e.disabled.global));
 const first=setBuiltinModelPromptDisabled({...ctx,scope:'global',name:'KIMI-K3',disabled:true,expectedRevision:'0'});s=getModelSystemPrompts(ctx);assert.equal(s.builtin.find(e=>e.name==='KIMI-K3').disabled.global,true);assert.equal(s.builtin.find(e=>e.name==='KIMI-K3').disabled.workspace,false);const path=join(s.globalDir,'.builtin-disabled.json');assert.equal(statSync(path).mode&0o777,0o600);const bytes=readFileSync(path);
 assert.throws(()=>setBuiltinModelPromptDisabled({...ctx,scope:'global',name:'GLM-5.3',disabled:true,expectedRevision:'0'}),e=>e.code==='prompt_conflict');assert.deepEqual(readFileSync(path),bytes);
 writeFileSync(join(s.workspaceDir,'.builtin-disabled.json'),JSON.stringify({version:1,names:['qwen-3.7-max']}));s=getModelSystemPrompts(ctx);assert.equal(s.builtin.find(e=>e.name==='QWEN-3').disabled.workspace,true);
 setBuiltinModelPromptDisabled({...ctx,scope:'global',name:'KIMI-K3',disabled:false,expectedRevision:first.revision});assert.equal(getModelSystemPrompts(ctx).builtin.find(e=>e.name==='KIMI-K3').disabled.global,false);
 assert.throws(()=>setBuiltinModelPromptDisabled({...ctx,scope:'global',name:'constructor',disabled:true}),e=>e.code==='unknown_builtin');
 }finally{rmSync(ctx.root,{recursive:true,force:true})}});
test('damaged or linked tombstones never silently reverse an explicit opt-out',()=>{const ctx=fixture();try{const s=getModelSystemPrompts(ctx),path=join(s.globalDir,'.builtin-disabled.json'),target=join(ctx.root,'canary');writeFileSync(target,'preserve');
 writeFileSync(path,'{broken');assert.throws(()=>getModelSystemPrompts(ctx),e=>e instanceof SystemPromptStoreError&&e.code==='invalid_builtin_state');assert.equal(readFileSync(path,'utf8'),'{broken');rmSync(path);
 for(const kind of ['symlink','broken-symlink','hardlink']){if(kind==='hardlink')linkSync(target,path);else symlinkSync(kind==='symlink'?target:join(ctx.root,'absent'),path);assert.throws(()=>setBuiltinModelPromptDisabled({...ctx,scope:'global',name:'KIMI-K3',disabled:true}),e=>e.code==='unsafe_prompt_file');assert.equal(readFileSync(target,'utf8'),'preserve');rmSync(path);}
 }finally{rmSync(ctx.root,{recursive:true,force:true})}});
