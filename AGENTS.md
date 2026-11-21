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
- 当前进度：2026-11-21 B5已完成（第6/12工作包），固定上游74cd752d99caf122e750216d2af3bb9f467c4de1。E1–E45分笔完成搜索/原文件树与浏览菜单/导入移动下载编辑/引用/Git/Markdown路径，以及原AGENTS和project/user/plugin技能目录；E46汇总。E39普通入口组合native凭据/历史/owner策略，E40–44补原case-only回滚、delete/EXDEV、目录alias及平台sep；E45修复.agents祖先导航，仅目标祖先目录元数据例外，不放宽内容或写策略。用户已交互选择上游远程管理员，认证设置/内部bridge仍限本机。最终1781/1781、0skip、build/pack712；真实新安装487/487、必需源码与204Web文件精确字节、B1.2/隔离CLI通过。目标GUI为实际Chromium159/WebKit27.2的E38八场26图及E45 user/plugin两场6图，原FileBrowser整CSS相同；phone/pad仅仿真、remote仅偏好模拟及隔离HTTP。B4已由PR #4合并main（288faea），B5按用户最新授权将原46笔合为1commit，经1个面向main的PR自查后合并，原hash映射/恢复备份保留；交付预检仅清理1个末尾LF，搜索15/15、新构建/pack712及新安装产物字节通过；关联[PR #5](https://github.com/weiesky/cx-viewer/pull/5)，最终GitHub合并状态以该PR与整合回执为准。B6留待下一个会话执行，本会话不启动。见[B5交付记录](cc-viewer-alignment/B5-local-commit-consolidation-2026-11-21.md)。iPad替换横滚按已选保留；Markdown冷开行号原缺陷未计滚动通过；B7窄split/主PTY新GUI待核。B6–B11混合子项及IM并发偶发未定独立，真实LAN/TLS、外部模型、物理设备/音频、其他OS/最低Node未验；native profile/image-input/add-dir/review不支持边界保持。默认exec/显式AppServer渐进与353K用量条不变。见[B5完成矩阵](cc-viewer-alignment/B5-completion-matrix.md)。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-21，最新明确）：B5已完成，用户要求将B5原46笔合为一个commit，创建面向main的PR，代理自行核差异及实际CI后经PR合并；保留原始hash映射与可恢复备份，不绕过PR直接推main，无需重复确认。B6留待下一个会话执行，本会话不启动。用户已明确允许临时Playwright完成本机隔离GUI验收。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。
