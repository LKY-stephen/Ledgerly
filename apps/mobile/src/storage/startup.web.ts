export type StorageGateState =
  | { kind: "missing" }
  | { kind: "ready" }
  | { kind: "recovery_required"; message: string };

export async function inspectStorageGateState(): Promise<StorageGateState> {
  // On web, the sql.js database is always available (created on first access).
  return { kind: "ready" };
}

export async function initializeEmptyStorageFromSetup(): Promise<void> {
  // On web, the database is auto-initialized when the provider mounts.
  return Promise.resolve();
}
