# B6 完成矩阵

固定上游`74cd752d99caf122e750216d2af3bb9f467c4de1`，2026-11-21。**B6工作包在下述范围完成（第7/12工作包）。** 最终1986/1986、0skip、build/pack720通过；真实生产新安装525/525、必需源码/许可与211Web精确字节、B1.2及隔离CLI通过。46候选按子项核销，混合提交不整体勾选。分支`codex/b6-preview-content`，保持本地独立提交，未推送、未发布、未切换活动安装。

| 范围 | 实施与依据 | 验收及边界 |
| --- | --- | --- |
| ZIP/TAR/GZIP归档预览 | E1、E8；91a523d043及f96811cddb/18bd742bc5后续有效代码 | 原目录树/文本/图片/编码/错误回退；32MiB原始及解压、200KiB文本、条目/路径/树节点上限、CRC/加密/损坏/炸弹等解析测试；真实HTTP及双引擎GUI。只展示、不写磁盘、不递归解压嵌套包 |
| 音频与Range | E2、E9；20313b254c | 原audio controls/preload none；同一已验descriptor嗅探与流式读取、HEAD/206/416/304/If-Range、1GiB稀疏文件尾部与中止；双引擎muted play/seek/错误下载回退。未验物理发声与全部codec |
| 字幕 | E3、E8；18bd742bc5 | SRT/VTT/ASS/SSA列表/原文、GBK/UTF16、1MiB decode/3000cue/默认1500原文；真实浏览器HTML样文本不执行。raw HTTP仍10MiB，未声称只传1MiB |
| 图像与统一预览 | E1/E4；18bd742bc5/f96811cddb | 复用B5分类、APNG/JFIF附件/引用/MIME、不可浏览器解码格式保留占位；PDF内置下载回退。浏览器验证APNG decode，未验所有OS图片解码器 |
| 助手选区与quote chip | E5；2e09d30192 | 原浮动按钮、composer附件条chip、键盘预览/移除、20条/4000字符、quote-only/去重/slash保留；SDK wire精确发送，PTY相关ACK/安全粘贴及失败恢复用真实类方法测试。普通主PTY新GUI留B7 |
| diff/KV/Ask选区 | E6；1b3c2268e3 | 单助手同区域/单range、portal排除、gutter/header不参与；双引擎实际工具/diff区域和问答鼠标拖选不切换/Enter选择。未验物理触屏长按/手柄 |
| Markdown源复制 | E7/E11；478268a4db | 原Turndown7.2.5/GFM1.0.2转换、标题/表格/代码/安全路径；实际Ctrl/Meta+C的plain Markdown+rich HTML事件数据通过；MIT全文随打包分发。未验跨应用OS剪贴板；截断DOM不是无损全消息 |
| 多轮native问答 | E12；本地V2必要修复 | 无深拷贝投影浅拷贝input承载body，两个修复前失败回归；两引擎各5轮不刷新普通回复→问答→最小化→取消，10/10通过。保持大消息引用共享 |
| 文件身份/权限 | E1/E2/E9 | 精确同名A/B、target/admin、Host/Origin、native凭据/历史/owner、hardlink/symlink、descriptor保护复用B5；无图片持久副本豁免。不将loopback Host模拟视为真实LAN/TLS |

对应上游完整hash、每笔实现与后续修复见[实施E1–E13](./B6-implementation.md)、[46候选矩阵](./B6-candidate-matrix.md)、[提交台账](./cc-viewer-alignment-commit-ledger.md)及[本地完整映射](./B6-local-commit-map-2026-11-21.json)。B4图像/native协议、B3冷读/窗口、B5搜索/浏览/编辑/路径/引用直接复用各自验收，B7/B8/B9/B10/B11混合范围独立保留。

## 源码与 GUI 对照

三个viewer整CSS、selectionQuote/markdownCopy整文件、quote浮层/chip的9条CSS与固定上游逐字相同，见[14项源码样式校验](./B6-source-style-2026-11-21.json)。布局未自行新增/重排；必要差异限于target/instance/native descriptor、现有单花括号翻译、Codex请求/队列/失败恢复及CAS body所有权。

实际Chromium159.0.8154.6/WebKit27.2桌面2场14图，phone/pad仿真4场12图，**26图逐张核看**，另连续交互10轮。见[GUI回执与图像hash](./B6-gui-2026-11-21.json)。phone保留原0.6缩放，pad显式ipad=1；不以单纯CSS相同代替运行与视觉验收。

## 最终门槛和未验边界

`env -u CXV_BYPASS_PERMISSIONS pnpm release:check`退出0，1986=5+610+1159+212，0skip，build/assemble与pack720通过。新tarball生产安装525/525，B1.2及相对cd CLI通过；最终重建后与该安装目录逐字节比较源码/许可和全部211Web仍一致。见[最终回执](./B6-final-2026-11-21.json)、[安装回执](./B6-installed-2026-11-21.json)。E14仅收口文档与映射，无生产改动，不重复测试。

前两次最终检查失败保留：外层bypass=1导致权限用例环境不符；受控重跑时既有exec-with-stdin 50ms超时用例一次偶发，定向3/3及最终全量通过，根因未修。此前IM并发偶发未定不扩大为本轮修复。

真实LAN/TLS、外部模型/慢网/OAuth/远端MCP、物理设备/触屏/软键盘/音频、跨应用剪贴板、Windows/Linux/最低Node未验。原iPad替换横滚已选保留、Markdown冷开行号原缺陷保留；native profile/image-input/add-dir/review不支持、exec/显式AppServer渐进及353K用量条保持。临时fixture已停止，真实用户配置/凭据/活动实例未变更。

下一工作包B7：输入/导航/Skills、普通主PTY新GUI及窄split发送钮，按固定基线逐笔核验；本轮未启动B7。
