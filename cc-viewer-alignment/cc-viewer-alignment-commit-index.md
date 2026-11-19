# cc-viewer 对齐：按时间线的完整提交索引

基准：cx-viewer npm 1.1.20 发布于 2026-07-26 04:55:08 UTC；上游快照 `74cd752d99caf122e750216d2af3bb9f467c4de1`。索引按 Git **提交时间**升序排列，共 337 条；作者时间可能不同。

每项链接到[逐提交台账](./cc-viewer-alignment-commit-ledger.md)的对应记录，包含上游 commit 链接、父提交、作者时间和全部变更路径。主题是机器初筛，不等于最终归属或已确认的移植决策。合并记录保留用于追踪血缘，不能与子提交重复移植。

先提供完整时间线，再提供各工作包的完整候选清单；一个类别可以分配多个工作包，以免遗漏交叉影响。工作包中的提交同样按时间升序，最终实施仍须依据依赖排序。

## 全部提交时间线

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-07-26T14:41:46+08:00 | [3eb16102e5](./cc-viewer-alignment-commit-ledger.md#commit-3eb16102e5) | E | fix(proxy-stats): make the config tab's scroll viewport resolve |
| 2026-07-26T14:41:56+08:00 | [51b3443e57](./cc-viewer-alignment-commit-ledger.md#commit-51b3443e57) | E | fix(proxy-stats): restore the stats-tab refresh controls |
| 2026-07-26T14:42:06+08:00 | [935a33cc0a](./cc-viewer-alignment-commit-ledger.md#commit-935a33cc0a) | E | fix(proxy-stats): keep retryBurden range JSON-safe |
| 2026-07-26T14:42:16+08:00 | [eef9fd870e](./cc-viewer-alignment-commit-ledger.md#commit-eef9fd870e) | N | refactor: drop dead code left by the retry-stats redesign |
| 2026-07-26T14:42:24+08:00 | [60cb46ce98](./cc-viewer-alignment-commit-ledger.md#commit-60cb46ce98) | E | docs(history): condense the Unreleased proxy-stats entries |
| 2026-07-26T15:30:25+08:00 | [42207f7fd1](./cc-viewer-alignment-commit-ledger.md#commit-42207f7fd1) | D | fix(test): remove timing assumptions from brotli decode helpers |
| 2026-07-26T03:34:40-04:00 | [00dd0eaf94](./cc-viewer-alignment-commit-ledger.md#commit-00dd0eaf94) | M | Merge pull request #131 from souloss/feat/retry-stats-modal |
| 2026-07-26T17:06:42+08:00 | [6bd3b80e58](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58) | K | fix(win): restore Claude discovery and Electron tab launch on Windows |
| 2026-07-26T17:12:24+08:00 | [1626575652](./cc-viewer-alignment-commit-ledger.md#commit-1626575652) | R | chore(release): bump version to 1.7.8 |
| 2026-07-26T21:37:19+08:00 | [ef64e15621](./cc-viewer-alignment-commit-ledger.md#commit-ef64e15621) | K | fix(findcc): move native resolution before PATH to avoid ERROR_BAD_EXE_FORMAT on Windows |
| 2026-07-26T23:48:06+08:00 | [9600351738](./cc-viewer-alignment-commit-ledger.md#commit-9600351738) | K | fix(electron): add missing src/utils/ to electron-builder bundle |
| 2026-07-27T10:41:52+08:00 | [20e4a63b24](./cc-viewer-alignment-commit-ledger.md#commit-20e4a63b24) | D | fix(test): drop install-layout assumption from the last-resort candidate assertion |
| 2026-07-27T06:41:06+00:00 | [071398e55a](./cc-viewer-alignment-commit-ledger.md#commit-071398e55a) | R | chore(star-history): refresh chart [skip ci] |
| 2026-07-27T15:15:33+08:00 | [b2d57c8d38](./cc-viewer-alignment-commit-ledger.md#commit-b2d57c8d38) | M | Merge remote-tracking branch 'origin/main' into pr-132 |
| 2026-07-27T15:20:25+08:00 | [1db2a38eab](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab) | X | fix(ccswitch-import): unify sqlite recovery retries |
| 2026-07-27T05:30:24-04:00 | [a803382c76](./cc-viewer-alignment-commit-ledger.md#commit-a803382c76) | M | Merge pull request #132 from souloss/fix/ccswitch-readonly-recovery |
| 2026-07-28T10:52:27+08:00 | [87432d4c5a](./cc-viewer-alignment-commit-ledger.md#commit-87432d4c5a) | X | fix(migrate): respect status:'done' in pendingOf() to stop false re-prompts after migration |
| 2026-07-28T14:18:23+08:00 | [25e118170c](./cc-viewer-alignment-commit-ledger.md#commit-25e118170c) | D | fix(proxy-retry): preserve streaming response metadata |
| 2026-07-28T02:33:01-04:00 | [617da66c96](./cc-viewer-alignment-commit-ledger.md#commit-617da66c96) | M | Merge pull request #134 from souloss/feat/proxy-retry-stream-idle |
| 2026-07-28T23:21:31+08:00 | [c768e8beb3](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) | X | fix(test): stop viewer resources before cleanup |
| 2026-07-28T11:45:08-04:00 | [0f3c16d6c7](./cc-viewer-alignment-commit-ledger.md#commit-0f3c16d6c7) | M | Merge pull request #135 from souloss/fix/ci-flakes-brotli-rmsync |
| 2026-07-29T11:50:00+08:00 | [82db2b907c](./cc-viewer-alignment-commit-ledger.md#commit-82db2b907c) | E | ui(proxy-stats): align retry stats chart colors with app theme; release 1.7.11 |
| 2026-07-30T23:47:39+08:00 | [e932bbef2e](./cc-viewer-alignment-commit-ledger.md#commit-e932bbef2e) | E | feat(context): kimi logo refresh + context-window follows hot-switched model |
| 2026-08-01T02:57:48+08:00 | [6baff0cd6f](./cc-viewer-alignment-commit-ledger.md#commit-6baff0cd6f) | K | feat(log-list): perf cache + server-side pagination + project switcher (1.7.13) |
| 2026-08-01T17:15:34+08:00 | [9c0463bb8c](./cc-viewer-alignment-commit-ledger.md#commit-9c0463bb8c) | E | prompt(kimi): anti-loop guardrails in kimi-k3/k2.7-code system-prompt presets (1.7.14) |
| 2026-08-03T00:24:46+08:00 | [8c8b96eafe](./cc-viewer-alignment-commit-ledger.md#commit-8c8b96eafe) | R | fix(release): bump version to 1.7.14 for re-publish |
| 2026-08-03T13:42:44+08:00 | [fc68e850f2](./cc-viewer-alignment-commit-ledger.md#commit-fc68e850f2) | J | feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15) |
| 2026-08-03T06:33:40+00:00 | [4c2765d308](./cc-viewer-alignment-commit-ledger.md#commit-4c2765d308) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-05T02:25:30+08:00 | [e4fc788b9e](./cc-viewer-alignment-commit-ledger.md#commit-e4fc788b9e) | J | fix(v2-read): finalize crash orphans as completed deltas on cold reads (1.7.16) |
| 2026-08-05T04:19:23+08:00 | [f3a8413db9](./cc-viewer-alignment-commit-ledger.md#commit-f3a8413db9) | C | fix(chat): wire-agent identity for teammate/subagent classification (1.7.17) |
| 2026-08-07T16:20:04+08:00 | [e12dcaded9](./cc-viewer-alignment-commit-ledger.md#commit-e12dcaded9) | J | ui(chat): PC composer polish — 1000px cap, themed strip, white card + shadow, focus-expand animation |
| 2026-08-07T16:20:04+08:00 | [fcfef597dd](./cc-viewer-alignment-commit-ledger.md#commit-fcfef597dd) | J | ui(chat): scope the 1400px chat cap to message items via .container > * |
| 2026-08-07T07:10:05-04:00 | [73e4b44ccd](./cc-viewer-alignment-commit-ledger.md#commit-73e4b44ccd) | M | Merge pull request #139 from weiesky/feat/chat-composer-polish |
| 2026-08-08T12:39:22+08:00 | [b78a51eb1d](./cc-viewer-alignment-commit-ledger.md#commit-b78a51eb1d) | E | fix(system-prompt): bare k3 resolves to the Kimi entry (1.7.18) |
| 2026-08-10T04:52:55+00:00 | [94e110620d](./cc-viewer-alignment-commit-ledger.md#commit-94e110620d) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-12T13:56:18+08:00 | [d88982c6ce](./cc-viewer-alignment-commit-ledger.md#commit-d88982c6ce) | X | fix(codefuse): exit managed CCV with Claude (1.7.19) |
| 2026-08-12T16:12:40+08:00 | [0c12335e53](./cc-viewer-alignment-commit-ledger.md#commit-0c12335e53) | X | fix(release): bump package version to 1.7.20 |
| 2026-08-16T11:11:26-04:00 | [69b104cbf3](./cc-viewer-alignment-commit-ledger.md#commit-69b104cbf3) | E | feat(system-prompt): type-ahead model names in "+ Add model" dialog (1.7.21) |
| 2026-08-17T04:01:01+00:00 | [7b0d3646d9](./cc-viewer-alignment-commit-ledger.md#commit-7b0d3646d9) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-17T00:16:49-04:00 | [02ce99f202](./cc-viewer-alignment-commit-ledger.md#commit-02ce99f202) | E | feat(system-prompt): auto header entry, model-aware default tab, chip icon |
| 2026-08-17T04:30:14+00:00 | [5c468c042e](./cc-viewer-alignment-commit-ledger.md#commit-5c468c042e) | A | fix: CVE-2026-13676 security vulnerability |
| 2026-08-17T00:48:40-04:00 | [ea8c5e39e0](./cc-viewer-alignment-commit-ledger.md#commit-ea8c5e39e0) | X | fix(test): cli-boot fixture shadows real /usr/local/bin/claude via PATH shim |
| 2026-08-17T08:03:36-04:00 | [3cc05b496d](./cc-viewer-alignment-commit-ledger.md#commit-3cc05b496d) | B | feat(proxy): per-role proxy sources for Main Agent / Sub-Agent / Teammate (1.7.22) |
| 2026-08-17T13:35:58+00:00 | [9255663e33](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33) | A | fix: CVE-2026-39244 security vulnerability |
| 2026-08-17T22:46:51-04:00 | [6680d041d4](./cc-viewer-alignment-commit-ledger.md#commit-6680d041d4) | H | feat(tools): sync tool catalog to Claude Code 2.1.233 — 21 new tools, MCP & Extensions category |
| 2026-08-18T06:19:09-04:00 | [a97d0f8adf](./cc-viewer-alignment-commit-ledger.md#commit-a97d0f8adf) | H | docs(concepts): "Activation" sections for gated tools in all 18 locales |
| 2026-08-18T06:40:50-04:00 | [3f141cb974](./cc-viewer-alignment-commit-ledger.md#commit-3f141cb974) | M | Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip |
| 2026-08-18T06:42:07-04:00 | [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4) | M | Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri |
| 2026-08-18T06:42:17-04:00 | [721e2c9940](./cc-viewer-alignment-commit-ledger.md#commit-721e2c9940) | M | Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri |
| 2026-08-19T10:49:45+08:00 | [817dc87a8e](./cc-viewer-alignment-commit-ledger.md#commit-817dc87a8e) | R | bump version to 1.7.23 |
| 2026-08-20T09:27:51-04:00 | [dabc5232ce](./cc-viewer-alignment-commit-ledger.md#commit-dabc5232ce) | B | chore(pnpm): migrate package manager from npm to pnpm 11.22 (stage A1) |
| 2026-08-20T09:34:00-04:00 | [20ccfb7304](./cc-viewer-alignment-commit-ledger.md#commit-20ccfb7304) | H | refactor(content): extract bundled assets into packages/content (@ccv/content) |
| 2026-08-20T09:34:00-04:00 | [3b5103bb9e](./cc-viewer-alignment-commit-ledger.md#commit-3b5103bb9e) | L | ci(contract): add L4 tarball-layout gate (verify:tarball + committed baseline) |
| 2026-08-20T09:34:00-04:00 | [729b886893](./cc-viewer-alignment-commit-ledger.md#commit-729b886893) | E | refactor(boundaries): break static cycles + add import-boundary gate for packages/app |
| 2026-08-20T09:34:00-04:00 | [7d83b5deff](./cc-viewer-alignment-commit-ledger.md#commit-7d83b5deff) | R | chore(changesets): adopt @changesets/cli for cc-viewer versioning (stage A3) |
| 2026-08-20T09:34:00-04:00 | [e3ca28c52d](./cc-viewer-alignment-commit-ledger.md#commit-e3ca28c52d) | A | refactor(monorepo): split into apps/{web,electron} + packages/app workspace layout (stage A2) |
| 2026-08-20T09:34:00-04:00 | [f9467bfc83](./cc-viewer-alignment-commit-ledger.md#commit-f9467bfc83) | C | refactor(server): group server/lib batch-1 into im/ ask/ proxy/ subdirectories |
| 2026-08-20T09:34:01-04:00 | [047db59b80](./cc-viewer-alignment-commit-ledger.md#commit-047db59b80) | A | refactor(monorepo): @ccv/core extraction + boundary gate + per-package test distribution |
| 2026-08-20T09:34:01-04:00 | [16267dc04c](./cc-viewer-alignment-commit-ledger.md#commit-16267dc04c) | B | fix(system-prompt): pin original system prompt on -c/-r resumes |
| 2026-08-20T09:39:45-04:00 | [cda9ed326d](./cc-viewer-alignment-commit-ledger.md#commit-cda9ed326d) | A | fix(deps): carry CVE-2026-13676/CVE-2026-39244 fixes into the monorepo layout |
| 2026-08-23T13:30:04+08:00 | [72551f625b](./cc-viewer-alignment-commit-ledger.md#commit-72551f625b) | E | fix(system-prompt): drop 7 loop-volatile dynamic prompt variables |
| 2026-08-23T14:08:45+08:00 | [efc7f8eab1](./cc-viewer-alignment-commit-ledger.md#commit-efc7f8eab1) | C | feat(chat): floating composer overlay + SDK full-surface parity |
| 2026-08-23T15:05:38+08:00 | [6ebeea8439](./cc-viewer-alignment-commit-ledger.md#commit-6ebeea8439) | M | Merge branch 'feat/remove-volatile-prompt-vars' |
| 2026-08-23T15:32:21+08:00 | [93a17ea623](./cc-viewer-alignment-commit-ledger.md#commit-93a17ea623) | I | chore(tarball): add approval-policy.js + launch-config.js to the tarball baseline |
| 2026-08-23T22:16:20+08:00 | [7a2dd6162e](./cc-viewer-alignment-commit-ledger.md#commit-7a2dd6162e) | C | fix(sdk): expand all system segments in request JSON view on first-turn MainAgent requests |
| 2026-08-23T19:33:38-04:00 | [dafe2bce37](./cc-viewer-alignment-commit-ledger.md#commit-dafe2bce37) | C | feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes |
| 2026-08-24T10:30:01+08:00 | [e987c387f4](./cc-viewer-alignment-commit-ledger.md#commit-e987c387f4) | R | release: cc-viewer 1.8.0 (changeset version) |
| 2026-08-24T10:46:13+08:00 | [6bcf5e5ab3](./cc-viewer-alignment-commit-ledger.md#commit-6bcf5e5ab3) | D | fix(electron): preserve publish metadata in staging |
| 2026-08-24T11:47:56+08:00 | [bb8095c7fb](./cc-viewer-alignment-commit-ledger.md#commit-bb8095c7fb) | D | fix(release): streamline notarization and tarball checks |
| 2026-08-24T04:03:53+00:00 | [7ac9363385](./cc-viewer-alignment-commit-ledger.md#commit-7ac9363385) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-24T12:06:49+08:00 | [bacfe559fe](./cc-viewer-alignment-commit-ledger.md#commit-bacfe559fe) | X | fix(release): support npm 12 pack output |
| 2026-08-24T05:24:41-04:00 | [c185a7484e](./cc-viewer-alignment-commit-ledger.md#commit-c185a7484e) | L | refactor(context): rename Context tab per-exchange "Turn N" concept to "Step N" |
| 2026-08-24T07:24:56-04:00 | [dc1aeb2840](./cc-viewer-alignment-commit-ledger.md#commit-dc1aeb2840) | F | docs(research): add automated test-case generation survey |
| 2026-08-24T07:26:46-04:00 | [f28d9cae37](./cc-viewer-alignment-commit-ledger.md#commit-f28d9cae37) | L | feat(ultraplan): add Test Analysis Expert (测分专家) preset expert |
| 2026-08-24T11:22:01-04:00 | [fe0c52ff60](./cc-viewer-alignment-commit-ledger.md#commit-fe0c52ff60) | E | feat(system-prompt): built-in model system prompts default-effective with override + tombstone disable |
| 2026-08-24T11:22:40-04:00 | [936e4637c8](./cc-viewer-alignment-commit-ledger.md#commit-936e4637c8) | R | release: cc-viewer 1.8.1 (changeset version) |
| 2026-08-24T23:41:40-04:00 | [1af3d646c9](./cc-viewer-alignment-commit-ledger.md#commit-1af3d646c9) | L | fix(ultraplan): rework Test Analysis Expert preset around Plan tool with staticized Midscene rules |
| 2026-08-25T06:42:11-04:00 | [7c1963aca1](./cc-viewer-alignment-commit-ledger.md#commit-7c1963aca1) | E | fix(app-header): show only main profile on proxy hot-switch chip |
| 2026-08-25T15:46:11-04:00 | [3a2159219b](./cc-viewer-alignment-commit-ledger.md#commit-3a2159219b) | E | feat(context): default unrecognized model context window to 1M |
| 2026-08-25T15:46:39-04:00 | [9eb178145b](./cc-viewer-alignment-commit-ledger.md#commit-9eb178145b) | N | refactor(footer): plain GitHub link and hide plan-usage pill without data |
| 2026-08-25T15:47:02-04:00 | [51c974e441](./cc-viewer-alignment-commit-ledger.md#commit-51c974e441) | I | feat(permission): default auto-approve to a 3s countdown |
| 2026-08-25T15:47:27-04:00 | [72c059f6b9](./cc-viewer-alignment-commit-ledger.md#commit-72c059f6b9) | C | feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset |
| 2026-08-25T15:48:25-04:00 | [0d067a1b7c](./cc-viewer-alignment-commit-ledger.md#commit-0d067a1b7c) | C | docs(changelog): history.md entries for 1M default, footer simplification, 3s auto-approve, teammate prompt rules |
| 2026-08-26T20:02:58+08:00 | [73557f1989](./cc-viewer-alignment-commit-ledger.md#commit-73557f1989) | L | chore(scripts): regenerate tarball baseline for GLM-5.3 preset |
| 2026-08-26T11:27:52-04:00 | [d858204313](./cc-viewer-alignment-commit-ledger.md#commit-d858204313) | D | fix(git): show local commits on branches without an upstream in the changes panel |
| 2026-08-27T01:39:07-04:00 | [20e6573b7c](./cc-viewer-alignment-commit-ledger.md#commit-20e6573b7c) | J | feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step |
| 2026-08-31T00:35:15+08:00 | [8fb468ddc8](./cc-viewer-alignment-commit-ledger.md#commit-8fb468ddc8) | E | fix(system-prompt): add background-agent waiting discipline to Kimi presets |
| 2026-08-31T00:47:54+08:00 | [2f83632f32](./cc-viewer-alignment-commit-ledger.md#commit-2f83632f32) | R | release: cc-viewer 1.8.3 (changeset version) |
| 2026-08-31T09:42:51+00:00 | [5352005402](./cc-viewer-alignment-commit-ledger.md#commit-5352005402) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-01T10:34:33+08:00 | [fa77ecd681](./cc-viewer-alignment-commit-ledger.md#commit-fa77ecd681) | D | fix(v2): exclude proxy retry-stat shards from legacy v1 log sniffing |
| 2026-09-01T12:21:31-04:00 | [1c5fadafbf](./cc-viewer-alignment-commit-ledger.md#commit-1c5fadafbf) | J | feat(chat): Claude Code task checklist HUD docked above the chat composer |
| 2026-09-01T12:22:46-04:00 | [52adf8968a](./cc-viewer-alignment-commit-ledger.md#commit-52adf8968a) | R | chore(release): 1.8.5 |
| 2026-09-02T11:32:38-04:00 | [a70440ee62](./cc-viewer-alignment-commit-ledger.md#commit-a70440ee62) | J | feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on) |
| 2026-09-02T11:34:15-04:00 | [44320725ab](./cc-viewer-alignment-commit-ledger.md#commit-44320725ab) | R | chore(release): 1.8.6 |
| 2026-09-04T12:59:26+08:00 | [bd50636219](./cc-viewer-alignment-commit-ledger.md#commit-bd50636219) | F | perf(search): move node-engine scan to a worker thread, virtualize result list |
| 2026-09-04T14:14:12+08:00 | [cdabb27454](./cc-viewer-alignment-commit-ledger.md#commit-cdabb27454) | L | fix(footer): hide geo badge for non-Anthropic-official subscriptions |
| 2026-09-04T17:28:59+08:00 | [d5e66ec1d8](./cc-viewer-alignment-commit-ledger.md#commit-d5e66ec1d8) | E | feat(cli): inject enhanced context into headless (-p)/one-shot run sessions without starting GUI |
| 2026-09-04T18:45:02+08:00 | [ef28ec388d](./cc-viewer-alignment-commit-ledger.md#commit-ef28ec388d) | R | chore(release): 1.8.7 |
| 2026-09-05T21:48:13+08:00 | [ba3eee8fd5](./cc-viewer-alignment-commit-ledger.md#commit-ba3eee8fd5) | D | feat(files): add "Download to local" context-menu item for remote sessions, streamed via GET /api/download-file |
| 2026-09-06T02:11:02+08:00 | [57798b7ccc](./cc-viewer-alignment-commit-ledger.md#commit-57798b7ccc) | L | fix(logs): project switch lag, single-page pager, and pager spacing in log-management modal |
| 2026-09-06T02:27:48+08:00 | [2cb0806a32](./cc-viewer-alignment-commit-ledger.md#commit-2cb0806a32) | R | chore(release): 1.8.8 |
| 2026-09-06T02:31:47+08:00 | [9b1a2c913a](./cc-viewer-alignment-commit-ledger.md#commit-9b1a2c913a) | N | docs(claude): document release tag ordering — changeset version bump must land before tagging |
| 2026-09-07T01:57:34+08:00 | [aa58422956](./cc-viewer-alignment-commit-ledger.md#commit-aa58422956) | J | feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges |
| 2026-09-07T01:57:45+08:00 | [b7678de6f6](./cc-viewer-alignment-commit-ledger.md#commit-b7678de6f6) | R | chore(release): 1.8.9 |
| 2026-09-07T02:07:00+08:00 | [85b9aabce4](./cc-viewer-alignment-commit-ledger.md#commit-85b9aabce4) | L | fix(ci): widen bump-homebrew npm-registry wait window to 10min |
| 2026-09-07T11:16:48+08:00 | [caaab3d12f](./cc-viewer-alignment-commit-ledger.md#commit-caaab3d12f) | J | fix(chat): User Prompt Nav language switch + session-divider attribution (#142) |
| 2026-09-07T08:16:12+00:00 | [39acd8150f](./cc-viewer-alignment-commit-ledger.md#commit-39acd8150f) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-07T16:51:57+08:00 | [36df32b7e1](./cc-viewer-alignment-commit-ledger.md#commit-36df32b7e1) | A | fix(server): allow authenticated remote admins to use management endpoints |
| 2026-09-07T16:53:10+08:00 | [513577d01c](./cc-viewer-alignment-commit-ledger.md#commit-513577d01c) | R | chore(release): 1.8.10 |
| 2026-09-07T17:16:10+08:00 | [4385631527](./cc-viewer-alignment-commit-ledger.md#commit-4385631527) | R | chore(release): add server/lib/is-admin.js to tarball baseline |
| 2026-09-07T17:48:09+08:00 | [71cee60794](./cc-viewer-alignment-commit-ledger.md#commit-71cee60794) | L | fix(ci): close the release-pipeline gaps that made releases fail repeatedly |
| 2026-09-09T04:26:05+08:00 | [6880f77320](./cc-viewer-alignment-commit-ledger.md#commit-6880f77320) | J | feat(chat): clickable local file paths in markdown links and code spans |
| 2026-09-09T04:26:14+08:00 | [55544f6e40](./cc-viewer-alignment-commit-ledger.md#commit-55544f6e40) | R | chore(release): 1.8.11 |
| 2026-09-09T20:20:19+08:00 | [865604d68e](./cc-viewer-alignment-commit-ledger.md#commit-865604d68e) | F | feat(files): remote web file browser modal with shared context menu + image thumbnails |
| 2026-09-09T20:22:04+08:00 | [2a0d1b30d3](./cc-viewer-alignment-commit-ledger.md#commit-2a0d1b30d3) | R | chore(release): 1.8.12 |
| 2026-09-10T05:52:58+08:00 | [365af800e5](./cc-viewer-alignment-commit-ledger.md#commit-365af800e5) | F | feat(files): file browser modal upload + in-project drag-move + zone drag feedback |
| 2026-09-10T05:53:47+08:00 | [3a737c97ed](./cc-viewer-alignment-commit-ledger.md#commit-3a737c97ed) | R | chore(release): 1.8.13 |
| 2026-09-10T06:12:47+08:00 | [48d6e0f3c3](./cc-viewer-alignment-commit-ledger.md#commit-48d6e0f3c3) | L | fix(tests): await stopViewer in server.test.js to fix EPIPE flake |
| 2026-09-12T22:14:38+08:00 | [bf2d6f2ad8](./cc-viewer-alignment-commit-ledger.md#commit-bf2d6f2ad8) | C | feat(chat): task-list HUD progress dots + reset task list on new prompt |
| 2026-09-12T22:14:49+08:00 | [5aa5728b95](./cc-viewer-alignment-commit-ledger.md#commit-5aa5728b95) | F | feat(files): unify open-project icon to open in-app web file browser |
| 2026-09-12T22:14:49+08:00 | [a278d68954](./cc-viewer-alignment-commit-ledger.md#commit-a278d68954) | F | feat(files): per-file-type SVG icons in the file browser |
| 2026-09-12T22:14:57+08:00 | [637fbb0218](./cc-viewer-alignment-commit-ledger.md#commit-637fbb0218) | X | feat(files): theme-adaptive file-type icon colors (dark/light) |
| 2026-09-12T22:15:04+08:00 | [0480a10437](./cc-viewer-alignment-commit-ledger.md#commit-0480a10437) | R | chore(release): 1.8.14 |
| 2026-09-13T00:11:04+08:00 | [0cfc040c0a](./cc-viewer-alignment-commit-ledger.md#commit-0cfc040c0a) | D | fix(tests): close SSE subscription gracefully in UserPromptSubmit integration test |
| 2026-09-13T15:12:05+08:00 | [d7f355ba89](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89) | B | fix(chat): rebuild conversation immediately on mid-round page refresh |
| 2026-09-14T02:01:44+08:00 | [96c477d582](./cc-viewer-alignment-commit-ledger.md#commit-96c477d582) | L | fix(server): guard execWithStdin against EPIPE when child exits early |
| 2026-09-14T02:01:54+08:00 | [60d20e6417](./cc-viewer-alignment-commit-ledger.md#commit-60d20e6417) | R | chore(release): add changeset for execWithStdin EPIPE guard |
| 2026-09-14T08:53:12+00:00 | [ca34587ce5](./cc-viewer-alignment-commit-ledger.md#commit-ca34587ce5) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-15T21:52:16+08:00 | [085c21516f](./cc-viewer-alignment-commit-ledger.md#commit-085c21516f) | E | feat(proxy): system 提示词热切换、内置 preset 族系合并与别名扩展 |
| 2026-09-15T21:52:16+08:00 | [17df4e2fbf](./cc-viewer-alignment-commit-ledger.md#commit-17df4e2fbf) | B | fix(proxy): Bind A 一次性闩只锁成功消费 + review 修复 + 终端集成可观测与裸续接检测(静默) |
| 2026-09-15T21:52:16+08:00 | [5939b38f93](./cc-viewer-alignment-commit-ledger.md#commit-5939b38f93) | R | chore(release): add changesets for bind-latch fixes and terminal-integration observability |
| 2026-09-15T22:07:58+08:00 | [9c1d079f86](./cc-viewer-alignment-commit-ledger.md#commit-9c1d079f86) | R | chore(release): 1.8.15 |
| 2026-09-15T23:45:23+08:00 | [89a0a25364](./cc-viewer-alignment-commit-ledger.md#commit-89a0a25364) | N | docs(claude): rewrite CLAUDE.md as prohibitions-only, add patch-only versioning rule |
| 2026-09-16T08:23:33+08:00 | [b604b1e4f1](./cc-viewer-alignment-commit-ledger.md#commit-b604b1e4f1) | E | feat(system-prompt): add async no-poll rule to kimi-k3 preset; drop defensive-engineering line from all prompt templates |
| 2026-09-16T08:53:02+08:00 | [2e17699fd7](./cc-viewer-alignment-commit-ledger.md#commit-2e17699fd7) | L | feat(git): show +n/-n line stats on unpushed-commit rows, restore real file statuses |
| 2026-09-17T15:07:11+08:00 | [0670581b3d](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d) | D | fix(chat): release cold-ingest gate on pipeline failure to unfreeze conversation panel |
| 2026-09-17T15:12:28+08:00 | [8923322f88](./cc-viewer-alignment-commit-ledger.md#commit-8923322f88) | L | chore(ultraplan): refine code-expert review priority wording |
| 2026-09-17T15:12:44+08:00 | [301c04bd5e](./cc-viewer-alignment-commit-ledger.md#commit-301c04bd5e) | R | chore(release): version packages |
| 2026-09-17T15:22:10+08:00 | [2049aef95e](./cc-viewer-alignment-commit-ledger.md#commit-2049aef95e) | X | fix(release): publish to npm patch channel to unblock patch-line releases |
| 2026-09-17T16:23:59+08:00 | [5b544c6ee1](./cc-viewer-alignment-commit-ledger.md#commit-5b544c6ee1) | X | fix(release): point npm latest at the just-published version |
| 2026-09-18T16:21:22+08:00 | [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8) | C | feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config |
| 2026-09-19T09:19:10+08:00 | [90b41358f9](./cc-viewer-alignment-commit-ledger.md#commit-90b41358f9) | L | ci: soft-fail npm dist-tag step under OIDC trusted publishing |
| 2026-09-21T11:41:00+08:00 | [b1fe5c09a6](./cc-viewer-alignment-commit-ledger.md#commit-b1fe5c09a6) | N | docs: add config convergence & cloud-sync advisory, link from READMEs |
| 2026-09-21T11:43:15+08:00 | [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68) | A | feat(server): unify config JSON writes behind a locked+atomic json-store kernel |
| 2026-09-21T11:45:20+08:00 | [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290) | A | feat(server): encrypt local credentials at rest in an AES-256-GCM vault |
| 2026-09-21T08:54:48+00:00 | [5a494ba37c](./cc-viewer-alignment-commit-ledger.md#commit-5a494ba37c) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-21T17:17:04+08:00 | [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) | A | fix(server): close review findings on the credential vault + json-store convergence |
| 2026-09-21T20:52:14+08:00 | [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) | A | fix(server): revert credential root to frozen; close re-review findings |
| 2026-09-21T23:31:43+08:00 | [964ce756b6](./cc-viewer-alignment-commit-ledger.md#commit-964ce756b6) | N | docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter |
| 2026-09-22T00:31:52+08:00 | [68fd263aac](./cc-viewer-alignment-commit-ledger.md#commit-68fd263aac) | R | chore(release): 1.8.20 |
| 2026-09-22T00:50:37+08:00 | [19f563d300](./cc-viewer-alignment-commit-ledger.md#commit-19f563d300) | R | chore(release): 1.8.20 |
| 2026-09-22T00:50:37+08:00 | [384dee8025](./cc-viewer-alignment-commit-ledger.md#commit-384dee8025) | N | docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter |
| 2026-09-22T00:50:37+08:00 | [3c78188314](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314) | A | fix(server): close review findings on the credential vault + json-store convergence |
| 2026-09-22T00:50:37+08:00 | [3cba408188](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188) | A | fix(server): revert credential root to frozen; close re-review findings |
| 2026-09-22T00:50:37+08:00 | [811b049485](./cc-viewer-alignment-commit-ledger.md#commit-811b049485) | A | feat(server): encrypt local credentials at rest in an AES-256-GCM vault |
| 2026-09-22T00:50:37+08:00 | [9adf4ef539](./cc-viewer-alignment-commit-ledger.md#commit-9adf4ef539) | N | docs: add config convergence & cloud-sync advisory, link from READMEs |
| 2026-09-22T00:50:37+08:00 | [d663452c29](./cc-viewer-alignment-commit-ledger.md#commit-d663452c29) | A | feat(server): unify config JSON writes behind a locked+atomic json-store kernel |
| 2026-09-21T13:13:47-04:00 | [cb50f60d5e](./cc-viewer-alignment-commit-ledger.md#commit-cb50f60d5e) | M | Merge pull request #144 from weiesky/feature/config-convergence |
| 2026-09-28T09:44:10+00:00 | [975e1ee8ce](./cc-viewer-alignment-commit-ledger.md#commit-975e1ee8ce) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-05T10:23:57+00:00 | [2ae12ca122](./cc-viewer-alignment-commit-ledger.md#commit-2ae12ca122) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-08T12:20:24+08:00 | [eb2e9703a2](./cc-viewer-alignment-commit-ledger.md#commit-eb2e9703a2) | B | feat(web): project tab drag-to-reorder + persist order; focus/mask fixes; 1.8.x series summary (v1.9.1) (#145) |
| 2026-10-09T17:23:44+08:00 | [649f853e5e](./cc-viewer-alignment-commit-ledger.md#commit-649f853e5e) | B | Feat/resume global switcher (#146) |
| 2026-10-09T17:29:49+08:00 | [97f22c8c9a](./cc-viewer-alignment-commit-ledger.md#commit-97f22c8c9a) | R | chore(release): 1.9.2 |
| 2026-10-09T18:48:22+08:00 | [3fa5717865](./cc-viewer-alignment-commit-ledger.md#commit-3fa5717865) | L | ci(release): carry `latest` on the publish itself, widen the homebrew poll |
| 2026-10-10T10:08:58+08:00 | [c93c3110ed](./cc-viewer-alignment-commit-ledger.md#commit-c93c3110ed) | X | Update README.md |
| 2026-10-10T15:24:07+08:00 | [d6cab4869a](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) | B | feat(server): relay SDK task_* messages as sdk-task WS frames (#147) |
| 2026-10-10T15:35:57+08:00 | [956af1723f](./cc-viewer-alignment-commit-ledger.md#commit-956af1723f) | R | chore(release): 1.9.3 |
| 2026-10-10T22:53:55+08:00 | [7f7f78e2d8](./cc-viewer-alignment-commit-ledger.md#commit-7f7f78e2d8) | B | feat(web): 新建工作区目录树「启动」一步直启 |
| 2026-10-12T10:46:32+00:00 | [d88d8aee2a](./cc-viewer-alignment-commit-ledger.md#commit-d88d8aee2a) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-13T00:25:47+08:00 | [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) | C | feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板 |
| 2026-10-13T00:25:48+08:00 | [133bc219df](./cc-viewer-alignment-commit-ledger.md#commit-133bc219df) | C | feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环 |
| 2026-10-13T00:25:48+08:00 | [2be5bb23f6](./cc-viewer-alignment-commit-ledger.md#commit-2be5bb23f6) | B | feat(ui): 小终端(scratch)按工作区分组并伴随视图切换,关闭工作区连带回收 |
| 2026-10-13T00:25:48+08:00 | [3079040494](./cc-viewer-alignment-commit-ledger.md#commit-3079040494) | B | feat(sdk): SDK 模式改为每工作区独立常驻会话(按 cwd 多会话,对齐 PTY) |
| 2026-10-13T00:25:48+08:00 | [5a7349a23b](./cc-viewer-alignment-commit-ledger.md#commit-5a7349a23b) | R | chore(release): 1.9.4 |
| 2026-10-13T00:25:48+08:00 | [a07464187c](./cc-viewer-alignment-commit-ledger.md#commit-a07464187c) | B | fix(web): 新建工作区弹窗底部出血加高 |
| 2026-10-13T00:25:48+08:00 | [ad369d2856](./cc-viewer-alignment-commit-ledger.md#commit-ad369d2856) | C | chore(sdk): getContextUsage 超时定时器 unref + settle 后 clearTimeout |
| 2026-10-13T00:25:48+08:00 | [bc669f59cc](./cc-viewer-alignment-commit-ledger.md#commit-bc669f59cc) | C | test(sdk): 补提交 SDK 会话状态(turn-level session-state)测试 |
| 2026-10-13T00:25:48+08:00 | [c4529a6ed7](./cc-viewer-alignment-commit-ledger.md#commit-c4529a6ed7) | C | fix(ui): 对话 loading 覆盖整个回合,本地工具执行期不再误熄 |
| 2026-10-13T22:25:34+08:00 | [2dbe5cd695](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) | X | feat(web): 汉堡菜单「钉住」持久化迁移到 preferences.json (#148) |
| 2026-10-13T22:27:41+08:00 | [5c28d4c50a](./cc-viewer-alignment-commit-ledger.md#commit-5c28d4c50a) | B | feat(sse): per-workspace independent SSE channels |
| 2026-10-14T00:12:29+08:00 | [a30d8c92a7](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7) | B | fix(sse): per-workspace SSE 通道 CR 修复(P1×7+P2×7)与 git-diff flake |
| 2026-10-14T00:14:24+08:00 | [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807) | M | Merge remote-tracking branch 'origin/main' into fix/sse-per-workspace-cr |
| 2026-10-14T00:20:15+08:00 | [d01259c844](./cc-viewer-alignment-commit-ledger.md#commit-d01259c844) | M | Merge pull request #149 from weiesky/fix/sse-per-workspace-cr |
| 2026-10-14T11:21:29+08:00 | [db2ada0866](./cc-viewer-alignment-commit-ledger.md#commit-db2ada0866) | D | feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback |
| 2026-10-14T13:36:20+08:00 | [e6baf89e6a](./cc-viewer-alignment-commit-ledger.md#commit-e6baf89e6a) | M | Merge pull request #150 from weiesky/feat/ws-mux-dialogue-channel |
| 2026-10-14T13:39:26+08:00 | [8aefa1c29e](./cc-viewer-alignment-commit-ledger.md#commit-8aefa1c29e) | R | chore(release): 1.9.5 |
| 2026-10-14T15:07:09+08:00 | [f20efc1371](./cc-viewer-alignment-commit-ledger.md#commit-f20efc1371) | B | fix: use temporary keychain password for macOS signing (#151) |
| 2026-10-15T11:31:54+08:00 | [4991ba762d](./cc-viewer-alignment-commit-ledger.md#commit-4991ba762d) | D | fix(sse): WS-mux cold-load queue overflow left dialogue blank after refresh |
| 2026-10-15T13:12:09+08:00 | [a84385b5a8](./cc-viewer-alignment-commit-ledger.md#commit-a84385b5a8) | B | feat(sdk): per-workspace close + stable instance identity for same-name disambiguation |
| 2026-10-15T13:47:57+08:00 | [46d33276c9](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9) | D | fix(sse): gate ws.mux.diag probes + pin perMessageDeflate:false (CR follow-up) |
| 2026-10-15T13:56:04+08:00 | [0a9ad5d767](./cc-viewer-alignment-commit-ledger.md#commit-0a9ad5d767) | M | Merge pull request #152 from weiesky/feat/sdk-instance-close-ws-mux-overflow |
| 2026-10-15T13:56:40+08:00 | [983d08b571](./cc-viewer-alignment-commit-ledger.md#commit-983d08b571) | R | chore(release): 1.9.6 |
| 2026-10-15T15:47:29+08:00 | [7830664780](./cc-viewer-alignment-commit-ledger.md#commit-7830664780) | F | fix(web): 文件树行高不再被压缩抖动 |
| 2026-10-15T15:53:49+08:00 | [ec440163c0](./cc-viewer-alignment-commit-ledger.md#commit-ec440163c0) | M | Merge pull request #153 from weiesky/fix/file-tree-row-shrink |
| 2026-10-16T23:50:11+08:00 | [d906edb3de](./cc-viewer-alignment-commit-ledger.md#commit-d906edb3de) | J | feat(web): skill scope rows + frosted glass bars |
| 2026-10-17T00:43:41+08:00 | [b500ebf76c](./cc-viewer-alignment-commit-ledger.md#commit-b500ebf76c) | R | chore(release): 1.9.7 |
| 2026-10-17T00:44:46+08:00 | [06e1db54c7](./cc-viewer-alignment-commit-ledger.md#commit-06e1db54c7) | M | Merge pull request #154 from weiesky/fix/file-tree-row-shrink |
| 2026-10-19T08:50:05+00:00 | [51dec0fbe1](./cc-viewer-alignment-commit-ledger.md#commit-51dec0fbe1) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-21T01:29:53+08:00 | [2847027b54](./cc-viewer-alignment-commit-ledger.md#commit-2847027b54) | C | fix(server): 权限自动审批覆盖目录外 Read/Glob/Grep |
| 2026-10-21T01:32:20+08:00 | [5d42d90533](./cc-viewer-alignment-commit-ledger.md#commit-5d42d90533) | R | chore(release): 1.9.8 |
| 2026-10-21T11:43:49+08:00 | [3d4f098f08](./cc-viewer-alignment-commit-ledger.md#commit-3d4f098f08) | I | fix(web): stop askUserQuestion 'Other' input from triggering browser password save (#155) |
| 2026-10-21T17:56:26+08:00 | [67ceb5b7f0](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) | C | feat(web): "/" 弹出斜杠技能菜单 |
| 2026-10-21T17:57:20+08:00 | [51c23e9090](./cc-viewer-alignment-commit-ledger.md#commit-51c23e9090) | B | fix(web): 修复 SDK 模式 plan 审批卡死 |
| 2026-10-21T17:57:20+08:00 | [a2be00c45b](./cc-viewer-alignment-commit-ledger.md#commit-a2be00c45b) | F | feat(web): 桌面文件上传收纳进 (+) 菜单 |
| 2026-10-21T18:09:34+08:00 | [9dbf4e295a](./cc-viewer-alignment-commit-ledger.md#commit-9dbf4e295a) | C | fix(web): SDK 模式打开终端不再隐藏对话输入框 |
| 2026-10-21T18:48:08+08:00 | [3cf3e9585f](./cc-viewer-alignment-commit-ledger.md#commit-3cf3e9585f) | F | fix(web): (+) 菜单顶层「上传文件」行 hover 时收起残留的级联子菜单 |
| 2026-10-21T18:50:40+08:00 | [3c77d9a8ed](./cc-viewer-alignment-commit-ledger.md#commit-3c77d9a8ed) | M | Merge pull request #156 from weiesky/feat/slash-skill-menu-sdk-fixes |
| 2026-10-21T18:51:17+08:00 | [baf4500607](./cc-viewer-alignment-commit-ledger.md#commit-baf4500607) | R | chore(release): 1.9.9 |
| 2026-10-22T10:43:06+08:00 | [45bfa4124d](./cc-viewer-alignment-commit-ledger.md#commit-45bfa4124d) | A | fix(server): gate [ccv:*] diagnostic logs on CCV_DEBUG |
| 2026-10-22T10:47:12+08:00 | [9b1bb4e729](./cc-viewer-alignment-commit-ledger.md#commit-9b1bb4e729) | C | fix(sdk): render turn/query failures as persistent rows in the dialogue tail |
| 2026-10-22T11:11:32+08:00 | [a336d3919f](./cc-viewer-alignment-commit-ledger.md#commit-a336d3919f) | K | feat(web): fold terminal toolbar upload into the sparkle quick-settings menu |
| 2026-10-22T11:18:40+08:00 | [9967ebdbc2](./cc-viewer-alignment-commit-ledger.md#commit-9967ebdbc2) | X | feat(web): rename AgentTeam menu label to localized quick-prompt wording |
| 2026-10-22T22:11:06+08:00 | [58493d1c85](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85) | H | feat(plugins): directory service plugins with same-port proxy + remote React panels |
| 2026-10-22T22:22:29+08:00 | [c6f887c385](./cc-viewer-alignment-commit-ledger.md#commit-c6f887c385) | R | chore(release): 1.9.10 |
| 2026-10-22T22:22:29+08:00 | [e8ea1ae96a](./cc-viewer-alignment-commit-ledger.md#commit-e8ea1ae96a) | N | docs(history): classify backlogged Unreleased entries into 1.9.4~1.9.9 sections |
| 2026-10-23T01:32:00+08:00 | [c66b5fe2ed](./cc-viewer-alignment-commit-ledger.md#commit-c66b5fe2ed) | C | feat(web): move proxy hot-switch chip into the chat input bar (#158) |
| 2026-10-23T02:56:44+08:00 | [3bd2aa9696](./cc-viewer-alignment-commit-ledger.md#commit-3bd2aa9696) | J | fix(ci): bump-homebrew tarball 下载加重试 (#159) |
| 2026-10-23T03:01:00+08:00 | [5d39fa11f3](./cc-viewer-alignment-commit-ledger.md#commit-5d39fa11f3) | R | chore(release): 1.9.11 |
| 2026-10-23T11:30:41+08:00 | [117ee25de2](./cc-viewer-alignment-commit-ledger.md#commit-117ee25de2) | J | fix(web): leave a scrollbar bleed on the input stack gradient (#160) |
| 2026-10-23T11:34:46+08:00 | [abdca8545c](./cc-viewer-alignment-commit-ledger.md#commit-abdca8545c) | R | chore(release): 1.9.12 |
| 2026-10-23T17:39:51+08:00 | [177b85df2c](./cc-viewer-alignment-commit-ledger.md#commit-177b85df2c) | G | feat(server+web): add scheduled tasks ("设置定时任务") |
| 2026-10-24T03:45:08+08:00 | [451ef48d6a](./cc-viewer-alignment-commit-ledger.md#commit-451ef48d6a) | A | feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish |
| 2026-10-24T03:46:45+08:00 | [47827e973a](./cc-viewer-alignment-commit-ledger.md#commit-47827e973a) | R | chore(release): 1.9.13 |
| 2026-10-24T15:52:35+08:00 | [6363a51ec0](./cc-viewer-alignment-commit-ledger.md#commit-6363a51ec0) | E | fix: recognize Kimi K3 model aliases |
| 2026-10-24T16:00:44+08:00 | [6bc7781bba](./cc-viewer-alignment-commit-ledger.md#commit-6bc7781bba) | B | test: isolate resume route PTY fixtures |
| 2026-10-24T16:01:24+08:00 | [0e1546e718](./cc-viewer-alignment-commit-ledger.md#commit-0e1546e718) | M | merge: isolate resume route PTY fixtures |
| 2026-10-24T16:06:49+08:00 | [f2ebb0fe6b](./cc-viewer-alignment-commit-ledger.md#commit-f2ebb0fe6b) | M | Merge pull request #161 from weiesky/fix/kimi-k3-model-aliases |
| 2026-10-24T16:08:19+08:00 | [c23590396f](./cc-viewer-alignment-commit-ledger.md#commit-c23590396f) | R | chore(release): 1.9.14 |
| 2026-10-24T20:57:57+08:00 | [ab1b89ee13](./cc-viewer-alignment-commit-ledger.md#commit-ab1b89ee13) | B | fix(files): scope file operations to viewed project |
| 2026-10-25T03:33:30+08:00 | [d89aa3b9af](./cc-viewer-alignment-commit-ledger.md#commit-d89aa3b9af) | C | fix(web): restore SDK thinking per assistant turn |
| 2026-10-25T18:09:42+08:00 | [9c36b5b5a7](./cc-viewer-alignment-commit-ledger.md#commit-9c36b5b5a7) | C | fix(web): stabilize context usage colors and scrolling |
| 2026-10-25T18:32:10+08:00 | [0c7195b689](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689) | X | fix(web): refresh changes after git commits |
| 2026-10-25T23:39:32+08:00 | [5ee6739cba](./cc-viewer-alignment-commit-ledger.md#commit-5ee6739cba) | G | feat: merge SDK context usage into blood bars |
| 2026-10-26T13:00:11+08:00 | [91b0055f2d](./cc-viewer-alignment-commit-ledger.md#commit-91b0055f2d) | B | fix(sdk): honor plan auto-approval settings |
| 2026-10-26T08:52:30+00:00 | [b9d592fc13](./cc-viewer-alignment-commit-ledger.md#commit-b9d592fc13) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-26T20:34:56+08:00 | [1aca9b5f8f](./cc-viewer-alignment-commit-ledger.md#commit-1aca9b5f8f) | B | fix(chat): restore queued prompts and queue dispatch state |
| 2026-10-26T21:20:41+08:00 | [a99506d5f5](./cc-viewer-alignment-commit-ledger.md#commit-a99506d5f5) | R | chore(release): 1.9.15 |
| 2026-10-26T21:26:59+08:00 | [2cd4488ce9](./cc-viewer-alignment-commit-ledger.md#commit-2cd4488ce9) | M | Merge pull request #162 from weiesky/fix/file-browser-view-scope |
| 2026-10-27T23:47:58+08:00 | [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac) | C | docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates |
| 2026-10-27T23:47:58+08:00 | [15751cf49c](./cc-viewer-alignment-commit-ledger.md#commit-15751cf49c) | E | chore(server): kimi-k3 preset forbids unrequested real-environment verification |
| 2026-10-27T23:47:58+08:00 | [1e0edc00f3](./cc-viewer-alignment-commit-ledger.md#commit-1e0edc00f3) | J | fix(web): inline queue send-now chip and clear placeholder on dispatch |
| 2026-10-27T23:47:58+08:00 | [566ade13fc](./cc-viewer-alignment-commit-ledger.md#commit-566ade13fc) | F | feat(web): open CLAUDE.md and skill folders |
| 2026-10-27T23:47:58+08:00 | [5e50112388](./cc-viewer-alignment-commit-ledger.md#commit-5e50112388) | C | fix(server+web): server-side auto-approve countdown for plan/perm approvals |
| 2026-10-27T23:47:58+08:00 | [aaa3a59444](./cc-viewer-alignment-commit-ledger.md#commit-aaa3a59444) | I | docs: changelog for server-side approval countdown and UltraReview template |
| 2026-10-27T23:49:53+08:00 | [67226f50c1](./cc-viewer-alignment-commit-ledger.md#commit-67226f50c1) | M | Merge pull request #163 from weiesky/fix/file-browser-view-scope |
| 2026-10-27T23:50:36+08:00 | [3e4f1064c2](./cc-viewer-alignment-commit-ledger.md#commit-3e4f1064c2) | R | chore(release): 1.9.16 |
| 2026-10-29T17:12:47+08:00 | [3d65bedcd1](./cc-viewer-alignment-commit-ledger.md#commit-3d65bedcd1) | C | fix(web): keep the composer blood bar visible when the SDK scratch terminal opens |
| 2026-10-29T17:14:03+08:00 | [7a75e1be81](./cc-viewer-alignment-commit-ledger.md#commit-7a75e1be81) | F | feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser |
| 2026-10-29T20:19:39+08:00 | [282306a950](./cc-viewer-alignment-commit-ledger.md#commit-282306a950) | C | fix(web): SDK-mode plan approval uses the plan card modal |
| 2026-10-29T22:44:02+08:00 | [ebfcbaec0d](./cc-viewer-alignment-commit-ledger.md#commit-ebfcbaec0d) | J | fix(web): hide Last Response when it duplicates the last assistant turn |
| 2026-10-30T00:20:58+08:00 | [1600211658](./cc-viewer-alignment-commit-ledger.md#commit-1600211658) | R | chore(release): 1.9.17 |
| 2026-10-30T14:14:30+08:00 | [208f134827](./cc-viewer-alignment-commit-ledger.md#commit-208f134827) | I | fix(server+web): fork review fixes for 1.9.17 — new-file save 403, plan modal reopen, fallback countdown |
| 2026-10-31T03:44:00+08:00 | [84e65cddc6](./cc-viewer-alignment-commit-ledger.md#commit-84e65cddc6) | C | fix(server+web): judge stuck SDK turns by activity probe, restore approvals on attach, keep Stop visible on long turns |
| 2026-10-31T03:44:09+08:00 | [cdf05bf8ee](./cc-viewer-alignment-commit-ledger.md#commit-cdf05bf8ee) | B | feat(server+web): inline 502/network retry feedback with progress and a manual resume-retry affordance |
| 2026-10-31T03:44:17+08:00 | [77b61bd571](./cc-viewer-alignment-commit-ledger.md#commit-77b61bd571) | H | fix(server+web): resilient sends, approval-hook timeout, SSE slow reconnect, off-mode stream idle watchdog |
| 2026-10-31T03:46:26+08:00 | [7039adeec3](./cc-viewer-alignment-commit-ledger.md#commit-7039adeec3) | R | chore(release): 1.9.18 |
| 2026-11-02T14:19:28+08:00 | [08809f6e69](./cc-viewer-alignment-commit-ledger.md#commit-08809f6e69) | A | perf(web): incremental scan in ToolFileChangeController.check (#164) |
| 2026-11-02T14:30:54+08:00 | [082673509e](./cc-viewer-alignment-commit-ledger.md#commit-082673509e) | A | Revert "perf(web): incremental scan in ToolFileChangeController.check (#164)" |
| 2026-11-02T14:34:52+08:00 | [469a995ad8](./cc-viewer-alignment-commit-ledger.md#commit-469a995ad8) | C | fix(web): keep minimised SDK ask modal minimised across view-switch |
| 2026-11-02T14:34:52+08:00 | [7641f5181a](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a) | C | fix(server): close two first-turn SDK rendering failures |
| 2026-11-02T14:34:52+08:00 | [7797672148](./cc-viewer-alignment-commit-ledger.md#commit-7797672148) | A | style(web): drop author name from GIT changes commit rows |
| 2026-11-02T14:34:52+08:00 | [88995a1046](./cc-viewer-alignment-commit-ledger.md#commit-88995a1046) | C | style(web): cap SDK error bar width at 800px |
| 2026-11-02T14:34:52+08:00 | [bd32d02884](./cc-viewer-alignment-commit-ledger.md#commit-bd32d02884) | B | fix(server): live-refresh new message in a resumed history project (SDK mode) |
| 2026-11-02T14:34:52+08:00 | [dd23ce8df1](./cc-viewer-alignment-commit-ledger.md#commit-dd23ce8df1) | F | feat(web): open file content directly on tree click in file browser |
| 2026-11-02T14:34:52+08:00 | [ee3545344e](./cc-viewer-alignment-commit-ledger.md#commit-ee3545344e) | C | fix(web): hide SDK error row while its retry is recovering |
| 2026-11-02T14:34:52+08:00 | [ef5fc8b168](./cc-viewer-alignment-commit-ledger.md#commit-ef5fc8b168) | A | feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界 |
| 2026-11-02T14:36:20+08:00 | [0cbb545288](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) | J | perf(web): incremental scan in ToolFileChangeController.check |
| 2026-11-02T14:51:28+08:00 | [1d4ea6e192](./cc-viewer-alignment-commit-ledger.md#commit-1d4ea6e192) | M | Merge pull request #165 from weiesky/fix/tool-file-monitor-incremental |
| 2026-11-02T14:54:00+08:00 | [66bfeb8c18](./cc-viewer-alignment-commit-ledger.md#commit-66bfeb8c18) | R | chore(release): 1.9.19 |
| 2026-11-02T18:52:18+08:00 | [c29af25e64](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) | C | fix(server+web): upstream v1.9.19 review — file-tree path, convSeqs single pass, toolUseMap LRU trim, approval guards |
| 2026-11-02T11:01:12+00:00 | [c0c13bbc86](./cc-viewer-alignment-commit-ledger.md#commit-c0c13bbc86) | R | chore(star-history): refresh chart [skip ci] |
| 2026-11-03T02:25:23+08:00 | [99256ac1d8](./cc-viewer-alignment-commit-ledger.md#commit-99256ac1d8) | B | fix(web): --sdk mode mobile terminal renders the scratch multi-tab shell |
| 2026-11-03T23:05:10+08:00 | [6b340326c6](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6) | C | feat(sdk): slow-upstream in-flight advisory |
| 2026-11-03T23:05:11+08:00 | [0cde7d1df8](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8) | C | feat(web): SDK mode task checklist HUD via sdk-task WS relay |
| 2026-11-03T23:05:11+08:00 | [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8) | C | fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2 |
| 2026-11-03T23:05:11+08:00 | [791a5e18f8](./cc-viewer-alignment-commit-ledger.md#commit-791a5e18f8) | J | feat(web): raise chat composer max height from 6 to 12 lines |
| 2026-11-03T23:05:11+08:00 | [92ed9bc751](./cc-viewer-alignment-commit-ledger.md#commit-92ed9bc751) | L | fix(content): unify UltraReview prompt to the TeamCreate-free version |
| 2026-11-03T23:05:11+08:00 | [d90ac9587d](./cc-viewer-alignment-commit-ledger.md#commit-d90ac9587d) | J | fix(web): render blank-whitespace text as no bubble instead of empty chat-boxer |
| 2026-11-03T23:32:38+08:00 | [b01ff6f502](./cc-viewer-alignment-commit-ledger.md#commit-b01ff6f502) | D | test(server): stabilize slow-upstream advisory test (CI flake) |
| 2026-11-03T23:36:54+08:00 | [14d85f8ce6](./cc-viewer-alignment-commit-ledger.md#commit-14d85f8ce6) | M | Merge pull request #166 from weiesky/release/slow-hud-cr-fixes |
| 2026-11-03T23:38:20+08:00 | [fd84486429](./cc-viewer-alignment-commit-ledger.md#commit-fd84486429) | R | chore(release): 1.9.20 |
| 2026-11-03T23:42:37+08:00 | [a09bc713ea](./cc-viewer-alignment-commit-ledger.md#commit-a09bc713ea) | M | Merge pull request #167 from weiesky/chore/release-1.9.20 |
| 2026-11-04T03:12:45+08:00 | [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) | C | fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2 |
| 2026-11-04T03:13:14+08:00 | [1bfc1585e8](./cc-viewer-alignment-commit-ledger.md#commit-1bfc1585e8) | C | fix(web): persist --sdk scratch terminal open state across refresh |
| 2026-11-04T12:16:31+08:00 | [ccf74880a5](./cc-viewer-alignment-commit-ledger.md#commit-ccf74880a5) | X | fix(web): render unmerged git status badges (UU/AA/DD/...) in red |
| 2026-11-04T12:34:40+08:00 | [32165d3a0b](./cc-viewer-alignment-commit-ledger.md#commit-32165d3a0b) | R | chore(release): 1.9.21 |
| 2026-11-04T15:23:00+08:00 | [7a0ba39edf](./cc-viewer-alignment-commit-ledger.md#commit-7a0ba39edf) | G | test(app): deflake git + scheduled-task tests — poll async launch, retry rmSync cleanup |
| 2026-11-05T18:45:17+08:00 | [b23c137372](./cc-viewer-alignment-commit-ledger.md#commit-b23c137372) | D | fix(logs): auto-shard oversized session logs by prompt count + manual per-shard load |
| 2026-11-05T21:41:54+08:00 | [57c732d037](./cc-viewer-alignment-commit-ledger.md#commit-57c732d037) | A | feat(server): add CCV_BASE_URL for cloud reverse-proxy deployment |
| 2026-11-05T22:34:01+08:00 | [ff0fe1ba93](./cc-viewer-alignment-commit-ledger.md#commit-ff0fe1ba93) | J | fix(web): keep pasted composer images across incoming chat updates |
| 2026-11-06T01:01:19+08:00 | [4391792212](./cc-viewer-alignment-commit-ledger.md#commit-4391792212) | A | review(3-commit CR): harden shard cursor/seeding + base-url parsing, dedupe shard cut resolution, translate new comments |
| 2026-11-06T01:03:27+08:00 | [0dfb4e13c5](./cc-viewer-alignment-commit-ledger.md#commit-0dfb4e13c5) | R | chore(release): 1.9.22 |
| 2026-11-09T11:28:16+00:00 | [3ce8f67a1c](./cc-viewer-alignment-commit-ledger.md#commit-3ce8f67a1c) | R | chore(star-history): refresh chart [skip ci] |
| 2026-11-10T23:16:37+08:00 | [2914d6479d](./cc-viewer-alignment-commit-ledger.md#commit-2914d6479d) | G | feat(web): quick-fill time buttons for one-time scheduled tasks (#169) |
| 2026-11-11T00:53:23+08:00 | [839f0f85ac](./cc-viewer-alignment-commit-ledger.md#commit-839f0f85ac) | E | fix(kimi-k3): add tool-error circuit-breaker section to preset |
| 2026-11-11T00:54:30+08:00 | [1ae82a825b](./cc-viewer-alignment-commit-ledger.md#commit-1ae82a825b) | N | chore(history): archive Unreleased entries under 1.9.23 |
| 2026-11-11T10:57:00+08:00 | [6081b5d01a](./cc-viewer-alignment-commit-ledger.md#commit-6081b5d01a) | C | feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting |
| 2026-11-11T11:14:03+08:00 | [d6ec38be82](./cc-viewer-alignment-commit-ledger.md#commit-d6ec38be82) | E | feat(header): stop auto-pinning system-prompt entry to top navbar |
| 2026-11-11T11:53:21+08:00 | [96f3a7a44e](./cc-viewer-alignment-commit-ledger.md#commit-96f3a7a44e) | E | feat(chat): move user-prompts entry from hamburger menu to prompt-nav "more" |
| 2026-11-11T16:53:06+08:00 | [a6b82f16df](./cc-viewer-alignment-commit-ledger.md#commit-a6b82f16df) | F | feat(web): 文件搜索并入文件浏览器面板并重排搜索控件 |
| 2026-11-11T19:06:26+08:00 | [ea995f3883](./cc-viewer-alignment-commit-ledger.md#commit-ea995f3883) | F | feat(web): drag files into terminal or chat |
| 2026-11-11T19:27:40+08:00 | [beaa2e86f2](./cc-viewer-alignment-commit-ledger.md#commit-beaa2e86f2) | F | feat(web): support dragging folders into terminal and chat |
| 2026-11-11T22:29:39+08:00 | [91a523d043](./cc-viewer-alignment-commit-ledger.md#commit-91a523d043) | F | feat: add cross-platform archive preview |
| 2026-11-12T00:08:33+08:00 | [f96811cddb](./cc-viewer-alignment-commit-ledger.md#commit-f96811cddb) | F | feat: unify file preview routing and binary guards |
| 2026-11-12T00:25:16+08:00 | [62012025cb](./cc-viewer-alignment-commit-ledger.md#commit-62012025cb) | L | ci: retry bounded zsh installation |
| 2026-11-12T00:35:20+08:00 | [f3db3ed9a2](./cc-viewer-alignment-commit-ledger.md#commit-f3db3ed9a2) | K | ci: avoid installing zsh for mocked shell tests |
| 2026-11-12T00:38:31+08:00 | [9e24827264](./cc-viewer-alignment-commit-ledger.md#commit-9e24827264) | M | Merge pull request #170 from weiesky/feat/file-preview-foundation |
| 2026-11-12T00:40:27+08:00 | [6dd3b3b7e5](./cc-viewer-alignment-commit-ledger.md#commit-6dd3b3b7e5) | F | chore: release 1.9.24 |
| 2026-11-12T10:28:17+08:00 | [6e3c93cd7c](./cc-viewer-alignment-commit-ledger.md#commit-6e3c93cd7c) | D | feat: add guided npm updates with restart |
| 2026-11-12T14:16:08+08:00 | [17ba9be7b5](./cc-viewer-alignment-commit-ledger.md#commit-17ba9be7b5) | K | fix: harden guided updates and restart recovery |
| 2026-11-12T14:54:03+08:00 | [5a7904990b](./cc-viewer-alignment-commit-ledger.md#commit-5a7904990b) | M | Merge pull request #171 from weiesky/feat/guided-npm-updates |
| 2026-11-12T15:10:08+08:00 | [c30ca279bd](./cc-viewer-alignment-commit-ledger.md#commit-c30ca279bd) | L | chore: release 1.9.25 |
| 2026-11-12T15:19:58+08:00 | [84373dff25](./cc-viewer-alignment-commit-ledger.md#commit-84373dff25) | M | Merge pull request #172 from weiesky/chore/release-1.9.25 |
| 2026-11-12T19:37:45+08:00 | [919fded845](./cc-viewer-alignment-commit-ledger.md#commit-919fded845) | C | fix(sdk): settle stale slow-upstream notices |
| 2026-11-13T01:24:19+08:00 | [20313b254c](./cc-viewer-alignment-commit-ledger.md#commit-20313b254c) | F | feat: add inline audio preview with streaming range support |
| 2026-11-13T05:19:14+08:00 | [18bd742bc5](./cc-viewer-alignment-commit-ledger.md#commit-18bd742bc5) | F | feat: add subtitle preview and extend image preview formats |
| 2026-11-13T11:37:24+08:00 | [ec14cd0234](./cc-viewer-alignment-commit-ledger.md#commit-ec14cd0234) | C | fix(sdk+web): blood bar (context usage) freeze — keepalive, watchdog, fetch deadline, ts self-heal |
| 2026-11-13T15:10:23+08:00 | [187583787d](./cc-viewer-alignment-commit-ledger.md#commit-187583787d) | C | feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate |
| 2026-11-13T15:27:47+08:00 | [23e4273a37](./cc-viewer-alignment-commit-ledger.md#commit-23e4273a37) | C | chore: release 1.9.26 |
| 2026-11-13T15:28:28+08:00 | [0ff3154822](./cc-viewer-alignment-commit-ledger.md#commit-0ff3154822) | M | Merge pull request #173 from weiesky/release/1.9.26 |
| 2026-11-13T17:40:24+08:00 | [dd8709356b](./cc-viewer-alignment-commit-ledger.md#commit-dd8709356b) | C | fix(web+server): close approval modal after server-side auto-advance |
| 2026-11-15T10:59:16+08:00 | [a2f5cd4b43](./cc-viewer-alignment-commit-ledger.md#commit-a2f5cd4b43) | B | feat(web): drag git changes (files, folders, commits) into chat or terminal |
| 2026-11-15T15:39:51+08:00 | [24c4f60b54](./cc-viewer-alignment-commit-ledger.md#commit-24c4f60b54) | M | Merge pull request #174 from weiesky/feat/git-changes-drag-drop |
| 2026-11-15T15:40:52+08:00 | [00fdfade79](./cc-viewer-alignment-commit-ledger.md#commit-00fdfade79) | I | chore: release 1.9.27 |
| 2026-11-16T03:24:03+08:00 | [bde0244333](./cc-viewer-alignment-commit-ledger.md#commit-bde0244333) | D | fix(server): WS-mux cold-load backpressure stall (1011 queue-overflow blank chat) |
| 2026-11-16T03:40:01+08:00 | [add350bc52](./cc-viewer-alignment-commit-ledger.md#commit-add350bc52) | C | fix(web): hide Teammate role in proxy hot-switch under SDK mode |
| 2026-11-16T03:50:52+08:00 | [5fc4c75229](./cc-viewer-alignment-commit-ledger.md#commit-5fc4c75229) | F | style(web): 统一 Git 变更 / 文件浏览器刷新按钮样式 |
| 2026-11-16T05:01:21+08:00 | [975313773a](./cc-viewer-alignment-commit-ledger.md#commit-975313773a) | C | feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表 |
| 2026-11-16T05:06:51+08:00 | [8bba70ec69](./cc-viewer-alignment-commit-ledger.md#commit-8bba70ec69) | M | Merge pull request #175 from weiesky/feat/active-agents-card |
| 2026-11-16T05:07:29+08:00 | [efe935cd43](./cc-viewer-alignment-commit-ledger.md#commit-efe935cd43) | R | chore(release): 1.9.28 |
| 2026-11-16T13:30:05+08:00 | [2e09d30192](./cc-viewer-alignment-commit-ledger.md#commit-2e09d30192) | J | feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送 |
| 2026-11-16T16:25:24+08:00 | [1b3c2268e3](./cc-viewer-alignment-commit-ledger.md#commit-1b3c2268e3) | I | feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片 |
| 2026-11-16T18:48:44+08:00 | [478268a4db](./cc-viewer-alignment-commit-ledger.md#commit-478268a4db) | J | feat(web): copy selected chat markdown as markdown source |
| 2026-11-16T11:13:15+00:00 | [13ad396d5e](./cc-viewer-alignment-commit-ledger.md#commit-13ad396d5e) | R | chore(star-history): refresh chart [skip ci] |
| 2026-11-16T23:10:26+08:00 | [8f1d345309](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309) | C | feat(web): move prompt-nav into composer and relocate mic in --sdk layout |
| 2026-11-16T23:20:04+08:00 | [ac56c9c6d5](./cc-viewer-alignment-commit-ledger.md#commit-ac56c9c6d5) | M | Merge pull request #176 from weiesky/feat/sdk-composer-prompt-nav |
| 2026-11-16T23:21:08+08:00 | [74cd752d99](./cc-viewer-alignment-commit-ledger.md#commit-74cd752d99) | R | chore(release): 1.9.29 |

## 按工作包查找

以下索引收录该工作包相关的**完整初筛类别**，因此可能包含不适用项或同时出现在其他工作包的条目。执行时逐项检查完整 diff、后续修复和本地行为，再回填最终处理结论。

<a id="b0"></a>
### B0 — 台账与提交血缘

初筛类别：`R, M, X`；候选 111 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-07-26T03:34:40-04:00 | [00dd0eaf94](./cc-viewer-alignment-commit-ledger.md#commit-00dd0eaf94) | M | Merge pull request #131 from souloss/feat/retry-stats-modal |
| 2026-07-26T17:12:24+08:00 | [1626575652](./cc-viewer-alignment-commit-ledger.md#commit-1626575652) | R | chore(release): bump version to 1.7.8 |
| 2026-07-27T06:41:06+00:00 | [071398e55a](./cc-viewer-alignment-commit-ledger.md#commit-071398e55a) | R | chore(star-history): refresh chart [skip ci] |
| 2026-07-27T15:15:33+08:00 | [b2d57c8d38](./cc-viewer-alignment-commit-ledger.md#commit-b2d57c8d38) | M | Merge remote-tracking branch 'origin/main' into pr-132 |
| 2026-07-27T15:20:25+08:00 | [1db2a38eab](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab) | X | fix(ccswitch-import): unify sqlite recovery retries |
| 2026-07-27T05:30:24-04:00 | [a803382c76](./cc-viewer-alignment-commit-ledger.md#commit-a803382c76) | M | Merge pull request #132 from souloss/fix/ccswitch-readonly-recovery |
| 2026-07-28T10:52:27+08:00 | [87432d4c5a](./cc-viewer-alignment-commit-ledger.md#commit-87432d4c5a) | X | fix(migrate): respect status:'done' in pendingOf() to stop false re-prompts after migration |
| 2026-07-28T02:33:01-04:00 | [617da66c96](./cc-viewer-alignment-commit-ledger.md#commit-617da66c96) | M | Merge pull request #134 from souloss/feat/proxy-retry-stream-idle |
| 2026-07-28T23:21:31+08:00 | [c768e8beb3](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) | X | fix(test): stop viewer resources before cleanup |
| 2026-07-28T11:45:08-04:00 | [0f3c16d6c7](./cc-viewer-alignment-commit-ledger.md#commit-0f3c16d6c7) | M | Merge pull request #135 from souloss/fix/ci-flakes-brotli-rmsync |
| 2026-08-03T00:24:46+08:00 | [8c8b96eafe](./cc-viewer-alignment-commit-ledger.md#commit-8c8b96eafe) | R | fix(release): bump version to 1.7.14 for re-publish |
| 2026-08-03T06:33:40+00:00 | [4c2765d308](./cc-viewer-alignment-commit-ledger.md#commit-4c2765d308) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-07T07:10:05-04:00 | [73e4b44ccd](./cc-viewer-alignment-commit-ledger.md#commit-73e4b44ccd) | M | Merge pull request #139 from weiesky/feat/chat-composer-polish |
| 2026-08-10T04:52:55+00:00 | [94e110620d](./cc-viewer-alignment-commit-ledger.md#commit-94e110620d) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-12T13:56:18+08:00 | [d88982c6ce](./cc-viewer-alignment-commit-ledger.md#commit-d88982c6ce) | X | fix(codefuse): exit managed CCV with Claude (1.7.19) |
| 2026-08-12T16:12:40+08:00 | [0c12335e53](./cc-viewer-alignment-commit-ledger.md#commit-0c12335e53) | X | fix(release): bump package version to 1.7.20 |
| 2026-08-17T04:01:01+00:00 | [7b0d3646d9](./cc-viewer-alignment-commit-ledger.md#commit-7b0d3646d9) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-17T00:48:40-04:00 | [ea8c5e39e0](./cc-viewer-alignment-commit-ledger.md#commit-ea8c5e39e0) | X | fix(test): cli-boot fixture shadows real /usr/local/bin/claude via PATH shim |
| 2026-08-18T06:40:50-04:00 | [3f141cb974](./cc-viewer-alignment-commit-ledger.md#commit-3f141cb974) | M | Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip |
| 2026-08-18T06:42:07-04:00 | [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4) | M | Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri |
| 2026-08-18T06:42:17-04:00 | [721e2c9940](./cc-viewer-alignment-commit-ledger.md#commit-721e2c9940) | M | Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri |
| 2026-08-19T10:49:45+08:00 | [817dc87a8e](./cc-viewer-alignment-commit-ledger.md#commit-817dc87a8e) | R | bump version to 1.7.23 |
| 2026-08-20T09:34:00-04:00 | [7d83b5deff](./cc-viewer-alignment-commit-ledger.md#commit-7d83b5deff) | R | chore(changesets): adopt @changesets/cli for cc-viewer versioning (stage A3) |
| 2026-08-23T15:05:38+08:00 | [6ebeea8439](./cc-viewer-alignment-commit-ledger.md#commit-6ebeea8439) | M | Merge branch 'feat/remove-volatile-prompt-vars' |
| 2026-08-24T10:30:01+08:00 | [e987c387f4](./cc-viewer-alignment-commit-ledger.md#commit-e987c387f4) | R | release: cc-viewer 1.8.0 (changeset version) |
| 2026-08-24T04:03:53+00:00 | [7ac9363385](./cc-viewer-alignment-commit-ledger.md#commit-7ac9363385) | R | chore(star-history): refresh chart [skip ci] |
| 2026-08-24T12:06:49+08:00 | [bacfe559fe](./cc-viewer-alignment-commit-ledger.md#commit-bacfe559fe) | X | fix(release): support npm 12 pack output |
| 2026-08-24T11:22:40-04:00 | [936e4637c8](./cc-viewer-alignment-commit-ledger.md#commit-936e4637c8) | R | release: cc-viewer 1.8.1 (changeset version) |
| 2026-08-31T00:47:54+08:00 | [2f83632f32](./cc-viewer-alignment-commit-ledger.md#commit-2f83632f32) | R | release: cc-viewer 1.8.3 (changeset version) |
| 2026-08-31T09:42:51+00:00 | [5352005402](./cc-viewer-alignment-commit-ledger.md#commit-5352005402) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-01T12:22:46-04:00 | [52adf8968a](./cc-viewer-alignment-commit-ledger.md#commit-52adf8968a) | R | chore(release): 1.8.5 |
| 2026-09-02T11:34:15-04:00 | [44320725ab](./cc-viewer-alignment-commit-ledger.md#commit-44320725ab) | R | chore(release): 1.8.6 |
| 2026-09-04T18:45:02+08:00 | [ef28ec388d](./cc-viewer-alignment-commit-ledger.md#commit-ef28ec388d) | R | chore(release): 1.8.7 |
| 2026-09-06T02:27:48+08:00 | [2cb0806a32](./cc-viewer-alignment-commit-ledger.md#commit-2cb0806a32) | R | chore(release): 1.8.8 |
| 2026-09-07T01:57:45+08:00 | [b7678de6f6](./cc-viewer-alignment-commit-ledger.md#commit-b7678de6f6) | R | chore(release): 1.8.9 |
| 2026-09-07T08:16:12+00:00 | [39acd8150f](./cc-viewer-alignment-commit-ledger.md#commit-39acd8150f) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-07T16:53:10+08:00 | [513577d01c](./cc-viewer-alignment-commit-ledger.md#commit-513577d01c) | R | chore(release): 1.8.10 |
| 2026-09-07T17:16:10+08:00 | [4385631527](./cc-viewer-alignment-commit-ledger.md#commit-4385631527) | R | chore(release): add server/lib/is-admin.js to tarball baseline |
| 2026-09-09T04:26:14+08:00 | [55544f6e40](./cc-viewer-alignment-commit-ledger.md#commit-55544f6e40) | R | chore(release): 1.8.11 |
| 2026-09-09T20:22:04+08:00 | [2a0d1b30d3](./cc-viewer-alignment-commit-ledger.md#commit-2a0d1b30d3) | R | chore(release): 1.8.12 |
| 2026-09-10T05:53:47+08:00 | [3a737c97ed](./cc-viewer-alignment-commit-ledger.md#commit-3a737c97ed) | R | chore(release): 1.8.13 |
| 2026-09-12T22:14:57+08:00 | [637fbb0218](./cc-viewer-alignment-commit-ledger.md#commit-637fbb0218) | X | feat(files): theme-adaptive file-type icon colors (dark/light) |
| 2026-09-12T22:15:04+08:00 | [0480a10437](./cc-viewer-alignment-commit-ledger.md#commit-0480a10437) | R | chore(release): 1.8.14 |
| 2026-09-14T02:01:54+08:00 | [60d20e6417](./cc-viewer-alignment-commit-ledger.md#commit-60d20e6417) | R | chore(release): add changeset for execWithStdin EPIPE guard |
| 2026-09-14T08:53:12+00:00 | [ca34587ce5](./cc-viewer-alignment-commit-ledger.md#commit-ca34587ce5) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-15T21:52:16+08:00 | [5939b38f93](./cc-viewer-alignment-commit-ledger.md#commit-5939b38f93) | R | chore(release): add changesets for bind-latch fixes and terminal-integration observability |
| 2026-09-15T22:07:58+08:00 | [9c1d079f86](./cc-viewer-alignment-commit-ledger.md#commit-9c1d079f86) | R | chore(release): 1.8.15 |
| 2026-09-17T15:12:44+08:00 | [301c04bd5e](./cc-viewer-alignment-commit-ledger.md#commit-301c04bd5e) | R | chore(release): version packages |
| 2026-09-17T15:22:10+08:00 | [2049aef95e](./cc-viewer-alignment-commit-ledger.md#commit-2049aef95e) | X | fix(release): publish to npm patch channel to unblock patch-line releases |
| 2026-09-17T16:23:59+08:00 | [5b544c6ee1](./cc-viewer-alignment-commit-ledger.md#commit-5b544c6ee1) | X | fix(release): point npm latest at the just-published version |
| 2026-09-21T08:54:48+00:00 | [5a494ba37c](./cc-viewer-alignment-commit-ledger.md#commit-5a494ba37c) | R | chore(star-history): refresh chart [skip ci] |
| 2026-09-22T00:31:52+08:00 | [68fd263aac](./cc-viewer-alignment-commit-ledger.md#commit-68fd263aac) | R | chore(release): 1.8.20 |
| 2026-09-22T00:50:37+08:00 | [19f563d300](./cc-viewer-alignment-commit-ledger.md#commit-19f563d300) | R | chore(release): 1.8.20 |
| 2026-09-21T13:13:47-04:00 | [cb50f60d5e](./cc-viewer-alignment-commit-ledger.md#commit-cb50f60d5e) | M | Merge pull request #144 from weiesky/feature/config-convergence |
| 2026-09-28T09:44:10+00:00 | [975e1ee8ce](./cc-viewer-alignment-commit-ledger.md#commit-975e1ee8ce) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-05T10:23:57+00:00 | [2ae12ca122](./cc-viewer-alignment-commit-ledger.md#commit-2ae12ca122) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-09T17:29:49+08:00 | [97f22c8c9a](./cc-viewer-alignment-commit-ledger.md#commit-97f22c8c9a) | R | chore(release): 1.9.2 |
| 2026-10-10T10:08:58+08:00 | [c93c3110ed](./cc-viewer-alignment-commit-ledger.md#commit-c93c3110ed) | X | Update README.md |
| 2026-10-10T15:35:57+08:00 | [956af1723f](./cc-viewer-alignment-commit-ledger.md#commit-956af1723f) | R | chore(release): 1.9.3 |
| 2026-10-12T10:46:32+00:00 | [d88d8aee2a](./cc-viewer-alignment-commit-ledger.md#commit-d88d8aee2a) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-13T00:25:48+08:00 | [5a7349a23b](./cc-viewer-alignment-commit-ledger.md#commit-5a7349a23b) | R | chore(release): 1.9.4 |
| 2026-10-13T22:25:34+08:00 | [2dbe5cd695](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) | X | feat(web): 汉堡菜单「钉住」持久化迁移到 preferences.json (#148) |
| 2026-10-14T00:14:24+08:00 | [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807) | M | Merge remote-tracking branch 'origin/main' into fix/sse-per-workspace-cr |
| 2026-10-14T00:20:15+08:00 | [d01259c844](./cc-viewer-alignment-commit-ledger.md#commit-d01259c844) | M | Merge pull request #149 from weiesky/fix/sse-per-workspace-cr |
| 2026-10-14T13:36:20+08:00 | [e6baf89e6a](./cc-viewer-alignment-commit-ledger.md#commit-e6baf89e6a) | M | Merge pull request #150 from weiesky/feat/ws-mux-dialogue-channel |
| 2026-10-14T13:39:26+08:00 | [8aefa1c29e](./cc-viewer-alignment-commit-ledger.md#commit-8aefa1c29e) | R | chore(release): 1.9.5 |
| 2026-10-15T13:56:04+08:00 | [0a9ad5d767](./cc-viewer-alignment-commit-ledger.md#commit-0a9ad5d767) | M | Merge pull request #152 from weiesky/feat/sdk-instance-close-ws-mux-overflow |
| 2026-10-15T13:56:40+08:00 | [983d08b571](./cc-viewer-alignment-commit-ledger.md#commit-983d08b571) | R | chore(release): 1.9.6 |
| 2026-10-15T15:53:49+08:00 | [ec440163c0](./cc-viewer-alignment-commit-ledger.md#commit-ec440163c0) | M | Merge pull request #153 from weiesky/fix/file-tree-row-shrink |
| 2026-10-17T00:43:41+08:00 | [b500ebf76c](./cc-viewer-alignment-commit-ledger.md#commit-b500ebf76c) | R | chore(release): 1.9.7 |
| 2026-10-17T00:44:46+08:00 | [06e1db54c7](./cc-viewer-alignment-commit-ledger.md#commit-06e1db54c7) | M | Merge pull request #154 from weiesky/fix/file-tree-row-shrink |
| 2026-10-19T08:50:05+00:00 | [51dec0fbe1](./cc-viewer-alignment-commit-ledger.md#commit-51dec0fbe1) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-21T01:32:20+08:00 | [5d42d90533](./cc-viewer-alignment-commit-ledger.md#commit-5d42d90533) | R | chore(release): 1.9.8 |
| 2026-10-21T18:50:40+08:00 | [3c77d9a8ed](./cc-viewer-alignment-commit-ledger.md#commit-3c77d9a8ed) | M | Merge pull request #156 from weiesky/feat/slash-skill-menu-sdk-fixes |
| 2026-10-21T18:51:17+08:00 | [baf4500607](./cc-viewer-alignment-commit-ledger.md#commit-baf4500607) | R | chore(release): 1.9.9 |
| 2026-10-22T11:18:40+08:00 | [9967ebdbc2](./cc-viewer-alignment-commit-ledger.md#commit-9967ebdbc2) | X | feat(web): rename AgentTeam menu label to localized quick-prompt wording |
| 2026-10-22T22:22:29+08:00 | [c6f887c385](./cc-viewer-alignment-commit-ledger.md#commit-c6f887c385) | R | chore(release): 1.9.10 |
| 2026-10-23T03:01:00+08:00 | [5d39fa11f3](./cc-viewer-alignment-commit-ledger.md#commit-5d39fa11f3) | R | chore(release): 1.9.11 |
| 2026-10-23T11:34:46+08:00 | [abdca8545c](./cc-viewer-alignment-commit-ledger.md#commit-abdca8545c) | R | chore(release): 1.9.12 |
| 2026-10-24T03:46:45+08:00 | [47827e973a](./cc-viewer-alignment-commit-ledger.md#commit-47827e973a) | R | chore(release): 1.9.13 |
| 2026-10-24T16:01:24+08:00 | [0e1546e718](./cc-viewer-alignment-commit-ledger.md#commit-0e1546e718) | M | merge: isolate resume route PTY fixtures |
| 2026-10-24T16:06:49+08:00 | [f2ebb0fe6b](./cc-viewer-alignment-commit-ledger.md#commit-f2ebb0fe6b) | M | Merge pull request #161 from weiesky/fix/kimi-k3-model-aliases |
| 2026-10-24T16:08:19+08:00 | [c23590396f](./cc-viewer-alignment-commit-ledger.md#commit-c23590396f) | R | chore(release): 1.9.14 |
| 2026-10-25T18:32:10+08:00 | [0c7195b689](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689) | X | fix(web): refresh changes after git commits |
| 2026-10-26T08:52:30+00:00 | [b9d592fc13](./cc-viewer-alignment-commit-ledger.md#commit-b9d592fc13) | R | chore(star-history): refresh chart [skip ci] |
| 2026-10-26T21:20:41+08:00 | [a99506d5f5](./cc-viewer-alignment-commit-ledger.md#commit-a99506d5f5) | R | chore(release): 1.9.15 |
| 2026-10-26T21:26:59+08:00 | [2cd4488ce9](./cc-viewer-alignment-commit-ledger.md#commit-2cd4488ce9) | M | Merge pull request #162 from weiesky/fix/file-browser-view-scope |
| 2026-10-27T23:49:53+08:00 | [67226f50c1](./cc-viewer-alignment-commit-ledger.md#commit-67226f50c1) | M | Merge pull request #163 from weiesky/fix/file-browser-view-scope |
| 2026-10-27T23:50:36+08:00 | [3e4f1064c2](./cc-viewer-alignment-commit-ledger.md#commit-3e4f1064c2) | R | chore(release): 1.9.16 |
| 2026-10-30T00:20:58+08:00 | [1600211658](./cc-viewer-alignment-commit-ledger.md#commit-1600211658) | R | chore(release): 1.9.17 |
| 2026-10-31T03:46:26+08:00 | [7039adeec3](./cc-viewer-alignment-commit-ledger.md#commit-7039adeec3) | R | chore(release): 1.9.18 |
| 2026-11-02T14:51:28+08:00 | [1d4ea6e192](./cc-viewer-alignment-commit-ledger.md#commit-1d4ea6e192) | M | Merge pull request #165 from weiesky/fix/tool-file-monitor-incremental |
| 2026-11-02T14:54:00+08:00 | [66bfeb8c18](./cc-viewer-alignment-commit-ledger.md#commit-66bfeb8c18) | R | chore(release): 1.9.19 |
| 2026-11-02T11:01:12+00:00 | [c0c13bbc86](./cc-viewer-alignment-commit-ledger.md#commit-c0c13bbc86) | R | chore(star-history): refresh chart [skip ci] |
| 2026-11-03T23:36:54+08:00 | [14d85f8ce6](./cc-viewer-alignment-commit-ledger.md#commit-14d85f8ce6) | M | Merge pull request #166 from weiesky/release/slow-hud-cr-fixes |
| 2026-11-03T23:38:20+08:00 | [fd84486429](./cc-viewer-alignment-commit-ledger.md#commit-fd84486429) | R | chore(release): 1.9.20 |
| 2026-11-03T23:42:37+08:00 | [a09bc713ea](./cc-viewer-alignment-commit-ledger.md#commit-a09bc713ea) | M | Merge pull request #167 from weiesky/chore/release-1.9.20 |
| 2026-11-04T12:16:31+08:00 | [ccf74880a5](./cc-viewer-alignment-commit-ledger.md#commit-ccf74880a5) | X | fix(web): render unmerged git status badges (UU/AA/DD/...) in red |
| 2026-11-04T12:34:40+08:00 | [32165d3a0b](./cc-viewer-alignment-commit-ledger.md#commit-32165d3a0b) | R | chore(release): 1.9.21 |
| 2026-11-06T01:03:27+08:00 | [0dfb4e13c5](./cc-viewer-alignment-commit-ledger.md#commit-0dfb4e13c5) | R | chore(release): 1.9.22 |
| 2026-11-09T11:28:16+00:00 | [3ce8f67a1c](./cc-viewer-alignment-commit-ledger.md#commit-3ce8f67a1c) | R | chore(star-history): refresh chart [skip ci] |
| 2026-11-12T00:38:31+08:00 | [9e24827264](./cc-viewer-alignment-commit-ledger.md#commit-9e24827264) | M | Merge pull request #170 from weiesky/feat/file-preview-foundation |
| 2026-11-12T14:54:03+08:00 | [5a7904990b](./cc-viewer-alignment-commit-ledger.md#commit-5a7904990b) | M | Merge pull request #171 from weiesky/feat/guided-npm-updates |
| 2026-11-12T15:19:58+08:00 | [84373dff25](./cc-viewer-alignment-commit-ledger.md#commit-84373dff25) | M | Merge pull request #172 from weiesky/chore/release-1.9.25 |
| 2026-11-13T15:28:28+08:00 | [0ff3154822](./cc-viewer-alignment-commit-ledger.md#commit-0ff3154822) | M | Merge pull request #173 from weiesky/release/1.9.26 |
| 2026-11-15T15:39:51+08:00 | [24c4f60b54](./cc-viewer-alignment-commit-ledger.md#commit-24c4f60b54) | M | Merge pull request #174 from weiesky/feat/git-changes-drag-drop |
| 2026-11-16T05:06:51+08:00 | [8bba70ec69](./cc-viewer-alignment-commit-ledger.md#commit-8bba70ec69) | M | Merge pull request #175 from weiesky/feat/active-agents-card |
| 2026-11-16T05:07:29+08:00 | [efe935cd43](./cc-viewer-alignment-commit-ledger.md#commit-efe935cd43) | R | chore(release): 1.9.28 |
| 2026-11-16T11:13:15+00:00 | [13ad396d5e](./cc-viewer-alignment-commit-ledger.md#commit-13ad396d5e) | R | chore(star-history): refresh chart [skip ci] |
| 2026-11-16T23:20:04+08:00 | [ac56c9c6d5](./cc-viewer-alignment-commit-ledger.md#commit-ac56c9c6d5) | M | Merge pull request #176 from weiesky/feat/sdk-composer-prompt-nav |
| 2026-11-16T23:21:08+08:00 | [74cd752d99](./cc-viewer-alignment-commit-ledger.md#commit-74cd752d99) | R | chore(release): 1.9.29 |

<a id="b1"></a>
### B1 — 配置写入与凭证保护

初筛类别：`A`；候选 22 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-17T04:30:14+00:00 | [5c468c042e](./cc-viewer-alignment-commit-ledger.md#commit-5c468c042e) | A | fix: CVE-2026-13676 security vulnerability |
| 2026-08-17T13:35:58+00:00 | [9255663e33](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33) | A | fix: CVE-2026-39244 security vulnerability |
| 2026-08-20T09:34:00-04:00 | [e3ca28c52d](./cc-viewer-alignment-commit-ledger.md#commit-e3ca28c52d) | A | refactor(monorepo): split into apps/{web,electron} + packages/app workspace layout (stage A2) |
| 2026-08-20T09:34:01-04:00 | [047db59b80](./cc-viewer-alignment-commit-ledger.md#commit-047db59b80) | A | refactor(monorepo): @ccv/core extraction + boundary gate + per-package test distribution |
| 2026-08-20T09:39:45-04:00 | [cda9ed326d](./cc-viewer-alignment-commit-ledger.md#commit-cda9ed326d) | A | fix(deps): carry CVE-2026-13676/CVE-2026-39244 fixes into the monorepo layout |
| 2026-09-07T16:51:57+08:00 | [36df32b7e1](./cc-viewer-alignment-commit-ledger.md#commit-36df32b7e1) | A | fix(server): allow authenticated remote admins to use management endpoints |
| 2026-09-21T11:43:15+08:00 | [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68) | A | feat(server): unify config JSON writes behind a locked+atomic json-store kernel |
| 2026-09-21T11:45:20+08:00 | [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290) | A | feat(server): encrypt local credentials at rest in an AES-256-GCM vault |
| 2026-09-21T17:17:04+08:00 | [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de) | A | fix(server): close review findings on the credential vault + json-store convergence |
| 2026-09-21T20:52:14+08:00 | [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea) | A | fix(server): revert credential root to frozen; close re-review findings |
| 2026-09-22T00:50:37+08:00 | [3c78188314](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314) | A | fix(server): close review findings on the credential vault + json-store convergence |
| 2026-09-22T00:50:37+08:00 | [3cba408188](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188) | A | fix(server): revert credential root to frozen; close re-review findings |
| 2026-09-22T00:50:37+08:00 | [811b049485](./cc-viewer-alignment-commit-ledger.md#commit-811b049485) | A | feat(server): encrypt local credentials at rest in an AES-256-GCM vault |
| 2026-09-22T00:50:37+08:00 | [d663452c29](./cc-viewer-alignment-commit-ledger.md#commit-d663452c29) | A | feat(server): unify config JSON writes behind a locked+atomic json-store kernel |
| 2026-10-22T10:43:06+08:00 | [45bfa4124d](./cc-viewer-alignment-commit-ledger.md#commit-45bfa4124d) | A | fix(server): gate [ccv:*] diagnostic logs on CCV_DEBUG |
| 2026-10-24T03:45:08+08:00 | [451ef48d6a](./cc-viewer-alignment-commit-ledger.md#commit-451ef48d6a) | A | feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish |
| 2026-11-02T14:19:28+08:00 | [08809f6e69](./cc-viewer-alignment-commit-ledger.md#commit-08809f6e69) | A | perf(web): incremental scan in ToolFileChangeController.check (#164) |
| 2026-11-02T14:30:54+08:00 | [082673509e](./cc-viewer-alignment-commit-ledger.md#commit-082673509e) | A | Revert "perf(web): incremental scan in ToolFileChangeController.check (#164)" |
| 2026-11-02T14:34:52+08:00 | [7797672148](./cc-viewer-alignment-commit-ledger.md#commit-7797672148) | A | style(web): drop author name from GIT changes commit rows |
| 2026-11-02T14:34:52+08:00 | [ef5fc8b168](./cc-viewer-alignment-commit-ledger.md#commit-ef5fc8b168) | A | feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界 |
| 2026-11-05T21:41:54+08:00 | [57c732d037](./cc-viewer-alignment-commit-ledger.md#commit-57c732d037) | A | feat(server): add CCV_BASE_URL for cloud reverse-proxy deployment |
| 2026-11-06T01:01:19+08:00 | [4391792212](./cc-viewer-alignment-commit-ledger.md#commit-4391792212) | A | review(3-commit CR): harden shard cursor/seeding + base-url parsing, dedupe shard cut resolution, translate new comments |

<a id="b2"></a>
### B2 — 多工作区身份与 SDK 会话

初筛类别：`B, C`；候选 70 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-05T04:19:23+08:00 | [f3a8413db9](./cc-viewer-alignment-commit-ledger.md#commit-f3a8413db9) | C | fix(chat): wire-agent identity for teammate/subagent classification (1.7.17) |
| 2026-08-17T08:03:36-04:00 | [3cc05b496d](./cc-viewer-alignment-commit-ledger.md#commit-3cc05b496d) | B | feat(proxy): per-role proxy sources for Main Agent / Sub-Agent / Teammate (1.7.22) |
| 2026-08-20T09:27:51-04:00 | [dabc5232ce](./cc-viewer-alignment-commit-ledger.md#commit-dabc5232ce) | B | chore(pnpm): migrate package manager from npm to pnpm 11.22 (stage A1) |
| 2026-08-20T09:34:00-04:00 | [f9467bfc83](./cc-viewer-alignment-commit-ledger.md#commit-f9467bfc83) | C | refactor(server): group server/lib batch-1 into im/ ask/ proxy/ subdirectories |
| 2026-08-20T09:34:01-04:00 | [16267dc04c](./cc-viewer-alignment-commit-ledger.md#commit-16267dc04c) | B | fix(system-prompt): pin original system prompt on -c/-r resumes |
| 2026-08-23T14:08:45+08:00 | [efc7f8eab1](./cc-viewer-alignment-commit-ledger.md#commit-efc7f8eab1) | C | feat(chat): floating composer overlay + SDK full-surface parity |
| 2026-08-23T22:16:20+08:00 | [7a2dd6162e](./cc-viewer-alignment-commit-ledger.md#commit-7a2dd6162e) | C | fix(sdk): expand all system segments in request JSON view on first-turn MainAgent requests |
| 2026-08-23T19:33:38-04:00 | [dafe2bce37](./cc-viewer-alignment-commit-ledger.md#commit-dafe2bce37) | C | feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes |
| 2026-08-25T15:47:27-04:00 | [72c059f6b9](./cc-viewer-alignment-commit-ledger.md#commit-72c059f6b9) | C | feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset |
| 2026-08-25T15:48:25-04:00 | [0d067a1b7c](./cc-viewer-alignment-commit-ledger.md#commit-0d067a1b7c) | C | docs(changelog): history.md entries for 1M default, footer simplification, 3s auto-approve, teammate prompt rules |
| 2026-09-12T22:14:38+08:00 | [bf2d6f2ad8](./cc-viewer-alignment-commit-ledger.md#commit-bf2d6f2ad8) | C | feat(chat): task-list HUD progress dots + reset task list on new prompt |
| 2026-09-13T15:12:05+08:00 | [d7f355ba89](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89) | B | fix(chat): rebuild conversation immediately on mid-round page refresh |
| 2026-09-15T21:52:16+08:00 | [17df4e2fbf](./cc-viewer-alignment-commit-ledger.md#commit-17df4e2fbf) | B | fix(proxy): Bind A 一次性闩只锁成功消费 + review 修复 + 终端集成可观测与裸续接检测(静默) |
| 2026-09-18T16:21:22+08:00 | [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8) | C | feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config |
| 2026-10-08T12:20:24+08:00 | [eb2e9703a2](./cc-viewer-alignment-commit-ledger.md#commit-eb2e9703a2) | B | feat(web): project tab drag-to-reorder + persist order; focus/mask fixes; 1.8.x series summary (v1.9.1) (#145) |
| 2026-10-09T17:23:44+08:00 | [649f853e5e](./cc-viewer-alignment-commit-ledger.md#commit-649f853e5e) | B | Feat/resume global switcher (#146) |
| 2026-10-10T15:24:07+08:00 | [d6cab4869a](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) | B | feat(server): relay SDK task_* messages as sdk-task WS frames (#147) |
| 2026-10-10T22:53:55+08:00 | [7f7f78e2d8](./cc-viewer-alignment-commit-ledger.md#commit-7f7f78e2d8) | B | feat(web): 新建工作区目录树「启动」一步直启 |
| 2026-10-13T00:25:47+08:00 | [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) | C | feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板 |
| 2026-10-13T00:25:48+08:00 | [133bc219df](./cc-viewer-alignment-commit-ledger.md#commit-133bc219df) | C | feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环 |
| 2026-10-13T00:25:48+08:00 | [2be5bb23f6](./cc-viewer-alignment-commit-ledger.md#commit-2be5bb23f6) | B | feat(ui): 小终端(scratch)按工作区分组并伴随视图切换,关闭工作区连带回收 |
| 2026-10-13T00:25:48+08:00 | [3079040494](./cc-viewer-alignment-commit-ledger.md#commit-3079040494) | B | feat(sdk): SDK 模式改为每工作区独立常驻会话(按 cwd 多会话,对齐 PTY) |
| 2026-10-13T00:25:48+08:00 | [a07464187c](./cc-viewer-alignment-commit-ledger.md#commit-a07464187c) | B | fix(web): 新建工作区弹窗底部出血加高 |
| 2026-10-13T00:25:48+08:00 | [ad369d2856](./cc-viewer-alignment-commit-ledger.md#commit-ad369d2856) | C | chore(sdk): getContextUsage 超时定时器 unref + settle 后 clearTimeout |
| 2026-10-13T00:25:48+08:00 | [bc669f59cc](./cc-viewer-alignment-commit-ledger.md#commit-bc669f59cc) | C | test(sdk): 补提交 SDK 会话状态(turn-level session-state)测试 |
| 2026-10-13T00:25:48+08:00 | [c4529a6ed7](./cc-viewer-alignment-commit-ledger.md#commit-c4529a6ed7) | C | fix(ui): 对话 loading 覆盖整个回合,本地工具执行期不再误熄 |
| 2026-10-13T22:27:41+08:00 | [5c28d4c50a](./cc-viewer-alignment-commit-ledger.md#commit-5c28d4c50a) | B | feat(sse): per-workspace independent SSE channels |
| 2026-10-14T00:12:29+08:00 | [a30d8c92a7](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7) | B | fix(sse): per-workspace SSE 通道 CR 修复(P1×7+P2×7)与 git-diff flake |
| 2026-10-14T15:07:09+08:00 | [f20efc1371](./cc-viewer-alignment-commit-ledger.md#commit-f20efc1371) | B | fix: use temporary keychain password for macOS signing (#151) |
| 2026-10-15T13:12:09+08:00 | [a84385b5a8](./cc-viewer-alignment-commit-ledger.md#commit-a84385b5a8) | B | feat(sdk): per-workspace close + stable instance identity for same-name disambiguation |
| 2026-10-21T01:29:53+08:00 | [2847027b54](./cc-viewer-alignment-commit-ledger.md#commit-2847027b54) | C | fix(server): 权限自动审批覆盖目录外 Read/Glob/Grep |
| 2026-10-21T17:56:26+08:00 | [67ceb5b7f0](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) | C | feat(web): "/" 弹出斜杠技能菜单 |
| 2026-10-21T17:57:20+08:00 | [51c23e9090](./cc-viewer-alignment-commit-ledger.md#commit-51c23e9090) | B | fix(web): 修复 SDK 模式 plan 审批卡死 |
| 2026-10-21T18:09:34+08:00 | [9dbf4e295a](./cc-viewer-alignment-commit-ledger.md#commit-9dbf4e295a) | C | fix(web): SDK 模式打开终端不再隐藏对话输入框 |
| 2026-10-22T10:47:12+08:00 | [9b1bb4e729](./cc-viewer-alignment-commit-ledger.md#commit-9b1bb4e729) | C | fix(sdk): render turn/query failures as persistent rows in the dialogue tail |
| 2026-10-23T01:32:00+08:00 | [c66b5fe2ed](./cc-viewer-alignment-commit-ledger.md#commit-c66b5fe2ed) | C | feat(web): move proxy hot-switch chip into the chat input bar (#158) |
| 2026-10-24T16:00:44+08:00 | [6bc7781bba](./cc-viewer-alignment-commit-ledger.md#commit-6bc7781bba) | B | test: isolate resume route PTY fixtures |
| 2026-10-24T20:57:57+08:00 | [ab1b89ee13](./cc-viewer-alignment-commit-ledger.md#commit-ab1b89ee13) | B | fix(files): scope file operations to viewed project |
| 2026-10-25T03:33:30+08:00 | [d89aa3b9af](./cc-viewer-alignment-commit-ledger.md#commit-d89aa3b9af) | C | fix(web): restore SDK thinking per assistant turn |
| 2026-10-25T18:09:42+08:00 | [9c36b5b5a7](./cc-viewer-alignment-commit-ledger.md#commit-9c36b5b5a7) | C | fix(web): stabilize context usage colors and scrolling |
| 2026-10-26T13:00:11+08:00 | [91b0055f2d](./cc-viewer-alignment-commit-ledger.md#commit-91b0055f2d) | B | fix(sdk): honor plan auto-approval settings |
| 2026-10-26T20:34:56+08:00 | [1aca9b5f8f](./cc-viewer-alignment-commit-ledger.md#commit-1aca9b5f8f) | B | fix(chat): restore queued prompts and queue dispatch state |
| 2026-10-27T23:47:58+08:00 | [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac) | C | docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates |
| 2026-10-27T23:47:58+08:00 | [5e50112388](./cc-viewer-alignment-commit-ledger.md#commit-5e50112388) | C | fix(server+web): server-side auto-approve countdown for plan/perm approvals |
| 2026-10-29T17:12:47+08:00 | [3d65bedcd1](./cc-viewer-alignment-commit-ledger.md#commit-3d65bedcd1) | C | fix(web): keep the composer blood bar visible when the SDK scratch terminal opens |
| 2026-10-29T20:19:39+08:00 | [282306a950](./cc-viewer-alignment-commit-ledger.md#commit-282306a950) | C | fix(web): SDK-mode plan approval uses the plan card modal |
| 2026-10-31T03:44:00+08:00 | [84e65cddc6](./cc-viewer-alignment-commit-ledger.md#commit-84e65cddc6) | C | fix(server+web): judge stuck SDK turns by activity probe, restore approvals on attach, keep Stop visible on long turns |
| 2026-10-31T03:44:09+08:00 | [cdf05bf8ee](./cc-viewer-alignment-commit-ledger.md#commit-cdf05bf8ee) | B | feat(server+web): inline 502/network retry feedback with progress and a manual resume-retry affordance |
| 2026-11-02T14:34:52+08:00 | [469a995ad8](./cc-viewer-alignment-commit-ledger.md#commit-469a995ad8) | C | fix(web): keep minimised SDK ask modal minimised across view-switch |
| 2026-11-02T14:34:52+08:00 | [7641f5181a](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a) | C | fix(server): close two first-turn SDK rendering failures |
| 2026-11-02T14:34:52+08:00 | [88995a1046](./cc-viewer-alignment-commit-ledger.md#commit-88995a1046) | C | style(web): cap SDK error bar width at 800px |
| 2026-11-02T14:34:52+08:00 | [bd32d02884](./cc-viewer-alignment-commit-ledger.md#commit-bd32d02884) | B | fix(server): live-refresh new message in a resumed history project (SDK mode) |
| 2026-11-02T14:34:52+08:00 | [ee3545344e](./cc-viewer-alignment-commit-ledger.md#commit-ee3545344e) | C | fix(web): hide SDK error row while its retry is recovering |
| 2026-11-02T18:52:18+08:00 | [c29af25e64](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) | C | fix(server+web): upstream v1.9.19 review — file-tree path, convSeqs single pass, toolUseMap LRU trim, approval guards |
| 2026-11-03T02:25:23+08:00 | [99256ac1d8](./cc-viewer-alignment-commit-ledger.md#commit-99256ac1d8) | B | fix(web): --sdk mode mobile terminal renders the scratch multi-tab shell |
| 2026-11-03T23:05:10+08:00 | [6b340326c6](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6) | C | feat(sdk): slow-upstream in-flight advisory |
| 2026-11-03T23:05:11+08:00 | [0cde7d1df8](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8) | C | feat(web): SDK mode task checklist HUD via sdk-task WS relay |
| 2026-11-03T23:05:11+08:00 | [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8) | C | fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2 |
| 2026-11-04T03:12:45+08:00 | [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) | C | fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2 |
| 2026-11-04T03:13:14+08:00 | [1bfc1585e8](./cc-viewer-alignment-commit-ledger.md#commit-1bfc1585e8) | C | fix(web): persist --sdk scratch terminal open state across refresh |
| 2026-11-11T10:57:00+08:00 | [6081b5d01a](./cc-viewer-alignment-commit-ledger.md#commit-6081b5d01a) | C | feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting |
| 2026-11-12T19:37:45+08:00 | [919fded845](./cc-viewer-alignment-commit-ledger.md#commit-919fded845) | C | fix(sdk): settle stale slow-upstream notices |
| 2026-11-13T11:37:24+08:00 | [ec14cd0234](./cc-viewer-alignment-commit-ledger.md#commit-ec14cd0234) | C | fix(sdk+web): blood bar (context usage) freeze — keepalive, watchdog, fetch deadline, ts self-heal |
| 2026-11-13T15:10:23+08:00 | [187583787d](./cc-viewer-alignment-commit-ledger.md#commit-187583787d) | C | feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate |
| 2026-11-13T15:27:47+08:00 | [23e4273a37](./cc-viewer-alignment-commit-ledger.md#commit-23e4273a37) | C | chore: release 1.9.26 |
| 2026-11-13T17:40:24+08:00 | [dd8709356b](./cc-viewer-alignment-commit-ledger.md#commit-dd8709356b) | C | fix(web+server): close approval modal after server-side auto-advance |
| 2026-11-15T10:59:16+08:00 | [a2f5cd4b43](./cc-viewer-alignment-commit-ledger.md#commit-a2f5cd4b43) | B | feat(web): drag git changes (files, folders, commits) into chat or terminal |
| 2026-11-16T03:40:01+08:00 | [add350bc52](./cc-viewer-alignment-commit-ledger.md#commit-add350bc52) | C | fix(web): hide Teammate role in proxy hot-switch under SDK mode |
| 2026-11-16T05:01:21+08:00 | [975313773a](./cc-viewer-alignment-commit-ledger.md#commit-975313773a) | C | feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表 |
| 2026-11-16T23:10:26+08:00 | [8f1d345309](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309) | C | feat(web): move prompt-nav into composer and relocate mic in --sdk layout |

<a id="b3"></a>
### B3 — 长会话、存储和实时传输

初筛类别：`D`；候选 17 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-07-26T15:30:25+08:00 | [42207f7fd1](./cc-viewer-alignment-commit-ledger.md#commit-42207f7fd1) | D | fix(test): remove timing assumptions from brotli decode helpers |
| 2026-07-27T10:41:52+08:00 | [20e4a63b24](./cc-viewer-alignment-commit-ledger.md#commit-20e4a63b24) | D | fix(test): drop install-layout assumption from the last-resort candidate assertion |
| 2026-07-28T14:18:23+08:00 | [25e118170c](./cc-viewer-alignment-commit-ledger.md#commit-25e118170c) | D | fix(proxy-retry): preserve streaming response metadata |
| 2026-08-24T10:46:13+08:00 | [6bcf5e5ab3](./cc-viewer-alignment-commit-ledger.md#commit-6bcf5e5ab3) | D | fix(electron): preserve publish metadata in staging |
| 2026-08-24T11:47:56+08:00 | [bb8095c7fb](./cc-viewer-alignment-commit-ledger.md#commit-bb8095c7fb) | D | fix(release): streamline notarization and tarball checks |
| 2026-08-26T11:27:52-04:00 | [d858204313](./cc-viewer-alignment-commit-ledger.md#commit-d858204313) | D | fix(git): show local commits on branches without an upstream in the changes panel |
| 2026-09-01T10:34:33+08:00 | [fa77ecd681](./cc-viewer-alignment-commit-ledger.md#commit-fa77ecd681) | D | fix(v2): exclude proxy retry-stat shards from legacy v1 log sniffing |
| 2026-09-05T21:48:13+08:00 | [ba3eee8fd5](./cc-viewer-alignment-commit-ledger.md#commit-ba3eee8fd5) | D | feat(files): add "Download to local" context-menu item for remote sessions, streamed via GET /api/download-file |
| 2026-09-13T00:11:04+08:00 | [0cfc040c0a](./cc-viewer-alignment-commit-ledger.md#commit-0cfc040c0a) | D | fix(tests): close SSE subscription gracefully in UserPromptSubmit integration test |
| 2026-09-17T15:07:11+08:00 | [0670581b3d](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d) | D | fix(chat): release cold-ingest gate on pipeline failure to unfreeze conversation panel |
| 2026-10-14T11:21:29+08:00 | [db2ada0866](./cc-viewer-alignment-commit-ledger.md#commit-db2ada0866) | D | feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback |
| 2026-10-15T11:31:54+08:00 | [4991ba762d](./cc-viewer-alignment-commit-ledger.md#commit-4991ba762d) | D | fix(sse): WS-mux cold-load queue overflow left dialogue blank after refresh |
| 2026-10-15T13:47:57+08:00 | [46d33276c9](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9) | D | fix(sse): gate ws.mux.diag probes + pin perMessageDeflate:false (CR follow-up) |
| 2026-11-03T23:32:38+08:00 | [b01ff6f502](./cc-viewer-alignment-commit-ledger.md#commit-b01ff6f502) | D | test(server): stabilize slow-upstream advisory test (CI flake) |
| 2026-11-05T18:45:17+08:00 | [b23c137372](./cc-viewer-alignment-commit-ledger.md#commit-b23c137372) | D | fix(logs): auto-shard oversized session logs by prompt count + manual per-shard load |
| 2026-11-12T10:28:17+08:00 | [6e3c93cd7c](./cc-viewer-alignment-commit-ledger.md#commit-6e3c93cd7c) | D | feat: add guided npm updates with restart |
| 2026-11-16T03:24:03+08:00 | [bde0244333](./cc-viewer-alignment-commit-ledger.md#commit-bde0244333) | D | fix(server): WS-mux cold-load backpressure stall (1011 queue-overflow blank chat) |

<a id="b4"></a>
### B4 — Agent 生命周期、任务与状态反馈

初筛类别：`C`；候选 45 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-05T04:19:23+08:00 | [f3a8413db9](./cc-viewer-alignment-commit-ledger.md#commit-f3a8413db9) | C | fix(chat): wire-agent identity for teammate/subagent classification (1.7.17) |
| 2026-08-20T09:34:00-04:00 | [f9467bfc83](./cc-viewer-alignment-commit-ledger.md#commit-f9467bfc83) | C | refactor(server): group server/lib batch-1 into im/ ask/ proxy/ subdirectories |
| 2026-08-23T14:08:45+08:00 | [efc7f8eab1](./cc-viewer-alignment-commit-ledger.md#commit-efc7f8eab1) | C | feat(chat): floating composer overlay + SDK full-surface parity |
| 2026-08-23T22:16:20+08:00 | [7a2dd6162e](./cc-viewer-alignment-commit-ledger.md#commit-7a2dd6162e) | C | fix(sdk): expand all system segments in request JSON view on first-turn MainAgent requests |
| 2026-08-23T19:33:38-04:00 | [dafe2bce37](./cc-viewer-alignment-commit-ledger.md#commit-dafe2bce37) | C | feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes |
| 2026-08-25T15:47:27-04:00 | [72c059f6b9](./cc-viewer-alignment-commit-ledger.md#commit-72c059f6b9) | C | feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset |
| 2026-08-25T15:48:25-04:00 | [0d067a1b7c](./cc-viewer-alignment-commit-ledger.md#commit-0d067a1b7c) | C | docs(changelog): history.md entries for 1M default, footer simplification, 3s auto-approve, teammate prompt rules |
| 2026-09-12T22:14:38+08:00 | [bf2d6f2ad8](./cc-viewer-alignment-commit-ledger.md#commit-bf2d6f2ad8) | C | feat(chat): task-list HUD progress dots + reset task list on new prompt |
| 2026-09-18T16:21:22+08:00 | [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8) | C | feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config |
| 2026-10-13T00:25:47+08:00 | [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) | C | feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板 |
| 2026-10-13T00:25:48+08:00 | [133bc219df](./cc-viewer-alignment-commit-ledger.md#commit-133bc219df) | C | feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环 |
| 2026-10-13T00:25:48+08:00 | [ad369d2856](./cc-viewer-alignment-commit-ledger.md#commit-ad369d2856) | C | chore(sdk): getContextUsage 超时定时器 unref + settle 后 clearTimeout |
| 2026-10-13T00:25:48+08:00 | [bc669f59cc](./cc-viewer-alignment-commit-ledger.md#commit-bc669f59cc) | C | test(sdk): 补提交 SDK 会话状态(turn-level session-state)测试 |
| 2026-10-13T00:25:48+08:00 | [c4529a6ed7](./cc-viewer-alignment-commit-ledger.md#commit-c4529a6ed7) | C | fix(ui): 对话 loading 覆盖整个回合,本地工具执行期不再误熄 |
| 2026-10-21T01:29:53+08:00 | [2847027b54](./cc-viewer-alignment-commit-ledger.md#commit-2847027b54) | C | fix(server): 权限自动审批覆盖目录外 Read/Glob/Grep |
| 2026-10-21T17:56:26+08:00 | [67ceb5b7f0](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) | C | feat(web): "/" 弹出斜杠技能菜单 |
| 2026-10-21T18:09:34+08:00 | [9dbf4e295a](./cc-viewer-alignment-commit-ledger.md#commit-9dbf4e295a) | C | fix(web): SDK 模式打开终端不再隐藏对话输入框 |
| 2026-10-22T10:47:12+08:00 | [9b1bb4e729](./cc-viewer-alignment-commit-ledger.md#commit-9b1bb4e729) | C | fix(sdk): render turn/query failures as persistent rows in the dialogue tail |
| 2026-10-23T01:32:00+08:00 | [c66b5fe2ed](./cc-viewer-alignment-commit-ledger.md#commit-c66b5fe2ed) | C | feat(web): move proxy hot-switch chip into the chat input bar (#158) |
| 2026-10-25T03:33:30+08:00 | [d89aa3b9af](./cc-viewer-alignment-commit-ledger.md#commit-d89aa3b9af) | C | fix(web): restore SDK thinking per assistant turn |
| 2026-10-25T18:09:42+08:00 | [9c36b5b5a7](./cc-viewer-alignment-commit-ledger.md#commit-9c36b5b5a7) | C | fix(web): stabilize context usage colors and scrolling |
| 2026-10-27T23:47:58+08:00 | [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac) | C | docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates |
| 2026-10-27T23:47:58+08:00 | [5e50112388](./cc-viewer-alignment-commit-ledger.md#commit-5e50112388) | C | fix(server+web): server-side auto-approve countdown for plan/perm approvals |
| 2026-10-29T17:12:47+08:00 | [3d65bedcd1](./cc-viewer-alignment-commit-ledger.md#commit-3d65bedcd1) | C | fix(web): keep the composer blood bar visible when the SDK scratch terminal opens |
| 2026-10-29T20:19:39+08:00 | [282306a950](./cc-viewer-alignment-commit-ledger.md#commit-282306a950) | C | fix(web): SDK-mode plan approval uses the plan card modal |
| 2026-10-31T03:44:00+08:00 | [84e65cddc6](./cc-viewer-alignment-commit-ledger.md#commit-84e65cddc6) | C | fix(server+web): judge stuck SDK turns by activity probe, restore approvals on attach, keep Stop visible on long turns |
| 2026-11-02T14:34:52+08:00 | [469a995ad8](./cc-viewer-alignment-commit-ledger.md#commit-469a995ad8) | C | fix(web): keep minimised SDK ask modal minimised across view-switch |
| 2026-11-02T14:34:52+08:00 | [7641f5181a](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a) | C | fix(server): close two first-turn SDK rendering failures |
| 2026-11-02T14:34:52+08:00 | [88995a1046](./cc-viewer-alignment-commit-ledger.md#commit-88995a1046) | C | style(web): cap SDK error bar width at 800px |
| 2026-11-02T14:34:52+08:00 | [ee3545344e](./cc-viewer-alignment-commit-ledger.md#commit-ee3545344e) | C | fix(web): hide SDK error row while its retry is recovering |
| 2026-11-02T18:52:18+08:00 | [c29af25e64](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) | C | fix(server+web): upstream v1.9.19 review — file-tree path, convSeqs single pass, toolUseMap LRU trim, approval guards |
| 2026-11-03T23:05:10+08:00 | [6b340326c6](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6) | C | feat(sdk): slow-upstream in-flight advisory |
| 2026-11-03T23:05:11+08:00 | [0cde7d1df8](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8) | C | feat(web): SDK mode task checklist HUD via sdk-task WS relay |
| 2026-11-03T23:05:11+08:00 | [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8) | C | fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2 |
| 2026-11-04T03:12:45+08:00 | [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) | C | fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2 |
| 2026-11-04T03:13:14+08:00 | [1bfc1585e8](./cc-viewer-alignment-commit-ledger.md#commit-1bfc1585e8) | C | fix(web): persist --sdk scratch terminal open state across refresh |
| 2026-11-11T10:57:00+08:00 | [6081b5d01a](./cc-viewer-alignment-commit-ledger.md#commit-6081b5d01a) | C | feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting |
| 2026-11-12T19:37:45+08:00 | [919fded845](./cc-viewer-alignment-commit-ledger.md#commit-919fded845) | C | fix(sdk): settle stale slow-upstream notices |
| 2026-11-13T11:37:24+08:00 | [ec14cd0234](./cc-viewer-alignment-commit-ledger.md#commit-ec14cd0234) | C | fix(sdk+web): blood bar (context usage) freeze — keepalive, watchdog, fetch deadline, ts self-heal |
| 2026-11-13T15:10:23+08:00 | [187583787d](./cc-viewer-alignment-commit-ledger.md#commit-187583787d) | C | feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate |
| 2026-11-13T15:27:47+08:00 | [23e4273a37](./cc-viewer-alignment-commit-ledger.md#commit-23e4273a37) | C | chore: release 1.9.26 |
| 2026-11-13T17:40:24+08:00 | [dd8709356b](./cc-viewer-alignment-commit-ledger.md#commit-dd8709356b) | C | fix(web+server): close approval modal after server-side auto-advance |
| 2026-11-16T03:40:01+08:00 | [add350bc52](./cc-viewer-alignment-commit-ledger.md#commit-add350bc52) | C | fix(web): hide Teammate role in proxy hot-switch under SDK mode |
| 2026-11-16T05:01:21+08:00 | [975313773a](./cc-viewer-alignment-commit-ledger.md#commit-975313773a) | C | feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表 |
| 2026-11-16T23:10:26+08:00 | [8f1d345309](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309) | C | feat(web): move prompt-nav into composer and relocate mic in --sdk layout |

<a id="b5"></a>
### B5 — 文件操作与搜索

初筛类别：`F`；候选 21 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-24T07:24:56-04:00 | [dc1aeb2840](./cc-viewer-alignment-commit-ledger.md#commit-dc1aeb2840) | F | docs(research): add automated test-case generation survey |
| 2026-09-04T12:59:26+08:00 | [bd50636219](./cc-viewer-alignment-commit-ledger.md#commit-bd50636219) | F | perf(search): move node-engine scan to a worker thread, virtualize result list |
| 2026-09-09T20:20:19+08:00 | [865604d68e](./cc-viewer-alignment-commit-ledger.md#commit-865604d68e) | F | feat(files): remote web file browser modal with shared context menu + image thumbnails |
| 2026-09-10T05:52:58+08:00 | [365af800e5](./cc-viewer-alignment-commit-ledger.md#commit-365af800e5) | F | feat(files): file browser modal upload + in-project drag-move + zone drag feedback |
| 2026-09-12T22:14:49+08:00 | [5aa5728b95](./cc-viewer-alignment-commit-ledger.md#commit-5aa5728b95) | F | feat(files): unify open-project icon to open in-app web file browser |
| 2026-09-12T22:14:49+08:00 | [a278d68954](./cc-viewer-alignment-commit-ledger.md#commit-a278d68954) | F | feat(files): per-file-type SVG icons in the file browser |
| 2026-10-15T15:47:29+08:00 | [7830664780](./cc-viewer-alignment-commit-ledger.md#commit-7830664780) | F | fix(web): 文件树行高不再被压缩抖动 |
| 2026-10-21T17:57:20+08:00 | [a2be00c45b](./cc-viewer-alignment-commit-ledger.md#commit-a2be00c45b) | F | feat(web): 桌面文件上传收纳进 (+) 菜单 |
| 2026-10-21T18:48:08+08:00 | [3cf3e9585f](./cc-viewer-alignment-commit-ledger.md#commit-3cf3e9585f) | F | fix(web): (+) 菜单顶层「上传文件」行 hover 时收起残留的级联子菜单 |
| 2026-10-27T23:47:58+08:00 | [566ade13fc](./cc-viewer-alignment-commit-ledger.md#commit-566ade13fc) | F | feat(web): open CLAUDE.md and skill folders |
| 2026-10-29T17:14:03+08:00 | [7a75e1be81](./cc-viewer-alignment-commit-ledger.md#commit-7a75e1be81) | F | feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser |
| 2026-11-02T14:34:52+08:00 | [dd23ce8df1](./cc-viewer-alignment-commit-ledger.md#commit-dd23ce8df1) | F | feat(web): open file content directly on tree click in file browser |
| 2026-11-11T16:53:06+08:00 | [a6b82f16df](./cc-viewer-alignment-commit-ledger.md#commit-a6b82f16df) | F | feat(web): 文件搜索并入文件浏览器面板并重排搜索控件 |
| 2026-11-11T19:06:26+08:00 | [ea995f3883](./cc-viewer-alignment-commit-ledger.md#commit-ea995f3883) | F | feat(web): drag files into terminal or chat |
| 2026-11-11T19:27:40+08:00 | [beaa2e86f2](./cc-viewer-alignment-commit-ledger.md#commit-beaa2e86f2) | F | feat(web): support dragging folders into terminal and chat |
| 2026-11-11T22:29:39+08:00 | [91a523d043](./cc-viewer-alignment-commit-ledger.md#commit-91a523d043) | F | feat: add cross-platform archive preview |
| 2026-11-12T00:08:33+08:00 | [f96811cddb](./cc-viewer-alignment-commit-ledger.md#commit-f96811cddb) | F | feat: unify file preview routing and binary guards |
| 2026-11-12T00:40:27+08:00 | [6dd3b3b7e5](./cc-viewer-alignment-commit-ledger.md#commit-6dd3b3b7e5) | F | chore: release 1.9.24 |
| 2026-11-13T01:24:19+08:00 | [20313b254c](./cc-viewer-alignment-commit-ledger.md#commit-20313b254c) | F | feat: add inline audio preview with streaming range support |
| 2026-11-13T05:19:14+08:00 | [18bd742bc5](./cc-viewer-alignment-commit-ledger.md#commit-18bd742bc5) | F | feat: add subtitle preview and extend image preview formats |
| 2026-11-16T03:50:52+08:00 | [5fc4c75229](./cc-viewer-alignment-commit-ledger.md#commit-5fc4c75229) | F | style(web): 统一 Git 变更 / 文件浏览器刷新按钮样式 |

<a id="b6"></a>
### B6 — 预览与内容引用

初筛类别：`F, J`；候选 42 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-03T13:42:44+08:00 | [fc68e850f2](./cc-viewer-alignment-commit-ledger.md#commit-fc68e850f2) | J | feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15) |
| 2026-08-05T02:25:30+08:00 | [e4fc788b9e](./cc-viewer-alignment-commit-ledger.md#commit-e4fc788b9e) | J | fix(v2-read): finalize crash orphans as completed deltas on cold reads (1.7.16) |
| 2026-08-07T16:20:04+08:00 | [e12dcaded9](./cc-viewer-alignment-commit-ledger.md#commit-e12dcaded9) | J | ui(chat): PC composer polish — 1000px cap, themed strip, white card + shadow, focus-expand animation |
| 2026-08-07T16:20:04+08:00 | [fcfef597dd](./cc-viewer-alignment-commit-ledger.md#commit-fcfef597dd) | J | ui(chat): scope the 1400px chat cap to message items via .container > * |
| 2026-08-24T07:24:56-04:00 | [dc1aeb2840](./cc-viewer-alignment-commit-ledger.md#commit-dc1aeb2840) | F | docs(research): add automated test-case generation survey |
| 2026-08-27T01:39:07-04:00 | [20e6573b7c](./cc-viewer-alignment-commit-ledger.md#commit-20e6573b7c) | J | feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step |
| 2026-09-01T12:21:31-04:00 | [1c5fadafbf](./cc-viewer-alignment-commit-ledger.md#commit-1c5fadafbf) | J | feat(chat): Claude Code task checklist HUD docked above the chat composer |
| 2026-09-02T11:32:38-04:00 | [a70440ee62](./cc-viewer-alignment-commit-ledger.md#commit-a70440ee62) | J | feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on) |
| 2026-09-04T12:59:26+08:00 | [bd50636219](./cc-viewer-alignment-commit-ledger.md#commit-bd50636219) | F | perf(search): move node-engine scan to a worker thread, virtualize result list |
| 2026-09-07T01:57:34+08:00 | [aa58422956](./cc-viewer-alignment-commit-ledger.md#commit-aa58422956) | J | feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges |
| 2026-09-07T11:16:48+08:00 | [caaab3d12f](./cc-viewer-alignment-commit-ledger.md#commit-caaab3d12f) | J | fix(chat): User Prompt Nav language switch + session-divider attribution (#142) |
| 2026-09-09T04:26:05+08:00 | [6880f77320](./cc-viewer-alignment-commit-ledger.md#commit-6880f77320) | J | feat(chat): clickable local file paths in markdown links and code spans |
| 2026-09-09T20:20:19+08:00 | [865604d68e](./cc-viewer-alignment-commit-ledger.md#commit-865604d68e) | F | feat(files): remote web file browser modal with shared context menu + image thumbnails |
| 2026-09-10T05:52:58+08:00 | [365af800e5](./cc-viewer-alignment-commit-ledger.md#commit-365af800e5) | F | feat(files): file browser modal upload + in-project drag-move + zone drag feedback |
| 2026-09-12T22:14:49+08:00 | [5aa5728b95](./cc-viewer-alignment-commit-ledger.md#commit-5aa5728b95) | F | feat(files): unify open-project icon to open in-app web file browser |
| 2026-09-12T22:14:49+08:00 | [a278d68954](./cc-viewer-alignment-commit-ledger.md#commit-a278d68954) | F | feat(files): per-file-type SVG icons in the file browser |
| 2026-10-15T15:47:29+08:00 | [7830664780](./cc-viewer-alignment-commit-ledger.md#commit-7830664780) | F | fix(web): 文件树行高不再被压缩抖动 |
| 2026-10-16T23:50:11+08:00 | [d906edb3de](./cc-viewer-alignment-commit-ledger.md#commit-d906edb3de) | J | feat(web): skill scope rows + frosted glass bars |
| 2026-10-21T17:57:20+08:00 | [a2be00c45b](./cc-viewer-alignment-commit-ledger.md#commit-a2be00c45b) | F | feat(web): 桌面文件上传收纳进 (+) 菜单 |
| 2026-10-21T18:48:08+08:00 | [3cf3e9585f](./cc-viewer-alignment-commit-ledger.md#commit-3cf3e9585f) | F | fix(web): (+) 菜单顶层「上传文件」行 hover 时收起残留的级联子菜单 |
| 2026-10-23T02:56:44+08:00 | [3bd2aa9696](./cc-viewer-alignment-commit-ledger.md#commit-3bd2aa9696) | J | fix(ci): bump-homebrew tarball 下载加重试 (#159) |
| 2026-10-23T11:30:41+08:00 | [117ee25de2](./cc-viewer-alignment-commit-ledger.md#commit-117ee25de2) | J | fix(web): leave a scrollbar bleed on the input stack gradient (#160) |
| 2026-10-27T23:47:58+08:00 | [1e0edc00f3](./cc-viewer-alignment-commit-ledger.md#commit-1e0edc00f3) | J | fix(web): inline queue send-now chip and clear placeholder on dispatch |
| 2026-10-27T23:47:58+08:00 | [566ade13fc](./cc-viewer-alignment-commit-ledger.md#commit-566ade13fc) | F | feat(web): open CLAUDE.md and skill folders |
| 2026-10-29T17:14:03+08:00 | [7a75e1be81](./cc-viewer-alignment-commit-ledger.md#commit-7a75e1be81) | F | feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser |
| 2026-10-29T22:44:02+08:00 | [ebfcbaec0d](./cc-viewer-alignment-commit-ledger.md#commit-ebfcbaec0d) | J | fix(web): hide Last Response when it duplicates the last assistant turn |
| 2026-11-02T14:34:52+08:00 | [dd23ce8df1](./cc-viewer-alignment-commit-ledger.md#commit-dd23ce8df1) | F | feat(web): open file content directly on tree click in file browser |
| 2026-11-02T14:36:20+08:00 | [0cbb545288](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) | J | perf(web): incremental scan in ToolFileChangeController.check |
| 2026-11-03T23:05:11+08:00 | [791a5e18f8](./cc-viewer-alignment-commit-ledger.md#commit-791a5e18f8) | J | feat(web): raise chat composer max height from 6 to 12 lines |
| 2026-11-03T23:05:11+08:00 | [d90ac9587d](./cc-viewer-alignment-commit-ledger.md#commit-d90ac9587d) | J | fix(web): render blank-whitespace text as no bubble instead of empty chat-boxer |
| 2026-11-05T22:34:01+08:00 | [ff0fe1ba93](./cc-viewer-alignment-commit-ledger.md#commit-ff0fe1ba93) | J | fix(web): keep pasted composer images across incoming chat updates |
| 2026-11-11T16:53:06+08:00 | [a6b82f16df](./cc-viewer-alignment-commit-ledger.md#commit-a6b82f16df) | F | feat(web): 文件搜索并入文件浏览器面板并重排搜索控件 |
| 2026-11-11T19:06:26+08:00 | [ea995f3883](./cc-viewer-alignment-commit-ledger.md#commit-ea995f3883) | F | feat(web): drag files into terminal or chat |
| 2026-11-11T19:27:40+08:00 | [beaa2e86f2](./cc-viewer-alignment-commit-ledger.md#commit-beaa2e86f2) | F | feat(web): support dragging folders into terminal and chat |
| 2026-11-11T22:29:39+08:00 | [91a523d043](./cc-viewer-alignment-commit-ledger.md#commit-91a523d043) | F | feat: add cross-platform archive preview |
| 2026-11-12T00:08:33+08:00 | [f96811cddb](./cc-viewer-alignment-commit-ledger.md#commit-f96811cddb) | F | feat: unify file preview routing and binary guards |
| 2026-11-12T00:40:27+08:00 | [6dd3b3b7e5](./cc-viewer-alignment-commit-ledger.md#commit-6dd3b3b7e5) | F | chore: release 1.9.24 |
| 2026-11-13T01:24:19+08:00 | [20313b254c](./cc-viewer-alignment-commit-ledger.md#commit-20313b254c) | F | feat: add inline audio preview with streaming range support |
| 2026-11-13T05:19:14+08:00 | [18bd742bc5](./cc-viewer-alignment-commit-ledger.md#commit-18bd742bc5) | F | feat: add subtitle preview and extend image preview formats |
| 2026-11-16T03:50:52+08:00 | [5fc4c75229](./cc-viewer-alignment-commit-ledger.md#commit-5fc4c75229) | F | style(web): 统一 Git 变更 / 文件浏览器刷新按钮样式 |
| 2026-11-16T13:30:05+08:00 | [2e09d30192](./cc-viewer-alignment-commit-ledger.md#commit-2e09d30192) | J | feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送 |
| 2026-11-16T18:48:44+08:00 | [478268a4db](./cc-viewer-alignment-commit-ledger.md#commit-478268a4db) | J | feat(web): copy selected chat markdown as markdown source |

<a id="b7"></a>
### B7 — 输入体验、导航和 Skills

初筛类别：`J`；候选 21 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-03T13:42:44+08:00 | [fc68e850f2](./cc-viewer-alignment-commit-ledger.md#commit-fc68e850f2) | J | feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15) |
| 2026-08-05T02:25:30+08:00 | [e4fc788b9e](./cc-viewer-alignment-commit-ledger.md#commit-e4fc788b9e) | J | fix(v2-read): finalize crash orphans as completed deltas on cold reads (1.7.16) |
| 2026-08-07T16:20:04+08:00 | [e12dcaded9](./cc-viewer-alignment-commit-ledger.md#commit-e12dcaded9) | J | ui(chat): PC composer polish — 1000px cap, themed strip, white card + shadow, focus-expand animation |
| 2026-08-07T16:20:04+08:00 | [fcfef597dd](./cc-viewer-alignment-commit-ledger.md#commit-fcfef597dd) | J | ui(chat): scope the 1400px chat cap to message items via .container > * |
| 2026-08-27T01:39:07-04:00 | [20e6573b7c](./cc-viewer-alignment-commit-ledger.md#commit-20e6573b7c) | J | feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step |
| 2026-09-01T12:21:31-04:00 | [1c5fadafbf](./cc-viewer-alignment-commit-ledger.md#commit-1c5fadafbf) | J | feat(chat): Claude Code task checklist HUD docked above the chat composer |
| 2026-09-02T11:32:38-04:00 | [a70440ee62](./cc-viewer-alignment-commit-ledger.md#commit-a70440ee62) | J | feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on) |
| 2026-09-07T01:57:34+08:00 | [aa58422956](./cc-viewer-alignment-commit-ledger.md#commit-aa58422956) | J | feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges |
| 2026-09-07T11:16:48+08:00 | [caaab3d12f](./cc-viewer-alignment-commit-ledger.md#commit-caaab3d12f) | J | fix(chat): User Prompt Nav language switch + session-divider attribution (#142) |
| 2026-09-09T04:26:05+08:00 | [6880f77320](./cc-viewer-alignment-commit-ledger.md#commit-6880f77320) | J | feat(chat): clickable local file paths in markdown links and code spans |
| 2026-10-16T23:50:11+08:00 | [d906edb3de](./cc-viewer-alignment-commit-ledger.md#commit-d906edb3de) | J | feat(web): skill scope rows + frosted glass bars |
| 2026-10-23T02:56:44+08:00 | [3bd2aa9696](./cc-viewer-alignment-commit-ledger.md#commit-3bd2aa9696) | J | fix(ci): bump-homebrew tarball 下载加重试 (#159) |
| 2026-10-23T11:30:41+08:00 | [117ee25de2](./cc-viewer-alignment-commit-ledger.md#commit-117ee25de2) | J | fix(web): leave a scrollbar bleed on the input stack gradient (#160) |
| 2026-10-27T23:47:58+08:00 | [1e0edc00f3](./cc-viewer-alignment-commit-ledger.md#commit-1e0edc00f3) | J | fix(web): inline queue send-now chip and clear placeholder on dispatch |
| 2026-10-29T22:44:02+08:00 | [ebfcbaec0d](./cc-viewer-alignment-commit-ledger.md#commit-ebfcbaec0d) | J | fix(web): hide Last Response when it duplicates the last assistant turn |
| 2026-11-02T14:36:20+08:00 | [0cbb545288](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) | J | perf(web): incremental scan in ToolFileChangeController.check |
| 2026-11-03T23:05:11+08:00 | [791a5e18f8](./cc-viewer-alignment-commit-ledger.md#commit-791a5e18f8) | J | feat(web): raise chat composer max height from 6 to 12 lines |
| 2026-11-03T23:05:11+08:00 | [d90ac9587d](./cc-viewer-alignment-commit-ledger.md#commit-d90ac9587d) | J | fix(web): render blank-whitespace text as no bubble instead of empty chat-boxer |
| 2026-11-05T22:34:01+08:00 | [ff0fe1ba93](./cc-viewer-alignment-commit-ledger.md#commit-ff0fe1ba93) | J | fix(web): keep pasted composer images across incoming chat updates |
| 2026-11-16T13:30:05+08:00 | [2e09d30192](./cc-viewer-alignment-commit-ledger.md#commit-2e09d30192) | J | feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送 |
| 2026-11-16T18:48:44+08:00 | [478268a4db](./cc-viewer-alignment-commit-ledger.md#commit-478268a4db) | J | feat(web): copy selected chat markdown as markdown source |

<a id="b8"></a>
### B8 — 代理、模型与提示词

初筛类别：`E`；候选 24 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-07-26T14:41:46+08:00 | [3eb16102e5](./cc-viewer-alignment-commit-ledger.md#commit-3eb16102e5) | E | fix(proxy-stats): make the config tab's scroll viewport resolve |
| 2026-07-26T14:41:56+08:00 | [51b3443e57](./cc-viewer-alignment-commit-ledger.md#commit-51b3443e57) | E | fix(proxy-stats): restore the stats-tab refresh controls |
| 2026-07-26T14:42:06+08:00 | [935a33cc0a](./cc-viewer-alignment-commit-ledger.md#commit-935a33cc0a) | E | fix(proxy-stats): keep retryBurden range JSON-safe |
| 2026-07-26T14:42:24+08:00 | [60cb46ce98](./cc-viewer-alignment-commit-ledger.md#commit-60cb46ce98) | E | docs(history): condense the Unreleased proxy-stats entries |
| 2026-07-29T11:50:00+08:00 | [82db2b907c](./cc-viewer-alignment-commit-ledger.md#commit-82db2b907c) | E | ui(proxy-stats): align retry stats chart colors with app theme; release 1.7.11 |
| 2026-07-30T23:47:39+08:00 | [e932bbef2e](./cc-viewer-alignment-commit-ledger.md#commit-e932bbef2e) | E | feat(context): kimi logo refresh + context-window follows hot-switched model |
| 2026-08-01T17:15:34+08:00 | [9c0463bb8c](./cc-viewer-alignment-commit-ledger.md#commit-9c0463bb8c) | E | prompt(kimi): anti-loop guardrails in kimi-k3/k2.7-code system-prompt presets (1.7.14) |
| 2026-08-08T12:39:22+08:00 | [b78a51eb1d](./cc-viewer-alignment-commit-ledger.md#commit-b78a51eb1d) | E | fix(system-prompt): bare k3 resolves to the Kimi entry (1.7.18) |
| 2026-08-16T11:11:26-04:00 | [69b104cbf3](./cc-viewer-alignment-commit-ledger.md#commit-69b104cbf3) | E | feat(system-prompt): type-ahead model names in "+ Add model" dialog (1.7.21) |
| 2026-08-17T00:16:49-04:00 | [02ce99f202](./cc-viewer-alignment-commit-ledger.md#commit-02ce99f202) | E | feat(system-prompt): auto header entry, model-aware default tab, chip icon |
| 2026-08-20T09:34:00-04:00 | [729b886893](./cc-viewer-alignment-commit-ledger.md#commit-729b886893) | E | refactor(boundaries): break static cycles + add import-boundary gate for packages/app |
| 2026-08-23T13:30:04+08:00 | [72551f625b](./cc-viewer-alignment-commit-ledger.md#commit-72551f625b) | E | fix(system-prompt): drop 7 loop-volatile dynamic prompt variables |
| 2026-08-24T11:22:01-04:00 | [fe0c52ff60](./cc-viewer-alignment-commit-ledger.md#commit-fe0c52ff60) | E | feat(system-prompt): built-in model system prompts default-effective with override + tombstone disable |
| 2026-08-25T06:42:11-04:00 | [7c1963aca1](./cc-viewer-alignment-commit-ledger.md#commit-7c1963aca1) | E | fix(app-header): show only main profile on proxy hot-switch chip |
| 2026-08-25T15:46:11-04:00 | [3a2159219b](./cc-viewer-alignment-commit-ledger.md#commit-3a2159219b) | E | feat(context): default unrecognized model context window to 1M |
| 2026-08-31T00:35:15+08:00 | [8fb468ddc8](./cc-viewer-alignment-commit-ledger.md#commit-8fb468ddc8) | E | fix(system-prompt): add background-agent waiting discipline to Kimi presets |
| 2026-09-04T17:28:59+08:00 | [d5e66ec1d8](./cc-viewer-alignment-commit-ledger.md#commit-d5e66ec1d8) | E | feat(cli): inject enhanced context into headless (-p)/one-shot run sessions without starting GUI |
| 2026-09-15T21:52:16+08:00 | [085c21516f](./cc-viewer-alignment-commit-ledger.md#commit-085c21516f) | E | feat(proxy): system 提示词热切换、内置 preset 族系合并与别名扩展 |
| 2026-09-16T08:23:33+08:00 | [b604b1e4f1](./cc-viewer-alignment-commit-ledger.md#commit-b604b1e4f1) | E | feat(system-prompt): add async no-poll rule to kimi-k3 preset; drop defensive-engineering line from all prompt templates |
| 2026-10-24T15:52:35+08:00 | [6363a51ec0](./cc-viewer-alignment-commit-ledger.md#commit-6363a51ec0) | E | fix: recognize Kimi K3 model aliases |
| 2026-10-27T23:47:58+08:00 | [15751cf49c](./cc-viewer-alignment-commit-ledger.md#commit-15751cf49c) | E | chore(server): kimi-k3 preset forbids unrequested real-environment verification |
| 2026-11-11T00:53:23+08:00 | [839f0f85ac](./cc-viewer-alignment-commit-ledger.md#commit-839f0f85ac) | E | fix(kimi-k3): add tool-error circuit-breaker section to preset |
| 2026-11-11T11:14:03+08:00 | [d6ec38be82](./cc-viewer-alignment-commit-ledger.md#commit-d6ec38be82) | E | feat(header): stop auto-pinning system-prompt entry to top navbar |
| 2026-11-11T11:53:21+08:00 | [96f3a7a44e](./cc-viewer-alignment-commit-ledger.md#commit-96f3a7a44e) | E | feat(chat): move user-prompts entry from hamburger menu to prompt-nav "more" |

<a id="b9"></a>
### B9 — 定时任务与授权

初筛类别：`G, I`；候选 11 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-23T15:32:21+08:00 | [93a17ea623](./cc-viewer-alignment-commit-ledger.md#commit-93a17ea623) | I | chore(tarball): add approval-policy.js + launch-config.js to the tarball baseline |
| 2026-08-25T15:47:02-04:00 | [51c974e441](./cc-viewer-alignment-commit-ledger.md#commit-51c974e441) | I | feat(permission): default auto-approve to a 3s countdown |
| 2026-10-21T11:43:49+08:00 | [3d4f098f08](./cc-viewer-alignment-commit-ledger.md#commit-3d4f098f08) | I | fix(web): stop askUserQuestion 'Other' input from triggering browser password save (#155) |
| 2026-10-23T17:39:51+08:00 | [177b85df2c](./cc-viewer-alignment-commit-ledger.md#commit-177b85df2c) | G | feat(server+web): add scheduled tasks ("设置定时任务") |
| 2026-10-25T23:39:32+08:00 | [5ee6739cba](./cc-viewer-alignment-commit-ledger.md#commit-5ee6739cba) | G | feat: merge SDK context usage into blood bars |
| 2026-10-27T23:47:58+08:00 | [aaa3a59444](./cc-viewer-alignment-commit-ledger.md#commit-aaa3a59444) | I | docs: changelog for server-side approval countdown and UltraReview template |
| 2026-10-30T14:14:30+08:00 | [208f134827](./cc-viewer-alignment-commit-ledger.md#commit-208f134827) | I | fix(server+web): fork review fixes for 1.9.17 — new-file save 403, plan modal reopen, fallback countdown |
| 2026-11-04T15:23:00+08:00 | [7a0ba39edf](./cc-viewer-alignment-commit-ledger.md#commit-7a0ba39edf) | G | test(app): deflake git + scheduled-task tests — poll async launch, retry rmSync cleanup |
| 2026-11-10T23:16:37+08:00 | [2914d6479d](./cc-viewer-alignment-commit-ledger.md#commit-2914d6479d) | G | feat(web): quick-fill time buttons for one-time scheduled tasks (#169) |
| 2026-11-15T15:40:52+08:00 | [00fdfade79](./cc-viewer-alignment-commit-ledger.md#commit-00fdfade79) | I | chore: release 1.9.27 |
| 2026-11-16T16:25:24+08:00 | [1b3c2268e3](./cc-viewer-alignment-commit-ledger.md#commit-1b3c2268e3) | I | feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片 |

<a id="b10"></a>
### B10 — 服务插件与反向代理

初筛类别：`H`；候选 5 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-08-17T22:46:51-04:00 | [6680d041d4](./cc-viewer-alignment-commit-ledger.md#commit-6680d041d4) | H | feat(tools): sync tool catalog to Claude Code 2.1.233 — 21 new tools, MCP & Extensions category |
| 2026-08-18T06:19:09-04:00 | [a97d0f8adf](./cc-viewer-alignment-commit-ledger.md#commit-a97d0f8adf) | H | docs(concepts): "Activation" sections for gated tools in all 18 locales |
| 2026-08-20T09:34:00-04:00 | [20ccfb7304](./cc-viewer-alignment-commit-ledger.md#commit-20ccfb7304) | H | refactor(content): extract bundled assets into packages/content (@ccv/content) |
| 2026-10-22T22:11:06+08:00 | [58493d1c85](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85) | H | feat(plugins): directory service plugins with same-port proxy + remote React panels |
| 2026-10-31T03:44:17+08:00 | [77b61bd571](./cc-viewer-alignment-commit-ledger.md#commit-77b61bd571) | H | fix(server+web): resilient sends, approval-hook timeout, SSE slow reconnect, off-mode stream idle watchdog |

<a id="b11"></a>
### B11 — 安全交互、IM、跨平台与工程收尾

初筛类别：`I, K, L, N`；候选 42 条，按提交时间升序。

| 提交时间 | 台账 | 初筛类别 | 标题 |
| --- | --- | --- | --- |
| 2026-07-26T14:42:16+08:00 | [eef9fd870e](./cc-viewer-alignment-commit-ledger.md#commit-eef9fd870e) | N | refactor: drop dead code left by the retry-stats redesign |
| 2026-07-26T17:06:42+08:00 | [6bd3b80e58](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58) | K | fix(win): restore Claude discovery and Electron tab launch on Windows |
| 2026-07-26T21:37:19+08:00 | [ef64e15621](./cc-viewer-alignment-commit-ledger.md#commit-ef64e15621) | K | fix(findcc): move native resolution before PATH to avoid ERROR_BAD_EXE_FORMAT on Windows |
| 2026-07-26T23:48:06+08:00 | [9600351738](./cc-viewer-alignment-commit-ledger.md#commit-9600351738) | K | fix(electron): add missing src/utils/ to electron-builder bundle |
| 2026-08-01T02:57:48+08:00 | [6baff0cd6f](./cc-viewer-alignment-commit-ledger.md#commit-6baff0cd6f) | K | feat(log-list): perf cache + server-side pagination + project switcher (1.7.13) |
| 2026-08-20T09:34:00-04:00 | [3b5103bb9e](./cc-viewer-alignment-commit-ledger.md#commit-3b5103bb9e) | L | ci(contract): add L4 tarball-layout gate (verify:tarball + committed baseline) |
| 2026-08-23T15:32:21+08:00 | [93a17ea623](./cc-viewer-alignment-commit-ledger.md#commit-93a17ea623) | I | chore(tarball): add approval-policy.js + launch-config.js to the tarball baseline |
| 2026-08-24T05:24:41-04:00 | [c185a7484e](./cc-viewer-alignment-commit-ledger.md#commit-c185a7484e) | L | refactor(context): rename Context tab per-exchange "Turn N" concept to "Step N" |
| 2026-08-24T07:26:46-04:00 | [f28d9cae37](./cc-viewer-alignment-commit-ledger.md#commit-f28d9cae37) | L | feat(ultraplan): add Test Analysis Expert (测分专家) preset expert |
| 2026-08-24T23:41:40-04:00 | [1af3d646c9](./cc-viewer-alignment-commit-ledger.md#commit-1af3d646c9) | L | fix(ultraplan): rework Test Analysis Expert preset around Plan tool with staticized Midscene rules |
| 2026-08-25T15:46:39-04:00 | [9eb178145b](./cc-viewer-alignment-commit-ledger.md#commit-9eb178145b) | N | refactor(footer): plain GitHub link and hide plan-usage pill without data |
| 2026-08-25T15:47:02-04:00 | [51c974e441](./cc-viewer-alignment-commit-ledger.md#commit-51c974e441) | I | feat(permission): default auto-approve to a 3s countdown |
| 2026-08-26T20:02:58+08:00 | [73557f1989](./cc-viewer-alignment-commit-ledger.md#commit-73557f1989) | L | chore(scripts): regenerate tarball baseline for GLM-5.3 preset |
| 2026-09-04T14:14:12+08:00 | [cdabb27454](./cc-viewer-alignment-commit-ledger.md#commit-cdabb27454) | L | fix(footer): hide geo badge for non-Anthropic-official subscriptions |
| 2026-09-06T02:11:02+08:00 | [57798b7ccc](./cc-viewer-alignment-commit-ledger.md#commit-57798b7ccc) | L | fix(logs): project switch lag, single-page pager, and pager spacing in log-management modal |
| 2026-09-06T02:31:47+08:00 | [9b1a2c913a](./cc-viewer-alignment-commit-ledger.md#commit-9b1a2c913a) | N | docs(claude): document release tag ordering — changeset version bump must land before tagging |
| 2026-09-07T02:07:00+08:00 | [85b9aabce4](./cc-viewer-alignment-commit-ledger.md#commit-85b9aabce4) | L | fix(ci): widen bump-homebrew npm-registry wait window to 10min |
| 2026-09-07T17:48:09+08:00 | [71cee60794](./cc-viewer-alignment-commit-ledger.md#commit-71cee60794) | L | fix(ci): close the release-pipeline gaps that made releases fail repeatedly |
| 2026-09-10T06:12:47+08:00 | [48d6e0f3c3](./cc-viewer-alignment-commit-ledger.md#commit-48d6e0f3c3) | L | fix(tests): await stopViewer in server.test.js to fix EPIPE flake |
| 2026-09-14T02:01:44+08:00 | [96c477d582](./cc-viewer-alignment-commit-ledger.md#commit-96c477d582) | L | fix(server): guard execWithStdin against EPIPE when child exits early |
| 2026-09-15T23:45:23+08:00 | [89a0a25364](./cc-viewer-alignment-commit-ledger.md#commit-89a0a25364) | N | docs(claude): rewrite CLAUDE.md as prohibitions-only, add patch-only versioning rule |
| 2026-09-16T08:53:02+08:00 | [2e17699fd7](./cc-viewer-alignment-commit-ledger.md#commit-2e17699fd7) | L | feat(git): show +n/-n line stats on unpushed-commit rows, restore real file statuses |
| 2026-09-17T15:12:28+08:00 | [8923322f88](./cc-viewer-alignment-commit-ledger.md#commit-8923322f88) | L | chore(ultraplan): refine code-expert review priority wording |
| 2026-09-19T09:19:10+08:00 | [90b41358f9](./cc-viewer-alignment-commit-ledger.md#commit-90b41358f9) | L | ci: soft-fail npm dist-tag step under OIDC trusted publishing |
| 2026-09-21T11:41:00+08:00 | [b1fe5c09a6](./cc-viewer-alignment-commit-ledger.md#commit-b1fe5c09a6) | N | docs: add config convergence & cloud-sync advisory, link from READMEs |
| 2026-09-21T23:31:43+08:00 | [964ce756b6](./cc-viewer-alignment-commit-ledger.md#commit-964ce756b6) | N | docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter |
| 2026-09-22T00:50:37+08:00 | [384dee8025](./cc-viewer-alignment-commit-ledger.md#commit-384dee8025) | N | docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter |
| 2026-09-22T00:50:37+08:00 | [9adf4ef539](./cc-viewer-alignment-commit-ledger.md#commit-9adf4ef539) | N | docs: add config convergence & cloud-sync advisory, link from READMEs |
| 2026-10-09T18:48:22+08:00 | [3fa5717865](./cc-viewer-alignment-commit-ledger.md#commit-3fa5717865) | L | ci(release): carry `latest` on the publish itself, widen the homebrew poll |
| 2026-10-21T11:43:49+08:00 | [3d4f098f08](./cc-viewer-alignment-commit-ledger.md#commit-3d4f098f08) | I | fix(web): stop askUserQuestion 'Other' input from triggering browser password save (#155) |
| 2026-10-22T11:11:32+08:00 | [a336d3919f](./cc-viewer-alignment-commit-ledger.md#commit-a336d3919f) | K | feat(web): fold terminal toolbar upload into the sparkle quick-settings menu |
| 2026-10-22T22:22:29+08:00 | [e8ea1ae96a](./cc-viewer-alignment-commit-ledger.md#commit-e8ea1ae96a) | N | docs(history): classify backlogged Unreleased entries into 1.9.4~1.9.9 sections |
| 2026-10-27T23:47:58+08:00 | [aaa3a59444](./cc-viewer-alignment-commit-ledger.md#commit-aaa3a59444) | I | docs: changelog for server-side approval countdown and UltraReview template |
| 2026-10-30T14:14:30+08:00 | [208f134827](./cc-viewer-alignment-commit-ledger.md#commit-208f134827) | I | fix(server+web): fork review fixes for 1.9.17 — new-file save 403, plan modal reopen, fallback countdown |
| 2026-11-03T23:05:11+08:00 | [92ed9bc751](./cc-viewer-alignment-commit-ledger.md#commit-92ed9bc751) | L | fix(content): unify UltraReview prompt to the TeamCreate-free version |
| 2026-11-11T00:54:30+08:00 | [1ae82a825b](./cc-viewer-alignment-commit-ledger.md#commit-1ae82a825b) | N | chore(history): archive Unreleased entries under 1.9.23 |
| 2026-11-12T00:25:16+08:00 | [62012025cb](./cc-viewer-alignment-commit-ledger.md#commit-62012025cb) | L | ci: retry bounded zsh installation |
| 2026-11-12T00:35:20+08:00 | [f3db3ed9a2](./cc-viewer-alignment-commit-ledger.md#commit-f3db3ed9a2) | K | ci: avoid installing zsh for mocked shell tests |
| 2026-11-12T14:16:08+08:00 | [17ba9be7b5](./cc-viewer-alignment-commit-ledger.md#commit-17ba9be7b5) | K | fix: harden guided updates and restart recovery |
| 2026-11-12T15:10:08+08:00 | [c30ca279bd](./cc-viewer-alignment-commit-ledger.md#commit-c30ca279bd) | L | chore: release 1.9.25 |
| 2026-11-15T15:40:52+08:00 | [00fdfade79](./cc-viewer-alignment-commit-ledger.md#commit-00fdfade79) | I | chore: release 1.9.27 |
| 2026-11-16T16:25:24+08:00 | [1b3c2268e3](./cc-viewer-alignment-commit-ledger.md#commit-1b3c2268e3) | I | feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片 |


## B0 人工分流：原 X 类提交的交叉入口

下列 15 条原为未归类，现已按改动路径分配至对应工作包；初筛表中的 X 类保留原始记录。最终适用性与功能状态仍需核验。

| 提交 | 工作包 | 分流依据 |
| --- | --- | --- |
| [ccf74880a5](./cc-viewer-alignment-commit-ledger.md#commit-ccf74880a5) | [B5](#b5) / [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [0c7195b689](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689) | [B3](#b3) / [B5](#b5) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [9967ebdbc2](./cc-viewer-alignment-commit-ledger.md#commit-9967ebdbc2) | [B7](#b7) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [2dbe5cd695](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) | [B1](#b1) / [B7](#b7) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [c93c3110ed](./cc-viewer-alignment-commit-ledger.md#commit-c93c3110ed) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [5b544c6ee1](./cc-viewer-alignment-commit-ledger.md#commit-5b544c6ee1) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [2049aef95e](./cc-viewer-alignment-commit-ledger.md#commit-2049aef95e) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [637fbb0218](./cc-viewer-alignment-commit-ledger.md#commit-637fbb0218) | [B5](#b5) / [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [bacfe559fe](./cc-viewer-alignment-commit-ledger.md#commit-bacfe559fe) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [ea8c5e39e0](./cc-viewer-alignment-commit-ledger.md#commit-ea8c5e39e0) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [0c12335e53](./cc-viewer-alignment-commit-ledger.md#commit-0c12335e53) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [d88982c6ce](./cc-viewer-alignment-commit-ledger.md#commit-d88982c6ce) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [c768e8beb3](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) | [B11](#b11) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [87432d4c5a](./cc-viewer-alignment-commit-ledger.md#commit-87432d4c5a) | [B3](#b3) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
| [1db2a38eab](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab) | [B8](#b8) | [B0 记录](./B0-commit-lineage.md#b0-x-triage) |
