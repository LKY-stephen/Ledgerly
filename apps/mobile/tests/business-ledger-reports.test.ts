import type { LedgerlySDK, RecordRow } from "@ledgerly/sdk";
import { describe, expect, it, vi } from "vitest";

import {
  buildLedgerSnapshotFromSdkRecords,
  createBusinessLedgerReportsErrorMessage,
  createIdleBusinessLedgerReportsState,
  hasLedgerPeriodRange,
  loadBusinessLedgerReportSnapshot,
} from "../src/features/ledger/business-ledger-reports";

describe("business ledger reports", () => {
  it("loads a business snapshot from SDK record searches and preserves the legacy grouped ledger shape", async () => {
    const sdk = {
      searchRecordsByDateRange: vi
        .fn()
        .mockResolvedValueOnce([
          createRecordRow({
            amountCents: 120_000,
            description: "Brand sponsorship",
            occurredOn: "2026-04-02",
            recordId: "record-income-april",
            recordKind: "income",
            sourceLabel: "TechDaily",
            targetLabel: "Ledgerly",
          }),
          createRecordRow({
            amountCents: 25_000,
            description: "Editing subscription",
            occurredOn: "2026-04-01",
            recordId: "record-expense-april",
            recordKind: "expense",
            sourceLabel: "Ledgerly",
            targetLabel: "Adobe",
          }),
        ])
        .mockResolvedValueOnce([
          createRecordRow({
            amountCents: 120_000,
            description: "Brand sponsorship",
            occurredOn: "2026-04-02",
            recordId: "record-income-april",
            recordKind: "income",
            sourceLabel: "TechDaily",
            targetLabel: "Ledgerly",
          }),
          createRecordRow({
            amountCents: 25_000,
            description: "Editing subscription",
            occurredOn: "2026-04-01",
            recordId: "record-expense-april",
            recordKind: "expense",
            sourceLabel: "Ledgerly",
            targetLabel: "Adobe",
          }),
        ])
        .mockResolvedValueOnce([
          createRecordRow({
            amountCents: 120_000,
            description: "Brand sponsorship",
            occurredOn: "2026-04-02",
            recordId: "record-income-april",
            recordKind: "income",
            sourceLabel: "TechDaily",
            targetLabel: "Ledgerly",
          }),
          createRecordRow({
            amountCents: 25_000,
            description: "Editing subscription",
            occurredOn: "2026-04-01",
            recordId: "record-expense-april",
            recordKind: "expense",
            sourceLabel: "Ledgerly",
            targetLabel: "Adobe",
          }),
          createRecordRow({
            amountCents: 80_000,
            description: "March consulting",
            occurredOn: "2026-03-20",
            recordId: "record-income-march",
            recordKind: "income",
            sourceLabel: "Launch Labs",
            targetLabel: "Ledgerly",
          }),
        ]),
    } satisfies Pick<LedgerlySDK, "searchRecordsByDateRange">;

    const snapshot = await loadBusinessLedgerReportSnapshot({
      locale: "en",
      period: {
        endDate: "2026-04-30",
        id: "2026:m04",
        label: "Apr 2026",
        segmentId: "m04",
        startDate: "2026-04-01",
        summary: "Apr 01, 2026 - Apr 30, 2026",
        year: 2026,
      },
      sdk,
    });

    expect(sdk.searchRecordsByDateRange).toHaveBeenNthCalledWith(1, {
      endOn: "2026-04-30",
      recordKinds: [
        "income",
        "invoice_payment",
        "platform_payout",
        "expense",
        "reimbursable_expense",
      ],
      recordStatuses: ["posted", "reconciled"],
      startOn: "2026-04-01",
    });
    expect(sdk.searchRecordsByDateRange).toHaveBeenNthCalledWith(2, {
      endOn: "2026-04-30",
      recordKinds: [
        "income",
        "invoice_payment",
        "platform_payout",
        "expense",
        "reimbursable_expense",
        "non_business_income",
        "personal_spending",
      ],
      recordStatuses: ["posted", "reconciled"],
      startOn: "2026-04-01",
    });
    expect(sdk.searchRecordsByDateRange).toHaveBeenNthCalledWith(3, {
      endOn: "2026-04-30",
      recordKinds: [
        "income",
        "invoice_payment",
        "platform_payout",
        "expense",
        "reimbursable_expense",
        "non_business_income",
        "personal_spending",
      ],
      recordStatuses: ["posted", "reconciled"],
      startOn: "0001-01-01",
    });

    expect(snapshot.selectedScope).toBe("business");
    expect(snapshot.generalLedger.recordCountLabel).toBe("3 entries");
    expect(snapshot.generalLedger.entries.map((entry) => entry.title)).toEqual([
      "TechDaily",
      "Cash & Bank",
      "Adobe",
    ]);
    expect(snapshot.generalLedger.entries[1]?.lines).toHaveLength(2);
    expect(snapshot.generalLedger.equation.rows.map((row) => row.value)).toEqual([
      "$1,200.00",
      "-$250.00",
      "$950.00",
    ]);
    expect(snapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$1,200.00",
      "$250.00",
    ]);
    expect(snapshot.profitAndLoss.netIncomeLabel).toBe("$950.00");
    expect(snapshot.balanceSheet.metricCards.map((card) => card.value)).toEqual([
      "$1,750.00",
      "$0.00",
    ]);
  });

  it("builds personal-scope legacy snapshots from arbitrary SDK-fed record collections", () => {
    const snapshot = buildLedgerSnapshotFromSdkRecords({
      balanceSheetRows: [
        createRecordRow({
          amountCents: 120_000,
          description: "Brand sponsorship",
          occurredOn: "2026-04-02",
          recordId: "record-income-april",
          recordKind: "platform_payout",
          sourceLabel: "TechDaily",
          targetLabel: "Ledgerly",
        }),
        createRecordRow({
          amountCents: 25_000,
          description: "Editing subscription",
          occurredOn: "2026-04-01",
          recordId: "record-expense-april",
          recordKind: "reimbursable_expense",
          sourceLabel: "Ledgerly",
          targetLabel: "Adobe",
        }),
        createRecordRow({
          amountCents: 6_000,
          businessUseBps: 2_500,
          description: "Personal lunch",
          occurredOn: "2026-04-01",
          recordId: "record-personal-april",
          recordKind: "personal_spending",
          sourceLabel: "Ledgerly",
          targetLabel: "Cafe",
        }),
        createRecordRow({
          amountCents: 80_000,
          description: "March consulting",
          occurredOn: "2026-03-20",
          recordId: "record-income-march",
          recordKind: "invoice_payment",
          sourceLabel: "Launch Labs",
          targetLabel: "Ledgerly",
        }),
      ],
      locale: "en",
      periodRows: [
        createRecordRow({
          amountCents: 6_000,
          businessUseBps: 2_500,
          description: "Personal lunch",
          occurredOn: "2026-04-01",
          recordId: "record-personal-april",
          recordKind: "personal_spending",
          sourceLabel: "Ledgerly",
          targetLabel: "Cafe",
        }),
      ],
      profitLossRows: [
        createRecordRow({
          amountCents: 120_000,
          description: "Brand sponsorship",
          occurredOn: "2026-04-02",
          recordId: "record-income-april",
          recordKind: "platform_payout",
          sourceLabel: "TechDaily",
          targetLabel: "Ledgerly",
        }),
        createRecordRow({
          amountCents: 25_000,
          description: "Editing subscription",
          occurredOn: "2026-04-01",
          recordId: "record-expense-april",
          recordKind: "reimbursable_expense",
          sourceLabel: "Ledgerly",
          targetLabel: "Adobe",
        }),
        createRecordRow({
          amountCents: 6_000,
          businessUseBps: 2_500,
          description: "Personal lunch",
          occurredOn: "2026-04-01",
          recordId: "record-personal-april",
          recordKind: "personal_spending",
          sourceLabel: "Ledgerly",
          targetLabel: "Cafe",
        }),
      ],
      selectedPeriod: {
        endDate: "2026-04-30",
        id: "2026:m04",
        label: "Apr 2026",
        segmentId: "m04",
        startDate: "2026-04-01",
        summary: "Apr 01, 2026 - Apr 30, 2026",
        year: 2026,
      },
      selectedScope: "personal",
    });

    expect(snapshot.selectedScope).toBe("personal");
    expect(snapshot.generalLedger.recordCountLabel).toBe("2 entries");
    expect(snapshot.generalLedger.entries.map((entry) => entry.title)).toEqual([
      "Cafe",
      "Cash & Bank",
    ]);
    expect(snapshot.generalLedger.entries[0]?.kindLabel).toBe("Personal");
    expect(snapshot.generalLedger.equation.rows.map((row) => row.value)).toEqual([
      "$950.00",
      "-$60.00",
      "$890.00",
    ]);
    expect(snapshot.profitAndLoss.metricCards.map((card) => card.value)).toEqual([
      "$950.00",
      "$60.00",
    ]);
    expect(snapshot.profitAndLoss.netIncomeLabel).toBe("$890.00");
    expect(snapshot.balanceSheet.assetRows.map((row) => row.amount)).toEqual([
      "$1,690.00",
    ]);
  });

  it("returns the idle helper state and period-range guard values", () => {
    expect(createIdleBusinessLedgerReportsState()).toEqual({ status: "idle" });
    expect(
      hasLedgerPeriodRange({ endDate: "2026-04-30", startDate: "2026-04-01" }),
    ).toBe(true);
    expect(hasLedgerPeriodRange({ endDate: "", startDate: "2026-04-01" })).toBe(
      false,
    );
  });

  it("formats business-report error messages with localized fallback copy", () => {
    expect(
      createBusinessLedgerReportsErrorMessage(new Error("boom"), "en"),
    ).toBe("boom");
    expect(
      createBusinessLedgerReportsErrorMessage("unknown", "zh-CN"),
    ).toBe("经营报表加载失败。");
    expect(createBusinessLedgerReportsErrorMessage("unknown", "en")).toBe(
      "Business reports failed to load.",
    );
  });
});

function createRecordRow(overrides: Partial<RecordRow> & Pick<RecordRow, "amountCents" | "description" | "occurredOn" | "recordId" | "recordKind" | "sourceLabel" | "targetLabel">): RecordRow {
  return {
    amountCents: overrides.amountCents,
    businessUseBps: overrides.businessUseBps ?? 10_000,
    categoryCode: overrides.categoryCode ?? null,
    createdAt: overrides.createdAt ?? `${overrides.occurredOn}T12:00:00Z`,
    currency: overrides.currency ?? "USD",
    description: overrides.description,
    entityId: overrides.entityId ?? "entity-main",
    memo: overrides.memo ?? null,
    occurredOn: overrides.occurredOn,
    recordId: overrides.recordId,
    recordKind: overrides.recordKind,
    recordStatus: overrides.recordStatus ?? "posted",
    sourceCounterpartyId: overrides.sourceCounterpartyId ?? null,
    sourceLabel: overrides.sourceLabel,
    sourceSystem: overrides.sourceSystem ?? "business-ledger-reports-test",
    subcategoryCode: overrides.subcategoryCode ?? null,
    targetCounterpartyId: overrides.targetCounterpartyId ?? null,
    targetLabel: overrides.targetLabel,
    taxCategoryCode: overrides.taxCategoryCode ?? null,
    taxLineCode: overrides.taxLineCode ?? null,
    updatedAt: overrides.updatedAt ?? `${overrides.occurredOn}T12:00:00Z`,
  };
}
