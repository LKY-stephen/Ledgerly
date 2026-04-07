import * as FileSystem from "expo-file-system/legacy";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  createReadableStorageDatabase,
  structuredStoreContract,
  type StorageSqlValue,
} from "@creator-cfo/storage";

import { initializeLocalDatabase } from "./database";
import { validateDatabasePackageOrThrow } from "./storage-package-integrity";
import { getActivePackageRootDirectory } from "./package-environment.native";

export async function initializeActivePackageDatabase(database: SQLiteDatabase): Promise<void> {
  const tableRows = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;",
  );
  const tableNames = new Set(tableRows.map((row) => row.name));

  if (tableNames.size > 0) {
    const missingTables = structuredStoreContract.tables
      .map((table) => table.name)
      .filter((name) => !tableNames.has(name));

    if (missingTables.length > 0) {
      throw new Error(
        `The active database package is missing required CFO tables: ${missingTables.join(", ")}.`,
      );
    }
  }

  await initializeLocalDatabase(database);
  await ensureEvidenceColumns(database);
  await cleanupOrphanedEvidenceFilePaths(database);
  await validateDatabasePackageOrThrow({
    database: createReadableDatabaseView(database),
    packageRoot: getActivePackageRootDirectory(),
    pathExists: async (absolutePath: string) => {
      const info = await FileSystem.getInfoAsync(absolutePath);
      return info.exists;
    },
  });
}

function createReadableDatabaseView(database: SQLiteDatabase) {
  return createReadableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getAllAsync<Row>(source, ...(params as []));
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getFirstAsync<Row>(source, ...(params as []));
    },
  });
}

async function cleanupOrphanedEvidenceFilePaths(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(
    `UPDATE evidences SET file_path = ''
     WHERE LENGTH(TRIM(COALESCE(file_path, ''))) > 0
       AND INSTR(file_path, '/') = 0;`,
  );
  await database.execAsync(
    `UPDATE evidence_files SET relative_path = ''
     WHERE LENGTH(TRIM(COALESCE(relative_path, ''))) > 0
       AND INSTR(relative_path, '/') = 0;`,
  );
}

export async function ensureEvidenceColumns(database: SQLiteDatabase): Promise<void> {
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
