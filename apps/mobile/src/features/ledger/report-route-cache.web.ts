import {
  createDefaultReportRouteState,
  parsePersistedReportRouteState,
  reportRouteStorageKey,
  serializePersistedReportRouteState,
  type PersistedReportRouteState,
} from "./report-route-state";

export async function loadPersistedReportRouteState(): Promise<PersistedReportRouteState> {
  if (typeof window === "undefined" || !window.localStorage) {
    return createDefaultReportRouteState();
  }

  return parsePersistedReportRouteState(
    window.localStorage.getItem(reportRouteStorageKey),
  );
}

export async function persistReportRouteState(
  state: PersistedReportRouteState,
): Promise<void> {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(
    reportRouteStorageKey,
    serializePersistedReportRouteState(state),
  );
}
