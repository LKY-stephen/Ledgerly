import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  createWritableStorageDatabase,
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  structuredStoreContract,
  type StorageSqlValue,
  type StandardReceiptEntryInput,
} from "@ledgerly/storage";

import { loadHomeSnapshot, loadJournalListSnapshot } from "../src/features/home/home-data";
import { buildLedgerPeriodId, loadLedgerSnapshot } from "../src/features/ledger/ledger-reporting";
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
      return (
        (database.prepare(source).get({}, ...params) as Row | undefined) ?? null
      );
    },
    async runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).run(...params);
    },
  });
}

async function seedCreatorMockRecords(
  writableDatabase: ReturnType<typeof createWritableDatabase>,
): Promise<void> {
  const records: Array<{
    createdAt: string;
    input: StandardReceiptEntryInput;
    recordId: string;
  }> = [
    {
      createdAt: "2026-01-15T09:00:00.000Z",
      input: {
        amountCents: 185_000,
        currency: "USD",
        description: "YouTube AdSense payout",
        entityId: "entity-main",
        occurredOn: "2026-01-15",
        source: "YouTube",
        target: "Business checking",
        userClassification: "income",
      },
      recordId: "mock-youtube-income",
    },
    {
      createdAt: "2026-02-05T09:00:00.000Z",
      input: {
        amountCents: 92_000,
        currency: "USD",
        description: "Patreon member payout",
        entityId: "entity-main",
        occurredOn: "2026-02-05",
        source: "Patreon",
        target: "Business checking",
        userClassification: "income",
      },
      recordId: "mock-patreon-income",
    },
    {
      createdAt: "2026-03-11T09:00:00.000Z",
      input: {
        amountCents: 5_299,
        businessUseBps: 10_000,
        currency: "USD",
        description: "Creative Cloud subscription",
        entityId: "entity-main",
        occurredOn: "2026-03-11",
        source: "Business checking",
        target: "Adobe",
        userClassification: "expense",
      },
      recordId: "mock-adobe-expense",
    },
    {
      createdAt: "2026-03-25T09:00:00.000Z",
      input: {
        amountCents: 420_000,
        currency: "USD",
        description: "TikTok brand campaign",
        entityId: "entity-main",
        occurredOn: "2026-03-25",
        source: "TikTok",
        target: "Business checking",
        userClassification: "income",
      },
      recordId: "mock-tiktok-income",
    },
    {
      createdAt: "2026-04-08T09:00:00.000Z",
      input: {
        amountCents: 12_400,
        businessUseBps: 6_000,
        currency: "USD",
        description: "Camera rental for client shoot",
        entityId: "entity-main",
        occurredOn: "2026-04-08",
        source: "Business checking",
        target: "Camera Rental Co",
        userClassification: "expense",
      },
      recordId: "mock-camera-expense",
    },
    {
      createdAt: "2026-04-12T09:00:00.000Z",
      input: {
        amountCents: 8_800,
        currency: "USD",
        description: "Family dinner",
        entityId: "entity-main",
        occurredOn: "2026-04-12",
        source: "Personal card",
        target: "Cafe Luna",
        userClassification: "personal_spending",
      },
      recordId: "mock-personal-spend",
    },
    {
      createdAt: "2026-04-18T09:00:00.000Z",
      input: {
        amountCents: 115_000,
        currency: "USD",
        description: "Affiliate network payout",
        entityId: "entity-main",
        occurredOn: "2026-04-18",
        source: "Affiliate Network",
        target: "Business checking",
        userClassification: "income",
      },
      recordId: "mock-affiliate-income",
    },
  ];

  for (const record of records) {
    await persistResolvedStandardReceiptEntry(
      writableDatabase,
      resolveStandardReceiptEntry(record.input, {
        createdAt: record.createdAt,
        recordId: record.recordId,
        sourceSystem: "creator-dashboard-workflow-test",
        updatedAt: record.createdAt,
      }),
    );
  }
}

describe("creator dashboard workflow", () => {
  it("builds a realistic April home snapshot from creator mock data", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    await ensureDefaultEntity(writableDatabase, "2026-01-01T08:00:00.000Z");
    await seedCreatorMockRecords(writableDatabase);

    const snapshot = await loadHomeSnapshot(writableDatabase, {
      limit: 3,
      now: "2026-04-20",
      offset: 0,
    });

    expect(snapshot.metrics).toEqual({
      incomeCents: 115_000,
      netCents: 93_800,
      outflowCents: 21_200,
    });
    expect(snapshot.recentRecords.map((record) => record.description)).toEqual([
      "Affiliate network payout",
      "Family dinner",
      "Camera rental for client shoot",
    ]);
    expect(snapshot.hasMore).toBe(true);
    expect(snapshot.trend.find((point) => point.date === "2026-04-18")).toEqual(
      {
        amountCents: 115_000,
        date: "2026-04-18",
        label: "Apr 18",
      },
    );
    expect(snapshot.trend.find((point) => point.date === "2026-04-12")).toEqual(
      {
        amountCents: 8_800,
        date: "2026-04-12",
        label: "Apr 12",
      },
    );
  });

  it("builds a 30-day trend window ending on the given now date", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    await ensureDefaultEntity(writableDatabase, "2026-01-01T08:00:00.000Z");
    await seedCreatorMockRecords(writableDatabase);

    const snapshot = await loadHomeSnapshot(writableDatabase, {
      limit: 3,
      now: "2026-04-18",
    });

    expect(snapshot.trend).toHaveLength(30);
    expect(snapshot.trend.at(-1)?.date).toBe("2026-04-18");
    expect(snapshot.trend.at(-1)?.amountCents).toBe(115_000);
    expect(snapshot.recentRecords[0]?.description).toBe(
      "Affiliate network payout",
    );
  });

  it("orders the full journal list from newest to oldest for the Home See All flow", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    await ensureDefaultEntity(writableDatabase, "2026-01-01T08:00:00.000Z");
    await seedCreatorMockRecords(writableDatabase);

    const snapshot = await loadJournalListSnapshot(writableDatabase, {
      limit: 7,
      offset: 0,
    });

    expect(snapshot.hasMore).toBe(false);
    expect(snapshot.records.map((record) => record.recordId)).toEqual([
      "mock-affiliate-income",
      "mock-personal-spend",
      "mock-camera-expense",
      "mock-tiktok-income",
      "mock-adobe-expense",
      "mock-patreon-income",
      "mock-youtube-income",
    ]);
  });

  it("keeps business and personal ledger reporting separate with the same mock dataset", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    await ensureDefaultEntity(writableDatabase, "2026-01-01T08:00:00.000Z");
    await seedCreatorMockRecords(writableDatabase);

    const businessSnapshot = await loadLedgerSnapshot(writableDatabase, {
      preferredPeriodId: buildLedgerPeriodId(2026, "full-year"),
      scopeId: "business",
    });
    const q1BusinessSnapshot = await loadLedgerSnapshot(writableDatabase, {
      preferredPeriodId: buildLedgerPeriodId(2026, "q1"),
      scopeId: "business",
    });
    const personalSnapshot = await loadLedgerSnapshot(writableDatabase, {
      preferredPeriodId: buildLedgerPeriodId(2026, "full-year"),
      scopeId: "personal",
    });

    expect(businessSnapshot.generalLedger.recordCountLabel).toBe("7 entries");
    expect(businessSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$8,120.00",
      "$127.39",
    ]);
    expect(businessSnapshot.profitAndLoss.netIncomeLabel).toBe("$7,992.61");
    expect(businessSnapshot.profitAndLoss.revenueRows.map((row) => row.label)).toEqual([
      "TikTok",
      "YouTube",
      "Affiliate Network",
      "Patreon",
    ]);
    expect(businessSnapshot.profitAndLoss.expenseRows.map((row) => row.label)).toEqual([
      "Camera Rental Co",
      "Adobe",
    ]);
    expect(
      businessSnapshot.generalLedger.entries.find(
        (entry) => entry.id === "party-camera-rental-co",
      )?.amount,
    ).toBe(
      "-$74.40",
    );

    expect(q1BusinessSnapshot.selectedPeriod.id).toBe("2026:q1");
    expect(q1BusinessSnapshot.generalLedger.recordCountLabel).toBe("5 entries");
    expect(q1BusinessSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$6,970.00",
      "$52.99",
    ]);

    expect(personalSnapshot.selectedScope).toBe("personal");
    expect(personalSnapshot.generalLedger.recordCountLabel).toBe("2 entries");
    expect(personalSnapshot.generalLedger.entries[0]?.title).toBe("Cafe Luna");
    expect(personalSnapshot.generalLedger.entries[0]?.amount).toBe("-$88.00");
    expect(personalSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$7,992.61",
      "$88.00",
    ]);
  });

  it("localizes home and ledger runtime labels when the locale switches to zh-CN", async () => {
    const database = createStorageDatabase();
    const writableDatabase = createWritableDatabase(database);
    await ensureDefaultEntity(writableDatabase, "2026-01-01T08:00:00.000Z");
    await seedCreatorMockRecords(writableDatabase);

    const homeSnapshot = await loadHomeSnapshot(writableDatabase, {
      limit: 3,
      now: "2026-04-20",
      offset: 0,
    });
    const ledgerSnapshot = await loadLedgerSnapshot(writableDatabase, {
      locale: "zh-CN",
      preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
      scopeId: "business",
    });

    expect(
      homeSnapshot.trend.find((point) => point.date === "2026-04-18")?.label,
    ).toBe("Apr 18");
    expect(ledgerSnapshot.selectedPeriod.label).toBe("2026年4月");
    expect(ledgerSnapshot.selectedPeriod.summary).toBe("2026年4月01日 - 2026年4月30日");
    expect(ledgerSnapshot.generalLedger.recordCountLabel).toBe("3 条分录");
    expect(ledgerSnapshot.generalLedger.entries[0]?.kindLabel).toBe("收入");
    expect(ledgerSnapshot.generalLedger.entries[0]?.lines[0]?.accountName).toBe("Affiliate Network");
    expect(ledgerSnapshot.generalLedger.entries[0]?.subtitle).toBe("1 条记录");
    expect(ledgerSnapshot.profitAndLoss.metricCards.map((card) => card.label)).toEqual([
      "总收入",
      "总支出",
    ]);
    expect(ledgerSnapshot.balanceSheet.metricCards.map((card) => card.label)).toEqual([
      "总资产",
      "总负债",
    ]);
  });
});
