import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync, truncateSync, realpathSync, linkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = mkdtempSync(join(tmpdir(), 'cxv-audio-preview-'));
const a = join(root, 'a'), b = join(root, 'b');
for (const dir of [a, b]) mkdirSync(dir);
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'state'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_SDK_MODE: '1',
  CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20430', CXV_MAX_PORT: '20439' });
const { readFileContent, writeFileContent } = await import('../lib/file-api.js');
const { getUtf16Encoding } = await import('../lib/binary-sniff.js');
const server = await import('../server.js'), sdk = await import('../lib/sdk-manager.js');
let port, infoA, infoB;
before(async () => {
  (await import('../interceptor.js')).initForWorkspace(a);
  sdk.setSdkLaunchConfig({ codexPath: process.execPath });
  infoA = sdk.initSdkSession(a, 'a', { codexPath: process.execPath }); infoB = sdk.launchSdkSession(b, 'b');
  await server.startViewer(); port = server.getPort();
});
after(async () => { sdk.stopSession(); await server.stopViewer(); rmSync(root, { recursive: true, force: true }); });
const endpoint = (path, instance = infoA.instanceKey) => `http://127.0.0.1:${port}/api/audio-stream?` + new URLSearchParams({ path, instance });
const bytes = Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.alloc(5000 - 12, 1)]);

test('actual audio GET/HEAD, ranges, suffix, clamp, 416, ETag and If-Range', async () => {
  writeFileSync(join(a, 'song.mp3'), bytes);
  const full = await fetch(endpoint('song.mp3'));
  assert.equal(full.status, 200); assert.equal(full.headers.get('content-type'), 'audio/wav');
  assert.equal(full.headers.get('accept-ranges'), 'bytes'); assert.equal(full.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await full.arrayBuffer()), bytes);
  const etag = full.headers.get('etag');
  for (const [range, start, end] of [['bytes=0-1', 0, 1], ['bytes=10-99',10,99], ['bytes=-100',4900,4999], ['bytes=0-999999',0,4999], ['bytes=4500-',4500,4999]]) {
    const res = await fetch(endpoint('song.mp3'), { headers: { range } });
    assert.equal(res.status, 206); assert.equal(res.headers.get('content-range'), `bytes ${start}-${end}/5000`);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes.subarray(start, end + 1));
  }
  const invalid = await fetch(endpoint('song.mp3'), { headers: { range: 'bytes=5000-' } });
  assert.equal(invalid.status, 416); assert.equal(invalid.headers.get('content-range'), 'bytes */5000'); assert.equal((await invalid.arrayBuffer()).byteLength, 0);
  const head = await fetch(endpoint('song.mp3'), { method: 'HEAD', headers: { range: 'bytes=0-1' } });
  assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), '5000'); assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal((await fetch(endpoint('song.mp3'), { headers: { 'if-none-match': etag } })).status, 304);
  for (const [tag, status] of [[etag,206], ['"stale"',200]]) {
    const res = await fetch(endpoint('song.mp3'), { headers: { range: 'bytes=0-1', 'if-range': tag } });
    assert.equal(res.status,status); await res.arrayBuffer();
  }
  for (const range of ['bytes=0-1,3-5','garbage','bytes=20-10']) {
    const res=await fetch(endpoint('song.mp3'),{headers:{range}}); assert.equal(res.status,200); await res.arrayBuffer();
  }
  writeFileSync(join(a,'empty.wav'),''); const empty=await fetch(endpoint('empty.wav')); assert.equal(empty.status,200); assert.equal((await empty.arrayBuffer()).byteLength,0);
});

test('audio streams isolate instances and enforce file browser/target/native boundaries', async () => {
  writeFileSync(join(b,'song.mp3'),'B');
  assert.equal(await (await fetch(endpoint('song.mp3',infoB.instanceKey))).text(),'B');
  assert.equal((await fetch(endpoint('song.mp3','unknown'))).status,404);
  symlinkSync(join(b,'song.mp3'),join(a,'outside.mp3'));
  for (const path of ['../b/song.mp3','outside.mp3','']) assert.equal((await fetch(endpoint(path))).status,400);
  mkdirSync(join(root,'codex'),{recursive:true}); writeFileSync(join(root,'codex','auth.json'),'SECRET');
  symlinkSync(join(root,'codex','auth.json'),join(a,'secret.mp3'));
  const denied=await fetch(endpoint('secret.mp3')); assert.equal(denied.status,400); assert.ok(!(await denied.text()).includes('SECRET'));
  writeFileSync(join(a,'text.txt'),'text'); assert.equal((await fetch(endpoint('text.txt'))).status,400);
  mkdirSync(join(a,'dir.mp3')); assert.equal((await fetch(endpoint('dir.mp3'))).status,400);
  assert.equal((await fetch(endpoint('missing.mp3'))).status,404);
  assert.equal((await fetch(endpoint('song.mp3'),{headers:{origin:'https://evil.invalid'}})).status,403);
});

test('large sparse audio streams bounded ranges and abort leaves service healthy', async () => {
  writeFileSync(join(a,'large.wav'),bytes); truncateSync(join(a,'large.wav'),1024*1024*1024);
  const tail=await fetch(endpoint('large.wav'),{headers:{range:'bytes=-2'}}); assert.equal(tail.status,206); assert.equal((await tail.arrayBuffer()).byteLength,2);
  const abort=new AbortController(); const response=await fetch(endpoint('large.wav'),{signal:abort.signal});
  const reader=response.body.getReader(); await reader.read(); abort.abort(); await reader.cancel().catch(()=>{});
  const next=await fetch(endpoint('song.mp3'),{headers:{range:'bytes=0-1'}}); assert.equal(next.status,206); await next.arrayBuffer();
});

test('audio and archive target reads preserve administrator and native inode policy', async () => {
  const config=join(root,'.codex');mkdirSync(config,{recursive:true});
  writeFileSync(join(config,'AGENTS.md'),'global guidance');writeFileSync(join(config,'voice.wav'),bytes);writeFileSync(join(config,'sample.zip'),'PK target');
  writeFileSync(join(config,'auth.json'),'SECRET_INODE');linkSync(join(config,'auth.json'),join(config,'alias.wav'));linkSync(join(config,'auth.json'),join(config,'alias.zip'));
  const params=new URLSearchParams({kind:'codex-md',id:Buffer.from(realpathSync(join(config,'AGENTS.md'))).toString('base64url'),instance:infoA.instanceKey});
  const target=(api,path)=>`/api/${api}?${params}&path=${encodeURIComponent(path)}`;
  function call(path,headers={}){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,headers},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,text}));});req.on('error',reject);req.end();});}
  for(const [api,path] of [['audio-stream','.codex/voice.wav'],['archive-raw','.codex/sample.zip']]){
    assert.equal((await call(target(api,path))).status,200);
    assert.equal((await call(target(api,path),{Host:'remote.invalid'})).status,403);
    assert.equal((await call(target(api,path),{'Sec-Fetch-Site':'cross-site'})).status,403);
    assert.equal((await call(target(api,path),{Origin:'https://evil.invalid'})).status,403);
  }
  for(const [api,path] of [['audio-stream','.codex/alias.wav'],['archive-raw','.codex/alias.zip']]){
    const denied=await call(target(api,path));assert.equal(denied.status,403);assert.ok(!denied.text.includes('SECRET_INODE'));
  }
  assert.equal((await call(target('audio-stream','two/same/song.mp3').replace(infoA.instanceKey,'unknown'))).status,404);
});
