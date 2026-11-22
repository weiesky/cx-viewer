import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/app/package.json', import.meta.url)), WebSocket = require('ws');
const f = JSON.parse(readFileSync('/tmp/cxv-b9-native-pty-fixture.json'));
const until = async (fn, label) => { const end = Date.now() + 30000; while (!await fn()) { assert.ok(Date.now() < end, label); await new Promise(r => setTimeout(r, 50)); } };
let owner;
await until(async () => { owner = (await (await fetch(f.url + 'api/workspaces')).json()).sessions?.find(s => s.active); return owner?.sessionId; }, 'native PTY ownership');
const base = f.url.slice(0, -1), ws = new WebSocket(base.replace('http:', 'ws:') + '/ws/terminal?instance=' + owner.instanceKey, { headers: { Origin: base } });
const frames = []; ws.on('message', data => frames.push(JSON.parse(data)));
await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
const calls = () => { try { return JSON.parse(readFileSync(f.root + '/model-calls.json')); } catch { return []; } };
const lastUser = call => { try { const input = JSON.parse(call.body).input || [];
  const content = input.filter(item => item.role === 'user').at(-1)?.content;
  return typeof content === 'string' ? content : (content || []).map(part => part.text || '').join('\n');
} catch { return ''; } };
let task;
try {
  await until(() => frames.some(frame => frame.type === 'state'), 'PTY ready state');
  await new Promise(resolve => setTimeout(resolve, 1500));
  // This isolated first launch opens native Hooks review for our generated
  // PermissionRequest bridge. Verify the sole command before trusting it.
  const hookConfig = JSON.parse(readFileSync(f.root + '/.codex/hooks.json'));
  const commands = [];
  const walk = value => { if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'command' && typeof child === 'string') commands.push(child); else walk(child);
    } };
  walk(hookConfig);
  const bridge = new URL('../../packages/app/lib/perm-bridge.js', import.meta.url).pathname;
  assert.equal(commands.length, 1); assert.ok(commands[0].includes(bridge), 'unexpected fixture hook');
  ws.send(JSON.stringify({ type: 'input', data: 't' }));
  await new Promise(resolve => setTimeout(resolve, 300));
  ws.send(JSON.stringify({ type: 'input', data: '\x1b' }));
  await new Promise(resolve => setTimeout(resolve, 300));
  ws.send(JSON.stringify({ type: 'input-sequential', seq: 'b9-warmup', chunks: ['\x1b[200~B9 NATIVE WARMUP\x1b[201~', '\r'], settleMs: 300 }));
  await until(() => calls().some(call => lastUser(call) === 'B9 NATIVE WARMUP'), 'native warmup model request');
  const post = async (path, body) => { const response = await fetch(base + path + '?instance=' + owner.instanceKey,
    { method: 'POST', headers: { Origin: base, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json(); assert.ok(response.ok, JSON.stringify(data)); return data; };
  task = (await post('/api/scheduled-tasks', { project: 'same', instance: owner.instanceKey, mode: 'inject', prompt: 'B9 NATIVE SCHEDULED PTY',
    schedule: { kind: 'daily', time: '09:00' } })).task;
  await post('/api/scheduled-tasks/run', { id: task.id });
  await until(() => calls().some(call => lastUser(call) === 'B9 NATIVE SCHEDULED PTY'), 'scheduled native PTY model request');
  const current = (await (await fetch(base + '/api/workspaces')).json()).sessions.find(s => s.instanceKey === owner.instanceKey);
  assert.equal(current.sessionId, owner.sessionId);
  const history = await (await fetch(base + '/api/scheduled-tasks/runs?instance=' + owner.instanceKey + '&id=' + task.id)).json();
  assert.equal(history.runs.at(-1).status, 'dispatched');
  const nativeRoot = f.root + '/.codex/sessions';
  const rollout = readdirSync(nativeRoot, { recursive: true }).find(path => path.endsWith(current.sessionId + '.jsonl'));
  const contexts = readFileSync(nativeRoot + '/' + rollout, 'utf8').trim().split('\n').map(JSON.parse).filter(row => row.type === 'turn_context');
  const policy = contexts.at(-1).payload;
  assert.equal(policy.approval_policy, 'on-request'); assert.equal(policy.sandbox_policy.type, 'workspace-write');
  const result = { actualNativeCodexPty: true, loopbackSyntheticResponses: true, root: f.root, owner: owner.instanceKey,
    nativeSessionId: current.sessionId, taskId: task.id, requests: calls().length, scheduledNativeRequestObserved: true,
    noExternalModel: true, nativeApprovalPolicy: policy.approval_policy, sandbox: policy.sandbox_policy.type, nativeRolloutVerified: true };
  writeFileSync(new URL('../B9-native-pty.json', import.meta.url), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
} finally { ws.close(); }
