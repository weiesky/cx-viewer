import { randomUUID } from 'node:crypto';
import { HOOK_TIMEOUT_MS } from './constants.js';
import { describeServerRequest } from './codex-server-request.js';
import { codexRequestUserInputItemId, isCodexRequestUserInputMessage, normalizeCodexRequestUserInputAnswers, pickCodexAutoAnswers } from "./ask/codex-request-user-input.js";
import { computeAskAutoAnswer, createAskAutoAnswerState, cancelAskAutoAnswerState, replayAskAutoAnswerFields } from "./ask/ask-auto-answer.js";

const COMMAND = 'item/commandExecution/requestApproval';
const FILE = 'item/fileChange/requestApproval';
const PERMISSIONS = 'item/permissions/requestApproval';
const clone = value => structuredClone(value);
const nativeKey = id => `${typeof id}:${id}`;

// Each instance owns its own pending requests and unguessable UI IDs. Native
// RPC IDs may be reused by a restarted process; UI replies must never cross it.
export function createSdkAppServerApprovals({ scope, broadcast, ownsThread,
  onPending, onResolved, computeHosting = computeAskAutoAnswer,
  timeoutMs = HOOK_TIMEOUT_MS, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const pending = new Map(), byNative = new Map();
  let closed = false;
  const emit = frame => { try { broadcast(frame); return true; } catch { return false; } };

  function remove(record, type = 'resolved', result = null) {
    pending.delete(record.id); byNative.delete(nativeKey(record.frame.id)); clearTimer(record.timer);
    if (record.auto?.timer) clearTimeout(record.auto.timer);
    if (record.public) emit({ type: `${record.ask ? 'sdk-ask' : 'perm-hook'}-${type}`, id: record.id,
      ...(record.ask ? { itemId: record.public.itemId, questions: record.public.questions, codexAnswers: result?.answers } : {}), ...scope });
  }

  function respond(record, value, cancelled = false) {
    if (pending.get(record.id) !== record) return false;
    const { frame } = record, params = frame.params || {};
    let result;
    if (record.ask) result = { answers: normalizeCodexRequestUserInputAnswers(params.questions, cancelled ? {} : value) };
    else {
      const allow = !cancelled && (value === 'allow' || value?.decision === 'allow');
      const session = allow && value?.allowSession === true;
      if (frame.method === PERMISSIONS) result = { permissions: allow ? clone(params.permissions) : {}, scope: session ? 'session' : 'turn' };
      else {
        const decision = allow ? (session ? 'acceptForSession' : 'accept') : 'decline';
        if (allow && Array.isArray(params.availableDecisions) && !params.availableDecisions.includes(decision)) return false;
        result = { decision };
      }
    }
    try { if (record.reply(result) === false) return false; } catch { return false; }
    try { onResolved?.(frame, result, record.public); }
    finally { remove(record, cancelled ? 'timeout' : 'resolved', result); }
    return true;
  }

  return {
    async handle(frame, reply) {
      if (closed) { reply(null, { code: -32000, message: 'Workspace is closed' }); return false; }
      const ask = isCodexRequestUserInputMessage(frame);
      if (!ask && ![COMMAND, FILE, PERMISSIONS].includes(frame.method)) {
        reply(null, { code: -32601, message: 'Unsupported server request' }); return false;
      }
      const p = frame.params || {};
      if (typeof p.threadId !== 'string' || typeof p.turnId !== 'string'
          || (ask && (!p.questions.length || p.questions.some(question => typeof question?.id !== 'string'
            || !question.id || typeof question.question !== 'string'
            || (question.options != null && (!Array.isArray(question.options)
              || question.options.some(option => typeof option?.label !== 'string'))))))
          || (frame.method === PERMISSIONS && (!p.permissions || typeof p.permissions !== 'object' || Array.isArray(p.permissions)))
          || pending.size >= 128 || byNative.has(nativeKey(frame.id))) {
        reply(null, { code: -32602, message: 'Invalid approval request' }); return false;
      }
      const record = { id: `native_${randomUUID()}`, frame, reply, ask, public: null, timer: null, auto: null, autoCancelled: false, createdAt: Date.now() };
      pending.set(record.id, record); byNative.set(nativeKey(frame.id), record);
      record.timer = setTimer(() => {
        if (!record.public) { remove(record); reply(null, { code: -32000, message: 'Approval ownership check timed out' }); }
        else if (!respond(record, null, true)) remove(record, 'timeout');
      }, timeoutMs);
      record.timer?.unref?.();
      let owned = false;
      try { owned = await ownsThread(p.threadId); } catch {}
      if (closed || pending.get(record.id) !== record) return false;
      if (!owned) {
        remove(record); reply(null, { code: -32000, message: 'Approval belongs to a different thread' }); return false;
      }
      const descriptor = describeServerRequest(frame.method, p);
      const computed = ask ? computeHosting(scope?.cwd, { now: record.createdAt }) : { enabled: false };
      const autoAnswers = computed.enabled ? pickCodexAutoAnswers(p.questions) : null;
      const hosting = computed.enabled && !!autoAnswers;
      // Only opted-in hosting needs the upstream 24h answer window. Keep native
      // permission timeouts and the default manual question behavior unchanged.
      const askTimeoutMs = hosting ? 24 * 60 * 60_000 : timeoutMs;
      if (hosting) {
        clearTimer(record.timer);
        record.timer = setTimer(() => { if (!respond(record, null, true)) remove(record, 'timeout'); }, askTimeoutMs);
        record.timer?.unref?.();
      }
      record.public = ask ? { type: 'sdk-ask-pending', id: record.id, questions: clone(p.questions),
        itemId: codexRequestUserInputItemId(frame),
        startedAt: record.createdAt, timeoutMs: askTimeoutMs,
        ...replayAskAutoAnswerFields(hosting ? computed : null, false), ...scope }
        : { type: 'perm-hook-pending', id: record.id, toolName: descriptor.name, input: clone(descriptor.input), ...scope };
      try { onPending?.(frame, record.public); }
      catch { remove(record); reply(null, { code: -32000, message: 'Approval projection failed' }); return false; }
      if (!emit(record.public)) { if (!respond(record, null, true)) remove(record, 'timeout'); return false; }
      if (hosting) record.auto = createAskAutoAnswerState(computed, () => {
        if (pending.get(record.id) === record && !record.autoCancelled) respond(record, autoAnswers);
      });
      return true;
    },
    resolve(id, value) {
      const record = pending.get(id); if (!record) return false;
      const accepted = respond(record, value);
      if (!accepted && record.public) emit(clone(record.public));
      return accepted;
    },
    replay() { return [...pending.values()].filter(record => record.public).map(record => clone(record.public)); },
    cancelAskHosting(id) {
      const record = pending.get(id);
      if (!record?.ask || !record.public || !record.auto) return false;
      if (cancelAskAutoAnswerState(record)) {
        Object.assign(record.public, replayAskAutoAnswerFields(record.auto, true));
        emit({ type: 'ask-auto-cancel', id, ...scope });
      }
      return true;
    },
    resolvedNative(id) {
      const record = byNative.get(nativeKey(id)); if (!record) return false;
      const result = record.ask ? { answers: {} } : null;
      try { if (record.public) onResolved?.(record.frame, result, record.public); }
      finally { remove(record, 'timeout', result); }
      return true;
    },
    clearTurn(threadId, turnId) {
      for (const record of [...pending.values()]) {
        if (record.frame.params.threadId === threadId && record.frame.params.turnId === turnId) {
          if (!record.public || !respond(record, null, true)) remove(record, 'timeout');
        }
      }
    },
    clearThread(threadId) {
      for (const record of [...pending.values()]) {
        if (record.frame.params.threadId === threadId) {
          if (!record.public || !respond(record, null, true)) remove(record, 'timeout');
        }
      }
    },
    close() {
      closed = true;
      for (const record of [...pending.values()]) {
        if (!record.public || !respond(record, null, true)) remove(record, 'timeout');
      }
    },
  };
}
