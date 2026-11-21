## Before writing code

the agent stops at the first rung that holds:

1. Does this need to exist?   → no: skip it (YAGNI)
2. Already in this codebase?  → reuse it, don't rewrite
3. Stdlib does it?            → use it
4. Native platform feature?   → use it
5. Installed dependency?      → use it
6. One line?                  → one line
7. Only then: the minimum that works
   The ladder runs after it understands the problem, not instead of it: it reads the code the change touches and traces the real flow before picking a rung. Lazy about the solution, never about reading.
   Lazy, not negligent: trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

## Proactive communication

1. Use `request_user_input` to clarify user intent whenever the request is ambiguous.
2. Do not act unilaterally. Any major decisions or directional choices must be communicated using `request_user_input` to avoid going further down the wrong path.
3. Don't do anything that goes against the user's intentions; always focus on the user's prompt.
4. 用户要求后续问题必须通过提问工具列出选项，让用户直接选择，不用正文问句或仅提示另行回复；需要当场确定的选择优先使用 request_user_input。既有授权与已选方案持续有效。B3已明确授权自主迁移并选择渐进启用，不重复确认。

## cc-viewer 功能对齐进度

- 源码优先迁移约束（2026-11-19 用户明确）：这是基线对齐，不是重新设计。每笔实施前先读固定基线 PR 的实际 diff、完整组件/调用链与 CSS，核对后续修复/回退；规划文档不能替代代码依据。保持上游布局、样式与交互，Codex 差异仅作有证据的最小必要适配；不得自行新增或重排界面。已偏离的实现须恢复待纠偏状态，测试通过不等于视觉对齐。详见[源码优先迁移规范](cc-viewer-alignment/migration-code-first.md)。
- 专项入口：[cc-viewer-alignment/README.md](cc-viewer-alignment/README.md)；任务与依赖见[对齐规划](cc-viewer-alignment/cc-viewer-alignment-plan.md)，逐项状态与证据见[提交台账](cc-viewer-alignment/cc-viewer-alignment-commit-ledger.md)。
- 当前进度：2026-11-22 B7实施中（第8/12工作包），固定上游74cd752d99caf122e750216d2af3bb9f467c4de1，分支codex/b7-input-navigation-skills，起点main8968935，74索引候选及追加源码子项逐项核验。E1–E41及E19a/E31a/E31b/E40a独立完成；原普通PTY任务HUD接精确root计划快照，整CSS同基线，226/226、build与受控native协议双引擎6场12图通过；实际0.169未见plan工具事件，不记模型执行已验，继续审计。 普通“＋”、输入12行/ghost/导航/汇总/Skills菜单、窄split、主PTY与scratch进程树均已有分项证据；74候选完整闭合及最终全量/新安装仍待完成，B7未完成。新工作区权限遵循已选弹窗；/选技能填原生$name；合成AppServer会话使用codex://app-server/turn（均经用户选定）。活动7008不重启；IM偶发、物理设备/音频/外部模型/真实LAN/TLS/其他OS/最低Node未验保持，exec/显式AppServer渐进与353K不变。见[B7实施](cc-viewer-alignment/B7-implementation.md)。
- 普通工作区入口纠偏（2026-11-22）：E12/E13已恢复普通PTY registry与原Header“＋”，经真实CLI双引擎启动/切回原会话验证；E31新增队列又经真实原生8场20图验证。活动7008仍为旧后端，不具新ptyMode能力；需下一次正常重启后复验入口，不把npm链接当失败。历史[缺口记录](cc-viewer-alignment/B2-pty-workspace-entry-gap-2026-11-21.md)与[B7实施](cc-viewer-alignment/B7-implementation.md)保留。
- 当前运行入口（2026-11-21只读核对）：全局bin/cxv已软链到本仓库packages/app/cli.js，包目录本身即仓库；7008/PID72817从17:57运行旧后端，虽首页已读取最新dist，新archive/audio API仍回首页HTML。其为当前代理父进程，尚未重启；下一次正常重启后复验API，勿误判npm链接失败。见[入口与重启交接](cc-viewer-alignment/B6-runtime-entry-2026-11-21.md)。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-21，最新明确）：用户本次要求“开始执行B7”，取代上一轮B7留待下一会话的边界；自主按固定基线、小步验证后独立提交。B6原16笔整合及PR #6/#7已交付，备份/hash保持；本轮B7不自动推送/压缩/PR合并。用户已通过选项选择新PTY工作区权限以新建弹窗为准，不继承boot绕过审批参数，后续不重复确认。临时Playwright隔离GUI授权保持，不停止托管本会话的活动进程。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。
