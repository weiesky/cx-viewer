// Frozen 177b85df / 451ef48d / 2914d647 REST contract, adapted to the native
// server's already-authenticated exact workspace resolver and shared body reader.
import { createTask, updateTask, deleteTask, getTask, readScheduledTasks } from './scheduled-task-store.js';
import { readScheduledTaskRuns } from './scheduled-task-runs-store.js';
import { runTaskNow, spawnAvailable } from './scheduled-task-scheduler.js';
import { normalizeSchedule, nextBaseFor } from './schedule-model.js';
import { reportSwallowed } from '../server/lib/error-report.js';

const READS = new Set(['/api/scheduled-tasks', '/api/scheduled-tasks/runs']);
const WRITES = new Set(['/api/scheduled-tasks', '/api/scheduled-tasks/update', '/api/scheduled-tasks/delete', '/api/scheduled-tasks/run', '/api/scheduled-tasks/preview']);
const publicTask = ({ runs, claim, ...task }) => ({ ...task, running: !!claim });
function summaryTask(task) {
  const value = publicTask(task);
  value.promptSummary = String(task.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 200)
    || `[${(task.attachments || []).map(a => a.name).join(', ')}]`.slice(0, 200);
  for (const key of ['prompt', 'attachments', 'template', 'templateContent']) delete value[key];
  return value;
}

export async function handleScheduledTaskRoute(req, res, url, {
  root, scope, resolveInstance, admin, readBody, sendJson, broadcast, engine,
} = {}) {
  const path = url.pathname;
  if (!(req.method === 'GET' && READS.has(path)) && !(req.method === 'POST' && WRITES.has(path))) return false;
  const send = (status, value) => { sendJson(res, status, value); return true; };
  const reject = (status, error) => send(status, { ok: false, error });
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'POST' && !admin) return reject(403, 'forbidden');
  let body = {};
  if (req.method === 'POST') {
    try { body = await readBody(req, 1 << 20); }
    catch (error) { return reject(error.status || 400, 'invalid_json'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reject(400, 'invalid_json');
  }
  if (path === '/api/scheduled-tasks/preview') {
    const now = Date.now(), norm = normalizeSchedule(body.schedule, now);
    if (!norm.ok) return send(400, { ok: false, error: norm.error, detail: norm.detail });
    const next = [];
    let cursor = now;
    for (let i = 0; i < 3; i++) { const at = nextBaseFor(norm.schedule, cursor); if (at === null) break; next.push(at); cursor = at; }
    return send(200, { ok: true, next, serverTime: now, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
  }
  if (body.instance !== undefined) {
    if (typeof body.instance !== 'string' || !body.instance) return reject(400, 'project_unresolved');
    if (url.searchParams.has('instance') && body.instance !== url.searchParams.get('instance')) return reject(409, 'project_ambiguous');
    try { scope = resolveInstance(body.instance); } catch { return reject(404, 'project_unresolved'); }
  }
  if (!scope?.cwd || !scope.instanceKey) return reject(404, 'project_unresolved');
  const namedProject = req.method === 'POST' ? body.project : url.searchParams.get('project');
  if (namedProject && namedProject !== scope.projectName && namedProject !== scope.projectName.replace(/[^a-zA-Z0-9_\-.]/g, '_')) {
    return reject(409, 'project_ambiguous');
  }
  const changed = (task, action) => broadcast({ type: 'task_changed', project: task.project, cwd: task.cwd,
    instanceKey: scope.instanceKey, taskId: task.id, action });
  try {
    if (req.method === 'GET' && path === '/api/scheduled-tasks') {
      const reg = readScheduledTasks(root);
      return send(200, { tasks: reg.tasks.filter(task => task.cwd === scope.cwd).map(task => ({
        ...(admin ? publicTask(task) : summaryTask(task)), ...(reg.legacy ? { legacy: true } : {}),
      })), serverTime: Date.now(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      spawnAvailable: spawnAvailable(), storeCorrupt: !!reg.corrupt });
    }
    if (req.method === 'POST' && path === '/api/scheduled-tasks') {
      if (body.mode === 'spawn' && !spawnAvailable()) return reject(400, 'spawn_unavailable');
      const result = await createTask(root, { project: scope.projectName, cwd: scope.cwd, instanceKey: scope.instanceKey,
        engine, transport: scope.transport, prompt: body.prompt, mode: body.mode, schedule: body.schedule,
        enabled: body.enabled, template: body.template, templateContent: body.templateContent, attachments: body.attachments });
      if (!result.ok) return send(400, { ok: false, error: result.reason, detail: result.detail });
      changed(result.task, 'created');
      return send(200, { ok: true, task: publicTask(result.task) });
    }
    const id = req.method === 'GET' ? url.searchParams.get('id') : body.id;
    const task = typeof id === 'string' && id ? getTask(root, id) : null;
    if (!task) return reject(404, 'task_not_found');
    if (task.cwd !== scope.cwd) return reject(403, 'forbidden');
    if (req.method === 'GET') return send(200, { ok: true, runs: readScheduledTaskRuns(root, id), serverTime: Date.now() });
    if (path === '/api/scheduled-tasks/update') {
      if (body.mode === 'spawn' && !spawnAvailable()) return reject(400, 'spawn_unavailable');
      const result = await updateTask(root, id, { prompt: body.prompt, mode: body.mode, schedule: body.schedule,
        enabled: body.enabled, template: body.template, templateContent: body.templateContent, attachments: body.attachments },
      Date.now(), { binding: { instanceKey: scope.instanceKey, engine, transport: scope.transport } });
      if (!result.ok) return send(400, { ok: false, error: result.reason, detail: result.detail });
      changed(result.task, 'updated');
      return send(200, { ok: true, task: publicTask(result.task) });
    }
    if (path === '/api/scheduled-tasks/delete') {
      const result = await deleteTask(root, id);
      if (!result.ok) return reject(result.reason === 'task_running' ? 409 : 400, result.reason);
      changed(task, 'deleted'); return send(200, { ok: true });
    }
    const result = await runTaskNow(id, { manual: true });
    if (!result.ok) return reject(result.reason === 'scheduler_unavailable' ? 503 : result.reason === 'running' ? 409 : 400, result.reason);
    return send(202, { ok: true, runId: result.runId ?? null });
  } catch (error) {
    reportSwallowed('scheduled-tasks.route', error);
    return reject(500, 'store_corrupt');
  }
}
