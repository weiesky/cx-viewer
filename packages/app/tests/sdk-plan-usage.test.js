import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSdkPlanUsage, sdkPlanUsage } from '../lib/sdk-plan-usage.js';

const bucket = { limitId: 'codex', planType: 'pro', primary: { usedPercent: 23, windowDurationMins: 300, resetsAt: 1795500000 },
  secondary: { usedPercent: 85, windowDurationMins: 10080, resetsAt: 1795800000 } };

test('native multi-bucket quota maps percentages, durations and seconds without duplicate buckets or private fields', () => {
  const result = sdkPlanUsage({ rateLimits: { ...bucket, primary: { ...bucket.primary, usedPercent: 99 } },
    rateLimitsByLimitId: { other: { ...bucket, limitId: 'other', limitName: 'Other', secondary: null }, codex: bucket },
    accessToken: 'secret' });
  assert.deepEqual(result.windows.map(w => [w.id, w.utilization, w.windowMinutes, w.resetAt]), [
    ['codex:primary', 0.23, 300, 1795500000000], ['codex:secondary', 0.85, 10080, 1795800000000],
    ['other:primary', 0.23, 300, 1795500000000],
  ]);
  assert.equal(result.planType, 'pro');
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(sdkPlanUsage({ rateLimits: bucket }).windows.length, 2, 'old single-bucket protocol');
});

test('empty, malformed and placeholder quota windows never become a fabricated zero percent', () => {
  for (const primary of [null, {}, { usedPercent: '23' }, { usedPercent: NaN }, { usedPercent: Infinity },
    { usedPercent: -1 }, { usedPercent: 0, windowDurationMins: 0, resetsAt: null }]) {
    assert.equal(sdkPlanUsage({ rateLimits: { primary } }), null);
  }
  assert.equal(sdkPlanUsage({ rateLimits: { primary: { usedPercent: 0, windowDurationMins: 300 } } }).windows[0].utilization, 0);
  assert.equal(sdkPlanUsage({ rateLimits: { ...bucket, limitId: 'invalid:id' } }), null);
  assert.throws(() => sdkPlanUsage({ rateLimitsByLimitId: Object.fromEntries(Array.from({ length: 65 }, (_, i) => [i, bucket])) }));
});

test('read-only native client uses session config and closes for success, missing subscription and errors', async () => {
  for (const mode of ['success', 'apiKey', 'custom', 'error', 'abort']) {
    const calls = [], controller = new AbortController();
    let stopped = 0, options;
    const result = readSdkPlanUsage({ codexPath: '/native', cwd: '/workspace',
      codexOptions: { config: { profile: 'owned' }, env: { QUOTA_TEST: 'owned' } },
      configOverrides: ['model_provider="openai"'], threadOptions: { sandboxMode: 'read-only' }, signal: controller.signal,
      clientFactory(value) { options = value; return { notify(method) { calls.push(method); }, async stop() { stopped++; },
        async request(method, params, { signal }) {
          calls.push(method); signal.throwIfAborted();
          if (method === 'account/read') {
            if (mode === 'abort') { controller.abort(new Error('closed')); signal.throwIfAborted(); }
            return { account: { type: mode === 'apiKey' ? 'apiKey' : 'chatgpt', email: 'private@example.test' }, requiresOpenaiAuth: mode !== 'custom' };
          }
          if (method === 'account/rateLimits/read') { if (mode === 'error') throw new Error('native failed'); return { rateLimits: bucket }; }
          return {};
        } }; },
    });
    if (['error', 'abort'].includes(mode)) await assert.rejects(result);
    else assert.equal(!!await result, mode === 'success');
    assert.equal(stopped, 1);
    assert.equal(options.cwd, '/workspace'); assert.equal(options.env.QUOTA_TEST, 'owned');
    assert.ok(options.args.includes('model_provider="openai"'));
    assert.ok(options.args.includes('profile="owned"'));
    assert.equal(calls.some(m => /thread\/|turn\/|login|logout/.test(m)), false);
    if (['apiKey', 'custom'].includes(mode)) assert.equal(calls.includes('account/rateLimits/read'), false);
  }
});

const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-sdk-plan-usage-')));
const callsFile = join(root, 'calls.jsonl'), script = join(root, 'codex.mjs');
const dirs = ['exec', 'appserver', 'slow'].map(name => join(root, name));
for (const dir of [...dirs, join(root, 'codex')]) mkdirSync(dir);
writeFileSync(script, `import {createInterface} from 'node:readline';
import {appendFileSync} from 'node:fs';
createInterface({input:process.stdin}).on('line',line=>{
 const f=JSON.parse(line);if(f.id==null)return;
 appendFileSync(${JSON.stringify(callsFile)},JSON.stringify({cwd:process.cwd(),method:f.method})+'\\n');
 const result=f.method==='account/read'?{account:{type:'chatgpt'},requiresOpenaiAuth:true}:f.method==='account/rateLimits/read'?{rateLimits:${JSON.stringify(bucket)}}:{};
 const send=()=>console.log(JSON.stringify({id:f.id,result}));
 if(process.cwd().endsWith('/slow')&&f.method==='account/rateLimits/read')setTimeout(send,2000);else send();
});`);
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROJECT_DIR: dirs[0], CXV_SDK_MODE: '1', CXV_CLI_MODE: '1', CXV_START_PORT: '20970', CXV_MAX_PORT: '20979' });
let sdk, server, port, views;
before(async () => {
  sdk = await import('../lib/sdk-manager.js'); server = await import('../server.js');
  views = dirs.map((cwd, i) => sdk.initSdkSession(cwd, 'same', { codexPath: script, transport: i === 1 ? 'appserver' : 'exec' }));
  await server.startViewer(); port = server.getPort();
});
after(async () => { await sdk?.stopSession(); await server?.stopViewer(); rmSync(root, { recursive: true, force: true }); });
const calls = () => { try { return readFileSync(callsFile, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };

test('exec and appserver quota endpoint is scoped, cached and deduplicates concurrent reads without starting native turns', async () => {
  for (const view of views.slice(0, 2)) {
    const url = `http://127.0.0.1:${port}/api/sdk-plan-usage?instance=${view.instanceKey}`;
    const results = await Promise.all([fetch(url), fetch(url)]);
    for (const response of results) {
      assert.equal(response.status, 200);
      const data = await response.json(); assert.equal(data.instanceKey, view.instanceKey);
      assert.equal(data.planUsage.windows[0].utilization, 0.23);
    }
    await sdk.getSdkPlanUsage(view);
    assert.equal(calls().filter(c => c.cwd === view.cwd && c.method === 'account/rateLimits/read').length, 1);
    assert.equal(sdk.getSessionId(view), null);
  }
  assert.equal(calls().some(c => /thread\/|turn\//.test(c.method)), false);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/sdk-plan-usage?instance=missing`)).status, 404);
});

test('closing a workspace aborts and rejects its in-flight quota snapshot', async () => {
  const view = views[2], pending = sdk.getSdkPlanUsage(view);
  for (let i = 0; i < 100 && !calls().some(c => c.cwd === view.cwd && c.method === 'account/rateLimits/read'); i++) await new Promise(r => setTimeout(r, 10));
  assert.ok(calls().some(c => c.cwd === view.cwd && c.method === 'account/rateLimits/read'));
  const rejected = assert.rejects(pending);
  sdk.closeSdkSession(view);
  await rejected;
  assert.throws(() => sdk.getSdkPlanUsage(view), /no longer available/);
});
