# CX Viewer TODO

This file tracks conversion work intentionally deferred while the first pass focuses on Codex message parsing and the Web terminal.

## Deferred Conversion Work

- Electron desktop mode: keep it out of scope for now, including multi-tab behavior, desktop update flow, signing, packaging, and Electron-only zoom/notification paths.
- Full UI text cleanup: continue replacing old Claude/Anthropic wording in non-core UI strings after the parsing and terminal paths are stable.
- Concepts and docs: the main tool catalog has been rechecked from the Codex app-server perspective, with English and Chinese docs split into native `ThreadItem`/server-request events, compatibility tools, and deferred names. Other locales still contain old cc-viewer / Claude Code / Anthropic API wording and need a separate translation pass.
- Compatibility keys and comments: old `ccv`, `cc-viewer`, `ANTHROPIC_*`, and `~/.claude` compatibility references should be reviewed deliberately before removal so existing user data is not broken.
- Advanced feature mapping: IM/DingTalk/Discord integrations, Agent Team/UltraPlan flows, plugin/cloud/deploy paths, and team-oriented tools still need Codex-specific behavior review.
- Request/response visualizations: base turn/item coverage now includes command, fileChange, MCP progress, turn plan/diff, process output, model reroute, moderation metadata, model verification/safety buffering, warnings, auto-approval review events, hook start/completion events, Codex requestUserInput prompts, Codex turn plans, same-turn `turn/steer` user input, SDK/JSON canonical snake_case item aliases, `item/updated` snapshot fallback for sparse completed items, thread metadata learned from both `thread/started` notifications and JSON-RPC `result.thread` responses, completed `Thread.turns` history hydration from resume/fork/read-style responses, app-server server-request logs for command/file/permission approvals, dynamic tool calls, and MCP elicitations, plus `serverRequest/resolved` lifecycle notifications. Still defer account/app list, filesystem browser, realtime audio/transcript, OAuth, fuzzy search, and Windows sandbox setup notifications until the related UI paths are migrated.
- Chat mapping: base compatibility is in place. Codex `item/tool/requestUserInput` and MCP `mcpServer/elicitation/request` now map to the existing `AskUserQuestion` transcript shape, and both realtime `turn/plan/updated` plus historical `ThreadItem` `type:"plan"` map to a non-interactive `ExitPlanMode` plan card that renders as resolved plan content instead of a pending approval. Continue adapting richer Codex-native user/assistant/tool content and any future interactive plan approval flow exposed by the app-server schema.
- Tool catalog follow-up: keep `TeamCreate`, `TeamDelete`, task-list tools, workflow/monitor/cron tools, `ToolSearch`, `ExitWorktree`, and LSP-style names out of the main catalog until their current Codex surface is verified. Specialized viewer panels may still parse legacy occurrences.
- Packaging polish: verify npm package contents, global install behavior, and command documentation around `cxv` after the remaining conversion passes.
- Assets and screenshots: refresh old images, badges, and examples that still show the original project branding.

## Current Focus

- Codex app-server message parsing is covered by tests for root/subagent turns, thread metadata from JSON-RPC responses, completed `Thread.turns` history hydration, streaming deltas, same-turn `turn/steer` input, `item/updated` snapshots, camelCase and snake_case tool items, process/model/safety/warning events, requestUserInput, MCP elicitation ask-card mapping, server request approval logging/resolution, hook lifecycle events, and turn plans. Protocol checks use the current Codex manual plus generated app-server schema from the local `@openai/codex` package.
- Web terminal startup through `cxv -d` has been verified in the browser: the right-side xterm renders the live Codex TUI (`OpenAI Codex`, cwd, permission state), and `/api/terminal-history`/PTY replay state is now covered by `tests/pty-manager.test.js`.
- The Node test harness runs with `CXV_TEST=1` so proxy/interceptor/server startup side effects stay disabled during unit tests; this keeps app-server parsing and SDK session tests from leaking live handles.
