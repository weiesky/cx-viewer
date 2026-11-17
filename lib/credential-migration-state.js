// Explicit activation records live in the existing authenticated store. Merely
// creating the store or staging a secret does not activate a configuration.
const KIND = 'configuration-state';
const VERSION = 'migrated-v1';

function unreadable() {
  return Object.assign(new Error('Credential migration state is unreadable; restore the matching configuration and store'), {
    code: 'CREDENTIALS_UNREADABLE', status: 409,
  });
}

function identity(type, config) {
  if (!['auth', 'proxy', 'im'].includes(type) || typeof config !== 'string' || !config) throw new TypeError('Invalid configuration identity');
  return JSON.stringify([type, config]);
}

export function isConfigurationMigrated(store, type, config) {
  const value = store.get(KIND, identity(type, config));
  if (value === null) return false;
  if (value !== VERSION) throw unreadable();
  return true;
}

export function assertConfigurationFormat(store, type, config, sourceVersion) {
  if (isConfigurationMigrated(store, type, config) && sourceVersion !== 1) throw unreadable();
}

// Only the migration tool calls this after validating the source commit and
// recoverable backup. Ordinary runtime reads/writes never mark migration done.
export function markConfigurationMigrated(store, type, config) {
  isConfigurationMigrated(store, type, config); // Reject unknown future states.
  return store.set(KIND, identity(type, config), VERSION);
}
