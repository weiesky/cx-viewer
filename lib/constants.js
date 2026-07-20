/**
 * Shared constants for cx-viewer
 */

// Server port range
export const DEFAULT_START_PORT = 7008;
export const DEFAULT_MAX_PORT = 7099;

// HTTP limits
export const MAX_POST_BODY = 10 * 1024 * 1024;    // 10MB
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;  // 100MB

// Timers
export const SSE_HEARTBEAT_MS = 30_000;            // 30s SSE ping
export const HOOK_TIMEOUT_MS = 5 * 60 * 1000;     // 5min hook execution timeout
export const EDITOR_SESSION_CLEANUP_MS = 3_600_000; // 1h stale editor session cleanup

// Paths
export const UPLOAD_DIR = '/tmp/cx-viewer-uploads';

// API defaults
export const DEFAULT_API_BASE = 'https://api.openai.com';
