# B0：逐提交文件与测试证据

本文件以固定上游快照和 cx-viewer `753fd6c` 为基线，逐提交提取第一父差异中的生产文件、测试文件与同名本地候选。列出的候选是路径定位证据，不证明功能等价；合并提交中的路径可能重复其分支提交。

范围为 337 条可达提交，按提交时间历史遍历顺序；上游完整 diff 及路径列表见对应台账。

<a id="evidence-3eb16102e5"></a>
## [3eb16102e5](./cc-viewer-alignment-commit-ledger.md#commit-3eb16102e5) — fix(proxy-stats): make the config tab's scroll viewport resolve

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T14:41:46+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/retry-config-layout.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `const APPBASE_JSX = readFileSync(join(ROOT, 'src/AppBase.jsx'), 'utf8');`; `describe('RetryConfigForm layout', () => {`; `describe('handleRetryConfigChange save contract', () => {`.
- Upstream commit message excerpt: .configScroll sizes itself with `flex: 1` + `min-height: 0`, which only resolve against a flex parent with a definite height. .body was a plain block box, so the scroll child fell back to content height and .body's `overflow: hidden` clipped the form instead of scrolling it — on short viewports (and in the <=900px one-column configGrid) the Save button was unreachable and the config unsavable. Add `display: flex; flex-direction: column` to .body, and pin the flex chain with a layout guard that fails on the pre-fix CSS.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-51b3443e57"></a>
## [51b3443e57](./cc-viewer-alignment-commit-ledger.md#commit-51b3443e57) — fix(proxy-stats): restore the stats-tab refresh controls

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T14:41:56+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：3；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `const fmtPercent = (n) => '${n}%';`; `export default function ProxyStatsDashboard({ embedded }) {`; `function DurationRecordTable({ title, record }) {`; `function DashboardHeader({ onRefresh, autoRefresh, setAutoRefresh }) {`; `export default function ProxyStatsModal({ retryConfig, retryDefaults, onRetryCon`.
- Upstream commit message excerpt: DashboardHeader rendered only under `!embedded`, but the sole call site always passed `embedded` — so the auto-refresh toggle and the manual Refresh button never rendered while the 15s poll kept running with no UI to stop it. Drop the dead `embedded` prop and always render the controls (without the duplicate title, which the modal toolbar already shows), remove the now unreachable .page/.title CSS, and hold the interval id in a local so the cleanup closes over its own timer rather than a shared ref.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-935a33cc0a"></a>
## [935a33cc0a](./cc-viewer-alignment-commit-ledger.md#commit-935a33cc0a) — fix(proxy-stats): keep retryBurden range JSON-safe

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T14:42:06+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/proxy-stats.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `export function computeStreak(records) {`; `export const RETRY_BURDEN_BUCKETS = [`; `function bumpBurden(counts, retries) {`; `describe('proxy-stats aggregateRecords', () => {`.
- Upstream commit message excerpt: RETRY_BURDEN_BUCKETS stored `Infinity` as the open-ended upper bound, but the table's shape is mirrored into the stats JSON that stats-worker writes to disk and /api/proxy-stats serves — and JSON.stringify(Infinity) is `null`, so clients received [51, null] while the test asserted [51, Infinity] in-process, certifying a contract no client sees. Spell the bound `null` so the in-process and serialized values match, and assert the payload survives a JSON round-trip unchanged.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-eef9fd870e"></a>
## [eef9fd870e](./cc-viewer-alignment-commit-ledger.md#commit-eef9fd870e) — refactor: drop dead code left by the retry-stats redesign

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T14:42:16+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：5；上游测试文件：1。
- 上游测试：`test/bar-chart-helpers.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`。
- B0 diff inspection: 8 distinct hunk context(s) extracted (up to 30): `const DEFAULT_COLORS = [`; `function BarChart({`; `export function foldBars(data, { maxBars, grouped = false } = {}) {`; `export function groupedBarTitle(label, value, bi, legend, valueFormatter) {`; `import { DISPLAY_SCALE_PRESETS } from '../../utils/displayScaleHelper';`; `const NUMERIC_FIELDS = [`; `export function RetryConfigForm({ config, defaults, onSave, onCancel, embedded }`; `describe('barChartHelpers groupedBarTitle', () => {`.
- Upstream commit message excerpt: - BarChart: remove the horizontal layout branch, its `horizontal` prop and the .hLabel rule (no call site passes it), plus the d.color/d.colors lookups, which have no producer. - barChartHelpers: drop the unreachable "series N" tooltip fallback — it was an untranslated user-visible string using a 0-based index. - ProxyStatsDashboard: stop pre-slicing byModel/retryDistribution, which made BarChart's `maxBars` a no-op and dropped the long tail with no "…" fold bar to show truncation. - RetryConfigForm: remove the onCancel/embedded props — with the Modal wrapper gone, both halves of the Cancel guard were unsatisfiable. - AppHeader: drop the isMobile import, orphaned with the mobile drawer.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-60cb46ce98"></a>
## [60cb46ce98](./cc-viewer-alignment-commit-ledger.md#commit-60cb46ce98) — docs(history): condense the Unreleased proxy-stats entries

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T14:42:24+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: The two bullets ran ~450 words of implementation detail, pixel values and review history. Reduce to one line per feature point, matching the density of the released sections.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-42207f7fd1"></a>
## [42207f7fd1](./cc-viewer-alignment-commit-ledger.md#commit-42207f7fd1) — fix(test): remove timing assumptions from brotli decode helpers

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T15:30:25+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：0；上游测试文件：2。
- 上游测试：`test/sse-compression.test.js`, `test/wire-compress.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `const tick = () => new Promise((resolve) => setImmediate(resolve));`; `async function until(cond, ms = 10000) {`; `describe('GET /events wire compression', () => {`; `const tick = () => new Promise((resolve) => setImmediate(() => setImmediate(reso`; `describe('wire-compress streaming', () => {`.
- Upstream commit message excerpt: Both tests polled a brotli *decoder* for output over a fixed number of event-loop turns. zlib runs on the libuv threadpool, so a tick budget is not a completion guarantee: under CI CPU load the decode returned '' and the assertion compared '' against the expected payload. dd2fa26 already fixed this for the broadcast test in sse-compression by switching to enc.end() + brotliDecompressSync; apply the same pattern to the remaining decodeBr() call site and drop the now-unused helper. Capture the compressed length before end() so the trailer bytes don't skew the size assertion. wire-compress can't end the stream — its point is that a frame is readable mid-stream — so make the decode itself deterministic instead: resolve off zlib's own write/flush callbacks, and replace the 200-tick loop with a wall-clock wait.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-00dd0eaf94"></a>
## [00dd0eaf94](./cc-viewer-alignment-commit-ledger.md#commit-00dd0eaf94) — Merge pull request #131 from souloss/feat/retry-stats-modal

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T03:34:40-04:00；父提交 2；相对第一父文件数 27。
- 上游生产/配置文件：19；上游测试文件：7。
- 上游测试：`test/bar-chart-helpers.test.js`, `test/modal-mask.test.js`, `test/new-ui-i18n.test.js`, `test/proxy-stats.test.js`, `test/retry-config-layout.test.js`, `test/sse-compression.test.js`, `test/wire-compress.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`src/App.jsx` → `src/App.jsx`; `src/AppBase.jsx` → `src/AppBase.jsx`; `src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(proxy-stats): retry-stats UI redesign — unified tabbed Config|Stats modal + zero-dep SVG BarChart + retry-burden backend fields

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6bd3b80e58"></a>
## [6bd3b80e58](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58) — fix(win): restore Claude discovery and Electron tab launch on Windows

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T17:06:42+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：2；上游测试文件：4。
- 上游测试：`test/claude-lookup-test-guard.test.js`, `test/electron-node-execpath-regression.test.js`, `test/findcc-gap.test.js`, `test/windows-npm-root-regression.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`electron/main.js` → `electron/main.js`。
- B0 diff inspection: 7 distinct hunk context(s) extracted (up to 30): `process.env.PATH = pathDirs.join(delimiter);`; `if (process.versions.electron) {`; `function createTab(projectPath, extraArgs = []) {`; `export function isBrowserOpenSuppressed() {`; `export function getGlobalNodeModulesDir() {`; `describe('L7 claude-lookup guard — PATH-independent discovery blocked in tests`; `describe('findcc: getGlobalNodeModulesDir', () => {`.
- Upstream commit message excerpt: Two unrelated Windows-only regressions. #137 — `ccv` died with "Claude Code cli.js not found: <path>" at a path that demonstrably existed. getGlobalNodeModulesDir() called execFileSync('npm.cmd', ['root','-g']); since the CVE-2024-27980 fix (Node 18.20.2 / 20.12.2 / 22.0.0) a .cmd/.bat target without a shell throws EINVAL synchronously. The throw hit the bare catch and returned null, so every discovery path keyed on the global node_modules root came up empty. Route through `cmd.exe /d /s /c npm root -g` (executed image is a real PE; argv is a fixed literal, no interpolation) and add an npm-free inferGlobalNodeModulesDir() fallback so a failing npm can no longer hide a present install. Timeout 2s->10s and tolerate npm warning prefixes. #129 — packaged Electron tabs hung forever. Tab workers were forked with an execPath from `where node`, falling back to the bare string 'node'; a packaged GUI app does not inherit the shell PATH, so fork() failed with "spawn node ENOENT" (confirmed in the…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1626575652"></a>
## [1626575652](./cc-viewer-alignment-commit-ledger.md#commit-1626575652) — chore(release): bump version to 1.7.8

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T17:12:24+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ef64e15621"></a>
## [ef64e15621](./cc-viewer-alignment-commit-ledger.md#commit-ef64e15621) — fix(findcc): move native resolution before PATH to avoid ERROR_BAD_EXE_FORMAT on Windows

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T21:37:19+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`test/findcc-gap.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `export function resolvePreferredClaudeSelection({ prefsFile } = {}) {`; `describe('findcc: configured Claude executable', () => {`.
- Upstream commit message excerpt: On Windows, PATH may surface a postinstall stub (no-extension shim, .cmd, .ps1) that causes ERROR_BAD_EXE_FORMAT (193/216) when spawned via ConPTY. Reorder resolvePreferredClaudeSelection so that resolveNativePath() runs before PATH-based and npm-based resolution. Priority order: configured → codefuse → native → path → npm Added 6 unit tests covering the full priority chain, including a Windows-specific regression test for the ERROR_BAD_EXE_FORMAT scenario. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9600351738"></a>
## [9600351738](./cc-viewer-alignment-commit-ledger.md#commit-9600351738) — fix(electron): add missing src/utils/ to electron-builder bundle

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-26T23:48:06+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `files:`.
- Upstream commit message excerpt: server/lib/v2/meta-rows.js and server/lib/v2/live-feed.js import classifyRequest from src/utils/requestType.js, but electron-builder.yml did not include src/utils/**/* in its files list. The packaged Electron app crashed at startup with 'Cannot find module'. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-20e4a63b24"></a>
## [20e4a63b24](./cc-viewer-alignment-commit-ledger.md#commit-20e4a63b24) — fix(test): drop install-layout assumption from the last-resort candidate assertion

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-27T10:41:52+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`test/windows-npm-root-regression.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';`; `import { tmpdir } from 'node:os';`; `describe('#137: npm-free fallback candidates', () => {`.
- Upstream commit message excerpt: The test required the tail candidate to end with 'node_modules'. That tail is resolve(findcc.js dir, '..') — the dir holding cc-viewer — which only ends in node_modules under an 'npm i -g' layout. In a git checkout (CI) it is the workspace dir, so the assertion failed on GitHub while passing locally. Compare against that path directly instead.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-071398e55a"></a>
## [071398e55a](./cc-viewer-alignment-commit-ledger.md#commit-071398e55a) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-27T06:41:06+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b2d57c8d38"></a>
## [b2d57c8d38](./cc-viewer-alignment-commit-ledger.md#commit-b2d57c8d38) — Merge remote-tracking branch 'origin/main' into pr-132

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-27T15:15:33+08:00；父提交 2；相对第一父文件数 53。
- 上游生产/配置文件：28；上游测试文件：18。
- 上游测试：`test/api-preferences-gap.test.js`, `test/bar-chart-helpers.test.js`, `test/claude-lookup-test-guard.test.js`, `test/cli-import-paths.test.js`, `test/cli-modes.test.js`, `test/electron-node-execpath-regression.test.js`, `test/findcc-gap.test.js`, `test/helpers-unit-a.test.js`, `test/modal-mask.test.js`, `test/new-ui-i18n.test.js`, `test/proxy-stats.test.js`, `test/pty-manager-gap.test.js`, `test/retry-config-layout.test.js`, `test/sse-compression.test.js`, `test/system-prompt-builder.test.js`, `test/system-prompt-presets.test.js`, `test/windows-npm-root-regression.test.js`, `test/wire-compress.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`cli.js` → `cli.js`; `electron/main.js` → `electron/main.js`; `package.json` → `package.json`; `server/pty-manager.js` → `pty-manager.js`; `server/routes/preferences.js` → `lib/preferences.js`; `src/App.jsx` → `src/App.jsx`; `src/AppBase.jsx` → `src/AppBase.jsx`; `src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `src/i18n.js` → `src/i18n.js`; `src/utils/helpers.js` → `src/utils/helpers.js`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `@`.
- Upstream commit message excerpt: # Conflicts: # history.md

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1db2a38eab"></a>
## [1db2a38eab](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab) — fix(ccswitch-import): unify sqlite recovery retries

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-27T15:20:25+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/ccswitch-import.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `export async function readCcSwitchProviders(dbPath) {`; `describe('readCcSwitchProviders (error surfacing)', { skip: !hasSqlite }, () =>`; `describe('readCcSwitchProviders (malformed journal recovery)', { skip: !hasSqlit`; `describe('readCcSwitchProviders (cc-switch running, valid hot journal)', { skip:`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a803382c76"></a>
## [a803382c76](./cc-viewer-alignment-commit-ledger.md#commit-a803382c76) — Merge pull request #132 from souloss/fix/ccswitch-readonly-recovery

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-27T05:30:24-04:00；父提交 2；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/ccswitch-import.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix(ccswitch-import): recover from malformed journal (readonly) + running cc-switch (db locked)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-87432d4c5a"></a>
## [87432d4c5a](./cc-viewer-alignment-commit-ledger.md#commit-87432d4c5a) — fix(migrate): respect status:'done' in pendingOf() to stop false re-prompts after migration

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-28T10:52:27+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/migrate-prompt.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `function pendingOf(projectDir) {`; `import { EventEmitter } from 'node:events';`; `describe('migrationStatus', () => {`; `describe('/events migrate_prompt frame', () => {`.
- Upstream commit message excerpt: The migration prompt detection compared per-file sizes against the convert state but ignored state.status === 'done'. After migration completes, the active V1 log continues growing (dual-write), causing a size mismatch that re-triggered the prompt even though new entries already land in V2. pendingOf() now short-circuits when status is 'done', treating the completed migration as definitive. The per-file trust rule still applies for non-done states (running/stopped/error).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-25e118170c"></a>
## [25e118170c](./cc-viewer-alignment-commit-ledger.md#commit-25e118170c) — fix(proxy-retry): preserve streaming response metadata

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-28T14:18:23+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/proxy-retry-stream-idle.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `async function singleFetch(url, fetchOptions, ctx) {`; `function makeStreamResponse({ status = 200, contentType = 'text/event-stream', e`; `describe('proxy-retry streamIdleTimeoutMs hang guard', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-617da66c96"></a>
## [617da66c96](./cc-viewer-alignment-commit-ledger.md#commit-617da66c96) — Merge pull request #134 from souloss/feat/proxy-retry-stream-idle

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-28T02:33:01-04:00；父提交 2；相对第一父文件数 4。
- 上游生产/配置文件：3；上游测试文件：1。
- 上游测试：`test/proxy-retry-stream-idle.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`server/lib/stats-worker.js` → `lib/stats-worker.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix(proxy-retry): streamIdleTimeoutMs hang guard (retry modes only) + reportSwallowed + stats cleanup

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c768e8beb3"></a>
## [c768e8beb3](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) — fix(test): stop viewer resources before cleanup

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-28T23:21:31+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：0；上游测试文件：3。
- 上游测试：`test/_helpers/rm-sync.mjs`, `test/branch-server.test.js`, `test/server-ports-busy.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `import { pathToFileURL } from 'node:url';`; `describeCli('server.js turn-end 状态机 / SDK export 分支', { concurrency: f`; `import { createServer } from 'node:net';`; `import { tmpdir } from 'node:os';`; `describeCli('server.js startViewer exhausts the port range (portsBusy)', { concu`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0f3c16d6c7"></a>
## [0f3c16d6c7](./cc-viewer-alignment-commit-ledger.md#commit-0f3c16d6c7) — Merge pull request #135 from souloss/fix/ci-flakes-brotli-rmsync

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-28T11:45:08-04:00；父提交 2；相对第一父文件数 4。
- 上游生产/配置文件：0；上游测试文件：3。
- 上游测试：`test/_helpers/rm-sync.mjs`, `test/branch-server.test.js`, `test/server-ports-busy.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix(test): stop viewer resources before temp-dir cleanup

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-82db2b907c"></a>
## [82db2b907c](./cc-viewer-alignment-commit-ledger.md#commit-82db2b907c) — ui(proxy-stats): align retry stats chart colors with app theme; release 1.7.11

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-29T11:50:00+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：5；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `src/global.css` → `src/global.css`。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `import { foldBars, groupedBarTitle, singleBarTitle } from './barChartHelpers.js'`; `const DEFAULT_COLORS = [`; `export default function ProxyStatsDashboard() {`; `export function fmtMs(ms) {`; `export function statusColor(status) {`.
- Upstream commit message excerpt: BarChart's grouped-series colors no longer reuse --color-success/-warning (misreadable as good/bad on the upstream-vs-downstream availability bars). Added a dedicated --color-chart-series-2 identity color, validated against --color-primary for CVD separation and lightness band in both themes. statusColor() and two inline Tag colors switched from antd's preset palette names ('green'/'orange'/'red') to antd's semantic status names ('success'/'warning'/'error'), matching the convention already used by DetailPanel's HTTP status Tag.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-e932bbef2e"></a>
## [e932bbef2e](./cc-viewer-alignment-commit-ledger.md#commit-e932bbef2e) — feat(context): kimi logo refresh + context-window follows hot-switched model

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-07-30T23:47:39+08:00；父提交 1；相对第一父文件数 14。
- 上游生产/配置文件：7；上游测试文件：5。
- 上游测试：`test/context-rules.test.js`, `test/context-watcher.test.js`, `test/events-kv-context-scan.test.js`, `test/helpers-unit-a.test.js`, `test/helpers.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `server/lib/context-rules.js` → `server/lib/context-rules.js`; `server/lib/context-watcher.js` → `lib/context-watcher.js`; `src/utils/helpers.js` → `src/utils/helpers.js`。
- B0 diff inspection: 24 distinct hunk context(s) extracted (up to 30): `export function parseContextSizeSuffix(modelName) {`; `const MODEL_CONTEXT_SIZES = [`; `export function getModelMaxTokens(modelName) {`; `export function classifyContextWindow(modelName) {`; `export function adaptContextWindow(classifiedTokens, usedContextTokens) {`; `import { getClaudeConfigDir } from '../../findcc.js';`; `export function readModelContextSize() {`; `export function getContextSizeForModel(apiModelName) {`; `export function processWatchedEntry(parsed, ctx) {`; `async function events(req, res, parsedUrl, isLocal, deps) {`; `export {`; `export function resolveCalibrationTokens(calibrationModel, lastMainAgent, projec`; `const MODEL_PROVIDERS = [`; `import {`; `describe('parseContextSizeSuffix', () => {`; `describe('getModelMaxTokens — 家族档位', () => {`; `describe('classifyContextWindow — 校准二分类', () => {`; `describe('adaptContextWindow — 自适应纠偏', () => {`; `describe('context-watcher: readModelContextSize', () => {`; `describe('context-watcher: getContextSizeForModel', () => {`; `describe('context-watcher: buildContextWindowEvent', () => {`; `describe('GET /events kv/context scan semantics', { concurrency: false }, () =>`; `describe('adaptContextWindow', () => {`; `describe('helpers', () => {`.
- Upstream commit message excerpt: - ui(avatar): refresh Kimi logo — brand-blue dot fixed (#1783FF), "K" glyph switched to currentColor so it inverts with --model-logo-mono (white in dark, black in light), matching GLM/MiniMax mono-logo theming. - feat(context): MODEL_CONTEXT_SIZES adds /kimi|moonshot|^k3$/i → 256K (Kimi's real window); classifyContextWindow buckets kimi/moonshot-prefixed names and bare k3 into the 1M bar bucket. [Nk]/[Nm] suffix still overrides everything. - fix(context): SSE context_window window now follows the hot-switched upstream model — getContextSizeForModel accepts a log entry and prefers the response model over the original request name, skipping the stale startup cache; adaptContextWindow gains a 256K→1M correction tier. - fix(context): new getCalibrationModel (context-rules.js, shared src/server) gives the request-side explicit [Nk]/[Nm] config suffix precedence over upstream model normalization (Moonshot returns bare "k3" for k3[1m]), so the bar's denominator honors the configured 1M intent…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6baff0cd6f"></a>
## [6baff0cd6f](./cc-viewer-alignment-commit-ledger.md#commit-6baff0cd6f) — feat(log-list): perf cache + server-side pagination + project switcher (1.7.13)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-01T02:57:48+08:00；父提交 1；相对第一父文件数 21。
- 上游生产/配置文件：14；上游测试文件：6。
- 上游测试：`test/api-logs-gap.test.js`, `test/migrate-prompt.test.js`, `test/server-logs.test.js`, `test/v2-convert.test.js`, `test/v2-core.test.js`, `test/v2-session-list.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `server/lib/log-management.js` → `lib/log-management.js`; `src/App.jsx` → `src/App.jsx`; `src/App.module.css` → `src/App.module.css`; `src/AppBase.jsx` → `src/AppBase.jsx`; `src/Mobile.jsx` → `src/Mobile.jsx`; `src/components/viewers/LogTable.jsx` → `src/components/viewers/LogTable.jsx`; `src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { listV2Sessions } from './v2/adapter.js';`; `export function listV2Logs(logDir, currentProjectName) {`; `import { isMainAgentRequest } from '../interceptor-core.js';`; `import { isDiscardableSession } from './session-select.js';`; `import { SingleFlight } from './singleflight.js';`; `export async function streamV2WindowedEntries(sessionDir, opts, onEntry) {`; `import { readConvertState } from './convert.js';`; `export function startConvert(logDir, project) {`; `import { listV1Files, listConvertibleProjects, readConvertState } from './conver`; `function pendingOf(projectDir) {`; `export function migrationStatus(logDir, project) {`; `export function sessionHasMainOrTeammateReq(dir) {`; `import { _projectName, _v2Writer } from '../interceptor.js';`; `import { sseHead, sseWrite, wireEnd } from '../lib/wire-compress.js';`; `async function localLogs(req, res, parsedUrl, isLocal, deps) {`; `import { lazy, Suspense } from 'react';`; `import { extractLatestPlanUsage } from './utils/rateLimitParser';`; `class App extends AppBase {`; `export const OPTIMISTIC_CLEAR_PERCENT = 5;`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `const EMPTY_SET = new Set();`; `function LogTable({ logs, mobile, selectedLogs = EMPTY_SET, onToggleSelect, onOp`; `const i18nData = {`; `describe('GET /api/local-logs', () => {`; `delete process.env.CCV_CLAUDE_CONTINUE;`; `before(async () => {`; `describe('migrationStatus', () => {`; `describeCli('server local logs endpoints', { concurrency: false }, () => {`; `import { startConvert, stopConvert, convertStatus, isConvertRunning } from '../s`.
- Upstream commit message excerpt: Session log list performance and UX overhaul for the log-management modal: - perf: session row cache (server/lib/v2/session-list.js) keyed by journal+prompts size+mtime; repeat /api/local-logs calls drop from a full rescan to O(N statSync). migrationStatus gains a 10s TTL memo, invalidated on convert-worker completion. - feat: server-side pagination — GET /api/local-logs?page=&pageSize= returns {items,total,page,pageSize} for one project, summarizing only the requested page (rest ride the row cache); the modal table is a controlled 50/page server-paginated grid. No params = legacy grouped shape (backward compatible). - feat: project switcher — ?project= serves any project's v2 sessions (strict sanitizePathComponent compare rejects traversal); response carries _allProjects for the toolbar dropdown. currentProject (active) stays separate from logViewProject (viewed); viewing a non-active project disables the v1 migration button and hides the banner; switching clears the selection. - ui: …

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9c0463bb8c"></a>
## [9c0463bb8c](./cc-viewer-alignment-commit-ledger.md#commit-9c0463bb8c) — prompt(kimi): anti-loop guardrails in kimi-k3/k2.7-code system-prompt presets (1.7.14)

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-01T17:15:34+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `IMPORTANT: Never generate or guess URLs unless you are confident they help the u`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-8c8b96eafe"></a>
## [8c8b96eafe](./cc-viewer-alignment-commit-ledger.md#commit-8c8b96eafe) — fix(release): bump version to 1.7.14 for re-publish

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-03T00:24:46+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-fc68e850f2"></a>
## [fc68e850f2](./cc-viewer-alignment-commit-ledger.md#commit-fc68e850f2) — feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-03T13:42:44+08:00；父提交 1；相对第一父文件数 22。
- 上游生产/配置文件：14；上游测试文件：7。
- 上游测试：`test/client-safe-imports.test.js`, `test/delta-reconstructor.test.js`, `test/should-inline-tool-images.test.js`, `test/timestamp-assignment.test.js`, `test/v2-image-pipeline.test.js`, `test/v2-transcript-incremental.test.js`, `test/v2-transcript-normalizer.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `server/lib/delta-reconstructor.js` → `server/lib/delta-reconstructor.js`; `src/AppBase.jsx` → `src/AppBase.jsx`; `src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `src/components/dashboard/RequestList.jsx` → `src/components/dashboard/RequestList.jsx`; `src/components/viewers/ToolResultView.jsx` → `src/components/viewers/ToolResultView.jsx`; `src/components/viewers/ToolResultView.module.css` → `src/components/viewers/ToolResultView.module.css`; `src/utils/sessionManager.js` → `src/utils/sessionManager.js`; `src/utils/toolResultBuilder.js` → `src/utils/toolResultBuilder.js`; `src/utils/toolResultCore.js` → `src/utils/toolResultCore.js`。
- B0 diff inspection: 21 distinct hunk context(s) extracted (up to 30): `function _tryRepairFromCandidate(brokenEntry, expectedCount, candidate) {`; `import { reconstructEntries, createIncrementalReconstructor } from '../server/li`; `class AppBase extends React.Component {`; `import { formatHms, formatMonthDayTime } from '../../utils/formatters';`; `import DiffView from './DiffView';`; `function ChatImage({ src, alt, fallbackText }) {`; `class ChatMessage extends React.Component {`; `class ChatView extends React.Component {`; `class DetailPanel extends React.Component {`; `class RequestList extends React.Component {`; `import { escapeHtml } from '../../utils/helpers';`; `function highlight(text, lang) {`; `function ToolResultView({ toolName, toolInput, resultText, images, workflow, def`; `export function assignMessageTimestamps(messages, prevMessages, isNewSession, pr`; `export function applyBatchEntryTimestamps(st, entry) {`; `export function buildSubAgentResultMap(req, globalIndex) {`; `export function appendToolResultMap(state, messages, startIndex) {`; `export function compactResultPreview(entry, opts = {}) {`; `const CLIENT_SAFE_ALLOWLIST = new Set([`; `describe('compensation for broken delta chain', () => {`; `describe('resolveBubbleProducerTs', () => {`.
- Upstream commit message excerpt: - feat: v2-transcript-normalizer converts new top-level-message JSONL into legacy entries (per-session grouping, /clear segmentation, message.id assistant-row merging, uuid dedup), wired into cold/local/live ingest; base64 tool_result images render via the existing extractToolResultImages chain - fix: live split-row merged tool_use blocks re-paired via _toolUses (label/input/Read/Edit state no longer lost); live /clear keeps the entry.timestamp === messages[0]._timestamp invariant and skips empty snapshots; string-content assistant rows merge without dropping content - ui: tool-result images open the full-screen ImageLightbox (ToolResultView + simplified-mode inline under the tool pill, memoized); oversized placeholder unified via formatOversizedImagePlaceholder - fix: synthetic entries no longer render undefined status/method; per-message timestamps survive applyBatchEntryTimestamps; delta-reconstructor excludes _syntheticV2 repair candidates - test: 4 new test files (normalizer/incre…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-4c2765d308"></a>
## [4c2765d308](./cc-viewer-alignment-commit-ledger.md#commit-4c2765d308) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-03T06:33:40+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-e4fc788b9e"></a>
## [e4fc788b9e](./cc-viewer-alignment-commit-ledger.md#commit-e4fc788b9e) — fix(v2-read): finalize crash orphans as completed deltas on cold reads (1.7.16)

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-05T02:25:30+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：6；上游测试文件：4。
- 上游测试：`test/branch-utils-sessionMerge.test.js`, `test/delta-reorder.test.js`, `test/session-boundary-parity.test.js`, `test/v2-adapter-incremental.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`src/AppBase.jsx` → `src/AppBase.jsx`; `src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `src/i18n.js` → `src/i18n.js`; `src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`。
- B0 diff inspection: 18 distinct hunk context(s) extracted (up to 30): `import { isDiscardableSession } from './session-select.js';`; `export class SessionSynthesizer {`; `import { assignMessageTimestamps, applyInPlaceLastMsgReplace, getSessionStableId`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `const i18nData = {`; `export { messageFingerprint };`; `export function isMergeBlockedEntry(entry, options = {}) {`; `export function mergeMainAgentSessions(prevSessions, entry, options = {}) {`; `describe('findReverseAnchor 间接分支', () => {`; `import { streamReconstructedEntries } from '../server/lib/log-stream.js';`; `function runBatchPipeline(fileEntries) {`; `import { createEntrySlimmer } from '../src/utils/entry-slim.js';`; `function runBatchLeg(fileEntries) {`; `describe('session-boundary parity — task B: _seqEpoch change (short prior sess`; `import assert from 'node:assert/strict';`; `import { SessionSynthesizer, iterateV2RawEntries, readV2WindowedEntries, findTea`; `describe('SessionSynthesizer out-of-order conv events', () => {`.
- Upstream commit message excerpt: - dead-session req-without-done now emits as a completed delta (response:{body:null}) so the client reconstructor accumulates its slice; previously the skipped slice failed every later _totalMessageCount check and blanked the whole chat. Live sessions keep the placeholder (liveness gate: owner pid + journal mtime). - degraded broken-carrier merge: a _reconstructBroken entry that is its session's only carrier merges as a truthful prefix (create branches only, _seqEpoch guard), stamped _partialData; ChatView shows an incomplete-session banner. Same-session merges onto a partial base whole-replace instead of prefix-extending. - parity/reorder test pipelines kept in sync; new adapter orphan + predicate tests.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-f3a8413db9"></a>
## [f3a8413db9](./cc-viewer-alignment-commit-ledger.md#commit-f3a8413db9) — fix(chat): wire-agent identity for teammate/subagent classification (1.7.17)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-05T04:19:23+08:00；父提交 1；相对第一父文件数 18。
- 上游生产/配置文件：11；上游测试文件：5。
- 上游测试：`test/agent-id.test.js`, `test/content-filter-unit.test.js`, `test/interceptor-v2-write.test.js`, `test/request-type-unit.test.js`, `test/v2-meta-rows.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `src/utils/contentFilter.js` → `src/utils/contentFilter.js`; `src/utils/identityHeal.js` → `src/utils/identityHeal.js`; `src/utils/requestType.js` → `src/utils/requestType.js`。
- B0 diff inspection: 23 distinct hunk context(s) extracted (up to 30): `LOG_DIR/<project>/sessions/<session_id>/`; `export class SessionSynthesizer {`; `import { computeCacheLoss } from './meta-rows.js';`; `export class V2LiveFeed {`; `import { reportSwallowed } from '../error-report.js';`; `function foldDir(dir) {`; `async function attachBodyFields(sessionDir, rows) {`; `import { parseUserId, classifyKind, ConvResolver } from './identity.js';`; `export class V2Writer {`; `class ChatView extends React.Component {`; `export function isTeammate(req) {`; `export function healUnresolvedTeammateEntries(entries) {`; `export function classifyRequest(req, nextReq) {`; `export function formatTeammateLabel(name, model) {`; `export function createV3Assembler() {`; `before(async () => {`; `function mkReq({ system = '', tools = [], teammate, messages = [], mainAgent, re`; `describe('isTeammate', () => {`; `function readJsonl(path) {`; `async function fireMainAgent(messages, respBody = { content: [], usage: { input_`; `describe('wire-v2 唯一写路径', () => {`; `describe('requestType — getMessageText edge via Preflight path', () => {`; `describe('quota probe typeTag via req.params', () => {`.
- Upstream commit message excerpt: - persist x-claude-code-agent-id on journal req lines (new agent-id.js parser); teammate display names no longer depend on the window-scoped registry - chat classification reuses the server-side typeTag via _v3Row, so [对话] and the request list agree on Teammate vs SubAgent (keeps role subTypes) - subagents are no longer mis-tagged as Teammate: since 2.1.199 subagents get SendMessage too; isTeammate now trusts the wire id shape (named@ → Teammate, hex → SubAgent) and cc_is_subagent=true first - shared withAgentNameSubType helper; identityHeal narrows its skip; Pass B wire-agent coverage tests added

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-e12dcaded9"></a>
## [e12dcaded9](./cc-viewer-alignment-commit-ledger.md#commit-e12dcaded9) — ui(chat): PC composer polish — 1000px cap, themed strip, white card + shadow, focus-expand animation

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-07T16:20:04+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：5；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `src/global.css` → `src/global.css`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `const SpeechRec = typeof window !== 'undefined' && window.isSecureContext`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import RoleFilterBar from './RoleFilterBar';`; `class ChatView extends React.Component {`.
- Upstream commit message excerpt: - cap the chat column at 1400px and the composer card at 1000px (centered, responsive below) - new --bg-input-strip / --bg-composer / --shadow-composer tokens: light theme gets a light-gray strip (#F9F9F9) with a pure-white card and soft 8px shadow; dark theme keeps the strip at the page color (#0d0d0d) with the elevated card (#1e1e1e) - desktop textarea focus animates to two lines (height 0.2s ease), blurs back to content height (min one line); shared resizeChatTextarea helper (content-box clamp) replaces 7 raw autosize sites; mobile metrics/behavior unchanged

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-fcfef597dd"></a>
## [fcfef597dd](./cc-viewer-alignment-commit-ledger.md#commit-fcfef597dd) — ui(chat): scope the 1400px chat cap to message items via .container > *

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-07T16:20:04+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Replaces the previous .chatSectionFlex column cap, which also squeezed the input bar, approval panels, and other siblings. Now only direct children of the message scroller are width-limited (centered, responsive below); the input bar keeps its own 1000px rule and the scrollbar stays at the viewport edge. Works for both the plain and Virtuoso scrollers (shared .container).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-73e4b44ccd"></a>
## [73e4b44ccd](./cc-viewer-alignment-commit-ledger.md#commit-73e4b44ccd) — Merge pull request #139 from weiesky/feat/chat-composer-polish

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-07T07:10:05-04:00；父提交 2；相对第一父文件数 6。
- 上游生产/配置文件：5；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `src/global.css` → `src/global.css`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: ui(chat): PC 对话区样式优化 — 输入条主题化、限宽居中、聚焦扩展动画

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b78a51eb1d"></a>
## [b78a51eb1d](./cc-viewer-alignment-commit-ledger.md#commit-b78a51eb1d) — fix(system-prompt): bare k3 resolves to the Kimi entry (1.7.18)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-08T12:39:22+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`test/model-system-prompts.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `export function deleteModelPrompt(dir, name) {`; `export function matchModelPrompt(modelId, candidates) {`; `describe('model-system-prompts: 读写/列表/匹配', () => {`.
- Upstream commit message excerpt: Third-party proxies normalize k3[1m] → bare k3 at spawn, which never matched KIMI / KIMI-K3 entries (the match is id.includes(entryName), and "k3" contains neither). matchModelPrompt now expands a small alias table (k3 → k3 / kimi-k3 / kimi) before substring matching, so the Kimi preset actually injects for kimi-profile sessions; non-alias ids are untouched. Also ships the merged PR #139 composer polish as 1.7.18.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-94e110620d"></a>
## [94e110620d](./cc-viewer-alignment-commit-ledger.md#commit-94e110620d) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-10T04:52:55+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d88982c6ce"></a>
## [d88982c6ce](./cc-viewer-alignment-commit-ledger.md#commit-d88982c6ce) — fix(codefuse): exit managed CCV with Claude (1.7.19)

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-12T13:56:18+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：2；上游测试文件：2。
- 上游测试：`test/cli-boot.test.js`, `test/codefuse-managed-mode.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`cli.js` → `cli.js`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `async function runCliMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `function bootFixture({ startPort, endPort }) {`; `function parseLocalPort(out) {`; `describeCli('cli-boot: runCliMode 真实启动 → SIGINT 干净退出', { concu`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0c12335e53"></a>
## [0c12335e53](./cc-viewer-alignment-commit-ledger.md#commit-0c12335e53) — fix(release): bump package version to 1.7.20

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-12T16:12:40+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-69b104cbf3"></a>
## [69b104cbf3](./cc-viewer-alignment-commit-ledger.md#commit-69b104cbf3) — feat(system-prompt): type-ahead model names in "+ Add model" dialog (1.7.21)

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-16T11:11:26-04:00；父提交 1；相对第一父文件数 26。
- 上游生产/配置文件：5；上游测试文件：1。
- 上游测试：`test/model-suggestions.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `src/components/settings/ModelPromptTabs.jsx` → `src/components/settings/ModelPromptTabs.jsx`; `src/components/settings/SystemTextModal.jsx` → `src/components/settings/SystemTextModal.jsx`; `src/components/settings/SystemTextModal.module.css` → `src/components/settings/SystemTextModal.module.css`。
- B0 diff inspection: 16 distinct hunk context(s) extracted (up to 30): `The **Edit System Prompt** modal (hamburger menu → Edit System Prompt) is tabb`; `ccv -h`; `Modalen **Rediger systemprompt** (hamburgermenu → Rediger systemprompt) er opd`; `Das Modal **System-Prompt bearbeiten** (Hamburger-Menü → System-Prompt bearbe`; `El modal **Editar prompt del sistema** (menú de hamburguesa → Editar prompt d`; `La fenêtre modale **Modifier le prompt système** (menu hamburger → Modifier`; `La finestra modale **Modifica prompt di sistema** (menu hamburger → Modifica p`; `QR コードをスキャンしてモバイル端末からコーディングす`; `QR 코드를 스캔하여 모바일 디바이스에서도 코딩할 수 있습`; `Modalen **Rediger systemprompt** (hamburgermeny → Rediger systemprompt) er del`; `Okno modalne **Edytuj prompt systemowy** (menu hamburger → Edytuj prompt syste`; `O modal **Editar prompt do sistema** (menu de hambúrguer → Editar prompt do s`; `Mobil programlamaya dair hayallerinizi gerçekleştirin. Ayrıca bir eklenti mek`; `export default function ModelPromptTabs({`; `import { reportSwallowed } from '../../utils/errorReport';`; `export default function SystemTextModal({ open, onClose }) {`.
- Upstream commit message excerpt: The name field is now an AutoComplete fed by locally configured models: every hot-reload proxy profile mapping (incl. the default profile) plus settings.json model / env.ANTHROPIC_MODEL, with [1m] suffixes stripped. Names already added in the selected scope are hidden, free-form names still work, and Enter no longer submits the dialog or silently picks the first suggestion. Both fetches are non-fatal (reportSwallowed, empty on failure). Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7b0d3646d9"></a>
## [7b0d3646d9](./cc-viewer-alignment-commit-ledger.md#commit-7b0d3646d9) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-17T04:01:01+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-02ce99f202"></a>
## [02ce99f202](./cc-viewer-alignment-commit-ledger.md#commit-02ce99f202) — feat(system-prompt): auto header entry, model-aware default tab, chip icon

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-17T00:16:49-04:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：4；上游测试文件：2。
- 上游测试：`test/api-expert-model-prompts.test.js`, `test/api-expert-system-prompt-status.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `src/components/settings/SystemTextModal.jsx` → `src/components/settings/SystemTextModal.jsx`。
- B0 diff inspection: 12 distinct hunk context(s) extracted (up to 30): `import { readFileSync } from 'node:fs';`; `import {`; `function sendJson(res, code, obj) {`; `async function getModelPrompts(req, res, parsedUrl, isLocal, deps) {`; `export const expertRoutes = [`; `import { hasNativeZoom, isMac } from '../../env';`; `import { PINNED_KEY, parsePinned, serializePinned, togglePinned } from '../../ut`; `import DialogueIcon from '../common/DialogueIcon';`; `class AppHeader extends React.Component {`; `export default function SystemTextModal({ open, onClose }) {`; `process.env.CCV_CLI_MODE = '0';`; `describe('api expert model-prompts', () => {`.
- Upstream commit message excerpt: The Edit System Prompt entry (new chip icon, replacing the pencil) now auto-appears in the header toolbar (Web) and the native tab bar (Electron) whenever a custom prompt is configured to inject at the next launch — a model entry matching the currently resolved model (workspace or global scope), or the workspace Default sentinels — with no manual pinning needed, and hides again when nothing is in effect (manual pins are unaffected; CCV_DISABLE_AUTO_SYSTEM_PROMPT=1 suppresses it). Opening the modal preselects the tab of the entry matching the active model (e.g. k3 -> KIMI-K3), falling back to the Default tab when nothing matches. Backed by a new lightweight GET /api/expert/system-prompt-status endpoint and a matched/modelId pair on GET /api/expert/model-prompts, both computed server-side with the same resolver + matcher used at spawn (including the bare-k3 -> Kimi alias). The Electron tab-bar MENU_ICON renderer gains a per-icon { vb, path } override so the 1024-grid chip artwork renders…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5c468c042e"></a>
## [5c468c042e](./cc-viewer-alignment-commit-ledger.md#commit-5c468c042e) — fix: CVE-2026-13676 security vulnerability

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-17T04:30:14+00:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Automated dependency upgrade by OrbisAI Security

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ea8c5e39e0"></a>
## [ea8c5e39e0](./cc-viewer-alignment-commit-ledger.md#commit-ea8c5e39e0) — fix(test): cli-boot fixture shadows real /usr/local/bin/claude via PATH shim

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-17T00:48:40-04:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`test/cli-boot.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `function bootFixture({ startPort, endPort }) {`.
- Upstream commit message excerpt: On machines where an absolute NATIVE_CANDIDATES path exists (this dev box has /usr/local/bin/claude, a symlink to a .js cli.js), the spawned child escaped the fixture's PATH/HOME isolation: the .js symlink was treated as a native binary and exec'd directly, and its #!/usr/bin/env node shebang could not find node under the restricted PATH, so the CodeFuse-managed exit-code passthrough test got 127 instead of the fake claude's 7 (CI, lacking that file, stayed green; sibling cases never asserted fake-claude liveness, so the leak was masked). Add a fake `claude` shim to the fixture bin/ (restricted PATH): the child's `which claude` hits it before the absolute candidates — the sanctioned fixture seam per findcc.js L7 — and it execs the fake cli.js via an absolute node path. Side benefit: sibling boot cases now run against a genuinely resident fake claude instead of one that died instantly with 127. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3cc05b496d"></a>
## [3cc05b496d](./cc-viewer-alignment-commit-ledger.md#commit-3cc05b496d) — feat(proxy): per-role proxy sources for Main Agent / Sub-Agent / Teammate (1.7.22)

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-17T08:03:36-04:00；父提交 1；相对第一父文件数 53。
- 上游生产/配置文件：19；上游测试文件：11。
- 上游测试：`test/api-preferences-gap.test.js`, `test/branch-interceptor.test.js`, `test/interceptor-fetch-errors.test.js`, `test/interceptor-profile.test.js`, `test/interceptor-workspace-init.test.js`, `test/new-ui-i18n.test.js`, `test/proxy-profile-isolation.test.js`, `test/proxy-role-custom-endpoint.test.js`, `test/proxy-role-proxy-mode.test.js`, `test/proxy-role-routing.test.js`, `test/spawn-model-resolver.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `server/interceptor.js` → `interceptor.js`; `server/lib/interceptor-core.js` → `lib/interceptor-core.js`; `server/proxy.js` → `proxy.js`; `server/pty-manager.js` → `pty-manager.js`; `server/routes/preferences.js` → `lib/preferences.js`; `src/App.jsx` → `src/App.jsx`; `src/AppBase.jsx` → `src/AppBase.jsx`; `src/Mobile.jsx` → `src/Mobile.jsx`; `src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `src/components/settings/ProxyModal.jsx` → `src/components/settings/ProxyModal.jsx`; `src/components/settings/ProxyModal.module.css` → `src/components/settings/ProxyModal.module.css`; `src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `Once the instruction is done, 'findcc.js' will have been updated. If your projec`; `Configuration is stored at '~/.claude/cc-viewer/profile.json'. Click the folder`; `Et Vibe Coding-værktøjssæt destilleret fra egen udviklingserfaring og bygget`; `Ein Vibe-Coding-Toolkit, das aus eigener Entwicklungserfahrung destilliert und a`; `Un kit de herramientas de Vibe Coding destilado de la propia experiencia de desa`; `Une boîte à outils Vibe Coding distillée à partir de l'expérience de dével`; `Un toolkit Vibe Coding distillato dall'esperienza di sviluppo personale, costrui`; `Claude Code をベースに、自身の開発経験を蒸留・蓄積した Vibe`; `Claude Code를 기반으로, 자신의 개발 경험을 증류하여 축적한 V`; `Et Vibe Coding-verktøysett destillert fra egen utviklingserfaring og bygget på`; `Zestaw narzędzi Vibe Coding wydestylowany z własnego doświadczenia programist`; `Um kit de ferramentas de Vibe Coding destilado da própria experiência de desen`; `Claude Code üzerine inşa edilmiş, kendi geliştirme deneyiminden damıtılmı`; `LOG_DIR/<project>/sessions/<session_id>/`; `wire 上存在两种编码，**解析器与 S8 转换器必须都支持**：`; `the live channel structure — not localhost br bytes.`; `import './lib/proxy-env.js';`; `import { LOG_DIR } from '../findcc.js';`; `export let _cachedHaikuModel = null;`; `let _activeProfile = null; // { id, name, baseURL?, apiKey?, effort?, ANTHROPIC_`; `function _getActiveProfileFilePath() {`; `function _readWorkspaceActiveId() {`; `function _writeWorkspaceActiveId(activeId) {`; `function _loadProxyProfile() {`; `function setActiveProfileForWorkspace(activeId) {`; `function getActiveProfileId() {`; `function _replaceProxyAuthHeaders(headers, apiKey) {`; `try { watchFile(PROFILE_PATH, { interval: 1500 }, _loadProxyProfile); } catch {`; `export function initForWorkspace(projectPath, { forceNew = false } = {}) { // es`; `export function resetWorkspace() {`.
- Upstream commit message excerpt: Hot-switch dialog gains a Role Assignment section: Sub-Agent and Teammate can follow the Main Agent (default), use built-in Default, or point at their own profile. Workspace-scoped { activeId, roles } storage (merge + atomic write + watchFile sync), positive-only classification (cc_is_subagent / team marker / argv), official-endpoint dormancy, and role-aware routing in ccv proxy mode. Rewritten entries stamp proxyRole into the v2 journal for per-role stats. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9255663e33"></a>
## [9255663e33](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33) — fix: CVE-2026-39244 security vulnerability

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-17T13:35:58+00:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Automated dependency upgrade by OrbisAI Security

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6680d041d4"></a>
## [6680d041d4](./cc-viewer-alignment-commit-ledger.md#commit-6680d041d4) — feat(tools): sync tool catalog to Claude Code 2.1.233 — 21 new tools, MCP & Extensions category

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-17T22:46:51-04:00；父提交 1；相对第一父文件数 471。
- 上游生产/配置文件：2；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`src/i18n.js` → `src/i18n.js`; `src/utils/toolCatalog.js` → `src/utils/toolCatalog.js`。
- B0 diff inspection: 19 distinct hunk context(s) extracted (up to 30): `Nedenfor er det kategoriserede indeks over alle værktøjer.`; `Im Folgenden finden Sie den kategorisierten Index aller Tools.`; `Below is a categorized index of all tools.`; `A continuación se presenta el índice clasificado de todas las herramientas.`; `Voici l'index classifié de tous les outils.`; `Di seguito l'indice categorizzato di tutti gli strumenti.`; `Claude Code は Anthropic API の tool_use メカニズムを通じてモデル`; `Claude Code는 Anthropic API의 tool_use 메커니즘을 통해 모델에 일련`; `Nedenfor er en kategorisert indeks over alle verktøy.`; `Poniżej znajduje się kategoryzowany indeks wszystkich narzędzi.`; `A seguir está o índice categorizado de todas as ferramentas.`; `Claude Code предоставляет модели набор встроенн`; `Claude Code มอบชุดเครื่องมือในตัวใ`; `Aşağıda tüm araçların kategorize edilmiş dizini bulunmaktadır.`; `Claude Code надає моделі набір вбудованих інстру`; `Claude Code 透過 Anthropic API 的 tool_use 機制向模型提供一組內建`; `Claude Code 通过 Anthropic API 的 tool_use 机制向模型提供一组内置`; `const i18nData = {`; `export const TOOL_CATALOG = [`.
- Upstream commit message excerpt: - add concept docs for REPL, TodoWrite, SendFeedback, Projects, ProposeGoal, ReadNotifications, ListAgents, SendFile, SendUserFile, SendUserMessage, EndConversation, ReadMcpResource/ReadMcpResourceDir/ListMcpResources, and the registry-discovery seven (SearchMcpRegistry, SuggestConnectors, ListConnectors, SuggestPluginInstall, SuggestSkills, ListPlugins, ListSkills) - drop TeamCreate/TeamDelete/getDiagnostics/executeCode (removed upstream; ToolSearch kept pending confirmation) - new "MCP & Extensions" category (ui.toolCatalog.cat.mcp, 18 locales): 57 tools total with concept docs in all 18 languages Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a97d0f8adf"></a>
## [a97d0f8adf](./cc-viewer-alignment-commit-ledger.md#commit-a97d0f8adf) — docs(concepts): "Activation" sections for gated tools in all 18 locales

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-18T06:19:09-04:00；父提交 1；相对第一父文件数 560。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`test/tool-activation-concepts.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `ListAgents()`; `ListConnectors(keywords=["github"])`; `ListPlugins(keywords=["figma"])`; `SearchMcpRegistry(keywords=["linear", "issue tracker"])`; `SendFile(`; `SendUserFile(`; `SendUserMessage(`; `SuggestConnectors(uuids=["d290f1ee-6c54-4b01-90e6-d701748f0851", "a1b2c3d4-0000-`; `SuggestPluginInstall(`; `SuggestSkills(keywords=["data visualization", "charts"], contextLabel="For build`; `Render en HTML- eller Markdown-fil til et Artifact — en privat webside hostet`; `Dette er en sidste-udvej-handling: værktøjets egne regler kræver, at man adva`; `Forespørger Language Server Protocol-servere (LSP) for kodeintelligens — defi`; `Lister de agenter, du kan 'SendMessage' til: in-process-subagenter, du har start`; `Hver række udskriver et navn — det navn er adressen. Send med 'SendMessage({t`; `Lister de MCP-connectors, der er installeret til brugerens claude.ai-organisatio`; `Lister de ressourcer, der eksponeres af forbundne MCP-servere, eventuelt filtrer`; `Lister brugerens aktiverede claude.ai-plugins, eventuelt filtreret efter nøgleo`; `Lister brugerens aktiverede claude.ai-skills, eventuelt filtreret efter nøgleor`; `Starter en baggrundsmonitor, der streamer hændelser fra et langvarigt script. H`; `Foreslår et verificerbart færdiggørelsesmål for sessionen. Målet vises til`; `Send ikke en notifikation for rutinemæssige statusopdateringer midt i en opgave`; `Udfører JavaScript i en vedvarende Node.js vm-kontekst inde i sessionen. Top-ni`; `Læser en enkelt resource, der eksponeres af en forbundet MCP-server (Model Cont`; `Lister posterne i en mappeagtig resource, der eksponeres af en forbundet MCP-ser`; `Kalder claude.ai's fjernudløser-API for at administrere planlagte opgaver og on`; `Planlægger hvornår arbejdet skal genoptages i '/loop' dynamisk tilstand. Værk`; `Søger i MCP-connector-registret efter nøgleord for at opdage connectors, der k`; `Returnerer registerposter, hvis connectors matcher nøgleordene. Opløs fulde co`; `Sender en eller flere filer til en anden Claude Code-session — en peer, der er`.
- Upstream commit message excerpt: 31 tool concept docs gain a translated Activation section between When to Use and Parameters documenting enablement: user-settable env vars (CLAUDE_CODE_REPL, CLAUDE_CODE_ENABLE_TODO_TOOLS, CLAUDE_CODE_ENABLE_TASKS, CLAUDE_CODE_HARBOR_KITE, CLAUDE_CODE_DISABLE_ARTIFACT, ...), provider availability (Amazon Bedrock / Claude Platform on AWS / Google Cloud / Microsoft Foundry), plan tiers, entrypoint and Remote Control requirements, and generic "server-side feature flag" notes (no internal flag names) — grounded in a Claude Code 2.1.234 binary tool-gating audit plus official docs. Availability bullets previously buried in Notes (ListAgents, SendFile, SendUserFile, SendUserMessage, SearchMcpRegistry, SuggestConnectors, ListConnectors, SuggestPluginInstall, SuggestSkills, ListPlugins) move into the new section. Three legacy heading variants normalized to the locale standard (ar/de/no LSP, da Artifact/LSP), and th Tool-WebSearch's legacy divergent structure aligned to the standard layout. New…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3f141cb974"></a>
## [3f141cb974](./cc-viewer-alignment-commit-ledger.md#commit-3f141cb974) — Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-18T06:40:50-04:00；父提交 2；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix: upgrade adm-zip to 0.6.0 (CVE-2026-39244)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9f4e329be4"></a>
## [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4) — Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-18T06:42:07-04:00；父提交 2；相对第一父文件数 759。
- 上游生产/配置文件：20；上游测试文件：13。
- 上游测试：`test/api-preferences-gap.test.js`, `test/branch-interceptor.test.js`, `test/cli-boot.test.js`, `test/interceptor-fetch-errors.test.js`, `test/interceptor-profile.test.js`, `test/interceptor-workspace-init.test.js`, `test/new-ui-i18n.test.js`, `test/proxy-profile-isolation.test.js`, `test/proxy-role-custom-endpoint.test.js`, `test/proxy-role-proxy-mode.test.js`, `test/proxy-role-routing.test.js`, `test/spawn-model-resolver.test.js`, `test/tool-activation-concepts.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `server/interceptor.js` → `interceptor.js`; `server/lib/interceptor-core.js` → `lib/interceptor-core.js`; `server/proxy.js` → `proxy.js`; `server/pty-manager.js` → `pty-manager.js`; `server/routes/preferences.js` → `lib/preferences.js`; `src/App.jsx` → `src/App.jsx`; `src/AppBase.jsx` → `src/AppBase.jsx`; `src/Mobile.jsx` → `src/Mobile.jsx`; `src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `src/components/settings/ProxyModal.jsx` → `src/components/settings/ProxyModal.jsx`; `src/components/settings/ProxyModal.module.css` → `src/components/settings/ProxyModal.module.css`; `src/i18n.js` → `src/i18n.js`; `src/utils/toolCatalog.js` → `src/utils/toolCatalog.js`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `@`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-721e2c9940"></a>
## [721e2c9940](./cc-viewer-alignment-commit-ledger.md#commit-721e2c9940) — Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-18T06:42:17-04:00；父提交 2；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix: upgrade fast-uri to 4.0.1, 3.1.3, 2.4.2 (CVE-2026-13676)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-817dc87a8e"></a>
## [817dc87a8e](./cc-viewer-alignment-commit-ledger.md#commit-817dc87a8e) — bump version to 1.7.23

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-19T10:49:45+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-dabc5232ce"></a>
## [dabc5232ce](./cc-viewer-alignment-commit-ledger.md#commit-dabc5232ce) — chore(pnpm): migrate package manager from npm to pnpm 11.22 (stage A1)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:27:51-04:00；父提交 1；相对第一父文件数 10。
- 上游生产/配置文件：2；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`build.js` → `build.js`; `package.json` → `package.json`。
- B0 diff inspection: 6 distinct hunk context(s) extracted (up to 30): `jobs:`; `When adding new interactive controls, remember to add corresponding i18n entries`; `The suite has two tiers:`; `import { fileURLToPath } from 'node:url';`; `const __dirname = dirname(fileURLToPath(import.meta.url));`; `console.log('🔨 正在执行 Vite 构建...');`.
- Upstream commit message excerpt: - packageManager pin pnpm@11.22.0; settings-only pnpm-workspace.yaml (allowBuilds for the 6 build-script deps; axios/qs/node-gyp overrides, duplicated in package.json for the npm-based Electron CI job until A2) - replace package-lock.json with pnpm-lock.yaml (fidelity gate: 956/956 packages, zero version drift against package-lock) - build.js: invoke vite bin via execFileSync(process.execPath, ...) with no shell — immune to both npm-flat and pnpm-strict node_modules layouts - ci.yml: pnpm/action-setup + install --frozen-lockfile --ignore-scripts, keep explicit pnpm rebuild node-pty (allowlist is bypassed by --ignore-scripts) - release.yml: npm-publish job installs via pnpm but still publishes with npm publish --provenance (OIDC trusted publishing is npm-only); the Electron job stays on npm until A2's hoisted-linker switch (documented) - CLAUDE.md/CONTRIBUTING.md: pnpm commands, Node >=22.13 toolchain floor, allowBuilds maintenance rule - add migration plan docs/refactor/pnpm-monorepo-m…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-e3ca28c52d"></a>
## [e3ca28c52d](./cc-viewer-alignment-commit-ledger.md#commit-e3ca28c52d) — refactor(monorepo): split into apps/{web,electron} + packages/app workspace layout (stage A2)

- B0 snapshot comparison: 612 candidate paths compared against the final upstream snapshot; 146 exact blob matches: `apps/electron/electron/menu-model.js` = `electron/menu-model.js`; `apps/electron/electron/tab-preload.js` = `electron/tab-preload.js`; `apps/electron/electron/window-state.js` = `electron/window-state.js`; `apps/electron/electron/workspace-preload.js` = `electron/workspace-preload.js`; `apps/web/public/voice-packs/default/A_choice_for_your_consideration_sir.MP3` = `public/voice-packs/default/A_choice_for_your_consideration_sir.MP3`; `apps/web/public/voice-packs/default/It_is_done_sir.MP3` = `public/voice-packs/default/It_is_done_sir.MP3`; `apps/web/public/voice-packs/default/The_plan_awaits_your_approval_sir.MP3` = `public/voice-packs/default/The_plan_awaits_your_approval_sir.MP3`; `apps/web/public/voice-packs/sanguo/ask.MP3` = `public/voice-packs/sanguo/ask.MP3`; `apps/web/public/voice-packs/sanguo/end.MP3` = `public/voice-packs/sanguo/end.MP3`; `apps/web/public/voice-packs/sanguo/plan.MP3` = `public/voice-packs/sanguo/plan.MP3`; `apps/web/src/components/chat/controllers/scrollHighlightController.js` = `src/components/chat/controllers/scrollHighlightController.js`; `apps/web/src/components/common/ConceptHelp.module.css` = `src/components/common/ConceptHelp.module.css`; `apps/web/src/components/common/ConfirmRemoveButton.jsx` = `src/components/common/ConfirmRemoveButton.jsx`; `apps/web/src/components/common/CountryFlag.jsx` = `src/components/common/CountryFlag.jsx`; `apps/web/src/components/common/CountryFlag.module.css` = `src/components/common/CountryFlag.module.css`; `apps/web/src/components/common/DingTalkIcon.jsx` = `src/components/common/DingTalkIcon.jsx`; `apps/web/src/components/common/DiscordIcon.jsx` = `src/components/common/DiscordIcon.jsx`; `apps/web/src/components/common/FeishuIcon.jsx` = `src/components/common/FeishuIcon.jsx`; `apps/web/src/components/common/HoverPreviewTip.jsx` = `src/components/common/HoverPreviewTip.jsx`; `apps/web/src/components/common/ImageLightbox.module.css` = `src/components/common/ImageLightbox.module.css`; `apps/web/src/components/common/OpenFolderIcon.module.css` = `src/components/common/OpenFolderIcon.module.css`; `apps/web/src/components/common/PanelResizer.jsx` = `src/components/common/PanelResizer.jsx`; `apps/web/src/components/common/PanelResizer.module.css` = `src/components/common/PanelResizer.module.css`; `apps/web/src/components/common/RefreshIcon.jsx` = `src/components/common/RefreshIcon.jsx`; `apps/web/src/components/common/RefreshIcon.module.css` = `src/components/common/RefreshIcon.module.css`; `apps/web/src/components/common/SnapLineOverlay.jsx` = `src/components/common/SnapLineOverlay.jsx`; `apps/web/src/components/common/SnapLineOverlay.module.css` = `src/components/common/SnapLineOverlay.module.css`; `apps/web/src/components/common/ToolsHelp.module.css` = `src/components/common/ToolsHelp.module.css`; `apps/web/src/components/common/WeComIcon.jsx` = `src/components/common/WeComIcon.jsx`; `apps/web/src/components/dashboard/WorkflowRunsPanel.jsx` = `src/components/dashboard/WorkflowRunsPanel.jsx`; `apps/web/src/components/dashboard/WorkflowRunsPanel.module.css` = `src/components/dashboard/WorkflowRunsPanel.module.css`; `apps/web/src/components/files/FileContentView.module.css` = `src/components/files/FileContentView.module.css`; `apps/web/src/components/files/MdxEditorPanel.base.css` = `src/components/files/MdxEditorPanel.base.css`; `apps/web/src/components/git/DiffMiniMap.jsx` = `src/components/git/DiffMiniMap.jsx`; `apps/web/src/components/git/DiffMiniMap.module.css` = `src/components/git/DiffMiniMap.module.css`; `apps/web/src/components/git/FullFileDiffView.jsx` = `src/components/git/FullFileDiffView.jsx`; `apps/web/src/components/git/FullFileDiffView.module.css` = `src/components/git/FullFileDiffView.module.css`; `apps/web/src/components/git/GitDiffView.module.css` = `src/components/git/GitDiffView.module.css`; `apps/web/src/components/mobile/MobileFileExplorer.module.css` = `src/components/mobile/MobileFileExplorer.module.css`; `apps/web/src/components/mobile/MobileGitDiff.module.css` = `src/components/mobile/MobileGitDiff.module.css`; `apps/web/src/components/mobile/MobileStats.module.css` = `src/components/mobile/MobileStats.module.css`; `apps/web/src/components/settings/ImPlatformSettings.module.css` = `src/components/settings/ImPlatformSettings.module.css`; `apps/web/src/components/settings/MessagingModal.module.css` = `src/components/settings/MessagingModal.module.css`; `apps/web/src/components/settings/PreferencesForm.module.css` = `src/components/settings/PreferencesForm.module.css`; `apps/web/src/components/settings/ProcessModal.module.css` = `src/components/settings/ProcessModal.module.css`; `apps/web/src/components/settings/ProjectPrefsManagerModal.module.css` = `src/components/settings/ProjectPrefsManagerModal.module.css`; `apps/web/src/components/terminal/CustomUltraplanEditModal.module.css` = `src/components/terminal/CustomUltraplanEditModal.module.css`; `apps/web/src/components/terminal/PresetExpertPickerModal.module.css` = `src/components/terminal/PresetExpertPickerModal.module.css`; `apps/web/src/components/terminal/PresetModal.jsx` = `src/components/terminal/PresetModal.jsx`; `apps/web/src/components/terminal/UltraplanExpertManagerModal.jsx` = `src/components/terminal/UltraplanExpertManagerModal.jsx`; `apps/web/src/components/terminal/UltraplanExpertManagerModal.module.css` = `src/components/terminal/UltraplanExpertManagerModal.module.css`; `apps/web/src/components/terminal/terminalThemes.js` = `src/components/terminal/terminalThemes.js`; `apps/web/src/components/viewers/ImageViewer.module.css` = `src/components/viewers/ImageViewer.module.css`; `apps/web/src/components/viewers/JsonViewer.jsx` = `src/components/viewers/JsonViewer.jsx`; `apps/web/src/components/viewers/JsonViewer.module.css` = `src/components/viewers/JsonViewer.module.css`; `apps/web/src/components/viewers/MarkdownBlock.jsx` = `src/components/viewers/MarkdownBlock.jsx`; `apps/web/src/components/viewers/MarkdownBlock.module.css` = `src/components/viewers/MarkdownBlock.module.css`; `apps/web/src/components/viewers/WorkflowLiveHud.jsx` = `src/components/viewers/WorkflowLiveHud.jsx`; `apps/web/src/components/viewers/WorkflowPanel.jsx` = `src/components/viewers/WorkflowPanel.jsx`; `apps/web/src/components/viewers/WorkflowTimeline.jsx` = `src/components/viewers/WorkflowTimeline.jsx`; `apps/web/src/hooks/useMarkdownExport.js` = `src/hooks/useMarkdownExport.js`; `apps/web/src/hooks/useMermaidRender.js` = `src/hooks/useMermaidRender.js`; `apps/web/src/hooks/useSessionStoragePersistedSet.js` = `src/hooks/useSessionStoragePersistedSet.js`; `apps/web/src/i18n/mdxTranslations.js` = `src/i18n/mdxTranslations.js`; `apps/web/src/img/ccv-logo.png` = `src/img/ccv-logo.png`; `apps/web/src/img/claude/entrance.svg` = `src/img/codex/entrance.svg`; `apps/web/src/img/claude/exit.svg` = `src/img/codex/exit.svg`; `apps/web/src/img/claude/orbiting.svg` = `src/img/codex/orbiting.svg`; `apps/web/src/img/claude/shimmer.svg` = `src/img/codex/shimmer.svg`; `apps/web/src/img/claude/thinking.svg` = `src/img/codex/thinking.svg`; `apps/web/src/img/claude/tickle.svg` = `src/img/codex/tickle.svg`; `apps/web/src/img/claude/waiting.svg` = `src/img/codex/waiting.svg`; `apps/web/src/img/claude/writing.svg` = `src/img/codex/writing.svg`; `apps/web/src/img/default-avatar.svg` = `src/img/default-avatar.svg`; `apps/web/src/img/default-model-avatar.svg` = `src/img/default-model-avatar.svg`; `apps/web/src/img/loading-pet.gif` = `src/img/loading-pet.gif`; `apps/web/src/img/model-deepseek.svg` = `src/img/model-deepseek.svg`; `apps/web/src/img/model-gemini.svg` = `src/img/model-gemini.svg`; `apps/web/src/img/model-glm.svg` = `src/img/model-glm.svg`; `apps/web/src/img/model-minimax.svg` = `src/img/model-minimax.svg`; `apps/web/src/img/model-openai.svg` = `src/img/model-openai.svg`; `apps/web/src/img/model-qwen.svg` = `src/img/model-qwen.svg`; `apps/web/src/img/teammates/analyst.svg` = `src/img/teammates/analyst.svg`; `apps/web/src/img/teammates/auditor.svg` = `src/img/teammates/auditor.svg`; `apps/web/src/img/teammates/builder.svg` = `src/img/teammates/builder.svg`; `apps/web/src/img/teammates/default.svg` = `src/img/teammates/default.svg`; `apps/web/src/img/teammates/designer.svg` = `src/img/teammates/designer.svg`; `apps/web/src/img/teammates/executor.svg` = `src/img/teammates/executor.svg`; `apps/web/src/img/teammates/expert.svg` = `src/img/teammates/expert.svg`; `apps/web/src/img/teammates/explorer.svg` = `src/img/teammates/explorer.svg`; `apps/web/src/img/teammates/implementer.svg` = `src/img/teammates/implementer.svg`; `apps/web/src/img/teammates/investigator.svg` = `src/img/teammates/investigator.svg`; `apps/web/src/img/teammates/marvel/analyst.svg` = `src/img/teammates/marvel/analyst.svg`; `apps/web/src/img/teammates/marvel/auditor.svg` = `src/img/teammates/marvel/auditor.svg`; `apps/web/src/img/teammates/marvel/builder.svg` = `src/img/teammates/marvel/builder.svg`; `apps/web/src/img/teammates/marvel/default.svg` = `src/img/teammates/marvel/default.svg`; `apps/web/src/img/teammates/marvel/designer.svg` = `src/img/teammates/marvel/designer.svg`; `apps/web/src/img/teammates/marvel/executor.svg` = `src/img/teammates/marvel/executor.svg`; `apps/web/src/img/teammates/marvel/expert.svg` = `src/img/teammates/marvel/expert.svg`; `apps/web/src/img/teammates/marvel/explorer.svg` = `src/img/teammates/marvel/explorer.svg`; `apps/web/src/img/teammates/marvel/implementer.svg` = `src/img/teammates/marvel/implementer.svg`; `apps/web/src/img/teammates/marvel/investigator.svg` = `src/img/teammates/marvel/investigator.svg`; `apps/web/src/img/teammates/marvel/researcher.svg` = `src/img/teammates/marvel/researcher.svg`; `apps/web/src/img/teammates/marvel/reviewer.svg` = `src/img/teammates/marvel/reviewer.svg`; `apps/web/src/img/teammates/marvel/scanner.svg` = `src/img/teammates/marvel/scanner.svg`; `apps/web/src/img/teammates/marvel/security.svg` = `src/img/teammates/marvel/security.svg`; `apps/web/src/img/teammates/marvel/tracer.svg` = `src/img/teammates/marvel/tracer.svg`; `apps/web/src/img/teammates/marvel/translator.svg` = `src/img/teammates/marvel/translator.svg`; `apps/web/src/img/teammates/marvel/worker.svg` = `src/img/teammates/marvel/worker.svg`; `apps/web/src/img/teammates/researcher.svg` = `src/img/teammates/researcher.svg`; `apps/web/src/img/teammates/reviewer.svg` = `src/img/teammates/reviewer.svg`; `apps/web/src/img/teammates/scanner.svg` = `src/img/teammates/scanner.svg`; `apps/web/src/img/teammates/security.svg` = `src/img/teammates/security.svg`; `apps/web/src/img/teammates/tracer.svg` = `src/img/teammates/tracer.svg`; `apps/web/src/img/teammates/translator.svg` = `src/img/teammates/translator.svg`; `apps/web/src/img/teammates/worker.svg` = `src/img/teammates/worker.svg`; `apps/web/src/main.jsx` = `src/main.jsx`; `apps/web/src/tokenInterceptor.js` = `src/tokenInterceptor.js`; `apps/web/src/utils/askFallback.js` = `src/utils/askFallback.js`; `apps/web/src/utils/builtinPresets.js` = `src/utils/builtinPresets.js`; `apps/web/src/utils/contextSidebarNavigation.js` = `src/utils/contextSidebarNavigation.js`; `apps/web/src/utils/displayScaleHelper.js` = `src/utils/displayScaleHelper.js`; `apps/web/src/utils/gitTreeBuilder.js` = `src/utils/gitTreeBuilder.js`; `apps/web/src/utils/imTr.js` = `src/utils/imTr.js`; `apps/web/src/utils/imageCompress.js` = `src/utils/imageCompress.js`; `apps/web/src/utils/imageDownscale.js` = `src/utils/imageDownscale.js`; `apps/web/src/utils/lazyWithReload.js` = `src/utils/lazyWithReload.js`; `apps/web/src/utils/markdownIncremental.js` = `src/utils/markdownIncremental.js`; `apps/web/src/utils/markdownProfiler.js` = `src/utils/markdownProfiler.js`; `apps/web/src/utils/mdExtensionDetect.js` = `src/utils/mdExtensionDetect.js`; `apps/web/src/utils/monotime.js` = `src/utils/monotime.js`; `apps/web/src/utils/presetShortcuts.js` = `src/utils/presetShortcuts.js`; `apps/web/src/utils/quickMenuHoverIntent.js` = `src/utils/quickMenuHoverIntent.js`; `apps/web/src/utils/resizeCalc.js` = `src/utils/resizeCalc.js`; `apps/web/src/utils/resolveLocalized.js` = `src/utils/resolveLocalized.js`; `apps/web/src/utils/searchReplace.js` = `src/utils/searchReplace.js`; `apps/web/src/utils/splitDragCalc.js` = `src/utils/splitDragCalc.js`; `apps/web/src/utils/svgSanitize.js` = `src/utils/svgSanitize.js`; `apps/web/src/utils/systemTags.js` = `src/utils/systemTags.js`; `apps/web/src/utils/teammateAvatars.js` = `src/utils/teammateAvatars.js`; `apps/web/src/utils/terminalClipboard.js` = `src/utils/terminalClipboard.js`; `apps/web/src/utils/thinkingMerge.js` = `src/utils/thinkingMerge.js`; `apps/web/src/utils/ultraplanExperts.js` = `src/utils/ultraplanExperts.js`; `apps/web/src/utils/workflowFormat.js` = `src/utils/workflowFormat.js`; `apps/web/src/utils/workflowStore.js` = `src/utils/workflowStore.js`; `packages/app/plugins/.gitkeep` = `plugins/.gitkeep`. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:00-04:00；父提交 1；相对第一父文件数 2398。
- 上游生产/配置文件：463；上游测试文件：456。
- 上游测试：`test/agent-id.test.js`, `test/ansi-safe-slice.test.js`, `test/api-ask-perm-extra.test.js`, `test/api-auth.test.js`, `test/api-base-path.test.js`, `test/api-ccswitch-import.test.js`, `test/api-claude-md.test.js`, `test/api-dingtalk-gap.test.js`, `test/api-dingtalk.test.js`, `test/api-events-gap.test.js`, `test/api-expert-model-prompts.test.js`, `test/api-expert-system-prompt-status.test.js`, `test/api-expert-system-text.test.js`, `test/api-files-content.test.js`, `test/api-files-fs-2.test.js`, `test/api-files-fs.test.js`, `test/api-git-routes.test.js`, `test/api-im.test.js`, `test/api-logs-gap.test.js`, `test/api-plugins-gap.test.js`, `test/api-preferences-gap.test.js`, `test/api-preferences.test.js`, `test/api-project-memory.test.js`, `test/api-project-meta-gap.test.js`, `test/api-proxy-profiles.test.js`, `test/api-proxy-stats.test.js`, `test/api-retry-config.test.js`, `test/api-skills-gap.test.js`, `test/api-team-routes.test.js`, `test/api-ultra-agents-gap.test.js`, `test/api-url-gap.test.js`, `test/api-v2-requests.test.js`, `test/api-voice-pack-gap.test.js`, `test/api-workspaces.test.js`, `test/approval-modal-prefs.test.js`, `test/ask-bridge.test.js`, `test/ask-fallback.test.js`, `test/ask-flow-controller.test.js`, `test/ask-no-timeout-invariants.test.js`, `test/ask-portal-matcher.test.js`, `test/ask-reaper.test.js`, `test/ask-store.test.js`, `test/askOptionDesc.test.js`, `test/async-file-lock.test.js`, `test/async-write-queue.test.js`, `test/auth-lib.test.js`, `test/auto-approve-options.test.js`, `test/avatar-animation-post-pass.test.js`, `test/bar-chart-helpers.test.js`, `test/base-path-lib.test.js`, `test/branch-cli.test.js`, `test/branch-interceptor.test.js`, `test/branch-lib-adapters-dingtalk-adapter.test.js`, `test/branch-lib-adapters-discord-adapter.test.js`, `test/branch-lib-adapters-feishu-adapter.test.js`, `test/branch-lib-adapters-wecom-adapter.test.js`, `test/branch-lib-ask-bridge.test.js`, `test/branch-lib-ask-store.test.js`, `test/branch-lib-async-file-lock.test.js`, `test/branch-lib-ccv-editor.test.js`, `test/branch-lib-claude-md-discovery.test.js`, `test/branch-lib-delta-reconstructor.test.js`, `test/branch-lib-ensure-hooks.test.js`, `test/branch-lib-file-access-policy.test.js`, `test/branch-lib-git-diff.test.js`, `test/branch-lib-im-bridge-core.test.js`, `test/branch-lib-im-deny.test.js`, `test/branch-lib-im-log-watcher.test.js`, `test/branch-lib-im-process-manager.test.js`, `test/branch-lib-im-senders.test.js`, `test/branch-lib-log-stream.test.js`, `test/branch-lib-perm-bridge.test.js`, `test/branch-lib-proxy-env.test.js`, `test/branch-lib-sdk-manager.test.js`, `test/branch-lib-session-transcript-reader.test.js`, `test/branch-lib-stats-worker.test.js`, `test/branch-lib-team-runtime.test.js`, `test/branch-lib-turn-end-bridge.test.js`, `test/branch-lib-updater.test.js`, `test/branch-lib-user-profile.test.js`, `test/branch-lib-voice-pack-manager.test.js`, `test/branch-lib-ws-backpressure.test.js`, `test/branch-proxy.test.js`, `test/branch-pty-manager.test.js`, `test/branch-routes-ask-perm.test.js`, `test/branch-routes-auth.test.js`, `test/branch-routes-events.test.js`, `test/branch-routes-files-content.test.js`, `test/branch-routes-files-fs.test.js`, `test/branch-routes-im.test.js`, `test/branch-routes-plugins.test.js`, `test/branch-routes-preferences.test.js`, `test/branch-routes-skills.test.js`, `test/branch-routes-team.test.js`, `test/branch-routes-voice-pack.test.js`, `test/branch-routes-workspaces.test.js`, `test/branch-server.test.js`, `test/branch-utils-commandValidator.test.js`, `test/branch-utils-entry-slim.test.js`, `test/branch-utils-ingestPipeline.test.js`, `test/branch-utils-projectAlias.test.js`, `test/branch-utils-promptClassifier.test.js`, `test/branch-utils-sessionManager.test.js`, `test/branch-utils-sessionMerge.test.js`, `test/branch-utils-stickyBottomController.test.js`, `test/branch-utils-teamModalBuilder.test.js`, `test/branch-utils-teamSessionParser.test.js`, `test/branch-utils-teammateDetector.test.js`, `test/branch-utils-terminalWriteQueue.test.js`, `test/branch-utils-ultraplanController.test.js`, `test/branch-utils-userImageRefs.test.js`, `test/branch-utils-voicePackPlayer.test.js`, `test/branch-workspace-registry.test.js`, `test/builtin-presets.test.js`, `test/ccswitch-import.test.js`, `test/ccv-editor.test.js`, `test/ccv-projects.test.js`, `test/claude-lookup-test-guard.test.js`, `test/claude-md-discovery.test.js`, `test/clearCheckpoint.test.js`, `test/cli-boot.test.js`, `test/cli-deep.test.js`, `test/cli-extra.test.js`, `test/cli-import-paths.test.js`, `test/cli-inject.test.js`, `test/cli-modes.test.js`, `test/cli.test.js`, `test/client-safe-imports.test.js`, `test/code-replace.test.js`, `test/code-search.test.js`, `test/codefuse-managed-mode.test.js`, `test/commandValidator.test.js`, `test/compact-result-preview.test.js`, `test/config-backup.test.js`, `test/content-filter-unit.test.js`, `test/context-i18n.test.js`, `test/context-raw.test.js`, `test/context-rules.test.js`, `test/context-sidebar-nav-gap.test.js`, `test/context-sidebar-navigation.test.js`, `test/context-turns.test.js`, `test/context-watcher.test.js`, `test/cross-request-toolresult.test.js`, `test/delta-e2e.test.js`, `test/delta-reconstructor.test.js`, `test/delta-reorder.test.js`, `test/dingtalk-adapter-deep.test.js`, `test/dingtalk-bridge.test.js`, `test/dingtalk-config.test.js`, `test/discord-bridge.test.js`, `test/discord-config.test.js`, `test/display-scale-helper.test.js`, `test/electron-diag.test.js`, `test/electron-node-execpath-regression.test.js`, `test/enrich-plan-input.test.js`, `test/enrich-workflow.test.js`, `test/ensure-hooks-deep.test.js`, `test/ensure-hooks.test.js`, `test/entry-cache.test.js`, `test/entry-slim.test.js`, `test/error-report.test.js`, `test/events-backpressure.test.js`, `test/events-deep.test.js`, `test/events-kv-context-scan.test.js`, `test/expert-i18n.test.js`, `test/extract-team-sessions.test.js`, `test/feishu-bridge.test.js`, `test/feishu-config.test.js`, `test/file-access-policy.test.js`, `test/file-api-gap.test.js`, `test/file-open.test.js`, `test/fileExpandedPathsStorage.test.js`, `test/files-fs-deep.test.js`, `test/findcc-gap.test.js`, `test/findcc.test.js`, `test/formatters-gap.test.js`, `test/formatters.test.js`, `test/git-api.test.js`, `test/git-diff.test.js`, `test/git-restore.test.js`, `test/git-tree-builder.test.js`, `test/git-unpushed.test.js`, `test/helpers-unit-a.test.js`, `test/helpers-unit-b.test.js`, `test/helpers.test.js`, `test/identity-heal.test.js`, `test/im-append-system-seed.test.js`, `test/im-bridge-core-deep.test.js`, `test/im-bridge-core.test.js`, `test/im-conn-state.test.js`, `test/im-connection-state.test.js`, `test/im-deny.test.js`, `test/im-lang.test.js`, `test/im-live-text.test.js`, `test/im-lock-gap.test.js`, `test/im-lock.test.js`, `test/im-origin.test.js`, `test/im-process-manager.test.js`, `test/im-routes-gap.test.js`, `test/im-senders.test.js`, `test/im-skills.test.js`, `test/im-spawn-test-guard.test.js`, `test/im-status-i18n.test.js`, `test/im-tr.test.js`, `test/image-compress.test.js`, `test/image-downscale.test.js`, `test/image-resize-unit.test.js`, `test/image-resize.test.js`, `test/import-file-api.test.js`, `test/incremental-merge.test.js`, `test/ingest-pipeline.test.js`, `test/inject-output-config-effort.test.js`, `test/install-method.test.js`, `test/interaction-ownership.test.js`, `test/interceptor-continuation-sync.test.js`, `test/interceptor-core-mainagent.test.js`, `test/interceptor-fetch-errors.test.js`, `test/interceptor-fetch.test.js`, `test/interceptor-import-arms.test.js`, `test/interceptor-imworker-init.test.js`, `test/interceptor-live.test.js`, `test/interceptor-profile.test.js`, `test/interceptor-seq-producer.test.js`, `test/interceptor-seq-teammate.test.js`, `test/interceptor-teammate-init.test.js`, `test/interceptor-v2-write.test.js`, `test/interceptor-workspace-init.test.js`, `test/interceptor.test.js`, `test/kv-cache-analyzer.test.js`, `test/lazy-with-reload.test.js`, `test/loaded-skills-parser.test.js`, `test/log-management-gap.test.js`, `test/log-management-i18n.test.js`, `test/log-management.test.js`, `test/log-stream.test.js`, `test/log-zip.test.js`, `test/logdir-test-guard.test.js`, `test/lr-messages-dedup.test.js`, `test/markdown-incremental.test.js`, `test/markdown-profiler-gap.test.js`, `test/markdown-profiler-gap2.test.js`, `test/markdown-profiler.test.js`, `test/markdown-util.test.js`, `test/md-extension-detect.test.js`, `test/mdx-translations.test.js`, `test/memoryLinkParser.test.js`, `test/menu-model.test.js`, `test/migrate-prompt-i18n.test.js`, `test/migrate-prompt.test.js`, `test/modal-mask.test.js`, `test/model-suggestions.test.js`, `test/model-system-prompts.test.js`, `test/native-teammate-detector.test.js`, `test/new-ui-i18n.test.js`, `test/pending-asks-filter.test.js`, `test/perm-bridge.test.js`, `test/permission-controller.test.js`, `test/permission-detect.test.js`, `test/pid-alive.test.js`, `test/pinned-menu.test.js`, `test/plan-approve-option.test.js`, `test/plugin-loader.test.js`, `test/plugin-manager-gap.test.js`, `test/preset-shortcuts.test.js`, `test/project-prefs.test.js`, `test/projectAlias.test.js`, `test/prompt-classifier-gap.test.js`, `test/prompt-detect.test.js`, `test/promptNav.test.js`, `test/proxy-env.test.js`, `test/proxy-errors.test.js`, `test/proxy-profile-isolation.test.js`, `test/proxy-retry-cancel.test.js`, `test/proxy-retry-stream-idle.test.js`, `test/proxy-retry.test.js`, `test/proxy-role-custom-endpoint.test.js`, `test/proxy-role-proxy-mode.test.js`, `test/proxy-role-routing.test.js`, `test/proxy-server.test.js`, `test/proxy-stats.test.js`, `test/proxy-unit.test.js`, `test/pty-chunk-builder-gap.test.js`, `test/pty-flood-coalescer.test.js`, `test/pty-manager-deep.test.js`, `test/pty-manager-gap.test.js`, `test/pty-manager-real.test.js`, `test/pty-manager.test.js`, `test/pty-prompt-controller.test.js`, `test/pty-prompt-retry.test.js`, `test/quick-settings-i18n.test.js`, `test/rateLimitParser.test.js`, `test/refresh-cached-item-prop.test.js`, `test/rename-v2-sessions.test.js`, `test/replace-top-level-model.test.js`, `test/request-type-unit.test.js`, `test/resize-calc.test.js`, `test/resolve-ask-questions.test.js`, `test/resolve-localized.test.js`, `test/resolve-profile-model.test.js`, `test/resync-nudge-gate.test.js`, `test/retry-config-layout.test.js`, `test/root-server-shim.test.js`, `test/root-shim.test.js`, `test/route-dispatch.test.js`, `test/scratch-pty-manager-gap.test.js`, `test/scratch-pty-manager.test.js`, `test/scroll-highlight-controller.test.js`, `test/sdk-adapter.test.js`, `test/sdk-manager-extra.test.js`, `test/sdk-manager-query.test.js`, `test/sdk-manager.test.js`, `test/search-endpoint.test.js`, `test/search-replace-preview.test.js`, `test/seq-resource-loaders.test.js`, `test/server-ask-hook-map.test.js`, `test/server-auth-branches.test.js`, `test/server-cli-mode.test.js`, `test/server-cli-startup.test.js`, `test/server-http-extra-2.test.js`, `test/server-http-extra.test.js`, `test/server-i18n.test.js`, `test/server-im-worker.test.js`, `test/server-lifecycle.test.js`, `test/server-logs.test.js`, `test/server-plugins.test.js`, `test/server-ports-busy.test.js`, `test/server-residual.test.js`, `test/server-resync-request.test.js`, `test/server-startup-extra.test.js`, `test/server-v2-read.test.js`, `test/server-ws-branches.test.js`, `test/server.test.js`, `test/session-boundary-parity.test.js`, `test/session-boundary.test.js`, `test/session-manager.test.js`, `test/session-model-stamp.test.js`, `test/session-pin.test.js`, `test/session-start-bridge.test.js`, `test/session-transcript-reader-toolresult.test.js`, `test/session-transcript-reader.test.js`, `test/settings-merge.test.js`, `test/should-inline-tool-images.test.js`, `test/skill-display-name.test.js`, `test/skill-modal-controller.test.js`, `test/skills-api.test.js`, `test/skills-import.test.js`, `test/slash-command-labels.test.js`, `test/spawn-model-resolver.test.js`, `test/split-drag-calc.test.js`, `test/split-drag-controller.test.js`, `test/sse-compression.test.js`, `test/sse-heartbeat.test.js`, `test/sse-update-badge-frame.test.js`, `test/stats-worker-notification-filter.test.js`, `test/stats-worker-proxy.test.js`, `test/stats-worker.test.js`, `test/sticky-bottom-controller-integration.test.js`, `test/sticky-bottom-controller-user-intent.test.js`, `test/sticky-bottom-controller.test.js`, `test/stream-assembler.test.js`, `test/streaming-state.test.js`, `test/svg-sanitize-gap.test.js`, `test/svg-sanitize.test.js`, `test/synthetic-classification.test.js`, `test/system-prompt-builder.test.js`, `test/system-prompt-files.test.js`, `test/system-prompt-presets.test.js`, `test/system-prompt-render.test.js`, `test/system-tags.test.js`, `test/t-claude.test.js`, `test/team-modal-builder-unit.test.js`, `test/team-runtime.test.js`, `test/team-status-endpoint.test.js`, `test/teammate-avatar-static.test.js`, `test/teammate-avatars.test.js`, `test/teammate-svg-assets.test.js`, `test/term-diag.test.js`, `test/term-signals.test.js`, `test/terminal-env.test.js`, `test/terminal-pipeline-oracle.test.js`, `test/terminal-scrollback-preserve.test.js`, `test/terminal-write-queue-adaptive.test.js`, `test/terminal-write-queue.test.js`, `test/terminalClipboard.test.js`, `test/theme-sync.test.js`, `test/thinking-merge.test.js`, `test/timestamp-assignment.test.js`, `test/tool-activation-concepts.test.js`, `test/tool-catalog-concepts.test.js`, `test/tool-file-change-controller.test.js`, `test/tool-result-builder-unit.test.js`, `test/toolResultBuilder-dedup.test.js`, `test/toolResultBuilder-validation-error.test.js`, `test/tools-xml-formatter.test.js`, `test/toolsDiff.test.js`, `test/turn-end-bridge.test.js`, `test/turn-end-debounce.test.js`, `test/ultra-agents-api.test.js`, `test/ultraplan-concepts-parity.test.js`, `test/ultraplan-controller-gap.test.js`, `test/ultraplan-controller.test.js`, `test/ultraplan-detection.test.js`, `test/ultraplan-experts.test.js`, `test/ultraplan-templates.test.js`, `test/updater-pnpm.test.js`, `test/updater-test-guard.test.js`, `test/updater.test.js`, `test/upload-defer-logic.test.js`, `test/usepassword-startup.test.js`, `test/user-image-refs.test.js`, `test/user-profile.test.js`, `test/user-prompt-extract.test.js`, `test/v2-adapter-incremental.test.js`, `test/v2-adapter.test.js`, `test/v2-continuation-adopt.test.js`, `test/v2-convert.test.js`, `test/v2-core.test.js`, `test/v2-entry-endpoint.test.js`, `test/v2-image-pipeline.test.js`, `test/v2-jsonl-read.test.js`, `test/v2-live-feed.test.js`, `test/v2-meta-rows.test.js`, `test/v2-resume-switch.test.js`, `test/v2-session-dirname.test.js`, `test/v2-session-list.test.js`, `test/v2-session-owner.test.js`, `test/v2-session-select.test.js`, `test/v2-singleflight.test.js`, `test/v2-transcript-incremental.test.js`, `test/v2-transcript-normalizer.test.js`, `test/v2-verify.test.js`, `test/v2-window-two-pass.test.js`, `test/v3-assembler.test.js`, `test/vite-base-default.test.js`, `test/voice-pack-events.test.js`, `test/voice-pack-manager.test.js`, `test/voice-pack-player-gap.test.js`, `test/voice-pack-player.test.js`, `test/voice-pack-sanguo-integration.test.js`, `test/web-search-grouping.test.js`, `test/wecom-bridge.test.js`, `test/wecom-config.test.js`, `test/window-state.test.js`, `test/windows-compat.test.js`, `test/windows-hide.test.js`, `test/windows-import-paths.test.js`, `test/windows-npm-root-regression.test.js`, `test/wire-compress.test.js`, `test/workflow-journal.test.js`, `test/workflow-live.test.js`, `test/workflow-runs.test.js`, `test/workflow-text-parse.test.js`, `test/workflow-watcher.test.js`, `test/workflowStore.test.js`, `test/workspace-registry.test.js`, `test/ws-backpressure.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/electron/electron/diag.js` → `electron/diag.js`; `apps/electron/electron/main.js` → `electron/main.js`; `apps/electron/electron/menu-model.js` → `electron/menu-model.js`; `apps/electron/electron/tab-content-preload.js` → `electron/tab-content-preload.js`; `apps/electron/electron/tab-preload.js` → `electron/tab-preload.js`; `apps/electron/electron/tab-worker.js` → `electron/tab-worker.js`; `apps/electron/electron/window-state.js` → `electron/window-state.js`; `apps/electron/electron/workspace-preload.js` → `electron/workspace-preload.js`; `apps/web/build.js` → `build.js`; `apps/web/package.json` → `package.json`; `apps/web/public/voice-packs/default/pack.json` → `public/voice-packs/default/pack.json`; `apps/web/public/voice-packs/sanguo/pack.json` → `public/voice-packs/sanguo/pack.json`; `apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/App.module.css` → `src/App.module.css`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ApprovalModal.jsx` → `src/components/approval/ApprovalModal.jsx`; `apps/web/src/components/approval/ApprovalModal.module.css` → `src/components/approval/ApprovalModal.module.css`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.module.css` → `src/components/approval/ToolApprovalPanel.module.css`; `apps/web/src/components/chat/ApprovalPortalContext.js` → `src/components/chat/ApprovalPortalContext.js`; `apps/web/src/components/chat/AskQuestionForm.jsx` → `src/components/chat/AskQuestionForm.jsx`; `apps/web/src/components/chat/AskTimeoutCountdown.jsx` → `src/components/chat/AskTimeoutCountdown.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/DiffView.jsx` → `src/components/chat/DiffView.jsx`; `apps/web/src/components/chat/DiffView.module.css` → `src/components/chat/DiffView.module.css`; `apps/web/src/components/chat/RoleFilterBar.jsx` → `src/components/chat/RoleFilterBar.jsx`; `apps/web/src/components/chat/RoleFilterBar.module.css` → `src/components/chat/RoleFilterBar.module.css`; `apps/web/src/components/chat/controllers/askFlowController.js` → `src/components/chat/controllers/askFlowController.js`; `apps/web/src/components/chat/controllers/permissionController.js` → `src/components/chat/controllers/permissionController.js`; `apps/web/src/components/chat/controllers/ptyPromptController.js` → `src/components/chat/controllers/ptyPromptController.js`; `apps/web/src/components/chat/controllers/scrollHighlightController.js` → `src/components/chat/controllers/scrollHighlightController.js`; `apps/web/src/components/chat/controllers/splitDragController.js` → `src/components/chat/controllers/splitDragController.js`; `apps/web/src/components/chat/controllers/toolFileChangeController.js` → `src/components/chat/controllers/toolFileChangeController.js`; `apps/web/src/components/chat/interactionOwnership.js` → `src/components/chat/interactionOwnership.js`; `apps/web/src/components/chat/uploadDeferLogic.js` → `src/components/chat/uploadDeferLogic.js`; `apps/web/src/components/common/ConceptHelp.jsx` → `src/components/common/ConceptHelp.jsx`; `apps/web/src/components/common/ConceptHelp.module.css` → `src/components/common/ConceptHelp.module.css`; `apps/web/src/components/common/ConfirmRemoveButton.jsx` → `src/components/common/ConfirmRemoveButton.jsx`; `apps/web/src/components/common/CountryFlag.jsx` → `src/components/common/CountryFlag.jsx`; `apps/web/src/components/common/CountryFlag.module.css` → `src/components/common/CountryFlag.module.css`; `apps/web/src/components/common/DingTalkIcon.jsx` → `src/components/common/DingTalkIcon.jsx`; `apps/web/src/components/common/DiscordIcon.jsx` → `src/components/common/DiscordIcon.jsx`; `apps/web/src/components/common/FeishuIcon.jsx` → `src/components/common/FeishuIcon.jsx`; `apps/web/src/components/common/HoverPreviewTip.jsx` → `src/components/common/HoverPreviewTip.jsx`; `apps/web/src/components/common/HoverPreviewTip.module.css` → `src/components/common/HoverPreviewTip.module.css`; `apps/web/src/components/common/ImageLightbox.jsx` → `src/components/common/ImageLightbox.jsx`; `apps/web/src/components/common/ImageLightbox.module.css` → `src/components/common/ImageLightbox.module.css`; `apps/web/src/components/common/MemoryDetailModal.jsx` → `src/components/common/MemoryDetailModal.jsx`; `apps/web/src/components/common/OpenFolderIcon.jsx` → `src/components/common/OpenFolderIcon.jsx`; `apps/web/src/components/common/OpenFolderIcon.module.css` → `src/components/common/OpenFolderIcon.module.css`; `apps/web/src/components/common/PanelResizer.jsx` → `src/components/common/PanelResizer.jsx`; `apps/web/src/components/common/PanelResizer.module.css` → `src/components/common/PanelResizer.module.css`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/RefreshIcon.jsx` → `src/components/common/RefreshIcon.jsx`; `apps/web/src/components/common/RefreshIcon.module.css` → `src/components/common/RefreshIcon.module.css`; `apps/web/src/components/common/SnapLineOverlay.jsx` → `src/components/common/SnapLineOverlay.jsx`; `apps/web/src/components/common/SnapLineOverlay.module.css` → `src/components/common/SnapLineOverlay.module.css`; `apps/web/src/components/common/ToolsHelp.jsx` → `src/components/common/ToolsHelp.jsx`; `apps/web/src/components/common/ToolsHelp.module.css` → `src/components/common/ToolsHelp.module.css`; `apps/web/src/components/common/WeComIcon.jsx` → `src/components/common/WeComIcon.jsx`; `apps/web/src/components/common/quickMenuIcons.jsx` → `src/components/common/quickMenuIcons.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `apps/web/src/components/dashboard/CachePopoverContent.jsx` → `src/components/dashboard/CachePopoverContent.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.module.css` → `src/components/dashboard/CachePopoverContent.module.css`; `apps/web/src/components/dashboard/ContextTab.jsx` → `src/components/dashboard/ContextTab.jsx`; `apps/web/src/components/dashboard/ContextTab.module.css` → `src/components/dashboard/ContextTab.module.css`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/components/dashboard/DetailPanel.module.css` → `src/components/dashboard/DetailPanel.module.css`; `apps/web/src/components/dashboard/LiveTagPopover.jsx` → `src/components/dashboard/LiveTagPopover.jsx`; `apps/web/src/components/dashboard/LiveTagPopover.module.css` → `src/components/dashboard/LiveTagPopover.module.css`; `apps/web/src/components/dashboard/RequestList.jsx` → `src/components/dashboard/RequestList.jsx`; `apps/web/src/components/dashboard/RequestList.module.css` → `src/components/dashboard/RequestList.module.css`; `apps/web/src/components/dashboard/TeamSessionPanel.jsx` → `src/components/dashboard/TeamSessionPanel.jsx`; `apps/web/src/components/dashboard/TeamSessionPanel.module.css` → `src/components/dashboard/TeamSessionPanel.module.css`; `apps/web/src/components/dashboard/UsageWindowPill.jsx` → `src/components/dashboard/UsageWindowPill.jsx`; `apps/web/src/components/dashboard/UsageWindowPill.module.css` → `src/components/dashboard/UsageWindowPill.module.css`; `apps/web/src/components/dashboard/WorkflowRunsPanel.jsx` → `src/components/dashboard/WorkflowRunsPanel.jsx`; `apps/web/src/components/dashboard/WorkflowRunsPanel.module.css` → `src/components/dashboard/WorkflowRunsPanel.module.css`; `apps/web/src/components/dashboard/WorkspaceList.jsx` → `src/components/dashboard/WorkspaceList.jsx`; `apps/web/src/components/dashboard/WorkspaceList.module.css` → `src/components/dashboard/WorkspaceList.module.css`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/files/FileContentView.module.css` → `src/components/files/FileContentView.module.css`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`; `apps/web/src/components/files/MdxEditorPanel.base.css` → `src/components/files/MdxEditorPanel.base.css`; `apps/web/src/components/files/MdxEditorPanel.jsx` → `src/components/files/MdxEditorPanel.jsx`; `apps/web/src/components/files/MdxEditorPanel.module.css` → `src/components/files/MdxEditorPanel.module.css`; `apps/web/src/components/git/DiffMiniMap.jsx` → `src/components/git/DiffMiniMap.jsx`; `apps/web/src/components/git/DiffMiniMap.module.css` → `src/components/git/DiffMiniMap.module.css`; `apps/web/src/components/git/FullFileDiffView.jsx` → `src/components/git/FullFileDiffView.jsx`; `apps/web/src/components/git/FullFileDiffView.module.css` → `src/components/git/FullFileDiffView.module.css`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/components/git/GitChanges.module.css` → `src/components/git/GitChanges.module.css`; `apps/web/src/components/git/GitDiffView.jsx` → `src/components/git/GitDiffView.jsx`; `apps/web/src/components/git/GitDiffView.module.css` → `src/components/git/GitDiffView.module.css`; `apps/web/src/components/mobile/MobileDrawerCloseButton.jsx` → `src/components/mobile/MobileDrawerCloseButton.jsx`; `apps/web/src/components/mobile/MobileFileExplorer.jsx` → `src/components/mobile/MobileFileExplorer.jsx`; `apps/web/src/components/mobile/MobileFileExplorer.module.css` → `src/components/mobile/MobileFileExplorer.module.css`; `apps/web/src/components/mobile/MobileGitDiff.jsx` → `src/components/mobile/MobileGitDiff.jsx`; `apps/web/src/components/mobile/MobileGitDiff.module.css` → `src/components/mobile/MobileGitDiff.module.css`; `apps/web/src/components/mobile/MobileStats.jsx` → `src/components/mobile/MobileStats.jsx`; `apps/web/src/components/mobile/MobileStats.module.css` → `src/components/mobile/MobileStats.module.css`; `apps/web/src/components/search/SearchPanel.jsx` → `src/components/search/SearchPanel.jsx`; `apps/web/src/components/search/SearchPanel.module.css` → `src/components/search/SearchPanel.module.css`; `apps/web/src/components/settings/ImAppendSystemModal.jsx` → `src/components/settings/ImAppendSystemModal.jsx`; `apps/web/src/components/settings/ImConversationModal.jsx` → `src/components/settings/ImConversationModal.jsx`; `apps/web/src/components/settings/ImConversationModal.module.css` → `src/components/settings/ImConversationModal.module.css`; `apps/web/src/components/settings/ImPlatformSettings.jsx` → `src/components/settings/ImPlatformSettings.jsx`; `apps/web/src/components/settings/ImPlatformSettings.module.css` → `src/components/settings/ImPlatformSettings.module.css`; `apps/web/src/components/settings/ImSkillsModal.jsx` → `src/components/settings/ImSkillsModal.jsx`; `apps/web/src/components/settings/ImStatusChip.jsx` → `src/components/settings/ImStatusChip.jsx`; `apps/web/src/components/settings/ImStatusChip.module.css` → `src/components/settings/ImStatusChip.module.css`; `apps/web/src/components/settings/MessagingModal.jsx` → `src/components/settings/MessagingModal.jsx`; `apps/web/src/components/settings/MessagingModal.module.css` → `src/components/settings/MessagingModal.module.css`; `apps/web/src/components/settings/ModelPromptTabs.jsx` → `src/components/settings/ModelPromptTabs.jsx`; `apps/web/src/components/settings/PluginModal.jsx` → `src/components/settings/PluginModal.jsx`; `apps/web/src/components/settings/PluginModal.module.css` → `src/components/settings/PluginModal.module.css`; `apps/web/src/components/settings/PreferencesForm.jsx` → `src/components/settings/PreferencesForm.jsx`; `apps/web/src/components/settings/PreferencesForm.module.css` → `src/components/settings/PreferencesForm.module.css`; `apps/web/src/components/settings/ProcessModal.jsx` → `src/components/settings/ProcessModal.jsx`; `apps/web/src/components/settings/ProcessModal.module.css` → `src/components/settings/ProcessModal.module.css`; `apps/web/src/components/settings/ProjectAliasEditor.jsx` → `src/components/settings/ProjectAliasEditor.jsx`; `apps/web/src/components/settings/ProjectAliasEditor.module.css` → `src/components/settings/ProjectAliasEditor.module.css`; `apps/web/src/components/settings/ProjectPrefsManagerModal.jsx` → `src/components/settings/ProjectPrefsManagerModal.jsx`; `apps/web/src/components/settings/ProjectPrefsManagerModal.module.css` → `src/components/settings/ProjectPrefsManagerModal.module.css`; `apps/web/src/components/settings/ProxyModal.jsx` → `src/components/settings/ProxyModal.jsx`; `apps/web/src/components/settings/ProxyModal.module.css` → `src/components/settings/ProxyModal.module.css`; `apps/web/src/components/settings/SkillsManagerModal.jsx` → `src/components/settings/SkillsManagerModal.jsx`; `apps/web/src/components/settings/SkillsManagerModal.module.css` → `src/components/settings/SkillsManagerModal.module.css`; `apps/web/src/components/settings/SystemTextModal.jsx` → `src/components/settings/SystemTextModal.jsx`; `apps/web/src/components/settings/SystemTextModal.module.css` → `src/components/settings/SystemTextModal.module.css`; `apps/web/src/components/settings/VoicePackSettings.jsx` → `src/components/settings/VoicePackSettings.jsx`; `apps/web/src/components/settings/VoicePackSettings.module.css` → `src/components/settings/VoicePackSettings.module.css`; `apps/web/src/components/settings/imPlatforms.js` → `src/components/settings/imPlatforms.js`; `apps/web/src/components/terminal/CustomUltraplanEditModal.jsx` → `src/components/terminal/CustomUltraplanEditModal.jsx`; `apps/web/src/components/terminal/CustomUltraplanEditModal.module.css` → `src/components/terminal/CustomUltraplanEditModal.module.css`; `apps/web/src/components/terminal/PresetExpertPickerModal.jsx` → `src/components/terminal/PresetExpertPickerModal.jsx`; `apps/web/src/components/terminal/PresetExpertPickerModal.module.css` → `src/components/terminal/PresetExpertPickerModal.module.css`; `apps/web/src/components/terminal/PresetModal.jsx` → `src/components/terminal/PresetModal.jsx`; `apps/web/src/components/terminal/ScratchTerminal.jsx` → `src/components/terminal/ScratchTerminal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalPanel.module.css` → `src/components/terminal/TerminalPanel.module.css`; `apps/web/src/components/terminal/TerminalWsContext.jsx` → `src/components/terminal/TerminalWsContext.jsx`; `apps/web/src/components/terminal/UltraPlanModal.jsx` → `src/components/terminal/UltraPlanModal.jsx`; `apps/web/src/components/terminal/UltraPlanModal.module.css` → `src/components/terminal/UltraPlanModal.module.css`; `apps/web/src/components/terminal/UltraplanExpertManagerModal.jsx` → `src/components/terminal/UltraplanExpertManagerModal.jsx`; `apps/web/src/components/terminal/UltraplanExpertManagerModal.module.css` → `src/components/terminal/UltraplanExpertManagerModal.module.css`; `apps/web/src/components/terminal/UltraplanPanel.jsx` → `src/components/terminal/UltraplanPanel.jsx`; `apps/web/src/components/terminal/UltraplanPanel.module.css` → `src/components/terminal/UltraplanPanel.module.css`; `apps/web/src/components/terminal/terminalThemes.js` → `src/components/terminal/terminalThemes.js`; `apps/web/src/components/viewers/ImageViewer.jsx` → `src/components/viewers/ImageViewer.jsx`; `apps/web/src/components/viewers/ImageViewer.module.css` → `src/components/viewers/ImageViewer.module.css`; `apps/web/src/components/viewers/JsonViewer.jsx` → `src/components/viewers/JsonViewer.jsx`; `apps/web/src/components/viewers/JsonViewer.module.css` → `src/components/viewers/JsonViewer.module.css`; `apps/web/src/components/viewers/LogTable.jsx` → `src/components/viewers/LogTable.jsx`; `apps/web/src/components/viewers/MarkdownBlock.jsx` → `src/components/viewers/MarkdownBlock.jsx`; `apps/web/src/components/viewers/MarkdownBlock.module.css` → `src/components/viewers/MarkdownBlock.module.css`; `apps/web/src/components/viewers/ToolResultView.jsx` → `src/components/viewers/ToolResultView.jsx`; `apps/web/src/components/viewers/ToolResultView.module.css` → `src/components/viewers/ToolResultView.module.css`; `apps/web/src/components/viewers/WorkflowLiveHud.jsx` → `src/components/viewers/WorkflowLiveHud.jsx`; `apps/web/src/components/viewers/WorkflowLiveHud.module.css` → `src/components/viewers/WorkflowLiveHud.module.css`; `apps/web/src/components/viewers/WorkflowPanel.jsx` → `src/components/viewers/WorkflowPanel.jsx`; `apps/web/src/components/viewers/WorkflowPanel.module.css` → `src/components/viewers/WorkflowPanel.module.css`; `apps/web/src/components/viewers/WorkflowTimeline.jsx` → `src/components/viewers/WorkflowTimeline.jsx`; `apps/web/src/components/viewers/WorkflowTimeline.module.css` → `src/components/viewers/WorkflowTimeline.module.css`; `apps/web/src/contexts/SettingsContext.jsx` → `src/contexts/SettingsContext.jsx`; `apps/web/src/env.js` → `src/env.js`; `apps/web/src/global.css` → `src/global.css`; `apps/web/src/hooks/useMarkdownExport.js` → `src/hooks/useMarkdownExport.js`; `apps/web/src/hooks/useMermaidRender.js` → `src/hooks/useMermaidRender.js`; `apps/web/src/hooks/useProjectAlias.js` → `src/hooks/useProjectAlias.js`; `apps/web/src/hooks/useSessionStoragePersistedSet.js` → `src/hooks/useSessionStoragePersistedSet.js`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/i18n/mdxTranslations.js` → `src/i18n/mdxTranslations.js`; `apps/web/src/main.jsx` → `src/main.jsx`; `apps/web/src/tokenInterceptor.js` → `src/tokenInterceptor.js`; `apps/web/src/utils/apiUrl.js` → `src/utils/apiUrl.js`; `apps/web/src/utils/askFallback.js` → `src/utils/askFallback.js`; `apps/web/src/utils/askOptionDesc.js` → `src/utils/askOptionDesc.js`; `apps/web/src/utils/askPortalMatcher.js` → `src/utils/askPortalMatcher.js`; `apps/web/src/utils/autoApproveOptions.js` → `src/utils/autoApproveOptions.js`; `apps/web/src/utils/avatarAnimationPostPass.js` → `src/utils/avatarAnimationPostPass.js`; `apps/web/src/utils/builtinPresets.js` → `src/utils/builtinPresets.js`; `apps/web/src/utils/commandValidator.js` → `src/utils/commandValidator.js`; `apps/web/src/utils/contextRaw.js` → `src/utils/contextRaw.js`; `apps/web/src/utils/contextSidebarNavigation.js` → `src/utils/contextSidebarNavigation.js`; `apps/web/src/utils/displayScaleHelper.js` → `src/utils/displayScaleHelper.js`; `apps/web/src/utils/entry-slim.js` → `src/utils/entry-slim.js`; `apps/web/src/utils/entryCache.js` → `src/utils/entryCache.js`; `apps/web/src/utils/errorReport.js` → `src/utils/errorReport.js`; `apps/web/src/utils/fileExpandedPathsStorage.js` → `src/utils/fileExpandedPathsStorage.js`; `apps/web/src/utils/fileIcons.jsx` → `src/utils/fileIcons.jsx`; `apps/web/src/utils/fileOpen.js` → `src/utils/fileOpen.js`; `apps/web/src/utils/formatters.js` → `src/utils/formatters.js`; `apps/web/src/utils/gitApi.js` → `src/utils/gitApi.js`; `apps/web/src/utils/gitTreeBuilder.js` → `src/utils/gitTreeBuilder.js`; `apps/web/src/utils/helpers.js` → `src/utils/helpers.js`; `apps/web/src/utils/identityHeal.js` → `src/utils/identityHeal.js`; `apps/web/src/utils/imOrigin.js` → `src/utils/imOrigin.js`; `apps/web/src/utils/imTr.js` → `src/utils/imTr.js`; `apps/web/src/utils/imageCompress.js` → `src/utils/imageCompress.js`; `apps/web/src/utils/imageDownscale.js` → `src/utils/imageDownscale.js`; `apps/web/src/utils/imageResize.js` → `src/utils/imageResize.js`; `apps/web/src/utils/ingestPipeline.js` → `src/utils/ingestPipeline.js`; `apps/web/src/utils/lazyWithReload.js` → `src/utils/lazyWithReload.js`; `apps/web/src/utils/markdown.js` → `src/utils/markdown.js`; `apps/web/src/utils/markdownIncremental.js` → `src/utils/markdownIncremental.js`; `apps/web/src/utils/markdownProfiler.js` → `src/utils/markdownProfiler.js`; `apps/web/src/utils/mdExtensionDetect.js` → `src/utils/mdExtensionDetect.js`; `apps/web/src/utils/memoryLinkParser.js` → `src/utils/memoryLinkParser.js`; `apps/web/src/utils/modalMask.js` → `src/utils/modalMask.js`; `apps/web/src/utils/monotime.js` → `src/utils/monotime.js`; `apps/web/src/utils/pinnedMenu.js` → `src/utils/pinnedMenu.js`; `apps/web/src/utils/presetShortcuts.js` → `src/utils/presetShortcuts.js`; `apps/web/src/utils/projectAlias.js` → `src/utils/projectAlias.js`; `apps/web/src/utils/promptClassifier.js` → `src/utils/promptClassifier.js`; `apps/web/src/utils/promptDetect.js` → `src/utils/promptDetect.js`; `apps/web/src/utils/promptNav.js` → `src/utils/promptNav.js`; `apps/web/src/utils/ptyChunkBuilder.js` → `src/utils/ptyChunkBuilder.js`; `apps/web/src/utils/quickMenuHoverIntent.js` → `src/utils/quickMenuHoverIntent.js`; `apps/web/src/utils/rateLimitParser.js` → `src/utils/rateLimitParser.js`; `apps/web/src/utils/readResultPool.js` → `src/utils/readResultPool.js`; `apps/web/src/utils/refreshCachedItemProp.js` → `src/utils/refreshCachedItemProp.js`; `apps/web/src/utils/resizeCalc.js` → `src/utils/resizeCalc.js`; `apps/web/src/utils/resolveLocalized.js` → `src/utils/resolveLocalized.js`; `apps/web/src/utils/searchApi.js` → `src/utils/searchApi.js`; `apps/web/src/utils/searchReplace.js` → `src/utils/searchReplace.js`; `apps/web/src/utils/seqResourceLoaders.js` → `src/utils/seqResourceLoaders.js`; `apps/web/src/utils/sessionManager.js` → `src/utils/sessionManager.js`; `apps/web/src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`; `apps/web/src/utils/skillModalController.js` → `src/utils/skillModalController.js`; `apps/web/src/utils/skillsParser.js` → `src/utils/skillsParser.js`; `apps/web/src/utils/slashCommandLabels.js` → `src/utils/slashCommandLabels.js`; `apps/web/src/utils/splitDragCalc.js` → `src/utils/splitDragCalc.js`; `apps/web/src/utils/stickyBottomController.js` → `src/utils/stickyBottomController.js`; `apps/web/src/utils/svgSanitize.js` → `src/utils/svgSanitize.js`; `apps/web/src/utils/systemTags.js` → `src/utils/systemTags.js`; `apps/web/src/utils/teamModalBuilder.js` → `src/utils/teamModalBuilder.js`; `apps/web/src/utils/teamSessionParser.js` → `src/utils/teamSessionParser.js`; `apps/web/src/utils/teammateAvatars.js` → `src/utils/teammateAvatars.js`; `apps/web/src/utils/termDiag.js` → `src/utils/termDiag.js`; `apps/web/src/utils/terminalClipboard.js` → `src/utils/terminalClipboard.js`; `apps/web/src/utils/terminalWriteQueue.js` → `src/utils/terminalWriteQueue.js`; `apps/web/src/utils/thinkingMerge.js` → `src/utils/thinkingMerge.js`; `apps/web/src/utils/toolCatalog.js` → `src/utils/toolCatalog.js`; `apps/web/src/utils/toolResultBuilder.js` → `src/utils/toolResultBuilder.js`; `apps/web/src/utils/toolResultClassifier.js` → `src/utils/toolResultClassifier.js`; `apps/web/src/utils/toolResultCore.js` → `src/utils/toolResultCore.js`; `apps/web/src/utils/toolsDiff.js` → `src/utils/toolsDiff.js`; `apps/web/src/utils/toolsXmlFormatter.js` → `src/utils/toolsXmlFormatter.js`; `apps/web/src/utils/ultraplanController.js` → `src/utils/ultraplanController.js`; `apps/web/src/utils/ultraplanExperts.js` → `src/utils/ultraplanExperts.js`; `apps/web/src/utils/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`; `apps/web/src/utils/userImageRefs.js` → `src/utils/userImageRefs.js`; `apps/web/src/utils/voicePackPlayer.js` → `src/utils/voicePackPlayer.js`; `apps/web/src/utils/workflowFormat.js` → `src/utils/workflowFormat.js`; `apps/web/src/utils/workflowRuns.js` → `src/utils/workflowRuns.js`; `apps/web/src/utils/workflowStore.js` → `src/utils/workflowStore.js`; `apps/web/vite.config.js` → `vite.config.js`; `jsconfig.json` → `jsconfig.json`; `package.json` → `package.json`; `packages/app/cli.js` → `cli.js`; `packages/app/interceptor.js` → `interceptor.js`; `packages/app/package.json` → `package.json`; `packages/app/server.js` → `server.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/adapters/dingtalk-adapter.js` → `lib/adapters/dingtalk-adapter.js`; `packages/app/server/lib/approval-modal-prefs.js` → `server/lib/approval-modal-prefs.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/lib/code-replace.js` → `lib/code-replace.js`; `packages/app/server/lib/code-search.js` → `lib/code-search.js`; `packages/app/server/lib/context-rules.js` → `server/lib/context-rules.js`; `packages/app/server/lib/context-watcher.js` → `lib/context-watcher.js`; `packages/app/server/lib/delta-reconstructor.js` → `server/lib/delta-reconstructor.js`; `packages/app/server/lib/ensure-hooks.js` → `lib/ensure-hooks.js`; `packages/app/server/lib/extract-plugin-name.mjs` → `lib/extract-plugin-name.mjs`; `packages/app/server/lib/file-api.js` → `lib/file-api.js`; `packages/app/server/lib/git-diff.js` → `lib/git-diff.js`; `packages/app/server/lib/interceptor-core.js` → `lib/interceptor-core.js`; `packages/app/server/lib/log-management.js` → `lib/log-management.js`; `packages/app/server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`; `packages/app/server/lib/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/plugin-loader.js` → `lib/plugin-loader.js`; `packages/app/server/lib/plugin-manager.js` → `lib/plugin-manager.js`; `packages/app/server/lib/proxy-env.js` → `lib/proxy-env.js`; `packages/app/server/lib/proxy-errors.js` → `lib/proxy-errors.js`; `packages/app/server/lib/sdk-adapter.js` → `lib/sdk-adapter.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/lib/skills-api.js` → `lib/skills-api.js`; `packages/app/server/lib/stats-worker.js` → `lib/stats-worker.js`; `packages/app/server/lib/tools-xml-formatter.js` → `server/lib/tools-xml-formatter.js`; `packages/app/server/lib/ultra-agents-api.js` → `server/lib/ultra-agents-api.js`; `packages/app/server/lib/updater.js` → `lib/updater.js`; `packages/app/server/lib/user-profile.js` → `lib/user-profile.js`; `packages/app/server/lib/v2/identity.js` → `lib/log-v2/identity.js`; `packages/app/server/lib/v2/layout.js` → `lib/log-v2/layout.js`; `packages/app/server/lib/voice-pack-events.js` → `server/lib/voice-pack-events.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/routes/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/scratch-pty-manager.js` → `scratch-pty-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/app/server/workspace-registry.js` → `workspace-registry.js`; `packages/app/src/utils/clearCheckpoint.js` → `src/utils/clearCheckpoint.js`; `packages/app/src/utils/contentFilter.js` → `src/utils/contentFilter.js`; `packages/app/src/utils/requestType.js` → `src/utils/requestType.js`; `packages/app/src/utils/teammateDetector.js` → `src/utils/teammateDetector.js`; `packages/app/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`; `packages/app/ultraAgents/research-expert.json` → `ultraAgents/research-expert.json`; `scripts/gen-default-voicepack.js` → `scripts/gen-default-voicepack.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `jobs:`; `electron-dist`; `Using '!important' in CSS is prohibited.`; `The repo uses pnpm (pinned via the 'packageManager' field; settings in 'pnpm-wor`; `brew upgrade cc-viewer   # use this to upgrade; do NOT use npm install -g to upg`; `brew upgrade cc-viewer   # استخدم هذا للترقية؛ لا تستخد`; `brew upgrade cc-viewer   # brug denne til opgradering — brug IKKE npm install`; `brew upgrade cc-viewer   # für Updates — verwende NICHT npm install -g für m`; `brew upgrade cc-viewer   # para actualizaciones — no use npm install -g con in`; `brew upgrade cc-viewer   # pour les mises à jour — n'utilisez PAS npm install`; `brew upgrade cc-viewer   # per gli aggiornamenti — NON usare npm install -g co`; `brew upgrade cc-viewer   # アップデート用 — brew インストールの`; `brew upgrade cc-viewer   # 업그레이드는 이 명령으로 — brew 로 설`; `brew upgrade cc-viewer   # bruk denne for oppgradering — bruk IKKE npm install`; `brew upgrade cc-viewer   # użyj tego do aktualizacji — NIE używaj npm instal`; `brew upgrade cc-viewer   # para atualizações — NÃO use npm install -g com i`; `brew upgrade cc-viewer   # используйте это для обновлен`; `brew upgrade cc-viewer   # ใช้คำสั่งนี้ในการ`; `brew upgrade cc-viewer   # Güncelleme için bunu kullanın; brew ile kurulan cc`; `brew upgrade cc-viewer   # для оновлення використовуйт`; `brew upgrade cc-viewer   # 升級請用這個，brew 安裝的 ccv 不要用 npm`; `brew upgrade cc-viewer   # 升级用这个，brew 安装的 ccv 不要用 npm in`; `repo-root/`; `catalog:                # 评审修正：服务于「根测试孪生依赖」的`; `A1+A2+A3 合并执行（~2–3 天），中间不发布：`; `importers:`; `packages:`; `snapshots:`; `allowBuilds:`; `if [ -n "$IDENTITIES" ] && [ -n "$CSC_LINK" ] && [ -n "$CSC_KEY_PASSWORD" ]; the`.
- Upstream commit message excerpt: - packages/app: publishable cc-viewer package (server + cli + findcc + root shims + 4-file shared seam in src/utils/); repo layout == npm tarball layout - apps/web (@ccv/web) and apps/electron (@ccv/electron): private build units - assemble-dist.mjs: copy apps/web/dist into packages/app at pack time, with missing-dist throw and workspace:/catalog: specifier guards - electron: staging assembly (scripts/assemble-app.mjs), sibling stage layout, electron-builder >=26.14 + pinned electron 42.0.1 (spike-verified, isolated linker retained for CI) - updater: detect pnpm-global installs via virtual-store realpath segment and route to pnpm_managed banner (+ i18n x18, +26 tests) - tests: codemod path migration (473 files) + 12 manual fixes; test:cli 9482 pass / 0 fail; L4 tarball contract diff vs A1 baseline: only delta is src/utils narrowing, zero additions Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7d83b5deff"></a>
## [7d83b5deff](./cc-viewer-alignment-commit-ledger.md#commit-7d83b5deff) — chore(changesets): adopt @changesets/cli for cc-viewer versioning (stage A3)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:00-04:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: 6 distinct hunk context(s) extracted (up to 30): `After completing any code changes, automatically run 'pnpm run build' to rebuild`; `When submitting code to GitHub or npm, always consult the user. Unless the user`; `A1+A2+A3 合并执行（~2–3 天），中间不发布：`; `importers:`; `packages:`; `snapshots:`.
- Upstream commit message excerpt: - @changesets/cli ^3.0.0 as root devDependency; .changeset/config.json versions only the cc-viewer package (privatePackages version/tag false — @ccv/web and @ccv/electron stay static at 0.0.0) - config written by hand: v3 init prompts interactively (GitHub integration) and hangs in non-TTY shells - dry-run rehearsed: fake patch changeset -> version bumped 1.7.22 -> 1.7.23 with packages/app/CHANGELOG.md generated, private packages untouched; all rehearsal artifacts reverted - CLAUDE.md: changes touching packages/app must carry a changeset; lockfile conflicts re-resolved via pnpm install (never hand-edited); version bumps only via pnpm changeset version at release time; refresh the stale A1-transition electron-job note to the A2 final state (pnpm + isolated) - migration plan doc: append A3 implementation record Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3b5103bb9e"></a>
## [3b5103bb9e](./cc-viewer-alignment-commit-ledger.md#commit-3b5103bb9e) — ci(contract): add L4 tarball-layout gate (verify:tarball + committed baseline)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:00-04:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：3；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.
- Upstream commit message excerpt: - scripts/verify-tarball-contract.mjs: assemble, then dry-run npm pack and diff the file list against scripts/tarball-baseline.json (1560 entries). dist/assets/* is excluded from the diff (vite-hashed names), but every asset referenced by dist/index.html is asserted present in the pack list. - Wired into ci.yml (after build, before test:cli) and release.yml npm-publish (before the real pack — tags don't trigger ci.yml, so the publish path gets its own gate). - docs/refactor/packages-app-split-plan.zh.md: stage-1 research conclusions and stage-2 design for the packages/app modular split. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-20ccfb7304"></a>
## [20ccfb7304](./cc-viewer-alignment-commit-ledger.md#commit-20ccfb7304) — refactor(content): extract bundled assets into packages/content (@ccv/content)

- B0 snapshot comparison: 21 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:00-04:00；父提交 1；相对第一父文件数 1385。
- 上游生产/配置文件：6；上游测试文件：5。
- 上游测试：`test/ccv-projects.test.js`, `test/paths-content.test.js`, `test/tool-activation-concepts.test.js`, `test/tool-catalog-concepts.test.js`, `test/ultraplan-concepts-parity.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/content/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`; `packages/content/ultraAgents/research-expert.json` → `ultraAgents/research-expert.json`。
- B0 diff inspection: 14 distinct hunk context(s) extracted (up to 30): `packages/app/LICENSE.md`; `When adding new interactive controls, remember to add corresponding i18n entries`; `Do not increment the version number arbitrarily; versions are bumped by 'pnpm ch`; `CC-Viewer 自动注册到 '~/.claude/settings.json' 的 'hooks.PreToolUse' 中`; `CC-Viewer auto-registers hooks in '~/.claude/settings.json' under 'hooks.PreTool`; `cpSync(WEB_DIST, APP_DIST, { recursive: true });`; `export const PUBLIC_DIR    = existsSync(join(PACKAGE_ROOT, 'public'))`; `export const PLUGINS_DIR   = join(PACKAGE_ROOT, 'plugins');`; `export const ULTRA_AGENTS_DIR = join(PACKAGE_ROOT, 'ultraAgents');`; `export const IM_SKILLS_DIR = join(SERVER_DIR, 'imSkills');`; `importers:`; `import { join, resolve } from 'node:path';`; `const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');`; `import { ULTRAPLAN_VARIANTS } from '../apps/web/src/utils/ultraplanTemplates.js'`.
- Upstream commit message excerpt: - git mv concepts/, ultraAgents/, server/imPreset/, server/imSkills/ out of packages/app into a new private workspace package, mirroring the two tarball depths (root-level and server-level). - server/_paths.js: the four asset constants become sentinel-checked probes that prefer packages/content in dev (live edits, no rebuild) and fall back to the assembled in-package copies in the published tarball / electron stage. - assemble-dist.mjs copies the four dirs back at build/pack time (idempotent, throws on missing source); the assembled paths are gitignored. - Tarball layout is byte-identical (L4 gate: zero diff); verified with an isolated-prefix global install smoke (probe fallback + ccv --version). - Tests: four direct-path consumers repointed; new test/paths-content.test.js pins the probe resolution. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-f9467bfc83"></a>
## [f9467bfc83](./cc-viewer-alignment-commit-ledger.md#commit-f9467bfc83) — refactor(server): group server/lib batch-1 into im/ ask/ proxy/ subdirectories

- B0 snapshot comparison: 13 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:00-04:00；父提交 1；相对第一父文件数 94。
- 上游生产/配置文件：40；上游测试文件：53。
- 上游测试：`test/api-ask-perm-extra.test.js`, `test/api-dingtalk-gap.test.js`, `test/api-dingtalk.test.js`, `test/api-im.test.js`, `test/ask-bridge.test.js`, `test/ask-no-timeout-invariants.test.js`, `test/ask-reaper.test.js`, `test/ask-store.test.js`, `test/branch-lib-ask-bridge.test.js`, `test/branch-lib-ask-store.test.js`, `test/branch-lib-im-bridge-core.test.js`, `test/branch-lib-im-deny.test.js`, `test/branch-lib-im-log-watcher.test.js`, `test/branch-lib-im-process-manager.test.js`, `test/branch-lib-im-senders.test.js`, `test/branch-lib-perm-bridge.test.js`, `test/branch-lib-proxy-env.test.js`, `test/branch-routes-ask-perm.test.js`, `test/branch-routes-im.test.js`, `test/cli-deep.test.js`, `test/dingtalk-bridge.test.js`, `test/dingtalk-config.test.js`, `test/discord-bridge.test.js`, `test/discord-config.test.js`, `test/ensure-hooks-deep.test.js`, `test/ensure-hooks.test.js`, `test/feishu-bridge.test.js`, `test/feishu-config.test.js`, `test/im-append-system-seed.test.js`, `test/im-bridge-core-deep.test.js`, `test/im-bridge-core.test.js`, `test/im-connection-state.test.js`, `test/im-deny.test.js`, `test/im-lang.test.js`, `test/im-lock-gap.test.js`, `test/im-lock.test.js`, `test/im-process-manager.test.js`, `test/im-routes-gap.test.js`, `test/im-senders.test.js`, `test/im-skills.test.js`, `test/im-spawn-test-guard.test.js`, `test/pending-asks-filter.test.js`, `test/perm-bridge.test.js`, `test/proxy-env.test.js`, `test/proxy-errors.test.js`, `test/proxy-retry-cancel.test.js`, `test/proxy-retry-stream-idle.test.js`, `test/proxy-retry.test.js`, `test/proxy-stats.test.js`, `test/server-im-worker.test.js`, `test/wecom-bridge.test.js`, `test/wecom-config.test.js`, `test/windows-hide.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/utils/imOrigin.js` → `src/utils/imOrigin.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/adapters/dingtalk-adapter.js` → `lib/adapters/dingtalk-adapter.js`; `packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/ensure-hooks.js` → `lib/ensure-hooks.js`; `packages/app/server/lib/proxy/proxy-env.js` → `lib/proxy-env.js`; `packages/app/server/lib/proxy/proxy-errors.js` → `lib/proxy-errors.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/lib/stats-worker.js` → `lib/stats-worker.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `async function runCliMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `async function runImMode(platformId) {`; `const _ccvSkip = _ccvSkipArgs.includes(process.argv[2]);`; `import { sanitizePathComponent } from './lib/v2/layout.js';`; `import { randomUUID } from 'node:crypto';`; `export function ensureHooks() {`; `import { mergeApprovalModalPrefs } from './approval-modal-prefs.js';`; `import { sdkToJSONLEntry, buildStreamingStatus } from './sdk-adapter.js';`; `async function _handleCanUseTool(toolName, input, options) {`; `import {`; `import { setupInterceptor } from './interceptor.js';`; `import { isAnthropicApiPath, classifyProxyRole } from './lib/interceptor-core.js`; `import { listV2Sessions } from '../lib/v2/adapter.js';`; `import { migrateProxyProfileList, isValidRoleValue, PROXY_ROLE_KEYS } from '../l`; `import { sendEventToClients } from '../lib/log-watcher.js';`; `import { sseWrite, isWireV3Enabled } from './lib/wire-compress.js';`; `import { proxyStatsRoutes } from './routes/proxy-stats.js';`; `import './lib/adapters/discord-adapter.js';  // side-effect: registers the Disco`; `import { LOG_DIR, setLogDir, getClaudeConfigDir, isBrowserOpenSuppressed } from`; `import { sendEventToClients, sendToClients } from './lib/log-watcher.js';`; `const ASK_HOOK_MAP_MAX = 1000;`; `const shortPollListeners = new Map(); // id -> Set<{ res, tid, finished }>`; `export async function startViewer() {`; `const { askPermRoutes } = await import('../packages/app/server/routes/ask-perm.j`; `const { dingtalkRoutes } = await import('../packages/app/server/routes/dingtalk.`; `import { tmpdir } from 'node:os';`; `process.env.CCV_MAX_PORT = '19789';`; `describe('GET /api/dingtalk/status loopback gate', () => {`; `describe('POST /api/dingtalk/test branches', () => {`; `process.env.CCV_MAX_PORT = '19779';`.
- Upstream commit message excerpt: - 21 files via git mv: lib/im/ (12: im-* cluster + dingtalk shims), lib/ask/ (5: ask-store/reaper/constants + ask/perm hook bridges), lib/proxy/ (4: retry engine + stats/env/errors). First batch of the flat-namespace reorg; remaining clusters land in later batches. - Resolver-based codemod rewrote 122 import specifiers across 72 files (source + tests); manual fixes: im-process-manager CLI_JS depth, ensure-hooks bridge joins, segmented join() paths in five test files, path-regex expectations in the ensure-hooks / ask-no-timeout suites. - Hook path migration self-heals: ensure-hooks purges stale cc-viewer-managed entries (existsSync) and re-inserts at the new paths on the next ccv launch; the hook command's `|| true` guard degrades silently to TUI in between. - GlobalSettings.md hook docs updated to the new bridge paths (18 locales). - A2.7 cleanup: deleted the four temporary root server/lib import-shims. - L4 baseline regenerated: exactly 21 paths removed + 21 added, each reviewed. Co-A…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-729b886893"></a>
## [729b886893](./cc-viewer-alignment-commit-ledger.md#commit-729b886893) — refactor(boundaries): break static cycles + add import-boundary gate for packages/app

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:00-04:00；父提交 1；相对第一父文件数 33。
- 上游生产/配置文件：20；上游测试文件：7。
- 上游测试：`test/boundary-checker.test.js`, `test/cli-import-paths.test.js`, `test/findcc-logdir-listeners.test.js`, `test/interceptor-project-state.test.js`, `test/log-file-utils.test.js`, `test/logdir-policy-invalidation.test.js`, `test/project-state.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/file-api.js` → `lib/file-api.js`; `packages/app/server/lib/log-management.js` → `lib/log-management.js`; `packages/app/server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`。
- B0 diff inspection: 29 distinct hunk context(s) extracted (up to 30): `jobs:`; `The repo uses pnpm (pinned via the 'packageManager' field; settings in 'pnpm-wor`; `import { threadId } from 'node:worker_threads';`; `export let LOG_DIR = resolveLogDir();`; `export function setLogDir(dir) {`; `import { setRetryConfigPath, loadRetryConfig, DEFAULT_RETRY_CONFIG } from './lib`; `if (process.env.CCV_WORKSPACE_MODE === '1') {`; `export function initForWorkspace(projectPath, { forceNew = false } = {}) { // es`; `export function resetWorkspace() {`; `import https from 'node:https';`; `import { homedir, platform, tmpdir } from 'node:os';`; `export function bumpWorkspacesVersion() {`; `import { realpathSync, existsSync, statSync, readFileSync, writeFileSync, rename`; `import { imDir } from './im-lock.js';`; `export function platformLabel(id, lang = resolvePrefLang(DEFAULT_LANG)) {`; `import { listSessionIds } from './v2/replay.js';`; `export function validateLogPath(logDir, file) {`; `export function deleteLogFiles(logDir, files, opts = {}) {`; `import { join } from 'node:path';`; `import { listPlatforms } from './im/im-config.js';`; `export function getCurrentProjectName() {`; `export function hasActiveProject() {`; `import { MODEL_PROMPT_DIR, matchModelPrompt } from './model-system-prompts.js';`; `export const DISABLE_AUTO_SYSTEM_PROMPT_ENV = 'CCV_DISABLE_AUTO_SYSTEM_PROMPT';`; `import { isDiscardableSession } from './session-select.js';`; `import { createIncrementalReconstructor } from '../delta-reconstructor.js';`; `importers:`; `snapshots:`; `const ENTRY_FILES = [`.
- Upstream commit message excerpt: Internal decoupling round (no behavior change): both remaining static ESM cycles broken (log-management↔v2/adapter via new leaf server/lib/ log-file-utils.js; model-system-prompts↔system-prompt-files by sinking isNonEmptyFile into file-api.js), findcc's lazy dynamic import replaced by an onLogDirChange listener registry (synchronous; policy registers at load), project-prefs decoupled from the interceptor via the new mutable leaf server/lib/project-state.js (3 push sites), im-deny.js promoted to server/lib/ root with a re-export shim. New gate scripts/ verify-boundaries.mjs (acorn-based, L0/L0-leaf/L1/L2/L3/L4 classes, R0-R7+CLS rules, SCC cycle detection, ratcheted allowlist with 3 documented structural exceptions, hard rules non-exemptable) wired into all pretest* hooks + CI. Contract doc: docs/refactor/package- boundaries.zh.md. Tarball baseline +3 entries; changeset included. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-047db59b80"></a>
## [047db59b80](./cc-viewer-alignment-commit-ledger.md#commit-047db59b80) — refactor(monorepo): @ccv/core extraction + boundary gate + per-package test distribution

- B0 snapshot comparison: 72 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:01-04:00；父提交 1；相对第一父文件数 571。
- 上游生产/配置文件：86；上游测试文件：472。
- 上游测试：`apps/electron/test/electron-diag.test.js`, `apps/electron/test/electron-node-execpath-regression.test.js`, `apps/electron/test/menu-model.test.js`, `apps/electron/test/window-state.test.js`, `apps/web/test/_shims/antd-stub.mjs`, `apps/web/test/_shims/register.mjs`, `apps/web/test/_shims/vite-loader.mjs`, `apps/web/test/api-url-gap.test.js`, `apps/web/test/ask-fallback.test.js`, `apps/web/test/ask-flow-controller.test.js`, `apps/web/test/ask-portal-matcher.test.js`, `apps/web/test/askOptionDesc.test.js`, `apps/web/test/auto-approve-options.test.js`, `apps/web/test/avatar-animation-post-pass.test.js`, `apps/web/test/bar-chart-helpers.test.js`, `apps/web/test/branch-utils-commandValidator.test.js`, `apps/web/test/branch-utils-entry-slim.test.js`, `apps/web/test/branch-utils-ingestPipeline.test.js`, `apps/web/test/branch-utils-projectAlias.test.js`, `apps/web/test/branch-utils-promptClassifier.test.js`, `apps/web/test/branch-utils-sessionManager.test.js`, `apps/web/test/branch-utils-sessionMerge.test.js`, `apps/web/test/branch-utils-stickyBottomController.test.js`, `apps/web/test/branch-utils-teamModalBuilder.test.js`, `apps/web/test/branch-utils-teamSessionParser.test.js`, `apps/web/test/branch-utils-terminalWriteQueue.test.js`, `apps/web/test/branch-utils-ultraplanController.test.js`, `apps/web/test/branch-utils-userImageRefs.test.js`, `apps/web/test/branch-utils-voicePackPlayer.test.js`, `apps/web/test/builtin-presets.test.js`, `apps/web/test/cold-ingest-gate.test.js`, `apps/web/test/commandValidator.test.js`, `apps/web/test/compact-result-preview.test.js`, `apps/web/test/context-i18n.test.js`, `apps/web/test/context-raw.test.js`, `apps/web/test/context-sidebar-nav-gap.test.js`, `apps/web/test/context-sidebar-navigation.test.js`, `apps/web/test/context-turns.test.js`, `apps/web/test/cross-request-toolresult.test.js`, `apps/web/test/display-scale-helper.test.js`, `apps/web/test/entry-cache.test.js`, `apps/web/test/entry-slim.test.js`, `apps/web/test/error-report.test.js`, `apps/web/test/expert-i18n.test.js`, `apps/web/test/extract-team-sessions.test.js`, `apps/web/test/file-open.test.js`, `apps/web/test/fileExpandedPathsStorage.test.js`, `apps/web/test/formatters-gap.test.js`, `apps/web/test/formatters.test.js`, `apps/web/test/git-api.test.js`, `apps/web/test/git-tree-builder.test.js`, `apps/web/test/helpers-unit-a.test.js`, `apps/web/test/helpers-unit-b.test.js`, `apps/web/test/helpers.test.js`, `apps/web/test/identity-heal.test.js`, `apps/web/test/im-conn-state.test.js`, `apps/web/test/im-origin.test.js`, `apps/web/test/im-status-i18n.test.js`, `apps/web/test/im-tr.test.js`, `apps/web/test/image-compress.test.js`, `apps/web/test/image-downscale.test.js`, `apps/web/test/image-resize-unit.test.js`, `apps/web/test/image-resize.test.js`, `apps/web/test/incremental-merge.test.js`, `apps/web/test/ingest-pipeline.test.js`, `apps/web/test/interaction-ownership.test.js`, `apps/web/test/lazy-with-reload.test.js`, `apps/web/test/loaded-skills-parser.test.js`, `apps/web/test/log-management-i18n.test.js`, `apps/web/test/lr-messages-dedup.test.js`, `apps/web/test/markdown-incremental.test.js`, `apps/web/test/markdown-profiler-gap.test.js`, `apps/web/test/markdown-profiler-gap2.test.js`, `apps/web/test/markdown-profiler.test.js`, `apps/web/test/markdown-render.test.js`, `apps/web/test/markdown-stream.test.js`, `apps/web/test/markdown-util.test.js`, `apps/web/test/md-extension-detect.test.js`, `apps/web/test/mdx-translations.test.js`, `apps/web/test/memoryLinkParser.test.js`, `apps/web/test/migrate-prompt-i18n.test.js`, `apps/web/test/modal-mask.test.js`, `apps/web/test/model-suggestions.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/permission-controller.test.js`, `apps/web/test/permission-detect.test.js`, `apps/web/test/pinned-menu.test.js`, `apps/web/test/plan-approve-option.test.js`, `apps/web/test/plan-v2-extract.test.js`, `apps/web/test/preset-shortcuts.test.js`, `apps/web/test/projectAlias.test.js`, `apps/web/test/prompt-classifier-gap.test.js`, `apps/web/test/prompt-detect.test.js`, `apps/web/test/promptNav.test.js`, `apps/web/test/pty-chunk-builder-gap.test.js`, `apps/web/test/pty-chunk-builder.test.js`, `apps/web/test/pty-prompt-controller.test.js`, `apps/web/test/pty-prompt-retry.test.js`, `apps/web/test/quick-settings-i18n.test.js`, `apps/web/test/rateLimitParser.test.js`, `apps/web/test/refresh-cached-item-prop.test.js`, `apps/web/test/resize-calc.test.js`, `apps/web/test/resolve-ask-questions.test.js`, `apps/web/test/resolve-localized.test.js`, `apps/web/test/retry-config-layout.test.js`, `apps/web/test/scroll-highlight-controller.test.js`, `apps/web/test/seq-resource-loaders.test.js`, `apps/web/test/session-manager.test.js`, `apps/web/test/session-model-stamp.test.js`, `apps/web/test/should-inline-tool-images.test.js`, `apps/web/test/single-ws-submit.test.js`, `apps/web/test/skill-display-name.test.js`, `apps/web/test/skill-modal-controller.test.js`, `apps/web/test/slash-command-labels.test.js`, `apps/web/test/split-drag-calc.test.js`, `apps/web/test/split-drag-controller.test.js`, `apps/web/test/sticky-bottom-controller-integration.test.js`, `apps/web/test/sticky-bottom-controller-user-intent.test.js`, `apps/web/test/sticky-bottom-controller.test.js`, `apps/web/test/svg-sanitize-gap.test.js`, `apps/web/test/svg-sanitize.test.js`, `apps/web/test/system-tags.test.js`, `apps/web/test/t-claude.test.js`, `apps/web/test/team-modal-builder-unit.test.js`, `apps/web/test/teammate-avatar-static.test.js`, `apps/web/test/teammate-avatars.test.js`, `apps/web/test/teammate-classification.test.js`, `apps/web/test/term-diag.test.js`, `apps/web/test/terminal-scrollback-preserve.test.js`, `apps/web/test/terminal-write-queue-adaptive.test.js`, `apps/web/test/terminal-write-queue.test.js`, `apps/web/test/terminalClipboard.test.js`, `apps/web/test/theme-sync.test.js`, `apps/web/test/thinking-merge.test.js`, `apps/web/test/timestamp-assignment.test.js`, `apps/web/test/tool-activation-concepts.test.js`, `apps/web/test/tool-catalog-concepts.test.js`, `apps/web/test/tool-file-change-controller.test.js`, `apps/web/test/tool-result-builder-unit.test.js`, `apps/web/test/toolResultBuilder-dedup.test.js`, `apps/web/test/toolResultBuilder-validation-error.test.js`, `apps/web/test/tools-xml-formatter.test.js`, `apps/web/test/toolsDiff.test.js`, `apps/web/test/ultraplan-controller-gap.test.js`, `apps/web/test/ultraplan-controller.test.js`, `apps/web/test/ultraplan-experts.test.js`, `apps/web/test/ultraplan-templates.test.js`, `apps/web/test/upload-defer-logic.test.js`, `apps/web/test/user-image-refs.test.js`, `apps/web/test/vite-base-default.test.js`, `apps/web/test/voice-pack-player-gap.test.js`, `apps/web/test/voice-pack-player.test.js`, `apps/web/test/web-search-grouping.test.js`, `apps/web/test/workflow-runs.test.js`, `apps/web/test/workflow-text-parse.test.js`, `apps/web/test/workflowStore.test.js`, `packages/app/test/_helpers/cli-tier.mjs`, `packages/app/test/_helpers/rm-sync.mjs`, `packages/app/test/_shims/antd-stub.mjs`, `packages/app/test/_shims/register.mjs`, `packages/app/test/_shims/vite-loader.mjs`, `packages/app/test/agent-id.test.js`, `packages/app/test/ansi-safe-slice.test.js`, `packages/app/test/api-ask-perm-extra.test.js`, `packages/app/test/api-auth.test.js`, `packages/app/test/api-base-path.test.js`, `packages/app/test/api-ccswitch-import.test.js`, `packages/app/test/api-claude-md.test.js`, `packages/app/test/api-dingtalk-gap.test.js`, `packages/app/test/api-dingtalk.test.js`, `packages/app/test/api-events-gap.test.js`, `packages/app/test/api-expert-model-prompts.test.js`, `packages/app/test/api-expert-system-prompt-status.test.js`, `packages/app/test/api-expert-system-text.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-files-fs-2.test.js`, `packages/app/test/api-files-fs.test.js`, `packages/app/test/api-git-routes.test.js`, `packages/app/test/api-im.test.js`, `packages/app/test/api-logs-gap.test.js`, `packages/app/test/api-plugins-gap.test.js`, `packages/app/test/api-preferences-gap.test.js`, `packages/app/test/api-preferences.test.js`, `packages/app/test/api-project-memory.test.js`, `packages/app/test/api-project-meta-gap.test.js`, `packages/app/test/api-proxy-profiles.test.js`, `packages/app/test/api-proxy-stats.test.js`, `packages/app/test/api-retry-config.test.js`, `packages/app/test/api-skills-gap.test.js`, `packages/app/test/api-team-routes.test.js`, `packages/app/test/api-ultra-agents-gap.test.js`, `packages/app/test/api-v2-requests.test.js`, `packages/app/test/api-voice-pack-gap.test.js`, `packages/app/test/api-workspaces.test.js`, `packages/app/test/ask-bridge.test.js`, `packages/app/test/ask-no-timeout-invariants.test.js`, `packages/app/test/ask-reaper.test.js`, `packages/app/test/ask-store.test.js`, `packages/app/test/async-file-lock.test.js`, `packages/app/test/async-write-queue.test.js`, `packages/app/test/auth-lib.test.js`, `packages/app/test/base-path-lib.test.js`, `packages/app/test/branch-cli.test.js`, `packages/app/test/branch-interceptor.test.js`, `packages/app/test/branch-lib-adapters-dingtalk-adapter.test.js`, `packages/app/test/branch-lib-adapters-discord-adapter.test.js`, `packages/app/test/branch-lib-adapters-feishu-adapter.test.js`, `packages/app/test/branch-lib-adapters-wecom-adapter.test.js`, `packages/app/test/branch-lib-ask-bridge.test.js`, `packages/app/test/branch-lib-ask-store.test.js`, `packages/app/test/branch-lib-async-file-lock.test.js`, `packages/app/test/branch-lib-ccv-editor.test.js`, `packages/app/test/branch-lib-claude-md-discovery.test.js`, `packages/app/test/branch-lib-ensure-hooks.test.js`, `packages/app/test/branch-lib-file-access-policy.test.js`, `packages/app/test/branch-lib-git-diff.test.js`, `packages/app/test/branch-lib-im-bridge-core.test.js`, `packages/app/test/branch-lib-im-deny.test.js`, `packages/app/test/branch-lib-im-log-watcher.test.js`, `packages/app/test/branch-lib-im-process-manager.test.js`, `packages/app/test/branch-lib-im-senders.test.js`, `packages/app/test/branch-lib-log-stream.test.js`, `packages/app/test/branch-lib-perm-bridge.test.js`, `packages/app/test/branch-lib-proxy-env.test.js`, `packages/app/test/branch-lib-sdk-manager.test.js`, `packages/app/test/branch-lib-session-transcript-reader.test.js`, `packages/app/test/branch-lib-stats-worker.test.js`, `packages/app/test/branch-lib-team-runtime.test.js`, `packages/app/test/branch-lib-turn-end-bridge.test.js`, `packages/app/test/branch-lib-updater.test.js`, `packages/app/test/branch-lib-user-profile.test.js`, `packages/app/test/branch-lib-voice-pack-manager.test.js`, `packages/app/test/branch-lib-ws-backpressure.test.js`, `packages/app/test/branch-proxy.test.js`, `packages/app/test/branch-pty-manager.test.js`, `packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/branch-routes-auth.test.js`, `packages/app/test/branch-routes-events.test.js`, `packages/app/test/branch-routes-files-content.test.js`, `packages/app/test/branch-routes-files-fs.test.js`, `packages/app/test/branch-routes-im.test.js`, `packages/app/test/branch-routes-plugins.test.js`, `packages/app/test/branch-routes-preferences.test.js`, `packages/app/test/branch-routes-skills.test.js`, `packages/app/test/branch-routes-team.test.js`, `packages/app/test/branch-routes-voice-pack.test.js`, `packages/app/test/branch-routes-workspaces.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/branch-workspace-registry.test.js`, `packages/app/test/ccswitch-import.test.js`, `packages/app/test/ccv-editor.test.js`, `packages/app/test/claude-md-discovery.test.js`, `packages/app/test/cli-boot.test.js`, `packages/app/test/cli-deep.test.js`, `packages/app/test/cli-extra.test.js`, `packages/app/test/cli-inject.test.js`, `packages/app/test/cli-modes.test.js`, `packages/app/test/cli.test.js`, `packages/app/test/code-replace.test.js`, `packages/app/test/code-search.test.js`, `packages/app/test/codefuse-managed-mode.test.js`, `packages/app/test/config-backup.test.js`, `packages/app/test/context-watcher.test.js`, `packages/app/test/dingtalk-adapter-deep.test.js`, `packages/app/test/dingtalk-bridge.test.js`, `packages/app/test/dingtalk-config.test.js`, `packages/app/test/discord-bridge.test.js`, `packages/app/test/discord-config.test.js`, `packages/app/test/enrich-plan-input.test.js`, `packages/app/test/enrich-workflow.test.js`, `packages/app/test/ensure-hooks-deep.test.js`, `packages/app/test/ensure-hooks.test.js`, `packages/app/test/events-backpressure.test.js`, `packages/app/test/events-deep.test.js`, `packages/app/test/events-kv-context-scan.test.js`, `packages/app/test/feishu-bridge.test.js`, `packages/app/test/feishu-config.test.js`, `packages/app/test/file-access-policy.test.js`, `packages/app/test/file-api-gap.test.js`, `packages/app/test/files-fs-deep.test.js`, `packages/app/test/findcc-gap.test.js`, `packages/app/test/findcc-logdir-listeners.test.js`, `packages/app/test/findcc.test.js`, `packages/app/test/git-diff.test.js`, `packages/app/test/git-repos.test.js`, `packages/app/test/git-restore.test.js`, `packages/app/test/git-unpushed.test.js`, `packages/app/test/im-append-system-seed.test.js`, `packages/app/test/im-bridge-core-deep.test.js`, `packages/app/test/im-bridge-core.test.js`, `packages/app/test/im-connection-state.test.js`, `packages/app/test/im-deny.test.js`, `packages/app/test/im-lang.test.js`, `packages/app/test/im-live-text.test.js`, `packages/app/test/im-lock-gap.test.js`, `packages/app/test/im-lock.test.js`, `packages/app/test/im-process-manager.test.js`, `packages/app/test/im-routes-gap.test.js`, `packages/app/test/im-senders.test.js`, `packages/app/test/im-skills.test.js`, `packages/app/test/im-spawn-test-guard.test.js`, `packages/app/test/import-file-api.test.js`, `packages/app/test/inject-output-config-effort.test.js`, `packages/app/test/install-method.test.js`, `packages/app/test/interceptor-continuation-sync.test.js`, `packages/app/test/interceptor-core-mainagent.test.js`, `packages/app/test/interceptor-fetch-errors.test.js`, `packages/app/test/interceptor-fetch.test.js`, `packages/app/test/interceptor-import-arms.test.js`, `packages/app/test/interceptor-imworker-init.test.js`, `packages/app/test/interceptor-live.test.js`, `packages/app/test/interceptor-profile.test.js`, `packages/app/test/interceptor-project-state.test.js`, `packages/app/test/interceptor-seq-producer.test.js`, `packages/app/test/interceptor-seq-teammate.test.js`, `packages/app/test/interceptor-teammate-init.test.js`, `packages/app/test/interceptor-v2-write.test.js`, `packages/app/test/interceptor-workspace-init.test.js`, `packages/app/test/interceptor.test.js`, `packages/app/test/kv-cache-analyzer.test.js`, `packages/app/test/log-file-utils.test.js`, `packages/app/test/log-management-gap.test.js`, `packages/app/test/log-management.test.js`, `packages/app/test/log-stream.test.js`, `packages/app/test/log-zip.test.js`, `packages/app/test/logdir-policy-invalidation.test.js`, `packages/app/test/logdir-test-guard.test.js`, `packages/app/test/migrate-prompt.test.js`, `packages/app/test/model-system-prompts.test.js`, `packages/app/test/paths-content.test.js`, `packages/app/test/pending-asks-filter.test.js`, `packages/app/test/perm-bridge.test.js`, `packages/app/test/pid-alive.test.js`, `packages/app/test/plan-file-api.test.js`, `packages/app/test/plugin-loader.test.js`, `packages/app/test/plugin-manager-gap.test.js`, `packages/app/test/project-prefs.test.js`, `packages/app/test/project-state.test.js`, `packages/app/test/proxy-env.test.js`, `packages/app/test/proxy-errors.test.js`, `packages/app/test/proxy-profile-isolation.test.js`, `packages/app/test/proxy-retry-cancel.test.js`, `packages/app/test/proxy-retry-stream-idle.test.js`, `packages/app/test/proxy-retry.test.js`, `packages/app/test/proxy-role-custom-endpoint.test.js`, `packages/app/test/proxy-role-proxy-mode.test.js`, `packages/app/test/proxy-role-routing.test.js`, `packages/app/test/proxy-server.test.js`, `packages/app/test/proxy-stats.test.js`, `packages/app/test/proxy-unit.test.js`, `packages/app/test/proxy.test.js`, `packages/app/test/pty-flood-coalescer.test.js`, `packages/app/test/pty-manager-deep.test.js`, `packages/app/test/pty-manager-gap.test.js`, `packages/app/test/pty-manager-real.test.js`, `packages/app/test/pty-manager.test.js`, `packages/app/test/replace-top-level-model.test.js`, `packages/app/test/resolve-profile-model.test.js`, `packages/app/test/resync-nudge-gate.test.js`, `packages/app/test/route-dispatch.test.js`, `packages/app/test/scratch-pty-manager-gap.test.js`, `packages/app/test/scratch-pty-manager.test.js`, `packages/app/test/sdk-adapter.test.js`, `packages/app/test/sdk-manager-extra.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-manager.test.js`, `packages/app/test/search-endpoint.test.js`, `packages/app/test/server-ask-hook-map.test.js`, `packages/app/test/server-auth-branches.test.js`, `packages/app/test/server-cli-mode.test.js`, `packages/app/test/server-cli-startup.test.js`, `packages/app/test/server-http-extra-2.test.js`, `packages/app/test/server-http-extra.test.js`, `packages/app/test/server-i18n.test.js`, `packages/app/test/server-im-worker.test.js`, `packages/app/test/server-lifecycle.test.js`, `packages/app/test/server-logs.test.js`, `packages/app/test/server-plugins.test.js`, `packages/app/test/server-ports-busy.test.js`, `packages/app/test/server-residual.test.js`, `packages/app/test/server-resync-request.test.js`, `packages/app/test/server-startup-extra.test.js`, `packages/app/test/server-v2-read.test.js`, `packages/app/test/server-ws-branches.test.js`, `packages/app/test/server.test.js`, `packages/app/test/session-pin.test.js`, `packages/app/test/session-start-bridge.test.js`, `packages/app/test/session-transcript-reader-toolresult.test.js`, `packages/app/test/session-transcript-reader.test.js`, `packages/app/test/settings-merge.test.js`, `packages/app/test/skills-api.test.js`, `packages/app/test/skills-import.test.js`, `packages/app/test/spawn-model-resolver.test.js`, `packages/app/test/sse-compression.test.js`, `packages/app/test/sse-update-badge-frame.test.js`, `packages/app/test/stats-worker-notification-filter.test.js`, `packages/app/test/stats-worker-proxy.test.js`, `packages/app/test/stats-worker.test.js`, `packages/app/test/stream-assembler.test.js`, `packages/app/test/streaming-state.test.js`, `packages/app/test/system-prompt-builder.test.js`, `packages/app/test/system-prompt-files.test.js`, `packages/app/test/system-prompt-presets.test.js`, `packages/app/test/system-prompt-render.test.js`, `packages/app/test/team-runtime.test.js`, `packages/app/test/team-status-endpoint.test.js`, `packages/app/test/term-signals.test.js`, `packages/app/test/terminal-env.test.js`, `packages/app/test/turn-end-bridge.test.js`, `packages/app/test/turn-end-debounce.test.js`, `packages/app/test/updater-pnpm.test.js`, `packages/app/test/updater.test.js`, `packages/app/test/upload-api.test.js`, `packages/app/test/usepassword-startup.test.js`, `packages/app/test/user-profile.test.js`, `packages/app/test/user-prompt-extract.test.js`, `packages/app/test/v2-adapter-incremental.test.js`, `packages/app/test/v2-adapter.test.js`, `packages/app/test/v2-continuation-adopt.test.js`, `packages/app/test/v2-convert.test.js`, `packages/app/test/v2-core.test.js`, `packages/app/test/v2-entry-endpoint.test.js`, `packages/app/test/v2-jsonl-read.test.js`, `packages/app/test/v2-meta-rows.test.js`, `packages/app/test/v2-resume-switch.test.js`, `packages/app/test/v2-session-dirname.test.js`, `packages/app/test/v2-session-list.test.js`, `packages/app/test/v2-session-owner.test.js`, `packages/app/test/v2-session-select.test.js`, `packages/app/test/v2-singleflight.test.js`, `packages/app/test/v2-verify.test.js`, `packages/app/test/v2-window-two-pass.test.js`, `packages/app/test/voice-pack-manager.test.js`, `packages/app/test/wecom-bridge.test.js`, `packages/app/test/wecom-config.test.js`, `packages/app/test/windows-compat.test.js`, `packages/app/test/windows-npm-root-regression.test.js`, `packages/app/test/wire-compress.test.js`, `packages/app/test/workflow-journal.test.js`, `packages/app/test/workflow-live.test.js`, `packages/app/test/workflow-watcher.test.js`, `packages/app/test/workspace-registry.test.js`, `packages/app/test/ws-backpressure.test.js`, `packages/content/test/ccv-projects.test.js`, `packages/core/test/approval-modal-prefs.test.js`, `packages/core/test/branch-lib-delta-reconstructor.test.js`, `packages/core/test/branch-utils-teammateDetector.test.js`, `packages/core/test/clearCheckpoint.test.js`, `packages/core/test/context-rules.test.js`, `packages/core/test/delta-reconstructor.test.js`, `packages/core/test/native-teammate-detector.test.js`, `packages/core/test/request-type-unit.test.js`, `packages/core/test/session-boundary.test.js`, `packages/core/test/sse-heartbeat.test.js`, `packages/core/test/synthetic-classification.test.js`, `packages/core/test/v2-transcript-normalizer.test.js`, `packages/core/test/voice-pack-events.test.js`, `test/boundary-checker.test.js`, `test/client-safe-imports.test.js`, `test/content-filter-unit.test.js`, `test/delta-e2e.test.js`, `test/delta-reorder.test.js`, `test/real-request-guard.test.js`, `test/session-boundary-parity.test.js`, `test/test-env-isolation-guard.test.js`, `test/ultraplan-detection.test.js`, `test/v2-image-pipeline.test.js`, `test/v2-live-feed.test.js`, `test/v2-transcript-incremental.test.js`, `test/v3-assembler.test.js`, `test/voice-pack-sanguo-integration.test.js`, `test/windows-import-paths.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/package.json` → `package.json`; `apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/askFlowController.js` → `src/components/chat/controllers/askFlowController.js`; `apps/web/src/components/chat/uploadDeferLogic.js` → `src/components/chat/uploadDeferLogic.js`; `apps/web/src/components/common/ConceptHelp.jsx` → `src/components/common/ConceptHelp.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/components/dashboard/RequestList.jsx` → `src/components/dashboard/RequestList.jsx`; `apps/web/src/components/mobile/MobileStats.jsx` → `src/components/mobile/MobileStats.jsx`; `apps/web/src/components/settings/ImConversationModal.jsx` → `src/components/settings/ImConversationModal.jsx`; `apps/web/src/components/settings/VoicePackSettings.jsx` → `src/components/settings/VoicePackSettings.jsx`; `apps/web/src/utils/entry-slim.js` → `src/utils/entry-slim.js`; `apps/web/src/utils/errorReport.js` → `src/utils/errorReport.js`; `apps/web/src/utils/helpers.js` → `src/utils/helpers.js`; `apps/web/src/utils/identityHeal.js` → `src/utils/identityHeal.js`; `apps/web/src/utils/modalMask.js` → `src/utils/modalMask.js`; `apps/web/src/utils/promptClassifier.js` → `src/utils/promptClassifier.js`; `apps/web/src/utils/promptDetect.js` → `src/utils/promptDetect.js`; `apps/web/src/utils/sessionManager.js` → `src/utils/sessionManager.js`; `apps/web/src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`; `apps/web/src/utils/skillsParser.js` → `src/utils/skillsParser.js`; `apps/web/src/utils/teamModalBuilder.js` → `src/utils/teamModalBuilder.js`; `apps/web/src/utils/toolCatalog.js` → `src/utils/toolCatalog.js`; `apps/web/src/utils/toolsXmlFormatter.js` → `src/utils/toolsXmlFormatter.js`; `apps/web/src/utils/voicePackPlayer.js` → `src/utils/voicePackPlayer.js`; `jsconfig.json` → `jsconfig.json`; `package.json` → `package.json`; `packages/app/package.json` → `package.json`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/context-watcher.js` → `lib/context-watcher.js`; `packages/app/server/lib/file-api.js` → `lib/file-api.js`; `packages/app/server/lib/interceptor-core.js` → `lib/interceptor-core.js`; `packages/app/server/lib/log-management.js` → `lib/log-management.js`; `packages/app/server/lib/skills-api.js` → `lib/skills-api.js`; `packages/app/server/lib/stats-worker.js` → `lib/stats-worker.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/src/utils/clearCheckpoint.js` → `src/utils/clearCheckpoint.js`; `packages/core/src/approval-modal-prefs.js` → `server/lib/approval-modal-prefs.js`; `packages/core/src/clearCheckpoint.js` → `src/utils/clearCheckpoint.js`; `packages/core/src/contentFilter.js` → `src/utils/contentFilter.js`; `packages/core/src/context-rules.js` → `server/lib/context-rules.js`; `packages/core/src/delta-reconstructor.js` → `server/lib/delta-reconstructor.js`; `packages/core/src/requestType.js` → `src/utils/requestType.js`; `packages/core/src/teammateDetector.js` → `src/utils/teammateDetector.js`; `packages/core/src/tools-xml-formatter.js` → `server/lib/tools-xml-formatter.js`; `packages/core/src/voice-pack-events.js` → `server/lib/voice-pack-events.js`; `scripts/gen-default-voicepack.js` → `scripts/gen-default-voicepack.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `When adding new interactive controls, remember to add corresponding i18n entries`; `The repo uses pnpm (pinned via the 'packageManager' field; settings in 'pnpm-wor`; `Do not increment the version number arbitrarily; versions are bumped by 'pnpm ch`; `Use English for all code comments, commit messages, and inline documentation —`; `The suite has two tiers:`; `import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } fr`; `const APP_PAYLOAD = [`; `writeFileSync(join(STAGE, 'package.json'), '${JSON.stringify(stagePkg, null, 2)}`; `import { formatSize } from './utils/formatters';`; `import { getProjectAlias, subscribeToAlias } from './utils/projectAlias';`; `import { playEvent as playVoiceEvent, unlockAudio, setTurnEndCooldownMs } from '`; `import { mergeMainAgentSessions as _mergeMainAgentSessions, isMergeBlockedEntry,`; `import { isIOS, isPad, setViewMode } from './env';`; `import { applyAvatarAnimationTargets } from '../../utils/avatarAnimationPostPass`; `import { isPlanApprovalPrompt, isDangerousOperationPrompt } from '../../../utils`; `import styles from './ConceptHelp.module.css';`; `import { PERM_AUTO_APPROVE_OPTIONS, PLAN_AUTO_APPROVE_OPTIONS, autoApproveSelect`; `import { reportSwallowed } from '../../utils/errorReport';`; `import { formatTokenCount, stripPrivateKeys, hasClaudeMdReminder, isClaudeMdRemi`; `import { formatTokenCount, getModelShort } from '../../utils/helpers';`; `import { formatTokenCount, computeTokenStats, computeCacheRebuildStats, computeT`; `import { cachedBuildToolResultMap } from '../../utils/toolResultBuilder';`; `import { mergeMainAgentSessions } from '../../utils/sessionMerge';`; `import { previewEvent, stopPreview, unlockAudio } from '../../utils/voicePackPla`; `resolution rule ('PREFIX_RULES' / 'SUFFIX_RULES' / 'CONTAINS_RULES' /`; `import { internToolResultIfPooled } from './readResultPool.js';`; `import modelClaudeAnimatedSvg from '../img/claude/writing.svg?raw';`; `export {`; `import React from 'react';`; `import { now } from './monotime.js';`.
- Upstream commit message excerpt: - @ccv/core: 12 isomorphic judgment modules extracted into packages/core (private; shipped inside the cc-viewer tarball via bundledDependencies — npm pack follows the pnpm workspace symlink). All call sites import @ccv/core/<name>; boundary gate gains a CORE layer (R8: core imports only core) and R6 is inverted to a full web→packages/app ban. - boundary gate: scripts/verify-boundaries.mjs enforces the packages/app layering contract (L0-L4 classes, R0-R7+CLS, ratcheted allowlist) from all pretest* hooks + CI; remaining static ESM cycles broken (log-file-utils leaf, project-state leaf, onLogDirChange registry inversion, im-deny promoted). - tests: the 466 root test/ files are redistributed — 438 into per-package test dirs (packages/app 282, apps/web 149, apps/electron 4, packages/core +2, packages/content 1) and 28 cross-package integration / repo-guard tests stay at root. Migration-plan §7 decision 2 reversed (recorded in the doc appendix). Boundary gate EXCLUDE_DIRS gains 'test'; the t…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-16267dc04c"></a>
## [16267dc04c](./cc-viewer-alignment-commit-ledger.md#commit-16267dc04c) — fix(system-prompt): pin original system prompt on -c/-r resumes

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:34:01-04:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：8；上游测试文件：4。
- 上游测试：`packages/app/test/pty-manager.test.js`, `packages/app/test/sys-prompt-bind.test.js`, `packages/app/test/system-prompt-render.test.js`, `packages/app/test/system-prompt-snapshots.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`。
- B0 diff inspection: 18 distinct hunk context(s) extracted (up to 30): `const i18nData = {`; `import { setProjectName } from './lib/project-state.js';`; `function resolveProjectBinding() {`; `export function markSessionStart(payload) {`; `export function initForWorkspace(projectPath, { forceNew = false } = {}) { // es`; `export const DISABLE_AUTO_SYSTEM_PROMPT_ENV = 'CCV_DISABLE_AUTO_SYSTEM_PROMPT';`; `export function renderedPromptDir(pid = process.pid) {`; `export function renderSystemPromptFileArgs(sysPrompt, opts = {}) {`; `import { extractUserTexts, flattenPromptText, isSuggestionMode, readPromptsHead`; `export class V2Writer {`; `import { join, dirname, sep } from 'node:path';`; `import { findSafeSliceStart, splitTrailingIncomplete } from './lib/ansi-safe-sli`; `import { mergeSettingsIntoArgs } from './lib/settings-merge.js';`; `let _suppressNextSpawnNotice = false;`; `async function _spawnClaudeImpl(proxyPort, cwd, extraArgs = [], claudePath = nul`; `import assert from 'node:assert/strict';`; `describe('pty-manager: withDefaultThinkingDisplay', () => {`; `describe('renderSystemPromptFileArgs', () => {`.
- Upstream commit message excerpt: Continuation launches re-rendered ${...} template variables at spawn (git.status / recentCommits / dates drift within minutes), so the injected system text diverged byte-for-byte from the resumed conversation's original and busted the entire prompt-prefix KV cache. Resume launches now pin the recorded original content verbatim: - new leaf store server/lib/system-prompt-snapshots.js: per-conversation records keyed by transcript uuid + a capped pending queue (atomic writes, GC with grace window, content-validated entries) - Bind A (v2-writer): a fresh session's first main request content-matches its system text against the queue (longest full match wins; probes, teammates, adopted sessions and the offline converter gated out) - Bind B (SessionStart hook): resume/fork launches bind identity-exactly (resolvedUuid for 'resume', fork flag for 'fork') — stolen or out-of-order hooks can neither poison records nor cascade-destroy the queue - identified-but-unrecorded resume targets inject nothi…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-cda9ed326d"></a>
## [cda9ed326d](./cc-viewer-alignment-commit-ledger.md#commit-cda9ed326d) — fix(deps): carry CVE-2026-13676/CVE-2026-39244 fixes into the monorepo layout

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-20T09:39:45-04:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：3；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`; `packages/app/package.json` → `package.json`。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `overrides:`; `importers:`; `packages:`; `snapshots:`; `allowBuilds:`.
- Upstream commit message excerpt: The pre-split main fixed fast-uri (override pin 4.1.2) and adm-zip (^0.5.17 -> ^0.6.0) in the old single-package manifest; the monorepo rebase moved manifests, so the fixes are re-applied where the deps now live: adm-zip ^0.6.0 in root + packages/app + apps/electron, and the fast-uri 4.1.2 pin in pnpm-workspace.yaml overrides. pnpm-lock.yaml regenerated via pnpm install (never hand-edited). Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-72551f625b"></a>
## [72551f625b](./cc-viewer-alignment-commit-ledger.md#commit-72551f625b) — fix(system-prompt): drop 7 loop-volatile dynamic prompt variables

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-23T13:30:04+08:00；父提交 1；相对第一父文件数 23。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`packages/app/test/system-prompt-builder.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 15 distinct hunk context(s) extracted (up to 30): `export function createSystemPromptVariables(overrides = {}, opts = {}) {`; `${environment.workspaceRoots}`; `${sandbox.writableRoots}`; `Denne fil dokumenterer kun variablerne i 'systemPromptModel.md', der skal løses`; `Diese Datei dokumentiert nur die Variablen in 'systemPromptModel.md', die zur La`; `Este archivo documenta únicamente las variables en 'systemPromptModel.md' que d`; `Ce fichier documente uniquement les variables dans 'systemPromptModel.md' qui do`; `Questo file documenta solo le variabili in 'systemPromptModel.md' che devono ess`; `This file documents only the variables in 'systemPromptModel.md' that must be re`; `Denne filen dokumenterer bare variablene i 'systemPromptModel.md' som må løses`; `Ten plik dokumentuje tylko zmienne w 'systemPromptModel.md', które muszą być`; `Este arquivo documenta apenas as variáveis em 'systemPromptModel.md' que devem`; `Bu dosya, 'systemPromptModel.md' içindeki çalışma zamanında çözülmesi ge`; `function fixtureVariables(overrides = {}) {`; `describe('createSystemPrompt: variable rendering + missing modes', () => {`.
- Upstream commit message excerpt: Remove ${git.status}, ${os.uptime}, ${os.freeMemory}, ${terminal.columns}, ${terminal.rows}, ${time.current}, ${time.iso} — they drift mid-session so the injected system text goes stale and misleads context. Removed from the default template, the Dynamic Parameter Documentation (×18 locales), and createSystemPromptVariables; stable identifiers stay. Removed placeholders stay literal under missingVariableMode 'keep' (regression test added).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-efc7f8eab1"></a>
## [efc7f8eab1](./cc-viewer-alignment-commit-ledger.md#commit-efc7f8eab1) — feat(chat): floating composer overlay + SDK full-surface parity

- B0 snapshot comparison: 21 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-23T14:08:45+08:00；父提交 1；相对第一父文件数 61。
- 上游生产/配置文件：21；上游测试文件：20。
- 上游测试：`apps/web/test/floating-input-stack.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/wsopen-sdk-gate.test.js`, `packages/app/test/approval-policy.test.js`, `packages/app/test/branch-lib-sdk-manager.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/interceptor-core-mainagent.test.js`, `packages/app/test/launch-config.test.js`, `packages/app/test/pty-manager.test.js`, `packages/app/test/sdk-adapter.test.js`, `packages/app/test/sdk-manager-extra.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-manager.test.js`, `packages/app/test/server-http-extra.test.js`, `packages/app/test/server-lifecycle.test.js`, `packages/app/test/server-residual.test.js`, `packages/app/test/spawn-model-resolver.test.js`, `packages/app/test/turn-end-debounce.test.js`, `packages/core/test/native-teammate-detector.test.js`, `test/content-filter-unit.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalPanel.module.css` → `src/components/terminal/TerminalPanel.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/interceptor-core.js` → `lib/interceptor-core.js`; `packages/app/server/lib/sdk-adapter.js` → `lib/sdk-adapter.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/contentFilter.js` → `src/utils/contentFilter.js`; `packages/core/src/teammateDetector.js` → `src/utils/teammateDetector.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `cc-viewer also ships as a native desktop app: [download page](https://github.com`; `import { TerminalWsProvider } from './components/terminal/TerminalWsContext';`; `class App extends AppBase {`; `class Mobile extends AppBase {`; `class ChatView extends React.Component {`; `class TerminalPanel extends React.Component {`; `const i18nData = {`; `const I18N_SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..'`; `const KEYS = [`; `ccv -c --d             # == claude --continue --dangerously-skip-permissions`; `cc-viewer findes også som native desktop-app: [Downloadside](https://github.com`; `CC-Viewer wird auch als native Desktop-App ausgeliefert: [Download-Seite](https:`; `cc-viewer también se distribuye como aplicación de escritorio nativa: [Página`; `cc-viewer est également distribué en tant qu'application de bureau native : [P`; `cc-viewer è anche distribuito come applicazione desktop nativa: [Pagina di down`; `cc-viewer はネイティブデスクトップアプリも提供しています`; `cc-viewer 는 네이티브 데스크톱 앱도 제공합니다: [다운로드`; `cc-viewer kommer også som native desktop-app: [Nedlastingsside](https://github.`; `cc-viewer jest również dostarczany jako natywna aplikacja desktopowa: [Strona`; `cc-viewer também é distribuído como aplicativo desktop nativo: [Página de do`; `cc-viewer также предоставляет клиентскую верси`; `cc-viewer มีเวอร์ชันไคลเอนต์ให้บร`; `cc-viewer'ın istemci sürümü de mevcuttur: [İndirme bağlantısı](https://g`; `cc-viewer також постачається як клієнтська верс`; `cc-viewer 也提供了客戶端版本：[下載連結](https://github.com/weiesk`; `cc-viewer提供了客户端的版本：[下载地址](https://github.com/weiesky`; `import { mergeSettingsIntoArgs } from './server/lib/settings-merge.js';`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `import { evaluateImDeny } from '../im-deny.js';`; `if (!toolName || !toolInput) {`.
- Upstream commit message excerpt: - Floating composer: inputStack absolute + gradient background + spacer div - SDK mode: full PTY-parity surface (approvals, slash commands, compact notices) - Server: terminalWss cleanup on stop, sdk-init WS replay, sdkCompactNotices cap - Tests: floating-input-stack regression suite, wsopen-sdk-gate, approval-policy, launch-config - i18n: sdkError/sdkCompacted/sdkSlashHint keys across 18 locales - Docs: README + history.md updated

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6ebeea8439"></a>
## [6ebeea8439](./cc-viewer-alignment-commit-ledger.md#commit-6ebeea8439) — Merge branch 'feat/remove-volatile-prompt-vars'

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-23T15:05:38+08:00；父提交 2；相对第一父文件数 23。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`packages/app/test/system-prompt-builder.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `@`.
- Upstream commit message excerpt: Drop 7 loop-volatile dynamic system-prompt variables (git.status, os.uptime, os.freeMemory, terminal.columns/rows, time.current/iso) that drifted mid-session and misled context. Removed from the default template, the Dynamic Parameter Documentation (×18 locales), and createSystemPromptVariables; stable identifiers stay. # Conflicts: # history.md

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-93a17ea623"></a>
## [93a17ea623](./cc-viewer-alignment-commit-ledger.md#commit-93a17ea623) — chore(tarball): add approval-policy.js + launch-config.js to the tarball baseline

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-23T15:32:21+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: The verify:tarball gate flagged the two new server/lib modules (production deps of pty-manager / sdk-manager / perm-bridge / cli.js) as a baseline delta. Regenerate the baseline so CI's tarball contract passes.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7a2dd6162e"></a>
## [7a2dd6162e](./cc-viewer-alignment-commit-ledger.md#commit-7a2dd6162e) — fix(sdk): expand all system segments in request JSON view on first-turn MainAgent requests

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-23T22:16:20+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：4；上游测试文件：1。
- 上游测试：`apps/web/test/request-expand.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/ContextTab.jsx` → `src/components/dashboard/ContextTab.jsx`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `export default function ContextTab({ body, response, prevTools }) {`; `import { restoreSlimmedEntry } from '../../utils/entry-slim.js';`; `class DetailPanel extends React.Component {`; `const i18nData = {`.
- Upstream commit message excerpt: The DetailPanel JSON view previously only expanded system[2] for Preflight requests, so SDK-mode first-turn requests (classified as MainAgent) kept every system segment collapsed. The policy now expands the full system array for single-message MainAgent requests, making the SDK base prompt visible. Also add an SDK-mode placeholder notice in the Context tab system-prompt section explaining that only a condensed 2-segment capture is available and recommending TUI mode for the complete prompt.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-dafe2bce37"></a>
## [dafe2bce37](./cc-viewer-alignment-commit-ledger.md#commit-dafe2bce37) — feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-23T19:33:38-04:00；父提交 1；相对第一父文件数 23。
- 上游生产/配置文件：11；上游测试文件：7。
- 上游测试：`apps/web/test/branch-utils-sessionMerge.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/queue-bubbles.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/chat-queue.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/core/test/branch-lib-delta-reconstructor.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/delta-reconstructor.js` → `server/lib/delta-reconstructor.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `const i18nData = {`; `export function shouldDegradeBrokenMerge(entry, prevSessions) {`; `export function mergeMainAgentSessions(prevSessions, entry, options = {}) {`; `describe('mergeMainAgentSessions 分支', () => {`; `describe('findReverseAnchor 间接分支', () => {`; `describe('shouldDegradeBrokenMerge + partial-session merge', () => {`; `const KEYS = [`; `entry 形态（delta/checkpoint/'_inPlaceReplaceDetected' 信号）在**请求`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `function audit(inst, event, data) {`; `function markOrigin(id, senderId, content) {`; `function sanitizeInbound(text) {`; `const _pendingApprovals = new Map();`; `let _messageQueue = [];`; `export async function sendUserMessage(text) {`; `export function cancelApproval(id, reason) {`; `export function interruptTurn() {`; `function _resetFullState() {`; `import * as imProcMgr from './lib/im/im-process-manager.js';`; `async function setupTerminalWebSocket(httpServer) {`; `function _emitTurnEnd(sessionId, ts, transcriptPath = null) {`; `function _scheduleTurnEndBroadcast(sessionId, ts, transcriptPath = null) {`; `function _onStreamingActivated() {`; `async function _doStop() {`; `export function broadcastWsMessage(msg) {`; `export function setSdkGetInitSnapshot(fn) { _sdkGetInitSnapshot = fn; }`; `try {`; `describeCli('server.js handleRequest 分支（in-process CLI server）', { concu`; `describeCli('server.js 模块加载期 / startViewer env 分支（子进程）',`.
- Upstream commit message excerpt: - feat(chat): server-authoritative busy queue broadcast as queue-state over the terminal WS (replayed on reconnect) and rendered as floating bubbles above the composer, each with Send now (interrupt + immediate inject, Claude Code Esc parity) and remove; SDK mode gets id-addressable {id,text,ts} queue items with sendQueuedNow/removeQueued/clearQueued/ getQueueSnapshot exports; PTY mode gets a dependency-injected server/lib/chat-queue.js injecting via the IM bridge bracketed-paste path, guarded on streaming/approvals/pty-kind/mutex with a no-blind- inject safety poll (minor). - fix(logs): interrupted requests no longer freeze the conversation view — placeholder CHECKPOINTS from never-completed turns now absorb into the baseline across all three reconstruction APIs (patch). - fix(chat): queued/send-now user messages now render in the conversation panel — mergeMainAgentSessions fallback is now a deepest-common-prefix extension, documented as WIRE_FORMAT.md §3.8 (patch). Co-Authored-By: Cl…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-e987c387f4"></a>
## [e987c387f4](./cc-viewer-alignment-commit-ledger.md#commit-e987c387f4) — release: cc-viewer 1.8.0 (changeset version)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T10:30:01+08:00；父提交 1；相对第一父文件数 12。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6bcf5e5ab3"></a>
## [6bcf5e5ab3](./cc-viewer-alignment-commit-ledger.md#commit-6bcf5e5ab3) — fix(electron): preserve publish metadata in staging

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T10:46:13+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/electron/test/stage-manifest.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `import { fileURLToPath } from 'node:url';`; `const electronPkg = JSON.parse(readFileSync(join(ELECTRON_APP, 'package.json'),`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-bb8095c7fb"></a>
## [bb8095c7fb](./cc-viewer-alignment-commit-ledger.md#commit-bb8095c7fb) — fix(release): streamline notarization and tarball checks

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T11:47:56+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：4；上游测试文件：2。
- 上游测试：`apps/electron/test/notarization-config.test.js`, `test/npm-pack-json.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `files:`; `mac:`; `importers:`; `packages:`; `snapshots:`; `import { execFileSync } from 'node:child_process';`; `import { fileURLToPath } from 'node:url';`; `function fail(msg) {`; `execFileSync('pnpm', ['--filter', 'cc-viewer', 'run', 'assemble'], { cwd: REPO_R`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7ac9363385"></a>
## [7ac9363385](./cc-viewer-alignment-commit-ledger.md#commit-7ac9363385) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T04:03:53+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-bacfe559fe"></a>
## [bacfe559fe](./cc-viewer-alignment-commit-ledger.md#commit-bacfe559fe) — fix(release): support npm 12 pack output

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T12:06:49+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/npm-pack-json.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `jobs:`; `export function parseNpmPackFiles(output) {`; `describe('parseNpmPackFiles', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c185a7484e"></a>
## [c185a7484e](./cc-viewer-alignment-commit-ledger.md#commit-c185a7484e) — refactor(context): rename Context tab per-exchange "Turn N" concept to "Step N"

- B0 snapshot comparison: 22 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T05:24:41-04:00；父提交 1；相对第一父文件数 47。
- 上游生产/配置文件：5；上游测试文件：4。
- 上游测试：`apps/web/test/context-raw.test.js`, `apps/web/test/context-sidebar-navigation.test.js`, `apps/web/test/context-steps.test.js`, `apps/web/test/context-turns.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/ContextTab.jsx` → `src/components/dashboard/ContextTab.jsx`; `apps/web/src/components/dashboard/ContextTab.module.css` → `src/components/dashboard/ContextTab.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/contextRaw.js` → `src/utils/contextRaw.js`。
- B0 diff inspection: 24 distinct hunk context(s) extracted (up to 30): `import { buildContextItemRawText } from '../../utils/contextRaw';`; `const { Text } = Typography;`; `function parseToolBlocks(tool) {`; `function RenderBlock({ block, compact }) {`; `function TurnContent({ turn }) {`; `export default function ContextTab({ body, response, prevTools }) {`; `const i18nData = {`; `import { stripPrivateKeys } from './helpers';`; `export function buildContextItemRawText(item) {`; `describe('buildContextItemRawText', () => {`; `describe('getContextSidebarArrowNavigation', () => {`; `Når Anthropic's API opbygger KV-Cache, sammensætter den konteksten til et præ`; `Wenn die Anthropic API den KV-Cache aufbaut, verkettet sie den Kontext in dieser`; `When Anthropic's API constructs the KV-Cache, it concatenates context into a pre`; `Cuando la API de Anthropic construye el KV-Cache, concatena el contexto en un pr`; `Lorsque l'API Anthropic construit le KV-Cache, elle concatène le contexte en un`; `Quando l'API di Anthropic costruisce il KV-Cache, concatena il contesto in un pr`; `Anthropic のAPIがKV-Cacheを構築する際、コンテキストを以下の**`; `Anthropic의 API가 KV-Cache를 구성할 때, 컨텍스트를 다음 **고정`; `Når Anthropic's API bygger opp KV-Cache, setter den sammen konteksten til et pr`; `Gdy Anthropic API buduje KV-Cache, łączy kontekst w prefiks w tej **stałej ko`; `Quando a API da Anthropic constrói o KV-Cache, ela concatena o contexto em um p`; `Anthropic'in API'si KV-Cache'i oluştururken, bağlamı bu **sabit sırayla** bi`; `Anthropic API 在构建 KV-Cache 时，按以下**固定顺序**将上下文拼`.
- Upstream commit message excerpt: Terminology: a complete session is one turn; each user→assistant loop iteration inside it is a step. Covers the history-list and current-item labels (ui.context.currentTurn/historyTurnNoTime → currentStep/ historyStepNoTime, re-translated ×18 locales), the detail-panel chip (Turn 22 → Step 22), the grouping module (contextTurns.js → contextSteps.js; groupMessagesIntoSteps; node shape isStep/stepIndex/ step__* ids), ContextTab internals (StepContent/formatStepTime/ .stepDivider), and the ToolsFirst concept doc's cache-prefix diagram (×18 locales). Turn-end (Stop hook) naming unchanged — it marks the end of the whole turn. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-dc1aeb2840"></a>
## [dc1aeb2840](./cc-viewer-alignment-commit-ledger.md#commit-dc1aeb2840) — docs(research): add automated test-case generation survey

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T07:24:56-04:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Survey of 44 GitHub repos that generate automated test cases (LLM unit test generators, skill/prompt collections, API/UI generators, classic SBST/symbolic tools as baselines), plus agent-workflow teardowns (TestGen-LLM filter cascade, CoverAgent analyze/generate split, UTBot error suite, oracle-compliance failure modes) and the test-design methodology reference — the basis for the Test Analysis Expert UltraPlan preset. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-f28d9cae37"></a>
## [f28d9cae37](./cc-viewer-alignment-commit-ledger.md#commit-f28d9cae37) — feat(ultraplan): add Test Analysis Expert (测分专家) preset expert

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T07:26:46-04:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`test/ultra-agents-api.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `in 'src/utils/ultraplanTemplates.js'). Preset 'content' should therefore be writ`; `Each file undergoes defensive validation at load time. Invalid files are skipped`; `describe('built-in presets match ultraplanTemplates.js', () => {`.
- Upstream commit message excerpt: Third preset in packages/content/ultraAgents/ (standalone-authored, title/description inline-localized x18 languages): turns local Claude Code into a UI test-analysis expert that produces a markdown test analysis report plus Midscene.js YAML automation flows. Workflow: gated materials intake (system-analysis docs, requirements, SUT repo, environment context; AskUserQuestion when required items are missing) -> multi-agent analysis (requirements deconstruction / system-analysis mapping / code grounding / environment completeness / asset inventory) -> test-analysis report with test-design decision rules (EP+BVA / decision tables / state-transition / pairwise / risk-based) submitted via an ExitPlanMode gate -> approval-gated YAML generation (official-docs-verified Midscene schema, instant-action vs aiAct split, visual prompts, YAML string-quoting and flow-key structural rules, self-contained flows, login-state strategy, ${VAR} secret placeholders) under an anti-oracle-compliance guardrail …

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-fe0c52ff60"></a>
## [fe0c52ff60](./cc-viewer-alignment-commit-ledger.md#commit-fe0c52ff60) — feat(system-prompt): built-in model system prompts default-effective with override + tombstone disable

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T11:22:01-04:00；父提交 1；相对第一父文件数 40。
- 上游生产/配置文件：13；上游测试文件：7。
- 上游测试：`apps/web/test/builtin-prompt-tabs.test.js`, `apps/web/test/expert-i18n.test.js`, `packages/app/test/api-expert-model-prompts.test.js`, `packages/app/test/api-expert-system-prompt-status.test.js`, `packages/app/test/builtin-model-prompts.test.js`, `packages/app/test/launch-config.test.js`, `packages/app/test/system-prompt-files.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/settings/ModelPromptTabs.jsx` → `src/components/settings/ModelPromptTabs.jsx`; `apps/web/src/components/settings/SystemTextModal.jsx` → `src/components/settings/SystemTextModal.jsx`; `apps/web/src/components/settings/SystemTextModal.module.css` → `src/components/settings/SystemTextModal.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `The **Edit System Prompt** modal (hamburger menu → Edit System Prompt) is tabb`; `class AppHeader extends React.Component {`; `import { t } from '../../i18n';`; `function FieldHelp({ text }) {`; `export default function ModelPromptTabs({`; `import { collectModelSuggestions } from '../../utils/modelSuggestions';`; `import styles from './SystemTextModal.module.css';`; `export default function SystemTextModal({ open, onClose }) {`; `const i18nData = {`; `const KEYS = [`; `ccv -h`; `Modalen **Rediger systemprompt** (hamburgermenu → Rediger systemprompt) er opd`; `Das Modal **System-Prompt bearbeiten** (Hamburger-Menü → System-Prompt bearbe`; `El modal **Editar prompt del sistema** (menú de hamburguesa → Editar prompt d`; `La fenêtre modale **Modifier le prompt système** (menu hamburger → Modifier`; `La finestra modale **Modifica prompt di sistema** (menu hamburger → Modifica p`; `QR コードをスキャンしてモバイル端末からコーディングす`; `QR 코드를 스캔하여 모바일 디바이스에서도 코딩할 수 있습`; `Modalen **Rediger systemprompt** (hamburgermeny → Rediger systemprompt) er del`; `Okno modalne **Edytuj prompt systemowy** (menu hamburger → Edytuj prompt syste`; `O modal **Editar prompt do sistema** (menu de hambúrguer → Editar prompt do s`; `Mobil programlamaya dair hayallerinizi gerçekleştirin. Ayrıca bir eklenti mek`; `export function suppressManuallyFlaggedPinned(entries, userArgs) {`; `function _defaultModelReader(spawnDir, env, opts) {`; `export function resolveLaunchSystemPrompt(p) {`; `function modelIdVariants(id) {`; `export function matchModelPrompt(modelId, candidates) {`; `import { MODEL_PROMPT_DIR, matchModelPrompt } from './model-system-prompts.js';`; `import { isNonEmptyFile } from './file-api.js';`; `export function hasArg(args, ...names) {`.
- Upstream commit message excerpt: The six shipped presets (deepseek-v4-pro / deepseek-v4-flash / GLM-5.2 / Qwen-3.7-Max / kimi-k2.7-code / kimi-k3) are now injected automatically at spawn when the resolved model matches and no user entry exists (workspace > global > built-in; user files always win). A built-in hit carries user-entry semantics: it fully replaces the Default sentinels for that launch (all presets are override-mode; visible in the launch log as builtin:<NAME>). - new server/lib/builtin-model-prompts.js: manifest-driven matching (expandModelIdVariants alias expansion shared with the user-file layer, fixing the k3[1m] priority gap), per-scope tombstones (system_prompt/.builtin-disabled.json; corrupt files warn via reportSwallowed, never silently), content-addressed materialization (read-back hash verify, atomic renameSyncWithRetry, aged GC) — injection stays on --system-prompt-file so snapshot pinning/Bind A are unaffected; the whole layer degrades to sentinels on any failure - spawn diagnostics distinguish…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-936e4637c8"></a>
## [936e4637c8](./cc-viewer-alignment-commit-ledger.md#commit-936e4637c8) — release: cc-viewer 1.8.1 (changeset version)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T11:22:40-04:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1af3d646c9"></a>
## [1af3d646c9](./cc-viewer-alignment-commit-ledger.md#commit-1af3d646c9) — fix(ultraplan): rework Test Analysis Expert preset around Plan tool with staticized Midscene rules

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-24T23:41:40-04:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Mirror the Code Expert design: the plan phase is an explicit Plan-tool workflow (EnterPlanMode up front, report IS the plan, two mandatory non-skippable optimization rounds — review-agent pass, then ExitPlanMode approval). Midscene.js YAML authoring rules are now a locked self-contained snapshot inlined in the prompt (recordToReport documented); the GitHub reference is removed and external doc fetches are forbidden so the preset works offline. Descriptions x18 locales state the Midscene-specific scope constraint. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7c1963aca1"></a>
## [7c1963aca1](./cc-viewer-alignment-commit-ledger.md#commit-7c1963aca1) — fix(app-header): show only main profile on proxy hot-switch chip

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-25T06:42:11-04:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/proxy-chip-label.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `class AppHeader extends React.Component {`.
- Upstream commit message excerpt: The header chip used to spell out sub-agent/teammate role assignments ("· Sub: X · Teammate: Y") inline, which made the header too verbose. The chip label now shows just the main profile; the full role breakdown remains available in the hover tooltip (ui.proxy.roleSummary) and in the ProxyModal assignment area. Visibility guard (wake on role overrides when main is Default) is unchanged. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3a2159219b"></a>
## [3a2159219b](./cc-viewer-alignment-commit-ledger.md#commit-3a2159219b) — feat(context): default unrecognized model context window to 1M

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-25T15:46:11-04:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：3；上游测试文件：4。
- 上游测试：`apps/web/test/helpers-unit-a.test.js`, `apps/web/test/helpers.test.js`, `packages/app/test/context-watcher.test.js`, `packages/core/test/context-rules.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/utils/helpers.js` → `src/utils/helpers.js`; `packages/app/server/lib/context-watcher.js` → `lib/context-watcher.js`; `packages/core/src/context-rules.js` → `server/lib/context-rules.js`。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `const CALIBRATION_TOKEN_MAP = {`; `describe('getModelMaxTokens', () => {`; `describe('helpers', () => {`; `export function getContextSizeForModel(modelOrEntry) {`; `describe('context-watcher: getContextSizeForModel — entry 形式(热切换感`; `const MODEL_CONTEXT_SIZES = [`; `export function getModelMaxTokens(modelName) {`; `describe('getModelMaxTokens — 家族档位', () => {`; `describe('classifyContextWindow — 校准二分类', () => {`.
- Upstream commit message excerpt: The shared rules table (@ccv/core/context-rules) fell through to 200K for any model name outside the known families, so the usage bar filled far too fast for unlisted third-party models. Unknown-but-present model names now resolve to 1M; explicit [Nk]/[Nm] suffixes and every recognized family (bare claude/haiku/old-opus 200K, gpt 128K, kimi/moonshot 256K) are unchanged, and empty/missing names keep the legacy 200K static fallback. All consumers inherit the new default: frontend classifyContextWindow auto calibration, server SSE getContextSizeForModel, and the Workflow · 1M badge. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9eb178145b"></a>
## [9eb178145b](./cc-viewer-alignment-commit-ledger.md#commit-9eb178145b) — refactor(footer): plain GitHub link and hide plan-usage pill without data

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-25T15:46:39-04:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：5；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/dashboard/UsageWindowPill.jsx` → `src/components/dashboard/UsageWindowPill.jsx`; `apps/web/src/components/dashboard/UsageWindowPill.module.css` → `src/components/dashboard/UsageWindowPill.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `class AppBase extends React.Component {`; `function windowShort(id) {`; `function UsageWindowPill({ planUsage, authType }) {`; `const i18nData = {`.
- Upstream commit message excerpt: Two footer simplifications: - The GitHub link no longer fetches api.github.com for the stargazer count — it renders a fixed "[logo] GitHub" label. The githubStars state and fetch block are removed. - The plan-usage pill now renders only when usage data actually exists; the OAuth silent placeholder ("—" pill with a waiting popover) is gone, along with its ui.usage.waiting i18n key and .muted style. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-51c974e441"></a>
## [51c974e441](./cc-viewer-alignment-commit-ledger.md#commit-51c974e441) — feat(permission): default auto-approve to a 3s countdown

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-25T15:47:02-04:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：2；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `class Mobile extends AppBase {`.
- Upstream commit message excerpt: Fresh installs (and users who never touched the setting) now get the 3-second auto-approve tier on permission prompts instead of manual-only. Users who previously picked a tier — including "Off" — keep their stored preference, since preferences.json hydration still wins. Plan-approval auto-approve stays off by default; desktop and mobile defaults are aligned. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-72c059f6b9"></a>
## [72c059f6b9](./cc-viewer-alignment-commit-ledger.md#commit-72c059f6b9) — feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-25T15:47:27-04:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：1；上游测试文件：4。
- 上游测试：`packages/app/test/api-expert-model-prompts.test.js`, `packages/app/test/builtin-model-prompts.test.js`, `packages/app/test/system-prompt-builder.test.js`, `packages/app/test/system-prompt-presets.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `IMPORTANT: Never generate or guess URLs unless you are confident they help the u`; `IMPORTANT: Do not guess URLs; use ones the user provides or ones found in local`; `describe('api expert model-prompts — builtin 层', () => {`; `const {`; `describe('builtin-model-prompts: 条目列表', () => {`; `describe('builtin-model-prompts: 模型匹配', () => {`; `describe('presets', () => {`; `import { expertRoutes } from '../server/routes/expert.js';`; `describe('listSystemPromptPresets', () => {`; `describe('GET /api/expert/system-prompt-presets', () => {`.
- Upstream commit message excerpt: Every built-in model preset gains a "# Working with teammates" section: never wait passively for a teammate's report (teammates sometimes finish without sending a message), ask quiet teammates directly for their result, and ping once before declaring a delegated task blocked. deepseek-v4-flash gets a terser two-bullet variant matching its style. Also adds a GLM-5.3 preset forked from GLM-5.2 (match: glm-5.3), bringing the built-in set to seven; preset-count assertions updated. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0d067a1b7c"></a>
## [0d067a1b7c](./cc-viewer-alignment-commit-ledger.md#commit-0d067a1b7c) — docs(changelog): history.md entries for 1M default, footer simplification, 3s auto-approve, teammate prompt rules

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-25T15:48:25-04:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-73557f1989"></a>
## [73557f1989](./cc-viewer-alignment-commit-ledger.md#commit-73557f1989) — chore(scripts): regenerate tarball baseline for GLM-5.3 preset

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-26T20:02:58+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Add server/system-prompt-templates/presets/GLM-5.3.md to scripts/tarball-baseline.json so verify:tarball contract check passes.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d858204313"></a>
## [d858204313](./cc-viewer-alignment-commit-ledger.md#commit-d858204313) — fix(git): show local commits on branches without an upstream in the changes panel

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-26T11:27:52-04:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：4；上游测试文件：5。
- 上游测试：`apps/web/test/git-api.test.js`, `apps/web/test/new-ui-i18n.test.js`, `packages/app/test/api-git-routes.test.js`, `packages/app/test/branch-lib-git-diff.test.js`, `packages/app/test/git-unpushed.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/gitApi.js` → `src/utils/gitApi.js`; `packages/app/server/lib/git-diff.js` → `lib/git-diff.js`。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `export default function GitChanges({ style, onClose, onFileClick, onOpenFile, re`; `const i18nData = {`; `export async function fetchAllRepos() {`; `describe('fetchAllRepos — 主路径 /api/git-repos 成功', () => {`; `const KEYS = [`; `export function countUntrackedLines(cwd, file) {`; `export async function getUnpushedCommits(cwd, { maxCommits = 100 } = {}) {`; `describe('gitLogUnpushed GET /api/git-log-unpushed', { concurrency: false }, ()`; `describe('git-diff 分支补充覆盖', () => {`; `describe('getUnpushedCommits', () => {`.
- Upstream commit message excerpt: getUnpushedCommits returned an empty list whenever @{upstream} failed to resolve (local-only branches never pushed with -u, deleted remote branches, repos without any remote, detached HEAD), and the frontend gated the whole "Local unpushed commits" section on hasUpstream — making those commits completely invisible. Fall back to `git log HEAD --not --remotes` (order is load-bearing: --not flips every revision listed after it) sharing one log/parse/truncation path with the upstream range; render the section whenever commits exist and explain the no-upstream case in the header tooltip (new i18n key x18 locales). Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-20e6573b7c"></a>
## [20e6573b7c](./cc-viewer-alignment-commit-ledger.md#commit-20e6573b7c) — feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-27T01:39:07-04:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：2；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/package.json` → `package.json`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `const UPLOAD_DEFER_TIMEOUT_MS = 10000;`; `const MOBILE_LOAD_MORE_STEP = 100;`.
- Upstream commit message excerpt: Release 1.8.2: desktop keeps the latest 800 items (was 400), Android 400 (was 240), iOS 300 (was 150); "load earlier" expands 300 items per click (was 100) on all platforms. Also consumes pending changesets: teammate no-wait presets + GLM-5.3, 1M default context, 3s auto-approve default, footer simplification, no-upstream git commits fix, ultraplan preset rework. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-8fb468ddc8"></a>
## [8fb468ddc8](./cc-viewer-alignment-commit-ledger.md#commit-8fb468ddc8) — fix(system-prompt): add background-agent waiting discipline to Kimi presets

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-31T00:35:15+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `IMPORTANT: Never generate or guess URLs unless you are confident they help the u`.
- Upstream commit message excerpt: Kimi K3 / Kimi K2.7 Code presets gain a "Waiting on background agents" section: verify teammate status via subagents/agent-*.jsonl (or SendMessage) before waiting, read results back with tail + jq instead of a full Read, and cap idle waiting (change strategy after 2 empty rounds, escalate after ~10 minutes).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2f83632f32"></a>
## [2f83632f32](./cc-viewer-alignment-commit-ledger.md#commit-2f83632f32) — release: cc-viewer 1.8.3 (changeset version)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-31T00:47:54+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5352005402"></a>
## [5352005402](./cc-viewer-alignment-commit-ledger.md#commit-5352005402) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-08-31T09:42:51+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-fa77ecd681"></a>
## [fa77ecd681](./cc-viewer-alignment-commit-ledger.md#commit-fa77ecd681) — fix(v2): exclude proxy retry-stat shards from legacy v1 log sniffing

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-01T10:34:33+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`packages/app/test/v2-convert.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `const STOP_CHECK_EVERY = 50; // entries between shouldStop() polls`; `export function listV1Files(projectDir) {`; `describe('listV1Files ordering and filtering', () => {`.
- Upstream commit message excerpt: proxy_YYYY-MM-DD.jsonl files are proxy retry statistics (proxy-stats.js), not v1 conversation logs, but listV1Files matched them by .jsonl suffix, triggering a spurious migration prompt for every proxy user. release: cc-viewer 1.8.4 (changeset version)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1c5fadafbf"></a>
## [1c5fadafbf](./cc-viewer-alignment-commit-ledger.md#commit-1c5fadafbf) — feat(chat): Claude Code task checklist HUD docked above the chat composer

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-01T12:21:31-04:00；父提交 1；相对第一父文件数 22。
- 上游生产/配置文件：12；上游测试文件：8。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/taskStore.test.js`, `packages/app/test/api-events-gap.test.js`, `packages/app/test/ensure-hooks-tasks.test.js`, `packages/app/test/session-start-bridge.test.js`, `packages/app/test/task-bridge.test.js`, `packages/app/test/task-event-route.test.js`, `packages/app/test/task-state.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/ensure-hooks.js` → `lib/ensure-hooks.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 22 distinct hunk context(s) extracted (up to 30): `import { publish as publishWorkflowUpdate } from './utils/workflowStore';`; `class AppBase extends React.Component {`; `import WorkflowLiveHud from '../viewers/WorkflowLiveHud';`; `class ChatView extends React.Component {`; `const i18nData = {`; `const KEYS = [`; `function _looksStaleManagedCommand(cmd) {`; `function _purgeStaleManagedHooks(settings) {`; `export function removeAllManagedHooks(settings) {`; `export function ensureHooks() {`; `let cwd = null;`; `try {`; `const internalToken = process.env.CCVIEWER_INTERNAL_TOKEN || '';`; `function sessionStartNotify(req, res, parsedUrl, isLocal, deps) {`; `async function events(req, res, parsedUrl, isLocal, deps) {`; `export const eventsRoutes = [`; `import { sendEventToClients } from './lib/log-watcher.js';`; `const deps = {`; `function _scheduleTurnEndBroadcast(sessionId, ts, transcriptPath = null) {`; `async function _doStop() {`; `describe('GET /events', () => {`; `describe('session-start-bridge.js', { concurrency: false }, () => {`.
- Upstream commit message excerpt: Surface the TUI task checklist (TaskCreate/TaskUpdate state) in the GUI as a compact strip above the chat input box (✓ done/total + current task), expandable to the full list in creation order, auto-hidden when empty or all completed. Data channel is CC hooks (TaskCreated/TaskCompleted + PostToolUse TaskUpdate) via the new task-bridge → POST /api/task-event → task-state reducer → debounced full-snapshot SSE task_update (per-connection replay) → taskStore → TaskProgressHud. Session-boundary resets gated by the pure shouldResetTasks (agent_id forwarded by session-start-bridge; resume/fork to a different session resets). Coverage: task-state / task-bridge / ensure-hooks-tasks / task-event-route / api-events-gap snapshot frame / taskStore / session-start-bridge agent_id tests. Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-52adf8968a"></a>
## [52adf8968a](./cc-viewer-alignment-commit-ledger.md#commit-52adf8968a) — chore(release): 1.8.5

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-01T12:22:46-04:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Co-Authored-By: Claude <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a70440ee62"></a>
## [a70440ee62](./cc-viewer-alignment-commit-ledger.md#commit-a70440ee62) — feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on)

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-02T11:32:38-04:00；父提交 1；相对第一父文件数 18。
- 上游生产/配置文件：12；上游测试文件：4。
- 上游测试：`apps/web/test/minimal-chat-wiring.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/tool-display-policy.test.js`, `apps/web/test/tool-run-merge.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/settings/PreferencesForm.jsx` → `src/components/settings/PreferencesForm.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `package.json` → `package.json`。
- B0 diff inspection: 11 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `import { mergeThinkingBlocks } from '../../utils/thinkingMerge';`; `class ChatMessage extends React.Component {`; `import { applyAvatarAnimationTargets } from '../../utils/avatarAnimationPostPass`; `class ChatView extends React.Component {`; `class AppHeader extends React.Component {`; `export default function PreferencesForm({ values = {}, onPatch }) {`; `const i18nData = {`; `const KEYS = [`.
- Upstream commit message excerpt: Post-pass over built rows (utils/toolRunMerge.js) folds same-agent tool-only runs; turn-boundary rows close every stream; merged members drop the tools-used prefix; per-call times in pill popovers; system prompts fold to a grey icon. Toggle on desktop drawer, mobile sheet and per-project preferences; default on for fresh installs (stored false respected). minimalChat joins the item-cache toggle signature. Adds test:web script (glob form for Node 24). Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-44320725ab"></a>
## [44320725ab](./cc-viewer-alignment-commit-ledger.md#commit-44320725ab) — chore(release): 1.8.6

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-02T11:34:15-04:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-bd50636219"></a>
## [bd50636219](./cc-viewer-alignment-commit-ledger.md#commit-bd50636219) — perf(search): move node-engine scan to a worker thread, virtualize result list

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-04T12:59:26+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：6；上游测试文件：1。
- 上游测试：`packages/app/test/search-worker.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/search/SearchPanel.jsx` → `src/components/search/SearchPanel.jsx`; `apps/web/src/components/search/SearchPanel.module.css` → `src/components/search/SearchPanel.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/code-search.js` → `lib/code-search.js`。
- B0 diff inspection: 12 distinct hunk context(s) extracted (up to 30): `import { Modal } from 'antd';`; `function renderLineReplace(text, submatches, reInfo, regex, replaceText, styles)`; `export default function SearchPanel({ style, onClose, onOpenResult, getDirtyPath`; `const i18nData = {`; `import { spawn } from 'node:child_process';`; `import { StringDecoder } from 'node:string_decoder';`; `export function buildQueryRegExp({ query, regex, wholeWord, caseSensitive }) {`; `export function globToRegExp(glob) {`; `function rgSearch(opts) {`; `export function isBinary(buf, n = DEFAULTS.binarySniffBytes) {`; `async function nodeSearch(opts) {`; `export async function searchCode(opts) {`.
- Upstream commit message excerpt: - node fallback engine runs in search-worker.js (worker_threads) so large codebases no longer pin the server event loop / Electron tab backend; abort maps to terminate, invalid_regex maps back to the 400 contract; yields are byte-aware (every 4MB) instead of every-64-files - sidebar results render through react-virtuoso (flattened file/match rows) with FileRow/MatchRow subcomponents; collapse + replace flows kept - prev/next match navigation (Enter/Shift+Enter, nav buttons, arrow keys on match rows) with rAF-retried focus; visible engine badge; slow-search hint after 1s when ripgrep is absent (ui.search.navPrev/navNext/ nodeSlowHint x18 locales) - Enter only navigates when results reflect the current query (debounce settled); a fresh term still searches first - history.md: bind the 29 previously-unreleased entries to their released versions (1.7.23-1.8.6) using git tag boundaries; add the missing 1.7.23 CVE and 1.8.4 entries - chat: appended-system-prompt label is no longer text-select…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-cdabb27454"></a>
## [cdabb27454](./cc-viewer-alignment-commit-ledger.md#commit-cdabb27454) — fix(footer): hide geo badge for non-Anthropic-official subscriptions

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-04T14:14:12+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`.
- Upstream commit message excerpt: CountryFlag now mounts only when the endpoint is official (proxyOfficialDefault via isOfficialDefaultEndpoint) AND plan-usage headers have actually been seen (planUsage non-null). Third-party proxy or self-hosted profile users no longer see the flag, and the ipinfo.io/ipwho.is/ipapi.co lookups are never fired for them.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d5e66ec1d8"></a>
## [d5e66ec1d8](./cc-viewer-alignment-commit-ledger.md#commit-d5e66ec1d8) — feat(cli): inject enhanced context into headless (-p)/one-shot run sessions without starting GUI

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-04T17:28:59+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：4；上游测试文件：1。
- 上游测试：`packages/app/test/cli-modes.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/cli.js` → `cli.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `import { mergeSettingsIntoArgs } from './server/lib/settings-merge.js';`; `async function runProxyCommand(args) {`; `export function withDefaultThinkingDisplay(args) {`; `import { MODEL_PROMPT_DIR } from './lib/model-system-prompts.js';`; `async function _spawnClaudeImpl(proxyPort, cwd, extraArgs = [], claudePath = nul`; `import {`; `function chmodTree(dir) {`; `function runCli(args = [], opts = {}) {`; `describeCli('cli-modes: ccv run -- claude 用户 --settings 合并', { concurren`.
- Upstream commit message excerpt: - runProxyCommand now runs the full system-prompt pipeline (resolveLaunchSystemPrompt), so CC_SYSTEM.md / CC_APPEND_SYSTEM.md / model-specific system_prompt/ entries are injected exactly as in the PTY path; add CCV_CLI_MODE=1 so a one-shot run no longer prints the "CC Viewer started" GUI banner. - Extract shared pure helper insertBeforeDashDash into launch-config.js: injections land before a literal `--` (prompt text) and --thinking-display is relocated out of the prompt region; pty-manager.js adopts it too, fixing the same `--` misplacement on the GUI path. - Add 9 headless-injection test cases (sentinel / manual-flag / env / model match / ordering / fresh / pin-resume / banner-negation / isClaudeCmd gate). - Register search-worker.js / task-bridge.js / task-state.js in the tarball baseline (verify:tarball contract).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ef28ec388d"></a>
## [ef28ec388d](./cc-viewer-alignment-commit-ledger.md#commit-ef28ec388d) — chore(release): 1.8.7

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-04T18:45:02+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ba3eee8fd5"></a>
## [ba3eee8fd5](./cc-viewer-alignment-commit-ledger.md#commit-ba3eee8fd5) — feat(files): add "Download to local" context-menu item for remote sessions, streamed via GET /api/download-file

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-05T21:48:13+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：3；上游测试文件：1。
- 上游测试：`packages/app/test/api-files-content.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `import { getFileIcon } from '../../utils/fileIcons';`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `const i18nData = {`; `import { ERROR_STATUS_MAP } from '../lib/file-api.js';`; `function fileRaw(req, res, parsedUrl) {`; `export const filesContentRoutes = [`; `import { EventEmitter } from 'node:events';`; `let routes;`; `before(async () => {`; `describe('GET|HEAD /api/file-raw', { concurrency: false }, () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-57798b7ccc"></a>
## [57798b7ccc](./cc-viewer-alignment-commit-ledger.md#commit-57798b7ccc) — fix(logs): project switch lag, single-page pager, and pager spacing in log-management modal

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-06T02:11:02+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/web/test/logs-modal.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.module.css` → `src/App.module.css`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`.
- Upstream commit message excerpt: - Move the page-1 refetch into the setState callback in both handleLogsProjectChange and handleImportLocalLogs so _localLogsUrl reads the new logViewProject (was requesting the previous project, leaving the list one round behind). - Gate the pager on total > LOG_PAGE_SIZE instead of antd's hideOnSinglePage, which flickered while totals were stale mid-switch; a single page of sessions now renders no pagination bar at all. - Give antd pagination items a 4px gap, scoped to .logListContainer, with doubled-class specificity to beat the mini-pager margin reset. Coverage: apps/web/test/logs-modal.test.js (source contracts).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2cb0806a32"></a>
## [2cb0806a32](./cc-viewer-alignment-commit-ledger.md#commit-2cb0806a32) — chore(release): 1.8.8

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-06T02:27:48+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9b1a2c913a"></a>
## [9b1a2c913a](./cc-viewer-alignment-commit-ledger.md#commit-9b1a2c913a) — docs(claude): document release tag ordering — changeset version bump must land before tagging

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-06T02:31:47+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `Do not increment the version number arbitrarily; versions are bumped by 'pnpm ch`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-aa58422956"></a>
## [aa58422956](./cc-viewer-alignment-commit-ledger.md#commit-aa58422956) — feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T01:57:34+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：5；上游测试文件：2。
- 上游测试：`apps/web/test/promptNav.test.js`, `packages/app/test/branch-routes-files-fs.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/promptNav.js` → `src/utils/promptNav.js`。
- B0 diff inspection: 12 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `const i18nData = {`; `import { getSlashCommandLabel } from './slashCommandLabels.js';`; `export function buildPromptNavItems(visible, mainAgentSessions) {`; `const item = (role, text, timestamp) => ({ props: { role, text, timestamp } });`; `describe('buildPromptNavItems', () => {`; `import {`; `const STUB_NAMES = ['open', 'explorer.exe', 'cmd.exe', 'gnome-terminal', 'konsol`; `const explorerCapture = join(tmpDir, 'explorer-args.txt');`; `async function waitForFile(p, timeoutMs = 3000) {`; `before(async () => {`; `describe('files-fs 分支补强', { concurrency: false }, () => {`.
- Upstream commit message excerpt: - promptNav: scan assistant bubbles for ExitPlanMode/AskUserQuestion tool_use blocks and tag UltraPlan user prompts (via props.isUltraplan), interleaved chronologically with plain prompts, each with a colored badge (Plan=blue outline, Ask=green, UltraPlan=solid blue); clicking scrolls+highlights the containing bubble - perf: cache the nav build on a content fingerprint (allItems/mainAgentSessions refs + role-filter + visibleCount) instead of the per-render visible slice - fix(chat): task-list HUD chevron hover uses neutral grey, not primary blue - fix(tests): win32 reveal-file capture stub appends and reads only the newly appended line, eliminating the intermittent wrong-path flake New i18n keys ui.navBadgePlan/ui.navBadgeAsk (x18 locales; UltraPlan reuses ui.ultraplan). Coverage: promptNav.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b7678de6f6"></a>
## [b7678de6f6](./cc-viewer-alignment-commit-ledger.md#commit-b7678de6f6) — chore(release): 1.8.9

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T01:57:45+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-85b9aabce4"></a>
## [85b9aabce4](./cc-viewer-alignment-commit-ledger.md#commit-85b9aabce4) — fix(ci): widen bump-homebrew npm-registry wait window to 10min

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T02:07:00+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.
- Upstream commit message excerpt: v1.8.8's bump-homebrew job timed out after 10x30s even though the npm publish had succeeded — with Sigstore provenance logging, the registry's /{pkg}/{version} CDN endpoint can take longer than 5min to propagate. Bump the retry loop to 20x30s (10min) so the formula bump survives slow propagation.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-caaab3d12f"></a>
## [caaab3d12f](./cc-viewer-alignment-commit-ledger.md#commit-caaab3d12f) — fix(chat): User Prompt Nav language switch + session-divider attribution (#142)

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T11:16:48+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/web/test/promptNav.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/utils/promptNav.js` → `src/utils/promptNav.js`。
- B0 diff inspection: 6 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `function truncateDisplay(text) {`; `function sessionIdxOf(props, tsToSession) {`; `export function buildPromptNavItems(visible, mainAgentSessions) {`; `const item = (role, text, timestamp) => ({ props: { role, text, timestamp } });`; `describe('buildPromptNavItems', () => {`.
- Upstream commit message excerpt: - language switch now refreshes nav badges/title: include props.lang in the nav-build cache key (_navCacheKey), since the cached popover content holds already-translated strings - a Plan/Ask card at the end of a session is attributed to its own session and shows its real time: session attribution and the time label use the assistant bubble's displayTs (producer request ts), not the carrier timestamp that is already the next session's first entry ts - harden the tool-name lookup with Object.hasOwn so a tool_use block named constructor/toString cannot produce a phantom nav entry Coverage: promptNav.test.js (producer-session attribution across a boundary, carrier fallback, prototype-member guard)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-39acd8150f"></a>
## [39acd8150f](./cc-viewer-alignment-commit-ledger.md#commit-39acd8150f) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T08:16:12+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-36df32b7e1"></a>
## [36df32b7e1](./cc-viewer-alignment-commit-ledger.md#commit-36df32b7e1) — fix(server): allow authenticated remote admins to use management endpoints

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T16:51:57+08:00；父提交 1；相对第一父文件数 20。
- 上游生产/配置文件：12；上游测试文件：5。
- 上游测试：`packages/app/test/api-dingtalk-gap.test.js`, `packages/app/test/auth-lib.test.js`, `packages/app/test/branch-routes-im.test.js`, `packages/app/test/is-admin.test.js`, `packages/app/test/task-event-route.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/routes/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `By default, remote (LAN) access requires the '?token=' query that ccv prints at`; `class Mobile extends AppBase {`; `class AppHeader extends React.Component {`; `export function parseCookies(header) {`; `export function decideAuth(ctx) {`; `import { generatePassword } from '../lib/auth.js';`; `function readBody(req, deps, cb) {`; `function buildState(deps, isLocal) {`; `function authState(req, res, parsedUrl, isLocal, deps) {`; `function authConfigPost(req, res, parsedUrl, isLocal, deps) {`; `import { loadDingTalkState, saveDingTalkConfig, loadDingTalkConfig } from '../li`; `async function dingtalkStatus(req, res, parsedUrl, isLocal, deps) {`; `function dingtalkConfigPost(req, res, parsedUrl, isLocal, deps) {`; `function dingtalkTestPost(req, res, parsedUrl, isLocal, deps) {`; `import { listSkills, moveSkill, deleteSkill } from '../lib/skills-api.js';`; `async function imStatus(req, res, parsedUrl, isLocal, deps) {`; `function imConfigPost(req, res, parsedUrl, isLocal, deps) {`; `function imTestPost(req, res, parsedUrl, isLocal, deps) {`; `function imProcessPost(req, res, parsedUrl, isLocal, deps) {`; `function imLogs(req, res, parsedUrl, isLocal, deps) {`; `function imSenders(req, res, parsedUrl, isLocal, deps) {`; `function imAppendSystemGet(req, res, parsedUrl, isLocal, deps) {`; `function imAppendSystemPost(req, res, parsedUrl, isLocal, deps) {`; `function imSkills(req, res, parsedUrl, isLocal, deps) {`; `function imSkillsToggle(req, res, parsedUrl, isLocal, deps) {`; `function imSkillsDelete(req, res, parsedUrl, isLocal, deps) {`; `function imSkillsImport(req, res, parsedUrl, isLocal, deps) {`; `import { mutatePrefs, applyPrefsPatch, readPrefsRaw } from '../lib/prefs-store.j`; `function preferencesGet(req, res, parsedUrl, isLocal, deps) {`; `function preferencesPost(req, res, parsedUrl, isLocal, deps) {`.
- Upstream commit message excerpt: Container/cloud deployment: management routes were hard-gated on isLocal (loopback socket peer), so a remote admin's browser got "保存失败: Loopback only" when saving IM/DingTalk config, and "启动失败: worker 未在限定时间内就绪" because the status poll never received the process field. decideAuth now returns an isAdmin flag (loopback / valid ?token= / valid password-login cookie), computed from the same credential-bearing branches so it can't drift from the gate; empty-password mode is deliberately NOT admin (read access only, destructive actions stay credential/loopback-gated). server.js attaches it as req.ccvIsAdmin; management routes (im, dingtalk, auth, project-prefs, preferences, skills, voice-pack) accept it via isAdminReq. IM/DingTalk status returns process/pid/connection (incl. lastError for the error chip) to a remote admin; plaintext secrets stay loopback-only. /api/preferences emits _isAdmin so the admin-only settings UI (project-prefs manage entry, Claude executable selector) shows for a re…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-513577d01c"></a>
## [513577d01c](./cc-viewer-alignment-commit-ledger.md#commit-513577d01c) — chore(release): 1.8.10

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T16:53:10+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-4385631527"></a>
## [4385631527](./cc-viewer-alignment-commit-ledger.md#commit-4385631527) — chore(release): add server/lib/is-admin.js to tarball baseline

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T17:16:10+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-71cee60794"></a>
## [71cee60794](./cc-viewer-alignment-commit-ledger.md#commit-71cee60794) — fix(ci): close the release-pipeline gaps that made releases fail repeatedly

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-07T17:48:09+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：2；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `jobs:`; `Before publishing to npm, check if any new top-level files in 'packages/app/' (e`.
- Upstream commit message excerpt: Three structural fixes, each verified against the failure evidence: 1. release.yml — bump-homebrew now `needs: npm-publish` (was `needs: publish`). It raced the npm registry write and timed out its poll every release (v1.8.8/1.8.9/1.8.10) because it only waited on the GitHub Release job. Now it runs only after the package is actually on the registry. 2. Local gate — new scripts/verify-tarball-drift.mjs (cheap, no npm pack) diffs the publishable source-file set (server/, concepts/, ultraAgents/, plugins/, @ccv/core/src) against scripts/tarball-baseline.json and is wired into every pretest* hook. Previously only the slow verify:tarball caught tarball drift, and only in CI/release — so a new server/lib/*.js slipped through locally and failed the v1.8.10 publish. 3. CLAUDE.md — document the baseline-regen rule and warn against pushing a feature together with its changeset in one commit (skips the per-commit CI run, so tarball/boundary regressions only surface at release time).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6880f77320"></a>
## [6880f77320](./cc-viewer-alignment-commit-ledger.md#commit-6880f77320) — feat(chat): clickable local file paths in markdown links and code spans

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-09T04:26:05+08:00；父提交 1；相对第一父文件数 30。
- 上游生产/配置文件：18；上游测试文件：12。
- 上游测试：`apps/web/test/markdown-code-path-classify.test.js`, `apps/web/test/markdown-href-classify.test.js`, `apps/web/test/markdown-render.test.js`, `apps/web/test/md-file-exists.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/skill-import-errors.test.js`, `packages/app/test/api-files-exists.test.js`, `packages/app/test/api-im.test.js`, `packages/app/test/api-skills-gap.test.js`, `packages/app/test/branch-routes-skills.test.js`, `packages/app/test/route-dispatch.test.js`, `packages/app/test/skills-import.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/electron/electron/main.js` → `electron/main.js`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.jsx` → `src/components/dashboard/CachePopoverContent.jsx`; `apps/web/src/components/dashboard/TeamSessionPanel.jsx` → `src/components/dashboard/TeamSessionPanel.jsx`; `apps/web/src/components/settings/ImConversationModal.jsx` → `src/components/settings/ImConversationModal.jsx`; `apps/web/src/components/settings/ImPlatformSettings.jsx` → `src/components/settings/ImPlatformSettings.jsx`; `apps/web/src/global.css` → `src/global.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/markdown.js` → `src/utils/markdown.js`; `packages/app/server/lib/skills-api.js` → `lib/skills-api.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `function createTab(projectPath, extraArgs = []) {`; `function ensureWorkspaceView() {`; `function broadcastMenuModel() {`; `if (!gotLock) {`; `import { tryOpenWithSystem } from '../../utils/fileOpen';`; `class ChatView extends React.Component {`; `import OpenFolderIcon from '../common/OpenFolderIcon';`; `const CALIBRATION_MODELS = appConfig.calibrationModels;`; `export default function CachePopoverContent({`; `function TeamModal({ session, requests, mainAgentSessions, collapseToolResults,`; `export default function ImConversationModal({ open, onClose, platform, onOpenCon`; `import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'`; `import { imBadgeModel } from '../../utils/imConnState';`; `import styles from './ImPlatformSettings.module.css';`; `export default function ImPlatformSettings({ descriptor }) {`; `html, body, #root {`; `const i18nData = {`; `import { measureParse } from './markdownProfiler';`; `setupMermaidAutoRender();`; `export function renderMarkdown(text) {`; `import assert from 'node:assert/strict';`; `function escapeHtml(s) {`; `describe('marked output — basic elements', () => {`; `const KEYS = [`; `export function validateSkillName(name) {`; `function parseSkillMdFrontmatter(skillDir) {`; `import { execFile, spawn } from 'node:child_process';`; `function resolvePath(req, res, parsedUrl, isLocal, deps) {`; `export const filesFsRoutes = [`; `import { getClaudeConfigDir } from '../../findcc.js';`.
- Upstream commit message excerpt: - markdown links: external links open in a new tab (Electron: system browser via setWindowOpenHandler; same-origin windows stay in-app); local file links are tagged data-md-file and open in the embedded file viewer; read-only surfaces swallow local file links instead of navigating away - code spans: backtick-wrapped text that looks like a local path is tagged with an inert data-md-path-candidate marker at render time (render pipeline stays pure/cache-safe); ChatView probes the new POST /api/files-exists endpoint (isReadAllowed policy, uniform exists:false, no reason leakage) and upgrades only existing files to clickable (data-md-file-verified): dotted underline at rest, border+color feedback on hover, click/Enter opens the embedded viewer; :N / :N-M line suffix targets the line via scrollToLine (desktop); negative verdicts carry a 30s TTL - skills: all three skill-add entries share one strict SKILL.md frontmatter check (name + description required; new error codes), CRLF tolerated, sha…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-55544f6e40"></a>
## [55544f6e40](./cc-viewer-alignment-commit-ledger.md#commit-55544f6e40) — chore(release): 1.8.11

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-09T04:26:14+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-865604d68e"></a>
## [865604d68e](./cc-viewer-alignment-commit-ledger.md#commit-865604d68e) — feat(files): remote web file browser modal with shared context menu + image thumbnails

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-09T20:20:19+08:00；父提交 1；相对第一父文件数 16。
- 上游生产/配置文件：11；上游测试文件：3。
- 上游测试：`apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-context-menu.test.js`, `packages/app/test/api-files-content.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/common/OpenFolderIcon.jsx` → `src/components/common/OpenFolderIcon.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/fileIcons.jsx` → `src/utils/fileIcons.jsx`。
- B0 diff inspection: 12 distinct hunk context(s) extracted (up to 30): `import styles from './OpenFolderIcon.module.css';`; `export default function OpenFolderIcon({ apiEndpoint, title, size = 16 }) {`; `import React, { useState, useCallback, useRef, useEffect, useMemo, useContext }`; `import OpenFolderIcon from '../common/OpenFolderIcon';`; `import RefreshIcon from '../common/RefreshIcon';`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `export default function FileExplorer({ style, onClose, onFileClick, expandedPath`; `const i18nData = {`; `const EXT_COLORS = {`; `export function getFileIcon(name, type) {`; `const FILE_RAW_MIME = {`; `describe('GET|HEAD /api/file-raw', { concurrency: false }, () => {`.
- Upstream commit message excerpt: - Remote/container sessions (preferences._isLocal === false): the file-explorer header folder icon opens an in-app OS-style file browser modal (tree + icon grid, breadcrumb/up/refresh, project-root clamped) instead of a silent no-op OS file manager launch; local behavior unchanged. - Right-click context menu extracted to shared modules (fileContextMenu.js definition + fileContextMenuActions.jsx handler factory) consumed by the sidebar tree, sidebar header, sidebar blank area, and the modal (rows, grid cells, grid blank area) — one definition keeps all surfaces in sync. - Grid image cells render lazy <img> thumbnails via /api/file-raw with icon fallback; FILE_RAW_MIME gains image/bmp + image/avif. - Modal mutations (create/rename/delete) refresh both the modal and the sidebar; clipboard copies fall back to execCommand on non-secure LAN origins. Coverage: file-browser-modal.test.js, file-context-menu.test.js, api-files-content.test.js.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2a0d1b30d3"></a>
## [2a0d1b30d3](./cc-viewer-alignment-commit-ledger.md#commit-2a0d1b30d3) — chore(release): 1.8.12

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-09T20:22:04+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-365af800e5"></a>
## [365af800e5](./cc-viewer-alignment-commit-ledger.md#commit-365af800e5) — feat(files): file browser modal upload + in-project drag-move + zone drag feedback

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-10T05:52:58+08:00；父提交 1；相对第一父文件数 22。
- 上游生产/配置文件：15；上游测试文件：6。
- 上游测试：`apps/web/test/_shims/antd-stub.mjs`, `apps/web/test/drag-drop-zones.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-move.test.js`, `apps/web/test/files-import.test.js`, `packages/app/test/api-files-fs.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/App.module.css` → `src/App.module.css`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 20 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `import { isMobile, isPad, hasNativeZoom } from './env';`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `import { createFileMenuHandler } from './fileContextMenuActions';`; `function handleActivationKey(handler) {`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `function isThumbnailFile(name) {`; `function GridCell({ item, childPath, isSelected, isGitIgnored, isRemote, onSelec`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `import React, { useState, useCallback, useRef, useEffect, useMemo, useContext }`; `import styles from './FileExplorer.module.css';`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `export default function FileExplorer({ style, onClose, onFileClick, expandedPath`; `const i18nData = {`; `export async function resolve(specifier, context, nextResolve) {`; `const I18N_KEYS = [`; `describe('fileIcons size param', () => {`; `function moveFile(req, res, parsedUrl, isLocal, deps) {`; `describe('/api/move-file', () => {`.
- Upstream commit message excerpt: - Modal upload: toolbar button (into currentPath) + zoned drag-drop (tree folder nodes / grid folder cells / grid blank), sharing the extracted importFiles pipeline with the sidebar FileExplorer. - In-project drag-move: grid rows/cells draggable; drop onto folder cells, tree folders (500ms hover auto-expand), breadcrumbs, or blank areas to move (guards: self/descendant/same-dir). Shared fileMove.js + useFileDropTarget / useInternalMoveTarget hooks; sidebar switched over. - Global drag rework: zone-scoped masks (chat+terminal as one data-drop-zone="chat" zone, sidebar self-highlight), non-responsive regions reject drops on desktop; global handling suppressed while antd modals/drawers are open (isOverModalPortal); Mobile keeps the legacy full-screen overlay. - fix(server): /api/move-file accepts toDir:'' (move to project root) — previously rejected as 400, so the sidebar's documented blank-area move-to-root never worked. - fix(web): modal follows the sidebar refreshTrigger so cross-surfa…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3a737c97ed"></a>
## [3a737c97ed](./cc-viewer-alignment-commit-ledger.md#commit-3a737c97ed) — chore(release): 1.8.13

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-10T05:53:47+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-48d6e0f3c3"></a>
## [48d6e0f3c3](./cc-viewer-alignment-commit-ledger.md#commit-48d6e0f3c3) — fix(tests): await stopViewer in server.test.js to fix EPIPE flake

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-10T06:12:47+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`packages/app/test/server.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `describeCli('server API endpoints', { concurrency: false }, () => {`.
- Upstream commit message excerpt: The after hook fired stopViewer() without awaiting its returned _doStop() promise, then rmSync'd the tmp dir after a fixed 200ms wait. On CI under load the async teardown (SSE client.end() + closeAllConnections) hadn't finished, so a lingering SSE res was written after teardown → 'write EPIPE' uncaught in the before hook's async activity. Await the stop promise instead.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-bf2d6f2ad8"></a>
## [bf2d6f2ad8](./cc-viewer-alignment-commit-ledger.md#commit-bf2d6f2ad8) — feat(chat): task-list HUD progress dots + reset task list on new prompt

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-12T22:14:38+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：6；上游测试文件：5。
- 上游测试：`apps/web/test/task-progress-hud.test.js`, `packages/app/test/ensure-hooks-tasks.test.js`, `packages/app/test/server.test.js`, `packages/app/test/task-bridge.test.js`, `packages/app/test/task-state.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/lib/ensure-hooks.js` → `lib/ensure-hooks.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 14 distinct hunk context(s) extracted (up to 30): `export default function TaskProgressHud() {`; `function TaskRow({ task }) {`; `const HOOK_TIMEOUT_FIELD = HOOK_TIMEOUT_S > 0 ? { timeout: HOOK_TIMEOUT_S } : {}`; `function _looksStaleManagedCommand(cmd) {`; `export function ensureHooks() {`; `const body = JSON.stringify({`; `export function applyTaskEvent(payload) {`; `export function shouldResetTasks(payload, currentSessionId) {`; `const deps = {`; `describe('lib/ensure-hooks.js — task checklist sections', () => {`; `describeCli('server API endpoints', { concurrency: false }, () => {`; `describe('task-bridge.js', { concurrency: false }, () => {`; `import assert from 'node:assert/strict';`; `describe('lib/task-state.js', () => {`.
- Upstream commit message excerpt: Add per-task progress dots to the collapsed HUD strip (grey checked disc = done, pulsing primary disc = running, hollow ring = pending), sharing one TaskStatusDot component with the expanded rows. Reset the task list on each new user prompt via a UserPromptSubmit managed hook with a session-equality gate (teammate prompts cannot wipe the shared list); tasks the model keeps using are rebuilt through TaskUpdate stubs.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5aa5728b95"></a>
## [5aa5728b95](./cc-viewer-alignment-commit-ledger.md#commit-5aa5728b95) — feat(files): unify open-project icon to open in-app web file browser

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-12T22:14:49+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：2；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `export default function FileExplorer({ style, onClose, onFileClick, expandedPath`; `const i18nData = {`.
- Upstream commit message excerpt: The header folder icon now opens the FileBrowserModal for both local and remote access instead of shelling out to the OS file manager on local access; tooltip updated to "Browse project files" (18 locales).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a278d68954"></a>
## [a278d68954](./cc-viewer-alignment-commit-ledger.md#commit-a278d68954) — feat(files): per-file-type SVG icons in the file browser

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-12T22:14:49+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：4；上游测试文件：2。
- 上游测试：`apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-types.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/mobile/MobileFileExplorer.jsx` → `src/components/mobile/MobileFileExplorer.jsx`; `apps/web/src/components/mobile/MobileGitDiff.jsx` → `src/components/mobile/MobileGitDiff.jsx`; `apps/web/src/utils/fileIcons.jsx` → `src/utils/fileIcons.jsx`。
- B0 diff inspection: 11 distinct hunk context(s) extracted (up to 30): `import { isImageFile } from '../../utils/commandValidator';`; `import styles from './MobileFileExplorer.module.css';`; `function MobileTreeNode({ item, path, depth, expandedPaths, onToggleExpand, curr`; `const STATUS_LABELS = {`; `function TreeDir({ name, node, depth, selectedFile, selectedRepo, repoPath, onFi`; `import React from 'react';`; `const EXT_COLORS = {`; `export function getFileIcon(name, type, size = 14) {`; `const FILE_ICONS = readFileSync(join(SRC, 'utils', 'fileIcons.jsx'), 'utf-8');`; `describe('FileExplorer remote fallback trigger wiring', () => {`; `describe('fileIcons size param', () => {`.
- Upstream commit message excerpt: Render every file on a shared folded-document base shape (strokeWidth 2, house style) with an embedded type glyph: code/markup/data/document/image/ video/audio/archive/pdf/office/font/binary, replacing the single generic grey document. Classification extracted to a pure fileTypes.js; the two drifted mobile copies now reuse the shared module with the unified folder color.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-637fbb0218"></a>
## [637fbb0218](./cc-viewer-alignment-commit-ledger.md#commit-637fbb0218) — feat(files): theme-adaptive file-type icon colors (dark/light)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-12T22:14:57+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/global.css` → `src/global.css`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Reference a set of --file-icon-* CSS variables instead of hardcoded hex; global.css defines them per theme (same pattern as avatar colors), so Office and other brand hues stay legible in the dark theme and switch instantly without a re-render.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0480a10437"></a>
## [0480a10437](./cc-viewer-alignment-commit-ledger.md#commit-0480a10437) — chore(release): 1.8.14

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-12T22:15:04+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0cfc040c0a"></a>
## [0cfc040c0a](./cc-viewer-alignment-commit-ledger.md#commit-0cfc040c0a) — fix(tests): close SSE subscription gracefully in UserPromptSubmit integration test

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-13T00:11:04+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`packages/app/test/server.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `describeCli('server API endpoints', { concurrency: false }, () => {`.
- Upstream commit message excerpt: The new SSE integration test ended its /events subscription with an abrupt req.destroy() (RST), leaving the server's SSE res writable long enough for the 120ms debounced task_update broadcast to write to a dead socket after teardown → "write EPIPE" uncaughtException (the 1.8.13 flake). Destroy the response instead (FIN) and centralize cleanup in finish().

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d7f355ba89"></a>
## [d7f355ba89](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89) — fix(chat): rebuild conversation immediately on mid-round page refresh

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-13T15:12:05+08:00；父提交 1；相对第一父文件数 14。
- 上游生产/配置文件：6；上游测试文件：6。
- 上游测试：`apps/web/test/branch-utils-sessionMerge.test.js`, `apps/web/test/incremental-merge.test.js`, `packages/app/test/api-events-gap.test.js`, `packages/app/test/interceptor-continuation-sync.test.js`, `test/session-boundary-parity.test.js`, `test/v3-assembler.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`; `packages/app/server/interceptor.js` → `interceptor.js`。
- B0 diff inspection: 24 distinct hunk context(s) extracted (up to 30): `export { messageFingerprint };`; `export function isMergeBlockedEntry(entry, options = {}) {`; `export function mergeMainAgentSessions(prevSessions, entry, options = {}) {`; `export function createV3Assembler() {`; `let messageFingerprint;`; `before(async () => {`; `describe('mergeMainAgentSessions — LCP 扩展（中断分叉 / 排队消息可`; `describe('streaming dedup sequence', () => {`; `client-reconstructed stream). The request list renders adapted rows`; `import { reportSwallowed } from '@ccv/core/error-report';`; `export { _v2Writer };`; `export function getLiveLogSource() {`; `export function sessionHasMainTurn(dir) {`; `export function isDiscardableSession(dir, meta) {`; `export function latestMainSession(projectDir, { excludeDir = '', skipForeignLive`; `async function events(req, res, parsedUrl, isLocal, deps) {`; `async function requests(req, res) {`; `function workspacesLaunch(req, res, parsedUrl, isLocal, deps) {`; `describe('GET /events', () => {`; `describe('env channels re-sync on the next launch', () => {`; `describe('getLiveLogSource falls back past the in-flight current session', () =>`; `describe('session-boundary parity — degraded broken carrier wiring', () => {`; `describe('createV3Assembler unit', () => {`; `describe('cold assembly parity vs legacy entries (oracle)', () => {`.
- Upstream commit message excerpt: Refreshing the browser while a mainAgent SSE request was still streaming left the conversation panel blank (or showing only the previous session) until the round completed. Two roots: - Client: the batch slimmer empties every main carrier except the last, which during an in-flight round is the in-progress placeholder — and the batch merge gate blocked inProgress unconditionally. On the v3 wire the placeholder's messages are already the full accumulated prefix (the request-initiation conv write lands before the response streams), so admit _v3Assembled/_syntheticV2 in-progress carriers with non-empty messages; legacy v1 delta placeholders stay blocked (the batch reconstructor skips inProgress). - Server: getLiveLogSource() served the current session only after a COMPLETED main turn, falling back to the previous conversation (or nothing) during the first in-flight turn. Accept an in-flight first main turn as activated — v3-wire callers only, via serveInFlight, so the legacy escape hatch k…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-96c477d582"></a>
## [96c477d582](./cc-viewer-alignment-commit-ledger.md#commit-96c477d582) — fix(server): guard execWithStdin against EPIPE when child exits early

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-14T02:01:44+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `function execWithStdin(cmd, args, input, options) {`.
- Upstream commit message excerpt: execWithStdin (the git check-ignore wrapper behind /api/files gitignore marking) wrote child.stdin without an error handler. When the child exits before consuming its stdin — non-git cwd, a timeout kill, or a missing binary — the pipe's read end is closed and the write throws 'write EPIPE'. child.on('error') only catches spawn failures, not stdin write errors, so the EPIPE escaped as an uncaughtException. Because execWithStdin is async activity rooted in the server the before hook started, node:test attributed it to 'before' and failed the file. This is the recurring server.test.js 'write EPIPE' flake (1.8.13): the three prior fixes patched SSE paths and never reached the actual stdin pipe. Add a stdin 'error' listener, wrap write/end in try/catch, and settle the promise exactly once so an early-exiting child resolves gracefully instead of throwing.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-60d20e6417"></a>
## [60d20e6417](./cc-viewer-alignment-commit-ledger.md#commit-60d20e6417) — chore(release): add changeset for execWithStdin EPIPE guard

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-14T02:01:54+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ca34587ce5"></a>
## [ca34587ce5](./cc-viewer-alignment-commit-ledger.md#commit-ca34587ce5) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-14T08:53:12+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-085c21516f"></a>
## [085c21516f](./cc-viewer-alignment-commit-ledger.md#commit-085c21516f) — feat(proxy): system 提示词热切换、内置 preset 族系合并与别名扩展

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-15T21:52:16+08:00；父提交 1；相对第一父文件数 51。
- 上游生产/配置文件：14；上游测试文件：8。
- 上游测试：`packages/app/test/builtin-model-prompts.test.js`, `packages/app/test/interceptor-fetch.test.js`, `packages/app/test/launch-config.test.js`, `packages/app/test/proxy-role-proxy-mode.test.js`, `packages/app/test/replace-top-level-system.test.js`, `packages/app/test/system-prompt-builder.test.js`, `packages/app/test/system-prompt-live.test.js`, `packages/app/test/system-prompt-presets.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/interceptor-core.js` → `lib/interceptor-core.js`; `packages/app/server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`; `packages/app/server/lib/v2/identity.js` → `lib/log-v2/identity.js`; `packages/app/server/proxy.js` → `proxy.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `The **Edit System Prompt** modal (hamburger menu → Edit System Prompt) is tabb`; `const i18nData = {`; `ccv -h`; `Modalen **Rediger systemprompt** (hamburgermenu → Rediger systemprompt) er opd`; `Das Modal **System-Prompt bearbeiten** (Hamburger-Menü → System-Prompt bearbe`; `El modal **Editar prompt del sistema** (menú de hamburguesa → Editar prompt d`; `La fenêtre modale **Modifier le prompt système** (menu hamburger → Modifier`; `La finestra modale **Modifica prompt di sistema** (menu hamburger → Modifica p`; `QR コードをスキャンしてモバイル端末からコーディングす`; `QR 코드를 스캔하여 모바일 디바이스에서도 코딩할 수 있습`; `Modalen **Rediger systemprompt** (hamburgermeny → Rediger systemprompt) er del`; `Okno modalne **Edytuj prompt systemowy** (menu hamburger → Edytuj prompt syste`; `O modal **Editar prompt do sistema** (menu de hambúrguer → Editar prompt do s`; `Mobil programlamaya dair hayallerinizi gerçekleştirin. Ayrıca bir eklenti mek`; `import { LOG_DIR } from '../findcc.js';`; `import { sanitizePathComponent } from './lib/v2/layout.js';`; `import { consumePendingForResume, writeSnapshot, projectKeyForCwd } from './lib/`; `export function setupInterceptor() {`; `function currentDate(timeZone, date) {`; `export function createSystemPromptVariables(overrides = {}, opts = {}) {`; `export function replaceTopLevelModel(jsonStr, oldModel, newModel) {`; `import {`; `import { renderSystemPromptFileArgs, renderedPromptDir } from './system-prompt-r`; `import { resolveSpawnModel } from './spawn-model-resolver.js';`; `export function resolveLaunchSystemPrompt(p) {`; `const MODEL_ID_ALIASES = {`; `import { reportSwallowed } from '@ccv/core/error-report';`; `function discardBody(response) {`; `export async function executeRequest({ url, fetchOptions, retryConfig, ctx }) {`; `export function hasArg(args, ...names) {`.
- Upstream commit message excerpt: - system 文本随主模型热切换强行覆盖并按 (sessionId, model) 静态化; 热切换渲染改用启动期变量快照,首请求即生效并修复多处改写缺陷 - 内置 preset 增补通用条款: reads-like-surrounding-code、report-outcomes- faithfully、system-reminder 说明补齐 7 个 preset - Qwen-3.7-Max preset 合并为族系条目 Qwen-3 (match qwen-3), 覆盖整个 Qwen-3.* 家族 - 模型 id 别名表新增 deepseek-flash -> deepseek-v4-flash, 与 k3 同机制 - 18 个语言版本 README 同步, tarball baseline 重新生成

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-17df4e2fbf"></a>
## [17df4e2fbf](./cc-viewer-alignment-commit-ledger.md#commit-17df4e2fbf) — fix(proxy): Bind A 一次性闩只锁成功消费 + review 修复 + 终端集成可观测与裸续接检测(静默)

- B0 snapshot comparison: 11 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-15T21:52:16+08:00；父提交 1；相对第一父文件数 43。
- 上游生产/配置文件：17；上游测试文件：7。
- 上游测试：`packages/app/test/builtin-model-prompts.test.js`, `packages/app/test/launch-config.test.js`, `packages/app/test/proxy-role-proxy-mode.test.js`, `packages/app/test/resume-watchdog.test.js`, `packages/app/test/shell-hook-inspect.test.js`, `packages/app/test/sys-prompt-bind.test.js`, `packages/core/test/context-rules.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/context-rules.js` → `server/lib/context-rules.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `The **Edit System Prompt** modal (hamburger menu → Edit System Prompt) is tabb`; `class AppBase extends React.Component {`; `const i18nData = {`; `ccv -h`; `Modalen **Rediger systemprompt** (hamburgermenu → Rediger systemprompt) er opd`; `Das Modal **System-Prompt bearbeiten** (Hamburger-Menü → System-Prompt bearbe`; `El modal **Editar prompt del sistema** (menú de hamburguesa → Editar prompt d`; `La fenêtre modale **Modifier le prompt système** (menu hamburger → Modifier`; `La finestra modale **Modifica prompt di sistema** (menu hamburger → Modifica p`; `QR コードをスキャンしてモバイル端末からコーディングす`; `QR 코드를 스캔하여 모바일 디바이스에서도 코딩할 수 있습`; `Modalen **Rediger systemprompt** (hamburgermeny → Rediger systemprompt) er del`; `Okno modalne **Edytuj prompt systemowy** (menu hamburger → Edytuj prompt syste`; `O modal **Editar prompt do sistema** (menu de hambúrguer → Editar prompt do s`; `Mobil programlamaya dair hayallerinizi gerçekleştirin. Ayrıca bir eklenti mek`; `import { injectCliJsAt, removeCliJsInjectionAt, INJECT_START as _INJECT_START, I`; `const SHELL_HOOK_END = '# <<< CC-Viewer Auto-Inject <<<';`; `async function runCliMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `import { liveSystemPromptEnabled, getLaunchSystemPromptInfo, getLiveEntry, putLi`; `export function setupInterceptor() {`; `export const BUILTIN_DISABLED_FILE = '.builtin-disabled.json';`; `export function readBuiltinDisabled(modelPromptDir) {`; `export function resolveLaunchSystemPrompt(p) {`; `const MODEL_ID_ALIASES = {`; `function modelIdVariants(id) {`; `export class V2Writer {`; `import { isAnthropicApiPath, classifyProxyRole } from './lib/interceptor-core.js`; `export function startProxy() {`; `import { readClaudeProjectModel } from '../lib/context-watcher.js';`; `function claudeSettingsGet(req, res, parsedUrl, isLocal, deps) {`.
- Upstream commit message excerpt: - Bind A(sys-prompt 快照绑定):首个 main 请求被 live 改写为小模型人格时 匹配失败不再烧掉一次性闩,后续真正带注入人格的请求可重试绑定;此前 会话快照永不落盘,之后所有 -c/-r 走无记录不注入(注入丢失+缓存重写) - proxy 角色分类补 x-claude-code-agent-id 头判据(header-only 子代理 不再被误注主 persona),与 fetch hook 侧对齐 - 启动无注入时兜底收集 variableSnapshot,热切换渲染 preset 不再产生 空 ${memory.dir}/${os.*} - QWEN-3 族系合并改名兼容:旧墓碑 QWEN-3.7-MAX 自动归一 QWEN-3, 用户 opt-out 不静默失效 - deepseek-flash 上下文窗口档位对齐 1M(getModelMaxTokens + classifyContextWindow);别名表查询改原型安全 - launch-config flag 解析复用 argValue;interceptor 用 MODEL_PROMPT_DIR 常量 - L1 shell hook 只读探针(installed/stale/corrupt)经 /api/claude-settings 暴露,缺失/损坏仅浏览器控制台记日志(不弹窗、不改用户 rc) - L2 resume watchdog:三重门检测裸 claude -c 续接(注入丢失/缓存重写), 仅控制台记录;README 补从终端继续会话的正确姿势(19 语言开关说明同步)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5939b38f93"></a>
## [5939b38f93](./cc-viewer-alignment-commit-ledger.md#commit-5939b38f93) — chore(release): add changesets for bind-latch fixes and terminal-integration observability

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-15T21:52:16+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `feat(proxy): system 热切换渲染改用启动期变量快照，热切换首请`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9c1d079f86"></a>
## [9c1d079f86](./cc-viewer-alignment-commit-ledger.md#commit-9c1d079f86) — chore(release): 1.8.15

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-15T22:07:58+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-89a0a25364"></a>
## [89a0a25364](./cc-viewer-alignment-commit-ledger.md#commit-89a0a25364) — docs(claude): rewrite CLAUDE.md as prohibitions-only, add patch-only versioning rule

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-15T23:45:23+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `Using '!important' in CSS is prohibited.`.
- Upstream commit message excerpt: - Cut repo-structure descriptions, toolchain details, how-to walkthroughs, and tool-enforced rules (tarball baseline / boundary gate / deps-vs-devDeps) - Add the hard rule: changesets always declare patch, minor bumps forbidden, verify third-component increment before committing

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b604b1e4f1"></a>
## [b604b1e4f1](./cc-viewer-alignment-commit-ledger.md#commit-b604b1e4f1) — feat(system-prompt): add async no-poll rule to kimi-k3 preset; drop defensive-engineering line from all prompt templates

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-16T08:23:33+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: 7 distinct hunk context(s) extracted (up to 30): `You are ${model.name}, an interactive agent that helps users with software engin`; `You are ${model.name}, an interactive coding agent that helps users carry softwa`; `You are ${model.name}, a fast interactive coding agent. Act quickly and precisel`; `You are ${model.name}, an interactive coding agent that helps users complete sof`; `You are ${model.name}, an interactive coding agent that helps users with softwar`; `IMPORTANT: Never generate or guess URLs unless you are confident they help the u`; `You are an interactive agent that helps users with software engineering tasks. U`.
- Upstream commit message excerpt: chore(release): 1.8.16

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2e17699fd7"></a>
## [2e17699fd7](./cc-viewer-alignment-commit-ledger.md#commit-2e17699fd7) — feat(git): show +n/-n line stats on unpushed-commit rows, restore real file statuses

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-16T08:53:02+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：5；上游测试文件：2。
- 上游测试：`packages/app/test/branch-lib-git-diff.test.js`, `packages/app/test/git-unpushed.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/components/git/GitChanges.module.css` → `src/components/git/GitChanges.module.css`; `apps/web/src/utils/gitApi.js` → `src/utils/gitApi.js`; `packages/app/package.json` → `package.json`; `packages/app/server/lib/git-diff.js` → `lib/git-diff.js`。
- B0 diff inspection: 8 distinct hunk context(s) extracted (up to 30): `function TreeDir({ name, node, depth, repoPath, onFileClick, onOpenFile, onResto`; `function CommitRow({ commit, repoPath, expanded, onToggle, onFileClick, onOpenFi`; `export default function GitChanges({ style, onClose, onFileClick, onOpenFile, re`; `export async function fetchAllRepos() {`; `export function countUntrackedLines(cwd, file) {`; `export async function getUnpushedCommits(cwd, { maxCommits = 100 } = {}) {`; `describe('git-diff 分支补充覆盖', () => {`; `describe('getUnpushedCommits', () => {`.
- Upstream commit message excerpt: chore(release): 1.8.17

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0670581b3d"></a>
## [0670581b3d](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d) — fix(chat): release cold-ingest gate on pipeline failure to unfreeze conversation panel

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-17T15:07:11+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：2；上游测试文件：3。
- 上游测试：`apps/web/test/cold-ingest-gate.test.js`, `apps/web/test/v3-delta-seen-order.test.js`, `packages/app/test/events-backpressure.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`。
- B0 diff inspection: 8 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `import assert from 'node:assert/strict';`; `function mkGateHost() {`; `describe('cold-ingest live gate (镜像 AppBase 闸门契约)', () => {`; `import { sseWrite } from './wire-compress.js';`; `function _safeSseWrite(clients, client, payload) {`; `describe('SSE backpressure: _safeSseWrite via sendToClients', () => {`; `describe('SSE backpressure: sendEventToClients', () => {`.
- Upstream commit message excerpt: The load_end chunked ingest pipeline had no exception handling: any entry throwing mid-pipeline left _ingestRunning latched true forever, so all live entries piled into the gate buffer and the chat panel froze until reload (the 30s server ping kept renewing the heartbeat watchdog, so the reconnect abort never fired; the terminal panel was unaffected, using its own WS). - wrap both pipeline entries in try/catch and release the gate via a new token-guarded _failColdIngest (delegate to _abortColdIngest({drain:true}), unblock loading, rebuild the dedup index from the committed baseline while preserving _v2ColdSeed via try/finally) - null-guard _processOneEntry (batch path parity with the live path) - mark v3 delta dedup keys only after buildEntry succeeds - drain buffered frames instead of stranding them when the v3 cold assembly fails - reportSwallowed for SSE parse/ingest catches per convention - server: report and end() the connection when _safeSseWrite throws so the browser auto-reconn…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-8923322f88"></a>
## [8923322f88](./cc-viewer-alignment-commit-ledger.md#commit-8923322f88) — chore(ultraplan): refine code-expert review priority wording

- B0 snapshot comparison: 21 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-17T15:12:28+08:00；父提交 1；相对第一父文件数 41。
- 上游生产/配置文件：3；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/utils/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`; `packages/app/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`; `packages/content/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `Workflow:`.
- Upstream commit message excerpt: Disposal rule for review findings changed from "adopt P0, selectively adopt P1 when concrete and low-risk, defer P2/P3 to backlog" to "adopt P0; adopt P1 and P2 selectively based on evaluation; disregard P3" — synced across code-expert.json, 18 localized UltraPlan.md files, and ultraplanTemplates.js (20 sites).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-301c04bd5e"></a>
## [301c04bd5e](./cc-viewer-alignment-commit-ledger.md#commit-301c04bd5e) — chore(release): version packages

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-17T15:12:44+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2049aef95e"></a>
## [2049aef95e](./cc-viewer-alignment-commit-ledger.md#commit-2049aef95e) — fix(release): publish to npm patch channel to unblock patch-line releases

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-17T15:22:10+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.
- Upstream commit message excerpt: A stray 1.9.0 sits above the 1.8.x patch-only line on the registry, so npm refused to implicitly tag 1.8.18 as latest and the v1.8.18 npm-publish job failed (GitHub Release assets were unaffected). Publish explicitly with --tag patch; latest stays wherever the registry has it.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5b544c6ee1"></a>
## [5b544c6ee1](./cc-viewer-alignment-commit-ledger.md#commit-5b544c6ee1) — fix(release): point npm latest at the just-published version

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-17T16:23:59+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.
- Upstream commit message excerpt: Publish goes to the patch channel (a stray 1.9.0 blocks implicit latest), so latest would otherwise stay pinned to an older release — v1.8.18 shipped while the npm page still showed 1.8.15. Follow the publish with an explicit dist-tag add in the same OIDC-authenticated job.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-01ff6d85e8"></a>
## [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8) — feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-18T16:21:22+08:00；父提交 1；相对第一父文件数 14。
- 上游生产/配置文件：7；上游测试文件：5。
- 上游测试：`apps/web/test/im-quit-button.test.js`, `apps/web/test/im-save-button.test.js`, `apps/web/test/im-status-i18n.test.js`, `apps/web/test/task-progress-hud.test.js`, `packages/app/test/api-im.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/settings/ImConversationModal.jsx` → `src/components/settings/ImConversationModal.jsx`; `apps/web/src/components/settings/ImPlatformSettings.jsx` → `src/components/settings/ImPlatformSettings.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/package.json` → `package.json`。
- B0 diff inspection: 14 distinct hunk context(s) extracted (up to 30): `import React, { useState, useEffect } from 'react';`; `import { t } from '../../i18n';`; `import styles from './TaskProgressHud.module.css';`; `export default function TaskProgressHud() {`; `function TaskRow({ task }) {`; `import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 're`; `export default function ImConversationModal({ open, onClose, platform, onOpenCon`; `export default function ImPlatformSettings({ descriptor }) {`; `const i18nData = {`; `const KEYS = [`; `const css = readFileSync(CSS_PATH, 'utf-8');`; `describe('TaskProgressHud progress dots contract', () => {`; `function imConfigPost(req, res, parsedUrl, isLocal, deps) {`; `describe('Generic /api/im/:platform config API (loopback=admin)', { concurrency:`.
- Upstream commit message excerpt: - TaskProgressHud: replace native title tooltips with antd Popover/Tooltip (scrollable/selectable detail bubble, rightTop placement, shrink-to-fit anchors) - ImConversationModal: add 停止 button (Popconfirm, POST /config enabled:false) - ImPlatformSettings: add independent 保存 button (applyProcess:false, decoupled from start/stop) - server /config: read-merge-write for enabled-only bodies so stopping no longer wipes appKey/allowlist/region (P0); guard non-object JSON bodies (no hang)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-90b41358f9"></a>
## [90b41358f9](./cc-viewer-alignment-commit-ledger.md#commit-90b41358f9) — ci: soft-fail npm dist-tag step under OIDC trusted publishing

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-19T09:19:10+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.
- Upstream commit message excerpt: OIDC credentials authorize only npm publish; dist-tag is a registry metadata op that fails with E401 (seen at v1.8.19). Make the step continue-on-error with a warning telling the maintainer to run it manually, so the release job and downstream bump-homebrew no longer fail on it.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b1fe5c09a6"></a>
## [b1fe5c09a6](./cc-viewer-alignment-commit-ledger.md#commit-b1fe5c09a6) — docs: add config convergence & cloud-sync advisory, link from READMEs

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T11:41:00+08:00；父提交 1；相对第一父文件数 20。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 12 distinct hunk context(s) extracted (up to 30): `cc-viewer works in a single container or on a cloud host where you reach the UI`; `Et Vibe Coding-værktøjssæt destilleret fra egen udviklingserfaring og bygget`; `Ein Vibe-Coding-Toolkit, das aus eigener Entwicklungserfahrung destilliert und a`; `Un kit de herramientas de Vibe Coding destilado de la propia experiencia de desa`; `Une boîte à outils Vibe Coding distillée à partir de l'expérience de dével`; `Un toolkit Vibe Coding distillato dall'esperienza di sviluppo personale, costrui`; `Claude Code をベースに、自身の開発経験を蒸留・蓄積した Vibe`; `Claude Code를 기반으로, 자신의 개발 경험을 증류하여 축적한 V`; `Et Vibe Coding-verktøysett destillert fra egen utviklingserfaring og bygget på`; `Zestaw narzędzi Vibe Coding wydestylowany z własnego doświadczenia programist`; `Um kit de ferramentas de Vibe Coding destilado da própria experiência de desen`; `Claude Code üzerine inşa edilmiş, kendi geliştirme deneyiminden damıtılmı`.
- Upstream commit message excerpt: Add docs/config-cloud-sync.md (+ zh version) scoping the config-cloud-sync advisory to the local<->cloud contract, and link it from the root README and all localized README variants.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-4c5e633e68"></a>
## [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68) — feat(server): unify config JSON writes behind a locked+atomic json-store kernel

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T11:43:15+08:00；父提交 1；相对第一父文件数 16。
- 上游生产/配置文件：10；上游测试文件：4。
- 上游测试：`packages/app/test/ask-store.test.js`, `packages/app/test/branch-lib-ask-store.test.js`, `packages/app/test/json-store.test.js`, `packages/app/test/workspace-registry.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/workspace-registry.js` → `workspace-registry.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { setRetryConfigPath, loadRetryConfig, DEFAULT_RETRY_CONFIG } from './lib`; `function setActiveProfileForWorkspace(activeId, roles) {`; `import { renameSyncWithRetry } from '../file-api.js';`; `function getStoreFile() { return join(LOG_DIR, 'ask-store.json'); }`; `function getLockFile() { return join(LOG_DIR, 'ask-store.lock'); }`; `function withLock(fn) {`; `const _inProcessLocks = new Map();`; `export async function withFileLockAsync(lockPath, fn, opts = {}) {`; `import { randomBytes } from 'node:crypto';`; `export function loadAuthState(projectDir = null) {`; `export function saveAuthConfig(cfg, opts = {}) {`; `export function clearProjectOverride(projectDir) {`; `function readPrefs() {`; `export function saveConfig(id, cfg) {`; `import { join, dirname } from 'node:path';`; `export function getPrefsFile() { return join(LOG_DIR, 'preferences.json'); }`; `export function readPrefsRaw(file = getPrefsFile()) {`; `function writePrefsAtomic(prefs, file) {`; `export async function mutatePrefs(mutator, file = getPrefsFile()) {`; `import { join } from 'node:path';`; `export function readPin(logDir) {`; `export function writePin(logDir, pinnedSessionId) {`; `import { mutatePrefs, applyPrefsPatch, readPrefsRaw } from '../lib/prefs-store.j`; `function proxyProfilesGet(req, res, parsedUrl, isLocal, deps) {`; `function proxyProfilesPost(req, res, parsedUrl, isLocal, deps) {`; `async function ccswitchImportPost(req, res, _parsedUrl, isLocal, deps) {`; `import { readdir, stat } from 'node:fs/promises';`; `import { isDiscardableSession } from './lib/v2/session-select.js';`; `function getWorkspacesFile() { return join(LOG_DIR, 'workspaces.json'); }`; `export function loadWorkspaces() {`.
- Upstream commit message excerpt: New server/lib/json-store.js kernel: readJsonSafe / writeJsonAtomic / mutateJson (async lock) / mutateJsonSync (sync lock) / withJsonLock / applyJsonPatch / lockPathFor, reusing async-file-lock and renameSyncWithRetry. The lock name is derived from the data file (<file>.lock), fixing the old fixed-basename collision, and sync/async locks are mutually exclusive with a lock-timeout degrade. Converge the config JSON writers onto the kernel: - preferences.json: im-config.js was previously neither locked nor atomic and auth.js was atomic but lock-free (a known lost-update window); both now do read-merge-write inside the kernel's sync lock, sharing one preferences.json.lock with the async mutatePrefs path. - profile.json's four write sites (interceptor + preferences routes) now write atomically via the kernel. - prefs-store, workspace-registry, session-pin-store, and ask-store migrate to the kernel without changing their public signatures. No behavior change for readers; this is the prerequi…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3e7f047290"></a>
## [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T11:45:20+08:00；父提交 1；相对第一父文件数 29。
- 上游生产/配置文件：14；上游测试文件：13。
- 上游测试：`packages/app/test/api-ccswitch-import.test.js`, `packages/app/test/api-preferences-gap.test.js`, `packages/app/test/auth-lib.test.js`, `packages/app/test/credential-access.test.js`, `packages/app/test/credential-migrate.test.js`, `packages/app/test/credential-store.test.js`, `packages/app/test/credential-vault.test.js`, `packages/app/test/dingtalk-config.test.js`, `packages/app/test/discord-config.test.js`, `packages/app/test/feishu-config.test.js`, `packages/app/test/im-deny.test.js`, `packages/app/test/usepassword-startup.test.js`, `packages/app/test/wecom-config.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { setRetryConfigPath, loadRetryConfig, DEFAULT_RETRY_CONFIG } from './lib`; `function _writeWorkspaceActive(activeId, roles) {`; `function _loadProxyProfile() {`; `function setActiveProfileForWorkspace(activeId, roles) {`; `import { existsSync, readFileSync } from 'node:fs';`; `import { mutateJsonSync } from './json-store.js';`; `function normalizeAuth(cfg) {`; `function decodePassword(stored) {`; `function decodeStored(a) {`; `export function loadAuthConfig(projectDir = null) {`; `export function loadAuthState(projectDir = null) {`; `export function saveAuthConfig(cfg, opts = {}) {`; `export function clearProjectOverride(projectDir) {`; `export function decideAuth(ctx) {`; `import { LOG_DIR } from '../../findcc.js';`; `const SENSITIVE_CLAUDE_FILES = new Set([`; `import { resolve } from 'node:path';`; `const WRITE_HOME_FILES = ['.bashrc', '.zshrc', '.bash_profile', '.zprofile', '.z`; `const BASH_DENY_RULES = [`; `import { mutateJsonSync } from '../json-store.js';`; `function readPrefs() {`; `export function decodeSecret(stored) {`; `function normField(type, v, dflt) {`; `function decodeField(type, v, dflt) {`; `function decodeStored(id, stored) {`; `function encodeForDisk(id, n) {`; `export function loadState(id) {`; `export function saveConfig(id, cfg) {`; `async function _spawnClaudeImpl(proxyPort, cwd, extraArgs = [], claudePath = nul`; `import { LOG_DIR, setLogDir, getClaudeConfigDir, discoverClaudeExecutables, reso`.
- Upstream commit message excerpt: Move cc-viewer's local credentials out of plain config into a new encrypted vault, fail-closed everywhere: - New credential-vault.js (AES-256-GCM, per-record random IV, machine-local master.key at 0600), credential-store.js (vault-backed credentials.json at 0600), credential-access.js (read-plain / write-cipher / migrate / fallback with fail-closed semantics), and credential-migrate.js (one-time startup migration with write-then-read-back verification). - Proxy profile apiKeys, the LAN password (auth.password / authByProject.*), and IM app secrets are moved out of profile.json / preferences.json into the vault. Low-sensitivity IM cred fields (appKey/appId/botId) stay base64, so plain config files no longer carry these secrets. - Fail-closed: a profile whose apiKey cannot be decrypted is dropped from routing (never forwards the default credential to a third-party host), and an unreadable LAN password denies remote access instead of falling back to the empty-password allow-all. A corrupt…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5a494ba37c"></a>
## [5a494ba37c](./cc-viewer-alignment-commit-ledger.md#commit-5a494ba37c) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T08:54:48+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-739f49a6de"></a>
## [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) — fix(server): close review findings on the credential vault + json-store convergence

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T17:17:04+08:00；父提交 1；相对第一父文件数 21。
- 上游生产/配置文件：10；上游测试文件：6。
- 上游测试：`packages/app/test/api-auth.test.js`, `packages/app/test/branch-routes-preferences.test.js`, `packages/app/test/file-access-policy.test.js`, `packages/app/test/im-deny.test.js`, `packages/app/test/interceptor-profile.test.js`, `packages/app/test/json-store.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/routes/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `Encrypt cc-viewer's local credentials at rest in a new AES-256-GCM vault, separa`; `By default, remote (LAN) access requires the '?token=' query that ccv prints at`; `Global files directly under 'LOG_DIR':`; `otherwise cloud sync has no consistent on-disk state to materialize or compare.`; `grep — no 'createCipheriv'/'scryptSync'/hardcoded key+salt). The real credenti`; `Credentials (C1 apiKey, C2 password, C3 IM secrets) must be **encrypted at rest*`; `local 'master.key' ('0600', generated on first boot, **excluded from config-back`; `cc-viewer **没有** 'official-auth'/'aima'/SSO，也**没有**任何硬编码 k`; `AES-256-GCM、每记录随机 IV、密钥派生自本地 'master.key'（'0600'`; `function _resolveProfileApiKey(profile) {`; `function setActiveProfileForWorkspace(activeId, roles) {`; `function decodePassword(stored) {`; `import { _resetKeyCache } from './credential-vault.js';`; `const MASTER_KEY_PATH = masterKeyPathFor(LOG_DIR);`; `function _vaultHasEntries() {`; `function _vaultUnreadable() {`; `function _keyUsable() {`; `export function readSecretOr(kind, ref, fallbackPlain = '') {`; `export function writeSecret(kind, ref, plain) {`; `export function removeSecret(kind, ref) {`; `export function migrateFieldWithVerify(kind, ref, legacyPlain) {`; `export function _resetCredentialAccess() {`; `import { existsSync } from 'node:fs';`; `import { migrateFieldWithVerify, getCredentialsFile } from './credential-access.`; `const PROFILE_FILE = join(LOG_DIR, 'profile.json');`; `function migrateAuthPasswords() {`; `function migrateImSecrets() {`; `import { loadWorkspaces } from '../workspace-registry.js';`; `export function isReadAllowed(absPath) {`; `const WRITE_HOME_FILES = ['.bashrc', '.zshrc', '.bash_profile', '.zprofile', '.z`.
- Upstream commit message excerpt: P0/P1 correctness & security: - interceptor.js: hoist strictCorrupt out of the fallback object so the corrupt profile.json guard actually fires (was silently destroying recoverable profiles). - json-store.js: mutateJsonSync now throws JSON_STORE_REENTRANT on a reentrant sync call into a lock held by this process's async flavor (was a silent lost update); foreign-process contention still degrades. - routes/preferences.js: route the three remaining profile.json write sites through mutateJsonSync + strictCorrupt (were unlocked readFileSync + writeJsonAtomic). - credential-access.js: resolve the credential root from the LIVE LOG_DIR binding so the vault no longer splits from the config it protects when LOG_DIR moves. - routes/auth.js: refuse to overwrite an unreadable LAN password (409 PASSWORD_UNREADABLE) instead of letting a save wipe the real ciphertext. P2 hardening & docs: - interceptor.js: a profile with a baseURL but no usable key is dropped from routing (fail-closed) instead of for…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-565613bbea"></a>
## [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) — fix(server): revert credential root to frozen; close re-review findings

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T20:52:14+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：7；上游测试文件：4。
- 上游测试：`packages/app/test/api-auth.test.js`, `packages/app/test/api-preferences-gap.test.js`, `packages/app/test/file-access-policy.test.js`, `packages/app/test/im-deny.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/routes/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `function _resolveProfileApiKey(profile) {`; `function _loadProxyProfile() {`; `async function _acquireFileLock(lockPath, opts) {`; `export async function withFileLockAsync(lockPath, fn, opts = {}) {`; `import { _resetKeyCache } from './credential-vault.js';`; `function _keyPath() { return masterKeyPathFor(LOG_DIR); }`; `function _vaultHasEntries() {`; `function _vaultUnreadable() {`; `function _keyUsable() {`; `export function readSecretOr(kind, ref, fallbackPlain = '') {`; `export function writeSecret(kind, ref, plain) {`; `export function removeSecret(kind, ref) {`; `export function migrateFieldWithVerify(kind, ref, legacyPlain) {`; `export function isReadAllowed(absPath) {`; `import os from 'node:os';`; `const WRITE_HOME_FILES = ['.bashrc', '.zshrc', '.bash_profile', '.zprofile', '.z`; `const WRITE_REL_PATHS = ['.claude/settings.json', '.claude/settings.local.json',`; `const READ_REL_PATHS = ['.npmrc', '.netrc', '.claude/cc-viewer/preferences.json'`; `function authConfigPost(req, res, parsedUrl, isLocal, deps) {`; `import { mutatePrefs, applyPrefsPatch, readPrefsRaw } from '../lib/prefs-store.j`; `function preferencesPost(req, res, parsedUrl, isLocal, deps) {`; `function proxyProfilesGet(req, res, parsedUrl, isLocal, deps) {`; `function proxyProfilesPost(req, res, parsedUrl, isLocal, deps) {`; `async function ccswitchImportPost(req, res, _parsedUrl, isLocal, deps) {`; `describe('POST /api/auth/config PASSWORD_UNREADABLE guard', () => {`; `describe('POST /api/preferences logDir switch (isolated, restores LOG_DIR)', ()`; `const _origEnv = {`; `process.env.CCV_PROJECT_DIR = PROJECT;`; `after(() => {`; `describe('file-access-policy: 配置备份目录整树拒读', () => {`.
- Upstream commit message excerpt: Re-review of 739f49a6 found that resolving the credential root from the LIVE LOG_DIR binding re-opened the LAN-gate fail-open it was meant to close (a logDir move carries auth.enabled into the new prefs but not the vault → password resolves '' → allow-all), and that logDir had no admin gate. Three independent reviewers confirmed. This reverts to the load-time frozen root (the fail-CLOSED half of the trade) and hardens the surrounding surface: - credential-access.js: capture CREDENTIALS_FILE/MASTER_KEY_PATH at module load again; the header note now records why a live/following vault fails open. - routes/preferences.js: gate logDir on isAdminReq so an unauthenticated client cannot move the data root. Smaller re-review items: - routes/auth.js: read passwordUnreadable from the same scope object as the seed (was over-firing 409 on a fresh project override when only the global was unreadable). - routes/preferences.js: recompute the cc-switch import merge inside the mutateJsonSync lock agains…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-964ce756b6"></a>
## [964ce756b6](./cc-viewer-alignment-commit-ledger.md#commit-964ce756b6) — docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T23:31:43+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 17 distinct hunk context(s) extracted (up to 30): `runtime-mutable via 'setLogDir()' ('findcc.js:150').`; `through 'mutatePrefs' — bypassing it breaks the lock invariants documented at`; `otherwise cloud sync has no consistent on-disk state to materialize or compare.`; `carried. The credential surface:`; `Every config file is assigned one of four sync classes. This is the core of the`; `pull fails. That is tracked as a lightweight *sync-health* marker, not a write-b`; `which keeps the recovery path complete but means a backup leak is a vault leak.`; `Local JSON → relational/cloud-store mapping. Class C/D are listed for complete`; `Non-secret keys (class A) → table 'user_preferences':`; `Non-secret part (class A) → table 'proxy_profiles':`; `Low value; candidate to fold into 'user_preferences' if you prefer fewer tables.`; `Under **S1** this table is **not created**; credentials stay in the local vault`; `remain local files (class C/D).`; `local-only vault). JSON then degrades to a one-time import source.`; `cc-viewer **没有** 'official-auth'/'aima'/SSO。凭证在本机以 AES-256-GCM`; `AES-256-GCM、每记录随机 IV，主密钥为本机 'master.key'（'0600'，`; `system-prompt 快照/实时、voice-packs、plugins、'IM_<id>/*' → **不建`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-68fd263aac"></a>
## [68fd263aac](./cc-viewer-alignment-commit-ledger.md#commit-68fd263aac) — chore(release): 1.8.20

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:31:52+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9adf4ef539"></a>
## [9adf4ef539](./cc-viewer-alignment-commit-ledger.md#commit-9adf4ef539) — docs: add config convergence & cloud-sync advisory, link from READMEs

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:50:37+08:00；父提交 1；相对第一父文件数 20。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 12 distinct hunk context(s) extracted (up to 30): `cc-viewer works in a single container or on a cloud host where you reach the UI`; `Et Vibe Coding-værktøjssæt destilleret fra egen udviklingserfaring og bygget`; `Ein Vibe-Coding-Toolkit, das aus eigener Entwicklungserfahrung destilliert und a`; `Un kit de herramientas de Vibe Coding destilado de la propia experiencia de desa`; `Une boîte à outils Vibe Coding distillée à partir de l'expérience de dével`; `Un toolkit Vibe Coding distillato dall'esperienza di sviluppo personale, costrui`; `Claude Code をベースに、自身の開発経験を蒸留・蓄積した Vibe`; `Claude Code를 기반으로, 자신의 개발 경험을 증류하여 축적한 V`; `Et Vibe Coding-verktøysett destillert fra egen utviklingserfaring og bygget på`; `Zestaw narzędzi Vibe Coding wydestylowany z własnego doświadczenia programist`; `Um kit de ferramentas de Vibe Coding destilado da própria experiência de desen`; `Claude Code üzerine inşa edilmiş, kendi geliştirme deneyiminden damıtılmı`.
- Upstream commit message excerpt: Add docs/config-cloud-sync.md (+ zh version) scoping the config-cloud-sync advisory to the local<->cloud contract, and link it from the root README and all localized README variants.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d663452c29"></a>
## [d663452c29](./cc-viewer-alignment-commit-ledger.md#commit-d663452c29) — feat(server): unify config JSON writes behind a locked+atomic json-store kernel

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:50:37+08:00；父提交 1；相对第一父文件数 16。
- 上游生产/配置文件：10；上游测试文件：4。
- 上游测试：`packages/app/test/ask-store.test.js`, `packages/app/test/branch-lib-ask-store.test.js`, `packages/app/test/json-store.test.js`, `packages/app/test/workspace-registry.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/workspace-registry.js` → `workspace-registry.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { setRetryConfigPath, loadRetryConfig, DEFAULT_RETRY_CONFIG } from './lib`; `function setActiveProfileForWorkspace(activeId, roles) {`; `import { renameSyncWithRetry } from '../file-api.js';`; `function getStoreFile() { return join(LOG_DIR, 'ask-store.json'); }`; `function getLockFile() { return join(LOG_DIR, 'ask-store.lock'); }`; `function withLock(fn) {`; `const _inProcessLocks = new Map();`; `export async function withFileLockAsync(lockPath, fn, opts = {}) {`; `import { randomBytes } from 'node:crypto';`; `export function loadAuthState(projectDir = null) {`; `export function saveAuthConfig(cfg, opts = {}) {`; `export function clearProjectOverride(projectDir) {`; `function readPrefs() {`; `export function saveConfig(id, cfg) {`; `import { join, dirname } from 'node:path';`; `export function getPrefsFile() { return join(LOG_DIR, 'preferences.json'); }`; `export function readPrefsRaw(file = getPrefsFile()) {`; `function writePrefsAtomic(prefs, file) {`; `export async function mutatePrefs(mutator, file = getPrefsFile()) {`; `import { join } from 'node:path';`; `export function readPin(logDir) {`; `export function writePin(logDir, pinnedSessionId) {`; `import { mutatePrefs, applyPrefsPatch, readPrefsRaw } from '../lib/prefs-store.j`; `function proxyProfilesGet(req, res, parsedUrl, isLocal, deps) {`; `function proxyProfilesPost(req, res, parsedUrl, isLocal, deps) {`; `async function ccswitchImportPost(req, res, _parsedUrl, isLocal, deps) {`; `import { readdir, stat } from 'node:fs/promises';`; `import { isDiscardableSession } from './lib/v2/session-select.js';`; `function getWorkspacesFile() { return join(LOG_DIR, 'workspaces.json'); }`; `export function loadWorkspaces() {`.
- Upstream commit message excerpt: New server/lib/json-store.js kernel: readJsonSafe / writeJsonAtomic / mutateJson (async lock) / mutateJsonSync (sync lock) / withJsonLock / applyJsonPatch / lockPathFor, reusing async-file-lock and renameSyncWithRetry. The lock name is derived from the data file (<file>.lock), fixing the old fixed-basename collision, and sync/async locks are mutually exclusive with a lock-timeout degrade. Converge the config JSON writers onto the kernel: - preferences.json: im-config.js was previously neither locked nor atomic and auth.js was atomic but lock-free (a known lost-update window); both now do read-merge-write inside the kernel's sync lock, sharing one preferences.json.lock with the async mutatePrefs path. - profile.json's four write sites (interceptor + preferences routes) now write atomically via the kernel. - prefs-store, workspace-registry, session-pin-store, and ask-store migrate to the kernel without changing their public signatures. No behavior change for readers; this is the prerequi…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-811b049485"></a>
## [811b049485](./cc-viewer-alignment-commit-ledger.md#commit-811b049485) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:50:37+08:00；父提交 1；相对第一父文件数 29。
- 上游生产/配置文件：14；上游测试文件：13。
- 上游测试：`packages/app/test/api-ccswitch-import.test.js`, `packages/app/test/api-preferences-gap.test.js`, `packages/app/test/auth-lib.test.js`, `packages/app/test/credential-access.test.js`, `packages/app/test/credential-migrate.test.js`, `packages/app/test/credential-store.test.js`, `packages/app/test/credential-vault.test.js`, `packages/app/test/dingtalk-config.test.js`, `packages/app/test/discord-config.test.js`, `packages/app/test/feishu-config.test.js`, `packages/app/test/im-deny.test.js`, `packages/app/test/usepassword-startup.test.js`, `packages/app/test/wecom-config.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { setRetryConfigPath, loadRetryConfig, DEFAULT_RETRY_CONFIG } from './lib`; `function _writeWorkspaceActive(activeId, roles) {`; `function _loadProxyProfile() {`; `function setActiveProfileForWorkspace(activeId, roles) {`; `import { existsSync, readFileSync } from 'node:fs';`; `import { mutateJsonSync } from './json-store.js';`; `function normalizeAuth(cfg) {`; `function decodePassword(stored) {`; `function decodeStored(a) {`; `export function loadAuthConfig(projectDir = null) {`; `export function loadAuthState(projectDir = null) {`; `export function saveAuthConfig(cfg, opts = {}) {`; `export function clearProjectOverride(projectDir) {`; `export function decideAuth(ctx) {`; `import { LOG_DIR } from '../../findcc.js';`; `const SENSITIVE_CLAUDE_FILES = new Set([`; `import { resolve } from 'node:path';`; `const WRITE_HOME_FILES = ['.bashrc', '.zshrc', '.bash_profile', '.zprofile', '.z`; `const BASH_DENY_RULES = [`; `import { mutateJsonSync } from '../json-store.js';`; `function readPrefs() {`; `export function decodeSecret(stored) {`; `function normField(type, v, dflt) {`; `function decodeField(type, v, dflt) {`; `function decodeStored(id, stored) {`; `function encodeForDisk(id, n) {`; `export function loadState(id) {`; `export function saveConfig(id, cfg) {`; `async function _spawnClaudeImpl(proxyPort, cwd, extraArgs = [], claudePath = nul`; `import { LOG_DIR, setLogDir, getClaudeConfigDir, discoverClaudeExecutables, reso`.
- Upstream commit message excerpt: Move cc-viewer's local credentials out of plain config into a new encrypted vault, fail-closed everywhere: - New credential-vault.js (AES-256-GCM, per-record random IV, machine-local master.key at 0600), credential-store.js (vault-backed credentials.json at 0600), credential-access.js (read-plain / write-cipher / migrate / fallback with fail-closed semantics), and credential-migrate.js (one-time startup migration with write-then-read-back verification). - Proxy profile apiKeys, the LAN password (auth.password / authByProject.*), and IM app secrets are moved out of profile.json / preferences.json into the vault. Low-sensitivity IM cred fields (appKey/appId/botId) stay base64, so plain config files no longer carry these secrets. - Fail-closed: a profile whose apiKey cannot be decrypted is dropped from routing (never forwards the default credential to a third-party host), and an unreadable LAN password denies remote access instead of falling back to the empty-password allow-all. A corrupt…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3c78188314"></a>
## [3c78188314](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314) — fix(server): close review findings on the credential vault + json-store convergence

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:50:37+08:00；父提交 1；相对第一父文件数 21。
- 上游生产/配置文件：10；上游测试文件：6。
- 上游测试：`packages/app/test/api-auth.test.js`, `packages/app/test/branch-routes-preferences.test.js`, `packages/app/test/file-access-policy.test.js`, `packages/app/test/im-deny.test.js`, `packages/app/test/interceptor-profile.test.js`, `packages/app/test/json-store.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/routes/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `Encrypt cc-viewer's local credentials at rest in a new AES-256-GCM vault, separa`; `By default, remote (LAN) access requires the '?token=' query that ccv prints at`; `Global files directly under 'LOG_DIR':`; `otherwise cloud sync has no consistent on-disk state to materialize or compare.`; `grep — no 'createCipheriv'/'scryptSync'/hardcoded key+salt). The real credenti`; `Credentials (C1 apiKey, C2 password, C3 IM secrets) must be **encrypted at rest*`; `local 'master.key' ('0600', generated on first boot, **excluded from config-back`; `cc-viewer **没有** 'official-auth'/'aima'/SSO，也**没有**任何硬编码 k`; `AES-256-GCM、每记录随机 IV、密钥派生自本地 'master.key'（'0600'`; `function _resolveProfileApiKey(profile) {`; `function setActiveProfileForWorkspace(activeId, roles) {`; `function decodePassword(stored) {`; `import { _resetKeyCache } from './credential-vault.js';`; `const MASTER_KEY_PATH = masterKeyPathFor(LOG_DIR);`; `function _vaultHasEntries() {`; `function _vaultUnreadable() {`; `function _keyUsable() {`; `export function readSecretOr(kind, ref, fallbackPlain = '') {`; `export function writeSecret(kind, ref, plain) {`; `export function removeSecret(kind, ref) {`; `export function migrateFieldWithVerify(kind, ref, legacyPlain) {`; `export function _resetCredentialAccess() {`; `import { existsSync } from 'node:fs';`; `import { migrateFieldWithVerify, getCredentialsFile } from './credential-access.`; `const PROFILE_FILE = join(LOG_DIR, 'profile.json');`; `function migrateAuthPasswords() {`; `function migrateImSecrets() {`; `import { loadWorkspaces } from '../workspace-registry.js';`; `export function isReadAllowed(absPath) {`; `const WRITE_HOME_FILES = ['.bashrc', '.zshrc', '.bash_profile', '.zprofile', '.z`.
- Upstream commit message excerpt: P0/P1 correctness & security: - interceptor.js: hoist strictCorrupt out of the fallback object so the corrupt profile.json guard actually fires (was silently destroying recoverable profiles). - json-store.js: mutateJsonSync now throws JSON_STORE_REENTRANT on a reentrant sync call into a lock held by this process's async flavor (was a silent lost update); foreign-process contention still degrades. - routes/preferences.js: route the three remaining profile.json write sites through mutateJsonSync + strictCorrupt (were unlocked readFileSync + writeJsonAtomic). - credential-access.js: resolve the credential root from the LIVE LOG_DIR binding so the vault no longer splits from the config it protects when LOG_DIR moves. - routes/auth.js: refuse to overwrite an unreadable LAN password (409 PASSWORD_UNREADABLE) instead of letting a save wipe the real ciphertext. P2 hardening & docs: - interceptor.js: a profile with a baseURL but no usable key is dropped from routing (fail-closed) instead of for…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3cba408188"></a>
## [3cba408188](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188) — fix(server): revert credential root to frozen; close re-review findings

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:50:37+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：7；上游测试文件：4。
- 上游测试：`packages/app/test/api-auth.test.js`, `packages/app/test/api-preferences-gap.test.js`, `packages/app/test/file-access-policy.test.js`, `packages/app/test/im-deny.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/routes/auth.js` → `lib/auth.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `function _resolveProfileApiKey(profile) {`; `function _loadProxyProfile() {`; `async function _acquireFileLock(lockPath, opts) {`; `export async function withFileLockAsync(lockPath, fn, opts = {}) {`; `import { _resetKeyCache } from './credential-vault.js';`; `function _keyPath() { return masterKeyPathFor(LOG_DIR); }`; `function _vaultHasEntries() {`; `function _vaultUnreadable() {`; `function _keyUsable() {`; `export function readSecretOr(kind, ref, fallbackPlain = '') {`; `export function writeSecret(kind, ref, plain) {`; `export function removeSecret(kind, ref) {`; `export function migrateFieldWithVerify(kind, ref, legacyPlain) {`; `export function isReadAllowed(absPath) {`; `import os from 'node:os';`; `const WRITE_HOME_FILES = ['.bashrc', '.zshrc', '.bash_profile', '.zprofile', '.z`; `const WRITE_REL_PATHS = ['.claude/settings.json', '.claude/settings.local.json',`; `const READ_REL_PATHS = ['.npmrc', '.netrc', '.claude/cc-viewer/preferences.json'`; `function authConfigPost(req, res, parsedUrl, isLocal, deps) {`; `import { mutatePrefs, applyPrefsPatch, readPrefsRaw } from '../lib/prefs-store.j`; `function preferencesPost(req, res, parsedUrl, isLocal, deps) {`; `function proxyProfilesGet(req, res, parsedUrl, isLocal, deps) {`; `function proxyProfilesPost(req, res, parsedUrl, isLocal, deps) {`; `async function ccswitchImportPost(req, res, _parsedUrl, isLocal, deps) {`; `describe('POST /api/auth/config PASSWORD_UNREADABLE guard', () => {`; `describe('POST /api/preferences logDir switch (isolated, restores LOG_DIR)', ()`; `const _origEnv = {`; `process.env.CCV_PROJECT_DIR = PROJECT;`; `after(() => {`; `describe('file-access-policy: 配置备份目录整树拒读', () => {`.
- Upstream commit message excerpt: Re-review of 739f49a6 found that resolving the credential root from the LIVE LOG_DIR binding re-opened the LAN-gate fail-open it was meant to close (a logDir move carries auth.enabled into the new prefs but not the vault → password resolves '' → allow-all), and that logDir had no admin gate. Three independent reviewers confirmed. This reverts to the load-time frozen root (the fail-CLOSED half of the trade) and hardens the surrounding surface: - credential-access.js: capture CREDENTIALS_FILE/MASTER_KEY_PATH at module load again; the header note now records why a live/following vault fails open. - routes/preferences.js: gate logDir on isAdminReq so an unauthenticated client cannot move the data root. Smaller re-review items: - routes/auth.js: read passwordUnreadable from the same scope object as the seed (was over-firing 409 on a fresh project override when only the global was unreadable). - routes/preferences.js: recompute the cc-switch import merge inside the mutateJsonSync lock agains…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-384dee8025"></a>
## [384dee8025](./cc-viewer-alignment-commit-ledger.md#commit-384dee8025) — docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:50:37+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 17 distinct hunk context(s) extracted (up to 30): `runtime-mutable via 'setLogDir()' ('findcc.js:150').`; `through 'mutatePrefs' — bypassing it breaks the lock invariants documented at`; `otherwise cloud sync has no consistent on-disk state to materialize or compare.`; `carried. The credential surface:`; `Every config file is assigned one of four sync classes. This is the core of the`; `pull fails. That is tracked as a lightweight *sync-health* marker, not a write-b`; `which keeps the recovery path complete but means a backup leak is a vault leak.`; `Local JSON → relational/cloud-store mapping. Class C/D are listed for complete`; `Non-secret keys (class A) → table 'user_preferences':`; `Non-secret part (class A) → table 'proxy_profiles':`; `Low value; candidate to fold into 'user_preferences' if you prefer fewer tables.`; `Under **S1** this table is **not created**; credentials stay in the local vault`; `remain local files (class C/D).`; `local-only vault). JSON then degrades to a one-time import source.`; `cc-viewer **没有** 'official-auth'/'aima'/SSO。凭证在本机以 AES-256-GCM`; `AES-256-GCM、每记录随机 IV，主密钥为本机 'master.key'（'0600'，`; `system-prompt 快照/实时、voice-packs、plugins、'IM_<id>/*' → **不建`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-19f563d300"></a>
## [19f563d300](./cc-viewer-alignment-commit-ledger.md#commit-19f563d300) — chore(release): 1.8.20

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-22T00:50:37+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-cb50f60d5e"></a>
## [cb50f60d5e](./cc-viewer-alignment-commit-ledger.md#commit-cb50f60d5e) — Merge pull request #144 from weiesky/feature/config-convergence

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-21T13:13:47-04:00；父提交 2；相对第一父文件数 0。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Feature/config convergence

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-975e1ee8ce"></a>
## [975e1ee8ce](./cc-viewer-alignment-commit-ledger.md#commit-975e1ee8ce) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-09-28T09:44:10+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2ae12ca122"></a>
## [2ae12ca122](./cc-viewer-alignment-commit-ledger.md#commit-2ae12ca122) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-05T10:23:57+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-eb2e9703a2"></a>
## [eb2e9703a2](./cc-viewer-alignment-commit-ledger.md#commit-eb2e9703a2) — feat(web): project tab drag-to-reorder + persist order; focus/mask fixes; 1.8.x series summary (v1.9.1) (#145)

- B0 snapshot comparison: 54 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-08T12:20:24+08:00；父提交 1；相对第一父文件数 153。
- 上游生产/配置文件：99；上游测试文件：49。
- 上游测试：`apps/web/test/api-url-gap.test.js`, `apps/web/test/branch-utils-projectAlias.test.js`, `apps/web/test/detach-view-reset.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/live-processes-refresh.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/project-tab-order.test.js`, `apps/web/test/projectAlias.test.js`, `apps/web/test/resume-history-i18n.test.js`, `apps/web/test/resume-history-menu.test.js`, `apps/web/test/resume-sessions-map.test.js`, `apps/web/test/session-manager.test.js`, `apps/web/test/sse-connection-gen.test.js`, `apps/web/test/stream-switch-bleed.test.js`, `apps/web/test/terminal-anchor.test.js`, `apps/web/test/user-markdown.test.js`, `apps/web/test/view-cache-restore.test.js`, `apps/web/test/view-scope.test.js`, `apps/web/test/view-state-cache.test.js`, `apps/web/test/view-switch-sse-scope.test.js`, `apps/web/test/viewed-workspace-storage.test.js`, `packages/app/test/branch-routes-workspaces.test.js`, `packages/app/test/chat-queue-resume.test.js`, `packages/app/test/events-incremental-project.test.js`, `packages/app/test/events-samename-cwd.test.js`, `packages/app/test/interceptor-continuation-sync.test.js`, `packages/app/test/interceptor-instance-header.test.js`, `packages/app/test/interceptor-resume-crossproject.test.js`, `packages/app/test/interceptor-resume-project.test.js`, `packages/app/test/live-processes-close.test.js`, `packages/app/test/pty-manager-anchor.test.js`, `packages/app/test/pty-manager-gap.test.js`, `packages/app/test/pty-manager-instance.test.js`, `packages/app/test/pty-manager.test.js`, `packages/app/test/resume-route.test.js`, `packages/app/test/resume-sessions.test.js`, `packages/app/test/scratch-pty-manager.test.js`, `packages/app/test/stream-chunk-scope.test.js`, `packages/app/test/streaming-status-scope.test.js`, `packages/app/test/v2-core.test.js`, `packages/app/test/v2-layout-normalize-cwd.test.js`, `packages/app/test/v2-live-feed-instance.test.js`, `packages/app/test/v2-resume-switch.test.js`, `packages/app/test/v2-session-select.test.js`, `packages/app/test/view-root.test.js`, `packages/app/test/view-router.test.js`, `packages/app/test/view-routes-project-r4.test.js`, `packages/app/test/view-routes-project.test.js`, `packages/app/test/workspace-registry.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/electron/electron/tab-worker.js` → `electron/tab-worker.js`; `apps/web/package.json` → `package.json`; `apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/App.module.css` → `src/App.module.css`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/common/ConceptHelp.jsx` → `src/components/common/ConceptHelp.jsx`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/quickMenuIcons.jsx` → `src/components/common/quickMenuIcons.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/components/dashboard/WorkspaceList.jsx` → `src/components/dashboard/WorkspaceList.jsx`; `apps/web/src/components/dashboard/WorkspaceList.module.css` → `src/components/dashboard/WorkspaceList.module.css`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/files/MdxEditorPanel.module.css` → `src/components/files/MdxEditorPanel.module.css`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/components/git/GitDiffView.jsx` → `src/components/git/GitDiffView.jsx`; `apps/web/src/components/mobile/MobileFileExplorer.jsx` → `src/components/mobile/MobileFileExplorer.jsx`; `apps/web/src/components/mobile/MobileGitDiff.jsx` → `src/components/mobile/MobileGitDiff.jsx`; `apps/web/src/components/search/SearchPanel.jsx` → `src/components/search/SearchPanel.jsx`; `apps/web/src/components/settings/ImAppendSystemModal.jsx` → `src/components/settings/ImAppendSystemModal.jsx`; `apps/web/src/components/settings/ImConversationModal.jsx` → `src/components/settings/ImConversationModal.jsx`; `apps/web/src/components/settings/ProjectAliasEditor.jsx` → `src/components/settings/ProjectAliasEditor.jsx`; `apps/web/src/components/settings/ProjectAliasEditor.module.css` → `src/components/settings/ProjectAliasEditor.module.css`; `apps/web/src/components/settings/ProjectPrefsManagerModal.jsx` → `src/components/settings/ProjectPrefsManagerModal.jsx`; `apps/web/src/components/settings/SkillsManagerModal.jsx` → `src/components/settings/SkillsManagerModal.jsx`; `apps/web/src/components/settings/SystemTextModal.jsx` → `src/components/settings/SystemTextModal.jsx`; `apps/web/src/components/terminal/CustomUltraplanEditModal.jsx` → `src/components/terminal/CustomUltraplanEditModal.jsx`; `apps/web/src/components/terminal/PresetExpertPickerModal.jsx` → `src/components/terminal/PresetExpertPickerModal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalWsContext.jsx` → `src/components/terminal/TerminalWsContext.jsx`; `apps/web/src/components/viewers/ImageViewer.jsx` → `src/components/viewers/ImageViewer.jsx`; `apps/web/src/global.css` → `src/global.css`; `apps/web/src/hooks/useProjectAlias.js` → `src/hooks/useProjectAlias.js`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/apiUrl.js` → `src/utils/apiUrl.js`; `apps/web/src/utils/gitApi.js` → `src/utils/gitApi.js`; `apps/web/src/utils/projectAlias.js` → `src/utils/projectAlias.js`; `apps/web/src/utils/searchApi.js` → `src/utils/searchApi.js`; `apps/web/src/utils/seqResourceLoaders.js` → `src/utils/seqResourceLoaders.js`; `apps/web/src/utils/sessionManager.js` → `src/utils/sessionManager.js`; `apps/web/src/utils/userImageRefs.js` → `src/utils/userImageRefs.js`; `packages/app/cli.js` → `cli.js`; `packages/app/package.json` → `package.json`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/v2/layout.js` → `lib/log-v2/layout.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`; `packages/app/server/server.js` → `server.js`; `packages/app/server/workspace-registry.js` → `workspace-registry.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `async function launch({ path: projectPath, extraArgs = [], claudePath, isNpmVers`; `async function shutdown() {`; `import { lazy, Suspense } from 'react';`; `import AppBase, { styles } from './AppBase';`; `import { extractLatestPlanUsage } from './utils/rateLimitParser';`; `class App extends AppBase {`; `import React from 'react';`; `import WorkspaceList from './components/dashboard/WorkspaceList';`; `import { snapToPreset, stepPreset } from './utils/displayScaleHelper';`; `import { reportSwallowed } from './utils/errorReport';`; `import { saveEntries, loadEntries, clearEntries, getCacheMeta } from './utils/en`; `class AppBase extends React.Component {`; `import AppBase, { styles, OPTIMISTIC_CLEAR_PERCENT } from './AppBase';`; `import MemoryDetailModal from './components/common/MemoryDetailModal';`; `import { t, getLang, setLang, LANG_OPTIONS } from './i18n';`; `import { apiUrl } from './utils/apiUrl';`; `const CALIBRATION_MODELS = appConfig.calibrationModels;`; `function MobileCtxLabelText({ projectName }) {`; `class Mobile extends AppBase {`; `import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';`; `import QuickAutoApproveRows from '../common/QuickAutoApproveRows';`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import { apiUrl } from '../../utils/apiUrl';`; `class ChatMessage extends React.Component {`; `import { resolveBubbleProducerTs } from '../../utils/sessionManager';`; `import { t } from '../../i18n';`; `import loadingPetUrl from '../../img/loading-pet.gif';`; `class ChatView extends React.Component {`; `import React, { useState, useCallback } from 'react';`.
- Upstream commit message excerpt: * refactor(chat): Header interaction boundary — parallel-project chips / current-project resume dropdown / [+] new workspace - Header chips now show only parallel main PTYs; chip click is a pure view switch (no spawn/kill) via a new per-project view layer (per-project live feeds, /events?project= cold load + per-view-project broadcast filtering, writer activity routed per project; pure logic in lib/v2/view-router.js). - Resume narrowed to the current project's hover list (recent 5, no grouping); picking a session is a pure view switch (attachedSid + ?sid cold load). Removed the scratch resume-child model, POST /api/resume-session, cross-project takeover, _resumeTakeover lock. - Project-alias rename feature deleted; replaced by a standalone dashed [+] button beside the current-project label that opens the new-workspace picker (reuses shared WorkspaceList/DirBrowser, consistent with Electron). - Deleted the cross-process live-process registry, workspaces/activate, sdk-manager.resumeSessi…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-649f853e5e"></a>
## [649f853e5e](./cc-viewer-alignment-commit-ledger.md#commit-649f853e5e) — Feat/resume global switcher (#146)

- B0 snapshot comparison: 14 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-09T17:23:44+08:00；父提交 1；相对第一父文件数 37。
- 上游生产/配置文件：19；上游测试文件：12。
- 上游测试：`apps/web/test/git-changes-open-persist.test.js`, `apps/web/test/live-processes-refresh.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/rebound-scope.test.js`, `apps/web/test/resume-history-menu.test.js`, `apps/web/test/resume-sessions-map.test.js`, `apps/web/test/workspace-list-modal.test.js`, `packages/app/test/api-workspaces.test.js`, `packages/app/test/branch-workspace-registry.test.js`, `packages/app/test/live-processes-close.test.js`, `packages/app/test/workspace-registry-limit.test.js`, `packages/app/test/workspace-registry.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `apps/web/src/components/dashboard/WorkspaceList.jsx` → `src/components/dashboard/WorkspaceList.jsx`; `apps/web/src/components/dashboard/WorkspaceList.module.css` → `src/components/dashboard/WorkspaceList.module.css`; `apps/web/src/global.css` → `src/global.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/v2/layout.js` → `lib/log-v2/layout.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/workspace-registry.js` → `workspace-registry.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `import { createViewStateCache } from './utils/viewStateCache';`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `function QuickAutoApproveRows({ autoApproveSeconds, planAutoApproveSeconds, onAu`; `export default function NewProjectModal({ open, onClose, onLaunch, themeConfig }`; `import { Button, Input, Empty, Typography, Popconfirm, message, Modal } from 'an`; `import { formatSize } from '../../utils/formatters';`; `import styles from './WorkspaceList.module.css';`; `function timeAgo(isoString) {`; `export default function WorkspaceList({ onLaunch }) {`; `html, body, #root {`; `const i18nData = {`; `export function attachMainPty(project, { fetchImpl, reportImpl, instanceKey } =`; `export function closeProjectPty(project, { fetchImpl, reportImpl, instanceKey }`; `describe('AppBase.jsx source anchors (refactor guard)', () => {`; `describe('App.jsx source anchor (refactor guard)', () => {`; `const KEYS = [`; `describe('new UI key i18n coverage', () => {`; `const RESUME_UTILS = read('src/utils/resumeSessions.js');`; `describe('star-menu migration — the history row lives between perm and plan',`; `describe('closeProjectPty', () => {`; `import { mkdirSync, writeFileSync, renameSync, existsSync, openSync, writeSync,`; `export function dirSizeSync(dir) {`; `export function killPty() {`; `export function killPtyFor({ cwd, project, instanceKey } = {}) {`; `import { LOG_DIR } from '../../findcc.js';`; `import { projectKeyForCwd } from '../lib/system-prompt-snapshots.js';`; `import { isSameOriginBrowserRequest } from '../lib/same-origin.js';`; `function postLiveProcessAttachHandler(req, res, parsedUrl, isLocal, deps) {`.
- Upstream commit message excerpt: * fix(web): persist git-changes panel open state across refresh - Add ccv_gitChangesOpen localStorage persistence mirroring ccv_fileExplorerOpen - _setGitChangesOpen setter folds _pendingGitRefresh consumption inside (fully symmetric with _setFileExplorerOpen); nav onClick shrinks to 3 lines - Active closes persist (nav toggle / panel X / FileExplorer & Search icon mutual exclusion); passive closes don't (_detectGit no-repo, jump-to-file) so cross-project intent survives - Constructor reads back with isPad branch (parity with fileExplorerOpen) - Mutual-exclusion restore: git only restores to open when fileExplorer resolves to closed, eliminating the previously-unreachable double-open state after refresh - iPad pad-mode now covered (was missing); phone still untouched Coverage: git-changes-open-persist.test.js (10 tests) * perf(server): 10x faster /api/workspaces via stats-cache reuse + async fs + sort-then-enrich Backend: - getWorkspaces({ limit }) — sort by lastUsed BEFORE enrich; lim…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-97f22c8c9a"></a>
## [97f22c8c9a](./cc-viewer-alignment-commit-ledger.md#commit-97f22c8c9a) — chore(release): 1.9.2

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-09T17:29:49+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Consume the five patch changesets from #146 (close-rebind scoping, git-changes panel persistence, nav-rail cleanup + star-menu order, workspace-picker perf/UX, workspace help modal + glass background) and file the history.md Unreleased entries under ## 1.9.2.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3fa5717865"></a>
## [3fa5717865](./cc-viewer-alignment-commit-ledger.md#commit-3fa5717865) — ci(release): carry `latest` on the publish itself, widen the homebrew poll

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-09T18:48:22+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.
- Upstream commit message excerpt: Manual follow-ups after v1.9.2 — neither should need a human: - `latest` lagged a release behind until someone ran `npm dist-tag add cc-viewer@1.9.2 latest` by hand. The dist-tag step could never work under OIDC trusted publishing: that grants only `npm publish`, so a standalone `npm dist-tag add` is rejected with E401 (soft-failing with a reminder since v1.8.19). The publish now selects its own tag: probe the registry's versions and publish `--tag latest` when this release is the highest, else fall back to `--tag patch` and warn — preserving the reason the patch channel exists (the stray 1.9.0, which would otherwise invert `latest` below a newer version, as handled at v1.8.18/1.9.1). - bump-homebrew timed out waiting for the registry at v1.9.2: its 10-minute poll (20x30s) was exhausted even though the publish had succeeded (the tarball became visible ~13min after `+ cc-viewer@1.9.2`). Widened to 20 minutes (40x30s), and the wait now echoes the registry dist-tags and warns when `latest…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c93c3110ed"></a>
## [c93c3110ed](./cc-viewer-alignment-commit-ledger.md#commit-c93c3110ed) — Update README.md

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-10T10:08:58+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `The **Edit System Prompt** modal (hamburger menu → Edit System Prompt) is tabb`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d6cab4869a"></a>
## [d6cab4869a](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) — feat(server): relay SDK task_* messages as sdk-task WS frames (#147)

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-10T15:24:07+08:00；父提交 1；相对第一父文件数 18。
- 上游生产/配置文件：5；上游测试文件：7。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sid-not-found-live-empty.test.js`, `packages/app/test/branch-lib-sdk-manager.test.js`, `packages/app/test/events-instance-live-empty.test.js`, `packages/app/test/resume-route.test.js`, `packages/app/test/sdk-manager-extra.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `const i18nData = {`; `const KEYS = [`; `import { APPROVAL_TOOLS, isPublishCommand } from './approval-policy.js';`; `let _claudeExecutable = null; // pathToClaudeCodeExecutable — resolved with th`; `let _activeQuery = null;`; `export function initSdkSession(cwd, projectName, { onTurnEnd, onQueryError, broa`; `export async function sendUserMessage(text) {`; `function _broadcastQueueState() {`; `async function _executeQuery(text) {`; `function _processMessage(msg) {`; `async function _handleCanUseTool(toolName, input, options) {`; `function _waitForApproval(id, timeoutMs, kind, replay = null) {`; `export function cancelApproval(id, reason) {`; `function _interruptActiveQuery() {`; `export function interruptTurn() {`; `export function sendQueuedNow(id) {`; `export function getQueueSnapshot() {`; `export function stopSession() {`; `function _resetFullState() {`; `async function events(req, res, parsedUrl, isLocal, deps) {`; `function postResumeSessionHandler(req, res, parsedUrl, isLocal, deps) {`; `async function waitMicro(cond, max = 60) {`; `function makeCanUseToolQuery(toolName, input, ctrl) {`; `const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;`; `async function driveTimeout({ toolName, input, ctrl, broadcastType, timeoutMs })`; `describe('sdk-manager 分支补强 — _waitForApproval 三处超时 deny', () =`; `describe('sdk-manager 分支补强 — _waitForApproval 超时后 _pendingApprov`; `function makeFakeQuery(msgs) {`; `describe('sdk-manager 分支补强 — result 带 session_id', () => {`.
- Upstream commit message excerpt: * fix(server): SDK 模式三项 P0 修复 + 常驻 streaming-input 重构 - 审批超时广播 dismiss（ask→sdk-ask-timeout、plan→sdk-plan-resolved、perm→perm-hook-timeout），接通 canUseTool options.signal - 常驻 streaming-input 进程：一次构造长驻 query，Stop 升级为真 interrupt()；静默看门狗 + 墓碑 + 死亡惰性重建 + 重建节流 - POST /api/resume-session 新增 SDK 分支（switchToSession），历史会话切换不再 404 Coverage: sdk-manager-query.test.js, sdk-manager-extra.test.js, branch-lib-sdk-manager.test.js, resume-route.test.js * fix(server): 新建工作区空会话 tab 不再误报超时并串流绑定项目对话 - /events ?instance= 无会话目录时钉死空冷源（legacy 与 v3 两处回退一律钉空串，死活实例都不再回退到绑定项目当前会话） - 实例存活 → 不发 sid-not-found，空视图 load_start{total:0,empty:true} + 保持 per-project live feed，首个请求落盘即实时上屏 - 实例已死 → 维持 sid-not-found → 前端 detach 回绑定项目 - load_start empty:true 信号让客户端失效该 scope 视图缓存快照（修复增量恢复已删会话残留） - 空视图跳过全局 context-window.json 兜底（避免画入别的项目用量条） - 前端 sid-not-found 按 payload reason 显示新键 ui.resume.noSession（18 语言）取代误导性的「切换超时」 Coverage: events-instance-live-empty.test.js, sid-not-found-live-empty.test.js * feat(server): relay SDK task_* m…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-956af1723f"></a>
## [956af1723f](./cc-viewer-alignment-commit-ledger.md#commit-956af1723f) — chore(release): 1.9.3

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-10T15:35:57+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Consume the five patch changesets (workspace-empty-tab sid-not-found fix, SDK approval-timeout dismiss broadcast, SDK resident streaming-input rework, SDK in-place session resume, SDK task_* message relay) and file the history.md Unreleased entries under ## 1.9.3.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7f7f78e2d8"></a>
## [7f7f78e2d8](./cc-viewer-alignment-commit-ledger.md#commit-7f7f78e2d8) — feat(web): 新建工作区目录树「启动」一步直启

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-10T22:53:55+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/WorkspaceList.jsx` → `src/components/dashboard/WorkspaceList.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `export default function WorkspaceList({ onLaunch, embedded = false }) {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d88d8aee2a"></a>
## [d88d8aee2a](./cc-viewer-alignment-commit-ledger.md#commit-d88d8aee2a) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-12T10:46:32+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-04d05a5824"></a>
## [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) — feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:47+08:00；父提交 1；相对第一父文件数 21。
- 上游生产/配置文件：11；上游测试文件：6。
- 上游测试：`apps/web/test/context-i18n.test.js`, `apps/web/test/context-usage-view.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdk-context-usage-tab.test.js`, `packages/app/test/sdk-context-route.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 23 distinct hunk context(s) extracted (up to 30): `cc-viewer also ships as a native desktop app: [download page](https://github.com`; `class App extends AppBase {`; `import ContextTab from './ContextTab';`; `class DetailPanel extends React.Component {`; `const i18nData = {`; `const KEYS = [`; `describe('new UI key i18n coverage', () => {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `let _lastInitSnapshot = null; // last sdk-init payload for WS reconnect replay`; `let _messageQueue = [];`; `export async function sendUserMessage(text) {`; `function _processMessage(msg) {`; `function _notifyTurnError(resultMsg) {`; `async function _handleCanUseTool(toolName, input, options) {`; `export function switchToSession(sessionId) {`; `function _resetFullState() {`; `import { resumeRoutes } from './routes/resume.js';`; `const _routes = [`; `async function setupTerminalWebSocket(httpServer) {`; `export function setSdkGetInitSnapshot(fn) { _sdkGetInitSnapshot = fn; }`; `function makeDeps(extra = {}) {`; `function makeResidentQuery({ respond, initMsgs, autoRelease = 0 } = {}) {`; `describe('sdk-manager-query — queue-state 广播与快照', () => {`.
- Upstream commit message excerpt: 健壮性(P2):_runWaterfallHook 的 plan/ask/perm 三处静默 catch{} 改 reportSwallowed;_messageQueue 加 MAX_QUEUE_ITEMS=50 上限,超限只发 queue-rejected{reason:'full'}(前端 queueFull toast 从死监听接通);README ccv -SDK 笔误改 ccv --sdk,no terminal panel 改为承认 Header 的 scratch 多 tab 终端存在。 Context 用量面板(P1):常驻 query 接通 getContextUsage 控制请求,回合结束/compact 后自动拉取并广播 sdk-context-usage(快照随 WS 重连回放、切会话广播清帧),新增 GET /api/sdk-context-usage 按需拉取;请求详情面板新增 SDK-only「Context 用量」 标签页,按类别构成条(含 auto-compact 阈值刻度)/上下文网格/记忆文件/MCP 工具/ 系统提示分节/子代理/技能/消息明细全字段渲染(18 语言)。control 失败仅 reportSwallowed,不打扰 UI。 Coverage: sdk-manager-query.test.js, sdk-context-route.test.js, context-usage-view.test.js, context-i18n.test.js, sdk-context-usage-tab.test.js.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a07464187c"></a>
## [a07464187c](./cc-viewer-alignment-commit-ledger.md#commit-a07464187c) — fix(web): 新建工作区弹窗底部出血加高

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/WorkspaceList.module.css` → `src/components/dashboard/WorkspaceList.module.css`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: 嵌入 antd Modal 的 .modalBody 底部 padding 0 → 20px,目录树底部不再贴弹窗下边缘。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ad369d2856"></a>
## [ad369d2856](./cc-viewer-alignment-commit-ledger.md#commit-ad369d2856) — chore(sdk): getContextUsage 超时定时器 unref + settle 后 clearTimeout

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `async function _collectContextUsage(trigger) {`.
- Upstream commit message excerpt: 对齐本文件既有定时器惯例(watchdog/grace 均 unref),避免 10s 窗口内推迟进程退出; 请求 settle 后清理 timer 句柄。review P3 整洁项,无功能变化。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-133bc219df"></a>
## [133bc219df](./cc-viewer-alignment-commit-ledger.md#commit-133bc219df) — feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 45。
- 上游生产/配置文件：17；上游测试文件：9。
- 上游测试：`apps/web/test/mcp-status-i18n.test.js`, `apps/web/test/mcp-status-view.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdk-mcp-status-tab.test.js`, `apps/web/test/sdk-model-chip.test.js`, `apps/web/test/sdk-model-wiring.test.js`, `apps/web/test/sdk-panel-stable-dispatch.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-mcp-status-route.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `import { reportSwallowed } from '../../utils/errorReport';`; `class AppHeader extends React.Component {`; `import SdkContextUsageTab from './SdkContextUsageTab';`; `class DetailPanel extends React.Component {`; `export default function SdkContextUsageTab() {`; `const i18nData = {`; `const KEYS = [`; `describe('new UI key i18n coverage', () => {`; `ccv -c --d             # == claude --continue --dangerously-skip-permissions`; `cc-viewer findes også som native desktop-app: [Downloadside](https://github.com`; `CC-Viewer wird auch als native Desktop-App ausgeliefert: [Download-Seite](https:`; `cc-viewer también se distribuye como aplicación de escritorio nativa: [Página`; `cc-viewer est également distribué en tant qu'application de bureau native : [P`; `cc-viewer è anche distribuito come applicazione desktop nativa: [Pagina di down`; `cc-viewer はネイティブデスクトップアプリも提供しています`; `cc-viewer 는 네이티브 데스크톱 앱도 제공합니다: [다운로드`; `cc-viewer kommer også som native desktop-app: [Nedlastingsside](https://github.`; `cc-viewer jest również dostarczany jako natywna aplikacja desktopowa: [Strona`; `cc-viewer também é distribuído como aplicativo desktop nativo: [Página de do`; `cc-viewer также предоставляет клиентскую верси`; `cc-viewer มีเวอร์ชันไคลเอนต์ให้บร`; `cc-viewer'ın istemci sürümü de mevcuttur: [İndirme bağlantısı](https://g`; `cc-viewer також постачається як клієнтська верс`; `cc-viewer 也提供了客戶端版本：[下載連結](https://github.com/weiesk`; `cc-viewer提供了客户端的版本：[下载地址](https://github.com/weiesky`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `const CTX_USAGE_TIMEOUT_MS = 10 * 1000;`.
- Upstream commit message excerpt: - D: 接通 mcpServerStatus()(GET /api/sdk-mcp-server-status + WS 重连回放 + 切会话清帧;身份守卫 + 10s 超时 + 数组守卫反转),详情面板新增 SDK-only「MCP 状态」标签页。 - E: sdkModel 死状态接通,提升到 AppBase,在 AppHeader 代理热切换 chip 槽位作回退展示(热切换优先,只读);resume 切会话清空防陈旧,删除 ChatView 冗余拷贝。 - F: 同步 17 个翻译版 README 的 SDK 段(ccv --sdk / 承认 Header scratch 终端)。 - fix: 修 SdkMcpStatusTab 与 SdkContextUsageTab 的无限拉取环(useState+useCallback([detail,status]) → useReducer 稳定 dispatch),新增源契约测试防回归。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c4529a6ed7"></a>
## [c4529a6ed7](./cc-viewer-alignment-commit-ledger.md#commit-c4529a6ed7) — fix(ui): 对话 loading 覆盖整个回合,本地工具执行期不再误熄

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 15。
- 上游生产/配置文件：8；上游测试文件：5。
- 上游测试：`apps/web/test/sse-connection-gen.test.js`, `apps/web/test/turn-active-gating.test.js`, `packages/app/test/api-events-gap.test.js`, `packages/app/test/cli-sdk-session-state-env.test.js`, `packages/app/test/turn-active.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/cli.js` → `cli.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 22 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `const LOG_PAGE_SIZE = 50;`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `class ChatView extends React.Component {`; `describe('AppBase.jsx 源码锚点（防未来重构漂移）', () => {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `export function resetStreamingState() {`; `function turnEndNotify(req, res, parsedUrl, isLocal, deps) {`; `async function events(req, res, parsedUrl, isLocal, deps) {`; `function execWithStdin(cmd, args, input, options) {`; `import { applyTaskEvent, resetTasks, getTaskSnapshot, shouldResetTasks } from '.`; `const deps = {`; `async function setupTerminalWebSocket(httpServer) {`; `export function getAuthConfig() {`; `function _onStreamingActivated() {`; `export const __testing = (process.env.NODE_ENV === 'test') ? {`; `async function _doStop() {`; `export function broadcastWsMessage(msg) {`; `export function setSdkGetMcpStatusSnapshot(fn) { _sdkGetMcpStatusSnapshot = fn;`; `describe('GET /events', () => {`; `describe('POST /api/turn-end-notify', () => {`.
- Upstream commit message excerpt: 原信号粒度是单个 API 请求,两次调用间隙跑本地工具(Bash/Edit 等)时 spinner 熄灭,像任务已结束。新增回合级 turnActive 状态: - PTY:UserPromptSubmit hook 亮起(sessionId 承重守卫),Stop hook 原始 POST 到达即灭(跳过 10s 语音防抖),停止按钮(queue-suppress)/终端 Esc(嗅探 「Request interrupted」fullmatch 条目)主动灭;turnActive=true 期间 server 每 10s 心跳重播 turn_active(unref'd + 项目过滤),前端 30s 双无(无 API 活动且 无回合级信号)自调度陈旧兜底防卡死;SSE connect replay 只发绑定项目视图。 - SDK:转发 CLI 原生 session_state_changed(idle/running/requires_action,注入 CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1 解锁),push→running / result→idle / 中断·死亡→idle 全版本兜底;帧带 cwd 按工作区路由,前端按查看工作区过滤。 灭灯改为回合级信号把关 2s 防抖,亮灯时机不变;hook 缺失精确退化旧行为; 多工作区切换双端复位(_resetForViewSwitch/chip/attach/workspace 全覆盖)。 行为变化:工具执行间隙按 Enter 转为入队而非立即发送。 Coverage: turn-active.test.js, cli-sdk-session-state-env.test.js, turn-active-gating.test.js, sse-connection-gen.test.js, api-events-gap.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3079040494"></a>
## [3079040494](./cc-viewer-alignment-commit-ledger.md#commit-3079040494) — feat(sdk): SDK 模式改为每工作区独立常驻会话(按 cwd 多会话,对齐 PTY)

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 14。
- 上游生产/配置文件：8；上游测试文件：4。
- 上游测试：`apps/web/test/queue-bubbles.test.js`, `apps/web/test/resume-sessions-map.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-session-registry.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `function HeaderProjectTabs({ tabs, currentProject, currentInstanceKey, viewedPro`; `export function deriveProjectTabs(processes) {`; `describe('queue bubbles — render block', () => {`; `describe('deriveProjectTabs', () => {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `import { reportSwallowed } from '@ccv/core/error-report';`; `try {`; `export function __setQueryForTests(fn) { _query = fn; }`; `const TURN_WATCHDOG_MS = 25 * 60 * 1000;`; `const CTX_USAGE_TIMEOUT_MS = 10 * 1000;`; `let _lastMcpStatus = null;`; `const MAX_QUEUE_ITEMS = 50;`; `export async function sendUserMessage(text) {`; `function _makeQueueItem(text) {`; `function _userMessage(text) {`; `function _normalizeSdkTask(msg) {`; `function _notifyTurnError(resultMsg) {`; `async function _collectContextUsage(trigger) {`; `function _refreshContextUsage(trigger) {`; `export async function fetchContextUsage() {`; `export function getContextUsageSnapshot() { return _lastContextUsage; }`; `function _clearContextUsage(trigger) {`; `async function _collectMcpStatus(trigger) {`; `export async function fetchMcpStatus() {`; `export function getMcpStatusSnapshot() { return _lastMcpStatus; }`; `function _clearMcpStatus(trigger) {`; `async function _handleCanUseTool(toolName, input, options) {`; `function _broadcastApprovalDismiss(kind, id, reason) {`; `function _waitForApproval(id, timeoutMs, kind, replay = null, signal = null) {`.
- Upstream commit message excerpt: sdk-manager 由单例重构为 Map<path.resolve(cwd), Session> 工厂闭包注册表, _activeKey 选当前会话。launch/新建工作区即在该 cwd 注册独立常驻会话,切走 不拆旧会话(后台持续运行),切回懒重建并 resume 其 sessionId。发消息/中断/ 队列按 cwd(或 sanitized 项目名)anchor 寻址;每会话子进程注入 x-ccv-project-dir:<cwd>(对齐 PTY),transcript 按 cwd 分流不串写;cwd 标记 的 WS 帧只推给正在看该工作区的连接,重连 replay 同滤。header /api/live-processes 把每个 SDK 会话以 kind:'main' 真实条目列出(可切换、 不可 × 关),修复「SDK 模式 header [+] 首次新建工作区后项目名塌缩只剩新 项目」。launch 注册新会话用进程级 launch 配置模板(setSdkLaunchConfig); initSdkSession 回调只在显式传入时覆盖;workspacesStop 一并 stopSession() 回收全部 SDK 会话。 Coverage: sdk-session-registry.test.js + 既有 sdk-manager 系列。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-bc669f59cc"></a>
## [bc669f59cc](./cc-viewer-alignment-commit-ledger.md#commit-bc669f59cc) — test(sdk): 补提交 SDK 会话状态(turn-level session-state)测试

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`packages/app/test/sdk-session-state.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: 覆盖 sdk-manager 的 session_state_changed 转发、push/result 兜底、interrupt/teardown 清态、WS 重连快照等。该文件在 turnActive 提交时漏收。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2be5bb23f6"></a>
## [2be5bb23f6](./cc-viewer-alignment-commit-ledger.md#commit-2be5bb23f6) — feat(ui): 小终端(scratch)按工作区分组并伴随视图切换,关闭工作区连带回收

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 17。
- 上游生产/配置文件：9；上游测试文件：6。
- 上游测试：`apps/web/test/quick-settings-i18n.test.js`, `apps/web/test/scratch-tabs-storage.test.js`, `apps/web/test/scratch-workspace-switch.test.js`, `packages/app/test/live-processes-close.test.js`, `packages/app/test/scratch-pty-manager-gap.test.js`, `packages/app/test/server-cli-mode.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/terminal/ScratchTerminal.jsx` → `src/components/terminal/ScratchTerminal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/scratch-pty-manager.js` → `scratch-pty-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class Mobile extends AppBase {`; `class ChatView extends React.Component {`; `import '@xterm/xterm/css/xterm.css';`; `import { clipboardKeyAction, copyTextToClipboard, planPasteSend } from '../../ut`; `class ScratchTerminal extends React.Component {`; `const SCRATCH_HEIGHT_KEY = 'cc-viewer-scratch-height';`; `const SCRATCH_HEIGHT_DEFAULT = 200;`; `function readScratchHeight() {`; `class TerminalPanel extends React.Component {`; `const i18nData = {`; `const KEYS = [`; `function postLiveProcessCloseHandler(req, res, parsedUrl, isLocal, deps) {`; `const BUFFER_TRIM_TO = 45000;`; `const ptys = new Map();`; `async function getPty() {`; `function newState() {`; `function getOrInit(id) {`; `function maybeReap(id, s) {`; `function fixSpawnHelperPermissions() {`; `export async function spawnScratch(id) {`; `function _clampScratchDim(v, min, max, fallback) {`; `export function resizeScratch(id, cols, rows) {`; `export function killScratch(id) {`; `export function killAllScratch() {`; `export function onScratchData(id, cb) {`; `export function onScratchExit(id, cb) {`; `export function getScratchPid(id) {`; `export function getScratchState(id) {`; `export function getScratchPtyCount() {`; `import { randomBytes } from 'node:crypto';`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5a7349a23b"></a>
## [5a7349a23b](./cc-viewer-alignment-commit-ledger.md#commit-5a7349a23b) — chore(release): 1.9.4

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T00:25:48+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2dbe5cd695"></a>
## [2dbe5cd695](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) — feat(web): 汉堡菜单「钉住」持久化迁移到 preferences.json (#148)

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T22:25:34+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：2；上游测试文件：2。
- 上游测试：`apps/web/test/pinned-menu-prefs-migration.test.js`, `apps/web/test/pinned-menu.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/utils/pinnedMenu.js` → `src/utils/pinnedMenu.js`。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `import { handleSkillToggle, handleSkillDelete } from '../../utils/skillModalCont`; `function makeAuthState(over = {}) {`; `class AppHeader extends React.Component {`; `export const PINNED_KEY = 'ccv_pinnedMenuKeys';`; `export function parsePinned(raw) {`; `export function serializePinned(arr) {`; `export function togglePinned(arr, key) {`; `function parsePinnedArray(arr) {`; `import assert from 'node:assert/strict';`; `describe('pinnedMenu', () => {`.
- Upstream commit message excerpt: 权威源从浏览器 localStorage(ccv_pinnedMenuKeys,JSON 字符串)迁到服务端 pinnedMenuKeys(真数组,顺序=钉住先后),跨浏览器/设备一致,并随「项目独立 配置」fork 到项目作用域(POST 浅合并宽容落盘,服务端零改动)。 - 首启一次性迁移:prefs 缺键而 legacy 有值 → 经 _persistQueue 写回并清旧键; 服务端已持有权威数组(含空数组)时直接清理遗留旧键,防死数据复活 - 初值恒空等权威水合(不再用 legacy 乐观种子),杜绝陈旧种子覆盖他端 pin - 水合窗口内用户已 toggle:迟到初始 GET 不回退其操作(_pinnedTouched 闩锁 + _prefsHydrated 门控,用户 POST 落盘后才开闸;窗口内 POST 为整数组 LWW, 已接受的一个 RTT 取舍) - 全部写回(含迁移 POST)经 _persistQueue 串行化(服务端 LWW 乱序会丢 pin), 链前置 .catch 自愈;GET 失败按 logDir stamp 判别,保留现状不清旧键 - 日志模式(isLocalLog)统一走 preferences,不再保留 localStorage 双轨 - cDU 新增 props.preferences 同步通道(sameKeys 内容比较防更新环), sCU 白名单补 preferences(修复 render 已消费的现存漏网) - 删除死导出 serializePinned(写路径只走 preferences,无生产使用方) Coverage: pinned-menu.test.js, pinned-menu-prefs-migration.test.js Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com> Co-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5c28d4c50a"></a>
## [5c28d4c50a](./cc-viewer-alignment-commit-ledger.md#commit-5c28d4c50a) — feat(sse): per-workspace independent SSE channels

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-13T22:27:41+08:00；父提交 1；相对第一父文件数 47。
- 上游生产/配置文件：22；上游测试文件：23。
- 上游测试：`apps/web/test/channel-isolation.test.js`, `apps/web/test/detach-view-reset.test.js`, `apps/web/test/live-processes-refresh.test.js`, `apps/web/test/resume-history-menu.test.js`, `apps/web/test/sid-not-found-live-empty.test.js`, `apps/web/test/sse-channels.test.js`, `apps/web/test/sse-connection-gen.test.js`, `apps/web/test/stream-switch-bleed.test.js`, `apps/web/test/turn-active-gating.test.js`, `apps/web/test/turn-end-scope-client.test.js`, `apps/web/test/view-cache-restore.test.js`, `apps/web/test/view-channel-state.test.js`, `apps/web/test/warm-switch-instant.test.js`, `packages/app/test/api-events-gap.test.js`, `packages/app/test/pty-session-resolve.test.js`, `packages/app/test/scope-router.test.js`, `packages/app/test/streaming-scope-state.test.js`, `packages/app/test/streaming-status-scope.test.js`, `packages/app/test/task-state.test.js`, `packages/app/test/turn-end-scope-behavior.test.js`, `packages/app/test/turn-end-scope.test.js`, `packages/app/test/view-router.test.js`, `packages/app/test/view-routes-project-r4.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/cli.js` → `cli.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { createV3Assembler } from './utils/v3Assembler.js';`; `const TURN_ACTIVE_STALE_MS = 30 * 1000;`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `describe('AppBase.jsx 源码锚点（防未来重构漂移）', () => {`; `describe('AppBase.jsx workspace_started rebound wiring (2026-10)', () => {`; `describe('viewed-project scoping + true /resume confirm', () => {`; `describe('sid-not-found reason handling (runtime)', () => {`; `import { dirname, join } from 'node:path';`; `const APPBASE_SRC = readFileSync(`; `function mkSseHost() {`; `describe('SSE 连接代际守卫（串扰止血）', () => {`; `describe('AppBase.jsx 源码锚点(防重构漂移)', () => {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `import { consumePendingForResume, writeSnapshot, projectKeyForCwd } from './lib/`; `export function setLivePort(port, protocol) { _livePort = port ? String(port) :`; `export function resetStreamingState() {`; `export function setTurnActive(v) { turnActive.active = !!v; }`; `export function setupInterceptor() {`; `function _createSession(key, cwd) {`; `const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed', 'deleted'`; `function _touch(task) {`; `export function applyTaskEvent(payload) {`; `function _stub(taskId, payload) {`; `export function shouldResetTasksOnPrompt(payload, currentSessionId) {`; `export function __resetForTests() {`; `let transcriptPath = null;`; `try {`; `const internalToken = process.env.CCVIEWER_INTERNAL_TOKEN || '';`; `import { processWatchedEntry, sendEventToClients, sendEventRawToClients } from '`.
- Upstream commit message excerpt: Replace the single re-scoped SSE connection with one persistent channel per workspace scope (bound / project / project+instance / sid), so concurrent workspaces no longer entangle special states on one torn-down-and-rebuilt connection. Server: streaming/turn state moves from process-global singletons to scope-keyed maps (the bound project normalizes to the '' sentinel, so a single workspace keeps byte-identical legacy behavior); turn_end / task_update / stream-progress / session_pin / workflow_update are now routed per scope via a unified sid->cwd->bound hook-payload resolver; stream chunks finally carry the producer's self-reported project/instance (the old filter was dead code); connect-time task snapshot / turn_active replay / context_window fallback are read per viewed scope. Task state is bucketed per scope ('' = the legacy singleton). Scope buckets are reaped on workspace stop and stream-tail resets capture the activation key (a mid-flight rebind can no longer strand a bucket act…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a30d8c92a7"></a>
## [a30d8c92a7](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7) — fix(sse): per-workspace SSE 通道 CR 修复(P1×7+P2×7)与 git-diff flake

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-14T00:12:29+08:00；父提交 1；相对第一父文件数 12。
- 上游生产/配置文件：7；上游测试文件：3。
- 上游测试：`apps/web/test/warm-switch-instant.test.js`, `packages/app/test/stream-chunk-scope.test.js`, `packages/app/test/streaming-status-scope.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `packages/app/server/lib/git-diff.js` → `lib/git-diff.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 19 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `export function createChannelManager({`; `describe('warm switch is instant (runtime, per-workspace channels)', () => {`; `const BINARY_PROBE_BYTES = 8192;`; `export async function getUnpushedCommits(cwd, { maxCommits = 100 } = {}) {`; `export async function getGitDiffs(cwd, files, commitHash) {`; `export function filterClientsByInstance(clientList, instance) {`; `function postLiveProcessCloseHandler(req, res, parsedUrl, isLocal, deps) {`; `function workspacesStop(req, res, parsedUrl, isLocal, deps) {`; `function execWithStdin(cmd, args, input, options) {`; `const deps = {`; `function _emitTaskUpdate(scopeKey = BOUND_SCOPE) {`; `export function startStreamingStatusTimer() {`; `export function stopViewer() {`; `async function _doStop() {`; `const streamChunk = streamChunkRoute.handler;`; `function mkSseClient(viewProject) {`; `describe('streamChunk multi-project scoping', () => {`; `describe('server.js streaming_status 源码锚点', () => {`.
- Upstream commit message excerpt: 针对 5c28d4c5 的多角色 Code Review 修复,不含行为外的新特性。 P1(正确性/泄漏/竞态): - onTaskSessionBoundary 改走 120ms trailing debounce,_emitTaskUpdate 入口补 _isStopping 短路,停止窗口不再向垂死连接写帧、不再重复整快照帧。 - streaming tick 集合改为 activeStreamingScopes() ∪ _lastCliActiveByScope.keys(), 非 bound scope 的 falling edge 至少被观察一次,rising-edge 的 pending turn_end cancel 不再从第二轮起失效(打断场景误播语音的回归修复)。 - /api/live-processes/close 接线 clearScopeRuntimeFor(新增导出),按 producer 同源 scope 清理被杀 PTY 的 turn/streaming 桶与 _turnSessionIdByScope/ _lastCliActiveByScope 对应键,修复桶永久 active:true 导致的永久 spinner。 - sid 通道保留完整 project/instance:ensure/_newChannel 接受显式 scope,不再 用 key 反推丢信息(4 处读取点回归:overlay 不亮/重连弹出 attach/workflow 丢帧)。 - 非 rebound 的 workspace_started(跨标签 launch 新工作区)在 projectName 真变时 对称 _closeReboundChannels(旧名),非渲染通道不再画出已离场项目会话且永不自愈。 - _onChannelOpen 统一清零 reconnectsSinceCommit 并复位 journalDropped(覆盖 原生/manager 重连),tap 通道不再永久降级为 warm-stale 冷重建。 - history.md/changeset 通道上限文案 2→3,与 maxChannels:3 一致。 P2(一致性/测试): - sid 视图 URL 补 &instance=,服务端 view-scope key 与 p…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-df5c2fe807"></a>
## [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807) — Merge remote-tracking branch 'origin/main' into fix/sse-per-workspace-cr

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-14T00:14:24+08:00；父提交 2；相对第一父文件数 6。
- 上游生产/配置文件：2；上游测试文件：2。
- 上游测试：`apps/web/test/pinned-menu-prefs-migration.test.js`, `apps/web/test/pinned-menu.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/utils/pinnedMenu.js` → `src/utils/pinnedMenu.js`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `@`.
- Upstream commit message excerpt: # Conflicts: # history.md

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d01259c844"></a>
## [d01259c844](./cc-viewer-alignment-commit-ledger.md#commit-d01259c844) — Merge pull request #149 from weiesky/fix/sse-per-workspace-cr

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-14T00:20:15+08:00；父提交 2；相对第一父文件数 50。
- 上游生产/配置文件：24；上游测试文件：24。
- 上游测试：`apps/web/test/channel-isolation.test.js`, `apps/web/test/detach-view-reset.test.js`, `apps/web/test/live-processes-refresh.test.js`, `apps/web/test/resume-history-menu.test.js`, `apps/web/test/sid-not-found-live-empty.test.js`, `apps/web/test/sse-channels.test.js`, `apps/web/test/sse-connection-gen.test.js`, `apps/web/test/stream-switch-bleed.test.js`, `apps/web/test/turn-active-gating.test.js`, `apps/web/test/turn-end-scope-client.test.js`, `apps/web/test/view-cache-restore.test.js`, `apps/web/test/view-channel-state.test.js`, `apps/web/test/warm-switch-instant.test.js`, `packages/app/test/api-events-gap.test.js`, `packages/app/test/pty-session-resolve.test.js`, `packages/app/test/scope-router.test.js`, `packages/app/test/stream-chunk-scope.test.js`, `packages/app/test/streaming-scope-state.test.js`, `packages/app/test/streaming-status-scope.test.js`, `packages/app/test/task-state.test.js`, `packages/app/test/turn-end-scope-behavior.test.js`, `packages/app/test/turn-end-scope.test.js`, `packages/app/test/view-router.test.js`, `packages/app/test/view-routes-project-r4.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/cli.js` → `cli.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/git-diff.js` → `lib/git-diff.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(sse): per-workspace 独立 SSE 通道 + CR 修复(P1×7+P2×7)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-db2ada0866"></a>
## [db2ada0866](./cc-viewer-alignment-commit-ledger.md#commit-db2ada0866) — feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-14T11:21:29+08:00；父提交 1；相对第一父文件数 17。
- 上游生产/配置文件：6；上游测试文件：9。
- 上游测试：`apps/web/test/channel-isolation.test.js`, `apps/web/test/sid-not-found-live-empty.test.js`, `apps/web/test/turn-end-scope-client.test.js`, `apps/web/test/view-cache-restore.test.js`, `apps/web/test/view-switch-sse-scope.test.js`, `apps/web/test/warm-switch-instant.test.js`, `apps/web/test/ws-mux-channel.test.js`, `packages/app/test/ws-mux-equivalence.test.js`, `packages/app/test/ws-mux.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 15 distinct hunk context(s) extracted (up to 30): `import { createChannelManager, scopeKeyFor, scopeOfKey, BOUND_CHANNEL_KEY } from`; `class AppBase extends React.Component {`; `describe('channel isolation: background frames never touch the rendered view', (`; `describe('sid-not-found reason handling (runtime)', () => {`; `describe('turn_end scope gating (client)', () => {`; `describe('AppBase.jsx 源码锚点（防未来重构漂移）', () => {`; `describe('view-switch SSE scope (runtime)', () => {`; `describe('warm switch is instant (runtime, per-workspace channels)', () => {`; `function taskEventNotify(req, res, parsedUrl, isLocal, deps) {`; `export function sseUpdateBadgeFrame(pending) {`; `async function events(req, res, parsedUrl, isLocal, deps) {`; `import { expertRoutes } from './routes/expert.js';`; `let terminalWss = null; // WebSocketServer reference for broadcasting`; `async function setupTerminalWebSocket(httpServer) {`; `async function _doStop() {`.
- Upstream commit message excerpt: Move the per-scope live dialogue channel off "one resident SSE connection per scope" onto a single shared /ws/mux WebSocket, with each logical stream multiplexed by streamId over that socket. This lifts the browser HTTP/1.1 ~6-connections-per-origin ceiling that pinned SSE to maxChannels=3. Server: new lib/ws-mux.js (frame codec + createStreamMuxServer). Each logical stream masquerades as an SSE res inside the shared `clients` array (a real EventEmitter sink shim), so the broadcast hot path (log-watcher senders, _safeSseWrite, filterClientsByScope, direct writes) needs zero changes. The /events broadcast core is extracted into serveEventStream — the single implementation behind BOTH transports, so a mux stream and an SSE connection produce a byte-identical frame payload sequence (pinned by an equivalence test). The WS handshake enables perMessageDeflate (built into ws, no new dep) to close the compression gap vs SSE's per-connection brotli. Client: new utils/wsMuxTransport.js — an Even…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-e6baf89e6a"></a>
## [e6baf89e6a](./cc-viewer-alignment-commit-ledger.md#commit-e6baf89e6a) — Merge pull request #150 from weiesky/feat/ws-mux-dialogue-channel

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-14T13:36:20+08:00；父提交 2；相对第一父文件数 17。
- 上游生产/配置文件：6；上游测试文件：9。
- 上游测试：`apps/web/test/channel-isolation.test.js`, `apps/web/test/sid-not-found-live-empty.test.js`, `apps/web/test/turn-end-scope-client.test.js`, `apps/web/test/view-cache-restore.test.js`, `apps/web/test/view-switch-sse-scope.test.js`, `apps/web/test/warm-switch-instant.test.js`, `apps/web/test/ws-mux-channel.test.js`, `packages/app/test/ws-mux-equivalence.test.js`, `packages/app/test/ws-mux.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-8aefa1c29e"></a>
## [8aefa1c29e](./cc-viewer-alignment-commit-ledger.md#commit-8aefa1c29e) — chore(release): 1.9.5

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-14T13:39:26+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-f20efc1371"></a>
## [f20efc1371](./cc-viewer-alignment-commit-ledger.md#commit-f20efc1371) — fix: use temporary keychain password for macOS signing (#151)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-14T15:07:09+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`scripts/test/mac-keychain.test.mjs`。
- 本地候选（仅按路径/唯一文件名匹配）：`package.json` → `package.json`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `jobs:`; `overrides:`; `importers:`; `snapshots:`.
- Upstream commit message excerpt: Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-4991ba762d"></a>
## [4991ba762d](./cc-viewer-alignment-commit-ledger.md#commit-4991ba762d) — fix(sse): WS-mux cold-load queue overflow left dialogue blank after refresh

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-15T11:31:54+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：3；上游测试文件：1。
- 上游测试：`packages/app/test/ws-mux.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `export function createMuxTransport({`; `const MAX_STREAMS_PER_SOCKET = 8;`; `export function createStreamMuxServer({`; `describe('ws-mux backpressure', { concurrency: false }, () => {`.
- Upstream commit message excerpt: perMessageDeflate counted Node's zlib pending-queue bytes in ws.bufferedAmount before they reached TCP, so the backpressure gate saw a phantom backlog during cold-load bursts, marked the socket behind, and started queueing frames — including the 25s pings. The queue grew monotonically until the 8MB cap killed the connection (1011 queue-overflow), the channel watchdog fired, and every reconnect repeated the cycle, leaving the dialogue blank. - Disable perMessageDeflate on /ws/mux (SSE's per-write brotli path is unaffected; the byte win was not worth a self-inflicted wedged socket) - Raise the mux queue safety net 8MB -> 32MB (the cc-viewer project's own ~11MB v3 cold load already exceeded the old cap) - Add temporary [ws.mux.diag] probes in the web transport + _onChannelHeartbeatTimeout for field verification (grep ws.mux.diag; to be removed once the fix is confirmed on real hardware)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a84385b5a8"></a>
## [a84385b5a8](./cc-viewer-alignment-commit-ledger.md#commit-a84385b5a8) — feat(sdk): per-workspace close + stable instance identity for same-name disambiguation

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-15T13:12:09+08:00；父提交 1；相对第一父文件数 25。
- 上游生产/配置文件：11；上游测试文件：13。
- 上游测试：`apps/web/test/queue-bubbles.test.js`, `apps/web/test/resume-sessions-map.test.js`, `apps/web/test/sdk-workspace-anchors.test.js`, `packages/app/test/events-instance-live-empty.test.js`, `packages/app/test/events-samename-cwd.test.js`, `packages/app/test/live-processes-close.test.js`, `packages/app/test/resume-route.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-session-index.test.js`, `packages/app/test/sdk-session-registry.test.js`, `packages/app/test/view-root.test.js`, `packages/app/test/view-routes-project.test.js`, `packages/app/test/ws-instance-isolation.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `export function deriveProjectTabs(processes) {`; `describe('queue bubbles — state + WS wiring', () => {`; `describe('deriveProjectTabs', () => {`; `import { resolve as _pathResolve } from 'node:path';`; `function _active() { return _activeKey != null ? _sessions.get(_activeKey) : nul`; `function _sessionForAnchor(anchor) {`; `export function __getSessionKeyForTests(cwd) { return _normalizeCwd(cwd); }`; `export function listSdkSessions() {`; `function _createSession(key, cwd) {`; `export async function sendUserMessage(text, anchor) {`; `export function setActiveSdkSession(cwd) {`; `import { projectKeyForCwd } from './system-prompt-snapshots.js';`; `function isValidProjectName(name) {`; `export function resolveViewRoot({ projectParam, instanceParam, boundCwd, loadWor`; `export function viewRootOrReply(req, res, parsedUrl, { boundCwd, loadWorkspaces,`; `import { listLivePtys } from '../pty-manager.js';`; `export async function serveEventStream(sink, params, deps) {`; `import { detectHomebrewInstall } from '../lib/updater.js';`; `function _resolveStatsName(projectParam, res) {`; `function projectStats(req, res, parsedUrl) {`; `function getProxyStats(req, res, parsedUrl) {`; `import { reportSwallowed } from '@ccv/core/error-report';`; `async function getLiveProcessesHandler(req, res, parsedUrl) {`; `function postLiveProcessAttachHandler(req, res, parsedUrl, isLocal, deps) {`; `function postLiveProcessCloseHandler(req, res, parsedUrl, isLocal, deps) {`; `function _maybeRebindAfterClose(killResult, deps) {`; `function postResumeSessionHandler(req, res, parsedUrl, isLocal, deps) {`; `let terminalWss = null; // WebSocketServer reference for broadcasting`; `async function setupTerminalWebSocket(httpServer) {`.
- Upstream commit message excerpt: SDK multi-workspace had two linked defects: header tabs could not close an SDK workspace (rows were instanceKey:null, closable:false, and no per-session teardown existed), and the file browser frequently failed with "ambiguous project name" because view-root's instance arbitration only recognized PTY records. - Stable per-cwd instanceKey (ccv-<sha256 of normalized cwd>) for every SDK session; new L1 sdk-session-index exposes it to view routing without loading the Agent SDK in PTY mode. - closeSdkSession/attachSdkSession: exact instance targeting, name-only ambiguity refuses with 409 candidates; registry identity is removed before teardown so a close-triggered relaunch is never deleted; pending approvals are cancelled and dismissed (session-closed) and the active pointer re-anchors to a survivor. - live-processes: SDK rows carry instanceKey and are closable; bound currentInstanceKey derived; close shares rebound/scratch/scope cleanup; attach/resume-session honor instance anchors. - _ses…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-46d33276c9"></a>
## [46d33276c9](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9) — fix(sse): gate ws.mux.diag probes + pin perMessageDeflate:false (CR follow-up)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-15T13:47:57+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：3；上游测试文件：1。
- 上游测试：`packages/app/test/ws-mux.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`。
- B0 diff inspection: 7 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `export function createMuxTransport({`; `const MAX_STREAMS_PER_SOCKET = 8;`; `export function createStreamMuxServer({`; `import {`; `function makeServer(over = {}) {`; `describe('ws-mux backpressure', { concurrency: false }, () => {`.
- Upstream commit message excerpt: Five-reviewer CR on 4991ba76 found no P0; this adopts the P1/P2 items: - P1: gate every [ws.mux.diag] probe behind localStorage.ccv_ws_mux_diag==='1' (termDiag.js precedent). The per-frame socket.onmessage probe inlined its flag check so the object alloc + 60-char slice only happen with the gate open — thousands of console.log calls during the very cold-load burst under diagnosis were a self-inflicted slowdown, and terser does not drop console in the shipped bundle. - P2: pin perMessageDeflate:false with a regression test that captures the WSS constructor options (re-enabling deflate reintroduces the outage with every other test green), plus a guard that a legitimate ~11MB fast-consumer burst never queues/overflows. - P2: fix history.md contradiction (the original mux entry still claimed perMessageDeflate was ON under the same Unreleased heading). - P2: correct the postmortem comments — the cap raise 8->32MB is the load-bearing fix (measured: 32MB+deflate-on absorbs the burst at 10.6MB…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0a9ad5d767"></a>
## [0a9ad5d767](./cc-viewer-alignment-commit-ledger.md#commit-0a9ad5d767) — Merge pull request #152 from weiesky/feat/sdk-instance-close-ws-mux-overflow

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-15T13:56:04+08:00；父提交 2；相对第一父文件数 31。
- 上游生产/配置文件：14；上游测试文件：14。
- 上游测试：`apps/web/test/queue-bubbles.test.js`, `apps/web/test/resume-sessions-map.test.js`, `apps/web/test/sdk-workspace-anchors.test.js`, `packages/app/test/events-instance-live-empty.test.js`, `packages/app/test/events-samename-cwd.test.js`, `packages/app/test/live-processes-close.test.js`, `packages/app/test/resume-route.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-session-index.test.js`, `packages/app/test/sdk-session-registry.test.js`, `packages/app/test/view-root.test.js`, `packages/app/test/view-routes-project.test.js`, `packages/app/test/ws-instance-isolation.test.js`, `packages/app/test/ws-mux.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix(sdk,sse): per-workspace SDK close + instance identity; WS-mux queue overflow fix

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-983d08b571"></a>
## [983d08b571](./cc-viewer-alignment-commit-ledger.md#commit-983d08b571) — chore(release): 1.9.6

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-15T13:56:40+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7830664780"></a>
## [7830664780](./cc-viewer-alignment-commit-ledger.md#commit-7830664780) — fix(web): 文件树行高不再被压缩抖动

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-15T15:47:29+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: .treeContainer 是 column flexbox，.treeItem 未声明 flex-shrink（默认 1）， 行数超出视口后被 flex 算法等比压到 26px 以下，行高/行距随展开抖动。 补 flex-shrink: 0 钉住行高，溢出交给 overflow:auto 滚动。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ec440163c0"></a>
## [ec440163c0](./cc-viewer-alignment-commit-ledger.md#commit-ec440163c0) — Merge pull request #153 from weiesky/fix/file-tree-row-shrink

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-15T15:53:49+08:00；父提交 2；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix(web): 文件树行高不再被压缩抖动

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d906edb3de"></a>
## [d906edb3de](./cc-viewer-alignment-commit-ledger.md#commit-d906edb3de) — feat(web): skill scope rows + frosted glass bars

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-16T23:50:11+08:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：8；上游测试文件：2。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/skill-display-name.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/RoleFilterBar.module.css` → `src/components/chat/RoleFilterBar.module.css`; `apps/web/src/components/dashboard/CachePopoverContent.jsx` → `src/components/dashboard/CachePopoverContent.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.module.css` → `src/components/dashboard/CachePopoverContent.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/skillsParser.js` → `src/utils/skillsParser.js`。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `import { contextSeverityColor } from '../../utils/formatters';`; `export default function CachePopoverContent({`; `const i18nData = {`; `export function sortSkillsDefault(skills) {`; `export function mergeActiveSkills(fsSkills, historicalSkills) {`; `const KEYS = [`; `import assert from 'node:assert/strict';`; `describe('mergeActiveSkills', () => {`.
- Upstream commit message excerpt: - Active Skills popover split into Global / Project / Plugin scoped rows - RoleFilterBar + TaskProgressHud frosted glass (--bg-glass + backdrop blur) - RoleFilterBar floats above message list with 41px padding compensation - Role chip solid --bg-surface background

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b500ebf76c"></a>
## [b500ebf76c](./cc-viewer-alignment-commit-ledger.md#commit-b500ebf76c) — chore(release): 1.9.7

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-17T00:43:41+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-06e1db54c7"></a>
## [06e1db54c7](./cc-viewer-alignment-commit-ledger.md#commit-06e1db54c7) — Merge pull request #154 from weiesky/fix/file-tree-row-shrink

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-17T00:44:46+08:00；父提交 2；相对第一父文件数 13。
- 上游生产/配置文件：9；上游测试文件：2。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/skill-display-name.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/RoleFilterBar.module.css` → `src/components/chat/RoleFilterBar.module.css`; `apps/web/src/components/dashboard/CachePopoverContent.jsx` → `src/components/dashboard/CachePopoverContent.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.module.css` → `src/components/dashboard/CachePopoverContent.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/skillsParser.js` → `src/utils/skillsParser.js`; `packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(web): skill scope rows + frosted glass bars (1.9.7)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-51dec0fbe1"></a>
## [51dec0fbe1](./cc-viewer-alignment-commit-ledger.md#commit-51dec0fbe1) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-19T08:50:05+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2847027b54"></a>
## [2847027b54](./cc-viewer-alignment-commit-ledger.md#commit-2847027b54) — fix(server): 权限自动审批覆盖目录外 Read/Glob/Grep

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T01:29:53+08:00；父提交 1；相对第一父文件数 14。
- 上游生产/配置文件：7；上游测试文件：5。
- 上游测试：`packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/ensure-hooks.test.js`, `packages/app/test/perm-bridge.test.js`, `packages/app/test/perm-request-bridge.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/ensure-hooks.js` → `lib/ensure-hooks.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`。
- B0 diff inspection: 17 distinct hunk context(s) extracted (up to 30): `export function isPublishCommand(toolName, input) {`; `import https from 'node:https';`; `if (toolName === 'AskUserQuestion') {`; `function _looksStaleManagedCommand(cmd) {`; `export function ensureHooks() {`; `import { evaluateImDeny } from './im-deny.js';`; `import { reportSwallowed } from '@ccv/core/error-report';`; `import { registerSdkSessionLister } from './sdk-session-index.js';`; `function _createSession(key, cwd) {`; `import { _projectName } from '../interceptor.js';`; `function permHook(req, res, parsedUrl, isLocal, deps) {`; `export const askPermRoutes = [`; `const permHookHandler = askPermRoutes.find(r => r.path === '/api/perm-hook').han`; `describe('ask-perm 分支补洞: permHook plugin allow + res.writeHead 抛 (337`; `describe('lib/ensure-hooks.js — timeout field v3 migration (canonical import)'`; `describe('perm-bridge.js', () => {`; `describe('sdk-manager-query — canUseTool: AskUserQuestion / ExitPlanMode / 权`.
- Upstream commit message excerpt: - 新增 PermissionRequest hook (perm-request-bridge.js) 处理越过启动目录的读取/glob/grep 权限提示 - perm-bridge 对目录内 Read/Glob/Grep 直接放行，目录外 fallthrough 到 PermissionRequest - perm-request-bridge 查询当前项目 autoApproveSeconds，开启时静默 allow + addDirectories 会话级目录信任 - SDK 模式对齐：目录外 Read/Glob/Grep 在自动审批开启时返回 allow + addDirectories - 新增共享 isOverTrustDir 守卫（approval-policy.js），防止授予 /、home、顶层目录、dot 目录 - ensure-hooks 注册 PermissionRequest hook（matcher: Read|Glob|Grep，find-by-command 不覆盖用户 hook） - 修复 permHook >1MB body 崩溃（既存问题） - 新增 perm-request-bridge.test.js、branch-routes-ask-perm.test.js（permRequestHook）、ensure-hooks.test.js（PermissionRequest 注册/幂等/用户 hook 保留/卸载） Coverage: perm-bridge.test.js, perm-request-bridge.test.js, branch-routes-ask-perm.test.js, ensure-hooks.test.js, sdk-manager-query.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5d42d90533"></a>
## [5d42d90533](./cc-viewer-alignment-commit-ledger.md#commit-5d42d90533) — chore(release): 1.9.8

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T01:32:20+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3d4f098f08"></a>
## [3d4f098f08](./cc-viewer-alignment-commit-ledger.md#commit-3d4f098f08) — fix(web): stop askUserQuestion 'Other' input from triggering browser password save (#155)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T11:43:49+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/AskQuestionForm.jsx` → `src/components/chat/AskQuestionForm.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `export default class AskQuestionForm extends React.Component {`.
- Upstream commit message excerpt: The 'Other' free-text input in AskQuestionForm rendered as a bare antd <Input> with no autocomplete hints and autoFocus. Because the app also ships real password fields (ProxyModal apiKey, ImPlatformSettings token), Chrome/Safari heuristically treats this origin as a login-bearing site and attaches password autofill/save prompts to any prominent text input. Add the standard opt-out markers so password managers skip the field: autoComplete=off, data-1p-ignore (1Password), data-lpignore (LastPass), data-form-type=other (Dashlane). Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-67ceb5b7f0"></a>
## [67ceb5b7f0](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) — feat(web): "/" 弹出斜杠技能菜单

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T17:56:26+08:00；父提交 1；相对第一父文件数 16。
- 上游生产/配置文件：11；上游测试文件：4。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/project-key-from-cwd.test.js`, `apps/web/test/slash-command-menu.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 17 distinct hunk context(s) extracted (up to 30): `import { createMuxTransport } from './utils/wsMuxTransport';`; `class AppBase extends React.Component {`; `import ResumeSessionsRow from '../common/ResumeSessionsRow';`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import { apiUrl, withViewParams } from '../../utils/apiUrl';`; `class ChatView extends React.Component {`; `const i18nData = {`; `const KEYS = [`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `function _createSession(key, cwd) {`; `export function getSdkInitSnapshot(anchor) {`; `async function setupTerminalWebSocket(httpServer) {`; `export function setSdkGetInitSnapshot(fn) { _sdkGetInitSnapshot = fn; }`; `function makeDeps(extra = {}) {`; `function makeResidentQuery({ respond, initMsgs, autoRelease = 0, getContextUsage`; `describe('sdk-manager-query — getPendingApprovals / onQueryError / init-compac`.
- Upstream commit message excerpt: - 输入 / 弹出分组技能菜单（个人/内置），点选填入 /name 待补参数 - 数据源：SDK supportedCommands() 按 init.skills 白名单收敛为纯 skill（过滤 TUI 内置命令）， 广播 sdk-skills（随重连回放）；空命令面/PTY/初始化前/失败回退 /api/skills - 服务端 sdk-manager 按 query 代际拉取；server.js attach 切视图后按新 stamp 重发该视图 sdk-skills - 修复 WS 回放/广播用 projectKeyForCwd 消毒 cwd（原裸 basename 会丢空格/CJK 工作区帧）； 前端抽 utils/projectKeyFromCwd 统一消毒，修 AppBase session-state 误判 - 修复刷新/视图恢复的延迟初始化误清技能面的 reset 竞态；/api/skills 失败 5s 冷却后可重试 - 移动端菜单字号做 0.6 zoom 补偿 - 新增 slashCommandMenu.js 纯函数 + SlashCommandMenu 组件 + i18n keys（×18 locales） Coverage: slash-command-menu.test.js, sdk-manager-query.test.js, new-ui-i18n.test.js, project-key-from-cwd.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-51c23e9090"></a>
## [51c23e9090](./cc-viewer-alignment-commit-ledger.md#commit-51c23e9090) — fix(web): 修复 SDK 模式 plan 审批卡死

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T17:57:20+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：3；上游测试文件：2。
- 上游测试：`apps/web/test/resume-history-menu.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`。
- B0 diff inspection: 6 distinct hunk context(s) extracted (up to 30): `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `class ChatView extends React.Component {`; `import { PERM_AUTO_APPROVE_OPTIONS, PLAN_AUTO_APPROVE_OPTIONS, autoApproveValueL`; `function QuickAutoApproveRows({ autoApproveSeconds, planAutoApproveSeconds, onAu`; `describe('star-menu migration — the history row lives after perm and plan', ()`.
- Upstream commit message excerpt: SDK 模式 cliMode 同为 true，PTY 计划审批卡片/全局弹窗被一并激活，其「批准」 发送的 PTY 击键被服务端 SDK 通道丢弃（server.js 丢 input），SDK canUseTool 承诺永不 resolve，会话空等至 5 分钟超时。现将 PTY plan 卡片、全局弹窗与 「Plan 自动审批」全部按 !sdkMode 门控，并在两个 PTY 击键 sink （handlePromptOptionClick / handlePlanFeedbackSubmit）与 LR ownership 的 cliMode 入口加 sdkMode 防御；SDK 模式只留底部 sdk-plan-* 审批面板。 QuickAutoApproveRows 新增 hidePlan：SDK 模式隐藏不生效的 Plan 自动审批行 （middle 改为跟随最后一行）。Coverage: sdk-plan-approval-guard.test.js, resume-history-menu.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a2be00c45b"></a>
## [a2be00c45b](./cc-viewer-alignment-commit-ledger.md#commit-a2be00c45b) — feat(web): 桌面文件上传收纳进 (+) 菜单

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T17:57:20+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：3；上游测试文件：1。
- 上游测试：`apps/web/test/upload-plus-menu.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`.
- Upstream commit message excerpt: 聊天输入栏独立的桌面上传圆钮移除，「上传文件」改为 (+) 菜单顶部菜单项 （quickMenuRow 级联行样式），与移动端行为对齐；粘贴/拖拽上传链路不变。 sharedChrome 补 button.quickMenuRow:hover 使顶层行有 hover 反馈。 history.md 补 Unreleased 条目。Coverage: upload-plus-menu.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9dbf4e295a"></a>
## [9dbf4e295a](./cc-viewer-alignment-commit-ledger.md#commit-9dbf4e295a) — fix(web): SDK 模式打开终端不再隐藏对话输入框

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T18:09:34+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`.
- Upstream commit message excerpt: ChatInputBar 在 terminalVisible 时早退隐藏输入框以让位终端，但 SDK 模式下 terminalVisible 是 scratchOpen（伴随 scratch 终端开关），导致开终端即隐藏对话 输入框。现仅 PTY 模式（terminalVisible = 主 PTY 面板）在终端打开时让位；SDK 模式对话输入框始终可见。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3cf3e9585f"></a>
## [3cf3e9585f](./cc-viewer-alignment-commit-ledger.md#commit-3cf3e9585f) — fix(web): (+) 菜单顶层「上传文件」行 hover 时收起残留的级联子菜单

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T18:48:08+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/upload-plus-menu.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `describe('upload entry folded into the ChatInputBar (+) menu', () => {`.
- Upstream commit message excerpt: 上传行是桌面 (+) 菜单唯一顶层 quickMenuRow，原未接 hover：从「历史会话」等组经 hover 桥斜向移入时不触发任何 enter/leave，展开态残留致子菜单不收。现进入该行即 qmHover.cancel() + 清 quickExpanded。顺带放宽 upload-plus-menu 一条因多行 JSX 失效 的正则断言。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3c77d9a8ed"></a>
## [3c77d9a8ed](./cc-viewer-alignment-commit-ledger.md#commit-3c77d9a8ed) — Merge pull request #156 from weiesky/feat/slash-skill-menu-sdk-fixes

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T18:50:40+08:00；父提交 2；相对第一父文件数 23。
- 上游生产/配置文件：14；上游测试文件：7。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/project-key-from-cwd.test.js`, `apps/web/test/resume-history-menu.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`, `apps/web/test/slash-command-menu.test.js`, `apps/web/test/upload-plus-menu.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(web): "/" 技能菜单 + SDK 模式多项修复

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-baf4500607"></a>
## [baf4500607](./cc-viewer-alignment-commit-ledger.md#commit-baf4500607) — chore(release): 1.9.9

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-21T18:51:17+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-45bfa4124d"></a>
## [45bfa4124d](./cc-viewer-alignment-commit-ledger.md#commit-45bfa4124d) — fix(server): gate [ccv:*] diagnostic logs on CCV_DEBUG

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-22T10:43:06+08:00；父提交 1；相对第一父文件数 43。
- 上游生产/配置文件：40；上游测试文件：1。
- 上游测试：`packages/app/test/server-error-report.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/stats-worker.js` → `lib/stats-worker.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`。
- B0 diff inspection: 29 distinct hunk context(s) extracted (up to 30): `import { V2Writer } from './lib/v2/v2-writer.js';`; `import { renameSyncWithRetry } from './file-api.js';`; `import { existsSync, readFileSync } from 'node:fs';`; `import { join } from 'node:path';`; `import { withFileLockAsync, hasLiveDiskHolder } from './async-file-lock.js';`; `import { LOG_DIR } from '../../findcc.js';`; `import { sseWrite } from './wire-compress.js';`; `import { readFileSync, existsSync } from 'node:fs';`; `import { AsyncWriteQueue } from '../async-write-queue.js';`; `import { isDiscardableSession } from './v2/session-select.js';`; `import { isNonEmptyFile } from './file-api.js';`; `import { randomBytes } from 'node:crypto';`; `import { join, dirname, basename } from 'node:path';`; `import { isLogFileName, parseLogTs } from '../log-file-utils.js';`; `import { existsSync, openSync, readSync, closeSync, statSync } from 'node:fs';`; `import { SingleFlight } from './singleflight.js';`; `import { LIVE_SESSION_MTIME_MS } from '../log-file-utils.js';`; `import { isSupportedWireFormat, dirSizeSync } from './layout.js';`; `import { isPidAlive } from '../pid-alive.js';`; `import zlib from 'node:zlib';`; `import { EventEmitter } from 'node:events';`; `import { buildRecord, appendRecord, dailyFilePath, todayStr, emitProxyStatsUpdat`; `export { withDefaultThinkingDisplay } from './lib/launch-config.js';`; `import { getCurrentProjectKey, hasFork, resolveScoped } from '../lib/project-pre`; `import { migrationStatus } from '../lib/v2/migrate-prompt.js';`; `import {`; `import { listLivePtys } from '../pty-manager.js';`; `import { discoverCcSwitchProviders, mergeImportedProfiles } from '../lib/ccswitc`; `import { sseWrite } from '../lib/wire-compress.js';`.
- Upstream commit message excerpt: Server-side reportSwallowed calls now route through a new wrapper at packages/app/server/lib/error-report.js which is a no-op unless CCV_DEBUG is set. Recoverable noise (down/flaky upstream, contended locks, losing races) no longer spams the terminal; the underlying failure is still surfaced where it matters (pseudo-response statusText, SSE error frames, UI fallbacks). Set CCV_DEBUG=1 to restore the previous behavior — core's per-tag cap still applies. Web frontend and @ccv/core/error-report itself are untouched; tests continue to import core directly to pin its dedup/suppression behavior.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9b1bb4e729"></a>
## [9b1bb4e729](./cc-viewer-alignment-commit-ledger.md#commit-9b1bb4e729) — fix(sdk): render turn/query failures as persistent rows in the dialogue tail

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-22T10:47:12+08:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：6；上游测试文件：5。
- 上游测试：`apps/web/test/sdk-error-dialogue.test.js`, `packages/app/test/cli-sdk-error-frame.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-session-registry.test.js`, `packages/app/test/ws-instance-isolation.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 15 distinct hunk context(s) extracted (up to 30): `class Mobile extends AppBase {`; `import { getModelInfo, getEffectiveModel, resolveProducerModelInfo, AUTO_APPROVE`; `class ChatView extends React.Component {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `import { APPROVAL_TOOLS, isOverTrustDir, isPublishCommand } from './approval-pol`; `let _onTurnEnd = null; // SDK mode has no Stop hook (ensureHooks() skipped) —`; `function _createSession(key, cwd) {`; `export function isSdkAvailable() {`; `export async function sendUserMessage(text, anchor) {`; `import * as chatQueue from './lib/chat-queue.js';`; `export function broadcastWsMessage(msg) {  if (terminalWss) {`; `describe('sdk-manager-query — interruptTurn 真中断 + 排空 pending 审批'`; `describe('sdk-manager-query — getPendingApprovals / onQueryError / init-compac`; `describe('sdk-manager per-cwd session registry', () => {`; `describe('broadcastWsMessage instance narrowing', () => {`.
- Upstream commit message excerpt: SDK errors (turn result errors, query death/build failure) previously only surfaced as a transient toast — the dialogue looked hung. Now a persistent error row renders at the dialogue tail: identical errors merge with a count (\xd7N, capped at 3 rows, timestamped), cleared on send/workspace-switch/view-switch/session-switch; toasts stay scoped to the same workspace/instance. Query-level error frames gain cwd/sessionId/instanceKey routing metadata and route-failure frames gain the project key, fixing multi-workspace error cross-talk.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a336d3919f"></a>
## [a336d3919f](./cc-viewer-alignment-commit-ledger.md#commit-a336d3919f) — feat(web): fold terminal toolbar upload into the sparkle quick-settings menu

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-22T11:11:32+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/upload-terminal-plus-menu.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `class TerminalPanel extends React.Component {`.
- Upstream commit message excerpt: The terminal's bottom toolbar had a standalone upload round button alongside UltraPlan and clear-context. Fold it into the sparkle quick-settings Popover as a top-level quickMenuRow, mirroring the ChatInputBar (+) menu pattern from a2be00c4 / 3cf3e958. The row closes the Popover before triggering the persistent hidden file input, and its onMouseEnter cancels hover-intent plus collapses any expanded cascade so diagonal travel from 历史会话/AgentTeam doesn't leave a stale submenu. The upload chain (hidden input at line 1851, handleFileUpload, onFilePath, image-upload-notify WS frame) is untouched.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9967ebdbc2"></a>
## [9967ebdbc2](./cc-viewer-alignment-commit-ledger.md#commit-9967ebdbc2) — feat(web): rename AgentTeam menu label to localized quick-prompt wording

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-22T11:18:40+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `const i18nData = {`.
- Upstream commit message excerpt: The cascade row in both the terminal sparkle quick-settings menu and the ChatInputBar (+) menu shared the literal "AgentTeam" label across all 18 locales. Rename it per-locale with quick-prompt semantics (not literal transliteration): zh/zh-TW 快捷指令, en Quick Prompts, ja クイックプロンプト, ko 빠른 프롬프트, de Schnellprompts, es/fr/pt-BR Prompts rápidos, it Prompt rapidi, da Hurtige prompts, pl Szybkie prompty, ru Быстрые промпты, ar مطالبات سريعة, no Raske prompts, th พรอมป์ด่วน, tr Hızlı istemler, uk Швидкі промпти. Both menu hosts consume the same ui.terminal.agentTeam key, so the rename lands in both places with one edit. The separate ui.terminal.agentTeamCustom key (PresetModal section header) is left unchanged.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-58493d1c85"></a>
## [58493d1c85](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85) — feat(plugins): directory service plugins with same-port proxy + remote React panels

- B0 snapshot comparison: 15 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-22T22:11:06+08:00；父提交 1；相对第一父文件数 67。
- 上游生产/配置文件：34；上游测试文件：23。
- 上游测试：`apps/web/test/modal-mask.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/panel-loader.test.js`, `apps/web/test/plugin-panel-host.test.js`, `apps/web/test/plugin-panels-util.test.js`, `packages/app/test/api-files-fs-2.test.js`, `packages/app/test/api-files-fs.test.js`, `packages/app/test/api-local-url-guard.test.js`, `packages/app/test/api-plugins-gap.test.js`, `packages/app/test/branch-routes-files-fs.test.js`, `packages/app/test/branch-routes-plugins.test.js`, `packages/app/test/files-fs-deep.test.js`, `packages/app/test/plugin-host.test.js`, `packages/app/test/plugin-loader-service.test.js`, `packages/app/test/plugin-manager-dir.test.js`, `packages/app/test/plugin-panels.test.js`, `packages/app/test/plugin-proxy.test.js`, `packages/app/test/plugin-runtime.test.js`, `packages/app/test/plugin-service-integration.test.js`, `packages/app/test/plugin-service-manager.test.js`, `packages/app/test/plugin-spawn-test-guard.test.js`, `packages/app/test/same-origin.test.js`, `packages/app/test/server-malformed-host.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.module.css` → `src/App.module.css`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/mobile/MobileDrawerCloseButton.jsx` → `src/components/mobile/MobileDrawerCloseButton.jsx`; `apps/web/src/components/settings/PluginModal.jsx` → `src/components/settings/PluginModal.jsx`; `apps/web/src/components/settings/PluginModal.module.css` → `src/components/settings/PluginModal.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/vite.config.js` → `vite.config.js`; `packages/app/server/lib/plugin-loader.js` → `lib/plugin-loader.js`; `packages/app/server/lib/plugin-manager.js` → `lib/plugin-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `cc-viewer works in a single container or on a cloud host where you reach the UI`; `import { reinitializeMermaid } from './hooks/useMermaidRender';`; `import PluginModal from './components/settings/PluginModal';`; `class Mobile extends AppBase {`; `import PluginModal from '../settings/PluginModal';`; `class AppHeader extends React.Component {`; `import appStyles from '../../App.module.css';`; `export default function MobileDrawerCloseButton({ onClose }) {`; `import { apiUrl } from '../../utils/apiUrl';`; `export default function PluginModal({ open, onClose }) {`; `const i18nData = {`; `const EXPECTED_CONSUMERS = [`; `const KEYS = [`; `export default defineConfig(() => {`; `CC-Viewer provides a lightweight plugin mechanism that allows injecting custom l`; `export default {`; `CC-Viewer 提供了一套轻量级插件机制，允许在特定生命周期节`; `to ship plugins with the package without requiring users to populate their perso`; `import { pathToFileURL } from 'node:url';`; `import { PLUGINS_DIR } from '../_paths.js';`; `let _plugins = [];`; `export async function loadPlugins() {`; `export async function runParallelHook(name, context = {}) {`; `export function getPluginsInfo() {`; `import { tmpdir } from 'node:os';`; `export async function installPluginFromUrl(pluginsDir, fileUrl, extractNameScrip`; `export function isSameOriginBrowserRequest(req, parsedUrl) {`; `function importFile(req, res, parsedUrl, isLocal, deps) {`; `import { normalizeBasePath } from '../lib/base-path.js';`; `async function localUrl(req, res, parsedUrl, isLocal, deps) {`.
- Upstream commit message excerpt: Add directory-form plugins that run as an isolated child-process service, mounted on the host port under /plugins/<name>/*, plus remote React panels hot-mounted without an iframe. Includes hot reload, crash backoff/restart, orphan/lock cleanup, and a management API (reload/restart/delete-dir). Security hardening from a multi-round review: - WS upgrade now enforces a same-origin check (terminal/mux/plugin WS); scheme-aware via Host + X-Forwarded-Proto so TLS-terminating proxies work. - Plugin write endpoints and the /plugins/* proxy require admin + same-origin. - /api/local-url now requires admin + same-origin (no token leak to pages). - Child services no longer receive the parent ACCESS_TOKEN (parentToken dropped); child env is an allowlist (no ANTHROPIC_*/cloud credentials inherited). - Crash path rewrites: abort controller, deactivate, per-generation config/lock cleanup, epoch guards held across awaits (no orphan/double-deliver races). - stopServiceProcess verifies lock pid/nonce bef…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-e8ea1ae96a"></a>
## [e8ea1ae96a](./cc-viewer-alignment-commit-ledger.md#commit-e8ea1ae96a) — docs(history): classify backlogged Unreleased entries into 1.9.4~1.9.9 sections

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-22T22:22:29+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c6f887c385"></a>
## [c6f887c385](./cc-viewer-alignment-commit-ledger.md#commit-c6f887c385) — chore(release): 1.9.10

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-22T22:22:29+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c66b5fe2ed"></a>
## [c66b5fe2ed](./cc-viewer-alignment-commit-ledger.md#commit-c66b5fe2ed) — feat(web): move proxy hot-switch chip into the chat input bar (#158)

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-23T01:32:00+08:00；父提交 1；相对第一父文件数 17。
- 上游生产/配置文件：13；上游测试文件：2。
- 上游测试：`apps/web/test/proxy-chip-label.test.js`, `apps/web/test/sdk-model-wiring.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/App.module.css` → `src/App.module.css`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `apps/web/src/components/settings/ProxyModal.jsx` → `src/components/settings/ProxyModal.jsx`。
- B0 diff inspection: 21 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import ChatInputBar, { resizeChatTextarea } from './ChatInputBar';`; `class ChatView extends React.Component {`; `import { reportSwallowed } from '../../utils/errorReport';`; `import ProxyModal, { profileDisplayModel } from '../settings/ProxyModal';`; `class AppHeader extends React.Component {`; `import React, { useState, useEffect } from 'react';`; `import { t } from '../../i18n';`; `export default function ProxyModal({`; `const __dirname = dirname(fileURLToPath(import.meta.url));`; `const jsx = readFileSync(JSX_PATH, 'utf-8');`; `const chipBlock = jsx.match(/_renderProxyChip\(\)\s*\{[\s\S]*?<Tag className=\{s`; `describe('proxy hot-switch chip — compact header label', () => {`; `const chatView = src('components', 'chat', 'ChatView.jsx');`; `const appJsx = src('App.jsx');`; `const appHeader = src('components', 'dashboard', 'AppHeader.jsx');`; `describe('sdkModel chip — lift wiring', () => {`.
- Upstream commit message excerpt: Move the proxy hot-switch chip (and its SDK launch-model fallback) out of the PC header into the chat input bar, right of the Enter hint and next to the send button. While the PTY terminal is open the input bar is unmounted, so the chip returns to its old header slot as a fallback to keep the entry visible. iPad gains the chip in pad view; pure-mobile layout is unchanged and keeps the hamburger-menu entry. Electron native-tab mode does not show the chip. - New presentational ProxyChip component (click delegated to ChatView's ProxyModal) - ChatInputBar proxyChip slot between hint and send button; shrinkable + hard cap - ChatView gating: (sdkMode || !terminalVisible) && !(isMobile && !isPad) && !isElectronTab - AppHeader keeps the chip only as a PTY-terminal-open fallback - ProxyModal mobile drawer: portal to body on iPad only (phones keep the visualViewport lock), closed drawer leaves the tab order (inert/aria-hidden) - Tests: proxy-chip-label, sdk-model-wiring, sdk-model-chip Co-author…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3bd2aa9696"></a>
## [3bd2aa9696](./cc-viewer-alignment-commit-ledger.md#commit-3bd2aa9696) — fix(ci): bump-homebrew tarball 下载加重试 (#159)

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-23T02:56:44+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/web/test/chat-ghost-clamp.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `jobs:`; `const FOCUS_LINES = 2;`; `export function resizeChatTextarea(ta, { focused = false } = {}) {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`.
- Upstream commit message excerpt: * fix(ci): retry homebrew tarball download in bump-homebrew The packument (metadata) endpoint becomes visible before the tarball CDN object. The wait step polls metadata only, so it could succeed while the tarball still 404'd — v1.9.10 failed exactly this way (curl exit 22 with no retry). Retry the download every 30s, up to 40 attempts (20min), matching the metadata wait window. Recoverable via `gh workflow run bump-homebrew.yml -f version=<VER>`. * fix(web): clamp suggestion ghost to two lines with two-line input floor Long [SUGGESTION MODE] ghost text painted over the composer toolbar (mic, usage chip, Tab hint, send): the absolute overlay allowed 120px against a 37/58px textarea with no ancestor clipping. Now .ghostText is clamped to two lines via -webkit-line-clamp (ellipsis drawn by the clamp algorithm), and a useLayoutEffect + ResizeObserver raises the composer to a two-line floor (58px desktop/pad, 92px phone) whenever the clamped ghost exceeds one line. .textareaWithGhost gains…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5d39fa11f3"></a>
## [5d39fa11f3](./cc-viewer-alignment-commit-ledger.md#commit-5d39fa11f3) — chore(release): 1.9.11

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-23T03:01:00+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-117ee25de2"></a>
## [117ee25de2](./cc-viewer-alignment-commit-ledger.md#commit-117ee25de2) — fix(web): leave a scrollbar bleed on the input stack gradient (#160)

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-23T11:30:41+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：3；上游测试文件：1。
- 上游测试：`apps/web/test/floating-input-stack.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `describe('floating inputStack layout regression', () => {`.
- Upstream commit message excerpt: The floating input stack's bottom-to-top gradient painted the full chat column width and covered the message list's right-side vertical scrollbar. Measure the live scroller's classic-scrollbar gutter via ResizeObserver into --chat-scrollbar-width and stop the gradient at it with background-size; on overlay-scrollbar platforms (macOS default, mobile) the gutter measures 0, so probe a temporary overflow:scroll element and fall back to a fixed 12px bleed to keep the floating scrollbar visible. The composer card keeps its interactions via a specificity-raised pointer-events:none on the transparent .chatInputBar padding, re-enabled on .chatInputWrapper, so the revealed scrollbar strip stays draggable. Coverage: floating-input-stack.test.js Co-authored-by: weiesky.wangc <weiesky.wangc@antgroup.com>

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-abdca8545c"></a>
## [abdca8545c](./cc-viewer-alignment-commit-ledger.md#commit-abdca8545c) — chore(release): 1.9.12

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-23T11:34:46+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: Consume the input-stack scrollbar-bleed patch changeset (1.9.11 → 1.9.12, third-component patch bump only) and classify the backlogged Unreleased history.md entries into their released 1.9.10 / 1.9.11 / 1.9.12 sections.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-177b85df2c"></a>
## [177b85df2c](./cc-viewer-alignment-commit-ledger.md#commit-177b85df2c) — feat(server+web): add scheduled tasks ("设置定时任务")

- B0 snapshot comparison: 11 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-23T17:39:51+08:00；父提交 1；相对第一父文件数 57。
- 上游生产/配置文件：22；上游测试文件：14。
- 上游测试：`apps/web/test/schedule-description.test.js`, `apps/web/test/schedule-i18n.test.js`, `apps/web/test/schedule-modal-anchor.test.js`, `apps/web/test/scratch-workspace-switch.test.js`, `apps/web/test/sse-connection-gen.test.js`, `apps/web/test/upload-plus-menu.test.js`, `packages/app/test/chat-queue.test.js`, `packages/app/test/cron.test.js`, `packages/app/test/schedule-model.test.js`, `packages/app/test/scheduled-task-executor.test.js`, `packages/app/test/scheduled-task-routes.test.js`, `packages/app/test/scheduled-task-scheduler.test.js`, `packages/app/test/scheduled-task-store.test.js`, `packages/app/test/sdk-manager-ephemeral.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/package.json` → `package.json`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/common/quickMenuIcons.jsx` → `src/components/common/quickMenuIcons.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `Once configured, just use the 'claude' command as usual. Visit 'http://localhost`; `import { publish as publishWorkflowUpdate } from './utils/workflowStore';`; `const CHANNEL_FRAME_HANDLERS = {`; `class AppBase extends React.Component {`; `import chrome from '../common/sharedChrome.module.css';`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import PresetModal from '../terminal/PresetModal';`; `class ChatView extends React.Component {`; `export function AgentTeamIcon() {`; `import UltraplanPanel, { readUltraplanPopoverSize, ultraplanOverlayInnerStyle }`; `import ResumeSessionsRow from '../common/ResumeSessionsRow';`; `class TerminalPanel extends React.Component {`; `const i18nData = {`; `describe('scratch workspace switch: TerminalPanel wiring', () => {`; `describe('AppBase.jsx 源码锚点（防未来重构漂移）', () => {`; `describe('upload entry folded into the ChatInputBar (+) menu', () => {`; `ccv -h`; `Efter konfiguration bruger du 'claude'-kommandoen som normalt. Besøg 'http://lo`; `Nach der Konfiguration verwenden Sie den Befehl 'claude' wie gewohnt. Besuchen S`; `Una vez configurado, use el comando 'claude' normalmente. Visite 'http://localho`; `Une fois configuré, utilisez la commande 'claude' normalement. Visitez 'http://`; `Una volta configurato, usa il comando 'claude' normalmente. Visita 'http://local`; `Etter konfigurasjon bruker du 'claude'-kommandoen som normalt. Besøk 'http://lo`; `Po konfiguracji używaj komendy 'claude' jak zwykle. Odwiedź 'http://localhost:`; `Uma vez configurado, use o comando 'claude' normalmente. Visite 'http://localhos`; `Yapılandırma tamamlandıktan sonra 'claude' komutunu normal şekilde kullanın`; `function _injectHead() {`; `import { resolve as _pathResolve, dirname as _pathDirname, sep as _pathSep } fro`; `export function __setQueryForTests(fn) { _query = fn; }`.
- Upstream commit message excerpt: Add a scheduled-task manager to the (+) menu (chat input bar + terminal toolbar): run a prompt on a preset (hourly/daily/weekdays/weekly), a custom 5-field cron, or a one-off time. Each task either injects the prompt into the current live session or spawns a fresh isolated headless SDK session (SDK mode only, with ask-for-approval permissions by default). Server: cron engine (DST-safe), per-project task registry persisted to scheduled-tasks.json (0600), a 10s-tick scheduler that claims each fire under a cross-process file lock (Electron tabs / IM workers excluded), catch-up of the most recent missed run within 7 days, Run now / pause / resume / delete, and a 20-entry run history (spawn runs link to their session). Fires are silent; completions/failures toast over SSE. Web: ScheduleTaskModal (list + form + history), 100 ui.schedule.* keys across 18 locales, project-scoped SSE guard + runId-dedup toasts. Coverage: cron, schedule-model, scheduled-task-store, scheduled-task-scheduler, sche…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-451ef48d6a"></a>
## [451ef48d6a](./cc-viewer-alignment-commit-ledger.md#commit-451ef48d6a) — feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T03:45:08+08:00；父提交 1；相对第一父文件数 30。
- 上游生产/配置文件：14；上游测试文件：10。
- 上游测试：`apps/web/test/schedule-modal-anchor.test.js`, `packages/app/test/api-preferences-gap.test.js`, `packages/app/test/file-access-policy.test.js`, `packages/app/test/im-deny.test.js`, `packages/app/test/json-store.test.js`, `packages/app/test/project-prefs.test.js`, `packages/app/test/scheduled-task-routes.test.js`, `packages/app/test/scheduled-task-runs-store.test.js`, `packages/app/test/scheduled-task-scheduler.test.js`, `packages/app/test/scheduled-task-store.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/routes/preferences.js` → `lib/preferences.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `Open **Scheduled tasks** from the (+) menu (chat input bar or terminal toolbar)`; `function _draftToSchedule(draft) {`; `export default function ScheduleTaskModal({ open, onClose, project, instance, se`; `describe('ScheduleTaskModal component', () => {`; `ccv -h`; `The cloud accepts **only** the following:`; `import { homedir, platform, tmpdir } from 'node:os';`; `const SENSITIVE_CLAUDE_FILES = new Set([`; `export function isReadAllowed(absPath) {`; `const WRITE_HOME_FILES = ['.bashrc', '.zshrc', '.bash_profile', '.zprofile', '.z`; `const WRITE_REL_PATHS = ['.claude/settings.json', '.claude/settings.local.json',`; `const READ_REL_PATHS = ['.npmrc', '.netrc', '.claude/cc-viewer/preferences.json'`; `const VAULT_FILE_RE = /^(credentials\.json|master\.key)$/i;`; `function isVaultFile(abs) { return VAULT_FILE_RE.test(basename(abs)); }`; `const BASH_DENY_RULES = [`; `export function evaluateImDeny(toolName, toolInput = {}, opts = {}) {`; `export function readJsonSafe(file, fallback = {}) {`; `function _resolveForMutation(data, file, strictCorrupt) {`; `import { getProjectName } from './project-state.js';`; `export function resolveScoped(globalPrefs, fork) {`; `export function startScheduledTaskScheduler() {`; `async function _tick(now = Date.now()) {`; `import { existsSync, readFileSync } from 'node:fs';`; `import { normalizeSchedule, nextBaseFor, occurrencesAtOrBefore, jitterForTaskId`; `const CATCH_UP_WINDOW_MS = 7 * 24 * 3600 * 1000; // 7 days`; `const STALE_CLAIM_MS = 2 * 3600 * 1000;`; `const JITTER_MAX_MS = 120_000;`; `export function tasksFilePath(root) { return join(root, FILE_NAME); }`; `export function readScheduledTasks(root) {`; `function _summarize(prompt) {`.
- Upstream commit message excerpt: - Task definitions + scheduling state live in preferences.json (scheduledTasks key, strict writes); run history moves to scheduled-task-runs.json (per-task cap 20, claimRunId idempotency). Legacy scheduled-tasks.json is a read-only fallback that writers never touch; only createTask creates the prefs key. - Security: prefs GET/POST/forks strip scheduledTasks; file-access-policy denies prefs/runs/legacy files (incl. .tmp-/.corrupt- residues); im-deny + pty-manager deny them too; corrupt prefs are backed up before any tolerant self-heal. - Scheduler: startup sweep deferred past the sync startup burst (avoids JSON_STORE_REENTRANT against auth/credential sync writers); legacy tasks are never claimed; reclaim restores a once-task's terminal state from the runs file instead of a misleading interrupted marker. - Modal: zero-task shows only the form; New-task button moves next to the title; title drops the project suffix; schedule warnings are submit-only; PTY mode hides the run-mode radios; ne…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-47827e973a"></a>
## [47827e973a](./cc-viewer-alignment-commit-ledger.md#commit-47827e973a) — chore(release): 1.9.13

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T03:46:45+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6363a51ec0"></a>
## [6363a51ec0](./cc-viewer-alignment-commit-ledger.md#commit-6363a51ec0) — fix: recognize Kimi K3 model aliases

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T15:52:35+08:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：3；上游测试文件：7。
- 上游测试：`apps/web/test/helpers-unit-a.test.js`, `apps/web/test/helpers.test.js`, `packages/app/test/builtin-model-prompts.test.js`, `packages/app/test/model-system-prompts.test.js`, `packages/app/test/system-prompt-builder.test.js`, `packages/app/test/system-prompt-files.test.js`, `packages/core/test/context-rules.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/utils/helpers.js` → `src/utils/helpers.js`; `packages/app/server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`; `packages/core/src/context-rules.js` → `server/lib/context-rules.js`。
- B0 diff inspection: 14 distinct hunk context(s) extracted (up to 30): `const MODEL_PROVIDERS = [`; `describe('getModelInfo', () => {`; `describe('helpers', () => {`; `function modelIdVariants(id) {`; `IMPORTANT: Never generate or guess URLs unless you are confident they help the u`; `describe('builtin-model-prompts: 模型匹配', () => {`; `describe('model-system-prompts: 读写/列表/匹配', () => {`; `describe('presets', () => {`; `describe('system-prompt-files: 内置 preset fallback', () => {`; `const SIZE_SUFFIX_RE = /\[(\d+)([km])\]/i;`; `const MODEL_CONTEXT_SIZES = [`; `export function classifyContextWindow(modelName) {`; `describe('getModelMaxTokens — 家族档位', () => {`; `describe('classifyContextWindow — 校准二分类', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6bc7781bba"></a>
## [6bc7781bba](./cc-viewer-alignment-commit-ledger.md#commit-6bc7781bba) — test: isolate resume route PTY fixtures

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T16:00:44+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`packages/app/test/resume-route.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `process.env.CCV_CLI_MODE = '0';`; `describe('POST /api/resume-session', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0e1546e718"></a>
## [0e1546e718](./cc-viewer-alignment-commit-ledger.md#commit-0e1546e718) — merge: isolate resume route PTY fixtures

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T16:01:24+08:00；父提交 2；相对第一父文件数 3。
- 上游生产/配置文件：0；上游测试文件：1。
- 上游测试：`packages/app/test/resume-route.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `@`.
- Upstream commit message excerpt: # Conflicts: # history.md

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-f2ebb0fe6b"></a>
## [f2ebb0fe6b](./cc-viewer-alignment-commit-ledger.md#commit-f2ebb0fe6b) — Merge pull request #161 from weiesky/fix/kimi-k3-model-aliases

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T16:06:49+08:00；父提交 2；相对第一父文件数 15。
- 上游生产/配置文件：3；上游测试文件：8。
- 上游测试：`apps/web/test/helpers-unit-a.test.js`, `apps/web/test/helpers.test.js`, `packages/app/test/builtin-model-prompts.test.js`, `packages/app/test/model-system-prompts.test.js`, `packages/app/test/resume-route.test.js`, `packages/app/test/system-prompt-builder.test.js`, `packages/app/test/system-prompt-files.test.js`, `packages/core/test/context-rules.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/utils/helpers.js` → `src/utils/helpers.js`; `packages/app/server/lib/model-system-prompts.js` → `lib/model-system-prompts.js`; `packages/core/src/context-rules.js` → `server/lib/context-rules.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix: recognize Kimi K3 model aliases

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c23590396f"></a>
## [c23590396f](./cc-viewer-alignment-commit-ledger.md#commit-c23590396f) — chore(release): 1.9.14

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T16:08:19+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ab1b89ee13"></a>
## [ab1b89ee13](./cc-viewer-alignment-commit-ledger.md#commit-ab1b89ee13) — fix(files): scope file operations to viewed project

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-24T20:57:57+08:00；父提交 1；相对第一父文件数 27。
- 上游生产/配置文件：12；上游测试文件：13。
- 上游测试：`apps/web/test/chat-file-open-scope.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-context-menu-actions.test.js`, `apps/web/test/file-move.test.js`, `apps/web/test/file-open.test.js`, `apps/web/test/files-import.test.js`, `apps/web/test/html-preview-scope.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/branch-routes-files-fs.test.js`, `packages/app/test/files-fs-deep.test.js`, `packages/app/test/files-view-write.test.js`, `packages/app/test/view-routes-project-r4.test.js`, `packages/app/test/view-routes-project.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/utils/fileOpen.js` → `src/utils/fileOpen.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `import { apiUrl } from '../../utils/apiUrl';`; `export default function HtmlPreviewModal({ path, onClose, zIndex = 1100 }) {`; `function ancestorsOf(path) {`; `function downloadFile(childPath, name) {`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `function GridCell({ item, childPath, isSelected, isGitIgnored, isRemote, onSelec`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `export default function FileContentView({`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `export default function FileExplorer({ style, onClose, onFileClick, expandedPath`; `import { t } from '../../i18n';`; `export function createFileMenuHandler({`; `import { message } from 'antd';`; `export function canDropMoveOn(fromPath, targetDir) {`; `export async function moveFile(fromPath, toDir, { onFileRenamed } = {}) {`; `export async function expandEntries(entries, depth) {`; `export async function importFiles(payload, targetDir, { onFileRenamed } = {}) {`; `const SYSTEM_OPEN_EXTS = new Set([`; `export function tryOpenWithSystem(path, source) {`; `describe('FileBrowserModal wiring contract', () => {`; `describe('modal upload wiring (button + zoned drag-drop)', () => {`; `describe('moveFile', () => {`; `describe('fileOpen.tryOpenWithSystem — 命中扩展名', () => {`; `describe('importFiles', () => {`; `export function resolveViewRoot({ projectParam, instanceParam, boundCwd, loadWor`; `import { isReadAllowed, reasonToStatus } from '../lib/file-access-policy.js';`; `import { _projectName } from '../interceptor.js';`; `function _viewRootOrReply(req, res, parsedUrl) {`; `function fileRaw(req, res, parsedUrl) {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d89aa3b9af"></a>
## [d89aa3b9af](./cc-viewer-alignment-commit-ledger.md#commit-d89aa3b9af) — fix(web): restore SDK thinking per assistant turn

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-25T03:33:30+08:00；父提交 1；相对第一父文件数 15。
- 上游生产/配置文件：9；上游测试文件：3。
- 上游测试：`apps/web/test/response-thinking-chat.test.js`, `apps/web/test/response-thinking.test.js`, `apps/web/test/view-state-cache.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/utils/sessionManager.js` → `src/utils/sessionManager.js`; `apps/web/src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`。
- B0 diff inspection: 14 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `import { mergeToolRuns } from '../../utils/toolRunMerge';`; `class ChatView extends React.Component {`; `export function applyBatchEntryTimestamps(st, entry) {`; `export function applyInPlaceLastMsgReplace(prevSessions, entry, timestamp, isNew`; `export function mergeMainAgentSessions(prevSessions, entry, options = {}) {`; `export const REACT_SLICE_KEYS = [`; `export function createChannelState() {`; `function trimWindow(list, windowSize) {`; `export function createViewStateCache({ maxProjects = MAX_PROJECTS, windowSize =`; `import { createViewStateCache } from '../src/utils/viewStateCache.js';`; `describe('viewStateCache snapshot/restore', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9c36b5b5a7"></a>
## [9c36b5b5a7](./cc-viewer-alignment-commit-ledger.md#commit-9c36b5b5a7) — fix(web): stabilize context usage colors and scrolling

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-25T18:09:42+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：3；上游测试文件：2。
- 上游测试：`apps/web/test/context-usage-view.test.js`, `apps/web/test/sdk-context-usage-tab.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 12 distinct hunk context(s) extracted (up to 30): `const { Text } = Typography;`; `export default function SdkContextUsageTab() {`; `const FALLBACK_PALETTE = [`; `function tok(v) { return (typeof v === 'number' && Number.isFinite(v) ? v : 0);`; `export function buildUsageBar(usage) {`; `export function gridToRows(usage) {`; `import assert from 'node:assert/strict';`; `before(async () => {`; `const FULL = {`; `describe('contextUsageView — normalizePercent', () => {`; `const I18N_SRC = readFileSync(join(here, '..', 'src', 'i18n.js'), 'utf-8');`; `describe('SdkContextUsageTab — every t() key resolves in i18n.js', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0c7195b689"></a>
## [0c7195b689](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689) — fix(web): refresh changes after git commits

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-25T18:32:10+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：2。
- 上游测试：`apps/web/test/commandValidator.test.js`, `apps/web/test/tool-file-change-controller.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/utils/commandValidator.js` → `src/utils/commandValidator.js`。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `export function isImageFile(path) {`; `describe('isMutatingCommand — git mutating subset', () => {`; `describe('ToolFileChangeController — 触发刷新', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5ee6739cba"></a>
## [5ee6739cba](./cc-viewer-alignment-commit-ledger.md#commit-5ee6739cba) — feat: merge SDK context usage into blood bars

- B0 snapshot comparison: 14 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-25T23:39:32+08:00；父提交 1；相对第一父文件数 41。
- 上游生产/配置文件：25；上游测试文件：14。
- 上游测试：`apps/web/test/context-i18n.test.js`, `apps/web/test/context-usage-view.test.js`, `apps/web/test/fixtures/sdk-context-provider-probe.jsx`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdk-context-blood-bar.test.js`, `apps/web/test/sdk-context-provider.test.js`, `apps/web/test/sdk-context-usage-tab.test.js`, `apps/web/test/sdk-panel-stable-dispatch.test.js`, `packages/app/test/api-project-memory.test.js`, `packages/app/test/scheduled-task-executor.test.js`, `packages/app/test/sdk-context-route.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-session-registry.test.js`, `packages/app/test/ws-instance-isolation.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/common/HoverPreviewTip.module.css` → `src/components/common/HoverPreviewTip.module.css`; `apps/web/src/components/common/MemoryDetailModal.jsx` → `src/components/common/MemoryDetailModal.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.jsx` → `src/components/dashboard/CachePopoverContent.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.module.css` → `src/components/dashboard/CachePopoverContent.module.css`; `apps/web/src/components/dashboard/LiveTagPopover.jsx` → `src/components/dashboard/LiveTagPopover.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { TerminalWsProvider } from './components/terminal/TerminalWsContext';`; `class App extends AppBase {`; `class AppBase extends React.Component {`; `import { t, getLang, setLang, LANG_OPTIONS } from './i18n';`; `function MobileCtxLabelText({ projectName }) {`; `class Mobile extends AppBase {`; `class ChatView extends React.Component {`; `import { parseMemoryLink } from '../../utils/memoryLinkParser';`; `export default function MemoryDetailModal({ detail, onClose, onOpenMemoryDetail,`; `button.quickMenuRow:hover {`; `class AppHeader extends React.Component {`; `import { ReloadOutlined, PlusOutlined, FolderOpenOutlined, FileZipOutlined, File`; `export default function CachePopoverContent({`; `import CachePopoverContent from './CachePopoverContent';`; `function LiveTagPopover({`; `import { t } from '../../i18n';`; `import { formatTokenCount } from '../../utils/helpers';`; `import Loading from '../common/Loading';`; `const GRID_FILL_CLASS = {`; `export default function SdkContextUsageTab() {`; `const i18nData = {`; `export function buildApiUsage(usage) {`; `export function nextPanelState(prev, event) {`; `const KEYS = [`; `let normalizePercent, buildUsageBar, gridToRows, buildDetailSections, buildApiUs`; `before(async () => {`; `describe('contextUsageView — nextPanelState 面板状态机', () => {`; `describe('new UI key i18n coverage', () => {`; `const CSS = readFileSync(join(here, '..', 'src', 'components', 'dashboard', 'Sdk`; `describe('SdkContextUsageTab — readable grid and scrollable layout', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-91b0055f2d"></a>
## [91b0055f2d](./cc-viewer-alignment-commit-ledger.md#commit-91b0055f2d) — fix(sdk): honor plan auto-approval settings

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-26T13:00:11+08:00；父提交 1；相对第一父文件数 22。
- 上游生产/配置文件：11；上游测试文件：9。
- 上游测试：`apps/web/test/plan-approval-panel.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/plan-auto-approve-target.test.js`, `apps/web/test/resume-history-menu.test.js`, `apps/web/test/sdk-error-dialogue.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`, `packages/app/test/branch-routes-files-fs.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.module.css` → `src/components/approval/ToolApprovalPanel.module.css`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 25 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `const DEFAULT_AUTO_SECONDS = 3;`; `function ToolApprovalPanel({ toolName, toolInput, requestId, onAllow, onAllowSes`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import { isPlanApprovalPrompt, isDangerousOperationPrompt, pickPlanApproveOption`; `import {`; `class ChatView extends React.Component {`; `import { PERM_AUTO_APPROVE_OPTIONS, PLAN_AUTO_APPROVE_OPTIONS, autoApproveValueL`; `function QuickAutoApproveRows({ autoApproveSeconds, planAutoApproveSeconds, onAu`; `const i18nData = {`; `describe('star-menu migration — the history row lives after perm and plan', ()`; `describe('sdk-error dialogue rows — state + WS branch', () => {`; `describe('sdk-error dialogue rows — view/session switch clearing', () => {`; `const CHATVIEW = read('src/components/chat/ChatView.jsx');`; `describe('SDK mode never activates the PTY plan-approval surface', () => {`; `function _createSession(key, cwd) {`; `async function setupTerminalWebSocket(httpServer) {`; `function readAppendedLine(fromLength) {`; `async function waitForAppended(p, fromLength, timeoutMs = 3000) {`; `before(async () => {`; `describe('files-fs 分支补强', { concurrency: false }, () => {`; `try {`; `describeCli('server.js 模块加载期 / startViewer env 分支（子进程）',`; `describe('sdk-manager-query — canUseTool: AskUserQuestion / ExitPlanMode / 权`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b9d592fc13"></a>
## [b9d592fc13](./cc-viewer-alignment-commit-ledger.md#commit-b9d592fc13) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-26T08:52:30+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1aca9b5f8f"></a>
## [1aca9b5f8f](./cc-viewer-alignment-commit-ledger.md#commit-1aca9b5f8f) — fix(chat): restore queued prompts and queue dispatch state

- B0 snapshot comparison: 12 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-26T20:34:56+08:00；父提交 1；相对第一父文件数 45。
- 上游生产/配置文件：22；上游测试文件：18。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/optimistic-queue-chat.test.js`, `apps/web/test/optimistic-queue-message.test.js`, `apps/web/test/queue-bubbles.test.js`, `apps/web/test/queued-prompt-display.test.js`, `apps/web/test/sdk-error-dialogue.test.js`, `apps/web/test/sdk-workspace-anchors.test.js`, `apps/web/test/terminal-ws-attach.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/chat-queue.test.js`, `packages/app/test/pty-manager-instance.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/v2-core.test.js`, `packages/core/test/fixtures/queued-prompt-real-formats.json`, `packages/core/test/queued-prompt.test.js`, `packages/core/test/v2-transcript-normalizer.test.js`, `test/content-filter-unit.test.js`, `test/v3-assembler.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/terminal/TerminalWsContext.jsx` → `src/components/terminal/TerminalWsContext.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/markdown.js` → `src/utils/markdown.js`; `apps/web/src/utils/sessionManager.js` → `src/utils/sessionManager.js`; `apps/web/src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/contentFilter.js` → `src/utils/contentFilter.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { reconstructEntries, createIncrementalReconstructor } from '@ccv/core/de`; `class AppBase extends React.Component {`; `import { isSystemText, classifyUserContent, isMainAgent, isTeammate, resolveTeam`; `class ChatView extends React.Component {`; `export class TerminalWsProvider extends React.Component {`; `const i18nData = {`; `export function renderMarkdown(text) {`; `export function applyInPlaceLastMsgReplace(prevSessions, entry, timestamp, isNew`; `export function mergeMainAgentSessions(prevSessions, entry, options = {}) {`; `export function createV3Assembler() {`; `const KEYS = [`; `describe('queue bubbles — state + WS wiring', () => {`; `describe('queue bubbles — render block', () => {`; `describe('sdk-error dialogue rows — state + WS branch', () => {`; `describe('sdk-error dialogue rows — rendering', () => {`; `describe('SDK workspace instance anchors', () => {`; `LOG_DIR/<project>/sessions/<session_id>/`; `server-side reconstruction: full accumulated 'body.messages' (shared refs),`; `const RESCUE_AFTER_MS = 3000;     // stale-busy rescue: frontend guessed busy wh`; `let _deps = null;`; `let _gen = 0;               // generation counter: clear()/stop() invalidate in-`; `export function initChatQueue(deps) {`; `export function getSnapshot() {`; `function _broadcast() {`; `function _makeItem(text, anchor) {`; `function _safeToInject() {`; `function _injectHead() {`; `export function enqueue(text, anchor) {`; `export function remove(id) {`; `export function clear() {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a99506d5f5"></a>
## [a99506d5f5](./cc-viewer-alignment-commit-ledger.md#commit-a99506d5f5) — chore(release): 1.9.15

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-26T21:20:41+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2cd4488ce9"></a>
## [2cd4488ce9](./cc-viewer-alignment-commit-ledger.md#commit-2cd4488ce9) — Merge pull request #162 from weiesky/fix/file-browser-view-scope

- B0 snapshot comparison: 31 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-26T21:26:59+08:00；父提交 2；相对第一父文件数 121。
- 上游生产/配置文件：62；上游测试文件：53。
- 上游测试：`apps/web/test/chat-file-open-scope.test.js`, `apps/web/test/commandValidator.test.js`, `apps/web/test/context-i18n.test.js`, `apps/web/test/context-usage-view.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-context-menu-actions.test.js`, `apps/web/test/file-move.test.js`, `apps/web/test/file-open.test.js`, `apps/web/test/files-import.test.js`, `apps/web/test/fixtures/sdk-context-provider-probe.jsx`, `apps/web/test/html-preview-scope.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/optimistic-queue-chat.test.js`, `apps/web/test/optimistic-queue-message.test.js`, `apps/web/test/plan-approval-panel.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/plan-auto-approve-target.test.js`, `apps/web/test/queue-bubbles.test.js`, `apps/web/test/queued-prompt-display.test.js`, `apps/web/test/response-thinking-chat.test.js`, `apps/web/test/response-thinking.test.js`, `apps/web/test/resume-history-menu.test.js`, `apps/web/test/sdk-context-blood-bar.test.js`, `apps/web/test/sdk-context-provider.test.js`, `apps/web/test/sdk-context-usage-tab.test.js`, `apps/web/test/sdk-error-dialogue.test.js`, `apps/web/test/sdk-panel-stable-dispatch.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`, `apps/web/test/sdk-workspace-anchors.test.js`, `apps/web/test/terminal-ws-attach.test.js`, `apps/web/test/tool-file-change-controller.test.js`, `apps/web/test/view-state-cache.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-project-memory.test.js`, `packages/app/test/branch-routes-files-fs.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/chat-queue.test.js`, `packages/app/test/files-fs-deep.test.js`, `packages/app/test/files-view-write.test.js`, `packages/app/test/pty-manager-instance.test.js`, `packages/app/test/scheduled-task-executor.test.js`, `packages/app/test/sdk-context-route.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-session-registry.test.js`, `packages/app/test/v2-core.test.js`, `packages/app/test/view-routes-project-r4.test.js`, `packages/app/test/view-routes-project.test.js`, `packages/app/test/ws-instance-isolation.test.js`, `packages/core/test/fixtures/queued-prompt-real-formats.json`, `packages/core/test/queued-prompt.test.js`, `packages/core/test/v2-transcript-normalizer.test.js`, `test/content-filter-unit.test.js`, `test/v3-assembler.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.module.css` → `src/components/approval/ToolApprovalPanel.module.css`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/common/HoverPreviewTip.module.css` → `src/components/common/HoverPreviewTip.module.css`; `apps/web/src/components/common/MemoryDetailModal.jsx` → `src/components/common/MemoryDetailModal.jsx`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.jsx` → `src/components/dashboard/CachePopoverContent.jsx`; `apps/web/src/components/dashboard/CachePopoverContent.module.css` → `src/components/dashboard/CachePopoverContent.module.css`; `apps/web/src/components/dashboard/LiveTagPopover.jsx` → `src/components/dashboard/LiveTagPopover.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/terminal/TerminalWsContext.jsx` → `src/components/terminal/TerminalWsContext.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/commandValidator.js` → `src/utils/commandValidator.js`; `apps/web/src/utils/fileOpen.js` → `src/utils/fileOpen.js`; `apps/web/src/utils/markdown.js` → `src/utils/markdown.js`; `apps/web/src/utils/sessionManager.js` → `src/utils/sessionManager.js`; `apps/web/src/utils/sessionMerge.js` → `src/utils/sessionMerge.js`; `packages/app/package.json` → `package.json`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/contentFilter.js` → `src/utils/contentFilter.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix: restore SDK conversations and scope file operations

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-566ade13fc"></a>
## [566ade13fc](./cc-viewer-alignment-commit-ledger.md#commit-566ade13fc) — feat(web): open CLAUDE.md and skill folders

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:47:58+08:00；父提交 1；相对第一父文件数 23。
- 上游生产/配置文件：15；上游测试文件：6。
- 上游测试：`apps/web/test/external-folder-targets.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-open.test.js`, `apps/web/test/new-ui-i18n.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-target-files.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/common/MemoryDetailModal.jsx` → `src/components/common/MemoryDetailModal.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/settings/SkillsManagerModal.jsx` → `src/components/settings/SkillsManagerModal.jsx`; `apps/web/src/components/settings/SkillsManagerModal.module.css` → `src/components/settings/SkillsManagerModal.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/fileOpen.js` → `src/utils/fileOpen.js`; `apps/web/src/utils/skillModalController.js` → `src/utils/skillModalController.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import MemoryDetailModal from './components/common/MemoryDetailModal';`; `class Mobile extends AppBase {`; `import { useSdkContextUsage } from '../dashboard/SdkContextUsageProvider';`; `import styles from './sharedChrome.module.css';`; `export default function MemoryDetailModal({ detail, onClose, onOpenMemoryDetail,`; `import MemoryDetailModal from '../common/MemoryDetailModal';`; `class AppHeader extends React.Component {`; `import { isImageFile } from '../../utils/commandValidator';`; `import { reportSwallowed } from '../../utils/errorReport';`; `import styles from './FileBrowserModal.module.css';`; `function handleActivationKey(handler) {`; `function CrumbDropTarget({ label, path, link, onNavigate, onMove, title }) {`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `function isThumbnailFile(name) {`; `function GridCell({ item, childPath, isSelected, isGitIgnored, isRemote, onSelec`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `export default function FileContentView({`; `import ConfirmRemoveButton from '../common/ConfirmRemoveButton';`; `export default function SkillsManagerModal({`; `const i18nData = {`; `const SYSTEM_OPEN_EXTS = new Set([`; `export function tryOpenWithSystem(path, source, { project, instance } = {}) {`; `import { skillKey, skillOrderKey } from './skillsParser';`; `export async function handleSkillToggle(host, skill) {`; `export async function handleSkillDelete(host, skill) {`; `describe('FileBrowserModal wiring contract', () => {`; `describe('modal upload wiring (button + zoned drag-drop)', () => {`; `globalThis.document = { querySelector: () => null };`; `function installFetch({ reject = false } = {}) {`; `const KEYS = [`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1e0edc00f3"></a>
## [1e0edc00f3](./cc-viewer-alignment-commit-ledger.md#commit-1e0edc00f3) — fix(web): inline queue send-now chip and clear placeholder on dispatch

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:47:58+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：4；上游测试文件：3。
- 上游测试：`apps/web/test/optimistic-queue-chat.test.js`, `apps/web/test/optimistic-queue-message.test.js`, `apps/web/test/queue-bubbles.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`。
- B0 diff inspection: 16 distinct hunk context(s) extracted (up to 30): `class ChatMessage extends React.Component {`; `const STOP_OPTIMISTIC_FALLBACK_MS = 4000;`; `class ChatView extends React.Component {`; `function sameScope(pending, scope) {`; `function userTexts(session) {`; `export function reconcileOptimisticQueueMessages(pending, session, queuedItems,`; `import { fileURLToPath, pathToFileURL } from 'node:url';`; `function makeView() {`; `before(async () => {`; `describe('ChatView send-now optimistic conversation behavior', () => {`; `import assert from 'node:assert/strict';`; `describe('optimistic queue message reconciliation', () => {`; `const CSS_PATH = join(__dirname, '..', 'src', 'components', 'chat', 'ChatView.mo`; `const css = readFileSync(CSS_PATH, 'utf-8');`; `describe('queue bubbles — render block', () => {`; `describe('queue bubbles — CSS', () => {`.
- Upstream commit message excerpt: Move the "追加中…" chip into the user bubble's label row right after the timestamp via a new ChatMessage labelSuffix slot, replacing the standalone status div below the bubble. Fix the placeholder sticking until browser refresh: when the server has accepted the dispatch and removed the item from the queue-state snapshot, drop the optimistic placeholder immediately (new terminal rule dispatchingSeen && !queueItem). Scan all displayed sessions for text acknowledgement and aggregate the baseline across the same set so a prompt echo landing outside the last session still clears the placeholder. Add a bounded 30s client-side sweep to cover the silent server rejection paths. Coverage: optimistic-queue-message.test.js, optimistic-queue-chat.test.js, queue-bubbles.test.js.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-15751cf49c"></a>
## [15751cf49c](./cc-viewer-alignment-commit-ledger.md#commit-15751cf49c) — chore(server): kimi-k3 preset forbids unrequested real-environment verification

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:47:58+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `IMPORTANT: Never generate or guess URLs unless you are confident they help the u`.
- Upstream commit message excerpt: Add a one-line rule to the built-in kimi-k3 system prompt preset: "Do not schedule real-environment verification (deploy checks, live E2E, manual smoke runs) unless the user explicitly asks — it burns tokens for little signal." Placed right after the "Deliver exactly what was asked" rule so it reads as a concrete instance of that boundary. Coverage: system-prompt-snapshots.test.js.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5e50112388"></a>
## [5e50112388](./cc-viewer-alignment-commit-ledger.md#commit-5e50112388) — fix(server+web): server-side auto-approve countdown for plan/perm approvals

- B0 snapshot comparison: 9 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:47:58+08:00；父提交 1；相对第一父文件数 27。
- 上游生产/配置文件：12；上游测试文件：14。
- 上游测试：`apps/web/test/deadline-countdown.test.js`, `apps/web/test/permission-controller.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/quick-settings-i18n.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`, `packages/app/test/api-ask-perm-extra.test.js`, `packages/app/test/auto-approve.test.js`, `packages/app/test/branch-lib-sdk-manager.test.js`, `packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/perm-bridge.test.js`, `packages/app/test/sdk-manager-auto-approve.test.js`, `packages/app/test/server-cli-mode.test.js`, `packages/app/test/server-ws-branches.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/permissionController.js` → `src/components/chat/controllers/permissionController.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class Mobile extends AppBase {`; `import { AUTO_APPROVE_INSTANT } from '../../utils/helpers';`; `const DEFAULT_AUTO_SECONDS = 3;`; `function ToolApprovalPanel({ toolName, toolInput, requestId, onAllow, onAllowSes`; `import { resolvePlanAutoApproveTarget, sdkPlanMatchesView } from '../../utils/pl`; `class ChatView extends React.Component {`; `export class PermissionController {`; `describe('PermissionController — autoAllow（免审批源头直放）', () =>`; `describe('ChatView SDK plan auto-approval runtime behavior', () => {`; `describe('ChatView PTY plan auto-approval lifecycle', () => {`; `const KEYS = [`; `describe('SDK mode never activates the PTY plan-approval surface', () => {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `function postToViewer() {`; `import { projectKeyForCwd } from './system-prompt-snapshots.js';`; `function _createSession(key, cwd) {`; `export function cancelApproval(id, reason) {`; `import { reportSwallowed } from '../lib/error-report.js';`; `function permHook(req, res, parsedUrl, isLocal, deps) {`; `import { reportSwallowed } from './lib/error-report.js';`; `function getAllLocalIps() {`; `function _buildPluginInteractions() {`; `async function setupTerminalWebSocket(httpServer) {`; `export function setSdkResolveApproval(fn) { _sdkResolveApproval = fn; }`; `describe('ask-perm: permHook (POST /api/perm-hook)', () => {`; `import assert from 'node:assert/strict';`; `before(async () => {`; `import { EventEmitter } from 'node:events';`; `describe('ask-perm 分支补洞: permHook', () => {`; `try {`.
- Upstream commit message excerpt: Move the auto-approve countdown from the client to the server: armed from request arrival at the user's setting (server fires at N+1s as the no-client fallback), so approvals proceed even when no browser is open, the tab is backgrounded, or the WS dropped. Client cancel (new perm-hook-auto-cancel; sdk-plan-auto-cancel now really cancels server-side) destroys the server timer and keeps the request pending for a manual decision; replay frames carry the server deadline (autoApproveAt) and cancelled state so reconnects show the remaining time instead of restarting a full countdown; client countdowns are wall-clock driven (no background-tab stall). Safety floors: npm publish and unattended scheduled-task runs are exempt from server-side auto-approve (always wait for a human / 5-min timeout). PTY plans (keystroke injection) stay client-side. Also fix intermittent non-approval bugs: WS-open re-arm, replay carrying remaining time, durable cancellation, missing instanceKey on SDK perm/ask frame…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-134a0de7ac"></a>
## [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac) — docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates

- B0 snapshot comparison: 22 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:47:58+08:00；父提交 1；相对第一父文件数 41。
- 上游生产/配置文件：4；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`; `packages/app/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`; `packages/content/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `const i18nData = {`; `Otherwise, if the project is managed with Git:`; `Pre-requisites:`; `The team's goal is to analyze the current Git change log and validate each modif`; `Workflow:`.
- Upstream commit message excerpt: Rewrite the review-team section to build the team with named Agent teammates (no TeamCreate/TeamDelete dependency), split multi-repo reviews into separate tasks, fix all P0/P1 findings and evaluate P2 dialectically (consulting the user via AskUserQuestion for special decisions), and close the team by notifying each teammate to exit. Synced verbatim from the single source of truth (ultraplanTemplates.js): UltraPlan codeExpert template, packages/content + packages/app ultraAgents/code-expert.json, the 18-locale concepts UltraPlan.md docs, and the UltraReview preset default prompt (ui.preset.codeReview5.desc, 18 locales).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-aaa3a59444"></a>
## [aaa3a59444](./cc-viewer-alignment-commit-ledger.md#commit-aaa3a59444) — docs: changelog for server-side approval countdown and UltraReview template

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:47:58+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-67226f50c1"></a>
## [67226f50c1](./cc-viewer-alignment-commit-ledger.md#commit-67226f50c1) — Merge pull request #163 from weiesky/fix/file-browser-view-scope

- B0 snapshot comparison: 41 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:49:53+08:00；父提交 2；相对第一父文件数 98。
- 上游生产/配置文件：32；上游测试文件：23。
- 上游测试：`apps/web/test/deadline-countdown.test.js`, `apps/web/test/external-folder-targets.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-open.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/optimistic-queue-chat.test.js`, `apps/web/test/optimistic-queue-message.test.js`, `apps/web/test/permission-controller.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/queue-bubbles.test.js`, `apps/web/test/quick-settings-i18n.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`, `packages/app/test/api-ask-perm-extra.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-target-files.test.js`, `packages/app/test/auto-approve.test.js`, `packages/app/test/branch-lib-sdk-manager.test.js`, `packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/perm-bridge.test.js`, `packages/app/test/sdk-manager-auto-approve.test.js`, `packages/app/test/server-cli-mode.test.js`, `packages/app/test/server-ws-branches.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/controllers/permissionController.js` → `src/components/chat/controllers/permissionController.js`; `apps/web/src/components/common/MemoryDetailModal.jsx` → `src/components/common/MemoryDetailModal.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/settings/SkillsManagerModal.jsx` → `src/components/settings/SkillsManagerModal.jsx`; `apps/web/src/components/settings/SkillsManagerModal.module.css` → `src/components/settings/SkillsManagerModal.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/fileOpen.js` → `src/utils/fileOpen.js`; `apps/web/src/utils/skillModalController.js` → `src/utils/skillModalController.js`; `apps/web/src/utils/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/app/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`; `packages/content/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: fix(server+web): server-side auto-approve countdown for plan/perm approvals

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3e4f1064c2"></a>
## [3e4f1064c2](./cc-viewer-alignment-commit-ledger.md#commit-3e4f1064c2) — chore(release): 1.9.16

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-27T23:50:36+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3d65bedcd1"></a>
## [3d65bedcd1](./cc-viewer-alignment-commit-ledger.md#commit-3d65bedcd1) — fix(web): keep the composer blood bar visible when the SDK scratch terminal opens

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-29T17:12:47+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/sdk-context-blood-bar.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `const app = src('App.jsx');`; `describe('SDK context blood-bar integration contracts', () => {`.
- Upstream commit message excerpt: In SDK mode terminalVisible mirrors scratchOpen, but the blood-bar portal host (ctxBarSlot) was gated on a bare !terminalVisible while the composer early return already exempted sdkMode. Opening the scratch terminal unmounted the slot, so AppHeader's createPortal lost its target and the blood bar disappeared. Gate the slot with the same predicate as the early return; PTY mode still migrates the bar to the terminal toolbar. Adds a source-contract regression test.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7a75e1be81"></a>
## [7a75e1be81](./cc-viewer-alignment-commit-ledger.md#commit-7a75e1be81) — feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-29T17:14:03+08:00；父提交 1；相对第一父文件数 21。
- 上游生产/配置文件：13；上游测试文件：6。
- 上游测试：`apps/web/test/external-folder-targets.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-context-menu-actions.test.js`, `apps/web/test/file-context-menu.test.js`, `packages/app/test/api-target-files-fs.test.js`, `packages/app/test/branch-lib-file-access-policy.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/utils/apiUrl.js` → `src/utils/apiUrl.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { t } from '../../i18n';`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `function isThumbnailFile(name) {`; `function GridCell({ item, childPath, isSelected, isGitIgnored, isRemote, onSelec`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `import { Modal, message } from 'antd';`; `export default function FileContentView({`; `import { t } from '../../i18n.js';`; `export function buildFileContextMenuItems({ isDir, isRemote, scope = 'node' }) {`; `export function createFileMenuHandler({`; `export function withViewParams(path, { project, instance } = {}) {`; `describe('CLAUDE.md and skill folder-entry wiring', () => {`; `describe('target-scoped file browser read-only boundaries', () => {`; `describe('shared context menu wiring (sidebar tree ≡ modal)', () => {`; `function menu(path = 'src', isDir = true) {`; `describe('file context menu project-scoped requests', () => {`; `describe('buildFileContextMenuItems — container scope (header / blank-area par`; `function _logDirSensitiveFiles() {`; `export function isReadAllowed(absPath) {`; `import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, realpathS`; `import { ERROR_STATUS_MAP, isPathContained } from '../lib/file-api.js';`; `import { isSameOriginBrowserRequest } from '../lib/same-origin.js';`; `function fileContentPost(req, res, parsedUrl, isLocal) {`; `import { homedir, tmpdir } from 'node:os';`; `import { viewRootOrReply } from '../lib/view-root.js';`; `function revealFile(req, res, parsedUrl, isLocal, deps) {`; `function openTerminal(req, res, parsedUrl, isLocal, deps) {`; `import { filesFsRoutes } from './routes/files-fs.js';`; `const _routes = [`; `const policy = await import('../server/lib/file-access-policy.js');`.
- Upstream commit message excerpt: The target-mode FileBrowserModal was fully read-only, so right-click fell through to the browser's native menu. Wire the same shared context menu used by the project explorer (reveal / open-in-terminal / new file / new folder / copy path / copy relative path / rename / delete) and enable inline preview editing. Server: new /api/target-* write routes resolve the navigation root from the target identity server-side (admin + same-origin before the body is read), with realpath containment, symlink refusal and an isWriteAllowed write policy (~/.claude credentials, sensitive-prefix dirs, LOG_DIR, config backups); rename and recursive delete both scan the subtree so a denylisted entry cannot be moved or wiped. OS reveal/terminal logic is shared via lib/os-open.js between the project and target routes. Drag/upload/move stay read-only.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-282306a950"></a>
## [282306a950](./cc-viewer-alignment-commit-ledger.md#commit-282306a950) — fix(web): SDK-mode plan approval uses the plan card modal

- B0 snapshot comparison: 9 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-29T20:19:39+08:00；父提交 1；相对第一父文件数 15。
- 上游生产/配置文件：10；上游测试文件：3。
- 上游测试：`apps/web/test/plan-approval-panel.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ApprovalModal.jsx` → `src/components/approval/ApprovalModal.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/chat/ApprovalPortalContext.js` → `src/components/chat/ApprovalPortalContext.js`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/interactionOwnership.js` → `src/components/chat/interactionOwnership.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 22 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `import AskQuestionForm from '../chat/AskQuestionForm';`; `const _tr = (key, params, fallback) => {`; `export default function ApprovalModal({`; `const DEFAULT_AUTO_SECONDS = 3;`; `function ToolApprovalPanel({ toolName, toolInput, requestId, onAllow, onAllowSes`; `import { createContext } from 'react';`; `class ChatMessage extends React.Component {`; `import { classifyRequest, formatRequestTag, formatTeammateLabel } from '@ccv/cor`; `class ChatView extends React.Component {`; `const sent = [];`; `const sharedProps = {`; `function makeView(planAutoApproveSeconds) {`; `afterEach(() => {`; `describe('ChatView SDK plan auto-approval runtime behavior', () => {`; `describe('ChatView PTY plan auto-approval lifecycle', () => {`; `const CHAT_INPUT = read('src/components/chat/ChatInputBar.jsx');`; `const MOBILE = read('src/Mobile.jsx');`; `describe('SDK mode never activates the PTY plan-approval surface', () => {`; `const gitRestoreLocks = new Map(); // Map<absLockKey, Promise<void>>`; `export function broadcastWsMessage(msg) {  if (terminalWss) {`.
- Upstream commit message excerpt: ExitPlanMode approval in SDK mode reused the bottom permission-styled ToolApprovalPanel, making plan review look like a permission prompt. It now reuses the PTY planModeBox card portaled into the global ApprovalModal (Approve / Approve-with-edits / Reject + countdown), fully separated from permission approval. The bottom plan panel is removed on desktop and mobile; resolution still goes through sdk-plan-answer unchanged and PTY keystrokes stay hard-gated on !sdkMode. Correctness fixes surfaced by review: - Rebuild the message list when pendingPlanApproval changes so the card becomes interactive and flips to approved/rejected (the modal no longer opens with an empty body). - Tick the countdown on the card by cloning the cached card element prop and comparing it in ChatMessage.shouldComponentUpdate. - Add a ptyPlan fallback body (PlanApprovalForm) to ApprovalModal so the plan modal is actionable even when the transcript card has not portaled in yet (frame-before-transcript, synthetic too…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ebfcbaec0d"></a>
## [ebfcbaec0d](./cc-viewer-alignment-commit-ledger.md#commit-ebfcbaec0d) — fix(web): hide Last Response when it duplicates the last assistant turn

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-29T22:44:02+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/web/test/lr-duplicate-text.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/interactionOwnership.js` → `src/components/chat/interactionOwnership.js`。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `import { shouldDeferSend, reduceUploading } from './uploadDeferLogic';`; `class ChatView extends React.Component {`; `export function collectLrAskQuestions(respContent) {`.
- Upstream commit message excerpt: When the final turn is echoed into both session.messages (last assistant bubble) and session.response.body.content (the Last-Response block), the reply renders twice. Hide the whole LR block only when it is provably the same turn (trimmed joined text equal AND tool_use id sequence equal) and the LR owns no pending interaction the messages side does not render.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1600211658"></a>
## [1600211658](./cc-viewer-alignment-commit-ledger.md#commit-1600211658) — chore(release): 1.9.17

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-30T00:20:58+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-208f134827"></a>
## [208f134827](./cc-viewer-alignment-commit-ledger.md#commit-208f134827) — fix(server+web): fork review fixes for 1.9.17 — new-file save 403, plan modal reopen, fallback countdown

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-30T14:14:30+08:00；父提交 1；相对第一父文件数 10。
- 上游生产/配置文件：5；上游测试文件：3。
- 上游测试：`apps/web/test/approval-dismissal.test.js`, `apps/web/test/plan-fallback-countdown.test.js`, `packages/app/test/api-target-files-fs.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/approval/ApprovalModal.jsx` → `src/components/approval/ApprovalModal.jsx`。
- B0 diff inspection: 6 distinct hunk context(s) extracted (up to 30): `import { reportSwallowed } from './utils/errorReport';`; `class AppBase extends React.Component {`; `import { shouldRenderAskFallback, ASK_FALLBACK_GRACE_MS } from '../../utils/askF`; `export default function ApprovalModal({`; `function fileContentPost(req, res, parsedUrl, isLocal) {`; `describe('/api/target-* write routes', { concurrency: false }, () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-84e65cddc6"></a>
## [84e65cddc6](./cc-viewer-alignment-commit-ledger.md#commit-84e65cddc6) — fix(server+web): judge stuck SDK turns by activity probe, restore approvals on attach, keep Stop visible on long turns

- B0 snapshot comparison: 9 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-31T03:44:00+08:00；父提交 1；相对第一父文件数 18。
- 上游生产/配置文件：9；上游测试文件：7。
- 上游测试：`apps/web/test/stop-button-turn-active.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/cli-sdk-process-wiring.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/sdk-session-state.test.js`, `packages/app/test/sdk-session-wiring.test.js`, `packages/app/test/server-sdk-attach-replay.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/askFlowController.js` → `src/components/chat/controllers/askFlowController.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 23 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import { buildResponseThinkingIndex, buildSessionThinkingDisplay, filterDisplaye`; `function randomInterval() {`; `class ChatView extends React.Component {`; `export class AskFlowController {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `registerSdkSessionLister(listSdkSessions);`; `const INTERRUPT_GRACE_MS = 10 * 1000;`; `let _runWaterfallHook = null;`; `function _createSession(key, cwd) {`; `export function initSdkSession(cwd, projectName, { onTurnEnd, onQueryError, broa`; `export function getSessionId(anchor) {`; `async function setupTerminalWebSocket(httpServer) {`; `export function setSdkInterruptTurn(fn) { _sdkInterruptTurn = fn; }`; `try {`; `describe('sdk-manager-query — interruptTurn 真中断 + 排空 pending 审批'`; `describe('sdk-manager-query — review 回归（watchdog / 墓碑 / signal / dis`; `function makeResidentQuery({ respond, initMsgs } = {}) {`; `describe('sdk-session-state relay', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-cdf05bf8ee"></a>
## [cdf05bf8ee](./cc-viewer-alignment-commit-ledger.md#commit-cdf05bf8ee) — feat(server+web): inline 502/network retry feedback with progress and a manual resume-retry affordance

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-31T03:44:09+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：3；上游测试文件：5。
- 上游测试：`apps/web/test/chat-synthetic-retry-prompt.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdk-error-dialogue.test.js`, `apps/web/test/sdk-retry-inline.test.js`, `packages/app/test/sdk-retry-inline.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 6 distinct hunk context(s) extracted (up to 30): `const i18nData = {`; `const KEYS = [`; `describe('new UI key i18n coverage', () => {`; `describe('sdk-error dialogue rows — state + WS branch', () => {`; `describe('sdk-error dialogue rows — view/session switch clearing', () => {`; `describe('sdk-error dialogue rows — rendering', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-77b61bd571"></a>
## [77b61bd571](./cc-viewer-alignment-commit-ledger.md#commit-77b61bd571) — fix(server+web): resilient sends, approval-hook timeout, SSE slow reconnect, off-mode stream idle watchdog

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-31T03:44:17+08:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：3；上游测试文件：7。
- 上游测试：`apps/web/test/queue-bubbles.test.js`, `apps/web/test/send-failed-feedback.test.js`, `apps/web/test/sse-channels.test.js`, `apps/web/test/sse-slow-reconnect.test.js`, `packages/app/test/plugin-loader.test.js`, `packages/app/test/proxy-stream-idle-off.test.js`, `packages/app/test/sdk-manager-send-failure.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/lib/plugin-loader.js` → `lib/plugin-loader.js`; `packages/app/server/proxy.js` → `proxy.js`。
- B0 diff inspection: 13 distinct hunk context(s) extracted (up to 30): `export function createChannelManager({`; `describe('queue bubbles — send path', () => {`; `describe('createChannelManager lifecycle', () => {`; `If a plugin returns 'null'/'undefined', the value passes through unchanged.`; `hooks: {`; `const HOOK_TYPES = {`; `export async function loadPlugins(opts = {}) {`; `export async function runWaterfallHook(name, initialValue) {`; `import { createServer } from 'node:http';`; `import { liveSystemPromptEnabled } from './lib/system-prompt-live.js';`; `export function startProxy() {`; `async function handleLlmApiRequest(req, res, fullUrl, fetchOptions, body, proxyD`; `describe('runWaterfallHook', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7039adeec3"></a>
## [7039adeec3](./cc-viewer-alignment-commit-ledger.md#commit-7039adeec3) — chore(release): 1.9.18

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-10-31T03:46:26+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-08809f6e69"></a>
## [08809f6e69](./cc-viewer-alignment-commit-ledger.md#commit-08809f6e69) — perf(web): incremental scan in ToolFileChangeController.check (#164)

- B0 snapshot comparison: 18 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:19:28+08:00；父提交 1；相对第一父文件数 64。
- 上游生产/配置文件：26；上游测试文件：25。
- 上游测试：`apps/web/test/agent-loop-voice.test.js`, `apps/web/test/approval-dismissal.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdk-error-dialogue.test.js`, `apps/web/test/sdk-retry-inline.test.js`, `apps/web/test/stop-button-turn-active.test.js`, `apps/web/test/tool-file-change-controller.test.js`, `apps/web/test/turn-active-gating.test.js`, `apps/web/test/voice-pack-player.test.js`, `packages/app/test/agent-loop-server-events.test.js`, `packages/app/test/cli-sdk-process-wiring.test.js`, `packages/app/test/events-attach-buffer.test.js`, `packages/app/test/plugin-runtime.test.js`, `packages/app/test/sdk-agent-loop.test.js`, `packages/app/test/sdk-manager-lost-result.test.js`, `packages/app/test/sdk-session-state.test.js`, `packages/app/test/sse-attach-buffer.test.js`, `packages/app/test/turn-end-scope-behavior.test.js`, `packages/app/test/turn-end-scope.test.js`, `packages/app/test/v2-meta-rows.test.js`, `packages/app/test/voice-pack-manager.test.js`, `packages/core/test/voice-pack-events.test.js`, `test/v2-live-feed.test.js`, `test/voice-pack-sanguo-integration.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/public/voice-packs/default/pack.json` → `public/voice-packs/default/pack.json`; `apps/web/public/voice-packs/sanguo/pack.json` → `public/voice-packs/sanguo/pack.json`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/controllers/toolFileChangeController.js` → `src/components/chat/controllers/toolFileChangeController.js`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/voicePackPlayer.js` → `src/utils/voicePackPlayer.js`; `package.json` → `package.json`; `packages/app/cli.js` → `cli.js`; `packages/app/package.json` → `package.json`; `packages/app/server/lib/plugin-loader.js` → `lib/plugin-loader.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/voice-pack-events.js` → `server/lib/voice-pack-events.js`; `scripts/gen-default-voicepack.js` → `scripts/gen-default-voicepack.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `const TURN_ACTIVE_STALE_MS = 30 * 1000;`; `const CHANNEL_FRAME_HANDLERS = {`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `export class ToolFileChangeController {`; `function CrumbDropTarget({ label, path, link, onNavigate, onMove, title, readOnl`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `function CommitRow({ commit, repoPath, expanded, onToggle, onFileClick, onOpenFi`; `const i18nData = {`; `export function shouldWipeApprovalDismissal(prevId, nextId) {`; `export function createChannelState() {`; `export function setTurnEndCooldownMs(ms) {`; `describe('shouldWipeApprovalDismissal', () => {`; `describe('modal upload wiring (button + zoned drag-drop)', () => {`; `const KEYS = [`; `describe('sdk-error dialogue rows — CSS contract', () => {`; `describe('sdk-retry inline bar (批次 B frontend)', () => {`; `describe('persistent Stop button (R8)', () => {`; `describe('ToolFileChangeController — dispose', () => {`; `function mkStreamingHost() {`; `describe('turnActive 把关的 streaming 状态机(镜像)', () => {`; `describe('AppBase.jsx 源码锚点(防重构漂移)', () => {`; `const prefsAllOn = () => ({`; `describe('playEvent — dedupeKey', () => {`; `interface PluginContext {`; `hooks: {`; `export default {`; `wire 上存在两种编码，**解析器与 S8 转换器必须都支持**：`; `bundle predates a server upgrade reloads itself on reconnect mismatch.`.
- Upstream commit message excerpt: * fix(server): close two first-turn SDK rendering failures Two independent server-side fixes that each stalled rendering on the first turn of a fresh `ccv --sdk`: 1. Lost-result backstop no longer swallows the NEXT turn's result. The v1.9.18 lost-result backstop force-settled a turn via a _lateResultTombstones counter that only reset on teardown/reset — never on the next _startTurn. When the result truly never arrived, the stale count swallowed the next turn's normal result (no FIFO shift, no turn_end), so that turn was then mis-settled as turn-stuck too. Replaced with a generation guard: a force-settled turn records its epoch and a late result is discarded only when no live turn can own it; a newer turn's result pairs normally and the stale debt is dropped. The api_retry gate is now epoch-aware and the debt is cleared at session boundaries (death/teardown/reset) so a stale debt can no longer suppress a live turn's retry frames. 2. SSE cold-load window no longer loses live deltas. serv…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-082673509e"></a>
## [082673509e](./cc-viewer-alignment-commit-ledger.md#commit-082673509e) — Revert "perf(web): incremental scan in ToolFileChangeController.check (#164)"

- B0 snapshot comparison: 18 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:30:54+08:00；父提交 1；相对第一父文件数 64。
- 上游生产/配置文件：26；上游测试文件：25。
- 上游测试：`apps/web/test/agent-loop-voice.test.js`, `apps/web/test/approval-dismissal.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdk-error-dialogue.test.js`, `apps/web/test/sdk-retry-inline.test.js`, `apps/web/test/stop-button-turn-active.test.js`, `apps/web/test/tool-file-change-controller.test.js`, `apps/web/test/turn-active-gating.test.js`, `apps/web/test/voice-pack-player.test.js`, `packages/app/test/agent-loop-server-events.test.js`, `packages/app/test/cli-sdk-process-wiring.test.js`, `packages/app/test/events-attach-buffer.test.js`, `packages/app/test/plugin-runtime.test.js`, `packages/app/test/sdk-agent-loop.test.js`, `packages/app/test/sdk-manager-lost-result.test.js`, `packages/app/test/sdk-session-state.test.js`, `packages/app/test/sse-attach-buffer.test.js`, `packages/app/test/turn-end-scope-behavior.test.js`, `packages/app/test/turn-end-scope.test.js`, `packages/app/test/v2-meta-rows.test.js`, `packages/app/test/voice-pack-manager.test.js`, `packages/core/test/voice-pack-events.test.js`, `test/v2-live-feed.test.js`, `test/voice-pack-sanguo-integration.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/public/voice-packs/default/pack.json` → `public/voice-packs/default/pack.json`; `apps/web/public/voice-packs/sanguo/pack.json` → `public/voice-packs/sanguo/pack.json`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/controllers/toolFileChangeController.js` → `src/components/chat/controllers/toolFileChangeController.js`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/voicePackPlayer.js` → `src/utils/voicePackPlayer.js`; `package.json` → `package.json`; `packages/app/cli.js` → `cli.js`; `packages/app/package.json` → `package.json`; `packages/app/server/lib/plugin-loader.js` → `lib/plugin-loader.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/voice-pack-events.js` → `server/lib/voice-pack-events.js`; `scripts/gen-default-voicepack.js` → `scripts/gen-default-voicepack.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `const TURN_ACTIVE_STALE_MS = 30 * 1000;`; `const CHANNEL_FRAME_HANDLERS = {`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `export class ToolFileChangeController {`; `function CrumbDropTarget({ label, path, link, onNavigate, onMove, title, readOnl`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `function CommitRow({ commit, repoPath, expanded, onToggle, onFileClick, onOpenFi`; `const i18nData = {`; `export function shouldWipeApprovalDismissal(prevId, nextId, opts) {`; `export function createChannelState() {`; `export function setTurnEndCooldownMs(ms) {`; `describe('shouldWipeApprovalDismissal', () => {`; `describe('modal upload wiring (button + zoned drag-drop)', () => {`; `const KEYS = [`; `describe('sdk-error dialogue rows — CSS contract', () => {`; `describe('sdk-retry inline bar (批次 B frontend)', () => {`; `describe('persistent Stop button (R8)', () => {`; `describe('ToolFileChangeController — dispose', () => {`; `function mkStreamingHost() {`; `describe('turnActive 把关的 streaming 状态机(镜像)', () => {`; `describe('AppBase.jsx 源码锚点(防重构漂移)', () => {`; `const prefsAllOn = () => ({`; `describe('playEvent — dedupeKey', () => {`; `interface PluginContext {`; `hooks: {`; `export default {`; `wire 上存在两种编码，**解析器与 S8 转换器必须都支持**：`; `bundle predates a server upgrade reloads itself on reconnect mismatch.`.
- Upstream commit message excerpt: This reverts commit 08809f6e69315476690c62bbe238bd5c199b338d.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7641f5181a"></a>
## [7641f5181a](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a) — fix(server): close two first-turn SDK rendering failures

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：5；上游测试文件：4。
- 上游测试：`packages/app/test/events-attach-buffer.test.js`, `packages/app/test/sdk-manager-lost-result.test.js`, `packages/app/test/sse-attach-buffer.test.js`, `packages/app/test/v2-meta-rows.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `wire 上存在两种编码，**解析器与 S8 转换器必须都支持**：`; `bundle predates a server upgrade reloads itself on reconnect mismatch.`; `function _createSession(key, cwd) {`; `const _coldBundleFlight = new SingleFlight({ ttlMs: 500 });`; `export function readV2ColdBundle(sessionDir, { limit = 0, since = null } = {}) {`; `export async function readV2NativeCold(sessionDir, rows) {`; `import { readV2SingleEntry } from '../lib/v2/adapter.js';`; `export async function serveEventStream(sink, params, deps) {`; `const { V2Writer } = await import('../server/lib/v2/v2-writer.js');`; `describe('Pass B wire-agent classification', () => {`.
- Upstream commit message excerpt: Two independent server-side fixes that each stalled rendering on the first turn of a fresh `ccv --sdk`: 1. Lost-result backstop no longer swallows the NEXT turn's result. The v1.9.18 lost-result backstop force-settled a turn via a _lateResultTombstones counter that only reset on teardown/reset — never on the next _startTurn. When the result truly never arrived, the stale count swallowed the next turn's normal result (no FIFO shift, no turn_end), so that turn was then mis-settled as turn-stuck too. Replaced with a generation guard: a force-settled turn records its epoch and a late result is discarded only when no live turn can own it; a newer turn's result pairs normally and the stale debt is dropped. The api_retry gate is now epoch-aware and the debt is cleared at session boundaries (death/teardown/reset) so a stale debt can no longer suppress a live turn's retry frames. 2. SSE cold-load window no longer loses live deltas. serveEventStream deliberately registers the client only after t…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-469a995ad8"></a>
## [469a995ad8](./cc-viewer-alignment-commit-ledger.md#commit-469a995ad8) — fix(web): keep minimised SDK ask modal minimised across view-switch

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：3；上游测试文件：1。
- 上游测试：`apps/web/test/approval-dismissal.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `export function shouldWipeApprovalDismissal(prevId, nextId) {`; `describe('shouldWipeApprovalDismissal', () => {`.
- Upstream commit message excerpt: A view-switch clears pendingAsk (id→null), which the dismissal-wipe policy treated as a genuine clear and wiped the minimise; the attach full replay then re-bubbled the same id via null→id, but the dismissal was already gone so the modal reopened. Tag the view-switch synthetic clear with reason: 'view-switch' so the wipe policy skips it (a real id→null clear still wipes). ask and ptyPlan share the same policy and are both fixed. Coverage: approval-dismissal.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ee3545344e"></a>
## [ee3545344e](./cc-viewer-alignment-commit-ledger.md#commit-ee3545344e) — fix(web): hide SDK error row while its retry is recovering

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/web/test/sdk-retry-inline.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `describe('sdk-retry inline bar (批次 B frontend)', () => {`.
- Upstream commit message excerpt: A manual [retry] marked the failed row 'recovering' but only swapped the [retry] button for an inline 'recovering' tag — the error text still rendered in full, appearing in parallel with the top recovering progress line. Now a recovering row is hidden entirely and only the progress line shows; the row reappears only when the retry fails (recovering reset) and is cleared on success. Removed the now-unreferenced .sdkRetryRecovering style. Coverage: sdk-retry-inline.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-88995a1046"></a>
## [88995a1046](./cc-viewer-alignment-commit-ledger.md#commit-88995a1046) — style(web): cap SDK error bar width at 800px

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/sdk-error-dialogue.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `describe('sdk-error dialogue rows — CSS contract', () => {`.
- Upstream commit message excerpt: The error / retry-progress bar previously spanned the full 1400px message column on wide viewports. Cap it at 800px (sides breathe with the viewport) and keep a 20px-per-side floor below 800px via calc(100% - 40px). Covers both the Virtuoso footer and the empty-state branch via .sdkErrorStack. Coverage: sdk-error-dialogue.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-dd23ce8df1"></a>
## [dd23ce8df1](./cc-viewer-alignment-commit-ledger.md#commit-dd23ce8df1) — feat(web): open file content directly on tree click in file browser

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/file-browser-modal.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `function CrumbDropTarget({ label, path, link, onNavigate, onMove, title, readOnl`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `describe('modal upload wiring (button + zoned drag-drop)', () => {`.
- Upstream commit message excerpt: The grid double-click already opened files (openItem: directory → navigate, file → html/image/content preview), but a single click on a tree file row only selected it. Now clicking an openable file in the tree shows its content directly while keeping the row selection highlight; clicking a directory still expands the right pane as before. Coverage: file-browser-modal.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7797672148"></a>
## [7797672148](./cc-viewer-alignment-commit-ledger.md#commit-7797672148) — style(web): drop author name from GIT changes commit rows

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `function CommitRow({ commit, repoPath, expanded, onToggle, onFileClick, onOpenFi`.
- Upstream commit message excerpt: Each commit row no longer renders the author, leaving more room for the commit subject. Hash / subject / time / line-stat badges are unchanged; the author field still comes back from the server, it is just no longer rendered.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ef5fc8b168"></a>
## [ef5fc8b168](./cc-viewer-alignment-commit-ledger.md#commit-ef5fc8b168) — feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界

- B0 snapshot comparison: 14 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 41。
- 上游生产/配置文件：17；上游测试文件：15。
- 上游测试：`apps/web/test/agent-loop-voice.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/stop-button-turn-active.test.js`, `apps/web/test/turn-active-gating.test.js`, `apps/web/test/voice-pack-player.test.js`, `packages/app/test/agent-loop-server-events.test.js`, `packages/app/test/cli-sdk-process-wiring.test.js`, `packages/app/test/plugin-runtime.test.js`, `packages/app/test/sdk-agent-loop.test.js`, `packages/app/test/sdk-session-state.test.js`, `packages/app/test/turn-end-scope-behavior.test.js`, `packages/app/test/turn-end-scope.test.js`, `packages/app/test/voice-pack-manager.test.js`, `packages/core/test/voice-pack-events.test.js`, `test/voice-pack-sanguo-integration.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/public/voice-packs/default/pack.json` → `public/voice-packs/default/pack.json`; `apps/web/public/voice-packs/sanguo/pack.json` → `public/voice-packs/sanguo/pack.json`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/voicePackPlayer.js` → `src/utils/voicePackPlayer.js`; `package.json` → `package.json`; `packages/app/cli.js` → `cli.js`; `packages/app/package.json` → `package.json`; `packages/app/server/lib/plugin-loader.js` → `lib/plugin-loader.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/voice-pack-events.js` → `server/lib/voice-pack-events.js`; `scripts/gen-default-voicepack.js` → `scripts/gen-default-voicepack.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `const TURN_ACTIVE_STALE_MS = 30 * 1000;`; `const CHANNEL_FRAME_HANDLERS = {`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `const i18nData = {`; `export function createChannelState() {`; `export function setTurnEndCooldownMs(ms) {`; `const KEYS = [`; `describe('persistent Stop button (R8)', () => {`; `function mkStreamingHost() {`; `describe('turnActive 把关的 streaming 状态机(镜像)', () => {`; `describe('AppBase.jsx 源码锚点(防重构漂移)', () => {`; `const prefsAllOn = () => ({`; `describe('playEvent — dedupeKey', () => {`; `interface PluginContext {`; `hooks: {`; `export default {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `const HOOK_TYPES = {`; `function buildPluginContext(rt) {`; `const _eventDispatcher = {`; `const STATE_HEARTBEAT_MS = 10 * 1000;`; `let _runWaterfallHook = null;`; `export function setSdkProcessWiring(w) {`; `function _adoptProcessWiring() {`; `function _createSession(key, cwd) {`; `export function __isEphemeralHostForTests(cwd) {`; `export function initSdkSession(cwd, projectName, { onTurnEnd, onQueryError, broa`; `export function stopSession() {`; `async function setupTerminalWebSocket(httpServer) {`.
- Upstream commit message excerpt: - 活性信号: SDK 消息流按 ≤1/s 合并为 sdk-session-state 活性帧(heartbeat+activity), 覆盖代理层看不见的工具/压缩/子代理阶段; 零额外子进程 IPC(未启用 includePartialMessages) - Turn 关联: sdk-session-state 携带 turnId + 墙钟 turnStartedAt; 服务端丢弃 head 回合 未被 CLI 确认 running 的迟到 idle(承重门控), 前端按 epoch 守卫丢弃传输重排的旧帧; lost-result 兜底在 armed 后有新活动时 disarm(缓解「新回合 running 先于旧 idle」误判) - 权威 loopEnd: 新增 agent_loop_start/agent_loop_end SSE 帧; SDK 从真 result(过滤 task-notification 伪 result)即时发出、绕过防抖; PTY 从 UserPromptSubmit 上升沿/打断、 _emitTurnEnd(防抖后)发出, 两模式统一; 修复伪 result 幻影 turn_end - spinner 即亮: prompt/push 即刻点亮, 不等首个 API 调用 - 语音播报: 新增 agentLoopStart/agentLoopEnd 事件(默认关闭, 18 语言); loopEnd 复用各包 turnEnd 录音, loopStart 为新生成短提示音; 按 turnId 去重, 实际播放后抑制同边界 turnEnd 语音 - 插件: 新增 onAgentLoopStart/onAgentLoopEnd parallel hook(PTY+SDK 双路径同点触发); service 插件 ctx.events.on 增加 agent_loop_start/agent_loop_end - 修复 review 发现: approval pending 时探针永久失效(补 rearm 闭环); teardown/close 路径 补发 session-ended loop end; SDK 依赖下限 ^0.2.91→^0.2.124(result.origin 需要) Coverage: sdk-agent-loop.te…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-bd32d02884"></a>
## [bd32d02884](./cc-viewer-alignment-commit-ledger.md#commit-bd32d02884) — fix(server): live-refresh new message in a resumed history project (SDK mode)

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:34:52+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`test/v2-live-feed.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 5 distinct hunk context(s) extracted (up to 30): `export function readNewLines(cursor, chunkBytes = READ_CHUNK_BYTES, maxLineBytes`; `export class V2LiveFeed {`; `import assert from 'node:assert/strict';`; `describe('migration promote → live feed (OOM guard)', () => {`; `describe('foreign live-owner attach gate', () => {`.
- Upstream commit message excerpt: A history session dir re-attached by the live feed was seeded with suppressExisting, swallowing any bytes already on disk at attach time (offsets advanced, never re-read) — the conversation view stayed frozen on the preloaded history until a cold reload. Cap the suppressed seed at the feed's last-observed byte watermark and read anything past it live. Coverage: v2-live-feed.test.js.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0cbb545288"></a>
## [0cbb545288](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) — perf(web): incremental scan in ToolFileChangeController.check

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:36:20+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/web/test/tool-file-change-controller.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/toolFileChangeController.js` → `src/components/chat/controllers/toolFileChangeController.js`。
- B0 diff inspection: 3 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `export class ToolFileChangeController {`; `describe('ToolFileChangeController — dispose', () => {`.
- Upstream commit message excerpt: check() re-traversed every message of every session AND every request's body.messages twice (collect tool_use, then scan tool_result) on every SSE tick. In a long conversation each request.body.messages is the full accumulated prefix, so the sum is O(context^2) and runs regardless of which session is shown — hence the long stall when sending into a long-context view, even for a brand-new session. Switch to WeakMap<object, scannedMessageCount> cursors: only scan messages appended since the last check, re-scanning the tail entry to catch streaming block merges; keep the tool_use map persistent across calls so a tool_result never loses its tool_use (no missed file-refresh). ChatView calls resetCursors() on a genuine session-list change (cold load / switch) to rebuild from scratch. Coverage: tool-file-change-controller.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1d4ea6e192"></a>
## [1d4ea6e192](./cc-viewer-alignment-commit-ledger.md#commit-1d4ea6e192) — Merge pull request #165 from weiesky/fix/tool-file-monitor-incremental

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:51:28+08:00；父提交 2；相对第一父文件数 4。
- 上游生产/配置文件：2；上游测试文件：1。
- 上游测试：`apps/web/test/tool-file-change-controller.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/toolFileChangeController.js` → `src/components/chat/controllers/toolFileChangeController.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: perf(web): incremental scan in ToolFileChangeController.check

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-66bfeb8c18"></a>
## [66bfeb8c18](./cc-viewer-alignment-commit-ledger.md#commit-66bfeb8c18) — chore(release): 1.9.19

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T14:54:00+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c29af25e64"></a>
## [c29af25e64](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) — fix(server+web): upstream v1.9.19 review — file-tree path, convSeqs single pass, toolUseMap LRU trim, approval guards

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T18:52:18+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：5；上游测试文件：4。
- 上游测试：`apps/web/test/file-browser-modal.test.js`, `apps/web/test/tool-file-change-controller.test.js`, `packages/app/test/sdk-manager-lost-result.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/toolFileChangeController.js` → `src/components/chat/controllers/toolFileChangeController.js`。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `export class ToolFileChangeController {`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `describe('modal upload wiring (button + zoned drag-drop)', () => {`; `describe('ToolFileChangeController — 去重 / LRU', () => {`; `export async function readV2NativeCold(sessionDir, rows) {`; `describe('sdk-manager lost-result generation guard', () => {`; `describe('sdk-manager-query — review 回归（watchdog / 墓碑 / signal / dis`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c0c13bbc86"></a>
## [c0c13bbc86](./cc-viewer-alignment-commit-ledger.md#commit-c0c13bbc86) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-02T11:01:12+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-99256ac1d8"></a>
## [99256ac1d8](./cc-viewer-alignment-commit-ledger.md#commit-99256ac1d8) — fix(web): --sdk mode mobile terminal renders the scratch multi-tab shell

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T02:25:23+08:00；父提交 1；相对第一父文件数 12。
- 上游生产/配置文件：7；上游测试文件：3。
- 上游测试：`apps/web/test/mobile-term-layout.test.js`, `apps/web/test/mobile-touch-scroll.test.js`, `apps/web/test/scratch-workspace-switch.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/terminal/ScratchTerminal.jsx` → `src/components/terminal/ScratchTerminal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalPanel.module.css` → `src/components/terminal/TerminalPanel.module.css`。
- B0 diff inspection: 7 distinct hunk context(s) extracted (up to 30): `class Mobile extends AppBase {`; `class ChatView extends React.Component {`; `import { darkTerminalTheme, lightTerminalTheme, terminalFontFamily } from './ter`; `import { TerminalWriteQueue, INBAND_RESET } from '../../utils/terminalWriteQueue`; `class ScratchTerminal extends React.Component {`; `class TerminalPanel extends React.Component {`; `describe('scratch workspace switch: prop threading', () => {`.
- Upstream commit message excerpt: The Mobile overlay used to mount the main-PTY TerminalPanel, which is inert in SDK mode (server drops input/resize), and the scratchOnly branch hid its tab UI behind a phone gate — phones got a blank xterm with a dead keybar. - Mobile overlay mounts the scratchOnly panel in sdkMode (key-forced remount, overlay is the only mobile host incl. iPad) - ChatView suppresses its embedded terminal block on the whole Mobile tree (both modes): no double scratch mount in SDK, no zoom-scaled resize stealing in PTY mode - scratchOnly branch renders on phones: horizontal tab rail via the JS-driven scratchOnlyPhone modifier (shared with aria-orientation), bottom virtual keybar routed to the active tab's /ws/terminal-scratch socket, 44px touch targets, sticky add button, active tab scrolled into view - ScratchTerminal phone adaptations: fixed 60-col layout measuring the container (soft-keyboard reflow via visualViewport), touch scroll, bounded sizing retry, full unmount cleanup; sendVirtualKey keeps th…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6b340326c6"></a>
## [6b340326c6](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6) — feat(sdk): slow-upstream in-flight advisory

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:05:10+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：5；上游测试文件：1。
- 上游测试：`packages/app/test/proxy-stats.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 8 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `const i18nData = {`; `export function emitProxyStatsUpdate(fileName) {`; `import { executeRequest, extractModel, isStreamResponse } from './lib/proxy/prox`; `export function startProxy() {`; `async function handleLlmApiRequest(req, res, fullUrl, fetchOptions, body, proxyD`; `setProxyStatsListener(notifyProxyStats);`; `describe('proxy-stats appendRecord / notifier (review P2)', () => {`.
- Upstream commit message excerpt: When a non-utility LLM request waits past the slow threshold for any upstream byte, proxy.js emits through a proxy-stats listener; server.js (which already legally holds the SDK accessors and the terminal WS) then broadcasts a workspace-scoped sdk-slow-upstream frame and the frontend toasts a persistent "model slow, still waiting" notice. Utility probes are exempt; PTY/proxy-only processes are a zero-cost no-op. Closes the dead-silence gap where one request hung 164s with zero UI feedback — the CLI only retries a settled failure and the proxy only retries a settled response, so both layers are legitimately idle while the user just stares at a spinner.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0cde7d1df8"></a>
## [0cde7d1df8](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8) — feat(web): SDK mode task checklist HUD via sdk-task WS relay

- B0 snapshot comparison: 5 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:05:11+08:00；父提交 1；相对第一父文件数 17。
- 上游生产/配置文件：10；上游测试文件：4。
- 上游测试：`apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdkTaskTracker.test.js`, `apps/web/test/task-progress-hud.test.js`, `packages/app/test/proxy-slow-upstream.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 20 distinct hunk context(s) extracted (up to 30): `import { publish as publishTaskUpdate, clearTasks as clearTaskStore } from './ut`; `class AppBase extends React.Component {`; `import TaskProgressHud from './TaskProgressHud';`; `class ChatView extends React.Component {`; `const TOUCH_TRIGGER_PROPS = (isMobile && !isPad)`; `export default function TaskProgressHud() {`; `const DOT_CLASS = {`; `function TaskStatusDot({ status }) {`; `function TaskRow({ task }) {`; `const i18nData = {`; `function _emit() {`; `const KEYS = [`; `describe('new UI key i18n coverage', () => {`; `describe('TaskProgressHud progress dots contract', () => {`; `export function emitProxyStatsUpdate(fileName) {`; `const SLOW_UPSTREAM_MS = 30 * 1000;`; `async function handleLlmApiRequest(req, res, fullUrl, fetchOptions, body, proxyD`; `import { proxyStatsRoutes } from './routes/proxy-stats.js';`; `setProxyStatsListener(notifyProxyStats);`; `setSlowUpstreamListener(({ projectKey, waitingMs, model } = {}) => {`.
- Upstream commit message excerpt: --sdk mode: TaskProgressHud now works. New sdkTaskTracker consumes server-relayed WS sdk-task frames (task_started/progress/updated/ notification), merges them client-side into taskStore-compatible snapshots, and feeds the existing HUD. Key behaviors: - _sdkFrameMatchesView guard on the sdk-task WS branch (ChatView) - Session-boundary reset: new sessionId clears stale tasks - task_started re-fire resets status to in_progress (id reuse safe) - task_progress reads frame.description (not summary) for subject - STATUS_MAP uses Map to avoid prototype-chain lookups - Comments updated in TaskProgressHud/ChatView to reflect SDK path - PTY mode unaffected (sdk-task frames only exist in SDK mode) Coverage: sdkTaskTracker.test.js (22 tests)

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-791a5e18f8"></a>
## [791a5e18f8](./cc-viewer-alignment-commit-ledger.md#commit-791a5e18f8) — feat(web): raise chat composer max height from 6 to 12 lines

- B0 snapshot comparison: 2 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:05:11+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：2；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `const MIN_LINES = 1;`.
- Upstream commit message excerpt: The composer autosize clamp (MAX_LINES) and its matching desktop CSS max-height go from 6 to 12 lines (content 126px→252px, box 136px→268px), so longer drafted messages stay visible instead of scrolling early. Mobile is unchanged (legacy 160px whole-box path).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-92ed9bc751"></a>
## [92ed9bc751](./cc-viewer-alignment-commit-ledger.md#commit-92ed9bc751) — fix(content): unify UltraReview prompt to the TeamCreate-free version

- B0 snapshot comparison: 40 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:05:11+08:00；父提交 1；相对第一父文件数 80。
- 上游生产/配置文件：4；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`; `packages/app/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`; `packages/content/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`。
- B0 diff inspection: 24 distinct hunk context(s) extracted (up to 30): `const i18nData = {`; `export const ULTRAPLAN_VARIANTS = {`; `Otherwise, if the project is managed with Git:`; `Pre-requisites:`; `export function buildCustomTemplate(content) {`; `Your final plan must include the following elements:`; `Below are the two raw prompt templates UltraPlan actually sends to Claude Code (`; `Den oprindelige skabelon lister 6 elementer i en "implementeringsplan". Din leve`; `Die ursprüngliche Vorlage listet 6 Elemente eines „Implementierungsplans" auf`; `The original template lists 6 elements of an "implementation plan". Your deliver`; `La plantilla original enumera 6 elementos de un «plan de implementación». Tu`; `Le modèle d'origine répertorie 6 éléments d'un « plan d'implémentation ».`; `Il modello originale elenca 6 elementi di un "piano di implementazione". Il tuo`; `Research Expert は 6 つの潜在的なロール（業界スカウト、学術`; `Research Expert는 6개의 잠재적 역할을 나열합니다 (산업 스카우`; `Den opprinnelige malen lister 6 elementer i en "implementeringsplan". Din levera`; `Oryginalny szablon wymienia 6 elementów "planu wdrożenia". Twój deliverable m`; `O modelo original lista 6 elementos de um "plano de implementação". Seu entreg`; `Research Expert перечисляет 6 потенциальных ролей (`; `Research Expert ระบุ 6 บทบาทที่เป็นไปได`; `Orijinal şablon "uygulama planının" 6 öğesini listeler. Teslimatınız tama`; `Research Expert перелічує 6 потенційних ролей (галу`; `Research Expert 派了 6 種潛在角色（industry 調研員、學術研究員`; `UltraPlan 提供两个专家角色，针对不同类型的任务：`.
- Upstream commit message excerpt: The codeExpert review block now reads "build a team via the Agent tool (teammates are named, subagents are not) → multi-role review → fix P0/P1 and evaluate P2 dialectically → close by notifying each teammate to exit", replacing the stale "adopt P0/P1, discard P2/P3, TeamCreate/TeamDelete" wording. Also drop the lingering `TeamCreate` reference from the scoped-instruction tool list in the codeExpert/customContent templates and the CustomUltraplanExpert embedded prompt (the tool does not exist), and switch the pre-req to "recursively locate the .git directory". Aligned across all 18 locales of UltraPlan.md / CustomUltraplanExpert.md, code-expert.json, ultraplanTemplates.js, and the i18n customContent prefill skeleton; ultraplan-origin.md rewritten wholesale to the new version. Coverage: ultraplan-templates.test.js, builtin-presets.test.js.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d90ac9587d"></a>
## [d90ac9587d](./cc-viewer-alignment-commit-ledger.md#commit-d90ac9587d) — fix(web): render blank-whitespace text as no bubble instead of empty chat-boxer

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:05:11+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/chat-blank-bubble.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `class ChatMessage extends React.Component {`.
- Upstream commit message excerpt: A whitespace-only text block (' ', '\n\n') is truthy, so it passes the if (tb.text)/if (!block.text) guards in both shared render paths, yet renderAssistantText parses it to zero segments. The wrapper <div className="chat-boxer"> is still created unconditionally, and .chat-boxer has background/border/padding even with no children, so it renders as a visible empty bubble. Main messages hide this because ChatView pre-filters blank text via isSystemText; SubAgent/Teammate respContent is passed through unfiltered, so the blank bubble surfaces there. Fix at the shared render layer: in both the legacy and the web-search in-order paths, skip when renderAssistantText yields zero segments before creating the chat-boxer. This covers Main/SubAgent/TeamSessionPanel/ Last Response/merged run at once, and a legal empty system-tag (a non-empty system-tag segment) is not over-deleted.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2ea5181df8"></a>
## [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8) — fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2

- B0 snapshot comparison: 23 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:05:11+08:00；父提交 1；相对第一父文件数 47。
- 上游生产/配置文件：7；上游测试文件：2。
- 上游测试：`apps/web/test/mobile-touch-scroll.test.js`, `apps/web/test/ultraplan-teamcreate-free.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 11 distinct hunk context(s) extracted (up to 30): `export function resizeChatTextarea(ta, { focused = false } = {}) {`; `class ChatView extends React.Component {`; `export function attachMobileTouchScroll(terminal, container) {`; `let _sessionId = null;`; `export function applyFrame(frame) {`; `export function clear() {`; `describe('attachMobileTouchScroll', () => {`; `const SLOW_UPSTREAM_MS = 30 * 1000;`; `async function handleLlmApiRequest(req, res, fullUrl, fetchOptions, body, proxyD`; `setProxyStatsListener(notifyProxyStats);`; `setSlowUpstreamListener(({ type, cwd, instanceKey, waitingMs, model } = {}) => {`.
- Upstream commit message excerpt: Slow-upstream advisory: - Toast gets a 90s bounded fallback and is destroyed on workspace switch / unmount, so a lost resolved frame can never pin it forever (P1). - Track pending slow requests by requestId so concurrent requests do not clobber one shared toast; a resolve only clears its own (P2). - waitingMs now ticks client-side every 5s instead of freezing at the 30s emit threshold (P2). - Server cwd fallback only applies when no instance was reported, so scheduled-task ephemeral sessions are not misread as foreground waits (P2). - The slow timer now runs until the first BODY chunk, not headers (P2). Composer: pad-mode max-height raised to 268px (12 lines); the JS clamp no longer subtracts padding that border-box already includes (P2). sdkTaskTracker: workspace-owner awareness (view switch no longer shows the previous project's checklist) + reset a new batch when task_started arrives with all tasks terminal (P2). Teammate.md: drop TeamCreate/TeamDelete references across 18 locales x…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b01ff6f502"></a>
## [b01ff6f502](./cc-viewer-alignment-commit-ledger.md#commit-b01ff6f502) — test(server): stabilize slow-upstream advisory test (CI flake)

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:32:38+08:00；父提交 1；相对第一父文件数 2。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`packages/app/test/proxy-slow-upstream.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/server/proxy.js` → `proxy.js`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `export function startProxy() {`; `export const __testing = {`; `after(() => {`; `describe('proxy.js slow-upstream advisory', () => {`.
- Upstream commit message excerpt: The `waitingMs >= 40` assertion was timing-sensitive: on a slow CI runner the 200ms mock fetch can land before the assertion reads the captured frame, shrinking the measured wait below the threshold and failing spuriously (PR #166 CI). Relax it to assert waitingMs is a positive number and add the requestId linkage assertions the feature now provides. Also expose the proxy server on the __testing seam and close it in the suite's after() so the listener doesn't linger (a long-standing teardown gap; the remaining StatWatcher/dispatcher handles are a pre-existing baseline issue, not introduced here).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-14d85f8ce6"></a>
## [14d85f8ce6](./cc-viewer-alignment-commit-ledger.md#commit-14d85f8ce6) — Merge pull request #166 from weiesky/release/slow-hud-cr-fixes

- B0 snapshot comparison: 69 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:36:54+08:00；父提交 2；相对第一父文件数 150。
- 上游生产/配置文件：22；上游测试文件：10。
- 上游测试：`apps/web/test/chat-blank-bubble.test.js`, `apps/web/test/mobile-term-layout.test.js`, `apps/web/test/mobile-touch-scroll.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/scratch-workspace-switch.test.js`, `apps/web/test/sdkTaskTracker.test.js`, `apps/web/test/task-progress-hud.test.js`, `apps/web/test/ultraplan-teamcreate-free.test.js`, `packages/app/test/proxy-slow-upstream.test.js`, `packages/app/test/proxy-stats.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/terminal/ScratchTerminal.jsx` → `src/components/terminal/ScratchTerminal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalPanel.module.css` → `src/components/terminal/TerminalPanel.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/server.js` → `server.js`; `packages/app/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`; `packages/content/ultraAgents/code-expert.json` → `ultraAgents/code-expert.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(sdk+web): slow-upstream advisory, SDK task HUD, UltraReview cleanup, composer & blank-bubble fixes

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-fd84486429"></a>
## [fd84486429](./cc-viewer-alignment-commit-ledger.md#commit-fd84486429) — chore(release): 1.9.20

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:38:20+08:00；父提交 1；相对第一父文件数 10。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a09bc713ea"></a>
## [a09bc713ea](./cc-viewer-alignment-commit-ledger.md#commit-a09bc713ea) — Merge pull request #167 from weiesky/chore/release-1.9.20

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-03T23:42:37+08:00；父提交 2；相对第一父文件数 10。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: chore(release): 1.9.20

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a3cc12619f"></a>
## [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) — fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-04T03:12:45+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：7；上游测试文件：1。
- 上游测试：`packages/app/test/proxy-slow-upstream.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/terminal/ScratchTerminal.jsx` → `src/components/terminal/ScratchTerminal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `import { publish as publishTaskUpdate, clearTasks as clearTaskStore } from './ut`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `class ScratchTerminal extends React.Component {`; `class TerminalPanel extends React.Component {`; `export function clear() {`; `async function handleLlmApiRequest(req, res, fullUrl, fetchOptions, body, proxyD`; `setSlowUpstreamListener(({ type, requestId, cwd, instanceKey, waitingMs, model }`; `describe('proxy.js slow-upstream advisory', () => {`.
- Upstream commit message excerpt: P1-1: the toast revived ~5s after a view/instance switch and never cleared. message.destroy alone was insufficient — the 5s tick re-opened it while _slowUpstreamPending was non-empty, and the old view's resolved frame is dropped by _sdkFrameMatchesView. Introduce _clearSlowUpstreamToast (stop tick + clear pending + destroy) and call it from the shared viewSwitched/planLostView/instanceTransition block and componentWillUnmount; drop the standalone destroy in the viewProject branch (which also missed pure instance switches). P1-2: markFirstByte was dead code — executeRequest resolves at headers and the finally cleared the timer there, so behavior was time-to-headers despite the comments. markFirstByte now emits resolved and clears the timer (wired to the body stream's data/error/close), the finally is an error-path-only backstop, and every terminal path (502, response.text(), no body) settles. New test covers the headers-fast-then-stalled-body case the old body:null stub missed. P2: serv…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1bfc1585e8"></a>
## [1bfc1585e8](./cc-viewer-alignment-commit-ledger.md#commit-1bfc1585e8) — fix(web): persist --sdk scratch terminal open state across refresh

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-04T03:13:14+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/scratch-open-persist.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`.
- Upstream commit message excerpt: The SDK [终端] (scratch multi-tab terminal) lived only in App.state.scratchOpen (default false) and was never persisted, so a page refresh always closed it — unlike the PTY terminal, which merely defaults to `true` and so only appears remembered. Follow the existing global ccv_ panel-open convention (same as ccv_fileExplorerOpen / ccv_gitChangesOpen): App initializes scratchOpen from localStorage['ccv_scratchOpen'] and both toggle sites (header button + chat right-edge chevron) route through a new _setScratchOpen that writes the key. Global single value, default closed; deliberately not reusing the PTY panel's nested cc-viewer-scratch-open key (a different surface, to avoid cross-mode coupling).

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ccf74880a5"></a>
## [ccf74880a5](./cc-viewer-alignment-commit-ledger.md#commit-ccf74880a5) — fix(web): render unmerged git status badges (UU/AA/DD/...) in red

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-04T12:16:31+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `const STATUS_COLORS = {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-32165d3a0b"></a>
## [32165d3a0b](./cc-viewer-alignment-commit-ledger.md#commit-32165d3a0b) — chore(release): 1.9.21

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-04T12:34:40+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-7a0ba39edf"></a>
## [7a0ba39edf](./cc-viewer-alignment-commit-ledger.md#commit-7a0ba39edf) — test(app): deflake git + scheduled-task tests — poll async launch, retry rmSync cleanup

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-04T15:23:00+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：0；上游测试文件：9。
- 上游测试：`packages/app/test/api-git-routes.test.js`, `packages/app/test/git-diff.test.js`, `packages/app/test/git-repos.test.js`, `packages/app/test/git-restore.test.js`, `packages/app/test/git-unpushed.test.js`, `packages/app/test/scheduled-task-routes.test.js`, `packages/app/test/scheduled-task-runs-store.test.js`, `packages/app/test/scheduled-task-scheduler.test.js`, `packages/app/test/scheduled-task-store.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 22 distinct hunk context(s) extracted (up to 30): `describe('gitRepos GET /api/git-repos', { concurrency: false }, () => {`; `describe('gitStatus GET /api/git-status', { concurrency: false }, () => {`; `describe('gitDiff GET /api/git-diff', { concurrency: false }, () => {`; `describe('gitLogUnpushed GET /api/git-log-unpushed', { concurrency: false }, ()`; `describe('gitRestore POST /api/git-restore', { concurrency: false }, () => {`; `after(() => {`; `describe('getGitDiffs', () => {`; `describe('countUntrackedLines', () => {`; `describe('resolveRepoCwd security', () => {`; `describe('/api/git-repos endpoint logic', () => {`; `describe('POST /api/git-restore', { concurrency: false }, () => {`; `describe('isPathContained() — cross-platform separator', () => {`; `describe('getUnpushedCommits', () => {`; `describe('getGitDiffs with commitHash', () => {`; `const { initForWorkspace } = await import('../server/interceptor.js');`; `beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'ccv-str-')); });`; `beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'ccv-sched-')); });`; `test('runTaskNow: claims and executes, broadcasts running + final', async () =>`; `test('executor errors are contained and reported, not thrown (compliance P0)', a`; `test('tick: a due task is claimed + executed + broadcast (real _tick drive)', as`; `beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'ccv-st-')); });`; `test('finalizeTask: runs append failure keeps the claim (runs_unavailable), no s`.
- Upstream commit message excerpt: - scheduled-task-scheduler: replace fixed setTimeout waits with waitFor polling for the fire-and-forget _launch broadcast (executor-error test raced on CI). - git-integration + scheduled-task test files: add maxRetries/retryDelay to recursive rmSync cleanup — real git child processes linger past afterEach and intermittently threw ENOTEMPTY on teardown under parallel load.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-b23c137372"></a>
## [b23c137372](./cc-viewer-alignment-commit-ledger.md#commit-b23c137372) — fix(logs): auto-shard oversized session logs by prompt count + manual per-shard load

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-05T18:45:17+08:00；父提交 1；相对第一父文件数 27。
- 上游生产/配置文件：21；上游测试文件：3。
- 上游测试：`packages/app/test/v2-session-list.test.js`, `packages/app/test/v2-shard-manager.test.js`, `packages/app/test/v2-shard-routes.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/server/interceptor.js` → `interceptor.js`; `packages/app/server/lib/log-management.js` → `lib/log-management.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `class ChatView extends React.Component {`; `const i18nData = {`; `export function createChannelState() {`; `LOG_DIR/<project>/sessions/<session_id>/`; `export function setupInterceptor() {`; `export class AsyncWriteQueue {`; `import { reconstructEntries } from '@ccv/core/delta-reconstructor';`; `import { isLogFileName, LIVE_SESSION_MTIME_MS } from './log-file-utils.js';`; `export function listV2LogsPage(logDir, project, { page = 1, pageSize = 50 } = {}`; `export function deleteLogFiles(logDir, files, opts = {}) {`; `import { isMainAgentRequest } from '../interceptor-core.js';`; `import { listV2Sessions } from './session-list.js';`; `export class SessionSynthesizer {`; `function* iterateSessionItems(sessionDir, opts = {}) {`; `export function _v2WindowStatsForTest(reset = false) {`; `export async function scanV2Descriptors(sessionDir) {`; `function selectV2Window(scan, opts = {}) {`; `export async function computeV2Window(sessionDir, opts = {}) {`; `async function materializeV2Window(sessionDir, win, { collect = false, onEntry =`; `export async function readV2WindowedEntries(sessionDir, opts = {}) {`; `export async function streamV2WindowedEntries(sessionDir, opts, onEntry) {`; `export class ConversationStore {`; `import { iterateJsonlLines } from './jsonl-read.js';`; `export class Journal {`; `export class V2LiveFeed {`; `export function listSessionIds(projectDir, sessionsDirName = 'sessions') {`; `export function readSession(projectDir, sessionId, sessionsDirName = 'sessions')`.
- Upstream commit message excerpt: A session's main conversation past 2000 user prompts is archived into its own parts/<N>/ subdir at a quiescent request boundary (no in-flight request, idle write queue) — cutting at a whole user-prompt→loop boundary — and a fresh skeleton keeps writing at the root. Journal seq stays continuous across shards; the conversation store inherits count/fps/epoch so the first post-cut request writes only its increment (no full-history snapshot rewrite). The session stays ONE folder: copy/download/delete carry all of its history. Cold load / startup now read only the latest shard; older shards load on demand via a top "load earlier history" button that walks a seq cursor across shards and prepends them. Fixes the 653MB-log startup freeze (the cold-load replay parsed the whole dir into memory and stalled the event loop). Coverage: v2-shard-manager.test.js, v2-shard-routes.test.js.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-57c732d037"></a>
## [57c732d037](./cc-viewer-alignment-commit-ledger.md#commit-57c732d037) — feat(server): add CCV_BASE_URL for cloud reverse-proxy deployment

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-05T21:41:54+08:00；父提交 1；相对第一父文件数 77。
- 上游生产/配置文件：10；上游测试文件：43。
- 上游测试：`packages/app/test/agent-loop-server-events.test.js`, `packages/app/test/api-auth.test.js`, `packages/app/test/api-base-path.test.js`, `packages/app/test/api-base-url.test.js`, `packages/app/test/api-claude-md.test.js`, `packages/app/test/api-dingtalk.test.js`, `packages/app/test/api-im.test.js`, `packages/app/test/api-project-memory.test.js`, `packages/app/test/auth-lib.test.js`, `packages/app/test/base-path-lib.test.js`, `packages/app/test/base-url-lib.test.js`, `packages/app/test/branch-cli.test.js`, `packages/app/test/branch-server.test.js`, `packages/app/test/events-kv-context-scan.test.js`, `packages/app/test/git-restore.test.js`, `packages/app/test/plugin-mount-prefixes.test.js`, `packages/app/test/plugin-service-integration.test.js`, `packages/app/test/search-endpoint.test.js`, `packages/app/test/server-ask-hook-map.test.js`, `packages/app/test/server-auth-branches.test.js`, `packages/app/test/server-base-url-startup.test.js`, `packages/app/test/server-cli-mode.test.js`, `packages/app/test/server-cli-startup.test.js`, `packages/app/test/server-http-extra-2.test.js`, `packages/app/test/server-http-extra.test.js`, `packages/app/test/server-im-worker.test.js`, `packages/app/test/server-lifecycle.test.js`, `packages/app/test/server-logs.test.js`, `packages/app/test/server-malformed-host.test.js`, `packages/app/test/server-plugins.test.js`, `packages/app/test/server-ports-busy.test.js`, `packages/app/test/server-residual.test.js`, `packages/app/test/server-resync-request.test.js`, `packages/app/test/server-startup-extra.test.js`, `packages/app/test/server-v2-read.test.js`, `packages/app/test/server-ws-branches.test.js`, `packages/app/test/server.test.js`, `packages/app/test/turn-active.test.js`, `packages/app/test/turn-end-debounce.test.js`, `packages/app/test/turn-end-scope-behavior.test.js`, `packages/app/test/usepassword-startup.test.js`, `packages/app/test/v2-entry-endpoint.test.js`, `packages/app/test/ws-instance-isolation.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/vite.config.js` → `vite.config.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/auth.js` → `lib/auth.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `cc-viewer works in a single container or on a cloud host where you reach the UI`; `export default defineConfig(() => {`; `How local config maps to a cloud database and the cloud-sync model (cloud-author`; `interface PluginContext {`; `await; keep React 18 / antd 5 major versions aligned with the host.`; `node build.mjs                       # 产出 panel/index.js（import 了 css`; `import { inspectShellHook } from './server/lib/shell-hook-inspect.js';`; `async function runCliMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `const i18nData = {`; `export function getLang() {`; `export function t(key, params) {`; `export function tFor(key, lang, params) {`; `function escapeHtml(s) {`; `export function renderLoginPage({ lang = 'en', error = false } = {}) {`; `export function validateBasePath(raw) {`; `export function stripBasePath(pathname, normalizedBase) {`; `import { createProxyTracker, createPluginAgent, proxyHttpRequest, proxyUpgrade }`; `function currentMountTarget(rt) {`; `import { runWaterfallHook } from '../lib/plugin-loader.js';`; `async function localUrl(req, res, parsedUrl, isLocal, deps) {`; `import { migrateCredentialsToVault } from './lib/credential-migrate.js';`; `function checkHostAllowed(hostHeaderValue) {`; `async function handleRequest(req, res) {`; `async function _doStart() {`; `function installUpgradeRouter(httpServer) {`; `delete process.env.CCV_SDK_MODE;`; `delete process.env.CCV_PASSWORD;`; `delete process.env.CCV_BASE_PATH;`; `process.env.CCV_CLI_MODE = '0';`.
- Upstream commit message excerpt: One env var accepts host/path, /path, scheme://host/path, or //host/path (ws/wss normalized to http/https). The extracted prefix drives the existing base-path machinery (HTTP/WS strip, <base> injection, plugin mounts, startup/QR URLs), matching both literal {token} segments and their percent-encoded request forms; the bare prefix serves the app root. A host is merged into the Host allowlist and used to build external links (startup External line, auto-open, /api/local-url QR) with scheme resolution explicit > X-Forwarded-Proto > https, always carrying ccv's own ?token=. CCV_BASE_URL takes precedence over CCV_BASE_PATH; invalid values fall back with a warning (4 new i18n keys x 18 locales). Also fixes: password login page posting to an unprefixed endpoint behind a prefix-preserving proxy; i18n interpolation re-substituting a {token} path segment with the access token (now single-pass); plugin cookie Path using the wire-encoded prefix. Docs: docs/base-url.md / docs/base-url.zh.md (+ READ…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ff0fe1ba93"></a>
## [ff0fe1ba93](./cc-viewer-alignment-commit-ledger.md#commit-ff0fe1ba93) — fix(web): keep pasted composer images across incoming chat updates

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-05T22:34:01+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：1。
- 上游测试：`apps/web/test/chat-pending-images-guard.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`。
- B0 diff inspection: 2 distinct hunk context(s) extracted (up to 30): `import { refreshResolvedModelInfo, healUnresolvedTeammateEntries, needsFullReqRe`; `class ChatView extends React.Component {`.
- Upstream commit message excerpt: ChatView.componentDidUpdate cleared pendingImages unguarded on every mainAgentSessions reference change, but mergeMainAgentSessions returns a fresh outer array on every streaming tick — so an image pasted into the composer was wiped as soon as the next request arrived. The clear now runs only when the session-list identity actually changes, comparing getSessionStableId by value: same-conversation rebuilds (in-place tail replacement at turn completion, cold-load replays, shard prepends) keep attachments, as does the first commit after mount; real session appends/turnover and view switches still clear them.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-4391792212"></a>
## [4391792212](./cc-viewer-alignment-commit-ledger.md#commit-4391792212) — review(3-commit CR): harden shard cursor/seeding + base-url parsing, dedupe shard cut resolution, translate new comments

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-06T01:01:19+08:00；父提交 1；相对第一父文件数 31。
- 上游生产/配置文件：17；上游测试文件：12。
- 上游测试：`apps/web/test/chat-pending-images-guard.test.js`, `packages/app/test/api-base-url.test.js`, `packages/app/test/auth-lib.test.js`, `packages/app/test/base-path-lib.test.js`, `packages/app/test/base-url-lib.test.js`, `packages/app/test/plugin-mount-prefixes.test.js`, `packages/app/test/server-base-url-startup.test.js`, `packages/app/test/server-cli-mode.test.js`, `packages/app/test/v2-session-list.test.js`, `packages/app/test/v2-shard-manager.test.js`, `packages/app/test/v2-shard-routes-http.test.js`, `packages/app/test/v2-shard-routes.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/log-management.js` → `lib/log-management.js`; `packages/app/server/lib/v2/layout.js` → `lib/log-v2/layout.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `fix(logs): auto-shard oversized session logs by prompt count + manual per-shard`; `class AppBase extends React.Component {`; `class ChatView extends React.Component {`; `describe('ChatView composer attachments vs incoming conversation updates', () =>`; `async function runCliMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `export function normalizeBasePath(raw) {`; `export function validateBasePath(raw) {`; `export function wireBasePath(normalizedBase) {`; `export function wireBasePathVariants(normalizedBase) {`; `export function parseBaseUrl(raw) {`; `import { reconstructEntries } from '@ccv/core/delta-reconstructor';`; `import { isLogFileName, LIVE_SESSION_MTIME_MS } from './log-file-utils.js';`; `export function listV2LogsPage(logDir, project, { page = 1, pageSize = 50 } = {}`; `import { LIVE_SESSION_MTIME_MS } from '../log-file-utils.js';`; `import { listV2Sessions } from './session-list.js';`; `function* iterateSessionItems(sessionDir, opts = {}) {`; `export async function readV2WindowedEntries(sessionDir, opts = {}) {`; `export async function readV2ShardEntries(sessionDir, opts = {}) {`; `export class ConversationStore {`; `import { dirname, join } from 'node:path';`; `export class Journal {`; `import { readdir as readdirAsync, stat as statAsync } from 'node:fs/promises';`; `export function ensureConvDirSync(paths, convKey) {`; `import { listSessionIds } from './replay.js';`; `import { isForeignLiveOwned } from './session-owner.js';`; `function _hasArchivedParts(dir) {`; `export function sessionHasMainOrTeammateReq(dir) {`; `import { join, basename } from 'node:path';`; `import { reportSwallowed } from '../../lib/error-report.js';`.
- Upstream commit message excerpt: Follow-up to the 3-commit review (ff0fe1ba / 57c732d0 / b23c1373): - images: guard now compares a VALUE cache of stable ids (_prevStableIds) so an epoch-less big-drop replacement that re-stamps the SAME session object's messages[0]._timestamp is caught; shard-prepend skip requires the baseline tail to survive (a same-commit live append still clears). 4 new cases. - sharding: /events cold-load shard cursor refined to the delivered window's oldestSeq (was jumping past the active shard's pre-window prefix); restart prompt re-seed reads live meta.shardPromptsActive (persisted at rotation) instead of the archived, PROMPTS-capped prompts.jsonl line count; AppBase shard-loading flag tracked on the owning vm (mid-load view switch no longer wedges the button); shardPrependCount written to the load's target vm; adapter active-shard branch passes noBaselinePromotion and keys the window flight on it; bare catches in journal/session-select now reportSwallowed. - shard cut resolution deduped into sh…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0dfb4e13c5"></a>
## [0dfb4e13c5](./cc-viewer-alignment-commit-ledger.md#commit-0dfb4e13c5) — chore(release): 1.9.22

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-06T01:03:27+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-3ce8f67a1c"></a>
## [3ce8f67a1c](./cc-viewer-alignment-commit-ledger.md#commit-3ce8f67a1c) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-09T11:28:16+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2914d6479d"></a>
## [2914d6479d](./cc-viewer-alignment-commit-ledger.md#commit-2914d6479d) — feat(web): quick-fill time buttons for one-time scheduled tasks (#169)

- B0 snapshot comparison: 18 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-10T23:16:37+08:00；父提交 1；相对第一父文件数 66。
- 上游生产/配置文件：29；上游测试文件：17。
- 上游测试：`apps/web/test/active-agents-bar.test.js`, `apps/web/test/activeAgents.test.js`, `apps/web/test/chat-active-agents-wiring.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/schedule-i18n.test.js`, `apps/web/test/schedule-modal-anchor.test.js`, `apps/web/test/sdkTaskTracker.test.js`, `apps/web/test/ultraplan-panel-embedded.test.js`, `apps/web/test/ultraplan-templates.test.js`, `packages/app/test/ensure-hooks.test.js`, `packages/app/test/findcc-gap.test.js`, `packages/app/test/im-bridge-core.test.js`, `packages/app/test/pty-manager-gap.test.js`, `packages/app/test/scheduled-task-executor.test.js`, `packages/app/test/scheduled-task-routes.test.js`, `packages/app/test/scheduled-task-store.test.js`, `packages/app/test/sdk-task-table.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/terminal/UltraplanPanel.jsx` → `src/components/terminal/UltraplanPanel.jsx`; `apps/web/src/components/terminal/UltraplanPanel.module.css` → `src/components/terminal/UltraplanPanel.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/ultraplanController.js` → `src/utils/ultraplanController.js`; `apps/web/src/utils/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`; `packages/app/cli.js` → `cli.js`; `packages/app/package.json` → `package.json`; `packages/app/server/lib/ensure-hooks.js` → `lib/ensure-hooks.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`; `packages/core/src/contentFilter.js` → `src/utils/contentFilter.js`; `packages/core/src/ultraplanTemplates.js` → `src/utils/ultraplanTemplates.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `Once configured, just use the 'claude' command as usual. Visit 'http://localhost`; `import RoleFilterBar from './RoleFilterBar';`; `import TaskProgressHud from './TaskProgressHud';`; `class ChatView extends React.Component {`; `import { subscribeScheduledTasks } from '../../utils/scheduledTaskEvents';`; `const KINDS = ['hourly', 'daily', 'weekdays', 'weekly', 'cron', 'once'];`; `function _emptyDraft() {`; `function _taskToDraft(task) {`; `export default function ScheduleTaskModal({ open, onClose, project, instance, se`; `export default function UltraplanPanel({`; `const i18nData = {`; `const REASON_KEY = {`; `import { publish as publishTaskUpdate, clearTasks as clearTaskStore } from './ta`; `export function applyFrame(frame) {`; `export function resetForView() {`; `export class UltraplanController {`; `const KEYS = [`; `describe('new UI key i18n coverage', () => {`; `describe('ui.schedule i18n coverage', () => {`; `describe('ScheduleTaskModal component', () => {`; `import assert from 'node:assert/strict';`; `describe('utils/sdkTaskTracker.js', () => {`; `describe('ultraplanTemplates: buildLocalUltraplan', () => {`; `ccv -h`; `Efter konfiguration bruger du 'claude'-kommandoen som normalt. Besøg 'http://lo`; `Nach der Konfiguration verwenden Sie den Befehl 'claude' wie gewohnt. Besuchen S`; `Una vez configurado, use el comando 'claude' normalmente. Visite 'http://localho`; `Une fois configuré, utilisez la commande 'claude' normalement. Visitez 'http://`; `Una volta configurato, usa il comando 'claude' normalmente. Visita 'http://local`; `Etter konfigurasjon bruker du 'claude'-kommandoen som normalt. Besøk 'http://lo`.
- Upstream commit message excerpt: * feat(web): active SubAgent/Teammate avatar strip in --sdk chat panel Add a frosted-glass strip docked to the conversation panel's top-right in --sdk mode, listing live local_agent/in_process_teammate agents derived from WS sdk-task frames (taskStore snapshot). 28px strip, 24px circular avatars (teammates reuse getTeammateAvatar, anonymous subagents use sub-* glyphs; identity resolved via toolUseId/prompt-prefix join against the MainAgent's Agent tool_use). Click an avatar to filter the conversation to that agent, click again or the trailing (ALL) chip to restore everything; mutually exclusive with the role filter; auto-hides and resets the focus once every agent ends. Includes a focus-reset effect (dead focus restores "all"), a zero-hit fallback that never blanks the list or hides the main agent's Last Response/streaming overlay, and full focus lifecycle cleanup on view/session switch and history-pin. fix(web): keep the chat column visible on narrow windows — .chatSection gets min-wi…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-839f0f85ac"></a>
## [839f0f85ac](./cc-viewer-alignment-commit-ledger.md#commit-839f0f85ac) — fix(kimi-k3): add tool-error circuit-breaker section to preset

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T00:53:23+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `IMPORTANT: Never generate or guess URLs unless you are confident they help the u`.
- Upstream commit message excerpt: Fix TaskUpdate empty-call infinite loop: read the error first, distinguish invalid-argument from transient failure, retry at most once with changed arguments, hard-stop and report after two consecutive identical failures.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1ae82a825b"></a>
## [1ae82a825b](./cc-viewer-alignment-commit-ledger.md#commit-1ae82a825b) — chore(history): archive Unreleased entries under 1.9.23

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T00:54:30+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6081b5d01a"></a>
## [6081b5d01a](./cc-viewer-alignment-commit-ledger.md#commit-6081b5d01a) — feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting

- B0 snapshot comparison: 20 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T10:57:00+08:00；父提交 1；相对第一父文件数 42。
- 上游生产/配置文件：28；上游测试文件：12。
- 上游测试：`apps/web/test/ask-auto-answer-menu.test.js`, `apps/web/test/ask-flow-controller.test.js`, `apps/web/test/auto-approve-options.test.js`, `apps/web/test/deadline-countdown.test.js`, `apps/web/test/quick-settings-i18n.test.js`, `packages/app/test/api-ask-perm-extra.test.js`, `packages/app/test/ask-auto-answer.test.js`, `packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/sdk-manager-auto-approve.test.js`, `packages/app/test/server-ws-branches.test.js`, `packages/core/test/approval-modal-prefs.test.js`, `packages/core/test/ask-auto-answer.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ApprovalModal.jsx` → `src/components/approval/ApprovalModal.jsx`; `apps/web/src/components/chat/AskQuestionForm.jsx` → `src/components/chat/AskQuestionForm.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/askFlowController.js` → `src/components/chat/controllers/askFlowController.js`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/quickMenuIcons.jsx` → `src/components/common/quickMenuIcons.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/settings/PreferencesForm.jsx` → `src/components/settings/PreferencesForm.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/autoApproveOptions.js` → `src/utils/autoApproveOptions.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `class App extends AppBase {`; `import { t, getLang, setLang } from './i18n';`; `class AppBase extends React.Component {`; `import { contextSeverityColor } from './utils/formatters';`; `class Mobile extends AppBase {`; `export default function ApprovalModal({`; `import AskTimeoutCountdown from './AskTimeoutCountdown';`; `export default class AskQuestionForm extends React.Component {`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `class ChatMessage extends React.Component {`; `class ChatView extends React.Component {`; `export class AskFlowController {`; `import React from 'react';`; `import chrome from './sharedChrome.module.css';`; `import { PERM_AUTO_APPROVE_OPTIONS, PLAN_AUTO_APPROVE_OPTIONS, autoApproveValueL`; `function QuickAutoApproveRows({ autoApproveSeconds, planAutoApproveSeconds, onAu`; `export function PlanClipboardIcon() {`; `import { contextSeverityColor } from '../../utils/formatters';`; `class AppHeader extends React.Component {`; `import { t, LANG_OPTIONS } from '../../i18n';`; `import styles from './PreferencesForm.module.css';`; `function Row({ label, help, children }) {`; `export default function PreferencesForm({ values = {}, onPatch }) {`; `class TerminalPanel extends React.Component {`; `const i18nData = {`; `export function autoApproveSelectOptions(values, t) {`; `export function remainingSeconds(deadlineMs, nowMs = Date.now()) {`; `describe('AskFlowController — timeout 队列移除 / 生命周期', () => {`; `import {`.
- Upstream commit message excerpt: Quick settings gain a third cascade row (next to permission/plan auto-approve) with 0/10/20/30-minute or off (default) tiers. When enabled, the server answers an AskUserQuestion itself at the wall-clock deadline even with no browser connected, picking the first option whose label carries a localized "Recommended" marker (18-locale vocabulary) else the first option; 0 minutes answers immediately for unattended/scheduled-task flows. The modal shows a live countdown with a per-ask "cancel auto-answer" (global setting untouched), and a manual answer before the deadline always wins (first-write-wins). Server: new packages/core/src/ask-auto-answer.js (picker, client-safe) + packages/app/server/lib/ask-auto-answer.js (strict typeof minutes validation, fork-aware compute, arm/cancel/replay). Wired into the PTY hook (ask-perm.js), the WS layer + a new ask-auto-cancel frame (server.js), the SDK canUseTool path (sdk-manager.js), and the ask reaper; every entry-deletion path clears the hosting tim…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-d6ec38be82"></a>
## [d6ec38be82](./cc-viewer-alignment-commit-ledger.md#commit-d6ec38be82) — feat(header): stop auto-pinning system-prompt entry to top navbar

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T11:14:03+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `class AppHeader extends React.Component {`.
- Upstream commit message excerpt: Remove the auto-reveal mechanism for the edit-system-prompt entry: the pinned-shortcut block and the Electron tab-bar header model no longer append it when a system prompt is active; drop reloadSystemPromptStatus polling plus systemPromptActive/systemPromptBuiltinDisabled state. The entry stays in the hamburger menu or via manual pinning.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-96f3a7a44e"></a>
## [96f3a7a44e](./cc-viewer-alignment-commit-ledger.md#commit-96f3a7a44e) — feat(chat): move user-prompts entry from hamburger menu to prompt-nav "more"

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T11:53:21+08:00；父提交 1；相对第一父文件数 14。
- 上游生产/配置文件：10；上游测试文件：1。
- 上游测试：`apps/web/test/modal-mask.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `feat(header): 系统提示词生效后不再自动固定到顶部导航栏 —`; `import { WorkflowButton, WorkflowRunsModal } from '../dashboard/WorkflowRunsPane`; `class ChatView extends React.Component {`; `import { hasNativeZoom, isMac } from '../../env';`; `import { PERM_AUTO_APPROVE_OPTIONS, PLAN_AUTO_APPROVE_OPTIONS, autoApproveSelect`; `class AppHeader extends React.Component {`; `import { buildRequestExpandNode } from '../../utils/requestExpand.js';`; `class DetailPanel extends React.Component {`; `const i18nData = {`; `const EXPECTED_CONSUMERS = [`.
- Upstream commit message excerpt: The Export-user-prompts entry leaves the hamburger menu; the avatar prompt-nav popover title bar gains a "more" link that opens the same summary modal (export .txt / original / context / text views). The modal moves to chat/UserPromptsModal; parseSegments + COMMAND_TAGS move to utils/promptSegments (DetailPanel consumes the util instead of importing AppHeader statically); tab-bar MENU_ICON and the orphaned ui.exportPrompts i18n entries are dropped; the modal-mask consumer guard now lists UserPromptsModal in place of AppHeader.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a6b82f16df"></a>
## [a6b82f16df](./cc-viewer-alignment-commit-ledger.md#commit-a6b82f16df) — feat(web): 文件搜索并入文件浏览器面板并重排搜索控件

- B0 snapshot comparison: 7 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T16:53:06+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：6；上游测试文件：2。
- 上游测试：`apps/web/test/git-changes-open-persist.test.js`, `apps/web/test/search-into-file-explorer.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`; `apps/web/src/components/search/SearchPanel.jsx` → `src/components/search/SearchPanel.jsx`; `apps/web/src/components/search/SearchPanel.module.css` → `src/components/search/SearchPanel.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `While you can open files and code by hand, that's not recommended — that's the`; `import FileExplorer from '../files/FileExplorer';`; `class ChatView extends React.Component {`; `import { isOverModalPortal } from '../../utils/dragGuards';`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `export default function FileExplorer({ style, onClose, onFileClick, expandedPath`; `function MatchRow({ group, match: m, matchIndex, isActive, replaceActive, previe`; `export default function SearchPanel({ style, onClose, onOpenResult, getDirtyPath`; `const i18nData = {`; `describe('gitChangesOpen persistence', () => {`.
- Upstream commit message excerpt: - 搜索入口从左侧栏移至文件浏览器标题栏放大镜开关，面板嵌入文件树下方 - 重排控件：Aa/ab/.* 开关内嵌进搜索框右端；"…" 筛选开关移至搜索框下方、无边框 SVG 圆点、灰/蓝两态；包含/排除输入改为直角、行内短标签 + 示例 placeholder；替换按钮换用新 SVG - 刷新后保持搜索面板开启状态与已输入内容（_setSearchOpen + ccv_searchOpen） - 树/搜索分界线可上下拖拽调整比例（35%–80%），修复拖拽分栏特异性失效、挂载抢焦点、sash 拖拽中途关面板 cursor 卡死等问题 - 补充 i18n 18-locale 守卫与契约测试

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ea995f3883"></a>
## [ea995f3883](./cc-viewer-alignment-commit-ledger.md#commit-ea995f3883) — feat(web): drag files into terminal or chat

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T19:06:26+08:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：9；上游测试文件：2。
- 上游测试：`apps/web/test/drag-drop-zones.test.js`, `apps/web/test/file-drag-drop.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/terminal/ScratchTerminal.jsx` → `src/components/terminal/ScratchTerminal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalPanel.module.css` → `src/components/terminal/TerminalPanel.module.css`。
- B0 diff inspection: 16 distinct hunk context(s) extracted (up to 30): `class AppBase extends React.Component {`; `import { uploadFileAndGetPath } from '../terminal/TerminalPanel';`; `import SlashCommandMenu from './SlashCommandMenu';`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import { terminalAnchor } from '../../utils/terminalAnchor';`; `class ChatView extends React.Component {`; `import { isOverModalPortal } from '../../utils/dragGuards';`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `export default function FileExplorer({ style, onClose, onFileClick, expandedPath`; `import { clipboardKeyAction, copyTextToClipboard, planPasteSend } from '../../ut`; `class ScratchTerminal extends React.Component {`; `import { TerminalWsContext } from './TerminalWsContext';`; `import { createQuickMenuHoverIntent } from '../../utils/quickMenuHoverIntent';`; `class TerminalPanel extends React.Component {`; `describe('AppBase drag state machine', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-beaa2e86f2"></a>
## [beaa2e86f2](./cc-viewer-alignment-commit-ledger.md#commit-beaa2e86f2) — feat(web): support dragging folders into terminal and chat

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T19:27:40+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：5；上游测试文件：1。
- 上游测试：`apps/web/test/file-drag-drop.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`。
- B0 diff inspection: 14 distinct hunk context(s) extracted (up to 30): `import SlashCommandMenu from './SlashCommandMenu';`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `class ChatView extends React.Component {`; `import { isOverModalPortal } from '../../utils/dragGuards';`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `import { createQuickMenuHoverIntent } from '../../utils/quickMenuHoverIntent';`; `class TerminalPanel extends React.Component {`; `export const FILE_DRAG_TYPE = 'text/x-ccv-file';`; `export function isFileDrag(e) {`; `export function isSafeAttachmentPath(path) {`; `export function getDraggedFilePath(e) {`; `import { fileURLToPath } from 'node:url';`; `describe('file browser drag payload', () => {`; `describe('file browser drop wiring', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-91a523d043"></a>
## [91a523d043](./cc-viewer-alignment-commit-ledger.md#commit-91a523d043) — feat: add cross-platform archive preview

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-11T22:29:39+08:00；父提交 1；相对第一父文件数 28。
- 上游生产/配置文件：15；上游测试文件：7。
- 上游测试：`apps/web/test/archive-preview-wiring.test.js`, `apps/web/test/archive-preview.test.js`, `apps/web/test/file-types.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-target-files.test.js`, `packages/app/test/branch-routes-files-content.test.js`, `packages/app/test/route-dispatch.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 18 distinct hunk context(s) extracted (up to 30): `Copyright (c) 2026 weiesky`; `files:`; `const APP_PAYLOAD = [`; `import { detectMdExtensions } from '../../utils/mdExtensionDetect';`; `const syntaxTheme = syntaxHighlighting(highlightStyle);`; `export default function FileContentView({`; `const i18nData = {`; `const EXT_CATEGORY = {`; `describe('getFileType', () => {`; `function fileRaw(req, res, parsedUrl) {`; `function fileRawWithRoot(req, res, parsedUrl, reqPath, cwd, method) {`; `export const filesContentRoutes = [`; `import {`; `let routes;`; `before(async () => {`; `describe('GET|HEAD /api/download-file', { concurrency: false }, () => {`; `describe('GET /api/target-files', { concurrency: false }, () => {`; `describe('files-content registry (method-distinguished + predicate routes)', ()`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-f96811cddb"></a>
## [f96811cddb](./cc-viewer-alignment-commit-ledger.md#commit-f96811cddb) — feat: unify file preview routing and binary guards

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T00:08:33+08:00；父提交 1；相对第一父文件数 26。
- 上游生产/配置文件：15；上游测试文件：9。
- 上游测试：`apps/web/test/archive-preview-wiring.test.js`, `apps/web/test/external-folder-targets.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-open.test.js`, `apps/web/test/file-types.test.js`, `apps/web/test/preview-kind.test.js`, `apps/web/test/preview-wiring.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/binary-sniff.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/commandValidator.js` → `src/utils/commandValidator.js`; `apps/web/src/utils/fileOpen.js` → `src/utils/fileOpen.js`。
- B0 diff inspection: 29 distinct hunk context(s) extracted (up to 30): `import { isImageFile } from '../../utils/commandValidator';`; `class ChatView extends React.Component {`; `import { getFileIcon } from '../../utils/fileIcons';`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `export default function FileBrowserModal({ open = false, onClose, onAttachToChat`; `import { detectMdExtensions } from '../../utils/mdExtensionDetect';`; `function FileContentViewImpl({`; `export default function FileContentView(props) {`; `function TreeNode({ item, path, depth, onFileClick, expandedPaths, onToggleExpan`; `const i18nData = {`; `export function getArchivePreviewKind(filePath) {`; `export function isImageFile(path) {`; `import { apiUrl, withViewParams } from './apiUrl';`; `const SYSTEM_OPEN_EXTS = new Set([`; `export function isSystemOpenFile(path) {`; `export function getFileType(name, type) {`; `export function getExt(name) {`; `describe('archive preview wiring and accessibility', () => {`; `describe('target-scoped file browser boundaries (menu/preview enabled, drag/uplo`; `describe('FileBrowserModal wiring contract', () => {`; `describe('fileOpen.isSystemOpenFile — 与系统打开共用扩展名集合', (`; `describe('fileOpen.tryOpenWithSystem — 命中扩展名', () => {`; `describe('fileOpen.tryOpenWithSystem — 未命中', () => {`; `describe('getFileType', () => {`; `import { reportSwallowed } from '../lib/error-report.js';`; `function fileContentGetWithRoot(req, res, parsedUrl, reqPath, cwd) {`; `function fileContentPost(req, res, parsedUrl, isLocal) {`; `describe('GET /api/file-content', { concurrency: false }, () => {`; `describe('POST /api/file-content', { concurrency: false }, () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-62012025cb"></a>
## [62012025cb](./cc-viewer-alignment-commit-ledger.md#commit-62012025cb) — ci: retry bounded zsh installation

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T00:25:16+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-f3db3ed9a2"></a>
## [f3db3ed9a2](./cc-viewer-alignment-commit-ledger.md#commit-f3db3ed9a2) — ci: avoid installing zsh for mocked shell tests

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T00:35:20+08:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 1 distinct hunk context(s) extracted (up to 30): `jobs:`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-9e24827264"></a>
## [9e24827264](./cc-viewer-alignment-commit-ledger.md#commit-9e24827264) — Merge pull request #170 from weiesky/feat/file-preview-foundation

- B0 snapshot comparison: 37 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T00:38:31+08:00；父提交 2；相对第一父文件数 109。
- 上游生产/配置文件：64；上游测试文件：30。
- 上游测试：`apps/web/test/archive-preview-wiring.test.js`, `apps/web/test/archive-preview.test.js`, `apps/web/test/ask-auto-answer-menu.test.js`, `apps/web/test/ask-flow-controller.test.js`, `apps/web/test/auto-approve-options.test.js`, `apps/web/test/deadline-countdown.test.js`, `apps/web/test/drag-drop-zones.test.js`, `apps/web/test/external-folder-targets.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-drag-drop.test.js`, `apps/web/test/file-open.test.js`, `apps/web/test/file-types.test.js`, `apps/web/test/git-changes-open-persist.test.js`, `apps/web/test/modal-mask.test.js`, `apps/web/test/preview-kind.test.js`, `apps/web/test/preview-wiring.test.js`, `apps/web/test/quick-settings-i18n.test.js`, `apps/web/test/search-into-file-explorer.test.js`, `packages/app/test/api-ask-perm-extra.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-target-files.test.js`, `packages/app/test/ask-auto-answer.test.js`, `packages/app/test/binary-sniff.test.js`, `packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/branch-routes-files-content.test.js`, `packages/app/test/route-dispatch.test.js`, `packages/app/test/sdk-manager-auto-approve.test.js`, `packages/app/test/server-ws-branches.test.js`, `packages/core/test/approval-modal-prefs.test.js`, `packages/core/test/ask-auto-answer.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ApprovalModal.jsx` → `src/components/approval/ApprovalModal.jsx`; `apps/web/src/components/chat/AskQuestionForm.jsx` → `src/components/chat/AskQuestionForm.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/controllers/askFlowController.js` → `src/components/chat/controllers/askFlowController.js`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/quickMenuIcons.jsx` → `src/components/common/quickMenuIcons.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/dashboard/AppHeader.module.css` → `src/components/dashboard/AppHeader.module.css`; `apps/web/src/components/dashboard/DetailPanel.jsx` → `src/components/dashboard/DetailPanel.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`; `apps/web/src/components/search/SearchPanel.jsx` → `src/components/search/SearchPanel.jsx`; `apps/web/src/components/search/SearchPanel.module.css` → `src/components/search/SearchPanel.module.css`; `apps/web/src/components/settings/PreferencesForm.jsx` → `src/components/settings/PreferencesForm.jsx`; `apps/web/src/components/terminal/ScratchTerminal.jsx` → `src/components/terminal/ScratchTerminal.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalPanel.module.css` → `src/components/terminal/TerminalPanel.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/autoApproveOptions.js` → `src/utils/autoApproveOptions.js`; `apps/web/src/utils/commandValidator.js` → `src/utils/commandValidator.js`; `apps/web/src/utils/fileOpen.js` → `src/utils/fileOpen.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat: file preview foundation and binary guards

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6dd3b3b7e5"></a>
## [6dd3b3b7e5](./cc-viewer-alignment-commit-ledger.md#commit-6dd3b3b7e5) — chore: release 1.9.24

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T00:40:27+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-6e3c93cd7c"></a>
## [6e3c93cd7c](./cc-viewer-alignment-commit-ledger.md#commit-6e3c93cd7c) — feat: add guided npm updates with restart

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T10:28:17+08:00；父提交 1；相对第一父文件数 25。
- 上游生产/配置文件：14；上游测试文件：9。
- 上游测试：`apps/web/test/sse-connection-gen.test.js`, `apps/web/test/update-modal.test.js`, `packages/app/test/branch-lib-updater.test.js`, `packages/app/test/install-method.test.js`, `packages/app/test/restart-helper.test.js`, `packages/app/test/update-job.test.js`, `packages/app/test/update-routes.test.js`, `packages/app/test/updater-pnpm.test.js`, `packages/app/test/updater.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/updater.js` → `lib/updater.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `import { BLUR_MASK_STYLE } from './utils/modalMask';`; `class App extends AppBase {`; `const CHANNEL_FRAME_HANDLERS = {`; `class AppBase extends React.Component {`; `const i18nData = {`; `describe('AppBase.jsx 源码锚点（防未来重构漂移）', () => {`; `async function runCliMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `const args = process.argv.slice(2);`; `import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from`; `import { dirname } from 'node:path';`; `import { PACKAGE_JSON } from '../_paths.js';`; `const __dirname = dirname(__filename);`; `export function detectHomebrewInstall(dirOverride, realpathImpl = realpathSync)`; `export function detectPnpmGlobalInstall(dirOverride, realpathImpl = realpathSync`; `const CC_SETTINGS_FILE = join(getClaudeConfigDir(), 'settings.json');`; `function parseVersion(ver) {`; `function isNewer(remote, current) {`; `function isAutoUpdateEnabled() {`; `function shouldCheck() {`; `function saveCheckTime() {`; `export function isAnyCcvBusy({ currentPid, busy, portRange, lsofImpl } = {}) {`; `export async function checkAndUpdate(options = {}) {`; `import { listLivePtys } from '../pty-manager.js';`; `export function getInstallMethod({`; `function projectDir(req, res) {`; `function versionInfo(req, res) {`; `import { proxyStatsRoutes } from './routes/proxy-stats.js';`; `export function setLaunchCallback(fn) { _launchCallback = fn; }`; `function _ensureImWatch(id) {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-17ba9be7b5"></a>
## [17ba9be7b5](./cc-viewer-alignment-commit-ledger.md#commit-17ba9be7b5) — fix: harden guided updates and restart recovery

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T14:16:08+08:00；父提交 1；相对第一父文件数 24。
- 上游生产/配置文件：17；上游测试文件：6。
- 上游测试：`apps/web/test/update-modal.test.js`, `packages/app/test/install-method.test.js`, `packages/app/test/restart-helper.test.js`, `packages/app/test/update-instances.test.js`, `packages/app/test/update-job.test.js`, `packages/app/test/update-routes.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/electron/electron/main.js` → `electron/main.js`; `apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/updater.js` → `lib/updater.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `function createTab(projectPath, extraArgs = []) {`; `import UpdateModal from './components/update/UpdateModal';`; `class App extends AppBase {`; `class AppBase extends React.Component {`; `import styles from './UpdateModal.module.css';`; `export default function UpdateModal({ open, onCancel, currentVersion, method, st`; `const i18nData = {`; `const i18n = readFileSync(join(import.meta.dirname, '../src/i18n.js'), 'utf8');`; `describe('UpdateModal', () => {`; `async function runCliMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `async function runSdkMode(extraClaudeArgs = [], cwd, noOpen = false) {`; `for (const signal of ['SIGINT', 'SIGHUP', 'SIGTERM']) process.on(signal, () => {`; `try {`; `import { spawn } from 'node:child_process';`; `import { isPidAlive } from './pid-alive.js';`; `export const RESTART_HELPER_PATH = fileURLToPath(new URL('./restart-helper.js',`; `export function launchRestart({ pid = process.pid, args, cwd, version, cliPath,`; `export async function restartFromHelper(config, { spawnImpl = spawn, wait = wait`; `import { createHash, randomUUID } from 'node:crypto';`; `import { dirname, join, resolve } from 'node:path';`; `import { once } from 'node:events';`; `import { checkAndUpdate, detectHomebrewInstall, detectPnpmGlobalInstall, STABLE_`; `export const UPDATE_STATE_FILE = join(getClaudeConfigDir(), 'cc-viewer', 'update`; `function isStableRelease(release, version) {`; `export async function resolveNpmInstallRoot({ rootImpl = npmRoot, packageRoot =`; `export function verifyDigest(buffer, dist) {`; `export async function downloadRelease({ release, directory, fetchImpl = fetch, o`; `export function runInstallProcess(command, { spawnImpl = spawn, timeoutMs = INST`; `export async function installStagedUpdate(config, { installImpl = runInstallProc`; `export class UpdateJob {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5a7904990b"></a>
## [5a7904990b](./cc-viewer-alignment-commit-ledger.md#commit-5a7904990b) — Merge pull request #171 from weiesky/feat/guided-npm-updates

- B0 snapshot comparison: 8 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T14:54:03+08:00；父提交 2；相对第一父文件数 30。
- 上游生产/配置文件：18；上游测试文件：10。
- 上游测试：`apps/web/test/sse-connection-gen.test.js`, `apps/web/test/update-modal.test.js`, `packages/app/test/branch-lib-updater.test.js`, `packages/app/test/install-method.test.js`, `packages/app/test/restart-helper.test.js`, `packages/app/test/update-instances.test.js`, `packages/app/test/update-job.test.js`, `packages/app/test/update-routes.test.js`, `packages/app/test/updater-pnpm.test.js`, `packages/app/test/updater.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/electron/electron/main.js` → `electron/main.js`; `apps/web/src/App.jsx` → `src/App.jsx`; `apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `packages/app/cli.js` → `cli.js`; `packages/app/server/lib/updater.js` → `lib/updater.js`; `packages/app/server/pty-manager.js` → `pty-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat: add guided npm updates with restart

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-c30ca279bd"></a>
## [c30ca279bd](./cc-viewer-alignment-commit-ledger.md#commit-c30ca279bd) — chore: release 1.9.25

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T15:10:08+08:00；父提交 1；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-84373dff25"></a>
## [84373dff25](./cc-viewer-alignment-commit-ledger.md#commit-84373dff25) — Merge pull request #172 from weiesky/chore/release-1.9.25

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T15:19:58+08:00；父提交 2；相对第一父文件数 3。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: chore: release 1.9.25

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-919fded845"></a>
## [919fded845](./cc-viewer-alignment-commit-ledger.md#commit-919fded845) — fix(sdk): settle stale slow-upstream notices

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-12T19:37:45+08:00；父提交 1；相对第一父文件数 8。
- 上游生产/配置文件：3；上游测试文件：3。
- 上游测试：`apps/web/test/slow-upstream-lifecycle.test.js`, `packages/app/test/proxy-slow-upstream.test.js`, `packages/app/test/slow-upstream-replay.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 7 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `async function handleLlmApiRequest(req, res, fullUrl, fetchOptions, body, proxyD`; `setProxyStatsListener(notifyProxyStats);`; `setSlowUpstreamListener(({ type, requestId, cwd, instanceKey, waitingMs, model }`; `async function setupTerminalWebSocket(httpServer) {`; `function proxyReq(path, { method = 'POST', body = null, headers = {} } = {}) {`; `describe('proxy.js slow-upstream advisory', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-20313b254c"></a>
## [20313b254c](./cc-viewer-alignment-commit-ledger.md#commit-20313b254c) — feat: add inline audio preview with streaming range support

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-13T01:24:19+08:00；父提交 1；相对第一父文件数 21。
- 上游生产/配置文件：11；上游测试文件：8。
- 上游测试：`apps/web/test/audio-preview.test.js`, `apps/web/test/file-types.test.js`, `apps/web/test/preview-kind.test.js`, `apps/web/test/preview-wiring.test.js`, `packages/app/test/api-audio-stream.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-target-files.test.js`, `packages/app/test/audio-stream.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 19 distinct hunk context(s) extracted (up to 30): `import { isImageFile } from '../../utils/commandValidator';`; `class ChatView extends React.Component {`; `const ArchivePreview = lazy(() =>`; `export default function FileContentView(props) {`; `import styles from './UnsupportedFilePreview.module.css';`; `const i18nData = {`; `const EXT_CATEGORY = {`; `const PREVIEW_KINDS = new Set(['archive', 'image', 'audio', 'video', 'font', 'pd`; `export function isDownloadOnlyPreview(kind) {`; `describe('getFileType', () => {`; `import assert from 'node:assert/strict';`; `describe('shared preview kinds', () => {`; `describe('download-only preview wiring', () => {`; `import { isBinaryBuffer, getUtf16Encoding } from '../lib/binary-sniff.js';`; `function targetFiles(req, res, parsedUrl, isLocal, deps) {`; `export const filesContentRoutes = [`; `let routes;`; `before(async () => {`; `describe('GET /api/target-files', { concurrency: false }, () => {`.
- Upstream commit message excerpt: Add a dedicated /api/audio-stream route that streams audio with single-range HTTP Range (206/416/304/If-Range) and a correct audio/* MIME, so the native <audio> element can play and seek (Safari requires byte-range support). A new server/lib/audio-stream.js provides magic-byte sniffing (audio/* only), an RFC 9110 byte-range parser (suffix + clamping), and a streaming responder with an empty-file guard and abort/error cleanup. On the web side, a lazy AudioPreview component renders <audio controls preload="none"> with a download fallback on playback error. oga/aac/opus are classified as audio, audio leaves the download-only set, and a shared opensInFileViewer helper keeps the GitChanges single-click on the viewer.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-18bd742bc5"></a>
## [18bd742bc5](./cc-viewer-alignment-commit-ledger.md#commit-18bd742bc5) — feat: add subtitle preview and extend image preview formats

- B0 snapshot comparison: 9 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-13T05:19:14+08:00；父提交 1；相对第一父文件数 31。
- 上游生产/配置文件：18；上游测试文件：10。
- 上游测试：`apps/web/test/archive-preview-wiring.test.js`, `apps/web/test/archive-preview.test.js`, `apps/web/test/commandValidator.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-types.test.js`, `apps/web/test/preview-kind.test.js`, `apps/web/test/preview-wiring.test.js`, `apps/web/test/subtitle-parser.test.js`, `apps/web/test/subtitle-preview.test.js`, `packages/app/test/api-files-content.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/UltraPlanModal.jsx` → `src/components/terminal/UltraPlanModal.jsx`; `apps/web/src/components/terminal/UltraplanPanel.jsx` → `src/components/terminal/UltraplanPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/commandValidator.js` → `src/utils/commandValidator.js`; `apps/web/src/utils/fileIcons.jsx` → `src/utils/fileIcons.jsx`; `apps/web/src/utils/userImageRefs.js` → `src/utils/userImageRefs.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `function ModalTreeNode({ item, path, depth, expandedPaths, onToggleExpand, onNav`; `const AudioPreview = lazy(() =>`; `export default function FileContentView(props) {`; `class TerminalPanel extends React.Component {`; `export default function UltraPlanModal({`; `export default function UltraplanPanel({`; `export default function ArchivePreview({ filePath, displayPath, onClose, project`; `const i18nData = {`; `import { getPreviewKind } from './previewKind.js';`; `export function isImageFile(path) {`; `const CATEGORY_COLORS = {`; `const GLYPH = {`; `const EXT_CATEGORY = {`; `import { getExt, getFileType } from './fileTypes.js';`; `const UPLOAD = String.raw'(?:\/private)?\/tmp\/cc-viewer-uploads\/';`; `Entry previews retain their last selected result; repeated user-initiated reads`; `export function latin1(bytes) {`; `export function decodeFileName(bytes, { utf8Flag = false } = {}) {`; `export function decodeTextBytes(input, { maxBytes = 4 * 1024 * 1024, truncated =`; `describe('archive preview wiring and accessibility', () => {`; `const { parseTar } = await import('../src/vendor/archive/tar.js');`; `describe('hostile metadata, decoding and tree bounds', () => {`; `describe('isImageFile', () => {`; `describe('shared context menu wiring (sidebar tree ≡ modal)', () => {`; `describe('getFileType', () => {`; `describe('shared preview kinds', () => {`; `describe('download-only preview wiring', () => {`; `const FILE_RAW_MIME = {`; `describe('GET|HEAD /api/file-raw', { concurrency: false }, () => {`.
- Upstream commit message excerpt: Stage B (subtitles): parse SRT/VTT/ASS/SSA into a list/raw preview. Raw bytes are read via /api/file-raw (file-content rejects GBK/Latin-1 as binary) and decoded with the archive util's BOM/UTF-16/GBK/Latin-1 path. Cues render as plain React text (no HTML/ASS override execution), capped at 1 MiB / 3000 cues with truncation notices. An $EDITOR session keeps the editable text editor. Also fix vendored archive decode: decodeLegacyText referenced an out-of-scope `truncated` (ReferenceError on Latin-1), decodeTextBytes had a dead UTF-8 truncation trim that mislabeled cut CJK text as GBK, and the lossy GBK retry could mislabel Latin-1. Stage C (images): APNG/JFIF route to <img> preview and thumbnails/refs; TIFF/HEIC/HEIF classify as image (icon + correct download MIME) but stay off the preview route via NON_DECODABLE_IMAGE_EXTS so browsers that cannot decode them keep the download fallback.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ec14cd0234"></a>
## [ec14cd0234](./cc-viewer-alignment-commit-ledger.md#commit-ec14cd0234) — fix(sdk+web): blood bar (context usage) freeze — keepalive, watchdog, fetch deadline, ts self-heal

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-13T11:37:24+08:00；父提交 1；相对第一父文件数 13。
- 上游生产/配置文件：7；上游测试文件：4。
- 上游测试：`apps/web/test/context-usage-view.test.js`, `apps/web/test/sdk-context-provider.test.js`, `apps/web/test/terminal-ws-watchdog.test.js`, `packages/app/test/server-terminal-ws-ping.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/terminal/TerminalWsContext.jsx` → `src/components/terminal/TerminalWsContext.jsx`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 13 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `import { projectKeyFromCwd } from '../../utils/projectKeyFromCwd';`; `export function SdkContextUsageProvider({`; `const RECONNECT_DELAY_MS = 2000;`; `export class TerminalWsProvider extends React.Component {`; `function panelDetail(snapshot) {`; `function snapshotIsStale(prev, snapshot) {`; `export function nextPanelState(prev, event) {`; `describe('contextUsageView — nextPanelState 面板状态机', () => {`; `describe('SdkContextUsageProvider — real hook lifecycle', () => {`; `import { sseWrite, isWireV3Enabled } from './lib/wire-compress.js';`; `async function setupTerminalWebSocket(httpServer) {`; `async function _doStop() {`.
- Upstream commit message excerpt: The /ws/terminal channel had no keepalive, so a half-open socket (NAT timeout, sleep/wake, proxy drop) never fired onclose and every push-only consumer (sdk-context-usage bar, approvals, queue state) froze until a page refresh. - server: app-level ping on /ws/terminal (immediate on connect + every 25s); terminate existing clients on stop so a zombie connection can't be fed alive - web: idle watchdog (45s) with ping-evidence gate, 10s dial deadline, stale onclose/onopen guards; visibility reset on foreground - web: 15s fetch deadline on the SDK context pull (reported, gate released) - web: corrupt-future snapshot ts self-heals by clamping the watermark - web: park queued-but-unsent composer text across a transient reconnect

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-187583787d"></a>
## [187583787d](./cc-viewer-alignment-commit-ledger.md#commit-187583787d) — feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate

- B0 snapshot comparison: 16 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-13T15:10:23+08:00；父提交 1；相对第一父文件数 50。
- 上游生产/配置文件：19；上游测试文件：11。
- 上游测试：`apps/web/test/ask-auto-answer-menu.test.js`, `apps/web/test/auto-approve-options.test.js`, `apps/web/test/full-auto-approve-wiring.test.js`, `apps/web/test/helpers-unit-a.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/quick-settings-i18n.test.js`, `packages/app/test/api-ask-perm-extra.test.js`, `packages/app/test/auto-approve.test.js`, `packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/sdk-manager-auto-approve.test.js`, `packages/app/test/sdk-manager-query.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/ptyPromptController.js` → `src/components/chat/controllers/ptyPromptController.js`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/autoApproveOptions.js` → `src/utils/autoApproveOptions.js`; `apps/web/src/utils/helpers.js` → `src/utils/helpers.js`; `packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 30 distinct hunk context(s) extracted (up to 30): `ccv --sdk --model sonnet # pick a model`; `import { t, getLang, setLang } from './i18n';`; `class AppBase extends React.Component {`; `class Mobile extends AppBase {`; `import { t } from '../../i18n';`; `function ToolApprovalPanel({ toolName, toolInput, requestId, onAllow, onAllowSes`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import ToolApprovalPanel from '../approval/ToolApprovalPanel';`; `class ChatView extends React.Component {`; `import {`; `function QuickAutoApproveRows({ autoApproveSeconds, planAutoApproveSeconds, askA`; `button.quickMenuRow:hover {`; `class TerminalPanel extends React.Component {`; `const i18nData = {`; `export const AUTO_APPROVE_INSTANT = -1;`; `export const PLAN_AUTO_APPROVE_OPTIONS = [0, 10, 30, 60, AUTO_APPROVE_INSTANT];`; `export function autoApproveValueLabel(v, t) {`; `export function getModelInfo(modelName) {`; `describe('QuickAutoApproveRows — the third cascade row', () => {`; `describe('auto-approve option sets', () => {`; `describe('autoApproveValueLabel', () => {`; `describe('AUTO_APPROVE_INSTANT 常量', () => {`; `describe('perm-hook-pending instant interception honors the server-stamped level`; `const KEYS = [`; `ccv --sdk --model sonnet # vælg en model`; `ccv --sdk --model sonnet # ein Modell auswählen`; `ccv --sdk --model sonnet # elige un modelo`; `ccv --sdk --model sonnet # choisissez un modèle`; `ccv --sdk --model sonnet # scegli un modello`; `ccv --sdk --model sonnet # モデルを選択`.
- Upstream commit message excerpt: New permission auto-approve tier 完全免审批 (-2): instant allow like -1, and additionally lifts the npm-publish hard gate (perm only; plan never gets it; scheduled-task/IM-deny exemptions unchanged). Selecting the tier from any surface (quick menu or settings Selects) shows a danger confirm focused on Cancel (zIndex above the quick-settings Popover); the quick menu marks the tier in red and the perm row gains a (?) help explaining the tiers. User copy uses rm -rf (deletes files) as the high-risk example. i18n x18, README x18, changeset (patch), history.md.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-23e4273a37"></a>
## [23e4273a37](./cc-viewer-alignment-commit-ledger.md#commit-23e4273a37) — chore: release 1.9.26

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-13T15:27:47+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-0ff3154822"></a>
## [0ff3154822](./cc-viewer-alignment-commit-ledger.md#commit-0ff3154822) — Merge pull request #173 from weiesky/release/1.9.26

- B0 snapshot comparison: 25 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-13T15:28:28+08:00；父提交 2；相对第一父文件数 98。
- 上游生产/配置文件：45；上游测试文件：32。
- 上游测试：`apps/web/test/archive-preview-wiring.test.js`, `apps/web/test/archive-preview.test.js`, `apps/web/test/ask-auto-answer-menu.test.js`, `apps/web/test/audio-preview.test.js`, `apps/web/test/auto-approve-options.test.js`, `apps/web/test/commandValidator.test.js`, `apps/web/test/context-usage-view.test.js`, `apps/web/test/file-browser-modal.test.js`, `apps/web/test/file-types.test.js`, `apps/web/test/full-auto-approve-wiring.test.js`, `apps/web/test/helpers-unit-a.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/preview-kind.test.js`, `apps/web/test/preview-wiring.test.js`, `apps/web/test/quick-settings-i18n.test.js`, `apps/web/test/sdk-context-provider.test.js`, `apps/web/test/slow-upstream-lifecycle.test.js`, `apps/web/test/subtitle-parser.test.js`, `apps/web/test/subtitle-preview.test.js`, `apps/web/test/terminal-ws-watchdog.test.js`, `packages/app/test/api-ask-perm-extra.test.js`, `packages/app/test/api-audio-stream.test.js`, `packages/app/test/api-files-content.test.js`, `packages/app/test/api-target-files.test.js`, `packages/app/test/audio-stream.test.js`, `packages/app/test/auto-approve.test.js`, `packages/app/test/branch-routes-ask-perm.test.js`, `packages/app/test/proxy-slow-upstream.test.js`, `packages/app/test/sdk-manager-auto-approve.test.js`, `packages/app/test/sdk-manager-query.test.js`, `packages/app/test/server-terminal-ws-ping.test.js`, `packages/app/test/slow-upstream-replay.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/AppBase.jsx` → `src/AppBase.jsx`; `apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/approval/ToolApprovalPanel.jsx` → `src/components/approval/ToolApprovalPanel.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/ptyPromptController.js` → `src/components/chat/controllers/ptyPromptController.js`; `apps/web/src/components/common/QuickAutoApproveRows.jsx` → `src/components/common/QuickAutoApproveRows.jsx`; `apps/web/src/components/common/sharedChrome.module.css` → `src/components/common/sharedChrome.module.css`; `apps/web/src/components/files/FileContentView.jsx` → `src/components/files/FileContentView.jsx`; `apps/web/src/components/terminal/TerminalPanel.jsx` → `src/components/terminal/TerminalPanel.jsx`; `apps/web/src/components/terminal/TerminalWsContext.jsx` → `src/components/terminal/TerminalWsContext.jsx`; `apps/web/src/components/terminal/UltraPlanModal.jsx` → `src/components/terminal/UltraPlanModal.jsx`; `apps/web/src/components/terminal/UltraplanPanel.jsx` → `src/components/terminal/UltraplanPanel.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/autoApproveOptions.js` → `src/utils/autoApproveOptions.js`; `apps/web/src/utils/commandValidator.js` → `src/utils/commandValidator.js`; `apps/web/src/utils/fileIcons.jsx` → `src/utils/fileIcons.jsx`; `apps/web/src/utils/helpers.js` → `src/utils/helpers.js`; `apps/web/src/utils/userImageRefs.js` → `src/utils/userImageRefs.js`; `packages/app/package.json` → `package.json`; `packages/app/server/lib/ask/perm-bridge.js` → `lib/perm-bridge.js`; `packages/app/server/lib/sdk-manager.js` → `lib/sdk-manager.js`; `packages/app/server/proxy.js` → `proxy.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: chore: release 1.9.26 — file preview (audio/subtitle/image) + permission tier + fixes

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-dd8709356b"></a>
## [dd8709356b](./cc-viewer-alignment-commit-ledger.md#commit-dd8709356b) — fix(web+server): close approval modal after server-side auto-advance

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-13T17:40:24+08:00；父提交 1；相对第一父文件数 9。
- 上游生产/配置文件：3；上游测试文件：4。
- 上游测试：`apps/web/test/ask-flow-controller.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`, `packages/app/test/ws-instance-isolation.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/askFlowController.js` → `src/components/chat/controllers/askFlowController.js`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `export class AskFlowController {`; `describe('AskFlowController — timeout 队列移除 / 生命周期', () => {`; `describe('ChatView SDK plan auto-approval runtime behavior', () => {`; `describe('perm-hook-pending instant interception honors the server-stamped level`; `describe('SDK mode never activates the PTY plan-approval keystroke surface', ()`; `async function _doStop() {`; `export function broadcastWsMessage(msg) {  if (terminalWss) {`; `describe('broadcastWsMessage instance narrowing', () => {`.
- Upstream commit message excerpt: A plan/ask auto-approve (instant tier) fires the pending and resolved frames in the same tick; under React 18 batching the resolved branch read the not-yet-committed pending state and no-opped, leaving the modal stuck. Clear via functional setState (match the latest state by id), and route id-addressed approval terminal frames past view narrowing in broadcastWsMessage. Side effects run in the setState commit callback so controller routing fields and askMetaMap stay in sync.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-a2f5cd4b43"></a>
## [a2f5cd4b43](./cc-viewer-alignment-commit-ledger.md#commit-a2f5cd4b43) — feat(web): drag git changes (files, folders, commits) into chat or terminal

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-15T10:59:16+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：4；上游测试文件：1。
- 上游测试：`apps/web/test/file-drag-drop.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/components/git/GitChanges.module.css` → `src/components/git/GitChanges.module.css`。
- B0 diff inspection: 9 distinct hunk context(s) extracted (up to 30): `class ChatView extends React.Component {`; `import { buildGitTree } from '../../utils/gitTreeBuilder';`; `const STATUS_LABELS = {`; `function TreeDir({ name, node, depth, repoPath, onFileClick, onOpenFile, onResto`; `function StatBadges({ insertions, deletions }) {`; `function CommitRow({ commit, repoPath, expanded, onToggle, onFileClick, onOpenFi`; `export default function GitChanges({ style, onClose, onFileClick, onOpenFile, re`; `import { FILE_DRAG_TYPE, FOLDER_DRAG_TYPE, isFileDrag, getDraggedFilePath, getDr`; `describe('file browser drop wiring', () => {`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-24c4f60b54"></a>
## [24c4f60b54](./cc-viewer-alignment-commit-ledger.md#commit-24c4f60b54) — Merge pull request #174 from weiesky/feat/git-changes-drag-drop

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-15T15:39:51+08:00；父提交 2；相对第一父文件数 14。
- 上游生产/配置文件：6；上游测试文件：5。
- 上游测试：`apps/web/test/ask-flow-controller.test.js`, `apps/web/test/file-drag-drop.test.js`, `apps/web/test/plan-auto-approve-runtime.test.js`, `apps/web/test/sdk-plan-approval-guard.test.js`, `packages/app/test/ws-instance-isolation.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/controllers/askFlowController.js` → `src/components/chat/controllers/askFlowController.js`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/components/git/GitChanges.module.css` → `src/components/git/GitChanges.module.css`; `packages/app/server/server.js` → `server.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(web): drag git changes (files, folders, commits) into chat or terminal

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-00fdfade79"></a>
## [00fdfade79](./cc-viewer-alignment-commit-ledger.md#commit-00fdfade79) — chore: release 1.9.27

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-15T15:40:52+08:00；父提交 1；相对第一父文件数 4。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-bde0244333"></a>
## [bde0244333](./cc-viewer-alignment-commit-ledger.md#commit-bde0244333) — fix(server): WS-mux cold-load backpressure stall (1011 queue-overflow blank chat)

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T03:24:03+08:00；父提交 1；相对第一父文件数 11。
- 上游生产/配置文件：4；上游测试文件：5。
- 上游测试：`packages/app/test/events-attach-buffer.test.js`, `packages/app/test/events-v3-cold-backpressure.test.js`, `packages/app/test/sse-attach-buffer.test.js`, `packages/app/test/wire-compress.test.js`, `packages/app/test/ws-mux-backpressure.test.js`。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: 15 distinct hunk context(s) extracted (up to 30): `import { reportSwallowed } from './error-report.js';`; `export function createAttachBufferClient({ project, instance, maxBytes, onOverfl`; `function _isCoveredConvFrame(frameText, convCoverage) {`; `export function flushAttachBuffer(sink, client, convCoverage) {`; `export function needsDrain(res) {`; `export function awaitWireDrain(res, timeoutMs) {`; `import { reportSwallowed as defaultReport } from '../lib/error-report.js';`; `const MAX_STREAMS_PER_SOCKET = 8;`; `export const QUEUE_MAX_BYTES = 32 * 1024 * 1024;`; `export function createStreamMuxServer({`; `export async function serveEventStream(sink, params, deps) {`; `function makeRes(opts = {}) {`; `describe('events attach buffer: cold-load window no longer loses live deltas', (`; `describe('attach-buffer: flushAttachBuffer', () => {`; `describe('wire-compress streaming', () => {`.
- Upstream commit message excerpt: Cold-loading history over the WS-mux pushed a multi-MB burst in one tick, tripping the 32MB queue cap: the socket closed with 1011 queue-overflow, the page never received load_end, and a refresh re-ran the burst (reconnect loop), leaving the chat area blank. Rework the mux backpressure into a self-contained per-socket pump (the shared gate's skip+resync contract never fit the mux's queue+replay): - single setInterval pump is the only queue driver; a frame is queued only via enterBehind (queue non-empty => behind + pump armed) - progress is the pump DEQUEUING bytes, not the bufferedAmount level (a full buffer is refilled to ~HIGH every tick, so a draining client's level never drops) — a dual-clock watchdog kills a truly wedged socket without false-killing slow-but-draining ones, with an absolute 2x ceiling that an event-loop stall cannot postpone - 'drain' fires only once there is real headroom (and unconditionally on full drain), so woken producers refill a draining socket instead of r…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-add350bc52"></a>
## [add350bc52](./cc-viewer-alignment-commit-ledger.md#commit-add350bc52) — fix(web): hide Teammate role in proxy hot-switch under SDK mode

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T03:40:01+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：4；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/settings/ProxyModal.jsx` → `src/components/settings/ProxyModal.jsx`。
- B0 diff inspection: 4 distinct hunk context(s) extracted (up to 30): `class Mobile extends AppBase {`; `class ChatView extends React.Component {`; `class AppHeader extends React.Component {`; `export default function ProxyModal({`.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-5fc4c75229"></a>
## [5fc4c75229](./cc-viewer-alignment-commit-ledger.md#commit-5fc4c75229) — style(web): 统一 Git 变更 / 文件浏览器刷新按钮样式

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T03:50:52+08:00；父提交 1；相对第一父文件数 5。
- 上游生产/配置文件：4；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/components/git/GitChanges.module.css` → `src/components/git/GitChanges.module.css`。
- B0 diff inspection: 6 distinct hunk context(s) extracted (up to 30): `import React, { useState, useCallback, useRef, useEffect, useMemo, useContext }`; `import FileBrowserModal from './FileBrowserModal';`; `export default function FileExplorer({ style, onClose, onFileClick, expandedPath`; `import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'`; `import { useSessionStoragePersistedSet } from '../../hooks/useSessionStoragePers`; `export default function GitChanges({ style, onClose, onFileClick, onOpenFile, on`.
- Upstream commit message excerpt: 两处头部刷新按钮从自绘 SVG RefreshIcon 换成与「上下文消耗」同款的 antd text 小按钮 + ReloadOutlined，压缩至 16×16 贴合 11px 标题栏； 点击后无限旋转 loading 直到刷新完成（仅手动点击时转）。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-975313773a"></a>
## [975313773a](./cc-viewer-alignment-commit-ledger.md#commit-975313773a) — feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表

- B0 snapshot comparison: 3 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T05:01:21+08:00；父提交 1；相对第一父文件数 14。
- 上游生产/配置文件：7；上游测试文件：5。
- 上游测试：`apps/web/test/active-agents-bar.test.js`, `apps/web/test/activeAgents.test.js`, `apps/web/test/chat-active-agents-wiring.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdkTaskTracker.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 25 distinct hunk context(s) extracted (up to 30): `import React, { useEffect, useMemo, useState } from 'react';`; `import { t } from '../../i18n';`; `import {`; `import styles from './ActiveAgentsBar.module.css';`; `export default function ActiveAgentsBar({ requests, selectedKey = null, onSelect`; `import ActiveAgentsBar from './ActiveAgentsBar';`; `class ChatView extends React.Component {`; `const i18nData = {`; `function parseNamePrefix(text) {`; `export function avatarTypeFromSubType(subType) {`; `export function firstUserText(req) {`; `export function deriveActiveAgents(tasks) {`; `export function resolveAgentIdentity(agent, toolUseMap) {`; `export function applyFrame(frame) {`; `export function resetForView() {`; `export function resetForSession() {`; `export function applySnapshot(frame) {`; `const css = readFileSync(CSS_PATH, 'utf-8');`; `function rule(sel) {`; `describe('ActiveAgentsBar source contract', () => {`; `describe('activeAgents.js', () => {`; `describe('ChatView active-agents wiring contract', () => {`; `const KEYS = [`; `describe('new UI key i18n coverage', () => {`; `describe('utils/sdkTaskTracker.js', () => {`.
- Upstream commit message excerpt: 右上角浮层由 24px 头像条改为标题 + 数量 + 行列表（状态点、名称、当前 工具、耗时），对齐 dynamic workflow 面板风格；移除 (ALL) 按钮与点击头像 过滤对话及整套 focus 机制；有活跃代理即显示、结束自动消失，与角色筛选互斥。 WS 重连后保留当前工具标签、且不再重置已运行耗时。

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-8bba70ec69"></a>
## [8bba70ec69](./cc-viewer-alignment-commit-ledger.md#commit-8bba70ec69) — Merge pull request #175 from weiesky/feat/active-agents-card

- B0 snapshot comparison: 10 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T05:06:51+08:00；父提交 2；相对第一父文件数 33。
- 上游生产/配置文件：18；上游测试文件：10。
- 上游测试：`apps/web/test/active-agents-bar.test.js`, `apps/web/test/activeAgents.test.js`, `apps/web/test/chat-active-agents-wiring.test.js`, `apps/web/test/new-ui-i18n.test.js`, `apps/web/test/sdkTaskTracker.test.js`, `packages/app/test/events-attach-buffer.test.js`, `packages/app/test/events-v3-cold-backpressure.test.js`, `packages/app/test/sse-attach-buffer.test.js`, `packages/app/test/wire-compress.test.js`, `packages/app/test/ws-mux-backpressure.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/Mobile.jsx` → `src/Mobile.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/dashboard/AppHeader.jsx` → `src/components/dashboard/AppHeader.jsx`; `apps/web/src/components/files/FileExplorer.jsx` → `src/components/files/FileExplorer.jsx`; `apps/web/src/components/files/FileExplorer.module.css` → `src/components/files/FileExplorer.module.css`; `apps/web/src/components/git/GitChanges.jsx` → `src/components/git/GitChanges.jsx`; `apps/web/src/components/git/GitChanges.module.css` → `src/components/git/GitChanges.module.css`; `apps/web/src/components/settings/ProxyModal.jsx` → `src/components/settings/ProxyModal.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(web): --sdk 活跃 SubAgent/Teammate 浮条改为可折叠卡片列表

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-efe935cd43"></a>
## [efe935cd43](./cc-viewer-alignment-commit-ledger.md#commit-efe935cd43) — chore(release): 1.9.28

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T05:07:29+08:00；父提交 1；相对第一父文件数 6。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-2e09d30192"></a>
## [2e09d30192](./cc-viewer-alignment-commit-ledger.md#commit-2e09d30192) — feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T13:30:05+08:00；父提交 1；相对第一父文件数 10。
- 上游生产/配置文件：7；上游测试文件：1。
- 上游测试：`apps/web/test/chat-quote-i18n.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`。
- B0 diff inspection: 7 distinct hunk context(s) extracted (up to 30): `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `class ChatMessage extends React.Component {`; `import React from 'react';`; `import { reconcileOptimisticQueueMessages, captureOptimisticQueueTextCounts } fr`; `class ChatView extends React.Component {`; `const i18nData = {`.
- Upstream commit message excerpt: - 在助手气泡内选中文字（正文/表格/代码）浮出「添加到对话」按钮，点击后作为引用 chip 插入输入框上方（可删除、点击/键盘预览全文）。 - 发送时引用以 > 块拼在用户消息前；slash 命令时跳过拼接并保留 chip，避免破坏命令识别；多行引用经 bracketed-paste 发送避免 PTY 把换行当提交。 - 通过 data-ccv-role 钩子限定助手气泡（绕开 CSS-module hash），触屏/键盘选区经 selectionchange 防抖弹出。 Coverage: chat-quote-i18n.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-1b3c2268e3"></a>
## [1b3c2268e3](./cc-viewer-alignment-commit-ledger.md#commit-1b3c2268e3) — feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片

- B0 snapshot comparison: 6 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T16:25:24+08:00；父提交 1；相对第一父文件数 10。
- 上游生产/配置文件：7；上游测试文件：1。
- 上游测试：`apps/web/test/chat-quote-i18n.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/AskQuestionForm.jsx` → `src/components/chat/AskQuestionForm.jsx`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/DiffView.jsx` → `src/components/chat/DiffView.jsx`; `apps/web/src/components/chat/DiffView.module.css` → `src/components/chat/DiffView.module.css`。
- B0 diff inspection: 17 distinct hunk context(s) extracted (up to 30): `import { optionAriaLabel, hasOptionDescription } from '../../utils/askOptionDesc`; `import styles from './ChatMessage.module.css';`; `export default class AskQuestionForm extends React.Component {`; `class ChatMessage extends React.Component {`; `import { reconcileOptimisticQueueMessages, captureOptimisticQueueTextCounts } fr`; `class ChatView extends React.Component {`; `function DiffView({ file_path, old_string, new_string, startLine = 1, onOpenFile`; `export function toElement(node) {`; `export function selectionInSingleAssistantMd(selection) {`; `export function isSlashCommandText(userText) {`; `import { fileURLToPath } from 'url';`; `describe('chat quote wiring', () => {`; `describe('toElement', () => {`; `describe('truncateQuote', () => {`; `function el({ bubble = null, md = null } = {}) {`; `function selOf(startNode, endNode, { collapsed = false } = {}) {`; `describe('selectionInSingleAssistantMd', () => {`.
- Upstream commit message excerpt: - 选区门槛泛化为「同一助手气泡 + 同一 quotable 区域」：除 markdown(.chat-md) 外，新增 [data-ccv-quotable] 区域——Edit/Write 代码 diff(codeWrap)、工具卡片 KV 参数区(kvContainer)、AskUserQuestion 卡片(问题+选项)。 - diff 按选中可见纯文本引用（行号/+/- 经 gutter user-select:none 排除）；AskUserQuestion 选项行改为可选中，◉/☑ 字形不可选；选项行拖选文本时经 guardWhileSelecting 守卫不误触切换。 - 门槛拒绝多范围选区与空白选区；portaled 审批弹层/简化 pill 因无气泡祖先而不触发。 Coverage: chat-quote-i18n.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-478268a4db"></a>
## [478268a4db](./cc-viewer-alignment-commit-ledger.md#commit-478268a4db) — feat(web): copy selected chat markdown as markdown source

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T18:48:44+08:00；父提交 1；相对第一父文件数 10。
- 上游生产/配置文件：6；上游测试文件：1。
- 上游测试：`apps/web/test/markdown-copy.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/package.json` → `package.json`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/vite.config.js` → `vite.config.js`。
- B0 diff inspection: 8 distinct hunk context(s) extracted (up to 30): `import { reconcileOptimisticQueueMessages, captureOptimisticQueueTextCounts } fr`; `class ChatView extends React.Component {`; `function sharedClosest(startEl, endEl, sel) {`; `const i18nData = {`; `export default defineConfig(() => {`; `importers:`; `packages:`; `snapshots:`.
- Upstream commit message excerpt: Selection inside an assistant bubble's .chat-md region now writes markdown to text/plain (and the original rendered HTML to text/html) instead of plain text. Uses Turndown + GFM with a custom rule that restores data-md-file links as angle-bracket destinations. Other selections fall through to native copy. Coverage: markdown-copy.test.js

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-13ad396d5e"></a>
## [13ad396d5e](./cc-viewer-alignment-commit-ledger.md#commit-13ad396d5e) — chore(star-history): refresh chart [skip ci]

- B0 snapshot comparison: 0 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T11:13:15+00:00；父提交 1；相对第一父文件数 1。
- 上游生产/配置文件：0；上游测试文件：0。
- 未找到路径或唯一文件名候选；不代表本地必然没有等价功能。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-8f1d345309"></a>
## [8f1d345309](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309) — feat(web): move prompt-nav into composer and relocate mic in --sdk layout

- B0 snapshot comparison: 4 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T23:10:26+08:00；父提交 1；相对第一父文件数 10。
- 上游生产/配置文件：6；上游测试文件：1。
- 上游测试：`apps/web/test/activeAgents.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/utils/promptNav.js` → `src/utils/promptNav.js`。
- B0 diff inspection: 10 distinct hunk context(s) extracted (up to 30): `import styles from './ActiveAgentsBar.module.css';`; `const SPEECH_LANG_MAP = {`; `function ChatInputBar({ inputRef, inputEmpty, inputSuggestion, terminalVisible,`; `import { formatPromptNavTime, formatHms } from '../../utils/formatters';`; `class ChatView extends React.Component {`; `const NAME_PREFIX_RE = /^(.{1,64}?)\s*[:：]\s*\S/;`; `export function buildAgentToolUseMap(requests) {`; `export function deriveActiveAgents(tasks) {`; `import { getSlashCommandLabel } from './slashCommandLabels.js';`; `describe('activeAgents.js', () => {`.
- Upstream commit message excerpt: Two related changes: 1. --sdk composer layout: prompt-nav entry and voice input swap sides. - Remove the left-sidebar avatar entry in --sdk mode (and in --terminal when the PTY is hidden). Add a circular avatar button in the composer left cluster (where mic used to sit) that opens a click-driven Popover with the same prompt-nav content. - Move the mic button from the composer left cluster to the right cluster, between proxyChip and send. - Show the legacy layout in --terminal while the PTY is shown, and on mobile (unchanged). - Single-source the layout predicate as utils/promptNav.shouldUseComposerPromptNav({isMobile, sdkMode, terminalVisible, cliMode}), consumed by both ChatView and ChatInputBar. - Close the composer popover when the user picks a nav item or clicks "more"; reset promptNavOpen in componentDidUpdate when the layout predicate flips off. 2. Active-agents card no longer inflates with unnamed nested rows. - deriveActiveAgents: defensive filter — drop agent tasks with an emp…

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-ac56c9c6d5"></a>
## [ac56c9c6d5](./cc-viewer-alignment-commit-ledger.md#commit-ac56c9c6d5) — Merge pull request #176 from weiesky/feat/sdk-composer-prompt-nav

- B0 snapshot comparison: 13 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T23:20:04+08:00；父提交 2；相对第一父文件数 27。
- 上游生产/配置文件：17；上游测试文件：3。
- 上游测试：`apps/web/test/activeAgents.test.js`, `apps/web/test/chat-quote-i18n.test.js`, `apps/web/test/markdown-copy.test.js`。
- 本地候选（仅按路径/唯一文件名匹配）：`apps/web/package.json` → `package.json`; `apps/web/src/components/chat/AskQuestionForm.jsx` → `src/components/chat/AskQuestionForm.jsx`; `apps/web/src/components/chat/ChatInputBar.jsx` → `src/components/chat/ChatInputBar.jsx`; `apps/web/src/components/chat/ChatInputBar.module.css` → `src/components/chat/ChatInputBar.module.css`; `apps/web/src/components/chat/ChatMessage.jsx` → `src/components/chat/ChatMessage.jsx`; `apps/web/src/components/chat/ChatMessage.module.css` → `src/components/chat/ChatMessage.module.css`; `apps/web/src/components/chat/ChatView.jsx` → `src/components/chat/ChatView.jsx`; `apps/web/src/components/chat/ChatView.module.css` → `src/components/chat/ChatView.module.css`; `apps/web/src/components/chat/DiffView.jsx` → `src/components/chat/DiffView.jsx`; `apps/web/src/components/chat/DiffView.module.css` → `src/components/chat/DiffView.module.css`; `apps/web/src/i18n.js` → `src/i18n.js`; `apps/web/src/utils/promptNav.js` → `src/utils/promptNav.js`; `apps/web/vite.config.js` → `vite.config.js`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.
- Upstream commit message excerpt: feat(web): move prompt-nav into composer and relocate mic in --sdk layout

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。

<a id="evidence-74cd752d99"></a>
## [74cd752d99](./cc-viewer-alignment-commit-ledger.md#commit-74cd752d99) — chore(release): 1.9.29

- B0 snapshot comparison: 1 candidate paths compared against the final upstream snapshot; no exact blob matches. Blob equality only proves file content equality at the two snapshots, not feature equivalence; unmatched or deleted paths remain unresolved.

- 提交：2026-11-16T23:21:08+08:00；父提交 1；相对第一父文件数 7。
- 上游生产/配置文件：1；上游测试文件：0。
- 本地候选（仅按路径/唯一文件名匹配）：`packages/app/package.json` → `package.json`。
- B0 diff inspection: no named hunk contexts; consult changed paths and full diff.

- 审查状态：文件证据已提取；功能行为和后续修复仍需逐项核验。
