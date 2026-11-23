import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { listDingTalkImLogs, handleDingTalkImRoute } from '../lib/dingtalk-im-routes.js';
import { ensureProjectIdForCwd } from '../lib/log-v2/project-id.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';

function archive(root, cwd, sid, text) {
  const projectId = ensureProjectIdForCwd(root, cwd, 'IM_dingtalk');
  const writer = LogV2Writer.open({ rootDir: root, projectId, canonicalCwd: cwd, sessionId: sid, rootThreadId: sid });
  writer.append({ timestamp: new Date().toISOString(), url: 'codex://turn', method: 'POST', mainAgent: true,
    body: { input: [{ role: 'user', content: text }] } }, resolveAppServerThreadIdentity({ id: sid, sessionId: sid }));
  return relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/');
}

test('IM log list returns only validated worker archives across display-name collisions', () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-im-log-list-'));
  const cwd = join(root, 'IM_dingtalk');
  try {
    assert.deepEqual(listDingTalkImLogs(root, cwd), { project: 'IM_dingtalk', latest: null });
    const unrelated = archive(root, join(root, 'unrelated'), 'other', 'private unrelated turn');
    assert.equal(listDingTalkImLogs(root, cwd).latest, null);
    const own = archive(root, cwd, 'worker', 'IM turn');
    assert.equal(listDingTalkImLogs(root, cwd).latest, own);
    assert.notEqual(own, unrelated);
    assert.match(listDingTalkImLogs(root, cwd).project, /^IM_dingtalk--/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('IM log route returns JSON and retains worker/unsupported-platform gates', async () => {
  for (const [path, options, status] of [
    ['/api/im/dingtalk/logs', {}, 200],
    ['/api/im/feishu/logs', {}, 404],
    ['/api/im/dingtalk/logs', { isWorker: true }, 404],
  ]) {
    let body, headers, actual;
    const res = { writeHead(code, value) { actual = code; headers = value; }, end(value) { body = JSON.parse(value); } };
    assert.equal(await handleDingTalkImRoute({ method: 'GET', headers: {} }, res, new URL(path, 'http://localhost'), {
      listLogs: () => ({ project: 'IM_dingtalk', latest: 'own/timeline.jsonl' }), ...options,
    }), true);
    assert.equal(actual, status);
    assert.match(headers['Content-Type'], /application\/json/);
    if (status === 200) assert.equal(body.latest, 'own/timeline.jsonl');
  }
});
