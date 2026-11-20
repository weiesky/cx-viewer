import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectToolUseBlocks,
  ToolFileChangeController,
} from '../src/components/chat/controllers/toolFileChangeController.js';

const PATCH = `*** Begin Patch
*** Update File: /project/src/current.js
@@
-old
+new
*** End Patch`;

function makeController(currentFile = 'src/current.js') {
  const host = {
    getState: () => ({ currentFile, fileExplorerOpen: false, gitChangesOpen: false }),
    setState: () => {},
    getProps: () => ({ mainAgentSessions: [], requests: [] }),
    getProjectDir: () => '/project',
    setPendingFileRefresh: () => {},
    setPendingGitRefresh: () => {},
  };
  return new ToolFileChangeController(host);
}

function makeCheckingController(mainAgentSessions, requests = []) {
  const calls = { file: 0, git: 0 };
  const host = {
    getState: () => ({ currentFile: null, fileExplorerOpen: false, gitChangesOpen: false }),
    setState: () => {},
    getProps: () => ({ mainAgentSessions, requests }),
    getProjectDir: () => '/project',
    setPendingFileRefresh: () => { calls.file++; },
    setPendingGitRefresh: () => { calls.git++; },
  };
  return { controller: new ToolFileChangeController(host), calls };
}

test('collectToolUseBlocks preserves raw exec JavaScript input', () => {
  const source = `const patch = ${JSON.stringify(PATCH)}; text(await tools.apply_patch(patch));`;
  const map = new Map();
  collectToolUseBlocks([{ type: 'tool_use', id: 'exec-1', name: 'exec', input: source }], map);
  assert.equal(map.get('exec-1').input, source);
});

test('successful exec apply_patch refreshes files, git, and the open changed file', () => {
  const source = `const patch = ${JSON.stringify(PATCH)}; text(await tools.apply_patch(patch));`;
  const controller = makeController();
  const flags = { needFileRefresh: false, needGitRefresh: false, needContentRefresh: false };
  controller._processToolResult(
    { type: 'tool_result', tool_use_id: 'exec-1', content: 'Script completed' },
    new Map([['exec-1', { name: 'exec', input: source }]]),
    flags,
  );
  assert.deepEqual(flags, { needFileRefresh: true, needGitRefresh: true, needContentRefresh: true });
});

test('failed exec result does not trigger file refresh', () => {
  const source = `const patch = ${JSON.stringify(PATCH)}; text(await tools.apply_patch(patch));`;
  const controller = makeController();
  const flags = { needFileRefresh: false, needGitRefresh: false, needContentRefresh: false };
  controller._processToolResult(
    { type: 'tool_result', tool_use_id: 'exec-failed', content: 'Script failed', is_error: true },
    new Map([['exec-failed', { name: 'exec', input: source }]]),
    flags,
  );
  assert.deepEqual(flags, { needFileRefresh: false, needGitRefresh: false, needContentRefresh: false });
});

test('controller check discovers exec patch calls in conversation messages', () => {
  const source = `const patch = ${JSON.stringify(PATCH)}; text(await tools.apply_patch(patch));`;
  const session = {
    messages: [
      { role: 'assistant', content: [{ type: 'tool_use', id: 'exec-check', name: 'exec', input: source }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'exec-check', content: 'Script completed' }] },
    ],
  };
  const { controller, calls } = makeCheckingController([session]);
  controller.check();
  controller.dispose();
  assert.deepEqual(calls, { file: 1, git: 1 });
});

function patchMessages(id) {
  return [
    { role: 'assistant', content: [{ type: 'tool_use', id, name: 'apply_patch', input: PATCH }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: id }] },
  ];
}

test('successful shell git commit refreshes file and Git panels once while failed results do not', () => {
  const messages = (id, command, is_error = false) => [
    { role: 'assistant', content: [{ type: 'tool_use', id, name: 'shell_command', input: { command } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, is_error }] },
  ];
  const session = { messages: messages('failed-commit', 'git commit -m "update"', true) };
  const { controller, calls } = makeCheckingController([session]);
  controller.check();
  assert.deepEqual(calls, { file: 0, git: 0 });
  session.messages.push(...messages('status', 'git status'));
  controller.check();
  assert.deepEqual(calls, { file: 0, git: 0 });
  session.messages.push(...messages('commit', 'git commit -m "update"'));
  controller.check();
  assert.deepEqual(calls, { file: 1, git: 1 });
  controller.check();
  assert.deepEqual(calls, { file: 1, git: 1 });
  controller.dispose();
});

test('stable long sessions scan only the tail while retaining earlier tool metadata', () => {
  let reads = 0;
  const history = Array.from({ length: 1000 }, () => ({ get role() { reads++; return 'assistant'; }, content: [] }));
  const [use, result] = patchMessages('tail');
  const session = { messages: [...history, use, { role: 'user', content: [] }] };
  const { controller, calls } = makeCheckingController([session]);
  controller.check();
  assert.equal(reads, 2000);
  assert.equal(calls.file, 0);
  reads = 0;
  session.messages.at(-1).content.push(...result.content);
  controller.check();
  assert.equal(reads, 0, 'unchanged prefix is not revisited');
  assert.equal(calls.file, 1, 'tail result resolves the tool use from the previous scan');
  session.messages.push(...patchMessages('appended'));
  controller.check();
  assert.equal(calls.file, 2);
  assert.equal(reads, 0);
  controller.resetCursors(); controller.check();
  assert.equal(calls.file, 2, 'reset preserves completed-result deduplication');
  assert.equal(reads, 2000);
  controller.dispose();
});

test('Codex request input and session array replacements rescan equal-length or shorter transcripts', () => {
  const session = { messages: patchMessages('first') };
  const request = { body: { input: patchMessages('request-first') } };
  const { controller, calls } = makeCheckingController([session], [request]);
  controller.check();
  assert.equal(calls.file, 1);
  session.messages = [...patchMessages('replacement'), { role: 'assistant', content: [] }];
  request.body.input = [...patchMessages('request-replacement'), { role: 'assistant', content: [] }];
  controller.check();
  assert.equal(calls.file, 2);
  session.messages = [...patchMessages('equal-length'), { role: 'assistant', content: [] }];
  request.body.input = [...patchMessages('request-equal-length'), { role: 'assistant', content: [] }];
  controller.check();
  assert.equal(calls.file, 3, 'new results before the tail are not lost on equal-length replacement');
  session.messages = patchMessages('shorter');
  request.body.input = patchMessages('request-shorter');
  controller.check();
  assert.equal(calls.file, 4);
  request.body.input.push(...patchMessages('request-appended'));
  controller.check();
  assert.equal(calls.file, 5);
  controller.dispose();
});

test('two-pass collection resolves a result whose tool use is in a later request source', () => {
  const [use, result] = patchMessages('cross-source');
  const { controller, calls } = makeCheckingController([{ messages: [result] }], [{ body: { input: [use] } }]);
  controller.check();
  assert.equal(calls.file, 1);
  controller.dispose();
});

test('completed-tool LRU eviction also releases retained patch payloads', () => {
  const session = { messages: [] };
  for (let index = 0; index < 20001; index++) session.messages.push(...patchMessages(`tool-${index}`));
  const { controller } = makeCheckingController([session]);
  controller.check();
  assert.equal(controller._toolUseMap.size, 20001);
  controller.check();
  assert.equal(controller._toolUseMap.size, 15000);
  assert.equal(controller._processedToolIds.size, 15000);
  assert.equal(controller._processedToolIdQueue.length, 15000);
  assert.equal(controller._toolUseMap.has('tool-0'), false);
  assert.equal(controller._toolUseMap.has('tool-20000'), true);
  controller.dispose();
});
