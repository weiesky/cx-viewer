import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, linkSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSdkExecContextReader } from '../lib/sdk-exec-context.js';

const time = '2026-11-23T14:00:00.000Z';
const row = payload => JSON.stringify({ timestamp: time, type: 'event_msg', payload }) + '\n';
const started = id => row({ type: 'task_started', turn_id: id });
const counted = (total = 54985, window = 475000) => row({ type: 'token_count', info: {
  last_token_usage: { input_tokens: total - 100, output_tokens: 100, total_tokens: total, cached_input_tokens: 40000 },
  total_token_usage: { total_tokens: 4140366 }, model_context_window: window,
} });

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'cxv-exec-context-'));
  const cwd = join(root, 'project'), home = join(root, 'codex');
  mkdirSync(cwd); mkdirSync(join(home, 'sessions'), { recursive: true });
  const path = join(home, 'sessions', 'owned.jsonl'), threadId = 'owned-thread';
  const meta = JSON.stringify({ type: 'session_meta', payload: { id: threadId, cwd, source: 'exec' } }) + '\n';
  writeFileSync(path, meta);
  let thread = { id: threadId, cwd, path }, stops = 0;
  const calls = [];
  const make = (options = {}) => createSdkExecContextReader({ cwd, threadId, codexPath: '/fixture',
    env: { CODEX_HOME: home }, startedAt: Date.parse(time), clientFactory: () => ({
      async request(method, params) { calls.push({ method, params }); return method === 'thread/read' ? { thread } : {}; },
      notify() {}, async stop() { stops++; },
    }), ...options });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, path, cwd, meta, make, calls, setThread: value => { thread = value; }, get stops() { return stops; } };
}

test('exec reader incrementally reads the owned last usage/window and only complete records', async t => {
  const f = fixture(t), reader = f.make();
  appendFileSync(f.path, started('turn') + counted());
  assert.equal((await reader.read()).usage.total_tokens, 54985);
  assert.equal(f.stops, 1, 'the read-only locator does not stay resident');
  assert.deepEqual(f.calls.map(call => call.method), ['initialize', 'thread/read']);
  const next = counted(171029, 258400);
  appendFileSync(f.path, next.slice(0, -4));
  assert.equal((await reader.read()).context_window, 475000, 'partial line is not a measurement');
  appendFileSync(f.path, next.slice(-4));
  const updated = await reader.read();
  assert.equal(updated.usage.total_tokens, 171029);
  assert.equal(updated.context_window, 258400);
  assert.equal(updated.turn_id, 'turn');
  await reader.close(); assert.equal(await reader.read(), null);
});

test('exec reader rejects stale turns and another turn cannot relabel its usage as the owned turn', async t => {
  const f = fixture(t), reader = f.make({ startedAt: Date.parse(time) + 1 });
  appendFileSync(f.path, started('old') + counted());
  assert.equal(await reader.read(), null);
  const fresh = (started('owned') + counted()).replaceAll(time, '2026-11-23T14:00:01.000Z');
  appendFileSync(f.path, fresh);
  assert.equal((await reader.read()).turn_id, 'owned');
  appendFileSync(f.path, (started('foreign') + counted(90000)).replaceAll(time, '2026-11-23T14:00:02.000Z'));
  assert.equal(await reader.read(), null);
});

test('exec reader fails closed on locator identity, native roots, file identity and hardlinks', async t => {
  for (const mode of ['thread', 'cwd', 'escape', 'metadata', 'hardlink']) {
    const f = fixture(t);
    appendFileSync(f.path, started('turn') + counted());
    if (mode === 'thread') f.setThread({ id: 'other', cwd: f.cwd, path: f.path });
    if (mode === 'cwd') f.setThread({ id: 'owned-thread', cwd: f.root, path: f.path });
    if (mode === 'escape') { const path = join(f.root, 'outside.jsonl'); writeFileSync(path, f.meta + started('turn') + counted()); f.setThread({ id: 'owned-thread', cwd: f.cwd, path }); }
    if (mode === 'metadata') writeFileSync(f.path, f.meta.replace('owned-thread', 'other-thread') + started('turn') + counted());
    if (mode === 'hardlink') linkSync(f.path, join(f.root, 'link.jsonl'));
    const reader = f.make();
    assert.equal(await reader.read(), null, mode);
    await reader.close();
  }
});

test('replacement and oversized tool rows retain bounded parsing and revalidate identity', async t => {
  const f = fixture(t), reader = f.make();
  appendFileSync(f.path, started('turn') + counted());
  assert.equal((await reader.read()).usage.total_tokens, 54985);
  const replacement = f.path + '.new';
  writeFileSync(replacement, f.meta + started('new-turn') + JSON.stringify({ type: 'tool', text: 'x'.repeat(5 * 1024 * 1024) }) + '\n' + counted(90000));
  renameSync(replacement, f.path);
  assert.equal((await reader.read()).usage.total_tokens, 90000);
  writeFileSync(replacement, f.meta.replace('owned-thread', 'sibling') + started('turn') + counted());
  renameSync(replacement, f.path);
  assert.equal(await reader.read(), null);
});

test('missing or invalid native window stays unknown and malformed records cannot become a snapshot', async t => {
  for (const window of [null, 0, -1, '475000']) {
    const f = fixture(t); appendFileSync(f.path, started('turn') + counted(54985, window));
    const snapshot = await f.make().read();
    assert.equal(snapshot.usage.total_tokens, 54985);
    assert.equal(snapshot.context_window, null);
  }
  const f = fixture(t); appendFileSync(f.path, started('turn') + '{invalid}\n' + counted());
  assert.equal(await f.make().read(), null);
  const cancelled = new AbortController(); cancelled.abort();
  assert.equal(await f.make({ signal: cancelled.signal }).read(), null);
});

test('terminal reads finish a large existing history without exposing its earlier measurements', async t => {
  const f = fixture(t), reader = f.make();
  appendFileSync(f.path, started('turn') + counted(20000)
    + JSON.stringify({ type: 'tool', text: 'x'.repeat(9 * 1024 * 1024) }) + '\n' + counted(90000));
  assert.equal(await reader.read(), null, 'the incremental read has not reached the current measurement');
  assert.equal((await reader.read({ complete: true })).usage.total_tokens, 90000);
});
