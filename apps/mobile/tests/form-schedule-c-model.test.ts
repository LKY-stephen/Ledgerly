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
});
