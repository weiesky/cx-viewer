# Request Body 字段说明

CX-Viewer 归一化后的 Codex 请求体字段说明。原始来源可能是 OpenAI Responses API、Codex app-server 通知或 Codex SDK 事件，CX-Viewer 会映射为统一的 viewer 结构。

## 字段列表

| 字段 | 类型 | 说明 |
|------|------|------|
| **model** | string | Codex 选择的模型名称，例如 `gpt-*` 模型 |
| **input** | string/array | OpenAI Responses API 的输入内容。Codex 通常使用数组形式，携带用户输入、助手历史、工具结果等上下文项 |
| **instructions** | string/array | OpenAI Responses API 的指令内容。可能包含 Codex 核心指令、工具使用说明、环境信息和 `AGENTS.md` 项目指令 |
| **tools** | array | 可用工具定义或精简工具描述。MainAgent 通常比 SubAgent 拥有更完整的工具集合 |
| **metadata** | object | 请求元数据，例如 `thread_id`、`turn_id`、`cwd`、SDK/app-server 来源，以及 subAgent 的父线程信息 |
| **max_tokens** | number | 模型单次回复的最大 token 数，如 `16000`、`64000` |
| **reasoning_effort** | string | Codex 上报的推理强度 |
| **reasoning_summary** | string | Codex 上报的推理摘要模式 |
| **approval_policy** | string | 本轮 Codex 审批策略 |
| **sandbox_policy** | object/string | 本轮沙箱策略（如果来源协议提供） |
| **stream** | boolean | OpenAI Responses API 请求是否流式；app-server/SDK 条目会按流式 turn 归一化 |

## input 结构

`input` 为数组时，每个输入项通常包含 `role` 和 `content`。`content` 可以是 block 数组，常见类型：

- **text**: 普通文本内容
- **tool_use**: 模型调用工具（含 `name`、`input`）
- **tool_result**: 工具执行结果（含 `tool_use_id`、`content`）
- **image/input_image/local_image**: 图片内容或本地图片引用
- **thinking**: 模型的思考过程（扩展思考模式）

## instructions 结构

`instructions` 通常包含：

1. **核心 agent 指令**（"You are Codex..."）
2. **工具使用规范**
3. **AGENTS.md 内容**（项目级指令）
4. **技能提示**（skills reminder）
5. **环境信息**（OS、shell、git 状态等）— 事实上 Codex 非常依赖 git。如果项目存在 git 仓库，Codex 能展现出对项目更好的理解能力，包括可以拉取远端的变更和 commit 记录来辅助分析
