# B3 浏览器恢复与真实窗口验证（2026-11-20）

上游依据：`0670581b3dd0bcecebc1a88d8a032f295b6ada66`、`d7f355ba895e24bb5e46c820a7d3105a76018ea3`、`5c28d4c50a` / `a30d8c92a7`的恢复/作用域语义；固定快照仍为`74cd752d99caf122e750216d2af3bb9f467c4de1`。本轮沿既有V2链路验证，没有改UI布局。

## 原生 Safari / 实际HTTP与 IndexedDB

浏览器连接host不可用；已按当前环境尝试并改用CUA原生Safari。运行隔离的B2 fake-Codex/临时HOME双同名工作区fixture，外层包装只计数真实HTTP路由与SSE reset帧，不替换页面方法、EventSource、IndexedDB或React。可复跑入口：[b3-browser-recovery.mjs](./probes/b3-browser-recovery.mjs)，先build再启动，JSON lines输入：

```json
{"kind":"write","index":0,"count":1}
{"kind":"stats"}
{"kind":"write","index":0,"count":300}
{"kind":"stats"}
{"kind":"restart"}
{"kind":"write","index":0,"count":1}
{"kind":"write","index":1,"count":1}
```

本次使用临时root `cxv-b2-workspace-gui-LFboxn`，仅fixture端口20220。只读取/操作该端口新开标签，没有操作用户真实会话。浏览器中实际观察：

| 场景 | HTTP观测与可见结果 | 边界 |
| --- | --- | --- |
| 初始A一条 | 显示`B3 A prompt 1`及`reply 1` | 实际浏览器SSE与投影，不是测试宿主 |
| A同步突发300条 | 真实SSE计数reset=1，snapshot 10→11、live 1→2；截图可见末尾`prompt 301` / `reply 301`，页面继续可操作 | 数据为合成累计输入；没有逐个气泡人工数601条，也不声称所有网络故障通过 |
| 刷新 | snapshot 11→12、live 2→3；objects仍为301，没有重新请求对象；仍显示最新回答 | 与真实IndexedDB缓存命中一致，结合既有workspace-cache自动化测试；不是直接读取浏览器内部DB统计 |
| stopViewer/startViewer | 实际监听器停止/重启，EventSource重连；live变4；随后写入A302，截图显示`prompt 302` / `reply 302` | 是同进程服务生命周期重启，不能当作OS进程崩溃/整机断电通过；stats-worker在停止时有code1退出日志，后续功能观察正常 |
| 同名A→B | 点击Header B，URL切为精确instance；页面仅出现`B3 B prompt 303` / `reply 303` | 覆盖该切换及scope，不代替全部并发和迟到事件场景 |
| 实际磁盘损坏 | 将**fixture B**的timeline精确备份后改成`{broken\n`，刷新B；直接GET snapshot实测HTTP500 / `CXV_LOG_V2_CORRUPT`，聊天区无可渲染记录；恢复精确原字节后，**未再次手动刷新**，自动重试显示B303提示和回答 | 自然HTTP错误触发源已验证；损坏在服务端验证阶段被拒绝，不能说它自然触发了客户端中途gate异常。持久文件未被自动覆盖；仅人工恢复自己的测试副本 |

AX在长虚拟列表上没有完整返回聊天节点，已用实际截图确认301/302，未把AX缺项当成页面崩溃。所有截图已通过CUA实际查看；没有虚构持久截图文件。该fixture最后已通过Ctrl+C停止并释放自己的服务。

## 400 / 200 窗口及对象投影

入口：[b3-window-benchmark.mjs](./probes/b3-window-benchmark.mjs)。600个不同请求，每个只有一个512B用户输入及固定长度回答；复用实际writer、Reader Worker、snapshot/page/object路由、fetchLogV2Snapshot/fetchLogV2Page与LogV2Archive，loopback真实HTTP。它隔离测窗口成本，与上一轮800个**累计前缀**fixture互补，不把两个数据形状的数字直接作性能比。

| 初始窗口 | 最早seq | snapshot | 初始对象投影 | 对象请求/字节 | 历史页 | 最终rows |
| --- | --- | --- | --- | --- | --- | --- |
| 400 | 201 | 138.58ms | 470.06ms | 400 / 463,525B | 2×100 | 600 |
| 200 | 401 | 117.74ms | 212.20ms | 200 / 231,925B | 4×100 | 600 |

每个投影的输入/回答与对应seq核对；第一次page未ack重复请求，pageToken及checkpoint完全相同；逐页ack/prepend后seq1–600严格连续且无重复。原始数据：[B3-window-benchmark-2026-11-20.json](./B3-window-benchmark-2026-11-20.json)。RSS是同一进程的阶段采样，含fixture和reader开销，不是浏览器峰值，也不是严格性能SLO。

实际读取 `readV2WireSnapshot` 确认：窗口虽有界，仍扫描整个timeline，并将所需输入依赖放入checkpoint。上述数字不能把自动分片标成已实现；旧归档的分片接入政策见[待选方案](./B3-sharding-proposal.md)。

## 本轮小笔代码与剩余

`fb20fd5`对齐同一067提交的外围诊断：handleEventMessage、streaming_status、SSE初始化异常改用现有reportSwallowed，保留数据长度而不打印原始消息。无新helper；Web222/222通过。不存在的Claude kv_cache/V3装配入口与无调用方的旧local管线不制造假实现。

本轮浏览器覆盖的是Darwin原生Safari和合成SDK日志。物理慢网/代理、全进程崩溃、Windows/Linux及外部真实模型仍未覆盖；该阶段之后WS mux与历史列表分页已继续迁入并实例化，见[B3第二轮](./B3-transport-and-pagination.md)；自动分片仍未实现，不标整包完成。
