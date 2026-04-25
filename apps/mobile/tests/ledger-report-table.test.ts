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
  BalanceSheetTable,
  GeneralLedgerTable,
  ProfitAndLossTable,
} from "@ledgerly/ui";

describe("ledger report table exports", () => {
  it("builds a general-ledger table element with the supplied props", () => {
    const element = GeneralLedgerTable({
      columns: [{ id: "date", label: "Date" }],
      rows: [
        {
          cells: [{ columnId: "date", value: "Apr 30, 2026" }],
          id: "row-1",
        },
      ],
      summaryItems: [{ id: "count", label: "Entries", value: "1" }],
      testID: "general-ledger-table",
      title: "General Ledger",
    });

    const text = collectText(expandNode(element));
    expect(text).toContain("General Ledger");
    expect(text).toContain("Date");
    expect(text).toContain("Apr 30, 2026");
    expect(text).toContain("Entries");
    expect(text).toContain("1");
  });

  it("builds a balance-sheet table element with the supplied props", () => {
    const element = BalanceSheetTable({
      footer: "As of Apr 30, 2026",
      rows: [
        {
          id: "closing",
          label: "Closing Balance",
          note: "Apr 2026",
          value: "$1,000.00",
        },
      ],
      title: "Balance",
    });

    const text = collectText(expandNode(element));
    expect(text).toContain("Balance");
    expect(text).toContain("Closing Balance");
    expect(text).toContain("$1,000.00");
    expect(text).toContain("As of Apr 30, 2026");
  });

  it("builds a profit-and-loss table element with the supplied props", () => {
    const element = ProfitAndLossTable({
      footer: "Revenue minus expenses for the selected range.",
      netIncomeLabel: "Net income",
      netIncomeValue: "$950.00",
      sections: [
        {
          id: "revenue",
          rows: [{ id: "rev-1", label: "TechDaily", value: "$1,200.00" }],
          title: "Revenue",
        },
        {
          id: "expense",
          rows: [{ id: "exp-1", label: "Adobe", value: "$250.00" }],
          title: "Expenses",
        },
      ],
      title: "P&L",
    });

    const text = collectText(expandNode(element));
    expect(text).toContain("P&L");
    expect(text).toContain("Revenue");
    expect(text).toContain("Expenses");
    expect(text).toContain("TechDaily");
    expect(text).toContain("Adobe");
    expect(text).toContain("Net income");
    expect(text).toContain("$950.00");
  });
});

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

  if (isExpandedElement(node)) {
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

function isExpandedElement(
  value: unknown,
): value is {
  props: { children?: unknown };
  type: unknown;
} {
  return isElementLike(value);
}
