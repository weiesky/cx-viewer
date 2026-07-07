import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  getSessionId,
  initSdkSession,
  isSdkAvailable,
  sendUserMessage,
  stopSession,
} from '../lib/sdk-manager.js';

function createFakeCodexScript(dir) {
  const script = join(dir, 'fake-codex.js');
  writeFileSync(script, `#!/usr/bin/env node
const input = await new Promise((resolve) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => data += chunk);
  process.stdin.on('end', () => resolve(data));
});
if (!input.includes('hello sdk')) {
  console.error('unexpected prompt: ' + input);
  process.exit(2);
}
const events = [
  { type: 'thread.started', thread_id: 'thread_fake_sdk' },
  { type: 'turn.started' },
  { type: 'item.completed', item: { id: 'reason_1', type: 'reasoning', text: 'checking workspace' } },
  { type: 'item.completed', item: { id: 'cmd_1', type: 'command_execution', command: 'pwd', aggregated_output: '/tmp\\\\n', exit_code: 0, status: 'completed' } },
  { type: 'item.completed', item: { id: 'msg_1', type: 'agent_message', text: 'hello from fake codex' } },
  { type: 'turn.completed', usage: { input_tokens: 11, cached_input_tokens: 3, output_tokens: 7, reasoning_output_tokens: 2 } },
];
for (const event of events) {
  process.stdout.write(JSON.stringify(event) + '\\n');
}
`, 'utf8');
  chmodSync(script, 0o755);
  return script;
}

test('sdk-manager consumes Codex SDK events and emits viewer entries', async () => {
  if (!isSdkAvailable()) {
    assert.fail('expected @openai/codex-sdk to be installed for SDK manager tests');
  }

  const tmp = mkdtempSync(join(tmpdir(), 'cxv-sdk-manager-'));
  const fakeCodex = createFakeCodexScript(tmp);
  const entries = [];
  const streamProgress = [];
  const streamingStatus = [];

  try {
    initSdkSession(tmp, 'sdk-test-project', {
      codexPath: fakeCodex,
      codexArgs: ['-m', 'gpt-test'],
      onEntry: entry => entries.push(entry),
      onStreamProgress: data => streamProgress.push(data),
      onStreamingStatus: data => streamingStatus.push(data),
      broadcastWs: () => {},
    });

    await sendUserMessage('hello sdk');

    assert.equal(getSessionId(), 'thread_fake_sdk');
    assert.equal(streamingStatus[0]?.active, true);
    assert.equal(streamingStatus.at(-1)?.active, false);
    assert.ok(streamProgress.length >= 1);

    const toolEntry = entries.find(entry => entry.method === 'TOOL');
    assert.equal(toolEntry?.mainAgent, false);
    assert.equal(toolEntry?.subAgent, false);
    assert.equal(toolEntry?.body?.tool_name, 'Bash');
    assert.equal(toolEntry?.body?.tool_input?.command, 'pwd');
    assert.equal(toolEntry?.response?.body?.output?.exit_code, 0);

    const mainEntry = entries.find(entry => entry.mainAgent === true);
    assert.equal(mainEntry?.subAgent, false);
    assert.equal(mainEntry?.project, 'sdk-test-project');
    assert.equal(mainEntry?.body?.model, 'gpt-test');
    assert.equal(mainEntry?.body?.metadata?.thread_id, 'thread_fake_sdk');
    assert.equal(mainEntry?.response?.body?.content?.[0]?.text, 'hello from fake codex');
    assert.equal(mainEntry?.response?.body?.usage?.cache_read_input_tokens, 3);
    assert.equal(mainEntry?.body?.messages?.[0]?.role, 'user');
    assert.equal(mainEntry?.body?.messages?.[1]?.content?.[0]?.type, 'thinking');
    assert.equal(mainEntry?.body?.messages?.[1]?.content?.[1]?.name, 'Bash');
    assert.equal(mainEntry?.body?.messages?.[2]?.content?.[0]?.type, 'tool_result');
  } finally {
    stopSession();
    rmSync(tmp, { recursive: true, force: true });
  }
});
