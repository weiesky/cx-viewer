# SDK 启动警告修复（2026-11-23）

本轮为用户截图问题的本地修复，不新增 B0 上游迁移，不改变 B11 完成矩阵及其未验环境。

## 原因与依据

- 本机 Codex CLI `0.169.0`、项目 SDK `0.142.5`。SDK 的 `ErrorItem` 在已安装 `dist/index.d.ts` 中定义为 non-fatal；真正的回合失败另有 `turn.failed`。旧适配器统一加 `Error:`，且不同 item ID 的相同警告重复进入流与最终正文。
- 固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1` 的 `packages/app/server/lib/sdk-manager.js`（`_processMessage` 的 system/result 分支）与 `sdk-adapter.js` 已复核；`efc7f8eab199a04f3b8dcb660a5bfde593138f66` 的实际 adapter diff 移除了旧合成展示，上游当前经 wire proxy 展示。Codex exec 的 ErrorItem 是本地必须适配的协议差异，此次不搬入 Claude 事件或新增 UI/CSS。

## 实施

本地 `packages/app/lib/sdk-adapter.js` 将非致命 item 显示为 `Warning:`；`sdk-manager.js` 在当前回合权威 item 表中按消息去重不同 ID 的重复警告。流与最终正文共用该表，保留首条诊断及不同警告，下一回合重新保留诊断。`turn.failed`、顶层流错误、EOF、进程失败及重试处理保留。补充真实事件 fixture 的成功、失败、流、去重与跨回合回归；增加 cx-viewer patch changeset，未运行 version。

本机配置已在写入前备份至 `/Users/sky/.codex/backups/cxv-sdk-startup-20261123-221343/`（目录 0700、文件 0600）：

- 删除 5 项已忽略设置：`disable_response_storage`、`features.plan_tool`、`features.rmcp_client`、`features.streamable_shell`、`features.view_image_tool`。后四项已与本机 `codex features list` 的支持集合核对。
- 删除已 removed 的 `features.apply_patch_freeform`；将 `features.web_search_request=true` 改为顶层 `web_search="live"`，保留联网搜索意图。
- 仅把 `agentic-monitor/1.3.7/hooks/hooks.json` 的 `SessionEnd` timeout 从 10 改为 3，其余事件、命令与启用状态保持。此为当前本机插件缓存的修复，不是插件上游发布；插件升级后的缓存应重新核对。
- 配置与插件备份不纳入仓库，不保存认证内容。

## 验证

- `codex app-server --strict-config --print-startup-config`：退出 0。未保存启动配置正文。
- 真实当前 Codex + 官方 SDK + 本地 supervised exec transport，在独立临时工作目录发送“只回复 OK，不调用任何工具。”：thread.started / turn.started / item.completed / turn.completed 各 1，回复 OK，诊断 0。仅结束自有探针；未停止或重启用户实例。
- 定向 adapter/manager/task 测试 14/14；SDK 全组与 thinking cold replay 回归 132/132，0 skip。
- `pnpm run build` 通过（保留既有大 chunk 提示）；boundaries 530 文件、0 违规；tarball-drift 601 源码通过；`git diff --check` 通过。

本轮代码、测试、changeset 与记录保留在工作区，未新建 PR、推送或发布。正在运行的后端不会热加载模块，展示修复需正常重启后加载；每次新启动的原生 exec 已能读取清理后的配置。已有历史里的旧警告保留，不做数据删除。未做活动实例 GUI 验收，真实 SDK 无诊断与事件测试不冒充该项通过。
