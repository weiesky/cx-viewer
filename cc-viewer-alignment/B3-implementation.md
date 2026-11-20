# B3 实施：长会话、存储和实时传输

2026-11-20最终更新：B3本地迁移已完成，用户选择渐进启用已实施；最终状态、验证与环境边界见[B3完成矩阵](./B3-completion-matrix.md)，分片逐笔映射见[B3分片实施](./B3-sharding.md)。下文为先前轮次的历史证据，其中“待选择/尚未实施/仍待”等不是当前待办。

固定上游快照 `74cd752d99caf122e750216d2af3bb9f467c4de1`。B2保持用户验收完成；B3正在实施，不能以本页部分子项完成代表整包完成。

## B3.1 冷加载失败恢复

- 上游：`0670581b3dd0bcecebc1a88d8a032f295b6ada66`；已读完整diff、gate/seen测试、log-watcher，并复核固定快照 AppBase `_failColdIngest` / `_repairIndexAfterFailedIngest` / 两个管线入口及后续channel/VM改造。上游失败守卫与修复仍有效；本笔不迁入Claude V3/channel协议。
- 本地：`a55eb66`。AppBase活跃及历史真实入口均走 `_runSseColdIngest`；以token/卸载状态守卫失败释放，复用 `_abortColdIngest({drain:true})`，按已提交requests修复索引，恢复原Codex normalizer、session及slimmer引用。null处理/索引重建保留原位置并跳过空行。
- 必要适配：上游入口吞异常；本地V2调用方等待Promise判断bootstrap成功，故清理后继续抛错，让既有1000ms重试生效，且提交未成功不能置bootstrapReady。失败snapshot关闭旧订阅、清archive/游标/预启动buffer，后续完整快照重放；历史失败清archive并允许显式重开，旧epoch/文件的迟到失败不得清除新状态。Codex normalizer不能从已剪枝requests重建，保留其已提交引用；未复制Claude `_v2ColdSeed`。
- 没有布局、组件结构或CSS变化。未触及无调用方的旧 `_runLocalLogIngest`；不把修复该定义当作历史入口验收。

验证（2026-11-19，Darwin arm64 / Node v24.14.0）：

```sh
CXV_BYPASS_PERMISSIONS=0 pnpm --filter @cxv/web test
CXV_BYPASS_PERMISSIONS=0 node cc-viewer-alignment/probes/b0-cold-ingest.mjs
CXV_BYPASS_PERMISSIONS=0 pnpm run build
```

Web **216/216、0 skip**，构建通过。新增7项执行实际打包AppBase方法：失败索引/正常live去重/顺序、失败后重试、处理器引用、旧管线迟到、卸载、延迟setState提交、修复再次异常和空行边界。复用现有React打包测试宿主，setState/rAF受控，不是浏览器挂载验收。

B0探针先修正A2后的旧路径，并在改产品代码前重现两个gate=true/索引丢失；修复后loopback真实writer/snapshot/object/live路由及原方法探针通过：两个gate=false、原索引恢复、旧live关闭、活跃重试和历史重开恢复、旧历史失败不动新archive/loading。故障仍为方法注入，实际浏览器EventSource/IndexedDB和自然损坏源尚未验证。null仅验证处理/索引方法防护；原slimmer仍拒绝含null的非法整批，现已能正确释放失败闸门，不声称可经合法HTTP得到此数据。

## B3.2 live 游标在成功入队后确认

上游仍为`0670581b3dd0bcecebc1a88d8a032f295b6ada66`的build成功后才标seen子项。本地`5047b36`：V2没有上游seen Set，实际 `_queueV2Commit → archive.applyCommit / projectConversation → handleEntryObject` 才是相应链路。此前enqueue抛错被handleEntryObject吞掉，游标仍确认，重发会跳过该帧；已先用B0探针复现。现在handleEntryObject返回成功/失败，失败进入既有reset；reset复用 `_teardownTransientLiveState` 清rAF/旧pending/gate，不把旧队列带入重取的快照。正常gate缓冲仍算成功接收，同seq只入队一次。

Web **218/218**，新增2项实际AppBase测试，失败后重放成功与正常去重通过；B0 live-failure客户端探针通过。该确认点是成功入队，不是每个异步渲染完成点；后续flush阶段的异常、浏览器断线与跨工作区重放仍需独立覆盖。

## B3.3 SSE 写失败关闭及资源回收

上游同提交 `_safeSseWrite` 原始diff及最终log-watcher：写失败必须关闭连接才能触发客户端重连。本地`2b765b1`，实际是 `serveLogV2Live → send/sendChain → res.write/waitForDrain`，不是上游clients数组。

此前B0探针持续write抛错：v2_reset再次写失败，连接未end、unhandledRejection、subscriber=1；已在当前结构重新复现。现在send链捕获报告并关闭；共用finish/close停止watcher、heartbeat、activeCheck并释放handle计数；end抛错则destroy；response异步error同样清理。初始化异常也走同一回收边界。保留原片段串行、drain与15s超时，不另建传输层。

新增4项：write持续失败、write+end失败、异步error、真实loopback HTTP写失败关闭；前三项随后从原游标重连，收到两条完整suffix且无subscriber残留。object-api/transport **29/29**；当时整仓 **1308/1308、0 skip**，构建通过。B0 live-failure探针现验证失败连接只尝试一次write，已end、无unhandledRejection、subscriber=0。真实HTTP属于当前环境实例化；真实浏览器重连/反向代理/其他平台未验证。

## B3.4 同会话进行中帧保留已有response

上游`d7f355ba895e24bb5e46c820a7d3105a76018ea3`，已读完整14文件diff（assembler、session-select、events/workspaces、interceptor与测试），核对固定快照sessionMerge及后续`d89aa3b9`/`1aca9b5f`的thinking/queue演进。本地`4a21cec`：迁移 `newResponse !== undefined` 守卫，覆盖一般累计输入及Codex特有的可信投影窗口、等长末位替换三条同会话路径。新身份与权威compaction替换保留原语义，明确null依然清空，不将上个身份的response带过来。

本地真实消费者核对到ChatView `_extractSuggestion`、toolFileChangeController的session.response读取，以及AppBase/sessionManager调用链；既有live in-place helper已防缺失response并fallback，继续复用。无新布局、DOM或CSS变更。先新增用例确认三条路径都失败，修改后response/normalizer/parity/identity **56/56**、Web **222/222**。

首轮进行中选择/投影已由原B0 loopback探针和B2的activeInput/queue实现提供证据，本笔不重复搬运。需细分上游承诺：上游自身session-boundary-parity测试对「先slim旧载体、只由在飞载体重建新session」明确断言response为undefined；本地冷快照也仍如此，回答已在transcript。本笔保证已有同会话response不被在飞merge清空，不声称任何冷加载都重新填回旧response；不能仅见该字段undefined就判聊天气泡丢失。

## 长日志与高频事件初始基准

直接复用现有 `packages/app/lib/log-v2/benchmark.js`，没有重写writer或添加依赖。原始数值：[B3-benchmark-2026-11-19.json](./B3-benchmark-2026-11-19.json)。合成固定文本、临时目录，buffered durability；不是断电或fsync保证，不含真实会话/凭据。

| 累计事件×每条新增文本 | V2落盘 | 全量展开字节 | append p95 | 重开恢复 | 全量物化 | 无界快照 | 进程峰值RSS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 200×512B | 911,014B | 11,429,190B | 6.77ms | 28.15ms | 1.37s | 29.38ms | 154,058,752B |
| 800×512B | 3,643,596B | 181,437,090B | 10.14ms | 104.92ms | 20.25s | 102.20ms | 505,364,480B |

测量命令为 `/usr/bin/time -l node packages/app/lib/log-v2/benchmark.js 200 512 buffered`（另一组800），峰值RSS包括生成、writer、物化、JSON统计整个进程。该工具readV2WireSnapshot默认limit=0，**不是实际AppBase的400/200窗口延迟**。全量物化生成每次请求的完整累计前缀，工作量随事件数二次增长；实际V2 snapshot/object投影、分页及worker路径不能据此一概判断卡顿。后续要沿真实调用方分别测量再决定优化。

已有纯协议checkpoint测量：1000/2000/4000提交、窗口400，分别402,777 / 590,570 / 960,570B，inputNodes=提交数、entryRevisionStates=0。说明本fixture下控制面增长，不代表真实大对象或高负载SLO。

新增可复跑 [b3-live-benchmark.mjs](./probes/b3-live-benchmark.mjs)，执行真实writer/publisher/SSE路由，两个response宿主分别立即write和每次3ms drain。200条同步突发：两个客户端各收到200条、严格seq2–201、无重复/reset，全部送达约2.32s/3.00s（含约2.26s同步写入），采样RSS93,323,264B；关闭后subscriber=0。300条单批突发超过既有256队列上限：快慢客户端都收到reset、未送commit，最终快照seq301完整，subscriber=0；**仅证明有界拒绝和可取快照，不代表浏览器已自动恢复**。采样RSS111,837,184B。此为响应宿主模拟背压，非真实慢网速/物理网络。初轮存在其他本地验证负载，数值仅作复跑起点，不设硬性能门禁。

## 首轮最终验证与当时剩余

`CXV_BYPASS_PERMISSIONS=0 pnpm test`：**1312/1312（5+222+881+204）、0 skip**；构建通过；npm预览 **685文件**通过。两份B0故障探针在最终代码重跑通过；高频基准完整运行并清理临时资源。此次只有产物预览，没有重做全新安装/66项运行时或B1真实迁移，不能沿用B2旧结果称已重测。

B3仍在实施，两个上游提交不标整条完成。下一步：自然损坏日志到HTTP/浏览器的链路，reset后的浏览器/IndexedDB恢复，长日志真实400/200窗口与对象投影指标，持续流而非单批突发的慢客户端/队列溢出恢复，服务重启/归档删除/跨工作区隔离；再按索引读取分片、历史迁移和WS mux相关diff及后续修复/回退。`0670581b3d`其他外围SSE catch上报仍需对照，未使用的旧管线不充当覆盖证据。Windows/Linux、外部真实模型、真实网络与物理设备未验证。

## 2026-11-20 第二轮更新

首轮之后新增8笔：`fb20fd5`外围诊断、`1994819`浏览器/窗口证据、`16e2406`前端mux、`2e4ecbd`共享诊断包装、`4a7a8e7`服务端最终pump、`c31b20b`真实鉴权路由接入、`363d061`列表分页、`4883004`分页宿主/CSS；另`f20f7b2`迁入重新独立提交的工具增量扫描及LRU清理。上游逐项映射、必要适配与浏览器证据见[B3第二轮](./B3-transport-and-pagination.md)。

最终源码1394/1394（5+252+933+204）、0 skip；构建通过。自然磁盘损坏已在实际HTTP500拒绝后自动重试恢复，不能等同自然客户端gate中途异常；真实SSE突发reset与刷新缓存、400/200有界窗口已补。最新mux也在Safari验证了增量、服务重启和同名scope切换。桌面分页51→50+1、项目切换、单页无pager、重开回活动项目已观察。

B3仍未完成：自动物理分片等待用户选择[旧归档接入政策](./B3-sharding-proposal.md)，不把当前有界分页当作分片。历史迁移/孤立恢复的格式等效、归档删除期间live恢复、真实慢网/代理、完整进程crash、移动分页及其他平台仍保留待核对/未验证。未推送本轮小笔提交，未改真实日志。

最终产物（含`f20f7b2`）：[B3-install-2026-11-20.json](./B3-install-2026-11-20.json)，临时安装`cxv-b3-runtime-ox1ixgtt`；688文件实际tarball、202个Web资产及关键源码精确字节、134/134运行时、B1.2合成回归、相对--cd隔离CLI启动均通过。可复跑[生产安装探针](./probes/b3-installed-check.py)，fake Codex，无外部模型网络。日志`/tmp/cxv-b3-tool-{final-test,build,installed}.log`。
