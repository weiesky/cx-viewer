# list_agents

`list_agents` 读取当前根线程中的活跃 Agent 树，并报告各任务的状态。

字段：

- `path_prefix`：可选的规范任务路径前缀，用来缩小结果范围；省略时列出全部活跃 Agent。

这是只读检查工具，不会启动、中断或关闭任何 Agent。
