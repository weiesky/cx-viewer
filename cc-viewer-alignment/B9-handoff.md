# B9 交接：定时任务与授权

> 历史交接：本文保留B9开始前的状态。2026-11-23本地完成与未验边界见[B9完成矩阵](./B9-completion-matrix.md)；29笔原始提交已备份；当前已与B10由[PR #12](https://github.com/weiesky/cx-viewer/pull/12)合并main d829772，旧#11关闭。

B8 已完成验收并合并 main；最终 PR、合并 hash 与检查点见 [B8 完成矩阵](./B8-completion-matrix.md)。本轮只准备 B9，未迁入定时任务或改变权限默认值。

固定上游为 `74cd752d99caf122e750216d2af3bb9f467c4de1`，当前只读源码 `/tmp/cxv-cc-viewer-research-20261122`。先遵守[源码优先规范](./migration-code-first.md)：逐笔读第一父 diff、完整调用链、原组件与 CSS，以及后续修复/回退，再做最小必要 native 适配。临时目录消失时按同一 hash 获取，不追随 HEAD。

主索引 11 笔与交叉索引去重 13 笔，另补 B8 实读发现的 `134a0de7ac` 权限倒计时子项，共 [14 个候选](./B9-candidate-index.json)。这是待审索引，不代表已读完源码或已实现。先按 `177b85df2c` → `451ef48d6a` → `5ee6739cba` → `7a0ba39edf` → `2914d6479d` 核定时全链；权限按 `51c974e441` / `aaa3a59444` / `208f134827` / `6081b5d01a` 和 134 后续最终版本核，其他项确认此前已验子项与剩余边界。

B9 实施入口与验收重点：

- 核原定时设置入口、弹窗、快速时间按钮、存储版本与历史拆分、后台执行及原布局。当前本地有 B1 preferences/凭据锁、B2 精确实例、B3 生命周期、B4 SDK/原生审批与 B7 队列能力，优先复用，不能仅因标题相同整条认完成。
- 明确一次/重复触发、时区/DST、睡眠唤醒、漏跑、时钟跳变、取消/重启、目录消失、权限拒绝和附件删除的上游实际语义；两进程以真实租约/锁及幂等身份验竞争，不凭 cwd 或 basename 找“差不多”的会话。
- `5ee6739cba` 的 scheduled executor 只传已解析精确 instance，避免 legacy project stamp 导致 native manager 拒绝。resident/独立临时执行需追完整归属、日志、结果、取消和自有进程树清理，未在 B8 提前实现。
- 权限 countdown、server hosting、自动答题均是 B9 待核 producer。既有新 PTY 按弹窗选择的权限、默认 exec/显式 AppServer 渐进保持；不能把上游三秒默认、自动答题或完全 bypass 静默开启。遇产品/权限选择，用提问工具列选项；已有选择不重复确认。
- 单笔验证后单独提交，记录上游完整 hash → 本地 commit；采用 fake clock 加隔离 HTTP/WS/真实 native 联测，保留失败复现/环境要求。验证无法执行时如实未验，继续独立子项；不将协议夹具冒充外部模型、真机或真实调度通过。

B8 后持续有效：七组内置提示默认启用且仅新会话注入，手动指令/native resume/fork 优先；主/子代理分源需所属协议祖先证明，SDK exec 子源不可用，Teammate 隐藏；窗口跟随原生末轮用量，缺失未知，旧 353K 决定已替代；代理重试配置与统计整项排除，不在 B9 顺手恢复。

全局 bin 仍链接本仓库 `packages/app/cli.js`。活动 7008/PID38260 为普通 PTY 后端，代理未停止/重启；不要杀当前父进程或其他 ccv 实例验证入口。后端改动需下一次正常重启加载，不能仅凭 dist 更新宣称用户运行实例已修复。最终自有 SDK fixtures 已退出，需要 GUI 时重新启动隔离夹具。

B8 最终 2232/2232、0skip、build/pack737；全新生产安装685/685、737包/211Web精确字节、B1.2/隔离CLI、真实 SDK 双引擎及 native default AppServer 主2/子1证明通过。仍未验：用户实际 SDK 地址/外部模型遵循与自动压缩、物理设备/音频/IME/触控、LAN/TLS、其他OS/最低Node，以及历史IM并发偶发原因；不阻塞可独立执行的B9，也不标已通过。
