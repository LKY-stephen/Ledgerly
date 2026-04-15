import { supportedPlatforms } from "@creator-cfo/schemas";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import { initializeLocalDatabase, countStructuredTables } from "./database";
import type { BootstrapStatus } from "./status";
import { openWebSqliteDatabase } from "./web-sqlite";

export async function bootstrapLocalStorage(): Promise<BootstrapStatus> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const database = await openWebSqliteDatabase();
  await initializeLocalDatabase(database);
  const structuredTableCount = await countStructuredTables(database);

  return {
    databaseName: storagePlan.databaseName,
    fileCollectionCount: storagePlan.overview.collectionCount,
    fileVaultRoot: storagePlan.fileVaultRoot,
    platformCount: supportedPlatforms.length,
    status: "ready",
    structuredTableCount,
    summary: "Web SQLite (sql.js) tables, indexes, and evidence-vault directories are provisioned in-browser.",
  };
}

export async function initializeEmptyActivePackage(): Promise<BootstrapStatus> {
  return bootstrapLocalStorage();
}
