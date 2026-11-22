# B7 候选范围核销矩阵

固定上游`74cd752d99caf122e750216d2af3bb9f467c4de1`。21主索引与72交叉索引去重为74候选；本表核销B7有效子项，不将整条混合提交或未验平台标为完成。四项纯expert/提示资产按既定B8/B11范围继续。追加源码窄split及只读扩窗见末尾。

| 上游 | B7子项结论 | 实施及源码依据 |
| --- | --- | --- |
| `fc68e850f2` | 工具结果图片、原时间戳及请求跳转复用原生管线；Claude JSONL格式不移植 | [实施](./B4-implementation.md) / [依据](./B4-completion-matrix.md) |
| `e4fc788b9e` | 孤立已提交输入与进行中状态复用B3真实writer闭合；无伪造degraded数据 | [实施](./B3-sharding.md) / [依据](./B3-completion-matrix.md) |
| `e12dcaded9` | composer限宽/主题/焦点两行与autosize；有效12行及后修优先 | [实施](./B7-implementation.md#e16) / [依据](./B7-E17-ghost-css.json) |
| `fcfef597dd` | 消息子项1400px，composer独立1000px、viewport scrollbar保持 | [实施](./B4-implementation.md) / [依据](./B7-E48-effective-source.json) |
| `20e6573b7c` | 800/400/300、每次展开300 | [实施](./B7-implementation.md#e36) / [依据](./B7-E36-render-window-source.json) |
| `1c5fadafbf` | 原HUD及普通精确root计划；实际0.169模型producer未验 | [实施](./B7-implementation.md#e41) / [依据](./B7-E41-task-hud-source.json) |
| `a70440ee62` | 原minimalChat合并及三个设置入口；native工具/线程身份适配 | [实施](./B7-implementation.md#e42) / [依据](./B7-E42-minimal-chat-source.json) |
| `aa58422956` | Prompt/Plan/Ask/UltraPlan徽标及生产请求归属 | [实施](./B7-implementation.md#e18) / [依据](./B7-prompt-nav/result.json) |
| `caaab3d12f` | 导航语言/稳定fingerprint缓存 | [实施](./B7-implementation.md#e18) / [依据](./B7-prompt-nav/result.json) |
| `6880f77320` | Markdown路径、技能导入及缓存Popover内容复用B5；角色/协议分支独立 | [实施](./B5-completion-matrix.md) / [依据](./B5-candidate-matrix.md) |
| `d906edb3de` | skills分作用域行、导航/HUD/role glass样式 | [实施](./B7-implementation.md#e22) / [依据](./B7-E22-skills-source.json) |
| `3bd2aa9696` | ghost两行/textarea下限和observer清理；CI下载重试归B11 | [实施](./B7-implementation.md#e17) / [依据](./B7-E17-ghost-css.json) |
| `117ee25de2` | 原浮动composer scrollbar bleed/ResizeObserver复用；shared方法AST相同 | [实施](./B4-completion-matrix.md) / [依据](./B7-E48-effective-source.json) |
| `1e0edc00f3` | 原SDK发送占位/Sending及有界30s核销 | [实施](./B7-implementation.md#e33) / [依据](./B7-E33-sdk-chip-source.json) |
| `ebfcbaec0d` | native响应已折入唯一messages；没有独立LR渲染分支，不新建副本再隐藏 | [实施](./B7-E48-effective-source.json) / [依据](./B4-completion-matrix.md) |
| `0cbb545288` | 工具增量两阶段游标/尾条重扫/真实切换reset复用B3 | [实施](./B3-transport-and-pagination.md) / [依据](./B5-implementation.md) |
| `791a5e18f8` | 原12行helper和CSS完整迁入 | [实施](./B7-implementation.md#e16) / [依据](./B7-E48-effective-source.json) |
| `d90ac9587d` | 两个共享渲染分支按实际segments跳过空白，合法system-tag保留 | [实施](./B7-implementation.md#e43) / [依据](./B7-E43-blank-bubble-source.json) |
| `ff0fe1ba93` | 粘贴图片/异步上传和defer原链复用B5/B6；图像native输入不支持边界保持 | [实施](./B5-completion-matrix.md) / [依据](./B6-completion-matrix.md) |
| `2e09d30192` | 原选区引用chip/发送与滚动，native即时单行paste最小适配 | [实施](./B6-implementation.md) / [依据](./B7-implementation.md#e35) |
| `478268a4db` | Markdown源复制与原选区copy复用B6 | [实施](./B6-implementation.md) / [依据](./B6-candidate-matrix.md) |
| `f3a8413db9` | canonical native thread/agent身份及持久标签，不复制Claude header | [实施](./B4-implementation.md) / [依据](./B4-candidate-matrix.md) |
| `73e4b44ccd` | 合并无新增resolution；继承e12/fcf，非重复功能 | [实施](./B7-E48-effective-source.json) / [依据](./B7-implementation.md#e16) |
| `efc7f8eab1` | 浮动输入结构/overlay测量复用B4；普通PTY、草稿/队列完成本轮；其余分支独立 | [实施](./B4-completion-matrix.md) / [依据](./B7-implementation.md#e21) |
| `7a2dd6162e` | 系统段JSON展开/严格SDK说明复用B4；raw指令不改 | [实施](./B4-implementation.md) / [依据](./B4-candidate-matrix.md) |
| `dafe2bce37` | 普通原队列/立即发送/Stop/IM互斥和SDK已验核心 | [实施](./B7-implementation.md#e28) / [依据](./B7-implementation.md#e31) |
| `c185a7484e` | native Context呈现body.input逐项Input，非Claude exchange；真实Turn协议不重命名 | [实施](./B7-E48-effective-source.json) / [依据](./B0-commit-file-evidence.md#evidence-c185a7484e) |
| `f28d9cae37` | 纯test-analysis expert资产/发布说明，无输入导航实现；B8/B11保持待核 | [实施](./cc-viewer-alignment-plan.md) / [依据](./B7-E48-effective-source.json) |
| `1af3d646c9` | 纯expert提示资产迭代，无B7代码；按既定B8模型提示范围继续 | [实施](./cc-viewer-alignment-plan.md) / [依据](./B7-E48-effective-source.json) |
| `57798b7ccc` | 归档页切项目回调/单页pager/间距复用B3 | [实施](./B3-transport-and-pagination.md) / [依据](./B3-completion-matrix.md) |
| `bf2d6f2ad8` | 原进度点/新prompt清理；精确当前root事件 | [实施](./B7-implementation.md#e41) / [依据](./B7-E41-task-hud-source.json) |
| `d7f355ba89` | 会话resume刷新与规范snapshot/cursor回放复用B3/B4 | [实施](./B3-browser-recovery.md) / [依据](./B4-completion-matrix.md) |
| `0670581b3d` | 冷摄取失败reset/gate泄洪复用B3；不添加Claude transport | [实施](./B3-implementation.md) / [依据](./B3-completion-matrix.md) |
| `8923322f88` | UltraReview内容资产及18语言模板，无输入导航代码；B8/B11保留 | [实施](./B4-candidate-matrix.md) / [依据](./cc-viewer-alignment-plan.md) |
| `eb2e9703a2` | 普通PTY registry/runtime/精确owner、原＋与共享弹窗；SDK/Electron原分支复用 | [实施](./B7-implementation.md#e1) / [依据](./B7-implementation.md#e34) |
| `649f853e5e` | 原共享resume/目录selector和权限picker；普通PTY逐实例；Git持久复用B5 | [实施](./B2-completion-matrix.md) / [依据](./B7-implementation.md#e13) |
| `7f7f78e2d8` | DirBrowser一步launch复用原回调，普通backend现已接齐 | [实施](./B2-completion-matrix.md) / [依据](./B7-implementation.md#e13) |
| `c4529a6ed7` | 整轮loading含工具静默和原生turn终态复用B4 | [实施](./B4-completion-matrix.md) / [依据](./B7-implementation.md#e29) |
| `a07464187c` | 原embedded modal底部20px留白，B2共享CSS/GUI复用 | [实施](./B2-completion-matrix.md) / [依据](./B7-implementation.md#e13) |
| `2dbe5cd695` | 原server偏好hydrate/legacy迁移/串行pin写入/外部scope同步 | [实施](./B7-implementation.md#e45) / [依据](./B7-E45-pinned-preferences-source.json) |
| `4991ba762d` | WS mux逐stream冷载/重连与token隔离复用B3 | [实施](./B3-transport-and-pagination.md) / [依据](./B3-completion-matrix.md) |
| `67ceb5b7f0` | 原slash菜单，权威native skills/list、精确owner/项目，使用$name | [实施](./B7-implementation.md#e25) / [依据](./B7-E25-slash-source.json) |
| `a2be00c45b` | 原桌面上传收纳到首行，保phone/pad分支 | [实施](./B7-implementation.md#e37) / [依据](./B7-E37-upload-menu-source.json) |
| `9dbf4e295a` | SDK scratch开合始终保composer，B4原guard复用 | [实施](./B4-implementation.md) / [依据](./B7-E48-effective-source.json) |
| `3cf3e9585f` | 原Upload hover取消级联、点击关闭菜单 | [实施](./B7-implementation.md#e37) / [依据](./B7-E37-upload-menu-source.json) |
| `3c77d9a8ed` | slash合并无新resolution，原67ceb功能迁入E25 | [实施](./B7-implementation.md#e25) / [依据](./B7-E25-slash-source.json) |
| `a336d3919f` | 主终端原上传菜单首行；persistent picker原链 | [实施](./B7-implementation.md#e38) / [依据](./B7-E38-terminal-upload-source.json) |
| `9967ebdbc2` | 原18语言Quick Prompts标签 | [实施](./B7-implementation.md#e39) / [依据](./B7-E39-quick-prompts-source.json) |
| `c66b5fe2ed` | 原ProxyChip输入条slot/phone/pad/desktop门控复用B4；模型策略B8独立 | [实施](./B4-candidate-matrix.md) / [依据](./B4-completion-matrix.md) |
| `9c36b5b5a7` | 用户已选原Context分类不可用态/353K条不改，原颜色与空态复用B4 | [实施](./B4-candidate-matrix.md) / [依据](./B4-completion-matrix.md) |
| `1aca9b5f8f` | 普通队列原条/状态、SDK权威接收及取消/同文ID | [实施](./B7-implementation.md#e28) / [依据](./B7-implementation.md#e33) |
| `134a0de7ac` | UltraReview模板/专家内容，native命名agent适配留B8/B11；不伪造Teammate | [实施](./B4-candidate-matrix.md) / [依据](./cc-viewer-alignment-plan.md) |
| `566ade13fc` | 技能管理/原目录/文档编辑复用B5，原生技能枚举和slash本轮接入 | [实施](./B5-completion-matrix.md) / [依据](./B7-implementation.md#e23) |
| `3d65bedcd1` | SDK scratch保血条portal，与composer相同原guard | [实施](./B4-candidate-matrix.md) / [依据](./B7-E48-effective-source.json) |
| `7a75e1be81` | 精确target浏览/上下文菜单复用B5，不放宽文件策略 | [实施](./B5-completion-matrix.md) / [依据](./B5-candidate-matrix.md) |
| `cdf05bf8ee` | SDK原恢复状态/retry UI复用B4，不新增native重试策略 | [实施](./B4-completion-matrix.md) / [依据](./B4-candidate-matrix.md) |
| `08809f6e69` | 混合squash被082回退，不搬回；最终工具增量由0cbb复用B3 | [实施](./B3-transport-and-pagination.md) / [依据](./B5-cross-package-audit.md) |
| `082673509e` | 回退088血缘保留，B7无新增有效功能 | [实施](./B3-transport-and-pagination.md) / [依据](./B5-cross-package-audit.md) |
| `88995a1046` | 原错误条800px CSS复用B4，样式声明有效 | [实施](./B4-candidate-matrix.md) / [依据](./B7-E48-effective-source.json) |
| `ee3545344e` | retry恢复中隐藏原错误行复用B4 | [实施](./B4-candidate-matrix.md) / [依据](./B4-completion-matrix.md) |
| `469a995ad8` | SDK ask最小化跨视图、精确实例dismiss守卫复用B4 | [实施](./B4-candidate-matrix.md) / [依据](./B4-completion-matrix.md) |
| `2ea5181df8` | 原border-box/pad高度后修、CR/paste和任务适配；其他平台分支独立 | [实施](./B7-implementation.md#e16) / [依据](./B7-implementation.md#e35) |
| `4391792212` | 规范V2分片URL、目录owner及分页复用B3；原scratch URL身份本轮E31a补正 | [实施](./B3-sharding.md) / [依据](./B7-implementation.md#e31a) |
| `d6ec38be82` | 当前Header已无系统提示自动pin/轮询，原手动pins保留；不重引删除机制 | [实施](./B7-E48-effective-source.json) / [依据](./B7-E45-pinned-preferences-source.json) |
| `96f3a7a44e` | 原更多Modal/三视图/txt导出/空计数修正 | [实施](./B7-implementation.md#e19) / [依据](./B7-E19-prompt-modal-source.json) |
| `a6b82f16df` | 树内原搜索与持久化/跳转复用B5 | [实施](./B5-completion-matrix.md) / [依据](./B5-candidate-matrix.md) |
| `ea995f3883` | 原文件drag→composer/PTY引用、native路径转义复用B5/B6 | [实施](./B5-completion-matrix.md) / [依据](./B7-E48-effective-source.json) |
| `beaa2e86f2` | 目录drag原MIME/路径编码和策略复用B5；helper全函数AST相同 | [实施](./B5-completion-matrix.md) / [依据](./B7-E48-effective-source.json) |
| `ec14cd0234` | 现有用量条保持、mainWS心跳/重连复用B3/B4；native无分类RPC不伪造 | [实施](./B3-completion-matrix.md) / [依据](./B4-candidate-matrix.md) |
| `a2f5cd4b43` | Git路径drag/quote原链复用B5，native cwd/owner范围保持 | [实施](./B5-completion-matrix.md) / [依据](./B7-E48-effective-source.json) |
| `bde0244333` | 有界背压/附着缓存/逐stream复用B3，canonical native V2 | [实施](./B3-transport-and-pagination.md) / [依据](./B3-completion-matrix.md) |
| `1b3c2268e3` | diff/工具参数/Ask原选区添加到对话复用B6 | [实施](./B6-completion-matrix.md) / [依据](./B6-candidate-matrix.md) |
| `8f1d345309` | composer导航/mic迁位及active native身份计数 | [实施](./B7-implementation.md#e20) / [依据](./B7-E20-composer-nav-source.json) |
| `ac56c9c6d5` | 导航PR合并无新增resolution，8f源功能按scope验证 | [实施](./B7-implementation.md#e20) / [依据](./B7-E20-composer-nav-source.json) |

追加`2914d6479d`窄split由E32完成；`80ced6a996`只读逐帧扩窗由E40完成；不扩展其定时/workflow/release子项。最终验证与限制见[完成矩阵](./B7-completion-matrix.md)。
