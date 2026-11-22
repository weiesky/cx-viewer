# B9 完成矩阵（2026-11-23）

B9本地实施与验收完成，位于 `alignment/b9-scheduling-authorization`，起点 `cb40a55`；尚未创建B9 PR或合并main。固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`。14候选已按[B9子项核销表](./B9-candidate-matrix.md)处理，混合B10/B11不冒认全线完成。

| 范围 | 结果与证据 |
| --- | --- |
| 调度语义 | 原hourly/daily/weekdays/weekly/5-field cron/once、服务器时区/DST、jitter/10秒tick、最近7天单次catch-up、暂停/恢复/时钟跳变、20条历史；虚拟时间与独立TZ进程通过。 |
| 数据与认领 | definitions/preferences与runs私有拆分、原锁与原子写、并行进程单次claim/历史去重、损坏不覆写/私有备份、崩溃恢复与停止终态；通用prefs/file API不能带出任务数据。 |
| 精确执行 | SDK/PTY按cwd/engine/instance钉扎，未知/关闭目标不找同名兄弟；队列full/目录或附件缺失明确记录，acceptance与模型完成分开。 |
| 独立会话权限 | 用户实证选择：独立任务固定AppServer，原生on-request/workspace-write/network=false，常驻exec/AppServer不变；不继承bypass，owner审批与停止/归档独立。 |
| 原菜单/布局 | 原Upload后菜单、原共享modal/CSS、860px/260px与手机版堆叠、五once按钮、none/专家/附件、运行历史/暂停/discard；源码CSS逐字核对并实看16张图。 |
| 原生历史 | task run精确SID查所属archive并走既有resume确认；实际停止临时进程后exec/AppServer均恢复该archive继续原对话。 |
| 可选Ask托管 | 默认off/null，0立即/10/20/30分钟，原第三行/设置/倒计时；server权威、Recommended/首可选、无选项不猜、单题取消/手动优先/重连/终态清timer，native requestId/itemId分离。权限三秒默认与server自动批准按用户选择排除。 |

| 验证 | 结果 |
| --- | --- |
| clean env 全量 | **2443/2443，0skip**（5+758+1465+215）；E25权限纠偏后完整重跑，`/tmp/cxv-b9-e25-full-test.log`。 |
| 构建/包 | build通过、最终pack **747文件**；`/tmp/cxv-b9-e25-build.log`、`/tmp/cxv-b9-final-pack-after-policy.log`。 |
| 新生产安装 | **859/859**，全部747包文件/211Web及README精确字节、B1.2和相对--cd隔离CLI通过；[回执](./B9-installed.json)。 |
| 实际Codex SDK | Codex0.169.0的exec/AppServer常驻各定时inject/独立spawn/精确archive实际resume；独立进程原生policy实证、Ask立即Recommended及取消后手动；12本机Responses，[回执](./B9-native-scheduled.json)。 |
| 实际Codex PTY | 原CLI/node-pty/原生桥/队列，精确定时主prompt请求1次、原SID和正常权限保持；2主请求+2native标题请求，[回执](./B9-native-pty.json)。 |
| 浏览器 | Chromium159/WebKit27.2：SDK桌面/430px与普通PTY共6配置/16图，无pageerror；[SDK与手机版](./B9-gui.json)、[普通PTY](./B9-pty-gui.json)。受控协议GUI与实际native模型探针分别记录。 |
| 清理 | 所有自有SDK、受控PTY及实际CLI/native夹具正常关闭，cwd无残留进程；[回执](./B9-cleanup.json)。用户7008/其他实例未停止/重启，未发布npm或改变全局链接。 |

逐笔变更/失败/重试原因见[B9实施](./B9-implementation.md)；源码依据见[B9源审计](./B9-source-audit.json)，上游→本地映射见[B9提交映射](./B9-original-commits-2026-11-23.json)。B10尚未启动。

未验/保留：实际机器睡眠与跨时区系统切换、真机触控/IME/音频、外部模型/长等待、第三方密码管理器、LAN/TLS、其他OS/最低Node、历史IM并发偶发。原独立run上限30分钟保持，30分钟Ask托管可能先被run上限终止。需验时使用隔离HOME、可用Codex AppServer、正常确认生成hook、至少两独立cwd；按probe运行预期原SID/权限不变且精确task只派发一次。用户既有后端需正常重启才加载本轮修改，dist更新不等于已加载。
