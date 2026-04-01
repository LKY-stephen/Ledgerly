import { describe, expect, it } from "vitest";

import { scheduleSEFieldCount } from "../src/features/form-schedule-se/form-schedule-se-fields";
import {
  buildFormScheduleSESlots,
  buildFormScheduleSESnapshot,
  createEmptyFormScheduleSESnapshot,
} from "../src/features/form-schedule-se/form-schedule-se-model";

describe("form schedule se slot model", () => {
  it("covers every extracted visible widget with an individual slot", () => {
    const slots = buildFormScheduleSESlots(createEmptyFormScheduleSESnapshot());

    expect(slots).toHaveLength(scheduleSEFieldCount);
    expect(slots.every((slot) => slot.instruction.length > 0)).toBe(true);
    expect(slots.find((slot) => slot.id === "f1_1[0]")?.fieldLabel).toBe(
      "Name of person with self-employment income",
    );
    expect(slots.find((slot) => slot.id === "f1_21[0]")?.fieldLabel).toBe(
      "Line 12. Self-employment tax",
    );
  });

  it("uses the supported Schedule C net-profit preview on line 2 when available", () => {
    const slots = buildFormScheduleSESlots(
      buildFormScheduleSESnapshot({
        supportedScheduleCNetProfitPreview: {
          currency: "USD",
          deductibleExpensesCents: 50_000,
          grossReceiptsCents: 500_000,
          includedLineCodes: ["line1", "line18", "line27a"],
          netProfitCents: 450_000,
          sourceNote:
            "Preview uses only the currently query-backed Schedule C lines (line1, line18, line27a) and still treats unsupported Schedule C lines as manual.",
        },
      }),
    );

    const line2 = slots.find((slot) => slot.id === "f1_5[0]");
    const line3 = slots.find((slot) => slot.id === "f1_6[0]");

    expect(line2).toMatchObject({
      previewValue: "$4,500.00",
      source: "calculated",
    });
    expect(line2?.sourceNote).toContain("line18");
    expect(line3?.source).toBe("manual");
  });
});
