import { describe, expect, it } from "vitest";

import {
  buildFormScheduleCSlots,
  buildFormScheduleCSnapshot,
  createEmptyFormScheduleCSnapshot,
} from "../src/features/form-schedule-c/form-schedule-c-model";

describe("form schedule c slot model", () => {
  it("marks unsupported fields manual and formula lines calculated when the schema is empty", () => {
    const slots = buildFormScheduleCSlots(createEmptyFormScheduleCSnapshot());

    const proprietorName = slots.find((slot) => slot.id === "proprietorName");
    const ssn = slots.find((slot) => slot.id === "proprietorSsn");
    const line1 = slots.find((slot) => slot.id === "line1GrossReceiptsOrSales");
    const line3 = slots.find((slot) => slot.id === "line3Subtract2");
    const line32a = slots.find((slot) => slot.id === "line32aAllInvestmentAtRisk");
    const line48 = slots.find((slot) => slot.id === "line48TotalOtherExpenses");

    expect(proprietorName?.source).toBe("manual");
    expect(proprietorName?.previewValue).toBeNull();
    expect(ssn?.source).toBe("manual");
    expect(line1?.source).toBe("manual");
    expect(line1?.previewValue).toBeNull();
    expect(line3?.source).toBe("calculated");
    expect(line32a?.source).toBe("manual");
    expect(line48?.source).toBe("calculated");
  });

  it("uses stored proprietor name and gross receipts where the current schema supports them", () => {
    const snapshot = buildFormScheduleCSnapshot({
      currency: "USD",
      grossReceiptsCents: 1925000,
      incomeRecordCount: 3,
      partVOtherExpenseAmountCents: null,
      partVOtherExpenseCurrency: null,
      partVOtherExpenseLabel: null,
      proprietorName: "North Coast Studio LLC",
    });
    const slots = buildFormScheduleCSlots(snapshot);

    const proprietorName = slots.find((slot) => slot.id === "proprietorName");
    const line1 = slots.find((slot) => slot.id === "line1GrossReceiptsOrSales");
    const line10 = slots.find((slot) => slot.id === "line10CommissionsAndFees");
    const line29 = slots.find((slot) => slot.id === "line29TentativeProfitLoss");

    expect(proprietorName).toMatchObject({
      previewValue: "North Coast Studio LLC",
      source: "database",
    });
    expect(line1).toMatchObject({
      previewValue: "$19,250.00",
      source: "database",
    });
    expect(line10?.source).toBe("manual");
    expect(line29?.source).toBe("calculated");
  });

  it("shows a single manual Part V item box when no database-backed other expense is available", () => {
    const slots = buildFormScheduleCSlots(createEmptyFormScheduleCSnapshot());

    const partVItem = slots.find((slot) => slot.id === "line47OtherExpenseRow1");
    const partVAmount = slots.find((slot) => slot.id === "line47OtherExpenseAmount");

    expect(partVItem?.source).toBe("manual");
    expect(partVAmount).toBeUndefined();
  });

  it("shows database-backed Part V item and amount boxes when an unmapped expense preview is available", () => {
    const snapshot = buildFormScheduleCSnapshot({
      currency: "USD",
      grossReceiptsCents: null,
      incomeRecordCount: 0,
      partVOtherExpenseAmountCents: 8450,
      partVOtherExpenseCurrency: "USD",
      partVOtherExpenseLabel: "Studio props",
      proprietorName: null,
    });
    const slots = buildFormScheduleCSlots(snapshot);

    const partVItem = slots.find((slot) => slot.id === "line47OtherExpenseRow1");
    const partVAmount = slots.find((slot) => slot.id === "line47OtherExpenseAmount");

    expect(partVItem).toMatchObject({
      previewValue: "Studio props",
      source: "database",
    });
    expect(partVAmount).toMatchObject({
      previewValue: "$84.50",
      source: "database",
    });
  });

  it("replaces tax-year-specific guidance when a different fiscal year is selected", () => {
    const slots = buildFormScheduleCSlots(createEmptyFormScheduleCSnapshot(), {
      taxYear: 2026,
    });

    const lineH = slots.find((slot) => slot.id === "lineHStartedOrAcquiredCheckbox");
    const line44a = slots.find((slot) => slot.id === "line44aBusinessMiles");

    expect(lineH?.fieldLabel).toContain("2026");
    expect(lineH?.fieldLabel).not.toContain("2025");
    expect(line44a?.instruction).toContain("2026");
    expect(line44a?.instruction).not.toContain("2025");
  });
});
