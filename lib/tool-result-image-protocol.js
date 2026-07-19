const SAFE_RASTER_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

function isValidBase64(data) {
  return typeof data === 'string'
    && data.length > 0
    && data.length % 4 === 0
    && /^[A-Za-z0-9+/]+={0,2}$/.test(data);
}

/** Normalize only image parts that the viewer can safely render. */
export function parseSupportedToolResultImage(part) {
  if (!part || typeof part !== 'object') return null;

  if (part.type === 'image' && part.source) {
    const source = part.source;
    if (source.type === 'base64'
      && SAFE_RASTER_IMAGE_MIME.has(source.media_type)
      && isValidBase64(source.data)) {
      return { type: 'base64', media_type: source.media_type, data: source.data };
    }
    if (source.type === 'url' && typeof source.url === 'string' && /^https?:\/\//.test(source.url)) {
      return { type: 'url', url: source.url };
    }
    return null;
  }

  if (part.type !== 'input_image' && part.type !== 'image_url') return null;
  const imageUrl = typeof part.image_url === 'string'
    ? part.image_url
    : (typeof part.image_url?.url === 'string' ? part.image_url.url : null);
  if (!imageUrl) return null;

  const match = imageUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (match && isValidBase64(match[2])) {
    return { type: 'base64', media_type: match[1], data: match[2] };
  }
  if (/^https?:\/\//.test(imageUrl)) return { type: 'url', url: imageUrl };
  return null;
}
