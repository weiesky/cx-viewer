# Log V2 wire protocol v2

This protocol carries the V2 archive model to the browser without rebuilding
every legacy full entry on the server. New clients and servers switch together;
this is not a compatibility protocol for old viewers.

## Identity and snapshot

Three identities are deliberately separate:

- commit: `archive generation + seq + eventId + txnId`;
- logical row: `threadId + entryKey` (the winner is the latest physical commit
  and moves to the end of winner order);
- content object: `archive generation + sha256 hash`.

Every bootstrap or page is frozen at `{projectId, sessionId, generation,
throughSeq, timelineBytes, fileId, fileVersion, tailHash}`. A cursor is valid only for that
exact archive generation, file identity and committed tail fingerprint.
Pages never chase a moving live tail. Live delivery starts at `throughSeq + 1`;
a gap, conflicting replay, truncate, replacement, same-size rewrite, or
generation change yields `reset_required`.

## Frames

All control frames use `version: 2` and one of the kinds exported by
`lib/log-v2/wire-schema.js`:

1. `start`: frozen cursor, total/winner window and limits.
2. `checkpoint`: the visible winner descriptors plus each thread's linear input
   delta chain at a known sequence. It deliberately omits cumulative input
   arrays and all entry revision baselines.
3. `commit`: public timeline metadata, a self-contained current entry-part
   upsert and its optional thread input delta. Storage paths and JSONL offsets
   are never exposed.
4. `object`: a verified safe V2 content object, keyed by hash. Bootstrap sends
   only conversation/list-required objects; detail-only objects use the bounded
   object API.
5. `end`: the fully applied cursor/watermark.
6. `fragment-start`, `fragment-part`, `fragment-end`: bounded transport for a
   control value larger than 1 MiB. The client applies the decoded value only
   after all parts and the UTF-8 byte length validate.
7. `reset` or `error`: structured recovery/failure state.

The client applies a commit atomically after its revision metadata validates.
Duplicate `seq + eventId` is idempotent. The same seq with a different eventId,
revision gaps, missing changed input revisions, or ref/hash failures never
advance client state.

## Checkpoints, paging and live merge

A bootstrap checkpoint contains, by reference only:

- each thread's input revisions as `retain/remove/append` nodes, where every
  appended object ref is sent once rather than copied into later descriptors;
- only the selected winner descriptors and their semantic part refs;
- the frozen cursor watermark.

Older pages use the opaque object handle and a server-owned `beforeSeq`. Each
response also has an opaque `pageToken`. The server retains and retransmits the
same pending page until the browser acknowledges that token in the next page
request; only then does it advance `beforeSeq`. This makes a truncated NDJSON
response or failed client projection retryable without skipping history. The
server always evaluates pages against the original frozen watermark, so records
appended after bootstrap cannot leak into historical pages. Page responses do
not retransmit thread or entry revision state. The browser merges page and live
rows by global `entryKey`, keeps the later physical `seq`, and uses
`generation + entryKey` as the stable row handle. Timestamp is display
metadata, never a paging or resume cursor.

Live commits are self-contained entry upserts. This lets an entry that was
outside the initial window update without requiring the browser to have seen
its earlier revisions. `checkpoint + live upserts` must converge with replay
through the same sequence.

## Object delivery and limits

Objects are scoped to an opaque session handle. The server proves every
requested hash is referenced by an exposed winner, input chain, page, or
successfully delivered live upsert, revalidates the
storage hash and containment, caps batch count/bytes/concurrency, and aborts on
HTTP close. Raw canonical JSON is streamed without base64. The browser dedupes
in-flight and cached requests by `generation + hash` and assembles an exact safe
entry only for selected detail dependencies.

The safe entry contract is the V2 persisted view: secret headers have already
been redacted. It is not access to pre-redaction network bytes.

## Conversation and network views

The conversation path hydrates only the canonical parts required by the
conversation normalizer and the input objects referenced by that row. Network
headers, request containers and response payloads stay cold. The existing
conversation pruning/interning pipeline still runs after projection, so V2
removes server reconstruction work without weakening its memory controls.

The request list is built from descriptor-bound summaries. Summary v2 also
persists the classification label computed while the canonical entry is still
available; older derived summaries are ignored and rebuilt from canonical
parts. Selecting a network
row calls the object API, verifies every returned hash and byte count, then
reassembles the exact safe persisted entry in the browser. Detail objects are
not fetched for list rendering. Missing or corrupt summaries are rebuilt from
canonical V2 parts in the reader worker and must match the descriptor identity.

## Endpoints and local history

- `GET /api/log-v2/snapshot`: active or explicitly selected V2 archive;
- `POST /api/log-v2/page`: older winners at the frozen watermark;
- `POST /api/log-v2/objects`: capability-scoped raw canonical objects;
- `GET /api/log-v2/live`: active archive only.

An explicit
`file=<encoded-project-id>/YYYYMMDD_<encoded-session-id>.cxvsession/timeline.jsonl`
snapshot creates a readonly handle. It supports paging and object hydration but
is rejected by the live endpoint. Project and session components use the same
reversible portable-ASCII encoding as the on-disk layout; the date is UTC.

The browser persists the last reference-only checkpoint and small decoded CAS
objects in IndexedDB. On reload it sends the cached cursor identity with the
snapshot request. If generation, sequence, byte watermark, file identity and
tail hash all still match, the server returns only a fresh capability handle
plus `start/end`; the browser reuses the validated checkpoint and requests only
missing content hashes. Any mismatch returns a complete authoritative snapshot.

## Live barrier and backpressure

One process-wide publisher tails each archive from its byte cursor and fans out
to subscribers. Its replay ring and every subscriber queue are bounded; one
slow socket is reset without stalling other clients. A terminal publisher error
retires the publisher, ends every affected stream with `v2_reset`, and makes the
browser obtain a new frozen snapshot. SSE IDs are
`generation:seq`; for a fragmented commit the ID appears only on
`fragment-end`, so reconnect cannot resume past a partially delivered value.
The object handle's live cursor advances only after the socket accepts the full
commit.
