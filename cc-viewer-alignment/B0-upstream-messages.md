# B0 上游完整提交说明

逐条保留 337 个上游提交原始说明，按提交时间升序；内容为上游作者陈述，不能作为本地能力已经存在或安全性已验证的证据。大批量 squash/merge 提交即使标题单一，也可能包含多个功能和后续修复。

<a id="message-3eb16102e5"></a>
## [3eb16102e5](./cc-viewer-alignment-commit-ledger.md#commit-3eb16102e5) — fix(proxy-stats): make the config tab's scroll viewport resolve

提交时间：2026-07-26T14:41:46+08:00。

````text
fix(proxy-stats): make the config tab's scroll viewport resolve

.configScroll sizes itself with `flex: 1` + `min-height: 0`, which only
resolve against a flex parent with a definite height. .body was a plain
block box, so the scroll child fell back to content height and .body's
`overflow: hidden` clipped the form instead of scrolling it — on short
viewports (and in the <=900px one-column configGrid) the Save button was
unreachable and the config unsavable.

Add `display: flex; flex-direction: column` to .body, and pin the flex
chain with a layout guard that fails on the pre-fix CSS.
````

<a id="message-51b3443e57"></a>
## [51b3443e57](./cc-viewer-alignment-commit-ledger.md#commit-51b3443e57) — fix(proxy-stats): restore the stats-tab refresh controls

提交时间：2026-07-26T14:41:56+08:00。

````text
fix(proxy-stats): restore the stats-tab refresh controls

DashboardHeader rendered only under `!embedded`, but the sole call site
always passed `embedded` — so the auto-refresh toggle and the manual
Refresh button never rendered while the 15s poll kept running with no UI
to stop it.

Drop the dead `embedded` prop and always render the controls (without the
duplicate title, which the modal toolbar already shows), remove the now
unreachable .page/.title CSS, and hold the interval id in a local so the
cleanup closes over its own timer rather than a shared ref.
````

<a id="message-935a33cc0a"></a>
## [935a33cc0a](./cc-viewer-alignment-commit-ledger.md#commit-935a33cc0a) — fix(proxy-stats): keep retryBurden range JSON-safe

提交时间：2026-07-26T14:42:06+08:00。

````text
fix(proxy-stats): keep retryBurden range JSON-safe

RETRY_BURDEN_BUCKETS stored `Infinity` as the open-ended upper bound, but
the table's shape is mirrored into the stats JSON that stats-worker writes
to disk and /api/proxy-stats serves — and JSON.stringify(Infinity) is
`null`, so clients received [51, null] while the test asserted
[51, Infinity] in-process, certifying a contract no client sees.

Spell the bound `null` so the in-process and serialized values match, and
assert the payload survives a JSON round-trip unchanged.
````

<a id="message-eef9fd870e"></a>
## [eef9fd870e](./cc-viewer-alignment-commit-ledger.md#commit-eef9fd870e) — refactor: drop dead code left by the retry-stats redesign

提交时间：2026-07-26T14:42:16+08:00。

````text
refactor: drop dead code left by the retry-stats redesign

- BarChart: remove the horizontal layout branch, its `horizontal` prop and
  the .hLabel rule (no call site passes it), plus the d.color/d.colors
  lookups, which have no producer.
- barChartHelpers: drop the unreachable "series N" tooltip fallback — it
  was an untranslated user-visible string using a 0-based index.
- ProxyStatsDashboard: stop pre-slicing byModel/retryDistribution, which
  made BarChart's `maxBars` a no-op and dropped the long tail with no "…"
  fold bar to show truncation.
- RetryConfigForm: remove the onCancel/embedded props — with the Modal
  wrapper gone, both halves of the Cancel guard were unsatisfiable.
- AppHeader: drop the isMobile import, orphaned with the mobile drawer.
````

<a id="message-60cb46ce98"></a>
## [60cb46ce98](./cc-viewer-alignment-commit-ledger.md#commit-60cb46ce98) — docs(history): condense the Unreleased proxy-stats entries

提交时间：2026-07-26T14:42:24+08:00。

````text
docs(history): condense the Unreleased proxy-stats entries

The two bullets ran ~450 words of implementation detail, pixel values and
review history. Reduce to one line per feature point, matching the density
of the released sections.
````

<a id="message-42207f7fd1"></a>
## [42207f7fd1](./cc-viewer-alignment-commit-ledger.md#commit-42207f7fd1) — fix(test): remove timing assumptions from brotli decode helpers

提交时间：2026-07-26T15:30:25+08:00。

````text
fix(test): remove timing assumptions from brotli decode helpers

Both tests polled a brotli *decoder* for output over a fixed number of
event-loop turns. zlib runs on the libuv threadpool, so a tick budget is
not a completion guarantee: under CI CPU load the decode returned '' and
the assertion compared '' against the expected payload.

dd2fa26 already fixed this for the broadcast test in sse-compression by
switching to enc.end() + brotliDecompressSync; apply the same pattern to
the remaining decodeBr() call site and drop the now-unused helper. Capture
the compressed length before end() so the trailer bytes don't skew the
size assertion.

wire-compress can't end the stream — its point is that a frame is readable
mid-stream — so make the decode itself deterministic instead: resolve off
zlib's own write/flush callbacks, and replace the 200-tick loop with a
wall-clock wait.
````

<a id="message-00dd0eaf94"></a>
## [00dd0eaf94](./cc-viewer-alignment-commit-ledger.md#commit-00dd0eaf94) — Merge pull request #131 from souloss/feat/retry-stats-modal

提交时间：2026-07-26T03:34:40-04:00。

````text
Merge pull request #131 from souloss/feat/retry-stats-modal

feat(proxy-stats): retry-stats UI redesign — unified tabbed Config|Stats modal + zero-dep SVG BarChart + retry-burden backend fields
````

<a id="message-6bd3b80e58"></a>
## [6bd3b80e58](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58) — fix(win): restore Claude discovery and Electron tab launch on Windows

提交时间：2026-07-26T17:06:42+08:00。

````text
fix(win): restore Claude discovery and Electron tab launch on Windows

Two unrelated Windows-only regressions.

#137 — `ccv` died with "Claude Code cli.js not found: <path>" at a path that
demonstrably existed. getGlobalNodeModulesDir() called
execFileSync('npm.cmd', ['root','-g']); since the CVE-2024-27980 fix (Node
18.20.2 / 20.12.2 / 22.0.0) a .cmd/.bat target without a shell throws EINVAL
synchronously. The throw hit the bare catch and returned null, so every
discovery path keyed on the global node_modules root came up empty. Route
through `cmd.exe /d /s /c npm root -g` (executed image is a real PE; argv is a
fixed literal, no interpolation) and add an npm-free inferGlobalNodeModulesDir()
fallback so a failing npm can no longer hide a present install. Timeout 2s->10s
and tolerate npm warning prefixes.

#129 — packaged Electron tabs hung forever. Tab workers were forked with an
execPath from `where node`, falling back to the bare string 'node'; a packaged
GUI app does not inherit the shell PATH, so fork() failed with
"spawn node ENOENT" (confirmed in the reporter's electron-diag.log) and the
follow-up child.send() threw write EPIPE, masking the cause while the tab sat
in loading until the 30s ready-timeout. Fall back to Electron's own binary with
ELECTRON_RUN_AS_NODE=1 (always present; node-pty prebuilds are N-API, so
ABI-stable across Node and Electron), filter `where` output to a spawnable
.exe, flip the tab to error immediately on fork failure, and guard the send.

Tests: two platform-parameterized regression files (25 cases) that assert the
win32 behavior from POSIX CI, plus an L7 isolation-guard case so the new
npm-free fallback cannot discover a developer's real install during tests.
````

<a id="message-1626575652"></a>
## [1626575652](./cc-viewer-alignment-commit-ledger.md#commit-1626575652) — chore(release): bump version to 1.7.8

提交时间：2026-07-26T17:12:24+08:00。

````text
chore(release): bump version to 1.7.8
````

<a id="message-ef64e15621"></a>
## [ef64e15621](./cc-viewer-alignment-commit-ledger.md#commit-ef64e15621) — fix(findcc): move native resolution before PATH to avoid ERROR_BAD_EXE_FORMAT on Windows

提交时间：2026-07-26T21:37:19+08:00。

````text
fix(findcc): move native resolution before PATH to avoid ERROR_BAD_EXE_FORMAT on Windows

On Windows, PATH may surface a postinstall stub (no-extension shim,
.cmd, .ps1) that causes ERROR_BAD_EXE_FORMAT (193/216) when spawned
via ConPTY. Reorder resolvePreferredClaudeSelection so that
resolveNativePath() runs before PATH-based and npm-based resolution.

Priority order: configured → codefuse → native → path → npm

Added 6 unit tests covering the full priority chain, including a
Windows-specific regression test for the ERROR_BAD_EXE_FORMAT scenario.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-9600351738"></a>
## [9600351738](./cc-viewer-alignment-commit-ledger.md#commit-9600351738) — fix(electron): add missing src/utils/ to electron-builder bundle

提交时间：2026-07-26T23:48:06+08:00。

````text
fix(electron): add missing src/utils/ to electron-builder bundle

server/lib/v2/meta-rows.js and server/lib/v2/live-feed.js import
classifyRequest from src/utils/requestType.js, but electron-builder.yml
did not include src/utils/**/* in its files list. The packaged Electron
app crashed at startup with 'Cannot find module'.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-20e4a63b24"></a>
## [20e4a63b24](./cc-viewer-alignment-commit-ledger.md#commit-20e4a63b24) — fix(test): drop install-layout assumption from the last-resort candidate assertion

提交时间：2026-07-27T10:41:52+08:00。

````text
fix(test): drop install-layout assumption from the last-resort candidate assertion

The test required the tail candidate to end with 'node_modules'. That tail is
resolve(findcc.js dir, '..') — the dir holding cc-viewer — which only ends in
node_modules under an 'npm i -g' layout. In a git checkout (CI) it is the
workspace dir, so the assertion failed on GitHub while passing locally.
Compare against that path directly instead.
````

<a id="message-071398e55a"></a>
## [071398e55a](./cc-viewer-alignment-commit-ledger.md#commit-071398e55a) — chore(star-history): refresh chart [skip ci]

提交时间：2026-07-27T06:41:06+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-b2d57c8d38"></a>
## [b2d57c8d38](./cc-viewer-alignment-commit-ledger.md#commit-b2d57c8d38) — Merge remote-tracking branch 'origin/main' into pr-132

提交时间：2026-07-27T15:15:33+08:00。

````text
Merge remote-tracking branch 'origin/main' into pr-132

# Conflicts:
#	history.md
````

<a id="message-1db2a38eab"></a>
## [1db2a38eab](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab) — fix(ccswitch-import): unify sqlite recovery retries

提交时间：2026-07-27T15:20:25+08:00。

````text
fix(ccswitch-import): unify sqlite recovery retries
````

<a id="message-a803382c76"></a>
## [a803382c76](./cc-viewer-alignment-commit-ledger.md#commit-a803382c76) — Merge pull request #132 from souloss/fix/ccswitch-readonly-recovery

提交时间：2026-07-27T05:30:24-04:00。

````text
Merge pull request #132 from souloss/fix/ccswitch-readonly-recovery

fix(ccswitch-import): recover from malformed journal (readonly) + running cc-switch (db locked)
````

<a id="message-87432d4c5a"></a>
## [87432d4c5a](./cc-viewer-alignment-commit-ledger.md#commit-87432d4c5a) — fix(migrate): respect status:'done' in pendingOf() to stop false re-prompts after migration

提交时间：2026-07-28T10:52:27+08:00。

````text
fix(migrate): respect status:'done' in pendingOf() to stop false re-prompts after migration

The migration prompt detection compared per-file sizes against the convert
state but ignored state.status === 'done'. After migration completes, the
active V1 log continues growing (dual-write), causing a size mismatch that
re-triggered the prompt even though new entries already land in V2.

pendingOf() now short-circuits when status is 'done', treating the completed
migration as definitive. The per-file trust rule still applies for
non-done states (running/stopped/error).
````

<a id="message-25e118170c"></a>
## [25e118170c](./cc-viewer-alignment-commit-ledger.md#commit-25e118170c) — fix(proxy-retry): preserve streaming response metadata

提交时间：2026-07-28T14:18:23+08:00。

````text
fix(proxy-retry): preserve streaming response metadata
````

<a id="message-617da66c96"></a>
## [617da66c96](./cc-viewer-alignment-commit-ledger.md#commit-617da66c96) — Merge pull request #134 from souloss/feat/proxy-retry-stream-idle

提交时间：2026-07-28T02:33:01-04:00。

````text
Merge pull request #134 from souloss/feat/proxy-retry-stream-idle

fix(proxy-retry): streamIdleTimeoutMs hang guard (retry modes only) + reportSwallowed + stats cleanup
````

<a id="message-c768e8beb3"></a>
## [c768e8beb3](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) — fix(test): stop viewer resources before cleanup

提交时间：2026-07-28T23:21:31+08:00。

````text
fix(test): stop viewer resources before cleanup
````

<a id="message-0f3c16d6c7"></a>
## [0f3c16d6c7](./cc-viewer-alignment-commit-ledger.md#commit-0f3c16d6c7) — Merge pull request #135 from souloss/fix/ci-flakes-brotli-rmsync

提交时间：2026-07-28T11:45:08-04:00。

````text
Merge pull request #135 from souloss/fix/ci-flakes-brotli-rmsync

fix(test): stop viewer resources before temp-dir cleanup
````

<a id="message-82db2b907c"></a>
## [82db2b907c](./cc-viewer-alignment-commit-ledger.md#commit-82db2b907c) — ui(proxy-stats): align retry stats chart colors with app theme; release 1.7.11

提交时间：2026-07-29T11:50:00+08:00。

````text
ui(proxy-stats): align retry stats chart colors with app theme; release 1.7.11

BarChart's grouped-series colors no longer reuse --color-success/-warning
(misreadable as good/bad on the upstream-vs-downstream availability bars).
Added a dedicated --color-chart-series-2 identity color, validated against
--color-primary for CVD separation and lightness band in both themes.

statusColor() and two inline Tag colors switched from antd's preset palette
names ('green'/'orange'/'red') to antd's semantic status names
('success'/'warning'/'error'), matching the convention already used by
DetailPanel's HTTP status Tag.
````

<a id="message-e932bbef2e"></a>
## [e932bbef2e](./cc-viewer-alignment-commit-ledger.md#commit-e932bbef2e) — feat(context): kimi logo refresh + context-window follows hot-switched model

提交时间：2026-07-30T23:47:39+08:00。

````text
feat(context): kimi logo refresh + context-window follows hot-switched model

- ui(avatar): refresh Kimi logo — brand-blue dot fixed (#1783FF), "K" glyph
  switched to currentColor so it inverts with --model-logo-mono (white in dark,
  black in light), matching GLM/MiniMax mono-logo theming.
- feat(context): MODEL_CONTEXT_SIZES adds /kimi|moonshot|^k3$/i → 256K (Kimi's
  real window); classifyContextWindow buckets kimi/moonshot-prefixed names and
  bare k3 into the 1M bar bucket. [Nk]/[Nm] suffix still overrides everything.
- fix(context): SSE context_window window now follows the hot-switched upstream
  model — getContextSizeForModel accepts a log entry and prefers the response
  model over the original request name, skipping the stale startup cache;
  adaptContextWindow gains a 256K→1M correction tier.
- fix(context): new getCalibrationModel (context-rules.js, shared src/server)
  gives the request-side explicit [Nk]/[Nm] config suffix precedence over
  upstream model normalization (Moonshot returns bare "k3" for k3[1m]), so the
  bar's denominator honors the configured 1M intent on both frontend
  (resolveCalibrationTokens) and server (getContextSizeForModel) paths.

Release 1.7.12.
````

<a id="message-6baff0cd6f"></a>
## [6baff0cd6f](./cc-viewer-alignment-commit-ledger.md#commit-6baff0cd6f) — feat(log-list): perf cache + server-side pagination + project switcher (1.7.13)

提交时间：2026-08-01T02:57:48+08:00。

````text
feat(log-list): perf cache + server-side pagination + project switcher (1.7.13)

Session log list performance and UX overhaul for the log-management modal:

- perf: session row cache (server/lib/v2/session-list.js) keyed by
  journal+prompts size+mtime; repeat /api/local-logs calls drop from a full
  rescan to O(N statSync). migrationStatus gains a 10s TTL memo, invalidated
  on convert-worker completion.
- feat: server-side pagination — GET /api/local-logs?page=&pageSize= returns
  {items,total,page,pageSize} for one project, summarizing only the requested
  page (rest ride the row cache); the modal table is a controlled 50/page
  server-paginated grid. No params = legacy grouped shape (backward compatible).
- feat: project switcher — ?project= serves any project's v2 sessions (strict
  sanitizePathComponent compare rejects traversal); response carries
  _allProjects for the toolbar dropdown. currentProject (active) stays separate
  from logViewProject (viewed); viewing a non-active project disables the v1
  migration button and hides the banner; switching clears the selection.
- ui: fixed-height modal content box + pinned pager (no bounce on load);
  mobile list scrolls vertically so deeper pages stay reachable.
- fix: _currentProject always reports the active project (_viewedProject
  reports the listed one) so viewing a project can't pollute global state;
  fetch failures reset localLogsLoading; _allProjects skips dot-dirs.

i18n: ui.logsTotal / ui.selectProject / ui.migrateCurrentProjectOnly (18 langs).
Tests: v2-session-list (row cache + listV2LogsPage incl. post-filter paging),
api-logs-gap (?project= incl. traversal/clamps/fallback), TTL memo + hook.
````

<a id="message-9c0463bb8c"></a>
## [9c0463bb8c](./cc-viewer-alignment-commit-ledger.md#commit-9c0463bb8c) — prompt(kimi): anti-loop guardrails in kimi-k3/k2.7-code system-prompt presets (1.7.14)

提交时间：2026-08-01T17:15:34+08:00。

````text
prompt(kimi): anti-loop guardrails in kimi-k3/k2.7-code system-prompt presets (1.7.14)
````

<a id="message-8c8b96eafe"></a>
## [8c8b96eafe](./cc-viewer-alignment-commit-ledger.md#commit-8c8b96eafe) — fix(release): bump version to 1.7.14 for re-publish

提交时间：2026-08-03T00:24:46+08:00。

````text
fix(release): bump version to 1.7.14 for re-publish
````

<a id="message-fc68e850f2"></a>
## [fc68e850f2](./cc-viewer-alignment-commit-ledger.md#commit-fc68e850f2) — feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15)

提交时间：2026-08-03T13:42:44+08:00。

````text
feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15)

- feat: v2-transcript-normalizer converts new top-level-message JSONL into legacy entries (per-session grouping, /clear segmentation, message.id assistant-row merging, uuid dedup), wired into cold/local/live ingest; base64 tool_result images render via the existing extractToolResultImages chain
- fix: live split-row merged tool_use blocks re-paired via _toolUses (label/input/Read/Edit state no longer lost); live /clear keeps the entry.timestamp === messages[0]._timestamp invariant and skips empty snapshots; string-content assistant rows merge without dropping content
- ui: tool-result images open the full-screen ImageLightbox (ToolResultView + simplified-mode inline under the tool pill, memoized); oversized placeholder unified via formatOversizedImagePlaceholder
- fix: synthetic entries no longer render undefined status/method; per-message timestamps survive applyBatchEntryTimestamps; delta-reconstructor excludes _syntheticV2 repair candidates
- test: 4 new test files (normalizer/incremental/image-pipeline/should-inline) + guards in delta-reconstructor/timestamp-assignment/client-safe-imports; all suites green
````

<a id="message-4c2765d308"></a>
## [4c2765d308](./cc-viewer-alignment-commit-ledger.md#commit-4c2765d308) — chore(star-history): refresh chart [skip ci]

提交时间：2026-08-03T06:33:40+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-e4fc788b9e"></a>
## [e4fc788b9e](./cc-viewer-alignment-commit-ledger.md#commit-e4fc788b9e) — fix(v2-read): finalize crash orphans as completed deltas on cold reads (1.7.16)

提交时间：2026-08-05T02:25:30+08:00。

````text
fix(v2-read): finalize crash orphans as completed deltas on cold reads (1.7.16)

- dead-session req-without-done now emits as a completed delta (response:{body:null})
  so the client reconstructor accumulates its slice; previously the skipped slice
  failed every later _totalMessageCount check and blanked the whole chat. Live
  sessions keep the placeholder (liveness gate: owner pid + journal mtime).
- degraded broken-carrier merge: a _reconstructBroken entry that is its session's
  only carrier merges as a truthful prefix (create branches only, _seqEpoch
  guard), stamped _partialData; ChatView shows an incomplete-session banner.
  Same-session merges onto a partial base whole-replace instead of prefix-extending.
- parity/reorder test pipelines kept in sync; new adapter orphan + predicate tests.
````

<a id="message-f3a8413db9"></a>
## [f3a8413db9](./cc-viewer-alignment-commit-ledger.md#commit-f3a8413db9) — fix(chat): wire-agent identity for teammate/subagent classification (1.7.17)

提交时间：2026-08-05T04:19:23+08:00。

````text
fix(chat): wire-agent identity for teammate/subagent classification (1.7.17)

- persist x-claude-code-agent-id on journal req lines (new agent-id.js parser);
  teammate display names no longer depend on the window-scoped registry
- chat classification reuses the server-side typeTag via _v3Row, so [对话] and
  the request list agree on Teammate vs SubAgent (keeps role subTypes)
- subagents are no longer mis-tagged as Teammate: since 2.1.199 subagents get
  SendMessage too; isTeammate now trusts the wire id shape (named@ → Teammate,
  hex → SubAgent) and cc_is_subagent=true first
- shared withAgentNameSubType helper; identityHeal narrows its skip; Pass B
  wire-agent coverage tests added
````

<a id="message-fcfef597dd"></a>
## [fcfef597dd](./cc-viewer-alignment-commit-ledger.md#commit-fcfef597dd) — ui(chat): scope the 1400px chat cap to message items via .container > *

提交时间：2026-08-07T16:20:04+08:00。

````text
ui(chat): scope the 1400px chat cap to message items via .container > *

Replaces the previous .chatSectionFlex column cap, which also squeezed the
input bar, approval panels, and other siblings. Now only direct children of
the message scroller are width-limited (centered, responsive below); the
input bar keeps its own 1000px rule and the scrollbar stays at the viewport
edge. Works for both the plain and Virtuoso scrollers (shared .container).
````

<a id="message-e12dcaded9"></a>
## [e12dcaded9](./cc-viewer-alignment-commit-ledger.md#commit-e12dcaded9) — ui(chat): PC composer polish — 1000px cap, themed strip, white card + shadow, focus-expand animation

提交时间：2026-08-07T16:20:04+08:00。

````text
ui(chat): PC composer polish — 1000px cap, themed strip, white card + shadow, focus-expand animation

- cap the chat column at 1400px and the composer card at 1000px (centered, responsive below)
- new --bg-input-strip / --bg-composer / --shadow-composer tokens: light theme gets a light-gray strip (#F9F9F9) with a pure-white card and soft 8px shadow; dark theme keeps the strip at the page color (#0d0d0d) with the elevated card (#1e1e1e)
- desktop textarea focus animates to two lines (height 0.2s ease), blurs back to content height (min one line); shared resizeChatTextarea helper (content-box clamp) replaces 7 raw autosize sites; mobile metrics/behavior unchanged
````

<a id="message-73e4b44ccd"></a>
## [73e4b44ccd](./cc-viewer-alignment-commit-ledger.md#commit-73e4b44ccd) — Merge pull request #139 from weiesky/feat/chat-composer-polish

提交时间：2026-08-07T07:10:05-04:00。

````text
Merge pull request #139 from weiesky/feat/chat-composer-polish

ui(chat): PC 对话区样式优化 — 输入条主题化、限宽居中、聚焦扩展动画
````

<a id="message-b78a51eb1d"></a>
## [b78a51eb1d](./cc-viewer-alignment-commit-ledger.md#commit-b78a51eb1d) — fix(system-prompt): bare k3 resolves to the Kimi entry (1.7.18)

提交时间：2026-08-08T12:39:22+08:00。

````text
fix(system-prompt): bare k3 resolves to the Kimi entry (1.7.18)

Third-party proxies normalize k3[1m] → bare k3 at spawn, which never matched
KIMI / KIMI-K3 entries (the match is id.includes(entryName), and "k3"
contains neither). matchModelPrompt now expands a small alias table
(k3 → k3 / kimi-k3 / kimi) before substring matching, so the Kimi preset
actually injects for kimi-profile sessions; non-alias ids are untouched.

Also ships the merged PR #139 composer polish as 1.7.18.
````

<a id="message-94e110620d"></a>
## [94e110620d](./cc-viewer-alignment-commit-ledger.md#commit-94e110620d) — chore(star-history): refresh chart [skip ci]

提交时间：2026-08-10T04:52:55+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-d88982c6ce"></a>
## [d88982c6ce](./cc-viewer-alignment-commit-ledger.md#commit-d88982c6ce) — fix(codefuse): exit managed CCV with Claude (1.7.19)

提交时间：2026-08-12T13:56:18+08:00。

````text
fix(codefuse): exit managed CCV with Claude (1.7.19)
````

<a id="message-0c12335e53"></a>
## [0c12335e53](./cc-viewer-alignment-commit-ledger.md#commit-0c12335e53) — fix(release): bump package version to 1.7.20

提交时间：2026-08-12T16:12:40+08:00。

````text
fix(release): bump package version to 1.7.20
````

<a id="message-69b104cbf3"></a>
## [69b104cbf3](./cc-viewer-alignment-commit-ledger.md#commit-69b104cbf3) — feat(system-prompt): type-ahead model names in "+ Add model" dialog (1.7.21)

提交时间：2026-08-16T11:11:26-04:00。

````text
feat(system-prompt): type-ahead model names in "+ Add model" dialog (1.7.21)

The name field is now an AutoComplete fed by locally configured models: every
hot-reload proxy profile mapping (incl. the default profile) plus
settings.json model / env.ANTHROPIC_MODEL, with [1m] suffixes stripped.
Names already added in the selected scope are hidden, free-form names still
work, and Enter no longer submits the dialog or silently picks the first
suggestion. Both fetches are non-fatal (reportSwallowed, empty on failure).

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-7b0d3646d9"></a>
## [7b0d3646d9](./cc-viewer-alignment-commit-ledger.md#commit-7b0d3646d9) — chore(star-history): refresh chart [skip ci]

提交时间：2026-08-17T04:01:01+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-02ce99f202"></a>
## [02ce99f202](./cc-viewer-alignment-commit-ledger.md#commit-02ce99f202) — feat(system-prompt): auto header entry, model-aware default tab, chip icon

提交时间：2026-08-17T00:16:49-04:00。

````text
feat(system-prompt): auto header entry, model-aware default tab, chip icon

The Edit System Prompt entry (new chip icon, replacing the pencil) now
auto-appears in the header toolbar (Web) and the native tab bar (Electron)
whenever a custom prompt is configured to inject at the next launch — a
model entry matching the currently resolved model (workspace or global
scope), or the workspace Default sentinels — with no manual pinning
needed, and hides again when nothing is in effect (manual pins are
unaffected; CCV_DISABLE_AUTO_SYSTEM_PROMPT=1 suppresses it). Opening the
modal preselects the tab of the entry matching the active model (e.g.
k3 -> KIMI-K3), falling back to the Default tab when nothing matches.

Backed by a new lightweight GET /api/expert/system-prompt-status endpoint
and a matched/modelId pair on GET /api/expert/model-prompts, both computed
server-side with the same resolver + matcher used at spawn (including the
bare-k3 -> Kimi alias). The Electron tab-bar MENU_ICON renderer gains a
per-icon { vb, path } override so the 1024-grid chip artwork renders
unclipped; string entries are unaffected.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-5c468c042e"></a>
## [5c468c042e](./cc-viewer-alignment-commit-ledger.md#commit-5c468c042e) — fix: CVE-2026-13676 security vulnerability

提交时间：2026-08-17T04:30:14+00:00。

````text
fix: CVE-2026-13676 security vulnerability

Automated dependency upgrade by OrbisAI Security
````

<a id="message-ea8c5e39e0"></a>
## [ea8c5e39e0](./cc-viewer-alignment-commit-ledger.md#commit-ea8c5e39e0) — fix(test): cli-boot fixture shadows real /usr/local/bin/claude via PATH shim

提交时间：2026-08-17T00:48:40-04:00。

````text
fix(test): cli-boot fixture shadows real /usr/local/bin/claude via PATH shim

On machines where an absolute NATIVE_CANDIDATES path exists (this dev box
has /usr/local/bin/claude, a symlink to a .js cli.js), the spawned child
escaped the fixture's PATH/HOME isolation: the .js symlink was treated as
a native binary and exec'd directly, and its #!/usr/bin/env node shebang
could not find node under the restricted PATH, so the CodeFuse-managed
exit-code passthrough test got 127 instead of the fake claude's 7 (CI,
lacking that file, stayed green; sibling cases never asserted fake-claude
liveness, so the leak was masked).

Add a fake `claude` shim to the fixture bin/ (restricted PATH): the
child's `which claude` hits it before the absolute candidates — the
sanctioned fixture seam per findcc.js L7 — and it execs the fake cli.js
via an absolute node path. Side benefit: sibling boot cases now run
against a genuinely resident fake claude instead of one that died
instantly with 127.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-3cc05b496d"></a>
## [3cc05b496d](./cc-viewer-alignment-commit-ledger.md#commit-3cc05b496d) — feat(proxy): per-role proxy sources for Main Agent / Sub-Agent / Teammate (1.7.22)

提交时间：2026-08-17T08:03:36-04:00。

````text
feat(proxy): per-role proxy sources for Main Agent / Sub-Agent / Teammate (1.7.22)

Hot-switch dialog gains a Role Assignment section: Sub-Agent and Teammate can
follow the Main Agent (default), use built-in Default, or point at their own
profile. Workspace-scoped { activeId, roles } storage (merge + atomic write +
watchFile sync), positive-only classification (cc_is_subagent / team marker /
argv), official-endpoint dormancy, and role-aware routing in ccv proxy mode.
Rewritten entries stamp proxyRole into the v2 journal for per-role stats.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-9255663e33"></a>
## [9255663e33](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33) — fix: CVE-2026-39244 security vulnerability

提交时间：2026-08-17T13:35:58+00:00。

````text
fix: CVE-2026-39244 security vulnerability

Automated dependency upgrade by OrbisAI Security
````

<a id="message-6680d041d4"></a>
## [6680d041d4](./cc-viewer-alignment-commit-ledger.md#commit-6680d041d4) — feat(tools): sync tool catalog to Claude Code 2.1.233 — 21 new tools, MCP & Extensions category

提交时间：2026-08-17T22:46:51-04:00。

````text
feat(tools): sync tool catalog to Claude Code 2.1.233 — 21 new tools, MCP & Extensions category

- add concept docs for REPL, TodoWrite, SendFeedback, Projects, ProposeGoal,
  ReadNotifications, ListAgents, SendFile, SendUserFile, SendUserMessage,
  EndConversation, ReadMcpResource/ReadMcpResourceDir/ListMcpResources, and
  the registry-discovery seven (SearchMcpRegistry, SuggestConnectors,
  ListConnectors, SuggestPluginInstall, SuggestSkills, ListPlugins, ListSkills)
- drop TeamCreate/TeamDelete/getDiagnostics/executeCode (removed upstream;
  ToolSearch kept pending confirmation)
- new "MCP & Extensions" category (ui.toolCatalog.cat.mcp, 18 locales):
  57 tools total with concept docs in all 18 languages

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-a97d0f8adf"></a>
## [a97d0f8adf](./cc-viewer-alignment-commit-ledger.md#commit-a97d0f8adf) — docs(concepts): "Activation" sections for gated tools in all 18 locales

提交时间：2026-08-18T06:19:09-04:00。

````text
docs(concepts): "Activation" sections for gated tools in all 18 locales

31 tool concept docs gain a translated Activation section between When to
Use and Parameters documenting enablement: user-settable env vars
(CLAUDE_CODE_REPL, CLAUDE_CODE_ENABLE_TODO_TOOLS, CLAUDE_CODE_ENABLE_TASKS,
CLAUDE_CODE_HARBOR_KITE, CLAUDE_CODE_DISABLE_ARTIFACT, ...), provider
availability (Amazon Bedrock / Claude Platform on AWS / Google Cloud /
Microsoft Foundry), plan tiers, entrypoint and Remote Control requirements,
and generic "server-side feature flag" notes (no internal flag names) —
grounded in a Claude Code 2.1.234 binary tool-gating audit plus official docs.

Availability bullets previously buried in Notes (ListAgents, SendFile,
SendUserFile, SendUserMessage, SearchMcpRegistry, SuggestConnectors,
ListConnectors, SuggestPluginInstall, SuggestSkills, ListPlugins) move into
the new section. Three legacy heading variants normalized to the locale
standard (ar/de/no LSP, da Artifact/LSP), and th Tool-WebSearch's legacy
divergent structure aligned to the standard layout.

New test/tool-activation-concepts.test.js pins the section, the 18
translated headings (tolerating pre-existing heading variants), position
between When-to-Use and Parameters, and the 31-tool scope.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-3f141cb974"></a>
## [3f141cb974](./cc-viewer-alignment-commit-ledger.md#commit-3f141cb974) — Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip

提交时间：2026-08-18T06:40:50-04:00。

````text
Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip

fix: upgrade adm-zip to 0.6.0 (CVE-2026-39244)
````

<a id="message-9f4e329be4"></a>
## [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4) — Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri

提交时间：2026-08-18T06:42:07-04:00。

````text
Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri
````

<a id="message-721e2c9940"></a>
## [721e2c9940](./cc-viewer-alignment-commit-ledger.md#commit-721e2c9940) — Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri

提交时间：2026-08-18T06:42:17-04:00。

````text
Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri

fix: upgrade fast-uri to 4.0.1, 3.1.3, 2.4.2 (CVE-2026-13676)
````

<a id="message-817dc87a8e"></a>
## [817dc87a8e](./cc-viewer-alignment-commit-ledger.md#commit-817dc87a8e) — bump version to 1.7.23

提交时间：2026-08-19T10:49:45+08:00。

````text
bump version to 1.7.23
````

<a id="message-dabc5232ce"></a>
## [dabc5232ce](./cc-viewer-alignment-commit-ledger.md#commit-dabc5232ce) — chore(pnpm): migrate package manager from npm to pnpm 11.22 (stage A1)

提交时间：2026-08-20T09:27:51-04:00。

````text
chore(pnpm): migrate package manager from npm to pnpm 11.22 (stage A1)

- packageManager pin pnpm@11.22.0; settings-only pnpm-workspace.yaml
  (allowBuilds for the 6 build-script deps; axios/qs/node-gyp overrides,
  duplicated in package.json for the npm-based Electron CI job until A2)
- replace package-lock.json with pnpm-lock.yaml (fidelity gate: 956/956
  packages, zero version drift against package-lock)
- build.js: invoke vite bin via execFileSync(process.execPath, ...) with no
  shell — immune to both npm-flat and pnpm-strict node_modules layouts
- ci.yml: pnpm/action-setup + install --frozen-lockfile --ignore-scripts,
  keep explicit pnpm rebuild node-pty (allowlist is bypassed by --ignore-scripts)
- release.yml: npm-publish job installs via pnpm but still publishes with
  npm publish --provenance (OIDC trusted publishing is npm-only); the
  Electron job stays on npm until A2's hoisted-linker switch (documented)
- CLAUDE.md/CONTRIBUTING.md: pnpm commands, Node >=22.13 toolchain floor,
  allowBuilds maintenance rule
- add migration plan docs/refactor/pnpm-monorepo-migration-plan.zh.md

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-729b886893"></a>
## [729b886893](./cc-viewer-alignment-commit-ledger.md#commit-729b886893) — refactor(boundaries): break static cycles + add import-boundary gate for packages/app

提交时间：2026-08-20T09:34:00-04:00。

````text
refactor(boundaries): break static cycles + add import-boundary gate for packages/app

Internal decoupling round (no behavior change): both remaining static ESM
cycles broken (log-management↔v2/adapter via new leaf server/lib/
log-file-utils.js; model-system-prompts↔system-prompt-files by sinking
isNonEmptyFile into file-api.js), findcc's lazy dynamic import replaced by
an onLogDirChange listener registry (synchronous; policy registers at
load), project-prefs decoupled from the interceptor via the new mutable
leaf server/lib/project-state.js (3 push sites), im-deny.js promoted to
server/lib/ root with a re-export shim. New gate scripts/
verify-boundaries.mjs (acorn-based, L0/L0-leaf/L1/L2/L3/L4 classes,
R0-R7+CLS rules, SCC cycle detection, ratcheted allowlist with 3
documented structural exceptions, hard rules non-exemptable) wired into
all pretest* hooks + CI. Contract doc: docs/refactor/package-
boundaries.zh.md. Tarball baseline +3 entries; changeset included.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-f9467bfc83"></a>
## [f9467bfc83](./cc-viewer-alignment-commit-ledger.md#commit-f9467bfc83) — refactor(server): group server/lib batch-1 into im/ ask/ proxy/ subdirectories

提交时间：2026-08-20T09:34:00-04:00。

````text
refactor(server): group server/lib batch-1 into im/ ask/ proxy/ subdirectories

- 21 files via git mv: lib/im/ (12: im-* cluster + dingtalk shims), lib/ask/
  (5: ask-store/reaper/constants + ask/perm hook bridges), lib/proxy/
  (4: retry engine + stats/env/errors). First batch of the flat-namespace
  reorg; remaining clusters land in later batches.
- Resolver-based codemod rewrote 122 import specifiers across 72 files
  (source + tests); manual fixes: im-process-manager CLI_JS depth,
  ensure-hooks bridge joins, segmented join() paths in five test files,
  path-regex expectations in the ensure-hooks / ask-no-timeout suites.
- Hook path migration self-heals: ensure-hooks purges stale cc-viewer-managed
  entries (existsSync) and re-inserts at the new paths on the next ccv launch;
  the hook command's `|| true` guard degrades silently to TUI in between.
- GlobalSettings.md hook docs updated to the new bridge paths (18 locales).
- A2.7 cleanup: deleted the four temporary root server/lib import-shims.
- L4 baseline regenerated: exactly 21 paths removed + 21 added, each reviewed.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-20ccfb7304"></a>
## [20ccfb7304](./cc-viewer-alignment-commit-ledger.md#commit-20ccfb7304) — refactor(content): extract bundled assets into packages/content (@ccv/content)

提交时间：2026-08-20T09:34:00-04:00。

````text
refactor(content): extract bundled assets into packages/content (@ccv/content)

- git mv concepts/, ultraAgents/, server/imPreset/, server/imSkills/ out of
  packages/app into a new private workspace package, mirroring the two tarball
  depths (root-level and server-level).
- server/_paths.js: the four asset constants become sentinel-checked probes
  that prefer packages/content in dev (live edits, no rebuild) and fall back
  to the assembled in-package copies in the published tarball / electron stage.
- assemble-dist.mjs copies the four dirs back at build/pack time (idempotent,
  throws on missing source); the assembled paths are gitignored.
- Tarball layout is byte-identical (L4 gate: zero diff); verified with an
  isolated-prefix global install smoke (probe fallback + ccv --version).
- Tests: four direct-path consumers repointed; new test/paths-content.test.js
  pins the probe resolution.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-3b5103bb9e"></a>
## [3b5103bb9e](./cc-viewer-alignment-commit-ledger.md#commit-3b5103bb9e) — ci(contract): add L4 tarball-layout gate (verify:tarball + committed baseline)

提交时间：2026-08-20T09:34:00-04:00。

````text
ci(contract): add L4 tarball-layout gate (verify:tarball + committed baseline)

- scripts/verify-tarball-contract.mjs: assemble, then dry-run npm pack and diff
  the file list against scripts/tarball-baseline.json (1560 entries).
  dist/assets/* is excluded from the diff (vite-hashed names), but every asset
  referenced by dist/index.html is asserted present in the pack list.
- Wired into ci.yml (after build, before test:cli) and release.yml npm-publish
  (before the real pack — tags don't trigger ci.yml, so the publish path gets
  its own gate).
- docs/refactor/packages-app-split-plan.zh.md: stage-1 research conclusions and
  stage-2 design for the packages/app modular split.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-7d83b5deff"></a>
## [7d83b5deff](./cc-viewer-alignment-commit-ledger.md#commit-7d83b5deff) — chore(changesets): adopt @changesets/cli for cc-viewer versioning (stage A3)

提交时间：2026-08-20T09:34:00-04:00。

````text
chore(changesets): adopt @changesets/cli for cc-viewer versioning (stage A3)

- @changesets/cli ^3.0.0 as root devDependency; .changeset/config.json
  versions only the cc-viewer package (privatePackages version/tag false —
  @ccv/web and @ccv/electron stay static at 0.0.0)
- config written by hand: v3 init prompts interactively (GitHub integration)
  and hangs in non-TTY shells
- dry-run rehearsed: fake patch changeset -> version bumped 1.7.22 -> 1.7.23
  with packages/app/CHANGELOG.md generated, private packages untouched;
  all rehearsal artifacts reverted
- CLAUDE.md: changes touching packages/app must carry a changeset; lockfile
  conflicts re-resolved via pnpm install (never hand-edited); version bumps
  only via pnpm changeset version at release time; refresh the stale
  A1-transition electron-job note to the A2 final state (pnpm + isolated)
- migration plan doc: append A3 implementation record

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-e3ca28c52d"></a>
## [e3ca28c52d](./cc-viewer-alignment-commit-ledger.md#commit-e3ca28c52d) — refactor(monorepo): split into apps/{web,electron} + packages/app workspace layout (stage A2)

提交时间：2026-08-20T09:34:00-04:00。

````text
refactor(monorepo): split into apps/{web,electron} + packages/app workspace layout (stage A2)

- packages/app: publishable cc-viewer package (server + cli + findcc + root
  shims + 4-file shared seam in src/utils/); repo layout == npm tarball layout
- apps/web (@ccv/web) and apps/electron (@ccv/electron): private build units
- assemble-dist.mjs: copy apps/web/dist into packages/app at pack time, with
  missing-dist throw and workspace:/catalog: specifier guards
- electron: staging assembly (scripts/assemble-app.mjs), sibling stage layout,
  electron-builder >=26.14 + pinned electron 42.0.1 (spike-verified, isolated
  linker retained for CI)
- updater: detect pnpm-global installs via virtual-store realpath segment and
  route to pnpm_managed banner (+ i18n x18, +26 tests)
- tests: codemod path migration (473 files) + 12 manual fixes; test:cli
  9482 pass / 0 fail; L4 tarball contract diff vs A1 baseline: only delta is
  src/utils narrowing, zero additions

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-16267dc04c"></a>
## [16267dc04c](./cc-viewer-alignment-commit-ledger.md#commit-16267dc04c) — fix(system-prompt): pin original system prompt on -c/-r resumes

提交时间：2026-08-20T09:34:01-04:00。

````text
fix(system-prompt): pin original system prompt on -c/-r resumes

Continuation launches re-rendered ${...} template variables at spawn
(git.status / recentCommits / dates drift within minutes), so the injected
system text diverged byte-for-byte from the resumed conversation's original
and busted the entire prompt-prefix KV cache. Resume launches now pin the
recorded original content verbatim:

- new leaf store server/lib/system-prompt-snapshots.js: per-conversation
  records keyed by transcript uuid + a capped pending queue (atomic writes,
  GC with grace window, content-validated entries)
- Bind A (v2-writer): a fresh session's first main request content-matches
  its system text against the queue (longest full match wins; probes,
  teammates, adopted sessions and the offline converter gated out)
- Bind B (SessionStart hook): resume/fork launches bind identity-exactly
  (resolvedUuid for 'resume', fork flag for 'fork') — stolen or out-of-order
  hooks can neither poison records nor cascade-destroy the queue
- identified-but-unrecorded resume targets inject nothing this launch
  (never alter an existing context's system text); unidentifiable targets
  (no transcripts, bare -r picker) keep the fresh-render behavior
- CLAUDE_CONFIG_DIR / CCV_PROJECTS_DIR honored for transcript resolution;
  manual same-name flags suppress the matching pinned entry;
  CCV_DISABLE_AUTO_SYSTEM_PROMPT=1 disables pinning; IM workers skip the
  machinery; self-heal retry tiers treat pinned results like built ones

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-047db59b80"></a>
## [047db59b80](./cc-viewer-alignment-commit-ledger.md#commit-047db59b80) — refactor(monorepo): @ccv/core extraction + boundary gate + per-package test distribution

提交时间：2026-08-20T09:34:01-04:00。

````text
refactor(monorepo): @ccv/core extraction + boundary gate + per-package test distribution

- @ccv/core: 12 isomorphic judgment modules extracted into packages/core (private;
  shipped inside the cc-viewer tarball via bundledDependencies — npm pack follows
  the pnpm workspace symlink). All call sites import @ccv/core/<name>; boundary
  gate gains a CORE layer (R8: core imports only core) and R6 is inverted to a
  full web→packages/app ban.
- boundary gate: scripts/verify-boundaries.mjs enforces the packages/app layering
  contract (L0-L4 classes, R0-R7+CLS, ratcheted allowlist) from all pretest*
  hooks + CI; remaining static ESM cycles broken (log-file-utils leaf,
  project-state leaf, onLogDirChange registry inversion, im-deny promoted).
- tests: the 466 root test/ files are redistributed — 438 into per-package test
  dirs (packages/app 282, apps/web 149, apps/electron 4, packages/core +2,
  packages/content 1) and 28 cross-package integration / repo-guard tests stay at
  root. Migration-plan §7 decision 2 reversed (recorded in the doc appendix).
  Boundary gate EXCLUDE_DIRS gains 'test'; the two repo-wide static guards
  (real-request-guard, test-env-isolation-guard) now sweep all six test dirs
  recursively; two repo-root-cwd-hardcoded tests are now import.meta.url-relative;
  discovery unchanged (bare root node --test finds every test/ dir).
- docs/config: CLAUDE.md, CONTRIBUTING.md, history.md, migration-plan appendix,
  package-boundaries doc, WIRE_FORMAT pointers, jsconfig, c8 exclude.

Verified: test:cli 0 fail (9492 pass), verify:boundaries 0 violations (367 files),
verify:tarball 1564 entries match baseline, build green.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-cda9ed326d"></a>
## [cda9ed326d](./cc-viewer-alignment-commit-ledger.md#commit-cda9ed326d) — fix(deps): carry CVE-2026-13676/CVE-2026-39244 fixes into the monorepo layout

提交时间：2026-08-20T09:39:45-04:00。

````text
fix(deps): carry CVE-2026-13676/CVE-2026-39244 fixes into the monorepo layout

The pre-split main fixed fast-uri (override pin 4.1.2) and adm-zip
(^0.5.17 -> ^0.6.0) in the old single-package manifest; the monorepo
rebase moved manifests, so the fixes are re-applied where the deps now
live: adm-zip ^0.6.0 in root + packages/app + apps/electron, and the
fast-uri 4.1.2 pin in pnpm-workspace.yaml overrides. pnpm-lock.yaml
regenerated via pnpm install (never hand-edited).

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-72551f625b"></a>
## [72551f625b](./cc-viewer-alignment-commit-ledger.md#commit-72551f625b) — fix(system-prompt): drop 7 loop-volatile dynamic prompt variables

提交时间：2026-08-23T13:30:04+08:00。

````text
fix(system-prompt): drop 7 loop-volatile dynamic prompt variables

Remove ${git.status}, ${os.uptime}, ${os.freeMemory}, ${terminal.columns},
${terminal.rows}, ${time.current}, ${time.iso} — they drift mid-session so the
injected system text goes stale and misleads context. Removed from the default
template, the Dynamic Parameter Documentation (×18 locales), and
createSystemPromptVariables; stable identifiers stay. Removed placeholders stay
literal under missingVariableMode 'keep' (regression test added).
````

<a id="message-efc7f8eab1"></a>
## [efc7f8eab1](./cc-viewer-alignment-commit-ledger.md#commit-efc7f8eab1) — feat(chat): floating composer overlay + SDK full-surface parity

提交时间：2026-08-23T14:08:45+08:00。

````text
feat(chat): floating composer overlay + SDK full-surface parity

- Floating composer: inputStack absolute + gradient background + spacer div
- SDK mode: full PTY-parity surface (approvals, slash commands, compact notices)
- Server: terminalWss cleanup on stop, sdk-init WS replay, sdkCompactNotices cap
- Tests: floating-input-stack regression suite, wsopen-sdk-gate, approval-policy, launch-config
- i18n: sdkError/sdkCompacted/sdkSlashHint keys across 18 locales
- Docs: README + history.md updated
````

<a id="message-6ebeea8439"></a>
## [6ebeea8439](./cc-viewer-alignment-commit-ledger.md#commit-6ebeea8439) — Merge branch 'feat/remove-volatile-prompt-vars'

提交时间：2026-08-23T15:05:38+08:00。

````text
Merge branch 'feat/remove-volatile-prompt-vars'

Drop 7 loop-volatile dynamic system-prompt variables (git.status, os.uptime,
os.freeMemory, terminal.columns/rows, time.current/iso) that drifted mid-session
and misled context. Removed from the default template, the Dynamic Parameter
Documentation (×18 locales), and createSystemPromptVariables; stable identifiers stay.

# Conflicts:
#	history.md
````

<a id="message-93a17ea623"></a>
## [93a17ea623](./cc-viewer-alignment-commit-ledger.md#commit-93a17ea623) — chore(tarball): add approval-policy.js + launch-config.js to the tarball baseline

提交时间：2026-08-23T15:32:21+08:00。

````text
chore(tarball): add approval-policy.js + launch-config.js to the tarball baseline

The verify:tarball gate flagged the two new server/lib modules (production deps of
pty-manager / sdk-manager / perm-bridge / cli.js) as a baseline delta. Regenerate the
baseline so CI's tarball contract passes.
````

<a id="message-7a2dd6162e"></a>
## [7a2dd6162e](./cc-viewer-alignment-commit-ledger.md#commit-7a2dd6162e) — fix(sdk): expand all system segments in request JSON view on first-turn MainAgent requests

提交时间：2026-08-23T22:16:20+08:00。

````text
fix(sdk): expand all system segments in request JSON view on first-turn MainAgent requests

The DetailPanel JSON view previously only expanded system[2] for Preflight
requests, so SDK-mode first-turn requests (classified as MainAgent) kept
every system segment collapsed. The policy now expands the full system
array for single-message MainAgent requests, making the SDK base prompt
visible. Also add an SDK-mode placeholder notice in the Context tab
system-prompt section explaining that only a condensed 2-segment capture
is available and recommending TUI mode for the complete prompt.
````

<a id="message-dafe2bce37"></a>
## [dafe2bce37](./cc-viewer-alignment-commit-ledger.md#commit-dafe2bce37) — feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes

提交时间：2026-08-23T19:33:38-04:00。

````text
feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes

- feat(chat): server-authoritative busy queue broadcast as queue-state over
  the terminal WS (replayed on reconnect) and rendered as floating bubbles
  above the composer, each with Send now (interrupt + immediate inject,
  Claude Code Esc parity) and remove; SDK mode gets id-addressable
  {id,text,ts} queue items with sendQueuedNow/removeQueued/clearQueued/
  getQueueSnapshot exports; PTY mode gets a dependency-injected
  server/lib/chat-queue.js injecting via the IM bridge bracketed-paste
  path, guarded on streaming/approvals/pty-kind/mutex with a no-blind-
  inject safety poll (minor).
- fix(logs): interrupted requests no longer freeze the conversation view —
  placeholder CHECKPOINTS from never-completed turns now absorb into the
  baseline across all three reconstruction APIs (patch).
- fix(chat): queued/send-now user messages now render in the conversation
  panel — mergeMainAgentSessions fallback is now a deepest-common-prefix
  extension, documented as WIRE_FORMAT.md §3.8 (patch).

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-e987c387f4"></a>
## [e987c387f4](./cc-viewer-alignment-commit-ledger.md#commit-e987c387f4) — release: cc-viewer 1.8.0 (changeset version)

提交时间：2026-08-24T10:30:01+08:00。

````text
release: cc-viewer 1.8.0 (changeset version)
````

<a id="message-6bcf5e5ab3"></a>
## [6bcf5e5ab3](./cc-viewer-alignment-commit-ledger.md#commit-6bcf5e5ab3) — fix(electron): preserve publish metadata in staging

提交时间：2026-08-24T10:46:13+08:00。

````text
fix(electron): preserve publish metadata in staging
````

<a id="message-bb8095c7fb"></a>
## [bb8095c7fb](./cc-viewer-alignment-commit-ledger.md#commit-bb8095c7fb) — fix(release): streamline notarization and tarball checks

提交时间：2026-08-24T11:47:56+08:00。

````text
fix(release): streamline notarization and tarball checks
````

<a id="message-7ac9363385"></a>
## [7ac9363385](./cc-viewer-alignment-commit-ledger.md#commit-7ac9363385) — chore(star-history): refresh chart [skip ci]

提交时间：2026-08-24T04:03:53+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-bacfe559fe"></a>
## [bacfe559fe](./cc-viewer-alignment-commit-ledger.md#commit-bacfe559fe) — fix(release): support npm 12 pack output

提交时间：2026-08-24T12:06:49+08:00。

````text
fix(release): support npm 12 pack output
````

<a id="message-c185a7484e"></a>
## [c185a7484e](./cc-viewer-alignment-commit-ledger.md#commit-c185a7484e) — refactor(context): rename Context tab per-exchange "Turn N" concept to "Step N"

提交时间：2026-08-24T05:24:41-04:00。

````text
refactor(context): rename Context tab per-exchange "Turn N" concept to "Step N"

Terminology: a complete session is one turn; each user→assistant loop
iteration inside it is a step. Covers the history-list and current-item
labels (ui.context.currentTurn/historyTurnNoTime → currentStep/
historyStepNoTime, re-translated ×18 locales), the detail-panel chip
(Turn 22 → Step 22), the grouping module (contextTurns.js →
contextSteps.js; groupMessagesIntoSteps; node shape isStep/stepIndex/
step__* ids), ContextTab internals (StepContent/formatStepTime/
.stepDivider), and the ToolsFirst concept doc's cache-prefix diagram
(×18 locales). Turn-end (Stop hook) naming unchanged — it marks the
end of the whole turn.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-dc1aeb2840"></a>
## [dc1aeb2840](./cc-viewer-alignment-commit-ledger.md#commit-dc1aeb2840) — docs(research): add automated test-case generation survey

提交时间：2026-08-24T07:24:56-04:00。

````text
docs(research): add automated test-case generation survey

Survey of 44 GitHub repos that generate automated test cases (LLM unit
test generators, skill/prompt collections, API/UI generators, classic
SBST/symbolic tools as baselines), plus agent-workflow teardowns
(TestGen-LLM filter cascade, CoverAgent analyze/generate split, UTBot
error suite, oracle-compliance failure modes) and the test-design
methodology reference — the basis for the Test Analysis Expert
UltraPlan preset.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-f28d9cae37"></a>
## [f28d9cae37](./cc-viewer-alignment-commit-ledger.md#commit-f28d9cae37) — feat(ultraplan): add Test Analysis Expert (测分专家) preset expert

提交时间：2026-08-24T07:26:46-04:00。

````text
feat(ultraplan): add Test Analysis Expert (测分专家) preset expert

Third preset in packages/content/ultraAgents/ (standalone-authored,
title/description inline-localized x18 languages): turns local Claude
Code into a UI test-analysis expert that produces a markdown test
analysis report plus Midscene.js YAML automation flows.

Workflow: gated materials intake (system-analysis docs, requirements,
SUT repo, environment context; AskUserQuestion when required items are
missing) -> multi-agent analysis (requirements deconstruction /
system-analysis mapping / code grounding / environment completeness /
asset inventory) -> test-analysis report with test-design decision
rules (EP+BVA / decision tables / state-transition / pairwise /
risk-based) submitted via an ExitPlanMode gate -> approval-gated YAML
generation (official-docs-verified Midscene schema, instant-action vs
aiAct split, visual prompts, YAML string-quoting and flow-key
structural rules, self-contained flows, login-state strategy, ${VAR}
secret placeholders) under an anti-oracle-compliance guardrail
(expectations from the specification only; spec-conflict flows
isolated in suspected-bugs/; spec-silent assertions omitted as gaps)
-> five-dimension static review (schema / assert locatability /
anti-oracle compliance / flow self-containment & step reachability /
traceability+dedup) -> deliverable bundle with run-notes.md offline
handoff. UI layer only; generation only, never executes the flows.

Also: ultraAgents README gains the preset row + standalone-authorship
note; test comment scope narrowed to the two template-derived presets;
tarball baseline regenerated (1569 files).

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-fe0c52ff60"></a>
## [fe0c52ff60](./cc-viewer-alignment-commit-ledger.md#commit-fe0c52ff60) — feat(system-prompt): built-in model system prompts default-effective with override + tombstone disable

提交时间：2026-08-24T11:22:01-04:00。

````text
feat(system-prompt): built-in model system prompts default-effective with override + tombstone disable

The six shipped presets (deepseek-v4-pro / deepseek-v4-flash / GLM-5.2 /
Qwen-3.7-Max / kimi-k2.7-code / kimi-k3) are now injected automatically
at spawn when the resolved model matches and no user entry exists
(workspace > global > built-in; user files always win). A built-in hit
carries user-entry semantics: it fully replaces the Default sentinels
for that launch (all presets are override-mode; visible in the launch
log as builtin:<NAME>).

- new server/lib/builtin-model-prompts.js: manifest-driven matching
  (expandModelIdVariants alias expansion shared with the user-file
  layer, fixing the k3[1m] priority gap), per-scope tombstones
  (system_prompt/.builtin-disabled.json; corrupt files warn via
  reportSwallowed, never silently), content-addressed materialization
  (read-back hash verify, atomic renameSyncWithRetry, aged GC) —
  injection stays on --system-prompt-file so snapshot pinning/Bind A
  are unaffected; the whole layer degrades to sentinels on any failure
- spawn diagnostics distinguish builtin-disabled from no-match
- expert routes: status mirrors spawn semantics (conditional
  builtinDisabled field), GET exposes the builtin entries, POST gains
  a disable/enable action with bad_action/unknown_builtin guards
  (a mistyped action can never delete a user entry)
- Edit System Prompt modal: built-in tabs with a Built-in badge,
  materialize-on-save with key migration + shadowed-merge guard,
  immediate disable/enable toggle (clears every tombstoned scope);
  header entry stays visible marked Disabled for re-enabling
- shared pure logic in apps/web/src/utils/builtinPromptTabs.js (+12
  unit tests); new i18n keys x18 locales; README section updated in
  all 18 locales; tarball baseline regenerated (1570 files)

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-936e4637c8"></a>
## [936e4637c8](./cc-viewer-alignment-commit-ledger.md#commit-936e4637c8) — release: cc-viewer 1.8.1 (changeset version)

提交时间：2026-08-24T11:22:40-04:00。

````text
release: cc-viewer 1.8.1 (changeset version)
````

<a id="message-1af3d646c9"></a>
## [1af3d646c9](./cc-viewer-alignment-commit-ledger.md#commit-1af3d646c9) — fix(ultraplan): rework Test Analysis Expert preset around Plan tool with staticized Midscene rules

提交时间：2026-08-24T23:41:40-04:00。

````text
fix(ultraplan): rework Test Analysis Expert preset around Plan tool with staticized Midscene rules

Mirror the Code Expert design: the plan phase is an explicit Plan-tool
workflow (EnterPlanMode up front, report IS the plan, two mandatory
non-skippable optimization rounds — review-agent pass, then
ExitPlanMode approval). Midscene.js YAML authoring rules are now a
locked self-contained snapshot inlined in the prompt (recordToReport
documented); the GitHub reference is removed and external doc fetches
are forbidden so the preset works offline. Descriptions x18 locales
state the Midscene-specific scope constraint.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-7c1963aca1"></a>
## [7c1963aca1](./cc-viewer-alignment-commit-ledger.md#commit-7c1963aca1) — fix(app-header): show only main profile on proxy hot-switch chip

提交时间：2026-08-25T06:42:11-04:00。

````text
fix(app-header): show only main profile on proxy hot-switch chip

The header chip used to spell out sub-agent/teammate role assignments
("· Sub: X · Teammate: Y") inline, which made the header too verbose.
The chip label now shows just the main profile; the full role breakdown
remains available in the hover tooltip (ui.proxy.roleSummary) and in the
ProxyModal assignment area. Visibility guard (wake on role overrides when
main is Default) is unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-3a2159219b"></a>
## [3a2159219b](./cc-viewer-alignment-commit-ledger.md#commit-3a2159219b) — feat(context): default unrecognized model context window to 1M

提交时间：2026-08-25T15:46:11-04:00。

````text
feat(context): default unrecognized model context window to 1M

The shared rules table (@ccv/core/context-rules) fell through to 200K
for any model name outside the known families, so the usage bar filled
far too fast for unlisted third-party models. Unknown-but-present model
names now resolve to 1M; explicit [Nk]/[Nm] suffixes and every
recognized family (bare claude/haiku/old-opus 200K, gpt 128K,
kimi/moonshot 256K) are unchanged, and empty/missing names keep the
legacy 200K static fallback. All consumers inherit the new default:
frontend classifyContextWindow auto calibration, server SSE
getContextSizeForModel, and the Workflow · 1M badge.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-9eb178145b"></a>
## [9eb178145b](./cc-viewer-alignment-commit-ledger.md#commit-9eb178145b) — refactor(footer): plain GitHub link and hide plan-usage pill without data

提交时间：2026-08-25T15:46:39-04:00。

````text
refactor(footer): plain GitHub link and hide plan-usage pill without data

Two footer simplifications:
- The GitHub link no longer fetches api.github.com for the stargazer
  count — it renders a fixed "[logo] GitHub" label. The githubStars
  state and fetch block are removed.
- The plan-usage pill now renders only when usage data actually exists;
  the OAuth silent placeholder ("—" pill with a waiting popover) is
  gone, along with its ui.usage.waiting i18n key and .muted style.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-51c974e441"></a>
## [51c974e441](./cc-viewer-alignment-commit-ledger.md#commit-51c974e441) — feat(permission): default auto-approve to a 3s countdown

提交时间：2026-08-25T15:47:02-04:00。

````text
feat(permission): default auto-approve to a 3s countdown

Fresh installs (and users who never touched the setting) now get the
3-second auto-approve tier on permission prompts instead of manual-only.
Users who previously picked a tier — including "Off" — keep their
stored preference, since preferences.json hydration still wins.
Plan-approval auto-approve stays off by default; desktop and mobile
defaults are aligned.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-72c059f6b9"></a>
## [72c059f6b9](./cc-viewer-alignment-commit-ledger.md#commit-72c059f6b9) — feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset

提交时间：2026-08-25T15:47:27-04:00。

````text
feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset

Every built-in model preset gains a "# Working with teammates" section:
never wait passively for a teammate's report (teammates sometimes
finish without sending a message), ask quiet teammates directly for
their result, and ping once before declaring a delegated task blocked.
deepseek-v4-flash gets a terser two-bullet variant matching its style.

Also adds a GLM-5.3 preset forked from GLM-5.2 (match: glm-5.3),
bringing the built-in set to seven; preset-count assertions updated.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-0d067a1b7c"></a>
## [0d067a1b7c](./cc-viewer-alignment-commit-ledger.md#commit-0d067a1b7c) — docs(changelog): history.md entries for 1M default, footer simplification, 3s auto-approve, teammate prompt rules

提交时间：2026-08-25T15:48:25-04:00。

````text
docs(changelog): history.md entries for 1M default, footer simplification, 3s auto-approve, teammate prompt rules

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-73557f1989"></a>
## [73557f1989](./cc-viewer-alignment-commit-ledger.md#commit-73557f1989) — chore(scripts): regenerate tarball baseline for GLM-5.3 preset

提交时间：2026-08-26T20:02:58+08:00。

````text
chore(scripts): regenerate tarball baseline for GLM-5.3 preset

Add server/system-prompt-templates/presets/GLM-5.3.md to scripts/tarball-baseline.json so verify:tarball contract check passes.
````

<a id="message-d858204313"></a>
## [d858204313](./cc-viewer-alignment-commit-ledger.md#commit-d858204313) — fix(git): show local commits on branches without an upstream in the changes panel

提交时间：2026-08-26T11:27:52-04:00。

````text
fix(git): show local commits on branches without an upstream in the changes panel

getUnpushedCommits returned an empty list whenever @{upstream} failed to
resolve (local-only branches never pushed with -u, deleted remote branches,
repos without any remote, detached HEAD), and the frontend gated the whole
"Local unpushed commits" section on hasUpstream — making those commits
completely invisible. Fall back to `git log HEAD --not --remotes` (order is
load-bearing: --not flips every revision listed after it) sharing one
log/parse/truncation path with the upstream range; render the section
whenever commits exist and explain the no-upstream case in the header
tooltip (new i18n key x18 locales).

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-20e6573b7c"></a>
## [20e6573b7c](./cc-viewer-alignment-commit-ledger.md#commit-20e6573b7c) — feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step

提交时间：2026-08-27T01:39:07-04:00。

````text
feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step

Release 1.8.2: desktop keeps the latest 800 items (was 400), Android 400
(was 240), iOS 300 (was 150); "load earlier" expands 300 items per click
(was 100) on all platforms. Also consumes pending changesets: teammate
no-wait presets + GLM-5.3, 1M default context, 3s auto-approve default,
footer simplification, no-upstream git commits fix, ultraplan preset rework.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-8fb468ddc8"></a>
## [8fb468ddc8](./cc-viewer-alignment-commit-ledger.md#commit-8fb468ddc8) — fix(system-prompt): add background-agent waiting discipline to Kimi presets

提交时间：2026-08-31T00:35:15+08:00。

````text
fix(system-prompt): add background-agent waiting discipline to Kimi presets

Kimi K3 / Kimi K2.7 Code presets gain a "Waiting on background agents"
section: verify teammate status via subagents/agent-*.jsonl (or
SendMessage) before waiting, read results back with tail + jq instead
of a full Read, and cap idle waiting (change strategy after 2 empty
rounds, escalate after ~10 minutes).
````

<a id="message-2f83632f32"></a>
## [2f83632f32](./cc-viewer-alignment-commit-ledger.md#commit-2f83632f32) — release: cc-viewer 1.8.3 (changeset version)

提交时间：2026-08-31T00:47:54+08:00。

````text
release: cc-viewer 1.8.3 (changeset version)
````

<a id="message-5352005402"></a>
## [5352005402](./cc-viewer-alignment-commit-ledger.md#commit-5352005402) — chore(star-history): refresh chart [skip ci]

提交时间：2026-08-31T09:42:51+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-fa77ecd681"></a>
## [fa77ecd681](./cc-viewer-alignment-commit-ledger.md#commit-fa77ecd681) — fix(v2): exclude proxy retry-stat shards from legacy v1 log sniffing

提交时间：2026-09-01T10:34:33+08:00。

````text
fix(v2): exclude proxy retry-stat shards from legacy v1 log sniffing

proxy_YYYY-MM-DD.jsonl files are proxy retry statistics (proxy-stats.js),
not v1 conversation logs, but listV1Files matched them by .jsonl suffix,
triggering a spurious migration prompt for every proxy user.

release: cc-viewer 1.8.4 (changeset version)
````

<a id="message-1c5fadafbf"></a>
## [1c5fadafbf](./cc-viewer-alignment-commit-ledger.md#commit-1c5fadafbf) — feat(chat): Claude Code task checklist HUD docked above the chat composer

提交时间：2026-09-01T12:21:31-04:00。

````text
feat(chat): Claude Code task checklist HUD docked above the chat composer

Surface the TUI task checklist (TaskCreate/TaskUpdate state) in the GUI as a
compact strip above the chat input box (✓ done/total + current task),
expandable to the full list in creation order, auto-hidden when empty or all
completed. Data channel is CC hooks (TaskCreated/TaskCompleted + PostToolUse
TaskUpdate) via the new task-bridge → POST /api/task-event → task-state
reducer → debounced full-snapshot SSE task_update (per-connection replay)
→ taskStore → TaskProgressHud. Session-boundary resets gated by the pure
shouldResetTasks (agent_id forwarded by session-start-bridge; resume/fork to
a different session resets). Coverage: task-state / task-bridge /
ensure-hooks-tasks / task-event-route / api-events-gap snapshot frame /
taskStore / session-start-bridge agent_id tests.

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-52adf8968a"></a>
## [52adf8968a](./cc-viewer-alignment-commit-ledger.md#commit-52adf8968a) — chore(release): 1.8.5

提交时间：2026-09-01T12:22:46-04:00。

````text
chore(release): 1.8.5

Co-Authored-By: Claude <noreply@anthropic.com>
````

<a id="message-a70440ee62"></a>
## [a70440ee62](./cc-viewer-alignment-commit-ledger.md#commit-a70440ee62) — feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on)

提交时间：2026-09-02T11:32:38-04:00。

````text
feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on)

Post-pass over built rows (utils/toolRunMerge.js) folds same-agent tool-only
runs; turn-boundary rows close every stream; merged members drop the tools-used
prefix; per-call times in pill popovers; system prompts fold to a grey icon.
Toggle on desktop drawer, mobile sheet and per-project preferences; default on
for fresh installs (stored false respected). minimalChat joins the item-cache
toggle signature. Adds test:web script (glob form for Node 24).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
````

<a id="message-44320725ab"></a>
## [44320725ab](./cc-viewer-alignment-commit-ledger.md#commit-44320725ab) — chore(release): 1.8.6

提交时间：2026-09-02T11:34:15-04:00。

````text
chore(release): 1.8.6

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
````

<a id="message-bd50636219"></a>
## [bd50636219](./cc-viewer-alignment-commit-ledger.md#commit-bd50636219) — perf(search): move node-engine scan to a worker thread, virtualize result list

提交时间：2026-09-04T12:59:26+08:00。

````text
perf(search): move node-engine scan to a worker thread, virtualize result list

- node fallback engine runs in search-worker.js (worker_threads) so large
  codebases no longer pin the server event loop / Electron tab backend;
  abort maps to terminate, invalid_regex maps back to the 400 contract;
  yields are byte-aware (every 4MB) instead of every-64-files
- sidebar results render through react-virtuoso (flattened file/match
  rows) with FileRow/MatchRow subcomponents; collapse + replace flows kept
- prev/next match navigation (Enter/Shift+Enter, nav buttons, arrow keys
  on match rows) with rAF-retried focus; visible engine badge; slow-search
  hint after 1s when ripgrep is absent (ui.search.navPrev/navNext/
  nodeSlowHint x18 locales)
- Enter only navigates when results reflect the current query (debounce
  settled); a fresh term still searches first
- history.md: bind the 29 previously-unreleased entries to their released
  versions (1.7.23-1.8.6) using git tag boundaries; add the missing
  1.7.23 CVE and 1.8.4 entries
- chat: appended-system-prompt label is no longer text-selectable
````

<a id="message-cdabb27454"></a>
## [cdabb27454](./cc-viewer-alignment-commit-ledger.md#commit-cdabb27454) — fix(footer): hide geo badge for non-Anthropic-official subscriptions

提交时间：2026-09-04T14:14:12+08:00。

````text
fix(footer): hide geo badge for non-Anthropic-official subscriptions

CountryFlag now mounts only when the endpoint is official
(proxyOfficialDefault via isOfficialDefaultEndpoint) AND plan-usage
headers have actually been seen (planUsage non-null). Third-party proxy
or self-hosted profile users no longer see the flag, and the
ipinfo.io/ipwho.is/ipapi.co lookups are never fired for them.
````

<a id="message-d5e66ec1d8"></a>
## [d5e66ec1d8](./cc-viewer-alignment-commit-ledger.md#commit-d5e66ec1d8) — feat(cli): inject enhanced context into headless (-p)/one-shot run sessions without starting GUI

提交时间：2026-09-04T17:28:59+08:00。

````text
feat(cli): inject enhanced context into headless (-p)/one-shot run sessions without starting GUI

- runProxyCommand now runs the full system-prompt pipeline (resolveLaunchSystemPrompt),
  so CC_SYSTEM.md / CC_APPEND_SYSTEM.md / model-specific system_prompt/ entries are
  injected exactly as in the PTY path; add CCV_CLI_MODE=1 so a one-shot run no longer
  prints the "CC Viewer started" GUI banner.
- Extract shared pure helper insertBeforeDashDash into launch-config.js: injections land
  before a literal `--` (prompt text) and --thinking-display is relocated out of the
  prompt region; pty-manager.js adopts it too, fixing the same `--` misplacement on the
  GUI path.
- Add 9 headless-injection test cases (sentinel / manual-flag / env / model match /
  ordering / fresh / pin-resume / banner-negation / isClaudeCmd gate).
- Register search-worker.js / task-bridge.js / task-state.js in the tarball baseline
  (verify:tarball contract).
````

<a id="message-ef28ec388d"></a>
## [ef28ec388d](./cc-viewer-alignment-commit-ledger.md#commit-ef28ec388d) — chore(release): 1.8.7

提交时间：2026-09-04T18:45:02+08:00。

````text
chore(release): 1.8.7
````

<a id="message-ba3eee8fd5"></a>
## [ba3eee8fd5](./cc-viewer-alignment-commit-ledger.md#commit-ba3eee8fd5) — feat(files): add "Download to local" context-menu item for remote sessions, streamed via GET /api/download-file

提交时间：2026-09-05T21:48:13+08:00。

````text
feat(files): add "Download to local" context-menu item for remote sessions, streamed via GET /api/download-file
````

<a id="message-57798b7ccc"></a>
## [57798b7ccc](./cc-viewer-alignment-commit-ledger.md#commit-57798b7ccc) — fix(logs): project switch lag, single-page pager, and pager spacing in log-management modal

提交时间：2026-09-06T02:11:02+08:00。

````text
fix(logs): project switch lag, single-page pager, and pager spacing in log-management modal

- Move the page-1 refetch into the setState callback in both
  handleLogsProjectChange and handleImportLocalLogs so _localLogsUrl
  reads the new logViewProject (was requesting the previous project,
  leaving the list one round behind).
- Gate the pager on total > LOG_PAGE_SIZE instead of antd's
  hideOnSinglePage, which flickered while totals were stale mid-switch;
  a single page of sessions now renders no pagination bar at all.
- Give antd pagination items a 4px gap, scoped to .logListContainer,
  with doubled-class specificity to beat the mini-pager margin reset.

Coverage: apps/web/test/logs-modal.test.js (source contracts).
````

<a id="message-2cb0806a32"></a>
## [2cb0806a32](./cc-viewer-alignment-commit-ledger.md#commit-2cb0806a32) — chore(release): 1.8.8

提交时间：2026-09-06T02:27:48+08:00。

````text
chore(release): 1.8.8
````

<a id="message-9b1a2c913a"></a>
## [9b1a2c913a](./cc-viewer-alignment-commit-ledger.md#commit-9b1a2c913a) — docs(claude): document release tag ordering — changeset version bump must land before tagging

提交时间：2026-09-06T02:31:47+08:00。

````text
docs(claude): document release tag ordering — changeset version bump must land before tagging
````

<a id="message-aa58422956"></a>
## [aa58422956](./cc-viewer-alignment-commit-ledger.md#commit-aa58422956) — feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges

提交时间：2026-09-07T01:57:34+08:00。

````text
feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges

- promptNav: scan assistant bubbles for ExitPlanMode/AskUserQuestion tool_use
  blocks and tag UltraPlan user prompts (via props.isUltraplan), interleaved
  chronologically with plain prompts, each with a colored badge (Plan=blue
  outline, Ask=green, UltraPlan=solid blue); clicking scrolls+highlights the
  containing bubble
- perf: cache the nav build on a content fingerprint (allItems/mainAgentSessions
  refs + role-filter + visibleCount) instead of the per-render visible slice
- fix(chat): task-list HUD chevron hover uses neutral grey, not primary blue
- fix(tests): win32 reveal-file capture stub appends and reads only the newly
  appended line, eliminating the intermittent wrong-path flake

New i18n keys ui.navBadgePlan/ui.navBadgeAsk (x18 locales; UltraPlan reuses
ui.ultraplan). Coverage: promptNav.test.js
````

<a id="message-b7678de6f6"></a>
## [b7678de6f6](./cc-viewer-alignment-commit-ledger.md#commit-b7678de6f6) — chore(release): 1.8.9

提交时间：2026-09-07T01:57:45+08:00。

````text
chore(release): 1.8.9
````

<a id="message-85b9aabce4"></a>
## [85b9aabce4](./cc-viewer-alignment-commit-ledger.md#commit-85b9aabce4) — fix(ci): widen bump-homebrew npm-registry wait window to 10min

提交时间：2026-09-07T02:07:00+08:00。

````text
fix(ci): widen bump-homebrew npm-registry wait window to 10min

v1.8.8's bump-homebrew job timed out after 10x30s even though the npm publish
had succeeded — with Sigstore provenance logging, the registry's
/{pkg}/{version} CDN endpoint can take longer than 5min to propagate. Bump the
retry loop to 20x30s (10min) so the formula bump survives slow propagation.
````

<a id="message-caaab3d12f"></a>
## [caaab3d12f](./cc-viewer-alignment-commit-ledger.md#commit-caaab3d12f) — fix(chat): User Prompt Nav language switch + session-divider attribution (#142)

提交时间：2026-09-07T11:16:48+08:00。

````text
fix(chat): User Prompt Nav language switch + session-divider attribution (#142)

- language switch now refreshes nav badges/title: include props.lang in the
  nav-build cache key (_navCacheKey), since the cached popover content holds
  already-translated strings
- a Plan/Ask card at the end of a session is attributed to its own session and
  shows its real time: session attribution and the time label use the assistant
  bubble's displayTs (producer request ts), not the carrier timestamp that is
  already the next session's first entry ts
- harden the tool-name lookup with Object.hasOwn so a tool_use block named
  constructor/toString cannot produce a phantom nav entry

Coverage: promptNav.test.js (producer-session attribution across a boundary,
carrier fallback, prototype-member guard)
````

<a id="message-39acd8150f"></a>
## [39acd8150f](./cc-viewer-alignment-commit-ledger.md#commit-39acd8150f) — chore(star-history): refresh chart [skip ci]

提交时间：2026-09-07T08:16:12+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-36df32b7e1"></a>
## [36df32b7e1](./cc-viewer-alignment-commit-ledger.md#commit-36df32b7e1) — fix(server): allow authenticated remote admins to use management endpoints

提交时间：2026-09-07T16:51:57+08:00。

````text
fix(server): allow authenticated remote admins to use management endpoints

Container/cloud deployment: management routes were hard-gated on isLocal
(loopback socket peer), so a remote admin's browser got "保存失败: Loopback
only" when saving IM/DingTalk config, and "启动失败: worker 未在限定时间内就绪"
because the status poll never received the process field.

decideAuth now returns an isAdmin flag (loopback / valid ?token= / valid
password-login cookie), computed from the same credential-bearing branches so
it can't drift from the gate; empty-password mode is deliberately NOT admin
(read access only, destructive actions stay credential/loopback-gated).
server.js attaches it as req.ccvIsAdmin; management routes (im, dingtalk,
auth, project-prefs, preferences, skills, voice-pack) accept it via
isAdminReq. IM/DingTalk status returns process/pid/connection (incl.
lastError for the error chip) to a remote admin; plaintext secrets stay
loopback-only. /api/preferences emits _isAdmin so the admin-only settings UI
(project-prefs manage entry, Claude executable selector) shows for a remote
admin (AppHeader + Mobile). Internal machine bridges (events.js notifies,
ask-perm.js streamChunk) stay strictly loopback + INTERNAL_TOKEN; IM workers
still bind 127.0.0.1. No listen-address/port behavior changed.

Coverage: is-admin.test.js, auth-lib.test.js (decideAuth isAdmin branches),
branch-routes-im.test.js, api-dingtalk-gap.test.js, task-event-route.test.js.
````

<a id="message-513577d01c"></a>
## [513577d01c](./cc-viewer-alignment-commit-ledger.md#commit-513577d01c) — chore(release): 1.8.10

提交时间：2026-09-07T16:53:10+08:00。

````text
chore(release): 1.8.10
````

<a id="message-4385631527"></a>
## [4385631527](./cc-viewer-alignment-commit-ledger.md#commit-4385631527) — chore(release): add server/lib/is-admin.js to tarball baseline

提交时间：2026-09-07T17:16:10+08:00。

````text
chore(release): add server/lib/is-admin.js to tarball baseline
````

<a id="message-71cee60794"></a>
## [71cee60794](./cc-viewer-alignment-commit-ledger.md#commit-71cee60794) — fix(ci): close the release-pipeline gaps that made releases fail repeatedly

提交时间：2026-09-07T17:48:09+08:00。

````text
fix(ci): close the release-pipeline gaps that made releases fail repeatedly

Three structural fixes, each verified against the failure evidence:

1. release.yml — bump-homebrew now `needs: npm-publish` (was `needs: publish`).
   It raced the npm registry write and timed out its poll every release
   (v1.8.8/1.8.9/1.8.10) because it only waited on the GitHub Release job.
   Now it runs only after the package is actually on the registry.

2. Local gate — new scripts/verify-tarball-drift.mjs (cheap, no npm pack)
   diffs the publishable source-file set (server/, concepts/, ultraAgents/,
   plugins/, @ccv/core/src) against scripts/tarball-baseline.json and is wired
   into every pretest* hook. Previously only the slow verify:tarball caught
   tarball drift, and only in CI/release — so a new server/lib/*.js slipped
   through locally and failed the v1.8.10 publish.

3. CLAUDE.md — document the baseline-regen rule and warn against pushing a
   feature together with its changeset in one commit (skips the per-commit CI
   run, so tarball/boundary regressions only surface at release time).
````

<a id="message-6880f77320"></a>
## [6880f77320](./cc-viewer-alignment-commit-ledger.md#commit-6880f77320) — feat(chat): clickable local file paths in markdown links and code spans

提交时间：2026-09-09T04:26:05+08:00。

````text
feat(chat): clickable local file paths in markdown links and code spans

- markdown links: external links open in a new tab (Electron: system browser
  via setWindowOpenHandler; same-origin windows stay in-app); local file
  links are tagged data-md-file and open in the embedded file viewer;
  read-only surfaces swallow local file links instead of navigating away
- code spans: backtick-wrapped text that looks like a local path is tagged
  with an inert data-md-path-candidate marker at render time (render pipeline
  stays pure/cache-safe); ChatView probes the new POST /api/files-exists
  endpoint (isReadAllowed policy, uniform exists:false, no reason leakage) and
  upgrades only existing files to clickable (data-md-file-verified): dotted
  underline at rest, border+color feedback on hover, click/Enter opens the
  embedded viewer; :N / :N-M line suffix targets the line via scrollToLine
  (desktop); negative verdicts carry a 30s TTL
- skills: all three skill-add entries share one strict SKILL.md frontmatter
  check (name + description required; new error codes), CRLF tolerated,
  shared code→i18n mapping on both upload entry points
- style(chat): chat-boxer hover switches to a solid color instead of the
  gradient swap; border unchanged
````

<a id="message-55544f6e40"></a>
## [55544f6e40](./cc-viewer-alignment-commit-ledger.md#commit-55544f6e40) — chore(release): 1.8.11

提交时间：2026-09-09T04:26:14+08:00。

````text
chore(release): 1.8.11
````

<a id="message-865604d68e"></a>
## [865604d68e](./cc-viewer-alignment-commit-ledger.md#commit-865604d68e) — feat(files): remote web file browser modal with shared context menu + image thumbnails

提交时间：2026-09-09T20:20:19+08:00。

````text
feat(files): remote web file browser modal with shared context menu + image thumbnails

- Remote/container sessions (preferences._isLocal === false): the file-explorer
  header folder icon opens an in-app OS-style file browser modal (tree + icon
  grid, breadcrumb/up/refresh, project-root clamped) instead of a silent no-op
  OS file manager launch; local behavior unchanged.
- Right-click context menu extracted to shared modules (fileContextMenu.js
  definition + fileContextMenuActions.jsx handler factory) consumed by the
  sidebar tree, sidebar header, sidebar blank area, and the modal (rows, grid
  cells, grid blank area) — one definition keeps all surfaces in sync.
- Grid image cells render lazy <img> thumbnails via /api/file-raw with icon
  fallback; FILE_RAW_MIME gains image/bmp + image/avif.
- Modal mutations (create/rename/delete) refresh both the modal and the
  sidebar; clipboard copies fall back to execCommand on non-secure LAN origins.

Coverage: file-browser-modal.test.js, file-context-menu.test.js,
api-files-content.test.js.
````

<a id="message-2a0d1b30d3"></a>
## [2a0d1b30d3](./cc-viewer-alignment-commit-ledger.md#commit-2a0d1b30d3) — chore(release): 1.8.12

提交时间：2026-09-09T20:22:04+08:00。

````text
chore(release): 1.8.12
````

<a id="message-365af800e5"></a>
## [365af800e5](./cc-viewer-alignment-commit-ledger.md#commit-365af800e5) — feat(files): file browser modal upload + in-project drag-move + zone drag feedback

提交时间：2026-09-10T05:52:58+08:00。

````text
feat(files): file browser modal upload + in-project drag-move + zone drag feedback

- Modal upload: toolbar button (into currentPath) + zoned drag-drop (tree
  folder nodes / grid folder cells / grid blank), sharing the extracted
  importFiles pipeline with the sidebar FileExplorer.
- In-project drag-move: grid rows/cells draggable; drop onto folder cells,
  tree folders (500ms hover auto-expand), breadcrumbs, or blank areas to
  move (guards: self/descendant/same-dir). Shared fileMove.js +
  useFileDropTarget / useInternalMoveTarget hooks; sidebar switched over.
- Global drag rework: zone-scoped masks (chat+terminal as one
  data-drop-zone="chat" zone, sidebar self-highlight), non-responsive
  regions reject drops on desktop; global handling suppressed while antd
  modals/drawers are open (isOverModalPortal); Mobile keeps the legacy
  full-screen overlay.
- fix(server): /api/move-file accepts toDir:'' (move to project root) —
  previously rejected as 400, so the sidebar's documented blank-area
  move-to-root never worked.
- fix(web): modal follows the sidebar refreshTrigger so cross-surface
  moves/imports don't leave it stale; refreshTrigger effect declared after
  refresh() (minified-bundle TDZ crash).

i18n: ui.fileBrowserModal.upload x18 locales.
Coverage: files-import.test.js, file-move.test.js, drag-drop-zones.test.js,
file-browser-modal.test.js, api-files-fs.test.js.
````

<a id="message-3a737c97ed"></a>
## [3a737c97ed](./cc-viewer-alignment-commit-ledger.md#commit-3a737c97ed) — chore(release): 1.8.13

提交时间：2026-09-10T05:53:47+08:00。

````text
chore(release): 1.8.13
````

<a id="message-48d6e0f3c3"></a>
## [48d6e0f3c3](./cc-viewer-alignment-commit-ledger.md#commit-48d6e0f3c3) — fix(tests): await stopViewer in server.test.js to fix EPIPE flake

提交时间：2026-09-10T06:12:47+08:00。

````text
fix(tests): await stopViewer in server.test.js to fix EPIPE flake

The after hook fired stopViewer() without awaiting its returned _doStop()
promise, then rmSync'd the tmp dir after a fixed 200ms wait. On CI under load
the async teardown (SSE client.end() + closeAllConnections) hadn't finished,
so a lingering SSE res was written after teardown → 'write EPIPE' uncaught
in the before hook's async activity. Await the stop promise instead.
````

<a id="message-bf2d6f2ad8"></a>
## [bf2d6f2ad8](./cc-viewer-alignment-commit-ledger.md#commit-bf2d6f2ad8) — feat(chat): task-list HUD progress dots + reset task list on new prompt

提交时间：2026-09-12T22:14:38+08:00。

````text
feat(chat): task-list HUD progress dots + reset task list on new prompt

Add per-task progress dots to the collapsed HUD strip (grey checked disc =
done, pulsing primary disc = running, hollow ring = pending), sharing one
TaskStatusDot component with the expanded rows. Reset the task list on each
new user prompt via a UserPromptSubmit managed hook with a session-equality
gate (teammate prompts cannot wipe the shared list); tasks the model keeps
using are rebuilt through TaskUpdate stubs.
````

<a id="message-a278d68954"></a>
## [a278d68954](./cc-viewer-alignment-commit-ledger.md#commit-a278d68954) — feat(files): per-file-type SVG icons in the file browser

提交时间：2026-09-12T22:14:49+08:00。

````text
feat(files): per-file-type SVG icons in the file browser

Render every file on a shared folded-document base shape (strokeWidth 2,
house style) with an embedded type glyph: code/markup/data/document/image/
video/audio/archive/pdf/office/font/binary, replacing the single generic grey
document. Classification extracted to a pure fileTypes.js; the two drifted
mobile copies now reuse the shared module with the unified folder color.
````

<a id="message-5aa5728b95"></a>
## [5aa5728b95](./cc-viewer-alignment-commit-ledger.md#commit-5aa5728b95) — feat(files): unify open-project icon to open in-app web file browser

提交时间：2026-09-12T22:14:49+08:00。

````text
feat(files): unify open-project icon to open in-app web file browser

The header folder icon now opens the FileBrowserModal for both local and
remote access instead of shelling out to the OS file manager on local access;
tooltip updated to "Browse project files" (18 locales).
````

<a id="message-637fbb0218"></a>
## [637fbb0218](./cc-viewer-alignment-commit-ledger.md#commit-637fbb0218) — feat(files): theme-adaptive file-type icon colors (dark/light)

提交时间：2026-09-12T22:14:57+08:00。

````text
feat(files): theme-adaptive file-type icon colors (dark/light)

Reference a set of --file-icon-* CSS variables instead of hardcoded hex;
global.css defines them per theme (same pattern as avatar colors), so Office
and other brand hues stay legible in the dark theme and switch instantly
without a re-render.
````

<a id="message-0480a10437"></a>
## [0480a10437](./cc-viewer-alignment-commit-ledger.md#commit-0480a10437) — chore(release): 1.8.14

提交时间：2026-09-12T22:15:04+08:00。

````text
chore(release): 1.8.14
````

<a id="message-0cfc040c0a"></a>
## [0cfc040c0a](./cc-viewer-alignment-commit-ledger.md#commit-0cfc040c0a) — fix(tests): close SSE subscription gracefully in UserPromptSubmit integration test

提交时间：2026-09-13T00:11:04+08:00。

````text
fix(tests): close SSE subscription gracefully in UserPromptSubmit integration test

The new SSE integration test ended its /events subscription with an abrupt
req.destroy() (RST), leaving the server's SSE res writable long enough for
the 120ms debounced task_update broadcast to write to a dead socket after
teardown → "write EPIPE" uncaughtException (the 1.8.13 flake). Destroy the
response instead (FIN) and centralize cleanup in finish().
````

<a id="message-d7f355ba89"></a>
## [d7f355ba89](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89) — fix(chat): rebuild conversation immediately on mid-round page refresh

提交时间：2026-09-13T15:12:05+08:00。

````text
fix(chat): rebuild conversation immediately on mid-round page refresh

Refreshing the browser while a mainAgent SSE request was still streaming
left the conversation panel blank (or showing only the previous session)
until the round completed. Two roots:

- Client: the batch slimmer empties every main carrier except the last,
  which during an in-flight round is the in-progress placeholder — and the
  batch merge gate blocked inProgress unconditionally. On the v3 wire the
  placeholder's messages are already the full accumulated prefix (the
  request-initiation conv write lands before the response streams), so
  admit _v3Assembled/_syntheticV2 in-progress carriers with non-empty
  messages; legacy v1 delta placeholders stay blocked (the batch
  reconstructor skips inProgress).
- Server: getLiveLogSource() served the current session only after a
  COMPLETED main turn, falling back to the previous conversation (or
  nothing) during the first in-flight turn. Accept an in-flight first
  main turn as activated — v3-wire callers only, via serveInFlight, so
  the legacy escape hatch keeps its exact pre-fix behavior (an
  Esc-aborted first turn would otherwise blank the panel forever).

Also guard the same-session merge against wiping the previous turn's
response when the in-flight entry carries none (undefined never
overwrites), and document the known-full contract in WIRE_FORMAT_V3 §4.
````

<a id="message-96c477d582"></a>
## [96c477d582](./cc-viewer-alignment-commit-ledger.md#commit-96c477d582) — fix(server): guard execWithStdin against EPIPE when child exits early

提交时间：2026-09-14T02:01:44+08:00。

````text
fix(server): guard execWithStdin against EPIPE when child exits early

execWithStdin (the git check-ignore wrapper behind /api/files gitignore
marking) wrote child.stdin without an error handler. When the child exits
before consuming its stdin — non-git cwd, a timeout kill, or a missing
binary — the pipe's read end is closed and the write throws 'write EPIPE'.
child.on('error') only catches spawn failures, not stdin write errors, so
the EPIPE escaped as an uncaughtException. Because execWithStdin is async
activity rooted in the server the before hook started, node:test attributed
it to 'before' and failed the file.

This is the recurring server.test.js 'write EPIPE' flake (1.8.13): the
three prior fixes patched SSE paths and never reached the actual stdin
pipe. Add a stdin 'error' listener, wrap write/end in try/catch, and
settle the promise exactly once so an early-exiting child resolves
gracefully instead of throwing.
````

<a id="message-60d20e6417"></a>
## [60d20e6417](./cc-viewer-alignment-commit-ledger.md#commit-60d20e6417) — chore(release): add changeset for execWithStdin EPIPE guard

提交时间：2026-09-14T02:01:54+08:00。

````text
chore(release): add changeset for execWithStdin EPIPE guard
````

<a id="message-ca34587ce5"></a>
## [ca34587ce5](./cc-viewer-alignment-commit-ledger.md#commit-ca34587ce5) — chore(star-history): refresh chart [skip ci]

提交时间：2026-09-14T08:53:12+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-5939b38f93"></a>
## [5939b38f93](./cc-viewer-alignment-commit-ledger.md#commit-5939b38f93) — chore(release): add changesets for bind-latch fixes and terminal-integration observability

提交时间：2026-09-15T21:52:16+08:00。

````text
chore(release): add changesets for bind-latch fixes and terminal-integration observability
````

<a id="message-17df4e2fbf"></a>
## [17df4e2fbf](./cc-viewer-alignment-commit-ledger.md#commit-17df4e2fbf) — fix(proxy): Bind A 一次性闩只锁成功消费 + review 修复 + 终端集成可观测与裸续接检测(静默)

提交时间：2026-09-15T21:52:16+08:00。

````text
fix(proxy): Bind A 一次性闩只锁成功消费 + review 修复 + 终端集成可观测与裸续接检测(静默)

- Bind A(sys-prompt 快照绑定):首个 main 请求被 live 改写为小模型人格时
  匹配失败不再烧掉一次性闩,后续真正带注入人格的请求可重试绑定;此前
  会话快照永不落盘,之后所有 -c/-r 走无记录不注入(注入丢失+缓存重写)
- proxy 角色分类补 x-claude-code-agent-id 头判据(header-only 子代理
  不再被误注主 persona),与 fetch hook 侧对齐
- 启动无注入时兜底收集 variableSnapshot,热切换渲染 preset 不再产生
  空 ${memory.dir}/${os.*}
- QWEN-3 族系合并改名兼容:旧墓碑 QWEN-3.7-MAX 自动归一 QWEN-3,
  用户 opt-out 不静默失效
- deepseek-flash 上下文窗口档位对齐 1M(getModelMaxTokens +
  classifyContextWindow);别名表查询改原型安全
- launch-config flag 解析复用 argValue;interceptor 用 MODEL_PROMPT_DIR 常量
- L1 shell hook 只读探针(installed/stale/corrupt)经 /api/claude-settings
  暴露,缺失/损坏仅浏览器控制台记日志(不弹窗、不改用户 rc)
- L2 resume watchdog:三重门检测裸 claude -c 续接(注入丢失/缓存重写),
  仅控制台记录;README 补从终端继续会话的正确姿势(19 语言开关说明同步)
````

<a id="message-085c21516f"></a>
## [085c21516f](./cc-viewer-alignment-commit-ledger.md#commit-085c21516f) — feat(proxy): system 提示词热切换、内置 preset 族系合并与别名扩展

提交时间：2026-09-15T21:52:16+08:00。

````text
feat(proxy): system 提示词热切换、内置 preset 族系合并与别名扩展

- system 文本随主模型热切换强行覆盖并按 (sessionId, model) 静态化;
  热切换渲染改用启动期变量快照,首请求即生效并修复多处改写缺陷
- 内置 preset 增补通用条款: reads-like-surrounding-code、report-outcomes-
  faithfully、system-reminder 说明补齐 7 个 preset
- Qwen-3.7-Max preset 合并为族系条目 Qwen-3 (match qwen-3), 覆盖整个
  Qwen-3.* 家族
- 模型 id 别名表新增 deepseek-flash -> deepseek-v4-flash, 与 k3 同机制
- 18 个语言版本 README 同步, tarball baseline 重新生成
````

<a id="message-9c1d079f86"></a>
## [9c1d079f86](./cc-viewer-alignment-commit-ledger.md#commit-9c1d079f86) — chore(release): 1.8.15

提交时间：2026-09-15T22:07:58+08:00。

````text
chore(release): 1.8.15
````

<a id="message-89a0a25364"></a>
## [89a0a25364](./cc-viewer-alignment-commit-ledger.md#commit-89a0a25364) — docs(claude): rewrite CLAUDE.md as prohibitions-only, add patch-only versioning rule

提交时间：2026-09-15T23:45:23+08:00。

````text
docs(claude): rewrite CLAUDE.md as prohibitions-only, add patch-only versioning rule

- Cut repo-structure descriptions, toolchain details, how-to walkthroughs,
  and tool-enforced rules (tarball baseline / boundary gate / deps-vs-devDeps)
- Add the hard rule: changesets always declare patch, minor bumps forbidden,
  verify third-component increment before committing
````

<a id="message-b604b1e4f1"></a>
## [b604b1e4f1](./cc-viewer-alignment-commit-ledger.md#commit-b604b1e4f1) — feat(system-prompt): add async no-poll rule to kimi-k3 preset; drop defensive-engineering line from all prompt templates

提交时间：2026-09-16T08:23:33+08:00。

````text
feat(system-prompt): add async no-poll rule to kimi-k3 preset; drop defensive-engineering line from all prompt templates

chore(release): 1.8.16
````

<a id="message-2e17699fd7"></a>
## [2e17699fd7](./cc-viewer-alignment-commit-ledger.md#commit-2e17699fd7) — feat(git): show +n/-n line stats on unpushed-commit rows, restore real file statuses

提交时间：2026-09-16T08:53:02+08:00。

````text
feat(git): show +n/-n line stats on unpushed-commit rows, restore real file statuses

chore(release): 1.8.17
````

<a id="message-0670581b3d"></a>
## [0670581b3d](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d) — fix(chat): release cold-ingest gate on pipeline failure to unfreeze conversation panel

提交时间：2026-09-17T15:07:11+08:00。

````text
fix(chat): release cold-ingest gate on pipeline failure to unfreeze conversation panel

The load_end chunked ingest pipeline had no exception handling: any entry
throwing mid-pipeline left _ingestRunning latched true forever, so all live
entries piled into the gate buffer and the chat panel froze until reload
(the 30s server ping kept renewing the heartbeat watchdog, so the reconnect
abort never fired; the terminal panel was unaffected, using its own WS).

- wrap both pipeline entries in try/catch and release the gate via a new
  token-guarded _failColdIngest (delegate to _abortColdIngest({drain:true}),
  unblock loading, rebuild the dedup index from the committed baseline while
  preserving _v2ColdSeed via try/finally)
- null-guard _processOneEntry (batch path parity with the live path)
- mark v3 delta dedup keys only after buildEntry succeeds
- drain buffered frames instead of stranding them when the v3 cold assembly
  fails
- reportSwallowed for SSE parse/ingest catches per convention
- server: report and end() the connection when _safeSseWrite throws so the
  browser auto-reconnects
````

<a id="message-8923322f88"></a>
## [8923322f88](./cc-viewer-alignment-commit-ledger.md#commit-8923322f88) — chore(ultraplan): refine code-expert review priority wording

提交时间：2026-09-17T15:12:28+08:00。

````text
chore(ultraplan): refine code-expert review priority wording

Disposal rule for review findings changed from "adopt P0, selectively
adopt P1 when concrete and low-risk, defer P2/P3 to backlog" to "adopt
P0; adopt P1 and P2 selectively based on evaluation; disregard P3" —
synced across code-expert.json, 18 localized UltraPlan.md files, and
ultraplanTemplates.js (20 sites).
````

<a id="message-301c04bd5e"></a>
## [301c04bd5e](./cc-viewer-alignment-commit-ledger.md#commit-301c04bd5e) — chore(release): version packages

提交时间：2026-09-17T15:12:44+08:00。

````text
chore(release): version packages
````

<a id="message-2049aef95e"></a>
## [2049aef95e](./cc-viewer-alignment-commit-ledger.md#commit-2049aef95e) — fix(release): publish to npm patch channel to unblock patch-line releases

提交时间：2026-09-17T15:22:10+08:00。

````text
fix(release): publish to npm patch channel to unblock patch-line releases

A stray 1.9.0 sits above the 1.8.x patch-only line on the registry, so npm
refused to implicitly tag 1.8.18 as latest and the v1.8.18 npm-publish job
failed (GitHub Release assets were unaffected). Publish explicitly with
--tag patch; latest stays wherever the registry has it.
````

<a id="message-5b544c6ee1"></a>
## [5b544c6ee1](./cc-viewer-alignment-commit-ledger.md#commit-5b544c6ee1) — fix(release): point npm latest at the just-published version

提交时间：2026-09-17T16:23:59+08:00。

````text
fix(release): point npm latest at the just-published version

Publish goes to the patch channel (a stray 1.9.0 blocks implicit latest),
so latest would otherwise stay pinned to an older release — v1.8.18 shipped
while the npm page still showed 1.8.15. Follow the publish with an explicit
dist-tag add in the same OIDC-authenticated job.
````

<a id="message-01ff6d85e8"></a>
## [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8) — feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config

提交时间：2026-09-18T16:21:22+08:00。

````text
feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config

- TaskProgressHud: replace native title tooltips with antd Popover/Tooltip
  (scrollable/selectable detail bubble, rightTop placement, shrink-to-fit anchors)
- ImConversationModal: add 停止 button (Popconfirm, POST /config enabled:false)
- ImPlatformSettings: add independent 保存 button (applyProcess:false, decoupled
  from start/stop)
- server /config: read-merge-write for enabled-only bodies so stopping no longer
  wipes appKey/allowlist/region (P0); guard non-object JSON bodies (no hang)
````

<a id="message-90b41358f9"></a>
## [90b41358f9](./cc-viewer-alignment-commit-ledger.md#commit-90b41358f9) — ci: soft-fail npm dist-tag step under OIDC trusted publishing

提交时间：2026-09-19T09:19:10+08:00。

````text
ci: soft-fail npm dist-tag step under OIDC trusted publishing

OIDC credentials authorize only npm publish; dist-tag is a registry
metadata op that fails with E401 (seen at v1.8.19). Make the step
continue-on-error with a warning telling the maintainer to run it
manually, so the release job and downstream bump-homebrew no longer
fail on it.
````

<a id="message-b1fe5c09a6"></a>
## [b1fe5c09a6](./cc-viewer-alignment-commit-ledger.md#commit-b1fe5c09a6) — docs: add config convergence & cloud-sync advisory, link from READMEs

提交时间：2026-09-21T11:41:00+08:00。

````text
docs: add config convergence & cloud-sync advisory, link from READMEs

Add docs/config-cloud-sync.md (+ zh version) scoping the config-cloud-sync
advisory to the local<->cloud contract, and link it from the root README and
all localized README variants.
````

<a id="message-4c5e633e68"></a>
## [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68) — feat(server): unify config JSON writes behind a locked+atomic json-store kernel

提交时间：2026-09-21T11:43:15+08:00。

````text
feat(server): unify config JSON writes behind a locked+atomic json-store kernel

New server/lib/json-store.js kernel: readJsonSafe / writeJsonAtomic / mutateJson
(async lock) / mutateJsonSync (sync lock) / withJsonLock / applyJsonPatch /
lockPathFor, reusing async-file-lock and renameSyncWithRetry. The lock name is
derived from the data file (<file>.lock), fixing the old fixed-basename
collision, and sync/async locks are mutually exclusive with a lock-timeout
degrade.

Converge the config JSON writers onto the kernel:
- preferences.json: im-config.js was previously neither locked nor atomic and
  auth.js was atomic but lock-free (a known lost-update window); both now do
  read-merge-write inside the kernel's sync lock, sharing one
  preferences.json.lock with the async mutatePrefs path.
- profile.json's four write sites (interceptor + preferences routes) now write
  atomically via the kernel.
- prefs-store, workspace-registry, session-pin-store, and ask-store migrate to
  the kernel without changing their public signatures.

No behavior change for readers; this is the prerequisite for consistent
on-disk state (and any later cloud projection).
````

<a id="message-3e7f047290"></a>
## [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault

提交时间：2026-09-21T11:45:20+08:00。

````text
feat(server): encrypt local credentials at rest in an AES-256-GCM vault

Move cc-viewer's local credentials out of plain config into a new encrypted
vault, fail-closed everywhere:

- New credential-vault.js (AES-256-GCM, per-record random IV, machine-local
  master.key at 0600), credential-store.js (vault-backed credentials.json at
  0600), credential-access.js (read-plain / write-cipher / migrate / fallback
  with fail-closed semantics), and credential-migrate.js (one-time startup
  migration with write-then-read-back verification).
- Proxy profile apiKeys, the LAN password (auth.password / authByProject.*),
  and IM app secrets are moved out of profile.json / preferences.json into the
  vault. Low-sensitivity IM cred fields (appKey/appId/botId) stay base64, so
  plain config files no longer carry these secrets.
- Fail-closed: a profile whose apiKey cannot be decrypted is dropped from
  routing (never forwards the default credential to a third-party host), and an
  unreadable LAN password denies remote access instead of falling back to the
  empty-password allow-all. A corrupt credentials.json is never overwritten by
  a fallback (strictCorrupt), and a failed/unreadable vault write preserves the
  previous secrets instead of losing them.
- config-backup now also backs up credentials.json + master.key and keeps
  historical plaintext backups as a recovery path. The vault files are denied
  to IM-driven sessions and the remote file API (im-deny, permissions.deny,
  file-access-policy), rolled backups included.

No action is required on upgrade: existing plaintext/base64 secrets are
migrated automatically on first start with a pre-migration backup kept.
Restart all running ccv processes after upgrading so no stale reader serves a
stripped profile.json.
````

<a id="message-5a494ba37c"></a>
## [5a494ba37c](./cc-viewer-alignment-commit-ledger.md#commit-5a494ba37c) — chore(star-history): refresh chart [skip ci]

提交时间：2026-09-21T08:54:48+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-739f49a6de"></a>
## [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) — fix(server): close review findings on the credential vault + json-store convergence

提交时间：2026-09-21T17:17:04+08:00。

````text
fix(server): close review findings on the credential vault + json-store convergence

P0/P1 correctness & security:
- interceptor.js: hoist strictCorrupt out of the fallback object so the corrupt
  profile.json guard actually fires (was silently destroying recoverable profiles).
- json-store.js: mutateJsonSync now throws JSON_STORE_REENTRANT on a reentrant sync
  call into a lock held by this process's async flavor (was a silent lost update);
  foreign-process contention still degrades.
- routes/preferences.js: route the three remaining profile.json write sites through
  mutateJsonSync + strictCorrupt (were unlocked readFileSync + writeJsonAtomic).
- credential-access.js: resolve the credential root from the LIVE LOG_DIR binding so
  the vault no longer splits from the config it protects when LOG_DIR moves.
- routes/auth.js: refuse to overwrite an unreadable LAN password (409
  PASSWORD_UNREADABLE) instead of letting a save wipe the real ciphertext.

P2 hardening & docs:
- interceptor.js: a profile with a baseURL but no usable key is dropped from routing
  (fail-closed) instead of forwarding the default credential to a third-party host.
- file-access-policy.js: deny the config-backup dir tree (it holds credentials.json +
  master.key — the full decryption kit).
- im-deny.js: deny the vault by basename so it stays protected after LOG_DIR moves.
- credential-migrate.js: import auth/IM vault refs from the owning runtime modules
  (auth.refFor / im-config.secretRef) instead of hand-copying the format.
- README.md, docs/config-cloud-sync.md(+zh), history.md, changeset: sync the storage/
  backup/upgrade docs with the shipped behavior; spell out restarting claude sessions.

Tests: regression coverage for each fix (corrupt-guard, reentrant-sync, unreadable-
password 409, keyless-baseURL drop, backup-dir deny, moved-root vault deny).
````

<a id="message-565613bbea"></a>
## [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) — fix(server): revert credential root to frozen; close re-review findings

提交时间：2026-09-21T20:52:14+08:00。

````text
fix(server): revert credential root to frozen; close re-review findings

Re-review of 739f49a6 found that resolving the credential root from the LIVE
LOG_DIR binding re-opened the LAN-gate fail-open it was meant to close (a logDir
move carries auth.enabled into the new prefs but not the vault → password
resolves '' → allow-all), and that logDir had no admin gate. Three independent
reviewers confirmed. This reverts to the load-time frozen root (the fail-CLOSED
half of the trade) and hardens the surrounding surface:

- credential-access.js: capture CREDENTIALS_FILE/MASTER_KEY_PATH at module load
  again; the header note now records why a live/following vault fails open.
- routes/preferences.js: gate logDir on isAdminReq so an unauthenticated client
  cannot move the data root.

Smaller re-review items:
- routes/auth.js: read passwordUnreadable from the same scope object as the seed
  (was over-firing 409 on a fresh project override when only the global was
  unreadable).
- routes/preferences.js: recompute the cc-switch import merge inside the
  mutateJsonSync lock against the current on-disk list (was computed outside).
- interceptor.js: distinguish 'keyless-baseurl' from 'unreadable' in the drop
  diagnostic.
- im-deny.js: isVaultFile uses basename + case-insensitive exact match (was a
  POSIX-only, case-sensitive slice); no longer over-blocks name variants.
- file-access-policy.test.js: pin CCV_LOG_DIR under FAKE_HOME so the backup-deny
  test actually reaches sensitive-config-backup (was vacuous outside-allowlist).
- async-file-lock.js: register _heldDiskLocks at the acquisition point (was after
  the pid-write await), closing the window where a sync caller could steal the
  async holder's own-pid lock.
- Drop the now-unused writeJsonAtomic import; translate the new CJK comments to
  English per repo rule.
````

<a id="message-964ce756b6"></a>
## [964ce756b6](./cc-viewer-alignment-commit-ledger.md#commit-964ce756b6) — docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter

提交时间：2026-09-21T23:31:43+08:00。

````text
docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter
````

<a id="message-68fd263aac"></a>
## [68fd263aac](./cc-viewer-alignment-commit-ledger.md#commit-68fd263aac) — chore(release): 1.8.20

提交时间：2026-09-22T00:31:52+08:00。

````text
chore(release): 1.8.20
````

<a id="message-19f563d300"></a>
## [19f563d300](./cc-viewer-alignment-commit-ledger.md#commit-19f563d300) — chore(release): 1.8.20

提交时间：2026-09-22T00:50:37+08:00。

````text
chore(release): 1.8.20
````

<a id="message-384dee8025"></a>
## [384dee8025](./cc-viewer-alignment-commit-ledger.md#commit-384dee8025) — docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter

提交时间：2026-09-22T00:50:37+08:00。

````text
docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter
````

<a id="message-3cba408188"></a>
## [3cba408188](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188) — fix(server): revert credential root to frozen; close re-review findings

提交时间：2026-09-22T00:50:37+08:00。

````text
fix(server): revert credential root to frozen; close re-review findings

Re-review of 739f49a6 found that resolving the credential root from the LIVE
LOG_DIR binding re-opened the LAN-gate fail-open it was meant to close (a logDir
move carries auth.enabled into the new prefs but not the vault → password
resolves '' → allow-all), and that logDir had no admin gate. Three independent
reviewers confirmed. This reverts to the load-time frozen root (the fail-CLOSED
half of the trade) and hardens the surrounding surface:

- credential-access.js: capture CREDENTIALS_FILE/MASTER_KEY_PATH at module load
  again; the header note now records why a live/following vault fails open.
- routes/preferences.js: gate logDir on isAdminReq so an unauthenticated client
  cannot move the data root.

Smaller re-review items:
- routes/auth.js: read passwordUnreadable from the same scope object as the seed
  (was over-firing 409 on a fresh project override when only the global was
  unreadable).
- routes/preferences.js: recompute the cc-switch import merge inside the
  mutateJsonSync lock against the current on-disk list (was computed outside).
- interceptor.js: distinguish 'keyless-baseurl' from 'unreadable' in the drop
  diagnostic.
- im-deny.js: isVaultFile uses basename + case-insensitive exact match (was a
  POSIX-only, case-sensitive slice); no longer over-blocks name variants.
- file-access-policy.test.js: pin CCV_LOG_DIR under FAKE_HOME so the backup-deny
  test actually reaches sensitive-config-backup (was vacuous outside-allowlist).
- async-file-lock.js: register _heldDiskLocks at the acquisition point (was after
  the pid-write await), closing the window where a sync caller could steal the
  async holder's own-pid lock.
- Drop the now-unused writeJsonAtomic import; translate the new CJK comments to
  English per repo rule.
````

<a id="message-3c78188314"></a>
## [3c78188314](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314) — fix(server): close review findings on the credential vault + json-store convergence

提交时间：2026-09-22T00:50:37+08:00。

````text
fix(server): close review findings on the credential vault + json-store convergence

P0/P1 correctness & security:
- interceptor.js: hoist strictCorrupt out of the fallback object so the corrupt
  profile.json guard actually fires (was silently destroying recoverable profiles).
- json-store.js: mutateJsonSync now throws JSON_STORE_REENTRANT on a reentrant sync
  call into a lock held by this process's async flavor (was a silent lost update);
  foreign-process contention still degrades.
- routes/preferences.js: route the three remaining profile.json write sites through
  mutateJsonSync + strictCorrupt (were unlocked readFileSync + writeJsonAtomic).
- credential-access.js: resolve the credential root from the LIVE LOG_DIR binding so
  the vault no longer splits from the config it protects when LOG_DIR moves.
- routes/auth.js: refuse to overwrite an unreadable LAN password (409
  PASSWORD_UNREADABLE) instead of letting a save wipe the real ciphertext.

P2 hardening & docs:
- interceptor.js: a profile with a baseURL but no usable key is dropped from routing
  (fail-closed) instead of forwarding the default credential to a third-party host.
- file-access-policy.js: deny the config-backup dir tree (it holds credentials.json +
  master.key — the full decryption kit).
- im-deny.js: deny the vault by basename so it stays protected after LOG_DIR moves.
- credential-migrate.js: import auth/IM vault refs from the owning runtime modules
  (auth.refFor / im-config.secretRef) instead of hand-copying the format.
- README.md, docs/config-cloud-sync.md(+zh), history.md, changeset: sync the storage/
  backup/upgrade docs with the shipped behavior; spell out restarting claude sessions.

Tests: regression coverage for each fix (corrupt-guard, reentrant-sync, unreadable-
password 409, keyless-baseURL drop, backup-dir deny, moved-root vault deny).
````

<a id="message-811b049485"></a>
## [811b049485](./cc-viewer-alignment-commit-ledger.md#commit-811b049485) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault

提交时间：2026-09-22T00:50:37+08:00。

````text
feat(server): encrypt local credentials at rest in an AES-256-GCM vault

Move cc-viewer's local credentials out of plain config into a new encrypted
vault, fail-closed everywhere:

- New credential-vault.js (AES-256-GCM, per-record random IV, machine-local
  master.key at 0600), credential-store.js (vault-backed credentials.json at
  0600), credential-access.js (read-plain / write-cipher / migrate / fallback
  with fail-closed semantics), and credential-migrate.js (one-time startup
  migration with write-then-read-back verification).
- Proxy profile apiKeys, the LAN password (auth.password / authByProject.*),
  and IM app secrets are moved out of profile.json / preferences.json into the
  vault. Low-sensitivity IM cred fields (appKey/appId/botId) stay base64, so
  plain config files no longer carry these secrets.
- Fail-closed: a profile whose apiKey cannot be decrypted is dropped from
  routing (never forwards the default credential to a third-party host), and an
  unreadable LAN password denies remote access instead of falling back to the
  empty-password allow-all. A corrupt credentials.json is never overwritten by
  a fallback (strictCorrupt), and a failed/unreadable vault write preserves the
  previous secrets instead of losing them.
- config-backup now also backs up credentials.json + master.key and keeps
  historical plaintext backups as a recovery path. The vault files are denied
  to IM-driven sessions and the remote file API (im-deny, permissions.deny,
  file-access-policy), rolled backups included.

No action is required on upgrade: existing plaintext/base64 secrets are
migrated automatically on first start with a pre-migration backup kept.
Restart all running ccv processes after upgrading so no stale reader serves a
stripped profile.json.
````

<a id="message-d663452c29"></a>
## [d663452c29](./cc-viewer-alignment-commit-ledger.md#commit-d663452c29) — feat(server): unify config JSON writes behind a locked+atomic json-store kernel

提交时间：2026-09-22T00:50:37+08:00。

````text
feat(server): unify config JSON writes behind a locked+atomic json-store kernel

New server/lib/json-store.js kernel: readJsonSafe / writeJsonAtomic / mutateJson
(async lock) / mutateJsonSync (sync lock) / withJsonLock / applyJsonPatch /
lockPathFor, reusing async-file-lock and renameSyncWithRetry. The lock name is
derived from the data file (<file>.lock), fixing the old fixed-basename
collision, and sync/async locks are mutually exclusive with a lock-timeout
degrade.

Converge the config JSON writers onto the kernel:
- preferences.json: im-config.js was previously neither locked nor atomic and
  auth.js was atomic but lock-free (a known lost-update window); both now do
  read-merge-write inside the kernel's sync lock, sharing one
  preferences.json.lock with the async mutatePrefs path.
- profile.json's four write sites (interceptor + preferences routes) now write
  atomically via the kernel.
- prefs-store, workspace-registry, session-pin-store, and ask-store migrate to
  the kernel without changing their public signatures.

No behavior change for readers; this is the prerequisite for consistent
on-disk state (and any later cloud projection).
````

<a id="message-9adf4ef539"></a>
## [9adf4ef539](./cc-viewer-alignment-commit-ledger.md#commit-9adf4ef539) — docs: add config convergence & cloud-sync advisory, link from READMEs

提交时间：2026-09-22T00:50:37+08:00。

````text
docs: add config convergence & cloud-sync advisory, link from READMEs

Add docs/config-cloud-sync.md (+ zh version) scoping the config-cloud-sync
advisory to the local<->cloud contract, and link it from the root README and
all localized README variants.
````

<a id="message-cb50f60d5e"></a>
## [cb50f60d5e](./cc-viewer-alignment-commit-ledger.md#commit-cb50f60d5e) — Merge pull request #144 from weiesky/feature/config-convergence

提交时间：2026-09-21T13:13:47-04:00。

````text
Merge pull request #144 from weiesky/feature/config-convergence

Feature/config convergence
````

<a id="message-975e1ee8ce"></a>
## [975e1ee8ce](./cc-viewer-alignment-commit-ledger.md#commit-975e1ee8ce) — chore(star-history): refresh chart [skip ci]

提交时间：2026-09-28T09:44:10+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-2ae12ca122"></a>
## [2ae12ca122](./cc-viewer-alignment-commit-ledger.md#commit-2ae12ca122) — chore(star-history): refresh chart [skip ci]

提交时间：2026-10-05T10:23:57+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-eb2e9703a2"></a>
## [eb2e9703a2](./cc-viewer-alignment-commit-ledger.md#commit-eb2e9703a2) — feat(web): project tab drag-to-reorder + persist order; focus/mask fixes; 1.8.x series summary (v1.9.1) (#145)

提交时间：2026-10-08T12:20:24+08:00。

````text
feat(web): project tab drag-to-reorder + persist order; focus/mask fixes; 1.8.x series summary (v1.9.1) (#145)

* refactor(chat): Header interaction boundary — parallel-project chips / current-project resume dropdown / [+] new workspace

- Header chips now show only parallel main PTYs; chip click is a pure view switch (no spawn/kill) via a new per-project view layer (per-project live feeds, /events?project= cold load + per-view-project broadcast filtering, writer activity routed per project; pure logic in lib/v2/view-router.js).
- Resume narrowed to the current project's hover list (recent 5, no grouping); picking a session is a pure view switch (attachedSid + ?sid cold load). Removed the scratch resume-child model, POST /api/resume-session, cross-project takeover, _resumeTakeover lock.
- Project-alias rename feature deleted; replaced by a standalone dashed [+] button beside the current-project label that opens the new-workspace picker (reuses shared WorkspaceList/DirBrowser, consistent with Electron).
- Deleted the cross-process live-process registry, workspaces/activate, sdk-manager.resumeSession, and several pty-manager exports. Kept _resumeProject write routing (main PTYs rely on it).
- Review fixes: pin writes gated while attached/viewing (no cross-project pin leak); explicit sid-not-found event + toast/auto-detach on failed ?sid resolve; detach affordance clears both attachedSid and viewedProject; Electron chat-tab hides the dead [+] control and disables empty chip polling; migrate_prompt computed per viewed project; removed dead prop/imports/stale comments.
- fix(server): /api/v2-entry routine 404 no longer logged to stderr (NOT_FOUND is expected when the detail target was pruned).

* feat(web): tree-based new-workspace picker, workspace table, shared Loading

- DirBrowser: flat list -> tree (expand/lazy-load/breadcrumbs/per-row launch/
  launch-current/go-to locate, git badge kept, reuses /api/browse-dir); extracted
  to its own component; refs mirror childrenMap/expandedPaths to fix stale state
- WorkspaceList: card grid -> five-column table (project/path/last-used/logs/
  actions, button-only launch); remove skip-permission launch button and
  dangerousMode; unify launch label; widen modal to 1080; rename "Browse
  Directory" -> "Add Workspace"
- Loading: new shared component replacing all 28 antd <Spin> (object-rendered
  Claude sprite, three sizes, spinning wrapper mode); drop unused Spin import
- i18n: add 5 table-header keys; update browse/launch labels; drop
  skipPermLaunch/normalLaunch (18 locales)

* feat(chat): move session history to star menu + true /resume switch; refresh live tabs on close

Session history moves from the Header hover dropdowns into the star quick-settings
menu (between the permission and plan rows), follows the viewed project, and resume
becomes a TRUE switch aligned with Claude Code's /resume: a Modal.confirm gates a
POST /api/resume-session that injects `/resume <uuid>` into the target project's live
claude PTY (in-process switch, subsequent messages continue that conversation), with
cross-project writer re-bind for parallel viewed projects. Mobile follows suit. Also:
closing a project tab now refreshes the live-processes list immediately via
liveProcessRefreshToken instead of waiting up to 5s for the poll.

* fix(multi-project): same-basename project disambiguation across tab bar, READ routes, and viewing

- Tab bar/chips: same-name projects disambiguate as `name [1]`/`[2]`
  (cwd-lexicographic, respawn-stable), ordinal in a non-shrinking span so a
  long name's ellipsis can't clip it; hover tooltip shows the full directory.
- READ routes: view-root resolves a per-instance `instanceKey` (`?instance=`)
  to the exact project dir, so file tree / git / skills / memory / expert /
  search no longer 400 "ambiguous project name" for same-basename projects.
  13 frontend fetch sites thread the instance via a new `withViewParams`.
- Viewing: the bound tab now highlights instantly and correctly via pure
  client-side state (new `currentInstanceKey` from /api/live-processes +
  `resolveBoundInstance` tiebreak) instead of the shared, poll-lagged server
  `active` pointer — removing both the "bound tab never lights" bug and the
  click→highlight delay, and working across multiple clients.
- docs: handoff for the known remaining issue — the chat panel still points
  at one same-name project (cross-dir session isolation; see
  docs/handoff-samename-chat-panel.md).

Changesets: 3 × patch.

* fix(multi-project): isolate same-basename chat panel by session cwd

Two same-basename projects from different dirs share one session pool
(<LOG_DIR>/<basename>/sessions), so the cold-load fallback served the
newest content-bearing session from the whole pool — the chat panel
always pointed at one project. New sessions now stamp meta.json with
their owning full cwd (from the x-ccv-project-dir self-report, lexically
normalized, no realpath), and the /events cold-load fallback is scoped
to the viewed instance's cwd (from its live PTY record). Keep-missing
for legacy no-cwd sessions; only the fallback pool is filtered (never
the instance filter); a dead instance degrades to today's whole-pool
behavior. Forward-looking (only new sessions carry cwd). Changeset: patch.

* fix(multi-project): unify same-basename view-scope disambiguation

Bound same-name view (viewedProject/viewedInstance null) sent only
?project= (no ?instance=) → view-root 400 ambiguous on file tree /
skills / git / expert / search. Centralize: a module-level view-scope
singleton (utils/viewScope.js, mirrored from App state each update) +
withViewParams falls back to its instance when the caller passes none —
covering every view-scoped read in one place instead of threading
instance per call site. Same bound fallback applied to the terminal WS
handshake and resume-session POST (wrong twin / 409); project-stats /
proxy-stats oracles and MobileGitDiff's hand-built ?project= routed
through the helper. Tab clicks on a same-name sibling now activate its
instance (not detach); tabs show a switch loading ring (per-tab + header)
until cold-load commits; resumeSwitch added to the AppHeader SCU
whitelist (was dropped, hiding the ring/active state); active tab made
permanently visible. Request-detail v2:<project>/<sid> now uses the
viewed project (was bound → /api/v2-entry 404 when viewed≠bound).
Removed temp [ccv-dbg] logging from resume.js. Changeset: patch.

* feat(web): persist viewed parallel workspace across refresh

Record the last-viewed parallel workspace (project + instanceKey + cwd)
in localStorage on chip/tab switch and parallel /resume, then validate it
against /api/live-processes at boot and restore it instead of always
collapsing to the bound project.

- New utils/viewedWorkspaceStorage.js: storage IO + resolveRestoredViewScope
  (exact-instance alive, isBoundInstance guard via currentInstanceKey, cwd
  re-resolution after an instanceKey re-mint, single-row name-only restore,
  same-name ambiguity -> bound fallback; never guess by name).
- AppBase: _bootViewedWorkspace validates before the first SSE and passes the
  scope via initSSE(scopeOverride) (React 18 batching); a name-only restore
  re-resolves to the live row's instanceKey so the server's
  instance-no-session guard stays active (no cross-project cold-load bleed).
- Clear the persisted workspace on real user actions (detach / bound resume /
  launch / return-to-list / B2 detach). workspace_started/stopped are
  broadcast to every SSE client, so storage is deliberately NOT cleared there.

Tests: viewed-workspace-storage.test.js (31 cases). Changeset: cc-viewer patch.

* feat(chat): render user messages as markdown with light-on-dark bubble colors

Route user bubble text through MarkdownBlock (marked + DOMPurify, same
pipeline as assistant messages) so headings/lists/code/tables/links
compose properly. Image refs still inline as React ChatImage components,
with the split logic extracted into the pure, unit-tested
segmentUserTextWithImages. Recolor markdown inside the dark user bubble
(heading/strong to #fff, inline code to #eef3ff on rgba(0,0,0,.4) for
WCAG AA on the accent-blue background, translucent-white
quote/table/hr) via two-class .bubbleUser .userMd descendant selectors
that out-specify the global .chat-md rules without !important, and give
verified file-path codespans their hover highlight back. Hide
MarkdownBlock's hover save-as bar on right-aligned user bubbles (it
would overflow the right viewport edge). Slash-command labels and
/compact summaries keep their existing rendering. Multi-line input
newlines now render as real line breaks (previously collapsed to a
space).

* feat(web): project tab drag-to-reorder + persist order; remove fullscreen resume mask; restore browser focus rings

- Add dnd-kit based drag-to-reorder on header project tabs, order persisted to localStorage (ccv.projectTabOrder.v1) and survives 5s poll
- Remove resumeSwitchMask / mobileResumeSwitchMask fullscreen overlays (switch feedback stays via tab ring)
- Remove global *:focus / *:focus-visible !important resets so the active tab's inset box-shadow ring survives focus; MDXEditor toolbar explicitly outline:none for single-ring visual
- Fix .projectTab selection-height bug via line-height:1 / user-select:none / box-sizing:border-box
- SortableProjectTab opts out of dnd-kit's default role=button/tabIndex=0 attributes to avoid nested-interactive a11y regression

Includes changesets for:
- Multi-project tab bar, SSE cache, view-root disambiguation
- Multi-instance (instanceKey) PTY and view layer
- Same-basename project disambiguation across tab/read routes
- Header interaction refactor + resume history menu
- User message markdown rendering
- v2-entry 404 noise suppression

Adds a 1.8.x series summary to history.md (15 patches, 53 entries, two main threads: multi-project/multi-instance + conversation view immersion).

Coverage: project-tab-order.test.js (27 tests)

Version: 1.8.20 → 1.9.1 (override patch-only rule per owner decision — npm already has 1.9.0 from 2026-09-15, releasing 1.8.21 would invert latest below historical max)

---------

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-649f853e5e"></a>
## [649f853e5e](./cc-viewer-alignment-commit-ledger.md#commit-649f853e5e) — Feat/resume global switcher (#146)

提交时间：2026-10-09T17:23:44+08:00。

````text
Feat/resume global switcher (#146)

* fix(web): persist git-changes panel open state across refresh

- Add ccv_gitChangesOpen localStorage persistence mirroring ccv_fileExplorerOpen
- _setGitChangesOpen setter folds _pendingGitRefresh consumption inside (fully symmetric with _setFileExplorerOpen); nav onClick shrinks to 3 lines
- Active closes persist (nav toggle / panel X / FileExplorer & Search icon mutual exclusion); passive closes don't (_detectGit no-repo, jump-to-file) so cross-project intent survives
- Constructor reads back with isPad branch (parity with fileExplorerOpen)
- Mutual-exclusion restore: git only restores to open when fileExplorer resolves to closed, eliminating the previously-unreachable double-open state after refresh
- iPad pad-mode now covered (was missing); phone still untouched

Coverage: git-changes-open-persist.test.js (10 tests)

* perf(server): 10x faster /api/workspaces via stats-cache reuse + async fs + sort-then-enrich

Backend:
- getWorkspaces({ limit }) — sort by lastUsed BEFORE enrich; limit caps the
  expensive per-session enrichment to the top N (default 0 = all, route cap 50)
- Reuse stats-worker's on-disk cache (LOG_DIR/<project>/<project>.json files[
  sessions/<sid>]) with (journalSize, lastModified) as the freshness key; a hit
  skips the recursive dir walk entirely
- New dirSizeAsync (fs/promises) replaces dirSizeSync on the request path — the
  3.3s event-loop freeze becomes <4ms worst single-tick (40 ws / 1787 sessions)
- _readStatsCache: rejects path-unsafe projectName ('/' / '\\' / '..'),
  version-mismatched cache, malformed JSON; fail-safe to live traversal
- Cache-hit sessions skip isDiscardableSession (v11+ cache entries are written
  only by post-discard code, so a hit already implies non-probe)
- cacheByProject dedup via Set before Promise.all (concurrent map has/set does
  not dedupe)
- Fix P0: route read parsedUrl?.query?.limit but server.js passes a WHATWG URL
  which has no .query — ?limit= was 100% dead. Now uses .searchParams.get()
  with a real-URL regression test.

Frontend (New workspace modal):
- Default to first PREVIEW_ROWS=5 rows; last <tr> reveals the rest via
  setShowAll(true). Frontend deliberately does NOT pass ?limit= — hidden rows
  still need their logCount for the auto '-c' launch heuristic.
- New .modalBody override class strips .root's 100vh + grey backdrop in the
  modal context; tables show through the modal's own background.
- New i18n key ui.workspaces.showMore (18 locales, {count} placeholder).

Coverage: workspace-registry-limit.test.js (12: limit+total+sort+cache parity+
dirSizeAsync parity+async-liveness+version guard), api-workspaces.test.js
(+2 route-level ?limit= tests using real new URL()), workspace-list-modal.test.js
(12 source-contract incl. CSS source-order guard), new-ui-i18n.test.js (+1 key
with placeholder guard).

* fix(web): remove orphan divider + detach chip from chat nav rail; move history row after plan row in star menu

* feat(web): workspace help modal, glassmorphic new-project picker, solid table bg, fix [+] button alignment

* fix(multi-project): rebind bound project to survivor on close-to-one

* docs(history): refile changelog into per-version sections, recover missed entries

The Unreleased pile had accumulated entries for six already-shipped
versions (1.8.15 ~ 1.8.20, 1.9.1). Each entry is now filed under the
version whose release tag first contains its producing commit.

Also recovers entries that shipped without a history.md bullet:
- 1.8.15: hot-switch snapshot rendering / preset family merge + alias /
  Bind A latch fix / EPIPE flake root cause / in-flight SSE refresh /
  terminal-integration observability (recorded only in packages/app/CHANGELOG.md)
- 1.9.1: same-name tab [1]/[2] disambiguation, bound-tab instant
  highlight, viewed-workspace persistence (documented in 1.8.21 changesets)

Existing bullet text is unchanged; only the section placement moves.

* fix(multi-project): scope the close-rebind reset to affected clients

Review follow-up on the bound-project rebind (3a675dcb):

- P1: workspace_started(rebound:true) hard-reset EVERY client — a tab
  viewing an unrelated third project lost its attach, transcript and
  live feed. The broadcast now carries reboundFrom (the closed bound
  name) and the client gates reset/reconnect on a shared predicate
  (utils/reboundScope.js, effective scope = viewedProject || projectName).
  A normal (non-rebound) workspace_started still resets unconditionally.
- P2: a dir-only rebind (same-name twin keeps the name's session space)
  no longer broadcasts at all — the project name, and with it every
  client's SSE scope stamp, is unchanged, so a broadcast would only
  hard-reset same-name viewers mid-stream for a root-only change.
- P2: clear _sseReconnectCount before the rebound reconnect. The desktop
  incremental branch reads this.state.projectName as the ?project= anchor;
  the old correctness relied on requests having just been cleared.
- P2: rewrite the rebound source-anchor test to bound the handler by its
  listener boundaries before searching, instead of a comment-length-
  sensitive regex window (it had already punched through once).
- P3: docstring/changeset/history.md no longer claim same-name closes
  "skip rebinding" — they degrade to a dir-only rebind without broadcast.

Coverage: rebound-scope.test.js (8), live-processes-close.test.js (3
cases updated), live-processes-refresh.test.js (3 anchors).

---------

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-97f22c8c9a"></a>
## [97f22c8c9a](./cc-viewer-alignment-commit-ledger.md#commit-97f22c8c9a) — chore(release): 1.9.2

提交时间：2026-10-09T17:29:49+08:00。

````text
chore(release): 1.9.2

Consume the five patch changesets from #146 (close-rebind scoping,
git-changes panel persistence, nav-rail cleanup + star-menu order,
workspace-picker perf/UX, workspace help modal + glass background) and
file the history.md Unreleased entries under ## 1.9.2.
````

<a id="message-3fa5717865"></a>
## [3fa5717865](./cc-viewer-alignment-commit-ledger.md#commit-3fa5717865) — ci(release): carry `latest` on the publish itself, widen the homebrew poll

提交时间：2026-10-09T18:48:22+08:00。

````text
ci(release): carry `latest` on the publish itself, widen the homebrew poll

Manual follow-ups after v1.9.2 — neither should need a human:

- `latest` lagged a release behind until someone ran
  `npm dist-tag add cc-viewer@1.9.2 latest` by hand. The dist-tag step could
  never work under OIDC trusted publishing: that grants only `npm publish`,
  so a standalone `npm dist-tag add` is rejected with E401 (soft-failing with
  a reminder since v1.8.19). The publish now selects its own tag: probe the
  registry's versions and publish `--tag latest` when this release is the
  highest, else fall back to `--tag patch` and warn — preserving the reason
  the patch channel exists (the stray 1.9.0, which would otherwise invert
  `latest` below a newer version, as handled at v1.8.18/1.9.1).

- bump-homebrew timed out waiting for the registry at v1.9.2: its 10-minute
  poll (20x30s) was exhausted even though the publish had succeeded (the
  tarball became visible ~13min after `+ cc-viewer@1.9.2`). Widened to
  20 minutes (40x30s), and the wait now echoes the registry dist-tags and
  warns when `latest` did not move — surfacing the failure at the point it
  happens instead of in the next release.

Both workflows are YAML-validated; the publish tag decision was exercised
against normal, inverted, registry-query-failed, major-bump, and
prerelease-present inputs.
````

<a id="message-c93c3110ed"></a>
## [c93c3110ed](./cc-viewer-alignment-commit-ledger.md#commit-c93c3110ed) — Update README.md

提交时间：2026-10-10T10:08:58+08:00。

````text
Update README.md
````

<a id="message-d6cab4869a"></a>
## [d6cab4869a](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) — feat(server): relay SDK task_* messages as sdk-task WS frames (#147)

提交时间：2026-10-10T15:24:07+08:00。

````text
feat(server): relay SDK task_* messages as sdk-task WS frames (#147)

* fix(server): SDK 模式三项 P0 修复 + 常驻 streaming-input 重构

- 审批超时广播 dismiss（ask→sdk-ask-timeout、plan→sdk-plan-resolved、perm→perm-hook-timeout），接通 canUseTool options.signal
- 常驻 streaming-input 进程：一次构造长驻 query，Stop 升级为真 interrupt()；静默看门狗 + 墓碑 + 死亡惰性重建 + 重建节流
- POST /api/resume-session 新增 SDK 分支（switchToSession），历史会话切换不再 404

Coverage: sdk-manager-query.test.js, sdk-manager-extra.test.js, branch-lib-sdk-manager.test.js, resume-route.test.js

* fix(server): 新建工作区空会话 tab 不再误报超时并串流绑定项目对话

- /events ?instance= 无会话目录时钉死空冷源（legacy 与 v3 两处回退一律钉空串，死活实例都不再回退到绑定项目当前会话）
- 实例存活 → 不发 sid-not-found，空视图 load_start{total:0,empty:true} + 保持 per-project live feed，首个请求落盘即实时上屏
- 实例已死 → 维持 sid-not-found → 前端 detach 回绑定项目
- load_start empty:true 信号让客户端失效该 scope 视图缓存快照（修复增量恢复已删会话残留）
- 空视图跳过全局 context-window.json 兜底（避免画入别的项目用量条）
- 前端 sid-not-found 按 payload reason 显示新键 ui.resume.noSession（18 语言）取代误导性的「切换超时」

Coverage: events-instance-live-empty.test.js, sid-not-found-live-empty.test.js

* feat(server): relay SDK task_* messages as sdk-task WS frames

_processMessage gains a task_started/task_progress/task_notification/
task_updated branch, losslessly normalizing (snake→camel) to a
{type:'sdk-task'} broadcast. task_updated.patch stays a merge delta for
the client (an all-empty patch is dropped); skip_transcript is forwarded
as-is; pure relay without touching turn settlement. No server-side task
table, so no reconnect replay — ephemeral-vs-replay is a UI-stage call.

Server-side channel only; UI landing TBD after real-device observation.

Coverage: sdk-manager-query.test.js

---------

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-956af1723f"></a>
## [956af1723f](./cc-viewer-alignment-commit-ledger.md#commit-956af1723f) — chore(release): 1.9.3

提交时间：2026-10-10T15:35:57+08:00。

````text
chore(release): 1.9.3

Consume the five patch changesets (workspace-empty-tab sid-not-found fix,
SDK approval-timeout dismiss broadcast, SDK resident streaming-input
rework, SDK in-place session resume, SDK task_* message relay) and file
the history.md Unreleased entries under ## 1.9.3.
````

<a id="message-7f7f78e2d8"></a>
## [7f7f78e2d8](./cc-viewer-alignment-commit-ledger.md#commit-7f7f78e2d8) — feat(web): 新建工作区目录树「启动」一步直启

提交时间：2026-10-10T22:53:55+08:00。

````text
feat(web): 新建工作区目录树「启动」一步直启
````

<a id="message-d88d8aee2a"></a>
## [d88d8aee2a](./cc-viewer-alignment-commit-ledger.md#commit-d88d8aee2a) — chore(star-history): refresh chart [skip ci]

提交时间：2026-10-12T10:46:32+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-04d05a5824"></a>
## [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) — feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板

提交时间：2026-10-13T00:25:47+08:00。

````text
feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板

健壮性(P2):_runWaterfallHook 的 plan/ask/perm 三处静默 catch{} 改
reportSwallowed;_messageQueue 加 MAX_QUEUE_ITEMS=50 上限,超限只发
queue-rejected{reason:'full'}(前端 queueFull toast 从死监听接通);README
ccv -SDK 笔误改 ccv --sdk,no terminal panel 改为承认 Header 的 scratch 多 tab
终端存在。

Context 用量面板(P1):常驻 query 接通 getContextUsage 控制请求,回合结束/compact
后自动拉取并广播 sdk-context-usage(快照随 WS 重连回放、切会话广播清帧),新增
GET /api/sdk-context-usage 按需拉取;请求详情面板新增 SDK-only「Context 用量」
标签页,按类别构成条(含 auto-compact 阈值刻度)/上下文网格/记忆文件/MCP 工具/
系统提示分节/子代理/技能/消息明细全字段渲染(18 语言)。control 失败仅
reportSwallowed,不打扰 UI。

Coverage: sdk-manager-query.test.js, sdk-context-route.test.js,
context-usage-view.test.js, context-i18n.test.js, sdk-context-usage-tab.test.js.
````

<a id="message-5a7349a23b"></a>
## [5a7349a23b](./cc-viewer-alignment-commit-ledger.md#commit-5a7349a23b) — chore(release): 1.9.4

提交时间：2026-10-13T00:25:48+08:00。

````text
chore(release): 1.9.4
````

<a id="message-2be5bb23f6"></a>
## [2be5bb23f6](./cc-viewer-alignment-commit-ledger.md#commit-2be5bb23f6) — feat(ui): 小终端(scratch)按工作区分组并伴随视图切换,关闭工作区连带回收

提交时间：2026-10-13T00:25:48+08:00。

````text
feat(ui): 小终端(scratch)按工作区分组并伴随视图切换,关闭工作区连带回收
````

<a id="message-bc669f59cc"></a>
## [bc669f59cc](./cc-viewer-alignment-commit-ledger.md#commit-bc669f59cc) — test(sdk): 补提交 SDK 会话状态(turn-level session-state)测试

提交时间：2026-10-13T00:25:48+08:00。

````text
test(sdk): 补提交 SDK 会话状态(turn-level session-state)测试

覆盖 sdk-manager 的 session_state_changed 转发、push/result 兜底、interrupt/teardown 清态、WS 重连快照等。该文件在 turnActive 提交时漏收。
````

<a id="message-3079040494"></a>
## [3079040494](./cc-viewer-alignment-commit-ledger.md#commit-3079040494) — feat(sdk): SDK 模式改为每工作区独立常驻会话(按 cwd 多会话,对齐 PTY)

提交时间：2026-10-13T00:25:48+08:00。

````text
feat(sdk): SDK 模式改为每工作区独立常驻会话(按 cwd 多会话,对齐 PTY)

sdk-manager 由单例重构为 Map<path.resolve(cwd), Session> 工厂闭包注册表,
_activeKey 选当前会话。launch/新建工作区即在该 cwd 注册独立常驻会话,切走
不拆旧会话(后台持续运行),切回懒重建并 resume 其 sessionId。发消息/中断/
队列按 cwd(或 sanitized 项目名)anchor 寻址;每会话子进程注入
x-ccv-project-dir:<cwd>(对齐 PTY),transcript 按 cwd 分流不串写;cwd 标记
的 WS 帧只推给正在看该工作区的连接,重连 replay 同滤。header
/api/live-processes 把每个 SDK 会话以 kind:'main' 真实条目列出(可切换、
不可 × 关),修复「SDK 模式 header [+] 首次新建工作区后项目名塌缩只剩新
项目」。launch 注册新会话用进程级 launch 配置模板(setSdkLaunchConfig);
initSdkSession 回调只在显式传入时覆盖;workspacesStop 一并 stopSession()
回收全部 SDK 会话。

Coverage: sdk-session-registry.test.js + 既有 sdk-manager 系列。
````

<a id="message-c4529a6ed7"></a>
## [c4529a6ed7](./cc-viewer-alignment-commit-ledger.md#commit-c4529a6ed7) — fix(ui): 对话 loading 覆盖整个回合,本地工具执行期不再误熄

提交时间：2026-10-13T00:25:48+08:00。

````text
fix(ui): 对话 loading 覆盖整个回合,本地工具执行期不再误熄

原信号粒度是单个 API 请求,两次调用间隙跑本地工具(Bash/Edit 等)时 spinner
熄灭,像任务已结束。新增回合级 turnActive 状态:

- PTY:UserPromptSubmit hook 亮起(sessionId 承重守卫),Stop hook 原始 POST
  到达即灭(跳过 10s 语音防抖),停止按钮(queue-suppress)/终端 Esc(嗅探
  「Request interrupted」fullmatch 条目)主动灭;turnActive=true 期间 server 每
  10s 心跳重播 turn_active(unref'd + 项目过滤),前端 30s 双无(无 API 活动且
  无回合级信号)自调度陈旧兜底防卡死;SSE connect replay 只发绑定项目视图。
- SDK:转发 CLI 原生 session_state_changed(idle/running/requires_action,注入
  CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1 解锁),push→running / result→idle /
  中断·死亡→idle 全版本兜底;帧带 cwd 按工作区路由,前端按查看工作区过滤。

灭灯改为回合级信号把关 2s 防抖,亮灯时机不变;hook 缺失精确退化旧行为;
多工作区切换双端复位(_resetForViewSwitch/chip/attach/workspace 全覆盖)。

行为变化:工具执行间隙按 Enter 转为入队而非立即发送。

Coverage: turn-active.test.js, cli-sdk-session-state-env.test.js,
turn-active-gating.test.js, sse-connection-gen.test.js, api-events-gap.test.js
````

<a id="message-133bc219df"></a>
## [133bc219df](./cc-viewer-alignment-commit-ledger.md#commit-133bc219df) — feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环

提交时间：2026-10-13T00:25:48+08:00。

````text
feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环

- D: 接通 mcpServerStatus()(GET /api/sdk-mcp-server-status + WS 重连回放 + 切会话清帧;身份守卫 + 10s 超时 + 数组守卫反转),详情面板新增 SDK-only「MCP 状态」标签页。
- E: sdkModel 死状态接通,提升到 AppBase,在 AppHeader 代理热切换 chip 槽位作回退展示(热切换优先,只读);resume 切会话清空防陈旧,删除 ChatView 冗余拷贝。
- F: 同步 17 个翻译版 README 的 SDK 段(ccv --sdk / 承认 Header scratch 终端)。
- fix: 修 SdkMcpStatusTab 与 SdkContextUsageTab 的无限拉取环(useState+useCallback([detail,status]) → useReducer 稳定 dispatch),新增源契约测试防回归。
````

<a id="message-ad369d2856"></a>
## [ad369d2856](./cc-viewer-alignment-commit-ledger.md#commit-ad369d2856) — chore(sdk): getContextUsage 超时定时器 unref + settle 后 clearTimeout

提交时间：2026-10-13T00:25:48+08:00。

````text
chore(sdk): getContextUsage 超时定时器 unref + settle 后 clearTimeout

对齐本文件既有定时器惯例(watchdog/grace 均 unref),避免 10s 窗口内推迟进程退出;
请求 settle 后清理 timer 句柄。review P3 整洁项,无功能变化。
````

<a id="message-a07464187c"></a>
## [a07464187c](./cc-viewer-alignment-commit-ledger.md#commit-a07464187c) — fix(web): 新建工作区弹窗底部出血加高

提交时间：2026-10-13T00:25:48+08:00。

````text
fix(web): 新建工作区弹窗底部出血加高

嵌入 antd Modal 的 .modalBody 底部 padding 0 → 20px,目录树底部不再贴弹窗下边缘。
````

<a id="message-2dbe5cd695"></a>
## [2dbe5cd695](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) — feat(web): 汉堡菜单「钉住」持久化迁移到 preferences.json (#148)

提交时间：2026-10-13T22:25:34+08:00。

````text
feat(web): 汉堡菜单「钉住」持久化迁移到 preferences.json (#148)

权威源从浏览器 localStorage(ccv_pinnedMenuKeys,JSON 字符串)迁到服务端
pinnedMenuKeys(真数组,顺序=钉住先后),跨浏览器/设备一致,并随「项目独立
配置」fork 到项目作用域(POST 浅合并宽容落盘,服务端零改动)。

- 首启一次性迁移:prefs 缺键而 legacy 有值 → 经 _persistQueue 写回并清旧键;
  服务端已持有权威数组(含空数组)时直接清理遗留旧键,防死数据复活
- 初值恒空等权威水合(不再用 legacy 乐观种子),杜绝陈旧种子覆盖他端 pin
- 水合窗口内用户已 toggle:迟到初始 GET 不回退其操作(_pinnedTouched 闩锁
  + _prefsHydrated 门控,用户 POST 落盘后才开闸;窗口内 POST 为整数组 LWW,
  已接受的一个 RTT 取舍)
- 全部写回(含迁移 POST)经 _persistQueue 串行化(服务端 LWW 乱序会丢 pin),
  链前置 .catch 自愈;GET 失败按 logDir stamp 判别,保留现状不清旧键
- 日志模式(isLocalLog)统一走 preferences,不再保留 localStorage 双轨
- cDU 新增 props.preferences 同步通道(sameKeys 内容比较防更新环),
  sCU 白名单补 preferences(修复 render 已消费的现存漏网)
- 删除死导出 serializePinned(写路径只走 preferences,无生产使用方)

Coverage: pinned-menu.test.js, pinned-menu-prefs-migration.test.js

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
Co-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
````

<a id="message-5c28d4c50a"></a>
## [5c28d4c50a](./cc-viewer-alignment-commit-ledger.md#commit-5c28d4c50a) — feat(sse): per-workspace independent SSE channels

提交时间：2026-10-13T22:27:41+08:00。

````text
feat(sse): per-workspace independent SSE channels

Replace the single re-scoped SSE connection with one persistent channel per
workspace scope (bound / project / project+instance / sid), so concurrent
workspaces no longer entangle special states on one torn-down-and-rebuilt
connection.

Server: streaming/turn state moves from process-global singletons to
scope-keyed maps (the bound project normalizes to the '' sentinel, so a single
workspace keeps byte-identical legacy behavior); turn_end / task_update /
stream-progress / session_pin / workflow_update are now routed per scope via a
unified sid->cwd->bound hook-payload resolver; stream chunks finally carry the
producer's self-reported project/instance (the old filter was dead code);
connect-time task snapshot / turn_active replay / context_window fallback are
read per viewed scope. Task state is bucketed per scope ('' = the legacy
singleton). Scope buckets are reaped on workspace stop and stream-tail resets
capture the activation key (a mid-flight rebind can no longer strand a bucket
active).

Client: AppBase's single EventSource becomes a createChannelManager with one
persistent channel per scope (capped, LRU never evicting bound/rendered) and a
per-channel vm holding the committed React slice + journal + per-channel v3
assembler. The rendered view reads only the rendered channel's vm; background
channels write their own. Switching to a warm channel is an instant state swap
with no teardown, no cold load and no overlay; evicted channels snapshot to the
view cache and resume with ?since&cc. Global frames are handled only on the
rendered channel; the PTY-mode turn_end ignore hack is removed now that frames
are scope-filtered.

Single-workspace behavior is byte-identical: one channel, one state bucket,
one fast-path filter.
````

<a id="message-a30d8c92a7"></a>
## [a30d8c92a7](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7) — fix(sse): per-workspace SSE 通道 CR 修复(P1×7+P2×7)与 git-diff flake

提交时间：2026-10-14T00:12:29+08:00。

````text
fix(sse): per-workspace SSE 通道 CR 修复(P1×7+P2×7)与 git-diff flake

针对 5c28d4c5 的多角色 Code Review 修复,不含行为外的新特性。

P1(正确性/泄漏/竞态):
- onTaskSessionBoundary 改走 120ms trailing debounce,_emitTaskUpdate 入口补
  _isStopping 短路,停止窗口不再向垂死连接写帧、不再重复整快照帧。
- streaming tick 集合改为 activeStreamingScopes() ∪ _lastCliActiveByScope.keys(),
  非 bound scope 的 falling edge 至少被观察一次,rising-edge 的 pending
  turn_end cancel 不再从第二轮起失效(打断场景误播语音的回归修复)。
- /api/live-processes/close 接线 clearScopeRuntimeFor(新增导出),按 producer
  同源 scope 清理被杀 PTY 的 turn/streaming 桶与 _turnSessionIdByScope/
  _lastCliActiveByScope 对应键,修复桶永久 active:true 导致的永久 spinner。
- sid 通道保留完整 project/instance:ensure/_newChannel 接受显式 scope,不再
  用 key 反推丢信息(4 处读取点回归:overlay 不亮/重连弹出 attach/workflow 丢帧)。
- 非 rebound 的 workspace_started(跨标签 launch 新工作区)在 projectName 真变时
  对称 _closeReboundChannels(旧名),非渲染通道不再画出已离场项目会话且永不自愈。
- _onChannelOpen 统一清零 reconnectsSinceCommit 并复位 journalDropped(覆盖
  原生/manager 重连),tap 通道不再永久降级为 warm-stale 冷重建。
- history.md/changeset 通道上限文案 2→3,与 maxChannels:3 一致。

P2(一致性/测试):
- sid 视图 URL 补 &instance=,服务端 view-scope key 与 producer 对齐,connect
  回放不再读空桶。
- filterClientsByInstance 改「排除明确 stamp 别的 instance 的客户端」,无排除
  时仍同引用 fast-path,active/clear 同集,project 级 viewer 不再等不到 clear。
- workspacesStop 改调 deps.resetScopeRuntime(),补清 _turnSessionIdByScope/
  _lastCliActiveByScope,重开同名项目不再带毒启动;deps 增 projectName/
  resetScopeRuntime/clearScopeRuntimeFor。
- warm-stale 冷 fallback 补 _v3ResetClientState,不复用已死 baseline。
- pin 写路径统一走 _commitChannel 咽喉,移除人工 vm.react 双写。
- 补 evict 组合链测试(超 cap→journal 预并入 snapshot→重进 ?since&cc)与
  stream chunk entry.project/instance 路由测试;修正 streaming tick 集合与
  filterClientsByScope fast-path 两处测试锚点以匹配新实现。

flake 修复:
- git-diff.js 的 git 调用超时由硬编码 3s/5s 统一为 GIT_TIMEOUT_MS=10000。
  假 git fixture(PATH 注入 POSIX sh)在全量并发负载下逼近 3s 阈值导致
  branch-lib-git-diff.test.js 轮换失败,放宽后连续两轮全量 test:cli 0 fail。

验证:build EXIT=0;test:web 4135/4135;test:cli 全量两轮 0 fail(改动面 155/155)。
````

<a id="message-df5c2fe807"></a>
## [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807) — Merge remote-tracking branch 'origin/main' into fix/sse-per-workspace-cr

提交时间：2026-10-14T00:14:24+08:00。

````text
Merge remote-tracking branch 'origin/main' into fix/sse-per-workspace-cr

# Conflicts:
#	history.md
````

<a id="message-d01259c844"></a>
## [d01259c844](./cc-viewer-alignment-commit-ledger.md#commit-d01259c844) — Merge pull request #149 from weiesky/fix/sse-per-workspace-cr

提交时间：2026-10-14T00:20:15+08:00。

````text
Merge pull request #149 from weiesky/fix/sse-per-workspace-cr

feat(sse): per-workspace 独立 SSE 通道 + CR 修复(P1×7+P2×7)
````

<a id="message-db2ada0866"></a>
## [db2ada0866](./cc-viewer-alignment-commit-ledger.md#commit-db2ada0866) — feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback

提交时间：2026-10-14T11:21:29+08:00。

````text
feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback

Move the per-scope live dialogue channel off "one resident SSE connection per
scope" onto a single shared /ws/mux WebSocket, with each logical stream
multiplexed by streamId over that socket. This lifts the browser HTTP/1.1
~6-connections-per-origin ceiling that pinned SSE to maxChannels=3.

Server: new lib/ws-mux.js (frame codec + createStreamMuxServer). Each logical
stream masquerades as an SSE res inside the shared `clients` array (a real
EventEmitter sink shim), so the broadcast hot path (log-watcher senders,
_safeSseWrite, filterClientsByScope, direct writes) needs zero changes. The
/events broadcast core is extracted into serveEventStream — the single
implementation behind BOTH transports, so a mux stream and an SSE connection
produce a byte-identical frame payload sequence (pinned by an equivalence
test). The WS handshake enables perMessageDeflate (built into ws, no new dep)
to close the compression gap vs SSE's per-connection brotli.

Client: new utils/wsMuxTransport.js — an EventSource-shaped facade over a
logical stream, with capability probing and automatic fallback to a native
EventSource on the SAME url (the url already encodes scope + since/cc cursor).
Three-tier classification: capability (page-level, only on a first-ever dial
failure of a page that has never proven the mux — gated by a page-level
everProven flag), transient (retry with backoff), per-stream. Transient blips
never permanently downgrade the page; capability absence falls back to SSE
(not persisted, re-probed on reload).

Also fix: the desktop incremental-URL same-connection replay viewport
truncation (_onLoadEnd merge condition widened to "merge whenever a non-empty
baseline exists"; the merge is idempotent on timestamp|url).

Coverage: ws-mux.test.js, ws-mux-equivalence.test.js, ws-mux-channel.test.js +
the existing SSE/channel regression suites.
````

<a id="message-e6baf89e6a"></a>
## [e6baf89e6a](./cc-viewer-alignment-commit-ledger.md#commit-e6baf89e6a) — Merge pull request #150 from weiesky/feat/ws-mux-dialogue-channel

提交时间：2026-10-14T13:36:20+08:00。

````text
Merge pull request #150 from weiesky/feat/ws-mux-dialogue-channel

feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback
````

<a id="message-8aefa1c29e"></a>
## [8aefa1c29e](./cc-viewer-alignment-commit-ledger.md#commit-8aefa1c29e) — chore(release): 1.9.5

提交时间：2026-10-14T13:39:26+08:00。

````text
chore(release): 1.9.5
````

<a id="message-f20efc1371"></a>
## [f20efc1371](./cc-viewer-alignment-commit-ledger.md#commit-f20efc1371) — fix: use temporary keychain password for macOS signing (#151)

提交时间：2026-10-14T15:07:09+08:00。

````text
fix: use temporary keychain password for macOS signing (#151)

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-4991ba762d"></a>
## [4991ba762d](./cc-viewer-alignment-commit-ledger.md#commit-4991ba762d) — fix(sse): WS-mux cold-load queue overflow left dialogue blank after refresh

提交时间：2026-10-15T11:31:54+08:00。

````text
fix(sse): WS-mux cold-load queue overflow left dialogue blank after refresh

perMessageDeflate counted Node's zlib pending-queue bytes in ws.bufferedAmount
before they reached TCP, so the backpressure gate saw a phantom backlog during
cold-load bursts, marked the socket behind, and started queueing frames —
including the 25s pings. The queue grew monotonically until the 8MB cap killed
the connection (1011 queue-overflow), the channel watchdog fired, and every
reconnect repeated the cycle, leaving the dialogue blank.

- Disable perMessageDeflate on /ws/mux (SSE's per-write brotli path is
  unaffected; the byte win was not worth a self-inflicted wedged socket)
- Raise the mux queue safety net 8MB -> 32MB (the cc-viewer project's own
  ~11MB v3 cold load already exceeded the old cap)
- Add temporary [ws.mux.diag] probes in the web transport +
  _onChannelHeartbeatTimeout for field verification (grep ws.mux.diag;
  to be removed once the fix is confirmed on real hardware)
````

<a id="message-a84385b5a8"></a>
## [a84385b5a8](./cc-viewer-alignment-commit-ledger.md#commit-a84385b5a8) — feat(sdk): per-workspace close + stable instance identity for same-name disambiguation

提交时间：2026-10-15T13:12:09+08:00。

````text
feat(sdk): per-workspace close + stable instance identity for same-name disambiguation

SDK multi-workspace had two linked defects: header tabs could not close an
SDK workspace (rows were instanceKey:null, closable:false, and no per-session
teardown existed), and the file browser frequently failed with
"ambiguous project name" because view-root's instance arbitration only
recognized PTY records.

- Stable per-cwd instanceKey (ccv-<sha256 of normalized cwd>) for every SDK
  session; new L1 sdk-session-index exposes it to view routing without
  loading the Agent SDK in PTY mode.
- closeSdkSession/attachSdkSession: exact instance targeting, name-only
  ambiguity refuses with 409 candidates; registry identity is removed before
  teardown so a close-triggered relaunch is never deleted; pending approvals
  are cancelled and dismissed (session-closed) and the active pointer
  re-anchors to a survivor.
- live-processes: SDK rows carry instanceKey and are closable; bound
  currentInstanceKey derived; close shares rebound/scratch/scope cleanup;
  attach/resume-session honor instance anchors.
- _sessionForAnchor never degrades an unmatched instanceKey to a same-
  basename sibling (a stale key in the poll window would have delivered the
  user's message into the wrong workspace); dropped sends surface a toast.
- view-root counts SDK sessions as live candidates and resolves ?instance=
  to the exact cwd; stats routes derive the log-store name from the raw
  matched path (never the request name — closes a LOG_DIR presence oracle —
  and never the realpath'd root, which broke leaf-symlinked workspaces).
- events targetCwd/liveness recognize SDK instances (fresh workspace stays
  live-empty instead of sid-not-found detaching).
- ChatView sends viewInstance on sdk-user-message/interrupt/queue ops.
- Same-name twin WS isolation: SDK children self-report x-ccv-instance,
  every session broadcast frame carries instanceKey, broadcastWsMessage
  narrows delivery to the matching instance viewer, and the queue-state
  handler ignores other instances' frames.

Tests: sdk-session-index/registry, live-processes-close, resume-route,
view-root, view-routes-project (forged-name oracle + symlink-leaf),
events live-empty/samename-cwd, ws-instance-isolation, sdk-workspace-anchors.
Gates: build + test:cli (11362 pass/0 fail) + test:web (4112 pass/0 fail).
````

<a id="message-46d33276c9"></a>
## [46d33276c9](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9) — fix(sse): gate ws.mux.diag probes + pin perMessageDeflate:false (CR follow-up)

提交时间：2026-10-15T13:47:57+08:00。

````text
fix(sse): gate ws.mux.diag probes + pin perMessageDeflate:false (CR follow-up)

Five-reviewer CR on 4991ba76 found no P0; this adopts the P1/P2 items:

- P1: gate every [ws.mux.diag] probe behind localStorage.ccv_ws_mux_diag==='1'
  (termDiag.js precedent). The per-frame socket.onmessage probe inlined its flag
  check so the object alloc + 60-char slice only happen with the gate open —
  thousands of console.log calls during the very cold-load burst under diagnosis
  were a self-inflicted slowdown, and terser does not drop console in the shipped
  bundle.
- P2: pin perMessageDeflate:false with a regression test that captures the WSS
  constructor options (re-enabling deflate reintroduces the outage with every
  other test green), plus a guard that a legitimate ~11MB fast-consumer burst
  never queues/overflows.
- P2: fix history.md contradiction (the original mux entry still claimed
  perMessageDeflate was ON under the same Unreleased heading).
- P2: correct the postmortem comments — the cap raise 8->32MB is the
  load-bearing fix (measured: 32MB+deflate-on absorbs the burst at 10.6MB peak);
  the deflate disable is prophylactic. Document the accepted trade-off: the mux
  path is now uncompressed (SSE fallback keeps brotli), slower cold loads on
  remote links until the structural HTTP-fetch follow-up.
- P3: derive the overflow test trigger from the exported QUEUE_MAX_BYTES
  instead of a magic 33MB (1MiB margin, decays silently on the next cap change).
````

<a id="message-0a9ad5d767"></a>
## [0a9ad5d767](./cc-viewer-alignment-commit-ledger.md#commit-0a9ad5d767) — Merge pull request #152 from weiesky/feat/sdk-instance-close-ws-mux-overflow

提交时间：2026-10-15T13:56:04+08:00。

````text
Merge pull request #152 from weiesky/feat/sdk-instance-close-ws-mux-overflow

fix(sdk,sse): per-workspace SDK close + instance identity; WS-mux queue overflow fix
````

<a id="message-983d08b571"></a>
## [983d08b571](./cc-viewer-alignment-commit-ledger.md#commit-983d08b571) — chore(release): 1.9.6

提交时间：2026-10-15T13:56:40+08:00。

````text
chore(release): 1.9.6
````

<a id="message-7830664780"></a>
## [7830664780](./cc-viewer-alignment-commit-ledger.md#commit-7830664780) — fix(web): 文件树行高不再被压缩抖动

提交时间：2026-10-15T15:47:29+08:00。

````text
fix(web): 文件树行高不再被压缩抖动

.treeContainer 是 column flexbox，.treeItem 未声明 flex-shrink（默认 1），
行数超出视口后被 flex 算法等比压到 26px 以下，行高/行距随展开抖动。
补 flex-shrink: 0 钉住行高，溢出交给 overflow:auto 滚动。
````

<a id="message-ec440163c0"></a>
## [ec440163c0](./cc-viewer-alignment-commit-ledger.md#commit-ec440163c0) — Merge pull request #153 from weiesky/fix/file-tree-row-shrink

提交时间：2026-10-15T15:53:49+08:00。

````text
Merge pull request #153 from weiesky/fix/file-tree-row-shrink

fix(web): 文件树行高不再被压缩抖动
````

<a id="message-d906edb3de"></a>
## [d906edb3de](./cc-viewer-alignment-commit-ledger.md#commit-d906edb3de) — feat(web): skill scope rows + frosted glass bars

提交时间：2026-10-16T23:50:11+08:00。

````text
feat(web): skill scope rows + frosted glass bars

- Active Skills popover split into Global / Project / Plugin scoped rows
- RoleFilterBar + TaskProgressHud frosted glass (--bg-glass + backdrop blur)
- RoleFilterBar floats above message list with 41px padding compensation
- Role chip solid --bg-surface background
````

<a id="message-b500ebf76c"></a>
## [b500ebf76c](./cc-viewer-alignment-commit-ledger.md#commit-b500ebf76c) — chore(release): 1.9.7

提交时间：2026-10-17T00:43:41+08:00。

````text
chore(release): 1.9.7
````

<a id="message-06e1db54c7"></a>
## [06e1db54c7](./cc-viewer-alignment-commit-ledger.md#commit-06e1db54c7) — Merge pull request #154 from weiesky/fix/file-tree-row-shrink

提交时间：2026-10-17T00:44:46+08:00。

````text
Merge pull request #154 from weiesky/fix/file-tree-row-shrink

feat(web): skill scope rows + frosted glass bars (1.9.7)
````

<a id="message-51dec0fbe1"></a>
## [51dec0fbe1](./cc-viewer-alignment-commit-ledger.md#commit-51dec0fbe1) — chore(star-history): refresh chart [skip ci]

提交时间：2026-10-19T08:50:05+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-2847027b54"></a>
## [2847027b54](./cc-viewer-alignment-commit-ledger.md#commit-2847027b54) — fix(server): 权限自动审批覆盖目录外 Read/Glob/Grep

提交时间：2026-10-21T01:29:53+08:00。

````text
fix(server): 权限自动审批覆盖目录外 Read/Glob/Grep

- 新增 PermissionRequest hook (perm-request-bridge.js) 处理越过启动目录的读取/glob/grep 权限提示
- perm-bridge 对目录内 Read/Glob/Grep 直接放行，目录外 fallthrough 到 PermissionRequest
- perm-request-bridge 查询当前项目 autoApproveSeconds，开启时静默 allow + addDirectories 会话级目录信任
- SDK 模式对齐：目录外 Read/Glob/Grep 在自动审批开启时返回 allow + addDirectories
- 新增共享 isOverTrustDir 守卫（approval-policy.js），防止授予 /、home、顶层目录、dot 目录
- ensure-hooks 注册 PermissionRequest hook（matcher: Read|Glob|Grep，find-by-command 不覆盖用户 hook）
- 修复 permHook >1MB body 崩溃（既存问题）
- 新增 perm-request-bridge.test.js、branch-routes-ask-perm.test.js（permRequestHook）、ensure-hooks.test.js（PermissionRequest 注册/幂等/用户 hook 保留/卸载）

Coverage: perm-bridge.test.js, perm-request-bridge.test.js, branch-routes-ask-perm.test.js, ensure-hooks.test.js, sdk-manager-query.test.js
````

<a id="message-5d42d90533"></a>
## [5d42d90533](./cc-viewer-alignment-commit-ledger.md#commit-5d42d90533) — chore(release): 1.9.8

提交时间：2026-10-21T01:32:20+08:00。

````text
chore(release): 1.9.8
````

<a id="message-3d4f098f08"></a>
## [3d4f098f08](./cc-viewer-alignment-commit-ledger.md#commit-3d4f098f08) — fix(web): stop askUserQuestion 'Other' input from triggering browser password save (#155)

提交时间：2026-10-21T11:43:49+08:00。

````text
fix(web): stop askUserQuestion 'Other' input from triggering browser password save (#155)

The 'Other' free-text input in AskQuestionForm rendered as a bare antd
<Input> with no autocomplete hints and autoFocus. Because the app also
ships real password fields (ProxyModal apiKey, ImPlatformSettings token),
Chrome/Safari heuristically treats this origin as a login-bearing site
and attaches password autofill/save prompts to any prominent text input.

Add the standard opt-out markers so password managers skip the field:
autoComplete=off, data-1p-ignore (1Password), data-lpignore (LastPass),
data-form-type=other (Dashlane).

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-67ceb5b7f0"></a>
## [67ceb5b7f0](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) — feat(web): "/" 弹出斜杠技能菜单

提交时间：2026-10-21T17:56:26+08:00。

````text
feat(web): "/" 弹出斜杠技能菜单

- 输入 / 弹出分组技能菜单（个人/内置），点选填入 /name 待补参数
- 数据源：SDK supportedCommands() 按 init.skills 白名单收敛为纯 skill（过滤 TUI 内置命令），
  广播 sdk-skills（随重连回放）；空命令面/PTY/初始化前/失败回退 /api/skills
- 服务端 sdk-manager 按 query 代际拉取；server.js attach 切视图后按新 stamp 重发该视图 sdk-skills
- 修复 WS 回放/广播用 projectKeyForCwd 消毒 cwd（原裸 basename 会丢空格/CJK 工作区帧）；
  前端抽 utils/projectKeyFromCwd 统一消毒，修 AppBase session-state 误判
- 修复刷新/视图恢复的延迟初始化误清技能面的 reset 竞态；/api/skills 失败 5s 冷却后可重试
- 移动端菜单字号做 0.6 zoom 补偿
- 新增 slashCommandMenu.js 纯函数 + SlashCommandMenu 组件 + i18n keys（×18 locales）

Coverage: slash-command-menu.test.js, sdk-manager-query.test.js, new-ui-i18n.test.js, project-key-from-cwd.test.js
````

<a id="message-a2be00c45b"></a>
## [a2be00c45b](./cc-viewer-alignment-commit-ledger.md#commit-a2be00c45b) — feat(web): 桌面文件上传收纳进 (+) 菜单

提交时间：2026-10-21T17:57:20+08:00。

````text
feat(web): 桌面文件上传收纳进 (+) 菜单

聊天输入栏独立的桌面上传圆钮移除，「上传文件」改为 (+) 菜单顶部菜单项
（quickMenuRow 级联行样式），与移动端行为对齐；粘贴/拖拽上传链路不变。
sharedChrome 补 button.quickMenuRow:hover 使顶层行有 hover 反馈。
history.md 补 Unreleased 条目。Coverage: upload-plus-menu.test.js
````

<a id="message-51c23e9090"></a>
## [51c23e9090](./cc-viewer-alignment-commit-ledger.md#commit-51c23e9090) — fix(web): 修复 SDK 模式 plan 审批卡死

提交时间：2026-10-21T17:57:20+08:00。

````text
fix(web): 修复 SDK 模式 plan 审批卡死

SDK 模式 cliMode 同为 true，PTY 计划审批卡片/全局弹窗被一并激活，其「批准」
发送的 PTY 击键被服务端 SDK 通道丢弃（server.js 丢 input），SDK canUseTool
承诺永不 resolve，会话空等至 5 分钟超时。现将 PTY plan 卡片、全局弹窗与
「Plan 自动审批」全部按 !sdkMode 门控，并在两个 PTY 击键 sink
（handlePromptOptionClick / handlePlanFeedbackSubmit）与 LR ownership 的
cliMode 入口加 sdkMode 防御；SDK 模式只留底部 sdk-plan-* 审批面板。
QuickAutoApproveRows 新增 hidePlan：SDK 模式隐藏不生效的 Plan 自动审批行
（middle 改为跟随最后一行）。Coverage: sdk-plan-approval-guard.test.js, resume-history-menu.test.js
````

<a id="message-9dbf4e295a"></a>
## [9dbf4e295a](./cc-viewer-alignment-commit-ledger.md#commit-9dbf4e295a) — fix(web): SDK 模式打开终端不再隐藏对话输入框

提交时间：2026-10-21T18:09:34+08:00。

````text
fix(web): SDK 模式打开终端不再隐藏对话输入框

ChatInputBar 在 terminalVisible 时早退隐藏输入框以让位终端，但 SDK 模式下
terminalVisible 是 scratchOpen（伴随 scratch 终端开关），导致开终端即隐藏对话
输入框。现仅 PTY 模式（terminalVisible = 主 PTY 面板）在终端打开时让位；SDK
模式对话输入框始终可见。
````

<a id="message-3cf3e9585f"></a>
## [3cf3e9585f](./cc-viewer-alignment-commit-ledger.md#commit-3cf3e9585f) — fix(web): (+) 菜单顶层「上传文件」行 hover 时收起残留的级联子菜单

提交时间：2026-10-21T18:48:08+08:00。

````text
fix(web): (+) 菜单顶层「上传文件」行 hover 时收起残留的级联子菜单

上传行是桌面 (+) 菜单唯一顶层 quickMenuRow，原未接 hover：从「历史会话」等组经
hover 桥斜向移入时不触发任何 enter/leave，展开态残留致子菜单不收。现进入该行即
qmHover.cancel() + 清 quickExpanded。顺带放宽 upload-plus-menu 一条因多行 JSX 失效
的正则断言。
````

<a id="message-3c77d9a8ed"></a>
## [3c77d9a8ed](./cc-viewer-alignment-commit-ledger.md#commit-3c77d9a8ed) — Merge pull request #156 from weiesky/feat/slash-skill-menu-sdk-fixes

提交时间：2026-10-21T18:50:40+08:00。

````text
Merge pull request #156 from weiesky/feat/slash-skill-menu-sdk-fixes

feat(web): "/" 技能菜单 + SDK 模式多项修复
````

<a id="message-baf4500607"></a>
## [baf4500607](./cc-viewer-alignment-commit-ledger.md#commit-baf4500607) — chore(release): 1.9.9

提交时间：2026-10-21T18:51:17+08:00。

````text
chore(release): 1.9.9
````

<a id="message-45bfa4124d"></a>
## [45bfa4124d](./cc-viewer-alignment-commit-ledger.md#commit-45bfa4124d) — fix(server): gate [ccv:*] diagnostic logs on CCV_DEBUG

提交时间：2026-10-22T10:43:06+08:00。

````text
fix(server): gate [ccv:*] diagnostic logs on CCV_DEBUG

Server-side reportSwallowed calls now route through a new wrapper at
packages/app/server/lib/error-report.js which is a no-op unless
CCV_DEBUG is set. Recoverable noise (down/flaky upstream, contended
locks, losing races) no longer spams the terminal; the underlying
failure is still surfaced where it matters (pseudo-response
statusText, SSE error frames, UI fallbacks). Set CCV_DEBUG=1 to
restore the previous behavior — core's per-tag cap still applies.

Web frontend and @ccv/core/error-report itself are untouched; tests
continue to import core directly to pin its dedup/suppression
behavior.
````

<a id="message-9b1bb4e729"></a>
## [9b1bb4e729](./cc-viewer-alignment-commit-ledger.md#commit-9b1bb4e729) — fix(sdk): render turn/query failures as persistent rows in the dialogue tail

提交时间：2026-10-22T10:47:12+08:00。

````text
fix(sdk): render turn/query failures as persistent rows in the dialogue tail

SDK errors (turn result errors, query death/build failure) previously
only surfaced as a transient toast — the dialogue looked hung. Now
a persistent error row renders at the dialogue tail: identical errors
merge with a count (\xd7N, capped at 3 rows, timestamped), cleared on
send/workspace-switch/view-switch/session-switch; toasts stay scoped
to the same workspace/instance.

Query-level error frames gain cwd/sessionId/instanceKey routing
metadata and route-failure frames gain the project key, fixing
multi-workspace error cross-talk.
````

<a id="message-a336d3919f"></a>
## [a336d3919f](./cc-viewer-alignment-commit-ledger.md#commit-a336d3919f) — feat(web): fold terminal toolbar upload into the sparkle quick-settings menu

提交时间：2026-10-22T11:11:32+08:00。

````text
feat(web): fold terminal toolbar upload into the sparkle quick-settings menu

The terminal's bottom toolbar had a standalone upload round button
alongside UltraPlan and clear-context. Fold it into the sparkle
quick-settings Popover as a top-level quickMenuRow, mirroring the
ChatInputBar (+) menu pattern from a2be00c4 / 3cf3e958. The row closes
the Popover before triggering the persistent hidden file input, and
its onMouseEnter cancels hover-intent plus collapses any expanded
cascade so diagonal travel from 历史会话/AgentTeam doesn't leave a
stale submenu.

The upload chain (hidden input at line 1851, handleFileUpload,
onFilePath, image-upload-notify WS frame) is untouched.
````

<a id="message-9967ebdbc2"></a>
## [9967ebdbc2](./cc-viewer-alignment-commit-ledger.md#commit-9967ebdbc2) — feat(web): rename AgentTeam menu label to localized quick-prompt wording

提交时间：2026-10-22T11:18:40+08:00。

````text
feat(web): rename AgentTeam menu label to localized quick-prompt wording

The cascade row in both the terminal sparkle quick-settings menu and
the ChatInputBar (+) menu shared the literal "AgentTeam" label across
all 18 locales. Rename it per-locale with quick-prompt semantics (not
literal transliteration): zh/zh-TW 快捷指令, en Quick Prompts,
ja クイックプロンプト, ko 빠른 프롬프트, de Schnellprompts,
es/fr/pt-BR Prompts rápidos, it Prompt rapidi, da Hurtige prompts,
pl Szybkie prompty, ru Быстрые промпты, ar مطالبات سريعة,
no Raske prompts, th พรอมป์ด่วน, tr Hızlı istemler, uk Швидкі промпти.

Both menu hosts consume the same ui.terminal.agentTeam key, so the
rename lands in both places with one edit. The separate
ui.terminal.agentTeamCustom key (PresetModal section header) is left
unchanged.
````

<a id="message-58493d1c85"></a>
## [58493d1c85](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85) — feat(plugins): directory service plugins with same-port proxy + remote React panels

提交时间：2026-10-22T22:11:06+08:00。

````text
feat(plugins): directory service plugins with same-port proxy + remote React panels

Add directory-form plugins that run as an isolated child-process service,
mounted on the host port under /plugins/<name>/*, plus remote React panels
hot-mounted without an iframe. Includes hot reload, crash backoff/restart,
orphan/lock cleanup, and a management API (reload/restart/delete-dir).

Security hardening from a multi-round review:
- WS upgrade now enforces a same-origin check (terminal/mux/plugin WS);
  scheme-aware via Host + X-Forwarded-Proto so TLS-terminating proxies work.
- Plugin write endpoints and the /plugins/* proxy require admin + same-origin.
- /api/local-url now requires admin + same-origin (no token leak to pages).
- Child services no longer receive the parent ACCESS_TOKEN (parentToken dropped);
  child env is an allowlist (no ANTHROPIC_*/cloud credentials inherited).
- Crash path rewrites: abort controller, deactivate, per-generation config/lock
  cleanup, epoch guards held across awaits (no orphan/double-deliver races).
- stopServiceProcess verifies lock pid/nonce before signaling (no PID-reuse kill);
  WS 101 handshake headers are rewritten (Set-Cookie/Location policy).

Docs: plugin-services.md/.zh.md, plugins.md/.zh.md, panel template, README
reverse-proxy notes; English-only comments in new code. Changeset: patch.
````

<a id="message-c6f887c385"></a>
## [c6f887c385](./cc-viewer-alignment-commit-ledger.md#commit-c6f887c385) — chore(release): 1.9.10

提交时间：2026-10-22T22:22:29+08:00。

````text
chore(release): 1.9.10
````

<a id="message-e8ea1ae96a"></a>
## [e8ea1ae96a](./cc-viewer-alignment-commit-ledger.md#commit-e8ea1ae96a) — docs(history): classify backlogged Unreleased entries into 1.9.4~1.9.9 sections

提交时间：2026-10-22T22:22:29+08:00。

````text
docs(history): classify backlogged Unreleased entries into 1.9.4~1.9.9 sections
````

<a id="message-c66b5fe2ed"></a>
## [c66b5fe2ed](./cc-viewer-alignment-commit-ledger.md#commit-c66b5fe2ed) — feat(web): move proxy hot-switch chip into the chat input bar (#158)

提交时间：2026-10-23T01:32:00+08:00。

````text
feat(web): move proxy hot-switch chip into the chat input bar (#158)

Move the proxy hot-switch chip (and its SDK launch-model fallback) out of the
PC header into the chat input bar, right of the Enter hint and next to the send
button. While the PTY terminal is open the input bar is unmounted, so the chip
returns to its old header slot as a fallback to keep the entry visible. iPad
gains the chip in pad view; pure-mobile layout is unchanged and keeps the
hamburger-menu entry. Electron native-tab mode does not show the chip.

- New presentational ProxyChip component (click delegated to ChatView's ProxyModal)
- ChatInputBar proxyChip slot between hint and send button; shrinkable + hard cap
- ChatView gating: (sdkMode || !terminalVisible) && !(isMobile && !isPad) && !isElectronTab
- AppHeader keeps the chip only as a PTY-terminal-open fallback
- ProxyModal mobile drawer: portal to body on iPad only (phones keep the
  visualViewport lock), closed drawer leaves the tab order (inert/aria-hidden)
- Tests: proxy-chip-label, sdk-model-wiring, sdk-model-chip

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-3bd2aa9696"></a>
## [3bd2aa9696](./cc-viewer-alignment-commit-ledger.md#commit-3bd2aa9696) — fix(ci): bump-homebrew tarball 下载加重试 (#159)

提交时间：2026-10-23T02:56:44+08:00。

````text
fix(ci): bump-homebrew tarball 下载加重试 (#159)

* fix(ci): retry homebrew tarball download in bump-homebrew

The packument (metadata) endpoint becomes visible before the tarball CDN
object. The wait step polls metadata only, so it could succeed while the
tarball still 404'd — v1.9.10 failed exactly this way (curl exit 22 with no
retry). Retry the download every 30s, up to 40 attempts (20min), matching the
metadata wait window. Recoverable via `gh workflow run bump-homebrew.yml -f
version=<VER>`.

* fix(web): clamp suggestion ghost to two lines with two-line input floor

Long [SUGGESTION MODE] ghost text painted over the composer toolbar (mic,
usage chip, Tab hint, send): the absolute overlay allowed 120px against a
37/58px textarea with no ancestor clipping. Now .ghostText is clamped to two
lines via -webkit-line-clamp (ellipsis drawn by the clamp algorithm), and a
useLayoutEffect + ResizeObserver raises the composer to a two-line floor
(58px desktop/pad, 92px phone) whenever the clamped ghost exceeds one line.
.textareaWithGhost gains overflow: hidden as the hard stop; the voice interim
preview switches to max-height: 100% so the wrapper clip cannot cut its first
line; resizeChatTextarea neutralizes inline min-height while measuring so the
floor cannot bake into the inline height after the ghost clears.

Coverage: chat-ghost-clamp.test.js

---------

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-5d39fa11f3"></a>
## [5d39fa11f3](./cc-viewer-alignment-commit-ledger.md#commit-5d39fa11f3) — chore(release): 1.9.11

提交时间：2026-10-23T03:01:00+08:00。

````text
chore(release): 1.9.11
````

<a id="message-117ee25de2"></a>
## [117ee25de2](./cc-viewer-alignment-commit-ledger.md#commit-117ee25de2) — fix(web): leave a scrollbar bleed on the input stack gradient (#160)

提交时间：2026-10-23T11:30:41+08:00。

````text
fix(web): leave a scrollbar bleed on the input stack gradient (#160)

The floating input stack's bottom-to-top gradient painted the full chat
column width and covered the message list's right-side vertical scrollbar.
Measure the live scroller's classic-scrollbar gutter via ResizeObserver into
--chat-scrollbar-width and stop the gradient at it with background-size; on
overlay-scrollbar platforms (macOS default, mobile) the gutter measures 0,
so probe a temporary overflow:scroll element and fall back to a fixed 12px
bleed to keep the floating scrollbar visible. The composer card keeps its
interactions via a specificity-raised pointer-events:none on the transparent
.chatInputBar padding, re-enabled on .chatInputWrapper, so the revealed
scrollbar strip stays draggable.

Coverage: floating-input-stack.test.js

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-abdca8545c"></a>
## [abdca8545c](./cc-viewer-alignment-commit-ledger.md#commit-abdca8545c) — chore(release): 1.9.12

提交时间：2026-10-23T11:34:46+08:00。

````text
chore(release): 1.9.12

Consume the input-stack scrollbar-bleed patch changeset (1.9.11 → 1.9.12,
third-component patch bump only) and classify the backlogged Unreleased
history.md entries into their released 1.9.10 / 1.9.11 / 1.9.12 sections.
````

<a id="message-177b85df2c"></a>
## [177b85df2c](./cc-viewer-alignment-commit-ledger.md#commit-177b85df2c) — feat(server+web): add scheduled tasks ("设置定时任务")

提交时间：2026-10-23T17:39:51+08:00。

````text
feat(server+web): add scheduled tasks ("设置定时任务")

Add a scheduled-task manager to the (+) menu (chat input bar + terminal
toolbar): run a prompt on a preset (hourly/daily/weekdays/weekly), a custom
5-field cron, or a one-off time. Each task either injects the prompt into the
current live session or spawns a fresh isolated headless SDK session (SDK mode
only, with ask-for-approval permissions by default).

Server: cron engine (DST-safe), per-project task registry persisted to
scheduled-tasks.json (0600), a 10s-tick scheduler that claims each fire under a
cross-process file lock (Electron tabs / IM workers excluded), catch-up of the
most recent missed run within 7 days, Run now / pause / resume / delete, and a
20-entry run history (spawn runs link to their session). Fires are silent;
completions/failures toast over SSE.

Web: ScheduleTaskModal (list + form + history), 100 ui.schedule.* keys across
18 locales, project-scoped SSE guard + runId-dedup toasts.

Coverage: cron, schedule-model, scheduled-task-store, scheduled-task-scheduler,
scheduled-task-executor, scheduled-task-routes, sdk-manager-ephemeral,
schedule-description, schedule-i18n, schedule-modal-anchor, chat-queue.
````

<a id="message-451ef48d6a"></a>
## [451ef48d6a](./cc-viewer-alignment-commit-ledger.md#commit-451ef48d6a) — feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish

提交时间：2026-10-24T03:45:08+08:00。

````text
feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish

- Task definitions + scheduling state live in preferences.json (scheduledTasks key,
  strict writes); run history moves to scheduled-task-runs.json (per-task cap 20,
  claimRunId idempotency). Legacy scheduled-tasks.json is a read-only fallback that
  writers never touch; only createTask creates the prefs key.
- Security: prefs GET/POST/forks strip scheduledTasks; file-access-policy denies
  prefs/runs/legacy files (incl. .tmp-/.corrupt- residues); im-deny + pty-manager deny
  them too; corrupt prefs are backed up before any tolerant self-heal.
- Scheduler: startup sweep deferred past the sync startup burst (avoids
  JSON_STORE_REENTRANT against auth/credential sync writers); legacy tasks are never
  claimed; reclaim restores a once-task's terminal state from the runs file instead of
  a misleading interrupted marker.
- Modal: zero-task shows only the form; New-task button moves next to the title;
  title drops the project suffix; schedule warnings are submit-only; PTY mode hides
  the run-mode radios; new tasks hide the enabled switch; run history hides when
  empty; legacy tasks are read-only in the UI; stale-project responses are dropped
  via projectRef; mode is never silently rewritten for existing tasks.
- Docs: README (en/zh/zh-TW) + config-cloud-sync updated; changeset stays patch.
````

<a id="message-47827e973a"></a>
## [47827e973a](./cc-viewer-alignment-commit-ledger.md#commit-47827e973a) — chore(release): 1.9.13

提交时间：2026-10-24T03:46:45+08:00。

````text
chore(release): 1.9.13
````

<a id="message-6363a51ec0"></a>
## [6363a51ec0](./cc-viewer-alignment-commit-ledger.md#commit-6363a51ec0) — fix: recognize Kimi K3 model aliases

提交时间：2026-10-24T15:52:35+08:00。

````text
fix: recognize Kimi K3 model aliases
````

<a id="message-6bc7781bba"></a>
## [6bc7781bba](./cc-viewer-alignment-commit-ledger.md#commit-6bc7781bba) — test: isolate resume route PTY fixtures

提交时间：2026-10-24T16:00:44+08:00。

````text
test: isolate resume route PTY fixtures
````

<a id="message-0e1546e718"></a>
## [0e1546e718](./cc-viewer-alignment-commit-ledger.md#commit-0e1546e718) — merge: isolate resume route PTY fixtures

提交时间：2026-10-24T16:01:24+08:00。

````text
merge: isolate resume route PTY fixtures

# Conflicts:
#	history.md
````

<a id="message-f2ebb0fe6b"></a>
## [f2ebb0fe6b](./cc-viewer-alignment-commit-ledger.md#commit-f2ebb0fe6b) — Merge pull request #161 from weiesky/fix/kimi-k3-model-aliases

提交时间：2026-10-24T16:06:49+08:00。

````text
Merge pull request #161 from weiesky/fix/kimi-k3-model-aliases

fix: recognize Kimi K3 model aliases
````

<a id="message-c23590396f"></a>
## [c23590396f](./cc-viewer-alignment-commit-ledger.md#commit-c23590396f) — chore(release): 1.9.14

提交时间：2026-10-24T16:08:19+08:00。

````text
chore(release): 1.9.14
````

<a id="message-ab1b89ee13"></a>
## [ab1b89ee13](./cc-viewer-alignment-commit-ledger.md#commit-ab1b89ee13) — fix(files): scope file operations to viewed project

提交时间：2026-10-24T20:57:57+08:00。

````text
fix(files): scope file operations to viewed project
````

<a id="message-d89aa3b9af"></a>
## [d89aa3b9af](./cc-viewer-alignment-commit-ledger.md#commit-d89aa3b9af) — fix(web): restore SDK thinking per assistant turn

提交时间：2026-10-25T03:33:30+08:00。

````text
fix(web): restore SDK thinking per assistant turn
````

<a id="message-9c36b5b5a7"></a>
## [9c36b5b5a7](./cc-viewer-alignment-commit-ledger.md#commit-9c36b5b5a7) — fix(web): stabilize context usage colors and scrolling

提交时间：2026-10-25T18:09:42+08:00。

````text
fix(web): stabilize context usage colors and scrolling
````

<a id="message-0c7195b689"></a>
## [0c7195b689](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689) — fix(web): refresh changes after git commits

提交时间：2026-10-25T18:32:10+08:00。

````text
fix(web): refresh changes after git commits
````

<a id="message-5ee6739cba"></a>
## [5ee6739cba](./cc-viewer-alignment-commit-ledger.md#commit-5ee6739cba) — feat: merge SDK context usage into blood bars

提交时间：2026-10-25T23:39:32+08:00。

````text
feat: merge SDK context usage into blood bars
````

<a id="message-91b0055f2d"></a>
## [91b0055f2d](./cc-viewer-alignment-commit-ledger.md#commit-91b0055f2d) — fix(sdk): honor plan auto-approval settings

提交时间：2026-10-26T13:00:11+08:00。

````text
fix(sdk): honor plan auto-approval settings
````

<a id="message-b9d592fc13"></a>
## [b9d592fc13](./cc-viewer-alignment-commit-ledger.md#commit-b9d592fc13) — chore(star-history): refresh chart [skip ci]

提交时间：2026-10-26T08:52:30+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-1aca9b5f8f"></a>
## [1aca9b5f8f](./cc-viewer-alignment-commit-ledger.md#commit-1aca9b5f8f) — fix(chat): restore queued prompts and queue dispatch state

提交时间：2026-10-26T20:34:56+08:00。

````text
fix(chat): restore queued prompts and queue dispatch state
````

<a id="message-a99506d5f5"></a>
## [a99506d5f5](./cc-viewer-alignment-commit-ledger.md#commit-a99506d5f5) — chore(release): 1.9.15

提交时间：2026-10-26T21:20:41+08:00。

````text
chore(release): 1.9.15
````

<a id="message-2cd4488ce9"></a>
## [2cd4488ce9](./cc-viewer-alignment-commit-ledger.md#commit-2cd4488ce9) — Merge pull request #162 from weiesky/fix/file-browser-view-scope

提交时间：2026-10-26T21:26:59+08:00。

````text
Merge pull request #162 from weiesky/fix/file-browser-view-scope

fix: restore SDK conversations and scope file operations
````

<a id="message-aaa3a59444"></a>
## [aaa3a59444](./cc-viewer-alignment-commit-ledger.md#commit-aaa3a59444) — docs: changelog for server-side approval countdown and UltraReview template

提交时间：2026-10-27T23:47:58+08:00。

````text
docs: changelog for server-side approval countdown and UltraReview template
````

<a id="message-134a0de7ac"></a>
## [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac) — docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates

提交时间：2026-10-27T23:47:58+08:00。

````text
docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates

Rewrite the review-team section to build the team with named Agent
teammates (no TeamCreate/TeamDelete dependency), split multi-repo reviews
into separate tasks, fix all P0/P1 findings and evaluate P2 dialectically
(consulting the user via AskUserQuestion for special decisions), and close
the team by notifying each teammate to exit.

Synced verbatim from the single source of truth (ultraplanTemplates.js):
UltraPlan codeExpert template, packages/content + packages/app
ultraAgents/code-expert.json, the 18-locale concepts UltraPlan.md docs, and
the UltraReview preset default prompt (ui.preset.codeReview5.desc, 18
locales).
````

<a id="message-5e50112388"></a>
## [5e50112388](./cc-viewer-alignment-commit-ledger.md#commit-5e50112388) — fix(server+web): server-side auto-approve countdown for plan/perm approvals

提交时间：2026-10-27T23:47:58+08:00。

````text
fix(server+web): server-side auto-approve countdown for plan/perm approvals

Move the auto-approve countdown from the client to the server: armed from
request arrival at the user's setting (server fires at N+1s as the no-client
fallback), so approvals proceed even when no browser is open, the tab is
backgrounded, or the WS dropped. Client cancel (new perm-hook-auto-cancel;
sdk-plan-auto-cancel now really cancels server-side) destroys the server
timer and keeps the request pending for a manual decision; replay frames
carry the server deadline (autoApproveAt) and cancelled state so reconnects
show the remaining time instead of restarting a full countdown; client
countdowns are wall-clock driven (no background-tab stall).

Safety floors: npm publish and unattended scheduled-task runs are exempt
from server-side auto-approve (always wait for a human / 5-min timeout).
PTY plans (keystroke injection) stay client-side.

Also fix intermittent non-approval bugs: WS-open re-arm, replay carrying
remaining time, durable cancellation, missing instanceKey on SDK perm/ask
frames, and sdk-plan-answer only broadcasting resolved on a real resolve.
````

<a id="message-15751cf49c"></a>
## [15751cf49c](./cc-viewer-alignment-commit-ledger.md#commit-15751cf49c) — chore(server): kimi-k3 preset forbids unrequested real-environment verification

提交时间：2026-10-27T23:47:58+08:00。

````text
chore(server): kimi-k3 preset forbids unrequested real-environment verification

Add a one-line rule to the built-in kimi-k3 system prompt preset:
"Do not schedule real-environment verification (deploy checks, live E2E,
manual smoke runs) unless the user explicitly asks — it burns tokens for
little signal." Placed right after the "Deliver exactly what was asked"
rule so it reads as a concrete instance of that boundary.

Coverage: system-prompt-snapshots.test.js.
````

<a id="message-1e0edc00f3"></a>
## [1e0edc00f3](./cc-viewer-alignment-commit-ledger.md#commit-1e0edc00f3) — fix(web): inline queue send-now chip and clear placeholder on dispatch

提交时间：2026-10-27T23:47:58+08:00。

````text
fix(web): inline queue send-now chip and clear placeholder on dispatch

Move the "追加中…" chip into the user bubble's label row right after the
timestamp via a new ChatMessage labelSuffix slot, replacing the standalone
status div below the bubble.

Fix the placeholder sticking until browser refresh: when the server has
accepted the dispatch and removed the item from the queue-state snapshot,
drop the optimistic placeholder immediately (new terminal rule
dispatchingSeen && !queueItem). Scan all displayed sessions for text
acknowledgement and aggregate the baseline across the same set so a prompt
echo landing outside the last session still clears the placeholder. Add a
bounded 30s client-side sweep to cover the silent server rejection paths.

Coverage: optimistic-queue-message.test.js, optimistic-queue-chat.test.js,
queue-bubbles.test.js.
````

<a id="message-566ade13fc"></a>
## [566ade13fc](./cc-viewer-alignment-commit-ledger.md#commit-566ade13fc) — feat(web): open CLAUDE.md and skill folders

提交时间：2026-10-27T23:47:58+08:00。

````text
feat(web): open CLAUDE.md and skill folders
````

<a id="message-67226f50c1"></a>
## [67226f50c1](./cc-viewer-alignment-commit-ledger.md#commit-67226f50c1) — Merge pull request #163 from weiesky/fix/file-browser-view-scope

提交时间：2026-10-27T23:49:53+08:00。

````text
Merge pull request #163 from weiesky/fix/file-browser-view-scope

fix(server+web): server-side auto-approve countdown for plan/perm approvals
````

<a id="message-3e4f1064c2"></a>
## [3e4f1064c2](./cc-viewer-alignment-commit-ledger.md#commit-3e4f1064c2) — chore(release): 1.9.16

提交时间：2026-10-27T23:50:36+08:00。

````text
chore(release): 1.9.16
````

<a id="message-3d65bedcd1"></a>
## [3d65bedcd1](./cc-viewer-alignment-commit-ledger.md#commit-3d65bedcd1) — fix(web): keep the composer blood bar visible when the SDK scratch terminal opens

提交时间：2026-10-29T17:12:47+08:00。

````text
fix(web): keep the composer blood bar visible when the SDK scratch terminal opens

In SDK mode terminalVisible mirrors scratchOpen, but the blood-bar portal host
(ctxBarSlot) was gated on a bare !terminalVisible while the composer early return
already exempted sdkMode. Opening the scratch terminal unmounted the slot, so
AppHeader's createPortal lost its target and the blood bar disappeared. Gate the
slot with the same predicate as the early return; PTY mode still migrates the bar
to the terminal toolbar. Adds a source-contract regression test.
````

<a id="message-7a75e1be81"></a>
## [7a75e1be81](./cc-viewer-alignment-commit-ledger.md#commit-7a75e1be81) — feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser

提交时间：2026-10-29T17:14:03+08:00。

````text
feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser

The target-mode FileBrowserModal was fully read-only, so right-click fell through
to the browser's native menu. Wire the same shared context menu used by the
project explorer (reveal / open-in-terminal / new file / new folder / copy path /
copy relative path / rename / delete) and enable inline preview editing.

Server: new /api/target-* write routes resolve the navigation root from the
target identity server-side (admin + same-origin before the body is read), with
realpath containment, symlink refusal and an isWriteAllowed write policy
(~/.claude credentials, sensitive-prefix dirs, LOG_DIR, config backups);
rename and recursive delete both scan the subtree so a denylisted entry cannot be
moved or wiped. OS reveal/terminal logic is shared via lib/os-open.js between the
project and target routes. Drag/upload/move stay read-only.
````

<a id="message-282306a950"></a>
## [282306a950](./cc-viewer-alignment-commit-ledger.md#commit-282306a950) — fix(web): SDK-mode plan approval uses the plan card modal

提交时间：2026-10-29T20:19:39+08:00。

````text
fix(web): SDK-mode plan approval uses the plan card modal

ExitPlanMode approval in SDK mode reused the bottom permission-styled
ToolApprovalPanel, making plan review look like a permission prompt.
It now reuses the PTY planModeBox card portaled into the global
ApprovalModal (Approve / Approve-with-edits / Reject + countdown),
fully separated from permission approval. The bottom plan panel is
removed on desktop and mobile; resolution still goes through
sdk-plan-answer unchanged and PTY keystrokes stay hard-gated on !sdkMode.

Correctness fixes surfaced by review:
- Rebuild the message list when pendingPlanApproval changes so the card
  becomes interactive and flips to approved/rejected (the modal no longer
  opens with an empty body).
- Tick the countdown on the card by cloning the cached card element prop
  and comparing it in ChatMessage.shouldComponentUpdate.
- Add a ptyPlan fallback body (PlanApprovalForm) to ApprovalModal so the
  plan modal is actionable even when the transcript card has not portaled
  in yet (frame-before-transcript, synthetic toolUseID, scheduled-task).
- Merge the two onPendingPtyPlan writers into one id-keyed derived entry
  and persist dismissals across WS replays (only clear on a real id change).

Remove the now-dead ToolApprovalPanel plan branch and the
onPlanAutoApproveCountdown channel; drop the dead plan-panel test and
refresh sdk-plan-approval-guard / plan-auto-approve-runtime coverage.
````

<a id="message-ebfcbaec0d"></a>
## [ebfcbaec0d](./cc-viewer-alignment-commit-ledger.md#commit-ebfcbaec0d) — fix(web): hide Last Response when it duplicates the last assistant turn

提交时间：2026-10-29T22:44:02+08:00。

````text
fix(web): hide Last Response when it duplicates the last assistant turn

When the final turn is echoed into both session.messages (last assistant
bubble) and session.response.body.content (the Last-Response block), the
reply renders twice. Hide the whole LR block only when it is provably the
same turn (trimmed joined text equal AND tool_use id sequence equal) and the
LR owns no pending interaction the messages side does not render.
````

<a id="message-1600211658"></a>
## [1600211658](./cc-viewer-alignment-commit-ledger.md#commit-1600211658) — chore(release): 1.9.17

提交时间：2026-10-30T00:20:58+08:00。

````text
chore(release): 1.9.17
````

<a id="message-208f134827"></a>
## [208f134827](./cc-viewer-alignment-commit-ledger.md#commit-208f134827) — fix(server+web): fork review fixes for 1.9.17 — new-file save 403, plan modal reopen, fallback countdown

提交时间：2026-10-30T14:14:30+08:00。

````text
fix(server+web): fork review fixes for 1.9.17 — new-file save 403, plan modal reopen, fallback countdown
````

<a id="message-84e65cddc6"></a>
## [84e65cddc6](./cc-viewer-alignment-commit-ledger.md#commit-84e65cddc6) — fix(server+web): judge stuck SDK turns by activity probe, restore approvals on attach, keep Stop visible on long turns

提交时间：2026-10-31T03:44:00+08:00。

````text
fix(server+web): judge stuck SDK turns by activity probe, restore approvals on attach, keep Stop visible on long turns
````

<a id="message-cdf05bf8ee"></a>
## [cdf05bf8ee](./cc-viewer-alignment-commit-ledger.md#commit-cdf05bf8ee) — feat(server+web): inline 502/network retry feedback with progress and a manual resume-retry affordance

提交时间：2026-10-31T03:44:09+08:00。

````text
feat(server+web): inline 502/network retry feedback with progress and a manual resume-retry affordance
````

<a id="message-77b61bd571"></a>
## [77b61bd571](./cc-viewer-alignment-commit-ledger.md#commit-77b61bd571) — fix(server+web): resilient sends, approval-hook timeout, SSE slow reconnect, off-mode stream idle watchdog

提交时间：2026-10-31T03:44:17+08:00。

````text
fix(server+web): resilient sends, approval-hook timeout, SSE slow reconnect, off-mode stream idle watchdog
````

<a id="message-7039adeec3"></a>
## [7039adeec3](./cc-viewer-alignment-commit-ledger.md#commit-7039adeec3) — chore(release): 1.9.18

提交时间：2026-10-31T03:46:26+08:00。

````text
chore(release): 1.9.18
````

<a id="message-08809f6e69"></a>
## [08809f6e69](./cc-viewer-alignment-commit-ledger.md#commit-08809f6e69) — perf(web): incremental scan in ToolFileChangeController.check (#164)

提交时间：2026-11-02T14:19:28+08:00。

````text
perf(web): incremental scan in ToolFileChangeController.check (#164)

* fix(server): close two first-turn SDK rendering failures

Two independent server-side fixes that each stalled rendering on the
first turn of a fresh `ccv --sdk`:

1. Lost-result backstop no longer swallows the NEXT turn's result.
   The v1.9.18 lost-result backstop force-settled a turn via a
   _lateResultTombstones counter that only reset on teardown/reset —
   never on the next _startTurn. When the result truly never arrived,
   the stale count swallowed the next turn's normal result (no FIFO
   shift, no turn_end), so that turn was then mis-settled as turn-stuck
   too. Replaced with a generation guard: a force-settled turn records
   its epoch and a late result is discarded only when no live turn can
   own it; a newer turn's result pairs normally and the stale debt is
   dropped. The api_retry gate is now epoch-aware and the debt is
   cleared at session boundaries (death/teardown/reset) so a stale debt
   can no longer suppress a live turn's retry frames.

2. SSE cold-load window no longer loses live deltas. serveEventStream
   deliberately registers the client only after the cold history (an
   anti-flicker invariant), but live deltas landing in that window were
   neither in the snapshot nor broadcast, and never replayed — the first
   turn of a fresh session fell into it and stalled until refresh. An
   attach buffer now registers a view-stamped buffer proxy during the
   cold load, queues the owed deltas, and replays them after load_end
   before swapping in the real client; v3_conv replays are deduped
   against the cold bundle's conv coverage (client conv replay is not
   idempotent), and torn lines are never counted as covered.

Includes multi-reviewer code-review fixes: api_retry gate, tarball
baseline sync, overflow logging, torn-line coverage, English comments,
and new regression tests.

Coverage: sdk-manager-lost-result.test.js, sse-attach-buffer.test.js,
events-attach-buffer.test.js, v2-meta-rows.test.js.

* fix(web): keep minimised SDK ask modal minimised across view-switch

A view-switch clears pendingAsk (id→null), which the dismissal-wipe
policy treated as a genuine clear and wiped the minimise; the attach
full replay then re-bubbled the same id via null→id, but the dismissal
was already gone so the modal reopened. Tag the view-switch synthetic
clear with reason: 'view-switch' so the wipe policy skips it (a real
id→null clear still wipes). ask and ptyPlan share the same policy and
are both fixed.

Coverage: approval-dismissal.test.js

* fix(web): hide SDK error row while its retry is recovering

A manual [retry] marked the failed row 'recovering' but only swapped the
[retry] button for an inline 'recovering' tag — the error text still
rendered in full, appearing in parallel with the top recovering progress
line. Now a recovering row is hidden entirely and only the progress line
shows; the row reappears only when the retry fails (recovering reset) and
is cleared on success. Removed the now-unreferenced .sdkRetryRecovering
style.

Coverage: sdk-retry-inline.test.js

* style(web): cap SDK error bar width at 800px

The error / retry-progress bar previously spanned the full 1400px message
column on wide viewports. Cap it at 800px (sides breathe with the viewport)
and keep a 20px-per-side floor below 800px via calc(100% - 40px). Covers
both the Virtuoso footer and the empty-state branch via .sdkErrorStack.

Coverage: sdk-error-dialogue.test.js

* feat(web): open file content directly on tree click in file browser

The grid double-click already opened files (openItem: directory → navigate,
file → html/image/content preview), but a single click on a tree file row
only selected it. Now clicking an openable file in the tree shows its
content directly while keeping the row selection highlight; clicking a
directory still expands the right pane as before.

Coverage: file-browser-modal.test.js

* style(web): drop author name from GIT changes commit rows

Each commit row no longer renders the author, leaving more room for the
commit subject. Hash / subject / time / line-stat badges are unchanged;
the author field still comes back from the server, it is just no longer
rendered.

* feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界

- 活性信号: SDK 消息流按 ≤1/s 合并为 sdk-session-state 活性帧(heartbeat+activity),
  覆盖代理层看不见的工具/压缩/子代理阶段; 零额外子进程 IPC(未启用 includePartialMessages)
- Turn 关联: sdk-session-state 携带 turnId + 墙钟 turnStartedAt; 服务端丢弃 head 回合
  未被 CLI 确认 running 的迟到 idle(承重门控), 前端按 epoch 守卫丢弃传输重排的旧帧;
  lost-result 兜底在 armed 后有新活动时 disarm(缓解「新回合 running 先于旧 idle」误判)
- 权威 loopEnd: 新增 agent_loop_start/agent_loop_end SSE 帧; SDK 从真 result(过滤
  task-notification 伪 result)即时发出、绕过防抖; PTY 从 UserPromptSubmit 上升沿/打断、
  _emitTurnEnd(防抖后)发出, 两模式统一; 修复伪 result 幻影 turn_end
- spinner 即亮: prompt/push 即刻点亮, 不等首个 API 调用
- 语音播报: 新增 agentLoopStart/agentLoopEnd 事件(默认关闭, 18 语言); loopEnd 复用各包
  turnEnd 录音, loopStart 为新生成短提示音; 按 turnId 去重, 实际播放后抑制同边界 turnEnd 语音
- 插件: 新增 onAgentLoopStart/onAgentLoopEnd parallel hook(PTY+SDK 双路径同点触发);
  service 插件 ctx.events.on 增加 agent_loop_start/agent_loop_end
- 修复 review 发现: approval pending 时探针永久失效(补 rearm 闭环); teardown/close 路径
  补发 session-ended loop end; SDK 依赖下限 ^0.2.91→^0.2.124(result.origin 需要)

Coverage: sdk-agent-loop.test.js, agent-loop-server-events.test.js, agent-loop-voice.test.js,
sdk-session-state.test.js, plugin-runtime.test.js, voice-pack-events.test.js,
voice-pack-manager.test.js, turn-active-gating.test.js, stop-button-turn-active.test.js

* fix(server): live-refresh new message in a resumed history project (SDK mode)

A history session dir re-attached by the live feed was seeded with
suppressExisting, swallowing any bytes already on disk at attach time
(offsets advanced, never re-read) — the conversation view stayed frozen on
the preloaded history until a cold reload. Cap the suppressed seed at the
feed's last-observed byte watermark and read anything past it live.

Coverage: v2-live-feed.test.js.

* perf(web): incremental scan in ToolFileChangeController.check

check() re-traversed every message of every session AND every request's
body.messages twice (collect tool_use, then scan tool_result) on every SSE
tick. In a long conversation each request.body.messages is the full
accumulated prefix, so the sum is O(context^2) and runs regardless of which
session is shown — hence the long stall when sending into a long-context
view, even for a brand-new session.

Switch to WeakMap<object, scannedMessageCount> cursors: only scan messages
appended since the last check, re-scanning the tail entry to catch streaming
block merges; keep the tool_use map persistent across calls so a tool_result
never loses its tool_use (no missed file-refresh). ChatView calls
resetCursors() on a genuine session-list change (cold load / switch) to
rebuild from scratch.

Coverage: tool-file-change-controller.test.js

---------

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-082673509e"></a>
## [082673509e](./cc-viewer-alignment-commit-ledger.md#commit-082673509e) — Revert "perf(web): incremental scan in ToolFileChangeController.check (#164)"

提交时间：2026-11-02T14:30:54+08:00。

````text
Revert "perf(web): incremental scan in ToolFileChangeController.check (#164)"

This reverts commit 08809f6e69315476690c62bbe238bd5c199b338d.
````

<a id="message-bd32d02884"></a>
## [bd32d02884](./cc-viewer-alignment-commit-ledger.md#commit-bd32d02884) — fix(server): live-refresh new message in a resumed history project (SDK mode)

提交时间：2026-11-02T14:34:52+08:00。

````text
fix(server): live-refresh new message in a resumed history project (SDK mode)

A history session dir re-attached by the live feed was seeded with
suppressExisting, swallowing any bytes already on disk at attach time
(offsets advanced, never re-read) — the conversation view stayed frozen on
the preloaded history until a cold reload. Cap the suppressed seed at the
feed's last-observed byte watermark and read anything past it live.

Coverage: v2-live-feed.test.js.
````

<a id="message-ef5fc8b168"></a>
## [ef5fc8b168](./cc-viewer-alignment-commit-ledger.md#commit-ef5fc8b168) — feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界

提交时间：2026-11-02T14:34:52+08:00。

````text
feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界

- 活性信号: SDK 消息流按 ≤1/s 合并为 sdk-session-state 活性帧(heartbeat+activity),
  覆盖代理层看不见的工具/压缩/子代理阶段; 零额外子进程 IPC(未启用 includePartialMessages)
- Turn 关联: sdk-session-state 携带 turnId + 墙钟 turnStartedAt; 服务端丢弃 head 回合
  未被 CLI 确认 running 的迟到 idle(承重门控), 前端按 epoch 守卫丢弃传输重排的旧帧;
  lost-result 兜底在 armed 后有新活动时 disarm(缓解「新回合 running 先于旧 idle」误判)
- 权威 loopEnd: 新增 agent_loop_start/agent_loop_end SSE 帧; SDK 从真 result(过滤
  task-notification 伪 result)即时发出、绕过防抖; PTY 从 UserPromptSubmit 上升沿/打断、
  _emitTurnEnd(防抖后)发出, 两模式统一; 修复伪 result 幻影 turn_end
- spinner 即亮: prompt/push 即刻点亮, 不等首个 API 调用
- 语音播报: 新增 agentLoopStart/agentLoopEnd 事件(默认关闭, 18 语言); loopEnd 复用各包
  turnEnd 录音, loopStart 为新生成短提示音; 按 turnId 去重, 实际播放后抑制同边界 turnEnd 语音
- 插件: 新增 onAgentLoopStart/onAgentLoopEnd parallel hook(PTY+SDK 双路径同点触发);
  service 插件 ctx.events.on 增加 agent_loop_start/agent_loop_end
- 修复 review 发现: approval pending 时探针永久失效(补 rearm 闭环); teardown/close 路径
  补发 session-ended loop end; SDK 依赖下限 ^0.2.91→^0.2.124(result.origin 需要)

Coverage: sdk-agent-loop.test.js, agent-loop-server-events.test.js, agent-loop-voice.test.js,
sdk-session-state.test.js, plugin-runtime.test.js, voice-pack-events.test.js,
voice-pack-manager.test.js, turn-active-gating.test.js, stop-button-turn-active.test.js
````

<a id="message-7797672148"></a>
## [7797672148](./cc-viewer-alignment-commit-ledger.md#commit-7797672148) — style(web): drop author name from GIT changes commit rows

提交时间：2026-11-02T14:34:52+08:00。

````text
style(web): drop author name from GIT changes commit rows

Each commit row no longer renders the author, leaving more room for the
commit subject. Hash / subject / time / line-stat badges are unchanged;
the author field still comes back from the server, it is just no longer
rendered.
````

<a id="message-dd23ce8df1"></a>
## [dd23ce8df1](./cc-viewer-alignment-commit-ledger.md#commit-dd23ce8df1) — feat(web): open file content directly on tree click in file browser

提交时间：2026-11-02T14:34:52+08:00。

````text
feat(web): open file content directly on tree click in file browser

The grid double-click already opened files (openItem: directory → navigate,
file → html/image/content preview), but a single click on a tree file row
only selected it. Now clicking an openable file in the tree shows its
content directly while keeping the row selection highlight; clicking a
directory still expands the right pane as before.

Coverage: file-browser-modal.test.js
````

<a id="message-88995a1046"></a>
## [88995a1046](./cc-viewer-alignment-commit-ledger.md#commit-88995a1046) — style(web): cap SDK error bar width at 800px

提交时间：2026-11-02T14:34:52+08:00。

````text
style(web): cap SDK error bar width at 800px

The error / retry-progress bar previously spanned the full 1400px message
column on wide viewports. Cap it at 800px (sides breathe with the viewport)
and keep a 20px-per-side floor below 800px via calc(100% - 40px). Covers
both the Virtuoso footer and the empty-state branch via .sdkErrorStack.

Coverage: sdk-error-dialogue.test.js
````

<a id="message-ee3545344e"></a>
## [ee3545344e](./cc-viewer-alignment-commit-ledger.md#commit-ee3545344e) — fix(web): hide SDK error row while its retry is recovering

提交时间：2026-11-02T14:34:52+08:00。

````text
fix(web): hide SDK error row while its retry is recovering

A manual [retry] marked the failed row 'recovering' but only swapped the
[retry] button for an inline 'recovering' tag — the error text still
rendered in full, appearing in parallel with the top recovering progress
line. Now a recovering row is hidden entirely and only the progress line
shows; the row reappears only when the retry fails (recovering reset) and
is cleared on success. Removed the now-unreferenced .sdkRetryRecovering
style.

Coverage: sdk-retry-inline.test.js
````

<a id="message-469a995ad8"></a>
## [469a995ad8](./cc-viewer-alignment-commit-ledger.md#commit-469a995ad8) — fix(web): keep minimised SDK ask modal minimised across view-switch

提交时间：2026-11-02T14:34:52+08:00。

````text
fix(web): keep minimised SDK ask modal minimised across view-switch

A view-switch clears pendingAsk (id→null), which the dismissal-wipe
policy treated as a genuine clear and wiped the minimise; the attach
full replay then re-bubbled the same id via null→id, but the dismissal
was already gone so the modal reopened. Tag the view-switch synthetic
clear with reason: 'view-switch' so the wipe policy skips it (a real
id→null clear still wipes). ask and ptyPlan share the same policy and
are both fixed.

Coverage: approval-dismissal.test.js
````

<a id="message-7641f5181a"></a>
## [7641f5181a](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a) — fix(server): close two first-turn SDK rendering failures

提交时间：2026-11-02T14:34:52+08:00。

````text
fix(server): close two first-turn SDK rendering failures

Two independent server-side fixes that each stalled rendering on the
first turn of a fresh `ccv --sdk`:

1. Lost-result backstop no longer swallows the NEXT turn's result.
   The v1.9.18 lost-result backstop force-settled a turn via a
   _lateResultTombstones counter that only reset on teardown/reset —
   never on the next _startTurn. When the result truly never arrived,
   the stale count swallowed the next turn's normal result (no FIFO
   shift, no turn_end), so that turn was then mis-settled as turn-stuck
   too. Replaced with a generation guard: a force-settled turn records
   its epoch and a late result is discarded only when no live turn can
   own it; a newer turn's result pairs normally and the stale debt is
   dropped. The api_retry gate is now epoch-aware and the debt is
   cleared at session boundaries (death/teardown/reset) so a stale debt
   can no longer suppress a live turn's retry frames.

2. SSE cold-load window no longer loses live deltas. serveEventStream
   deliberately registers the client only after the cold history (an
   anti-flicker invariant), but live deltas landing in that window were
   neither in the snapshot nor broadcast, and never replayed — the first
   turn of a fresh session fell into it and stalled until refresh. An
   attach buffer now registers a view-stamped buffer proxy during the
   cold load, queues the owed deltas, and replays them after load_end
   before swapping in the real client; v3_conv replays are deduped
   against the cold bundle's conv coverage (client conv replay is not
   idempotent), and torn lines are never counted as covered.

Includes multi-reviewer code-review fixes: api_retry gate, tarball
baseline sync, overflow logging, torn-line coverage, English comments,
and new regression tests.

Coverage: sdk-manager-lost-result.test.js, sse-attach-buffer.test.js,
events-attach-buffer.test.js, v2-meta-rows.test.js.
````

<a id="message-0cbb545288"></a>
## [0cbb545288](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) — perf(web): incremental scan in ToolFileChangeController.check

提交时间：2026-11-02T14:36:20+08:00。

````text
perf(web): incremental scan in ToolFileChangeController.check

check() re-traversed every message of every session AND every request's
body.messages twice (collect tool_use, then scan tool_result) on every SSE
tick. In a long conversation each request.body.messages is the full
accumulated prefix, so the sum is O(context^2) and runs regardless of which
session is shown — hence the long stall when sending into a long-context
view, even for a brand-new session.

Switch to WeakMap<object, scannedMessageCount> cursors: only scan messages
appended since the last check, re-scanning the tail entry to catch streaming
block merges; keep the tool_use map persistent across calls so a tool_result
never loses its tool_use (no missed file-refresh). ChatView calls
resetCursors() on a genuine session-list change (cold load / switch) to
rebuild from scratch.

Coverage: tool-file-change-controller.test.js
````

<a id="message-1d4ea6e192"></a>
## [1d4ea6e192](./cc-viewer-alignment-commit-ledger.md#commit-1d4ea6e192) — Merge pull request #165 from weiesky/fix/tool-file-monitor-incremental

提交时间：2026-11-02T14:51:28+08:00。

````text
Merge pull request #165 from weiesky/fix/tool-file-monitor-incremental

perf(web): incremental scan in ToolFileChangeController.check
````

<a id="message-66bfeb8c18"></a>
## [66bfeb8c18](./cc-viewer-alignment-commit-ledger.md#commit-66bfeb8c18) — chore(release): 1.9.19

提交时间：2026-11-02T14:54:00+08:00。

````text
chore(release): 1.9.19
````

<a id="message-c29af25e64"></a>
## [c29af25e64](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) — fix(server+web): upstream v1.9.19 review — file-tree path, convSeqs single pass, toolUseMap LRU trim, approval guards

提交时间：2026-11-02T18:52:18+08:00。

````text
fix(server+web): upstream v1.9.19 review — file-tree path, convSeqs single pass, toolUseMap LRU trim, approval guards
````

<a id="message-c0c13bbc86"></a>
## [c0c13bbc86](./cc-viewer-alignment-commit-ledger.md#commit-c0c13bbc86) — chore(star-history): refresh chart [skip ci]

提交时间：2026-11-02T11:01:12+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-99256ac1d8"></a>
## [99256ac1d8](./cc-viewer-alignment-commit-ledger.md#commit-99256ac1d8) — fix(web): --sdk mode mobile terminal renders the scratch multi-tab shell

提交时间：2026-11-03T02:25:23+08:00。

````text
fix(web): --sdk mode mobile terminal renders the scratch multi-tab shell

The Mobile overlay used to mount the main-PTY TerminalPanel, which is inert in
SDK mode (server drops input/resize), and the scratchOnly branch hid its tab UI
behind a phone gate — phones got a blank xterm with a dead keybar.

- Mobile overlay mounts the scratchOnly panel in sdkMode (key-forced remount,
  overlay is the only mobile host incl. iPad)
- ChatView suppresses its embedded terminal block on the whole Mobile tree
  (both modes): no double scratch mount in SDK, no zoom-scaled resize stealing
  in PTY mode
- scratchOnly branch renders on phones: horizontal tab rail via the JS-driven
  scratchOnlyPhone modifier (shared with aria-orientation), bottom virtual
  keybar routed to the active tab's /ws/terminal-scratch socket, 44px touch
  targets, sticky add button, active tab scrolled into view
- ScratchTerminal phone adaptations: fixed 60-col layout measuring the
  container (soft-keyboard reflow via visualViewport), touch scroll, bounded
  sizing retry, full unmount cleanup; sendVirtualKey keeps the keyboard open
  (shell keys fire mid-command)
- Shared utils: mobileTermLayout (sizing, isAlive dispose guard,
  reportSwallowed) and mobileTouchScroll (touch scroll, touchcancel +
  dispose-safe scrollLines), replacing two verbatim copies
- Tests: mobile-term-layout + mobile-touch-scroll unit tests; strengthened
  scratch-workspace-switch anchors (call-site assertions, lifecycle slices)
````

<a id="message-6b340326c6"></a>
## [6b340326c6](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6) — feat(sdk): slow-upstream in-flight advisory

提交时间：2026-11-03T23:05:10+08:00。

````text
feat(sdk): slow-upstream in-flight advisory

When a non-utility LLM request waits past the slow threshold for any
upstream byte, proxy.js emits through a proxy-stats listener; server.js
(which already legally holds the SDK accessors and the terminal WS) then
broadcasts a workspace-scoped sdk-slow-upstream frame and the frontend
toasts a persistent "model slow, still waiting" notice. Utility probes
are exempt; PTY/proxy-only processes are a zero-cost no-op.

Closes the dead-silence gap where one request hung 164s with zero UI
feedback — the CLI only retries a settled failure and the proxy only
retries a settled response, so both layers are legitimately idle while
the user just stares at a spinner.
````

<a id="message-2ea5181df8"></a>
## [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8) — fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2

提交时间：2026-11-03T23:05:11+08:00。

````text
fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2

Slow-upstream advisory:
- Toast gets a 90s bounded fallback and is destroyed on workspace
  switch / unmount, so a lost resolved frame can never pin it forever (P1).
- Track pending slow requests by requestId so concurrent requests do not
  clobber one shared toast; a resolve only clears its own (P2).
- waitingMs now ticks client-side every 5s instead of freezing at the
  30s emit threshold (P2).
- Server cwd fallback only applies when no instance was reported, so
  scheduled-task ephemeral sessions are not misread as foreground waits (P2).
- The slow timer now runs until the first BODY chunk, not headers (P2).

Composer: pad-mode max-height raised to 268px (12 lines); the JS clamp no
longer subtracts padding that border-box already includes (P2).

sdkTaskTracker: workspace-owner awareness (view switch no longer shows the
previous project's checklist) + reset a new batch when task_started arrives
with all tasks terminal (P2).

Teammate.md: drop TeamCreate/TeamDelete references across 18 locales x2
trees (the tools do not exist) + a negative-assertion test (P2).

mobileTouchScroll: refresh the touch anchor on multi-touch so the
multi→single-finger transition no longer jumps the viewport (P2).
````

<a id="message-d90ac9587d"></a>
## [d90ac9587d](./cc-viewer-alignment-commit-ledger.md#commit-d90ac9587d) — fix(web): render blank-whitespace text as no bubble instead of empty chat-boxer

提交时间：2026-11-03T23:05:11+08:00。

````text
fix(web): render blank-whitespace text as no bubble instead of empty chat-boxer

A whitespace-only text block ('   ', '\n\n') is truthy, so it passes the
if (tb.text)/if (!block.text) guards in both shared render paths, yet
renderAssistantText parses it to zero segments. The wrapper
<div className="chat-boxer"> is still created unconditionally, and
.chat-boxer has background/border/padding even with no children, so it
renders as a visible empty bubble. Main messages hide this because
ChatView pre-filters blank text via isSystemText; SubAgent/Teammate
respContent is passed through unfiltered, so the blank bubble surfaces
there.

Fix at the shared render layer: in both the legacy and the web-search
in-order paths, skip when renderAssistantText yields zero segments before
creating the chat-boxer. This covers Main/SubAgent/TeamSessionPanel/
Last Response/merged run at once, and a legal empty system-tag (a
non-empty system-tag segment) is not over-deleted.
````

<a id="message-92ed9bc751"></a>
## [92ed9bc751](./cc-viewer-alignment-commit-ledger.md#commit-92ed9bc751) — fix(content): unify UltraReview prompt to the TeamCreate-free version

提交时间：2026-11-03T23:05:11+08:00。

````text
fix(content): unify UltraReview prompt to the TeamCreate-free version

The codeExpert review block now reads "build a team via the Agent tool
(teammates are named, subagents are not) → multi-role review → fix P0/P1
and evaluate P2 dialectically → close by notifying each teammate to exit",
replacing the stale "adopt P0/P1, discard P2/P3, TeamCreate/TeamDelete"
wording. Also drop the lingering `TeamCreate` reference from the
scoped-instruction tool list in the codeExpert/customContent templates and
the CustomUltraplanExpert embedded prompt (the tool does not exist), and
switch the pre-req to "recursively locate the .git directory".

Aligned across all 18 locales of UltraPlan.md / CustomUltraplanExpert.md,
code-expert.json, ultraplanTemplates.js, and the i18n customContent prefill
skeleton; ultraplan-origin.md rewritten wholesale to the new version.

Coverage: ultraplan-templates.test.js, builtin-presets.test.js.
````

<a id="message-791a5e18f8"></a>
## [791a5e18f8](./cc-viewer-alignment-commit-ledger.md#commit-791a5e18f8) — feat(web): raise chat composer max height from 6 to 12 lines

提交时间：2026-11-03T23:05:11+08:00。

````text
feat(web): raise chat composer max height from 6 to 12 lines

The composer autosize clamp (MAX_LINES) and its matching desktop CSS
max-height go from 6 to 12 lines (content 126px→252px, box 136px→268px),
so longer drafted messages stay visible instead of scrolling early.
Mobile is unchanged (legacy 160px whole-box path).
````

<a id="message-0cde7d1df8"></a>
## [0cde7d1df8](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8) — feat(web): SDK mode task checklist HUD via sdk-task WS relay

提交时间：2026-11-03T23:05:11+08:00。

````text
feat(web): SDK mode task checklist HUD via sdk-task WS relay

--sdk mode: TaskProgressHud now works. New sdkTaskTracker consumes
server-relayed WS sdk-task frames (task_started/progress/updated/
notification), merges them client-side into taskStore-compatible
snapshots, and feeds the existing HUD.

Key behaviors:
- _sdkFrameMatchesView guard on the sdk-task WS branch (ChatView)
- Session-boundary reset: new sessionId clears stale tasks
- task_started re-fire resets status to in_progress (id reuse safe)
- task_progress reads frame.description (not summary) for subject
- STATUS_MAP uses Map to avoid prototype-chain lookups
- Comments updated in TaskProgressHud/ChatView to reflect SDK path
- PTY mode unaffected (sdk-task frames only exist in SDK mode)

Coverage: sdkTaskTracker.test.js (22 tests)
````

<a id="message-b01ff6f502"></a>
## [b01ff6f502](./cc-viewer-alignment-commit-ledger.md#commit-b01ff6f502) — test(server): stabilize slow-upstream advisory test (CI flake)

提交时间：2026-11-03T23:32:38+08:00。

````text
test(server): stabilize slow-upstream advisory test (CI flake)

The `waitingMs >= 40` assertion was timing-sensitive: on a slow CI runner
the 200ms mock fetch can land before the assertion reads the captured
frame, shrinking the measured wait below the threshold and failing
spuriously (PR #166 CI). Relax it to assert waitingMs is a positive
number and add the requestId linkage assertions the feature now provides.

Also expose the proxy server on the __testing seam and close it in the
suite's after() so the listener doesn't linger (a long-standing teardown
gap; the remaining StatWatcher/dispatcher handles are a pre-existing
baseline issue, not introduced here).
````

<a id="message-14d85f8ce6"></a>
## [14d85f8ce6](./cc-viewer-alignment-commit-ledger.md#commit-14d85f8ce6) — Merge pull request #166 from weiesky/release/slow-hud-cr-fixes

提交时间：2026-11-03T23:36:54+08:00。

````text
Merge pull request #166 from weiesky/release/slow-hud-cr-fixes

feat(sdk+web): slow-upstream advisory, SDK task HUD, UltraReview cleanup, composer & blank-bubble fixes
````

<a id="message-fd84486429"></a>
## [fd84486429](./cc-viewer-alignment-commit-ledger.md#commit-fd84486429) — chore(release): 1.9.20

提交时间：2026-11-03T23:38:20+08:00。

````text
chore(release): 1.9.20
````

<a id="message-a09bc713ea"></a>
## [a09bc713ea](./cc-viewer-alignment-commit-ledger.md#commit-a09bc713ea) — Merge pull request #167 from weiesky/chore/release-1.9.20

提交时间：2026-11-03T23:42:37+08:00。

````text
Merge pull request #167 from weiesky/chore/release-1.9.20

chore(release): 1.9.20
````

<a id="message-a3cc12619f"></a>
## [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) — fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2

提交时间：2026-11-04T03:12:45+08:00。

````text
fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2

P1-1: the toast revived ~5s after a view/instance switch and never cleared.
message.destroy alone was insufficient — the 5s tick re-opened it while
_slowUpstreamPending was non-empty, and the old view's resolved frame is
dropped by _sdkFrameMatchesView. Introduce _clearSlowUpstreamToast (stop tick
+ clear pending + destroy) and call it from the shared
viewSwitched/planLostView/instanceTransition block and componentWillUnmount;
drop the standalone destroy in the viewProject branch (which also missed pure
instance switches).

P1-2: markFirstByte was dead code — executeRequest resolves at headers and the
finally cleared the timer there, so behavior was time-to-headers despite the
comments. markFirstByte now emits resolved and clears the timer (wired to the
body stream's data/error/close), the finally is an error-path-only backstop,
and every terminal path (502, response.text(), no body) settles. New test
covers the headers-fast-then-stalled-body case the old body:null stub missed.

P2: server resolved falls back to the request's self-reported cwd/instanceKey
when the session already closed (was silently dropped); sdkTaskTracker resets
on viewed-workspace switch via AppBase (previous project's checklist no longer
lingers); mobile 60-column layout retry budget raised from 3 (~150ms) to ~2s
for the async WebGL renderer.
````

<a id="message-1bfc1585e8"></a>
## [1bfc1585e8](./cc-viewer-alignment-commit-ledger.md#commit-1bfc1585e8) — fix(web): persist --sdk scratch terminal open state across refresh

提交时间：2026-11-04T03:13:14+08:00。

````text
fix(web): persist --sdk scratch terminal open state across refresh

The SDK [终端] (scratch multi-tab terminal) lived only in App.state.scratchOpen
(default false) and was never persisted, so a page refresh always closed it —
unlike the PTY terminal, which merely defaults to `true` and so only appears
remembered.

Follow the existing global ccv_ panel-open convention (same as
ccv_fileExplorerOpen / ccv_gitChangesOpen): App initializes scratchOpen from
localStorage['ccv_scratchOpen'] and both toggle sites (header button + chat
right-edge chevron) route through a new _setScratchOpen that writes the key.
Global single value, default closed; deliberately not reusing the PTY panel's
nested cc-viewer-scratch-open key (a different surface, to avoid cross-mode
coupling).
````

<a id="message-ccf74880a5"></a>
## [ccf74880a5](./cc-viewer-alignment-commit-ledger.md#commit-ccf74880a5) — fix(web): render unmerged git status badges (UU/AA/DD/...) in red

提交时间：2026-11-04T12:16:31+08:00。

````text
fix(web): render unmerged git status badges (UU/AA/DD/...) in red
````

<a id="message-32165d3a0b"></a>
## [32165d3a0b](./cc-viewer-alignment-commit-ledger.md#commit-32165d3a0b) — chore(release): 1.9.21

提交时间：2026-11-04T12:34:40+08:00。

````text
chore(release): 1.9.21
````

<a id="message-7a0ba39edf"></a>
## [7a0ba39edf](./cc-viewer-alignment-commit-ledger.md#commit-7a0ba39edf) — test(app): deflake git + scheduled-task tests — poll async launch, retry rmSync cleanup

提交时间：2026-11-04T15:23:00+08:00。

````text
test(app): deflake git + scheduled-task tests — poll async launch, retry rmSync cleanup

- scheduled-task-scheduler: replace fixed setTimeout waits with waitFor polling
  for the fire-and-forget _launch broadcast (executor-error test raced on CI).
- git-integration + scheduled-task test files: add maxRetries/retryDelay to
  recursive rmSync cleanup — real git child processes linger past afterEach and
  intermittently threw ENOTEMPTY on teardown under parallel load.
````

<a id="message-b23c137372"></a>
## [b23c137372](./cc-viewer-alignment-commit-ledger.md#commit-b23c137372) — fix(logs): auto-shard oversized session logs by prompt count + manual per-shard load

提交时间：2026-11-05T18:45:17+08:00。

````text
fix(logs): auto-shard oversized session logs by prompt count + manual per-shard load

A session's main conversation past 2000 user prompts is archived into its own
parts/<N>/ subdir at a quiescent request boundary (no in-flight request, idle
write queue) — cutting at a whole user-prompt→loop boundary — and a fresh
skeleton keeps writing at the root. Journal seq stays continuous across shards;
the conversation store inherits count/fps/epoch so the first post-cut request
writes only its increment (no full-history snapshot rewrite). The session stays
ONE folder: copy/download/delete carry all of its history.

Cold load / startup now read only the latest shard; older shards load on demand
via a top "load earlier history" button that walks a seq cursor across shards
and prepends them. Fixes the 653MB-log startup freeze (the cold-load replay
parsed the whole dir into memory and stalled the event loop).

Coverage: v2-shard-manager.test.js, v2-shard-routes.test.js.
````

<a id="message-57c732d037"></a>
## [57c732d037](./cc-viewer-alignment-commit-ledger.md#commit-57c732d037) — feat(server): add CCV_BASE_URL for cloud reverse-proxy deployment

提交时间：2026-11-05T21:41:54+08:00。

````text
feat(server): add CCV_BASE_URL for cloud reverse-proxy deployment

One env var accepts host/path, /path, scheme://host/path, or //host/path
(ws/wss normalized to http/https). The extracted prefix drives the existing
base-path machinery (HTTP/WS strip, <base> injection, plugin mounts,
startup/QR URLs), matching both literal {token} segments and their
percent-encoded request forms; the bare prefix serves the app root. A host
is merged into the Host allowlist and used to build external links
(startup External line, auto-open, /api/local-url QR) with scheme
resolution explicit > X-Forwarded-Proto > https, always carrying ccv's
own ?token=. CCV_BASE_URL takes precedence over CCV_BASE_PATH; invalid
values fall back with a warning (4 new i18n keys x 18 locales).

Also fixes: password login page posting to an unprefixed endpoint behind
a prefix-preserving proxy; i18n interpolation re-substituting a {token}
path segment with the access token (now single-pass); plugin cookie Path
using the wire-encoded prefix.

Docs: docs/base-url.md / docs/base-url.zh.md (+ README x18 link).
````

<a id="message-ff0fe1ba93"></a>
## [ff0fe1ba93](./cc-viewer-alignment-commit-ledger.md#commit-ff0fe1ba93) — fix(web): keep pasted composer images across incoming chat updates

提交时间：2026-11-05T22:34:01+08:00。

````text
fix(web): keep pasted composer images across incoming chat updates

ChatView.componentDidUpdate cleared pendingImages unguarded on every
mainAgentSessions reference change, but mergeMainAgentSessions returns a
fresh outer array on every streaming tick — so an image pasted into the
composer was wiped as soon as the next request arrived.

The clear now runs only when the session-list identity actually changes,
comparing getSessionStableId by value: same-conversation rebuilds
(in-place tail replacement at turn completion, cold-load replays, shard
prepends) keep attachments, as does the first commit after mount; real
session appends/turnover and view switches still clear them.
````

<a id="message-4391792212"></a>
## [4391792212](./cc-viewer-alignment-commit-ledger.md#commit-4391792212) — review(3-commit CR): harden shard cursor/seeding + base-url parsing, dedupe shard cut resolution, translate new comments

提交时间：2026-11-06T01:01:19+08:00。

````text
review(3-commit CR): harden shard cursor/seeding + base-url parsing, dedupe shard cut resolution, translate new comments

Follow-up to the 3-commit review (ff0fe1ba / 57c732d0 / b23c1373):

- images: guard now compares a VALUE cache of stable ids (_prevStableIds) so
  an epoch-less big-drop replacement that re-stamps the SAME session object's
  messages[0]._timestamp is caught; shard-prepend skip requires the baseline
  tail to survive (a same-commit live append still clears). 4 new cases.
- sharding: /events cold-load shard cursor refined to the delivered window's
  oldestSeq (was jumping past the active shard's pre-window prefix); restart
  prompt re-seed reads live meta.shardPromptsActive (persisted at rotation)
  instead of the archived, PROMPTS-capped prompts.jsonl line count; AppBase
  shard-loading flag tracked on the owning vm (mid-load view switch no longer
  wedges the button); shardPrependCount written to the load's target vm;
  adapter active-shard branch passes noBaselinePromotion and keys the window
  flight on it; bare catches in journal/session-select now reportSwallowed.
- shard cut resolution deduped into shard-manager (readShardCuts /
  initialShardCursor, cut.json-first) and reused by events/logs/adapter;
  parts/ path ownership moved into layout.js (listShards / shardReadRoot).
- base-url: reject backslashes + C0 controls (a /\evil path resolves
  protocol-relative in WHATWG, turning the injected <base> cross-origin and
  leaking the token); query/fragment-only values are invalid instead of
  silently overriding CCV_BASE_PATH; wireBasePathVariants covers all 2^N
  percent-escape case combinations.
- tests: v2-shard-routes-http.test.js (route-level shard streams), manager
  gains active-shard-prefix / restart re-seed / partial-shard recovery /
  threshold-default cases.
- comments: translate the new Chinese comments/test titles introduced by
  57c732d0 to English (CLAUDE.md); drop the unimplemented 'log list shows a
  shard count' claim from history/changeset; fix stale titles/comments.
````

<a id="message-0dfb4e13c5"></a>
## [0dfb4e13c5](./cc-viewer-alignment-commit-ledger.md#commit-0dfb4e13c5) — chore(release): 1.9.22

提交时间：2026-11-06T01:03:27+08:00。

````text
chore(release): 1.9.22
````

<a id="message-3ce8f67a1c"></a>
## [3ce8f67a1c](./cc-viewer-alignment-commit-ledger.md#commit-3ce8f67a1c) — chore(star-history): refresh chart [skip ci]

提交时间：2026-11-09T11:28:16+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-2914d6479d"></a>
## [2914d6479d](./cc-viewer-alignment-commit-ledger.md#commit-2914d6479d) — feat(web): quick-fill time buttons for one-time scheduled tasks (#169)

提交时间：2026-11-10T23:16:37+08:00。

````text
feat(web): quick-fill time buttons for one-time scheduled tasks (#169)

* feat(web): active SubAgent/Teammate avatar strip in --sdk chat panel

Add a frosted-glass strip docked to the conversation panel's top-right in
--sdk mode, listing live local_agent/in_process_teammate agents derived from
WS sdk-task frames (taskStore snapshot). 28px strip, 24px circular avatars
(teammates reuse getTeammateAvatar, anonymous subagents use sub-* glyphs;
identity resolved via toolUseId/prompt-prefix join against the MainAgent's
Agent tool_use). Click an avatar to filter the conversation to that agent,
click again or the trailing (ALL) chip to restore everything; mutually
exclusive with the role filter; auto-hides and resets the focus once every
agent ends. Includes a focus-reset effect (dead focus restores "all"), a
zero-hit fallback that never blanks the list or hides the main agent's Last
Response/streaming overlay, and full focus lifecycle cleanup on view/session
switch and history-pin.

fix(web): keep the chat column visible on narrow windows — .chatSection gets
min-width:280px (was min-width:0) so a fixed-width terminal panel can no
longer crush it to 0px, and .splitContainer gets overflow-x:auto (was
overflow:hidden) so the overflow scrolls horizontally instead of squeezing
the conversation away.

Coverage: activeAgents.test.js, active-agents-bar.test.js,
chat-active-agents-wiring.test.js, sdkTaskTracker.test.js.

* fix(web,server): repair active-agents click-to-filter + authoritative task table

P0 — clicking an anonymous-subagent avatar selected it but did not filter the
conversation. The row filter ran two independent string matches: the bar's
avatarType was inferred from the task frame's promptSnippet while the row was
matched against its own (wrapped) first-user text, so the prefixes diverged,
promptMatchesAgent returned false with no type-level fallback, and separators/
banners kept _zeroHit from ever firing. Fix: bind each sub-agent-chat row to its
spawn tool_use in one decision (new transcriptRowMatchesAgent — toolUseId exact,
prompt-prefix fallback); judge _zeroHit by matched MESSAGE rows only; re-resolve
the focused identity fresh each render by taskId (a click before the Agent
tool_use landed left a stale 'sub'/no-toolUseId snapshot).

P1 — same-workspace /clear or in-place resume replacing the session without an
immediate sdk-task frame left the previous session's agents in taskStore and the
focus stuck. Reset the tracker on sdk-session-state sessionId change.

P2 — the relay was stateless: a task frame lost in a WS gap was unrecoverable
(strip never appears) and a lost terminal frame kept an agent "active" forever.
Add a bounded per-sessionId sdk-task table in sdk-manager (cap 64, cleared on
session switch/reset), replayed as sdk-task-snapshot on WS reconnect; the web
tracker's new applySnapshot reconciles authoritatively (resurrects missed tasks,
drops ones the server no longer tracks). Also: hide the strip while attached to
a historical session (attachedSid); unify focus liveness via isFocusActive
(teammate by name, subagent by taskId) so a multi-task teammate is not cleared
while a sibling runs; split buildAgentToolUseMap into its own memo to stop
re-scanning the whole transcript per task_progress frame.

Coverage: activeAgents.test.js (transcriptRowMatchesAgent, isFocusActive),
sdkTaskTracker.test.js (applySnapshot), chat-active-agents-wiring.test.js,
active-agents-bar.test.js, packages/app/test/sdk-task-table.test.js.

* fix(web,server): keep --sdk active-agents strip alive across F5 refresh

The strip vanished after an F5 refresh. Root cause: applySnapshot refilled
the tracker from the server-replayed sdk-task-snapshot but never adopted the
frame's workspace ownership, so the very next live sdk-task frame (e.g. a
task_progress heartbeat) hit applyFrame's owner-change branch (_ownerKey
still null), read it as a view switch, and wiped the resurrected table; later
progress frames then early-returned on the unknown taskIds, leaving the strip
empty until the next task_started.

Client (sdkTaskTracker):
- applySnapshot seeds _ownerKey from the snapshot's cwd/instanceKey so a
  same-workspace live frame no longer triggers a spurious reset.
- Skip skipTranscript (ambient) entries; header updated for the reconnect
  replay that now exists.

Server (sdk-manager):
- /clear (sdk-init with a new session_id) resets the task table, not just a
  following task frame.
- getSdkTaskSnapshot always returns a frame (empty tasks:[] is authoritative
  "no tasks"), filtering skipTranscript entries; anchor-aware resolver.
- _foldSdkTask merges patch.description and retains the skipTranscript flag.

Server (server.js):
- Connect replay is anchored to the viewed workspace (instance>project) and
  always sent (synthesizing an empty frame for a bound view with no session);
  attach/view-switch also re-replays with the fresh anchor.

Web (ChatView):
- resetForSession is gated by _sdkFrameMatchesView so a background workspace's
  session-state no longer wipes the viewed tracker/focus; the tracked sid is
  reset on view switch and declared in the constructor.
- buildAgentToolUseMap memoized per requests identity (was rebuilt per render
  and per componentDidUpdate while focused).

Core: PROMPT_PREFIX_LEN and AGENT_PROMPT_SNIPPET_LEN now exported from
@ccv/core/contentFilter and shared by web tracker, activeAgents, and the
server fold (previously duplicated magic constants).

Coverage: sdkTaskTracker.test.js (applySnapshot owner/skipTranscript),
sdk-task-table.test.js (empty/clear-boundary/skipTranscript/patch merge),
branch-server.test.js (WS replay).

* fix(im): resolve DingTalk IM timeout caused by Claude trust dialog blocking

- Add ensureOnboardingAndTrust to pre-seed Claude's .claude.json with
  hasCompletedOnboarding, bypassPermissionsModeAccepted, trustedFolders,
  and projects.hasTrustDialogAccepted (the operative field in 2.1.199)
- Add CodeFuse config dir fallback in runImMode so IM workers inherit
  the engine's pre-seeded trust state before ensureHooks runs
- Add getPtyBootState to detect trust/onboarding dialogs via PTY output
  (ANSI-stripped, latched within 30s boot window, tail-scanned to avoid
  false positives from normal conversation)
- Gate IM bridge injection on boot state: return startupError immediately
  instead of waiting 120s for reply-timeout when Claude is blocked
- Add .cjs npm launcher support across findcc, pty-manager, and cli.js
- Restrict trust seeding to IM workspace only (not user-launched projects)
- Fix atomic write to preserve file permissions from creation (0o600 default)
- Add startupError i18n keys for all 4 IM platforms (dingtalk/feishu/wecom/discord)

* fix(web): skip discard-confirm in schedule modal when draft is still blank

* feat(web,server): scheduled tasks support UltraPlan templates + image/file attachments

The task prompt field in the scheduled-task modal now embeds the shared
UltraPlan input panel: an expert-template tab strip (empty template by
default, sent verbatim) plus paste/upload attachments. The stored prompt
stays the raw user text — the template wrapper and quoted attachment
paths are assembled at fire time by the executor via
@ccv/core assembleScheduledPrompt, so list summaries/run history/toasts
keep showing the user's text and re-editing never double-wraps. Custom
experts are snapshotted into templateContent at save time, attachments
are persisted by their durable path (persistPath, not /tmp), and the
summary list shape strips attachments/template/templateContent like the
prompt.

UltraplanPanel is generalized with optional props (templates/embedded/
hideHeader/hideSend/placeholder/maxFiles) that leave the two popover
hosts unchanged; ultraplanTemplates moves to packages/core (web keeps a
re-export shim) so server and web share one assembly source.

* feat(web): quick-fill time buttons for one-time scheduled tasks

* chore(changeset): schedule once quick-fill buttons; drop consumed changesets

* chore(release): version 1.9.23

---------

Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>
````

<a id="message-839f0f85ac"></a>
## [839f0f85ac](./cc-viewer-alignment-commit-ledger.md#commit-839f0f85ac) — fix(kimi-k3): add tool-error circuit-breaker section to preset

提交时间：2026-11-11T00:53:23+08:00。

````text
fix(kimi-k3): add tool-error circuit-breaker section to preset

Fix TaskUpdate empty-call infinite loop: read the error first, distinguish
invalid-argument from transient failure, retry at most once with changed
arguments, hard-stop and report after two consecutive identical failures.
````

<a id="message-1ae82a825b"></a>
## [1ae82a825b](./cc-viewer-alignment-commit-ledger.md#commit-1ae82a825b) — chore(history): archive Unreleased entries under 1.9.23

提交时间：2026-11-11T00:54:30+08:00。

````text
chore(history): archive Unreleased entries under 1.9.23
````

<a id="message-6081b5d01a"></a>
## [6081b5d01a](./cc-viewer-alignment-commit-ledger.md#commit-6081b5d01a) — feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting

提交时间：2026-11-11T10:57:00+08:00。

````text
feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting

Quick settings gain a third cascade row (next to permission/plan auto-approve)
with 0/10/20/30-minute or off (default) tiers. When enabled, the server answers
an AskUserQuestion itself at the wall-clock deadline even with no browser
connected, picking the first option whose label carries a localized
"Recommended" marker (18-locale vocabulary) else the first option; 0 minutes
answers immediately for unattended/scheduled-task flows. The modal shows a live
countdown with a per-ask "cancel auto-answer" (global setting untouched), and a
manual answer before the deadline always wins (first-write-wins).

Server: new packages/core/src/ask-auto-answer.js (picker, client-safe) +
packages/app/server/lib/ask-auto-answer.js (strict typeof minutes validation,
fork-aware compute, arm/cancel/replay). Wired into the PTY hook (ask-perm.js),
the WS layer + a new ask-auto-cancel frame (server.js), the SDK canUseTool path
(sdk-manager.js), and the ask reaper; every entry-deletion path clears the
hosting timer. The ask bridge reports its cwd so project forks resolve per
session. ChatView's session-item cache observes pendingAsk/askMetaMap so the
countdown and cancel strip stay live.

Tests: 12 suites (core picker + prefs merge, server state machine, PTY route
hosting incl. first-write-wins race + slot-reuse cancel inheritance, SDK
hosting incl. instant/10min/cancel/scheduled-task/manual-win, WS branches,
web controller + options + countdown + menu source anchors + i18n KEYS).
Coverage: full suite 12891 pass / 0 fail; verify:boundaries, build, and
verify:tarball-drift all pass.
````

<a id="message-d6ec38be82"></a>
## [d6ec38be82](./cc-viewer-alignment-commit-ledger.md#commit-d6ec38be82) — feat(header): stop auto-pinning system-prompt entry to top navbar

提交时间：2026-11-11T11:14:03+08:00。

````text
feat(header): stop auto-pinning system-prompt entry to top navbar

Remove the auto-reveal mechanism for the edit-system-prompt entry: the
pinned-shortcut block and the Electron tab-bar header model no longer
append it when a system prompt is active; drop reloadSystemPromptStatus
polling plus systemPromptActive/systemPromptBuiltinDisabled state. The
entry stays in the hamburger menu or via manual pinning.
````

<a id="message-96f3a7a44e"></a>
## [96f3a7a44e](./cc-viewer-alignment-commit-ledger.md#commit-96f3a7a44e) — feat(chat): move user-prompts entry from hamburger menu to prompt-nav "more"

提交时间：2026-11-11T11:53:21+08:00。

````text
feat(chat): move user-prompts entry from hamburger menu to prompt-nav "more"

The Export-user-prompts entry leaves the hamburger menu; the avatar
prompt-nav popover title bar gains a "more" link that opens the same
summary modal (export .txt / original / context / text views). The modal
moves to chat/UserPromptsModal; parseSegments + COMMAND_TAGS move to
utils/promptSegments (DetailPanel consumes the util instead of importing
AppHeader statically); tab-bar MENU_ICON and the orphaned ui.exportPrompts
i18n entries are dropped; the modal-mask consumer guard now lists
UserPromptsModal in place of AppHeader.
````

<a id="message-a6b82f16df"></a>
## [a6b82f16df](./cc-viewer-alignment-commit-ledger.md#commit-a6b82f16df) — feat(web): 文件搜索并入文件浏览器面板并重排搜索控件

提交时间：2026-11-11T16:53:06+08:00。

````text
feat(web): 文件搜索并入文件浏览器面板并重排搜索控件

- 搜索入口从左侧栏移至文件浏览器标题栏放大镜开关，面板嵌入文件树下方
- 重排控件：Aa/ab/.* 开关内嵌进搜索框右端；"…" 筛选开关移至搜索框下方、无边框 SVG 圆点、灰/蓝两态；包含/排除输入改为直角、行内短标签 + 示例 placeholder；替换按钮换用新 SVG
- 刷新后保持搜索面板开启状态与已输入内容（_setSearchOpen + ccv_searchOpen）
- 树/搜索分界线可上下拖拽调整比例（35%–80%），修复拖拽分栏特异性失效、挂载抢焦点、sash 拖拽中途关面板 cursor 卡死等问题
- 补充 i18n 18-locale 守卫与契约测试
````

<a id="message-ea995f3883"></a>
## [ea995f3883](./cc-viewer-alignment-commit-ledger.md#commit-ea995f3883) — feat(web): drag files into terminal or chat

提交时间：2026-11-11T19:06:26+08:00。

````text
feat(web): drag files into terminal or chat
````

<a id="message-beaa2e86f2"></a>
## [beaa2e86f2](./cc-viewer-alignment-commit-ledger.md#commit-beaa2e86f2) — feat(web): support dragging folders into terminal and chat

提交时间：2026-11-11T19:27:40+08:00。

````text
feat(web): support dragging folders into terminal and chat
````

<a id="message-91a523d043"></a>
## [91a523d043](./cc-viewer-alignment-commit-ledger.md#commit-91a523d043) — feat: add cross-platform archive preview

提交时间：2026-11-11T22:29:39+08:00。

````text
feat: add cross-platform archive preview
````

<a id="message-f96811cddb"></a>
## [f96811cddb](./cc-viewer-alignment-commit-ledger.md#commit-f96811cddb) — feat: unify file preview routing and binary guards

提交时间：2026-11-12T00:08:33+08:00。

````text
feat: unify file preview routing and binary guards
````

<a id="message-62012025cb"></a>
## [62012025cb](./cc-viewer-alignment-commit-ledger.md#commit-62012025cb) — ci: retry bounded zsh installation

提交时间：2026-11-12T00:25:16+08:00。

````text
ci: retry bounded zsh installation
````

<a id="message-f3db3ed9a2"></a>
## [f3db3ed9a2](./cc-viewer-alignment-commit-ledger.md#commit-f3db3ed9a2) — ci: avoid installing zsh for mocked shell tests

提交时间：2026-11-12T00:35:20+08:00。

````text
ci: avoid installing zsh for mocked shell tests
````

<a id="message-9e24827264"></a>
## [9e24827264](./cc-viewer-alignment-commit-ledger.md#commit-9e24827264) — Merge pull request #170 from weiesky/feat/file-preview-foundation

提交时间：2026-11-12T00:38:31+08:00。

````text
Merge pull request #170 from weiesky/feat/file-preview-foundation

feat: file preview foundation and binary guards
````

<a id="message-6dd3b3b7e5"></a>
## [6dd3b3b7e5](./cc-viewer-alignment-commit-ledger.md#commit-6dd3b3b7e5) — chore: release 1.9.24

提交时间：2026-11-12T00:40:27+08:00。

````text
chore: release 1.9.24
````

<a id="message-6e3c93cd7c"></a>
## [6e3c93cd7c](./cc-viewer-alignment-commit-ledger.md#commit-6e3c93cd7c) — feat: add guided npm updates with restart

提交时间：2026-11-12T10:28:17+08:00。

````text
feat: add guided npm updates with restart
````

<a id="message-17ba9be7b5"></a>
## [17ba9be7b5](./cc-viewer-alignment-commit-ledger.md#commit-17ba9be7b5) — fix: harden guided updates and restart recovery

提交时间：2026-11-12T14:16:08+08:00。

````text
fix: harden guided updates and restart recovery
````

<a id="message-5a7904990b"></a>
## [5a7904990b](./cc-viewer-alignment-commit-ledger.md#commit-5a7904990b) — Merge pull request #171 from weiesky/feat/guided-npm-updates

提交时间：2026-11-12T14:54:03+08:00。

````text
Merge pull request #171 from weiesky/feat/guided-npm-updates

feat: add guided npm updates with restart
````

<a id="message-c30ca279bd"></a>
## [c30ca279bd](./cc-viewer-alignment-commit-ledger.md#commit-c30ca279bd) — chore: release 1.9.25

提交时间：2026-11-12T15:10:08+08:00。

````text
chore: release 1.9.25
````

<a id="message-84373dff25"></a>
## [84373dff25](./cc-viewer-alignment-commit-ledger.md#commit-84373dff25) — Merge pull request #172 from weiesky/chore/release-1.9.25

提交时间：2026-11-12T15:19:58+08:00。

````text
Merge pull request #172 from weiesky/chore/release-1.9.25

chore: release 1.9.25
````

<a id="message-919fded845"></a>
## [919fded845](./cc-viewer-alignment-commit-ledger.md#commit-919fded845) — fix(sdk): settle stale slow-upstream notices

提交时间：2026-11-12T19:37:45+08:00。

````text
fix(sdk): settle stale slow-upstream notices
````

<a id="message-20313b254c"></a>
## [20313b254c](./cc-viewer-alignment-commit-ledger.md#commit-20313b254c) — feat: add inline audio preview with streaming range support

提交时间：2026-11-13T01:24:19+08:00。

````text
feat: add inline audio preview with streaming range support

Add a dedicated /api/audio-stream route that streams audio with single-range
HTTP Range (206/416/304/If-Range) and a correct audio/* MIME, so the native
<audio> element can play and seek (Safari requires byte-range support). A new
server/lib/audio-stream.js provides magic-byte sniffing (audio/* only), an
RFC 9110 byte-range parser (suffix + clamping), and a streaming responder with
an empty-file guard and abort/error cleanup.

On the web side, a lazy AudioPreview component renders <audio controls
preload="none"> with a download fallback on playback error. oga/aac/opus are
classified as audio, audio leaves the download-only set, and a shared
opensInFileViewer helper keeps the GitChanges single-click on the viewer.
````

<a id="message-18bd742bc5"></a>
## [18bd742bc5](./cc-viewer-alignment-commit-ledger.md#commit-18bd742bc5) — feat: add subtitle preview and extend image preview formats

提交时间：2026-11-13T05:19:14+08:00。

````text
feat: add subtitle preview and extend image preview formats

Stage B (subtitles): parse SRT/VTT/ASS/SSA into a list/raw preview. Raw
bytes are read via /api/file-raw (file-content rejects GBK/Latin-1 as
binary) and decoded with the archive util's BOM/UTF-16/GBK/Latin-1 path.
Cues render as plain React text (no HTML/ASS override execution), capped
at 1 MiB / 3000 cues with truncation notices. An $EDITOR session keeps
the editable text editor.

Also fix vendored archive decode: decodeLegacyText referenced an
out-of-scope `truncated` (ReferenceError on Latin-1), decodeTextBytes
had a dead UTF-8 truncation trim that mislabeled cut CJK text as GBK, and
the lossy GBK retry could mislabel Latin-1.

Stage C (images): APNG/JFIF route to <img> preview and thumbnails/refs;
TIFF/HEIC/HEIF classify as image (icon + correct download MIME) but stay
off the preview route via NON_DECODABLE_IMAGE_EXTS so browsers that
cannot decode them keep the download fallback.
````

<a id="message-ec14cd0234"></a>
## [ec14cd0234](./cc-viewer-alignment-commit-ledger.md#commit-ec14cd0234) — fix(sdk+web): blood bar (context usage) freeze — keepalive, watchdog, fetch deadline, ts self-heal

提交时间：2026-11-13T11:37:24+08:00。

````text
fix(sdk+web): blood bar (context usage) freeze — keepalive, watchdog, fetch deadline, ts self-heal

The /ws/terminal channel had no keepalive, so a half-open socket (NAT timeout,
sleep/wake, proxy drop) never fired onclose and every push-only consumer
(sdk-context-usage bar, approvals, queue state) froze until a page refresh.

- server: app-level ping on /ws/terminal (immediate on connect + every 25s);
  terminate existing clients on stop so a zombie connection can't be fed alive
- web: idle watchdog (45s) with ping-evidence gate, 10s dial deadline, stale
  onclose/onopen guards; visibility reset on foreground
- web: 15s fetch deadline on the SDK context pull (reported, gate released)
- web: corrupt-future snapshot ts self-heals by clamping the watermark
- web: park queued-but-unsent composer text across a transient reconnect
````

<a id="message-187583787d"></a>
## [187583787d](./cc-viewer-alignment-commit-ledger.md#commit-187583787d) — feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate

提交时间：2026-11-13T15:10:23+08:00。

````text
feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate

New permission auto-approve tier 完全免审批 (-2): instant allow like -1, and
additionally lifts the npm-publish hard gate (perm only; plan never gets it;
scheduled-task/IM-deny exemptions unchanged). Selecting the tier from any
surface (quick menu or settings Selects) shows a danger confirm focused on
Cancel (zIndex above the quick-settings Popover); the quick menu marks the
tier in red and the perm row gains a (?) help explaining the tiers. User copy
uses rm -rf (deletes files) as the high-risk example. i18n x18, README x18,
changeset (patch), history.md.
````

<a id="message-23e4273a37"></a>
## [23e4273a37](./cc-viewer-alignment-commit-ledger.md#commit-23e4273a37) — chore: release 1.9.26

提交时间：2026-11-13T15:27:47+08:00。

````text
chore: release 1.9.26
````

<a id="message-0ff3154822"></a>
## [0ff3154822](./cc-viewer-alignment-commit-ledger.md#commit-0ff3154822) — Merge pull request #173 from weiesky/release/1.9.26

提交时间：2026-11-13T15:28:28+08:00。

````text
Merge pull request #173 from weiesky/release/1.9.26

chore: release 1.9.26 — file preview (audio/subtitle/image) + permission tier + fixes
````

<a id="message-dd8709356b"></a>
## [dd8709356b](./cc-viewer-alignment-commit-ledger.md#commit-dd8709356b) — fix(web+server): close approval modal after server-side auto-advance

提交时间：2026-11-13T17:40:24+08:00。

````text
fix(web+server): close approval modal after server-side auto-advance

A plan/ask auto-approve (instant tier) fires the pending and resolved frames
in the same tick; under React 18 batching the resolved branch read the
not-yet-committed pending state and no-opped, leaving the modal stuck. Clear
via functional setState (match the latest state by id), and route id-addressed
approval terminal frames past view narrowing in broadcastWsMessage. Side
effects run in the setState commit callback so controller routing fields and
askMetaMap stay in sync.
````

<a id="message-a2f5cd4b43"></a>
## [a2f5cd4b43](./cc-viewer-alignment-commit-ledger.md#commit-a2f5cd4b43) — feat(web): drag git changes (files, folders, commits) into chat or terminal

提交时间：2026-11-15T10:59:16+08:00。

````text
feat(web): drag git changes (files, folders, commits) into chat or terminal
````

<a id="message-24c4f60b54"></a>
## [24c4f60b54](./cc-viewer-alignment-commit-ledger.md#commit-24c4f60b54) — Merge pull request #174 from weiesky/feat/git-changes-drag-drop

提交时间：2026-11-15T15:39:51+08:00。

````text
Merge pull request #174 from weiesky/feat/git-changes-drag-drop

feat(web): drag git changes (files, folders, commits) into chat or terminal
````

<a id="message-00fdfade79"></a>
## [00fdfade79](./cc-viewer-alignment-commit-ledger.md#commit-00fdfade79) — chore: release 1.9.27

提交时间：2026-11-15T15:40:52+08:00。

````text
chore: release 1.9.27
````

<a id="message-bde0244333"></a>
## [bde0244333](./cc-viewer-alignment-commit-ledger.md#commit-bde0244333) — fix(server): WS-mux cold-load backpressure stall (1011 queue-overflow blank chat)

提交时间：2026-11-16T03:24:03+08:00。

````text
fix(server): WS-mux cold-load backpressure stall (1011 queue-overflow blank chat)

Cold-loading history over the WS-mux pushed a multi-MB burst in one tick,
tripping the 32MB queue cap: the socket closed with 1011 queue-overflow, the
page never received load_end, and a refresh re-ran the burst (reconnect
loop), leaving the chat area blank.

Rework the mux backpressure into a self-contained per-socket pump (the shared
gate's skip+resync contract never fit the mux's queue+replay):
- single setInterval pump is the only queue driver; a frame is queued only via
  enterBehind (queue non-empty => behind + pump armed)
- progress is the pump DEQUEUING bytes, not the bufferedAmount level (a full
  buffer is refilled to ~HIGH every tick, so a draining client's level never
  drops) — a dual-clock watchdog kills a truly wedged socket without
  false-killing slow-but-draining ones, with an absolute 2x ceiling that an
  event-loop stall cannot postpone
- 'drain' fires only once there is real headroom (and unconditionally on full
  drain), so woken producers refill a draining socket instead of reflooding a
  congested one
- ping/pong/open-ack bypass the data queue via sendControl; the ping timer no
  longer clobbers the pump's drain baseline

Make every bulk producer credit-based (v3 cold load, shard path, attach-buffer
flush): write one frame, await drain under pressure, abort on a dead sink. The
attach-buffer replay is now async, byte-accounted (Buffer.byteLength), and its
proxy->registrable swap is atomic via an onDrained/onAbort pair (no ghost
client after a mid-flush disconnect, no frame loss at the swap boundary).

Also fix awaitWireDrain to listen on res 'drain' as well as the encoder's, so
a compressed-SSE cold load no longer stalls for the full timeout when the
socket (not the encoder) was the pressured stream.

ws-backpressure.js and the terminal/scratch paths are byte-identical.

Tests: ws-mux-backpressure.test.js, events-v3-cold-backpressure.test.js,
wire-compress.test.js (new regressions), sse-attach-buffer.test.js +
events-attach-buffer.test.js (async flush + swap atomicity).
````

<a id="message-add350bc52"></a>
## [add350bc52](./cc-viewer-alignment-commit-ledger.md#commit-add350bc52) — fix(web): hide Teammate role in proxy hot-switch under SDK mode

提交时间：2026-11-16T03:40:01+08:00。

````text
fix(web): hide Teammate role in proxy hot-switch under SDK mode
````

<a id="message-5fc4c75229"></a>
## [5fc4c75229](./cc-viewer-alignment-commit-ledger.md#commit-5fc4c75229) — style(web): 统一 Git 变更 / 文件浏览器刷新按钮样式

提交时间：2026-11-16T03:50:52+08:00。

````text
style(web): 统一 Git 变更 / 文件浏览器刷新按钮样式

两处头部刷新按钮从自绘 SVG RefreshIcon 换成与「上下文消耗」同款的
antd text 小按钮 + ReloadOutlined，压缩至 16×16 贴合 11px 标题栏；
点击后无限旋转 loading 直到刷新完成（仅手动点击时转）。
````

<a id="message-975313773a"></a>
## [975313773a](./cc-viewer-alignment-commit-ledger.md#commit-975313773a) — feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表

提交时间：2026-11-16T05:01:21+08:00。

````text
feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表

右上角浮层由 24px 头像条改为标题 + 数量 + 行列表（状态点、名称、当前
工具、耗时），对齐 dynamic workflow 面板风格；移除 (ALL) 按钮与点击头像
过滤对话及整套 focus 机制；有活跃代理即显示、结束自动消失，与角色筛选互斥。
WS 重连后保留当前工具标签、且不再重置已运行耗时。
````

<a id="message-8bba70ec69"></a>
## [8bba70ec69](./cc-viewer-alignment-commit-ledger.md#commit-8bba70ec69) — Merge pull request #175 from weiesky/feat/active-agents-card

提交时间：2026-11-16T05:06:51+08:00。

````text
Merge pull request #175 from weiesky/feat/active-agents-card

feat(web): --sdk 活跃 SubAgent/Teammate 浮条改为可折叠卡片列表
````

<a id="message-efe935cd43"></a>
## [efe935cd43](./cc-viewer-alignment-commit-ledger.md#commit-efe935cd43) — chore(release): 1.9.28

提交时间：2026-11-16T05:07:29+08:00。

````text
chore(release): 1.9.28
````

<a id="message-2e09d30192"></a>
## [2e09d30192](./cc-viewer-alignment-commit-ledger.md#commit-2e09d30192) — feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送

提交时间：2026-11-16T13:30:05+08:00。

````text
feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送

- 在助手气泡内选中文字（正文/表格/代码）浮出「添加到对话」按钮，点击后作为引用 chip 插入输入框上方（可删除、点击/键盘预览全文）。
- 发送时引用以 > 块拼在用户消息前；slash 命令时跳过拼接并保留 chip，避免破坏命令识别；多行引用经 bracketed-paste 发送避免 PTY 把换行当提交。
- 通过 data-ccv-role 钩子限定助手气泡（绕开 CSS-module hash），触屏/键盘选区经 selectionchange 防抖弹出。

Coverage: chat-quote-i18n.test.js
````

<a id="message-1b3c2268e3"></a>
## [1b3c2268e3](./cc-viewer-alignment-commit-ledger.md#commit-1b3c2268e3) — feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片

提交时间：2026-11-16T16:25:24+08:00。

````text
feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片

- 选区门槛泛化为「同一助手气泡 + 同一 quotable 区域」：除 markdown(.chat-md) 外，新增 [data-ccv-quotable] 区域——Edit/Write 代码 diff(codeWrap)、工具卡片 KV 参数区(kvContainer)、AskUserQuestion 卡片(问题+选项)。
- diff 按选中可见纯文本引用（行号/+/- 经 gutter user-select:none 排除）；AskUserQuestion 选项行改为可选中，◉/☑ 字形不可选；选项行拖选文本时经 guardWhileSelecting 守卫不误触切换。
- 门槛拒绝多范围选区与空白选区；portaled 审批弹层/简化 pill 因无气泡祖先而不触发。

Coverage: chat-quote-i18n.test.js
````

<a id="message-478268a4db"></a>
## [478268a4db](./cc-viewer-alignment-commit-ledger.md#commit-478268a4db) — feat(web): copy selected chat markdown as markdown source

提交时间：2026-11-16T18:48:44+08:00。

````text
feat(web): copy selected chat markdown as markdown source

Selection inside an assistant bubble's .chat-md region now writes markdown to
text/plain (and the original rendered HTML to text/html) instead of plain text.
Uses Turndown + GFM with a custom rule that restores data-md-file links as
angle-bracket destinations. Other selections fall through to native copy.

Coverage: markdown-copy.test.js
````

<a id="message-13ad396d5e"></a>
## [13ad396d5e](./cc-viewer-alignment-commit-ledger.md#commit-13ad396d5e) — chore(star-history): refresh chart [skip ci]

提交时间：2026-11-16T11:13:15+00:00。

````text
chore(star-history): refresh chart [skip ci]
````

<a id="message-8f1d345309"></a>
## [8f1d345309](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309) — feat(web): move prompt-nav into composer and relocate mic in --sdk layout

提交时间：2026-11-16T23:10:26+08:00。

````text
feat(web): move prompt-nav into composer and relocate mic in --sdk layout

Two related changes:

1. --sdk composer layout: prompt-nav entry and voice input swap sides.
   - Remove the left-sidebar avatar entry in --sdk mode (and in --terminal
     when the PTY is hidden). Add a circular avatar button in the composer
     left cluster (where mic used to sit) that opens a click-driven Popover
     with the same prompt-nav content.
   - Move the mic button from the composer left cluster to the right
     cluster, between proxyChip and send.
   - Show the legacy layout in --terminal while the PTY is shown, and on
     mobile (unchanged).
   - Single-source the layout predicate as
     utils/promptNav.shouldUseComposerPromptNav({isMobile, sdkMode,
     terminalVisible, cliMode}), consumed by both ChatView and ChatInputBar.
   - Close the composer popover when the user picks a nav item or clicks
     "more"; reset promptNavOpen in componentDidUpdate when the layout
     predicate flips off.

2. Active-agents card no longer inflates with unnamed nested rows.
   - deriveActiveAgents: defensive filter — drop agent tasks with an empty
     promptSnippet (the Agent-tool spawn prompt is optional in the SDK
     schema, so a missing snippet means the task is not a real user-spawn).
   - buildAgentToolUseMap: index every Agent/Task tool_use block in the
     transcript, not only mainAgent rows. Teammate-spawned nested subagents
     now join to their real name instead of falling back to the short
     Agent-tool description ("Read X").
````

<a id="message-ac56c9c6d5"></a>
## [ac56c9c6d5](./cc-viewer-alignment-commit-ledger.md#commit-ac56c9c6d5) — Merge pull request #176 from weiesky/feat/sdk-composer-prompt-nav

提交时间：2026-11-16T23:20:04+08:00。

````text
Merge pull request #176 from weiesky/feat/sdk-composer-prompt-nav

feat(web): move prompt-nav into composer and relocate mic in --sdk layout
````

<a id="message-74cd752d99"></a>
## [74cd752d99](./cc-viewer-alignment-commit-ledger.md#commit-74cd752d99) — chore(release): 1.9.29

提交时间：2026-11-16T23:21:08+08:00。

````text
chore(release): 1.9.29
````
