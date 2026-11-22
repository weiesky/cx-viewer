# B8 完成矩阵

**已完成，第9/12工作包（2026-11-22）。** 固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`；37笔原始本地提交备份后整合为 `e2ee6e3`，经[PR #9](https://github.com/weiesky/cx-viewer/pull/9)自行复核并合并main（`6106d41`）。54候选只按B8职责核销，混合B9–B11子项继续保留，详见[范围审计](./B8-scope-audit.md)和[逐行候选矩阵](./B8-candidate-matrix.md)。

| 完成条件 | 结论与证据 |
| --- | --- |
| 专家/UltraReview | E1/E2/E10内嵌与独立v2资产、18语言最终自动修复P0/P1、评估P2；原载入链路/双浏览器。未宣称真实模型已按此修复。 |
| 内置模型提示 | E3/E11–E15七组native适配默认启用，原菜单/管理UI/CSS、私有CAS opt-out、六个纯变量、最终别名/头像；实际native逐字wire验证。 |
| 新建/恢复/手动优先 | 用户最新选择仅新会话：E4/E13/E14 native fresh/resume/fork跨进程钉扎、手动基础指令/文件优先，不迁proxy live热改。 |
| 无GUI链路 | E18内部argv在literal --前；E20/E21/E25完整CLI/read-only native config/受管私有文件与中断清理，实际8请求含工作区模型选择。复杂profile discovery明确跳过而透传原命令，不伪称全profile支持。 |
| SDK无回应 | 官方SDK baseUrl、显式AppServer native endpoint、API路径归一、raw抓包/规范聊天身份分离及去重；实际默认exec双引擎4请求/刷新/归档恢复，AppServer default provider红/绿实际3请求。用户既有进程需正常重启加载，外部模型未验。 |
| 角色路由 | E23–E28工作区CAS/watch/原Main/Sub区/compact/Default休眠；仅自有协议证明祖先身份，实际main2/child1；SDK exec子源禁用，Teammate隐藏。E27 child模型不污染root。 |
| 容量条 | 用户E22选native窗口/末轮用量替代旧353K；原槽/桌面/抽屉12K原生口径、缺失未知，SDK exec未知。实际7请求与双引擎8图，未实际触发自动压缩。分类面板保持已选明确不可用，不画假分类。 |
| 连接稳定性 | E29真实React类时钟验证十次失败后30秒慢恢复、成功复位、初次未open watchdog/卸载清理，草稿保留不重发；原生重试反馈与慢请求复用B4既有原CSS/协议/GUI证据。 |
| 排除项 | 代理重试配置与统计整项忽略；E5–E7已在66b6a28撤回，最终diff无该运行时/UI。Claude-only cc-switch导入器/不存在的snapshot或分类producer不新造。 |
| 最终测试 | 2232/2232（5+716+1296+215）、0skip；build/pack737；末尾空行清理后再次build/pack及完整新安装685/685、737包/211Web全部精确字节，B1.2/隔离CLI通过。 |
| 视觉与实例化 | 原CSS块/源资产hash保留；专家、模型管理、头像、动态容量、角色与SDK均有双引擎分项截图。最新SDK4最终图/功能pageErrors0；WebKit外部定位CORS另列，离线gpt-5原生metadata fallback可见。480px原模式标签截短保留、桌面mobile=1不算完整窄屏/真机通过。 |
| 交付 | 原/整合/远端head/merge tree精确相同；238远端文件核对，实际无PR checks，未冒称CI通过。37原hash/外部bundle见[整合记录](./B8-local-commit-consolidation-2026-11-22.md)。 |

[最终JSON](./B8-final-2026-11-22.json)记录当前验收；[E16检查点](./B8-E16-checkpoint.json)、旧B8-handoff/B4/B7文档保留当时事实，不回写为本轮重新通过。混合责任：B9定时执行/权限producer（含134倒计时、5ee精确instance），B10插件/公开URL/approval hook timeout，B11工程boundary gate/完整路径/发布元数据。

**未验与边界**：真实外部模型/指令遵循、自动压缩触发、用户故障SDK页地址和正常重启后的实例、物理设备/音频/IME/触控、真实LAN/TLS、其他OS/最低Node及历史IM并发偶发原因。代理未停止活动7008/PID38260或其他ccv实例，最终自有fixture已回收；dist/npm链接不等于后端已加载。

下一步按[B9交接](./B9-handoff.md)执行定时任务与授权，14个待审候选已整理；本轮未开始B9实现。
