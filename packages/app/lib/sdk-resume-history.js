import { discoverV2SessionArchives, resolveV2SessionFile, streamV2LogEntries, summarizeV2SessionArchive } from './log-v2/materializer.js';
import { readSessionTimelineIdentity } from './log-v2/session-summary.js';
import { isSdkResumeThreadId } from './sdk-adapter.js';
import { parseCodexInvocation } from './cli-args.js';
import { projectArchiveDirectoryName } from './log-v2/identity.js';

function failure(message, code, status = 409) {
  return Object.assign(new Error(message), { code, status });
}

/** Resolve CLI resume before starting servers or registering a workspace. */
export async function resolveSdkCliResume(logDir, args, view) {
  const invocation = parseCodexInvocation(args);
  if (invocation.kind !== 'resume') return null;
  if (invocation.resumeOnlyOptionIndices.some(index => args[index] !== '--last')) {
    throw failure('SDK resume only supports current-workspace Viewer SDK archives; --all and --include-non-interactive are unavailable', 'SDK_RESUME_UNAVAILABLE', 422);
  }
  if (invocation.selector === 'picker') return { selector: 'picker' };
  if (invocation.selector === 'id' && !isSdkResumeThreadId(invocation.threadId)) {
    throw failure('Invalid SDK resume thread ID', 'SDK_RESUME_UNAVAILABLE', 422);
  }
  const discovered = discoverV2SessionArchives(logDir, { projectId: view.projectId });
  const projectDir = projectArchiveDirectoryName(view.projectId);
  if (discovered.errors.some(item => item.path.split(/[\\/]/)[0] === projectDir)) {
    throw failure('Workspace history metadata is damaged; refusing to select another archive', 'SDK_RESUME_UNAVAILABLE', 422);
  }
  const scoped = discovered.archives.filter(archive => archive.project.canonicalCwd === view.cwd);
  const latestId = scoped[0]?.project.latestSessionId;
  if (invocation.selector === 'last' && latestId && !scoped.some(archive => archive.manifest.sessionId === latestId)) {
    throw failure('Latest workspace archive is unavailable; refusing to select another archive', 'SDK_RESUME_UNAVAILABLE', 422);
  }
  const candidates = scoped.filter(archive => archive.manifest.source === 'sdk' && archive.manifest.rootThreadId === archive.manifest.sessionId
    && isSdkResumeThreadId(archive.manifest.rootThreadId)
    && (invocation.selector !== 'id' || archive.manifest.rootThreadId === invocation.threadId));
  // Match the existing active-archive policy: the workspace's last conversation
  // pointer wins, with creation order as fallback. Never skip a damaged target.
  candidates.sort((a, b) => Number(b.manifest.sessionId === b.project.latestSessionId)
    - Number(a.manifest.sessionId === a.project.latestSessionId)
    || b.manifest.createdAt.localeCompare(a.manifest.createdAt)
    || b.manifest.sessionSeq - a.manifest.sessionSeq);
  const file = candidates[0]?.file;
  if (!file) throw failure('No matching Viewer SDK history in this workspace', 'SDK_RESUME_NOT_FOUND', 404);
  await readSdkResumeHistory(logDir, file, view);
  return { selector: invocation.selector, file };
}

export function listSdkResumeSessions(logDir, { cwd, projectId }, limit = 10) {
  const candidates = discoverV2SessionArchives(logDir, { projectId }).archives
    .filter(archive => archive.project.canonicalCwd === cwd && archive.manifest.source === 'sdk'
      && archive.manifest.rootThreadId === archive.manifest.sessionId
      && isSdkResumeThreadId(archive.manifest.rootThreadId))
    .reverse();
  const items = [];
  for (const archive of candidates) {
    try {
      const summary = summarizeV2SessionArchive(archive.sessionDir);
      if (summary.error || summary.committedEvents === 0) continue;
      items.push({ file: archive.file, sessionId: archive.manifest.sessionId,
        createdAt: archive.manifest.createdAt, preview: summary.previews, turns: summary.turns });
      if (items.length >= limit) break;
    } catch {}
  }
  return items;
}

/** Read one exact SDK archive without changing canonical data or live state. */
export async function readSdkResumeHistory(logDir, file, { cwd, projectId }) {
  const before = resolveV2SessionFile(logDir, file);
  if (before.project.canonicalCwd !== cwd || before.project.projectId !== projectId) {
    throw failure('History belongs to a different workspace', 'SDK_RESUME_SCOPE_MISMATCH', 403);
  }
  const { manifest, sessionDir } = before;
  if (manifest.source !== 'sdk' || manifest.rootThreadId !== manifest.sessionId
      || !isSdkResumeThreadId(manifest.rootThreadId)) {
    throw failure('History has no resumable SDK thread', 'SDK_RESUME_UNAVAILABLE', 422);
  }
  const identity = JSON.stringify(readSessionTimelineIdentity(sessionDir));
  let messages = null;
  await streamV2LogEntries(logDir, file, raw => {
    const entry = JSON.parse(raw);
    if (entry.mainAgent !== true) return;
    const metadata = entry.body?.metadata;
    if (metadata?.sdk !== 'openai-codex-sdk' || metadata.thread_id !== manifest.rootThreadId || metadata.cwd !== cwd) {
      throw failure('SDK history identity does not match its archive', 'SDK_RESUME_IDENTITY_MISMATCH');
    }
    const input = entry.body?.input;
    if (!Array.isArray(input) || !input.every(item => item && ['user', 'assistant'].includes(item.role)
      && (typeof item.content === 'string' || Array.isArray(item.content)))) {
      throw failure('SDK history input is invalid', 'SDK_RESUME_UNAVAILABLE', 422);
    }
    messages = input;
    // These messages reconstruct Viewer display only; native resume uses the
    // thread id, never this array. Preserve explicit modern SDK display times.
    const timedSdkHistory = input.some(item => typeof item._sdkTimestamp === 'string');
    const response = entry.response;
    if (response?.status >= 200 && response.status < 300 && Array.isArray(response.body?.content)
        && response.body.content.length) {
      messages = [...input, { role: 'assistant', content: response.body.content,
        ...(timedSdkHistory ? { _sdkTimestamp: entry.timestamp } : {}) }];
    } else if (timedSdkHistory && response?.status >= 400 && Array.isArray(response.body?.content) && response.body.content.length) {
      messages = [...input, { role: 'assistant', content: response.body.content,
        _sdkTimestamp: entry.timestamp, _sdkFeedback: true }];
    }
  }, { requireComplete: true });
  const after = resolveV2SessionFile(logDir, file);
  if (JSON.stringify(after.project) !== JSON.stringify(before.project)
      || JSON.stringify(after.manifest) !== JSON.stringify(manifest)
      || JSON.stringify(readSessionTimelineIdentity(after.sessionDir)) !== identity) {
    throw failure('History changed while it was being read; retry', 'SDK_RESUME_HISTORY_CHANGED');
  }
  if (!messages?.length) throw failure('SDK history has no conversation input', 'SDK_RESUME_UNAVAILABLE', 422);
  return { threadId: manifest.rootThreadId, messages };
}
