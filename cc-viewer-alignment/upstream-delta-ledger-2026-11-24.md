# 第二轮新增提交台账（2026-11-24）

固定范围：`74cd752d99caf122e750216d2af3bb9f467c4de1`（1.9.29，不含）→ `d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd`（源码版本1.9.35，含）。以Git可达集合差确定，不按B11本地完成日期筛选。

共25笔：17笔含功能/修复、5笔纯发布、1笔changeset、1笔merge、1笔图表；净变更123文件、+8819/-585。完整双时间、父提交、消息、逐文件候选见[机器索引](./upstream-delta-2026-11-24.json)，执行顺序与验收见[续对齐计划](./upstream-delta-plan-2026-11-24.md)。

**状态边界：B12行为子项已完成本地实现及隔离验收，其余新功能仍按计划推进。** B12映射与未验边界见[完成矩阵](./B12-completion-matrix.md)。 “部分已有”来自本地源码及既有测试定义，仍需本轮实际验证。元数据已登记不等于关联功能完成。

| 上游提交 | 时间（+08:00） | 工作包 | 内容及本地处置 |
| --- | --- | --- | --- |
| [f8d06c72](https://github.com/weiesky/cc-viewer/commit/f8d06c72695f1b8d160c361eb488d30e61062933) | 11-17 11:25 | B13 | 输入区清空/提示导航顺序、头像22px；待迁。 |
| [2476d7b5](https://github.com/weiesky/cc-viewer/commit/2476d7b5696821d5a9ba3e23b3fe9eddc95e9c04) | 11-17 14:24 | B13 | 文档Markdown复制组件；与72f0393c合看最终代码，待迁。 |
| [bdf4257f](https://github.com/weiesky/cc-viewer/commit/bdf4257f55068693dff10012291abf8a75fe5b4c) | 11-17 14:24 | B14 | 记忆文件夹改应用内浏览器；Codex目录/访问策略需适配。 |
| [06be1ce6](https://github.com/weiesky/cc-viewer/commit/06be1ce62ee4ada15bc7805fe92b22dcf2f7451b) | 11-17 16:15 | B12 | 更新tarball下载跟随重定向；已实现`9943faf`，2862全量/真实包与真实重定向验收通过。 |
| [495931df](https://github.com/weiesky/cc-viewer/commit/495931dfb0f081032b0137bfed27f5932c17e917) | 11-17 17:50 | B14 | 记忆根锚定与首次创建；Claude路径不照搬，待适配。 |
| [72f0393c](https://github.com/weiesky/cc-viewer/commit/72f0393c89f4d448e47fd754e582eaaac8a75739) | 11-17 17:50 | B13 | 复制按钮LAN HTTP回退、反馈生命周期、18语；最终有效版本，待迁。 |
| [fd4426eb](https://github.com/weiesky/cc-viewer/commit/fd4426eba0d29f9ac93cdbd834bec298a3a53168) | 11-17 17:54 | B20 | 1.9.30发布；元数据登记，不搬版本号。 |
| [a87b61f5](https://github.com/weiesky/cc-viewer/commit/a87b61f572f7e38442094afc38e09fefac159c21) | 11-18 12:13 | B13/B15/D1 | 混合：定时导航、UI微调、审批默认值；拆分，D1沿既有选择。 |
| [73b9a1d1](https://github.com/weiesky/cc-viewer/commit/73b9a1d18ceaeb23b6b03a9089fb6008819bab5c) | 11-18 12:33 | B13/B15/D1 | 前项修复：tick、ARIA、对比度、韩语、Mobile默认值；最终链待迁，策略单列。 |
| [268a9628](https://github.com/weiesky/cc-viewer/commit/268a962865a9b854865dae882dabd4d1600da4c4) | 11-18 13:00 | B20 | 1.9.31发布；元数据登记。 |
| [2c322981](https://github.com/weiesky/cc-viewer/commit/2c3229811204e2e11a5982e6b96eaf6663cfc7c5) | 11-18 22:55 | B16 | #177：浏览器历史/地址/列表/排序/过滤、服务端受保护解析；待迁。 |
| [b65f667d](https://github.com/weiesky/cc-viewer/commit/b65f667d9379deb416c287125f36e09d264eaec2) | 11-18 22:56 | B20 | 1.9.32发布；元数据登记。 |
| [03aad20b](https://github.com/weiesky/cc-viewer/commit/03aad20b929d67d566fa884fdc78391148627fae) | 11-19 01:46 | B12/B20 | #178：B12行为子项已适配`f014bf9`，真实成功/失败恢复通过；密码会话仍需重登；1.9.33元数据只登记。 |
| [cb7d59e1](https://github.com/weiesky/cc-viewer/commit/cb7d59e1f528426b4ba20c1f09c358fff50eb936) | 11-20 10:17 | B17 | SDK代理面板刷新恢复/水合守卫/箭头尺寸；原生重连部分已有，先验证缺口。 |
| [8dddb8a1](https://github.com/weiesky/cc-viewer/commit/8dddb8a11591ee1a55330946c8aa51f9ba4d463e) | 11-20 11:06 | B18 | Git单/多仓库当前分支显示；本地数据已有，UI/未知三态待迁。 |
| [db741d5e](https://github.com/weiesky/cc-viewer/commit/db741d5edc3b195c6edae15027e750a6afb7a5ec) | 11-20 11:44 | B13 | 暗色Dropdown选中项白字token；待迁。 |
| [e7313de7](https://github.com/weiesky/cc-viewer/commit/e7313de790c5d16c9d37ef3521c1e56b27fb5912) | 11-20 12:42 | B20 | 上项配套changeset；元数据登记。 |
| [a7026496](https://github.com/weiesky/cc-viewer/commit/a702649653bff7b5ecd07babc49918604db4ccae) | 11-20 12:42 | B20 | 1.9.34发布；元数据登记。 |
| [b8d5924b](https://github.com/weiesky/cc-viewer/commit/b8d5924bc016f299dbfa13ef9cffb45e9111348c) | 11-22 01:51 | B19 | 混合：移除相对路径菜单/类型化复制标签，另含workspaceLaunch/IPC/入口基础；待分拆。 |
| [4a5ea59b](https://github.com/weiesky/cc-viewer/commit/4a5ea59ba68ccc38acded6e064437a91ca1b5c6b) | 11-22 01:52 | B19/D2 | 混合：文件夹/弹窗新建工作区、forceNew空视图、同cwd写隔离/恢复属主；普通入口可拆，同cwd待决策。 |
| [6f904397](https://github.com/weiesky/cc-viewer/commit/6f904397ada3021bb05ff5232002022df1dc5e6e) | 11-22 01:52 | B19/D2 | SDK同cwd并列会话，registry改instanceKey、关闭/resume/调度适配；待D2，不覆盖单cwd决定。 |
| [09807265](https://github.com/weiesky/cc-viewer/commit/0980726597e37f3b35eddf2db4a159f8a2543e24) | 11-22 12:17 | B19/D2 | #179：bound视图冷挂载WS控制帧实例戳；依赖上项，SSE后续缺口单列。 |
| [f0c23018](https://github.com/weiesky/cc-viewer/commit/f0c23018c37a89dbeafa65fe35e0364ed217698e) | 11-22 12:19 | B19/D2 | #179合并；只引入09807265，自动merge tree与实际一致，不重复搬运。 |
| [16bf86e2](https://github.com/weiesky/cc-viewer/commit/16bf86e2e92ea7766b35f814a04854e1b95fecf3) | 11-22 12:21 | B20 | 1.9.35发布；元数据登记。 |
| [d3c1f7fb](https://github.com/weiesky/cc-viewer/commit/d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd) | 11-23 20:33 | B20 | star-history图表；登记为非运行时资料。 |

## 合并、替代与范围约束

- `2476d7b5 → 72f0393c`：采用最终复制按钮，不迁中间态。
- `bdf4257f → 495931df → 2c322981`：记忆入口/根目录修复后叠加浏览器增强，Codex目录另适配。
- `a87b61f5 → 73b9a1d1`：UI与修复完整迁，默认审批拆成D1。
- `b8d5924b`标题不足以覆盖真实diff；工作区启动基础不得漏项。
- `4a5ea59b → 6f904397 → 09807265 → f0c23018`：forceNew/写隔离→并列SDK→冷挂载WS修复，依赖D2。PR #179明确未覆盖SSE cold-load/history后续项。
- #177/#178以main中的squash hash计数，不再额外把PR分支hash算进25笔。
- 1.9.30/31/32/34/35共5笔纯release，1.9.33在03aad20b内；不漏版本也不复制上游版本号。
- 唯一open PR #128最后更新于2026-09-15且未合并，不属于本轮main新增范围。

## 本地维护排重与未验证边界

调查起点4cb1a4c已包含SDK模型切换8227874、上下文代次/回跳e9f0017、footer套餐用量b61814f及PR #14上下文/启动警告；本轮上游17笔行为提交不新增这些功能，不重复列实施任务。

cb7d59e1对应本地已有原生WS快照与精确实例重连：`sdk-manager.getSdkAgentState → server.js → TerminalWsContext → ChatView`；现有`sdk-workspace-connections.test.js`含重连快照一致/邻实例不收/完成后清空。**本轮只读了测试定义，未重跑；浏览器整页刷新/水合窗口/CSS仍需B17实际验收。**

旧B0–B11的活动GUI、真实网络、Windows/Electron/真机等未验事项沿原矩阵保留；与本轮新增功能分别记账。
