import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { setLogDir } from '../findcx.js';
import {
  acquireDingTalkImLock, getDingTalkImLiveness, readDingTalkImLock,
  releaseDingTalkImLock, updateDingTalkImLock, getDingTalkImLockPath,
} from '../lib/dingtalk-im-lock.js';

const root = mkdtempSync('/tmp/cxv-dingtalk-lock-');
setLogDir(root);
test.after(() => rmSync(root, { recursive: true, force: true }));

test('lock uses bootId/token identity and rejects a live second owner', () => {
  const acquired = acquireDingTalkImLock({ pid: 41001, isAlive: () => false });
  assert.equal(acquired.ok, true);
  assert.match(acquired.lock.bootId, /^[a-f0-9]{32}$/);
  assert.match(acquired.lock.token, /^[a-f0-9]{64}$/);
  assert.equal(acquireDingTalkImLock({ pid: 41002, isAlive: () => true }).ok, false);
  assert.equal(updateDingTalkImLock({ ...acquired.lock, bootId: 'wrong' }, { port: 7171 }), false);
  assert.equal(updateDingTalkImLock(acquired.lock, { port: 7171, ready: true, connected: true }), true);
  assert.equal(readDingTalkImLock().port, 7171);
  assert.equal(releaseDingTalkImLock({ ...acquired.lock, token: 'wrong' }), false);
  assert.equal(releaseDingTalkImLock(acquired.lock), true);
});

test('liveness requires a matching authenticated readiness probe', async () => {
  const acquired = acquireDingTalkImLock({ pid: 42001, isAlive: () => false });
  updateDingTalkImLock(acquired.lock, { port: 7172 });
  const hung = await getDingTalkImLiveness({ isAlive: () => true, probe: async () => null });
  assert.equal(hung.state, 'hung');
  const ready = await getDingTalkImLiveness({
    isAlive: () => true,
    probe: async lock => ({ platform: 'dingtalk', pid: lock.pid, bootId: lock.bootId, ready: true, connected: true }),
  });
  assert.equal(ready.state, 'ready');
  assert.equal(ready.connected, true);
  releaseDingTalkImLock(acquired.lock);
});

test('an unreadable lock is protected during boot then becomes reclaimable', async () => {
  writeFileSync(getDingTalkImLockPath(), '', { mode: 0o600 });
  assert.equal((await getDingTalkImLiveness()).state, 'booting');
  assert.equal((await getDingTalkImLiveness({ now: () => Date.now() + 60_000 })).state, 'dead');
  const acquired = acquireDingTalkImLock({ pid: 43001, isAlive: () => false, now: () => Date.now() + 60_000 });
  assert.equal(acquired.ok, true);
  releaseDingTalkImLock(acquired.lock);
});
