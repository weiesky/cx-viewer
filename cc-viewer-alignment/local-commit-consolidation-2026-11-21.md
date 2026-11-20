# B4 本地提交整合与 PR 交付（2026-11-21）

B4 已按固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1` 完成，详见[B4 完成矩阵](./B4-completion-matrix.md)。按用户最新明确授权，将本地 main 相对 GitHub main 的全部 72 笔提交整合为一笔，通过一个面向 main 的 PR 交付、自行检查后合并。此记录随聚合提交交付；最终 PR/合并 hash 以 GitHub 关联 PR 状态和本地 consolidation.json 回执为准，不预记未发生的合并。

## 原始历史与可恢复备份

- 基点：`e268ec0039f26276c9aa75d0a5a95b3aa26d2b62`，整合前重新 fetch 确认远端没有新增提交，且为原本地历史祖先。
- 原末端：`78448bb32e50dfe6b51c30bd4fd5f60fa8f4e64f`；原 Git tree：`205125b7ef88a1d6a71a4ff89459c6aeba8b0feb`。
- 原本地历史保留在 `refs/heads/backup/b4-before-squash-2026-11-21-78448bb`，不推送备份分支。
- 本地 bundle：`/Users/sky/.npm-global/lib/node_modules/cx-viewer/.git/local-consolidations/20261121-b4-78448bb/before.bundle`，已通过 `git bundle verify`；其恢复前提是上述已在 GitHub main 的基点。
- bundle SHA256：`88ab9e532ca9f7182731371e689b4604631426fccd40302416d8ac3759a60b80`。
- 完整 72 笔原 hash/主题：[原提交清单](./B4-original-commits-2026-11-21.tsv)。原上游→本地小笔映射仍保留在[实施记录](./B4-implementation.md)、[候选矩阵](./B4-candidate-matrix.md)和[提交台账](./cc-viewer-alignment-commit-ledger.md)。清单全部映射至包含本文件的唯一聚合提交。
- 新 PR 分支：`codex/b4-baseline-alignment`；从基点新建并 squash 原备份分支，既有 GitHub main 历史保持。

## 文件与验证

整合前完整暂存树已逐字等于原末端；整合仅新增本记录、72 笔映射清单并同步进度文档，应用源码、CSS、测试、资源、探针、依赖和 GUI 原始截图保持完全相同。提交前再以 Git blob/mode 逐路径比较，并核对相对 main 只有一个父提交和一笔新提交。

最终应用已通过 `env -u CXV_BYPASS_PERMISSIONS pnpm run release:check`：1580/1580、0 skip、构建、pack:dry-run 全通过；E64 新生产安装 702 文件/204 Web 资源精确字节、291/291 运行时及 B1.2/隔离 CLI 通过。E66 实际 Chromium/WebKit G1–G5 与 phone/pad 仿真 GUI 通过，12 张截图/哈希见[最终 GUI 回执](./B4-final-gui-2026-11-21.json)。历史整理不产生新的功能测试通过声明。

自查重点为原生 transport 的渐进启用/参数拒绝、精确实例/代次与审批终态、中断/排队输入保留、SDK 主 WS 与 scratch 隔离、冷读/live 重放及原组件/CSS。其他工作包混合子项仍按完成矩阵保留，真实外部模型/慢网/权限、物理设备和其他平台/最低 Node 的原未验边界保持。

仓库现有工作流只由 v* tag 或 release published 触发，没有 PR CI；实际 GitHub checks 状态须在 PR 创建后读取，不能把无检查记为 CI 通过。合并前核对 PR base/head、唯一提交、文件差异、合并能力和实际检查状态，使用精确 head guard 通过 PR 合并，不直接推 main。合并后 fetch/读回 GitHub main，核对 merge hash、生产文件树与本地干净状态；回执存于上述本地备份目录。

B4 交付完成后的下一工作包为 B5；本次不因 B4 收口而勾选 B7/B8/B9/B10/B11 的未迁子项。
