import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const root = mkdtempSync(join(tmpdir(), 'cxv-b7-runtime-'));
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_TEST: '1',
  CXV_WORKSPACE_MODE: '1', CXV_LOG_DIR: join(root, 'logs'), CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'),
  CXV_BYPASS_PERMISSIONS: '1' });
const { startPtyWorkspaceRuntime } = await import('../lib/pty-workspace-runtime.js');
const { captureRequestContext } = await import('../lib/capture-context.js');
const fixture = join(root, 'native.js');
writeFileSync(fixture, `const {createServer}=require('node:http'),{WebSocketServer}=require(${JSON.stringify(createRequire(import.meta.url).resolve('ws'))}),fs=require('node:fs'),path=require('node:path');
const label=path.basename(path.dirname(process.cwd())),started=Date.now(),url=new URL(process.argv.find(arg=>arg.startsWith('ws://')));
fs.writeFileSync(path.join(process.cwd(),'native.json'),JSON.stringify({pid:process.pid,args:process.argv.slice(2),bypass:process.env.CXV_BYPASS_PERMISSIONS,cwd:process.env.CXV_PROJECT_DIR}));
const server=createServer((req,res)=>{res.writeHead(Date.now()-started<Number(process.env.FIXTURE_DELAY||0)?503:200);res.end('ready');});
new WebSocketServer({server}).on('connection',socket=>socket.on('message',raw=>{const f=JSON.parse(raw);
if(!f.method){fs.writeFileSync(path.join(process.cwd(),'answer.json'),JSON.stringify(f));socket.send(JSON.stringify({method:'turn/completed',params:{threadId:'thread-'+label,turn:{id:'turn-'+label,status:'completed'}}}));return;}
if(f.method==='fixture/plan'){socket.send(JSON.stringify({method:'turn/started',params:{threadId:'thread-'+label,turn:{id:'turn-'+label,status:'inProgress'}}}));socket.send(JSON.stringify({method:'turn/plan/updated',params:{threadId:'thread-'+label,turnId:'turn-'+label,plan:[{step:'task-'+label,status:'inProgress'}]}}));}
if(f.method==='fixture/ask'){socket.send(JSON.stringify({id:77,method:'item/tool/requestUserInput',params:{threadId:'thread-'+label,turnId:'turn-'+label,itemId:'ask-'+label,questions:[{id:'q',header:'fixture',question:'Choose',options:[{label:'Alpha',description:'first'}]}]}}));return;}
let result={label};if(f.method==='thread/start')result={thread:{id:'thread-'+label}};if(f.method==='turn/start')result={turn:{id:'turn-'+label,status:'inProgress'}};socket.send(JSON.stringify({id:f.id,result}));
}));server.listen(Number(url.port),'127.0.0.1');`);
function pty() { return { running: false, request: null,
  async spawnCodexRequest(request) { this.request = request; this.running = true; },
  killPty() { this.running = false; }, getPtyState() { return { running: this.running }; } }; }
function options(label, changes = {}) {
  const cwd = join(root, label, 'same'); mkdirSync(cwd, { recursive: true });
  return { cwd, instanceKey: 'cxv-' + (label==='a'?'a':'b').repeat(36), projectId: 'project-'+label,
    pty: pty(), codexPath: fixture, rawDir: join(root, 'raw-'+label), logDir: join(root, 'logs'),
    serverPort: 12345, otelToken: 'fixture-otel-token', env: { ...process.env, HTTPS_PROXY: 'http://fixture.invalid' },
    systemPromptCapability: { verified: false, append: false, override: false },
    callbacks: { onEntry: () => ({ written: true }) }, ...changes };
}
async function until(check) { const deadline=Date.now()+4000; while(!check()) { assert.ok(Date.now()<deadline,'fixture did not settle'); await new Promise(resolve=>setTimeout(resolve,10)); } }
async function connect(runtimeOptions) {
  const args = runtimeOptions.pty.request.args, socket = new WebSocket(args[args.indexOf('--remote')+1]);
  await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);}); return socket;
}
function rpc(socket,id,method,params={}) { return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off('message',receive);reject(new Error('fixture RPC timeout'));},4000);
  function receive(raw){const f=JSON.parse(raw);if(f.id===id){clearTimeout(timer);socket.off('message',receive);resolve(f.result);}}
  socket.on('message',receive);socket.send(JSON.stringify({id,method,params}));
}); }

test('parallel runtimes own model capture, TUI config, native requests and cleanup independently', async () => {
  const upstream=createServer((req,res)=>{req.resume();res.writeHead(200,{'content-type':'application/json'});res.end('{"model":"fixture","output":[]}');});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const target=`http://127.0.0.1:${upstream.address().port}/v1`, previous=process.env.CXV_ORIGINAL_BASE_URL;
  process.env.CXV_ORIGINAL_BASE_URL=target;
  const capture=[], fetch0=globalThis.fetch;
  globalThis.fetch=(url,init)=>{if(String(url).startsWith(target))capture.push(captureRequestContext.getStore());return fetch0(url,init);};
  const asks=[null,null],entries=[[],[]],tasks=[[],[]],configs=['a','b'].map((label,i)=>options(label,{
    args:i?['--dangerously-bypass-approvals-and-sandbox']:[],approvalsReviewer:'user',
    callbacks:{onTaskSnapshot:frame=>tasks[i].push(frame),onEntry:(entry,context)=>{entries[i].push({entry,context});return{written:true};},onRequestUserInput:ask=>{asks[i]=ask;return true;}},
  }));
  const runtimes=[], sockets=[];
  try {
    for(const config of configs)runtimes.push(await startPtyWorkspaceRuntime(config));
    assert.equal(process.env.CXV_BYPASS_PERMISSIONS,'1','boot environment is unchanged');
    for(const [i,config]of configs.entries()){
      const native=JSON.parse(readFileSync(join(config.cwd,'native.json')));
      assert.equal(config.pty.request.env.CXV_INSTANCE_KEY, config.instanceKey);assert.equal(native.bypass,i?'1':undefined);assert.equal(config.pty.request.env.CXV_BYPASS_PERMISSIONS,i?'1':undefined);
      assert.equal(native.cwd,config.cwd);assert.ok(native.args.includes('features.default_mode_request_user_input=true'));
      assert.ok(!config.pty.request.args.join(' ').includes('fixture-otel-token'));
      assert.match(config.pty.request.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS,/fixture-otel-token/);
      const socket=await connect(config);sockets.push(socket);
      const thread=await rpc(socket,1,'thread/start',{cwd:config.cwd});await rpc(socket,2,'turn/start',{threadId:thread.thread.id,input:[]});
      await rpc(socket,4,'fixture/plan');
      socket.send(JSON.stringify({id:3,method:'fixture/ask'}));
      await fetch(`http://127.0.0.1:${runtimes[i].proxyPort}/v1/responses`,{method:'POST',headers:{'content-type':'application/json','x-cx-viewer-instance':'forged'},body:'{"model":"fixture","input":[]}'});
    }
    await until(()=>tasks.every(frames=>frames.some(frame=>frame.tasks.length===1)));
    for(const[i,frames]of tasks.entries()){
      const frame=frames.find(frame=>frame.tasks.length===1);assert.equal(frame.instanceKey,configs[i].instanceKey);assert.equal(frame.cwd,configs[i].cwd);
      assert.equal(frame.tasks[0].subject,'task-'+(i?'b':'a'));assert.equal(runtimes[i].getTaskState().tasks[0].status,'in_progress');
    }
    await until(()=>asks.every(Boolean));assert.notEqual(asks[0].uiId,asks[1].uiId,'same native request id 77 is owner-prefixed');
    assert.equal(runtimes[0].resolveRequestUserInput(asks[1].uiId,{q:{answers:['Alpha']}}),false);
    assert.equal(runtimes[0].resolveRequestUserInput(asks[0].uiId,{q:{answers:['Alpha']}}),true);
    assert.equal(runtimes[1].resolveRequestUserInput(asks[1].uiId,{q:{answers:['Alpha']}}),true);
    await until(()=>configs.every(config=>existsSync(join(config.cwd,'answer.json'))));
    assert.deepEqual(capture.map(scope=>scope.instanceKey),configs.map(config=>config.instanceKey));
    assert.deepEqual(capture.map(scope=>scope.cwd),configs.map(config=>config.cwd));
    await until(()=>entries.every(rows=>rows.length>0));
    for(const rows of entries)assert.ok(rows.length>0,'native transcript must reach the owning writer');
    for(const[i,rows]of entries.entries())assert.ok(rows.every(row=>row.context.instanceKey===configs[i].instanceKey&&row.entry._instanceKey===configs[i].instanceKey));
    runtimes[0].stop(); assert.equal(configs[0].pty.running,false);assert.equal(configs[1].pty.running,true);
    assert.deepEqual(await rpc(sockets[1],4,'fixture/ping'),{label:'b'});
    assert.equal((await fetch(`http://127.0.0.1:${runtimes[1].proxyPort}/v1/responses`,{method:'POST',body:'{"input":[]}',headers:{'content-type':'application/json'}})).status,200);
  } finally {
    globalThis.fetch=fetch0;sockets.forEach(socket=>socket.terminate());await Promise.all(runtimes.map(runtime=>runtime.stop()));
    upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));
    if(previous===undefined)delete process.env.CXV_ORIGINAL_BASE_URL;else process.env.CXV_ORIGINAL_BASE_URL=previous;
  }
});

test('cancelled native startup cannot spawn a TUI and retires its capture proxy', async () => {
  const controller=new AbortController(),config=options('cancel',{signal:controller.signal,requireAppServerBridge:true});
  config.env.FIXTURE_DELAY='1000'; let runtime;
  const pending=startPtyWorkspaceRuntime(config).then(value=>{runtime=value;return value;});
  const rejected=assert.rejects(pending,{name:'AbortError'});
  try {
    await until(()=>existsSync(join(config.cwd,'native.json')));
    const native=JSON.parse(readFileSync(join(config.cwd,'native.json')));
    const redirect=native.args.find(arg=>arg.startsWith('openai_base_url='));
    const proxyUrl=JSON.parse(redirect.slice('openai_base_url='.length));
    controller.abort();await rejected;
    assert.equal(config.pty.request,null);assert.equal(config.pty.running,false);
    await assert.rejects(fetch(proxyUrl,{signal:AbortSignal.timeout(1000)}));
  } finally {await pending.catch(()=>{});runtime?.stop();}
});

after(async()=>{const interceptor=await import('../interceptor.js');interceptor._stopProxyProfileWatchForTests();await interceptor.closeLogV2Writes();rmSync(root,{recursive:true,force:true});});
