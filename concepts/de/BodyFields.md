# Request Body Fields

Field descriptions for CX-Viewer's normalized Codex request body. The original source may be OpenAI Responses API traffic, Codex app-server notifications, or Codex SDK events; CX-Viewer maps them into one stable viewer shape.

## Field List

| Field | Type | Description |
|-------|------|-------------|
| **model** | string | The model name selected by Codex, e.g. a `gpt-*` model |
| **input** | string/array | OpenAI Responses API input. Codex usually uses the array form for user input, assistant history, tool results, and other context items |
| **instructions** | string/array | OpenAI Responses API instructions. This can include Codex core directives, tool usage guidelines, environment information, and `AGENTS.md` project instructions |
| **tools** | array | Available tool definitions or compact tool descriptors. MainAgent usually has a broader tool set than SubAgent |
| **metadata** | object | Request metadata such as `thread_id`, `turn_id`, `cwd`, SDK/app-server source, and subAgent parent-thread information |
| **max_tokens** | number | Maximum number of tokens for a single model response, e.g. `16000`, `64000` |
| **reasoning_effort** | string | Reasoning effort when reported by Codex |
| **reasoning_summary** | string | Reasoning summary mode when reported by Codex |
| **approval_policy** | string | Codex approval policy for the turn |
| **sandbox_policy** | object/string | Sandbox policy for the turn when available |
| **stream** | boolean | Whether the OpenAI Responses API request used streaming; app-server/SDK entries are normalized as streamed turns |

## input Structure

When `input` is an array, each input item usually contains `role` and `content`. `content` can be an array of blocks. Common types include:

- **text**: Plain text content
- **tool_use**: Model tool invocation (contains `name`, `input`)
- **tool_result**: Tool execution result (contains `tool_use_id`, `content`)
- **image/input_image/local_image**: Image content or an attached local image reference
- **thinking**: Model's thinking process (extended thinking mode)

## instructions Structure

`instructions` typically contains:

1. **Core agent instructions** ("You are Codex...")
2. **Tool usage guidelines**
3. **AGENTS.md contents** (project-level instructions)
4. **Skills reminders** (skills reminder)
5. **Environment information** (OS, shell, git status, etc.) — In fact, Codex relies heavily on git. If a project has a git repository, Codex demonstrates a better understanding of the project, including the ability to pull remote changes and commit history to assist with analysis
