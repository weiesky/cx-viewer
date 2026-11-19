import { randomUUID } from 'node:crypto';

const TOKEN_URL = 'https://api.dingtalk.com/v1.0/oauth2/accessToken';
const GROUP_SEND_URL = 'https://api.dingtalk.com/v1.0/robot/groupMessages/send';
const OTO_SEND_URL = 'https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend';
const CARD_INSTANCE_URL = 'https://api.dingtalk.com/v1.0/card/instances';
const CARD_DELIVER_URL = 'https://api.dingtalk.com/v1.0/card/instances/deliver';
const CARD_CREATE_AND_DELIVER_URL = 'https://api.dingtalk.com/v1.0/card/instances/createAndDeliver';
const CARD_STREAMING_URL = 'https://api.dingtalk.com/v1.0/card/streaming';

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

function streamKeyOf(config) {
  return typeof config?.aiCardStreamKey === 'string' && config.aiCardStreamKey.trim()
    ? config.aiCardStreamKey.trim()
    : 'content';
}

function cardDeliverFields(target) {
  const isGroup = String(target?.conversationType) === '2';
  return isGroup
    ? {
        userIdType: 1,
        openSpaceId: `dtv1.card//IM_GROUP.${target.conversationId}`,
        imGroupOpenDeliverModel: { robotCode: target.robotCode },
      }
    : {
        userIdType: 1,
        openSpaceId: `dtv1.card//IM_ROBOT.${target?.senderStaffId}`,
        imRobotOpenDeliverModel: { spaceType: 'IM_ROBOT', robotCode: target?.robotCode },
      };
}

function cardSpaceFields(target) {
  const isGroup = String(target?.conversationType) === '2';
  return {
    ...cardDeliverFields(target),
    [isGroup ? 'imGroupOpenSpaceModel' : 'imRobotOpenSpaceModel']: { supportForward: true },
  };
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

  async function fetchCard(config, url, method, body) {
    const token = await accessToken(config);
    return withTimeout(fetchImpl(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-acs-dingtalk-access-token': token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    }));
  }

  async function streamFrame(config, handle, text, { finalize = false, error = false } = {}) {
    if (!handle?.outTrackId) return false;
    try {
      const response = await fetchCard(config, CARD_STREAMING_URL, 'PUT', {
        outTrackId: handle.outTrackId,
        guid: randomUUID(),
        key: streamKeyOf(config),
        content: String(text ?? ''),
        isFull: true,
        isFinalize: finalize,
        isError: error,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function updateCardData(config, handle, cardParamMap) {
    if (!handle?.outTrackId) return false;
    try {
      const response = await fetchCard(config, CARD_INSTANCE_URL, 'PUT', {
        outTrackId: handle.outTrackId,
        cardData: { cardParamMap },
        cardUpdateOptions: { updateCardDataByKey: true },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function createAiCard(config, target) {
    const outTrackId = randomUUID();
    const response = await fetchCard(config, CARD_CREATE_AND_DELIVER_URL, 'POST', {
      cardTemplateId: config.aiCardTemplateId,
      outTrackId,
      callbackType: 'STREAM',
      cardData: { cardParamMap: { [streamKeyOf(config)]: '', flowStatus: '1' } },
      ...cardSpaceFields(target),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw providerError('DingTalk AI card create', response, payload);
    }
    const handle = Object.freeze({ outTrackId, streaming: true });
    await streamFrame(config, handle, '');
    return handle;
  }

  async function createLegacyCard(config, target, statusText) {
    if (!config.cardTemplateId) return null;
    const outTrackId = randomUUID();
    const created = await fetchCard(config, CARD_INSTANCE_URL, 'POST', {
      outTrackId,
      cardTemplateId: config.cardTemplateId,
      cardData: { cardParamMap: { status: String(statusText ?? ''), content: '' } },
    });
    if (!created.ok) {
      const payload = await created.json().catch(() => ({}));
      throw providerError('DingTalk card create', created, payload);
    }
    const delivered = await fetchCard(config, CARD_DELIVER_URL, 'POST', {
      outTrackId,
      ...cardDeliverFields(target),
    });
    if (!delivered.ok) {
      const payload = await delivered.json().catch(() => ({}));
      throw providerError('DingTalk card deliver', delivered, payload);
    }
    return Object.freeze({ outTrackId, streaming: false });
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

    async sendAckCard(config, target, statusText) {
      if (config.aiCardTemplateId) {
        try {
          return await createAiCard(config, target);
        } catch (error) {
          if (!config.cardTemplateId) throw error;
        }
      }
      return createLegacyCard(config, target, statusText);
    },

    async streamCardText(config, _target, handle, text) {
      if (!handle?.streaming) return false;
      return streamFrame(config, handle, text);
    },

    async updateAckCard(config, _target, handle, text, status = 'done') {
      if (!handle?.outTrackId) return false;
      if (handle.streaming) {
        const isError = status !== 'done';
        const streamed = await streamFrame(config, handle, text, { finalize: true, error: isError });
        const settled = await updateCardData(config, handle, {
          [streamKeyOf(config)]: String(text ?? ''),
          flowStatus: isError ? '5' : '3',
        });
        return streamed || settled;
      }
      return updateCardData(config, handle, { status: '', content: String(text ?? '') });
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
