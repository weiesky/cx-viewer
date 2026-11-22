# B8 最终范围核对

固定上游 `74cd752d99caf122e750216d2af3bb9f467c4de1`，54候选完整hash/路径见[B8索引](./B8-candidate-index.json)，逐行结论见[候选矩阵](./B8-candidate-matrix.md)。本轮E1–E29与既有包的复用共同覆盖B8功能责任；不把上游混合提交整条标完成。具体实读diff/完整调用链/CSS及实例化证据保留在[B8实施](./B8-implementation.md)及所引旧包记录。

| 责任 | 核对与处理 |
| --- | --- |
| 用户明确排除 | 3eb/51b/935/25e/617/82d/fa/60c相关代理重试配置与统计；E5–E7已撤回。77b61的off-mode流空闲终止也依赖被排除的retryConfig，不引进另一套静默中止长思考。原生SDK重试反馈/手动续接、慢请求提示和UI连接恢复仍属于已有能力。 |
| 提示绑定 | 162/085/17df原生恢复/分叉已有持久指令；E4实际跨进程8请求、E13–14新建/手动优先、E21/E25完整无GUI验证。用户最新选择仅新会话，故不复制Claude live rewrite/Bind A。17df resume watchdog依赖Claude snapshot/transcript丢失前提，原生不存在该前提；不造误报。shell hook只读观测完整链随B11工程入口核验。 |
| 角色路由 | 3cc/7c/c66/add350由E23–26完成；E24/E28真实native子线程祖先证明。任意HTTP role或文本不能确立身份；SDK exec无法证明故禁用，Teammate隐藏。原布局/CSS/compact/default dormancy与双CAS不重做。原始entry保留proxyRole，重试统计消费者已排除，不造无消费者summary统计字段。 |
| 窗口与分类 | 用户E22选择原生动态窗口替代旧353K决定，也不迁3a未知模型猜1M。实际producer有窗口就用末轮total/12K原生百分比；SDK exec缺失显示未知。9c/5ee/ec14分类provider没有原生数据源，保持B4 E66原入口的明确不可用；不画伪分类，不造对应fetch/ts缓存。5ee MEMORY.md估算依赖Claude索引路径，native memory沿B5原只读入口，无假token分摊。 |
| 稳定性复用 | cdf实际CSS/markers、2ea/a3/919 proxy/UI/helper与b01测试差异本轮再读；对照B4 E16/E19–22原生错误/原文反馈/手动续接、逐请求慢等待/首body/终态/断线重放及原CSS/GUI。b01本地createProxy已提供实例stop，不新增全局lastServer。77b61的发送失败复用现有定向回执、草稿/附件保留和原生错误契约；E29补此前确实缺失的SSE慢恢复。 |
| composer/移动终端/task | 2ea的268px和border-box由B7 E16完成；多指anchor/惯性/卸载由B5移动滚动覆盖。a3两终端已共用watchMobileFixedLayout：40×50ms可见重试、隐藏跳过、ResizeObserver/viewport重测和dispose。原生任务按精确实例/线程/批次持有，B4/B7证据复用；真实模型计划producer/物理触控未验不变。无Teammate工具，不复制旧TeamCreate文档。 |
| 无对应消费者 | 1db最终cc-switch loader仅app_type=claude且显式跳过Codex，本地无导入API/UI；不新造Claude-only支持。725六个native变量纯渲染，七个易变旧占位逐字保留。729本地model-system-prompts不依赖system-prompt-files，preferences不依赖interceptor，materializer不回引log-management；allowed roots逐请求读LOG_DIR/registry无缓存，故不用失效listener。 |
| B9剩余 | 134权限倒计时词条随真正权限producer核，5ee scheduled executor精确instance改动随定时执行全链核，不凭B8提示资产或角色路由算完成。 |
| B10剩余 | 584目录服务插件、57公开base URL/反代完整链，77b61 approval hook timeout。只核实际边界，不冒称已读/已迁完整插件能力。 |
| B11剩余 | 729全包boundary gate/CI与结构约束、f946全包路径/worker/hook、各提交release/history/README/版本与tarball统一基线；与B8实际可运行产物验证分开。 |

历史B8-handoff为B7起点，旧353K/待选/旧进程信息不作现行决策。E22/E23–26与本文件为最新已选范围。仍未覆盖：真实外部模型遵循/自动压缩触发、用户现用SDK实例地址与正常重启、物理设备/音频/IME/触控、真实LAN/TLS、其他OS/最低Node，以及历史IM并发偶发原因。独立验证不因这些环境项阻塞，也不将其标为通过。
