// Native protocol facts; no prompt-text inference or browser/Node dependency.
export function isTemporaryTitleThread(thread) {
  return thread?.ephemeral === true && thread.threadSource === 'thread_title';
}

export function isNativeTitleEntry(entry) {
  return entry?._appServerSource === true && isTemporaryTitleThread(entry.body?.metadata);
}
