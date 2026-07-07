# FileChange

## 定义

表示 Codex app-server 的文件补丁事件。在生成的 schema 中它是 `ThreadItem.type = "fileChange"`，包含 `changes` 列表和补丁 `status`。

CX Viewer 在 live 日志里可能仍以兼容工具名 `apply_patch` 展示，因为旧 viewer 和导入日志使用过这个名字。本文档是面向 Codex 的解释。

## 已核对字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `changes` | array | app-server schema 上报的文件更新列表 |
| `status` | string | 补丁应用状态 |
| `output` | string | 可选的流式补丁输出，来自 `item/fileChange/outputDelta` |

## CX Viewer 映射

- `fileChange` 会转成工具卡片，和终端、MCP 调用一起出现在时间线里。
- `item/fileChange/patchUpdated` 可在完成前更新展示的变更列表。
- Codex 需要权限后再应用补丁时，`item/fileChange/requestApproval` 会被当成审批请求处理。

## 注意事项

- Codex 原生日志优先参考此文档。
- `apply_patch` 仍作为导入日志和 live 兼容展示名保留。
- 该事件表示文件变更，不等同于旧的 `Edit` / `Write` 兼容工具文档。
