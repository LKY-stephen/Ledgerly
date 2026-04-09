export interface ProductModule {
  slug: string;
  title: string;
  summary: string;
}

export interface WorkflowPrinciple {
  title: string;
  summary: string;
}

export const evidenceParseStatuses = ["pending", "parsed", "failed"] as const;
export type EvidenceParseStatus = (typeof evidenceParseStatuses)[number];

export const evidenceParserKinds = ["openai_gpt", "gemini", "rule_fallback"] as const;
export type EvidenceParserKind = (typeof evidenceParserKinds)[number];

export const parseSourcePlatforms = ["ios", "android", "web"] as const;
export type ParseSourcePlatform = (typeof parseSourcePlatforms)[number];

export const uploadBatchStates = [
  "uploaded",
  "evidence_registered",
  "duplicate_file",
  "parse_pending",
  "parsing",
  "parse_complete",
  "planning",
  "write_proposal_ready",
  "no_match",
  "candidates_generated",
  "review_required",
  "partially_approved",
  "approved",
  "rejected",
  "failed",
] as const;
export type UploadBatchState = (typeof uploadBatchStates)[number];

export const candidateRecordStates = [
  "candidate",
  "validated",
  "proposed_write_pending",
  "needs_review",
  "duplicate",
  "approved",
  "persisted_draft",
  "persisted_final",
  "rejected",
  "failed",
] as const;
export type CandidateRecordState = (typeof candidateRecordStates)[number];

export const workflowWriteProposalStates = [
  "pending_approval",
  "approved",
  "executed",
  "rejected",
  "failed",
  "blocked",
] as const;
export type WorkflowWriteProposalState = (typeof workflowWriteProposalStates)[number];

export const duplicateKinds = [
  "file_duplicate",
  "planner_duplicate_hint",
  "record_duplicate",
  "extraction_supersession",
  "near_duplicate",
] as const;
export type DuplicateKind = (typeof duplicateKinds)[number];

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonObject | JsonPrimitive | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type ParseEvidenceScheme = Record<string, JsonValue>;

export interface EvidenceFieldCandidates {
  amountCents: number | null;
  category: string | null;
  date: string | null;
  description: string | null;
  notes: string | null;
  source: string | null;
  target: string | null;
  taxCategory: string | null;
}

export interface EvidenceExtractedData {
  candidates: EvidenceFieldCandidates;
  debugLog?: string[];
  errorReason?: string | null;
  failureReason?: string | null;
  fields: EvidenceFieldCandidates;
  model?: string | null;
  originData?: JsonValue;
  parser: EvidenceParserKind;
  rawLines: string[];
  rawSummary: string;
  rawText: string;
  scheme?: ParseEvidenceScheme;
  sourceLabel: string;
  warnings: string[];
}

export interface ReceiptParsePayload {
  candidates: EvidenceFieldCandidates;
  fields: EvidenceFieldCandidates;
  model: string | null;
  parser: EvidenceParserKind;
  rawSummary: string;
  rawText: string;
  warnings: string[];
}

export interface ClassifiedParseField {
  confidence: "high" | "low" | "medium";
  field: string;
  reason: string;
  status: "confirmed" | "conflicting" | "missing" | "uncertain";
  value: JsonValue;
}

export interface PlannerReadTask {
  input?: JsonObject;
  readTaskId: string;
  rationale: string;
  result?: JsonValue;
  status: "completed" | "failed" | "pending";
  taskType: "counterparty_lookup" | "duplicate_lookup";
}

export interface CounterpartyResolution {
  confidence: "high" | "low" | "medium";
  displayName: string;
  matchedCounterpartyIds: string[];
  role: "source" | "target";
  status: "ambiguous" | "matched" | "proposed_new";
}

export interface CandidateRecordPayload {
  amountCents: number | null;
  currency: string;
  date: string | null;
  description: string | null;
  evidenceId: string;
  recordKind: "expense" | "income" | "personal_spending";
  sourceCounterpartyId?: string | null;
  sourceLabel: string | null;
  targetCounterpartyId?: string | null;
  targetLabel: string | null;
  taxCategoryCode?: string | null;
}

export interface WorkflowWriteProposalPayload {
  candidateId?: string;
  counterpartyId?: string;
  dependencyIds?: string[];
  proposalType:
    | "create_counterparty"
    | "persist_candidate_record"
    | "update_candidate_record"
    | "update_workflow_state";
  reviewFields?: Array<"amount" | "date" | "source" | "target">;
  role?: "source" | "target";
  values: JsonObject;
}

export interface ReceiptPlannerPayload {
  businessEvents: string[];
  candidateRecords: CandidateRecordPayload[];
  classifiedFacts: ClassifiedParseField[];
  counterpartyResolutions: CounterpartyResolution[];
  duplicateHints: DuplicateKind[];
  readTasks: PlannerReadTask[];
  summary: string;
  warnings: string[];
  writeProposals: WorkflowWriteProposalPayload[];
}

export interface PlannerSummary {
  businessEvents: string[];
  candidateRecords: CandidateRecordPayload[];
  classifiedFacts: ClassifiedParseField[];
  counterpartyResolutions: CounterpartyResolution[];
  duplicateHints: DuplicateKind[];
  readTasks: PlannerReadTask[];
  summary: string;
  warnings: string[];
  writeProposals: WorkflowWriteProposalPayload[];
}

export type ParseOriginDataApiSuccess = ReceiptParsePayload;

/** @deprecated Legacy compatibility wrapper. Prefer `ReceiptParsePayload` plus local projection. */
export interface MapEvidenceSchemeApiSuccess {
  scheme: ParseEvidenceScheme;
}

export interface ParseEvidenceApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function normalizeReceiptParsePayload(
  value: JsonValue,
  input: {
    defaultModel?: string | null;
    defaultParser?: EvidenceParserKind;
  } = {},
): ReceiptParsePayload | null {
  const record = asJsonObject(value);

  if (!record) {
    return null;
  }

  const fields = normalizeEvidenceFieldCandidates(record.fields) ?? normalizeEvidenceFieldCandidates(record.candidates);
  const candidates = normalizeEvidenceFieldCandidates(record.candidates) ?? fields;
  const rawText = asOptionalString(record.rawText) ?? "";
  const rawSummary = asOptionalString(record.rawSummary) ?? "";
  const warnings = asRequiredStringArray(record.warnings) ?? coerceToStringArray(record.warnings);

  if (!fields || !candidates) {
    return null;
  }

  return {
    candidates,
    fields,
    model: asOptionalString(record.model) ?? input.defaultModel ?? null,
    parser: normalizeEvidenceParserKind(record.parser, input.defaultParser ?? "openai_gpt"),
    rawSummary,
    rawText,
    warnings,
  };
}

export function normalizeReceiptPlannerPayload(value: JsonValue): ReceiptPlannerPayload | null {
  const record = asJsonObject(value);

  if (!record) {
    return null;
  }

  const businessEvents = asRequiredStringArray(record.businessEvents);
  const classifiedFacts = normalizeClassifiedParseFields(record.classifiedFacts);
  const readTasks = normalizePlannerReadTasks(record.readTasks);
  const counterpartyResolutions = normalizeCounterpartyResolutions(record.counterpartyResolutions);
  const candidateRecords = normalizeCandidateRecordPayloads(record.candidateRecords);
  const writeProposals = normalizeWorkflowWriteProposalPayloads(record.writeProposals);
  const summary = asRequiredString(record.summary);
  const warnings = asRequiredStringArray(record.warnings);

  if (
    businessEvents === null ||
    classifiedFacts === null ||
    readTasks === null ||
    counterpartyResolutions === null ||
    candidateRecords === null ||
    writeProposals === null ||
    summary === null ||
    warnings === null
  ) {
    return null;
  }

  const duplicateHints = normalizeDuplicateKinds(record.duplicateHints) ?? [];

  return {
    businessEvents,
    candidateRecords,
    classifiedFacts,
    counterpartyResolutions,
    duplicateHints,
    readTasks,
    summary,
    warnings,
    writeProposals,
  };
}

export function projectReceiptParsePayloadToLegacyScheme(input: {
  payload: ReceiptParsePayload;
  template: ParseEvidenceScheme;
}): ParseEvidenceScheme {
  const nextScheme: ParseEvidenceScheme = {};

  for (const [key, fallbackValue] of Object.entries(input.template)) {
    nextScheme[key] = projectLegacySchemeValue(key, input.payload) ?? fallbackValue;
  }

  return nextScheme;
}

function projectLegacySchemeValue(key: string, payload: ReceiptParsePayload): JsonValue | undefined {
  switch (key) {
    case "amount_cents":
    case "amountCents":
      return payload.fields.amountCents;
    case "description":
      return payload.fields.description;
    case "memo":
    case "notes":
      return payload.fields.notes;
    case "occurred_on":
    case "occurredOn":
    case "date":
      return payload.fields.date;
    case "record_kind":
    case "recordKind":
      return mapLedgerCategoryToRecordKind(payload.fields.category);
    case "source_label":
    case "sourceLabel":
    case "source":
      return payload.fields.source;
    case "target_label":
    case "targetLabel":
    case "target":
      return payload.fields.target;
    case "tax_category_code":
    case "taxCategoryCode":
    case "taxCategory":
      return payload.fields.taxCategory;
    default:
      return undefined;
  }
}

function mapLedgerCategoryToRecordKind(
  category: EvidenceFieldCandidates["category"],
): CandidateRecordPayload["recordKind"] | null {
  if (category === "income") {
    return "income";
  }

  if (category === "spending" || category === "personal_spending") {
    return "personal_spending";
  }

  if (category === "expense") {
    return "expense";
  }

  return null;
}

function normalizeEvidenceFieldCandidates(value: JsonValue | undefined): EvidenceFieldCandidates | null {
  const record = asJsonObject(value);

  if (!record) {
    return null;
  }

  return {
    amountCents: coerceToInteger(record.amountCents ?? record.amount_cents),
    category: coerceToString(record.category),
    date: coerceToString(record.date),
    description: coerceToString(record.description),
    notes: coerceToString(record.notes),
    source: coerceToString(record.source),
    target: coerceToString(record.target),
    taxCategory: coerceToString(record.taxCategory ?? record.tax_category),
  };
}

function normalizeClassifiedParseFields(value: JsonValue | undefined): ClassifiedParseField[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: ClassifiedParseField[] = [];

  for (const item of value) {
    const record = asJsonObject(item);
    const field = asRequiredString(record?.field);
    const reason = asRequiredString(record?.reason);
    const confidence = normalizeConfidence(record?.confidence);
    const status = normalizeClassifiedStatus(record?.status);

    if (!record || field === null || reason === null || confidence === null || status === null) {
      return null;
    }

    normalized.push({
      confidence,
      field,
      reason,
      status,
      value: record.value ?? null,
    });
  }

  return normalized;
}

function normalizePlannerReadTasks(value: JsonValue | undefined): PlannerReadTask[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: PlannerReadTask[] = [];

  for (const item of value) {
    const record = asJsonObject(item);
    const readTaskId = asRequiredString(record?.readTaskId);
    const rationale = asRequiredString(record?.rationale);
    const status = normalizeReadTaskStatus(record?.status);
    const taskType = normalizeReadTaskType(record?.taskType);

    if (!record || readTaskId === null || rationale === null || status === null || taskType === null) {
      return null;
    }

    normalized.push({
      input: asJsonObject(record.input) ?? undefined,
      readTaskId,
      rationale,
      result: record.result,
      status,
      taskType,
    });
  }

  return normalized;
}

function normalizeCounterpartyResolutions(value: JsonValue | undefined): CounterpartyResolution[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: CounterpartyResolution[] = [];

  for (const item of value) {
    const record = asJsonObject(item);
    const confidence = normalizeConfidence(record?.confidence);
    const displayName = asRequiredString(record?.displayName);
    const matchedCounterpartyIds = asRequiredStringArray(record?.matchedCounterpartyIds);
    const role = normalizeResolutionRole(record?.role);
    const status = normalizeResolutionStatus(record?.status);

    if (
      !record ||
      confidence === null ||
      displayName === null ||
      matchedCounterpartyIds === null ||
      role === null ||
      status === null
    ) {
      return null;
    }

    normalized.push({
      confidence,
      displayName,
      matchedCounterpartyIds,
      role,
      status,
    });
  }

  return normalized;
}

function normalizeCandidateRecordPayloads(value: JsonValue | undefined): CandidateRecordPayload[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: CandidateRecordPayload[] = [];

  for (const item of value) {
    const record = asJsonObject(item);
    const currency = asRequiredString(record?.currency);
    const evidenceId = asRequiredString(record?.evidenceId);
    const recordKind = normalizeRecordKind(record?.recordKind);

    if (!record || currency === null || evidenceId === null || recordKind === null) {
      return null;
    }

    normalized.push({
      amountCents: asOptionalInteger(record.amountCents),
      currency,
      date: asOptionalString(record.date),
      description: asOptionalString(record.description),
      evidenceId,
      recordKind,
      sourceCounterpartyId: asOptionalString(record.sourceCounterpartyId),
      sourceLabel: asOptionalString(record.sourceLabel),
      targetCounterpartyId: asOptionalString(record.targetCounterpartyId),
      targetLabel: asOptionalString(record.targetLabel),
      taxCategoryCode: asOptionalString(record.taxCategoryCode),
    });
  }

  return normalized;
}

function normalizeWorkflowWriteProposalPayloads(
  value: JsonValue | undefined,
): WorkflowWriteProposalPayload[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: WorkflowWriteProposalPayload[] = [];

  for (const item of value) {
    const record = asJsonObject(item);
    const proposalType = normalizeProposalType(record?.proposalType);
    const values = asJsonObject(record?.values);
    const dependencyIds = asOptionalStringArray(record?.dependencyIds);
    const reviewFields = normalizeReviewFields(record?.reviewFields);
    const role = normalizeResolutionRole(record?.role);

    if (!record || proposalType === null || values === null) {
      return null;
    }

    normalized.push({
      candidateId: asOptionalString(record.candidateId) ?? undefined,
      counterpartyId: asOptionalString(record.counterpartyId) ?? undefined,
      dependencyIds: dependencyIds ?? undefined,
      proposalType,
      reviewFields: reviewFields ?? undefined,
      role: role ?? undefined,
      values,
    });
  }

  return normalized;
}

function normalizeDuplicateKinds(value: JsonValue | undefined): DuplicateKind[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: DuplicateKind[] = [];

  for (const item of value) {
    const duplicateKind = normalizeDuplicateKind(item);

    if (duplicateKind === null) {
      return null;
    }

    normalized.push(duplicateKind);
  }

  return normalized;
}

function normalizeEvidenceParserKind(value: JsonValue | undefined, fallback: EvidenceParserKind): EvidenceParserKind {
  return value === "openai_gpt" || value === "gemini" || value === "rule_fallback" ? value : fallback;
}

function normalizeConfidence(value: JsonValue | undefined): ClassifiedParseField["confidence"] | null {
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

function normalizeClassifiedStatus(value: JsonValue | undefined): ClassifiedParseField["status"] | null {
  return value === "confirmed" || value === "conflicting" || value === "missing" || value === "uncertain"
    ? value
    : null;
}

function normalizeReadTaskStatus(value: JsonValue | undefined): PlannerReadTask["status"] | null {
  return value === "completed" || value === "failed" || value === "pending" ? value : null;
}

function normalizeReadTaskType(value: JsonValue | undefined): PlannerReadTask["taskType"] | null {
  return value === "counterparty_lookup" || value === "duplicate_lookup" ? value : null;
}

function normalizeResolutionRole(value: JsonValue | undefined): CounterpartyResolution["role"] | null {
  return value === "source" || value === "target" ? value : null;
}

function normalizeResolutionStatus(value: JsonValue | undefined): CounterpartyResolution["status"] | null {
  return value === "ambiguous" || value === "matched" || value === "proposed_new" ? value : null;
}

function normalizeRecordKind(value: JsonValue | undefined): CandidateRecordPayload["recordKind"] | null {
  return value === "expense" || value === "income" || value === "personal_spending" ? value : null;
}

function normalizeProposalType(value: JsonValue | undefined): WorkflowWriteProposalPayload["proposalType"] | null {
  return value === "create_counterparty" ||
    value === "persist_candidate_record" ||
    value === "update_candidate_record" ||
    value === "update_workflow_state"
    ? value
    : null;
}

function normalizeReviewFields(
  value: JsonValue | undefined,
): Array<"amount" | "date" | "source" | "target"> | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: Array<"amount" | "date" | "source" | "target"> = [];

  for (const item of value) {
    if (item === "amount" || item === "date" || item === "source" || item === "target") {
      normalized.push(item);
      continue;
    }

    return null;
  }

  return normalized;
}

function normalizeDuplicateKind(value: JsonValue | undefined): DuplicateKind | null {
  return value === "file_duplicate" ||
    value === "planner_duplicate_hint" ||
    value === "record_duplicate" ||
    value === "extraction_supersession" ||
    value === "near_duplicate"
    ? value
    : null;
}

function asJsonObject(value: JsonValue | undefined): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
}

function asRequiredString(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function asOptionalString(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function asOptionalInteger(value: JsonValue | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return null;
}

function asRequiredStringArray(value: JsonValue | undefined): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }

    normalized.push(item);
  }

  return normalized;
}

function asOptionalStringArray(value: JsonValue | undefined): string[] | null {
  if (value === undefined) {
    return [];
  }

  return asRequiredStringArray(value);
}

function coerceToInteger(value: JsonValue | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }

  return null;
}

function coerceToString(value: JsonValue | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function coerceToStringArray(value: JsonValue | undefined): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

export const productModules: ProductModule[] = [
  {
    slug: "revenue-hub",
    title: "Revenue Hub",
    summary: "Aggregate creator earnings from multiple platforms into one ledger.",
  },
  {
    slug: "invoice-desk",
    title: "Invoice Desk",
    summary: "Track invoice issuance, payout expectations, and collection status.",
  },
  {
    slug: "cost-journal",
    title: "Cost Journal",
    summary: "Record operating costs, tools, talent, and campaign spending.",
  },
  {
    slug: "tax-forecast",
    title: "Tax Forecast",
    summary: "Estimate taxes and cash obligations before payment deadlines arrive.",
  },
  {
    slug: "stablecoin-settlement",
    title: "Stablecoin Settlement",
    summary: "Prepare future payout flows for compliant stablecoin collections.",
  },
];

export const supportedPlatforms = [
  "YouTube",
  "TikTok",
  "Bilibili",
  "X",
  "Patreon",
  "Shopify",
] as const;

export type SupportedPlatform = (typeof supportedPlatforms)[number];

export const workflowPrinciples: WorkflowPrinciple[] = [
  {
    title: "Local-first finance ops",
    summary: "Creators can draft, inspect, and organize their records without waiting on a backend.",
  },
  {
    title: "Structured plus file-based storage",
    summary:
      "Operational records and evidence metadata live in SQLite while evidence objects and exports live in a dedicated vault.",
  },
  {
    title: "Contract-driven changes",
    summary: "Storage tables, vault rules, docs, and tests move together as one change.",
  },
];
