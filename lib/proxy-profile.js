import * as zlib from 'node:zlib';
import { warnIfZlibOutputLimitUnsupported } from './interceptor-core.js';
warnIfZlibOutputLimitUnsupported();

export const PROXY_EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']);
export const PROXY_WIRE_APIS = Object.freeze(['responses', 'chat-completions']);
export const PROXY_PROFILE_VERSION = 3;
const MAX_REWRITTEN_BODY_BYTES = 32 * 1024 * 1024;

const PROFILE_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;
const INTERNAL_METADATA_KEYS = new Set(['cwd', 'session_id', 'thread_id', 'turn_id', 'sessionId', 'threadId', 'turnId']);

export function createDefaultProxyProfiles() {
  return { version: PROXY_PROFILE_VERSION, active: 'max', profiles: [{ id: 'max', name: 'Default' }] };
}

function isLoopbackHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '::1' || host === '0:0:0:0:0:0:0:1'
    || host === '127.0.0.1' || host.startsWith('127.');
}

function assertString(value, field, { required = false, max = 2048 } = {}) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string`);
  const normalized = value.trim();
  if (required && !normalized) throw new TypeError(`${field} is required`);
  if (normalized.length > max) throw new TypeError(`${field} is too long`);
  return normalized;
}

export function validateProxyProfilesDocument(input, { migrateLegacy = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Profile data must be an object');
  }
  if (!Array.isArray(input.profiles)) throw new TypeError('profiles must be an array');
  if (input.profiles.length === 0 || input.profiles.length > 100) {
    throw new TypeError('profiles must contain between 1 and 100 entries');
  }

  const version = input.version == null ? 1 : Number(input.version);
  if (!Number.isInteger(version) || version < 1) throw new TypeError('version is invalid');
  if (version > PROXY_PROFILE_VERSION) throw new TypeError(`Profile version ${version} is not supported`);
  const migrateV1 = migrateLegacy && version < 2;
  const ids = new Set();
  const profiles = input.profiles.map((source, index) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      throw new TypeError(`profiles[${index}] must be an object`);
    }
    const id = assertString(source.id, `profiles[${index}].id`, { required: true, max: 128 });
    if (!PROFILE_ID_RE.test(id)) throw new TypeError(`profiles[${index}].id is invalid`);
    if (ids.has(id)) throw new TypeError(`Duplicate profile id: ${id}`);
    ids.add(id);

    const name = assertString(source.name, `profiles[${index}].name`, { required: true, max: 128 });
    if (id === 'max') return { id, name };

    const baseURL = assertString(source.baseURL, `profiles[${index}].baseURL`, { required: true });
    let parsed;
    try { parsed = new URL(baseURL); } catch { throw new TypeError(`profiles[${index}].baseURL is invalid`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new TypeError(`profiles[${index}].baseURL must be an HTTP(S) URL without credentials, query parameters, or a fragment`);
    }
    if (parsed.protocol === 'http:' && !isLoopbackHostname(parsed.hostname)) {
      throw new TypeError(`profiles[${index}].baseURL must use HTTPS unless it targets loopback`);
    }
    const apiKey = assertString(source.apiKey, `profiles[${index}].apiKey`, { required: true, max: 8192 });
    const legacyModel = source.activeModel
      || source.OPENAI_MODEL
      || source.ANTHROPIC_MODEL
      || source.ANTHROPIC_DEFAULT_OPUS_MODEL
      || source.ANTHROPIC_DEFAULT_SONNET_MODEL
      || source.ANTHROPIC_DEFAULT_HAIKU_MODEL;
    const activeModel = assertString(legacyModel, `profiles[${index}].activeModel`, { max: 256 });
    // Older UI versions persisted effort:"max" by default although runtime ignored it.
    // Do not turn that dormant value into a costly override during migration.
    const effort = assertString(migrateV1 ? '' : source.effort, `profiles[${index}].effort`, { max: 16 });
    if (effort && !PROXY_EFFORTS.includes(effort)) {
      throw new TypeError(`profiles[${index}].effort is unsupported`);
    }
    const inferredWireApi = parsed.origin === 'https://api.deepseek.com'
      ? 'chat-completions'
      : 'responses';
    const wireApi = assertString(
      source.wireApi || (migrateLegacy && version < 3 ? inferredWireApi : ''),
      `profiles[${index}].wireApi`,
      { required: true, max: 32 },
    );
    if (!PROXY_WIRE_APIS.includes(wireApi)) {
      throw new TypeError(`profiles[${index}].wireApi is unsupported`);
    }
    return { id, name, baseURL: parsed.toString().replace(/\/$/, ''), apiKey, activeModel, effort, wireApi };
  });

  const active = assertString(input.active, 'active', { required: true, max: 128 });
  if (!ids.has(active)) throw new TypeError('active must reference an existing profile');
  if (!ids.has('max')) throw new TypeError('The built-in max profile is required');
  return { version: PROXY_PROFILE_VERSION, active, profiles };
}

function joinUrlPaths(basePathname, requestPathname) {
  const base = basePathname.split('/').filter(Boolean);
  const request = requestPathname.split('/').filter(Boolean);
  let overlap = Math.min(base.length, request.length);
  while (overlap > 0) {
    const baseTail = base.slice(base.length - overlap);
    const requestHead = request.slice(0, overlap);
    if (baseTail.every((segment, index) => segment === requestHead[index])) break;
    overlap--;
  }
  return `/${[...base, ...request.slice(overlap)].join('/')}`;
}

export function classifyProxyOperation(requestUrl, method = 'POST') {
  if (String(method).toUpperCase() !== 'POST') return null;
  let pathname;
  try {
    pathname = new URL(typeof requestUrl === 'string' ? requestUrl : requestUrl.url || String(requestUrl)).pathname;
  } catch {
    return null;
  }
  if (/%2f|%5c/i.test(pathname)) return null;
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/responses' || normalized.endsWith('/responses')) return 'responses';
  if (normalized === '/responses/compact' || normalized.endsWith('/responses/compact')) return 'compact';
  return null;
}

export function buildProxyProfileUrl(requestUrl, baseURL) {
  const request = new URL(typeof requestUrl === 'string' ? requestUrl : requestUrl.url || String(requestUrl));
  const base = new URL(baseURL);
  const operation = classifyProxyOperation(request, 'POST');
  const isChatGptBackendPath = request.pathname.includes('/backend-api/codex/');
  const requestPath = isChatGptBackendPath && operation === 'responses'
    ? '/responses'
    : isChatGptBackendPath && operation === 'compact'
      ? '/responses/compact'
      : request.pathname;
  base.pathname = joinUrlPaths(base.pathname, requestPath);
  base.search = request.search;
  base.hash = '';
  return base.toString();
}

function headerEntries(headers) {
  if (!headers) return [];
  if (typeof headers.entries === 'function') return Array.from(headers.entries());
  return Object.entries(headers);
}

const THIRD_PARTY_HEADER_ALLOWLIST = new Set([
  'accept',
  'cache-control',
  'content-type',
  'user-agent',
]);

export function buildThirdPartyHeaders(headers, apiKey, {
  jsonBody = false,
  preserveContentEncoding = false,
} = {}) {
  const rewritten = {};
  for (const [rawName, value] of headerEntries(headers)) {
    const name = rawName.toLowerCase();
    if (!THIRD_PARTY_HEADER_ALLOWLIST.has(name)) continue;
    rewritten[name] = value;
  }
  if (preserveContentEncoding) {
    const encoding = getHeader(headers, 'content-encoding');
    if (encoding) rewritten['content-encoding'] = encoding;
  }
  if (jsonBody) rewritten['content-type'] = 'application/json';
  rewritten.authorization = `Bearer ${apiKey}`;
  return headers instanceof Headers ? new Headers(rewritten) : rewritten;
}

function bodyToBuffer(body) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  return null;
}

function decodeBody(buffer, encoding) {
  const encodings = String(encoding || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
  let decoded = buffer;
  for (let index = encodings.length - 1; index >= 0; index--) {
    const current = encodings[index];
    if (current === 'identity') continue;
    const limits = { maxOutputLength: MAX_REWRITTEN_BODY_BYTES };
    if (current === 'gzip' || current === 'x-gzip') decoded = zlib.gunzipSync(decoded, limits);
    else if (current === 'br') decoded = zlib.brotliDecompressSync(decoded, limits);
    else if (current === 'deflate') {
      try { decoded = zlib.inflateSync(decoded, limits); }
      catch {
        decoded = zlib.inflateRawSync(decoded, limits);
      }
    }
    else if (current === 'deflate-raw') decoded = zlib.inflateRawSync(decoded, limits);
    else if (current === 'zstd' && typeof zlib.zstdDecompressSync === 'function') decoded = zlib.zstdDecompressSync(decoded, limits);
    else throw new TypeError(`Unsupported content-encoding: ${current}`);
  }
  if (decoded.length > MAX_REWRITTEN_BODY_BYTES) throw new TypeError('Responses request body is too large to rewrite');
  return { decoded, encodings };
}

function encodeBody(buffer, encodings) {
  let encoded = buffer;
  for (const current of encodings) {
    if (current === 'identity') continue;
    if (current === 'gzip' || current === 'x-gzip') encoded = zlib.gzipSync(encoded);
    else if (current === 'br') encoded = zlib.brotliCompressSync(encoded);
    else if (current === 'deflate') encoded = zlib.deflateSync(encoded);
    else if (current === 'deflate-raw') encoded = zlib.deflateRawSync(encoded);
    else if (current === 'zstd' && typeof zlib.zstdCompressSync === 'function') encoded = zlib.zstdCompressSync(encoded);
    else throw new TypeError(`Unsupported content-encoding: ${current}`);
  }
  return encoded;
}

function getHeader(headers, target) {
  for (const [name, value] of headerEntries(headers)) {
    if (name.toLowerCase() === target) return Array.isArray(value) ? value.join(', ') : String(value);
  }
  return '';
}

export function decodeProxyJsonBody(body, headers) {
  if (body == null) throw new TypeError('Responses request body is required');
  const binary = bodyToBuffer(body);
  const encoding = getHeader(headers, 'content-encoding');
  const { decoded } = binary
    ? decodeBody(binary, encoding)
    : { decoded: Buffer.from(String(body)) };
  if (decoded.length > MAX_REWRITTEN_BODY_BYTES) throw new TypeError('Responses request body is too large to rewrite');
  const json = JSON.parse(decoded.toString('utf8'));
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new TypeError('Responses request body must be a JSON object');
  }
  return json;
}

export function isOAuthProxyRequest(headers, authMode = '') {
  return String(authMode).toLowerCase() === 'oauth' || Boolean(getHeader(headers, 'chatgpt-account-id'));
}

function rewriteJsonBody(body, headers, profile) {
  if (body == null || (!profile.activeModel && !profile.effort)) return { body, changed: false, json: null };
  const binary = bodyToBuffer(body);
  const encoding = getHeader(headers, 'content-encoding');
  const { decoded, encodings } = binary
    ? decodeBody(binary, encoding)
    : { decoded: Buffer.from(String(body)), encodings: [] };
  if (decoded.length > MAX_REWRITTEN_BODY_BYTES) throw new TypeError('Responses request body is too large to rewrite');
  const json = JSON.parse(decoded.toString('utf8'));
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new TypeError('Responses request body must be a JSON object');
  if (profile.activeModel) json.model = profile.activeModel;
  if (profile.effort) {
    json.reasoning = json.reasoning && typeof json.reasoning === 'object' && !Array.isArray(json.reasoning)
      ? { ...json.reasoning, effort: profile.effort }
      : { effort: profile.effort };
  }
  // 与 Chat 路径保持一致：不把 CX Viewer/Codex 内部书签字段透传给第三方网关，
  // 但保留用户自定义 metadata（如网关自己的业务字段）。
  for (const field of ['client_metadata', 'metadata']) {
    const value = json[field];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const key of INTERNAL_METADATA_KEYS) delete value[key];
    if (Object.keys(value).length === 0) delete json[field];
  }
  const serialized = Buffer.from(JSON.stringify(json));
  if (!binary) return { body: serialized.toString('utf8'), changed: true, json };
  return { body: encodeBody(serialized, encodings), changed: true, json };
}

export function rewriteProxyProfileRequest(requestUrl, options = {}, profile) {
  if (!profile?.baseURL || !profile?.apiKey) return { url: requestUrl, options, json: null };
  const rewrittenBody = rewriteJsonBody(options.body, options.headers, profile);
  return {
    url: buildProxyProfileUrl(requestUrl, profile.baseURL),
    options: {
      ...options,
      headers: buildThirdPartyHeaders(options.headers, profile.apiKey, {
        jsonBody: rewrittenBody.changed,
        preserveContentEncoding: true,
      }),
      redirect: 'manual',
      ...(rewrittenBody.changed ? { body: rewrittenBody.body } : {}),
    },
    json: rewrittenBody.json,
  };
}
