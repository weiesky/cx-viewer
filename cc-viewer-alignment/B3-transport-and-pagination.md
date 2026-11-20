# B3 第二轮：传输、分页与增量扫描（2026-11-20）

2026-11-20最终更新：B3本地迁移已完成，用户选择渐进启用已实施；最终状态、验证与环境边界见[B3完成矩阵](./B3-completion-matrix.md)，分片逐笔映射见[B3分片实施](./B3-sharding.md)。下文为先前轮次的历史证据，其中“待选择/尚未实施/仍待”等不是当前待办。

固定快照仍为`74cd752d99caf122e750216d2af3bb9f467c4de1`。B3实施中，不能以本轮子项代替整个工作包完成。前半轮的自然损坏、reset恢复、IndexedDB与400/200窗口实测见[B3浏览器恢复](./B3-browser-recovery.md)。

## 小笔映射与源码依据

| 上游 | 本地提交 | 已迁入内容与必要适配 |
| --- | --- | --- |
| `0670581b3d` | `fb20fd5` | 外围SSE解析/初始化异常复用reportSwallowed；不打印原始消息。原失败恢复三笔继续有效。 |
| `db2ada0866`、`4991ba762d`、`46d33276c9`、`bde0244333`最终组合 | `16e2406` | 前端最终mux状态机、能力降级、逐流SSE回退、重试/看门狗、诊断开关；品牌键改cxv；open帧仅为本地V2 live增加可选path，控制流保持原/events。25/25纯客户端测试。 |
| `45bfa4124d` | `2e4ecbd` | 既有Web报告器移至packages/app共享源码，Web原路径重导出；服务器包装器按CXV_DEBUG门控、每tag上限5。没有另写同义报告器。 |
| 同一mux提交链，最终pump以`bde0244333`为准 | `4a7a8e7` | 最终服务端mux、32MB真实字节队列、100ms pump、每tick4MB、进度/绝对时钟stall关闭、control bypass、credit/drain、deflate:false。48/48服务器/背压测试，含真实WS握手。 |
| `db2ada0866`与工作区作用域链`5c28d4c50a`/`a30d8c92a7` | `c31b20b` | AppBase控制/live共用transport；snapshot/page/object保留HTTP；新upgrade沿用原Origin/token认证，逻辑流进入真实HTTP鉴权与SDK scope handler，不另造访问规则。 |
| `6baff0cd6f` | `363d061` | 本地canonical V2列表分页；只枚举候选身份并汇总当页，直接复用summary.json，保留无page参数的grouped响应；active/viewed项目分离。17/17物化器和3/3真实路由检查。 |
| `6baff0cd6f`、`57798b7ccc` | `4883004` | 50行/页、setState回调内重取项目、单页无pager、上游固定内容高度/移动滚动/4px分页间距/i18n。Codex补充request-id拒绝迟到响应；保留既有ZIP解析和已验收选择器，不引入Claude V1转换入口。Web248/248。 |
| `0cbb545288`、`c29af25e64` | `f20f7b2` | 两阶段增量扫描、尾行重扫、持久tool索引、已处理id的LRU同步释放payload、ChatView真切换重置游标。Codex请求用body.input，且同对象的数组引用变化要重扫，覆盖compaction/投影的等长替换。Web252/252。 |

实施前已读上述实际diff、固定快照的完整相关controller/transport、AppBase入口、HTTP鉴权/作用域处理、LogTable、桌面/移动宿主和相应CSS。`08809f6e69`是混合提交，`082673509e`回退后，`0cbb5452887476d3838c772e9fcd04cf3d01ce63`于同日重新独立提交了工具增量扫描；不能看到revert便略过固定基线实际保留的代码。`c29af25e64`的文件树/approval等其他子项不因本笔缓存清理整体完成。

## 真实连接与浏览器实例化

`ws-mux-routes.test.js`使用两个不同cwd的同名SDK工作区和真实WebSocket、SSE、HTTP路由：两个control scope与A的V2 live共用socket；从snapshot游标重放snapshot/subscribe间的新提交；同一progress的SSE与mux载荷逐字节相同。错误scope/其他API path被拒绝，错误的B scope+A object handle不留订阅；关闭一流不影响兄弟流，最终watcher=0。浏览器Origin与原生客户端token边界均验证。没有修改既有terminal/scratch传输算法。

原生Safari夹具`cxv-b2-workspace-gui-SaiQSb`：A1初载后，A2/A3即时可见；服务端观测到2条`v2_commit` mux帧；stopViewer/startViewer后A5继续可见，v2_commit变4；点击精确B实例仅见B4，追加B6即时可见，v2_commit变5。HTTP live计数始终1，没有随本次增量增加。计数包含先前夹具的旧标签：其过期scope产生2条4503错误和SSE回退，故不能把总upgrade数5说成本页用了5条socket，也不能把旧SSE计数当作当前页回退。本页实际增量有mux帧证据，单socket双流由真实路由测试另证。重启为同进程监听器重建，不是进程断电试验。

分页夹具[b3-log-picker-gui.mjs](./probes/b3-log-picker-gui.mjs)，临时root`cxv-b2-workspace-gui-ht2kba`：A项目51会话、B项目1会话。Safari从菜单打开日志管理，第一屏50行/共51条；点第2页仅余`b3-picker-0-00`；查看B项目立即只显示`b3-picker-1-00`，无分页条；关闭后重开回到A第一页`b3-picker-0-50`。截图检查固定内容高度和分页间距，未持久保存截图；未将第二页空白区域自行改成不同布局。该桌面流程没有证明移动分页GUI通过，移动仅有共享逻辑/props与CSS构建覆盖。两夹具均已停止，未操作真实日志。

## 性能与验证边界

工具扫描回归实际构造1000行前缀：首次两遍读取2000次role，稳定前缀下尾部追加结果/新增工具后前缀读取0；reset后恢复重扫且不重复刷新。Codex同对象的等长/缩短数组替换、新request输入、跨源tool索引均覆盖。20001条已完成工具记录在下一次扫描按基线上限保留15000条，同时释放对应旧payload。数组替换会完整重扫，不能声称所有Codex更新都是O(增量)，未设置硬延迟SLO。

最终源码`CXV_BYPASS_PERMISSIONS=0 pnpm test`：1394/1394（5+252+933+204）、0 skip；构建通过。最终生产安装与实际tarball结果见下文。早先1390/1390、688文件/202Web精确字节、134/134运行时、B1.2合成回归及隔离相对--cd启动只覆盖`4883004`，不代替后加工具扫描的最终产物检查。

## 剩余与迁移边界

1. 自动物理分片及其cursor/对象授权/归档续发尚未实现；窗口分页仍从seq1扫描，不能代替分片。上游2000-prompt、静止切点、parts/N布局与后续修复已读，旧归档接入政策等待选择，见[具体方案](./B3-sharding-proposal.md)。没有修改或转换真实用户日志。
2. `87432d4c5a`的done判定和`fa77ecd681`的proxy统计排除针对Claude V1→journal转换器。本地`migrate-log-v2-layout.mjs`只发现v2/projects下经过hash/manifest校验的canonical归档，使用receipt/backup发布，没有同名V1 sniffing或启动迁移prompt。不能直接把done规则贴到本地收据上，也不能把不存在的Claude入口宣称已迁入；历史迁移的完整等效结论仍待与分片政策一起核对。
3. `e4fc788b9e`修的是req-without-done缺少conversation slice后使Claude delta链断裂。本地timeline是事务提交点，输入和entry修订先落盘；现有writer测试覆盖三处pre-commit孤立数据、post-commit故障和重开序号，materializer覆盖完整输入修订及坏引用。两种格式故障模型不同；本轮没有把在飞记录强制改completed/null，整条孤立恢复/降级UI不标完成。
4. 混合提交按B3子能力继续核对，B4审批/Agent状态、B7其他UI等保持原包归属，不因本轮mux/分页勾整条。归档/删除期间live切换、真实限速代理/物理慢网、完整进程crash、移动分页、Windows/Linux/最低Node及外部真实模型仍未覆盖。

最终产物（含`f20f7b2`）：[B3-install-2026-11-20.json](./B3-install-2026-11-20.json)，临时安装`cxv-b3-runtime-ox1ixgtt`；688文件实际tarball、202个Web资产及关键源码精确字节、134/134运行时、B1.2合成回归、相对--cd隔离CLI启动均通过。可复跑[生产安装探针](./probes/b3-installed-check.py)，fake Codex，无外部模型网络。日志`/tmp/cxv-b3-tool-{final-test,build,installed}.log`。
