import * as FileSystem from "expo-file-system/legacy";
import { defaultDatabaseDirectory } from "expo-sqlite";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

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

export function getPackageBackupDirectory(): string {
  const storagePlan = getLocalStorageBootstrapPlan();
  return joinPathSegments(getDocumentDirectoryOrThrow(), `${storagePlan.fileVaultRoot}-backup`);
}
