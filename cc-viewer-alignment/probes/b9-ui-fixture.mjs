// Owned UI fixture: native-protocol child, no external model or user processes.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b9-ui-'))), a = join(root, 'a/same'), b = join(root, 'b/same');
for (const dir of [a, b]) mkdirSync(dir, { recursive: true });
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: join(root, 'logs'),
  CXV_PROXY_PROFILE_PATH: join(root, 'profiles.json'), CXV_PROJECT_DIR: a, CXV_TEST: '1', CXV_CAPTURE_ONLY: '1',
  CXV_CLI_MODE: '1', CXV_SDK_MODE: '1', CXV_WORKSPACE_MODE: '1', CXV_START_PORT: '21060', CXV_MAX_PORT: '21069' });
delete process.env.CXV_BYPASS_PERMISSIONS;
const executable = join(root, 'fake-codex.mjs');
let script = readFileSync(new URL('../../packages/app/tests/fixtures/scheduled-native.txt', import.meta.url), 'utf8');
script = '#!/usr/bin/env node\n' + script.replace("if(f.method==='thread/start')", "if(f.method==='thread/start'||f.method==='thread/resume')").replace('threadId=randomUUID();send', 'threadId=p.threadId||randomUUID();send');
writeFileSync(executable, script); chmodSync(executable, 0o755);
const sdk = await import('../../packages/app/lib/sdk-manager.js'), server = await import('../../packages/app/server.js');
const { updatePreferences } = await import('../../packages/app/lib/preferences.js');
updatePreferences(p => ({ ...p, lang: 'en', showFullToolContent: true, approvalModal: { ...p.approvalModal, askAutoAnswerMinutes: null } }));
const options = { codexPath: executable, transport: 'appserver', onEntry: server.pushSdkEntry,
  onStreamingStatus: server.setSdkStreamingState, onStreamProgress: server.sendSdkStreamProgress,
  broadcastWs: server.broadcastWsMessage, onAgentLoopStart: server.broadcastAgentLoopStart, onAgentLoopEnd: server.broadcastAgentLoopEnd };
sdk.setSdkLaunchConfig(options); const first = sdk.initSdkSession(a, 'same', options), second = sdk.launchSdkSession(b, 'same');
const { registerWorkspace } = await import('../../packages/app/workspace-registry.js'); registerWorkspace(a); registerWorkspace(b);
server.setWorkspaceLaunched(true); await server.startViewer(); await sdk.sendUserMessage('resident', first);
const fixture = { root, pid: process.pid, port: server.getPort(), a: { ...first, url: `http://127.0.0.1:${server.getPort()}/?instance=${first.instanceKey}` },
  b: { ...second, url: `http://127.0.0.1:${server.getPort()}/?instance=${second.instanceKey}` } };
writeFileSync('/tmp/cxv-b9-ui-fixture.json', JSON.stringify(fixture)); console.log(JSON.stringify(fixture));
let closing = false; async function close() { if (closing) return; closing = true; await server.stopViewer(); await sdk.stopSession(); process.exit(0); }
process.once('SIGINT', close); process.once('SIGTERM', close);
