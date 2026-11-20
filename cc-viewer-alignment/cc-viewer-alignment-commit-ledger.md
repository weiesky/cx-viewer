# cc-viewer 逐提交对齐台账

2026-11-20 B4实施中（第5/12工作包），固定上游74cd752d99caf122e750216d2af3bb9f467c4de1；B2/B3已收口。默认exec/显式AppServer渐进启用，任务HUD、原审批/问答/子Agent卡片、输入区/角色浮层、整轮loading和错误条已实现。E18 9e7a83a修复最终回复浮层残留，E19 36af884单次续接，E20 124ca25原重试UI/用户所选Codex原文已验。E21 f7b13af/E22 7a50079原慢请求提示、首body/逐请求清理/重连回放已实现，GUI发现的冷hydration清掉回放已纠正。最终1480/1480、0 skip、构建通过；新生产安装199/199、695文件/202 Web精确字节及B1.2/隔离CLI通过；Safari生产30s提示/切出/返回/刷新/首字节收起通过。E23 a51bd1a首轮JSON分段展开Web279/构建已过；E24真实Codex本机38请求补齐child中断/复用/隔离深度2嵌套的生产tracker/transport验证；Context SDK占位说明待用户选择。E25 SDK独立agent_loop边界/SSE/JS插件钩子与公开CLI已接线，26+11定向/构建和真实Codex本机34请求通过；下一笔原语音设置/播放接线，随后核活性/丢result，66候选不整体勾选。B4未收口、未推送。保留IM并发测试一次偶发失败（定向/5轮/最终全测通过，原因未定）；原生profile/image-input/add-dir/review不支持，真实命令/文件/permissions审批、dynamic图像、外部慢网模型、物理/其他平台仍未验。详见[B4实施](./B4-implementation.md)。

2026-11-18 GitHub 同步：已按用户请求将 main 6045b53 与 codex/pnpm-workspace 2c0edc8 原子推送到 origin 同名分支，远端完整 hash 已读回核对，上游跟踪已设置。未执行强推、分支合并或活动安装切换；未提交的 AGENTS.md 与 cc-viewer-alignment 文档仍保留本地。

2026-11-18 提交整理：用户选择按两阶段压缩，原 main 34 笔合为 `6045b53`，原新结构工作树 11 笔合为 `2c0edc8`。两阶段文件树均与原末端完全相同；未切换活动目录、未推送。原提交与43笔专项实施证据保留在 archive 引用中，见 [45条完整映射](./local-commit-consolidation-2026-11-18.md)。此次不重复运行测试，后文1161/1161等为原实现批次验证。

上游固定快照 `74cd752d99caf122e750216d2af3bb9f467c4de1`；cx-viewer 工作基线 `753fd6c632b5bac8577dfe98f28d666ff3437d28`。下界 npm 1.1.20 发布时间 2026-07-26T04:55:08Z。

范围：按 Git commit 时间筛选上游可达历史 337 条，含合并与发布；显示提交时间与作者时间。合并提交的文件为相对第一父提交的变化，并非新增功能的独立证据。

2026-11-17：B0 已完结；专项累计 43 笔独立实现。B1.2 本轮新增 3f81fbc 全库离线验 key、8732a33 明确用途的损坏证据、0122f7e 无损 key 修复、20ce331 现场留存命令。候选备份 key 必须认证每条当前记录，才允许只替换 key；保留当前 source/store 精确字节及备份后新增/更新的其他配置凭据。坏密文、缺失库、不匹配候选或无记录可证明时拒绝写入，可显式保存私有损坏证据；有损整库回退尚未启用，产品选择待回复。最终全量 1161/1161、0 skip、无失败钩子，构建、npm 680 文件预览和实际 tarball 的默认只读/修复/重启/字节保留/坏库拒绝/现场留存通过。auth/proxy/IM 迁移及 36d0697 配置恢复保持，auth 按已确认范围回退整份 preferences。首次迁移前快照可能无 key，真实验收需在迁移后追加含新 key 的正常快照。B1.2 尚待回退策略选择与真实环境验收，再推进 B2–B10。A1 6287d2a 已主线，A2 3b15a6d 及后续实现在 codex/pnpm-workspace 工作树。活动全局实例与真实凭据未停止、切换、迁移或恢复；GUI、真实模型 CLI/DingTalk 网络、Windows/Linux、签名/公证、全局升级、最低 Node/远端 CI、高负载与断电未验收。见 [key 修复](./B1-key-repair.md)、[验收矩阵](./B1-acceptance-matrix.md) 和 [工程交接](./A1-A2-engineering.md)。

本台账的初筛批次、处理建议和候选路径均为**机械初筛线索**；尤其同名文件不保证实现相同。后续的 B0 决议、代码对照和复核结论分别记录证据及覆盖范围，不能把初筛状态或文件存在当作功能完成。任何移植前必须查看该 commit 的完整 diff、后续修复、目标路径和测试。

合并记录仅用于追踪关联，不与其子提交重复 cherry-pick。发布、CI、Claude 专属配置和危险权限变更须分别判断。另注意同一个改动可能在分支合并中出现不同 hash，不能仅凭 hash 排重。

<a id="commit-74cd752d99"></a>
## [74cd752d99](https://github.com/weiesky/cc-viewer/commit/74cd752d99caf122e750216d2af3bb9f467c4de1) — chore(release): 1.9.29
- [B0 upstream full commit message](./B0-upstream-messages.md#message-74cd752d99)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-74cd752d99)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T23:21:08+08:00；作者时间：2026-11-16T23:21:08+08:00；父提交：ac56c9c6d5。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（7 个）：
  - `.changeset/active-agents-count-fix.md` → 无直接路径匹配
  - `.changeset/chat-copy-as-markdown.md` → 无直接路径匹配
  - `.changeset/chat-quote-diff-selection.md` → 无直接路径匹配
  - `.changeset/chat-quote-selection.md` → 无直接路径匹配
  - `.changeset/sdk-composer-prompt-nav.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-ac56c9c6d5"></a>
## [ac56c9c6d5](https://github.com/weiesky/cc-viewer/commit/ac56c9c6d56ca7e9fd5d3bf7f55c273d3e0f6a5d) — Merge pull request #176 from weiesky/feat/sdk-composer-prompt-nav
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ac56c9c6d5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ac56c9c6d5)

- B0 血缘：相对第一父分支引入窗口内 4 条可达提交：[8f1d345309](#commit-8f1d345309), [478268a4db](#commit-478268a4db), [1b3c2268e3](#commit-1b3c2268e3), [2e09d30192](#commit-2e09d30192)。合并与分支变更不得重复计算。

- 提交时间：2026-11-16T23:20:04+08:00；作者时间：2026-11-16T23:20:04+08:00；父提交：13ad396d5e, 8f1d345309。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（27 个）：
  - `.changeset/active-agents-count-fix.md` → 无直接路径匹配
  - `.changeset/chat-copy-as-markdown.md` → 无直接路径匹配
  - `.changeset/chat-quote-diff-selection.md` → 无直接路径匹配
  - `.changeset/chat-quote-selection.md` → 无直接路径匹配
  - `.changeset/sdk-composer-prompt-nav.md` → 无直接路径匹配
  - `apps/web/package.json` → 本地候选：`package.json`
  - `apps/web/src/components/chat/ActiveAgentsBar.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/AskQuestionForm.jsx` → 本地候选：`src/components/chat/AskQuestionForm.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/DiffView.jsx` → 本地候选：`src/components/chat/DiffView.jsx`
  - `apps/web/src/components/chat/DiffView.module.css` → 本地候选：`src/components/chat/DiffView.module.css`
  - `apps/web/src/components/chat/selectionQuote.js` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/activeAgents.js` → 无直接路径匹配
  - `apps/web/src/utils/markdownCopy.js` → 无直接路径匹配
  - `apps/web/src/utils/promptNav.js` → 本地候选：`src/utils/promptNav.js`
  - `apps/web/test/activeAgents.test.js` → 无直接路径匹配
  - `apps/web/test/chat-quote-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-copy.test.js` → 无直接路径匹配
  - `apps/web/vite.config.js` → 本地候选：`vite.config.js`
  - `history.md` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配

- 2026-11-21 B4 E57：本笔实际运行时子项的阅读边界/本地复用/后续工作包归属见[B4.60](./B4-implementation.md#b460-e57-混合候选的生命周期与输入代理自动化边界源码审计无运行时变动)及[B4混合scope回执](./B4-mixed-scope-audit-2026-11-21.json)。无运行时改动，不将B7/B8/B9及其他混合子项整体勾选。

<a id="commit-8f1d345309"></a>
## [8f1d345309](https://github.com/weiesky/cc-viewer/commit/8f1d345309b10c289ee14825fea8d24f07eb534f) — feat(web): move prompt-nav into composer and relocate mic in --sdk layout
- [B0 upstream full commit message](./B0-upstream-messages.md#message-8f1d345309)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-8f1d345309)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T23:10:26+08:00；作者时间：2026-11-16T23:10:26+08:00；父提交：478268a4db。
- B0 本地关键代码对照：已核验上游能力及本地入口；结论和未验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（10 个）：
  - `.changeset/active-agents-count-fix.md` → 无直接路径匹配
  - `.changeset/sdk-composer-prompt-nav.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ActiveAgentsBar.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/activeAgents.js` → 无直接路径匹配
  - `apps/web/src/utils/promptNav.js` → 本地候选：`src/utils/promptNav.js`
  - `apps/web/test/activeAgents.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

- 2026-11-21 B4 E57：本笔实际运行时子项的阅读边界/本地复用/后续工作包归属见[B4.60](./B4-implementation.md#b460-e57-混合候选的生命周期与输入代理自动化边界源码审计无运行时变动)及[B4混合scope回执](./B4-mixed-scope-audit-2026-11-21.json)。无运行时改动，不将B7/B8/B9及其他混合子项整体勾选。

<a id="commit-13ad396d5e"></a>
## [13ad396d5e](https://github.com/weiesky/cc-viewer/commit/13ad396d5ec0a26ab69583f494f6ff56c23ea97f) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-13ad396d5e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-13ad396d5e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T11:13:15+00:00；作者时间：2026-11-16T11:13:15+00:00；父提交：efe935cd43。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-478268a4db"></a>
## [478268a4db](https://github.com/weiesky/cc-viewer/commit/478268a4db5aadb50be1396207b2c54093824c58) — feat(web): copy selected chat markdown as markdown source
- B0 本地关键代码对照：上游将助手 Markdown 选区复制为 Markdown 并保留 HTML，新增 Turndown/GFM；本地尚未证实同功能。先评估现有渲染/复制工具和依赖，验证链接安全、代码块与非助手选区，归 B6/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-478268a4db)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-478268a4db)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-478268a4db)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T18:48:44+08:00；作者时间：2026-11-16T18:48:44+08:00；父提交：1b3c2268e3。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（10 个）：
  - `.changeset/chat-copy-as-markdown.md` → 无直接路径匹配
  - `apps/web/package.json` → 本地候选：`package.json`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/selectionQuote.js` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/markdownCopy.js` → 无直接路径匹配
  - `apps/web/test/markdown-copy.test.js` → 无直接路径匹配
  - `apps/web/vite.config.js` → 本地候选：`vite.config.js`
  - `history.md` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配

<a id="commit-1b3c2268e3"></a>
## [1b3c2268e3](https://github.com/weiesky/cc-viewer/commit/1b3c2268e3bd0e73ffef043bf450662d01a28371) — feat(web): 「添加到对话」覆盖代码 diff、工具参数区与 AskUserQuestion 卡片
- B0 本地关键代码对照：上游扩展选区引用至 diff、工具参数和问答卡片，并避免选字触发选择；本地 ChatMessage.jsx、DiffView.jsx、AskQuestionForm.jsx 已有各自组件，需实现跨区域规则、键盘和多选区测试，归 B6/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-1b3c2268e3)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1b3c2268e3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1b3c2268e3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T16:25:24+08:00；作者时间：2026-11-16T16:25:24+08:00；父提交：2e09d30192。
- 初筛批次：**I / 权限与交互问答**；状态：待人工核验。
- 处理建议：核对 Codex 原生审批和用户输入；变更默认权限须独立决策。
- 上游改动路径（10 个）：
  - `.changeset/chat-quote-diff-selection.md` → 无直接路径匹配
  - `apps/web/src/components/chat/AskQuestionForm.jsx` → 本地候选：`src/components/chat/AskQuestionForm.jsx`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/DiffView.jsx` → 本地候选：`src/components/chat/DiffView.jsx`
  - `apps/web/src/components/chat/DiffView.module.css` → 本地候选：`src/components/chat/DiffView.module.css`
  - `apps/web/src/components/chat/selectionQuote.js` → 无直接路径匹配
  - `apps/web/test/chat-quote-i18n.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-2e09d30192"></a>
## [2e09d30192](https://github.com/weiesky/cc-viewer/commit/2e09d30192774017db5cb06d1783686c63b16031) — feat(web): 选中助手回复文字弹出「添加到对话」，作为引用 chip 随消息发送
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2e09d30192)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2e09d30192)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T13:30:05+08:00；作者时间：2026-11-16T13:30:05+08:00；父提交：efe935cd43。
- B0 本地关键代码对照：已核验上游能力及本地入口；结论和未验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（10 个）：
  - `.changeset/chat-quote-selection.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/selectionQuote.js` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/test/chat-quote-i18n.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-efe935cd43"></a>
## [efe935cd43](https://github.com/weiesky/cc-viewer/commit/efe935cd43146052eada870a78bc8fb774e19cdd) — chore(release): 1.9.28
- [B0 upstream full commit message](./B0-upstream-messages.md#message-efe935cd43)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-efe935cd43)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T05:07:29+08:00；作者时间：2026-11-16T05:07:29+08:00；父提交：8bba70ec69。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（6 个）：
  - `.changeset/active-agents-card.md` → 无直接路径匹配
  - `.changeset/sdk-hide-teammate-role.md` → 无直接路径匹配
  - `.changeset/unify-refresh-button-style.md` → 无直接路径匹配
  - `.changeset/ws-mux-backpressure-fix.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-8bba70ec69"></a>
## [8bba70ec69](https://github.com/weiesky/cc-viewer/commit/8bba70ec69d7ff856e3eb28684448fe0cef83626) — Merge pull request #175 from weiesky/feat/active-agents-card
- [B0 upstream full commit message](./B0-upstream-messages.md#message-8bba70ec69)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-8bba70ec69)

- B0 血缘：相对第一父分支引入窗口内 4 条可达提交：[975313773a](#commit-975313773a), [5fc4c75229](#commit-5fc4c75229), [add350bc52](#commit-add350bc52), [bde0244333](#commit-bde0244333)。合并与分支变更不得重复计算。

- 提交时间：2026-11-16T05:06:51+08:00；作者时间：2026-11-16T05:06:51+08:00；父提交：00fdfade79, 975313773a。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（33 个）：
  - `.changeset/active-agents-card.md` → 无直接路径匹配
  - `.changeset/sdk-hide-teammate-role.md` → 无直接路径匹配
  - `.changeset/unify-refresh-button-style.md` → 无直接路径匹配
  - `.changeset/ws-mux-backpressure-fix.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ActiveAgentsBar.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/ActiveAgentsBar.module.css` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/components/git/GitChanges.module.css` → 本地候选：`src/components/git/GitChanges.module.css`
  - `apps/web/src/components/settings/ProxyModal.jsx` → 本地候选：`src/components/settings/ProxyModal.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/activeAgents.js` → 无直接路径匹配
  - `apps/web/src/utils/sdkTaskTracker.js` → 无直接路径匹配
  - `apps/web/test/active-agents-bar.test.js` → 无直接路径匹配
  - `apps/web/test/activeAgents.test.js` → 无直接路径匹配
  - `apps/web/test/chat-active-agents-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdkTaskTracker.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/attach-buffer.js` → 无直接路径匹配
  - `packages/app/server/lib/wire-compress.js` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/test/events-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/events-v3-cold-backpressure.test.js` → 无直接路径匹配
  - `packages/app/test/sse-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/wire-compress.test.js` → 无直接路径匹配
  - `packages/app/test/ws-mux-backpressure.test.js` → 无直接路径匹配

<a id="commit-975313773a"></a>
## [975313773a](https://github.com/weiesky/cc-viewer/commit/975313773a2edfcd0f8f640cdfe4c1681048f954) — feat(web): 重构 --sdk 活跃 SubAgent/Teammate 浮条为可折叠卡片列表
- 2026-11-20 B4.3：用户选择AppServer评估；活跃卡实际diff/最终组件/CSS已读，真实0.169.0本机合成stdio/计划/中断/恢复验证通过。尚未生产切换或验证子Agent生命周期，见[评估方案](./B4-appserver-proposal.md)。
- B0 本地关键代码对照：上游把 SDK 活跃代理头像过滤条改为可折叠状态卡，移除点击过滤并在重连保留工具与耗时；本地 appserver-bridge.js 追踪子线程，但未证实等效 UI。需以真实 Codex 代理生命周期和同名隔离适配，归 B2/B4。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-975313773a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-975313773a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-975313773a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T05:01:21+08:00；作者时间：2026-11-16T05:01:21+08:00；父提交：5fc4c75229。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（14 个）：
  - `.changeset/active-agents-card.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ActiveAgentsBar.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/ActiveAgentsBar.module.css` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/activeAgents.js` → 无直接路径匹配
  - `apps/web/src/utils/sdkTaskTracker.js` → 无直接路径匹配
  - `apps/web/test/active-agents-bar.test.js` → 无直接路径匹配
  - `apps/web/test/activeAgents.test.js` → 无直接路径匹配
  - `apps/web/test/chat-active-agents-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdkTaskTracker.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-5fc4c75229"></a>
## [5fc4c75229](https://github.com/weiesky/cc-viewer/commit/5fc4c752297c7df9f581c913aa2a1852a0b27a38) — style(web): 统一 Git 变更 / 文件浏览器刷新按钮样式
- B0 本地关键代码对照：上游 Git 和文件树刷新按钮统一样式并等待手动刷新完成动画；本地 GitChanges.jsx、FileExplorer.jsx 有刷新入口，需测试异步成功/失败及重复点击，归 B5。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-5fc4c75229)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5fc4c75229)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5fc4c75229)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T03:50:52+08:00；作者时间：2026-11-16T03:50:52+08:00；父提交：add350bc52。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（5 个）：
  - `.changeset/unify-refresh-button-style.md` → 无直接路径匹配
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/components/git/GitChanges.module.css` → 本地候选：`src/components/git/GitChanges.module.css`

<a id="commit-add350bc52"></a>
## [add350bc52](https://github.com/weiesky/cc-viewer/commit/add350bc526ad9352dc1a715dee8c7d3909dc9ee) — fix(web): hide Teammate role in proxy hot-switch under SDK mode
- B0 本地关键代码对照：上游 SDK 隐藏 proxy teammate 角色；本地 proxy 角色支持与 Codex SDK 不同，须按实际可用角色与移动/桌面展示判定，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-add350bc52)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-add350bc52)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-add350bc52)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T03:40:01+08:00；作者时间：2026-11-16T03:40:01+08:00；父提交：bde0244333。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（6 个）：
  - `.changeset/sdk-hide-teammate-role.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/settings/ProxyModal.jsx` → 本地候选：`src/components/settings/ProxyModal.jsx`
  - `history.md` → 无直接路径匹配

- 2026-11-21 B4 E57：本笔实际运行时子项的阅读边界/本地复用/后续工作包归属见[B4.60](./B4-implementation.md#b460-e57-混合候选的生命周期与输入代理自动化边界源码审计无运行时变动)及[B4混合scope回执](./B4-mixed-scope-audit-2026-11-21.json)。无运行时改动，不将B7/B8/B9及其他混合子项整体勾选。

<a id="commit-bde0244333"></a>
## [bde0244333](https://github.com/weiesky/cc-viewer/commit/bde0244333a14245e5889deafca622cdb97bbff9) — fix(server): WS-mux cold-load backpressure stall (1011 queue-overflow blank chat)
- 2026-11-20 B3：`4a7a8e7`迁入最终credit-based pump；100ms、4MB预算、双时钟stall、control bypass、drain语义保留，48/48服务器/背压通过；`c31b20b`真实路由复用现有SSE生产者。物理慢网/完整进程崩溃未覆盖。详见[B3第二轮](./B3-transport-and-pagination.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-bde0244333)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-bde0244333)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-16T03:24:03+08:00；作者时间：2026-11-16T03:24:03+08:00；父提交：00fdfade79。
- B0 本地关键代码对照：现有能力、协议差异和待测项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（11 个）：
  - `.changeset/ws-mux-backpressure-fix.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/attach-buffer.js` → 无直接路径匹配
  - `packages/app/server/lib/wire-compress.js` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/test/events-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/events-v3-cold-backpressure.test.js` → 无直接路径匹配
  - `packages/app/test/sse-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/wire-compress.test.js` → 无直接路径匹配
  - `packages/app/test/ws-mux-backpressure.test.js` → 无直接路径匹配

<a id="commit-00fdfade79"></a>
## [00fdfade79](https://github.com/weiesky/cc-viewer/commit/00fdfade7948cd895e2f714f71626f2f9e3678bd) — chore: release 1.9.27
- [B0 upstream full commit message](./B0-upstream-messages.md#message-00fdfade79)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-00fdfade79)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-15T15:40:52+08:00；作者时间：2026-11-15T15:40:52+08:00；父提交：24c4f60b54。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**I / 权限与交互问答**；状态：待人工核验。
- 处理建议：核对 Codex 原生审批和用户输入；变更默认权限须独立决策。
- 上游改动路径（4 个）：
  - `.changeset/approval-modal-auto-close.md` → 无直接路径匹配
  - `.changeset/git-changes-drag-drop.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-24c4f60b54"></a>
## [24c4f60b54](https://github.com/weiesky/cc-viewer/commit/24c4f60b5480aefa9b26d635d68700f5de5f4ffe) — Merge pull request #174 from weiesky/feat/git-changes-drag-drop
- [B0 upstream full commit message](./B0-upstream-messages.md#message-24c4f60b54)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-24c4f60b54)

- B0 血缘：相对第一父分支引入窗口内 2 条可达提交：[a2f5cd4b43](#commit-a2f5cd4b43), [dd8709356b](#commit-dd8709356b)。合并与分支变更不得重复计算。

- 提交时间：2026-11-15T15:39:51+08:00；作者时间：2026-11-15T15:39:51+08:00；父提交：0ff3154822, a2f5cd4b43。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（14 个）：
  - `.changeset/approval-modal-auto-close.md` → 无直接路径匹配
  - `.changeset/git-changes-drag-drop.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/askFlowController.js` → 本地候选：`src/components/chat/controllers/askFlowController.js`
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/components/git/GitChanges.module.css` → 本地候选：`src/components/git/GitChanges.module.css`
  - `apps/web/src/utils/gitWorkspacePath.js` → 无直接路径匹配
  - `apps/web/test/ask-flow-controller.test.js` → 本地候选：`tests/ask-flow-controller.test.js`
  - `apps/web/test/file-drag-drop.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配

<a id="commit-a2f5cd4b43"></a>
## [a2f5cd4b43](https://github.com/weiesky/cc-viewer/commit/a2f5cd4b43fa8f8003e60774b5c71160e6de509e) — feat(web): drag git changes (files, folders, commits) into chat or terminal
- B0 本地关键代码对照：上游把 Git 文件、目录、提交拖入聊天/终端；本地 GitChanges.jsx 有展示与点击，文件树内部拖拽用于移动。需分别验证 commit 标识与工作区路径、特殊字符、不可用项目和安全粘贴，归 B5/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a2f5cd4b43)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a2f5cd4b43)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a2f5cd4b43)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-15T10:59:16+08:00；作者时间：2026-11-15T10:59:16+08:00；父提交：dd8709356b。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（7 个）：
  - `.changeset/git-changes-drag-drop.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/components/git/GitChanges.module.css` → 本地候选：`src/components/git/GitChanges.module.css`
  - `apps/web/src/utils/gitWorkspacePath.js` → 无直接路径匹配
  - `apps/web/test/file-drag-drop.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-dd8709356b"></a>
## [dd8709356b](https://github.com/weiesky/cc-viewer/commit/dd8709356b27c7ce3321269fc68466f051c613bf) — fix(web+server): close approval modal after server-side auto-advance
- B0 本地关键代码对照：上游解决同 tick pending/resolved 在 React 批处理下 modal 残留，并按 ID 路由终态；本地 ChatView.jsx 与 askFlowController.js 有 pendingAsk，需测试同时抵达、跨视图和重复终态，归 B3/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-dd8709356b)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-dd8709356b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-dd8709356b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-13T17:40:24+08:00；作者时间：2026-11-13T17:40:24+08:00；父提交：0ff3154822。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（9 个）：
  - `.changeset/approval-modal-auto-close.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/askFlowController.js` → 本地候选：`src/components/chat/controllers/askFlowController.js`
  - `apps/web/test/ask-flow-controller.test.js` → 本地候选：`tests/ask-flow-controller.test.js`
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配

<a id="commit-0ff3154822"></a>
## [0ff3154822](https://github.com/weiesky/cc-viewer/commit/0ff31548221e65e3317c6ba132568ae98846d90e) — Merge pull request #173 from weiesky/release/1.9.26
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0ff3154822)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0ff3154822)

- B0 血缘：相对第一父分支引入窗口内 6 条可达提交：[23e4273a37](#commit-23e4273a37), [187583787d](#commit-187583787d), [ec14cd0234](#commit-ec14cd0234), [18bd742bc5](#commit-18bd742bc5), [20313b254c](#commit-20313b254c), [919fded845](#commit-919fded845)。合并与分支变更不得重复计算。

- 提交时间：2026-11-13T15:28:28+08:00；作者时间：2026-11-13T15:28:28+08:00；父提交：84373dff25, 23e4273a37。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（98 个）：
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/ptyPromptController.js` → 本地候选：`src/components/chat/controllers/ptyPromptController.js`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/dashboard/SdkContextUsageProvider.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalWsContext.jsx` → 本地候选：`src/components/terminal/TerminalWsContext.jsx`
  - `apps/web/src/components/terminal/UltraPlanModal.jsx` → 本地候选：`src/components/terminal/UltraPlanModal.jsx`
  - `apps/web/src/components/terminal/UltraplanPanel.jsx` → 本地候选：`src/components/terminal/UltraplanPanel.jsx`
  - `apps/web/src/components/viewers/ArchivePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/AudioPreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/AudioPreview.module.css` → 无直接路径匹配
  - `apps/web/src/components/viewers/SubtitlePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/SubtitlePreview.module.css` → 无直接路径匹配
  - `apps/web/src/components/viewers/UnsupportedFilePreview.jsx` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/autoApproveOptions.js` → 本地候选：`src/utils/autoApproveOptions.js`
  - `apps/web/src/utils/commandValidator.js` → 本地候选：`src/utils/commandValidator.js`
  - `apps/web/src/utils/contextUsageView.js` → 无直接路径匹配
  - `apps/web/src/utils/fileIcons.jsx` → 本地候选：`src/utils/fileIcons.jsx`
  - `apps/web/src/utils/fileTypes.js` → 无直接路径匹配
  - `apps/web/src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `apps/web/src/utils/previewKind.js` → 无直接路径匹配
  - `apps/web/src/utils/subtitleParser.js` → 无直接路径匹配
  - `apps/web/src/utils/userImageRefs.js` → 本地候选：`src/utils/userImageRefs.js`
  - `apps/web/src/vendor/archive/README.md` → 无直接路径匹配
  - `apps/web/src/vendor/archive/util.js` → 无直接路径匹配
  - `apps/web/test/archive-preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/archive-preview.test.js` → 无直接路径匹配
  - `apps/web/test/ask-auto-answer-menu.test.js` → 无直接路径匹配
  - `apps/web/test/audio-preview.test.js` → 无直接路径匹配
  - `apps/web/test/auto-approve-options.test.js` → 无直接路径匹配
  - `apps/web/test/commandValidator.test.js` → 无直接路径匹配
  - `apps/web/test/context-usage-view.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-types.test.js` → 无直接路径匹配
  - `apps/web/test/full-auto-approve-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/helpers-unit-a.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/preview-kind.test.js` → 无直接路径匹配
  - `apps/web/test/preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-provider.test.js` → 无直接路径匹配
  - `apps/web/test/slow-upstream-lifecycle.test.js` → 无直接路径匹配
  - `apps/web/test/subtitle-parser.test.js` → 无直接路径匹配
  - `apps/web/test/subtitle-preview.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-ws-watchdog.test.js` → 无直接路径匹配
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/lib/approval-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/ask/perm-request-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/audio-stream.js` → 无直接路径匹配
  - `packages/app/server/lib/auto-approve.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/terminal-ws-ping.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `packages/app/test/api-audio-stream.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-target-files.test.js` → 无直接路径匹配
  - `packages/app/test/audio-stream.test.js` → 无直接路径匹配
  - `packages/app/test/auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-slow-upstream.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/server-terminal-ws-ping.test.js` → 无直接路径匹配
  - `packages/app/test/slow-upstream-replay.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-23e4273a37"></a>
## [23e4273a37](https://github.com/weiesky/cc-viewer/commit/23e4273a37eefaa6e32e91503ecc65a7aeb9c362) — chore: release 1.9.26
- [B0 upstream full commit message](./B0-upstream-messages.md#message-23e4273a37)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-23e4273a37)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-13T15:27:47+08:00；作者时间：2026-11-13T15:27:47+08:00；父提交：187583787d。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（7 个）：
  - `.changeset/audio-preview.md` → 无直接路径匹配
  - `.changeset/full-auto-approve.md` → 无直接路径匹配
  - `.changeset/sdk-context-bar-freeze.md` → 无直接路径匹配
  - `.changeset/slow-upstream-disconnect.md` → 无直接路径匹配
  - `.changeset/subtitle-image-preview.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-187583787d"></a>
## [187583787d](https://github.com/weiesky/cc-viewer/commit/187583787d8b87cbbb558a601ae1e963bbcc21a0) — feat(web+server): add "full auto-approve" (-2) permission tier lifting the npm-publish hard gate
- [B0 upstream full commit message](./B0-upstream-messages.md#message-187583787d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-187583787d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-13T15:10:23+08:00；作者时间：2026-11-13T15:10:23+08:00；父提交：ec14cd0234。
- B0 本地关键代码对照：现有能力、协议差异和待测项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（50 个）：
  - `.changeset/full-auto-approve.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/ptyPromptController.js` → 本地候选：`src/components/chat/controllers/ptyPromptController.js`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/autoApproveOptions.js` → 本地候选：`src/utils/autoApproveOptions.js`
  - `apps/web/src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `apps/web/test/ask-auto-answer-menu.test.js` → 无直接路径匹配
  - `apps/web/test/auto-approve-options.test.js` → 无直接路径匹配
  - `apps/web/test/full-auto-approve-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/helpers-unit-a.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/approval-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/ask/perm-request-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/auto-approve.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `packages/app/test/auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配

- 2026-11-21 B4 E57：本笔实际运行时子项的阅读边界/本地复用/后续工作包归属见[B4.60](./B4-implementation.md#b460-e57-混合候选的生命周期与输入代理自动化边界源码审计无运行时变动)及[B4混合scope回执](./B4-mixed-scope-audit-2026-11-21.json)。无运行时改动，不将B7/B8/B9及其他混合子项整体勾选。

<a id="commit-ec14cd0234"></a>
## [ec14cd0234](https://github.com/weiesky/cc-viewer/commit/ec14cd02346074fa3e81032cbf304564dc7e334b) — fix(sdk+web): blood bar (context usage) freeze — keepalive, watchdog, fetch deadline, ts self-heal
- 2026-11-21 B4 E60：已选原Context分类入口/居中不可用态，Codex无真实分类producer、现有用量条保持；相关Provider/fetch/timer/palette不新增空实现。55组件+7用量/1579完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过；GUI待、其他混合范围不整体勾选。具体源码阅读/适配边界见[B4.63](./B4-implementation.md)及[B4分类回执](./B4-context-unavailable-2026-11-21.json)。
- 2026-11-19 B2部分实施：本地`07caca3`完成terminal应用心跳、拨号/静默期限、前台宽限、旧连接隔离及失败发送保留原文；后端17/17、组件fixture4/4，全量1262/1262、0 skip、构建通过。GUI未验收，上下文fetch/ts仍待B8核对，不标整条完成。
- B0 本地关键代码对照：上游 terminal WS ping、客户端 idle watchdog、拨号/上下文请求期限、时间戳修复与发送文本保留；本地 TerminalWsContext.jsx 有重连定时，appserver 捕获上下文。需测试半开、睡眠、重放、未来时间戳和用户输入不丢，归 B2/B3/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-ec14cd0234)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ec14cd0234)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ec14cd0234)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-13T11:37:24+08:00；作者时间：2026-11-13T11:37:10+08:00；父提交：18bd742bc5。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（13 个）：
  - `.changeset/sdk-context-bar-freeze.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/dashboard/SdkContextUsageProvider.jsx` → 无直接路径匹配
  - `apps/web/src/components/terminal/TerminalWsContext.jsx` → 本地候选：`src/components/terminal/TerminalWsContext.jsx`
  - `apps/web/src/utils/contextUsageView.js` → 无直接路径匹配
  - `apps/web/test/context-usage-view.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-provider.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-ws-watchdog.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/terminal-ws-ping.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/server-terminal-ws-ping.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-18bd742bc5"></a>
## [18bd742bc5](https://github.com/weiesky/cc-viewer/commit/18bd742bc50d38ce52abf9f8df89930c49b50807) — feat: add subtitle preview and extend image preview formats
- B0 本地关键代码对照：上游新增 SRT/VTT/ASS/SSA 有界纯文本预览、编码回退修复及图片格式分类；本地 FileContentView.jsx 为代码/Markdown，需先评估安全预览和原始字节接口，测试 1MiB、cue 上限、非 UTF8 与下载 MIME，归 B6。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-18bd742bc5)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-18bd742bc5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-18bd742bc5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-13T05:19:14+08:00；作者时间：2026-11-13T05:19:14+08:00；父提交：20313b254c。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（31 个）：
  - `.changeset/subtitle-image-preview.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/UltraPlanModal.jsx` → 本地候选：`src/components/terminal/UltraPlanModal.jsx`
  - `apps/web/src/components/terminal/UltraplanPanel.jsx` → 本地候选：`src/components/terminal/UltraplanPanel.jsx`
  - `apps/web/src/components/viewers/ArchivePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/SubtitlePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/SubtitlePreview.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/commandValidator.js` → 本地候选：`src/utils/commandValidator.js`
  - `apps/web/src/utils/fileIcons.jsx` → 本地候选：`src/utils/fileIcons.jsx`
  - `apps/web/src/utils/fileTypes.js` → 无直接路径匹配
  - `apps/web/src/utils/previewKind.js` → 无直接路径匹配
  - `apps/web/src/utils/subtitleParser.js` → 无直接路径匹配
  - `apps/web/src/utils/userImageRefs.js` → 本地候选：`src/utils/userImageRefs.js`
  - `apps/web/src/vendor/archive/README.md` → 无直接路径匹配
  - `apps/web/src/vendor/archive/util.js` → 无直接路径匹配
  - `apps/web/test/archive-preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/archive-preview.test.js` → 无直接路径匹配
  - `apps/web/test/commandValidator.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-types.test.js` → 无直接路径匹配
  - `apps/web/test/preview-kind.test.js` → 无直接路径匹配
  - `apps/web/test/preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/subtitle-parser.test.js` → 无直接路径匹配
  - `apps/web/test/subtitle-preview.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配

<a id="commit-20313b254c"></a>
## [20313b254c](https://github.com/weiesky/cc-viewer/commit/20313b254cffff4f8fec955b74a7b5233a0620ee) — feat: add inline audio preview with streaming range support
- [B0 upstream full commit message](./B0-upstream-messages.md#message-20313b254c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-20313b254c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-13T01:24:19+08:00；作者时间：2026-11-13T01:24:19+08:00；父提交：919fded845。
- B0 本地关键代码对照：已核验上游能力及本地入口；结论和未验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（21 个）：
  - `.changeset/audio-preview.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/viewers/AudioPreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/AudioPreview.module.css` → 无直接路径匹配
  - `apps/web/src/components/viewers/UnsupportedFilePreview.jsx` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/fileTypes.js` → 无直接路径匹配
  - `apps/web/src/utils/previewKind.js` → 无直接路径匹配
  - `apps/web/test/audio-preview.test.js` → 无直接路径匹配
  - `apps/web/test/file-types.test.js` → 无直接路径匹配
  - `apps/web/test/preview-kind.test.js` → 无直接路径匹配
  - `apps/web/test/preview-wiring.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/audio-stream.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/test/api-audio-stream.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-target-files.test.js` → 无直接路径匹配
  - `packages/app/test/audio-stream.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-919fded845"></a>
## [919fded845](https://github.com/weiesky/cc-viewer/commit/919fded8456a518eb667a105b0550fd6d42cb978) — fix(sdk): settle stale slow-upstream notices
- B0 本地关键代码对照：上游在断开/重连与多 requestId 下清理慢上游提示并允许快照重放；本地 proxy.js 与 AppBase.jsx 使用不同传输，需确认通知能力及监听器回收，归 B3/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-919fded845)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-919fded845)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-919fded845)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T19:37:45+08:00；作者时间：2026-11-12T19:37:45+08:00；父提交：84373dff25。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（8 个）：
  - `.changeset/slow-upstream-disconnect.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/test/slow-upstream-lifecycle.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/proxy-slow-upstream.test.js` → 无直接路径匹配
  - `packages/app/test/slow-upstream-replay.test.js` → 无直接路径匹配

<a id="commit-84373dff25"></a>
## [84373dff25](https://github.com/weiesky/cc-viewer/commit/84373dff25223aad027199a404e9cd08c0734cce) — Merge pull request #172 from weiesky/chore/release-1.9.25
- [B0 upstream full commit message](./B0-upstream-messages.md#message-84373dff25)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-84373dff25)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[c30ca279bd](#commit-c30ca279bd)。合并与分支变更不得重复计算。

- 提交时间：2026-11-12T15:19:58+08:00；作者时间：2026-11-12T15:19:58+08:00；父提交：5a7904990b, c30ca279bd。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（3 个）：
  - `.changeset/warm-eagles-update.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-c30ca279bd"></a>
## [c30ca279bd](https://github.com/weiesky/cc-viewer/commit/c30ca279bd37e2a10e4a6dd5a00ae4199515a204) — chore: release 1.9.25
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c30ca279bd)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c30ca279bd)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T15:10:08+08:00；作者时间：2026-11-12T15:10:08+08:00；父提交：5a7904990b。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（3 个）：
  - `.changeset/warm-eagles-update.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-5a7904990b"></a>
## [5a7904990b](https://github.com/weiesky/cc-viewer/commit/5a7904990b61c0c750c41460a216498ddb67dc22) — Merge pull request #171 from weiesky/feat/guided-npm-updates
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5a7904990b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5a7904990b)

- B0 血缘：相对第一父分支引入窗口内 2 条可达提交：[17ba9be7b5](#commit-17ba9be7b5), [6e3c93cd7c](#commit-6e3c93cd7c)。合并与分支变更不得重复计算。

- 提交时间：2026-11-12T14:54:03+08:00；作者时间：2026-11-12T14:54:03+08:00；父提交：6dd3b3b7e5, 17ba9be7b5。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（30 个）：
  - `.changeset/warm-eagles-update.md` → 无直接路径匹配
  - `apps/electron/electron/main.js` → 本地候选：`electron/main.js`
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/update/UpdateModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/update/UpdateModal.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/updateProgress.js` → 无直接路径匹配
  - `apps/web/test/sse-connection-gen.test.js` → 无直接路径匹配
  - `apps/web/test/update-modal.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/restart-helper.js` → 无直接路径匹配
  - `packages/app/server/lib/restart.js` → 无直接路径匹配
  - `packages/app/server/lib/update-instances.js` → 无直接路径匹配
  - `packages/app/server/lib/update-job.js` → 无直接路径匹配
  - `packages/app/server/lib/updater.js` → 本地候选：`lib/updater.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/project-meta.js` → 无直接路径匹配
  - `packages/app/server/routes/update.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/branch-lib-updater.test.js` → 无直接路径匹配
  - `packages/app/test/install-method.test.js` → 无直接路径匹配
  - `packages/app/test/restart-helper.test.js` → 无直接路径匹配
  - `packages/app/test/update-instances.test.js` → 无直接路径匹配
  - `packages/app/test/update-job.test.js` → 无直接路径匹配
  - `packages/app/test/update-routes.test.js` → 无直接路径匹配
  - `packages/app/test/updater-pnpm.test.js` → 无直接路径匹配
  - `packages/app/test/updater.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-17ba9be7b5"></a>
## [17ba9be7b5](https://github.com/weiesky/cc-viewer/commit/17ba9be7b5f4cceb9c5c9371683b05fb258220c7) — fix: harden guided updates and restart recovery
- B0 本地关键代码对照：上游 guided update 覆盖进程恢复、restart helper 与 UI，实际改多个包；本地 lib/updater.js 具有 npm 更新但未见同名 UI。须隔离安装验证执行方式、失败恢复、活动实例和用户数据，归 B10/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-17ba9be7b5)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-17ba9be7b5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-17ba9be7b5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T14:16:08+08:00；作者时间：2026-11-12T14:16:08+08:00；父提交：6e3c93cd7c。
- 初筛批次：**K / 终端与跨平台**；状态：待人工核验。
- 处理建议：检查现有 PTY/Electron/移动端链路；按平台复现，不直接复制 Claude 启动逻辑。
- 上游改动路径（24 个）：
  - `apps/electron/electron/main.js` → 本地候选：`electron/main.js`
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/update/UpdateModal.jsx` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/updateProgress.js` → 无直接路径匹配
  - `apps/web/test/update-modal.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/restart-helper.js` → 无直接路径匹配
  - `packages/app/server/lib/restart.js` → 无直接路径匹配
  - `packages/app/server/lib/update-instances.js` → 无直接路径匹配
  - `packages/app/server/lib/update-job.js` → 无直接路径匹配
  - `packages/app/server/lib/updater.js` → 本地候选：`lib/updater.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/project-meta.js` → 无直接路径匹配
  - `packages/app/server/routes/update.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/install-method.test.js` → 无直接路径匹配
  - `packages/app/test/restart-helper.test.js` → 无直接路径匹配
  - `packages/app/test/update-instances.test.js` → 无直接路径匹配
  - `packages/app/test/update-job.test.js` → 无直接路径匹配
  - `packages/app/test/update-routes.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-6e3c93cd7c"></a>
## [6e3c93cd7c](https://github.com/weiesky/cc-viewer/commit/6e3c93cd7ca52fc096df431957b3df7724f06605) — feat: add guided npm updates with restart
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6e3c93cd7c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6e3c93cd7c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T10:28:17+08:00；作者时间：2026-11-12T05:37:55+08:00；父提交：6dd3b3b7e5。
- B0 本地关键代码对照：现有能力与协议/部署待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（25 个）：
  - `.changeset/warm-eagles-update.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/update/UpdateModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/update/UpdateModal.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/test/sse-connection-gen.test.js` → 无直接路径匹配
  - `apps/web/test/update-modal.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/restart-helper.js` → 无直接路径匹配
  - `packages/app/server/lib/restart.js` → 无直接路径匹配
  - `packages/app/server/lib/update-job.js` → 无直接路径匹配
  - `packages/app/server/lib/updater.js` → 本地候选：`lib/updater.js`
  - `packages/app/server/routes/project-meta.js` → 无直接路径匹配
  - `packages/app/server/routes/update.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/branch-lib-updater.test.js` → 无直接路径匹配
  - `packages/app/test/install-method.test.js` → 无直接路径匹配
  - `packages/app/test/restart-helper.test.js` → 无直接路径匹配
  - `packages/app/test/update-job.test.js` → 无直接路径匹配
  - `packages/app/test/update-routes.test.js` → 无直接路径匹配
  - `packages/app/test/updater-pnpm.test.js` → 无直接路径匹配
  - `packages/app/test/updater.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-6dd3b3b7e5"></a>
## [6dd3b3b7e5](https://github.com/weiesky/cc-viewer/commit/6dd3b3b7e55acce07fb558cd27ca7e55de5d0647) — chore: release 1.9.24
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6dd3b3b7e5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6dd3b3b7e5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T00:40:27+08:00；作者时间：2026-11-12T00:40:27+08:00；父提交：9e24827264。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（11 个）：
  - `.changeset/archive-preview.md` → 无直接路径匹配
  - `.changeset/ask-auto-answer.md` → 无直接路径匹配
  - `.changeset/file-drag-drop.md` → 无直接路径匹配
  - `.changeset/folder-drag-drop.md` → 无直接路径匹配
  - `.changeset/kimi-k3-tool-error-circuit-breaker.md` → 无直接路径匹配
  - `.changeset/preview-placeholders.md` → 无直接路径匹配
  - `.changeset/search-into-file-explorer.md` → 无直接路径匹配
  - `.changeset/system-prompt-no-autopin.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-9e24827264"></a>
## [9e24827264](https://github.com/weiesky/cc-viewer/commit/9e248272640c3165f641124502e716369e961313) — Merge pull request #170 from weiesky/feat/file-preview-foundation
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9e24827264)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9e24827264)

- B0 血缘：相对第一父分支引入窗口内 10 条可达提交：[f3db3ed9a2](#commit-f3db3ed9a2), [62012025cb](#commit-62012025cb), [f96811cddb](#commit-f96811cddb), [91a523d043](#commit-91a523d043), [beaa2e86f2](#commit-beaa2e86f2), [ea995f3883](#commit-ea995f3883), [a6b82f16df](#commit-a6b82f16df), [96f3a7a44e](#commit-96f3a7a44e), [d6ec38be82](#commit-d6ec38be82), [6081b5d01a](#commit-6081b5d01a)。合并与分支变更不得重复计算。

- 提交时间：2026-11-12T00:38:31+08:00；作者时间：2026-11-12T00:38:31+08:00；父提交：1ae82a825b, f3db3ed9a2。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（109 个）：
  - `.changeset/archive-preview.md` → 无直接路径匹配
  - `.changeset/ask-auto-answer.md` → 无直接路径匹配
  - `.changeset/file-drag-drop.md` → 无直接路径匹配
  - `.changeset/folder-drag-drop.md` → 无直接路径匹配
  - `.changeset/preview-placeholders.md` → 无直接路径匹配
  - `.changeset/search-into-file-explorer.md` → 无直接路径匹配
  - `.changeset/system-prompt-no-autopin.md` → 无直接路径匹配
  - `.github/workflows/ci.yml` → 无直接路径匹配
  - `LICENSE.md` → 本地候选：`LICENSE.md`
  - `README.md` → 本地候选：`README.md`
  - `apps/electron/electron-builder.yml` → 无直接路径匹配
  - `apps/electron/electron/tab-bar.html` → 本地候选：`electron/tab-bar.html`
  - `apps/electron/scripts/assemble-app.mjs` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ApprovalModal.jsx` → 本地候选：`src/components/approval/ApprovalModal.jsx`
  - `apps/web/src/components/chat/AskAutoHostCountdown.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/AskQuestionForm.jsx` → 本地候选：`src/components/chat/AskQuestionForm.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/UserPromptsModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/UserPromptsModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/chat/controllers/askFlowController.js` → 本地候选：`src/components/chat/controllers/askFlowController.js`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/quickMenuIcons.jsx` → 本地候选：`src/components/common/quickMenuIcons.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `apps/web/src/components/search/SearchPanel.jsx` → 本地候选：`src/components/search/SearchPanel.jsx`
  - `apps/web/src/components/search/SearchPanel.module.css` → 本地候选：`src/components/search/SearchPanel.module.css`
  - `apps/web/src/components/settings/PreferencesForm.jsx` → 本地候选：`src/components/settings/PreferencesForm.jsx`
  - `apps/web/src/components/terminal/ScratchTerminal.jsx` → 本地候选：`src/components/terminal/ScratchTerminal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.module.css` → 本地候选：`src/components/terminal/TerminalPanel.module.css`
  - `apps/web/src/components/viewers/ArchivePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/ArchivePreview.module.css` → 无直接路径匹配
  - `apps/web/src/components/viewers/UnsupportedFilePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/UnsupportedFilePreview.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/archivePreview.js` → 无直接路径匹配
  - `apps/web/src/utils/autoApproveOptions.js` → 本地候选：`src/utils/autoApproveOptions.js`
  - `apps/web/src/utils/commandValidator.js` → 本地候选：`src/utils/commandValidator.js`
  - `apps/web/src/utils/deadlineCountdown.js` → 无直接路径匹配
  - `apps/web/src/utils/fileDragDrop.js` → 无直接路径匹配
  - `apps/web/src/utils/fileOpen.js` → 本地候选：`src/utils/fileOpen.js`
  - `apps/web/src/utils/fileTypes.js` → 无直接路径匹配
  - `apps/web/src/utils/previewKind.js` → 无直接路径匹配
  - `apps/web/src/utils/promptSegments.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/LICENSE` → 无直接路径匹配
  - `apps/web/src/vendor/archive/README.md` → 无直接路径匹配
  - `apps/web/src/vendor/archive/detect.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/gzip.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/index.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/inflate.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/tar.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/util.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/zip.js` → 无直接路径匹配
  - `apps/web/test/archive-preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/archive-preview.test.js` → 无直接路径匹配
  - `apps/web/test/ask-auto-answer-menu.test.js` → 无直接路径匹配
  - `apps/web/test/ask-flow-controller.test.js` → 本地候选：`tests/ask-flow-controller.test.js`
  - `apps/web/test/auto-approve-options.test.js` → 无直接路径匹配
  - `apps/web/test/deadline-countdown.test.js` → 无直接路径匹配
  - `apps/web/test/drag-drop-zones.test.js` → 无直接路径匹配
  - `apps/web/test/external-folder-targets.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-drag-drop.test.js` → 无直接路径匹配
  - `apps/web/test/file-open.test.js` → 无直接路径匹配
  - `apps/web/test/file-types.test.js` → 无直接路径匹配
  - `apps/web/test/git-changes-open-persist.test.js` → 无直接路径匹配
  - `apps/web/test/modal-mask.test.js` → 无直接路径匹配
  - `apps/web/test/preview-kind.test.js` → 无直接路径匹配
  - `apps/web/test/preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/search-into-file-explorer.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/i18n.js` → 无直接路径匹配
  - `packages/app/server/lib/ask-auto-answer.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-reaper.js` → 无直接路径匹配
  - `packages/app/server/lib/auto-approve.js` → 无直接路径匹配
  - `packages/app/server/lib/binary-sniff.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-target-files.test.js` → 无直接路径匹配
  - `packages/app/test/ask-auto-answer.test.js` → 无直接路径匹配
  - `packages/app/test/binary-sniff.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/route-dispatch.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/server-ws-branches.test.js` → 无直接路径匹配
  - `packages/core/src/ask-auto-answer.js` → 无直接路径匹配
  - `packages/core/test/approval-modal-prefs.test.js` → 无直接路径匹配
  - `packages/core/test/ask-auto-answer.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-f3db3ed9a2"></a>
## [f3db3ed9a2](https://github.com/weiesky/cc-viewer/commit/f3db3ed9a217cbe3f1dead56582b90f45059507c) — ci: avoid installing zsh for mocked shell tests
- B0 本地关键代码对照：上游移除只供模拟 shell 测试使用的 zsh 安装；本地 CI 布局不同，需区分模拟与真实跨平台 shell 测试，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-f3db3ed9a2)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-f3db3ed9a2)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-f3db3ed9a2)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T00:35:20+08:00；作者时间：2026-11-12T00:35:20+08:00；父提交：62012025cb。
- 初筛批次：**K / 终端与跨平台**；状态：待人工核验。
- 处理建议：检查现有 PTY/Electron/移动端链路；按平台复现，不直接复制 Claude 启动逻辑。
- 上游改动路径（1 个）：
  - `.github/workflows/ci.yml` → 无直接路径匹配

<a id="commit-62012025cb"></a>
## [62012025cb](https://github.com/weiesky/cc-viewer/commit/62012025cb91ac3d18c54dcddd623c2cdd06a9f1) — ci: retry bounded zsh installation
- B0 本地关键代码对照：上游 CI zsh 安装增加重试，下一提交 f3db3ed9a2 改为 mock 测试无需安装；本地 .github/workflows 无上游 ci.yml，不复制中间状态，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-62012025cb)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-62012025cb)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-62012025cb)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T00:25:16+08:00；作者时间：2026-11-12T00:25:16+08:00；父提交：f96811cddb。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（1 个）：
  - `.github/workflows/ci.yml` → 无直接路径匹配

<a id="commit-f96811cddb"></a>
## [f96811cddb](https://github.com/weiesky/cc-viewer/commit/f96811cddb3f1f5516ef7823bcc2a36d142a95e3) — feat: unify file preview routing and binary guards
- B0 本地关键代码对照：上游统一各入口文件预览路由和二进制保护；本地 FileContentView.jsx 有 Markdown/代码编辑器，lib/file-api.js 有文件读取校验。逐类验证编码、体积、二进制和目标文件越界，归 B5/B6。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-f96811cddb)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-f96811cddb)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-f96811cddb)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-12T00:08:33+08:00；作者时间：2026-11-12T00:08:33+08:00；父提交：91a523d043。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（26 个）：
  - `.changeset/preview-placeholders.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/viewers/UnsupportedFilePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/UnsupportedFilePreview.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/archivePreview.js` → 无直接路径匹配
  - `apps/web/src/utils/commandValidator.js` → 本地候选：`src/utils/commandValidator.js`
  - `apps/web/src/utils/fileOpen.js` → 本地候选：`src/utils/fileOpen.js`
  - `apps/web/src/utils/fileTypes.js` → 无直接路径匹配
  - `apps/web/src/utils/previewKind.js` → 无直接路径匹配
  - `apps/web/test/archive-preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/external-folder-targets.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-open.test.js` → 无直接路径匹配
  - `apps/web/test/file-types.test.js` → 无直接路径匹配
  - `apps/web/test/preview-kind.test.js` → 无直接路径匹配
  - `apps/web/test/preview-wiring.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/binary-sniff.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/binary-sniff.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-91a523d043"></a>
## [91a523d043](https://github.com/weiesky/cc-viewer/commit/91a523d043dbc27bd404f1cd911d2cc588847b8b) — feat: add cross-platform archive preview
- [B0 upstream full commit message](./B0-upstream-messages.md#message-91a523d043)
- B0 status: Pending B6 audit: log archive support is not general file archive preview.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-91a523d043)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T22:29:39+08:00；作者时间：2026-11-11T22:29:39+08:00；父提交：beaa2e86f2。
- B0 本地代码对照：已核验关键入口和上游目标；结论及尚需测试事项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（28 个）：
  - `.changeset/archive-preview.md` → 无直接路径匹配
  - `LICENSE.md` → 本地候选：`LICENSE.md`
  - `apps/electron/electron-builder.yml` → 无直接路径匹配
  - `apps/electron/scripts/assemble-app.mjs` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/viewers/ArchivePreview.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/ArchivePreview.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/archivePreview.js` → 无直接路径匹配
  - `apps/web/src/utils/fileTypes.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/LICENSE` → 无直接路径匹配
  - `apps/web/src/vendor/archive/README.md` → 无直接路径匹配
  - `apps/web/src/vendor/archive/detect.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/gzip.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/index.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/inflate.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/tar.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/util.js` → 无直接路径匹配
  - `apps/web/src/vendor/archive/zip.js` → 无直接路径匹配
  - `apps/web/test/archive-preview-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/archive-preview.test.js` → 无直接路径匹配
  - `apps/web/test/file-types.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-target-files.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/route-dispatch.test.js` → 无直接路径匹配

<a id="commit-beaa2e86f2"></a>
## [beaa2e86f2](https://github.com/weiesky/cc-viewer/commit/beaa2e86f2dfa451a2044348c6c14fa874419e6f) — feat(web): support dragging folders into terminal and chat
- B0 本地关键代码对照：上游在文件拖入基础上增加目录；本地 FileExplorer.jsx 内部移动和 onAttachToChat 不等价拖入终端。验证目录语义、路径边界、键盘替代和拒绝跨项目，归 B5/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-beaa2e86f2)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-beaa2e86f2)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-beaa2e86f2)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T19:27:40+08:00；作者时间：2026-11-11T19:27:40+08:00；父提交：ea995f3883。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（8 个）：
  - `.changeset/folder-drag-drop.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/utils/fileDragDrop.js` → 无直接路径匹配
  - `apps/web/test/file-drag-drop.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-ea995f3883"></a>
## [ea995f3883](https://github.com/weiesky/cc-viewer/commit/ea995f38833b20201b47ebd2c13ec5e54e24aa95) — feat(web): drag files into terminal or chat
- B0 本地关键代码对照：本地 FileExplorer.jsx 的内部拖拽用于移动文件，AppBase.jsx 有外部上传；上游从文件树拖入聊天/终端插入路径。须区分 move、上传和路径引用并处理空格及换行，归 B5/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-ea995f3883)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ea995f3883)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ea995f3883)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T19:06:26+08:00；作者时间：2026-11-11T19:06:26+08:00；父提交：a6b82f16df。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（13 个）：
  - `.changeset/file-drag-drop.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/terminal/ScratchTerminal.jsx` → 本地候选：`src/components/terminal/ScratchTerminal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.module.css` → 本地候选：`src/components/terminal/TerminalPanel.module.css`
  - `apps/web/src/utils/fileDragDrop.js` → 无直接路径匹配
  - `apps/web/test/drag-drop-zones.test.js` → 无直接路径匹配
  - `apps/web/test/file-drag-drop.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-a6b82f16df"></a>
## [a6b82f16df](https://github.com/weiesky/cc-viewer/commit/a6b82f16dff7991670ca8bdf3f01c6ae6f0d5d4b) — feat(web): 文件搜索并入文件浏览器面板并重排搜索控件
- B0 本地关键代码对照：上游将搜索嵌入文件浏览器、重排筛选、持久化及拖拽比例；本地 FileExplorer.jsx 与 SearchPanel.jsx 独立。须保留替换授权、搜索输入、状态及拖拽焦点，归 B5/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a6b82f16df)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a6b82f16df)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a6b82f16df)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T16:53:06+08:00；作者时间：2026-11-11T16:53:06+08:00；父提交：96f3a7a44e。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（11 个）：
  - `.changeset/search-into-file-explorer.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `apps/web/src/components/search/SearchPanel.jsx` → 本地候选：`src/components/search/SearchPanel.jsx`
  - `apps/web/src/components/search/SearchPanel.module.css` → 本地候选：`src/components/search/SearchPanel.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/test/git-changes-open-persist.test.js` → 无直接路径匹配
  - `apps/web/test/search-into-file-explorer.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-96f3a7a44e"></a>
## [96f3a7a44e](https://github.com/weiesky/cc-viewer/commit/96f3a7a44e014192000378b974ea757f194d08e9) — feat(chat): move user-prompts entry from hamburger menu to prompt-nav "more"
- B0 本地关键代码对照：上游将导出用户提示从菜单移动到 prompt-nav 更多，并重构共享 parser；本地 ChatView.jsx 有 promptNav，AppHeader.jsx 有相关入口。需核对导出/视图功能、入口发现性及移动端，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-96f3a7a44e)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-96f3a7a44e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-96f3a7a44e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T11:53:21+08:00；作者时间：2026-11-11T11:41:49+08:00；父提交：d6ec38be82。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（14 个）：
  - `.changeset/system-prompt-no-autopin.md` → 无直接路径匹配
  - `apps/electron/electron/tab-bar.html` → 本地候选：`electron/tab-bar.html`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/UserPromptsModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/UserPromptsModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/promptSegments.js` → 无直接路径匹配
  - `apps/web/test/modal-mask.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/i18n.js` → 无直接路径匹配

<a id="commit-d6ec38be82"></a>
## [d6ec38be82](https://github.com/weiesky/cc-viewer/commit/d6ec38be824f67a1528ff1ffeaa91349255dd58e) — feat(header): stop auto-pinning system-prompt entry to top navbar
- B0 本地关键代码对照：上游移除系统提示入口自动置顶，保留菜单及手动置顶；本地 AppHeader.jsx 有 SystemTextModal 与菜单，需核对实际 pin/status 逻辑和用户偏好迁移，归 B7/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-d6ec38be82)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d6ec38be82)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d6ec38be82)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T11:14:03+08:00；作者时间：2026-11-11T11:14:03+08:00；父提交：6081b5d01a。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（3 个）：
  - `.changeset/system-prompt-no-autopin.md` → 无直接路径匹配
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `history.md` → 无直接路径匹配

<a id="commit-6081b5d01a"></a>
## [6081b5d01a](https://github.com/weiesky/cc-viewer/commit/6081b5d01a1ae5a12063cfdc15959c392c5f37ba) — feat(ask): AskUserQuestion auto-answer (问答题自动托管) — server-side hosting
- B0 本地关键代码对照：上游默认关闭的服务端 Ask 自动回答可根据 Recommended 或首选项在无浏览器时提交；本地 server.js 的 offerCodexRequestUserInput 有协议超时自动处理，lib/codex-request-user-input.js 构造答案。需区分协议超时与用户授权的定时托管，验证并发抢答、取消、无选项及审计，归 B11；不能默认启用。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-6081b5d01a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6081b5d01a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6081b5d01a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T10:57:00+08:00；作者时间：2026-11-11T10:57:00+08:00；父提交：1ae82a825b。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（42 个）：
  - `.changeset/ask-auto-answer.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ApprovalModal.jsx` → 本地候选：`src/components/approval/ApprovalModal.jsx`
  - `apps/web/src/components/chat/AskAutoHostCountdown.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/AskQuestionForm.jsx` → 本地候选：`src/components/chat/AskQuestionForm.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/askFlowController.js` → 本地候选：`src/components/chat/controllers/askFlowController.js`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/quickMenuIcons.jsx` → 本地候选：`src/components/common/quickMenuIcons.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/settings/PreferencesForm.jsx` → 本地候选：`src/components/settings/PreferencesForm.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/autoApproveOptions.js` → 本地候选：`src/utils/autoApproveOptions.js`
  - `apps/web/src/utils/deadlineCountdown.js` → 无直接路径匹配
  - `apps/web/test/ask-auto-answer-menu.test.js` → 无直接路径匹配
  - `apps/web/test/ask-flow-controller.test.js` → 本地候选：`tests/ask-flow-controller.test.js`
  - `apps/web/test/auto-approve-options.test.js` → 无直接路径匹配
  - `apps/web/test/deadline-countdown.test.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/ask-auto-answer.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-reaper.js` → 无直接路径匹配
  - `packages/app/server/lib/auto-approve.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `packages/app/test/ask-auto-answer.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/server-ws-branches.test.js` → 无直接路径匹配
  - `packages/core/src/ask-auto-answer.js` → 无直接路径匹配
  - `packages/core/test/approval-modal-prefs.test.js` → 无直接路径匹配
  - `packages/core/test/ask-auto-answer.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

- 2026-11-21 B4 E57：本笔实际运行时子项的阅读边界/本地复用/后续工作包归属见[B4.60](./B4-implementation.md#b460-e57-混合候选的生命周期与输入代理自动化边界源码审计无运行时变动)及[B4混合scope回执](./B4-mixed-scope-audit-2026-11-21.json)。无运行时改动，不将B7/B8/B9及其他混合子项整体勾选。

<a id="commit-1ae82a825b"></a>
## [1ae82a825b](https://github.com/weiesky/cc-viewer/commit/1ae82a825b512a8d1fbe745e0a9a2e911f74e29f) — chore(history): archive Unreleased entries under 1.9.23
- B0 本地关键代码对照：仅整理上游 history.md 到 1.9.23，不直接复制为本地发布事实；涉及的功能提交照常审计，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-1ae82a825b)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1ae82a825b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1ae82a825b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T00:54:30+08:00；作者时间：2026-11-11T00:54:30+08:00；父提交：839f0f85ac。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（1 个）：
  - `history.md` → 无直接路径匹配

<a id="commit-839f0f85ac"></a>
## [839f0f85ac](https://github.com/weiesky/cc-viewer/commit/839f0f85ac5375ff9c06491e7ba502b905164ff6) — fix(kimi-k3): add tool-error circuit-breaker section to preset
- B0 本地关键代码对照：上游只为 Kimi 模型预设加入工具错误熔断指令，本地未见同名模板；Codex 工具错误反馈与重试规则须按现有协议评估，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-839f0f85ac)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-839f0f85ac)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-839f0f85ac)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-11T00:53:23+08:00；作者时间：2026-11-11T00:53:23+08:00；父提交：2914d6479d。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（3 个）：
  - `.changeset/kimi-k3-tool-error-circuit-breaker.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配

<a id="commit-2914d6479d"></a>
## [2914d6479d](https://github.com/weiesky/cc-viewer/commit/2914d6479d2845e0b193ba1c09aa6667c66850a6) — feat(web): quick-fill time buttons for one-time scheduled tasks (#169)
- 2026-11-20 B4.3：任务快照/HUD子项本地61c3d78/fab7d5f；活跃代理数据源已完成AppServer兼容评估，无生产切换或实际子Agent生命周期结论，见[方案与边界](./B4-appserver-proposal.md)。
- 2026-11-20 B4.2：任务HUD组件/CSS与SDK快照子项已迁入，全量1417/1417、隔离Safari刷新/切换/停止通过；其余混合子项仍待，见[B4实施](./B4-implementation.md)。
- 2026-11-20 B4.1：Codex SDK任务快照及重连子项已实施，29/29通过；尚无HUD/活跃Agent/其他混合子项结论，见[B4实施](./B4-implementation.md)。
- B0 本地关键代码对照：大型 squash 实际包含 SDK 活跃代理、任务表重连、Claude 钉钉信任对话、定时任务附件/UltraPlan、空草稿与时间快捷项；后续 975313773a 改成卡片并移除 avatar 点击过滤。分归 B4/B9/B11，不能只实现标题快捷按钮。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-2914d6479d)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2914d6479d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2914d6479d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-10T23:16:37+08:00；作者时间：2026-11-10T23:16:37+08:00；父提交：3ce8f67a1c。
- 初筛批次：**G / 定时任务**；状态：待人工核验。
- 处理建议：作为新能力评估；绑定 Codex 会话身份、权限、重启恢复及时区语义。
- 上游改动路径（66 个）：
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/components/chat/ActiveAgentsBar.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/ActiveAgentsBar.module.css` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/common/ScheduleTaskModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/ScheduleTaskModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/terminal/UltraplanPanel.jsx` → 本地候选：`src/components/terminal/UltraplanPanel.jsx`
  - `apps/web/src/components/terminal/UltraplanPanel.module.css` → 本地候选：`src/components/terminal/UltraplanPanel.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/activeAgents.js` → 无直接路径匹配
  - `apps/web/src/utils/scheduleDescription.js` → 无直接路径匹配
  - `apps/web/src/utils/sdkTaskTracker.js` → 无直接路径匹配
  - `apps/web/src/utils/ultraplanController.js` → 本地候选：`src/utils/ultraplanController.js`
  - `apps/web/src/utils/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `apps/web/test/active-agents-bar.test.js` → 无直接路径匹配
  - `apps/web/test/activeAgents.test.js` → 无直接路径匹配
  - `apps/web/test/chat-active-agents-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/schedule-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/schedule-modal-anchor.test.js` → 无直接路径匹配
  - `apps/web/test/sdkTaskTracker.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-panel-embedded.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-templates.test.js` → 无直接路径匹配
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/findcc.js` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/i18n.js` → 无直接路径匹配
  - `packages/app/server/lib/ensure-hooks.js` → 本地候选：`lib/ensure-hooks.js`
  - `packages/app/server/lib/im/im-bridge-core.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-executor.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-store.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/scheduled-tasks.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/ensure-hooks.test.js` → 本地候选：`tests/ensure-hooks.test.js`
  - `packages/app/test/findcc-gap.test.js` → 无直接路径匹配
  - `packages/app/test/im-bridge-core.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-gap.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-executor.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-routes.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-store.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-task-table.test.js` → 无直接路径匹配
  - `packages/core/src/contentFilter.js` → 本地候选：`src/utils/contentFilter.js`
  - `packages/core/src/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-3ce8f67a1c"></a>
## [3ce8f67a1c](https://github.com/weiesky/cc-viewer/commit/3ce8f67a1c51b196f78bc71d96540ad5b1b9af5e) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3ce8f67a1c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3ce8f67a1c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-09T11:28:16+00:00；作者时间：2026-11-09T11:28:16+00:00；父提交：0dfb4e13c5。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-0dfb4e13c5"></a>
## [0dfb4e13c5](https://github.com/weiesky/cc-viewer/commit/0dfb4e13c54e2f6885e7fa5d2bfb8446f8bb4817) — chore(release): 1.9.22
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0dfb4e13c5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0dfb4e13c5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-06T01:03:27+08:00；作者时间：2026-11-06T01:03:27+08:00；父提交：4391792212。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（6 个）：
  - `.changeset/base-url-cloud-deploy.md` → 无直接路径匹配
  - `.changeset/shiny-pandas-shard.md` → 无直接路径匹配
  - `.changeset/wild-geese-attach.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-4391792212"></a>
## [4391792212](https://github.com/weiesky/cc-viewer/commit/439179221296fcc2ca1beb0ffce69c13a336b56f) — review(3-commit CR): harden shard cursor/seeding + base-url parsing, dedupe shard cut resolution, translate new comments
- 2026-11-20 B3当前结论：分片后续修复已完成：持久promptCount重开、已交付窗口游标、manifest唯一切点、异步prepend归属/gate/ack、空片历史入口与附件尾部值守卫（e8ed8a7）。URL base等其他混合子项仍属B10/B11，不整条勾选。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- B0 本地关键代码对照：复审同时覆盖附件 stable-id、日志 shard cursor/重启 seed、view 切换状态及 base-url 反斜杠/C0 导致的跨域 token 风险。本地 ChatView.jsx 有附件、log-v2 有 cursor、apiUrl.js 有路径前缀；必须分别验证，不照搬上游 shard 结构，归 B3/B7/B10。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-4391792212)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-4391792212)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-4391792212)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-06T01:01:19+08:00；作者时间：2026-11-06T01:01:19+08:00；父提交：ff0fe1ba93。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（31 个）：
  - `.changeset/shiny-pandas-shard.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/test/chat-pending-images-guard.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/base-path.js` → 无直接路径匹配
  - `packages/app/server/lib/base-url.js` → 无直接路径匹配
  - `packages/app/server/lib/log-management.js` → 本地候选：`lib/log-management.js`
  - `packages/app/server/lib/v2/adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/conversation-store.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/journal.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/layout.js` → 本地候选：`lib/log-v2/layout.js`
  - `packages/app/server/lib/v2/session-select.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/shard-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/logs.js` → 无直接路径匹配
  - `packages/app/server/routes/misc.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-base-url.test.js` → 无直接路径匹配
  - `packages/app/test/auth-lib.test.js` → 无直接路径匹配
  - `packages/app/test/base-path-lib.test.js` → 无直接路径匹配
  - `packages/app/test/base-url-lib.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-mount-prefixes.test.js` → 无直接路径匹配
  - `packages/app/test/server-base-url-startup.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-mode.test.js` → 无直接路径匹配
  - `packages/app/test/v2-session-list.test.js` → 无直接路径匹配
  - `packages/app/test/v2-shard-manager.test.js` → 无直接路径匹配
  - `packages/app/test/v2-shard-routes-http.test.js` → 无直接路径匹配
  - `packages/app/test/v2-shard-routes.test.js` → 无直接路径匹配

<a id="commit-ff0fe1ba93"></a>
## [ff0fe1ba93](https://github.com/weiesky/cc-viewer/commit/ff0fe1ba93defb633823eea8e9afa3d5ad065232) — fix(web): keep pasted composer images across incoming chat updates
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ff0fe1ba93)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ff0fe1ba93)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-05T22:34:01+08:00；作者时间：2026-11-05T22:34:01+08:00；父提交：57c732d037。
- B0 本地关键代码对照：输入/渲染状态及待验收情形见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（4 个）：
  - `.changeset/wild-geese-attach.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/test/chat-pending-images-guard.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-57c732d037"></a>
## [57c732d037](https://github.com/weiesky/cc-viewer/commit/57c732d0371bc34417e75a6bd106e1a3fde90f99) — feat(server): add CCV_BASE_URL for cloud reverse-proxy deployment
- [B0 upstream full commit message](./B0-upstream-messages.md#message-57c732d037)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-57c732d037)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-05T21:41:54+08:00；作者时间：2026-11-05T21:41:54+08:00；父提交：b23c137372。
- B0 本地关键代码对照：现有能力与协议/部署待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（77 个）：
  - `.changeset/base-url-cloud-deploy.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/vite.config.js` → 本地候选：`vite.config.js`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/base-url.md` → 无直接路径匹配
  - `docs/base-url.zh.md` → 无直接路径匹配
  - `docs/plugin-services.md` → 无直接路径匹配
  - `docs/plugin-services.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/i18n.js` → 无直接路径匹配
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/base-path.js` → 无直接路径匹配
  - `packages/app/server/lib/base-url.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-runtime.js` → 无直接路径匹配
  - `packages/app/server/routes/misc.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/agent-loop-server-events.test.js` → 无直接路径匹配
  - `packages/app/test/api-auth.test.js` → 无直接路径匹配
  - `packages/app/test/api-base-path.test.js` → 无直接路径匹配
  - `packages/app/test/api-base-url.test.js` → 无直接路径匹配
  - `packages/app/test/api-claude-md.test.js` → 无直接路径匹配
  - `packages/app/test/api-dingtalk.test.js` → 无直接路径匹配
  - `packages/app/test/api-im.test.js` → 无直接路径匹配
  - `packages/app/test/api-project-memory.test.js` → 无直接路径匹配
  - `packages/app/test/auth-lib.test.js` → 无直接路径匹配
  - `packages/app/test/base-path-lib.test.js` → 无直接路径匹配
  - `packages/app/test/base-url-lib.test.js` → 无直接路径匹配
  - `packages/app/test/branch-cli.test.js` → 无直接路径匹配
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/events-kv-context-scan.test.js` → 无直接路径匹配
  - `packages/app/test/git-restore.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-mount-prefixes.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-service-integration.test.js` → 无直接路径匹配
  - `packages/app/test/search-endpoint.test.js` → 本地候选：`tests/search-endpoint.test.js`
  - `packages/app/test/server-ask-hook-map.test.js` → 无直接路径匹配
  - `packages/app/test/server-auth-branches.test.js` → 无直接路径匹配
  - `packages/app/test/server-base-url-startup.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-mode.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-startup.test.js` → 无直接路径匹配
  - `packages/app/test/server-http-extra-2.test.js` → 无直接路径匹配
  - `packages/app/test/server-http-extra.test.js` → 无直接路径匹配
  - `packages/app/test/server-im-worker.test.js` → 无直接路径匹配
  - `packages/app/test/server-lifecycle.test.js` → 无直接路径匹配
  - `packages/app/test/server-logs.test.js` → 无直接路径匹配
  - `packages/app/test/server-malformed-host.test.js` → 无直接路径匹配
  - `packages/app/test/server-plugins.test.js` → 无直接路径匹配
  - `packages/app/test/server-ports-busy.test.js` → 无直接路径匹配
  - `packages/app/test/server-residual.test.js` → 无直接路径匹配
  - `packages/app/test/server-resync-request.test.js` → 无直接路径匹配
  - `packages/app/test/server-startup-extra.test.js` → 无直接路径匹配
  - `packages/app/test/server-v2-read.test.js` → 无直接路径匹配
  - `packages/app/test/server-ws-branches.test.js` → 无直接路径匹配
  - `packages/app/test/server.test.js` → 无直接路径匹配
  - `packages/app/test/turn-active.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-debounce.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope-behavior.test.js` → 无直接路径匹配
  - `packages/app/test/usepassword-startup.test.js` → 无直接路径匹配
  - `packages/app/test/v2-entry-endpoint.test.js` → 无直接路径匹配
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-b23c137372"></a>
## [b23c137372](https://github.com/weiesky/cc-viewer/commit/b23c137372d979186c024de6a1c6eca873cc3306) — fix(logs): auto-shard oversized session logs by prompt count + manual per-shard load
- 2026-11-20 B3当前结论：分片B3子能力已完成：812277c/ce8c884/aee399e/48afcd7/2639cd8/57bddc8/9cd3024/c9a3991/94f81bf/d382bc7/e8ed8a7；渐进启用，原root字节保留，后续parts/N、默认2000切点、版本隔离、完整历史/导出/删除与空片恢复。2001轮真实阈值和Safari通过。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b23c137372)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b23c137372)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-05T18:45:17+08:00；作者时间：2026-11-05T18:45:17+08:00；父提交：7a0ba39edf。
- B0 本地关键代码对照：现有能力、协议差异和待测项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（27 个）：
  - `.changeset/shiny-pandas-shard.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/async-write-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/log-management.js` → 本地候选：`lib/log-management.js`
  - `packages/app/server/lib/v2/adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/conversation-store.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/journal.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/replay.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-select.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/shard-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/logs.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/v2-session-list.test.js` → 无直接路径匹配
  - `packages/app/test/v2-shard-manager.test.js` → 无直接路径匹配
  - `packages/app/test/v2-shard-routes.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-7a0ba39edf"></a>
## [7a0ba39edf](https://github.com/weiesky/cc-viewer/commit/7a0ba39edf6a0b54ca7a425e0f08ab410e515407) — test(app): deflake git + scheduled-task tests — poll async launch, retry rmSync cleanup
- B0 本地关键代码对照：上游测试以 polling 等异步启动并为 rmSync 增加重试；本地隔离全量测试通过，但曾观察并行临时目录 ENOTEMPTY，需定位具体所有权及子进程退出后验证，不把重试当作资源泄漏修复，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-7a0ba39edf)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7a0ba39edf)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7a0ba39edf)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-04T15:23:00+08:00；作者时间：2026-11-04T15:23:00+08:00；父提交：32165d3a0b。
- 初筛批次：**G / 定时任务**；状态：待人工核验。
- 处理建议：作为新能力评估；绑定 Codex 会话身份、权限、重启恢复及时区语义。
- 上游改动路径（9 个）：
  - `packages/app/test/api-git-routes.test.js` → 无直接路径匹配
  - `packages/app/test/git-diff.test.js` → 无直接路径匹配
  - `packages/app/test/git-repos.test.js` → 无直接路径匹配
  - `packages/app/test/git-restore.test.js` → 无直接路径匹配
  - `packages/app/test/git-unpushed.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-routes.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-runs-store.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-scheduler.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-store.test.js` → 无直接路径匹配

<a id="commit-32165d3a0b"></a>
## [32165d3a0b](https://github.com/weiesky/cc-viewer/commit/32165d3a0bafe168a7d10e67cee6d017f4190cc3) — chore(release): 1.9.21
- [B0 upstream full commit message](./B0-upstream-messages.md#message-32165d3a0b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-32165d3a0b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-04T12:34:40+08:00；作者时间：2026-11-04T12:34:40+08:00；父提交：ccf74880a5。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/sdk-scratch-open-persist.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-ccf74880a5"></a>
## [ccf74880a5](https://github.com/weiesky/cc-viewer/commit/ccf74880a592b0d61b01b7faa5058dc6839dcb0d) — fix(web): render unmerged git status badges (UU/AA/DD/...) in red
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ccf74880a5)
- B0 status: Adapt in B5/B11: desktop conflict colors lack the upstream status keys.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ccf74880a5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-04T12:16:31+08:00；作者时间：2026-11-04T12:16:31+08:00；父提交：1bfc1585e8。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 code comparison: B5/B11; local desktop status color map lacks the conflict-code keys; check mobile behavior. See [B0 evidence](./B0-commit-lineage.md#b0-code-findings).
- B0 人工分流：B5/B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（1 个）：
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`


<a id="commit-1bfc1585e8"></a>
## [1bfc1585e8](https://github.com/weiesky/cc-viewer/commit/1bfc1585e833d037a7dab6fe23e5a8c0aac48c08) — fix(web): persist --sdk scratch terminal open state across refresh
- 2026-11-20 B4 E12：真实terminalVisible与sdkMode分传、原输入区/portal门控；持久化复用B2。Web267/267、构建、隔离Safari展开/编辑/开关刷新通过；录音未实例化。见[B4.15](./B4-implementation.md#b415-e12-scratch-输入区原始状态与可见性)。
- 2026-11-18 B2：`afd5103` 桌面SDK开关独立持久化/刷新恢复、两个入口统一setter及存储失败回落；保留上游全局面板偏好约定，未混用PTY嵌套开关。全量1203/1203、构建、681文件安装33/33+B1.2+CLI通过；GUI host不可用，真实GUI待验收。**本地适配及安装验证完成，未标真实验收完成**。见[B2记录](./B2-session-isolation.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1bfc1585e8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1bfc1585e8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-04T03:13:14+08:00；作者时间：2026-11-04T03:13:14+08:00；父提交：a3cc12619f。
- B0 本地关键代码对照：输入/渲染状态及待验收情形见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（4 个）：
  - `.changeset/sdk-scratch-open-persist.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/test/scratch-open-persist.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-a3cc12619f"></a>
## [a3cc12619f](https://github.com/weiesky/cc-viewer/commit/a3cc12619f441e2ab04885ad85a4ce99901fc1d9) — fix(sdk+web): slow-upstream toast revive/dead-timer fixes + related P2
- 2026-11-19 B2子项：`0dce135`为手机主PTY及scratch共用约2秒（40×50ms）renderer尺寸重试，隐藏不轮询，排期可取消且终端身份/卸载守卫；定向7/7，全量1235/1235、构建通过，最终产物/1243全量见[B2记录](./B2-session-isolation.md)。本轮未实现本提交slow toast/task等其他变化，**仍部分实施**。
- B0 本地关键代码对照：混合 slow toast 跨 view 销毁、定时器复活与首 body chunk 修复；本地还需确认是否存在对应提示与 stream 生命周期。实现或验证时必须覆盖并发 requestId、空 body、错误和切项目，归 B2/B3/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a3cc12619f)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a3cc12619f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a3cc12619f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-04T03:12:45+08:00；作者时间：2026-11-04T03:12:45+08:00；父提交：a09bc713ea。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（9 个）：
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/terminal/ScratchTerminal.jsx` → 本地候选：`src/components/terminal/ScratchTerminal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/utils/sdkTaskTracker.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/proxy-slow-upstream.test.js` → 无直接路径匹配

<a id="commit-a09bc713ea"></a>
## [a09bc713ea](https://github.com/weiesky/cc-viewer/commit/a09bc713ea86d1a91f53163568ede675711200aa) — Merge pull request #167 from weiesky/chore/release-1.9.20
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a09bc713ea)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a09bc713ea)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[fd84486429](#commit-fd84486429)。合并与分支变更不得重复计算。

- 提交时间：2026-11-03T23:42:37+08:00；作者时间：2026-11-03T23:42:37+08:00；父提交：14d85f8ce6, fd84486429。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（10 个）：
  - `.changeset/chat-blank-bubble.md` → 无直接路径匹配
  - `.changeset/cr-followup-slow-hud-composer.md` → 无直接路径匹配
  - `.changeset/fix-v1-9-19-upstream-review.md` → 无直接路径匹配
  - `.changeset/review-followup-sdk-hud-slow.md` → 无直接路径匹配
  - `.changeset/sdk-mobile-scratch-terminal.md` → 无直接路径匹配
  - `.changeset/sdk-slow-upstream-advisory.md` → 无直接路径匹配
  - `.changeset/sdk-task-hud-relay.md` → 无直接路径匹配
  - `.changeset/ultrareview-no-teamcreate.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-fd84486429"></a>
## [fd84486429](https://github.com/weiesky/cc-viewer/commit/fd84486429e987ba6b918312e4afe3861faad5e7) — chore(release): 1.9.20
- [B0 upstream full commit message](./B0-upstream-messages.md#message-fd84486429)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-fd84486429)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:38:20+08:00；作者时间：2026-11-03T23:38:20+08:00；父提交：14d85f8ce6。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（10 个）：
  - `.changeset/chat-blank-bubble.md` → 无直接路径匹配
  - `.changeset/cr-followup-slow-hud-composer.md` → 无直接路径匹配
  - `.changeset/fix-v1-9-19-upstream-review.md` → 无直接路径匹配
  - `.changeset/review-followup-sdk-hud-slow.md` → 无直接路径匹配
  - `.changeset/sdk-mobile-scratch-terminal.md` → 无直接路径匹配
  - `.changeset/sdk-slow-upstream-advisory.md` → 无直接路径匹配
  - `.changeset/sdk-task-hud-relay.md` → 无直接路径匹配
  - `.changeset/ultrareview-no-teamcreate.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-14d85f8ce6"></a>
## [14d85f8ce6](https://github.com/weiesky/cc-viewer/commit/14d85f8ce60feb1ef107bb904d50a86a6b230cc5) — Merge pull request #166 from weiesky/release/slow-hud-cr-fixes
- [B0 upstream full commit message](./B0-upstream-messages.md#message-14d85f8ce6)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-14d85f8ce6)

- B0 血缘：相对第一父分支引入窗口内 8 条可达提交：[b01ff6f502](#commit-b01ff6f502), [2ea5181df8](#commit-2ea5181df8), [d90ac9587d](#commit-d90ac9587d), [92ed9bc751](#commit-92ed9bc751), [791a5e18f8](#commit-791a5e18f8), [0cde7d1df8](#commit-0cde7d1df8), [6b340326c6](#commit-6b340326c6), [99256ac1d8](#commit-99256ac1d8)。合并与分支变更不得重复计算。

- 提交时间：2026-11-03T23:36:54+08:00；作者时间：2026-11-03T23:36:54+08:00；父提交：c0c13bbc86, b01ff6f502。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（150 个）：
  - `.changeset/chat-blank-bubble.md` → 无直接路径匹配
  - `.changeset/cr-followup-slow-hud-composer.md` → 无直接路径匹配
  - `.changeset/review-followup-sdk-hud-slow.md` → 无直接路径匹配
  - `.changeset/sdk-mobile-scratch-terminal.md` → 无直接路径匹配
  - `.changeset/sdk-slow-upstream-advisory.md` → 无直接路径匹配
  - `.changeset/sdk-task-hud-relay.md` → 无直接路径匹配
  - `.changeset/ultrareview-no-teamcreate.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/TaskProgressHud.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/src/components/terminal/ScratchTerminal.jsx` → 本地候选：`src/components/terminal/ScratchTerminal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.module.css` → 本地候选：`src/components/terminal/TerminalPanel.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/mobileTermLayout.js` → 无直接路径匹配
  - `apps/web/src/utils/mobileTouchScroll.js` → 无直接路径匹配
  - `apps/web/src/utils/sdkTaskTracker.js` → 无直接路径匹配
  - `apps/web/src/utils/taskStore.js` → 无直接路径匹配
  - `apps/web/src/utils/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `apps/web/test/chat-blank-bubble.test.js` → 无直接路径匹配
  - `apps/web/test/mobile-term-layout.test.js` → 无直接路径匹配
  - `apps/web/test/mobile-touch-scroll.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/scratch-workspace-switch.test.js` → 无直接路径匹配
  - `apps/web/test/sdkTaskTracker.test.js` → 无直接路径匹配
  - `apps/web/test/task-progress-hud.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-teamcreate-free.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/concepts/ar/CustomUltraplanExpert.md` → 本地候选：`concepts/ar/CustomUltraplanExpert.md`
  - `packages/app/concepts/ar/Teammate.md` → 本地候选：`concepts/ar/Teammate.md`
  - `packages/app/concepts/ar/UltraPlan.md` → 本地候选：`concepts/ar/UltraPlan.md`
  - `packages/app/concepts/da/CustomUltraplanExpert.md` → 本地候选：`concepts/da/CustomUltraplanExpert.md`
  - `packages/app/concepts/da/Teammate.md` → 本地候选：`concepts/da/Teammate.md`
  - `packages/app/concepts/da/UltraPlan.md` → 本地候选：`concepts/da/UltraPlan.md`
  - `packages/app/concepts/de/CustomUltraplanExpert.md` → 本地候选：`concepts/de/CustomUltraplanExpert.md`
  - `packages/app/concepts/de/Teammate.md` → 本地候选：`concepts/de/Teammate.md`
  - `packages/app/concepts/de/UltraPlan.md` → 本地候选：`concepts/de/UltraPlan.md`
  - `packages/app/concepts/en/CustomUltraplanExpert.md` → 本地候选：`concepts/en/CustomUltraplanExpert.md`
  - `packages/app/concepts/en/Teammate.md` → 本地候选：`concepts/en/Teammate.md`
  - `packages/app/concepts/en/UltraPlan.md` → 本地候选：`concepts/en/UltraPlan.md`
  - `packages/app/concepts/es/CustomUltraplanExpert.md` → 本地候选：`concepts/es/CustomUltraplanExpert.md`
  - `packages/app/concepts/es/Teammate.md` → 本地候选：`concepts/es/Teammate.md`
  - `packages/app/concepts/es/UltraPlan.md` → 本地候选：`concepts/es/UltraPlan.md`
  - `packages/app/concepts/fr/CustomUltraplanExpert.md` → 本地候选：`concepts/fr/CustomUltraplanExpert.md`
  - `packages/app/concepts/fr/Teammate.md` → 本地候选：`concepts/fr/Teammate.md`
  - `packages/app/concepts/fr/UltraPlan.md` → 本地候选：`concepts/fr/UltraPlan.md`
  - `packages/app/concepts/it/CustomUltraplanExpert.md` → 本地候选：`concepts/it/CustomUltraplanExpert.md`
  - `packages/app/concepts/it/Teammate.md` → 本地候选：`concepts/it/Teammate.md`
  - `packages/app/concepts/it/UltraPlan.md` → 本地候选：`concepts/it/UltraPlan.md`
  - `packages/app/concepts/ja/CustomUltraplanExpert.md` → 本地候选：`concepts/ja/CustomUltraplanExpert.md`
  - `packages/app/concepts/ja/Teammate.md` → 本地候选：`concepts/ja/Teammate.md`
  - `packages/app/concepts/ja/UltraPlan.md` → 本地候选：`concepts/ja/UltraPlan.md`
  - `packages/app/concepts/ko/CustomUltraplanExpert.md` → 本地候选：`concepts/ko/CustomUltraplanExpert.md`
  - `packages/app/concepts/ko/Teammate.md` → 本地候选：`concepts/ko/Teammate.md`
  - `packages/app/concepts/ko/UltraPlan.md` → 本地候选：`concepts/ko/UltraPlan.md`
  - `packages/app/concepts/no/CustomUltraplanExpert.md` → 本地候选：`concepts/no/CustomUltraplanExpert.md`
  - `packages/app/concepts/no/Teammate.md` → 本地候选：`concepts/no/Teammate.md`
  - `packages/app/concepts/no/UltraPlan.md` → 本地候选：`concepts/no/UltraPlan.md`
  - `packages/app/concepts/pl/CustomUltraplanExpert.md` → 本地候选：`concepts/pl/CustomUltraplanExpert.md`
  - `packages/app/concepts/pl/Teammate.md` → 本地候选：`concepts/pl/Teammate.md`
  - `packages/app/concepts/pl/UltraPlan.md` → 本地候选：`concepts/pl/UltraPlan.md`
  - `packages/app/concepts/pt-BR/CustomUltraplanExpert.md` → 本地候选：`concepts/pt-BR/CustomUltraplanExpert.md`
  - `packages/app/concepts/pt-BR/Teammate.md` → 本地候选：`concepts/pt-BR/Teammate.md`
  - `packages/app/concepts/pt-BR/UltraPlan.md` → 本地候选：`concepts/pt-BR/UltraPlan.md`
  - `packages/app/concepts/ru/CustomUltraplanExpert.md` → 本地候选：`concepts/ru/CustomUltraplanExpert.md`
  - `packages/app/concepts/ru/Teammate.md` → 本地候选：`concepts/ru/Teammate.md`
  - `packages/app/concepts/ru/UltraPlan.md` → 本地候选：`concepts/ru/UltraPlan.md`
  - `packages/app/concepts/th/CustomUltraplanExpert.md` → 本地候选：`concepts/th/CustomUltraplanExpert.md`
  - `packages/app/concepts/th/Teammate.md` → 本地候选：`concepts/th/Teammate.md`
  - `packages/app/concepts/th/UltraPlan.md` → 本地候选：`concepts/th/UltraPlan.md`
  - `packages/app/concepts/tr/CustomUltraplanExpert.md` → 本地候选：`concepts/tr/CustomUltraplanExpert.md`
  - `packages/app/concepts/tr/Teammate.md` → 本地候选：`concepts/tr/Teammate.md`
  - `packages/app/concepts/tr/UltraPlan.md` → 本地候选：`concepts/tr/UltraPlan.md`
  - `packages/app/concepts/uk/CustomUltraplanExpert.md` → 本地候选：`concepts/uk/CustomUltraplanExpert.md`
  - `packages/app/concepts/uk/Teammate.md` → 本地候选：`concepts/uk/Teammate.md`
  - `packages/app/concepts/uk/UltraPlan.md` → 本地候选：`concepts/uk/UltraPlan.md`
  - `packages/app/concepts/zh-TW/CustomUltraplanExpert.md` → 本地候选：`concepts/zh-TW/CustomUltraplanExpert.md`
  - `packages/app/concepts/zh-TW/Teammate.md` → 本地候选：`concepts/zh-TW/Teammate.md`
  - `packages/app/concepts/zh-TW/UltraPlan.md` → 本地候选：`concepts/zh-TW/UltraPlan.md`
  - `packages/app/concepts/zh/CustomUltraplanExpert.md` → 本地候选：`concepts/zh/CustomUltraplanExpert.md`
  - `packages/app/concepts/zh/Teammate.md` → 本地候选：`concepts/zh/Teammate.md`
  - `packages/app/concepts/zh/UltraPlan.md` → 本地候选：`concepts/zh/UltraPlan.md`
  - `packages/app/concepts/zh/ultraplan-origin.md` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/proxy-slow-upstream.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-stats.test.js` → 无直接路径匹配
  - `packages/app/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `packages/content/concepts/ar/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ar/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/da/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/da/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/da/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/de/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/de/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/de/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/en/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/en/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/en/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/es/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/es/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/es/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/fr/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/fr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/it/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/it/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/it/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ja/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ja/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ko/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ko/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/no/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/no/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/no/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pl/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/pl/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ru/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ru/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/th/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/th/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/th/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/tr/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/tr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/uk/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/uk/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/zh/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/ultraplan-origin.md` → 无直接路径匹配
  - `packages/content/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`

<a id="commit-b01ff6f502"></a>
## [b01ff6f502](https://github.com/weiesky/cc-viewer/commit/b01ff6f502c24749eec12c9872919e943ce9e1af) — test(server): stabilize slow-upstream advisory test (CI flake)
- B0 本地关键代码对照：上游慢请求测试改为正时间和 requestId 关联并关闭代理；本地不同的代理和测试夹具须验证定时断言、监听器及 dispatcher 退出，归 B8/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-b01ff6f502)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b01ff6f502)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b01ff6f502)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:32:38+08:00；作者时间：2026-11-03T23:32:38+08:00；父提交：2ea5181df8。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（2 个）：
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/test/proxy-slow-upstream.test.js` → 无直接路径匹配

<a id="commit-2ea5181df8"></a>
## [2ea5181df8](https://github.com/weiesky/cc-viewer/commit/2ea5181df8c2d4e8385b76ca4507b74b8e409231) — fix(sdk+web): CR follow-ups — slow-upstream toast robustness + assorted P2
- 2026-11-19 B2子项：`cef0070`将触控滚动共享给scratch，修多指→单指的stale anchor与速度继承，并处理触点身份变化、touchcancel、卸载listener/rAF清理；定向含layout15/15，全量1243/1243、构建和最终生产安装54/54通过，GUI未验收。slow toast/composer/task/文档等混合子项未据此判完成，**仍部分实施**。见[B2记录](./B2-session-isolation.md)。
- B0 本地关键代码对照：混合 slow-upstream 多 requestId、90 秒通知回收、首 body chunk、workspace 切换和 composer 样式；本地 AppBase.jsx 有 SSE 超时与重连但非同一提示。分归 B2/B3/B7/B8，测并发、销毁与数据到达时序。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-2ea5181df8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2ea5181df8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2ea5181df8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:05:11+08:00；作者时间：2026-11-03T23:04:10+08:00；父提交：d90ac9587d。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（47 个）：
  - `.changeset/cr-followup-slow-hud-composer.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/mobileTouchScroll.js` → 无直接路径匹配
  - `apps/web/src/utils/sdkTaskTracker.js` → 无直接路径匹配
  - `apps/web/test/mobile-touch-scroll.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-teamcreate-free.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Teammate.md` → 本地候选：`concepts/ar/Teammate.md`
  - `packages/app/concepts/da/Teammate.md` → 本地候选：`concepts/da/Teammate.md`
  - `packages/app/concepts/de/Teammate.md` → 本地候选：`concepts/de/Teammate.md`
  - `packages/app/concepts/en/Teammate.md` → 本地候选：`concepts/en/Teammate.md`
  - `packages/app/concepts/es/Teammate.md` → 本地候选：`concepts/es/Teammate.md`
  - `packages/app/concepts/fr/Teammate.md` → 本地候选：`concepts/fr/Teammate.md`
  - `packages/app/concepts/it/Teammate.md` → 本地候选：`concepts/it/Teammate.md`
  - `packages/app/concepts/ja/Teammate.md` → 本地候选：`concepts/ja/Teammate.md`
  - `packages/app/concepts/ko/Teammate.md` → 本地候选：`concepts/ko/Teammate.md`
  - `packages/app/concepts/no/Teammate.md` → 本地候选：`concepts/no/Teammate.md`
  - `packages/app/concepts/pl/Teammate.md` → 本地候选：`concepts/pl/Teammate.md`
  - `packages/app/concepts/pt-BR/Teammate.md` → 本地候选：`concepts/pt-BR/Teammate.md`
  - `packages/app/concepts/ru/Teammate.md` → 本地候选：`concepts/ru/Teammate.md`
  - `packages/app/concepts/th/Teammate.md` → 本地候选：`concepts/th/Teammate.md`
  - `packages/app/concepts/tr/Teammate.md` → 本地候选：`concepts/tr/Teammate.md`
  - `packages/app/concepts/uk/Teammate.md` → 本地候选：`concepts/uk/Teammate.md`
  - `packages/app/concepts/zh-TW/Teammate.md` → 本地候选：`concepts/zh-TW/Teammate.md`
  - `packages/app/concepts/zh/Teammate.md` → 本地候选：`concepts/zh/Teammate.md`
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/content/concepts/ar/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/da/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/de/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/en/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/es/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/it/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/no/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/th/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Teammate.md` → 无直接路径匹配

<a id="commit-d90ac9587d"></a>
## [d90ac9587d](https://github.com/weiesky/cc-viewer/commit/d90ac9587dcd9caadee721cbbf26c43ecb5711ea) — fix(web): render blank-whitespace text as no bubble instead of empty chat-boxer
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d90ac9587d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d90ac9587d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:05:11+08:00；作者时间：2026-11-03T21:54:32+08:00；父提交：92ed9bc751。
- B0 本地关键代码对照：输入/渲染状态及待验收情形见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（4 个）：
  - `.changeset/chat-blank-bubble.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/test/chat-blank-bubble.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-92ed9bc751"></a>
## [92ed9bc751](https://github.com/weiesky/cc-viewer/commit/92ed9bc751c4ba3677487453d387e4565cc9fdb3) — fix(content): unify UltraReview prompt to the TeamCreate-free version
- B0 本地关键代码对照：上游移除 UltraReview TeamCreate 依赖、同步 18 语言和模板；本地 code-expert.json 已动态发现多代理并逐一通知退出，需检查所有提示来源是否一致及保留用户要求的修复策略，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-92ed9bc751)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-92ed9bc751)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-92ed9bc751)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:05:11+08:00；作者时间：2026-11-03T17:37:36+08:00；父提交：791a5e18f8。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（80 个）：
  - `.changeset/ultrareview-no-teamcreate.md` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `history.md` → 无直接路径匹配
  - `packages/app/concepts/ar/CustomUltraplanExpert.md` → 本地候选：`concepts/ar/CustomUltraplanExpert.md`
  - `packages/app/concepts/ar/UltraPlan.md` → 本地候选：`concepts/ar/UltraPlan.md`
  - `packages/app/concepts/da/CustomUltraplanExpert.md` → 本地候选：`concepts/da/CustomUltraplanExpert.md`
  - `packages/app/concepts/da/UltraPlan.md` → 本地候选：`concepts/da/UltraPlan.md`
  - `packages/app/concepts/de/CustomUltraplanExpert.md` → 本地候选：`concepts/de/CustomUltraplanExpert.md`
  - `packages/app/concepts/de/UltraPlan.md` → 本地候选：`concepts/de/UltraPlan.md`
  - `packages/app/concepts/en/CustomUltraplanExpert.md` → 本地候选：`concepts/en/CustomUltraplanExpert.md`
  - `packages/app/concepts/en/UltraPlan.md` → 本地候选：`concepts/en/UltraPlan.md`
  - `packages/app/concepts/es/CustomUltraplanExpert.md` → 本地候选：`concepts/es/CustomUltraplanExpert.md`
  - `packages/app/concepts/es/UltraPlan.md` → 本地候选：`concepts/es/UltraPlan.md`
  - `packages/app/concepts/fr/CustomUltraplanExpert.md` → 本地候选：`concepts/fr/CustomUltraplanExpert.md`
  - `packages/app/concepts/fr/UltraPlan.md` → 本地候选：`concepts/fr/UltraPlan.md`
  - `packages/app/concepts/it/CustomUltraplanExpert.md` → 本地候选：`concepts/it/CustomUltraplanExpert.md`
  - `packages/app/concepts/it/UltraPlan.md` → 本地候选：`concepts/it/UltraPlan.md`
  - `packages/app/concepts/ja/CustomUltraplanExpert.md` → 本地候选：`concepts/ja/CustomUltraplanExpert.md`
  - `packages/app/concepts/ja/UltraPlan.md` → 本地候选：`concepts/ja/UltraPlan.md`
  - `packages/app/concepts/ko/CustomUltraplanExpert.md` → 本地候选：`concepts/ko/CustomUltraplanExpert.md`
  - `packages/app/concepts/ko/UltraPlan.md` → 本地候选：`concepts/ko/UltraPlan.md`
  - `packages/app/concepts/no/CustomUltraplanExpert.md` → 本地候选：`concepts/no/CustomUltraplanExpert.md`
  - `packages/app/concepts/no/UltraPlan.md` → 本地候选：`concepts/no/UltraPlan.md`
  - `packages/app/concepts/pl/CustomUltraplanExpert.md` → 本地候选：`concepts/pl/CustomUltraplanExpert.md`
  - `packages/app/concepts/pl/UltraPlan.md` → 本地候选：`concepts/pl/UltraPlan.md`
  - `packages/app/concepts/pt-BR/CustomUltraplanExpert.md` → 本地候选：`concepts/pt-BR/CustomUltraplanExpert.md`
  - `packages/app/concepts/pt-BR/UltraPlan.md` → 本地候选：`concepts/pt-BR/UltraPlan.md`
  - `packages/app/concepts/ru/CustomUltraplanExpert.md` → 本地候选：`concepts/ru/CustomUltraplanExpert.md`
  - `packages/app/concepts/ru/UltraPlan.md` → 本地候选：`concepts/ru/UltraPlan.md`
  - `packages/app/concepts/th/CustomUltraplanExpert.md` → 本地候选：`concepts/th/CustomUltraplanExpert.md`
  - `packages/app/concepts/th/UltraPlan.md` → 本地候选：`concepts/th/UltraPlan.md`
  - `packages/app/concepts/tr/CustomUltraplanExpert.md` → 本地候选：`concepts/tr/CustomUltraplanExpert.md`
  - `packages/app/concepts/tr/UltraPlan.md` → 本地候选：`concepts/tr/UltraPlan.md`
  - `packages/app/concepts/uk/CustomUltraplanExpert.md` → 本地候选：`concepts/uk/CustomUltraplanExpert.md`
  - `packages/app/concepts/uk/UltraPlan.md` → 本地候选：`concepts/uk/UltraPlan.md`
  - `packages/app/concepts/zh-TW/CustomUltraplanExpert.md` → 本地候选：`concepts/zh-TW/CustomUltraplanExpert.md`
  - `packages/app/concepts/zh-TW/UltraPlan.md` → 本地候选：`concepts/zh-TW/UltraPlan.md`
  - `packages/app/concepts/zh/CustomUltraplanExpert.md` → 本地候选：`concepts/zh/CustomUltraplanExpert.md`
  - `packages/app/concepts/zh/UltraPlan.md` → 本地候选：`concepts/zh/UltraPlan.md`
  - `packages/app/concepts/zh/ultraplan-origin.md` → 无直接路径匹配
  - `packages/app/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `packages/content/concepts/ar/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ar/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/da/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/da/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/de/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/de/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/en/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/en/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/es/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/es/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/fr/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/fr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/it/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/it/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ja/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ja/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ko/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ko/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/no/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/no/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pl/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/pl/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ru/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ru/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/th/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/th/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/tr/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/tr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/uk/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/uk/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/zh/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/ultraplan-origin.md` → 无直接路径匹配
  - `packages/content/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`

<a id="commit-791a5e18f8"></a>
## [791a5e18f8](https://github.com/weiesky/cc-viewer/commit/791a5e18f8b9d6445fde737dab42e0d47d74a07e) — feat(web): raise chat composer max height from 6 to 12 lines
- [B0 upstream full commit message](./B0-upstream-messages.md#message-791a5e18f8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-791a5e18f8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:05:11+08:00；作者时间：2026-11-03T16:26:15+08:00；父提交：0cde7d1df8。
- B0 本地关键代码对照：输入/渲染状态及待验收情形见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（2 个）：
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`

<a id="commit-0cde7d1df8"></a>
## [0cde7d1df8](https://github.com/weiesky/cc-viewer/commit/0cde7d1df8f15fdbac23be941e367e5d577159de) — feat(web): SDK mode task checklist HUD via sdk-task WS relay
- 2026-11-20 B4.2：任务HUD组件/CSS与SDK快照子项已迁入，全量1417/1417、隔离Safari刷新/切换/停止通过；其余混合子项仍待，见[B4实施](./B4-implementation.md)。
- 2026-11-20 B4.1：Codex SDK任务快照及重连子项已实施，29/29通过；尚无HUD/活跃Agent/其他混合子项结论，见[B4实施](./B4-implementation.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0cde7d1df8)
- B0 status: Adapt in B4 using actual Codex events: no corresponding task HUD was found.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0cde7d1df8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:05:11+08:00；作者时间：2026-11-03T04:12:11+08:00；父提交：6b340326c6。
- B0 本地代码对照：已核验关键入口和上游目标；结论及尚需测试事项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（17 个）：
  - `.changeset/review-followup-sdk-hud-slow.md` → 无直接路径匹配
  - `.changeset/sdk-task-hud-relay.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/TaskProgressHud.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/sdkTaskTracker.js` → 无直接路径匹配
  - `apps/web/src/utils/taskStore.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdkTaskTracker.test.js` → 无直接路径匹配
  - `apps/web/test/task-progress-hud.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/proxy-slow-upstream.test.js` → 无直接路径匹配

<a id="commit-6b340326c6"></a>
## [6b340326c6](https://github.com/weiesky/cc-viewer/commit/6b340326c6a43d5020b74ec1d20ae6c8f44cbe4d) — feat(sdk): slow-upstream in-flight advisory
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6b340326c6)
- B0 status: Adapt in B4 after request lifecycle validation: no matching slow-upstream indicator found.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6b340326c6)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T23:05:10+08:00；作者时间：2026-11-03T03:29:44+08:00；父提交：99256ac1d8。
- B0 本地代码对照：已核验关键入口和上游目标；结论及尚需测试事项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（7 个）：
  - `.changeset/sdk-slow-upstream-advisory.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `packages/app/server/lib/proxy/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/proxy-stats.test.js` → 无直接路径匹配

<a id="commit-99256ac1d8"></a>
## [99256ac1d8](https://github.com/weiesky/cc-viewer/commit/99256ac1d8776526fdeab34ed40adcd949ebb4e6) — fix(web): --sdk mode mobile terminal renders the scratch multi-tab shell
- 2026-11-19 B2新增：`0dce135`固定60列/容器测量、软键盘/视口变化、有界重试及卸载清理；`cef0070`主PTY/scratch共享触控、touchcancel/多指anchor与惯性清理。保留本地main流首次bootstrap协议；desktop/pad仍fit。最终全量1243/1243、构建、三模式组件fixture及682文件生产安装（202Web字节一致、54/54+B1.2+CLI）通过；真实DOM/触控/软键盘/双浏览器GUI仍待，`3d66bb6`另补手机scratch 1MiB/256KiB输出水位与iOS200行回滚缓冲（desktop/pad保留原预算），实际queue burst重放及四模式fixture通过，最终1243/1243/构建/新安装54/54再次通过；**仅以上子项适配，不标整条完成**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 scratch子项：`a9197c2` 复用scratchOnly面板、按实例保存tabs、SDK聊天输入并存、Mobile单宿主/手机tab/keybar；`b1b3c7a` 后端实例归属与关闭。仅以上子项适配；floating composer、触控/固定列/软键盘及其他diff仍待逐项核验。全量1201/1201、构建/组件探针/生产安装通过，GUI未验收，**不标整条完成**。见[B2记录](./B2-session-isolation.md)。
- B0 本地关键代码对照：本地 Mobile.jsx 终端覆盖层直接挂载 TerminalPanel，未传 scratchOnly；上游 SDK 用 scratch 多标签及手机 keybar。须实测 SDK 输入、尺寸、无双挂载和触控，归 B2/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-99256ac1d8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-99256ac1d8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-99256ac1d8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-03T02:25:23+08:00；作者时间：2026-11-03T02:25:23+08:00；父提交：c29af25e64。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（12 个）：
  - `.changeset/sdk-mobile-scratch-terminal.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/terminal/ScratchTerminal.jsx` → 本地候选：`src/components/terminal/ScratchTerminal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.module.css` → 本地候选：`src/components/terminal/TerminalPanel.module.css`
  - `apps/web/src/utils/mobileTermLayout.js` → 无直接路径匹配
  - `apps/web/src/utils/mobileTouchScroll.js` → 无直接路径匹配
  - `apps/web/test/mobile-term-layout.test.js` → 无直接路径匹配
  - `apps/web/test/mobile-touch-scroll.test.js` → 无直接路径匹配
  - `apps/web/test/scratch-workspace-switch.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-c0c13bbc86"></a>
## [c0c13bbc86](https://github.com/weiesky/cc-viewer/commit/c0c13bbc86c7c3346cd177c31b5d517600a9f502) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c0c13bbc86)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c0c13bbc86)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T11:01:12+00:00；作者时间：2026-11-02T11:01:12+00:00；父提交：c29af25e64。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-c29af25e64"></a>
## [c29af25e64](https://github.com/weiesky/cc-viewer/commit/c29af25e64d3491fe7c58dc80bf859eda7831ba4) — fix(server+web): upstream v1.9.19 review — file-tree path, convSeqs single pass, toolUseMap LRU trim, approval guards
- 2026-11-20 B3：`f20f7b2`迁入toolUseMap随已处理id FIFO同步清理，20001条完成工具→保留15000条及payload；不把本笔等同整个混合提交完成。convSeqs的Claude文件覆盖协议与本地事务timeline不同，其他file-tree/approval子项保留所属工作包。详见[B3第二轮](./B3-transport-and-pagination.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c29af25e64)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c29af25e64)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T18:52:18+08:00；作者时间：2026-11-02T18:52:18+08:00；父提交：66bfeb8c18。
- B0 本地关键代码对照：协议差异、已有机制及需验证场景见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（11 个）：
  - `.changeset/fix-v1-9-19-upstream-review.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/toolFileChangeController.js` → 本地候选：`src/components/chat/controllers/toolFileChangeController.js`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-lost-result.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配

- 2026-11-21 B4 E57：本笔实际运行时子项的阅读边界/本地复用/后续工作包归属见[B4.60](./B4-implementation.md#b460-e57-混合候选的生命周期与输入代理自动化边界源码审计无运行时变动)及[B4混合scope回执](./B4-mixed-scope-audit-2026-11-21.json)。无运行时改动，不将B7/B8/B9及其他混合子项整体勾选。

<a id="commit-66bfeb8c18"></a>
## [66bfeb8c18](https://github.com/weiesky/cc-viewer/commit/66bfeb8c18ab80c70d5731827a2c05b748c01124) — chore(release): 1.9.19
- [B0 upstream full commit message](./B0-upstream-messages.md#message-66bfeb8c18)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-66bfeb8c18)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:54:00+08:00；作者时间：2026-11-02T14:54:00+08:00；父提交：1d4ea6e192。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（5 个）：
  - `.changeset/agent-loop-authoritative-signals.md` → 无直接路径匹配
  - `.changeset/fix-history-resume-live-refresh.md` → 无直接路径匹配
  - `.changeset/fix-sdk-lost-result-generation-guard.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-1d4ea6e192"></a>
## [1d4ea6e192](https://github.com/weiesky/cc-viewer/commit/1d4ea6e192975d4875a78c0f021d238b130b3a0d) — Merge pull request #165 from weiesky/fix/tool-file-monitor-incremental
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1d4ea6e192)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1d4ea6e192)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[0cbb545288](#commit-0cbb545288)。合并与分支变更不得重复计算。

- 提交时间：2026-11-02T14:51:28+08:00；作者时间：2026-11-02T14:51:28+08:00；父提交：bd32d02884, 0cbb545288。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（4 个）：
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/toolFileChangeController.js` → 本地候选：`src/components/chat/controllers/toolFileChangeController.js`
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `history.md` → 无直接路径匹配

<a id="commit-0cbb545288"></a>
## [0cbb545288](https://github.com/weiesky/cc-viewer/commit/0cbb5452887476d3838c772e9fcd04cf3d01ce63) — perf(web): incremental scan in ToolFileChangeController.check
- 2026-11-20 B3当前结论：f20f7b2迁入最终增量两pass/尾部重扫/持久Map；Codex body.input数组替换失效；c29af25e64的LRU清理同步释放payload。原提案回退后此独立重提有效，B3增量扫描完成。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0cbb545288)
- B0 status: Pending B3 benchmark: local controller scans histories; check Codex event semantics.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0cbb545288)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:36:20+08:00；作者时间：2026-11-02T14:18:32+08:00；父提交：bd32d02884。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- B0 code comparison: B3; local tool change controller scans histories on each check; benchmark and include subsequent LRU fix. See [B0 evidence](./B0-commit-lineage.md#b0-code-findings).
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（4 个）：
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/toolFileChangeController.js` → 本地候选：`src/components/chat/controllers/toolFileChangeController.js`
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `history.md` → 无直接路径匹配


<a id="commit-bd32d02884"></a>
## [bd32d02884](https://github.com/weiesky/cc-viewer/commit/bd32d02884082a6d15f2b213855537e667cdefd0) — fix(server): live-refresh new message in a resumed history project (SDK mode)
- 2026-11-18 **已具备（附证据）**：现有快照byte/seq游标+立即pump覆盖同等恢复水位语义，无需移植_seenSizes/suppressExisting。`dc5989a`新增冷/回收后重挂×seed/重建检查点四项独立进程回归，挂接前的新主/子线程精确还原且只转发一次，后续追加无重复。定向19/19、全量1221/1221、682文件实际安装47/47+B1.2+CLI启动通过；运行时代码未变，非GUI/模型验收。完整diff已读，见[B2记录](./B2-session-isolation.md)。下方较早“仍待专项”的记录为历史状态，以上为最新结论。
- 2026-11-18 相邻场景证据：`cac3aa1`/`87796f8`验证恢复前snapshot改绑、旧live reset及恢复后新增SDK消息持久化。该提交的live-feed suppression/watermark完整diff及其attach前已写入字节窗口尚未专项复现，**仍待核验，不标对齐**。见[B2记录](./B2-session-isolation.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-bd32d02884)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-bd32d02884)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-11-02T09:55:13+08:00；父提交：ef5fc8b168。
- B0 本地关键代码对照：协议差异、已有机制及需验证场景见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（4 个）：
  - `.changeset/fix-history-resume-live-refresh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `test/v2-live-feed.test.js` → 无直接路径匹配

<a id="commit-ef5fc8b168"></a>
## [ef5fc8b168](https://github.com/weiesky/cc-viewer/commit/ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f) — feat(server+web): SDK 模式 Agent-Loop 感知修复与权威轮次边界
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ef5fc8b168)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ef5fc8b168)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-11-02T02:17:22+08:00；父提交：7797672148。
- B0 本地关键代码对照：协议差异、已有机制及需验证场景见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（41 个）：
  - `.changeset/agent-loop-authoritative-signals.md` → 无直接路径匹配
  - `apps/web/public/voice-packs/default/agentLoopStart.wav` → 无直接路径匹配
  - `apps/web/public/voice-packs/default/pack.json` → 本地候选：`public/voice-packs/default/pack.json`
  - `apps/web/public/voice-packs/sanguo/agentLoopStart.wav` → 无直接路径匹配
  - `apps/web/public/voice-packs/sanguo/pack.json` → 本地候选：`public/voice-packs/sanguo/pack.json`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `apps/web/src/utils/voicePackPlayer.js` → 本地候选：`src/utils/voicePackPlayer.js`
  - `apps/web/test/agent-loop-voice.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/stop-button-turn-active.test.js` → 无直接路径匹配
  - `apps/web/test/turn-active-gating.test.js` → 无直接路径匹配
  - `apps/web/test/voice-pack-player.test.js` → 无直接路径匹配
  - `docs/plugin-services.md` → 无直接路径匹配
  - `docs/plugin-services.zh.md` → 无直接路径匹配
  - `docs/plugins.md` → 无直接路径匹配
  - `docs/plugins.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/lib/plugin-loader.js` → 本地候选：`lib/plugin-loader.js`
  - `packages/app/server/lib/plugin-runtime.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/agent-loop-server-events.test.js` → 无直接路径匹配
  - `packages/app/test/cli-sdk-process-wiring.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-runtime.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-agent-loop.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-state.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope-behavior.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope.test.js` → 无直接路径匹配
  - `packages/app/test/voice-pack-manager.test.js` → 无直接路径匹配
  - `packages/core/src/voice-pack-events.js` → 本地候选：`server/lib/voice-pack-events.js`
  - `packages/core/test/voice-pack-events.test.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `scripts/gen-default-voicepack.js` → 本地候选：`scripts/gen-default-voicepack.js`
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `test/voice-pack-sanguo-integration.test.js` → 无直接路径匹配

<a id="commit-7797672148"></a>
## [7797672148](https://github.com/weiesky/cc-viewer/commit/7797672148114a3e097b10d0d568562cc0118f5f) — style(web): drop author name from GIT changes commit rows
- B0 本地关键代码对照：本地 GitChanges.jsx 的 CommitRow 仍渲染 commit.author；上游隐藏作者保留哈希、主题、时间、统计。归 B5，按显示需求验收，无需改服务端数据。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-7797672148)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7797672148)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7797672148)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-10-31T14:33:34+08:00；父提交：dd23ce8df1。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（2 个）：
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `history.md` → 无直接路径匹配

<a id="commit-dd23ce8df1"></a>
## [dd23ce8df1](https://github.com/weiesky/cc-viewer/commit/dd23ce8df14dbe3522a03d3662aa5c3365d0ef37) — feat(web): open file content directly on tree click in file browser
- B0 本地关键代码对照：本地 FileExplorer.jsx TreeNode 点击文件已调用 onFileClick；上游针对 FileBrowserModal 树，需验证本地其他文件浏览入口而非将两个组件视为等价，归 B5。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-dd23ce8df1)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-dd23ce8df1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-dd23ce8df1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-10-31T14:33:10+08:00；父提交：88995a1046。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（3 个）：
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-88995a1046"></a>
## [88995a1046](https://github.com/weiesky/cc-viewer/commit/88995a10461973689656841a8476ee4e6c60281b) — style(web): cap SDK error bar width at 800px
- 2026-11-20 B4 E14：原持久错误条、800px CSS逐字对齐、去重×N/3条上限/清理/读屏与SDK反馈投影。全量1462/1462、构建、Safari空/非空/隔离/入库单份展示通过；重试另待84e，发布元数据归B11。见B4.17。
- B0 本地关键代码对照：上游 SDK error/retry 行上限 800px；本地暂无同名 retry 行，依赖错误反馈能力落地后核验桌面及窄屏，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-88995a1046)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-88995a1046)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-88995a1046)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-10-31T14:20:28+08:00；父提交：ee3545344e。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（3 个）：
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-ee3545344e"></a>
## [ee3545344e](https://github.com/weiesky/cc-viewer/commit/ee3545344eff8c9969f6de63631d2181844cbfb0) — fix(web): hide SDK error row while its retry is recovering
- 2026-11-19 B2相关适配：`b03a24f`从真实Codex流解决恢复期间错误终态抑制成功问题；busy保留至终态，成功不留假失败。仅该子项，完整上游手动retry/inline恢复交互仍待B4；全量1269/1269、新安装61/61，不标整条完成。
- B0 本地关键代码对照：上游隐藏正在恢复的 retry 错误行，失败再显示；本地未发现同名恢复状态，待 Codex retry 产品与服务语义明确后测试，归 B2/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-ee3545344e)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ee3545344e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ee3545344e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-10-31T14:12:03+08:00；父提交：469a995ad8。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（4 个）：
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/test/sdk-retry-inline.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-469a995ad8"></a>
## [469a995ad8](https://github.com/weiesky/cc-viewer/commit/469a995ad8d6222f2fb092a7c1c3d5bb8fe7b349) — fix(web): keep minimised SDK ask modal minimised across view-switch
- B0 本地关键代码对照：上游区分 view-switch 合成清除与真实 Ask 清除以保留最小化；本地 ChatView.jsx 管理 pendingAsk 和队列，需测试切视图、重放、真实完成及同 ID，归 B7/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-469a995ad8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-469a995ad8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-469a995ad8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-10-31T14:06:21+08:00；父提交：7641f5181a。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（5 个）：
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/approvalDismissal.js` → 无直接路径匹配
  - `apps/web/test/approval-dismissal.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-7641f5181a"></a>
## [7641f5181a](https://github.com/weiesky/cc-viewer/commit/7641f5181af91a3ca06912d687a8dee678bfb85d) — fix(server): close two first-turn SDK rendering failures
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7641f5181a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7641f5181a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:34:52+08:00；作者时间：2026-10-31T12:07:52+08:00；父提交：082673509e。
- B0 本地关键代码对照：协议差异、已有机制及需验证场景见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（13 个）：
  - `.changeset/fix-sdk-lost-result-generation-guard.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/attach-buffer.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/test/events-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-lost-result.test.js` → 无直接路径匹配
  - `packages/app/test/sse-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/v2-meta-rows.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-082673509e"></a>
## [082673509e](https://github.com/weiesky/cc-viewer/commit/082673509ec6407bb835fa8992440eb13a6cf1c2) — Revert "perf(web): incremental scan in ToolFileChangeController.check (#164)"
- B0 本地关键代码对照：此提交完整回退 08809f6e69 的全部混合改动，并非只撤销增量扫描；单独核对后续分拆恢复和未恢复项，不能重复应用，归 B2/B3/B4/B5/B7/B10/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-082673509e)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-082673509e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-082673509e)

- B0 回退：该提交为回退，需结合上游后续提交核验最终状态。

- 提交时间：2026-11-02T14:30:54+08:00；作者时间：2026-11-02T14:30:54+08:00；父提交：08809f6e69。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（64 个）：
  - `.changeset/agent-loop-authoritative-signals.md` → 无直接路径匹配
  - `.changeset/fix-history-resume-live-refresh.md` → 无直接路径匹配
  - `.changeset/fix-sdk-lost-result-generation-guard.md` → 无直接路径匹配
  - `apps/web/public/voice-packs/default/agentLoopStart.wav` → 无直接路径匹配
  - `apps/web/public/voice-packs/default/pack.json` → 本地候选：`public/voice-packs/default/pack.json`
  - `apps/web/public/voice-packs/sanguo/agentLoopStart.wav` → 无直接路径匹配
  - `apps/web/public/voice-packs/sanguo/pack.json` → 本地候选：`public/voice-packs/sanguo/pack.json`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/controllers/toolFileChangeController.js` → 本地候选：`src/components/chat/controllers/toolFileChangeController.js`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/approvalDismissal.js` → 无直接路径匹配
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `apps/web/src/utils/voicePackPlayer.js` → 本地候选：`src/utils/voicePackPlayer.js`
  - `apps/web/test/agent-loop-voice.test.js` → 无直接路径匹配
  - `apps/web/test/approval-dismissal.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-retry-inline.test.js` → 无直接路径匹配
  - `apps/web/test/stop-button-turn-active.test.js` → 无直接路径匹配
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `apps/web/test/turn-active-gating.test.js` → 无直接路径匹配
  - `apps/web/test/voice-pack-player.test.js` → 无直接路径匹配
  - `docs/plugin-services.md` → 无直接路径匹配
  - `docs/plugin-services.zh.md` → 无直接路径匹配
  - `docs/plugins.md` → 无直接路径匹配
  - `docs/plugins.zh.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/lib/attach-buffer.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-loader.js` → 本地候选：`lib/plugin-loader.js`
  - `packages/app/server/lib/plugin-runtime.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/agent-loop-server-events.test.js` → 无直接路径匹配
  - `packages/app/test/cli-sdk-process-wiring.test.js` → 无直接路径匹配
  - `packages/app/test/events-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-runtime.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-agent-loop.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-lost-result.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-state.test.js` → 无直接路径匹配
  - `packages/app/test/sse-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope-behavior.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope.test.js` → 无直接路径匹配
  - `packages/app/test/v2-meta-rows.test.js` → 无直接路径匹配
  - `packages/app/test/voice-pack-manager.test.js` → 无直接路径匹配
  - `packages/core/src/voice-pack-events.js` → 本地候选：`server/lib/voice-pack-events.js`
  - `packages/core/test/voice-pack-events.test.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `scripts/gen-default-voicepack.js` → 本地候选：`scripts/gen-default-voicepack.js`
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `test/v2-live-feed.test.js` → 无直接路径匹配
  - `test/voice-pack-sanguo-integration.test.js` → 无直接路径匹配

<a id="commit-08809f6e69"></a>
## [08809f6e69](https://github.com/weiesky/cc-viewer/commit/08809f6e69315476690c62bbe238bd5c199b338d) — perf(web): incremental scan in ToolFileChangeController.check (#164)
- B0 本地关键代码对照：大型 squash 含首轮 SDK 丢结果、Ask 最小化、错误恢复、文件树、Git 样式、agent-loop、历史恢复和增量扫描；随后被 082673509e 全量回退，部分由 7641f518/ef5fc8b1/bd32d028/0cbb5452/c29af25e 重引。以最终树逐功能核验，归 B2/B3/B4/B5/B7/B10/B11，不直接移植回退补丁。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-08809f6e69)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-08809f6e69)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-08809f6e69)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-11-02T14:19:28+08:00；作者时间：2026-11-02T14:19:28+08:00；父提交：7039adeec3。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（64 个）：
  - `.changeset/agent-loop-authoritative-signals.md` → 无直接路径匹配
  - `.changeset/fix-history-resume-live-refresh.md` → 无直接路径匹配
  - `.changeset/fix-sdk-lost-result-generation-guard.md` → 无直接路径匹配
  - `apps/web/public/voice-packs/default/agentLoopStart.wav` → 无直接路径匹配
  - `apps/web/public/voice-packs/default/pack.json` → 本地候选：`public/voice-packs/default/pack.json`
  - `apps/web/public/voice-packs/sanguo/agentLoopStart.wav` → 无直接路径匹配
  - `apps/web/public/voice-packs/sanguo/pack.json` → 本地候选：`public/voice-packs/sanguo/pack.json`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/controllers/toolFileChangeController.js` → 本地候选：`src/components/chat/controllers/toolFileChangeController.js`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/approvalDismissal.js` → 无直接路径匹配
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `apps/web/src/utils/voicePackPlayer.js` → 本地候选：`src/utils/voicePackPlayer.js`
  - `apps/web/test/agent-loop-voice.test.js` → 无直接路径匹配
  - `apps/web/test/approval-dismissal.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-retry-inline.test.js` → 无直接路径匹配
  - `apps/web/test/stop-button-turn-active.test.js` → 无直接路径匹配
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `apps/web/test/turn-active-gating.test.js` → 无直接路径匹配
  - `apps/web/test/voice-pack-player.test.js` → 无直接路径匹配
  - `docs/plugin-services.md` → 无直接路径匹配
  - `docs/plugin-services.zh.md` → 无直接路径匹配
  - `docs/plugins.md` → 无直接路径匹配
  - `docs/plugins.zh.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/lib/attach-buffer.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-loader.js` → 本地候选：`lib/plugin-loader.js`
  - `packages/app/server/lib/plugin-runtime.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/agent-loop-server-events.test.js` → 无直接路径匹配
  - `packages/app/test/cli-sdk-process-wiring.test.js` → 无直接路径匹配
  - `packages/app/test/events-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-runtime.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-agent-loop.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-lost-result.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-state.test.js` → 无直接路径匹配
  - `packages/app/test/sse-attach-buffer.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope-behavior.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope.test.js` → 无直接路径匹配
  - `packages/app/test/v2-meta-rows.test.js` → 无直接路径匹配
  - `packages/app/test/voice-pack-manager.test.js` → 无直接路径匹配
  - `packages/core/src/voice-pack-events.js` → 本地候选：`server/lib/voice-pack-events.js`
  - `packages/core/test/voice-pack-events.test.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `scripts/gen-default-voicepack.js` → 本地候选：`scripts/gen-default-voicepack.js`
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `test/v2-live-feed.test.js` → 无直接路径匹配
  - `test/voice-pack-sanguo-integration.test.js` → 无直接路径匹配

<a id="commit-7039adeec3"></a>
## [7039adeec3](https://github.com/weiesky/cc-viewer/commit/7039adeec33cc99648cb4c4bf714a7fea35eba80) — chore(release): 1.9.18
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7039adeec3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7039adeec3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-31T03:46:26+08:00；作者时间：2026-10-31T03:46:26+08:00；父提交：77b61bd571。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（7 个）：
  - `.changeset/fix-fork-review-1-9-17.md` → 无直接路径匹配
  - `.changeset/fix-sdk-502-retry-feedback.md` → 无直接路径匹配
  - `.changeset/fix-sdk-misc-resilience.md` → 无直接路径匹配
  - `.changeset/fix-sdk-resilience.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-77b61bd571"></a>
## [77b61bd571](https://github.com/weiesky/cc-viewer/commit/77b61bd571c5a31c1d071025b8254a3c4c3a9593) — fix(server+web): resilient sends, approval-hook timeout, SSE slow reconnect, off-mode stream idle watchdog
- B0 本地关键代码对照：混合稳健发送、hook timeout、SSE 慢重连、代理 idle watchdog 和 plugin-loader 修复；本地 AppBase.jsx 有重连退避，不能等同上游。分别测试断线队列、审批过期、slow stream 和插件异常，归 B3/B8/B10/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-77b61bd571)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-77b61bd571)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-77b61bd571)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-31T03:44:17+08:00；作者时间：2026-10-31T03:44:17+08:00；父提交：cdf05bf8ee。
- 初筛批次：**H / 插件与扩展**；状态：待人工核验。
- 处理建议：对比现有 hook 插件接口；评估服务生命周期、授权和代理隔离。
- 上游改动路径（13 个）：
  - `.changeset/fix-sdk-misc-resilience.md` → 无直接路径匹配
  - `apps/web/src/utils/sseChannels.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `apps/web/test/send-failed-feedback.test.js` → 无直接路径匹配
  - `apps/web/test/sse-channels.test.js` → 无直接路径匹配
  - `apps/web/test/sse-slow-reconnect.test.js` → 无直接路径匹配
  - `docs/plugins.md` → 无直接路径匹配
  - `docs/plugins.zh.md` → 无直接路径匹配
  - `packages/app/server/lib/plugin-loader.js` → 本地候选：`lib/plugin-loader.js`
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/test/plugin-loader.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-stream-idle-off.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-send-failure.test.js` → 无直接路径匹配

<a id="commit-cdf05bf8ee"></a>
## [cdf05bf8ee](https://github.com/weiesky/cc-viewer/commit/cdf05bf8ee09645d9396935fe88efe84ccb57da8) — feat(server+web): inline 502/network retry feedback with progress and a manual resume-retry affordance
- 2026-11-19 B2恢复终态子项：`b03a24f`修复真实Codex0.169 error重试通知提前持久失败并吞成功回答；最终turn/流结束决定结果。受控真实二进制首次503后成功已红绿复现，SDK定向22/22、全量1269/1269及新生产安装61/61通过；没有实现完整手动retry/进度条，不标整条完成。
- B0 本地关键代码对照：上游以 502/网络重试进度与手动恢复提示用户；本地 ChatView.jsx 无同名 SDK retry UI，SDK 与 proxy 错误路径不同。先验证重试是否真实可重放且避免重复副作用，归 B2/B7/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-cdf05bf8ee)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-cdf05bf8ee)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-cdf05bf8ee)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-31T03:44:09+08:00；作者时间：2026-10-31T03:44:09+08:00；父提交：84e65cddc6。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（9 个）：
  - `.changeset/fix-sdk-502-retry-feedback.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/ccvMarkers.js` → 无直接路径匹配
  - `apps/web/test/chat-synthetic-retry-prompt.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-retry-inline.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-retry-inline.test.js` → 无直接路径匹配

<a id="commit-84e65cddc6"></a>
## [84e65cddc6](https://github.com/weiesky/cc-viewer/commit/84e65cddc629e8b442e866c303883444901d5c19) — fix(server+web): judge stuck SDK turns by activity probe, restore approvals on attach, keep Stop visible on long turns
- 持续收尾`14c39d4`：POSIX自有SDK进程监管及5秒升级回收，顽固子进程退出后才idle、兄弟实例不受影响；19/19、全量1270、构建及真实Codex本地mock通过。Windows/真实模型及该混合提交其他子项独立记录，不整体标完成。
- 2026-11-19补证：真实Codex0.169/SDK0.142.5配合本地Responses，通过同名隔离/503恢复/队列/普通取消；无外部模型。Codex SDK无Claude getContextUsage活性control RPC，不创建假探针；顽固子进程回收方案仍待选择，真实GUI/审批恢复未等价验收。
- B0 本地关键代码对照：混合 SDK 活跃探针、stuck turn、attach 审批恢复与长任务 Stop；本地 sdk-manager.js 与 appserver-bridge.js 为 Codex 实现，须分别验证长时间无 token 的工具执行、失联、取消与审批恢复，归 B2/B3/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-84e65cddc6)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-84e65cddc6)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-84e65cddc6)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-31T03:44:00+08:00；作者时间：2026-10-31T03:44:00+08:00；父提交：208f134827。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（18 个）：
  - `.changeset/fix-sdk-resilience.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/askFlowController.js` → 本地候选：`src/components/chat/controllers/askFlowController.js`
  - `apps/web/test/stop-button-turn-active.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/cli-sdk-process-wiring.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-state.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-wiring.test.js` → 无直接路径匹配
  - `packages/app/test/server-sdk-attach-replay.test.js` → 无直接路径匹配

<a id="commit-208f134827"></a>
## [208f134827](https://github.com/weiesky/cc-viewer/commit/208f1348279758d95b72798442105c3236fa1dd3) — fix(server+web): fork review fixes for 1.9.17 — new-file save 403, plan modal reopen, fallback countdown
- B0 本地关键代码对照：混合目标浏览器新文件保存 403、Plan modal 重新打开和 fallback countdown 修复；本地文件 API 与 SDK inline approval 不完全相同，分归 B5/B11 并测试新文件父目录授权、已关闭请求与倒计时取消。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-208f134827)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-208f134827)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-208f134827)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-30T14:14:30+08:00；作者时间：2026-10-30T14:14:30+08:00；父提交：1600211658。
- 初筛批次：**I / 权限与交互问答**；状态：待人工核验。
- 处理建议：核对 Codex 原生审批和用户输入；变更默认权限须独立决策。
- 上游改动路径（10 个）：
  - `.changeset/fix-fork-review-1-9-17.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/approval/ApprovalModal.jsx` → 本地候选：`src/components/approval/ApprovalModal.jsx`
  - `apps/web/src/utils/approvalDismissal.js` → 无直接路径匹配
  - `apps/web/src/utils/planFallbackCountdown.js` → 无直接路径匹配
  - `apps/web/test/approval-dismissal.test.js` → 无直接路径匹配
  - `apps/web/test/plan-fallback-countdown.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/test/api-target-files-fs.test.js` → 无直接路径匹配

<a id="commit-1600211658"></a>
## [1600211658](https://github.com/weiesky/cc-viewer/commit/16002116588f9cb601cf91ebd154b19e1ecb9295) — chore(release): 1.9.17
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1600211658)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1600211658)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-30T00:20:58+08:00；作者时间：2026-10-30T00:20:58+08:00；父提交：ebfcbaec0d。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（7 个）：
  - `.changeset/lr-duplicate-text-hide.md` → 无直接路径匹配
  - `.changeset/sdk-plan-modal-card.md` → 无直接路径匹配
  - `.changeset/sdk-terminal-keeps-blood-bar.md` → 无直接路径匹配
  - `.changeset/target-browser-context-menu.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-ebfcbaec0d"></a>
## [ebfcbaec0d](https://github.com/weiesky/cc-viewer/commit/ebfcbaec0d5dac5621dcf5f4c38ecd8481b96c64) — fix(web): hide Last Response when it duplicates the last assistant turn
- B0 本地关键代码对照：上游仅在文本和工具调用 id 一致且无独有待处理交互时隐藏重复 Last Response；本地 ChatView.jsx 与 interactionOwnership.js 存在相关机制，须用相同文本不同交互及跨轮测试，归 B3/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-ebfcbaec0d)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ebfcbaec0d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ebfcbaec0d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-29T22:44:02+08:00；作者时间：2026-10-29T22:44:02+08:00；父提交：282306a950。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（5 个）：
  - `.changeset/lr-duplicate-text-hide.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/interactionOwnership.js` → 本地候选：`src/components/chat/interactionOwnership.js`
  - `apps/web/test/lr-duplicate-text.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-282306a950"></a>
## [282306a950](https://github.com/weiesky/cc-viewer/commit/282306a9507f1794fd3a9f35f4aef696e542b68b) — fix(web): SDK-mode plan approval uses the plan card modal
- B0 本地关键代码对照：上游 SDK Plan 使用全局卡片 modal；本地 ChatView.jsx 注释明确 SDK Plan 在 inline 卡片而非全局 modal。视觉与交互是否合并应按 Codex 审批协议验证，不改写 PTY，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-282306a950)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-282306a950)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-282306a950)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-29T20:19:39+08:00；作者时间：2026-10-29T20:19:39+08:00；父提交：7a75e1be81。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（15 个）：
  - `.changeset/sdk-plan-modal-card.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ApprovalModal.jsx` → 本地候选：`src/components/approval/ApprovalModal.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/chat/ApprovalPortalContext.js` → 本地候选：`src/components/chat/ApprovalPortalContext.js`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/PlanApprovalForm.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/interactionOwnership.js` → 本地候选：`src/components/chat/interactionOwnership.js`
  - `apps/web/test/plan-approval-panel.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`

<a id="commit-7a75e1be81"></a>
- 2026-11-20 B4 E51源码/协议范围核定：实际diff及固定最终PlanApprovalForm/target helper、后续fallback倒计时已核。Claude canUseTool ExitPlanMode与Codex原生plan通知不同；实际0.169 experimental全11种ServerRequest无计划审批，保持E41只读与通道守卫。通用隔离/重连/最小化/终态复用B2/E5/E35–41既验；自动策略B9、元数据等B11单列，不伪造UI或勾整条。仅审计/实际schema生成，无新运行时或重跑声明，见[B4.54](./B4-implementation.md#b454-e51-计划审批协议与候选范围核定源码审计无运行时变动)。

## [7a75e1be81](https://github.com/weiesky/cc-viewer/commit/7a75e1be81b3e90f55f8888c423e66e05c1cde64) — feat(web+server): context menu and preview editing in the CLAUDE.md/skill file browser
- B0 本地关键代码对照：上游为 instruction/skill 目标浏览器增加文件写入、删除、重命名并检查 admin、same-origin、realpath 和敏感目录；本地有 AGENTS/skills UI 和 lib/file-api.js，若增加写操作须构造 symlink、递归删除和敏感配置拒绝测试，归 B5/B6。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-7a75e1be81)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7a75e1be81)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7a75e1be81)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-29T17:14:03+08:00；作者时间：2026-10-29T17:14:03+08:00；父提交：3d65bedcd1。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（21 个）：
  - `.changeset/target-browser-context-menu.md` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/files/fileContextMenu.js` → 无直接路径匹配
  - `apps/web/src/components/files/fileContextMenuActions.jsx` → 无直接路径匹配
  - `apps/web/src/utils/apiUrl.js` → 本地候选：`src/utils/apiUrl.js`
  - `apps/web/test/external-folder-targets.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-context-menu-actions.test.js` → 无直接路径匹配
  - `apps/web/test/file-context-menu.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/os-open.js` → 无直接路径匹配
  - `packages/app/server/lib/target-scope.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/server/routes/target-files-fs.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-target-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-file-access-policy.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-3d65bedcd1"></a>
## [3d65bedcd1](https://github.com/weiesky/cc-viewer/commit/3d65bedcd1b47a8de7f0ff1bdfec3a11efbc9fa0) — fix(web): keep the composer blood bar visible when the SDK scratch terminal opens
- 2026-11-20 B4 E12：真实terminalVisible与sdkMode分传、原输入区/portal门控；持久化复用B2。Web267/267、构建、隔离Safari展开/编辑/开关刷新通过；录音未实例化。见[B4.15](./B4-implementation.md#b415-e12-scratch-输入区原始状态与可见性)。
- B0 本地关键代码对照：上游 SDK scratch 打开时保留血条 portal；本地 ChatInputBar.jsx 的 context bar slot 受 terminalVisible 控制，App.jsx 的 SDK 传值另有分支，需真实交互确认，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-3d65bedcd1)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3d65bedcd1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3d65bedcd1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-29T17:12:47+08:00；作者时间：2026-10-29T17:12:47+08:00；父提交：3e4f1064c2。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（4 个）：
  - `.changeset/sdk-terminal-keeps-blood-bar.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/test/sdk-context-blood-bar.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-3e4f1064c2"></a>
## [3e4f1064c2](https://github.com/weiesky/cc-viewer/commit/3e4f1064c232960c452758c86157c406dc7ed9dd) — chore(release): 1.9.16
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3e4f1064c2)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3e4f1064c2)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-27T23:50:36+08:00；作者时间：2026-10-27T23:50:36+08:00；父提交：67226f50c1。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（7 个）：
  - `.changeset/kimi-k3-no-auto-real-verify.md` → 无直接路径匹配
  - `.changeset/open-skill-claude-folders.md` → 无直接路径匹配
  - `.changeset/queue-send-now-inline-ack.md` → 无直接路径匹配
  - `.changeset/server-auto-approve-countdown.md` → 无直接路径匹配
  - `.changeset/ultrareview-template-teammates.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-67226f50c1"></a>
## [67226f50c1](https://github.com/weiesky/cc-viewer/commit/67226f50c171780b4da62c27a211219edf3bb648) — Merge pull request #163 from weiesky/fix/file-browser-view-scope
- [B0 upstream full commit message](./B0-upstream-messages.md#message-67226f50c1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-67226f50c1)

- B0 血缘：相对第一父分支引入窗口内 6 条可达提交：[aaa3a59444](#commit-aaa3a59444), [134a0de7ac](#commit-134a0de7ac), [5e50112388](#commit-5e50112388), [15751cf49c](#commit-15751cf49c), [1e0edc00f3](#commit-1e0edc00f3), [566ade13fc](#commit-566ade13fc)。合并与分支变更不得重复计算。

- 提交时间：2026-10-27T23:49:53+08:00；作者时间：2026-10-27T23:49:53+08:00；父提交：2cd4488ce9, aaa3a59444。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（98 个）：
  - `.changeset/kimi-k3-no-auto-real-verify.md` → 无直接路径匹配
  - `.changeset/open-skill-claude-folders.md` → 无直接路径匹配
  - `.changeset/queue-send-now-inline-ack.md` → 无直接路径匹配
  - `.changeset/server-auto-approve-countdown.md` → 无直接路径匹配
  - `.changeset/ultrareview-template-teammates.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/controllers/permissionController.js` → 本地候选：`src/components/chat/controllers/permissionController.js`
  - `apps/web/src/components/chat/optimisticQueueMessage.js` → 无直接路径匹配
  - `apps/web/src/components/common/MemoryDetailModal.jsx` → 本地候选：`src/components/common/MemoryDetailModal.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/settings/SkillsManagerModal.jsx` → 本地候选：`src/components/settings/SkillsManagerModal.jsx`
  - `apps/web/src/components/settings/SkillsManagerModal.module.css` → 本地候选：`src/components/settings/SkillsManagerModal.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/deadlineCountdown.js` → 无直接路径匹配
  - `apps/web/src/utils/fileOpen.js` → 本地候选：`src/utils/fileOpen.js`
  - `apps/web/src/utils/skillModalController.js` → 本地候选：`src/utils/skillModalController.js`
  - `apps/web/src/utils/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `apps/web/test/deadline-countdown.test.js` → 无直接路径匹配
  - `apps/web/test/external-folder-targets.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-open.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-chat.test.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-message.test.js` → 无直接路径匹配
  - `apps/web/test/permission-controller.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/concepts/ar/UltraPlan.md` → 本地候选：`concepts/ar/UltraPlan.md`
  - `packages/app/concepts/da/UltraPlan.md` → 本地候选：`concepts/da/UltraPlan.md`
  - `packages/app/concepts/de/UltraPlan.md` → 本地候选：`concepts/de/UltraPlan.md`
  - `packages/app/concepts/en/UltraPlan.md` → 本地候选：`concepts/en/UltraPlan.md`
  - `packages/app/concepts/es/UltraPlan.md` → 本地候选：`concepts/es/UltraPlan.md`
  - `packages/app/concepts/fr/UltraPlan.md` → 本地候选：`concepts/fr/UltraPlan.md`
  - `packages/app/concepts/it/UltraPlan.md` → 本地候选：`concepts/it/UltraPlan.md`
  - `packages/app/concepts/ja/UltraPlan.md` → 本地候选：`concepts/ja/UltraPlan.md`
  - `packages/app/concepts/ko/UltraPlan.md` → 本地候选：`concepts/ko/UltraPlan.md`
  - `packages/app/concepts/no/UltraPlan.md` → 本地候选：`concepts/no/UltraPlan.md`
  - `packages/app/concepts/pl/UltraPlan.md` → 本地候选：`concepts/pl/UltraPlan.md`
  - `packages/app/concepts/pt-BR/UltraPlan.md` → 本地候选：`concepts/pt-BR/UltraPlan.md`
  - `packages/app/concepts/ru/UltraPlan.md` → 本地候选：`concepts/ru/UltraPlan.md`
  - `packages/app/concepts/th/UltraPlan.md` → 本地候选：`concepts/th/UltraPlan.md`
  - `packages/app/concepts/tr/UltraPlan.md` → 本地候选：`concepts/tr/UltraPlan.md`
  - `packages/app/concepts/uk/UltraPlan.md` → 本地候选：`concepts/uk/UltraPlan.md`
  - `packages/app/concepts/zh-TW/UltraPlan.md` → 本地候选：`concepts/zh-TW/UltraPlan.md`
  - `packages/app/concepts/zh/UltraPlan.md` → 本地候选：`concepts/zh/UltraPlan.md`
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/auto-approve.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/skills.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-target-files.test.js` → 无直接路径匹配
  - `packages/app/test/auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-sdk-manager.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/perm-bridge.test.js` → 本地候选：`tests/perm-bridge.test.js`
  - `packages/app/test/sdk-manager-auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-mode.test.js` → 无直接路径匹配
  - `packages/app/test/server-ws-branches.test.js` → 无直接路径匹配
  - `packages/app/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `packages/content/concepts/ar/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/da/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/de/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/en/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/es/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/fr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/it/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ja/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ko/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/no/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pl/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ru/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/th/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/tr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/uk/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/UltraPlan.md` → 无直接路径匹配
  - `packages/content/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-aaa3a59444"></a>
## [aaa3a59444](https://github.com/weiesky/cc-viewer/commit/aaa3a59444884254cf8d5cf93ce032b35ef8aa24) — docs: changelog for server-side approval countdown and UltraReview template
- B0 本地关键代码对照：只补上游审批倒计时和 UltraReview 变更日志；功能分别由 5e50112388、134a0de7ac 核查，不搬运为本地发布记录，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-aaa3a59444)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-aaa3a59444)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-aaa3a59444)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-27T23:47:58+08:00；作者时间：2026-10-27T23:43:57+08:00；父提交：134a0de7ac。
- 初筛批次：**I / 权限与交互问答**；状态：待人工核验。
- 处理建议：核对 Codex 原生审批和用户输入；变更默认权限须独立决策。
- 上游改动路径（1 个）：
  - `history.md` → 无直接路径匹配

<a id="commit-134a0de7ac"></a>
## [134a0de7ac](https://github.com/weiesky/cc-viewer/commit/134a0de7ac166db5f9375d9f2c60bcd97248852b) — docs(ultraplan): rewrite UltraReview team workflow to named Agent teammates
- B0 本地关键代码对照：上游把 UltraReview TeamCreate/TeamDelete 依赖改为具名代理并同步多语言；本地 ultraAgents/code-expert.json 已描述工具发现、代理和通知退出，但审查优先级不同；需按现有 Codex 工具可用性与用户策略核对，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-134a0de7ac)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-134a0de7ac)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-134a0de7ac)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-27T23:47:58+08:00；作者时间：2026-10-27T23:43:41+08:00；父提交：5e50112388。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（41 个）：
  - `.changeset/ultrareview-template-teammates.md` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `packages/app/concepts/ar/UltraPlan.md` → 本地候选：`concepts/ar/UltraPlan.md`
  - `packages/app/concepts/da/UltraPlan.md` → 本地候选：`concepts/da/UltraPlan.md`
  - `packages/app/concepts/de/UltraPlan.md` → 本地候选：`concepts/de/UltraPlan.md`
  - `packages/app/concepts/en/UltraPlan.md` → 本地候选：`concepts/en/UltraPlan.md`
  - `packages/app/concepts/es/UltraPlan.md` → 本地候选：`concepts/es/UltraPlan.md`
  - `packages/app/concepts/fr/UltraPlan.md` → 本地候选：`concepts/fr/UltraPlan.md`
  - `packages/app/concepts/it/UltraPlan.md` → 本地候选：`concepts/it/UltraPlan.md`
  - `packages/app/concepts/ja/UltraPlan.md` → 本地候选：`concepts/ja/UltraPlan.md`
  - `packages/app/concepts/ko/UltraPlan.md` → 本地候选：`concepts/ko/UltraPlan.md`
  - `packages/app/concepts/no/UltraPlan.md` → 本地候选：`concepts/no/UltraPlan.md`
  - `packages/app/concepts/pl/UltraPlan.md` → 本地候选：`concepts/pl/UltraPlan.md`
  - `packages/app/concepts/pt-BR/UltraPlan.md` → 本地候选：`concepts/pt-BR/UltraPlan.md`
  - `packages/app/concepts/ru/UltraPlan.md` → 本地候选：`concepts/ru/UltraPlan.md`
  - `packages/app/concepts/th/UltraPlan.md` → 本地候选：`concepts/th/UltraPlan.md`
  - `packages/app/concepts/tr/UltraPlan.md` → 本地候选：`concepts/tr/UltraPlan.md`
  - `packages/app/concepts/uk/UltraPlan.md` → 本地候选：`concepts/uk/UltraPlan.md`
  - `packages/app/concepts/zh-TW/UltraPlan.md` → 本地候选：`concepts/zh-TW/UltraPlan.md`
  - `packages/app/concepts/zh/UltraPlan.md` → 本地候选：`concepts/zh/UltraPlan.md`
  - `packages/app/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `packages/content/concepts/ar/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/da/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/de/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/en/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/es/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/fr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/it/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ja/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ko/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/no/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pl/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ru/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/th/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/tr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/uk/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/UltraPlan.md` → 无直接路径匹配
  - `packages/content/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`

<a id="commit-5e50112388"></a>
## [5e50112388](https://github.com/weiesky/cc-viewer/commit/5e5011238822bcd7efe4e8558b81545cc97e40ef) — fix(server+web): server-side auto-approve countdown for plan/perm approvals
- B0 本地关键代码对照：上游将 plan/perm 自动审批转到服务端，断网无客户端仍执行，并保留取消、重连截止时间及 npm publish/无人值守例外；本地 ChatView.jsx 有客户端计时，权限与用户期望不同。必须独立决策授权范围并验证竞态和强制人工审批，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-5e50112388)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5e50112388)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5e50112388)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-27T23:47:58+08:00；作者时间：2026-10-27T23:43:29+08:00；父提交：15751cf49c。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（27 个）：
  - `.changeset/server-auto-approve-countdown.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/permissionController.js` → 本地候选：`src/components/chat/controllers/permissionController.js`
  - `apps/web/src/utils/deadlineCountdown.js` → 无直接路径匹配
  - `apps/web/test/deadline-countdown.test.js` → 无直接路径匹配
  - `apps/web/test/permission-controller.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/auto-approve.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `packages/app/test/auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-sdk-manager.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/perm-bridge.test.js` → 本地候选：`tests/perm-bridge.test.js`
  - `packages/app/test/sdk-manager-auto-approve.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-mode.test.js` → 无直接路径匹配
  - `packages/app/test/server-ws-branches.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

- 2026-11-21 B4 E57：本笔实际运行时子项的阅读边界/本地复用/后续工作包归属见[B4.60](./B4-implementation.md#b460-e57-混合候选的生命周期与输入代理自动化边界源码审计无运行时变动)及[B4混合scope回执](./B4-mixed-scope-audit-2026-11-21.json)。无运行时改动，不将B7/B8/B9及其他混合子项整体勾选。

<a id="commit-15751cf49c"></a>
## [15751cf49c](https://github.com/weiesky/cc-viewer/commit/15751cf49c2539fcbb9cef6684751f77969d2787) — chore(server): kimi-k3 preset forbids unrequested real-environment verification
- B0 本地关键代码对照：上游仅修改 Kimi preset，禁止未请求真实环境验证；本地未发现同名 preset，此产品级限制不自动适用于 Codex 或覆盖现有任务授权，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-15751cf49c)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-15751cf49c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-15751cf49c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-27T23:47:58+08:00；作者时间：2026-10-27T19:59:37+08:00；父提交：1e0edc00f3。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（3 个）：
  - `.changeset/kimi-k3-no-auto-real-verify.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配

<a id="commit-1e0edc00f3"></a>
## [1e0edc00f3](https://github.com/weiesky/cc-viewer/commit/1e0edc00f3992edbeb47208e7326977101344f1b) — fix(web): inline queue send-now chip and clear placeholder on dispatch
- 持续收尾`671547d`立即发送控制及暂停保留；`c11609f`用权威activeInput持续展示已派发用户提示直到精确回声，避免Codex只在结束时持久写入导致中间消失。SDK无turn内注入，明确中断当前回合后发送。GUI进行中，不整体标完成。
- B0 本地关键代码对照：上游修复乐观队列 chip 与服务端状态丢失后占位清除，本地 SDK 字符串队列和 ChatView 的 pendingFlushQueue 需区分；测试跨 session、拒绝和 30 秒清理，归 B2/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-1e0edc00f3)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1e0edc00f3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1e0edc00f3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-27T23:47:58+08:00；作者时间：2026-10-27T19:48:13+08:00；父提交：566ade13fc。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（9 个）：
  - `.changeset/queue-send-now-inline-ack.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/optimisticQueueMessage.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-chat.test.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-message.test.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-566ade13fc"></a>
## [566ade13fc](https://github.com/weiesky/cc-viewer/commit/566ade13fc3bf2c3fd8d90044b1f36602c6980bf) — feat(web): open CLAUDE.md and skill folders
- B0 本地关键代码对照：上游支持打开 CLAUDE.md 和 skill 文件夹；本地 CachePopoverContent.jsx 已展示 AGENTS.md，skills 导入也存在。需按 Codex AGENTS/skill 作用域核对入口及安全策略，归 B5/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-566ade13fc)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-566ade13fc)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-566ade13fc)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-27T23:47:58+08:00；作者时间：2026-10-27T15:49:33+08:00；父提交：2cd4488ce9。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（23 个）：
  - `.changeset/open-skill-claude-folders.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/common/MemoryDetailModal.jsx` → 本地候选：`src/components/common/MemoryDetailModal.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/settings/SkillsManagerModal.jsx` → 本地候选：`src/components/settings/SkillsManagerModal.jsx`
  - `apps/web/src/components/settings/SkillsManagerModal.module.css` → 本地候选：`src/components/settings/SkillsManagerModal.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/fileOpen.js` → 本地候选：`src/utils/fileOpen.js`
  - `apps/web/src/utils/skillModalController.js` → 本地候选：`src/utils/skillModalController.js`
  - `apps/web/test/external-folder-targets.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-open.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/skills.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-target-files.test.js` → 无直接路径匹配

<a id="commit-2cd4488ce9"></a>
## [2cd4488ce9](https://github.com/weiesky/cc-viewer/commit/2cd4488ce984abf10f9338ec5f1ad6e88c359281) — Merge pull request #162 from weiesky/fix/file-browser-view-scope
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2cd4488ce9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2cd4488ce9)

- B0 血缘：相对第一父分支引入窗口内 8 条可达提交：[a99506d5f5](#commit-a99506d5f5), [1aca9b5f8f](#commit-1aca9b5f8f), [91b0055f2d](#commit-91b0055f2d), [5ee6739cba](#commit-5ee6739cba), [0c7195b689](#commit-0c7195b689), [9c36b5b5a7](#commit-9c36b5b5a7), [d89aa3b9af](#commit-d89aa3b9af), [ab1b89ee13](#commit-ab1b89ee13)。合并与分支变更不得重复计算。

- 提交时间：2026-10-26T21:26:59+08:00；作者时间：2026-10-26T21:26:59+08:00；父提交：b9d592fc13, a99506d5f5。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（121 个）：
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.module.css` → 本地候选：`src/components/approval/ToolApprovalPanel.module.css`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/optimisticQueueMessage.js` → 无直接路径匹配
  - `apps/web/src/components/chat/queuedPromptDisplay.js` → 无直接路径匹配
  - `apps/web/src/components/common/HoverPreviewTip.module.css` → 本地候选：`src/components/common/HoverPreviewTip.module.css`
  - `apps/web/src/components/common/HtmlPreviewModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/MemoryDetailModal.jsx` → 本地候选：`src/components/common/MemoryDetailModal.jsx`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/common/useMemoryLinkTip.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.jsx` → 本地候选：`src/components/dashboard/CachePopoverContent.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.module.css` → 本地候选：`src/components/dashboard/CachePopoverContent.module.css`
  - `apps/web/src/components/dashboard/LiveTagPopover.jsx` → 本地候选：`src/components/dashboard/LiveTagPopover.jsx`
  - `apps/web/src/components/dashboard/SdkContextComposition.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextComposition.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextPalette.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageProvider.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageTab.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageTab.module.css` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/fileContextMenuActions.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/fileMove.js` → 无直接路径匹配
  - `apps/web/src/components/files/importFiles.js` → 无直接路径匹配
  - `apps/web/src/components/terminal/TerminalWsContext.jsx` → 本地候选：`src/components/terminal/TerminalWsContext.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/commandValidator.js` → 本地候选：`src/utils/commandValidator.js`
  - `apps/web/src/utils/contextUsageView.js` → 无直接路径匹配
  - `apps/web/src/utils/fileOpen.js` → 本地候选：`src/utils/fileOpen.js`
  - `apps/web/src/utils/markdown.js` → 本地候选：`src/utils/markdown.js`
  - `apps/web/src/utils/planAutoApprove.js` → 无直接路径匹配
  - `apps/web/src/utils/responseThinking.js` → 无直接路径匹配
  - `apps/web/src/utils/sessionManager.js` → 本地候选：`src/utils/sessionManager.js`
  - `apps/web/src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `apps/web/src/utils/v3Assembler.js` → 无直接路径匹配
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `apps/web/src/utils/viewStateCache.js` → 无直接路径匹配
  - `apps/web/test/chat-file-open-scope.test.js` → 无直接路径匹配
  - `apps/web/test/commandValidator.test.js` → 无直接路径匹配
  - `apps/web/test/context-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/context-usage-view.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-context-menu-actions.test.js` → 无直接路径匹配
  - `apps/web/test/file-move.test.js` → 无直接路径匹配
  - `apps/web/test/file-open.test.js` → 无直接路径匹配
  - `apps/web/test/files-import.test.js` → 无直接路径匹配
  - `apps/web/test/fixtures/sdk-context-provider-probe.jsx` → 无直接路径匹配
  - `apps/web/test/html-preview-scope.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-chat.test.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-message.test.js` → 无直接路径匹配
  - `apps/web/test/plan-approval-panel.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-target.test.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `apps/web/test/queued-prompt-display.test.js` → 无直接路径匹配
  - `apps/web/test/response-thinking-chat.test.js` → 无直接路径匹配
  - `apps/web/test/response-thinking.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-blood-bar.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-provider.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-usage-tab.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-panel-stable-dispatch.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-workspace-anchors.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-ws-attach.test.js` → 无直接路径匹配
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `apps/web/test/view-state-cache.test.js` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2_PLAN.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `docs/research/kimi-thinking-sdk-investigation.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/lib/chat-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-executor.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/v2/conversation-store.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/lib/view-root.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/routes/sdk-context.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-project-memory.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/chat-queue.test.js` → 无直接路径匹配
  - `packages/app/test/files-fs-deep.test.js` → 无直接路径匹配
  - `packages/app/test/files-view-write.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-instance.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-executor.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-context-route.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-registry.test.js` → 无直接路径匹配
  - `packages/app/test/v2-core.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project-r4.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project.test.js` → 无直接路径匹配
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配
  - `packages/core/src/contentFilter.js` → 本地候选：`src/utils/contentFilter.js`
  - `packages/core/src/queued-prompt.js` → 无直接路径匹配
  - `packages/core/src/v2-transcript-normalizer.js` → 无直接路径匹配
  - `packages/core/test/fixtures/queued-prompt-real-formats.json` → 无直接路径匹配
  - `packages/core/test/queued-prompt.test.js` → 无直接路径匹配
  - `packages/core/test/v2-transcript-normalizer.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `test/content-filter-unit.test.js` → 无直接路径匹配
  - `test/v3-assembler.test.js` → 无直接路径匹配

<a id="commit-a99506d5f5"></a>
## [a99506d5f5](https://github.com/weiesky/cc-viewer/commit/a99506d5f53295fe5cb7c2d0403473305a19da4b) — chore(release): 1.9.15
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a99506d5f5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a99506d5f5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-26T21:20:41+08:00；作者时间：2026-10-26T21:20:41+08:00；父提交：1aca9b5f8f。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（9 个）：
  - `.changeset/calm-files-follow-view.md` → 无直接路径匹配
  - `.changeset/calm-sdk-context-bars.md` → 无直接路径匹配
  - `.changeset/fair-context-usage-colors.md` → 无直接路径匹配
  - `.changeset/quiet-prompts-dispatch.md` → 无直接路径匹配
  - `.changeset/sdk-plan-auto-approve.md` → 无直接路径匹配
  - `.changeset/tidy-thinking-turns.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-1aca9b5f8f"></a>
## [1aca9b5f8f](https://github.com/weiesky/cc-viewer/commit/1aca9b5f8f207903a7516a8036a7fa590808ca16) — fix(chat): restore queued prompts and queue dispatch state
- 2026-11-21 B4 E63：补实际SDK full-surface与PTY队列范围对照，B4中断/身份/审批/提示等见既有E笔；普通PTY队列原B0/规划B7尚未迁入、旧IM B11/promptpin B8等保持未完成。G1–G5最终GUI因双CUA通道失败待验，不整笔勾选，见[B4.66](./B4-implementation.md)与[B4收口矩阵](./B4-completion-matrix.md)。
- 467fbf3补SDK规范回合时间戳及冷热pending回声一致性，现代Viewer恢复反馈带明确标记；全量1281/1281、构建、685文件新生产安装66/66通过。实际GUI立即发送顺序和占位清理通过，其他GUI及用户最新预期差异仍待核实。
- 持续收尾`671547d`补Stop暂停保留/立即发送/单派发锁，`c11609f`运行中输入及epoch重放，`a8df3db`模式发现前冷加载快照，`8246408`失败后续发历史前缀。全量最新1277/1277、构建；实际Safari暂停/刷新与Chrome运行中刷新通过，剩余GUI继续。
- 2026-11-19继续部分实施：`3a6ea4e`逐发送回执，`b3922ef`权威队列/重连/拒绝草稿恢复，`94d4558`按实例ID移除，`285e51f`补compact布局。全量最终1269/1269、构建，683文件新生产安装61/61通过。删除不影响当前turn和重复文本；Stop/立即发送策略待用户选择、GUI未验收，不标整条完成。
- 2026-11-19 B2部分实施：本地`7dbf4ec`完成按实例稳定消息ID、queued/dispatching快照与WS重连、50条显式拒绝及代次隔离；定向27/27，全量1256/1256、构建通过。界面/删除/send-now和回执仍待，Stop语义已询问，不标整条完成。
- B0 本地关键代码对照：本地 sdk-manager.js 有字符串 _messageQueue，ChatView.jsx 有 ask 提交队列但不能等同用户消息队列；上游覆盖 UI 乐观状态、断线与回声匹配，须验证 dispatch、取消与重复发送，归 B2/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-1aca9b5f8f)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1aca9b5f8f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1aca9b5f8f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-26T20:34:56+08:00；作者时间：2026-10-26T20:34:56+08:00；父提交：91b0055f2d。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（45 个）：
  - `.changeset/quiet-prompts-dispatch.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/optimisticQueueMessage.js` → 无直接路径匹配
  - `apps/web/src/components/chat/queuedPromptDisplay.js` → 无直接路径匹配
  - `apps/web/src/components/terminal/TerminalWsContext.jsx` → 本地候选：`src/components/terminal/TerminalWsContext.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/markdown.js` → 本地候选：`src/utils/markdown.js`
  - `apps/web/src/utils/sessionManager.js` → 本地候选：`src/utils/sessionManager.js`
  - `apps/web/src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `apps/web/src/utils/v3Assembler.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-chat.test.js` → 无直接路径匹配
  - `apps/web/test/optimistic-queue-message.test.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `apps/web/test/queued-prompt-display.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-workspace-anchors.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-ws-attach.test.js` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2_PLAN.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/chat-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/v2/conversation-store.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/chat-queue.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-instance.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/v2-core.test.js` → 无直接路径匹配
  - `packages/core/src/contentFilter.js` → 本地候选：`src/utils/contentFilter.js`
  - `packages/core/src/queued-prompt.js` → 无直接路径匹配
  - `packages/core/src/v2-transcript-normalizer.js` → 无直接路径匹配
  - `packages/core/test/fixtures/queued-prompt-real-formats.json` → 无直接路径匹配
  - `packages/core/test/queued-prompt.test.js` → 无直接路径匹配
  - `packages/core/test/v2-transcript-normalizer.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `test/content-filter-unit.test.js` → 无直接路径匹配
  - `test/v3-assembler.test.js` → 无直接路径匹配

<a id="commit-b9d592fc13"></a>
## [b9d592fc13](https://github.com/weiesky/cc-viewer/commit/b9d592fc13fa01acab96432a28c764864fb4729a) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b9d592fc13)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b9d592fc13)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-26T08:52:30+00:00；作者时间：2026-10-26T08:52:30+00:00；父提交：c23590396f。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-91b0055f2d"></a>
## [91b0055f2d](https://github.com/weiesky/cc-viewer/commit/91b0055f2d781bbde687cc11d90b47baa22b23e4) — fix(sdk): honor plan auto-approval settings
- B0 本地关键代码对照：上游 SDK Plan 自动审批与设置一致；本地 ChatView.jsx 存在 SDK pendingPlanApproval 和 PTY 倒计时，注释说明 Plan 自动审批仅 PTY。需验证 Codex 是否提供等价审批并明确权限策略，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-91b0055f2d)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-91b0055f2d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-91b0055f2d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-26T13:00:11+08:00；作者时间：2026-10-26T13:00:11+08:00；父提交：5ee6739cba。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（22 个）：
  - `.changeset/sdk-plan-auto-approve.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.module.css` → 本地候选：`src/components/approval/ToolApprovalPanel.module.css`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/planAutoApprove.js` → 无直接路径匹配
  - `apps/web/test/plan-approval-panel.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-runtime.test.js` → 无直接路径匹配
  - `apps/web/test/plan-auto-approve-target.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/branch-routes-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配

<a id="commit-5ee6739cba"></a>
- 2026-11-20 B4 E51源码/协议范围核定：实际diff及固定最终PlanApprovalForm/target helper、后续fallback倒计时已核。Claude canUseTool ExitPlanMode与Codex原生plan通知不同；实际0.169 experimental全11种ServerRequest无计划审批，保持E41只读与通道守卫。通用隔离/重连/最小化/终态复用B2/E5/E35–41既验；自动策略B9、元数据等B11单列，不伪造UI或勾整条。仅审计/实际schema生成，无新运行时或重跑声明，见[B4.54](./B4-implementation.md#b454-e51-计划审批协议与候选范围核定源码审计无运行时变动)。

## [5ee6739cba](https://github.com/weiesky/cc-viewer/commit/5ee6739cbaba22a6a6d341c020bb7d54c493e5d0) — feat: merge SDK context usage into blood bars
- 2026-11-21 B4 E60：已选原Context分类入口/居中不可用态，Codex无真实分类producer、现有用量条保持；相关Provider/fetch/timer/palette不新增空实现。55组件+7用量/1579完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过；GUI待、其他混合范围不整体勾选。具体源码阅读/适配边界见[B4.63](./B4-implementation.md)及[B4分类回执](./B4-context-unavailable-2026-11-21.json)。
- B0 本地关键代码对照：上游把 SDK 用量并入多处血条及详情；本地 appserver-bridge.js 捕获 modelContextWindow，helpers.js 使用固定 353K 合约。须按实际 Codex usage 明确数值优先级、断线和多会话归属，归 B2/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-5ee6739cba)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5ee6739cba)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5ee6739cba)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-25T23:39:32+08:00；作者时间：2026-10-25T23:39:32+08:00；父提交：0c7195b689。
- 初筛批次：**G / 定时任务**；状态：待人工核验。
- 处理建议：作为新能力评估；绑定 Codex 会话身份、权限、重启恢复及时区语义。
- 上游改动路径（41 个）：
  - `.changeset/calm-sdk-context-bars.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/common/HoverPreviewTip.module.css` → 本地候选：`src/components/common/HoverPreviewTip.module.css`
  - `apps/web/src/components/common/MemoryDetailModal.jsx` → 本地候选：`src/components/common/MemoryDetailModal.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/common/useMemoryLinkTip.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.jsx` → 本地候选：`src/components/dashboard/CachePopoverContent.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.module.css` → 本地候选：`src/components/dashboard/CachePopoverContent.module.css`
  - `apps/web/src/components/dashboard/LiveTagPopover.jsx` → 本地候选：`src/components/dashboard/LiveTagPopover.jsx`
  - `apps/web/src/components/dashboard/SdkContextComposition.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextComposition.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextPalette.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageProvider.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageTab.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageTab.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/contextUsageView.js` → 无直接路径匹配
  - `apps/web/test/context-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/context-usage-view.test.js` → 无直接路径匹配
  - `apps/web/test/fixtures/sdk-context-provider-probe.jsx` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-blood-bar.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-provider.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-usage-tab.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-panel-stable-dispatch.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-executor.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/sdk-context.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-project-memory.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-executor.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-context-route.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-registry.test.js` → 无直接路径匹配
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配

<a id="commit-0c7195b689"></a>
## [0c7195b689](https://github.com/weiesky/cc-viewer/commit/0c7195b68967f3c92a84b5ea5e0c271672c798e0) — fix(web): refresh changes after git commits
- 2026-11-20 B3当前结论：563a51d迁入git commit命令分类；真实ToolFileChangeController覆盖成功刷新、失败/只读不刷新、重复结果幂等。仅B3刷新信号完成，其他Git能力按B5核对。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0c7195b689)
- B0 status: Adapt in B3/B5: git commit does not trigger the local mutation classifier.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0c7195b689)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-25T18:32:10+08:00；作者时间：2026-10-25T18:32:10+08:00；父提交：9c36b5b5a7。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 code comparison: B3/B5; local isMutatingCommand rejects git commit; verify refresh path and add regression coverage. See [B0 evidence](./B0-commit-lineage.md#b0-code-findings).
- B0 人工分流：B3/B5；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（4 个）：
  - `apps/web/src/utils/commandValidator.js` → 本地候选：`src/utils/commandValidator.js`
  - `apps/web/test/commandValidator.test.js` → 无直接路径匹配
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `history.md` → 无直接路径匹配


<a id="commit-9c36b5b5a7"></a>
## [9c36b5b5a7](https://github.com/weiesky/cc-viewer/commit/9c36b5b5a74eff61c88d27bdea1537666e771a73) — fix(web): stabilize context usage colors and scrolling
- 2026-11-21 B4 E60：已选原Context分类入口/居中不可用态，Codex无真实分类producer、现有用量条保持；相关Provider/fetch/timer/palette不新增空实现。55组件+7用量/1579完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过；GUI待、其他混合范围不整体勾选。具体源码阅读/适配边界见[B4.63](./B4-implementation.md)及[B4分类回执](./B4-context-unavailable-2026-11-21.json)。
- B0 本地关键代码对照：上游调整 SDK 详细上下文用量颜色与滚动；本地 src/utils/helpers.js 和 dashboard 上下文展示为 Codex 数据，需用长列表、不同主题及空数据对照，归 B7/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-9c36b5b5a7)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9c36b5b5a7)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9c36b5b5a7)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-25T18:09:42+08:00；作者时间：2026-10-25T18:09:42+08:00；父提交：d89aa3b9af。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（7 个）：
  - `.changeset/fair-context-usage-colors.md` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageTab.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageTab.module.css` → 无直接路径匹配
  - `apps/web/src/utils/contextUsageView.js` → 无直接路径匹配
  - `apps/web/test/context-usage-view.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-usage-tab.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-d89aa3b9af"></a>
## [d89aa3b9af](https://github.com/weiesky/cc-viewer/commit/d89aa3b9af9703c2c350dcfa14eefbcd3215ecc5) — fix(web): restore SDK thinking per assistant turn
- B0 本地关键代码对照：上游修复每个 assistant turn 的 SDK thinking 来源与缓存；本地 conversationEntryNormalize.js 能把 Codex reasoning 转成 thinking，sessionMerge.js 另做合并。需实际事件回放检查轮次、刷新和多会话，不直接套 Claude 格式，归 B3/B4。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-d89aa3b9af)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d89aa3b9af)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d89aa3b9af)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-25T03:33:30+08:00；作者时间：2026-10-25T01:44:32+08:00；父提交：ab1b89ee13。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（15 个）：
  - `.changeset/tidy-thinking-turns.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/responseThinking.js` → 无直接路径匹配
  - `apps/web/src/utils/sessionManager.js` → 本地候选：`src/utils/sessionManager.js`
  - `apps/web/src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `apps/web/src/utils/viewStateCache.js` → 无直接路径匹配
  - `apps/web/test/response-thinking-chat.test.js` → 无直接路径匹配
  - `apps/web/test/response-thinking.test.js` → 无直接路径匹配
  - `apps/web/test/view-state-cache.test.js` → 无直接路径匹配
  - `docs/research/kimi-thinking-sdk-investigation.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-ab1b89ee13"></a>
## [ab1b89ee13](https://github.com/weiesky/cc-viewer/commit/ab1b89ee133664c9f2c0e3e17ada8711180f4dc5) — fix(files): scope file operations to viewed project
- B0 本地关键代码对照：上游文件读写、移动、上传和 HTML 预览均绑定 viewed project；本地 server.js 多处使用 process.env.CXV_PROJECT_DIR，lib/file-api.js 接收 cwd。应首先为两个工作区构造隔离访问测试，避免跨项目读写，归 B2/B5/B6。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-ab1b89ee13)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ab1b89ee13)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ab1b89ee13)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-24T20:57:57+08:00；作者时间：2026-10-24T20:57:57+08:00；父提交：c23590396f。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（27 个）：
  - `.changeset/calm-files-follow-view.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/common/HtmlPreviewModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/fileContextMenuActions.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/fileMove.js` → 无直接路径匹配
  - `apps/web/src/components/files/importFiles.js` → 无直接路径匹配
  - `apps/web/src/utils/fileOpen.js` → 本地候选：`src/utils/fileOpen.js`
  - `apps/web/test/chat-file-open-scope.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-context-menu-actions.test.js` → 无直接路径匹配
  - `apps/web/test/file-move.test.js` → 无直接路径匹配
  - `apps/web/test/file-open.test.js` → 无直接路径匹配
  - `apps/web/test/files-import.test.js` → 无直接路径匹配
  - `apps/web/test/html-preview-scope.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/view-root.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/files-fs-deep.test.js` → 无直接路径匹配
  - `packages/app/test/files-view-write.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project-r4.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project.test.js` → 无直接路径匹配

<a id="commit-c23590396f"></a>
## [c23590396f](https://github.com/weiesky/cc-viewer/commit/c23590396ff1d63f6f23f925f015889d26bfc3b1) — chore(release): 1.9.14
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c23590396f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c23590396f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-24T16:08:19+08:00；作者时间：2026-10-24T16:08:19+08:00；父提交：f2ebb0fe6b。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/fuzzy-k3-kimi.md` → 无直接路径匹配
  - `.changeset/resume-route-test-deps.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-f2ebb0fe6b"></a>
## [f2ebb0fe6b](https://github.com/weiesky/cc-viewer/commit/f2ebb0fe6b796e9f508cf44f13f0ebf5aa67ef13) — Merge pull request #161 from weiesky/fix/kimi-k3-model-aliases
- [B0 upstream full commit message](./B0-upstream-messages.md#message-f2ebb0fe6b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-f2ebb0fe6b)

- B0 血缘：相对第一父分支引入窗口内 3 条可达提交：[0e1546e718](#commit-0e1546e718), [6bc7781bba](#commit-6bc7781bba), [6363a51ec0](#commit-6363a51ec0)。合并与分支变更不得重复计算。

- 提交时间：2026-10-24T16:06:49+08:00；作者时间：2026-10-24T16:06:49+08:00；父提交：47827e973a, 0e1546e718。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（15 个）：
  - `.changeset/fuzzy-k3-kimi.md` → 无直接路径匹配
  - `.changeset/resume-route-test-deps.md` → 无直接路径匹配
  - `apps/web/src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `apps/web/test/helpers-unit-a.test.js` → 无直接路径匹配
  - `apps/web/test/helpers.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/test/builtin-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/model-system-prompts.test.js` → 本地候选：`tests/model-system-prompts.test.js`
  - `packages/app/test/resume-route.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-builder.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-files.test.js` → 无直接路径匹配
  - `packages/core/src/context-rules.js` → 本地候选：`server/lib/context-rules.js`
  - `packages/core/test/context-rules.test.js` → 无直接路径匹配

<a id="commit-0e1546e718"></a>
## [0e1546e718](https://github.com/weiesky/cc-viewer/commit/0e1546e71878b0a4a0e91e146617d2ead5abb576) — merge: isolate resume route PTY fixtures
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0e1546e718)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0e1546e718)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[6bc7781bba](#commit-6bc7781bba)。合并与分支变更不得重复计算。

- 提交时间：2026-10-24T16:01:24+08:00；作者时间：2026-10-24T16:01:24+08:00；父提交：6363a51ec0, 6bc7781bba。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并存在冲突或错误；实际树相对自动合并树的差异路径：`history.md`。该结果不证明业务语义已审查。
- B0 冲突解决复核：`git show --cc` 显示合并树冲突解决仅涉及 `history.md`；其父分支的产品变更仍需逐项审查，不能由此判定功能不适用。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（3 个）：
  - `.changeset/resume-route-test-deps.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/test/resume-route.test.js` → 无直接路径匹配

<a id="commit-6bc7781bba"></a>
## [6bc7781bba](https://github.com/weiesky/cc-viewer/commit/6bc7781bba12f6e2c13c3e2f84a2419c816b90a0) — test: isolate resume route PTY fixtures
- B0 本地关键代码对照：上游隔离 resume route PTY fixtures；本地需核对 sdk-manager 与 PTY 测试是否调用真实可执行文件或占用真实用户进程，归 B2/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-6bc7781bba)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6bc7781bba)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6bc7781bba)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-24T16:00:44+08:00；作者时间：2026-10-24T16:00:44+08:00；父提交：47827e973a。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（3 个）：
  - `.changeset/resume-route-test-deps.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/test/resume-route.test.js` → 无直接路径匹配

<a id="commit-6363a51ec0"></a>
## [6363a51ec0](https://github.com/weiesky/cc-viewer/commit/6363a51ec02f7b0518df69095dc382b26406ece4) — fix: recognize Kimi K3 model aliases
- B0 本地关键代码对照：上游补充 Kimi K3 别名同时改前端模型识别、prompt 与预设测试；本地 model-system-prompts.js 只有包含匹配、前端 helpers 有独立规则。依实际模型支持验证别名，不把所有非 Codex 模型自动开启，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-6363a51ec0)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6363a51ec0)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6363a51ec0)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-24T15:52:35+08:00；作者时间：2026-10-24T15:52:35+08:00；父提交：47827e973a。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（13 个）：
  - `.changeset/fuzzy-k3-kimi.md` → 无直接路径匹配
  - `apps/web/src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `apps/web/test/helpers-unit-a.test.js` → 无直接路径匹配
  - `apps/web/test/helpers.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/test/builtin-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/model-system-prompts.test.js` → 本地候选：`tests/model-system-prompts.test.js`
  - `packages/app/test/system-prompt-builder.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-files.test.js` → 无直接路径匹配
  - `packages/core/src/context-rules.js` → 本地候选：`server/lib/context-rules.js`
  - `packages/core/test/context-rules.test.js` → 无直接路径匹配

<a id="commit-47827e973a"></a>
## [47827e973a](https://github.com/weiesky/cc-viewer/commit/47827e973a1c9480ce4a34b08a619cdb18b757dd) — chore(release): 1.9.13
- [B0 upstream full commit message](./B0-upstream-messages.md#message-47827e973a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-47827e973a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-24T03:46:45+08:00；作者时间：2026-10-24T03:46:45+08:00；父提交：451ef48d6a。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `.changeset/scheduled-tasks.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-451ef48d6a"></a>
## [451ef48d6a](https://github.com/weiesky/cc-viewer/commit/451ef48d6a7dc73347d49e3d2d13cf8fafccad8f) — feat(server+web): scheduled tasks — storage in preferences.json + run history split + modal UX polish
- B0 本地关键代码对照：上游定时任务涉及配置与运行历史拆分、严格写入、私有文件访问控制、旧版只读迁移、幂等认领和重启恢复，还包括 modal；本地未发现同名 scheduler。若实现须分开持久化与执行、拒绝重复触发及凭据泄漏，归 B1/B9。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-451ef48d6a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-451ef48d6a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-451ef48d6a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-24T03:45:08+08:00；作者时间：2026-10-24T03:45:08+08:00；父提交：177b85df2c。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（30 个）：
  - `.changeset/scheduled-tasks.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/components/common/ScheduleTaskModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/ScheduleTaskModal.module.css` → 无直接路径匹配
  - `apps/web/test/schedule-modal-anchor.test.js` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/config-cloud-sync.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/config-backup.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/json-store.js` → 无直接路径匹配
  - `packages/app/server/lib/project-prefs.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-runs-store.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-scheduler.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-store.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/routes/scheduled-tasks.js` → 无直接路径匹配
  - `packages/app/test/api-preferences-gap.test.js` → 无直接路径匹配
  - `packages/app/test/file-access-policy.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配
  - `packages/app/test/json-store.test.js` → 无直接路径匹配
  - `packages/app/test/project-prefs.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-routes.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-runs-store.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-scheduler.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-store.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-177b85df2c"></a>
## [177b85df2c](https://github.com/weiesky/cc-viewer/commit/177b85df2cab3358dfec08cfc5591da29e27a8d1) — feat(server+web): add scheduled tasks ("设置定时任务")
- [B0 upstream full commit message](./B0-upstream-messages.md#message-177b85df2c)
- B0 status: Adapt in B9 after scheduling and authorization design: no product scheduler found.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-177b85df2c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-23T17:39:51+08:00；作者时间：2026-10-23T17:39:51+08:00；父提交：abdca8545c。
- B0 本地代码对照：已核验关键入口和上游目标；结论及尚需测试事项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**G / 定时任务**；状态：待人工核验。
- 处理建议：作为新能力评估；绑定 Codex 会话身份、权限、重启恢复及时区语义。
- 上游改动路径（57 个）：
  - `.changeset/scheduled-tasks.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/package.json` → 本地候选：`package.json`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/common/ScheduleTaskModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/ScheduleTaskModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/common/quickMenuIcons.jsx` → 本地候选：`src/components/common/quickMenuIcons.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/scheduleDescription.js` → 无直接路径匹配
  - `apps/web/src/utils/scheduledTaskEvents.js` → 无直接路径匹配
  - `apps/web/test/schedule-description.test.js` → 无直接路径匹配
  - `apps/web/test/schedule-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/schedule-modal-anchor.test.js` → 无直接路径匹配
  - `apps/web/test/scratch-workspace-switch.test.js` → 无直接路径匹配
  - `apps/web/test/sse-connection-gen.test.js` → 无直接路径匹配
  - `apps/web/test/upload-plus-menu.test.js` → 无直接路径匹配
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/chat-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/cron.js` → 无直接路径匹配
  - `packages/app/server/lib/schedule-model.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-executor.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-scheduler.js` → 无直接路径匹配
  - `packages/app/server/lib/scheduled-task-store.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/scheduled-tasks.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/chat-queue.test.js` → 无直接路径匹配
  - `packages/app/test/cron.test.js` → 无直接路径匹配
  - `packages/app/test/schedule-model.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-executor.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-routes.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-scheduler.test.js` → 无直接路径匹配
  - `packages/app/test/scheduled-task-store.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-ephemeral.test.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-abdca8545c"></a>
## [abdca8545c](https://github.com/weiesky/cc-viewer/commit/abdca8545cf9199a8a422ac3d2ea3834854ef3a2) — chore(release): 1.9.12
- [B0 upstream full commit message](./B0-upstream-messages.md#message-abdca8545c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-abdca8545c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-23T11:34:46+08:00；作者时间：2026-10-23T11:34:46+08:00；父提交：117ee25de2。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/input-stack-scrollbar-bleed.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-117ee25de2"></a>
## [117ee25de2](https://github.com/weiesky/cc-viewer/commit/117ee25de22e82dd4891e98c88117a7d5c704ffe) — fix(web): leave a scrollbar bleed on the input stack gradient (#160)
- B0 本地关键代码对照：上游为浮动输入渐变留 scrollbar gutter 且保持 pointer events；本地 ChatView.module.css 存在 inputStack，但具体浮动行为需实测 classic/overlay 滚动条与键盘操作，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-117ee25de2)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-117ee25de2)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-117ee25de2)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-23T11:30:41+08:00；作者时间：2026-10-23T11:30:41+08:00；父提交：5d39fa11f3。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（6 个）：
  - `.changeset/input-stack-scrollbar-bleed.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/test/floating-input-stack.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-5d39fa11f3"></a>
## [5d39fa11f3](https://github.com/weiesky/cc-viewer/commit/5d39fa11f3d14e480ca46c9adad669048b19756f) — chore(release): 1.9.11
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5d39fa11f3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5d39fa11f3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-23T03:01:00+08:00；作者时间：2026-10-23T02:59:00+08:00；父提交：3bd2aa9696。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/chat-ghost-two-line-clamp.md` → 无直接路径匹配
  - `.changeset/proxy-chip-to-input-bar.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-3bd2aa9696"></a>
## [3bd2aa9696](https://github.com/weiesky/cc-viewer/commit/3bd2aa96961379537a8ccfb50667cab4b2335aa9) — fix(ci): bump-homebrew tarball 下载加重试 (#159)
- B0 本地关键代码对照：混合 Homebrew CDN 下载重试及 ghost suggestion 两行裁剪与 ResizeObserver；本地无同名 Homebrew workflow，聊天输入已有 inputSuggestion。分别评估发布流程和长文本覆盖、IME、移动端，拆归 B7/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-3bd2aa9696)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3bd2aa9696)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3bd2aa9696)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-23T02:56:44+08:00；作者时间：2026-10-23T02:56:44+08:00；父提交：c66b5fe2ed。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（6 个）：
  - `.changeset/chat-ghost-two-line-clamp.md` → 无直接路径匹配
  - `.github/workflows/bump-homebrew.yml` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/test/chat-ghost-clamp.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-c66b5fe2ed"></a>
## [c66b5fe2ed](https://github.com/weiesky/cc-viewer/commit/c66b5fe2ed6e855f0610127eba3de96ac821adea) — feat(web): move proxy hot-switch chip into the chat input bar (#158)
- B0 本地关键代码对照：上游将 proxy chip 移入输入栏、终端展示回退及 iPad drawer 无障碍；本地 AppHeader.jsx 当前展示 profile，需验证 SDK/PTTY、Electron、移动端及 aria/inert，归 B7/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-c66b5fe2ed)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c66b5fe2ed)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c66b5fe2ed)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-23T01:32:00+08:00；作者时间：2026-10-23T01:32:00+08:00；父提交：c6f887c385。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（17 个）：
  - `.changeset/proxy-chip-to-input-bar.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/App.module.css` → 本地候选：`src/App.module.css`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ProxyChip.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/ProxyChip.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `apps/web/src/components/settings/ProxyModal.jsx` → 本地候选：`src/components/settings/ProxyModal.jsx`
  - `apps/web/src/utils/sdkModelChip.js` → 无直接路径匹配
  - `apps/web/test/proxy-chip-label.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-model-wiring.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-c6f887c385"></a>
- 2026-11-20 B4 E49：133原模型状态/chip与c66固定最终输入slot迁位、原CSS/helper、iPad portal/closed inert已核并适配Codex既有模型快照；完整1564/1564、构建、安装285、Safari空闲刷新/同名隔离/代理优先/强制pad-phone通过，总模型turn0。角色代理B8及Context/文档等混合项仍待，不整条完成；见[B4.52](./B4-implementation.md#b452-e49-模型chip按固定最终位置接入)。

## [c6f887c385](https://github.com/weiesky/cc-viewer/commit/c6f887c3853dd30d4f91728a275c41ae0d9c4bd8) — chore(release): 1.9.10
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c6f887c385)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c6f887c385)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-22T22:22:29+08:00；作者时间：2026-10-22T22:22:29+08:00；父提交：e8ea1ae96a。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（5 个）：
  - `.changeset/ccv-server-log-gate.md` → 无直接路径匹配
  - `.changeset/plugin-service-dirs.md` → 无直接路径匹配
  - `.changeset/sdk-error-dialogue.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-e8ea1ae96a"></a>
## [e8ea1ae96a](https://github.com/weiesky/cc-viewer/commit/e8ea1ae96a950a7293b3f20507772c733d98570b) — docs(history): classify backlogged Unreleased entries into 1.9.4~1.9.9 sections
- B0 本地关键代码对照：上游仅整理历史版本日志，不应搬运为本项目发布事实；功能提交仍单独检查，本地变更日志策略归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-e8ea1ae96a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-e8ea1ae96a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-e8ea1ae96a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-22T22:22:29+08:00；作者时间：2026-10-22T22:22:29+08:00；父提交：58493d1c85。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（1 个）：
  - `history.md` → 无直接路径匹配

<a id="commit-58493d1c85"></a>
## [58493d1c85](https://github.com/weiesky/cc-viewer/commit/58493d1c859f0875395b34bf2e21ebe7a01ee5db) — feat(plugins): directory service plugins with same-port proxy + remote React panels
- [B0 upstream full commit message](./B0-upstream-messages.md#message-58493d1c85)
- B0 status: Adapt in B10 after service and permission design: local JS hook plugins exist.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-58493d1c85)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-22T22:11:06+08:00；作者时间：2026-10-22T22:11:06+08:00；父提交：9967ebdbc2。
- B0 本地代码对照：已核验关键入口和上游目标；结论及尚需测试事项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**H / 插件与扩展**；状态：待人工核验。
- 处理建议：对比现有 hook 插件接口；评估服务生命周期、授权和代理隔离。
- 上游改动路径（67 个）：
  - `.changeset/plugin-service-dirs.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/electron/electron/tab-bar.html` → 本地候选：`electron/tab-bar.html`
  - `apps/web/src/App.module.css` → 本地候选：`src/App.module.css`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/mobile/MobileDrawerCloseButton.jsx` → 本地候选：`src/components/mobile/MobileDrawerCloseButton.jsx`
  - `apps/web/src/components/plugins/PanelHost.jsx` → 无直接路径匹配
  - `apps/web/src/components/plugins/PanelHost.module.css` → 无直接路径匹配
  - `apps/web/src/components/plugins/PluginPanelModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/plugins/panelIcons.jsx` → 无直接路径匹配
  - `apps/web/src/components/plugins/panelRuntime.js` → 无直接路径匹配
  - `apps/web/src/components/settings/PluginModal.jsx` → 本地候选：`src/components/settings/PluginModal.jsx`
  - `apps/web/src/components/settings/PluginModal.module.css` → 本地候选：`src/components/settings/PluginModal.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/panelLoader.js` → 无直接路径匹配
  - `apps/web/src/utils/pluginPanels.js` → 无直接路径匹配
  - `apps/web/test/modal-mask.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/panel-loader.test.js` → 无直接路径匹配
  - `apps/web/test/plugin-panel-host.test.js` → 无直接路径匹配
  - `apps/web/test/plugin-panels-util.test.js` → 无直接路径匹配
  - `apps/web/vite.config.js` → 本地候选：`vite.config.js`
  - `docs/plugin-services.md` → 无直接路径匹配
  - `docs/plugin-services.zh.md` → 无直接路径匹配
  - `docs/plugin-templates/panel/build.mjs` → 无直接路径匹配
  - `docs/plugin-templates/panel/package.json` → 无直接路径匹配
  - `docs/plugin-templates/panel/plugin.json.example` → 无直接路径匹配
  - `docs/plugin-templates/panel/src/Panel.jsx` → 无直接路径匹配
  - `docs/plugins.md` → 无直接路径匹配
  - `docs/plugins.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/plugins/README.md` → 本地候选：`plugins/README.md`
  - `packages/app/server/lib/plugin-host.mjs` → 无直接路径匹配
  - `packages/app/server/lib/plugin-loader.js` → 本地候选：`lib/plugin-loader.js`
  - `packages/app/server/lib/plugin-manager.js` → 本地候选：`lib/plugin-manager.js`
  - `packages/app/server/lib/plugin-manifest.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-panels.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-proxy.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-runtime.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-service-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/same-origin.js` → 无直接路径匹配
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/server/routes/misc.js` → 无直接路径匹配
  - `packages/app/server/routes/plugin-services.js` → 无直接路径匹配
  - `packages/app/server/routes/plugins.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-files-fs-2.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/api-local-url-guard.test.js` → 无直接路径匹配
  - `packages/app/test/api-plugins-gap.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-plugins.test.js` → 无直接路径匹配
  - `packages/app/test/files-fs-deep.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-host.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-loader-service.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-manager-dir.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-panels.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-proxy.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-runtime.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-service-integration.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-service-manager.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-spawn-test-guard.test.js` → 无直接路径匹配
  - `packages/app/test/same-origin.test.js` → 无直接路径匹配
  - `packages/app/test/server-malformed-host.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-9967ebdbc2"></a>
## [9967ebdbc2](https://github.com/weiesky/cc-viewer/commit/9967ebdbc2ea8e3ffded222ab2d2b7f708348697) — feat(web): rename AgentTeam menu label to localized quick-prompt wording
- B0 本地关键代码对照：上游对两个 quick-menu 共用标签做 18 语言本地化；本地 TerminalPanel 和 ChatInputBar 使用 ui.terminal.agentTeam，需统一术语并检查其他 uses 不被误改，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-9967ebdbc2)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9967ebdbc2)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9967ebdbc2)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-22T11:18:40+08:00；作者时间：2026-10-22T11:18:40+08:00；父提交：a336d3919f。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B7；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（2 个）：
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `history.md` → 无直接路径匹配

<a id="commit-a336d3919f"></a>
## [a336d3919f](https://github.com/weiesky/cc-viewer/commit/a336d3919f585712a1dcc608515e29589c0621f5) — feat(web): fold terminal toolbar upload into the sparkle quick-settings menu
- B0 本地关键代码对照：本地 TerminalPanel.jsx 有独立上传和 quickSettingsExpanded；上游将上传放入快捷设置且保持隐藏 input/通知链。需验证终端焦点、hover 与上传失败，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a336d3919f)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a336d3919f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a336d3919f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-22T11:11:32+08:00；作者时间：2026-10-22T11:11:32+08:00；父提交：9b1bb4e729。
- 初筛批次：**K / 终端与跨平台**；状态：待人工核验。
- 处理建议：检查现有 PTY/Electron/移动端链路；按平台复现，不直接复制 Claude 启动逻辑。
- 上游改动路径（3 个）：
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/test/upload-terminal-plus-menu.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-9b1bb4e729"></a>
## [9b1bb4e729](https://github.com/weiesky/cc-viewer/commit/9b1bb4e729473360cbe60e508f0558a702370a08) — fix(sdk): render turn/query failures as persistent rows in the dialogue tail
- 2026-11-20 B4 E14：原持久错误条、800px CSS逐字对齐、去重×N/3条上限/清理/读屏与SDK反馈投影。全量1462/1462、构建、Safari空/非空/隔离/入库单份展示通过；重试另待84e，发布元数据归B11。见B4.17。
- 2026-11-20 B4 E13：最终失败帧携带所属会话cwd/sessionId/instanceKey；复用严格WS实例隔离。24/24、构建通过；主动Stop不报警，历史保留。原持久错误条仍待，非整条完成，见B4.16。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9b1bb4e729)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9b1bb4e729)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-22T10:47:12+08:00；作者时间：2026-10-22T10:47:12+08:00；父提交：45bfa4124d。
- B0 本地关键代码对照：现有能力、协议差异和待测项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（13 个）：
  - `.changeset/sdk-error-dialogue.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/test/sdk-error-dialogue.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/cli-sdk-error-frame.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-registry.test.js` → 无直接路径匹配
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配

<a id="commit-45bfa4124d"></a>
## [45bfa4124d](https://github.com/weiesky/cc-viewer/commit/45bfa4124d73c034220405efdc32b8cf0fe74a20) — fix(server): gate [ccv:*] diagnostic logs on CCV_DEBUG
- 2026-11-20 B3：`2e4ecbd`迁入共享报告器及CXV_DEBUG包装，新mux沿用；既有其他服务器诊断点不因此整批改写或整体完成。详见[B3第二轮](./B3-transport-and-pagination.md)。
- B0 本地关键代码对照：上游将服务端可恢复诊断日志置于 CCV_DEBUG，前端不变；本地 server.js 部分日志已 gated by CXV_DEBUG，另有 src/utils/errorReport.js。须区分安全事件、用户错误和可恢复日志，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-45bfa4124d)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-45bfa4124d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-45bfa4124d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-22T10:43:06+08:00；作者时间：2026-10-22T10:43:06+08:00；父提交：baf4500607。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（43 个）：
  - `.changeset/ccv-server-log-gate.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/builtin-model-prompts.js` → 无直接路径匹配
  - `packages/app/server/lib/chat-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-access.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-migrate.js` → 无直接路径匹配
  - `packages/app/server/lib/error-report.js` → 无直接路径匹配
  - `packages/app/server/lib/json-store.js` → 无直接路径匹配
  - `packages/app/server/lib/launch-config.js` → 无直接路径匹配
  - `packages/app/server/lib/log-watcher.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-retry.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/lib/resume-watchdog.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-session-index.js` → 无直接路径匹配
  - `packages/app/server/lib/stats-worker.js` → 本地候选：`lib/stats-worker.js`
  - `packages/app/server/lib/system-prompt-files.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-live.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-snapshots.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/convert.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/jsonl-read.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/resume-list.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-list.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-owner.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/lib/wire-compress.js` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/expert.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/routes/sdk-context.js` → 无直接路径匹配
  - `packages/app/server/routes/sdk-mcp-status.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/test/server-error-report.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-baf4500607"></a>
## [baf4500607](https://github.com/weiesky/cc-viewer/commit/baf4500607ac30eb81fdab6ae80eb0f45364f367) — chore(release): 1.9.9
- [B0 upstream full commit message](./B0-upstream-messages.md#message-baf4500607)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-baf4500607)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T18:51:17+08:00；作者时间：2026-10-21T18:51:17+08:00；父提交：3c77d9a8ed。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `.changeset/slash-skill-menu.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-3c77d9a8ed"></a>
## [3c77d9a8ed](https://github.com/weiesky/cc-viewer/commit/3c77d9a8ed200dc8a2dfa4976ad22e20714e57f1) — Merge pull request #156 from weiesky/feat/slash-skill-menu-sdk-fixes
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3c77d9a8ed)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3c77d9a8ed)

- B0 血缘：相对第一父分支引入窗口内 5 条可达提交：[3cf3e9585f](#commit-3cf3e9585f), [9dbf4e295a](#commit-9dbf4e295a), [a2be00c45b](#commit-a2be00c45b), [51c23e9090](#commit-51c23e9090), [67ceb5b7f0](#commit-67ceb5b7f0)。合并与分支变更不得重复计算。

- 提交时间：2026-10-21T18:50:40+08:00；作者时间：2026-10-21T18:50:40+08:00；父提交：3d4f098f08, 3cf3e9585f。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（23 个）：
  - `.changeset/slash-skill-menu.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/SlashCommandMenu.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/SlashCommandMenu.module.css` → 无直接路径匹配
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/projectKeyFromCwd.js` → 无直接路径匹配
  - `apps/web/src/utils/slashCommandMenu.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/project-key-from-cwd.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配
  - `apps/web/test/slash-command-menu.test.js` → 无直接路径匹配
  - `apps/web/test/upload-plus-menu.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配

<a id="commit-3cf3e9585f"></a>
- 2026-11-20 B4 E52：实际SDK manager/server/AppBase/projectKey/CLI差异核定技能拉取与scope/replay边界，固定最终与84e65缓存/活性区别已读；67祖先/merge combined无新增resolution。B4复用B2/E5/E29/E40/E46既有实例/重连/真实探测，技能metadata与菜单留B7/B8，Codex真实skills/list存在但未迁。不以审计等于整条实现；无运行时或重跑声明，见[B4.55](./B4-implementation.md#b455-e52-斜杠菜单混合提交的sdk生命周期归属源码审计无运行时变动)。

## [3cf3e9585f](https://github.com/weiesky/cc-viewer/commit/3cf3e9585f9f93cb59b021a81d789c8f4ef5e528) — fix(web): (+) 菜单顶层「上传文件」行 hover 时收起残留的级联子菜单
- B0 本地关键代码对照：上游上传行 hover 清理级联菜单状态；本地 ChatInputBar.jsx 有 quickExpanded 与 hover controller，若上传行迁入菜单须测试斜向移动、焦点和子菜单收起，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-3cf3e9585f)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3cf3e9585f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3cf3e9585f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T18:48:08+08:00；作者时间：2026-10-21T18:48:08+08:00；父提交：9dbf4e295a。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（2 个）：
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/test/upload-plus-menu.test.js` → 无直接路径匹配

<a id="commit-9dbf4e295a"></a>
## [9dbf4e295a](https://github.com/weiesky/cc-viewer/commit/9dbf4e295a08e472c0b15cfb66de1cc80c77cfa3) — fix(web): SDK 模式打开终端不再隐藏对话输入框
- 2026-11-20 B4 E12：真实terminalVisible与sdkMode分传、原输入区/portal门控；持久化复用B2。Web267/267、构建、隔离Safari展开/编辑/开关刷新通过；录音未实例化。见[B4.15](./B4-implementation.md#b415-e12-scratch-输入区原始状态与可见性)。
- B0 本地关键代码对照：本地 ChatInputBar.jsx 在 terminalVisible 时早返回，且其 props 无 sdkMode；App.jsx 当前对 SDK 传 terminalVisible=false。应实测 scratch 终端开关的完整数据流，不能仅凭组件分支断言复现，归 B2/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-9dbf4e295a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9dbf4e295a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9dbf4e295a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T18:09:34+08:00；作者时间：2026-10-21T18:09:34+08:00；父提交：a2be00c45b。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（1 个）：
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`

<a id="commit-a2be00c45b"></a>
## [a2be00c45b](https://github.com/weiesky/cc-viewer/commit/a2be00c45b71be0faf6b8bf1e1e93916b9cc1eb7) — feat(web): 桌面文件上传收纳进 (+) 菜单
- B0 本地关键代码对照：本地 ChatInputBar.jsx 桌面仍有独立上传按钮并已有 quick menu 和上传链；上游移入 (+) 菜单，须保留粘贴/拖拽、键盘可访问和移动端，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a2be00c45b)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a2be00c45b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a2be00c45b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T17:57:20+08:00；作者时间：2026-10-21T17:55:45+08:00；父提交：51c23e9090。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（5 个）：
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/test/upload-plus-menu.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-51c23e9090"></a>
## [51c23e9090](https://github.com/weiesky/cc-viewer/commit/51c23e9090f349b983a2dba52c738c559da5bf1b) — fix(web): 修复 SDK 模式 plan 审批卡死
- [B0 upstream full commit message](./B0-upstream-messages.md#message-51c23e9090)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-51c23e9090)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T17:57:20+08:00；作者时间：2026-10-21T17:55:35+08:00；父提交：67ceb5b7f0。
- B0 本地关键代码对照：现有能力、协议差异和待测项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（5 个）：
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-plan-approval-guard.test.js` → 无直接路径匹配

<a id="commit-67ceb5b7f0"></a>
## [67ceb5b7f0](https://github.com/weiesky/cc-viewer/commit/67ceb5b7f0dcb7027843ef8d5e1cd2b5b4d1a506) — feat(web): "/" 弹出斜杠技能菜单
- [B0 upstream full commit message](./B0-upstream-messages.md#message-67ceb5b7f0)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-67ceb5b7f0)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T17:56:26+08:00；作者时间：2026-10-21T17:54:58+08:00；父提交：3d4f098f08。
- B0 本地关键代码对照：已核验上游能力及本地入口；结论和未验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（16 个）：
  - `.changeset/slash-skill-menu.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/SlashCommandMenu.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/SlashCommandMenu.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/projectKeyFromCwd.js` → 无直接路径匹配
  - `apps/web/src/utils/slashCommandMenu.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/project-key-from-cwd.test.js` → 无直接路径匹配
  - `apps/web/test/slash-command-menu.test.js` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配

<a id="commit-3d4f098f08"></a>
- 2026-11-20 B4 E52：实际SDK manager/server/AppBase/projectKey/CLI差异核定技能拉取与scope/replay边界，固定最终与84e65缓存/活性区别已读；67祖先/merge combined无新增resolution。B4复用B2/E5/E29/E40/E46既有实例/重连/真实探测，技能metadata与菜单留B7/B8，Codex真实skills/list存在但未迁。不以审计等于整条实现；无运行时或重跑声明，见[B4.55](./B4-implementation.md#b455-e52-斜杠菜单混合提交的sdk生命周期归属源码审计无运行时变动)。

## [3d4f098f08](https://github.com/weiesky/cc-viewer/commit/3d4f098f08211b53f5d5f58d4c17b603027f3899) — fix(web): stop askUserQuestion 'Other' input from triggering browser password save (#155)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3d4f098f08)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3d4f098f08)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T11:43:49+08:00；作者时间：2026-10-21T11:43:49+08:00；父提交：5d42d90533。
- B0 本地关键代码对照：已检查上游最终修改和本地入口；范围与后续风险见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**I / 权限与交互问答**；状态：待人工核验。
- 处理建议：核对 Codex 原生审批和用户输入；变更默认权限须独立决策。
- 上游改动路径（1 个）：
  - `apps/web/src/components/chat/AskQuestionForm.jsx` → 本地候选：`src/components/chat/AskQuestionForm.jsx`

<a id="commit-5d42d90533"></a>
## [5d42d90533](https://github.com/weiesky/cc-viewer/commit/5d42d90533c0ebab8d11d37ec9891d970979f030) — chore(release): 1.9.8
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5d42d90533)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5d42d90533)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T01:32:20+08:00；作者时间：2026-10-21T01:32:20+08:00；父提交：2847027b54。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `.changeset/permission-auto-approve-coverage.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-2847027b54"></a>
## [2847027b54](https://github.com/weiesky/cc-viewer/commit/2847027b548c8eefde55fd7910639bc8d623e429) — fix(server): 权限自动审批覆盖目录外 Read/Glob/Grep
- B0 本地关键代码对照：上游对目录外 Read/Glob/Grep 自动审批并可能授予 addDirectories，同时防止信任根、home 等；本地 lib/perm-bridge.js 为 Codex hook 与手动审批语义。此为权限边界变化，需核实 Codex 能力、信任范围及用户意图，不能默认放宽，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-2847027b54)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2847027b54)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2847027b54)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-21T01:29:53+08:00；作者时间：2026-10-21T01:25:55+08:00；父提交：51dec0fbe1。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（14 个）：
  - `.changeset/permission-auto-approve-coverage.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/approval-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/ask/perm-request-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/ensure-hooks.js` → 本地候选：`lib/ensure-hooks.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/ensure-hooks.test.js` → 本地候选：`tests/ensure-hooks.test.js`
  - `packages/app/test/perm-bridge.test.js` → 本地候选：`tests/perm-bridge.test.js`
  - `packages/app/test/perm-request-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-51dec0fbe1"></a>
- 2026-11-20 B4 E50：实际运行时diff拆出权限hook超1MB重复响应安全修复，复用既有readStrictUtf8JsonBody，ASCII/声明/中文多字节超限、坏编码/JSON拒绝后正常审批仍通。红测复现；定向21、完整1565、构建、安装285及额外实际安装HTTP5通过。目录自动信任策略B9、hooks维护B11未迁，不勾整条。见[B4.53](./B4-implementation.md#b453-e50-权限hook超限请求体纠正)。

## [51dec0fbe1](https://github.com/weiesky/cc-viewer/commit/51dec0fbe1135cdf72fe89e34bb40e1ddc75c283) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-51dec0fbe1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-51dec0fbe1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-19T08:50:05+00:00；作者时间：2026-10-19T08:50:05+00:00；父提交：06e1db54c7。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-06e1db54c7"></a>
## [06e1db54c7](https://github.com/weiesky/cc-viewer/commit/06e1db54c7b69bff3d99735ce4adbc7da94dcb04) — Merge pull request #154 from weiesky/fix/file-tree-row-shrink
- [B0 upstream full commit message](./B0-upstream-messages.md#message-06e1db54c7)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-06e1db54c7)

- B0 血缘：相对第一父分支引入窗口内 2 条可达提交：[b500ebf76c](#commit-b500ebf76c), [d906edb3de](#commit-d906edb3de)。合并与分支变更不得重复计算。

- 提交时间：2026-10-17T00:44:46+08:00；作者时间：2026-10-17T00:44:46+08:00；父提交：ec440163c0, b500ebf76c。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（13 个）：
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/RoleFilterBar.module.css` → 本地候选：`src/components/chat/RoleFilterBar.module.css`
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/CachePopoverContent.jsx` → 本地候选：`src/components/dashboard/CachePopoverContent.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.module.css` → 本地候选：`src/components/dashboard/CachePopoverContent.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/skillsParser.js` → 本地候选：`src/utils/skillsParser.js`
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/skill-display-name.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-b500ebf76c"></a>
## [b500ebf76c](https://github.com/weiesky/cc-viewer/commit/b500ebf76c0f1414a1aa8acb18fb0ecb6ccb0f6c) — chore(release): 1.9.7
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b500ebf76c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b500ebf76c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-17T00:43:41+08:00；作者时间：2026-10-17T00:43:41+08:00；父提交：d906edb3de。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/frosted-glass-bars.md` → 无直接路径匹配
  - `.changeset/skill-scope-rows.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-d906edb3de"></a>
## [d906edb3de](https://github.com/weiesky/cc-viewer/commit/d906edb3de840208944bbca9d33ec037bdeb6bc5) — feat(web): skill scope rows + frosted glass bars
- 2026-11-20 B4.2：任务HUD组件/CSS与SDK快照子项已迁入，全量1417/1417、隔离Safari刷新/切换/停止通过；其余混合子项仍待，见[B4实施](./B4-implementation.md)。
- B0 本地关键代码对照：混合 Skills 全局/项目/插件分组与 role/task 区玻璃样式；本地 AppHeader 有 skills modal，须按 Codex skills 来源与任务 HUD 状态验证分组、滚动补偿与可读性，拆归 B4/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-d906edb3de)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d906edb3de)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d906edb3de)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-16T23:50:11+08:00；作者时间：2026-10-16T23:50:11+08:00；父提交：7830664780。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（13 个）：
  - `.changeset/frosted-glass-bars.md` → 无直接路径匹配
  - `.changeset/skill-scope-rows.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/RoleFilterBar.module.css` → 本地候选：`src/components/chat/RoleFilterBar.module.css`
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/src/components/dashboard/CachePopoverContent.jsx` → 本地候选：`src/components/dashboard/CachePopoverContent.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.module.css` → 本地候选：`src/components/dashboard/CachePopoverContent.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/skillsParser.js` → 本地候选：`src/utils/skillsParser.js`
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/skill-display-name.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-ec440163c0"></a>
## [ec440163c0](https://github.com/weiesky/cc-viewer/commit/ec440163c0702f493609216e1ff0d7af801fa47e) — Merge pull request #153 from weiesky/fix/file-tree-row-shrink
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ec440163c0)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ec440163c0)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[7830664780](#commit-7830664780)。合并与分支变更不得重复计算。

- 提交时间：2026-10-15T15:53:49+08:00；作者时间：2026-10-15T15:53:49+08:00；父提交：983d08b571, 7830664780。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（2 个）：
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `history.md` → 无直接路径匹配

<a id="commit-7830664780"></a>
## [7830664780](https://github.com/weiesky/cc-viewer/commit/7830664780a5c16219edbb7e79662ad0ad27db9b) — fix(web): 文件树行高不再被压缩抖动
- B0 本地关键代码对照：上游 FileExplorer 行添加 flex-shrink:0；本地 FileExplorer.module.css 中 .treeItem 尚未看到该声明，相邻其他元素已有。须验证溢出滚动及行高抖动，归 B5。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-7830664780)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7830664780)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7830664780)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-15T15:47:29+08:00；作者时间：2026-10-15T15:47:29+08:00；父提交：983d08b571。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（2 个）：
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `history.md` → 无直接路径匹配

<a id="commit-983d08b571"></a>
## [983d08b571](https://github.com/weiesky/cc-viewer/commit/983d08b57180a76b2b7ec0b122bef7eec33e47c4) — chore(release): 1.9.6
- [B0 upstream full commit message](./B0-upstream-messages.md#message-983d08b571)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-983d08b571)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-15T13:56:40+08:00；作者时间：2026-10-15T13:56:40+08:00；父提交：0a9ad5d767。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/fix-ws-mux-queue-overflow.md` → 无直接路径匹配
  - `.changeset/tidy-sdk-workspaces.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-0a9ad5d767"></a>
## [0a9ad5d767](https://github.com/weiesky/cc-viewer/commit/0a9ad5d76779dde549ba1d96957c80ed025936c2) — Merge pull request #152 from weiesky/feat/sdk-instance-close-ws-mux-overflow
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0a9ad5d767)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0a9ad5d767)

- B0 血缘：相对第一父分支引入窗口内 3 条可达提交：[46d33276c9](#commit-46d33276c9), [a84385b5a8](#commit-a84385b5a8), [4991ba762d](#commit-4991ba762d)。合并与分支变更不得重复计算。

- 提交时间：2026-10-15T13:56:04+08:00；作者时间：2026-10-15T13:56:04+08:00；父提交：f20efc1371, 46d33276c9。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（31 个）：
  - `.changeset/fix-ws-mux-queue-overflow.md` → 无直接路径匹配
  - `.changeset/tidy-sdk-workspaces.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/resumeSessions.js` → 无直接路径匹配
  - `apps/web/src/utils/wsMuxTransport.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `apps/web/test/resume-sessions-map.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-workspace-anchors.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/sdk-session-index.js` → 无直接路径匹配
  - `packages/app/server/lib/view-root.js` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/project-meta.js` → 无直接路径匹配
  - `packages/app/server/routes/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/events-instance-live-empty.test.js` → 无直接路径匹配
  - `packages/app/test/events-samename-cwd.test.js` → 无直接路径匹配
  - `packages/app/test/live-processes-close.test.js` → 无直接路径匹配
  - `packages/app/test/resume-route.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-index.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-registry.test.js` → 无直接路径匹配
  - `packages/app/test/view-root.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project.test.js` → 无直接路径匹配
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配
  - `packages/app/test/ws-mux.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-46d33276c9"></a>
## [46d33276c9](https://github.com/weiesky/cc-viewer/commit/46d33276c9bda1a0ab09a153762c7987be18fa25) — fix(sse): gate ws.mux.diag probes + pin perMessageDeflate:false (CR follow-up)
- 2026-11-20 B3：`16e2406`保留显式诊断开关，`4a7a8e7`保留perMessageDeflate:false及后续最终pump；48项含大帧/队列测试，Safari真实增量和重启已观察。详见[B3第二轮](./B3-transport-and-pagination.md)。
- B0 本地关键代码对照：上游为 mux 诊断加显式开关、固定禁用 perMessageDeflate 和大帧测试；本地应先核对实际 WS 构造及敏感日志，只有采用相同 mux 时才复用具体配置，归 B3。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-46d33276c9)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-46d33276c9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-46d33276c9)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-15T13:47:57+08:00；作者时间：2026-10-15T13:47:57+08:00；父提交：a84385b5a8。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（5 个）：
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/utils/wsMuxTransport.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/test/ws-mux.test.js` → 无直接路径匹配

<a id="commit-a84385b5a8"></a>

- 4fb7ade把持久快照key从同源共享active:limit改为实例/代理路径/档案/limit组合，token不进入key；实际IndexedDB fixture验证A/B同名游标不串、代理路径/档案/limit及无实例页均隔离。Web197/197、全量1283/1283及685文件新安装66/66通过；原GUI服务端拒绝错档案提示，未显示跨项目内容。d10ceae提供可重复隔离GUI fixture，启动HTTP两同名/不同实例通过。
## [a84385b5a8](https://github.com/weiesky/cc-viewer/commit/a84385b5a82137acb143bc77b91c87341491a7bb) — feat(sdk): per-workspace close + stable instance identity for same-name disambiguation
- 2026-11-19 CLI恢复续项：`9a1f1c1`复用共享selector/配置/--解析；`8b14ef2`按用户确认仅当前cwd的Viewer SDK档案，指定ID/--last（兼容continue）先校验后启动，复用HTTP恢复与file pin，首条提示仅一次，裸resume打开网页picker且不发送回合。缺失/跨cwd/非SDK/坏尾/元数据及--all等扩范围选项拒绝，不退到另一档案或原生-only会话。最终全量1228/1228、构建、新682文件安装54/54+B1.2/CLI通过；组件状态探针通过，GUI host不可用，真实模型仍待。**仅恢复子项，整条及B2仍部分实施**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2恢复续项：`2d95017` 基础层后，`cac3aa1` 按实例历史列表/HTTP恢复、busy/坏库/不完整尾部/CLI选项形ID拒绝、恢复file pin与旧live reset；`87796f8` 历史入口及原地切换、HTTP/SSE去重、草稿/附件保留与旧缓发/缓存失效。全量1217/1217、构建、组件状态探针、682文件新安装43/43+B1.2+CLI启动通过，fake Codex。真实模型/GUI及CLI resume/--last仍待；**部分实施，不标整条完成**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2恢复基础层：`2d95017` 同cwd/原生SDK档案校验、完整历史与末条助手回复、坏库/尾部拒绝；busy保队列及异步活动/重置/关闭重开拒绝，复用SDK初始化与native resumeThread。定向31/31、全量1211/1211、构建、新682文件安装41/41+B1.2+CLI通过（fake Codex）。HTTP/恢复UI及真实模型/GUI仍待，**部分实施**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 UI续项：`a9197c2` 桌面/手机/平板SDK scratch面板、实例tabs持久化、单Mobile宿主、当前scratch虚拟键与聊天输入并存；`20d7a29` 独立修复command历史分类抛错。全量1201/1201、构建、三模式组件探针、681文件新生产安装关键源码/202Web文件字节一致、串行33/33+B1.2+CLI通过；GUI、开关刷新恢复与历史恢复仍待。**部分实施，非整条完成**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 scratch归属子项：`b1b3c7a` 绑定WS/cwd/同id shell/回放/关闭并取消迟到启动，旧退出及旧连接不杀新shell。先红后绿4项，定向20/20、全量1200/1200、构建；681文件同包首轮并发SDK启动超时，串行33/33+B1.2+CLI复验及源码/安装真实node-pty通过。SDK scratch可见面板/实例持久化、恢复与GUI仍待，**部分实施**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 标签页子项：`d39d3a8` 顶部工作区标签/路径消歧/精确关闭确认、SDK WS输入启用及根入口规范；`c9a3e65` 独立测试清理修复。全量1195/1195、构建、681文件生产安装28/28+B1.2+CLI启动通过；GUI未验收，scratch与恢复仍待。**部分实施，非整条完成**，见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 续轮：`06fac6f` 启动模板；`6b982c8` 用户选择统一 Viewer 登录、认证归属固定启动目录；`14c3ae5` 连接绑定、动作/WS/SSE/流状态；`7415615` 工作区启动/复用/close/stop-all、按实例 HTTP 视图与日志保护、相对 --cd；`818fff8` 图片通知；`597ff7a` 浏览器实例导航/请求/缓存。最终源码1192/1192、0 skip、构建通过。681文件安装28/28、B1.2/CLI启动通过的证据截至7415615；最后两笔产物待复验。GUI在浏览器会话被用户停止后未完成，可见列表/关闭/恢复/scratch及完整跨端验收仍待，**部分实施，不标整条完成**。见 [B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 后续基础层：`44a80e7` 独立代理 owner/启动取消/迟到清理；`a00ed8a` 按 cwd 常驻 SDK 状态、队列、历史、回调和稳定实例及 attach/close；`12d2188` 真实捕获请求使用可信 owner 归属；`c3e3e6b` 同名 V2 日志只对冲突路径加摘要并保留旧目录，复用锁及 manifest 校验。用户两项决策已确认。最新全量1179/1179、0 skip、构建及681文件实际安装通过，安装后运行时19/19、B1.2回归通过。**CLI/server/WS/SSE/列表/关闭UI/恢复及真实双浏览器仍待接线验收，部分实施，不标整条完成**。见 [B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 代理生命周期前置：`44a80e7` 独立 owner、启动取消、迟到 close/模型观察隔离、多端口自转发排除；定向40/40、全量1169/1169、0 skip、构建和680文件预览通过。同目录复用常驻会话已确认；per-cwd SDK/精确路由/关闭和多客户端仍待。日志 `/tmp/cxv-b2-proxy-{focused,full-final,build,pack}.log`。不标整条完成。
- 2026-11-18 B2 生命周期子项：`a094282` 防止会话重置/停止后的旧提示、迟到事件、abort错误、finally和队列drain写入新会话。先红后绿（原两项可复现失败，新增回归后定向4/4），全量1164/1164、0 skip，构建与实际680文件安装产物SDK4/4/B1.2复验通过。当前仍是单例，per-cwd常驻会话、精确实例路由、独立关闭及多客户端仍待；**部分实施，不标整条完成**。见 [B2检查点](./cc-viewer-alignment-plan.md#b2--多工作区身份与-sdk-会话)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a84385b5a8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a84385b5a8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-15T13:12:09+08:00；作者时间：2026-10-15T13:12:09+08:00；父提交：4991ba762d。
- B0 本地关键代码对照：当前会话/终端身份及未验证边界见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（25 个）：
  - `.changeset/tidy-sdk-workspaces.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/resumeSessions.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `apps/web/test/resume-sessions-map.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-workspace-anchors.test.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/sdk-session-index.js` → 无直接路径匹配
  - `packages/app/server/lib/view-root.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/project-meta.js` → 无直接路径匹配
  - `packages/app/server/routes/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/events-instance-live-empty.test.js` → 无直接路径匹配
  - `packages/app/test/events-samename-cwd.test.js` → 无直接路径匹配
  - `packages/app/test/live-processes-close.test.js` → 无直接路径匹配
  - `packages/app/test/resume-route.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-index.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-registry.test.js` → 无直接路径匹配
  - `packages/app/test/view-root.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project.test.js` → 无直接路径匹配
  - `packages/app/test/ws-instance-isolation.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-4991ba762d"></a>
## [4991ba762d](https://github.com/weiesky/cc-viewer/commit/4991ba762db4fdaf68450880dfd4d399d290eee0) — fix(sse): WS-mux cold-load queue overflow left dialogue blank after refresh
- 2026-11-20 B3：`16e2406`/`4a7a8e7`迁入后续最终32MB真实字节FIFO/credit pump；不重用terminal的跳帧语义。纯服务器/背压48/48及真实路由通过，不能把最终snapshot有界当作物理分片。详见[B3第二轮](./B3-transport-and-pagination.md)。
- B0 本地关键代码对照：上游 WS mux 大冷加载因压缩+backpressure 造成循环断线，后续 46d33276 补充日志开关与回归；本地 server.js 有 bufferedAmount 排队，是否为同一通道及压缩选项须核实。以大快消费者、慢消费者和重连验证，归 B3。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-4991ba762d)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-4991ba762d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-4991ba762d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-15T11:31:54+08:00；作者时间：2026-10-15T11:31:54+08:00；父提交：8aefa1c29e。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（6 个）：
  - `.changeset/fix-ws-mux-queue-overflow.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/utils/wsMuxTransport.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/test/ws-mux.test.js` → 无直接路径匹配

<a id="commit-f20efc1371"></a>
## [f20efc1371](https://github.com/weiesky/cc-viewer/commit/f20efc13710a4f855a659e03903d6122d03b7122) — fix: use temporary keychain password for macOS signing (#151)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-f20efc1371)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-f20efc1371)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-14T15:07:09+08:00；作者时间：2026-10-14T15:07:09+08:00；父提交：8aefa1c29e。
- B0 本地关键代码对照：发布工具链现状与验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（8 个）：
  - `.github/workflows/ci.yml` → 无直接路径匹配
  - `.github/workflows/release.yml` → 无直接路径匹配
  - `apps/electron/package.json` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `patches/app-builder-lib@26.15.3.patch` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `pnpm-workspace.yaml` → 无直接路径匹配
  - `scripts/test/mac-keychain.test.mjs` → 无直接路径匹配

<a id="commit-8aefa1c29e"></a>
## [8aefa1c29e](https://github.com/weiesky/cc-viewer/commit/8aefa1c29ec22c199cdbe3a0c0975eecf910c574) — chore(release): 1.9.5
- [B0 upstream full commit message](./B0-upstream-messages.md#message-8aefa1c29e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-8aefa1c29e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-14T13:39:26+08:00；作者时间：2026-10-14T13:39:26+08:00；父提交：e6baf89e6a。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（5 个）：
  - `.changeset/per-workspace-sse-channels.md` → 无直接路径匹配
  - `.changeset/pinned-menu-prefs-migration.md` → 无直接路径匹配
  - `.changeset/ws-mux-dialogue-channel.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-e6baf89e6a"></a>
## [e6baf89e6a](https://github.com/weiesky/cc-viewer/commit/e6baf89e6a96ddf13621c99bf5edac2ea9fd6048) — Merge pull request #150 from weiesky/feat/ws-mux-dialogue-channel
- [B0 upstream full commit message](./B0-upstream-messages.md#message-e6baf89e6a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-e6baf89e6a)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[db2ada0866](#commit-db2ada0866)。合并与分支变更不得重复计算。

- 提交时间：2026-10-14T13:36:20+08:00；作者时间：2026-10-14T13:36:20+08:00；父提交：d01259c844, db2ada0866。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（17 个）：
  - `.changeset/ws-mux-dialogue-channel.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/utils/wsMuxTransport.js` → 无直接路径匹配
  - `apps/web/test/channel-isolation.test.js` → 无直接路径匹配
  - `apps/web/test/sid-not-found-live-empty.test.js` → 无直接路径匹配
  - `apps/web/test/turn-end-scope-client.test.js` → 无直接路径匹配
  - `apps/web/test/view-cache-restore.test.js` → 无直接路径匹配
  - `apps/web/test/view-switch-sse-scope.test.js` → 无直接路径匹配
  - `apps/web/test/warm-switch-instant.test.js` → 无直接路径匹配
  - `apps/web/test/ws-mux-channel.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/ws-mux-equivalence.test.js` → 无直接路径匹配
  - `packages/app/test/ws-mux.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-db2ada0866"></a>
## [db2ada0866](https://github.com/weiesky/cc-viewer/commit/db2ada0866f721ed82560ca267b0447be8619711) — feat(sse): multiplex the dialogue channel over one WebSocket, SSE fallback
- 2026-11-20 B3：`16e2406`前端最终transport、`4a7a8e7`服务端最终pump、`c31b20b`接入真实鉴权/scope。snapshot/page/object仍HTTP，control与V2 live共用WS，逐流SSE降级保留。真实WS/SSE载荷/游标/隔离/回收与Safari增量重连通过，慢网等边界仍未全验。详见[B3第二轮](./B3-transport-and-pagination.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-db2ada0866)
- B0 status: Pending B3 validation: terminal WebSocket is not the dialogue multiplexer.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-db2ada0866)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-14T11:21:29+08:00；作者时间：2026-10-14T11:21:29+08:00；父提交：d01259c844。
- B0 本地代码对照：已核验关键入口和上游目标；结论及尚需测试事项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（17 个）：
  - `.changeset/ws-mux-dialogue-channel.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/utils/wsMuxTransport.js` → 无直接路径匹配
  - `apps/web/test/channel-isolation.test.js` → 无直接路径匹配
  - `apps/web/test/sid-not-found-live-empty.test.js` → 无直接路径匹配
  - `apps/web/test/turn-end-scope-client.test.js` → 无直接路径匹配
  - `apps/web/test/view-cache-restore.test.js` → 无直接路径匹配
  - `apps/web/test/view-switch-sse-scope.test.js` → 无直接路径匹配
  - `apps/web/test/warm-switch-instant.test.js` → 无直接路径匹配
  - `apps/web/test/ws-mux-channel.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/ws-mux.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/ws-mux-equivalence.test.js` → 无直接路径匹配
  - `packages/app/test/ws-mux.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-d01259c844"></a>
## [d01259c844](https://github.com/weiesky/cc-viewer/commit/d01259c844378aa800c358623aaf5263cb543bba) — Merge pull request #149 from weiesky/fix/sse-per-workspace-cr
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d01259c844)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d01259c844)

- B0 血缘：相对第一父分支引入窗口内 3 条可达提交：[df5c2fe807](#commit-df5c2fe807), [a30d8c92a7](#commit-a30d8c92a7), [5c28d4c50a](#commit-5c28d4c50a)。合并与分支变更不得重复计算。

- 提交时间：2026-10-14T00:20:15+08:00；作者时间：2026-10-14T00:20:15+08:00；父提交：2dbe5cd695, df5c2fe807。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（50 个）：
  - `.changeset/per-workspace-sse-channels.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/sseChannels.js` → 无直接路径匹配
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `apps/web/src/utils/viewStateCache.js` → 无直接路径匹配
  - `apps/web/test/channel-isolation.test.js` → 无直接路径匹配
  - `apps/web/test/detach-view-reset.test.js` → 无直接路径匹配
  - `apps/web/test/live-processes-refresh.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/sid-not-found-live-empty.test.js` → 无直接路径匹配
  - `apps/web/test/sse-channels.test.js` → 无直接路径匹配
  - `apps/web/test/sse-connection-gen.test.js` → 无直接路径匹配
  - `apps/web/test/stream-switch-bleed.test.js` → 无直接路径匹配
  - `apps/web/test/turn-active-gating.test.js` → 无直接路径匹配
  - `apps/web/test/turn-end-scope-client.test.js` → 无直接路径匹配
  - `apps/web/test/view-cache-restore.test.js` → 无直接路径匹配
  - `apps/web/test/view-channel-state.test.js` → 无直接路径匹配
  - `apps/web/test/warm-switch-instant.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/git-diff.js` → 本地候选：`lib/git-diff.js`
  - `packages/app/server/lib/scope-router.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/task-state.js` → 无直接路径匹配
  - `packages/app/server/lib/turn-end-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/view-router.js` → 无直接路径匹配
  - `packages/app/server/lib/workflow-watcher.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/routes/session-pin.js` → 无直接路径匹配
  - `packages/app/server/routes/workflow-journal.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-events-gap.test.js` → 无直接路径匹配
  - `packages/app/test/pty-session-resolve.test.js` → 无直接路径匹配
  - `packages/app/test/scope-router.test.js` → 无直接路径匹配
  - `packages/app/test/stream-chunk-scope.test.js` → 无直接路径匹配
  - `packages/app/test/streaming-scope-state.test.js` → 无直接路径匹配
  - `packages/app/test/streaming-status-scope.test.js` → 无直接路径匹配
  - `packages/app/test/task-state.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope-behavior.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope.test.js` → 无直接路径匹配
  - `packages/app/test/view-router.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project-r4.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-df5c2fe807"></a>
## [df5c2fe807](https://github.com/weiesky/cc-viewer/commit/df5c2fe807365dcbb85ffda78aad93a725523ee7) — Merge remote-tracking branch 'origin/main' into fix/sse-per-workspace-cr
- [B0 upstream full commit message](./B0-upstream-messages.md#message-df5c2fe807)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-df5c2fe807)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[2dbe5cd695](#commit-2dbe5cd695)。合并与分支变更不得重复计算。

- 提交时间：2026-10-14T00:14:24+08:00；作者时间：2026-10-14T00:14:24+08:00；父提交：a30d8c92a7, 2dbe5cd695。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并存在冲突或错误；实际树相对自动合并树的差异路径：`history.md`。该结果不证明业务语义已审查。
- B0 冲突解决复核：`git show --cc` 显示合并树冲突解决仅涉及 `history.md`；其父分支的产品变更仍需逐项审查，不能由此判定功能不适用。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（6 个）：
  - `.changeset/pinned-menu-prefs-migration.md` → 无直接路径匹配
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/utils/pinnedMenu.js` → 本地候选：`src/utils/pinnedMenu.js`
  - `apps/web/test/pinned-menu-prefs-migration.test.js` → 无直接路径匹配
  - `apps/web/test/pinned-menu.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-a30d8c92a7"></a>
## [a30d8c92a7](https://github.com/weiesky/cc-viewer/commit/a30d8c92a7a56803d501ea50775f9993c96a19d5) — fix(sse): per-workspace SSE 通道 CR 修复(P1×7+P2×7)与 git-diff flake
- 2026-11-20 B3：`c31b20b`沿用现有scope handler和Origin/token边界并补真实mux/SSE隔离/回收；错误B scope+A handle拒绝且无watcher残留。混合P1/P2其余项保持逐项边界。详见[B3第二轮](./B3-transport-and-pagination.md)。
- B0 本地关键代码对照：上游 per-workspace SSE 审查包含 stop 防写、streaming scope、close 清理、sid 元数据及跨项目重绑定等多项 P1；本地非同一实现，需对照 server.js/live 与 AppBase.jsx 的工作区事件逐项故障注入，归 B2/B3/B4。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a30d8c92a7)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a30d8c92a7)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a30d8c92a7)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-14T00:12:29+08:00；作者时间：2026-10-14T00:12:29+08:00；父提交：5c28d4c50a。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（12 个）：
  - `.changeset/per-workspace-sse-channels.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/utils/sseChannels.js` → 无直接路径匹配
  - `apps/web/test/warm-switch-instant.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/git-diff.js` → 本地候选：`lib/git-diff.js`
  - `packages/app/server/lib/v2/view-router.js` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/stream-chunk-scope.test.js` → 无直接路径匹配
  - `packages/app/test/streaming-status-scope.test.js` → 无直接路径匹配

<a id="commit-5c28d4c50a"></a>
## [5c28d4c50a](https://github.com/weiesky/cc-viewer/commit/5c28d4c50a952110c32b04922cee56bdf9bd8560) — feat(sse): per-workspace independent SSE channels
- 2026-11-20 B3：`c31b20b`在原Codex SDK精确instance/cwd路径接入mux，真实路由证明多scope、相同SSE字节、cursor和watcher释放；Safari同名A/B切换通过。Claude per-workspace channel其余子项不整体完成。详见[B3第二轮](./B3-transport-and-pagination.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5c28d4c50a)
- B0 status: Pending B2/B3 validation: EventSource exists; scoped isolation not yet proven.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5c28d4c50a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T22:27:41+08:00；作者时间：2026-10-13T22:27:41+08:00；父提交：5a7349a23b。
- B0 本地代码对照：已核验关键入口和上游目标；结论及尚需测试事项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（47 个）：
  - `.changeset/per-workspace-sse-channels.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/sseChannels.js` → 无直接路径匹配
  - `apps/web/src/utils/viewChannelState.js` → 无直接路径匹配
  - `apps/web/src/utils/viewStateCache.js` → 无直接路径匹配
  - `apps/web/test/channel-isolation.test.js` → 无直接路径匹配
  - `apps/web/test/detach-view-reset.test.js` → 无直接路径匹配
  - `apps/web/test/live-processes-refresh.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/sid-not-found-live-empty.test.js` → 无直接路径匹配
  - `apps/web/test/sse-channels.test.js` → 无直接路径匹配
  - `apps/web/test/sse-connection-gen.test.js` → 无直接路径匹配
  - `apps/web/test/stream-switch-bleed.test.js` → 无直接路径匹配
  - `apps/web/test/turn-active-gating.test.js` → 无直接路径匹配
  - `apps/web/test/turn-end-scope-client.test.js` → 无直接路径匹配
  - `apps/web/test/view-cache-restore.test.js` → 无直接路径匹配
  - `apps/web/test/view-channel-state.test.js` → 无直接路径匹配
  - `apps/web/test/warm-switch-instant.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/scope-router.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/task-state.js` → 无直接路径匹配
  - `packages/app/server/lib/turn-end-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/view-router.js` → 无直接路径匹配
  - `packages/app/server/lib/workflow-watcher.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/session-pin.js` → 无直接路径匹配
  - `packages/app/server/routes/workflow-journal.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-events-gap.test.js` → 无直接路径匹配
  - `packages/app/test/pty-session-resolve.test.js` → 无直接路径匹配
  - `packages/app/test/scope-router.test.js` → 无直接路径匹配
  - `packages/app/test/streaming-scope-state.test.js` → 无直接路径匹配
  - `packages/app/test/streaming-status-scope.test.js` → 无直接路径匹配
  - `packages/app/test/task-state.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope-behavior.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-scope.test.js` → 无直接路径匹配
  - `packages/app/test/view-router.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project-r4.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-2dbe5cd695"></a>
## [2dbe5cd695](https://github.com/weiesky/cc-viewer/commit/2dbe5cd695a965f51e4cee28d9c911e404675d46) — feat(web): 汉堡菜单「钉住」持久化迁移到 preferences.json (#148)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2dbe5cd695)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2dbe5cd695)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T22:25:34+08:00；作者时间：2026-10-13T22:25:34+08:00；父提交：5a7349a23b。
- B0 本地关键代码对照：已检查上游最终修改和本地入口；范围与后续风险见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B1/B7；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（6 个）：
  - `.changeset/pinned-menu-prefs-migration.md` → 无直接路径匹配
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/utils/pinnedMenu.js` → 本地候选：`src/utils/pinnedMenu.js`
  - `apps/web/test/pinned-menu-prefs-migration.test.js` → 无直接路径匹配
  - `apps/web/test/pinned-menu.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-5a7349a23b"></a>
## [5a7349a23b](https://github.com/weiesky/cc-viewer/commit/5a7349a23b1dc0ebed85ef72d21b9dab09d3654c) — chore(release): 1.9.4
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5a7349a23b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5a7349a23b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-13T00:25:09+08:00；父提交：2be5bb23f6。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（9 个）：
  - `.changeset/dirbrowser-direct-launch.md` → 无直接路径匹配
  - `.changeset/scratch-workspace-scoped.md` → 无直接路径匹配
  - `.changeset/sdk-context-usage-panel.md` → 无直接路径匹配
  - `.changeset/sdk-mcp-status-and-model-chip.md` → 无直接路径匹配
  - `.changeset/sdk-p2-hardening.md` → 无直接路径匹配
  - `.changeset/sdk-per-cwd-sessions.md` → 无直接路径匹配
  - `.changeset/turn-level-loading.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-2be5bb23f6"></a>
## [2be5bb23f6](https://github.com/weiesky/cc-viewer/commit/2be5bb23f67c8ca2973abd1b7805b93861a50f96) — feat(ui): 小终端(scratch)按工作区分组并伴随视图切换,关闭工作区连带回收
- 2026-11-18 B2 scratch子项：`a9197c2` 复用scratchOnly面板、按实例保存tabs、SDK聊天输入并存、Mobile单宿主/手机tab/keybar；`b1b3c7a` 后端实例归属与关闭。仅以上子项适配；floating composer、触控/固定列/软键盘及其他diff仍待逐项核验。全量1201/1201、构建/组件探针/生产安装通过，GUI未验收，**不标整条完成**。见[B2记录](./B2-session-isolation.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2be5bb23f6)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2be5bb23f6)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-13T00:00:02+08:00；父提交：bc669f59cc。
- B0 本地关键代码对照：当前会话/终端身份及未验证边界见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（17 个）：
  - `.changeset/scratch-workspace-scoped.md` → 无直接路径匹配
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/terminal/ScratchTerminal.jsx` → 本地候选：`src/components/terminal/ScratchTerminal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/scratchTabsStorage.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/scratch-tabs-storage.test.js` → 无直接路径匹配
  - `apps/web/test/scratch-workspace-switch.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/scratch-pty-manager.js` → 本地候选：`scratch-pty-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/live-processes-close.test.js` → 无直接路径匹配
  - `packages/app/test/scratch-pty-manager-gap.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-mode.test.js` → 无直接路径匹配

<a id="commit-bc669f59cc"></a>
## [bc669f59cc](https://github.com/weiesky/cc-viewer/commit/bc669f59cced8ab8fddfb487a7f1121320ed8b64) — test(sdk): 补提交 SDK 会话状态(turn-level session-state)测试
- `14c39d4`已解决本环境忽略SIGTERM的自有子进程：宽限期保持busy，退出才idle，兄弟实例不受影响。旧等待策略选择已随用户再次明确继续而按完整适配推进；无需再请求同一确认。GUI其他路径继续核验，非POSIX未冒充通过。
- 2026-11-19取消补证：官方SDK+自有忽略SIGTERM的fake子进程受控复现interrupt后未结束/busy保留；fixture只清理自身PID。`/tmp/cxv-b2-stubborn-child.log`，回收策略待用户选择，尚未等价验收，不标整条完成。
- 2026-11-19 B2状态审查：沿用Codex runStreamed及按实例SSE streaming_status，不复制Claude协议。实际回归发现proxy await期间interrupt无controller，`192f63d`提前AbortController/running、让等待可取消并清理；取消原提示/旧队列不启动Codex，后续输入可继续，保留代次隔离。先红后绿，定向24/24，全量1253/1253、构建及新安装55/55通过。原生requires_action/失联不响应中断/grace与GUI等价验证仍待，**部分适配**。见[状态复核](./B2-sdk-state-review.md)。
- B0 本地关键代码对照：上游 SDK 会话状态测试覆盖 turn、interrupt、teardown、WS 重连；Codex SDK/App Server 事件不同，需检查本地 tests/sdk-manager.test.js 和 appserver 测试的等效场景，归 B2/B3。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-bc669f59cc)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-bc669f59cc)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-bc669f59cc)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-12T17:06:17+08:00；父提交：3079040494。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（1 个）：
  - `packages/app/test/sdk-session-state.test.js` → 无直接路径匹配

<a id="commit-3079040494"></a>
## [3079040494](https://github.com/weiesky/cc-viewer/commit/3079040494a8b495fa6b4f4d9c5c6724d55a7571) — feat(sdk): SDK 模式改为每工作区独立常驻会话(按 cwd 多会话,对齐 PTY)
- 2026-11-19 CLI恢复续项：`9a1f1c1`复用共享selector/配置/--解析；`8b14ef2`按用户确认仅当前cwd的Viewer SDK档案，指定ID/--last（兼容continue）先校验后启动，复用HTTP恢复与file pin，首条提示仅一次，裸resume打开网页picker且不发送回合。缺失/跨cwd/非SDK/坏尾/元数据及--all等扩范围选项拒绝，不退到另一档案或原生-only会话。最终全量1228/1228、构建、新682文件安装54/54+B1.2/CLI通过；组件状态探针通过，GUI host不可用，真实模型仍待。**仅恢复子项，整条及B2仍部分实施**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2恢复续项：`2d95017` 基础层后，`cac3aa1` 按实例历史列表/HTTP恢复、busy/坏库/不完整尾部/CLI选项形ID拒绝、恢复file pin与旧live reset；`87796f8` 历史入口及原地切换、HTTP/SSE去重、草稿/附件保留与旧缓发/缓存失效。全量1217/1217、构建、组件状态探针、682文件新安装43/43+B1.2+CLI启动通过，fake Codex。真实模型/GUI及CLI resume/--last仍待；**部分实施，不标整条完成**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2恢复基础层：`2d95017` 同cwd/原生SDK档案校验、完整历史与末条助手回复、坏库/尾部拒绝；busy保队列及异步活动/重置/关闭重开拒绝，复用SDK初始化与native resumeThread。定向31/31、全量1211/1211、构建、新682文件安装41/41+B1.2+CLI通过（fake Codex）。HTTP/恢复UI及真实模型/GUI仍待，**部分实施**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 UI续项：`a9197c2` 桌面/手机/平板SDK scratch面板、实例tabs持久化、单Mobile宿主、当前scratch虚拟键与聊天输入并存；`20d7a29` 独立修复command历史分类抛错。全量1201/1201、构建、三模式组件探针、681文件新生产安装关键源码/202Web文件字节一致、串行33/33+B1.2+CLI通过；GUI、开关刷新恢复与历史恢复仍待。**部分实施，非整条完成**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 scratch归属子项：`b1b3c7a` 绑定WS/cwd/同id shell/回放/关闭并取消迟到启动，旧退出及旧连接不杀新shell。先红后绿4项，定向20/20、全量1200/1200、构建；681文件同包首轮并发SDK启动超时，串行33/33+B1.2+CLI复验及源码/安装真实node-pty通过。SDK scratch可见面板/实例持久化、恢复与GUI仍待，**部分实施**。见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 标签页子项：`d39d3a8` 顶部工作区标签/路径消歧/精确关闭确认、SDK WS输入启用及根入口规范；`c9a3e65` 独立测试清理修复。全量1195/1195、构建、681文件生产安装28/28+B1.2+CLI启动通过；GUI未验收，scratch与恢复仍待。**部分实施，非整条完成**，见[B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 续轮：`06fac6f` 启动模板；`6b982c8` 用户选择统一 Viewer 登录、认证归属固定启动目录；`14c3ae5` 连接绑定、动作/WS/SSE/流状态；`7415615` 工作区启动/复用/close/stop-all、按实例 HTTP 视图与日志保护、相对 --cd；`818fff8` 图片通知；`597ff7a` 浏览器实例导航/请求/缓存。最终源码1192/1192、0 skip、构建通过。681文件安装28/28、B1.2/CLI启动通过的证据截至7415615；最后两笔产物待复验。GUI在浏览器会话被用户停止后未完成，可见列表/关闭/恢复/scratch及完整跨端验收仍待，**部分实施，不标整条完成**。见 [B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 后续基础层：`44a80e7` 独立代理 owner/启动取消/迟到清理；`a00ed8a` 按 cwd 常驻 SDK 状态、队列、历史、回调和稳定实例及 attach/close；`12d2188` 真实捕获请求使用可信 owner 归属；`c3e3e6b` 同名 V2 日志只对冲突路径加摘要并保留旧目录，复用锁及 manifest 校验。用户两项决策已确认。最新全量1179/1179、0 skip、构建及681文件实际安装通过，安装后运行时19/19、B1.2回归通过。**CLI/server/WS/SSE/列表/关闭UI/恢复及真实双浏览器仍待接线验收，部分实施，不标整条完成**。见 [B2记录](./B2-session-isolation.md)。
- 2026-11-18 B2 代理生命周期前置：`44a80e7` 独立 owner、启动取消、迟到 close/模型观察隔离、多端口自转发排除；定向40/40、全量1169/1169、0 skip、构建和680文件预览通过。同目录复用常驻会话已确认；per-cwd SDK/精确路由/关闭和多客户端仍待。日志 `/tmp/cxv-b2-proxy-{focused,full-final,build,pack}.log`。不标整条完成。
- 2026-11-18 B2 生命周期子项：`a094282` 防止会话重置/停止后的旧提示、迟到事件、abort错误、finally和队列drain写入新会话。先红后绿（原两项可复现失败，新增回归后定向4/4），全量1164/1164、0 skip，构建与实际680文件安装产物SDK4/4/B1.2复验通过。当前仍是单例，per-cwd常驻会话、精确实例路由、独立关闭及多客户端仍待；**部分实施，不标整条完成**。见 [B2检查点](./cc-viewer-alignment-plan.md#b2--多工作区身份与-sdk-会话)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3079040494)
- B0 status: Adapt in B2: local SDK session is singleton; test actual concurrent routing.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3079040494)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-12T16:58:02+08:00；父提交：c4529a6ed7。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- B0 code comparison: B2; local SDK manager has module-level single-session state; verify actual concurrent routing. See [B0 evidence](./B0-commit-lineage.md#b0-code-findings).
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（14 个）：
  - `.changeset/sdk-per-cwd-sessions.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/utils/resumeSessions.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `apps/web/test/resume-sessions-map.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-session-registry.test.js` → 无直接路径匹配


<a id="commit-c4529a6ed7"></a>
## [c4529a6ed7](https://github.com/weiesky/cc-viewer/commit/c4529a6ed7a81c7ddd4564915735a06e123890ab) — fix(ui): 对话 loading 覆盖整个回合,本地工具执行期不再误熄
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c4529a6ed7)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c4529a6ed7)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-12T15:26:27+08:00；父提交：133bc219df。
- B0 本地关键代码对照：输入/渲染状态及待验收情形见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（15 个）：
  - `.changeset/turn-level-loading.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/test/sse-connection-gen.test.js` → 无直接路径匹配
  - `apps/web/test/turn-active-gating.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-events-gap.test.js` → 无直接路径匹配
  - `packages/app/test/cli-sdk-session-state-env.test.js` → 无直接路径匹配
  - `packages/app/test/turn-active.test.js` → 无直接路径匹配

<a id="commit-133bc219df"></a>
## [133bc219df](https://github.com/weiesky/cc-viewer/commit/133bc219df78920cdc3a5cb56f48cbe067e467e5) — feat(sdk): SDK 模式 MCP 状态面板 + sdkModel chip + 修双面板无限拉取环
- 2026-11-21 B4 E60：已选原Context分类入口/居中不可用态，Codex无真实分类producer、现有用量条保持；相关Provider/fetch/timer/palette不新增空实现。55组件+7用量/1579完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过；GUI待、其他混合范围不整体勾选。具体源码阅读/适配边界见[B4.63](./B4-implementation.md)及[B4分类回执](./B4-context-unavailable-2026-11-21.json)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-133bc219df)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-133bc219df)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-12T00:29:05+08:00；父提交：ad369d2856。
- B0 本地关键代码对照：已核验上游能力及本地入口；结论和未验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（45 个）：
  - `.changeset/sdk-mcp-status-and-model-chip.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/components/dashboard/SdkContextUsageTab.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkMcpStatusTab.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkMcpStatusTab.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/mcpStatusView.js` → 无直接路径匹配
  - `apps/web/src/utils/sdkModelChip.js` → 无直接路径匹配
  - `apps/web/test/mcp-status-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/mcp-status-view.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-mcp-status-tab.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-model-chip.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-model-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-panel-stable-dispatch.test.js` → 无直接路径匹配
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/sdk-mcp-status.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-mcp-status-route.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-ad369d2856"></a>
- 2026-11-20 B4 E47本地8b59016原生MCP控制服务，E48原面板/CSS/稳定dispatch已验：完整1561/1561、构建、702文件/204Web/284运行时安装、Safari手动刷新/WS重连/同名隔离及exec准确不可用态通过。只完成MCP子项，model chip/Context/发布文档继续，见[B4.50–51](./B4-implementation.md#b451-e48-原mcp状态面板)。

- 2026-11-20 B4 E49：133原模型状态/chip与c66固定最终输入slot迁位、原CSS/helper、iPad portal/closed inert已核并适配Codex既有模型快照；完整1564/1564、构建、安装285、Safari空闲刷新/同名隔离/代理优先/强制pad-phone通过，总模型turn0。角色代理B8及Context/文档等混合项仍待，不整条完成；见[B4.52](./B4-implementation.md#b452-e49-模型chip按固定最终位置接入)。

## [ad369d2856](https://github.com/weiesky/cc-viewer/commit/ad369d285677dd0b08c3be7126abd2132c797324) — chore(sdk): getContextUsage 超时定时器 unref + settle 后 clearTimeout
- 2026-11-21 B4 E60：已选原Context分类入口/居中不可用态，Codex无真实分类producer、现有用量条保持；相关Provider/fetch/timer/palette不新增空实现。55组件+7用量/1579完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过；GUI待、其他混合范围不整体勾选。具体源码阅读/适配边界见[B4.63](./B4-implementation.md)及[B4分类回执](./B4-context-unavailable-2026-11-21.json)。
- 2026-11-19 B2决议：**不适用（当前Codex SDK 0.142.5链路）**。已读完整diff，仅Claude activeQuery.getContextUsage control RPC的请求timer清理；已核对安装的Codex/Thread公开接口与sdk-manager/sdk-adapter/server不存在此调用链，不增加无调用方实现。本地沿用192f63d基线，无对应新功能代码。上下文用量/血条刷新仍按ec14cd0234等提交另验，不据此判完成。见[状态复核](./B2-sdk-state-review.md)。
- B0 本地关键代码对照：上游 Claude SDK getContextUsage 定时器 clear/unref；本地 lib/sdk-manager.js 未见同名调用，其 proxy 启动超时已有 finally 清理，需检查实际 Codex 其他定时器的退出和取消，不直接移植，归 B2。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-ad369d2856)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ad369d2856)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ad369d2856)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-11T14:32:26+08:00；父提交：a07464187c。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（1 个）：
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`

<a id="commit-a07464187c"></a>
## [a07464187c](https://github.com/weiesky/cc-viewer/commit/a07464187c0b4e3a7a0c3d02f0f4b4c8d69069fd) — fix(web): 新建工作区弹窗底部出血加高
- B0 本地关键代码对照：上游修正 workspace modal 底部 padding；本地 WorkspaceList.jsx 和样式存在但布局不同，需桌面/移动端实测目录树末行可见，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a07464187c)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a07464187c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a07464187c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:48+08:00；作者时间：2026-10-11T14:21:52+08:00；父提交：04d05a5824。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（2 个）：
  - `apps/web/src/components/dashboard/WorkspaceList.module.css` → 本地候选：`src/components/dashboard/WorkspaceList.module.css`
  - `history.md` → 无直接路径匹配

<a id="commit-04d05a5824"></a>
## [04d05a5824](https://github.com/weiesky/cc-viewer/commit/04d05a58240132f057eeef6e830794190b10bc04) — feat(sdk): SDK 模式健壮性修正 + 新增「Context 用量」面板
- 2026-11-21 B4 E66：用户明确指定临时Playwright后，G1–G5实际Chromium/WebKit/phone-pad仿真GUI已通过，12原截图/哈希；最终1580全量、0skip、构建与pack:dry-run通过。仅B4范围收口，其他混合工作包未迁项仍独立。见[B4完成矩阵](./B4-completion-matrix.md)及[最终GUI回执](./B4-final-gui-2026-11-21.json)。
- 2026-11-21 B4 E60：已选原Context分类入口/居中不可用态，Codex无真实分类producer、现有用量条保持；相关Provider/fetch/timer/palette不新增空实现。55组件+7用量/1579完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过；GUI待、其他混合范围不整体勾选。具体源码阅读/适配边界见[B4.63](./B4-implementation.md)及[B4分类回执](./B4-context-unavailable-2026-11-21.json)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-04d05a5824)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-04d05a5824)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-13T00:25:47+08:00；作者时间：2026-10-11T14:20:58+08:00；父提交：d88d8aee2a。
- B0 本地关键代码对照：已核验上游能力及本地入口；结论和未验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（21 个）：
  - `.changeset/sdk-context-usage-panel.md` → 无直接路径匹配
  - `.changeset/sdk-p2-hardening.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/components/dashboard/SdkContextUsageTab.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/SdkContextUsageTab.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/contextUsageView.js` → 无直接路径匹配
  - `apps/web/test/context-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/context-usage-view.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sdk-context-usage-tab.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/sdk-context.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/sdk-context-route.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-d88d8aee2a"></a>
## [d88d8aee2a](https://github.com/weiesky/cc-viewer/commit/d88d8aee2a07dd29345e34c2885805b267025844) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d88d8aee2a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d88d8aee2a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-12T10:46:32+00:00；作者时间：2026-10-12T10:46:32+00:00；父提交：7f7f78e2d8。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-7f7f78e2d8"></a>
## [7f7f78e2d8](https://github.com/weiesky/cc-viewer/commit/7f7f78e2d8c04ae578c892981acde12999ed1d05) — feat(web): 新建工作区目录树「启动」一步直启
- B0 本地关键代码对照：本地 WorkspaceList.jsx 已有目录浏览和 launch 接口；需逐项验证目录树行内启动、权限选项和新窗口行为是否对齐，归 B2/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-7f7f78e2d8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7f7f78e2d8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7f7f78e2d8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-10T22:53:55+08:00；作者时间：2026-10-10T22:53:55+08:00；父提交：956af1723f。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（3 个）：
  - `.changeset/dirbrowser-direct-launch.md` → 无直接路径匹配
  - `apps/web/src/components/dashboard/WorkspaceList.jsx` → 本地候选：`src/components/dashboard/WorkspaceList.jsx`
  - `history.md` → 无直接路径匹配

<a id="commit-956af1723f"></a>
## [956af1723f](https://github.com/weiesky/cc-viewer/commit/956af1723f07312dd4580418d6d097bacbb1c448) — chore(release): 1.9.3
- [B0 upstream full commit message](./B0-upstream-messages.md#message-956af1723f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-956af1723f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-10T15:35:57+08:00；作者时间：2026-10-10T15:35:57+08:00；父提交：d6cab4869a。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（8 个）：
  - `.changeset/instance-live-empty-view.md` → 无直接路径匹配
  - `.changeset/sdk-approval-timeout-broadcast.md` → 无直接路径匹配
  - `.changeset/sdk-resident-query.md` → 无直接路径匹配
  - `.changeset/sdk-session-switch.md` → 无直接路径匹配
  - `.changeset/sdk-task-messages-relay.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-d6cab4869a"></a>
## [d6cab4869a](https://github.com/weiesky/cc-viewer/commit/d6cab4869aa8ca1296302fd7d2a94cb8cd2430d8) — feat(server): relay SDK task_* messages as sdk-task WS frames (#147)
- B0 本地关键代码对照：混合 Claude SDK 权限超时 dismiss、流式输入 interrupt/重建、SDK 续会、空 workspace 隔离和 task_* WS 转发。本地 lib/sdk-manager.js 使用 Codex SDK、appserver-bridge.js 独立处理事件；应采集 Codex 实际事件并测试取消、重连和跨项目空会话，拆归 B2/B3/B4/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-d6cab4869a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d6cab4869a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d6cab4869a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-10T15:24:07+08:00；作者时间：2026-10-10T15:24:07+08:00；父提交：c93c3110ed。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（18 个）：
  - `.changeset/instance-live-empty-view.md` → 无直接路径匹配
  - `.changeset/sdk-approval-timeout-broadcast.md` → 无直接路径匹配
  - `.changeset/sdk-resident-query.md` → 无直接路径匹配
  - `.changeset/sdk-session-switch.md` → 无直接路径匹配
  - `.changeset/sdk-task-messages-relay.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/sid-not-found-live-empty.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-sdk-manager.test.js` → 无直接路径匹配
  - `packages/app/test/events-instance-live-empty.test.js` → 无直接路径匹配
  - `packages/app/test/resume-route.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-extra.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配

<a id="commit-c93c3110ed"></a>
## [c93c3110ed](https://github.com/weiesky/cc-viewer/commit/c93c3110ed928546d3d42adf2f7c72dcbf3db8fe) — Update README.md
- B0 本地关键代码对照：该提交仅从上游 README 删除 4 行；本地 README 应核对变更内容是否适用，不能将删除当作功能升级；归 B11 文档。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-c93c3110ed)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c93c3110ed)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c93c3110ed)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-10T10:08:58+08:00；作者时间：2026-10-10T10:08:58+08:00；父提交：3fa5717865。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（1 个）：
  - `README.md` → 本地候选：`README.md`

<a id="commit-3fa5717865"></a>
## [3fa5717865](https://github.com/weiesky/cc-viewer/commit/3fa5717865eebad60ee92af80b482c97728233f4) — ci(release): carry `latest` on the publish itself, widen the homebrew poll
- B0 本地关键代码对照：上游修正 OIDC dist-tag：发布时根据已有版本选择 latest 或 patch，并扩展 Homebrew 等待；本地 npm-publish.yml 直接发布无上游 job，若引入需核实本包版本顺序、OIDC 及无损回退，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-3fa5717865)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3fa5717865)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3fa5717865)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-09T18:48:22+08:00；作者时间：2026-10-09T18:48:22+08:00；父提交：97f22c8c9a。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（2 个）：
  - `.github/workflows/bump-homebrew.yml` → 无直接路径匹配
  - `.github/workflows/release.yml` → 无直接路径匹配

<a id="commit-97f22c8c9a"></a>
## [97f22c8c9a](https://github.com/weiesky/cc-viewer/commit/97f22c8c9a846edade7127492d73a6e123e17ef8) — chore(release): 1.9.2
- [B0 upstream full commit message](./B0-upstream-messages.md#message-97f22c8c9a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-97f22c8c9a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-09T17:29:49+08:00；作者时间：2026-10-09T17:29:49+08:00；父提交：649f853e5e。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（8 个）：
  - `.changeset/close-bound-project-rebind.md` → 无直接路径匹配
  - `.changeset/git-changes-open-persist.md` → 无直接路径匹配
  - `.changeset/nav-sidebar-detach-chip-cleanup.md` → 无直接路径匹配
  - `.changeset/new-workspace-perf-and-style.md` → 无直接路径匹配
  - `.changeset/workspace-help-modal.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-649f853e5e"></a>
## [649f853e5e](https://github.com/weiesky/cc-viewer/commit/649f853e5e910b3fd1a964f441682d4f08499d2b) — Feat/resume global switcher (#146)
- B0 本地关键代码对照：混合 Git 面板持久化、工作区列表缓存/异步扫描/limit、全局 resume、关闭工作区重绑定及文档；本地 workspace 和 ChatView 结构不同。拆归 B2/B3/B5/B7，优先验证隔离、同名和响应的正确性，不能只按标题实现 resume。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-649f853e5e)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-649f853e5e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-649f853e5e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-09T17:23:44+08:00；作者时间：2026-10-09T17:23:44+08:00；父提交：eb2e9703a2。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（37 个）：
  - `.changeset/close-bound-project-rebind.md` → 无直接路径匹配
  - `.changeset/git-changes-open-persist.md` → 无直接路径匹配
  - `.changeset/nav-sidebar-detach-chip-cleanup.md` → 无直接路径匹配
  - `.changeset/new-workspace-perf-and-style.md` → 无直接路径匹配
  - `.changeset/workspace-help-modal.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `apps/web/src/components/dashboard/NewProjectModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/WorkspaceList.jsx` → 本地候选：`src/components/dashboard/WorkspaceList.jsx`
  - `apps/web/src/components/dashboard/WorkspaceList.module.css` → 本地候选：`src/components/dashboard/WorkspaceList.module.css`
  - `apps/web/src/global.css` → 本地候选：`src/global.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/reboundScope.js` → 无直接路径匹配
  - `apps/web/src/utils/resumeSessions.js` → 无直接路径匹配
  - `apps/web/test/git-changes-open-persist.test.js` → 无直接路径匹配
  - `apps/web/test/live-processes-refresh.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/rebound-scope.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/resume-sessions-map.test.js` → 无直接路径匹配
  - `apps/web/test/workspace-list-modal.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/v2/layout.js` → 本地候选：`lib/log-v2/layout.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/server/workspace-registry.js` → 本地候选：`workspace-registry.js`
  - `packages/app/test/api-workspaces.test.js` → 无直接路径匹配
  - `packages/app/test/branch-workspace-registry.test.js` → 无直接路径匹配
  - `packages/app/test/live-processes-close.test.js` → 无直接路径匹配
  - `packages/app/test/workspace-registry-limit.test.js` → 无直接路径匹配
  - `packages/app/test/workspace-registry.test.js` → 无直接路径匹配

<a id="commit-eb2e9703a2"></a>

- 2026-11-19 用户纠偏：必须优先参考PR实际代码，文档不是自由设计依据。已读取固定快照HeaderProjectSwitcher/HeaderProjectTabs/SortableProjectTab及projectTab CSS；d39d3a8及d4bc607/fb53455/b280d00/f870f2d等UI实现存在形态、尺寸、入口与关闭交互差异，相关B2视觉/交互恢复待纠偏。原功能测试保留但不能证明基线一致。见migration-code-first.md；未改代码、未标整包完成。

- 02349c2保留Header重排后的项目别名显示与编辑；f870f2d补窄屏独立操作菜单（前后排序/关闭）、历史图标、44px触控目标和焦点回填，防菜单冒泡触发切会话；Web196/196及构建、Chrome400px实际菜单排序保持原实例通过，320px最终CSS复测待继续。

- b280d00按用户明确预期将多工作区控件从独立栏移入Header，复用现有Tabs/恢复与close实现，桌面40px同排、粗指针56px；移动Header内换行。Web195/195和构建通过，Chrome实际切换、Safari打开历史及关闭邻实例时当前任务保留通过。历史恢复完整GUI、移动/真机继续，未标大型混合提交整体完成。
## [eb2e9703a2](https://github.com/weiesky/cc-viewer/commit/eb2e9703a2837550a9bf2a62a8bb5d20fac7f723) — feat(web): project tab drag-to-reorder + persist order; focus/mask fixes; 1.8.x series summary (v1.9.1) (#145)
- fb53455补pointer排序及同名路径尾部；真实Chrome拖动已通过、活动实例保持、触控滚动不被重排手势拦截。完整Web193/193和构建通过。大型混合提交其余包保持未整体完成。
- 2026-11-19 B2排序子项：`d4bc607`按稳定SDK instanceKey持久化顶部顺序，poll保持、新项追加；复用原生drag/内部MIME隔离上传，提供role=tab兄弟节点的独立触控/键盘按钮、焦点/读屏及storage同步。排序不导航/关闭/发送。定向9/9，全量1252/1252/构建；最终1253全量及682文件新安装55/55覆盖。GUI host不可用，真实拖动/触控/读屏未验收；本提交其余混合子项仍待，**不标整条完成**。见[B2记录](./B2-session-isolation.md)。
- B0 本地关键代码对照：大型混合提交：项目 tab 切换、工作区目录树、恢复列表、每项目 feed、删除旧 resume/alias 和安全修复。本地 AppBase.jsx 有 workspace_started 和 launch，未见 workspace tab 排序实现。拆归 B2/B3/B7；必须核对真实隔离与数据流，不能仅 cherry-pick 整包。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-eb2e9703a2)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-eb2e9703a2)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-eb2e9703a2)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-08T12:20:24+08:00；作者时间：2026-10-08T12:20:24+08:00；父提交：2ae12ca122。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（153 个）：
  - `apps/electron/electron/tab-worker.js` → 本地候选：`electron/tab-worker.js`
  - `apps/web/package.json` → 本地候选：`package.json`
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/App.module.css` → 本地候选：`src/App.module.css`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/ResumeSessionsPopover.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/ResumeSessionsPopover.module.css` → 无直接路径匹配
  - `apps/web/src/components/common/ConceptHelp.jsx` → 本地候选：`src/components/common/ConceptHelp.jsx`
  - `apps/web/src/components/common/Loading.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/Loading.module.css` → 无直接路径匹配
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/ResumeSessionsRow.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/ResumeSessionsRow.module.css` → 无直接路径匹配
  - `apps/web/src/components/common/quickMenuIcons.jsx` → 本地候选：`src/components/common/quickMenuIcons.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/components/dashboard/DirBrowser.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/NewProjectModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/dashboard/WorkspaceList.jsx` → 本地候选：`src/components/dashboard/WorkspaceList.jsx`
  - `apps/web/src/components/dashboard/WorkspaceList.module.css` → 本地候选：`src/components/dashboard/WorkspaceList.module.css`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/MdxEditorPanel.module.css` → 本地候选：`src/components/files/MdxEditorPanel.module.css`
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/components/git/GitDiffView.jsx` → 本地候选：`src/components/git/GitDiffView.jsx`
  - `apps/web/src/components/mobile/MobileFileExplorer.jsx` → 本地候选：`src/components/mobile/MobileFileExplorer.jsx`
  - `apps/web/src/components/mobile/MobileGitDiff.jsx` → 本地候选：`src/components/mobile/MobileGitDiff.jsx`
  - `apps/web/src/components/proxy-stats/ProxyStatsDashboard.jsx` → 无直接路径匹配
  - `apps/web/src/components/proxy-stats/ProxyStatsModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/search/SearchPanel.jsx` → 本地候选：`src/components/search/SearchPanel.jsx`
  - `apps/web/src/components/settings/ImAppendSystemModal.jsx` → 本地候选：`src/components/settings/ImAppendSystemModal.jsx`
  - `apps/web/src/components/settings/ImConversationModal.jsx` → 本地候选：`src/components/settings/ImConversationModal.jsx`
  - `apps/web/src/components/settings/ProjectAliasEditor.jsx` → 本地候选：`src/components/settings/ProjectAliasEditor.jsx`
  - `apps/web/src/components/settings/ProjectAliasEditor.module.css` → 本地候选：`src/components/settings/ProjectAliasEditor.module.css`
  - `apps/web/src/components/settings/ProjectPrefsManagerModal.jsx` → 本地候选：`src/components/settings/ProjectPrefsManagerModal.jsx`
  - `apps/web/src/components/settings/RetryConfigModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/settings/SkillsManagerModal.jsx` → 本地候选：`src/components/settings/SkillsManagerModal.jsx`
  - `apps/web/src/components/settings/SystemTextModal.jsx` → 本地候选：`src/components/settings/SystemTextModal.jsx`
  - `apps/web/src/components/terminal/CustomUltraplanEditModal.jsx` → 本地候选：`src/components/terminal/CustomUltraplanEditModal.jsx`
  - `apps/web/src/components/terminal/PresetExpertPickerModal.jsx` → 本地候选：`src/components/terminal/PresetExpertPickerModal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalWsContext.jsx` → 本地候选：`src/components/terminal/TerminalWsContext.jsx`
  - `apps/web/src/components/viewers/ImageViewer.jsx` → 本地候选：`src/components/viewers/ImageViewer.jsx`
  - `apps/web/src/global.css` → 本地候选：`src/global.css`
  - `apps/web/src/hooks/useProjectAlias.js` → 本地候选：`src/hooks/useProjectAlias.js`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/apiUrl.js` → 本地候选：`src/utils/apiUrl.js`
  - `apps/web/src/utils/gitApi.js` → 本地候选：`src/utils/gitApi.js`
  - `apps/web/src/utils/mdCodePathVerify.js` → 无直接路径匹配
  - `apps/web/src/utils/projectAlias.js` → 本地候选：`src/utils/projectAlias.js`
  - `apps/web/src/utils/projectTabOrder.js` → 无直接路径匹配
  - `apps/web/src/utils/resumeSessions.js` → 无直接路径匹配
  - `apps/web/src/utils/searchApi.js` → 本地候选：`src/utils/searchApi.js`
  - `apps/web/src/utils/seqResourceLoaders.js` → 本地候选：`src/utils/seqResourceLoaders.js`
  - `apps/web/src/utils/sessionManager.js` → 本地候选：`src/utils/sessionManager.js`
  - `apps/web/src/utils/terminalAnchor.js` → 无直接路径匹配
  - `apps/web/src/utils/userImageRefs.js` → 本地候选：`src/utils/userImageRefs.js`
  - `apps/web/src/utils/viewScope.js` → 无直接路径匹配
  - `apps/web/src/utils/viewStateCache.js` → 无直接路径匹配
  - `apps/web/src/utils/viewedWorkspaceStorage.js` → 无直接路径匹配
  - `apps/web/test/api-url-gap.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-projectAlias.test.js` → 无直接路径匹配
  - `apps/web/test/detach-view-reset.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/live-processes-refresh.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/project-tab-order.test.js` → 无直接路径匹配
  - `apps/web/test/projectAlias.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/resume-history-menu.test.js` → 无直接路径匹配
  - `apps/web/test/resume-sessions-map.test.js` → 无直接路径匹配
  - `apps/web/test/session-manager.test.js` → 无直接路径匹配
  - `apps/web/test/sse-connection-gen.test.js` → 无直接路径匹配
  - `apps/web/test/stream-switch-bleed.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-anchor.test.js` → 无直接路径匹配
  - `apps/web/test/user-markdown.test.js` → 无直接路径匹配
  - `apps/web/test/view-cache-restore.test.js` → 无直接路径匹配
  - `apps/web/test/view-scope.test.js` → 无直接路径匹配
  - `apps/web/test/view-state-cache.test.js` → 无直接路径匹配
  - `apps/web/test/view-switch-sse-scope.test.js` → 无直接路径匹配
  - `apps/web/test/viewed-workspace-storage.test.js` → 无直接路径匹配
  - `docs/handoff-samename-chat-panel.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/chat-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/same-origin.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/convert.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/layout.js` → 本地候选：`lib/log-v2/layout.js`
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/resume-list.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-select.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/view-router.js` → 无直接路径匹配
  - `packages/app/server/lib/view-root.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/expert.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/server/routes/git.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/routes/project-meta.js` → 无直接路径匹配
  - `packages/app/server/routes/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/routes/resume.js` → 无直接路径匹配
  - `packages/app/server/routes/search.js` → 无直接路径匹配
  - `packages/app/server/routes/skills.js` → 无直接路径匹配
  - `packages/app/server/routes/v2.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/server/workspace-registry.js` → 本地候选：`workspace-registry.js`
  - `packages/app/test/branch-routes-workspaces.test.js` → 无直接路径匹配
  - `packages/app/test/chat-queue-resume.test.js` → 无直接路径匹配
  - `packages/app/test/events-incremental-project.test.js` → 无直接路径匹配
  - `packages/app/test/events-samename-cwd.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-continuation-sync.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-instance-header.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-resume-crossproject.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-resume-project.test.js` → 无直接路径匹配
  - `packages/app/test/live-processes-close.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-anchor.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-gap.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-instance.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager.test.js` → 本地候选：`tests/pty-manager.test.js`
  - `packages/app/test/resume-route.test.js` → 无直接路径匹配
  - `packages/app/test/resume-sessions.test.js` → 无直接路径匹配
  - `packages/app/test/scratch-pty-manager.test.js` → 无直接路径匹配
  - `packages/app/test/stream-chunk-scope.test.js` → 无直接路径匹配
  - `packages/app/test/streaming-status-scope.test.js` → 无直接路径匹配
  - `packages/app/test/v2-core.test.js` → 无直接路径匹配
  - `packages/app/test/v2-layout-normalize-cwd.test.js` → 无直接路径匹配
  - `packages/app/test/v2-live-feed-instance.test.js` → 无直接路径匹配
  - `packages/app/test/v2-resume-switch.test.js` → 无直接路径匹配
  - `packages/app/test/v2-session-select.test.js` → 无直接路径匹配
  - `packages/app/test/view-root.test.js` → 无直接路径匹配
  - `packages/app/test/view-router.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project-r4.test.js` → 无直接路径匹配
  - `packages/app/test/view-routes-project.test.js` → 无直接路径匹配
  - `packages/app/test/workspace-registry.test.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-2ae12ca122"></a>
## [2ae12ca122](https://github.com/weiesky/cc-viewer/commit/2ae12ca122c9d3210e8f7464970fc8c8df91b067) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2ae12ca122)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2ae12ca122)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-10-05T10:23:57+00:00；作者时间：2026-10-05T10:23:57+00:00；父提交：975e1ee8ce。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-975e1ee8ce"></a>
## [975e1ee8ce](https://github.com/weiesky/cc-viewer/commit/975e1ee8ce52f72a81961ab4c6082f24fbfae951) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-975e1ee8ce)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-975e1ee8ce)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-28T09:44:10+00:00；作者时间：2026-09-28T09:44:10+00:00；父提交：cb50f60d5e。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-cb50f60d5e"></a>
## [cb50f60d5e](https://github.com/weiesky/cc-viewer/commit/cb50f60d5e5505212c86b2ed84b89bf36a378e2d) — Merge pull request #144 from weiesky/feature/config-convergence
- [B0 upstream full commit message](./B0-upstream-messages.md#message-cb50f60d5e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-cb50f60d5e)

- B0 血缘：相对第一父分支引入窗口内 7 条可达提交：[68fd263aac](#commit-68fd263aac), [964ce756b6](#commit-964ce756b6), [565613bbea](#commit-565613bbea), [739f49a6de](#commit-739f49a6de), [3e7f047290](#commit-3e7f047290), [4c5e633e68](#commit-4c5e633e68), [b1fe5c09a6](#commit-b1fe5c09a6)。合并与分支变更不得重复计算。

- 提交时间：2026-09-21T13:13:47-04:00；作者时间：2026-09-21T13:13:47-04:00；父提交：19f563d300, 68fd263aac。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 未检测到相对第一父提交的路径变化；应检查合并历史或上游完整 diff。

<a id="commit-19f563d300"></a>
## [19f563d300](https://github.com/weiesky/cc-viewer/commit/19f563d30040786e2e6c70fce2313a20cde1f625) — chore(release): 1.8.20
- [B0 upstream full commit message](./B0-upstream-messages.md#message-19f563d300)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-19f563d300)

- B0 补丁指纹：与 [68fd263aac](#commit-68fd263aac) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:50:37+08:00；作者时间：2026-09-22T00:31:52+08:00；父提交：384dee8025。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/config-json-store-kernel.md` → 无直接路径匹配
  - `.changeset/credential-vault.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-384dee8025"></a>
## [384dee8025](https://github.com/weiesky/cc-viewer/commit/384dee802522c18cea7c1deed38af4508feb6d86) — docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter
- B0 本地关键代码对照：与 964ce756b6 补丁指纹相同，是同一云同步契约改写的另一血缘，不重复实施；最终文档及本地产品范围归 B1。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-384dee8025)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-384dee8025)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-384dee8025)

- B0 补丁指纹：与 [964ce756b6](#commit-964ce756b6) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:50:37+08:00；作者时间：2026-09-21T23:31:43+08:00；父提交：3cba408188。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（2 个）：
  - `docs/config-cloud-sync.md` → 无直接路径匹配
  - `docs/config-cloud-sync.zh.md` → 无直接路径匹配

<a id="commit-3cba408188"></a>
## [3cba408188](https://github.com/weiesky/cc-viewer/commit/3cba408188f247195c4a43d6fee9ac2382c5b217) — fix(server): revert credential root to frozen; close re-review findings
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3cba408188)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3cba408188)

- B0 补丁指纹：与 [565613bbea](#commit-565613bbea) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:50:37+08:00；作者时间：2026-09-21T20:52:14+08:00；父提交：3c78188314。
- B0 本地关键代码对照：已检查上游最终修改和本地入口；范围与后续风险见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（11 个）：
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/async-file-lock.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-access.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/routes/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/test/api-auth.test.js` → 无直接路径匹配
  - `packages/app/test/api-preferences-gap.test.js` → 无直接路径匹配
  - `packages/app/test/file-access-policy.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配

<a id="commit-3c78188314"></a>
## [3c78188314](https://github.com/weiesky/cc-viewer/commit/3c7818831475dcf4d55069e2692a028c35a7b241) — fix(server): close review findings on the credential vault + json-store convergence
- 2026-11-18 本地验收映射：`b549125` 补齐新生产安装的迁移后匹配备份、分库、HTTP认证、无损修复、恢复和坏库拒绝/取证；全量1161/1161、构建及680文件产物通过。用户已明确不提供有损整库回退。仅收尾B1.2本地验收子项，真实用户/目标环境仍待，不标整条上游完成。见 [验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 本轮无损恢复适配：3f81fbc 离线认证全部当前记录且不返回明文；8732a33 增加用途隔离的精确损坏证据；0122f7e 仅在候选 key 可认证每条 live 记录时替换 key，source/store 字节及备份后其他配置凭据保留；20ce331 提供默认只读、显式保存现场命令。最终全量1161/1161、0 skip、无失败钩子，构建/npm680文件与实际tarball证明/修复/新进程/拒绝坏库/取证通过。相关整条仍部分对齐：首次迁移后含新key的备份及真实流程需验收，有损整库回退未启用、产品选择待回复。见 [key与取证证据](./B1-key-repair.md)、[验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 最新恢复适配：36d0697 已实现三类源的私有快照预览/显式恢复；按本轮用户选择整份 preferences 回退，旧快照 secret 重绑现有 live key，保留其他 owner 的后续凭据；有安全快照、源锁、原子替换/目录同步、回执及中断重试。恢复 15 项，全量 1144/1144、0 skip、构建/npm 677 文件、实际 tarball 三类恢复及新进程解码通过。43150d4 仅修正原有 readiness 测试调度余量。丢 key/store/坏密文 live 库的整库恢复和真实环境验收仍待，相关上游整条继续部分对齐。见 [恢复证据](./B1-recovery-scope.md)。
- B1.2 最新适配：c52565b 完成 IM 显式迁移，复用严格解析与源锁，验证快照、暂存、私有源切换、目录 fsync 与回执；停用空 secret 用 null 引用，支持中断重试并保留共享库其他 owner。c24fad5 先修复 IM 临时文件碰撞。定向 47/47、全量 1129/1129、0 skip、构建/npm 675 文件预览、实际 tarball 三类迁移及新进程解码通过；live 可读库恢复已由 36d0697 补齐，整库损坏恢复和完整验收仍待，不标整条完成。见 [IM 证据](./B1-im-migration.md)。
- B1.2 本轮适配：63664dd 完成 proxy 当前文件及 .bak 显式迁移，复用运行时源锁，验证快照后切换独立密钥版本并写入回执，覆盖提交间退出/重启/失败及共享库保留；9083833 修复复用原子写入器的临时文件碰撞清理。定向 34/34、全量 1117/1117、构建及 npm 674 文件预览通过；IM 迁移和 live 安全恢复尚待，不标整条已对齐。见 [迁移证据](./B1-proxy-migration.md)。
- B1.2 访问保护子项：ad19a34 定义冻结私有路径与别名检查，3cace4e 在内容/raw 端点执行，含 descriptor 身份校验；隔离全量分别 1022/1022、1024/1024 通过。ce5d639 另完成 Node/rg 搜索及批量替换保护（私有路径、硬链接及 descriptor 校验），隔离全量 1028/1028、无失败钩子、0 skip。b6fe3e9 完成目录浏览保护（隔离全量 1030/1030）；0419026 完成重命名/移动/删除保护及 EXDEV 私有子项检查（隔离全量 1032/1032）；89d20f0 完成新建/导入目的地保护（隔离全量 1037/1037）；027d5a1 完成旧格式配置及已知 profile 备份保护（隔离全量 1039/1039）；3960ffe 完成静态/插件源码/Markdown 响应保护（隔离全量 1040/1040）；c5c0ea0 完成日志 ZIP 复制前保护（隔离全量 1041/1041）；60def58 完成记忆/技能元数据/统计读取保护（隔离全量 1044/1044）；325ecbe 完成归属绑定的暂存引用（隔离全量 1047/1047）；e539f4c 修复原子替换并发读取（隔离全量 1048/1048）；a310346 完成显式迁移后的 auth 运行时及 HTTP/WS 保护（隔离全量 1054/1054）；8c17d9c 完成代理凭据解码模块（隔离全量 1057/1057）；d878eb2 完成代理写入及 .bak 版本保留（隔离全量 1061/1061）；85636c9 完成 proxy runtime/API 及合成上游转发/丢 key 拒绝（隔离全量 1064/1064）；90eb63b 修正 IM 私有写入提交边界（隔离全量 1065/1065）；a089128 完成 IM 严格读取/源锁及 HTTP 409（隔离全量 1068/1068）；6d36759 完成显式迁移后的 IM 凭据运行时及 HTTP 409（隔离全量 1075/1075）；687a210 完成持久迁移回执原语（隔离全量 1077/1077）；8a1ad0d 在 auth/proxy/IM 读取及保存时执行回执保护，拒绝配置删除或整体降级，含实际 HTTP/WS（定向 52/52、隔离全量 1082/1082，无失败钩子、0 skip）；0d2bf0f 完成私有可验证恢复快照原语及跨进程并发（隔离全量 1089/1089，构建、打包 1013 文件通过）；fa25aaa 完成 auth 默认只读、显式 apply 的备份/暂存/源切换/回执迁移命令，含实际 HTTP/WS、崩溃后续跑、并发及写失败（最终隔离全量 1099/1099，构建、打包 1014 文件通过；首次 readiness 计时失败及重跑证据见 B1 记录）；proxy 迁移已由 63664dd 补齐；IM 迁移由 c52565b 补齐，36d0697 已补齐 live 库可读时的按配置恢复，完整库损坏恢复仍待（当前 IM 无本地附件发送）；ab7147b 按用户选择为 LOG_DIR/profile 分别定义冻结的私有库归属并保护两处根（隔离全量 1029/1029），未启用运行时，不标为整条已对齐，见 [B1 记录](./B1-config-implementation.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3c78188314)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3c78188314)

- B0 补丁指纹：与 [739f49a6de](#commit-739f49a6de) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:50:37+08:00；作者时间：2026-09-21T17:17:04+08:00；父提交：811b049485。
- B0 本地关键代码对照：已检查上游最终修改和本地入口；范围与后续风险见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（21 个）：
  - `.changeset/credential-vault.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `docs/config-cloud-sync.md` → 无直接路径匹配
  - `docs/config-cloud-sync.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/credential-access.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-migrate.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-config.js` → 无直接路径匹配
  - `packages/app/server/lib/json-store.js` → 无直接路径匹配
  - `packages/app/server/routes/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/test/api-auth.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-preferences.test.js` → 无直接路径匹配
  - `packages/app/test/file-access-policy.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-profile.test.js` → 无直接路径匹配
  - `packages/app/test/json-store.test.js` → 无直接路径匹配

<a id="commit-811b049485"></a>
## [811b049485](https://github.com/weiesky/cc-viewer/commit/811b049485e7f82a3d9b975443fa0ddf06f3e4f9) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault
- 2026-11-18 本地验收映射：`b549125` 补齐新生产安装的迁移后匹配备份、分库、HTTP认证、无损修复、恢复和坏库拒绝/取证；全量1161/1161、构建及680文件产物通过。用户已明确不提供有损整库回退。仅收尾B1.2本地验收子项，真实用户/目标环境仍待，不标整条上游完成。见 [验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 本轮无损恢复适配：3f81fbc 离线认证全部当前记录且不返回明文；8732a33 增加用途隔离的精确损坏证据；0122f7e 仅在候选 key 可认证每条 live 记录时替换 key，source/store 字节及备份后其他配置凭据保留；20ce331 提供默认只读、显式保存现场命令。最终全量1161/1161、0 skip、无失败钩子，构建/npm680文件与实际tarball证明/修复/新进程/拒绝坏库/取证通过。相关整条仍部分对齐：首次迁移后含新key的备份及真实流程需验收，有损整库回退未启用、产品选择待回复。见 [key与取证证据](./B1-key-repair.md)、[验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 最新恢复适配：36d0697 已实现三类源的私有快照预览/显式恢复；按本轮用户选择整份 preferences 回退，旧快照 secret 重绑现有 live key，保留其他 owner 的后续凭据；有安全快照、源锁、原子替换/目录同步、回执及中断重试。恢复 15 项，全量 1144/1144、0 skip、构建/npm 677 文件、实际 tarball 三类恢复及新进程解码通过。43150d4 仅修正原有 readiness 测试调度余量。丢 key/store/坏密文 live 库的整库恢复和真实环境验收仍待，相关上游整条继续部分对齐。见 [恢复证据](./B1-recovery-scope.md)。
- B1.2 最新适配：c52565b 完成 IM 显式迁移，复用严格解析与源锁，验证快照、暂存、私有源切换、目录 fsync 与回执；停用空 secret 用 null 引用，支持中断重试并保留共享库其他 owner。c24fad5 先修复 IM 临时文件碰撞。定向 47/47、全量 1129/1129、0 skip、构建/npm 675 文件预览、实际 tarball 三类迁移及新进程解码通过；live 可读库恢复已由 36d0697 补齐，整库损坏恢复和完整验收仍待，不标整条完成。见 [IM 证据](./B1-im-migration.md)。
- B1.2 本轮适配：63664dd 完成 proxy 当前文件及 .bak 显式迁移，复用运行时源锁，验证快照后切换独立密钥版本并写入回执，覆盖提交间退出/重启/失败及共享库保留；9083833 修复复用原子写入器的临时文件碰撞清理。定向 34/34、全量 1117/1117、构建及 npm 674 文件预览通过；IM 迁移和 live 安全恢复尚待，不标整条已对齐。见 [迁移证据](./B1-proxy-migration.md)。
- B1.2 访问保护子项：ad19a34 定义冻结私有路径与别名检查，3cace4e 在内容/raw 端点执行，含 descriptor 身份校验；隔离全量分别 1022/1022、1024/1024 通过。ce5d639 另完成 Node/rg 搜索及批量替换保护（私有路径、硬链接及 descriptor 校验），隔离全量 1028/1028、无失败钩子、0 skip。b6fe3e9 完成目录浏览保护（隔离全量 1030/1030）；0419026 完成重命名/移动/删除保护及 EXDEV 私有子项检查（隔离全量 1032/1032）；89d20f0 完成新建/导入目的地保护（隔离全量 1037/1037）；027d5a1 完成旧格式配置及已知 profile 备份保护（隔离全量 1039/1039）；3960ffe 完成静态/插件源码/Markdown 响应保护（隔离全量 1040/1040）；c5c0ea0 完成日志 ZIP 复制前保护（隔离全量 1041/1041）；60def58 完成记忆/技能元数据/统计读取保护（隔离全量 1044/1044）；325ecbe 完成归属绑定的暂存引用（隔离全量 1047/1047）；e539f4c 修复原子替换并发读取（隔离全量 1048/1048）；a310346 完成显式迁移后的 auth 运行时及 HTTP/WS 保护（隔离全量 1054/1054）；8c17d9c 完成代理凭据解码模块（隔离全量 1057/1057）；d878eb2 完成代理写入及 .bak 版本保留（隔离全量 1061/1061）；85636c9 完成 proxy runtime/API 及合成上游转发/丢 key 拒绝（隔离全量 1064/1064）；90eb63b 修正 IM 私有写入提交边界（隔离全量 1065/1065）；a089128 完成 IM 严格读取/源锁及 HTTP 409（隔离全量 1068/1068）；6d36759 完成显式迁移后的 IM 凭据运行时及 HTTP 409（隔离全量 1075/1075）；687a210 完成持久迁移回执原语（隔离全量 1077/1077）；8a1ad0d 在 auth/proxy/IM 读取及保存时执行回执保护，拒绝配置删除或整体降级，含实际 HTTP/WS（定向 52/52、隔离全量 1082/1082，无失败钩子、0 skip）；0d2bf0f 完成私有可验证恢复快照原语及跨进程并发（隔离全量 1089/1089，构建、打包 1013 文件通过）；fa25aaa 完成 auth 默认只读、显式 apply 的备份/暂存/源切换/回执迁移命令，含实际 HTTP/WS、崩溃后续跑、并发及写失败（最终隔离全量 1099/1099，构建、打包 1014 文件通过；首次 readiness 计时失败及重跑证据见 B1 记录）；proxy 迁移已由 63664dd 补齐；IM 迁移由 c52565b 补齐，36d0697 已补齐 live 库可读时的按配置恢复，完整库损坏恢复仍待（当前 IM 无本地附件发送）；ab7147b 按用户选择为 LOG_DIR/profile 分别定义冻结的私有库归属并保护两处根（隔离全量 1029/1029），未启用运行时，不标为整条已对齐，见 [B1 记录](./B1-config-implementation.md)。
- B1.2 存储子项：本地 4a8c0e9 已实现私有 key/store、严格读写、并发及丢钥拒绝；未接运行时。Git 测试隔离全局配置后，全量 1015/1015 且无失败钩子；首次 ENOTEMPTY 环境残留已在 [B1 记录](./B1-config-implementation.md) 保留。
- B1.2 部分迁移：本地 fc7d677 已实现 AES-256-GCM 原语、严格版本封装和身份绑定，隔离全量 1008/1008 通过；不涉及文件、运行时或真实数据迁移。用户已选仅新版运行，下一步 key/store 与读取边界，见 [B1 记录](./B1-config-implementation.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-811b049485)
- B0 status: Adapt in B1: local auth stores reversible Base64; migration needs design.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-811b049485)

- B0 补丁指纹：与 [3e7f047290](#commit-3e7f047290) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:50:37+08:00；作者时间：2026-09-21T11:43:41+08:00；父提交：d663452c29。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- B0 code comparison: B1; local auth uses reversible Base64, not encrypted storage; design migration before changes. See [B0 evidence](./B0-commit-lineage.md#b0-code-findings).
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（29 个）：
  - `.changeset/credential-vault.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/config-backup.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-access.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-migrate.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-store.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-vault.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-config.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-ccswitch-import.test.js` → 无直接路径匹配
  - `packages/app/test/api-preferences-gap.test.js` → 无直接路径匹配
  - `packages/app/test/auth-lib.test.js` → 无直接路径匹配
  - `packages/app/test/credential-access.test.js` → 无直接路径匹配
  - `packages/app/test/credential-migrate.test.js` → 无直接路径匹配
  - `packages/app/test/credential-store.test.js` → 无直接路径匹配
  - `packages/app/test/credential-vault.test.js` → 无直接路径匹配
  - `packages/app/test/dingtalk-config.test.js` → 无直接路径匹配
  - `packages/app/test/discord-config.test.js` → 无直接路径匹配
  - `packages/app/test/feishu-config.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配
  - `packages/app/test/usepassword-startup.test.js` → 无直接路径匹配
  - `packages/app/test/wecom-config.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配


<a id="commit-d663452c29"></a>
## [d663452c29](https://github.com/weiesky/cc-viewer/commit/d663452c29bcb24bf0c3422905c4612208d34646) — feat(server): unify config JSON writes behind a locked+atomic json-store kernel
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d663452c29)
- B0 status: Pending B1 audit: preference, workspace and proxy writes already have separate locks.
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d663452c29)

- B0 补丁指纹：与 [4c5e633e68](#commit-4c5e633e68) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:50:37+08:00；作者时间：2026-09-21T11:43:15+08:00；父提交：9adf4ef539。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- B0 code comparison: B1; local preferences and workspaces already have separate locking and atomic writes; audit consistency. See [B0 evidence](./B0-commit-lineage.md#b0-code-findings).
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（16 个）：
  - `.changeset/config-json-store-kernel.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/ask/ask-store.js` → 无直接路径匹配
  - `packages/app/server/lib/async-file-lock.js` → 无直接路径匹配
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/im/im-config.js` → 无直接路径匹配
  - `packages/app/server/lib/json-store.js` → 无直接路径匹配
  - `packages/app/server/lib/prefs-store.js` → 无直接路径匹配
  - `packages/app/server/lib/session-pin-store.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/workspace-registry.js` → 本地候选：`workspace-registry.js`
  - `packages/app/test/ask-store.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-ask-store.test.js` → 无直接路径匹配
  - `packages/app/test/json-store.test.js` → 无直接路径匹配
  - `packages/app/test/workspace-registry.test.js` → 无直接路径匹配


<a id="commit-9adf4ef539"></a>
## [9adf4ef539](https://github.com/weiesky/cc-viewer/commit/9adf4ef53986bcc13fb092f2f09a99272327ddc9) — docs: add config convergence & cloud-sync advisory, link from READMEs
- B0 本地关键代码对照：与 b1fe5c09a6 补丁指纹相同，是上游云同步咨询文档的另一血缘，后续被 384dee8025 改写；B1 核对最终版本与本地需求。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-9adf4ef539)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9adf4ef539)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9adf4ef539)

- B0 补丁指纹：与 [b1fe5c09a6](#commit-b1fe5c09a6) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:50:37+08:00；作者时间：2026-09-21T11:41:00+08:00；父提交：5a494ba37c。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（20 个）：
  - `README.md` → 本地候选：`README.md`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/config-cloud-sync.md` → 无直接路径匹配
  - `docs/config-cloud-sync.zh.md` → 无直接路径匹配

<a id="commit-68fd263aac"></a>
## [68fd263aac](https://github.com/weiesky/cc-viewer/commit/68fd263aacb9c6a25dd7047fc600e957314548ac) — chore(release): 1.8.20
- [B0 upstream full commit message](./B0-upstream-messages.md#message-68fd263aac)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-68fd263aac)

- B0 补丁指纹：与 [19f563d300](#commit-19f563d300) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-22T00:31:52+08:00；作者时间：2026-09-22T00:31:52+08:00；父提交：964ce756b6。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/config-json-store-kernel.md` → 无直接路径匹配
  - `.changeset/credential-vault.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-964ce756b6"></a>
## [964ce756b6](https://github.com/weiesky/cc-viewer/commit/964ce756b62fafa94694ce8795b028ed5853b220) — docs: rewrite config cloud-sync contract — cloud-side endpoints/schema only, secrets in separate chapter
- B0 本地关键代码对照：与 384dee8025 补丁指纹相同；上游重写云侧端点、schema 与独立敏感信息章节，不等于已经实现同步。B1 先确认是否需要 cloud sync，再评估其安全约束。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-964ce756b6)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-964ce756b6)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-964ce756b6)

- B0 补丁指纹：与 [384dee8025](#commit-384dee8025) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-21T23:31:43+08:00；作者时间：2026-09-21T23:31:43+08:00；父提交：565613bbea。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（2 个）：
  - `docs/config-cloud-sync.md` → 无直接路径匹配
  - `docs/config-cloud-sync.zh.md` → 无直接路径匹配

<a id="commit-565613bbea"></a>
## [565613bbea](https://github.com/weiesky/cc-viewer/commit/565613bbea657b28139614914b385e341c343e62) — fix(server): revert credential root to frozen; close re-review findings
- B1.1 部分迁移：本地 dc883f3 验证读取和拒写采用同一作用域，全局损坏时仍能新建独立项目覆盖，坏的目标项目覆盖禁止覆盖；1000/1000 通过。凭据根/加密迁移等其余子项待 B1.2。详见 [B1 实施记录](./B1-config-implementation.md)。
- B0 本地关键代码对照：与 3cba408188 补丁指纹相同；上游撤销跟随可变 LOG_DIR 的凭据根，避免迁移目录后访问控制失效并强化管理员门禁。B1 应对本地 logDir 切换、密码无法读、越权修改和失败拒绝做组合测试。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-565613bbea)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-565613bbea)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-565613bbea)

- B0 补丁指纹：与 [3cba408188](#commit-3cba408188) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-21T20:52:14+08:00；作者时间：2026-09-21T20:52:14+08:00；父提交：739f49a6de。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（11 个）：
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/async-file-lock.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-access.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/routes/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/test/api-auth.test.js` → 无直接路径匹配
  - `packages/app/test/api-preferences-gap.test.js` → 无直接路径匹配
  - `packages/app/test/file-access-policy.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配

<a id="commit-739f49a6de"></a>
## [739f49a6de](https://github.com/weiesky/cc-viewer/commit/739f49a6dee9c46f4ec9a7c2727832bd1395107f) — fix(server): close review findings on the credential vault + json-store convergence
- 2026-11-18 本地验收映射：`b549125` 补齐新生产安装的迁移后匹配备份、分库、HTTP认证、无损修复、恢复和坏库拒绝/取证；全量1161/1161、构建及680文件产物通过。用户已明确不提供有损整库回退。仅收尾B1.2本地验收子项，真实用户/目标环境仍待，不标整条上游完成。见 [验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 本轮无损恢复适配：3f81fbc 离线认证全部当前记录且不返回明文；8732a33 增加用途隔离的精确损坏证据；0122f7e 仅在候选 key 可认证每条 live 记录时替换 key，source/store 字节及备份后其他配置凭据保留；20ce331 提供默认只读、显式保存现场命令。最终全量1161/1161、0 skip、无失败钩子，构建/npm680文件与实际tarball证明/修复/新进程/拒绝坏库/取证通过。相关整条仍部分对齐：首次迁移后含新key的备份及真实流程需验收，有损整库回退未启用、产品选择待回复。见 [key与取证证据](./B1-key-repair.md)、[验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 最新恢复适配：36d0697 已实现三类源的私有快照预览/显式恢复；按本轮用户选择整份 preferences 回退，旧快照 secret 重绑现有 live key，保留其他 owner 的后续凭据；有安全快照、源锁、原子替换/目录同步、回执及中断重试。恢复 15 项，全量 1144/1144、0 skip、构建/npm 677 文件、实际 tarball 三类恢复及新进程解码通过。43150d4 仅修正原有 readiness 测试调度余量。丢 key/store/坏密文 live 库的整库恢复和真实环境验收仍待，相关上游整条继续部分对齐。见 [恢复证据](./B1-recovery-scope.md)。
- B1.2 最新适配：c52565b 完成 IM 显式迁移，复用严格解析与源锁，验证快照、暂存、私有源切换、目录 fsync 与回执；停用空 secret 用 null 引用，支持中断重试并保留共享库其他 owner。c24fad5 先修复 IM 临时文件碰撞。定向 47/47、全量 1129/1129、0 skip、构建/npm 675 文件预览、实际 tarball 三类迁移及新进程解码通过；live 可读库恢复已由 36d0697 补齐，整库损坏恢复和完整验收仍待，不标整条完成。见 [IM 证据](./B1-im-migration.md)。
- B1.2 本轮适配：63664dd 完成 proxy 当前文件及 .bak 显式迁移，复用运行时源锁，验证快照后切换独立密钥版本并写入回执，覆盖提交间退出/重启/失败及共享库保留；9083833 修复复用原子写入器的临时文件碰撞清理。定向 34/34、全量 1117/1117、构建及 npm 674 文件预览通过；IM 迁移和 live 安全恢复尚待，不标整条已对齐。见 [迁移证据](./B1-proxy-migration.md)。
- B1.2 访问保护子项：ad19a34 定义冻结私有路径与别名检查，3cace4e 在内容/raw 端点执行，含 descriptor 身份校验；隔离全量分别 1022/1022、1024/1024 通过。ce5d639 另完成 Node/rg 搜索及批量替换保护（私有路径、硬链接及 descriptor 校验），隔离全量 1028/1028、无失败钩子、0 skip。b6fe3e9 完成目录浏览保护（隔离全量 1030/1030）；0419026 完成重命名/移动/删除保护及 EXDEV 私有子项检查（隔离全量 1032/1032）；89d20f0 完成新建/导入目的地保护（隔离全量 1037/1037）；027d5a1 完成旧格式配置及已知 profile 备份保护（隔离全量 1039/1039）；3960ffe 完成静态/插件源码/Markdown 响应保护（隔离全量 1040/1040）；c5c0ea0 完成日志 ZIP 复制前保护（隔离全量 1041/1041）；60def58 完成记忆/技能元数据/统计读取保护（隔离全量 1044/1044）；325ecbe 完成归属绑定的暂存引用（隔离全量 1047/1047）；e539f4c 修复原子替换并发读取（隔离全量 1048/1048）；a310346 完成显式迁移后的 auth 运行时及 HTTP/WS 保护（隔离全量 1054/1054）；8c17d9c 完成代理凭据解码模块（隔离全量 1057/1057）；d878eb2 完成代理写入及 .bak 版本保留（隔离全量 1061/1061）；85636c9 完成 proxy runtime/API 及合成上游转发/丢 key 拒绝（隔离全量 1064/1064）；90eb63b 修正 IM 私有写入提交边界（隔离全量 1065/1065）；a089128 完成 IM 严格读取/源锁及 HTTP 409（隔离全量 1068/1068）；6d36759 完成显式迁移后的 IM 凭据运行时及 HTTP 409（隔离全量 1075/1075）；687a210 完成持久迁移回执原语（隔离全量 1077/1077）；8a1ad0d 在 auth/proxy/IM 读取及保存时执行回执保护，拒绝配置删除或整体降级，含实际 HTTP/WS（定向 52/52、隔离全量 1082/1082，无失败钩子、0 skip）；0d2bf0f 完成私有可验证恢复快照原语及跨进程并发（隔离全量 1089/1089，构建、打包 1013 文件通过）；fa25aaa 完成 auth 默认只读、显式 apply 的备份/暂存/源切换/回执迁移命令，含实际 HTTP/WS、崩溃后续跑、并发及写失败（最终隔离全量 1099/1099，构建、打包 1014 文件通过；首次 readiness 计时失败及重跑证据见 B1 记录）；proxy 迁移已由 63664dd 补齐；IM 迁移由 c52565b 补齐，36d0697 已补齐 live 库可读时的按配置恢复，完整库损坏恢复仍待（当前 IM 无本地附件发送）；ab7147b 按用户选择为 LOG_DIR/profile 分别定义冻结的私有库归属并保护两处根（隔离全量 1029/1029），未启用运行时，不标为整条已对齐，见 [B1 记录](./B1-config-implementation.md)。
- B1.1 部分迁移：本地 dc883f3 实现不可读密码的 HTTP/WS/登录/旧 session 保护和锁内拒绝覆盖，API 409，隔离全量 1000/1000 通过；vault、代理路由及备份保护等其余子项未完成。详见 [B1 实施记录](./B1-config-implementation.md)。
- B0 本地关键代码对照：与 3c78188314 补丁指纹相同；上游修复损坏配置覆盖、同步/异步重入锁、凭据读取失败和错误路由。相关 live LOG_DIR 改动随后被 565613bbea 回退；B1 以最终状态核对，不单独移植中间修复。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-739f49a6de)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-739f49a6de)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-739f49a6de)

- B0 补丁指纹：与 [3c78188314](#commit-3c78188314) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-21T17:17:04+08:00；作者时间：2026-09-21T17:17:04+08:00；父提交：3e7f047290。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（21 个）：
  - `.changeset/credential-vault.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `docs/config-cloud-sync.md` → 无直接路径匹配
  - `docs/config-cloud-sync.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/credential-access.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-migrate.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-config.js` → 无直接路径匹配
  - `packages/app/server/lib/json-store.js` → 无直接路径匹配
  - `packages/app/server/routes/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/test/api-auth.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-preferences.test.js` → 无直接路径匹配
  - `packages/app/test/file-access-policy.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-profile.test.js` → 无直接路径匹配
  - `packages/app/test/json-store.test.js` → 无直接路径匹配

<a id="commit-5a494ba37c"></a>
## [5a494ba37c](https://github.com/weiesky/cc-viewer/commit/5a494ba37c0b7333234537130258293f5949ba5b) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5a494ba37c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5a494ba37c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-21T08:54:48+00:00；作者时间：2026-09-21T08:54:48+00:00；父提交：90b41358f9。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-3e7f047290"></a>
## [3e7f047290](https://github.com/weiesky/cc-viewer/commit/3e7f047290eaa054be14cec172553e2f76b696ba) — feat(server): encrypt local credentials at rest in an AES-256-GCM vault
- 2026-11-18 本地验收映射：`b549125` 补齐新生产安装的迁移后匹配备份、分库、HTTP认证、无损修复、恢复和坏库拒绝/取证；全量1161/1161、构建及680文件产物通过。用户已明确不提供有损整库回退。仅收尾B1.2本地验收子项，真实用户/目标环境仍待，不标整条上游完成。见 [验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 本轮无损恢复适配：3f81fbc 离线认证全部当前记录且不返回明文；8732a33 增加用途隔离的精确损坏证据；0122f7e 仅在候选 key 可认证每条 live 记录时替换 key，source/store 字节及备份后其他配置凭据保留；20ce331 提供默认只读、显式保存现场命令。最终全量1161/1161、0 skip、无失败钩子，构建/npm680文件与实际tarball证明/修复/新进程/拒绝坏库/取证通过。相关整条仍部分对齐：首次迁移后含新key的备份及真实流程需验收，有损整库回退未启用、产品选择待回复。见 [key与取证证据](./B1-key-repair.md)、[验收矩阵](./B1-acceptance-matrix.md)。
- B1.2 最新恢复适配：36d0697 已实现三类源的私有快照预览/显式恢复；按本轮用户选择整份 preferences 回退，旧快照 secret 重绑现有 live key，保留其他 owner 的后续凭据；有安全快照、源锁、原子替换/目录同步、回执及中断重试。恢复 15 项，全量 1144/1144、0 skip、构建/npm 677 文件、实际 tarball 三类恢复及新进程解码通过。43150d4 仅修正原有 readiness 测试调度余量。丢 key/store/坏密文 live 库的整库恢复和真实环境验收仍待，相关上游整条继续部分对齐。见 [恢复证据](./B1-recovery-scope.md)。
- B1.2 最新适配：c52565b 完成 IM 显式迁移，复用严格解析与源锁，验证快照、暂存、私有源切换、目录 fsync 与回执；停用空 secret 用 null 引用，支持中断重试并保留共享库其他 owner。c24fad5 先修复 IM 临时文件碰撞。定向 47/47、全量 1129/1129、0 skip、构建/npm 675 文件预览、实际 tarball 三类迁移及新进程解码通过；live 可读库恢复已由 36d0697 补齐，整库损坏恢复和完整验收仍待，不标整条完成。见 [IM 证据](./B1-im-migration.md)。
- B1.2 本轮适配：63664dd 完成 proxy 当前文件及 .bak 显式迁移，复用运行时源锁，验证快照后切换独立密钥版本并写入回执，覆盖提交间退出/重启/失败及共享库保留；9083833 修复复用原子写入器的临时文件碰撞清理。定向 34/34、全量 1117/1117、构建及 npm 674 文件预览通过；IM 迁移和 live 安全恢复尚待，不标整条已对齐。见 [迁移证据](./B1-proxy-migration.md)。
- B1.2 访问保护子项：ad19a34 定义冻结私有路径与别名检查，3cace4e 在内容/raw 端点执行，含 descriptor 身份校验；隔离全量分别 1022/1022、1024/1024 通过。ce5d639 另完成 Node/rg 搜索及批量替换保护（私有路径、硬链接及 descriptor 校验），隔离全量 1028/1028、无失败钩子、0 skip。b6fe3e9 完成目录浏览保护（隔离全量 1030/1030）；0419026 完成重命名/移动/删除保护及 EXDEV 私有子项检查（隔离全量 1032/1032）；89d20f0 完成新建/导入目的地保护（隔离全量 1037/1037）；027d5a1 完成旧格式配置及已知 profile 备份保护（隔离全量 1039/1039）；3960ffe 完成静态/插件源码/Markdown 响应保护（隔离全量 1040/1040）；c5c0ea0 完成日志 ZIP 复制前保护（隔离全量 1041/1041）；60def58 完成记忆/技能元数据/统计读取保护（隔离全量 1044/1044）；325ecbe 完成归属绑定的暂存引用（隔离全量 1047/1047）；e539f4c 修复原子替换并发读取（隔离全量 1048/1048）；a310346 完成显式迁移后的 auth 运行时及 HTTP/WS 保护（隔离全量 1054/1054）；8c17d9c 完成代理凭据解码模块（隔离全量 1057/1057）；d878eb2 完成代理写入及 .bak 版本保留（隔离全量 1061/1061）；85636c9 完成 proxy runtime/API 及合成上游转发/丢 key 拒绝（隔离全量 1064/1064）；90eb63b 修正 IM 私有写入提交边界（隔离全量 1065/1065）；a089128 完成 IM 严格读取/源锁及 HTTP 409（隔离全量 1068/1068）；6d36759 完成显式迁移后的 IM 凭据运行时及 HTTP 409（隔离全量 1075/1075）；687a210 完成持久迁移回执原语（隔离全量 1077/1077）；8a1ad0d 在 auth/proxy/IM 读取及保存时执行回执保护，拒绝配置删除或整体降级，含实际 HTTP/WS（定向 52/52、隔离全量 1082/1082，无失败钩子、0 skip）；0d2bf0f 完成私有可验证恢复快照原语及跨进程并发（隔离全量 1089/1089，构建、打包 1013 文件通过）；fa25aaa 完成 auth 默认只读、显式 apply 的备份/暂存/源切换/回执迁移命令，含实际 HTTP/WS、崩溃后续跑、并发及写失败（最终隔离全量 1099/1099，构建、打包 1014 文件通过；首次 readiness 计时失败及重跑证据见 B1 记录）；proxy 迁移已由 63664dd 补齐；IM 迁移由 c52565b 补齐，36d0697 已补齐 live 库可读时的按配置恢复，完整库损坏恢复仍待（当前 IM 无本地附件发送）；ab7147b 按用户选择为 LOG_DIR/profile 分别定义冻结的私有库归属并保护两处根（隔离全量 1029/1029），未启用运行时，不标为整条已对齐，见 [B1 记录](./B1-config-implementation.md)。
- B1.2 存储子项：本地 4a8c0e9 已实现私有 key/store、严格读写、并发及丢钥拒绝；未接运行时。Git 测试隔离全局配置后，全量 1015/1015 且无失败钩子；首次 ENOTEMPTY 环境残留已在 [B1 记录](./B1-config-implementation.md) 保留。
- B1.2 部分迁移：本地 fc7d677 已实现 AES-256-GCM 原语、严格版本封装和身份绑定，隔离全量 1008/1008 通过；不涉及文件、运行时或真实数据迁移。用户已选仅新版运行，下一步 key/store 与读取边界，见 [B1 记录](./B1-config-implementation.md)。
- B0 本地关键代码对照：与 811b049485 补丁指纹相同；本地 lib/auth.js 使用可逆 Base64，现有配置尚非上游 AES-GCM vault。归 B1，先设计密钥权限、迁移验证、失败拒绝与回滚，再结合后续安全修复整体评估。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-3e7f047290)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3e7f047290)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3e7f047290)

- B0 补丁指纹：与 [811b049485](#commit-811b049485) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-21T11:45:20+08:00；作者时间：2026-09-21T11:43:41+08:00；父提交：4c5e633e68。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（29 个）：
  - `.changeset/credential-vault.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/config-backup.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-access.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-migrate.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-store.js` → 无直接路径匹配
  - `packages/app/server/lib/credential-vault.js` → 无直接路径匹配
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-config.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-ccswitch-import.test.js` → 无直接路径匹配
  - `packages/app/test/api-preferences-gap.test.js` → 无直接路径匹配
  - `packages/app/test/auth-lib.test.js` → 无直接路径匹配
  - `packages/app/test/credential-access.test.js` → 无直接路径匹配
  - `packages/app/test/credential-migrate.test.js` → 无直接路径匹配
  - `packages/app/test/credential-store.test.js` → 无直接路径匹配
  - `packages/app/test/credential-vault.test.js` → 无直接路径匹配
  - `packages/app/test/dingtalk-config.test.js` → 无直接路径匹配
  - `packages/app/test/discord-config.test.js` → 无直接路径匹配
  - `packages/app/test/feishu-config.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配
  - `packages/app/test/usepassword-startup.test.js` → 无直接路径匹配
  - `packages/app/test/wecom-config.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-4c5e633e68"></a>
## [4c5e633e68](https://github.com/weiesky/cc-viewer/commit/4c5e633e68ad9d89eb9a18846daf16124bcdd6df) — feat(server): unify config JSON writes behind a locked+atomic json-store kernel
- B1.1 后续子项：本地 aaf3dab 已适配工作区注册表严格 mutation、错误传播和锁归属保护；1 个产品文件、2 个测试文件，隔离全量 1005/1005 通过。连同 preferences 的 450affb 为分笔迁移，profile/IM/kernel 其余范围仍未全部迁移，见 [B1 记录](./B1-config-implementation.md)。
- B1.1 部分迁移（2026-11-17）：本地 **450affb** 已适配 strict mutation guard 到现有 preferences 锁与原子写，禁止损坏/类型错误/非法编码/不可读内容被更新覆盖；POST preferences 明确返回 409。仅 2 个产品文件及 2 个测试文件，未迁移上游整个 kernel、profile、IM 或注册表。新增失败/恢复及 HTTP 回归，隔离全量 **997/997**、构建、打包预览（1000 文件）通过；GUI/跨平台未验证。上游初版 preferences 默认容错，本地严格策略是经 B0 数据保护复核后的适配。详见 [提交记录、命令及恢复](./B1-config-implementation.md)。本提交其余能力继续按 B1 分笔迁移，不能标为整条已对齐。
- B0 本地关键代码对照：与 d663452c29 补丁指纹相同；本地 lib/preferences.js 已使用文件锁与原子重命名，但 readPreferences 对读取或 JSON 错误返回空对象，隔离临时目录已复现 updatePreferences 覆盖损坏文件。归 B1，需验证业务入口、并发和各写入路径，不因等价补丁重复实施。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-4c5e633e68)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-4c5e633e68)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-4c5e633e68)

- B0 补丁指纹：与 [d663452c29](#commit-d663452c29) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-21T11:43:15+08:00；作者时间：2026-09-21T11:43:15+08:00；父提交：b1fe5c09a6。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（16 个）：
  - `.changeset/config-json-store-kernel.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/ask/ask-store.js` → 无直接路径匹配
  - `packages/app/server/lib/async-file-lock.js` → 无直接路径匹配
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/im/im-config.js` → 无直接路径匹配
  - `packages/app/server/lib/json-store.js` → 无直接路径匹配
  - `packages/app/server/lib/prefs-store.js` → 无直接路径匹配
  - `packages/app/server/lib/session-pin-store.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/workspace-registry.js` → 本地候选：`workspace-registry.js`
  - `packages/app/test/ask-store.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-ask-store.test.js` → 无直接路径匹配
  - `packages/app/test/json-store.test.js` → 无直接路径匹配
  - `packages/app/test/workspace-registry.test.js` → 无直接路径匹配

<a id="commit-b1fe5c09a6"></a>
## [b1fe5c09a6](https://github.com/weiesky/cc-viewer/commit/b1fe5c09a6090106b47c71dff8ffce7f569e5385) — docs: add config convergence & cloud-sync advisory, link from READMEs
- B0 本地关键代码对照：上游新增云同步咨询及配置边界文档，与 9adf4ef539 补丁指纹相同，后由 964ce756b6/384dee8025 改写；本地尚无同名云同步契约，需先核实产品范围并评估凭据不可同步，归 B1。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-b1fe5c09a6)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b1fe5c09a6)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b1fe5c09a6)

- B0 补丁指纹：与 [9adf4ef539](#commit-9adf4ef539) 的 `git patch-id --stable` 相同；仅证明补丁内容相同，版本、依赖和最终行为仍需核验。

- 提交时间：2026-09-21T11:41:00+08:00；作者时间：2026-09-21T11:41:00+08:00；父提交：90b41358f9。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（20 个）：
  - `README.md` → 本地候选：`README.md`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/config-cloud-sync.md` → 无直接路径匹配
  - `docs/config-cloud-sync.zh.md` → 无直接路径匹配

<a id="commit-90b41358f9"></a>
## [90b41358f9](https://github.com/weiesky/cc-viewer/commit/90b41358f92eb98f3faa35df2efddfdb4049d7dc) — ci: soft-fail npm dist-tag step under OIDC trusted publishing
- B0 本地关键代码对照：上游 OIDC 下 dist-tag 非 publish 操作报 E401 后软失败；本地工作流仅 Trusted Publishing 的 npm publish，若新增 dist-tag 必须单独验证权限与失败后的发布状态，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-90b41358f9)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-90b41358f9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-90b41358f9)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-19T09:19:10+08:00；作者时间：2026-09-19T09:19:10+08:00；父提交：01ff6d85e8。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（1 个）：
  - `.github/workflows/release.yml` → 无直接路径匹配

<a id="commit-01ff6d85e8"></a>
## [01ff6d85e8](https://github.com/weiesky/cc-viewer/commit/01ff6d85e8aa565c81b6b3c3c92f7e24c06c53a7) — feat: task HUD antd detail popovers, IM stop/save buttons, fix stop wiping config
- 2026-11-20 B4.2：任务HUD组件/CSS与SDK快照子项已迁入，全量1417/1417、隔离Safari刷新/切换/停止通过；其余混合子项仍待，见[B4实施](./B4-implementation.md)。
- B0 本地关键代码对照：混合提交：上游 IM 停止曾清空配置，本地 lib/dingtalk-im-config.js 的 saveDingTalkImConfig 合并已有配置并保留空 secret；dingtalk-im-routes.js 支持 applyProcess:false。隔离目录已验证仅设置 enabled:false 后标识、密钥、允许名单保持；完整 API、并发及异常 body 仍待验证；HUD Popover 单独归 B4，IM 归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-01ff6d85e8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-01ff6d85e8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-01ff6d85e8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-18T16:21:22+08:00；作者时间：2026-09-18T16:21:22+08:00；父提交：5b544c6ee1。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（14 个）：
  - `apps/web/src/components/chat/TaskProgressHud.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/src/components/settings/ImConversationModal.jsx` → 本地候选：`src/components/settings/ImConversationModal.jsx`
  - `apps/web/src/components/settings/ImPlatformSettings.jsx` → 本地候选：`src/components/settings/ImPlatformSettings.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/test/im-quit-button.test.js` → 无直接路径匹配
  - `apps/web/test/im-save-button.test.js` → 无直接路径匹配
  - `apps/web/test/im-status-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/task-progress-hud.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/routes/im.js` → 无直接路径匹配
  - `packages/app/test/api-im.test.js` → 无直接路径匹配

<a id="commit-5b544c6ee1"></a>
## [5b544c6ee1](https://github.com/weiesky/cc-viewer/commit/5b544c6ee112bb14a80670480d3c4c900b17d307) — fix(release): point npm latest at the just-published version
- B0 本地关键代码对照：上游在 patch 发布后设置 latest，后续 90b41358 因 OIDC 权限而软失败；本地当前直接 npm publish，若调整标签须整体核对后续修复与 registry 权限，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-5b544c6ee1)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5b544c6ee1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5b544c6ee1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-17T16:23:59+08:00；作者时间：2026-09-17T16:23:59+08:00；父提交：2049aef95e。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（1 个）：
  - `.github/workflows/release.yml` → 无直接路径匹配

<a id="commit-2049aef95e"></a>
## [2049aef95e](https://github.com/weiesky/cc-viewer/commit/2049aef95e7e7b0fa883a64d78b4e42886405dc3) — fix(release): publish to npm patch channel to unblock patch-line releases
- B0 本地关键代码对照：上游因已有较高版本阻止默认 latest 而改发 patch tag；本地 npm-publish.yml 使用 npm publish --access public，不能从上游仓库版本异常推断本地需要 patch 频道；按发布版本和标签状态验证，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-2049aef95e)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2049aef95e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2049aef95e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-17T15:22:10+08:00；作者时间：2026-09-17T15:22:10+08:00；父提交：301c04bd5e。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（1 个）：
  - `.github/workflows/release.yml` → 无直接路径匹配

<a id="commit-301c04bd5e"></a>
## [301c04bd5e](https://github.com/weiesky/cc-viewer/commit/301c04bd5eed516d20dda3573d94480d37bcea54) — chore(release): version packages
- [B0 upstream full commit message](./B0-upstream-messages.md#message-301c04bd5e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-301c04bd5e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-17T15:12:44+08:00；作者时间：2026-09-17T15:12:44+08:00；父提交：8923322f88。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（5 个）：
  - `.changeset/cold-ingest-gate-latch-fix.md` → 无直接路径匹配
  - `.changeset/sse-safe-write-close.md` → 无直接路径匹配
  - `.changeset/ultraplan-code-expert-priority-wording.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-8923322f88"></a>
## [8923322f88](https://github.com/weiesky/cc-viewer/commit/8923322f88def98fc3ccaa66d921aa2e3a1c0133) — chore(ultraplan): refine code-expert review priority wording
- B0 本地关键代码对照：本地 ultraAgents/code-expert.json 仍要求 P0 必修、具体低风险 P1 选择修复并暂缓 P2/P3；上游调整 P1/P2/P3 处置且同步多语言文档，属于审查策略变更，需用户明确策略后统一模板与概念文档，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-8923322f88)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-8923322f88)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-8923322f88)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-17T15:12:28+08:00；作者时间：2026-09-17T15:12:28+08:00；父提交：0670581b3d。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（41 个）：
  - `.changeset/ultraplan-code-expert-priority-wording.md` → 无直接路径匹配
  - `apps/web/src/utils/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `history.md` → 无直接路径匹配
  - `packages/app/concepts/ar/UltraPlan.md` → 本地候选：`concepts/ar/UltraPlan.md`
  - `packages/app/concepts/da/UltraPlan.md` → 本地候选：`concepts/da/UltraPlan.md`
  - `packages/app/concepts/de/UltraPlan.md` → 本地候选：`concepts/de/UltraPlan.md`
  - `packages/app/concepts/en/UltraPlan.md` → 本地候选：`concepts/en/UltraPlan.md`
  - `packages/app/concepts/es/UltraPlan.md` → 本地候选：`concepts/es/UltraPlan.md`
  - `packages/app/concepts/fr/UltraPlan.md` → 本地候选：`concepts/fr/UltraPlan.md`
  - `packages/app/concepts/it/UltraPlan.md` → 本地候选：`concepts/it/UltraPlan.md`
  - `packages/app/concepts/ja/UltraPlan.md` → 本地候选：`concepts/ja/UltraPlan.md`
  - `packages/app/concepts/ko/UltraPlan.md` → 本地候选：`concepts/ko/UltraPlan.md`
  - `packages/app/concepts/no/UltraPlan.md` → 本地候选：`concepts/no/UltraPlan.md`
  - `packages/app/concepts/pl/UltraPlan.md` → 本地候选：`concepts/pl/UltraPlan.md`
  - `packages/app/concepts/pt-BR/UltraPlan.md` → 本地候选：`concepts/pt-BR/UltraPlan.md`
  - `packages/app/concepts/ru/UltraPlan.md` → 本地候选：`concepts/ru/UltraPlan.md`
  - `packages/app/concepts/th/UltraPlan.md` → 本地候选：`concepts/th/UltraPlan.md`
  - `packages/app/concepts/tr/UltraPlan.md` → 本地候选：`concepts/tr/UltraPlan.md`
  - `packages/app/concepts/uk/UltraPlan.md` → 本地候选：`concepts/uk/UltraPlan.md`
  - `packages/app/concepts/zh-TW/UltraPlan.md` → 本地候选：`concepts/zh-TW/UltraPlan.md`
  - `packages/app/concepts/zh/UltraPlan.md` → 本地候选：`concepts/zh/UltraPlan.md`
  - `packages/app/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `packages/content/concepts/ar/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/da/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/de/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/en/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/es/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/fr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/it/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ja/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ko/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/no/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pl/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ru/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/th/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/tr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/uk/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/UltraPlan.md` → 无直接路径匹配
  - `packages/content/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`

<a id="commit-0670581b3d"></a>
## [0670581b3d](https://github.com/weiesky/cc-viewer/commit/0670581b3dd0bcecebc1a88d8a032f295b6ada66) — fix(chat): release cold-ingest gate on pipeline failure to unfreeze conversation panel
- 2026-11-20 B3当前结论：冷载B3子能力完成：a55eb66/5047b36/2b765b1/fb20fd5，gate/索引恢复、成功入队后确认cursor、写失败关闭/释放及外围诊断；自然磁盘损坏HTTP拒绝后重试、reset/刷新缓存已观察，异步历史prepend复用同一闸门。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- 2026-11-19 B3：`a55eb66`失败恢复、`5047b36`本地V2入队后确认游标、`2b765b1`SSE写失败关闭与回收。已读完整diff与固定快照调用链；最终1312/1312、构建/685文件预览、故障探针、真实HTTP写失败关闭/原游标重放及初始基准通过。浏览器自然损坏/reset恢复、异步flush异常及外围catch对照未全覆盖，不标整条完成。见[B3实施](./B3-implementation.md)。
- B0 复核结论（2026-11-17）：**需适配，归 B3**。已读完整 diff、上游 gate/seen 测试及固定快照最终实现。本地实际活跃/历史 snapshot 均进入 `_runSseColdIngest`，处理后注入异常会留下 gate=true 和与旧 state 不一致的索引；活跃入口安排 1000ms 重试，移除故障后可恢复，历史入口只清 loading。null 直接方法调用抛错；V3 seen 和服务端写异常子项仍须按本地 V2 分别核验。新增 [隔离探针与证据](./B0-cold-ingest-review.md)，相关现有测试 81/81；本地产品修复提交：无（B0 审计），GUI/自然损坏触发源未验证。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0670581b3d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0670581b3d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-17T15:07:11+08:00；作者时间：2026-09-17T15:07:11+08:00；父提交：2e17699fd7。
- B0 本地关键代码对照：已完成本轮故障注入及首轮数据链路验证，具体子项、限制和后续验收见 [冷加载复核](./B0-cold-ingest-review.md)。
- 初筛批次：**D / 实时与日志可靠性**；B0 状态：需适配（B3，剩余子项见复核结论）。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（8 个）：
  - `.changeset/cold-ingest-gate-latch-fix.md` → 无直接路径匹配
  - `.changeset/sse-safe-write-close.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/test/cold-ingest-gate.test.js` → 无直接路径匹配
  - `apps/web/test/v3-delta-seen-order.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/log-watcher.js` → 无直接路径匹配
  - `packages/app/test/events-backpressure.test.js` → 无直接路径匹配

<a id="commit-2e17699fd7"></a>
## [2e17699fd7](https://github.com/weiesky/cc-viewer/commit/2e17699fd752faedd74a354956cd0c175a8181bc) — feat(git): show +n/-n line stats on unpushed-commit rows, restore real file statuses
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2e17699fd7)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2e17699fd7)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-16T08:53:02+08:00；作者时间：2026-09-16T08:53:02+08:00；父提交：b604b1e4f1。
- B0 本地关键代码对照：已检查上游提交与本地入口；参见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)，后续需补实际场景验证。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（9 个）：
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/components/git/GitChanges.module.css` → 本地候选：`src/components/git/GitChanges.module.css`
  - `apps/web/src/utils/gitApi.js` → 本地候选：`src/utils/gitApi.js`
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/lib/git-diff.js` → 本地候选：`lib/git-diff.js`
  - `packages/app/test/branch-lib-git-diff.test.js` → 无直接路径匹配
  - `packages/app/test/git-unpushed.test.js` → 无直接路径匹配

<a id="commit-b604b1e4f1"></a>
## [b604b1e4f1](https://github.com/weiesky/cc-viewer/commit/b604b1e4f13a5cae8ba522c970b369e91bbb3d04) — feat(system-prompt): add async no-poll rule to kimi-k3 preset; drop defensive-engineering line from all prompt templates
- B0 本地关键代码对照：上游修改 Kimi preset 轮询规则并删除各模板防御性工程条款；本地未发现对应内置模型模板，不能以版本升级为由削弱现有安全要求，模型适配归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-b604b1e4f1)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b604b1e4f1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b604b1e4f1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-16T08:23:33+08:00；作者时间：2026-09-16T08:23:33+08:00；父提交：89a0a25364。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（11 个）：
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/system-prompt-templates/presets/GLM-5.2.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/GLM-5.3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/Qwen-3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-flash.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-pro.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k2.7-code.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptModel.md` → 无直接路径匹配

<a id="commit-89a0a25364"></a>
## [89a0a25364](https://github.com/weiesky/cc-viewer/commit/89a0a253640f991cc4ca9a114295620f9e5f127d) — docs(claude): rewrite CLAUDE.md as prohibitions-only, add patch-only versioning rule
- B0 本地关键代码对照：上游 CLAUDE.md 的 patch-only Changesets 是其发布约束，本地使用 AGENTS.md 和 npm 单包，不直接继承；若引入 Changesets 再决定版本策略，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-89a0a25364)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-89a0a25364)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-89a0a25364)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-15T23:45:23+08:00；作者时间：2026-09-15T23:45:23+08:00；父提交：9c1d079f86。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（1 个）：
  - `CLAUDE.md` → 无直接路径匹配

<a id="commit-9c1d079f86"></a>
## [9c1d079f86](https://github.com/weiesky/cc-viewer/commit/9c1d079f86688208eb5e2440b83f8433c08e864a) — chore(release): 1.8.15
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9c1d079f86)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9c1d079f86)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-15T22:07:58+08:00；作者时间：2026-09-15T21:52:54+08:00；父提交：5939b38f93。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（8 个）：
  - `.changeset/bind-latch-and-review-fixes.md` → 无直接路径匹配
  - `.changeset/hot-switch-launch-variable-snapshot.md` → 无直接路径匹配
  - `.changeset/late-epipe-stdin-guard.md` → 无直接路径匹配
  - `.changeset/mid-round-refresh-blank-chat.md` → 无直接路径匹配
  - `.changeset/preset-family-alias-merge.md` → 无直接路径匹配
  - `.changeset/shell-hook-observe-resume-watchdog.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-5939b38f93"></a>
## [5939b38f93](https://github.com/weiesky/cc-viewer/commit/5939b38f9399b4e0768c99c572aedc88e793c3f4) — chore(release): add changesets for bind-latch fixes and terminal-integration observability
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5939b38f93)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5939b38f93)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-15T21:52:16+08:00；作者时间：2026-09-15T21:52:05+08:00；父提交：17df4e2fbf。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（5 个）：
  - `.changeset/bind-latch-and-review-fixes.md` → 无直接路径匹配
  - `.changeset/hot-switch-launch-variable-snapshot.md` → 无直接路径匹配
  - `.changeset/live-system-prompt-follow-model.md` → 无直接路径匹配
  - `.changeset/preset-family-alias-merge.md` → 无直接路径匹配
  - `.changeset/shell-hook-observe-resume-watchdog.md` → 无直接路径匹配

<a id="commit-17df4e2fbf"></a>
## [17df4e2fbf](https://github.com/weiesky/cc-viewer/commit/17df4e2fbf4a5d0ec1a96431dc10df851c2afd77) — fix(proxy): Bind A 一次性闩只锁成功消费 + review 修复 + 终端集成可观测与裸续接检测(静默)
- B0 本地关键代码对照：混合提交包括系统提示快照绑定重试、Claude 子代理 header、变量快照、QWEN tombstone、模型窗口、shell hook 探针和续会诊断。本地 appserver/Codex 身份及提示存储协议不同；必须拆成 B1/B2/B8/B11 验证，不能因一项不适用跳过全提交。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-17df4e2fbf)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-17df4e2fbf)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-17df4e2fbf)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-15T21:52:16+08:00；作者时间：2026-09-15T21:51:57+08:00；父提交：085c21516f。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（43 个）：
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/i18n.js` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/builtin-model-prompts.js` → 无直接路径匹配
  - `packages/app/server/lib/launch-config.js` → 无直接路径匹配
  - `packages/app/server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `packages/app/server/lib/resume-watchdog.js` → 无直接路径匹配
  - `packages/app/server/lib/shell-hook-inspect.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/server/system-prompt-templates/presets/index.json` → 无直接路径匹配
  - `packages/app/test/builtin-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/launch-config.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-role-proxy-mode.test.js` → 无直接路径匹配
  - `packages/app/test/resume-watchdog.test.js` → 无直接路径匹配
  - `packages/app/test/shell-hook-inspect.test.js` → 无直接路径匹配
  - `packages/app/test/sys-prompt-bind.test.js` → 无直接路径匹配
  - `packages/core/src/context-rules.js` → 本地候选：`server/lib/context-rules.js`
  - `packages/core/test/context-rules.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-085c21516f"></a>
## [085c21516f](https://github.com/weiesky/cc-viewer/commit/085c21516f446ce690f0a77c4f1b02c5025f4dc1) — feat(proxy): system 提示词热切换、内置 preset 族系合并与别名扩展
- [B0 upstream full commit message](./B0-upstream-messages.md#message-085c21516f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-085c21516f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-15T21:52:16+08:00；作者时间：2026-09-15T17:02:13+08:00；父提交：ca34587ce5。
- B0 本地关键代码对照：现有能力与协议/部署待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（51 个）：
  - `.changeset/hot-switch-launch-variable-snapshot.md` → 无直接路径匹配
  - `.changeset/live-system-prompt-follow-model.md` → 无直接路径匹配
  - `.changeset/mid-round-refresh-blank-chat.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/create_system_prompt.js` → 无直接路径匹配
  - `packages/app/server/lib/interceptor-core.js` → 本地候选：`lib/interceptor-core.js`
  - `packages/app/server/lib/launch-config.js` → 无直接路径匹配
  - `packages/app/server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `packages/app/server/lib/proxy/proxy-retry.js` → 无直接路径匹配
  - `packages/app/server/lib/session-id.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-files.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-live.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/identity.js` → 本地候选：`lib/log-v2/identity.js`
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/system-prompt-templates/presets/GLM-5.2.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/GLM-5.3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/Qwen-3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-flash.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-pro.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/index.json` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k2.7-code.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/test/builtin-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-fetch.test.js` → 无直接路径匹配
  - `packages/app/test/launch-config.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-role-proxy-mode.test.js` → 无直接路径匹配
  - `packages/app/test/replace-top-level-system.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-builder.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-live.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-presets.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-ca34587ce5"></a>
## [ca34587ce5](https://github.com/weiesky/cc-viewer/commit/ca34587ce5bf896908f1391e66601737a80029a2) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ca34587ce5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ca34587ce5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-14T08:53:12+00:00；作者时间：2026-09-14T08:53:12+00:00；父提交：60d20e6417。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-60d20e6417"></a>
## [60d20e6417](https://github.com/weiesky/cc-viewer/commit/60d20e641768d05f63f25db4e01c0877b1f84888) — chore(release): add changeset for execWithStdin EPIPE guard
- [B0 upstream full commit message](./B0-upstream-messages.md#message-60d20e6417)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-60d20e6417)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-14T02:01:54+08:00；作者时间：2026-09-14T02:01:54+08:00；父提交：96c477d582。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `.changeset/late-epipe-stdin-guard.md` → 无直接路径匹配

<a id="commit-96c477d582"></a>
## [96c477d582](https://github.com/weiesky/cc-viewer/commit/96c477d582f45f6ba102a083de9c9f0c4a07cad2) — fix(server): guard execWithStdin against EPIPE when child exits early
- 本地实现（2026-11-17）：**功能已对齐**，`ecc1048` 迁移 stdin 错误监听、同步写失败处理和一次性 settle，并在完成时清理超时；复用原有 git exit 1 语义。隔离真实子进程与 HTTP `/api/files` 的 stdin EPIPE/缺 git 故障注入通过，随后 HTTP 仍响应。全量 **1036/1036、无失败钩子、0 skip**，见 [实施记录](./B1-config-implementation.md)；history/发布归 B11，Windows 未验证。
- B0 历史代码对照：高优先级候选：本地 server.js 的 execWithStdin 为 /api/files 调用 git check-ignore，child.stdin 没有 error 监听且直接 write/end，子进程提前退出时可能触发未捕获 EPIPE；timeout 定时器也未清理。上游修复此路径；已在隔离子进程用本地函数源码复现未捕获 EPIPE，真实 API 路径尚未复现；需测试早退出、缺 git、超时及一次性 settle，归 B5。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-96c477d582)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-96c477d582)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-96c477d582)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-14T02:01:44+08:00；作者时间：2026-09-14T02:01:44+08:00；父提交：d7f355ba89。
- 初筛批次：**L / 工程、测试与打包**；状态：功能已对齐；发布元数据归 B11。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（2 个）：
  - `history.md` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`

<a id="commit-d7f355ba89"></a>
## [d7f355ba89](https://github.com/weiesky/cc-viewer/commit/d7f355ba895e24bb5e46c820a7d3105a76018ea3) — fix(chat): rebuild conversation immediately on mid-round page refresh
- 2026-11-20 B3当前结论：B3同会话response子项4a21cec及原B2首轮投影/队列证据保留；本轮分片prepend重投影与live恢复通过。Claude SDK任务/其他混合子项仍在B4/B11，不整条完成。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- 2026-11-19 B3：`4a21cec`迁入undefined不覆盖已有response守卫，适配Codex投影窗口/末位替换同会话分支，保留新身份/compaction/null语义。56/56针对、Web222/222、最终全量1312/1312；原loopback首轮快照仍通过。上游自身冷载体测试也允许response undefined，本地答案已在transcript，不能据字段判气泡丢失；浏览器产品验收仍待。见[B3实施](./B3-implementation.md)。
- B2补缺`c11609f`/`a8df3db`：真实Chrome/Safari发现运行中提示/暂停队列刷新丢失，补activeInput/epoch及HTTP模式发现竞态。当前真实双浏览器相应刷新均通过；该条B3存储/其他投影边界仍保留原台账，不整体完成。
- B0 复核结论（2026-11-17）：**首轮刷新数据链路已具备；response 子项及产品验收仍待核验，归 B3/B4**。实际 writer/coordinator 建立已完成 P 与首轮进行中 N，loopback snapshot/object 路由和提取的 AppBase 方法重建 N，持久指针也选择 N；snapshot 后完成记录通过实际 SSE 重放和客户端投影。下一轮进行中冷加载保留上一轮回答 messages，但清除 lastSession.response，未等价于上游保留 response 的子项；不据此推断气泡丢失。[证据与限制](./B0-cold-ingest-review.md)；相关测试 81/81，本地产品实现提交：沿用当前基线，无新增。真实浏览器/CLI/移动端未验证。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d7f355ba89)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d7f355ba89)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-13T15:12:05+08:00；作者时间：2026-09-13T15:12:05+08:00；父提交：0cfc040c0a。
- B0 本地关键代码对照：已完成本轮故障注入及首轮数据链路验证，具体子项、限制和后续验收见 [冷加载复核](./B0-cold-ingest-review.md)。
- 初筛批次：**B / 多工作区与恢复**；B0 状态：首轮数据链路已具备；response 子项与产品验收仍待核验（B3/B4）。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（14 个）：
  - `apps/web/src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `apps/web/src/utils/v3Assembler.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-sessionMerge.test.js` → 无直接路径匹配
  - `apps/web/test/incremental-merge.test.js` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/v2/session-select.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/test/api-events-gap.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-continuation-sync.test.js` → 无直接路径匹配
  - `test/session-boundary-parity.test.js` → 无直接路径匹配
  - `test/v3-assembler.test.js` → 无直接路径匹配

<a id="commit-0cfc040c0a"></a>
## [0cfc040c0a](https://github.com/weiesky/cc-viewer/commit/0cfc040c0a659f27ef27306b655f314e55e6c43c) — fix(tests): close SSE subscription gracefully in UserPromptSubmit integration test
- B0 本地关键代码对照：上游 SSE 测试以正常关闭替代 req.destroy 防止服务端后续写 EPIPE；本地无该 UserPromptSubmit 夹具，需检查现有 SSE 订阅与 stopViewer 的 teardown 时序，归 B3/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-0cfc040c0a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0cfc040c0a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0cfc040c0a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-13T00:11:04+08:00；作者时间：2026-09-12T23:27:57+08:00；父提交：0480a10437。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（2 个）：
  - `history.md` → 无直接路径匹配
  - `packages/app/test/server.test.js` → 无直接路径匹配

<a id="commit-0480a10437"></a>
## [0480a10437](https://github.com/weiesky/cc-viewer/commit/0480a10437c398967f7897d78e176bd9b9054e64) — chore(release): 1.8.14
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0480a10437)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0480a10437)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-12T22:15:04+08:00；作者时间：2026-09-12T22:15:04+08:00；父提交：637fbb0218。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-637fbb0218"></a>
## [637fbb0218](https://github.com/weiesky/cc-viewer/commit/637fbb0218d0963b35308cbcd6288bdc3578c133) — feat(files): theme-adaptive file-type icon colors (dark/light)
- B0 本地关键代码对照：本地 fileIcons.jsx 和移动端副本仍有硬编码扩展名颜色；上游改用主题 CSS 变量。应验证亮暗主题对比度、共享图标与切换行为，归 B5。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-637fbb0218)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-637fbb0218)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-637fbb0218)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-12T22:14:57+08:00；作者时间：2026-09-12T22:14:57+08:00；父提交：a278d68954。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B5/B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（1 个）：
  - `apps/web/src/global.css` → 本地候选：`src/global.css`

<a id="commit-a278d68954"></a>
## [a278d68954](https://github.com/weiesky/cc-viewer/commit/a278d68954bc41150533177f8e1bbfec320d00a2) — feat(files): per-file-type SVG icons in the file browser
- B0 本地关键代码对照：本地 src/utils/fileIcons.jsx 有基于扩展名着色的通用图标，MobileFileExplorer 与 MobileGitDiff 另有独立副本；上游新增类型 glyph 与共享分类，应评估合并移动端实现与文件类型覆盖，归 B5。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a278d68954)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a278d68954)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a278d68954)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-12T22:14:49+08:00；作者时间：2026-09-12T22:14:49+08:00；父提交：5aa5728b95。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（6 个）：
  - `apps/web/src/components/mobile/MobileFileExplorer.jsx` → 本地候选：`src/components/mobile/MobileFileExplorer.jsx`
  - `apps/web/src/components/mobile/MobileGitDiff.jsx` → 本地候选：`src/components/mobile/MobileGitDiff.jsx`
  - `apps/web/src/utils/fileIcons.jsx` → 本地候选：`src/utils/fileIcons.jsx`
  - `apps/web/src/utils/fileTypes.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-types.test.js` → 无直接路径匹配

<a id="commit-5aa5728b95"></a>
## [5aa5728b95](https://github.com/weiesky/cc-viewer/commit/5aa5728b95024a2fbf9aea98f1275844a42b611f) — feat(files): unify open-project icon to open in-app web file browser
- B0 本地关键代码对照：本地 FileExplorer.jsx header 的 OpenFolderIcon 使用 /api/open-project-dir，菜单 reveal 也调用该端点；上游改为应用内文件浏览器，需核验本地/远程体验及保留原生打开能力，归 B5。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-5aa5728b95)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5aa5728b95)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5aa5728b95)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-12T22:14:49+08:00；作者时间：2026-09-12T22:14:49+08:00；父提交：bf2d6f2ad8。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（2 个）：
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`

<a id="commit-bf2d6f2ad8"></a>
## [bf2d6f2ad8](https://github.com/weiesky/cc-viewer/commit/bf2d6f2ad8fba572239cc8ee9ccc7d22f4b6d6ab) — feat(chat): task-list HUD progress dots + reset task list on new prompt
- 2026-11-20 B4.2：任务HUD组件/CSS与SDK快照子项已迁入，全量1417/1417、隔离Safari刷新/切换/停止通过；其余混合子项仍待，见[B4实施](./B4-implementation.md)。
- B0 本地关键代码对照：上游任务 HUD 进度点与新 prompt 重置依赖 Task 状态和 session gate；本地 Codex update_plan 与上游 hook 不同，任务 HUD 先构建事件映射后测试跨代理重置，归 B4。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-bf2d6f2ad8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-bf2d6f2ad8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-bf2d6f2ad8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-12T22:14:38+08:00；作者时间：2026-09-12T22:14:38+08:00；父提交：48d6e0f3c3。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（11 个）：
  - `apps/web/src/components/chat/TaskProgressHud.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/test/task-progress-hud.test.js` → 无直接路径匹配
  - `packages/app/server/lib/ensure-hooks.js` → 本地候选：`lib/ensure-hooks.js`
  - `packages/app/server/lib/task-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/task-state.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/ensure-hooks-tasks.test.js` → 无直接路径匹配
  - `packages/app/test/server.test.js` → 无直接路径匹配
  - `packages/app/test/task-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/task-state.test.js` → 无直接路径匹配

<a id="commit-48d6e0f3c3"></a>
## [48d6e0f3c3](https://github.com/weiesky/cc-viewer/commit/48d6e0f3c355a7f9182a2c2f4277cfa353a6c774) — fix(tests): await stopViewer in server.test.js to fix EPIPE flake
- B0 本地关键代码对照：上游测试因未 await stopViewer 导致 teardown EPIPE；本地 tests/search-endpoint.test.js 也调用 stopViewer() 未等待，其他多处测试已 await；应检查返回 Promise 与临时目录清理顺序，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-48d6e0f3c3)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-48d6e0f3c3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-48d6e0f3c3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-10T06:12:47+08:00；作者时间：2026-09-10T06:12:47+08:00；父提交：3a737c97ed。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（2 个）：
  - `history.md` → 无直接路径匹配
  - `packages/app/test/server.test.js` → 无直接路径匹配

<a id="commit-3a737c97ed"></a>
## [3a737c97ed](https://github.com/weiesky/cc-viewer/commit/3a737c97ed86a37d7add235db4473f3e77f9bbb5) — chore(release): 1.8.13
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3a737c97ed)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3a737c97ed)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-10T05:53:47+08:00；作者时间：2026-09-10T05:53:47+08:00；父提交：365af800e5。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（2 个）：
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-365af800e5"></a>
## [365af800e5](https://github.com/weiesky/cc-viewer/commit/365af800e58f34a57b2339cf705f56390874f20b) — feat(files): file browser modal upload + in-project drag-move + zone drag feedback
- [B0 upstream full commit message](./B0-upstream-messages.md#message-365af800e5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-365af800e5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-10T05:52:58+08:00；作者时间：2026-09-10T05:52:58+08:00；父提交：2a0d1b30d3。
- B0 本地关键代码对照：已检查现有文件入口与上游体验；详见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（22 个）：
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/App.module.css` → 本地候选：`src/App.module.css`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/fileDropTarget.js` → 无直接路径匹配
  - `apps/web/src/components/files/fileMove.js` → 无直接路径匹配
  - `apps/web/src/components/files/importFiles.js` → 无直接路径匹配
  - `apps/web/src/hooks/useFileDropTarget.js` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/dragGuards.js` → 无直接路径匹配
  - `apps/web/test/_shims/antd-stub.mjs` → 无直接路径匹配
  - `apps/web/test/drag-drop-zones.test.js` → 无直接路径匹配
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-move.test.js` → 无直接路径匹配
  - `apps/web/test/files-import.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/test/api-files-fs.test.js` → 无直接路径匹配

<a id="commit-2a0d1b30d3"></a>
## [2a0d1b30d3](https://github.com/weiesky/cc-viewer/commit/2a0d1b30d325bcec1222180b188d0d083d084a55) — chore(release): 1.8.12
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2a0d1b30d3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2a0d1b30d3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-09T20:22:04+08:00；作者时间：2026-09-09T20:22:04+08:00；父提交：865604d68e。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `.changeset/file-grid-thumbnails.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-865604d68e"></a>
## [865604d68e](https://github.com/weiesky/cc-viewer/commit/865604d68e05e62aaebf8de7a04afa9a9f1e999d) — feat(files): remote web file browser modal with shared context menu + image thumbnails
- [B0 upstream full commit message](./B0-upstream-messages.md#message-865604d68e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-865604d68e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-09T20:20:19+08:00；作者时间：2026-09-09T20:20:19+08:00；父提交：55544f6e40。
- B0 本地关键代码对照：已检查现有文件入口与上游体验；详见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（16 个）：
  - `.changeset/file-grid-thumbnails.md` → 无直接路径匹配
  - `apps/web/src/components/common/HtmlPreviewModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/OpenFolderIcon.jsx` → 本地候选：`src/components/common/OpenFolderIcon.jsx`
  - `apps/web/src/components/files/FileBrowserModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/files/FileBrowserModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `apps/web/src/components/files/fileContextMenu.js` → 无直接路径匹配
  - `apps/web/src/components/files/fileContextMenuActions.jsx` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/fileIcons.jsx` → 本地候选：`src/utils/fileIcons.jsx`
  - `apps/web/test/file-browser-modal.test.js` → 无直接路径匹配
  - `apps/web/test/file-context-menu.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配

<a id="commit-55544f6e40"></a>
## [55544f6e40](https://github.com/weiesky/cc-viewer/commit/55544f6e409c978da32ae9e02faa50070b515e33) — chore(release): 1.8.11
- [B0 upstream full commit message](./B0-upstream-messages.md#message-55544f6e40)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-55544f6e40)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-09T04:26:14+08:00；作者时间：2026-09-09T04:26:14+08:00；父提交：6880f77320。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/fix-release-pipeline-gaps.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-6880f77320"></a>
## [6880f77320](https://github.com/weiesky/cc-viewer/commit/6880f77320fa163442eaa64ff6385dc46a1b69f1) — feat(chat): clickable local file paths in markdown links and code spans
- B0 本地关键代码对照：混合提交覆盖 Markdown 本地链接/代码路径、存在性 API、行号跳转及 SKILL.md 严格校验。本地 ChatMessage.jsx 的工具路径可点击不能证明普通 Markdown 路径可用；须分别核查 read policy、路径存在性泄漏、键盘与 skill 导入，拆归 B5/B6/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-6880f77320)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6880f77320)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6880f77320)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-09T04:26:05+08:00；作者时间：2026-09-09T04:26:05+08:00；父提交：71cee60794。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（30 个）：
  - `apps/electron/electron/main.js` → 本地候选：`electron/main.js`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.jsx` → 本地候选：`src/components/dashboard/CachePopoverContent.jsx`
  - `apps/web/src/components/dashboard/TeamSessionPanel.jsx` → 本地候选：`src/components/dashboard/TeamSessionPanel.jsx`
  - `apps/web/src/components/settings/ImConversationModal.jsx` → 本地候选：`src/components/settings/ImConversationModal.jsx`
  - `apps/web/src/components/settings/ImPlatformSettings.jsx` → 本地候选：`src/components/settings/ImPlatformSettings.jsx`
  - `apps/web/src/global.css` → 本地候选：`src/global.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/markdown.js` → 本地候选：`src/utils/markdown.js`
  - `apps/web/src/utils/markdownCodePathClassify.js` → 无直接路径匹配
  - `apps/web/src/utils/markdownCodeSpanRenderer.js` → 无直接路径匹配
  - `apps/web/src/utils/markdownHrefClassify.js` → 无直接路径匹配
  - `apps/web/src/utils/markdownLinkRenderer.js` → 无直接路径匹配
  - `apps/web/src/utils/mdCodePathVerify.js` → 无直接路径匹配
  - `apps/web/src/utils/skillImportErrors.js` → 无直接路径匹配
  - `apps/web/test/markdown-code-path-classify.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-href-classify.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-render.test.js` → 无直接路径匹配
  - `apps/web/test/md-file-exists.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/skill-import-errors.test.js` → 无直接路径匹配
  - `packages/app/server/lib/skills-api.js` → 本地候选：`lib/skills-api.js`
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/server/routes/skills.js` → 无直接路径匹配
  - `packages/app/test/api-files-exists.test.js` → 无直接路径匹配
  - `packages/app/test/api-im.test.js` → 无直接路径匹配
  - `packages/app/test/api-skills-gap.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-skills.test.js` → 无直接路径匹配
  - `packages/app/test/route-dispatch.test.js` → 无直接路径匹配
  - `packages/app/test/skills-import.test.js` → 无直接路径匹配

<a id="commit-71cee60794"></a>
## [71cee60794](https://github.com/weiesky/cc-viewer/commit/71cee60794ccdab9eb5eaeef5e84a9e52a54019e) — fix(ci): close the release-pipeline gaps that made releases fail repeatedly
- B0 本地关键代码对照：混合修复发布依赖顺序、轻量产物漂移门禁及版本步骤。本地 .github/workflows 只有 npm-publish.yml 和 npm pack 预览，需分别核验实际工作流、产物清单与版本策略，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-71cee60794)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-71cee60794)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-71cee60794)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T17:48:09+08:00；作者时间：2026-09-07T17:48:09+08:00；父提交：4385631527。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（5 个）：
  - `.changeset/fix-release-pipeline-gaps.md` → 无直接路径匹配
  - `.github/workflows/release.yml` → 无直接路径匹配
  - `CLAUDE.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `scripts/verify-tarball-drift.mjs` → 无直接路径匹配

<a id="commit-4385631527"></a>
## [4385631527](https://github.com/weiesky/cc-viewer/commit/43856315277748ab110037bdf006767ce707f0cd) — chore(release): add server/lib/is-admin.js to tarball baseline
- B0 本地关键代码对照：上游仅将 is-admin.js 加入 tarball 基线；本地无同一固定清单，已有 lib/auth-routes.js 管理权限逻辑，需验证实际发布包含依赖，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-4385631527)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-4385631527)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-4385631527)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T17:16:10+08:00；作者时间：2026-09-07T17:16:10+08:00；父提交：513577d01c。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-513577d01c"></a>
## [513577d01c](https://github.com/weiesky/cc-viewer/commit/513577d01ceda911de08813ffc046bee41c12855) — chore(release): 1.8.10
- [B0 upstream full commit message](./B0-upstream-messages.md#message-513577d01c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-513577d01c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T16:53:10+08:00；作者时间：2026-09-07T16:53:10+08:00；父提交：36df32b7e1。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/nav-lang-session-fix.md` → 无直接路径匹配
  - `.changeset/remote-admin-mgmt-endpoints.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-36df32b7e1"></a>
## [36df32b7e1](https://github.com/weiesky/cc-viewer/commit/36df32b7e111a43c26308de0992c12ce2e916b7a) — fix(server): allow authenticated remote admins to use management endpoints
- [B0 upstream full commit message](./B0-upstream-messages.md#message-36df32b7e1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-36df32b7e1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T16:51:57+08:00；作者时间：2026-09-07T16:51:57+08:00；父提交：39acd8150f。
- B0 本地关键代码对照：已检查上游最终修改和本地入口；范围与后续风险见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（20 个）：
  - `.changeset/remote-admin-mgmt-endpoints.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/is-admin.js` → 无直接路径匹配
  - `packages/app/server/routes/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/routes/dingtalk.js` → 无直接路径匹配
  - `packages/app/server/routes/im.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/routes/project-prefs.js` → 无直接路径匹配
  - `packages/app/server/routes/skills.js` → 无直接路径匹配
  - `packages/app/server/routes/voice-pack.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-dingtalk-gap.test.js` → 无直接路径匹配
  - `packages/app/test/auth-lib.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-im.test.js` → 无直接路径匹配
  - `packages/app/test/is-admin.test.js` → 无直接路径匹配
  - `packages/app/test/task-event-route.test.js` → 无直接路径匹配

<a id="commit-39acd8150f"></a>
## [39acd8150f](https://github.com/weiesky/cc-viewer/commit/39acd8150f3fead64612ceaa0bf81a14d394993e) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-39acd8150f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-39acd8150f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T08:16:12+00:00；作者时间：2026-09-07T08:16:12+00:00；父提交：caaab3d12f。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-caaab3d12f"></a>
## [caaab3d12f](https://github.com/weiesky/cc-viewer/commit/caaab3d12fd8ea8849d4264a1b9f1ed5d15e1ec0) — fix(chat): User Prompt Nav language switch + session-divider attribution (#142)
- B0 本地关键代码对照：上游修复导航语言切换、生产消息时间归属和原型属性误匹配；本地导航由 promptNav.js 生成，需以多语言、跨 session 和特殊工具名构造测试，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-caaab3d12f)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-caaab3d12f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-caaab3d12f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T11:16:48+08:00；作者时间：2026-09-07T11:16:48+08:00；父提交：85b9aabce4。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（5 个）：
  - `.changeset/nav-lang-session-fix.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/utils/promptNav.js` → 本地候选：`src/utils/promptNav.js`
  - `apps/web/test/promptNav.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-85b9aabce4"></a>
## [85b9aabce4](https://github.com/weiesky/cc-viewer/commit/85b9aabce418b7087319167c3866b2fb562c1e7d) — fix(ci): widen bump-homebrew npm-registry wait window to 10min
- B0 本地关键代码对照：上游 Homebrew 等待 npm 注册表传播改为最多 10 分钟；本地 .github/workflows 仅见 npm-publish.yml，不能直接套用缺失的上游 job；发布链是否需要 Homebrew 归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-85b9aabce4)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-85b9aabce4)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-85b9aabce4)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T02:07:00+08:00；作者时间：2026-09-07T02:07:00+08:00；父提交：b7678de6f6。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（1 个）：
  - `.github/workflows/bump-homebrew.yml` → 无直接路径匹配

<a id="commit-b7678de6f6"></a>
## [b7678de6f6](https://github.com/weiesky/cc-viewer/commit/b7678de6f6bb9bd7944c1795460118d8263c0c82) — chore(release): 1.8.9
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b7678de6f6)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b7678de6f6)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T01:57:45+08:00；作者时间：2026-09-07T01:57:45+08:00；父提交：aa58422956。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（2 个）：
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-aa58422956"></a>
## [aa58422956](https://github.com/weiesky/cc-viewer/commit/aa584229562d8a511023e10a79119424b0e56d52) — feat(chat): surface Plan/Ask/UltraPlan entries in User Prompt Nav with badges
- B0 本地关键代码对照：本地已有 src/utils/promptNav.js 和 ChatView 导航，但渲染路径目前以 prompt/compaction 为主；上游 Plan/Ask/UltraPlan 导航徽标与性能缓存需按 Codex 交互事件验证，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-aa58422956)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-aa58422956)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-aa58422956)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-07T01:57:34+08:00；作者时间：2026-09-07T01:57:34+08:00；父提交：9b1a2c913a。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（8 个）：
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/promptNav.js` → 本地候选：`src/utils/promptNav.js`
  - `apps/web/test/promptNav.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-fs.test.js` → 无直接路径匹配

<a id="commit-9b1a2c913a"></a>
## [9b1a2c913a](https://github.com/weiesky/cc-viewer/commit/9b1a2c913a4897acd128265d7c08ed968a2328e2) — docs(claude): document release tag ordering — changeset version bump must land before tagging
- B0 本地关键代码对照：上游 CLAUDE.md 约束 Changesets 版本变更先于 tag；本地未采用 Changesets，不能把其发布制度当作现行规则；若采纳 A3 则验证版本/tag 顺序，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-9b1a2c913a)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9b1a2c913a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9b1a2c913a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-06T02:31:47+08:00；作者时间：2026-09-06T02:31:47+08:00；父提交：2cb0806a32。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（1 个）：
  - `CLAUDE.md` → 无直接路径匹配

<a id="commit-2cb0806a32"></a>
## [2cb0806a32](https://github.com/weiesky/cc-viewer/commit/2cb0806a32ffb15c4b2d8bec3d3c94f6942e1f7e) — chore(release): 1.8.8
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2cb0806a32)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2cb0806a32)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-06T02:27:48+08:00；作者时间：2026-09-06T02:27:48+08:00；父提交：57798b7ccc。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（4 个）：
  - `.changeset/download-file-remote.md` → 无直接路径匹配
  - `.changeset/logs-modal-fixes.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-57798b7ccc"></a>
## [57798b7ccc](https://github.com/weiesky/cc-viewer/commit/57798b7ccc4d38c0cfa7535ba6c299ce8cfa45e8) — fix(logs): project switch lag, single-page pager, and pager spacing in log-management modal
- 2026-11-20 B3：`4883004`迁入setState回调内refetch、total>50无单页pager、上游4px CSS间距。Codex补request-id守卫迟到项目响应；Web248/248、Safari51/1会话项目切换和重开实测通过；移动分页GUI仍未验。详见[B3第二轮](./B3-transport-and-pagination.md)。
- B0 本地关键代码对照：本地 AppBase.jsx 的 loadLocalLogs 一次请求 /api/local-logs，handleLogProjectChange 只更新项目状态，与上游分页 refetch 流程不同；仍需检查快速切换、单页展示和 CSS，归 B3/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-57798b7ccc)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-57798b7ccc)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-57798b7ccc)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-06T02:11:02+08:00；作者时间：2026-09-06T02:11:02+08:00；父提交：ba3eee8fd5。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（5 个）：
  - `.changeset/logs-modal-fixes.md` → 无直接路径匹配
  - `apps/web/src/App.module.css` → 本地候选：`src/App.module.css`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/test/logs-modal.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-ba3eee8fd5"></a>
## [ba3eee8fd5](https://github.com/weiesky/cc-viewer/commit/ba3eee8fd5520b0a6ce66ebd6da749fc8cb120b5) — feat(files): add "Download to local" context-menu item for remote sessions, streamed via GET /api/download-file
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ba3eee8fd5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ba3eee8fd5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-05T21:48:13+08:00；作者时间：2026-09-05T21:48:13+08:00；父提交：ef28ec388d。
- B0 本地关键代码对照：已检查现有文件入口与上游体验；详见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（6 个）：
  - `.changeset/download-file-remote.md` → 无直接路径匹配
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `history.md` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配

<a id="commit-ef28ec388d"></a>
## [ef28ec388d](https://github.com/weiesky/cc-viewer/commit/ef28ec388d680dff48caf18bb20d757f4c50634f) — chore(release): 1.8.7
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ef28ec388d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ef28ec388d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-04T18:45:02+08:00；作者时间：2026-09-04T18:45:02+08:00；父提交：d5e66ec1d8。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（5 个）：
  - `.changeset/headless-print-inject-system-prompt.md` → 无直接路径匹配
  - `.changeset/hide-geo-badge-non-official.md` → 无直接路径匹配
  - `.changeset/search-worker-virtualized-results.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-d5e66ec1d8"></a>
## [d5e66ec1d8](https://github.com/weiesky/cc-viewer/commit/d5e66ec1d8f3d5c0e12b0383cb913cc094298638) — feat(cli): inject enhanced context into headless (-p)/one-shot run sessions without starting GUI
- B0 本地关键代码对照：上游 headless 运行注入提示并处理 -- 参数边界；本地 cli.js 的 runProxyCommand 解析 -- 后直接 spawn，GUI 的 appserver 注入路径不同；需验证 codex exec 非 GUI 语义及参数不被当成 prompt，归 B2/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-d5e66ec1d8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d5e66ec1d8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d5e66ec1d8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-04T17:28:59+08:00；作者时间：2026-09-04T17:28:59+08:00；父提交：cdabb27454。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（7 个）：
  - `.changeset/headless-print-inject-system-prompt.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/launch-config.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/test/cli-modes.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-cdabb27454"></a>
## [cdabb27454](https://github.com/weiesky/cc-viewer/commit/cdabb274540ed25618c60d430f96866ad4309d4f) — fix(footer): hide geo badge for non-Anthropic-official subscriptions
- B0 本地关键代码对照：本地 src/App.jsx 无条件挂载 CountryFlag，其组件会请求 ipinfo.io 等外部服务；上游仅对官方端点且有套餐数据时显示。应评估 Codex 适用条件并验证网络隐私与代理场景，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-cdabb27454)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-cdabb27454)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-cdabb27454)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-04T14:14:12+08:00；作者时间：2026-09-04T14:14:12+08:00；父提交：bd50636219。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（2 个）：
  - `.changeset/hide-geo-badge-non-official.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`

<a id="commit-bd50636219"></a>
## [bd50636219](https://github.com/weiesky/cc-viewer/commit/bd50636219e086ba082ab4bb36e5c0b6a996172e) — perf(search): move node-engine scan to a worker thread, virtualize result list
- [B0 upstream full commit message](./B0-upstream-messages.md#message-bd50636219)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-bd50636219)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-04T12:59:26+08:00；作者时间：2026-09-04T12:59:26+08:00；父提交：44320725ab。
- B0 本地关键代码对照：上游与本地入口、处理建议见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)，需按实际协议和数据流验证。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（9 个）：
  - `.changeset/search-worker-virtualized-results.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/search/SearchPanel.jsx` → 本地候选：`src/components/search/SearchPanel.jsx`
  - `apps/web/src/components/search/SearchPanel.module.css` → 本地候选：`src/components/search/SearchPanel.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/code-search.js` → 本地候选：`lib/code-search.js`
  - `packages/app/server/lib/search-worker.js` → 无直接路径匹配
  - `packages/app/test/search-worker.test.js` → 无直接路径匹配

<a id="commit-44320725ab"></a>
## [44320725ab](https://github.com/weiesky/cc-viewer/commit/44320725ab0c33efc0ee6cd846c109becd203caa) — chore(release): 1.8.6
- [B0 upstream full commit message](./B0-upstream-messages.md#message-44320725ab)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-44320725ab)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-02T11:34:15-04:00；作者时间：2026-09-02T11:34:15-04:00；父提交：a70440ee62。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `.changeset/minimal-chat-tool-runs.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-a70440ee62"></a>
## [a70440ee62](https://github.com/weiesky/cc-viewer/commit/a70440ee62bf74decd27cbde976f72f94aaecc3a) — feat(chat): minimal conversation preference merges consecutive tool-only turns into one bubble (default on)
- B0 本地关键代码对照：上游合并连续同代理纯工具轮次并新增桌面、移动端与项目偏好；本地 src/utils/promptNav.js 现有导航不能证明具有该合并，需验证轮次边界和显示设置，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a70440ee62)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a70440ee62)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a70440ee62)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-02T11:32:38-04:00；作者时间：2026-09-02T11:32:38-04:00；父提交：52adf8968a。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（18 个）：
  - `.changeset/minimal-chat-tool-runs.md` → 无直接路径匹配
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/settings/PreferencesForm.jsx` → 本地候选：`src/components/settings/PreferencesForm.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/toolDisplayPolicy.js` → 无直接路径匹配
  - `apps/web/src/utils/toolRunMerge.js` → 无直接路径匹配
  - `apps/web/test/minimal-chat-wiring.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/tool-display-policy.test.js` → 无直接路径匹配
  - `apps/web/test/tool-run-merge.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`

<a id="commit-52adf8968a"></a>
## [52adf8968a](https://github.com/weiesky/cc-viewer/commit/52adf8968a258fce495cfcd8d98b0edbc526cde4) — chore(release): 1.8.5
- [B0 upstream full commit message](./B0-upstream-messages.md#message-52adf8968a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-52adf8968a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-01T12:22:46-04:00；作者时间：2026-09-01T12:22:46-04:00；父提交：1c5fadafbf。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `.changeset/task-checklist-hud.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-1c5fadafbf"></a>
## [1c5fadafbf](https://github.com/weiesky/cc-viewer/commit/1c5fadafbf730e1e4a0639d238809dfefd710347) — feat(chat): Claude Code task checklist HUD docked above the chat composer
- 2026-11-20 B4.2：任务HUD组件/CSS与SDK快照子项已迁入，全量1417/1417、隔离Safari刷新/切换/停止通过；其余混合子项仍待，见[B4实施](./B4-implementation.md)。
- B0 本地关键代码对照：上游任务 HUD 的状态通过 Claude TaskCreate/TaskUpdate 与 hooks 收集；本地 appserver-bridge.js 使用 Codex update_plan，须以真实线程事件映射并验证会话隔离与重连重放，归 B3/B4。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-1c5fadafbf)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1c5fadafbf)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1c5fadafbf)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-01T12:21:31-04:00；作者时间：2026-09-01T12:18:45-04:00；父提交：fa77ecd681。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（22 个）：
  - `.changeset/task-checklist-hud.md` → 无直接路径匹配
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/TaskProgressHud.jsx` → 无直接路径匹配
  - `apps/web/src/components/chat/TaskProgressHud.module.css` → 无直接路径匹配
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/taskStore.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/taskStore.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/ensure-hooks.js` → 本地候选：`lib/ensure-hooks.js`
  - `packages/app/server/lib/session-start-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/task-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/task-state.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/api-events-gap.test.js` → 无直接路径匹配
  - `packages/app/test/ensure-hooks-tasks.test.js` → 无直接路径匹配
  - `packages/app/test/session-start-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/task-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/task-event-route.test.js` → 无直接路径匹配
  - `packages/app/test/task-state.test.js` → 无直接路径匹配

<a id="commit-fa77ecd681"></a>
## [fa77ecd681](https://github.com/weiesky/cc-viewer/commit/fa77ecd6818e2a4874d2020dd09e0d6f6dcde672) — fix(v2): exclude proxy retry-stat shards from legacy v1 log sniffing
- 2026-11-20 B3当前结论：格式审计完成：本地只发现经manifest校验的canonical目录，无按JSONL后缀猜测V1的入口；proxy统计不进入该发现链。不照搬不存在的Claude sniff转换器。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- B0 本地关键代码对照：上游修复旧日志扫描把 proxy_日期.jsonl 识别为会话；本地迁移脚本与上游布局不同，需先核查迁移候选来源和统计文件布局，再用非会话文件构造误识别测试，归 B3。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-fa77ecd681)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-fa77ecd681)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-fa77ecd681)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-09-01T10:34:33+08:00；作者时间：2026-09-01T10:34:33+08:00；父提交：5352005402。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（4 个）：
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/lib/v2/convert.js` → 无直接路径匹配
  - `packages/app/test/v2-convert.test.js` → 无直接路径匹配

<a id="commit-5352005402"></a>
## [5352005402](https://github.com/weiesky/cc-viewer/commit/5352005402fdc5bfdc7156c86d1691b00416b324) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5352005402)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5352005402)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-31T09:42:51+00:00；作者时间：2026-08-31T09:42:51+00:00；父提交：2f83632f32。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-2f83632f32"></a>
## [2f83632f32](https://github.com/weiesky/cc-viewer/commit/2f83632f321ffc00c3a54110476ea451eb2a5d72) — release: cc-viewer 1.8.3 (changeset version)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-2f83632f32)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-2f83632f32)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-31T00:47:54+08:00；作者时间：2026-08-31T00:47:54+08:00；父提交：8fb468ddc8。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `.changeset/kimi-wait-discipline.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-8fb468ddc8"></a>
## [8fb468ddc8](https://github.com/weiesky/cc-viewer/commit/8fb468ddc890ed797a51657e56e2d469acbc77e3) — fix(system-prompt): add background-agent waiting discipline to Kimi presets
- B0 本地关键代码对照：上游 Kimi 预设中的等待纪律依赖 Claude 的 subagents JSONL 和 SendMessage；本地无同名预设，Codex 多代理机制不同，避免照搬路径及工具，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-8fb468ddc8)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-8fb468ddc8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-8fb468ddc8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-31T00:35:15+08:00；作者时间：2026-08-31T00:17:54+08:00；父提交：20e6573b7c。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（4 个）：
  - `.changeset/kimi-wait-discipline.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k2.7-code.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配

<a id="commit-20e6573b7c"></a>
## [20e6573b7c](https://github.com/weiesky/cc-viewer/commit/20e6573b7c351fa710933ea58a36359fc01f4fb4) — feat(chat): raise conversation render-window limits (800/400/300) and 300-item load-earlier step
- B0 本地关键代码对照：本地 ChatView.jsx 的 DESKTOP_ITEM_LIMIT 为 400，上游桌面 800、Android 400、iOS 300 且每次加载 300；此提交还打包多项 changeset，功能逐项归属；渲染上限需在目标平台实测性能后决定，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-20e6573b7c)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-20e6573b7c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-20e6573b7c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-27T01:39:07-04:00；作者时间：2026-08-27T01:39:07-04:00；父提交：d858204313。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（7 个）：
  - `.changeset/bright-pandas-teach.md` → 无直接路径匹配
  - `.changeset/gentle-donuts-appear.md` → 无直接路径匹配
  - `.changeset/tidy-otters-plan.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `history.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-d858204313"></a>
## [d858204313](https://github.com/weiesky/cc-viewer/commit/d85820431363b750e522be204e122636d6682aea) — fix(git): show local commits on branches without an upstream in the changes panel
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d858204313)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d858204313)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-26T11:27:52-04:00；作者时间：2026-08-26T11:27:23-04:00；父提交：73557f1989。
- B0 本地关键代码对照：已检查上游提交与本地入口；参见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)，后续需补实际场景验证。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（11 个）：
  - `.changeset/gentle-donuts-appear.md` → 无直接路径匹配
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/gitApi.js` → 本地候选：`src/utils/gitApi.js`
  - `apps/web/test/git-api.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/git-diff.js` → 本地候选：`lib/git-diff.js`
  - `packages/app/test/api-git-routes.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-git-diff.test.js` → 无直接路径匹配
  - `packages/app/test/git-unpushed.test.js` → 无直接路径匹配

<a id="commit-73557f1989"></a>
## [73557f1989](https://github.com/weiesky/cc-viewer/commit/73557f198905d082128b404388d1c80199454102) — chore(scripts): regenerate tarball baseline for GLM-5.3 preset
- B0 本地关键代码对照：上游仅把 GLM 预设加入 tarball 固定清单；本地未发现同名预设和 tarball 基线，先决定预设适用性再核验产物，归 B8/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-73557f1989)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-73557f1989)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-73557f1989)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-26T20:02:58+08:00；作者时间：2026-08-26T20:02:58+08:00；父提交：0d067a1b7c。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（1 个）：
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-0d067a1b7c"></a>
## [0d067a1b7c](https://github.com/weiesky/cc-viewer/commit/0d067a1b7c52c9883095873c35680917b759091a) — docs(changelog): history.md entries for 1M default, footer simplification, 3s auto-approve, teammate prompt rules
- B0 本地关键代码对照：该提交只补历史记录，具体四项功能仍分别核查，不作为功能已对齐；对外变更记录归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-0d067a1b7c)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0d067a1b7c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0d067a1b7c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-25T15:48:25-04:00；作者时间：2026-08-25T15:48:25-04:00；父提交：72c059f6b9。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（1 个）：
  - `history.md` → 无直接路径匹配

<a id="commit-72c059f6b9"></a>
## [72c059f6b9](https://github.com/weiesky/cc-viewer/commit/72c059f6b9bb0783e76658b643587ac455c22764) — feat(system-prompt): teammate no-wait rules in built-in presets + GLM-5.3 preset
- B0 本地关键代码对照：上游添加 GLM 预设与 teammate 等待规则；本地系统提示由 lib/model-system-prompts.js 管理，未发现对应内置预设目录。模型适用性及 Codex 协作工具语义须评估，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-72c059f6b9)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-72c059f6b9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-72c059f6b9)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-25T15:47:27-04:00；作者时间：2026-08-25T15:47:27-04:00；父提交：51c974e441。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（13 个）：
  - `.changeset/bright-pandas-teach.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/GLM-5.2.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/GLM-5.3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/Qwen-3.7-Max.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-flash.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-pro.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/index.json` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k2.7-code.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/test/api-expert-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/builtin-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-builder.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-presets.test.js` → 无直接路径匹配

<a id="commit-51c974e441"></a>
## [51c974e441](https://github.com/weiesky/cc-viewer/commit/51c974e4415828296a8f91b469f54379b055c073) — feat(permission): default auto-approve to a 3s countdown
- B0 本地关键代码对照：上游将新用户权限自动审批默认改为 3 秒且保留既有设置；本地存在审批偏好及倒计时选项，但不能静默更改授权默认值，归 B11，须单独评估用户安全预期与已有配置迁移。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-51c974e441)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-51c974e441)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-51c974e441)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-25T15:47:02-04:00；作者时间：2026-08-25T15:47:02-04:00；父提交：9eb178145b。
- 初筛批次：**I / 权限与交互问答**；状态：待人工核验。
- 处理建议：核对 Codex 原生审批和用户输入；变更默认权限须独立决策。
- 上游改动路径（2 个）：
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`

<a id="commit-9eb178145b"></a>
## [9eb178145b](https://github.com/weiesky/cc-viewer/commit/9eb178145bb218e0a84d806f350ac84f7287a537) — refactor(footer): plain GitHub link and hide plan-usage pill without data
- B0 本地关键代码对照：上游隐藏无数据的 usage pill 并移除 GitHub star 获取；本地 footer 的请求和占位显示需分支核验，归 B11，不能以组件名推断行为。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-9eb178145b)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9eb178145b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9eb178145b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-25T15:46:39-04:00；作者时间：2026-08-25T15:46:39-04:00；父提交：3a2159219b。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（5 个）：
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/components/dashboard/UsageWindowPill.jsx` → 本地候选：`src/components/dashboard/UsageWindowPill.jsx`
  - `apps/web/src/components/dashboard/UsageWindowPill.module.css` → 本地候选：`src/components/dashboard/UsageWindowPill.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`

<a id="commit-3a2159219b"></a>
## [3a2159219b](https://github.com/weiesky/cc-viewer/commit/3a2159219b0d02858bb385ebc12a5009397b7b36) — feat(context): default unrecognized model context window to 1M
- 2026-11-21 B4 E61：实际runtime范围已核；角色分源/模型窗口策略归B8尚未迁入，B4仅复用已验真实身份/保持用户既选用量条，不将整笔勾选。无运行时改动，具体阅读边界/后续责任见[B4.64](./B4-implementation.md)与[B4代理窗口回执](./B4-role-window-scope-2026-11-21.json)。
- B0 本地关键代码对照：上游未知模型默认 1M；本地 server/lib/context-rules.js 使用 Codex 固定血条基准并有模型规则，appserver-bridge.js 也捕获 modelContextWindow；不可直接照搬 1M，须验证实际窗口来源与未知模型回退，归 B2/B4。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-3a2159219b)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3a2159219b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3a2159219b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-25T15:46:11-04:00；作者时间：2026-08-25T15:46:11-04:00；父提交：7c1963aca1。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（7 个）：
  - `apps/web/src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `apps/web/test/helpers-unit-a.test.js` → 无直接路径匹配
  - `apps/web/test/helpers.test.js` → 无直接路径匹配
  - `packages/app/server/lib/context-watcher.js` → 本地候选：`lib/context-watcher.js`
  - `packages/app/test/context-watcher.test.js` → 无直接路径匹配
  - `packages/core/src/context-rules.js` → 本地候选：`server/lib/context-rules.js`
  - `packages/core/test/context-rules.test.js` → 无直接路径匹配

<a id="commit-7c1963aca1"></a>
## [7c1963aca1](https://github.com/weiesky/cc-viewer/commit/7c1963aca1cbdbcaa80024b3ab8b0671acc82930) — fix(app-header): show only main profile on proxy hot-switch chip
- B0 本地关键代码对照：本地 AppHeader.jsx 的代理标签展示当前 profile 名称与模型；上游角色分配与 hover 摘要的完整语义尚未在本地证实，结合代理角色功能归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-7c1963aca1)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7c1963aca1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7c1963aca1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-25T06:42:11-04:00；作者时间：2026-08-25T06:42:11-04:00；父提交：1af3d646c9。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（2 个）：
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/test/proxy-chip-label.test.js` → 无直接路径匹配

<a id="commit-1af3d646c9"></a>
## [1af3d646c9](https://github.com/weiesky/cc-viewer/commit/1af3d646c92433bf72e7c37230a557636550bbaa) — fix(ultraplan): rework Test Analysis Expert preset around Plan tool with staticized Midscene rules
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1af3d646c9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1af3d646c9)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T23:41:40-04:00；作者时间：2026-08-24T23:41:40-04:00；父提交：936e4637c8。
- B0 本地关键代码对照：已检查上游提交与本地入口；参见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)，后续需补实际场景验证。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（3 个）：
  - `.changeset/tidy-otters-plan.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/content/ultraAgents/test-analysis-expert.json` → 无直接路径匹配

<a id="commit-936e4637c8"></a>
## [936e4637c8](https://github.com/weiesky/cc-viewer/commit/936e4637c833e852f1db756ec21da833a2e952e9) — release: cc-viewer 1.8.1 (changeset version)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-936e4637c8)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-936e4637c8)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T11:22:40-04:00；作者时间：2026-08-24T11:22:40-04:00；父提交：fe0c52ff60。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（5 个）：
  - `.changeset/major-foxes-shine.md` → 无直接路径匹配
  - `.changeset/olive-jars-cheer.md` → 无直接路径匹配
  - `.changeset/witty-pandas-step.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-fe0c52ff60"></a>
## [fe0c52ff60](https://github.com/weiesky/cc-viewer/commit/fe0c52ff60a2ef9eb13faa72aedbe97029ee0011) — feat(system-prompt): built-in model system prompts default-effective with override + tombstone disable
- [B0 upstream full commit message](./B0-upstream-messages.md#message-fe0c52ff60)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-fe0c52ff60)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T11:22:01-04:00；作者时间：2026-08-24T11:18:49-04:00；父提交：f28d9cae37。
- B0 本地关键代码对照：现有能力与协议/部署待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（40 个）：
  - `.changeset/major-foxes-shine.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/settings/ModelPromptTabs.jsx` → 本地候选：`src/components/settings/ModelPromptTabs.jsx`
  - `apps/web/src/components/settings/SystemTextModal.jsx` → 本地候选：`src/components/settings/SystemTextModal.jsx`
  - `apps/web/src/components/settings/SystemTextModal.module.css` → 本地候选：`src/components/settings/SystemTextModal.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/builtinPromptTabs.js` → 无直接路径匹配
  - `apps/web/test/builtin-prompt-tabs.test.js` → 无直接路径匹配
  - `apps/web/test/expert-i18n.test.js` → 无直接路径匹配
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/builtin-model-prompts.js` → 无直接路径匹配
  - `packages/app/server/lib/launch-config.js` → 无直接路径匹配
  - `packages/app/server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `packages/app/server/lib/system-prompt-files.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/expert.js` → 无直接路径匹配
  - `packages/app/test/api-expert-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/api-expert-system-prompt-status.test.js` → 无直接路径匹配
  - `packages/app/test/builtin-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/launch-config.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-files.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-f28d9cae37"></a>
## [f28d9cae37](https://github.com/weiesky/cc-viewer/commit/f28d9cae37c40ddb456bd23a819b93105b224217) — feat(ultraplan): add Test Analysis Expert (测分专家) preset expert
- [B0 upstream full commit message](./B0-upstream-messages.md#message-f28d9cae37)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-f28d9cae37)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T07:26:46-04:00；作者时间：2026-08-24T07:26:46-04:00；父提交：dc1aeb2840。
- B0 本地关键代码对照：已检查上游提交与本地入口；参见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)，后续需补实际场景验证。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（7 个）：
  - `.changeset/olive-jars-cheer.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/ultraAgents/README.md` → 本地候选：`ultraAgents/README.md`
  - `packages/content/ultraAgents/README.md` → 无直接路径匹配
  - `packages/content/ultraAgents/test-analysis-expert.json` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `test/ultra-agents-api.test.js` → 本地候选：`tests/ultra-agents-api.test.js`

<a id="commit-dc1aeb2840"></a>
## [dc1aeb2840](https://github.com/weiesky/cc-viewer/commit/dc1aeb28402abcaf4bc0479d343d5fccafc2e68c) — docs(research): add automated test-case generation survey
- B0 本地关键代码对照：上游 44 个测试生成项目调研支撑 Test Analysis Expert；本地 ultraAgents 含 research-expert，不能等同该测试专家或调研，作为 B7 设计资料评估并验证引用是否仍有效。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-dc1aeb2840)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-dc1aeb2840)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-dc1aeb2840)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T07:24:56-04:00；作者时间：2026-08-24T07:24:56-04:00；父提交：c185a7484e。
- 初筛批次：**F / 文件与搜索**；状态：待人工核验。
- 处理建议：对比现有文件 API、前端及权限；按入口核验路径、大小、二进制和平台。
- 上游改动路径（1 个）：
  - `docs/research/auto-testcase-generation.zh.md` → 无直接路径匹配

<a id="commit-c185a7484e"></a>
## [c185a7484e](https://github.com/weiesky/cc-viewer/commit/c185a7484e2a3f069977d522741efc02c885420d) — refactor(context): rename Context tab per-exchange "Turn N" concept to "Step N"
- B0 本地关键代码对照：上游将 Claude 会话循环术语 Turn 改为 Step；本地 ContextTab.jsx 仍有 currentTurn。Codex turn 有协议含义，先对照展示分组与协议语义，再决定文案，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-c185a7484e)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c185a7484e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c185a7484e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T05:24:41-04:00；作者时间：2026-08-24T05:24:41-04:00；父提交：bacfe559fe。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（47 个）：
  - `.changeset/witty-pandas-step.md` → 无直接路径匹配
  - `apps/web/src/components/dashboard/ContextTab.jsx` → 本地候选：`src/components/dashboard/ContextTab.jsx`
  - `apps/web/src/components/dashboard/ContextTab.module.css` → 本地候选：`src/components/dashboard/ContextTab.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/contextRaw.js` → 本地候选：`src/utils/contextRaw.js`
  - `apps/web/src/utils/contextSteps.js` → 无直接路径匹配
  - `apps/web/test/context-raw.test.js` → 无直接路径匹配
  - `apps/web/test/context-sidebar-navigation.test.js` → 无直接路径匹配
  - `apps/web/test/context-steps.test.js` → 无直接路径匹配
  - `apps/web/test/context-turns.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/concepts/ar/ToolsFirst.md` → 本地候选：`concepts/ar/ToolsFirst.md`
  - `packages/app/concepts/da/ToolsFirst.md` → 本地候选：`concepts/da/ToolsFirst.md`
  - `packages/app/concepts/de/ToolsFirst.md` → 本地候选：`concepts/de/ToolsFirst.md`
  - `packages/app/concepts/en/ToolsFirst.md` → 本地候选：`concepts/en/ToolsFirst.md`
  - `packages/app/concepts/es/ToolsFirst.md` → 本地候选：`concepts/es/ToolsFirst.md`
  - `packages/app/concepts/fr/ToolsFirst.md` → 本地候选：`concepts/fr/ToolsFirst.md`
  - `packages/app/concepts/it/ToolsFirst.md` → 本地候选：`concepts/it/ToolsFirst.md`
  - `packages/app/concepts/ja/ToolsFirst.md` → 本地候选：`concepts/ja/ToolsFirst.md`
  - `packages/app/concepts/ko/ToolsFirst.md` → 本地候选：`concepts/ko/ToolsFirst.md`
  - `packages/app/concepts/no/ToolsFirst.md` → 本地候选：`concepts/no/ToolsFirst.md`
  - `packages/app/concepts/pl/ToolsFirst.md` → 本地候选：`concepts/pl/ToolsFirst.md`
  - `packages/app/concepts/pt-BR/ToolsFirst.md` → 本地候选：`concepts/pt-BR/ToolsFirst.md`
  - `packages/app/concepts/ru/ToolsFirst.md` → 本地候选：`concepts/ru/ToolsFirst.md`
  - `packages/app/concepts/th/ToolsFirst.md` → 本地候选：`concepts/th/ToolsFirst.md`
  - `packages/app/concepts/tr/ToolsFirst.md` → 本地候选：`concepts/tr/ToolsFirst.md`
  - `packages/app/concepts/uk/ToolsFirst.md` → 本地候选：`concepts/uk/ToolsFirst.md`
  - `packages/app/concepts/zh-TW/ToolsFirst.md` → 本地候选：`concepts/zh-TW/ToolsFirst.md`
  - `packages/app/concepts/zh/ToolsFirst.md` → 本地候选：`concepts/zh/ToolsFirst.md`
  - `packages/content/concepts/ar/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/da/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/de/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/en/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/es/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/fr/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/it/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/ja/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/ko/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/no/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/pl/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/ru/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/th/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/tr/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/uk/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/zh/ToolsFirst.md` → 无直接路径匹配

<a id="commit-bacfe559fe"></a>
## [bacfe559fe](https://github.com/weiesky/cc-viewer/commit/bacfe559fe773a39b8a26c81687baeecb749c147) — fix(release): support npm 12 pack output
- [B0 upstream full commit message](./B0-upstream-messages.md#message-bacfe559fe)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-bacfe559fe)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T12:06:49+08:00；作者时间：2026-08-24T12:06:07+08:00；父提交：7ac9363385。
- B0 本地关键代码对照：发布工具链现状与验证范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（3 个）：
  - `.github/workflows/release.yml` → 无直接路径匹配
  - `scripts/lib/npm-pack-json.mjs` → 无直接路径匹配
  - `test/npm-pack-json.test.js` → 无直接路径匹配

<a id="commit-7ac9363385"></a>
## [7ac9363385](https://github.com/weiesky/cc-viewer/commit/7ac936338541c5e50ab64e94dc05b62fa868c378) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7ac9363385)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7ac9363385)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T04:03:53+00:00；作者时间：2026-08-24T04:03:53+00:00；父提交：bb8095c7fb。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-bb8095c7fb"></a>
## [bb8095c7fb](https://github.com/weiesky/cc-viewer/commit/bb8095c7fbe5d7eeac6ac60cb318e4b93cdfa451) — fix(release): streamline notarization and tarball checks
- B0 本地关键代码对照：上游同时调整 Electron notarization 与 tarball JSON 解析；本地使用 scripts/mac-sign.sh、check-sign-config.sh 和独立 npm pack 解析，签名公证及 npm 版本兼容均需分别核验，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-bb8095c7fb)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-bb8095c7fb)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-bb8095c7fb)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T11:47:56+08:00；作者时间：2026-08-24T11:47:56+08:00；父提交：6bcf5e5ab3。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（8 个）：
  - `apps/electron/build/notarize.js` → 无直接路径匹配
  - `apps/electron/electron-builder.yml` → 无直接路径匹配
  - `apps/electron/package.json` → 无直接路径匹配
  - `apps/electron/test/notarization-config.test.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `scripts/lib/npm-pack-json.mjs` → 无直接路径匹配
  - `scripts/verify-tarball-contract.mjs` → 无直接路径匹配
  - `test/npm-pack-json.test.js` → 无直接路径匹配

<a id="commit-6bcf5e5ab3"></a>
## [6bcf5e5ab3](https://github.com/weiesky/cc-viewer/commit/6bcf5e5ab353978c962396100c4d8f62e035f88b) — fix(electron): preserve publish metadata in staging
- B0 本地关键代码对照：上游 Electron staging 修复发布元数据；本地 package.json 直接配置 electron-builder，未使用同一 staging 脚本；实际构建产物和更新元数据待验证，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-6bcf5e5ab3)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6bcf5e5ab3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6bcf5e5ab3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T10:46:13+08:00；作者时间：2026-08-24T10:46:13+08:00；父提交：e987c387f4。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（3 个）：
  - `apps/electron/scripts/assemble-app.mjs` → 无直接路径匹配
  - `apps/electron/scripts/stage-manifest.mjs` → 无直接路径匹配
  - `apps/electron/test/stage-manifest.test.js` → 无直接路径匹配

<a id="commit-e987c387f4"></a>
## [e987c387f4](https://github.com/weiesky/cc-viewer/commit/e987c387f4099fbfdd18de5885426e9a67148a79) — release: cc-viewer 1.8.0 (changeset version)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-e987c387f4)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-e987c387f4)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-24T10:30:01+08:00；作者时间：2026-08-24T10:30:01+08:00；父提交：dafe2bce37。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（12 个）：
  - `.changeset/boundary-gate-cycle-break.md` → 无直接路径匹配
  - `.changeset/chat-queue-bubbles.md` → 无直接路径匹配
  - `.changeset/content-package-extraction.md` → 无直接路径匹配
  - `.changeset/core-package-extraction.md` → 无直接路径匹配
  - `.changeset/lib-subdirs-batch1.md` → 无直接路径匹配
  - `.changeset/orphan-checkpoint-baseline.md` → 无直接路径匹配
  - `.changeset/queued-prompt-merge-visibility.md` → 无直接路径匹配
  - `.changeset/remove-volatile-prompt-vars.md` → 无直接路径匹配
  - `.changeset/sdk-first-turn-system-expand.md` → 无直接路径匹配
  - `.changeset/sdk-mode-full-surface.md` → 无直接路径匹配
  - `packages/app/CHANGELOG.md` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`

<a id="commit-dafe2bce37"></a>
## [dafe2bce37](https://github.com/weiesky/cc-viewer/commit/dafe2bce374df1daf3e81526a4b42c9189e620f0) — feat(chat): busy-queue floating bubbles with send-now + two interrupt fixes
- 2026-11-21 B4 E66：用户明确指定临时Playwright后，G1–G5实际Chromium/WebKit/phone-pad仿真GUI已通过，12原截图/哈希；最终1580全量、0skip、构建与pack:dry-run通过。仅B4范围收口，其他混合工作包未迁项仍独立。见[B4完成矩阵](./B4-completion-matrix.md)及[最终GUI回执](./B4-final-gui-2026-11-21.json)。
- 2026-11-21 B4 E63：补实际SDK full-surface与PTY队列范围对照，B4中断/身份/审批/提示等见既有E笔；普通PTY队列原B0/规划B7尚未迁入、旧IM B11/promptpin B8等保持未完成。G1–G5最终GUI因双CUA通道失败待验，不整笔勾选，见[B4.66](./B4-implementation.md)与[B4收口矩阵](./B4-completion-matrix.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-dafe2bce37)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-dafe2bce37)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-23T19:33:38-04:00；作者时间：2026-08-23T19:32:35-04:00；父提交：7a2dd6162e。
- B0 本地关键代码对照：现有能力、协议差异和待测项见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（23 个）：
  - `.changeset/chat-queue-bubbles.md` → 无直接路径匹配
  - `.changeset/orphan-checkpoint-baseline.md` → 无直接路径匹配
  - `.changeset/queued-prompt-merge-visibility.md` → 无直接路径匹配
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `apps/web/test/branch-utils-sessionMerge.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/queue-bubbles.test.js` → 无直接路径匹配
  - `docs/WIRE_FORMAT.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/chat-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-bridge-core.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/chat-queue.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/core/src/delta-reconstructor.js` → 本地候选：`server/lib/delta-reconstructor.js`
  - `packages/core/test/branch-lib-delta-reconstructor.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

- 2026-11-21 B4 E54：按dafe及后续1aca/固定最终实际中断链补send-now先取消native root审批，复用Stop同一clearThread；双实例红测复现，28定向/1571完整/构建通过，新安装702文件/204Web精确字节/286运行时、B1.2/隔离CLI通过。B2队列原能力复用，PTY和其他混合未完成；orphan/helper所在旧IM消费链当前未接齐，归B11待处理，不记主V2已修。见[B4.57](./B4-implementation.md#b457-e54-立即发送先清理被中断的原生审批)。

- 2026-11-21 B4 E53消息保留子项：原LCP修中断分叉丢queued user，最初测试/产物过但Safari失败，进一步补实际cached ChatView红测并仅在prefix改写时更换数组身份；91定向/1570完整/构建/新安装285通过。最终GUI两次CUA native pipe失败待复验，保留失败与步骤，不记通过；SDK/PTY/IM/orphan等混合继续。见[B4.56](./B4-implementation.md#b456-e53-中断分叉后的排队prompt保留实现已验最终gui复验待)。

<a id="commit-7a2dd6162e"></a>
## [7a2dd6162e](https://github.com/weiesky/cc-viewer/commit/7a2dd6162e1465071a755606d77de22d7c0caa90) — fix(sdk): expand all system segments in request JSON view on first-turn MainAgent requests
- 2026-11-21 B4 E66：用户明确指定临时Playwright后，G1–G5实际Chromium/WebKit/phone-pad仿真GUI已通过，12原截图/哈希；最终1580全量、0skip、构建与pack:dry-run通过。仅B4范围收口，其他混合工作包未迁项仍独立。见[B4完成矩阵](./B4-completion-matrix.md)及[最终GUI回执](./B4-final-gui-2026-11-21.json)。
- 2026-11-21 B4 E59：用户已选原位准确占位说明；严格SDK来源+缺省文本才加原separator/markdown、raw不变、18语言。52组件/1579完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过；E23分段展开继续复用，GUI待。见[B4.62](./B4-implementation.md)与[B4说明回执](./B4-sdk-notice-2026-11-21.json)。
- B0 本地关键代码对照：上游针对 Claude SDK 首轮 system 数组默认展开与提示；本地 DetailPanel.jsx 有 getRequestExpandNode，Codex 请求结构不同，须核验首轮展开和上下文提示，归 B3/B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-7a2dd6162e)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7a2dd6162e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7a2dd6162e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-23T22:16:20+08:00；作者时间：2026-08-23T22:16:20+08:00；父提交：93a17ea623。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（7 个）：
  - `.changeset/sdk-first-turn-system-expand.md` → 无直接路径匹配
  - `apps/web/src/components/dashboard/ContextTab.jsx` → 本地候选：`src/components/dashboard/ContextTab.jsx`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/utils/requestExpand.js` → 无直接路径匹配
  - `apps/web/test/request-expand.test.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配

<a id="commit-93a17ea623"></a>
## [93a17ea623](https://github.com/weiesky/cc-viewer/commit/93a17ea62361d6e90b7c89e9d317496353cd95d3) — chore(tarball): add approval-policy.js + launch-config.js to the tarball baseline
- B0 本地关键代码对照：上游 tarball 基线追加两个模块；本地无对应固定清单，已有 scripts/npm-pack-dry-run.mjs，需结合本地运行时模块建立自身产物契约，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-93a17ea623)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-93a17ea623)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-93a17ea623)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-23T15:32:21+08:00；作者时间：2026-08-23T15:32:21+08:00；父提交：6ebeea8439。
- 初筛批次：**I / 权限与交互问答**；状态：待人工核验。
- 处理建议：核对 Codex 原生审批和用户输入；变更默认权限须独立决策。
- 上游改动路径（1 个）：
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-6ebeea8439"></a>
## [6ebeea8439](https://github.com/weiesky/cc-viewer/commit/6ebeea84398139e6e1645bf4afdd002c87f7c45c) — Merge branch 'feat/remove-volatile-prompt-vars'
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6ebeea8439)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6ebeea8439)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[72551f625b](#commit-72551f625b)。合并与分支变更不得重复计算。

- 提交时间：2026-08-23T15:05:38+08:00；作者时间：2026-08-23T15:05:38+08:00；父提交：efc7f8eab1, 72551f625b。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并存在冲突或错误；实际树相对自动合并树的差异路径：`history.md`。该结果不证明业务语义已审查。
- B0 冲突解决复核：`git show --cc` 显示合并树冲突解决仅涉及 `history.md`；其父分支的产品变更仍需逐项审查，不能由此判定功能不适用。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（23 个）：
  - `.changeset/remove-volatile-prompt-vars.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/create_system_prompt.js` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptModel.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ar.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.da.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.de.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.es.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.fr.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.it.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ja.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ko.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.no.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.pl.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.pt-BR.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ru.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.th.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.tr.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.uk.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.zh-TW.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.zh.md` → 无直接路径匹配
  - `packages/app/test/system-prompt-builder.test.js` → 无直接路径匹配

<a id="commit-efc7f8eab1"></a>
## [efc7f8eab1](https://github.com/weiesky/cc-viewer/commit/efc7f8eab199a04f3b8dcb660a5bfde593138f66) — feat(chat): floating composer overlay + SDK full-surface parity
- 2026-11-21 B4 E66：用户明确指定临时Playwright后，G1–G5实际Chromium/WebKit/phone-pad仿真GUI已通过，12原截图/哈希；最终1580全量、0skip、构建与pack:dry-run通过。仅B4范围收口，其他混合工作包未迁项仍独立。见[B4完成矩阵](./B4-completion-matrix.md)及[最终GUI回执](./B4-final-gui-2026-11-21.json)。
- 2026-11-21 B4 E63：补实际SDK full-surface与PTY队列范围对照，B4中断/身份/审批/提示等见既有E笔；普通PTY队列原B0/规划B7尚未迁入、旧IM B11/promptpin B8等保持未完成。G1–G5最终GUI因双CUA通道失败待验，不整笔勾选，见[B4.66](./B4-implementation.md)与[B4收口矩阵](./B4-completion-matrix.md)。
- 2026-11-21 B4 E62：补原SDK主WS四类PTY消息门控，真实WS红测1次隐藏shell→0spawn；scratch独立通道保持。22定向/1580完整/构建，新安装702文件/204Web精确字节/291运行时、B1.2/CLI通过，无UI变更。见[B4.65](./B4-implementation.md)与[B4门控回执](./B4-sdk-pty-gate-2026-11-21.json)。
- 2026-11-21 B4 E58：默认exec未知/缺值参数提前拒绝，exec后支持参数正常解析，不静默丢弃；35定向/1578完整/构建，新安装702文件/204Web精确字节/290运行时、B1.2/CLI通过。仅启动子项，见[B4.61](./B4-implementation.md)与[B4启动回执](./B4-sdk-launch-2026-11-21.json)。
- 2026-11-18 B2 scratch子项：`a9197c2` 复用scratchOnly面板、按实例保存tabs、SDK聊天输入并存、Mobile单宿主/手机tab/keybar；`b1b3c7a` 后端实例归属与关闭。仅以上子项适配；floating composer、触控/固定列/软键盘及其他diff仍待逐项核验。全量1201/1201、构建/组件探针/生产安装通过，GUI未验收，**不标整条完成**。见[B2记录](./B2-session-isolation.md)。
- B0 本地关键代码对照：上游混合浮动输入、SDK 审批与 slash、WS 清理及重放。本地 ChatView.jsx 已有 inputStack、SDK ask 和 plan 卡片，仍须逐项核对浮动布局、断线重连和 Codex 能力，拆归 B2/B3/B7/B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-efc7f8eab1)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-efc7f8eab1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-efc7f8eab1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-23T14:08:45+08:00；作者时间：2026-08-23T14:08:45+08:00；父提交：cda9ed326d。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（61 个）：
  - `.changeset/sdk-mode-full-surface.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.module.css` → 本地候选：`src/components/terminal/TerminalPanel.module.css`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/test/floating-input-stack.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/wsopen-sdk-gate.test.js` → 无直接路径匹配
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/lib/approval-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/interceptor-core.js` → 本地候选：`lib/interceptor-core.js`
  - `packages/app/server/lib/kv-cache-analyzer.js` → 无直接路径匹配
  - `packages/app/server/lib/launch-config.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-adapter.js` → 本地候选：`lib/sdk-adapter.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/spawn-model-resolver.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/test/approval-policy.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-sdk-manager.test.js` → 无直接路径匹配
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-core-mainagent.test.js` → 无直接路径匹配
  - `packages/app/test/launch-config.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager.test.js` → 本地候选：`tests/pty-manager.test.js`
  - `packages/app/test/sdk-adapter.test.js` → 本地候选：`tests/sdk-adapter.test.js`
  - `packages/app/test/sdk-manager-extra.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager.test.js` → 本地候选：`tests/sdk-manager.test.js`
  - `packages/app/test/server-http-extra.test.js` → 无直接路径匹配
  - `packages/app/test/server-lifecycle.test.js` → 无直接路径匹配
  - `packages/app/test/server-residual.test.js` → 无直接路径匹配
  - `packages/app/test/spawn-model-resolver.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-debounce.test.js` → 无直接路径匹配
  - `packages/core/src/contentFilter.js` → 本地候选：`src/utils/contentFilter.js`
  - `packages/core/src/teammateDetector.js` → 本地候选：`src/utils/teammateDetector.js`
  - `packages/core/test/native-teammate-detector.test.js` → 无直接路径匹配
  - `test/content-filter-unit.test.js` → 无直接路径匹配

- 2026-11-21 B4 E55：迁固定最终浮动composer及117ee滚动条bleed，三分支spacer/helper/CSS原样；50定向/1573完整/构建通过，新安装702文件/204Web/286运行时、B1.2/CLI通过，GUI再次native pipe失败待。仅该子项；SDK compact/launch/protocol继续。见[B4.58](./B4-implementation.md#b458-e55-固定最终浮动输入区与滚动条留白实现已验gui待)。

- 2026-11-21 B4 E56：原生contextCompaction完成后发scoped生命周期提示，原banner/CSS/18语言逐字复用、无虚构token；双实例/去重/异thread-turn、UI限10/切会话通过，63定向/1575完整/构建及新安装702文件/204Web字节/287运行时、B1.2/CLI通过，GUI待；其他混合不整条完成，见B4.59/B4-compact-notice-2026-11-21.json。

<a id="commit-72551f625b"></a>
## [72551f625b](https://github.com/weiesky/cc-viewer/commit/72551f625b26eccd2db74f2aefd93e1d2b0e67b4) — fix(system-prompt): drop 7 loop-volatile dynamic prompt variables
- B0 本地关键代码对照：上游删除动态变量以避免同会话内提示漂移；当前 lib/model-system-prompts.js 保存并选择文本，变量功能是否存在须结合本地注入链及模板核实；归 B8，不能仅根据上游删除字段改写本地。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-72551f625b)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-72551f625b)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-72551f625b)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-23T13:30:04+08:00；作者时间：2026-08-23T13:30:04+08:00；父提交：cda9ed326d。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（23 个）：
  - `.changeset/remove-volatile-prompt-vars.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `packages/app/server/lib/create_system_prompt.js` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptModel.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ar.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.da.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.de.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.es.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.fr.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.it.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ja.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ko.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.no.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.pl.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.pt-BR.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ru.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.th.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.tr.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.uk.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.zh-TW.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.zh.md` → 无直接路径匹配
  - `packages/app/test/system-prompt-builder.test.js` → 无直接路径匹配

<a id="commit-cda9ed326d"></a>
## [cda9ed326d](https://github.com/weiesky/cc-viewer/commit/cda9ed326d0f8332a3e2bea97dd1db3f29ac7e08) — fix(deps): carry CVE-2026-13676/CVE-2026-39244 fixes into the monorepo layout
- [B0 upstream full commit message](./B0-upstream-messages.md#message-cda9ed326d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-cda9ed326d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:39:45-04:00；作者时间：2026-08-20T09:39:45-04:00；父提交：16267dc04c。
- B0 结论：上游仅把两项已核验 CVE 修复迁移到 monorepo manifest；当前单包无需复制目录变动，未来 pnpm/拆包时重新核验。详见 [依赖审计](./B0-commit-lineage.md#b0-dependency-audit)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（5 个）：
  - `apps/electron/package.json` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `packages/app/package.json` → 本地候选：`package.json`
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `pnpm-workspace.yaml` → 无直接路径匹配

<a id="commit-16267dc04c"></a>
## [16267dc04c](https://github.com/weiesky/cc-viewer/commit/16267dc04c544de3143856ceaac1a6f408fc2765) — fix(system-prompt): pin original system prompt on -c/-r resumes
- B0 本地关键代码对照：上游对 Claude 续会绑定原始系统提示快照；本地 appserver-bridge.js 的注入仅作用 thread/start，存在 thread/resume 分支，SDK 也调用 resumeThread；需验证 Codex 实际续会是否沿用原指令及缓存，不直接复制 Claude 存储方案，归 B2/B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-16267dc04c)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-16267dc04c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-16267dc04c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:01-04:00；作者时间：2026-08-20T08:44:38-04:00；父提交：047db59b80。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（13 个）：
  - `history.md` → 无直接路径匹配
  - `packages/app/server/i18n.js` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/system-prompt-files.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-render.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-snapshots.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/test/pty-manager.test.js` → 本地候选：`tests/pty-manager.test.js`
  - `packages/app/test/sys-prompt-bind.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-render.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-snapshots.test.js` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配

<a id="commit-047db59b80"></a>
## [047db59b80](https://github.com/weiesky/cc-viewer/commit/047db59b80186ff7eb10150c54916f1bd03173f7) — refactor(monorepo): @ccv/core extraction + boundary gate + per-package test distribution
- 工程前置关联（2026-11-17）：3b15a6d 按本地边界分布单包测试、保留根跨包测试，最终全量 1102/1102；未抽取私有 core 包或实现上游完整分层边界门禁，不能标整条已完成。见 [新结构](./A1-A2-engineering.md)。
- B0 本地关键代码对照：当前未按上游抽取私有 @ccv/core；迁移涉及包边界、测试分布和 bundledDependencies，归 B11，运行时解析及打包仍待专项实测。 [pnpm 专项](./B0-pnpm-monorepo.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-047db59b80)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-047db59b80)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:01-04:00；作者时间：2026-08-20T02:25:30-04:00；父提交：729b886893。
- B0 专项核查：上游 pnpm/monorepo 阶段提交；见 [专项方案对照](./B0-pnpm-monorepo.md)。归属 B11，是否实施仍待决策。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（571 个）：
  - `.changeset/config.json` → 无直接路径匹配
  - `.changeset/core-package-extraction.md` → 无直接路径匹配
  - `CLAUDE.md` → 无直接路径匹配
  - `CONTRIBUTING.md` → 无直接路径匹配
  - `apps/electron/package.json` → 无直接路径匹配
  - `apps/electron/scripts/assemble-app.mjs` → 无直接路径匹配
  - `apps/electron/test/electron-diag.test.js` → 无直接路径匹配
  - `apps/electron/test/electron-node-execpath-regression.test.js` → 无直接路径匹配
  - `apps/electron/test/menu-model.test.js` → 无直接路径匹配
  - `apps/electron/test/window-state.test.js` → 无直接路径匹配
  - `apps/web/package.json` → 本地候选：`package.json`
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/controllers/askFlowController.js` → 本地候选：`src/components/chat/controllers/askFlowController.js`
  - `apps/web/src/components/chat/uploadDeferLogic.js` → 本地候选：`src/components/chat/uploadDeferLogic.js`
  - `apps/web/src/components/common/ConceptHelp.jsx` → 本地候选：`src/components/common/ConceptHelp.jsx`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/components/dashboard/RequestList.jsx` → 本地候选：`src/components/dashboard/RequestList.jsx`
  - `apps/web/src/components/mobile/MobileStats.jsx` → 本地候选：`src/components/mobile/MobileStats.jsx`
  - `apps/web/src/components/settings/ImConversationModal.jsx` → 本地候选：`src/components/settings/ImConversationModal.jsx`
  - `apps/web/src/components/settings/VoicePackSettings.jsx` → 本地候选：`src/components/settings/VoicePackSettings.jsx`
  - `apps/web/src/img/teammates/DESIGN.md` → 本地候选：`src/img/teammates/DESIGN.md`
  - `apps/web/src/utils/entry-slim.js` → 本地候选：`src/utils/entry-slim.js`
  - `apps/web/src/utils/errorReport.js` → 本地候选：`src/utils/errorReport.js`
  - `apps/web/src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `apps/web/src/utils/identityHeal.js` → 本地候选：`src/utils/identityHeal.js`
  - `apps/web/src/utils/modalMask.js` → 本地候选：`src/utils/modalMask.js`
  - `apps/web/src/utils/promptClassifier.js` → 本地候选：`src/utils/promptClassifier.js`
  - `apps/web/src/utils/promptDetect.js` → 本地候选：`src/utils/promptDetect.js`
  - `apps/web/src/utils/sessionManager.js` → 本地候选：`src/utils/sessionManager.js`
  - `apps/web/src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `apps/web/src/utils/skillsParser.js` → 本地候选：`src/utils/skillsParser.js`
  - `apps/web/src/utils/teamModalBuilder.js` → 本地候选：`src/utils/teamModalBuilder.js`
  - `apps/web/src/utils/toolCatalog.js` → 本地候选：`src/utils/toolCatalog.js`
  - `apps/web/src/utils/toolsXmlFormatter.js` → 本地候选：`src/utils/toolsXmlFormatter.js`
  - `apps/web/src/utils/voicePackPlayer.js` → 本地候选：`src/utils/voicePackPlayer.js`
  - `apps/web/test/_shims/antd-stub.mjs` → 无直接路径匹配
  - `apps/web/test/_shims/register.mjs` → 无直接路径匹配
  - `apps/web/test/_shims/vite-loader.mjs` → 无直接路径匹配
  - `apps/web/test/api-url-gap.test.js` → 无直接路径匹配
  - `apps/web/test/ask-fallback.test.js` → 无直接路径匹配
  - `apps/web/test/ask-flow-controller.test.js` → 本地候选：`tests/ask-flow-controller.test.js`
  - `apps/web/test/ask-portal-matcher.test.js` → 无直接路径匹配
  - `apps/web/test/askOptionDesc.test.js` → 无直接路径匹配
  - `apps/web/test/auto-approve-options.test.js` → 无直接路径匹配
  - `apps/web/test/avatar-animation-post-pass.test.js` → 无直接路径匹配
  - `apps/web/test/bar-chart-helpers.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-commandValidator.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-entry-slim.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-ingestPipeline.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-projectAlias.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-promptClassifier.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-sessionManager.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-sessionMerge.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-stickyBottomController.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-teamModalBuilder.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-teamSessionParser.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-terminalWriteQueue.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-ultraplanController.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-userImageRefs.test.js` → 无直接路径匹配
  - `apps/web/test/branch-utils-voicePackPlayer.test.js` → 无直接路径匹配
  - `apps/web/test/builtin-presets.test.js` → 无直接路径匹配
  - `apps/web/test/cold-ingest-gate.test.js` → 无直接路径匹配
  - `apps/web/test/commandValidator.test.js` → 无直接路径匹配
  - `apps/web/test/compact-result-preview.test.js` → 无直接路径匹配
  - `apps/web/test/context-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/context-raw.test.js` → 无直接路径匹配
  - `apps/web/test/context-sidebar-nav-gap.test.js` → 无直接路径匹配
  - `apps/web/test/context-sidebar-navigation.test.js` → 无直接路径匹配
  - `apps/web/test/context-turns.test.js` → 无直接路径匹配
  - `apps/web/test/cross-request-toolresult.test.js` → 无直接路径匹配
  - `apps/web/test/display-scale-helper.test.js` → 无直接路径匹配
  - `apps/web/test/entry-cache.test.js` → 无直接路径匹配
  - `apps/web/test/entry-slim.test.js` → 本地候选：`tests/entry-slim.test.js`
  - `apps/web/test/error-report.test.js` → 无直接路径匹配
  - `apps/web/test/expert-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/extract-team-sessions.test.js` → 无直接路径匹配
  - `apps/web/test/file-open.test.js` → 无直接路径匹配
  - `apps/web/test/fileExpandedPathsStorage.test.js` → 无直接路径匹配
  - `apps/web/test/formatters-gap.test.js` → 无直接路径匹配
  - `apps/web/test/formatters.test.js` → 无直接路径匹配
  - `apps/web/test/git-api.test.js` → 无直接路径匹配
  - `apps/web/test/git-tree-builder.test.js` → 无直接路径匹配
  - `apps/web/test/helpers-unit-a.test.js` → 无直接路径匹配
  - `apps/web/test/helpers-unit-b.test.js` → 无直接路径匹配
  - `apps/web/test/helpers.test.js` → 无直接路径匹配
  - `apps/web/test/identity-heal.test.js` → 本地候选：`tests/identity-heal.test.js`
  - `apps/web/test/im-conn-state.test.js` → 无直接路径匹配
  - `apps/web/test/im-origin.test.js` → 无直接路径匹配
  - `apps/web/test/im-status-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/im-tr.test.js` → 无直接路径匹配
  - `apps/web/test/image-compress.test.js` → 无直接路径匹配
  - `apps/web/test/image-downscale.test.js` → 无直接路径匹配
  - `apps/web/test/image-resize-unit.test.js` → 无直接路径匹配
  - `apps/web/test/image-resize.test.js` → 无直接路径匹配
  - `apps/web/test/incremental-merge.test.js` → 无直接路径匹配
  - `apps/web/test/ingest-pipeline.test.js` → 无直接路径匹配
  - `apps/web/test/interaction-ownership.test.js` → 本地候选：`tests/interaction-ownership.test.js`
  - `apps/web/test/lazy-with-reload.test.js` → 无直接路径匹配
  - `apps/web/test/loaded-skills-parser.test.js` → 无直接路径匹配
  - `apps/web/test/log-management-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/lr-messages-dedup.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-incremental.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-profiler-gap.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-profiler-gap2.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-profiler.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-render.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-stream.test.js` → 无直接路径匹配
  - `apps/web/test/markdown-util.test.js` → 无直接路径匹配
  - `apps/web/test/md-extension-detect.test.js` → 无直接路径匹配
  - `apps/web/test/mdx-translations.test.js` → 无直接路径匹配
  - `apps/web/test/memoryLinkParser.test.js` → 无直接路径匹配
  - `apps/web/test/migrate-prompt-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/modal-mask.test.js` → 无直接路径匹配
  - `apps/web/test/model-suggestions.test.js` → 无直接路径匹配
  - `apps/web/test/new-ui-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/permission-controller.test.js` → 无直接路径匹配
  - `apps/web/test/permission-detect.test.js` → 无直接路径匹配
  - `apps/web/test/pinned-menu.test.js` → 无直接路径匹配
  - `apps/web/test/plan-approve-option.test.js` → 无直接路径匹配
  - `apps/web/test/plan-v2-extract.test.js` → 无直接路径匹配
  - `apps/web/test/preset-shortcuts.test.js` → 无直接路径匹配
  - `apps/web/test/projectAlias.test.js` → 无直接路径匹配
  - `apps/web/test/prompt-classifier-gap.test.js` → 无直接路径匹配
  - `apps/web/test/prompt-detect.test.js` → 无直接路径匹配
  - `apps/web/test/promptNav.test.js` → 无直接路径匹配
  - `apps/web/test/pty-chunk-builder-gap.test.js` → 无直接路径匹配
  - `apps/web/test/pty-chunk-builder.test.js` → 本地候选：`tests/pty-chunk-builder.test.js`
  - `apps/web/test/pty-prompt-controller.test.js` → 本地候选：`tests/pty-prompt-controller.test.js`
  - `apps/web/test/pty-prompt-retry.test.js` → 无直接路径匹配
  - `apps/web/test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `apps/web/test/rateLimitParser.test.js` → 无直接路径匹配
  - `apps/web/test/refresh-cached-item-prop.test.js` → 无直接路径匹配
  - `apps/web/test/resize-calc.test.js` → 无直接路径匹配
  - `apps/web/test/resolve-ask-questions.test.js` → 无直接路径匹配
  - `apps/web/test/resolve-localized.test.js` → 无直接路径匹配
  - `apps/web/test/retry-config-layout.test.js` → 无直接路径匹配
  - `apps/web/test/scroll-highlight-controller.test.js` → 无直接路径匹配
  - `apps/web/test/seq-resource-loaders.test.js` → 无直接路径匹配
  - `apps/web/test/session-manager.test.js` → 无直接路径匹配
  - `apps/web/test/session-model-stamp.test.js` → 无直接路径匹配
  - `apps/web/test/should-inline-tool-images.test.js` → 无直接路径匹配
  - `apps/web/test/single-ws-submit.test.js` → 无直接路径匹配
  - `apps/web/test/skill-display-name.test.js` → 无直接路径匹配
  - `apps/web/test/skill-modal-controller.test.js` → 无直接路径匹配
  - `apps/web/test/slash-command-labels.test.js` → 无直接路径匹配
  - `apps/web/test/split-drag-calc.test.js` → 无直接路径匹配
  - `apps/web/test/split-drag-controller.test.js` → 无直接路径匹配
  - `apps/web/test/sticky-bottom-controller-integration.test.js` → 无直接路径匹配
  - `apps/web/test/sticky-bottom-controller-user-intent.test.js` → 无直接路径匹配
  - `apps/web/test/sticky-bottom-controller.test.js` → 无直接路径匹配
  - `apps/web/test/svg-sanitize-gap.test.js` → 无直接路径匹配
  - `apps/web/test/svg-sanitize.test.js` → 无直接路径匹配
  - `apps/web/test/system-tags.test.js` → 无直接路径匹配
  - `apps/web/test/t-claude.test.js` → 无直接路径匹配
  - `apps/web/test/team-modal-builder-unit.test.js` → 无直接路径匹配
  - `apps/web/test/teammate-avatar-static.test.js` → 无直接路径匹配
  - `apps/web/test/teammate-avatars.test.js` → 无直接路径匹配
  - `apps/web/test/teammate-classification.test.js` → 无直接路径匹配
  - `apps/web/test/term-diag.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-scrollback-preserve.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-write-queue-adaptive.test.js` → 无直接路径匹配
  - `apps/web/test/terminal-write-queue.test.js` → 无直接路径匹配
  - `apps/web/test/terminalClipboard.test.js` → 无直接路径匹配
  - `apps/web/test/theme-sync.test.js` → 无直接路径匹配
  - `apps/web/test/thinking-merge.test.js` → 无直接路径匹配
  - `apps/web/test/timestamp-assignment.test.js` → 无直接路径匹配
  - `apps/web/test/tool-activation-concepts.test.js` → 无直接路径匹配
  - `apps/web/test/tool-catalog-concepts.test.js` → 本地候选：`tests/tool-catalog-concepts.test.js`
  - `apps/web/test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `apps/web/test/tool-result-builder-unit.test.js` → 无直接路径匹配
  - `apps/web/test/toolResultBuilder-dedup.test.js` → 无直接路径匹配
  - `apps/web/test/toolResultBuilder-validation-error.test.js` → 无直接路径匹配
  - `apps/web/test/tools-xml-formatter.test.js` → 无直接路径匹配
  - `apps/web/test/toolsDiff.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-controller-gap.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-controller.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-experts.test.js` → 无直接路径匹配
  - `apps/web/test/ultraplan-templates.test.js` → 无直接路径匹配
  - `apps/web/test/upload-defer-logic.test.js` → 无直接路径匹配
  - `apps/web/test/user-image-refs.test.js` → 无直接路径匹配
  - `apps/web/test/vite-base-default.test.js` → 无直接路径匹配
  - `apps/web/test/voice-pack-player-gap.test.js` → 无直接路径匹配
  - `apps/web/test/voice-pack-player.test.js` → 无直接路径匹配
  - `apps/web/test/web-search-grouping.test.js` → 无直接路径匹配
  - `apps/web/test/workflow-runs.test.js` → 无直接路径匹配
  - `apps/web/test/workflow-text-parse.test.js` → 无直接路径匹配
  - `apps/web/test/workflowStore.test.js` → 无直接路径匹配
  - `docs/WIRE_FORMAT.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/package-boundaries.zh.md` → 无直接路径匹配
  - `docs/refactor/pnpm-monorepo-migration-plan.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `jsconfig.json` → 本地候选：`jsconfig.json`
  - `package.json` → 本地候选：`package.json`
  - `packages/app/findcc.js` → 无直接路径匹配
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/cli-inject.js` → 无直接路径匹配
  - `packages/app/server/lib/context-watcher.js` → 本地候选：`lib/context-watcher.js`
  - `packages/app/server/lib/enrich-plan-input.js` → 无直接路径匹配
  - `packages/app/server/lib/file-api.js` → 本地候选：`lib/file-api.js`
  - `packages/app/server/lib/interceptor-core.js` → 本地候选：`lib/interceptor-core.js`
  - `packages/app/server/lib/kv-cache-analyzer.js` → 无直接路径匹配
  - `packages/app/server/lib/log-management.js` → 本地候选：`lib/log-management.js`
  - `packages/app/server/lib/log-stream.js` → 无直接路径匹配
  - `packages/app/server/lib/log-watcher.js` → 无直接路径匹配
  - `packages/app/server/lib/prefs-store.js` → 无直接路径匹配
  - `packages/app/server/lib/project-prefs.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-retry.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/lib/skills-api.js` → 本地候选：`lib/skills-api.js`
  - `packages/app/server/lib/stats-worker.js` → 本地候选：`lib/stats-worker.js`
  - `packages/app/server/lib/user-prompt-extract.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/conversation-store.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/convert.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/jsonl-read.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/replay.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-list.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-owner.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/verify.js` → 无直接路径匹配
  - `packages/app/server/lib/voice-pack-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/wire-compress.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/src/utils/clearCheckpoint.js` → 本地候选：`src/utils/clearCheckpoint.js`
  - `packages/app/test/_helpers/cli-tier.mjs` → 无直接路径匹配
  - `packages/app/test/_helpers/rm-sync.mjs` → 无直接路径匹配
  - `packages/app/test/_shims/antd-stub.mjs` → 无直接路径匹配
  - `packages/app/test/_shims/register.mjs` → 无直接路径匹配
  - `packages/app/test/_shims/vite-loader.mjs` → 无直接路径匹配
  - `packages/app/test/agent-id.test.js` → 无直接路径匹配
  - `packages/app/test/ansi-safe-slice.test.js` → 无直接路径匹配
  - `packages/app/test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `packages/app/test/api-auth.test.js` → 无直接路径匹配
  - `packages/app/test/api-base-path.test.js` → 无直接路径匹配
  - `packages/app/test/api-ccswitch-import.test.js` → 无直接路径匹配
  - `packages/app/test/api-claude-md.test.js` → 无直接路径匹配
  - `packages/app/test/api-dingtalk-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-dingtalk.test.js` → 无直接路径匹配
  - `packages/app/test/api-events-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-expert-model-prompts.test.js` → 无直接路径匹配
  - `packages/app/test/api-expert-system-prompt-status.test.js` → 无直接路径匹配
  - `packages/app/test/api-expert-system-text.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-fs-2.test.js` → 无直接路径匹配
  - `packages/app/test/api-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/api-git-routes.test.js` → 无直接路径匹配
  - `packages/app/test/api-im.test.js` → 无直接路径匹配
  - `packages/app/test/api-logs-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-plugins-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-preferences-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-preferences.test.js` → 无直接路径匹配
  - `packages/app/test/api-project-memory.test.js` → 无直接路径匹配
  - `packages/app/test/api-project-meta-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-proxy-profiles.test.js` → 无直接路径匹配
  - `packages/app/test/api-proxy-stats.test.js` → 无直接路径匹配
  - `packages/app/test/api-retry-config.test.js` → 无直接路径匹配
  - `packages/app/test/api-skills-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-team-routes.test.js` → 无直接路径匹配
  - `packages/app/test/api-ultra-agents-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-v2-requests.test.js` → 无直接路径匹配
  - `packages/app/test/api-voice-pack-gap.test.js` → 无直接路径匹配
  - `packages/app/test/api-workspaces.test.js` → 无直接路径匹配
  - `packages/app/test/ask-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/ask-no-timeout-invariants.test.js` → 无直接路径匹配
  - `packages/app/test/ask-reaper.test.js` → 无直接路径匹配
  - `packages/app/test/ask-store.test.js` → 无直接路径匹配
  - `packages/app/test/async-file-lock.test.js` → 无直接路径匹配
  - `packages/app/test/async-write-queue.test.js` → 无直接路径匹配
  - `packages/app/test/auth-lib.test.js` → 无直接路径匹配
  - `packages/app/test/base-path-lib.test.js` → 无直接路径匹配
  - `packages/app/test/branch-cli.test.js` → 无直接路径匹配
  - `packages/app/test/branch-interceptor.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-adapters-dingtalk-adapter.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-adapters-discord-adapter.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-adapters-feishu-adapter.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-adapters-wecom-adapter.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-ask-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-ask-store.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-async-file-lock.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-ccv-editor.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-claude-md-discovery.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-ensure-hooks.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-file-access-policy.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-git-diff.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-im-bridge-core.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-im-deny.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-im-log-watcher.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-im-process-manager.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-im-senders.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-log-stream.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-perm-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-proxy-env.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-sdk-manager.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-session-transcript-reader.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-stats-worker.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-team-runtime.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-turn-end-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-updater.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-user-profile.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-voice-pack-manager.test.js` → 无直接路径匹配
  - `packages/app/test/branch-lib-ws-backpressure.test.js` → 无直接路径匹配
  - `packages/app/test/branch-proxy.test.js` → 无直接路径匹配
  - `packages/app/test/branch-pty-manager.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-auth.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-events.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-content.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-files-fs.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-im.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-plugins.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-preferences.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-skills.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-team.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-voice-pack.test.js` → 无直接路径匹配
  - `packages/app/test/branch-routes-workspaces.test.js` → 无直接路径匹配
  - `packages/app/test/branch-server.test.js` → 无直接路径匹配
  - `packages/app/test/branch-workspace-registry.test.js` → 无直接路径匹配
  - `packages/app/test/ccswitch-import.test.js` → 无直接路径匹配
  - `packages/app/test/ccv-editor.test.js` → 无直接路径匹配
  - `packages/app/test/claude-md-discovery.test.js` → 无直接路径匹配
  - `packages/app/test/cli-boot.test.js` → 无直接路径匹配
  - `packages/app/test/cli-deep.test.js` → 无直接路径匹配
  - `packages/app/test/cli-extra.test.js` → 无直接路径匹配
  - `packages/app/test/cli-inject.test.js` → 无直接路径匹配
  - `packages/app/test/cli-modes.test.js` → 无直接路径匹配
  - `packages/app/test/cli.test.js` → 无直接路径匹配
  - `packages/app/test/code-replace.test.js` → 本地候选：`tests/code-replace.test.js`
  - `packages/app/test/code-search.test.js` → 本地候选：`tests/code-search.test.js`
  - `packages/app/test/codefuse-managed-mode.test.js` → 无直接路径匹配
  - `packages/app/test/config-backup.test.js` → 无直接路径匹配
  - `packages/app/test/context-watcher.test.js` → 无直接路径匹配
  - `packages/app/test/dingtalk-adapter-deep.test.js` → 无直接路径匹配
  - `packages/app/test/dingtalk-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/dingtalk-config.test.js` → 无直接路径匹配
  - `packages/app/test/discord-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/discord-config.test.js` → 无直接路径匹配
  - `packages/app/test/enrich-plan-input.test.js` → 无直接路径匹配
  - `packages/app/test/enrich-workflow.test.js` → 无直接路径匹配
  - `packages/app/test/ensure-hooks-deep.test.js` → 无直接路径匹配
  - `packages/app/test/ensure-hooks.test.js` → 本地候选：`tests/ensure-hooks.test.js`
  - `packages/app/test/events-backpressure.test.js` → 无直接路径匹配
  - `packages/app/test/events-deep.test.js` → 无直接路径匹配
  - `packages/app/test/events-kv-context-scan.test.js` → 无直接路径匹配
  - `packages/app/test/feishu-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/feishu-config.test.js` → 无直接路径匹配
  - `packages/app/test/file-access-policy.test.js` → 无直接路径匹配
  - `packages/app/test/file-api-gap.test.js` → 无直接路径匹配
  - `packages/app/test/files-fs-deep.test.js` → 无直接路径匹配
  - `packages/app/test/findcc-gap.test.js` → 无直接路径匹配
  - `packages/app/test/findcc-logdir-listeners.test.js` → 无直接路径匹配
  - `packages/app/test/findcc.test.js` → 无直接路径匹配
  - `packages/app/test/git-diff.test.js` → 无直接路径匹配
  - `packages/app/test/git-repos.test.js` → 无直接路径匹配
  - `packages/app/test/git-restore.test.js` → 无直接路径匹配
  - `packages/app/test/git-unpushed.test.js` → 无直接路径匹配
  - `packages/app/test/im-append-system-seed.test.js` → 无直接路径匹配
  - `packages/app/test/im-bridge-core-deep.test.js` → 无直接路径匹配
  - `packages/app/test/im-bridge-core.test.js` → 无直接路径匹配
  - `packages/app/test/im-connection-state.test.js` → 无直接路径匹配
  - `packages/app/test/im-deny.test.js` → 无直接路径匹配
  - `packages/app/test/im-lang.test.js` → 无直接路径匹配
  - `packages/app/test/im-live-text.test.js` → 无直接路径匹配
  - `packages/app/test/im-lock-gap.test.js` → 无直接路径匹配
  - `packages/app/test/im-lock.test.js` → 无直接路径匹配
  - `packages/app/test/im-process-manager.test.js` → 无直接路径匹配
  - `packages/app/test/im-routes-gap.test.js` → 无直接路径匹配
  - `packages/app/test/im-senders.test.js` → 无直接路径匹配
  - `packages/app/test/im-skills.test.js` → 无直接路径匹配
  - `packages/app/test/im-spawn-test-guard.test.js` → 无直接路径匹配
  - `packages/app/test/import-file-api.test.js` → 无直接路径匹配
  - `packages/app/test/inject-output-config-effort.test.js` → 无直接路径匹配
  - `packages/app/test/install-method.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-continuation-sync.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-core-mainagent.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-fetch-errors.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-fetch.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-import-arms.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-imworker-init.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-live.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-profile.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-project-state.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-seq-producer.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-seq-teammate.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-teammate-init.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-v2-write.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor-workspace-init.test.js` → 无直接路径匹配
  - `packages/app/test/interceptor.test.js` → 无直接路径匹配
  - `packages/app/test/kv-cache-analyzer.test.js` → 无直接路径匹配
  - `packages/app/test/log-file-utils.test.js` → 无直接路径匹配
  - `packages/app/test/log-management-gap.test.js` → 无直接路径匹配
  - `packages/app/test/log-management.test.js` → 无直接路径匹配
  - `packages/app/test/log-stream.test.js` → 无直接路径匹配
  - `packages/app/test/log-zip.test.js` → 无直接路径匹配
  - `packages/app/test/logdir-policy-invalidation.test.js` → 无直接路径匹配
  - `packages/app/test/logdir-test-guard.test.js` → 无直接路径匹配
  - `packages/app/test/migrate-prompt.test.js` → 无直接路径匹配
  - `packages/app/test/model-system-prompts.test.js` → 本地候选：`tests/model-system-prompts.test.js`
  - `packages/app/test/paths-content.test.js` → 无直接路径匹配
  - `packages/app/test/pending-asks-filter.test.js` → 无直接路径匹配
  - `packages/app/test/perm-bridge.test.js` → 本地候选：`tests/perm-bridge.test.js`
  - `packages/app/test/pid-alive.test.js` → 无直接路径匹配
  - `packages/app/test/plan-file-api.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-loader.test.js` → 无直接路径匹配
  - `packages/app/test/plugin-manager-gap.test.js` → 无直接路径匹配
  - `packages/app/test/project-prefs.test.js` → 无直接路径匹配
  - `packages/app/test/project-state.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-env.test.js` → 本地候选：`tests/proxy-env.test.js`
  - `packages/app/test/proxy-errors.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-profile-isolation.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-retry-cancel.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-retry-stream-idle.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-retry.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-role-custom-endpoint.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-role-proxy-mode.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-role-routing.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-server.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-stats.test.js` → 无直接路径匹配
  - `packages/app/test/proxy-unit.test.js` → 无直接路径匹配
  - `packages/app/test/proxy.test.js` → 无直接路径匹配
  - `packages/app/test/pty-flood-coalescer.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-deep.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-gap.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager-real.test.js` → 无直接路径匹配
  - `packages/app/test/pty-manager.test.js` → 本地候选：`tests/pty-manager.test.js`
  - `packages/app/test/replace-top-level-model.test.js` → 无直接路径匹配
  - `packages/app/test/resolve-profile-model.test.js` → 无直接路径匹配
  - `packages/app/test/resync-nudge-gate.test.js` → 无直接路径匹配
  - `packages/app/test/route-dispatch.test.js` → 无直接路径匹配
  - `packages/app/test/scratch-pty-manager-gap.test.js` → 无直接路径匹配
  - `packages/app/test/scratch-pty-manager.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-adapter.test.js` → 本地候选：`tests/sdk-adapter.test.js`
  - `packages/app/test/sdk-manager-extra.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager-query.test.js` → 无直接路径匹配
  - `packages/app/test/sdk-manager.test.js` → 本地候选：`tests/sdk-manager.test.js`
  - `packages/app/test/search-endpoint.test.js` → 本地候选：`tests/search-endpoint.test.js`
  - `packages/app/test/server-ask-hook-map.test.js` → 无直接路径匹配
  - `packages/app/test/server-auth-branches.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-mode.test.js` → 无直接路径匹配
  - `packages/app/test/server-cli-startup.test.js` → 无直接路径匹配
  - `packages/app/test/server-http-extra-2.test.js` → 无直接路径匹配
  - `packages/app/test/server-http-extra.test.js` → 无直接路径匹配
  - `packages/app/test/server-i18n.test.js` → 无直接路径匹配
  - `packages/app/test/server-im-worker.test.js` → 无直接路径匹配
  - `packages/app/test/server-lifecycle.test.js` → 无直接路径匹配
  - `packages/app/test/server-logs.test.js` → 无直接路径匹配
  - `packages/app/test/server-plugins.test.js` → 无直接路径匹配
  - `packages/app/test/server-ports-busy.test.js` → 无直接路径匹配
  - `packages/app/test/server-residual.test.js` → 无直接路径匹配
  - `packages/app/test/server-resync-request.test.js` → 无直接路径匹配
  - `packages/app/test/server-startup-extra.test.js` → 无直接路径匹配
  - `packages/app/test/server-v2-read.test.js` → 无直接路径匹配
  - `packages/app/test/server-ws-branches.test.js` → 无直接路径匹配
  - `packages/app/test/server.test.js` → 无直接路径匹配
  - `packages/app/test/session-pin.test.js` → 无直接路径匹配
  - `packages/app/test/session-start-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/session-transcript-reader-toolresult.test.js` → 无直接路径匹配
  - `packages/app/test/session-transcript-reader.test.js` → 无直接路径匹配
  - `packages/app/test/settings-merge.test.js` → 无直接路径匹配
  - `packages/app/test/skills-api.test.js` → 本地候选：`tests/skills-api.test.js`
  - `packages/app/test/skills-import.test.js` → 无直接路径匹配
  - `packages/app/test/spawn-model-resolver.test.js` → 无直接路径匹配
  - `packages/app/test/sse-compression.test.js` → 无直接路径匹配
  - `packages/app/test/sse-update-badge-frame.test.js` → 无直接路径匹配
  - `packages/app/test/stats-worker-notification-filter.test.js` → 无直接路径匹配
  - `packages/app/test/stats-worker-proxy.test.js` → 无直接路径匹配
  - `packages/app/test/stats-worker.test.js` → 本地候选：`tests/stats-worker.test.js`
  - `packages/app/test/stream-assembler.test.js` → 无直接路径匹配
  - `packages/app/test/streaming-state.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-builder.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-files.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-presets.test.js` → 无直接路径匹配
  - `packages/app/test/system-prompt-render.test.js` → 无直接路径匹配
  - `packages/app/test/team-runtime.test.js` → 无直接路径匹配
  - `packages/app/test/team-status-endpoint.test.js` → 无直接路径匹配
  - `packages/app/test/term-signals.test.js` → 无直接路径匹配
  - `packages/app/test/terminal-env.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/turn-end-debounce.test.js` → 无直接路径匹配
  - `packages/app/test/updater-pnpm.test.js` → 无直接路径匹配
  - `packages/app/test/updater.test.js` → 无直接路径匹配
  - `packages/app/test/upload-api.test.js` → 无直接路径匹配
  - `packages/app/test/usepassword-startup.test.js` → 无直接路径匹配
  - `packages/app/test/user-profile.test.js` → 无直接路径匹配
  - `packages/app/test/user-prompt-extract.test.js` → 无直接路径匹配
  - `packages/app/test/v2-adapter-incremental.test.js` → 无直接路径匹配
  - `packages/app/test/v2-adapter.test.js` → 无直接路径匹配
  - `packages/app/test/v2-continuation-adopt.test.js` → 无直接路径匹配
  - `packages/app/test/v2-convert.test.js` → 无直接路径匹配
  - `packages/app/test/v2-core.test.js` → 无直接路径匹配
  - `packages/app/test/v2-entry-endpoint.test.js` → 无直接路径匹配
  - `packages/app/test/v2-jsonl-read.test.js` → 无直接路径匹配
  - `packages/app/test/v2-meta-rows.test.js` → 无直接路径匹配
  - `packages/app/test/v2-resume-switch.test.js` → 无直接路径匹配
  - `packages/app/test/v2-session-dirname.test.js` → 无直接路径匹配
  - `packages/app/test/v2-session-list.test.js` → 无直接路径匹配
  - `packages/app/test/v2-session-owner.test.js` → 无直接路径匹配
  - `packages/app/test/v2-session-select.test.js` → 无直接路径匹配
  - `packages/app/test/v2-singleflight.test.js` → 无直接路径匹配
  - `packages/app/test/v2-verify.test.js` → 无直接路径匹配
  - `packages/app/test/v2-window-two-pass.test.js` → 无直接路径匹配
  - `packages/app/test/voice-pack-manager.test.js` → 无直接路径匹配
  - `packages/app/test/wecom-bridge.test.js` → 无直接路径匹配
  - `packages/app/test/wecom-config.test.js` → 无直接路径匹配
  - `packages/app/test/windows-compat.test.js` → 无直接路径匹配
  - `packages/app/test/windows-npm-root-regression.test.js` → 无直接路径匹配
  - `packages/app/test/wire-compress.test.js` → 无直接路径匹配
  - `packages/app/test/workflow-journal.test.js` → 无直接路径匹配
  - `packages/app/test/workflow-live.test.js` → 无直接路径匹配
  - `packages/app/test/workflow-watcher.test.js` → 无直接路径匹配
  - `packages/app/test/workspace-registry.test.js` → 无直接路径匹配
  - `packages/app/test/ws-backpressure.test.js` → 无直接路径匹配
  - `packages/content/test/ccv-projects.test.js` → 无直接路径匹配
  - `packages/core/package.json` → 无直接路径匹配
  - `packages/core/src/approval-modal-prefs.js` → 本地候选：`server/lib/approval-modal-prefs.js`
  - `packages/core/src/clearCheckpoint.js` → 本地候选：`src/utils/clearCheckpoint.js`
  - `packages/core/src/contentFilter.js` → 本地候选：`src/utils/contentFilter.js`
  - `packages/core/src/context-rules.js` → 本地候选：`server/lib/context-rules.js`
  - `packages/core/src/delta-reconstructor.js` → 本地候选：`server/lib/delta-reconstructor.js`
  - `packages/core/src/error-report.js` → 无直接路径匹配
  - `packages/core/src/requestType.js` → 本地候选：`src/utils/requestType.js`
  - `packages/core/src/session-boundary.js` → 无直接路径匹配
  - `packages/core/src/teammateDetector.js` → 本地候选：`src/utils/teammateDetector.js`
  - `packages/core/src/tools-xml-formatter.js` → 本地候选：`server/lib/tools-xml-formatter.js`
  - `packages/core/src/v2-transcript-normalizer.js` → 无直接路径匹配
  - `packages/core/src/voice-pack-events.js` → 本地候选：`server/lib/voice-pack-events.js`
  - `packages/core/test/approval-modal-prefs.test.js` → 无直接路径匹配
  - `packages/core/test/branch-lib-delta-reconstructor.test.js` → 无直接路径匹配
  - `packages/core/test/branch-utils-teammateDetector.test.js` → 无直接路径匹配
  - `packages/core/test/clearCheckpoint.test.js` → 无直接路径匹配
  - `packages/core/test/context-rules.test.js` → 无直接路径匹配
  - `packages/core/test/delta-reconstructor.test.js` → 无直接路径匹配
  - `packages/core/test/native-teammate-detector.test.js` → 无直接路径匹配
  - `packages/core/test/request-type-unit.test.js` → 无直接路径匹配
  - `packages/core/test/session-boundary.test.js` → 无直接路径匹配
  - `packages/core/test/sse-heartbeat.test.js` → 无直接路径匹配
  - `packages/core/test/synthetic-classification.test.js` → 无直接路径匹配
  - `packages/core/test/v2-transcript-normalizer.test.js` → 无直接路径匹配
  - `packages/core/test/voice-pack-events.test.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `pnpm-workspace.yaml` → 无直接路径匹配
  - `scripts/gen-default-voicepack.js` → 本地候选：`scripts/gen-default-voicepack.js`
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `scripts/verify-boundaries.mjs` → 无直接路径匹配
  - `test/boundary-checker.test.js` → 无直接路径匹配
  - `test/client-safe-imports.test.js` → 无直接路径匹配
  - `test/content-filter-unit.test.js` → 无直接路径匹配
  - `test/delta-e2e.test.js` → 无直接路径匹配
  - `test/delta-reorder.test.js` → 无直接路径匹配
  - `test/real-request-guard.test.js` → 无直接路径匹配
  - `test/session-boundary-parity.test.js` → 无直接路径匹配
  - `test/test-env-isolation-guard.test.js` → 无直接路径匹配
  - `test/ultraplan-detection.test.js` → 无直接路径匹配
  - `test/v2-image-pipeline.test.js` → 无直接路径匹配
  - `test/v2-live-feed.test.js` → 无直接路径匹配
  - `test/v2-transcript-incremental.test.js` → 无直接路径匹配
  - `test/v3-assembler.test.js` → 无直接路径匹配
  - `test/voice-pack-sanguo-integration.test.js` → 无直接路径匹配
  - `test/windows-import-paths.test.js` → 无直接路径匹配
  - `uitest/ask-question-form.md` → 无直接路径匹配

<a id="commit-729b886893"></a>
## [729b886893](https://github.com/weiesky/cc-viewer/commit/729b8868939392a255648582615f1474c44b6724) — refactor(boundaries): break static cycles + add import-boundary gate for packages/app
- B0 本地关键代码对照：上游打破循环依赖并引入 acorn 导入边界门禁；当前单包 scripts 中未发现同名门禁，不能据此假定无循环；结合 B11 拆包评估真实依赖图及增量门禁。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-729b886893)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-729b886893)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-729b886893)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:00-04:00；作者时间：2026-08-19T10:25:08-04:00；父提交：f9467bfc83。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（33 个）：
  - `.changeset/boundary-gate-cycle-break.md` → 无直接路径匹配
  - `.github/workflows/ci.yml` → 无直接路径匹配
  - `CLAUDE.md` → 无直接路径匹配
  - `docs/refactor/package-boundaries.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `packages/app/findcc.js` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/file-api.js` → 本地候选：`lib/file-api.js`
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-append-system.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/log-file-utils.js` → 无直接路径匹配
  - `packages/app/server/lib/log-management.js` → 本地候选：`lib/log-management.js`
  - `packages/app/server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `packages/app/server/lib/project-prefs.js` → 无直接路径匹配
  - `packages/app/server/lib/project-state.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-files.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/convert.js` → 无直接路径匹配
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `scripts/boundary-allowlist.json` → 无直接路径匹配
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `scripts/verify-boundaries.mjs` → 无直接路径匹配
  - `test/boundary-checker.test.js` → 无直接路径匹配
  - `test/cli-import-paths.test.js` → 无直接路径匹配
  - `test/findcc-logdir-listeners.test.js` → 无直接路径匹配
  - `test/interceptor-project-state.test.js` → 无直接路径匹配
  - `test/log-file-utils.test.js` → 无直接路径匹配
  - `test/logdir-policy-invalidation.test.js` → 无直接路径匹配
  - `test/project-state.test.js` → 无直接路径匹配

<a id="commit-f9467bfc83"></a>
## [f9467bfc83](https://github.com/weiesky/cc-viewer/commit/f9467bfc838a6ef724c0f7144e0ef302e1256523) — refactor(server): group server/lib batch-1 into im/ ask/ proxy/ subdirectories
- B0 本地关键代码对照：上游移动 IM、ask、proxy 模块并迁移 hook 路径；当前 lib 仍为单包平铺，目录移动须同时核验既有入口和旧 hook 自愈，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-f9467bfc83)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-f9467bfc83)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-f9467bfc83)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:00-04:00；作者时间：2026-08-19T07:53:40-04:00；父提交：20ccfb7304。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（94 个）：
  - `.changeset/lib-subdirs-batch1.md` → 无直接路径匹配
  - `apps/web/src/utils/imOrigin.js` → 本地候选：`src/utils/imOrigin.js`
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/adapters/dingtalk-adapter.js` → 本地候选：`lib/adapters/dingtalk-adapter.js`
  - `packages/app/server/lib/adapters/discord-adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/adapters/feishu-adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/adapters/wecom-adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-constants.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-reaper.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/ask-store.js` → 无直接路径匹配
  - `packages/app/server/lib/ask/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/ensure-hooks.js` → 本地候选：`lib/ensure-hooks.js`
  - `packages/app/server/lib/im/dingtalk-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/im/dingtalk-config.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-append-system.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-bridge-core.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-config.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-lang.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-lock.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-log-watcher.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-process-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-senders.js` → 无直接路径匹配
  - `packages/app/server/lib/im/im-skills.js` → 无直接路径匹配
  - `packages/app/server/lib/prefs-store.js` → 无直接路径匹配
  - `packages/app/server/lib/project-prefs.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-env.js` → 本地候选：`lib/proxy-env.js`
  - `packages/app/server/lib/proxy/proxy-errors.js` → 本地候选：`lib/proxy-errors.js`
  - `packages/app/server/lib/proxy/proxy-retry.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/stats-worker.js` → 本地候选：`lib/stats-worker.js`
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/dingtalk.js` → 无直接路径匹配
  - `packages/app/server/routes/im.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `test/api-dingtalk-gap.test.js` → 无直接路径匹配
  - `test/api-dingtalk.test.js` → 无直接路径匹配
  - `test/api-im.test.js` → 无直接路径匹配
  - `test/ask-bridge.test.js` → 无直接路径匹配
  - `test/ask-no-timeout-invariants.test.js` → 无直接路径匹配
  - `test/ask-reaper.test.js` → 无直接路径匹配
  - `test/ask-store.test.js` → 无直接路径匹配
  - `test/branch-lib-ask-bridge.test.js` → 无直接路径匹配
  - `test/branch-lib-ask-store.test.js` → 无直接路径匹配
  - `test/branch-lib-im-bridge-core.test.js` → 无直接路径匹配
  - `test/branch-lib-im-deny.test.js` → 无直接路径匹配
  - `test/branch-lib-im-log-watcher.test.js` → 无直接路径匹配
  - `test/branch-lib-im-process-manager.test.js` → 无直接路径匹配
  - `test/branch-lib-im-senders.test.js` → 无直接路径匹配
  - `test/branch-lib-perm-bridge.test.js` → 无直接路径匹配
  - `test/branch-lib-proxy-env.test.js` → 无直接路径匹配
  - `test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `test/branch-routes-im.test.js` → 无直接路径匹配
  - `test/cli-deep.test.js` → 无直接路径匹配
  - `test/dingtalk-bridge.test.js` → 无直接路径匹配
  - `test/dingtalk-config.test.js` → 无直接路径匹配
  - `test/discord-bridge.test.js` → 无直接路径匹配
  - `test/discord-config.test.js` → 无直接路径匹配
  - `test/ensure-hooks-deep.test.js` → 无直接路径匹配
  - `test/ensure-hooks.test.js` → 本地候选：`tests/ensure-hooks.test.js`
  - `test/feishu-bridge.test.js` → 无直接路径匹配
  - `test/feishu-config.test.js` → 无直接路径匹配
  - `test/im-append-system-seed.test.js` → 无直接路径匹配
  - `test/im-bridge-core-deep.test.js` → 无直接路径匹配
  - `test/im-bridge-core.test.js` → 无直接路径匹配
  - `test/im-connection-state.test.js` → 无直接路径匹配
  - `test/im-deny.test.js` → 无直接路径匹配
  - `test/im-lang.test.js` → 无直接路径匹配
  - `test/im-lock-gap.test.js` → 无直接路径匹配
  - `test/im-lock.test.js` → 无直接路径匹配
  - `test/im-process-manager.test.js` → 无直接路径匹配
  - `test/im-routes-gap.test.js` → 无直接路径匹配
  - `test/im-senders.test.js` → 无直接路径匹配
  - `test/im-skills.test.js` → 无直接路径匹配
  - `test/im-spawn-test-guard.test.js` → 无直接路径匹配
  - `test/pending-asks-filter.test.js` → 无直接路径匹配
  - `test/perm-bridge.test.js` → 本地候选：`tests/perm-bridge.test.js`
  - `test/proxy-env.test.js` → 本地候选：`tests/proxy-env.test.js`
  - `test/proxy-errors.test.js` → 无直接路径匹配
  - `test/proxy-retry-cancel.test.js` → 无直接路径匹配
  - `test/proxy-retry-stream-idle.test.js` → 无直接路径匹配
  - `test/proxy-retry.test.js` → 无直接路径匹配
  - `test/proxy-stats.test.js` → 无直接路径匹配
  - `test/server-im-worker.test.js` → 无直接路径匹配
  - `test/wecom-bridge.test.js` → 无直接路径匹配
  - `test/wecom-config.test.js` → 无直接路径匹配
  - `test/windows-hide.test.js` → 无直接路径匹配

<a id="commit-20ccfb7304"></a>
## [20ccfb7304](https://github.com/weiesky/cc-viewer/commit/20ccfb7304d3d298be3b818bb406a35a6779527a) — refactor(content): extract bundled assets into packages/content (@ccv/content)
- B0 本地关键代码对照：当前资源仍随根包组织，未抽取 @ccv/content；是否抽包须结合资源发现与发布产物核验，归 B11。 [pnpm 专项](./B0-pnpm-monorepo.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-20ccfb7304)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-20ccfb7304)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:00-04:00；作者时间：2026-08-19T07:53:10-04:00；父提交：3b5103bb9e。
- B0 专项核查：上游 pnpm/monorepo 阶段提交；见 [专项方案对照](./B0-pnpm-monorepo.md)。归属 B11，是否实施仍待决策。
- 初筛批次：**H / 插件与扩展**；状态：待人工核验。
- 处理建议：对比现有 hook 插件接口；评估服务生命周期、授权和代理隔离。
- 上游改动路径（1385 个）：
  - `.changeset/content-package-extraction.md` → 无直接路径匹配
  - `.gitignore` → 本地候选：`.gitignore`
  - `CLAUDE.md` → 无直接路径匹配
  - `packages/app/concepts/ar/GlobalSettings.md` → 本地候选：`concepts/ar/GlobalSettings.md`
  - `packages/app/concepts/da/GlobalSettings.md` → 本地候选：`concepts/da/GlobalSettings.md`
  - `packages/app/concepts/de/GlobalSettings.md` → 本地候选：`concepts/de/GlobalSettings.md`
  - `packages/app/concepts/en/GlobalSettings.md` → 本地候选：`concepts/en/GlobalSettings.md`
  - `packages/app/concepts/es/GlobalSettings.md` → 本地候选：`concepts/es/GlobalSettings.md`
  - `packages/app/concepts/fr/GlobalSettings.md` → 本地候选：`concepts/fr/GlobalSettings.md`
  - `packages/app/concepts/it/GlobalSettings.md` → 本地候选：`concepts/it/GlobalSettings.md`
  - `packages/app/concepts/ja/GlobalSettings.md` → 本地候选：`concepts/ja/GlobalSettings.md`
  - `packages/app/concepts/ko/GlobalSettings.md` → 本地候选：`concepts/ko/GlobalSettings.md`
  - `packages/app/concepts/no/GlobalSettings.md` → 本地候选：`concepts/no/GlobalSettings.md`
  - `packages/app/concepts/pl/GlobalSettings.md` → 本地候选：`concepts/pl/GlobalSettings.md`
  - `packages/app/concepts/pt-BR/GlobalSettings.md` → 本地候选：`concepts/pt-BR/GlobalSettings.md`
  - `packages/app/concepts/ru/GlobalSettings.md` → 本地候选：`concepts/ru/GlobalSettings.md`
  - `packages/app/concepts/th/GlobalSettings.md` → 本地候选：`concepts/th/GlobalSettings.md`
  - `packages/app/concepts/tr/GlobalSettings.md` → 本地候选：`concepts/tr/GlobalSettings.md`
  - `packages/app/concepts/uk/GlobalSettings.md` → 本地候选：`concepts/uk/GlobalSettings.md`
  - `packages/app/concepts/zh-TW/GlobalSettings.md` → 本地候选：`concepts/zh-TW/GlobalSettings.md`
  - `packages/app/concepts/zh/GlobalSettings.md` → 本地候选：`concepts/zh/GlobalSettings.md`
  - `packages/app/scripts/assemble-dist.mjs` → 无直接路径匹配
  - `packages/app/server/_paths.js` → 无直接路径匹配
  - `packages/content/concepts/ar/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/ar/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/ar/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/ar/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ar/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/ar/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/ar/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/ar/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/ar/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/ar/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/ar/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/ar/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/ar/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/ar/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/ar/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/da/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/da/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/da/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/da/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/da/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/da/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/da/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/da/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/da/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/da/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/da/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/da/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/da/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/da/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/da/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/da/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/de/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/de/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/de/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/de/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/de/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/de/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/de/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/de/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/de/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/de/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/de/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/de/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/de/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/de/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/de/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/de/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/en/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/en/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/en/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/en/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/en/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/en/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/en/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/en/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/en/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/en/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/en/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/en/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/en/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/en/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/en/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/en/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/es/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/es/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/es/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/es/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/es/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/es/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/es/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/es/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/es/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/es/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/es/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/es/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/es/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/es/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/es/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/es/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/fr/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/fr/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/fr/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/fr/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/fr/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/fr/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/fr/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/fr/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/fr/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/fr/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/fr/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/fr/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/fr/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/fr/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/fr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/it/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/it/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/it/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/it/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/it/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/it/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/it/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/it/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/it/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/it/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/it/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/it/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/it/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/it/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/it/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/it/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ja/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/ja/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/ja/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/ja/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ja/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/ja/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/ja/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/ja/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/ja/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/ja/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/ja/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/ja/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/ja/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/ja/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/ja/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ko/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/ko/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/ko/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/ko/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ko/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/ko/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/ko/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/ko/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/ko/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/ko/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/ko/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/ko/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/ko/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/ko/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/ko/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/no/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/no/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/no/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/no/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/no/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/no/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/no/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/no/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/no/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/no/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/no/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/no/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/no/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/no/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/no/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/no/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pl/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/pl/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/pl/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/pl/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/pl/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/pl/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/pl/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/pl/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/pl/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/pl/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/pl/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/pl/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/pl/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/pl/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/pl/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/pt-BR/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/ru/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/ru/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/ru/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/ru/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/ru/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/ru/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/ru/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/ru/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/ru/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/ru/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/ru/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/ru/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/ru/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/ru/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/ru/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/th/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/th/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/th/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/th/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/th/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/th/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/th/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/th/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/th/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/th/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/th/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/th/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/th/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/th/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/th/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/th/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/tr/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/tr/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/tr/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/tr/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/tr/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/tr/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/tr/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/tr/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/tr/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/tr/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/tr/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/tr/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/tr/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/tr/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/tr/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/uk/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/uk/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/uk/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/uk/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/uk/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/uk/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/uk/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/uk/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/uk/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/uk/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/uk/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/uk/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/uk/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/uk/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/uk/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/zh-TW/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/BodyDiffJSON.md` → 无直接路径匹配
  - `packages/content/concepts/zh/BodyFields.md` → 无直接路径匹配
  - `packages/content/concepts/zh/CacheRebuild.md` → 无直接路径匹配
  - `packages/content/concepts/zh/CustomUltraplanExpert.md` → 无直接路径匹配
  - `packages/content/concepts/zh/GlobalSettings.md` → 无直接路径匹配
  - `packages/content/concepts/zh/KVCacheContent.md` → 无直接路径匹配
  - `packages/content/concepts/zh/MainAgent.md` → 无直接路径匹配
  - `packages/content/concepts/zh/ProxySwitch.md` → 无直接路径匹配
  - `packages/content/concepts/zh/QRCode.md` → 无直接路径匹配
  - `packages/content/concepts/zh/ResponseFields.md` → 无直接路径匹配
  - `packages/content/concepts/zh/SubAgent-Search.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Teammate.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Agent.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Artifact.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Bash.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-CronList.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Edit.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Glob.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Grep.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-LSP.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Monitor.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Projects.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-REPL.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Read.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SendFile.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Skill.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-TaskList.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Workflow.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tool-Write.md` → 无直接路径匹配
  - `packages/content/concepts/zh/Tools.md` → 无直接路径匹配
  - `packages/content/concepts/zh/ToolsFirst.md` → 无直接路径匹配
  - `packages/content/concepts/zh/TranslateContextPollution.md` → 无直接路径匹配
  - `packages/content/concepts/zh/UltraPlan.md` → 无直接路径匹配
  - `packages/content/concepts/zh/ultraplan-origin.md` → 无直接路径匹配
  - `packages/content/package.json` → 无直接路径匹配
  - `packages/content/server/imPreset/ar.md` → 无直接路径匹配
  - `packages/content/server/imPreset/da.md` → 无直接路径匹配
  - `packages/content/server/imPreset/de.md` → 无直接路径匹配
  - `packages/content/server/imPreset/en.md` → 无直接路径匹配
  - `packages/content/server/imPreset/es.md` → 无直接路径匹配
  - `packages/content/server/imPreset/fr.md` → 无直接路径匹配
  - `packages/content/server/imPreset/it.md` → 无直接路径匹配
  - `packages/content/server/imPreset/ja.md` → 无直接路径匹配
  - `packages/content/server/imPreset/ko.md` → 无直接路径匹配
  - `packages/content/server/imPreset/no.md` → 无直接路径匹配
  - `packages/content/server/imPreset/pl.md` → 无直接路径匹配
  - `packages/content/server/imPreset/pt-BR.md` → 无直接路径匹配
  - `packages/content/server/imPreset/ru.md` → 无直接路径匹配
  - `packages/content/server/imPreset/th.md` → 无直接路径匹配
  - `packages/content/server/imPreset/tr.md` → 无直接路径匹配
  - `packages/content/server/imPreset/uk.md` → 无直接路径匹配
  - `packages/content/server/imPreset/zh-TW.md` → 无直接路径匹配
  - `packages/content/server/imPreset/zh.md` → 无直接路径匹配
  - `packages/content/server/imSkills/ar/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/da/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/de/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/en/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/es/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/fr/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/it/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/ja/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/ko/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/no/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/pl/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/pt-BR/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/ru/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/scripts/ccv-projects.mjs` → 无直接路径匹配
  - `packages/content/server/imSkills/th/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/tr/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/uk/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/zh-TW/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/server/imSkills/zh/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/content/ultraAgents/README.md` → 无直接路径匹配
  - `packages/content/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `packages/content/ultraAgents/research-expert.json` → 本地候选：`ultraAgents/research-expert.json`
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `test/ccv-projects.test.js` → 无直接路径匹配
  - `test/paths-content.test.js` → 无直接路径匹配
  - `test/tool-activation-concepts.test.js` → 无直接路径匹配
  - `test/tool-catalog-concepts.test.js` → 本地候选：`tests/tool-catalog-concepts.test.js`
  - `test/ultraplan-concepts-parity.test.js` → 无直接路径匹配

<a id="commit-3b5103bb9e"></a>
## [3b5103bb9e](https://github.com/weiesky/cc-viewer/commit/3b5103bb9e16b9e833ad2dd68feca5db787c2c76) — ci(contract): add L4 tarball-layout gate (verify:tarball + committed baseline)
- 工程前置验证关联（2026-11-17）：3b15a6d 批次实际比较 A1/A2 npm 清单（1014→672，原运行代码/资产/文档前缀、9 个共享文件及入口保留），执行隔离生产安装与桌面 Node payload 验证。这是本轮验收证据，不等于已引入全部上游自动 tarball 门禁/CI。见 [证据](./A1-A2-engineering.md)。
- B0 本地关键代码对照：当前 scripts/npm-pack-dry-run.mjs 提供产物预览校验，但尚无上游提交的固定 tarball 文件布局基线及差异门禁；归 B11 对照实现。 [pnpm 专项](./B0-pnpm-monorepo.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3b5103bb9e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3b5103bb9e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:00-04:00；作者时间：2026-08-19T07:52:38-04:00；父提交：7d83b5deff。
- B0 专项核查：上游 pnpm/monorepo 阶段提交；见 [专项方案对照](./B0-pnpm-monorepo.md)。归属 B11，是否实施仍待决策。
- 初筛批次：**L / 工程、测试与打包**；状态：待人工核验。
- 处理建议：对照当前 npm 构建与发布约束，择取契约测试，不默认迁移 monorepo。
- 上游改动路径（6 个）：
  - `.github/workflows/ci.yml` → 无直接路径匹配
  - `.github/workflows/release.yml` → 无直接路径匹配
  - `docs/refactor/packages-app-split-plan.zh.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `scripts/tarball-baseline.json` → 无直接路径匹配
  - `scripts/verify-tarball-contract.mjs` → 无直接路径匹配

<a id="commit-7d83b5deff"></a>
## [7d83b5deff](https://github.com/weiesky/cc-viewer/commit/7d83b5deffb3d84a0f86ae4df3aaffba4c00d171) — chore(changesets): adopt @changesets/cli for cc-viewer versioning (stage A3)
- B0 本地关键代码对照：当前单包版本流程未引入 Changesets；这是上游独立 A3 版本管理步骤，归 B11，不能推定 pnpm 切换必需。 [pnpm 专项](./B0-pnpm-monorepo.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7d83b5deff)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7d83b5deff)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:00-04:00；作者时间：2026-08-19T04:33:53-04:00；父提交：e3ca28c52d。
- B0 专项核查：上游 pnpm/monorepo 阶段提交；见 [专项方案对照](./B0-pnpm-monorepo.md)。归属 B11，是否实施仍待决策。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（6 个）：
  - `.changeset/README.md` → 无直接路径匹配
  - `.changeset/config.json` → 无直接路径匹配
  - `CLAUDE.md` → 无直接路径匹配
  - `docs/refactor/pnpm-monorepo-migration-plan.zh.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `pnpm-lock.yaml` → 无直接路径匹配

<a id="commit-e3ca28c52d"></a>
## [e3ca28c52d](https://github.com/weiesky/cc-viewer/commit/e3ca28c52db1aae7435be1d05da3e1e479fb532e) — refactor(monorepo): split into apps/{web,electron} + packages/app workspace layout (stage A2)
- 工程前置结构适配（2026-11-17）：3b15a6d 已在 codex/pnpm-workspace 实现 app/web/electron、共享 9 文件、测试分布、npm 组装和 Electron Resources/server；未切换全局实例。全量 1102/1102、构建、npm 672 文件与实际生产安装/HTTP/PTY、macOS unsigned 目录包实际 Node payload、393 条封闭链接通过。同条 pnpm-global updater 策略和完整目标平台/GUI/签名/全局升级未完成，仍属部分对齐。见 [交接](./A1-A2-engineering.md)。
- B0 本地关键代码对照：当前为根目录单包，server.js、cli.js、lib、src、electron 仍共享根目录；上游 A2 拆包未实施，归入 B11，须保留 Codex 入口及发布契约。 [pnpm 专项](./B0-pnpm-monorepo.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-e3ca28c52d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-e3ca28c52d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:34:00-04:00；作者时间：2026-08-19T04:27:13-04:00；父提交：dabc5232ce。
- B0 专项核查：上游 pnpm/monorepo 阶段提交；见 [专项方案对照](./B0-pnpm-monorepo.md)。归属 B11，是否实施仍待决策。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（2398 个）：
  - `.github/workflows/release.yml` → 无直接路径匹配
  - `.gitignore` → 本地候选：`.gitignore`
  - `CLAUDE.md` → 无直接路径匹配
  - `README.md` → 本地候选：`README.md`
  - `apps/electron/build/entitlements.mac.plist` → 无直接路径匹配
  - `apps/electron/build/icon.icns` → 无直接路径匹配
  - `apps/electron/build/icon.png` → 无直接路径匹配
  - `apps/electron/build/notarize.js` → 无直接路径匹配
  - `apps/electron/electron-builder.yml` → 无直接路径匹配
  - `apps/electron/electron/diag.js` → 本地候选：`electron/diag.js`
  - `apps/electron/electron/main.js` → 本地候选：`electron/main.js`
  - `apps/electron/electron/menu-model.js` → 本地候选：`electron/menu-model.js`
  - `apps/electron/electron/tab-bar.html` → 本地候选：`electron/tab-bar.html`
  - `apps/electron/electron/tab-content-preload.js` → 本地候选：`electron/tab-content-preload.js`
  - `apps/electron/electron/tab-preload.js` → 本地候选：`electron/tab-preload.js`
  - `apps/electron/electron/tab-worker.js` → 本地候选：`electron/tab-worker.js`
  - `apps/electron/electron/window-state.js` → 本地候选：`electron/window-state.js`
  - `apps/electron/electron/workspace-preload.js` → 本地候选：`electron/workspace-preload.js`
  - `apps/electron/package.json` → 无直接路径匹配
  - `apps/electron/scripts/assemble-app.mjs` → 无直接路径匹配
  - `apps/web/build.js` → 本地候选：`build.js`
  - `apps/web/index.html` → 本地候选：`index.html`
  - `apps/web/package.json` → 本地候选：`package.json`
  - `apps/web/public/favicon.ico` → 本地候选：`public/favicon.ico`
  - `apps/web/public/voice-packs/default/A_choice_for_your_consideration_sir.MP3` → 本地候选：`public/voice-packs/default/A_choice_for_your_consideration_sir.MP3`
  - `apps/web/public/voice-packs/default/It_is_done_sir.MP3` → 本地候选：`public/voice-packs/default/It_is_done_sir.MP3`
  - `apps/web/public/voice-packs/default/The_plan_awaits_your_approval_sir.MP3` → 本地候选：`public/voice-packs/default/The_plan_awaits_your_approval_sir.MP3`
  - `apps/web/public/voice-packs/default/pack.json` → 本地候选：`public/voice-packs/default/pack.json`
  - `apps/web/public/voice-packs/sanguo/ask.MP3` → 本地候选：`public/voice-packs/sanguo/ask.MP3`
  - `apps/web/public/voice-packs/sanguo/end.MP3` → 本地候选：`public/voice-packs/sanguo/end.MP3`
  - `apps/web/public/voice-packs/sanguo/pack.json` → 本地候选：`public/voice-packs/sanguo/pack.json`
  - `apps/web/public/voice-packs/sanguo/plan.MP3` → 本地候选：`public/voice-packs/sanguo/plan.MP3`
  - `apps/web/src/App.jsx` → 本地候选：`src/App.jsx`
  - `apps/web/src/App.module.css` → 本地候选：`src/App.module.css`
  - `apps/web/src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `apps/web/src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `apps/web/src/components/approval/ApprovalModal.jsx` → 本地候选：`src/components/approval/ApprovalModal.jsx`
  - `apps/web/src/components/approval/ApprovalModal.module.css` → 本地候选：`src/components/approval/ApprovalModal.module.css`
  - `apps/web/src/components/approval/ToolApprovalPanel.jsx` → 本地候选：`src/components/approval/ToolApprovalPanel.jsx`
  - `apps/web/src/components/approval/ToolApprovalPanel.module.css` → 本地候选：`src/components/approval/ToolApprovalPanel.module.css`
  - `apps/web/src/components/charts/BarChart.jsx` → 无直接路径匹配
  - `apps/web/src/components/charts/BarChart.module.css` → 无直接路径匹配
  - `apps/web/src/components/charts/barChartHelpers.js` → 无直接路径匹配
  - `apps/web/src/components/chat/ApprovalPortalContext.js` → 本地候选：`src/components/chat/ApprovalPortalContext.js`
  - `apps/web/src/components/chat/AskQuestionForm.jsx` → 本地候选：`src/components/chat/AskQuestionForm.jsx`
  - `apps/web/src/components/chat/AskTimeoutCountdown.jsx` → 本地候选：`src/components/chat/AskTimeoutCountdown.jsx`
  - `apps/web/src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `apps/web/src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `apps/web/src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `apps/web/src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `apps/web/src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `apps/web/src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `apps/web/src/components/chat/DiffView.jsx` → 本地候选：`src/components/chat/DiffView.jsx`
  - `apps/web/src/components/chat/DiffView.module.css` → 本地候选：`src/components/chat/DiffView.module.css`
  - `apps/web/src/components/chat/RoleFilterBar.jsx` → 本地候选：`src/components/chat/RoleFilterBar.jsx`
  - `apps/web/src/components/chat/RoleFilterBar.module.css` → 本地候选：`src/components/chat/RoleFilterBar.module.css`
  - `apps/web/src/components/chat/controllers/askFlowController.js` → 本地候选：`src/components/chat/controllers/askFlowController.js`
  - `apps/web/src/components/chat/controllers/permissionController.js` → 本地候选：`src/components/chat/controllers/permissionController.js`
  - `apps/web/src/components/chat/controllers/ptyPromptController.js` → 本地候选：`src/components/chat/controllers/ptyPromptController.js`
  - `apps/web/src/components/chat/controllers/scrollHighlightController.js` → 本地候选：`src/components/chat/controllers/scrollHighlightController.js`
  - `apps/web/src/components/chat/controllers/splitDragController.js` → 本地候选：`src/components/chat/controllers/splitDragController.js`
  - `apps/web/src/components/chat/controllers/toolFileChangeController.js` → 本地候选：`src/components/chat/controllers/toolFileChangeController.js`
  - `apps/web/src/components/chat/interactionOwnership.js` → 本地候选：`src/components/chat/interactionOwnership.js`
  - `apps/web/src/components/chat/uploadDeferLogic.js` → 本地候选：`src/components/chat/uploadDeferLogic.js`
  - `apps/web/src/components/common/ChipIcon.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/ConceptHelp.jsx` → 本地候选：`src/components/common/ConceptHelp.jsx`
  - `apps/web/src/components/common/ConceptHelp.module.css` → 本地候选：`src/components/common/ConceptHelp.module.css`
  - `apps/web/src/components/common/ConfirmRemoveButton.jsx` → 本地候选：`src/components/common/ConfirmRemoveButton.jsx`
  - `apps/web/src/components/common/CountryFlag.jsx` → 本地候选：`src/components/common/CountryFlag.jsx`
  - `apps/web/src/components/common/CountryFlag.module.css` → 本地候选：`src/components/common/CountryFlag.module.css`
  - `apps/web/src/components/common/DialogueIcon.jsx` → 无直接路径匹配
  - `apps/web/src/components/common/DingTalkIcon.jsx` → 本地候选：`src/components/common/DingTalkIcon.jsx`
  - `apps/web/src/components/common/DiscordIcon.jsx` → 本地候选：`src/components/common/DiscordIcon.jsx`
  - `apps/web/src/components/common/FeishuIcon.jsx` → 本地候选：`src/components/common/FeishuIcon.jsx`
  - `apps/web/src/components/common/HoverPreviewTip.jsx` → 本地候选：`src/components/common/HoverPreviewTip.jsx`
  - `apps/web/src/components/common/HoverPreviewTip.module.css` → 本地候选：`src/components/common/HoverPreviewTip.module.css`
  - `apps/web/src/components/common/ImageLightbox.jsx` → 本地候选：`src/components/common/ImageLightbox.jsx`
  - `apps/web/src/components/common/ImageLightbox.module.css` → 本地候选：`src/components/common/ImageLightbox.module.css`
  - `apps/web/src/components/common/MemoryDetailModal.jsx` → 本地候选：`src/components/common/MemoryDetailModal.jsx`
  - `apps/web/src/components/common/OpenFolderIcon.jsx` → 本地候选：`src/components/common/OpenFolderIcon.jsx`
  - `apps/web/src/components/common/OpenFolderIcon.module.css` → 本地候选：`src/components/common/OpenFolderIcon.module.css`
  - `apps/web/src/components/common/PanelResizer.jsx` → 本地候选：`src/components/common/PanelResizer.jsx`
  - `apps/web/src/components/common/PanelResizer.module.css` → 本地候选：`src/components/common/PanelResizer.module.css`
  - `apps/web/src/components/common/QuickAutoApproveRows.jsx` → 本地候选：`src/components/common/QuickAutoApproveRows.jsx`
  - `apps/web/src/components/common/RefreshIcon.jsx` → 本地候选：`src/components/common/RefreshIcon.jsx`
  - `apps/web/src/components/common/RefreshIcon.module.css` → 本地候选：`src/components/common/RefreshIcon.module.css`
  - `apps/web/src/components/common/SnapLineOverlay.jsx` → 本地候选：`src/components/common/SnapLineOverlay.jsx`
  - `apps/web/src/components/common/SnapLineOverlay.module.css` → 本地候选：`src/components/common/SnapLineOverlay.module.css`
  - `apps/web/src/components/common/ToolsHelp.jsx` → 本地候选：`src/components/common/ToolsHelp.jsx`
  - `apps/web/src/components/common/ToolsHelp.module.css` → 本地候选：`src/components/common/ToolsHelp.module.css`
  - `apps/web/src/components/common/WeComIcon.jsx` → 本地候选：`src/components/common/WeComIcon.jsx`
  - `apps/web/src/components/common/quickMenuIcons.jsx` → 本地候选：`src/components/common/quickMenuIcons.jsx`
  - `apps/web/src/components/common/sharedChrome.module.css` → 本地候选：`src/components/common/sharedChrome.module.css`
  - `apps/web/src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `apps/web/src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `apps/web/src/components/dashboard/CachePopoverContent.jsx` → 本地候选：`src/components/dashboard/CachePopoverContent.jsx`
  - `apps/web/src/components/dashboard/CachePopoverContent.module.css` → 本地候选：`src/components/dashboard/CachePopoverContent.module.css`
  - `apps/web/src/components/dashboard/ContextTab.jsx` → 本地候选：`src/components/dashboard/ContextTab.jsx`
  - `apps/web/src/components/dashboard/ContextTab.module.css` → 本地候选：`src/components/dashboard/ContextTab.module.css`
  - `apps/web/src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `apps/web/src/components/dashboard/DetailPanel.module.css` → 本地候选：`src/components/dashboard/DetailPanel.module.css`
  - `apps/web/src/components/dashboard/LiveTagPopover.jsx` → 本地候选：`src/components/dashboard/LiveTagPopover.jsx`
  - `apps/web/src/components/dashboard/LiveTagPopover.module.css` → 本地候选：`src/components/dashboard/LiveTagPopover.module.css`
  - `apps/web/src/components/dashboard/RequestList.jsx` → 本地候选：`src/components/dashboard/RequestList.jsx`
  - `apps/web/src/components/dashboard/RequestList.module.css` → 本地候选：`src/components/dashboard/RequestList.module.css`
  - `apps/web/src/components/dashboard/TeamSessionPanel.jsx` → 本地候选：`src/components/dashboard/TeamSessionPanel.jsx`
  - `apps/web/src/components/dashboard/TeamSessionPanel.module.css` → 本地候选：`src/components/dashboard/TeamSessionPanel.module.css`
  - `apps/web/src/components/dashboard/UsageWindowPill.jsx` → 本地候选：`src/components/dashboard/UsageWindowPill.jsx`
  - `apps/web/src/components/dashboard/UsageWindowPill.module.css` → 本地候选：`src/components/dashboard/UsageWindowPill.module.css`
  - `apps/web/src/components/dashboard/WorkflowRunsPanel.jsx` → 本地候选：`src/components/dashboard/WorkflowRunsPanel.jsx`
  - `apps/web/src/components/dashboard/WorkflowRunsPanel.module.css` → 本地候选：`src/components/dashboard/WorkflowRunsPanel.module.css`
  - `apps/web/src/components/dashboard/WorkspaceList.jsx` → 本地候选：`src/components/dashboard/WorkspaceList.jsx`
  - `apps/web/src/components/dashboard/WorkspaceList.module.css` → 本地候选：`src/components/dashboard/WorkspaceList.module.css`
  - `apps/web/src/components/files/FileContentView.jsx` → 本地候选：`src/components/files/FileContentView.jsx`
  - `apps/web/src/components/files/FileContentView.module.css` → 本地候选：`src/components/files/FileContentView.module.css`
  - `apps/web/src/components/files/FileExplorer.jsx` → 本地候选：`src/components/files/FileExplorer.jsx`
  - `apps/web/src/components/files/FileExplorer.module.css` → 本地候选：`src/components/files/FileExplorer.module.css`
  - `apps/web/src/components/files/MdxEditorPanel.base.css` → 本地候选：`src/components/files/MdxEditorPanel.base.css`
  - `apps/web/src/components/files/MdxEditorPanel.jsx` → 本地候选：`src/components/files/MdxEditorPanel.jsx`
  - `apps/web/src/components/files/MdxEditorPanel.module.css` → 本地候选：`src/components/files/MdxEditorPanel.module.css`
  - `apps/web/src/components/git/DiffMiniMap.jsx` → 本地候选：`src/components/git/DiffMiniMap.jsx`
  - `apps/web/src/components/git/DiffMiniMap.module.css` → 本地候选：`src/components/git/DiffMiniMap.module.css`
  - `apps/web/src/components/git/FullFileDiffView.jsx` → 本地候选：`src/components/git/FullFileDiffView.jsx`
  - `apps/web/src/components/git/FullFileDiffView.module.css` → 本地候选：`src/components/git/FullFileDiffView.module.css`
  - `apps/web/src/components/git/GitChanges.jsx` → 本地候选：`src/components/git/GitChanges.jsx`
  - `apps/web/src/components/git/GitChanges.module.css` → 本地候选：`src/components/git/GitChanges.module.css`
  - `apps/web/src/components/git/GitDiffView.jsx` → 本地候选：`src/components/git/GitDiffView.jsx`
  - `apps/web/src/components/git/GitDiffView.module.css` → 本地候选：`src/components/git/GitDiffView.module.css`
  - `apps/web/src/components/mobile/MobileDrawerCloseButton.jsx` → 本地候选：`src/components/mobile/MobileDrawerCloseButton.jsx`
  - `apps/web/src/components/mobile/MobileFileExplorer.jsx` → 本地候选：`src/components/mobile/MobileFileExplorer.jsx`
  - `apps/web/src/components/mobile/MobileFileExplorer.module.css` → 本地候选：`src/components/mobile/MobileFileExplorer.module.css`
  - `apps/web/src/components/mobile/MobileGitDiff.jsx` → 本地候选：`src/components/mobile/MobileGitDiff.jsx`
  - `apps/web/src/components/mobile/MobileGitDiff.module.css` → 本地候选：`src/components/mobile/MobileGitDiff.module.css`
  - `apps/web/src/components/mobile/MobileStats.jsx` → 本地候选：`src/components/mobile/MobileStats.jsx`
  - `apps/web/src/components/mobile/MobileStats.module.css` → 本地候选：`src/components/mobile/MobileStats.module.css`
  - `apps/web/src/components/proxy-stats/ProxyStatsDashboard.jsx` → 无直接路径匹配
  - `apps/web/src/components/proxy-stats/ProxyStatsDashboard.module.css` → 无直接路径匹配
  - `apps/web/src/components/proxy-stats/ProxyStatsModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/proxy-stats/ProxyStatsModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/proxy-stats/RetryStatsHelpers.jsx` → 无直接路径匹配
  - `apps/web/src/components/search/SearchPanel.jsx` → 本地候选：`src/components/search/SearchPanel.jsx`
  - `apps/web/src/components/search/SearchPanel.module.css` → 本地候选：`src/components/search/SearchPanel.module.css`
  - `apps/web/src/components/settings/ImAppendSystemModal.jsx` → 本地候选：`src/components/settings/ImAppendSystemModal.jsx`
  - `apps/web/src/components/settings/ImConversationModal.jsx` → 本地候选：`src/components/settings/ImConversationModal.jsx`
  - `apps/web/src/components/settings/ImConversationModal.module.css` → 本地候选：`src/components/settings/ImConversationModal.module.css`
  - `apps/web/src/components/settings/ImPlatformSettings.jsx` → 本地候选：`src/components/settings/ImPlatformSettings.jsx`
  - `apps/web/src/components/settings/ImPlatformSettings.module.css` → 本地候选：`src/components/settings/ImPlatformSettings.module.css`
  - `apps/web/src/components/settings/ImSkillsModal.jsx` → 本地候选：`src/components/settings/ImSkillsModal.jsx`
  - `apps/web/src/components/settings/ImStatusChip.jsx` → 本地候选：`src/components/settings/ImStatusChip.jsx`
  - `apps/web/src/components/settings/ImStatusChip.module.css` → 本地候选：`src/components/settings/ImStatusChip.module.css`
  - `apps/web/src/components/settings/MessagingModal.jsx` → 本地候选：`src/components/settings/MessagingModal.jsx`
  - `apps/web/src/components/settings/MessagingModal.module.css` → 本地候选：`src/components/settings/MessagingModal.module.css`
  - `apps/web/src/components/settings/ModelPromptTabs.jsx` → 本地候选：`src/components/settings/ModelPromptTabs.jsx`
  - `apps/web/src/components/settings/PluginModal.jsx` → 本地候选：`src/components/settings/PluginModal.jsx`
  - `apps/web/src/components/settings/PluginModal.module.css` → 本地候选：`src/components/settings/PluginModal.module.css`
  - `apps/web/src/components/settings/PreferencesForm.jsx` → 本地候选：`src/components/settings/PreferencesForm.jsx`
  - `apps/web/src/components/settings/PreferencesForm.module.css` → 本地候选：`src/components/settings/PreferencesForm.module.css`
  - `apps/web/src/components/settings/ProcessModal.jsx` → 本地候选：`src/components/settings/ProcessModal.jsx`
  - `apps/web/src/components/settings/ProcessModal.module.css` → 本地候选：`src/components/settings/ProcessModal.module.css`
  - `apps/web/src/components/settings/ProjectAliasEditor.jsx` → 本地候选：`src/components/settings/ProjectAliasEditor.jsx`
  - `apps/web/src/components/settings/ProjectAliasEditor.module.css` → 本地候选：`src/components/settings/ProjectAliasEditor.module.css`
  - `apps/web/src/components/settings/ProjectPrefsManagerModal.jsx` → 本地候选：`src/components/settings/ProjectPrefsManagerModal.jsx`
  - `apps/web/src/components/settings/ProjectPrefsManagerModal.module.css` → 本地候选：`src/components/settings/ProjectPrefsManagerModal.module.css`
  - `apps/web/src/components/settings/ProxyModal.jsx` → 本地候选：`src/components/settings/ProxyModal.jsx`
  - `apps/web/src/components/settings/ProxyModal.module.css` → 本地候选：`src/components/settings/ProxyModal.module.css`
  - `apps/web/src/components/settings/RetryConfigModal.jsx` → 无直接路径匹配
  - `apps/web/src/components/settings/RetryConfigModal.module.css` → 无直接路径匹配
  - `apps/web/src/components/settings/SkillsManagerModal.jsx` → 本地候选：`src/components/settings/SkillsManagerModal.jsx`
  - `apps/web/src/components/settings/SkillsManagerModal.module.css` → 本地候选：`src/components/settings/SkillsManagerModal.module.css`
  - `apps/web/src/components/settings/SystemTextModal.jsx` → 本地候选：`src/components/settings/SystemTextModal.jsx`
  - `apps/web/src/components/settings/SystemTextModal.module.css` → 本地候选：`src/components/settings/SystemTextModal.module.css`
  - `apps/web/src/components/settings/VoicePackSettings.jsx` → 本地候选：`src/components/settings/VoicePackSettings.jsx`
  - `apps/web/src/components/settings/VoicePackSettings.module.css` → 本地候选：`src/components/settings/VoicePackSettings.module.css`
  - `apps/web/src/components/settings/imPlatforms.js` → 本地候选：`src/components/settings/imPlatforms.js`
  - `apps/web/src/components/terminal/CustomUltraplanEditModal.jsx` → 本地候选：`src/components/terminal/CustomUltraplanEditModal.jsx`
  - `apps/web/src/components/terminal/CustomUltraplanEditModal.module.css` → 本地候选：`src/components/terminal/CustomUltraplanEditModal.module.css`
  - `apps/web/src/components/terminal/PresetExpertPickerModal.jsx` → 本地候选：`src/components/terminal/PresetExpertPickerModal.jsx`
  - `apps/web/src/components/terminal/PresetExpertPickerModal.module.css` → 本地候选：`src/components/terminal/PresetExpertPickerModal.module.css`
  - `apps/web/src/components/terminal/PresetModal.jsx` → 本地候选：`src/components/terminal/PresetModal.jsx`
  - `apps/web/src/components/terminal/ScratchTerminal.jsx` → 本地候选：`src/components/terminal/ScratchTerminal.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.jsx` → 本地候选：`src/components/terminal/TerminalPanel.jsx`
  - `apps/web/src/components/terminal/TerminalPanel.module.css` → 本地候选：`src/components/terminal/TerminalPanel.module.css`
  - `apps/web/src/components/terminal/TerminalWsContext.jsx` → 本地候选：`src/components/terminal/TerminalWsContext.jsx`
  - `apps/web/src/components/terminal/UltraPlanModal.jsx` → 本地候选：`src/components/terminal/UltraPlanModal.jsx`
  - `apps/web/src/components/terminal/UltraPlanModal.module.css` → 本地候选：`src/components/terminal/UltraPlanModal.module.css`
  - `apps/web/src/components/terminal/UltraplanExpertManagerModal.jsx` → 本地候选：`src/components/terminal/UltraplanExpertManagerModal.jsx`
  - `apps/web/src/components/terminal/UltraplanExpertManagerModal.module.css` → 本地候选：`src/components/terminal/UltraplanExpertManagerModal.module.css`
  - `apps/web/src/components/terminal/UltraplanPanel.jsx` → 本地候选：`src/components/terminal/UltraplanPanel.jsx`
  - `apps/web/src/components/terminal/UltraplanPanel.module.css` → 本地候选：`src/components/terminal/UltraplanPanel.module.css`
  - `apps/web/src/components/terminal/terminalThemes.js` → 本地候选：`src/components/terminal/terminalThemes.js`
  - `apps/web/src/components/viewers/ImageViewer.jsx` → 本地候选：`src/components/viewers/ImageViewer.jsx`
  - `apps/web/src/components/viewers/ImageViewer.module.css` → 本地候选：`src/components/viewers/ImageViewer.module.css`
  - `apps/web/src/components/viewers/JsonViewer.jsx` → 本地候选：`src/components/viewers/JsonViewer.jsx`
  - `apps/web/src/components/viewers/JsonViewer.module.css` → 本地候选：`src/components/viewers/JsonViewer.module.css`
  - `apps/web/src/components/viewers/LogTable.jsx` → 本地候选：`src/components/viewers/LogTable.jsx`
  - `apps/web/src/components/viewers/MarkdownBlock.jsx` → 本地候选：`src/components/viewers/MarkdownBlock.jsx`
  - `apps/web/src/components/viewers/MarkdownBlock.module.css` → 本地候选：`src/components/viewers/MarkdownBlock.module.css`
  - `apps/web/src/components/viewers/ToolResultView.jsx` → 本地候选：`src/components/viewers/ToolResultView.jsx`
  - `apps/web/src/components/viewers/ToolResultView.module.css` → 本地候选：`src/components/viewers/ToolResultView.module.css`
  - `apps/web/src/components/viewers/WebSearchResultsView.jsx` → 无直接路径匹配
  - `apps/web/src/components/viewers/WebSearchResultsView.module.css` → 无直接路径匹配
  - `apps/web/src/components/viewers/WorkflowLiveHud.jsx` → 本地候选：`src/components/viewers/WorkflowLiveHud.jsx`
  - `apps/web/src/components/viewers/WorkflowLiveHud.module.css` → 本地候选：`src/components/viewers/WorkflowLiveHud.module.css`
  - `apps/web/src/components/viewers/WorkflowPanel.jsx` → 本地候选：`src/components/viewers/WorkflowPanel.jsx`
  - `apps/web/src/components/viewers/WorkflowPanel.module.css` → 本地候选：`src/components/viewers/WorkflowPanel.module.css`
  - `apps/web/src/components/viewers/WorkflowTimeline.jsx` → 本地候选：`src/components/viewers/WorkflowTimeline.jsx`
  - `apps/web/src/components/viewers/WorkflowTimeline.module.css` → 本地候选：`src/components/viewers/WorkflowTimeline.module.css`
  - `apps/web/src/config.json` → 无直接路径匹配
  - `apps/web/src/contexts/SettingsContext.jsx` → 本地候选：`src/contexts/SettingsContext.jsx`
  - `apps/web/src/env.js` → 本地候选：`src/env.js`
  - `apps/web/src/global.css` → 本地候选：`src/global.css`
  - `apps/web/src/hooks/useMarkdownExport.js` → 本地候选：`src/hooks/useMarkdownExport.js`
  - `apps/web/src/hooks/useMermaidRender.js` → 本地候选：`src/hooks/useMermaidRender.js`
  - `apps/web/src/hooks/useProjectAlias.js` → 本地候选：`src/hooks/useProjectAlias.js`
  - `apps/web/src/hooks/useSessionStoragePersistedSet.js` → 本地候选：`src/hooks/useSessionStoragePersistedSet.js`
  - `apps/web/src/i18n.js` → 本地候选：`src/i18n.js`
  - `apps/web/src/i18n/mdxTranslations.js` → 本地候选：`src/i18n/mdxTranslations.js`
  - `apps/web/src/img/ccv-logo.png` → 本地候选：`src/img/ccv-logo.png`
  - `apps/web/src/img/claude/entrance.svg` → 本地候选：`src/img/codex/entrance.svg`
  - `apps/web/src/img/claude/exit.svg` → 本地候选：`src/img/codex/exit.svg`
  - `apps/web/src/img/claude/orbiting.svg` → 本地候选：`src/img/codex/orbiting.svg`
  - `apps/web/src/img/claude/shimmer.svg` → 本地候选：`src/img/codex/shimmer.svg`
  - `apps/web/src/img/claude/thinking.svg` → 本地候选：`src/img/codex/thinking.svg`
  - `apps/web/src/img/claude/tickle.svg` → 本地候选：`src/img/codex/tickle.svg`
  - `apps/web/src/img/claude/waiting.svg` → 本地候选：`src/img/codex/waiting.svg`
  - `apps/web/src/img/claude/writing.svg` → 本地候选：`src/img/codex/writing.svg`
  - `apps/web/src/img/default-avatar.svg` → 本地候选：`src/img/default-avatar.svg`
  - `apps/web/src/img/default-model-avatar.svg` → 本地候选：`src/img/default-model-avatar.svg`
  - `apps/web/src/img/loading-pet.gif` → 本地候选：`src/img/loading-pet.gif`
  - `apps/web/src/img/model-claude.svg` → 无直接路径匹配
  - `apps/web/src/img/model-deepseek.svg` → 本地候选：`src/img/model-deepseek.svg`
  - `apps/web/src/img/model-gemini.svg` → 本地候选：`src/img/model-gemini.svg`
  - `apps/web/src/img/model-glm.svg` → 本地候选：`src/img/model-glm.svg`
  - `apps/web/src/img/model-kimi.svg` → 本地候选：`src/img/model-kimi.svg`
  - `apps/web/src/img/model-minimax.svg` → 本地候选：`src/img/model-minimax.svg`
  - `apps/web/src/img/model-openai.svg` → 本地候选：`src/img/model-openai.svg`
  - `apps/web/src/img/model-qwen.svg` → 本地候选：`src/img/model-qwen.svg`
  - `apps/web/src/img/teammates/DESIGN.md` → 本地候选：`src/img/teammates/DESIGN.md`
  - `apps/web/src/img/teammates/analyst.svg` → 本地候选：`src/img/teammates/analyst.svg`
  - `apps/web/src/img/teammates/auditor.svg` → 本地候选：`src/img/teammates/auditor.svg`
  - `apps/web/src/img/teammates/builder.svg` → 本地候选：`src/img/teammates/builder.svg`
  - `apps/web/src/img/teammates/default.svg` → 本地候选：`src/img/teammates/default.svg`
  - `apps/web/src/img/teammates/designer.svg` → 本地候选：`src/img/teammates/designer.svg`
  - `apps/web/src/img/teammates/executor.svg` → 本地候选：`src/img/teammates/executor.svg`
  - `apps/web/src/img/teammates/expert.svg` → 本地候选：`src/img/teammates/expert.svg`
  - `apps/web/src/img/teammates/explorer.svg` → 本地候选：`src/img/teammates/explorer.svg`
  - `apps/web/src/img/teammates/implementer.svg` → 本地候选：`src/img/teammates/implementer.svg`
  - `apps/web/src/img/teammates/investigator.svg` → 本地候选：`src/img/teammates/investigator.svg`
  - `apps/web/src/img/teammates/marvel/analyst.svg` → 本地候选：`src/img/teammates/marvel/analyst.svg`
  - `apps/web/src/img/teammates/marvel/auditor.svg` → 本地候选：`src/img/teammates/marvel/auditor.svg`
  - `apps/web/src/img/teammates/marvel/builder.svg` → 本地候选：`src/img/teammates/marvel/builder.svg`
  - `apps/web/src/img/teammates/marvel/default.svg` → 本地候选：`src/img/teammates/marvel/default.svg`
  - `apps/web/src/img/teammates/marvel/designer.svg` → 本地候选：`src/img/teammates/marvel/designer.svg`
  - `apps/web/src/img/teammates/marvel/executor.svg` → 本地候选：`src/img/teammates/marvel/executor.svg`
  - `apps/web/src/img/teammates/marvel/expert.svg` → 本地候选：`src/img/teammates/marvel/expert.svg`
  - `apps/web/src/img/teammates/marvel/explorer.svg` → 本地候选：`src/img/teammates/marvel/explorer.svg`
  - `apps/web/src/img/teammates/marvel/implementer.svg` → 本地候选：`src/img/teammates/marvel/implementer.svg`
  - `apps/web/src/img/teammates/marvel/investigator.svg` → 本地候选：`src/img/teammates/marvel/investigator.svg`
  - `apps/web/src/img/teammates/marvel/researcher.svg` → 本地候选：`src/img/teammates/marvel/researcher.svg`
  - `apps/web/src/img/teammates/marvel/reviewer.svg` → 本地候选：`src/img/teammates/marvel/reviewer.svg`
  - `apps/web/src/img/teammates/marvel/scanner.svg` → 本地候选：`src/img/teammates/marvel/scanner.svg`
  - `apps/web/src/img/teammates/marvel/security.svg` → 本地候选：`src/img/teammates/marvel/security.svg`
  - `apps/web/src/img/teammates/marvel/tracer.svg` → 本地候选：`src/img/teammates/marvel/tracer.svg`
  - `apps/web/src/img/teammates/marvel/translator.svg` → 本地候选：`src/img/teammates/marvel/translator.svg`
  - `apps/web/src/img/teammates/marvel/worker.svg` → 本地候选：`src/img/teammates/marvel/worker.svg`
  - `apps/web/src/img/teammates/researcher.svg` → 本地候选：`src/img/teammates/researcher.svg`
  - `apps/web/src/img/teammates/reviewer.svg` → 本地候选：`src/img/teammates/reviewer.svg`
  - `apps/web/src/img/teammates/scanner.svg` → 本地候选：`src/img/teammates/scanner.svg`
  - `apps/web/src/img/teammates/security.svg` → 本地候选：`src/img/teammates/security.svg`
  - `apps/web/src/img/teammates/tracer.svg` → 本地候选：`src/img/teammates/tracer.svg`
  - `apps/web/src/img/teammates/translator.svg` → 本地候选：`src/img/teammates/translator.svg`
  - `apps/web/src/img/teammates/worker.svg` → 本地候选：`src/img/teammates/worker.svg`
  - `apps/web/src/main.jsx` → 本地候选：`src/main.jsx`
  - `apps/web/src/tokenInterceptor.js` → 本地候选：`src/tokenInterceptor.js`
  - `apps/web/src/utils/apiUrl.js` → 本地候选：`src/utils/apiUrl.js`
  - `apps/web/src/utils/askFallback.js` → 本地候选：`src/utils/askFallback.js`
  - `apps/web/src/utils/askOptionDesc.js` → 本地候选：`src/utils/askOptionDesc.js`
  - `apps/web/src/utils/askPortalMatcher.js` → 本地候选：`src/utils/askPortalMatcher.js`
  - `apps/web/src/utils/autoApproveOptions.js` → 本地候选：`src/utils/autoApproveOptions.js`
  - `apps/web/src/utils/avatarAnimationPostPass.js` → 本地候选：`src/utils/avatarAnimationPostPass.js`
  - `apps/web/src/utils/builtinPresets.js` → 本地候选：`src/utils/builtinPresets.js`
  - `apps/web/src/utils/commandValidator.js` → 本地候选：`src/utils/commandValidator.js`
  - `apps/web/src/utils/contextRaw.js` → 本地候选：`src/utils/contextRaw.js`
  - `apps/web/src/utils/contextSidebarNavigation.js` → 本地候选：`src/utils/contextSidebarNavigation.js`
  - `apps/web/src/utils/contextTurns.js` → 无直接路径匹配
  - `apps/web/src/utils/displayScaleHelper.js` → 本地候选：`src/utils/displayScaleHelper.js`
  - `apps/web/src/utils/effectiveModel.js` → 无直接路径匹配
  - `apps/web/src/utils/entry-slim.js` → 本地候选：`src/utils/entry-slim.js`
  - `apps/web/src/utils/entryCache.js` → 本地候选：`src/utils/entryCache.js`
  - `apps/web/src/utils/errorReport.js` → 本地候选：`src/utils/errorReport.js`
  - `apps/web/src/utils/fileExpandedPathsStorage.js` → 本地候选：`src/utils/fileExpandedPathsStorage.js`
  - `apps/web/src/utils/fileIcons.jsx` → 本地候选：`src/utils/fileIcons.jsx`
  - `apps/web/src/utils/fileOpen.js` → 本地候选：`src/utils/fileOpen.js`
  - `apps/web/src/utils/formatters.js` → 本地候选：`src/utils/formatters.js`
  - `apps/web/src/utils/gitApi.js` → 本地候选：`src/utils/gitApi.js`
  - `apps/web/src/utils/gitTreeBuilder.js` → 本地候选：`src/utils/gitTreeBuilder.js`
  - `apps/web/src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `apps/web/src/utils/identityHeal.js` → 本地候选：`src/utils/identityHeal.js`
  - `apps/web/src/utils/imConnState.js` → 无直接路径匹配
  - `apps/web/src/utils/imOrigin.js` → 本地候选：`src/utils/imOrigin.js`
  - `apps/web/src/utils/imTr.js` → 本地候选：`src/utils/imTr.js`
  - `apps/web/src/utils/imageCompress.js` → 本地候选：`src/utils/imageCompress.js`
  - `apps/web/src/utils/imageDownscale.js` → 本地候选：`src/utils/imageDownscale.js`
  - `apps/web/src/utils/imageResize.js` → 本地候选：`src/utils/imageResize.js`
  - `apps/web/src/utils/ingestPipeline.js` → 本地候选：`src/utils/ingestPipeline.js`
  - `apps/web/src/utils/isProxyMode.js` → 无直接路径匹配
  - `apps/web/src/utils/lazyWithReload.js` → 本地候选：`src/utils/lazyWithReload.js`
  - `apps/web/src/utils/markdown.js` → 本地候选：`src/utils/markdown.js`
  - `apps/web/src/utils/markdownIncremental.js` → 本地候选：`src/utils/markdownIncremental.js`
  - `apps/web/src/utils/markdownProfiler.js` → 本地候选：`src/utils/markdownProfiler.js`
  - `apps/web/src/utils/mdExtensionDetect.js` → 本地候选：`src/utils/mdExtensionDetect.js`
  - `apps/web/src/utils/memoryLinkParser.js` → 本地候选：`src/utils/memoryLinkParser.js`
  - `apps/web/src/utils/modalMask.js` → 本地候选：`src/utils/modalMask.js`
  - `apps/web/src/utils/modelSuggestions.js` → 无直接路径匹配
  - `apps/web/src/utils/monotime.js` → 本地候选：`src/utils/monotime.js`
  - `apps/web/src/utils/pinnedMenu.js` → 本地候选：`src/utils/pinnedMenu.js`
  - `apps/web/src/utils/presetShortcuts.js` → 本地候选：`src/utils/presetShortcuts.js`
  - `apps/web/src/utils/projectAlias.js` → 本地候选：`src/utils/projectAlias.js`
  - `apps/web/src/utils/promptClassifier.js` → 本地候选：`src/utils/promptClassifier.js`
  - `apps/web/src/utils/promptDetect.js` → 本地候选：`src/utils/promptDetect.js`
  - `apps/web/src/utils/promptNav.js` → 本地候选：`src/utils/promptNav.js`
  - `apps/web/src/utils/ptyChunkBuilder.js` → 本地候选：`src/utils/ptyChunkBuilder.js`
  - `apps/web/src/utils/quickMenuHoverIntent.js` → 本地候选：`src/utils/quickMenuHoverIntent.js`
  - `apps/web/src/utils/rateLimitParser.js` → 本地候选：`src/utils/rateLimitParser.js`
  - `apps/web/src/utils/readResultPool.js` → 本地候选：`src/utils/readResultPool.js`
  - `apps/web/src/utils/refreshCachedItemProp.js` → 本地候选：`src/utils/refreshCachedItemProp.js`
  - `apps/web/src/utils/resizeCalc.js` → 本地候选：`src/utils/resizeCalc.js`
  - `apps/web/src/utils/resolveLocalized.js` → 本地候选：`src/utils/resolveLocalized.js`
  - `apps/web/src/utils/searchApi.js` → 本地候选：`src/utils/searchApi.js`
  - `apps/web/src/utils/searchReplace.js` → 本地候选：`src/utils/searchReplace.js`
  - `apps/web/src/utils/seqResourceLoaders.js` → 本地候选：`src/utils/seqResourceLoaders.js`
  - `apps/web/src/utils/sessionManager.js` → 本地候选：`src/utils/sessionManager.js`
  - `apps/web/src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `apps/web/src/utils/skillModalController.js` → 本地候选：`src/utils/skillModalController.js`
  - `apps/web/src/utils/skillsParser.js` → 本地候选：`src/utils/skillsParser.js`
  - `apps/web/src/utils/slashCommandLabels.js` → 本地候选：`src/utils/slashCommandLabels.js`
  - `apps/web/src/utils/splitDragCalc.js` → 本地候选：`src/utils/splitDragCalc.js`
  - `apps/web/src/utils/stickyBottomController.js` → 本地候选：`src/utils/stickyBottomController.js`
  - `apps/web/src/utils/svgSanitize.js` → 本地候选：`src/utils/svgSanitize.js`
  - `apps/web/src/utils/systemTags.js` → 本地候选：`src/utils/systemTags.js`
  - `apps/web/src/utils/tClaude.js` → 无直接路径匹配
  - `apps/web/src/utils/teamModalBuilder.js` → 本地候选：`src/utils/teamModalBuilder.js`
  - `apps/web/src/utils/teamSessionParser.js` → 本地候选：`src/utils/teamSessionParser.js`
  - `apps/web/src/utils/teammateAvatars.js` → 本地候选：`src/utils/teammateAvatars.js`
  - `apps/web/src/utils/termDiag.js` → 本地候选：`src/utils/termDiag.js`
  - `apps/web/src/utils/terminalClipboard.js` → 本地候选：`src/utils/terminalClipboard.js`
  - `apps/web/src/utils/terminalWriteQueue.js` → 本地候选：`src/utils/terminalWriteQueue.js`
  - `apps/web/src/utils/thinkingMerge.js` → 本地候选：`src/utils/thinkingMerge.js`
  - `apps/web/src/utils/toolCatalog.js` → 本地候选：`src/utils/toolCatalog.js`
  - `apps/web/src/utils/toolResultBuilder.js` → 本地候选：`src/utils/toolResultBuilder.js`
  - `apps/web/src/utils/toolResultClassifier.js` → 本地候选：`src/utils/toolResultClassifier.js`
  - `apps/web/src/utils/toolResultCore.js` → 本地候选：`src/utils/toolResultCore.js`
  - `apps/web/src/utils/toolsDiff.js` → 本地候选：`src/utils/toolsDiff.js`
  - `apps/web/src/utils/toolsXmlFormatter.js` → 本地候选：`src/utils/toolsXmlFormatter.js`
  - `apps/web/src/utils/ultraplanController.js` → 本地候选：`src/utils/ultraplanController.js`
  - `apps/web/src/utils/ultraplanExperts.js` → 本地候选：`src/utils/ultraplanExperts.js`
  - `apps/web/src/utils/ultraplanTemplates.js` → 本地候选：`src/utils/ultraplanTemplates.js`
  - `apps/web/src/utils/userImageRefs.js` → 本地候选：`src/utils/userImageRefs.js`
  - `apps/web/src/utils/v3Assembler.js` → 无直接路径匹配
  - `apps/web/src/utils/v3Rows.js` → 无直接路径匹配
  - `apps/web/src/utils/voicePackPlayer.js` → 本地候选：`src/utils/voicePackPlayer.js`
  - `apps/web/src/utils/webSearchGrouping.js` → 无直接路径匹配
  - `apps/web/src/utils/workflowFormat.js` → 本地候选：`src/utils/workflowFormat.js`
  - `apps/web/src/utils/workflowRuns.js` → 本地候选：`src/utils/workflowRuns.js`
  - `apps/web/src/utils/workflowStore.js` → 本地候选：`src/utils/workflowStore.js`
  - `apps/web/vite.config.js` → 本地候选：`vite.config.js`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/refactor/pnpm-monorepo-migration-plan.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `jsconfig.json` → 本地候选：`jsconfig.json`
  - `package.json` → 本地候选：`package.json`
  - `packages/app/cli.js` → 本地候选：`cli.js`
  - `packages/app/concepts/ar/BodyDiffJSON.md` → 本地候选：`concepts/ar/BodyDiffJSON.md`
  - `packages/app/concepts/ar/BodyFields.md` → 本地候选：`concepts/ar/BodyFields.md`
  - `packages/app/concepts/ar/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/ar/CustomUltraplanExpert.md` → 本地候选：`concepts/ar/CustomUltraplanExpert.md`
  - `packages/app/concepts/ar/GlobalSettings.md` → 本地候选：`concepts/ar/GlobalSettings.md`
  - `packages/app/concepts/ar/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/ar/MainAgent.md` → 本地候选：`concepts/ar/MainAgent.md`
  - `packages/app/concepts/ar/ProxySwitch.md` → 本地候选：`concepts/ar/ProxySwitch.md`
  - `packages/app/concepts/ar/QRCode.md` → 本地候选：`concepts/ar/QRCode.md`
  - `packages/app/concepts/ar/ResponseFields.md` → 本地候选：`concepts/ar/ResponseFields.md`
  - `packages/app/concepts/ar/SubAgent-Search.md` → 本地候选：`concepts/ar/SubAgent-Search.md`
  - `packages/app/concepts/ar/Teammate.md` → 本地候选：`concepts/ar/Teammate.md`
  - `packages/app/concepts/ar/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/ar/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/ar/ToolsFirst.md` → 本地候选：`concepts/ar/ToolsFirst.md`
  - `packages/app/concepts/ar/TranslateContextPollution.md` → 本地候选：`concepts/ar/TranslateContextPollution.md`
  - `packages/app/concepts/ar/UltraPlan.md` → 本地候选：`concepts/ar/UltraPlan.md`
  - `packages/app/concepts/da/BodyDiffJSON.md` → 本地候选：`concepts/da/BodyDiffJSON.md`
  - `packages/app/concepts/da/BodyFields.md` → 本地候选：`concepts/da/BodyFields.md`
  - `packages/app/concepts/da/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/da/CustomUltraplanExpert.md` → 本地候选：`concepts/da/CustomUltraplanExpert.md`
  - `packages/app/concepts/da/GlobalSettings.md` → 本地候选：`concepts/da/GlobalSettings.md`
  - `packages/app/concepts/da/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/da/MainAgent.md` → 本地候选：`concepts/da/MainAgent.md`
  - `packages/app/concepts/da/ProxySwitch.md` → 本地候选：`concepts/da/ProxySwitch.md`
  - `packages/app/concepts/da/QRCode.md` → 本地候选：`concepts/da/QRCode.md`
  - `packages/app/concepts/da/ResponseFields.md` → 本地候选：`concepts/da/ResponseFields.md`
  - `packages/app/concepts/da/SubAgent-Search.md` → 本地候选：`concepts/da/SubAgent-Search.md`
  - `packages/app/concepts/da/Teammate.md` → 本地候选：`concepts/da/Teammate.md`
  - `packages/app/concepts/da/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/da/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/da/ToolsFirst.md` → 本地候选：`concepts/da/ToolsFirst.md`
  - `packages/app/concepts/da/TranslateContextPollution.md` → 本地候选：`concepts/da/TranslateContextPollution.md`
  - `packages/app/concepts/da/UltraPlan.md` → 本地候选：`concepts/da/UltraPlan.md`
  - `packages/app/concepts/de/BodyDiffJSON.md` → 本地候选：`concepts/de/BodyDiffJSON.md`
  - `packages/app/concepts/de/BodyFields.md` → 本地候选：`concepts/de/BodyFields.md`
  - `packages/app/concepts/de/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/de/CustomUltraplanExpert.md` → 本地候选：`concepts/de/CustomUltraplanExpert.md`
  - `packages/app/concepts/de/GlobalSettings.md` → 本地候选：`concepts/de/GlobalSettings.md`
  - `packages/app/concepts/de/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/de/MainAgent.md` → 本地候选：`concepts/de/MainAgent.md`
  - `packages/app/concepts/de/ProxySwitch.md` → 本地候选：`concepts/de/ProxySwitch.md`
  - `packages/app/concepts/de/QRCode.md` → 本地候选：`concepts/de/QRCode.md`
  - `packages/app/concepts/de/ResponseFields.md` → 本地候选：`concepts/de/ResponseFields.md`
  - `packages/app/concepts/de/SubAgent-Search.md` → 本地候选：`concepts/de/SubAgent-Search.md`
  - `packages/app/concepts/de/Teammate.md` → 本地候选：`concepts/de/Teammate.md`
  - `packages/app/concepts/de/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/de/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/de/ToolsFirst.md` → 本地候选：`concepts/de/ToolsFirst.md`
  - `packages/app/concepts/de/TranslateContextPollution.md` → 本地候选：`concepts/de/TranslateContextPollution.md`
  - `packages/app/concepts/de/UltraPlan.md` → 本地候选：`concepts/de/UltraPlan.md`
  - `packages/app/concepts/en/BodyDiffJSON.md` → 本地候选：`concepts/en/BodyDiffJSON.md`
  - `packages/app/concepts/en/BodyFields.md` → 本地候选：`concepts/en/BodyFields.md`
  - `packages/app/concepts/en/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/en/CustomUltraplanExpert.md` → 本地候选：`concepts/en/CustomUltraplanExpert.md`
  - `packages/app/concepts/en/GlobalSettings.md` → 本地候选：`concepts/en/GlobalSettings.md`
  - `packages/app/concepts/en/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/en/MainAgent.md` → 本地候选：`concepts/en/MainAgent.md`
  - `packages/app/concepts/en/ProxySwitch.md` → 本地候选：`concepts/en/ProxySwitch.md`
  - `packages/app/concepts/en/QRCode.md` → 本地候选：`concepts/en/QRCode.md`
  - `packages/app/concepts/en/ResponseFields.md` → 本地候选：`concepts/en/ResponseFields.md`
  - `packages/app/concepts/en/SubAgent-Search.md` → 本地候选：`concepts/en/SubAgent-Search.md`
  - `packages/app/concepts/en/Teammate.md` → 本地候选：`concepts/en/Teammate.md`
  - `packages/app/concepts/en/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/en/Tools.md` → 本地候选：`concepts/en/Tools.md`
  - `packages/app/concepts/en/ToolsFirst.md` → 本地候选：`concepts/en/ToolsFirst.md`
  - `packages/app/concepts/en/TranslateContextPollution.md` → 本地候选：`concepts/en/TranslateContextPollution.md`
  - `packages/app/concepts/en/UltraPlan.md` → 本地候选：`concepts/en/UltraPlan.md`
  - `packages/app/concepts/es/BodyDiffJSON.md` → 本地候选：`concepts/es/BodyDiffJSON.md`
  - `packages/app/concepts/es/BodyFields.md` → 本地候选：`concepts/es/BodyFields.md`
  - `packages/app/concepts/es/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/es/CustomUltraplanExpert.md` → 本地候选：`concepts/es/CustomUltraplanExpert.md`
  - `packages/app/concepts/es/GlobalSettings.md` → 本地候选：`concepts/es/GlobalSettings.md`
  - `packages/app/concepts/es/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/es/MainAgent.md` → 本地候选：`concepts/es/MainAgent.md`
  - `packages/app/concepts/es/ProxySwitch.md` → 本地候选：`concepts/es/ProxySwitch.md`
  - `packages/app/concepts/es/QRCode.md` → 本地候选：`concepts/es/QRCode.md`
  - `packages/app/concepts/es/ResponseFields.md` → 本地候选：`concepts/es/ResponseFields.md`
  - `packages/app/concepts/es/SubAgent-Search.md` → 本地候选：`concepts/es/SubAgent-Search.md`
  - `packages/app/concepts/es/Teammate.md` → 本地候选：`concepts/es/Teammate.md`
  - `packages/app/concepts/es/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/es/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/es/ToolsFirst.md` → 本地候选：`concepts/es/ToolsFirst.md`
  - `packages/app/concepts/es/TranslateContextPollution.md` → 本地候选：`concepts/es/TranslateContextPollution.md`
  - `packages/app/concepts/es/UltraPlan.md` → 本地候选：`concepts/es/UltraPlan.md`
  - `packages/app/concepts/fr/BodyDiffJSON.md` → 本地候选：`concepts/fr/BodyDiffJSON.md`
  - `packages/app/concepts/fr/BodyFields.md` → 本地候选：`concepts/fr/BodyFields.md`
  - `packages/app/concepts/fr/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/fr/CustomUltraplanExpert.md` → 本地候选：`concepts/fr/CustomUltraplanExpert.md`
  - `packages/app/concepts/fr/GlobalSettings.md` → 本地候选：`concepts/fr/GlobalSettings.md`
  - `packages/app/concepts/fr/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/fr/MainAgent.md` → 本地候选：`concepts/fr/MainAgent.md`
  - `packages/app/concepts/fr/ProxySwitch.md` → 本地候选：`concepts/fr/ProxySwitch.md`
  - `packages/app/concepts/fr/QRCode.md` → 本地候选：`concepts/fr/QRCode.md`
  - `packages/app/concepts/fr/ResponseFields.md` → 本地候选：`concepts/fr/ResponseFields.md`
  - `packages/app/concepts/fr/SubAgent-Search.md` → 本地候选：`concepts/fr/SubAgent-Search.md`
  - `packages/app/concepts/fr/Teammate.md` → 本地候选：`concepts/fr/Teammate.md`
  - `packages/app/concepts/fr/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/fr/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/fr/ToolsFirst.md` → 本地候选：`concepts/fr/ToolsFirst.md`
  - `packages/app/concepts/fr/TranslateContextPollution.md` → 本地候选：`concepts/fr/TranslateContextPollution.md`
  - `packages/app/concepts/fr/UltraPlan.md` → 本地候选：`concepts/fr/UltraPlan.md`
  - `packages/app/concepts/it/BodyDiffJSON.md` → 本地候选：`concepts/it/BodyDiffJSON.md`
  - `packages/app/concepts/it/BodyFields.md` → 本地候选：`concepts/it/BodyFields.md`
  - `packages/app/concepts/it/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/it/CustomUltraplanExpert.md` → 本地候选：`concepts/it/CustomUltraplanExpert.md`
  - `packages/app/concepts/it/GlobalSettings.md` → 本地候选：`concepts/it/GlobalSettings.md`
  - `packages/app/concepts/it/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/it/MainAgent.md` → 本地候选：`concepts/it/MainAgent.md`
  - `packages/app/concepts/it/ProxySwitch.md` → 本地候选：`concepts/it/ProxySwitch.md`
  - `packages/app/concepts/it/QRCode.md` → 本地候选：`concepts/it/QRCode.md`
  - `packages/app/concepts/it/ResponseFields.md` → 本地候选：`concepts/it/ResponseFields.md`
  - `packages/app/concepts/it/SubAgent-Search.md` → 本地候选：`concepts/it/SubAgent-Search.md`
  - `packages/app/concepts/it/Teammate.md` → 本地候选：`concepts/it/Teammate.md`
  - `packages/app/concepts/it/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/it/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/it/ToolsFirst.md` → 本地候选：`concepts/it/ToolsFirst.md`
  - `packages/app/concepts/it/TranslateContextPollution.md` → 本地候选：`concepts/it/TranslateContextPollution.md`
  - `packages/app/concepts/it/UltraPlan.md` → 本地候选：`concepts/it/UltraPlan.md`
  - `packages/app/concepts/ja/BodyDiffJSON.md` → 本地候选：`concepts/ja/BodyDiffJSON.md`
  - `packages/app/concepts/ja/BodyFields.md` → 本地候选：`concepts/ja/BodyFields.md`
  - `packages/app/concepts/ja/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/ja/CustomUltraplanExpert.md` → 本地候选：`concepts/ja/CustomUltraplanExpert.md`
  - `packages/app/concepts/ja/GlobalSettings.md` → 本地候选：`concepts/ja/GlobalSettings.md`
  - `packages/app/concepts/ja/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/ja/MainAgent.md` → 本地候选：`concepts/ja/MainAgent.md`
  - `packages/app/concepts/ja/ProxySwitch.md` → 本地候选：`concepts/ja/ProxySwitch.md`
  - `packages/app/concepts/ja/QRCode.md` → 本地候选：`concepts/ja/QRCode.md`
  - `packages/app/concepts/ja/ResponseFields.md` → 本地候选：`concepts/ja/ResponseFields.md`
  - `packages/app/concepts/ja/SubAgent-Search.md` → 本地候选：`concepts/ja/SubAgent-Search.md`
  - `packages/app/concepts/ja/Teammate.md` → 本地候选：`concepts/ja/Teammate.md`
  - `packages/app/concepts/ja/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/ja/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/ja/ToolsFirst.md` → 本地候选：`concepts/ja/ToolsFirst.md`
  - `packages/app/concepts/ja/TranslateContextPollution.md` → 本地候选：`concepts/ja/TranslateContextPollution.md`
  - `packages/app/concepts/ja/UltraPlan.md` → 本地候选：`concepts/ja/UltraPlan.md`
  - `packages/app/concepts/ko/BodyDiffJSON.md` → 本地候选：`concepts/ko/BodyDiffJSON.md`
  - `packages/app/concepts/ko/BodyFields.md` → 本地候选：`concepts/ko/BodyFields.md`
  - `packages/app/concepts/ko/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/ko/CustomUltraplanExpert.md` → 本地候选：`concepts/ko/CustomUltraplanExpert.md`
  - `packages/app/concepts/ko/GlobalSettings.md` → 本地候选：`concepts/ko/GlobalSettings.md`
  - `packages/app/concepts/ko/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/ko/MainAgent.md` → 本地候选：`concepts/ko/MainAgent.md`
  - `packages/app/concepts/ko/ProxySwitch.md` → 本地候选：`concepts/ko/ProxySwitch.md`
  - `packages/app/concepts/ko/QRCode.md` → 本地候选：`concepts/ko/QRCode.md`
  - `packages/app/concepts/ko/ResponseFields.md` → 本地候选：`concepts/ko/ResponseFields.md`
  - `packages/app/concepts/ko/SubAgent-Search.md` → 本地候选：`concepts/ko/SubAgent-Search.md`
  - `packages/app/concepts/ko/Teammate.md` → 本地候选：`concepts/ko/Teammate.md`
  - `packages/app/concepts/ko/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/ko/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/ko/ToolsFirst.md` → 本地候选：`concepts/ko/ToolsFirst.md`
  - `packages/app/concepts/ko/TranslateContextPollution.md` → 本地候选：`concepts/ko/TranslateContextPollution.md`
  - `packages/app/concepts/ko/UltraPlan.md` → 本地候选：`concepts/ko/UltraPlan.md`
  - `packages/app/concepts/no/BodyDiffJSON.md` → 本地候选：`concepts/no/BodyDiffJSON.md`
  - `packages/app/concepts/no/BodyFields.md` → 本地候选：`concepts/no/BodyFields.md`
  - `packages/app/concepts/no/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/no/CustomUltraplanExpert.md` → 本地候选：`concepts/no/CustomUltraplanExpert.md`
  - `packages/app/concepts/no/GlobalSettings.md` → 本地候选：`concepts/no/GlobalSettings.md`
  - `packages/app/concepts/no/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/no/MainAgent.md` → 本地候选：`concepts/no/MainAgent.md`
  - `packages/app/concepts/no/ProxySwitch.md` → 本地候选：`concepts/no/ProxySwitch.md`
  - `packages/app/concepts/no/QRCode.md` → 本地候选：`concepts/no/QRCode.md`
  - `packages/app/concepts/no/ResponseFields.md` → 本地候选：`concepts/no/ResponseFields.md`
  - `packages/app/concepts/no/SubAgent-Search.md` → 本地候选：`concepts/no/SubAgent-Search.md`
  - `packages/app/concepts/no/Teammate.md` → 本地候选：`concepts/no/Teammate.md`
  - `packages/app/concepts/no/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/no/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/no/ToolsFirst.md` → 本地候选：`concepts/no/ToolsFirst.md`
  - `packages/app/concepts/no/TranslateContextPollution.md` → 本地候选：`concepts/no/TranslateContextPollution.md`
  - `packages/app/concepts/no/UltraPlan.md` → 本地候选：`concepts/no/UltraPlan.md`
  - `packages/app/concepts/pl/BodyDiffJSON.md` → 本地候选：`concepts/pl/BodyDiffJSON.md`
  - `packages/app/concepts/pl/BodyFields.md` → 本地候选：`concepts/pl/BodyFields.md`
  - `packages/app/concepts/pl/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/pl/CustomUltraplanExpert.md` → 本地候选：`concepts/pl/CustomUltraplanExpert.md`
  - `packages/app/concepts/pl/GlobalSettings.md` → 本地候选：`concepts/pl/GlobalSettings.md`
  - `packages/app/concepts/pl/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/pl/MainAgent.md` → 本地候选：`concepts/pl/MainAgent.md`
  - `packages/app/concepts/pl/ProxySwitch.md` → 本地候选：`concepts/pl/ProxySwitch.md`
  - `packages/app/concepts/pl/QRCode.md` → 本地候选：`concepts/pl/QRCode.md`
  - `packages/app/concepts/pl/ResponseFields.md` → 本地候选：`concepts/pl/ResponseFields.md`
  - `packages/app/concepts/pl/SubAgent-Search.md` → 本地候选：`concepts/pl/SubAgent-Search.md`
  - `packages/app/concepts/pl/Teammate.md` → 本地候选：`concepts/pl/Teammate.md`
  - `packages/app/concepts/pl/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/pl/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/pl/ToolsFirst.md` → 本地候选：`concepts/pl/ToolsFirst.md`
  - `packages/app/concepts/pl/TranslateContextPollution.md` → 本地候选：`concepts/pl/TranslateContextPollution.md`
  - `packages/app/concepts/pl/UltraPlan.md` → 本地候选：`concepts/pl/UltraPlan.md`
  - `packages/app/concepts/pt-BR/BodyDiffJSON.md` → 本地候选：`concepts/pt-BR/BodyDiffJSON.md`
  - `packages/app/concepts/pt-BR/BodyFields.md` → 本地候选：`concepts/pt-BR/BodyFields.md`
  - `packages/app/concepts/pt-BR/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/CustomUltraplanExpert.md` → 本地候选：`concepts/pt-BR/CustomUltraplanExpert.md`
  - `packages/app/concepts/pt-BR/GlobalSettings.md` → 本地候选：`concepts/pt-BR/GlobalSettings.md`
  - `packages/app/concepts/pt-BR/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/MainAgent.md` → 本地候选：`concepts/pt-BR/MainAgent.md`
  - `packages/app/concepts/pt-BR/ProxySwitch.md` → 本地候选：`concepts/pt-BR/ProxySwitch.md`
  - `packages/app/concepts/pt-BR/QRCode.md` → 本地候选：`concepts/pt-BR/QRCode.md`
  - `packages/app/concepts/pt-BR/ResponseFields.md` → 本地候选：`concepts/pt-BR/ResponseFields.md`
  - `packages/app/concepts/pt-BR/SubAgent-Search.md` → 本地候选：`concepts/pt-BR/SubAgent-Search.md`
  - `packages/app/concepts/pt-BR/Teammate.md` → 本地候选：`concepts/pt-BR/Teammate.md`
  - `packages/app/concepts/pt-BR/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/pt-BR/ToolsFirst.md` → 本地候选：`concepts/pt-BR/ToolsFirst.md`
  - `packages/app/concepts/pt-BR/TranslateContextPollution.md` → 本地候选：`concepts/pt-BR/TranslateContextPollution.md`
  - `packages/app/concepts/pt-BR/UltraPlan.md` → 本地候选：`concepts/pt-BR/UltraPlan.md`
  - `packages/app/concepts/ru/BodyDiffJSON.md` → 本地候选：`concepts/ru/BodyDiffJSON.md`
  - `packages/app/concepts/ru/BodyFields.md` → 本地候选：`concepts/ru/BodyFields.md`
  - `packages/app/concepts/ru/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/ru/CustomUltraplanExpert.md` → 本地候选：`concepts/ru/CustomUltraplanExpert.md`
  - `packages/app/concepts/ru/GlobalSettings.md` → 本地候选：`concepts/ru/GlobalSettings.md`
  - `packages/app/concepts/ru/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/ru/MainAgent.md` → 本地候选：`concepts/ru/MainAgent.md`
  - `packages/app/concepts/ru/ProxySwitch.md` → 本地候选：`concepts/ru/ProxySwitch.md`
  - `packages/app/concepts/ru/QRCode.md` → 本地候选：`concepts/ru/QRCode.md`
  - `packages/app/concepts/ru/ResponseFields.md` → 本地候选：`concepts/ru/ResponseFields.md`
  - `packages/app/concepts/ru/SubAgent-Search.md` → 本地候选：`concepts/ru/SubAgent-Search.md`
  - `packages/app/concepts/ru/Teammate.md` → 本地候选：`concepts/ru/Teammate.md`
  - `packages/app/concepts/ru/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/ru/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/ru/ToolsFirst.md` → 本地候选：`concepts/ru/ToolsFirst.md`
  - `packages/app/concepts/ru/TranslateContextPollution.md` → 本地候选：`concepts/ru/TranslateContextPollution.md`
  - `packages/app/concepts/ru/UltraPlan.md` → 本地候选：`concepts/ru/UltraPlan.md`
  - `packages/app/concepts/th/BodyDiffJSON.md` → 本地候选：`concepts/th/BodyDiffJSON.md`
  - `packages/app/concepts/th/BodyFields.md` → 本地候选：`concepts/th/BodyFields.md`
  - `packages/app/concepts/th/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/th/CustomUltraplanExpert.md` → 本地候选：`concepts/th/CustomUltraplanExpert.md`
  - `packages/app/concepts/th/GlobalSettings.md` → 本地候选：`concepts/th/GlobalSettings.md`
  - `packages/app/concepts/th/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/th/MainAgent.md` → 本地候选：`concepts/th/MainAgent.md`
  - `packages/app/concepts/th/ProxySwitch.md` → 本地候选：`concepts/th/ProxySwitch.md`
  - `packages/app/concepts/th/QRCode.md` → 本地候选：`concepts/th/QRCode.md`
  - `packages/app/concepts/th/ResponseFields.md` → 本地候选：`concepts/th/ResponseFields.md`
  - `packages/app/concepts/th/SubAgent-Search.md` → 本地候选：`concepts/th/SubAgent-Search.md`
  - `packages/app/concepts/th/Teammate.md` → 本地候选：`concepts/th/Teammate.md`
  - `packages/app/concepts/th/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/th/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/th/ToolsFirst.md` → 本地候选：`concepts/th/ToolsFirst.md`
  - `packages/app/concepts/th/TranslateContextPollution.md` → 本地候选：`concepts/th/TranslateContextPollution.md`
  - `packages/app/concepts/th/UltraPlan.md` → 本地候选：`concepts/th/UltraPlan.md`
  - `packages/app/concepts/tr/BodyDiffJSON.md` → 本地候选：`concepts/tr/BodyDiffJSON.md`
  - `packages/app/concepts/tr/BodyFields.md` → 本地候选：`concepts/tr/BodyFields.md`
  - `packages/app/concepts/tr/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/tr/CustomUltraplanExpert.md` → 本地候选：`concepts/tr/CustomUltraplanExpert.md`
  - `packages/app/concepts/tr/GlobalSettings.md` → 本地候选：`concepts/tr/GlobalSettings.md`
  - `packages/app/concepts/tr/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/tr/MainAgent.md` → 本地候选：`concepts/tr/MainAgent.md`
  - `packages/app/concepts/tr/ProxySwitch.md` → 本地候选：`concepts/tr/ProxySwitch.md`
  - `packages/app/concepts/tr/QRCode.md` → 本地候选：`concepts/tr/QRCode.md`
  - `packages/app/concepts/tr/ResponseFields.md` → 本地候选：`concepts/tr/ResponseFields.md`
  - `packages/app/concepts/tr/SubAgent-Search.md` → 本地候选：`concepts/tr/SubAgent-Search.md`
  - `packages/app/concepts/tr/Teammate.md` → 本地候选：`concepts/tr/Teammate.md`
  - `packages/app/concepts/tr/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/tr/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/tr/ToolsFirst.md` → 本地候选：`concepts/tr/ToolsFirst.md`
  - `packages/app/concepts/tr/TranslateContextPollution.md` → 本地候选：`concepts/tr/TranslateContextPollution.md`
  - `packages/app/concepts/tr/UltraPlan.md` → 本地候选：`concepts/tr/UltraPlan.md`
  - `packages/app/concepts/uk/BodyDiffJSON.md` → 本地候选：`concepts/uk/BodyDiffJSON.md`
  - `packages/app/concepts/uk/BodyFields.md` → 本地候选：`concepts/uk/BodyFields.md`
  - `packages/app/concepts/uk/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/uk/CustomUltraplanExpert.md` → 本地候选：`concepts/uk/CustomUltraplanExpert.md`
  - `packages/app/concepts/uk/GlobalSettings.md` → 本地候选：`concepts/uk/GlobalSettings.md`
  - `packages/app/concepts/uk/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/uk/MainAgent.md` → 本地候选：`concepts/uk/MainAgent.md`
  - `packages/app/concepts/uk/ProxySwitch.md` → 本地候选：`concepts/uk/ProxySwitch.md`
  - `packages/app/concepts/uk/QRCode.md` → 本地候选：`concepts/uk/QRCode.md`
  - `packages/app/concepts/uk/ResponseFields.md` → 本地候选：`concepts/uk/ResponseFields.md`
  - `packages/app/concepts/uk/SubAgent-Search.md` → 本地候选：`concepts/uk/SubAgent-Search.md`
  - `packages/app/concepts/uk/Teammate.md` → 本地候选：`concepts/uk/Teammate.md`
  - `packages/app/concepts/uk/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/uk/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/uk/ToolsFirst.md` → 本地候选：`concepts/uk/ToolsFirst.md`
  - `packages/app/concepts/uk/TranslateContextPollution.md` → 本地候选：`concepts/uk/TranslateContextPollution.md`
  - `packages/app/concepts/uk/UltraPlan.md` → 本地候选：`concepts/uk/UltraPlan.md`
  - `packages/app/concepts/zh-TW/BodyDiffJSON.md` → 本地候选：`concepts/zh-TW/BodyDiffJSON.md`
  - `packages/app/concepts/zh-TW/BodyFields.md` → 本地候选：`concepts/zh-TW/BodyFields.md`
  - `packages/app/concepts/zh-TW/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/CustomUltraplanExpert.md` → 本地候选：`concepts/zh-TW/CustomUltraplanExpert.md`
  - `packages/app/concepts/zh-TW/GlobalSettings.md` → 本地候选：`concepts/zh-TW/GlobalSettings.md`
  - `packages/app/concepts/zh-TW/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/MainAgent.md` → 本地候选：`concepts/zh-TW/MainAgent.md`
  - `packages/app/concepts/zh-TW/ProxySwitch.md` → 本地候选：`concepts/zh-TW/ProxySwitch.md`
  - `packages/app/concepts/zh-TW/QRCode.md` → 本地候选：`concepts/zh-TW/QRCode.md`
  - `packages/app/concepts/zh-TW/ResponseFields.md` → 本地候选：`concepts/zh-TW/ResponseFields.md`
  - `packages/app/concepts/zh-TW/SubAgent-Search.md` → 本地候选：`concepts/zh-TW/SubAgent-Search.md`
  - `packages/app/concepts/zh-TW/Teammate.md` → 本地候选：`concepts/zh-TW/Teammate.md`
  - `packages/app/concepts/zh-TW/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/Tools.md` → 无直接路径匹配
  - `packages/app/concepts/zh-TW/ToolsFirst.md` → 本地候选：`concepts/zh-TW/ToolsFirst.md`
  - `packages/app/concepts/zh-TW/TranslateContextPollution.md` → 本地候选：`concepts/zh-TW/TranslateContextPollution.md`
  - `packages/app/concepts/zh-TW/UltraPlan.md` → 本地候选：`concepts/zh-TW/UltraPlan.md`
  - `packages/app/concepts/zh/BodyDiffJSON.md` → 本地候选：`concepts/zh/BodyDiffJSON.md`
  - `packages/app/concepts/zh/BodyFields.md` → 本地候选：`concepts/zh/BodyFields.md`
  - `packages/app/concepts/zh/CacheRebuild.md` → 无直接路径匹配
  - `packages/app/concepts/zh/CustomUltraplanExpert.md` → 本地候选：`concepts/zh/CustomUltraplanExpert.md`
  - `packages/app/concepts/zh/GlobalSettings.md` → 本地候选：`concepts/zh/GlobalSettings.md`
  - `packages/app/concepts/zh/KVCacheContent.md` → 无直接路径匹配
  - `packages/app/concepts/zh/MainAgent.md` → 本地候选：`concepts/zh/MainAgent.md`
  - `packages/app/concepts/zh/ProxySwitch.md` → 本地候选：`concepts/zh/ProxySwitch.md`
  - `packages/app/concepts/zh/QRCode.md` → 本地候选：`concepts/zh/QRCode.md`
  - `packages/app/concepts/zh/ResponseFields.md` → 本地候选：`concepts/zh/ResponseFields.md`
  - `packages/app/concepts/zh/SubAgent-Search.md` → 本地候选：`concepts/zh/SubAgent-Search.md`
  - `packages/app/concepts/zh/Teammate.md` → 本地候选：`concepts/zh/Teammate.md`
  - `packages/app/concepts/zh/Tool-Agent.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Artifact.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-AskUserQuestion.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Bash.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-CronCreate.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-CronDelete.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-CronList.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-DesignSync.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Edit.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-EndConversation.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-EnterPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-EnterWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ExitPlanMode.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ExitWorktree.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Glob.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Grep.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-LSP.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ListAgents.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ListConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ListMcpResources.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ListPlugins.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ListSkills.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Monitor.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-NotebookEdit.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Projects.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ProposeGoal.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-PushNotification.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-REPL.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Read.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ReadNotifications.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ReportFindings.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SendFeedback.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SendFile.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SendMessage.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SendUserFile.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SendUserMessage.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Skill.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-SuggestSkills.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-TaskCreate.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-TaskGet.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-TaskList.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-TaskOutput.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-TaskStop.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-TaskUpdate.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-TodoWrite.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-ToolSearch.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-WebFetch.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-WebSearch.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Workflow.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tool-Write.md` → 无直接路径匹配
  - `packages/app/concepts/zh/Tools.md` → 本地候选：`concepts/zh/Tools.md`
  - `packages/app/concepts/zh/ToolsFirst.md` → 本地候选：`concepts/zh/ToolsFirst.md`
  - `packages/app/concepts/zh/TranslateContextPollution.md` → 本地候选：`concepts/zh/TranslateContextPollution.md`
  - `packages/app/concepts/zh/UltraPlan.md` → 本地候选：`concepts/zh/UltraPlan.md`
  - `packages/app/concepts/zh/ultraplan-origin.md` → 无直接路径匹配
  - `packages/app/findcc.js` → 无直接路径匹配
  - `packages/app/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/package.json` → 本地候选：`package.json`
  - `packages/app/plugins/.gitkeep` → 本地候选：`plugins/.gitkeep`
  - `packages/app/plugins/README.md` → 本地候选：`plugins/README.md`
  - `packages/app/scripts/assemble-dist.mjs` → 无直接路径匹配
  - `packages/app/server.js` → 本地候选：`server.js`
  - `packages/app/server/_paths.js` → 无直接路径匹配
  - `packages/app/server/i18n.js` → 无直接路径匹配
  - `packages/app/server/imPreset/ar.md` → 无直接路径匹配
  - `packages/app/server/imPreset/da.md` → 无直接路径匹配
  - `packages/app/server/imPreset/de.md` → 无直接路径匹配
  - `packages/app/server/imPreset/en.md` → 无直接路径匹配
  - `packages/app/server/imPreset/es.md` → 无直接路径匹配
  - `packages/app/server/imPreset/fr.md` → 无直接路径匹配
  - `packages/app/server/imPreset/it.md` → 无直接路径匹配
  - `packages/app/server/imPreset/ja.md` → 无直接路径匹配
  - `packages/app/server/imPreset/ko.md` → 无直接路径匹配
  - `packages/app/server/imPreset/no.md` → 无直接路径匹配
  - `packages/app/server/imPreset/pl.md` → 无直接路径匹配
  - `packages/app/server/imPreset/pt-BR.md` → 无直接路径匹配
  - `packages/app/server/imPreset/ru.md` → 无直接路径匹配
  - `packages/app/server/imPreset/th.md` → 无直接路径匹配
  - `packages/app/server/imPreset/tr.md` → 无直接路径匹配
  - `packages/app/server/imPreset/uk.md` → 无直接路径匹配
  - `packages/app/server/imPreset/zh-TW.md` → 无直接路径匹配
  - `packages/app/server/imPreset/zh.md` → 无直接路径匹配
  - `packages/app/server/imSkills/ar/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/da/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/de/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/en/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/es/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/fr/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/it/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/ja/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/ko/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/no/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/pl/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/pt-BR/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/ru/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/scripts/ccv-projects.mjs` → 无直接路径匹配
  - `packages/app/server/imSkills/th/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/tr/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/uk/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/zh-TW/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/imSkills/zh/manage-ccv-projects/SKILL.md` → 无直接路径匹配
  - `packages/app/server/interceptor.js` → 本地候选：`interceptor.js`
  - `packages/app/server/lib/adapters/dingtalk-adapter.js` → 本地候选：`lib/adapters/dingtalk-adapter.js`
  - `packages/app/server/lib/adapters/discord-adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/adapters/feishu-adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/adapters/wecom-adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/ansi-safe-slice.js` → 无直接路径匹配
  - `packages/app/server/lib/approval-modal-prefs.js` → 本地候选：`server/lib/approval-modal-prefs.js`
  - `packages/app/server/lib/ask-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/ask-constants.js` → 无直接路径匹配
  - `packages/app/server/lib/ask-reaper.js` → 无直接路径匹配
  - `packages/app/server/lib/ask-store.js` → 无直接路径匹配
  - `packages/app/server/lib/async-file-lock.js` → 无直接路径匹配
  - `packages/app/server/lib/async-write-queue.js` → 无直接路径匹配
  - `packages/app/server/lib/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/lib/base-path.js` → 无直接路径匹配
  - `packages/app/server/lib/ccswitch-import.js` → 无直接路径匹配
  - `packages/app/server/lib/ccv-editor.js` → 无直接路径匹配
  - `packages/app/server/lib/claude-md-discovery.js` → 无直接路径匹配
  - `packages/app/server/lib/cli-inject.js` → 无直接路径匹配
  - `packages/app/server/lib/code-replace.js` → 本地候选：`lib/code-replace.js`
  - `packages/app/server/lib/code-search.js` → 本地候选：`lib/code-search.js`
  - `packages/app/server/lib/codefuse-managed-mode.js` → 无直接路径匹配
  - `packages/app/server/lib/config-backup.js` → 无直接路径匹配
  - `packages/app/server/lib/context-rules.js` → 本地候选：`server/lib/context-rules.js`
  - `packages/app/server/lib/context-watcher.js` → 本地候选：`lib/context-watcher.js`
  - `packages/app/server/lib/create_system_prompt.js` → 无直接路径匹配
  - `packages/app/server/lib/delta-reconstructor.js` → 本地候选：`server/lib/delta-reconstructor.js`
  - `packages/app/server/lib/dingtalk-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/dingtalk-config.js` → 无直接路径匹配
  - `packages/app/server/lib/enrich-plan-input.js` → 无直接路径匹配
  - `packages/app/server/lib/enrich-workflow.js` → 无直接路径匹配
  - `packages/app/server/lib/ensure-hooks.js` → 本地候选：`lib/ensure-hooks.js`
  - `packages/app/server/lib/error-report.js` → 无直接路径匹配
  - `packages/app/server/lib/extract-plugin-name.mjs` → 本地候选：`lib/extract-plugin-name.mjs`
  - `packages/app/server/lib/file-access-policy.js` → 无直接路径匹配
  - `packages/app/server/lib/file-api.js` → 本地候选：`lib/file-api.js`
  - `packages/app/server/lib/git-diff.js` → 本地候选：`lib/git-diff.js`
  - `packages/app/server/lib/im-append-system.js` → 无直接路径匹配
  - `packages/app/server/lib/im-bridge-core.js` → 无直接路径匹配
  - `packages/app/server/lib/im-config.js` → 无直接路径匹配
  - `packages/app/server/lib/im-deny.js` → 无直接路径匹配
  - `packages/app/server/lib/im-lang.js` → 无直接路径匹配
  - `packages/app/server/lib/im-lock.js` → 无直接路径匹配
  - `packages/app/server/lib/im-log-watcher.js` → 无直接路径匹配
  - `packages/app/server/lib/im-process-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/im-senders.js` → 无直接路径匹配
  - `packages/app/server/lib/im-skills.js` → 无直接路径匹配
  - `packages/app/server/lib/interceptor-core.js` → 本地候选：`lib/interceptor-core.js`
  - `packages/app/server/lib/kv-cache-analyzer.js` → 无直接路径匹配
  - `packages/app/server/lib/log-management.js` → 本地候选：`lib/log-management.js`
  - `packages/app/server/lib/log-stream.js` → 无直接路径匹配
  - `packages/app/server/lib/log-watcher.js` → 无直接路径匹配
  - `packages/app/server/lib/log-zip.js` → 无直接路径匹配
  - `packages/app/server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `packages/app/server/lib/perm-bridge.js` → 本地候选：`lib/perm-bridge.js`
  - `packages/app/server/lib/pid-alive.js` → 无直接路径匹配
  - `packages/app/server/lib/plugin-loader.js` → 本地候选：`lib/plugin-loader.js`
  - `packages/app/server/lib/plugin-manager.js` → 本地候选：`lib/plugin-manager.js`
  - `packages/app/server/lib/prefs-store.js` → 无直接路径匹配
  - `packages/app/server/lib/project-prefs.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy-env.js` → 本地候选：`lib/proxy-env.js`
  - `packages/app/server/lib/proxy-errors.js` → 本地候选：`lib/proxy-errors.js`
  - `packages/app/server/lib/proxy-retry.js` → 无直接路径匹配
  - `packages/app/server/lib/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/lib/pty-flood-coalescer.js` → 无直接路径匹配
  - `packages/app/server/lib/resync-nudge-gate.js` → 无直接路径匹配
  - `packages/app/server/lib/sdk-adapter.js` → 本地候选：`lib/sdk-adapter.js`
  - `packages/app/server/lib/sdk-manager.js` → 本地候选：`lib/sdk-manager.js`
  - `packages/app/server/lib/session-boundary.js` → 无直接路径匹配
  - `packages/app/server/lib/session-pin-store.js` → 无直接路径匹配
  - `packages/app/server/lib/session-start-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/session-transcript-reader.js` → 无直接路径匹配
  - `packages/app/server/lib/settings-merge.js` → 无直接路径匹配
  - `packages/app/server/lib/skills-api.js` → 本地候选：`lib/skills-api.js`
  - `packages/app/server/lib/spawn-model-resolver.js` → 无直接路径匹配
  - `packages/app/server/lib/sse-backpressure.js` → 无直接路径匹配
  - `packages/app/server/lib/stats-worker.js` → 本地候选：`lib/stats-worker.js`
  - `packages/app/server/lib/system-prompt-files.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-presets.js` → 无直接路径匹配
  - `packages/app/server/lib/system-prompt-render.js` → 无直接路径匹配
  - `packages/app/server/lib/team-runtime.js` → 无直接路径匹配
  - `packages/app/server/lib/term-signals.js` → 无直接路径匹配
  - `packages/app/server/lib/terminal-env.js` → 无直接路径匹配
  - `packages/app/server/lib/tools-xml-formatter.js` → 本地候选：`server/lib/tools-xml-formatter.js`
  - `packages/app/server/lib/turn-end-bridge.js` → 无直接路径匹配
  - `packages/app/server/lib/ultra-agents-api.js` → 本地候选：`server/lib/ultra-agents-api.js`
  - `packages/app/server/lib/updater.js` → 本地候选：`lib/updater.js`
  - `packages/app/server/lib/user-profile.js` → 本地候选：`lib/user-profile.js`
  - `packages/app/server/lib/user-prompt-extract.js` → 无直接路径匹配
  - `packages/app/server/lib/v2-transcript-normalizer.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/adapter.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/agent-id.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/blob-store.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/conversation-store.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/convert-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/convert-worker.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/convert.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/identity.js` → 本地候选：`lib/log-v2/identity.js`
  - `packages/app/server/lib/v2/journal.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/jsonl-read.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/layout.js` → 本地候选：`lib/log-v2/layout.js`
  - `packages/app/server/lib/v2/live-feed.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/migrate-prompt.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/replay.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-list.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-owner.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/session-select.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/singleflight.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `packages/app/server/lib/v2/verify.js` → 无直接路径匹配
  - `packages/app/server/lib/voice-pack-events.js` → 本地候选：`server/lib/voice-pack-events.js`
  - `packages/app/server/lib/voice-pack-manager.js` → 无直接路径匹配
  - `packages/app/server/lib/wire-compress.js` → 无直接路径匹配
  - `packages/app/server/lib/workflow-journal.js` → 无直接路径匹配
  - `packages/app/server/lib/workflow-live.js` → 无直接路径匹配
  - `packages/app/server/lib/workflow-watcher.js` → 无直接路径匹配
  - `packages/app/server/lib/ws-backpressure.js` → 无直接路径匹配
  - `packages/app/server/proxy.js` → 本地候选：`proxy.js`
  - `packages/app/server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `packages/app/server/routes/_dispatch.js` → 无直接路径匹配
  - `packages/app/server/routes/ask-perm.js` → 无直接路径匹配
  - `packages/app/server/routes/auth.js` → 本地候选：`lib/auth.js`
  - `packages/app/server/routes/dingtalk.js` → 无直接路径匹配
  - `packages/app/server/routes/events.js` → 无直接路径匹配
  - `packages/app/server/routes/expert.js` → 无直接路径匹配
  - `packages/app/server/routes/files-content.js` → 无直接路径匹配
  - `packages/app/server/routes/files-fs.js` → 无直接路径匹配
  - `packages/app/server/routes/git.js` → 无直接路径匹配
  - `packages/app/server/routes/im.js` → 无直接路径匹配
  - `packages/app/server/routes/logs.js` → 无直接路径匹配
  - `packages/app/server/routes/misc.js` → 无直接路径匹配
  - `packages/app/server/routes/plugins.js` → 无直接路径匹配
  - `packages/app/server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `packages/app/server/routes/project-meta.js` → 无直接路径匹配
  - `packages/app/server/routes/project-prefs.js` → 无直接路径匹配
  - `packages/app/server/routes/proxy-stats.js` → 无直接路径匹配
  - `packages/app/server/routes/search.js` → 无直接路径匹配
  - `packages/app/server/routes/session-pin.js` → 无直接路径匹配
  - `packages/app/server/routes/skills.js` → 无直接路径匹配
  - `packages/app/server/routes/team.js` → 无直接路径匹配
  - `packages/app/server/routes/ultra-agents.js` → 无直接路径匹配
  - `packages/app/server/routes/v2.js` → 无直接路径匹配
  - `packages/app/server/routes/voice-pack.js` → 无直接路径匹配
  - `packages/app/server/routes/workflow-journal.js` → 无直接路径匹配
  - `packages/app/server/routes/workspaces.js` → 无直接路径匹配
  - `packages/app/server/scratch-pty-manager.js` → 本地候选：`scratch-pty-manager.js`
  - `packages/app/server/server.js` → 本地候选：`server.js`
  - `packages/app/server/system-prompt-templates/presets/GLM-5.2.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/Qwen-3.7-Max.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-flash.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/deepseek-v4-pro.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/index.json` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k2.7-code.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/reference/claude-code-cli-startup-options.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/reference/prompt-control-tokens-deepseek-v4.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/reference/prompt-control-tokens-qwen3.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/reference/prompt-xml-tags-fable-5.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/reference/prompt-xml-tags-opus-4-8.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptModel.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ar.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.da.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.de.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.es.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.fr.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.it.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ja.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ko.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.no.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.pl.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.pt-BR.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.ru.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.th.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.tr.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.uk.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.zh-TW.md` → 无直接路径匹配
  - `packages/app/server/system-prompt-templates/systemPromptVariables.zh.md` → 无直接路径匹配
  - `packages/app/server/workspace-registry.js` → 本地候选：`workspace-registry.js`
  - `packages/app/src/utils/clearCheckpoint.js` → 本地候选：`src/utils/clearCheckpoint.js`
  - `packages/app/src/utils/contentFilter.js` → 本地候选：`src/utils/contentFilter.js`
  - `packages/app/src/utils/requestType.js` → 本地候选：`src/utils/requestType.js`
  - `packages/app/src/utils/teammateDetector.js` → 本地候选：`src/utils/teammateDetector.js`
  - `packages/app/ultraAgents/README.md` → 本地候选：`ultraAgents/README.md`
  - `packages/app/ultraAgents/code-expert.json` → 本地候选：`ultraAgents/code-expert.json`
  - `packages/app/ultraAgents/research-expert.json` → 本地候选：`ultraAgents/research-expert.json`
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `pnpm-workspace.yaml` → 无直接路径匹配
  - `scripts/check-sign-config.sh` → 本地候选：`scripts/check-sign-config.sh`
  - `scripts/gen-default-voicepack.js` → 本地候选：`scripts/gen-default-voicepack.js`
  - `scripts/mac-sign.sh` → 本地候选：`scripts/mac-sign.sh`
  - `scripts/rename-v2-sessions-with-ts.js` → 无直接路径匹配
  - `test/agent-id.test.js` → 无直接路径匹配
  - `test/ansi-safe-slice.test.js` → 无直接路径匹配
  - `test/api-ask-perm-extra.test.js` → 无直接路径匹配
  - `test/api-auth.test.js` → 无直接路径匹配
  - `test/api-base-path.test.js` → 无直接路径匹配
  - `test/api-ccswitch-import.test.js` → 无直接路径匹配
  - `test/api-claude-md.test.js` → 无直接路径匹配
  - `test/api-dingtalk-gap.test.js` → 无直接路径匹配
  - `test/api-dingtalk.test.js` → 无直接路径匹配
  - `test/api-events-gap.test.js` → 无直接路径匹配
  - `test/api-expert-model-prompts.test.js` → 无直接路径匹配
  - `test/api-expert-system-prompt-status.test.js` → 无直接路径匹配
  - `test/api-expert-system-text.test.js` → 无直接路径匹配
  - `test/api-files-content.test.js` → 无直接路径匹配
  - `test/api-files-fs-2.test.js` → 无直接路径匹配
  - `test/api-files-fs.test.js` → 无直接路径匹配
  - `test/api-git-routes.test.js` → 无直接路径匹配
  - `test/api-im.test.js` → 无直接路径匹配
  - `test/api-logs-gap.test.js` → 无直接路径匹配
  - `test/api-plugins-gap.test.js` → 无直接路径匹配
  - `test/api-preferences-gap.test.js` → 无直接路径匹配
  - `test/api-preferences.test.js` → 无直接路径匹配
  - `test/api-project-memory.test.js` → 无直接路径匹配
  - `test/api-project-meta-gap.test.js` → 无直接路径匹配
  - `test/api-proxy-profiles.test.js` → 无直接路径匹配
  - `test/api-proxy-stats.test.js` → 无直接路径匹配
  - `test/api-retry-config.test.js` → 无直接路径匹配
  - `test/api-skills-gap.test.js` → 无直接路径匹配
  - `test/api-team-routes.test.js` → 无直接路径匹配
  - `test/api-ultra-agents-gap.test.js` → 无直接路径匹配
  - `test/api-url-gap.test.js` → 无直接路径匹配
  - `test/api-v2-requests.test.js` → 无直接路径匹配
  - `test/api-voice-pack-gap.test.js` → 无直接路径匹配
  - `test/api-workspaces.test.js` → 无直接路径匹配
  - `test/approval-modal-prefs.test.js` → 无直接路径匹配
  - `test/ask-bridge.test.js` → 无直接路径匹配
  - `test/ask-fallback.test.js` → 无直接路径匹配
  - `test/ask-flow-controller.test.js` → 本地候选：`tests/ask-flow-controller.test.js`
  - `test/ask-no-timeout-invariants.test.js` → 无直接路径匹配
  - `test/ask-portal-matcher.test.js` → 无直接路径匹配
  - `test/ask-reaper.test.js` → 无直接路径匹配
  - `test/ask-store.test.js` → 无直接路径匹配
  - `test/askOptionDesc.test.js` → 无直接路径匹配
  - `test/async-file-lock.test.js` → 无直接路径匹配
  - `test/async-write-queue.test.js` → 无直接路径匹配
  - `test/auth-lib.test.js` → 无直接路径匹配
  - `test/auto-approve-options.test.js` → 无直接路径匹配
  - `test/avatar-animation-post-pass.test.js` → 无直接路径匹配
  - `test/bar-chart-helpers.test.js` → 无直接路径匹配
  - `test/base-path-lib.test.js` → 无直接路径匹配
  - `test/branch-cli.test.js` → 无直接路径匹配
  - `test/branch-interceptor.test.js` → 无直接路径匹配
  - `test/branch-lib-adapters-dingtalk-adapter.test.js` → 无直接路径匹配
  - `test/branch-lib-adapters-discord-adapter.test.js` → 无直接路径匹配
  - `test/branch-lib-adapters-feishu-adapter.test.js` → 无直接路径匹配
  - `test/branch-lib-adapters-wecom-adapter.test.js` → 无直接路径匹配
  - `test/branch-lib-ask-bridge.test.js` → 无直接路径匹配
  - `test/branch-lib-ask-store.test.js` → 无直接路径匹配
  - `test/branch-lib-async-file-lock.test.js` → 无直接路径匹配
  - `test/branch-lib-ccv-editor.test.js` → 无直接路径匹配
  - `test/branch-lib-claude-md-discovery.test.js` → 无直接路径匹配
  - `test/branch-lib-delta-reconstructor.test.js` → 无直接路径匹配
  - `test/branch-lib-ensure-hooks.test.js` → 无直接路径匹配
  - `test/branch-lib-file-access-policy.test.js` → 无直接路径匹配
  - `test/branch-lib-git-diff.test.js` → 无直接路径匹配
  - `test/branch-lib-im-bridge-core.test.js` → 无直接路径匹配
  - `test/branch-lib-im-deny.test.js` → 无直接路径匹配
  - `test/branch-lib-im-log-watcher.test.js` → 无直接路径匹配
  - `test/branch-lib-im-process-manager.test.js` → 无直接路径匹配
  - `test/branch-lib-im-senders.test.js` → 无直接路径匹配
  - `test/branch-lib-log-stream.test.js` → 无直接路径匹配
  - `test/branch-lib-perm-bridge.test.js` → 无直接路径匹配
  - `test/branch-lib-proxy-env.test.js` → 无直接路径匹配
  - `test/branch-lib-sdk-manager.test.js` → 无直接路径匹配
  - `test/branch-lib-session-transcript-reader.test.js` → 无直接路径匹配
  - `test/branch-lib-stats-worker.test.js` → 无直接路径匹配
  - `test/branch-lib-team-runtime.test.js` → 无直接路径匹配
  - `test/branch-lib-turn-end-bridge.test.js` → 无直接路径匹配
  - `test/branch-lib-updater.test.js` → 无直接路径匹配
  - `test/branch-lib-user-profile.test.js` → 无直接路径匹配
  - `test/branch-lib-voice-pack-manager.test.js` → 无直接路径匹配
  - `test/branch-lib-ws-backpressure.test.js` → 无直接路径匹配
  - `test/branch-proxy.test.js` → 无直接路径匹配
  - `test/branch-pty-manager.test.js` → 无直接路径匹配
  - `test/branch-routes-ask-perm.test.js` → 无直接路径匹配
  - `test/branch-routes-auth.test.js` → 无直接路径匹配
  - `test/branch-routes-events.test.js` → 无直接路径匹配
  - `test/branch-routes-files-content.test.js` → 无直接路径匹配
  - `test/branch-routes-files-fs.test.js` → 无直接路径匹配
  - `test/branch-routes-im.test.js` → 无直接路径匹配
  - `test/branch-routes-plugins.test.js` → 无直接路径匹配
  - `test/branch-routes-preferences.test.js` → 无直接路径匹配
  - `test/branch-routes-skills.test.js` → 无直接路径匹配
  - `test/branch-routes-team.test.js` → 无直接路径匹配
  - `test/branch-routes-voice-pack.test.js` → 无直接路径匹配
  - `test/branch-routes-workspaces.test.js` → 无直接路径匹配
  - `test/branch-server.test.js` → 无直接路径匹配
  - `test/branch-utils-commandValidator.test.js` → 无直接路径匹配
  - `test/branch-utils-entry-slim.test.js` → 无直接路径匹配
  - `test/branch-utils-ingestPipeline.test.js` → 无直接路径匹配
  - `test/branch-utils-projectAlias.test.js` → 无直接路径匹配
  - `test/branch-utils-promptClassifier.test.js` → 无直接路径匹配
  - `test/branch-utils-sessionManager.test.js` → 无直接路径匹配
  - `test/branch-utils-sessionMerge.test.js` → 无直接路径匹配
  - `test/branch-utils-stickyBottomController.test.js` → 无直接路径匹配
  - `test/branch-utils-teamModalBuilder.test.js` → 无直接路径匹配
  - `test/branch-utils-teamSessionParser.test.js` → 无直接路径匹配
  - `test/branch-utils-teammateDetector.test.js` → 无直接路径匹配
  - `test/branch-utils-terminalWriteQueue.test.js` → 无直接路径匹配
  - `test/branch-utils-ultraplanController.test.js` → 无直接路径匹配
  - `test/branch-utils-userImageRefs.test.js` → 无直接路径匹配
  - `test/branch-utils-voicePackPlayer.test.js` → 无直接路径匹配
  - `test/branch-workspace-registry.test.js` → 无直接路径匹配
  - `test/builtin-presets.test.js` → 无直接路径匹配
  - `test/ccswitch-import.test.js` → 无直接路径匹配
  - `test/ccv-editor.test.js` → 无直接路径匹配
  - `test/ccv-projects.test.js` → 无直接路径匹配
  - `test/claude-lookup-test-guard.test.js` → 无直接路径匹配
  - `test/claude-md-discovery.test.js` → 无直接路径匹配
  - `test/clearCheckpoint.test.js` → 无直接路径匹配
  - `test/cli-boot.test.js` → 无直接路径匹配
  - `test/cli-deep.test.js` → 无直接路径匹配
  - `test/cli-extra.test.js` → 无直接路径匹配
  - `test/cli-import-paths.test.js` → 无直接路径匹配
  - `test/cli-inject.test.js` → 无直接路径匹配
  - `test/cli-modes.test.js` → 无直接路径匹配
  - `test/cli.test.js` → 无直接路径匹配
  - `test/client-safe-imports.test.js` → 无直接路径匹配
  - `test/code-replace.test.js` → 本地候选：`tests/code-replace.test.js`
  - `test/code-search.test.js` → 本地候选：`tests/code-search.test.js`
  - `test/codefuse-managed-mode.test.js` → 无直接路径匹配
  - `test/commandValidator.test.js` → 无直接路径匹配
  - `test/compact-result-preview.test.js` → 无直接路径匹配
  - `test/config-backup.test.js` → 无直接路径匹配
  - `test/content-filter-unit.test.js` → 无直接路径匹配
  - `test/context-i18n.test.js` → 无直接路径匹配
  - `test/context-raw.test.js` → 无直接路径匹配
  - `test/context-rules.test.js` → 无直接路径匹配
  - `test/context-sidebar-nav-gap.test.js` → 无直接路径匹配
  - `test/context-sidebar-navigation.test.js` → 无直接路径匹配
  - `test/context-turns.test.js` → 无直接路径匹配
  - `test/context-watcher.test.js` → 无直接路径匹配
  - `test/cross-request-toolresult.test.js` → 无直接路径匹配
  - `test/delta-e2e.test.js` → 无直接路径匹配
  - `test/delta-reconstructor.test.js` → 无直接路径匹配
  - `test/delta-reorder.test.js` → 无直接路径匹配
  - `test/dingtalk-adapter-deep.test.js` → 无直接路径匹配
  - `test/dingtalk-bridge.test.js` → 无直接路径匹配
  - `test/dingtalk-config.test.js` → 无直接路径匹配
  - `test/discord-bridge.test.js` → 无直接路径匹配
  - `test/discord-config.test.js` → 无直接路径匹配
  - `test/display-scale-helper.test.js` → 无直接路径匹配
  - `test/electron-diag.test.js` → 无直接路径匹配
  - `test/electron-node-execpath-regression.test.js` → 无直接路径匹配
  - `test/enrich-plan-input.test.js` → 无直接路径匹配
  - `test/enrich-workflow.test.js` → 无直接路径匹配
  - `test/ensure-hooks-deep.test.js` → 无直接路径匹配
  - `test/ensure-hooks.test.js` → 本地候选：`tests/ensure-hooks.test.js`
  - `test/entry-cache.test.js` → 无直接路径匹配
  - `test/entry-slim.test.js` → 本地候选：`tests/entry-slim.test.js`
  - `test/error-report.test.js` → 无直接路径匹配
  - `test/events-backpressure.test.js` → 无直接路径匹配
  - `test/events-deep.test.js` → 无直接路径匹配
  - `test/events-kv-context-scan.test.js` → 无直接路径匹配
  - `test/expert-i18n.test.js` → 无直接路径匹配
  - `test/extract-team-sessions.test.js` → 无直接路径匹配
  - `test/feishu-bridge.test.js` → 无直接路径匹配
  - `test/feishu-config.test.js` → 无直接路径匹配
  - `test/file-access-policy.test.js` → 无直接路径匹配
  - `test/file-api-gap.test.js` → 无直接路径匹配
  - `test/file-open.test.js` → 无直接路径匹配
  - `test/fileExpandedPathsStorage.test.js` → 无直接路径匹配
  - `test/files-fs-deep.test.js` → 无直接路径匹配
  - `test/findcc-gap.test.js` → 无直接路径匹配
  - `test/findcc.test.js` → 无直接路径匹配
  - `test/formatters-gap.test.js` → 无直接路径匹配
  - `test/formatters.test.js` → 无直接路径匹配
  - `test/git-api.test.js` → 无直接路径匹配
  - `test/git-diff.test.js` → 无直接路径匹配
  - `test/git-restore.test.js` → 无直接路径匹配
  - `test/git-tree-builder.test.js` → 无直接路径匹配
  - `test/git-unpushed.test.js` → 无直接路径匹配
  - `test/helpers-unit-a.test.js` → 无直接路径匹配
  - `test/helpers-unit-b.test.js` → 无直接路径匹配
  - `test/helpers.test.js` → 无直接路径匹配
  - `test/identity-heal.test.js` → 本地候选：`tests/identity-heal.test.js`
  - `test/im-append-system-seed.test.js` → 无直接路径匹配
  - `test/im-bridge-core-deep.test.js` → 无直接路径匹配
  - `test/im-bridge-core.test.js` → 无直接路径匹配
  - `test/im-conn-state.test.js` → 无直接路径匹配
  - `test/im-connection-state.test.js` → 无直接路径匹配
  - `test/im-deny.test.js` → 无直接路径匹配
  - `test/im-lang.test.js` → 无直接路径匹配
  - `test/im-live-text.test.js` → 无直接路径匹配
  - `test/im-lock-gap.test.js` → 无直接路径匹配
  - `test/im-lock.test.js` → 无直接路径匹配
  - `test/im-origin.test.js` → 无直接路径匹配
  - `test/im-process-manager.test.js` → 无直接路径匹配
  - `test/im-routes-gap.test.js` → 无直接路径匹配
  - `test/im-senders.test.js` → 无直接路径匹配
  - `test/im-skills.test.js` → 无直接路径匹配
  - `test/im-spawn-test-guard.test.js` → 无直接路径匹配
  - `test/im-status-i18n.test.js` → 无直接路径匹配
  - `test/im-tr.test.js` → 无直接路径匹配
  - `test/image-compress.test.js` → 无直接路径匹配
  - `test/image-downscale.test.js` → 无直接路径匹配
  - `test/image-resize-unit.test.js` → 无直接路径匹配
  - `test/image-resize.test.js` → 无直接路径匹配
  - `test/import-file-api.test.js` → 无直接路径匹配
  - `test/incremental-merge.test.js` → 无直接路径匹配
  - `test/ingest-pipeline.test.js` → 无直接路径匹配
  - `test/inject-output-config-effort.test.js` → 无直接路径匹配
  - `test/install-method.test.js` → 无直接路径匹配
  - `test/interaction-ownership.test.js` → 本地候选：`tests/interaction-ownership.test.js`
  - `test/interceptor-continuation-sync.test.js` → 无直接路径匹配
  - `test/interceptor-core-mainagent.test.js` → 无直接路径匹配
  - `test/interceptor-fetch-errors.test.js` → 无直接路径匹配
  - `test/interceptor-fetch.test.js` → 无直接路径匹配
  - `test/interceptor-import-arms.test.js` → 无直接路径匹配
  - `test/interceptor-imworker-init.test.js` → 无直接路径匹配
  - `test/interceptor-live.test.js` → 无直接路径匹配
  - `test/interceptor-profile.test.js` → 无直接路径匹配
  - `test/interceptor-seq-producer.test.js` → 无直接路径匹配
  - `test/interceptor-seq-teammate.test.js` → 无直接路径匹配
  - `test/interceptor-teammate-init.test.js` → 无直接路径匹配
  - `test/interceptor-v2-write.test.js` → 无直接路径匹配
  - `test/interceptor-workspace-init.test.js` → 无直接路径匹配
  - `test/interceptor.test.js` → 无直接路径匹配
  - `test/kv-cache-analyzer.test.js` → 无直接路径匹配
  - `test/lazy-with-reload.test.js` → 无直接路径匹配
  - `test/loaded-skills-parser.test.js` → 无直接路径匹配
  - `test/log-management-gap.test.js` → 无直接路径匹配
  - `test/log-management-i18n.test.js` → 无直接路径匹配
  - `test/log-management.test.js` → 无直接路径匹配
  - `test/log-stream.test.js` → 无直接路径匹配
  - `test/log-zip.test.js` → 无直接路径匹配
  - `test/logdir-test-guard.test.js` → 无直接路径匹配
  - `test/lr-messages-dedup.test.js` → 无直接路径匹配
  - `test/markdown-incremental.test.js` → 无直接路径匹配
  - `test/markdown-profiler-gap.test.js` → 无直接路径匹配
  - `test/markdown-profiler-gap2.test.js` → 无直接路径匹配
  - `test/markdown-profiler.test.js` → 无直接路径匹配
  - `test/markdown-util.test.js` → 无直接路径匹配
  - `test/md-extension-detect.test.js` → 无直接路径匹配
  - `test/mdx-translations.test.js` → 无直接路径匹配
  - `test/memoryLinkParser.test.js` → 无直接路径匹配
  - `test/menu-model.test.js` → 无直接路径匹配
  - `test/migrate-prompt-i18n.test.js` → 无直接路径匹配
  - `test/migrate-prompt.test.js` → 无直接路径匹配
  - `test/modal-mask.test.js` → 无直接路径匹配
  - `test/model-suggestions.test.js` → 无直接路径匹配
  - `test/model-system-prompts.test.js` → 本地候选：`tests/model-system-prompts.test.js`
  - `test/native-teammate-detector.test.js` → 无直接路径匹配
  - `test/new-ui-i18n.test.js` → 无直接路径匹配
  - `test/pending-asks-filter.test.js` → 无直接路径匹配
  - `test/perm-bridge.test.js` → 本地候选：`tests/perm-bridge.test.js`
  - `test/permission-controller.test.js` → 无直接路径匹配
  - `test/permission-detect.test.js` → 无直接路径匹配
  - `test/pid-alive.test.js` → 无直接路径匹配
  - `test/pinned-menu.test.js` → 无直接路径匹配
  - `test/plan-approve-option.test.js` → 无直接路径匹配
  - `test/plugin-loader.test.js` → 无直接路径匹配
  - `test/plugin-manager-gap.test.js` → 无直接路径匹配
  - `test/preset-shortcuts.test.js` → 无直接路径匹配
  - `test/project-prefs.test.js` → 无直接路径匹配
  - `test/projectAlias.test.js` → 无直接路径匹配
  - `test/prompt-classifier-gap.test.js` → 无直接路径匹配
  - `test/prompt-detect.test.js` → 无直接路径匹配
  - `test/promptNav.test.js` → 无直接路径匹配
  - `test/proxy-env.test.js` → 本地候选：`tests/proxy-env.test.js`
  - `test/proxy-errors.test.js` → 无直接路径匹配
  - `test/proxy-profile-isolation.test.js` → 无直接路径匹配
  - `test/proxy-retry-cancel.test.js` → 无直接路径匹配
  - `test/proxy-retry-stream-idle.test.js` → 无直接路径匹配
  - `test/proxy-retry.test.js` → 无直接路径匹配
  - `test/proxy-role-custom-endpoint.test.js` → 无直接路径匹配
  - `test/proxy-role-proxy-mode.test.js` → 无直接路径匹配
  - `test/proxy-role-routing.test.js` → 无直接路径匹配
  - `test/proxy-server.test.js` → 无直接路径匹配
  - `test/proxy-stats.test.js` → 无直接路径匹配
  - `test/proxy-unit.test.js` → 无直接路径匹配
  - `test/pty-chunk-builder-gap.test.js` → 无直接路径匹配
  - `test/pty-flood-coalescer.test.js` → 无直接路径匹配
  - `test/pty-manager-deep.test.js` → 无直接路径匹配
  - `test/pty-manager-gap.test.js` → 无直接路径匹配
  - `test/pty-manager-real.test.js` → 无直接路径匹配
  - `test/pty-manager.test.js` → 本地候选：`tests/pty-manager.test.js`
  - `test/pty-prompt-controller.test.js` → 本地候选：`tests/pty-prompt-controller.test.js`
  - `test/pty-prompt-retry.test.js` → 无直接路径匹配
  - `test/quick-settings-i18n.test.js` → 无直接路径匹配
  - `test/rateLimitParser.test.js` → 无直接路径匹配
  - `test/refresh-cached-item-prop.test.js` → 无直接路径匹配
  - `test/rename-v2-sessions.test.js` → 无直接路径匹配
  - `test/replace-top-level-model.test.js` → 无直接路径匹配
  - `test/request-type-unit.test.js` → 无直接路径匹配
  - `test/resize-calc.test.js` → 无直接路径匹配
  - `test/resolve-ask-questions.test.js` → 无直接路径匹配
  - `test/resolve-localized.test.js` → 无直接路径匹配
  - `test/resolve-profile-model.test.js` → 无直接路径匹配
  - `test/resync-nudge-gate.test.js` → 无直接路径匹配
  - `test/retry-config-layout.test.js` → 无直接路径匹配
  - `test/root-server-shim.test.js` → 无直接路径匹配
  - `test/root-shim.test.js` → 无直接路径匹配
  - `test/route-dispatch.test.js` → 无直接路径匹配
  - `test/scratch-pty-manager-gap.test.js` → 无直接路径匹配
  - `test/scratch-pty-manager.test.js` → 无直接路径匹配
  - `test/scroll-highlight-controller.test.js` → 无直接路径匹配
  - `test/sdk-adapter.test.js` → 本地候选：`tests/sdk-adapter.test.js`
  - `test/sdk-manager-extra.test.js` → 无直接路径匹配
  - `test/sdk-manager-query.test.js` → 无直接路径匹配
  - `test/sdk-manager.test.js` → 本地候选：`tests/sdk-manager.test.js`
  - `test/search-endpoint.test.js` → 本地候选：`tests/search-endpoint.test.js`
  - `test/search-replace-preview.test.js` → 本地候选：`tests/search-replace-preview.test.js`
  - `test/seq-resource-loaders.test.js` → 无直接路径匹配
  - `test/server-ask-hook-map.test.js` → 无直接路径匹配
  - `test/server-auth-branches.test.js` → 无直接路径匹配
  - `test/server-cli-mode.test.js` → 无直接路径匹配
  - `test/server-cli-startup.test.js` → 无直接路径匹配
  - `test/server-http-extra-2.test.js` → 无直接路径匹配
  - `test/server-http-extra.test.js` → 无直接路径匹配
  - `test/server-i18n.test.js` → 无直接路径匹配
  - `test/server-im-worker.test.js` → 无直接路径匹配
  - `test/server-lifecycle.test.js` → 无直接路径匹配
  - `test/server-logs.test.js` → 无直接路径匹配
  - `test/server-plugins.test.js` → 无直接路径匹配
  - `test/server-ports-busy.test.js` → 无直接路径匹配
  - `test/server-residual.test.js` → 无直接路径匹配
  - `test/server-resync-request.test.js` → 无直接路径匹配
  - `test/server-startup-extra.test.js` → 无直接路径匹配
  - `test/server-v2-read.test.js` → 无直接路径匹配
  - `test/server-ws-branches.test.js` → 无直接路径匹配
  - `test/server.test.js` → 无直接路径匹配
  - `test/session-boundary-parity.test.js` → 无直接路径匹配
  - `test/session-boundary.test.js` → 无直接路径匹配
  - `test/session-manager.test.js` → 无直接路径匹配
  - `test/session-model-stamp.test.js` → 无直接路径匹配
  - `test/session-pin.test.js` → 无直接路径匹配
  - `test/session-start-bridge.test.js` → 无直接路径匹配
  - `test/session-transcript-reader-toolresult.test.js` → 无直接路径匹配
  - `test/session-transcript-reader.test.js` → 无直接路径匹配
  - `test/settings-merge.test.js` → 无直接路径匹配
  - `test/should-inline-tool-images.test.js` → 无直接路径匹配
  - `test/skill-display-name.test.js` → 无直接路径匹配
  - `test/skill-modal-controller.test.js` → 无直接路径匹配
  - `test/skills-api.test.js` → 本地候选：`tests/skills-api.test.js`
  - `test/skills-import.test.js` → 无直接路径匹配
  - `test/slash-command-labels.test.js` → 无直接路径匹配
  - `test/spawn-model-resolver.test.js` → 无直接路径匹配
  - `test/split-drag-calc.test.js` → 无直接路径匹配
  - `test/split-drag-controller.test.js` → 无直接路径匹配
  - `test/sse-compression.test.js` → 无直接路径匹配
  - `test/sse-heartbeat.test.js` → 无直接路径匹配
  - `test/sse-update-badge-frame.test.js` → 无直接路径匹配
  - `test/stats-worker-notification-filter.test.js` → 无直接路径匹配
  - `test/stats-worker-proxy.test.js` → 无直接路径匹配
  - `test/stats-worker.test.js` → 本地候选：`tests/stats-worker.test.js`
  - `test/sticky-bottom-controller-integration.test.js` → 无直接路径匹配
  - `test/sticky-bottom-controller-user-intent.test.js` → 无直接路径匹配
  - `test/sticky-bottom-controller.test.js` → 无直接路径匹配
  - `test/stream-assembler.test.js` → 无直接路径匹配
  - `test/streaming-state.test.js` → 无直接路径匹配
  - `test/svg-sanitize-gap.test.js` → 无直接路径匹配
  - `test/svg-sanitize.test.js` → 无直接路径匹配
  - `test/synthetic-classification.test.js` → 无直接路径匹配
  - `test/system-prompt-builder.test.js` → 无直接路径匹配
  - `test/system-prompt-files.test.js` → 无直接路径匹配
  - `test/system-prompt-presets.test.js` → 无直接路径匹配
  - `test/system-prompt-render.test.js` → 无直接路径匹配
  - `test/system-tags.test.js` → 无直接路径匹配
  - `test/t-claude.test.js` → 无直接路径匹配
  - `test/team-modal-builder-unit.test.js` → 无直接路径匹配
  - `test/team-runtime.test.js` → 无直接路径匹配
  - `test/team-status-endpoint.test.js` → 无直接路径匹配
  - `test/teammate-avatar-static.test.js` → 无直接路径匹配
  - `test/teammate-avatars.test.js` → 无直接路径匹配
  - `test/teammate-svg-assets.test.js` → 无直接路径匹配
  - `test/term-diag.test.js` → 无直接路径匹配
  - `test/term-signals.test.js` → 无直接路径匹配
  - `test/terminal-env.test.js` → 无直接路径匹配
  - `test/terminal-pipeline-oracle.test.js` → 无直接路径匹配
  - `test/terminal-scrollback-preserve.test.js` → 无直接路径匹配
  - `test/terminal-write-queue-adaptive.test.js` → 无直接路径匹配
  - `test/terminal-write-queue.test.js` → 无直接路径匹配
  - `test/terminalClipboard.test.js` → 无直接路径匹配
  - `test/theme-sync.test.js` → 无直接路径匹配
  - `test/thinking-merge.test.js` → 无直接路径匹配
  - `test/timestamp-assignment.test.js` → 无直接路径匹配
  - `test/tool-activation-concepts.test.js` → 无直接路径匹配
  - `test/tool-catalog-concepts.test.js` → 本地候选：`tests/tool-catalog-concepts.test.js`
  - `test/tool-file-change-controller.test.js` → 本地候选：`tests/tool-file-change-controller.test.js`
  - `test/tool-result-builder-unit.test.js` → 无直接路径匹配
  - `test/toolResultBuilder-dedup.test.js` → 无直接路径匹配
  - `test/toolResultBuilder-validation-error.test.js` → 无直接路径匹配
  - `test/tools-xml-formatter.test.js` → 无直接路径匹配
  - `test/toolsDiff.test.js` → 无直接路径匹配
  - `test/turn-end-bridge.test.js` → 无直接路径匹配
  - `test/turn-end-debounce.test.js` → 无直接路径匹配
  - `test/ultra-agents-api.test.js` → 本地候选：`tests/ultra-agents-api.test.js`
  - `test/ultraplan-concepts-parity.test.js` → 无直接路径匹配
  - `test/ultraplan-controller-gap.test.js` → 无直接路径匹配
  - `test/ultraplan-controller.test.js` → 无直接路径匹配
  - `test/ultraplan-detection.test.js` → 无直接路径匹配
  - `test/ultraplan-experts.test.js` → 无直接路径匹配
  - `test/ultraplan-templates.test.js` → 无直接路径匹配
  - `test/updater-pnpm.test.js` → 无直接路径匹配
  - `test/updater-test-guard.test.js` → 无直接路径匹配
  - `test/updater.test.js` → 无直接路径匹配
  - `test/upload-defer-logic.test.js` → 无直接路径匹配
  - `test/usepassword-startup.test.js` → 无直接路径匹配
  - `test/user-image-refs.test.js` → 无直接路径匹配
  - `test/user-profile.test.js` → 无直接路径匹配
  - `test/user-prompt-extract.test.js` → 无直接路径匹配
  - `test/v2-adapter-incremental.test.js` → 无直接路径匹配
  - `test/v2-adapter.test.js` → 无直接路径匹配
  - `test/v2-continuation-adopt.test.js` → 无直接路径匹配
  - `test/v2-convert.test.js` → 无直接路径匹配
  - `test/v2-core.test.js` → 无直接路径匹配
  - `test/v2-entry-endpoint.test.js` → 无直接路径匹配
  - `test/v2-image-pipeline.test.js` → 无直接路径匹配
  - `test/v2-jsonl-read.test.js` → 无直接路径匹配
  - `test/v2-live-feed.test.js` → 无直接路径匹配
  - `test/v2-meta-rows.test.js` → 无直接路径匹配
  - `test/v2-resume-switch.test.js` → 无直接路径匹配
  - `test/v2-session-dirname.test.js` → 无直接路径匹配
  - `test/v2-session-list.test.js` → 无直接路径匹配
  - `test/v2-session-owner.test.js` → 无直接路径匹配
  - `test/v2-session-select.test.js` → 无直接路径匹配
  - `test/v2-singleflight.test.js` → 无直接路径匹配
  - `test/v2-transcript-incremental.test.js` → 无直接路径匹配
  - `test/v2-transcript-normalizer.test.js` → 无直接路径匹配
  - `test/v2-verify.test.js` → 无直接路径匹配
  - `test/v2-window-two-pass.test.js` → 无直接路径匹配
  - `test/v3-assembler.test.js` → 无直接路径匹配
  - `test/vite-base-default.test.js` → 无直接路径匹配
  - `test/voice-pack-events.test.js` → 无直接路径匹配
  - `test/voice-pack-manager.test.js` → 无直接路径匹配
  - `test/voice-pack-player-gap.test.js` → 无直接路径匹配
  - `test/voice-pack-player.test.js` → 无直接路径匹配
  - `test/voice-pack-sanguo-integration.test.js` → 无直接路径匹配
  - `test/web-search-grouping.test.js` → 无直接路径匹配
  - `test/wecom-bridge.test.js` → 无直接路径匹配
  - `test/wecom-config.test.js` → 无直接路径匹配
  - `test/window-state.test.js` → 无直接路径匹配
  - `test/windows-compat.test.js` → 无直接路径匹配
  - `test/windows-hide.test.js` → 无直接路径匹配
  - `test/windows-import-paths.test.js` → 无直接路径匹配
  - `test/windows-npm-root-regression.test.js` → 无直接路径匹配
  - `test/wire-compress.test.js` → 无直接路径匹配
  - `test/workflow-journal.test.js` → 无直接路径匹配
  - `test/workflow-live.test.js` → 无直接路径匹配
  - `test/workflow-runs.test.js` → 无直接路径匹配
  - `test/workflow-text-parse.test.js` → 无直接路径匹配
  - `test/workflow-watcher.test.js` → 无直接路径匹配
  - `test/workflowStore.test.js` → 无直接路径匹配
  - `test/workspace-registry.test.js` → 无直接路径匹配
  - `test/ws-backpressure.test.js` → 无直接路径匹配

<a id="commit-dabc5232ce"></a>
## [dabc5232ce](https://github.com/weiesky/cc-viewer/commit/dabc5232cebace096689a7c8ebb2ecb2113d0ba1) — chore(pnpm): migrate package manager from npm to pnpm 11.22 (stage A1)
- 工程前置本地适配（2026-11-17）：6287d2a 已实现 pnpm 10.34.9、frozen install、已安装 Vite bin、安装脚本许可与 CI，保留 Node 20 lane；未原样采用上游 pnpm 11/依赖策略。新依赖目录全量 1099/1099、构建、npm 1014 文件、实际生产安装/HTTP/应用 PTY 通过。brace-expansion 2.1.2 去重到原有 2.1.4 已审计；远端 CI、全局升级及其他平台仍待，不据此标整条所有策略已对齐。见 [实施证据](./A1-A2-engineering.md)。
- B0 本地关键代码对照：当前仓库为 npm 单包并追踪 package-lock.json，缺少 pnpm 锁文件与 workspace 配置；A1 未实施，归入 B11 专项，须验证原生依赖及 CI。 [pnpm 专项](./B0-pnpm-monorepo.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-dabc5232ce)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-dabc5232ce)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-20T09:27:51-04:00；作者时间：2026-08-19T00:17:45-04:00；父提交：817dc87a8e。
- B0 专项核查：上游 pnpm/monorepo 阶段提交；见 [专项方案对照](./B0-pnpm-monorepo.md)。归属 B11，是否实施仍待决策。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（10 个）：
  - `.github/workflows/ci.yml` → 无直接路径匹配
  - `.github/workflows/release.yml` → 无直接路径匹配
  - `CLAUDE.md` → 无直接路径匹配
  - `CONTRIBUTING.md` → 无直接路径匹配
  - `build.js` → 本地候选：`build.js`
  - `docs/refactor/pnpm-monorepo-migration-plan.zh.md` → 无直接路径匹配
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`
  - `pnpm-lock.yaml` → 无直接路径匹配
  - `pnpm-workspace.yaml` → 无直接路径匹配

<a id="commit-817dc87a8e"></a>
## [817dc87a8e](https://github.com/weiesky/cc-viewer/commit/817dc87a8ed32888e234c1e55b5041572d1caafe) — bump version to 1.7.23
- [B0 upstream full commit message](./B0-upstream-messages.md#message-817dc87a8e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-817dc87a8e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-19T10:49:45+08:00；作者时间：2026-08-19T10:49:45+08:00；父提交：721e2c9940。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `package.json` → 本地候选：`package.json`

<a id="commit-721e2c9940"></a>
## [721e2c9940](https://github.com/weiesky/cc-viewer/commit/721e2c99408e1467c5b75b8eb85b90ef3adaaaf1) — Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri
- [B0 upstream full commit message](./B0-upstream-messages.md#message-721e2c9940)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-721e2c9940)

- B0 血缘：相对第一父分支引入窗口内 2 条可达提交：[9f4e329be4](#commit-9f4e329be4), [5c468c042e](#commit-5c468c042e)。合并与分支变更不得重复计算。

- 提交时间：2026-08-18T06:42:17-04:00；作者时间：2026-08-18T06:42:17-04:00；父提交：3f141cb974, 9f4e329be4。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（2 个）：
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`

<a id="commit-9f4e329be4"></a>
## [9f4e329be4](https://github.com/weiesky/cc-viewer/commit/9f4e329be483f3eb53cf96cbd2c9957a9976dcd2) — Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9f4e329be4)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9f4e329be4)

- B0 血缘：相对第一父分支引入窗口内 6 条可达提交：[3f141cb974](#commit-3f141cb974), [a97d0f8adf](#commit-a97d0f8adf), [6680d041d4](#commit-6680d041d4), [9255663e33](#commit-9255663e33), [3cc05b496d](#commit-3cc05b496d), [ea8c5e39e0](#commit-ea8c5e39e0)。合并与分支变更不得重复计算。

- 提交时间：2026-08-18T06:42:07-04:00；作者时间：2026-08-18T06:42:07-04:00；父提交：5c468c042e, 3f141cb974。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并存在冲突或错误；实际树相对自动合并树的差异路径：`package.json`。该结果不证明业务语义已审查。
- B0 冲突解决复核：`git show --cc` 显示合并树冲突解决仅涉及 `package.json`；其父分支的产品变更仍需逐项审查，不能由此判定功能不适用。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（759 个）：
  - `README.md` → 本地候选：`README.md`
  - `concepts/ar/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ar/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ar/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ar/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ar/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ar/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ar/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ar/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ar/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ar/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ar/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ar/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ar/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ar/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ar/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ar/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/ar/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ar/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ar/Tools.md` → 无直接路径匹配
  - `concepts/da/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/da/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/da/Tool-LSP.md` → 无直接路径匹配
  - `concepts/da/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/da/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/da/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/da/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/da/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/da/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/da/Tool-Projects.md` → 无直接路径匹配
  - `concepts/da/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/da/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/da/Tool-REPL.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/da/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/da/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/da/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/da/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/da/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/da/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/da/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/da/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/da/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/da/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/da/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/da/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/da/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/da/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/da/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/da/Tools.md` → 无直接路径匹配
  - `concepts/de/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/de/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/de/Tool-LSP.md` → 无直接路径匹配
  - `concepts/de/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/de/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/de/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/de/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/de/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/de/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/de/Tool-Projects.md` → 无直接路径匹配
  - `concepts/de/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/de/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/de/Tool-REPL.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/de/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/de/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/de/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/de/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/de/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/de/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/de/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/de/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/de/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/de/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/de/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/de/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/de/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/de/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/de/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/de/Tools.md` → 无直接路径匹配
  - `concepts/en/ProxySwitch.md` → 本地候选：`concepts/en/ProxySwitch.md`
  - `concepts/en/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/en/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/en/Tool-LSP.md` → 无直接路径匹配
  - `concepts/en/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/en/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/en/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/en/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/en/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/en/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/en/Tool-Projects.md` → 无直接路径匹配
  - `concepts/en/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/en/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/en/Tool-REPL.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/en/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/en/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/en/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/en/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/en/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/en/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/en/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/en/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/en/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/en/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/en/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/en/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/en/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/en/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/en/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/en/Tools.md` → 本地候选：`concepts/en/Tools.md`
  - `concepts/es/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/es/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/es/Tool-LSP.md` → 无直接路径匹配
  - `concepts/es/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/es/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/es/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/es/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/es/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/es/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/es/Tool-Projects.md` → 无直接路径匹配
  - `concepts/es/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/es/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/es/Tool-REPL.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/es/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/es/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/es/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/es/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/es/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/es/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/es/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/es/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/es/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/es/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/es/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/es/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/es/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/es/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/es/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/es/Tools.md` → 无直接路径匹配
  - `concepts/fr/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/fr/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/fr/Tool-LSP.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/fr/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/fr/Tool-Projects.md` → 无直接路径匹配
  - `concepts/fr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/fr/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/fr/Tool-REPL.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/fr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/fr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/fr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/fr/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/fr/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/fr/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/fr/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/fr/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/fr/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/fr/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/fr/Tools.md` → 无直接路径匹配
  - `concepts/it/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/it/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/it/Tool-LSP.md` → 无直接路径匹配
  - `concepts/it/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/it/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/it/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/it/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/it/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/it/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/it/Tool-Projects.md` → 无直接路径匹配
  - `concepts/it/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/it/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/it/Tool-REPL.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/it/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/it/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/it/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/it/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/it/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/it/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/it/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/it/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/it/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/it/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/it/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/it/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/it/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/it/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/it/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/it/Tools.md` → 无直接路径匹配
  - `concepts/ja/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ja/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ja/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ja/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ja/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ja/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ja/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ja/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ja/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ja/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ja/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ja/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ja/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ja/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ja/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ja/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/ja/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ja/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ja/Tools.md` → 无直接路径匹配
  - `concepts/ko/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ko/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ko/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ko/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ko/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ko/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ko/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ko/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ko/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ko/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ko/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ko/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ko/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ko/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ko/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ko/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/ko/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ko/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ko/Tools.md` → 无直接路径匹配
  - `concepts/no/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/no/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/no/Tool-LSP.md` → 无直接路径匹配
  - `concepts/no/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/no/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/no/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/no/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/no/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/no/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/no/Tool-Projects.md` → 无直接路径匹配
  - `concepts/no/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/no/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/no/Tool-REPL.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/no/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/no/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/no/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/no/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/no/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/no/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/no/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/no/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/no/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/no/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/no/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/no/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/no/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/no/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/no/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/no/Tools.md` → 无直接路径匹配
  - `concepts/pl/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/pl/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/pl/Tool-LSP.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/pl/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/pl/Tool-Projects.md` → 无直接路径匹配
  - `concepts/pl/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/pl/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/pl/Tool-REPL.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/pl/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/pl/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/pl/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/pl/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/pl/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/pl/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/pl/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/pl/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/pl/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/pl/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/pl/Tools.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-LSP.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-Projects.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-REPL.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/pt-BR/Tools.md` → 无直接路径匹配
  - `concepts/ru/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ru/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ru/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ru/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ru/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ru/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ru/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ru/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ru/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ru/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ru/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ru/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ru/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ru/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ru/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ru/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/ru/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ru/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ru/Tools.md` → 无直接路径匹配
  - `concepts/th/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/th/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/th/Tool-LSP.md` → 无直接路径匹配
  - `concepts/th/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/th/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/th/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/th/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/th/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/th/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/th/Tool-Projects.md` → 无直接路径匹配
  - `concepts/th/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/th/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/th/Tool-REPL.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/th/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/th/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/th/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/th/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/th/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/th/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/th/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/th/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/th/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/th/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/th/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/th/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/th/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/th/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/th/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/th/Tools.md` → 无直接路径匹配
  - `concepts/tr/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/tr/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/tr/Tool-LSP.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/tr/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/tr/Tool-Projects.md` → 无直接路径匹配
  - `concepts/tr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/tr/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/tr/Tool-REPL.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/tr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/tr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/tr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/tr/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/tr/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/tr/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/tr/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/tr/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/tr/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/tr/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/tr/Tools.md` → 无直接路径匹配
  - `concepts/uk/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/uk/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/uk/Tool-LSP.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/uk/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/uk/Tool-Projects.md` → 无直接路径匹配
  - `concepts/uk/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/uk/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/uk/Tool-REPL.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/uk/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/uk/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/uk/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/uk/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/uk/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/uk/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/uk/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/uk/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/uk/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/uk/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/uk/Tools.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-LSP.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-Projects.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-REPL.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/zh-TW/Tools.md` → 无直接路径匹配
  - `concepts/zh/ProxySwitch.md` → 本地候选：`concepts/zh/ProxySwitch.md`
  - `concepts/zh/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/zh/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/zh/Tool-LSP.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/zh/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/zh/Tool-Projects.md` → 无直接路径匹配
  - `concepts/zh/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/zh/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/zh/Tool-REPL.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/zh/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/zh/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/zh/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/zh/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/zh/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/zh/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/zh/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/zh/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/zh/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/zh/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/zh/Tools.md` → 本地候选：`concepts/zh/Tools.md`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`
  - `server/interceptor.js` → 本地候选：`interceptor.js`
  - `server/lib/interceptor-core.js` → 本地候选：`lib/interceptor-core.js`
  - `server/lib/v2/adapter.js` → 无直接路径匹配
  - `server/lib/v2/live-feed.js` → 无直接路径匹配
  - `server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `server/proxy.js` → 本地候选：`proxy.js`
  - `server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `src/App.jsx` → 本地候选：`src/App.jsx`
  - `src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `src/components/settings/ProxyModal.jsx` → 本地候选：`src/components/settings/ProxyModal.jsx`
  - `src/components/settings/ProxyModal.module.css` → 本地候选：`src/components/settings/ProxyModal.module.css`
  - `src/i18n.js` → 本地候选：`src/i18n.js`
  - `src/utils/toolCatalog.js` → 本地候选：`src/utils/toolCatalog.js`
  - `src/utils/v3Assembler.js` → 无直接路径匹配
  - `src/utils/v3Rows.js` → 无直接路径匹配
  - `test/api-preferences-gap.test.js` → 无直接路径匹配
  - `test/branch-interceptor.test.js` → 无直接路径匹配
  - `test/cli-boot.test.js` → 无直接路径匹配
  - `test/interceptor-fetch-errors.test.js` → 无直接路径匹配
  - `test/interceptor-profile.test.js` → 无直接路径匹配
  - `test/interceptor-workspace-init.test.js` → 无直接路径匹配
  - `test/new-ui-i18n.test.js` → 无直接路径匹配
  - `test/proxy-profile-isolation.test.js` → 无直接路径匹配
  - `test/proxy-role-custom-endpoint.test.js` → 无直接路径匹配
  - `test/proxy-role-proxy-mode.test.js` → 无直接路径匹配
  - `test/proxy-role-routing.test.js` → 无直接路径匹配
  - `test/spawn-model-resolver.test.js` → 无直接路径匹配
  - `test/tool-activation-concepts.test.js` → 无直接路径匹配

<a id="commit-3f141cb974"></a>
## [3f141cb974](https://github.com/weiesky/cc-viewer/commit/3f141cb974aa70219c0b64b93caa5a385249b203) — Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3f141cb974)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3f141cb974)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[9255663e33](#commit-9255663e33)。合并与分支变更不得重复计算。

- 提交时间：2026-08-18T06:40:50-04:00；作者时间：2026-08-18T06:40:50-04:00；父提交：a97d0f8adf, 9255663e33。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（2 个）：
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`

<a id="commit-a97d0f8adf"></a>
## [a97d0f8adf](https://github.com/weiesky/cc-viewer/commit/a97d0f8adfc9a44887c9b05fc1f857f87e15cf94) — docs(concepts): "Activation" sections for gated tools in all 18 locales
- B0 本地关键代码对照：上游受限工具 Activation 说明针对 Claude 的可用条件；本地 concepts 工具文档须按 Codex 实际工具注册与启用条件核实，不机械移植，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-a97d0f8adf)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a97d0f8adf)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a97d0f8adf)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-18T06:19:09-04:00；作者时间：2026-08-18T06:19:09-04:00；父提交：6680d041d4。
- 初筛批次：**H / 插件与扩展**；状态：待人工核验。
- 处理建议：对比现有 hook 插件接口；评估服务生命周期、授权和代理隔离。
- 上游改动路径（560 个）：
  - `concepts/ar/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ar/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ar/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ar/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ar/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ar/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ar/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ar/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ar/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ar/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ar/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ar/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ar/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ar/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/da/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/da/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/da/Tool-LSP.md` → 无直接路径匹配
  - `concepts/da/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/da/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/da/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/da/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/da/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/da/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/da/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/da/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/da/Tool-REPL.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/da/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/da/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/da/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/da/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/da/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/da/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/da/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/da/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/da/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/da/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/da/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/de/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/de/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/de/Tool-LSP.md` → 无直接路径匹配
  - `concepts/de/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/de/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/de/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/de/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/de/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/de/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/de/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/de/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/de/Tool-REPL.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/de/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/de/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/de/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/de/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/de/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/de/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/de/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/de/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/de/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/de/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/de/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/en/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/en/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/en/Tool-LSP.md` → 无直接路径匹配
  - `concepts/en/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/en/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/en/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/en/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/en/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/en/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/en/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/en/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/en/Tool-REPL.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/en/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/en/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/en/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/en/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/en/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/en/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/en/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/en/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/en/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/en/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/en/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/es/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/es/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/es/Tool-LSP.md` → 无直接路径匹配
  - `concepts/es/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/es/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/es/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/es/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/es/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/es/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/es/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/es/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/es/Tool-REPL.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/es/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/es/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/es/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/es/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/es/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/es/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/es/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/es/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/es/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/es/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/es/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/fr/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/fr/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/fr/Tool-LSP.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/fr/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/fr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/fr/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/fr/Tool-REPL.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/fr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/fr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/fr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/fr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/fr/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/fr/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/fr/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/it/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/it/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/it/Tool-LSP.md` → 无直接路径匹配
  - `concepts/it/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/it/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/it/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/it/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/it/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/it/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/it/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/it/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/it/Tool-REPL.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/it/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/it/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/it/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/it/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/it/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/it/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/it/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/it/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/it/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/it/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/it/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/ja/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ja/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ja/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ja/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ja/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ja/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ja/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ja/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ja/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ja/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ja/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ja/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ja/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ja/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/ko/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ko/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ko/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ko/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ko/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ko/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ko/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ko/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ko/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ko/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ko/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ko/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ko/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ko/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/no/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/no/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/no/Tool-LSP.md` → 无直接路径匹配
  - `concepts/no/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/no/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/no/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/no/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/no/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/no/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/no/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/no/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/no/Tool-REPL.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/no/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/no/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/no/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/no/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/no/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/no/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/no/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/no/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/no/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/no/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/no/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/pl/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/pl/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/pl/Tool-LSP.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/pl/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/pl/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/pl/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/pl/Tool-REPL.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/pl/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/pl/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/pl/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/pl/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/pl/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/pl/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/pl/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-LSP.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-REPL.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/ru/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/ru/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ru/Tool-LSP.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ru/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/ru/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ru/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/ru/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ru/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/ru/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/ru/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/ru/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/ru/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ru/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/ru/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/th/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/th/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/th/Tool-LSP.md` → 无直接路径匹配
  - `concepts/th/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/th/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/th/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/th/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/th/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/th/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/th/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/th/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/th/Tool-REPL.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/th/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/th/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/th/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/th/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/th/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/th/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/th/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/th/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/th/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/th/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/th/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/tr/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/tr/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/tr/Tool-LSP.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/tr/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/tr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/tr/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/tr/Tool-REPL.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/tr/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/tr/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/tr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/tr/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/tr/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/tr/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/tr/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/uk/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/uk/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/uk/Tool-LSP.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/uk/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/uk/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/uk/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/uk/Tool-REPL.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/uk/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/uk/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/uk/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/uk/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/uk/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/uk/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/uk/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-LSP.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-REPL.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-WebSearch.md` → 无直接路径匹配
  - `concepts/zh/Tool-Artifact.md` → 无直接路径匹配
  - `concepts/zh/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/zh/Tool-LSP.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/zh/Tool-Monitor.md` → 无直接路径匹配
  - `concepts/zh/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/zh/Tool-PushNotification.md` → 无直接路径匹配
  - `concepts/zh/Tool-REPL.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/zh/Tool-RemoteTrigger.md` → 无直接路径匹配
  - `concepts/zh/Tool-ScheduleWakeup.md` → 无直接路径匹配
  - `concepts/zh/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendMessage.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskCreate.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskGet.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskList.md` → 无直接路径匹配
  - `concepts/zh/Tool-TaskUpdate.md` → 无直接路径匹配
  - `concepts/zh/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/zh/Tool-ToolSearch.md` → 无直接路径匹配
  - `concepts/zh/Tool-WebSearch.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `test/tool-activation-concepts.test.js` → 无直接路径匹配

<a id="commit-6680d041d4"></a>
## [6680d041d4](https://github.com/weiesky/cc-viewer/commit/6680d041d4d3cd902f9d3773a1c9d3f774146964) — feat(tools): sync tool catalog to Claude Code 2.1.233 — 21 new tools, MCP & Extensions category
- B0 本地关键代码对照：上游目录和 18 语言概念文档针对 Claude Code 2.1.233；本地 src/utils/toolCatalog.js 与 concepts/{zh,en} 已有 Codex 工具目录和 MCP 文档，不能原样覆盖，需依据 Codex 协议逐项核对并保留本地已修正内容，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-6680d041d4)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6680d041d4)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6680d041d4)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-17T22:46:51-04:00；作者时间：2026-08-17T22:46:51-04:00；父提交：3cc05b496d。
- 初筛批次：**H / 插件与扩展**；状态：待人工核验。
- 处理建议：对比现有 hook 插件接口；评估服务生命周期、授权和代理隔离。
- 上游改动路径（471 个）：
  - `concepts/ar/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ar/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ar/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ar/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ar/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ar/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ar/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ar/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ar/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ar/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ar/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ar/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ar/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ar/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ar/Tools.md` → 无直接路径匹配
  - `concepts/da/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/da/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/da/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/da/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/da/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/da/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/da/Tool-Projects.md` → 无直接路径匹配
  - `concepts/da/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/da/Tool-REPL.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/da/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/da/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/da/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/da/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/da/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/da/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/da/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/da/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/da/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/da/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/da/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/da/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/da/Tools.md` → 无直接路径匹配
  - `concepts/de/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/de/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/de/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/de/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/de/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/de/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/de/Tool-Projects.md` → 无直接路径匹配
  - `concepts/de/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/de/Tool-REPL.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/de/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/de/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/de/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/de/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/de/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/de/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/de/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/de/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/de/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/de/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/de/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/de/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/de/Tools.md` → 无直接路径匹配
  - `concepts/en/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/en/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/en/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/en/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/en/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/en/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/en/Tool-Projects.md` → 无直接路径匹配
  - `concepts/en/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/en/Tool-REPL.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/en/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/en/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/en/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/en/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/en/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/en/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/en/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/en/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/en/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/en/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/en/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/en/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/en/Tools.md` → 本地候选：`concepts/en/Tools.md`
  - `concepts/es/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/es/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/es/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/es/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/es/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/es/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/es/Tool-Projects.md` → 无直接路径匹配
  - `concepts/es/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/es/Tool-REPL.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/es/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/es/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/es/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/es/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/es/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/es/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/es/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/es/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/es/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/es/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/es/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/es/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/es/Tools.md` → 无直接路径匹配
  - `concepts/fr/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/fr/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/fr/Tool-Projects.md` → 无直接路径匹配
  - `concepts/fr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/fr/Tool-REPL.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/fr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/fr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/fr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/fr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/fr/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/fr/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/fr/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/fr/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/fr/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/fr/Tools.md` → 无直接路径匹配
  - `concepts/it/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/it/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/it/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/it/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/it/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/it/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/it/Tool-Projects.md` → 无直接路径匹配
  - `concepts/it/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/it/Tool-REPL.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/it/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/it/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/it/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/it/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/it/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/it/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/it/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/it/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/it/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/it/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/it/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/it/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/it/Tools.md` → 无直接路径匹配
  - `concepts/ja/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ja/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ja/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ja/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ja/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ja/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ja/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ja/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ja/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ja/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ja/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ja/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ja/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ja/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ja/Tools.md` → 无直接路径匹配
  - `concepts/ko/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ko/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ko/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ko/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ko/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ko/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ko/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ko/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ko/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ko/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ko/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ko/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ko/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ko/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ko/Tools.md` → 无直接路径匹配
  - `concepts/no/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/no/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/no/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/no/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/no/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/no/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/no/Tool-Projects.md` → 无直接路径匹配
  - `concepts/no/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/no/Tool-REPL.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/no/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/no/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/no/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/no/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/no/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/no/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/no/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/no/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/no/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/no/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/no/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/no/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/no/Tools.md` → 无直接路径匹配
  - `concepts/pl/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/pl/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/pl/Tool-Projects.md` → 无直接路径匹配
  - `concepts/pl/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/pl/Tool-REPL.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/pl/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/pl/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/pl/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/pl/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/pl/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/pl/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/pl/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/pl/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/pl/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/pl/Tools.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-Projects.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-REPL.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/pt-BR/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/pt-BR/Tools.md` → 无直接路径匹配
  - `concepts/ru/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/ru/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/ru/Tool-Projects.md` → 无直接路径匹配
  - `concepts/ru/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/ru/Tool-REPL.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/ru/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/ru/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/ru/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/ru/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/ru/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/ru/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/ru/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/ru/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/ru/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/ru/Tools.md` → 无直接路径匹配
  - `concepts/th/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/th/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/th/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/th/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/th/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/th/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/th/Tool-Projects.md` → 无直接路径匹配
  - `concepts/th/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/th/Tool-REPL.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/th/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/th/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/th/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/th/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/th/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/th/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/th/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/th/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/th/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/th/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/th/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/th/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/th/Tools.md` → 无直接路径匹配
  - `concepts/tr/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/tr/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/tr/Tool-Projects.md` → 无直接路径匹配
  - `concepts/tr/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/tr/Tool-REPL.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/tr/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/tr/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/tr/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/tr/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/tr/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/tr/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/tr/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/tr/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/tr/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/tr/Tools.md` → 无直接路径匹配
  - `concepts/uk/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/uk/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/uk/Tool-Projects.md` → 无直接路径匹配
  - `concepts/uk/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/uk/Tool-REPL.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/uk/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/uk/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/uk/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/uk/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/uk/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/uk/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/uk/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/uk/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/uk/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/uk/Tools.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-Projects.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-REPL.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/zh-TW/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/zh-TW/Tools.md` → 无直接路径匹配
  - `concepts/zh/Tool-EndConversation.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListAgents.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListConnectors.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListMcpResources.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListPlugins.md` → 无直接路径匹配
  - `concepts/zh/Tool-ListSkills.md` → 无直接路径匹配
  - `concepts/zh/Tool-Projects.md` → 无直接路径匹配
  - `concepts/zh/Tool-ProposeGoal.md` → 无直接路径匹配
  - `concepts/zh/Tool-REPL.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadMcpResource.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadMcpResourceDir.md` → 无直接路径匹配
  - `concepts/zh/Tool-ReadNotifications.md` → 无直接路径匹配
  - `concepts/zh/Tool-SearchMcpRegistry.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendFeedback.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendFile.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendUserFile.md` → 无直接路径匹配
  - `concepts/zh/Tool-SendUserMessage.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestConnectors.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestPluginInstall.md` → 无直接路径匹配
  - `concepts/zh/Tool-SuggestSkills.md` → 无直接路径匹配
  - `concepts/zh/Tool-TeamCreate.md` → 无直接路径匹配
  - `concepts/zh/Tool-TeamDelete.md` → 无直接路径匹配
  - `concepts/zh/Tool-TodoWrite.md` → 无直接路径匹配
  - `concepts/zh/Tool-executeCode.md` → 无直接路径匹配
  - `concepts/zh/Tool-getDiagnostics.md` → 无直接路径匹配
  - `concepts/zh/Tools.md` → 本地候选：`concepts/zh/Tools.md`
  - `history.md` → 无直接路径匹配
  - `src/i18n.js` → 本地候选：`src/i18n.js`
  - `src/utils/toolCatalog.js` → 本地候选：`src/utils/toolCatalog.js`

<a id="commit-9255663e33"></a>
## [9255663e33](https://github.com/weiesky/cc-viewer/commit/9255663e33c76d106835cf8b801be09b04175882) — fix: CVE-2026-39244 security vulnerability
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9255663e33)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9255663e33)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-17T13:35:58+00:00；作者时间：2026-08-17T13:35:58+00:00；父提交：3cc05b496d。
- B0 结论：该上游依赖变更不适用：本地 lockfile 与当前 npm ls 未发现 adm-zip；其他归档风险需独立审计。 见 [定向核验证据](./B0-commit-lineage.md#b0-dependency-audit)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（2 个）：
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`

<a id="commit-3cc05b496d"></a>
## [3cc05b496d](https://github.com/weiesky/cc-viewer/commit/3cc05b496dd2c0535df492455001b2524d091ef4) — feat(proxy): per-role proxy sources for Main Agent / Sub-Agent / Teammate (1.7.22)
- 2026-11-21 B4 E61：实际runtime范围已核；角色分源/模型窗口策略归B8尚未迁入，B4仅复用已验真实身份/保持用户既选用量条，不将整笔勾选。无运行时改动，具体阅读边界/后续责任见[B4.64](./B4-implementation.md)与[B4代理窗口回执](./B4-role-window-scope-2026-11-21.json)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3cc05b496d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3cc05b496d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-17T08:03:36-04:00；作者时间：2026-08-17T08:03:36-04:00；父提交：ea8c5e39e0。
- B0 本地关键代码对照：现有能力与协议/部署待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**B / 多工作区与恢复**；状态：待人工核验。
- 处理建议：核对工作区/进程/会话身份映射；先验证串扰、关闭及恢复后再选择移植。
- 上游改动路径（53 个）：
  - `README.md` → 本地候选：`README.md`
  - `concepts/en/ProxySwitch.md` → 本地候选：`concepts/en/ProxySwitch.md`
  - `concepts/zh/ProxySwitch.md` → 本地候选：`concepts/zh/ProxySwitch.md`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `docs/refactor/WIRE_FORMAT_V3.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `server/interceptor.js` → 本地候选：`interceptor.js`
  - `server/lib/interceptor-core.js` → 本地候选：`lib/interceptor-core.js`
  - `server/lib/v2/adapter.js` → 无直接路径匹配
  - `server/lib/v2/live-feed.js` → 无直接路径匹配
  - `server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `server/proxy.js` → 本地候选：`proxy.js`
  - `server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `src/App.jsx` → 本地候选：`src/App.jsx`
  - `src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `src/components/settings/ProxyModal.jsx` → 本地候选：`src/components/settings/ProxyModal.jsx`
  - `src/components/settings/ProxyModal.module.css` → 本地候选：`src/components/settings/ProxyModal.module.css`
  - `src/i18n.js` → 本地候选：`src/i18n.js`
  - `src/utils/v3Assembler.js` → 无直接路径匹配
  - `src/utils/v3Rows.js` → 无直接路径匹配
  - `test/api-preferences-gap.test.js` → 无直接路径匹配
  - `test/branch-interceptor.test.js` → 无直接路径匹配
  - `test/interceptor-fetch-errors.test.js` → 无直接路径匹配
  - `test/interceptor-profile.test.js` → 无直接路径匹配
  - `test/interceptor-workspace-init.test.js` → 无直接路径匹配
  - `test/new-ui-i18n.test.js` → 无直接路径匹配
  - `test/proxy-profile-isolation.test.js` → 无直接路径匹配
  - `test/proxy-role-custom-endpoint.test.js` → 无直接路径匹配
  - `test/proxy-role-proxy-mode.test.js` → 无直接路径匹配
  - `test/proxy-role-routing.test.js` → 无直接路径匹配
  - `test/spawn-model-resolver.test.js` → 无直接路径匹配

<a id="commit-ea8c5e39e0"></a>
## [ea8c5e39e0](https://github.com/weiesky/cc-viewer/commit/ea8c5e39e07dabce557e9a9439effdd8cb95b69f) — fix(test): cli-boot fixture shadows real /usr/local/bin/claude via PATH shim
- B0 本地关键代码对照：上游修复 Claude 测试夹具 PATH 遮蔽真实可执行文件；本地测试结构不同，当前无 tests/cli-boot.test.js，需检查 Codex 测试是否依赖机器全局 CLI，归 B11 测试隔离。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-ea8c5e39e0)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ea8c5e39e0)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ea8c5e39e0)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-17T00:48:40-04:00；作者时间：2026-08-17T00:48:40-04:00；父提交：02ce99f202。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（1 个）：
  - `test/cli-boot.test.js` → 无直接路径匹配

<a id="commit-5c468c042e"></a>
## [5c468c042e](https://github.com/weiesky/cc-viewer/commit/5c468c042eeca2c3dc1ee300d1d022f145f22160) — fix: CVE-2026-13676 security vulnerability
- [B0 upstream full commit message](./B0-upstream-messages.md#message-5c468c042e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-5c468c042e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-17T04:30:14+00:00；作者时间：2026-08-17T04:30:14+00:00；父提交：02ce99f202。
- B0 结论：已具备该 CVE 的修复版本：本地 lockfile 和现有安装均为 fast-uri 3.1.3；仅针对 CVE-2026-13676。 见 [定向核验证据](./B0-commit-lineage.md#b0-dependency-audit)。
- 初筛批次：**A / 配置与安全**；状态：待人工核验。
- 处理建议：审查数据格式、并发写及敏感信息处理；设计备份、迁移和失败回滚。
- 上游改动路径（2 个）：
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`

<a id="commit-02ce99f202"></a>
## [02ce99f202](https://github.com/weiesky/cc-viewer/commit/02ce99f2027e6e62d0c84417694e10c2484bb3a8) — feat(system-prompt): auto header entry, model-aware default tab, chip icon
- B0 本地关键代码对照：本地 AppHeader.jsx 已能打开 SystemTextModal，但上游自动入口、按模型选择默认页及 chip 图标未因此得到证明；逐项比较 Codex 模型状态与入口，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-02ce99f202)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-02ce99f202)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-02ce99f202)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-17T00:16:49-04:00；作者时间：2026-08-17T00:16:20-04:00；父提交：7b0d3646d9。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（8 个）：
  - `electron/tab-bar.html` → 本地候选：`electron/tab-bar.html`
  - `history.md` → 无直接路径匹配
  - `server/routes/expert.js` → 无直接路径匹配
  - `src/components/common/ChipIcon.jsx` → 无直接路径匹配
  - `src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `src/components/settings/SystemTextModal.jsx` → 本地候选：`src/components/settings/SystemTextModal.jsx`
  - `test/api-expert-model-prompts.test.js` → 无直接路径匹配
  - `test/api-expert-system-prompt-status.test.js` → 无直接路径匹配

<a id="commit-7b0d3646d9"></a>
## [7b0d3646d9](https://github.com/weiesky/cc-viewer/commit/7b0d3646d9ae464763c133287b47f02859346ee1) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-7b0d3646d9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-7b0d3646d9)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-17T04:01:01+00:00；作者时间：2026-08-17T04:01:01+00:00；父提交：69b104cbf3。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-69b104cbf3"></a>
## [69b104cbf3](https://github.com/weiesky/cc-viewer/commit/69b104cbf3333232fb4b6ed999160716fabc8f63) — feat(system-prompt): type-ahead model names in "+ Add model" dialog (1.7.21)
- B0 本地关键代码对照：本地 ModelPromptTabs.jsx 的新增模型输入框为普通 Input，未接入上游 modelSuggestions.js 的候选补全；应改用 Codex 实际可用模型来源并验证离线/键盘交互，归 B8。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-69b104cbf3)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-69b104cbf3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-69b104cbf3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-16T11:11:26-04:00；作者时间：2026-08-16T11:11:26-04:00；父提交：0c12335e53。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（26 个）：
  - `README.md` → 本地候选：`README.md`
  - `docs/README.ar.md` → 无直接路径匹配
  - `docs/README.da.md` → 无直接路径匹配
  - `docs/README.de.md` → 无直接路径匹配
  - `docs/README.es.md` → 无直接路径匹配
  - `docs/README.fr.md` → 无直接路径匹配
  - `docs/README.it.md` → 无直接路径匹配
  - `docs/README.ja.md` → 无直接路径匹配
  - `docs/README.ko.md` → 无直接路径匹配
  - `docs/README.no.md` → 无直接路径匹配
  - `docs/README.pl.md` → 无直接路径匹配
  - `docs/README.pt-BR.md` → 无直接路径匹配
  - `docs/README.ru.md` → 无直接路径匹配
  - `docs/README.th.md` → 无直接路径匹配
  - `docs/README.tr.md` → 无直接路径匹配
  - `docs/README.uk.md` → 无直接路径匹配
  - `docs/README.zh-TW.md` → 无直接路径匹配
  - `docs/README.zh.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`
  - `src/components/settings/ModelPromptTabs.jsx` → 本地候选：`src/components/settings/ModelPromptTabs.jsx`
  - `src/components/settings/SystemTextModal.jsx` → 本地候选：`src/components/settings/SystemTextModal.jsx`
  - `src/components/settings/SystemTextModal.module.css` → 本地候选：`src/components/settings/SystemTextModal.module.css`
  - `src/utils/modelSuggestions.js` → 无直接路径匹配
  - `test/model-suggestions.test.js` → 无直接路径匹配

<a id="commit-0c12335e53"></a>
## [0c12335e53](https://github.com/weiesky/cc-viewer/commit/0c12335e534109ae0d666292e2441e5d225beb79) — fix(release): bump package version to 1.7.20
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0c12335e53)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0c12335e53)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-12T16:12:40+08:00；作者时间：2026-08-12T16:12:40+08:00；父提交：d88982c6ce。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（3 个）：
  - `history.md` → 无直接路径匹配
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`

<a id="commit-d88982c6ce"></a>
## [d88982c6ce](https://github.com/weiesky/cc-viewer/commit/d88982c6ce2591f4f92cadd1848748403ce1c762) — fix(codefuse): exit managed CCV with Claude (1.7.19)
- B0 本地关键代码对照：该修复针对上游 CodeFuse 管理的 Claude 进程生命周期；本地 cli.js 以 Codex 为关键进程，未见同名管理模式；不直接移植，仍须核验 Codex 子进程退出与服务关闭，归 B11。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-d88982c6ce)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-d88982c6ce)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-d88982c6ce)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-12T13:56:18+08:00；作者时间：2026-08-12T13:55:18+08:00；父提交：94e110620d。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（5 个）：
  - `cli.js` → 本地候选：`cli.js`
  - `history.md` → 无直接路径匹配
  - `server/lib/codefuse-managed-mode.js` → 无直接路径匹配
  - `test/cli-boot.test.js` → 无直接路径匹配
  - `test/codefuse-managed-mode.test.js` → 无直接路径匹配

<a id="commit-94e110620d"></a>
## [94e110620d](https://github.com/weiesky/cc-viewer/commit/94e110620d3dc23037df2d7f9fed1b670bec30f3) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-94e110620d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-94e110620d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-10T04:52:55+00:00；作者时间：2026-08-10T04:52:55+00:00；父提交：b78a51eb1d。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-b78a51eb1d"></a>
## [b78a51eb1d](https://github.com/weiesky/cc-viewer/commit/b78a51eb1dc46c8c115b9b6248a197e612f5a838) — fix(system-prompt): bare k3 resolves to the Kimi entry (1.7.18)
- B0 本地关键代码对照：上游对裸 k3 扩展 kimi 别名；本地 lib/model-system-prompts.js 的 bestMatch 只用模型名包含条目名，未见相同别名扩展；仅在支持此模型及代理时评估适用性，归 B8。该提交同时包含 composer 发布元数据，相关视觉单独核验。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-b78a51eb1d)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b78a51eb1d)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b78a51eb1d)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-08T12:39:22+08:00；作者时间：2026-08-08T12:39:22+08:00；父提交：73e4b44ccd。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（5 个）：
  - `history.md` → 无直接路径匹配
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`
  - `server/lib/model-system-prompts.js` → 本地候选：`lib/model-system-prompts.js`
  - `test/model-system-prompts.test.js` → 本地候选：`tests/model-system-prompts.test.js`

<a id="commit-73e4b44ccd"></a>
## [73e4b44ccd](https://github.com/weiesky/cc-viewer/commit/73e4b44ccdf0506117ddc96b7f83352fc6755501) — Merge pull request #139 from weiesky/feat/chat-composer-polish
- [B0 upstream full commit message](./B0-upstream-messages.md#message-73e4b44ccd)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-73e4b44ccd)

- B0 血缘：相对第一父分支引入窗口内 2 条可达提交：[fcfef597dd](#commit-fcfef597dd), [e12dcaded9](#commit-e12dcaded9)。合并与分支变更不得重复计算。

- 提交时间：2026-08-07T07:10:05-04:00；作者时间：2026-08-07T07:10:05-04:00；父提交：f3a8413db9, fcfef597dd。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（6 个）：
  - `history.md` → 无直接路径匹配
  - `src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `src/global.css` → 本地候选：`src/global.css`

<a id="commit-fcfef597dd"></a>
## [fcfef597dd](https://github.com/weiesky/cc-viewer/commit/fcfef597ddaa3c754b641a13b6f989e1b83af775) — ui(chat): scope the 1400px chat cap to message items via .container > *
- B0 本地关键代码对照：本地 ChatView.module.css 的 .container > * 已限制 1400px 并居中，与上游同类选择器一致；仍需检查虚拟列表等结构的显示效果，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-fcfef597dd)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-fcfef597dd)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-fcfef597dd)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-07T16:20:04+08:00；作者时间：2026-08-07T16:18:37+08:00；父提交：e12dcaded9。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（1 个）：
  - `src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`

<a id="commit-e12dcaded9"></a>
## [e12dcaded9](https://github.com/weiesky/cc-viewer/commit/e12dcaded939f2d9bee67c226e03fc0aaed8d253) — ui(chat): PC composer polish — 1000px cap, themed strip, white card + shadow, focus-expand animation
- B0 本地关键代码对照：本地 ChatInputBar.module.css 已有 1000px 居中 padding 和 focus-within，不能仅凭样式断定完整对齐；逐项核对桌面视觉、动画和移动端回归，归 B7。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-e12dcaded9)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-e12dcaded9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-e12dcaded9)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-07T16:20:04+08:00；作者时间：2026-08-07T15:53:04+08:00；父提交：f3a8413db9。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（6 个）：
  - `history.md` → 无直接路径匹配
  - `src/components/chat/ChatInputBar.jsx` → 本地候选：`src/components/chat/ChatInputBar.jsx`
  - `src/components/chat/ChatInputBar.module.css` → 本地候选：`src/components/chat/ChatInputBar.module.css`
  - `src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `src/global.css` → 本地候选：`src/global.css`

<a id="commit-f3a8413db9"></a>
## [f3a8413db9](https://github.com/weiesky/cc-viewer/commit/f3a8413db9f99691ef94f54279cedc2913e0c1f0) — fix(chat): wire-agent identity for teammate/subagent classification (1.7.17)
- B0 本地关键代码对照：上游补充 wire agent identity 的写入、过滤和愈合；本地 lib/appserver-bridge.js 已维护线程 agent 身份，lib/interceptor-core.js 也分类子代理，协议不同；需按 Codex 真实事件核对丢身份和跨会话误归类，归 B2/B3。 [文件与测试证据](./B0-commit-file-evidence.md#evidence-f3a8413db9)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-f3a8413db9)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-f3a8413db9)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-05T04:19:23+08:00；作者时间：2026-08-05T04:19:23+08:00；父提交：e4fc788b9e。
- 初筛批次：**C / SDK 与 Agent 状态**；状态：待人工核验。
- 处理建议：对照 Codex SDK 和 app-server 事件；Claude 专属字段不能直接复用。
- 上游改动路径（18 个）：
  - `docs/refactor/WIRE_FORMAT_V2.md` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `server/lib/v2/adapter.js` → 无直接路径匹配
  - `server/lib/v2/agent-id.js` → 无直接路径匹配
  - `server/lib/v2/live-feed.js` → 无直接路径匹配
  - `server/lib/v2/meta-rows.js` → 无直接路径匹配
  - `server/lib/v2/v2-writer.js` → 无直接路径匹配
  - `src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `src/utils/contentFilter.js` → 本地候选：`src/utils/contentFilter.js`
  - `src/utils/identityHeal.js` → 本地候选：`src/utils/identityHeal.js`
  - `src/utils/requestType.js` → 本地候选：`src/utils/requestType.js`
  - `src/utils/v3Assembler.js` → 无直接路径匹配
  - `test/agent-id.test.js` → 无直接路径匹配
  - `test/content-filter-unit.test.js` → 无直接路径匹配
  - `test/interceptor-v2-write.test.js` → 无直接路径匹配
  - `test/request-type-unit.test.js` → 无直接路径匹配
  - `test/v2-meta-rows.test.js` → 无直接路径匹配

<a id="commit-e4fc788b9e"></a>
## [e4fc788b9e](https://github.com/weiesky/cc-viewer/commit/e4fc788b9e324c8b1604a20eac541d88bade78ec) — fix(v2-read): finalize crash orphans as completed deltas on cold reads (1.7.16)
- 2026-11-20 B3当前结论：本地格式等效已验证：32f6d94实际canonical writer预提交故障/重开，输入slice保留，未提交不可见，投影/normalizer/sessionMerge无虚构answer；不将Codex进行中记录强制改completed。Claude缺done转换规则不照搬。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-e4fc788b9e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-e4fc788b9e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-05T02:25:30+08:00；作者时间：2026-08-05T02:25:17+08:00；父提交：4c2765d308。
- B0 本地关键代码对照：上游与本地入口、处理建议见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)，需按实际协议和数据流验证。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（11 个）：
  - `history.md` → 无直接路径匹配
  - `server/lib/v2/adapter.js` → 无直接路径匹配
  - `src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `src/components/chat/ChatView.module.css` → 本地候选：`src/components/chat/ChatView.module.css`
  - `src/i18n.js` → 本地候选：`src/i18n.js`
  - `src/utils/sessionMerge.js` → 本地候选：`src/utils/sessionMerge.js`
  - `test/branch-utils-sessionMerge.test.js` → 无直接路径匹配
  - `test/delta-reorder.test.js` → 无直接路径匹配
  - `test/session-boundary-parity.test.js` → 无直接路径匹配
  - `test/v2-adapter-incremental.test.js` → 无直接路径匹配

<a id="commit-4c2765d308"></a>
## [4c2765d308](https://github.com/weiesky/cc-viewer/commit/4c2765d308d530f61b47d814519816a9e21f2bd6) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-4c2765d308)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-4c2765d308)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-03T06:33:40+00:00；作者时间：2026-08-03T06:33:40+00:00；父提交：fc68e850f2。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-fc68e850f2"></a>
## [fc68e850f2](https://github.com/weiesky/cc-viewer/commit/fc68e850f23ad28a453eb5219c8113c7165086f9) — feat(chat): support Claude Code 2.x JSONL transcripts with tool_result images (1.7.15)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-fc68e850f2)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-fc68e850f2)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-03T13:42:44+08:00；作者时间：2026-08-03T13:42:44+08:00；父提交：8c8b96eafe。
- B0 本地关键代码对照：上游与本地入口、处理建议见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)，需按实际协议和数据流验证。
- 初筛批次：**J / 对话与输入体验**；状态：待人工核验。
- 处理建议：比对现有 UI、移动端和 SDK/PTy 两种路径；按用户交互分拆。
- 上游改动路径（22 个）：
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `server/lib/delta-reconstructor.js` → 本地候选：`server/lib/delta-reconstructor.js`
  - `server/lib/v2-transcript-normalizer.js` → 无直接路径匹配
  - `src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `src/components/chat/ChatMessage.jsx` → 本地候选：`src/components/chat/ChatMessage.jsx`
  - `src/components/chat/ChatMessage.module.css` → 本地候选：`src/components/chat/ChatMessage.module.css`
  - `src/components/chat/ChatView.jsx` → 本地候选：`src/components/chat/ChatView.jsx`
  - `src/components/dashboard/DetailPanel.jsx` → 本地候选：`src/components/dashboard/DetailPanel.jsx`
  - `src/components/dashboard/RequestList.jsx` → 本地候选：`src/components/dashboard/RequestList.jsx`
  - `src/components/viewers/ToolResultView.jsx` → 本地候选：`src/components/viewers/ToolResultView.jsx`
  - `src/components/viewers/ToolResultView.module.css` → 本地候选：`src/components/viewers/ToolResultView.module.css`
  - `src/utils/sessionManager.js` → 本地候选：`src/utils/sessionManager.js`
  - `src/utils/toolResultBuilder.js` → 本地候选：`src/utils/toolResultBuilder.js`
  - `src/utils/toolResultCore.js` → 本地候选：`src/utils/toolResultCore.js`
  - `test/client-safe-imports.test.js` → 无直接路径匹配
  - `test/delta-reconstructor.test.js` → 无直接路径匹配
  - `test/should-inline-tool-images.test.js` → 无直接路径匹配
  - `test/timestamp-assignment.test.js` → 无直接路径匹配
  - `test/v2-image-pipeline.test.js` → 无直接路径匹配
  - `test/v2-transcript-incremental.test.js` → 无直接路径匹配
  - `test/v2-transcript-normalizer.test.js` → 无直接路径匹配

<a id="commit-8c8b96eafe"></a>
## [8c8b96eafe](https://github.com/weiesky/cc-viewer/commit/8c8b96eafe3c6229c3c4dedbd462632dfda51a87) — fix(release): bump version to 1.7.14 for re-publish
- [B0 upstream full commit message](./B0-upstream-messages.md#message-8c8b96eafe)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-8c8b96eafe)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-03T00:24:46+08:00；作者时间：2026-08-03T00:24:46+08:00；父提交：9c0463bb8c。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `package.json` → 本地候选：`package.json`

<a id="commit-9c0463bb8c"></a>
## [9c0463bb8c](https://github.com/weiesky/cc-viewer/commit/9c0463bb8c57d99a5f045ea992a541219c3f8d94) — prompt(kimi): anti-loop guardrails in kimi-k3/k2.7-code system-prompt presets (1.7.14)
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9c0463bb8c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9c0463bb8c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-01T17:15:34+08:00；作者时间：2026-08-01T17:15:34+08:00；父提交：6baff0cd6f。
- B0 本地关键代码对照：数据源、现有实现和待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（3 个）：
  - `history.md` → 无直接路径匹配
  - `server/system-prompt-templates/presets/kimi-k2.7-code.md` → 无直接路径匹配
  - `server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配

<a id="commit-6baff0cd6f"></a>
## [6baff0cd6f](https://github.com/weiesky/cc-viewer/commit/6baff0cd6f3235daba1777ccd3c0919030596146) — feat(log-list): perf cache + server-side pagination + project switcher (1.7.13)
- 2026-11-20 B3：`363d061`canonical列表服务端分页、复用现有summary缓存；`4883004`迁入50行分页/查看项目/宿主布局。17/17物化器、3/3路由、Web248/248；真实Safari51→50+1、切项目及重开通过。Claude V1迁移提示/TTL等混合子项仍按本地格式核对，不整条勾选。详见[B3第二轮](./B3-transport-and-pagination.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6baff0cd6f)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6baff0cd6f)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-08-01T02:57:48+08:00；作者时间：2026-08-01T02:57:48+08:00；父提交：e932bbef2e。
- B0 本地关键代码对照：数据源、现有实现和待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**K / 终端与跨平台**；状态：待人工核验。
- 处理建议：检查现有 PTY/Electron/移动端链路；按平台复现，不直接复制 Claude 启动逻辑。
- 上游改动路径（21 个）：
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `server/lib/log-management.js` → 本地候选：`lib/log-management.js`
  - `server/lib/v2/adapter.js` → 无直接路径匹配
  - `server/lib/v2/convert-manager.js` → 无直接路径匹配
  - `server/lib/v2/migrate-prompt.js` → 无直接路径匹配
  - `server/lib/v2/session-list.js` → 无直接路径匹配
  - `server/lib/v2/session-select.js` → 无直接路径匹配
  - `server/routes/logs.js` → 无直接路径匹配
  - `src/App.jsx` → 本地候选：`src/App.jsx`
  - `src/App.module.css` → 本地候选：`src/App.module.css`
  - `src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `src/Mobile.jsx` → 本地候选：`src/Mobile.jsx`
  - `src/components/viewers/LogTable.jsx` → 本地候选：`src/components/viewers/LogTable.jsx`
  - `src/i18n.js` → 本地候选：`src/i18n.js`
  - `test/api-logs-gap.test.js` → 无直接路径匹配
  - `test/migrate-prompt.test.js` → 无直接路径匹配
  - `test/server-logs.test.js` → 无直接路径匹配
  - `test/v2-convert.test.js` → 无直接路径匹配
  - `test/v2-core.test.js` → 无直接路径匹配
  - `test/v2-session-list.test.js` → 无直接路径匹配

<a id="commit-e932bbef2e"></a>
## [e932bbef2e](https://github.com/weiesky/cc-viewer/commit/e932bbef2eb3456c4424b6eaab41fe3d68eb4d27) — feat(context): kimi logo refresh + context-window follows hot-switched model
- [B0 upstream full commit message](./B0-upstream-messages.md#message-e932bbef2e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-e932bbef2e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-30T23:47:39+08:00；作者时间：2026-07-30T23:47:39+08:00；父提交：82db2b907c。
- B0 本地关键代码对照：数据源、现有实现和待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（14 个）：
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `server/lib/context-rules.js` → 本地候选：`server/lib/context-rules.js`
  - `server/lib/context-watcher.js` → 本地候选：`lib/context-watcher.js`
  - `server/lib/log-watcher.js` → 无直接路径匹配
  - `server/routes/events.js` → 无直接路径匹配
  - `src/img/model-kimi.svg` → 本地候选：`src/img/model-kimi.svg`
  - `src/utils/effectiveModel.js` → 无直接路径匹配
  - `src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `test/context-rules.test.js` → 无直接路径匹配
  - `test/context-watcher.test.js` → 无直接路径匹配
  - `test/events-kv-context-scan.test.js` → 无直接路径匹配
  - `test/helpers-unit-a.test.js` → 无直接路径匹配
  - `test/helpers.test.js` → 无直接路径匹配

<a id="commit-82db2b907c"></a>
## [82db2b907c](https://github.com/weiesky/cc-viewer/commit/82db2b907c685a36f9590e9be0877cdbad3b7222) — ui(proxy-stats): align retry stats chart colors with app theme; release 1.7.11
- [B0 upstream full commit message](./B0-upstream-messages.md#message-82db2b907c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-82db2b907c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-29T11:50:00+08:00；作者时间：2026-07-29T11:50:00+08:00；父提交：0f3c16d6c7。
- B0 本地关键代码对照：数据源、现有实现和待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（6 个）：
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `src/components/charts/BarChart.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsDashboard.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/RetryStatsHelpers.jsx` → 无直接路径匹配
  - `src/global.css` → 本地候选：`src/global.css`

<a id="commit-0f3c16d6c7"></a>
## [0f3c16d6c7](https://github.com/weiesky/cc-viewer/commit/0f3c16d6c785fb48e17062e880fec29c3d6eea72) — Merge pull request #135 from souloss/fix/ci-flakes-brotli-rmsync
- [B0 upstream full commit message](./B0-upstream-messages.md#message-0f3c16d6c7)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-0f3c16d6c7)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[c768e8beb3](#commit-c768e8beb3)。合并与分支变更不得重复计算。

- 提交时间：2026-07-28T11:45:08-04:00；作者时间：2026-07-28T11:45:08-04:00；父提交：617da66c96, c768e8beb3。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（4 个）：
  - `history.md` → 无直接路径匹配
  - `test/_helpers/rm-sync.mjs` → 无直接路径匹配
  - `test/branch-server.test.js` → 无直接路径匹配
  - `test/server-ports-busy.test.js` → 无直接路径匹配

<a id="commit-c768e8beb3"></a>
## [c768e8beb3](https://github.com/weiesky/cc-viewer/commit/c768e8beb34ce718fe58abe49607b0abc3eb1d58) — fix(test): stop viewer resources before cleanup
- [B0 upstream full commit message](./B0-upstream-messages.md#message-c768e8beb3)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-c768e8beb3)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-28T23:21:31+08:00；作者时间：2026-07-20T21:45:15+08:00；父提交：617da66c96。
- B0 本地关键代码对照：数据源、现有实现和待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B11；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（4 个）：
  - `history.md` → 无直接路径匹配
  - `test/_helpers/rm-sync.mjs` → 无直接路径匹配
  - `test/branch-server.test.js` → 无直接路径匹配
  - `test/server-ports-busy.test.js` → 无直接路径匹配

<a id="commit-617da66c96"></a>
## [617da66c96](https://github.com/weiesky/cc-viewer/commit/617da66c96568d4818f4b7e3f164b879be939ce3) — Merge pull request #134 from souloss/feat/proxy-retry-stream-idle
- [B0 upstream full commit message](./B0-upstream-messages.md#message-617da66c96)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-617da66c96)

- B0 血缘：相对第一父分支引入窗口内 1 条可达提交：[25e118170c](#commit-25e118170c)。合并与分支变更不得重复计算。

- 提交时间：2026-07-28T02:33:01-04:00；作者时间：2026-07-28T02:33:01-04:00；父提交：87432d4c5a, 25e118170c。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（4 个）：
  - `server/i18n.js` → 无直接路径匹配
  - `server/lib/proxy-retry.js` → 无直接路径匹配
  - `server/lib/stats-worker.js` → 本地候选：`lib/stats-worker.js`
  - `test/proxy-retry-stream-idle.test.js` → 无直接路径匹配

<a id="commit-25e118170c"></a>
## [25e118170c](https://github.com/weiesky/cc-viewer/commit/25e118170c5538401faf45bf7b39c7bdad1b6975) — fix(proxy-retry): preserve streaming response metadata
- [B0 upstream full commit message](./B0-upstream-messages.md#message-25e118170c)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-25e118170c)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-28T14:18:23+08:00；作者时间：2026-07-28T14:18:23+08:00；父提交：abffcc89cc。
- B0 本地关键代码对照：数据源、现有实现和待验收范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（2 个）：
  - `server/lib/proxy-retry.js` → 无直接路径匹配
  - `test/proxy-retry-stream-idle.test.js` → 无直接路径匹配

<a id="commit-87432d4c5a"></a>
## [87432d4c5a](https://github.com/weiesky/cc-viewer/commit/87432d4c5aed9ac923c9f138af92a3059abe2fca) — fix(migrate): respect status:'done' in pendingOf() to stop false re-prompts after migration
- 2026-11-20 B3当前结论：格式审计完成：Claude V1双写/migrate_prompt在本地不存在；canonical布局迁移receipt.complete直接返回，现有零写预览/完成幂等/备份/锁/坏归档隔离测试最终全量通过。不新建V1自动转换入口。 最终验证及边界见[B3完成矩阵](./B3-completion-matrix.md)与[分片实施](./B3-sharding.md)。
- [B0 upstream full commit message](./B0-upstream-messages.md#message-87432d4c5a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-87432d4c5a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-28T10:52:27+08:00；作者时间：2026-07-28T10:51:31+08:00；父提交：a803382c76。
- B0 本地关键代码对照：发现/打包/迁移的具体路径及待测范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B3；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（3 个）：
  - `history.md` → 无直接路径匹配
  - `server/lib/v2/migrate-prompt.js` → 无直接路径匹配
  - `test/migrate-prompt.test.js` → 无直接路径匹配

<a id="commit-a803382c76"></a>
## [a803382c76](https://github.com/weiesky/cc-viewer/commit/a803382c7631c61a86d19251f20d9c5af581b9e7) — Merge pull request #132 from souloss/fix/ccswitch-readonly-recovery
- [B0 upstream full commit message](./B0-upstream-messages.md#message-a803382c76)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-a803382c76)

- B0 血缘：相对第一父分支引入窗口内 2 条可达提交：[1db2a38eab](#commit-1db2a38eab), [b2d57c8d38](#commit-b2d57c8d38)。合并与分支变更不得重复计算。

- 提交时间：2026-07-27T05:30:24-04:00；作者时间：2026-07-27T05:30:24-04:00；父提交：071398e55a, 1db2a38eab。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（3 个）：
  - `history.md` → 无直接路径匹配
  - `server/lib/ccswitch-import.js` → 无直接路径匹配
  - `test/ccswitch-import.test.js` → 无直接路径匹配

<a id="commit-1db2a38eab"></a>
## [1db2a38eab](https://github.com/weiesky/cc-viewer/commit/1db2a38eabceceb2f86d63f2533c6fd36fb729e8) — fix(ccswitch-import): unify sqlite recovery retries
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1db2a38eab)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1db2a38eab)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-27T15:20:25+08:00；作者时间：2026-07-27T15:20:25+08:00；父提交：b2d57c8d38。
- B0 本地关键代码对照：发现/打包/迁移的具体路径及待测范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**X / 待人工归类**；状态：待人工核验。
- B0 人工分流：B8；依据与未验证事项见 [B0 记录](./B0-commit-lineage.md#b0-x-triage)。
- 处理建议：依据完整 diff、历史说明和对应 CX 代码逐项确认，不预判需要移植。
- 上游改动路径（2 个）：
  - `server/lib/ccswitch-import.js` → 无直接路径匹配
  - `test/ccswitch-import.test.js` → 无直接路径匹配

<a id="commit-b2d57c8d38"></a>
## [b2d57c8d38](https://github.com/weiesky/cc-viewer/commit/b2d57c8d381361f113bc022c891501cb390b3c7c) — Merge remote-tracking branch 'origin/main' into pr-132
- [B0 upstream full commit message](./B0-upstream-messages.md#message-b2d57c8d38)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-b2d57c8d38)

- B0 血缘：相对第一父分支引入窗口内 13 条可达提交：[071398e55a](#commit-071398e55a), [20e4a63b24](#commit-20e4a63b24), [9600351738](#commit-9600351738), [ef64e15621](#commit-ef64e15621), [1626575652](#commit-1626575652), [6bd3b80e58](#commit-6bd3b80e58), [00dd0eaf94](#commit-00dd0eaf94), [42207f7fd1](#commit-42207f7fd1), [60cb46ce98](#commit-60cb46ce98), [eef9fd870e](#commit-eef9fd870e), [935a33cc0a](#commit-935a33cc0a), [51b3443e57](#commit-51b3443e57), [3eb16102e5](#commit-3eb16102e5)。合并与分支变更不得重复计算。

- 提交时间：2026-07-27T15:15:33+08:00；作者时间：2026-07-27T15:15:33+08:00；父提交：9237626427, 071398e55a。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并存在冲突或错误；实际树相对自动合并树的差异路径：`history.md`。该结果不证明业务语义已审查。
- B0 冲突解决复核：`git show --cc` 显示合并树冲突解决仅涉及 `history.md`；其父分支的产品变更仍需逐项审查，不能由此判定功能不适用。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（53 个）：
  - `README.md` → 本地候选：`README.md`
  - `cli.js` → 本地候选：`cli.js`
  - `docs/README.zh.md` → 无直接路径匹配
  - `docs/star-history.svg` → 无直接路径匹配
  - `electron-builder.yml` → 无直接路径匹配
  - `electron/main.js` → 本地候选：`electron/main.js`
  - `findcc.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`
  - `server/lib/proxy-stats.js` → 无直接路径匹配
  - `server/pty-manager.js` → 本地候选：`pty-manager.js`
  - `server/routes/preferences.js` → 本地候选：`lib/preferences.js`
  - `server/system-prompt-templates/presets/index.json` → 无直接路径匹配
  - `server/system-prompt-templates/presets/kimi-k3.md` → 无直接路径匹配
  - `src/App.jsx` → 本地候选：`src/App.jsx`
  - `src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `src/components/charts/BarChart.jsx` → 无直接路径匹配
  - `src/components/charts/BarChart.module.css` → 无直接路径匹配
  - `src/components/charts/barChartHelpers.js` → 无直接路径匹配
  - `src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `src/components/dashboard/AppHeader.module.css` → 本地候选：`src/components/dashboard/AppHeader.module.css`
  - `src/components/proxy-stats/ProxyStatsDashboard.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsDashboard.module.css` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsModal.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsModal.module.css` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsPage.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsPage.module.css` → 无直接路径匹配
  - `src/components/proxy-stats/RetryStatsHelpers.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/UnifiedProxyRetryPage.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/UnifiedProxyRetryPage.module.css` → 无直接路径匹配
  - `src/components/settings/RetryConfigModal.jsx` → 无直接路径匹配
  - `src/components/settings/RetryConfigModal.module.css` → 无直接路径匹配
  - `src/i18n.js` → 本地候选：`src/i18n.js`
  - `src/utils/helpers.js` → 本地候选：`src/utils/helpers.js`
  - `test/api-preferences-gap.test.js` → 无直接路径匹配
  - `test/bar-chart-helpers.test.js` → 无直接路径匹配
  - `test/claude-lookup-test-guard.test.js` → 无直接路径匹配
  - `test/cli-import-paths.test.js` → 无直接路径匹配
  - `test/cli-modes.test.js` → 无直接路径匹配
  - `test/electron-node-execpath-regression.test.js` → 无直接路径匹配
  - `test/findcc-gap.test.js` → 无直接路径匹配
  - `test/helpers-unit-a.test.js` → 无直接路径匹配
  - `test/modal-mask.test.js` → 无直接路径匹配
  - `test/new-ui-i18n.test.js` → 无直接路径匹配
  - `test/proxy-stats.test.js` → 无直接路径匹配
  - `test/pty-manager-gap.test.js` → 无直接路径匹配
  - `test/retry-config-layout.test.js` → 无直接路径匹配
  - `test/sse-compression.test.js` → 无直接路径匹配
  - `test/system-prompt-builder.test.js` → 无直接路径匹配
  - `test/system-prompt-presets.test.js` → 无直接路径匹配
  - `test/windows-npm-root-regression.test.js` → 无直接路径匹配
  - `test/wire-compress.test.js` → 无直接路径匹配

<a id="commit-071398e55a"></a>
## [071398e55a](https://github.com/weiesky/cc-viewer/commit/071398e55aae06e80e98c345fde0dd339988c168) — chore(star-history): refresh chart [skip ci]
- [B0 upstream full commit message](./B0-upstream-messages.md#message-071398e55a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-071398e55a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-27T06:41:06+00:00；作者时间：2026-07-27T06:41:06+00:00；父提交：20e4a63b24。
- B0 决议：不适用：此提交仅更新上游 star-history 图像，与 cx-viewer 的功能对齐无关。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（1 个）：
  - `docs/star-history.svg` → 无直接路径匹配

<a id="commit-20e4a63b24"></a>
## [20e4a63b24](https://github.com/weiesky/cc-viewer/commit/20e4a63b2473a261bcaf63e8d1921391462e4f3a) — fix(test): drop install-layout assumption from the last-resort candidate assertion
- [B0 upstream full commit message](./B0-upstream-messages.md#message-20e4a63b24)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-20e4a63b24)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-27T10:41:52+08:00；作者时间：2026-07-27T10:39:52+08:00；父提交：9600351738。
- B0 本地关键代码对照：发现/打包/迁移的具体路径及待测范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（2 个）：
  - `history.md` → 无直接路径匹配
  - `test/windows-npm-root-regression.test.js` → 无直接路径匹配

<a id="commit-9600351738"></a>
## [9600351738](https://github.com/weiesky/cc-viewer/commit/96003517387ddc5c98130d7016ddeb6a9dad5bd3) — fix(electron): add missing src/utils/ to electron-builder bundle
- [B0 upstream full commit message](./B0-upstream-messages.md#message-9600351738)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-9600351738)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T23:48:06+08:00；作者时间：2026-07-26T23:48:06+08:00；父提交：ef64e15621。
- B0 本地关键代码对照：发现/打包/迁移的具体路径及待测范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**K / 终端与跨平台**；状态：待人工核验。
- 处理建议：检查现有 PTY/Electron/移动端链路；按平台复现，不直接复制 Claude 启动逻辑。
- 上游改动路径（3 个）：
  - `electron-builder.yml` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`

<a id="commit-ef64e15621"></a>
## [ef64e15621](https://github.com/weiesky/cc-viewer/commit/ef64e1562197ff0589d6d136258c572b05b1f2a2) — fix(findcc): move native resolution before PATH to avoid ERROR_BAD_EXE_FORMAT on Windows
- [B0 upstream full commit message](./B0-upstream-messages.md#message-ef64e15621)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-ef64e15621)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T21:37:19+08:00；作者时间：2026-07-26T21:37:19+08:00；父提交：1626575652。
- B0 本地关键代码对照：发现/打包/迁移的具体路径及待测范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**K / 终端与跨平台**；状态：待人工核验。
- 处理建议：检查现有 PTY/Electron/移动端链路；按平台复现，不直接复制 Claude 启动逻辑。
- 上游改动路径（4 个）：
  - `findcc.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `package.json` → 本地候选：`package.json`
  - `test/findcc-gap.test.js` → 无直接路径匹配

<a id="commit-1626575652"></a>
## [1626575652](https://github.com/weiesky/cc-viewer/commit/1626575652f870b94fa7e387dc97d1223e1f66ca) — chore(release): bump version to 1.7.8
- [B0 upstream full commit message](./B0-upstream-messages.md#message-1626575652)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-1626575652)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T17:12:24+08:00；作者时间：2026-07-26T17:12:24+08:00；父提交：6bd3b80e58。
- B0 决议：明确归属 B11：上游发布版本、依赖清单或变更说明元数据；不直接搬运上游版本号，关联功能和依赖变更仍应逐项核验。
- 初筛批次：**R / 发布与元数据**；状态：待人工核验。
- 处理建议：记录版本或发布上下文；无需按提交搬运，发布流程另行验证。
- 上游改动路径（3 个）：
  - `history.md` → 无直接路径匹配
  - `package-lock.json` → 本地候选：`package-lock.json`
  - `package.json` → 本地候选：`package.json`

<a id="commit-6bd3b80e58"></a>
## [6bd3b80e58](https://github.com/weiesky/cc-viewer/commit/6bd3b80e58e4c160697f296ed885b22a57f1b5a0) — fix(win): restore Claude discovery and Electron tab launch on Windows
- [B0 upstream full commit message](./B0-upstream-messages.md#message-6bd3b80e58)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-6bd3b80e58)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T17:06:42+08:00；作者时间：2026-07-26T17:06:42+08:00；父提交：00dd0eaf94。
- B0 本地关键代码对照：发现/打包/迁移的具体路径及待测范围见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**K / 终端与跨平台**；状态：待人工核验。
- 处理建议：检查现有 PTY/Electron/移动端链路；按平台复现，不直接复制 Claude 启动逻辑。
- 上游改动路径（7 个）：
  - `electron/main.js` → 本地候选：`electron/main.js`
  - `findcc.js` → 无直接路径匹配
  - `history.md` → 无直接路径匹配
  - `test/claude-lookup-test-guard.test.js` → 无直接路径匹配
  - `test/electron-node-execpath-regression.test.js` → 无直接路径匹配
  - `test/findcc-gap.test.js` → 无直接路径匹配
  - `test/windows-npm-root-regression.test.js` → 无直接路径匹配

<a id="commit-00dd0eaf94"></a>
## [00dd0eaf94](https://github.com/weiesky/cc-viewer/commit/00dd0eaf9448e5ceb62846457db8ec64749c3380) — Merge pull request #131 from souloss/feat/retry-stats-modal
- [B0 upstream full commit message](./B0-upstream-messages.md#message-00dd0eaf94)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-00dd0eaf94)

- B0 血缘：相对第一父分支引入窗口内 6 条可达提交：[42207f7fd1](#commit-42207f7fd1), [60cb46ce98](#commit-60cb46ce98), [eef9fd870e](#commit-eef9fd870e), [935a33cc0a](#commit-935a33cc0a), [51b3443e57](#commit-51b3443e57), [3eb16102e5](#commit-3eb16102e5)。合并与分支变更不得重复计算。

- 提交时间：2026-07-26T03:34:40-04:00；作者时间：2026-07-26T03:34:40-04:00；父提交：2df24215e1, 42207f7fd1。
- B0 决议：合并关系已追踪到父提交与分支；先复核合并冲突及分支提交，避免重复移植。
- B0 merge-tree 检查：自动合并结果与实际树一致。该结果不证明业务语义已审查。
- 初筛批次：**M / 合并记录**；状态：待人工核验。
- 处理建议：核对父提交和包含的子提交，避免重复移植；不单独 cherry-pick。
- 上游改动路径（27 个）：
  - `history.md` → 无直接路径匹配
  - `server/lib/proxy-stats.js` → 无直接路径匹配
  - `src/App.jsx` → 本地候选：`src/App.jsx`
  - `src/AppBase.jsx` → 本地候选：`src/AppBase.jsx`
  - `src/components/charts/BarChart.jsx` → 无直接路径匹配
  - `src/components/charts/BarChart.module.css` → 无直接路径匹配
  - `src/components/charts/barChartHelpers.js` → 无直接路径匹配
  - `src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `src/components/proxy-stats/ProxyStatsDashboard.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsDashboard.module.css` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsModal.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsModal.module.css` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsPage.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsPage.module.css` → 无直接路径匹配
  - `src/components/proxy-stats/RetryStatsHelpers.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/UnifiedProxyRetryPage.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/UnifiedProxyRetryPage.module.css` → 无直接路径匹配
  - `src/components/settings/RetryConfigModal.jsx` → 无直接路径匹配
  - `src/components/settings/RetryConfigModal.module.css` → 无直接路径匹配
  - `src/i18n.js` → 本地候选：`src/i18n.js`
  - `test/bar-chart-helpers.test.js` → 无直接路径匹配
  - `test/modal-mask.test.js` → 无直接路径匹配
  - `test/new-ui-i18n.test.js` → 无直接路径匹配
  - `test/proxy-stats.test.js` → 无直接路径匹配
  - `test/retry-config-layout.test.js` → 无直接路径匹配
  - `test/sse-compression.test.js` → 无直接路径匹配
  - `test/wire-compress.test.js` → 无直接路径匹配

<a id="commit-42207f7fd1"></a>
## [42207f7fd1](https://github.com/weiesky/cc-viewer/commit/42207f7fd152c868e9d2e05f9d8bd9bb920f8990) — fix(test): remove timing assumptions from brotli decode helpers
- [B0 upstream full commit message](./B0-upstream-messages.md#message-42207f7fd1)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-42207f7fd1)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T15:30:25+08:00；作者时间：2026-07-26T15:28:30+08:00；父提交：60cb46ce98。
- B0 本地关键代码对照：上游变化、现有能力和前置依赖见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**D / 实时与日志可靠性**；状态：待人工核验。
- 处理建议：对照 cx-viewer 日志和 App Server 流；复现故障并验证顺序、重连及数据完整性。
- 上游改动路径（2 个）：
  - `test/sse-compression.test.js` → 无直接路径匹配
  - `test/wire-compress.test.js` → 无直接路径匹配

<a id="commit-60cb46ce98"></a>
## [60cb46ce98](https://github.com/weiesky/cc-viewer/commit/60cb46ce985a940a3f7bf2bf6b597896b879abbe) — docs(history): condense the Unreleased proxy-stats entries
- [B0 upstream full commit message](./B0-upstream-messages.md#message-60cb46ce98)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-60cb46ce98)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T14:42:24+08:00；作者时间：2026-07-26T14:42:24+08:00；父提交：eef9fd870e。
- B0 本地关键代码对照：上游变化、现有能力和前置依赖见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（1 个）：
  - `history.md` → 无直接路径匹配

<a id="commit-eef9fd870e"></a>
## [eef9fd870e](https://github.com/weiesky/cc-viewer/commit/eef9fd870eacbada61e17d9ae4134450a7f9d0b5) — refactor: drop dead code left by the retry-stats redesign
- [B0 upstream full commit message](./B0-upstream-messages.md#message-eef9fd870e)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-eef9fd870e)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T14:42:16+08:00；作者时间：2026-07-26T14:42:16+08:00；父提交：935a33cc0a。
- B0 本地关键代码对照：上游变化、现有能力和前置依赖见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**N / 文档或维护**；状态：待人工核验。
- 处理建议：核对是否涉及用户行为；独立评估文档、重构及修复。
- 上游改动路径（6 个）：
  - `src/components/charts/BarChart.jsx` → 无直接路径匹配
  - `src/components/charts/BarChart.module.css` → 无直接路径匹配
  - `src/components/charts/barChartHelpers.js` → 无直接路径匹配
  - `src/components/dashboard/AppHeader.jsx` → 本地候选：`src/components/dashboard/AppHeader.jsx`
  - `src/components/settings/RetryConfigModal.jsx` → 无直接路径匹配
  - `test/bar-chart-helpers.test.js` → 无直接路径匹配

<a id="commit-935a33cc0a"></a>
## [935a33cc0a](https://github.com/weiesky/cc-viewer/commit/935a33cc0ad8d812276c99477eb4c0bf057924fd) — fix(proxy-stats): keep retryBurden range JSON-safe
- [B0 upstream full commit message](./B0-upstream-messages.md#message-935a33cc0a)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-935a33cc0a)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T14:42:06+08:00；作者时间：2026-07-26T14:42:06+08:00；父提交：51b3443e57。
- B0 本地关键代码对照：上游变化、现有能力和前置依赖见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（2 个）：
  - `server/lib/proxy-stats.js` → 无直接路径匹配
  - `test/proxy-stats.test.js` → 无直接路径匹配

<a id="commit-51b3443e57"></a>
## [51b3443e57](https://github.com/weiesky/cc-viewer/commit/51b3443e57d4081b46ea7f6ae90ba308c1dc32ce) — fix(proxy-stats): restore the stats-tab refresh controls
- [B0 upstream full commit message](./B0-upstream-messages.md#message-51b3443e57)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-51b3443e57)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T14:41:56+08:00；作者时间：2026-07-26T14:41:56+08:00；父提交：3eb16102e5。
- B0 本地关键代码对照：上游变化、现有能力和前置依赖见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（3 个）：
  - `src/components/proxy-stats/ProxyStatsDashboard.jsx` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsDashboard.module.css` → 无直接路径匹配
  - `src/components/proxy-stats/ProxyStatsModal.jsx` → 无直接路径匹配

<a id="commit-3eb16102e5"></a>
## [3eb16102e5](https://github.com/weiesky/cc-viewer/commit/3eb16102e5a82761d93b2ad9f6175eb87d195176) — fix(proxy-stats): make the config tab's scroll viewport resolve
- [B0 upstream full commit message](./B0-upstream-messages.md#message-3eb16102e5)
- [B0 file and test evidence](./B0-commit-file-evidence.md#evidence-3eb16102e5)

- B0 血缘：已核对父提交；尚未证实补丁重复或完成 CX 功能对照。

- 提交时间：2026-07-26T14:41:46+08:00；作者时间：2026-07-26T14:41:46+08:00；父提交：4ae7717db5。
- B0 本地关键代码对照：上游变化、现有能力和前置依赖见 [B0 代码证据](./B0-commit-lineage.md#b0-code-findings)。
- 初筛批次：**E / 代理、模型与提示词**；状态：待人工核验。
- 处理建议：检查 Responses 格式、模型与角色映射，谨防把 Claude provider 合约直接套用。
- 上游改动路径（2 个）：
  - `src/components/proxy-stats/ProxyStatsModal.module.css` → 无直接路径匹配
  - `test/retry-config-layout.test.js` → 无直接路径匹配

### 2026-11-19 Header 源码纠偏：77d4ad5

- 上游：PR #145 `eb2e9703a2837550a9bf2a62a8bb5d20fac7f723`；最终有效快照 `74cd752d99caf122e750216d2af3bb9f467c4de1` 的 AppHeader/HeaderProjectTabs/SortableProjectTab、AppHeader.module.css、resumeSessions.applySameNameIndex。
- 本地 `77d4ad5`：恢复 Header 左侧项目区、单工作区文字/多工作区胶囊、稳定同名序号、dnd-kit 和 Popconfirm；删除自行设计的卡片、常驻箭头和窄屏菜单。SDK scope/身份和别名兼容保留；键盘可达性最小适配详见 migration-code-first.md。
- 验证：针对测试12/12、恢复组件探针和前端构建通过；两个关键CSS区块逐字与固定源码一致。未完成 GUI/真机触控；历史入口、加号弹窗、移动菜单及纯视图切换继续纠偏，不标 eb2e9703a2 或 B2 整包完成。

### 2026-11-19 新工作区与历史入口纠偏

- `7d17f24` → 固定74cd752d快照 NewProjectModal/WorkspaceList/DirBrowser/CSS；`7f7f78e2d8`一步启动、`a07464187c`底部20px的实际改动。共享1080px弹窗和表格/目录树已迁移，8/8组件测试及构建通过；Codex续接参数复用本地解析器。
- 历史入口纠偏对应 PR #145 `eb2e9703a2`/恢复 `649f853e5e` 后在固定快照中的有效调用链；13/13针对测试、恢复探针和构建通过。Chrome共享弹窗打开/取消；Safari真实A发送/回复、快捷设置历史顺序、强制mobile菜单/历史弹窗已验收。完整源码路径、必要SDK适配与GUI限制详见 migration-code-first.md。B2尚未整包完成，不将mobile=1当真机通过。

- 历史入口纠偏本地提交为 `fbd5817`（上节）；对应代码/测试/GUI证据详见迁移规范。
- 本轮继续按 `eb2e9703a2`/`a84385b5a8` 最终有效视图切换链路：History API页内切换与返回、精确SDK scope生命周期、每次操作缓存key及每组件scratch key。19/19针对测试及构建；Safari A→B发送→返回A、registry/native thread与调用cwd对照通过。未将子树重新挂载适配伪称上游warm channel缓存，详细差异已记录；仍在B2。

### 2026-11-19 页内切换与最终 scratch 布局复核

- 页内切换本地提交 `e05109d`；受控全量1292/1292、0 skip，构建通过。
- 上游 `99256ac1d8`/`a3cc12619f`/`2ea5181df8` 在固定74cd752d的最终组件/CSS已逐项核对。scratchOnlyPanel父结构、横向手机栏、44px目标和sticky加号按实际CSS纠偏；保留scope和清理守卫，不复制Claude协议。Web206/206、构建；CSS区块逐字一致，hash见迁移规范。Chrome320px Header/输入区可见，最终scratch/真机未验收（窗口变化保护、IAB host不可用），新版GUI清单保留步骤。B2未整包完成。

- scratch源码布局纠偏本地提交 `35e8d30`。本轮全新安装685文件、202 Web资源字节一致，66/66运行测试、B1.2及隔离CLI通过；目录 `cxv-b2-runtime-kbxiscz9`。
- 上游i18n模板/工作区帮助必要适配：保留源结构，将本轮双花括号词条转为本地模板语法，并移除cwd作为权限边界的不实保证，品牌使用Codex。13/13组件测试及构建通过；非新增产品设计。详情见迁移规范“纠偏6”。

- 文案必要适配本地 `43ed855`。
- 本轮对照 `1aca9b5f8f`/`1e0edc00f3` 最终ChatView队列路径，纠正先前全部队列用ChatMessage/Ant Button的布局；原生队列条迁回inputStack composer上方，保留SDK权威ID和派发守卫。12/12连接/队列测试、Web206/206、构建及CSS逐字核对通过；最终GUI未验收，不把旧队列气泡GUI作为新布局通过。

- 队列条纠偏本地 `82e25e7`（`1aca9b5f8f`/`1e0edc00f3`）。
- 本轮按固定上游 AppBase.handleLiveProjectsChange/handleCloseProject 补齐已知实例被其他客户端关闭后的视图修复；未知初始实例及只读历史不静默fallback。14/14组件测试、构建通过；最终双浏览器GUI仍待。

- 死实例视图修复本地 `11b0885`。
- 本轮补按源码修正队列条与角色筛选的关系：只看assistant时仍保留队列控件；native/只读视图不显示。实际ChatView.render及连接/队列13/13通过。

- 角色筛选纠偏本地 `d53f4ea`，对应1aca9b5f8f/1e0edc00f3的inputStack结构。最终受控全量1294/1294、0 skip；GUI发现queueHint品牌仍为Claude，本笔只改为Codex（18语言），Web208/208及构建通过。

- 队列提示品牌适配本地 `765aafd`。
- 本轮真实GUI复现SDK workspace_stopped先卸载Header、远程关闭留旧URL的缺陷；依据eb2e9703a2/a84385b5a8最终close/rebound链路，停止SSE/WS加入既有reattachedTo，AppBase在通用清理前按精确scope执行History API回退。15/15组件、7/7 HTTP/SSE/WS、1295/1295全量、0 skip、构建；新685文件生产安装/202Web字节、66/66、B1.2和隔离CLI通过。最终Chrome/Safari实际双端回退B、新版历史恢复/原native thread续发通过，详情见B2-gui-acceptance.md。不是用组件轮询通过代替真实事件顺序验收。

- 远程关闭事件修复本地 `3cbd71e`；另实际验证Chrome在B关闭后台A，Safari mobile=1从A回精确B且参数保留/旧记录清理，Chrome保持B；无后续代码改动。

- iOS18.6隔离模拟器补证无代码变更：网页触控Enter/Up、键盘保持、20×60→37×60和scratch切回输出通过。CUA拖动/scroll未确认位移，指针/物理多指仍待，见B2-gui-acceptance.md。

## 2026-11-19 用户验收B2收口与B3准备

用户明确认为B2已可以，授权收口、将本地commit合为一个提交到main并提交GitHub。B2状态改为用户验收完成；指针/真机多指等仍保留未验证事实，不再阻塞本轮收口。原63笔上游/本地映射与历史对象不删除，见[压缩记录](./local-commit-consolidation-2026-11-19.md)。最新1295/1295与安装/GUI证据来自最后代码版本，本轮仅文档/历史整理，没有宣称重跑。下一工作包[B3交接](./B3-handoff.md)，尚无B3新增实现。

## 2026-11-19 B3首轮实施与初始基准

上游`0670581b3dd0bcecebc1a88d8a032f295b6ada66` → 本地`a55eb66` / `5047b36` / `2b765b1`；上游`d7f355ba895e24bb5e46c820a7d3105a76018ea3` → 本地`4a21cec`。独立提交及后续修复关系、Codex必要适配、源码/测试证据和未覆盖项见[B3实施](./B3-implementation.md)，没有UI/CSS重设计。最终1312/1312、0 skip、构建、685文件预览通过；初始长日志/高频数值已归档，不以单批reset和最终快照代替浏览器自动恢复验收。B3继续实施。

## 2026-11-20 B3第二轮独立迁移与验证

上游/本地逐笔映射见[B3第二轮](./B3-transport-and-pagination.md)，自然故障/真实窗口见[B3浏览器恢复](./B3-browser-recovery.md)。最终源码1394/1394、0 skip；构建、688文件新生产安装、202Web精确字节、134/134运行时、B1.2合成回归及隔离CLI相对--cd启动通过。原始安装结果见[B3-install-2026-11-20.json](./B3-install-2026-11-20.json)。自动分片尚未实施，旧归档政策等待用户选择；其他未覆盖项保持明示，不整体完成B3，也未推送或改真实日志。

## 2026-11-20 B3渐进分片完成与收口

用户已选择渐进启用并授权自主迁移；13笔独立实现/验证映射见[B3分片实施](./B3-sharding.md)，六项完成条件及17/46候选归属见[B3完成矩阵](./B3-completion-matrix.md)。最终全量1410/1410、0 skip、构建通过；689文件新生产安装、202Web精确字节、144/144运行时、B1.2合成回归及隔离CLI通过，原始结果见[B3最终安装](./B3-shard-install-2026-11-20.json)。B3本地迁移完成，下一包B4；没有宣称用户验收、真实用户日志批量迁移或其他混合子项完成，未推送。

## 2026-11-20 用户确认B3收口与提交合并

用户确认B3收口；原30笔已合并为[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)并正常快进推送origin/main（父提交41d95af）。2026-11-20 10:41:52（Asia/Shanghai）通过git ls-remote读回完整hash `7c3d849b9e7acda1c974077843406c23627dbdcb`，与本地一致；当时工作区干净。原完整历史保留本地archive引用及已校验bundle；除6个收口文档外，应用/测试/依赖/探针树与原末端精确一致。完整映射和回执见[提交合并记录](./local-commit-consolidation-2026-11-20.md)，没有强推。B3验证及未覆盖环境维持完成矩阵原结论；当前下一工作包B4（准备中），本轮仅同步进度文档，无B4实现。

## B4 E1 exec transport extraction

Upstream lifecycle/snapshot subitems: `2914d6479d2845e0b193ba1c09aa6667c66850a6`, `975313773a2edfcd0f8f640cdfe4c1681048f954`. Local: `feat(sdk): isolate existing exec transport without changing behavior`. SDK regressions 53/53 and real CLI local synthetic compatibility probe passed; no production transport switch or agent-card completion. See [B4.4](./B4-implementation.md).

## B4 E2 owned App Server stdio client

Upstream lifecycle/card prerequisites: `2914d6479d2845e0b193ba1c09aa6667c66850a6`, `975313773a2edfcd0f8f640cdfe4c1681048f954`. Local: `feat(sdk): add owned App Server stdio RPC client`. Client 5/5 and real CLI local synthetic probe passed; manager/default transport unchanged. E1 local commit: `c65f3f9`. See [B4.5](./B4-implementation.md).

## B4 E3 native transport and observed child lifecycle

Upstream task/card subitems: `0cde7d1df8f15fdbac23be941e367e5d577159de`, `2914d6479d2845e0b193ba1c09aa6667c66850a6`, `975313773a2edfcd0f8f640cdfe4c1681048f954`. Local: `feat(sdk): implement isolated native App Server transport`. Client/transport 12/12; real CLI local synthetic 15 requests passed, including child completion after root ended. No manager/public CLI integration or card completion yet. See [B4.6](./B4-implementation.md).

## B4 E4 manager/archive integration

Upstream task/card prerequisites: `0cde7d1df8f15fdbac23be941e367e5d577159de`, `2914d6479d2845e0b193ba1c09aa6667c66850a6`, `975313773a2edfcd0f8f640cdfe4c1681048f954`. Local: `feat(sdk): preserve manager and archive contracts for native transport`. SDK/client integration 66/66; real CLI local synthetic 21 requests, including V2 exec/native bidirectional resume, passed. Approval/image/public CLI admission still pending. See [B4.7](./B4-implementation.md).

## B4 E5 instance-owned native approvals and questions

Upstream attach/lifecycle prerequisites: `84e65cddc6` (restore approvals on attach), `2914d6479d2845e0b193ba1c09aa6667c66850a6` (session replay); full hashes in commit trailers. Local: `feat(sdk): route instance-owned native approvals and questions`. Existing Codex TUI request descriptions and question normalizer reused without layout/CSS changes. Full 1443/1443; final real HTTP/WS 8/8 and Safari reply/refresh/cancel/deny passed; actual Codex local synthetic 25 requests include native request_user_input. Real command/file/permissions model approvals and public CLI remain unverified/pending. E4 local: `820c662`. See [B4.8](./B4-implementation.md).

## B4 E6 native structured tool images

Upstream existing image-pipeline contract: `fc68e850f23ad28a453eb5219c8113c7165086f9`; native transport prerequisites remain `2914d6479d2845e0b193ba1c09aa6667c66850a6`/`975313773a2edfcd0f8f640cdfe4c1681048f954`. Local: `fix(sdk): retain structured native tool image results`. SDK/native 20/20 and image/history 18/18, build passed; real local MCP/CLI image receipt in B4.9. No UI redesign or whole mixed-commit completion. E5 local: `6102667`. Next: native option fidelity and explicit transport CLI.

## B4 E7 native configuration fidelity and explicit option rejection

Codex-specific prerequisite to existing upstream lifecycle/task/card subitems `2914d6479d2845e0b193ba1c09aa6667c66850a6`/`975313773a2edfcd0f8f640cdfe4c1681048f954`. Local: `fix(sdk): preserve native TOML overrides and reject unsupported options`. 77/77 regressions, final boundary 16/16, build and real CLI local 27 requests passed. Raw TOML array/feature flags/launch defaults/resume covered; native profile/image-input/add-dir remain explicitly unsupported. E6 local `3576cf8`; see B4.10.

## B4 E8 explicit native CLI rollout

Prerequisites for upstream lifecycle/task/card subitems `2914d6479d2845e0b193ba1c09aa6667c66850a6`/`975313773a2edfcd0f8f640cdfe4c1681048f954`; Codex-specific transport selection follows the user's confirmed gradual rollout. Local: `feat(cli): expose explicit opt-in App Server transport`. Default exec retained. Full 1449/1449; build; fresh installed 183/183, B1.2/CLI regression; real CLI local synthetic 28 requests passed. E7 local `400a27b`. B4.11 records exact boundaries; agent card still pending, no whole mixed-commit completion.

## B4 E9 authoritative native child state

Upstream card/lifecycle contract: `975313773a2edfcd0f8f640cdfe4c1681048f954`, `2914d6479d2845e0b193ba1c09aa6667c66850a6`. Local: `feat(sdk): track owned native child lifecycles and replay snapshots`. 25/25 module/SDK/HTTP tests plus final WS 8/8; build; real CLI local 33 requests including root-idle child/tool/next-root/independent terminal passed. Native real nested/reuse/interrupt and UI card still pending. E8 local `65729db`; see B4.12.

## B4 deterministic native RPC / SSE test receipts

Local: `test(sdk): match explicit RPC and SSE receipts`. Supporting the existing `2914d6479d2845e0b193ba1c09aa6667c66850a6` replay/isolation prerequisite: two parallel-test ordering assumptions removed; default-denial and scoped-stream assertions retained. 13/13 targeted passed; first failed full log and cause recorded in B4.12a. No product behavior changes; E9 local `d04fd15`, E10 full/install still pending.

## B4 E10 baseline active-agent card

Upstream `975313773a2edfcd0f8f640cdfe4c1681048f954` and `2914d6479d2845e0b193ba1c09aa6667c66850a6` card/lifecycle subitems → local `feat(chat): restore baseline active-agent card for native snapshots`. Full CSS/render tail exact; 1457/1457 full, build, new installed 188/188/B1.2/CLI, isolated Safari refresh/WS reconnect/collapse/scope/root-next/child-end passed. Exact scope and remaining role-filter glass correction in B4.13. E9 local `d04fd15`, deterministic receipt tests `61e1701`; no whole mixed-commit completion.

## B4 E11 frosted role-filter correction

Upstream `d906edb3de840208944bbca9d33ec037bdeb6bc5` RoleFilterBar float/glass/41px compensation → local `style(chat): restore baseline floating frosted role filter`. Full CSS exact except existing Codex monochrome avatar rule; no component DOM/filter change. Web 267/267/build and isolated Safari filtering/scroll/agent-card mutual exclusion passed; other mixed subitems pending. E10 local `f29f9b3`; details B4.14.


## B4 E12 scratch composer signal and visibility

Upstream `9dbf4e295a08e472c0b15cfb66de1cc80c77cfa3` / `3d65bedcd1b47a8de7f0ff1bdfec3a11efbc9fa0` → local `fix(chat): preserve scratch state with baseline SDK composer guards`. Exact raw terminalVisible + sdkMode props retain effects while original SDK guards keep composer/portal. Reused B2 global persistence for `1bfc1585e833d037a7dab6fe23e5a8c0aac48c08`; no storage rewrite. Web267/267/build and isolated Safari open/edit/refresh open/closed passed; voice not exercised. E11 local `9e35157`. See B4.15; no whole B4 completion.


## B4 E13 owned terminal failure frames

Upstream `9b1bb4e729473360cbe60e508f0558a702370a08` failure routing subitem → local `fix(sdk): broadcast terminal failures to their owning workspace`. Reused existing scoped WS broadcaster, retained durable archives and retry-success precedence; intentional Stop suppresses alert. 24/24 including actual local HTTP/WS same-name isolation and pre-thread failure; build passed. Persistent baseline error UI and retry metadata pending. E12 local `8d6dafd`; see B4.16.


## B4 E14 baseline persistent terminal errors

Upstream `9b1bb4e729473360cbe60e508f0558a702370a08` / `88995a10461973689656841a8476ee4e6c60281b` → local `feat(chat): restore baseline persistent SDK error rows`. Original non-retry render/merge/count/a11y plus exact final CSS; structured Viewer-only failure projection avoids duplicate assistant bubbles while retaining raw/cumulative archive contracts. Full1462/1462/build; isolated Safari empty/populated/cap/count/scope/clear/post-archive single row passed. Retry/recovering and physical/external-model verification pending. E13 local `0d5732d`; see B4.17.


## B4 E15 native error facts and turn identity

Prerequisite for upstream `84e65cddc629e8b442e866c303883444901d5c19` retry subitem → local `fix(sdk): retain native error metadata and turn identity`. Transport now keeps native TurnError/willRetry and exact thread/turn IDs, without text inference, retries or UI changes. Targeted24/24/build; actual Codex loopback27 requests include 503 recovery/exhaustion and actual normalized400 metadata. Attempt/max are absent as structured fields; user copy choice pending. E14 local `ba06166`; E14 full1462/installed190 checkpoint remains scoped to that commit. See B4.18.


## B4 E16 native terminal failure classification

Upstream `84e65cddc629e8b442e866c303883444901d5c19` retry prerequisites → local `fix(sdk): classify native failures from owned retry facts`. Exact native turn + observed willRetry + structured network/status governs retryable, raw TurnError preserved; no text parsing, retry operation or UI changes. Targeted29/29/build; actual loopback32 requests cover manager503 exhaustion/recovery and400 exclusion. E15 local `41e379f`; user retry-copy choice and manual continuation still pending. See B4.19.


## B4 E17 reuse existing SDK turn-level loading

Upstream `c4529a6ed7a81c7ddd4564915735a06e123890ab` / Stop subitem of `84e65cddc629e8b442e866c303883444901d5c19` → reuse B2 `41d95af54189cfaa9d0816244ec1ae7366d43939` whole-query streaming/SSE scope. Actual isolated Safari exec hold139s, same-name idle sibling, refresh/forced mobile Stop, queued send/drain/terminal passed. No product change or repeated test claim. Found persistent duplicate streaming overlay after final queued entry, explicitly pending correction; whole mixed commits remain open. E16 local `2eaa414`; see B4.20.


## B4 E18 settle streaming overlays at both final commit paths

Frozen source contract `5c28d4c50a952110c32b04922cee56bdf9bd8560` / `74cd752d99caf122e750216d2af3bb9f467c4de1` AppBase stream/final handling → local `fix(chat): settle streaming overlays with canonical final commits`. Necessary Codex/V2 correction for E17-observed duplicate: deferred paints recheck final state and cold baseline commits clear an already-painted matching overlay. Before-fix tests fail; initial rAF-only fix still failed GUI and was not accepted; final1465/1465/build and new isolated Safari first-archive/queue single replies passed. No DOM/CSS changes or whole mixed-commit completion. E17 audit `3c72b4a`; see B4.21.


## B4 E19 exact-failure manual continuation

Upstream `84e65cddc629e8b442e866c303883444901d5c19` manual retry contract → local `feat(sdk): continue an owned failed native turn without replaying input`. Exact failed turn/session/generation and empty idle queue required; synchronous claim prevents duplicates; original continue prompt, metadata-hidden user row, directed WS rejection and native recovering/recovered lineage. 21/21 SDK/history, real HTTP/WS10/10, Web273/273/build; real Codex loopback33 requests include one successful continuation on the same thread. User chose native raw retry message; UI next. E18 local `9e7a83a`; see B4.22.


## B4 E20 baseline retry feedback and button

Upstream `84e65cddc629e8b442e866c303883444901d5c19` / `ee3545344eff8c9969f6de63631d2181844cbfb0` / `88995a10461973689656841a8476ee4e6c60281b` → local `feat(chat): restore baseline retry controls with native notices`. Exact final retry CSS/row DOM; raw native retry message per user choice, owned success/cancel settlement, manual recovery hiding/lineage cleanup and existing false-return-aware send helper. Full1473/1473/build; real Codex loopback33 + isolated Safari manual/automatic recovery passed. E19 local `36af884`; activity probe and mixed-commit remainder pending. See B4.23.


## B4 E21 owned slow-upstream backend

Upstream `6b340326c6a43d5020b74ec1d20ae6c8f44cbe4d` + final corrections `2ea5181df8c2d4e8385b76ca4507b74b8e409231` / `a3cc12619f441e2ab04885ad85a4ce99901fc1d9` / `919fded8456a518eb667a105b0550fd6d42cb978` → local `feat(sdk): relay owned slow upstream requests and replay pending waits`. Original 30s/body-byte/request settlement/replay contract through existing per-instance proxy callback; utility excluded, generation-owned snapshots, strict scoped WS. HTTP9/9, actual SDK child+HTTP+WS11/11 including production30s wait/reconnect/isolation, build passed. UI pending; mixed commits remain open. E20 local `124ca25`; see B4.24.


## B4 E22 baseline slow-upstream feedback

Frozen `6b340326c6` / `2ea5181df8` / `a3cc12619f` / `919fded845` → local `feat(chat): restore baseline slow upstream notices and lifecycle`. Exact original toast helpers/i18n, scoped pending requests and complete teardown; necessary shared-provider late-mount snapshot and cold-hydration correction found by actual Safari. Final1480/1480/build/fresh-install199,695files/202Web byte match/B1.2/isolatedCLI passed. Safari real30s threshold, wait tick, view exit/return, full reload and first-byte settlement passed. Initial credential-concurrency failure retained (correct-cwd7/7 + five repeats + full pass, root cause unconfirmed); no credential changes. E21 local `f7b13af`; see B4.25.


## B4 E23 first-turn instructions expansion

Upstream `7a2dd6162e1465071a755606d77de22d7c0caa90` request JSON subitem → local `fix(detail): expand every first turn instruction segment`. Existing local collectAll/expandRefs reused with native input/instructions fields; no DOM/CSS changes or classifier weakening. Web279/279/build and verbatim actual-method/real-classifier boundary probe passed. Claude-specific SDK notice awaits user choice, so whole commit remains open. E22 local `7a50079`; E22 full1480/install199 remains the latest broad checkpoint. See B4.26.


## B4 E24 real nested agent lifecycle evidence

Frozen `975313773a` lifecycle contract → local `test(alignment): verify real native child interruption reuse and nesting`. Production native transport/tracker/recursive ownership + actual Codex0.169 on isolated loopback model:38 requests, exact child interrupt, same-thread new turn, captured stale terminal ignored and proved grandchild independent settlement passed. Isolated max_depth=2 only; defaults/UI unchanged. Raw frames/12 snapshots retained. E23 local `a51bd1a`; see B4.27.


## B4 remaining lifecycle audit after E24

Read actual/final `bc669f59cc` state test contract and local SDK/SSE ownership flow; existing whole-turn state reuse does not close activity/lost-result items. Initial `ef5fc8b168` diff/final server inspection located independent agent-loop SSE/plugin/voice producers absent from the local SDK path; full-chain reading and migration remain next. No product changes or new test claim. E24 local `62b8ea9`; see B4 implementation closing audit. B4 remains open, no push.


## B4 E25 SDK accepted-turn boundaries

Upstream `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` boundary subitem → local `f2c87f6` / `feat(sdk): emit owned agent loop boundaries and plugin hooks`. Only accepted executor streams emit start; exact one terminal/end with captured generation/scope/callback. Original SSE/hook names via existing precise SDK routing; real CLI launch wiring retained. SDK/native/queue26, startup6 (overlapping), HTTP/SSE/WS/plugin11 and build passed; actual Codex loopback34 includes public CLI plugin receipt. Voice/PTy/service event bus/activity/lost-result remain open. See B4.28.


### B4 E26 voice-pack backend prerequisite

Upstream `eec2d1673aa527572ce9764c7092227e9a3831df` + `372dfd670a72d7ba39fa6b62bf4815b1ae763e7b`, fixed snapshot manager/routes/preferences contract → local `dc88897` / `feat(voice): restore audio storage routes and preference merging`. Four original API endpoints, built-in manifests, range/cache, bounded validated upload and deletion; existing locked preferences writer now uses original deep merge/reconcile. Reuses local multipart and private-file read policies; preserves existing loopback mutation authorization. Real isolated HTTP5 plus auth/preferences regression33 total, build passed. No UI, loop voice wiring or whole mixed upstream completion claimed; see B4.29.


### B4 E27 original loop voice wiring

Upstream `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` voice subitem → local `c841dc7` / `feat(web): wire original opt-in agent loop voice cues`. Original two event rows, off-by-default locale seeds,18-language text and exact bundled assets; root-instance scoped SSE callbacks, turn epoch/ID guards, original player dedupe and1500ms legacy end suppression. Existing whole-turn loading stays the single state source. Full1494/1494, build, new installation701files/204exactWeb/208runtime/B1.2/isolatedCLI; Safari actual206 audio/refresh settings and desktop/forced-mobile original panel inspected. See B4.30 and B4-loop-voice-2026-11-20.json. Activity/PTy/service bus and other mixed subitems remain open.


### B4 E28 native missing-terminal recovery

Upstream `84e65cddc629e8b442e866c303883444901d5c19` / `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` lost-result subitem → local `70ab160` / `fix(sdk): recover missing native terminal from exact turn history`. Five-second native idle grace; bounded one-turn full page must prove exact native ID and terminal before existing normalization/manager settlement. No guessing from idle, failed reads, partial histories or old turns; client/run/activity/signal guards and pending approval rearm. Target38/build passed; real Codex local24, two real completions dropped and recovered on same thread with one input each. See B4.31/B4-lost-result-2026-11-20.json. Activity, exec missing terminal and other mixed subitems pending.


### B4 E29 native activity probe and lazy replacement

Upstream `84e65cddc629e8b442e866c303883444901d5c19` / `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` activity subitem → local `d9747d0` / `fix(sdk): probe native turn liveness before lazy recovery`. Original10min/3min/10s/two-timeout thresholds, fresh metadata RPC, activity/run/client guards, pending approval park and last-resolution rearm. Suspect child retained until next authorized input; original failure/retry/loop hooks reused. Real production manager26 local requests:1ms healthy control, owned SIGSTOP causes10001/10002ms failures, child retained, explicit single continuation rebuilds same thread; original input not replayed. Full1502/build/new installed701files/204exactWeb/216runtime/B1.2/isolatedCLI passed. No exec silence conviction, UI redesign or whole mixed completion; see B4.32.


### B4 E30 exec stream exit without terminal

Upstream `84e65cddc629e8b442e866c303883444901d5c19` / fixed ef5 resident-death semantics → local `d5a79db` / `fix(sdk): persist missing-terminal failures and park unsent input`. Exhausted iterator/transport failure with no terminal becomes original session-ended feedback and parks backlog; explicit abort/send-now authorization preserved. Reuses pending assistant flush to keep actual partial text/thinking without duplicating completed items. Target27/full1503/build/new installed701files/204exactWeb/217runtime/B1.2/isolatedCLI passed; Safari partial/error/park/resume/no-replay verified. Refresh retains text and queue but loses error row, explicitly OPEN for next source-first audit; see B4.33/B4-exec-eof-2026-11-20.json. No whole mixed completion claimed.


### B4 E31 source audit of error row persistence

Upstream `9b1bb4e729473360cbe60e508f0558a702370a08` actual diff plus fixed constructor/error branch/clear/render and complete attach replay: sdkErrors is page-local, empty after reload; historical error replay is absent upstream too. E30 reload observation matches baseline source, so previous OPEN classification is resolved without inventing a new product capability. Raw observation preserved with baselineAudit in B4-exec-eof-2026-11-20.json; no code or new test claim. See B4.34.


### B4 E32 ordinary TUI accepted-turn boundaries

Upstream `c4529a6ed7a81c7ddd4564915735a06e123890ab` / `ef5fc8b1689ac56ec67fd2d797f5577cdb2dd99f` PTY lifecycle subitems → local `9d4d437` / `feat(pty): emit accepted native turn lifecycle boundaries`. Actual TUI WS connection+RPC acceptance and exact native terminal, scoped teardown, silent attach/restart state, original10s normal end/instant interrupt, SSE/JS plugins and existing loading/voice consumers. Real public Codex0.169 TUI revealed temporary title-start reset; exact ephemeral thread_title exclusion now retains root lifecycle/transcript,35 bridge regressions. Full1511/build/new installed701files/204exactWeb/220runtime/B1.2/isolatedCLI, real local3 requests with10004ms tail and exact Escape end passed; Safari loading/refresh/restart/canonical reply verified with explicitly synthetic PTY. No whole mixed completion or real GUI Stop claim; see B4.35/B4-pty-loop-2026-11-20.json. Native utility canonical classification remains next audit. E31 local `a0da408`.


### B4 E33 canonical native agent classification

Upstream `f3a8413db9f99691ef94f54279cedc2913e0c1f0` wire-identity/classification subitems → local `53126f5` / `fix(chat): preserve canonical native agent identities`. Reuse Codex producer flags and persisted names instead of Claude-only header formats; explicit native child vetoes team/tool heuristics, canonical agent labels remain shared, named canonical teammate labels resist heuristic downgrades. Existing Master and local full-body lookahead path retained. Target52/full1514/build/new installed701files/204exactWeb/238runtime/B1.2/isolatedCLI; real captured128-frame production bridge/writer/cold-reader replay keeps3 child records SubAgent with supplied label. No new UI/metadata schema or claimed missing nickname reconstruction. See B4.36/B4-agent-identity-2026-11-20.json. Temporary native title classification remains separate; release metadata B11.


### B4 E34 native temporary title classification

Existing upstream Synthetic contract `4455bef641c171701fdd6d0251826c139d2e0ff9` / shared-filter correction `4384b7ca67c60c0680a6dba370c1b2d7c5a67c31`, and f3a wire-identity priority → local `7d2642f` / `fix(chat): classify native title threads as synthetic`. Evidence-driven Codex adapter for exact ephemeral/thread_title metadata: auxiliary archive role, existing Synthetic:Title/muted label, no chat projection or user prompt/root-main activity; raw/network records and physical native turns retained. Live and rebuilt summaries agree. Target99/full1519/build/new installed702files/204exactWeb/279runtime/B1.2/isolatedCLI; real public TUI3 local requests/10001ms tail/native Escape/current-user archive and Safari original label/empty title chat passed. No old-log rewriting or text inference. See B4.37/B4-native-title-2026-11-20.json; no whole mixed upstream completion claimed.



### B4 E35 approval minimisation replay policy

Upstream `469a995ad8d6222f2fb092a7c1c3d5bb8fe7b349` / c29af25e64 approval-reason guard → local `e5bb92b` / `fix(web): retain minimised approvals during repeated pending frames`. Original helper/eight tests reused; actual AppBase ask/ptyPlan transitions covered. Target45/build and Safari native fixture repeated-pending minimisation passed. Actual A→B→A still reopens because local roots unmount: explicitly OPEN for next independent scope-memory repair; no whole469/c29 completion. Complete/install checkpoints remain E34 1519/279. E34 final receipt commit `0f34e85`; see B4.38.


### B4 E36 exact-instance minimisation through keyed remounts

Upstream `469a995ad8d6222f2fb092a7c1c3d5bb8fe7b349` view-switch subitem → local `f3cdb9e` / `fix(web): restore minimised approvals per workspace instance`. Reuses the existing keyed root teardown; stable parent holds only bounded page-local string-id sets under exact live SDK scope. New roots reconstruct approvals/handlers from their own replay, never from cached action objects. Target46/full1529/build/new installed702files/204exactWeb/279runtime/B1.2/isolatedCLI; Safari same-name A/B round-trip, sibling popup, explicit reopen, local fixture answer and new-pending reset passed. E35 original failure retained with followup resolution. No persistence across page reload or new UI/CSS; history metadata remains B11. See B4.39/B4-approval-scope-2026-11-20.json.


### B4 E37 per-turn SDK thinking reuse

Upstream `d89aa3b9af9703c2c350dcfa14eefbcd3215ecc5` SDK thinking-retention subitem → local `5c92723` (`test(alignment): verify per-turn SDK thinking retention`). Existing Codex completed-item accumulation retains response reasoning in its own next-turn history, so the upstream Claude-specific stripped-history recovery cache is unnecessary here. Official SDK/fake CLI, production writer/cold reader/normalizer/session merge test plus existing SDK suite7 passed; Safari exec and AppServer synthetic two-turn live/refresh content each once. No runtime/DOM/CSS change; last full/build/install checkpoint remains E36 1529/279. See B4.40/B4-thinking-history-2026-11-20.json; fixture-schema/test-environment corrections recorded rather than treated as product defects.


### B4 E38 first-turn result and cold-attach reuse

Upstream7641f5181af91a3ca06912d687a8dee678bfb85d functional subitems, later bde02443 drain/UTF-8 correction → local c8b6afd (test(alignment): verify native turn and cold attach isolation). Reuse exact native turn/client ownership and B3 durable cursor replay; no runtime/DOM/CSS changes. Added recovered-turn→next-turn stale/missing terminal and retry coverage, plus production writer/snapshot/live-route pre-subscribe and backpressure-gap delivery once. Target47, full1532 (5+296+1019+212),0 skip. Initial inherited bypass-env full failure retained; cleared-env full passes. Build/install checkpoint E36 unchanged. B11 wire/release/history files remain separate. See B4.41 and B4-first-turn-guard-2026-11-20.json.


### B4 E39 question terminal batching and post-commit routing

Upstream dd8709356b question terminal subitem → local 3e31052 (fix(web): settle batched question terminal frames). Port functional latest-state matching and post-commit routing/meta cleanup; preserve Codex request/item identity and resolved transcript answers. Seven regressions reproduce red, target20/full1539/installed280 pass, build and Safari real manager/WS synthetic-native reply/next-question/cancel checked. Production package702files/204exactWeb, B1.2/isolated CLI pass. No DOM/CSS or permission/auto-answer policy change; plan/permission/global clear routing and release files remain separate. See B4.42 and B4-ask-settlement-2026-11-20.json.


### B4 E40 plan/permission terminals and immutable connection scope

Upstream dd8709356b27c7ce3321269fc68466f051c613bf remaining functional terminal consumers → local f1c1970 (fix(web): match approval terminals against current state). Port original functional plan clear, normalized permission IDs and unmatched no-op; three actual ChatView cases reproduce red, combined target61/full1542/installed280/build pass. Safari synthetic-native production decline clears permission card. Actual immutable connection scope, native producer scope and strengthened1 HTTP/WS test justify retaining scoped terminal answers instead of global broadcast; no UI, approval policy or update_plan gating added. Release/history B11 remains separate. See B4.43 and B4-approval-terminal-2026-11-20.json.


### B4 E41 final effective SDK/PTY plan-channel guards

Upstream51c23e9090f349b983a2dba52c738c559da5bf1b, final guards retained through91b005/282306 at74cd752d → local b58d2b6 (fix(web): keep SDK approvals off PTY keystroke paths). Actual ChatView stale-state lifecycle regression red first; !sdkMode derivation and two early returns ported. Existing native nonInteractive plan renderer reused. Target43/full1543/install280/build pass; Safari native synthetic plan+steps live and refresh remain read-only, owned process stopped. No hidePlan rollback, new plan RPC/permission policy or CSS. Later structured-plan/auto-approval/release subitems remain separate. See B4.44 and B4-plan-guard-2026-11-20.json.


### B4 E42 directory-refactor ownership evidence

Upstream f9467bfc838a6ef724c0f7144e0ef302e1256523 → local81e7189 documentation-only source audit:94 files,8 exact code moves/49 canonical relative-specifier-only/35 manually reviewed remaining code pairs/2 metadata. Remaining runtime differences are comments/import/generated hook paths and worker CLI depth (same target). Fixed baseline moved hooks/worker exist. No new B4 behavior; B0/B2 B8/B11 ownership confirmed, local directory/hook/package migration remains pending there. No runtime/DOM/CSS or new test/build claim. See B4.45 and B4-path-layout-audit-2026-11-20.json.


### B4 E43 resumed-history first-turn live replay

Upstream bd32d02884082a6d15f2b213855537e667cdefd0, later b23c1373 shard distinction → local13bd023 (test(alignment): verify live replay after historical resume), reusing B3 canonical cursor/publisher instead of raw V3 suppressed feed. Actual HTTP resume test now completes first continued turn on old archive BEFORE opening SSE with pre-turn snapshot cursor: newer own-session commit arrives without another snapshot/refresh/reset, same-name sibling isolated. Initial companion41 passed; forced pre-attach HTTP file11 passed. No runtime/DOM/CSS; E41 full1543/build/install280 checkpoint retained. B11 metadata remains separate. See B4.46/B4-resumed-live-2026-11-20.json.


### B4 E44 accepted B2 subitems and task-relay scope reconciliation

Local documentation commit:884b620.

Documentation-only reconciliation of3079040494/a30d8c92a7/a84385b5a8/0a9ad5d767/99256ac1d8/bc669f59cc against accepted B2 matrices and B3/B4 later evidence; no newly claimed full diff migration. Merge ancestry/empty combined resolution checked, independent branch work still tracked. Actual d6cab4869a task relay + final normalize read: background-agent lifecycle is distinct from todo HUD; native counterpart uses E9/E10/E24 facts, no invented Claude fields. Mixed resident/switch/live-empty/metadata work stays partial. No runtime/UI/tests or new verification claim. See B4.47 and per-row B4 candidate matrix.


### B4 E45 release-only and prompt-asset source boundaries

Local documentation commit:ea3b128.

Read actual23e4273a37/0d067a1b7c diffs: release metadata/history only, B11; no local version/default-permission change. Read72c059f6b9 preset/manifest/test deltas, GLM5.3 full prompt and fixed final manifest/teammate sections: B8 assets remain unmigrated, no inferred lifecycle implementation. Read134a0de7ac template/JSON content; verify18 locale app/content mirrors plus JSON parity, identify unrelated permission countdown i18n addition. Review prompt workflow stays B7/B11, countdown B9; native named subAgent classification is not changed to Claude Teammate semantics. No runtime/UI/config/tests or new validation claim. See B4.48/candidate matrix.


### B4 E46 terminal keepalive and queue retention reuse

Upstream ec14cd0234 terminal WS/watchdog/queue-retention subitems → local test(alignment): verify queued input survives half-open reconnect. Existing server ping and provider deadlines/scope/monotonic state reused; actual Provider+ChatView synthetic half-open regression proves accepted+uncertain input/draft/attachments survive without retransmission, duplicate snapshot reconciles once. Target32 pass, no runtime/DOM/CSS change or new full/build/install claim. Specialized Context fetch15s and future-ts reducer clauses remain pending the Context contract choice. See B4.49/B4-ws-keepalive-2026-11-20.json.


### B4 E47 native MCP control-service prerequisite

Upstream133bc219df collector/HTTP/WS snapshot subitem → local8b59016 feat(sdk): expose native MCP status on scoped control API. Use actual0.169 mcpServerStatus/list on owned active root thread, explicit runtime status/tools normalization, paginated bounded10s read, same client/generation, exact HTTP/WS instance and snapshot copy/reset/replay. Default exec unsupported; cold read starts nothing. Target32 plus corrected close1/full1548/build/fresh install284 pass; real isolated Codex+MCP connected/version/tool count, no added model request. Invalid closed-registry test expectation and failed initial full/install retained; corrected strict404 test passes without weakening identity. UI pending next independent migration, no DOM/CSS. See B4.50/B4-mcp-service-2026-11-20.json.


### B4 E48 original MCP panel

Upstream133bc219df78920cdc3a5cb56f48cbe067e467e5 MCP UI/stable dispatch subitem → local2ad4e0d feat(web): restore original MCP status panel. Original component/list/position and byte-identical fixed-baseline CSS; reuse original useReducer identity. Necessary exec unsupported text, SDK mode update guard and existing request/context fallback. Target58/full1561/build/new package702files/204exactWeb/284runtime/B1.2/isolatedCLI pass. Safari native A reads1→2refresh→3reconnect; B1→2browser refresh, no cross-instance state/infinite fetch; exec panel adds0 CLI turns. Retained old-source-regex failures and legitimate stale-build packaging block; corrected actual component assertions/full pass and rebuilt without bypass. See B4.51/B4-mcp-panel-2026-11-20.json. Model chip/Context/mixed items and whole B4 remain pending; no push.


### B4 E49 final model-chip slot and scoped idle state

Upstream133bc219df78920cdc3a5cb56f48cbe067e467e5 + c66b5fe2ed6e855f0610127eba3de96ac821adea → local08db381 feat(web): restore model chip in final composer slot. Reuse native model/streaming_status rather than fake sdk-init; idle/root-scoped snapshot and current-source guard, clear on resume/workspace changes. Original ProxyChip DOM/CSS/helper/slot geometry and modal ownership, final desktop/iPad/phone/Electron gates; existing Codex selected-profile visibility retained without unsupported role assignments. Target64/full1564/build/package702/204exactWeb/285runtime/B1.2/isolatedCLI pass. Safari model idle/refreshed A vs same-name B, proxy priority/open, forced pad drawer and phone absence;0 model turns. Actual drawer coordinate-close not established; physical/narrow/PTY GUI not newly claimed. See B4.52/B4-model-chip-2026-11-20.json. B4 and mixed commits remain in progress; no push.


### B4 E50 permission-hook request-body guard

Upstream2847027b548c8eefde55fd7910639bc8d623e429 oversize permHook crash subitem → local1ca16df fix(server): reject oversized permission hook bodies once. Reuse existing strict bounded byte/UTF-8 reader in async route; never register pending approval after rejected payload, preserve ordinary approval/reviewer/forceManual behavior. Actual HTTP red reproduced two ERR_HTTP_HEADERS_SENT plus multibyte wait; final target21/full1565/build/package702/204exactWeb/285runtime/B1.2/CLI plus installed HTTP5 pass. No DOM/CSS/new GUI/model/command execution. Automatic directory trusts/policy B9 and hook maintenance B11 remain independent, not enabled or whole-commit complete. See B4.53/B4-perm-body-2026-11-20.json. B4/Context decisions remain pending; no push.


### B4 E51 plan approval protocol audit

Upstream91b0055f2d +282306a950 and later208f1348/6081b5d0 plan-related runtime subitems audited against fixed74cd752d. Form/helper unchanged; obsolete inline ToolApprovalPanel replaced upstream by plan card/modal; actual Claude producer is canUseTool ExitPlanMode. Fresh isolated actual Codex0.169 experimental schema has11 server-request methods and no plan approval request; plan item/plan update are notifications. Reuse B2/E5 scoped native approval ownership/replay, E35–40 minimisation/terminal cleanup, E41 read-only plan and PTY guards. Countdown/automatic policy stays B9, unrelated mixed B11 separately. No runtime/tests/DOM/CSS changed; no test/build/install rerun claim; last E50 full1565/installed285+HTTP5 retained. See B4.54/B4-plan-protocol-audit-2026-11-20.json; B4 and Context choices pending, no push.


### B4 E52 slash-menu SDK lifecycle scope audit

Upstream67ceb5b7f0 and merge3c77d9a8ed: actual SDK/server/AppBase/project-key/CLI runtime differences and fixed-final skills loader reviewed, later84e65 distinguishes cached commands from real liveness probe. Reuse B2/E5/E40/E46 exact instance/replay and E29 real thread/read; do not add basename project authorization or fake Claude supportedCommands. Actual Codex skills/list and skills/changed exist, so metadata/menu remain future B7/B8 integration rather than protocol-unavailable claims.67 is merge ancestor, combined diff no new manual resolution. No runtime/tests/UI changes or rerun claim; E50 full1565/build/install285+HTTP5 retained. See B4.55/B4-skill-scope-audit-2026-11-20.json; remaining mixed candidates/Context choices and B4 pending, no push.


### B4 E53 interrupted cumulative transcript merge

Upstreamdafe2bce37 longest-common-prefix subitem → local322f47e fix(web): retain queued prompts after transcript divergence. Actual AppBase cold/live red proves old partial replaces queued user. LCP-only89/full1568/first package pass but actual Safari still stale: rejected. Actual cached ChatView red then fixed by reusing array-identity invalidation only on rewritten prefix; pure append keeps cache. Final91/full1570/build/new package702/204exactWeb/285runtime/B1.2/CLI pass. Final browser repetition blocked by two CUA native-pipe startup failures, not passed; isolated fixture90869 stopped,0 model calls. Repro and failed checkpoints retained in B4.56/B4-interrupt-merge-2026-11-21.json. Other dafe mixed subitems and B4 remain pending; no push.


### B4 E54 send-now native approval cancellation

Upstreamdafe2bce37 and later1aca9b5f8f fixed-final send-now interrupt first cancels approvals. Local Stop did so, send-now did not. Reuse native clearThread before abort in one production line. Real two-child stdio red proves stale approval replayable;28 target/full1571(5+328+1026+212),0skip/build pass. Old approval immediately gone, late allow false, sibling pending retained, next input once on same thread. Fresh production installation1t48zxa3:702files/204exactWeb/286runtime/B1.2/isolatedCLI pass. No new UI/CSS or browser pass; E53 GUI still pending. Existing B2 queue evidence reused; Codex PTY queue not yet demonstrated. Legacy orphan checkpoint helper still missing patch but unmounted IM consumer/list routes not integrated; B11 IM pending, B10 service bus separate. See B4.57/B4-send-now-approval-2026-11-21.json; B4 not complete, no push.


### B4 E55 floating composer and scrollbar bleed

Upstreamefc7f8eab1 plus117ee25d → fixed-final measuring refs/observers,3 transcript spacers, gradient and pointer-events CSS ported without layout redesign. Exact helper/CSS SHA256 retained. Two red cases then50 actual component tests/full1573(5+330+1026+212),0skip/build pass. Fresh production installation s0nutgg9:702files/204exactWeb/286runtime/B1.2/isolatedCLI pass. Native Safari selection failed again before page observation; geometry/scrollbar drag/phone/pad and E53 final GUI pending. Other SDK full-surface/launch/compact items remain independent. B4 not complete; no squash/push/PR. See B4.58/B4-floating-composer-2026-11-21.json.


### B4 E56 native context-compaction notice

Upstreamefc7f8eab1 compact notice subitem: actual Codex0.169 contextCompaction schema exposes id only. Native completed root item → existing dedup → scoped sdk-compact; original latest-only/10-record banner DOM/CSS/18locale text, existing instance/unmount guards and resume cleanup. Native/web reds reproduce omission,63target/full1575(5+331+1027+212),0skip/build pass; actual fake-stdio instances prove foreign/duplicate rejection and unknown counts omitted. Fresh production installation6_pzxhk6:702files/204exactWeb/287runtime/B1.2/isolatedCLI pass; GUI still blocked by native pipe and browser access host unavailable, no real-model compaction claim. Existing exec SDK declaration lacks item, no inference from token drops/text. Remaining mixed/Context and B4 pending. User authorized squash current main changes into1commit+PR to GitHub main AFTER B4 completion, no direct merge. See B4.59/B4-compact-notice-2026-11-21.json.


### B4 E57 mixed-candidate lifecycle ownership audit

See B4.60/B4-mixed-scope-audit-2026-11-21.json for7 exact hashes and explicit full/partial read boundaries. Proxy SDK Teammate-row gate remains B8 with absent local role UI; prompt-nav/mic B7, native agent count/nested names reuse E9/E24 proved thread Map; merge no resolution. c29 runtime fully read, approval guards already covered, LRU payload trim already7c3d849 with20001→15000 test, rooted FileBrowser B5 and legacy conv coverage separate. Auto-approve/hosting/-2 SDK/helper changes inspected; existing E5/E39/E40/E54 handles scoped real answers, B9 timers/answer picking/defaults/full UI not newly enabled or complete. No runtime/UI changes or rerun claim; latest b276e7f1575source/287installed/build remains. Context/browser and other B4 candidates pending; no squash/push/PR.

### B4 E58 SDK exec launch arguments

Upstream efc7f8eab199a04f3b8dcb660a5bfde593138f66 launch intent adapted to official Codex SDK supported fields: reject unsupported/missing options before session/browser/workspace/model side effects; parse supported flags after actual exec/e; preserve ordinary words and literal --. Two red cases;35 target,2 final guard checks,1578 full(5+331+1030+212),0skip/build pass. Fresh production4ukn9qex:702files/204exactWeb/290runtime/B1.2/isolatedCLI pass. User Context choices now settled,implementation next;GUI and remaining mixed candidates pending,B4 not complete,no squash/push/PR. See B4.61/B4-sdk-launch-2026-11-21.json.

### B4 E59 SDK placeholder notice

Upstream7a2dd6162e1465071a755606d77de22d7c0caa90 notice subitem,user selected original position with accurate Codex facts. Strict SDK marker plus default instructions appends original separator/markdown in system section;18locales,raw unchanged,real HTTP/custom instructions not mislabeled. Actual adapter/DetailPanel/ContextTab selection/raw red→52component checks/full1579(5+332+1030+212),0skip/build pass. Fresh production85bb4dif:702files/204exactWeb/290runtime/B1.2/isolatedCLI pass. E23a51bd1a expansion reused;no GUI pass,both CUA channels unavailable. Next chosen unavailable Context categories,B4 pending,no squash/push/PR. E58 local76bff2c.

### B4 E60 explicit unavailable Context categories

User selected original SDK-only Context Usage entry with accurate unavailable state;current usage bar unchanged. Fixed-final original centered Empty/secondary Text and exact center CSS,18original labels plus18truthful messages. Official exec/native protocol exposes token totals,not Claude get_context_usage categories;no synthetic classifier or dead control/fetch/WS/timer pipeline. Red→55 actual component/boundary checks+7 usage regressions/full1579(5+332+1030+212),0skip/build pass. Fresh productionm9b0az2f:702files/204exactWeb/290runtime/B1.2/isolatedCLI pass. GUI pending,both CUA channels unavailable;other mixed work packages and B4 not globally complete,no squash/push/PR. See B4.63/B4-context-unavailable-2026-11-21.json. E59localf0bfc21.

### B4 E61 role routing and model-window scope audit

3cc05b496dd2c0535df492455001b2524d091ef4 runtime diff fully read across role helpers/storage/watchers/proxy auth/model/retry/PTY env/preferences/React/CSS/V2-V3metadata;fixed-final role helper retained. B4 native identity alreadyE9/E24/E33;role assignments/routing/statistics remain B8 unimplemented,not complete. 3a2159219b0d02858bb385ebc12a5009397b7b36 all7file diff/final rules/later DeepSeek-Kimi alias changes read. Unknown1M is model policy;user retained existing usage bar,353Kunchanged;Workflow capacity helper B8 still pending. Documentation only,no new runtime/test/GUI claim. LatestE60f825be3/full1579/installed290/build remains. B4 pending,continue PTY/efc7,no squash/push/PR. See B4.64/B4-role-window-scope-2026-11-21.json.

### B4 E62 SDK main WS no-PTY gate

Actual efc7server diff exposed missing no-op boundary:SDK main socket rawinput/input-sequential could spawn hidden main shell. Original4type gate restored after shape validation;independent scratch handler unchanged. Real loopbackWS/fakePTY red1spawn→green0spawn/0runningPTY/no sequence ack;22target/full1580(5+332+1031+212),0skip/build pass. Fresh productionznsc0qsh:702files/204exactWeb/291runtime/B1.2/isolatedCLI pass. NoUI,shell command,real model/credentials/log changes. B4 pending,GUI unavailable;remaining scope matrix next,no squash/push/PR. See B4.65/B4-sdk-pty-gate-2026-11-21.json. E61local6f8f1e1.

### B4 E63 closure matrix and remaining mixed scopes

Actual efc7fullSDK/CLI/server/adapter/policy/identity/modeldiffs mapped to existing B4 entries;PTY normalized semantic diff confirms shared prompt launch extraction. Codex canonical SDK events remain durable viaB3,not blindly deleted as Claude synthetic path. Original dafequeue341/CLI/IM/ChatView/server and fixed-final core1–606/dispatch restoration read;local ordinaryPTY queue absent,originalB0/planB7 input scope remains unimplemented. E53/E54 B4 defects fixed;oldIM B11/prompt assetsB8 etc remain explicit. B4-completion-matrix.md lists5remainingGUI groups;finalCUA inventory againempty apps/browsers with nativepipe/browserhost failures. Doc-only,no new testclaim;latestE62 34fdb58 source1580/installed291/build remains. B4not complete,no squash/push/PR.

### B4 E64 PR preflight and EOF-only cleanup

Read-only fetch/GitHub API confirm main e268ec0039f26276c9aa75d0a5a95b3aa26d2b62;at parent94ec764,0remote-only/69local-only commits and no open main PR. Full-hash/file lists and body draft prepared in/tmp,not submitted. Full diff whitespace check found one excess EOF newline in local E5 6102667 native request descriptor;remove exactly1LF,all other bytes identical,no new upstream functional mapping. Node syntax/full main-diff whitespace checks,6approval regressions/build pass;fresh production289e7o01:702files/204exactWeb/291runtime/B1.2/isolatedCLI pass. Latest full1580source remains E62 34fdb58,not rerun or newly claimed. CUA inventory againempty/nativepipe+browserhost failure;G1–G5 still pending,B4 incomplete,no squash/push/PR. See B4.67/B4-pr-preflight-2026-11-21.json.

### B4 E65 GUI fixture readiness while browser access is unavailable

Reused full existing isolated b4-tasks-gui probe;add native completed contextCompaction with foreign+duplicate rejection and3Context variants on current thread. Real production HTTP/WS/fake child:compact A1/B0/no invented tokens;canonical cold materialization SDK/custom/HTTPshape markers true/true/false with original instructions;actual queue/send-now closes old approval via perm-hook-timeout,rejects late old ID,and isolates sibling. Initial assertion mistakes (undefined TOOL input/wrong close-event expectation) corrected and rerun,not production fixes. Syntax/diff checks pass;no new full/build/installed/GUI pass. CUA inventory and directiab creation both fail;temporary Playwright alternative requested interactively,not yet explicitly chosen or used. G1–G5/B4 pending,no squash/push/PR. See B4.68/B4-gui-readiness-2026-11-21.json.

### B4 E66 actual GUI acceptance and work-package completion

User explicitly approved temporary Playwright and later PR self-review/merge. Actual production UI on Chromium159.0.8154.6/WebKit27.2:allG1–G5 pass,including live/cold divergence,approval queue preemption/isolation,classic11px scrollbar drag0→2472,HUD159→queue197px spacers,emptyerror/longreply,phone390/pad834 emulation,compact originalslot/resume clear,placeholder raw/source boundaries,andContext unavailable/PTY/offline gates.12original screenshots+hashes committed;no production UI/protocol changes to pass. Automation setup/locator misconceptions corrected against DOM/source,not counted as product defects. All owned browsers/4fixtures stopped. Final release:check full1580(5+332+1031+212),0skip/build/packdryrun passed;E64 installed291/702files/204exactWeb/B1.2/CLI remains,not rerun. B4complete,othermixed packages explicitly pending. Next preservefullhash/backup,1commit/1PR,self-check actual checks then mergeviaPR perlatestauthorization. See B4.69/B4-completion-matrix.md/B4-final-gui-2026-11-21.json.

### B4 original-history consolidation and PR delivery

B4 E66 completion tip 78448bb32e50dfe6b51c30bd4fd5f60fa8f4e64f contains all72 local commits after GitHub main e268ec0039f26276c9aa75d0a5a95b3aa26d2b62. Preserve full original history in backup/b4-before-squash-2026-11-21-78448bb and verified local bundle; all72 fullhash/title entries retained in B4-original-commits-2026-11-21.tsv. New codex/b4-baseline-alignment branch squashes this exact tree into one PR commit; only delivery docs/mapping intentionally differ. Production/test/asset/probe blobs remain exact; actual PR checks and merge outcome are read back on GitHub and stored in local consolidation receipt, not claimed in advance. See local-commit-consolidation-2026-11-21.md.
