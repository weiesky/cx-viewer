#!/usr/bin/env node
/**
 * perm-bridge.js — Codex hook bridge for tool permission approval.
 *
 * Registered with matcher: ".*" under hooks.PermissionRequest in ~/.codex/hooks.json.
 * Reads hook payload from stdin, forwards to cx-viewer server via long-poll HTTP,
 * waits for user decision (allow/deny) in the web UI, then outputs hookSpecificOutput.
 *
 * Exit 0 = success (stdout contains hookSpecificOutput with a permission decision)
 * Exit 1 = fallback (Codex proceeds with normal terminal UI)
 */

import { readFileSync } from 'node:fs';
import http from 'node:http';

let stdinData;
try {
  stdinData = readFileSync(0, 'utf-8');
} catch {
  process.exit(1);
}

if (!stdinData || !stdinData.trim()) {
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(stdinData);
} catch {
  process.exit(1);
}

const toolName = payload?.tool_name;
const toolInput = payload?.tool_input;
const hookEventName = payload?.hook_event_name || payload?.hookEventName || payload?.event || 'PreToolUse';
const isPermissionRequest = hookEventName === 'PermissionRequest';

if (!toolName || !toolInput) {
  process.exit(1);
}

// 硬拦截：git commit/push 和 npm publish 即使在 --d (bypass) 模式下也强制走 Web UI 审批
// 这是安全底线，不受 --dangerously-skip-permissions 影响
const isShellTool = toolName === 'shell_command';
const command = isShellTool ? String(toolInput.command || '') : '';
const commandSegments = command.split(/[;&|\n]+/);
const isPublishCmd = commandSegments.some(segment => {
  const s = segment.trim();
  return (/(?:^|[\s/])git\s+.*\b(?:commit|push)\b/i.test(s)
    || /(?:^|[\s/])npm\s+.*\bpublish\b/i.test(s));
});
const bypassMode = process.env.CXV_BYPASS_PERMISSIONS === '1';
const mustFailClosed = !!isPublishCmd;

function permissionOutput(decision, reason) {
  if (isPermissionRequest) {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: decision,
          ...(reason ? { reason } : {}),
        },
      },
    };
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
    },
  };
  if (decision === 'deny' && reason) output.hookSpecificOutput.permissionDecisionReason = reason;
  return output;
}

function fallbackOutput(reason) {
  if (mustFailClosed) {
    return permissionOutput('deny', reason || 'CX Viewer manual publish approval unavailable');
  }
  return { continue: true, suppressOutput: true };
}

const port = process.env.CXVIEWER_PORT;
if (!port) {
  process.stdout.write(JSON.stringify(fallbackOutput('CX Viewer is not running')) + '\n');
  process.exit(0);
}

// Bypass mode: auto-allow all tools except publish commands
// 使用显式 allow 而非 exit(1) fallback，避免 Codex 记录 hook error 日志
if (bypassMode && !isPublishCmd) {
  process.stdout.write(JSON.stringify(permissionOutput('allow', 'CXV bypass mode')) + '\n');
  process.exit(0);
}

// request_user_input is handled by the native app-server JSON-RPC bridge.
if (toolName === 'request_user_input') {
  const output = isPermissionRequest
    ? { continue: true, suppressOutput: true }
    : { hookSpecificOutput: { hookEventName: 'PreToolUse' } };
  process.stdout.write(JSON.stringify(output) + '\n');
  process.exit(0);
}

// These tools need explicit user approval via Web UI (mutating or external access).
const APPROVAL_TOOLS = new Set([
  'shell_command',
  'apply_patch',
  'web_search',
  'image_generation',
]);
if (!APPROVAL_TOOLS.has(toolName)) {
  const output = isPermissionRequest
    ? { continue: true, suppressOutput: true }
    : permissionOutput('allow');
  process.stdout.write(JSON.stringify(output) + '\n');
  process.exit(0);
}

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function postToViewer() {
  return new Promise((resolve, reject) => {
    // Publishing is a CX Viewer human-only safety boundary in every mode.
    const forceManual = !!isPublishCmd;
    const body = JSON.stringify({ toolName, input: toolInput, forceManual });
    const req = http.request({
      hostname: '127.0.0.1',
      port: Number(port),
      path: '/api/perm-hook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid response JSON'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.write(body);
    req.end();
  });
}

try {
  const data = await postToViewer();
  if (data.deferToCodex === true) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
    process.exit(0);
  }
  const decision = data.decision === 'allow' ? 'allow' : 'deny';

  const output = permissionOutput(decision, decision === 'deny' ? 'User denied via cx-viewer' : 'User approved via cx-viewer');
  process.stdout.write(JSON.stringify(output) + '\n');
  process.exit(0);
} catch (err) {
  // In bypass mode a publish command has no native approval fallback, so any
  // bridge failure must deny. Other modes can safely return control to Codex.
  process.stderr.write(`perm-bridge: ${err.message} (${mustFailClosed ? 'denying protected publish command' : 'falling back to terminal UI'})\n`);
  process.stdout.write(JSON.stringify(fallbackOutput()) + '\n');
  process.exit(0);
}
