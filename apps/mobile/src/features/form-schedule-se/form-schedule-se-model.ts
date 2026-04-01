import type { SupportedScheduleCNetProfitPreview } from "@creator-cfo/storage";

import { scheduleSEFields } from "./form-schedule-se-fields";
import {
  formatCurrencyLabel,
  type ExtractedTaxFormFieldAssetEntry,
  type TaxFormSlotKind,
  type TaxFormSlotState,
} from "../tax-form-common/types";

export const formScheduleSEDisclaimerText =
  "the form is based on data provided in the database, it might be insufficient if some records are not provided, please take your own responsibility to ensure the completeness of tax information need to be reported";

export interface FormScheduleSEDatabaseSnapshot {
  supportedScheduleCNetProfitPreview: SupportedScheduleCNetProfitPreview | null;
}

interface ScheduleSEFieldOverride {
  badge: string;
  citation: string;
  fieldLabel: string;
  instruction: string;
}

const scheduleSEFieldOverrides: Record<string, ScheduleSEFieldOverride> = {
  "c1_1[0]": {
    badge: "A",
    citation: "i1040sse: Part I, line A",
    fieldLabel: "Line A checkbox",
    instruction:
      "Check this box only if you filed Form 4361 and still had $400 or more of other net earnings from self-employment as described in the instructions.",
  },
  "f1_1[0]": {
    badge: "Header",
    citation: "Official form label only",
    fieldLabel: "Name of person with self-employment income",
    instruction:
      "Enter the name exactly as it appears on the matching Form 1040 or equivalent return listed in the form header.",
  },
  "f1_2[0]": {
    badge: "Header",
    citation: "Official form label only",
    fieldLabel: "Social security number of person with self-employment income",
    instruction:
      "Enter the SSN for the person whose self-employment income is being reported on this schedule.",
  },
  "f1_3[0]": {
    badge: "1a",
    citation: "i1040sse: Part I, line 1a",
    fieldLabel: "Line 1a. Net farm profit or (loss)",
    instruction:
      "Enter net farm profit or loss from Schedule F, line 34, and any farm partnership amounts from Schedule K-1 (Form 1065), box 14, code A.",
  },
  "f1_4[0]": {
    badge: "1b",
    citation: "i1040sse: Part I, line 1b",
    fieldLabel: "Line 1b. Conservation Reserve Program payments",
    instruction:
      "If you received social security retirement or disability benefits, enter the Conservation Reserve Program payments described on the official form in this field.",
  },
  "f1_5[0]": {
    badge: "2",
    citation: "i1040sse: Part I, line 2",
    fieldLabel: "Line 2. Net profit or (loss) from Schedule C",
    instruction:
      "Enter net profit or loss from Schedule C, line 31, plus any nonfarm Schedule K-1 amounts described in the instructions.",
  },
  "f1_6[0]": {
    badge: "3",
    citation: "i1040sse: Part I, line 3",
    fieldLabel: "Line 3. Combine lines 1a, 1b, and 2",
    instruction: "Combine the supported farm and nonfarm self-employment amounts shown on lines 1a, 1b, and 2.",
  },
  "f1_7[0]": {
    badge: "4a",
    citation: "i1040sse: Part I, line 4a",
    fieldLabel: "Line 4a. 92.35% of line 3",
    instruction:
      "If line 3 is more than zero, multiply it by 92.35%; otherwise enter the amount from line 3 as instructed on the form.",
  },
  "f1_8[0]": {
    badge: "4b",
    citation: "i1040sse: Part I, line 4b",
    fieldLabel: "Line 4b. Optional methods total",
    instruction: "Enter the total of lines 15 and 17 only if you elect one or both optional methods in Part II.",
  },
  "f1_9[0]": {
    badge: "4c",
    citation: "i1040sse: Part I, line 4c",
    fieldLabel: "Line 4c. Combined self-employment earnings",
    instruction:
      "Combine lines 4a and 4b and use the threshold rule printed on the form to determine whether you continue.",
  },
  "f1_10[0]": {
    badge: "5a",
    citation: "i1040sse: Part I, line 5a",
    fieldLabel: "Line 5a. Church employee income",
    instruction:
      "Enter church employee income from Form W-2 only if the official Schedule SE instructions require it.",
  },
  "f1_11[0]": {
    badge: "5b",
    citation: "i1040sse: Part I, line 5b",
    fieldLabel: "Line 5b. 92.35% of line 5a",
    instruction:
      "Multiply line 5a by 92.35% and enter -0- if the result is less than $100, exactly as directed on the form.",
  },
  "f1_12[0]": {
    badge: "6",
    citation: "i1040sse: Part I, line 6",
    fieldLabel: "Line 6. Add lines 4c and 5b",
    instruction: "Add lines 4c and 5b to determine earnings subject to self-employment tax.",
  },
  "f1_14[0]": {
    badge: "8a",
    citation: "i1040sse: Part I, line 8a",
    fieldLabel: "Line 8a. Social security wages and tips",
    instruction:
      "Enter total social security wages and tips from Form W-2 and railroad retirement compensation as directed on line 8a.",
  },
  "f1_15[0]": {
    badge: "8b",
    citation: "i1040sse: Part I, line 8b",
    fieldLabel: "Line 8b. Unreported tips subject to social security tax",
    instruction:
      "Enter unreported tips subject to social security tax from Form 4137, line 10, if applicable.",
  },
  "f1_16[0]": {
    badge: "8c",
    citation: "i1040sse: Part I, line 8c",
    fieldLabel: "Line 8c. Wages subject to social security tax from Form 8919",
    instruction:
      "Enter wages subject to social security tax from Form 8919, line 10, if applicable.",
  },
  "f1_17[0]": {
    badge: "8d",
    citation: "i1040sse: Part I, line 8d",
    fieldLabel: "Line 8d. Add lines 8a, 8b, and 8c",
    instruction: "Add lines 8a, 8b, and 8c.",
  },
  "f1_18[0]": {
    badge: "9",
    citation: "i1040sse: Part I, line 9",
    fieldLabel: "Line 9. Remaining social security cap",
    instruction:
      "Subtract line 8d from the annual social security wage base shown on line 7, then follow the zero-or-less instruction printed on the form.",
  },
  "f1_19[0]": {
    badge: "10",
    citation: "i1040sse: Part I, line 10",
    fieldLabel: "Line 10. Social security tax",
    instruction:
      "Multiply the smaller of line 6 or line 9 by 12.4% after confirming the wage-base inputs on lines 7 through 9.",
  },
  "f1_20[0]": {
    badge: "11",
    citation: "i1040sse: Part I, line 11",
    fieldLabel: "Line 11. Medicare tax",
    instruction:
      "Multiply line 6 by 2.9% to calculate the Medicare portion of self-employment tax.",
  },
  "f1_21[0]": {
    badge: "12",
    citation: "i1040sse: Part I, line 12",
    fieldLabel: "Line 12. Self-employment tax",
    instruction:
      "Add lines 10 and 11, then carry the result to the Schedule 2 line referenced in the form instructions.",
  },
  "f1_22[0]": {
    badge: "13",
    citation: "i1040sse: Part I, line 13",
    fieldLabel: "Line 13. Deduction for one-half of self-employment tax",
    instruction:
      "Multiply line 12 by 50% and carry that deduction to the Schedule 1 line referenced on the form.",
  },
  "f2_2[0]": {
    badge: "15",
    citation: "i1040sse: Part II, line 15",
    fieldLabel: "Line 15. Farm optional method",
    instruction:
      "Enter the smaller of two-thirds of gross farm income or the printed 2025 limit if you qualify for the farm optional method.",
  },
  "f2_3[0]": {
    badge: "16",
    citation: "i1040sse: Part II, line 16",
    fieldLabel: "Line 16. Subtract line 15 from line 14",
    instruction:
      "Subtract line 15 from line 14 to determine the remaining optional-method limit.",
  },
  "f2_4[0]": {
    badge: "17",
    citation: "i1040sse: Part II, line 17",
    fieldLabel: "Line 17. Nonfarm optional method",
    instruction:
      "Enter the smaller of two-thirds of gross nonfarm income or the amount on line 16 if you qualify for the nonfarm optional method.",
  },
};

const scheduleSEPreviewFieldId = "f1_5[0]";

export function createEmptyFormScheduleSESnapshot(): FormScheduleSEDatabaseSnapshot {
  return {
    supportedScheduleCNetProfitPreview: null,
  };
}

export function buildFormScheduleSESnapshot(
  input: FormScheduleSEDatabaseSnapshot,
): FormScheduleSEDatabaseSnapshot {
  return input;
}

export function buildFormScheduleSESlots(
  snapshot: FormScheduleSEDatabaseSnapshot,
  options?: {
    noInstructionNote?: string;
  },
): TaxFormSlotState[] {
  void options;

  return scheduleSEFields.map((field) => buildFormScheduleSESlot(field, snapshot));
}

function buildFormScheduleSESlot(
  field: ExtractedTaxFormFieldAssetEntry,
  snapshot: FormScheduleSEDatabaseSnapshot,
): TaxFormSlotState {
  const override = scheduleSEFieldOverrides[field.id];

  if (!override) {
    return {
      badge: normalizeBadge(field.badge, field.page, field.index),
      citation: "Official form label only",
      contextLines: field.contextLines,
      fieldLabel: field.fieldLabel,
      highlight: field.highlight,
      id: field.id,
      instruction: createDefaultInstruction(field.fieldLabel, field.kind),
      kind: field.kind,
      page: field.page,
      previewValue: null,
      source: "manual",
      sourceNote: getManualSourceNote(field.id, field.kind),
    };
  }

  if (field.id === scheduleSEPreviewFieldId) {
    const preview = snapshot.supportedScheduleCNetProfitPreview;

    return {
      badge: override.badge,
      citation: override.citation,
      contextLines: field.contextLines,
      fieldLabel: override.fieldLabel,
      highlight: field.highlight,
      id: field.id,
      instruction: override.instruction,
      kind: field.kind,
      page: field.page,
      previewValue:
        preview?.netProfitCents !== null && preview?.currency
          ? formatCurrencyLabel(preview.netProfitCents, preview.currency)
          : null,
      source:
        preview?.netProfitCents !== null && preview?.currency ? "calculated" : "manual",
      sourceNote:
        preview?.sourceNote ??
        "Current local data does not support a downstream Schedule C net-profit preview for this exact Schedule SE field yet.",
    };
  }

  return {
    badge: override.badge,
    citation: override.citation,
    contextLines: field.contextLines,
    fieldLabel: override.fieldLabel,
    highlight: field.highlight,
    id: field.id,
    instruction: override.instruction,
    kind: field.kind,
    page: field.page,
    previewValue: null,
    source: "manual",
    sourceNote: getManualSourceNote(field.id, field.kind),
  };
}

function createDefaultInstruction(fieldLabel: string, kind: TaxFormSlotKind) {
  if (kind === "checkbox") {
    return `Check this exact Schedule SE box only if the printed statement labeled "${fieldLabel}" applies on the official form.`;
  }

  if (kind === "amount") {
    return `Enter the amount for "${fieldLabel}" in this exact official Schedule SE field after completing any supporting line or worksheet required by the instructions.`;
  }

  return `Complete this exact Schedule SE field for "${fieldLabel}" as shown on the official form and instructions.`;
}

function getManualSourceNote(fieldId: string, kind: TaxFormSlotKind) {
  if (kind === "checkbox") {
    return "This checkbox still requires manual review because the current local data model does not store the needed eligibility answer.";
  }

  if (fieldId === "f1_1[0]" || fieldId === "f1_2[0]") {
    return "This taxpayer identity field still requires manual entry because the current local data model does not supply it to Schedule SE.";
  }

  if (
    [
      "f1_3[0]",
      "f1_4[0]",
      "f1_8[0]",
      "f1_10[0]",
      "f1_11[0]",
      "f1_14[0]",
      "f1_15[0]",
      "f1_16[0]",
      "f1_17[0]",
      "f2_2[0]",
      "f2_4[0]",
    ].includes(fieldId)
  ) {
    return "This exact field still requires manual entry because the current local data model does not store the needed upstream Schedule SE input.";
  }

  return "Manual review remains required because other upstream Schedule SE inputs may still be incomplete or unsupported.";
}

function normalizeBadge(badge: string, page: number, index: number) {
  if (/^(?:\d+[a-z]?|[a-z]|P\d-\d+)$/.test(badge)) {
    return badge;
  }

  return `P${page}-${String(index).padStart(3, "0")}`;
}
