# B3 交接：长会话、存储和实时传输

2026-11-20最终更新：B3已收口，原30笔已合并为[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)并推送GitHub main，远端hash已核对。用户选择的渐进启用已实施；最终验证与未覆盖环境见[B3完成矩阵](./B3-completion-matrix.md)，逐笔映射见[B3分片实施](./B3-sharding.md)，发布结果见[提交合并记录](./local-commit-consolidation-2026-11-20.md)。**下一工作包B4，准备中；本轮没有B4新增实现。** 下文为原B3实施前/过程中的历史交接，“待选择/尚未实施/仍待”等不是当前待办；B4入口见[对齐规划](./cc-viewer-alignment-plan.md)。

2026-11-20：B3继续实施，冷加载/response首轮后已补浏览器恢复与真实窗口、最终WS mux、列表分页和工具增量扫描，见[B3实施](./B3-implementation.md)与[第二轮证据](./B3-transport-and-pagination.md)。分片接入政策待选择，尚未迁移真实日志；本页后续清单保留为原交接索引，最新状态以上述实施页为准。B2保持用户验收收口及原未覆盖边界。

## 固定入口

- 上游快照：`74cd752d99caf122e750216d2af3bb9f467c4de1`，不能自行跟随最新HEAD。
- [源码优先规范](./migration-code-first.md)：每笔先读实际PR diff、后续修复/回退、完整调用链和样式；文档是索引，不是设计授权。
- [B3提交索引](./cc-viewer-alignment-commit-index.md#b3)、[B0交叉候选](./B0-cross-index.md#cross-b3)、[逐提交台账](./cc-viewer-alignment-commit-ledger.md)。混合提交须按子能力判定，不能因B2完成整体勾选。
- [A2路径映射](./A2-path-map.json)：索引旧路径对应当前packages/app、apps/web、apps/electron。

## 首轮工作

1. **首轮已实施三个子项，见B3实施；浏览器/自然故障源仍待。** 原顺序：先读取`0670581b3d`实际diff及固定快照最终实现，追踪本地AppBase冷加载失败恢复链路；使用[B0冷加载复核](./B0-cold-ingest-review.md)和对应探针复现。核对token/epoch、gate、已提交基线索引、normalizer/slimmer、archive与重试清理，复用现有机制。
2. **首轮已迁入同会话response守卫，冷载体语义已细分；产品验收仍待。** 沿`d7f355ba89`审计首轮进行中数据链路的已测与未测子项，不重复移植B2的activeInput/queue快照；必要时增加自然HTTP/事件路径证据，区分方法注入与真实损坏日志。
3. **初始合成基准已建立，继续真实窗口/持续流/浏览器恢复。** 建立脱敏长日志/高频事件基准，再审计log-v2分片、并发落盘/顺序/裁剪、历史迁移/冷热读，以及按workspace范围的SSE/WS重连游标、背压和断线恢复。先测量，复用现有通道，不先引入新的传输架构。
4. 每笔仅处理一个可独立验证的改动，记录上游hash→本地commit和失败/通过证据；UI改动须对照原组件/CSS，不重新设计。

## 验证起点与边界

B2最后代码验证：受控`CXV_BYPASS_PERMISSIONS=0 pnpm test`为1295/1295、0 skip；构建通过；685文件全新生产安装、202Web精确字节、66/66运行时、B1.2及隔离CLI通过。合并提交不改变应用源码/依赖/资产，不将历史整理写成重新执行这些测试。

B3需按实际改动覆盖断开/恢复、刷新、慢客户端、服务重启、归档/删除期间的遗漏/重复/跨项目串流，并记录内存/响应时间。保留原数据，不对真实会话/凭据做无依据迁移。当前真实模型网络、Windows/Linux、最低Node/远端CI、高负载/断电与物理设备验证不作为已通过基线。

B2设备补验事实见[B2 GUI记录](./B2-gui-acceptance.md)，已由用户接受本轮收口；仅存在源码或测试失败的新证据时再修复，不为自动化工具限制自行改造基线交互。
