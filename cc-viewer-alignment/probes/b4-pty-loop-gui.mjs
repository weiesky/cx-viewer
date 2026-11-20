// Isolated ordinary-TUI UI fixture. Uses the production PTY manager + bridge
// parser + writer/server, with a synthetic PTY adapter (no real model/TUI claim).
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b4-pty-loop-gui-'))), cwd = join(root, 'same');
mkdirSync(cwd); mkdirSync(join(root, 'logs', 'plugins'), { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROJECT_DIR: cwd, CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_CLI_MODE: '1', CXV_SDK_MODE: '0',
  CXV_WORKSPACE_MODE: '1', CXV_START_PORT: '20340', CXV_MAX_PORT: '20349', HTTP_PROXY: 'http://127.0.0.1:9' });
delete process.env.CXV_BYPASS_PERMISSIONS; delete process.env.CXV_TURN_END_DEBOUNCE_MS;
mkdirSync(join(root, 'codex'), { recursive: true });
// URL metadata only: direct api.openai.com is intentionally classified Master.
// This fixture never opens a model connection.
writeFileSync(join(root, 'codex', 'config.toml'), 'openai_base_url = "https://ordinary-tui.invalid/v1"\n');
writeFileSync(join(cwd, 'note.txt'), 'isolated ordinary TUI fixture');
writeFileSync(join(root, 'logs', 'plugins', 'loop-observer.mjs'), `import { appendFileSync } from 'node:fs';
const record = (phase, data) => appendFileSync(${JSON.stringify(join(root, 'hooks.jsonl'))}, JSON.stringify({ phase, observedAt: Date.now(), ...data }) + '\\n');
export default { name: 'isolated TUI lifecycle observer', hooks: {
 onAgentLoopStart(data) { record('start', data); }, onAgentLoopEnd(data) { record('end', data); }
} };`);
const rootThreadId = randomUUID();
const source = new URL('../../packages/app/', import.meta.url);
const bridge = await import(new URL('lib/appserver-bridge.js', source));
const server = await import(new URL('server.js', source));
const pty = await import(new URL('pty-manager.js', source));
const interceptor = await import(new URL('interceptor.js', source));
interceptor.initForWorkspace(cwd);
bridge._resetAppServerBridgeForTests({ cwd, project: 'same', model: 'fixture', writeLogEntry: interceptor.appendLogEntry,
  onAgentLoopStart: server.broadcastPtyAgentLoopStart, onAgentLoopEnd: server.broadcastPtyAgentLoopEnd });
const dummy = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd, env: process.env, detached: true, stdio: 'ignore' });
const native = message => bridge._parseAppServerServerMessageForTests(message, 'owned-gui');
const client = message => bridge._parseAppServerClientMessageForTests(message, 'owned-gui');
native({ method: 'thread/started', params: { thread: { id: rootThreadId, sessionId: rootThreadId, cwd, source: 'cli' } } });
let active = null, rpc = 1, input = '', onData, onExit;
function finish(status = 'completed') {
  const turn = active; if (!turn) return; active = null;
  if (status === 'completed') native({ method: 'item/completed', params: { threadId: rootThreadId, turnId: turn.id,
    item: { id: 'reply-' + turn.id, type: 'agentMessage', text: 'GUI ordinary TUI replied: ' + turn.text } } });
  appendFileSync(join(root, 'terminal.jsonl'), JSON.stringify({ turnId: turn.id, status, at: Date.now() }) + '\n');
  native({ method: 'turn/completed', params: { threadId: rootThreadId, turn: { id: turn.id, status } } });
  onData?.('\r\n› ');
}
function send(text) {
  if (!text.trim()) return;
  if (active) finish('interrupted');
  const turn = active = { id: randomUUID(), text };
  appendFileSync(join(root, 'inputs.jsonl'), JSON.stringify({ turnId: turn.id, text, at: Date.now() }) + '\n');
  client({ id: ++rpc, method: 'turn/start', params: { threadId: rootThreadId, input: [{ type: 'text', text }] } });
  native({ id: rpc, result: { turn: { id: turn.id, status: 'inProgress' } } });
  native({ method: 'turn/started', params: { threadId: rootThreadId, turn: { id: turn.id, status: 'inProgress' } } });
  onData?.('\r\nWorking on ' + text + '\r\n');
  if (!text.includes('hold')) finish();
}
pty._setPtyImportForTests(async () => ({ spawn() { return {
  pid: dummy.pid, onData(fn) { onData = fn; return { dispose() {} }; },
  onExit(fn) { onExit = fn; return { dispose() {} }; }, resize() {},
  kill() { dummy.kill('SIGTERM'); onExit?.({ exitCode: 0 }); },
  write(data) {
    appendFileSync(join(root, 'pty-writes.jsonl'), JSON.stringify({ data }) + '\n');
    if (data.includes('\x03') || data === '\x1b') { input = ''; finish('interrupted'); return; }
    if (data.includes('\x15')) input = '';
    input += data.replace(/\x1b\[[0-9;]*[A-Za-z~]/g, '').replace(/\x15/g, '');
    const lines = input.split(/[\r\n]+/); input = lines.pop(); for (const line of lines) send(line);
  },
}; } }));
server.setWorkspaceLaunched(true); await server.startViewer();
await pty.spawnCodex(null, cwd, [], process.execPath, false, server.getPort());
console.log(JSON.stringify({ root, pid: process.pid, ownedDummyPid: dummy.pid,
  url: `http://127.0.0.1:${server.getPort()}/`, voiceEndDebounceMs: 10000, syntheticPty: true }));
let closing = false;
async function close() {
  if (closing) return; closing = true;
  bridge._resetAppServerBridgeForTests(); pty.killPty(); dummy.kill('SIGTERM');
  await server.stopViewer(); await interceptor.closeLogV2Writes(); process.exit(0);
}
process.once('SIGINT', close); process.once('SIGTERM', close);
for await (const line of createInterface({ input: process.stdin })) {
  try {
    const command = JSON.parse(line);
    if (command.action === 'release') finish();
    if (command.action === 'interrupt') finish('interrupted');
    if (command.action === 'send') send(command.text || 'hold ordinary TUI');
    if (command.action === 'disconnect') { await server.stopViewer(); await server.startViewer(); }
    if (command.action === 'state') console.log(JSON.stringify({ active, loops: bridge.getAppServerAgentLoopSnapshot() }));
  } catch (error) { console.error(error.message); }
}
