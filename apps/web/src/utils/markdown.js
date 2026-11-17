import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { escapeHtml } from './helpers';
import { setupMermaidAutoRender } from '../hooks/useMermaidRender';
import { measureParse } from './markdownProfiler';

setupMermaidAutoRender();

const _mdCache = new Map();
const _memoryMdCache = new Map();
const _MD_CACHE_MAX = 1024;
const _MEMORY_MD_CACHE_MAX = 16;
const MEMORY_HTML_TAGS = [
  'a', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'strong', 'em', 'del',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'div', 'span',
];
const MEMORY_HTML_ATTRS = ['href', 'title', 'id', 'class', 'open', 'colspan', 'rowspan'];
const MEMORY_RELATIVE_URI = /^(?:#|(?!\/)(?![a-z][a-z0-9+.-]*:)[^\\\u0000-\u001f]*)$/i;

export function renderMarkdown(text) {
  if (!text) return '';
  const hit = _mdCache.get(text);
  if (hit !== undefined) return hit;

  let html;
  try {
    html = measureParse(() => DOMPurify.sanitize(marked.parse(text, { breaks: true })));
  } catch (e) {
    html = escapeHtml(text);
  }

  if (_mdCache.size >= _MD_CACHE_MAX) {
    // evict oldest (Map preserves insertion order)
    _mdCache.delete(_mdCache.keys().next().value);
  }
  _mdCache.set(text, html);
  return html;
}

// Local memories may contain evidence copied from earlier work. Render them
// without network-capable media tags so merely opening the viewer cannot load a
// tracking image or leak that the memory was viewed. Link navigation is further
// restricted by memoryLinkParser at the interaction layer.
export function renderMemoryMarkdown(text) {
  if (!text) return '';
  const hit = _memoryMdCache.get(text);
  if (hit !== undefined) return hit;

  let html;
  try {
    html = measureParse(() => DOMPurify.sanitize(marked.parse(text, { breaks: true }), {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: MEMORY_HTML_TAGS,
      ALLOWED_ATTR: MEMORY_HTML_ATTRS,
      ALLOWED_URI_REGEXP: MEMORY_RELATIVE_URI,
      FORBID_ATTR: ['style', 'src', 'srcset', 'poster', 'ping', 'action', 'formaction', 'xlink:href'],
      ALLOW_DATA_ATTR: false,
    }));
  } catch {
    html = escapeHtml(text);
  }
  if (_memoryMdCache.size >= _MEMORY_MD_CACHE_MAX) {
    _memoryMdCache.delete(_memoryMdCache.keys().next().value);
  }
  _memoryMdCache.set(text, html);
  return html;
}
