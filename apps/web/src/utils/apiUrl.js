// 从 URL 中提取 LAN 访问 token，附加到所有 API 请求 / WebSocket 握手
const _urlToken = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('token')
  : null;

// 反向代理子路径部署: 从 <base> 标签或 SSR 注入的全局变量读取 base path，
// 使 API/WebSocket 等动态请求也能正确路由到代理后端。
export function getBasePath() {
  if (typeof window !== 'undefined' && window.__CXV_BASE_PATH__) return window.__CXV_BASE_PATH__;
  if (typeof document === 'undefined' || !document.querySelector) return '';
  const base = document.querySelector('base');
  if (base && base.href) return base.getAttribute('href');
  return '';
}

// 把 token 追加到任意 URL（HTTP path 或 ws:// 完整 URL 皆可）。无 token 时原样返回。
// WS 握手必须也带 token —— 否则启用鉴权后远程「?token=」终端会被 socket.destroy()。
export function appendToken(url) {
  if (!_urlToken) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(_urlToken)}`;
}

export function appendWorkspaceInstance(url) {
  if (typeof window === 'undefined') return url;
  const instance = new URLSearchParams(window.location.search).get('instance');
  if (instance === null) return url;
  const parsed = new URL(url, window.location.href);
  if (!parsed.searchParams.has('instance')) parsed.searchParams.set('instance', instance);
  return url.startsWith('/') ? parsed.pathname + parsed.search + parsed.hash : parsed.href;
}

export function apiUrl(path) {
  const base = getBasePath();
  const fullPath = base ? base.replace(/\/$/, '') + path : path;
  return appendToken(appendWorkspaceInstance(fullPath));
}

// Explicit native instance for reusable browser components; apiUrl retains the
// established current-view fallback and token/base-path handling.
export function withViewParams(path, { instance } = {}) {
  return instance ? `${path}${path.includes('?') ? '&' : '?'}instance=${encodeURIComponent(instance)}` : path;
}

// Target mode (the AGENTS.md / skill file-browser modal): append the target
// identity the server uses to re-derive the navigation root — `kind` plus either
// `id` (codex-md) or `source` + `targetPath` (skill). These go on the query
// string so the read route (/api/target-files) and the write routes
// (/api/target-*) resolve the SAME root. Pure string builder; combine with
// withViewParams (project/instance) and apiUrl (base/token) at the call site.
export function withTargetParams(path, target) {
  if (!target) return path;
  const params = new URLSearchParams({ kind: target.kind });
  if (target.kind === 'codex-md') params.set('id', target.id);
  else { params.set('source', target.source); params.set('targetPath', target.path); }
  return `${path}${path.includes('?') ? '&' : '?'}${params.toString()}`;
}
