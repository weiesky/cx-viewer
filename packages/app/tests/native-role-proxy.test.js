import test from 'node:test';import assert from 'node:assert/strict';import{createServer}from'node:http';import{once}from'node:events';import{mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';
test('native-owned role routes isolate same-name workspaces, pin accepted turns and never trust prompt or foreign identity',async()=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-native-roles-'))),logs=join(root,'logs'),a=join(root,'one/same'),b=join(root,'two/same'),previous={...process.env},fetch=globalThis.fetch,marker=globalThis._cxViewerInterceptorInstalled,servers=[],proxies=[];let interceptor;
 const seen=[],commits=[];for(const p of[a,b])mkdirSync(p,{recursive:true});
 try{
  for(const name of['default','main','child']){const server=createServer(async(req,res)=>{let text='';for await(const c of req)text+=c;seen.push({name,body:JSON.parse(text),auth:req.headers.authorization});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({model:name,output:[],usage:{input_tokens:3,output_tokens:2}}));});server.listen(0,'127.0.0.1');await once(server,'listening');servers.push(server);}
  const base=i=>'http://127.0.0.1:'+servers[i].address().port+'/v1';
  Object.assign(process.env,{CXV_TEST:'1',CXV_CAPTURE_ONLY:'1',CXV_LOG_DIR:logs,CXV_PROXY_PROFILE_PATH:join(root,'profiles.json'),CXV_PROJECT_DIR:a,CXV_ORIGINAL_BASE_URL:base(0)});
  const profiles=[{id:'max',name:'Default'},...['main','child'].map((id,i)=>({id,name:id,baseURL:base(i+1),apiKey:'fixture-'+id,activeModel:id+'-model',wireApi:'responses'}))];
  writeFileSync(process.env.CXV_PROXY_PROFILE_PATH,JSON.stringify({version:3,active:'main',profiles}),{mode:0o600});
  const{withWorkspaceProxyUpdate,readWorkspaceProxy}=await import('../lib/workspace-proxy.js');
  for(const[cwd,subagent]of[[a,'child'],[b,'max']])withWorkspaceProxyUpdate({logDir:logs,cwd,profiles,expectedRevision:'0',activeId:'main',roles:{subagent}});
  const{createAppServerBridge}=await import('../lib/appserver-bridge.js');const{createProxy}=await import('../proxy.js');interceptor=await import('../interceptor.js');interceptor._stopProxyProfileWatchForTests();interceptor.setupInterceptor();interceptor.setLogV2CommitListener(e=>commits.push(e));
  const ports=[];for(const[cwd,id]of[[a,'a'],[b,'b']]){const owner=createAppServerBridge();owner._resetAppServerBridgeForTests({cwd});for(const thread of[{id},{id:id+'-child',source:{subAgent:{thread_spawn:{parent_thread_id:id}}}}])owner._parseAppServerServerMessageForTests({method:'thread/started',params:{thread}});const proxy=createProxy();proxies.push(proxy);ports.push(await proxy.start({captureContext:{cwd,instanceKey:id},resolveNativeRole:owner.getNativeProxyRole}));}
  const send=async(index,id,turn,extra={})=>{const res=await fetch('http://127.0.0.1:'+ports[index]+'/v1/responses',{method:'POST',headers:{'content-type':'application/json','session-id':id},body:JSON.stringify({model:'native-model',input:'cc_is_subagent teammate subagent',metadata:{thread_id:id,turn_id:turn,cwd:extra.cwd||'/forged'},...extra})});await res.text();return res.status;};
  assert.equal(await send(0,'a','main'),200);assert.equal(seen.at(-1).name,'main');
  assert.equal(await send(0,'a-child','child'),200);assert.equal(seen.at(-1).name,'child');assert.equal(seen.at(-1).body.model,'child-model');assert.equal(seen.at(-1).auth,'Bearer fixture-child');
  await send(0,'a','outer-native',{client_metadata:{'x-codex-turn-metadata':JSON.stringify({session_id:'a',thread_id:'a-child',turn_id:'nested-native-turn'})}});assert.equal(seen.at(-1).name,'child','a native child shares the root HTTP session header');
  await send(0,'b-child','foreign');assert.equal(seen.at(-1).name,'main');
  await send(1,'b-child','neighbor',{cwd:a});assert.equal(seen.at(-1).name,'default');
  let state=readWorkspaceProxy(logs,a);withWorkspaceProxyUpdate({logDir:logs,cwd:a,profiles,expectedRevision:state.revision,roles:{subagent:'max'}});
  await send(0,'a-child','child');assert.equal(seen.at(-1).name,'child','accepted turn stays on its original source');
  await send(0,'a','outer-native',{client_metadata:{'x-codex-turn-metadata':JSON.stringify({session_id:'a',thread_id:'a-child',turn_id:'nested-native-turn'})}});assert.equal(seen.at(-1).name,'child','native nested turn metadata pins its route');
  await send(0,'a-child','new-child');assert.equal(seen.at(-1).name,'default');
  await interceptor.flushLogV2Writes();assert.ok(commits.some(e=>e.proxyRole==='subagent'&&e.proxyProfile==='child'));
  const{resolveProjectIdForCwd}=await import('../lib/log-v2/project-id.js');const{projectArchiveDirectoryName}=await import('../lib/log-v2/identity.js');writeFileSync(join(logs,projectArchiveDirectoryName(resolveProjectIdForCwd(logs,a)),'active-profile.json'),'{broken');const count=seen.length;assert.equal(await send(0,'a','corrupt'),502);assert.equal(seen.length,count,'a corrupt workspace must not spend Default quota');
 }finally{for(const proxy of proxies)proxy.stop();for(const server of servers){server.closeAllConnections();await new Promise(r=>server.close(r));}await interceptor?.closeLogV2Writes();interceptor?.setLogV2CommitListener(null);interceptor?._stopProxyProfileWatchForTests();globalThis.fetch=fetch;if(marker===undefined)delete globalThis._cxViewerInterceptorInstalled;else globalThis._cxViewerInterceptorInstalled=marker;for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);rmSync(root,{recursive:true,force:true});}
});
