import { describe, expect, it } from "vitest";

import { form1040FieldCount } from "../src/features/form-1040/form-1040-fields";
import { buildForm1040Slots, createEmptyForm1040Snapshot } from "../src/features/form-1040/form-1040-model";

describe("form 1040 slot model", () => {
  it("covers every extracted official widget with an individual slot", () => {
    const slots = buildForm1040Slots(createEmptyForm1040Snapshot());

    expect(slots).toHaveLength(form1040FieldCount + 2);
    expect(slots.every((slot) => slot.instruction.length > 0)).toBe(true);
    expect(slots.every((slot) => slot.source === "manual")).toBe(true);
  });

  it("relabels the noisy top-of-form special fields into explicit manual inputs", () => {
    const slots = buildForm1040Slots(createEmptyForm1040Snapshot());

    expect(slots.find((slot) => slot.id === "f1_01[0]")?.fieldLabel).toBe(
      "Tax year beginning date field",
    );
    expect(slots.find((slot) => slot.id === "c1_2[0]")?.fieldLabel).toBe(
      "Combat zone checkbox",
    );
    expect(slots.find((slot) => slot.id === "f1_14[0]")?.fieldLabel).toContain(
      "Your first name and middle initial",
    );
  });

  it("keeps downstream tax lines manual until the app has real Form 1040 source data", () => {
    const slots = buildForm1040Slots(createEmptyForm1040Snapshot());

    expect(slots.find((slot) => slot.badge === "24")?.source).toBe("manual");
    expect(slots.find((slot) => slot.badge === "33")?.source).toBe("manual");
    expect(slots.find((slot) => slot.id === "line37AmountOwedFallback")?.source).toBe("manual");
  });
});
