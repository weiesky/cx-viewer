// Actual PTY/runtime/bridge/server, controlled native protocol; no external model or tool execution.
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b7-pty-tasks-'))), a = join(root, 'one/same'), b = join(root, 'two/same');
for (const cwd of [a, b]) mkdirSync(cwd, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'), CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a,
  CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20600', CXV_MAX_PORT: '20609' });
delete process.env.CXV_SDK_MODE; delete process.env.CXV_BYPASS_PERMISSIONS;
const require = createRequire(new URL('../../packages/app/package.json', import.meta.url)), wsPath = require.resolve('ws'), executable = join(root, 'fake-native.js');
writeFileSync(executable, `const {createServer}=require('node:http'),{WebSocketServer,WebSocket}=require(${JSON.stringify(wsPath)}),{basename,dirname}=require('node:path');
const label=basename(dirname(process.cwd())),threadId='root-'+label;let turnId=null,sequence=0;
if(process.argv.includes('app-server')){
 const url=new URL(process.argv.find(arg=>arg.startsWith('ws://'))),clients=new Set();
 const send=frame=>{for(const s of clients)if(s.readyState===1)s.send(JSON.stringify(frame));};
 const plan=done=>({method:'turn/plan/updated',params:{threadId,turnId,plan:[{step:'B7 TASK '+label+' done',status:'completed'},{step:'B7 TASK '+label+' running',status:done?'completed':'inProgress'},{step:'B7 TASK '+label+' waiting',status:done?'completed':'pending'}]}});
 const server=createServer((req,res)=>{let raw='';req.on('data',x=>raw+=x);req.on('end',()=>{
  if(req.url==='/fixture/control'){const {mode}=JSON.parse(raw);if(mode==='start'||mode==='new'){turnId='turn-'+label+'-'+(++sequence);send({method:'turn/started',params:{threadId,turn:{id:turnId,status:'inProgress'}}});if(mode==='start')send(plan(false));}
   if(mode==='complete'){send(plan(true));send({method:'turn/completed',params:{threadId,turn:{id:turnId,status:'completed'}}});}
   if(mode==='fail')send({method:'turn/completed',params:{threadId,turn:{id:turnId,status:'interrupted'}}});
   if(mode==='child'){send({method:'thread/started',params:{thread:{id:'child-'+label,parentThreadId:threadId}}});send({method:'turn/started',params:{threadId:'child-'+label,turn:{id:'child-turn'}}});send({method:'turn/plan/updated',params:{threadId:'child-'+label,turnId:'child-turn',plan:[{step:'PRIVATE CHILD TASK',status:'pending'}]}});}
  }res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({threadId,turnId,clients:clients.size}));});});
 new WebSocketServer({server}).on('connection',socket=>{clients.add(socket);socket.on('close',()=>clients.delete(socket));socket.on('message',raw=>{const f=JSON.parse(raw);if(f.method==='thread/start')socket.send(JSON.stringify({id:f.id,result:{thread:{id:threadId,cwd:process.cwd()}}}));});});server.listen(Number(url.port),'127.0.0.1');
}else{
 const socket=new WebSocket(process.argv[process.argv.indexOf('--remote')+1]);socket.on('open',()=>socket.send(JSON.stringify({id:1,method:'thread/start',params:{cwd:process.cwd()}})));socket.on('message',raw=>{const f=JSON.parse(raw);if(f.result?.thread)process.stdout.write('B7 controlled native TUI '+label+' ready\\r\\n');});socket.on('close',()=>process.exit(0));process.stdin.resume();}
`); chmodSync(executable, 0o755);
const server = await import('../../packages/app/server.js'), interceptor = await import('../../packages/app/interceptor.js'); interceptor.initForWorkspace(a);
(await import('../../packages/app/lib/preferences.js')).updatePreferences(p => ({ ...p, lang: 'en' }));
await server.startViewer(); const port = server.getPort();
const { createPtySession } = await import('../../packages/app/pty-manager.js'), { startPtyWorkspaceRuntime } = await import('../../packages/app/lib/pty-workspace-runtime.js'), { ensureProjectIdForCwd, rawProjectDirectoryToken } = await import('../../packages/app/lib/log-v2/project-id.js');
const runtimes = new Map();
async function launch(request) {
  const projectId = ensureProjectIdForCwd(join(root, 'logs'), request.cwd, 'same');
  const runtime = await startPtyWorkspaceRuntime({ ...request, projectId, codexPath: executable, isNpmVersion: true,
    rawDir: join(root, 'raw', rawProjectDirectoryToken(projectId), request.instanceKey), logDir: join(root, 'logs'), serverPort: port, otelToken: server.getOtelAccessToken(),
    systemPromptCapability: { verified: false, append: false, override: false }, requireAppServerBridge: true,
    callbacks: { onEntry: interceptor.appendLogEntry, onTaskSnapshot: server.broadcastPtyTaskSnapshot,
      onAgentLoopStart: server.broadcastPtyAgentLoopStart, onAgentLoopEnd: server.broadcastPtyAgentLoopEnd } });
  runtimes.set(request.instanceKey, runtime); return runtime;
}
const pty = createPtySession(), registry = server.configurePtyWorkspaces({ boot: { cwd: a, pty }, launch });
const first = registry.info(), runtime = await launch({ cwd: a, instanceKey: first.instanceKey, pty, args: [] }); registry.setRuntime(first.instanceKey, runtime);
const second = await registry.ensure(b, []), end = Date.now() + 10000;
while (!registry.list().every(s => s.sessionId)) { if (Date.now() > end) throw Error('controlled native roots did not attach'); await new Promise(r => setTimeout(r, 20)); }
const fixture = { root, pid: process.pid, port, url: `http://127.0.0.1:${port}/`, nativeProtocolControlled: true,
  owners: registry.list().map(owner => ({ ...owner, controlPort: runtimes.get(owner.instanceKey).appServerPort })) };
writeFileSync('/tmp/cxv-b7-pty-task-fixture.json', JSON.stringify(fixture)); console.log(JSON.stringify(fixture));
let closing = false; async function close() { if (closing) return; closing = true; await server.stopViewer(); process.exit(0); }
process.once('SIGINT', close); process.once('SIGTERM', close);
