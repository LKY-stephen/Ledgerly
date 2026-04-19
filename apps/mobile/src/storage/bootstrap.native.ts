import * as FileSystem from "expo-file-system/legacy";
import { openDatabaseAsync } from "expo-sqlite";
import { supportedPlatforms } from "@ledgerly/schemas";
import {
  createLocalStorageBootstrapManifest,
  getLocalStorageBootstrapPlan,
} from "@ledgerly/storage";

import { initializeActivePackageDatabase } from "./active-database.native";
import { countStructuredTables } from "./database";
import {
  getActiveDatabaseDirectory,
  getActiveDatabasePath,
  getActivePackageRootDirectory,
  getLegacyStandaloneDatabasePathCandidates,
  getPackageDatabasePathCandidates,
  getPackageRootDirectoryCandidates,
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

  const migratedPackageRoot = await migrateLegacyPackageRootIfNeeded();

  if (migratedPackageRoot) {
    return;
  }

  const legacyDatabasePath = await findExistingPath(
    getLegacyStandaloneDatabasePathCandidates().filter(
      (path) => path !== activeDatabasePath,
    ),
  );

  if (!legacyDatabasePath) {
    return;
  }

  await ensureActivePackageDirectoriesExist();

  await FileSystem.copyAsync({
    from: legacyDatabasePath,
    to: activeDatabasePath,
  });

  await copyIfExists(`${legacyDatabasePath}-shm`, `${activeDatabasePath}-shm`);
  await copyIfExists(`${legacyDatabasePath}-wal`, `${activeDatabasePath}-wal`);
  await writeBootstrapManifest();
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

async function moveIfExists(source: string, destination: string): Promise<void> {
  const sourceInfo = await FileSystem.getInfoAsync(source);

  if (!sourceInfo.exists) {
    return;
  }

  await FileSystem.moveAsync({
    from: source,
    to: destination,
  });
}

async function findExistingPath(paths: string[]): Promise<string | null> {
  for (const path of paths) {
    const info = await FileSystem.getInfoAsync(path);

    if (info.exists) {
      return path;
    }
  }

  return null;
}

async function migrateLegacyPackageRootIfNeeded(): Promise<boolean> {
  const activePackageRoot = getActivePackageRootDirectory();
  const activeDatabasePath = getActiveDatabasePath();

  for (const candidateRoot of getPackageRootDirectoryCandidates()) {
    const candidateDatabasePath = await findExistingPath(
      getPackageDatabasePathCandidates(candidateRoot).filter(
        (path) => path !== activeDatabasePath,
      ),
    );

    if (!candidateDatabasePath) {
      continue;
    }

    if (candidateRoot !== activePackageRoot) {
      const activeRootInfo = await FileSystem.getInfoAsync(activePackageRoot);

      if (!activeRootInfo.exists) {
        await FileSystem.moveAsync({
          from: candidateRoot,
          to: activePackageRoot,
        });
      } else {
        await copyDirectoryRecursive(candidateRoot, activePackageRoot);
        await FileSystem.deleteAsync(candidateRoot, { idempotent: true });
      }
    }

    const migratedDatabasePath = await findExistingPath(
      getPackageDatabasePathCandidates(activePackageRoot),
    );

    if (migratedDatabasePath && migratedDatabasePath !== activeDatabasePath) {
      await moveIfExists(migratedDatabasePath, activeDatabasePath);
      await moveIfExists(`${migratedDatabasePath}-shm`, `${activeDatabasePath}-shm`);
      await moveIfExists(`${migratedDatabasePath}-wal`, `${activeDatabasePath}-wal`);
    }

    await ensureActivePackageDirectoriesExist();
    await writeBootstrapManifest();
    return true;
  }

  return false;
}

async function copyDirectoryRecursive(
  sourceDirectory: string,
  targetDirectory: string,
): Promise<void> {
  await FileSystem.makeDirectoryAsync(targetDirectory, { intermediates: true });
  const entries = await FileSystem.readDirectoryAsync(sourceDirectory);

  for (const entry of entries) {
    const sourcePath = `${sourceDirectory}/${entry}`;
    const targetPath = `${targetDirectory}/${entry}`;
    const sourceInfo = await FileSystem.getInfoAsync(sourcePath);

    if (sourceInfo.isDirectory) {
      await copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    await FileSystem.copyAsync({
      from: sourcePath,
      to: targetPath,
    });
  }
}
