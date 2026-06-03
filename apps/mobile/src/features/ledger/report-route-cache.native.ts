import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createDefaultReportRouteState,
  parsePersistedReportRouteState,
  reportRouteStorageKey,
  serializePersistedReportRouteState,
  type PersistedReportRouteState,
} from "./report-route-state";

export async function loadPersistedReportRouteState(): Promise<PersistedReportRouteState> {
  try {
    const value = await AsyncStorage.getItem(reportRouteStorageKey);
    return parsePersistedReportRouteState(value);
  } catch {
    return createDefaultReportRouteState();
  }
}

export async function persistReportRouteState(
  state: PersistedReportRouteState,
): Promise<void> {
  await AsyncStorage.setItem(
    reportRouteStorageKey,
    serializePersistedReportRouteState(state),
  );
}
