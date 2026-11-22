// Owned native-protocol fixture; GUI evidence only, separate from actual-native probe.
import {mkdtempSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-b8-context-ui-'))),a=join(root,'one/same'),b=join(root,'two/same');for(const p of[a,b])mkdirSync(p,{recursive:true});
Object.assign(process.env,{HOME:root,CODEX_HOME:join(root,'codex'),CXV_LOG_DIR:join(root,'logs'),CXV_PROXY_PROFILE_PATH:join(root,'profile.json'),CXV_PROJECT_DIR:a,CXV_TEST:'1',CXV_CAPTURE_ONLY:'1',CXV_WORKSPACE_MODE:'1',CXV_CLI_MODE:'1',CXV_SDK_MODE:'1',CXV_START_PORT:'20860',CXV_MAX_PORT:'20869'});delete process.env.CXV_BYPASS_PERMISSIONS;
const executable=join(root,'native-protocol-fixture.mjs');writeFileSync(executable,String.raw`
import{createInterface}from'node:readline';import{randomUUID}from'node:crypto';const send=f=>console.log(JSON.stringify(f));const threadId=randomUUID();
for await(const line of createInterface({input:process.stdin})){const f=JSON.parse(line),p=f.params||{};if(!f.method||f.method==='initialized')continue;
if(f.method==='thread/start'||f.method==='thread/resume'){send({id:f.id,result:{thread:{id:threadId}}});continue;}
if(f.method==='turn/start'){const turnId=randomUUID(),text=p.input[0].text;send({id:f.id,result:{turn:{id:turnId}}});send({method:'turn/started',params:{threadId,turn:{id:turnId,status:'inProgress'}}});
send({method:'item/completed',params:{threadId,turnId,item:{id:randomUUID(),type:'agentMessage',text:'context reply '+text}}});
send({method:'thread/tokenUsage/updated',params:{threadId,turnId,tokenUsage:{modelContextWindow:text==='sol'?475000:text==='astra'?258400:null,last:{inputTokens:20000,outputTokens:100,totalTokens:20100},total:{totalTokens:990000}}}});
send({method:'turn/completed',params:{threadId,turn:{id:turnId,status:'completed',items:[]}}});continue;}
send({id:f.id,result:{}});}
`);
const source=new URL('../../packages/app/',import.meta.url),server=await import(new URL('server.js',source)),sdk=await import(new URL('lib/sdk-manager.js',source));
(await import(new URL('interceptor.js',source))).initForWorkspace(a);(await import(new URL('lib/preferences.js',source))).updatePreferences(p=>({...p,lang:'en'}));
const options={codexPath:executable,transport:'appserver',onEntry:server.pushSdkEntry,onStreamingStatus:server.setSdkStreamingState,onStreamProgress:server.sendSdkStreamProgress,broadcastWs:server.broadcastWsMessage,onAgentLoopStart:server.broadcastAgentLoopStart,onAgentLoopEnd:server.broadcastAgentLoopEnd};sdk.setSdkLaunchConfig(options);const first=sdk.initSdkSession(a,'same',options),second=sdk.launchSdkSession(b,'same');
const{registerWorkspace}=await import(new URL('workspace-registry.js',source));registerWorkspace(a);registerWorkspace(b);server.setWorkspaceLaunched(true);await server.startViewer();
const fixture={root,pid:process.pid,port:server.getPort(),a:{...first,url:`http://127.0.0.1:${server.getPort()}/?instance=${first.instanceKey}`},b:{...second,url:`http://127.0.0.1:${server.getPort()}/?instance=${second.instanceKey}`}};writeFileSync('/tmp/cxv-b8-context-ui-fixture.json',JSON.stringify(fixture));console.log(JSON.stringify(fixture));let closing=false;async function close(){if(closing)return;closing=true;sdk.stopSession();await server.stopViewer();process.exit(0);}process.once('SIGTERM',close);process.once('SIGINT',close);
