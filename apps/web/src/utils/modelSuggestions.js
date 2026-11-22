// Upstream type-ahead rules, using the native profile/config.toml model fields.
const MODEL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export function collectModelSuggestions(profilesData, codexSettingsData) {
  const out = [], seen = new Set();
  const push = raw => {
    if (typeof raw !== 'string') return;
    const value = raw.trim().replace(/\[1m\]/gi, '').trim();
    if (!MODEL_NAME_RE.test(value) || value.toLowerCase() === 'default' || /_APPEND$/i.test(value)) return;
    const key = value.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(value); }
  };
  for (const profile of Array.isArray(profilesData?.profiles) ? profilesData.profiles : []) push(profile?.activeModel);
  push(profilesData?.defaultConfig?.model);
  push(codexSettingsData?.model);
  return out;
}
