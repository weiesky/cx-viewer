import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  buildPlanUsageSnapshot,
  getPlanUsageSourceKey,
  shouldDisplayPlanUsage,
  transitionPlanUsage,
} from '../src/utils/planUsageDisplay.js';

test('plan usage source identity separates live projects and local archives', () => {
  assert.equal(getPlanUsageSourceKey({ projectName: 'one' }), 'live:one');
  assert.equal(getPlanUsageSourceKey({ projectName: 'two' }), 'live:two');
  assert.equal(getPlanUsageSourceKey({ isLocalLog: true, localLogFile: 'a.jsonl' }), 'local:a.jsonl');
  assert.equal(getPlanUsageSourceKey({ isLocalLog: true, localLogFile: 'b.jsonl' }), 'local:b.jsonl');
});

test('snapshot returns a stable null sentinel when a new source has no usage headers', () => {
  const populated = buildPlanUsageSnapshot([{
    response: { headers: {
      'x-codex-primary-used-percent': '23',
      'x-codex-primary-window-minutes': '300',
    } },
  }]);
  assert.equal(populated.planUsage.windows[0].utilization, 0.23);
  assert.equal(typeof populated.signature, 'string');
  assert.deepEqual(buildPlanUsageSnapshot([]), { planUsage: null, signature: null });
  assert.deepEqual(buildPlanUsageSnapshot([{ response: { headers: { authorization: 'secret' } } }]), {
    planUsage: null,
    signature: null,
  });
});

test('local logs show recorded usage but never show the live OAuth waiting placeholder', () => {
  assert.equal(shouldDisplayPlanUsage({ planUsage: { windows: [] }, isLocalLog: true, authType: 'OAuth' }), true);
  assert.equal(shouldDisplayPlanUsage({ planUsage: null, isLocalLog: true, authType: 'OAuth' }), false);
  assert.equal(shouldDisplayPlanUsage({ planUsage: null, isLocalLog: false, authType: 'OAuth' }), true);
  assert.equal(shouldDisplayPlanUsage({ planUsage: null, isLocalLog: false, authType: 'ApiKey' }), false);
});

test('App wires source changes, null cleanup, and the shared display decision', () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /transitionPlanUsage\(\{/);
  assert.match(source, /if \(next\.shouldSetState\) this\.setState\(\{ planUsage: next\.planUsage \}\)/);
  assert.match(source, /shouldDisplayPlanUsage\(\{ planUsage: this\.state\.planUsage, isLocalLog: this\._isLocalLog/);
  assert.doesNotMatch(source, /if \(this\._isLocalLog\) return/);
});

test('plan usage transition clears stale sources, accepts delayed rows, and does not loop', () => {
  const usageRows = [{ response: { headers: {
    'x-codex-primary-used-percent': '23',
    'x-codex-primary-window-minutes': '300',
  } } }];
  const liveA = transitionPlanUsage({}, { sourceKey: 'live:a', requestsChanged: true, requests: usageRows });
  assert.equal(liveA.shouldSetState, true);
  assert.equal(liveA.planUsage.windows[0].utilization, 0.23);

  const localBeforeRows = transitionPlanUsage(liveA, {
    sourceKey: 'local:a.jsonl', requestsChanged: false, requests: usageRows,
  });
  assert.deepEqual({ planUsage: localBeforeRows.planUsage, signature: localBeforeRows.signature, shouldSetState: localBeforeRows.shouldSetState }, {
    planUsage: null, signature: null, shouldSetState: true,
  });

  const localLoaded = transitionPlanUsage(localBeforeRows, {
    sourceKey: 'local:a.jsonl', requestsChanged: true, requests: usageRows,
  });
  assert.equal(localLoaded.planUsage.windows[0].utilization, 0.23);
  assert.equal(localLoaded.shouldSetState, true);

  const localEmpty = transitionPlanUsage(localLoaded, {
    sourceKey: 'local:a.jsonl', requestsChanged: true, requests: [],
  });
  assert.equal(localEmpty.planUsage, null);
  assert.equal(localEmpty.shouldSetState, true);
  assert.equal(transitionPlanUsage(localEmpty, {
    sourceKey: 'local:a.jsonl', requestsChanged: false, requests: [],
  }).shouldSetState, false);
});
