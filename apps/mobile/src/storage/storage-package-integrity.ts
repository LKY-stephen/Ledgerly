import { structuredStoreContract, type ReadableStorageDatabase } from "@creator-cfo/storage";

import { buildPackageAbsolutePath } from "./package-paths";

interface EvidenceFileRow {
  relativePath: string;
}

interface EvidenceRow {
  filePath: string;
}

interface SqliteMasterRow {
  name: string;
}

export interface DatabasePackageValidationInput {
  database: ReadableStorageDatabase;
  packageRoot: string;
  pathExists: (absolutePath: string) => Promise<boolean>;
}

export interface DatabasePackageValidationResult {
  checkedPathCount: number;
  requiredTableCount: number;
}

export async function validateDatabasePackageOrThrow(
  input: DatabasePackageValidationInput,
): Promise<DatabasePackageValidationResult> {
  const { database, packageRoot, pathExists } = input;
  const tableRows = await database.getAllAsync<SqliteMasterRow>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC;",
  );
  const tableNames = new Set(tableRows.map((row) => row.name));
  const missingTables = structuredStoreContract.tables
    .map((table) => table.name)
    .filter((name) => !tableNames.has(name));

  if (missingTables.length > 0) {
    throw new Error(
      `The selected database is missing required CFO tables: ${missingTables.join(", ")}.`,
    );
  }

  const evidenceFiles = await database.getAllAsync<EvidenceFileRow>(
    `SELECT relative_path AS relativePath
     FROM evidence_files
     ORDER BY relative_path ASC;`,
  );
  const evidenceRows = await database.getAllAsync<EvidenceRow>(
    `SELECT file_path AS filePath
     FROM evidences
     WHERE LENGTH(TRIM(COALESCE(file_path, ''))) > 0
     ORDER BY file_path ASC;`,
  );
  const relativePaths = new Set<string>();

  for (const row of evidenceFiles) {
    relativePaths.add(row.relativePath);
  }

  for (const row of evidenceRows) {
    relativePaths.add(row.filePath);
  }

  for (const relativePath of relativePaths) {
    const absolutePath = buildPackageAbsolutePath(packageRoot, relativePath);
    const exists = await pathExists(absolutePath);

    if (!exists) {
      throw new Error(`The database package is missing required evidence at ${relativePath}.`);
    }
  }

  return {
    checkedPathCount: relativePaths.size,
    requiredTableCount: structuredStoreContract.tables.length,
  };
}
