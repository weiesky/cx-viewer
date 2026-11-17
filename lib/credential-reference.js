import { randomUUID } from 'node:crypto';

function unreadable(cause) {
  return Object.assign(new Error('Credential reference is unreadable; restore its matching configuration and store', { cause }), {
    code: 'CREDENTIALS_UNREADABLE', status: 409,
  });
}

function assertOwner(owner, ref) {
  try {
    if (typeof owner !== 'string' || !owner || typeof ref !== 'string' || Buffer.byteLength(ref) > 8192) throw new Error('Invalid reference');
    const parts = JSON.parse(ref);
    if (!Array.isArray(parts) || parts.length !== 2 || parts[0] !== owner
        || typeof parts[1] !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(parts[1])
        || JSON.stringify(parts) !== ref) throw new Error('Reference ownership mismatch');
  } catch (cause) { throw unreadable(cause); }
}

export function readReferencedSecret(store, kind, owner, ref) {
  assertOwner(owner, ref);
  const value = store.get(kind, ref);
  if (typeof value !== 'string') throw unreadable();
  return value;
}

// The source file is the commit point. A staged version never overwrites the
// active version, so a failed source rename keeps the previous secret valid.
export function stageSecretReference(store, kind, owner, plain) {
  if (typeof owner !== 'string' || !owner) throw new TypeError('Invalid credential owner');
  const ref = JSON.stringify([owner, randomUUID()]);
  store.set(kind, ref, plain);
  if (readReferencedSecret(store, kind, owner, ref) !== plain) throw unreadable();
  return ref;
}

export function removeSecretReference(store, kind, owner, ref) {
  assertOwner(owner, ref);
  return store.remove(kind, ref);
}
