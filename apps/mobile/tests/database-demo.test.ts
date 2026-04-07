import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  createWritableStorageDatabase,
  loadScheduleCAggregation,
  loadScheduleSEPreview,
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  structuredStoreContract,
  type StorageSqlValue,
} from "@creator-cfo/storage";

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

function createWritableDatabase(database: DatabaseSync) {
  return createWritableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
    async runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).run(...params);
    },
  });
}

async function createPopulatedV1Database() {
  const database = createStorageDatabase();
  const writableDatabase = createWritableDatabase(database);

  await writableDatabase.runAsync(
    `INSERT INTO entities (
      entity_id,
      legal_name,
      entity_type,
      base_currency,
      default_timezone,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
    "entity-main",
    "Creator CFO Demo Books",
    "sole_proprietorship",
    "USD",
    "America/Los_Angeles",
    "2026-03-01T08:00:00.000Z",
  );

  const incomeEntry = resolveStandardReceiptEntry(
    {
      amountCents: 12_500,
      currency: "USD",
      description: "YouTube payout 1",
      entityId: "entity-main",
      occurredOn: "2026-03-29",
      source: "YouTube",
      target: "Business checking",
      userClassification: "income",
    },
    {
      createdAt: "2026-03-29T09:00:00.000Z",
      recordId: "record-income",
      sourceSystem: "mobile-test",
      updatedAt: "2026-03-29T09:05:00.000Z",
    },
  );
  const expenseEntry = resolveStandardReceiptEntry(
    {
      amountCents: 4_850,
      currency: "USD",
      description: "Office receipt 2 reviewed",
      entityId: "entity-main",
      occurredOn: "2026-03-30",
      source: "Business checking",
      target: "Office supplier",
      userClassification: "expense",
    },
    {
      createdAt: "2026-03-30T09:00:00.000Z",
      recordId: "record-expense",
      recordStatus: "reconciled",
      sourceSystem: "mobile-test",
      updatedAt: "2026-03-30T09:05:00.000Z",
    },
  );

  await persistResolvedStandardReceiptEntry(writableDatabase, incomeEntry);
  await persistResolvedStandardReceiptEntry(writableDatabase, expenseEntry);

  return { database, writableDatabase };
}

describe("hybrid v1 mobile storage coverage", () => {
  it("boots a test database and persists sparse-input records", async () => {
    const { database } = await createPopulatedV1Database();
    const rows = database
      .prepare(
        `SELECT
          record_id AS recordId,
          amount_cents AS amountCents,
          record_kind AS recordKind,
          source_label AS sourceLabel,
          target_label AS targetLabel
        FROM records
        ORDER BY record_id ASC;`,
      )
      .all() as Array<{
      amountCents: number;
      recordId: string;
      recordKind: string;
      sourceLabel: string;
      targetLabel: string;
    }>;

    expect(rows).toEqual([
      {
        amountCents: 4_850,
        recordId: "record-expense",
        recordKind: "expense",
        sourceLabel: "Business checking",
        targetLabel: "Office supplier",
      },
      {
        amountCents: 12_500,
        recordId: "record-income",
        recordKind: "income",
        sourceLabel: "YouTube",
        targetLabel: "Business checking",
      },
    ]);
  });

  it("keeps Schedule C and Schedule SE previews working on top of the simplified runtime contract", async () => {
    const { writableDatabase } = await createPopulatedV1Database();
    const aggregation = await loadScheduleCAggregation(writableDatabase, {
      entityId: "entity-main",
      taxYear: 2026,
    });
    const preview = await loadScheduleSEPreview(writableDatabase, {
      entityId: "entity-main",
      taxYear: 2026,
    });

    expect(aggregation.lineAmounts.line1?.amountCents).toBe(12_500);
    expect(aggregation.lineAmounts.line27a?.amountCents).toBe(4_850);
    expect(preview).toMatchObject({
      currency: "USD",
      deductibleExpensesCents: 4_850,
      grossReceiptsCents: 12_500,
      netProfitCents: 7_650,
    });
  });
});
