// Controlled node-search throughput + loopback HTTP responsiveness; no model or user files.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const root = mkdtempSync(join(tmpdir(), 'cxv-b5-search-benchmark-'));
process.env.CXV_LOG_DIR = join(root, 'state');
process.env.CXV_PROXY_PROFILE_PATH = join(root, 'profile.json');
const { searchCode } = await import(process.argv[2] ? pathToFileURL(process.argv[2]) : '../../packages/app/lib/code-search.js');
const server = createServer((_req, res) => { res.end('healthy'); });
try {
  const content = ('ordinary source text '.repeat(200) + '\n').repeat(64);
  for (let i = 0; i < 384; i++) writeFileSync(join(root, `f${i}.txt`), content);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const rounds = [];
  for (let i = 0; i < 3; i++) {
    const delay = monitorEventLoopDelay({ resolution: 5 });
    delay.enable();
    await new Promise(resolve => setTimeout(resolve, 15));
    let running = true;
    const samples = [];
    const poll = (async () => {
      while (running) {
        const start = performance.now();
        assert.equal(await (await fetch(endpoint)).text(), 'healthy');
        samples.push(performance.now() - start);
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    })();
    const started = performance.now();
    const result = await searchCode({ root, engine: 'node', query: 'absent-marker' });
    const elapsedMs = performance.now() - started;
    running = false;
    await poll;
    delay.disable();
    assert.equal(result.filesScanned, 384);
    assert.deepEqual(result.results, []);
    rounds.push({ elapsedMs, filesScanned: result.filesScanned, truncated: result.truncated,
      healthSamples: samples.length, maxHealthMs: Math.max(...samples), maxLoopDelayMs: delay.max / 1e6 });
  }
  console.log(JSON.stringify({ platform: process.platform, node: process.version, fixtureFiles: 384,
    fixtureBytes: Buffer.byteLength(content) * 384, harness: 'actual searchCode plus concurrent loopback HTTP health server', rounds }, null, 2));
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  rmSync(root, { recursive: true, force: true });
}
