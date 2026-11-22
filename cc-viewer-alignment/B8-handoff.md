# B8 入口与历史交接

2026-11-22用户已明确开启B8，E1–E4/SDK补项/E10–E15已完成独立子项；E16为2205全量/656新安装检查点，B8尚未整包完成。用户最新选择只在新会话生效：保留native resume/fork指令钉扎，不迁代理层提示词热切换；角色/无GUI指令与剩余候选继续；用户明确排除代理重试配置与统计。当前状态见[B8实施](./B8-implementation.md)、[候选矩阵](./B8-candidate-matrix.md)、[E16回执](./B8-E16-checkpoint.json)。下文为B7结束时的历史交接，不再代表当前运行PID或“本轮不启动B8”。

# 下一会话：B8 代理、模型与提示词

2026-11-22交接。B7已由[PR #8](https://github.com/weiesky/cx-viewer/pull/8)合并main（`89a8d9d`），原51笔已整为`5b1c397`，恢复备份/hash保留。合并后才更新本地进度；文档在本地main另行提交，尚未推送（符合本次“更新本地进度”要求）。本轮不启动B8。

1. 先读根AGENTS.md、[源码优先迁移规范](./migration-code-first.md)、[规划B8](./cc-viewer-alignment-plan.md#b8--代理模型与提示词)、[B8主索引](./cc-viewer-alignment-commit-index.md#b8)及[B0交叉候选](./B0-cross-index.md#cross-b8)。固定基线仍为`74cd752d99caf122e750216d2af3bb9f467c4de1`；有效研究副本`/tmp/cxv-cc-viewer-research-20261122`，先核HEAD，旧无日期副本Git元数据已丢失，不作依据。每笔先实读diff、完整组件/调用链/CSS与后续修复/回退，按用户要求小步验证后单独提交。
2. 复用[B7完成矩阵](./B7-completion-matrix.md)、[最终范围核销](./B7-candidate-matrix.md)和B4模型/Context证据。B7完成输入/导航/Skills，不代表模型提示资产已完成。优先核f28d9cae/1af3d646专家资产、8923322f/134a0de7 UltraReview及此前B4留下的模型preset/no-wait/别名等B8子项；不能直接把Claude Agent/Teammate命令写成Codex支持能力，遇实际产品/权限/迁移选择用提问工具列选项。
3. B8按既定规划核proxy重试统计、配置/刷新/JSON指标、native profile/Responses代理/角色归属/模型热切与fresh/resume/fork提示绑定；先查代码是否已有同等能力，复用现有native实现。保持原UI/CSS，避免按文档重新设计。
4. 既有用户选择持续有效：默认exec、显式AppServer渐进；353K用量条不改、原SDK分类入口为明确不可用；新普通PTY权限遵循新建弹窗，不继承boot bypass；slash选择技能填原生$name；合成native会话codex://app-server/turn；远程管理员方案按先前明确选择。native profile/image-input/add-dir/review的不支持边界保持，不能静默丢参数或伪造支持。
5. 当前全局bin/cxv已软链本仓库packages/app/cli.js。活动7008/PID72817是托管代理的旧后端，B7也未重启；下次用户正常重启后再查/api/cli-mode的ptyMode和“＋”。不得由代理杀当前父进程来验入口。真实本轮fixture93478及70738已按身份回收，无须复用旧端口；需要GUI可重新启动授权的隔离Playwright夹具。

最终已验2181/2181、0skip、build/pack723；全新安装634/634、全部723包文件/211Web字节、B1.2及隔离CLI通过。不因文档分支再声称重跑。实际Codex0.169模型计划事件producer未验，HUD受控协议已验；IM并发偶发、原Markdown冷开行号、物理设备/音频/IME、外部模型、真实LAN/TLS、其他OS/最低Node仍未验，继续按实例化约定记录失败及环境条件，独立工作不被阻塞。
