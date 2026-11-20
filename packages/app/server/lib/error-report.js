// Server-side wrapper around the shared error reporter that gates all
// [cxv:*] console output on CXV_DEBUG. The web frontend imports core's
// reportSwallowed directly and is unaffected.
//
// Rationale: most of these reports fire on recoverable paths (a down
// upstream, a losing race, a contended lock). Unconditional console.warn
// spams the terminal and reads as breakage when nothing is actually wrong
// from the user's point of view. The underlying failure is still surfaced
// where it matters (pseudo-response statusText, SSE error frames, UI
// fallbacks) — this only silences the diagnostic duplicate.
//
// Set CXV_DEBUG=1 to restore the previous behavior (every call site logs,
// still capped at MAX_REPORTS_PER_TAG per tag by core).

import {
  reportSwallowed as coreReport,
  MAX_REPORTS_PER_TAG,
  _resetForTest,
} from '../../src/utils/errorReport.js';

export function reportSwallowed(tag, err, extra) {
  if (!process.env.CXV_DEBUG) return;
  coreReport(tag, err, extra);
}

export { MAX_REPORTS_PER_TAG, _resetForTest };
