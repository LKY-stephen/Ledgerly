export type StorageGateState =
  | { kind: "missing" }
  | { kind: "ready" }
  | { kind: "recovery_required"; message: string };

export async function inspectStorageGateState(): Promise<StorageGateState> {
  return { kind: "ready" };
}

export async function initializeEmptyStorageFromSetup(): Promise<void> {
  return Promise.resolve();
}
