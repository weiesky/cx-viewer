#!/usr/bin/env node

import { resolve } from 'node:path';

import WebSocket from 'ws';

import { startAppServerBridge } from '../lib/appserver-bridge.js';
import { inspectCodexRequestUserInputSupport } from '../lib/codex-appserver-capabilities.js';

const codexPath = process.argv[2] || 'codex';
const cwd = resolve(process.argv[3] || process.cwd());
const timeoutMs = Number(process.env.CXV_CODEX_ASK_VERIFY_TIMEOUT_MS) || 120000;
let bridge = null;
let ws = null;
let nextId = 1;
const rpc = new Map();
let mode = 'claimed';
const evidence = {
  capability: inspectCodexRequestUserInputSupport(codexPath),
  claimed: {
    intercepted: null,
    responseAccepted: false,
    leakedToTui: false,
    completed: null,
  },
  fallback: {
    offeredToGui: false,
    forwardedToTui: false,
    responseSentByTui: false,
    completed: null,
  },
  agentMessages: [],
};

function waitForRpc(method, params = {}) {
  const id = nextId++;
  return new Promise((resolveRpc, rejectRpc) => {
    rpc.set(String(id), { resolve: resolveRpc, reject: rejectRpc });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function withTimeout(promise, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(
      () => rejectPromise(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    Promise.resolve(promise).then(
      value => { clearTimeout(timer); resolvePromise(value); },
      error => { clearTimeout(timer); rejectPromise(error); },
    );
  });
}

try {
  if (!evidence.capability.verified) {
    throw new Error(`Codex request_user_input schema verification failed: ${evidence.capability.error}`);
  }

  let finishTurn = null;
  const nextTurnCompletion = () => new Promise(resolveFinished => { finishTurn = resolveFinished; });
  bridge = await startAppServerBridge({
    cwd,
    codexPath,
    extraConfigArgs: ['-c', 'features.default_mode_request_user_input=true'],
    writeLogEntry: () => ({ written: true }),
    onRequestUserInput: request => {
      if (mode === 'fallback') {
        evidence.fallback.offeredToGui = true;
        return false;
      }
      evidence.claimed.intercepted = {
        id: request.uiId,
        method: request.method,
        threadId: request.threadId,
        turnId: request.turnId,
        itemId: request.itemId,
        questions: request.questions,
      };
      setImmediate(() => {
        const question = request.questions[0];
        evidence.claimed.responseAccepted = bridge.resolveRequestUserInput(request.uiId, {
          [question.id]: { answers: [question.options?.[0]?.label || 'Yes'] },
        });
      });
      return true;
    },
  });

  ws = new WebSocket(`ws://127.0.0.1:${bridge.proxyPort}`);
  await withTimeout(new Promise((resolveOpen, rejectOpen) => {
    ws.once('open', resolveOpen);
    ws.once('error', rejectOpen);
  }), 'proxy connection');

  ws.on('message', raw => {
    const message = JSON.parse(raw.toString());
    if (message.id !== undefined && !message.method) {
      const pending = rpc.get(String(message.id));
      if (pending) {
        rpc.delete(String(message.id));
        if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
        else pending.resolve(message.result);
      }
    }
    if (message.method === 'item/tool/requestUserInput' || message.method === 'tool/requestUserInput') {
      if (mode === 'claimed') {
        evidence.claimed.leakedToTui = true;
      } else {
        evidence.fallback.forwardedToTui = true;
        const question = message.params?.questions?.[0];
        ws.send(JSON.stringify({
          id: message.id,
          result: {
            answers: question?.id
              ? { [question.id]: { answers: [question.options?.[0]?.label || 'Yes'] } }
              : {},
          },
        }));
        evidence.fallback.responseSentByTui = true;
      }
    }
    if (message.method === 'item/completed' && message.params?.item?.type === 'agentMessage') {
      evidence.agentMessages.push(message.params.item.text || '');
    }
    if (message.method === 'turn/completed') {
      const completed = message.params?.turn || null;
      evidence[mode].completed = completed;
      const resolveFinished = finishTurn;
      finishTurn = null;
      resolveFinished?.(completed);
    }
  });

  await withTimeout(waitForRpc('initialize', {
    clientInfo: { name: 'cx-viewer-verifier', title: 'CX Viewer verifier', version: '1.0.10' },
    capabilities: { experimentalApi: true },
  }), 'initialize');
  ws.send(JSON.stringify({ method: 'initialized', params: {} }));
  const started = await withTimeout(waitForRpc('thread/start', { cwd }), 'thread/start');
  const threadId = started?.thread?.id;
  if (!threadId) throw new Error('thread/start did not return a thread id');

  const claimedTurnFinished = nextTurnCompletion();
  await withTimeout(waitForRpc('turn/start', {
    threadId,
    input: [{
      type: 'text',
      text: 'You must call request_user_input now with exactly one question. Use id "gate", header "Gate", question "Continue?", and options Yes/No. After receiving the answer, reply exactly ASK_BRIDGE_OK.',
    }],
  }), 'turn/start');
  await withTimeout(claimedTurnFinished, 'claimed turn/completed');

  if (!evidence.claimed.intercepted) throw new Error('Codex never emitted request_user_input');
  if (!evidence.claimed.responseAccepted) throw new Error('CX Viewer could not return the JSON-RPC answer');
  if (evidence.claimed.leakedToTui) throw new Error('Claimed request_user_input was also forwarded to the TUI');
  if (evidence.claimed.completed?.status !== 'completed') {
    throw new Error(`claimed turn did not complete successfully: ${JSON.stringify(evidence.claimed.completed)}`);
  }

  mode = 'fallback';
  const fallbackTurnFinished = nextTurnCompletion();
  await withTimeout(waitForRpc('turn/start', {
    threadId,
    input: [{
      type: 'text',
      text: 'You must call request_user_input now with exactly one question. Use id "gate_fallback", header "Fallback", question "Continue in TUI?", and options Yes/No. After receiving the answer, reply exactly ASK_FALLBACK_OK.',
    }],
  }), 'fallback turn/start');
  await withTimeout(fallbackTurnFinished, 'fallback turn/completed');

  if (!evidence.fallback.offeredToGui) throw new Error('fallback request was not offered to the GUI claim callback');
  if (!evidence.fallback.forwardedToTui) throw new Error('unclaimed request_user_input did not reach the TUI');
  if (!evidence.fallback.responseSentByTui) throw new Error('TUI fallback response was not sent');
  if (evidence.fallback.completed?.status !== 'completed') {
    throw new Error(`fallback turn did not complete successfully: ${JSON.stringify(evidence.fallback.completed)}`);
  }
  process.stdout.write(`${JSON.stringify({ ok: true, ...evidence }, null, 2)}\n`);
} finally {
  for (const pending of rpc.values()) pending.reject(new Error('verifier stopped'));
  try { ws?.close(); } catch {}
  try { bridge?.stop(); } catch {}
}
