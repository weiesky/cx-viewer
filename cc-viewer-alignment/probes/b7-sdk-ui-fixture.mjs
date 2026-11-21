// Isolated native-protocol fixture reused from the verified B6 transport probe.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b7-sdk-ui-'))), a = join(root, 'one/same'), b = join(root, 'two/same');
for (const cwd of [a, b]) { mkdirSync(cwd, { recursive: true }); writeFileSync(join(cwd, 'owner.txt'), cwd === a ? 'A' : 'B'); }
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'), CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a,
  CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_SDK_MODE: '1', CXV_START_PORT: '20560', CXV_MAX_PORT: '20569' });
delete process.env.CXV_BYPASS_PERMISSIONS;
const previous = readFileSync(new URL('./b6-preview-fixture.mjs', import.meta.url), 'utf8');
const marker = 'writeFileSync(executable,String.raw`', start = previous.indexOf(marker) + marker.length;
let nativeSource = previous.slice(start, previous.indexOf('`);chmodSync(executable', start));
const planEvent = `  send({method:'item/completed',params:{threadId,turnId,item:{id:'plan-'+turnId,type:'plan',text:'# B7 proposed plan\\n\\nReview B7 navigation targets.'}}});\n  send({method:'turn/plan/updated',params:{threadId,turnId,explanation:'B7 native plan',plan:[{step:'Review B7 navigation',status:'in_progress'},{step:'Verify target and badges',status:'pending'}]}});\n`;
nativeSource = nativeSource.replace("  send({method:'item/completed',params:{threadId,turnId,item:{id:randomUUID(),type:'dynamicToolCall'", planEvent + "  send({method:'item/completed',params:{threadId,turnId,item:{id:randomUUID(),type:'dynamicToolCall'");
const nativeSkill = join(a, '.agents/skills/native-ui-skill/SKILL.md');
const systemSkill = join(root, 'codex/skills/.system/imagegen/SKILL.md');
const fallbackSkill = join(a, '.codex/skills/fs-only/SKILL.md');
for (const [path, name] of [[nativeSkill, 'native-ui-skill'], [systemSkill, 'imagegen'], [fallbackSkill, 'fs-only']]) {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, `---\nname: ${name}\ndescription: B7 actual fixture metadata\n---\n\nFixture only.\n`);
}
nativeSource = nativeSource.replace(" if(f.method==='initialized')continue;", ` if(f.method==='skills/list'){send({id:f.id,result:{data:[{cwd:p.cwds[0],errors:[],skills:[
  {name:'native-ui-skill',description:'Native metadata fixture',path:${JSON.stringify(nativeSkill)},scope:'repo',enabled:true},
  {name:'imagegen',description:'Actual system fixture',path:${JSON.stringify(systemSkill)},scope:'system',enabled:true}
 ]}]}});continue;}\n if(f.method==='initialized')continue;`);
// Controlled queue phases: native-protocol fixture only, never an external model.
nativeSource = nativeSource.replace("  send({id:f.id,result:{turn:{id:turnId}}});", `
  if(text.startsWith('B7 HOLD SDK')){send({id:f.id,result:{turn:{id:turnId}}});send({method:'turn/started',params:{threadId,turn:{id:turnId,status:'inProgress'}}});continue;}
  if(text.startsWith('B7 SEND SDK')){const rpcId=f.id;setTimeout(()=>{send({id:rpcId,result:{turn:{id:turnId}}});send({method:'turn/started',params:{threadId,turn:{id:turnId,status:'inProgress'}}});complete('B7 SDK queued reply');},1200);continue;}
  send({id:f.id,result:{turn:{id:turnId}}});`);
const executable = join(root, 'fake-codex.mjs'); writeFileSync(executable, nativeSource); chmodSync(executable, 0o755);
const source = new URL('../../packages/app/', import.meta.url), server = await import(new URL('server.js', source)), sdk = await import(new URL('lib/sdk-manager.js', source));
(await import(new URL('interceptor.js', source))).initForWorkspace(a);
(await import(new URL('lib/preferences.js', source))).updatePreferences(p => ({ ...p, lang: 'en', showFullToolContent: true }));
const options = { codexPath: executable, transport: 'appserver', onEntry: server.pushSdkEntry, onStreamingStatus: server.setSdkStreamingState, onStreamProgress: server.sendSdkStreamProgress,
  broadcastWs: server.broadcastWsMessage, onAgentLoopStart: server.broadcastAgentLoopStart, onAgentLoopEnd: server.broadcastAgentLoopEnd };
sdk.setSdkLaunchConfig(options); const first = sdk.initSdkSession(a, 'same', options), second = sdk.launchSdkSession(b, 'same');
const { registerWorkspace } = await import(new URL('workspace-registry.js', source)); registerWorkspace(a); registerWorkspace(b);
server.setWorkspaceLaunched(true); await server.startViewer();
const fixture = { root, pid: process.pid, port: server.getPort(), a: { ...first, url: `http://127.0.0.1:${server.getPort()}/?instance=${first.instanceKey}` },
  b: { ...second, url: `http://127.0.0.1:${server.getPort()}/?instance=${second.instanceKey}` } };
writeFileSync('/tmp/cxv-b7-sdk-ui-fixture.json', JSON.stringify(fixture)); console.log(JSON.stringify(fixture));
let closing = false; async function close() { if (closing) return; closing = true; sdk.stopSession(); await server.stopViewer(); process.exit(0); }
process.once('SIGINT', close); process.once('SIGTERM', close);
