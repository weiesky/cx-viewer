import test from 'node:test';
import assert from 'node:assert/strict';
import { readSdkScratchOpen, saveSdkScratchOpen } from '../src/utils/sdkScratchOpen.js';

test('SDK panel open and closed states survive reload independently from nested PTY scratch state', () => {
  const values = new Map([['cx-viewer-scratch-open', 'true']]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(readSdkScratchOpen(storage), false);
  saveSdkScratchOpen(true, storage);
  assert.equal(readSdkScratchOpen(storage), true);
  saveSdkScratchOpen(false, storage);
  assert.equal(readSdkScratchOpen(storage), false);
  assert.equal(values.get('cx-viewer-scratch-open'), 'true');
});

test('blocked or absent storage defaults to closed and does not prevent toggling', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readSdkScratchOpen(blocked), false);
  assert.doesNotThrow(() => saveSdkScratchOpen(true, blocked));
  assert.equal(readSdkScratchOpen(), false);
  assert.doesNotThrow(() => saveSdkScratchOpen(false));
});
