import { form1040Fields } from "./form-1040-fields";
import { parsedForm1040Highlights } from "./form-1040-layout";
import type {
  ExtractedTaxFormFieldAssetEntry,
  TaxFormSlotKind,
  TaxFormSlotState,
} from "../tax-form-common/types";

export const form1040DisclaimerText =
  "the form is based on data provided in the database, it might be insufficient if some records are not provided, please take your own responsibility to ensure the completeness of tax information need to be reported";

export type Form1040DatabaseSnapshot = Record<string, never>;

interface Form1040FieldOverride {
  badge?: string;
  citation?: string;
  fieldLabel?: string;
  instruction?: string;
}

const form1040FieldOverrides: Record<string, Form1040FieldOverride> = {
  "c1_1[0]": {
    badge: "P1-004",
    fieldLabel: "Filed pursuant to section 301.9100-2 checkbox",
    instruction:
      "Check this box only if the return is being filed under section 301.9100-2 as described on the official form and instructions.",
  },
  "c1_2[0]": {
    badge: "P1-005",
    fieldLabel: "Combat zone checkbox",
    instruction:
      "Check this box only if the taxpayer qualifies for the combat-zone treatment referenced in the official form header.",
  },
  "c1_3[0]": {
    badge: "P1-007",
    fieldLabel: "Deceased or other special-status checkbox",
    instruction:
      "Use this checkbox only if the return needs the deceased or other special-status notation printed in the official form header.",
  },
  "c1_4[0]": {
    badge: "P1-014",
    fieldLabel: "Taxpayer deceased checkbox",
    instruction:
      "Check this box only if the taxpayer is deceased and the official form requires the notation beside the taxpayer-name line.",
  },
  "f1_01[0]": {
    badge: "P1-001",
    fieldLabel: "Tax year beginning date field",
    instruction:
      "If this return covers a non-calendar year, enter the tax-year beginning date in this exact official field.",
  },
  "f1_02[0]": {
    badge: "P1-002",
    fieldLabel: "Tax year ending date field",
    instruction:
      "If this return covers a non-calendar year, enter the tax-year ending date in this exact official field.",
  },
  "f1_03[0]": {
    badge: "P1-003",
    fieldLabel: "Tax year ending year suffix field",
    instruction:
      "Complete this short year-suffix field only when the return uses the non-calendar-year header at the top of Form 1040.",
  },
  "f1_04[0]": {
    badge: "P1-006",
    fieldLabel: "Combat zone location or notation field",
    instruction:
      "Complete this exact header field only if the combat-zone checkbox applies and the official form requires an accompanying location or notation.",
  },
  "f1_05[0]": {
    badge: "P1-008",
    fieldLabel: "Special-status date field 1",
  },
  "f1_06[0]": {
    badge: "P1-009",
    fieldLabel: "Special-status date field 2",
  },
  "f1_07[0]": {
    badge: "P1-010",
    fieldLabel: "Special-status date field 3",
  },
  "f1_08[0]": {
    badge: "P1-011",
    fieldLabel: "Special-status date field 4",
  },
  "f1_09[0]": {
    badge: "P1-012",
    fieldLabel: "Special-status date field 5",
  },
  "f1_10[0]": {
    badge: "P1-013",
    fieldLabel: "Special-status date field 6",
  },
};

const form1040FallbackDefinitions = [
  {
    badge: "34",
    citation: "i1040gi: Line 34",
    fieldLabel: "Line 34. Overpayment",
    highlight: parsedForm1040Highlights.line34Overpayment,
    id: "line34OverpaymentFallback",
    instruction:
      "If line 33 is more than line 24, subtract line 24 from line 33 to determine the amount overpaid.",
    kind: "amount" as const,
    page: 2 as const,
  },
  {
    badge: "37",
    citation: "i1040gi: Line 37",
    fieldLabel: "Line 37. Amount you owe",
    highlight: parsedForm1040Highlights.line37AmountOwed,
    id: "line37AmountOwedFallback",
    instruction:
      "Subtract line 33 from line 24 to determine the amount owed, then review the payment instructions printed below the line.",
    kind: "amount" as const,
    page: 2 as const,
  },
];

export function createEmptyForm1040Snapshot(): Form1040DatabaseSnapshot {
  return {};
}

export function buildForm1040Snapshot(input: Form1040DatabaseSnapshot): Form1040DatabaseSnapshot {
  return input;
}

export function buildForm1040Slots(
  snapshot: Form1040DatabaseSnapshot,
  options?: {
    noInstructionNote?: string;
  },
): TaxFormSlotState[] {
  void snapshot;
  void options;

  return [...form1040Fields.map((field) => buildForm1040Slot(field)), ...buildFallbackSlots()].sort(
    (left, right) =>
      left.page - right.page ||
      left.highlight.topPct - right.highlight.topPct ||
      left.highlight.leftPct - right.highlight.leftPct,
  );
}

function buildForm1040Slot(field: ExtractedTaxFormFieldAssetEntry): TaxFormSlotState {
  const override = form1040FieldOverrides[field.id];
  const fieldLabel = override?.fieldLabel ?? getReadableFieldLabel(field);

  return {
    badge: override?.badge ?? normalizeBadge(field.badge, field.page, field.index),
    citation: override?.citation ?? "Official form label only",
    contextLines: field.contextLines,
    fieldLabel,
    highlight: field.highlight,
    id: field.id,
    instruction: override?.instruction ?? createDefaultInstruction(fieldLabel, field.kind),
    kind: field.kind,
    page: field.page,
    previewValue: null,
    source: "manual",
    sourceNote: getManualSourceNote(field.kind),
  };
}

function createDefaultInstruction(fieldLabel: string, kind: TaxFormSlotKind) {
  if (kind === "checkbox") {
    return `Check this exact Form 1040 box only if the statement or filing option labeled "${fieldLabel}" applies on the official form.`;
  }

  if (kind === "amount") {
    return `Enter the amount for "${fieldLabel}" in this exact Form 1040 field after completing any required supporting schedule or worksheet referenced by the official form.`;
  }

  return `Complete this exact Form 1040 field for "${fieldLabel}" as shown on the official form and instructions.`;
}

function getManualSourceNote(kind: TaxFormSlotKind) {
  if (kind === "checkbox") {
    return "This checkbox still requires manual review because the current local data model does not store the needed answer.";
  }

  return "This exact Form 1040 field still requires manual entry because the current preview does not derive it from local records yet.";
}

function buildFallbackSlots(): TaxFormSlotState[] {
  return form1040FallbackDefinitions.map((definition) => ({
    ...definition,
    previewValue: null,
    source: "manual",
    sourceNote: getManualSourceNote(definition.kind),
  }));
}

function getReadableFieldLabel(field: ExtractedTaxFormFieldAssetEntry) {
  const labels = [field.fieldLabel, ...field.contextLines];

  for (const candidate of labels) {
    const normalized = normalizeLabel(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return `Official PDF field ${normalizeBadge(field.badge, field.page, field.index)}`;
}

function normalizeLabel(label: string) {
  const trimmed = label.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("Filed pursuant to section 301.9100-2")) {
    return "Special filing-status notation field";
  }

  if (trimmed.startsWith("For the year Jan. 1")) {
    return "Tax-year date field";
  }

  if (trimmed.startsWith("Deceased MM DD YYYY")) {
    return "Deceased or other status date field";
  }

  if (trimmed.length > 160) {
    return `${trimmed.slice(0, 157)}...`;
  }

  return trimmed;
}

function normalizeBadge(badge: string, page: number, index: number) {
  if (/^(?:\d+[a-z]?|[a-z]|P\d-\d+)$/.test(badge)) {
    return badge;
  }

  return `P${page}-${String(index).padStart(3, "0")}`;
}
