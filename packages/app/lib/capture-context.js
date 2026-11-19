import { AsyncLocalStorage } from 'node:async_hooks';

// Trusted proxy-owner identity, never populated from HTTP headers or JSON bodies.
export const captureRequestContext = new AsyncLocalStorage();
