# B5 交叉候选范围复核

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`。本轮按实际 diff 核对候选归属；47 条真实 first-parent diff 的 SHA256、父提交和路径见[B5 候选足迹](./B5-candidate-footprints-2026-11-21.json)。足迹仅用于追溯，不能代替逐项实现或验证。其他工作包待办仍保留。

| 候选 | 实际代码依据 / B5 结论 | 独立待办与归属 |
| --- | --- | --- |
| dc1aeb28402abcaf4bc0479d343d5fccafc2e68c | 唯一改动为 docs/research/auto-testcase-generation.zh.md，224 行研究文档，无文件/搜索运行时代码；文内外部事实未作为本轮已验证事实。 | B11 研究文档归档；本地尚未复制，不认整条完成。 |
| 9eb178145bb218e0a84d806f350ac84f7287a537 | 完整 diff 为 App/AppBase 删除 GitHub star 状态/fetch、UsageWindowPill 无数据隐藏及 CSS/i18n 删除，无文件操作改动。本地仍有 star fetch 和 OAuth 空占位，明确未迁。 | B11 footer/用量展示收尾；需保留既有本地历史真实用量兼容的评估，不认完成。 |
| 7f7f78e2d8c04ae578c892981acde12999ed1d05 | 实际只有 WorkspaceList handleAddFromBrowser 从 add 改直接 launch；B2 `7d17f24` 已接同一原回调，8 项组件/共享表格启动 GUI 证据见 B2 完成矩阵。 | B5 无需重复实现；其他目录/技能导航仍按 B5/B7 各项。 |
| a2be00c45b71be0faf6b8bf1e1e93916b9cc1eb7 | 原 ChatInputBar 上传独立钮移入 (+) 顶层，增加 shared quickMenuRow hover 样式；不是文件导入 API。 | B7 原菜单布局/触控/键盘待迁；E10 上传链通过不折算入口完成。 |
| 3cf3e9585f9f93cb59b021a81d789c8f4ef5e528 | 上传顶层行 onMouseEnter 取消 qmHover 并清 quickExpanded，其他文件逻辑无变化。 | B7 待迁，与 a2be 联验。 |
| a336d3919f585712a1dcc608515e29589c0621f5 | TerminalPanel sparkle 顶层上传行、关闭菜单和 fileInput.click，删除独立 toolbarBtn。 | B7 终端/输入菜单待迁；E15 路径输入验证不代替菜单。 |
| 3bd2aa96961379537a8ccfb50667cab4b2335aa9 | 实际 diff 除 homebrew 下载 40 次/30 秒重试，还含 ChatInputBar ghost 两行测量/高度地板/裁剪 CSS 和 phone/pad 规则，不能只按 CI 标题分流。 | CI B11、ghost B7 均待迁；E15 窄 split 发送钮裁切另 B7 待核。 |
| 2cd4488ce984abf10f9338ec5f1ad6e88c359281 | 真父 b9d592fc/a99506d5；B5 files/view-root/fileOpen 与第二父无差异。相对 ab1b，files-content 仅多 5ee6739c 的 memory 内容长度估算，与路径 scope 无关。 | B5 沿 ab1b 各 E 项记录；memory/context 估算按 B4 既有 native 不伪造原则独立；其余队列/审批/文档按原工作包，不整条认完。 |
| 67226f50c171780b4da62c27a211219edf3bb648 | 真父 2cd4488c/aaa3a594；B5 files/skills/policy 与第二父无差异，亦与 566ade13 目标功能一致；Mobile 相对 566 额外 4 行是审批服务倒计时 prop。 | 用户已选远程管理员，E35–45目标链/原入口/内容与七菜单/原生保护已验；其他 B4/B9/B11 不重复迁。 |
| 91a523d043dbc27bd404f1cd911d2cc588847b8b | ArchivePreview/vendor 解析器、分类/许可证/打包，新 archive-raw GET/HEAD 32MiB、禁 persisted fallback；不同于 E5 无 cap 附件下载。 | B6 归档预览/安全解析/格式 GUI 待实施，B11 许可证/分发核验独立。 |
| 20313b254cffff4f8fec955b74a7b5233a0620ee | AudioPreview 和独立 audio-stream endpoint/模块；206/416/304 Range 及 MIME 属于预览协议，未改 download-file 语义。 | B6 音频流/格式预览待实施，不认 B5 下载通过即音频通过。 |
| 18bd742bc50d38ce52abf9f8df89930c49b50807 | B5 图标分类 E9、原 modal thumbnail apng/jfif 集合 E13 已带入；另有 SubtitlePreview/字幕解析、新图像 MIME/previewKind/userImageRefs。实际只确认已有 GUI 覆盖的类型。 | B6 字幕/新图像 MIME 与格式、B7 图像引用和输入消费者待实施，不扩大已有 GUI 结论。 |
| 6dd3b3b7e55acce07fb558cd27ca7e55de5d0647 | 全部路径为 changeset 删除、history/CHANGELOG、package 版本 1.9.23→1.9.24，无新增功能。 | B11 发布元数据，不能直接套到 native 1.1.20；未认发布完成。 |
| 7a0ba39edf6a0b54ca7a425e0f08ab410e515407 | E30 原 Git 清理重试 37 检查已迁；另读完整 scheduler 差异，fire-and-forget 以条件 poll 替代固定 50ms，并加清理重试。 | B9 尚未有该 scheduler，poll/清理留 B9，非整条完成。 |
| 6880f77320fa163442eaa64ff6385dc46a1b69f1 | E27/28 文件 oracle/Markdown 已迁；另含 strict skill frontmatter/name/description 校验、ZIP 声明/实际大小复核、skillImportErrorKey、Cache/IM 反馈及 Electron guard。 | B7 技能导入/错误反馈待迁和原生适配；IM/Electron B11 独立，不能因 Markdown 通过认整条完成。 |

## B5 收口审计

- 566ade13/7a75e1be/208f1348：E35–45已完成服务端目标身份→整导航根、逐项策略、content/raw/download和菜单端点；E38原AGENTS/project入口8场26图，E45 user/.agents/plugin双引擎6图另验。已选远程管理员不扩大认证管理或内部bridge。
- ab1b/eb2/merge：E10/E22/E36请求/正文/确认归属，E39普通项目工具native状态旁路，E40–44原case-only/delete/EXDEV/目录alias/平台sep已逐笔核对和验证；不能只用Git证据抵扣这些差异。
- 普通项目仍保持native精确实例containment；显式target/editorSession另作授权。专属image/voice/IM走原scope；OS terminal保持原管理员/项目containment意图，未把系统终端启动等同通用文件读取权限。
- 最终源码1781/1781、0skip及build/pack712通过；最终安装结果与完整矩阵另见[B5完成矩阵](./B5-completion-matrix.md)。保留原缺陷和未验环境；47条混合候选的其他工作包子项不折算完成。

## 原基线缺陷与已知边界

- E4 pad 确认替换横滚：用户明确选择保留并登记。
- E28 :123 冷开仍首行：两引擎以完整固定原组件、原 lock 关键编辑器版本独立复现。本轮按源码保持，**行号实际滚动未通过**，未做基线外修复。
- E15 窄 split 发送钮右缘裁切仍 B7 待核；真实 LAN、外部模型/物理设备/其他 OS 和最低 Node 等保持原未验边界。
