import { createHash, timingSafeEqual } from 'node:crypto';
import { generatePassword } from './auth.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const RATE_MAP_MAX = 1000;
const AUTH_BODY_MAX = 4096;
const AUTH_BODY_TIMEOUT_MS = 5000;
const loginAttempts = new Map();

function passwordMatches(input, expected) {
  const left = createHash('sha256').update(String(input).toUpperCase()).digest();
  const right = createHash('sha256').update(String(expected).toUpperCase()).digest();
  return timingSafeEqual(left, right);
}

function bodyError(message, status) {
  return Object.assign(new Error(message), { status });
}

function readBody(req, maxBytes = AUTH_BODY_MAX, timeoutMs = AUTH_BODY_TIMEOUT_MS) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) {
    req.resume();
    return Promise.reject(bodyError('Request body too large', 413));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
    };
    const fail = error => {
      if (settled) return;
      settled = true;
      cleanup();
      req.resume();
      reject(error);
    };
    const onData = chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        fail(bodyError('Request body too large', 413));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks, bytes).toString('utf8'));
    };
    const onError = error => fail(error);
    const onAborted = () => fail(bodyError('Request aborted', 400));
    const timer = setTimeout(() => fail(bodyError('Request body timeout', 408)), timeoutMs);
    timer.unref?.();
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('aborted', onAborted);
  });
}

function buildState(deps, isLocal) {
  const state = deps.getAuthState();
  return {
    enabled: state.effective.enabled,
    isAdmin: isLocal,
    password: isLocal ? state.effective.password : null,
    scope: state.scope,
    hasProjectOverride: state.hasProjectOverride,
    projectDir: state.projectDir,
    revision: state.effective.revision,
    remotePasswordLoginAvailable: !!deps.remotePasswordLogin,
    secureTransport: !!deps.secureCookies,
    global: {
      enabled: state.global.enabled,
      password: isLocal ? state.global.password : null,
    },
  };
}

function pruneAttempts(now) {
  for (const [key, value] of loginAttempts) {
    if (now - value.windowStart > RATE_WINDOW_MS && value.inFlight === 0) loginAttempts.delete(key);
  }
  while (loginAttempts.size > RATE_MAP_MAX) loginAttempts.delete(loginAttempts.keys().next().value);
}

function reserveAttempt(ip) {
  const now = Date.now();
  let attempt = loginAttempts.get(ip);
  if (!attempt || now - attempt.windowStart > RATE_WINDOW_MS) {
    attempt = { count: 0, inFlight: 0, windowStart: now };
    loginAttempts.set(ip, attempt);
  }
  pruneAttempts(now);
  if (attempt.count + attempt.inFlight >= RATE_MAX) return null;
  attempt.inFlight++;
  return attempt;
}

function finishAttempt(attempt, failed) {
  if (!attempt) return;
  attempt.inFlight = Math.max(0, attempt.inFlight - 1);
  if (failed) attempt.count++;
}

function sendJson(res, status, value, headers = {}) {
  res.writeHead(status, { ...JSON_HEADERS, ...headers });
  res.end(JSON.stringify(value));
}

export async function handleAuthRoute(req, res, { pathname, method, isLocal, deps }) {
  if (pathname === '/api/auth/state' && method === 'GET') {
    sendJson(res, 200, buildState(deps, isLocal));
    return true;
  }

  if (pathname === '/api/auth/config' && method === 'POST') {
    if (!isLocal) {
      sendJson(res, 403, { error: 'admin-only' });
      return true;
    }
    try {
      const incoming = JSON.parse(await readBody(req, deps.authBodyLimit || AUTH_BODY_MAX));
      const state = deps.getAuthState();
      if (incoming.action === 'enable-global-and-inherit') {
        deps.enableGlobalAndInherit();
        sendJson(res, 200, buildState(deps, isLocal));
        return true;
      }
      if (incoming.clearOverride === true) {
        deps.clearAuthOverride();
        sendJson(res, 200, buildState(deps, isLocal));
        return true;
      }
      const scope = incoming.scope === 'global' || !state.projectDir ? 'global' : 'project';
      const current = scope === 'global'
        ? state.global
        : (state.hasProjectOverride ? state.effective : { enabled: false, password: '' });
      const next = { ...current };
      if (typeof incoming.enabled === 'boolean') next.enabled = incoming.enabled;
      const hasPassword = typeof incoming.password === 'string';
      if (hasPassword) next.password = incoming.password;
      if (next.enabled && next.password === '' && !hasPassword) next.password = generatePassword();
      deps.setAuthConfig(next, scope);
      sendJson(res, 200, buildState(deps, isLocal));
    } catch (error) {
      sendJson(res, error.status || 400, { error: error.status === 413 ? 'Request body too large' : 'Invalid JSON' });
    }
    return true;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    if (!isLocal && !deps.remotePasswordLogin) {
      req.resume();
      sendJson(res, 403, { ok: false, error: 'secure-transport-required' });
      return true;
    }
    const ip = req.socket.remoteAddress || 'unknown';
    const attempt = reserveAttempt(ip);
    if (!attempt) {
      req.resume();
      sendJson(res, 429, { ok: false, error: 'rate-limited' });
      return true;
    }
    let password = '';
    let failed = true;
    try {
      password = String(JSON.parse(await readBody(req, deps.authBodyLimit || AUTH_BODY_MAX)).password ?? '');
      const config = deps.getAuthConfig();
      if (config.enabled && config.password !== '' && passwordMatches(password, config.password)) {
        failed = false;
        const secure = deps.secureCookies ? '; Secure' : '';
        sendJson(res, 200, { ok: true }, {
          'Set-Cookie': `cxv_auth=${deps.getSessionToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure}`,
        });
      } else {
        sendJson(res, 401, { ok: false });
      }
    } catch (error) {
      sendJson(res, error.status || 400, { ok: false, error: error.message || 'Invalid JSON' });
    } finally {
      finishAttempt(attempt, failed);
    }
    return true;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    deps.revokeSession?.(req.headers.cookie);
    const secure = deps.secureCookies ? '; Secure' : '';
    sendJson(res, 200, { ok: true }, {
      'Set-Cookie': `cxv_auth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
    });
    return true;
  }

  return false;
}
