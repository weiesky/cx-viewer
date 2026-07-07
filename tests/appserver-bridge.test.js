import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  _parseAppServerClientMessageForTests,
  _parseAppServerServerMessageForTests,
  _resetAppServerBridgeForTests,
} from '../lib/appserver-bridge.js';

function readEntries(logFile) {
  const raw = readFileSync(logFile, 'utf8');
  return raw
    .split('\n---\n')
    .filter(part => part.trim())
    .map(part => JSON.parse(part));
}

function server(method, params = {}) {
  _parseAppServerServerMessageForTests({ method, params });
}

function serverRequest(id, method, params = {}) {
  _parseAppServerServerMessageForTests({ id, method, params });
}

function serverResponse(id, result, error = null) {
  _parseAppServerServerMessageForTests(error ? { id, error } : { id, result });
}

function client(method, params = {}) {
  _parseAppServerClientMessageForTests({ id: Math.floor(Math.random() * 100000), method, params });
}

function clientResponse(id, result, error = null) {
  _parseAppServerClientMessageForTests(error ? { id, error } : { id, result });
}

test('app-server bridge marks root and spawned subagent turns correctly', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-bridge-'));
  const logFile = join(tmp, 'bridge.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', {
      cwd: tmp,
      developerInstructions: 'You are Codex',
    });
    server('thread/started', {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        preview: 'root',
      },
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'root prompt' }],
      clientUserMessageId: 'u-root',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'root-msg',
        type: 'agent_message',
        text: 'root answer',
      },
    });
    server('thread/tokenUsage/updated', {
      threadId: 'root-thread',
      tokenUsage: {
        last: {
          inputTokens: 12,
          cachedInputTokens: 4,
          outputTokens: 6,
          reasoningOutputTokens: 2,
          totalTokens: 18,
        },
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-root',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 25,
      },
    });

    server('thread/started', {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
              agent_role: 'general',
            },
          },
        },
      },
    });
    server('turn/started', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub',
        status: 'inProgress',
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-user',
        type: 'userMessage',
        content: [{ type: 'text', text: 'sub prompt' }],
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-msg',
        type: 'agent_message',
        text: 'sub answer',
      },
    });
    server('thread/tokenUsage/updated', {
      threadId: 'sub-thread',
      tokenUsage: {
        last: {
          input_tokens: 13,
          cached_input_tokens: 5,
          output_tokens: 7,
          reasoning_output_tokens: 3,
          total_tokens: 20,
        },
      },
    });
    server('turn/completed', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub',
        threadId: 'sub-thread',
        status: 'completed',
        durationMs: 31,
      },
    });

    const entries = readEntries(logFile);
    const mainEntries = entries.filter(entry => entry.method === 'POST');
    assert.equal(mainEntries.length, 2);

    const root = mainEntries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(root?.mainAgent, true);
    assert.equal(root?.subAgent, false);
    assert.equal(root?.response?.body?.content?.[0]?.text, 'root answer');
    assert.equal(root?.response?.body?.usage?.cache_read_input_tokens, 4);
    assert.equal(root?.body?.messages?.[0]?.content, 'root prompt');

    const sub = mainEntries.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(sub?.mainAgent, false);
    assert.equal(sub?.subAgent, true);
    assert.equal(sub?.subAgentName, 'researcher');
    assert.equal(sub?.teamName, 'root-thread');
    assert.equal(sub?._parentThreadId, 'root-thread');
    assert.equal(sub?.response?.body?.content?.[0]?.text, 'sub answer');
    assert.equal(sub?.response?.body?.usage?.input_tokens, 13);
    assert.equal(sub?.response?.body?.usage?.cache_read_input_tokens, 5);
    assert.equal(sub?.response?.body?.usage?.total_tokens, 20);
    assert.equal(sub?.body?.system, 'You are Codex subagent (researcher), a general-purpose agent.');
    assert.equal(sub?.body?.messages?.[0]?.content, 'sub prompt');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge remembers root and subagent thread metadata from JSON-RPC responses', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-thread-response-'));
  const logFile = join(tmp, 'bridge-thread-response.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    serverResponse(1, {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        preview: 'root from response',
        source: 'appServer',
      },
      model: 'gpt-test',
      cwd: tmp,
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'root prompt' }],
      clientUserMessageId: 'u-root-response',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-root-response', status: 'inProgress' },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: { id: 'root-msg-response', type: 'agent_message', text: 'root response answer' },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: { id: 'turn-root-response', threadId: 'root-thread', status: 'completed' },
    });

    serverResponse(2, {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
              agent_role: 'general',
              depth: 1,
            },
          },
        },
      },
      model: 'gpt-test',
      cwd: tmp,
    });
    server('turn/started', {
      threadId: 'sub-thread',
      turn: { id: 'turn-sub-response', status: 'inProgress' },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: { id: 'sub-msg-response', type: 'agent_message', text: 'sub response answer' },
    });
    server('turn/completed', {
      threadId: 'sub-thread',
      turn: { id: 'turn-sub-response', threadId: 'sub-thread', status: 'completed' },
    });

    const entries = readEntries(logFile).filter(entry => entry.method === 'POST');
    assert.equal(entries.length, 2);

    const root = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(root?.mainAgent, true);
    assert.equal(root?.subAgent, false);
    assert.equal(root?.response?.body?.content?.[0]?.text, 'root response answer');

    const sub = entries.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(sub?.mainAgent, false);
    assert.equal(sub?.subAgent, true);
    assert.equal(sub?.subAgentName, 'researcher');
    assert.equal(sub?.teamName, 'root-thread');
    assert.equal(sub?.response?.body?.content?.[0]?.text, 'sub response answer');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge hydrates completed thread turns from JSON-RPC responses', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-history-response-'));
  const logFile = join(tmp, 'bridge-history-response.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    serverResponse(11, {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        preview: 'history root',
        source: 'appServer',
        turns: [{
          id: 'turn-history-root',
          status: 'completed',
          startedAt: 1783350000,
          completedAt: 1783350002,
          durationMs: 2000,
          items: [
            {
              id: 'hist-user',
              type: 'userMessage',
              clientId: 'u-history',
              content: [{ type: 'text', text: 'inspect history' }],
            },
            {
              id: 'hist-plan',
              type: 'plan',
              text: '- Read bridge\n- Add test',
            },
            {
              id: 'hist-msg',
              type: 'agentMessage',
              text: 'history answer',
            },
          ],
        }],
      },
      model: 'gpt-test',
      cwd: tmp,
    });

    serverResponse(12, {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
              agent_role: 'general',
              depth: 1,
            },
          },
        },
        turns: [{
          id: 'turn-history-sub',
          status: 'completed',
          startedAt: 1783350010,
          completedAt: 1783350011,
          durationMs: 1000,
          items: [
            {
              id: 'hist-sub-user',
              type: 'userMessage',
              clientId: 'u-history-sub',
              content: [{ type: 'text', text: 'sub inspect' }],
            },
            {
              id: 'hist-sub-msg',
              type: 'agentMessage',
              text: 'sub history answer',
            },
          ],
        }],
      },
      model: 'gpt-test',
      cwd: tmp,
    });

    // A repeated response with the same turn id must not duplicate history entries.
    serverResponse(13, {
      thread: {
        id: 'root-thread',
        cwd: tmp,
        source: 'appServer',
        turns: [{
          id: 'turn-history-root',
          status: 'completed',
          items: [{ id: 'hist-msg-dup', type: 'agentMessage', text: 'duplicate' }],
        }],
      },
      model: 'gpt-test',
      cwd: tmp,
    });

    const entries = readEntries(logFile);
    const turns = entries.filter(entry => entry.method === 'POST');
    assert.equal(turns.length, 2);

    const root = turns.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(root?._codexHistorySource, true);
    assert.equal(root?.isStream, false);
    assert.equal(root?.mainAgent, true);
    assert.equal(root?.body?.messages?.[0]?.content, 'inspect history');
    const rootPlan = root?.response?.body?.content?.find(block => block.type === 'tool_use' && block.name === 'ExitPlanMode');
    assert.equal(rootPlan?.input?.nonInteractive, true);
    assert.equal(rootPlan?.input?.plan, '- Read bridge\n- Add test');
    const rootText = root?.response?.body?.content?.find(block => block.type === 'text');
    assert.equal(rootText?.text, 'history answer');

    const sub = turns.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(sub?._codexHistorySource, true);
    assert.equal(sub?.mainAgent, false);
    assert.equal(sub?.subAgent, true);
    assert.equal(sub?.subAgentName, 'researcher');
    assert.equal(sub?.teamName, 'root-thread');
    assert.equal(sub?.response?.body?.content?.[0]?.text, 'sub history answer');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records tool-like items with root and subagent identity', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-tools-'));
  const logFile = join(tmp, 'bridge-tools.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', {
      thread: {
        id: 'root-thread',
        cwd: tmp,
      },
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'run pwd' }],
      clientUserMessageId: 'u-root-tool',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-root',
        type: 'commandExecution',
        command: 'pwd',
        aggregatedOutput: `${tmp}\n`,
        exitCode: 0,
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'root-msg',
        type: 'agentMessage',
        text: 'root command done',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-root-tool',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 40,
      },
    });

    server('thread/started', {
      thread: {
        id: 'sub-thread',
        cwd: tmp,
        source: {
          subAgent: {
            thread_spawn: {
              parent_thread_id: 'root-thread',
              agent_nickname: 'researcher',
            },
          },
        },
      },
    });
    server('turn/started', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub-tool',
        status: 'inProgress',
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-user',
        type: 'userMessage',
        content: [{ type: 'text', text: 'query mcp' }],
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'mcp-sub',
        type: 'mcpToolCall',
        server: 'docs',
        tool: 'search',
        arguments: { q: 'Codex' },
        result: {
          content: [{ type: 'text', text: 'found' }],
          structured_content: { count: 1 },
        },
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'sub-thread',
      item: {
        id: 'sub-msg',
        type: 'agentMessage',
        text: 'sub mcp done',
      },
    });
    server('turn/completed', {
      threadId: 'sub-thread',
      turn: {
        id: 'turn-sub-tool',
        threadId: 'sub-thread',
        status: 'completed',
        durationMs: 45,
      },
    });

    const entries = readEntries(logFile);
    const rootTool = entries.find(entry => entry.body?.tool_name === 'Bash');
    assert.equal(rootTool?.method, 'TOOL');
    assert.equal(rootTool?.mainAgent, false);
    assert.equal(rootTool?.subAgent, false);
    assert.equal(rootTool?.body?.tool_input?.command, 'pwd');
    assert.equal(rootTool?.response?.body?.output?.exitCode, 0);

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.mainAgent, true);
    assert.equal(rootTurn?.body?.messages?.[1]?.content?.[0]?.name, 'Bash');
    assert.equal(rootTurn?.body?.messages?.[2]?.content?.[0]?.type, 'tool_result');
    assert.equal(rootTurn?.response?.body?.content?.[0]?.text, 'root command done');

    const subTool = entries.find(entry => entry.body?.tool_name === 'docs.search');
    assert.equal(subTool?.method, 'TOOL');
    assert.equal(subTool?.mainAgent, false);
    assert.equal(subTool?.subAgent, true);
    assert.equal(subTool?.subAgentName, 'researcher');
    assert.equal(subTool?.teamName, 'root-thread');
    assert.deepEqual(subTool?.body?.tool_input, { q: 'Codex' });

    const subTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'sub-thread');
    assert.equal(subTurn?.mainAgent, false);
    assert.equal(subTurn?.subAgent, true);
    assert.equal(subTurn?.body?.messages?.[1]?.content?.[0]?.name, 'docs.search');
    assert.equal(subTurn?.body?.messages?.[2]?.content?.[0]?.type, 'tool_result');
    assert.equal(subTurn?.response?.body?.content?.[0]?.text, 'sub mcp done');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge folds v2 streaming deltas into completed tool entries', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-deltas-'));
  const logFile = join(tmp, 'bridge-deltas.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', {
      thread: {
        id: 'root-thread',
        cwd: tmp,
      },
    });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'edit and query' }],
      clientUserMessageId: 'u-deltas',
    });

    server('item/commandExecution/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'cmd-1',
      delta: 'line one\n',
    });
    server('item/commandExecution/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'cmd-1',
      delta: 'line two\n',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-1',
        type: 'commandExecution',
        command: 'printf lines',
        cwd: tmp,
        commandActions: [],
        aggregatedOutput: null,
        exitCode: 0,
        status: 'completed',
      },
    });
    server('command/exec/outputDelta', {
      processId: 'proc-1',
      stream: 'stdout',
      deltaBase64: Buffer.from('pty output\n', 'utf8').toString('base64'),
      capReached: false,
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-2',
        type: 'commandExecution',
        command: 'pty command',
        cwd: tmp,
        commandActions: [],
        processId: 'proc-1',
        aggregatedOutput: null,
        exitCode: 0,
        status: 'completed',
      },
    });

    const patchChanges = [{
      path: join(tmp, 'file.txt'),
      kind: { type: 'update', move_path: null },
      diff: '@@ -1 +1 @@\n-old\n+new\n',
    }];
    server('item/fileChange/patchUpdated', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'patch-1',
      changes: patchChanges,
    });
    server('item/fileChange/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'patch-1',
      delta: 'applied patch',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'patch-1',
        type: 'fileChange',
        changes: [],
        status: 'completed',
      },
    });

    server('item/mcpToolCall/progress', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'mcp-1',
      message: 'connecting',
    });
    server('item/mcpToolCall/progress', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      itemId: 'mcp-1',
      message: 'running query',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'mcp-1',
        type: 'mcpToolCall',
        server: 'docs',
        tool: 'lookup',
        arguments: { topic: 'Codex' },
        result: { content: [{ type: 'text', text: 'ok' }] },
        status: 'completed',
      },
    });
    server('turn/plan/updated', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      explanation: 'Implementation plan',
      plan: [
        { step: 'Patch bridge', status: 'completed' },
        { step: 'Run tests', status: 'inProgress' },
      ],
    });
    server('turn/diff/updated', {
      threadId: 'root-thread',
      turnId: 'turn-deltas',
      diff: 'diff --git a/file.txt b/file.txt\n',
    });

    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'root-msg',
        type: 'agentMessage',
        text: 'done',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-deltas',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 50,
      },
    });

    const entries = readEntries(logFile);

    const command = entries.find(entry => entry.body?.tool_name === 'Bash' && entry.body?.tool_input?.command === 'printf lines');
    assert.equal(command?.response?.body?.output?.output, 'line one\nline two\n');

    const ptyCommand = entries.find(entry => entry.body?.tool_name === 'Bash' && entry.body?.tool_input?.command === 'pty command');
    assert.equal(ptyCommand?.response?.body?.output?.output, 'pty output\n');

    const patch = entries.find(entry => entry.body?.tool_name === 'apply_patch');
    assert.deepEqual(patch?.body?.tool_input?.changes, patchChanges);
    assert.deepEqual(patch?.response?.body?.output?.changes, patchChanges);
    assert.equal(patch?.response?.body?.output?.output, 'applied patch');

    const mcp = entries.find(entry => entry.body?.tool_name === 'docs.lookup');
    assert.deepEqual(mcp?.response?.body?.output?.progress, ['connecting', 'running query']);
    assert.deepEqual(mcp?.response?.body?.output?.result, { content: [{ type: 'text', text: 'ok' }] });

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.mainAgent, true);
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'done');
    const planTool = rootTurn?.response?.body?.content?.find(block => block.type === 'tool_use' && block.name === 'ExitPlanMode');
    assert.equal(planTool?.input?.codexTurnPlan, true);
    assert.match(planTool?.input?.plan, /Implementation plan/);
    assert.deepEqual(rootTurn?.response?.body?.turn_plan, {
      explanation: 'Implementation plan',
      plan: [
        { step: 'Patch bridge', status: 'completed' },
        { step: 'Run tests', status: 'inProgress' },
      ],
    });
    assert.equal(rootTurn?.response?.body?.turn_diff, 'diff --git a/file.txt b/file.txt\n');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge accepts Codex canonical snake_case item payloads', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-snake-items-'));
  const logFile = join(tmp, 'bridge-snake-items.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'exercise canonical sdk items' }],
      clientUserMessageId: 'u-snake-items',
    });

    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-snake',
        type: 'command_execution',
        command: 'printf hi',
        aggregated_output: 'hi\n',
        exit_code: 0,
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'patch-snake',
        type: 'file_change',
        changes: [{ path: 'src/file.js', kind: 'update' }],
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'mcp-snake',
        type: 'mcp_tool_call',
        server: 'docs',
        tool: 'lookup',
        arguments: { topic: 'Codex SDK' },
        result: {
          content: [{ type: 'text', text: 'ok' }],
          structured_content: { ok: true },
        },
        status: 'completed',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'web-snake',
        type: 'web_search',
        query: 'Codex SDK events',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'todo-snake',
        type: 'todo_list',
        items: [
          { text: 'Inspect canonical events', completed: true },
          { text: 'Patch bridge aliases', completed: false },
        ],
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'err-snake',
        type: 'error',
        message: 'non-fatal warning',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'msg-snake',
        type: 'agent_message',
        text: 'done with canonical items',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-snake',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 45,
      },
    });

    const entries = readEntries(logFile);
    const command = entries.find(entry => entry.body?.tool_name === 'Bash' && entry.body?.tool_input?.command === 'printf hi');
    assert.equal(command?.response?.body?.output?.output, 'hi\n');
    assert.equal(command?.response?.body?.output?.exitCode, 0);

    const patch = entries.find(entry => entry.body?.tool_name === 'apply_patch');
    assert.deepEqual(patch?.body?.tool_input?.changes, [{ path: 'src/file.js', kind: 'update' }]);

    const mcp = entries.find(entry => entry.body?.tool_name === 'docs.lookup');
    assert.deepEqual(mcp?.body?.tool_input, { topic: 'Codex SDK' });
    assert.deepEqual(mcp?.response?.body?.output?.structured_content, { ok: true });

    const webSearch = entries.find(entry => entry.body?.tool_name === 'web_search');
    assert.deepEqual(webSearch?.body?.tool_input, { query: 'Codex SDK events' });

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    const text = rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text || '';
    assert.match(text, /\[x\] Inspect canonical events/);
    assert.match(text, /\[ \] Patch bridge aliases/);
    assert.match(text, /Error: non-fatal warning/);
    assert.match(text, /done with canonical items/);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge uses item/updated snapshots to complete sparse Codex items', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-item-updates-'));
  const logFile = join(tmp, 'bridge-item-updates.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'exercise item updates' }],
      clientUserMessageId: 'u-item-updates',
    });

    server('item/updated', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-updated',
        type: 'command_execution',
        command: 'printf updated',
        aggregated_output: 'updated\n',
        status: 'in_progress',
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'cmd-updated',
        type: 'command_execution',
        status: 'completed',
        exit_code: 0,
      },
    });
    server('item/updated', {
      threadId: 'root-thread',
      item: {
        id: 'msg-updated-only',
        type: 'agent_message',
        text: 'answer from updated-only message',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-item-updates',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 35,
      },
    });

    const entries = readEntries(logFile);
    const command = entries.find(entry => entry.body?.tool_name === 'Bash' && entry.body?.tool_input?.command === 'printf updated');
    assert.equal(command?.response?.body?.output?.output, 'updated\n');
    assert.equal(command?.response?.body?.output?.exitCode, 0);

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'answer from updated-only message');
    assert.equal(rootTurn?.body?.messages?.some(msg =>
      msg.role === 'assistant'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_use' && block.name === 'Bash' && block.id === 'cmd-updated')
    ), true);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge emits plan-only turns from v2 turn plan updates', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-plan-only-'));
  const logFile = join(tmp, 'bridge-plan-only.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'make a plan' }],
      clientUserMessageId: 'u-plan-only',
    });
    server('turn/plan/updated', {
      threadId: 'root-thread',
      turnId: 'turn-plan-only',
      explanation: null,
      plan: [
        { step: 'Inspect code', status: 'completed' },
        { step: 'Patch parser', status: 'pending' },
      ],
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-plan-only',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 20,
      },
    });

    const entries = readEntries(logFile);
    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.mainAgent, true);
    const planTool = rootTurn?.response?.body?.content?.find(block => block.type === 'tool_use' && block.name === 'ExitPlanMode');
    assert.equal(planTool?.input?.codexTurnPlan, true);
    assert.equal(planTool?.input?.nonInteractive, true);
    assert.match(planTool?.input?.plan, /Inspect code/);
    assert.deepEqual(rootTurn?.response?.body?.turn_plan?.plan, [
      { step: 'Inspect code', status: 'completed' },
      { step: 'Patch parser', status: 'pending' },
    ]);
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge maps Codex request_user_input to AskUserQuestion transcript', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-ask-'));
  const logFile = join(tmp, 'bridge-ask.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'ask me before continuing' }],
      clientUserMessageId: 'u-ask',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-ask', status: 'inProgress' },
    });

    serverRequest('ask-jsonrpc-1', 'item/tool/requestUserInput', {
      threadId: 'root-thread',
      turnId: 'turn-ask',
      itemId: 'ask-item-1',
      autoResolutionMs: 60000,
      questions: [{
        id: 'choice',
        header: 'Choice',
        question: 'Proceed?',
        options: [
          { label: 'Yes', description: 'Continue now.' },
          { label: 'No', description: 'Stop here.' },
        ],
      }],
    });
    clientResponse('ask-jsonrpc-1', {
      answers: {
        choice: { answers: ['Yes'] },
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'answer',
        type: 'agentMessage',
        text: 'continuing',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-ask',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 30,
      },
    });

    const entries = readEntries(logFile);
    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    const askMessage = rootTurn?.body?.messages?.find(msg =>
      msg.role === 'assistant'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_use' && block.name === 'AskUserQuestion')
    );
    const askTool = askMessage?.content?.find(block => block.type === 'tool_use' && block.name === 'AskUserQuestion');
    assert.equal(askTool?.id, 'ask-item-1');
    assert.equal(askTool?.input?.codexRequestUserInput, true);
    assert.equal(askTool?.input?.questions?.[0]?.question, 'Proceed?');
    assert.equal(askTool?.input?.questions?.[0]?.options?.[0]?.label, 'Yes');

    const askResultMessage = rootTurn?.body?.messages?.find(msg =>
      msg.role === 'user'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_result' && block.tool_use_id === 'ask-item-1')
    );
    const askResult = askResultMessage?.content?.find(block => block.type === 'tool_result');
    assert.equal(askResult?.content, '"Proceed?"="Yes"');
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'continuing');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge maps MCP elicitation requests to AskUserQuestion transcript', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-mcp-ask-'));
  const logFile = join(tmp, 'bridge-mcp-ask.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'ask mcp server' }],
      clientUserMessageId: 'u-mcp-ask',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-mcp-ask', status: 'inProgress' },
    });

    serverRequest('mcp-ask-jsonrpc-1', 'mcpServer/elicitation/request', {
      threadId: 'root-thread',
      turnId: 'turn-mcp-ask',
      serverName: 'deploy',
      mode: 'form',
      message: 'Choose deployment options',
      requestedSchema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            title: 'Environment',
            description: 'Target environment',
            oneOf: [
              { const: 'staging', title: 'Staging' },
              { const: 'production', title: 'Production' },
            ],
          },
          features: {
            type: 'array',
            title: 'Features',
            items: {
              anyOf: [
                { const: 'logs', title: 'Logs' },
                { const: 'metrics', title: 'Metrics' },
              ],
            },
          },
        },
        required: ['environment'],
      },
      _meta: null,
    });
    clientResponse('mcp-ask-jsonrpc-1', {
      action: 'accept',
      content: {
        environment: 'staging',
        features: ['logs', 'metrics'],
      },
      _meta: null,
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'mcp-answer',
        type: 'agentMessage',
        text: 'mcp continuing',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-mcp-ask',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 40,
      },
    });

    const entries = readEntries(logFile);
    const requestEntry = entries.find(entry => entry.method === 'SERVER_REQUEST'
      && entry.body?.server_request_method === 'mcpServer/elicitation/request');
    assert.equal(requestEntry?.body?.server_request_kind, 'elicitation');
    const responseEntry = entries.find(entry => entry.method === 'SERVER_RESPONSE'
      && entry.body?.server_request_method === 'mcpServer/elicitation/request');
    assert.equal(responseEntry?.response?.body?.action, 'accept');

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    const askMessage = rootTurn?.body?.messages?.find(msg =>
      msg.role === 'assistant'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_use' && block.name === 'AskUserQuestion')
    );
    const askTool = askMessage?.content?.find(block => block.type === 'tool_use' && block.name === 'AskUserQuestion');
    assert.equal(askTool?.id, 'mcp-elicitation-mcp-ask-jsonrpc-1');
    assert.equal(askTool?.input?.codexMcpElicitation, true);
    assert.equal(askTool?.input?.questions?.[0]?.header, 'deploy MCP');
    assert.equal(askTool?.input?.questions?.[0]?.options?.[0]?.label, 'Staging');
    assert.equal(askTool?.input?.questions?.[1]?.multiSelect, true);
    assert.equal(askTool?.input?.questions?.[1]?.options?.[1]?.label, 'Metrics');

    const askResultMessage = rootTurn?.body?.messages?.find(msg =>
      msg.role === 'user'
      && Array.isArray(msg.content)
      && msg.content.some(block => block.type === 'tool_result' && block.tool_use_id === 'mcp-elicitation-mcp-ask-jsonrpc-1')
    );
    const askResult = askResultMessage?.content?.find(block => block.type === 'tool_result');
    assert.ok(askResult?.content?.includes('Environment\nTarget environment"="Staging"'));
    assert.ok(askResult?.content?.includes('Features"="Logs, Metrics"'));
    assert.equal(rootTurn?.response?.body?.content?.find(block => block.type === 'text')?.text, 'mcp continuing');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records turn/steer input inside the active Codex turn', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-turn-steer-'));
  const logFile = join(tmp, 'bridge-turn-steer.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'initial prompt' }],
      clientUserMessageId: 'u-steer-start',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-steer', status: 'inProgress' },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'partial-answer',
        type: 'agent_message',
        text: 'partial before steer',
      },
    });
    client('turn/steer', {
      threadId: 'root-thread',
      expectedTurnId: 'turn-steer',
      input: [{ type: 'text', text: 'extra steer context' }],
      clientUserMessageId: 'u-steer-extra',
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'final-answer',
        type: 'agent_message',
        text: 'final after steer',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-steer',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 40,
      },
    });

    const entries = readEntries(logFile);
    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.body?.metadata?.turn_id, 'turn-steer');
    assert.equal(rootTurn?.body?.messages?.[0]?.role, 'user');
    assert.equal(rootTurn?.body?.messages?.[0]?.content, 'initial prompt');
    assert.equal(rootTurn?.body?.messages?.[1]?.role, 'assistant');
    assert.equal(rootTurn?.body?.messages?.[1]?.content?.[0]?.text, 'partial before steer');
    assert.equal(rootTurn?.body?.messages?.[2]?.role, 'user');
    assert.equal(rootTurn?.body?.messages?.[2]?.content, 'extra steer context');
    assert.equal(rootTurn?.response?.body?.content?.[0]?.text, 'final after steer');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records Codex approval server requests and responses', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-approval-request-'));
  const logFile = join(tmp, 'bridge-approval-request.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-test',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-test',
      cwd: tmp,
      input: [{ type: 'text', text: 'run command that needs approval' }],
      clientUserMessageId: 'u-approval',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-approval', status: 'inProgress' },
    });

    serverRequest('approval-jsonrpc-1', 'item/commandExecution/requestApproval', {
      threadId: 'root-thread',
      turnId: 'turn-approval',
      itemId: 'cmd-approval',
      startedAtMs: 123456,
      environmentId: 'env-1',
      approvalId: null,
      command: 'npm test',
      cwd: tmp,
      reason: 'Command needs approval.',
      commandActions: [{ action: 'run', command: 'npm test' }],
    });
    clientResponse('approval-jsonrpc-1', { decision: 'approved' });
    server('serverRequest/resolved', {
      threadId: 'root-thread',
      requestId: 'approval-jsonrpc-1',
    });
    server('hook/started', {
      threadId: 'root-thread',
      turnId: 'turn-approval',
      run: {
        id: 'hook-1',
        eventName: 'permissionRequest',
        handlerType: 'command',
        executionMode: 'foreground',
        scope: 'user',
        sourcePath: join(tmp, 'hook.sh'),
        source: { type: 'config' },
        displayOrder: 0,
        status: 'running',
        statusMessage: null,
        startedAt: 123456,
        completedAt: null,
        durationMs: null,
        entries: [],
      },
    });
    server('hook/completed', {
      threadId: 'root-thread',
      turnId: 'turn-approval',
      run: {
        id: 'hook-1',
        eventName: 'permissionRequest',
        handlerType: 'command',
        executionMode: 'foreground',
        scope: 'user',
        sourcePath: join(tmp, 'hook.sh'),
        source: { type: 'config' },
        displayOrder: 0,
        status: 'completed',
        statusMessage: null,
        startedAt: 123456,
        completedAt: 123500,
        durationMs: 44,
        entries: [{ stream: 'stdout', text: 'ok' }],
      },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'answer',
        type: 'agent_message',
        text: 'approval handled',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-approval',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 30,
      },
    });

    const entries = readEntries(logFile);
    const approvalRequest = entries.find(entry => entry.method === 'APPROVAL_REQUEST');
    assert.equal(approvalRequest?.body?.server_request_method, 'item/commandExecution/requestApproval');
    assert.equal(approvalRequest?.body?.server_request_id, 'approval-jsonrpc-1');
    assert.equal(approvalRequest?.body?.server_request_kind, 'approval');
    assert.equal(approvalRequest?.body?.tool_name, 'Bash');
    assert.equal(approvalRequest?.body?.tool_input?.command, 'npm test');
    assert.equal(approvalRequest?.body?._threadId, 'root-thread');
    assert.equal(approvalRequest?.body?._turnId, 'turn-approval');
    assert.equal(approvalRequest?.response, null);

    const approvalResponse = entries.find(entry => entry.method === 'SERVER_RESPONSE');
    assert.equal(approvalResponse?.body?.server_request_method, 'item/commandExecution/requestApproval');
    assert.equal(approvalResponse?.body?.server_request_id, 'approval-jsonrpc-1');
    assert.equal(approvalResponse?.body?.tool_name, 'Bash');
    assert.deepEqual(approvalResponse?.response?.body, { decision: 'approved' });

    const resolved = entries.find(entry => entry.body?.event_name === 'serverRequest.resolved');
    assert.equal(resolved?.response?.body?.requestId, 'approval-jsonrpc-1');
    assert.equal(resolved?.response?.body?.pendingMethod, 'item/commandExecution/requestApproval');
    assert.equal(resolved?.response?.body?.pendingName, 'Bash');

    const hookCompleted = entries.find(entry => entry.body?.event_name === 'hook.completed');
    assert.equal(hookCompleted?.response?.body?.run?.id, 'hook-1');
    assert.equal(hookCompleted?.response?.body?.run?.status, 'completed');

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.response?.body?.content?.[0]?.text, 'approval handled');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('app-server bridge records v2 process, model, safety, and warning events', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cxv-appserver-events-'));
  const logFile = join(tmp, 'bridge-events.jsonl');

  try {
    _resetAppServerBridgeForTests({
      logFile,
      cwd: tmp,
      project: 'bridge-project',
      model: 'gpt-original',
    });

    client('thread/start', { cwd: tmp, developerInstructions: 'You are Codex' });
    server('thread/started', { thread: { id: 'root-thread', cwd: tmp } });
    client('turn/start', {
      threadId: 'root-thread',
      model: 'gpt-original',
      cwd: tmp,
      input: [{ type: 'text', text: 'run a process and answer' }],
      clientUserMessageId: 'u-events',
    });
    server('turn/started', {
      threadId: 'root-thread',
      turn: { id: 'turn-events', status: 'inProgress' },
    });

    server('process/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      processHandle: 'proc-a',
      stream: 'stdout',
      deltaBase64: Buffer.from('hello stdout\n', 'utf8').toString('base64'),
      capReached: false,
    });
    server('process/outputDelta', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      processHandle: 'proc-a',
      stream: 'stderr',
      deltaBase64: Buffer.from('warn stderr\n', 'utf8').toString('base64'),
      capReached: true,
    });
    server('process/exited', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      processHandle: 'proc-a',
      exitCode: 0,
      stdout: '',
      stderr: '',
      stdoutCapReached: false,
      stderrCapReached: false,
    });
    server('model/rerouted', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      fromModel: 'gpt-original',
      toModel: 'gpt-rerouted',
      reason: 'highRiskCyberActivity',
    });
    server('turn/moderationMetadata', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      metadata: { categories: ['test-category'] },
    });
    server('model/verification', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      verifications: ['trustedAccessForCyber'],
    });
    server('model/safetyBuffering/updated', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      model: 'gpt-rerouted',
      fasterModel: null,
      showBufferingUi: true,
      reasons: ['policy-check'],
      useCases: ['code'],
    });
    server('warning', {
      threadId: 'root-thread',
      message: 'Careful with this action',
    });
    server('item/autoApprovalReview/started', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      reviewId: 'review-1',
      targetItemId: 'cmd-1',
      startedAtMs: 1000,
      action: { type: 'command' },
      review: { status: 'reviewing' },
    });
    server('item/autoApprovalReview/completed', {
      threadId: 'root-thread',
      turnId: 'turn-events',
      reviewId: 'review-1',
      targetItemId: 'cmd-1',
      startedAtMs: 1000,
      completedAtMs: 1100,
      decisionSource: 'agent',
      action: { type: 'command' },
      review: { status: 'approved' },
    });
    server('item/completed', {
      threadId: 'root-thread',
      item: {
        id: 'answer',
        type: 'agentMessage',
        text: 'eventful answer',
      },
    });
    server('turn/completed', {
      threadId: 'root-thread',
      turn: {
        id: 'turn-events',
        threadId: 'root-thread',
        status: 'completed',
        durationMs: 60,
      },
    });

    const entries = readEntries(logFile);

    const processEntry = entries.find(entry => entry.method === 'PROCESS');
    assert.equal(processEntry?.url, 'codex://process/proc-a');
    assert.equal(processEntry?.response?.body?.stdout, 'hello stdout\n');
    assert.equal(processEntry?.response?.body?.stderr, 'warn stderr\n');
    assert.equal(processEntry?.response?.body?.stderrCapReached, true);

    const rerouteEntry = entries.find(entry => entry.body?.event_name === 'model.rerouted');
    assert.equal(rerouteEntry?.response?.body?.toModel, 'gpt-rerouted');

    const warningEntry = entries.find(entry => entry.body?.event_name === 'warning');
    assert.equal(warningEntry?.response?.status, 299);
    assert.equal(warningEntry?.response?.body?.message, 'Careful with this action');

    const approvalEntry = entries.find(entry => entry.body?.event_name === 'item.autoApprovalReview.completed');
    assert.equal(approvalEntry?.response?.body?.decisionSource, 'agent');

    const rootTurn = entries.find(entry => entry.body?.metadata?.thread_id === 'root-thread');
    assert.equal(rootTurn?.response?.body?.model, 'gpt-rerouted');
    assert.deepEqual(rootTurn?.response?.body?.moderation_metadata, { categories: ['test-category'] });
    assert.equal(rootTurn?.response?.body?.model_reroutes?.[0]?.reason, 'highRiskCyberActivity');
    assert.deepEqual(rootTurn?.response?.body?.model_verifications?.[0]?.verifications, ['trustedAccessForCyber']);
    assert.equal(rootTurn?.response?.body?.safety_buffering?.showBufferingUi, true);
    assert.equal(rootTurn?.response?.body?.warnings?.[0]?.message, 'Careful with this action');
  } finally {
    _resetAppServerBridgeForTests();
    rmSync(tmp, { recursive: true, force: true });
  }
});
