# B11 交接（B10之后）

B9/B10已由[PR #12](https://github.com/weiesky/cx-viewer/pull/12)合并main `d829772`，旧#11关闭。原26笔已备份并合为da60ff2，原始/整合/远端/合并tree完全一致；上游映射/备份保留，详见[整合与合并](./B9-B10-consolidation-and-merge-2026-11-23.md)。本轮合并后才更新文档，产品代码未变。固定上游74cd752；下一工作包B11。

B10带回B11的三项：`6680d041d4` Claude目录与 `a97d0f8adf` Activation文档须按Codex实际工具/启用条件核查，不照搬Claude开关；`20ccfb7304` content进一步抽包沿A2既有范围另决，单npm包目前仍完整。12候选详细映射见[B10矩阵](./B10-completion-matrix.md)。B11其余42主候选及交叉候选仍从B0原索引逐条核实，不能据此三项收窄B11。

保持所有既有选择：原生权限/reviewer、独立任务AppServer、常驻transport不变、Ask托管默认关、代理重试配置/统计排除、后端TLS密码门。后续涉及新的产品/迁移决定通过提问工具列选项，既有选择不重复确认。

B10最后验证2713/2713、0skip/build/pack773、新安装1096/1096与773包/211Web精确字节；34图已核看。未验证实际全局升级/官方发布下载或npm部分写入后的恢复、Electron GUI/签名、Windows/Linux/最低Node、真实DNS/LAN-TLS、外部模型、真机/触控/音频/IME/密码插件、长等待/睡眠和历史IM偶发。暂不作“完全跨平台通过”或“文件系统回滚”承诺。

7008只读PID97674，普通PTY/队列可用，version-info没有B10进程身份字段。本轮没停止/重启用户实例；正常重启才加载新后端。自有GUI fixture均退出，清理证据见[B10清理](./B10-cleanup.json)。
