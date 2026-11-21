import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = mkdtempSync(join(tmpdir(), 'cxv-file-oracle-')), a = join(root, 'one/same'), b = join(root, 'two/same');
for (const dir of [a,b]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_PROJECT_DIR: a, CXV_LOG_DIR: join(root, 'state'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profile.json'), CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20450', CXV_MAX_PORT: '20459' });
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
let port, infoA, infoB;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(a); sdk.setSdkLaunchConfig({ codexPath: process.execPath });
  infoA = sdk.initSdkSession(a, 'same', { codexPath: process.execPath }); infoB = sdk.launchSdkSession(b, 'same');
  writeFileSync(join(a, 'only-a.txt'), 'A_BYTES'); writeFileSync(join(b, 'only-b.txt'), 'B_BYTES');
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
const call = (body, instance = infoB.instanceKey, headers = {}) => fetch(`http://127.0.0.1:${port}/api/files-exists?` + new URLSearchParams({ instance }),
  { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('real HTTP batch checks exact instance and ignores body attempts to select a sibling', async () => {
  const paths = ['only-a.txt','only-b.txt','missing.txt','',join(b, 'only-b.txt')];
  const response = await call({ paths, instance: infoA.instanceKey, project: 'same' }); assert.equal(response.status,200);
  const data = await response.json(); assert.deepEqual(data.results, paths.map((path,i) => ({ path, exists: i===1 || i===4 })));
  assert.ok(!JSON.stringify(data).includes('BYTES')); assert.equal(readFileSync(join(a,'only-a.txt'),'utf8'),'A_BYTES');
  assert.equal((await call({ paths }, 'stale')).status,404);
});

test('missing, directory, traversal, denied native state and symbolic/private aliases all return the same false shape', async () => {
  mkdirSync(join(process.env.CODEX_HOME,'sessions'),{recursive:true}); const history=join(process.env.CODEX_HOME,'sessions','rollout.jsonl'); writeFileSync(history,'SYNTHETIC_PRIVATE');
  linkSync(history,join(b,'private-alias.txt')); symlinkSync(a,join(b,'escape')); mkdirSync(join(b,'directory'));
  const paths=['missing','directory','../one/same/only-a.txt','escape/only-a.txt','private-alias.txt',history,join(a,'only-a.txt'),'bad\0path'];
  const response=await call({paths}); assert.equal(response.status,200); assert.deepEqual(await response.json(),{results:paths.map(path=>({path,exists:false}))});
  assert.equal(readFileSync(history,'utf8'),'SYNTHETIC_PRIVATE');
});

test('batch/type/length/body and hostile-origin guards reject before probing', async () => {
  for(const body of [{}, {paths:null}, {paths:[1]}, {paths:['x'.repeat(1025)]}, {paths:Array(51).fill('x')}, '{']) assert.equal((await call(body)).status,400);
  assert.equal((await call({paths:Array(50).fill('only-b.txt')})).status,200);
  assert.equal((await call(' '.repeat(256*1024+1))).status,413);
  assert.equal((await call({paths:['only-b.txt']},infoB.instanceKey,{Origin:'https://hostile.example'})).status,403);
});
