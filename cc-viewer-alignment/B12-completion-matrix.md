# B12 完成矩阵（2026-11-24）

交付更新：已于2026-11-24通过[PR #15](https://github.com/weiesky/cx-viewer/pull/15)合并main `8a63f94`，原实现提交保留，10/10远端CI成功；见[合并回执](./PR15-delivery-2026-11-24.md)。以下保留原实施/验收时点记录，当前GitHub交付状态以合并回执为准。

**B12更新下载与访问token交接已完成本地对齐及隔离验收。** 固定上游`d3c1f7fbf47c0424226acbe064ab4135e7ebe3cd`；两个独立实现提交`9943faf`、`f014bf9`，对应上游`06be1ce6`、`03aad20b`的行为子项。上游1.9.33发布元数据仅登记，不改本地版本。

| 子项 | 本地实现及验证 | 结论 |
| --- | --- | --- |
| 下载302/307及摘要 | 原fetch改follow；真实重定向HTTP先红后绿，错误摘要/循环/超时拒绝、失败无残留 | 已对齐 |
| 三启动入口交接 | SDK/PTY/工作区选择器共用registerUpdateRestart，交接server当前访问token；真实安装包SDK CLI通过实际更新HTTP路由调用 | 已适配；PTY/选择器有接线合同，未各做真实重启 |
| token输入边界 | 严格32位小写hex；有效继承、非法删env并随机、手动启动轮换、后续子进程无交接变量、OTEL不同值 | 已验证 |
| 私有配置与清理 | 复用0600原子写；旧宽权限/符号链接、JSON错误脱敏、安装前删除、helper启动失败清理、安装失败恢复 | 已验证 |
| 原生文件访问边界 | 实际CODEX_HOME/cx-viewer及原子临时文件加入既有策略；自定义日志目录下真实node/rg搜索与替换先红后绿 | 已适配并验证 |
| 真实成功重启 | 新生产包→loopback302→真实synthetic tarball→真实CLI重启handler→真实helper→自有prefix中npm安装→同端口新进程 | 旧token HTTP200、匿名403；实际前端轮询函数判reload |
| 真实失败恢复 | 损坏已暂存tarball，真实helper摘要验证拒绝安装并恢复原CLI | 版本保持、进程更换；旧token200/匿名403，轮询判restored；错误回执不含token |
| 包与回归 | 全量2862/2862、0skip；定向82/82；build；536边界/605源码/630稳定路径；829包文件逐字节一致；新生产安装82/82 | 全部通过 |
| UI/CSS | 未改前端源码或样式；复用现有UpdateModal/App恢复轮询 | 无新视觉改动；未执行浏览器GUI验收 |

源码阅读、先红失败、环境纠正与逐笔依据见[B12实施](./B12-implementation.md)。机器证据、日志路径、实际安装位置及runtime结果见[回执](./B12-validation-2026-11-24.json)，可复现探针见[b12-update-runtime.mjs](./probes/b12-update-runtime.mjs)。新版本1.1.21/失败目标1.1.22仅为临时安装prefix中的合成fixture；仓库/app版本仍1.1.20，未运行version或发布。

## 必要差异与未验证事项

- 本地密码cookie是带revision/代次的独立内存会话，未改成上游访问token cookie。交接URL访问token不保留密码登录；跨进程后需重新认证，TLS密码门仍有效。
- 实际重启在自有临时prefix及自有端口60996完成并确认端口关闭，0模型turn；未停止/重启用户7008或其他用户实例，未读写用户历史/全局Codex配置。活动GUI须正常重启后单独验证。
- Windows、Electron GUI、WebKit、物理设备，以及PTY/工作区选择器各自的真实升级重启仍未验。本地三入口共用函数与合同通过，不折算上述实例化验收。
- 真实大tarball下载出现既有WriteStream监听器数量告警，来源为未改动的drain/close Promise.race分支；两个真实下载、摘要校验及清理均完成，本包未声称修复该告警，保留后续处理线索。
- 原生reviewer/AppServer、常驻transport、Ask默认关、TLS门、retry排除与30分钟run上限保持。D1审批默认值/D2同cwd多SDK会话不在B12启用。

下一工作包B13；原B0–B11与新B14–B20的未验/待决策项不因B12完成而核销。
