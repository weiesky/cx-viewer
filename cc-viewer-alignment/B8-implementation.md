# B8 实施：代理、模型与提示词

2026-11-22启动；分支 `alignment/b8-proxy-model-prompts`，起点 `e18b7fe`。固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`，研究副本 `/tmp/cxv-cc-viewer-research-20261122` HEAD已核。B8仍进行中，不以提示资产或已有native能力代替整包验收。

## E1 — Code Expert 内嵌 UltraReview 最终规则

- 上游：`8923322f88def98fc3ccaa66d921aa2e3a1c0133` 原先选择P1/P2，后由 `134a0de7ac166db5f9375d9f2c60bcd97248852b` 改为修复全部P0/P1、辩证评估P2；`92ed9bc751c4ba3677487453d387e4565cc9fdb3`清理TeamCreate与镜像漂移。实读三个实际diff及固定最终 `packages/core/src/ultraplanTemplates.js`；未依次恢复已废弃的中间规则。
- 本地：`packages/app/src/utils/ultraplanTemplates.js`为既有唯一执行源，`sync-ultraplan-presets.mjs`同步code-expert JSON与18语言UltraPlan原文。迁入多角色审查、按仓库拆任务、非穷举维度和最终P0/P1/P2处理规则。
- 完整调用链：ChatView `_handleUltraplanSend` / TerminalPanel `handleUltraplanSend` → `buildLocalUltraplan`；自定义载入经 `/api/ultra-agents` → PresetExpertPickerModal → CustomUltraplanEditModal → preferences →同一组装函数。相关组件与两个弹窗CSS均已读；本笔不改DOM/CSS。
- 必要适配：继续使用Codex `<user_instructions>`、动态工具发现、实际并发上限及 `request_user_input`，不写Claude Agent/Teammate/TeamCreate为Codex能力，不改B4 native身份分类。保留本地Git worktree可用的 `git rev-parse`优先查根路径及自动内嵌审查定位。独立交互UltraReview的现有确认策略本笔不改，仍待单独核销。
- 验证：42/42、0skip（生成资产21、loader/handler10、真实HTTP route2、提示分类9）；`pnpm run build`通过。18语言原文与执行模板、JSON按既有校验逐字一致。未执行真实模型审查；没有新增GUI/视觉通过声明，布局样式未变。实际HTTP测试由自身启动并停止19960段隔离server，活动7008未动。
- 本地commit：本节所在独立提交（subject `fix(prompts): align embedded UltraReview remediation rules`）；后续映射以实际hash补记。

## E2 — 独立测分专家 v2

- 上游 `f28d9cae37c40ddb456bd23a819b93105b224217`新增，`1af3d646c92433bf72e7c37230a557636550bbaa`替代v1，固定HEAD最终仍为v2；实读原diff、逐行v1→v2正文差异、最终完整JSON、README及E1列出的完整载入/组装组件和CSS。
- 原样迁入id/version/18语言title/description、素材检查、分析维度、设计技术决策、两轮审查、静态Midscene规则、反oracle、仅生成不执行与交付目录。保持上游独立JSON源，不加入生成manifest/第三个内置tab。仅在既有载入列表增加第三项。
- 必要适配沿用本地既有Code/Research做法：Claude wrapper→Codex wrapper，Ask→request_user_input；Enter/ExitPlanMode→update_plan跟踪文件化报告、request_user_input明确批准；TaskCreate/Update→每YAML一项原生plan状态；Agent→发现当前工具/并发容量，不伪称Teammate；缺所需工具停止依赖步骤。批准未答复/更新plan均不算批准，禁止绕过第二轮；结束按已有生命周期关闭代理。正文改动逐行、元数据及CSS对照见[B8 E2源码回执](./B8-E2-test-expert-source.json)。
- 42/42、0skip通过；真实HTTP新增第三项、18语言字段、载入正文→custom组装逐字与历史只显示用户任务均通过。E1已构建的执行模板未再变，本笔资产/API无需重建Web；pack验证724文件包含新增JSON。
- Chromium159.0.8154.6/WebKit27.2各1场3图：真实点击选择、预览与载入正文逐字、编辑后覆盖确认取消保留草稿、保存并刷新后正文逐字通过，零pageerror。[GUI回执](./B8-expert-gui/result.json)及[可复跑探针](./probes/b8-expert-gui.mjs)。已实看WebKit预览，列表/预览双栏无布局改动。首轮探针把上游span铅笔误作button导致查找超时，修正定位后两引擎通过；失败图留/tmp，不作为成功证据。初始浏览器默认缓存缺可执行文件，设置既有隔离browser目录后成功。
- 隔离native-protocol fixture，不是模型生成/审批执行；没有执行Midscene/真实模型或访问用户环境。模型遵循两轮审查与产出质量仍需在具备原生工具的实际模型会话单独验证：载入模板、提供四类素材、第一轮review→第二轮批准后才生成YAML，预期不启动runner。活动7008未动。
- 本地commit：本节所在独立提交，subject `feat(prompts): restore standalone test analysis expert preset`；E1实际本地hash `d8a0080`。

## E3 — 用户模型提示词的别名匹配

- 上游 `b78a51eb1dc46c8c115b9b6248a197e612f5a838` 的最初K3别名、`fe0c52ff60a2ef9eb13faa72aedbe97029ee0011`用户层方括号后缀与内置层共用展开、`085c21516f446ce690f0a77c4f1b02c5025f4dc1` DeepSeek简写、`17df4e2fbf4a5d0ec1a96431dc10df851c2afd77`原型安全、`6363a51ec02f7b0518df69095dc382b26406ece4`K3版本/路由边界；对应实际diff及固定最终model-system-prompts完整文件已读。
- 本地已有受管JSON存储/乐观锁、真实API与bridge→原生thread/start注入，无需替换为Claude文件/flag实现。完整读取 `model-system-prompts`、bridge注入函数、capability检测、server专家路由、普通PTY runtime及SystemTextModal/ModelPromptTabs/CSS。复用上述链路，仅迁入别名展开与同scope最长匹配；工作区优先于全局、默认fallback、存储安全和新会话注入门槛保持。旧“原始id精确优先”对非别名子串匹配与最长匹配结果本就相同；别名展开后按固定上游选最具体的长条目。
- 回归先红：`k3`错误落default。最终48/48、0skip（model-store8、真实server3、bridge37），`/tmp/cxv-b8-e3-tests.log`。K3大小写/窗口/版本、DeepSeek简写、工作区短项覆盖全局长项、同scope长项优先、k30/k3pro/my-k3不误中及constructor/__proto__/非字符串均验证。原bridge fresh注入/resume不改、失败拒绝与API冲突/安全边界通过。
- 无DOM/CSS、UI布局或默认模型策略改变；未启用内置第三方prompt，无真实第三方模型/热切执行通过声明。纯服务端代码无需重复Web build；最近E1 build/E2 pack724仍为各自检查点。本地独立提交subject `fix(prompts): resolve upstream model aliases in managed entries`；E2本地hash `8e236aa`。

## E4 — 实际原生 fresh/resume/fork 指令绑定验证

- 关联上游 `16267dc04c544de3143856ceaac1a6f408fc2765`的“续接钉扎原指令”功能子项。已读原PTY pin/materialize/manual优先/无记录不注入diff，以及后续 `17df4e2fbf4a5d0ec1a96431dc10df851c2afd77`成功消费闩修复。Claude snapshot队列/SessionStart hook整套实现没有迁入，也未将混合提交整条核销。
- 复用本地已读的受管存储→`injectManagedSystemPrompt`→原生新thread/start链路；resume/fork不重新查当前提示词，因此不需新增snapshot副本或basename身份绑定。实际0.169生成schema确认Start/Resume/Fork三种参数均有baseInstructions/developerInstructions；参数存在不意味着应在恢复时覆盖原指令。
- [可复跑探针](./probes/b8-native-prompt-binding.mjs)使用实际Codex0.169、隔离HOME/CODEX_HOME、阻断外部代理与本机合成Responses endpoint。两种模式各 original→改store→停止原生进程→新进程resume→fork→fresh，共8次原生请求。覆盖指令与追加指令的多行中文、字面 `${verbatim}`逐字相同；resume/fork保留旧值、fresh取新值，宿主developer指令保留。所有自有子进程退出，未调用外部模型或任何工具。[原生回执](./B8-E4-native-prompt-binding.json)为重启加强版最终结果。
- 初始缺CODEX_HOME目录使原生启动失败；修正夹具目录后，原断言误以为baseInstructions在HTTP `instructions`字段，实际0.169把两种原生指令层均编码为developer input。按实际producer核定字段并加强逐字断言后通过；不把失败尝试作为功能通过证据，也未为迎合测试修改运行时。
- 本笔仅验证/证据，无生产代码或CSS改动；E3本地hash `96f7983`。代理模型热切时的提示词策略、SDK传输启用与内置preset仍独立未完成。

## 后续

独立UltraReview策略已列选项向用户澄清，未收到选择前不改。代理统计/profile/角色/模型与fresh-resume-fork链路继续按源码核对，未计完成。


## 本轮检查点（B8未完成）

- 全量 `env -u CXV_BYPASS_PERMISSIONS pnpm test`：2182/2182（Electron5 + Web702 + app1261 + integration214），0skip，`/tmp/cxv-b8-round1-full-clean.log`。首次直接pnpm test继承托管进程的bypass=1，既有perm-bridge reviewer用例输出不符，1fail；清理仅测试进程环境后通过，没有改生产权限或为此改测试。
- 最终 `pnpm run build` 与 `pnpm run pack:dry-run`：通过，724文件；`/tmp/cxv-b8-round1-build.log`、`/tmp/cxv-b8-round1-pack-final.log`。E3改动后首次pack被既有“构建时间早于源码输入”门禁拒绝，重新构建后通过，不绕过门禁。
- 实际npm tarball解包：724个文件与当前源码/构建产物全部精确字节；从解包目录直接import生产loader/组装器/受管模型store，第三专家载入/历史只露任务、K3别名选择通过。[产物回执](./B8-round1-artifact.json)。这是无新依赖安装的artifact smoke，不冒称新生产安装或外部模型验收。
- GUI隔离server55374按捕获进程身份退役，存活后代0/残留0，[回收回执](./B8-round1-fixture-retired.json)；实际原生4个client由其owner await stop并检查ESRCH，活动7008未动。未发布npm/推送或创建PR。
- [54候选矩阵](./B8-candidate-matrix.md)与[完整hash/路径索引](./B8-candidate-index.json)明确区分实际读取、实现子项、已有B4/B7证据与待核项，不把文件足迹当完整源码审计。代理统计当前没有本地producer，不能先搬空UI再宣称完成；已读原3笔修复及实际默认off的重试引擎入口，完整引擎/消费者迁移仍待。
- 两项产品差异已用选项工具提问：独立UltraReview自动修复P0/P1还是先确认；7个第三方模型preset适配后自动生效、手动启用或暂缓。答复前保持现有策略。角色profile/native身份、Responses流/非流/失败恢复、提示热切、模型preset全链路、剩余候选和最终B8新安装验收继续，B8尚未收口。


## 范围调整：代理重试配置与统计整体忽略（2026-11-22）

用户明确“cxv是不需要的，整体忽略掉”。已撤回E5 `26f8b56`、E6 `206a59a`、E7 `7249d35`的生产代码/测试/接线，未提交E8 UI及自有探针/截图同步清理，隔离fixture PID17316按身份停止；保留现有SDK恢复、原生profile路由及原有slow-upstream能力。本笔恢复后的生产tree与E4完全相同，不能引用曾有E5–E7的测试视为当前功能。上述历史commit仍留Git可追溯。重试默认策略/配置/持久统计/界面不再是B8验收前提。

另已通过选项工具确定：独立UltraReview按上游自动修复P0/P1、评估P2；7组第三方模型preset完成必要Codex适配后默认启用，保留禁用与自定义覆盖。优先处理用户新报cxv --sdk面板发送无回应，随后继续B8提示词/模型/原生路由。无发布或PR动作。


## E10 — 用户已选独立UltraReview自动修复

已重新实读134a0de7ac/92ed9bc751实际diff及固定HEAD原18语言codeReview5.desc；按2026-11-22选项答复，只将各语言流程第4条恢复上游“修复全部P0/P1、辩证评估P2，特殊决策再问用户”，AskUserQuestion替换原生request_user_input。原工具发现/实际容量及关闭生命周期保持，不恢复Claude named teammate能力。没有DOM/CSS或菜单重排。

删除E1为旧独立确认策略添加、如今已不成立的内嵌/独立区别句，并按既有sync单源同步18原文/JSON。初测旧用例锁定该区别句失败；改验真正P0/P1规则（不是放宽策略断言），最终31/31、0skip与build通过。未执行真实模型修复；[18语言逐条源码回执](./B8-E10-ultrareview-policy.json)保留原政策和最终政策。本笔独立subject fix(prompts): apply the selected standalone UltraReview remediation policy；SDK前笔c6195b6。


## E11 — 7组上游模型preset资产与只读catalogue

实读固定HEAD全部7篇正文/index、72c059f6b9新增GLM5.3/no-wait实际diff及9c0463bb8c/8fb468ddc8/085c21516f/17df4e2fbf/6363a51ec0/15751cf49c/839f0f85ac/b604b1e4f1后续修复和最终read/render/match调用链。GLM5.2/5.3、DeepSeek V4 Pro/Flash、Qwen3族、Kimi2.7/K3按最终资产迁入；不恢复已合并的Qwen3.7文件或已替代的中间K3规则。保留源manifest title/description/match/defaultMode（7组原默认均override）。

必要适配仅包括：使用实际可用的文件/agent接口而非Claude日志路径/固定Task*工具；不把用户/工具输出中的system-reminder标签提升为系统权限；memory按实际Codex host能力条件化，不宣称目录存在、不手写生成的原生memories或新造索引。保留其余模型特化策略、反循环/工具错误熔断、异步no-poll、谨慎执行/输出与记忆分类。逐行替换与源/本地hash见[B8 E11源码回执](./B8-E11-preset-source.json)。这些正文是应用数据，并非执行本迁移的指令。

原只读list/render去编辑注释/边界、保留字面变量及最长模型match语义复用；原别名函数提为model-id-variants纯模块后从旧入口再导出，避免catalogue与store互相import。manifest文件名严格约束为本id.md，不接受目录跳转。尚不接自动注入（待disable/override控制一并接线），没有默认行为先行改变或DOM/CSS改动。

13/13、0skip（新catalogue2+现有store/API11）、build与pack734通过，8资产+2纯模块被打包；Electron已有pnpm deploy按package.files取资产，无需平台专用重复拷贝。无真实第三方模型遵循、没有新GUI通过声明。前笔E10实际hash1861858。本笔独立subject feat(prompts): ship native-adapted upstream model presets。

## E12 — 内置模型prompt禁用/恢复状态与原API

实读fe0c52ff60固定最终builtin-model-prompts全实现、expert.get/post/presets与SystemTextModal的toggle/materialize/save链。复用现有受管scope目录、0600原子写、文件锁、严格body和revision校验，新增workspace/global双scope墓碑与Qwen3.7→Qwen3禁用身份归一。GET model-prompts增加原builtin行及原生CAS revisions；preset catalogue路由复用原有认证/no-store。未知action不得落空文本删除路径。

原上游墓碑损坏fail-open可能恢复用户显式禁用，按本项目信任/数据保护约束采用可诊断fail-closed（409 invalid_builtin_state，不改坏文件）；symlink、断链、硬链均拒绝。未将墓碑写入用户工程。16/16、0skip与build通过：真实HTTP覆盖7资产、双scope读写、过期/缺revision、拼错action不删原override；磁盘0600、损坏不改字节、链接canary、Qwen旧名禁用保留通过。

尚未改变selectSystemPrompt默认行为或DOM/CSS；下一笔把原UI禁用/覆盖与默认启用一起接好。E11本地dfb562c；本笔独立subject feat(prompts): persist protected builtin prompt opt-outs。

## E13 — 原模型prompt管理界面与默认原生注入

实读fe0c52ff60/69b104cbf3/02ce99f202/d6ec38be82实际diff、固定最终SystemTextModal/ModelPromptTabs/全部CSS/ChipIcon、后续取消自动钉住及完整API/渲染/新thread调用链。直接迁入原页签、内置badge/禁用↺、作用域开关、二级新增模型/AutoComplete/preset、文档入口与菜单CPU图标；不恢复已回退的自动钉住。CSS、ModelPromptTabs、ChipIcon及builtinPromptTabs四文件与固定源码逐字相同，[源码回执](./B8-E13-ui-source.json)。原有Codex能力/隐私提示与受管目录说明保留，API全部固定在弹窗创建时的精确instance。

默认选取workspace用户项→global用户项→未禁用builtin→Default，保持7组原defaultMode=override。只在schema验证支持的原生thread/start注入；已恢复/分叉线程继续原生钉扎。普通boot和新PTY runtime以实际activeModel选择preset，未改原生requested model；当前默认SDK exec及显式SDK AppServer的原能力限制不假冒支持。支持CXV_DISABLE_AUTO_SYSTEM_PROMPT整体抑制。6个preset实际引用的model/locale/OS变量用stdlib纯替换，无现场Git/记忆写入；未知用户变量保持字面量，避免破坏E4字节合同。原模型建议改读native profile.activeModel、默认模型和config.toml model，不引入Anthropic槽位。

受管revision/CAS完整带入载入、删除、物化及第二次保存；双scope恢复部分成功时保留已成功状态/新revision，失败scope可直接重试，不假报整体成功。原已有用户项/新建同名项的shadowed规则和空builtin不物化保持。非button的公共ConfirmRemoveButton补Tab/Enter/Space，只打开原确认，不绕过Yes；原DOM/CSS不重排。

56定向/16 store/API、Web712、全量2202/2202（5+712+1270+215）、0skip通过；全量后键盘小补丁再验Web712和双引擎真实键盘确认。最终build/pack735通过；SDK API路径另由f11e058的36定向补验，不把旧全量冒称包含该后加两例。实际Codex0.169共15次本机Responses：7组默认注入逐字、宿主developer保留；两种自定义模式各跨进程resume/fork/fresh仍逐字钉扎/更新，未知字面变量保留。[真实原生回执](./B8-E13-native-prompt-binding.json)。无外部模型或工具执行。

Chromium159/WebKit27.2各一场完整UI：原文预览、键盘禁用/启用、双scope部分409再试、物化与第二次保存、shadow拒绝、按preset新增、Enter不隐式选中均通过。另用真实profile API设kimi-k3，两个浏览器打开即选当前builtin，native配置typeahead可见。10图及[回执](./B8-models-gui/result.json)，正文/禁用/新增图已核看。480px桌面窗口保留上游flex导致模式标签截短，页脚可滚达；不将其计为完整窄屏/真机视觉通过，未自行改布局。初次探针用了Auto-selected而实际文案是Auto-matched、并把含Ant loading图标的按钮accessible name当精确Save，已按实际DOM更正后通过；不是功能保存失败。

UI仅使用明确标注的native-protocol fixture能力，不代替实际模型producer；原生15请求单独验。所有自有fixture回收，活动7008/ccv进程未动。B8其余native热切、角色路由、剩余候选与最终新安装继续，不将该子项视为整包完成。前E12 f614279，SDK补项f11e058；本笔独立subject feat(prompts): enable upstream builtin model prompts with native controls。

## E14 — 显式native指令优先

实读固定最终system-prompt-files/launch-config手动flag抑制链与system-prompt-live的manualSystemPrompt门；原生thread/start具有baseInstructions/config字段，turn/start不具备基础指令替换字段。复用现有配置读取：调用方显式baseInstructions（含空字符串）、thread config或global config的model_instructions_file均抑制自动preset；宿主developerInstructions继续保留。未改原生配置、未把手动文件读取成受管存储。项目其他配置层/CLI参数最终由native映射的边界仍需继续核验，不冒称完整配置优先级审计。

12/12定向、0skip；实际Codex0.169的显式base与本机指令文件各一请求，Unicode/未知字面变量逐字、宿主developer保留、无preset覆盖，全部自有子进程退出。[原生回执](./B8-E14-native-manual-prompt.json)。没有外部模型/工具执行。E13 aa86dbf；本笔fix(prompts): preserve explicit native instructions before automatic presets。

## E15 — Kimi最终头像与模型别名显示

实读e932bbef2e头像/模型/Context完整diff，6363a51ec0与f2ebb0fe6b实际头像匹配及回归diff，固定最终helpers模型表/getModelInfo/缓存、SVG、ChatMessage ModelAvatar、RoleFilterBar、TeamSessionPanel的调用与CSS。最终SVG与Kimi provider整块逐字迁入，不改组件或CSS；K3/K4版本/路由/窗口后缀命中，k30/k3pro/k40/k4pro不误中。[源hash回执](./B8-E15-model-logo-source.json)。Context窗口推断与353K条按已选方案保持，其他混合scope独立核销。

build通过；实际helper输出12别名/4反例通过，Chromium159/WebKit27.2各检查16/20/32/128px两主题：点固定rgb(23,131,255)，字形dark白/light黑，2图已核看。[资产回执](./B8-model-logo-gui/result.json)。这是资产预览，不冒充完整产品GUI或真实第三方模型；首次未设PLAYWRIGHT_BROWSERS_PATH未找到1255，复用已有隔离浏览器后通过，没有新下载。E14 498d771；本笔fix(models): align Kimi logo and final model alias display。

## E16 — 范围核销与当前产物检查点（B8未整包完成）

[范围审计](./B8-scope-audit.md)记录本轮实际读取/既有B4证据复用边界：重试专属617/82/fa随用户排除；ccswitch最终loader明确仅Claude鉴权/provider，不新造缺席的Claude-only导入器；七个已删易变占位本轮执行renderer仍逐字保留；紧凑chip复查，角色摘要未冒称；插件/base URL完整链仍B10待。目录搬移完整验收B11继续。本笔无新生产代码/DOM/CSS。

最终env -u CXV_BYPASS_PERMISSIONS pnpm test 2205/2205（5+712+1273+215）、0skip；build与pack735通过。首次pnpm test继承当前代理的CXV_BYPASS_PERMISSIONS=1，perm-bridge defer一项实际走bypass而失败；未改生产权限判断，按既定clean env完整重跑通过，两个日志保留。通用新安装探针增加本轮6个实际套件与全部pack文件字节检查，真实npm --omit=dev新安装656/656、735包文件/211Web精确字节，B1.2及隔离相对--cd启动通过。没有npm publish/推送/PR/活动进程重启。[完整回执](./B8-E16-checkpoint.json)。

只读活动7008/PID38260：PTY及队列已具备、sdkMode=false，不替代该实例GUI；已同步纠正根入口旧状态。用户故障SDK地址与外部模型仍待；独立合成端点/GUI/原生收发证据见SDK调查，不误称用户现场完成。E13 aa86dbf/E14 498d771/E15 a91a008。native热切方式已提问待答，角色分源/无GUI共享提示链及剩余混合候选继续；本检查点不是B8整包完成。

## E17 — 用户最新选择：仅新会话生效

用户先在补发选择题选了跟随模型热切换，随后明确更正为“只在新会话生效”，以最后指令为准。当前实现与该选择一致：仅schema验证通过的thread/start注入，现有/resume/fork保留native持久化指令，不接代理层live system/按模型热切快照，不把该子项记为迁入完成。期间仅阅读调用链，无热切生产代码或后台行为启用。原E4/E13实际native跨进程钉扎证据继续有效，不重复确认或为文档变更重跑测试。E16 da4b998；其他角色/headless/混合scope继续。

## E18 — 内部参数保持在字面 -- 之前

实读d5e66ec1d8实际CLI/launch-config/PTY diff与固定最终insertBeforeDashDash，追本地runProxyCommand/logger bootstrap、普通CLI及新PTY最终配置/OTel链。复用原生argv列表加一个stdlib splice纯helper；最终CXV config插到用户配置之后、首个字面--之前。OTel去重到--停止，不删除用户提示中的-c/otel字符串，最终OTel同样前插。未引入Claude thinking-display旗标或挪动prompt字节，无UI/CSS。

21/21定向（cli args/OTel/PTY args/runtime）、0skip；实际Codex0.169 exec隔离HOME/合成Responses：旧顺序native直接unexpected argument、0上游请求；修后exit0/1请求，中文与内含--/-c/otel的单个提示逐字、固定回复收到、自有子进程退出。[原生回执](./B8-E18-native-literal-args.json)。初次探针漏建自有CODEX_HOME目录，native报不存在；补目录并加强旧路径必须匹配unexpected argument后重跑通过，不计初次环境失败为红测证据。无外部模型/工具执行。E17 515dc6c；本笔fix(cli): keep owned config options before literal prompt arguments。headless受管指令本身继续独立，不因参数顺序修复勾整条。

## E19 — 原生容量/压缩水位调研与无GUI选择

用户选择无GUI继续适配完整提示词链；容量选项未作产品选择，改要求先调研Codex最新水位。应用openai-docs技能，读官方最新稳定0.171.0（11月20发布、ccf9be8）及本机0.169（d32063f）/main357fe24相关实际源码、官方配置参考；模型可用窗口/普通压缩阈值/后台投机水位/12K百分比基线分别核对。[调研报告](./B8-codex-context-research.md)与完整来源。

实际本机native0.169+隔离HOME+显式0.171公开目录+本机Responses5请求：同一thread Sol/Astra/Sol回报475000/258400/475000，100K覆写95K，1M覆写按max872K裁为828400；last与累计字段不同、全部自有子进程退出。没有外部模型或实际压缩触发通过声明。当前CXV固定353000缺口成立，暂未更改生产显示/用户原生配置；无GUIprofile配置预检发现native拒绝--profile用于AppServer，完整适配仍继续，不移入未验实现。E18 7852d65；本笔docs(alignment): research native Codex model windows and compaction thresholds。

## E20 — 无GUI受管提示词准备模块

沿用E18已实读d5e66ec1d8与launch-config完整调用链，核实际native exec帮助、config/read schema与0.171 loader/profile优先级：profile在user之后、受信项目与runtime之前。Native明确拒绝--profile用于AppServer，不能直接转发。本笔尚不接CLI：新prepareHeadlessSystemPrompt复用现有native stdio client只读配置、受管selector/字面renderer；由原生命令处理原argv，检查时不将prompt/stdin/恢复/fork/review当新会话。支持原生紧凑短参数、特性开关和image参数边界，未知新旗标拒绝自动推断。

库内/stdlib无完整TOML parser；新增固定smol-toml1.9.1（官方仓库确认Node/parse接口），只解析profile的4个字符串字段和发现配置守卫，不重写用户文件或凭据。复用native origins保持project/runtime高于profile；profile改变项目发现/trust、遗留冲突、非法路径、损坏或过大文件时拒绝猜测（尚未计该复杂profile边界已适配）。原生model_instructions_file/instructions手动优先。override写独立0700目录/0600文件，幂等清理；append采用原生-c developer_instructions，把已有宿主文本与受管文本合并，参数正文不写诊断日志。kill switch/resume/fork不读新prompt。

18/18、0skip，build/pack736通过（首次pack因新增lock使Web构建过期被保护拒绝，重建后通过）；实际本机Codex0.169 exec+本机合成Responses7请求：fresh覆盖、改store后跨进程resume/fork仍旧字节、新fresh更新、追加与宿主保留、profile多行追加、手动文件优先通过；覆盖临时文件回收。[回执](./B8-E20-native-headless-prompt.json)。最初resume探针未带--skip-git-repo-check被原生信任检查拒绝，补同夹具的parent exec旗标后通过，未改生产信任策略。后补参数紧凑/enable/image边界及UTF8严格解码再验18项；未把隔离响应当外部模型或CLI入口接线已完成。E19 2bb9798；本笔feat(prompts): prepare managed instructions for fresh native exec launches。

## E21 — 无GUI真实CLI接线与中断清理

再核d5e66ec1d8完整diff/固定最终runProxyCommand及launch-config，沿用E20准备模块接入原生codex run入口；保留原logger捕获、原argv/字面--，仅fresh准备，resume/fork不再选新prompt。原生允许prompt位置后继续出现旗标，预检也扫描到字面--才停止，避免后置手动文件被覆盖。配置探测不支持的新旗标/复杂profile保留原命令并给通用跳过提示；受管库损坏/私有文件失败则不启动，诊断不泄漏正文或解析片段。使用既有shutdown协调器+AbortSignal等待自有config/read子进程退出，临时文件在exit/error/shutdown清理。无DOM/CSS变更。

25/25定向、0skip通过；实际完整CXV CLI + Codex0.169 + loopback Responses共7请求：覆盖/更新/追加/profile/后置手动文件优先、跨进程resume/fork钉扎逐字通过；6个native归档有请求/回复标记，覆盖文件请求期间0700/0600、进程结束后删除，无GUI启动或跳过告警。[回执](./B8-E21-native-headless-cli.json)。中断用例实际发SIGTERM，确认exit143、探测PID消失且exec未启动。测试夹具最初把app-server探测也发到模型端点，已补真实RPC分支；全量首轮另发现E18后hoisted PTY夹具的cli-args空stub缺导出，改用真实cli-args副本，完整回归重跑中。无外部模型/工具执行声明。E20 83ba649；本笔feat(cli): apply managed prompts to fresh headless Codex sessions。

## E22 — 用户已选：原生窗口/本轮用量

基于E19官方0.171/本机0.169调研，用户明确选跟随原生窗口、未知不猜1M，替代此前353K决定。再读3a2159219b/ec14cd0234相关实际diff、固定最终core/context-watcher/helpers/LiveTagPopover及CSS，保持原bar/popover/移动抽屉布局，不迁Claude模型名推测/校准表。普通bridge已有native窗口；补SDK AppServer丢失的modelContextWindow贯穿terminal事件→manager→adapter→V2/SSE。只接受自有native producer的末轮窗口，last.total_tokens优先、缓存不重复计、total_usage累计不作分子；百分比按原生12K基线/remaining四舍五入转used。最新entry窗口缺失时不借旧SSE/旧百分比；移除零值记忆回弹，未知显示“—”且fill为0。SDK exec没有等价窗口字段，诚实显示未知；未为此扩大原生权限/修改配置或推断上游模型名。

50定向/0skip、Web712/712、build通过；首次pack因最后注释触及共享Web输入后未重建被保护拒绝，重建后pack736通过；E21完整重跑2215/2215（5+712+1283+215）与0skip已完成，不冒称包含E22。实际Codex0.169共7本机Responses：普通同thread475K↔258.4K/覆写95K与828.4K，及SDK AppServer两模型完整transport/adapter管线，当前20100得2%/3%而非累计990K；[回执](./B8-E22-native-context-display.json)。无实际压缩触发或外部模型声明。

Chromium159/WebKit27.2两引擎原UI完成2%→3%→未知、刷新仍未知、同名邻实例无借用、桌面mobile=1抽屉展示未知，8图/[回执](./B8-context-gui/result.json)。已核看最终desktop与抽屉截图；首次截图处于抽屉动画中，补等待后重拍，未算视觉通过。WebKit已记录地理接口/导航中snapshot的access-control abort，功能pageErrors为0；首次浏览器缓存路径错误复用既有隔离安装后重跑，未下载新浏览器。未将桌面mobile=1计真机/窄屏通过，所有自有fixture回收。E21 b03a08f；本笔fix(context): follow owned native model windows and current usage。

## E23 — 原生角色分源的工作区状态与纯解析

用户已选择按原生能力适配：主/子代理分源，可靠线程归属链才启用、SDK exec不可用、隐藏Teammate。实读3cc05b496d完整diff及固定最终interceptor-core角色解析/merge、workspace active读写/watch、preferences、ProxyModal与CSS及add350后续隐藏；本笔只落状态模块，未接生产路由/UI。复用V2项目目录分配/路径编码（同名项目去重、canonical cwd），active-profile.json保留上游{activeId,roles}语义，加版本/CAS/现成文件锁/原子0600写；未提交字段保留，subagent follow/Default/源/悬空follow与official Default休眠沿用。Codex无Teammate，拒绝提交该role；损坏/链接/未知版本fail-closed，主源悬空拒绝默默花费Default配额。写catalogue回调失败时不改角色状态。

3/3、0skip：同名目录隔离/逐字段merge/CAS、follow/Default/悬空/官方休眠、损坏/符号链接/回调失败保留逐字通过。首次夹具先用/var路径分配V2、模块再canonical至/private导致路径不同，改夹具统一realpath后通过；不是状态文件丢失。无GUI、网络/实际native声明；接线和协议归属证明下一笔。E22 e630ea2；本笔feat(proxy): store native role assignments per workspace。

## E24 — 自有原生线程身份与分源路由

沿E23实读3cc最终interceptor/proxy/native调用链，Codex只依据该proxy所属bridge/SDK AppServer协议元数据证明root或至root的子线程祖先；临时title/未知/异owner/断链/循环均不认角色，SDK exec无身份回调能力不猜。逐workspace主源/子源解析复用E23与既有profile重写/凭据/双wire适配；只扩AsyncLocal可信owner字段，用户body/头中的role/提示文本不能确立角色。Native turn metadata加入既有逐回合路由钉扎，并纳入owner/cwd/thread边界；损坏或本进程已观察的角色文件被删时fail-closed，避免回落Default。外部URL对象支持由现有回归发现后已修正。

实际探针发现原生子代理HTTP session-id仍是root session，而真实child thread_id在client_metadata内JSON turn metadata中；初版只看头导致3请求都走main，未误报通过。改为以thread_id作lookup、仍由所属协议通道证明祖先后，实际本机Codex0.169受控collaboration.spawn_agent→真实child线程成功：主2请求gateway-main、子1请求gateway-child，bridge/SDK ownsThread两种独立证据相同；Default0请求，全部自有native进程退出。[真实原生回执](./B8-E24-native-role-routing.json)。只用loopback合成Responses控制工具回合，没有外部模型或shell工具；不得把它表述为模型自主选择验证。

55定向加E23状态3项共58，包含真实HTTP子源/同名邻workspace/伪造body和异thread不误路由、共享root头+嵌套metadata、同native回合改角色后仍旧源/新回合才更新、损坏不请求上游。最终重跑见日志，API/原UI尚下一笔，不计整项完成。E23 ade08fd；本笔feat(proxy): route requests by owned native thread roles。

## E25 — 原生能力门、工作区API/CAS与新会话模型选择

沿3cc原preferences/工作区watch完整链接线：GET新增工作区active/roles/revision、是否显式分配/official休眠及native能力；modern POST携workspaceRevision时在既有catalogue/凭据锁内按工作区CAS保存，catalogue.active保留global fallback。旧API仍保留global写入和.bak语义；无法证明线程的transport只允许原role值回传，不允许修改角色。目录/role危险状态拒绝覆盖。复用watchFile按工作区刷新原proxy_profile SSE，跨进程生效；绑定路径变化重新注册，stop回收watchers。两文件更新的catalogue失败不改role；role后置原子写失败不承诺跨文件事务，原错误/后续CAS刷新保留，不尝试回滚加密凭据。

所有新thread/新PTY/无GUI提示选择改查所属工作区主源模型，headless按实际-C工作区调用resolver；manual/resume/fork不调用新resolver，仍遵守“仅新会话”。SDK exec role能力明确false；PTY只有bridge成功才标能力。UI仍下一笔，未新增布局或Teammate。

35定向/0skip：真实HTTP scoped CAS/同名目录、catalogue active/凭据mask保持、SDK exec不可变更roles但可回传旧值、Default休眠保存/恢复、真实独立Node进程写角色触发既有SSE，且未启动native模型进程；现有加密备份/损坏源/失败保存回归通过。初版优化误跳过legacy不变写入的.bak、把unsupported transport的原值回传也拒绝，均由现有测试发现并修正，未降低实际角色变更能力门。

实际完整CLI+Codex0.169/loopback共8请求：工作区主源K3优先于native显式GLM的受管prompt选择（原生requested model不改，wire按现有代理源替换），覆盖/追加/profile/后置manual、跨进程resume/fork/fresh与私有文件/7原生archive抓包均通过。[回执](./B8-E25-headless-workspace.json)。无外部模型/工具执行；E24 f8ff34b，本笔feat(proxy): expose scoped native role settings with capability gates。

## E26 — 原角色管理区与紧凑主源标签

再读3cc原ProxyModal完整源码/调用方/CSS，7c紧凑标签、c66原输入槽/终端Header fallback和add350最终隐藏关系。直接迁角色区与badge的39行CSS，逐字hash见[源码回执](./B8-E26-role-ui-source.json)；保留原Main/Sub行、Default休眠/跟随/显式badge、compact只显示Main标签和tooltip、PC/Pad/手机原入口。Codex必要差异：全部隐藏Teammate；Sub以所属实例native能力门禁用并说明，Main可选；复用已有pending/双CAS/错误刷新与删除回退。新增可访问label/useId与键盘，不重排界面或复制Claude配置字段。18语言原6词条直接迁，原角色摘要只去Teammate分句；能力说明18语言齐全。原profileDisplayModel抽纯helper供两标签位置复用。

AppBase原读取链合并为同一精确scope读取方法；源事件不直接覆盖global active。代次/读取序号拒绝迟到GET覆盖保存结果，所有失败重读实际落盘状态，显式工作区Default不再被启动auto-match抢回。受管prompt仍仅新session；18份ProxySwitch概念说明补当前工作区与native/SDK exec范围（既有非中文文档沿用英文fallback），未宣称native支持不存在的Teammate。

Web715/715、0skip/build通过，完整2228/2228（5+715+1293+215）、0skip。两浏览器Chromium159/WebKit27.2原UI共8张最终图：键盘打开Sub选择、原badge/compact、跨窗口watch、409后原值保留、Default休眠后恢复、删除源scrub到follow、SDK exec Sub禁用/Main可用、桌面mobile=1原抽屉均通过；最终图已核看，pageErrors0，未启动native/model进程。[GUI回执](./B8-role-gui/result.json)。首个鼠标探针点到被AntD选中文字覆盖的readonly input，改用正常focus/ArrowDown；首批动画截图重拍后才核视觉，历史failure0保留不算通过。桌面mobile=1不算窄屏/真机；自有fixture已退出。E25 1e10d01；本笔feat(proxy): align native role controls and compact source labels。剩余候选/生产安装/最终整合继续。

## E27 — 子代理模型回报不污染主会话

最终角色调用链复核发现，既有proxy onResponseModel只回传模型名，SDK manager会把同实例child的wire模型当成root模型；两种transport真实HTTP夹具先复现wire-child覆盖root。复用E24原生thread metadata/所属proxy角色证明，把单请求线程身份带入内部模型回调；AppServer仅接受可证明main的回报，exec以官方SDK已建立的root thread排除其他明确thread（未提供身份的legacy回报保持原兼容，不冒称exec可分源）。代次失效仍先拒绝。无UI/权限/传输默认值变化。

33/33、0skip：同一manager入口的exec/AppServer各发root与child两次实际HTTP，最终entry/idle状态保留wire-main、没有child模型状态；proxy redirect/多次reroute/原manager/角色路由回归通过。初次AppServer测试夹具只读argv而该旧transport仅传env，补夹具真实env分支后才得到两模式共同的有效红测；绿测最初错读sessionInfo.model，改读原有getStreamingState后通过，未新增为测试用的产品字段。无外部模型/新GUI声明。E26 3c51eea；本笔fix(sdk): keep child response models out of the root identity。另发现显式SDK AppServer仍仅env重定向，实际default provider探针30秒0本机请求，下一笔补同E8的显式native endpoint。

## E28 — 显式SDK AppServer默认provider抓包重定向

沿E8官方SDK的baseUrl原生序列化与E27实际探针，AppServer也需显式传openai_base_url；仅OPENAI_BASE_URL env在本机0.169 default provider实际30秒0本机请求。复用现有serialize/argv链，在用户配置之后只追加自有proxy endpoint，无proxyPort不覆盖。其他native config/字面字符串/env保留，不改默认transport或权限。

修后实际Codex default provider完成main2/child1、Default0，bridge/SDK双归属证明，全部自有进程退出，无外部模型/shell；见[B8-E28红测](./B8-E28-default-appserver-red.json)和[绿测](./B8-E28-default-appserver-route.json)。定向AppServer/root模型测试通过，最初未设既有CXV_TEST/CXV_LOG_DIR导致日志watcher存活，已只停止该自有runner并按包脚本环境重跑，不算产品失败或通过。E27 0348c98；本笔fix(sdk): redirect the native AppServer default provider explicitly。

## E29 — 长断线后控制流继续恢复

实读77b61实际sseChannels diff/固定最终完整manager、AppBase绑定/i18n；本地B2固定scope实例根并无multi-channel manager，复用现有单control stream与mux facade。十次2–32秒退避耗尽后改30秒慢连接，同一轮只提示一次（18原词条逐字），成功/事件恢复预算并取消旧timer；首次未open也受45秒watchdog保护，重建/卸载/本地日志取消旧连接和timer。不迁proxy retryConfig驱动的off-mode idle watchdog，不触碰用户排除的代理重试配置/统计。

实际React类+确定性transport/clock红测先复现首次无watchdog，修后覆盖10次失败→持续慢恢复、一次提示/无重复timer、onopen恢复预算、精确instance URL、旧流关闭、卸载不复活/草稿保留/无模型输入重放；Web716/716、0skip通过。旧非连接测试fake source补close契约、计时器stub覆盖新arm seam；首轮fixture遗留watchdog等待到清理，记录原日志不算最终通过。无新布局/CSS或GUI视觉声称。E28 02d820e；本笔fix(web): keep the control stream reconnecting after long outages。

## E30 — 54候选逐子项收口审计

E29 81ab51f。再次实际读取cdf/2ea/b01/a3/919/ec14/add350/729的相关diff与固定最终调用链，对照本地proxy→manager→WS→ChatView、原CSS/移动layout/任务状态；729逐请求policy无缓存和原生不同import结构不造空leaf/listener。f2 merge使用第一父diff确认resume-route只修Claude测试依赖；085 user_id parser无本地消费者，17df shell/watchdog与native持久指令前提区分。同步54行矩阵/JSON与最终scope表；所有B8功能责任均已有实现/复用或用户明确排除/原生不适用依据，混合B9–B11逐项继续保留。无生产代码修改；最终完整、构建/安装仍在执行，不提前声称通过或已合并。

## E31 — 最终完整/安装/真实SDK验收

E30 0f41f85。最终完整2232/2232（5+716+1296+215）、0skip，build/pack737；全新生产安装685/685、全部737包文件与211Web精确字节、B1.2隔离回归与相对--cd CLI启动通过。见[最终检查点](./B8-final-2026-11-22.json)。最终未改生产代码；扩安装用例由E30保存。

真实完整cxv --sdk+官方SDK0.142.5+Codex0.169默认exec，Chromium159/WebKit27.2各两次发送、完成后服务端idle/发送恢复、刷新无重复、4wire记录保留且原生规范SDK归档恢复通过；4张最终图已核，见[B8-final-sdk-gui](./B8-final-sdk-gui/result.json)。fixture使用离线gpt-5，原生metadata fallback诊断按原文可见，不代表真实模型目录或外部模型遵循通过。首个runner未指向既有隔离浏览器缓存即未启动；再跑WebKit初始换instance取消snapshot被旧probe误列pageError，修probe明确初始导航期，与原导航取消记录方式一致。又补真实busy=false+发送恢复后才截图，避免把响应文字出现误当整轮已空闲；历史webkit-failure.png保留不算最终四图。最终pageErrors0，WebKit两条外部定位CORS另列。全部自有最终fixture/CLI已退出，活动7008未动。

B8功能验收已通过；下一步按用户授权备份/整合全部本地commit、建main PR、自核实际CI并合并，合并后才把全局进度标完成、准备B9。

## E32/E33 — 整合前原始映射与格式复核

原E31 bd45cc9、原映射元数据fe8e250；整合前git diff --check发现model-id-variants末尾多一空行，7983660只删除该空行。无行为变更，不重写新测试；build/pack737及完整新生产安装685/685/全部包-Web字节又重跑通过，最终回执已刷新。原始提交已备份，整合前再补最终映射/更新备份；B8全局完成仍待真实PR合并。

## E34 — PR #9合并与B9准备

37原始提交（含最终回执元数据eed714f）经完整备份/已验bundle后整合e2ee6e3；原/整合/GitHub精确head/合并main tree均ae05e2959919990bddf0ac4ddf06558a0499654e。实际分页核238文件相同，无PR checks，仅发布workflow，CLEAN/MERGEABLE且--match-head-commit保护后PR #9于2026-11-22T10:23:04Z合并6106d41c5da0509595ed1d5a108bec6ab6d09513。合并后才更新AGENTS/README/规划/完成矩阵/台账，补B9交接与14待审候选，不执行B9。完整原hash与备份见[B8整合记录](./B8-local-commit-consolidation-2026-11-22.md)。
