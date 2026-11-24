import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSdkModelCatalog } from '../lib/sdk-model-catalog.js';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-sdk-model-switch-')));
const a = join(root, 'exec'), b = join(root, 'appserver'), callsFile = join(root, 'calls.jsonl');
for (const dir of [a, b, join(root, 'codex')]) mkdirSync(dir);
const model = (name, efforts, isDefault = false) => ({ model: name, displayName: name,
  supportedReasoningEfforts: efforts.map(reasoningEffort => ({ reasoningEffort })), defaultReasoningEffort: efforts[0], isDefault });
const catalog = [model('alpha', ['low', 'max', 'ultra'], true), model('beta', ['medium', 'high'])];
const script = join(root, 'codex.mjs');
writeFileSync(script, `#!/usr/bin/env node
import {createInterface} from 'node:readline';
import {appendFileSync} from 'node:fs';
const catalog=${JSON.stringify(catalog)},file=${JSON.stringify(callsFile)};
const args=process.argv.slice(2),tid='12345678-1234-4234-8234-123456789abc';
const send=f=>console.log(JSON.stringify(f)),log=f=>appendFileSync(file,JSON.stringify({cwd:process.cwd(),...f})+'\\n');
if(args.includes('app-server')) {
 let current='alpha';
 createInterface({input:process.stdin}).on('line',line=>{
  const f=JSON.parse(line),p=f.params||{};if(!f.method||f.method==='initialized')return;log({method:f.method,params:p,args});
  if(f.method==='model/list'){send({id:f.id,result:{data:p.cursor?[catalog[1]]:[catalog[0],{...catalog[1],hidden:true}],nextCursor:p.cursor?null:'page2'}});return;}
  if(f.method==='config/read'){send({id:f.id,result:{config:{model:'alpha',model_reasoning_effort:'low'}}});return;}
  if(f.method==='thread/start'||f.method==='thread/resume'){current=p.model||current;send({id:f.id,result:{thread:{id:p.threadId||tid}}});return;}
  if(f.method==='turn/start'){
   current=p.model||current;const id='turn-'+Date.now();send({id:f.id,result:{turn:{id}}});
   send({method:'turn/started',params:{threadId:tid,turn:{id,status:'inProgress'}}});
   const finish=()=>{send({method:'item/completed',params:{threadId:tid,turnId:id,item:{id,type:'agentMessage',text:current}}});send({method:'turn/completed',params:{threadId:tid,turn:{id,status:'completed',items:[]}}});};
   setTimeout(finish,p.input[0].text==='hold'?200:0);return;
  }
  send({id:f.id,result:{}});
 });
} else {
 let input='';for await(const line of createInterface({input:process.stdin}))input+=line;
 const i=args.indexOf('--model'),m=i<0?'alpha':args[i+1];log({method:'exec',args,input,cwd:args[args.indexOf('--cd')+1]});
 send({type:'thread.started',thread_id:tid,model:m});send({type:'turn.started'});
 if(input==='hold')await new Promise(r=>setTimeout(r,200));
 send({type:'item.completed',item:{id:'reply',type:'agent_message',text:m}});
 send({type:'turn.completed',usage:{input_tokens:3,output_tokens:2}});
}
`, { mode: 0o755 });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROJECT_DIR: a, CXV_SDK_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20930', CXV_MAX_PORT: '20939' });
let sdk, server, port, views, entries = [], statuses = [];
const calls = () => { try { return readFileSync(callsFile, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };
const call = async (view, path, selection) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}?instance=${view.instanceKey}`, selection ? {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(selection),
  } : {});
  return { status: response.status, data: await response.json() };
};
before(async () => {
  sdk = await import('../lib/sdk-manager.js');
  server = await import('../server.js');
  views = [a, b].map((cwd, i) => sdk.initSdkSession(cwd, 'same', { codexPath: script,
    transport: i ? 'appserver' : 'exec', codexArgs: ['--model', 'alpha'],
    onEntry: e => entries.push(e), onStreamingStatus: s => { statuses.push(s); server.setSdkStreamingState(s); } }));
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk?.stopSession(); await server?.stopViewer(); rmSync(root, { recursive: true, force: true }); });

test('native catalog paginates, excludes hidden entries and never starts a thread or turn', async () => {
  const { status, data } = await call(views[0], '/api/sdk-models');
  assert.equal(status, 200); assert.equal(data.instanceKey, views[0].instanceKey);
  assert.deepEqual(data.models.map(m => m.model), ['alpha', 'beta']);
  assert.deepEqual(data.models[0].supportedReasoningEfforts.map(e => e.reasoningEffort), ['low', 'max', 'ultra']);
  assert.equal(calls().some(c => c.method.startsWith('thread/') || c.method === 'exec' || c.method === 'turn/start'), false);
  assert.equal(sdk.getSessionId(views[0]), null);
});

for (const [i, transport] of ['exec', 'appserver'].entries()) test(`${transport} switch preserves native thread/history and applies model/effort to the next request`, async () => {
  const view = views[i];
  await sdk.sendUserMessage('first', view);
  const originalThread = sdk.getSessionId(view), first = entries.at(-1);
  let { data } = await call(view, '/api/sdk-models');
  const changed = await call(view, '/api/sdk-model', { instanceKey: view.instanceKey, model: 'beta', reasoningEffort: 'high', revision: data.revision });
  assert.equal(changed.status, 200); assert.equal(changed.data.model, 'beta');
  assert.equal(sdk.getSdkStreamingState(view).model, 'beta');
  assert.equal(statuses.at(-1).reasoningEffort, 'high');
  assert.equal(sdk.getSessionId(view), originalThread);
  await sdk.sendUserMessage('second', view);
  assert.equal(sdk.getSessionId(view), originalThread);
  const entry = entries.at(-1);
  assert.equal(entry.response.body.model, 'beta');
  assert.equal(JSON.stringify(entry.body.input).includes('first'), true);
  assert.equal(first.response.body.model, 'alpha', 'previous archived reply is unchanged');
  const sent = calls().filter(c => c.cwd === view.cwd && c.method === (i ? 'turn/start' : 'exec')).at(-1);
  if (i) { assert.equal(sent.params.model, 'beta'); assert.equal(sent.params.effort, 'high'); assert.equal(sent.params.threadId, originalThread); }
  else { assert.ok(sent.args.includes(originalThread)); assert.equal(sent.args[sent.args.indexOf('--model') + 1], 'beta'); assert.ok(sent.args.includes('model_reasoning_effort="high"')); }
  data = (await call(view, '/api/sdk-models')).data;
  assert.equal(data.model, 'beta'); assert.equal(data.reasoningEffort, 'high');
});

test('invalid, stale, cross-workspace and busy writes do not change the selected model', async () => {
  const view = views[0], data = (await call(view, '/api/sdk-models')).data;
  const selection = { instanceKey: view.instanceKey, revision: data.revision, model: 'beta' };
  for (const [patch, expected] of [[{ model: 'made-up' }, 400], [{ reasoningEffort: 'ultra' }, 400],
    [{ instanceKey: views[1].instanceKey }, 409], [{ revision: 'old' }, 409]]) {
    assert.equal((await call(view, '/api/sdk-model', { ...selection, ...patch })).status, expected);
  }
  const pending = sdk.sendUserMessage('hold', view);
  assert.equal((await call(view, '/api/sdk-model', selection)).status, 409);
  await pending;
  assert.equal(sdk.getSdkStreamingState(view).model, 'beta');
  assert.equal((await call({ instanceKey: 'missing' }, '/api/sdk-models')).status, 404);
});

test('switching to a model with different effort support uses its advertised default and remains instance-local', async () => {
  const view = views[0], before = (await call(views[1], '/api/sdk-models')).data;
  const current = (await call(view, '/api/sdk-models')).data;
  const changed = await call(view, '/api/sdk-model', { instanceKey: view.instanceKey, revision: current.revision, model: 'alpha' });
  assert.equal(changed.status, 200); assert.equal(changed.data.reasoningEffort, 'low');
  assert.equal((await call(view, '/api/sdk-model', { instanceKey: view.instanceKey, revision: current.revision, model: 'beta' })).status, 409);
  const other = (await call(views[1], '/api/sdk-models')).data;
  assert.equal(other.model, before.model); assert.equal(other.revision, before.revision);
});

test('concurrent browser selections accept only one write for the same revision', async () => {
  const view = views[0], current = await sdk.listSdkModels(view);
  const results = await Promise.allSettled(['alpha', 'beta'].map(model => sdk.setSdkModel({ model, revision: current.revision }, view)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'SDK_MODEL_STALE');
});

test('malformed catalog, cursor loops and native failures always close the owned catalog client', async () => {
  for (const mode of ['cursor', 'invalid', 'failure']) {
    let stopped = 0;
    const client = { notify() {}, async stop() { stopped++; }, async request(method) {
      if (method === 'initialize') return {};
      if (mode === 'failure') throw new Error('native unavailable');
      return mode === 'invalid' ? { data: [{}] } : { data: [catalog[0]], nextCursor: 'repeat' };
    } };
    await assert.rejects(readSdkModelCatalog({ codexPath: '/fixture', cwd: root, clientFactory: () => client }));
    assert.equal(stopped, 1);
  }
});
