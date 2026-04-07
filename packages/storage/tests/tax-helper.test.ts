import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  createReadableStorageDatabase,
  loadTaxHelperEvidenceFileLinks,
  loadTaxHelperSnapshot,
  structuredStoreContract,
  type StorageSqlValue,
} from "../src/index";

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

function seedTaxHelperFixture(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO entities (
        entity_id,
        legal_name,
        entity_type,
        base_currency,
        default_timezone,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
    )
    .run(
      "entity-main",
      "Tax Helper Books",
      "sole_proprietorship",
      "USD",
      "America/Los_Angeles",
      "2026-01-01T08:00:00.000Z",
    );

  database
    .prepare(
      `INSERT INTO tax_year_profiles (
        entity_id,
        tax_year,
        accounting_method,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?);`,
    )
    .run(
      "entity-main",
      2026,
      "cash",
      "2026-01-01T08:00:00.000Z",
      "2026-01-01T08:00:00.000Z",
    );

  const insertRecord = database.prepare(
    `INSERT INTO records (
      record_id,
      entity_id,
      record_status,
      source_system,
      description,
      occurred_on,
      currency,
      amount_cents,
      source_label,
      target_label,
      record_kind,
      tax_line_code,
      business_use_bps,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );

  insertRecord.run(
    "income-2026",
    "entity-main",
    "posted",
    "tax-helper-test",
    "Brand sponsorship",
    "2026-01-15",
    "USD",
    250_000,
    "Sponsor",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2026-01-15T08:00:00.000Z",
    "2026-01-15T08:01:00.000Z",
  );
  insertRecord.run(
    "expense-2026",
    "entity-main",
    "reconciled",
    "tax-helper-test",
    "Office subscription",
    "2026-02-20",
    "USD",
    50_000,
    "Business checking",
    "Adobe",
    "expense",
    "line18",
    10_000,
    "2026-02-20T08:00:00.000Z",
    "2026-02-20T08:01:00.000Z",
  );
  insertRecord.run(
    "partv-2026",
    "entity-main",
    "posted",
    "tax-helper-test",
    "Studio props",
    "2026-03-18",
    "USD",
    12_500,
    "Business checking",
    "Prop store",
    "expense",
    "line27a",
    10_000,
    "2026-03-18T08:00:00.000Z",
    "2026-03-18T08:01:00.000Z",
  );
  insertRecord.run(
    "unmapped-2026",
    "entity-main",
    "posted",
    "tax-helper-test",
    "Unmapped travel note",
    "2026-04-10",
    "USD",
    9_999,
    "Business checking",
    "Unknown vendor",
    "expense",
    null,
    10_000,
    "2026-04-10T08:00:00.000Z",
    "2026-04-10T08:01:00.000Z",
  );

  const insertEvidence = database.prepare(
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
  );

  insertEvidence.run(
    "evidence-income",
    "entity-main",
    "receipt",
    "",
    "parsed",
    null,
    "2026-01-15",
    250_000,
    "Sponsor",
    "Business checking",
    "Brand sponsorship",
    "tax-helper-test",
    "2026-01-15T08:00:00.000Z",
  );
  insertEvidence.run(
    "evidence-expense",
    "entity-main",
    "receipt",
    "",
    "parsed",
    null,
    "2026-02-20",
    50_000,
    "Business checking",
    "Adobe",
    "Office subscription",
    "tax-helper-test",
    "2026-02-20T08:00:00.000Z",
  );
  insertEvidence.run(
    "evidence-income-old-year",
    "entity-main",
    "receipt",
    "",
    "parsed",
    null,
    "2025-12-30",
    250_000,
    "Sponsor",
    "Business checking",
    "Prior year statement",
    "tax-helper-test",
    "2025-12-30T08:00:00.000Z",
  );

  const insertEvidenceFile = database.prepare(
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
  );

  insertEvidenceFile.run(
    "file-income",
    "evidence-income",
    "evidence-objects",
    "evidence-objects/entity-main/uploads/2026/01/income.pdf",
    "income.pdf",
    "application/pdf",
    1000,
    "a".repeat(64),
    "2026-01-15T08:00:00.000Z",
    1,
  );
  insertEvidenceFile.run(
    "file-expense",
    "evidence-expense",
    "evidence-objects",
    "evidence-objects/entity-main/uploads/2026/02/expense.pdf",
    "expense.pdf",
    "application/pdf",
    1001,
    "b".repeat(64),
    "2026-02-20T08:00:00.000Z",
    1,
  );
  insertEvidenceFile.run(
    "file-income-old-year",
    "evidence-income-old-year",
    "evidence-objects",
    "evidence-objects/entity-main/uploads/2025/12/income-old-year.pdf",
    "income-old-year.pdf",
    "application/pdf",
    1002,
    "c".repeat(64),
    "2025-12-30T08:00:00.000Z",
    1,
  );

  const insertLink = database.prepare(
    `INSERT INTO record_evidence_links (
      record_id,
      evidence_id,
      link_role,
      is_primary,
      created_at
    ) VALUES (?, ?, ?, ?, ?);`,
  );

  insertLink.run(
    "income-2026",
    "evidence-income",
    "supporting",
    1,
    "2026-01-15T08:00:00.000Z",
  );
  insertLink.run(
    "expense-2026",
    "evidence-expense",
    "supporting",
    1,
    "2026-02-20T08:00:00.000Z",
  );
  insertLink.run(
    "income-2026",
    "evidence-income-old-year",
    "supporting",
    0,
    "2026-01-15T08:00:00.000Z",
  );
}

describe("tax helper", () => {
  it("builds derived rows and exportable record ids from authoritative local tax support", async () => {
    const database = createStorageDatabase();
    seedTaxHelperFixture(database);
    const readableDatabase = createReadableDatabase(database);

    const snapshot = await loadTaxHelperSnapshot(readableDatabase, {
      entityId: "entity-main",
      taxYear: 2026,
    });

    expect(snapshot.businessRecordCount).toBe(4);
    expect(snapshot.mappedRecordCount).toBe(3);
    expect(snapshot.derivedFields.map((field) => field.fieldId)).toEqual([
      "schedule-c-line1",
      "schedule-c-line18",
      "schedule-c-line27b",
      "schedule-c-line48",
      "schedule-se-line2",
    ]);
    expect(snapshot.derivedFields.map((field) => field.ledgerImpliedValue)).toEqual([
      "$2,500.00",
      "$500.00",
      "$125.00",
      "$125.00",
      "$1,875.00",
    ]);
    expect(snapshot.exportableRecordIds).toEqual([
      "income-2026",
      "expense-2026",
      "partv-2026",
    ]);
    expect(snapshot.notices).toEqual([]);
  });

  it("loads evidence file links only for contributing record ids", async () => {
    const database = createStorageDatabase();
    seedTaxHelperFixture(database);
    const readableDatabase = createReadableDatabase(database);

    const links = await loadTaxHelperEvidenceFileLinks(readableDatabase, {
      recordIds: ["income-2026", "expense-2026"],
      taxYear: 2026,
    });

    expect(links).toEqual([
      {
        evidenceFileId: "file-expense",
        evidenceId: "evidence-expense",
        mimeType: "application/pdf",
        originalFileName: "expense.pdf",
        recordId: "expense-2026",
        relativePath: "evidence-objects/entity-main/uploads/2026/02/expense.pdf",
        vaultCollection: "evidence-objects",
      },
      {
        evidenceFileId: "file-income",
        evidenceId: "evidence-income",
        mimeType: "application/pdf",
        originalFileName: "income.pdf",
        recordId: "income-2026",
        relativePath: "evidence-objects/entity-main/uploads/2026/01/income.pdf",
        vaultCollection: "evidence-objects",
      },
    ]);
  });

  it("excludes linked evidence whose captured date falls outside the selected tax year", async () => {
    const database = createStorageDatabase();
    seedTaxHelperFixture(database);
    const readableDatabase = createReadableDatabase(database);

    const links = await loadTaxHelperEvidenceFileLinks(readableDatabase, {
      recordIds: ["income-2026"],
      taxYear: 2026,
    });

    expect(links.map((link) => link.evidenceFileId)).toEqual(["file-income"]);
  });
});
