// Actual installed Codex + loopback synthetic Responses fixture. No external model or tools.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync,mkdirSync,realpathSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCodexAppServerClient} from '../../packages/app/lib/codex-appserver-client.js';
import {injectManagedSystemPrompt} from '../../packages/app/lib/appserver-bridge.js';
import {saveModelSystemPrompt,selectSystemPrompt} from '../../packages/app/lib/model-system-prompts.js';
import {prepareChatCompletionsRequest,adaptChatCompletionsResponse} from '../../packages/app/lib/codex-chat-adapter.js';
const codexPath=process.argv[2]||'/Users/sky/.npm-global/bin/codex';
const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-b8-native-builtin-'))),cwd=join(root,'project'),home=join(root,'home'),logDir=join(root,'logs');
for(const p of [cwd,home,join(home,'.codex'),logDir])mkdirSync(p,{recursive:true});
const env={...process.env,HOME:home,CODEX_HOME:join(home,'.codex'),OPENAI_API_KEY:'fixture-only',HTTP_PROXY:'http://127.0.0.1:9',HTTPS_PROXY:'http://127.0.0.1:9',ALL_PROXY:'http://127.0.0.1:9',NO_PROXY:'localhost,127.0.0.1'};
for(const key of ['OPENAI_BASE_URL','CXV_ORIGINAL_BASE_URL','CXV_BYPASS_PERMISSIONS'])delete env[key];
const version=execFileSync(codexPath,['--version'],{encoding:'utf8',env}).trim();
const schemaDir=join(root,'schema');execFileSync(codexPath,['app-server','generate-json-schema','--experimental','--out',schemaDir],{env,stdio:'ignore'});
const schemas=Object.fromEntries(['Start','Resume','Fork'].map(kind=>[kind,JSON.parse(readFileSync(join(schemaDir,'v2','Thread'+kind+'Params.json'))).properties]));
const records=[],clients=[];
const server=createServer(async(req,res)=>{
 try{
  if(!req.url.endsWith('/responses')){res.writeHead(404);res.end();return}
  const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks));records.push(body);writeFileSync(join(root,'request-'+records.length+'.json'),JSON.stringify(body,null,2));
  const prepared=prepareChatCompletionsRequest('http://fixture.invalid/responses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:body.model,stream:true,input:'fixture'})},{id:'fixture',name:'fixture',apiKey:'fixture',baseURL:'http://fixture.invalid',activeModel:body.model,wireApi:'chat-completions'});
  const source='data: '+JSON.stringify({id:'b8-'+records.length,model:body.model,choices:[{index:0,delta:{content:'B8 LOCAL REPLY'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n';
  const adapted=await adaptChatCompletionsResponse(new Response(source,{headers:{'content-type':'text/event-stream'}}),prepared.context);
  res.writeHead(200,{'content-type':'text/event-stream'});for await(const chunk of adapted.body)res.write(chunk);res.end();
 }catch(error){res.writeHead(500);res.end(error.message)}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const args=['-c','model_provider="fixture"','-c','model_providers.fixture.name="Local fixture"','-c',`model_providers.fixture.base_url="http://127.0.0.1:${server.address().port}/v1"`,'-c','model_providers.fixture.wire_api="responses"','-c','model_providers.fixture.requires_openai_auth=false','-c','model_providers.fixture.request_max_retries=0','-c','model_providers.fixture.stream_max_retries=0','-c','features.shell_tool=false','-c','features.unified_exec=false','-c','features.multi_agent=false','-c','features.goals=false','-c','web_search="disabled"'];
const capability={verified:true,append:true,override:true};const frames=[];
async function client(){const c=createCodexAppServerClient({codexPath,cwd,env,args});clients.push(c);c.subscribe(f=>frames.push(f));await c.request('initialize',{clientInfo:{name:'cxv_b8_prompt_probe',version:'1.0.0'},capabilities:{experimentalApi:true}});c.notify('initialized');return c}
async function thread(c,method,params){const wire=injectManagedSystemPrompt({method,params},{capability,logDir,cwd});return(await c.request(method,wire.params)).thread}
async function turn(c,t,label){const first=records.length;const result=await c.request('turn/start',{threadId:t.id,input:[{type:'text',text:label}]});const turnId=result.turn.id;const deadline=Date.now()+20000;while(!frames.some(f=>f.method==='turn/completed'&&f.params.turn.id===turnId)){assert.ok(Date.now()<deadline,'local turn timed out');await new Promise(r=>setTimeout(r,20))}const terminal=frames.find(f=>f.method==='turn/completed'&&f.params.turn.id===turnId);assert.equal(terminal.params.turn.status,'completed');assert.equal(records.length,first+1);return records[first]}
const checks=[];
try{
 for(const model of ['k3','kimi-k2.7-code','deepseek-v4-flash','deepseek-v4-pro','glm-5.2','glm-5.3','qwen-3.8-max']){
  const selected=selectSystemPrompt({logDir,cwd,model});assert.equal(selected.scope,'builtin');const c=await client();
  const t=await thread(c,'thread/start',{cwd,model,modelProvider:'fixture',approvalPolicy:'never',sandbox:'read-only',developerInstructions:'B8 HOST DEVELOPER'});
  const body=await turn(c,t,'B8 builtin '+model);const texts=body.input.filter(i=>i.role==='developer').flatMap(i=>i.content||[]).map(c=>c.text);
  assert.ok(texts.includes(selected.text),'native builtin bytes '+model);assert.doesNotMatch(selected.text,/\$\{(?:model\.name|os\.|environment\.lang)/);assert.ok(texts.includes('B8 HOST DEVELOPER'));
  checks.push({mode:'builtin',model,exactInstructionText:true,hostDeveloperPreserved:true});await c.stop();
 }
 for(const mode of ['override','append']){
  const model=mode==='override'?'k3':'deepseek-flash',name=mode==='override'?'KIMI-K3':'DEEPSEEK-V4-FLASH';
  const a='B8 '+mode+' ORIGINAL\n中文 fixture\n${verbatim}',b='B8 '+mode+' CHANGED\n新 fixture\n${verbatim}';
  saveModelSystemPrompt({logDir,cwd,scope:'workspace',name,text:a,mode});let c=await client();
  const started=await thread(c,'thread/start',{cwd,model,modelProvider:'fixture',approvalPolicy:'never',sandbox:'read-only',developerInstructions:'B8 HOST DEVELOPER'});
  const original=await turn(c,started,'B8 original '+mode);saveModelSystemPrompt({logDir,cwd,scope:'workspace',name,text:b,mode});
  await c.request('thread/unsubscribe',{threadId:started.id});await c.stop();c=await client();const resumed=await thread(c,'thread/resume',{threadId:started.id});const resumedBody=await turn(c,resumed,'B8 resume '+mode);
  const forked=await thread(c,'thread/fork',{threadId:started.id,cwd});const forkedBody=await turn(c,forked,'B8 fork '+mode);
  const fresh=await thread(c,'thread/start',{cwd,model,modelProvider:'fixture',approvalPolicy:'never',sandbox:'read-only',developerInstructions:'B8 HOST DEVELOPER'});const freshBody=await turn(c,fresh,'B8 fresh '+mode);
  // Codex 0.169 serializes both native instruction layers as developer input messages.
  const effective=body=>JSON.stringify(body.input.filter(i=>i.role==='developer'));
  for(const [kind,body,expected]of [['original',original,a],['resume',resumedBody,a],['fork',forkedBody,a],['fresh',freshBody,b]]){
   const texts=body.input.filter(i=>i.role==='developer').flatMap(i=>i.content||[]).map(c=>c.text);const exact=mode==='override'?expected:'B8 HOST DEVELOPER\n\n'+expected;assert.ok(texts.includes(exact),mode+' '+kind+' changed instruction bytes');assert.equal(effective(body).includes(expected===a?b:a),false);assert.ok(JSON.stringify(body.input).includes('B8 HOST DEVELOPER'));checks.push({mode,kind,expected,preserved:true,exactInstructionText:true});
  }
 }
}finally{await Promise.all(clients.map(c=>c.stop()));await new Promise(r=>server.close(r))}
for(const c of clients)assert.throws(()=>process.kill(c.pid,0),{code:'ESRCH'});
const result={version,isolatedRoot:root,requests:records.length,checks,schemas:Object.fromEntries(Object.entries(schemas).map(([key,properties])=>[key,{baseInstructions:!!properties.baseInstructions,developerInstructions:!!properties.developerInstructions}])),actualNativeCodex:true,resumedAcrossOwnedProcessRestart:true,loopbackSyntheticResponses:true,externalModel:false,toolsExecuted:false,ownedChildrenExited:true};
writeFileSync(new URL('../B8-E13-native-prompt-binding.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
