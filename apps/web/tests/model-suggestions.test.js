import test from 'node:test';import assert from 'node:assert/strict';
import {collectModelSuggestions} from '../src/utils/modelSuggestions.js';
test('native model suggestions preserve source order and grammar without inventing Claude fields',()=>{
 assert.deepEqual(collectModelSuggestions({profiles:[{activeModel:'k3[1m]'},{activeModel:'K3'},{activeModel:'GLM-5.3'},{activeModel:'default'},{activeModel:'../x'}],defaultConfig:{model:'gpt-5'}},{model:'deepseek-v4-pro'}),['k3','GLM-5.3','gpt-5','deepseek-v4-pro']);
 for(const profiles of [null,{},'junk',{profiles:{}},{profiles:[null,42]}])assert.deepEqual(collectModelSuggestions(profiles,null),[]);
 assert.deepEqual(collectModelSuggestions({profiles:[{activeModel:'X_APPEND'},{activeModel:'x'.repeat(65)}]},{model:'valid-model'}),['valid-model']);
});
