import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  structuredStoreContract,
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

function createWritableDatabase(database: DatabaseSync) {
  return {
    async getAllAsync<Row>(source: string, ...params: Array<string | number | null>) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: Array<string | number | null>) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
    async runAsync(source: string, ...params: Array<string | number | null>) {
      return database.prepare(source).run(...params);
    },
  };
}

function seedResolverFixture(database: DatabaseSync): void {
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
      "Resolver Demo Books",
      "sole_proprietorship",
      "USD",
      "America/Los_Angeles",
      "2026-03-01T08:00:00.000Z",
    );
}

describe("standard receipt entry resolver", () => {
  it("resolves and persists income receipts into canonical v1 records", async () => {
    const database = createStorageDatabase();
    seedResolverFixture(database);
    const writableDatabase = createWritableDatabase(database);
    const resolvedEntry = resolveStandardReceiptEntry(
      {
        amountCents: 12_500,
        currency: "usd",
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
        sourceSystem: "resolver-test",
        updatedAt: "2026-03-29T09:05:00.000Z",
      },
    );

    await persistResolvedStandardReceiptEntry(writableDatabase, resolvedEntry);

    expect(resolvedEntry.record).toMatchObject({
      amountCents: 12_500,
      businessUseBps: 10_000,
      recordKind: "income",
      sourceLabel: "YouTube",
      targetLabel: "Business checking",
      taxLineCode: "line1",
    });

    const storedRecord = database
      .prepare(
        `SELECT
          amount_cents AS amountCents,
          record_kind AS recordKind,
          source_label AS sourceLabel,
          target_label AS targetLabel,
          tax_line_code AS taxLineCode
        FROM records
        WHERE record_id = ?;`,
      )
      .get("record-income") as {
      amountCents: number;
      recordKind: string;
      sourceLabel: string;
      targetLabel: string;
      taxLineCode: string | null;
    };
    const storedClassification = database
      .prepare(
        `SELECT
          user_classification AS userClassification,
          classification_status AS classificationStatus,
          resolver_code AS resolverCode
        FROM record_entry_classifications
        WHERE record_id = ?;`,
      )
      .get("record-income") as {
      classificationStatus: string;
      resolverCode: string;
      userClassification: string;
    };

    expect(storedRecord).toEqual({
      amountCents: 12_500,
      recordKind: "income",
      sourceLabel: "YouTube",
      targetLabel: "Business checking",
      taxLineCode: "line1",
    });
    expect(storedClassification).toEqual({
      classificationStatus: "resolved",
      resolverCode: "income_line1_default",
      userClassification: "income",
    });
  });

  it("maps generic expense receipts to safe Part V defaults with business-use support", async () => {
    const database = createStorageDatabase();
    seedResolverFixture(database);
    const writableDatabase = createWritableDatabase(database);
    const resolvedEntry = resolveStandardReceiptEntry(
      {
        amountCents: 4_200,
        businessUseBps: 7_500,
        currency: "USD",
        description: "Office receipt 1",
        entityId: "entity-main",
        occurredOn: "2026-03-28",
        source: "Business checking",
        target: "Office Depot",
        userClassification: "expense",
      },
      {
        createdAt: "2026-03-28T09:00:00.000Z",
        recordId: "record-expense",
        sourceSystem: "resolver-test",
        updatedAt: "2026-03-28T09:05:00.000Z",
      },
    );

    await persistResolvedStandardReceiptEntry(writableDatabase, resolvedEntry);

    const storedRecord = database
      .prepare(
        `SELECT
          amount_cents AS amountCents,
          business_use_bps AS businessUseBps,
          record_kind AS recordKind,
          tax_category_code AS taxCategoryCode,
          tax_line_code AS taxLineCode
        FROM records
        WHERE record_id = ?;`,
      )
      .get("record-expense") as {
      amountCents: number;
      businessUseBps: number;
      recordKind: string;
      taxCategoryCode: string | null;
      taxLineCode: string | null;
    };

    expect(storedRecord).toEqual({
      amountCents: 4_200,
      businessUseBps: 7_500,
      recordKind: "expense",
      taxCategoryCode: "schedule-c-other-expense",
      taxLineCode: "line27a",
    });
  });

  it("resolves personal spending without a tax line", async () => {
    const database = createStorageDatabase();
    seedResolverFixture(database);
    const writableDatabase = createWritableDatabase(database);
    const resolvedEntry = resolveStandardReceiptEntry(
      {
        amountCents: 2_100,
        currency: "USD",
        description: "Personal lunch",
        entityId: "entity-main",
        occurredOn: "2026-03-27",
        source: "Business checking",
        target: "Personal card",
        userClassification: "personal_spending",
      },
      {
        createdAt: "2026-03-27T09:00:00.000Z",
        recordId: "record-personal",
        sourceSystem: "resolver-test",
        updatedAt: "2026-03-27T09:05:00.000Z",
      },
    );

    await persistResolvedStandardReceiptEntry(writableDatabase, resolvedEntry);

    const storedRecord = database
      .prepare(
        `SELECT
          amount_cents AS amountCents,
          business_use_bps AS businessUseBps,
          record_kind AS recordKind,
          tax_line_code AS taxLineCode
        FROM records
        WHERE record_id = ?;`,
      )
      .get("record-personal") as {
      amountCents: number;
      businessUseBps: number;
      recordKind: string;
      taxLineCode: string | null;
    };

    expect(storedRecord).toEqual({
      amountCents: 2_100,
      businessUseBps: 0,
      recordKind: "personal_spending",
      taxLineCode: null,
    });
  });
});
