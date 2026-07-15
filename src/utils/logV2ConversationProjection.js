// Parts required by the existing conversation normalizer/session boundary
// pipeline. Headers and request-container detail stay lazy in the network pane.
export const LOG_V2_CONVERSATION_PARTS = Object.freeze([
  'root.meta',
  'root.body',
  'response.meta',
  'response.body',
]);

export async function projectLogV2ConversationEntry(objectStore, descriptor, { inputRefs = [], signal } = {}) {
  if (!objectStore || !descriptor) throw new TypeError('object store and descriptor are required');
  return objectStore.materializeParts(descriptor, LOG_V2_CONVERSATION_PARTS, {
    includeInput: true,
    inputRefs,
    signal,
  });
}
