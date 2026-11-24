# SDK 实时工具 CR 两项修复

交付更新：已于2026-11-24通过[PR #15](https://github.com/weiesky/cx-viewer/pull/15)合并main `8a63f94`，原实现提交保留，10/10远端CI成功；见[合并回执](./PR15-delivery-2026-11-24.md)。以下保留原实施/验收时点记录，当前GitHub交付状态以合并回执为准。

2026-11-24，承接 `817e698` / `f805768` 的本地 CR，用户明确要求修复两项 P2。独立维护，不新增上游迁移核销；B12 完成、下一包 B13、第二轮固定 `d3c1f7f` 保持。

| CR 问题 | 实现 | 状态 |
| --- | --- | --- |
| 抽样签名碰撞，预览与前端规范化的正式结果复用旧字符串 | `7af2d75` | 已修复并验证 |
| 完整卡片截取前 5000 字符、简洁弹层截取前 50 行，导致长过程输出停更 | `5ab4adc` | 已修复并验证 |

第一项复用原字符串池，只在两个取值入口增加完整字符串相等判断；抽样签名用于定位候选，不能作为相同内容的证明。碰撞时保留当前准确值，原容量限制保持。回归使用 400 与 16,384 字符两种长度，在不影响首/中/尾样本的位置替换 old-status/new-status，验证过程结果更新、正式 input 内容准确以及完全相同内容仍可复用。修复前 1/6 失败，修复后 6/6 通过；没有新增缓存或复制状态队列。

第二项只在 `ChatView` 的临时结果映射标记 `previewTail`，通过原 `ChatMessage` 传给原完整结果组件和简洁预览函数。完整卡片保留最后 5000 字符，简洁预览保留最后 50 行及长行最后 500 字符，省略号位于被截去的开头。规范结果没有该标记，继续原预览逻辑；原字符串、归档、折叠偏好、布局、滚动容器和 MainAgent 原子替换机制保持。沿用用户滚动行为，不新增强制自动滚动；截图通过滚动现有容器检查最新内容。

使用实际 ChatView → ChatMessage → ToolResultView / Popover 调用链验证：多行超过 5000 字符/50 行，以及超过 9000 字符的单行，都可在两种展示方式中看到连续变化的尾部；原结果字符串不被截写，正式结果仍使用原预览。修复前断言失败，修复后与既有替换/去重/隔离回归共 5/5 通过。

## 验证回执

- 隔离全量 **2868/2868，0 失败、0 skip**：9 + 7 + 28 + 818 + 1760 + 246。根进程清理继承 CXV/CODEX/OTEL/NODE_OPTIONS，独立 HOME/CODEX_HOME，各 workspace 使用自己的测试日志设置。
- 构建通过；536 边界文件、0 违规；605 发布源码路径与 630 稳定 tarball 路径一致。只添加 patch changeset，实际版本仍为 1.1.20。
- Chromium 159 / WebKit 27.2 × 桌面/手机模拟视口共 **4 场、12 张截图**，桌面用完整卡片、手机用简洁弹层。真实构建 UI、SDK manager、控制流、WS mux、HTTP SSE 回放及 V2 归档，使用受控 exec 协议；每场连续三步约 6800 字符输出，先 OLD_STATUS 后 NEW_STATUS，长度与抽样签名相同。均正确更新，无旧值残留；重载恢复、完成/失败、正式结果替换无重复、Stop WS、兄弟实例隔离通过，0 pageerror。
- 既有 GUI shutdown 的 Stats worker code 1 提示仍有记录；没有将它作为本轮修复或删除它。首轮截图等待 Antd 动画不足，补充等待并滚动原容器后重跑四场，最终截图与结果一同保留在新目录，原 `817e698` 证据未覆盖。

本轮[机器回执](./SDK-live-tools-CR-2026-11-24.json)、[浏览器结果](./evidence/SDK-live-tools-CR-2026-11-24/result.json)、[完整卡片尾部](./evidence/SDK-live-tools-CR-2026-11-24/chromium-desktop-running.png)、[简洁弹层尾部](./evidence/SDK-live-tools-CR-2026-11-24/chromium-phone-running.png)。原 SDK 实现与真实 Codex CLI 双 transport 的旧验收见[原记录](./SDK-live-tools-2026-11-24.md)，本轮未重复执行原生 CLI/外部模型请求。

复现：

```sh
node --test apps/web/tests/tool-result-core.test.js
pnpm --filter @cxv/web exec node --test --test-name-pattern='long live shell output|SDK shell-only progress|tool progress survives|queued stream paint|cold V2 baseline' tests/sdk-workspace-tabs.test.js
PLAYWRIGHT_BROWSERS_PATH=/tmp/cxv-b4-browser.4dNjIw/browsers node cc-viewer-alignment/probes/sdk-live-tools-gui.mjs --cr-followup
```

两个独立修复已分别提交，未 PR/推送/发布/运行 version；用户活动实例未停止或重启，全局 Codex 配置与旧归档未改。隔离服务端口已关闭。需正常重启当前后端并刷新页面后一起加载原 SDK 实时进度与本轮修复。Windows、Electron GUI、物理设备和活动用户 GUI 未验；本轮没有扩大 B12 或 B13 的核销范围。
