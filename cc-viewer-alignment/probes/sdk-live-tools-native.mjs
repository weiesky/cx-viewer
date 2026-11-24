// Actual installed Codex + official SDK against loopback Responses, no external model/credentials.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const codexPath = process.argv[2] || '/Users/sky/.npm-global/bin/codex';
const version = execFileSync(codexPath, ['--version'], { encoding: 'utf8' }).trim();
const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-live-native-'));
mkdirSync(join(root, 'codex'));
for (const key of Object.keys(process.env)) if (/^(CXV_|CODEX_|OTEL_)/.test(key)) delete process.env[key];
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_TEST: '1', OPENAI_API_KEY: 'fixture-only',
  HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9', NO_PROXY: '127.0.0.1,localhost' });
delete process.env.OPENAI_BASE_URL;
const { prepareChatCompletionsRequest, adaptChatCompletionsResponse } = await import('../../packages/app/lib/codex-chat-adapter.js');
const { decodeProxyJsonBody } = await import('../../packages/app/lib/proxy-profile.js');
const sdk = await import('../../packages/app/lib/sdk-manager.js');
let turn, release;
const server = createServer(async (req, res) => {
 try {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = decodeProxyJsonBody(Buffer.concat(chunks), req.headers); turn.requests++;
  assert.equal(new URL(req.url, 'http://localhost').pathname, '/v1/responses');
  const prepared = prepareChatCompletionsRequest('http://fixture.invalid/v1/responses', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: body.model, stream: true, input: 'local fixture', tools: body.tools || [] }) },
  { id: 'fixture', name: 'fixture', baseURL: 'http://fixture.invalid', apiKey: 'fixture', activeModel: 'gpt-5', wireApi: 'chat-completions' });
  let delta;
  if (turn.requests <= 3) {
   const [name, metadata] = [...prepared.context.toolMetadata].find(([, metadata]) => ['shell_command', 'shell', 'exec_command'].includes(metadata.name)) || [];
   assert.ok(name, 'real Codex declares a shell tool'); turn.toolNames.push(metadata.name);
   const cmd = `printf 'NATIVE-LIVE-${turn.requests}\\n'; sleep 0.4; printf 'NATIVE-DONE-${turn.requests}\\n'${turn.requests === 2 ? '; exit 1' : ''}`;
   const args = metadata.name === 'shell' ? { command: ['/bin/sh', '-lc', cmd], timeout_ms: 5000 }
     : metadata.name === 'exec_command' ? { cmd, yield_time_ms: 1000, max_output_tokens: 1000 }
       : { command: cmd, timeout_ms: 5000 };
   delta = { tool_calls: [{ index: 0, id: `native-call-${turn.requests}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] };
  } else {
   assert.equal(turn.requests, 4); turn.awaitingFinal = true;
   await new Promise(resolve => { release = resolve; res.once('close', resolve); });
   delta = { content: 'NATIVE LIVE FINAL' };
  }
  const source = 'data: ' + JSON.stringify({ id: 'native-live-' + turn.requests, model: 'gpt-5', choices: [{ index: 0, delta,
    finish_reason: delta.tool_calls ? 'tool_calls' : 'stop' }] }) + '\n\ndata: [DONE]\n\n';
  const adapted = await adaptChatCompletionsResponse(new Response(source, { headers: { 'content-type': 'text/event-stream' } }), prepared.context);
  res.writeHead(200, { 'content-type': 'text/event-stream' }); for await (const chunk of adapted.body) res.write(chunk); res.end();
 } catch (error) { turn.error = error.message; res.writeHead(500); res.end(error.message); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/v1`;
const args = ['--model', 'gpt-5', '--sandbox', 'read-only', '--skip-git-repo-check',
  '-c', 'model_provider="fixture"', '-c', 'model_providers.fixture.name="Local fixture"', '-c', `model_providers.fixture.base_url=${JSON.stringify(url)}`,
  '-c', 'model_providers.fixture.wire_api="responses"', '-c', 'model_providers.fixture.requires_openai_auth=false',
  '-c', 'model_providers.fixture.request_max_retries=0', '-c', 'model_providers.fixture.stream_max_retries=0',
  '-c', 'features.unified_exec=false', '-c', 'features.multi_agent=false', '-c', 'web_search="disabled"'];
const results = [];
async function waitFor(check) { const deadline = Date.now() + 25000; while (!check()) {
 if (turn.error) throw new Error(turn.error);
 assert.equal(turn.entries.some(e => e.mainAgent), false, 'native turn ended before the expected shell checkpoint');
 assert.ok(Date.now() < deadline, JSON.stringify({ ...turn, entries: turn.entries.length, progress: turn.progress.length }));
 await new Promise(resolve => setTimeout(resolve, 20));
} }
try {
 for (const transport of ['exec', 'appserver']) {
  turn = { requests: 0, toolNames: [], entries: [], progress: [] }; const cwd = join(root, transport); mkdirSync(cwd);
  const view = sdk.initSdkSession(cwd, transport, { codexPath, transport, codexArgs: args,
    onEntry: entry => turn.entries.push(entry), onStreamProgress: data => turn.progress.push(data) });
  const running = sdk.sendUserMessage('Run the local fixture', view);
  try {
   await waitFor(() => turn.awaitingFinal);
   await waitFor(() => sdk.getSdkStreamProgress(view)?.toolProgress?.length === 3);
   assert.equal(turn.entries.some(e => e.mainAgent), false, 'all real shell calls finish before the canonical MainAgent');
   const snapshot = sdk.getSdkStreamProgress(view);
   assert.deepEqual(snapshot.toolProgress.map(t => t.status), ['completed', 'failed', 'completed']);
   for (let i = 1; i <= 3; i++) {
    const step = snapshot.toolProgress[i - 1]; assert.match(step.output, new RegExp('NATIVE-DONE-' + i));
    assert.ok(turn.progress.some(p => p.toolProgress?.some(t => t.id === step.id && t.status === 'in_progress')));
   }
   release(); await running;
   assert.equal(turn.entries.filter(e => e.mainAgent).length, 1); assert.equal(sdk.getSdkStreamProgress(view), null);
   results.push({ transport, actualNativeCodex: true, officialSdk: true, syntheticLoopbackResponses: true, externalModel: false,
    realShellCalls: 3, requests: turn.requests, toolNames: turn.toolNames, progressFrames: turn.progress.length,
    eachStartVisibleBeforeFinal: true, completedAndFailed: true, finalOnlyOnce: true });
  } finally { release?.(); await sdk.stopSession(); await running.catch(() => {}); }
 }
} finally {
 server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
 const interceptor = await import('../../packages/app/interceptor.js'); interceptor._stopProxyProfileWatchForTests(); await interceptor.closeLogV2Writes();
}
const result = { root, version, results }; writeFileSync(new URL('../SDK-live-tools-native-2026-11-24.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
