import { applyWireCommit, resolveWireInputRefs, restoreWireArchiveState } from "@cxv/core/log-v2/reducer";
import { LogV2ObjectStore } from './logV2ObjectStore.js';
import { projectLogV2ConversationEntry } from './logV2ConversationProjection.js';
import { classifyRequest } from "@cxv/core/requestType";
import { selectUsageHeaders } from "@cxv/core/log-v2/request-summary";
import { isOpenAiResponsesMasterEntry } from "@cxv/core/openai-responses-url";
import { isNativeTitleEntry } from "@cxv/core/codex-thread-source";

function summaryEntry(summary, descriptor, handle) {
  const responseSummary = summary.response;
  const entry = {
    ...(summary.root || {}),
    timestamp: summary.root?.timestamp || descriptor.timestamp,
    body: Object.freeze({ ...(summary.body || {}) }),
    request: summary.request,
    response: responseSummary && typeof responseSummary === 'object'
      ? Object.freeze({ ...responseSummary, body: responseSummary.usage ? { usage: responseSummary.usage } : {} })
      : responseSummary,
    _v2RowHandle: handle,
    _v2Descriptor: descriptor,
  };
  entry._classification = Object.freeze(isOpenAiResponsesMasterEntry(entry)
    ? { type: 'Master', subType: null }
    : (summary.classification || classifyRequest(entry, null)));
  return Object.freeze(entry);
}

function rowHandle(descriptor) {
  return `${descriptor.archive.generation}:${descriptor.entryKey}`;
}

export function isV2ConversationCandidate(row) {
  if (isNativeTitleEntry(row)) return false;
  if (isOpenAiResponsesMasterEntry(row)) return false;
  const type = row?._classification?.type;
  if (type === 'Master') return false;
  if (['MainAgent', 'SubAgent', 'Teammate', 'Tool', 'Synthetic'].includes(type)) return true;
  // Projection eligibility is correctness-critical and must not depend on a
  // lossy list label. Canonical writer identity survives missing old summaries.
  return ['main', 'subagent', 'teammate'].includes(row?._v2Descriptor?.agentRole);
}

export class LogV2Archive {
  constructor(snapshot, { fetchImpl = fetch } = {}) {
    this.start = snapshot.start;
    this.end = snapshot.end;
    this.state = restoreWireArchiveState(snapshot.checkpoint);
    this.projectionPart = snapshot.start.shard?.part ?? 0;
    this.projectionBaselines = snapshot.start.shard?.inputBaselines || [];
    this.projectionBaseRefs = new Map();
    this.objectStore = new LogV2ObjectStore({
      handle: snapshot.start.objectHandle,
      archive: snapshot.start.archive,
      fetchImpl,
    });
    this.summaries = new Map((snapshot.summaries || []).map(value => [value.seq, value]));
    this.hasMore = !!snapshot.start.hasMore;
    this.pageAckToken = null;
    this.rows = Object.freeze([...this.state.winners.values()].map((descriptor) => {
      const summary = this.summaries.get(descriptor.seq) || { root: { timestamp: descriptor.timestamp }, body: {}, response: null, request: null };
      const handle = rowHandle(descriptor);
      return summaryEntry(summary, descriptor, handle);
    }));
    this.byHandle = new Map(this.rows.map(row => [row._v2RowHandle, row]));
  }

  prependPage(page) {
    if (!page) { this.hasMore = false; return []; }
    if (page.start.archive.generation !== this.start.archive.generation
        || page.end.cursor.throughSeq !== this.end.cursor.throughSeq
        || page.end.cursor.timelineBytes !== this.end.cursor.timelineBytes) {
      const error = new Error('V2 page does not match the frozen archive');
      error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
      throw error;
    }
    const pageState = restoreWireArchiveState(page.checkpoint);
    if (page.start.shard && page.start.shard.part < this.projectionPart) {
      this.projectionPart = page.start.shard.part;
      this.projectionBaselines = page.start.shard.inputBaselines || [];
      this.projectionBaseRefs.clear();
    }
    for (const summary of page.summaries || []) this.summaries.set(summary.seq, summary);
    const added = [];
    for (const [entryKey, descriptor] of pageState.winners) {
      const current = this.state.winners.get(entryKey);
      if (current && current.seq >= descriptor.seq) continue;
      this.state.winners.set(entryKey, descriptor);
      added.push(descriptor);
    }
    this.state.winners = new Map([...this.state.winners].sort((left, right) => left[1].seq - right[1].seq));
    this.rows = Object.freeze([...this.state.winners.values()].map((descriptor) => {
      const value = this.summaries.get(descriptor.seq) || { root: { timestamp: descriptor.timestamp }, body: {}, response: null, request: null };
      return summaryEntry(value, descriptor, rowHandle(descriptor));
    }));
    this.byHandle = new Map(this.rows.map(row => [row._v2RowHandle, row]));
    this.hasMore = !!page.start.hasMore;
    return added.map(descriptor => this.byHandle.get(rowHandle(descriptor))).filter(Boolean);
  }

  descriptor(handle) {
    return this.byHandle.get(handle)?._v2Descriptor || null;
  }

  async hydrate(handle, options = {}) {
    const descriptor = this.descriptor(handle);
    if (!descriptor) throw new Error('Unknown V2 row handle');
    return this.objectStore.materialize(descriptor, {
      ...options,
      inputRefs: descriptor.input ? resolveWireInputRefs(this.state, descriptor.input) : [],
    });
  }

  async projectConversation(handle, options = {}) {
    const descriptor = this.descriptor(handle);
    if (!descriptor) throw new Error('Unknown V2 row handle');
    return this.projectConversationDescriptor(descriptor, options);
  }

  async projectConversationDescriptor(descriptor, options = {}) {
    if (!descriptor || descriptor.archive.generation !== this.start.archive.generation) {
      throw new Error('Unknown V2 descriptor');
    }
    let inputRefs = descriptor.input ? resolveWireInputRefs(this.state, descriptor.input) : [];
    const baseline = this.projectionBaselines.find(value => value.threadId === descriptor.input?.threadId);
    if (baseline && descriptor.input.revision >= baseline.revision) {
      let refs = this.projectionBaseRefs.get(baseline.threadId);
      if (!refs) {
        refs = resolveWireInputRefs(this.state, baseline);
        this.projectionBaseRefs.set(baseline.threadId, refs);
      }
      // Only remove an exact frozen prefix. A native compaction/rollback may
      // replace it; in that case the new input is authoritative in full.
      if (inputRefs.length >= refs.length && refs.every((ref, index) => ref.hash === inputRefs[index].hash && ref.bytes === inputRefs[index].bytes)) {
        inputRefs = inputRefs.slice(refs.length);
      }
    }
    const projected = await projectLogV2ConversationEntry(this.objectStore, descriptor, {
      ...options,
      inputRefs,
    });
    // Conversation projection deliberately keeps full response headers lazy.
    // Request summaries already carry a small usage-only allowlist, so restore
    // only that subset for the footer quota display without hydrating secrets.
    const summaryHeaders = selectUsageHeaders(this.summaries.get(descriptor.seq)?.response?.headers);
    if (!summaryHeaders) return projected;
    const projectedResponse = projected?.response && typeof projected.response === 'object'
      ? projected.response
      : {};
    const projectedHeaders = selectUsageHeaders(projectedResponse.headers) || {};
    return {
      ...projected,
      response: {
        ...projectedResponse,
        headers: { ...summaryHeaders, ...projectedHeaders },
      },
    };
  }

  applyCommit(frame, summary = null) {
    const previous = this.state.winners.get(frame?.timeline?.entryKey);
    const beforeSeq = this.state.throughSeq;
    const descriptor = applyWireCommit(this.state, frame);
    if (frame.timeline.seq <= beforeSeq) return this.byHandle.get(rowHandle(descriptor)) || null;
    if (previous && previous.seq !== descriptor.seq) this.summaries.delete(previous.seq);
    if (summary) this.summaries.set(descriptor.seq, summary);
    const handle = rowHandle(descriptor);
    const value = this.summaries.get(descriptor.seq)
      || { root: { timestamp: descriptor.timestamp }, body: {}, response: null, request: null };
    const row = summaryEntry(value, descriptor, handle);
    this.rows = Object.freeze([...this.rows.filter(existing => existing._v2RowHandle !== handle), row]);
    this.byHandle.set(handle, row);
    return row;
  }
}
