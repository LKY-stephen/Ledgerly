import { supportedPlatforms } from "@creator-cfo/schemas";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import type { BootstrapStatus } from "./status";

export async function bootstrapLocalStorage(): Promise<BootstrapStatus> {
  const storagePlan = getLocalStorageBootstrapPlan();

  return {
    databaseName: storagePlan.databaseName,
    fileCollectionCount: storagePlan.overview.collectionCount,
    fileVaultRoot: storagePlan.fileVaultRoot,
    platformCount: supportedPlatforms.length,
    status: "ready",
    structuredTableCount: storagePlan.overview.tableCount,
    summary: "Web preview uses version-2 storage metadata; native devices provision SQLite and vaults.",
  };
}
