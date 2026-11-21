#!/usr/bin/env node

/**
 * cxv-editor.js — Custom $EDITOR wrapper for cx-viewer.
 *
 * When Codex spawns $EDITOR (for example from an editing command), this script is invoked instead.
 * It notifies the cx-viewer server to open the file in the built-in FileContentView,
 * then polls until the user closes the editor in the web UI.
 */

import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const inputPath = process.argv[2];
if (typeof inputPath !== 'string' || !inputPath || inputPath.includes('\0')) {
  console.error('Usage: cxv-editor <file>');
  process.exit(1);
}

const filePath = resolve(inputPath);
const port = process.env.CXV_EDITOR_PORT;
if (!/^\d{1,5}$/.test(port || '') || Number(port) < 1 || Number(port) > 65535) {
  console.error('Invalid CXV_EDITOR_PORT');
  process.exit(1);
}

const instance = process.env.CXV_INSTANCE_KEY || '';
if (instance && !/^cxv-[a-f0-9]{32}(?:[a-f0-9]{4})?$/.test(instance)) {
  console.error('Invalid CXV_INSTANCE_KEY'); process.exit(1);
}
const sessionId = randomUUID();
const baseUrl = `http://127.0.0.1:${port}`;
const endpoint = path => { const url = new URL(path, baseUrl); if (instance) url.searchParams.set('instance', instance); return url; };
const POLL_INTERVAL = 500;
const TIMEOUT = 30 * 60 * 1000; // 30 minutes

async function main() {
  // Notify server to open editor
  try {
    const res = await fetch(endpoint('/api/editor-open'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, filePath }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to open editor:', err);
      process.exit(1);
    }
  } catch (err) {
    console.error('Failed to connect to cx-viewer server:', err.message);
    process.exit(1);
  }

  // Poll until done
  const start = Date.now();
  while (true) {
    if (Date.now() - start > TIMEOUT) {
      console.error('Editor session timed out');
      process.exit(1);
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    try {
      const res = await fetch(endpoint(`/api/editor-status?id=${sessionId}`));
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) { console.error(`Editor session unavailable (${res.status})`); process.exit(1); }
        continue;
      }
      const data = await res.json();
      if (data.done) {
        process.exit(0);
      }
    } catch {
      // Connection error — server may have restarted, exit
      process.exit(1);
    }
  }
}

main();
