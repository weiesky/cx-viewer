import{before,after,test}from'node:test';import assert from'node:assert/strict';import{mkdtempSync,mkdirSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{request}from'node:http';import{MockAgent,getGlobalDispatcher,setGlobalDispatcher}from'undici';
const root=mkdtempSync(join(tmpdir(),'cxv-sdk-api-path-'));mkdirSync(join(root,'codex'));
Object.assign(process.env,{HOME:root,CODEX_HOME:join(root,'codex'),CXV_LOG_DIR:join(root,'logs'),CXV_TEST:'1',CXV_WORKSPACE_MODE:'1'});delete process.env.CXV_ORIGINAL_BASE_URL;delete process.env.OPENAI_BASE_URL;
let proxy,port,agent,previous;
before(async()=>{const {createProxy}=await import('../proxy.js');proxy=createProxy();port=await proxy.start();previous=getGlobalDispatcher();agent=new MockAgent();agent.disableNetConnect();setGlobalDispatcher(agent);});
after(async()=>{proxy?.stop();setGlobalDispatcher(previous);await agent?.close();rmSync(root,{recursive:true,force:true});});
function post(path){return new Promise((resolve,reject)=>{const body=JSON.stringify({model:'fixture',input:'local protocol'});const req=request({hostname:'127.0.0.1',port,path,method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,text}));});req.on('error',reject);req.end(body);});}
test('SDK default API-key traffic reaches /v1/responses with either native capture prefix',async()=>{
 for(const path of ['/responses?case=root','/v1/responses?case=versioned']){agent.get('https://api.openai.com').intercept({path:'/v1/responses'+path.slice(path.indexOf('?')),method:'POST'}).reply(200,'{"ok":true}',{headers:{'content-type':'application/json'}});assert.deepEqual(await post(path),{status:200,text:'{"ok":true}'});}
 agent.assertNoPendingInterceptors();
});
test('SDK custom gateway prefixes are joined once and retain the request query',async()=>{
 process.env.OPENAI_BASE_URL='https://gateway.example/openai/v1';
 for(const path of ['/responses?case=root','/v1/responses?case=versioned']){agent.get('https://gateway.example').intercept({path:'/openai/v1/responses'+path.slice(path.indexOf('?')),method:'POST'}).reply(200,'{"ok":true}',{headers:{'content-type':'application/json'}});assert.deepEqual(await post(path),{status:200,text:'{"ok":true}'});}
 agent.assertNoPendingInterceptors();delete process.env.OPENAI_BASE_URL;
});
