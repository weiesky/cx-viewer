// B0/B3 cold-ingest probe. Assertions now check the B3 failure recovery. Executes current AppBase
// method bodies in a host with synchronous setState and a queued (unrun) rAF.
// No browser, Codex process, user configuration, or external network is used.
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as filter from '../../packages/app/src/utils/contentFilter.js';
import * as normalize from '../../apps/web/src/utils/conversationEntryNormalize.js';
import * as slim from '../../apps/web/src/utils/entry-slim.js';
import * as sessions from '../../apps/web/src/utils/sessionManager.js';
import * as merge from '../../apps/web/src/utils/sessionMerge.js';
import * as pipeline from '../../apps/web/src/utils/ingestPipeline.js';
import * as body from '../../packages/app/lib/openai-body.js';
import { LogV2WriteCoordinator } from '../../packages/app/lib/log-v2/coordinator.js';
import { findActiveV2SessionFileAsync } from '../../packages/app/lib/log-v2/materializer.js';
import { readV2WireSnapshot } from '../../packages/app/lib/log-v2/transport.js';
import { serveLogV2Snapshot, serveLogV2Objects, serveLogV2Live } from '../../packages/app/server/lib/log-v2-routes.js';
import { closeIdleV2TimelinePublishers } from '../../packages/app/lib/log-v2/timeline-watcher.js';
import { fetchLogV2Snapshot } from '../../apps/web/src/utils/logV2Transport.js';
import { v2SnapshotCacheScope } from '../../apps/web/src/utils/logV2Cache.js';
import { LogV2Archive, isV2ConversationCandidate } from '../../apps/web/src/utils/logV2Archive.js';

const source = readFileSync(new URL('../../apps/web/src/AppBase.jsx', import.meta.url), 'utf8');
function between(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `source anchors changed: ${start}`);
  return text.slice(a, b);
}
const methods = [
  between(source, '  _rebuildRequestIndex(entries,', '  // 给子组件'),
  between(source, '  _processEntries(entries) {', '  componentDidMount() {'),
  between(source, '  async _projectV2Rows(', '  hydrateV2Request ='),
  between(source, '  initSSE() {', '  _initControlSSE() {'),
  between(source, '  async _loadLocalV2LogFile(file) {', '  handleEventMessage(event) {'),
  between(source, '  handleEntryObject(entry) {', '  _flushPendingEntries ='),
].join('\n');
const helpers = readFileSync(new URL('../../apps/web/src/utils/helpers.js', import.meta.url), 'utf8');
const relevant = between(helpers, 'export function isRelevantRequest(request) {', '\n\n/**').replace('export ', '');
const root = mkdtempSync(join(tmpdir(), 'cxv-b0-cold-ingest-'));
const coordinator = new LogV2WriteCoordinator({ rootDir: root, minFreeBytes: 0, minFreePercent: 0 });
const cwd = '/fixture/b0';
const context = sessionId => ({ projectId: 'b0', cwd, thread: { id: sessionId, sessionId } });
const activeFile = () => findActiveV2SessionFileAsync(root, {
  projectId: 'b0', canonicalCwd: cwd, runtime: { writer: coordinator.snapshot() },
});
// Exercise the actual snapshot/object handlers over loopback HTTP; this harness
// does not include server.js authentication or its process lifecycle.
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/log-v2/snapshot') {
      await serveLogV2Snapshot(req, res, {
        logDir: root, file: url.searchParams.get('file') || await activeFile(),
        readSnapshot: readV2WireSnapshot, readOnly: url.searchParams.has('file'), limit: 400,
      });
    } else if (url.pathname === '/api/log-v2/live') {
      await serveLogV2Live(req, res, {
        logDir: root, file: await activeFile(), getActiveFile: activeFile,
        afterSeq: Number(url.searchParams.get('afterSeq')),
        generation: url.searchParams.get('generation'), objectHandle: url.searchParams.get('handle'),
      });
    } else if (url.pathname === '/api/log-v2/objects') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await serveLogV2Objects(req, res, { logDir: root, body: JSON.parse(Buffer.concat(chunks).toString()) });
    } else { res.writeHead(404); res.end(); }
  } catch (error) { res.writeHead(500); res.end(error.message); }
});

try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const fetchImpl = (url, options) => fetch(new URL(url, base), options);
  const reports = [];
  const timers = [];
  let scheduled = 0;
  const Host = runInNewContext(`${relevant}\n(class AuditHost {${methods}})`, {
    ...filter, ...normalize, ...slim, ...sessions, ...merge, ...pipeline, ...body,
    isMobile: false, AbortController,
    requestAnimationFrame: () => ++scheduled,
    cancelAnimationFrame: () => {},
    setTimeout: (callback, delay) => { const timer = { callback, delay }; timers.push(timer); return timer; },
    clearTimeout: () => {},
    reportSwallowed: (scope, error) => reports.push({ scope, message: error.message }),
    loadV2CachedSnapshot: async () => null,
    reconcileV2CachedSnapshot: (_cached, response) => response,
    saveV2CachedSnapshot: () => {},
    fetchLogV2Snapshot: options => fetchLogV2Snapshot({ ...options, fetchImpl }),
    LogV2Archive: class extends LogV2Archive {
      constructor(snapshot) { super(snapshot, { fetchImpl }); }
    },
    isV2ConversationCandidate, v2SnapshotCacheScope,
  });
  function host() {
    return Object.assign(new Host(), {
      state: { requests: [], mainAgentSessions: [], fileLoading: true },
      _streamTransport: { closeAll() {} },
      _requestIndexMap: new Map(), _ingestToken: 0, _ingestRunning: false,
      _liveGateBuffer: [], _pendingEntries: [], _unmounted: false,
      _v2Epoch: 0, _v2LiveBuffer: [], _v2BootstrapReady: false,
      _startV2Live(snapshot) {
        this._probeSnapshot = snapshot;
        this._v2LiveSource = this._probeLiveSource = { closed: false, close() { this.closed = true; } };
      }, // browser EventSource is outside this probe
      _initControlSSE() { this.eventSource = { close() {} }; },
      _observeSuccessfulContextClear() {},
      mergeMainAgentSessions: merge.mergeMainAgentSessions,
      setState(patch, after) { Object.assign(this.state, patch); after?.(); },
    });
  }
  const entry = (text, inProgress, timestamp) => ({
    timestamp, url: 'codex://b0/turn', mainAgent: true, inProgress,
    body: { model: 'gpt-test', input: [{ type: 'message', role: 'user', content: text }] },
    ...(inProgress ? {} : { response: { status: 200, body: { content: [{ type: 'text', text: 'prior answer' }] } } }),
  });
  const prior = coordinator.writeAppServerEntry(entry('PRIOR', false, '2026-07-15T00:00:00Z'), context('prior'));
  assert.equal(prior.accepted, true);
  const first = entry('CURRENT FIRST TURN', true, '2026-07-15T00:01:00Z');
  assert.equal(coordinator.writeAppServerEntry(first, context('current')).accepted, true);
  const snapshot = await fetchLogV2Snapshot({ fetchImpl });
  assert.equal(snapshot.start.archive.sessionId, 'current');
  const healthy = host();
  assert.equal(await healthy._initV2Snapshot(), true);
  assert.equal(healthy._ingestRunning, false);
  assert.equal(healthy._v2BootstrapReady, true);
  const texts = healthy.state.mainAgentSessions.flatMap(s => s.messages.map(m => JSON.stringify(m.content)));
  assert.ok(texts.some(text => text.includes('CURRENT FIRST TURN')));
  assert.ok(texts.every(text => !text.includes('PRIOR')));
  const diskOnly = await findActiveV2SessionFileAsync(root, { projectId: 'b0', canonicalCwd: cwd });
  assert.equal(diskOnly, await activeFile());

  // A revision committed after the cold snapshot must be recoverable by cursor.
  const completed = { ...first, inProgress: false, response: { status: 200, body: { content: [{ type: 'text', text: 'CURRENT ANSWER' }] } } };
  assert.equal(coordinator.writeAppServerEntry(completed, context('current')).accepted, true);
  const baseline = healthy._probeSnapshot;
  const query = new URLSearchParams({ afterSeq: String(baseline.end.cursor.throughSeq),
    generation: baseline.start.archive.generation, handle: baseline.start.objectHandle });
  const live = await fetchImpl(`/api/log-v2/live?${query}`, { signal: AbortSignal.timeout(3000) });
  assert.equal(live.status, 200);
  const reader = live.body.getReader();
  let wire = '';
  let commit;
  try {
    while (!commit) {
      const { value, done } = await reader.read();
      assert.equal(done, false, 'live connection ended before the revision');
      wire += new TextDecoder().decode(value);
      const match = wire.match(/event: v2_commit\ndata: ([^\n]+)\n\n/);
      if (match) commit = JSON.parse(match[1]);
    }
  } finally { await reader.cancel(); }
  assert.equal(commit.frame.timeline.seq, baseline.end.cursor.throughSeq + 1);
  const row = healthy._v2Archive.applyCommit(commit.frame, commit.summary);
  const projected = await healthy._v2Archive.projectConversation(row._v2RowHandle);
  assert.equal(projected.inProgress, false);
  assert.ok(JSON.stringify(projected.response).includes('CURRENT ANSWER'));
  console.log(JSON.stringify({ scenario: 'first-turn-snapshot-and-cursor', currentSelected: true, diskPointerMatches: true, rendered: true, suffixSeq: commit.frame.timeline.seq }));

  const next = { ...first, timestamp: '2026-07-15T00:02:00Z', body: { ...first.body, input: [
    ...first.body.input,
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'CURRENT ANSWER' }] },
    { type: 'message', role: 'user', content: 'NEXT TURN' },
  ] } };
  assert.equal(coordinator.writeAppServerEntry(next, context('current')).accepted, true);
  const midRound = host();
  assert.equal(await midRound._initV2Snapshot(), true);
  assert.equal(midRound.state.mainAgentSessions.length, 1);
  assert.equal(midRound.state.mainAgentSessions[0].response, undefined);
  assert.ok(JSON.stringify(midRound.state.mainAgentSessions[0].messages).includes('CURRENT ANSWER'));
  console.log(JSON.stringify({ scenario: 'next-turn-refresh', previousAnswerInTranscript: true, lastSessionResponseCleared: true }));

  // Inject a processing failure after one real row has changed the dedup index.
  for (const mode of ['active', 'readonly']) {
    const h = host();
    h.state.requests = [{ timestamp: 'BASELINE', url: 'codex://baseline' }];
    h._requestIndexMap.set('BASELINE|codex://baseline', 0);
    const process = h._processOneEntry;
    h._processOneEntry = function (...args) {
      process.apply(this, args);
      this.handleEntryObject({ timestamp: 'BUFFERED', url: 'codex://live' });
      throw new Error('B0 injected processing failure');
    };
    // The direct live entry is injected too: V2 normally buffers pre-bootstrap
    // commits separately in _v2LiveBuffer. This proves gate behavior, not that
    // a real V2 commit naturally reaches handleEntryObject at this point.
    if (mode === 'active') {
      const init = h._initV2Snapshot;
      h._initV2Snapshot = function () { return (this._probePending = init.call(this)); };
      h.initSSE();
      assert.equal(await h._probePending, false);
      assert.equal(timers.at(-1).delay, 1000);
      assert.equal(h._probeLiveSource.closed, true);
      assert.equal(h._v2LiveSource, null);
    } else await h._loadLocalV2LogFile(await activeFile());
    assert.equal(h._ingestRunning, false);
    assert.equal(h._liveGateBuffer.length, 0);
    assert.equal(h._pendingEntries.length, 1);
    assert.equal(h.state.requests[0].timestamp, 'BASELINE');
    assert.equal(h._requestIndexMap.has('BASELINE|codex://baseline'), true);
    assert.equal(h._v2Archive, null);
    assert.equal(h._v2AppliedSeq, 0);
    assert.equal(h._v2LiveBuffer.length, 0);
    console.log(JSON.stringify({ scenario: `${mode}-processing-failure`, gateLatched: h._ingestRunning,
      gateBuffered: h._liveGateBuffer.length, loading: h.state.fileLoading,
      bootstrapReady: h._v2BootstrapReady, archiveRetained: !!h._v2Archive, committedIndexRestored: true }));
    h._processOneEntry = process;
    if (mode === 'active') {
      timers.at(-1).callback();
      assert.equal(await h._probePending, true);
      assert.equal(h._ingestRunning, false);
      assert.equal(h._liveGateBuffer.length, 0);
      console.log(JSON.stringify({ scenario: 'active-transient-retry', recovered: true, delayMs: 1000 }));
    } else {
      await h._loadLocalV2LogFile(await activeFile());
      assert.ok(h._v2Archive);
      assert.equal(h._ingestRunning, false);
      console.log(JSON.stringify({ scenario: 'readonly-explicit-retry', recovered: true }));
    }
  }
  // A late historical failure must not clear the replacement archive/loading.
  const superseded = host();
  const projectRows = superseded._projectV2Rows;
  let rejectOld;
  let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  superseded._projectV2Rows = async function (...args) {
    if (!rejectOld) return new Promise((_, reject) => { rejectOld = reject; signalStarted(); });
    return projectRows.apply(this, args);
  };
  const oldHistory = superseded._loadLocalV2LogFile(await activeFile());
  await started;
  await superseded._loadLocalV2LogFile(await activeFile());
  const currentArchive = superseded._v2Archive;
  superseded.state.fileLoading = true;
  rejectOld(new Error('superseded historical failure'));
  await oldHistory;
  assert.equal(superseded._v2Archive, currentArchive);
  assert.equal(superseded.state.fileLoading, true);
  console.log(JSON.stringify({ scenario: 'superseded-history-failure', replacementUntouched: true }));
  assert.doesNotThrow(() => host()._processEntries([null]));
  console.log(JSON.stringify({ scenario: 'null-row', processThrows: false, scheduledRafCallbacks: scheduled, reports }));
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  closeIdleV2TimelinePublishers();
  rmSync(root, { recursive: true, force: true });
}
