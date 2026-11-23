# SDK 当前上下文用量修复（2026-11-23）

用户已确认保留默认 SDK exec 并修复上下文百分比。本轮属于 B11 后本地 Codex 适配，不新增 B0 上游迁移。此前 SDK 启动警告修复仍独立保留在工作区。

## 源码依据与原因

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1` 的 `packages/app/server/lib/sdk-manager.js` `_collectContextUsage` 通过 Claude Query.getContextUsage 读取快照；已读其控制面/身份代次检查及最终 AppHeader → LiveTagPopover → CachePopoverContent 数据、DOM/CSS，并核 `efc7f8eab199a04f3b8dcb660a5bfde593138f66` 的 adapter 实际 diff。上游 Claude 接口不能直接用于 Codex。这里复用本地原有血条/弹层/百分比计算与 SSE 路由，只补 Codex 的事实源；不新增或重排 UI。

本机 Codex CLI 0.169.0、SDK 0.142.5。SDK 的 ThreadEvent 没有暴露原生窗口和末次上下文用量；0.169 exec 的 `usage_from_last_total` 实际输出 thread 累计值，不能拿它作上下文占用。[原生 exec 实现](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/exec/src/event_processor_with_jsonl_output.rs#L109)。百分比沿用项目已按 [原生 TokenUsage 规则](https://github.com/openai/codex/blob/rust-v0.169.0/codex-rs/protocol/src/protocol.rs#L2537) 实现的 12K 基线与舍入，不按模型名猜窗口。

## 实现链路

1. `sdk-exec-transport` 从官方 thread.started 获得线程 ID；同一线程每次 run 有自己的开始时间和 reader。
2. 新 `sdk-exec-context.js` 复用现有受监管 AppServer client，只执行 initialize、thread/read 以定位该线程持久路径，立即退出自有定位子进程；不 thread/resume、不 turn/start，也不改变 SDK 的默认 exec transport。无本地 history 时直接未知。
3. 校验 RPC threadId、规范 cwd（含 macOS /var 与 /private/var 别名）、原生 sessions/archived_sessions 根、普通文件及 session_meta 的 ID/cwd。拒绝越界路径、身份不符、硬链接；以 O_NOFOLLOW 打开规范叶文件。没有开放原生文件读取 API。
4. 用有界行缓存和 64KiB 块增量读原生 JSONL，只接纳本次调用开始后所属 task_started 内的 token_count.info.last_token_usage 和 model_context_window。普通事件最多追 8MiB；终结时以流式读取追到当前文件尾，避免长历史退回旧计数。完整行才发布；替换/截断重验身份；畸形或不支持的记录返回未知。另一 turn 不会被重标为当前 turn。
5. SDK 事件边界采样后产生内部 context.updated，manager 用现有 context_window SSE 按 cwd/instanceKey 推送；缓存只属于该驻留会话，重连重放、恢复/关闭清理，原 generation guard 拒绝旧会话迟到事件。没有每输出 token 的额外轮询。
6. 最终响应单独持久化 context_usage 与 context_window；原 usage 保留累计记账。服务端 commit SSE、桌面与移动端共用 core 选择规则；同线程/工作区/实例且较新的 live 快照可覆盖较早规范条目。未知时不展示累计量，并用已有中性色变量。无 DOM/CSS 结构变化。

## 验证与边界

详见 [机器回执](./SDK-context-usage-2026-11-23.json)。真实当前 Codex + SDK + manager 两轮同线程：20,377/475,000 → 2%，24,259/475,000 → 3%；第二轮累计 44,636 仍独立保留。两轮各一次 context 回调，JSON 冷快照同值；没有切换用户会话。

独立真实 HTTP/SSE + fake 原生记录验证两工作区 54,985/9% 与 171,029/34%，跨实例隔离、重连缓存和 LogV2Writer → readV2LogEntries 的规范冷加载通过。原生 Chrome 在独立 fixture 页面实际观察到血条和弹层 55.0K (9%)，刷新后保持；该 GUI 使用 fake Codex 与原生格式记录，不冒称活动 7008 或真实模型 GUI。

定向 11/11（含大历史、部分行、模型窗口变化、同线程异 turn、越界、硬链接、损坏与未知、归一化聊天行），Web 809/809，普通终端环境复核 76/76，构建、531 文件边界门/0违规、602 源码门、627 稳定包路径通过。最终完整隔离回归 **2833/2833、0 skip、退出 0**（9+7+28+809+1734+246）通过。重跑仅清理独立测试进程继承的运行标记，未改用户进程环境。首跑故障与修复/复跑均记录在机器回执中，不掩盖为首次通过。

当前支持本机默认 legacy JSONL；原生目录/分页历史会显示未知，尚未实现其适配。旧规范日志未写入 context_usage 时显示未知，下一次带原生测量的回复开始正常记录，不批量改写历史。Windows、活动实例 GUI 与真实跨环境未验。

本轮两项 SDK 修复已整为一个实现提交 `4a56de77fdea9584f7c1acb29aff008d45adfdf2`，经 [PR #14](https://github.com/weiesky/cx-viewer/pull/14) 于 `2026-11-23T14:56:09Z` squash 合并 main `fcbaf59d2306105544a713cbfbbd17af934b87a0`。合并 tree 与已验证实现 tree 完全一致；合并使用精确 head guard，未用 admin override。合并时远端 9 项成功、1 项重复 PR macOS contract 仍排队且无 runner；同一 head 的 push 五类检查（Ubuntu Node20/22/24 全套、macOS/Windows 定向）均成功。逐项 URL/状态见机器回执，不将排队记为成功。

合并后同步本地 main 并更新文档；未发布 npm、未运行 version。用户活动实例未停止或重启，后端模块需正常重启后加载；自有探针和隔离 GUI 服务已结束。
