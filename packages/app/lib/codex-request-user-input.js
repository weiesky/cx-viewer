const REQUEST_USER_INPUT_METHODS = new Set([
  // Codex CLI 0.144.x generated app-server schema.
  'item/tool/requestUserInput',
  // Current public app-server documentation uses this shorter name. Keep it
  // accepted so the bridge survives the protocol rename without losing GUI
  // interaction support.
  'tool/requestUserInput',
]);

const UI_ID_PREFIX = 'codex-app-server';

function requestKey(requestId) {
  return `${typeof requestId}:${String(requestId)}`;
}

function uiIdFor(requestId) {
  return `${UI_ID_PREFIX}:${typeof requestId}:${encodeURIComponent(String(requestId))}`;
}

/**
 * The app-server request id is transport-only.  The conversation card is keyed
 * by itemId; older/current Codex builds do not always include one, so keep the
 * fallback exactly aligned with appserver-bridge's projected tool_use id.
 */
export function codexRequestUserInputItemId(message) {
  const params = message?.params || {};
  return params.itemId || `request-user-input-${String(message?.id ?? '')}`;
}

/** Build the answer Codex should receive when autoResolutionMs expires. */
export function buildCodexAutoResolutionAnswers(questions = []) {
  const answers = {};
  for (const question of questions) {
    if (!question?.id || !Array.isArray(question.options) || question.options.length === 0) continue;
    // request_user_input requires the recommended choice to be first.
    answers[question.id] = { answers: [String(question.options[0]?.label ?? '')] };
  }
  return answers;
}

/** Project Codex's id-keyed answer shape to the question-text map used by cards. */
export function projectCodexAnswersForConversation(questions = [], answers = {}) {
  const projected = {};
  for (const question of questions) {
    if (!question || typeof question !== 'object') continue;
    const value = Object.prototype.hasOwnProperty.call(answers || {}, question.id)
      ? answers[question.id]
      : answers?.[question.question];
    const values = answerValues(value);
    if (values.length > 0) projected[question.question || question.id] = values.join(', ');
  }
  return projected;
}

function answerValues(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value.answers
    : value;
  if (Array.isArray(raw)) return raw.filter(item => typeof item === 'string');
  if (typeof raw === 'string') return [raw];
  return [];
}

export function isCodexRequestUserInputMessage(message) {
  return !!(message
    && message.id !== undefined
    && message.id !== null
    && REQUEST_USER_INPUT_METHODS.has(message.method)
    && Array.isArray(message.params?.questions));
}

export function normalizeCodexRequestUserInputAnswers(questions, answers) {
  const source = answers && typeof answers === 'object' && !Array.isArray(answers)
    ? answers
    : {};
  const normalized = {};
  for (const question of questions || []) {
    if (!question || typeof question.id !== 'string' || !question.id) continue;
    const value = Object.prototype.hasOwnProperty.call(source, question.id)
      ? source[question.id]
      : source[question.question];
    const values = answerValues(value);
    if (values.length > 0 || Object.prototype.hasOwnProperty.call(source, question.id)
      || Object.prototype.hasOwnProperty.call(source, question.question)) {
      normalized[question.id] = { answers: values };
    }
  }
  return normalized;
}

/**
 * Owns app-server request_user_input server requests claimed by CX Viewer.
 * The WebSocket proxy stays transport-agnostic: the relay only decides whether
 * a request is claimed and builds the exact JSON-RPC response expected by the
 * Codex version that emitted it.
 */
export class CodexRequestUserInputRelay {
  constructor({ onPending = null, onCleared = null } = {}) {
    this.onPending = typeof onPending === 'function' ? onPending : null;
    this.onCleared = typeof onCleared === 'function' ? onCleared : null;
    this.pendingByUiId = new Map();
    this.uiIdByRequestKey = new Map();
  }

  claim(message, sendResponse, forwardRequest = null) {
    if (!isCodexRequestUserInputMessage(message) || typeof sendResponse !== 'function') return false;
    const params = message.params || {};
    const uiId = uiIdFor(message.id);
    const pending = {
      uiId,
      requestId: message.id,
      method: message.method,
      threadId: params.threadId || null,
      turnId: params.turnId || null,
      itemId: codexRequestUserInputItemId(message),
      questions: params.questions,
      autoResolutionMs: Number.isFinite(params.autoResolutionMs) && params.autoResolutionMs >= 0
        ? params.autoResolutionMs
        : null,
      createdAt: Date.now(),
      sendResponse,
      forwardRequest: typeof forwardRequest === 'function' ? forwardRequest : null,
    };

    this.pendingByUiId.set(uiId, pending);
    this.uiIdByRequestKey.set(requestKey(message.id), uiId);
    let claimed = false;
    try {
      claimed = this.onPending
        ? this.onPending({ ...pending, sendResponse: undefined, forwardRequest: undefined }) === true
        : false;
    } catch {
      claimed = false;
    }
    if (!claimed) this._delete(pending);
    return claimed;
  }

  resolve(uiId, answers = {}) {
    const pending = this.pendingByUiId.get(String(uiId));
    if (!pending) return false;
    const response = {
      id: pending.requestId,
      result: {
        answers: normalizeCodexRequestUserInputAnswers(pending.questions, answers),
      },
    };
    try {
      if (pending.sendResponse(response) === false) return false;
    } catch {
      return false;
    }
    this._delete(pending);
    return true;
  }

  cancel(uiId) {
    // ToolRequestUserInputResponse has no cancel discriminator in the generated
    // schema. An empty answers map is the protocol-safe way to release the turn
    // and lets Codex continue using its own best judgment.
    return this.resolve(uiId, {});
  }

  releaseToClient(uiId) {
    const pending = this.pendingByUiId.get(String(uiId));
    if (!pending || !pending.forwardRequest) return false;
    try {
      if (pending.forwardRequest() === false) return false;
    } catch {
      return false;
    }
    this._delete(pending);
    return true;
  }

  clearByRequestId(requestId, reason = 'resolved') {
    const uiId = this.uiIdByRequestKey.get(requestKey(requestId));
    if (!uiId) return false;
    const pending = this.pendingByUiId.get(uiId);
    if (!pending) return false;
    this._delete(pending);
    try {
      this.onCleared?.({
        ...pending,
        sendResponse: undefined,
        forwardRequest: undefined,
        reason,
      });
    } catch {}
    return true;
  }

  clearAll(reason = 'bridge-stopped') {
    const pending = [...this.pendingByUiId.values()];
    for (const item of pending) {
      this._delete(item);
      try {
        this.onCleared?.({
          ...item,
          sendResponse: undefined,
          forwardRequest: undefined,
          reason,
        });
      } catch {}
    }
  }

  has(uiId) {
    return this.pendingByUiId.has(String(uiId));
  }

  _delete(pending) {
    this.pendingByUiId.delete(pending.uiId);
    this.uiIdByRequestKey.delete(requestKey(pending.requestId));
  }
}

export const CODEX_REQUEST_USER_INPUT_METHODS = Object.freeze([...REQUEST_USER_INPUT_METHODS]);
