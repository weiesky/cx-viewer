import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readPreferences, updatePreferences, getPreferencesPath } from './preferences.js';

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
  if (!password || typeof password !== 'string') return '';
  try { return Buffer.from(password, 'base64').toString('utf8'); } catch { return ''; }
}

function decodeStored(config) {
  return normalizeAuth({
    enabled: config?.enabled,
    password: decodePassword(config?.password),
    revision: config?.revision,
  });
}

function encodeStored(config) {
  return { enabled: config.enabled, password: encodePassword(config.password), revision: config.revision };
}

function hasProjectOverride(prefs, projectDir) {
  return !!(
    projectDir &&
    prefs.authByProject &&
    Object.prototype.hasOwnProperty.call(prefs.authByProject, projectDir)
  );
}

export function loadAuthConfig(projectDir = null) {
  const prefs = readPreferences();
  const source = hasProjectOverride(prefs, projectDir)
    ? prefs.authByProject[projectDir]
    : prefs.auth;
  return decodeStored(source);
}

export function loadAuthState(projectDir = null) {
  const prefs = readPreferences();
  const overridden = hasProjectOverride(prefs, projectDir);
  return {
    effective: decodeStored(overridden ? prefs.authByProject[projectDir] : prefs.auth),
    global: decodeStored(prefs.auth),
    scope: overridden ? 'project' : 'global',
    hasProjectOverride: overridden,
    projectDir: projectDir || null,
  };
}

export function saveAuthConfig(config, { scope = 'global', projectDir = null } = {}) {
  let normalized;
  updatePreferences(prefs => {
    const currentStored = scope === 'project' && projectDir
      ? prefs.authByProject?.[projectDir]
      : prefs.auth;
    normalized = normalizeAuth({
      ...config,
      revision: decodeStored(currentStored).revision + 1,
    });
    if (scope === 'project' && projectDir) {
      if (!prefs.authByProject || typeof prefs.authByProject !== 'object') prefs.authByProject = {};
      prefs.authByProject[projectDir] = encodeStored(normalized);
    } else {
      prefs.auth = encodeStored(normalized);
    }
    return prefs;
  });
  return normalized;
}

export function clearProjectAuthOverride(projectDir) {
  if (!projectDir) return;
  updatePreferences(prefs => {
    if (hasProjectOverride(prefs, projectDir)) delete prefs.authByProject[projectDir];
    return prefs;
  });
}

export function enableGlobalAuthAndClearProjectOverride(projectDir) {
  let saved;
  updatePreferences(prefs => {
    const current = decodeStored(prefs.auth);
    saved = normalizeAuth({
      enabled: true,
      password: current.password || generatePassword(),
      revision: current.revision + 1,
    });
    prefs.auth = encodeStored(saved);
    if (projectDir && prefs.authByProject) delete prefs.authByProject[projectDir];
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
}) {
  if (
    isStaticAsset ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    isLocal ||
    safeTokenMatches(urlToken, accessToken) ||
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

export function renderLoginPage({ lang = 'en' } = {}) {
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
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;error.style.display='none';try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:password.value})});if(response.ok){location.reload();return}}catch{}error.style.display='block';submit.disabled=false;password.select()};
</script></body></html>`;
}
