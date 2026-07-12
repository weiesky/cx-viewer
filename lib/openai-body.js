// CLIENT-SAFE: shared helpers for OpenAI Responses request bodies.
// cx-viewer stores and reads both Responses request layouts:
//   legacy: { instructions, tools, input }
//   current: input[0] = { type: 'additional_tools', tools }, followed by a
//            developer/system message carrying the system prompt.
// Do not add `system` / `messages` fallbacks here; those are not Responses fields.

export function textFromContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.input_text === 'string') return content.input_text;
    if (typeof content.output_text === 'string') return content.output_text;
    if (typeof content.refusal === 'string') return content.refusal;
    if (Array.isArray(content.content) || typeof content.content === 'string') {
      return textFromContent(content.content);
    }
    return '';
  }
  return content.map(part => {
    if (!part) return '';
    if (typeof part === 'string') return part;
    if (typeof part.text === 'string') return part.text;
    if (typeof part.input_text === 'string') return part.input_text;
    if (typeof part.output_text === 'string') return part.output_text;
    if (typeof part.refusal === 'string') return part.refusal;
    if (Array.isArray(part.content) || typeof part.content === 'string') {
      return textFromContent(part.content);
    }
    return '';
  }).join('');
}

export function getResponseInstructions(body) {
  const explicit = body?.instructions;
  if ((typeof explicit === 'string' && explicit.length > 0)
      || (Array.isArray(explicit) && explicit.length > 0)) return explicit;
  const input = Array.isArray(body?.input) ? body.input : [];
  const item = input.find(candidate => candidate?.type === 'message'
    && (candidate.role === 'developer' || candidate.role === 'system')
    && candidate.content != null);
  return item?.content ?? null;
}

export function getInstructionsText(body) {
  return textFromContent(getResponseInstructions(body));
}

export function getResponseTools(body) {
  if (Array.isArray(body?.tools) && body.tools.length > 0) return body.tools;
  const input = Array.isArray(body?.input) ? body.input : [];
  const item = input.find(candidate => candidate?.type === 'additional_tools'
    && Array.isArray(candidate.tools));
  return item?.tools || (Array.isArray(body?.tools) ? body.tools : []);
}

export function isResponseConfigInputItem(item) {
  return item?.type === 'additional_tools'
    || (item?.type === 'message' && (item.role === 'developer' || item.role === 'system'));
}

export function getResponseConversationItems(body) {
  return getResponseInputItems(body).filter(item => !isResponseConfigInputItem(item));
}

export function getResponseInputItems(body) {
  if (Array.isArray(body?.input)) return body.input;
  if (typeof body?.input === 'string') return [{ role: 'user', content: body.input }];
  return [];
}

export function hasResponseInputArray(body) {
  return Array.isArray(body?.input);
}

export function getInputItemText(item) {
  if (!item || typeof item !== 'object') return '';
  if (typeof item.content === 'string' || Array.isArray(item.content)) {
    return textFromContent(item.content);
  }
  if (typeof item.text === 'string') return item.text;
  if (typeof item.input_text === 'string') return item.input_text;
  return '';
}

export function findLastInputItem(body, predicate) {
  const items = getResponseInputItems(body);
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i], i, items)) return items[i];
  }
  return null;
}
