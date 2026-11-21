# B6 本地提交整合与 PR 交付（2026-11-21）

用户明确要求本轮本地提交合并为一个commit，PR到main，由代理自查并合并；合并后更新文档，B7留待下一会话。本记录随实现整合提交保存；PR、精确head、实际checks和合并hash以GitHub及本地consolidation.json为准，不预记未发生的结果。合并后的真实回执与交接文档将再经仅文档PR更新，不直接推main。

## 原始历史与恢复

- 基点`1c7eac578a7e8a66a50e1194ef37aca2f9b27580`，fetch确认远端main无新增提交且为原分支祖先。
- 原末端`b3ff4c6eec6cc46d00dae24dc1ecac093cdd5fe9`，原tree`8d9fe2e979c7e1f73b85fb0176e093ed919f147e`。
- 原16笔（含B6 E1–E14、npm入口核对及普通PTY入口缺口记录）全部保留于原`codex/b6-preview-content`及`refs/heads/backup/b6-before-squash-2026-11-21-b3ff4c6`，不推备份分支。
- 本地bundle：`/Users/sky/.npm-global/lib/node_modules/cx-viewer/.git/local-consolidations/20261121-b6-b3ff4c6/before.bundle`，已通过git bundle verify；所需基点为上述main。SHA256：`06cee0c2576972249499267ce7daf1e7cdfce97eb06edcb41762941a9f24a4fc`。
- [16笔完整清单](./B6-original-commits-2026-11-21.tsv)中的每笔均映射至包含本记录的唯一实现整合commit；原上游→E1–E13映射继续保存在[B6本地映射](./B6-local-commit-map-2026-11-21.json)，E14和两个后续诊断见完整清单。
- PR分支`codex/b6-baseline-alignment`从main建立后squash备份分支；添加本次交付文档前，暂存tree逐字等于原末端，未改生产实现。

## 自查与验证

相对main自查归档/音频的精确instance/target/admin/native凭据和descriptor链、32MiB有界读取、Range/HEAD/304/416/中止清理；查看预览dispatcher及原CSS、选区范围/portal排除、失败发送保留/多行PTY相关ACK恢复、Markdown源复制和第三方许可、共享CAS body浅拷贝回归。整合后的所有生产源码、CSS、测试、依赖及26张GUI图与原末端逐路径blob/mode相同，只有交付/交接文档新增或更新。

原最终验证1986/1986、0skip、build/pack720，新安装525/525、必需源码/许可/211Web字节、B1.2和隔离CLI通过。实际Chromium159/WebKit27.2桌面及phone/pad仿真6场26图、10轮不刷新问答通过。整合不改生产源码，不重复声称全测/运行时重跑；复核原日志hash和图像hash，切分支后重新构建、pack及全新artifact-only安装，实际结果见[交付预检](./B6-pr-preflight-2026-11-21.json)。

仓库仅有v* tag/release published触发的npm发布工作流，没有PR CI。读取真实PR check-runs/statusCheckRollup，无检查如实记录，不当作CI通过，不通过打tag/发布制造检查。使用精确head guard经PR合并，随后fetch main核对合并hash和tree。

## 下一会话与保留事项

B7本会话不启动。下一会话先读AGENTS、[规划B7](./cc-viewer-alignment-plan.md#b7--输入体验导航和-skills)、[B7提交索引](./cc-viewer-alignment-commit-index.md#b7)和[B0交叉候选](./B0-cross-index.md#cross-b7)，沿固定上游源码优先、小步迁移。

普通CLI/PTY增加工作区“＋”仍[待纠偏](./B2-pty-workspace-entry-gap-2026-11-21.md)：原sdkMode门槛问题未修，不用SDK GUI或重启折算通过。下一会话优先追完整普通PTY并行启动/保留原会话链，再处理输入/导航/Skills、普通主PTY和窄split GUI，不能只放开按钮或自动切SDK。

全局cxv软链已指当前packages/app/cli.js；7008旧后端未重启并托管当前会话，详见[运行入口交接](./B6-runtime-entry-2026-11-21.md)。本轮不停止它、不重装全局包、不打tag或发布npm。保留物理设备/音频/触屏/系统剪贴板、真实LAN/TLS/外部模型、其他OS/最低Node等未验边界及既有stdin/IM偶发，见[B6完成矩阵](./B6-completion-matrix.md)。
