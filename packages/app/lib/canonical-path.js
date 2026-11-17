import { lstatSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

/** Resolve existing links, including ancestors of a not-yet-created leaf. */
export function canonicalPath(path) {
  const target = resolve(path);
  let existing = target;
  while (!lstatSync(existing, { throwIfNoEntry: false })) {
    const parent = dirname(existing);
    if (parent === existing) throw new Error('Missing path ancestor');
    existing = parent;
  }
  return resolve(realpathSync(existing), relative(existing, target));
}
