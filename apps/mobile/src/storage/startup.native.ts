import * as FileSystem from "expo-file-system/legacy";
import { openDatabaseAsync } from "expo-sqlite";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import { loadDatabaseTableCompatibility } from "./active-database.native";
import { initializeEmptyActivePackage, migrateLegacyDatabaseIfNeeded } from "./bootstrap";
import {
  getActiveDatabasePath,
  getActivePackageRootDirectory,
  getPackageBackupDirectory,
  getPackageMigrationBackupDirectory,
} from "./package-environment.native";
import { joinPathSegments } from "./package-paths";
import { getSQLiteDatabase, resetLocalStorageRuntime } from "./runtime";

export type StorageGateState =
  | { kind: "missing" }
  | { kind: "ready" }
  | { kind: "recovery_required"; message: string };

export async function inspectStorageGateState(): Promise<StorageGateState> {
  await resetLocalStorageRuntime();
  await migrateLegacyDatabaseIfNeeded();

  const activeDatabaseInfo = await FileSystem.getInfoAsync(getActiveDatabasePath());

  if (!activeDatabaseInfo.exists) {
    return { kind: "missing" };
  }

  let shouldBackupForMigration = false;

  try {
    const compatibility = await loadActiveDatabaseCompatibility();
    shouldBackupForMigration = compatibility.tableCompatibility === "legacy";

    if (shouldBackupForMigration) {
      await backupActiveDatabaseFilesForMigration();
    }

    await getSQLiteDatabase();
    await resetLocalStorageRuntime();

    return { kind: "ready" };
  } catch (error) {
    await resetLocalStorageRuntime();

    if (shouldBackupForMigration) {
      await restoreActiveDatabaseFilesFromMigrationBackup();
      await resetLocalStorageRuntime();
    }

    return {
      kind: "recovery_required",
      message: error instanceof Error ? error.message : "Storage setup failed.",
    };
  } finally {
    if (shouldBackupForMigration) {
      await removeIfExists(getPackageMigrationBackupDirectory());
    }
  }
}

export async function initializeEmptyStorageFromSetup(): Promise<void> {
  await resetLocalStorageRuntime();

  const activePackageRoot = getActivePackageRootDirectory();
  const backupPackageRoot = getPackageBackupDirectory();
  const activePackageInfo = await FileSystem.getInfoAsync(activePackageRoot);

  await removeIfExists(backupPackageRoot);

  if (activePackageInfo.exists) {
    await FileSystem.moveAsync({
      from: activePackageRoot,
      to: backupPackageRoot,
    });
  }

  try {
    await initializeEmptyActivePackage();
    await resetLocalStorageRuntime();
  } catch (error) {
    await resetLocalStorageRuntime();
    await removeIfExists(activePackageRoot);

    const backupInfo = await FileSystem.getInfoAsync(backupPackageRoot);

    if (backupInfo.exists) {
      await FileSystem.moveAsync({
        from: backupPackageRoot,
        to: activePackageRoot,
      });
    }

    throw error;
  }
}

async function loadActiveDatabaseCompatibility() {
  const storagePlan = getLocalStorageBootstrapPlan();
  const database = await openDatabaseAsync(
    storagePlan.databaseName,
    { useNewConnection: true },
    getActivePackageRootDirectory(),
  );

  try {
    return await loadDatabaseTableCompatibility(database);
  } finally {
    await database.closeAsync().catch(() => undefined);
  }
}

async function backupActiveDatabaseFilesForMigration(): Promise<void> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const activeDatabasePath = getActiveDatabasePath();
  const backupDirectory = getPackageMigrationBackupDirectory();
  const backupDatabasePath = joinPathSegments(backupDirectory, storagePlan.databaseName);

  await removeIfExists(backupDirectory);
  await FileSystem.makeDirectoryAsync(backupDirectory, { intermediates: true });
  await copyIfExists(activeDatabasePath, backupDatabasePath);
  await copyIfExists(`${activeDatabasePath}-shm`, `${backupDatabasePath}-shm`);
  await copyIfExists(`${activeDatabasePath}-wal`, `${backupDatabasePath}-wal`);
}

async function restoreActiveDatabaseFilesFromMigrationBackup(): Promise<void> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const activeDatabasePath = getActiveDatabasePath();
  const backupDatabasePath = joinPathSegments(
    getPackageMigrationBackupDirectory(),
    storagePlan.databaseName,
  );

  await removeIfExists(activeDatabasePath);
  await removeIfExists(`${activeDatabasePath}-shm`);
  await removeIfExists(`${activeDatabasePath}-wal`);
  await copyIfExists(backupDatabasePath, activeDatabasePath);
  await copyIfExists(`${backupDatabasePath}-shm`, `${activeDatabasePath}-shm`);
  await copyIfExists(`${backupDatabasePath}-wal`, `${activeDatabasePath}-wal`);
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

async function removeIfExists(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);

  if (!info.exists) {
    return;
  }

  await FileSystem.deleteAsync(path, { idempotent: true });
}
