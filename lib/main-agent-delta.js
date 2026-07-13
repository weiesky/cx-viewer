import { createHash } from 'node:crypto';

import { CHECKPOINT_INTERVAL } from './constants.js';
import { getMainAgentSessionKey } from '../src/utils/clearCheckpoint.js';

function fingerprintInput(input) {
  return input.map(item => {
    try {
      return createHash('sha256').update(JSON.stringify(item)).digest('base64url');
    } catch {
      return '';
    }
  });
}

function isFingerprintPrefix(previous, current) {
  if (!Array.isArray(previous) || previous.length > current.length) return false;
  for (let i = 0; i < previous.length; i++) {
    if (!previous[i] || previous[i] !== current[i]) return false;
  }
  return true;
}

function digestFingerprints(fingerprints) {
  if (!Array.isArray(fingerprints) || fingerprints.length === 0) return '';
  return createHash('sha256').update(fingerprints.join('\n')).digest('base64url');
}

function conversationIdFor(entry) {
  const key = getMainAgentSessionKey(entry);
  return key ? `mainAgent:${key}` : 'mainAgent';
}

/**
 * Convert complete MainAgent Responses inputs into the on-disk delta protocol.
 *
 * Plans are attached to the source entry through a WeakMap, so an HTTP
 * in-progress record and its later completed record use the same delta shape
 * without mutating the request object. State advances only after a completed
 * record is written successfully; concurrent requests therefore never depend
 * on an unfinished request that the reconstructor intentionally ignores.
 */
export function createMainAgentDeltaCompactor({
  enabled = process.env.CXV_DISABLE_DELTA !== '1',
  checkpointInterval = CHECKPOINT_INTERVAL,
  epoch = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
} = {}) {
  let stateByConversation = new Map();
  let planByEntry = new WeakMap();
  let sequence = 0;

  function getState(conversationId) {
    let state = stateByConversation.get(conversationId);
    if (!state) {
      state = {
        committedFingerprints: [],
        deltaCount: 0,
        committedSeq: 0,
      };
      stateByConversation.set(conversationId, state);
    }
    return state;
  }

  function makePlan(entry) {
    const input = entry.body.input;
    const conversationId = conversationIdFor(entry);
    const state = getState(conversationId);
    const fingerprints = fingerprintInput(input);
    state.deltaCount++;

    const prefixMatches = state.committedFingerprints.length > 0
      && isFingerprintPrefix(state.committedFingerprints, fingerprints);
    const checkpoint = state.committedFingerprints.length === 0
      || !prefixMatches
      || (state.deltaCount % checkpointInterval === 0);

    return {
      conversationId,
      fingerprints,
      originalLength: input.length,
      baseLength: checkpoint ? 0 : state.committedFingerprints.length,
      prefixBaseLength: prefixMatches ? state.committedFingerprints.length : 0,
      baseInputDigest: prefixMatches ? digestFingerprints(state.committedFingerprints) : '',
      inputDigest: digestFingerprints(fingerprints),
      checkpoint,
      seq: ++sequence,
    };
  }

  function applyPlan(entry, plan) {
    const input = entry.body.input;
    return {
      ...entry,
      body: plan.checkpoint
        ? { ...entry.body, input }
        : { ...entry.body, input: input.slice(plan.baseLength) },
      _deltaFormat: 1,
      _totalMessageCount: plan.originalLength,
      _conversationId: plan.conversationId,
      _isCheckpoint: plan.checkpoint,
      _seq: plan.seq,
      _seqEpoch: epoch,
      _inputDigest: plan.inputDigest,
      ...(plan.baseInputDigest ? {
        _baseInputDigest: plan.baseInputDigest,
        _baseMessageCount: plan.prefixBaseLength,
      } : {}),
    };
  }

  function process(entry) {
    if (!enabled || !entry?.mainAgent || entry?.teammate
        || entry._deltaFormat || !Array.isArray(entry.body?.input)) {
      return entry;
    }
    let plan = planByEntry.get(entry);
    if (!plan) {
      plan = makePlan(entry);
      planByEntry.set(entry, plan);
    }
    return applyPlan(entry, plan);
  }

  function commit(entry) {
    if (!enabled || entry?.inProgress) return;
    const plan = entry && planByEntry.get(entry);
    if (!plan) return;
    const state = getState(plan.conversationId);
    // Completion order can differ from request order. Never let a late, older
    // request move the baseline backwards.
    if (plan.seq > state.committedSeq) {
      state.committedFingerprints = plan.fingerprints;
      state.committedSeq = plan.seq;
    }
  }

  function reset() {
    stateByConversation = new Map();
    planByEntry = new WeakMap();
    sequence = 0;
  }

  return { process, commit, reset };
}
