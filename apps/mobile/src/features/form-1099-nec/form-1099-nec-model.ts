import {
  form1099NecLayoutAspectRatio,
  parsedForm1099NecHighlights,
} from "./form-1099-nec-layout";

export const form1099NecDisclaimerText =
  "the form is based on data provided in the database, it might be insufficient if some records are not provided, please take your own responsibility to ensure the completeness of tax information need to be reported";

export const form1099NecPageAspectRatio = form1099NecLayoutAspectRatio;

export type Form1099NecSlotSource = "database" | "manual";

export type Form1099NecSlotId =
  | "correctedCheckbox"
  | "voidCheckbox"
  | "payerTin"
  | "payerName"
  | "payerStreetAddress"
  | "payerCityStateZip"
  | "payerTelephone"
  | "recipientTin"
  | "recipientName"
  | "recipientStreetAddress"
  | "recipientCityStateZip"
  | "secondTinNotice"
  | "accountNumber"
  | "box1"
  | "box2"
  | "box3"
  | "box4"
  | "box5"
  | "box6"
  | "box7";

export interface Form1099NecRecipientPreview {
  counterpartyId: string;
  currency: string | null;
  grossAmountCents: number;
  grossAmountLabel: string;
  label: string;
  legalName: string;
  recordCount: number;
  taxIdMasked: string | null;
  withholdingAmountCents: number;
}

export interface Form1099NecDatabaseSnapshot {
  currency: string | null;
  grossAmountCents: number | null;
  payerLegalName: string | null;
  recordCount: number;
  recipientLegalName: string | null;
  recipientTinMasked: string | null;
  withholdingAmountCents: number | null;
}

export interface Form1099NecSlotState {
  badge: string;
  citation: string;
  fieldLabel: string;
  highlight: {
    heightPct: number;
    leftPct: number;
    topPct: number;
    widthPct: number;
  };
  id: Form1099NecSlotId;
  instruction: string;
  previewValue: string | null;
  source: Form1099NecSlotSource;
  sourceNote: string;
}

interface BaseSlotDefinition {
  badge: string;
  citation: string;
  fieldLabel: string;
  highlight: Form1099NecSlotState["highlight"];
  id: Form1099NecSlotId;
  instruction: string;
}

const defaultNoInstructionNote =
  "No dedicated paragraph for this labeled line was found in the downloaded i1099mec page, so this slot stays tied to the official form label and current schema coverage.";

const baseSlotDefinitions: Record<Form1099NecSlotId, BaseSlotDefinition> = {
  accountNumber: {
    badge: "Acct",
    citation: "i1099mec: Account Number",
    fieldLabel: "Account number",
    highlight: {
      heightPct: 4.8,
      leftPct: 69,
      topPct: 20.2,
      widthPct: 26,
    },
    id: "accountNumber",
    instruction:
      "Enter an account number only when you file more than one Form 1099-NEC for the same recipient.",
  },
  correctedCheckbox: {
    badge: "Corr",
    citation: "i1099mec: Corrections to forms",
    fieldLabel: "CORRECTED checkbox",
    highlight: {
      heightPct: 4.8,
      leftPct: 51.8,
      topPct: 5.6,
      widthPct: 12.4,
    },
    id: "correctedCheckbox",
    instruction:
      "If you need to correct a Form 1099-NEC already sent to the IRS, use the IRS correction procedures for paper or electronic corrections.",
  },
  box1: {
    badge: "1",
    citation: "i1099mec: Box 1. Nonemployee Compensation",
    fieldLabel: "Box 1. Nonemployee compensation",
    highlight: {
      heightPct: 11.8,
      leftPct: 69,
      topPct: 28.2,
      widthPct: 26,
    },
    id: "box1",
    instruction:
      "Enter nonemployee compensation of $600 or more for services performed for your trade or business by someone who is not your employee.",
  },
  box2: {
    badge: "2",
    citation: "i1099mec: Box 2. Payer Made Direct Sales Totaling $5,000 or More",
    fieldLabel: "Box 2. Direct sales checkbox",
    highlight: {
      heightPct: 7.4,
      leftPct: 69,
      topPct: 40.6,
      widthPct: 26,
    },
    id: "box2",
    instruction:
      'Enter an "X" only for direct sales of $5,000 or more of consumer products for resale; do not enter a dollar amount.',
  },
  box3: {
    badge: "3",
    citation: "i1099mec: Box 3. Excess Golden Parachute Payments",
    fieldLabel: "Box 3. Excess golden parachute payments",
    highlight: {
      heightPct: 8,
      leftPct: 69,
      topPct: 48.8,
      widthPct: 26,
    },
    id: "box3",
    instruction:
      "Enter any excess golden parachute payment amount over the recipient's base amount.",
  },
  box4: {
    badge: "4",
    citation: "i1099mec: Box 4. Federal Income Tax Withheld",
    fieldLabel: "Box 4. Federal income tax withheld",
    highlight: {
      heightPct: 8.2,
      leftPct: 69,
      topPct: 57.8,
      widthPct: 26,
    },
    id: "box4",
    instruction:
      "Enter backup withholding, including withholding required because a payee did not furnish a TIN.",
  },
  box5: {
    badge: "5",
    citation: "i1099mec: Boxes 5–7. State Information",
    fieldLabel: "Box 5. State tax withheld",
    highlight: {
      heightPct: 6.6,
      leftPct: 5.5,
      topPct: 82.8,
      widthPct: 27.5,
    },
    id: "box5",
    instruction:
      "If you withheld state income tax on this payment, you may enter it in box 5; these boxes are not required for the IRS.",
  },
  box6: {
    badge: "6",
    citation: "i1099mec: Boxes 5–7. State Information",
    fieldLabel: "Box 6. State and payer state number",
    highlight: {
      heightPct: 6.6,
      leftPct: 33.4,
      topPct: 82.8,
      widthPct: 34.5,
    },
    id: "box6",
    instruction:
      "In box 6, enter the abbreviated state name and the payer's state identification number when state reporting applies.",
  },
  box7: {
    badge: "7",
    citation: "i1099mec: Boxes 5–7. State Information",
    fieldLabel: "Box 7. State income",
    highlight: {
      heightPct: 6.6,
      leftPct: 68.6,
      topPct: 82.8,
      widthPct: 26.4,
    },
    id: "box7",
    instruction:
      "In box 7, you may enter the amount of the state payment when state reporting applies.",
  },
  payerName: {
    badge: "Payer",
    citation: "Official form label only",
    fieldLabel: "Payer name",
    highlight: {
      heightPct: 5.4,
      leftPct: 4.6,
      topPct: 19.2,
      widthPct: 60.5,
    },
    id: "payerName",
    instruction: defaultNoInstructionNote,
  },
  payerCityStateZip: {
    badge: "P City",
    citation: "Official form label only",
    fieldLabel: "Payer city/state/ZIP line",
    highlight: {
      heightPct: 3.8,
      leftPct: 4.6,
      topPct: 28.2,
      widthPct: 40.4,
    },
    id: "payerCityStateZip",
    instruction: defaultNoInstructionNote,
  },
  payerStreetAddress: {
    badge: "P St",
    citation: "Official form label only",
    fieldLabel: "Payer street address line",
    highlight: {
      heightPct: 3.8,
      leftPct: 4.6,
      topPct: 24.2,
      widthPct: 60.5,
    },
    id: "payerStreetAddress",
    instruction: defaultNoInstructionNote,
  },
  payerTelephone: {
    badge: "P Tel",
    citation: "Official form label only",
    fieldLabel: "Payer telephone number",
    highlight: {
      heightPct: 3.8,
      leftPct: 46.8,
      topPct: 28.2,
      widthPct: 18.3,
    },
    id: "payerTelephone",
    instruction: defaultNoInstructionNote,
  },
  payerTin: {
    badge: "P TIN",
    citation: "i1099mec: Truncating recipient’s TIN on payee statements",
    fieldLabel: "Payer TIN",
    highlight: {
      heightPct: 4.8,
      leftPct: 4.6,
      topPct: 13.2,
      widthPct: 27.5,
    },
    id: "payerTin",
    instruction: "A payer's TIN may not be truncated on any form.",
  },
  recipientCityStateZip: {
    badge: "R City",
    citation: "Official form label only",
    fieldLabel: "Recipient city/state/ZIP line",
    highlight: {
      heightPct: 4.2,
      leftPct: 4.6,
      topPct: 54.4,
      widthPct: 60.5,
    },
    id: "recipientCityStateZip",
    instruction: defaultNoInstructionNote,
  },
  recipientStreetAddress: {
    badge: "R St",
    citation: "Official form label only",
    fieldLabel: "Recipient street address line",
    highlight: {
      heightPct: 4,
      leftPct: 4.6,
      topPct: 50.2,
      widthPct: 60.5,
    },
    id: "recipientStreetAddress",
    instruction: defaultNoInstructionNote,
  },
  recipientName: {
    badge: "Recip",
    citation: "Official form label only",
    fieldLabel: "Recipient name",
    highlight: {
      heightPct: 5.4,
      leftPct: 4.6,
      topPct: 45.2,
      widthPct: 60.5,
    },
    id: "recipientName",
    instruction: defaultNoInstructionNote,
  },
  recipientTin: {
    badge: "R TIN",
    citation: "i1099mec: Recipient's TIN",
    fieldLabel: "Recipient TIN",
    highlight: {
      heightPct: 4.8,
      leftPct: 4.6,
      topPct: 39.4,
      widthPct: 27.5,
    },
    id: "recipientTin",
    instruction:
      "Enter the recipient's TIN with hyphens in the proper format: XXX-XX-XXXX for SSN/ITIN/ATIN or XX-XXXXXXX for EIN.",
  },
  secondTinNotice: {
    badge: "2nd TIN",
    citation: "i1099mec: 2nd TIN Not.",
    fieldLabel: "2nd TIN notice checkbox",
    highlight: {
      heightPct: 4.6,
      leftPct: 69,
      topPct: 13.4,
      widthPct: 26,
    },
    id: "secondTinNotice",
    instruction:
      'Enter an "X" only if the IRS notified you twice within 3 calendar years that the payee provided an incorrect TIN.',
  },
  voidCheckbox: {
    badge: "Void",
    citation: "i1099mec: Corrections to forms",
    fieldLabel: "VOID checkbox",
    highlight: {
      heightPct: 4.8,
      leftPct: 65.4,
      topPct: 5.6,
      widthPct: 11.8,
    },
    id: "voidCheckbox",
    instruction:
      "If you are filing a correction on a paper form, do not check the VOID box because a checked VOID box tells IRS scanning equipment to ignore the form.",
  },
};

export function createEmptyForm1099NecSnapshot(): Form1099NecDatabaseSnapshot {
  return {
    currency: null,
    grossAmountCents: null,
    payerLegalName: null,
    recordCount: 0,
    recipientLegalName: null,
    recipientTinMasked: null,
    withholdingAmountCents: null,
  };
}

export function buildForm1099NecSnapshot(input: {
  payerLegalName: string | null;
  recipient: Form1099NecRecipientPreview | null;
}): Form1099NecDatabaseSnapshot {
  const { payerLegalName, recipient } = input;

  return {
    currency: recipient?.currency ?? null,
    grossAmountCents: recipient ? recipient.grossAmountCents : null,
    payerLegalName,
    recordCount: recipient?.recordCount ?? 0,
    recipientLegalName: recipient?.legalName ?? null,
    recipientTinMasked: recipient?.taxIdMasked ?? null,
    withholdingAmountCents: recipient ? recipient.withholdingAmountCents : null,
  };
}

export function buildForm1099NecSlots(
  snapshot: Form1099NecDatabaseSnapshot,
  options?: {
    noInstructionNote?: string;
  },
): Form1099NecSlotState[] {
  const noInstructionNote = options?.noInstructionNote ?? defaultNoInstructionNote;
  const currency = snapshot.currency ?? "USD";
  const hasRecipientRecords = snapshot.recordCount > 0;

  return [
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.correctedCheckbox), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not track whether this filing is a correction.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.voidCheckbox), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not track VOID-form handling or correction state.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.payerTin), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not store a full payer TIN.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.payerName), noInstructionNote),
      previewValue: snapshot.payerLegalName,
      source: snapshot.payerLegalName ? "database" : "manual",
      sourceNote: snapshot.payerLegalName
        ? "Preview comes from entities.legal_name."
        : "No payer legal name exists in the local entity table.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.payerStreetAddress), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not store payer street-address lines.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.payerCityStateZip), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not store payer city/state/ZIP reporting lines.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.payerTelephone), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not store payer telephone numbers for this form.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.secondTinNotice), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not store second-TIN-notice history.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.recipientTin), noInstructionNote),
      previewValue: snapshot.recipientTinMasked ? `Masked in DB: ${snapshot.recipientTinMasked}` : null,
      source: "manual",
      sourceNote: snapshot.recipientTinMasked
        ? "The database only stores masked TIN metadata, which is not sufficient for filing."
        : "Current local schema does not store a full recipient TIN.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.recipientName), noInstructionNote),
      previewValue: snapshot.recipientLegalName,
      source: snapshot.recipientLegalName ? "database" : "manual",
      sourceNote: snapshot.recipientLegalName
        ? "Preview comes from counterparties.legal_name."
        : "No recipient legal name exists in the local counterparty table.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.recipientStreetAddress), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not store recipient street-address lines.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.recipientCityStateZip), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "Current local schema does not store recipient city/state/ZIP reporting lines.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.accountNumber), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "The current schema does not store a dedicated 1099-NEC account-number field.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.box1), noInstructionNote),
      previewValue: hasRecipientRecords
        ? formatCurrencyLabel(snapshot.grossAmountCents ?? 0, currency)
        : null,
      source: hasRecipientRecords ? "database" : "manual",
      sourceNote: hasRecipientRecords
        ? "Preview is derived from posted or reconciled record gross totals for the selected counterparty."
        : "No linked record totals are available for the selected recipient preview.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.box2), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "The current schema does not identify direct-sales checkbox eligibility.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.box3), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "The current schema does not track golden-parachute calculations.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.box4), noInstructionNote),
      previewValue: hasRecipientRecords
        ? formatCurrencyLabel(snapshot.withholdingAmountCents ?? 0, currency)
        : null,
      source: hasRecipientRecords ? "database" : "manual",
      sourceNote: hasRecipientRecords
        ? "Preview is derived from linked record withholding totals for the selected counterparty."
        : "No linked withholding total is available for the selected recipient preview.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.box5), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "The current schema does not store state withholding amounts for Form 1099-NEC.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.box6), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "The current schema does not store payer state IDs or state abbreviations for this form.",
    },
    {
      ...withInstructionFallback(withParsedHighlight(baseSlotDefinitions.box7), noInstructionNote),
      previewValue: null,
      source: "manual",
      sourceNote: "The current schema does not store state payment amounts for this form.",
    },
  ];
}

export function formatCurrencyLabel(amountCents: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    currency,
    minimumFractionDigits: 2,
    style: "currency",
  });

  return formatter.format(amountCents / 100);
}

function withParsedHighlight(definition: BaseSlotDefinition): BaseSlotDefinition {
  const parsedHighlight = parsedForm1099NecHighlights[definition.id];

  if (!parsedHighlight) {
    return definition;
  }

  return {
    ...definition,
    highlight: parsedHighlight,
  };
}

function withInstructionFallback(
  definition: BaseSlotDefinition,
  noInstructionNote: string,
): BaseSlotDefinition {
  if (definition.citation === "Official form label only") {
    return {
      ...definition,
      instruction: noInstructionNote,
    };
  }

  return definition;
}
