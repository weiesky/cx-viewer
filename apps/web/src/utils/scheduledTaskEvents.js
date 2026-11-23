// Tiny pub/sub so an open ScheduleTaskModal refreshes when a scheduled_tasks SSE frame
// arrives — without threading a new prop through App/Mobile into both modal hosts
// (ChatView + TerminalPanel). Subscribers filter by project; events are debounced.

const _subs = new Set();

/** Publish a scheduled_tasks frame (from AppBase's SSE handler). */
export function publishScheduledTaskEvent(data) {
  for (const fn of _subs) {
    try { fn(data); } catch { /* a broken subscriber must not break the SSE handler */ }
  }
}

/**
 * Subscribe. Returns an unsubscribe fn. `project` scopes the callback (only frames for
 * that project, or frames with no project). Calls are debounced per-subscriber (100ms).
 */
export function subscribeScheduledTasks(scope, fn) {
  const project = typeof scope === 'string' ? scope : scope?.project;
  const instance = typeof scope === 'object' ? scope?.instance : null;
  let timer = null;
  const wrapped = (data) => {
    if (!data || typeof data !== 'object') return;
    if (project && data.project && data.project !== project) return;
    if (instance && data.instanceKey !== instance) return;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      try { fn(data); } catch { /* best-effort */ }
    }, 100);
    if (typeof timer.unref === 'function') timer.unref();
  };
  _subs.add(wrapped);
  return () => { _subs.delete(wrapped); if (timer) { clearTimeout(timer); timer = null; } };
}
