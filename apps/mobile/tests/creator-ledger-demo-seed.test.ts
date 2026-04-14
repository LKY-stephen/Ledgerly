import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  createWritableStorageDatabase,
  structuredStoreContract,
  type StorageSqlValue,
} from "@creator-cfo/storage";

import { loadHomeSnapshot } from "../src/features/home/home-data";
import { buildLedgerPeriodId, loadLedgerSnapshot } from "../src/features/ledger/ledger-reporting";
import { replaceCreatorLedgerDemoRecords } from "../src/features/database-demo/creator-ledger-demo-plan";

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

describe("creator ledger demo seed", () => {
  it("replaces the seeded creator records deterministically instead of appending duplicates", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);

    const firstSeed = await replaceCreatorLedgerDemoRecords(writableDatabase);
    const secondSeed = await replaceCreatorLedgerDemoRecords(writableDatabase);
    const countRow = database.prepare("SELECT COUNT(*) AS count FROM records;").get() as { count: number };

    expect(firstSeed.recordCount).toBe(8);
    expect(secondSeed.recordCount).toBe(8);
    expect(countRow.count).toBe(8);
  });

  it("drives the simplified home and ledger totals from the shared creator demo data", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    await replaceCreatorLedgerDemoRecords(writableDatabase);

    const homeSnapshot = await loadHomeSnapshot(writableDatabase, {
      limit: 4,
      now: "2026-04-20",
    });
    const businessLedgerSnapshot = await loadLedgerSnapshot(writableDatabase, {
      preferredPeriodId: buildLedgerPeriodId(2026, "full-year"),
      scopeId: "business",
    });
    const personalLedgerSnapshot = await loadLedgerSnapshot(writableDatabase, {
      preferredPeriodId: buildLedgerPeriodId(2026, "full-year"),
      scopeId: "personal",
    });
    const zhLedgerSnapshot = await loadLedgerSnapshot(writableDatabase, {
      locale: "zh-CN",
      preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
      scopeId: "business",
    });

    expect(homeSnapshot.metrics).toEqual({
      incomeCents: 469_000,
      netCents: 399_500,
      outflowCents: 69_500,
    });
    expect(homeSnapshot.recentRecords.map((record) => record.description)).toEqual([
      "YouTube AdSense payout",
      "Patreon member payout",
      "Adobe Creative Cloud renewal",
      "Sponsorship payout: TechDaily",
    ]);

    expect(businessLedgerSnapshot.generalLedger.recordCountLabel).toBe("7 records");
    expect(businessLedgerSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$5,230.00",
      "$735.00",
    ]);
    expect(businessLedgerSnapshot.profitAndLoss.netIncomeLabel).toBe("$4,495.00");
    expect(businessLedgerSnapshot.profitAndLoss.revenueRows.map((row) => row.label)).toEqual([
      "TechDaily",
      "YouTube",
      "Patreon",
      "ShareASale",
    ]);
    expect(businessLedgerSnapshot.profitAndLoss.expenseRows.map((row) => row.label)).toEqual([
      "Production Rentals",
      "Adobe",
      "Notion",
    ]);

    expect(personalLedgerSnapshot.generalLedger.recordCountLabel).toBe("1 record");
    expect(personalLedgerSnapshot.generalLedger.entries[0]?.title).toBe("Coffee and meals during shoot day");
    expect(personalLedgerSnapshot.generalLedger.entries[0]?.amount).toBe("$86.00");

    expect(zhLedgerSnapshot.selectedPeriod.label).toBe("2026年4月");
    expect(zhLedgerSnapshot.generalLedger.recordCountLabel).toBe("5 条记录");
    expect(zhLedgerSnapshot.profitAndLoss.metricCards.map((card) => card.label)).toEqual([
      "总收入",
      "总支出",
    ]);
  });
});
