import type { StorageGateState } from "../../storage/startup";

export type AppStorageGateState = StorageGateState | { kind: "checking" };

export function resolveEntryHref(input: {
  isHydrated: boolean;
  session: boolean;
  storageGateState: AppStorageGateState;
}): "/(game)" | "/login" | "/storage-setup" | null {
  const { isHydrated, session, storageGateState } = input;

  if (!isHydrated) {
    return null;
  }

  if (!session) {
    return "/login";
  }

  if (storageGateState.kind === "ready") {
    return "/(game)";
  }

  return storageGateState.kind === "checking" ? null : "/storage-setup";
}

export function resolveProtectedRouteRedirect(input: {
  isHydrated: boolean;
  session: boolean;
  storageGateState: AppStorageGateState;
}): "/login" | "/storage-setup" | null {
  const { isHydrated, session, storageGateState } = input;

  if (!isHydrated || storageGateState.kind === "checking") {
    return null;
  }

  if (!session) {
    return "/login";
  }

  return storageGateState.kind === "ready" ? null : "/storage-setup";
}
