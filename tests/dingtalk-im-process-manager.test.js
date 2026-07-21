import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { setLogDir } from '../findcx.js';
import {
  buildDingTalkImChildEnv, spawnDingTalkImProcess, stopDingTalkImProcess, waitForDingTalkImReady,
} from '../lib/dingtalk-im-process-manager.js';
import {
  acquireDingTalkImLock, releaseDingTalkImLock, updateDingTalkImLock,
} from '../lib/dingtalk-im-lock.js';

const root = mkdtempSync('/tmp/cxv-dingtalk-process-');
setLogDir(root);
test.after(() => rmSync(root, { recursive: true, force: true }));

const validConfig = { enabled: true, appKey: 'key', appSecret: 'secret', allowStaffIds: ['staff-1'] };

test('child env strips inherited CXV internals and pins worker identity', () => {
  const env = buildDingTalkImChildEnv({ PATH: '/bin', CXV_LOG_DIR: root, CXV_PASSWORD: 'leak', CXVIEWER_X: 'leak' });
  assert.equal(env.PATH, '/bin');
  assert.equal(env.CXV_LOG_DIR, root);
  assert.equal(env.CXV_PASSWORD, undefined);
  assert.equal(env.CXVIEWER_X, undefined);
  assert.equal(env.CXV_IM_PLATFORM, 'dingtalk');
  assert.equal(env.CXV_HOST, '127.0.0.1');
});

test('spawn uses detached worker cwd and supports injected fake spawn', () => {
  let call;
  const result = spawnDingTalkImProcess({
    config: validConfig,
    spawnImpl(command, args, options) {
      call = { command, args, options };
      return { pid: 5151, unref() {} };
    },
  });
  assert.equal(result.pid, 5151);
  assert.deepEqual(call.args.slice(-3), ['--im', 'dingtalk', '--no-open']);
  assert.equal(call.options.detached, true);
  assert.equal(call.options.cwd, join(root, 'IM_dingtalk'));
});

test('test guard blocks a real detached spawn', () => {
  const previous = process.env.CXV_TEST;
  process.env.CXV_TEST = '1';
  try { assert.equal(spawnDingTalkImProcess({ config: validConfig }).blockedByTestGuard, true); }
  finally {
    if (previous === undefined) delete process.env.CXV_TEST;
    else process.env.CXV_TEST = previous;
  }
});

test('readiness requires both worker readiness and DingTalk connection', async () => {
  const acquired = acquireDingTalkImLock({ pid: 5252, isAlive: () => false });
  updateDingTalkImLock(acquired.lock, { port: 7173 });
  let probes = 0;
  const status = await waitForDingTalkImReady({
    timeoutMs: 100, pollIntervalMs: 1, isAlive: () => true,
    probe: async lock => ({
      platform: 'dingtalk', pid: lock.pid, bootId: lock.bootId,
      ready: ++probes > 1, connected: probes > 1,
    }),
  });
  assert.equal(status.ready, true);
  assert.equal(status.connected, true);
  assert.equal(probes, 2);
  releaseDingTalkImLock(acquired.lock);
});

test('readiness tolerates the child lock creation window after spawn', async () => {
  let lateLock;
  const timer = setTimeout(() => {
    lateLock = acquireDingTalkImLock({ pid: 5300, isAlive: () => false });
    updateDingTalkImLock(lateLock.lock, { port: 7174 });
  }, 5);
  const status = await waitForDingTalkImReady({
    timeoutMs: 100,
    initialSpawnGraceMs: 50,
    pollIntervalMs: 1,
    isAlive: () => true,
    probe: async lock => ({
      platform: 'dingtalk', pid: lock.pid, bootId: lock.bootId,
      ready: true, connected: true,
    }),
  });
  clearTimeout(timer);
  assert.equal(status.ready, true);
  assert.equal(status.connected, true);
  releaseDingTalkImLock(lateLock.lock);
});

test('stop refuses to signal a reused PID whose stable identity no longer matches', async () => {
  const acquired = acquireDingTalkImLock({ pid: 5353, isAlive: () => false });
  updateDingTalkImLock(acquired.lock, { processStartId: 'old-start', commandHash: 'a'.repeat(64) });
  let killed = false;
  const result = await stopDingTalkImProcess({
    isAlive: () => true,
    probe: async () => null,
    processAdapter: { inspect: async () => ({ pid: 5353, startId: 'new-start', commandHash: 'b'.repeat(64) }) },
    killImpl: () => { killed = true; },
  });
  assert.equal(result.stopped, true);
  assert.equal(result.stale, true);
  assert.equal(result.reason, 'identity-mismatch');
  assert.equal(killed, false);
  releaseDingTalkImLock(acquired.lock);
});
