#!/usr/bin/env node

import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

import WebSocket from 'ws';

const DEFAULT_TOTAL_MIB = 4;
const DEFAULT_CHUNK_BYTES = 1024;
const EMIT_GROUP_CHUNKS = 32;
const ENFORCE_PERFORMANCE = process.argv.includes('--enforce-performance');
const TARGETS = Object.freeze({
  eventLoopP95Ms: 25,
  eventLoopMaxMs: 150,
  httpP95Ms: 100,
  httpMaxMs: 300,
  inputToPtyMs: 100,
  normalInputToWsReceiveMs: 150,
  resumeInputToSnapshotMs: 1000,
  maximumSnapshotBytes: 256 * 1024,
});

function readPositiveInteger(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${prefix}<value> must be a positive integer`);
  }
  return value;
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function summarize(values) {
  return {
    samples: values.length,
    p50: round(percentile(values, 0.5)),
    p95: round(percentile(values, 0.95)),
    max: round(values.length ? Math.max(...values) : 0),
  };
}

function immediate() {
  return new Promise(resolve => setImmediate(resolve));
}

function waitFor(predicate, timeoutMs = 3000) {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const value = predicate();
      if (value) {
        resolve(value);
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        reject(new Error('benchmark condition timed out'));
        return;
      }
      setImmediate(poll);
    };
    poll();
  });
}

function makeChunk(bytes) {
  const prefix = '\x1b[38;5;45m';
  const suffix = '\x1b[0m\r\n';
  const body = Math.max(0, bytes - prefix.length - suffix.length);
  return prefix + 'x'.repeat(body) + suffix;
}

function createFakePty() {
  const processes = [];
  const pty = {
    spawn(command, args, options) {
      const proc = {
        command,
        args,
        options,
        writes: [],
        resizeCalls: [],
        killed: false,
        onWrite: null,
        _onData: null,
        _onExit: null,
        onData(callback) { this._onData = callback; },
        onExit(callback) { this._onExit = callback; },
        write(data) {
          this.writes.push({ data, at: performance.now() });
          this.onWrite?.(data);
        },
        resize(cols, rows) { this.resizeCalls.push({ cols, rows }); },
        kill() { this.killed = true; },
        emitData(data) { this._onData?.(data); },
      };
      processes.push(proc);
      return proc;
    },
  };
  return { pty, processes };
}

function createTerminalClient(port) {
  const messages = [];
  const waiters = [];
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/terminal`, {
    headers: { Origin: `http://127.0.0.1:${port}` },
  });

  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());
    const waiterIndex = waiters.findIndex(waiter => waiter.predicate(message));
    if (waiterIndex >= 0) waiters.splice(waiterIndex, 1)[0].resolve(message);
    else messages.push(message);
  });

  const opened = new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  function receiveWhere(predicate, timeoutMs = 5000) {
    const existing = messages.findIndex(predicate);
    if (existing >= 0) return Promise.resolve(messages.splice(existing, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve(message) {
          clearTimeout(timer);
          resolve(message);
        },
      };
      const timer = setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new Error('timed out waiting for terminal WebSocket message'));
      }, timeoutMs);
      waiters.push(waiter);
    });
  }

  return {
    socket,
    messages,
    opened,
    receiveWhere,
    receive(type, timeoutMs) {
      return receiveWhere(message => message.type === type, timeoutMs);
    },
    async close() {
      if (socket.readyState === WebSocket.CLOSED) return;
      const closed = new Promise(resolve => socket.once('close', resolve));
      socket.close();
      await closed;
    },
  };
}

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const req = request({ hostname: '127.0.0.1', port, path }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.once('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP probe returned ${response.statusCode}`));
          return;
        }
        let parsed;
        try { parsed = JSON.parse(body); } catch {
          reject(new Error('HTTP probe returned invalid JSON'));
          return;
        }
        if (typeof parsed?.version !== 'string' || !parsed.version) {
          reject(new Error('HTTP probe response is missing version'));
          return;
        }
        resolve(performance.now() - startedAt);
      });
    });
    req.once('error', reject);
    req.end();
  });
}

function startHttpProbe(port) {
  const samples = [];
  let active = true;
  const done = (async () => {
    while (active) {
      samples.push(await httpGet(port, '/api/version-info'));
      await new Promise(resolve => setTimeout(resolve, 2));
    }
  })();
  return {
    async stop() {
      active = false;
      await done;
      return samples;
    },
  };
}

async function emitHistory(proc, totalBytes, chunkBytes) {
  const chunk = makeChunk(chunkBytes);
  let emitted = 0;
  let chunks = 0;
  while (emitted < totalBytes) {
    const remaining = totalBytes - emitted;
    const data = remaining >= chunkBytes ? chunk : makeChunk(remaining);
    proc.emitData(data);
    emitted += Buffer.byteLength(data, 'utf8');
    chunks++;
    if (chunks % EMIT_GROUP_CHUNKS === 0) await immediate();
  }
  return { emitted, chunks };
}

async function main() {
  const totalBytes = readPositiveInteger('total-mib', DEFAULT_TOTAL_MIB) * 1024 * 1024;
  const chunkBytes = readPositiveInteger('chunk-bytes', DEFAULT_CHUNK_BYTES);
  const temp = mkdtempSync(join(tmpdir(), 'cxv-terminal-benchmark-'));
  const portBase = 21000 + process.pid % 1000;
  process.env.CXV_LOG_DIR = temp;
  process.env.CXV_PROJECT_DIR = temp;
  process.env.CXV_START_PORT = String(portBase);
  process.env.CXV_MAX_PORT = String(portBase + 9);
  process.env.CXV_WORKSPACE_MODE = '1';
  process.env.CXV_CLI_MODE = '1';
  process.env.HTTPS_PROXY = 'http://proxy.invalid';

  let server;
  let ptyManager;
  let client;
  const eventLoop = monitorEventLoopDelay({ resolution: 1 });
  const fake = createFakePty();

  try {
    ptyManager = await import('../pty-manager.js');
    ptyManager._resetPtyManagerForTests();
    ptyManager._setPtyImportForTests(() => fake.pty);
    await ptyManager.spawnCodex(null, temp, [], '/bin/codex-benchmark');
    fake.processes[0].emitData('\x1b[2J\x1b[HREADY');
    await immediate();

    server = await import('../server.js');
    await server.startViewer();
    const port = server.getPort();
    client = createTerminalClient(port);
    await client.opened;
    await client.receive('state');
    await client.receive('data-resync');

    // Replace the process with a resume stream while the browser remains
    // connected. This is the path that previously replayed/scanned megabytes
    // on the shared main loop and issued recovery resizes.
    await ptyManager.spawnCodex(
      null,
      temp,
      ['resume', '--last'],
      '/bin/codex-benchmark',
    );
    const resumeProc = fake.processes.at(-1);
    const resumeState = await client.receiveWhere(
      message => message.type === 'state' && message.running
        && message.streamId === ptyManager.getPtyState().streamId,
    );

    eventLoop.enable();
    const httpProbe = startHttpProbe(port);
    await new Promise(resolve => setTimeout(resolve, 15));

    let inputSentAt = null;
    let inputWriteMs = null;
    resumeProc.onWrite = data => {
      if (data !== 'RESUME-INPUT') return;
      inputWriteMs = performance.now() - inputSentAt;
      setImmediate(() => resumeProc.emitData('\r\nRESUME-INPUT-ACK\r\n'));
    };

    const workloadStartedAt = performance.now();
    const historyPromise = emitHistory(resumeProc, totalBytes, chunkBytes);
    await immediate();
    inputSentAt = performance.now();
    client.socket.send(JSON.stringify({ type: 'input', data: 'RESUME-INPUT' }));
    await waitFor(() => inputWriteMs != null, 1000);
    const history = await historyPromise;
    const snapshot = await client.receiveWhere(
      message => message.type === 'data-resync'
        && message.streamId === resumeState.streamId,
      10000,
    );
    const resumeInputToSnapshotMs = performance.now() - inputSentAt;
    const resumeWallMs = performance.now() - workloadStartedAt;

    const canonical = ptyManager.getOutputSnapshot();
    if (!canonical.authoritative || canonical.throughSeq !== snapshot.throughSeq) {
      throw new Error('WebSocket snapshot does not match the canonical PTY cut');
    }
    if (resumeProc.resizeCalls.length !== 0) {
      throw new Error(`resume/resync issued ${resumeProc.resizeCalls.length} unexpected PTY resize(s)`);
    }

    // Once the baseline is installed, ordinary input and response bytes must
    // stay on the direct live path with exactly the next sequence number.
    let normalInputSentAt = null;
    let normalInputWriteMs = null;
    resumeProc.onWrite = data => {
      if (data !== 'NORMAL-INPUT') return;
      normalInputWriteMs = performance.now() - normalInputSentAt;
      setImmediate(() => resumeProc.emitData('NORMAL-INPUT-ACK'));
    };
    normalInputSentAt = performance.now();
    client.socket.send(JSON.stringify({ type: 'input', data: 'NORMAL-INPUT' }));
    await waitFor(() => normalInputWriteMs != null, 1000);
    const live = await client.receiveWhere(
      message => message.type === 'data'
        && message.streamId === snapshot.streamId
        && message.data.includes('NORMAL-INPUT-ACK'),
      3000,
    );
    const normalInputToWsReceiveMs = performance.now() - normalInputSentAt;
    if (live.seq !== snapshot.throughSeq + 1) {
      throw new Error(`live suffix gap: expected ${snapshot.throughSeq + 1}, received ${live.seq}`);
    }

    const httpSamples = await httpProbe.stop();
    eventLoop.disable();
    const eventLoopStats = {
      p50: round(eventLoop.percentile(50) / 1e6),
      p95: round(eventLoop.percentile(95) / 1e6),
      max: round(eventLoop.max / 1e6),
    };
    const httpStats = summarize(httpSamples);
    const snapshotBytes = Buffer.byteLength(snapshot.data, 'utf8');
    const invariantFailures = [];
    const performanceWarnings = [];
    if (httpStats.samples < 3) invariantFailures.push(`only ${httpStats.samples} HTTP samples`);
    if (eventLoopStats.p95 > TARGETS.eventLoopP95Ms) performanceWarnings.push(`event-loop p95 ${eventLoopStats.p95}ms`);
    if (eventLoopStats.max > TARGETS.eventLoopMaxMs) performanceWarnings.push(`event-loop max ${eventLoopStats.max}ms`);
    if (httpStats.p95 > TARGETS.httpP95Ms) performanceWarnings.push(`HTTP p95 ${httpStats.p95}ms`);
    if (httpStats.max > TARGETS.httpMaxMs) performanceWarnings.push(`HTTP max ${httpStats.max}ms`);
    if (inputWriteMs > TARGETS.inputToPtyMs) performanceWarnings.push(`resume input→PTY ${round(inputWriteMs)}ms`);
    if (normalInputWriteMs > TARGETS.inputToPtyMs) performanceWarnings.push(`normal input→PTY ${round(normalInputWriteMs)}ms`);
    if (normalInputToWsReceiveMs > TARGETS.normalInputToWsReceiveMs) {
      performanceWarnings.push(`normal input→WebSocket ${round(normalInputToWsReceiveMs)}ms`);
    }
    if (resumeInputToSnapshotMs > TARGETS.resumeInputToSnapshotMs) {
      performanceWarnings.push(`resume input→snapshot ${round(resumeInputToSnapshotMs)}ms`);
    }
    if (snapshotBytes > TARGETS.maximumSnapshotBytes) {
      invariantFailures.push(`snapshot ${snapshotBytes} bytes`);
    }

    const report = {
      benchmark: 'terminal-canonical-resume-integration',
      architecture: 'server + real headless Worker + fake PTY + WebSocket + concurrent HTTP',
      workload: {
        historyBytes: history.emitted,
        historyChunks: history.chunks,
        chunkBytes,
        streamId: snapshot.streamId,
        throughSeq: snapshot.throughSeq,
      },
      measurements: {
        resumeWallMs: round(resumeWallMs),
        throughputMiBPerSec: round((history.emitted / (1024 * 1024)) / (resumeWallMs / 1000)),
        eventLoopDelayMs: eventLoopStats,
        httpLatencyMs: httpStats,
        resumeInputToPtyMs: round(inputWriteMs),
        resumeInputToSnapshotMs: round(resumeInputToSnapshotMs),
        normalInputToPtyMs: round(normalInputWriteMs),
        normalInputToWsReceiveMs: round(normalInputToWsReceiveMs),
        canonicalSnapshotBytes: snapshotBytes,
      },
      invariants: {
        canonicalSnapshotCurrent: true,
        liveSuffixContiguous: true,
        recoveryPtyResizeCalls: resumeProc.resizeCalls.length,
        workerHealthy: canonical.modelHealthy,
      },
      targets: TARGETS,
      performanceEnforced: ENFORCE_PERFORMANCE,
      performancePassed: performanceWarnings.length === 0,
      performanceWarnings,
      passed: invariantFailures.length === 0
        && (!ENFORCE_PERFORMANCE || performanceWarnings.length === 0),
    };
    console.log(JSON.stringify(report, null, 2));
    const failures = [...invariantFailures, ...(ENFORCE_PERFORMANCE ? performanceWarnings : [])];
    if (failures.length > 0) throw new Error(`targets missed: ${failures.join(', ')}`);
  } finally {
    eventLoop.disable();
    await client?.close().catch(() => {});
    await server?.stopViewer();
    ptyManager?._resetPtyManagerForTests();
    rmSync(temp, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(`[benchmark:terminal-resume] ${error.stack || error.message}`);
  process.exitCode = 1;
});
