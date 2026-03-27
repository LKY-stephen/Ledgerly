import { productModules, supportedPlatforms, workflowPrinciples } from "@creator-cfo/schemas";
import { fileVaultContract, structuredStoreContract } from "@creator-cfo/storage";

export function buildHomeSections() {
  return {
    modules: productModules,
    platforms: supportedPlatforms,
    storageCards: [
      {
        title: "Structured Store",
        value: structuredStoreContract.tables.length.toString(),
        label: "SQLite tables ready",
      },
      {
        title: "File Vault",
        value: fileVaultContract.collections.length.toString(),
        label: "document collections ready",
      },
    ],
    storageCollections: fileVaultContract.collections,
    workflowPrinciples,
  };
}

