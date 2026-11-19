import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLegacyRequestViewModels } from '../src/utils/requestViewModels.js';

test('legacy request view-model seam preserves exact entry identity per consumer lane', () => {
  const hidden = { timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://hidden' };
  const first = { timestamp: '2026-07-15T00:00:01.000Z', url: 'codex://first', body: { input: [] } };
  const second = { timestamp: '2026-07-15T00:00:02.000Z', url: 'codex://second', response: { status: 200 } };
  const visible = [first, second];

  const models = buildLegacyRequestViewModels({
    requests: [hidden, ...visible],
    filteredRequests: visible,
    selectedIndex: 1,
  });

  assert.deepEqual(models.conversationProjection, visible);
  assert.strictEqual(models.selectedRequest, second);
  assert.strictEqual(models.allRequests[0], hidden);
  assert.equal(models.requestDescriptors.length, 2);
  assert.strictEqual(
    models.hydratedEntryStore.get(models.requestDescriptors[0].handle),
    first,
  );
  assert.equal(models.selectedRowHandle, models.requestDescriptors[1].handle);
});

test('legacy handles remain distinct for duplicate timestamp/url rows', () => {
  const first = { timestamp: '2026-07-15T00:00:00.000Z', url: 'codex://same' };
  const second = { ...first };
  const models = buildLegacyRequestViewModels({
    requests: [first, second],
    filteredRequests: [first, second],
    selectedIndex: null,
  });

  assert.notEqual(models.requestDescriptors[0].handle, models.requestDescriptors[1].handle);
  assert.equal(models.selectedRequest, null);
  assert.equal(models.selectedRowHandle, null);
});
