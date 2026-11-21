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
- 当前进度：2026-11-21 B6已完成（第7/12工作包），固定上游74cd752d99caf122e750216d2af3bb9f467c4de1；B5已由PR #5合并main（1c7eac5）。E1–E13逐笔迁入归档/音频/字幕/图像分发、助手/diff/KV/Ask选区与Markdown复制；E12修复共享CAS body覆盖旧回合，E14收口。最终1986/1986、0skip/build/pack720；真实新安装525/525、必需源码/许可及211Web精确字节、B1.2/隔离CLI通过。实际Chromium159/WebKit27.2桌面及phone/pad仿真6场26图逐张核看，连续不刷新10轮问答通过。46候选混合子项独立保留；stdin超时用例一次偶发（定向/最终全测通过）及既有IM偶发根因未定。真实LAN/TLS/外部模型/物理设备音频/跨应用剪贴板/其他OS/最低Node未验；原iPad横滚与Markdown冷开行号缺陷、native不支持边界保持。默认exec/显式AppServer渐进与353K不变。原16笔已备份，按最新授权在codex/b6-baseline-alignment整合并准备PR交付；未切换活动安装。B7明确留待下一会话，本轮不启动，见[B6整合记录](cc-viewer-alignment/B6-local-commit-consolidation-2026-11-21.md)。见[B6完成矩阵](cc-viewer-alignment/B6-completion-matrix.md)。
- 当前纠偏事项（2026-11-21用户截图）：普通CLI/PTY增加工作区“＋”被本地sdkMode门槛隐藏，上游通用Header应有该按钮；7008实测sdkMode=false，重启也不能修复此UI门槛。B2普通模式Header恢复待纠偏，SDK既有证据不代替普通模式。须完整核对普通PTY并行启动/保留原会话链，不能仅移除条件或自动切SDK。见[缺口记录](cc-viewer-alignment/B2-pty-workspace-entry-gap-2026-11-21.md)。
- 当前运行入口（2026-11-21只读核对）：全局bin/cxv已软链到本仓库packages/app/cli.js，包目录本身即仓库；7008/PID72817从17:57运行旧后端，虽首页已读取最新dist，新archive/audio API仍回首页HTML。其为当前代理父进程，尚未重启；下一次正常重启后复验API，勿误判npm链接失败。见[入口与重启交接](cc-viewer-alignment/B6-runtime-entry-2026-11-21.md)。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-21，最新明确）：将本轮B6及后续诊断原16笔合为1commit，创建面向main的PR，由代理核差异及实际CI后自行经PR合并；保留原始hash映射与可恢复备份，不绕过PR直接推main，无需重复确认。合并后更新交接文档，下一会话执行B7，本会话不启动B7或PTY入口修复。临时Playwright隔离GUI授权保持。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。
