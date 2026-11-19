# B2 收口与验收记录

**以固定基线PR实际组件、CSS和交互为准，不能按文档自行设计。** 已确认的卡片/排序按钮/额外Header行偏离已逐笔纠正；来源、必要适配与映射见[迁移规范](./migration-code-first.md)。固定快照74cd752d99caf122e750216d2af3bb9f467c4de1，运行性与视觉结论分别记录。

**2026-11-19 用户明确验收B2并要求收口、压缩本地提交和推送main。B2已完成，当前转入B3准备。** 下表未覆盖项保留原事实，不改写为通过；用户接受在这些边界下收口。混合提交的B2子项不代表其他包整体完成。

| 完成条件 | 实现与证据 | 剩余边界 |
| --- | --- | --- |
| cwd/instance/thread/turn身份 | 常驻registry、稳定instanceKey、同名HTTP/WS/SSE/文件/日志/恢复隔离；真实Codex配本地Responses、双浏览器cwd发送/原thread续接通过 | 外部真实模型/子任务事件未验收，不伪造Claude专用状态 |
| registry/PTY/scratch生命周期 | POSIX自有进程5秒取消监管，真实node-pty及按实例回收；scratch双shell隔离/关闭刷新；3cbd71e桌面/移动远程关闭回退通过 | Windows强制回收未实现，其他平台未验证 |
| SDK状态/队列/恢复 | 权威ID/回执/拒绝/移除、Stop暂停/立即追加；最终队列条GUI；共享历史确认恢复/提示仅一次/原thread续发通过 | 完整手动retry/审批producer等按B4核验 |
| Header切换/排序/同名消歧 | 77d4ad5及后续恢复胶囊/Popconfirm/共享弹窗/菜单；History API A→B→返回A；键盘排序、单项目形态/关闭GUI通过 | 最终dnd-kit指针只观察到拖起，无跨项落点证据，不沿用旧自造拖动GUI |
| 移动scratch/触控/测量 | 最终320/400px、44px横向rail/sticky加号，实际65×60→32×60、双shell/关闭刷新通过；组件测量/触控清理通过 | iOS18.6模拟器软键盘/网页Enter/Up与20×60→37×60已通过；物理手机/多指惯性仍待，设备/方式未获答复 |
| 连接隔离/并发/交付 | 代次/revision/握手scope/缓存，迟到回调与WS活性；1295/1295、0 skip、构建；685文件新安装/202Web字节、66/66、B1.2/隔离CLI通过 | 真实睡眠唤醒/网络切换、最低Node/远端CI、Windows/Linux、外部真实模型/凭据迁移未验 |

## 当前检查点

逐笔实施至3cbd71e，queueHint品牌适配765aafd。最新安装cxv-b2-runtime-4qwtjnw0；日志/tmp/cxv-b2-close-event-{web,server,full,build,installed}.log。真实GUI发现的停止事件顺序问题已修复并在桌面/移动跨浏览器重跑，不能用先前组件轮询测试掩盖该问题。

剩余步骤、失败表现、预期与环境见[B2 GUI验收](./B2-gui-acceptance.md)。独立IAB host不可用；原生Chrome/Safari与iOS18.6模拟器已用于验收，物理手机/多指仍未覆盖。未为自动化工具另造与基线不同的指针交互。本轮按用户要求合并为main单笔聚合提交，原63笔映射及验证方法见[压缩记录](./local-commit-consolidation-2026-11-19.md)。

## 原生协议补证

`/tmp/cxv-b2-native-protocol.mjs`使用真实Codex0.169.0，临时HOME/CODEX_HOME与空凭据，经本地appserver bridge执行initialize、thread/start(ephemeral)、缺失thread/resume拒绝；模型turn数0。最终证据`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-native-protocol-WH5JXD/result.json`，日志`/tmp/cxv-b2-native-protocol-final.log`。首次CODEX_HOME目录未创建导致15秒ready超时，debug日志确认是fixture准备问题；补建后通过，原失败记录保留。每轮finally关闭自有WS/bridge，不操作活动实例。此结果不等于真实SDK模型、审批或GUI通过。

真实SDK补证：`b03a24f`及[原生SDK探针](./probes/b2-native-sdk.mjs)通过真实Codex0.169.0、官方SDK0.142.5的同名隔离、503恢复、队列/原生thread续接和普通取消；6个请求均由本地模拟Responses提供。最终记录`/private/var/folders/zp/vk_f0h8548b7tsnvgl258fdc0000gn/T/cxv-b2-native-sdk-sN9R6A/result.json`。真实模型、审批和GUI仍未验收。

## 候选索引审计口径

机械B/C初筛70条与B0人工交叉38条去重共80条。下列索引保留全部候选，逐条最终结论仍以[提交台账](./cc-viewer-alignment-commit-ledger.md)及该条所属工作包为准；当前工作包的验收以本页六条完成条件为准，B4/B8/B11的独立能力不因出现在机械索引就自动算B2完成或被静默丢弃。

| 候选 | 索引来源 | B0人工归属 | B2核对边界 |
| --- | --- | --- | --- |
| [f3a8413db9](./cc-viewer-alignment-commit-ledger.md#commit-f3a8413db9) | 70 + 38 | B2,B3,B4,B7 | SDK/WS/SSE范围已有实例及代次测试、真实同名隔离补证；子agent分类与展示须按B3/B4独立核验。 |
| [3cc05b496d](./cc-viewer-alignment-commit-ledger.md#commit-3cc05b496d) | 70 | B4,B8 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [dabc5232ce](./cc-viewer-alignment-commit-ledger.md#commit-dabc5232ce) | 70 | B11 | 工程前置B11/A1；见既有pnpm映射，不新增无用迁移。 |
| [f9467bfc83](./cc-viewer-alignment-commit-ledger.md#commit-f9467bfc83) | 70 | B8,B11 | 目录重组须按B11路径映射，不作为会话功能完成。 |
| [16267dc04c](./cc-viewer-alignment-commit-ledger.md#commit-16267dc04c) | 70 + 38 | B2,B8 | B2恢复配置/原生thread续接已测；原始system prompt pin完整链路按B8继续核验。 |
| [efc7f8eab1](./cc-viewer-alignment-commit-ledger.md#commit-efc7f8eab1) | 70 + 38 | B2,B3,B4,B7,B11 | SDK scratch保持输入框和最终320/400px GUI通过；浮动composer/其他surface在B7继续。 |
| [7a2dd6162e](./cc-viewer-alignment-commit-ledger.md#commit-7a2dd6162e) | 70 | B3,B4,B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [dafe2bce37](./cc-viewer-alignment-commit-ledger.md#commit-dafe2bce37) | 70 | B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [72c059f6b9](./cc-viewer-alignment-commit-ledger.md#commit-72c059f6b9) | 70 | B4,B8 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [0d067a1b7c](./cc-viewer-alignment-commit-ledger.md#commit-0d067a1b7c) | 70 | B4,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [bf2d6f2ad8](./cc-viewer-alignment-commit-ledger.md#commit-bf2d6f2ad8) | 70 | B4,B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [d7f355ba89](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89) | 70 | B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [17df4e2fbf](./cc-viewer-alignment-commit-ledger.md#commit-17df4e2fbf) | 70 + 38 | B1,B2,B8,B11 | 工作区scope与B1配置基础已补证；Bind/system快照等混合项仍按B1/B8/B11独立核验。 |
| [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8) | 70 | B4,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [eb2e9703a2](./cc-viewer-alignment-commit-ledger.md#commit-eb2e9703a2) | 70 + 38 | B2,B3,B5,B7 | 77d4ad5等按实际组件/CSS恢复Header与共享选择器；切换/键盘排序/关闭GUI通过，指针跨项落点待；混合提交不整体完成。 |
| [649f853e5e](./cc-viewer-alignment-commit-ledger.md#commit-649f853e5e) | 70 + 38 | B2,B3,B5,B7 | 按用户确认仅当前cwd Viewer SDK档案，HTTP/CLI/picker已实现；拒绝缺失/损坏无fallback；Safari实际picker恢复及续接原thread通过。 |
| [d6cab4869a](./cc-viewer-alignment-commit-ledger.md#commit-d6cab4869a) | 70 + 38 | B2,B3,B4,B11 | Claude task_*消息不伪装成Codex事件；SDK按自身事件作用域转发，完整任务/HUD在B4继续。 |
| [7f7f78e2d8](./cc-viewer-alignment-commit-ledger.md#commit-7f7f78e2d8) | 70 + 38 | B2,B5,B7 | 7d17f24按实际DirBrowser一步启动接线，8项组件及共享表格启动GUI通过；其他目录能力按B5/B7独立核验。 |
| [04d05a5824](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) | 70 | B4 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [133bc219df](./cc-viewer-alignment-commit-ledger.md#commit-133bc219df) | 70 | B4,B8 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [2be5bb23f6](./cc-viewer-alignment-commit-ledger.md#commit-2be5bb23f6) | 70 + 38 | B2 | 按实例scratch分组/关闭服务测试、最终GUI双shell隔离/关闭刷新通过；真机待。 |
| [3079040494](./cc-viewer-alignment-commit-ledger.md#commit-3079040494) | 70 + 38 | B2,B4 | 常驻会话/隔离、真实CLI本地模拟、最终双浏览器/恢复GUI通过；外部真实模型/真机未验。 |
| [a07464187c](./cc-viewer-alignment-commit-ledger.md#commit-a07464187c) | 70 + 38 | B2,B7 | 7d17f24直接迁移1080px/embedded留白；双浏览器弹窗和启动GUI通过，其他UX按B7独立核验。 |
| [ad369d2856](./cc-viewer-alignment-commit-ledger.md#commit-ad369d2856) | 70 + 38 | B2,B4 | Codex SDK没有getContextUsage控制RPC，已核对为不适用；不代表context能力完成。 |
| [bc669f59cc](./cc-viewer-alignment-commit-ledger.md#commit-bc669f59cc) | 70 + 38 | B2,B3,B4,B11 | 启动取消、普通取消、并发代次/真实Codex已测；忽略SIGTERM已复现，14c39d4自有POSIX子进程监管完成，真实CLI本地模拟/核心GUI通过；Windows及外部模型仍待。 |
| [c4529a6ed7](./cc-viewer-alignment-commit-ledger.md#commit-c4529a6ed7) | 70 | B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [5c28d4c50a](./cc-viewer-alignment-commit-ledger.md#commit-5c28d4c50a) | 70 + 38 | B2,B3 | 每实例事件通道已实现；参照HTTP/WS/SSE证据。 |
| [a30d8c92a7](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7) | 70 + 38 | B2,B3,B4,B5 | 每实例事件通道修复须逐项保留证据；混合项不整体标完成。 |
| [f20efc1371](./cc-viewer-alignment-commit-ledger.md#commit-f20efc1371) | 70 | B1,B11 | 签名B11，不以机械B类别计入会话功能。 |
| [a84385b5a8](./cc-viewer-alignment-commit-ledger.md#commit-a84385b5a8) | 70 + 38 | B2,B4 | 稳定身份/关闭/隔离通过；3cbd71e桌面与移动双端远程关闭回退GUI通过；未知URL/历史不静默fallback。 |
| [2847027b54](./cc-viewer-alignment-commit-ledger.md#commit-2847027b54) | 70 | B4,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [67ceb5b7f0](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) | 70 | B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [51c23e9090](./cc-viewer-alignment-commit-ledger.md#commit-51c23e9090) | 70 | B4,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [9dbf4e295a](./cc-viewer-alignment-commit-ledger.md#commit-9dbf4e295a) | 70 + 38 | B2,B4,B7 | SDK scratch保留输入框，最终窄屏/多shell/关闭刷新GUI通过；真机触控待。 |
| [9b1bb4e729](./cc-viewer-alignment-commit-ledger.md#commit-9b1bb4e729) | 70 | B4 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [c66b5fe2ed](./cc-viewer-alignment-commit-ledger.md#commit-c66b5fe2ed) | 70 | B7,B8 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [6bc7781bba](./cc-viewer-alignment-commit-ledger.md#commit-6bc7781bba) | 70 + 38 | B2,B11 | 本地resume连接测试使用独立临时目录及before/after清理；全量/新安装均通过。 |
| [ab1b89ee13](./cc-viewer-alignment-commit-ledger.md#commit-ab1b89ee13) | 70 + 38 | B2,B5,B6,B11 | B2工作区范围已覆盖实际HTTP文件/搜索/Git/快照/日志；完整文件功能在B5继续核验。 |
| [d89aa3b9af](./cc-viewer-alignment-commit-ledger.md#commit-d89aa3b9af) | 70 | B3,B4 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [9c36b5b5a7](./cc-viewer-alignment-commit-ledger.md#commit-9c36b5b5a7) | 70 | B7,B8 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [91b0055f2d](./cc-viewer-alignment-commit-ledger.md#commit-91b0055f2d) | 70 | B4,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [1aca9b5f8f](./cc-viewer-alignment-commit-ledger.md#commit-1aca9b5f8f) | 70 + 38 | B2,B7 | 权威队列/回执/移除/暂停/立即发送已实现；82e25e7与d53f4ea恢复上游inputStack队列条/角色筛选，最终400px操作/无残留GUI通过；混合提交不整体完成。 |
| [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac) | 70 | B4,B7,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [5e50112388](./cc-viewer-alignment-commit-ledger.md#commit-5e50112388) | 70 | B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [3d65bedcd1](./cc-viewer-alignment-commit-ledger.md#commit-3d65bedcd1) | 70 | B4,B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [282306a950](./cc-viewer-alignment-commit-ledger.md#commit-282306a950) | 70 | B4,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [84e65cddc6](./cc-viewer-alignment-commit-ledger.md#commit-84e65cddc6) | 70 + 38 | B2,B3,B4,B11 | Codex全turn _queryBusy覆盖工具静默，晚连SSE重放active；POSIX取消监管已测。Windows强制回收未做；审批producer/其他混合项按B4继续，见状态复核。 |
| [cdf05bf8ee](./cc-viewer-alignment-commit-ledger.md#commit-cdf05bf8ee) | 70 + 38 | B2,B7,B8,B11 | b03a24f完成Codex恢复终态子项（真实503红绿复现）；完整手动retry及进度在B4继续，未标整条完成。 |
| [469a995ad8](./cc-viewer-alignment-commit-ledger.md#commit-469a995ad8) | 70 | B4,B7,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [7641f5181a](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a) | 70 | B4 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [88995a1046](./cc-viewer-alignment-commit-ledger.md#commit-88995a1046) | 70 | B4,B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [bd32d02884](./cc-viewer-alignment-commit-ledger.md#commit-bd32d02884) | 70 | B4 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [ee3545344e](./cc-viewer-alignment-commit-ledger.md#commit-ee3545344e) | 70 + 38 | B2,B4,B7 | b03a24f避免恢复成功仍保留假失败；完整手动retry inline交互在B4继续，未标整条完成。 |
| [c29af25e64](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) | 70 | B3,B4,B5,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [99256ac1d8](./cc-viewer-alignment-commit-ledger.md#commit-99256ac1d8) | 70 + 38 | B2,B4,B11 | 35e8d30恢复上游手机父结构/44px rail；最终320/400px、60列/缩高/多shell GUI通过，真实触控/软键盘待。 |
| [6b340326c6](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6) | 70 | B4 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [0cde7d1df8](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8) | 70 | B4 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8) | 70 + 38 | B2,B3,B4,B7,B8 | cef0070共享触控/多指/惯性清理已完成组件层；真实触控待，slow-upstream等在B4继续。 |
| [a3cc12619f](./cc-viewer-alignment-commit-ledger.md#commit-a3cc12619f) | 70 + 38 | B2,B3,B4,B8 | 0dce135固定列/测量/有限重试，35e8d30结构纠偏；实际60列/缩高通过，真机软键盘待，慢上游B4继续。 |
| [1bfc1585e8](./cc-viewer-alignment-commit-ledger.md#commit-1bfc1585e8) | 70 | B4 | 开关恢复和最终关闭刷新GUI通过；真机待。 |
| [6081b5d01a](./cc-viewer-alignment-commit-ledger.md#commit-6081b5d01a) | 70 | B9,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [919fded845](./cc-viewer-alignment-commit-ledger.md#commit-919fded845) | 70 | B3,B4,B8 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [ec14cd0234](./cc-viewer-alignment-commit-ledger.md#commit-ec14cd0234) | 70 + 38 | B2,B3,B4,B7,B8 | terminal活性/发送保留已有组件与实际HTTP/WS/SSE验证；真实睡眠/网络切换待，context等按B8独立核验。 |
| [187583787d](./cc-viewer-alignment-commit-ledger.md#commit-187583787d) | 70 | B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [23e4273a37](./cc-viewer-alignment-commit-ledger.md#commit-23e4273a37) | 70 | B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [dd8709356b](./cc-viewer-alignment-commit-ledger.md#commit-dd8709356b) | 70 | B3,B11 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [a2f5cd4b43](./cc-viewer-alignment-commit-ledger.md#commit-a2f5cd4b43) | 70 | B5,B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [add350bc52](./cc-viewer-alignment-commit-ledger.md#commit-add350bc52) | 70 | B4,B8 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [975313773a](./cc-viewer-alignment-commit-ledger.md#commit-975313773a) | 70 + 38 | B2,B4 | agent身份关联到B2，卡片/HUD在B4继续核验。 |
| [8f1d345309](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309) | 70 | B4,B7 | 按B0人工归属包继续核验；不以本包完成替代其能力。 |
| [e3ca28c52d](./cc-viewer-alignment-commit-ledger.md#commit-e3ca28c52d) | 38 | B2,B11 | 工程结构B11/A2；见已有monorepo交接。 |
| [3a2159219b](./cc-viewer-alignment-commit-ledger.md#commit-3a2159219b) | 38 | B2,B4,B8 | 模型容量规则B4/B8；不复制Claude默认1M到Codex。 |
| [d5e66ec1d8](./cc-viewer-alignment-commit-ledger.md#commit-d5e66ec1d8) | 38 | B2,B8,B11 | B2的cwd/配置归属见常驻registry及隔离验证；headless增强上下文按B8继续核验。 |
| [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807) | 38 | B2,B3 | 合并提交，追溯5c28d4c50a/a30d8c92a7，不重复搬运。 |
| [d01259c844](./cc-viewer-alignment-commit-ledger.md#commit-d01259c844) | 38 | B2,B3 | 合并提交，追溯5c28d4c50a/a30d8c92a7，不重复搬运。 |
| [0a9ad5d767](./cc-viewer-alignment-commit-ledger.md#commit-0a9ad5d767) | 38 | B2,B3,B4 | 合并提交，追溯a84385b5a8，不重复搬运。 |
| [5ee6739cba](./cc-viewer-alignment-commit-ledger.md#commit-5ee6739cba) | 38 | B2,B4,B8 | SDK用量展示B8；不把terminal心跳子项等同用量面板完成。 |
| [1e0edc00f3](./cc-viewer-alignment-commit-ledger.md#commit-1e0edc00f3) | 38 | B2,B7 | queue派发快照/labelSuffix已接线，671547d立即发送已实现，GUI顺序/无残留通过。 |
| [08809f6e69](./cc-viewer-alignment-commit-ledger.md#commit-08809f6e69) | 38 | B2,B3,B4,B5,B7,B10,B11 | 被082673509e回退的混合提交；须核对后续重新引入，不整体搬运。 |
| [082673509e](./cc-viewer-alignment-commit-ledger.md#commit-082673509e) | 38 | B2,B3,B4,B5,B7,B10,B11 | 回退08809f6e69；保留血缘，不标新增能力完成。 |

2026-11-19 iOS追加补证：隔离iPhone16e/iOS18.6 Simulator移动Safari的软键输入、网页触控Enter/Up/保持键盘展开、20×60→37×60及scratch切回保留输出通过。CUA drag/scroll未观察滚动位移，原因未定；指针跨项落点/物理单多指惯性仍待。不是物理真机通过，无后续代码改动。
