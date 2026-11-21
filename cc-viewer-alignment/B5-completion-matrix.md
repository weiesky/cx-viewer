# B5 完成矩阵

固定基线 `74cd752d99caf122e750216d2af3bb9f467c4de1`，2026-11-21。**B5工作包已完成（第6/12工作包）。** 最终源码验证1781/1781、0skip，构建及pack:dry-run（712文件）通过；真实tarball新安装487/487、必需源码与204Web文件字节、B1.2及隔离CLI通过。本表只核销B5范围；47条候选中的混合子项不等同整条提交完成。

| B5范围 | 实施及证据 | 结论与实际边界 |
| --- | --- | --- |
| 搜索Worker/取消与大结果列表 | E1–4、E25；[Worker](./B5-search-worker-2026-11-21.json)、[嵌入搜索](./B5-search-embedded-2026-11-21.json) | 实际HTTP并发/取消后Git子进程回收、虚拟列表/键盘、原搜索布局通过；最终增量扫描保留0cbb重新引入的行为，不以中途082回退当最终版本 |
| 文件树/原浏览弹窗/共享菜单 | E6、E9、E13–14；[项目弹窗](./B5-project-browser-2026-11-21.json)、[图标](./B5-file-icons-2026-11-21.json)、[分区](./B5-drop-zones-2026-11-21.json) | 原结构、FileBrowser整CSS、两主题图标、树26px行高、单击预览、空白菜单与拖放区域已核；桌面/phone/pad仿真按各回执列明 |
| 导入、移动、下载、编辑 | E5、E7–8、E10–12；[导入](./B5-shared-import-2026-11-21.json)、[移动](./B5-shared-move-2026-11-21.json)、[下载](./B5-file-download-2026-11-21.json)、[编码](./B5-file-encoding-2026-11-21.json) | 实际FS/HTTP及双引擎上传/移动/下载字节和同名A/B归属；编辑不截断binary/UTF16；HEAD、流关闭和原HTML相对资源身份有独立验证 |
| 普通项目文件操作剩余差异 | E40–44；[rename](./B5-project-rename-2026-11-21.json)、[delete](./B5-project-delete-2026-11-21.json)、[EXDEV](./B5-project-exdev-2026-11-21.json)、[alias](./B5-project-alias-2026-11-21.json)、[sep](./B5-project-separators-2026-11-21.json) | 实际本机case-only文件/目录重命名、瞬时锁重试、失败回滚；符号删除/EXDEV拒绝、保护段归一化、递归删除前复核；安全目录链接可展开。EXDEV为故障注入，未冒称真实跨卷/Windows通过 |
| 文件/目录/Git引用 | E15、E20；[文件引用](./B5-file-references-2026-11-21.json)、[Git引用](./B5-git-references-2026-11-21.json) | 实际原生拖放到composer、SDK单次发送及zsh scratch输入已核；普通主PTY新GUI和其他shell/OS运行保持未验，不折算B7输入体验 |
| Git列表、状态、刷新与持久化 | E16–24、E29–30；[回退](./B5-git-fallback-2026-11-21.json)、[统计](./B5-git-stats-2026-11-21.json)、[冲突](./B5-git-conflicts-2026-11-21.json)、[归属](./B5-git-scope-2026-11-21.json)、[持久化](./B5-git-persistence-2026-11-21.json) | 原无upstream回退、逐提交行数/真实A+D、去作者、7未合并红色、刷新原样式/超时、确认前固定URL、主动/被动关闭意图和tree优先恢复已核 |
| Markdown本地路径 | E27–28；[文件探针](./B5-files-exists-2026-11-21.json)、[Markdown](./B5-markdown-files-2026-11-21.json) | 原链接/inline code探测、批次上限、同名实例作用域和打开真实文件通过；冷开行号未滚动，已在完整原组件/原编辑器版本复现，未计滚动通过 |
| 外部目标身份与管理员 | E26、E32–37；[策略](./B5-target-policy-2026-11-21.json)、[身份](./B5-target-scope-2026-11-21.json)、[权限边界](./B5-target-permission-boundary.md) | 用户交互选择有效URL token/登录session可管理目标；过期/撤销/伪cookie、空密码放行和cross-site均无管理员权。本机认证设置/内部bridge保持原限制；服务端重建身份与冻结cwd，body不能换实例 |
| 原AGENTS/技能入口、菜单和目标预览 | E38、E45；[目标GUI](./B5-target-browser-2026-11-21.json)、[用户/插件GUI](./B5-target-sources-2026-11-21.json) | E38两引擎各desktop/phone/pad/模拟remote共8场26图，E45两引擎user/plugin另6图，均核看；标题Enter/技能Space、保存/rename、SVG、HTML相对CSS/JS、A确认跨B仍只删A。`.agents`祖先只获导航元数据例外，内容/写策略不放宽 |
| 原生凭据/历史/owner保护 | E7、E26、E33、E36、E39；[旧入口](./B5-native-file-tools-2026-11-21.json)、[owner](./B5-target-owner-guard-2026-11-21.json) | 通用列表/搜索/replace/读写/下载/导入/移动删除及AGENTS/技能元数据组合现有native策略；descriptor/inode/alias/祖先/缺失叶和Worker父快照已核。专属image/voice/IM保持各自scope，不给通用文件接口豁免；不声称消除全部TOCTOU |

## 权限与原生最小适配

普通项目请求继续要求精确实例根内，未照搬上游普通绝对路径全局allowlist；外部访问使用显式target或已验证管理员的editorSession，下载不能单借editorSession扩根。目标菜单沿用整navigation root语义，逐文件策略继续执行，不把HOME导航当HOME总授权。

目标HTML的opaque sandbox相对资源使用目标/视图/认证context绑定的raw GET/HEAD只读凭据，保留原CSP；登录session授予的凭据随其撤销失效。不把这个局部raw读取能力视为目标管理员、写入、认证设置或内部bridge权限。`.agents`祖先例外只适用于服务端已确认目标的目录链，私有owner及其别名不适用。

## 保留给其他工作包

| 子项 | 归属与现状 |
| --- | --- |
| archive/audio/subtitle/新图像格式、统一预览路由、选区及内容引用 | B6待实施；B5二进制识别、下载和基础HTML/图像不代替格式验收 |
| 技能导入/错误反馈、导航、输入(+)/sparkle菜单、ghost、普通PTY队列及触控 | B7待实施；窄split发送钮裁切待核，B5 folder入口不等于技能产品全完成 |
| 角色分源、模型策略及真实原生不支持项 | B8独立；既选353K及exec/显式AppServer渐进方案保持，profile/image-input/add-dir/review不支持边界不变 |
| 自动审批/答题、定时任务 | B9独立；本轮不改变权限或启用调度 |
| service事件总线/服务插件、旧IM/发布/研究文档/footer | B10/B11独立；IM并发偶发未定及旧入口边界保留 |

## 原基线缺陷与未验环境

- iPad替换确认后的横滚裁切：用户已选择保留原基线行为。
- Markdown冷开`:123`仍首行：保留原缺陷，不称行号滚动通过。
- 浏览器是实际Chromium159/WebKit27.2；phone/pad为仿真，remote是偏好位模拟加真实loopback HTTP认证病例，未冒称真实LAN/TLS登录浏览器。
- fake Codex与隔离HOME/日志用于测试；未发送外部模型请求、修改真实凭据或切换全局实例。物理设备/音频、其他OS/最低Node、真实慢网/外部模型/OAuth/远端MCP等原边界保持。

## 最终门槛与本地交付

`env -u CXV_BYPASS_PERMISSIONS pnpm release:check` 实际退出0：1781=5+434+1130+212，0skip，构建/组装与712文件打包检查通过；日志 `/tmp/cxv-b5-e45-release-final.log`。随后运行 `python3 cc-viewer-alignment/probes/b3-installed-check.py`，真实安装目录 `cxv-b3-runtime-40h1cp33`，487/487运行时、必需源码与全部204Web文件字节匹配、B1.2及相对cd隔离CLI通过；日志 `/tmp/cxv-b5-e46-installed-final.log`。检查覆盖E45最终生产源码，E46只更新专项文档/回执，不另作生产变更。

最终汇总见[B5最终回执](./B5-final-2026-11-21.json)，45笔实施及审计commit的精确hash见[本地映射](./B5-local-commit-map-2026-11-21.json)。E46为原始单独收口记录，后续整合交付不改原生产源码；见[B5整合记录](./B5-local-commit-consolidation-2026-11-21.md)。B6留待下一个会话执行，本会话不启动。

上游hash、本地每笔commit和各检查见[提交台账](./cc-viewer-alignment-commit-ledger.md)、[实施记录](./B5-implementation.md)、[47条候选](./B5-candidate-matrix.md)和[交叉范围](./B5-cross-package-audit.md)。B5按用户最新授权以1commit/1PR交付并由代理自查合并，原46笔备份/映射见[B5整合记录](./B5-local-commit-consolidation-2026-11-21.md)；最终GitHub状态以关联PR/本地回执为准。
