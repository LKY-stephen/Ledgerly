import { describe, expect, it } from "vitest";

import {
  buildDatabaseDemoFieldUpdate,
  buildDatabaseDemoMetrics,
  buildDatabaseDemoReportState,
  buildDatabaseDemoSummary,
  createDatabaseDemoFixture,
  createDatabaseDemoRecordDraft,
  createDatabaseDemoRecordId,
  createEmptyDatabaseDemoSnapshot,
  databaseDemoIds,
  databaseDemoSourceSystem,
  formatAmountLabel,
  getDatabaseDemoRecordSequence,
  getNextDatabaseDemoRecordSequence,
} from "../src/features/database-demo/demo-data";

describe("database hook demo helpers", () => {
  it("creates deterministic fixtures and sequenced record drafts for the demo", () => {
    const fixture = createDatabaseDemoFixture();
    const firstRecord = createDatabaseDemoRecordDraft(1);
    const thirdRecord = createDatabaseDemoRecordDraft(3);

    expect(fixture.entity.entityId).toBe(databaseDemoIds.entityId);
    expect(firstRecord.recordId).toBe(databaseDemoIds.recordIdPrefix);
    expect(firstRecord.sourceSystem).toBe(databaseDemoSourceSystem);
    expect(thirdRecord.recordId).toBe(`${databaseDemoIds.recordIdPrefix}-3`);
    expect(getDatabaseDemoRecordSequence(thirdRecord.recordId)).toBe(3);
    expect(getNextDatabaseDemoRecordSequence([firstRecord.recordId, thirdRecord.recordId])).toBe(4);
  });

  it("builds field-scoped updates for the selected record", () => {
    const descriptionUpdate = buildDatabaseDemoFieldUpdate(
      {
        description: "YouTube payout 2",
        recordId: createDatabaseDemoRecordId(2),
        recordStatus: "posted",
      },
      "description",
    );
    const statusUpdate = buildDatabaseDemoFieldUpdate(
      {
        description: "YouTube payout 2 reviewed",
        recordId: createDatabaseDemoRecordId(2),
        recordStatus: "posted",
      },
      "recordStatus",
    );

    expect(descriptionUpdate.nextValue).toBe("YouTube payout 2 reviewed");
    expect(statusUpdate.nextValue).toBe("reconciled");
  });

  it("summarizes empty and populated snapshots", () => {
    const emptySnapshot = createEmptyDatabaseDemoSnapshot();

    expect(buildDatabaseDemoSummary(emptySnapshot, null)).toContain("No demo records exist yet");
    expect(buildDatabaseDemoMetrics(emptySnapshot)[0]?.value).toBe("0");

    const populatedSnapshot = {
      ...emptySnapshot,
      counts: {
        journalEntryCount: 2,
        ledgerAccountCount: 4,
        recordCount: 2,
        selectedLineCount: 4,
      },
      selectedPostingLines: [
        {
          accountName: "Business Checking",
          accountRole: "cash",
          amountLabel: "USD 108.00",
          direction: "debit" as const,
          lineNo: 10,
        },
      ],
    };

    expect(buildDatabaseDemoSummary(populatedSnapshot, createDatabaseDemoRecordId(2))).toContain(
      "2 demo records are present",
    );
    expect(buildDatabaseDemoSummary(populatedSnapshot, createDatabaseDemoRecordId(2))).toContain(
      createDatabaseDemoRecordId(2),
    );
    expect(buildDatabaseDemoSummary(populatedSnapshot, createDatabaseDemoRecordId(2))).toContain(
      "Ledger is balanced.",
    );
    expect(buildDatabaseDemoMetrics(populatedSnapshot)[1]?.label).toBe("Selected lines");
  });

  it("formats money labels in minor units", () => {
    expect(formatAmountLabel(10800, "USD")).toBe("USD 108.00");
    expect(formatAmountLabel(-1250, "USD")).toBe("-USD 12.50");
  });

  it("builds report previews from accounting posting rows", () => {
    const reportState = buildDatabaseDemoReportState([
      {
        accountCode: "1010",
        accountName: "Business Checking",
        accountRole: "cash",
        accountType: "asset",
        creditAmountCents: 0,
        currency: "USD",
        debitAmountCents: 85000,
        description: "YouTube March payout",
        lineNo: 10,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: 85000,
        postingOn: "2026-03-01",
        recordId: "record-income",
        statementSection: "balance_sheet",
      },
      {
        accountCode: "1200",
        accountName: "Withholding Tax Receivable",
        accountRole: "withholding",
        accountType: "asset",
        creditAmountCents: 0,
        currency: "USD",
        debitAmountCents: 10000,
        description: "YouTube March payout",
        lineNo: 30,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: 10000,
        postingOn: "2026-03-01",
        recordId: "record-income",
        statementSection: "balance_sheet",
      },
      {
        accountCode: "4010",
        accountName: "Platform Revenue",
        accountRole: "primary",
        accountType: "income",
        creditAmountCents: 100000,
        currency: "USD",
        debitAmountCents: 0,
        description: "YouTube March payout",
        lineNo: 90,
        normalBalance: "credit",
        normalizedBalanceDeltaCents: 100000,
        postingOn: "2026-03-01",
        recordId: "record-income",
        statementSection: "profit_and_loss",
      },
      {
        accountCode: "6050",
        accountName: "Platform Fees",
        accountRole: "fee",
        accountType: "expense",
        creditAmountCents: 0,
        currency: "USD",
        debitAmountCents: 5000,
        description: "YouTube March payout",
        lineNo: 20,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: 5000,
        postingOn: "2026-03-01",
        recordId: "record-income",
        statementSection: "profit_and_loss",
      },
      {
        accountCode: "6100",
        accountName: "Office Expense",
        accountRole: "primary",
        accountType: "expense",
        creditAmountCents: 0,
        currency: "USD",
        debitAmountCents: 20000,
        description: "Studio rent accrual",
        lineNo: 10,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: 20000,
        postingOn: "2026-03-02",
        recordId: "record-expense",
        statementSection: "profit_and_loss",
      },
      {
        accountCode: "2100",
        accountName: "Accounts Payable",
        accountRole: "offset",
        accountType: "liability",
        creditAmountCents: 20000,
        currency: "USD",
        debitAmountCents: 0,
        description: "Studio rent accrual",
        lineNo: 90,
        normalBalance: "credit",
        normalizedBalanceDeltaCents: 20000,
        postingOn: "2026-03-02",
        recordId: "record-expense",
        statementSection: "balance_sheet",
      },
    ]);

    expect(reportState.ledgerHealth.isBalanced).toBe(true);
    expect(reportState.ledgerHealth.warningText).toBeNull();
    expect(reportState.journalEntries).toHaveLength(2);
    expect(reportState.ledgerAccounts).toHaveLength(6);
    expect(reportState.balanceSheetSections).toEqual([
      {
        lines: [
          { amountLabel: "USD 850.00", label: "1010 · Business Checking" },
          { amountLabel: "USD 100.00", label: "1200 · Withholding Tax Receivable" },
        ],
        title: "Assets",
        totalLabel: "USD 950.00",
      },
      {
        lines: [{ amountLabel: "USD 200.00", label: "2100 · Accounts Payable" }],
        title: "Liabilities",
        totalLabel: "USD 200.00",
      },
      {
        lines: [{ amountLabel: "USD 750.00", label: "Current earnings" }],
        title: "Equity",
        totalLabel: "USD 750.00",
      },
    ]);
    expect(reportState.profitAndLossSections).toEqual([
      {
        lines: [{ amountLabel: "USD 1000.00", label: "4010 · Platform Revenue" }],
        title: "Income",
        totalLabel: "USD 1000.00",
      },
      {
        lines: [
          { amountLabel: "USD 50.00", label: "6050 · Platform Fees" },
          { amountLabel: "USD 200.00", label: "6100 · Office Expense" },
        ],
        title: "Expenses",
        totalLabel: "USD 250.00",
      },
      {
        lines: [{ amountLabel: "USD 750.00", label: "Current period result" }],
        title: "Net income",
        totalLabel: "USD 750.00",
      },
    ]);
  });

  it("flags an unbalanced demo ledger", () => {
    const reportState = buildDatabaseDemoReportState([
      {
        accountCode: "1010",
        accountName: "Business Checking",
        accountRole: "cash",
        accountType: "asset",
        creditAmountCents: 0,
        currency: "USD",
        debitAmountCents: 85000,
        description: "Broken payout",
        lineNo: 10,
        normalBalance: "debit",
        normalizedBalanceDeltaCents: 85000,
        postingOn: "2026-03-01",
        recordId: "record-broken",
        statementSection: "balance_sheet",
      },
    ]);

    expect(reportState.ledgerHealth.isBalanced).toBe(false);
    expect(reportState.ledgerHealth.warningText).toContain("unbalanced");
    expect(reportState.ledgerHealth.imbalanceLabel).toBe("USD 850.00");
  });
});
