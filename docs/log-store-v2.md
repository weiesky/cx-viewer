# Log Store V2

CX Viewer persists conversation history only in Log Store V2. Every supported
ingestion source (proxy, App Server, SDK, and OTel) enters the same ordered,
durable writer.

## Layout

```text
<log-root>/
  <project>/
    project.json
    <date>_<session>.cxvsession/
      manifest.json
      timeline.jsonl
      summary.json
      request-summaries.jsonl
      threads/<thread-token>/{entries,input}.jsonl
      objects/<content-hash>
  v2-raw/<project>/               # private diagnostic attachments, never ZIP-exported
  v2-stats/<project>.json         # rebuildable derived statistics
```

`timeline.jsonl` is the commit record. Referenced entry, input, summary, and
content objects are written before the timeline commit. Readers ignore an
incomplete tail and reject invalid committed references.

## Runtime

The store is always V2; there is no read/write mode switch. Reliability tuning
is limited to:

| Variable | Default | Meaning |
| --- | ---: | --- |
| `CXV_LOG_V2_MIN_FREE_BYTES` | 512 MiB | Stop admission below this free-space floor. |
| `CXV_LOG_V2_MIN_FREE_PERCENT` | 5 | Stop admission below this free-space percentage. |
| `CXV_LOG_V2_FAILURE_LIMIT` | 3 | Consecutive failures before the process-scoped circuit opens. |

Production writes use one bounded worker queue. Shutdown drains every accepted
write before closing. The active session is selected by project identity,
canonical working directory, the durable latest-session pointer, and a healthy
root-main timeline proof.

## Transport and archives

The browser loads a frozen snapshot, hydrates capability-scoped objects, pages
older commits, and then follows the V2 live stream. The control SSE endpoint
never carries conversation entries.

Local history exchange uses a complete `.cxvsession.zip`. Archive parsing checks
paths, file types, expansion limits, checksums, and manifest identity. Raw App
Server protocol frames remain private sibling attachments and are excluded from
portable archives.

## Maintenance

- `node lib/log-v2/inspect.js <session-directory>` validates a session.
- `node lib/log-v2/backfill-session-summaries.js <log-root> --write` rebuilds summaries.
- `node scripts/migrate-log-v2-layout.mjs --root <log-root> --apply --confirm-stopped`
  migrates older V2 directory layouts.

Derived summaries and statistics are disposable; canonical timelines and their
referenced records are not.
