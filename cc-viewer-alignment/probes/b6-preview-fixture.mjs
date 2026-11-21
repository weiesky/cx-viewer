// Task-owned native protocol fixture; no external model requests or real user state.
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, realpathSync, truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import JSZip from 'jszip';
const root=realpathSync(mkdtempSync(join(tmpdir(),'cxv-b6-preview-gui-')));
const a=join(root,'one/same'),b=join(root,'two/same');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const wav=Buffer.alloc(44+44100*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
for(const [cwd,label] of [[a,'A'],[b,'B']]){
 mkdirSync(cwd,{recursive:true});writeFileSync(join(cwd,'AGENTS.md'),'B6 guidance '+label);
 const zip=new JSZip();zip.file('docs/hello.txt','ARCHIVE_'+label+' <img src=x onerror=window.B6_XSS=1>');zip.file('pic.png',png);zip.file('big.txt','中文'.repeat(200000));
 writeFileSync(join(cwd,'sample.zip'),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
 writeFileSync(join(cwd,'unsupported.rar'),'Rar!');writeFileSync(join(cwd,'corrupt.zip'),'PK broken');writeFileSync(join(cwd,'large.zip'),'');truncateSync(join(cwd,'large.zip'),33554433);
 writeFileSync(join(cwd,'voice.wav'),wav);writeFileSync(join(cwd,'broken.mp3'),'not audio');
 writeFileSync(join(cwd,'caption.srt'),'1\n00:00:01,000 --> 00:00:02,500\nSUBTITLE_'+label+' <img src=x onerror=window.B6_XSS=2>\n');
 writeFileSync(join(cwd,'legacy.srt'),Buffer.concat([Buffer.from('1\n00:00:01,000 --> 00:00:02,000\n'),Buffer.from([0xc4,0xe3,0xba,0xc3])]));
 writeFileSync(join(cwd,'picture.apng'),png);writeFileSync(join(cwd,'unknown.bin'),Buffer.from([0,1,255]));writeFileSync(join(cwd,'document.pdf'),'%PDF');
}
Object.assign(process.env,{HOME:root,CODEX_HOME:join(root,'codex'),CXV_LOG_DIR:join(root,'logs'),CXV_PROXY_PROFILE_PATH:join(root,'profiles.json'),CXV_PROJECT_DIR:a,CXV_TEST:'1',CXV_CAPTURE_ONLY:'1',CXV_WORKSPACE_MODE:'1',CXV_CLI_MODE:'1',CXV_SDK_MODE:'1',CXV_START_PORT:'20560',CXV_MAX_PORT:'20569'});
delete process.env.CXV_BYPASS_PERMISSIONS;
const executable=join(root,'fake-codex.mjs');
writeFileSync(executable,String.raw`#!/usr/bin/env node
import {createInterface} from 'node:readline';import{randomUUID}from'node:crypto';import{appendFileSync}from'node:fs';import{join}from'node:path';
const send=f=>process.stdout.write(JSON.stringify(f)+'\n');let threadId=randomUUID(),turnId,requestId=100;
const complete=text=>{send({method:'item/completed',params:{threadId,turnId,item:{id:randomUUID(),type:'agentMessage',text}}});send({method:'turn/completed',params:{threadId,turn:{id:turnId,status:'completed'}}});};
for await(const line of createInterface({input:process.stdin})){
 const f=JSON.parse(line),p=f.params||{};
 if(!f.method){complete('Question answer accepted');continue;}
 if(f.method==='initialized')continue;
 if(f.method==='thread/start'||f.method==='thread/resume'){threadId=p.threadId||threadId;send({id:f.id,result:{thread:{id:threadId}}});continue;}
 if(f.method==='turn/start'){
  turnId=randomUUID();const text=p.input[0].text;appendFileSync(join(process.env.HOME,'calls.jsonl'),JSON.stringify({cwd:process.cwd(),text})+'\n');
  send({id:f.id,result:{turn:{id:turnId}}});send({method:'turn/started',params:{threadId,turn:{id:turnId,status:'inProgress'}}});
  if(text==='ask fixture'){send({id:++requestId,method:'item/tool/requestUserInput',params:{threadId,turnId,itemId:'ask-'+turnId,questions:[{id:'choice',header:'B6',question:'Select this question text',options:[{label:'Alpha',description:'Selectable answer text'},{label:'Beta',description:'Second answer'}]}]}});continue;}
  send({method:'item/completed',params:{threadId,turnId,item:{id:randomUUID(),type:'dynamicToolCall',tool:'apply_patch',arguments:{patch:'*** Begin Patch\n*** Update File: note.txt\n@@\n-old line\n+new quoted line\n*** End Patch'},status:'completed',success:true}}});
  send({method:'item/completed',params:{threadId,turnId,item:{id:randomUUID(),type:'fileChange',status:'completed',changes:[{path:'note.txt',kind:'update',diff:'@@ -1 +1 @@\n-old line\n+new quoted line\n'}]}}});
  send({method:'item/completed',params:{threadId,turnId,item:{id:randomUUID(),type:'mcpToolCall',server:'fixture',tool:'lookup',arguments:{query:'TOOL_KV selectable parameters'},result:{content:[{type:'text',text:'lookup complete'}]},status:'completed'}}});
  complete('# B6 assistant answer\n\nSelect **bold text** and \x60inline code\x60.\n\n| Name | Value |\n| --- | --- |\n| Alpha | Beta |\n\n[Local file](note.txt)\n\n\x60\x60\x60js\nconst selected = 1;\n\x60\x60\x60');continue;
 }
 if(f.method==='turn/interrupt'){send({id:f.id,result:{}});send({method:'turn/completed',params:{threadId,turn:{id:turnId,status:'interrupted'}}});continue;}
 send({id:f.id,result:{}});
}
`);chmodSync(executable,0o755);execFileSync(process.execPath,['--check',executable]);
const source=new URL('../../packages/app/',import.meta.url),server=await import(new URL('server.js',source)),sdk=await import(new URL('lib/sdk-manager.js',source));
(await import(new URL('interceptor.js',source))).initForWorkspace(a);
(await import(new URL('lib/preferences.js',source))).updatePreferences(p=>({...p,lang:'en',showFullToolContent:true}));
const options={codexPath:executable,transport:'appserver',onEntry:server.pushSdkEntry,onStreamingStatus:server.setSdkStreamingState,onStreamProgress:server.sendSdkStreamProgress,broadcastWs:server.broadcastWsMessage,onAgentLoopStart:server.broadcastAgentLoopStart,onAgentLoopEnd:server.broadcastAgentLoopEnd};
sdk.setSdkLaunchConfig(options);const first=sdk.initSdkSession(a,'same',options),second=sdk.launchSdkSession(b,'same');
const{registerWorkspace}=await import(new URL('workspace-registry.js',source));registerWorkspace(a);registerWorkspace(b);server.setWorkspaceLaunched(true);await server.startViewer();
const fixture={root,pid:process.pid,port:server.getPort(),a:{...first,url:`http://127.0.0.1:${server.getPort()}/?instance=${first.instanceKey}`},b:{...second,url:`http://127.0.0.1:${server.getPort()}/?instance=${second.instanceKey}`}};
writeFileSync('/tmp/cxv-b6-gui-fixture.json',JSON.stringify(fixture));console.log(JSON.stringify(fixture));
let closing=false;async function close(){if(closing)return;closing=true;sdk.stopSession();await server.stopViewer();process.exit(0);}process.once('SIGINT',close);process.once('SIGTERM',close);
