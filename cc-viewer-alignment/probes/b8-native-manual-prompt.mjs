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
const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-b8-native-manual-'))),cwd=join(root,'project'),home=join(root,'home'),logDir=join(root,'logs');
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
 const manual='B8 MANUAL BASE 中文\n${verbatim}';
 const file=join(root,'manual.md');writeFileSync(file,manual);
 for(const kind of ['base','file']){
  const c=await client();const params={cwd,model:'k3',modelProvider:'fixture',approvalPolicy:'never',sandbox:'read-only',developerInstructions:'B8 HOST DEVELOPER',...(kind==='base'?{baseInstructions:manual}:{config:{model_instructions_file:file}})};
  const t=await thread(c,'thread/start',params);const body=await turn(c,t,'manual '+kind);
  const texts=body.input.filter(i=>i.role==='developer').flatMap(i=>i.content||[]).map(c=>c.text);
  assert.ok(texts.includes(manual),kind+' manual bytes');assert.ok(texts.includes('B8 HOST DEVELOPER'));assert.equal(texts.some(t=>t.startsWith('You are k3')),false);
  checks.push({kind,manualBytesPreserved:true,hostPreserved:true,automaticPresetSuppressed:true});await c.stop();
 }
}finally{await Promise.all(clients.map(c=>c.stop()));await new Promise(r=>server.close(r))}
for(const c of clients)assert.throws(()=>process.kill(c.pid,0),{code:'ESRCH'});
const result={version,isolatedRoot:root,requests:records.length,checks,actualNativeCodex:true,loopbackSyntheticResponses:true,externalModel:false,toolsExecuted:false,ownedChildrenExited:true};
writeFileSync(new URL('../B8-E14-native-manual-prompt.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
