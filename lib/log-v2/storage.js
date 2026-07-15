import crypto from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  statSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

const JSONL_SCAN_CHUNK_BYTES = 1024 * 1024;
const LOCK_WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));

function ownerIsGone(lockPath) {
  try {
    const owner = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) return false;
    try {
      process.kill(owner.pid, 0);
      return false;
    } catch (error) {
      return error?.code === 'ESRCH';
    }
  } catch {
    return false;
  }
}

export function withFileLockSync(lockPath, operation, { timeoutMs = 30_000, staleMs = 120_000 } = {}) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  let fd;
  while (fd === undefined) {
    let created = false;
    try {
      fd = openSync(lockPath, 'wx', 0o600);
      created = true;
      writeSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      closeSync(fd);
    } catch (error) {
      if (fd !== undefined) {
        try { closeSync(fd); } catch {}
        fd = undefined;
      }
      if (error?.code !== 'EEXIST') {
        if (created) try { unlinkSync(lockPath); } catch {}
        throw error;
      }
      let stale = ownerIsGone(lockPath);
      if (!stale) {
        try {
          stale = Date.now() - statSync(lockPath).mtimeMs > staleMs;
        } catch (statError) {
          // The previous owner may have released the pathname between our
          // failed open and this stat. Retry acquisition; treating ENOENT as a
          // stale lock can unlink a new owner's lock in that race window.
          if (statError?.code === 'ENOENT') continue;
          throw statError;
        }
      }
      if (stale) {
        try { unlinkSync(lockPath); } catch {}
        continue;
      }
      if (Date.now() >= deadline) {
        const timeout = new Error(`timed out acquiring V2 log lock: ${lockPath}`);
        timeout.code = 'CXV_LOG_V2_LOCK_TIMEOUT';
        throw timeout;
      }
      Atomics.wait(LOCK_WAIT_ARRAY, 0, 0, Math.min(10, Math.max(1, deadline - Date.now())));
    }
  }

  try {
    return operation();
  } finally {
    try { unlinkSync(lockPath); } catch {}
  }
}

function canonicalize(value, seen) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('V2 log values must contain only finite numbers');
    return value;
  }
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
    throw new TypeError(`V2 log values cannot contain ${typeof value}`);
  }
  if (seen.has(value)) throw new TypeError('V2 log values cannot contain circular references');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => canonicalize(item, seen));
    const output = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalize(value[key], seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

export function stableJsonStringify(value) {
  return JSON.stringify(canonicalize(value, new Set()));
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function atomicWriteJsonSync(filePath, value, { durable = true } = {}) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const data = `${stableJsonStringify(value)}\n`;
  try {
    writeFileSync(tmp, data, { mode: 0o600, flag: 'wx' });
    if (durable) {
      const fd = openSync(tmp, 'r');
      try { fsyncSync(fd); } finally { closeSync(fd); }
    }
    renameSync(tmp, filePath);
  } finally {
    if (existsSync(tmp)) {
      try { unlinkSync(tmp); } catch {}
    }
  }
}

export function appendJsonLineSync(filePath, value, { durable = true } = {}) {
  mkdirSync(dirname(filePath), { recursive: true });
  const line = Buffer.from(`${stableJsonStringify(value)}\n`);
  const fd = openSync(filePath, 'a+', 0o600);
  try {
    const offset = fstatSync(fd).size;
    appendFileSync(fd, line);
    if (durable) fsyncSync(fd);
    return Object.freeze({
      offset,
      length: line.length,
      checksum: `sha256:${sha256(line)}`,
    });
  } finally {
    closeSync(fd);
  }
}

export function scanJsonlSync(filePath, onRecord = () => {}) {
  if (!existsSync(filePath)) return { fileSize: 0, validBytes: 0, records: 0, error: null };
  const fileSize = statSync(filePath).size;
  if (fileSize === 0) return { fileSize: 0, validBytes: 0, records: 0, error: null };

  const fd = openSync(filePath, 'r');
  const chunk = Buffer.allocUnsafe(Math.min(JSONL_SCAN_CHUNK_BYTES, fileSize));
  let carry = Buffer.alloc(0);
  let absoluteOffset = 0;
  let validBytes = 0;
  let records = 0;
  let error = null;
  try {
    while (absoluteOffset < fileSize && !error) {
      const bytesRead = readSync(fd, chunk, 0, Math.min(chunk.length, fileSize - absoluteOffset), absoluteOffset);
      if (!bytesRead) break;
      const data = carry.length
        ? Buffer.concat([carry, chunk.subarray(0, bytesRead)])
        : Buffer.from(chunk.subarray(0, bytesRead));
      const dataStart = absoluteOffset - carry.length;
      let start = 0;
      let newline;
      while ((newline = data.indexOf(0x0a, start)) !== -1) {
        const line = data.subarray(start, newline + 1);
        const lineOffset = dataStart + start;
        try {
          const value = JSON.parse(line.subarray(0, line.length - 1).toString('utf8'));
          onRecord({ value, raw: line, offset: lineOffset, length: line.length });
          records++;
          validBytes = lineOffset + line.length;
        } catch (cause) {
          error = { offset: lineOffset, cause };
          break;
        }
        start = newline + 1;
      }
      carry = error ? Buffer.alloc(0) : Buffer.from(data.subarray(start));
      absoluteOffset += bytesRead;
    }
    if (!error && carry.length > 0) {
      error = { offset: validBytes, cause: new Error('incomplete JSONL tail') };
    }
  } finally {
    closeSync(fd);
  }
  return { fileSize, validBytes, records, error };
}

/** Scans complete JSONL records beginning at a verified line boundary. */
export function scanJsonlRangeSync(filePath, {
  startOffset = 0,
  skipInvalidLines = false,
} = {}, onRecord = () => {}) {
  if (!Number.isSafeInteger(startOffset) || startOffset < 0) throw new TypeError('invalid JSONL start offset');
  if (!existsSync(filePath)) return { fileSize: 0, validBytes: 0, records: 0, error: null };
  const fileSize = statSync(filePath).size;
  if (startOffset > fileSize) {
    const error = new Error('JSONL file was truncated before the cursor');
    error.code = 'CXV_LOG_V2_WIRE_RESET_REQUIRED';
    throw error;
  }
  const fd = openSync(filePath, 'r');
  try {
    if (startOffset > 0) {
      const boundary = Buffer.allocUnsafe(1);
      if (readSync(fd, boundary, 0, 1, startOffset - 1) !== 1 || boundary[0] !== 0x0a) {
        throw new TypeError('JSONL start offset is not a line boundary');
      }
    }
    if (startOffset === fileSize) return { fileSize, validBytes: startOffset, records: 0, error: null };
    const chunk = Buffer.allocUnsafe(Math.min(JSONL_SCAN_CHUNK_BYTES, fileSize - startOffset));
    let carry = Buffer.alloc(0);
    let absoluteOffset = startOffset;
    let validBytes = startOffset;
    let records = 0;
    let error = null;
    while (absoluteOffset < fileSize && !error) {
      const bytesRead = readSync(fd, chunk, 0, Math.min(chunk.length, fileSize - absoluteOffset), absoluteOffset);
      if (!bytesRead) break;
      const data = carry.length ? Buffer.concat([carry, chunk.subarray(0, bytesRead)]) : Buffer.from(chunk.subarray(0, bytesRead));
      const dataStart = absoluteOffset - carry.length;
      let start = 0;
      let newline;
      while ((newline = data.indexOf(0x0a, start)) !== -1) {
        const line = data.subarray(start, newline + 1);
        const lineOffset = dataStart + start;
        let value;
        try {
          value = JSON.parse(line.subarray(0, line.length - 1).toString('utf8'));
        } catch (cause) {
          if (skipInvalidLines) {
            validBytes = lineOffset + line.length;
            start = newline + 1;
            continue;
          }
          error = { offset: lineOffset, cause };
          break;
        }
        try {
          onRecord({ value, raw: line, offset: lineOffset, length: line.length });
          records++;
          validBytes = lineOffset + line.length;
        } catch (cause) {
          error = { offset: lineOffset, cause };
          break;
        }
        start = newline + 1;
      }
      carry = error ? Buffer.alloc(0) : Buffer.from(data.subarray(start));
      absoluteOffset += bytesRead;
    }
    if (!error && carry.length > 0) error = { offset: validBytes, cause: new Error('incomplete JSONL tail') };
    return { fileSize, validBytes, records, error };
  } finally {
    closeSync(fd);
  }
}

export function repairJsonlTailSync(filePath) {
  const result = scanJsonlSync(filePath);
  if (result.validBytes < result.fileSize) truncateSync(filePath, result.validBytes);
  return { ...result, repaired: result.validBytes < result.fileSize };
}

export function readJsonReferenceSync(filePath, ref) {
  if (!Number.isSafeInteger(ref?.offset) || ref.offset < 0
      || !Number.isSafeInteger(ref?.length) || ref.length <= 0
      || !/^sha256:[a-f0-9]{64}$/.test(ref?.checksum || '')) {
    throw new TypeError('invalid JSONL reference');
  }
  const fd = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(ref.length);
    const bytesRead = readSync(fd, buffer, 0, buffer.length, ref.offset);
    if (bytesRead !== buffer.length) throw new Error('truncated JSONL reference');
    if (`sha256:${sha256(buffer)}` !== ref.checksum) throw new Error('JSONL reference checksum mismatch');
    if (buffer[buffer.length - 1] !== 0x0a) throw new Error('JSONL reference is not newline terminated');
    return JSON.parse(buffer.subarray(0, buffer.length - 1).toString('utf8'));
  } finally {
    closeSync(fd);
  }
}

export function writeContentObjectSync(sessionDir, value, { durable = true, onCreate = null } = {}) {
  if (onCreate != null && typeof onCreate !== 'function') throw new TypeError('onCreate must be a function');
  const json = stableJsonStringify(value);
  const hash = sha256(json);
  const relativePath = `objects/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}.json`;
  const filePath = join(sessionDir, relativePath);
  if (!existsSync(filePath)) {
    atomicWriteJsonSync(filePath, value, { durable });
    onCreate?.(Object.freeze({ path: relativePath, bytes: statSync(filePath).size }));
  }
  return Object.freeze({ algorithm: 'sha256', hash, bytes: Buffer.byteLength(json), path: relativePath });
}

export function readContentObjectSync(sessionDir, ref) {
  if (ref?.algorithm !== 'sha256' || !/^[a-f0-9]{64}$/.test(ref?.hash || '')) {
    throw new TypeError('invalid content object reference');
  }
  const expected = `objects/${ref.hash.slice(0, 2)}/${ref.hash.slice(2, 4)}/${ref.hash}.json`;
  if (ref.path !== expected) throw new TypeError('content object path does not match its hash');
  const raw = readFileSync(join(sessionDir, expected), 'utf8').trimEnd();
  if (sha256(raw) !== ref.hash) throw new Error('content object checksum mismatch');
  return JSON.parse(raw);
}

/** Returns verified canonical JSON without constructing the stored value. */
export function readContentObjectRawSync(sessionDir, ref) {
  if (ref?.algorithm !== 'sha256' || !/^[a-f0-9]{64}$/.test(ref?.hash || '')) {
    throw new TypeError('invalid content object reference');
  }
  const expected = `objects/${ref.hash.slice(0, 2)}/${ref.hash.slice(2, 4)}/${ref.hash}.json`;
  if (ref.path !== expected) throw new TypeError('content object path does not match its hash');
  const raw = readFileSync(join(sessionDir, expected), 'utf8').trimEnd();
  if (sha256(raw) !== ref.hash) throw new Error('content object checksum mismatch');
  const bytes = Buffer.byteLength(raw);
  if (Number.isSafeInteger(ref.bytes) && ref.bytes !== bytes) throw new Error('content object byte count mismatch');
  return Object.freeze({ raw, bytes });
}
