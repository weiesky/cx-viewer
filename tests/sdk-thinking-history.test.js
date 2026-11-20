import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';

test('SDK thinking stays with each assistant turn through subsequent input and canonical cold replay', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cxv-sdk-thinking-'));
  const previous = Object.fromEntries(['HOME', 'CODEX_HOME', 'CXV_LOG_DIR', 'CXV_PROJECT_DIR', 'CXV_TEST', 'CXV_CAPTURE_ONLY']
    .map(key => [key, process.env[key]]));
  const cwd = join(root, 'same'), logDir = join(root, 'logs'); mkdirSync(cwd);
  Object.assign(process.env, { HOME: root, CODEX_HOME: root, CXV_LOG_DIR: logDir,
    CXV_PROJECT_DIR: cwd, CXV_TEST: '1', CXV_CAPTURE_ONLY: '1' });
  const sdk = await import('../packages/app/lib/sdk-manager.js');
  const { LogV2Writer } = await import('../packages/app/lib/log-v2/writer.js');
  const { resolveIngestionSourceIdentity } = await import('../packages/app/lib/log-v2/identity.js');
  const { readV2LogEntries } = await import('../packages/app/lib/log-v2/materializer.js');
  const { normalizeConversationEntry } = await import('../apps/web/src/utils/conversationEntryNormalize.js');
  const { mergeMainAgentSessions } = await import('../apps/web/src/utils/sessionMerge.js');
  const executable = join(root, 'fake-codex.mjs');
  writeFileSync(executable, `#!/usr/bin/env node
let prompt=''; for await (const chunk of process.stdin) prompt+=chunk;
const n=prompt.includes('SECOND')?'SECOND':'FIRST';
for(const event of [
 {type:'thread.started',thread_id:'thinking-thread'}, {type:'turn.started'},
 {type:'item.completed',item:{id:'reason-'+n,type:'reasoning',text:'THINK_'+n}},
 {type:'item.completed',item:{id:'answer-'+n,type:'agent_message',text:'ANSWER_'+n}},
 {type:'turn.completed',usage:{input_tokens:2,output_tokens:2}}
]) process.stdout.write(JSON.stringify(event)+'\\n');
`); chmodSync(executable, 0o755);
  try {
    const entries = [];
    const view = sdk.initSdkSession(cwd, 'same', { codexPath: executable, onEntry: entry => entries.push(entry) });
    await sdk.sendUserMessage('FIRST', view); await sdk.sendUserMessage('SECOND', view);
    const main = entries.filter(entry => entry.mainAgent === true);
    assert.equal(main.length, 2);
    const capturedContent = () => JSON.stringify(main.map(entry => ({
      input: entry.body.input.map(message => ({ role: message.role, content: message.content })), response: entry.response.body,
    })));
    const before = capturedContent();
    const thinking = messages => messages.filter(message => message.role === 'assistant')
      .flatMap(message => Array.isArray(message.content) ? message.content : [])
      .filter(block => block.type === 'thinking').map(block => block.thinking);
    assert.deepEqual(thinking(main[1].body.input), ['THINK_FIRST']);
    assert.deepEqual(main[1].response.body.content.filter(block => block.type === 'thinking').map(block => block.thinking), ['THINK_SECOND']);
    const writer = LogV2Writer.open({ rootDir: logDir, canonicalCwd: cwd, projectId: 'same',
      sessionId: 'thinking-thread', rootThreadId: 'thinking-thread', source: 'sdk', durability: 'buffered' });
    for (const entry of main) writer.append(entry, resolveIngestionSourceIdentity(entry, { source: 'sdk' }));
    const file = relative(logDir, join(writer.sessionDir, 'timeline.jsonl'));
    for (const source of [main, readV2LogEntries(logDir, file)]) {
      let sessions = [];
      for (const entry of source) sessions = mergeMainAgentSessions(sessions, normalizeConversationEntry(entry));
      assert.equal(sessions.length, 1);
      assert.deepEqual(thinking(sessions[0].messages), ['THINK_FIRST', 'THINK_SECOND']);
      assert.deepEqual(sessions[0].messages.filter(message => message.role === 'assistant')
        .flatMap(message => message.content).filter(block => block.type === 'text').map(block => block.text), ['ANSWER_FIRST', 'ANSWER_SECOND']);
    }
    assert.equal(capturedContent(), before, 'projection may stamp provenance, but must not mutate captured input/response content');
  } finally {
    sdk.stopSession();
    (await import('../packages/app/interceptor.js'))._stopProxyProfileWatchForTests();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
});
