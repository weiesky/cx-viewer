// Real installed Codex App Server/SDK against a local synthetic model endpoint.
// Isolated evaluation; --agents enables the user-authorized local child fixture.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, realpathSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createCodexAppServerClient } from '../../packages/app/lib/codex-appserver-client.js';
import { createSdkAppServerTransport } from '../../packages/app/lib/sdk-appserver-transport.js';
import { createSdkAppServerAgents } from '../../packages/app/lib/sdk-appserver-agents.js';
import { LogV2Writer } from '../../packages/app/lib/log-v2/writer.js';
import { ensureProjectIdForCwd } from '../../packages/app/lib/log-v2/project-id.js';
import { resolveIngestionSourceIdentity } from '../../packages/app/lib/log-v2/identity.js';
import { readSdkResumeHistory } from '../../packages/app/lib/sdk-resume-history.js';

const codexPath = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'codex';
const verifyActivity = process.argv.includes('--activity');
const verifyLostResult = process.argv.includes('--lost-result');
const verifyLifecycle = process.argv.includes('--agent-lifecycle');
const verifyAgents = process.argv.includes('--agents') || verifyLifecycle;
const verifyImages = process.argv.includes('--images');
const verifyMcpStatus = process.argv.includes('--mcp-status');
const useMcpFixture = verifyImages || verifyMcpStatus;
const verifyPublicCli = process.argv.includes('--public-cli');
const verifyErrors = process.argv.includes('--errors');
const useThreadConfig = process.argv.includes('--thread-config');
const version = execFileSync(codexPath, ['--version'], { encoding: 'utf8' }).trim();
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b4-appserver-compat-')));
const home = join(root, 'home'), codexHome = join(home, 'codex');
mkdirSync(codexHome, { recursive: true });
const mcpPath = join(root, 'image-mcp.mjs');
const fixtureImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
if (useMcpFixture) writeFileSync(mcpPath, `import { createInterface } from 'node:readline';
for await (const line of createInterface({ input: process.stdin })) {
 const f=JSON.parse(line); if(f.id===undefined)continue;
 const result=f.method==='initialize'?{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'0.0.0'}}
 :f.method==='tools/list'?{tools:[{name:'image',description:'Return a local synthetic image',inputSchema:{type:'object',properties:{}},
  annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}]}
 :f.method==='tools/call'?{content:[{type:'text',text:'MCP fixture image'},{type:'image',mimeType:'image/png',data:${JSON.stringify(fixtureImage)}}]}
 :{};
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:f.id,result})+'\\n');
}
`);
if (useMcpFixture) writeFileSync(join(codexHome, 'config.toml'),
  `[mcp_servers.fixture]\ncommand=${JSON.stringify(process.execPath)}\nargs=${JSON.stringify([mcpPath])}\n`);
const env = { ...process.env, HOME: home, CODEX_HOME: codexHome, OPENAI_API_KEY: 'fixture-only',
  HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9',
  NO_PROXY: 'localhost,127.0.0.1', CXV_TEST: '1', CXV_LOG_DIR: join(root, 'logs') };
for (const key of ['OPENAI_BASE_URL', 'CXV_ORIGINAL_BASE_URL', 'CXV_BYPASS_PERMISSIONS']) delete env[key];
Object.assign(process.env, env);
for (const key of ['OPENAI_BASE_URL', 'CXV_ORIGINAL_BASE_URL', 'CXV_BYPASS_PERMISSIONS']) delete process.env[key];
const schemaDir = join(root, 'schema');
execFileSync(codexPath, ['app-server', 'generate-json-schema', '--experimental', '--out', schemaDir], { env });
const planSchema = JSON.parse(readFileSync(join(schemaDir, 'v2/TurnPlanUpdatedNotification.json')));
const itemSchema = JSON.parse(readFileSync(join(schemaDir, 'v2/ItemStartedNotification.json')));
const collabSchema = itemSchema.definitions.ThreadItem.oneOf.find(item =>
  item.properties?.type?.enum?.includes('collabAgentToolCall'));
assert.ok(collabSchema?.properties.agentsStates);

const { prepareChatCompletionsRequest, adaptChatCompletionsResponse } = await import('../../packages/app/lib/codex-chat-adapter.js');
const { decodeProxyJsonBody } = await import('../../packages/app/lib/proxy-profile.js');
const requests = [], waiting = new Set(), heldRequests = new Map(), clients = [];
const server = createServer(async (req, res) => {
  try {
    if (!req.url.endsWith('/responses')) { res.writeHead(404); res.end(); return; }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = decodeProxyJsonBody(Buffer.concat(chunks), req.headers);
    writeFileSync(join(root, `model-request-${requests.length + 1}.json`), JSON.stringify(body, null, 2));
    const texts = (body.input || []).filter(item => item.role === 'user').flatMap(item =>
      typeof item.content === 'string' ? [item.content] : (item.content || []).map(part => part.text || ''));
    const prompt = texts.at(-1)?.startsWith('[cc-viewer:retry] ')
      ? 'B4 MANUAL CONTINUATION' : texts.findLast(text => text.startsWith('B4 ')) || '';
    requests.push({ prompt, tools: (body.tools || []).map(tool => tool.name || tool.type) });
    const childImageCallId = 'image-manager-child';
    const childImageComplete = (body.input || []).some(item => item.type === 'function_call_output' && item.call_id === childImageCallId);
    if (prompt.includes('HOLD') && (prompt !== 'B4 MANAGER CHILD HOLD' || !verifyImages || childImageComplete)) {
      await new Promise(resolve => { waiting.add(resolve); heldRequests.set(prompt, resolve);
        res.once('close', () => { waiting.delete(resolve); heldRequests.delete(prompt); resolve(); }); });
      if (res.destroyed) return;
    }
    if (verifyErrors && /RETRY (SUCCESS|EXHAUSTED)$/.test(prompt)
        && (prompt.endsWith('RETRY EXHAUSTED') || requests.filter(request => request.prompt === prompt).length === 1)) {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'B4 local retry fixture', type: 'server_error' } })); return;
    }
    if (prompt.includes('FAIL')) { res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'B4 local synthetic failure', type: 'invalid_request_error' } })); return; }
    const callId = `plan-${prompt.replace(/\W/g, '-')}`;
    const planned = (body.input || []).some(item => item.type === 'function_call_output' && item.call_id === callId);
    const spawnCallId = prompt.startsWith('B4 LIFECYCLE') || prompt.startsWith('B4 NESTED') ? `spawn-${prompt.replace(/\W/g, '-')}` : prompt === 'B4 AGENTS MANAGER' ? 'spawn-b4-manager' : 'spawn-b4-agent';
    const spawned = (body.input || []).some(item => item.type === 'function_call_output' && item.call_id === spawnCallId);
    const askCallId = `ask-${prompt.replace(/\W/g, '-')}`;
    const answered = (body.input || []).some(item => item.type === 'function_call_output' && item.call_id === askCallId);
    const imageCallId = prompt === 'B4 MANAGER CHILD HOLD' ? childImageCallId : 'image-b4-native';
    const imaged = (body.input || []).some(item => item.type === 'function_call_output' && item.call_id === imageCallId);
    const delta = (prompt === 'B4 IMAGE MANAGER' || (prompt === 'B4 MANAGER CHILD HOLD' && verifyImages)) && !imaged ? {
      tool_calls: [{ index: 0, id: imageCallId, type: 'function', function: { name: 'image', arguments: '{}' } }],
    } : prompt.includes('ASK MANAGER') && !answered ? {
      tool_calls: [{ index: 0, id: askCallId, type: 'function', function: { name: 'request_user_input',
        arguments: JSON.stringify({ questions: [{ id: 'choice', header: 'Fixture', question: 'Choose fixture',
          options: [{ label: 'A', description: 'Fixture A' }, { label: 'B', description: 'Fixture B' }] }] }) } }],
    } : ['B4 AGENTS ROOT', 'B4 AGENTS MANAGER', 'B4 LIFECYCLE ROOT', 'B4 NESTED ROOT', 'B4 NESTED CHILD'].includes(prompt) && !spawned ? {
      tool_calls: [{ index: 0, id: spawnCallId, type: 'function', function: { name: 'spawn_agent',
        arguments: JSON.stringify({ message: prompt === 'B4 LIFECYCLE ROOT' ? 'B4 LIFECYCLE CHILD HOLD' : prompt === 'B4 NESTED ROOT' ? 'B4 NESTED CHILD' : prompt === 'B4 NESTED CHILD' ? 'B4 NESTED GRANDCHILD HOLD' : prompt === 'B4 AGENTS MANAGER' ? 'B4 MANAGER CHILD HOLD' : 'B4 CHILD HOLD', agent_type: 'default' }) } }],
    } : prompt.includes('PLAN') && !planned ? {
      tool_calls: [{ index: 0, id: callId, type: 'function', function: { name: 'update_plan',
        arguments: JSON.stringify({ explanation: 'Local B4 plan fixture', plan: [
          { step: 'Read baseline', status: 'completed' }, { step: 'Verify protocol', status: 'in_progress' },
          { step: 'Record evidence', status: 'pending' },
        ] }) } }],
    } : { content: `LOCAL_REPLY ${prompt}` };
    const profile = { id: 'fixture', name: 'fixture', baseURL: 'http://fixture.invalid',
      apiKey: 'fixture-only', activeModel: 'gpt-5', effort: 'low', wireApi: 'chat-completions' };
    const prepared = prepareChatCompletionsRequest('http://fixture.invalid/v1/responses', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: body.model, stream: true, input: prompt,
        tools: (body.tools || []).filter(tool => tool.type === 'function' || tool.type === 'namespace') }),
    }, profile);
    if (delta.tool_calls) {
      const call = delta.tool_calls[0];
      const declared = [...prepared.context.toolMetadata].find(([, metadata]) => metadata.name === call.function.name);
      assert.ok(declared, 'real model request must declare the synthetic function');
      call.function.name = declared[0];
    }
    const source = 'data: ' + JSON.stringify({ id: callId, model: 'gpt-5', choices: [
      { index: 0, delta, finish_reason: delta.tool_calls ? 'tool_calls' : 'stop' },
    ] }) + '\n\ndata: ' + JSON.stringify({ choices: [], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } })
      + '\n\ndata: [DONE]\n\n';
    const adapted = await adaptChatCompletionsResponse(new Response(source, {
      headers: { 'content-type': 'text/event-stream' },
    }), prepared.context);
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    for await (const chunk of adapted.body) res.write(chunk);
    res.end();
  } catch (error) { console.error('local fixture:', error.message); res.writeHead(500); res.end(error.message); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const config = ['-c', 'model_provider="fixture"', '-c', 'model_providers.fixture.name="Local fixture"',
  '-c', `model_providers.fixture.base_url=${JSON.stringify(`http://127.0.0.1:${server.address().port}/v1`)}`,
  '-c', 'model_providers.fixture.wire_api="responses"', '-c', 'model_providers.fixture.requires_openai_auth=false',
  '-c', 'model_providers.fixture.request_max_retries=0', '-c', 'model_providers.fixture.stream_max_retries=0',
  '-c', 'features.shell_tool=false', '-c', 'features.unified_exec=false', '-c', `features.multi_agent=${verifyAgents}`,
  ...(verifyLifecycle ? ['-c', 'agents.max_depth=2'] : []), '-c', 'features.goals=false', '-c', 'tools.update_plan.enabled=true', '-c', 'web_search="disabled"'];

const waitFor = async (check, label) => {
  const deadline = Date.now() + 20000;
  while (!check()) { if (Date.now() > deadline) throw new Error(`${label} timeout`);
    await new Promise(resolve => setTimeout(resolve, 10)); }
  return check();
};
async function client(label, extraConfig = []) {
  const cwd = join(root, label, 'same'); mkdirSync(cwd, { recursive: true });
  const transport = createCodexAppServerClient({ codexPath, cwd, env, args: [...config, ...extraConfig], requestTimeoutMs: 20000 });
  const frames = []; transport.subscribe(frame => frames.push(frame));
  const c = { cwd, frames, rpc: transport.request, async stop() {
    await transport.stop();
    writeFileSync(join(root, `${label}-${transport.pid}-frames.json`), JSON.stringify(frames, null, 2));
  } };
  clients.push(c);
  await c.rpc('initialize', { clientInfo: { name: 'cxv_b4_fixture', version: '0.0.0' }, capabilities: { experimentalApi: true } });
  transport.notify('initialized', {});
  return c;
}
const fixtureConfig = { model_provider: 'fixture', model_providers: { fixture: {
  name: 'Local fixture', base_url: `http://127.0.0.1:${server.address().port}/v1`, wire_api: 'responses',
  requires_openai_auth: false, request_max_retries: 0, stream_max_retries: 0,
} }, features: { shell_tool: false, unified_exec: false, multi_agent: verifyAgents, goals: false },
  tools: { update_plan: { enabled: true } }, web_search: 'disabled' };
if (useMcpFixture) fixtureConfig.mcp_servers = { fixture: { command: process.execPath, args: [mcpPath] } };
if (verifyLifecycle) fixtureConfig.agents = { max_depth: 2 };
const threadConfig = useThreadConfig ? fixtureConfig : undefined;
const startThread = c => c.rpc('thread/start', { config: threadConfig, cwd: c.cwd, model: 'gpt-5', modelProvider: 'fixture',
  approvalPolicy: 'never', sandbox: 'read-only', ephemeral: false });
const turn = (c, threadId, text) => c.rpc('turn/start', { threadId, input: [{ type: 'text', text }] });
const finished = (c, id) => waitFor(() => c.frames.find(frame => frame.method === 'turn/completed'
  && frame.params.turn.id === id), 'turn/completed');
let sdk, normalizedTransport, publicCli, lifecycleTransport, lifecycleTracker, lostResultTransport;
let lifecycleEvidence = null, publicCliLoopEvidence = null, lostResultEvidence = null, activityEvidence = null, mcpStatusEvidence = null;
try {
  const a = await client('a'), b = await client('b');
  const ta = (await startThread(a)).thread, tb = (await startThread(b)).thread;
  assert.notEqual(ta.id, tb.id);
  const held = (await turn(b, tb.id, 'B4 HOLD B')).turn;
  await waitFor(() => requests.some(request => request.prompt === 'B4 HOLD B'), 'held B upstream');
  const planned = (await turn(a, ta.id, 'B4 PLAN A')).turn;
  assert.equal((await finished(a, planned.id)).params.turn.status, 'completed');
  const planFrame = a.frames.find(frame => frame.method === 'turn/plan/updated');
  assert.deepEqual(planFrame?.params.plan.map(step => step.status), ['completed', 'inProgress', 'pending']);
  assert.equal(planFrame.params.threadId, ta.id); assert.equal(planFrame.params.turnId, planned.id);
  assert.ok(a.frames.some(frame => frame.method === 'item/agentMessage/delta'));
  await b.rpc('turn/interrupt', { threadId: tb.id, turnId: held.id });
  assert.equal((await finished(b, held.id)).params.turn.status, 'interrupted');
  const failed = (await turn(b, tb.id, 'B4 FAIL B')).turn;
  assert.equal((await finished(b, failed.id)).params.turn.status, 'failed');
  assert.ok(b.frames.some(frame => frame.method === 'error'));
  const errorEvidence = [];
  if (verifyErrors) {
    const errorClient = await client('errors', ['-c', 'model_providers.fixture.stream_max_retries=1']);
    const errorThread = (await startThread(errorClient)).thread;
    for (const prompt of ['B4 RETRY SUCCESS', 'B4 RETRY EXHAUSTED']) {
      const errorTurn = (await turn(errorClient, errorThread.id, prompt)).turn;
      const terminal = await finished(errorClient, errorTurn.id);
      const notices = errorClient.frames.filter(frame => frame.method === 'error' && frame.params.turnId === errorTurn.id);
      errorEvidence.push({ prompt, turnId: errorTurn.id, status: terminal.params.turn.status,
        error: terminal.params.turn.error, notices: notices.map(frame => frame.params),
        requests: requests.filter(request => request.prompt === prompt).length });
    }
    writeFileSync(join(root, 'error-evidence.json'), JSON.stringify(errorEvidence, null, 2));
  }
  await a.stop();
  const restarted = await client('a');
  const resumed = await restarted.rpc('thread/resume', { config: threadConfig, threadId: ta.id, cwd: restarted.cwd, approvalPolicy: 'never', sandbox: 'read-only' });
  assert.equal(resumed.thread.id, ta.id);
  const continued = (await turn(restarted, ta.id, 'B4 RESUME A')).turn;
  assert.equal((await finished(restarted, continued.id)).params.turn.status, 'completed');

  let agents = null;
  if (verifyAgents) {
    const rootTurn = (await turn(restarted, ta.id, 'B4 AGENTS ROOT')).turn;
    assert.equal((await finished(restarted, rootTurn.id)).params.turn.status, 'completed');
    const spawned = restarted.frames.find(frame => frame.method === 'item/completed'
      && frame.params.item.type === 'collabAgentToolCall' && frame.params.item.tool === 'spawnAgent');
    const childId = spawned?.params.item.receiverThreadIds[0];
    assert.ok(childId, 'real spawn event must identify the receiving thread');
    await waitFor(() => heldRequests.has('B4 CHILD HOLD'), 'child local model request');
    const beforeSubscribe = restarted.frames.filter(frame => frame.params?.threadId === childId).length;
    const attached = await restarted.rpc('thread/read', { threadId: childId, includeTurns: false });
    assert.equal(attached.thread.id, childId);
    heldRequests.get('B4 CHILD HOLD')();
    const terminal = await waitFor(() => restarted.frames.find(frame => frame.method === 'turn/completed'
      && frame.params.threadId === childId), 'child terminal after parent completed');
    assert.equal(terminal.params.turn.status, 'completed');
    agents = { childThreadId: childId, rootTurnAlreadyCompleted: true, rawFramesBeforeSubscribe: beforeSubscribe,
      identityRead: 'thread/read', childTerminal: terminal.params.turn.status,
      spawnStatus: spawned.params.item.agentsStates, source: attached.thread.source };
  }

  const transportCwd = join(root, 'transport', 'same'); mkdirSync(transportCwd, { recursive: true });
  const transportOptions = { cwd: transportCwd, instanceKey: 'transport-fixture', codexPath,
    codexOptions: { config: fixtureConfig }, threadOptions: { model: 'gpt-5', approvalPolicy: 'never', sandboxMode: 'read-only' } };
  normalizedTransport = createSdkAppServerTransport(transportOptions);
  const collect = async stream => { const events = []; for await (const event of stream.events) events.push(event); return events; };
  const nativeEvents = await collect(await normalizedTransport.runStreamed('B4 PLAN TRANSPORT'));
  assert.equal(nativeEvents.at(-1).type, 'turn.completed');
  assert.deepEqual(nativeEvents.find(e => e.item?._appServerPlan).item.items.map(step => step.status), ['completed', 'in_progress', 'pending']);
  assert.ok(nativeEvents.some(e => e.item?.type === 'agent_message' && e.item.text.includes('LOCAL_REPLY')));
  let normalizedFailure = null;
  if (verifyErrors) {
    const failureEvents = await collect(await normalizedTransport.runStreamed('B4 FAIL TRANSPORT'));
    normalizedFailure = failureEvents.at(-1);
    assert.equal(normalizedFailure.type, 'turn.failed'); assert.equal(normalizedFailure.status, 'failed');
    assert.equal(normalizedFailure.error.codexErrorInfo, 'other');
    const start = failureEvents.find(event => event.type === 'turn.started');
    assert.equal(normalizedFailure.turn_id, start.turn_id); assert.equal(normalizedFailure.thread_id, normalizedTransport.threadId);
    const notice = failureEvents.find(event => event.type === 'error');
    assert.equal(notice.willRetry, false); assert.equal(notice.error.codexErrorInfo, 'other');
  }
  const normalizedThreadId = normalizedTransport.threadId;
  const controller = new AbortController();
  const heldNative = collect(await normalizedTransport.runStreamed('B4 HOLD TRANSPORT', { signal: controller.signal }));
  await waitFor(() => heldRequests.has('B4 HOLD TRANSPORT'), 'normalized held upstream');
  controller.abort(); const cancelledEvents = await heldNative;
  assert.equal(cancelledEvents.at(-1).type, 'turn.failed');
  assert.equal(cancelledEvents.at(-1).error.message, 'Turn interrupted');
  assert.equal((await collect(await normalizedTransport.runStreamed('B4 CONTINUE TRANSPORT'))).at(-1).type, 'turn.completed');
  await normalizedTransport.stop();
  normalizedTransport = createSdkAppServerTransport(transportOptions);
  assert.equal((await collect(await normalizedTransport.runStreamed('B4 RESUME TRANSPORT', { threadId: normalizedThreadId }))).at(-1).type, 'turn.completed');
  assert.equal(normalizedTransport.threadId, normalizedThreadId);

  sdk = await import('../../packages/app/lib/sdk-manager.js');
  const tasks = [], execEntries = [];
  const view = sdk.initSdkSession(join(root, 'sdk'), 'same', { codexPath,
    codexArgs: [...config, '-m', 'gpt-5'], onEntry: entry => execEntries.push(entry),
    broadcastWs: frame => { if (frame.type === 'sdk-task-snapshot') tasks.push(frame); } });
  mkdirSync(view.cwd, { recursive: true });
  await sdk.sendUserMessage('B4 PLAN SDK', view);
  writeFileSync(join(root, 'exec-manager-entries.json'), JSON.stringify(execEntries, null, 2));
  const snapshot = tasks.find(frame => frame.tasks.length === 3);
  assert.deepEqual(snapshot?.tasks.map(task => task.status), ['completed', 'pending', 'pending']);
  const managerCwd = join(root, 'native-manager', 'same'); mkdirSync(managerCwd, { recursive: true });
  const managerEntries = [], managerTasks = [], managerFailures = [], managerRetryStates = [], managerLoops = [];
  const nativeView = sdk.initSdkSession(managerCwd, 'same', { transport: 'appserver', codexPath,
    codexArgs: [...config, ...(verifyErrors ? ['-c', 'model_providers.fixture.stream_max_retries=1'] : []),
      '-m', 'gpt-5', '-a', 'never', '-s', 'read-only'],
    onAgentLoopStart: data => managerLoops.push({ phase: 'start', ...data }),
    onAgentLoopEnd: data => managerLoops.push({ phase: 'end', ...data }),
    onEntry: entry => managerEntries.push(entry), broadcastWs: frame => {
      if (frame.type === 'sdk-task-snapshot') managerTasks.push(frame);
      if (frame.type === 'sdk-error') managerFailures.push(frame);
      if (frame.type === 'sdk-retry-state') managerRetryStates.push(frame);
    } });
  if (verifyMcpStatus) assert.equal((await sdk.fetchMcpStatus(nativeView)).reason, 'session-inactive');
  await sdk.sendUserMessage('B4 PLAN MANAGER', nativeView);
  if (verifyMcpStatus) {
    const modelRequestsBefore = requests.length;
    const result = await sdk.fetchMcpStatus(nativeView);
    assert.equal(result.ok, true);
    const status = result.snapshot.servers.find(server => server.name === 'fixture');
    assert.equal(status?.status, 'connected');
    assert.equal(status.runtimeStatus, 'connected');
    assert.equal(status.serverInfo.version, '0.0.0');
    assert.equal(status.tools.length, 1);
    assert.equal(requests.length, modelRequestsBefore);
    assert.equal((await sdk.fetchMcpStatus(view)).reason, 'unsupported');
    mcpStatusEvidence = { actualCodex: true, actualTransportAndManager: true, inactiveDoesNotStart: true,
      activeThread: sdk.getSessionId(nativeView), snapshot: result.snapshot, noAdditionalModelRequests: true, execUnsupported: true };
    writeFileSync(join(root, 'mcp-status-evidence.json'), JSON.stringify(mcpStatusEvidence, null, 2));
  }
  assert.equal(nativeView.transport, 'appserver');
  assert.ok(managerTasks.some(frame => frame.tasks.map(task => task.status).join(',') === 'completed,in_progress,pending'));
  const main = managerEntries.find(entry => entry.mainAgent && entry.response?.status === 200);
  assert.equal(main.body.metadata.sdk, 'openai-codex-sdk');
  assert.equal(main.body.metadata.transport, 'appserver');
  assert.equal(main.body.metadata.cwd, managerCwd);
  assert.ok(main.response.body.content.some(block => block.type === 'text' && block.text.includes('LOCAL_REPLY')));
  if (verifyErrors) {
    await sdk.sendUserMessage('B4 MANAGER RETRY EXHAUSTED', nativeView);
    assert.equal(managerFailures.length, 1); assert.equal(managerFailures[0].retryable, true);
    assert.equal(managerFailures[0].apiStatus, 503); assert.equal(managerFailures[0].instanceKey, nativeView.instanceKey);
    assert.equal(managerFailures[0].sessionId, sdk.getSessionId(nativeView)); assert.ok(managerFailures[0].turnId);
    assert.deepEqual(managerEntries.at(-1).response.body.error.codexErrorInfo, managerFailures[0].codexErrorInfo);
    const failedTurn = managerFailures[0].turnId, failedThread = sdk.getSessionId(nativeView);
    assert.deepEqual(sdk.retryInterruptedTurn(failedTurn, view), { ok: false, reason: 'unavailable' });
    assert.deepEqual(sdk.retryInterruptedTurn(failedTurn, nativeView), { ok: true });
    assert.deepEqual(sdk.retryInterruptedTurn(failedTurn, nativeView), { ok: false, reason: 'busy' });
    await waitFor(() => !sdk.getSdkStreamingState(nativeView).active, 'manual continuation settled');
    assert.equal(sdk.getSessionId(nativeView), failedThread);
    assert.deepEqual(managerRetryStates.filter(frame => frame.retryOf === failedTurn).map(frame => frame.phase), ['recovering', 'recovered']);
    assert.ok(managerRetryStates.some(frame => frame.phase === 'retrying' && typeof frame.error === 'string' && frame.error.includes('Reconnecting')));
    const continuation = managerEntries.filter(entry => entry.mainAgent).at(-1).body.input.at(-1);
    assert.equal(continuation._sdkRetryOf, failedTurn); assert.ok(continuation.content.startsWith('[cc-viewer:retry] '));
    assert.equal(requests.filter(request => request.prompt === 'B4 MANUAL CONTINUATION').length, 1);
    await sdk.sendUserMessage('B4 MANAGER RETRY SUCCESS', nativeView);
    assert.equal(managerFailures.length, 1, 'a real retry followed by success cannot alert as failure');
    assert.equal(sdk.getSdkStreamingState(nativeView).active, false);
    await sdk.sendUserMessage('B4 FAIL MANAGER', nativeView);
    assert.equal(managerFailures.length, 2); assert.equal(managerFailures[1].retryable, false);
    assert.notEqual(managerFailures[0].turnId, managerFailures[1].turnId);
  }
  const managerThread = sdk.getSessionId(nativeView);
  const runningManager = sdk.sendUserMessage('B4 HOLD MANAGER', nativeView);
  await waitFor(() => heldRequests.has('B4 HOLD MANAGER'), 'manager held request');
  const queued = await sdk.sendUserMessage('B4 QUEUED MANAGER', nativeView);
  assert.equal(queued.queued, true);
  assert.equal(sdk.getSdkQueueState(view).items.length, 0, 'native queue cannot affect exec workspace');
  assert.throws(() => sdk.initSdkSession(managerCwd, 'same', { codexPath }), { code: 'SDK_TRANSPORT_BUSY' });
  sdk.interruptTurn(nativeView); await runningManager;
  assert.equal(sdk.getSdkQueueState(nativeView).paused, true);
  await sdk.sendSdkQueuedNow(queued.id, nativeView);
  assert.equal(sdk.getSessionId(nativeView), managerThread);
  assert.ok(managerEntries.some(entry => JSON.stringify(entry.response).includes('LOCAL_REPLY B4 QUEUED MANAGER')));
  const archiveHistory = async (selected, entries) => {
    const logDir = join(root, 'archive-compat');
    const projectId = ensureProjectIdForCwd(logDir, selected.cwd);
    const threadId = sdk.getSessionId(selected);
    const writer = LogV2Writer.open({ rootDir: logDir, canonicalCwd: selected.cwd, projectId,
      sessionId: threadId, rootThreadId: threadId, source: 'sdk' });
    for (const entry of entries) writer.append(entry, resolveIngestionSourceIdentity(entry,
      { source: 'sdk', threadId, sessionId: threadId }));
    return readSdkResumeHistory(logDir, relative(logDir, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/'),
      { cwd: selected.cwd, projectId });
  };
  const execHistory = await archiveHistory(view, execEntries);
  const execId = execHistory.threadId;
  const nativeFromExec = sdk.initSdkSession(view.cwd, 'same', { transport: 'appserver', codexPath,
    codexArgs: [...config, ...(verifyImages ? ['-c', `mcp_servers.fixture.args=${JSON.stringify([mcpPath])}`] : []),
      '--disable', 'goals', '-c', 'features.default_mode_request_user_input=true', '-m', 'gpt-5', '-a', 'never', '-s', 'read-only'],
    onEntry: entry => execEntries.push(entry) });
  await sdk.resumeSdkSession(nativeFromExec, async () => execHistory);
  await sdk.sendUserMessage('B4 NATIVE RESTORE EXEC', nativeFromExec);
  assert.equal(sdk.getSessionId(nativeFromExec), execId);
  assert.equal(execEntries.at(-1).body.metadata.transport, 'appserver');
  assert.ok(execEntries.at(-1).body.input.some(message => message.role === 'user' && message.content === 'B4 PLAN SDK'));
  for (const cancelled of [false, true]) {
    const asking = sdk.sendUserMessage(`B4 ASK MANAGER ${cancelled ? 'CANCEL' : 'ANSWER'}`, nativeFromExec);
    const ask = await waitFor(() => sdk.getSdkPendingApprovals(nativeFromExec)[0], 'native request_user_input');
    assert.equal(ask.type, 'sdk-ask-pending'); assert.ok(ask.itemId);
    assert.equal(sdk.resolveApproval(ask.id, { choice: { answers: ['B'] } }, nativeView), false);
    assert.equal(sdk.resolveApproval(ask.id, cancelled ? {} : { choice: { answers: ['B'] } }, nativeFromExec), true);
    await asking;
    assert.equal(sdk.getSdkPendingApprovals(nativeFromExec).length, 0);
    const transcript = execEntries.at(-1).body.input;
    const use = transcript.flatMap(m => Array.isArray(m.content) ? m.content : []).find(b => b.type === 'tool_use' && b.input?.cxvSdkAskId === ask.id);
    assert.equal(use?.id, ask.itemId);
    const result = transcript.flatMap(m => Array.isArray(m.content) ? m.content : []).find(b => b.type === 'tool_result' && b.tool_use_id === use.id);
    assert.deepEqual(JSON.parse(result.content), { answers: cancelled ? {} : { choice: { answers: ['B'] } } });
  }
  if (verifyImages) {
    await sdk.sendUserMessage('B4 IMAGE MANAGER', nativeFromExec);
    writeFileSync(join(root, 'image-manager-entries.json'), JSON.stringify(execEntries, null, 2));
    const entry = execEntries.at(-1);
    const result = entry.body.input.flatMap(m => Array.isArray(m.content) ? m.content : [])
      .find(block => block.type === 'tool_result' && Array.isArray(block.content)
        && block.content.some(part => part.source?.data === fixtureImage));
    assert.ok(result, 'real MCP image must remain structured in the canonical transcript');
    assert.ok(execEntries.some(e => e.method === 'TOOL' && e.response.body.output?.content?.some(p => p.data === fixtureImage)),
      'raw MCP output must remain intact');
  }
  let managerAgents = null;
  if (verifyAgents) {
    await sdk.sendUserMessage('B4 AGENTS MANAGER', nativeFromExec);
    await waitFor(() => heldRequests.has('B4 MANAGER CHILD HOLD'), 'manager child held after root completed');
    const state = await waitFor(() => sdk.getSdkAgentState(nativeFromExec).agents[0]?.status === 'in_progress'
      && sdk.getSdkAgentState(nativeFromExec), 'authoritative child snapshot');
    assert.equal(sdk.getSdkStreamingState(nativeFromExec).active, false);
    assert.equal(sdk.getSdkAgentState(nativeView).agents.length, 0);
    const child = state.agents[0]; assert.ok(child.name); assert.ok(child.createdAt > 0);
    assert.equal(child.lastToolName, verifyImages ? 'fixture.image' : null);
    const replay = sdk.getSdkAgentState(nativeFromExec);
    assert.equal(replay.agents[0].createdAt, child.createdAt);
    await sdk.sendUserMessage('B4 MANAGER ROOT NEXT', nativeFromExec);
    assert.equal(sdk.getSdkAgentState(nativeFromExec).agents[0].threadId, child.threadId);
    heldRequests.get('B4 MANAGER CHILD HOLD')();
    await waitFor(() => sdk.getSdkAgentState(nativeFromExec).agents.length === 0, 'child independently terminal');
    managerAgents = { rootAlreadyIdle: true, nativeName: child.name, nativeStartedAt: child.createdAt,
      lastActualTool: child.lastToolName,
      threadId: child.threadId, snapshotTimestampStable: true, nextRootTurnPreservesChild: true, independentChildTerminal: true };
  }
  if (verifyLifecycle) {
    const cwd = join(root, 'lifecycle', 'same'); mkdirSync(cwd, { recursive: true });
    const lifecycleFrames = [], lifecycleSnapshots = []; let lifecycleClient;
    lifecycleTransport = createSdkAppServerTransport({ cwd, instanceKey: 'lifecycle-owned', codexPath,
      codexOptions: { config: fixtureConfig }, threadOptions: { model: 'gpt-5', approvalPolicy: 'never', sandboxMode: 'read-only' },
      clientFactory: options => {
        lifecycleClient = createCodexAppServerClient(options);
        lifecycleClient.subscribe(frame => lifecycleFrames.push(frame)); return lifecycleClient;
      },
      onSessionReady: thread => { lifecycleTracker = createSdkAppServerAgents({ rootThreadId: thread.id,
        scope: { cwd, instanceKey: 'lifecycle-owned' }, ownsThread: id => lifecycleTransport.ownsThread(id),
        readThread: id => lifecycleTransport.readThread(id), broadcast: frame => lifecycleSnapshots.push(frame) }); },
      onNotification: frame => lifecycleTracker?.handle(frame),
    });
    const rootEvents = await collect(await lifecycleTransport.runStreamed('B4 LIFECYCLE ROOT'));
    assert.equal(rootEvents.at(-1).type, 'turn.completed');
    await waitFor(() => heldRequests.has('B4 LIFECYCLE CHILD HOLD'), 'owned child held');
    const child = await waitFor(() => lifecycleTracker.snapshot().agents.find(agent => agent.status === 'in_progress'), 'owned child active');
    const probeAt = Date.now();
    const control = await lifecycleClient.request('thread/read', { threadId: child.threadId, includeTurns: false });
    assert.equal(control.thread.id, child.threadId);
    const controlRoundTripMs = Date.now() - probeAt;
    await lifecycleClient.request('turn/interrupt', { threadId: child.threadId, turnId: child.turnId });
    const interrupted = await waitFor(() => lifecycleFrames.find(frame => frame.method === 'turn/completed'
      && frame.params.threadId === child.threadId && frame.params.turn.id === child.turnId), 'own interrupted terminal');
    assert.equal(interrupted.params.turn.status, 'interrupted');
    await waitFor(() => lifecycleTracker.snapshot().agents.length === 0, 'interrupted child hidden');
    const reused = (await lifecycleClient.request('turn/start', { threadId: child.threadId,
      input: [{ type: 'text', text: 'B4 LIFECYCLE CHILD REUSE HOLD' }] })).turn;
    await waitFor(() => heldRequests.has('B4 LIFECYCLE CHILD REUSE HOLD'), 'same child reused');
    const activeReuse = await waitFor(() => lifecycleTracker.snapshot().agents.find(agent => agent.turnId === reused.id), 'new child turn observed');
    assert.equal(activeReuse.threadId, child.threadId); assert.notEqual(activeReuse.turnId, child.turnId);
    await lifecycleTracker.handle(interrupted); // captured old terminal cannot settle the new turn
    assert.equal(lifecycleTracker.snapshot().agents[0].turnId, reused.id);
    heldRequests.get('B4 LIFECYCLE CHILD REUSE HOLD')();
    await waitFor(() => lifecycleTracker.snapshot().agents.length === 0, 'reused child own completion');
    const nestedRoot = await collect(await lifecycleTransport.runStreamed('B4 NESTED ROOT'));
    assert.equal(nestedRoot.at(-1).type, 'turn.completed');
    await waitFor(() => heldRequests.has('B4 NESTED GRANDCHILD HOLD'), 'real nested grandchild held');
    const grandchild = await waitFor(() => lifecycleTracker.snapshot().agents.find(agent => agent.status === 'in_progress'
      && agent.threadId !== child.threadId), 'proved grandchild active');
    const grandThread = await lifecycleTransport.readThread(grandchild.threadId);
    const parentId = grandThread.source?.subAgent?.thread_spawn?.parent_thread_id;
    assert.ok(parentId && parentId !== lifecycleTransport.threadId && parentId !== child.threadId);
    assert.equal(await lifecycleTransport.ownsThread(parentId), true);
    assert.equal(await lifecycleTransport.ownsThread('unrelated-fixture-thread'), false);
    heldRequests.get('B4 NESTED GRANDCHILD HOLD')();
    await waitFor(() => lifecycleTracker.snapshot().agents.length === 0, 'grandchild own terminal');
    lifecycleEvidence = { actualTransport: true, actualAgentTracker: true, actualRecursiveOwnership: true,
      childThreadId: child.threadId, interruptedTurnId: child.turnId, nativeInterruptedStatus: interrupted.params.turn.status,
      reusedTurnId: reused.id, sameChildReused: true, capturedOldTerminalIgnored: true,
      grandchildThreadId: grandchild.threadId, nestedParentId: parentId,
      rootThreadId: lifecycleTransport.threadId, independentNestedTerminal: true, controlRoundTripMs,
      snapshotCount: lifecycleSnapshots.length, isolatedMaxDepth: 2, externalModelNetwork: false };
    writeFileSync(join(root, 'agent-lifecycle-frames.json'), JSON.stringify(lifecycleFrames, null, 2));
    writeFileSync(join(root, 'agent-lifecycle-snapshots.json'), JSON.stringify(lifecycleSnapshots, null, 2));
    lifecycleTracker.close(); await lifecycleTransport.stop();
  }
  if (verifyLostResult) {
    const cwd = join(root, 'lost-result', 'same'); mkdirSync(cwd, { recursive: true });
    const frames = [], calls = [], recovered = []; let dropped = 0;
    lostResultTransport = createSdkAppServerTransport({ cwd, instanceKey: 'lost-owned', codexPath,
      codexOptions: { config: fixtureConfig }, threadOptions: { model: 'gpt-5', approvalPolicy: 'never', sandboxMode: 'read-only' },
      clientFactory: options => {
        const native = createCodexAppServerClient(options);
        return { ...native,
          request(method, params, options) { calls.push({ method, params }); return native.request(method, params, options); },
          subscribe(callback) { return native.subscribe(frame => {
            frames.push(structuredClone(frame));
            if (frame.method === 'turn/completed' && frame.params.threadId === lostResultTransport.threadId) { dropped++; return; }
            callback(frame);
          }); },
        };
      },
    });
    for (const label of ['FIRST', 'NEXT']) {
      const started = Date.now(), controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('lost-result recovery deadline')), 20000);
      try {
        const stream = await lostResultTransport.runStreamed(`B4 LOST RESULT ${label}`, { signal: controller.signal });
        const events = []; for await (const event of stream.events) events.push(event);
        assert.equal(events.at(-1).type, 'turn.completed');
        assert.ok(Date.now() - started >= 4900, 'production five-second grace must run');
        const actual = frames.findLast(frame => frame.method === 'turn/completed');
        assert.equal(events.at(-1).turn_id, actual.params.turn.id);
        assert.ok(events.some(event => event.item?.type === 'agent_message' && event.item.text));
        recovered.push({ turnId: actual.params.turn.id, status: actual.params.turn.status,
          elapsedMs: Date.now() - started, terminalEvent: events.at(-1), events: events.length });
      } finally { clearTimeout(timer); }
    }
    assert.equal(dropped, 2); assert.notEqual(recovered[0].turnId, recovered[1].turnId);
    const reads = calls.filter(call => call.method === 'thread/turns/list'); assert.equal(reads.length, 2);
    assert.ok(reads.every(call => call.params.limit === 1 && call.params.itemsView === 'full'));
    assert.equal(requests.filter(request => request.prompt === 'B4 LOST RESULT FIRST').length, 1);
    assert.equal(requests.filter(request => request.prompt === 'B4 LOST RESULT NEXT').length, 1);
    lostResultEvidence = { actualTransport: true, actualCodex: true, droppedTerminalNotifications: dropped,
      productionGraceMs: 5000, nativeIdleObserved: frames.some(frame => frame.method === 'thread/status/changed'
        && frame.params.status.type === 'idle'), sameNativeThread: lostResultTransport.threadId,
      boundedReads: reads, recovered, noInputReplay: true, noExternalModelNetwork: true };
    writeFileSync(join(root, 'lost-result-frames.json'), JSON.stringify(frames, null, 2));
    await lostResultTransport.stop();
  }
  if (verifyActivity) {
    const cwd = join(root, 'activity', 'same'); mkdirSync(cwd, { recursive: true });
    const pidFile = join(root, 'activity-pids.txt'), wrapper = join(root, 'record-codex');
    const executable = codexPath.includes('/') ? codexPath : execFileSync('/usr/bin/which', [codexPath], { encoding: 'utf8' }).trim();
    const quote = text => "'" + text.replaceAll("'", "'\\''") + "'";
    writeFileSync(wrapper, '#!/bin/sh\nprintf \'%s\\n\' $$ >> ' + quote(pidFile) + '\nexec ' + quote(executable) + ' "$@"\n');
    chmodSync(wrapper, 0o755);
    const timers = new Map(), frames = [], entries = [], loops = [];
    const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
    globalThis.setTimeout = (fn, ms, ...args) => {
      const timer = originalSet(fn, ms, ...args);
      if (ms === 600000 || ms === 180000) timers.set(timer, { fn: () => fn(...args), ms });
      return timer;
    };
    globalThis.clearTimeout = timer => { timers.delete(timer); originalClear(timer); };
    let view, pausedPid = null;
    const restoreClock = () => { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; };
    const fireProbe = async ms => {
      const next = [...timers].find(([, timer]) => timer.ms === ms);
      assert.ok(next, `production ${ms} activity timer must be armed`);
      timers.delete(next[0]); originalClear(next[0]); const start = Date.now(); await next[1].fn(); return Date.now() - start;
    };
    try {
      view = sdk.initSdkSession(cwd, 'same', { transport: 'appserver', codexPath: wrapper,
        codexArgs: [...config, '-m', 'gpt-5', '-a', 'never', '-s', 'read-only'],
        onEntry: entry => entries.push(entry), broadcastWs: frame => frames.push(frame),
        onAgentLoopStart: frame => loops.push({ phase: 'start', ...frame }),
        onAgentLoopEnd: frame => loops.push({ phase: 'end', ...frame }),
      });
      const pending = sdk.sendUserMessage('B4 ACTIVITY HOLD', view);
      await waitFor(() => heldRequests.has('B4 ACTIVITY HOLD'), 'activity local model held'); restoreClock();
      const threadId = sdk.getSessionId(view);
      const healthyMs = await fireProbe(600000);
      assert.equal(sdk.getSdkStreamingState(view).active, true);
      assert.equal(frames.some(frame => frame.type === 'sdk-error'), false);
      const pid = Number(readFileSync(pidFile, 'utf8').trim().split('\n').at(-1));
      assert.ok(Number.isSafeInteger(pid) && pid > 1);
      const command = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' });
      assert.ok(command.includes('codex') && command.includes('app-server'), 'only the task-owned real App Server is paused');
      process.kill(pid, 'SIGSTOP'); pausedPid = pid;
      const firstTimeoutMs = await fireProbe(600000);
      assert.equal(sdk.getSdkStreamingState(view).active, true, 'one unanswered probe cannot settle a turn');
      const secondTimeoutMs = await fireProbe(180000); await pending;
      assert.equal(sdk.getSdkStreamingState(view).active, false);
      const failed = frames.findLast(frame => frame.type === 'sdk-error');
      assert.equal(failed.code, 'turn-stuck'); assert.equal(failed.retryable, true); assert.ok(failed.turnId);
      assert.equal(loops.filter(frame => frame.phase === 'end' && frame.reason === 'turn-stuck').length, 1);
      process.kill(pid, 0); assert.ok(heldRequests.has('B4 ACTIVITY HOLD'), 'conviction must not kill or replay the child');
      assert.equal(requests.filter(request => request.prompt === 'B4 ACTIVITY HOLD').length, 1);
      process.kill(pid, 'SIGCONT'); pausedPid = null;
      assert.deepEqual(sdk.retryInterruptedTurn(failed.turnId, view), { ok: true });
      assert.deepEqual(sdk.retryInterruptedTurn(failed.turnId, view), { ok: false, reason: 'busy' });
      await waitFor(() => frames.some(frame => frame.type === 'sdk-retry-state' && frame.phase === 'recovered'), 'manual continue after suspect generation');
      await waitFor(() => sdk.getSdkSessionInfo(view).busy === false, 'continued turn idle');
      assert.equal(sdk.getSessionId(view), threadId);
      const pids = readFileSync(pidFile, 'utf8').trim().split('\n').map(Number);
      assert.equal(pids.length, 2); assert.notEqual(pids[0], pids[1]);
      assert.equal(requests.filter(request => request.prompt === 'B4 ACTIVITY HOLD').length, 1);
      assert.equal(requests.filter(request => request.prompt === 'B4 MANUAL CONTINUATION').length, 1);
      activityEvidence = { actualManager: true, actualNativeControlRpc: true, productionIdleMs: 600000,
        productionReprobeMs: 180000, productionTimeoutMs: 10000, acceleratedClockOnlyForLongIdle: true,
        healthyRoundTripMs: healthyMs, realStoppedChildTimeoutMs: [firstTimeoutMs, secondTimeoutMs],
        ownedPid: pid, nativeCommandVerified: true, noKillAtConviction: true, noAutomaticInputReplay: true,
        explicitContinueRebuiltPid: pids[1], sameThreadId: threadId, duplicateContinueRejected: true, loops, failure: failed };
      writeFileSync(join(root, 'activity-manager-frames.json'), JSON.stringify(frames, null, 2));
      writeFileSync(join(root, 'activity-manager-entries.json'), JSON.stringify(entries, null, 2));
    } finally {
      restoreClock(); if (pausedPid) try { process.kill(pausedPid, 'SIGCONT'); } catch {}
      if (view) sdk.closeSdkSession(view);
    }
  }
  const nativeHistory = await archiveHistory(nativeView, managerEntries);
  const execFromNative = sdk.initSdkSession(nativeView.cwd, 'same', { transport: 'exec', codexPath,
    codexArgs: [...config, '-m', 'gpt-5'], onEntry: entry => managerEntries.push(entry) });
  await sdk.resumeSdkSession(execFromNative, async () => nativeHistory);
  await sdk.sendUserMessage('B4 EXEC RESTORE NATIVE', execFromNative);
  assert.equal(sdk.getSessionId(execFromNative), managerThread);
  assert.ok(JSON.stringify(managerEntries.at(-1).response).includes('LOCAL_REPLY B4 EXEC RESTORE NATIVE'));
  if (verifyPublicCli) {
    const bin = join(root, 'cli-bin'), cwd = join(root, 'public-cli'); mkdirSync(bin); mkdirSync(cwd);
    for (const [name, source] of Object.entries({ npm: '#!/bin/sh\nprintf "%s" "$HOME/empty-global"\n',
      open: '#!/bin/sh\nprintf "%s" "$1" > "$HOME/public-opened"\n',
      'xdg-open': '#!/bin/sh\nprintf "%s" "$1" > "$HOME/public-opened"\n' })) {
      writeFileSync(join(bin, name), source); chmodSync(join(bin, name), 0o755);
    }
    const pluginDir = join(root, 'logs', 'plugins'); mkdirSync(pluginDir, { recursive: true });
    const hookFile = join(root, 'public-cli-loop-hooks.jsonl');
    writeFileSync(join(pluginDir, 'loop-fixture.mjs'), `import { appendFileSync } from 'node:fs';
const emit = (phase, data) => appendFileSync(${JSON.stringify(hookFile)}, JSON.stringify({ phase, ...data }) + '\\n');
export default { name: 'isolated boundary receipt', hooks: { onAgentLoopStart: data => emit('start', data), onAgentLoopEnd: data => emit('end', data) } };`);
    const slot = createServer(); await new Promise(resolve => slot.listen(0, '127.0.0.1', resolve));
    const port = slot.address().port; await new Promise(resolve => slot.close(resolve));
    publicCli = spawn(process.execPath, [new URL('../../packages/app/cli.js', import.meta.url).pathname,
      '--sdk', '--sdk-transport=appserver', '-C', cwd, ...config, '-m', 'gpt-5', '-s', 'read-only', '-a', 'never',
      'B4 PUBLIC CLI'], { env: { ...env, PATH: `${bin}:${process.env.PATH}`, CXV_CAPTURE_ONLY: '1',
      CXV_START_PORT: String(port), CXV_MAX_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; publicCli.stdout.on('data', b => { output += b; }); publicCli.stderr.on('data', b => { output += b; });
    publicCli.on('exit', () => writeFileSync(join(root, 'public-cli.log'), output));
    await waitFor(() => { assert.equal(publicCli.exitCode, null, output);
      return existsSync(join(home, 'public-opened')); }, 'public CLI browser launch');
    await waitFor(() => requests.some(r => r.prompt === 'B4 PUBLIC CLI'), 'public CLI local model request');
    let sessions;
    const deadline = Date.now() + 20000;
    do {
      const response = await fetch(`http://127.0.0.1:${port}/api/workspaces`);
      assert.equal(response.status, 200); sessions = (await response.json()).sessions;
      if (!sessions[0]?.busy) break;
      assert.ok(Date.now() < deadline, 'public CLI turn settlement');
      await new Promise(resolve => setTimeout(resolve, 10));
    } while (true);
    assert.equal(sessions[0].transport, 'appserver'); assert.equal(sessions[0].cwd, cwd);
    assert.ok(sessions[0].sessionId);
    await waitFor(() => existsSync(hookFile) && readFileSync(hookFile, 'utf8').trim().split('\n').length === 2, 'public CLI loop hooks');
    publicCliLoopEvidence = readFileSync(hookFile, 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(publicCliLoopEvidence.map(frame => frame.phase), ['start', 'end']);
    assert.equal(publicCliLoopEvidence[0].turnId, publicCliLoopEvidence[1].turnId);
    assert.equal(publicCliLoopEvidence[1].reason, 'success');
    assert.ok(publicCliLoopEvidence.every(frame => frame.instanceKey === sessions[0].instanceKey && frame.cwd === cwd));
  }
  assert.equal(managerLoops.filter(frame => frame.phase === 'start').length, managerLoops.filter(frame => frame.phase === 'end').length);
  assert.ok(managerLoops.some(frame => frame.reason === 'interrupted'));
  for (let i = 0; i < managerLoops.length; i += 2) {
    assert.deepEqual(managerLoops.slice(i, i + 2).map(frame => frame.phase), ['start', 'end']);
    assert.equal(managerLoops[i].turnId, managerLoops[i + 1].turnId);
    assert.ok(managerLoops[i].turnStartedAt > 0);
  }
  const result = { root, realCodex: version, officialSdk: '0.142.5', externalModelNetwork: false,
    credentials: 'isolated fixture-only', productionDefaultTransportChanged: false, threadConfigJson: useThreadConfig,
    agentsSpawned: verifyAgents, agents,
    appServer: { stdioHandshake: true, sameNameSeparateProcesses: true, independentTurns: true,
      plan: planFrame.params.plan, streamingDeltas: true, exactTurnInterrupt: true, failedTurn: true, restartNativeResume: true },
    sdk: { realTodoListReplay: true, statuses: snapshot.tasks.map(task => task.status) },
    normalizedTransport: { actualModule: true, textAndPlan: true, cancellation: true, continueAfterCancel: true, restartResume: true },
    managerIntegration: { explicitOnly: true, archiveIdentityRetained: true, genuinePlanStatus: true,
      independentQueue: true, interruptionParksQueue: true, sendNowOnSameNativeThread: true, busyTransportSwitchRejected: true,
      v2ExecArchiveToNativeResume: true, v2NativeArchiveToExecResume: true },
    nativeQuestions: { answer: true, cancelEmptyAnswers: true, exactInstanceReply: true, transcriptToolResult: true },
    nativeMcpImages: verifyImages ? { realCli: true, structuredTranscript: true, rawToolOutput: true } : null,
    nativeConfig: { rawTomlArray: verifyImages, featureFlag: true },
    errorEvidence: verifyErrors ? errorEvidence : null,
    normalizedFailure,
    managerFailures: verifyErrors ? managerFailures : null,
    managerRetryStates: verifyErrors ? managerRetryStates : null,
    managerAgents,
    managerLoops, publicCliLoopEvidence,
    lifecycleEvidence, lostResultEvidence, activityEvidence, mcpStatusEvidence,
    publicCli: verifyPublicCli ? { explicitAppServer: true, isolatedBrowserOpen: true, actualModelRequest: true, settled: true } : null,
    schema: { planStatuses: planSchema.definitions.TurnPlanStepStatus.enum,
      agentStatuses: itemSchema.definitions.CollabAgentStatus.enum, collabRequiredFields: collabSchema.required },
    requestCount: requests.length, unverified: [...(verifyLifecycle ? [] : verifyAgents ? ['child interrupt/reuse/nested lifecycle'] : ['real agent lifecycle execution']), 'real native command/file/permissions approval requests',
      verifyImages ? 'real dynamicToolCall image output' : 'image output',
      'all CLI options', 'OS process descendants', 'WebSocket reconnect', 'Windows/Linux/minimum Node'] };
  writeFileSync(join(root, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  if (publicCli && publicCli.exitCode === null) {
    const exited = once(publicCli, 'exit'); publicCli.kill('SIGTERM');
    const timer = setTimeout(() => publicCli.kill('SIGKILL'), 8000); await exited; clearTimeout(timer);
  }
  sdk?.stopSession(); waiting.forEach(resolve => resolve()); server.closeAllConnections();
  lifecycleTracker?.close();
  await lifecycleTransport?.stop();
  await lostResultTransport?.stop();
  await normalizedTransport?.stop();
  await Promise.allSettled(clients.map(c => c.stop()));
  await new Promise(resolve => server.close(resolve));
}
