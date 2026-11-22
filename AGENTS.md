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
- 当前进度：2026-11-22 B8已完成（第9/12工作包），固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`。37笔本地提交已备份并整合 `e2ee6e3`，经[PR #9](https://github.com/weiesky/cx-viewer/pull/9)自核238远端文件/精确head与tree后合并main（`6106d41`）；实际无PR checks。54候选按B8子项核销，七组native提示默认启用/仅新会话、手动与resume/fork钉扎、headless完整链、所属native主/子分源/原UI、动态原生窗口与未知态、SDK两transport endpoint/路径/去重/恢复及SSE慢恢复完成；代理重试配置与统计整项撤回排除。最终2232/2232、0skip/build/pack737，新生产安装685/685及全部737包/211Web精确字节、B1.2/隔离CLI通过；实际默认SDK双引擎4请求/idle/发送恢复/刷新/归档与AppServer default provider主2/子1证明通过。SDK exec子源不可用/窗口缺失未知、Teammate隐藏；外部模型/自动压缩/用户现用SDK地址和正常重启、真机/音频/IME/LAN-TLS/其他OS最低Node/历史IM偶发仍未验。活动7008/PID38260未由代理重启，最终自有fixtures退出；旧353K选择已由原生动态窗口取代。合并后才更新本进度；[B8完成矩阵](cc-viewer-alignment/B8-completion-matrix.md)、[原始映射](cc-viewer-alignment/B8-original-commits-2026-11-22.json)与[B9交接](cc-viewer-alignment/B9-handoff.md)已准备，B9本轮未启动。
- 普通工作区入口纠偏（2026-11-22）：B7 E12/E13已恢复普通PTY registry与原Header“＋”，经真实CLI双引擎启动/切回原会话验证；E31队列经真实原生8场20图验证。B8 E16只读复核活动7008/PID38260已具ptyMode=true/ptyQueueAvailable=true，sdkMode=false；该API核对不替代活动实例GUI验收。历史[缺口记录](cc-viewer-alignment/B2-pty-workspace-entry-gap-2026-11-21.md)与[B7实施](cc-viewer-alignment/B7-implementation.md)保留。
- 当前运行入口（2026-11-22只读核对）：全局bin/cxv软链本仓库packages/app/cli.js；7008由外部重启为PID38260，本轮只读API为普通PTY模式。代理未重启/停止该进程，也未停止ccv --sdk实例。用户报告SDK页面的准确地址仍待答复，既有运行进程须正常重启才加载本轮后端修复；不得将新dist或npm链接等同已加载新后端。历史见[入口与重启交接](cc-viewer-alignment/B6-runtime-entry-2026-11-21.md)。
- 每次完成本专项的一轮迭代后，同步更新本标记，写明已完成内容、当前工作包、下一步以及阻塞或未验证事项；同时在提交台账中记录对应上游提交、本地实现和验证结果。保持本段为最新状态，不追加过时的进度记录。
- 持续推进约定：用户要求持续推进到 B0 台账中的提交全部对齐，遇到需要产品、权限或迁移方案决策时再询问；不得将部分子项实现等同整条提交完成。
- 用户后续授权（2026-11-22，最新明确）：B7验证后整合所有本地commit，创建面向main的PR并由代理自行核差异/实际CI后合并；合并完成后再更新本地进度文档。已按此顺序完成51笔整合及PR #8，原hash映射/备份保留。B8已完成PR #9；用户2026-11-22追加授权：B8完成后整合本地commit、提main PR、自行核差异/实际CI后合并，再更新文档并准备B9（不提前执行B9）；临时Playwright隔离GUI授权保持，活动7008/PID38260不由代理停止。
- 迁移提交约定：按用户要求小步迁移，每笔只处理一个独立改动，验证通过后单独提交，再进入下一笔；保留上游 hash 与本地 commit 映射，不把混合提交整批搬入。
- 实例化验证约定：每轮实施后先在当前环境尝试；若无法跑通，记录失败原因、可复现步骤、预期结果和环境要求，交由用户验证，不阻塞可独立推进的后续工作。不得将未完成的实例化验证标为通过。
