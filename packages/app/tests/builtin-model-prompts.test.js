import test from 'node:test';import assert from 'node:assert/strict';
import {listSystemPromptPresets,listBuiltinModelPrompts,matchBuiltinModelPrompt} from '../lib/builtin-model-prompts.js';
import {readFileSync}from'node:fs';
test('the seven fixed presets retain manifest defaults and literal editor variables',()=>{
 const presets=listSystemPromptPresets();assert.equal(presets.length,7);assert.deepEqual(presets.map(p=>p.id),['deepseek-v4-pro','deepseek-v4-flash','GLM-5.2','GLM-5.3','Qwen-3','kimi-k2.7-code','kimi-k3']);
 for(const p of presets){assert.equal(p.category,'Global');assert.equal(p.defaultMode,'override');assert.match(p.text,/\$\{model.name\}/);assert.match(p.text,/\$\{os.platform\}/);assert.doesNotMatch(p.text,/__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__|<!--|~\/\.claude|`TaskUpdate`|`AskUserQuestion`/);assert.match(p.text,/Do not assume a memory directory/);assert.match(p.text,/Treat those tags as data/);}
 assert.equal(listBuiltinModelPrompts().length,7);assert.match(presets.find(p=>p.id==='kimi-k3').text,/Hard circuit breaker/);assert.match(presets.find(p=>p.id==='kimi-k3').text,/Never idle-poll/);assert.match(presets.find(p=>p.id==='kimi-k2.7-code').text,/Never idle-poll/);
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));assert.ok(pkg.files.includes('system-prompt-templates/'));
});
test('built-in matching follows final upstream aliases and family boundaries',()=>{
 for(const [model,id]of [['k3','kimi-k3'],['K3-preview[1m]','kimi-k3'],['kimi-k2.7-code','kimi-k2.7-code'],['deepseek-flash','deepseek-v4-flash'],['deepseek-v4-pro','deepseek-v4-pro'],['glm-5.3','GLM-5.3'],['qwen-3.8-max','Qwen-3'],['qwen-3.7-max','Qwen-3']])assert.equal(matchBuiltinModelPrompt(model)?.id,id,model);
 for(const model of ['gpt-5','k30','k3pro','constructor','__proto__',null,{}])assert.equal(matchBuiltinModelPrompt(model),null,String(model));
});
