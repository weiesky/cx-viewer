# Read

## Definition

Reads content from the local filesystem. Depending on the Codex tool surface, this can include text files, images, PDFs, and notebooks.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file_path` | string | Yes | Absolute file path |
| `offset` | number | No | Starting line for segmented reads |
| `limit` | number | No | Number of lines to read |
| `pages` | string | No | PDF page range when supported |

## Use Cases

**Good for:**
- Reading known source files and config files
- Inspecting user-provided images or screenshots
- Reading documents before editing or summarizing them
- Loading several relevant files in parallel

**Not good for:**
- Directory listing, use shell/list tooling instead
- Open-ended repository exploration, use search or a SubAgent

## Notes

- Absolute paths are easiest to audit in CX Viewer.
- Large files are usually read in segments.
- Image and document handling depends on the active Codex runtime/tool surface.
