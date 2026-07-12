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

function makeCheckingController(mainAgentSessions) {
  const calls = { file: 0, git: 0 };
  const host = {
    getState: () => ({ currentFile: null, fileExplorerOpen: false, gitChangesOpen: false }),
    setState: () => {},
    getProps: () => ({ mainAgentSessions, requests: [] }),
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
