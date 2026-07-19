/**
 * Structural conversation rows describe transcript boundaries and remain
 * visible regardless of which speaker roles are selected.
 */
export function isConversationItemVisibleForRoles(role, label, selectedRoles) {
  if (role === 'context-compaction') return true;
  if (role === 'user' || role === 'plan-prompt') return selectedRoles.has('user');
  if (role === 'assistant') return selectedRoles.has('assistant');
  if (role === 'sub-agent-chat') {
    return selectedRoles.has(`sub:${label || 'SubAgent'}`);
  }
  return false;
}
