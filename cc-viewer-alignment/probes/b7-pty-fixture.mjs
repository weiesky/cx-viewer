// Task-owned actual CLI, native app-server and node-pty; model replies stay local.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, realpathSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../../packages/app/', import.meta.url));
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b7-pty-gui-')));
const a = join(root, 'one', 'same'), b = join(root, 'two', 'same');
const codexHome = join(root, '.codex');
for (const cwd of [a, b, codexHome, join(root, 'bin')]) mkdirSync(cwd, { recursive: true });
for (const [cwd, owner] of [[a, 'A'], [b, 'B']]) writeFileSync(join(cwd, 'owner.txt'), owner);
let calls = [], hold = false; const held = new Set();
const upstream = createServer((req, res) => {
  if (req.url === '/control/hold' || req.url === '/control/release') {
    hold = req.url.endsWith('/hold'); if (!hold) { for (const reply of held) reply(); held.clear(); }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ hold, waiting: held.size })); return;
  }
  let raw = ''; req.on('data', data => { raw += data; });
  req.on('end', () => {
    calls.push({ path: req.url, body: raw }); writeFileSync(join(root, 'model-calls.json'), JSON.stringify(calls));
    if (req.method !== 'POST') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [] })); return; }
    const reply = () => { if (res.destroyed) return;
    const id = 'fixture-' + Date.now(), message = { id: 'msg-' + id, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'B7 local native reply', annotations: [] }] };
    const response = { id, object: 'response', status: 'completed', model: 'gpt-5.3-codex', output: [message], usage: { input_tokens: 12, output_tokens: 5, total_tokens: 17 } };
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    for (const event of [{ type: 'response.created', response: { ...response, output: [], status: 'in_progress' } },
      { type: 'response.output_item.added', output_index: 0, item: { ...message, status: 'in_progress', content: [] } },
      { type: 'response.content_part.added', item_id: message.id, output_index: 0, content_index: 0, part: { type: 'output_text', text: '', annotations: [] } },
      { type: 'response.output_text.delta', item_id: message.id, output_index: 0, content_index: 0, delta: 'B7 local native reply' },
      { type: 'response.output_text.done', item_id: message.id, output_index: 0, content_index: 0, text: 'B7 local native reply' },
      { type: 'response.output_item.done', output_index: 0, item: message },
      { type: 'response.completed', response }]) res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    res.end(); };
    if (hold) { held.add(reply); res.on('close', () => held.delete(reply)); } else reply();
  });
});
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
writeFileSync(join(codexHome, 'auth.json'), JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: 'B7-local-fixture' }));
writeFileSync(join(codexHome, 'config.toml'), `model = "gpt-5.3-codex"\n[projects.${JSON.stringify(a)}]\ntrust_level = "trusted"\n[projects.${JSON.stringify(b)}]\ntrust_level = "trusted"\n`);
const profile = join(root, 'profiles.json');
writeFileSync(profile, JSON.stringify({ version: 3, active: 'fixture', profiles: [{ id: 'max', name: 'Default' },
  { id: 'fixture', name: 'Local fixture', baseURL: `http://127.0.0.1:${upstream.address().port}/v1`, apiKey: 'B7-local-fixture', activeModel: 'gpt-5.3-codex', wireApi: 'responses' }] }));
writeFileSync(join(root, 'bin', 'open'), '#!/bin/sh\nexit 0\n'); chmodSync(join(root, 'bin', 'open'), 0o755);
const log = openSync(join(root, 'cli.log'), 'w');
const child = spawn(process.execPath, [join(source, 'cli.js'), '--dangerously-bypass-approvals-and-sandbox'], { cwd: a,
  env: { ...process.env, HOME: root, CODEX_HOME: codexHome, CXV_TEST: '0', CXV_LOG_DIR: join(root, 'logs'),
    CXV_PROXY_PROFILE_PATH: profile, CXV_START_PORT: '20580', CXV_MAX_PORT: '20589', CXV_CAPTURE_ONLY: '1',
    PATH: join(root, 'bin') + ':' + process.env.PATH, OPENAI_API_KEY: 'B7-local-fixture',
    HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '' }, stdio: ['ignore', log, log] });
const fixture = { root, parentPid: process.pid, pid: child.pid, port: 20580, a, b, url: 'http://127.0.0.1:20580/', modelPort: upstream.address().port };
const deadline = Date.now() + 45000;
while (Date.now() < deadline) {
  if (child.exitCode !== null) throw new Error('CLI exited: ' + child.exitCode + '; see ' + join(root, 'cli.log'));
  try { const state = await (await fetch(fixture.url + 'api/cli-mode')).json(); if (state.ptyMode) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 100));
}
const state = await (await fetch(fixture.url + 'api/cli-mode')).json();
if (!state.ptyMode || state.sdkMode) throw new Error('Actual ordinary CLI did not configure PTY workspaces');
writeFileSync('/tmp/cxv-b7-pty-fixture.json', JSON.stringify(fixture)); console.log(JSON.stringify(fixture));
let closing = false;
async function close() { if (closing) return; closing = true; child.kill('SIGTERM');
  await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
  upstream.closeAllConnections(); upstream.close(); process.exit(0); }
process.once('SIGINT', close); process.once('SIGTERM', close);
