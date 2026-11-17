import { deriveTurnId } from './log-v2/entry-codec.js';
import { isOpenAiResponsesMasterEntry } from './openai-responses-url.js';
import { getEffectiveModelName } from '../src/utils/modelIdentity.js';

function entryThreadId(entry) {
  const bodies = [entry?.body, entry?.request?.body];
  for (const body of bodies) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) continue;
    const value = body.client_metadata?.thread_id
      ?? body.metadata?.thread_id
      ?? body._threadId;
    if (typeof value === 'string' && value) return value;
  }
  const value = entry?._v2Descriptor?.threadId
    ?? entry?.threadId
    ?? entry?._agentThreadId;
  return typeof value === 'string' && value ? value : null;
}

function entryAgentRole(entry) {
  if (entry?.mainAgent === true) return 'main';
  if (entry?.subAgent === true) return 'subagent';
  const value = entry?._v2Descriptor?.agentRole ?? entry?.agentRole;
  if (typeof value === 'string' && value) return value;
  return null;
}

function correlationKey(entry) {
  const threadId = entryThreadId(entry);
  const turnId = entry?._v2Descriptor?.turnId ?? deriveTurnId(entry);
  const agentRole = entryAgentRole(entry);
  if (!threadId || typeof turnId !== 'string' || !turnId || !agentRole) return null;
  return `${threadId}\0${agentRole}\0${turnId}`;
}

function isCompletedProxyRequest(entry) {
  const status = Number(entry?.response?.status);
  return entry?._appServerSource !== true
    && typeof entry?.proxyUrl === 'string'
    && entry.proxyUrl.length > 0
    && typeof entry?.proxyProfile === 'string'
    && entry.proxyProfile.length > 0
    && entry?.inProgress !== true
    && Number.isFinite(status)
    && status > 0;
}

function isSettledProxyRouteEvidence(entry) {
  if (entry?._appServerSource === true || (entry?._codexRaw && typeof entry._codexRaw === 'object')
    || typeof entry?.proxyUrl !== 'string' || !entry.proxyUrl
    || typeof entry?.proxyProfile !== 'string' || !entry.proxyProfile
    || entry?.inProgress === true) return false;
  const status = Number(entry?.response?.status);
  return Number.isFinite(status) && (status > 0
    || (status === 0 && typeof entry?.response?.error === 'string' && Boolean(entry.response.error)));
}

function isAppServerEntry(entry) {
  return entry?._appServerSource === true
    || Boolean(entry?._codexRaw && typeof entry._codexRaw === 'object');
}

function isAppServerRetryNotification(entry) {
  if (!isAppServerEntry(entry) || entry?.url !== 'codex://error') return false;
  const body = entry?.response?.body;
  if (body?.willRetry === true) return true;
  const error = body?.error;
  const message = typeof error === 'string' ? error : error?.message;
  // Compatibility with logs written before willRetry was retained explicitly.
  return typeof message === 'string' && /^Reconnecting\.\.\.\s+\d+\/\d+$/i.test(message.trim());
}

function proxyRoute(entry) {
  const model = getEffectiveModelName(entry);
  if (!model) return null;
  return {
    model,
    proxyUrl: entry.proxyUrl,
    proxyProfile: entry.proxyProfile,
    ...(typeof entry.proxyWireApi === 'string' && entry.proxyWireApi
      ? { proxyWireApi: entry.proxyWireApi }
      : {}),
  };
}

function routeSignature(route) {
  let upstream = route.proxyUrl;
  try {
    const parsed = new URL(route.proxyUrl);
    const basePath = parsed.pathname
      .replace(/\/+$/, '')
      .replace(/\/(?:responses(?:\/compact)?|chat\/completions)$/, '');
    upstream = `${parsed.origin}${basePath}`;
  } catch {}
  return JSON.stringify([
    route.model,
    upstream,
    route.proxyProfile,
    route.proxyWireApi || null,
  ]);
}

function projectProxyRoute(entry, route) {
  const responseBody = entry.response?.body;
  return {
    ...entry,
    proxyUrl: entry.proxyUrl || route.proxyUrl,
    proxyProfile: entry.proxyProfile || route.proxyProfile,
    ...(entry.proxyWireApi
      ? {}
      : route.proxyWireApi ? { proxyWireApi: route.proxyWireApi } : {}),
    body: { ...entry.body, model: route.model },
    ...(responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)
      ? { response: { ...entry.response, body: { ...responseBody, model: route.model } } }
      : {}),
  };
}

/** Hide App Server transport mirrors and project effective proxy identity onto correlated errors. */
export function filterAppServerTransportMirrors(requests) {
  const proxyTurns = new Set();
  for (const entry of requests) {
    if (!isCompletedProxyRequest(entry)) continue;
    const key = correlationKey(entry);
    if (key) proxyTurns.add(key);
  }
  const priorProxyRoutes = new Map();
  return requests.flatMap(entry => {
    const key = correlationKey(entry);
    if (isSettledProxyRouteEvidence(entry) && key) {
      const route = proxyRoute(entry);
      if (route) {
        const previous = priorProxyRoutes.get(key);
        const signature = routeSignature(route);
        if (!previous) priorProxyRoutes.set(key, { route, signature, ambiguous: false });
        else if (previous.signature !== signature) previous.ambiguous = true;
        else previous.route = route;
      }
    }

    if (!isAppServerEntry(entry)) return [entry];
    // A retry notification is app-server control flow, not an HTTP request.
    // The corresponding failed/successful transport attempt remains visible.
    if (isAppServerRetryNotification(entry)) return [];
    if (isOpenAiResponsesMasterEntry(entry)) {
      return key && proxyTurns.has(key) ? [] : [entry];
    }
    if (entry.url !== 'codex://error' || !key) return [entry];
    const candidate = priorProxyRoutes.get(key);
    if (!candidate || candidate.ambiguous) return [entry];
    return [projectProxyRoute(entry, candidate.route)];
  });
}

export function projectVisibleRequests(requests, showAll, isRelevant) {
  const candidates = showAll ? requests : requests.filter(isRelevant);
  return filterAppServerTransportMirrors(candidates);
}
