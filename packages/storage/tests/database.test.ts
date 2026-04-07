import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  buildRecordDateRangeSearch,
  createReadableStorageDatabase,
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

function seedRecordSearchFixture(database: DatabaseSync): void {
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
      "Scoped Search Demo Books",
      "sole_proprietorship",
      "USD",
      "America/Los_Angeles",
      "2026-01-01T08:00:00.000Z",
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
      "Other Search Demo Books",
      "sole_proprietorship",
      "USD",
      "America/New_York",
      "2026-01-02T08:00:00.000Z",
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
    "income-jan",
    "entity-main",
    "posted",
    "database-test",
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
    "income-feb",
    "entity-main",
    "posted",
    "database-test",
    "February payout",
    "2026-02-20",
    "USD",
    175_000,
    "YouTube",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2026-02-20T09:00:00.000Z",
    "2026-02-20T09:05:00.000Z",
  );
  insertRecord.run(
    "expense-mar",
    "entity-main",
    "reconciled",
    "database-test",
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
    "income-apr",
    "entity-main",
    "posted",
    "database-test",
    "April payout",
    "2026-04-01",
    "USD",
    300_000,
    "YouTube",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2026-04-01T09:00:00.000Z",
    "2026-04-01T09:05:00.000Z",
  );
  insertRecord.run(
    "expense-no-tax",
    "entity-main",
    "posted",
    "database-test",
    "Missing tax line",
    "2026-02-02",
    "USD",
    5_000,
    "Business checking",
    "Vendor",
    "expense",
    null,
    10_000,
    "2026-02-02T09:00:00.000Z",
    "2026-02-02T09:05:00.000Z",
  );
  insertRecord.run(
    "draft-income",
    "entity-main",
    "draft",
    "database-test",
    "Draft payout",
    "2026-02-10",
    "USD",
    999_999,
    "YouTube",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2026-02-10T09:00:00.000Z",
    "2026-02-10T09:05:00.000Z",
  );
  insertRecord.run(
    "income-other-entity",
    "entity-other",
    "posted",
    "database-test",
    "Other entity payout",
    "2026-02-01",
    "USD",
    777_777,
    "YouTube",
    "Business checking",
    "income",
    "line1",
    10_000,
    "2026-02-01T09:00:00.000Z",
    "2026-02-01T09:05:00.000Z",
  );
}

describe("storage database date-range search", () => {
  it("filters records by entity, inclusive range, statuses, kinds, and caller where clauses", async () => {
    const database = createStorageDatabase();
    seedRecordSearchFixture(database);
    const readableDatabase = createReadableDatabase(database);
    const rows = await readableDatabase.searchRecordsByDateRangeAsync<{
      amountCents: number;
      recordId: string;
    }>({
      dateRange: {
        endOn: "2026-03-31",
        startOn: "2026-01-01",
      },
      entityId: "entity-main",
      orderBy: "r.occurred_on ASC, r.record_id ASC",
      recordKinds: ["income", "expense"],
      recordStatuses: ["posted", "reconciled"],
      select: `r.record_id AS recordId,
        r.amount_cents AS amountCents`,
      where: "COALESCE(r.tax_line_code, '') <> ''",
    });

    expect(rows).toEqual([
      { amountCents: 250_000, recordId: "income-jan" },
      { amountCents: 175_000, recordId: "income-feb" },
      { amountCents: 45_000, recordId: "expense-mar" },
    ]);
  });

  it("supports start-inclusive and end-exclusive ranges for aggregate first-row queries", async () => {
    const database = createStorageDatabase();
    seedRecordSearchFixture(database);
    const readableDatabase = createReadableDatabase(database);
    const row = await readableDatabase.searchFirstRecordsByDateRangeAsync<{
      totalCents: number | null;
    }>({
      dateRange: {
        endExclusiveOn: "2026-04-01",
        startOn: "2026-01-01",
      },
      entityId: "entity-main",
      recordKinds: ["income"],
      recordStatuses: ["posted"],
      select: "COALESCE(SUM(r.amount_cents), 0) AS totalCents",
    });

    expect(row?.totalCents).toBe(425_000);
  });

  it("rejects conflicting end bounds before executing the query", () => {
    expect(() =>
      buildRecordDateRangeSearch({
        dateRange: {
          endExclusiveOn: "2026-04-01",
          endOn: "2026-03-31",
          startOn: "2026-01-01",
        },
        entityId: "entity-main",
        select: "r.record_id AS recordId",
      }),
    ).toThrow("cannot specify both endOn and endExclusiveOn");
  });
});
