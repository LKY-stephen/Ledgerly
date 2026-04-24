import type {
  CandidateRecordPayload,
  CandidateRecordState,
  DuplicateKind,
  EvidenceExtractedData,
  EvidenceParseStatus,
  EvidenceParserKind,
  JsonObject,
  JsonValue,
  PlannerReadTask,
  PlannerSummary,
  ReceiptParsePayload,
  ReceiptPlannerPayload,
  UploadBatchState,
  WorkflowWriteProposalPayload,
  WorkflowWriteProposalState,
} from "@ledgerly/schemas";
import type {
  FileVaultCollectionSlug,
  LocalStorageBootstrapManifest,
  LocalStorageBootstrapPlan,
  LocalStorageOverview,
  ResolvedStandardReceiptEntry,
  ScheduleCAggregationResult,
  ScheduleCCandidateRecord,
  StandardReceiptEntryInput,
  StandardReceiptPersistenceContext,
  SupportedScheduleCNetProfitPreview,
  TaxHelperEvidenceFileLink,
  TaxYearDateRange,
} from "@ledgerly/storage";

export type {
  CandidateRecordPayload,
  CandidateRecordState,
  DuplicateKind,
  EvidenceExtractedData,
  EvidenceParseStatus,
  EvidenceParserKind,
  FileVaultCollectionSlug,
  JsonObject,
  JsonValue,
  LocalStorageBootstrapManifest,
  LocalStorageBootstrapPlan,
  LocalStorageOverview,
  PlannerReadTask,
  PlannerSummary,
  ReceiptParsePayload,
  ReceiptPlannerPayload,
  ResolvedStandardReceiptEntry,
  ScheduleCAggregationResult,
  ScheduleCCandidateRecord,
  StandardReceiptEntryInput,
  StandardReceiptPersistenceContext,
  SupportedScheduleCNetProfitPreview,
  TaxHelperEvidenceFileLink,
  TaxYearDateRange,
  UploadBatchState,
  WorkflowWriteProposalPayload,
  WorkflowWriteProposalState,
};

export interface LedgerlySdkConfig {
  defaultEntityId?: string;
  defaultCurrency?: string;
}

export interface RecordRow {
  recordId: string;
  entityId: string;
  recordStatus: string;
  sourceSystem: string;
  description: string;
  memo: string | null;
  occurredOn: string;
  currency: string;
  amountCents: number;
  sourceLabel: string;
  targetLabel: string;
  sourceCounterpartyId: string | null;
  targetCounterpartyId: string | null;
  recordKind: string;
  categoryCode: string | null;
  subcategoryCode: string | null;
  taxCategoryCode: string | null;
  taxLineCode: string | null;
  businessUseBps: number;
  createdAt: string;
  updatedAt: string;
}

export interface CounterpartyRow {
  counterpartyId: string;
  entityId: string;
  counterpartyType: string;
  displayName: string;
  rawReference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface EntityRow {
  entityId: string;
  legalName: string;
  entityType: string;
  baseCurrency: string;
  defaultTimezone: string;
  createdAt: string;
}

export interface MonthlyMetrics {
  incomeCents: number;
  outflowCents: number;
  netCents: number;
}

export interface TrendPoint {
  date: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

export interface ListRecordsFilter {
  entityId?: string;
  recordKind?: string;
  recordKinds?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRecordInput {
  amountCents: number;
  currency?: string;
  description: string;
  memo?: string;
  occurredOn: string;
  source: string;
  target: string;
  recordKind: "income" | "non_business_income" | "expense" | "personal_spending";
  entityId?: string;
  taxCategoryCode?: string;
  taxLineCode?: string;
}

export interface UpdateRecordInput {
  description?: string;
  memo?: string;
  amountCents?: number;
  occurredOn?: string;
  sourceLabel?: string;
  targetLabel?: string;
  recordKind?: string;
  recordStatus?: string;
  categoryCode?: string | null;
  taxCategoryCode?: string | null;
  taxLineCode?: string | null;
}

export interface CreateCounterpartyInput {
  entityId?: string;
  counterpartyType: string;
  displayName: string;
  rawReference?: string;
  notes?: string;
}

export interface ContextSnapshot {
  entityName: string;
  entityId: string;
  totalRecords: number;
  monthlyMetrics: MonthlyMetrics;
  recentRecords: RecordRow[];
  counterpartyCount: number;
}

export interface RecordDateRangeSearchInput {
  entityId?: string;
  startOn?: string;
  endOn?: string;
  endExclusiveOn?: string;
  limit?: number;
  offset?: number;
  recordKinds?: string[];
  recordStatuses?: string[];
}

export interface EvidenceFilter {
  entityId?: string;
  limit?: number;
  offset?: number;
  parseStatus?: EvidenceParseStatus;
}

export interface EvidenceRow {
  evidenceId: string;
  entityId: string;
  evidenceKind: string;
  filePath: string;
  parseStatus: EvidenceParseStatus;
  extractedData: EvidenceExtractedData | null;
  capturedDate: string;
  capturedAmountCents: number;
  capturedSource: string;
  capturedTarget: string;
  capturedDescription: string;
  sourceSystem: string;
  createdAt: string;
}

export interface EvidenceFileRow {
  evidenceFileId: string;
  evidenceId: string;
  vaultCollection: FileVaultCollectionSlug;
  relativePath: string;
  originalFileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256Hex: string;
  capturedAt: string;
  isPrimary: boolean;
}

export interface UploadBatchFilter {
  entityId?: string;
  limit?: number;
  offset?: number;
  states?: UploadBatchState[];
}

export interface UploadBatchRow {
  batchId: string;
  evidenceId: string | null;
  entityId: string;
  sourceSystem: string;
  state: UploadBatchState;
  duplicateKind: DuplicateKind | null;
  duplicateOfEvidenceId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionRunFilter {
  batchId?: string;
  evidenceId?: string;
}

export interface ExtractionRunRow {
  extractionRunId: string;
  batchId: string;
  evidenceId: string;
  state: string;
  parserKind: EvidenceParserKind | string;
  model: string | null;
  parsePayload: ReceiptParsePayload | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerRunFilter {
  batchId?: string;
  evidenceId?: string;
}

export interface PlannerRunRow {
  plannerRunId: string;
  batchId: string;
  evidenceId: string;
  extractionRunId: string;
  state: string;
  plannerPayload: ReceiptPlannerPayload | null;
  summary: PlannerSummary | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerReadTaskRow extends PlannerReadTask {
  createdAt: string;
  plannerRunId: string;
  updatedAt: string;
}

export interface CandidateRecordFilter {
  batchId?: string;
  evidenceId?: string;
  plannerRunId?: string;
  states?: CandidateRecordState[];
}

export interface WorkflowCandidateRecordRow {
  candidateId: string;
  batchId: string;
  plannerRunId: string;
  evidenceId: string;
  state: CandidateRecordState;
  payload: CandidateRecordPayload;
  review: JsonObject | null;
  recordId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowWriteProposalFilter {
  candidateId?: string;
  plannerRunId?: string;
  proposalType?: WorkflowWriteProposalPayload["proposalType"];
  states?: WorkflowWriteProposalState[];
}

export interface WorkflowWriteProposalRow {
  writeProposalId: string;
  plannerRunId: string;
  candidateId: string | null;
  proposalType: WorkflowWriteProposalPayload["proposalType"];
  state: WorkflowWriteProposalState;
  approvalRequired: boolean;
  dependencyIds: string[];
  payload: JsonObject;
  rationale: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowAuditEventFilter {
  batchId?: string;
  candidateId?: string;
  plannerRunId?: string;
  writeProposalId?: string;
  limit?: number;
  offset?: number;
}

export interface WorkflowAuditEventRow {
  eventId: string;
  batchId: string;
  plannerRunId: string | null;
  candidateId: string | null;
  writeProposalId: string | null;
  eventType: string;
  message: string;
  payload: JsonValue | null;
  createdAt: string;
}
