// Actual installed Codex, isolated HOME and loopback synthetic Responses. No external model.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, realpathSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b9-native-'))), logs = join(root, 'logs');
for (const dir of [logs, join(root, 'home/.codex'), join(root, 'a/same'), join(root, 'b/same')]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: join(root, 'home'), CODEX_HOME: join(root, 'home/.codex'), CXV_LOG_DIR: logs,
  CXV_PROJECT_DIR: join(root, 'a/same'), CXV_TEST: '1', CXV_CLI_MODE: '1', CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1',
  CXV_START_PORT: '21040', CXV_MAX_PORT: '21049', OPENAI_API_KEY: 'fixture-only',
  HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9', NO_PROXY: 'localhost,127.0.0.1' });
for (const key of ['CXV_BYPASS_PERMISSIONS', 'OPENAI_BASE_URL', 'CXV_ORIGINAL_BASE_URL', 'CXV_ORIGINAL_CHATGPT_BASE_URL']) delete process.env[key];
const codexPath = '/Users/sky/.npm-global/bin/codex';
const version = execFileSync(codexPath, ['--version'], { encoding: 'utf8' }).trim();
const sdk = await import('../../packages/app/lib/sdk-manager.js'), server = await import('../../packages/app/server.js');
const { updatePreferences } = await import('../../packages/app/lib/preferences.js');
const { prepareChatCompletionsRequest, adaptChatCompletionsResponse } = await import('../../packages/app/lib/codex-chat-adapter.js');
const { decodeProxyJsonBody } = await import('../../packages/app/lib/proxy-profile.js');
const { listSdkResumeSessions, readSdkResumeHistory } = await import('../../packages/app/lib/sdk-resume-history.js');
const { ensureProjectIdForCwd } = await import('../../packages/app/lib/log-v2/project-id.js');
const records = [], frames = [], checks = [];
const upstream = createServer(async (req, res) => {
  try {
    assert.ok(req.url.endsWith('/responses'));
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = decodeProxyJsonBody(Buffer.concat(chunks), req.headers);
    records.push(body); writeFileSync(join(root, `request-${records.length}.json`), JSON.stringify(body, null, 2));
    const prompt = body.input?.filter(item => item.role === 'user').flatMap(item => typeof item.content === 'string'
      ? [item.content] : (item.content || []).map(part => part.text || '')).at(-1) || '';
    const callId = 'ask-' + prompt.replace(/\W/g, '-');
    const answered = body.input?.find(item => item.type === 'function_call_output' && item.call_id === callId);
    const asking = prompt.startsWith('B9 ASK') && !answered;
    const delta = asking ? { tool_calls: [{ index: 0, id: callId, type: 'function', function: { name: 'request_user_input',
      arguments: JSON.stringify({ questions: [{ id: 'choice', header: 'Fixture', question: 'Choose fixture',
        options: [{ label: 'First', description: 'Manual first' }, { label: 'Second (Recommended)', description: 'Hosted second' }] }] }) } }] }
      : { content: 'B9 NATIVE REPLY ' + prompt };
    const prepared = prepareChatCompletionsRequest('http://fixture.invalid/v1/responses', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: body.model, stream: true, input: 'fixture' }) },
      { id: 'fixture', apiKey: 'synthetic', baseURL: 'http://fixture.invalid', activeModel: body.model, wireApi: 'chat-completions' });
    const source = 'data: ' + JSON.stringify({ id: 'b9-' + records.length, model: body.model, choices: [{ index: 0, delta,
      finish_reason: asking ? 'tool_calls' : 'stop' }] }) + '\n\ndata: [DONE]\n\n';
    const adapted = await adaptChatCompletionsResponse(new Response(source, { headers: { 'content-type': 'text/event-stream' } }), prepared.context);
    res.writeHead(200, { 'content-type': 'text/event-stream' }); for await (const chunk of adapted.body) res.write(chunk); res.end();
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
const args = ['--skip-git-repo-check', '-m', 'gpt-5', '-c', 'model_provider="fixture"', '-c', 'model_providers.fixture.name="Local fixture"',
  '-c', `model_providers.fixture.base_url="http://127.0.0.1:${upstream.address().port}/v1"`, '-c', 'model_providers.fixture.wire_api="responses"',
  '-c', 'model_providers.fixture.requires_openai_auth=false', '-c', 'model_providers.fixture.request_max_retries=0', '-c', 'model_providers.fixture.stream_max_retries=0',
  '-c', 'features.shell_tool=false', '-c', 'features.unified_exec=false', '-c', 'features.multi_agent=false', '-c', 'features.goals=false',
  '-c', 'features.default_mode_request_user_input=true', '-c', 'web_search="disabled"'];
async function until(fn, label) { const end = Date.now() + 25000; while (!await fn()) { assert.ok(Date.now() < end, label); await new Promise(r => setTimeout(r, 20)); } }
let base;
const post = async (instance, path, body) => {
  const response = await fetch(base + path + '?instance=' + instance.instanceKey, { method: 'POST', headers: { 'content-type': 'application/json', Origin: base }, body: JSON.stringify(body) });
  const data = await response.json(); assert.ok(response.ok, JSON.stringify(data)); return data;
};
const read = async (instance, path) => (await fetch(base + path + (path.includes('?') ? '&' : '?') + 'instance=' + instance.instanceKey)).json();
const timeout = setTimeout(() => { console.error('B9 owned native fixture deadline'); void sdk.stopSession(); upstream.closeAllConnections(); }, 90000);
try {
  updatePreferences(p => ({ ...p, lang: 'en' }));
  await server.startViewer(); server.setWorkspaceLaunched(true); base = `http://127.0.0.1:${server.getPort()}`;
  for (const [index, transport] of ['exec', 'appserver'].entries()) {
    const cwd = join(root, index ? 'b/same' : 'a/same');
    const options = { codexPath, transport, codexArgs: args, onEntry: server.pushSdkEntry,
      onStreamingStatus: server.setSdkStreamingState, onStreamProgress: server.sendSdkStreamProgress,
      broadcastWs: frame => { frames.push(frame); server.broadcastWsMessage(frame); } };
    sdk.setSdkLaunchConfig(options); const owner = sdk.initSdkSession(cwd, 'same', options);
    await sdk.sendUserMessage('B9 RESIDENT ' + transport, owner); const before = sdk.getSdkSessionInfo(owner);
    const create = async (prompt, mode) => (await post(owner, '/api/scheduled-tasks', { project: 'same', instance: owner.instanceKey,
      prompt, template: 'none', mode, schedule: { kind: 'daily', time: '09:00' } })).task;
    const inject = await create('B9 INJECT ' + transport, 'inject');
    await post(owner, '/api/scheduled-tasks/run', { id: inject.id });
    await until(() => records.some(body => JSON.stringify(body.input).includes('B9 INJECT ' + transport)), 'native injection missing');
    await until(() => !sdk.getSdkStreamingState(owner).active, 'injection completion');
    const spawned = await create('B9 SPAWN ' + transport, 'spawn');
    await post(owner, '/api/scheduled-tasks/run', { id: spawned.id });
    let runs; await until(async () => { runs = await read(owner, '/api/scheduled-tasks/runs?id=' + spawned.id); return runs.runs?.some(run => run.status === 'completed'); }, 'spawn completion');
    const result = runs.runs.find(run => run.status === 'completed'); assert.notEqual(result.sessionId, before.sessionId);
    assert.equal(sdk.getSessionId(owner), before.sessionId);
    const nativeRoot = join(process.env.CODEX_HOME, 'sessions');
    const rollout = readdirSync(nativeRoot, { recursive: true }).find(path => String(path).endsWith(result.sessionId + '.jsonl'));
    assert.ok(rollout, 'native rollout missing');
    const context = readFileSync(join(nativeRoot, rollout), 'utf8').trim().split('\n').map(JSON.parse).find(row => row.type === 'turn_context').payload;
    assert.equal(context.approval_policy, 'on-request'); assert.equal(context.sandbox_policy.type, 'workspace-write');
    assert.equal(context.sandbox_policy.network_access, false);
    const projectId = ensureProjectIdForCwd(logs, cwd);
    const archives = listSdkResumeSessions(logs, { cwd, projectId }, 1, { sessionId: result.sessionId });
    assert.equal(archives.length, 1); assert.equal(archives[0].sessionId, result.sessionId);
    const history = (await read(owner, '/api/resume-sessions?sessionId=' + result.sessionId)).items.find(item => item.sessionId === result.sessionId);
    assert.ok(history); checks.push({ transport, spawnTransport: 'appserver', nativeApprovalPolicy: context.approval_policy, sandbox: context.sandbox_policy.type, inject: true, spawn: true, exactArchive: true, residentSessionPreserved: true, sessionId: result.sessionId });
    if (transport === 'appserver') {
      updatePreferences(p => ({ ...p, approvalModal: { ...p.approvalModal, askAutoAnswerMinutes: 0 } }));
      const hosted = await sdk.spawnEphemeralSession('B9 ASK HOSTED', { cwd, project: 'same', instanceKey: owner.instanceKey });
      assert.equal(hosted.ok, true, JSON.stringify(hosted));
      const askFrame = frames.find(frame => frame.type === 'sdk-ask-pending' && frame.origin === 'scheduled-task'); assert.ok(askFrame, 'actual native ask not observed');
      const answered = records.flatMap(body => body.input || []).find(item => item.type === 'function_call_output' && item.call_id === 'ask-B9-ASK-HOSTED');
      assert.ok(answered?.output?.includes('Second (Recommended)'), JSON.stringify(answered));
      updatePreferences(p => ({ ...p, approvalModal: { ...p.approvalModal, askAutoAnswerMinutes: 10 } }));
      const manual = sdk.spawnEphemeralSession('B9 ASK CANCEL', { cwd, project: 'same', instanceKey: owner.instanceKey });
      await until(() => sdk.getSdkPendingApprovals(owner).some(frame => frame.type === 'sdk-ask-pending'), 'actual native pending Ask');
      const pending = sdk.getSdkPendingApprovals(owner).find(frame => frame.type === 'sdk-ask-pending');
      assert.ok(pending.autoAnswerAt > Date.now()); assert.equal(sdk.cancelAskHosting(pending.id, owner), true);
      assert.equal(sdk.getSdkPendingApprovals(owner)[0].autoCancelled, true);
      assert.equal(sdk.resolveApproval(pending.id, { choice: { answers: ['First'] } }, owner), true);
      assert.equal((await manual).ok, true); assert.equal(sdk.getSessionId(owner), before.sessionId);
      checks.push({ actualNativeAsk: true, instantRecommended: true, cancelThenManual: true, ephemeralOwnerPreserved: true });
    }
    await sdk.resumeSdkSession(owner, async () => readSdkResumeHistory(logs, history.file, { cwd, projectId }));
    await sdk.sendUserMessage('B9 RESUME ' + transport, owner);
    assert.equal(sdk.getSessionId(owner), result.sessionId);
    assert.ok(records.at(-1).input.some(item => JSON.stringify(item).includes('B9 SPAWN ' + transport)));
    checks.push({ transport, actualNativeResumeOfScheduledArchive: true });
  }
} finally {
  clearTimeout(timeout); await server.stopViewer(); await sdk.stopSession(); sdk.setSdkLaunchConfig(null);
  upstream.closeAllConnections(); await new Promise(resolve => upstream.close(resolve));
}
const evidence = { version, root, requests: records.length, checks, actualInstalledCodex: true, loopbackSyntheticResponses: true,
  externalModel: false, nativeCommandsExecuted: false, ownSessionsStopped: true };
writeFileSync(new URL('../B9-native-scheduled.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n'); console.log(JSON.stringify(evidence));
