# B9 候选核销（固定 74cd752，2026-11-23）

14候选按B9子项核销，未把混合提交整条算作全线完成。原始第一父diff hash/文件清单见[B9-source-audit](./B9-source-audit.json)，逐笔源码/完整native调用链、失败与验证见[B9实施](./B9-implementation.md)。后续修复按固定最终版本迁入，不恢复已替代的中间存储/UI。代码与提交映射见[B9提交映射](./B9-original-commits-2026-11-23.json)。

| 上游候选 | B9核销及跨包边界 |
| --- | --- |
| `93a17ea62361d6e90b7c89e9d317496353cd95d3` | 仅增加上游tarball baseline两个Claude模块。本地native lib/src由既有package.files覆盖；E23/E26新安装859/859、747包/211Web精确字节完成等价产物核验，不复制不存在的Claude路径。 |
| `51c974e4415828296a8f91b469f54379b055c073` | 用户明确保留Codex原生权限/reviewer；三秒默认/倒计时放行/完全bypass不迁。不是“实现了三秒自动审批”。 |
| `3d4f098f08211b53f5d5f58d4c17b603027f3899` | E21原Other Input四个密码管理器opt-out完成，保留1b3引用守卫；浏览器插件实际行为仍属真机环境边界。 |
| `177b85df2cab3358dfec08cfc5591da29e27a8d1` | E1–E10/E12–E15/E22–E27完整定时模型/私有配置/认领/漏跑/独立执行/原菜单UI/CSS/历史/生命周期、README及实际native验收。独立任务按E25用户选择固定AppServer以兑现原生审批，常驻transport不变。本地没有18语言README源，不新造目录。 |
| `5ee6739cbaba22a6a6d341c020bb7d54c493e5d0` | B9 executor只传已解析instance，E7精确cwd/engine/instance并在native acceptance记dispatched、拒绝同名兜底；E22/E27实际SDK/PTY验证。容量条等B8已独立核销，发布项仍不整条冒认。 |
| `aaa3a59444884254cf8d5cf93ce032b35ef8aa24` | 仅changelog。权限/Plan服务端自动放行按用户native选择排除；Ask服务端托管另由E16–E20完成，SDK帧归属/真实resolve才终态沿B4及E8/E17；UltraReview沿B8完成。不上报本地未提供的Claude审批能力。 |
| `208f1348279758d95b72798442105c3236fa1dd3` | target missing-leaf已B5 E36完成（本轮完整及新安装回归）；minimization/重连保留已有B4 `288faea`及实际组件回归。其SDK Plan autoApproveAt producer没有原生对应审批能力，不合成计时/批准；普通PTY原Plan路径保持。 |
| `7a0ba39edf6a0b54ca7a425e0f08ab410e515407` | E3/E5/E6迁入最终task测试的异步条件轮询与rm重试。不同架构的上游git测试不重复搬；本地完整/安装回归通过。 |
| `2914d6479d2845e0b193ba1c09aa6667c66850a6` | E4/E11–E13原none模板/嵌入专家/20附件/持久路径、五once快捷按钮和原CSS，E26两浏览器实际保存/附件运行验证。混入专家内容/其他功能仍沿B4/B6/B8对应核销。 |
| `00fdfade7948cd895e2f714f71626f2f9e3678bd` | 仅发布版本/changelog；不把cx-viewer版本改为上游1.9.27。所述instant同tick终态清除由既有native updater与E20批处理回归、E22实际instant验证；终态仍按精确owner投递，不照搬跨workspace全广播。Git拖拽已B7独立核销。 |
| `1b3c2268e3bd0e73ffef043bf450662d01a28371` | Ask问题/选项quotable区域与拖选不误切已B7保持；E20倒计时位于区域外，E21未覆盖这些守卫。其他代码diff/参数区引用仍属B7既有实现。 |
| `451ef48d6a7dc73347d49e3d2d13cf8fafccad8f` | E2/E3/E5定义preferences与runs拆分/私有持久化/恢复、E12原860px/260px modal及状态/历史布局、E14精确SID恢复完成；E22/E26实际archive/GUI验证。 |
| `6081b5d01a1ae5a12063cfdc15959c392c5f37ba` | 用户已选可选托管、默认null关闭。E16–E20严格分钟/18语言picker/native ID数组、服务端计时/离线、单题取消、手动先赢、重放清理、原设置/倒计时/fallback/cache完成。E22/E25实际native、E26双浏览器通过。复用本地全局preferences；无project fork系统/Claude legacy reaper，exec常驻无原生问答回调不伪造，独立AppServer具真实问答桥。 |
| `134a0de7ac166db5f9375d9f2c60bcd97248852b` | UltraReview模板/18语言最终native策略已B8 E1/E10完成。本轮实核混入的是权限countdown文案，无可移植native producer；按用户保留原生权限排除，不仅凭字符串认定能力存在。 |

真实睡眠、物理设备/浏览器密码插件、外部模型遵循与真实长时间等待、其他OS/最低Node、历史IM并发偶发继续标未验。固定30分钟独立run上限沿上游保留，30分钟Ask托管可能先达到run上限；未擅延长。上述环境边界不替代已通过的虚拟时间/隔离HTTP/WS/本机native验证，也不妨碍本工作包独立范围核销。
