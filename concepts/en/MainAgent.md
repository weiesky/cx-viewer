# MainAgent

## Definition

MainAgent is the primary request chain for Codex when it is handling the user's turn directly. Every user interaction can produce multiple captured entries; MainAgent entries form the core conversation chain and carry the normalized system prompt, tool definitions, message history, and response content.

## Identification

In CX-Viewer, MainAgent is identified by `req.mainAgent === true`. The tag is assigned by the capture layer for all supported Codex paths: OpenAI Responses API traffic, Codex app-server events, and Codex SDK events.

Criteria (all must be met):
- The entry is explicitly marked `mainAgent: true`
- The entry is not marked as a subAgent or synthetic tool event
- Legacy fallback detection checks for Codex system text and main-agent tool shape

## Differences from SubAgent

| Feature | MainAgent | SubAgent |
|---------|-----------|----------|
| system prompt | Complete Codex main prompt | Streamlined task-specific prompt |
| tools array | Contains all available tools | Usually contains only a few tools needed for the task |
| Message history | Accumulates full conversation context | Contains only sub-task related messages |
| Usage metadata | Full turn-level token usage when available | Per-subtask usage when the Codex source reports it |
