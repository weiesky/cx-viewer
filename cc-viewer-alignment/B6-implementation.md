# B6 预览与内容引用实施

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`；本地起点 `1c7eac5`（B5 PR #5合并），分支 `codex/b6-preview-content`。2026-11-21用户明确启动B6，取代上一会话暂停在B5的边界。保持逐笔独立提交，不推送/发布或变更活动实例。

## 范围与当前状态

42条主索引 + 12条交叉索引取并集为46候选（含混合提交/元数据/合并），索引仅用于定位，逐笔读实际diff、固定最终完整调用链及CSS，后续修复/替代一并核对。已完成子项不重复迁入，也不将B6子项折算为整个混合提交完成。B6已于E14在明确范围收口，见[完成矩阵](./B6-completion-matrix.md)；下文各轮“待验”是当时检查点，以E13最终回执为准。

<a id="e1"></a>
## E1 压缩包预览

- 上游：`91a523d043dbc27bd404f1cd911d2cc588847b8b`（PR #170），后续 `f96811cddb3f1f5516ef7823bcc2a36d142a95e3` 分发/二进制占位，以及 `18bd742bc50d38ce52abf9f8df89930c49b50807` 编码修复。实际读取上述diff、固定最终 ArchivePreview JSX/整CSS、archivePreview utility、vendor/archive 全8模块/许可、FileContentView调用、服务端files-content路由和本地B5文件权限链。
- 直接迁入原目录树/条目详情/状态反馈、ZIP/TAR/GZIP便携解析器与MIT署名，无新增依赖。32MiB原始和解压输出、5000条目/20000树节点、64层/4096字节名称、200KiB文本/8000行、8MiB栅格图、加密/CRC/损坏/不支持格式与下载回退保留。条目名仅展示，不写磁盘，不递归解压嵌套包。
- 必要适配：原API加入本地withTargetParams，显式instance保留；archive-raw复用原file-raw descriptor/instance/target/admin/native凭据与历史策略，不复制Claude allowlist，不允许图片持久副本回退。按descriptor stat大小有界读取，防stat后增长绕过32MiB；原二进制/UTF16编辑保护不变。FileContentView恢复hook-free预览分发和`.markdown`扩展识别。
- 验证：本地Node 24.14.0/macOS，原解析器23例+真实隔离HTTP2例共25/25、0skip；包含ZIP存储/deflate、TAR/PAX/GNU/GZIP、炸弹截断、恶意元数据、编码、GET/HEAD、32MiB边界、精确A/B实例、未知实例、路径穿越/跨项目symlink/native秘密/恶意Origin拒绝。HTTP复用原错误契约：越界为400，不伪改成403。Web构建通过。ArchivePreview.module.css与固定上游精确相同；视觉GUI和新安装产物待整包验收，不能以CSS相同代替GUI通过。
- 本地commit：本节所在独立提交（后续笔记录完整hash）。本轮日志 `/tmp/cxv-b6-e1-tests.log`、`/tmp/cxv-b6-e1-build.log`。

<a id="e2"></a>
## E2 音频流式预览

- E1本地完整hash：`7c47e78`（可由git解析完整值）。本笔上游 `20313b254cffff4f8fec955b74a7b5233a0620ee`，已读实际diff、最终AudioPreview/整CSS、FileContentView/GitChanges调用、previewKind与服务端完整audio-stream/files-content及原测试，无后续音频模块修复。
- 迁入原`<audio controls preload="none">`、播放错误下载回退、audio MIME嗅探/单Range解析/流式响应、HEAD/206/416/304/If-Range/中止清理，原AudioPreview整CSS一致。GitChanges复用原opensInFileViewer，原分类已由B5存在，不重写。
- 必要适配：API传target/instance；服务端复用B5文件访问/owner/target/admin策略。嗅探和createReadStream都使用已通过O_NOFOLLOW/fstat/native与路径身份检查的同一descriptor，禁止检查后重新按路径打开；early HEAD/304/416/empty/error由路由关闭，body由stream接管，客户端中止销毁stream。
- 验证：原audio单元20例+真实隔离HTTP3例共23/23、0skip，含WAV magic覆盖.mp3、精确A/B、恶意Origin/穿越/跨项目symlink/秘密拒绝、空文件、1GiB稀疏音频尾部2字节、读流中止后服务健康。Web构建通过。GUI播放/seek/不支持编码回退待，物理声音未验。测试日志 `/tmp/cxv-b6-e2-tests.log`、构建 `/tmp/cxv-b6-e2-build.log`。
- 本地commit为本节所在独立提交，下一笔补hash。

<a id="e3"></a>
## E3 字幕预览

- E2本地 `ba6ac2b`。上游 `18bd742bc50d38ce52abf9f8df89930c49b50807` 的字幕子项；实际diff及固定最终SubtitlePreview/整CSS、subtitleParser、vendor解码链、FileContentView分发、原字幕测试均已读取，后续无字幕修复。
- 直接迁入SRT/VTT/ASS/SSA cue列表/原文双视图、编码/截断/空/失败反馈、1MiB解码和3000cue限制，超过1500默认原文。原HTML样文本只作为React文本渲染，ASS override不执行。editorSession仍走可编辑文本链，沿用B5 UTF16只读与二进制拒写保护。
- 必要适配仅原raw/download URL带target/instance，复用B5权限。原raw端点10MiB上限保留，字幕自身1MiB解码截断，不声称HTTP只传1MiB。整CSS精确相同。
- 验证：原字幕30+归档23+既有二进制4共57/57、0skip，含异常元数据/大量文本/格式/GBK/UTF16/条数截断；构建通过。真实浏览器字幕XSS/切视图/目标scope待后续GUI；物理设备和其他环境仍未验。
- 本地commit为本节所在独立提交；日志 `/tmp/cxv-b6-e3-tests.log`、`/tmp/cxv-b6-e3-build.log`。

<a id="e4"></a>
## E4 图片格式与共享预览路由

- E3本地 `3bcbf14`。上游 `18bd742bc50d38ce52abf9f8df89930c49b50807` 图片子项和 `f96811cddb3f1f5516ef7823bcc2a36d142a95e3` 路由子项实际diff/完整调用方已核。B5已含fileTypes分类、FileBrowser缩略图和previewKind，不重复迁移。
- commandValidator复用原getPreviewKind/getExt并排除icns/tif/tiff/heic/heif的img路径；四处原附件条与userImageRefs增加APNG/JFIF并去icns，raw MIME保留image/apng、image/jpeg、image/tiff/heic/heif。fileOpen移除pdf系统外开，按原内置下载占位分发，不改变Office系统外开。
- 验证：原preview-kind/commandValidator、本地fileTypes和真实raw/archive HTTP共48/48、0skip，含Windows路径/大小写、各图片原字节及MIME。构建通过。尚未用真实设备/不同OS编码器验证所有图片格式；GUI待。
- 本地commit为本节所在独立提交；日志 `/tmp/cxv-b6-e4-tests.log`、`/tmp/cxv-b6-e4-build.log`。

<a id="e5"></a>
## E5 助手文本选区引用

- E4本地 `11c80f6`。上游 `2e09d30192774017db5cb06d1783686c63b16031` 实际diff/原组件方法、ChatInputBar附件条/发送按钮、ChatMessage气泡、selectionQuote和两段CSS、i18n均已读，后续扩展区域与复制由E6/E7独立迁入，不整批搬ChatView。
- 原助手同气泡markdown选区→浮动按钮→附件条quote chip（全文Popover/确认移除），最多20条/单条4000字符，普通消息加`> `块，slash跳过前缀并保留chip。按钮/quote chip CSS区块与原提交一致，无重排布局。
- 必要适配：现有Codex请求ID/待确认输入/服务端busy队列与失败恢复保留，不引入Claude队列。成功发送才清chip，typed interrupt入既有待发送队列时清；晚到拒绝仍能恢复完整wire文本。多行PTY复用本地已有带seq/确认/失败恢复的_sendBracketPasteSequential和安全粘贴过滤，SDK直接发送文本，不塞PTY。Native累计session可重建首消息，故用已有isSessionDividerBoundary语义识别真正换会话，避免每次流更新清引用；显式resume/切scope清引用，卸载清监听/rAF。
- 验证：原helper/i18n+已有乐观echo/PTY chunk组合41/41；实际打包ChatView/Provider行为套件+helper共64/64、0skip，增加quote-only、去重、失败保留、slash保留、相关多行安全粘贴/失败ack恢复、同thread实时重建保留与显式resume清除。构建通过；GUI鼠标/键盘/phone模拟与真正触屏待。
- 本地commit为本节所在独立提交；`/tmp/cxv-b6-e5-tests.log`、`/tmp/cxv-b6-e5-behavior.log`、`/tmp/cxv-b6-e5-build.log`。

<a id="e6"></a>
## E6 diff、工具参数与问答选区

- E5本地 `f8aa895`。上游 `1b3c2268e3bd0e73ffef043bf450662d01a28371` 实际diff/完整selectionQuote、DiffView/整CSS、AskQuestionForm、本地工具KV生成/气泡链与.askRadioItem/.askRadioDot已读，保留B4 Codex原生问答/超时边界。
- 原data-ccv-quotable标记只落codeWrap、KV参数区、每题问题/选项区，header/gutter/提交取消按钮/倒计时不参与；同助手+同区域+单range，跨bubble/跨区域/portal拒绝。Ask拖选不切换选项，键盘Enter/Space保留；dot与gutter不可选，CSS规则按固定原文迁入。
- 验证：原扩展helper/i18n/区域接线与真实ChatView/Provider方法套件共86/86、0skip，构建通过。浏览器diff/KV/问答真实选区和触屏仍待目标GUI。
- 本地commit为本节所在独立提交；`/tmp/cxv-b6-e6-tests.log`、`/tmp/cxv-b6-e6-build.log`。

<a id="e7"></a>
## E7 Markdown 源复制

- E6本地 `ed0a57f`，前笔实际结果86/86（早期进度笔误87已纠正）。上游 `478268a4db5aadb50be1396207b2c54093824c58` 实际diff、固定最终markdownCopy/selectionQuote/ChatView copy链、vite chunk/package/lock/i18n与原37测试均已读。
- 本地B5已有handleMessageListCopy函数体，但没有gate/converter import和onCopy绑定，故复用函数体补完整链，不新增第二个handler。选区限同助手同markdown，text/plain恢复Markdown、text/html保持原DOM片段，其他选区保留原生copy；文件路径角括号/控制符过滤/title转义按原实现迁入。
- 已安装依赖中没有同类DOM→Markdown转换，按上游引入Turndown7.2.5与turndown-plugin-gfm1.0.2（两者安装manifest MIT，Node测试间接domino2.2.0；浏览器构建排除domino）。复用原vendor-markdown chunk。原文案18locale保留，无新产品入口。
- 验证：原源转换37+扩展quote/实际类方法共123/123、0skip，含GFM表格/代码/标题/列表/安全文件链接/跨区拒绝；构建通过。系统剪贴板/浏览器copy事件待GUI验证，截断DOM选区不是无损全消息原文（上游已注明）。
- 本地commit为本节所在独立提交；安装 `/tmp/cxv-b6-e7-install.log`，测试 `/tmp/cxv-b6-e7-tests.log`、构建 `/tmp/cxv-b6-e7-build.log`。

<a id="e8"></a>
## E8 预览参数文案适配

- E7本地 `fed3105`。首轮全量1982/1982（5+609+1156+212）、0skip通过。
- 实际生产Chromium截图发现原archive条目计数渲染为`{4} entries`。上游新增文案用`{{count}}`，本地t()只消费`{count}`；沿用B2既有必要文案适配，只将本轮archive/subtitle参数占位符改为本地单花括号，不修改共享翻译函数或其他文案。
- 18locale实际t()参数测试1/1与构建通过。原CSS不变；此GUI发现说明功能测试/原CSS一致并不能替代视觉验收。截图原现场 `/tmp/cxv-b6-preview-inspect.png`。
- 本地commit为本节所在独立提交；`/tmp/cxv-b6-e8-tests.log`、`/tmp/cxv-b6-e8-build.log`。

<a id="e9"></a>
## E9 新预览端点权限组合验收

- E8本地 `d3c5598`。实际复核E1/E2新增入口→requestSdkView→fileBrowserAccess→resolveTargetRoot→native/descriptor链，未更改运行时代码。
- 新增真实loopback HTTP组合：global AGENTS身份解析HOME导航根后读取音频/归档；未认证remote Host、cross-site、恶意Origin拒绝；指向native auth inode的普通音频/zip名字hardlink拒绝，body无SECRET。精确实例、未知实例、path/symlink/HEAD/Range和大小保护保持。
- 7/7真实端点测试通过，日志 `/tmp/cxv-b6-e9-tests.log`。这是本机Host/Origin模拟与实际HTTP，不冒称真实LAN/TLS设备通过。无运行时代码变化，不重跑构建。GUI测试fixture最初把global AGENTS放在CODEX_HOME别名而非现有固定`~/.codex`发现位置产生404，按现有发现契约更正fixture，未放宽生产路径策略。
- 本地commit为本节所在独立提交。

<a id="e10"></a>
## E10 候选范围与历史复用核销

- E9本地 `c1548c0`。实际42主索引与12交叉索引并集为46条，纠正初期47的计数笔误。见[B6候选矩阵](./B6-candidate-matrix.md)、[精确diff足迹](./B6-candidate-footprints-2026-11-21.json)。所有上游完整hash均可由固定仓库解析；机器diff SHA仅是追溯校验，不声称已将所有混合行逐行重实现。
- 新预览/选区源代码依据及完整相关调用链/CSS已在E1–E9逐笔列明；图像协议复用B4、冷读/窗口复用B3、搜索/浏览/编辑/路径/引用复用B5。主索引夹入composer/ghost/队列/导航等B7、研究/版本/CI等B11，继续独立核验，不把已有基础或B6完成当作整条完成。PR #170按91a/f968有效代码处理，不重复cherry-pick合并，自动答题等仍留B9。
- 校验：46个候选均有范围和证据路径，无未知行；原主/交叉索引未改动。仅文档/映射，无运行时变化，无新增测试通过声明。
- 本地commit为本节所在独立提交。

<a id="e11"></a>
## E11 生产安装与第三方署名

- E10本地 `89b9998`。打包实查发现Terser产物未保留Turndown/GFM版权全文，安装的两个MIT LICENSE精确相同。将两者2017 Dom Christie版权及许可全文加入根LICENSE.md，与E1归档parser署名一同随既有assemble/npm/Electron deploy链分发，无需另造运行时文件或新增依赖。
- 既有安装探针增加audio-stream.js、LICENSE.md精确字节及三个新HTTP/音频测试套件。真实tarball全新生产安装720文件、211Web产物精确字节、514/514运行时、B1.2回归及相对cd隔离CLI启动通过；该次安装后仅加MIT许可文本，重新组装/pack720并另做最终全新artifact-only安装，许可/源码/Web字节一致。没有将artifact-only声称为重跑514。
- 结果见[B6安装回执](./B6-installed-2026-11-21.json)。实际测试/安装均临时HOME/fake Codex，无真实模型网络或真实凭据迁移。无运行时代码变化，不重跑浏览器构建。
- 本地commit为本节所在独立提交；日志 `/tmp/cxv-b6-installed.log`、`/tmp/cxv-b6-license-installed.log`、`/tmp/cxv-b6-e11-pack.log`。

<a id="e12"></a>
## E12 多轮问答的 CAS body 所有权修复

- E11本地`e5d5180`。实际GUI连续普通回合→问答→最小化时，旧助手答复被重新拼在新问题后，问答仅静态显示；刷新可暂时恢复。不是将静态卡片增加新入口，根因是`materializer`无深拷贝投影→`assembleEntryParts`→`attachInput`复用同一decoded CAS body，给新descriptor附input时改写旧条目。旧引入可追至本地`8d29504c6921d2c3e250cd35d2faae0b274c849d`，不是本轮新增样式问题。
- 已读entry-codec全流、materializer调用、conversation reducer及原normalize终态规则；原终态guard正确，不改它。仅在root.body.input/request.body.input的承载body浅拷贝，保留input条目与nested metadata引用共享，不回退大消息的无深拷贝预算，不复制Claude日志协议。关联B6选区扩展`1b3c2268e3bd0e73ffef043bf450662d01a28371`，这是本地V2必要修复，并非宣称该上游提交包含此补丁。
- 两个新测试在修复前确实失败（旧条目input被新数组改写），修复后schema/reducer/时间戳21/21通过，构建通过；新生产安装525/525、720文件/211Web精确字节、B1.2及相对cd隔离CLI通过，安装探针补entry-codec字节及schema测试。GUI最终回执在后续验收节记录，不将此前失败探针计为通过。
- 证据：`/tmp/cxv-b6-cas-before.log`、`/tmp/cxv-b6-e12-tests.log`、`/tmp/cxv-b6-e12-build.log`、`/tmp/cxv-b6-e12-installed.log`。本地commit为本节所在独立提交。

<a id="e13"></a>
## E13 生产 GUI、连续回合与最终产物验收

- E12本地`755b2b5`。自有临时HOME/两同名工作区/fake AppServer/loopback服务器，使用实际生产构建，Chromium159.0.8154.6和WebKit27.2。桌面2场14图，phone390×844/pad1024×768仿真4场12图，共26图已用contact sheet逐张核看；pad探针实际用`ipad=1`并断言pad-mode，phone保留原0.6缩放，不把iPad UA单独当pad模式。
- 桌面实际检查archive文本/图像decode/200KiB截断/损坏/不支持/32MiB错误、字幕List/Raw/GBK及HTML样文本不执行、音频muted play/seek/真实206/错误下载回退、APNG/PDF分发、同名A→B内容；实际助手/工具KV/diff引用、chip键盘预览、精确wire文本、问答鼠标拖选不切换与Enter切换、portal选区不出浮层；实际Ctrl/Meta+C事件text/plain Markdown和text/html原DOM片段一致。没有把DataTransfer验收冒称跨应用系统剪贴板或物理音频。
- E12复现路径在两引擎各连续5轮、全程不刷新，inline问答唯一且取消后正常释放，10/10通过。原先脚本提前操作流尾/多同名按钮/缺少ipad=1造成的探针失败已更正；早期CountryFlag外部CORS报错不算通过，最终探针固定三个地区查询响应。最终无pageerror。旧失败截图已移到任务临时目录，不混入26张通过证据。
- 三个新viewer整CSS、selectionQuote/markdownCopy整文件及9条quote CSS规则与固定上游精确相同，见[源码样式校验](./B6-source-style-2026-11-21.json)。这是源码与截图互补证据，不声称整ChatView/整composer已在B6核销，B7范围保持。
- 最终`env -u CXV_BYPASS_PERMISSIONS pnpm release:check`退出0：1986=5+610+1159+212、0skip，构建/组装、pack720通过。首跑继承外层bypass=1导致perm-bridge预期不符；受控第二跑既有exec-with-stdin的50ms超时用例一次偶发“未拒绝”，定向3/3及最终全量通过，未修改该B5 helper，保留偶发边界，不能宣称根因已修复。
- E12新安装525/525之后，最终重建源码/许可/audio-stream及全部211Web与安装目录重新逐字节比较通过，未再改变生产源码。GUI回执[26图](./B6-gui-2026-11-21.json)、[桌面](./evidence/B6-preview-2026-11-21/result.json)、[响应式](./evidence/B6-preview-2026-11-21/responsive-result.json)、[连续回合](./evidence/B6-preview-2026-11-21/warm-result.json)。日志`/tmp/cxv-b6-desktop-verified.log`、`/tmp/cxv-b6-responsive-verified.log`、`/tmp/cxv-b6-warm-final.log`、`/tmp/cxv-b6-release-final-controlled.log`。
- 真机/触屏/物理音频、跨应用系统剪贴板、真实LAN/TLS/外部模型/其他OS/最低Node未验；真实模型仍未调用。验收探针/证据为本节所在独立提交，最后收口仅更新文档与映射。

<a id="e14"></a>
## E14 完成矩阵与映射收口

- E13本地`1c91dec2d7400095da9304473875b4d67656ea4f`。汇总[完成矩阵](./B6-completion-matrix.md)、[最终回执](./B6-final-2026-11-21.json)、[13笔完整hash映射](./B6-local-commit-map-2026-11-21.json)，46候选只按B6子项核销，B7及其他混合范围不冒称完成。
- 同步AGENTS/README/规划/提交台账当前状态；26图hash再次核对，最终release退出0与安装字节一致已确认。仅文档及回执，无生产代码变化，不重复测试。
- 自有fixture已停止；本地分支未推送/压缩/建PR/合并，未切换活动安装。下一工作包B7，本轮未启动。物理/其他平台及已列偶发/原基线缺陷边界保留。
