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
      lineAmounts: {
        line1: {
          amountCents: 1925000,
          currency: "USD",
          matchedRecordCount: 3,
          readableCategoryLabels: ["platform-income"],
        },
      },
      lineReviewNotes: {},
      partVReviewNote: null,
      partVRows: [],
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
      lineAmounts: {
        line27a: {
          amountCents: 8450,
          currency: "USD",
          matchedRecordCount: 1,
          readableCategoryLabels: ["Studio props"],
        },
      },
      lineReviewNotes: {},
      partVReviewNote: null,
      partVRows: [
        {
          amountCents: 8450,
          currency: "USD",
          label: "Studio props",
          matchedRecordCount: 1,
        },
      ],
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

  it("uses query-backed expense line totals when authoritative tax-line amounts are present", () => {
    const snapshot = buildFormScheduleCSnapshot({
      currency: "USD",
      lineAmounts: {
        line18: {
          amountCents: 15500,
          currency: "USD",
          matchedRecordCount: 2,
          readableCategoryLabels: ["office", "software"],
        },
      },
      lineReviewNotes: {},
      partVReviewNote: null,
      partVRows: [],
      proprietorName: null,
    });
    const slots = buildFormScheduleCSlots(snapshot);

    const line18 = slots.find((slot) => slot.id === "line18OfficeExpense");
    const line17 = slots.find((slot) => slot.id === "line17LegalAndProfessionalServices");

    expect(line18).toMatchObject({
      previewValue: "$155.00",
      source: "database",
    });
    expect(line17?.source).toBe("manual");
  });

  it("keeps a supported line manual when the shared contract marks it review-required", () => {
    const snapshot = buildFormScheduleCSnapshot({
      currency: "USD",
      lineAmounts: {},
      lineReviewNotes: {
        line18:
          "Review required for Office expense: 1 mapped record missing cash-basis dates. This line stays manual until the data matches the confirmed cash-basis USD contract.",
      },
      partVReviewNote: null,
      partVRows: [],
      proprietorName: null,
    });
    const slots = buildFormScheduleCSlots(snapshot);

    const line18 = slots.find((slot) => slot.id === "line18OfficeExpense");

    expect(line18?.source).toBe("manual");
    expect(line18?.previewValue).toBeNull();
    expect(line18?.sourceNote).toContain("missing cash-basis dates");
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
