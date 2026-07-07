import test from 'node:test';
import assert from 'node:assert/strict';

import { isMainAgent } from '../src/utils/contentFilter.js';
import { classifyRequest, formatRequestTag } from '../src/utils/requestType.js';

test('frontend classification respects Codex root and subagent flags', () => {
  const root = {
    method: 'POST',
    mainAgent: true,
    subAgent: false,
    body: {
      system: 'You are Codex, a coding agent.',
      tools: [],
      messages: [{ role: 'user', content: 'inspect the project' }],
    },
  };

  const sub = {
    method: 'POST',
    mainAgent: false,
    subAgent: true,
    subAgentName: 'researcher',
    body: {
      system: 'You are Codex subagent (researcher), a general-purpose agent.',
      tools: [],
      messages: [{ role: 'user', content: 'check references' }],
    },
  };

  assert.equal(isMainAgent(root), true);
  assert.deepEqual(classifyRequest(root), { type: 'MainAgent', subType: null });
  assert.equal(isMainAgent(sub), false);
  assert.deepEqual(classifyRequest(sub), { type: 'SubAgent', subType: 'researcher' });
  assert.equal(formatRequestTag('SubAgent', 'researcher'), 'SubAgent:researcher');
});

test('frontend classification keeps Codex synthetic tool events out of SubAgent', () => {
  const rootTool = {
    method: 'TOOL',
    url: 'codex://tool/Bash',
    mainAgent: false,
    subAgent: false,
    body: {
      tool_name: 'Bash',
      tool_input: { command: 'pwd' },
    },
  };

  assert.equal(isMainAgent(rootTool), false);
  assert.deepEqual(classifyRequest(rootTool), { type: 'Synthetic', subType: 'TOOL' });
});

test('frontend classification still rejects legacy subagent-shaped main heuristics', () => {
  const legacySubLike = {
    method: 'POST',
    body: {
      system: 'You are Codex subagent (worker), a general-purpose agent.',
      tools: [{ name: 'Edit' }, { name: 'Bash' }, { name: 'Agent' }, { name: 'Read' }, { name: 'Write' }, { name: 'ToolSearch' }],
      messages: [{ role: 'user', content: 'delegated work' }],
    },
  };

  assert.equal(isMainAgent(legacySubLike), false);
  assert.deepEqual(classifyRequest(legacySubLike), { type: 'SubAgent', subType: 'General' });
});

test('frontend classification tags Codex internal prompts as synthetic before MainAgent', () => {
  const summaryPrompt = {
    method: 'POST',
    mainAgent: true,
    subAgent: false,
    body: {
      system: 'You are Codex, a coding agent.',
      tools: [],
      messages: [{ role: 'user', content: 'Summarize this coding session in a few sentences.' }],
    },
  };

  assert.deepEqual(classifyRequest(summaryPrompt), { type: 'Synthetic', subType: 'Summary' });
});
