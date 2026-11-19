// Pure view-model mapping for the /resume hover list (2026-10), split out of
// ResumeSessionsPopover.jsx so the row logic is unit-testable without React.
//
// A raw row comes from GET /api/resume-sessions (lib/v2/resume-list.js), scoped to
// the CURRENT project:
//   { source:'ccv', project, file, sessionUuid, startTs, turns, preview[],
//     running, pinnedId, aiTitle? }
// The display contract: a status dot (current / inactive), a one-line summary
// (aiTitle preferred, else first user prompt), and a last-activity time.
//
// Two-state status dot (TaskProgressHud-style glyphs in the component):
//   current  — the session the main view is on (pinnedId matches, blue filled disc)
//   inactive — any other recent session (hollow grey ring)
// `running` (mtime heuristic, or isStreaming for the current row) layers a pulse.

/**
 * Map a raw resume-list row to the hover-list view model.
 * @param {object} raw - one row from /api/resume-sessions.
 * @param {string|null} currentSessionUuid - the single live session UUID the main
 *   process is running (top-level field on the GET response). A row is `selected`
 *   (the "current" blue dot) when its sessionUuid matches — exactly one row can
 *   match.
 * @param {{ attachedUuid?: string|null, isStreaming?: boolean }} [opts] -
 *   `attachedUuid` is the session the main view is currently ATTACHED to: it wins
 *   the "current" blue dot over the server's `currentSessionUuid`, because while
 *   attached the session the user is looking at is the attached one, not the
 *   primary live session. `isStreaming` is the ground-truth "current session is
 *   mid-stream" flag, used to force the current row's running pulse even when its
 *   journal mtime has aged out.
 * @returns {{ key:string, project:string, summary:string, timeLabel:string,
 *   running:boolean, selected:boolean, statusKind:'current'|'inactive',
 *   tooltipKey:string, source:string, isCurrentLive:boolean }}
 */
export function mapResumeRow(raw, currentSessionUuid, opts = {}) {
  const r = raw || {};
  const { attachedUuid = null, isStreaming = false } = opts || {};
  const project = (typeof r.project === 'string' && r.project) || '—';
  // Summary: ai-title (CC-generated) preferred, else the first user prompt
  // preview, else a generic placeholder key the renderer resolves via t().
  let summary = '';
  if (typeof r.aiTitle === 'string' && r.aiTitle) summary = r.aiTitle;
  else if (Array.isArray(r.preview) && r.preview.length) summary = String(r.preview[0] || '');
  const uuid = typeof r.sessionUuid === 'string' && r.sessionUuid ? r.sessionUuid : null;
  // The "current" blue dot: the attached session wins while the view is attached
  // (that IS the session the user is looking at); otherwise fall back to the
  // single live session the main process is running (server `currentSessionUuid`).
  // Matched by uuid, not the project-level pinnedId (shared by every same-project
  // row). Case-insensitive on both.
  const selected = uuid != null && (
    (attachedUuid != null && uuid.toLowerCase() === String(attachedUuid).toLowerCase())
    || (currentSessionUuid != null && uuid.toLowerCase() === String(currentSessionUuid).toLowerCase())
  );
  // `running` is a coarse server mtime heuristic (journal appended <5min ago);
  // it goes stale within a single long stream (no file is appended mid-turn).
  // For the CURRENT session the client has the ground truth — isStreaming — so
  // a live stream forces running=true even when the mtime has aged out. Other
  // (background) sessions keep the mtime heuristic.
  const running = (r.running === true) || (selected && isStreaming === true);

  const statusKind = selected ? 'current' : 'inactive';
  const tooltipKey = statusKind === 'current'
    ? 'ui.resume.statusCurrent'
    : (running ? 'ui.resume.statusRunning' : 'ui.resume.statusInactive');

  return {
    key: `${r.source || 'ccv'}:${uuid || r.file || project}`,
    project,
    summary,
    timeLabel: formatRelativeTime(r.startTs),
    running,
    selected,
    statusKind,
    tooltipKey,
    source: r.source || 'ccv',
    // Whether this row is the live session currently running in the main process.
    // Clicking it is a no-op (highlight only) — it is already the view.
    isCurrentLive: selected,
  };
}

/**
 * Compact relative time for the row's last-activity column (e.g. "3m", "2h",
 * "5d", or a HH:MM for today). ISO strings compare/parse directly.
 * @param {string} iso
 * @param {number} [now] - injectable for tests.
 * @returns {string}
 */
export function formatRelativeTime(iso, now = Date.now()) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '';
  const diffMs = now - t;
  if (diffMs < 0) return '';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '<1m';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

