import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

import JSZip from 'jszip';

import {
  createV2SessionEntryStream,
  createV2SessionZip,
  LOG_ARCHIVE_LIMITS,
  parseV2SessionZip,
} from '../lib/log-v2/archive-zip.js';
import { resolveAppServerThreadIdentity } from '../lib/log-v2/identity.js';
import { readV2LogEntries } from '../lib/log-v2/materializer.js';
import { LogV2Writer } from '../lib/log-v2/writer.js';

function fixture(t, {
  projectId = 'archive-project',
  canonicalCwd = '/workspace/archive-project',
  sessionId = 'archive-session',
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-log-zip-test-'));
  const tempRoot = join(root, 'temp');
  mkdirSync(tempRoot, { recursive: true });
  const writer = LogV2Writer.open({
    rootDir: root,
    projectId,
    canonicalCwd,
    sessionId,
    rootThreadId: sessionId,
    createdAt: '2026-07-15T02:00:00.000Z',
  });
  const identity = resolveAppServerThreadIdentity({ id: sessionId, sessionId });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, tempRoot, writer, identity };
}

function entry(timestamp, prompt, text) {
  return {
    timestamp,
    url: 'codex://event/turn',
    method: 'POST',
    body: { metadata: { turn_id: `turn-${prompt}` }, input: [{ type: 'message', role: 'user', text: prompt }] },
    response: { status: 200, body: { content: [{ type: 'text', text }] } },
  };
}

function locator(root, writer) {
  return relative(root, join(writer.sessionDir, 'timeline.jsonl')).split(sep).join('/');
}

async function streamBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.once('error', reject);
    stream.once('end', () => resolve(Buffer.concat(chunks)));
  });
}

test('V2 session ZIP round-trips the complete folder and final winning entries', async (t) => {
  const { root, tempRoot, writer, identity } = fixture(t);
  writer.append(entry('2026-07-15T02:01:00.000Z', 'one', 'working'), identity, { phase: 'inProgress' });
  writer.append(entry('2026-07-15T02:01:00.000Z', 'one', 'done'), identity, { phase: 'completed' });
  writer.append(entry('2026-07-15T02:02:00.000Z', 'two', 'next'), identity);

  const expected = readV2LogEntries(root, locator(root, writer));
  const archive = await createV2SessionZip(root, locator(root, writer), { tempRoot });
  assert.equal(archive.rootName, '20260715_archive-session.cxvsession');
  const data = await streamBuffer(archive.stream);
  archive.dispose();

  const zip = await JSZip.loadAsync(data);
  const names = Object.keys(zip.files);
  assert.ok(names.includes(`${archive.rootName}/manifest.json`));
  assert.ok(names.includes(`${archive.rootName}/timeline.jsonl`));
  assert.ok(names.some(name => name.startsWith(`${archive.rootName}/threads/`) && name.endsWith('/entries.jsonl')));
  assert.ok(names.some(name => name.startsWith(`${archive.rootName}/objects/`) && name.endsWith('.json')));
  assert.equal(names.some(name => name.endsWith('.append.lock') || name.includes('.tmp-')), false);

  const parsed = await parseV2SessionZip(data, { filename: archive.fileName, tempRoot });
  assert.deepEqual(parsed.entries, expected);
  assert.deepEqual(parsed.entries.map(value => value.response.body.content[0].text), ['done', 'next']);
  assert.deepEqual(readdirSync(tempRoot), []);
});

test('V2 session ZIP round-trips canonical escapes used by synthetic and external identities', async (t) => {
  const sessionId = 'synthetic:Proxy/会话-A';
  const { root, tempRoot, writer, identity } = fixture(t, {
    projectId: 'Project/上海-A',
    canonicalCwd: '/workspace/Project/上海-A',
    sessionId,
  });
  writer.append(entry('2026-07-15T02:01:00.000Z', 'escaped', 'portable'), identity);

  const file = locator(root, writer);
  assert.match(file, /~/);
  const archive = await createV2SessionZip(root, file, { tempRoot });
  assert.match(archive.rootName, /~3a/);
  assert.match(archive.rootName, /~2f/);
  assert.match(archive.rootName, /~[0-9a-f]{2}/);
  const data = await streamBuffer(archive.stream);
  archive.dispose();

  const parsed = await parseV2SessionZip(data, { filename: archive.fileName, tempRoot });
  assert.equal(parsed.manifest.sessionId, sessionId);
  assert.deepEqual(parsed.entries.map(value => value.response.body.content[0].text), ['portable']);

  const materialized = await createV2SessionEntryStream(data, { filename: archive.fileName, tempRoot });
  const streamed = (await streamBuffer(materialized.stream)).toString('utf8')
    .split('\n---\n').filter(Boolean).map(JSON.parse);
  materialized.dispose();
  assert.equal(materialized.count, 1);
  assert.equal(materialized.size, Buffer.byteLength(`${JSON.stringify(streamed[0])}\n---\n`));
  assert.deepEqual(streamed, parsed.entries);
  assert.deepEqual(readdirSync(tempRoot), []);
});

test('V2 download snapshots an active session before later appends', async (t) => {
  const { root, tempRoot, writer, identity } = fixture(t);
  writer.append(entry('2026-07-15T02:01:00.000Z', 'one', 'first'), identity);
  const archive = await createV2SessionZip(root, locator(root, writer), { tempRoot });
  writer.append(entry('2026-07-15T02:02:00.000Z', 'two', 'later'), identity);
  const data = await streamBuffer(archive.stream);
  archive.dispose();

  const parsed = await parseV2SessionZip(data, { filename: archive.fileName, tempRoot });
  assert.deepEqual(parsed.entries.map(value => value.response.body.content[0].text), ['first']);
  assert.deepEqual(readdirSync(tempRoot), []);
});

test('V2 ZIP parser rejects unsafe topology and always cleans staging', async (t) => {
  const { tempRoot } = fixture(t);
  const cases = [
    ['traversal.zip', zip => zip.file('../outside.txt', 'bad'), /Unsafe ZIP path/],
    ['backslash.zip', zip => zip.file('20260715_session-a.cxvsession\\manifest.json', '{}'), /Unsafe ZIP path/],
    ['multiple.zip', zip => {
      zip.file('20260715_session-a.cxvsession/manifest.json', '{}');
      zip.file('20260715_session-b.cxvsession/timeline.jsonl', '{}\n');
    }, /multiple session roots/],
  ];
  for (const [name, build, expected] of cases) {
    const zip = new JSZip();
    build(zip);
    const data = Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
    await assert.rejects(parseV2SessionZip(data, { filename: name, tempRoot }), expected);
    assert.deepEqual(readdirSync(tempRoot), []);
  }

  const ratioZip = new JSZip();
  const ratioRoot = '20260715_ratio-session.cxvsession';
  ratioZip.file(`${ratioRoot}/manifest.json`, '{}');
  ratioZip.file(`${ratioRoot}/timeline.jsonl`, '');
  ratioZip.file(`${ratioRoot}/padding.json`, 'a'.repeat(1024 * 1024));
  const ratioData = Buffer.from(await ratioZip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  }));
  await assert.rejects(parseV2SessionZip(ratioData, { filename: 'ratio.zip', tempRoot }), error => {
    assert.equal(error.status, 413);
    return /expansion ratio/.test(error.message);
  });
  assert.deepEqual(readdirSync(tempRoot), []);
});

test('V2 ZIP parser rejects symlinks, quota excess, and corrupt referenced objects', async (t) => {
  const { root, tempRoot, writer, identity } = fixture(t);
  writer.append(entry('2026-07-15T02:01:00.000Z', 'one', 'done'), identity);
  const archive = await createV2SessionZip(root, locator(root, writer), { tempRoot });
  const validData = await streamBuffer(archive.stream);
  archive.dispose();

  const symlink = new JSZip();
  const sessionRoot = '20260715_link-session.cxvsession';
  symlink.file(`${sessionRoot}/manifest.json`, '{}');
  symlink.file(`${sessionRoot}/timeline.jsonl`, '');
  symlink.file(`${sessionRoot}/link`, 'target', { unixPermissions: 0o120777 });
  const symlinkData = Buffer.from(await symlink.generateAsync({ type: 'uint8array', platform: 'UNIX' }));
  await assert.rejects(parseV2SessionZip(symlinkData, { filename: 'link.zip', tempRoot }), /non-regular entry/);

  await assert.rejects(parseV2SessionZip(validData, {
    filename: archive.fileName,
    tempRoot,
    limits: { ...LOG_ARCHIVE_LIMITS, entries: 2 },
  }), error => error.status === 413);

  await assert.rejects(createV2SessionZip(root, locator(root, writer), {
    tempRoot,
    maxBytes: 32,
  }), error => error.status === 413);
  assert.deepEqual(readdirSync(tempRoot), []);

  const oversizedRef = await JSZip.loadAsync(validData);
  const timelineName = Object.keys(oversizedRef.files).find(name => name.endsWith('.cxvsession/timeline.jsonl'));
  const timeline = JSON.parse((await oversizedRef.file(timelineName).async('string')).trim());
  timeline.entryRef.length = 512 * 1024 * 1024;
  oversizedRef.file(timelineName, `${JSON.stringify(timeline)}\n`);
  const oversizedRefData = Buffer.from(await oversizedRef.generateAsync({ type: 'uint8array' }));
  await assert.rejects(parseV2SessionZip(oversizedRefData, { filename: 'oversized-ref.zip', tempRoot }), error => {
    assert.equal(error.status, 422);
    return /reference is too large|Invalid session archive/.test(error.message);
  });

  const corrupt = await JSZip.loadAsync(validData);
  const objectName = Object.keys(corrupt.files).find(name => name.includes('/objects/') && name.endsWith('.json'));
  assert.ok(objectName);
  corrupt.remove(objectName);
  const corruptData = Buffer.from(await corrupt.generateAsync({ type: 'uint8array' }));
  await assert.rejects(parseV2SessionZip(corruptData, { filename: 'corrupt.zip', tempRoot }), error => {
    assert.equal(error.status, 422);
    return /content object|Invalid session archive/.test(error.message);
  });
  assert.deepEqual(readdirSync(tempRoot), []);
});
