import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';

import { refreshResolvedModelInfo, healUnresolvedTeammateEntries } from '../src/utils/identityHeal.js';

test('teammate healing preserves a canonical name and still upgrades unnamed or legacy rows', () => {
  const entry = (tag, descriptor = {}) => ({ unresolved: true, label: 'Teammate: authoritative',
    req: { _v2Descriptor: descriptor, _classification: tag, teammate: 'heuristic-name', body: {} } });
  const named = entry({ type: 'Teammate', subType: 'authoritative' });
  const unnamed = entry({ type: 'Teammate', subType: null });
  const legacy = entry({ type: 'Teammate', subType: 'stale' }, null);
  healUnresolvedTeammateEntries([named, unnamed, legacy]);
  assert.equal(named.label, 'Teammate: authoritative');
  assert.equal(named.unresolved, true);
  assert.equal(unnamed.label, 'Teammate: heuristic-name');
  assert.equal(legacy.label, 'Teammate: heuristic-name');
  assert.equal(unnamed.unresolved, false);
});

test('cached assistant identity reconciles a wrong non-null model via producer timestamp', () => {
  const stale = { name: 'gpt-old' };
  const corrected = { name: 'gpt-current' };
  const item = React.createElement('div', {
    role: 'assistant',
    timestamp: 'carrier-ts',
    displayTs: 'producer-ts',
    modelInfo: stale,
  });
  let observed = null;

  const healed = refreshResolvedModelInfo([item], (timestamp, role, message) => {
    observed = { timestamp, role, message };
    return corrected;
  });

  assert.notEqual(healed[0], item);
  assert.equal(healed[0].props.modelInfo, corrected);
  assert.deepEqual(observed, {
    timestamp: 'carrier-ts',
    role: 'assistant',
    message: {
      role: 'assistant',
      _timestamp: 'carrier-ts',
      _generatedTs: 'producer-ts',
    },
  });
});

test('cached identity reconciliation preserves references when already correct', () => {
  const modelInfo = { name: 'gpt-current' };
  const item = React.createElement('div', {
    role: 'assistant',
    timestamp: 'carrier-ts',
    modelInfo,
  });
  const items = [item];

  const healed = refreshResolvedModelInfo(items, () => modelInfo);
  assert.equal(healed, items);
  assert.equal(healed[0], item);
});

test('cached identity can resolve or clear without touching non-model rows', () => {
  const resolved = { name: 'gpt-current' };
  const unresolved = React.createElement('div', {
    role: 'assistant', timestamp: 't1', modelInfo: null,
  });
  const stale = React.createElement('div', {
    role: 'assistant', timestamp: 't2', modelInfo: resolved,
  });
  const unrelated = React.createElement('div', { role: 'tool', timestamp: 't3' });

  const healed = refreshResolvedModelInfo(
    [unresolved, stale, unrelated],
    timestamp => (timestamp === 't1' ? resolved : null),
  );

  assert.equal(healed[0].props.modelInfo, resolved);
  assert.equal(healed[1].props.modelInfo, null);
  assert.equal(healed[2], unrelated);
});
