# B5 本地提交整合与 PR 交付（2026-11-21）

B5已完成，用户明确要求将B5合为一个commit，创建面向main的PR，由代理自查并合并；B6留待下一个会话执行。本记录随唯一整合提交交付，最终PR/合并hash以GitHub关联PR及下述本地consolidation.json为准，不预记尚未发生的合并。

关联[PR #5](https://github.com/weiesky/cx-viewer/pull/5)：base为main，原46笔整合为一笔。创建后实际状态为MERGEABLE/CLEAN，statusCheckRollup为空；并非CI通过。补齐此交接链接后再次读取精确head/checks并经PR合并，最终合并结果以该PR及本地回执为准。

## 原始历史与恢复

- 基点：`288faea5454f3a791c60fff31da09a1cfa6d36a3`。整合前fetch确认GitHub main没有新增提交，且为原本地历史祖先。
- 原末端：`a3617be1383d43cb605fd9a7951b73b2d3a40cba`；原tree：`65ea86aeeda18954a1db31149f4de8c46e84aeb0`。
- 原46笔提交保留在 `refs/heads/backup/b5-before-squash-2026-11-21-a3617be`，备份分支不推送。
- 本地bundle：`/Users/sky/.npm-global/lib/node_modules/cx-viewer/.git/local-consolidations/20261121-b5-a3617be/before.bundle`，已通过 `git bundle verify`；恢复所需基点为上述GitHub main提交。
- bundle SHA256：`1c719d8994411af43603bf140700044c3a993f3b5d6535c5ce7e3ae2d9d9d00e`。
- [46笔完整原始清单](./B5-original-commits-2026-11-21.tsv)全部映射至包含本记录的唯一整合提交。E1–45的上游引用仍见[原本地映射](./B5-local-commit-map-2026-11-21.json)，E46收口hash在原始清单中；保留历史证据，不以整合覆盖原映射。
- PR分支：`codex/b5-baseline-alignment`。从基点新建后squash备份分支，完整暂存tree已逐字等于原末端，再更新交付/下会话交接文档。

## 差异与验证

整合新增本记录、原提交清单并更新专项交接文档。相对main的空白自查发现 `lib/search-candidates.js` 末尾多余一个LF，交付预检只删除该LF；其余应用源码、CSS、测试、依赖、探针和原始GUI证据与原末端逐路径Git blob/mode相同。提交前再核对唯一父提交和相对main只有一笔新提交。不重复声称新跑全量。

原最终生产源码已通过1781/1781、0skip、构建及pack712；真实tarball新安装487/487、必需源码与204Web文件精确字节、B1.2及隔离CLI通过。E38实际双引擎八场26图，E45 user/plugin双引擎两场6图，32张原图hash复核一致；其他GUI证据、原基线缺陷及未验环境见[B5完成矩阵](./B5-completion-matrix.md)和[最终回执](./B5-final-2026-11-21.json)。

交付LF清理后的搜索Worker/取消/策略回归15/15、0skip，重新构建/pack712通过。真实artifact-only新安装`cxv-b3-runtime-p6qe2v0v`的必需源码与204Web文件字节匹配；未重复运行487项，原全量/安装运行时仍为E45/E46检查点。命令/日志及逐路径检查见[交付预检回执](./B5-pr-preflight-2026-11-21.json)。

保留失败记录：新安装首轮被现有“Web build older than source inputs”门禁拒绝，原因是切分支写回相同源码刷新mtime；按仓库脚本重建，未绕过门禁。第二次因pack:dry-run与安装探针并行组装同一目录而出现资源ENOENT，随后结束前者并串行实跑通过；不将这两次失败计作通过。

自查重点是冻结实例/正文/确认归属、文件读写及搜索Worker的native owner/凭据保护、目标管理员/同源/HTML只读凭据、原case-only回滚/delete/EXDEV守卫、原目录布局/CSS及`.agents`仅导航祖先例外。其他工作包仍独立，不把B5整合当B6–B11完成。

仓库当前唯一工作流只由v* tag或release published触发，无PR CI。创建PR后读取真实checks、base/head、唯一提交、差异及mergeability；无检查如实记录，不当作CI通过。使用精确head guard经PR合并，不直接推main、不打tag或发布npm。合并后fetch并读回GitHub main，核对合并hash、PR分支tree及本地干净状态，结果记入上述备份目录的 `consolidation.json`。

## 下一会话

B6本会话不启动。下一会话从[规划B6](./cc-viewer-alignment-plan.md#b6--预览与内容引用)、[B6提交索引](./cc-viewer-alignment-commit-index.md#b6)及[B0交叉候选](./B0-cross-index.md#cross-b6)进入，继续固定基线源码优先、小步迁移。优先核原统一预览路由/二进制分派及archive/audio/subtitle/新图像格式调用链与CSS，再依依赖逐笔实施；不以B5基础HTML/图像/下载通过折算格式验收。
