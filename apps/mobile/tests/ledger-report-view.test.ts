import { describe, expect, it, vi } from "vitest";

vi.mock("@expo/vector-icons", () => ({
  Ionicons: (props: unknown) => ({ props, type: "Ionicons" }),
}));

vi.mock("react-native", () => ({
  Modal: (props: unknown) => ({ props, type: "Modal" }),
  Pressable: (props: unknown) => ({ props, type: "Pressable" }),
  ScrollView: (props: unknown) => ({ props, type: "ScrollView" }),
  StyleSheet: {
    absoluteFillObject: {},
    create: <T,>(styles: T) => styles,
    hairlineWidth: 1,
  },
  Text: (props: unknown) => ({ props, type: "Text" }),
  View: (props: unknown) => ({ props, type: "View" }),
}));

import {
  LedgerGeneralLedgerDetailModal,
  LedgerReportBody,
} from "@ledgerly/ui";

describe("ledger report view exports", () => {
  it("builds the shared legacy-style report body for business general-ledger content", () => {
    const element = LedgerReportBody({
      copy: createCopy(),
      onSelectEntry: () => {},
      selectedScope: "business",
      selectedView: "general-ledger",
      snapshot: createSnapshot(),
      testID: "ledger-report-body",
    });

    const text = collectText(expandNode(element));
    expect(text).toContain("General ledger entries");
    expect(text).toContain("3 entries");
    expect(text).toContain("TechDaily");
    expect(text).toContain("Cash & Bank");
    expect(text).toContain("Owner balance");
  });

  it("keeps the personal P&L fallback message in the shared renderer", () => {
    const element = LedgerReportBody({
      copy: createCopy(),
      onSelectEntry: () => {},
      selectedScope: "personal",
      selectedView: "profit-loss",
      snapshot: createSnapshot(),
      testID: "ledger-personal-pnl",
    });

    const text = collectText(expandNode(element));
    expect(text).toContain("P&L is business-only");
    expect(text).toContain(
      "Personal mode separates non-deductible spending from the business P&L.",
    );
  });

  it("returns null for an empty detail modal entry and builds the detail modal when an entry exists", () => {
    expect(
      LedgerGeneralLedgerDetailModal({
        copy: createCopy(),
        entry: null,
        onClose: () => {},
      }),
    ).toBeNull();

    const element = LedgerGeneralLedgerDetailModal({
      copy: createCopy(),
      entry: createSnapshot().generalLedger.entries[1] ?? null,
      onClose: () => {},
    });

    const text = collectText(expandNode(element));
    expect(text).toContain("Journal record");
    expect(text).toContain("Cash & Bank");
    expect(text).toContain("Record ID");
    expect(text).toContain("Balance Equation");
  });
});

function createCopy() {
  return {
    cashAndBankLabel: "Cash & Bank",
    fields: {
      amount: "Amount",
      date: "Date",
      description: "Detail",
      source: "Source",
      target: "Target",
    },
    recordCard: {
      emptyValue: "Not available",
      equationResult: "Displayed amount",
      equationTitle: "Balance Equation",
      memo: "Memo",
      nonOwnerRule:
        "Other groups use credit as positive and debit as negative.",
      ownerRule: "Cash & Bank uses debit as positive and credit as negative.",
      recordId: "Record ID",
      side: "Posting side",
      title: "Journal record",
    },
    sections: {
      assets: "Assets",
      credit: "Credit",
      debit: "Debit",
      equity: "Equity",
      expenses: "Expenses",
      journalPersonal: "Recent personal entries",
      journalRecent: "General ledger entries",
      liabilities: "Liabilities",
      netIncome: "Net income",
      netIncomeSummary: "Revenue minus expenses for the selected range.",
      pnlOnlyBody:
        "Personal mode separates non-deductible spending from the business P&L.",
      pnlOnlyTitle: "P&L is business-only",
      revenue: "Revenue",
    },
  } as const;
}

function createSnapshot() {
  return {
    balanceSheet: {
      assetRows: [
        {
          amount: "$1,750.00",
          id: "asset-1",
          label: "Net operating assets",
          note: "Business movement carried into net assets.",
        },
      ],
      carryForwardRows: [],
      equation: {
        label: "Net asset",
        rows: [
          { id: "opening", label: "Opening", value: "$0.00" },
          { id: "movement", label: "Movement", value: "$1,750.00" },
          { id: "closing", label: "Closing", value: "$1,750.00" },
        ],
        summary: "Opening plus movement equals closing net asset.",
      },
      equationLabel: "Net asset",
      equationSummary: "Opening plus movement equals closing net asset.",
      equityAmount: "$1,750.00",
      equityRows: [
        {
          amount: "$1,750.00",
          id: "equity-1",
          label: "Owner equity",
          note: "Residual operating position.",
        },
      ],
      liabilityRows: [
        { amount: "$0.00", id: "liability-1", label: "Liabilities", note: "None" },
      ],
      metricCards: [
        { id: "asset-total", label: "Total Assets", value: "$1,750.00" },
        { id: "liability-total", label: "Total Liabilities", value: "$0.00" },
      ],
      netPositionLabel: "Positive owner position for this reporting slice",
    },
    generalLedger: {
      debitTotal: "$1,450.00",
      entries: [
        {
          amount: "$1,200.00",
          dateLabel: "Apr 02, 2026",
          id: "entry-techdaily",
          kind: "income",
          kindLabel: "Income",
          lines: [
            {
              accountName: "TechDaily",
              amount: "$1,200.00",
              detail: "Brand sponsorship",
              id: "line-techdaily-credit",
              record: {
                amount: "$1,200.00",
                dateLabel: "Apr 02, 2026",
                description: "Brand sponsorship",
                memo: null,
                recordId: "record-income-april",
                sourceLabel: "TechDaily",
                targetLabel: "Ledgerly",
              },
              side: "credit",
            },
          ],
          side: "credit",
          signedAmountCents: -120_000,
          subtitle: "1 record",
          title: "TechDaily",
        },
        {
          amount: "$950.00",
          dateLabel: "Apr 02, 2026",
          id: "entry-cash-bank",
          kind: "income",
          kindLabel: "Income",
          lines: [
            {
              accountName: "Cash & Bank",
              amount: "$1,200.00",
              detail: "Brand sponsorship",
              id: "line-cash-bank-debit",
              record: {
                amount: "$1,200.00",
                dateLabel: "Apr 02, 2026",
                description: "Brand sponsorship",
                memo: "client payout",
                recordId: "record-income-april",
                sourceLabel: "TechDaily",
                targetLabel: "Ledgerly",
              },
              side: "debit",
            },
            {
              accountName: "Cash & Bank",
              amount: "$250.00",
              detail: "Editing subscription",
              id: "line-cash-bank-credit",
              record: {
                amount: "$250.00",
                dateLabel: "Apr 01, 2026",
                description: "Editing subscription",
                memo: null,
                recordId: "record-expense-april",
                sourceLabel: "Ledgerly",
                targetLabel: "Adobe",
              },
              side: "credit",
            },
          ],
          side: "mixed",
          signedAmountCents: 95_000,
          subtitle: "2 records",
          title: "Cash & Bank",
        },
        {
          amount: "$250.00",
          dateLabel: "Apr 01, 2026",
          id: "entry-adobe",
          kind: "expense",
          kindLabel: "Expense",
          lines: [
            {
              accountName: "Adobe",
              amount: "$250.00",
              detail: "Editing subscription",
              id: "line-adobe-debit",
              record: {
                amount: "$250.00",
                dateLabel: "Apr 01, 2026",
                description: "Editing subscription",
                memo: null,
                recordId: "record-expense-april",
                sourceLabel: "Ledgerly",
                targetLabel: "Adobe",
              },
              side: "debit",
            },
          ],
          side: "debit",
          signedAmountCents: 25_000,
          subtitle: "1 record",
          title: "Adobe",
        },
      ],
      equation: {
        label: "Owner balance",
        rows: [
          { accent: "success", id: "income", label: "Owner balance increase", value: "$1,200.00" },
          { accent: "danger", id: "expense", label: "Less business expenses", value: "-$250.00" },
          { id: "net", label: "Left owner balance", value: "$950.00" },
        ],
        summary: "Business revenue minus business expense explains owner balance movement.",
      },
      metricCards: [
        { accent: "success", id: "scope-total", label: "Total Debits (Dr)", value: "$1,450.00" },
        { accent: "neutral", id: "scope-count", label: "Total Credits (Cr)", value: "$1,450.00" },
      ],
      recordCountLabel: "3 entries",
    },
    profitAndLoss: {
      expenseRows: [
        { amount: "$250.00", id: "expense-1", label: "Adobe", note: "Editing subscription" },
      ],
      metricCards: [
        { id: "revenue", label: "Gross Revenue", value: "$1,200.00" },
        { id: "expense", label: "Total Expenses", value: "$250.00" },
      ],
      netIncomeLabel: "$950.00",
      revenueRows: [
        { amount: "$1,200.00", id: "revenue-1", label: "TechDaily", note: "Brand sponsorship" },
      ],
    },
  } as const;
}

function expandNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(expandNode);
  }

  if (!isElementLike(node)) {
    return node;
  }

  if (typeof node.type === "function") {
    try {
      return expandNode(node.type(node.props));
    } catch {
      return {
        props: {
          ...node.props,
          children: expandNode(node.props?.children),
        },
        type: node.type,
      };
    }
  }

  return {
    props: {
      ...node.props,
      children: expandNode(node.props?.children),
    },
    type: node.type,
  };
}

function collectText(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectText);
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (isElementLike(node)) {
    return collectText(node.props.children);
  }

  return [];
}

function isElementLike(
  value: unknown,
): value is {
  props: Record<string, unknown>;
  type: unknown;
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      "props" in value &&
      "type" in value,
  );
}
