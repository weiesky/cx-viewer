import { randomBytes } from 'node:crypto';

import { isMainAgentEntry } from './main-agent-entry.js';
import { getInputItemText, getResponseConversationItems } from './openai-body.js';
import {
  BRACKET_PASTE_SUBMIT_SETTLE_MS,
  buildBracketPasteSubmitChunks,
} from '../src/utils/ptyChunkBuilder.js';
import defaultAdapter from './adapters/dingtalk-adapter.js';

export const MAX_DINGTALK_INPUT_BYTES = 8 * 1024;
export const MAX_DINGTALK_QUEUE = 20;
export const MAX_DINGTALK_REPLY_CHARS = 3800;
const MAX_SEEN_MESSAGE_IDS = 500;
const DEFAULT_TURN_TIMEOUT_MS = 2 * 60_000;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizedAllowlist(config) {
  return Array.isArray(config?.allowStaffIds)
    ? [...new Set(config.allowStaffIds.filter(nonEmpty).map((value) => value.trim()))]
    : [];
}

export function validateDingTalkBridgeConfig(config) {
  if (!config || !nonEmpty(config.appKey) || !nonEmpty(config.appSecret)) {
    throw new TypeError('DingTalk appKey and appSecret are required');
  }
  return Object.freeze({
    ...config,
    appKey: config.appKey.trim(),
    appSecret: config.appSecret.trim(),
    allowStaffIds: Object.freeze(normalizedAllowlist(config)),
  });
}

export function sanitizeDingTalkInput(value) {
  const text = typeof value === 'string' ? value : '';
  // ESC, CR and every other C0/C1 control byte can alter terminal state or submit early.
  // Preserve LF for genuine multi-line prompts and turn TAB into ordinary spacing.
  // eslint-disable-next-line no-control-regex
  return text.replace(/\t/g, ' ').replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, '').trim();
}

export function createDingTalkOriginMarker(nonce) {
  if (!/^[A-Za-z0-9_-]{16,}$/.test(nonce || '')) throw new TypeError('invalid DingTalk turn nonce');
  return `⟦im:dingtalk:${nonce}⟧ `;
}

export function buildDingTalkPasteChunks(text, nonce) {
  return buildBracketPasteSubmitChunks(createDingTalkOriginMarker(nonce) + text);
}

function identityFromCommit(entry, context) {
  const metadata = entry?.body?.metadata || {};
  const thread = context?.thread || {};
  const projectId = context?.projectId || entry?.project || null;
  const threadId = thread.id || thread.threadId || thread.thread_id
    || metadata.thread_id || entry?._agentThreadId || null;
  const sessionId = thread.sessionId || thread.session_id || metadata.session_id || null;
  const requestTurnId = metadata.turn_id || entry?.body?._turnId || null;
  const responseTurnId = entry?.response?.body?.turn?.id || requestTurnId;
  if (!nonEmpty(projectId) || !nonEmpty(threadId) || !nonEmpty(responseTurnId)) return null;
  if (requestTurnId && responseTurnId !== requestTurnId) return null;
  return { projectId, threadId, sessionId, turnId: responseTurnId };
}

function lastUserInputText(entry) {
  const input = getResponseConversationItems(entry?.body || {});
  for (let index = input.length - 1; index >= 0; index--) {
    const item = input[index];
    if (item?.role === 'user') return getInputItemText(item);
  }
  return '';
}

export function extractDingTalkFinalText(entry) {
  const content = entry?.response?.body?.content;
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content.map((item) => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    if (item.type === 'text' && typeof item.text === 'string') return item.text;
    if (item.type === 'output_text' && typeof item.text === 'string') return item.text;
    if (item.type === 'message' && item.role === 'assistant' && Array.isArray(item.content)) {
      return item.content.map((part) => (
        part?.type === 'output_text' && typeof part.text === 'string' ? part.text : ''
      )).filter(Boolean).join('\n');
    }
    return '';
  }).filter(Boolean).join('\n').trim();
}

export function chunkDingTalkReply(text, maxChars = MAX_DINGTALK_REPLY_CHARS) {
  const limit = Math.max(500, Math.min(MAX_DINGTALK_REPLY_CHARS, Number(maxChars) || MAX_DINGTALK_REPLY_CHARS));
  const chunks = [];
  let rest = String(text || '').trim();
  while (rest) {
    if (rest.length <= limit) { chunks.push(rest); break; }
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < Math.floor(limit / 2)) cut = rest.lastIndexOf(' ', limit);
    if (cut < Math.floor(limit / 2)) cut = limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return chunks.filter(Boolean);
}

export function createDingTalkImBridge({
  adapter = defaultAdapter,
  getConfig,
  getActiveContext,
  getPtyState,
  writeToPtySequential,
  turnTimeoutMs = DEFAULT_TURN_TIMEOUT_MS,
  maxQueue = MAX_DINGTALK_QUEUE,
} = {}) {
  if (!adapter || typeof adapter.connect !== 'function' || typeof adapter.sendText !== 'function') {
    throw new TypeError('DingTalk adapter is required');
  }
  if (typeof getConfig !== 'function' || typeof getActiveContext !== 'function'
      || typeof getPtyState !== 'function' || typeof writeToPtySequential !== 'function') {
    throw new TypeError('DingTalk bridge dependencies are incomplete');
  }

  let client = null;
  let config = null;
  let generation = 0;
  let running = false;
  let starting = null;
  let lastError = null;
  let active = null;
  const queue = [];
  const seen = new Set();
  const seenOrder = [];

  function remember(messageId) {
    if (seen.has(messageId)) return false;
    seen.add(messageId);
    seenOrder.push(messageId);
    if (seenOrder.length > MAX_SEEN_MESSAGE_IDS) seen.delete(seenOrder.shift());
    return true;
  }

  function safeSend(target, text) {
    const currentConfig = config;
    if (!currentConfig || !running) return Promise.resolve(false);
    return adapter.sendText(currentConfig, target, text)
      .then(() => true)
      // Adapter errors are deliberately not surfaced here: an SDK error may echo credentials.
      .catch(() => { lastError = 'DingTalk send failed'; return false; });
  }

  function clearActive(expected = active) {
    if (!active || (expected && active !== expected)) return false;
    const released = active;
    active = null;
    clearTimeout(released.timer);
    // Clear ownership before cancelling. A PTY cancellation can synchronously invoke its
    // completion callback; that callback must observe the slot as already released.
    try { released.cancelWrite?.(); } catch {}
    queueMicrotask(drain);
    return true;
  }

  function failActive(pending, message) {
    if (!clearActive(pending)) return;
    void safeSend(pending.target, message);
  }

  function arm(item, context) {
    const nonce = randomBytes(18).toString('base64url');
    const pending = {
      ...item,
      nonce,
      marker: createDingTalkOriginMarker(nonce),
      projectId: context.projectId,
      threadId: context.threadId,
      sessionId: context.sessionId || null,
      baselineTurnId: context.turnId || null,
      turnId: null,
      generation,
      cancelWrite: null,
      timer: null,
    };
    pending.timer = setTimeout(() => failActive(pending, 'CX Viewer 请求超时，请重试。'), turnTimeoutMs);
    pending.timer.unref?.();
    active = pending;
    const chunks = buildDingTalkPasteChunks(item.text, nonce);
    let callbackCalled = false;
    const completed = (ok) => {
      callbackCalled = true;
      if (!ok) failActive(pending, 'CX Viewer 无法提交请求，请重试。');
    };
    try {
      const result = writeToPtySequential(chunks, completed, {
        settleMs: BRACKET_PASTE_SUBMIT_SETTLE_MS,
      });
      if (typeof result === 'function') pending.cancelWrite = result;
      else if (result === false || result == null) {
        // Existing PTY manager returns a cancel function for accepted jobs and null on refusal.
        if (!callbackCalled) completed(false);
      }
    } catch {
      completed(false);
    }
  }

  function drain() {
    if (!running || active || queue.length === 0) return;
    const state = getPtyState();
    const context = getActiveContext();
    if (!state?.running || state.recovering || !nonEmpty(context?.projectId) || !nonEmpty(context?.threadId)) {
      const item = queue.shift();
      void safeSend(item.target, 'CX Viewer 当前没有可用的 Codex 会话。');
      queueMicrotask(drain);
      return;
    }
    arm(queue.shift(), context);
  }

  function onInbound(inbound, raw, inboundGeneration) {
    if (!running || inboundGeneration !== generation || !inbound) return;
    adapter.ack?.(raw, client);
    if (!remember(inbound.messageId)) return;
    if (config.allowStaffIds.length > 0 && !config.allowStaffIds.includes(inbound.senderStaffId)) return;
    const text = sanitizeDingTalkInput(inbound.text);
    if (!text || Buffer.byteLength(text, 'utf8') > MAX_DINGTALK_INPUT_BYTES) {
      if (text) void safeSend(inbound.target, `消息过长，最多 ${MAX_DINGTALK_INPUT_BYTES} 字节。`);
      return;
    }
    if (queue.length >= Math.max(1, Math.min(MAX_DINGTALK_QUEUE, maxQueue))) {
      void safeSend(inbound.target, 'CX Viewer 请求队列已满，请稍后重试。');
      return;
    }
    queue.push({ target: inbound.target, text, messageId: inbound.messageId });
    drain();
  }

  async function start() {
    if (running) return true;
    if (starting) return starting;
    const nextGeneration = ++generation;
    starting = (async () => {
      const nextConfig = validateDingTalkBridgeConfig(getConfig());
      const nextClient = await adapter.connect(nextConfig, {
        onInbound: (inbound, raw) => onInbound(inbound, raw, nextGeneration),
      });
      if (nextGeneration !== generation) {
        await adapter.disconnect(nextClient);
        return false;
      }
      config = nextConfig;
      client = nextClient;
      running = true;
      lastError = null;
      return true;
    })().catch(() => {
      // Do not retain raw SDK errors: some connection libraries include request options.
      lastError = 'DingTalk bridge failed to start';
      return false;
    }).finally(() => { starting = null; });
    return starting;
  }

  async function stop() {
    generation++;
    running = false;
    queue.length = 0;
    if (active) {
      clearTimeout(active.timer);
      try { active.cancelWrite?.(); } catch {}
      active = null;
    }
    const oldClient = client;
    client = null;
    config = null;
    if (oldClient) await adapter.disconnect(oldClient);
  }

  async function reload() {
    await stop();
    return start();
  }

  async function notifyLogV2Commit(entry, _result, context) {
    const pending = active;
    if (!pending || pending.generation !== generation || !isMainAgentEntry(entry)) return false;
    const identity = identityFromCommit(entry, context);
    if (!identity || identity.projectId !== pending.projectId || identity.threadId !== pending.threadId) return false;
    if (pending.sessionId && identity.sessionId && identity.sessionId !== pending.sessionId) return false;
    if (pending.baselineTurnId && identity.turnId === pending.baselineTurnId) return false;
    if (pending.turnId && identity.turnId !== pending.turnId) return false;
    if (lastUserInputText(entry) !== `${pending.marker}${pending.text}`) return false;
    pending.turnId = identity.turnId;
    const status = entry?.response?.body?.turn?.status;
    if (status && !['completed', 'complete', 'failed', 'interrupted', 'cancelled'].includes(status)) return false;
    const text = extractDingTalkFinalText(entry);
    clearActive(pending);
    if (!text) {
      await safeSend(pending.target, status === 'failed' ? 'Codex 执行失败。' : 'Codex 未返回可发送的文本。');
      return true;
    }
    for (const chunk of chunkDingTalkReply(text, config?.maxChunkChars)) {
      await safeSend(pending.target, chunk);
    }
    return true;
  }

  async function notifyTurnTerminal(event) {
    const pending = active;
    if (!pending || !event || event.threadId !== pending.threadId) return false;
    if (pending.baselineTurnId && event.turnId === pending.baselineTurnId) return false;
    if (!['failed', 'cancelled', 'canceled', 'interrupted'].includes(event.status)) return false;
    clearActive(pending);
    await safeSend(pending.target, 'Codex 执行失败或已中断。');
    return true;
  }

  return Object.freeze({
    start,
    stop,
    reload,
    notifyLogV2Commit,
    notifyTurnTerminal,
    testConnection: (candidate = getConfig()) => adapter.testConnection(validateDingTalkBridgeConfig(candidate)),
    getStatus: () => Object.freeze({
      running,
      connectionState: running ? adapter.connectionState?.(client) || 'connected' : 'disconnected',
      queued: queue.length,
      pending: !!active,
      lastError,
    }),
  });
}
