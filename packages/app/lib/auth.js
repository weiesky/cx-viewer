import { randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { readPreferences, updatePreferences, getPreferencesPath, withPreferencesLock, writePreferences } from './preferences.js';
import { CREDENTIAL_PATHS } from './credential-paths.js';
import { createCredentialStore } from './credential-store.js';
import { readReferencedSecret, stageSecretReference, removeSecretReference } from './credential-reference.js';
import { assertConfigurationFormat, isConfigurationMigrated, markConfigurationMigrated } from './credential-migration-state.js';
import { createCredentialBackup, readCredentialSource } from './credential-backup.js';

export const AUTH_CREDENTIAL_VERSION_FIELD = '_cxvAuthCredentialVersion';
const passwordStore = createCredentialStore(CREDENTIAL_PATHS.root);
// Preserve the existing exact project-key semantics; do not merge distinct overrides.
export function authCredentialOwner(projectDir = null) { return JSON.stringify(['auth', projectDir || null]); }

const PASSWORD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PASSWORD_DIGITS = '0123456789';

function pickFrom(chars, count) {
  const limit = 256 - (256 % chars.length);
  let out = '';
  while (out.length < count) {
    const bytes = randomBytes(Math.max(1, count) * 2);
    for (const byte of bytes) {
      if (byte < limit) out += chars[byte % chars.length];
      if (out.length === count) break;
    }
  }
  return out;
}

export function generatePassword(length = 6) {
  const letters = Math.min(2, Math.max(0, length));
  const digits = Math.max(0, length - letters);
  return pickFrom(PASSWORD_LETTERS, letters) + pickFrom(PASSWORD_DIGITS, digits);
}

export function getAuthPrefsPath() {
  return getPreferencesPath();
}

function normalizeAuth(config) {
  return {
    enabled: !!config?.enabled,
    password: typeof config?.password === 'string' ? config.password : '',
    revision: Number.isSafeInteger(config?.revision) && config.revision >= 0 ? config.revision : 0,
  };
}

function encodePassword(password) {
  return password ? Buffer.from(password, 'utf8').toString('base64') : '';
}

function decodePassword(password) {
  if (password === '') return '';
  if (typeof password !== 'string') throw new TypeError('Invalid stored password');
  const bytes = Buffer.from(password, 'base64');
  if (!bytes.length || bytes.toString('base64') !== password) throw new TypeError('Invalid password encoding');
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

function checkCredentialVersion(version) {
  try { assertConfigurationFormat(passwordStore, 'auth', 'preferences.json', version); }
  catch { assertReadable({ passwordUnreadable: true }); }
  if (version !== undefined && version !== 1
      || version === 1 && resolve(dirname(getPreferencesPath())) !== resolve(dirname(CREDENTIAL_PATHS.root))) {
    assertReadable({ passwordUnreadable: true });
  }
}

function authMigrationSource() {
  if (resolve(dirname(getPreferencesPath())) !== resolve(dirname(CREDENTIAL_PATHS.root))) assertReadable({ passwordUnreadable: true });
  const bytes = readCredentialSource(dirname(getPreferencesPath()), 'preferences.json');
  let prefs;
  try { prefs = bytes === null ? {} : JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { assertReadable({ passwordUnreadable: true }); }
  if (!isRecord(prefs) || prefs.authByProject !== undefined && !isRecord(prefs.authByProject)) {
    assertReadable({ passwordUnreadable: true });
  }
  const version = prefs[AUTH_CREDENTIAL_VERSION_FIELD];
  checkCredentialVersion(version);
  const scopes = [];
  if (Object.hasOwn(prefs, 'auth')) scopes.push([null, prefs.auth]);
  for (const [project, config] of Object.entries(prefs.authByProject || {})) scopes.push([project, config]);
  const decoded = scopes.map(([project, stored]) => {
    const config = decodeStored(stored, project, version);
    assertReadable(config);
    return [project, config];
  }).sort(([left], [right]) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const activated = isConfigurationMigrated(passwordStore, 'auth', 'preferences.json');
  return { bytes, prefs, decoded, status: version === 1 ? activated ? 'migrated' : 'pending-receipt'
    : scopes.length ? 'legacy' : 'absent' };
}

export function inspectAuthCredentialMigration() {
  const { status, decoded } = authMigrationSource();
  return { status, scopes: decoded.length };
}

// Explicit offline operation only. Ordinary startup/save never calls this.
export function migrateAuthCredentials({ confirmStopped = false } = {}) {
  if (confirmStopped !== true) throw Object.assign(new Error('Stop every process sharing this configuration, then confirmStopped'), {
    code: 'CREDENTIAL_MIGRATION_REQUIRES_STOPPED',
  });
  return withPreferencesLock(() => {
    const initial = authMigrationSource();
    if (initial.status === 'migrated' || initial.status === 'absent') {
      return { status: initial.status, scopes: initial.decoded.length, backupPath: null };
    }
    const owner = dirname(getPreferencesPath());
    const backupPath = createCredentialBackup(owner, ['preferences.json']);
    const staged = [];
    let next = initial.prefs;
    try {
      if (initial.status === 'legacy') {
        const convert = (stored, project, config) => {
          const credentialOwner = authCredentialOwner(project);
          const passwordRef = stageSecretReference(passwordStore, 'lan-password', credentialOwner, config.password);
          staged.push([credentialOwner, passwordRef]);
          const { password, ...rest } = stored;
          return { ...rest, passwordRef };
        };
        next = { ...initial.prefs, [AUTH_CREDENTIAL_VERSION_FIELD]: 1 };
        const decoded = new Map(initial.decoded);
        if (Object.hasOwn(next, 'auth')) next.auth = convert(next.auth, null, decoded.get(null));
        if (next.authByProject) next.authByProject = Object.fromEntries(Object.entries(next.authByProject)
          .map(([project, stored]) => [project, convert(stored, project, decoded.get(project))]));
      }
      // Keep JSON's exact own-key semantics (including __proto__), then fsync
      // the source and its directory before marking the receipt complete.
      const current = readCredentialSource(owner, 'preferences.json');
      if (current === null || !current.equals(initial.bytes)) throw new Error('Source changed');
      writePreferences(next, { durable: true });
      const verified = authMigrationSource();
      if (verified.prefs[AUTH_CREDENTIAL_VERSION_FIELD] !== 1
          || JSON.stringify(verified.decoded) !== JSON.stringify(initial.decoded)) throw new Error('Migration verification failed');
      markConfigurationMigrated(passwordStore, 'auth', 'preferences.json');
      if (authMigrationSource().status !== 'migrated') throw new Error('Migration receipt verification failed');
      return { status: 'migrated', scopes: initial.decoded.length, backupPath };
    } catch {
      // A failed durable rename can have committed before a directory fsync
      // failed. Remove staged refs only if the exact original source remains.
      try {
        const current = readCredentialSource(owner, 'preferences.json');
        if (current !== null && current.equals(initial.bytes)) {
          for (const [credentialOwner, ref] of staged) removeSecretReference(passwordStore, 'lan-password', credentialOwner, ref);
        }
      } catch {}
      throw Object.assign(new Error('Credential migration did not finish; keep processes stopped and retry or recover from its matching backup'), {
        code: 'CREDENTIAL_MIGRATION_INCOMPLETE', status: 409, backupPath,
      });
    }
  });
}

function decodeStored(config, projectDir = null, version) {
  try {
    checkCredentialVersion(version);
    if (config === undefined) return normalizeAuth();
    if (!isRecord(config) || (config.enabled !== undefined && typeof config.enabled !== 'boolean')) {
      throw new TypeError('Invalid auth configuration');
    }
    if (version === 1) {
      if (Object.hasOwn(config, 'password')) throw new TypeError('Legacy password in migrated configuration');
      return normalizeAuth({ ...config,
        password: readReferencedSecret(passwordStore, 'lan-password', authCredentialOwner(projectDir), config.passwordRef),
      });
    }
    if (Object.hasOwn(config, 'passwordRef')) throw new TypeError('Encrypted password without a format version');
    return normalizeAuth({ ...config, password: decodePassword(
      config.password === undefined && !config.enabled ? '' : config.password,
    ) });
  } catch {
    return { ...normalizeAuth(config), password: '', passwordUnreadable: true };
  }
}

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function assertReadable(config) {
  if (config.passwordUnreadable) {
    throw Object.assign(new Error('Stored password is unreadable; restore the configuration before saving'), {
      code: 'PASSWORD_UNREADABLE', status: 409,
    });
  }
}

function readAuthPreferences() {
  try { return readPreferences({ strict: true }); } catch { return null; }
}

function projectAuthSource(prefs, projectDir) {
  return isRecord(prefs.authByProject) ? prefs.authByProject[projectDir] : null;
}

function encodeLegacyStored(config) {
  return { enabled: config.enabled, password: encodePassword(config.password), revision: config.revision };
}

function mutateAuthPreferences(updater) {
  const staged = [];
  const retired = [];
  const cleanup = refs => {
    for (const [owner, ref] of refs) {
      try { removeSecretReference(passwordStore, 'lan-password', owner, ref); }
      catch { console.warn('[CX Viewer] An inactive encrypted password could not be removed; restore its store before retrying cleanup'); }
    }
  };
  let result;
  try {
    result = updatePreferences(prefs => {
      const version = prefs[AUTH_CREDENTIAL_VERSION_FIELD];
      checkCredentialVersion(version);
      const retire = (stored, projectDir) => {
        if (version === 1 && typeof stored?.passwordRef === 'string') retired.push([authCredentialOwner(projectDir), stored.passwordRef]);
      };
      const encode = (config, projectDir, previous) => {
        if (version !== 1) return encodeLegacyStored(config);
        const owner = authCredentialOwner(projectDir);
        const passwordRef = stageSecretReference(passwordStore, 'lan-password', owner, config.password);
        staged.push([owner, passwordRef]);
        retire(previous, projectDir);
        return { enabled: config.enabled, passwordRef, revision: config.revision };
      };
      return updater(prefs, encode, retire);
    });
  } catch (error) { cleanup(staged); throw error; }
  cleanup(retired);
  return result;
}

function hasProjectOverride(prefs, projectDir) {
  return !!(
    projectDir &&
    prefs.authByProject !== undefined &&
    (!isRecord(prefs.authByProject) || Object.prototype.hasOwnProperty.call(prefs.authByProject, projectDir))
  );
}

export function loadAuthConfig(projectDir = null) {
  const prefs = readAuthPreferences();
  if (!prefs) return decodeStored(null);
  const overridden = hasProjectOverride(prefs, projectDir);
  const source = overridden
    ? projectAuthSource(prefs, projectDir)
    : prefs.auth;
  return decodeStored(source, overridden ? projectDir : null, prefs[AUTH_CREDENTIAL_VERSION_FIELD]);
}

export function loadAuthState(projectDir = null) {
  const prefs = readAuthPreferences();
  if (!prefs) return {
    effective: decodeStored(null), global: decodeStored(null), scope: 'global',
    hasProjectOverride: false, projectDir: projectDir || null,
  };
  const overridden = hasProjectOverride(prefs, projectDir);
  return {
    effective: decodeStored(overridden ? projectAuthSource(prefs, projectDir) : prefs.auth, overridden ? projectDir : null, prefs[AUTH_CREDENTIAL_VERSION_FIELD]),
    global: decodeStored(prefs.auth, null, prefs[AUTH_CREDENTIAL_VERSION_FIELD]),
    scope: overridden ? 'project' : 'global',
    hasProjectOverride: overridden,
    projectDir: projectDir || null,
  };
}

export function saveAuthConfig(config, { scope = 'global', projectDir = null } = {}) {
  let normalized;
  mutateAuthPreferences((prefs, encode) => {
    const projectScope = scope === 'project' && projectDir;
    const currentStored = projectScope
      ? (hasProjectOverride(prefs, projectDir) ? projectAuthSource(prefs, projectDir) : undefined)
      : prefs.auth;
    const current = decodeStored(currentStored, projectScope ? projectDir : null, prefs[AUTH_CREDENTIAL_VERSION_FIELD]);
    assertReadable(current);
    normalized = normalizeAuth({
      ...config,
      revision: current.revision + 1,
    });
    if (scope === 'project' && projectDir) {
      if (!prefs.authByProject || typeof prefs.authByProject !== 'object') prefs.authByProject = {};
      prefs.authByProject[projectDir] = encode(normalized, projectDir, currentStored);
    } else {
      prefs.auth = encode(normalized, null, currentStored);
    }
    return prefs;
  });
  return normalized;
}

export function clearProjectAuthOverride(projectDir) {
  if (!projectDir) return;
  mutateAuthPreferences((prefs, _encode, retire) => {
    if (hasProjectOverride(prefs, projectDir)) {
      if (!isRecord(prefs.authByProject)) assertReadable(decodeStored(null));
      retire(prefs.authByProject[projectDir], projectDir);
      delete prefs.authByProject[projectDir];
    }
    return prefs;
  });
}

export function enableGlobalAuthAndClearProjectOverride(projectDir) {
  let saved;
  mutateAuthPreferences((prefs, encode, retire) => {
    const current = decodeStored(prefs.auth, null, prefs[AUTH_CREDENTIAL_VERSION_FIELD]);
    assertReadable(current);
    saved = normalizeAuth({
      enabled: true,
      password: current.password || generatePassword(),
      revision: current.revision + 1,
    });
    prefs.auth = encode(saved, null, prefs.auth);
    if (projectDir && prefs.authByProject) {
      retire(prefs.authByProject[projectDir], projectDir);
      delete prefs.authByProject[projectDir];
    }
    return prefs;
  });
  return saved;
}

export function safeTokenMatches(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || !candidate || !expected) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isLoopbackHost(hostHeader) {
  if (typeof hostHeader !== 'string' || !hostHeader) return false;
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

export function isSameOriginRequest(origin, hostHeader, protocol = 'http') {
  if (!origin) return true;
  if (typeof origin !== 'string' || !hostHeader || origin === 'null') return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === `${protocol}:` && parsed.host.toLowerCase() === String(hostHeader).toLowerCase();
  } catch {
    return false;
  }
}

export function parseCookies(header) {
  const cookies = {};
  if (!header || typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (!name || Object.prototype.hasOwnProperty.call(cookies, name)) continue;
    cookies[name] = part.slice(separator + 1).trim();
  }
  return cookies;
}

export function decideAuth({
  isStaticAsset,
  pathname,
  isLocal,
  urlToken,
  cookieToken,
  accessToken,
  sessionToken,
  enabled,
  password,
  wantsHtml,
  passwordLoginAvailable = true,
  allowPasswordless = true,
  passwordUnreadable = false,
}) {
  if (
    isStaticAsset ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    isLocal ||
    safeTokenMatches(urlToken, accessToken)
  ) return { action: 'allow' };
  if (passwordUnreadable) return { action: 'forbidden' };
  if (
    safeTokenMatches(cookieToken, sessionToken) ||
    (allowPasswordless && enabled && password === '')
  ) return { action: 'allow' };

  if (enabled && !passwordLoginAvailable) return { action: 'insecure-password' };
  if (enabled) return { action: wantsHtml ? 'login-page' : 'unauthorized' };
  return { action: 'forbidden' };
}

export function localeFromAcceptLanguage(header) {
  if (!header || typeof header !== 'string') return 'en';
  const preferred = header.split(',')[0]?.trim().toLowerCase() || '';
  if (preferred.startsWith('zh')) return 'zh';
  return 'en';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LOGIN_COPY = {
  zh: {
    title: '请输入访问密码',
    placeholder: '密码',
    submit: '登录',
    error: '密码错误',
    toggle: '显示/隐藏密码',
  },
  en: {
    title: 'Enter access password',
    placeholder: 'Password',
    submit: 'Sign in',
    error: 'Incorrect password',
    toggle: 'Show/hide password',
  },
};

export function renderLoginPage({ lang = 'en', basePath = '' } = {}) {
  const loginUrl = JSON.stringify(`${basePath || '/'}api/auth/login`).replace(/</g, '\\u003c');
  const copy = LOGIN_COPY[lang] || LOGIN_COPY.en;
  const title = escapeHtml(copy.title);
  const placeholder = escapeHtml(copy.placeholder);
  const submit = escapeHtml(copy.submit);
  const error = escapeHtml(copy.error);
  const toggle = escapeHtml(copy.toggle);
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <meta name="robots" content="noindex">
  <title>${title}</title>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1a1a1a;color:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.card{width:min(340px,calc(100% - 32px));padding:32px 28px;background:#242424;border:1px solid #383838;border-radius:14px;box-shadow:0 8px 32px #0006}h1{margin:0 0 20px;font-size:18px;text-align:center}.field{position:relative}input{width:100%;padding:11px 44px 11px 14px;font-size:15px;color:inherit;background:#1a1a1a;border:1px solid #3a3a3a;border-radius:8px;outline:none}input:focus{border-color:#6c8cff}.toggle{position:absolute;right:6px;top:50%;translate:0 -50%;width:32px;height:32px;border:0;border-radius:6px;background:transparent;color:#aaa;cursor:pointer}.submit{width:100%;margin-top:14px;padding:11px;border:0;border-radius:8px;background:#4a6cf7;color:white;font-size:15px;font-weight:600;cursor:pointer}.submit:disabled{opacity:.6}.error{display:none;margin-top:12px;color:#ff7b7b;text-align:center;font-size:13px}
  </style>
</head>
<body><main class="card"><h1>${title}</h1><form id="form">
  <div class="field"><input id="password" type="password" placeholder="${placeholder}" autocomplete="current-password" autofocus><button class="toggle" id="toggle" type="button" title="${toggle}" aria-label="${toggle}">◉</button></div>
  <button class="submit" id="submit" type="submit">${submit}</button><div class="error" id="error">${error}</div>
</form></main>
<script>
  const form=document.getElementById('form'),password=document.getElementById('password'),submit=document.getElementById('submit'),error=document.getElementById('error');
  document.getElementById('toggle').onclick=()=>{password.type=password.type==='password'?'text':'password';password.focus()};
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;error.style.display='none';try{const response=await fetch(${loginUrl},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:password.value})});if(response.ok){location.reload();return}}catch{}error.style.display='block';submit.disabled=false;password.select()};
</script></body></html>`;
}
