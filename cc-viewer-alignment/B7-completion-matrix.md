# B7 完成矩阵

2026-11-22，固定上游`74cd752d99caf122e750216d2af3bb9f467c4de1`。**B7输入、导航和Skills工作包在下述范围完成（第8/12工作包）。** 51笔独立提交已整合为`5b1c397`，经[PR #8](https://github.com/weiesky/cx-viewer/pull/8)合并main（`89a8d9d`）。本地进度文档按用户要求在PR实际合并后才更新。

| 范围 | 结果与证据 |
| --- | --- |
| 普通CLI多工作区 | E1–E15独立PTY/bridge/proxy/runtime、精确registry和owner路由、原Header“＋”/共享弹窗及进程树；真实Codex双工作区GUI通过，原会话保留，见[实施](./B7-implementation.md#e13)。 |
| 输入与布局 | E16/E17原12行、ghost/observer/响应式后修，E20原导航/mic位置，E21草稿保留，E32窄split280px/横滚；源码/CSS及双引擎分项GUI，见[窄split](./B7-narrow-split/result.json)。 |
| 导航与汇总 | E18原Plan/Ask/UltraPlan/producer映射及缓存，E19/E19a原更多/三视图/txt/空计数，见[导航](./B7-prompt-nav/result.json)、[汇总](./B7-user-prompts/result.json)。 |
| Skills | E22–E25原作用域行和slash菜单、实际native skills/list/项目.agents元数据；选择按用户决定填$name，见[源码](./B7-E25-slash-source.json)、[GUI](./B7-slash-menu/result.json)。不编造Claude内置命令。 |
| 普通队列与编辑器 | E28–E35原50条忙队列/Send now/Stop/IM互斥、native安全状态、原生即时单行paste与精确editor owner；真实native本机模型队列/24次单行提交/Ctrl+G往返通过，见[队列](./B7-pty-queue/result.json)、[编辑器](./B7-editor-owner/result.json)。 |
| SDK与渲染后修 | E33 Sending/30s占位核销；E36原800/400/300窗口；E37–39原上传首行与18语言词条；E40a/E40只读URL/逐帧扩窗。各原CSS及分项双引擎证据保留。 |
| HUD/简洁聊天/钉选 | E41普通精确root计划、原HUD整CSS；E42原minimalChat及native full-card/thread边界；E43空白气泡；E45原server偏好pin迁移。见[HUD](./B7-pty-task-hud/result.json)、[minimal](./B7-minimal-chat/result.json)、[pins](./B7-pinned-preferences/result.json)。HUD模型producer限制见下。 |
| 候选闭合 | [74候选矩阵](./B7-candidate-matrix.md)及[最终源码依据](./B7-E48-effective-source.json)，追加两源码scope。混合提示资产、定时、插件及平台内容不整体勾选，B8–B11继续独立推进。 |

最终`pnpm release:check`退出0：**2181/2181、0skip，build/assemble及pack723**。真实npm生产新安装**634/634、0skip**，B1.2和隔离CLI相对目录启动通过；全部723包文件及211Web资源与最终构建精确字节相同。见[最终回执](./B7-final-2026-11-22.json)、[安装回执](./B7-installed-2026-11-22.json)。此前两次全量中的夹具漏模块/异步断言/半写PID已分别E44/E46修正；只把最终成功轮计通过。

真实GUI使用Chromium159/WebKit27.2，phone/pad为仿真。真实Codex0.169的外部编辑器与输入/队列使用本机受控模型；E41计划HUD使用受控native JSON-RPC子进程贯通实际PTY/runtime/bridge/HTTP/WS/GUI，**实际0.169模型产生root plan事件未验**，不冒称真实计划工具执行。外部模型、物理设备/音频/IME、真实LAN/TLS、其他OS/最低Node未验；既有IM并发偶发、Markdown冷开行号问题保留。

原始51笔hash、上游映射和恢复备份见[整合记录](./B7-local-commit-consolidation-2026-11-22.md)。GitHub PR无配置检查，实际可合并状态/精确head/322文件分页/远端tree及合并后main tree均已核对；没有把空CI列表称为通过。未发布npm，未重启托管当前会话的7008旧后端，正常重启后的入口复验留到用户环境；npm bin原已指向本仓库。

下一会话按[B8交接](./B8-handoff.md)继续。本轮不启动B8。
