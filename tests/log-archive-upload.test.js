import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_LOG_ARCHIVE_UPLOAD_BYTES,
  MAX_LOG_ARCHIVE_RESPONSE_BYTES,
  parseLogArchiveResponse,
  uploadLogArchive,
} from '../src/utils/logArchiveUpload.js';

function chunkedResponse(chunks, init = { status: 200 }) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), init);
}

test('log archive response parser handles delimiters split across stream chunks', async () => {
  const progress = [];
  const response = chunkedResponse([
    '{"id":1}\n--',
    '-\n{"id":',
    '2,"text":"line\\ninside"}\n---\n',
  ]);
  const entries = await parseLogArchiveResponse(response, { onProgress: count => progress.push(count) });
  assert.deepEqual(entries, [{ id: 1 }, { id: 2, text: 'line\ninside' }]);
  assert.deepEqual(progress, [1, 2]);
});

test('log archive response parser accepts a final entry without a delimiter', async () => {
  const entries = await parseLogArchiveResponse(chunkedResponse(['{"ok":true}']));
  assert.deepEqual(entries, [{ ok: true }]);
});

test('log archive response parser throttles progress while preserving the final count', async () => {
  const progress = [];
  const payload = Array.from({ length: 1000 }, (_, id) => `${JSON.stringify({ id })}\n---\n`).join('');
  const entries = await parseLogArchiveResponse(chunkedResponse([payload]), {
    onProgress: count => progress.push(count),
  });
  assert.equal(entries.length, 1000);
  assert.equal(progress[0], 1);
  assert.equal(progress.at(-1), 1000);
  assert.ok(progress.length < 10, `expected throttled progress, received ${progress.length} updates`);
});

test('log archive response parser rejects declared and streamed bodies over its bound', async () => {
  await assert.rejects(parseLogArchiveResponse(new Response('too large', {
    status: 200,
    headers: { 'Content-Length': String(MAX_LOG_ARCHIVE_RESPONSE_BYTES + 1) },
  })), error => error.code === 'CXV_LOG_ARCHIVE_TOO_LARGE');

  await assert.rejects(parseLogArchiveResponse(chunkedResponse(['12345', '67890']), {
    maxBytes: 8,
  }), error => error.code === 'CXV_LOG_ARCHIVE_TOO_LARGE');
});

test('log archive response parser surfaces API errors', async () => {
  const response = new Response(JSON.stringify({ error: 'archive corrupt' }), {
    status: 422,
    headers: { 'Content-Type': 'application/json' },
  });
  await assert.rejects(parseLogArchiveResponse(response), error => {
    assert.equal(error.status, 422);
    return error.message === 'archive corrupt';
  });
});

test('log archive response parser cancels and releases a failed reader', async () => {
  let cancelled = false;
  let released = false;
  let reads = 0;
  const response = {
    ok: true,
    body: {
      getReader() {
        return {
          async read() {
            if (reads++ === 0) return { done: false, value: new TextEncoder().encode('{bad}\n---\n') };
            return { done: true };
          },
          async cancel() { cancelled = true; },
          releaseLock() { released = true; },
        };
      },
    },
  };
  await assert.rejects(parseLogArchiveResponse(response), SyntaxError);
  assert.equal(cancelled, true);
  assert.equal(released, true);
});

test('log archive uploader accepts one ZIP and posts multipart form data', async () => {
  const file = new File(['PK\u0003\u0004archive'], 'session.zip', { type: 'application/zip' });
  let request = null;
  const entries = await uploadLogArchive(file, {
    endpoint: '/parse',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return chunkedResponse(['{"id":1}\n---\n']);
    },
  });
  assert.deepEqual(entries, [{ id: 1 }]);
  assert.equal(request.url, '/parse');
  assert.equal(request.options.method, 'POST');
  assert.ok(request.options.body instanceof FormData);
  assert.equal(request.options.body.get('file').name, 'session.zip');
});

test('log archive uploader rejects non-ZIP and oversized files before fetch', async () => {
  let fetched = false;
  const fetchImpl = async () => { fetched = true; throw new Error('unexpected'); };
  await assert.rejects(uploadLogArchive(new File(['x'], 'legacy.jsonl'), { fetchImpl }), /Only \.zip/);
  await assert.rejects(uploadLogArchive({
    name: 'huge.zip',
    size: MAX_LOG_ARCHIVE_UPLOAD_BYTES + 1,
  }, { fetchImpl }), error => error.code === 'CXV_LOG_ARCHIVE_TOO_LARGE');
  assert.equal(fetched, false);
});
