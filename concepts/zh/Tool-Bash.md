# Bash

## 定义

执行 shell 命令，支持可选超时和后台运行设置。CX Viewer 会记录命令、工作目录、输出、退出码、耗时和 agent 身份。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `command` | string | 是 | 要执行的 shell 命令 |
| `description` | string | 否 | 命令简短描述 |
| `timeout` | number | 否 | 超时时间（毫秒） |
| `run_in_background` | boolean | 否 | 是否独立后台运行 |

## 使用场景

**适合使用：**
- 运行测试和构建命令
- Git status/diff/log 操作
- 包管理器命令
- 检查系统状态

**不适合使用：**
- 有结构化编辑工具时直接改文件
- 需要读取大量文件时替代 read/search 工具
- 长时间运行的 dev server，除非任务明确需要

## 注意事项

- 优先使用明确工作目录和绝对路径。
- 需要高权限或写出工作区的命令可能需要审批。
- 根线程命令会显示为工具事件；SubAgent 命令会继承 SubAgent 身份。
