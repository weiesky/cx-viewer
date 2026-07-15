# Log Store V2 architecture and migration

Status: W0-W3, R1-R3, and the C1/C2 cutover/migration mechanisms are
implemented. V1 remains the startup default until a real deployment completes
the observation gate; a passing gate is never inferred from tests or fixtures.

## Decision

CX Viewer V2 uses this hierarchy:

```text
$CXV_LOG_DIR/
└── <encoded-project-id>/
    ├── project.json
    └── YYYYMMDD_<encoded-session-id>.cxvsession/
        ├── manifest.json
        ├── summary.json
        ├── timeline.jsonl
        ├── threads/
        │   └── <hashed-thread-id>/
        │       ├── entries.jsonl
        │       └── input.jsonl
        └── objects/<fixed-hash-buckets>/...
```

A session archive is the intentional lifecycle boundary. For Codex App Server,
the root thread ID equals `sessionId`; subagent and teammate threads have their
own thread IDs but retain the same `sessionId` and parent-thread relation. A
`/clear` starts a replacement root thread and therefore a new session archive.
Compaction remains inside the same thread and session archive.

There is no byte-size or clock-based rotation inside a session. This avoids an
arbitrary split that cannot be explained in terms of user activity. Project
discovery is bounded: the project manifest stores only sequence/latest pointers,
while session manifests are immediate children of the project directory. The
eight-digit filename prefix is the session creation date in UTC; it is metadata
for humans and sorting, not another directory hierarchy.

## Storage contract

`timeline.jsonl` is the append-only commit order for one session. A timeline
record points to a committed entry revision and its input revision. Per-thread
entry streams hold non-input request/header/body deltas. Per-thread input streams
store input items once and append sequence/revision operations. Large immutable
values are content-addressed in the session object store. Project and session
IDs are represented by a reversible, collision-free portable-ASCII encoding,
so their directory names preserve identity without introducing separators,
reserved platform names, or traversal. Encoded path segments are capped at 230
bytes. Thread IDs remain SHA-256 storage tokens because thread stores are an
internal implementation detail rather than user-facing archive boundaries.
Project IDs must be unique within one log root. If two different canonical
working directories supply the same readable project ID, the second writer
fails with `CXV_LOG_PROJECT_ID_COLLISION` instead of mixing their logs or
silently adding a hash suffix. Layout-control roots such as `v2`, `runtime`,
and `plugins` are reserved.

New timeline records keep both the event `timestamp` and a writer-generated
`committedAt`. Observation epochs use `committedAt`, so a historical App Server
event hydrated and appended later cannot be mistaken for pre-epoch traffic.
Older archives without this field remain readable and fall back to `timestamp`.

V1 compatibility readers and the V2 materializer deduplicate by
`timestamp|url`. A later physical record is both the winning value and the
winning commit-order position; replacing a `Map` value in its original slot is
not equivalent. This is required when a restarted App Server hydrates an older
timestamp as a new checkpoint: leaving it at the earlier slot can interleave
writer epochs and attach a current delta to the wrong baseline.

The writer must preserve these invariants:

1. Allocate a session-local transaction and sequence.
2. Persist referenced objects and thread revisions.
3. Append and durably complete the timeline commit record last.
4. A reader ignores uncommitted tails and validates length/checksum references.
5. Header redaction happens before V2 persistence; reconstruction is semantically
   equivalent to the safe V1 view, not a promise to retain secret wire bytes.

V2 does not inherit the legacy fixed-checkpoint MainAgent delta format. That
format remains only in V1 compatibility and the offline import adapter.

`summary.json` is a derived, replaceable cache for the history picker. It keeps
the root thread's safe user-prompt projections, commit watermarks, turn count,
and the session archive's persistent logical byte size. User prompts use the
same bounded projection and system-text filtering as conversation rendering;
the summary does not copy inline image data or remote image URLs. It is not part
of the canonical transaction chain: `timeline.jsonl` remains the commit record,
and a missing, stale, or malformed summary can be rebuilt from committed V2
data. Writers update it atomically after a timeline commit, and readers repair
it once when its watermark is stale rather than re-extracting prompts on every
history-list request.

The displayed archive size is the sum of regular-file `stat.size` values in the
session directory at the summary watermark, including `summary.json` itself.
The fixed-point serializer accounts for the summary's own byte length. Directory
entries, symbolic links, append lock files, and temporary atomic-write files are
excluded. This is a persistent logical byte count, not allocated filesystem
blocks (`du`) and not merely the size of `timeline.jsonl`.

## Portable ZIP exchange

The history picker continues to use a session's `timeline.jsonl` path as an
internal locator, but that file is not a complete V2 log. Downloading a V2 row
exports the locator's parent `YYYYMMDD_<encoded-session-id>.cxvsession/`
directory as a ZIP with exactly that one top-level directory. The ZIP retains
the manifest, timeline,
thread revision streams, content-addressed objects, and derived metadata. Lock
files, atomic-write temporary files, and Finder metadata are excluded;
symbolic links and other non-regular filesystem entries reject the export.

Active sessions are copied while their append lock is held, then validated and
compressed after the lock is released. This gives the download one committed,
internally consistent snapshot without holding up writers for the duration of
the network transfer.

The desktop **Upload and parse log ZIP** action accepts one ZIP up to 64 MiB
(up to 128 MiB expanded, with per-entry, entry-count, path, and expansion-ratio
limits). Only one ZIP import/export job runs at a time; overlapping requests get
an explicit busy response.
It is a portable, read-only viewer operation: the server extracts into an
isolated temporary directory, validates the single-root archive and every V2
reference, streams the final winning entries to the browser, and removes the
temporary directory. It does not install the uploaded session into `LOG_DIR`
or turn it into a writable session. Unsafe paths, symbolic/special entries,
colliding normalized paths, multiple session roots, expansion bombs, missing
references, and incomplete/corrupt timelines are rejected.

V1 storage is still a JSONL file and its legacy download response is unchanged.
The ZIP upload action intentionally targets the current V2 directory format;
it does not accept legacy JSONL files.

## Startup configuration

The process resolves configuration once at startup. Explicit environment
variables take precedence over the optional log-root `v2/runtime-config.json`:

| Variable | Values | Initial default | Purpose |
| --- | --- | --- | --- |
| `CXV_LOG_WRITE_MODE` | `v1`, `dual`, `v2` | `v1` | Select the write path. `dual` writes authoritative V1 first and shadow V2 second. `v2` makes durable V2 authoritative and requires a valid C1 gate. |
| `CXV_LOG_READ_MODE` | `v1`, `v2` | `v1` | Select the reader after restart. It does not hot-switch. V2 session history, downloads, paging, and parity-linked active history are materialized from committed V2 timelines. |
| `CXV_LOG_V2_MIN_FREE_BYTES` | non-negative bytes | `536870912` | Open the V2 shadow fuse below this free-space watermark. |
| `CXV_LOG_V2_MIN_FREE_PERCENT` | `0`–`100` | `5` | Percentage watermark used together with the byte watermark. |
| `CXV_LOG_V2_FAILURE_LIMIT` | positive integer | `3` | Consecutive V2 failures before shadow writes stop until restart. |
| `CXV_LOG_V2_GATE_FILE` | file path | unset | Required by `write=v2`. The credential is tied to the canonical log root, approved projects, evidence digest, and expiry. |
| `CXV_LOG_V2_PROJECT_V1` | boolean | `true` | In `write=v2`, best-effort project each event into V1 as a rollback buffer. Set to `false` after migration and rollback policy permit legacy-writer retirement. |

Unsupported explicit values are startup configuration errors. During the
dual-write phase, V1 remains authoritative: V2 failure is isolated, reported,
and must not prevent V1 append. V2 receives the original full entry before any
legacy V1 delta compaction so the two formats are independently reproducible.
The V2 coordinator bounds active writer state, serializes project/session writes
with crash-recoverable lock files, and emits a single degraded warning when disk
watermarks or the failure fuse stop shadow writes.

Dual-write shadow persistence uses buffered file writes to avoid making the V2
experiment add several durability flushes to every captured event. Ordering,
checksums, and recovery still reject an incomplete commit after restart; V1 is
the durable authority during this phase. In `write=v2`, V2 uses durable writes,
must be paired with `read=v2`, and accepts only projects approved by the loaded
gate. The optional V1 projection happens after the V2 commit and cannot turn a
successful primary commit into a failed one. Projection counters and the last
projection error are exposed by the authenticated status endpoint.

`CXV_LOG_READ_MODE=v2` is available after restart and falls back to V1 only when
the active V1 log has no linked V2 session. In primary mode the active session is
resolved directly from the last V2 locator, so it does not depend on a V1
projection. Explicit V2 history reads fail on committed corruption; an
incomplete, uncommitted timeline tail is ignored and reported by inspection.

Operators can persist observation mode without changing global shell settings:

```sh
node lib/log-v2/runtime-config.js "$CXV_LOG_DIR" --write=dual --read=v1
```

The file is written atomically with mode 0600 and is read only during process
startup. Its `updatedAt` also starts (or deliberately resets) the default C1
observation epoch while `writeMode` is `dual`; readiness counts only records at
or after that instant. Restart CX Viewer/Codex immediately after writing the
file so the process-local writers and V1 compactors share the same clean epoch.
An explicit `CXV_LOG_WRITE_MODE` or `CXV_LOG_READ_MODE` still overrides the
startup modes.

There is one narrow recovery case that does not require a second restart: the
fixed build has already restarted from the same persisted `dual/v1` modes, and
the authenticated status endpoint proves that the new process has zero failed
writes, no retained `lastFailure`, no open circuit, and no degradation. An
operator may then rewrite the unchanged `dual/v1` document to start the epoch at
that later instant. The epoch is audit metadata rather than a hot mode switch;
the parity audit retains earlier located records only as delta/repeat context
and counts exclusively commits at or after the new `updatedAt`. Do not use this
exception when the running modes differ, the build identity is uncertain, or
any writer failure occurred; use the normal write-then-restart procedure.

## Delivery stages

### W0 — protocol and configuration

Freeze identity, schema, safe path, and startup switch contracts with pure unit
tests. No runtime behavior changes.

### W1 — offline V2 writer core

Implement atomic project/session creation, input-centric revisioning, object
deduplication, timeline commit ordering, recovery from torn writes, and an
offline inspection command. Validate with golden fixtures and fault injection.

### W2 — App Server dual write

Route using authoritative `Thread.sessionId`. Append V1 first, then synchronously
attempt shadow V2. Record a parity locator without making V2 failure fatal. Start
with App Server; proxy, SDK, and OTel sources follow after their identity rules
are explicit.

### W3 — stability gate

Add disk watermarks, a V2 circuit breaker, restart recovery, concurrent-thread
and multi-process stress tests, and size/latency benchmarks. Keep V1 as the
startup default through this gate.

### R1/R2 — materializer and restart comparison

Build a V2 reader that reconstructs the safe full entry. With identical dual
written fixtures, compare event count/order, identities, request/body/header
semantics, input revisions, and corruption behavior. Users select `v1` or `v2`
through `CXV_LOG_READ_MODE` and restart CX Viewer; no live toggle is required.

Implemented. The materializer validates manifests, sequence and revision chains,
thread-scoped input operations, JSONL reference checksums, and content-addressed
objects before reconstructing the redacted safe entry. Local session discovery
uses validated hashed paths. Dual-written fixtures pin normalized V1/V2 parity,
restart selection, incomplete-tail handling, committed corruption, pagination,
download streaming, and session deletion behavior. The live watcher remains on
V1 during the dual-write observation period; V2 supplies restart/history reads.

### Observation gate before C1

Run the offline parity/readiness audit against the configured log root:

```sh
node lib/log-v2/parity.js "$CXV_LOG_DIR" --project=<project-id>
```

The command follows each timeline `legacyRef`, reads the exact V1 record by
file/offset/length, expands repeat markers, reconstructs legacy MainAgent deltas,
normalizes storage-only metadata, and compares the result with the safe V2
materialization. Mismatch output contains only event identity, field paths, and
SHA-256 hashes; it does not include prompt or response values.

An observation epoch filters evidence only after reconstruction. The audit may
read earlier located records as delta/repeat context, but it counts and compares
only deduplicated commits whose `committedAt` is inside the epoch. This prevents
a valid post-epoch delta from being judged as a standalone full input while
ensuring pre-epoch traffic cannot satisfy the C1 volume thresholds.

Readiness also proves the reverse direction. For every V1 file referenced by an
observed V2 session, it scans complete records from that file's first V2 locator
through a consistent size snapshot, then refreshes V2 discovery once to include
commits that raced the scan. Every V1 record in that range must have an exact V2
`legacyRef`; otherwise `v1-coverage-gaps` blocks C1. Reports expose only the log
file, byte offsets, and lengths of missing records, never their payload values.
Records before the first locator are outside the dual-write observation epoch,
while a complete unlocated tail after that point is treated as a real gap.
When a defect or degradation is found, fix it, write the same `dual/v1` runtime
configuration again, and restart. The new `updatedAt` resets session, event,
coverage, and elapsed-time evidence instead of allowing pre-fix traffic to
satisfy C1. For deployments driven only by environment variables, pass the
equivalent explicit boundary to the audit:

```sh
node lib/log-v2/parity.js "$CXV_LOG_DIR" \
  --project=<project-id> --since=2026-07-14T14:00:00.000Z
```

The default C1 readiness thresholds are 10 fully passing sessions, 1,000
committed events, and a 168-hour observation window. They are intentionally
configurable for staging or larger deployments:

```sh
node lib/log-v2/parity.js "$CXV_LOG_DIR" \
  --project=<project-id> --min-sessions=20 --min-events=5000 --min-hours=336
```

Exit status is zero only when the configured gate passes. A gate pass is
necessary but not sufficient for C1: operators must also confirm that the live
writer has no disk-watermark or circuit-breaker degradation. The current
process-local counters, per-source writes, last locator, most recent failure
(retained after a later successful recovery), and V1 projection state are
available from the authenticated `GET /api/log-v2/status` endpoint. A non-zero
`writer.failed` or non-null `writer.lastFailure` is degradation evidence that
must be investigated before issuing C1, even when `writer.lastError` has cleared.

After the real observation window passes, issue a time-limited C1 credential:

```sh
node lib/log-v2/parity.js "$CXV_LOG_DIR" \
  --project=<project-id> \
  --write-gate="$CXV_LOG_DIR/v2/c1-gate.json" \
  --gate-hours=720
```

The command writes nothing when readiness fails. The gate digest protects
against accidental edits; it is an operator cutover credential, not a signature
against an adversary who can rewrite the log root and regenerate evidence.

### R3 — other ingestion sources

Implemented for Proxy, SDK, and OTel. Explicit source identities are preserved:
SDK thread/session metadata wins, and OTel uses resource session plus trace IDs.
When Proxy or another source has no lifecycle identifier, the coordinator uses a
project- and process-scoped synthetic session, preventing unrelated projects
from collapsing into one archive while keeping one runtime capture contiguous.
App Server records carrying a thread still require authoritative
`Thread.sessionId`; server-global startup warnings with no thread use a distinct
`app-server-global` synthetic auxiliary session so they are not lost from the
V2 shadow.
Source-specific dual-write fixtures pass the same safe-view parity audit as App
Server data.

### C1/C2 — primary switch and migration

Implemented, but deliberately not enabled by default. Cut over after generating
a valid gate and restart with:

```sh
CXV_LOG_WRITE_MODE=v2 \
CXV_LOG_READ_MODE=v2 \
CXV_LOG_V2_GATE_FILE="$CXV_LOG_DIR/v2/c1-gate.json" \
CXV_LOG_V2_PROJECT_V1=1 \
cx-viewer
```

V2 commits are durable and authoritative. V1 projection remains a best-effort
rollback buffer. To roll back while projection is enabled, restart with both
modes set to `v1`; events committed only while projection was disabled are not
present in V1.

#### One-time V2 directory-layout migration

The temporary migration command flattens the former
`v2/projects/<hash>/sessions/YYYY/MM/DD/<hash>.cxvsession` hierarchy into the
shallow layout documented above. Stop every CX Viewer and Codex process that
can write this log root, then run the default read-only preflight:

```sh
node scripts/migrate-log-v2-layout.mjs --root "$CXV_LOG_DIR"
```

Preflight performs all source and target structure, identity, lock, archive,
tree-digest, and materialized-digest checks before it creates a receipt,
staging directory, marker, project, or session. Its JSON result reports the
number of projects and sessions, bytes that require staging, sessions that can
be deduplicated, and missing-manifest directories that must be quarantined.
Run it again after resolving any reported identity or divergent-content
conflict; conflicts never enter the publishing phase.

A missing `manifest.json` does not provide enough identity to invent a safe new
session name. Such a directory is not installed in the shallow layout. It is
reported under `quarantine` and retained byte-for-byte inside the timestamped
old-layout backup. This is deliberate preservation, not silent deletion.
When the same session already exists in the shallow layout, migration compares
both its complete tree digest and final materialized-entry digest. An exact
match is deduplicated; any difference aborts preflight for manual inspection.

After reviewing the dry-run report, apply with the explicit stopped-process
confirmation:

```sh
node scripts/migrate-log-v2-layout.mjs --root "$CXV_LOG_DIR" \
  --apply --confirm-stopped
```

The script stages verified copies on the log-root filesystem, rebuilds each
project manifest across old and already-present shallow sessions (including a
non-reused `nextSessionSeq` and a valid latest pointer), publishes with durable
renames, and retains the old `v2/projects` tree as
`v2/projects.layout-v1-backup-<timestamp>-<nonce>`. Its versioned receipt uses
portable POSIX relative paths and is updated atomically after each recoverable
step. Copied files and affected directories are fsynced before the receipt can
advance. Re-running the same apply command resumes an interrupted migration or
returns the completed receipt without duplicating data. Keep the backup until
the shallow archives and every quarantine item have been inspected.

The C2 importer reconstructs legacy repeat markers and MainAgent deltas, writes
a deterministic durable V2 archive, verifies normalized content digests, and
stores an idempotent import receipt:

```sh
node lib/log-v2/import-v1.js "$CXV_LOG_DIR" \
  <project/file.jsonl> --cwd=/canonical/project --project=<project-id>
```

For a large real project, discover its direct V1 files and skip logs that are
still changing:

```sh
node lib/log-v2/import-v1.js "$CXV_LOG_DIR" \
  --cwd=/canonical/project --project=<project-id> \
  --project-dir=<project-directory> \
  --stable-seconds=300 --skip-unstable=1
```

The importer streams V1 reconstruction and V2 verification with bounded entry
memory. New archives use buffered construction, then fsync every produced file
after semantic verification and persist `import.json` last as the durable commit
marker. An archive with commits but no receipt is treated as interrupted and is
excluded from discovery and normal reads, then rebuilt on the next import. The
receipt schema and its project/session identity are validated before an imported
archive becomes visible. Normal reads also require its committed timeline count
to match the verified receipt. Source size, inode, and modification time must remain
unchanged from the initial digest through receipt creation. If a file resumes
growing after an earlier verified import, the importer waits for the requested
stability window and rebuilds its deterministic archive from the new complete
snapshot; it never appends the new suffix into the prior revision chains.

The receipt remains the last canonical write for an initial V1 import. Summary
generation is derived work: it is prepared before that commit where possible,
and a best-effort size reconciliation may follow the receipt so the receipt's
own bytes are included. A failure in this derived step never invalidates or
rolls back a verified import; a later list, import retry, or explicit backfill
repairs it. Re-running the importer against an already committed archive also
fills a missing or stale summary without changing the receipt identity.

Existing V2 archives can be inspected without writing first:

```sh
node lib/log-v2/backfill-session-summaries.js "$CXV_LOG_DIR" --dry-run
```

`--dry-run` is the default. Its `updated` count means “would update”; it never
acquires the summary write lock or writes files. To atomically update every
valid archive, optionally restricted to one project, run:

```sh
node lib/log-v2/backfill-session-summaries.js "$CXV_LOG_DIR" \
  --project=<project-id> --write
```

The command processes archives independently, prints progress to stderr, and
emits one JSON report on stdout with `scanned`, `updated`, `unchanged`, and
`errors`. Error records contain only relative archive paths and stable failure
categories, never prompt text. Processing continues after an archive error, but
the final exit status is non-zero when any discovery, inspection, or rebuild
error was recorded. Interrupted legacy imports without a valid `import.json`
remain invalid and are not made visible by the backfill.

Imported archives are verified independently and excluded from C1 live
observation counts. Once required V1 history is imported and the rollback policy
allows it, set `CXV_LOG_V2_PROJECT_V1=0` to retire active legacy projection. The
global defaults remain V1 until operators have real deployment evidence.

## V2 client communication

Viewer startup no longer materializes every V2 winner into a legacy full entry
on the server. `GET /api/log-v2/snapshot` streams a frozen reference checkpoint,
compact request summaries, and a `{generation, throughSeq, timelineBytes}`
cursor. The browser owns the browser-safe revision reducer and content-addressed
object cache. The network list renders summaries; request details fetch only the
selected entry closure through the bounded `/api/log-v2/objects` endpoint and
reassemble the exact redacted safe view with the shared entry codec.

Conversation startup fetches only root/response semantic parts and the ordered
input refs required by the existing normalization and session-merge pipeline.
Headers and request-container detail remain lazy. Object values are deduplicated
by generation/hash, bounded by an in-memory decoded budget, and best-effort
cached in an IndexedDB store isolated from the legacy full-entry cache.

Live delivery watches only complete `timeline.jsonl` commits. It resumes by
`generation:seq`, extends the snapshot's object whitelist with newly committed
refs, and replays immediately after watcher registration to close the bootstrap
race. A session/archive change emits reset and forces a fresh checkpoint. V2
control clients are excluded from the legacy full-entry watcher broadcast.
The complete envelope, checkpoint, limits, error and reset contract is in
`docs/log-v2-wire-protocol.md`.

## Validation gates

- Unit: schemas, identity mapping, safe paths, input operations, checksums.
- Golden: reconstruct representative main/subagent/teammate conversations.
- Fault injection: failure after object, input, entry, and timeline persistence,
  plus truncated committed and uncommitted tails.
- Regression: existing V1 test suite remains unchanged during writer work.
- Parity: normalized V1 and V2 reconstruction match by session/thread/turn/event.
- Concurrency: real child processes append root and child threads into one
  session and produce a unique, gap-free commit sequence.
- Performance: measure bytes per event, append latency, recovery,
  materialization and reference-snapshot time, legacy-full versus V2-control
  wire bytes, object count, and input-object deduplication; account for
  the temporary combined disk cost of dual writing.

The repeatable local benchmark is:

```sh
node lib/log-v2/benchmark.js 40 512 buffered
```

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Missing or incorrect session identity | Require App Server `sessionId`; preserve SDK/OTel identity; isolate identity-less sources in project/process-scoped synthetic sessions. |
| Partial multi-file transaction | Timeline-last commit, checksums, tail recovery, idempotent transaction IDs. |
| V2 failure affects capture | In dual mode, V1-first authority and an isolated V2 circuit breaker. In primary mode, fail the capture result rather than silently claiming V1 authority. |
| Input mutation is reconstructed incorrectly | Immutable input objects plus explicit sequence/revision operations and golden parity tests. |
| Secrets leak through headers or bodies | Central redaction before object hashing/persistence; security fixtures for every record type. |
| Session archive grows for unusually long sessions | Treat it as the user lifecycle boundary; expose measurement and warnings, but do not introduce arbitrary rotation. |
| Dual-write consumes disk quickly | Preflight capacity, watermarks, visible degraded state, and an operator-controlled write mode after restart. |
| Project discovery becomes another unbounded log | Constant-size project manifest and date-directory session discovery, not a project-wide event timeline. |
