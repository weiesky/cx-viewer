# B10 完成矩阵：服务插件、反向代理与引导更新

**状态：2026-11-23本地实施与验收完成（第11/12工作包）。** 最终2713/2713、0skip/build/pack773，新生产安装1096/1096、773包/211Web精确字节、B1.2与安装CLI通过，见[安装回执](./B10-installed.json)。

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`；分支 `alignment/b10-services-reverse-proxy`，基于 B9 `231a8a7`。这是 B10 子项核销，不表示混合上游提交全部完成，也不抵扣 B11。

| 候选 | B10 结论与本地映射 | 保留范围 |
| --- | --- | --- |
| `6680d041d4` | 实核 Claude 2.1.233 工具目录 diff，保留本地 Codex catalog，不覆盖 | B0 已归 B11：原生目录/文档逐项核验仍待 |
| `a97d0f8adf` | 实核工具 Activation diff，不移植 Claude 开关/provider 限制 | B0 已归 B11：Codex 实际启用条件仍待 |
| `20ccfb7304` | 实核 content 抽包及 assembly/sentinel 探测；沿已选最小 workspace、单 npm 包 | 进一步抽包按 A2/B11 另决，未实施 |
| `58493d1c85` | E1–E10、E19–E22：manifest/目录扫描/子进程/代理/runtime/静态面板/管理 API/原 UI/动态 Electron pin/文档完成 | 原生审批保持；files-fs 复用本地安全 parsedUrl；发布元数据归 B11，Electron GUI未验 |
| `77b61bd571` | E2：审批 hook 15 秒超时；B8 E29 控制 SSE 慢恢复与原发送回执复用 | Claude resolver 不接 Codex；proxy retry/off watchdog 按用户选择排除；发布 B11 |
| `08809f6e69` | 混合 squash 被 `082673509e` 全树回退；不批量迁旧树 | 最终 agent-loop 重提按 B8/B10 叶子核销，其他工作包独立 |
| `082673509e` | `git diff --quiet 08809f6e69^ 082673509e` 返回 0，净树等于 `7039adeec3` | 回退血缘记录，不计新增功能 |
| `57c732d037` | E5、E11、E12、E14、E22：公开 base URL/path、Host、HTTP/SSE/WS、CLI、QR/分享、HTML、编码 Cookie | 按用户选择保持后端 TLS 密码门；未验外部 DNS/LAN |
| `4391792212` | E5/E11：反斜杠/C0/query-only 和编码前缀加固 | shard 等见 B3；其他混合子项不计 B10完成 |
| `6e3c93cd7c` | E13、E15–E18、E22：只报告检查、校验下载/锁/安装 root、重启助手/native 正常清理、原更新 UI/文档 | 不替换源码工作区/真实全局包，发布元数据 B11 |
| `17ba9be7b5` | E15–E19：readiness、失败恢复、状态/poll、Electron 渠道、旧实例阻挡及夹具竞争修正 | 失败恢复是尝试旧 CLI，不承诺 npm 部分写入的文件系统回滚；跨平台待 |
| `5a7904990b` | PR #171 合并血缘，由 `6e3c93`/`17ba9be` 覆盖，无重复搬运 | 不将 merge 另计一次功能 |

逐笔全文、测试和已遇失败见 [B10 实施](./B10-implementation.md)。完整 hash、路径足迹、状态与本地 commit 映射见 [12 候选索引](./B10-candidate-index.json)。13 个组件/CSS/模板与上游精确字节，更新弹窗仅包名替换，见 [源码核验](./B10-source-audit.json)。

实际验证范围：目录服务真实 detached 子进程、认证/路径/WS/SSE、崩溃/reload/restart/卸载/删除、host secret 与原生凭据隔离、健康 name/PID/nonce 防误杀；base URL 编码前缀及公开链接；私有 prefix 内真实 offline npm 安装；helper 成功/失败真实 CLI 恢复。全部变更小步验证后分别提交。

浏览器证据：插件面板 Chromium/WebKit × 同名 A 浅色/B 深色桌面/手机共 6 配置 10 图；真实 loopback TLS 终止代理 × 桌面/手机共 4 配置 8 图；更新 UI × 浅/深桌面共 4 配置 16 图。34 图均核看。更新 GUI 的 release/progress/restart 响应是受控夹具，与后端真实 offline 安装证据分开；故意面板渲染故障单列，非预期 pageerror 为 0。见 [面板](./B10-gui.json)、[TLS 代理](./B10-proxy-gui.json)、[更新](./B10-update-gui.json)。

用户选择保持：原生权限/reviewer、独立任务 AppServer、常驻 transport 不变、Ask 托管默认关、排除代理重试配置/统计；公开反代不信任转发头启用 HTTP 后端的远程密码登录。

未验：真实全局升级/实际发布 registry 下载及失败部分写入、Electron GUI/签名发布、Windows/Linux/最低 Node、真实 DNS/LAN-TLS、外部模型、物理手机/触控/IME/音频/密码插件、长等待/睡眠与历史 IM 偶发。B9 PR #11 仍 OPEN，B10 未推送、未建 PR、未合并；用户7008及其他实例未由本轮停止或重启，正常重启后才加载新后端。
