// Public ordinary CLI + real Codex TUI/App Server; local synthetic model only.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, readFileSync, existsSync, chmodSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import WebSocket from 'ws';
import xterm from '@xterm/headless';
import { prepareChatCompletionsRequest, adaptChatCompletionsResponse } from '../../packages/app/lib/codex-chat-adapter.js';
import { decodeProxyJsonBody } from '../../packages/app/lib/proxy-profile.js';
import { readV2WireSnapshot } from '../../packages/app/lib/log-v2/transport.js';
import { readV2LogEntries } from '../../packages/app/lib/log-v2/materializer.js';
import { classifyRequest } from '../../packages/app/src/utils/requestType.js';
import { isNativeTitleEntry } from '../../packages/app/lib/codex-thread-source.js';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b4-pty-loop-real-')));
const home = join(root, 'home'), cwd = join(root, 'same'), bin = join(root, 'bin'), logDir = join(root, 'logs');
for (const p of [home, cwd, bin, join(home, '.codex'), join(logDir, 'plugins')]) mkdirSync(p, { recursive: true });
const requests = [], held = new Set();
const model = createServer(async (req, res) => {
  try {
    assert.ok(req.url.endsWith('/responses'));
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = decodeProxyJsonBody(Buffer.concat(chunks), req.headers);
    const text = (body.input || []).filter(item => item.role === 'user').flatMap(item => item.content || [])
      .filter(block => block.type === 'input_text').map(block => block.text).at(-1) || '';
    requests.push(text); writeFileSync(join(root, 'requests.json'), JSON.stringify(requests));
    if (text.includes('B4 PTY HOLD')) { held.add(res); res.once('close', () => held.delete(res)); return; }
    const prepared = prepareChatCompletionsRequest('http://fixture.invalid/v1/responses', {
      method: 'POST', body: JSON.stringify({ model: body.model, stream: true, input: text }),
    }, { id: 'fixture', baseURL: 'http://fixture.invalid', apiKey: 'fixture-only', activeModel: 'gpt-5', wireApi: 'chat-completions' });
    const source = 'data: ' + JSON.stringify({ id: 'pty-fixture', model: 'gpt-5', choices: [
      { index: 0, delta: { content: `LOCAL_PTY_REPLY ${text}` }, finish_reason: 'stop' },
    ] }) + '\n\ndata: [DONE]\n\n';
    const adapted = await adaptChatCompletionsResponse(new Response(source, { headers: { 'content-type': 'text/event-stream' } }), prepared.context);
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    for await (const chunk of adapted.body) res.write(chunk);
    res.end();
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
await new Promise(resolve => model.listen(0, '127.0.0.1', resolve));
writeFileSync(join(home, '.codex', 'config.toml'), `model = "gpt-5"
model_provider = "fixture"
openai_base_url = "https://ordinary-tui.invalid/v1"
approval_policy = "never"
sandbox_mode = "read-only"
web_search = "disabled"
[features]
shell_tool = false
unified_exec = false
multi_agent = false
goals = false
[model_providers.fixture]
name = "Isolated fixture"
base_url = "http://127.0.0.1:${model.address().port}/v1"
wire_api = "responses"
requires_openai_auth = false
request_max_retries = 0
stream_max_retries = 0
[projects.${JSON.stringify(cwd)}]
trust_level = "trusted"
`);
for (const [name, content] of Object.entries({ npm: '#!/bin/sh\nprintf "%s" "$HOME/empty-global"\n',
  open: '#!/bin/sh\nprintf "%s" "$1" > "$HOME/opened"\n', 'xdg-open': '#!/bin/sh\nprintf "%s" "$1" > "$HOME/opened"\n' })) {
  writeFileSync(join(bin, name), content); chmodSync(join(bin, name), 0o755);
}
const hooks = join(root, 'hooks.jsonl');
writeFileSync(join(logDir, 'plugins', 'observer.mjs'), `import { appendFileSync } from 'node:fs';
const emit = (phase, data) => appendFileSync(${JSON.stringify(hooks)}, JSON.stringify({phase, observedAt:Date.now(), ...data})+'\\n');
export default { name:'owned loop receipt', hooks:{ onAgentLoopStart:data=>emit('start',data), onAgentLoopEnd:data=>emit('end',data) } };`);
const slot = createServer(); await new Promise(resolve => slot.listen(0, '127.0.0.1', resolve));
const port = slot.address().port; await new Promise(resolve => slot.close(resolve));
const env = { ...process.env, HOME: home, CODEX_HOME: join(home, '.codex'), OPENAI_API_KEY: 'fixture-only',
  PATH: `${bin}:${process.env.PATH}`, CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_LOG_DIR: logDir,
  CXV_START_PORT: String(port), CXV_MAX_PORT: String(port), TERM: 'xterm-256color',
  HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9', NO_PROXY: '127.0.0.1,localhost' };
for (const key of ['CXV_BYPASS_PERMISSIONS', 'CXV_TURN_END_DEBOUNCE_MS', 'CXV_SDK_MODE', 'CXV_WORKSPACE_MODE', 'OPENAI_BASE_URL']) delete env[key];
let child, ws, output = '', terminalOutput = '', failure;
const terminal = new xterm.Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const waitFor = async (predicate, label, ms = 30000) => {
  const until = Date.now() + ms;
  while (!predicate()) {
    assert.equal(child?.exitCode ?? null, null, output.slice(-1500));
    if (Date.now() > until) throw new Error(`${label} timeout`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
};
const frames = () => existsSync(hooks) ? readFileSync(hooks, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
try {
  child = spawn(process.execPath, [new URL('../../packages/app/cli.js', import.meta.url).pathname, '--no-alt-screen'], {
    env, cwd, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', b => output += b); child.stderr.on('data', b => output += b);
  await waitFor(() => existsSync(join(home, 'opened')), 'public CLI ready');
  assert.match(output, /App-Server bridge started/);
  ws = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal`, { origin: `http://127.0.0.1:${port}` });
  const send = data => ws.send(JSON.stringify({ type: 'input', data }));
  terminal.onData(data => send(data));
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (['data', 'data-replay'].includes(msg.type)) {
      terminalOutput += msg.data; terminal.write(msg.data); writeFileSync(join(root, 'terminal.log'), terminalOutput);
    }
  });
  await once(ws, 'open'); ws.send(JSON.stringify({ type: 'resize', cols: 120, rows: 35 }));
  await waitFor(() => terminalOutput.includes('gpt-5') || terminalOutput.includes('Hooks need review'), 'native TUI initialization');
  if (terminalOutput.includes('Hooks need review')) {
    await waitFor(() => terminalOutput.includes('confirm'), 'hook review rendered');
    send('3'); await new Promise(resolve => setTimeout(resolve, 150)); send('\r'); // Continue without trusting/running hooks.
  }
  await waitFor(() => terminalOutput.includes('gpt-5'), 'native TUI ready');
  send('B4 PTY SUCCESS'); await new Promise(resolve => setTimeout(resolve, 150)); send('\r');
  await waitFor(() => frames().some(frame => frame.phase === 'end'), 'normal debounced end');
  assert.equal(requests.filter(text => text === 'B4 PTY SUCCESS').length, 1);
  assert.ok(terminalOutput.includes('LOCAL_PTY_REPLY'));
  send('B4 PTY HOLD'); await new Promise(resolve => setTimeout(resolve, 150)); send('\r');
  await waitFor(() => requests.some(text => text === 'B4 PTY HOLD'), 'held native model request');
  send('\x1b'); await waitFor(() => frames().some(frame => frame.reason === 'interrupted'), 'native Escape terminal');
  const receipts = frames(); assert.deepEqual(receipts.map(frame => frame.phase), ['start', 'end', 'start', 'end']);
  assert.ok(receipts.every(frame => frame.mode === 'pty' && frame.cwd === cwd && frame.turnId));
  assert.equal(receipts[0].turnId, receipts[1].turnId); assert.equal(receipts[2].turnId, receipts[3].turnId);
  const endDelayMs = receipts[1].observedAt - receipts[1].ts;
  assert.ok(endDelayMs >= 9900 && endDelayMs < 12000);
  const titleArchives = [];
  for (const project of readdirSync(logDir, { withFileTypes: true }).filter(dir => dir.isDirectory())) {
    for (const archive of readdirSync(join(logDir, project.name)).filter(name => name.endsWith('.cxvsession'))) {
      const file = `${project.name}/${archive}/timeline.jsonl`;
      const titles = readV2LogEntries(logDir, file).filter(isNativeTitleEntry);
      if (!titles.length) continue;
      assert.ok(titles.every(entry => classifyRequest(entry).type === 'Synthetic' && classifyRequest(entry).subType === 'Title'));
      const summary = JSON.parse(readFileSync(join(logDir, project.name, archive, 'summary.json')));
      assert.equal(summary.rootMainEvents, 0); assert.deepEqual(summary.userPrompts, []);
      assert.ok(summary.turns > 0, 'physical native turns remain inspectable');
      const snapshot = readV2WireSnapshot(logDir, file, { limit: 100 });
      assert.ok(snapshot.summaries.filter(row => isNativeTitleEntry({ ...row.root, body: row.body }))
        .every(row => row.classification.type === 'Synthetic' && row.classification.subType === 'Title'));
      titleArchives.push({ file, canonicalTitleRecords: titles.length, rootMainEvents: summary.rootMainEvents, turns: summary.turns });
    }
  }
  assert.ok(titleArchives.length > 0, 'real temporary title records must be retained as auxiliary');
  const active = (await (await fetch(`http://127.0.0.1:${port}/api/log-v2/snapshot`)).text()).split('\n').filter(Boolean).map(JSON.parse)[0];
  assert.equal(active.archive.sessionId, receipts[0].sessionId, 'title activity cannot replace the current user archive');
  writeFileSync(join(root, 'result.json'), JSON.stringify({ root, realCodex: execFileSync('codex', ['--version'], { encoding:'utf8' }).trim(),
    publicOrdinaryCli: true, actualTuiAndBridge: true, externalModelNetwork: false, credentials: 'fixture-only',
    success: true, nativeEscapeInterrupted: true, endDelayMs, receipts, requests, titleArchives, activeUserArchive: active.archive }, null, 2));
} catch (error) { failure = error; writeFileSync(join(root, 'failure.txt'), error.stack); }
finally {
  ws?.close(); terminal.dispose();
  if (child && child.exitCode === null) {
    const done = once(child, 'exit'); child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 8000); await done; clearTimeout(timer);
  }
  for (const response of held) response.destroy(); model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  writeFileSync(join(root, 'cli.log'), output); writeFileSync(join(root, 'terminal.log'), terminalOutput);
  console.log(JSON.stringify({ root, success: !failure, error: failure?.message }));
}
if (failure) throw failure;
