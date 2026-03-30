import * as FileSystem from "expo-file-system/legacy";
import { openDatabaseAsync } from "expo-sqlite";
import { supportedPlatforms } from "@creator-cfo/schemas";
import {
  createLocalStorageBootstrapManifest,
  getLocalStorageBootstrapPlan,
} from "@creator-cfo/storage";

import type { BootstrapStatus } from "./status";
import { countStructuredTables, initializeLocalDatabase } from "./database";

export async function bootstrapLocalStorage(): Promise<BootstrapStatus> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const database = await openDatabaseAsync(storagePlan.databaseName);
  const documentDirectory = FileSystem.documentDirectory;

  if (!documentDirectory) {
    throw new Error("Expo document directory is unavailable for local vault bootstrap.");
  }

  await initializeLocalDatabase(database);

  const rootDirectory = `${documentDirectory}${storagePlan.fileVaultRoot}`;
  const rootInfo = await FileSystem.getInfoAsync(rootDirectory);

  if (!rootInfo.exists) {
    await FileSystem.makeDirectoryAsync(rootDirectory, { intermediates: true });
  }

  for (const collection of storagePlan.fileCollections) {
    const collectionDirectory = `${rootDirectory}/${collection.slug}`;
    const collectionInfo = await FileSystem.getInfoAsync(collectionDirectory);

    if (!collectionInfo.exists) {
      await FileSystem.makeDirectoryAsync(collectionDirectory, { intermediates: true });
    }
  }

  const bootstrapManifest = `${rootDirectory}/bootstrap-manifest.json`;
  await FileSystem.writeAsStringAsync(
    bootstrapManifest,
    JSON.stringify(createLocalStorageBootstrapManifest(), null, 2),
  );

  return {
    databaseName: storagePlan.databaseName,
    fileCollectionCount: storagePlan.overview.collectionCount,
    fileVaultRoot: storagePlan.fileVaultRoot,
    platformCount: supportedPlatforms.length,
    status: "ready",
    structuredTableCount: await countStructuredTables(database),
    summary: "SQLite tables, derived views, and evidence-vault directories are provisioned locally.",
  };
}
