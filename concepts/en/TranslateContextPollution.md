# Auxiliary Request Isolation

## Background

Some request details include sensitive authentication headers such as `authorization` or `x-api-key`. CX Viewer shows this concept next to those headers because auxiliary features must never reuse a live Codex session credential casually.

## Rule

Internal helper requests should be isolated from the main Codex conversation:

1. Use their own endpoint and credential when a helper must call a model service.
2. Do not forward the main session's `authorization` header to unrelated services.
3. Treat prompt text, file snippets, and tool context as user data that may be routed through the active proxy profile.
4. Prefer local processing for UI-only features when possible.

## Why It Matters

Reusing a session credential can bind unrelated helper traffic to the user's main agent session or leak request context to an unexpected service. Keeping helper calls separate makes proxy behavior easier to audit and prevents accidental cross-contamination between UI features and Codex turns.
