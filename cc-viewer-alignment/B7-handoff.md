# B7 历史启动交接（已完成）

2026-11-22更新：B7已由PR #8合并main，以下为2026-11-21历史起点，不再代表当前待办。当前结果见[B7完成矩阵](./B7-completion-matrix.md)，下一会话见[B8交接](./B8-handoff.md)。

2026-11-21交接。**用户明确要求本会话只交付B6，B7留待下一会话；B7尚未实施。** B6原16笔合为实现提交`e885d8bf5376767fc6f211a9e0a7209de3983656`，已由[PR #6](https://github.com/weiesky/cx-viewer/pull/6)于2026-11-21 19:00:48（Asia/Shanghai）合并main，合并提交`9f3e2ce9b891f4d2e31f9a4b8fb4607b5f4bf996`。原始提交、上游映射和恢复备份见[B6整合记录](./B6-local-commit-consolidation-2026-11-21.md)。本交接文件随合并后的仅文档PR同步，不包含B7实现。

## 开始前先读

1. 根AGENTS.md与[源码优先迁移规范](./migration-code-first.md)，固定上游仍为`74cd752d99caf122e750216d2af3bb9f467c4de1`，研究副本`/tmp/cxv-cc-viewer-research`。先核实际diff、完整调用链/CSS与后续修复，再选择最小迁移，不根据规划重设计。
2. [规划B7](./cc-viewer-alignment-plan.md#b7--输入体验导航和-skills)、[时间顺序21条索引](./cc-viewer-alignment-commit-index.md#b7)与[B0交叉72条索引](./B0-cross-index.md#cross-b7)。这些是索引，不把21或72直接当最终去重候选数，也不把已完成的混合子项当整条提交完成。
3. [B6完成矩阵](./B6-completion-matrix.md)和[候选范围](./B6-candidate-matrix.md)：预览/选区/Markdown复制已迁，不重写；B3冷读/窗口、B4任务/审批和B5文件能力沿用各自证据，B7输入区/队列/导航仍需逐项核对。

## 优先纠偏：普通模式缺少增加工作区入口

用户截图中的普通CLI/PTY没有“＋”，7008实际`/api/cli-mode`为`cliMode:true, sdkMode:false, workspaceMode:false`。本地`renderSdkWorkspaces`由sdkMode门槛隐藏入口；上游普通项目标签旁也有NewProjectButton。该B2普通模式Header项已恢复待纠偏，见[缺口记录](./B2-pty-workspace-entry-gap-2026-11-21.md)。

先追完固定上游HeaderProjectSwitcher/NewProjectButton→共享NewProjectModal/WorkspaceList→普通PTY注册/启动→视图切换与关闭的全链，连同CSS及相关PR后续修复。本地非SDK launch仍走全局initForWorkspace，不能只去掉UI判断、借SDK registry或自动更换transport，造成当前会话被替换却宣称原多工作区能力完成。先证明新cwd/同名实例独立、原会话与进程保留、切回和关闭正确，再核销普通模式入口。

## B7范围

按实际依赖逐笔处理composer及普通SDK/PTY布局、排队发送/立即发送/中断/失败恢复、输入草稿、Prompt导航及Plan/Ask/UltraPlan归属、slash和模型chip、Skills展示/导入/错误反馈。只展示Codex真实支持的能力。保留已验证的相关PTY ACK、安全粘贴、队列权威ID及scope/代次保护，不以原生SDK队列内部能力代替完整产品行为。

窄split发送钮裁切、普通主PTY新GUI与触屏/IME是明确待核项；优先复用原布局，不能另造组件或重排界面。每笔实施后本环境尝试实际运行，验证通过单独提交，更新AGENTS/台账的上游→本地映射；不能实例化时写清复现、预期、环境及失败原因，不将未验项记通过。

## 当前运行入口与验收检查点

- 全局bin/cxv已软链到本仓库packages/app/cli.js，包目录本身即仓库，无需重新link。
- 此交付没有重启活动7008/PID72817。其从17:57启动且托管当前会话；实测首页读新dist，但B6两新API仍回首页HTML，旧后端模块未重新加载。下一会话先确认实际PID/端口，按[重启交接](./B6-runtime-entry-2026-11-21.md)正常重启原命令后复验，不能将PR合并或浏览器刷新视为后端已加载。普通模式“＋”的代码缺口独立存在，重启不会修复。
- 既有B6最终1986/1986、0skip及525/525新安装运行时保持。整合后新build/pack720、artifact-only生产安装的源码/许可/211Web字节通过，未重跑1986/525。26图hash再核对，原GUI6场/10轮问答证据保留。
- PR #6实际无check-runs/statuses，statusCheckRollup为空；仓库只有tag/release发布工作流，无PR CI，不能称CI通过。未打tag、未发布npm、未迁移真实凭据。
- stdin超时用例与IM并发偶发根因未定；真机/物理音频/触屏/软键盘/跨应用剪贴板、真实LAN/TLS/模型/OAuth/远端MCP、其他OS/最低Node未验。原iPad替换横滚已选保留、Markdown冷开行号缺陷保持。默认exec/显式AppServer渐进、353K用量条以及native profile/image-input/add-dir/review不支持边界不变。
