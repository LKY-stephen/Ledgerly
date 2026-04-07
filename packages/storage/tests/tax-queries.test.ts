import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  buildTaxYearDateRange,
  createReadableStorageDatabase,
  loadEntityLegalName,
  loadScheduleCAggregation,
  loadScheduleCCandidateRecords,
  loadScheduleSEPreview,
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

function seedTaxQueryFixture(
  database: DatabaseSync,
  options?: {
    accountingMethod?: "accrual" | "cash";
    includeReviewRow?: boolean;
  },
): void {
  const accountingMethod = options?.accountingMethod ?? "cash";
  const includeReviewRow = options?.includeReviewRow ?? false;

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
      "Scoped Tax Demo Books",
      "sole_proprietorship",
      "USD",
      "America/Los_Angeles",
      "2025-01-01T08:00:00.000Z",
    );
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
      "entity-other",
      "Other Books",
      "sole_proprietorship",
      "USD",
      "America/New_York",
      "2025-01-02T08:00:00.000Z",
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
      accountingMethod,
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
    "income-2025",
    "entity-main",
    "posted",
    "tax-query-test",
    "December payout",
    "2025-12-31",
    "USD",
    100_000,
    "YouTube",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2025-12-31T09:00:00.000Z",
    "2025-12-31T09:05:00.000Z",
  );
  insertRecord.run(
    "income-2026",
    "entity-main",
    "posted",
    "tax-query-test",
    "January payout",
    "2026-01-15",
    "USD",
    250_000,
    "YouTube",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2026-01-15T09:00:00.000Z",
    "2026-01-15T09:05:00.000Z",
  );
  insertRecord.run(
    "expense-2026-partv",
    "entity-main",
    "posted",
    "tax-query-test",
    "Studio props",
    "2026-03-05",
    "USD",
    45_000,
    "Business checking",
    "Prop store",
    "expense",
    "line27a",
    10_000,
    "2026-03-05T09:00:00.000Z",
    "2026-03-05T09:05:00.000Z",
  );
  insertRecord.run(
    "income-other-entity",
    "entity-other",
    "posted",
    "tax-query-test",
    "Other entity payout",
    "2026-02-01",
    "USD",
    999_999,
    "YouTube",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2026-02-01T09:00:00.000Z",
    "2026-02-01T09:05:00.000Z",
  );

  if (includeReviewRow) {
    insertRecord.run(
      "expense-2026-review",
      "entity-main",
      "posted",
      "tax-query-test",
      "Foreign currency expense",
      "2026-02-01",
      "EUR",
      5_000,
      "Business checking",
      "Foreign vendor",
      "expense",
      "line18",
      10_000,
      "2026-02-01T09:00:00.000Z",
      "2026-02-01T09:05:00.000Z",
    );
  }
}

describe("tax query helpers", () => {
  it("builds stable calendar-year ranges and loads the scoped legal name", async () => {
    const database = createStorageDatabase();
    seedTaxQueryFixture(database);
    const readableDatabase = createReadableDatabase(database);

    expect(buildTaxYearDateRange(2026)).toEqual({
      endExclusiveOn: "2027-01-01",
      startOn: "2026-01-01",
    });
    await expect(loadEntityLegalName(readableDatabase, "entity-main")).resolves.toBe(
      "Scoped Tax Demo Books",
    );
  });

  it("filters Schedule C candidates by entity and tax year", async () => {
    const database = createStorageDatabase();
    seedTaxQueryFixture(database, { includeReviewRow: true });
    const readableDatabase = createReadableDatabase(database);
    const candidates = await loadScheduleCCandidateRecords(readableDatabase, {
      entityId: "entity-main",
      taxYear: 2026,
    });

    expect(candidates.map((candidate) => candidate.recordId)).toEqual([
      "income-2026",
      "expense-2026-review",
      "expense-2026-partv",
    ]);
  });

  it("derives Schedule C aggregation and Schedule SE preview from one shared scope", async () => {
    const database = createStorageDatabase();
    seedTaxQueryFixture(database);
    const readableDatabase = createReadableDatabase(database);
    const aggregation = await loadScheduleCAggregation(readableDatabase, {
      entityId: "entity-main",
      taxYear: 2026,
    });
    const preview = await loadScheduleSEPreview(readableDatabase, {
      entityId: "entity-main",
      taxYear: 2026,
    });

    expect(aggregation.lineAmounts.line1?.amountCents).toBe(250_000);
    expect(aggregation.lineAmounts.line27a?.amountCents).toBe(45_000);
    expect(preview).toMatchObject({
      currency: "USD",
      deductibleExpensesCents: 45_000,
      grossReceiptsCents: 250_000,
      netProfitCents: 205_000,
    });
  });

  it("rejects unsupported accounting methods from tax_year_profiles", async () => {
    const database = createStorageDatabase();
    seedTaxQueryFixture(database, { accountingMethod: "accrual" });
    const readableDatabase = createReadableDatabase(database);

    await expect(
      loadScheduleCCandidateRecords(readableDatabase, {
        entityId: "entity-main",
        taxYear: 2026,
      }),
    ).rejects.toThrow(/Only cash accounting_method is supported/);
  });
});
