import test from 'node:test';import assert from 'node:assert/strict';import{mkdtempSync,mkdirSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';
import {getModelSystemPrompts,selectSystemPrompt,saveModelSystemPrompt,saveDefaultSystemPrompt,setBuiltinModelPromptDisabled} from '../lib/model-system-prompts.js';
import {createSystemPromptVariables,renderSystemPromptText} from '../lib/system-prompt-render.js';
import {injectManagedSystemPrompt} from '../lib/appserver-bridge.js';
function fixture(){const root=mkdtempSync(join(tmpdir(),'cxv-builtin-select-')),cwd=join(root,'project');mkdirSync(cwd);return{root,cwd,logDir:join(root,'logs')}}
test('builtins are default-effective with native variables, scoped opt-outs and user overrides',()=>{const ctx=fixture();try{
 for(const model of ['k3','kimi-k2.7-code','deepseek-v4-flash','deepseek-v4-pro','glm-5.2','glm-5.3','qwen-3.8-max']){const selected=selectSystemPrompt({...ctx,model});assert.equal(selected.scope,'builtin');assert.equal(selected.mode,'override');assert.ok(selected.text.startsWith('You are '+model));assert.doesNotMatch(selected.text,/\$\{(?:model\.name|os\.|environment\.lang)/);}
 const raw=getModelSystemPrompts(ctx).builtin.find(e=>e.name==='KIMI-K3').text;assert.match(raw,/\$\{model.name\}/);
 saveDefaultSystemPrompt({...ctx,text:'fallback ${verbatim}',mode:'append'});
 setBuiltinModelPromptDisabled({...ctx,scope:'global',name:'KIMI-K3',disabled:true,expectedRevision:'0'});assert.equal(selectSystemPrompt({...ctx,model:'k3'}).text,'fallback ${verbatim}');
 saveModelSystemPrompt({...ctx,scope:'global',name:'KIMI',text:'global ${model.name} ${verbatim}',mode:'append'});assert.equal(selectSystemPrompt({...ctx,model:'k3'}).text,'global k3 ${verbatim}');
 saveModelSystemPrompt({...ctx,scope:'workspace',name:'KIMI-K3',text:'workspace',mode:'override'});assert.equal(selectSystemPrompt({...ctx,model:'k3'}).text,'workspace');
 const previous=process.env.CXV_DISABLE_AUTO_SYSTEM_PROMPT;try{process.env.CXV_DISABLE_AUTO_SYSTEM_PROMPT='1';assert.equal(selectSystemPrompt({...ctx,model:'k3'}),null);}finally{if(previous===undefined)delete process.env.CXV_DISABLE_AUTO_SYSTEM_PROMPT;else process.env.CXV_DISABLE_AUTO_SYSTEM_PROMPT=previous;}
 }finally{rmSync(ctx.root,{recursive:true,force:true})}});
test('renderer substitutes only native keys literally and never evaluates or recursively expands values',()=>{
 const variables=createSystemPromptVariables('model-${os.shell}',{LANG:'zh_CN.UTF-8',SHELL:'/bin/zsh'});assert.equal(variables['environment.lang'],'zh-CN');assert.equal(renderSystemPromptText('${model.name} ${os.shell} ${verbatim}',variables),'model-${os.shell} /bin/zsh ${verbatim}');
});
test('explicit native base instructions and instruction files suppress automatic presets',()=>{
 const ctx=fixture();try{
  const options={...ctx,capability:{verified:true,append:true,override:true},model:'k3'};
  for(const params of [{baseInstructions:'user-owned base'},{baseInstructions:''},{config:{model_instructions_file:'/manual/instructions.md'}}]){
   const input={method:'thread/start',params:{cwd:ctx.cwd,model:'k3',...params}};
   assert.equal(injectManagedSystemPrompt(input,options),input);
  }
 }finally{rmSync(ctx.root,{recursive:true,force:true})}
});
test('effective proxy model chooses the native preset without changing the requested model or resume instructions',()=>{const ctx=fixture();try{const input={method:'thread/start',params:{cwd:ctx.cwd,model:'gpt-5',developerInstructions:'host'}};const options={...ctx,capability:{verified:true,append:true,override:true},model:'k3'};const result=injectManagedSystemPrompt(input,options);assert.equal(result.params.model,'gpt-5');assert.equal(result.params.developerInstructions,'host');assert.ok(result.params.baseInstructions.startsWith('You are k3'));const resumed={method:'thread/resume',params:{threadId:'same'}};assert.equal(injectManagedSystemPrompt(resumed,options),resumed);assert.equal(injectManagedSystemPrompt(input,{...options,capability:{verified:true,append:true,override:false}}),input);}finally{rmSync(ctx.root,{recursive:true,force:true})}});
