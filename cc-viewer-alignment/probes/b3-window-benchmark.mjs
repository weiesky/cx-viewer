// Actual bounded snapshot/page/object routes and client projection over loopback.
// Synthetic fixed-size inputs isolate window cost from cumulative-input expansion.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { LogV2Writer } from '../../packages/app/lib/log-v2/writer.js';
import { readV2WireSnapshotAsync, readV2WirePageAsync, readV2WireSummariesAsync } from '../../packages/app/lib/log-v2/materializer.js';
import { serveLogV2Snapshot, serveLogV2Page, serveLogV2Objects } from '../../packages/app/server/lib/log-v2-routes.js';
import { fetchLogV2Snapshot, fetchLogV2Page } from '../../apps/web/src/utils/logV2Transport.js';
import { LogV2Archive } from '../../apps/web/src/utils/logV2Archive.js';

const fromExisting = !!process.argv[2];
const root = fromExisting ? resolve(process.argv[2]) : mkdtempSync(join(tmpdir(), 'cxv-b3-window-'));
const events = fromExisting ? Number(process.argv[4] || 2001) : 600;
let file = fromExisting ? process.argv[3] : null;
if (fromExisting && !file) throw new Error('existing fixture requires its canonical relative file');
let objectRequests = 0, objectBytes = 0;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://fixture');
    if (url.pathname === '/health') { res.end('ok'); return; }
    if (url.pathname === '/api/log-v2/snapshot') {
      await serveLogV2Snapshot(req, res, { logDir: root, file, limit: Number(url.searchParams.get('limit')),
        readSnapshot: readV2WireSnapshotAsync });
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (url.pathname === '/api/log-v2/page') {
      await serveLogV2Page(req, res, { logDir: root, body, readPage: readV2WirePageAsync, readSummaries: readV2WireSummariesAsync });
    } else if (url.pathname === '/api/log-v2/objects') {
      objectRequests++;
      const write = res.write;
      res.write = function (chunk, ...args) { objectBytes += Buffer.byteLength(chunk); return write.call(this, chunk, ...args); };
      await serveLogV2Objects(req, res, { logDir: root, body });
    } else { res.writeHead(404); res.end(); }
  } catch (error) {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message, code: error.code }));
  }
});
try {
  if (!fromExisting) {
    const writer = LogV2Writer.open({ rootDir: root, projectId: 'window', canonicalCwd: '/synthetic/window',
      sessionId: 'window', rootThreadId: 'window', source: 'app-server', startReason: 'startup', durability: 'buffered' });
    const identity = { sessionId: 'window', rootThreadId: 'window', threadId: 'window', agentRole: 'main', isRoot: true };
    const write = i => writer.append({ timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
      url: `codex://window/${i}`, mainAgent: true, _appServerSource: true,
      body: { model: 'fixture', input: [{ type: 'message', role: 'user', content: `${i}:${'x'.repeat(512)}` }] },
      response: { status: 200, body: { content: [{ type: 'text', text: `answer-${i}` }] } } }, identity);
    for (let i = 1; i <= events; i++) write(i);
    file = relative(root, join(writer.sessionDir, 'timeline.jsonl')).split('\\').join('/');
  }
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const fetchImpl = (url, options) => fetch(new URL(url, base), options);
  const results = [];
  for (const limit of [400, 200]) {
    const started = performance.now();
    const snapshot = await fetchLogV2Snapshot({ limit, fetchImpl });
    const snapshotMs = performance.now() - started;
    const archive = new LogV2Archive(snapshot, { fetchImpl });
    assert.equal(archive.rows.length, Math.min(limit, snapshot.start.total));
    if (!fromExisting) assert.equal(snapshot.start.total, events);
    assert.equal(archive.hasMore, true);
    const firstSeq = archive.rows[0]._v2Descriptor.seq;
    assert.equal(firstSeq, events - archive.rows.length + 1);
    const objectStart = objectRequests, byteStart = objectBytes;
    const projectedAt = performance.now();
    for (const row of archive.rows) {
      const entry = await archive.projectConversation(row._v2RowHandle);
      if (fromExisting) {
        assert.deepEqual(entry.body.input.filter(item => item.role === 'user').map(item => item.content), [`B3 A prompt ${row._v2Descriptor.seq}`]);
        assert.equal(entry.response.body.content[0].text, `B3 A reply ${row._v2Descriptor.seq}`);
      } else {
        assert.ok(entry.body.input[0].content.startsWith(`${row._v2Descriptor.seq}:`));
        assert.equal(entry.response.body.content[0].text, `answer-${row._v2Descriptor.seq}`);
      }
    }
    const projectionMs = performance.now() - projectedAt;
    const beforePage = performance.now();
    let pages = 0, ackPageToken = null, retryVerified = false;
    while (archive.hasMore) {
      const options = { handle: archive.start.objectHandle, archive: archive.start.archive, limit: 100, ackPageToken, fetchImpl };
      const page = await fetchLogV2Page(options);
      if (!retryVerified) {
        const retry = await fetchLogV2Page(options);
        assert.equal(retry.start.pageToken, page.start.pageToken);
        assert.deepEqual(retry.checkpoint, page.checkpoint);
        retryVerified = true;
      }
      archive.prependPage(page);
      ackPageToken = page.start.pageToken;
      pages++;
    }
    assert.deepEqual(archive.rows.map(row => row._v2Descriptor.seq), Array.from({ length: events }, (_, i) => i + 1));
    results.push({ limit, total: events, windowRows: snapshot.start.windowCount, shard: snapshot.start.shard || null, firstSeq, snapshotMs, projectionMs,
      objectRequests: objectRequests - objectStart, objectBytes: objectBytes - byteStart,
      historyPages: pages, paginationMs: performance.now() - beforePage, retryVerified,
      finalRows: archive.rows.length, rssBytes: process.memoryUsage().rss,
      controlBytes: Buffer.byteLength(JSON.stringify(snapshot)) });
  }
  console.log(JSON.stringify({ runtime: process.version, platform: process.platform, arch: process.arch,
    dataset: fromExisting ? `${events} cumulative synthetic GUI prompts, production 2000-prompt cut` : '600 distinct requests, one 512-byte user input per request, one fixed-size answer', results }, null, 2));
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  if (!fromExisting) rmSync(root, { recursive: true, force: true });
}
