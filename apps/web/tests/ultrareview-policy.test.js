import test from 'node:test';
import assert from 'node:assert/strict';
import {t,setLang} from '../src/i18n.js';
const languages=['zh','en','zh-TW','ko','ja','de','es','fr','it','da','pl','ru','ar','no','pt-BR','th','tr','uk'];
test('standalone UltraReview follows the selected upstream remediation policy in every locale',()=>{
 for(const lang of languages){setLang(lang);const prompt=t('ui.preset.codeReview5.desc');const policy=prompt.split('\n').find(line=>line.startsWith('4.'));assert.match(policy,/P0/);assert.match(policy,/P1/);assert.match(policy,/P2/);assert.match(policy,/request_user_input/);assert.doesNotMatch(prompt,/AskUserQuestion|askUserQuestion|TeamCreate|TeamDelete/);assert.match(prompt,/tool_search/);assert.ok(prompt.split('\n').some(line=>line.startsWith('5.')));}
 setLang('en');
});
