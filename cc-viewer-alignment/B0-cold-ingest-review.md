# B0 冷加载异常与回合中刷新复核

2026-11-17；本地代码基线 `753fd6c632b5bac8577dfe98f28d666ff3437d28`，上游固定快照 `74cd752d99caf122e750216d2af3bb9f467c4de1`。本轮仅新增复核证据和隔离探针，没有实施 B3 修复。

## 上游范围与最终状态

- [`0670581b3d`](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d)：完整 diff 含客户端失败释放、已提交基线索引修复、null 行防护、V3 build 成功后才标 seen、冷装配失败泄洪，以及服务端 SSE 写异常关闭连接；不能只搬入口 catch。其测试含镜像 gate 状态机及源码锚点，不能直接证明本地 React 行为。
- [`d7f355ba89`](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89)：完整 diff 含服务端选择进行中的首轮、客户端允许已重建完整前缀的 inProgress 载体，以及缺失 response 不覆盖上一轮 response。上游 v1/v3 双协议的例外不适用于本地 canonical V2。
- 已读取固定快照的 AppBase：前者的 `_failColdIngest`、token 守卫、索引修复仍保留，但已适配后续多工作区 channel/VM；不能直接覆盖本地 AppBase。后者的历史协议、字段和模型也不能直接移植。

## 本地真实调用链

活跃日志：`initSSE → _initV2Snapshot → fetchLogV2Snapshot → LogV2Archive → _projectV2Rows → _runSseColdIngest → _runColdIngestCore → _processEntriesChunked → _processOneEntry → _commitColdIngest`。`_startV2Live` 在投影前订阅，完成 React 基线提交后才置 `_v2BootstrapReady=true` 并处理 `_v2LiveBuffer`。

历史日志：`loadLocalLogFile → _loadLocalV2LogFile → 同一 _runSseColdIngest`。虽然还存在 `_runLocalLogIngest` 定义，当前源码未发现其调用；不能把它当成实际历史入口。

`_processEntriesChunked` 先清空并重建实例级 `_requestIndexMap`，直到 `_commitColdIngest` 才提交 React state。若处理中途失败，索引已变化，而 state 仍是旧基线。`_initV2Snapshot` 的 catch 返回 false 并清除 archive；`initSSE` 随后清 loading、安排 1000ms 重试。历史入口 catch 只清 loading。两者都没有释放 gate 或恢复索引。

## 可重复的隔离验证

探针：[probes/b0-cold-ingest.mjs](./probes/b0-cold-ingest.mjs)。运行：

```sh
env -u CXV_BYPASS_PERMISSIONS node cc-viewer-alignment/probes/b0-cold-ingest.mjs
```

环境：Node v24.14.0、Darwin arm64。只写 `mkdtemp` 临时目录并启动随机 loopback 端口，结束关闭服务和 watcher、删除目录；无真实 Codex 请求或用户凭据。

探针从当前 AppBase 提取原始方法执行，复用实际 normalizer、slimmer、session merge、writer/coordinator 和 snapshot/object/live 路由。React setState 用同步宿主替代，rAF 只记录调度；浏览器 EventSource、IndexedDB 和控制 SSE 不运行。定时器被捕获，重试验证主动执行原代码安排的 1000ms 回调，没有真实等待一秒。源代码锚点变化会使探针失败。

| 场景 | 实测 | 结论边界 |
| --- | --- | --- |
| 已完成 P，当前 N 的第一轮只有请求、尚无 response | HTTP snapshot 选择 N；无 runtime 的持久指针也选择 N；AppBase 重建出 N 的用户消息，不含 P | 对应首轮刷新数据链路已具备；未验证真实 CLI、浏览器渲染和移动端 |
| snapshot 后完成同一请求，再建立 SSE | 实际 live 路由重放 seq=2；客户端 archive 接受 self-contained commit，object 路由可投影完成响应 | 覆盖 snapshot/订阅间一次提交；不代表所有重连、溢出和跨工作区场景通过 |
| 下一轮进行中再次冷加载 | 上一轮答案仍在 messages；`lastSession.response` 被清为 undefined | 上游 response 保留子项未等价；本地已把回答纳入 transcript，不能据此声称回答气泡丢失。建议/详情等实际消费者仍须 B3/B4 验证 |
| 活跃日志处理第一行后注入异常 | gate=true、旧 state 保留、旧基线索引丢失、bootstrapReady=false、archive=null；完整 initSSE 外层清 loading 并安排重试 | 失败清理缺口已确认；移除故障后执行重试回调成功，不能称为必然永久冻结 |
| 历史日志处理第一行后注入异常 | gate=true、旧 state 保留、旧基线索引丢失、archive 仍保留；loading=false，原入口没有安排重试 | 历史入口同样需要显式失败清理；未做浏览器端视觉复现 |
| 直接 `_processEntries([null])` | 访问 timestamp 抛错 | 方法缺少 null 防护；尚未证明合法 canonical archive 可经 HTTP 送入此 null 行 |

故障场景在真实处理方法返回后抛出指定异常，同时直接调用 `handleEntryObject` 注入一条 live entry，确认它仍留在 gate buffer。**异常与该 live entry 都是人工注入**。正常 V2 冷加载期间的 commit 先进入另一个 `_v2LiveBuffer`；不能把实验描述为真实 SSE 流必然在 gate buffer 无界堆积，也没有复现自然产生的损坏日志触发源。探针退出 0 表示观察与断言一致，其中包含预期存在的缺陷，绝不表示修复通过。

现有定向测试：

```sh
env -u CXV_BYPASS_PERMISSIONS CXV_TEST=1 CXV_LOG_DIR=tmp node --test \
  tests/log-v2-bootstrap.test.js tests/log-v2-conversation-parity.test.js \
  tests/log-v2-object-api.test.js tests/log-v2-transport.test.js \
  tests/conversation-entry-normalize.test.js tests/entry-slim.test.js
```

结果 **81/81 通过**。bootstrap 的三个测试主要是源码正则契约，不能代替故障行为测试。没有修改产品代码，本轮未重复全量构建或打包；此前 991 项隔离基线仍是历史记录。

## B3 后续实施与未验证项

1. **需适配**：复用 `_abortColdIngest`，以当前 token/epoch 为边界清理失败；避免旧管线失败释放新管线，避免直接释放后把增量合并进错误基线。根据本地 V2 设计选择重新拉取或保留基线，不复制上游 `_v2ColdSeed`。
2. **需适配**：恢复与已提交 state 一致的去重索引及 normalizer/slimmer，明确 archive、bootstrap buffer、gate buffer、loading 和重试的共同状态；覆盖持续故障、失败后重试、切换/卸载、新管线取代旧管线，以及索引修复再次失败。
3. **仍待核验**：`_queueV2Commit` 是 apply/project/handle 后才更新 `_v2AppliedSeq`，但 handleEntryObject 内部吞异常；需故障注入确认失败不会提前确认游标、吞掉修正帧。上游 V3 seen Set 没有直接本地映射。
4. **仍待核验**：当前服务端是 `serveLogV2Live → watchV2Timeline`，与上游 `_safeSseWrite` 不同。send 链失败后 onError 也可能尝试写；尚未注入真实 write 抛错、背压断开及双重错误，不能把上游服务端子项标为已具备。
5. **仍待核验**：真实 CLI 首轮进行中刷新、首轮停止/取消、两个客户端、同名实例、移动端/IndexedDB、React 异步提交和旧 response 消费语义。当前环境完成了上述隔离验证，其他平台与 GUI 验收保持未验证。

B0 继续复核高优先级与混合提交；B1–B11 尚未实施。本轮的明确状态是 `0670581b3d 需适配（B3，部分子项仍待核验）`、`d7f355ba89 首轮数据链路已具备，response 子项及产品验收仍待核验（B3/B4）`。
