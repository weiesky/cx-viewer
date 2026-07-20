import test from 'node:test';
import assert from 'node:assert/strict';

import * as reconstructor from '../server/lib/delta-reconstructor.js';

test('IM delta reconstructor exposes only its live batch API', () => {
  assert.deepEqual(Object.keys(reconstructor), ['reconstructEntries']);
  const entries = [
    { mainAgent: true, _deltaFormat: 1, _isCheckpoint: true, _totalMessageCount: 1, body: { input: ['a'] } },
    { mainAgent: true, _deltaFormat: 1, _totalMessageCount: 2, body: { input: ['b'] } },
  ];
  reconstructor.reconstructEntries(entries);
  assert.deepEqual(entries[1].body.input, ['a', 'b']);
});
