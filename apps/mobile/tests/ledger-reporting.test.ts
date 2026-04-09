import {
  createReadableStorageDatabase,
  type ReadableStorageDatabase,
} from "@creator-cfo/storage";
import { describe, expect, it } from "vitest";

import {
  buildLedgerPeriodId,
  getDefaultLedgerPeriodId,
  loadLedgerSnapshot,
  ledgerPostableStatuses,
  resolveLedgerPeriodOption,
} from "../src/features/ledger/ledger-reporting";

interface FakeLedgerRecordRow {
  amountCents: number;
  businessUseBps: number;
  createdAt: string;
  currency: string;
  description: string;
  entityId: string;
  memo: string | null;
  occurredOn: string;
  recordId: string;
  recordKind: "expense" | "income" | "personal_spending";
  recordStatus: string;
  sourceLabel: string;
  targetLabel: string;
  taxLineCode: string | null;
}

describe("ledger reporting", () => {
  it("keeps business P&L slice-based while business balance sheet carries opening balance plus year-to-date business profit", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 120_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-02T10:00:00Z",
        currency: "USD",
        description: "Brand sponsorship",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-02",
        recordId: "record-income-april",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "TechDaily",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 25_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-01T12:00:00Z",
        currency: "USD",
        description: "Editing subscription",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-01",
        recordId: "record-expense-april",
        recordKind: "expense",
        recordStatus: "reconciled",
        sourceLabel: "Creator CFO",
        targetLabel: "Adobe",
        taxLineCode: "line27a",
      },
      {
        amountCents: 6_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-01T13:00:00Z",
        currency: "USD",
        description: "Personal lunch",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-01",
        recordId: "record-personal-april",
        recordKind: "personal_spending",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Cafe",
        taxLineCode: null,
      },
      {
        amountCents: 80_000,
        businessUseBps: 10_000,
        createdAt: "2026-03-20T12:00:00Z",
        currency: "USD",
        description: "March consulting",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-03-20",
        recordId: "record-income-march",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Launch Labs",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 9_900,
        businessUseBps: 10_000,
        createdAt: "2026-04-03T12:00:00Z",
        currency: "USD",
        description: "Draft expense",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-03",
        recordId: "record-draft-april",
        recordKind: "expense",
        recordStatus: "draft",
        sourceLabel: "Creator CFO",
        targetLabel: "Vendor",
        taxLineCode: "line27a",
      },
    ]);

    const snapshot = await loadLedgerSnapshot(database, {
      now: "2026-04-03",
      preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
    });

    expect(ledgerPostableStatuses).toEqual(["posted", "reconciled"]);
    expect(snapshot.selectedPeriod.id).toBe("2026:m04");
    expect(snapshot.generalLedger.entries).toHaveLength(2);
    expect(snapshot.generalLedger.recordCountLabel).toBe("2 records");
    expect(snapshot.generalLedger.entries.map((entry) => entry.title)).toEqual([
      "Brand sponsorship",
      "Editing subscription",
    ]);
    expect(snapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$1,200.00",
      "$250.00",
    ]);
    expect(snapshot.profitAndLoss.netIncomeLabel).toBe("$950.00");
    expect(snapshot.profitAndLoss.expenseRows[0]?.label).toBe("Adobe");
    expect(snapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,750.00",
      "$0.00",
    ]);
    expect(snapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$0.00",
      "$1,750.00",
      "$1,750.00",
    ]);
    expect(snapshot.balanceSheet.equationSummary).toBe(
      "Opening $0.00 + business movement $1,750.00 = closing business asset $1,750.00",
    );
    expect(snapshot.balanceSheet.netPositionLabel).toBe(
      "Closing business asset as of the selected period end before current-year personal-spending deductions.",
    );
    expect(snapshot.yearOptions.map((option) => option.id)).toEqual(["2026"]);
    expect(snapshot.segmentOptions.map((option) => option.id)).toEqual([
      "full-year",
      "q1",
      "q2",
      "m03",
      "m04",
    ]);
    expect(snapshot.selectedScope).toBe("business");
  });

  it("keeps business and personal closing assets aligned when current-year personal spending is zero", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 120_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-02T10:00:00Z",
        currency: "USD",
        description: "Brand sponsorship",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-02",
        recordId: "record-income-april",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "TechDaily",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 25_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-01T12:00:00Z",
        currency: "USD",
        description: "Editing subscription",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-01",
        recordId: "record-expense-april",
        recordKind: "expense",
        recordStatus: "reconciled",
        sourceLabel: "Creator CFO",
        targetLabel: "Adobe",
        taxLineCode: "line27a",
      },
      {
        amountCents: 80_000,
        businessUseBps: 10_000,
        createdAt: "2026-03-20T12:00:00Z",
        currency: "USD",
        description: "March consulting",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-03-20",
        recordId: "record-income-march",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Launch Labs",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
    ]);

    const businessSnapshot = await loadLedgerSnapshot(database, {
      now: "2026-04-03",
      preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
    });
    const personalSnapshot = await loadLedgerSnapshot(database, {
      now: "2026-04-03",
      preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
      scopeId: "personal",
    });

    expect(businessSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,750.00",
      "$0.00",
    ]);
    expect(personalSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,750.00",
      "$0.00",
    ]);
    expect(businessSnapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$0.00",
      "$1,750.00",
      "$1,750.00",
    ]);
    expect(personalSnapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$0.00",
      "$1,750.00",
      "$0.00",
      "$1,750.00",
    ]);
    expect(personalSnapshot.generalLedger.entries).toEqual([]);
    expect(personalSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$950.00",
      "$0.00",
    ]);
    expect(personalSnapshot.profitAndLoss.netIncomeLabel).toBe("$950.00");
  });

  it("separates business and personal closing asset totals when current-year personal spending exists", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 120_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-02T10:00:00Z",
        currency: "USD",
        description: "Brand sponsorship",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-02",
        recordId: "record-income-april",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "TechDaily",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 25_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-01T12:00:00Z",
        currency: "USD",
        description: "Editing subscription",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-01",
        recordId: "record-expense-april",
        recordKind: "expense",
        recordStatus: "reconciled",
        sourceLabel: "Creator CFO",
        targetLabel: "Adobe",
        taxLineCode: "line27a",
      },
      {
        amountCents: 6_000,
        businessUseBps: 2_500,
        createdAt: "2026-04-01T13:00:00Z",
        currency: "USD",
        description: "Personal lunch",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-01",
        recordId: "record-personal-april",
        recordKind: "personal_spending",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Cafe",
        taxLineCode: null,
      },
      {
        amountCents: 3_000,
        businessUseBps: 10_000,
        createdAt: "2026-03-14T13:00:00Z",
        currency: "USD",
        description: "Personal snack",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-03-14",
        recordId: "record-personal-march",
        recordKind: "personal_spending",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Cafe",
        taxLineCode: null,
      },
      {
        amountCents: 80_000,
        businessUseBps: 10_000,
        createdAt: "2026-03-20T12:00:00Z",
        currency: "USD",
        description: "March consulting",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-03-20",
        recordId: "record-income-march",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Launch Labs",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
    ]);

    const businessSnapshot = await loadLedgerSnapshot(database, {
      now: "2026-04-03",
      preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
    });
    const personalSnapshot = await loadLedgerSnapshot(database, {
      now: "2026-04-03",
      preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
      scopeId: "personal",
    });

    expect(businessSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,750.00",
      "$0.00",
    ]);
    expect(businessSnapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$0.00",
      "$1,750.00",
      "$1,750.00",
    ]);
    expect(personalSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,660.00",
      "$0.00",
    ]);
    expect(personalSnapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$0.00",
      "$1,750.00",
      "-$90.00",
      "$1,660.00",
    ]);
    expect(personalSnapshot.selectedScope).toBe("personal");
    expect(personalSnapshot.generalLedger.entries).toHaveLength(1);
    expect(personalSnapshot.generalLedger.entries[0]?.title).toBe("Personal lunch");
    expect(personalSnapshot.generalLedger.entries[0]?.kindLabel).toBe("Personal");
    expect(personalSnapshot.generalLedger.metricCards.map((card) => card.value)).toEqual([
      "$60.00",
      "1",
    ]);
    expect(personalSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$950.00",
      "$60.00",
    ]);
    expect(personalSnapshot.profitAndLoss.netIncomeLabel).toBe("$890.00");
    expect(personalSnapshot.balanceSheet.netPositionLabel).toContain(
      "limited derived personal view rather than a full asset and debt statement",
    );
  });

  it("carries prior business activity into a later business balance sheet without changing the later period slice", async () => {
    const aprilOnlyRows: FakeLedgerRecordRow[] = [
      {
        amountCents: 120_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-02T10:00:00Z",
        currency: "USD",
        description: "Brand sponsorship",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-02",
        recordId: "record-income-april",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "TechDaily",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 25_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-01T12:00:00Z",
        currency: "USD",
        description: "Editing subscription",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-01",
        recordId: "record-expense-april",
        recordKind: "expense",
        recordStatus: "reconciled",
        sourceLabel: "Creator CFO",
        targetLabel: "Adobe",
        taxLineCode: "line27a",
      },
    ];
    const withPriorActivityRows: FakeLedgerRecordRow[] = [
      ...aprilOnlyRows,
      {
        amountCents: 80_000,
        businessUseBps: 10_000,
        createdAt: "2026-03-20T12:00:00Z",
        currency: "USD",
        description: "March consulting",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-03-20",
        recordId: "record-income-march",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Launch Labs",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
    ];

    const snapshotWithoutPriorActivity = await loadLedgerSnapshot(
      createFakeLedgerDatabase(aprilOnlyRows),
      {
        now: "2026-04-03",
        preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
      },
    );
    const snapshotWithPriorActivity = await loadLedgerSnapshot(
      createFakeLedgerDatabase(withPriorActivityRows),
      {
        now: "2026-04-03",
        preferredPeriodId: buildLedgerPeriodId(2026, "m04"),
      },
    );

    expect(snapshotWithPriorActivity.profitAndLoss.netIncomeLabel).toBe("$950.00");
    expect(snapshotWithoutPriorActivity.profitAndLoss.netIncomeLabel).toBe("$950.00");
    expect(snapshotWithPriorActivity.generalLedger.recordCountLabel).toBe("2 records");
    expect(snapshotWithoutPriorActivity.generalLedger.recordCountLabel).toBe("2 records");
    expect(snapshotWithPriorActivity.generalLedger.entries.map((entry) => entry.title)).toEqual([
      "Brand sponsorship",
      "Editing subscription",
    ]);
    expect(snapshotWithoutPriorActivity.generalLedger.entries.map((entry) => entry.title)).toEqual([
      "Brand sponsorship",
      "Editing subscription",
    ]);
    expect(snapshotWithoutPriorActivity.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$950.00",
      "$0.00",
    ]);
    expect(snapshotWithPriorActivity.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,750.00",
      "$0.00",
    ]);
    expect(snapshotWithPriorActivity.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$0.00",
      "$1,750.00",
      "$1,750.00",
    ]);
  });

  it("uses the prior-year personal closing asset as next-year opening balance while business view ignores current-year personal deductions", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 100_000,
        businessUseBps: 10_000,
        createdAt: "2026-12-20T10:00:00Z",
        currency: "USD",
        description: "Year-end payout",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-12-20",
        recordId: "record-income-2026",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Platform",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 20_000,
        businessUseBps: 10_000,
        createdAt: "2026-12-21T13:00:00Z",
        currency: "USD",
        description: "Owner draw",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-12-21",
        recordId: "record-personal-2026",
        recordKind: "personal_spending",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Transfer",
        taxLineCode: null,
      },
      {
        amountCents: 5_000,
        businessUseBps: 10_000,
        createdAt: "2027-02-10T13:00:00Z",
        currency: "USD",
        description: "Personal groceries",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2027-02-10",
        recordId: "record-personal-2027",
        recordKind: "personal_spending",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Market",
        taxLineCode: null,
      },
    ]);

    const businessSnapshot = await loadLedgerSnapshot(database, {
      now: "2027-02-11",
      preferredPeriodId: buildLedgerPeriodId(2027, "m02"),
    });
    const personalSnapshot = await loadLedgerSnapshot(database, {
      now: "2027-02-11",
      preferredPeriodId: buildLedgerPeriodId(2027, "m02"),
      scopeId: "personal",
    });

    expect(businessSnapshot.selectedPeriod.id).toBe("2027:m02");
    expect(businessSnapshot.isEmpty).toBe(false);
    expect(businessSnapshot.generalLedger.entries).toEqual([]);
    expect(businessSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$0.00",
      "$0.00",
    ]);
    expect(businessSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$800.00",
      "$0.00",
    ]);
    expect(businessSnapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$800.00",
      "$0.00",
      "$800.00",
    ]);
    expect(personalSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$750.00",
      "$0.00",
    ]);
    expect(personalSnapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$800.00",
      "$0.00",
      "-$50.00",
      "$750.00",
    ]);
  });

  it("exposes business-backed periods in personal scope and derives personal P&L from business profit even without same-slice personal spending", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 100_000,
        businessUseBps: 10_000,
        createdAt: "2026-12-20T10:00:00Z",
        currency: "USD",
        description: "Year-end payout",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-12-20",
        recordId: "record-income-2026",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Platform",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 10_000,
        businessUseBps: 10_000,
        createdAt: "2026-12-21T10:00:00Z",
        currency: "USD",
        description: "Year-end tools",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-12-21",
        recordId: "record-expense-2026",
        recordKind: "expense",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Vendor",
        taxLineCode: "line27a",
      },
      {
        amountCents: 20_000,
        businessUseBps: 10_000,
        createdAt: "2026-12-22T13:00:00Z",
        currency: "USD",
        description: "Owner draw",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-12-22",
        recordId: "record-personal-2026",
        recordKind: "personal_spending",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Transfer",
        taxLineCode: null,
      },
      {
        amountCents: 30_000,
        businessUseBps: 10_000,
        createdAt: "2027-02-10T10:00:00Z",
        currency: "USD",
        description: "February payout",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2027-02-10",
        recordId: "record-income-2027",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Platform",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
    ]);

    const businessSnapshot = await loadLedgerSnapshot(database, {
      now: "2027-02-11",
      preferredPeriodId: buildLedgerPeriodId(2027, "m02"),
    });
    const personalSnapshot = await loadLedgerSnapshot(database, {
      now: "2027-02-11",
      preferredPeriodId: buildLedgerPeriodId(2027, "m02"),
      scopeId: "personal",
    });

    expect(personalSnapshot.selectedPeriod.id).toBe("2027:m02");
    expect(personalSnapshot.yearOptions.map((option) => option.id)).toEqual(["2027", "2026"]);
    expect(personalSnapshot.isEmpty).toBe(false);
    expect(personalSnapshot.generalLedger.entries).toEqual([]);
    expect(personalSnapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$300.00",
      "$0.00",
    ]);
    expect(personalSnapshot.profitAndLoss.netIncomeLabel).toBe("$300.00");
    expect(personalSnapshot.balanceSheet.carryForwardRows.map((row) => row.amount)).toEqual([
      "$700.00",
      "$300.00",
      "$0.00",
      "$1,000.00",
    ]);
    expect(personalSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,000.00",
      "$0.00",
    ]);
    expect(businessSnapshot.profitAndLoss.netIncomeLabel).toBe("$300.00");
    expect(businessSnapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,000.00",
      "$0.00",
    ]);
    expect(personalSnapshot.balanceSheet.netPositionLabel).toContain(
      "limited derived personal view rather than a full asset and debt statement",
    );
  });

  it("narrows selectable years and segments to record-backed ranges and defaults to the latest full year", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 100_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-02T10:00:00Z",
        currency: "USD",
        description: "Course launch",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-02",
        recordId: "record-income-april",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Students",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 40_000,
        businessUseBps: 5_000,
        createdAt: "2026-03-18T10:00:00Z",
        currency: "USD",
        description: "Shared equipment",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-03-18",
        recordId: "record-expense-march",
        recordKind: "expense",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Camera Shop",
        taxLineCode: "line27a",
      },
      {
        amountCents: 20_000,
        businessUseBps: 10_000,
        createdAt: "2024-09-09T10:00:00Z",
        currency: "USD",
        description: "Legacy course sale",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2024-09-09",
        recordId: "record-income-legacy",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Archive",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
    ]);

    const snapshot = await loadLedgerSnapshot(database);

    expect(snapshot.selectedPeriod.id).toBe("2026:full-year");
    expect(snapshot.generalLedger.entries).toHaveLength(2);
    expect(snapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$1,000.00",
      "$200.00",
    ]);
    expect(snapshot.profitAndLoss.netIncomeLabel).toBe("$800.00");
    expect(snapshot.yearOptions.map((option) => option.id)).toEqual(["2026", "2024"]);
    expect(snapshot.segmentOptions.map((option) => option.id)).toEqual([
      "full-year",
      "q1",
      "q2",
      "m03",
      "m04",
    ]);
    expect(snapshot.periodOptions.map((option) => option.id)).toEqual([
      "2026:full-year",
      "2026:q1",
      "2026:q2",
      "2026:m03",
      "2026:m04",
      "2024:full-year",
      "2024:q3",
      "2024:m09",
    ]);
    expect(getDefaultLedgerPeriodId(snapshot.yearOptions)).toBe("2026:full-year");
  });

  it("derives a cumulative funding gap on the balance sheet when prior income still leaves a negative position", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 20_000,
        businessUseBps: 10_000,
        createdAt: "2026-06-28T10:00:00Z",
        currency: "USD",
        description: "June payout",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-06-28",
        recordId: "record-income-june",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Platform",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 35_000,
        businessUseBps: 10_000,
        createdAt: "2026-07-03T10:00:00Z",
        currency: "USD",
        description: "Camera rental",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-07-03",
        recordId: "record-expense-july",
        recordKind: "expense",
        recordStatus: "posted",
        sourceLabel: "Creator CFO",
        targetLabel: "Studio Supply",
        taxLineCode: "line27a",
      },
    ]);

    const snapshot = await loadLedgerSnapshot(database, {
      now: "2026-07-10",
      preferredPeriodId: buildLedgerPeriodId(2026, "m07"),
    });

    expect(snapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$0.00",
      "$150.00",
    ]);
    expect(snapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$0.00",
      "$350.00",
    ]);
    expect(snapshot.profitAndLoss.netIncomeLabel).toBe("-$350.00");
    expect(snapshot.balanceSheet.equationSummary).toBe(
      "Opening $0.00 + business movement -$150.00 = closing business asset -$150.00",
    );
    expect(snapshot.balanceSheet.liabilityRows[0]?.label).toBe("Funding gap (derived)");
    expect(snapshot.balanceSheet.equityRows[0]?.amount).toBe("-$150.00");
  });

  it("falls back to the latest valid month when a preferred month is unavailable", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 55_000,
        businessUseBps: 10_000,
        createdAt: "2026-04-05T10:00:00Z",
        currency: "USD",
        description: "April payout",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-04-05",
        recordId: "record-income-april",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Platform",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 44_000,
        businessUseBps: 10_000,
        createdAt: "2025-12-18T10:00:00Z",
        currency: "USD",
        description: "December payout",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2025-12-18",
        recordId: "record-income-december",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Platform",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
    ]);

    const snapshot = await loadLedgerSnapshot(database, {
      preferredPeriodId: buildLedgerPeriodId(2026, "m02"),
    });

    expect(snapshot.selectedPeriod.id).toBe("2026:m04");
  });

  it("forces the latest record-backed full-year default on database-change recompute", async () => {
    const database = createFakeLedgerDatabase([
      {
        amountCents: 81_000,
        businessUseBps: 10_000,
        createdAt: "2026-08-04T10:00:00Z",
        currency: "USD",
        description: "August sponsorship",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2026-08-04",
        recordId: "record-income-2026",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Studio",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
      {
        amountCents: 33_000,
        businessUseBps: 10_000,
        createdAt: "2024-09-12T10:00:00Z",
        currency: "USD",
        description: "Legacy consulting",
        entityId: "entity-main",
        memo: null,
        occurredOn: "2024-09-12",
        recordId: "record-income-2024",
        recordKind: "income",
        recordStatus: "posted",
        sourceLabel: "Archive",
        targetLabel: "Creator CFO",
        taxLineCode: "line1",
      },
    ]);

    const snapshot = await loadLedgerSnapshot(database, {
      forceDefaultSelection: true,
      preferredPeriodId: buildLedgerPeriodId(2024, "q3"),
    });

    expect(snapshot.selectedPeriod.id).toBe("2026:full-year");
  });

  it("returns an unavailable placeholder snapshot when the active scope has no records", async () => {
    const snapshot = await loadLedgerSnapshot(createFakeLedgerDatabase([]), {
      preferredPeriodId: buildLedgerPeriodId(2026, "m11"),
    });

    expect(snapshot.selectedPeriod.id).toBe("unavailable");
    expect(snapshot.selectedPeriod.label).toBe("No records yet");
    expect(snapshot.yearOptions).toEqual([]);
    expect(snapshot.segmentOptions).toEqual([]);
    expect(snapshot.periodOptions).toEqual([]);
    expect(snapshot.generalLedger.entries).toEqual([]);
    expect(snapshot.isEmpty).toBe(true);
  });

  it("resolves valid period ids against available period options", () => {
    const periodOptions = [
      {
        endDate: "2025-12-31",
        id: "2025:full-year",
        label: "2025",
        segmentId: "full-year" as const,
        startDate: "2025-01-01",
        summary: "Jan 1, 2025 - Dec 31, 2025",
        year: 2025,
      },
      {
        endDate: "2024-09-30",
        id: "2024:q3",
        label: "Q3 2024",
        segmentId: "q3" as const,
        startDate: "2024-07-01",
        summary: "Jul 1, 2024 - Sep 30, 2024",
        year: 2024,
      },
    ];

    const selected = resolveLedgerPeriodOption("2024:q3", periodOptions);
    const missing = resolveLedgerPeriodOption("2017:full-year", periodOptions);

    expect(getDefaultLedgerPeriodId([
      { id: "2025", label: "2025", year: 2025 },
      { id: "2024", label: "2024", year: 2024 },
    ])).toBe("2025:full-year");
    expect(getDefaultLedgerPeriodId([])).toBeNull();
    expect(selected?.id).toBe("2024:q3");
    expect(selected?.startDate).toBe("2024-07-01");
    expect(selected?.endDate).toBe("2024-09-30");
    expect(missing).toBeNull();
  });
});

function createFakeLedgerDatabase(
  rows: readonly FakeLedgerRecordRow[],
): ReadableStorageDatabase {
  return createReadableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: unknown[]) {
      if (!source.includes("FROM records")) {
        throw new Error(`Unexpected query: ${source}`);
      }

      if (source.includes("DISTINCT") && source.includes("occurred_on AS occurredOn")) {
        const [entityId] = params as [string];
        const allowedKinds = getAllowedKindsFromLiteralQuery(source);
        const occurredOnValues = [...new Set(
          rows
            .filter((row) => row.entityId === entityId)
            .filter((row) => allowedKinds.includes(row.recordKind))
            .filter((row) => ledgerPostableStatuses.includes(row.recordStatus as (typeof ledgerPostableStatuses)[number]))
            .map((row) => row.occurredOn),
        )].sort((left, right) => right.localeCompare(left));

        return occurredOnValues.map((occurredOn) => ({ occurredOn })) as Row[];
      }

      const { allowedKinds, endDate, entityId, startDate } = parseParameterizedRecordRangeQuery(
        source,
        params,
      );
      const filtered = rows
        .filter((row) => row.entityId === entityId)
        .filter((row) => allowedKinds.includes(row.recordKind))
        .filter((row) => ledgerPostableStatuses.includes(row.recordStatus as (typeof ledgerPostableStatuses)[number]))
        .filter((row) => row.occurredOn >= startDate && row.occurredOn <= endDate)
        .sort((left, right) =>
          right.occurredOn.localeCompare(left.occurredOn) ||
          right.createdAt.localeCompare(left.createdAt) ||
          right.recordId.localeCompare(left.recordId),
        )
        .map((row) => ({
          amountCents: row.amountCents,
          businessUseBps: row.businessUseBps,
          createdAt: row.createdAt,
          currency: row.currency,
          description: row.description,
          memo: row.memo,
          occurredOn: row.occurredOn,
          recordId: row.recordId,
          recordKind: row.recordKind,
          sourceLabel: row.sourceLabel,
          targetLabel: row.targetLabel,
          taxLineCode: row.taxLineCode,
        }));

      return filtered as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: unknown[]) {
      if (!source.includes("MIN(occurred_on)")) {
        throw new Error(`Unexpected query: ${source}`);
      }

      const [entityId] = params as [string];
      const allowedKinds = getAllowedKindsFromLiteralQuery(source);
      const filtered = rows
        .filter((row) => row.entityId === entityId)
        .filter((row) => allowedKinds.includes(row.recordKind))
        .filter((row) => ledgerPostableStatuses.includes(row.recordStatus as (typeof ledgerPostableStatuses)[number]));

      if (!filtered.length) {
        return {
          maxOccurredOn: null,
          minOccurredOn: null,
        } as Row;
      }

      const occurredOnValues = filtered.map((row) => row.occurredOn).sort();

      return {
        maxOccurredOn: occurredOnValues[occurredOnValues.length - 1] ?? null,
        minOccurredOn: occurredOnValues[0] ?? null,
      } as Row;
    },
  });
}

function getAllowedKindsFromLiteralQuery(source: string): FakeLedgerRecordRow["recordKind"][] {
  if (source.includes("('income', 'expense', 'personal_spending')")) {
    return ["income", "expense", "personal_spending"];
  }

  if (source.includes("('personal_spending')")) {
    return ["personal_spending"];
  }

  return ["income", "expense"];
}

function parseParameterizedRecordRangeQuery(
  source: string,
  params: readonly unknown[],
): {
  allowedKinds: FakeLedgerRecordRow["recordKind"][];
  endDate: string;
  entityId: string;
  startDate: string;
} {
  const [entityId, ...boundValues] = params as [string, ...string[]];
  const kindCount = getInPlaceholderCount(source, "r.record_kind");
  const statusCount = getInPlaceholderCount(source, "r.record_status");
  const allowedKinds = boundValues.slice(0, kindCount) as FakeLedgerRecordRow["recordKind"][];
  const startDate = boundValues[kindCount + statusCount] ?? "";
  const endDate = boundValues[kindCount + statusCount + 1] ?? "";

  return { allowedKinds, endDate, entityId, startDate };
}

function getInPlaceholderCount(source: string, columnName: string): number {
  const match = source.match(new RegExp(`${escapeRegExp(columnName)} IN \\(([^)]+)\\)`));

  if (!match) {
    return 0;
  }

  return match[1] ? (match[1].match(/\?/g) ?? []).length : 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
