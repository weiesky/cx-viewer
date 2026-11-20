import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createProxy } from '../proxy.js';

async function fixture(run) {
  const previous = process.env.CXV_ORIGINAL_BASE_URL, oldTest = process.env.CXV_TEST;
  const responses = [], frames = [], proxies = [];
  const upstream = createServer((req, res) => { req.resume(); responses.push({ req, res }); });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  process.env.CXV_TEST = '1';
  process.env.CXV_ORIGINAL_BASE_URL = `http://127.0.0.1:${upstream.address().port}/v1`;
  const waitFor = async predicate => {
    const deadline = Date.now() + 4000;
    while (!predicate()) { assert.ok(Date.now() < deadline, 'proxy must settle'); await new Promise(resolve => setTimeout(resolve, 5)); }
  };
  const start = async (instanceKey = 'a', callback = value => frames.push(value)) => {
    const proxy = createProxy(); proxies.push(proxy);
    const port = await proxy.start({ captureContext: { cwd: '/owned/' + instanceKey, instanceKey },
      onSlowUpstream: callback, slowUpstreamMs: 40 });
    return { proxy, send: (path = '/v1/responses', signal) => fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST', signal, body: JSON.stringify({ model: 'fixture', metadata: { cwd: '/forged' } }),
      headers: { 'content-type': 'application/json', 'x-cx-viewer-instance': 'forged' },
    }).then(response => response.text()) };
  };
  try { await run({ responses, frames, start, waitFor }); }
  finally {
    proxies.forEach(proxy => proxy.stop()); upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
    if (previous === undefined) delete process.env.CXV_ORIGINAL_BASE_URL; else process.env.CXV_ORIGINAL_BASE_URL = previous;
    if (oldTest === undefined) delete process.env.CXV_TEST; else process.env.CXV_TEST = oldTest;
  }
}

test('slow requests retain owned scope and distinct ids; headers do not settle but the first body byte does', async () => {
  await fixture(async ({ responses, frames, start, waitFor }) => {
    const a = await start(), b = await start('b');
    const pending = [a.send(), b.send()]; await waitFor(() => responses.length === 2);
    responses[0].res.writeHead(200, { 'content-type': 'text/event-stream' }); responses[0].res.flushHeaders();
    await waitFor(() => frames.filter(frame => frame.type === 'slow').length === 2);
    const notices = frames.filter(frame => frame.type === 'slow');
    assert.equal(new Set(notices.map(frame => frame.requestId)).size, 2);
    assert.deepEqual(new Set(notices.map(frame => frame.cwd)), new Set(['/owned/a', '/owned/b']));
    assert.ok(notices.every(frame => frame.model === 'fixture' && frame.waitingMs >= 30));
    responses[0].res.write('first'); await waitFor(() => frames.filter(frame => frame.type === 'resolved').length === 1);
    const resolved = frames.at(-1); assert.equal(resolved.requestId, notices.find(frame => frame.instanceKey === resolved.instanceKey).requestId);
    responses[0].res.end(' second'); responses[1].res.end('other');
    assert.deepEqual(await Promise.all(pending), ['first second', 'other']);
    await waitFor(() => frames.filter(frame => frame.type === 'resolved').length === 2);
  });
});

test('error bodies settle on first byte and abort or proxy shutdown settles each fired request exactly once', async () => {
  await fixture(async ({ responses, frames, start, waitFor }) => {
    const a = await start(); const pending = a.send(); await waitFor(() => responses.length === 1);
    responses[0].res.writeHead(503); responses[0].res.flushHeaders();
    await waitFor(() => frames.length === 1); responses[0].res.write('failure');
    await waitFor(() => frames.length === 2); responses[0].res.end(); assert.equal(await pending, 'failure');
    const abort = new AbortController(), cancelled = a.send('/v1/responses', abort.signal).catch(() => 'cancelled');
    await waitFor(() => frames.length === 3); abort.abort(); assert.equal(await cancelled, 'cancelled');
    await waitFor(() => frames.length === 4);
    const stopped = a.send().catch(() => 'stopped'); await waitFor(() => frames.length === 5); a.proxy.stop(); await stopped;
    await waitFor(() => frames.length === 6);
    assert.deepEqual(frames.map(frame => frame.type), ['slow', 'resolved', 'slow', 'resolved', 'slow', 'resolved']);
    assert.ok([0, 2, 4].every(index => frames[index].requestId === frames[index + 1].requestId));
  });
});

test('early body bytes and utility endpoints never emit; an advisory callback failure cannot break forwarding', async () => {
  await fixture(async ({ responses, frames, start, waitFor }) => {
    const a = await start(); const pending = a.send(); await waitFor(() => responses.length === 1);
    responses[0].res.write('first');
    const utilities = ['/v1/responses/compact', '/v1/models'].map(path => a.send(path));
    await waitFor(() => responses.length === 3);
    await new Promise(resolve => setTimeout(resolve, 80)); assert.deepEqual(frames, []);
    responses.forEach(({ res }) => res.end('done')); await Promise.all([pending, ...utilities]);
    const broken = await start('broken', () => { throw new Error('listener failed'); }); const result = broken.send();
    await waitFor(() => responses.length === 4); await new Promise(resolve => setTimeout(resolve, 60));
    responses[3].res.end('still forwarded'); assert.equal(await result, 'still forwarded');
  });
});
