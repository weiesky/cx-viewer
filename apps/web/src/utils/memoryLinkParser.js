// Codex 记忆 markdown 内 <a> 链接拦截：白名单设计——只放行 #anchor 和
// memories root 内的生成 Markdown。嵌套链接按当前文档目录解析。
// CachePopoverContent.jsx + MemoryDetailModal.jsx 共用，避免双份 paste 漂移。
//
// 返回 discriminated union（而非简单 string | null）的理由：
//   调用方需要区分三种动作——打开 detail / 透传给浏览器（锚点滚动）/ 阻止默认行为。
//   { open: name } / { allow: true } / { reject: true } 让调用方一目了然，
//   编译期就能 catch 漏分支（不像 string | null 容易把 reject 误当 allow）。
//
// 拒绝规则（白名单优先）：
//   - 任意 scheme（http://, javascript:, chrome-extension:, custom-app:, x-anything: 等）一律拒绝。
//     持久记忆面板内不导航外站；上游受信任 markdown 也禁止 deep-link 至浏览器协议处理器。
//   - 绝对路径 / 反斜杠 / 越过 memories root 的 `..` / 隐藏文件
//   - 非 .md 后缀
const ANCHOR_PREFIX = '#';
const ROOT_FILES = new Set(['MEMORY.md', 'memory_summary.md']);
const ALLOWED_TREES = new Set(['rollout_summaries', 'skills']);

export function parseMemoryLink(hrefRaw, baseFile = 'MEMORY.md') {
  if (!hrefRaw) return { reject: true };

  const trimmed = hrefRaw.trim();
  if (!trimmed) return { reject: true };

  // 锚点链接（#section）放过，让浏览器原地滚动
  if (trimmed.startsWith(ANCHOR_PREFIX)) return { allow: true };

  // 任何 scheme 标记（首段 [a-z][a-z0-9+.-]*: 模式）一律拒绝。
  // 大小写不敏感（toLowerCase 规范化防 `JaVaScRiPt:` 之类绕过）。
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return { reject: true };

  // 去掉 query/hash + URL 解码一次。服务端接收规范化后的 root-relative
  // 路径，不再二次解码，避免双编码改变路径语义。
  let candidate;
  try {
    candidate = decodeURIComponent(trimmed.split('#')[0].split('?')[0]);
  } catch {
    return { reject: true };
  }

  if (!candidate || candidate.startsWith('/') || candidate.startsWith('\\')
      || candidate.includes('\\') || candidate.includes('\0') || candidate.includes(':')) {
    return { reject: true };
  }

  const baseParts = String(baseFile || 'MEMORY.md').split('/');
  baseParts.pop();
  const resolved = baseParts;
  for (const part of candidate.split('/')) {
    if (!part) return { reject: true };
    if (part === '.') continue;
    if (part === '..') {
      if (resolved.length === 0) return { reject: true };
      resolved.pop();
      continue;
    }
    if (part.startsWith('.')) return { reject: true };
    resolved.push(part);
  }

  if (resolved.length === 0 || !/\.md$/i.test(resolved[resolved.length - 1])) return { reject: true };
  if (resolved.length === 1) {
    if (!ROOT_FILES.has(resolved[0])) return { reject: true };
  } else if (!ALLOWED_TREES.has(resolved[0])) {
    return { reject: true };
  }

  return { open: resolved.join('/') };
}
