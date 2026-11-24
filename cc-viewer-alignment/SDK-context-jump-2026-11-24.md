# SDK 上下文血条回跳修复（2026-11-24）

用户报告 4%→86%/88%→4% 反复跳变，明确不是压缩。截图分别显示 224.2K (86%) 与 21.4K (4%)。

## 事实与复现

只读核对活动 7008/PID47168：SDK exec，精确 instance 为 `cxv-b0a2df9bf061f340518649d01ae666ea`。原生同线程记录中，`2026-11-24T03:27:33.943Z` 的末次上下文为 21,380 / 258,400；`03:47:21.409Z` 为 224,203 / 258,400，分别精确对应 4% 和 86%。最新 100 条测量中只有最早一条约21K，后续原生用量持续增长；不能把界面反复回到同一旧值解释为连续压缩。规范归档也确认 21,380 来自本会话第一轮回复。

活动 SSE 的短时只读采样及独立浏览器观察没有再次捕捉完整自然回跳序列，因此不宣称已抓到用户截图对应的每条事件顺序。通过实际 AppBase 监听器与 AppHeader 渲染，使用相同数据结构稳定复现了确定的覆盖缺陷：原生 224,203 快照进入后，发送一个只有旧 usage/window 的普通 `context_window`，旧代码会将 state 覆盖为21,380，且 core 因缺少 `codex-rollout` 身份而退回旧归档；下一条原生测量再把显示拉高。修复前回归断言确实失败：`21380 !== 224203`。

## 原因与最小修复

读取了 AppBase control SSE、桌面 AppHeader/LiveTagPopover、Mobile、core/context-rules、SDK exec reader/manager、SDK adapter、server 归档提交监听器和 V2 投影/摘要/归档扫描链路。此前 SDK 上下文实现沿用的固定上游基线仍为 `74cd752d99caf122e750216d2af3bb9f467c4de1`；本轮仅修 Codex 适配的数据所有权，不迁移新 B0 项，不修改 DOM/CSS/百分比公式或 native reader 的测量口径。

原控制监听器无条件接收 context_window，既不检查旧连接/实例，也不比较测量时间。SDK exec 存在两条发送通道：manager 的原生 rollout 实时快照，和 server 规范归档提交后的普通通知；后者缺少 source/session/turn/测量时间，不能覆盖较新的原生快照。

1. server 的 SDK exec 归档提交不再广播第二份上下文事件。manager 保持实时及重连事实源，归档仍保留 context_usage/window 供冷加载。AppServer 与普通 PTY 原有提交路径保留。
2. AppBase 绑定实际 control source 与 URL instance，拒绝卸载、历史只读、旧连接、导航前和跨实例事件。
3. 原生快照要求完整 scope 和有效时间；一旦已持有原生快照，普通无身份事件、不同会话/cwd/实例及更早测量均不能覆盖它。判据是身份和时间，不是 token 大小；真实更新后的低用量仍然允许。
4. 只有真正接受的新快照才能取消 clear 乐观计时器、解锁血条。拒绝的迟到事件不影响该生命周期。

## 验证与交付边界

定向152/152（其后增强真实Header百分比断言），真实HTTP/SSE归档隔离断言通过；最终全量 **2843/2843，0 skip，退出0**（9+7+28+812+1741+246），build、533文件边界/0违规、603源码路径和628稳定tarball路径通过。修复前失败与修复后结果、浏览器结果见[机器回执](./SDK-context-jump-2026-11-24.json)。

独立 Chrome GUI 使用自有临时 HOME/日志与 fake Codex，只向该自有服务重放事件，不向用户会话注入消息或控制事件。实际显示序列为21.4K (4%)→224.2K (86%)→227.9K (88%)→25.0K (5%)；中途普通旧21.4K和原生迟到21.4K都没有导致回跳，真正较新的25.0K正常下降。无pageerror。截图：[86%](./evidence/SDK-context-jump-2026-11-24/native-86.png)、[88%](./evidence/SDK-context-jump-2026-11-24/native-88.png)、[真实下降](./evidence/SDK-context-jump-2026-11-24/newer-reduction-5.png)。首轮定时夹具在浏览器连接完成前发送86%而漏测；改为浏览器就绪后启动自有重放，生产代码未因此改动，失败记录保留于机器回执。

用户活动实例未停止/重启、全局Codex配置和已有归档未改；未发布npm/未运行version。当前为B11后SDK上下文事件所有权维护；下一步正常重启后的活动验收。Windows、Electron、真机及活动实例修复后GUI未验，不以隔离夹具代替活动验收。
