// Internal self-update handoff shared by the restart producer and server.
// Not a user setting: only the restart helper sets this variable. Keeping it
// in a shell would pin the LAN token across otherwise independent starts.
export const ACCESS_TOKEN_ENV = 'CXV_ACCESS_TOKEN';
export const ACCESS_TOKEN_RE = /^[a-f0-9]{32}$/;

export function isValidAccessToken(value) {
  return typeof value === 'string' && ACCESS_TOKEN_RE.test(value);
}

// Consume before the server launches Codex, shells or plugins. Invalid values
// are stripped too; the caller generates a fresh random token in that case.
export function takeInheritedAccessToken(env = process.env) {
  if (!env || typeof env !== 'object') return null;
  const raw = env[ACCESS_TOKEN_ENV];
  try { delete env[ACCESS_TOKEN_ENV]; } catch { /* frozen test env: best effort */ }
  return isValidAccessToken(raw) ? raw : null;
}
