# B3 渐进分片实施与证据（2026-11-20）

用户已选择“渐进启用”并授权自主完成B3；没有批量转换、删除或重写真实用户归档。固定上游为`74cd752d99caf122e750216d2af3bb9f467c4de1`，以`b23c137372d979186c024de6a1c6eca873cc3306`和后续`439179221296fcc2ca1beb0ffce69c13a336b56f`的实际diff、最终writer/manager/reader、路由、AppBase/ChatView及CSS为依据。

## 独立提交与必要适配

| 本地提交 | 上游对应与实施内容 |
| --- | --- |
| `812277c` | b23c137372/4391792212：同目录分片发布，先持久化不可变baseline、空timeline和prepare信息，再原子发布manifest；未发布目录保留，不覆盖已有数据。 |
| `ce8c884` | 分片reader/writer重开、worker历史分页、完整物化/检查/汇总/ZIP；watch manifest与活跃timeline，发布后发reset。 |
| `aee399e` | 默认2000个主会话用户prompt，下一新prompt且root/child无在途请求时切点；重开从持久promptCount继续计数。 |
| `48afcd7` | 实际HTTP/WS路由：切点reset、重新snapshot、旧页重试/ack/对象授权、完整ZIP、归档整目录删除、活跃会话保护与继续live。 |
| `2639cd8` | 冷聊天只投影已加载分片的输入，精确请求详情仍保留完整输入；主动加载旧片后重投影已知行，恢复一条无重复transcript。 |
| `57bddc8` | 原历史按钮、18语言文案、桌面/移动props与窗口锚定；异步prepend沿用cold gate及epoch/controller归属，提交后重放live并ack。 |
| `9cd3024` | 旧片索引在Reader Worker生成，ack后复用；内部文件定位不出现在wire响应中。 |
| `c9a3991` | 首次分片才把session manifest升至version3；未分片仍version2，project manifest仍version2。旧严格version2写者拒绝分片归档，避免向冻结root追加。 |
| `94f81bf` | 4个真实进程、48条root/child记录，禁用分片与阈值3两组；分片组跨3个切点，严格连续seq、无重复/丢失、4个线程。 |
| `32f6d94` | e4fc788b9e的本地格式等效：真实writer预提交故障后重开，孤立进行中输入仍可渲染，未提交输入不可见，不伪造完成状态/回答。 |
| `d382bc7` | 新分片已发布但还没有首条请求时，空快照仍复制hasMore/shards并显示历史入口。 |
| `563a51d` | 0c7195b689：在原命令规则中加入git commit；成功工具结果刷新文件/Git面板，失败及重复结果不刷新，git status仍不触发。 |
| `e8ed8a7` | 4391792212的prepend附件守卫：只有原尾部仍在才保留附件，同时到达的新消息不能绕过清理。Codex累计session的首消息会因历史展开改变，故复用canonical身份、活动时间和V2 seq缓存值；覆盖同对象原地更新。 |

本地存储是CAS对象、线程输入修订与事务timeline，上游是journal/response/conversation-store。直接rename上游文件会破坏既有对象路径与修订偏移，因此原root `timeline.jsonl`保持精确字节，成为冻结part0；新增活跃timeline位于同一session的`parts/N/`。CAS对象与线程修订继续共享原路径，不复制旧raw输入。`manifest.shards.cuts`是唯一发布指针，baseline保存经hash/长度验证的恢复状态、输入节点与线程字节边界；seq与session身份连续。恢复不重新回放冻结timeline，也不把缺失/截断/符号链接的活跃分片当空日志自动重建。

三处故障注入分别在创建目录、落盘baseline、发布manifest之后：未发布准备目录保留为`.unpublished-N-UUID`，已发布空片按新指针恢复；完整历史仍只有一个权威版本。线程孤立suffix按已提交字节边界修复。此为同步事务故障模拟，不能称为实机断电或进程SIGKILL验证。

## 冷窗口和完整历史实测

原始结果：[2001轮分片基准](./B3-shard-benchmark-2026-11-20.json)。通过实际生产阈值生成2001个累积prompt/answer，未传阈值覆盖；durable写者在第2001个prompt前自动切片。实际loopback snapshot/page/object路由、Reader Worker及前端LogV2Archive投影，没有浏览器IndexedDB缓存。

| 窗口上限 | 实际窗口 | snapshot | 当前聊天投影 | 对象读取 | 历史分页 | 最终记录 |
| --- | --- | --- | --- | --- | --- | --- |
| 400 | 1 | 68.30ms | 20.70ms | 1次/1349B | 20次/997.15ms | 2001 |
| 200 | 1 | 53.14ms | 13.54ms | 1次/1349B | 20次/954.64ms | 2001 |

两组都验证了未ack重试返回相同pageToken/checkpoint及最终seq1–2001完整。RSS分别185,712,640/248,807,424B，是同一Node进程两轮结束时采样，不能当浏览器峰值或独立比较。控制面均546,723B：baseline仍携带历史输入节点引用，**没有宣称全部元数据或磁盘容量与历史长度无关**。主动打开精确请求详情及加载旧片允许读取旧对象。历史分页计时只含descriptor/checkpoint与ack，不含全部历史聊天投影；本机合成数据不设通用SLO。

复跑：启动[浏览器夹具](./probes/b3-browser-recovery.mjs)，向A依次write六次count300、一次count201，等待seq2001，然后执行：

```sh
node cc-viewer-alignment/probes/b3-window-benchmark.mjs <fixture-log-root> <A的canonical相对file> 2001
```

既有fixture模式只读且不清理传入目录。无参数仍生成原600条固定512B窗口基准，已在最终代码重跑，400/200窗口及600条分页完整通过。不能把该固定输入组与累积2001组数值直接作提升倍数比较。

## 原生Safari实例化

临时夹具`cxv-b2-workspace-gui-5wIrSW`，A/B是不同cwd的同名工作区；合成会话A共2001轮，默认阈值自动切点。最终构建在原生Safari新标签首次显示`reply 2000 / prompt 2001 / reply 2001`及“加载更早历史”，未展开旧prompt前缀；显式点击后看到1997–2001等旧记录，末尾2001没有可见重复、输入栏正常。刷新又恢复当前片窗口与历史按钮；A2002经live即时出现。

`mobile=1`强制移动布局显示相同按钮，点击后历史展开、另有原窗口“加载更早的消息（隐藏3662条）”；最新2002保留。stopViewer/startViewer后追加A2003，移动布局及时出现prompt/reply2003，截图检查聊天与输入区无空白/遮挡。该移动验证使用桌面Safari强制布局，不能替代窄屏设备、触摸或软键盘；重启为同进程监听器重建。前一轮真实scope切B、分页51→50+1与磁盘损坏恢复证据仍见[B3第二轮](./B3-transport-and-pagination.md)、[浏览器恢复](./B3-browser-recovery.md)。截图仅当时查看，未持久保存。

旧Safari标签会重连同一端口，服务器累计计数包含旧scope；本轮未用该累计数推断新标签socket/对象数量。冷对象字节来自上面的隔离Node基准。夹具已停止，没有调用真实模型网络或改用户日志。

## 迁移与孤立恢复的格式结论

`87432d4c5a`、`fa77ecd681`针对Claude V1双写转换器：完成后不再提示、proxy统计不参与V1 sniff。本地没有该转换器/启动提示，`migrate-log-v2-layout.mjs`只发现manifest/hash校验通过的canonical目录，以receipt/backup发布，完成receipt直接返回complete；未知JSONL不被猜成会话。现有layout-migration测试覆盖零写dry-run、完成幂等、备份字节保留、活动锁、坏归档/冲突拒绝和缺manifest隔离，最终全量中实际执行通过。因此两条Claude专属补丁不照搬，也不新增未经授权的V1自动转换入口。

`e4fc788b9e`上游为缺done请求补conversation slice。本地已提交的进行中entry保留其完整输入修订，未提交对象不进入timeline；`32f6d94`通过实际writer→snapshot→对象授权→projectConversation→normalizer/sessionMerge证明后续prompt2仍在、无uncommitted/虚构answer2。没有将inProgress强制改completed，避免改变Codex活动状态。

最终全量/生产安装及剩余环境边界统一见[B3完成矩阵](./B3-completion-matrix.md)。
