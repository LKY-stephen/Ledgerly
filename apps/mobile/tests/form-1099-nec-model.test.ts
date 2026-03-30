import { describe, expect, it } from "vitest";

import {
  buildForm1099NecSlots,
  buildForm1099NecSnapshot,
  createEmptyForm1099NecSnapshot,
} from "../src/features/form-1099-nec/form-1099-nec-model";

describe("form 1099-nec slot model", () => {
  it("marks unsupported fields as manual when the schema is empty", () => {
    const slots = buildForm1099NecSlots(createEmptyForm1099NecSnapshot());
    const correctedCheckbox = slots.find((slot) => slot.id === "correctedCheckbox");
    const payerTin = slots.find((slot) => slot.id === "payerTin");
    const payerName = slots.find((slot) => slot.id === "payerName");
    const box1 = slots.find((slot) => slot.id === "box1");
    const voidCheckbox = slots.find((slot) => slot.id === "voidCheckbox");
    const recipientName = slots.find((slot) => slot.id === "recipientName");
    const recipientStreetAddress = slots.find((slot) => slot.id === "recipientStreetAddress");

    expect(correctedCheckbox?.source).toBe("manual");
    expect(payerTin?.source).toBe("manual");
    expect(box1?.source).toBe("manual");
    expect(voidCheckbox?.source).toBe("manual");
    expect(recipientName?.previewValue).toBeNull();
    expect(recipientStreetAddress?.previewValue).toBeNull();
    expect(voidCheckbox?.highlight.widthPct).toBeLessThan(3);
    expect(box1?.highlight.widthPct).toBeLessThan(20);
    expect(recipientName?.highlight.widthPct).toBeLessThan(45);
    expect(voidCheckbox?.highlight.widthPct).toBeLessThan(1.55);
    expect(payerTin?.highlight.heightPct).toBeLessThan(1.45);
    expect(payerName?.highlight.topPct).toBeLessThan(8);
    expect(payerName?.highlight.heightPct).toBeLessThan(2.3);
    expect(box1?.highlight.heightPct).toBeLessThan(2.55);
    expect(recipientName?.highlight.heightPct).toBeLessThan(3);
  });

  it("uses stored names and linked record totals where the current schema supports them", () => {
    const snapshot = buildForm1099NecSnapshot({
      payerLegalName: "North Coast Studio LLC",
      recipient: {
        counterpartyId: "counterparty-1",
        currency: "USD",
        grossAmountCents: 925000,
        grossAmountLabel: "$9,250.00",
        label: "Aster Freelance",
        legalName: "Aster Freelance LLC",
        recordCount: 3,
        taxIdMasked: "***-**-6789",
        withholdingAmountCents: 12500,
      },
    });
    const slots = buildForm1099NecSlots(snapshot);

    const correctedCheckbox = slots.find((slot) => slot.id === "correctedCheckbox");
    const payerName = slots.find((slot) => slot.id === "payerName");
    const payerTelephone = slots.find((slot) => slot.id === "payerTelephone");
    const recipientTin = slots.find((slot) => slot.id === "recipientTin");
    const box1 = slots.find((slot) => slot.id === "box1");
    const box4 = slots.find((slot) => slot.id === "box4");
    const voidCheckbox = slots.find((slot) => slot.id === "voidCheckbox");

    expect(correctedCheckbox?.instruction).toContain("correct");
    expect(payerName).toMatchObject({
      previewValue: "North Coast Studio LLC",
      source: "database",
    });
    expect(payerTelephone?.source).toBe("manual");
    expect(recipientTin).toMatchObject({
      previewValue: "Masked in DB: ***-**-6789",
      source: "manual",
    });
    expect(box1).toMatchObject({
      previewValue: "$9,250.00",
      source: "database",
    });
    expect(box4).toMatchObject({
      previewValue: "$125.00",
      source: "database",
    });
    expect(voidCheckbox?.instruction).toContain("VOID");
  });
});
