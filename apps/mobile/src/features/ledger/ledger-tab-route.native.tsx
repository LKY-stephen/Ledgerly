import { SQLiteProvider } from "expo-sqlite";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import { initializeLocalDatabase } from "../../storage/database";
import { LedgerScreen } from "./ledger-screen";

const storagePlan = getLocalStorageBootstrapPlan();

export function LedgerTabRoute() {
  return (
    <SQLiteProvider
      databaseName={storagePlan.databaseName}
      onInit={initializeLocalDatabase}
    >
      <LedgerScreen />
    </SQLiteProvider>
  );
}
