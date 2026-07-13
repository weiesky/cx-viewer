const CONTROL_AND_BIDI_RE = /[\u0000-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

function cleanLabel(value) {
  return typeof value === 'string' ? value.replace(CONTROL_AND_BIDI_RE, '').trim() : '';
}

function decodedFilename(pathname) {
  const raw = pathname.split('/').filter(Boolean).pop() || '';
  try { return cleanLabel(decodeURIComponent(raw)); } catch { return cleanLabel(raw); }
}

function ipv4Parts(hostname) {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part))) return null;
  const values = parts.map(Number);
  return values.every(value => value >= 0 && value <= 255) ? values : null;
}

export function isPrivateRemoteHostname(value) {
  const hostname = String(value || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '::1' || hostname === '::') return true;
  if (hostname.endsWith('.local')) return true;
  const ipv4 = ipv4Parts(hostname);
  if (ipv4) {
    const [a, b] = ipv4;
    return a === 0 || a === 10 || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  const mapped = hostname.match(/^::ffff:(.+)$/);
  if (mapped) {
    const dotted = ipv4Parts(mapped[1]);
    if (dotted) return isPrivateRemoteHostname(dotted.join('.'));
    const words = mapped[1].split(':');
    if (words.length === 2 && words.every(word => /^[0-9a-f]{1,4}$/.test(word))) {
      const high = parseInt(words[0], 16);
      const low = parseInt(words[1], 16);
      return isPrivateRemoteHostname([
        high >>> 8,
        high & 0xff,
        low >>> 8,
        low & 0xff,
      ].join('.'));
    }
  }
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10) literals.
  return /^(?:fc|fd)[0-9a-f]{2}:/.test(hostname) || /^fe[89ab][0-9a-f]:/.test(hostname);
}

/** Return only disclosure-safe URL parts. Credentials, query and fragment never escape. */
export function describeRemoteImage(source, fallbackName = '') {
  if (typeof source !== 'string') return null;
  try {
    const url = new URL(source);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return {
      origin: url.origin,
      name: decodedFilename(url.pathname) || cleanLabel(fallbackName),
      privateNetwork: isPrivateRemoteHostname(url.hostname),
    };
  } catch {
    return null;
  }
}
