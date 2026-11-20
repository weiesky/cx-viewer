// Isolated, repeatable GUI fixture. Run after `pnpm run build`; stop with Ctrl+C.
// Uses temporary HOME/CODEX_HOME, a local fake Codex and two same-named workspaces.
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b4-tasks-gui-')));
const a = join(root, 'one', 'same'), b = join(root, 'two', 'same');
for (const cwd of [a, b]) {
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, 'note.txt'), cwd);
}
Object.assign(process.env, {
  HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profile.json'), CXV_PROJECT_DIR: a,
  CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1',
  CXV_SDK_MODE: '1', CXV_START_PORT: '20320', CXV_MAX_PORT: '20329',
});
delete process.env.CXV_BYPASS_PERMISSIONS;
const executable = join(root, 'fake-codex.mjs');
const nativeAsks = process.argv.includes('--native-asks');
const slowResponses = new Map();
let slowServer;
if (process.argv.includes('--slow-upstream')) {
  slowServer = createServer((req, res) => {
    let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => {
      const { workspace } = JSON.parse(body); slowResponses.set(workspace, res);
      res.writeHead(200, { 'content-type': 'text/event-stream' }); res.flushHeaders();
    });
  });
  await new Promise(resolve => slowServer.listen(0, '127.0.0.1', resolve));
  process.env.CXV_ORIGINAL_BASE_URL = `http://127.0.0.1:${slowServer.address().port}/v1`;
}
writeFileSync(executable, String.raw`#!/usr/bin/env node
import { appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
let input = ''; for await (const chunk of process.stdin) input += chunk;
const cwd = process.env.CXV_PROJECT_DIR;
appendFileSync(join(process.env.HOME, 'calls.jsonl'), JSON.stringify({ cwd, input, argv: process.argv }) + '\n');
const label = cwd.includes('/two/') ? 'B' : 'A';
const resume = process.argv.indexOf('resume');
const threadId = resume >= 0 ? process.argv[resume + 1] : 'gui-native-' + label + '-' + randomUUID();
for (const event of [{ type: 'thread.started', thread_id: threadId }, { type: 'turn.started' }]) process.stdout.write(JSON.stringify(event) + '\n');
if (input.includes('thinking fixture')) process.stdout.write(JSON.stringify({ type: 'item.completed',
 item: { id: 'reasoning', type: 'reasoning', text: 'GUI_THINK ' + input } }) + '\n');
if (input.includes('eof fixture')) {
 process.stdout.write(JSON.stringify({ type: 'item.updated', item: { id: 'partial-eof', type: 'agent_message', text: 'Partial reply retained after clean child exit' } }) + '\n');
 while (!existsSync(join(cwd, 'release'))) await new Promise(resolve => setTimeout(resolve, 20));
 process.exit(0);
}
const steps = [
 { text: label + ' 读取固定基线源码', completed: true },
 { text: label + ' 验证工作区任务隔离与刷新恢复', completed: false },
 { text: label + ' 记录基线对照及验证边界\n第二行详情供Popover检查', completed: false },
];
process.stdout.write(JSON.stringify({ type: 'item.updated', item: { id: 'todo', type: 'todo_list', items: steps } }) + '\n');
if (input.includes('slow upstream')) {
 const response = await fetch(process.env.OPENAI_BASE_URL + '/responses', { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'fixture', input, workspace: label }) });
 await response.text();
}
if (input.includes('hold')) while (!existsSync(join(cwd, 'release'))) await new Promise(resolve => setTimeout(resolve, 20));
process.stdout.write(JSON.stringify({ type: 'item.completed', item: { id: 'todo', type: 'todo_list', items: steps.map(step => ({ ...step, completed: true })) } }) + '\n');
for (const event of [
  { type: 'item.completed', item: { id: 'reply', type: 'agent_message', text: 'GUI fixture ' + label + ' replied: ' + input } },
  { type: 'turn.completed', usage: { input_tokens: 3, output_tokens: 3 } },
]) process.stdout.write(JSON.stringify(event) + '\n');
`);
if (nativeAsks) writeFileSync(executable, String.raw`#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
const send = f => process.stdout.write(JSON.stringify(f) + '\n');
let threadId = randomUUID(), turnId, childId = randomUUID();
for await (const line of createInterface({ input: process.stdin })) {
 const f = JSON.parse(line), p = f.params || {};
 if (!f.method) {
  send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer', type: 'agentMessage', text: 'GUI native reply: ' + JSON.stringify(f.result) } } });
  send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } }); continue;
 }
 if (f.method === 'initialized') continue;
 if (f.method === 'initialize') { send({ id: f.id, result: {} }); continue; }
 if (f.method === 'mcpServerStatus/list') {
  appendFileSync(join(process.cwd(), 'mcp-status-reads.jsonl'), JSON.stringify(p) + '\n');
  if (p.threadId !== threadId) { send({ id: f.id, error: { code: -32000, message: 'wrong fixture thread' } }); continue; }
  const scope = process.cwd().includes('/one/same') ? 'A' : 'B';
  const rows = [ ['fixture', 'connected'], ['auth', 'authenticationRequired'], ['failed', 'failed'], ['disabled', 'disabled'], ['unknown', 'cancelled'] ];
  send({ id: f.id, result: { data: rows.map(([name, runtimeStatus]) => ({ name: scope + ' ' + name, runtimeStatus,
   authStatus: 'unsupported', tools: runtimeStatus === 'connected' ? { read: { name: 'read' } } : {}, resources: [], resourceTemplates: [],
   ...(runtimeStatus === 'connected' ? { serverInfo: { name: 'fixture', version: '1.0.0' } } : {}),
   ...(runtimeStatus === 'failed' ? { toolsError: 'Local fixture unavailable' } : {}) })), nextCursor: null } }); continue;
 }
 if (f.method === 'thread/start' || f.method === 'thread/resume') {
  threadId = p.threadId || threadId; send({ id: f.id, result: { thread: { id: threadId } } }); continue;
 }
 if (f.method === 'thread/read') {
  send({ id: f.id, result: { thread: { id: p.threadId, source: { subAgent: { thread_spawn: {
   parent_thread_id: threadId, agent_nickname: 'Native Child', agent_role: 'default' } } } } } }); continue;
 }
 if (f.method === 'turn/start') {
  turnId = randomUUID();
  send({ id: f.id, result: { turn: { id: turnId } } });
  send({ method: 'turn/started', params: { threadId, turn: { id: turnId, status: 'inProgress' } } });
  const text = p.input[0].text;
  if (text.includes('compact fixture')) {
   const item = { id: 'compact-' + turnId, type: 'contextCompaction' };
   send({ method: 'item/completed', params: { threadId: 'foreign-fixture', turnId, item } });
   send({ method: 'item/completed', params: { threadId, turnId, item } });
   send({ method: 'item/completed', params: { threadId, turnId, item } });
   send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer-' + turnId,
    type: 'agentMessage', text: 'GUI native compaction fixture completed' } } });
   send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } }); continue;
  }
  if (text.startsWith('fail') || text === 'retry success') {
   const error = { message: 'Reconnecting... 1/1 (local native fixture)', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 503 } } };
   send({ method: 'error', params: { threadId, turnId, willRetry: true, error } });
   if (text === 'retry success') {
    const ownTurn = turnId;
    const timer = setInterval(() => {
     if (!existsSync(join(process.cwd(), 'release'))) return;
     clearInterval(timer);
     send({ method: 'item/completed', params: { threadId, turnId: ownTurn, item: { id: 'answer', type: 'agentMessage', text: 'GUI automatic retry succeeded' } } });
     send({ method: 'turn/completed', params: { threadId, turn: { id: ownTurn, status: 'completed' } } });
    }, 20); continue;
   }

   send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'failed', error: { message: text, codexErrorInfo: error.codexErrorInfo } } } }); continue;
  }
  if (text.startsWith('[cc-viewer:retry] ')) {
   const ownTurn = turnId;
   const timer = setInterval(() => {
    if (!existsSync(join(process.cwd(), 'release'))) return;
    clearInterval(timer);
    send({ method: 'item/completed', params: { threadId, turnId: ownTurn, item: { id: 'answer', type: 'agentMessage', text: 'GUI manual continuation succeeded' } } });
    send({ method: 'turn/completed', params: { threadId, turn: { id: ownTurn, status: 'completed' } } });
   }, 20); continue;
  }
  if (text.includes('agents') || text === 'next root') {
   if (text.includes('agents')) {
    send({ method: 'turn/started', params: { threadId: childId, turn: { id: 'child-turn', status: 'inProgress', startedAt: Math.floor(Date.now()/1000) } } });
    send({ method: 'item/started', params: { threadId: childId, turnId: 'child-turn', item: { id: 'child-tool', type: 'mcpToolCall', server: 'fixture', tool: 'read', status: 'inProgress' } } });
    const timer = setInterval(() => {
     if (!existsSync(join(process.cwd(), 'release'))) return;
     clearInterval(timer);
     send({ method: 'turn/completed', params: { threadId: childId, turn: { id: 'child-turn', status: 'completed' } } });
    }, 20);
   }
   send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer', type: 'agentMessage', text: 'Root completed; native child runs independently' } } });
   send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } }); continue;
  }
  const permission = p.input[0].text.includes('permission');
  if (text.includes('plan fixture')) {
   send({ method: 'turn/plan/updated', params: { threadId, turnId, plan: [
    { step: 'Inspect native plan', status: 'completed' }, { step: 'Keep plan read-only', status: 'completed' }] } });
   send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'plan-' + turnId,
    type: 'plan', text: 'GUI_NATIVE_PLAN: inspect native plan and keep it read-only' } } });
   send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer-' + turnId,
    type: 'agentMessage', text: 'GUI native plan completed without approval' } } });
   send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } }); continue;
  }
  if (text.includes('thinking fixture')) {
   send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'reasoning-' + turnId,
    type: 'reasoning', summary: ['GUI_NATIVE_THINK ' + text], content: [] } } });
   send({ method: 'item/completed', params: { threadId, turnId, item: { id: 'answer-' + turnId,
    type: 'agentMessage', text: 'GUI native reply: ' + text } } });
   send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed' } } }); continue;
  }
  send({ id: 7, method: permission ? 'item/commandExecution/requestApproval' : 'item/tool/requestUserInput',
   params: { threadId, turnId, itemId: 'ask-' + turnId, command: 'fixture command (no shell execution)', cwd: process.cwd(),
    questions: [{ id: 'choice', header: 'Fixture', question: 'Choose local fixture', options: [
     { label: 'A', description: 'Fixture A' }, { label: 'B', description: 'Fixture B' }] }] } }); continue;
 }
 if (f.method === 'turn/interrupt') {
  send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'interrupted' } } });
 }
 send({ id: f.id, result: {} });
}
`);
chmodSync(executable, 0o755);
const source = new URL('../../packages/app/', import.meta.url);
const server = await import(new URL('server.js', source));
const sdk = await import(new URL('lib/sdk-manager.js', source));
const { sdkToJSONLEntry } = await import(new URL('lib/sdk-adapter.js', source));
(await import(new URL('interceptor.js', source))).initForWorkspace(a);
const options = { codexPath: executable, ...(nativeAsks ? { transport: 'appserver' } : {}), onEntry: server.pushSdkEntry,
  onStreamingStatus: server.setSdkStreamingState, onStreamProgress: server.sendSdkStreamProgress,
  broadcastWs: server.broadcastWsMessage,
  onAgentLoopStart: server.broadcastAgentLoopStart, onAgentLoopEnd: server.broadcastAgentLoopEnd };
sdk.setSdkLaunchConfig(options);
const first = sdk.initSdkSession(a, 'same', { ...options,
  ...(process.argv.includes('--model-chip') ? { codexArgs: ['-m', 'fixture-A'] } : {}) }),
  second = sdk.launchSdkSession(b, 'same', process.argv.includes('--model-chip') ? ['-m', 'fixture-B'] : undefined);
const { registerWorkspace } = await import(new URL('workspace-registry.js', source));
registerWorkspace(a); registerWorkspace(b);
server.setWorkspaceLaunched(true);
if (process.argv.includes('--voice')) {
  const dir = join(root, 'logs', 'plugins'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'voice-observer.mjs'), `import { appendFileSync } from 'node:fs';
export default { name: 'isolated voice receipt', hooks: { serverStarted({ httpServer }) {
 httpServer.on('request', (req, res) => { if (!req.url.startsWith('/api/voice-pack/audio/')) return;
  res.on('finish', () => appendFileSync(${JSON.stringify(join(root, 'voice-http.jsonl'))}, JSON.stringify({ url: req.url, status: res.statusCode, range: req.headers.range, bytes: res.getHeader('content-length'), ts: Date.now() }) + '\\n'));
 });
} } };`);
}
await server.startViewer();
const base = `http://127.0.0.1:${server.getPort()}/`;
console.log(JSON.stringify({ root, pid: process.pid, source: fileURLToPath(source),
  a: { ...first, url: `${base}?instance=${first.instanceKey}` },
  b: { ...second, url: `${base}?instance=${second.instanceKey}` } }));
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  sdk.stopSession();
  slowServer?.closeAllConnections();
  if (slowServer) await new Promise(resolve => slowServer.close(resolve));
  await server.stopViewer();
  process.exit(0);
};
process.once('SIGTERM', close);
process.once('SIGINT', close);

const { createInterface } = await import('node:readline');
for await (const line of createInterface({ input: process.stdin })) {
 try {
  const cmd = JSON.parse(line);
  const view = cmd.workspace === 'b' ? second : first;
  if (cmd.action === 'merge-step') {
    const step = cmd.step === 1 ? 1 : 2;
    const message = (role, text) => ({ role, content: [{ type: 'text', text }] });
    const input = [message('user', 'MERGE_FIRST'), message('assistant', 'MERGE_PRIOR')];
    input.push(...(step === 1 ? [message('assistant', 'MERGE_ABORTED_PARTIAL')]
      : [message('user', 'MERGE_QUEUED_USER'), message('assistant', 'MERGE_QUEUED_REPLY')]));
    const entry = sdkToJSONLEntry({ message: { content: [] } }, input, 'fixture', 'same', {
      cwd: view.cwd, threadId: 'merge-fixture-' + (cmd.workspace === 'b' ? 'B' : 'A'),
      timestamp: `2026-11-21T00:00:0${step}.000Z`,
    });
    entry._instanceKey = view.instanceKey;
    server.pushSdkEntry(entry);
    console.log(JSON.stringify({ mergeStep: step, instanceKey: view.instanceKey }));
  }
  if (cmd.action === 'context-entry') {
    const variant = ['sdk', 'custom', 'http'].includes(cmd.variant) ? cmd.variant : 'sdk';
    const threadId = sdk.getSessionId(view) || 'context-fixture-' + (cmd.workspace === 'b' ? 'B' : 'A');
    const text = 'CONTEXT_FIXTURE_' + variant.toUpperCase();
    const entry = sdkToJSONLEntry({ message: { content: [{ type: 'text', text: text + ' reply' }] } },
      [{ role: 'user', content: [{ type: 'text', text }] }], 'fixture', 'same', {
        cwd: view.cwd, threadId,
        ...(variant === 'custom' ? { systemPrompt: 'GUI actual custom instructions' } : {}),
      });
    entry._instanceKey = view.instanceKey;
    if (variant === 'http') {
      delete entry._sdkSource;
      entry.url = base + 'fixture/responses';
      entry.body.metadata = { thread_id: threadId, cwd: view.cwd };
    }
    server.pushSdkEntry(entry);
    console.log(JSON.stringify({ contextVariant: variant, instanceKey: view.instanceKey }));
  }
  if (cmd.action === 'send') void sdk.sendUserMessage(cmd.text || 'hold tasks', view).catch(console.error);
  if (cmd.action === 'release') {
    writeFileSync(join(view.cwd, 'release'), 'go');
    slowResponses.get(cmd.workspace === 'b' ? 'B' : 'A')?.end('data: local fixture first byte\n\n');
  }
  if (cmd.action === 'interrupt') sdk.interruptTurn(view);
  if (cmd.action === 'tasks') console.log(JSON.stringify(sdk.getSdkTaskState(view)));
  if (cmd.action === 'replay-approvals') {
    const frames = sdk.getSdkPendingApprovals(view);
    for (const frame of frames) server.broadcastWsMessage(frame);
    console.log(JSON.stringify({ replayedApprovals: frames.map(frame => ({ id: frame.id, type: frame.type })) }));
  }
  if (cmd.action === 'resolve-questions') {
    const frames = sdk.getSdkPendingApprovals(view).filter(frame => frame.type === 'sdk-ask-pending');
    for (const frame of frames) {
      server.broadcastWsMessage(frame);
      const answers = Object.fromEntries(frame.questions.map(question => [question.id,
        { answers: [question.options?.[0]?.label || 'fixture answer'] }]));
      console.log(JSON.stringify({ resolvedQuestion: frame.id, resolved: sdk.resolveApproval(frame.id, answers, view) }));
    }
  }
  if (cmd.action === 'decline-permissions') {
    const frames = sdk.getSdkPendingApprovals(view).filter(frame => frame.type === 'perm-hook-pending');
    for (const frame of frames) {
      server.broadcastWsMessage(frame);
      console.log(JSON.stringify({ declinedPermission: frame.id, resolved: sdk.resolveApproval(frame.id, 'deny', view) }));
    }
  }
  if (cmd.action === 'error') server.broadcastWsMessage({ type: 'sdk-error', message: cmd.text || 'fixture failure',
    cwd: view.cwd, instanceKey: view.instanceKey, sessionId: sdk.getSessionId(view) });
  if (cmd.action === 'disconnect') {
    await server.stopViewer(); await server.startViewer();
  }
 } catch (error) { console.log(JSON.stringify({ error: error.message })); }
}
