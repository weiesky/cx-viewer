# B4 App Server 执行器适配评估

当前实施更新：用户已确认渐进实现与受控子Agent测试；E1 c65f3f9、E2 a071323、E3 f401587已提交，E4内部manager/双向合成归档恢复已通过66项及真实CLI本机21次请求。exec仍默认，审批/图片准入完成前不开放CLI入口。下文评估阶段的“未实施”是当时状态；当前逐笔证据以[B4实施](./B4-implementation.md)为准。

2026-11-20。用户通过交互选择“评估 App Server 适配”；本轮完成评估与隔离兼容探针，**尚未修改生产执行器或默认启用策略**。已提交的本地源码中的任务快照/HUD仍为 `61c3d78` / `fab7d5f`，B4整体未完成。

## 结论与建议

真实安装的 Codex 0.169.0 可以经 stdio 提供比当前 `@openai/codex-sdk@0.142.5` 公开ThreadEvent更细的计划/线程/工具协议；建议新增可显式启用的App Server执行器，先维持现有exec为默认。在现有SDK session manager内接执行器边界，不另造工作区、队列、历史或UI。首阶段只让新建/空闲且显式选择的实例使用；不热切正在执行的turn，不自动批量转换日志。

用户随后已通过交互选择“渐进实现并验证”：采纳exec默认/显式AppServer的渐进方式，并允许隔离临时目录、本机合成服务驱动的受控子Agent协议测试。**“schema存在”不代表子Agent事件实际完整**：子线程是否自动订阅、后台完成是否会独立推送、root结束后的存活关系尚未实测，活跃卡不能据此标完成。

## 实际依据

- 固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`：已核对 `2914d6479d2845e0b193ba1c09aa6667c66850a6` 的活跃代理/任务快照子项，以及 `975313773a2edfcd0f8f640cdfe4c1681048f954` 的实际diff；读取最终 ActiveAgentsBar.jsx、完整CSS、activeAgents.js、sdkTaskTracker和ChatView接线。最终基线是右上角可折叠只读卡，与角色筛选互斥；已删除头像点击过滤，不重新引入。宽340px、原scrollbar补偿、桌面40px/手机48px消息顶留白及pad恢复按源码迁移。
- 本地 `sdk-manager.js` 当前按instance维持消息、队列、代次和proxy；实际执行为official SDK `runStreamed`→受监督的Codex exec子进程。`sdk-exec-runner.mjs`提供POSIX自身进程组终止；不能因换传输丢掉该能力。
- 当前 `appserver-bridge.js` 为TUI代理，包含**模块级** `_threadStates/_upstreamWs/_appServerProcess`。不能为多个SDK实例重复调用startAppServerBridge，否则会共享/覆盖运行态。可抽取其中纯转换逻辑；不将整个bridge当SDK实例执行器。
- `sdk-resume-history.js`强制manifest source=sdk与metadata.sdk=openai-codex-sdk，按精确cwd/project/thread验证。直接写现有bridge的 `_appServerSource` 格式会破坏SDK归档恢复，必须保持现有archive/显示契约。
- 由**实际安装二进制**生成的JSON Schema已核对ThreadStart/Resume、TurnStart/Interrupt、TurnPlanUpdated、ItemStarted/Completed、ThreadStatusChanged；原始schema/帧保留在隔离探针输出目录，不依赖在线最新文档。

## 当前已验证

可复跑：`node cc-viewer-alignment/probes/b4-appserver-compat.mjs [codex可执行文件]`。真实 `codex-cli 0.169.0`、正式SDK0.142.5、临时HOME/CODEX_HOME、fixture-only凭据、两个各自进程且basename同为same的工作目录，本机合成Responses服务共7次请求。没有外部模型调用，也没有启动子Agent。结果见[兼容回执](./B4-appserver-compat-2026-11-20.json)，原始目录 `cxv-b4-appserver-compat-FzISkR`。

| 兼容项 | 实测结果 | 边界 |
| --- | --- | --- |
| stdio initialize→initialized→thread/start | 通过 | 两个独立App Server进程，无新增网络监听 |
| B等待上游时A完成一轮 | 通过 | 进程及原生threadId不同；不是生产session manager切换验收 |
| update_plan→turn/plan/updated | 通过 | 状态实际为completed/inProgress/pending；不能照抄Claude的in_progress |
| item/agentMessage/delta→turn/completed | 通过 | 合成回复，非真实远端流/网络故障 |
| turn/interrupt(threadId,turnId) | 通过 | B终态interrupted，A不受影响；OS后代进程回收未测 |
| 本机HTTP400失败 | 通过 | error通知及turn/completed failed均收到，非一般重试恢复 |
| 杀掉A App Server→重启→thread/resume→续发 | 通过 | 原生threadId保持，rollout在临时CODEX_HOME；非cx-viewer生产归档/UI恢复 |
| 当前exec SDK真实todo_list | 通过 | 同一local update_plan产生3项，HUD状态completed/pending/pending，未编造执行中 |
| 子Agent/Teammate | 仅schema/源码 | 未执行spawn，未测后台完成、子线程订阅或工具pill/耗时 |
| 审批、图片、全部CLI参数、平台 | 未验证 | 实施前补针对验证，不能套用上表宣称通过 |

探针首轮缺少update_plan不是传输故障：当前默认工具集未声明它；`features.goals=false`仅移除目标工具，**不会自动打开计划工具**，最后用结构化 `tools.update_plan.enabled=true` 才得到真实计划事件。此为探针配置，不改用户全局设置，生产适配应保留用户能力配置并在无计划工具时隐藏HUD。中间一次误用boolean `tools.update_plan=true`被CLI明确拒绝，已修正；探针现可即时报告子进程启动退出，避免只等RPC超时。原Chat转Responses测试适配器不支持web_search声明，fixture仅传实际function声明并显式禁用web搜索，未改产品adapter。

## 最小实现边界

1. **保留manager，抽出执行器。** exec继续使用正式SDK；新增每workspace闭包的AppServer执行器，复用已解析的cwd、codex路径/config/env、proxy与消息队列，首次实际执行时才启动自己拥有的stdio子进程。以协商后的二进制schema判断可用，避免硬编码“版本更高就支持”。
2. **同一archive与回执。** 对外沿用sdkToJSONLEntry、onStreamProgress/onStreamingStatus与当前SDK scope；原生AppServer消息只归属精确instance/thread/turn。工具结果保留结构化图片，历史仍写source=sdk及现有metadata，再附transport来源。恢复使用原生thread/resume，不把Viewer的显示messages重新当用户输入发给模型。
3. **取消与失败必须一次结算。** AbortSignal调用当前thread/turn的interrupt，等待其终态后才派发队列；close只回收自己拥有的进程/后代。握手失败可以在任何输入被接受前回到exec；一旦turn/start可能被接受或回复丢失，不透明重发，不自动退回另一个执行器制造重复任务。子进程死掉则报告失败/暂停队列，由明确的新输入或retry恢复。
4. **权限语义保持。** thread/start的sandbox与approvalPolicy沿用现有解析值；不存在的值必须拒绝，不能降级成更宽权限。实际0.169 schema不接受旧on-failure，须报告不兼容，不能静默改never。server-initiated审批/用户输入要按现有UI/owner/id路由，断线与超时拒绝；未接通前不能悄悄启用不可服务的请求工具。探针never+read-only仅用于无执行工具的本地合成测试。
5. **原HUD与活跃卡。** 计划用真实turn/plan/updated整份替换，inProgress→in_progress，终态失败保留已完成步骤并结束未完成项；新root输入不被子线程计划清空。子Agent用receiverThreadIds/parentThreadId精确归属和真实agentsStates/子线程事件更新，不能将collab工具本身completed当子Agent完成。没有工具名/时间戳时留空，无事件时不显示。Codex未提供Claude Teammate类型的情况下仅显示已证实的SubAgent身份，不按昵称猜角色。
6. **基线原样。** 只迁入固定ActiveAgentsBar组件/完整CSS及原ChatView落点、层级和关闭/恢复规则；不添加头像筛选、额外卡片布局或新的常驻设置入口。

## 按独立提交实施与准入

| 独立笔次 | 交付与验证 |
| --- | --- |
| E1 执行器边界 | 仅抽出当前exec调用，保持既有事件/queue/abort行为；现有SDK/所有权/恢复/产物回归，行为不变 |
| E2 stdio App Server适配 | 每实例process/RPC/通知/握手；受控进程异常、迟到response、并发、取消；本探针迁入生产路径验证 |
| E3 日志/队列/历史兼容 | 从当前schema做最小字段映射，旧SDK归档继续可恢复；重启、图片、错误、审批与选项不丢失 |
| E4 权威计划/代理快照 | 独立task/agent状态与重连，实例/root/child/turn代次隔离；需先实测受控子Agent的spawn→工具→后台终态/取消/复用 |
| E5 原活跃卡 | 固定组件/CSS逐字对照，桌面/窄屏/移动与历史/角色筛选互斥GUI，最终新安装回归 |

每笔先读对应上游diff/完整调用链，再迁入、验证、独立提交并回填台账。AppServer未满足准入时保持exec正常；任务HUD首轮实现不会被撤掉。若用户选择渐进实现，建议新增显式CLI选择 `--sdk-transport=appserver`（只与--sdk使用），当前默认仍exec；没有依据时不新增UI设置。切换仅适用于重新创建的空闲实例，正在运行/排队的实例拒绝切换。

## 已确认决策

已确认按上述显式渐进方式实施，并允许在隔离临时目录内运行本机合成模型驱动的受控子Agent协议测试。后者只为验证App Server事件完整性，不委派仓库开发，也不请求真实模型服务。没有这项实际验证，不把活跃Agent卡标为基线对齐完成。


2026-11-20 E5准入更新：实例所属审批/问答、重连重放、原工具卡/结果归档已接入，原生真实问答与Safari验证通过，详见[B4.8](./B4-implementation.md)。默认exec及渐进授权持续有效；图片结果/选项准入完成前不开放CLI，不重复询问已选方案。真实命令/文件/permissions审批仍只有fake stdio加真实HTTP/WS覆盖，不冒充真实模型通过。


2026-11-20 E8准入更新：审批/问答、结构化图片和原生配置边界已完成针对验证，现已开放显式 `cxv --sdk --sdk-transport=appserver`，默认exec。当前不支持的profile/image-input/add-dir/review明确拒绝。1449全量、新安装183项、真实生产CLI本机28次请求通过；见[B4.11](./B4-implementation.md)。活跃卡及其他B4候选仍待，不将传输准入等同B4完成。
