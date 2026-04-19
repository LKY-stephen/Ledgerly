import * as FileSystem from "expo-file-system/legacy";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  createReadableStorageDatabase,
  type StorageSqlValue,
} from "@ledgerly/storage";

import { initializeLocalDatabase } from "./database";
import {
  classifyDatabaseTableCompatibility,
  validateDatabasePackageOrThrow,
  type DatabaseTableCompatibilityResult,
} from "./storage-package-integrity";
import { getActivePackageRootDirectory } from "./package-environment.native";

export async function initializeActivePackageDatabase(database: SQLiteDatabase): Promise<void> {
  await initializeLocalDatabase(database);

  const compatibility = await loadDatabaseTableCompatibility(database);

  if (compatibility.tableCompatibility === "unsupported") {
    throw new Error(
      `The active database package is missing required CFO tables: ${compatibility.missingLegacyTables.join(", ")}.`,
    );
  }

  await ensureEvidenceColumns(database);
  await cleanupOrphanedEvidenceFilePaths(database);
  await validateDatabasePackageOrThrow({
    database: createReadableDatabaseView(database),
    packageRoot: getActivePackageRootDirectory(),
    pathExists: async (absolutePath: string) => {
      const info = await FileSystem.getInfoAsync(absolutePath);
      return info.exists;
    },
    tableCompatibility: "current_only",
  });
}

export async function loadDatabaseTableCompatibility(
  database: SQLiteDatabase,
): Promise<DatabaseTableCompatibilityResult> {
  const tableRows = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;",
  );

  return classifyDatabaseTableCompatibility(tableRows.map((row) => row.name));
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
