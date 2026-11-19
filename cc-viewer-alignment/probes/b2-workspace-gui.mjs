// Isolated, repeatable GUI fixture. Run after `pnpm run build`; stop with Ctrl+C.
// Uses temporary HOME/CODEX_HOME, a local fake Codex and two same-named workspaces.
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b2-workspace-gui-')));
const a = join(root, 'one', 'same'), b = join(root, 'two', 'same');
for (const cwd of [a, b]) {
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, 'note.txt'), cwd);
}
Object.assign(process.env, {
  HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profile.json'), CXV_PROJECT_DIR: a,
  CXV_TEST: '1', CXV_CAPTURE_ONLY: '1', CXV_WORKSPACE_MODE: '1', CXV_CLI_MODE: '1',
  CXV_SDK_MODE: '1', CXV_START_PORT: '20220', CXV_MAX_PORT: '20229',
});
delete process.env.CXV_BYPASS_PERMISSIONS;
const executable = join(root, 'fake-codex.mjs');
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
if (input.includes('hold')) while (!existsSync(join(cwd, 'release'))) await new Promise(resolve => setTimeout(resolve, 20));
for (const event of [
  { type: 'item.completed', item: { id: 'reply', type: 'agent_message', text: 'GUI fixture ' + label + ' replied: ' + input } },
  { type: 'turn.completed', usage: { input_tokens: 3, output_tokens: 3 } },
]) process.stdout.write(JSON.stringify(event) + '\n');
`);
chmodSync(executable, 0o755);
const source = new URL('../../packages/app/', import.meta.url);
const server = await import(new URL('server.js', source));
const sdk = await import(new URL('lib/sdk-manager.js', source));
(await import(new URL('interceptor.js', source))).initForWorkspace(a);
const options = { codexPath: executable, onEntry: server.pushSdkEntry,
  onStreamingStatus: server.setSdkStreamingState, onStreamProgress: server.sendSdkStreamProgress,
  broadcastWs: server.broadcastWsMessage };
sdk.setSdkLaunchConfig(options);
const first = sdk.initSdkSession(a, 'same', options), second = sdk.launchSdkSession(b, 'same');
const { registerWorkspace } = await import(new URL('workspace-registry.js', source));
registerWorkspace(a); registerWorkspace(b);
server.setWorkspaceLaunched(true);
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
  await server.stopViewer();
  process.exit(0);
};
process.once('SIGTERM', close);
process.once('SIGINT', close);
