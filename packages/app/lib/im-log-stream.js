import { closeSync, existsSync, openSync, readSync, statSync } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';

const CHUNK_SIZE = 1024 * 1024;
const SEPARATOR = '\n---\n';

function* entries(filePath) {
  if (!existsSync(filePath)) return;
  const size = statSync(filePath).size;
  if (size === 0) return;
  const fd = openSync(filePath, 'r');
  const buffer = Buffer.alloc(Math.min(CHUNK_SIZE, size));
  let offset = 0;
  let pending = '';
  const decoder = new StringDecoder('utf8');
  try {
    while (offset < size) {
      const bytesRead = readSync(fd, buffer, 0, Math.min(buffer.length, size - offset), offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
      const parts = (pending + decoder.write(buffer.subarray(0, bytesRead))).split(SEPARATOR);
      pending = parts.pop() || '';
      for (const part of parts) if (part.trim()) yield part.trim();
    }
    pending += decoder.end();
    if (pending.trim()) yield pending.trim();
  } finally {
    closeSync(fd);
  }
}

export function countImLogEntries(filePath) {
  let count = 0;
  for (const _ of entries(filePath)) count++;
  return count;
}

export async function streamImLogEntries(filePath, onEntry) {
  let count = 0;
  for (const raw of entries(filePath)) {
    onEntry(raw);
    if (++count % 20 === 0) await new Promise(resolve => setImmediate(resolve));
  }
  return { count };
}
