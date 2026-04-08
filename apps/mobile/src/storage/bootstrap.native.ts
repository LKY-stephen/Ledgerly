import * as FileSystem from "expo-file-system/legacy";
import { openDatabaseAsync } from "expo-sqlite";
import { supportedPlatforms } from "@creator-cfo/schemas";
import {
  createLocalStorageBootstrapManifest,
  getLocalStorageBootstrapPlan,
} from "@creator-cfo/storage";

import { initializeActivePackageDatabase } from "./active-database.native";
import { countStructuredTables } from "./database";
import {
  getActiveDatabaseDirectory,
  getActiveDatabasePath,
  getLegacyDatabasePath,
} from "./package-environment.native";
import { StorageSetupRequiredError, type BootstrapStatus } from "./status";

export async function bootstrapLocalStorage(): Promise<BootstrapStatus> {
  await migrateLegacyDatabaseIfNeeded();

  const activeDatabaseInfo = await FileSystem.getInfoAsync(getActiveDatabasePath());

  if (!activeDatabaseInfo.exists) {
    throw new StorageSetupRequiredError(
      "No active database package is available. Import a database or initialize an empty one first.",
    );
  }

  return initializeExistingActivePackage();
}

export async function initializeEmptyActivePackage(): Promise<BootstrapStatus> {
  await ensureActivePackageDirectoriesExist();
  return initializeExistingActivePackage();
}

async function initializeExistingActivePackage(): Promise<BootstrapStatus> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const rootDirectory = getActiveDatabaseDirectory();
  await ensureActivePackageDirectoriesExist();
  const database = await openDatabaseAsync(storagePlan.databaseName, undefined, rootDirectory);

  await initializeActivePackageDatabase(database);
  const structuredTableCount = await countStructuredTables(database);
  await database.closeAsync();
  await writeBootstrapManifest();

  return {
    databaseName: storagePlan.databaseName,
    fileCollectionCount: storagePlan.overview.collectionCount,
    fileVaultRoot: storagePlan.fileVaultRoot,
    platformCount: supportedPlatforms.length,
    status: "ready",
    structuredTableCount,
    summary: "SQLite tables, derived views, and evidence-vault directories are provisioned locally.",
  };
}

export async function ensureActivePackageDirectoriesExist(): Promise<void> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const rootDirectory = getActiveDatabaseDirectory();
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
}

export async function writeBootstrapManifest(): Promise<void> {
  const rootDirectory = getActiveDatabaseDirectory();
  const bootstrapManifest = `${rootDirectory}/bootstrap-manifest.json`;
  await FileSystem.writeAsStringAsync(
    bootstrapManifest,
    JSON.stringify(createLocalStorageBootstrapManifest(), null, 2),
  );
}

export async function migrateLegacyDatabaseIfNeeded(): Promise<void> {
  const activeDatabasePath = getActiveDatabasePath();
  const activeDatabaseInfo = await FileSystem.getInfoAsync(activeDatabasePath);

  if (activeDatabaseInfo.exists) {
    return;
  }

  const legacyDatabasePath = getLegacyDatabasePath();
  const legacyDatabaseInfo = await FileSystem.getInfoAsync(legacyDatabasePath);

  if (!legacyDatabaseInfo.exists) {
    return;
  }

  await ensureActivePackageDirectoriesExist();

  await FileSystem.copyAsync({
    from: legacyDatabasePath,
    to: activeDatabasePath,
  });

  await copyIfExists(`${legacyDatabasePath}-shm`, `${activeDatabasePath}-shm`);
  await copyIfExists(`${legacyDatabasePath}-wal`, `${activeDatabasePath}-wal`);
}

async function copyIfExists(source: string, destination: string): Promise<void> {
  const sourceInfo = await FileSystem.getInfoAsync(source);

  if (!sourceInfo.exists) {
    return;
  }

  await FileSystem.copyAsync({
    from: source,
    to: destination,
  });
}
