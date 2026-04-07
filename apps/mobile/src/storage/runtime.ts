import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import { initializeActivePackageDatabase } from "./active-database.native";
import { bootstrapLocalStorage } from "./bootstrap";
import { getActiveDatabaseDirectory } from "./package-environment.native";
import { createWritableStorageDatabase } from "./storage-adapter";

let databasePromise: Promise<SQLiteDatabase> | null = null;
let bootstrapPromise: Promise<void> | null = null;

export async function ensureLocalStorageReady(): Promise<void> {
  bootstrapPromise ??= bootstrapLocalStorage().then(() => undefined);
  await bootstrapPromise;
}

export async function getSQLiteDatabase(): Promise<SQLiteDatabase> {
  await ensureLocalStorageReady();

  databasePromise ??= createActiveDatabaseConnection();

  return databasePromise;
}

export async function withWritableLocalDatabase<T>(
  runner: (input: { database: SQLiteDatabase; writableDatabase: ReturnType<typeof createWritableStorageDatabase> }) => Promise<T>,
): Promise<T> {
  const database = await getSQLiteDatabase();
  const writableDatabase = createWritableStorageDatabase(database);
  return runner({ database, writableDatabase });
}

export async function resetLocalStorageRuntime(): Promise<void> {
  const activeDatabasePromise = databasePromise;
  databasePromise = null;
  bootstrapPromise = null;

  if (!activeDatabasePromise) {
    return;
  }

  const activeDatabase = await activeDatabasePromise.catch(() => null);
  await activeDatabase?.closeAsync();
}

async function createActiveDatabaseConnection(): Promise<SQLiteDatabase> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const database = await openDatabaseAsync(storagePlan.databaseName, undefined, getActiveDatabaseDirectory());

  try {
    await initializeActivePackageDatabase(database);

    return database;
  } catch (error) {
    await database.closeAsync().catch(() => undefined);
    databasePromise = null;
    throw error;
  }
}
