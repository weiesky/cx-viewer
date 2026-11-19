export const EMPTY_COMPACTION_DISCLOSURE_STATE = Object.freeze({
  expandedKey: null,
  resolvedRecord: null,
});

export function reduceContextCompactionDisclosureState(state, action) {
  if (action?.type === 'reset' || action?.type === 'collapse') {
    return EMPTY_COMPACTION_DISCLOSURE_STATE;
  }
  if (action?.type !== 'expand') return state;
  const record = action.record?.present ? action.record : null;
  return {
    expandedKey: record?.sourceKey || action.descriptorKey,
    resolvedRecord: record,
  };
}

export function createContextCompactionDisclosureState({
  defaultExpanded = false,
  descriptorKey = null,
  record = null,
} = {}) {
  if (!defaultExpanded) return EMPTY_COMPACTION_DISCLOSURE_STATE;
  return reduceContextCompactionDisclosureState(
    EMPTY_COMPACTION_DISCLOSURE_STATE,
    { type: 'expand', descriptorKey, record },
  );
}
