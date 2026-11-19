# B2 GUI 验收与边界

**2026-11-19 收口：用户明确认为B2已可验收，要求合并本地提交并推送main。B2现已完成，转入[B3准备](./B3-handoff.md)。下文未覆盖项仍未验证，保留为后续环境补验；旧检查点中的“未完成/待设备”是用户验收前状态，不再是当前收口阻塞。**

以固定快照 `74cd752d99caf122e750216d2af3bb9f467c4de1` 的实际代码为准。来源、逐笔改动及必要 SDK 适配见[迁移规范](./migration-code-first.md)。旧 editable-card、常驻排序箭头、窄屏操作菜单、Header 常驻历史按钮及移动 Header 第二行已移除，旧界面截图不能作为本版验收证据。

## 隔离环境

```sh
pnpm run build
node cc-viewer-alignment/probes/b2-workspace-gui.mjs
```

需要 pnpm 依赖、桌面浏览器、POSIX 和 node-pty。脚本使用临时 HOME/CODEX_HOME、fake Codex 和两个不同 cwd 的同名项目，不读取真实模型凭据。只使用本次输出的新 A/B URL、目录和 PID，Ctrl+C 回收自有服务、SDK 和 scratch。输入含 hold 时保持运行，其余立即回显；calls.jsonl 记录实际 cwd、参数和输入。

## 当前版本已实际观察

- Chrome/Safari：Header左侧28px胶囊same [1]/[2]、独立加号，共享1080px新工作区表格弹窗；打开/取消后会话仍在。少于2项时变成纯项目文字与加号。
- Safari：A发送/回复；快捷设置顺序为审批项、历史、AgentTeam；懒加载历史列表和当前项无操作；mobile=1菜单含恢复与新建工作区，Header无第二行。
- Safari：History API A→B、B发送、浏览器返回A；HTTP registry和fake调用日志确认两者cwd/native thread稳定，不因切换而stop/spawn。
- Chrome Responsive 320×828/400×828：单行Header、输入区、scratch上游横向标签栏/44px触控目标/sticky加号均实际核看。pwd为当前one/same；stty size为65 60，缩高至320×500后32 60。两个scratch shell的临时变量互不共享，切回保留；关闭终端并刷新仍关闭。
- Chrome Responsive 400×828最终队列条：hold运行中输入排队，队列条在composer上方；Stop保留暂停项；立即追加成功回复，最终idle且无残余队列条。原始queueHint品牌Claude已最小改为Codex。
- Chrome最终桌面：Alt+右键重排后same [n]不变，切换显示各自历史；Popconfirm关闭当前B回到A，单项目形态正确。指针只观察到拖起，没有跨项落点成功，未记通过。
- 最终双浏览器：初跑复现Safari关闭A、Chrome留选择器/旧URL的真实事件缺陷，详见迁移规范“纠偏10”；修复后同一场景两个浏览器均跳到精确存活B并恢复单项目形态。
- 最终移动回退：Chrome从B关闭后台A，Safari正在查看A的mobile=1页面自动转到精确B，保留mobile=1且旧A记录消失，Chrome留在B。
- Safari从共享表格启动已关闭A成功。移动共享历史列表点击旧归档，显示正确插值的恢复确认；确认后历史仍在、续发成功并idle。fake日志仅2次调用，续发使用原native thread ID，未重复首条。

前六项隔离目录cxv-b2-workspace-gui-A50ws6；最后两项使用重建后的cxv-b2-workspace-gui-HlIXQ8。只操作本次自有20220测试页；旧测试窗口被切到其他真实页面后重新建独立窗口，没有向真实项目输入。独立IAB host不可用，原生CUA可用但会因活动窗口变化中断。

## iOS 18.6 Simulator补证

本机发现Xcode/iOS运行时后，新建自有cxv B2 isolated iPhone（iPhone16e），由CUA打开移动Safari直连临时B。网页实际渲染单行Header与scratch横向rail；通过屏幕英文软键输入pwd、stty size，网页虚拟Enter执行，键盘保持展开；pwd为当前two/same，键盘展开20×60，收起后用网页Up取回命令、Enter执行为37×60。新建第二scratch为空shell，切回第一项保留100行输出。

这是真正iOS WebKit/软件键盘和触控事件路径的模拟器证据，仍不代表物理手机/多指惯性。CUA drag与scroll未观察到终端位移；追加对照：在原生iOS主屏幕从右向左拖动，页码仍为第1页/共2页、截图未变，光标也留在起点。本工具无法为连续拖动提供可靠通过证据；桌面dnd-kit同样只观察到拖起，不因为动作返回成功就记通过。模拟器异步剪贴板曾带入原剪贴板旧文本，未执行，已Ctrl+U清除；后续命令逐个点击软键输入并核对。没有据此修改产品粘贴协议。

## 尚未通过与复现步骤

1. 最终dnd-kit指针排序：在桌面Header把第一项拖过第二项，URL/任务不变、刷新顺序保持、同名编号不变。目前CUA drag观察到Picked up/落回自身，键盘排序通过不能冒充指针通过；未为了工具行为再造拖动实现。
2. 物理设备虚拟键/多指仍待：iOS Simulator网页Enter/Up及软键盘展开保持已通过；桌面AX鼠标未执行不等同触控失败。Tab/方向全部组合、物理手机/多指惯性不能仅由这次模拟器补证代替。
3. 真机单指滚动、多指切换无跳跃/旧惯性；软键盘弹出/收回保持60列并更新行数；隐藏再显示/切tab后仍能测量；虚拟键不收起软键盘。iOS Simulator已补足软件键盘/Enter/Up，但无法用现有CUA可靠完成多指/惯性与拖放；物理设备/验收方式已询问，未收到答复。
4. 浏览器睡眠唤醒/真实网络切换、其他平台属于尚未覆盖环境。WS拨号/心跳/静默与迟到回调已经受控组件和实际HTTP/WS/SSE测试，不能把这些测试写成真实网络GUI通过。

可重复执行开头fixture；使用每次新输出的A/B URL与临时目录。物理设备必须有到隔离实例的合法访问路径，不能直接复用仅localhost地址或公开真实实例。Windows强制回收尚未实施，Windows/Linux、最低Node/远端CI、外部真实模型/凭据迁移另列待验。B4审批/完整retry、B8上下文不在此冒充完成。B2未整包完成，尚未执行依赖完成的提交压缩/推送。

清理：模拟器应用已退出，仅读取/操作的新建B2设备已删除；Simulator首次自动启动的既有iPhone16Pro已恢复原Shutdown状态，未删除既有设备。GUI fixture服务仅按核对的自有PID回收；真实Viewer实例未停止或切换。
