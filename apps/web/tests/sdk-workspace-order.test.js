import test from 'node:test';
import assert from 'node:assert/strict';
import { SDK_WORKSPACE_ORDER_KEY, readSdkWorkspaceOrder, saveSdkWorkspaceOrder,
  orderedSdkWorkspaces, moveSdkWorkspace, sdkWorkspaceLabels } from '../src/utils/sdkWorkspaceOrder.js';

const row = (instanceKey, extra) => ({ instanceKey, projectName: 'same', cwd: `/projects/${instanceKey}/same`, ...extra });

test('workspace order round-trips stable instances, including same-named workspaces', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(readSdkWorkspaceOrder(storage), []);
  saveSdkWorkspaceOrder(['b', 'a'], storage);
  assert.deepEqual(JSON.parse(values.get(SDK_WORKSPACE_ORDER_KEY)), { v: 1, ids: ['b', 'a'] });
  assert.deepEqual(orderedSdkWorkspaces([row('a'), row('b')], readSdkWorkspaceOrder(storage)).map(item => item.cwd),
    ['/projects/b/same', '/projects/a/same']);
});

test('malformed and unsupported persisted versions fall back; duplicate/invalid ids cannot duplicate tabs', () => {
  for (const raw of ['{', 'null', '[]', '{"v":2,"ids":["a"]}', '{"v":1,"ids":"a"}', '{}']) {
    assert.deepEqual(readSdkWorkspaceOrder({ getItem: () => raw }), []);
  }
  assert.deepEqual(readSdkWorkspaceOrder({ getItem: () => '{"v":1,"ids":["b",null,4,"","a","b"]}' }), ['b', 'a']);
});

test('blocked storage, including a throwing localStorage getter, does not break ordering', t => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(readSdkWorkspaceOrder(blocked), []);
  assert.doesNotThrow(() => saveSdkWorkspaceOrder(['a'], blocked));
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked getter'); } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage; });
  assert.deepEqual(readSdkWorkspaceOrder(), []);
  assert.doesNotThrow(() => saveSdkWorkspaceOrder(['a']));
});

test('fresh polls retain manual order and append new arrivals using current live metadata', () => {
  const a = row('a', { busy: true }), b = row('b', { busy: false }), c = row('c');
  const fresh = Object.freeze([a, c, b]);
  const saved = Object.freeze(['gone', 'b', 'a', 'b']);
  const ordered = orderedSdkWorkspaces(fresh, saved);
  assert.deepEqual(ordered.map(item => item.instanceKey), ['b', 'a', 'c']);
  assert.equal(ordered[1], a);
  assert.equal(ordered[1].busy, true);
  assert.deepEqual(orderedSdkWorkspaces([], saved), []);
  assert.deepEqual(orderedSdkWorkspaces(fresh, []).map(item => item.instanceKey), ['a', 'c', 'b']);
});

test('only currently live keys can move, and input rows are never mutated', () => {
  const sessions = Object.freeze([row('a'), row('b'), row('c')]);
  assert.deepEqual(moveSdkWorkspace(sessions, 'a', 'c'), ['b', 'c', 'a']);
  assert.deepEqual(moveSdkWorkspace(sessions, 'c', 'a'), ['c', 'a', 'b']);
  for (const [from, to] of [['a', 'a'], ['gone', 'b'], ['a', 'gone'], ['a', undefined]]) {
    assert.equal(moveSdkWorkspace(sessions, from, to), null);
  }
  assert.deepEqual(sessions.map(item => item.instanceKey), ['a', 'b', 'c']);
});

test('same-name numbering follows immutable cwd identity rather than drag or poll order', () => {
  const rows = [row('z', { cwd: '/a/same' }), row('a', { cwd: '/b/same' }), row('b', { cwd: '/b/same' }),
    row('single', { projectName: 'other' })];
  const expected = [['z', 'same [1]'], ['a', 'same [2]'], ['b', 'same [3]'], ['single', 'other']];
  assert.deepEqual([...sdkWorkspaceLabels(rows)], expected);
  const reordered = sdkWorkspaceLabels([...rows].reverse());
  expected.forEach(([id, label]) => assert.equal(reordered.get(id), label));
});
