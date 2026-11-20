import { normalizeAppServerItem } from './sdk-appserver-transport.js';
import { isSdkResumeThreadId, isSdkToolItem, sdkToolName } from './sdk-adapter.js';

// Native thread/turn identity is authoritative; a spawn tool finishing or the
// root turn ending says nothing about whether its children are still running.
export function createSdkAppServerAgents({ scope, rootThreadId, readThread, ownsThread, broadcast }) {
  const agents = new Map();
  let closed = false, available = true, tail = Promise.resolve(), queued = 0, queueBytes = 0;
  const snapshot = () => ({ type: 'sdk-agent-snapshot', ...scope, sessionId: rootThreadId, available,
    agents: [...agents.values()].filter(a => ['pending', 'in_progress'].includes(a.status))
      .map(({ settled, ...agent }) => structuredClone(agent)) });
  const emit = () => { if (!closed) { try { broadcast(snapshot()); } catch {} } };

  async function find(id) {
    if (id === rootThreadId || typeof id !== 'string' || !id) return null;
    if (agents.has(id)) return agents.get(id);
    if (!await ownsThread(id)) return null;
    const thread = await readThread(id);
    if (closed || !available) return null;
    if (agents.size >= 256) {
      const ended = [...agents].find(([, agent]) => !['pending', 'in_progress'].includes(agent.status));
      if (ended) agents.delete(ended[0]);
      else { available = false; agents.clear(); emit(); return null; }
    }
    const source = thread.source?.subAgent;
    const spawn = source?.thread_spawn || source?.threadSpawn;
    if (!spawn) return null;
    const nickname = thread.agentNickname || spawn.agent_nickname || spawn.agentNickname;
    const role = thread.agentRole || spawn.agent_role || spawn.agentRole;
    const agent = { taskId: id, threadId: id, turnId: null, kind: 'subagent',
      name: typeof nickname === 'string' ? nickname : null,
      title: typeof nickname === 'string' ? nickname : (typeof role === 'string' ? role : ''),
      status: 'pending', createdAt: null, lastToolName: null, settled: new Set() };
    agents.set(id, agent); return agent;
  }

  async function apply(event) {
    if (closed || !available) return;
    if (event.type === 'spawn') {
      if (event.threadId !== rootThreadId && !await ownsThread(event.threadId)) return;
      if (event.name && event.threadId !== rootThreadId) {
        const parent = await find(event.threadId);
        if (parent?.status === 'in_progress' && parent.turnId === event.turnId) {
          parent.lastToolName = event.name; emit();
        }
      }
      for (const id of event.ids) {
        if (agents.has(id)) continue; // a late spawn receipt cannot downgrade a live/settled child
        const agent = await find(id);
        if (agent) emit();
      }
      return;
    }
    const agent = await find(event.threadId);
    if (!agent || closed || !available) return;
    if (event.type === 'start') {
      if (!event.turnId || agent.settled.has(event.turnId)) return;
      if (agent.turnId !== event.turnId) {
        agent.turnId = event.turnId; agent.lastToolName = null;
        agent.createdAt = Number.isFinite(event.startedAt) ? event.startedAt * 1000 : null;
      }
      agent.status = 'in_progress';
    } else if (event.type === 'end') {
      if (!event.turnId || (agent.turnId && agent.turnId !== event.turnId)) return;
      agent.turnId = event.turnId; agent.status = event.status === 'completed' ? 'completed' : 'failed';
      agent.settled.add(event.turnId);
      while (agent.settled.size > 64) agent.settled.delete(agent.settled.values().next().value);
    } else if (event.type === 'close') agent.status = 'failed';
    else if (event.type === 'tool') {
      if (agent.status !== 'in_progress' || agent.turnId !== event.turnId) return;
      agent.lastToolName = event.name;
    }
    emit();
  }

  return {
    snapshot,
    handle(frame) {
      if (closed || !available) return Promise.resolve();
      const p = frame.params || {}, method = frame.method;
      let event;
      if (['turn/started', 'turn/completed'].includes(method)) event = {
        type: method === 'turn/started' ? 'start' : 'end', threadId: p.threadId,
        turnId: p.turn?.id, startedAt: p.turn?.startedAt, status: p.turn?.status,
      };
      else if (method === 'thread/closed') event = { type: 'close', threadId: p.threadId };
      else if (['item/started', 'item/completed'].includes(method)
          && p.item?.type === 'collabAgentToolCall' && p.item.tool === 'spawnAgent') {
        const ids = Array.isArray(p.item.receiverThreadIds) ? p.item.receiverThreadIds.filter(id => typeof id === 'string'
          && ['pendingInit', 'running'].includes(p.item.agentsStates?.[id]?.status)) : [];
        event = { type: 'spawn', threadId: p.threadId, turnId: p.turnId,
          name: method === 'item/started' ? 'spawn_agent' : null, ids: ids.slice(0, 256) };
      } else if (method === 'item/started') {
        if (typeof p.item?.type !== 'string' || typeof p.item.id !== 'string') return Promise.resolve();
        const item = normalizeAppServerItem(p.item || {});
        if (!item || !isSdkToolItem(item)) return Promise.resolve();
        event = { type: 'tool', threadId: p.threadId, turnId: p.turnId, name: sdkToolName(item) };
      } else return Promise.resolve();
      if (!isSdkResumeThreadId(event.threadId)) return Promise.resolve();
      if (event.type !== 'spawn' && event.threadId === rootThreadId) return Promise.resolve();
      // Only retain lifecycle fields, never child text/image payloads. Bound
      // pending ownership checks too; on overflow hide the incomplete table.
      const bytes = Buffer.byteLength(JSON.stringify(event));
      if (queued >= 1024 || queueBytes + bytes > 16 * 1024 * 1024) {
        available = false; agents.clear(); emit(); return Promise.resolve();
      }
      queued++; queueBytes += bytes;
      tail = tail.then(() => apply(event)).catch(() => {}).finally(() => { queued--; queueBytes -= bytes; });
      return tail;
    },
    close() { if (closed) return; agents.clear(); emit(); closed = true; },
  };
}
