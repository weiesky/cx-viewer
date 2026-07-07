# ImageView

## 定义

表示 Codex app-server 的图片查看事件。在生成的 schema 中它是 `ThreadItem.type = "imageView"`，包含本地图片 `path`。

## 已核对字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `path` | string | Codex 查看过的图片绝对路径 |

## CX Viewer 映射

- 事件以兼容名 `view_image` 展示。
- `Tool-view_image` 链接会 alias 到本文档。
- 如果工具结果携带图片资产，viewer 可以在结果面板中渲染。

## 注意事项

- 该事件表示 Codex 查看图片，不是生成图片。
- 生成图片由 `ThreadItem.type = "imageGeneration"` 表示，目前按事件处理，不放入主工具目录。
