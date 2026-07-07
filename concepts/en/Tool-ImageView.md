# ImageView

## Definition

Represents a Codex app-server image inspection event. In the generated schema this is `ThreadItem.type = "imageView"` with a local image `path`.

## Fields Checked

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Absolute path of the image viewed by Codex |

## CX Viewer Mapping

- The event is displayed with the compatibility name `view_image`.
- `Tool-view_image` links are aliased to this document.
- When image assets are attached to a tool result, the viewer can render them in the result panel.

## Notes

- This event records that Codex inspected an image; it is not an image generation event.
- Generated images are represented separately by `ThreadItem.type = "imageGeneration"` and are currently treated as an event, not a main catalog tool.
