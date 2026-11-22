# B8 本地提交整合与 PR 交付记录

2026-11-22，按用户授权完成 B8 验证、备份、整合、main PR 自审与合并；合并后才更新本轮完成标记及 B9 交接。

- 起点 main：`89a8d9dc508b1a9d79ac218bc870e20c4750187c`。
- 原末端：`eed714f0195d8c3119361bc170223d8f1c60426a`，37笔；含上一轮B7有意留在本地的完成文档，以及已撤回的E5–E7原提交/回退、映射与格式记录。
- 整合 commit：`e2ee6e327c818d5c550b2c6e8ccbb8b373e21c27`。
- [PR #9](https://github.com/weiesky/cx-viewer/pull/9) 实际 MERGED，时间 `2026-11-22T10:23:04Z`，合并 main `6106d41c5da0509595ed1d5a108bec6ab6d09513`。
- 原末端/整合/GitHub精确head/合并main的 tree 均为 `ae05e2959919990bddf0ac4ddf06558a0499654e`。整合未改生产内容。
- 原始37笔及上游依据见[完整映射](./B8-original-commits-2026-11-22.json)、[实施台账](./B8-implementation.md)；恢复分支 `backup/b8-raw-20261122`，完整外部bundle `/Users/sky/.codex/backups/cx-viewer/B8-20261122/final.bundle` 已 git bundle verify，外部original-commits.txt保留。不依赖远端feature分支恢复历史。

远端分页核对全部238文件与本地差异相同，GitHubhead/tree与本地一致；CLEAN/MERGEABLE后用 `--match-head-commit` 精确保护合并。实际 statusCheckRollup 为空，`gh pr checks` 报 no checks；仓库只有 npm 发布workflow，未冒称PR CI通过。

最终2232/2232、0skip/build/pack737；格式空行清理后重建并再次全新生产安装685/685、全部737包与211Web字节、B1.2及隔离CLI通过。真实SDK双引擎4请求/idle/发送恢复/刷新/归档恢复与显式AppServer default provider主2/子1证明见[最终回执](./B8-final-2026-11-22.json)。无npm发布/用户配置迁移/活动7008重启。

合并后切回本地main时，旧B7完成文档e18b7fe与新的squash ancestry不同，ff-only如预期拒绝；确认其已在完整备份祖先内、工作区干净且merged tree精确一致后，把本地main对齐origin/main，没有丢弃未备份内容或创建多余merge。完成标记/README/规划/台账/B9交接随后走独立文档PR，生产代码与已验产物不再变化。B9只准备未执行，未验环境见[完成矩阵](./B8-completion-matrix.md)。
