// Frozen IM sender map, keyed by the native turn nonce already present in logs.
// Keep correlation/authentication markers unchanged; DingTalk supplies senderNick
// in its callback, so no contact lookup or avatar request is needed.
import { closeSync, constants, fstatSync, openSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWritePrivateFile, assertDingTalkWorkerPathSafe, ensureDingTalkPrivateDirectory, getDingTalkImWorkerDir } from './dingtalk-im-config.js';
import { withFileLockSync } from "../log-v2/storage.js";

export const MAX_DINGTALK_SENDERS = 500;
const MAX_BYTES = 512 * 1024;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;
const senderPath = () => join(getDingTalkImWorkerDir(), 'im-senders.json');

export function readDingTalkImSenders() {
  let fd;
  try {
    const file = assertDingTalkWorkerPathSafe(senderPath());
    fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > MAX_BYTES) return {};
    const bytes = readFileSync(fd);
    if (bytes.length > MAX_BYTES) return {};
    const map = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!map || typeof map !== 'object' || Array.isArray(map) || Object.keys(map).length > MAX_DINGTALK_SENDERS) return {};
    return Object.fromEntries(Object.entries(map).filter(([id, p]) => NONCE.test(id)
      && p && typeof p.name === 'string' && p.name.length <= 128 && Number.isFinite(p.ts))
      .map(([id, p]) => [id, { name: p.name, avatar: null, ts: p.ts }]));
  } catch { return {}; }
  finally { if (fd !== undefined) closeSync(fd); }
}

export function rememberDingTalkImSender(nonce, senderName) {
  if (!NONCE.test(nonce || '') || typeof senderName !== 'string') return false;
  const name = senderName.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim().slice(0, 128);
  if (!name || Buffer.from(name).toString('utf8') !== name) return false;
  try {
    ensureDingTalkPrivateDirectory(getDingTalkImWorkerDir());
    const file = assertDingTalkWorkerPathSafe(senderPath());
    return withFileLockSync(`${file}.lock`, () => {
      const map = readDingTalkImSenders();
      map[nonce] = { name, avatar: null, ts: Date.now() };
      const kept = Object.entries(map).sort((a, b) => b[1].ts - a[1].ts).slice(0, MAX_DINGTALK_SENDERS);
      atomicWritePrivateFile(file, JSON.stringify(Object.fromEntries(kept)));
      return true;
    }, { timeoutMs: 0 });
  } catch { return false; } // Profile persistence never prevents message delivery.
}
