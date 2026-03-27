import * as FileSystem from "expo-file-system/legacy";
import { openDatabaseAsync } from "expo-sqlite";
import { supportedPlatforms } from "@creator-cfo/schemas";
import {
  buildVaultRelativePath,
  fileVaultContract,
  structuredStoreContract,
} from "@creator-cfo/storage";

import type { BootstrapStatus } from "./status";

export async function bootstrapLocalStorage(): Promise<BootstrapStatus> {
  const database = await openDatabaseAsync(structuredStoreContract.databaseName);

  await database.execAsync("PRAGMA journal_mode = WAL;");
  await database.execAsync(`PRAGMA user_version = ${structuredStoreContract.version};`);

  for (const table of structuredStoreContract.tables) {
    await database.execAsync(table.createStatement);
  }

  const rootDirectory = `${FileSystem.documentDirectory}${fileVaultContract.rootDirectory}`;
  const rootInfo = await FileSystem.getInfoAsync(rootDirectory);

  if (!rootInfo.exists) {
    await FileSystem.makeDirectoryAsync(rootDirectory, { intermediates: true });
  }

  for (const collection of fileVaultContract.collections) {
    const collectionDirectory = `${rootDirectory}/${collection.slug}`;
    const collectionInfo = await FileSystem.getInfoAsync(collectionDirectory);

    if (!collectionInfo.exists) {
      await FileSystem.makeDirectoryAsync(collectionDirectory, { intermediates: true });
    }
  }

  const bootstrapManifest = `${rootDirectory}/bootstrap-manifest.json`;
  const manifestInfo = await FileSystem.getInfoAsync(bootstrapManifest);

  if (!manifestInfo.exists) {
    await FileSystem.writeAsStringAsync(
      bootstrapManifest,
      JSON.stringify(
        {
          databaseName: structuredStoreContract.databaseName,
          fileCollections: fileVaultContract.collections.map((collection) => ({
            ...collection,
            samplePath: buildVaultRelativePath(
              collection.slug,
              `sample.${collection.defaultExtension}`,
            ),
          })),
          version: structuredStoreContract.version,
        },
        null,
        2,
      ),
    );
  }

  const tables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
  );

  return {
    databaseName: structuredStoreContract.databaseName,
    fileCollectionCount: fileVaultContract.collections.length,
    fileVaultRoot: fileVaultContract.rootDirectory,
    platformCount: supportedPlatforms.length,
    status: "ready",
    structuredTableCount: tables.filter((table) =>
      structuredStoreContract.tables.some((contract) => contract.name === table.name),
    ).length,
    summary: "SQLite tables and document vault directories are provisioned locally.",
  };
}
