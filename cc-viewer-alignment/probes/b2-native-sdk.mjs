// Isolated real Codex + official SDK against a local synthetic Responses endpoint.
// No real model requests or user credential reads; optional argument: codex executable.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { mkdtempSync,mkdirSync,realpathSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const codexPath=process.argv[2]||'codex';
const codexVersion=execFileSync(codexPath,['--version'],{encoding:'utf8'}).trim();
const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-b2-native-sdk-'))),home=join(root,'home');
mkdirSync(home);mkdirSync(join(home,'codex'));
Object.assign(process.env,{HOME:home,CODEX_HOME:join(home,'codex'),CXV_LOG_DIR:join(root,'logs'),CXV_TEST:'1',OPENAI_API_KEY:'fixture-only',HTTP_PROXY:'http://127.0.0.1:9',HTTPS_PROXY:'http://127.0.0.1:9',ALL_PROXY:'http://127.0.0.1:9',NO_PROXY:'127.0.0.1,localhost'});
for(const key of ['CXV_ORIGINAL_BASE_URL','CXV_BYPASS_PERMISSIONS','OPENAI_BASE_URL'])delete process.env[key];
const {prepareChatCompletionsRequest,adaptChatCompletionsResponse}=await import(repo+'/packages/app/lib/codex-chat-adapter.js');
const {decodeProxyJsonBody}=await import(repo+'/packages/app/lib/proxy-profile.js');
const sdk=await import(repo+'/packages/app/lib/sdk-manager.js');
const requests=[],waiting=[];let retrySeen=false;
const server=createServer(async(req,res)=>{try{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const text=Buffer.concat(chunks);console.log('request',req.method,req.url,req.headers['content-encoding']||'identity');
 if(!req.url.endsWith('/responses')){res.writeHead(404);res.end();return;}
 const body=decodeProxyJsonBody(text,req.headers);requests.push(body);
 const inputs=(body.input||[]).flatMap(row=>typeof row.content==='string'?[row.content]:(row.content||[]).map(part=>part.text||''));
 const prompt=inputs.at(-1)||'';
 if(prompt==='alpha'&&!retrySeen){retrySeen=true;res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'local retry fixture',type:'server_error'}}));return;}
 if(prompt.startsWith('hold'))await new Promise(resolve=>{waiting.push(resolve);res.on('close',resolve)});
 if(res.destroyed)return;
 const answer='LOCAL_REPLY '+prompt;
 const profile={id:'fixture',name:'fixture',baseURL:'http://fixture.invalid',apiKey:'fixture-only',activeModel:'gpt-5',effort:'low',wireApi:'chat-completions'};
 const prepared=prepareChatCompletionsRequest('http://fixture.invalid/v1/responses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:body.model,stream:true,input:prompt,tools:[]})},profile);
 const source='data: '+JSON.stringify({id:'chat-fixture',model:'gpt-5',choices:[{index:0,delta:{content:answer},finish_reason:'stop'}]})+'\n\ndata: '+JSON.stringify({choices:[],usage:{prompt_tokens:3,completion_tokens:2,total_tokens:5}})+'\n\ndata: [DONE]\n\n';
 const adapted=await adaptChatCompletionsResponse(new Response(source,{headers:{'content-type':'text/event-stream'}}),prepared.context);
 res.writeHead(200,{'content-type':'text/event-stream'});for await(const chunk of adapted.body)res.write(chunk);res.end();
}catch(error){console.error('local fixture:',error.message);res.writeHead(500);res.end(error.message)}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/v1';
const args=['--skip-git-repo-check','--model','gpt-5','-c','model_provider="fixture"','-c','model_providers.fixture.name="Local fixture"','-c','model_providers.fixture.base_url='+JSON.stringify(url),'-c','model_providers.fixture.wire_api="responses"','-c','model_providers.fixture.requires_openai_auth=false','-c','model_providers.fixture.request_max_retries=0','-c','features.shell_tool=false','-c','features.unified_exec=false'];
const entriesA=[],entriesB=[],statusA=[],statusB=[],pending=[];
for(const part of ['a/same','b/same'])mkdirSync(join(root,part),{recursive:true});
const a=sdk.initSdkSession(join(root,'a/same'),'same',{codexPath,codexArgs:args,onEntry:e=>entriesA.push(e),onStreamingStatus:s=>statusA.push(s)});
const b=sdk.initSdkSession(join(root,'b/same'),'same',{codexPath,codexArgs:args,onEntry:e=>entriesB.push(e),onStreamingStatus:s=>statusB.push(s)});
const start=(text,info)=>{const result=sdk.sendUserMessage(text,{instanceKey:info.instanceKey});pending.push(result);return result};
const wait=async(test,label)=>{const deadline=Date.now()+20000;while(!test()){if(Date.now()>deadline)throw new Error(label+' timeout');await new Promise(resolve=>setTimeout(resolve,20))}};
const timeout=setTimeout(()=>{sdk.interruptTurn({instanceKey:a.instanceKey});sdk.interruptTurn({instanceKey:b.instanceKey});server.closeAllConnections();console.error('fixture deadline');},45000);
try{
 await Promise.all([start('alpha',a),start('beta',b)]);
 assert.ok(entriesA.some(e=>JSON.stringify(e.response).includes('LOCAL_REPLY alpha')),JSON.stringify(entriesA));
 assert.ok(entriesB.some(e=>JSON.stringify(e.response).includes('LOCAL_REPLY beta')),JSON.stringify(entriesB));
 assert.ok(entriesA.every(e=>e.cwd===a.cwd||e.body?.metadata?.instance_key===a.instanceKey));
 const threadA=sdk.getSessionId({instanceKey:a.instanceKey}),threadB=sdk.getSessionId({instanceKey:b.instanceKey});assert.notEqual(threadA,threadB);
 const held=start('hold alpha',a);await wait(()=>waiting.length>0,'held request');
 const accepted=await start('queued alpha',a);assert.equal(accepted.queued,true);
 assert.equal(sdk.getSdkQueueState({instanceKey:a.instanceKey}).items.length,1);
 assert.equal(sdk.getSdkQueueState({instanceKey:b.instanceKey}).items.length,0);
 waiting.shift()();await held;
 assert.ok(entriesA.some(e=>JSON.stringify(e.response).includes('LOCAL_REPLY queued alpha')));
 assert.equal(sdk.getSessionId({instanceKey:a.instanceKey}),threadA);
 const cancel=start('hold cancellation',b);await wait(()=>waiting.length>0,'cancellation request');
 assert.equal(sdk.interruptTurn({instanceKey:b.instanceKey}),true);await cancel;
 assert.equal(sdk.getSdkStreamingState({instanceKey:b.instanceKey}).active,false);
 const result={root,realCodex:codexVersion,officialSdk:'0.142.5',sameNameIsolation:true,retryRecovery:true,queueDispatch:true,nativeThreadResume:true,ordinaryCancellation:true,requests:requests.length,externalModelNetwork:false,usesLocalSyntheticResponses:true};
 writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{clearTimeout(timeout);sdk.stopSession();waiting.splice(0).forEach(resolve=>resolve());server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await Promise.allSettled(pending);}
