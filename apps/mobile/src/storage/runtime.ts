import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";

import { bootstrapLocalStorage } from "./bootstrap";
import { initializeLocalDatabase } from "./database";
import { createWritableStorageDatabase } from "./storage-adapter";

let databasePromise: Promise<SQLiteDatabase> | null = null;
let bootstrapPromise: Promise<void> | null = null;

export async function ensureLocalStorageReady(): Promise<void> {
  bootstrapPromise ??= bootstrapLocalStorage().then(() => undefined);
  await bootstrapPromise;
}

export async function getSQLiteDatabase(): Promise<SQLiteDatabase> {
  await ensureLocalStorageReady();

  databasePromise ??= openDatabaseAsync(getLocalStorageBootstrapPlan().databaseName).then(
    async (database) => {
      await initializeLocalDatabase(database);
      await ensureEvidenceColumns(database);
      return database;
    },
  );

  return databasePromise;
}

export async function withWritableLocalDatabase<T>(
  runner: (input: { database: SQLiteDatabase; writableDatabase: ReturnType<typeof createWritableStorageDatabase> }) => Promise<T>,
): Promise<T> {
  const database = await getSQLiteDatabase();
  const writableDatabase = createWritableStorageDatabase(database);
  return runner({ database, writableDatabase });
}

async function ensureEvidenceColumns(database: SQLiteDatabase): Promise<void> {
  const tableInfo = await database.getAllAsync<{ name: string }>("PRAGMA table_info(evidences);");
  const columns = new Set(tableInfo.map((column) => column.name));

  if (!columns.has("file_path")) {
    await database.execAsync("ALTER TABLE evidences ADD COLUMN file_path TEXT NOT NULL DEFAULT '';");
  }

  if (!columns.has("parse_status")) {
    await database.execAsync(
      "ALTER TABLE evidences ADD COLUMN parse_status TEXT NOT NULL DEFAULT 'pending';",
    );
  }

  if (!columns.has("extracted_data")) {
    await database.execAsync("ALTER TABLE evidences ADD COLUMN extracted_data TEXT;");
  }
}
