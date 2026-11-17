import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDingTalkAdapter,
  __setDingTalkClientFactoryForTests,
  __setDingTalkStreamImporterForTests,
} from '../lib/adapters/dingtalk-adapter.js';

function response(ok, payload, status = ok ? 200 : 500) {
  return { ok, status, json: async () => payload };
}

test.afterEach(() => {
  __setDingTalkClientFactoryForTests(null);
  __setDingTalkStreamImporterForTests(null);
});

test('adapter dynamically imports dingtalk-stream and normalizes a robot callback', async () => {
  let handler;
  let options;
  class FakeClient {
    constructor(value) { options = value; }
    registerCallbackListener(topic, callback) { assert.equal(topic, 'robot-topic'); handler = callback; }
    async connect() { this.connected = true; }
  }
  __setDingTalkStreamImporterForTests(async () => ({ DWClient: FakeClient, TOPIC_ROBOT: 'robot-topic' }));
  const adapter = createDingTalkAdapter({ fetchImpl: async () => response(true, { accessToken: 'token', expireIn: 7200 }) });
  const received = [];
  const client = await adapter.connect({ appKey: 'key', appSecret: 'secret' }, {
    onInbound: (message, raw) => received.push({ message, raw }),
  });
  assert.deepEqual(options, { clientId: 'key', clientSecret: 'secret', keepAlive: true });
  assert.equal(client.connected, true);

  const raw = {
    headers: { messageId: 'message-1' },
    data: JSON.stringify({
      text: { content: 'hello' },
      conversationId: 'conversation-1',
      conversationType: '1',
      senderStaffId: 'staff-1',
      robotCode: 'robot-1',
    }),
  };
  handler(raw);
  assert.deepEqual(received[0].message, {
    messageId: 'message-1',
    text: 'hello',
    senderStaffId: 'staff-1',
    conversationId: 'conversation-1',
    conversationType: '1',
    target: {
      conversationId: 'conversation-1',
      conversationType: '1',
      robotCode: 'robot-1',
      senderStaffId: 'staff-1',
    },
  });
});

test('adapter factory seam ACKs callbacks and ignores malformed payloads', async () => {
  let handler;
  const acknowledgements = [];
  __setDingTalkClientFactoryForTests(() => ({
    connected: true,
    registerCallbackListener(_topic, callback) { handler = callback; },
    connect() {},
    socketCallBackResponse(id, body) { acknowledgements.push({ id, body }); },
  }));
  const adapter = createDingTalkAdapter({ fetchImpl: async () => response(true, { accessToken: 'token', expireIn: 7200 }) });
  const received = [];
  const client = await adapter.connect({ appKey: 'key', appSecret: 'secret' }, {
    onInbound: (message) => received.push(message),
  });
  handler({ headers: { messageId: 'bad' }, data: '{' });
  assert.equal(received[0], null);
  assert.equal(adapter.ack({ headers: { messageId: 'good' } }, client), true);
  assert.deepEqual(acknowledgements, [{ id: 'good', body: { success: true } }]);
});

test('adapter sends only plain markdown messages and reuses its access token', async () => {
  const calls = [];
  const adapter = createDingTalkAdapter({
    fetchImpl: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      if (url.endsWith('/accessToken')) return response(true, { accessToken: 'token', expireIn: 7200 });
      return response(true, {});
    },
  });
  const config = { appKey: 'key', appSecret: 'secret' };
  await adapter.sendText(config, {
    conversationId: 'conversation', conversationType: '1', robotCode: 'robot', senderStaffId: 'staff',
  }, 'answer');
  await adapter.sendText(config, {
    conversationId: 'group', conversationType: '2', robotCode: 'robot', senderStaffId: 'staff',
  }, 'group answer');

  assert.equal(calls.filter((call) => call.url.endsWith('/accessToken')).length, 1);
  const direct = calls.find((call) => call.url.includes('oToMessages/batchSend'));
  assert.deepEqual(direct.body.userIds, ['staff']);
  assert.equal(direct.body.msgKey, 'sampleMarkdown');
  assert.equal(JSON.parse(direct.body.msgParam).text, 'answer');
  const group = calls.find((call) => call.url.includes('groupMessages/send'));
  assert.equal(group.body.openConversationId, 'group');
  assert.equal('cardTemplateId' in group.body, false);
});

test('adapter creates, streams and finalizes a DingTalk AI card', async () => {
  const calls = [];
  const adapter = createDingTalkAdapter({
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init.method, body: JSON.parse(init.body) });
      if (url.endsWith('/accessToken')) return response(true, { accessToken: 'token', expireIn: 7200 });
      return response(true, {});
    },
  });
  const config = {
    appKey: 'key', appSecret: 'secret', aiCardTemplateId: 'ai-template', aiCardStreamKey: 'answer',
  };
  const target = {
    conversationId: 'group-1', conversationType: '2', robotCode: 'robot-1', senderStaffId: 'staff-1',
  };
  const handle = await adapter.sendAckCard(config, target, 'processing');
  assert.equal(handle.streaming, true);

  const created = calls.find((call) => call.url.endsWith('/card/instances/createAndDeliver'));
  assert.equal(created.body.cardTemplateId, 'ai-template');
  assert.equal(created.body.callbackType, 'STREAM');
  assert.deepEqual(created.body.cardData.cardParamMap, { answer: '', flowStatus: '1' });
  assert.equal(created.body.openSpaceId, 'dtv1.card//IM_GROUP.group-1');

  assert.equal(await adapter.streamCardText(config, target, handle, 'partial answer'), true);
  assert.equal(await adapter.updateAckCard(config, target, handle, 'final answer', 'done'), true);
  const streamCalls = calls.filter((call) => call.url.endsWith('/card/streaming'));
  assert.equal(streamCalls.at(-1).body.content, 'final answer');
  assert.equal(streamCalls.at(-1).body.isFinalize, true);
  const settled = calls.findLast((call) => call.url.endsWith('/card/instances') && call.method === 'PUT');
  assert.deepEqual(settled.body.cardData.cardParamMap, { answer: 'final answer', flowStatus: '3' });
});

test('AI card creation falls back to the legacy template', async () => {
  const calls = [];
  const adapter = createDingTalkAdapter({
    fetchImpl: async (url, init) => {
      const call = { url, method: init.method, body: JSON.parse(init.body) };
      calls.push(call);
      if (url.endsWith('/accessToken')) return response(true, { accessToken: 'token', expireIn: 7200 });
      if (url.endsWith('/createAndDeliver')) return response(false, { code: 'NoPermission' }, 403);
      return response(true, {});
    },
  });
  const handle = await adapter.sendAckCard({
    appKey: 'key', appSecret: 'secret', aiCardTemplateId: 'ai-template', cardTemplateId: 'legacy-template',
  }, {
    conversationId: 'dm', conversationType: '1', robotCode: 'robot', senderStaffId: 'staff',
  }, 'processing');
  assert.equal(handle.streaming, false);
  assert.equal(calls.some((call) => call.url.endsWith('/card/instances/deliver')), true);
  const legacy = calls.find((call) => call.url.endsWith('/card/instances') && call.method === 'POST');
  assert.equal(legacy.body.cardTemplateId, 'legacy-template');
});

test('connection errors expose a bounded provider code, never the configured secret', async () => {
  const adapter = createDingTalkAdapter({
    fetchImpl: async () => response(false, { code: 'InvalidCredential', message: 'secret-value leaked' }, 401),
  });
  const result = await adapter.testConnection({ appKey: 'key', appSecret: 'secret-value' });
  assert.equal(result.ok, false);
  assert.match(result.error, /401.*InvalidCredential/);
  assert.doesNotMatch(result.error, /secret-value|leaked/);
});

test('connect rejects when the SDK resolves without opening its stream', async () => {
  __setDingTalkClientFactoryForTests(() => ({
    connected: false,
    registerCallbackListener() {},
    async connect() {},
    disconnect() {},
  }));
  const adapter = createDingTalkAdapter({
    fetchImpl: async () => response(true, { accessToken: 'token', expireIn: 7200 }),
  });
  await assert.rejects(
    adapter.connect({ appKey: 'key', appSecret: 'secret' }, { onInbound() {} }),
    /Stream connection failed/,
  );
});
