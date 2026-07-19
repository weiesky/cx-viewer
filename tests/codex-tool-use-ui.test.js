import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { formatCodexInternalRequestTag, getCodexMcpToolUseName, getCodexToolUseName } from '../src/utils/requestType.js';

const requestList = readFileSync(new URL('../src/components/dashboard/RequestList.jsx', import.meta.url), 'utf8');
const detailPanel = readFileSync(new URL('../src/components/dashboard/DetailPanel.jsx', import.meta.url), 'utf8');

test('recognizes only concrete codex tool-use URLs and decodes their names', () => {
  assert.equal(getCodexToolUseName({ url: 'codex://tool/shell_command' }), 'shell_command');
  assert.equal(getCodexToolUseName({ url: 'codex://tool/mcp%20search?seq=1' }), 'mcp search');
  assert.equal(getCodexToolUseName({ url: 'codex://tool_result/call-1' }), null);
  assert.equal(getCodexToolUseName({ url: 'codex://mcp_tool/read' }), null);
  assert.equal(getCodexToolUseName({ url: 'codex://tool/' }), null);
});

test('recognizes concrete MCP tool-use URLs separately', () => {
  assert.equal(getCodexMcpToolUseName({ url: 'codex://mcp_tool/js' }), 'js');
  assert.equal(getCodexMcpToolUseName({ url: 'codex://mcp_tool/read%20resource?seq=1' }), 'read resource');
  assert.equal(getCodexMcpToolUseName({ url: 'codex://tool/js' }), null);
  assert.equal(getCodexMcpToolUseName({ url: 'codex://tool_result/call-1' }), null);
});

test('formats other Codex internal events by their URL behavior', () => {
  assert.equal(formatCodexInternalRequestTag({ url: 'codex://collab/wait' }), 'collab:wait');
  assert.equal(formatCodexInternalRequestTag({ url: 'codex://turn/moderationMetadata' }), 'turn:moderationMetadata');
  assert.equal(formatCodexInternalRequestTag({ url: 'codex://event/contextCompaction' }), 'event:contextCompaction');
  assert.equal(formatCodexInternalRequestTag({ url: 'codex://warning/deprecation%20notice' }), 'warning:deprecation notice');
  assert.equal(formatCodexInternalRequestTag({ url: 'https://example.com/collab/wait' }), null);
});

test('request list labels tool-use rows and detail panel omits their Context tab', () => {
  assert.match(requestList, /formatCodexInternalRequestTag\(req\)/);
  assert.match(requestList, /\{codexInternalTag\}/);
  assert.match(detailPanel, /!hideContextForToolUse \? \[\{/);
  assert.match(detailPanel, /const activeTab = resolveDetailTabForRequest\(currentTab, request\)/);
  assert.match(detailPanel, /activeKey=\{activeTab\}/);
});
