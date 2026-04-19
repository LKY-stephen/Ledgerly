import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import {
  createReadableStorageDatabase,
  structuredStoreContract,
  type StorageSqlValue,
} from "@ledgerly/storage";
import { validateDatabasePackageOrThrow } from "../src/storage/storage-package-integrity";

function createStorageDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");

  for (const pragma of structuredStoreContract.pragmas) {
    database.exec(pragma);
  }

  for (const statement of structuredStoreContract.schemaStatements) {
    database.exec(statement);
  }

  for (const statement of structuredStoreContract.maintenanceStatements) {
    database.exec(statement);
  }

  return database;
}

function createReadableDatabase(database: DatabaseSync) {
  return createReadableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
  });
}

function seedEvidencePath(database: DatabaseSync, relativePath: string) {
  database.prepare(
    `INSERT INTO entities (
      entity_id,
      legal_name,
      entity_type,
      base_currency,
      default_timezone,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
  ).run("entity-main", "Ledgerly Main Entity", "sole_proprietorship", "USD", "UTC", "2026-04-01T00:00:00.000Z");
  database.prepare(
    `INSERT INTO evidences (
      evidence_id,
      entity_id,
      evidence_kind,
      file_path,
      parse_status,
      extracted_data,
      captured_date,
      captured_amount_cents,
      captured_source,
      captured_target,
      captured_description,
      source_system,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  ).run(
    "evidence-1",
    "entity-main",
    "document",
    relativePath,
    "pending",
    null,
    "2026-04-01",
    0,
    "",
    "",
    "",
    "test",
    "2026-04-01T00:00:00.000Z",
  );
  database.prepare(
    `INSERT INTO evidence_files (
      evidence_file_id,
      evidence_id,
      vault_collection,
      relative_path,
      original_file_name,
      mime_type,
      size_bytes,
      sha256_hex,
      captured_at,
      is_primary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  ).run(
    "evidence-file-1",
    "evidence-1",
    "evidence-objects",
    relativePath,
    "receipt.pdf",
    "application/pdf",
    100,
    "abc123",
    "2026-04-01T00:00:00.000Z",
    1,
  );
}

const tempDirectories: string[] = [];

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      await rm(directory, { force: true, recursive: true });
    }
  }
});

describe("storage package integrity", () => {
  it("accepts evidence files stored under the active package root", async () => {
    const database = createStorageDatabase();
    const packageRoot = mkdtempSync(join(tmpdir(), "ledgerly-package-"));
    const relativePath = "evidence-objects/entity-main/uploads/2026/04/receipt.pdf";
    tempDirectories.push(packageRoot);
    mkdirSync(join(packageRoot, "evidence-objects/entity-main/uploads/2026/04"), {
      recursive: true,
    });
    writeFileSync(join(packageRoot, relativePath), "receipt");
    seedEvidencePath(database, relativePath);

    const result = await validateDatabasePackageOrThrow({
      database: createReadableDatabase(database),
      packageRoot,
      pathExists: async (absolutePath) => existsSync(absolutePath),
    });

    expect(result.checkedPathCount).toBe(1);
  });

  it("rejects relative paths that escape the package root", async () => {
    const database = createStorageDatabase();
    const packageRoot = mkdtempSync(join(tmpdir(), "ledgerly-package-"));
    tempDirectories.push(packageRoot);
    seedEvidencePath(database, "../outside.pdf");

    await expect(
      validateDatabasePackageOrThrow({
        database: createReadableDatabase(database),
        packageRoot,
        pathExists: async () => true,
      }),
    ).rejects.toThrow("cannot escape");
  });

  it("rejects missing evidence files", async () => {
    const database = createStorageDatabase();
    const packageRoot = mkdtempSync(join(tmpdir(), "ledgerly-package-"));
    tempDirectories.push(packageRoot);
    seedEvidencePath(database, "evidence-objects/entity-main/uploads/2026/04/missing.pdf");

    await expect(
      validateDatabasePackageOrThrow({
        database: createReadableDatabase(database),
        packageRoot,
        pathExists: async () => false,
      }),
    ).rejects.toThrow("missing required evidence");
  });
});
