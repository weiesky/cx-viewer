# B3 完成矩阵（2026-11-20）

B3已完成，30笔已合并为[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)并快进推送GitHub main，远端完整hash已核对；固定上游`74cd752d99caf122e750216d2af3bb9f467c4de1`。用户已授权自主完成并选择旧归档渐进启用；用户已确认B3收口，提交合并与推送已完成；既有未覆盖环境仍保留。B2保持原验收结论，下一工作包为B4；没有将混合提交其他包的子项整体勾选。

| 完成条件 | 本地结果与证据 |
| --- | --- |
| 冷载失败能释放gate并恢复索引/订阅 | `a55eb66`/`5047b36`/`2b765b1`/`fb20fd5`；实际HTTP写失败关闭、自然磁盘损坏500后自动重试、reset后重取与刷新缓存，见[B3实施](./B3-implementation.md)和[浏览器恢复](./B3-browser-recovery.md)。 |
| 分片只在完整prompt边界，历史不丢失 | 默认2000、在途root/child延后、持久计数、旧写者version fence；4进程48条跨3切点、三处故障保留及空片恢复，见[分片实施](./B3-sharding.md)。 |
| 冷聊天只加载活跃片，用户能继续取旧历史 | 精确详情保全、按ack历史分页/对象授权、请求去重/选中保持、gate中live提交后重放、迟到失败不串视图；2001轮基准与Safari桌面/强制移动布局通过。 |
| 传输具备scope、背压与恢复 | 原鉴权下单socket控制/live逻辑流，SSE独立回退；32MB UTF8队列、100ms/4MB pump、双时钟stall、控制帧绕过、关闭释放；真实WS/HTTP与Safari重启/工作区切换见[第二轮](./B3-transport-and-pagination.md)。 |
| 归档操作和既有格式行为可解释 | 完整ZIP、同目录全部分片删除、活跃会话拒删后继续live；布局迁移receipt/backup幂等与隔离，Claude V1补丁按本地格式判不适用；实际孤立输入恢复不虚构回答。 |
| 长会话开销可测且增量扫描有界 | 实际400/200窗口、20页完整seq、输入前缀不冷hydration、旧片索引ack后复用；工具增量双pass、数组替换失效、20001→15000 LRU连同payload释放、git commit结果刷新。 |

## 上游范围与交叉候选处置

主体映射：冷载`0670581b3d`与response子项`d7f355ba89`见首轮；传输`db2ada0866`/`4991ba762d`/`46d33276c9`/`bde0244333`、诊断`45bfa4124d`、分页`6baff0cd6f`/`57798b7ccc`、工具`0cbb545288`/`c29af25e64`及回退/重提血缘见第二轮；分片`b23c137372`/`4391792212`、孤立`e4fc788b9e`、命令刷新`0c7195b689`见分片实施。每笔迁移原先独立实施并验证，现30笔按用户要求合并为7c3d849；原hash/主题映射及可恢复历史继续保留，未把混合上游提交其他子项夹带为完成。

[时间索引17项](./cc-viewer-alignment-commit-index.md#b3)与[交叉索引46项](./B0-cross-index.md#cross-b3)是B0候选集合，不能机械当作B3独占范围。以下分流保留其原包待办，不把它们伪装为已迁移：

| 候选/关联提交 | B3结论及其他包边界 |
| --- | --- |
| `87432d4c5a`、`fa77ecd681` | Claude V1转换/双写提示不存在于本地；canonical receipt/backup的幂等与发现规则已实际验证，详见格式结论。 |
| `42207f7fd1` | 上游Brotli测试tick修复；本轮未引入该wire压缩实现，mux禁用deflate。现有测试不搬不存在的helper；将来B8引入压缩时遵循完成事件而非固定tick。 |
| `25e118170c` | retry watchdog包装Response修复；本地proxy直传fetch响应，无该包装器，后续retry/idle语义归B8，不能称其功能已迁入。 |
| `20e4a63b24`、`6bcf5e5ab3`、`bb8095c7fb` | 安装发现/桌面staging/签名与发布，B11工程范围；本轮新生产安装与CLI回归只证明当前产物可运行。 |
| `d858204313`、`ba3eee8fd5` | 无upstream分支提交显示/远程文件下载，归B5；B3仅完成工具刷新信号`0c7195b689`。 |
| `6e3c93cd7c` | 引导npm升级/重启是B10升级器，未在B3执行真实全局升级。 |
| `0cfc040c0a` | 上游UserPromptSubmit SSE测试资源清理；本轮真实连接测试均显式terminate/stopViewer/释放watcher，Claude hook专用测试不照搬。 |
| `b01ff6f502`、`919fded845`、`2ea5181df8`、`a3cc12619f` | 慢上游提示/任务状态与测试时序以B4为主；B2已迁移动端终端部分，B3只覆盖连接背压/重试，不等于这些SDK状态子项完成。 |
| `f3a8413db9`、`d6cab4869a`、`bc669f59cc`、`84e65cddc6`、`77b61bd571`、`7641f5181a`、`bd32d02884` | B2身份/续发、B3冷载订阅间隙及cursor重放已有本地证据；任务HUD、Claude lost-result配对、SDK activity/approval/看门狗及跨轮迟到结果继续按B4/B11核对。 |
| `69b104cbf3`、`6680d041d4`、`7a2dd6162e`、`1c5fadafbf`、`d89aa3b9af`、`ebfcbaec0d`、`efc7f8eab1` | 模型/工具目录、请求JSON展开、任务HUD/thinking/Last Response/输入浮层属于B4/B7/B9；B3只处理其中实际冷载/工具数据路径。 |
| `eb2e9703a2`、`649f853e5e`、`ec14cd0234` | B2已验收布局/共享恢复/终端心跳保留；上下文详情与请求期限等其他子项在B7/B8。 |
| `5c28d4c50a`、`a30d8c92a7`与其merge；`e6baf89e6a`、`0a9ad5d767` | scope由B2定义、B3真实mux路由复用并验证；合并不重复计数，不另cherry-pick。 |
| `08809f6e69`、`082673509e` | 原工具增量提案被回退，后由`0cbb545288`独立重提并保留到基线；B3按最终源码迁入。 |
| `c29af25e64`、`4391792212`、`dd8709356b`、`aaa3a59444` | 工具LRU/分片子项已完成；文件树路径、审批、URL base安全及其他changelog子项仍归B5/B10/B11。本地原URL边界未弱化，不整体标混合提交完成。 |
| `20ccfb7304` | content抽包由原工程方案另行决定；本轮继续单一npm包与既定workspace，不夹带新抽包。 |

## 最终检查和未验证边界

最终代码含`e8ed8a7`：`CXV_BYPASS_PERMISSIONS=0 pnpm test`为**1410/1410（5+257+942+206）、0 skip**；`pnpm run build`通过。全量与构建串行执行，避免测试临时dist夹具被构建移除。第一次未覆盖当前终端继承的权限变量时审批断言失败，按项目既定变量0重跑全量通过；没有更改审批逻辑来掩盖环境差异。

[最终生产安装原始结果](./B3-shard-install-2026-11-20.json)：真实tarball **689文件**、**202个Web资产与关键源码精确字节**、全新生产安装 **144/144运行时**、B1.2合成回归及隔离相对--cd CLI启动通过。安装目录`cxv-b3-runtime-n21r35pp`，fake Codex，未访问外部模型。可复跑[安装探针](./probes/b3-installed-check.py)；日志`/tmp/cxv-b3-complete-final-{tests,build,installed}.log`。

浏览器证据在最后两个小修之前已观察；两个小修的实际组件/控制器回归另行通过，不声称重新操作了全部GUI流程。新600条窗口探针两组通过；2001条原始基准在追加GUI实时验证消息前采集，见[B3分片基准](./B3-shard-benchmark-2026-11-20.json)。

未验证事项保持原事实：Windows/Linux、最低Node/远端CI、真实模型/外部代理网络、物理窄屏/单多指惯性、断电/SIGKILL及长期高负载。复跑要求：在目标OS/Node运行同一全量/构建/新安装探针；实际慢网可通过限速代理打开2001轮夹具并触发cut/reset/历史分页，预期无遗漏/重复/跨scope且恢复后可继续发送；物理断电需独立一次性数据副本与恢复检查，不能在真实日志上直接试验。当前环境使用Darwin arm64/Node v24.14.0和合成临时归档，以上环境能力不能由本地测试推断。

原30笔B3提交已合并为[7c3d849](https://github.com/weiesky/cx-viewer/commit/7c3d849b9e7acda1c974077843406c23627dbdcb)并推送main；原历史/映射、推送回执与验证口径见[提交合并记录](./local-commit-consolidation-2026-11-20.md)。未切换全局活动实例、未执行真实用户数据迁移。
