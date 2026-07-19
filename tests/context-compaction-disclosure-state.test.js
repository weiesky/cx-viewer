import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createContextCompactionDisclosureState,
  EMPTY_COMPACTION_DISCLOSURE_STATE,
  reduceContextCompactionDisclosureState,
} from '../src/utils/contextCompactionDisclosureState.js';

test('conversation disclosures initialize expanded while popover disclosures stay collapsed', () => {
  const record = { present: true, sourceKey: 'compact:default', prompts: [] };
  assert.deepEqual(createContextCompactionDisclosureState({
    defaultExpanded: true,
    descriptorKey: 'descriptor:default',
    record,
  }), {
    expandedKey: 'compact:default',
    resolvedRecord: record,
  });
  assert.equal(
    createContextCompactionDisclosureState({ defaultExpanded: false, record }),
    EMPTY_COMPACTION_DISCLOSURE_STATE,
  );
});

test('compaction disclosure expands with a resolved record and collapses cleanly', () => {
  const record = { present: true, sourceKey: 'compact:1', prompts: [{ id: 'p1' }] };
  const expanded = reduceContextCompactionDisclosureState(
    EMPTY_COMPACTION_DISCLOSURE_STATE,
    { type: 'expand', descriptorKey: 'descriptor:1', record },
  );
  assert.equal(expanded.expandedKey, 'compact:1');
  assert.equal(expanded.resolvedRecord, record);
  assert.equal(
    reduceContextCompactionDisclosureState(expanded, { type: 'collapse' }),
    EMPTY_COMPACTION_DISCLOSURE_STATE,
  );
});

test('compaction disclosure supports empty records and resets on descriptor changes', () => {
  const expanded = reduceContextCompactionDisclosureState(
    EMPTY_COMPACTION_DISCLOSURE_STATE,
    { type: 'expand', descriptorKey: 'descriptor:empty', record: null },
  );
  assert.deepEqual(expanded, {
    expandedKey: 'descriptor:empty',
    resolvedRecord: null,
  });
  assert.equal(
    reduceContextCompactionDisclosureState(expanded, { type: 'reset' }),
    EMPTY_COMPACTION_DISCLOSURE_STATE,
  );
});
