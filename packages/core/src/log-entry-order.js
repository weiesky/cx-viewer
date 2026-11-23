/**
 * Replace a keyed value while preserving log commit order.
 *
 * Map#set updates a value without changing the key's insertion position. Log
 * entries are different: a later record with the same identity supersedes the
 * earlier record and must occupy the later record's position. This matters for
 * delta checkpoints emitted again after a process restart.
 */
export function setLatestMapValue(map, key, value) {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  return map;
}
