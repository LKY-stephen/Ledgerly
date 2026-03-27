import { supportedPlatforms } from "@creator-cfo/schemas";
import { fileVaultContract, structuredStoreContract } from "@creator-cfo/storage";

import type { BootstrapStatus } from "./status";

export async function bootstrapLocalStorage(): Promise<BootstrapStatus> {
  return {
    databaseName: structuredStoreContract.databaseName,
    fileCollectionCount: fileVaultContract.collections.length,
    fileVaultRoot: fileVaultContract.rootDirectory,
    platformCount: supportedPlatforms.length,
    status: "ready",
    structuredTableCount: structuredStoreContract.tables.length,
    summary: "Web preview uses contract metadata; native devices provision SQLite and vaults.",
  };
}

