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
  tableCompatibility?: "current_only" | "current_or_legacy";
}

export interface DatabasePackageValidationResult {
  checkedPathCount: number;
  requiredTableCount: number;
  tableCompatibility: DatabaseTableCompatibility;
}

export type DatabaseTableCompatibility = "current" | "legacy" | "unsupported";

export interface DatabaseTableCompatibilityResult {
  missingCurrentTables: string[];
  missingLegacyTables: string[];
  tableCompatibility: DatabaseTableCompatibility;
}

export const legacyStructuredTableNames = [
  "entities",
  "counterparties",
  "records",
  "record_entry_classifications",
  "tax_year_profiles",
  "evidences",
  "evidence_files",
  "record_evidence_links",
] as const;

export function classifyDatabaseTableCompatibility(
  tableNames: Iterable<string>,
): DatabaseTableCompatibilityResult {
  const normalizedTableNames = new Set(tableNames);
  const missingCurrentTables = structuredStoreContract.tables
    .map((table) => table.name)
    .filter((name) => !normalizedTableNames.has(name));
  const missingLegacyTables = legacyStructuredTableNames.filter(
    (name) => !normalizedTableNames.has(name),
  );
  const tableCompatibility: DatabaseTableCompatibility =
    missingCurrentTables.length === 0
      ? "current"
      : missingLegacyTables.length === 0
        ? "legacy"
        : "unsupported";

  return {
    missingCurrentTables,
    missingLegacyTables: [...missingLegacyTables],
    tableCompatibility,
  };
}

export async function validateDatabasePackageOrThrow(
  input: DatabasePackageValidationInput,
): Promise<DatabasePackageValidationResult> {
  const {
    database,
    packageRoot,
    pathExists,
    tableCompatibility: requestedTableCompatibility = "current_only",
  } = input;
  const tableRows = await database.getAllAsync<SqliteMasterRow>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC;",
  );
  const tableNames = new Set(tableRows.map((row) => row.name));
  const compatibility = classifyDatabaseTableCompatibility(tableNames);
  const acceptsLegacy =
    requestedTableCompatibility === "current_or_legacy" &&
    compatibility.tableCompatibility === "legacy";

  if (compatibility.tableCompatibility === "unsupported") {
    throw new Error(
      `The selected database is missing required CFO tables: ${compatibility.missingLegacyTables.join(", ")}.`,
    );
  }

  if (compatibility.tableCompatibility === "legacy" && !acceptsLegacy) {
    throw new Error(
      `The selected database is missing required CFO tables: ${compatibility.missingCurrentTables.join(", ")}.`,
    );
  }

  const evidenceFiles = await database.getAllAsync<EvidenceFileRow>(
    `SELECT relative_path AS relativePath
     FROM evidence_files
     WHERE LENGTH(TRIM(COALESCE(relative_path, ''))) > 0
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
    tableCompatibility: compatibility.tableCompatibility,
  };
}
