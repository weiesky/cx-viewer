# B8 候选与逐子项进度

固定上游74cd752d；主索引、交叉候选与B7交接提示资产链去重共54笔。完整hash/第一父diff路径见[B8索引](./B8-candidate-index.json)。路径索引不是源码审阅或完成证据；各笔实际读取边界见[B8实施](./B8-implementation.md)。

| 上游 | 范围状态 |
| --- | --- |
| `3eb16102e5` | 用户明确排除：代理重试配置与统计整体忽略，E5–E7已撤回 |
| `51b3443e57` | 用户明确排除：统计UI/刷新整体忽略 |
| `935a33cc0a` | 用户明确排除：重试统计聚合整体忽略 |
| `60cb46ce98` | 统计历史说明随整项排除，不复制上游版本历史 |
| `1db2a38eab` | 本轮实读完整diff/最终loader，仅Claude provider/鉴权、明确跳过Codex；本地无导入链，不新造Claude-only实现 |
| `25e118170c` | 用户明确排除：新增重试引擎整体忽略 |
| `617da66c96` | 用户明确排除：仅重试模式流空闲保护/统计清理随整项忽略；普通代理慢请求反馈保持 |
| `82db2b907c` | 用户明确排除：重试统计专属图表/配色整体忽略，不新增无消费者的BarChart/token；发布B11 |
| `e932bbef2e` | E15逐字最终Kimi蓝点/主题SVG完成；原模型wire E13已验，Context旧353K已由用户E22原生窗口选择替代；发布B11 |
| `9c0463bb8c` | E11最终反循环资产+E13默认注入/实际native wire完成；模型实际遵循未验，history/release B11 |
| `b78a51eb1d` | E3用户别名+E11/E13内置K3 native默认匹配完成；发布元数据B11 |
| `69b104cbf3` | E13原新增模型/typeahead/preset UI及native字段建议完成，双引擎Enter不隐式选择通过；发布/多语言README属B11 |
| `02ce99f202` | E13模型匹配默认页签/CPU菜单完成；自动钉住已由d6回退，未恢复无当前消费者的旧status轮询；Electron专属B11 |
| `3cc05b496d` | E23–E26工作区CAS/跨进程watch/原角色UI与原生所属线程分源完成；E24/E28实际main2/child1证明；SDK exec角色不可用、Teammate隐藏；重试统计字段随用户排除，发布B11 |
| `729b886893` | 实读上游拆环/目录通知与本地完整import链：本地无同类静态环，allowed roots逐请求现算无缓存失效问题，不造孤立leaf/listener；全包boundary gate/CI与路径整理明确归B11未整笔完成 |
| `f9467bfc83` | 复用B4 E42逐对目录审计，B8现有native引用沿用；全包路径/worker/hook归B11未整笔完成 |
| `16267dc04c` | E4实际跨进程fresh/resume/fork8请求、E13/E14/E21/E25新会话/手动优先与native恢复钉扎完成；native已持久指令，不复制Claude snapshot/transcript hook；发布B11 |
| `72551f625b` | E13仅六个实际native变量，无七个易变采集；本轮执行renderer验证旧占位全部逐字保留 |
| `f28d9cae37` | E2测分专家v2资产/载入链路完成；v1已由1af替代，发布元数据仍B11 |
| `fe0c52ff60` | E11/E12/E13原内置资产/CAS禁用/默认启用及原UI/native新thread注入完成；热切按用户最新选择不迁，保持resume/fork钉扎 |
| `1af3d646c9` | E2最终v2资产/载入链路完成；实际模型遵循与YAML质量未验，发布元数据仍B11 |
| `7c1963aca1` | E26原Main compact标签/角色tooltip完成，默认休眠与缺失源跟随、SDK exec不冒称子源；原slot/CSS及双引擎8图通过 |
| `3a2159219b` | 用户改选原生窗口；E22原生/SDK AppServer窗口+last用量/未知态完成，不迁模型名猜1M，SDK exec缺失窗口诚实未知 |
| `72c059f6b9` | E11最终7资产含GLM5.3/no-wait、E13实际7模型逐字注入完成；外部模型遵循未验 |
| `73557f1989` | GLM5.3资产实际pack735已验；不复制上游tarball清单，发布基线统一B11 |
| `8fb468ddc8` | E11以native agent接口替代Claude文件路径，E13逐字wire完成；真实模型遵循未验 |
| `fa77ecd681` | 用户明确排除retry-stat生产器，本地无此分片；不新增该专属legacy sniff分支 |
| `d5e66ec1d8` | E18已迁native内部参数在--前插入/OTel不吞literal提示，实际exec红/绿通过；E20/E21 native headless准备/完整CLI7请求与中断清理通过，复杂发现profile明确跳过、发布元数据B11 |
| `085c21516f` | E3/E11–E14/E21/E25别名/最终资产/六变量与新会话注入完成；live文本热切按用户最新选择不迁；刷新空白复用B4 E18与SDK去重修复，Claude user_id parser无本地消费者；retryConfig排除、README/release B11 |
| `17df4e2fbf` | E3/E12别名/旧墓碑安全归一、E13/E21纯变量、E24原生身份完成；Bind A热切按新会话选择不迁；native恢复已有持久指令，无Claude snapshot丢失前提，不造误报watchdog；shell hook观测/README完整链归B11，窗口由E22替代旧决定 |
| `b604b1e4f1` | E11最终no-poll/去防御句资产与E13实际注入完成；版本/CHANGELOG/history归B11 |
| `8923322f88` | 旧优先级由134/92替代；E1内嵌与E10独立18语言最终P0/P1/P2策略完成 |
| `133bc219df` | 复用B4 E47–E49真实native MCP/模型chip/稳定dispatch，E27补root模型身份；无分类producer的Context面板保持已选明确不可用，E22原生总窗口独立；README/release B11 |
| `58493d1c85` | 本轮只核文件范围/归属，目录插件服务/面板完整链归B10待，不冒称已审全部源码或已完成 |
| `c66b5fe2ed` | B4 E49原组件/CSS/slot/SDK与PTY fallback完成，E26补角色compact/tooltip及双引擎GUI；元数据B11 |
| `6363a51ec0` | E3/E11/E13 K3别名/策略/native默认注入、E15头像边界完成；旧353K选择已由E22原生动态窗口取代，不按模型名猜容量 |
| `f2ebb0fe6b` | E3/E11/E13别名/策略、E15头像完成；窗口由E22替代旧353K选择；实读第一父resume-route差异仅测试依赖初始化，native无Claude plaintext resume queue，复用B3/B7精确PTY与E4/E21实际恢复，不造旧夹具；发布B11 |
| `9c36b5b5a7` | 复用B4 E60/E66原分类入口/颜色与滚动源码核对；Codex无真实分类producer，保持明确不可用，不画假分类；容量E22动态原生，发布B11 |
| `5ee6739cba` | E22原槽bar/popover/移动抽屉按native窗口和last用量完成；分类/Claude MEMORY估算无原生producer，不造假数值；native memory入口与只读边界复用B5，scheduled executor精确instance子项归B9，发布B11 |
| `134a0de7ac` | E1/E10原生内嵌与18语言最终自动P0/P1策略完成；实际模型修复未执行，混入permission countdown明确随B9权限producer核验，不整条完成 |
| `15751cf49c` | E11最终K3真实验证调度规则/E13注入完成；实际模型遵循未验 |
| `cdf05bf8ee` | 本轮再读实际CSS/markers与最终链；复用B4 E16/E19/E20的native原文重试反馈/手动单次续接及原CSS；结构标记替代按用户文本前缀隐藏，真实协议/原GUI已有证据；不引入用户排除的proxy重试引擎/统计，发布B11 |
| `77b61bd571` | E29控制SSE慢恢复完成/Web716；发送失败复用B2/B4定向回执/草稿保留，native construction failure按既有异步错误契约适配；retryConfig off-mode watchdog按用户排除，plugin approval timeout完整链归B10，发布B11 |
| `2ea5181df8` | 本轮再读实际diff/最终helper，慢反馈复用B4 E21/E22；composer border-box/268px复用B7 E16，原生task所有权/新批次复用B4/B7且真实model plan producer未验；多指anchor/清理复用B5移动滚动，Teammate工具文档按native能力/18资产处理；发布B11 |
| `92ed9bc751` | E1/E10单源执行资产/18原文/独立native工具规则完成；不复制冗余镜像/Claude能力 |
| `b01ff6f502` | 本轮完整diff复核：仅slow测试正等待/requestId和关闭listener；本地createProxy已逐实例stop，B4 E21真实HTTP/30秒首body等待与settle验证复用，不加全局lastServer测试缝 |
| `a3cc12619f` | 本轮再读完整相关diff：slow终态/tick/重放复用B4 E21/E22，原生task实例根拒绝串线；两终端共用watchMobileFixedLayout已有40×50ms可见重试/ResizeObserver/viewport/卸载清理，真机未验；发布B11 |
| `57c732d037` | 本轮只核文件范围/归属，公开base URL/反代/插件prefix完整链归B10待，不冒称已迁入 |
| `839f0f85ac` | E11最终工具错误熔断资产/E13注入完成；实际模型遵循未验 |
| `d6ec38be82` | E13按最终源码仅菜单/手动钉住，未恢复已回退自动钉住；两个浏览器菜单通过 |
| `96f3a7a44e` | 复用B7 E19原更多Modal/三视图/txt导出/空计数和分项GUI证据；本轮无剩余B8运行时缺口，不冒称重跑该GUI；发布B11 |
| `919fded845` | 本轮再读实际settle/replay/原提示链，复用B4 E21/E22逐请求快照/首body/取消断线关闭settle一次/WS open-close清理与真实GUI；最终全量再覆盖，发布B11 |
| `ec14cd0234` | 复用B4 E46原通用WS keepalive/watchdog/前台恢复/不重复队列输入；E22补native窗口/last用量，分类专属provider/reducer无原生数据源不造空请求/未来ts缓存；发布B11 |
| `add350bc52` | E26按实际最终gate隐藏Teammate全部模式，Sub仅可靠原生所属线程可用，SDK exec禁用解释/Main仍可选；原UI/CSS和双引擎GUI通过 |

54行按B8功能子项闭合，不表示54条上游混合提交整体完成。排除/不适用与B9–B11剩余责任见[B8最终范围核对](./B8-scope-audit.md)；最终测试/安装及合并状态另见完成矩阵。历史检查点不回写为新结论。
