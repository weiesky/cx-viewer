// Replay task-owned real Codex lifecycle frames through the production bridge,
// writer and cold wire summaries. No model process or user log is accessed.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { classifyRequest } from '../../packages/app/src/utils/requestType.js';
import { LogV2Archive } from '../../apps/web/src/utils/logV2Archive.js';

const framesFile = process.argv[2];
assert.ok(framesFile, 'Pass agent-lifecycle-frames.json from the isolated real B4 lifecycle probe');
const frames = JSON.parse(readFileSync(framesFile, 'utf8'));
const root = realpathSync(mkdtempSync(join(tmpdir(), 'cxv-b4-agent-identity-')));
const cwd = realpathSync(frames.find(frame => frame.method === 'thread/started' && !frame.params.thread.parentThreadId).params.thread.cwd);
assert.ok(cwd.startsWith(realpathSync(dirname(framesFile)) + sep), 'replay cwd must stay in the task-owned fixture');
const logDir = join(root, 'logs');
Object.assign(process.env, { HOME: root, CODEX_HOME: join(root, 'codex'), CXV_LOG_DIR: logDir,
  CXV_PROJECT_DIR: cwd, CXV_TEST: '1', CXV_CAPTURE_ONLY: '1' });
mkdirSync(join(root, 'codex'));
writeFileSync(join(root, 'codex/config.toml'), 'openai_base_url = "https://identity-fixture.invalid/v1"\n');
const bridge = await import('../../packages/app/lib/appserver-bridge.js');
const interceptor = await import('../../packages/app/interceptor.js');
const { readV2LogEntries } = await import('../../packages/app/lib/log-v2/materializer.js');
const { readV2WireSnapshot } = await import('../../packages/app/lib/log-v2/transport.js');
interceptor.initForWorkspace(cwd);
bridge._resetAppServerBridgeForTests({ cwd, project: 'same', writeLogEntry: interceptor.appendLogEntry });
for (const frame of frames) bridge._parseAppServerServerMessageForTests(frame);
await interceptor.flushLogV2Writes(); await interceptor.closeLogV2Writes();
interceptor._stopProxyProfileWatchForTests();
const results = [];
for (const project of readdirSync(logDir, { withFileTypes: true }).filter(dir => dir.isDirectory())) {
  for (const archive of readdirSync(join(logDir, project.name)).filter(name => name.endsWith('.cxvsession'))) {
    const file = relative(logDir, join(logDir, project.name, archive, 'timeline.jsonl'));
    const entries = readV2LogEntries(logDir, file);
    const children = entries.filter(entry => entry.subAgent === true && entry.method === 'POST');
    for (const entry of children) assert.deepEqual(classifyRequest(entry), { type: 'SubAgent', subType: entry.subAgentName });
    const snapshot = readV2WireSnapshot(logDir, file, { limit: 500 });
    const view = new LogV2Archive({ ...snapshot, start: { ...snapshot.start, objectHandle: 'unused-no-hydration' } });
    const coldChildren = view.rows.filter(row => row.subAgent === true && row.method === 'POST');
    for (const row of coldChildren) assert.deepEqual(classifyRequest(row), { type: 'SubAgent', subType: row.subAgentName });
    assert.equal(coldChildren.length, children.length);
    results.push({ file, entries: entries.length, childEntries: children.length,
      childNames: [...new Set(children.map(entry => entry.subAgentName))],
      coldTypes: [...new Set(coldChildren.map(row => classifyRequest(row).type))] });
  }
}
assert.ok(results.some(result => result.childEntries > 0), 'real native child entries must be replayed');
const result = { root, framesFile, frameCount: frames.length, productionBridgeWriterAndColdReader: true,
  externalModelNetwork: false, realUserData: false, results };
writeFileSync(join(root, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
