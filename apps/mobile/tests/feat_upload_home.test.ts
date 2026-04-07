import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  createWritableStorageDatabase,
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  structuredStoreContract,
  type StorageSqlValue,
} from "@creator-cfo/storage";

import { loadHomeSnapshot } from "../src/features/home/home-data";
import { ensureDefaultEntity } from "../src/features/ledger/ledger-store";

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

describe("feat_upload home aggregation", () => {
  it("aggregates month totals, 30-day income trend, and paginated recent records", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    await ensureDefaultEntity(writableDatabase, "2026-04-01T08:00:00.000Z");

    const entries = [
      resolveStandardReceiptEntry(
        {
          amountCents: 12_500,
          currency: "USD",
          description: "YouTube payout",
          entityId: "entity-main",
          occurredOn: "2026-04-02",
          source: "YouTube",
          target: "Business checking",
          userClassification: "income",
        },
        {
          createdAt: "2026-04-02T09:00:00.000Z",
          recordId: "record-income-1",
          sourceSystem: "home-test",
          updatedAt: "2026-04-02T09:00:00.000Z",
        },
      ),
      resolveStandardReceiptEntry(
        {
          amountCents: 4_200,
          currency: "USD",
          description: "Adobe subscription",
          entityId: "entity-main",
          occurredOn: "2026-04-10",
          source: "Business checking",
          target: "Adobe",
          userClassification: "expense",
        },
        {
          createdAt: "2026-04-10T10:00:00.000Z",
          recordId: "record-expense-1",
          sourceSystem: "home-test",
          updatedAt: "2026-04-10T10:00:00.000Z",
        },
      ),
      resolveStandardReceiptEntry(
        {
          amountCents: 8_900,
          currency: "USD",
          description: "Consulting payout",
          entityId: "entity-main",
          occurredOn: "2026-04-18",
          source: "Client",
          target: "Business checking",
          userClassification: "income",
        },
        {
          createdAt: "2026-04-18T11:00:00.000Z",
          recordId: "record-income-2",
          sourceSystem: "home-test",
          updatedAt: "2026-04-18T11:00:00.000Z",
        },
      ),
    ];

    for (const entry of entries) {
      await persistResolvedStandardReceiptEntry(writableDatabase, entry);
    }

    const firstPage = await loadHomeSnapshot(writableDatabase, {
      limit: 2,
      now: "2026-04-20",
      offset: 0,
    });
    const secondPage = await loadHomeSnapshot(writableDatabase, {
      limit: 2,
      now: "2026-04-20",
      offset: 2,
    });

    expect(firstPage.metrics).toEqual({
      incomeCents: 21_400,
      netCents: 17_200,
      outflowCents: 4_200,
    });
    expect(firstPage.trend.find((point) => point.date === "2026-04-18")?.amountCents).toBe(8_900);
    expect(firstPage.trend.find((point) => point.date === "2026-04-10")?.amountCents).toBe(0);
    expect(firstPage.recentRecords).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(secondPage.recentRecords).toHaveLength(1);
    expect(secondPage.hasMore).toBe(false);
  });
});
