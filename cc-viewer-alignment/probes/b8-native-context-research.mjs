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
import {createSdkAppServerTransport} from '../../packages/app/lib/sdk-appserver-transport.js';
import {sdkToJSONLEntry} from '../../packages/app/lib/sdk-adapter.js';
import {nativeContextWindow,computeContextPercent} from '../../packages/app/server/lib/context-rules.js';
import {buildContextWindowEvent} from '../../packages/app/lib/context-watcher.js';
const display=process.argv.includes('--display'),displayChecks=[];
const codexPath=process.argv[2]||'/Users/sky/.npm-global/bin/codex';
const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-b8-native-context-'))),cwd=join(root,'project'),home=join(root,'home'),logDir=join(root,'logs');
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
  const source='data: '+JSON.stringify({id:'b8-'+records.length,model:body.model,choices:[{index:0,delta:{content:'B8 LOCAL REPLY'},finish_reason:'stop'}],usage:{prompt_tokens:20000,completion_tokens:100,total_tokens:20100,prompt_tokens_details:{cached_tokens:1000}}})+'\n\ndata: [DONE]\n\n';
  const adapted=await adaptChatCompletionsResponse(new Response(source,{headers:{'content-type':'text/event-stream'}}),prepared.context);
  res.writeHead(200,{'content-type':'text/event-stream'});for await(const chunk of adapted.body)res.write(chunk);res.end();
 }catch(error){res.writeHead(500);res.end(error.message)}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const args=['-c','model_catalog_json='+JSON.stringify(process.argv[3]||'/tmp/cxv-openai-codex-research-20261122/rust-v0.171.0/codex-rs/models-manager/models.json'),'-c','model_provider="fixture"','-c','model_providers.fixture.name="Local fixture"','-c',`model_providers.fixture.base_url="http://127.0.0.1:${server.address().port}/v1"`,'-c','model_providers.fixture.wire_api="responses"','-c','model_providers.fixture.requires_openai_auth=false','-c','model_providers.fixture.request_max_retries=0','-c','model_providers.fixture.stream_max_retries=0','-c','features.shell_tool=false','-c','features.unified_exec=false','-c','features.multi_agent=false','-c','features.goals=false','-c','web_search="disabled"'];
const capability={verified:true,append:true,override:true};const frames=[];
async function client(){const c=createCodexAppServerClient({codexPath,cwd,env,args});clients.push(c);c.subscribe(f=>frames.push(f));await c.request('initialize',{clientInfo:{name:'cxv_b8_prompt_probe',version:'1.0.0'},capabilities:{experimentalApi:true}});c.notify('initialized');return c}
async function thread(c,method,params){const wire=injectManagedSystemPrompt({method,params},{capability,logDir,cwd});return(await c.request(method,wire.params)).thread}
async function turn(c,t,label,model){const first=records.length;const result=await c.request('turn/start',{threadId:t.id,...(model?{model}:{}),input:[{type:'text',text:label}]});const turnId=result.turn.id;const deadline=Date.now()+20000;while(!frames.some(f=>f.method==='turn/completed'&&f.params.turn.id===turnId)){assert.ok(Date.now()<deadline,'local turn timed out');await new Promise(r=>setTimeout(r,20))}const terminal=frames.find(f=>f.method==='turn/completed'&&f.params.turn.id===turnId);assert.equal(terminal.params.turn.status,'completed');assert.equal(records.length,first+1);return records[first]}
const checks=[];
try{
 const c=await client();
 for(const [label,config,expected] of [['default',{},null],['override100k',{model_context_window:100000},95000],['override1m',{model_context_window:1000000},828400]]){
  const t=(await c.request('thread/start',{cwd,model:'gpt-6.1-sol',modelProvider:'fixture',approvalPolicy:'never',sandbox:'read-only',baseInstructions:'B8 isolated context probe',config})).thread;
  const models=label==='default'?['gpt-6.1-sol','gpt-6-astra','gpt-6.1-sol']:['gpt-6.1-sol'];
  for(const model of models){const before=frames.length;await turn(c,t,label+' '+model,model);const event=frames.slice(before).filter(f=>f.method==='thread/tokenUsage/updated'&&f.params.threadId===t.id).at(-1);assert.ok(event,'native tokenUsage event missing');const window=expected??(model==='gpt-6-astra'?258400:475000);assert.equal(event.params.tokenUsage.modelContextWindow,window);checks.push({label,model,expectedWindow:window,tokenUsage:event.params.tokenUsage});
   if(display){const entry={_appServerSource:true,response:{body:{context_window:window,usage:{total_tokens:event.params.tokenUsage.last.totalTokens}}}};const percent=computeContextPercent({lastMainAgent:entry});assert.equal(percent,buildContextWindowEvent(entry.response.body.usage,nativeContextWindow(entry)).used_percentage);displayChecks.push({transport:'ordinary native',model,window,percent,total:event.params.tokenUsage.last.totalTokens});}}
 }
 if(display)for(const [model,window]of[['gpt-6.1-sol',475000],['gpt-6-astra',258400]]){
  const transport=createSdkAppServerTransport({cwd,instanceKey:'context-fixture-'+model,codexPath,codexOptions:{env},configOverrides:args.filter((_,i)=>i%2===1),threadOptions:{model,approvalPolicy:'never',sandboxMode:'read-only'}});
  try{const stream=await transport.runStreamed('B8 display SDK '+model);let final;for await(const event of stream.events)if(event.type==='turn.completed')final=event;assert.ok(final);assert.equal(final.context_window,window);
   const entry=sdkToJSONLEntry({message:{content:[],usage:final.usage,context_window:final.context_window}},[],model,'fixture',{threadId:transport.threadId,cwd,metadata:{transport:'appserver'}});
   assert.equal(nativeContextWindow(entry),window);const percent=computeContextPercent({lastMainAgent:entry});assert.equal(percent,window===475000?2:3);displayChecks.push({transport:'SDK AppServer',model,window,percent,total:entry.response.body.usage.total_tokens});
  }finally{await transport.stop()}
 }
}finally{await Promise.all(clients.map(c=>c.stop()));await new Promise(r=>server.close(r))}
for(const c of clients)assert.throws(()=>process.kill(c.pid,0),{code:'ESRCH'});
const result={displayChecks,...(display?{nativeWindowDisplay:true}:{}),version,isolatedRoot:root,catalog:'official rust-v0.171.0 bundled models, explicitly selected in isolated fixture',requests:records.length,checks,actualNativeCodex:true,loopbackSyntheticResponses:true,externalModel:false,toolsExecuted:false,ownedChildrenExited:true,actualAutoCompactionTriggered:false};
writeFileSync(new URL(display?'../B8-E22-native-context-display.json':'../B8-native-context-research.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
