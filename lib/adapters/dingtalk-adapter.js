const TOKEN_URL = 'https://api.dingtalk.com/v1.0/oauth2/accessToken';
const GROUP_SEND_URL = 'https://api.dingtalk.com/v1.0/robot/groupMessages/send';
const OTO_SEND_URL = 'https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend';

let testClientFactory = null;
let testStreamImporter = null;
const NETWORK_TIMEOUT_MS = 10_000;

function withTimeout(promise, timeoutMs = NETWORK_TIMEOUT_MS) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('DingTalk request timed out'), { code: 'DINGTALK_TIMEOUT' })), timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

export function __setDingTalkClientFactoryForTests(factory) {
  testClientFactory = typeof factory === 'function' ? factory : null;
}

export function __setDingTalkStreamImporterForTests(importer) {
  testStreamImporter = typeof importer === 'function' ? importer : null;
}

function parseInbound(raw) {
  let message;
  try {
    message = JSON.parse(raw?.data ?? '{}');
  } catch {
    return null;
  }
  const conversationType = String(message?.conversationType ?? '');
  const conversationId = typeof message?.conversationId === 'string' ? message.conversationId : '';
  const senderStaffId = typeof message?.senderStaffId === 'string' ? message.senderStaffId : '';
  const robotCode = typeof message?.robotCode === 'string'
    ? message.robotCode
    : (typeof message?.chatbotUserId === 'string' ? message.chatbotUserId : '');
  const messageId = typeof raw?.headers?.messageId === 'string' ? raw.headers.messageId : '';
  if (!conversationId || !senderStaffId || !robotCode || !messageId) return null;
  return Object.freeze({
    messageId,
    text: typeof message?.text?.content === 'string' ? message.text.content : '',
    senderStaffId,
    conversationId,
    conversationType,
    target: Object.freeze({ conversationId, conversationType, robotCode, senderStaffId }),
  });
}

function providerError(prefix, response, payload) {
  const status = Number.isInteger(response?.status) ? response.status : 0;
  const code = typeof payload?.code === 'string' || typeof payload?.code === 'number'
    ? String(payload.code).slice(0, 80)
    : 'failed';
  return new Error(`${prefix} ${status || 'error'}: ${code}`);
}

export function createDingTalkAdapter({
  fetchImpl = globalThis.fetch,
  clientFactory = null,
  streamImporter = null,
} = {}) {
  let tokenCache = null;

  async function accessToken(config, { force = false } = {}) {
    if (!force && tokenCache?.appKey === config.appKey && tokenCache.expiresAt > Date.now() + 300_000) {
      return tokenCache.value;
    }
    if (typeof fetchImpl !== 'function') throw new Error('DingTalk fetch is unavailable');
    const response = await withTimeout(fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appKey: config.appKey, appSecret: config.appSecret }),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    }));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.accessToken !== 'string' || !payload.accessToken) {
      throw providerError('DingTalk token', response, payload);
    }
    const lifetimeSeconds = Number.isFinite(Number(payload.expireIn)) ? Number(payload.expireIn) : 7200;
    tokenCache = {
      appKey: config.appKey,
      value: payload.accessToken,
      expiresAt: Date.now() + Math.max(60, lifetimeSeconds) * 1000,
    };
    return tokenCache.value;
  }

  return Object.freeze({
    id: 'dingtalk',

    async connect(config, { onInbound } = {}) {
      if (typeof onInbound !== 'function') throw new TypeError('onInbound is required');
      await accessToken(config, { force: true });
      const factory = clientFactory || testClientFactory;
      let client;
      let topic = '__cxv_test__';
      if (factory) {
        client = await factory({ clientId: config.appKey, clientSecret: config.appSecret, keepAlive: true });
      } else {
        const importer = streamImporter || testStreamImporter || (() => import('dingtalk-stream'));
        const imported = await importer();
        const DWClient = imported?.DWClient || imported?.default?.DWClient;
        topic = imported?.TOPIC_ROBOT || imported?.default?.TOPIC_ROBOT;
        if (typeof DWClient !== 'function' || !topic) throw new Error('Invalid dingtalk-stream module');
        client = new DWClient({ clientId: config.appKey, clientSecret: config.appSecret, keepAlive: true });
      }
      if (!client || typeof client.registerCallbackListener !== 'function') {
        throw new Error('DingTalk Stream client cannot register callbacks');
      }
      if (client.config && typeof client.config === 'object') client.config.autoReconnect = false;
      client.registerCallbackListener(topic, (raw) => onInbound(parseInbound(raw), raw));
      await withTimeout(Promise.resolve(client.connect?.()));
      if (client.connected !== true) {
        await client.disconnect?.();
        throw Object.assign(new Error('DingTalk Stream connection failed'), { code: 'DINGTALK_STREAM_CONNECT_FAILED' });
      }
      return client;
    },

    ack(raw, client) {
      const messageId = raw?.headers?.messageId;
      if (!messageId || !client) return false;
      try {
        if (typeof client.socketCallBackResponse === 'function') {
          client.socketCallBackResponse(messageId, { success: true });
          return true;
        }
        if (typeof client.send === 'function') {
          client.send(messageId, JSON.stringify({ status: 'SUCCESS', message: 'OK' }));
          return true;
        }
      } catch {}
      return false;
    },

    async disconnect(client) {
      tokenCache = null;
      try { await client?.disconnect?.(); } catch {}
    },

    connectionState(client) {
      if (!client || client.userDisconnect) return 'disconnected';
      return client.connected ? 'connected' : 'reconnecting';
    },

    async sendText(config, target, text) {
      if (!target?.robotCode) throw new Error('DingTalk reply target is incomplete');
      const token = await accessToken(config);
      const isGroup = String(target.conversationType) === '2';
      const url = isGroup ? GROUP_SEND_URL : OTO_SEND_URL;
      const msgParam = JSON.stringify({ title: 'CX Viewer', text: String(text) });
      const body = isGroup
        ? {
            robotCode: target.robotCode,
            openConversationId: target.conversationId,
            msgKey: 'sampleMarkdown',
            msgParam,
          }
        : {
            robotCode: target.robotCode,
            userIds: [target.senderStaffId].filter(Boolean),
            msgKey: 'sampleMarkdown',
            msgParam,
          };
      const response = await withTimeout(fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-acs-dingtalk-access-token': token },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
      }));
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw providerError('DingTalk send', response, payload);
      }
    },

    async testConnection(config) {
      try {
        tokenCache = null;
        await accessToken(config, { force: true });
        return Object.freeze({ ok: true });
      } catch (error) {
        return Object.freeze({ ok: false, error: String(error?.message || 'DingTalk connection failed') });
      }
    },
  });
}

const dingtalkAdapter = createDingTalkAdapter();
export default dingtalkAdapter;
