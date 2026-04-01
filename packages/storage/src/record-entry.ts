import type { WritableStorageDatabase } from "./database";

const businessUseFullBps = 10_000;
const expenseFallbackTaxCategoryCode = "schedule-c-other-expense";

export const standardReceiptUserClassifications = [
  "income",
  "expense",
  "personal_spending",
] as const;
export type StandardReceiptUserClassification =
  (typeof standardReceiptUserClassifications)[number];

export const recordEntryModes = ["standard_receipt", "manual", "legacy"] as const;
export type RecordEntryMode = (typeof recordEntryModes)[number];

export const recordEntryClassificationStatuses = ["resolved", "review_required", "legacy"] as const;
export type RecordEntryClassificationStatus =
  (typeof recordEntryClassificationStatuses)[number];

export interface StandardReceiptEntryInput {
  amountCents: number;
  businessUseBps?: number | null;
  currency: string;
  description: string;
  entityId: string;
  evidenceIds?: string[];
  memo?: string | null;
  occurredOn: string;
  source: string;
  target: string;
  userClassification: StandardReceiptUserClassification;
}

export interface StandardReceiptPersistenceContext {
  createdAt: string;
  recordId: string;
  recordStatus?: string;
  sourceCounterpartyId?: string | null;
  sourceSystem: string;
  targetCounterpartyId?: string | null;
  updatedAt: string;
}

export interface StandardReceiptRecordDraft {
  amountCents: number;
  businessUseBps: number;
  categoryCode: string | null;
  createdAt: string;
  currency: string;
  description: string;
  entityId: string;
  memo: string | null;
  occurredOn: string;
  recordId: string;
  recordKind: "expense" | "income" | "personal_spending";
  recordStatus: string;
  sourceCounterpartyId: string | null;
  sourceLabel: string;
  sourceSystem: string;
  subcategoryCode: string | null;
  targetCounterpartyId: string | null;
  targetLabel: string;
  taxCategoryCode: string | null;
  taxLineCode: string | null;
  updatedAt: string;
}

export interface RecordEntryClassificationDraft {
  classificationStatus: RecordEntryClassificationStatus;
  createdAt: string;
  entryMode: RecordEntryMode;
  recordId: string;
  resolverCode: string | null;
  resolverNote: string | null;
  updatedAt: string;
  userClassification: StandardReceiptUserClassification | "other";
}

export interface TaxYearProfileDraft {
  accountingMethod: "cash";
  createdAt: string;
  entityId: string;
  taxYear: number;
  updatedAt: string;
}

export interface ResolvedStandardReceiptEntry {
  classification: RecordEntryClassificationDraft;
  evidenceIds: string[];
  input: StandardReceiptEntryInput;
  record: StandardReceiptRecordDraft;
  taxYearProfile: TaxYearProfileDraft;
}

export function extractTaxYearFromDate(dateValue: string): number {
  const normalizedDate = dateValue.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error(`Expected an ISO date like YYYY-MM-DD but received "${dateValue}".`);
  }

  return Number.parseInt(normalizedDate.slice(0, 4), 10);
}

export function resolveStandardReceiptEntry(
  input: StandardReceiptEntryInput,
  context: StandardReceiptPersistenceContext,
): ResolvedStandardReceiptEntry {
  const amountCents = normalizeAmountCents(input.amountCents);
  const occurredOn = requireNonEmpty(input.occurredOn, "occurredOn");
  const currency = requireNonEmpty(input.currency, "currency").toUpperCase();
  const description = requireNonEmpty(input.description, "description");
  const entityId = requireNonEmpty(input.entityId, "entityId");
  const sourceLabel = requireNonEmpty(input.source, "source");
  const targetLabel = requireNonEmpty(input.target, "target");
  const recordId = requireNonEmpty(context.recordId, "recordId");
  const sourceSystem = requireNonEmpty(context.sourceSystem, "sourceSystem");
  const createdAt = requireNonEmpty(context.createdAt, "createdAt");
  const updatedAt = requireNonEmpty(context.updatedAt, "updatedAt");
  const evidenceIds = normalizeEvidenceIds(input.evidenceIds);
  const memo = normalizeNullableText(input.memo);
  const recordStatus = normalizeRecordStatus(context.recordStatus);
  const taxYear = extractTaxYearFromDate(occurredOn);

  if (input.userClassification === "income") {
    return {
      classification: {
        classificationStatus: "resolved",
        createdAt,
        entryMode: "standard_receipt",
        recordId,
        resolverCode: "income_line1_default",
        resolverNote: "Resolved from the simplified income receipt path.",
        updatedAt,
        userClassification: input.userClassification,
      },
      evidenceIds,
      input,
      record: {
        amountCents,
        businessUseBps: businessUseFullBps,
        categoryCode: null,
        createdAt,
        currency,
        description,
        entityId,
        memo,
        occurredOn,
        recordId,
        recordKind: "income",
        recordStatus,
        sourceCounterpartyId: normalizeNullableText(context.sourceCounterpartyId),
        sourceLabel,
        sourceSystem,
        subcategoryCode: null,
        targetCounterpartyId: normalizeNullableText(context.targetCounterpartyId),
        targetLabel,
        taxCategoryCode: null,
        taxLineCode: "line1",
        updatedAt,
      },
      taxYearProfile: {
        accountingMethod: "cash",
        createdAt,
        entityId,
        taxYear,
        updatedAt,
      },
    };
  }

  if (input.userClassification === "expense") {
    return {
      classification: {
        classificationStatus: "resolved",
        createdAt,
        entryMode: "standard_receipt",
        recordId,
        resolverCode: "expense_line27a_default",
        resolverNote:
          "Resolved from the simplified expense receipt path with the safe Schedule C Part V line27a fallback.",
        updatedAt,
        userClassification: input.userClassification,
      },
      evidenceIds,
      input,
      record: {
        amountCents,
        businessUseBps: normalizeBusinessUseBps(input.businessUseBps),
        categoryCode: null,
        createdAt,
        currency,
        description,
        entityId,
        memo,
        occurredOn,
        recordId,
        recordKind: "expense",
        recordStatus,
        sourceCounterpartyId: normalizeNullableText(context.sourceCounterpartyId),
        sourceLabel,
        sourceSystem,
        subcategoryCode: null,
        targetCounterpartyId: normalizeNullableText(context.targetCounterpartyId),
        targetLabel,
        taxCategoryCode: expenseFallbackTaxCategoryCode,
        taxLineCode: "line27a",
        updatedAt,
      },
      taxYearProfile: {
        accountingMethod: "cash",
        createdAt,
        entityId,
        taxYear,
        updatedAt,
      },
    };
  }

  return {
    classification: {
      classificationStatus: "resolved",
      createdAt,
      entryMode: "standard_receipt",
      recordId,
      resolverCode: "personal_spending_default",
      resolverNote: "Resolved from the simplified personal-spending path and excluded from tax totals.",
      updatedAt,
      userClassification: input.userClassification,
    },
    evidenceIds,
    input,
    record: {
      amountCents,
      businessUseBps: 0,
      categoryCode: null,
      createdAt,
      currency,
      description,
      entityId,
      memo,
      occurredOn,
      recordId,
      recordKind: "personal_spending",
      recordStatus,
      sourceCounterpartyId: normalizeNullableText(context.sourceCounterpartyId),
      sourceLabel,
      sourceSystem,
      subcategoryCode: null,
      targetCounterpartyId: normalizeNullableText(context.targetCounterpartyId),
      targetLabel,
      taxCategoryCode: null,
      taxLineCode: null,
      updatedAt,
    },
    taxYearProfile: {
      accountingMethod: "cash",
      createdAt,
      entityId,
      taxYear,
      updatedAt,
    },
  };
}

export async function persistResolvedStandardReceiptEntry(
  database: WritableStorageDatabase,
  resolvedEntry: ResolvedStandardReceiptEntry,
): Promise<void> {
  const { classification, evidenceIds, record, taxYearProfile } = resolvedEntry;

  await database.runAsync(
    `INSERT INTO records (
      record_id,
      entity_id,
      record_status,
      source_system,
      description,
      memo,
      occurred_on,
      currency,
      amount_cents,
      source_label,
      target_label,
      source_counterparty_id,
      target_counterparty_id,
      record_kind,
      category_code,
      subcategory_code,
      tax_category_code,
      tax_line_code,
      business_use_bps,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    record.recordId,
    record.entityId,
    record.recordStatus,
    record.sourceSystem,
    record.description,
    record.memo,
    record.occurredOn,
    record.currency,
    record.amountCents,
    record.sourceLabel,
    record.targetLabel,
    record.sourceCounterpartyId,
    record.targetCounterpartyId,
    record.recordKind,
    record.categoryCode,
    record.subcategoryCode,
    record.taxCategoryCode,
    record.taxLineCode,
    record.businessUseBps,
    record.createdAt,
    record.updatedAt,
  );

  await database.runAsync(
    `INSERT INTO record_entry_classifications (
      record_id,
      entry_mode,
      user_classification,
      classification_status,
      resolver_code,
      resolver_note,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    classification.recordId,
    classification.entryMode,
    classification.userClassification,
    classification.classificationStatus,
    classification.resolverCode,
    classification.resolverNote,
    classification.createdAt,
    classification.updatedAt,
  );

  await database.runAsync(
    `INSERT INTO tax_year_profiles (
      entity_id,
      tax_year,
      accounting_method,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(entity_id, tax_year) DO UPDATE SET
      accounting_method = excluded.accounting_method,
      updated_at = excluded.updated_at;`,
    taxYearProfile.entityId,
    taxYearProfile.taxYear,
    taxYearProfile.accountingMethod,
    taxYearProfile.createdAt,
    taxYearProfile.updatedAt,
  );

  for (const [index, evidenceId] of evidenceIds.entries()) {
    await database.runAsync(
      `INSERT INTO record_evidence_links (
        record_id,
        evidence_id,
        link_role,
        is_primary,
        created_at
      ) VALUES (?, ?, ?, ?, ?);`,
      record.recordId,
      evidenceId,
      "supporting",
      index === 0 ? 1 : 0,
      record.createdAt,
    );
  }
}

function normalizeAmountCents(amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Standard receipt entries require a positive integer amount in cents.");
  }

  return amountCents;
}

function normalizeBusinessUseBps(businessUseBps: number | null | undefined): number {
  if (businessUseBps == null) {
    return businessUseFullBps;
  }

  if (!Number.isInteger(businessUseBps) || businessUseBps < 0 || businessUseBps > businessUseFullBps) {
    throw new Error("businessUseBps must be an integer between 0 and 10000.");
  }

  return businessUseBps;
}

function normalizeEvidenceIds(evidenceIds: string[] | undefined): string[] {
  if (!evidenceIds) {
    return [];
  }

  return evidenceIds
    .map((evidenceId) => evidenceId.trim())
    .filter((evidenceId, index, values) => evidenceId.length > 0 && values.indexOf(evidenceId) === index);
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeRecordStatus(recordStatus: string | undefined): string {
  const normalizedStatus = recordStatus?.trim();
  return normalizedStatus ? normalizedStatus : "posted";
}

function requireNonEmpty(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Expected a non-empty ${fieldName}.`);
  }

  return normalizedValue;
}
