# B0 提交血缘与基线核对

本记录覆盖上游固定快照 `74cd752d99caf122e750216d2af3bb9f467c4de1`，时间下界 `2026-07-26T04:55:08Z`。使用 `git rev-list --since-as-filter` 复核 337 条，以免普通 `--since` 对时间不连续历史的遍历剪枝造成遗漏；每条均在逐提交台账补充血缘信息。

核验结果：337 条，合并 32 条；7 组具有相同 stable patch-id（不等于行为完全相同）。

## 合并提交与窗口内分支提交

| 合并提交 | 标题 | 可达且不在第一父分支中的窗口内提交 |
| --- | --- | --- |
| [00dd0eaf94](./cc-viewer-alignment-commit-ledger.md#commit-00dd0eaf94) | Merge pull request #131 from souloss/feat/retry-stats-modal | [42207f7fd1](./cc-viewer-alignment-commit-ledger.md#commit-42207f7fd1), [60cb46ce98](./cc-viewer-alignment-commit-ledger.md#commit-60cb46ce98), [eef9fd870e](./cc-viewer-alignment-commit-ledger.md#commit-eef9fd870e), [935a33cc0a](./cc-viewer-alignment-commit-ledger.md#commit-935a33cc0a), [51b3443e57](./cc-viewer-alignment-commit-ledger.md#commit-51b3443e57), [3eb16102e5](./cc-viewer-alignment-commit-ledger.md#commit-3eb16102e5) |
| [b2d57c8d38](./cc-viewer-alignment-commit-ledger.md#commit-b2d57c8d38) | Merge remote-tracking branch 'origin/main' into pr-132 | [071398e55a](./cc-viewer-alignment-commit-ledger.md#commit-071398e55a), [20e4a63b24](./cc-viewer-alignment-commit-ledger.md#commit-20e4a63b24), [9600351738](./cc-viewer-alignment-commit-ledger.md#commit-9600351738), [ef64e15621](./cc-viewer-alignment-commit-ledger.md#commit-ef64e15621), [1626575652](./cc-viewer-alignment-commit-ledger.md#commit-1626575652), [6bd3b80e58](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58), [00dd0eaf94](./cc-viewer-alignment-commit-ledger.md#commit-00dd0eaf94), [42207f7fd1](./cc-viewer-alignment-commit-ledger.md#commit-42207f7fd1), [60cb46ce98](./cc-viewer-alignment-commit-ledger.md#commit-60cb46ce98), [eef9fd870e](./cc-viewer-alignment-commit-ledger.md#commit-eef9fd870e), [935a33cc0a](./cc-viewer-alignment-commit-ledger.md#commit-935a33cc0a), [51b3443e57](./cc-viewer-alignment-commit-ledger.md#commit-51b3443e57), [3eb16102e5](./cc-viewer-alignment-commit-ledger.md#commit-3eb16102e5) |
| [a803382c76](./cc-viewer-alignment-commit-ledger.md#commit-a803382c76) | Merge pull request #132 from souloss/fix/ccswitch-readonly-recovery | [1db2a38eab](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab), [b2d57c8d38](./cc-viewer-alignment-commit-ledger.md#commit-b2d57c8d38) |
| [617da66c96](./cc-viewer-alignment-commit-ledger.md#commit-617da66c96) | Merge pull request #134 from souloss/feat/proxy-retry-stream-idle | [25e118170c](./cc-viewer-alignment-commit-ledger.md#commit-25e118170c) |
| [0f3c16d6c7](./cc-viewer-alignment-commit-ledger.md#commit-0f3c16d6c7) | Merge pull request #135 from souloss/fix/ci-flakes-brotli-rmsync | [c768e8beb3](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) |
| [73e4b44ccd](./cc-viewer-alignment-commit-ledger.md#commit-73e4b44ccd) | Merge pull request #139 from weiesky/feat/chat-composer-polish | [fcfef597dd](./cc-viewer-alignment-commit-ledger.md#commit-fcfef597dd), [e12dcaded9](./cc-viewer-alignment-commit-ledger.md#commit-e12dcaded9) |
| [3f141cb974](./cc-viewer-alignment-commit-ledger.md#commit-3f141cb974) | Merge pull request #141 from anupamme/fix-repo-cc-viewer-cve-2026-39244-adm-zip | [9255663e33](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33) |
| [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4) | Merge branch 'main' into fix-repo-cc-viewer-cve-2026-13676-fast-uri | [3f141cb974](./cc-viewer-alignment-commit-ledger.md#commit-3f141cb974), [a97d0f8adf](./cc-viewer-alignment-commit-ledger.md#commit-a97d0f8adf), [6680d041d4](./cc-viewer-alignment-commit-ledger.md#commit-6680d041d4), [9255663e33](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33), [3cc05b496d](./cc-viewer-alignment-commit-ledger.md#commit-3cc05b496d), [ea8c5e39e0](./cc-viewer-alignment-commit-ledger.md#commit-ea8c5e39e0) |
| [721e2c9940](./cc-viewer-alignment-commit-ledger.md#commit-721e2c9940) | Merge pull request #140 from anupamme/fix-repo-cc-viewer-cve-2026-13676-fast-uri | [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4), [5c468c042e](./cc-viewer-alignment-commit-ledger.md#commit-5c468c042e) |
| [6ebeea8439](./cc-viewer-alignment-commit-ledger.md#commit-6ebeea8439) | Merge branch 'feat/remove-volatile-prompt-vars' | [72551f625b](./cc-viewer-alignment-commit-ledger.md#commit-72551f625b) |
| [cb50f60d5e](./cc-viewer-alignment-commit-ledger.md#commit-cb50f60d5e) | Merge pull request #144 from weiesky/feature/config-convergence | [68fd263aac](./cc-viewer-alignment-commit-ledger.md#commit-68fd263aac), [964ce756b6](./cc-viewer-alignment-commit-ledger.md#commit-964ce756b6), [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea), [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de), [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290), [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68), [b1fe5c09a6](./cc-viewer-alignment-commit-ledger.md#commit-b1fe5c09a6) |
| [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807) | Merge remote-tracking branch 'origin/main' into fix/sse-per-workspace-cr | [2dbe5cd695](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) |
| [d01259c844](./cc-viewer-alignment-commit-ledger.md#commit-d01259c844) | Merge pull request #149 from weiesky/fix/sse-per-workspace-cr | [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807), [a30d8c92a7](./cc-viewer-alignment-commit-ledger.md#commit-a30d8c92a7), [5c28d4c50a](./cc-viewer-alignment-commit-ledger.md#commit-5c28d4c50a) |
| [e6baf89e6a](./cc-viewer-alignment-commit-ledger.md#commit-e6baf89e6a) | Merge pull request #150 from weiesky/feat/ws-mux-dialogue-channel | [db2ada0866](./cc-viewer-alignment-commit-ledger.md#commit-db2ada0866) |
| [0a9ad5d767](./cc-viewer-alignment-commit-ledger.md#commit-0a9ad5d767) | Merge pull request #152 from weiesky/feat/sdk-instance-close-ws-mux-overflow | [46d33276c9](./cc-viewer-alignment-commit-ledger.md#commit-46d33276c9), [a84385b5a8](./cc-viewer-alignment-commit-ledger.md#commit-a84385b5a8), [4991ba762d](./cc-viewer-alignment-commit-ledger.md#commit-4991ba762d) |
| [ec440163c0](./cc-viewer-alignment-commit-ledger.md#commit-ec440163c0) | Merge pull request #153 from weiesky/fix/file-tree-row-shrink | [7830664780](./cc-viewer-alignment-commit-ledger.md#commit-7830664780) |
| [06e1db54c7](./cc-viewer-alignment-commit-ledger.md#commit-06e1db54c7) | Merge pull request #154 from weiesky/fix/file-tree-row-shrink | [b500ebf76c](./cc-viewer-alignment-commit-ledger.md#commit-b500ebf76c), [d906edb3de](./cc-viewer-alignment-commit-ledger.md#commit-d906edb3de) |
| [3c77d9a8ed](./cc-viewer-alignment-commit-ledger.md#commit-3c77d9a8ed) | Merge pull request #156 from weiesky/feat/slash-skill-menu-sdk-fixes | [3cf3e9585f](./cc-viewer-alignment-commit-ledger.md#commit-3cf3e9585f), [9dbf4e295a](./cc-viewer-alignment-commit-ledger.md#commit-9dbf4e295a), [a2be00c45b](./cc-viewer-alignment-commit-ledger.md#commit-a2be00c45b), [51c23e9090](./cc-viewer-alignment-commit-ledger.md#commit-51c23e9090), [67ceb5b7f0](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) |
| [0e1546e718](./cc-viewer-alignment-commit-ledger.md#commit-0e1546e718) | merge: isolate resume route PTY fixtures | [6bc7781bba](./cc-viewer-alignment-commit-ledger.md#commit-6bc7781bba) |
| [f2ebb0fe6b](./cc-viewer-alignment-commit-ledger.md#commit-f2ebb0fe6b) | Merge pull request #161 from weiesky/fix/kimi-k3-model-aliases | [0e1546e718](./cc-viewer-alignment-commit-ledger.md#commit-0e1546e718), [6bc7781bba](./cc-viewer-alignment-commit-ledger.md#commit-6bc7781bba), [6363a51ec0](./cc-viewer-alignment-commit-ledger.md#commit-6363a51ec0) |
| [2cd4488ce9](./cc-viewer-alignment-commit-ledger.md#commit-2cd4488ce9) | Merge pull request #162 from weiesky/fix/file-browser-view-scope | [a99506d5f5](./cc-viewer-alignment-commit-ledger.md#commit-a99506d5f5), [1aca9b5f8f](./cc-viewer-alignment-commit-ledger.md#commit-1aca9b5f8f), [91b0055f2d](./cc-viewer-alignment-commit-ledger.md#commit-91b0055f2d), [5ee6739cba](./cc-viewer-alignment-commit-ledger.md#commit-5ee6739cba), [0c7195b689](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689), [9c36b5b5a7](./cc-viewer-alignment-commit-ledger.md#commit-9c36b5b5a7), [d89aa3b9af](./cc-viewer-alignment-commit-ledger.md#commit-d89aa3b9af), [ab1b89ee13](./cc-viewer-alignment-commit-ledger.md#commit-ab1b89ee13) |
| [67226f50c1](./cc-viewer-alignment-commit-ledger.md#commit-67226f50c1) | Merge pull request #163 from weiesky/fix/file-browser-view-scope | [aaa3a59444](./cc-viewer-alignment-commit-ledger.md#commit-aaa3a59444), [134a0de7ac](./cc-viewer-alignment-commit-ledger.md#commit-134a0de7ac), [5e50112388](./cc-viewer-alignment-commit-ledger.md#commit-5e50112388), [15751cf49c](./cc-viewer-alignment-commit-ledger.md#commit-15751cf49c), [1e0edc00f3](./cc-viewer-alignment-commit-ledger.md#commit-1e0edc00f3), [566ade13fc](./cc-viewer-alignment-commit-ledger.md#commit-566ade13fc) |
| [1d4ea6e192](./cc-viewer-alignment-commit-ledger.md#commit-1d4ea6e192) | Merge pull request #165 from weiesky/fix/tool-file-monitor-incremental | [0cbb545288](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) |
| [14d85f8ce6](./cc-viewer-alignment-commit-ledger.md#commit-14d85f8ce6) | Merge pull request #166 from weiesky/release/slow-hud-cr-fixes | [b01ff6f502](./cc-viewer-alignment-commit-ledger.md#commit-b01ff6f502), [2ea5181df8](./cc-viewer-alignment-commit-ledger.md#commit-2ea5181df8), [d90ac9587d](./cc-viewer-alignment-commit-ledger.md#commit-d90ac9587d), [92ed9bc751](./cc-viewer-alignment-commit-ledger.md#commit-92ed9bc751), [791a5e18f8](./cc-viewer-alignment-commit-ledger.md#commit-791a5e18f8), [0cde7d1df8](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8), [6b340326c6](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6), [99256ac1d8](./cc-viewer-alignment-commit-ledger.md#commit-99256ac1d8) |
| [a09bc713ea](./cc-viewer-alignment-commit-ledger.md#commit-a09bc713ea) | Merge pull request #167 from weiesky/chore/release-1.9.20 | [fd84486429](./cc-viewer-alignment-commit-ledger.md#commit-fd84486429) |
| [9e24827264](./cc-viewer-alignment-commit-ledger.md#commit-9e24827264) | Merge pull request #170 from weiesky/feat/file-preview-foundation | [f3db3ed9a2](./cc-viewer-alignment-commit-ledger.md#commit-f3db3ed9a2), [62012025cb](./cc-viewer-alignment-commit-ledger.md#commit-62012025cb), [f96811cddb](./cc-viewer-alignment-commit-ledger.md#commit-f96811cddb), [91a523d043](./cc-viewer-alignment-commit-ledger.md#commit-91a523d043), [beaa2e86f2](./cc-viewer-alignment-commit-ledger.md#commit-beaa2e86f2), [ea995f3883](./cc-viewer-alignment-commit-ledger.md#commit-ea995f3883), [a6b82f16df](./cc-viewer-alignment-commit-ledger.md#commit-a6b82f16df), [96f3a7a44e](./cc-viewer-alignment-commit-ledger.md#commit-96f3a7a44e), [d6ec38be82](./cc-viewer-alignment-commit-ledger.md#commit-d6ec38be82), [6081b5d01a](./cc-viewer-alignment-commit-ledger.md#commit-6081b5d01a) |
| [5a7904990b](./cc-viewer-alignment-commit-ledger.md#commit-5a7904990b) | Merge pull request #171 from weiesky/feat/guided-npm-updates | [17ba9be7b5](./cc-viewer-alignment-commit-ledger.md#commit-17ba9be7b5), [6e3c93cd7c](./cc-viewer-alignment-commit-ledger.md#commit-6e3c93cd7c) |
| [84373dff25](./cc-viewer-alignment-commit-ledger.md#commit-84373dff25) | Merge pull request #172 from weiesky/chore/release-1.9.25 | [c30ca279bd](./cc-viewer-alignment-commit-ledger.md#commit-c30ca279bd) |
| [0ff3154822](./cc-viewer-alignment-commit-ledger.md#commit-0ff3154822) | Merge pull request #173 from weiesky/release/1.9.26 | [23e4273a37](./cc-viewer-alignment-commit-ledger.md#commit-23e4273a37), [187583787d](./cc-viewer-alignment-commit-ledger.md#commit-187583787d), [ec14cd0234](./cc-viewer-alignment-commit-ledger.md#commit-ec14cd0234), [18bd742bc5](./cc-viewer-alignment-commit-ledger.md#commit-18bd742bc5), [20313b254c](./cc-viewer-alignment-commit-ledger.md#commit-20313b254c), [919fded845](./cc-viewer-alignment-commit-ledger.md#commit-919fded845) |
| [24c4f60b54](./cc-viewer-alignment-commit-ledger.md#commit-24c4f60b54) | Merge pull request #174 from weiesky/feat/git-changes-drag-drop | [a2f5cd4b43](./cc-viewer-alignment-commit-ledger.md#commit-a2f5cd4b43), [dd8709356b](./cc-viewer-alignment-commit-ledger.md#commit-dd8709356b) |
| [8bba70ec69](./cc-viewer-alignment-commit-ledger.md#commit-8bba70ec69) | Merge pull request #175 from weiesky/feat/active-agents-card | [975313773a](./cc-viewer-alignment-commit-ledger.md#commit-975313773a), [5fc4c75229](./cc-viewer-alignment-commit-ledger.md#commit-5fc4c75229), [add350bc52](./cc-viewer-alignment-commit-ledger.md#commit-add350bc52), [bde0244333](./cc-viewer-alignment-commit-ledger.md#commit-bde0244333) |
| [ac56c9c6d5](./cc-viewer-alignment-commit-ledger.md#commit-ac56c9c6d5) | Merge pull request #176 from weiesky/feat/sdk-composer-prompt-nav | [8f1d345309](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309), [478268a4db](./cc-viewer-alignment-commit-ledger.md#commit-478268a4db), [1b3c2268e3](./cc-viewer-alignment-commit-ledger.md#commit-1b3c2268e3), [2e09d30192](./cc-viewer-alignment-commit-ledger.md#commit-2e09d30192) |

## 相同补丁指纹

stable patch-id 忽略提交元数据，不能证明依赖、上下文或行为等价；重组目录后同一功能也可能得到不同指纹。

- [3cba408188](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188) / [565613bbea](./cc-viewer-alignment-commit-ledger.md#commit-565613bbea)
- [811b049485](./cc-viewer-alignment-commit-ledger.md#commit-811b049485) / [3e7f047290](./cc-viewer-alignment-commit-ledger.md#commit-3e7f047290)
- [19f563d300](./cc-viewer-alignment-commit-ledger.md#commit-19f563d300) / [68fd263aac](./cc-viewer-alignment-commit-ledger.md#commit-68fd263aac)
- [384dee8025](./cc-viewer-alignment-commit-ledger.md#commit-384dee8025) / [964ce756b6](./cc-viewer-alignment-commit-ledger.md#commit-964ce756b6)
- [d663452c29](./cc-viewer-alignment-commit-ledger.md#commit-d663452c29) / [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68)
- [3c78188314](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314) / [739f49a6de](./cc-viewer-alignment-commit-ledger.md#commit-739f49a6de)
- [9adf4ef539](./cc-viewer-alignment-commit-ledger.md#commit-9adf4ef539) / [b1fe5c09a6](./cc-viewer-alignment-commit-ledger.md#commit-b1fe5c09a6)

## 已发现的回退与后续版本

- [08267350](./cc-viewer-alignment-commit-ledger.md#commit-082673509e) 回退整个 [08809f6e](./cc-viewer-alignment-commit-ledger.md#commit-08809f6e69) 混合提交，涉及增量扫描和多个其他主题；后续 [0cbb5452](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) 只重新引入其中增量扫描方向。其余主题由其他提交恢复，详见下文。

## 工作基线

- cx-viewer 基线 `753fd6c632b5bac8577dfe98f28d666ff3437d28`；固定 SDK 0.142.5；本机 CLI 0.169.0；Node 24.14.0。
- 已在 `/tmp/cxv-b0-baseline` 从 `git archive` 构造代码快照；为执行测试借用现有 `node_modules`，因此测试不是全新依赖安装。使用临时 `CODEX_HOME`、移除 `CXV_BYPASS_PERMISSIONS` 后运行 `npm test`：991/991 通过（macOS Darwin arm64）。未验证其他平台。
- 在同一隔离快照中，`npm run build` 和 `npm run pack:dry-run` 均通过；打包预览验证了 1000 个文件。构建有大 chunk 提示，不能视作已完成 Electron 实际打包或全局安装验收。
- 使用隔离 `CODEX_HOME` 启动真实 Codex 0.169.0 的 `app-server`，JSON-RPC `initialize` 和空目录 `thread/list` 成功；仓库的 request-user-input schema 检测返回 `item/tool/requestUserInput`。这只是基础协议和 schema 探测，没有调用模型，也未覆盖完整对话、审批或恢复流程。
- [逐提交文件与测试证据](./B0-commit-file-evidence.md) 比较了 2,006 个路径候选在两个最终快照中的 Git blob，只有 1 个提交涉及的候选文件出现完全相同的 blob。该统计仅用于定位，路径匹配可能遗漏等价实现；不能据此认定所有其余功能都缺失。
- 尚未完成全部 337 条功能 diff 的逐项阅读，也未完成真实 CLI 端到端联测。血缘核验不代表功能已具备或无需适配。

<a id="b0-x-triage"></a>
## 原 X 类 15 条人工分流

依据上游提交标题、改动路径及部分 diff 分流；除特别说明，是否适用及本地是否已有仍待逐项核验。分流不代表功能已完成。

| 提交 | 工作包 | 初步依据 |
| --- | --- | --- |
| [ccf74880a5](./cc-viewer-alignment-commit-ledger.md#commit-ccf74880a5) | B5/B11 | Git 冲突状态颜色；本地 `src/components/git/GitChanges.jsx` 有颜色表，需核验冲突状态和移动端。 |
| [0c7195b689](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689) | B3/B5 | 上游把 `git commit` 加入 mutating command 以刷新 Git；本地 `src/utils/commandValidator.js` 正则不包含 commit，需核验事件链并适配。 |
| [9967ebdbc2](./cc-viewer-alignment-commit-ledger.md#commit-9967ebdbc2) | B7 | 多语言快速提示菜单名称；对照 Codex 文案。 |
| [2dbe5cd695](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) | B1/B7 | 菜单固定状态迁移到 preferences；核对并发写与跨端体验。 |
| [c93c3110ed](./cc-viewer-alignment-commit-ledger.md#commit-c93c3110ed) | B11 | README 变更；检查是否适用 Codex 文档。 |
| [5b544c6ee1](./cc-viewer-alignment-commit-ledger.md#commit-5b544c6ee1) | B11 | 发布 workflow latest 标签；对照本地发布流程。 |
| [2049aef95e](./cc-viewer-alignment-commit-ledger.md#commit-2049aef95e) | B11 | npm patch 发布通道；检查本地发布约束。 |
| [637fbb0218](./cc-viewer-alignment-commit-ledger.md#commit-637fbb0218) | B5/B11 | 文件图标主题样式；核验本地主题。 |
| [bacfe559fe](./cc-viewer-alignment-commit-ledger.md#commit-bacfe559fe) | B11 | npm 12 pack 输出兼容；核验本地脚本及 npm 支持版本。 |
| [ea8c5e39e0](./cc-viewer-alignment-commit-ledger.md#commit-ea8c5e39e0) | B11 | Claude CLI 测试隔离；核验 Codex 对应路径。 |
| [0c12335e53](./cc-viewer-alignment-commit-ledger.md#commit-0c12335e53) | B11 | 上游发布版本号；保留历史，不自动搬运。 |
| [d88982c6ce](./cc-viewer-alignment-commit-ledger.md#commit-d88982c6ce) | B11 | CodeFuse 受管进程随 Claude 退出；核对本地宿主支持。 |
| [c768e8beb3](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) | B11 | 测试服务关闭后清理临时目录；本地全量测试此前曾出现目录清理失败，需单独复现。 |
| [87432d4c5a](./cc-viewer-alignment-commit-ledger.md#commit-87432d4c5a) | B3 | v1/v2 迁移完成后不再重复提示；先确认本地迁移机制是否同构。 |
| [1db2a38eab](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab) | B8 | cc-switch SQLite 恢复重试；确认 Codex 导入链路及实现。 |

<a id="b0-code-findings"></a>
## 优先差异的代码级核验

下列是已读上游具体代码与本地实现的结果；与 B0 全量功能审查不同，尚不能推论其他提交的状态。各项结论已回填原台账。

| 上游提交 | 结论与本地证据 | 后续处理 |
| --- | --- | --- |
| [30790404](./cc-viewer-alignment-commit-ledger.md#commit-3079040494) | 上游使用按 cwd 键控的 `_sessions` Map；本地 `lib/sdk-manager.js:31` 及 `:107` 为模块级单一 `_codex`、`_thread`、`_cwd` 和队列。仅静态对照，尚未复现跨工作区串扰。 | B2 需适配：用真实 Codex SDK 测试多 cwd/实例并设计隔离，不直接复制 Claude SDK 管理器。 |
| [d663452c](./cc-viewer-alignment-commit-ledger.md#commit-d663452c29) | 上游集中配置写入；本地 `lib/preferences.js:32`、`:48` 已有临时文件原子替换与锁，`workspace-registry.js:17` 也有独立锁，`server.js:715` 另有 profile 锁。不是“本地完全没有原子写”。 | B1 需适配：审计所有写者的锁一致性、错误处理与迁移；保留现有能力，按并发测试决定重构。 |
| [811b0494](./cc-viewer-alignment-commit-ledger.md#commit-811b049485) | 上游使用凭证加密和迁移；本地 `lib/auth.js:38` 对密码使用可逆 Base64，不能视为加密。其他凭证的完整存储和威胁模型仍待核查。 | B1 需适配：设计本项目凭证保护、备份/回滚和旧进程兼容；不能机械复制上游 key 管理。 |
| [0cbb5452](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) | 上游使用 WeakMap 游标和持久 tool-use 映射增量扫描；本地 `src/components/chat/controllers/toolFileChangeController.js:140` 每次创建 Map 并遍历会话与请求。性能差异是否构成瓶颈尚未量化。 | B3 待基准测试；如有实际退化，结合后续 [c29af25e](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) 的映射裁剪一起适配。 |
| [0c7195b6](./cc-viewer-alignment-commit-ledger.md#commit-0c7195b689) | 上游将 `git commit` 识别为 mutating command；本地 `src/utils/commandValidator.js:37` 不包含该子命令，实际执行 `isMutatingCommand("git commit -m test")` 返回 false。 | B3/B5 需适配：验证具体工具输入与 Git 刷新事件，并补回归测试。 |
| [ccf74880](./cc-viewer-alignment-commit-ledger.md#commit-ccf74880a5) | 上游为 UU/AA/DD/AU/UA/DU/UD 增加红色；本地 `src/components/git/GitChanges.jsx:13` 无这些键，`server.js:3748` 保留两字符 status。移动端单独核验。 | B5/B11 需适配：补桌面及移动展示和测试。 |

### 重要更正：回退不是只涉及一个性能补丁

[08809f6e](./cc-viewer-alignment-commit-ledger.md#commit-08809f6e69) 的标题只提增量扫描，但其合并提交实际还包含 SDK 首轮、Agent Loop、历史恢复、审批等多项改动；[08267350](./cc-viewer-alignment-commit-ledger.md#commit-082673509e) 回退了整个混合提交。后续 [7641f518](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a)、[ef5fc8b1](./cc-viewer-alignment-commit-ledger.md#commit-ef5fc8b168)、[bd32d028](./cc-viewer-alignment-commit-ledger.md#commit-bd32d02884)、[0cbb5452](./cc-viewer-alignment-commit-ledger.md#commit-0cbb545288) 分别恢复不同主题，仍须逐文件对照；不能把 08809f6e 整体简单等同于 0cbb5452。

### 实时、任务与扩展链路的进一步核验

| 上游提交 | 本地证据 | 初步处理与范围 |
| --- | --- | --- |
| [5c28d4c5](./cc-viewer-alignment-commit-ledger.md#commit-5c28d4c50a) | 上游提交说明引入每 workspace 的独立 SSE 管道和状态；本地 `src/AppBase.jsx:1324` 通过 EventSource 订阅 log-v2 live，`:1504` 订阅控制流。 | B2/B3 需对照 scope 和并发行为；已有 EventSource 不能证明上游多 workspace 隔离已经具备。 |
| [db2ada08](./cc-viewer-alignment-commit-ledger.md#commit-db2ada0866) | 上游引入会话数据的 WS 多路复用及 SSE 回退；本地有 terminal WebSocket 和 log-v2 EventSource，不能把 terminal WS 等同于对话 mux。 | B3 先测现有连接上限、背压和丢失恢复，再决定是否引入 mux，不直接移植。 |
| [0cde7d1d](./cc-viewer-alignment-commit-ledger.md#commit-0cde7d1df8) | 上游将 Claude SDK `sdk-task` 事件接入 task HUD；本地仓库搜索未发现同名 HUD/tracker；`lib/appserver-bridge.js` 有 Codex turn 和 tool 事件。 | B4 以 Codex 可观测数据为准设计 HUD；不应把 Claude `task_*` 当成 Codex 协议。 |
| [6b340326](./cc-viewer-alignment-commit-ledger.md#commit-6b340326c6) | 上游实现首字节等待提示；本地未发现同名 slow-upstream 事件；已有 proxy 错误与流式状态处理。 | B4 需核对真实请求生命周期后按 scope 补充提示与取消/断线清理。 |
| [177b85df](./cc-viewer-alignment-commit-ledger.md#commit-177b85df2c) | 上游新增定时调度、执行和历史；搜索本地未发现同名产品调度器。现有工具、超时与流的 `schedule` 函数不能算定时任务。 | B9 初步缺口；实施前定义离线、时区、重复执行与权限。 |
| [58493d1c](./cc-viewer-alignment-commit-ledger.md#commit-58493d1c85) | 上游目录型插件运行子服务并提供代理和面板；本地 `lib/plugin-loader.js` 扫描 JS 文件，`server.js:1219` 有 hook 注册路由。 | B10 需按服务生命周期、隔离和授权逐项评估；本地已有 hook/路由，不能称完全无插件能力。 |
| [91a523d0](./cc-viewer-alignment-commit-ledger.md#commit-91a523d043) | 上游为文件入口增加有界归档预览；本地存在 log-v2 ZIP 归档，但它是日志导入导出，不能作为一般文件 ZIP/TAR 预览的证据。 | B6 初步缺口；先核对现有 FileContentView，再测试穿越、尺寸和内存限制。 |

## B0 元数据与合并决议

- 17 条 star-history 提交经相对父提交路径核验仅修改上游图片，标记不适用。
- 50 条仅修改上游版本、包清单、变更集或历史说明的发布提交明确归属 B11；不直接移植版本号，清单或变更集可能对应的功能和依赖仍须单独核验。
- 32 条合并提交已记录父分支和窗口内分支提交；是否含冲突解决或额外改动仍须人工复查。


## 合并树核验

对 32 条双父合并执行 `git merge-tree --write-tree`，再比较结果树与实际提交树。自动合并与结果一致不代表功能已对齐；存在冲突的提交须人工审查实际解决。

- [0e1546e718](./cc-viewer-alignment-commit-ledger.md#commit-0e1546e718)：自动合并存在冲突或错误；差异路径：`history.md`。
- [df5c2fe807](./cc-viewer-alignment-commit-ledger.md#commit-df5c2fe807)：自动合并存在冲突或错误；差异路径：`history.md`。
- [6ebeea8439](./cc-viewer-alignment-commit-ledger.md#commit-6ebeea8439)：自动合并存在冲突或错误；差异路径：`history.md`。
- [9f4e329be4](./cc-viewer-alignment-commit-ledger.md#commit-9f4e329be4)：自动合并存在冲突或错误；差异路径：`package.json`。
- [b2d57c8d38](./cc-viewer-alignment-commit-ledger.md#commit-b2d57c8d38)：自动合并存在冲突或错误；差异路径：`history.md`。

- 自动合并结果与实际树一致：27 条；其余 5 条列于上方。
- 对这 5 条进一步检查 `git show --cc`：4 条的冲突解决仅涉及 `history.md`；`9f4e329be4` 的 `package.json` 冲突解决涉及上游版本号及 description 的字符编码表示。未发现这 5 条引入额外产品代码的冲突解决；其父分支上的功能和依赖变化仍须分别核验。

<a id="b0-dependency-audit"></a>
### 依赖安全提交的定向核验

- [5c468c04](./cc-viewer-alignment-commit-ledger.md#commit-5c468c042e)：上游将 `fast-uri` 从 3.1.2 升至 4.1.2 以处理 CVE-2026-13676。本地 `package-lock.json` 与已安装依赖均为 3.1.3，处于该漏洞的 [官方修复版本](https://github.com/advisories/GHSA-4c8g-83qw-93j6)；因此不需要仅为复现该上游提交而升到 4.x。**此结论只针对该 CVE**，不代表其他漏洞已排除，也不代表未锁定安装一定获得同一版本。
- [9255663e](./cc-viewer-alignment-commit-ledger.md#commit-9255663e33)：上游将 `adm-zip` 更新至 0.6.0 以处理 CVE-2026-39244；本地 lockfile 和当前 `npm ls adm-zip --all` 均未发现 `adm-zip`。该特定依赖变更目前不适用；cx 的 `jszip` 和将来新增的归档预览仍须独立审核，不可由此推论无归档风险。[官方漏洞说明](https://github.com/advisories/GHSA-xcpc-8h2w-3j85)。

### SDK 用量、技能与文件预览入口核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [04d05a58](./cc-viewer-alignment-commit-ledger.md#commit-04d05a5824) | 上游提供 SDK 专用上下文用量控制请求、快照与面板，并增加队列上限。本地 `lib/appserver-bridge.js:2054` 处理 Codex `thread/tokenUsage/updated`，但 SDK 专用面板及队列上限是否等价未证明；B4 先验证 SDK 实际输出与 UI。 |
| [133bc219](./cc-viewer-alignment-commit-ledger.md#commit-133bc219df) | 上游读取 Claude SDK MCP 状态；本地当前检查未发现同名 SDK 控制接口；需调查 Codex App Server 原生 MCP 状态方法，不能直接移植 Claude API。归 B4。 |
| [67ceb5b7](./cc-viewer-alignment-commit-ledger.md#commit-67ceb5b7f0) | 上游在输入框提供技能选择菜单。本地已有 `server.js:1977` 的 `/api/skills`，`src/utils/slashCommandLabels.js` 则负责消息标签，两者不等于输入框技能菜单。B7 先验收各模式的数据源。 |
| [20313b25](./cc-viewer-alignment-commit-ledger.md#commit-20313b254c) | 上游音频流支持 HTTP Range；本地 `server.js:3430` 的 `/api/file-raw` 将内容读入内存并设置 10 MiB 上限，所查路径没有 Range 分支。B6 需先核对其他入口与平台，再设计有界流、MIME 和中断。 |
| [2e09d301](./cc-viewer-alignment-commit-ledger.md#commit-2e09d30192) | 上游选中回复生成引用 chip；本地 `src/components/chat/ChatView.jsx:2956` 可插入文件路径，但不是选中文本引用功能。B6 需区分普通对话和 slash 输入语义。 |
| [8f1d3453](./cc-viewer-alignment-commit-ledger.md#commit-8f1d345309) | 上游将 SDK 的 prompt 导航移入 composer；本地 `ChatView.jsx:3073` 已有 prompt 导航，本项需验证入口布局和 SDK/PTy 模式差异，不能标记整个导航缺失。归 B7。 |

### 配置后续修复与交互核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [3c781883](./cc-viewer-alignment-commit-ledger.md#commit-3c78188314) | 上游 vault/JSON store 审查修复涉及损坏配置保护、重入锁、不可读密码拒写、凭证备份保护；本地目前没有同名 vault，但 `lib/preferences.js` 已有锁。B1 设计迁移时逐项保留这些失败语义，不能因为不移植 vault 就丢失修复。 |
| [3cba4081](./cc-viewer-alignment-commit-ledger.md#commit-3cba408188) | 上游再次修正 credential root 随日志目录切换带来的 fail-open，冻结凭证根并限制更改日志目录。B1 特别验证认证配置/密钥迁移失败时拒绝访问，审查当前 logDir 切换。 |
| [36df32b7](./cc-viewer-alignment-commit-ledger.md#commit-36df32b7e1) | 上游允许通过凭证认证的远程管理员访问管理端点，同时避免无密码访问获得管理权限。本地 `lib/auth-routes.js:75` 输出 `isAdmin: isLocal`；仍需端到端验证各管理端点，不能仅据此判断所有远程操作不可用。归 B11，权限策略需单独设计。 |
| [2dbe5cd6](./cc-viewer-alignment-commit-ledger.md#commit-2dbe5cd695) | 上游将固定菜单持久化到服务器 preferences；本地 `src/components/dashboard/AppHeader.jsx:127` 注释和初始化使用 localStorage。B1/B7 需评估跨设备同步、旧数据迁移与并发写。 |
| [3d4f098f](./cc-viewer-alignment-commit-ledger.md#commit-3d4f098f08) | 上游为问答 Other 输入增加 autocomplete/password-manager 排除属性；本地 `src/components/chat/AskQuestionForm.jsx:219` 对应输入没有这些属性。B11 需验证浏览器和密码管理器行为后补充。 |

### Git 视图与专家预设核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [d8582043](./cc-viewer-alignment-commit-ledger.md#commit-d858204313) | 上游对没有 upstream 的分支使用 `git log HEAD --not --remotes` 显示本地提交；本地 `lib/git-diff.js:79` 明确对无 upstream 或 detached HEAD 返回空列表。B5 需适配并验证纯本地仓库、已删除远端、detached HEAD 及安全边界。 |
| [2e17699f](./cc-viewer-alignment-commit-ledger.md#commit-2e17699fd7) | 上游给未推送提交行增加 +/- 行统计；本地 `src/components/git/GitChanges.jsx:153` 显示 `commit.files.length`，已有部分 diff numstat 功能但不能直接等价。B5 按 commit 级统计核对并补充。 |
| [f28d9cae](./cc-viewer-alignment-commit-ledger.md#commit-f28d9cae37) | 上游增加面向测试分析和 Midscene YAML 的独立预设；本地 `ultraAgents/manifest.json` 目前只有代码和调研专家。B7 需决定需求并适配 Codex 实际工具；不能复制 Claude 专属工具或错误的审批要求。 |
| [1af3d646](./cc-viewer-alignment-commit-ledger.md#commit-1af3d646c9) | 上游重写上述预设的 Plan 与 Midscene 规则，是 f28d9cae 后续改动；B7 应评估最终实现和依赖，而非只按首次添加的提交实现。 |

### 搜索、工具图片与异常会话核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [bd506362](./cc-viewer-alignment-commit-ledger.md#commit-bd50636219) | 上游将 Node 搜索回退放到 worker 并虚拟化结果。本地 `lib/code-search.js` 已支持 rg 子进程及 Node 回退，`server.js:611` 直接调用 `searchCode`；搜索面板中未发现 Virtuoso。B5 需测无 rg 大仓库对事件循环的影响及结果列表性能，保留已有安全限制。 |
| [fc68e850](./cc-viewer-alignment-commit-ledger.md#commit-fc68e850f2) | 上游适配 Claude transcript 中的工具图片。本地已有 Codex 图片处理链与 `tests/appserver-bridge.test.js` 中结构化图片测试。应保留 Codex 支持，B4/B6 逐项比较尺寸限制、协议和 UI；不能直接移植 Claude JSONL 解析器。 |
| [e4fc788b](./cc-viewer-alignment-commit-ledger.md#commit-e4fc788b9e) | 上游在冷读取时修复异常退出后的未完成请求及部分历史恢复；本地存在不同的 log-v2 materializer 与 writer。B3 必须用模拟进程崩溃/损坏日志验证当前恢复语义，不能因名称相同就断定故障或已修复。 |

### 发布工具链核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [bacfe559](./cc-viewer-alignment-commit-ledger.md#commit-bacfe559fe) | 上游解析 npm ≤11 数组和 npm 12 对象等格式；本地 `scripts/npm-pack-dry-run.mjs:33` 只读取 `report[0].files`。隔离基线 npm 11.9.0 的预览已通过；npm 12 格式及本项目使用范围尚未真实验证。B11 增加格式 fixture 和声明支持范围，不因静态差异认定现有 npm 11 失效。 |
| [f20efc13](./cc-viewer-alignment-commit-ledger.md#commit-f20efc1371) | 上游锁定 electron-builder 并验证 macOS 临时 keychain 密码；本地 `package.json` 声明 `^26.0.12`，且有独立 `scripts/mac-sign.sh`。B11 需对照本仓库签名方案、实际 builder 版本及 macOS 签名环境，不能直接移植 pnpm workflow。 |

### 对话队列、SDK 故障和长会话核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [dafe2bce](./cc-viewer-alignment-commit-ledger.md#commit-dafe2bce37) | 上游实现权威队列快照、可删除气泡、立即发送及中断恢复；本地 `lib/sdk-manager.js:170` 在 busy 时维护字符串队列，并不自动等同于上述可见交互。B2/B7 先测恢复、取消、队列上限和多工作区隔离。 |
| [9b1bb4e7](./cc-viewer-alignment-commit-ledger.md#commit-9b1bb4e729) | 上游持久展示 SDK 失败行并按 workspace 归属；本地 `_emitErrorEntry` 在 `lib/sdk-manager.js:377` 已写错误条目。B4 需比较重复错误、会话切换、恢复与 UI，而不是重复实现错误输出。 |
| [51c23e90](./cc-viewer-alignment-commit-ledger.md#commit-51c23e9090) | 上游修复 Claude SDK plan 审批与 PTY sink 混用；本地 SDK 0.142.5 在 `lib/sdk-manager.js:126` 禁用其无法处理的 request_user_input，另有 Codex App Server 桥接。B4/B11 应测试 Codex 各路径，不能直接假定是相同死锁。 |
| [18758378](./cc-viewer-alignment-commit-ledger.md#commit-187583787d) | 上游新增解除 npm publish 硬闸的完全免审批档；本地有 Codex 原生审批策略及发布保护。B11 将此记为独立产品/权限决策，不能默认放宽。 |
| [b23c1373](./cc-viewer-alignment-commit-ledger.md#commit-b23c137372) | 上游按用户 prompt 边界分片会话并按需加载；本地 `lib/appserver-bridge.js` 的 raw sidecar 分段是协议帧保留策略，不等于用户会话分片。B3 先比较 log-v2 分页、增长和回放，再建立压力基准。 |
| [bde02443](./cc-viewer-alignment-commit-ledger.md#commit-bde0244333) | 上游修复 WS mux 冷加载背压；本地目前的对话流为 EventSource 和 log-v2 路径，且 watcher 有订阅队列上限。B3 只有在选用等价 mux 时直接考虑该补丁，同时验证现有传输的背压/重连。 |

### 工作区隔离相关补丁核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [a84385b5](./cc-viewer-alignment-commit-ledger.md#commit-a84385b5a8) | 上游引入 SDK `instanceKey` 并拒绝同名实例歧义；本地 `lib/sdk-manager.js` 为进程级单会话状态，`lib/log-v2/project-id.js` 已有基于 cwd 的项目 ID，但这不能证明会话/WS 以实例隔离。B2 需验证同名不同目录、同 cwd 多实例、迟到消息和关闭时归属。 |
| [2be5bb23](./cc-viewer-alignment-commit-ledger.md#commit-2be5bb23f6) | 上游按工作区组织 scratch tab 并在关闭工作区时回收；本地 `scratch-pty-manager.js:13` 有按 scratch ID 的 Map 和超时回收，公开操作按 ID 而非 cwd 批量关闭。B2/B11 需验证 UI/PTY 归属和存活清理，避免破坏已有多 tab。 |

### 首轮、重放与生命周期后续修复

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [7641f518](./cc-viewer-alignment-commit-ledger.md#commit-7641f5181a) | 上游修复 Claude SDK lost-result 跨回合误配和冷加载期间 live delta 丢失；本地 `lib/sdk-manager.js:220` 以 `runStreamed` 消费回合，`lib/log-v2/timeline-watcher.js:79` 用 cursor/ring 校验重放，机制不同。B3/B4 需模拟迟到结果、冷加载并发提交、overflow 和续接，不能按同名 watchdog 直接复制。 |
| [bd32d028](./cc-viewer-alignment-commit-ledger.md#commit-bd32d02884) | 上游修复恢复历史后 attach 种子吞掉新消息；本地有 cursor 与 reader worker 路径而非相同种子逻辑。B3 需构造快照到订阅之间提交、resume 后新消息及双端断线场景，核验是否等价。 |
| [ef5fc8b1](./cc-viewer-alignment-commit-ledger.md#commit-ef5fc8b168) | 上游新增带 turn ID 的 agent-loop 权威信号、语音和插件 hook；本地 `lib/appserver-bridge.js:1990` 已解析 turn started/completed，`src/AppBase.jsx:1676` 亦监听 turn_end。B4 需确认跨协议语义、迟到事件与插件/语音覆盖，不能把存在 turn 事件视为整项已完成。 |
| [c29af25e](./cc-viewer-alignment-commit-ledger.md#commit-c29af25e64) | 上游混合修复文件树路径、一次扫描、工具 Map 淘汰及审批状态；本地 tool change controller 仍使用每次重建 Map 的不同实现，相关文件/审批代码也各有实现。B3/B4/B5 分别审查，不可仅处理标题中的单项。 |

### 文件浏览功能逐项对照

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [865604d6](./cc-viewer-alignment-commit-ledger.md#commit-865604d68e) | 上游提供远程文件浏览 modal、面包屑、缩略图和复用菜单；本地 `src/components/files/FileExplorer.jsx` 已提供侧栏和文件菜单，`src/components/files/` 中未见同名 modal。B5 应区分已有侧栏和待验证的远程 modal 体验。 |
| [365af800](./cc-viewer-alignment-commit-ledger.md#commit-365af800e5) | 上游为 modal 增加上传和项目内拖动；本地侧栏已有 `/api/import-file` 和 `/api/move-file` 调用（`FileExplorer.jsx:315,771`），无需重写基础能力。B5 需补验项目根目录目标、modal 交互及反馈。 |
| [ba3eee8f](./cc-viewer-alignment-commit-ledger.md#commit-ba3eee8fd5) | 上游增加远程文件下载 API；本地已提供 `/api/file-raw` 有界读取，但未发现同名 `/api/download-file`。B5 应逐类型检查现有下载入口、目录约束和大文件流式能力，不能仅按 API 名称断定完全缺失。 |

### 输入和对话渲染核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [ff0fe1ba](./cc-viewer-alignment-commit-ledger.md#commit-ff0fe1ba93) | 上游仅在真实会话身份变化时清理待发送图片；本地 `ChatView.jsx:905–930` 虽检查会话对象变化以重置缓存，但 `_clearPendingImages()` 在数组引用变化分支中无条件调用。B7 需构造流式更新时粘贴图片、首次挂载及切换场景，验证并修复。 |
| [d90ac958](./cc-viewer-alignment-commit-ledger.md#commit-d90ac9587d) | 上游避免纯空白文本渲染空气泡；本地 `renderAssistantText("   ")` 实测返回空 segments，`ChatMessage.jsx:1205,1305` 渲染 wrapper 前未检查长度。B7 需覆盖主/子 Agent 和空 system-tag，确认表现并修复。 |
| [791a5e18](./cc-viewer-alignment-commit-ledger.md#commit-791a5e18f8) | 上游桌面 composer 限制从 6 行增为 12 行；本地 `ChatInputBar.jsx:24` 仍为 6，CSS `max-height:136px`。B7 需连同桌面、pad、移动尺寸与焦点行为一起评估。 |
| [1bfc1585](./cc-viewer-alignment-commit-ledger.md#commit-1bfc1585e8) | 上游持久化 SDK scratch 面板开关；本地 `TerminalPanel.jsx:60,71,357` 已为 scratch 保存独立 localStorage 状态，但 SDK 布局是否共用同一组件尚未验证。B2/B7 先做模式级验收，避免重复实现。 |
| [c4529a6e](./cc-viewer-alignment-commit-ledger.md#commit-c4529a6ed7) | 上游使 loading 覆盖整个代理回合；本地 ChatView 依据 `isStreaming` 和乐观停止状态渲染，App Server 也接收 turn 事件。B4 需实测工具执行间隙、终止和迟到事件，不能只按字段名称判断是否一致。 |

### 代理、提示词、反代和更新核验

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [3cc05b49](./cc-viewer-alignment-commit-ledger.md#commit-3cc05b496d) | 上游按主 agent、subagent、teammate 分别选择代理配置；本地 interceptor 已识别部分 agent 身份，已有 profile 和 Responses 代理，但当前检查未见同等角色 profile 分配。B8 需从 Codex 实际请求身份验证，不可仅凭元数据标签路由凭据。 |
| [57c732d0](./cc-viewer-alignment-commit-ledger.md#commit-57c732d037) | 上游新增公网 base URL、HTTP/WS 前缀及链接生成；本地 `vite.config.js` 有构建期 `CXV_BASE_PATH`，`src/utils/apiUrl.js` 也有 base path，但未发现同名公网 URL 配置。B10 分别测试动态前缀、WebSocket、登录、QR 与代理，而非重写已有前端 base path。 |
| [085c2151](./cc-viewer-alignment-commit-ledger.md#commit-085c21516f) | 上游将系统提示词与热切模型、会话绑定；本地有 `lib/model-system-prompts.js` 的 workspace/global 匹配及 override/append。B8 需测 Codex fresh/resume/fork、热切和缓存绑定；上游模型家族与 Claude 格式不直接等价。 |
| [fe0c52ff](./cc-viewer-alignment-commit-ledger.md#commit-fe0c52ff60) | 上游内置模型 preset 默认生效并支持禁用墓碑；本地系统提示存储已有用户模型匹配，是否需要内置默认注入及禁用状态尚未确定。B8 应先确认用户预期和现有数据优先级，避免悄然改变系统提示。 |
| [6e3c93cd](./cc-viewer-alignment-commit-ledger.md#commit-6e3c93cd7c) | 上游提供引导 npm 更新与重启；本地已有 `lib/updater.js` 和 update SSE 通知。B10 需比较确认流程、进程重启恢复及 npm/pnpm/Homebrew 安装识别；不得将“已有更新器”等同完整功能。 |

### 冷加载失败与回合中刷新

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [0670581b](./cc-viewer-alignment-commit-ledger.md#commit-0670581b3d) | 2026-11-17 已用当前 AppBase 方法注入处理中途异常：活跃/历史入口均留下 gate 和旧基线索引不一致；活跃入口瞬态故障可经原有重试恢复，历史入口仅清 loading。需适配 B3；详见 [完整复核与探针](./B0-cold-ingest-review.md)。 |
| [d7f355ba](./cc-viewer-alignment-commit-ledger.md#commit-d7f355ba89) | 2026-11-17 临时 canonical V2 日志经实际 snapshot/object/live 路由及 AppBase 方法验证：首轮进行中选择当前会话并能重建，随后完成帧可重放。下一轮冷加载保留回答 messages，但清除 lastSession.response；该子项和 GUI/真实 CLI 保持待核验。详见 [证据](./B0-cold-ingest-review.md)。 |

- [cda9ed32](./cc-viewer-alignment-commit-ledger.md#commit-cda9ed326d) 将前述两个 CVE 修复搬入上游 monorepo 的三个 manifest 与 pnpm override。本地目前是单包，且定向核验结果见上文；**当前无需复制上游目录改动**。如果将来实施 pnpm/拆包，B11 必须重新核对各 workspace 和最终产物依赖，不让该问题回归。此结论仅覆盖两个指定 CVE。

### 从发布基线开始：代理重试统计与传输测试

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [3eb16102](./cc-viewer-alignment-commit-ledger.md#commit-3eb16102e5) | 上游修复 retry 配置 modal 滚动；本地未检索到同名 proxy-stats/retry 设置组件。B8 需先确认是否引入上游重试统计和配置这一整项能力，再覆盖短视口滚动。 |
| [51b3443e](./cc-viewer-alignment-commit-ledger.md#commit-51b3443e57) | 上游恢复统计页自动/手动刷新；本地未发现同名统计页面。B8 如引入该能力应包含 controls 和定时器清理，不应孤立移植此修复。 |
| [935a33cc](./cc-viewer-alignment-commit-ledger.md#commit-935a33cc0a) | 上游修复 retryBurden 中 Infinity 经 JSON 变 null 的契约；本地未发现同名字段。B8 如实现重试统计须定义 JSON 往返安全的开区间并覆盖测试。 |
| [eef9fd87](./cc-viewer-alignment-commit-ledger.md#commit-eef9fd870e) | 上游删除 retry-stats redesign 的失效 props 和图表分支；本地具有通用图表但无同名 retry 页面。B8 对照实际最终 UI 而非照搬历史清理。 |
| [60cb46ce](./cc-viewer-alignment-commit-ledger.md#commit-60cb46ce98) | 仅精简上游 `history.md` 中相关说明；该文本不需直接移植，但 B8 仍要审查被描述的功能。 |
| [42207f7f](./cc-viewer-alignment-commit-ledger.md#commit-42207f7fd1) | 上游替换 Brotli 传输测试的固定 tick 等待；本地有 Brotli 解码，但测试名称和 wire 架构不同。B3 如引入对应压缩/stream 测试应采用完成事件驱动，先确认本地实际测试路径。 |

### 发布基线后首批 Windows、打包与迁移提交

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [6bd3b80e](./cc-viewer-alignment-commit-ledger.md#commit-6bd3b80e58) | 上游修复 Windows `npm.cmd` 与 Electron 启动；本地 `findcx.js:73` 使用 `execSync('npm root -g')`，与上游 `execFileSync('npm.cmd')` 并非相同调用；`pty-manager.js` 有 Win32 分支。B11 须在 Windows 验证发现、入口及 Electron，不可照搬具体 Claude 修复。 |
| [ef64e156](./cc-viewer-alignment-commit-ledger.md#commit-ef64e15621) | 上游调整 Windows 原生 Claude 优先级以避开 ConPTY shim；本地 `findcx.js:159` 原生查找使用 POSIX shell/which 候选，`pty-manager.js:352` 直接消费结果。B11 应核验 Windows Codex 安装路径与 `.cmd`/`.exe` 处理，当前 macOS 不能证明故障。 |
| [96003517](./cc-viewer-alignment-commit-ledger.md#commit-9600351738) | 上游修复 Electron bundle 漏 `src/utils`。本地 `package.json` 的 Electron `build.files` 未列 `src/**/*`，但 `lib/dingtalk-im-bridge.js`、`lib/request-visibility.js` 和 `lib/log-v2/session-summary.js` 导入 `src/utils`。B11 应实际构建/检查 asar 中依赖闭包；此为静态缺口，尚未验证打包后的启动行为。 |
| [20e4a63b](./cc-viewer-alignment-commit-ledger.md#commit-20e4a63b24) | 上游修复查找测试对 npm 全局目录布局的假设；本地需要按 `findcx.js`、本地 checkout 和全局安装分别设计 Codex fixture；不直接搬 Claude 路径测试。归 B11。 |
| [1db2a38e](./cc-viewer-alignment-commit-ledger.md#commit-1db2a38eab) | 上游 cc-switch SQLite 读恢复重试；检索本地未发现同名 cc-switch 集成。B8 应先明确是否需要 Codex provider 导入及协议，再评估重试。 |
| [87432d4c](./cc-viewer-alignment-commit-ledger.md#commit-87432d4c5a) | 上游解决 V1→V2 完成后继续双写导致重复提示；本地发现的是 log-v2 layout migration marker/receipt，尚未证明存在相同状态机。B3 先读取迁移脚本和用户提示路径，分类为待验证。 |

### 按时间线：代理流、日志列表与模型显示

| 上游提交 | 本地证据与处理 |
| --- | --- |
| [25e11817](./cc-viewer-alignment-commit-ledger.md#commit-25e118170c) | 上游修复 retry watchdog 包装 Response 时保留 status/headers；本地 `proxy.js` 使用 fetch 并转发 response headers，但未发现同名 retry watchdog。B8 若新增该功能要验证错误码、SSE headers、取消和 idle timeout，现有转发需用集成测试确认。 |
| [c768e8be](./cc-viewer-alignment-commit-ledger.md#commit-c768e8beb3) | 上游测试在删除临时目录前停止资源；本地先前全量测试曾出现 ENOTEMPTY，单独重跑通过。B11 排查具体 fixture 所有权及退出回收，不能仅凭上游补丁断定同一根因。 |
| [82db2b90](./cc-viewer-alignment-commit-ledger.md#commit-82db2b907c) | 上游为 retry stats 图表调整色彩和语义；本地尚未发现同名 stats 视图，但有通用 BarChart。B8 在评估/实现对应数据后对照明暗主题、可区分性和图例，不直接迁移缺少数据源的样式。 |
| [e932bbef](./cc-viewer-alignment-commit-ledger.md#commit-e932bbef2e) | 上游修复模型热切后的上下文窗口及 Kimi 标识；本地已有模型观察和上下文显示（`proxy.js:182`、`src/utils/helpers.js`），B8 需验证切换后实际模型/显式窗口后缀优先级，避免把 Kimi/Claude 规则硬套 Codex。 |
| [6baff0cd](./cc-viewer-alignment-commit-ledger.md#commit-6baff0cd6f) | 上游会话列表增加缓存、服务端分页与项目切换；本地 `server.js:4024` 已有 `/api/local-logs` 和 log-v2 materializer。B3 需对照分页参数、缓存失效与大目录性能，不能仅凭同名 endpoint 认定完整。 |
| [9c0463bb](./cc-viewer-alignment-commit-ledger.md#commit-9c0463bb8c) | 上游对 Kimi K3/K2.7 preset 加反循环规则；本地有模型 system prompt 存储，B8 先核对用户启用、Codex 模型/工具与指令覆盖语义，默认不把 Claude preset 注入用户会话。 |

### 隔离复现：配置损坏与子进程 stdin

- [96c477d582](./cc-viewer-alignment-commit-ledger.md#commit-96c477d582)：从当前 server.js 提取原始 execWithStdin 到独立 Node 进程，运行立即退出的 Node 子进程并写入 10 MiB stdin。结果出现 uncaughtException: EPIPE，Promise 随后仍输出 resolved；退出码 9 由复现脚本的异常监听器设置。实验验证同一函数的错误处理缺失，但未通过真实 /api/files 请求复现。
- [4c5e633e68](./cc-viewer-alignment-commit-ledger.md#commit-4c5e633e68)：在临时目录写入损坏 JSON，加载当前 lib/preferences.js 的相关函数并调用 updatePreferences，结果文件变为 example: true，原损坏内容被覆盖。实验未接触用户配置；需继续审查业务入口、错误恢复与备份策略。

- [01ff6d85e8](./cc-viewer-alignment-commit-ledger.md#commit-01ff6d85e8)：在隔离目录调用本地 saveDingTalkImConfig，先保存测试密钥与允许名单，再只传 enabled:false；重新读取确认禁用且 appKey、appSecret、allowStaffIds 均保留。验证的是保存函数，完整 API、异常请求和并发场景仍未验证。

### 凭据复核：畸形密码字段与无密码配置

在隔离目录写入有效 JSON：auth.enabled=true、password 为无效 Base64 文本，然后调用当前 lib/auth.js 的 loadAuthConfig 和 decideAuth，结果密码解码为空、远端且无 token 的鉴权决定为 allow。server.js 对 HTTP 每次请求调用 getAuthConfig 并将密码传给 decideAuth；WebSocket 路径另行传入 allowPasswordless:false。随后在隔离服务和临时配置中，以非 loopback 网卡访问 /api/auth/state：畸形密码返回 HTTP 200；将同一配置改为有效密码后返回 403。测试服务随后关闭，目录清理。该结果不代表所有畸形 Base64 都解码为空。当前产品有显式无密码模式，修复必须区分用户有意设置空密码与非空但无法有效解码或损坏的密码。B1 应验证全局和项目覆盖、密码损坏或非字符串、切换 LOG_DIR、TLS、session token 和 WebSocket。

### 工作区注册表：隔离复现
在临时日志目录对当前 workspace-registry.js 调用 registerWorkspace：当 workspaces.json 为损坏 JSON 时，loadWorkspaces 返回空列表，注册后原文件被单条新记录覆盖；当 workspaces.json 是目录、重命名报 EISDIR 时，saveWorkspaces 仅打印错误，registerWorkspace 仍返回包含 id 的对象。两次均未访问用户实际文件。

B1/B2 需在锁内区分缺失与损坏、保留原文件、将持久化失败传播至 API，并覆盖多进程竞争、锁归属、路径权限及旧行为兼容；这些结果不能推断已覆盖全部磁盘错误。

### 2026-11-17：冷加载故障注入与首轮刷新

本轮复核 `0670581b3d`、`d7f355ba89` 的完整 diff、测试和最终快照；[专项记录](./B0-cold-ingest-review.md) 保留实际调用链、可运行探针、观测结果及限制。新增证据确认失败清理缺口，并验证首轮进行中的当前会话数据链路已有实现；没有实施产品修复，也没有将人工异常注入或同步 React 宿主等同浏览器复现。相关现有测试 **81/81** 通过。

当前工作包仍为 B0。下一步复核 `_queueV2Commit` 失败与游标确认、SSE 写异常及双重错误关闭，再继续高优先级混合提交；真实 CLI、GUI、移动端和跨平台未验证，B1–B11 尚未实施。

### 2026-11-17：B0 准入完成，进入小提交迁移

用户确认按 B0 台账与高优先级复核准入迁移，真实实例验收随对应工作包完成。337 条与固定上游窗口一致，28 条关键词候选最终处置及实时故障补充见 [交接](./B0-handoff.md)。此前“下一步复核”中的游标提前确认、SSE 双重写异常已隔离核验，需适配 B3。

用户要求逐笔迁移、每笔验证后提交。第一笔本地 `450affb` 只实现 preferences 损坏保护和 API 错误响应，记录在 [B1 实施拆分](./B1-config-implementation.md) 与原 `4c5e633e68` 台账；997/997、构建和打包预览通过。B1.1 仍在进行中，认证是下一笔，注册表和 B1.2 后续处理；GUI、真实 CLI 与跨平台保持未验证。
