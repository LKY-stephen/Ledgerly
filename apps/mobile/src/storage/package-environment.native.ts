import * as FileSystem from "expo-file-system/legacy";
import { defaultDatabaseDirectory } from "expo-sqlite";
import {
  getLocalStorageBootstrapPlan,
  legacyFileVaultRootDirectories,
  legacyStructuredStoreDatabaseNames,
} from "@ledgerly/storage";

import { joinPathSegments } from "./package-paths";

export function getDocumentDirectoryOrThrow(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("Expo document directory is unavailable.");
  }

  return FileSystem.documentDirectory;
}

export function getCacheDirectoryOrThrow(): string {
  if (!FileSystem.cacheDirectory) {
    throw new Error("Expo cache directory is unavailable.");
  }

  return FileSystem.cacheDirectory;
}

export function getActivePackageRootDirectory(): string {
  const storagePlan = getLocalStorageBootstrapPlan();
  return joinPathSegments(getDocumentDirectoryOrThrow(), storagePlan.fileVaultRoot);
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}

export function getPackageRootDirectoryCandidates(): string[] {
  return uniquePaths([
    getActivePackageRootDirectory(),
    ...legacyFileVaultRootDirectories.map((rootDirectory) =>
      joinPathSegments(getDocumentDirectoryOrThrow(), rootDirectory)
    ),
  ]);
}

export function getPackageDatabasePathCandidates(packageRoot: string): string[] {
  const storagePlan = getLocalStorageBootstrapPlan();

  return uniquePaths(
    [storagePlan.databaseName, ...legacyStructuredStoreDatabaseNames].map(
      (databaseName) => joinPathSegments(packageRoot, databaseName),
    ),
  );
}

export function getActiveDatabaseDirectory(): string {
  return getActivePackageRootDirectory();
}

export function getActiveDatabasePath(): string {
  const storagePlan = getLocalStorageBootstrapPlan();
  return joinPathSegments(getActiveDatabaseDirectory(), storagePlan.databaseName);
}

export function getLegacyDatabaseDirectory(): string {
  return defaultDatabaseDirectory;
}

export function getLegacyDatabasePath(): string {
  const storagePlan = getLocalStorageBootstrapPlan();
  return joinPathSegments(getLegacyDatabaseDirectory(), storagePlan.databaseName);
}

export function getLegacyStandaloneDatabasePathCandidates(): string[] {
  const storagePlan = getLocalStorageBootstrapPlan();

  return uniquePaths(
    [storagePlan.databaseName, ...legacyStructuredStoreDatabaseNames].map(
      (databaseName) => joinPathSegments(getLegacyDatabaseDirectory(), databaseName),
    ),
  );
}

export function getPackageBackupDirectory(): string {
  const storagePlan = getLocalStorageBootstrapPlan();
  return joinPathSegments(getDocumentDirectoryOrThrow(), `${storagePlan.fileVaultRoot}-backup`);
}

export function getPackageMigrationBackupDirectory(): string {
  const storagePlan = getLocalStorageBootstrapPlan();
  return joinPathSegments(getDocumentDirectoryOrThrow(), `${storagePlan.fileVaultRoot}-migration-backup`);
}
