import { SQLiteProvider } from "expo-sqlite";
import type { PropsWithChildren } from "react";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import { useAppShell } from "../features/app-shell/provider";
import { initializeActivePackageDatabase } from "./active-database.native";
import { getActiveDatabaseDirectory } from "./package-environment.native";

export function LocalStorageProvider({ children }: PropsWithChildren) {
  const { isStorageSuspended, storageGateState, storageRevision } = useAppShell();
  const storagePlan = getLocalStorageBootstrapPlan();

  if (isStorageSuspended || storageGateState.kind !== "ready") {
    return null;
  }

  return (
    <SQLiteProvider
      key={`local-storage-${storageRevision}`}
      databaseName={storagePlan.databaseName}
      directory={getActiveDatabaseDirectory()}
      onInit={initializeActivePackageDatabase}
    >
      {children}
    </SQLiteProvider>
  );
}
